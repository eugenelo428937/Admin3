"""Pure-ish helpers the HTTP edge uses to persist + enqueue webhook deliveries.

Kept separate from the view so the persistence + parsing logic is unit-testable
without a request/response cycle, and so the same persist function can be
called from operational replay paths in the future.
"""

from typing import Any

from django.utils.dateparse import parse_datetime

from administrate.models import WebhookInbox


REQUIRED_METADATA_KEYS = (
    'webhookId',
    'webhookTypeName',
    'eventTimestamp',
    'entityId',
)


class InvalidPayload(Exception):
    """Raised when the incoming webhook body cannot be parsed into an inbox row."""


def persist_inbox_row(body: dict, headers: dict) -> WebhookInbox:
    """Persist the raw delivery to `adm.webhook_inbox`.

    Raises:
        InvalidPayload: if `metadata` is missing or required keys absent.
        django.db.IntegrityError: if a row with the same
            (webhookId, entityId, eventTimestamp) already exists — the
            caller (the view) translates this into HTTP 200 duplicate.
    """
    metadata = body.get('metadata')
    if not isinstance(metadata, dict):
        raise InvalidPayload('metadata missing or not an object')

    missing = [
        k for k in REQUIRED_METADATA_KEYS
        if k not in metadata or metadata[k] is None
    ]
    if missing:
        raise InvalidPayload(f'metadata missing keys: {", ".join(missing)}')

    timestamp = parse_datetime(metadata['eventTimestamp'])
    if timestamp is None:
        raise InvalidPayload('metadata.eventTimestamp is not a valid ISO-8601 datetime')

    return WebhookInbox.objects.create(
        administrate_webhook_id=metadata['webhookId'],
        administrate_event_timestamp=timestamp,
        webhook_type_name=metadata['webhookTypeName'],
        entity_type='event',  # this slice is Event-only; future slices set per route
        entity_external_id=str(metadata['entityId']),
        raw_payload=body,
        raw_headers=_sanitize_headers(headers),
    )


def dispatch_inbox_task(inbox_id: int) -> Any:
    """Enqueue the worker task for an inbox row. Returned object is the task
    handle; tests with the immediate backend get a completed handle synchronously.
    """
    # Lazy import to avoid a circular import once Task 7 lands
    # (tasks.py will import webhook_dispatch, which imports models, which
    # webhook_ingress already imports).
    from administrate.tasks import process_webhook_inbox

    return process_webhook_inbox.enqueue(inbox_id)


def _sanitize_headers(headers: dict) -> dict:
    """Drop hop-by-hop headers and anything that could leak credentials.

    We persist headers for debugging; we don't want Authorization or Cookie
    sitting in the audit log.
    """
    DENYLIST = {
        'authorization', 'cookie', 'set-cookie', 'proxy-authorization',
        'x-api-key', 'x-forwarded-for', 'x-real-ip',
    }
    return {
        k: v for k, v in headers.items()
        if k.lower() not in DENYLIST
    }
