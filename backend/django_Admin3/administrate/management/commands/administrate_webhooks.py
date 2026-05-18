"""Idempotent registration of Administrate webhooks for Event entity.

Re-runnable: matches existing registrations by `name` and updates rather
than duplicates. Keeps configuration colocated with code so UAT and prod
stay in sync.
"""

import json

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from administrate.models import WebhookRegistration
from administrate.services.api_service import AdministrateAPIService


# Administrate's GraphQL Query type has no singular `event(id:)` field —
# only the plural `events(...)` connection. Singular fetches go through
# the Relay node interface with an inline fragment. The webhook system
# always supplies the entity id as the `$objectid: ID!` variable.
#
# Field shapes verified against live UAT introspection (2026-05-15):
#   - `cancelled` (bool) doesn't exist; derive from `cancelledAt` (nullable
#     datetime — non-null = cancelled).
#   - `soldOut` → `isSoldOut`; `timezone` → `timeZoneName`;
#     `lmsStartDate`/`lmsEndDate` → `lmsStart`/`lmsEnd`.
#   - `webSale`, `eventUrl`, `virtualClassroom`, `primaryInstructor` simply
#     don't exist on Administrate's typed Event interface. Of those:
#       * `webSale` and `eventUrl` are exposed via custom field labels
#         ('Web sale' and 'URL') in our UAT org → request `customFieldValues`.
#       * `virtualClassroom` has no UAT custom field — webhook leaves it alone.
#       * `primaryInstructor` is `staff(connection)` in Administrate's model;
#         Event Created via webhook will fail at DB level (NOT NULL FK) —
#         operator workflow: sync_events first, then replay.
EVENT_WEBHOOK_QUERY = """
query EventWebhook($objectid: ID!) {
  node(id: $objectid) {
    id
    ... on Event {
      title
      lifecycleState
      cancelledAt
      isSoldOut
      learningMode
      maxPlaces
      minPlaces
      location { id }
      venue { id }
      timeZoneName
      lmsStart
      lmsEnd
      registrationDeadline
      courseTemplate { id }
      updatedAt
      customFieldValues {
        definitionKey
        value
      }
    }
  }
}
"""

# Session GraphQL slice — per UAT introspection 2026-05-18. The typed
# Session interface exposes id/title/venue/location; everything else
# we care about lives in `customFieldValues`:
#   - Q3VzdG9tRmllbGREZWZpbml0aW9uOjM5 ("URL")          → session_url
#   - Q3VzdG9tRmllbGREZWZpbml0aW9uOjUx ("Sequence")     → session.sequence
#   - Q3VzdG9tRmllbGREZWZpbml0aW9uOjYx ("Recording")    → session.recording_links
# We fetch customFieldValues in bulk (no `filter:` arg) and let the
# handler filter by `definitionKey` against the local `CustomField`
# lookup, mirroring how the Event handler resolves "Web sale" / "URL".
#
# NOTE: Administrate's Session type does NOT expose typed start/end
# date fields — sessions inherit timing context from the parent Event.
# We don't fetch dates here; rows created by the Session Created
# handler land with NULL `tutorial_sessions.start_date` / `end_date`
# (Phase 1 of this PR made those columns nullable). CSV bulk import
# remains the source of truth for session dates.
SESSION_WEBHOOK_QUERY = """
query SessionWebhook($objectid: ID!) {
  node(id: $objectid) {
    id
    ... on Session {
      title
      event { id }
      venue { id }
      location { id }
      customFieldValues {
        definitionKey
        value
      }
    }
  }
}
"""

# Learner GraphQL slice — per UAT introspection 2026-05-18. A Learner
# is an enrolment in an Event (single Event on Administrate's side);
# the attendance subtree enumerates per-session attendance records,
# which we use ONLY to discover which sessions the learner is enrolled
# in (so `Learner Created` can write one TutorialRegistration per
# session). The `attendanceMark` value is fetched for shape symmetry
# but isn't consumed — attendance is written through the existing CSV
# / public-attendance paths, not this webhook flow.
# Fields explained:
#   - contact + personalName.middleName → resolves to our Student via
#     the domain-specific convention (Administrate stores `student_ref`
#     in the contact's middleName field). See `adm.contacts` model
#     docstring for full context.
#   - event.id → walks to `adm.events` → `tutorials.TutorialEvents`,
#     which gives us the set of session-level TutorialRegistration
#     rows the Learner Created handler should write.
#   - attendance.sessionDetail.edges → enumerates the sessions to
#     create registrations for (via `session.id` resolved through the
#     `adm.sessions` bridge).
#
# The same query is registered for Learner Created and Learner
# Cancelled — Administrate's webhook envelope's `webhook_type_name`
# distinguishes the trigger; the payload shape is uniform so the
# handler dispatches by type after parsing.
LEARNER_WEBHOOK_QUERY = """
query LearnerWebhook($objectid: ID!) {
  node(id: $objectid) {
    id
    ... on Learner {
      lifecycleState
      contact {
        id
        personalName {
          middleName
        }
      }
      event {
        id
      }
      attendance {
        sessionDetail {
          edges {
            node {
              session {
                id
              }
            }
          }
        }
      }
    }
  }
}
"""


