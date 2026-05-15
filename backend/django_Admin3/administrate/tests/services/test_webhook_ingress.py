"""Tests for `persist_inbox_row` against Administrate's real webhook payload.

Administrate's outbound webhook payload (verified against a UAT delivery on
2026-05-15) uses snake_case metadata keys and does NOT echo the webhook type:

    metadata: {
        user, instance, triggered_at, sent_at, context, webhook_id, is_retry
    }
    payload: { node: { id, title, lifecycleState, ... } }

So:
  - `webhookId`     → `webhook_id`     (in metadata)
  - `eventTimestamp` → `triggered_at`   (in metadata)
  - `entityId`      → `payload.node.id` (NOT in metadata)
  - `webhookTypeName`: not present anywhere — we look it up in the local
    `WebhookRegistration` table by `webhook_id`. The register command
    populates that table on each create/update, so the lookup is local-only.

The tests below pin the new shape so we can't accidentally regress to the
fictional shape the original test fixtures used.
"""
import pytest

from administrate.models import WebhookInbox
from administrate.services.webhook_ingress import (
    InvalidPayload,
    persist_inbox_row,
)


def _real_administrate_body(
    webhook_id='T3V0Ym91bmRIb29rOjE=',
    entity_id='Q291cnNlOjk1MTM=',
    triggered_at='2026-05-15T15:14:23.000000Z',
):
    """Body shape captured from a real UAT delivery 2026-05-15."""
    return {
        'metadata': {
            'user': {'email': None},
            'instance': 'https://bppacteduat.administrateapp.com',
            'triggered_at': triggered_at,
            'sent_at': '2026-05-15T15:14:24.181610Z',
            'context': 'graphql',
            'webhook_id': webhook_id,
            'is_retry': False,
        },
        'payload': {
            'node': {
                'id': entity_id,
                'title': 'CM1-65-26A',
                'lifecycleState': 'published',
            },
        },
    }


@pytest.fixture
def registration(db):
    """A locally-stored mapping for the OutboundHook the test body uses.

    Mirrors what `administrate_webhooks register` would persist after a
    successful create/update mutation."""
    from administrate.models import WebhookRegistration
    return WebhookRegistration.objects.create(
        administrate_webhook_id='T3V0Ym91bmRIb29rOjE=',
        name='Admin3 Event Updated',
        webhook_type_name='Event Updated',
        lifecycle_state='enabled',
    )


@pytest.mark.django_db
class TestPersistInboxRowRealPayload:
    def test_accepts_real_administrate_payload(self, registration):
        """Snake-case keys + payload.node.id should be accepted, and the row
        should reflect a successful lookup of the webhook type."""
        body = _real_administrate_body()
        row = persist_inbox_row(body, headers={})

        assert row.administrate_webhook_id == 'T3V0Ym91bmRIb29rOjE='
        # entity_external_id comes from payload.node.id, NOT metadata —
        # the latter doesn't have it.
        assert row.entity_external_id == 'Q291cnNlOjk1MTM='
        # webhook_type_name comes from the local registration table, NOT
        # the payload — Administrate doesn't echo it.
        assert row.webhook_type_name == 'Event Updated'
        assert row.entity_type == 'event'

    def test_unknown_webhook_id_dead_letters_with_loud_error(self, db):
        """If the webhook_id isn't in our registration table, that's a
        configuration drift (someone created a webhook in Administrate UI
        bypassing our register command). Refuse to ingest — we can't route
        what we can't identify, and silently persisting with an empty type
        would route to a 'no handler' dead letter anyway."""
        body = _real_administrate_body(webhook_id='T3V0Ym91bmRIb29rOjk5OQ==')
        with pytest.raises(InvalidPayload) as exc:
            persist_inbox_row(body, headers={})
        # The message must name the unknown id so an operator can fix
        # the registration without grepping logs.
        assert 'T3V0Ym91bmRIb29rOjk5OQ==' in str(exc.value)

    def test_missing_payload_node_returns_400_like_error(self, registration):
        """payload.node.id is the *only* source of entity_external_id in
        Administrate's real shape. Missing means we have nothing to dedupe
        against, so reject loudly."""
        body = _real_administrate_body()
        del body['payload']['node']
        with pytest.raises(InvalidPayload):
            persist_inbox_row(body, headers={})

    def test_dedupe_constraint_still_enforced(self, registration):
        """The composite uniqueness constraint
        (administrate_webhook_id, entity_external_id, administrate_event_timestamp)
        must still fire on the new payload shape — that's the whole reason
        the inbox exists. A retry from Administrate (`is_retry=true` re-delivery)
        must be persisted exactly once."""
        from django.db import IntegrityError

        body = _real_administrate_body()
        persist_inbox_row(body, headers={})
        with pytest.raises(IntegrityError):
            persist_inbox_row(body, headers={})

    def test_invalid_triggered_at_returns_loud_error(self, registration):
        """Garbage in `triggered_at` must not silently become null — we use
        that timestamp as part of the dedupe key, so a corrupt value would
        let the same delivery through twice."""
        body = _real_administrate_body(triggered_at='not-a-real-date')
        with pytest.raises(InvalidPayload):
            persist_inbox_row(body, headers={})

    def test_cancelled_lifecycle_routes_to_cancelled_type(self, db):
        """A registration tagged 'Event Cancelled' should produce an inbox
        row with that type, regardless of payload content — the handler
        for Cancelled has different semantics from Updated (forces
        cancelledAt backfill)."""
        from administrate.models import WebhookRegistration
        WebhookRegistration.objects.create(
            administrate_webhook_id='T3V0Ym91bmRIb29rOjM=',
            name='Admin3 Event Cancelled',
            webhook_type_name='Event Cancelled',
        )
        body = _real_administrate_body(webhook_id='T3V0Ym91bmRIb29rOjM=')
        row = persist_inbox_row(body, headers={})
        assert row.webhook_type_name == 'Event Cancelled'


@pytest.mark.django_db
class TestWebhookRegistrationModel:
    """Sanity tests for the new mapping table itself — it's small, but the
    uniqueness on administrate_webhook_id is load-bearing (a duplicate id
    would make routing non-deterministic)."""

    def test_webhook_id_is_unique(self, db):
        from django.db import IntegrityError
        from administrate.models import WebhookRegistration
        WebhookRegistration.objects.create(
            administrate_webhook_id='T3V0Ym91bmRIb29rOjE=',
            name='Admin3 Event Updated',
            webhook_type_name='Event Updated',
        )
        with pytest.raises(IntegrityError):
            WebhookRegistration.objects.create(
                administrate_webhook_id='T3V0Ym91bmRIb29rOjE=',
                name='Duplicate',
                webhook_type_name='Event Created',
            )
