"""Phase 6 of the session+learner webhook expansion (2026-05-18).

Verifies that the polymorphic webhook ingress routes each entity to its
own URL path and records the entity_type on the inbox row from the URL
segment rather than the previously-hardcoded `'event'`.

Routes asserted:
  /api/administrate/webhooks/<token>/event/    -> entity_type='event'
  /api/administrate/webhooks/<token>/session/  -> entity_type='session'
  /api/administrate/webhooks/<token>/learner/  -> entity_type='learner'

The Event-route regression is covered by the existing
`test_webhook_view.py`; these tests only exercise the two new routes
and verify the URL → entity_type plumbing.
"""
from datetime import timezone as dt_timezone, datetime

import json
import pytest
from django.test import Client
from django.urls import reverse

from administrate.models import (
    Event as AdmEvent, WebhookInbox, WebhookRegistration,
)


WEBHOOK_BODY_TEMPLATE = {
    'metadata': {
        'webhook_id': 'wh-routed',
        'triggered_at': '2026-05-18T12:00:00Z',
    },
    'payload': {'node': {'id': 'node-1'}},
    'configuration': {'secret': 'test-shared-secret'},
}


@pytest.fixture
def webhook_registration(db):
    return WebhookRegistration.objects.create(
        administrate_webhook_id='wh-routed',
        webhook_type_name='Session Created',
        name='Admin3 Session Created',
        lifecycle_state='active',
    )


@pytest.fixture
def client():
    return Client()


@pytest.mark.django_db
class TestPerEntityRoutes:

    def test_session_route_records_session_entity_type(
        self, client, webhook_registration,
    ):
        body = {**WEBHOOK_BODY_TEMPLATE,
                'payload': {'node': {'id': 'session-node-x'}}}
        body['metadata'] = {**body['metadata'], 'triggered_at': '2026-05-18T12:01:00Z'}
        resp = client.post(
            '/api/administrate/webhooks/test-route-token/session/',
            data=json.dumps(body),
            content_type='application/json',
        )
        assert resp.status_code in (200, 202), resp.content
        row = WebhookInbox.objects.get(entity_external_id='session-node-x')
        assert row.entity_type == 'session'

    def test_learner_route_records_learner_entity_type(
        self, client, webhook_registration,
    ):
        # Re-purpose the same registration row; the test only cares about
        # the URL → entity_type plumbing, not handler dispatch.
        body = {**WEBHOOK_BODY_TEMPLATE,
                'payload': {'node': {'id': 'learner-node-x'}}}
        body['metadata'] = {**body['metadata'], 'triggered_at': '2026-05-18T12:02:00Z'}
        resp = client.post(
            '/api/administrate/webhooks/test-route-token/learner/',
            data=json.dumps(body),
            content_type='application/json',
        )
        assert resp.status_code in (200, 202), resp.content
        row = WebhookInbox.objects.get(entity_external_id='learner-node-x')
        assert row.entity_type == 'learner'

    def test_event_route_still_records_event_entity_type(
        self, client, webhook_registration,
    ):
        # Regression: existing /event/ route keeps working.
        body = {**WEBHOOK_BODY_TEMPLATE,
                'payload': {'node': {'id': 'event-node-x'}}}
        body['metadata'] = {**body['metadata'], 'triggered_at': '2026-05-18T12:03:00Z'}
        resp = client.post(
            '/api/administrate/webhooks/test-route-token/event/',
            data=json.dumps(body),
            content_type='application/json',
        )
        assert resp.status_code in (200, 202), resp.content
        row = WebhookInbox.objects.get(entity_external_id='event-node-x')
        assert row.entity_type == 'event'
