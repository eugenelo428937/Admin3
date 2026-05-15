import logging

import pytest
from rest_framework.test import APIClient


@pytest.fixture(autouse=True)
def _webhook_settings(settings):
    settings.ADMINISTRATE_WEBHOOK_ROUTE_TOKEN = 'test-route-token'
    settings.ADMINISTRATE_WEBHOOK_SECRET = 'test-shared-secret'


@pytest.fixture
def _registration(db):
    """Local mapping for the webhook_id used in `valid_payload` below.
    Required because `persist_inbox_row` now resolves type via this table
    (Administrate's payload doesn't echo a type label)."""
    from administrate.models import WebhookRegistration
    return WebhookRegistration.objects.create(
        administrate_webhook_id='wh_log_1',
        name='Admin3 Event Updated (test)',
        webhook_type_name='Event Updated',
    )


@pytest.fixture
def valid_payload(_registration):
    return {
        'metadata': {
            'webhook_id': 'wh_log_1',
            'triggered_at': '2026-05-14T12:00:00Z',
        },
        'payload': {'node': {'id': 'evt_log_1'}},
        'configuration': {'secret': 'test-shared-secret'},
    }


@pytest.mark.django_db
def test_received_log_emitted_on_post(caplog, valid_payload):
    caplog.set_level(logging.INFO, logger='administrate.webhook')
    APIClient().post(
        '/api/administrate/webhooks/test-route-token/event/',
        valid_payload, format='json',
    )
    received = [r for r in caplog.records if r.message == 'administrate.webhook.received']
    assert len(received) == 1
    r = received[0]
    assert r.inbox_id is not None
    assert r.duplicate is False


@pytest.mark.django_db
def test_duplicate_post_logs_with_duplicate_flag(caplog, valid_payload):
    caplog.set_level(logging.INFO, logger='administrate.webhook')
    client = APIClient()
    client.post(
        '/api/administrate/webhooks/test-route-token/event/',
        valid_payload, format='json',
    )
    caplog.clear()  # Drop the first delivery's logs

    client.post(
        '/api/administrate/webhooks/test-route-token/event/',
        valid_payload, format='json',
    )

    received = [r for r in caplog.records if r.message == 'administrate.webhook.received']
    assert len(received) == 1
    r = received[0]
    assert r.duplicate is True
    assert r.inbox_id is None


@pytest.mark.django_db
def test_task_start_log_emitted(caplog, valid_payload):
    caplog.set_level(logging.INFO, logger='administrate.webhook')
    APIClient().post(
        '/api/administrate/webhooks/test-route-token/event/',
        valid_payload, format='json',
    )
    starts = [r for r in caplog.records if r.message == 'administrate.webhook.task.start']
    assert len(starts) == 1
