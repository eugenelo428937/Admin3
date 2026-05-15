"""Sync Administrate events into adm.events.

Companion to the webhook intake: where webhooks reflect *deltas*, this
command takes a full snapshot of Administrate events for a given
sitting + lifecycle state. Use it for:

  - Initial seeding (before webhooks are registered).
  - Filling primary_instructor on Event Created webhook dead-letters.
    The webhook query can't ask for `staff` (privacy/permissioning),
    so brand-new events fail their NOT NULL FK and dead-letter; this
    command resolves the staff connection's first contact, satisfies
    the FK, and unblocks `administrate_webhooks_inbox replay`.
  - Periodic reconciliation if you suspect lost webhook deliveries.

Tutorial-event linking happens as a per-event post-step using the
exact-title-match rule (see `tutorial_event_linker`).
"""

import logging

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from administrate.exceptions import (
    AdministrateAPIError,
    MissingDependencyError,
)
from administrate.models import Event, Instructor
from administrate.services.api_service import AdministrateAPIService
from administrate.services.tutorial_event_linker import link_event_to_tutorial
from administrate.services.webhook_handlers import map_node_to_event_fields
from administrate.utils.graphql_loader import load_graphql_query
from administrate.utils.sync_helpers import SyncStats


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        'Sync Administrate events into adm.events for a given sitting + '
        'lifecycle state, resolving primary_instructor from staff and '
        'linking tutorial_event by exact title match.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--sitting', required=True,
            help='Substring matched against Administrate event titles '
                 '(e.g. "26S"). Filter is `title wordlike $sitting`.',
        )
        parser.add_argument(
            '--lifecycle', default='PUBLISHED',
            help='lifecycleState filter, default PUBLISHED.',
        )
        parser.add_argument('--page-size', type=int, default=100)
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Fetch and report without writing to the DB.',
        )
        parser.add_argument('--debug', action='store_true')

    def handle(self, *args, **options):
        if options['debug']:
            logger.setLevel(logging.DEBUG)

        api = AdministrateAPIService()
        query = load_graphql_query('get_events_for_sync')
        nodes = self._fetch_all(api, query, options)
        self.stdout.write(f'Fetched {len(nodes)} event(s) from Administrate.')

        if options['dry_run']:
            self.stdout.write(
                self.style.WARNING(
                    f'[dry-run] would upsert {len(nodes)} row(s); no writes made.'
                )
            )
            return

        stats, linked, unlinked = self._sync_nodes(nodes, debug=options['debug'])
        self.stdout.write(
            self.style.SUCCESS(
                f'Sync completed: {stats.summary_line()} '
                f'| {linked} linked, {unlinked} unlinked'
            )
        )

    def _fetch_all(self, api, query, options):
        """Paginate the Administrate events query until hasNextPage=False.

        Returns the flat list of event nodes (not edges)."""
        all_nodes = []
        offset = 0
        page_size = options['page_size']
        while True:
            try:
                result = api.execute_query(query, variables={
                    'sitting': options['sitting'],
                    'state': options['lifecycle'],
                    'first': page_size,
                    'offset': offset,
                })
            except AdministrateAPIError as exc:
                raise CommandError(f'Administrate API error: {exc}') from exc
            data = (result or {}).get('data') or {}
            events = data.get('events') or {}
            edges = events.get('edges') or []
            all_nodes.extend(edge['node'] for edge in edges if 'node' in edge)
            page_info = events.get('pageInfo') or {}
            if not page_info.get('hasNextPage'):
                break
            offset += page_size
        return all_nodes

    def _sync_nodes(self, nodes, debug=False):
        """Apply each node: upsert Event, then link tutorial_event.

        Per-event failures (missing FK, etc.) are isolated by a savepoint
        so one bad node doesn't poison the whole batch.
        """
        stats = SyncStats()
        linked = 0
        unlinked = 0

        for node in nodes:
            try:
                with transaction.atomic():
                    event, created = self._upsert_event(node)
                # Linking happens outside the upsert atomic block — a
                # linker failure (which would be unusual) shouldn't roll
                # back the event row itself.
                if self._link(event):
                    linked += 1
                else:
                    unlinked += 1
                if created:
                    stats.created += 1
                else:
                    stats.updated += 1
            except MissingDependencyError as exc:
                stats.skipped += 1
                self.stdout.write(self.style.WARNING(
                    f"skipped {node.get('id')!r}: "
                    f"missing {exc.model_name} external_id={exc.external_id!r}"
                ))
                if debug:
                    logger.debug('sync skipped node: %r', node, exc_info=True)
            except Exception as exc:  # noqa: BLE001
                stats.errors += 1
                self.stdout.write(self.style.ERROR(
                    f"error on {node.get('id')!r}: {exc}"
                ))
                if debug:
                    logger.exception(exc)

        return stats, linked, unlinked

    def _upsert_event(self, node: dict):
        """Map the Administrate node onto adm.events fields and upsert.

        Differs from the webhook's `_upsert_event` in one place only:
        we enrich the mapped defaults with `primary_instructor`, resolved
        from the staff connection. The webhook query can't fetch staff,
        which is why brand-new events from the webhook path
        dead-letter — this command is the cure.
        """
        defaults = map_node_to_event_fields(node)
        defaults.pop('external_id', None)
        defaults['primary_instructor'] = self._resolve_primary_instructor(node)
        return Event.objects.update_or_create(
            external_id=node['id'], defaults=defaults,
        )

    def _resolve_primary_instructor(self, node: dict) -> Instructor:
        """Pull the first staff member's Contact id and look up our
        Instructor by external_id.

        Administrate's `staff` is a Relay connection — the first edge is
        a deterministic choice but not a semantic 'primary'. If you need
        true 'primary' semantics, query `requiredStaff` and filter by
        role. For now, the first staff member is good enough to satisfy
        the FK so webhook updates can apply downstream.

        Raises MissingDependencyError if either:
          - the event has no staff at all (which would be unusual for
            a PUBLISHED event), or
          - the matched Contact id has no corresponding local Instructor
            (operator runs sync_instructors then re-runs this command).
        """
        edges = (((node.get('staff') or {}).get('edges')) or [])
        if not edges:
            raise MissingDependencyError(
                'Instructor',
                f'<no staff in connection for event {node.get("id")!r}>',
            )
        contact_id = (
            (edges[0].get('node') or {}).get('contact') or {}
        ).get('id')
        if not contact_id:
            raise MissingDependencyError(
                'Instructor',
                f'<staff edge missing contact.id for event {node.get("id")!r}>',
            )
        try:
            return Instructor.objects.get(external_id=contact_id)
        except Instructor.DoesNotExist:
            raise MissingDependencyError('Instructor', contact_id)

    def _link(self, event: Event) -> bool:
        """Set event.tutorial_event via exact-title match. Returns True
        if a match was assigned, False if no match (FK stays null).

        Idempotent: if the FK is already correct, we still save (cheap;
        the alternative comparison is more code than it's worth)."""
        match = link_event_to_tutorial(event)
        if match is None:
            return False
        event.tutorial_event_id = match.pk
        event.save(update_fields=['tutorial_event'])
        return True
