"""Operational inspection + replay tool for the webhook inbox.

Engineers responding to an `inbox_lag_seconds` alert use this to:
  - list rows by status
  - show a single row's full payload + error
  - replay one row (or many) by flipping status back to 'received' and re-enqueueing

Replay accepts rows in 'dead', 'failed', and 'processing' status:
  - dead/failed: standard recovery after operator fixes the underlying cause
    (e.g. ran sync_course_templates to seed a missing FK).
  - processing: recovery from a worker crash that left the row mid-flight.
    The row's status='processing' would otherwise short-circuit the dispatch
    service forever.

Applied rows are NOT replayable: re-running the handler would clobber the
Event row with stale data and the dedup constraint also prevents re-ingestion.
"""

import json
from datetime import datetime

from django.core.management.base import BaseCommand, CommandError
from django.utils.dateparse import parse_datetime

from administrate.models import WebhookInbox
from administrate.services.webhook_ingress import dispatch_inbox_task


REPLAYABLE_STATUSES = {
    WebhookInbox.STATUS_DEAD,
    WebhookInbox.STATUS_FAILED,
    WebhookInbox.STATUS_PROCESSING,  # crashed-worker recovery
    WebhookInbox.STATUS_RECEIVED,    # idempotent: re-enqueue if needed
}


class Command(BaseCommand):
    help = 'Inspect and replay Administrate webhook inbox rows.'

    def add_arguments(self, parser):
        sub = parser.add_subparsers(dest='action', required=True)

        lst = sub.add_parser('list')
        lst.add_argument('--status', default='dead')
        lst.add_argument('--limit', type=int, default=50)

        show = sub.add_parser('show')
        show.add_argument('inbox_id', type=int)

        rp = sub.add_parser('replay')
        rp.add_argument('inbox_id', nargs='?', type=int)
        rp.add_argument('--status', default=None)
        rp.add_argument('--since', default=None)
        rp.add_argument('--dry-run', action='store_true', default=False,
                        help='Show what would be replayed without enqueuing tasks.')

    def handle(self, *args, action, **opts):
        if action == 'list':
            self._list(opts['status'], opts['limit'])
        elif action == 'show':
            self._show(opts['inbox_id'])
        elif action == 'replay':
            self._replay(
                opts.get('inbox_id'),
                opts.get('status'),
                opts.get('since'),
                dry_run=opts.get('dry_run', False),
            )
        else:
            raise CommandError(f'Unknown action: {action}')

    def _list(self, status, limit):
        qs = WebhookInbox.objects.filter(status=status).order_by('-received_at')[:limit]
        for row in qs:
            self.stdout.write(
                f"{row.id}\t{row.received_at:%Y-%m-%d %H:%M:%S}\t"
                f"{row.webhook_type_name}\t{row.entity_external_id}\t"
                f"attempts={row.attempts}\t{(row.error_message or '')[:60]}"
            )

    def _show(self, inbox_id):
        try:
            row = WebhookInbox.objects.get(id=inbox_id)
        except WebhookInbox.DoesNotExist:
            raise CommandError(f'No inbox row #{inbox_id}')
        self.stdout.write(f'id:                  {row.id}')
        self.stdout.write(f'status:              {row.status}')
        self.stdout.write(f'webhook_type_name:   {row.webhook_type_name}')
        self.stdout.write(f'entity_external_id:  {row.entity_external_id}')
        self.stdout.write(f'attempts:            {row.attempts}')
        self.stdout.write(f'received_at:         {row.received_at}')
        self.stdout.write(f'last_attempted_at:   {row.last_attempted_at}')
        self.stdout.write(f'applied_at:          {row.applied_at}')
        self.stdout.write(f'error_message:       {row.error_message}')
        self.stdout.write('raw_payload:')
        self.stdout.write(json.dumps(row.raw_payload, indent=2, sort_keys=True))

    def _replay(self, inbox_id, status_filter, since, dry_run=False):
        if inbox_id is not None:
            self._replay_one(inbox_id)
            return
        if not status_filter:
            raise CommandError('replay requires <inbox_id> or --status')
        if status_filter not in REPLAYABLE_STATUSES:
            raise CommandError(
                f'Cannot replay rows in status {status_filter!r}; '
                f'replayable statuses: {sorted(REPLAYABLE_STATUSES)}'
            )
        qs = WebhookInbox.objects.filter(status=status_filter)
        if since:
            try:
                since_dt = parse_datetime(since)
                if since_dt is None:
                    since_dt = datetime.fromisoformat(since)
            except ValueError:
                raise CommandError(
                    f'--since value {since!r} is not a valid ISO-8601 datetime '
                    '(example: 2026-05-14T00:00:00Z)'
                )
            qs = qs.filter(received_at__gte=since_dt)
        if dry_run:
            count = qs.count()
            self.stdout.write(
                f'[dry-run] would replay {count} row(s) with status={status_filter!r}'
            )
            return
        count = 0
        for row in qs:
            self._replay_one(row.id, _row=row)
            count += 1
        self.stdout.write(f'replayed {count} row(s)')

    def _replay_one(self, inbox_id, _row=None):
        row = _row or WebhookInbox.objects.get(id=inbox_id)
        if row.status not in REPLAYABLE_STATUSES:
            raise CommandError(
                f'Inbox row #{row.id} has status {row.status!r} which is not replayable; '
                f'replayable statuses: {sorted(REPLAYABLE_STATUSES)}'
            )
        row.status = WebhookInbox.STATUS_RECEIVED
        row.attempts = 0
        row.error_message = ''
        row.last_attempted_at = None
        row.save(update_fields=[
            'status', 'attempts', 'error_message', 'last_attempted_at',
        ])
        dispatch_inbox_task(row.id)
        self.stdout.write(f'replayed: {row.id}')
