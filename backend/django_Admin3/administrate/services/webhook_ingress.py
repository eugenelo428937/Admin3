"""Pure-ish helpers the HTTP edge uses to persist + enqueue webhook deliveries.

Kept separate from the view so the persistence + parsing logic is unit-testable
without a request/response cycle, and so the same persist function can be
called from operational replay paths in the future.

Payload shape captured from a real UAT delivery 2026-05-15. Administrate's
outbound webhook envelope is snake_case and intentionally minimal:

    metadata: {
        user, instance, triggered_at, sent_at, context, webhook_id, is_retry
    }
    payload: { node: { id, ...fields from the registered GraphQL query } }

Critically, the metadata does NOT echo a webhook-type label. To route the
delivery to the right handler, we look up `webhook_id` in our local
`WebhookRegistration` table — populated by `administrate_webhooks register`
when each outbound hook was created.
"""

from typing import Any

from django.utils.dateparse import parse_datetime

from administrate.models import WebhookInbox, WebhookRegistration


REQUIRED_METADATA_KEYS = (
    'webhook_id',
    'triggered_at',
)


class InvalidPayload(Exception):
    """Raised when the incoming webhook body cannot be parsed into an inbox row."""


def persist_inbox_row(
    body: dict, headers: dict, *, entity_type: str = 'event',
) -> WebhookInbox:
    """Persist the raw delivery to `adm.webhook_inbox`.

    Args:
        body: parsed JSON body of the inbound webhook request.
        headers: request headers dict for audit storage (filtered).
        entity_type: which entity domain this delivery is for. Passed
            from the URL path segment (`event` / `session` / `learner`)
            so the inbox row records the URL-level routing decision
            alongside the body. Default `'event'` preserves the
            previous hardcoded behavior for any caller (tests, replay
            tooling) that hasn't been updated.

    Raises:
        InvalidPayload: if metadata is malformed, `payload.node.id` is
            missing, or the `webhook_id` is unknown to our local
            registration table.
        django.db.IntegrityError: if a row with the same
            (webhook_id, entity_external_id, triggered_at) already exists —
            the caller (the view) translates this into HTTP 200 duplicate.
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

    timestamp = parse_datetime(metadata['triggered_at'])
    if timestamp is None:
        raise InvalidPayload(
            'metadata.triggered_at is not a valid ISO-8601 datetime'
        )

    # entity_external_id lives in payload.node.id — Administrate's metadata
    # has no equivalent. A missing node is fatal because it's also the
    # source of every field the downstream handler will need.
    node = ((body.get('payload') or {}).get('node')) or {}
    entity_id = node.get('id')
    if not entity_id:
        raise InvalidPayload('payload.node.id is missing')

    # Route via local mapping — Administrate's payload doesn't carry a type
    # label, so an unknown id means we have no handler. Fail loud rather
    # than persisting an inbox row that would dead-letter anyway.
    webhook_id = metadata['webhook_id']
    try:
        registration = WebhookRegistration.objects.get(
            administrate_webhook_id=webhook_id,
        )
    except WebhookRegistration.DoesNotExist:
        raise InvalidPayload(
            f'unknown webhook_id {webhook_id!r}: not in local registration '
            'table. Run `administrate_webhooks register` to backfill, or '
            'check Administrate for webhooks created outside this code path.'
        )

    return WebhookInbox.objects.create(
        administrate_webhook_id=webhook_id,
        administrate_event_timestamp=timestamp,
        webhook_type_name=registration.webhook_type_name,
        entity_type=entity_type,
        entity_external_id=str(entity_id),
        raw_payload=_sanitize_body(body),
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


def _sanitize_body(body: dict) -> dict:
    """Strip the shared webhook secret from `configuration` before persisting.

    Mirrors `_sanitize_headers` for the body. The secret is the auth credential
    Administrate uses to identify itself; storing it verbatim in the audit log
    means any admin-panel viewer can leak it. The rest of `configuration` may
    legitimately carry caller metadata, so we mutate only the `secret` key.
    """
    config = body.get('configuration')
    if not isinstance(config, dict) or 'secret' not in config:
        return body
    return {**body, 'configuration': {**config, 'secret': '***'}}


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
