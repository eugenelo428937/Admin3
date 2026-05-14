# Administrate `Event` Webhook Intake — Design (Slice 1)

**Status:** Draft for implementation
**Date:** 2026-05-14
**Author:** brainstormed with Claude (Opus 4.7)
**Scope:** Single-entity (Administrate `Event`) thin slice that proves the
inbound-webhook architecture. Other entities (`Session`, `CourseTemplate`,
`PriceLevel`, `Venue`, `Location`, `Instructor`) follow the same pattern in
future slices.

## Goal

Receive inbound webhook deliveries from Administrate's hosted system and
automatically reflect changes in our local `adm.events` rows, so the
existing polling-based `sync_*` management commands stop being the only
mechanism by which we learn about changes in Administrate.

## Non-goals (this slice)

- Any entity other than `administrate.Event`. No `Session`, no
  `CourseTemplate`, no learner/`Contact`/`Account` records.
- Replacing or retiring the existing `sync_*` management commands. They
  remain the safety net and the bulk-backfill path; webhooks ride alongside.
- A staff-facing UI for managing webhook registrations. Registration is a
  Django management command in this slice; UI can come later.
- Auto-linking the cross-schema `adm.events.tutorial_event` FK to
  `tutorials.TutorialEvents`. Newly materialised rows carry a null FK and
  staff link them through their existing workflow.
- HMAC signature verification. Administrate does not sign requests; we
  authenticate with a shared secret embedded in the webhook
  `configuration` plus a route token in the URL.

## Background

The `administrate` Django app currently learns about Administrate-side
changes only by **pulling**: scheduled or manual runs of
`sync_course_templates`, `sync_venues`, `sync_locations`,
`sync_instructors`, `sync_price_levels`, `import_event_sessions`, etc.
There is no inbound HTTP surface in the app — `administrate/views.py` is
empty, and `administrate` is not routed from `django_Admin3/urls.py`.

The `AdministrateAPIService` (`administrate/services/api_service.py`)
already handles outbound GraphQL requests and writes an `ApiAuditLog`
row per call. The pattern for outbound work — service module + audit
table — is well-established and is the model the inbound side mirrors.

Administrate's webhook documentation (the four pages linked in the
brainstorm transcript) establishes:

- Webhooks are registered via a GraphQL `webhooks.create()` mutation,
  NOT through a control-panel toggle. Configuration lives entirely in
  the API.
- Inbound payload shape: `{ metadata: {...}, payload: <result of the
  query the webhook was registered with>, configuration: <encrypted
  blob or null> }`.
- Requests are unsigned. The documented authentication options are
  HTTP Basic Auth in the URL or stashing a shared secret in the
  encrypted `configuration` field.
- Administrate retries non-200 responses "a few times". Operators can
  also replay individual deliveries from the control panel.
- Filtered webhooks accept JMESPath expressions on the **post-event
  state** only ("field X has value Y" is allowed, "field X changed" is
  not). Change detection therefore has to happen on our side.

## Architecture

### High-level data flow

```
┌─────────────┐  HTTPS POST   ┌──────────────────────────────┐
│ Administrate│ ────────────▶ │ /api/administrate/webhooks/  │
│   Webhooks  │               │   <route_token>/event/       │
└─────────────┘ ◀──── 200 ─── │  (DRF APIView, CSRF exempt)  │
        ▲   retries           └──────────────┬───────────────┘
        │                                    │  1. verify route_token (constant-time)
        │                                    │  2. verify configuration secret
        │                                    │  3. dedup via UNIQUE constraint
        │                                    │  4. INSERT adm.webhook_inbox
        │                                    │  5. enqueue Django Task
        │                                    ▼
        │                          ┌─────────────────────────┐
        │                          │  Django Tasks worker    │
        │                          │  (manage.py db_worker)  │
        │                          └────────────┬────────────┘
        │                                       │ load inbox row
        │                                       │ dispatch by webhook_type_name
        │                                       ▼
        │                          ┌──────────────────────────┐
        │                          │ EventWebhookHandler      │
        │                          │ (administrate/services/) │
        │                          │  - upsert adm.events row │
        │                          │  - set cancelled flag    │
        │                          │  - never touch FK to     │
        │                          │    tutorials             │
        │                          └────────────┬─────────────┘
        │                                       │ on failure (max_retries=5)
        │                                       ▼
        │                          ┌──────────────────────────┐
        └──────── retry by ─────── │ Task exp backoff retry,  │
                  Administrate     │ then inbox row.status =  │
                                   │ 'dead' for manual replay │
                                   └──────────────────────────┘
```

