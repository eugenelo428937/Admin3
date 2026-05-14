"""Idempotent registration of Administrate webhooks for Event entity.

Re-runnable: matches existing registrations by `name` and updates rather
than duplicates. Keeps configuration colocated with code so UAT and prod
stay in sync.
"""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from administrate.services.api_service import AdministrateAPIService


EVENT_WEBHOOK_QUERY = """
query EventWebhook($objectid: ID!) {
  event(id: $objectid) {
    id
    title
    lifecycleState
    cancelled
    soldOut
    webSale
    learningMode
    maxPlaces
    minPlaces
    location { id }
    venue { id }
    primaryInstructor { id }
    eventUrl
    virtualClassroom
    timezone
    lmsStartDate
    lmsEndDate
    registrationDeadline
    courseTemplate { id }
    updatedAt
  }
}
"""

WEBHOOK_DEFINITIONS = [
    {'name': 'Admin3 Event Updated',   'type_name': 'Event Updated'},
    {'name': 'Admin3 Event Created',   'type_name': 'Event Created'},
    {'name': 'Admin3 Event Cancelled', 'type_name': 'Event Cancelled'},
]


class Command(BaseCommand):
    help = (
        'Register, list, or delete Administrate webhooks for the Event entity. '
        'Idempotent: re-running `register` updates existing webhooks instead '
        'of duplicating them.'
    )

    def add_arguments(self, parser):
        sub = parser.add_subparsers(dest='action', required=True)
        sub.add_parser('list')
        reg = sub.add_parser('register')
        reg.add_argument(
            '--dry-run', action='store_true',
            help='Print GraphQL mutations without sending them.',
        )
        sub.add_parser('delete-all')

    def handle(self, *args, action, **opts):
        api = AdministrateAPIService()
        if action == 'list':
            self._list(api)
        elif action == 'register':
            self._register(api, opts.get('dry_run', False))
        elif action == 'delete-all':
            self._delete_all(api)
        else:
            raise CommandError(f'Unknown action: {action}')

    def _list(self, api):
        result = api.execute_query(
            'query { webhooks(first: 100) { edges { node { id name webhookType { name } } } } }'
        )
        edges = (
            result.get('data', {}).get('webhooks', {}).get('edges') or []
        )
        for edge in edges:
            node = edge.get('node', {})
            self.stdout.write(
                f"- {node.get('id')}: {node.get('name')} "
                f"[{node.get('webhookType', {}).get('name')}]"
            )
        self.stdout.write(
            self.style.SUCCESS(f'{len(edges)} webhook(s) registered.')
        )

    def _register(self, api, dry_run):
        type_index = self._resolve_webhook_types(api)
        url = (
            f"{settings.ADMINISTRATE_WEBHOOK_BASE_URL.rstrip('/')}"
            f"/api/administrate/webhooks/"
            f"{settings.ADMINISTRATE_WEBHOOK_ROUTE_TOKEN}/event/"
        )
        for spec in WEBHOOK_DEFINITIONS:
            webhook_type_id = type_index.get(spec['type_name'])
            if not webhook_type_id:
                raise CommandError(
                    f"Unknown webhook type from Administrate: {spec['type_name']}"
                )
            variables = {
                'name': spec['name'],
                'webhookTypeId': webhook_type_id,
                'query': EVENT_WEBHOOK_QUERY,
                'url': url,
                'config': {'secret': settings.ADMINISTRATE_WEBHOOK_SECRET},
                'notificationEmails': settings.ADMINISTRATE_WEBHOOK_NOTIFICATION_EMAILS,
            }
            if dry_run:
                safe_variables = {**variables, 'config': {'secret': '***'}}
                self.stdout.write(f"[dry-run] webhook.create {safe_variables}")
                continue

            # NOTE: Mutation field names below follow the codebase's nested-action
            # convention (see administrate/templates/graphql/mutations/*.graphql
            # for examples like `event { createBlended }`). Actual Administrate
            # schema for webhooks needs UAT verification — if the server rejects
            # these field names, the structure stays the same and only the inner
            # field identifiers change.
            existing = self._find_by_name(api, spec['name'])
            if existing:
                api.execute_query(
                    'mutation Upd($id: ID!, $input: WebhookInput!) { '
                    'webhook { update(id: $id, input: $input) { webhook { id } } } }',
                    variables={'id': existing, 'input': variables},
                )
                self.stdout.write(f"updated: {spec['name']} ({existing})")
            else:
                api.execute_query(
                    'mutation Create($input: WebhookInput!) { '
                    'webhook { create(input: $input) { webhook { id } } } }',
                    variables={'input': variables},
                )
                self.stdout.write(f"created: {spec['name']}")

    def _delete_all(self, api):
        for spec in WEBHOOK_DEFINITIONS:
            existing = self._find_by_name(api, spec['name'])
            if existing:
                api.execute_query(
                    'mutation Del($id: ID!) { '
                    'webhook { delete(id: $id) { success } } }',
                    variables={'id': existing},
                )
                self.stdout.write(f'deleted: {spec["name"]}')

    def _resolve_webhook_types(self, api):
        result = api.execute_query(
            'query { webhookTypes(first: 200) { edges { node { id name } } } }'
        )
        return {
            edge['node']['name']: edge['node']['id']
            for edge in (result.get('data', {}).get('webhookTypes', {}).get('edges') or [])
        }

    def _find_by_name(self, api, name):
        result = api.execute_query(
            'query Find($name: String!) { '
            'webhooks(filter: {name: $name}, first: 1) { edges { node { id } } } }',
            variables={'name': name},
        )
        edges = result.get('data', {}).get('webhooks', {}).get('edges') or []
        return edges[0]['node']['id'] if edges else None