WEBHOOK_DEFINITIONS = [
    # Existing Event hooks (preserved).
    {'name': 'Admin3 Event Updated',   'type_name': 'Event Updated',
     'entity_path': 'event', 'query': EVENT_WEBHOOK_QUERY},
    {'name': 'Admin3 Event Created',   'type_name': 'Event Created',
     'entity_path': 'event', 'query': EVENT_WEBHOOK_QUERY},
    {'name': 'Admin3 Event Cancelled', 'type_name': 'Event Cancelled',
     'entity_path': 'event', 'query': EVENT_WEBHOOK_QUERY},

    # Session hooks — new 2026-05-18. All three share the same query
    # because Administrate's payload is shape-uniform; the handler
    # branches on webhook_type_name (Created/Updated/Deleted) to set
    # `tutorial_sessions.cancelled` or upsert / mark-deleted.
    {'name': 'Admin3 Session Created', 'type_name': 'Session Created',
     'entity_path': 'session', 'query': SESSION_WEBHOOK_QUERY},
    {'name': 'Admin3 Session Updated', 'type_name': 'Session Updated',
     'entity_path': 'session', 'query': SESSION_WEBHOOK_QUERY},
    {'name': 'Admin3 Session Deleted', 'type_name': 'Session Deleted',
     'entity_path': 'session', 'query': SESSION_WEBHOOK_QUERY},

    # Learner hooks — new 2026-05-18. Attendance is intentionally NOT
    # webhook-driven (handled by CSV import / public-attendance views);
    # the `Learner Attended Session` webhook type is not registered.
    {'name': 'Admin3 Learner Created',   'type_name': 'Learner Created',
     'entity_path': 'learner', 'query': LEARNER_WEBHOOK_QUERY},
    {'name': 'Admin3 Learner Cancelled', 'type_name': 'Learner Cancelled',
     'entity_path': 'learner', 'query': LEARNER_WEBHOOK_QUERY},
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
        base = (
            f"{settings.ADMINISTRATE_WEBHOOK_BASE_URL.rstrip('/')}"
            f"/api/administrate/webhooks/"
            f"{settings.ADMINISTRATE_WEBHOOK_ROUTE_TOKEN}"
        )
        for spec in WEBHOOK_DEFINITIONS:
            webhook_type_id = type_index.get(spec['type_name'])
            if not webhook_type_id:
                raise CommandError(
                    f"Unknown webhook type from Administrate: {spec['type_name']}"
                )
            # Per-entity URL (Phase 6 / 2026-05-18): the ingress view
            # reads `entity_type` from the URL path so the inbox row
            # records which entity this delivery is for. Format:
            # /api/administrate/webhooks/<token>/<entity_path>/
            url = f"{base}/{spec['entity_path']}/"
            # Administrate types `config` as a String scalar that they
            # `json.loads` server-side (see
            # developer.getadministrate.com/docs/core/Webhooks/02_setup.md
            # — described as "free-form JSON payload"). Sending a dict here
            # gets stringified to its Python repr (single quotes), which
            # Administrate then rejects with "Expecting property name
            # enclosed in double quotes". Pre-encoding with json.dumps
            # produces valid JSON.
            create_input = {
                'name': spec['name'],
                'webhookTypeId': webhook_type_id,
                'query': spec['query'],
                'url': url,
                'config': json.dumps(
                    {'secret': settings.ADMINISTRATE_WEBHOOK_SECRET}
                ),
                'notificationEmails': settings.ADMINISTRATE_WEBHOOK_NOTIFICATION_EMAILS,
            }
            if dry_run:
                safe_input = {**create_input, 'config': '{"secret": "***"}'}
                self.stdout.write(f"[dry-run] webhooks.create {safe_input}")
                continue

            # Administrate's schema (verified against
            # https://developer.getadministrate.com/docs/core/Webhooks/02_setup.md):
            #   - top-level group is `webhooks` (plural)
            #   - update takes a single `input: { id, ... }` arg (id nested,
            #     not a separate variable)
            #   - response includes nested `errors: [{label, message, value}]`
            #     for application-level validation failures (HTTP 200 + errors).
            existing = self._find_by_name(api, spec['name'])
            if existing:
                # WebhookUpdateInput's shape is NOT a superset of
                # WebhookCreateInput (verified against live UAT 2026-05-15):
                #   - the addressing key is `webhookId` (not `id`)
                #   - `webhookTypeId` is rejected — the type is immutable
                #     post-create. Changing types requires delete+recreate.
                # Build the update payload explicitly rather than spreading
                # create_input + tweaking, to avoid drift if we ever add a
                # create-only field.
                update_input = {
                    'webhookId': existing,
                    'name': spec['name'],
                    'query': spec['query'],
                    'url': url,
                    'config': json.dumps(
                        {'secret': settings.ADMINISTRATE_WEBHOOK_SECRET}
                    ),
                    'notificationEmails': settings.ADMINISTRATE_WEBHOOK_NOTIFICATION_EMAILS,
                }
                result = api.execute_query(
                    'mutation Upd($input: WebhookUpdateInput!) { '
                    'webhooks { update(input: $input) { '
                    'webhook { id lifecycleState } '
                    'errors { label message value } } } }',
                    variables={'input': update_input},
                )
                self._raise_on_mutation_errors(result, 'update', spec['name'])
                self._persist_registration(result, 'update', spec)
                self.stdout.write(f"updated: {spec['name']} ({existing})")
            else:
                result = api.execute_query(
                    'mutation Create($input: WebhookCreateInput!) { '
                    'webhooks { create(input: $input) { '
                    'webhook { id lifecycleState } '
                    'errors { label message value } } } }',
                    variables={'input': create_input},
                )
                self._raise_on_mutation_errors(result, 'create', spec['name'])
                self._persist_registration(result, 'create', spec)
                self.stdout.write(f"created: {spec['name']}")

    def _delete_all(self, api):
        # Administrate's webhooks GraphQL surface exposes no `delete` mutation
        # (verified against developer.getadministrate.com/docs/core/Webhooks/
        # 02_setup.md — only create/update are documented). To stop deliveries,
        # use Administrate's UI or call `webhooks { update }` with
        # lifecycleState='disabled'. Implementing that here is a separate
        # change because the current docs Section 4.1 promises a hard delete;
        # we should align doc + behavior in one go.
        raise CommandError(
            'delete-all is not supported: Administrate exposes no delete '
            'mutation for webhooks. Disable each webhook from Administrate UI, '
            'or extend this command to call `webhooks { update }` with '
            "lifecycleState='disabled'."
        )

    def _resolve_webhook_types(self, api):
        result = api.execute_query(
            'query { webhookTypes(first: 200) { edges { node { id name } } } }'
        )
        return {
            edge['node']['name']: edge['node']['id']
            for edge in (result.get('data', {}).get('webhookTypes', {}).get('edges') or [])
        }

    def _find_by_name(self, api, name):
        # Administrate's `webhooks` query supports `filters: [{field, operation,
        # value}]`, but the docs don't enumerate accepted `field` values. With
        # only ~3 webhooks under management, list-all + client-side filter is
        # bulletproof and avoids another round-trip if our filter guess is
        # wrong. Cap at first:200 (Administrate's documented page size).
        result = api.execute_query(
            'query { webhooks(first: 200) { edges { node { id name } } } }'
        )
        edges = result.get('data', {}).get('webhooks', {}).get('edges') or []
        for edge in edges:
            node = edge.get('node') or {}
            if node.get('name') == name:
                return node.get('id')
        return None

    def _persist_registration(self, result, action, spec):
        """Persist the (administrate_webhook_id -> webhook_type_name) mapping.

        The inbound webhook dispatcher needs this to route deliveries —
        Administrate's payload metadata only echoes the opaque `webhook_id`,
        not the human-readable type. Done after `_raise_on_mutation_errors`
        so we only ever store rows we know were accepted by Administrate.
        """
        payload = (
            result.get('data', {}).get('webhooks', {}).get(action) or {}
        )
        webhook = payload.get('webhook') or {}
        webhook_id = webhook.get('id')
        if not webhook_id:
            # Defensive: if Administrate didn't return an id, something
            # has changed in their schema and we shouldn't persist a
            # partial row. The mutation already passed _raise_on_mutation_errors,
            # so this branch is genuinely unexpected.
            raise CommandError(
                f"{action} {spec['name']!r}: Administrate returned no webhook.id"
            )
        WebhookRegistration.objects.update_or_create(
            administrate_webhook_id=webhook_id,
            defaults={
                'name': spec['name'],
                'webhook_type_name': spec['type_name'],
                'lifecycle_state': webhook.get('lifecycleState') or '',
            },
        )

    def _raise_on_mutation_errors(self, result, action, name):
        """Surface application-level errors that Administrate returns inside
        the mutation payload (HTTP 200 with non-empty `errors` array). Without
        this, a rejected URL or quota error would print as success and the
        operator would be left wondering why no deliveries arrive."""
        payload = (
            result.get('data', {}).get('webhooks', {}).get(action) or {}
        )
        errors = payload.get('errors') or []
        if errors:
            formatted = '; '.join(
                f"{e.get('label', '?')}: {e.get('message', '?')}"
                for e in errors
            )
            raise CommandError(
                f"webhooks.{action} for {name!r} returned errors: {formatted}"
            )