### Component responsibilities

| Component | File | Purpose |
|---|---|---|
| HTTP edge | `administrate/views/webhooks.py` | Authenticate, persist raw payload to inbox, enqueue task, ack |
| Inbox model | `administrate/models/webhook_inbox.py` | Durable record of received deliveries; dedup at DB level |
| Task wrapper | `administrate/tasks.py` | `django.tasks` task that loads an inbox row and dispatches to handler |
| Handler service | `administrate/services/webhook_handlers.py` | Per-webhook-type apply logic; pure mapping + DB upsert |
| Payload mapper | `administrate/services/webhook_handlers.py` | Pure function: GraphQL `node` dict → `Event` field dict |
| Registration command | `administrate/management/commands/administrate_webhooks.py` | Idempotent `list / register / delete-all` against Administrate API |
| Operational command | `administrate/management/commands/administrate_webhooks_inbox.py` | `list / show / replay` for inbox rows |

The HTTP edge is deliberately dumb (validate, persist, enqueue, ack).
All business logic sits behind the queue boundary, where it has the time
budget for retries, the ability to roll back transactions on error, and
direct access to the test harness. This is the same separation the
existing audit log gives the outbound side.

### Alternatives considered

| Alternative | Why rejected |
|---|---|
| **Apply changes inline in the HTTP handler** | Couples web-tier latency to the cost of every DB upsert and blocks the Administrate retry budget on transient DB hiccups. The HTTP timeout window is the wrong place to amortise retries. |
| **Skip the inbox table and rely solely on `django.tasks`' task store** | Django Tasks' record is an *execution* log ("did the worker run?"); the inbox is a *receipt* log ("did Administrate deliver?"). They serve different debugging needs, and keeping the raw payload as a first-class row outlives the task's lifecycle (tasks may be purged on success). |
| **Route the payload into the rules engine at a new `administrate_webhook_event_*` entry point** | Entity sync is not a business-rule problem. Authoring rules-engine context schemas to mirror every Administrate payload is more work than writing a plain handler function, with no operational upside. |
| **Add Celery + Redis broker for async processing** | New infrastructure for one thin slice. Django 6.0's `django.tasks` (DB-backed) supplies retries, exponential backoff, dead-letter behaviour, and runs from the existing database — no broker required. |
| **HMAC signature verification** | Administrate does not sign requests. Both documented options are pre-shared secrets; the design uses one. |
| **Auto-link the `tutorial_event` FK on Event Created** | Heuristic matching (course_template + sitting + learning_mode) risks wrong matches when multiple candidates exist. Leaving the FK null and surfacing unlinked rows in admin is safer for a first cut. |

## Decisions summary

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Scope | Single entity (`Event`), Created + Updated + Cancelled | Proves the pipeline; minimum surface area |
| 2 | Processing model | Inbox table + `django.tasks` DB backend | No new infra; durable; replayable |
| 3 | Authentication | URL route token AND shared secret in `configuration` | Defence in depth without HMAC support |
| 4 | Registration | Idempotent management command | Config lives in repo; UAT/prod stay in sync |
| 5 | Conflict policy | Administrate wins — overwrite by `external_id` | Matches existing sync semantics |
| 6 | Created FK to `tutorials.TutorialEvents` | Leave null; staff link manually | No fuzzy-match risk |
| 7 | Dedup | DB UNIQUE on `(administrate_webhook_id, entity_external_id, administrate_event_timestamp)` | Race-free at the database |
| 8 | Retries | `@task(max_retries=5, backoff='exponential')` | Survives transient DB / network blips |
| 9 | Failure recovery | CLI replay only (no admin page) | Audience is engineers responding to alerts |
| 10 | Observability | Structured logs + `inbox_lag_seconds` gauge | Catches silent backpressure |
| 11 | Receiving URL path | `/api/administrate/webhooks/<route_token>/event/` | Follows existing `/api/...` pattern |

## Data model

A single new table in the `adm` schema:

