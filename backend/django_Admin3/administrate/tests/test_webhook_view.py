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
    @pytest.fixture(autouse=True)
    def _webhook_settings(self, settings):
        # Pin webhook auth settings regardless of which DJANGO_SETTINGS_MODULE
        # the developer ran pytest with. Individual tests may further override
        # via @override_settings.
        settings.ADMINISTRATE_WEBHOOK_ROUTE_TOKEN = 'test-route-token'
        settings.ADMINISTRATE_WEBHOOK_SECRET = 'test-shared-secret'

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

    @override_settings(
        ADMINISTRATE_WEBHOOK_ROUTE_TOKEN='test-route-token',
        ADMINISTRATE_WEBHOOK_SECRET='',
    )
    def test_empty_configured_secret_still_rejects_empty_body_secret(self, client):
        """If the runtime secret is misconfigured to '' (somehow bypassing the
        startup guard), the view must still reject a body with secret=''.
        """
        body = {
            'metadata': {
                'webhookId': 'wh_x', 'webhookTypeName': 'Event Updated',
                'eventTimestamp': '2026-05-14T12:00:00Z', 'entityId': 'evt_x',
            },
            'payload': {'event': {'id': 'evt_x'}},
            'configuration': {'secret': ''},
        }
        resp = client.post(
            '/api/administrate/webhooks/test-route-token/event/',
            body, format='json',
        )
        assert resp.status_code == 401
