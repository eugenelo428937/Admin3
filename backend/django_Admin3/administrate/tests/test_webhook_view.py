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


from administrate.models import WebhookInbox


@pytest.mark.django_db
class TestWebhookPersistence:
    URL = '/api/administrate/webhooks/test-route-token/event/'

    @pytest.fixture(autouse=True)
    def _webhook_settings(self, settings):
        settings.ADMINISTRATE_WEBHOOK_ROUTE_TOKEN = 'test-route-token'
        settings.ADMINISTRATE_WEBHOOK_SECRET = 'test-shared-secret'

    def test_fresh_delivery_persists_and_returns_202(self, client, valid_payload):
        resp = client.post(self.URL, valid_payload, format='json')

        assert resp.status_code == 202
        assert resp.json()['status'] == 'queued'
        assert 'inbox_id' in resp.json()
        assert WebhookInbox.objects.count() == 1

        row = WebhookInbox.objects.get()
        assert row.administrate_webhook_id == 'wh_test_1'
        assert row.webhook_type_name == 'Event Updated'
        assert row.entity_type == 'event'
        assert row.entity_external_id == 'evt_1'
        # Status is intentionally NOT asserted here: under the test
        # ImmediateBackend the dispatch task runs synchronously inside the
        # POST, so the row will have moved past 'received'. The intent of
        # this test is webhook persistence — task behaviour is covered by
        # tests/services/test_webhook_dispatch.py.
        # The raw_payload mirrors the request body but with the shared
        # webhook secret in `configuration.secret` redacted (see
        # _sanitize_body in services/webhook_ingress.py).
        expected_payload = {
            **valid_payload,
            'configuration': {**valid_payload['configuration'], 'secret': '***'},
        }
        assert row.raw_payload == expected_payload

    def test_persisted_payload_redacts_configuration_secret(self, client, valid_payload):
        resp = client.post(self.URL, valid_payload, format='json')
        assert resp.status_code == 202
        row = WebhookInbox.objects.get(id=resp.json()['inbox_id'])
        assert row.raw_payload['configuration']['secret'] == '***'
        # And the rest of the payload is preserved.
        assert row.raw_payload['metadata']['webhookId'] == valid_payload['metadata']['webhookId']

    def test_duplicate_delivery_returns_200(self, client, valid_payload):
        client.post(self.URL, valid_payload, format='json')
        resp = client.post(self.URL, valid_payload, format='json')

        assert resp.status_code == 200
        assert resp.json()['status'] == 'duplicate'
        assert WebhookInbox.objects.count() == 1

    def test_missing_metadata_returns_400(self, client, valid_payload):
        del valid_payload['metadata']
        resp = client.post(self.URL, valid_payload, format='json')

        assert resp.status_code == 400
        assert 'error' in resp.json()
        assert WebhookInbox.objects.count() == 0

    def test_missing_webhook_id_returns_400(self, client, valid_payload):
        del valid_payload['metadata']['webhookId']
        resp = client.post(self.URL, valid_payload, format='json')
        assert resp.status_code == 400

    def test_invalid_timestamp_returns_400(self, client, valid_payload):
        valid_payload['metadata']['eventTimestamp'] = 'not-a-real-date'
        resp = client.post(self.URL, valid_payload, format='json')
        assert resp.status_code == 400
        assert WebhookInbox.objects.count() == 0

    def test_non_dict_metadata_returns_400(self, client, valid_payload):
        valid_payload['metadata'] = 'string-not-object'
        resp = client.post(self.URL, valid_payload, format='json')
        assert resp.status_code == 400
        assert WebhookInbox.objects.count() == 0

    def test_falsy_but_valid_entity_id_accepted(self, client, valid_payload):
        """entityId='0' should NOT trigger the missing-keys validation."""
        valid_payload['metadata']['entityId'] = '0'
        resp = client.post(self.URL, valid_payload, format='json')
        assert resp.status_code == 202
        assert WebhookInbox.objects.get().entity_external_id == '0'