```python
# administrate/models/webhook_inbox.py
from django.db import models


class WebhookInbox(models.Model):
    STATUS_RECEIVED = 'received'
    STATUS_PROCESSING = 'processing'
    STATUS_APPLIED = 'applied'
    STATUS_DUPLICATE = 'duplicate'
    STATUS_FAILED = 'failed'
    STATUS_DEAD = 'dead'

    STATUS_CHOICES = [
        (STATUS_RECEIVED, 'Received'),
        (STATUS_PROCESSING, 'Processing'),
        (STATUS_APPLIED, 'Applied'),
        (STATUS_DUPLICATE, 'Duplicate'),
        (STATUS_FAILED, 'Failed'),
        (STATUS_DEAD, 'Dead'),
    ]

    administrate_webhook_id = models.CharField(max_length=64, db_index=True)
    administrate_event_timestamp = models.DateTimeField(db_index=True)
    webhook_type_name = models.CharField(max_length=80)
    entity_type = models.CharField(max_length=40)
    entity_external_id = models.CharField(max_length=64, db_index=True)

    raw_payload = models.JSONField()
    raw_headers = models.JSONField(default=dict)

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_RECEIVED,
        db_index=True,
    )
    error_message = models.TextField(blank=True, default='')
    attempts = models.PositiveSmallIntegerField(default=0)

    task_id = models.CharField(max_length=64, blank=True, default='')

    received_at = models.DateTimeField(auto_now_add=True)
    applied_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = 'administrate'
        db_table = '"adm"."webhook_inbox"'
        constraints = [
            models.UniqueConstraint(
                fields=[
                    'administrate_webhook_id',
                    'entity_external_id',
                    'administrate_event_timestamp',
                ],
                name='uniq_webhook_inbox_delivery',
            ),
        ]
        indexes = [
            models.Index(fields=['status', 'received_at']),
            models.Index(fields=['entity_type', 'entity_external_id']),
        ]
```

Existing models (`Event`, `Session`, etc.) require **no schema changes**
for this slice. The handler writes the same columns the management
commands already populate.

A migration creates `adm.webhook_inbox` and the unique/index objects.
Migration assertions (`MIGRATION_ASSERT_MODE = True`) apply per project
convention.

## HTTP edge

### URL

```python
# administrate/urls.py (new file)
from django.urls import path
from administrate.views.webhooks import AdministrateEventWebhookView

urlpatterns = [
    path(
        'webhooks/<str:route_token>/event/',
        AdministrateEventWebhookView.as_view(),
        name='administrate-event-webhook',
    ),
]
```

Mounted from `django_Admin3/urls.py` under `api/administrate/`. Full
path: `/api/administrate/webhooks/<route_token>/event/`.

### View

```python
# administrate/views/webhooks.py
from django.conf import settings
from django.db import IntegrityError
from django.utils.crypto import constant_time_compare
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from administrate.services.webhook_ingress import (
    InvalidPayload,
    dispatch_inbox_task,
    persist_inbox_row,
)


@method_decorator(csrf_exempt, name='dispatch')
class AdministrateEventWebhookView(APIView):
    permission_classes = [AllowAny]  # auth handled inline

    def post(self, request, route_token, *args, **kwargs):
        expected = settings.ADMINISTRATE_WEBHOOK_ROUTE_TOKEN
        if not constant_time_compare(route_token, expected):
            return Response(status=404)

        secret = (request.data.get('configuration') or {}).get('secret', '')
        if not constant_time_compare(
            secret, settings.ADMINISTRATE_WEBHOOK_SECRET
        ):
            return Response(status=401)

        try:
            row = persist_inbox_row(request.data, dict(request.headers))
        except InvalidPayload as exc:
            return Response({'error': str(exc)}, status=400)
        except IntegrityError:
            return Response({'status': 'duplicate'}, status=200)

        dispatch_inbox_task(row.id)
        return Response(
            {'status': 'queued', 'inbox_id': row.id}, status=202
        )
```

### Response-code policy

