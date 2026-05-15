import pytest
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def _registration(db):
    """Local mapping for the webhook_id used in `valid_payload` below.
    Administrate's webhook payload doesn't echo a type label, so the
    ingress looks up the type by this id."""
    from administrate.models import WebhookRegistration
    return WebhookRegistration.objects.create(
        administrate_webhook_id='wh_test_1',
        name='Admin3 Event Updated (test)',
        webhook_type_name='Event Updated',
    )


@pytest.fixture
def valid_payload(_registration):
    return {
        'metadata': {
            'webhook_id': 'wh_test_1',
            'triggered_at': '2026-05-14T12:00:00Z',
        },
        'payload': {'node': {'id': 'evt_1'}},
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
                'webhook_id': 'wh_x',
                'triggered_at': '2026-05-14T12:00:00Z',
            },
            'payload': {'node': {'id': 'evt_x'}},
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
        assert row.raw_payload['metadata']['webhook_id'] == valid_payload['metadata']['webhook_id']

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
        del valid_payload['metadata']['webhook_id']
        resp = client.post(self.URL, valid_payload, format='json')
        assert resp.status_code == 400

    def test_invalid_timestamp_returns_400(self, client, valid_payload):
        valid_payload['metadata']['triggered_at'] = 'not-a-real-date'
        resp = client.post(self.URL, valid_payload, format='json')
        assert resp.status_code == 400
        assert WebhookInbox.objects.count() == 0

    def test_non_dict_metadata_returns_400(self, client, valid_payload):
        valid_payload['metadata'] = 'string-not-object'
        resp = client.post(self.URL, valid_payload, format='json')
        assert resp.status_code == 400
        assert WebhookInbox.objects.count() == 0

    def test_falsy_but_valid_entity_id_accepted(self, client, valid_payload):
        """payload.node.id='0' should NOT trigger the missing-id validation —
        '0' is falsy in Python but is a perfectly valid Administrate id."""
        valid_payload['payload']['node']['id'] = '0'
        resp = client.post(self.URL, valid_payload, format='json')
        assert resp.status_code == 202
        assert WebhookInbox.objects.get().entity_external_id == '0'
