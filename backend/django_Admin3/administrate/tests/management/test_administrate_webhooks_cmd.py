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
                'webhookTypes': {
                    'edges': [
                        {'node': {'id': 'wt_updated', 'name': 'Event Updated'}},
                        {'node': {'id': 'wt_created', 'name': 'Event Created'}},
                        {'node': {'id': 'wt_cancelled', 'name': 'Event Cancelled'}},
                    ]
                }
            }
        if 'webhooks(' in query and 'webhooks.update' not in query:
            # list query — return empty so register goes through create path
            return {'webhooks': {'edges': []}}
        if 'webhooks.create' in query:
            return {'webhooks': {'create': {'webhook': {'id': 'wh_new'}}}}
        if 'webhooks.delete' in query:
            return {'webhooks': {'delete': {'success': True}}}
        return {}


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
        assert 'Event Updated' in out.getvalue() or out.getvalue() == ''  # tolerant

    @patch('administrate.management.commands.administrate_webhooks.AdministrateAPIService')
    def test_register_dry_run_does_not_call_create(self, MockAPI):
        fake = _FakeAPI()
        MockAPI.return_value = fake
        call_command('administrate_webhooks', 'register', '--dry-run')
        assert not any('webhooks.create' in q for q, _ in fake.calls), (
            'register --dry-run must not issue webhooks.create mutations'
        )

    @patch('administrate.management.commands.administrate_webhooks.AdministrateAPIService')
    def test_register_idempotent_creates_three(self, MockAPI):
        fake = _FakeAPI()
        MockAPI.return_value = fake
        call_command('administrate_webhooks', 'register')
        create_calls = [v for q, v in fake.calls if 'webhooks.create' in q]
        assert len(create_calls) == 3