| Code | When | Administrate retry behaviour |
|---|---|---|
| `202 Accepted` | Fresh delivery persisted and task enqueued | Success — no retry |
| `200 OK` | Duplicate (UNIQUE constraint hit) | Success — no retry |
| `400 Bad Request` | Malformed JSON, missing required keys | Will not retry (4xx) |
| `401 Unauthorized` | `configuration.secret` mismatch | Will not retry (4xx) |
| `404 Not Found` | `route_token` mismatch | Will not retry (4xx); avoids confirming the URL exists |
| `5xx` | DB outage, unhandled exception | Administrate retries — our safety net before persistence |

## Task layer

```python
# administrate/tasks.py
from django.tasks import task

from administrate.services.webhook_dispatch import apply_inbox_row


@task(
    queue_name='administrate_webhooks',
    max_retries=5,
    backoff='exponential',
)
def process_webhook_inbox(inbox_id: int) -> None:
    apply_inbox_row(inbox_id)
```

`apply_inbox_row` (in `administrate/services/webhook_dispatch.py`):

1. Loads the inbox row inside `SELECT ... FOR UPDATE`. If `status` is
   not in `('received', 'failed')`, short-circuits (idempotent against
   accidental re-enqueue; also blocks double-application if two workers
   pull the same task simultaneously).
2. Sets `status='processing'` and increments `attempts`.
3. Looks up the handler from `EVENT_HANDLERS` by `webhook_type_name`.
4. Wraps the handler call in a DB transaction.
5. On success: `status='applied'`, sets `applied_at`.
6. On exception:
   - If `attempts >= MAX_ATTEMPTS` (the `max_retries` constant, 5):
     `status='dead'`, write `error_message`, **swallow** the exception
     so Django Tasks marks the task succeeded and does not reschedule.
   - Otherwise: `status='failed'`, write `error_message`, **re-raise**
     so Django Tasks reschedules per its exponential backoff.

The attempt-count check inside the task body is the source of truth for
dead-letter status. We do not rely on a Django Tasks "final failure"
signal — that interface is framework-internal and the explicit count
check is testable in isolation.

Configuration in settings:

```python
# django_Admin3/settings/base.py
TASKS = {
    'default': {
        'BACKEND': 'django.tasks.backends.database.DatabaseBackend',
    },
}
INSTALLED_APPS += ['django.tasks', 'django.tasks.backends.database']
```

`db_worker` is run as a separate process in deployment:

```bash
python manage.py db_worker --queue-name administrate_webhooks
```

## Handler service

```python
# administrate/services/webhook_handlers.py
from administrate.models import Event

EVENT_HANDLERS: dict = {}


def register(webhook_type_name: str):
    def deco(fn):
        EVENT_HANDLERS[webhook_type_name] = fn
        return fn
    return deco


@register('Event Updated')
def handle_event_updated(payload_node: dict) -> Event:
    return _upsert_event(payload_node)


@register('Event Created')
def handle_event_created(payload_node: dict) -> Event:
    # tutorial_event FK stays null; staff link later.
    return _upsert_event(payload_node)


@register('Event Cancelled')
def handle_event_cancelled(payload_node: dict) -> Event:
    event = _upsert_event(payload_node)
    event.cancelled = True
    event.lifecycle_state = 'CANCELLED'
    event.save(
        update_fields=['cancelled', 'lifecycle_state', 'updated_at']
    )
    return event


def _upsert_event(node: dict) -> Event:
    """Idempotent overwrite by external_id. Webhook always wins."""
    external_id = node['id']
    defaults = _map_node_to_event_fields(node)
    event, _created = Event.objects.update_or_create(
        external_id=external_id, defaults=defaults,
    )
    return event


def _map_node_to_event_fields(node: dict) -> dict:
    """Pure function: GraphQL node -> Event field dict.

    Does NOT touch `tutorial_event` (cross-schema FK to
    tutorials.TutorialEvents). That field is managed by staff workflows.
    """
    # ... explicit mapping; raises KeyError on missing required fields
```

The mapper is intentionally a **pure function** (input dict → output
dict, no DB access). This is the cheapest unit-test surface in the
system and the layer most likely to break when Administrate adjusts
their schema.

## Registration management command

