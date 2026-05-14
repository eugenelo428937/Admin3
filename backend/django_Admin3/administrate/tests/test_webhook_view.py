import pytest
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def valid_payload():
    return {
        'metadata': {
            'webhookId': 'wh_test_1',
            'webhookTypeName': 'Event Updated',
            'eventTimestamp': '2026-05-14T12:00:00Z',
            'entityId': 'evt_1',
        },
        'payload': {'event': {'id': 'evt_1'}},
        'configuration': {'secret': 'test-shared-secret'},
    }


@pytest.mark.django_db
class TestWebhookAuth:
    def _url(self, token='test-route-token'):
        return reverse(
            'administrate-event-webhook',
            kwargs={'route_token': token},
        )

    def test_bad_route_token_returns_404(self, client, valid_payload):
        resp = client.post(
            self._url(token='wrong-token'),
            valid_payload,
            format='json',
        )
        assert resp.status_code == 404

    def test_bad_secret_returns_401(self, client, valid_payload):
        valid_payload['configuration']['secret'] = 'wrong-secret'
        resp = client.post(self._url(), valid_payload, format='json')
        assert resp.status_code == 401

    def test_missing_configuration_returns_401(self, client, valid_payload):
        del valid_payload['configuration']
        resp = client.post(self._url(), valid_payload, format='json')
        assert resp.status_code == 401
