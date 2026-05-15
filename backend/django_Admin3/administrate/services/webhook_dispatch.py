"""Per-row apply logic, run from inside `process_webhook_inbox` task.

Responsibilities:
  - Row-locking via SELECT FOR UPDATE so two workers can't apply the same row.
  - Idempotency: rows already in a terminal state short-circuit.
  - Handler dispatch by `webhook_type_name`.
  - Failure classification:
      * Unknown handler        -> dead (no retry possible)
      * Handler raised, attempts < MAX -> failed, re-raise (task retries)
      * Handler raised, attempts >= MAX -> dead, swallow (no further retry)
"""

import logging

from django.db import transaction
from django.utils import timezone

from administrate.exceptions import MissingDependencyError
from administrate.models import WebhookInbox
from administrate.services.webhook_handlers import EVENT_HANDLERS
from administrate.services.webhook_metrics import incr_applied, incr_failed


logger = logging.getLogger('administrate.webhook')

MAX_ATTEMPTS = 5

# Note: PROCESSING is intentionally included as terminal-from-the-dispatcher's-
# perspective. The select_for_update lock above only protects the brief status-
# update transaction; once that commits, the handler runs unlocked. Without
# PROCESSING in this set, a second worker after the first worker's status
# commit would re-run the same handler. Trade-off: a worker that crashes
# mid-handler leaves the row stuck in PROCESSING. Recovery is via the
# `administrate_webhooks_inbox replay` management command (Task 10), which
# explicitly accepts PROCESSING rows whose last_attempted_at is older than
# a configurable threshold.
TERMINAL_STATES = {
    WebhookInbox.STATUS_APPLIED,
    WebhookInbox.STATUS_DUPLICATE,
    WebhookInbox.STATUS_DEAD,
    WebhookInbox.STATUS_PROCESSING,  # see above
}


def apply_inbox_row(inbox_id: int) -> None:
    """Process a single webhook inbox row.

    Re-raises the handler exception on transient failure so the Django Tasks
    backoff machinery reschedules. Swallows on dead-letter exhaustion so the
    task is marked successful and is not re-queued.
    """
    with transaction.atomic():
        try:
            row = (
                WebhookInbox.objects
                .select_for_update()
                .get(id=inbox_id)
            )
        except WebhookInbox.DoesNotExist:
            logger.warning('administrate.webhook.inbox.missing', extra={'inbox_id': inbox_id})
            return

        if row.status in TERMINAL_STATES:
            logger.info(
                'administrate.webhook.inbox.short_circuit',
                extra={'inbox_id': inbox_id, 'status': row.status},
            )
            return

        row.status = WebhookInbox.STATUS_PROCESSING
        row.attempts = (row.attempts or 0) + 1
        row.last_attempted_at = timezone.now()
        row.save(update_fields=['status', 'attempts', 'last_attempted_at'])

    # The transaction above is closed so the handler's own transaction can
    # roll back cleanly without poisoning the row's status update.
    try:
        handler = EVENT_HANDLERS.get(row.webhook_type_name)
        if handler is None:
            _mark_dead(row, f'No handler for webhook_type_name={row.webhook_type_name!r}')
            return

        node = _extract_node(row.raw_payload)
        logger.info('administrate.webhook.task.start', extra={'inbox_id': inbox_id})
        with transaction.atomic():
            handler(node)
        _mark_applied(row)

    except Exception as exc:  # noqa: BLE001 — we re-raise transient, swallow terminal
        # MissingDependencyError is the explicit "fail loud, dead-letter,
        # manual replay" signal: no retry could possibly fix a missing FK
        # without operator action (run sync_*, then replay). Going via FAILED
        # would mask the row in transient-error noise and let lag accumulate
        # indefinitely (since attempts only escalates if a retrying backend
        # re-invokes the task; ImmediateBackend does not).
        if isinstance(exc, MissingDependencyError):
            _mark_dead(row, _format_error(exc))
            return  # swallow — terminal, surfaces on operator dashboards
        if row.attempts >= MAX_ATTEMPTS:
            _mark_dead(row, _format_error(exc))
            return  # swallow — task is "done", no more retries
        _mark_failed(row, _format_error(exc))
        raise  # re-raise so django.tasks reschedules


def _extract_node(raw_payload: dict) -> dict:
    """Pluck the `event` node out of the wrapped Administrate payload.

    Administrate wraps the GraphQL result under `payload` (the result of the
    query the webhook was registered with). Our query is
    `node(id: $objectid) { ... on Event { ... } }` so the node is at
    `payload.node` (the inline-fragment fields are flattened onto the node
    object by Administrate's response).
    """
    payload = raw_payload.get('payload') or {}
    # Administrate may emit either `node` (Relay singular fetch) or `event`
    # (legacy/test fixtures). Accept both so existing fixtures and unit
    # tests don't need a coordinated rewrite.
    return payload.get('node') or payload.get('event') or {}


def _mark_applied(row: WebhookInbox) -> None:
    row.status = WebhookInbox.STATUS_APPLIED
    row.applied_at = timezone.now()
    row.error_message = ''
    row.save(update_fields=['status', 'applied_at', 'error_message'])
    incr_applied(row.webhook_type_name)
    logger.info(
        'administrate.webhook.task.applied',
        extra={'inbox_id': row.id, 'attempts': row.attempts},
    )


def _mark_failed(row: WebhookInbox, message: str) -> None:
    row.status = WebhookInbox.STATUS_FAILED
    row.error_message = message
    row.save(update_fields=['status', 'error_message'])
    incr_failed(row.webhook_type_name, row.attempts)
    logger.error(
        'administrate.webhook.task.failed',
        extra={
            'inbox_id': row.id,
            'attempt': row.attempts,
            'error': message,
            'terminal': False,
        },
    )


def _mark_dead(row: WebhookInbox, message: str) -> None:
    row.status = WebhookInbox.STATUS_DEAD
    row.error_message = message
    row.save(update_fields=['status', 'error_message'])
    incr_failed(row.webhook_type_name, row.attempts)
    logger.error(
        'administrate.webhook.task.failed',
        extra={
            'inbox_id': row.id,
            'attempt': row.attempts,
            'error': message,
            'terminal': True,
        },
    )


def _format_error(exc: Exception) -> str:
    if isinstance(exc, MissingDependencyError):
        return (
            f'MissingDependencyError: {exc.model_name} '
            f'external_id={exc.external_id!r}'
        )
    return f'{type(exc).__name__}: {exc}'
