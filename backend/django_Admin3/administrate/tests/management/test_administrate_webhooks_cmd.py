from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command


class _FakeAPI:
    """Returns canned GraphQL responses for the management-command path."""

    def __init__(self):
        self.calls = []

    def execute_query(self, query, variables=None):
        self.calls.append((query, variables))
        if 'webhookTypes' in query:
            return {
                'data': {
                    'webhookTypes': {
                        'edges': [
                            {'node': {'id': 'wt_updated', 'name': 'Event Updated'}},
                            {'node': {'id': 'wt_created', 'name': 'Event Created'}},
                            {'node': {'id': 'wt_cancelled', 'name': 'Event Cancelled'}},
                        ]
                    }
                }
            }
        # List/find query — return empty so register goes through create path.
        if 'webhooks(' in query and 'webhook { update' not in query:
            return {'data': {'webhooks': {'edges': []}}}
        if 'webhook { create' in query:
            return {'data': {'webhook': {'create': {'webhook': {'id': 'wh_new'}}}}}
        if 'webhook { delete' in query:
            return {'data': {'webhook': {'delete': {'success': True}}}}
        return {'data': {}}


@pytest.mark.django_db
class TestAdministrateWebhooksCommand:
    @pytest.fixture(autouse=True)
    def _webhook_settings(self, settings):
        settings.ADMINISTRATE_WEBHOOK_ROUTE_TOKEN = 'test-route-token'
        settings.ADMINISTRATE_WEBHOOK_SECRET = 'test-shared-secret'
        settings.ADMINISTRATE_WEBHOOK_BASE_URL = 'http://testserver'
        settings.ADMINISTRATE_WEBHOOK_NOTIFICATION_EMAILS = ['ops@example.test']

    @patch('administrate.management.commands.administrate_webhooks.AdministrateAPIService')
    def test_list_action(self, MockAPI):
        MockAPI.return_value = _FakeAPI()
        out = StringIO()
        call_command('administrate_webhooks', 'list', stdout=out)
        output = out.getvalue()
        # _FakeAPI returns no registered webhooks for the list query, so the count
        # summary should print "0 webhook(s) registered."
        assert '0 webhook(s) registered' in output

    @patch('administrate.management.commands.administrate_webhooks.AdministrateAPIService')
    def test_register_dry_run_does_not_call_create(self, MockAPI):
        fake = _FakeAPI()
        MockAPI.return_value = fake
        call_command('administrate_webhooks', 'register', '--dry-run')
        assert not any('webhook { create' in q for q, _ in fake.calls), (
            'register --dry-run must not issue webhook { create mutations'
        )

    @patch('administrate.management.commands.administrate_webhooks.AdministrateAPIService')
    def test_register_idempotent_creates_three(self, MockAPI):
        fake = _FakeAPI()
        MockAPI.return_value = fake
        call_command('administrate_webhooks', 'register')
        create_calls = [v for q, v in fake.calls if 'webhook { create' in q]
        assert len(create_calls) == 3

    @patch('administrate.management.commands.administrate_webhooks.AdministrateAPIService')
    def test_register_dry_run_masks_secret(self, MockAPI, settings):
        settings.ADMINISTRATE_WEBHOOK_SECRET = 'super-secret-value'
        MockAPI.return_value = _FakeAPI()
        out = StringIO()
        call_command('administrate_webhooks', 'register', '--dry-run', stdout=out)
        assert 'super-secret-value' not in out.getvalue()
        assert '***' in out.getvalue()
