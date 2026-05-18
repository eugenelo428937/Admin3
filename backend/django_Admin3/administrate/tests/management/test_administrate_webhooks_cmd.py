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
                            # Event types (existing).
                            {'node': {'id': 'wt_e_updated',   'name': 'Event Updated'}},
                            {'node': {'id': 'wt_e_created',   'name': 'Event Created'}},
                            {'node': {'id': 'wt_e_cancelled', 'name': 'Event Cancelled'}},
                            # Session types (Phase 4, 2026-05-18).
                            {'node': {'id': 'wt_s_created', 'name': 'Session Created'}},
                            {'node': {'id': 'wt_s_updated', 'name': 'Session Updated'}},
                            {'node': {'id': 'wt_s_deleted', 'name': 'Session Deleted'}},
                            # Learner types (Phase 4, 2026-05-18).
                            {'node': {'id': 'wt_l_created',  'name': 'Learner Created'}},
                            {'node': {'id': 'wt_l_cancelled', 'name': 'Learner Cancelled'}},
                            {'node': {'id': 'wt_l_attended', 'name': 'Learner Attended Session'}},
                        ]
                    }
                }
            }
        # List/find query — return empty so register goes through create path.
        if 'webhooks(' in query and 'webhooks { update' not in query:
            return {'data': {'webhooks': {'edges': []}}}
        if 'webhooks { create' in query:
            return {'data': {'webhooks': {'create': {
                'webhook': {'id': 'wh_new', 'lifecycleState': 'active'},
                'errors': [],
            }}}}
        if 'webhooks { update' in query:
            return {'data': {'webhooks': {'update': {
                'webhook': {'id': 'wh_existing', 'lifecycleState': 'active'},
                'errors': [],
            }}}}
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
        assert not any('webhooks { create' in q for q, _ in fake.calls), (
            'register --dry-run must not issue webhook { create mutations'
        )

    @patch('administrate.management.commands.administrate_webhooks.AdministrateAPIService')
    def test_register_creates_one_per_spec(self, MockAPI):
        # Post Phase 4 (2026-05-18): WEBHOOK_DEFINITIONS expanded from
        # 3 Event-only specs to 9 (Event + Session + Learner). One
        # create call per spec on a fresh install.
        fake = _FakeAPI()
        MockAPI.return_value = fake
        call_command('administrate_webhooks', 'register')
        create_calls = [v for q, v in fake.calls if 'webhooks { create' in q]
        from administrate.management.commands import administrate_webhooks as cmd
        assert len(create_calls) == len(cmd.WEBHOOK_DEFINITIONS)

    @patch('administrate.management.commands.administrate_webhooks.AdministrateAPIService')
    def test_register_persists_webhook_id_to_type_mapping(self, MockAPI):
        """Each successful create/update must persist the
        (administrate_webhook_id -> webhook_type_name) row that the inbound
        ingress relies on to route deliveries — Administrate's payload
        doesn't echo the type. If this side-effect breaks, every inbound
        webhook fails ingress with 'unknown webhook_id'.
        """
        from administrate.models import WebhookRegistration

        from administrate.management.commands import administrate_webhooks as cmd

        # Map each spec.name → a distinct fake webhook id, so we can
        # assert every spec persisted a row keyed to its own id.
        # Order matches WEBHOOK_DEFINITIONS so the iterator yields the
        # right id for the right spec on each create call.
        fake_ids = [f'wh_{i}' for i in range(len(cmd.WEBHOOK_DEFINITIONS))]
        expected_pairs = dict(zip(
            fake_ids,
            [s['type_name'] for s in cmd.WEBHOOK_DEFINITIONS],
        ))

        class _DistinctIdAPI(_FakeAPI):
            """Returns a different webhook id per create call so we can verify
            each spec persists a distinct row (vs. update_or_create
            collapsing into one)."""
            def __init__(self):
                super().__init__()
                self._next_id = iter(fake_ids)

            def execute_query(self, query, variables=None):
                self.calls.append((query, variables))
                if 'webhooks { create' in query:
                    return {'data': {'webhooks': {'create': {
                        'webhook': {
                            'id': next(self._next_id),
                            'lifecycleState': 'active',
                        },
                        'errors': [],
                    }}}}
                return super().execute_query(query, variables)

        MockAPI.return_value = _DistinctIdAPI()
        call_command('administrate_webhooks', 'register')

        # Every spec persisted, keyed by Administrate-side id.
        rows = {
            r.administrate_webhook_id: r.webhook_type_name
            for r in WebhookRegistration.objects.all()
        }
        assert rows == expected_pairs

    @patch('administrate.management.commands.administrate_webhooks.AdministrateAPIService')
    def test_register_persistence_is_idempotent_on_rerun(self, MockAPI):
        """Re-running `register` must not duplicate registration rows — the
        update path uses the same id, so update_or_create should hit the
        existing row. Otherwise a routine config drift check (rerun register)
        would explode the table with unique-constraint violations."""
        from administrate.models import WebhookRegistration

        class _UpdateAPI(_FakeAPI):
            def execute_query(self, query, variables=None):
                self.calls.append((query, variables))
                # Pretend each spec already exists by name, forcing the update path.
                if 'webhooks(' in query and 'webhooks { update' not in query:
                    name = (variables or {}).get('name')
                    return {'data': {'webhooks': {'edges': [
                        {'node': {'id': 'wh_existing_1', 'name': 'Admin3 Event Updated'}},
                        {'node': {'id': 'wh_existing_2', 'name': 'Admin3 Event Created'}},
                        {'node': {'id': 'wh_existing_3', 'name': 'Admin3 Event Cancelled'}},
                    ]}}}
                return super().execute_query(query, variables)

        MockAPI.return_value = _UpdateAPI()
        # First run populates from the update path (3 rows; _FakeAPI's update
        # branch returns the same id every time, so we expect 1 row not 3.
        # That's enough to prove idempotency — a second run mustn't duplicate.)
        call_command('administrate_webhooks', 'register')
        first_run_count = WebhookRegistration.objects.count()
        call_command('administrate_webhooks', 'register')
        assert WebhookRegistration.objects.count() == first_run_count

    @patch('administrate.management.commands.administrate_webhooks.AdministrateAPIService')
    def test_register_raises_when_mutation_returns_errors(self, MockAPI):
        """Administrate's webhook mutations return HTTP 200 with a nested
        errors:[{label,message,value}] array on validation failure (e.g.
        non-HTTPS URL). Treating those as success would silently lose the
        registration — the operator would then wonder why no deliveries
        arrived. Surface them as CommandError."""
        from django.core.management.base import CommandError

        class _ErrorAPI(_FakeAPI):
            def execute_query(self, query, variables=None):
                if 'webhooks { create' in query:
                    return {'data': {'webhooks': {'create': {
                        'webhook': None,
                        'errors': [{
                            'label': 'url',
                            'message': 'must be https',
                            'value': variables['input']['url'],
                        }],
                    }}}}
                return super().execute_query(query, variables)

        MockAPI.return_value = _ErrorAPI()
        with pytest.raises(CommandError, match='must be https'):
            call_command('administrate_webhooks', 'register')

    @patch('administrate.management.commands.administrate_webhooks.AdministrateAPIService')
    def test_register_update_input_uses_webhookid_not_id(self, MockAPI):
        """Administrate's WebhookUpdateInput differs from WebhookCreateInput
        (verified against live UAT 2026-05-15):
          - the addressing key is `webhookId` (not `id`)
          - `webhookTypeId` is rejected — type is immutable post-create
        Pin both invariants so a future "let's just spread create_input"
        refactor breaks here rather than against a live Administrate response.
        """

        class _ExistingAPI(_FakeAPI):
            def execute_query(self, query, variables=None):
                self.calls.append((query, variables))
                if 'webhookTypes' in query:
                    return super().execute_query(query, variables)
                if 'webhooks(' in query and 'webhooks { update' not in query:
                    return {'data': {'webhooks': {'edges': [
                        {'node': {'id': 'wh_e1', 'name': 'Admin3 Event Updated'}},
                        {'node': {'id': 'wh_e2', 'name': 'Admin3 Event Created'}},
                        {'node': {'id': 'wh_e3', 'name': 'Admin3 Event Cancelled'}},
                    ]}}}
                return super().execute_query(query, variables)

        fake = _ExistingAPI()
        MockAPI.return_value = fake
        call_command('administrate_webhooks', 'register')
        update_calls = [v for q, v in fake.calls if 'webhooks { update' in q]
        assert update_calls, 'expected at least one update mutation'
        for variables in update_calls:
            assert 'id' not in variables, (
                f"top-level 'id' variable not allowed; got {variables!r}"
            )
            input_obj = variables.get('input') or {}
            # WebhookUpdateInput addresses by `webhookId`, NOT `id`.
            assert input_obj.get('webhookId'), (
                f"input.webhookId required for update; got {variables!r}"
            )
            assert 'id' not in input_obj, (
                f"WebhookUpdateInput rejects 'id'; got {variables!r}"
            )
            # WebhookUpdateInput rejects `webhookTypeId` (type is immutable).
            assert 'webhookTypeId' not in input_obj, (
                f"WebhookUpdateInput rejects 'webhookTypeId'; got {variables!r}"
            )

    @patch('administrate.management.commands.administrate_webhooks.AdministrateAPIService')
    def test_delete_all_raises_clear_error(self, MockAPI):
        """Administrate exposes no `delete` mutation for webhooks — the API
        only supports disabling via `update lifecycleState: 'disabled'`. Until
        that's implemented, `delete-all` must fail loudly rather than firing
        a mutation Administrate will reject as `Unknown field "delete"`."""
        from django.core.management.base import CommandError

        MockAPI.return_value = _FakeAPI()
        with pytest.raises(CommandError, match='not supported'):
            call_command('administrate_webhooks', 'delete-all')

    @patch('administrate.management.commands.administrate_webhooks.AdministrateAPIService')
    def test_register_serializes_config_as_json_string(self, MockAPI):
        """Administrate types `config` as a String scalar that they json.loads
        server-side. Sending a raw Python/GraphQL Object causes Administrate
        to reject with `Expecting property name enclosed in double quotes`
        (it has stringified our dict via repr() to `{'secret': ...}`, which
        is not valid JSON). The fix is to json.dumps before sending."""
        import json as _json
        fake = _FakeAPI()
        MockAPI.return_value = fake
        call_command('administrate_webhooks', 'register')
        create_calls = [v for q, v in fake.calls if 'webhooks { create' in q]
        assert create_calls, 'expected create call'
        for variables in create_calls:
            config = variables['input']['config']
            assert isinstance(config, str), (
                f'config must be a JSON string, got {type(config).__name__}'
            )
            # Round-trip: should be valid JSON with our secret inside.
            decoded = _json.loads(config)
            assert decoded == {'secret': 'test-shared-secret'}

    @patch('administrate.management.commands.administrate_webhooks.AdministrateAPIService')
    def test_register_query_uses_relay_node_pattern(self, MockAPI):
        """Administrate exposes singular-object fetches via Relay's
        node(id:) interface with inline fragment, not via singular-
        field accessors (e.g. there is no `event(id:)` — only `events`
        plural and the `node` interface). Every registered query must
        target an inline fragment matching the spec's entity type."""
        from administrate.management.commands import administrate_webhooks as cmd

        # Spec name -> expected inline-fragment type. Defined here
        # rather than via `entity_path` capitalization to keep the
        # mapping explicit (and to catch typos in the type-name).
        fragment_by_path = {
            'event':   '... on Event',
            'session': '... on Session',
            'learner': '... on Learner',
        }

        fake = _FakeAPI()
        MockAPI.return_value = fake
        call_command('administrate_webhooks', 'register')
        create_calls = [v for q, v in fake.calls if 'webhooks { create' in q]
        # Build a name → spec lookup to know which fragment each call
        # should carry.
        spec_by_name = {s['name']: s for s in cmd.WEBHOOK_DEFINITIONS}
        for variables in create_calls:
            inp = variables['input']
            query = inp['query']
            spec = spec_by_name[inp['name']]
            expected_fragment = fragment_by_path[spec['entity_path']]
            assert 'node(id: $objectid)' in query, (
                f'query must use Relay node pattern, got: {query[:200]}'
            )
            assert expected_fragment in query, (
                f'query for {spec["name"]} must use inline fragment '
                f'{expected_fragment!r}, got: {query[:200]}'
            )

    @patch('administrate.management.commands.administrate_webhooks.AdministrateAPIService')
    def test_register_dry_run_masks_secret(self, MockAPI, settings):
        settings.ADMINISTRATE_WEBHOOK_SECRET = 'super-secret-value'
        MockAPI.return_value = _FakeAPI()
        out = StringIO()
        call_command('administrate_webhooks', 'register', '--dry-run', stdout=out)
        assert 'super-secret-value' not in out.getvalue()
        assert '***' in out.getvalue()
