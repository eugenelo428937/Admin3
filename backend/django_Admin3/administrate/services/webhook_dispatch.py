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


logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 5

TERMINAL_STATES = {
    WebhookInbox.STATUS_APPLIED,
    WebhookInbox.STATUS_DUPLICATE,
    WebhookInbox.STATUS_DEAD,
    WebhookInbox.STATUS_PROCESSING,  # another worker holds it
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
        with transaction.atomic():
            handler(node)
        _mark_applied(row)

    except Exception as exc:  # noqa: BLE001 — we re-raise transient, swallow terminal
        if row.attempts >= MAX_ATTEMPTS:
            _mark_dead(row, _format_error(exc))
            return  # swallow — task is "done", no more retries
        _mark_failed(row, _format_error(exc))
        raise  # re-raise so django.tasks reschedules


def _extract_node(raw_payload: dict) -> dict:
    """Pluck the `event` node out of the wrapped Administrate payload.

    Administrate wraps the GraphQL result under `payload` (the result of the
    query the webhook was registered with). Our query is `event(id: $objectid)`
    so the node is at `payload.event`.
    """
    payload = raw_payload.get('payload') or {}
    return payload.get('event') or {}


def _mark_applied(row: WebhookInbox) -> None:
    row.status = WebhookInbox.STATUS_APPLIED
    row.applied_at = timezone.now()
    row.error_message = ''
    row.save(update_fields=['status', 'applied_at', 'error_message'])


def _mark_failed(row: WebhookInbox, message: str) -> None:
    row.status = WebhookInbox.STATUS_FAILED
    row.error_message = message
    row.save(update_fields=['status', 'error_message'])


def _mark_dead(row: WebhookInbox, message: str) -> None:
    row.status = WebhookInbox.STATUS_DEAD
    row.error_message = message
    row.save(update_fields=['status', 'error_message'])


def _format_error(exc: Exception) -> str:
    if isinstance(exc, MissingDependencyError):
        return f'{type(exc).__name__}: {exc}'
    return f'{type(exc).__name__}: {exc}'