```python
# administrate/management/commands/administrate_webhooks.py
from django.core.management.base import BaseCommand

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
        'Register, list, or delete Administrate webhooks for Event '
        'entity. Idempotent: re-running register updates existing '
        'webhooks instead of duplicating.'
    )

    def add_arguments(self, parser):
        sub = parser.add_subparsers(dest='action', required=True)
        sub.add_parser('list')
        reg = sub.add_parser('register')
        reg.add_argument('--dry-run', action='store_true')
        sub.add_parser('delete-all')

    def handle(self, *args, action, **opts):
        api = AdministrateAPIService()
        if action == 'list':
            self._list(api)
        elif action == 'register':
            self._register(api, opts.get('dry_run', False))
        elif action == 'delete-all':
            self._delete_all(api)
```

The `register` action:

1. Queries Administrate's `webhookTypes` to resolve each `type_name` →
   `webhookTypeId`.
2. For each definition: queries existing webhooks by name. If found,
   calls `webhooks.update()` (idempotent). Otherwise calls
   `webhooks.create()`.
3. Submits these arguments for each registration:
   - `webhookTypeId`: from step 1.
   - `query`: `EVENT_WEBHOOK_QUERY`.
   - `url`: built from `settings.ADMINISTRATE_WEBHOOK_BASE_URL +
     '/api/administrate/webhooks/' + ADMINISTRATE_WEBHOOK_ROUTE_TOKEN +
     '/event/'`.
   - `config`: `{'secret': settings.ADMINISTRATE_WEBHOOK_SECRET}`.
   - `notificationEmails`: from
     `settings.ADMINISTRATE_WEBHOOK_NOTIFICATION_EMAILS`.
   - `name`: from the definition.
4. `--dry-run` prints the GraphQL mutations and their variables without
   sending them.

## Operational management command

```bash
# List dead rows
python manage.py administrate_webhooks_inbox list --status dead

# Inspect
python manage.py administrate_webhooks_inbox show <inbox_id>

# Replay a single row
python manage.py administrate_webhooks_inbox replay <inbox_id>

# Bulk replay dead rows received after a date
python manage.py administrate_webhooks_inbox replay --status dead --since 2026-05-10
```

`replay` flips `status` from `dead` (or `failed`) back to `received`,
clears `error_message`, resets `attempts` to 0, and enqueues a fresh
task. The original `raw_payload` is reused — no Administrate round-trip
required.

## Settings additions

```python
# django_Admin3/settings/base.py (or environment-specific files)
ADMINISTRATE_WEBHOOK_ROUTE_TOKEN = env('ADMINISTRATE_WEBHOOK_ROUTE_TOKEN')
ADMINISTRATE_WEBHOOK_SECRET = env('ADMINISTRATE_WEBHOOK_SECRET')
ADMINISTRATE_WEBHOOK_BASE_URL = env('ADMINISTRATE_WEBHOOK_BASE_URL')
ADMINISTRATE_WEBHOOK_NOTIFICATION_EMAILS = env.list(
    'ADMINISTRATE_WEBHOOK_NOTIFICATION_EMAILS', default=[],
)
```

Both `*_ROUTE_TOKEN` and `*_SECRET` are long random strings generated
out-of-band (e.g., `python -c "import secrets; print(secrets.token_urlsafe(48))"`)
and stored only in the `.env.*` files (never committed). Both can be
rotated by changing the env var and re-running
`administrate_webhooks register` to push the new values to Administrate.

## Observability

### Structured logging

Three log lines per delivery, correlated by `inbox_id`:

```python
logger.info("administrate.webhook.received", extra={
    "inbox_id": row.id,
    "type": row.webhook_type_name,
    "entity_id": row.entity_external_id,
    "duplicate": row.status == 'duplicate',
})
logger.info("administrate.webhook.task.start", extra={"inbox_id": inbox_id})
logger.info("administrate.webhook.task.applied", extra={
    "inbox_id": inbox_id, "attempts": row.attempts,
})
# On exception:
logger.error("administrate.webhook.task.failed", extra={
    "inbox_id": inbox_id, "attempt": row.attempts, "error": str(exc),
})
```

### Metrics

| Metric | Type | Labels | Purpose |
|---|---|---|---|
| `administrate_webhook_received_total` | counter | `type`, `outcome` (queued / duplicate / auth_failed / bad_request) | Edge-layer traffic mix |
| `administrate_webhook_applied_total` | counter | `type` | Successful handler runs |
| `administrate_webhook_failed_total` | counter | `type`, `attempt` | Retry pressure |
| `administrate_webhook_inbox_lag_seconds` | gauge | — | `max(now - received_at)` over rows with `status IN ('received', 'processing')`. **Primary alerting signal.** |

The lag gauge catches silent backpressure: if the worker dies but the
web tier keeps receiving, every per-request log line looks healthy
while rows pile up unapplied.

### Django admin

`WebhookInbox` registered with:

- `list_display = ('id', 'webhook_type_name', 'entity_external_id', 'status', 'received_at', 'applied_at')`
- `list_filter = ('status', 'webhook_type_name', 'entity_type')`
- `search_fields = ('entity_external_id', 'administrate_webhook_id')`
- `readonly_fields = (all fields except status)` — operators may
  manually flip `dead` → `received` to re-enqueue; nothing else editable.

## Testing strategy

Tests run against PostgreSQL per project convention. TDD per CLAUDE.md
(RED → GREEN → REFACTOR) with `tddStage` tracked in TodoWrite.

| Layer | Risk addressed | Example test |
|---|---|---|
| Pure-function unit (mapper) | Payload→model mapping drift | `test_map_node_to_event_fields_with_full_payload` using a captured Administrate payload fixture |
| Handler unit | Wrong side-effect per webhook type | `test_handle_event_cancelled_sets_cancelled_flag` |
| View tests (`APITestCase`) | Auth, dedup, response codes | `test_post_with_bad_route_token_returns_404`, `test_duplicate_delivery_returns_200_and_does_not_enqueue` |
| End-to-end task test | Inbox → task → handler wiring | `test_full_cycle_applies_event_update_via_pending_tasks` |

Fixtures live at
`administrate/tests/fixtures/webhooks/event_{updated,created,cancelled}.json`.
**Capture real payloads from the UAT Administrate instance** during a
test webhook delivery — the documentation does not show full payload
JSON, and invented shapes are likely to drift from reality.

Explicit non-coverage:

- HMAC verification — Administrate does not sign requests.
- Live registration GraphQL calls — `AdministrateAPIService` is patched.
- Cross-schema FK auto-linking — deferred per the design.
- Django Tasks internals — trusted as framework behaviour.

Coverage target: 80% on the new modules
(`administrate.views.webhooks`, `administrate.services.webhook_*`,
`administrate.tasks`, `administrate.management.commands.administrate_webhooks*`)
per project convention.

## Deployment notes

1. Run migrations: creates `adm.webhook_inbox`.
2. Configure environment variables in
   `.env.development`, `.env.uat`, `.env.production`:
   - `ADMINISTRATE_WEBHOOK_ROUTE_TOKEN`
   - `ADMINISTRATE_WEBHOOK_SECRET`
   - `ADMINISTRATE_WEBHOOK_BASE_URL` (public origin of the Django service)
   - `ADMINISTRATE_WEBHOOK_NOTIFICATION_EMAILS`
3. Start the Django Tasks worker process:
   `python manage.py db_worker --queue-name administrate_webhooks`.
   Add to whatever supervises the existing services (systemd /
   Procfile / container orchestrator).
4. Run the registration command **against UAT first**:
   `python manage.py administrate_webhooks register --dry-run`, inspect
   the mutations, then re-run without `--dry-run`.
5. Trigger a test webhook from Administrate's UAT instance (edit an
   Event, observe `WebhookInbox` row appear with `status='applied'`).
6. Repeat step 4 against production.

Rollback: `python manage.py administrate_webhooks delete-all` removes
the registrations on the Administrate side. The receiving endpoint
remains live but receives nothing. The inbox table can be left in place
or migrations reversed.

## Future slices (out of scope for this design)

- `Session` webhooks with the same pattern (likely shares mapper
  helpers).
- `CourseTemplate`, `PriceLevel`, `Venue`, `Location`, `Instructor` —
  one new handler + one new query template per entity.
- `Event Deleted` and `Event Published` handlers (decide hard-delete
  vs. tombstone semantics for Deleted).
- Auto-linking `tutorial_event` FK on Event Created, once we've
  observed enough live payloads to design a safe match rule.
- Migrating away from polling `sync_*` commands once webhook coverage
  is comprehensive enough to be the primary mechanism, leaving the
  polling commands as quarterly reconciliation jobs.
- Staff UI for managing webhook registrations (Django admin page or
  React admin page), if operator demand justifies it.
