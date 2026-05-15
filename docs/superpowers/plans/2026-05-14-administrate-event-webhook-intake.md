# Administrate Event Webhook Intake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the inbound webhook receiver for Administrate `Event` Created/Updated/Cancelled events so changes from Administrate are reflected automatically in `adm.events`, replacing exclusive reliance on polling `sync_*` commands.

**Architecture:** Three-tier slice — (1) a dumb HTTP edge that authenticates via URL route token + shared secret, persists each delivery to a new `adm.webhook_inbox` table, and enqueues a `django.tasks` job; (2) a worker that loads the inbox row inside a row-lock, dispatches to a per-`webhookTypeName` handler, retries with exponential backoff up to 5 attempts, and dead-letters on exhaustion; (3) management commands for idempotent webhook registration against Administrate's API and operator-driven replay of dead inbox rows. Missing local FK dependencies (course_template / location / instructor) fail loud → dead-letter → operator runs the relevant `sync_*` command and replays.

**Tech Stack:** Django 6.0, Django REST Framework, `django.tasks` (ImmediateBackend in slice 1 — see note below), PostgreSQL (`adm` schema), existing `AdministrateAPIService` GraphQL client.

> **Plan revision (2026-05-14, mid-execution):** Django 6.0.1 ships only the `immediate` and `dummy` backends for `django.tasks` — the `database` backend referenced in the original design does not yet exist (planned for a future Django release). Slice 1 uses `ImmediateBackend` in both production and test settings; handlers run synchronously inside the HTTP request. The `@task` decorator and `process_webhook_inbox.enqueue(...)` call sites are kept unchanged so that swapping to a real DB-backed queue (django-q2, future `django.tasks.backends.database`, etc.) becomes a one-line settings change. The view suppresses non-`InvalidPayload` exceptions from `dispatch_inbox_task(...)` so an in-request handler failure still returns HTTP 202 — the inbox row records the failure for operator replay.

**Spec:** [`docs/superpowers/specs/2026-05-14-administrate-event-webhook-intake-design.md`](../specs/2026-05-14-administrate-event-webhook-intake-design.md)

---

## File Map

**Create:**
- `backend/django_Admin3/administrate/models/webhook_inbox.py`
- `backend/django_Admin3/administrate/migrations/00XX_webhook_inbox.py` *(auto-generated)*
- `backend/django_Admin3/administrate/views/__init__.py` *(converts existing `views.py` to package)*
- `backend/django_Admin3/administrate/views/webhooks.py`
- `backend/django_Admin3/administrate/urls.py`
- `backend/django_Admin3/administrate/services/webhook_ingress.py`
- `backend/django_Admin3/administrate/services/webhook_handlers.py`
- `backend/django_Admin3/administrate/services/webhook_dispatch.py`
- `backend/django_Admin3/administrate/management/commands/administrate_webhooks.py`
- `backend/django_Admin3/administrate/management/commands/administrate_webhooks_inbox.py`
- `backend/django_Admin3/administrate/tests/fixtures/webhooks/event_updated.json`
- `backend/django_Admin3/administrate/tests/fixtures/webhooks/event_created.json`
- `backend/django_Admin3/administrate/tests/fixtures/webhooks/event_cancelled.json`
- `backend/django_Admin3/administrate/tests/test_webhook_inbox_model.py`
- `backend/django_Admin3/administrate/tests/test_webhook_view.py`
- `backend/django_Admin3/administrate/tests/services/__init__.py`
- `backend/django_Admin3/administrate/tests/services/test_webhook_mapper.py`
- `backend/django_Admin3/administrate/tests/services/test_webhook_handlers.py`
- `backend/django_Admin3/administrate/tests/services/test_webhook_dispatch.py`
- `backend/django_Admin3/administrate/tests/tasks/__init__.py`
- `backend/django_Admin3/administrate/tests/tasks/test_process_webhook_inbox.py`
- `backend/django_Admin3/administrate/tests/test_webhook_end_to_end.py`
- `backend/django_Admin3/administrate/tests/management/test_administrate_webhooks_cmd.py`
- `backend/django_Admin3/administrate/tests/management/test_administrate_webhooks_inbox_cmd.py`

**Modify:**
- `backend/django_Admin3/administrate/models/__init__.py` — export `WebhookInbox`
- `backend/django_Admin3/administrate/tasks.py` — add `process_webhook_inbox` task definition
- `backend/django_Admin3/administrate/admin.py` — register `WebhookInbox`
- `backend/django_Admin3/administrate/views.py` — **delete** (replaced by `views/` package)
- `backend/django_Admin3/django_Admin3/urls.py:50` — add `path('api/administrate/', include('administrate.urls'))`
- `backend/django_Admin3/django_Admin3/settings/base.py` — `INSTALLED_APPS`, `TASKS`, `ADMINISTRATE_WEBHOOK_*`
- `backend/django_Admin3/django_Admin3/settings/test.py` — `TASKS` immediate backend, webhook test secrets
- `backend/django_Admin3/django_Admin3/settings/development.py` — local webhook env loading
- `backend/django_Admin3/requirements.txt` — add `django-tasks` if not already vendored

---

## Branch

```bash
git checkout -b feat/20260514-administrate-event-webhook-intake
```

---

## Task 1: Foundation — settings, `django.tasks`, webhook secrets

**Files:**
- Modify: `backend/django_Admin3/django_Admin3/settings/base.py`
- Modify: `backend/django_Admin3/django_Admin3/settings/test.py`
- Modify: `backend/django_Admin3/django_Admin3/settings/development.py`
- Modify: `backend/django_Admin3/requirements.txt` *(only if `django-tasks` is missing)*

- [ ] **Step 1: Confirm `django.tasks` is importable**

Run: `cd backend/django_Admin3 && python -c "from django.tasks import task; from django.tasks.backends.immediate import ImmediateBackend; print('ok')"`
Expected: `ok`

`django.tasks` ships with Django 6.0 core. **Only the `immediate` and `dummy` backends are available in Django 6.0.1** — the `database` backend the original design referenced is on the DEP-0014 roadmap but not yet released. This slice uses `ImmediateBackend` in both prod and test (see "Plan revision" note in the header). No pip install needed.

- [ ] **Step 2: Add app + backend to `INSTALLED_APPS` and configure `TASKS` in `settings/base.py`**

Locate the existing `INSTALLED_APPS` list and append:

```python
# In INSTALLED_APPS, after the other Django/third-party entries
INSTALLED_APPS += [
    'django.tasks',
]

# Anywhere near the bottom of base.py, alongside other service settings.
# NOTE: ImmediateBackend runs tasks synchronously in-process. When a real
# DB-backed backend ships (django.tasks.backends.database, or we adopt
# django-q2), change BACKEND below and add a worker process to deployment.
TASKS = {
    'default': {
        'BACKEND': 'django.tasks.backends.immediate.ImmediateBackend',
    },
}

# Administrate webhook settings — never commit real values, only read from env
ADMINISTRATE_WEBHOOK_ROUTE_TOKEN = env('ADMINISTRATE_WEBHOOK_ROUTE_TOKEN', default='')
ADMINISTRATE_WEBHOOK_SECRET = env('ADMINISTRATE_WEBHOOK_SECRET', default='')
ADMINISTRATE_WEBHOOK_BASE_URL = env('ADMINISTRATE_WEBHOOK_BASE_URL', default='')
ADMINISTRATE_WEBHOOK_NOTIFICATION_EMAILS = env.list(
    'ADMINISTRATE_WEBHOOK_NOTIFICATION_EMAILS', default=[]
)
```

- [ ] **Step 3: Configure immediate backend in test settings**

Append to `backend/django_Admin3/django_Admin3/settings/test.py`:

```python
# Force synchronous task execution in tests so end-to-end webhook tests
# observe handler side effects without a worker process.
TASKS = {
    'default': {
        'BACKEND': 'django.tasks.backends.immediate.ImmediateBackend',
    },
}

ADMINISTRATE_WEBHOOK_ROUTE_TOKEN = 'test-route-token'
ADMINISTRATE_WEBHOOK_SECRET = 'test-shared-secret'
ADMINISTRATE_WEBHOOK_BASE_URL = 'http://testserver'
ADMINISTRATE_WEBHOOK_NOTIFICATION_EMAILS = ['ops@example.test']
```

- [ ] **Step 4: Document `.env` keys in `development.py`**

Append the four `env(...)` lines (same shape as `base.py`) to `settings/development.py` if the project pattern is to redeclare per-environment, and add to `backend/django_Admin3/.env.development.example`:

```
ADMINISTRATE_WEBHOOK_ROUTE_TOKEN=
ADMINISTRATE_WEBHOOK_SECRET=
ADMINISTRATE_WEBHOOK_BASE_URL=http://127.0.0.1:8888
ADMINISTRATE_WEBHOOK_NOTIFICATION_EMAILS=
```

(If `.env.development.example` doesn't exist in this repo, skip — the canonical settings docs in CLAUDE.md handle env discovery.)

- [ ] **Step 5: Verify Django still loads**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python manage.py check`
Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/django_Admin3/settings/ backend/django_Admin3/requirements.txt
git commit -m "feat(administrate): wire django.tasks backend and webhook env settings"
```

---

## Task 2: `WebhookInbox` model + migration

**Files:**
- Create: `backend/django_Admin3/administrate/models/webhook_inbox.py`
- Create: `backend/django_Admin3/administrate/tests/test_webhook_inbox_model.py`
- Modify: `backend/django_Admin3/administrate/models/__init__.py`
- Create: `backend/django_Admin3/administrate/migrations/00XX_webhook_inbox.py` *(via `makemigrations`)*

- [ ] **Step 1: Write the failing model test**

Create `backend/django_Admin3/administrate/tests/test_webhook_inbox_model.py`:

```python
from datetime import datetime, timezone

import pytest
from django.db import IntegrityError

from administrate.models import WebhookInbox


@pytest.mark.django_db
class TestWebhookInbox:
    def _kwargs(self, **overrides):
        defaults = dict(
            administrate_webhook_id='wh_123',
            administrate_event_timestamp=datetime(
                2026, 5, 14, 12, 0, tzinfo=timezone.utc
            ),
            webhook_type_name='Event Updated',
            entity_type='event',
            entity_external_id='evt_42',
            raw_payload={'foo': 'bar'},
            raw_headers={'X-Test': '1'},
        )
        defaults.update(overrides)
        return defaults

    def test_defaults(self):
        row = WebhookInbox.objects.create(**self._kwargs())
        assert row.status == WebhookInbox.STATUS_RECEIVED
        assert row.attempts == 0
        assert row.applied_at is None
        assert row.error_message == ''
        assert row.task_id == ''
        assert row.received_at is not None

    def test_unique_delivery_constraint(self):
        WebhookInbox.objects.create(**self._kwargs())
        with pytest.raises(IntegrityError):
            WebhookInbox.objects.create(**self._kwargs())

    def test_distinct_timestamp_allowed(self):
        WebhookInbox.objects.create(**self._kwargs())
        WebhookInbox.objects.create(
            **self._kwargs(
                administrate_event_timestamp=datetime(
                    2026, 5, 14, 12, 0, 1, tzinfo=timezone.utc
                ),
            )
        )
        assert WebhookInbox.objects.count() == 2

    def test_status_choices_complete(self):
        choices = {c[0] for c in WebhookInbox.STATUS_CHOICES}
        assert choices == {
            'received', 'processing', 'applied',
            'duplicate', 'failed', 'dead',
        }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/test_webhook_inbox_model.py -v`
Expected: FAIL with `ImportError: cannot import name 'WebhookInbox'`

- [ ] **Step 3: Create the model**

Create `backend/django_Admin3/administrate/models/webhook_inbox.py`:

```python
from django.db import models


class WebhookInbox(models.Model):
    """Durable receipt log for inbound Administrate webhook deliveries.

    One row per Administrate-side delivery, deduped by (webhook_id,
    entity_external_id, event_timestamp). Lifecycle:

        received -> processing -> applied
                 \\-> duplicate
                  \\-> failed -> processing (retry) -> applied
                              \\-> dead (manual replay required)
    """

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
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_RECEIVED,
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

    def __str__(self):
        return (
            f'<WebhookInbox #{self.pk} {self.webhook_type_name} '
            f'{self.entity_external_id} {self.status}>'
        )
```

- [ ] **Step 4: Wire export in `administrate/models/__init__.py`**

Read the file, then append (or insert alongside the other model exports):

```python
from .webhook_inbox import WebhookInbox  # noqa: F401
```

If the file uses an explicit `__all__`, append `'WebhookInbox'` to it.

- [ ] **Step 5: Generate migration**

Run: `cd backend/django_Admin3 && python manage.py makemigrations administrate`
Expected: `Migrations for 'administrate': administrate/migrations/00XX_webhookinbox.py - Create model WebhookInbox`

- [ ] **Step 6: Run model tests**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/test_webhook_inbox_model.py -v`
Expected: 4 passed.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/administrate/models/ backend/django_Admin3/administrate/migrations/ backend/django_Admin3/administrate/tests/test_webhook_inbox_model.py
git commit -m "feat(administrate): WebhookInbox model with dedup constraint"
```

---

## Task 3: HTTP edge skeleton — `views/` package, urls.py, auth-only view

**Files:**
- Delete: `backend/django_Admin3/administrate/views.py`
- Create: `backend/django_Admin3/administrate/views/__init__.py`
- Create: `backend/django_Admin3/administrate/views/webhooks.py`
- Create: `backend/django_Admin3/administrate/urls.py`
- Modify: `backend/django_Admin3/django_Admin3/urls.py`
- Create: `backend/django_Admin3/administrate/tests/test_webhook_view.py`

- [ ] **Step 1: Write the failing auth tests**

Create `backend/django_Admin3/administrate/tests/test_webhook_view.py`:

```python
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/test_webhook_view.py -v`
Expected: FAIL with `NoReverseMatch: Reverse for 'administrate-event-webhook' not found`.

- [ ] **Step 3: Convert `views.py` to `views/` package**

Delete `backend/django_Admin3/administrate/views.py` (the boilerplate stub) and create `backend/django_Admin3/administrate/views/__init__.py`:

```python
# Re-export view classes for `from administrate.views import X` callers.
from administrate.views.webhooks import AdministrateEventWebhookView  # noqa: F401
```

- [ ] **Step 4: Create the view with auth-only behaviour**

Create `backend/django_Admin3/administrate/views/webhooks.py`:

```python
from django.conf import settings
from django.utils.crypto import constant_time_compare
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


@method_decorator(csrf_exempt, name='dispatch')
class AdministrateEventWebhookView(APIView):
    """Receives Administrate `Event` Created/Updated/Cancelled webhooks.

    Authentication is two-layered:
      1. The path-segment `route_token` must match
         settings.ADMINISTRATE_WEBHOOK_ROUTE_TOKEN (404 on mismatch — we
         deliberately do not confirm the URL exists).
      2. The JSON body's `configuration.secret` must match
         settings.ADMINISTRATE_WEBHOOK_SECRET (401 on mismatch).

    Both comparisons are constant-time.
    """

    permission_classes = [AllowAny]

    def post(self, request, route_token, *args, **kwargs):
        expected_token = settings.ADMINISTRATE_WEBHOOK_ROUTE_TOKEN
        if not constant_time_compare(route_token, expected_token):
            return Response(status=404)

        config = request.data.get('configuration') or {}
        secret = config.get('secret', '') if isinstance(config, dict) else ''
        if not constant_time_compare(secret, settings.ADMINISTRATE_WEBHOOK_SECRET):
            return Response(status=401)

        # Persistence + dispatch land in Task 4.
        return Response({'status': 'queued'}, status=202)
```

- [ ] **Step 5: Create `administrate/urls.py`**

```python
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

- [ ] **Step 6: Wire root urls.py**

Modify `backend/django_Admin3/django_Admin3/urls.py`. Read the file, then add this line inside `urlpatterns` (after the existing `path('api/store/', ...)` line is a good location):

```python
    path('api/administrate/', include('administrate.urls')),
```

- [ ] **Step 7: Run auth tests**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/test_webhook_view.py -v`
Expected: 3 passed.

- [ ] **Step 8: Commit**

```bash
git add backend/django_Admin3/administrate/views/ backend/django_Admin3/administrate/views.py backend/django_Admin3/administrate/urls.py backend/django_Admin3/django_Admin3/urls.py backend/django_Admin3/administrate/tests/test_webhook_view.py
git commit -m "feat(administrate): webhook endpoint skeleton with route-token + secret auth"
```

---

## Task 4: HTTP edge — persistence, dedup, malformed-payload handling

**Files:**
- Create: `backend/django_Admin3/administrate/services/webhook_ingress.py`
- Modify: `backend/django_Admin3/administrate/views/webhooks.py`
- Modify: `backend/django_Admin3/administrate/tests/test_webhook_view.py`

- [ ] **Step 1: Extend the view tests for persist + dedup + malformed**

Append to `backend/django_Admin3/administrate/tests/test_webhook_view.py`:

```python
from administrate.models import WebhookInbox


@pytest.mark.django_db
class TestWebhookPersistence:
    URL = '/api/administrate/webhooks/test-route-token/event/'

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
        assert row.status == WebhookInbox.STATUS_RECEIVED
        assert row.raw_payload == valid_payload

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
```

- [ ] **Step 2: Run tests to confirm failure**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/test_webhook_view.py::TestWebhookPersistence -v`
Expected: 4 failures (no row persisted, 202 returned with no inbox_id, no 400 paths).

- [ ] **Step 3: Build the ingress service**

Create `backend/django_Admin3/administrate/services/webhook_ingress.py`:

```python
"""Pure-ish helpers the HTTP edge uses to persist + enqueue webhook deliveries.

Kept separate from the view so the persistence + parsing logic is unit-testable
without a request/response cycle, and so the same persist function can be
called from operational replay paths in the future.
"""

from typing import Any

from django.utils.dateparse import parse_datetime

from administrate.models import WebhookInbox


REQUIRED_METADATA_KEYS = (
    'webhookId',
    'webhookTypeName',
    'eventTimestamp',
    'entityId',
)


class InvalidPayload(Exception):
    """Raised when the incoming webhook body cannot be parsed into an inbox row."""


def persist_inbox_row(body: dict, headers: dict) -> WebhookInbox:
    """Persist the raw delivery to `adm.webhook_inbox`.

    Raises:
        InvalidPayload: if `metadata` is missing or required keys absent.
        django.db.IntegrityError: if a row with the same
            (webhookId, entityId, eventTimestamp) already exists — the
            caller (the view) translates this into HTTP 200 duplicate.
    """
    metadata = body.get('metadata')
    if not isinstance(metadata, dict):
        raise InvalidPayload('metadata missing or not an object')

    missing = [k for k in REQUIRED_METADATA_KEYS if not metadata.get(k)]
    if missing:
        raise InvalidPayload(f'metadata missing keys: {", ".join(missing)}')

    timestamp = parse_datetime(metadata['eventTimestamp'])
    if timestamp is None:
        raise InvalidPayload('metadata.eventTimestamp is not a valid ISO-8601 datetime')

    return WebhookInbox.objects.create(
        administrate_webhook_id=metadata['webhookId'],
        administrate_event_timestamp=timestamp,
        webhook_type_name=metadata['webhookTypeName'],
        entity_type='event',  # this slice is Event-only; future slices set per route
        entity_external_id=str(metadata['entityId']),
        raw_payload=body,
        raw_headers=_sanitize_headers(headers),
    )


def dispatch_inbox_task(inbox_id: int) -> Any:
    """Enqueue the worker task for an inbox row. Returned object is the task
    handle; tests with the immediate backend get a completed handle synchronously.
    """
    # Imported lazily to avoid a circular import at app startup
    # (tasks.py -> webhook_dispatch -> models -> ...).
    from administrate.tasks import process_webhook_inbox

    return process_webhook_inbox.enqueue(inbox_id)


def _sanitize_headers(headers: dict) -> dict:
    """Drop hop-by-hop headers and anything that could leak credentials.

    We persist headers for debugging; we don't want Authorization or Cookie
    sitting in the audit log.
    """
    DENYLIST = {
        'authorization', 'cookie', 'set-cookie', 'proxy-authorization',
    }
    return {
        k: v for k, v in headers.items()
        if k.lower() not in DENYLIST
    }
```

- [ ] **Step 4: Wire view to ingress + dedup**

Replace the body of `post` in `backend/django_Admin3/administrate/views/webhooks.py` with:

```python
from django.db import IntegrityError

from administrate.services.webhook_ingress import (
    InvalidPayload,
    dispatch_inbox_task,
    persist_inbox_row,
)


@method_decorator(csrf_exempt, name='dispatch')
class AdministrateEventWebhookView(APIView):
    """Receives Administrate `Event` Created/Updated/Cancelled webhooks."""

    permission_classes = [AllowAny]

    def post(self, request, route_token, *args, **kwargs):
        expected_token = settings.ADMINISTRATE_WEBHOOK_ROUTE_TOKEN
        if not constant_time_compare(route_token, expected_token):
            return Response(status=404)

        config = request.data.get('configuration') or {}
        secret = config.get('secret', '') if isinstance(config, dict) else ''
        if not constant_time_compare(secret, settings.ADMINISTRATE_WEBHOOK_SECRET):
            return Response(status=401)

        try:
            row = persist_inbox_row(request.data, dict(request.headers))
        except InvalidPayload as exc:
            return Response({'error': str(exc)}, status=400)
        except IntegrityError:
            return Response({'status': 'duplicate'}, status=200)

        # Under ImmediateBackend (slice 1), this call runs the handler
        # synchronously in-request and may raise. The inbox row is already
        # persisted with its outcome (failed/dead), so we MUST suppress
        # exceptions here — otherwise a handler bug returns HTTP 500 to
        # Administrate, which retries the webhook, which we then dedup
        # (200), which masks the failure. Logging stays as the operator
        # signal; replay is via the inbox CLI command.
        try:
            dispatch_inbox_task(row.id)
        except Exception:  # noqa: BLE001 — see comment above
            logger.exception(
                'administrate.webhook.dispatch_failed',
                extra={'inbox_id': row.id},
            )

        return Response({'status': 'queued', 'inbox_id': row.id}, status=202)
```

Make sure all imports referenced above (`IntegrityError`, `persist_inbox_row`, `logger = logging.getLogger('administrate.webhook')`, etc.) are at the top of the file alongside the existing ones; don't leave the inline `from ... import ...` snippet from the snippet.

- [ ] **Step 5: Add temporary stub for `process_webhook_inbox`**

The view's `dispatch_inbox_task` import will fail because `administrate/tasks.py` is empty. Replace `backend/django_Admin3/administrate/tasks.py` with a stub the persistence tests can satisfy — the real implementation lands in Task 7:

```python
from django.tasks import task


@task(queue_name='administrate_webhooks', max_retries=5, backoff='exponential')
def process_webhook_inbox(inbox_id: int) -> None:
    """Stub — real implementation lands in Task 7."""
    # No-op so the view's enqueue call succeeds during Task 4 tests.
    return None
```

- [ ] **Step 6: Run view tests**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/test_webhook_view.py -v`
Expected: 7 passed (3 auth + 4 persistence).

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/administrate/views/webhooks.py backend/django_Admin3/administrate/services/webhook_ingress.py backend/django_Admin3/administrate/tasks.py backend/django_Admin3/administrate/tests/test_webhook_view.py
git commit -m "feat(administrate): persist webhook deliveries to inbox with dedup"
```

---

## Task 5: Payload mapper — pure function `node` → `Event` field dict

> **⚠️ Decision point baked in:** Missing local FK (course_template / location / instructor with no matching `external_id`) raises `MissingDependencyError`, which the task layer (Task 7) treats as a normal failure → retries → dead-letters. Operator runs the relevant `sync_*` command and replays. Per design decision discussed during planning.

**Files:**
- Modify: `backend/django_Admin3/administrate/services/webhook_handlers.py` *(create)*
- Modify: `backend/django_Admin3/administrate/exceptions.py` *(add `MissingDependencyError`)*
- Create: `backend/django_Admin3/administrate/tests/fixtures/webhooks/event_updated.json`
- Create: `backend/django_Admin3/administrate/tests/services/__init__.py`
- Create: `backend/django_Admin3/administrate/tests/services/test_webhook_mapper.py`

- [ ] **Step 1: Add the typed exception**

Read `backend/django_Admin3/administrate/exceptions.py`. Append:

```python
class MissingDependencyError(Exception):
    """Raised by webhook handlers when a referenced FK target (course_template,
    location, instructor, venue) has no local row with the given external_id.

    The task layer logs this, marks the inbox row failed/dead, and surfaces
    it to the operator who runs the relevant `sync_*` management command and
    replays via `administrate_webhooks_inbox replay`.
    """

    def __init__(self, model_name: str, external_id: str):
        self.model_name = model_name
        self.external_id = external_id
        super().__init__(
            f'No local {model_name} with external_id={external_id!r}; '
            f'run the corresponding sync_* command and replay'
        )
```

If `exceptions.py` does not exist yet, create it with just this class.

- [ ] **Step 2: Create a starter fixture**

Create `backend/django_Admin3/administrate/tests/fixtures/webhooks/event_updated.json`:

```json
{
  "metadata": {
    "webhookId": "wh_test_updated_1",
    "webhookTypeName": "Event Updated",
    "eventTimestamp": "2026-05-14T12:00:00Z",
    "entityId": "evt_external_42"
  },
  "payload": {
    "event": {
      "id": "evt_external_42",
      "title": "CB1 Tutorial — September 2026",
      "lifecycleState": "PUBLISHED",
      "cancelled": false,
      "soldOut": false,
      "webSale": true,
      "learningMode": "CLASSROOM",
      "maxPlaces": 30,
      "minPlaces": 5,
      "location": {"id": "loc_external_1"},
      "venue": {"id": "ven_external_1"},
      "primaryInstructor": {"id": "ins_external_1"},
      "courseTemplate": {"id": "ct_external_1"},
      "eventUrl": "https://example.com/event/42",
      "virtualClassroom": "",
      "timezone": "Europe/London",
      "lmsStartDate": "2026-09-01T09:00:00Z",
      "lmsEndDate": "2026-12-01T17:00:00Z",
      "registrationDeadline": "2026-08-25T23:59:59Z",
      "updatedAt": "2026-05-14T12:00:00Z"
    }
  },
  "configuration": {"secret": "test-shared-secret"}
}
```

> **Capture-from-UAT TODO:** This is a synthetic shape that matches `EVENT_WEBHOOK_QUERY` in the spec. Before merging, capture a real Administrate UAT payload (trigger an Event Update on a test event) and replace this file. Track in the merge checklist below.

- [ ] **Step 3: Write the failing mapper test**

Create `backend/django_Admin3/administrate/tests/services/__init__.py` (empty).

Create `backend/django_Admin3/administrate/tests/services/test_webhook_mapper.py`:

```python
import json
from pathlib import Path

import pytest

from administrate.exceptions import MissingDependencyError
from administrate.models import (
    CourseTemplate,
    Instructor,
    Location,
    Venue,
)
from administrate.services.webhook_handlers import map_node_to_event_fields


FIXTURES = Path(__file__).resolve().parent.parent / 'fixtures' / 'webhooks'


def _load(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())['payload']['event']


@pytest.fixture
def seed_dependencies(db):
    """The mapper resolves FK external_ids -> local PKs. Seed all four."""
    location = Location.objects.create(external_id='loc_external_1', name='London')
    venue = Venue.objects.create(
        external_id='ven_external_1', name='Holborn', location=location,
    )
    instructor = Instructor.objects.create(
        external_id='ins_external_1', name='Test Instructor',
    )
    course_template = CourseTemplate.objects.create(
        external_id='ct_external_1', title='CB1',
    )
    return {
        'location': location, 'venue': venue,
        'instructor': instructor, 'course_template': course_template,
    }


@pytest.mark.django_db
class TestMapper:
    def test_maps_full_payload(self, seed_dependencies):
        node = _load('event_updated.json')
        fields = map_node_to_event_fields(node)

        assert fields['external_id'] == 'evt_external_42'
        assert fields['title'] == 'CB1 Tutorial — September 2026'
        assert fields['lifecycle_state'] == 'PUBLISHED'
        assert fields['cancelled'] is False
        assert fields['sold_out'] is False
        assert fields['web_sale'] is True
        assert fields['learning_mode'] == 'CLASSROOM'
        assert fields['max_places'] == 30
        assert fields['min_places'] == 5
        assert fields['location'] == seed_dependencies['location']
        assert fields['venue'] == seed_dependencies['venue']
        assert fields['primary_instructor'] == seed_dependencies['instructor']
        assert fields['course_template'] == seed_dependencies['course_template']
        assert fields['event_url'] == 'https://example.com/event/42'
        assert fields['timezone'] == 'Europe/London'
        # Note: `tutorial_event` (cross-schema FK to tutorials.TutorialEvents)
        # MUST NOT appear in the field dict — staff link manually.
        assert 'tutorial_event' not in fields

    def test_missing_required_root_key_raises_keyerror(self, seed_dependencies):
        node = _load('event_updated.json')
        del node['id']
        with pytest.raises(KeyError):
            map_node_to_event_fields(node)

    def test_unknown_course_template_raises_missing_dependency(self, seed_dependencies):
        node = _load('event_updated.json')
        node['courseTemplate']['id'] = 'ct_does_not_exist'
        with pytest.raises(MissingDependencyError) as exc:
            map_node_to_event_fields(node)
        assert exc.value.model_name == 'CourseTemplate'
        assert exc.value.external_id == 'ct_does_not_exist'

    def test_nullable_venue_allowed(self, seed_dependencies):
        node = _load('event_updated.json')
        node['venue'] = None
        fields = map_node_to_event_fields(node)
        assert fields['venue'] is None
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/services/test_webhook_mapper.py -v`
Expected: 4 failures (ImportError on `map_node_to_event_fields`).

- [ ] **Step 5: Implement the mapper + helper**

Create `backend/django_Admin3/administrate/services/webhook_handlers.py`:

```python
"""Webhook handler registry + payload mapper for Administrate `Event`.

The mapper is a deliberately pure function: GraphQL `node` dict in,
`Event` field dict out. This is the layer most likely to break when
Administrate's schema drifts, so we keep it free of DB writes and
isolate FK lookups behind explicit `_resolve_*` helpers that raise
`MissingDependencyError` (a typed exception the task layer treats as a
dead-letter signal).
"""

from typing import Callable, Dict

from administrate.exceptions import MissingDependencyError
from administrate.models import (
    CourseTemplate,
    Event,
    Instructor,
    Location,
    Venue,
)


EVENT_HANDLERS: Dict[str, Callable[[dict], Event]] = {}


def register(webhook_type_name: str):
    """Decorator that registers a handler for an Administrate webhook type."""

    def deco(fn: Callable[[dict], Event]) -> Callable[[dict], Event]:
        EVENT_HANDLERS[webhook_type_name] = fn
        return fn

    return deco


def map_node_to_event_fields(node: dict) -> dict:
    """Translate a GraphQL `event` node into a kwargs dict for `Event.objects`.

    Required root keys (raise `KeyError` if absent): `id`, `title`,
    `lifecycleState`, `learningMode`, `courseTemplate`, `location`,
    `primaryInstructor`.

    FK fields are resolved to local model instances. Unknown external_ids
    raise `MissingDependencyError` — the caller treats this as a
    dead-letter condition (operator runs sync_* + replay).

    `tutorial_event` is deliberately NOT included: that cross-schema FK
    is managed by staff workflows, not by Administrate.
    """
    return {
        'external_id': node['id'],
        'title': node['title'],
        'lifecycle_state': node['lifecycleState'],
        'learning_mode': node['learningMode'],
        'cancelled': bool(node.get('cancelled', False)),
        'sold_out': bool(node.get('soldOut', False)),
        'web_sale': bool(node.get('webSale', True)),
        'max_places': int(node.get('maxPlaces') or 0),
        'min_places': int(node.get('minPlaces') or 0),
        'event_url': node.get('eventUrl') or '',
        'virtual_classroom': node.get('virtualClassroom') or '',
        'timezone': node.get('timezone') or 'Europe/London',
        'lms_start_date': node.get('lmsStartDate') or None,
        'lms_end_date': node.get('lmsEndDate') or None,
        'registration_deadline': node.get('registrationDeadline') or None,
        'course_template': _resolve_fk(
            CourseTemplate, node['courseTemplate']['id']
        ),
        'location': _resolve_fk(Location, node['location']['id']),
        'venue': (
            _resolve_fk(Venue, node['venue']['id'])
            if node.get('venue') else None
        ),
        'primary_instructor': _resolve_fk(
            Instructor, node['primaryInstructor']['id']
        ),
    }


def _resolve_fk(model_cls, external_id: str):
    """Look up a local row by external_id, or raise MissingDependencyError."""
    try:
        return model_cls.objects.get(external_id=external_id)
    except model_cls.DoesNotExist:
        raise MissingDependencyError(model_cls.__name__, external_id)
```

> **⚠️ Schema-drift warning:** The fixture in step 2 is synthetic. Before
> merging, capture a real UAT payload and adjust any keys (e.g. Administrate
> may return `learningMode` as `'classroom'` lower-case, in which case the
> mapper needs `.upper()` here, or the `Event.LEARNING_MODE_CHOICES` value
> set needs reviewing). Confirm via:
>
> ```bash
> python manage.py administrate_webhooks register --dry-run  # Task 9
> # Then trigger a test webhook from UAT and inspect the captured row.
> ```

- [ ] **Step 6: Run mapper tests**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/services/test_webhook_mapper.py -v`
Expected: 4 passed.

If `Location.objects.create(...)` errors because the test fixtures don't match the real `Location` model signature, adjust the `seed_dependencies` fixture in the test — read `administrate/models/locations.py`, `venues.py`, `instructors.py`, `course_templates.py` for required fields.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/administrate/exceptions.py backend/django_Admin3/administrate/services/webhook_handlers.py backend/django_Admin3/administrate/tests/services/ backend/django_Admin3/administrate/tests/fixtures/
git commit -m "feat(administrate): pure-function payload mapper with FK resolution"
```

---

## Task 6: Per-type handlers — Created, Updated, Cancelled

**Files:**
- Modify: `backend/django_Admin3/administrate/services/webhook_handlers.py`
- Create: `backend/django_Admin3/administrate/tests/services/test_webhook_handlers.py`
- Create: `backend/django_Admin3/administrate/tests/fixtures/webhooks/event_created.json`
- Create: `backend/django_Admin3/administrate/tests/fixtures/webhooks/event_cancelled.json`

- [ ] **Step 1: Create the two additional fixtures**

`event_created.json` — identical structure to `event_updated.json` but with `webhookTypeName: "Event Created"`, `webhookId: "wh_test_created_1"`, `entityId: "evt_external_43"`, and `event.id: "evt_external_43"`. Reuse the same FK external_ids so a single `seed_dependencies` fixture covers all three tests.

`event_cancelled.json` — same idea: `webhookTypeName: "Event Cancelled"`, `webhookId: "wh_test_cancelled_1"`, `entityId: "evt_external_42"` (same event being cancelled), and `event.cancelled: true`, `event.lifecycleState: "CANCELLED"`.

- [ ] **Step 2: Write the failing handler tests**

Create `backend/django_Admin3/administrate/tests/services/test_webhook_handlers.py`:

```python
import json
from pathlib import Path

import pytest

from administrate.models import (
    CourseTemplate,
    Event,
    Instructor,
    Location,
    Venue,
)
from administrate.services.webhook_handlers import (
    EVENT_HANDLERS,
    handle_event_cancelled,
    handle_event_created,
    handle_event_updated,
)


FIXTURES = Path(__file__).resolve().parent.parent / 'fixtures' / 'webhooks'


def _load_event(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())['payload']['event']


@pytest.fixture
def deps(db):
    location = Location.objects.create(external_id='loc_external_1', name='London')
    venue = Venue.objects.create(
        external_id='ven_external_1', name='Holborn', location=location,
    )
    instructor = Instructor.objects.create(
        external_id='ins_external_1', name='Test Instructor',
    )
    course_template = CourseTemplate.objects.create(
        external_id='ct_external_1', title='CB1',
    )
    return locals()


@pytest.mark.django_db
class TestHandlers:
    def test_registry_has_three_handlers(self):
        assert set(EVENT_HANDLERS.keys()) == {
            'Event Created', 'Event Updated', 'Event Cancelled',
        }

    def test_event_created_inserts(self, deps):
        node = _load_event('event_created.json')
        event = handle_event_created(node)

        assert event.pk is not None
        assert event.external_id == 'evt_external_43'
        assert event.tutorial_event is None
        assert Event.objects.filter(external_id='evt_external_43').count() == 1

    def test_event_updated_overwrites(self, deps):
        # First call creates
        node = _load_event('event_updated.json')
        handle_event_updated(node)
        # Mutate and re-apply
        node['title'] = 'CB1 Tutorial — RENAMED'
        handle_event_updated(node)

        event = Event.objects.get(external_id='evt_external_42')
        assert event.title == 'CB1 Tutorial — RENAMED'
        assert Event.objects.filter(external_id='evt_external_42').count() == 1

    def test_event_cancelled_sets_flag_and_state(self, deps):
        # Seed an active event first
        handle_event_updated(_load_event('event_updated.json'))
        # Cancel it
        cancelled_node = _load_event('event_cancelled.json')
        handle_event_cancelled(cancelled_node)

        event = Event.objects.get(external_id='evt_external_42')
        assert event.cancelled is True
        assert event.lifecycle_state == 'CANCELLED'

    def test_handler_does_not_touch_tutorial_event(self, deps):
        # Seed an event with a linked tutorial_event...
        from tutorials.models import TutorialEvents
        tutorial_event = TutorialEvents.objects.create(
            # minimal kwargs — adjust to model's required fields
        )
        Event.objects.create(
            external_id='evt_external_42',
            title='Seed',
            learning_mode='CLASSROOM',
            lifecycle_state='PUBLISHED',
            course_template=deps['course_template'],
            location=deps['location'],
            primary_instructor=deps['instructor'],
            tutorial_event=tutorial_event,
        )

        # ...then apply an update. The FK must survive.
        handle_event_updated(_load_event('event_updated.json'))

        event = Event.objects.get(external_id='evt_external_42')
        assert event.tutorial_event == tutorial_event
```

> If `TutorialEvents.objects.create()` requires fields that are tedious to fake, use `mixer` or a factory — or replace this test with a mock that asserts `update_or_create` was called without `tutorial_event` in `defaults`.

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/services/test_webhook_handlers.py -v`
Expected: 5 failures (handlers not defined).

- [ ] **Step 4: Add the three handlers + upsert helper**

Append to `backend/django_Admin3/administrate/services/webhook_handlers.py`:

```python
@register('Event Updated')
def handle_event_updated(payload_node: dict) -> Event:
    return _upsert_event(payload_node)


@register('Event Created')
def handle_event_created(payload_node: dict) -> Event:
    # `tutorial_event` FK stays null; staff link later. _upsert_event uses
    # update_or_create with `defaults=` (which intentionally excludes
    # tutorial_event from the mapper), so existing FKs are preserved on update
    # and new rows get a null FK.
    return _upsert_event(payload_node)


@register('Event Cancelled')
def handle_event_cancelled(payload_node: dict) -> Event:
    event = _upsert_event(payload_node)
    event.cancelled = True
    event.lifecycle_state = 'CANCELLED'
    event.save(update_fields=['cancelled', 'lifecycle_state', 'updated_at'])
    return event


def _upsert_event(node: dict) -> Event:
    """Idempotent overwrite by external_id. Webhook always wins.

    Uses `update_or_create` with `defaults=` so:
      - Insertion path: new row, missing fields (like `tutorial_event`) default
        per the model definition (null).
      - Update path: only the keys present in `defaults` are overwritten —
        `tutorial_event` and any other field omitted by the mapper survive.
    """
    external_id = node['id']
    defaults = map_node_to_event_fields(node)
    defaults.pop('external_id', None)
    event, _created = Event.objects.update_or_create(
        external_id=external_id, defaults=defaults,
    )
    return event
```

- [ ] **Step 5: Run handler tests**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/services/test_webhook_handlers.py -v`
Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/administrate/services/webhook_handlers.py backend/django_Admin3/administrate/tests/services/test_webhook_handlers.py backend/django_Admin3/administrate/tests/fixtures/
git commit -m "feat(administrate): Event Created/Updated/Cancelled handlers"
```

---

## Task 7: Task layer — `apply_inbox_row`, retries, dead-letter

**Files:**
- Create: `backend/django_Admin3/administrate/services/webhook_dispatch.py`
- Modify: `backend/django_Admin3/administrate/tasks.py`
- Create: `backend/django_Admin3/administrate/tests/services/test_webhook_dispatch.py`
- Create: `backend/django_Admin3/administrate/tests/tasks/__init__.py`
- Create: `backend/django_Admin3/administrate/tests/tasks/test_process_webhook_inbox.py`

- [ ] **Step 1: Write failing dispatch tests**

Create `backend/django_Admin3/administrate/tests/tasks/__init__.py` (empty).

Create `backend/django_Admin3/administrate/tests/services/test_webhook_dispatch.py`:

```python
from unittest.mock import patch

import pytest

from administrate.exceptions import MissingDependencyError
from administrate.models import WebhookInbox
from administrate.services.webhook_dispatch import (
    MAX_ATTEMPTS,
    apply_inbox_row,
)


@pytest.fixture
def received_row(db):
    return WebhookInbox.objects.create(
        administrate_webhook_id='wh_disp_1',
        administrate_event_timestamp='2026-05-14T12:00:00Z',
        webhook_type_name='Event Updated',
        entity_type='event',
        entity_external_id='evt_disp_1',
        raw_payload={
            'metadata': {},
            'payload': {'event': {'id': 'evt_disp_1'}},
        },
    )


@pytest.mark.django_db
class TestApplyInboxRow:
    @patch('administrate.services.webhook_dispatch.EVENT_HANDLERS', new={
        'Event Updated': lambda node: None,
    })
    def test_success_marks_applied(self, received_row):
        apply_inbox_row(received_row.id)
        received_row.refresh_from_db()
        assert received_row.status == WebhookInbox.STATUS_APPLIED
        assert received_row.applied_at is not None
        assert received_row.attempts == 1

    @patch('administrate.services.webhook_dispatch.EVENT_HANDLERS', new={
        'Event Updated': _raise(MissingDependencyError('CourseTemplate', 'ct_x')),
    })
    def test_transient_failure_increments_and_reraises(self, received_row):
        with pytest.raises(MissingDependencyError):
            apply_inbox_row(received_row.id)
        received_row.refresh_from_db()
        assert received_row.status == WebhookInbox.STATUS_FAILED
        assert received_row.attempts == 1
        assert 'CourseTemplate' in received_row.error_message

    def test_unknown_webhook_type_marks_dead_immediately(self, received_row):
        received_row.webhook_type_name = 'Event Mystery'
        received_row.save()
        apply_inbox_row(received_row.id)  # should NOT raise
        received_row.refresh_from_db()
        assert received_row.status == WebhookInbox.STATUS_DEAD
        assert 'Event Mystery' in received_row.error_message

    @patch('administrate.services.webhook_dispatch.EVENT_HANDLERS', new={
        'Event Updated': _raise(ValueError('boom')),
    })
    def test_attempts_exhausted_marks_dead_and_swallows(self, received_row):
        received_row.attempts = MAX_ATTEMPTS - 1
        received_row.save()
        # Should NOT raise — exhaustion is a terminal state, not a transient one.
        apply_inbox_row(received_row.id)
        received_row.refresh_from_db()
        assert received_row.status == WebhookInbox.STATUS_DEAD
        assert received_row.attempts == MAX_ATTEMPTS

    def test_already_applied_row_short_circuits(self, received_row):
        received_row.status = WebhookInbox.STATUS_APPLIED
        received_row.save()
        apply_inbox_row(received_row.id)  # no-op, no exception
        received_row.refresh_from_db()
        assert received_row.attempts == 0  # didn't increment
```

Helper at the top of that file (above the class):

```python
def _raise(exc):
    def _fn(_node):
        raise exc
    return _fn
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/services/test_webhook_dispatch.py -v`
Expected: 5 failures (ImportError on `apply_inbox_row`).

- [ ] **Step 3: Implement the dispatch service**

Create `backend/django_Admin3/administrate/services/webhook_dispatch.py`:

```python
"""Per-row apply logic, run from inside `process_webhook_inbox` task.

Responsibilities:
  - Row-locking via SELECT FOR UPDATE so two workers can't apply the same row.
  - Idempotency: rows already in a terminal state short-circuit.
  - Handler dispatch by `webhook_type_name`.
  - Failure classification:
      * Unknown handler        -> dead (no retry possible)
      * Handler raised, attempts < MAX -> failed, re-raise (task retries)
      * Handler raised, attempts >= MAX -> dead, swallow (no further retry)
"""

import logging

from django.db import transaction
from django.utils import timezone

from administrate.exceptions import MissingDependencyError
from administrate.models import WebhookInbox
from administrate.services.webhook_handlers import EVENT_HANDLERS


logger = logging.getLogger(__name__)

MAX_ATTEMPTS = 5

TERMINAL_STATES = {
    WebhookInbox.STATUS_APPLIED,
    WebhookInbox.STATUS_DUPLICATE,
    WebhookInbox.STATUS_DEAD,
    WebhookInbox.STATUS_PROCESSING,  # another worker holds it
}


def apply_inbox_row(inbox_id: int) -> None:
    """Process a single webhook inbox row.

    Re-raises the handler exception on transient failure so the Django Tasks
    backoff machinery reschedules. Swallows on dead-letter exhaustion so the
    task is marked successful and is not re-queued.
    """
    with transaction.atomic():
        try:
            row = (
                WebhookInbox.objects
                .select_for_update()
                .get(id=inbox_id)
            )
        except WebhookInbox.DoesNotExist:
            logger.warning('administrate.webhook.inbox.missing', extra={'inbox_id': inbox_id})
            return

        if row.status in TERMINAL_STATES:
            logger.info(
                'administrate.webhook.inbox.short_circuit',
                extra={'inbox_id': inbox_id, 'status': row.status},
            )
            return

        row.status = WebhookInbox.STATUS_PROCESSING
        row.attempts = (row.attempts or 0) + 1
        row.save(update_fields=['status', 'attempts'])

    # The transaction above is closed so the handler's own transaction can
    # roll back cleanly without poisoning the row's status update.
    try:
        handler = EVENT_HANDLERS.get(row.webhook_type_name)
        if handler is None:
            _mark_dead(row, f'No handler for webhook_type_name={row.webhook_type_name!r}')
            return

        node = _extract_node(row.raw_payload)
        with transaction.atomic():
            handler(node)
        _mark_applied(row)

    except Exception as exc:  # noqa: BLE001 — we re-raise transient, swallow terminal
        if row.attempts >= MAX_ATTEMPTS:
            _mark_dead(row, _format_error(exc))
            return  # swallow — task is "done", no more retries
        _mark_failed(row, _format_error(exc))
        raise  # re-raise so django.tasks reschedules


def _extract_node(raw_payload: dict) -> dict:
    """Pluck the `event` node out of the wrapped Administrate payload.

    Administrate wraps the GraphQL result under `payload` (the result of the
    query the webhook was registered with). Our query is `event(id: $objectid)`
    so the node is at `payload.event`.
    """
    payload = raw_payload.get('payload') or {}
    return payload.get('event') or {}


def _mark_applied(row: WebhookInbox) -> None:
    row.status = WebhookInbox.STATUS_APPLIED
    row.applied_at = timezone.now()
    row.error_message = ''
    row.save(update_fields=['status', 'applied_at', 'error_message'])


def _mark_failed(row: WebhookInbox, message: str) -> None:
    row.status = WebhookInbox.STATUS_FAILED
    row.error_message = message
    row.save(update_fields=['status', 'error_message'])


def _mark_dead(row: WebhookInbox, message: str) -> None:
    row.status = WebhookInbox.STATUS_DEAD
    row.error_message = message
    row.save(update_fields=['status', 'error_message'])


def _format_error(exc: Exception) -> str:
    if isinstance(exc, MissingDependencyError):
        return f'{type(exc).__name__}: {exc}'
    return f'{type(exc).__name__}: {exc}'
```

- [ ] **Step 4: Wire the real task body**

Replace the stub in `backend/django_Admin3/administrate/tasks.py`:

```python
from django.tasks import task

from administrate.services.webhook_dispatch import apply_inbox_row


@task(queue_name='administrate_webhooks', max_retries=5, backoff='exponential')
def process_webhook_inbox(inbox_id: int) -> None:
    """Apply a single webhook inbox row.

    The task body is intentionally a one-liner. All retry / dead-letter logic
    lives in `apply_inbox_row` so it's unit-testable without involving the
    task framework. The `@task` decorator's `max_retries` matches MAX_ATTEMPTS
    in webhook_dispatch — they MUST stay in sync.
    """
    apply_inbox_row(inbox_id)
```

- [ ] **Step 5: Run dispatch tests**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/services/test_webhook_dispatch.py -v`
Expected: 5 passed.

- [ ] **Step 6: Write task-level test (integration with immediate backend)**

Create `backend/django_Admin3/administrate/tests/tasks/test_process_webhook_inbox.py`:

```python
from unittest.mock import patch

import pytest

from administrate.models import WebhookInbox
from administrate.tasks import process_webhook_inbox


@pytest.mark.django_db
class TestProcessWebhookInboxTask:
    def test_enqueue_runs_synchronously_under_immediate_backend(self, settings):
        # Test settings already use ImmediateBackend.
        row = WebhookInbox.objects.create(
            administrate_webhook_id='wh_t_1',
            administrate_event_timestamp='2026-05-14T12:00:00Z',
            webhook_type_name='Event Mystery',  # unknown -> immediate dead
            entity_type='event',
            entity_external_id='evt_t_1',
            raw_payload={'payload': {'event': {'id': 'evt_t_1'}}},
        )

        process_webhook_inbox.enqueue(row.id)

        row.refresh_from_db()
        assert row.status == WebhookInbox.STATUS_DEAD
```

- [ ] **Step 7: Run task test**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/tasks/ -v`
Expected: 1 passed.

- [ ] **Step 8: Commit**

```bash
git add backend/django_Admin3/administrate/services/webhook_dispatch.py backend/django_Admin3/administrate/tasks.py backend/django_Admin3/administrate/tests/services/test_webhook_dispatch.py backend/django_Admin3/administrate/tests/tasks/
git commit -m "feat(administrate): inbox dispatch with retries and dead-letter"
```

---

## Task 8: End-to-end test — POST → inbox → task → Event upsert

**Files:**
- Create: `backend/django_Admin3/administrate/tests/test_webhook_end_to_end.py`

- [ ] **Step 1: Write the end-to-end test**

```python
import json
from pathlib import Path

import pytest
from rest_framework.test import APIClient

from administrate.models import (
    CourseTemplate,
    Event,
    Instructor,
    Location,
    Venue,
    WebhookInbox,
)


FIXTURES = Path(__file__).resolve().parent / 'fixtures' / 'webhooks'


def _load(name: str) -> dict:
    return json.loads((FIXTURES / name).read_text())


@pytest.fixture
def deps(db):
    location = Location.objects.create(external_id='loc_external_1', name='London')
    Venue.objects.create(external_id='ven_external_1', name='Holborn', location=location)
    Instructor.objects.create(external_id='ins_external_1', name='Test Instructor')
    CourseTemplate.objects.create(external_id='ct_external_1', title='CB1')


@pytest.mark.django_db
class TestEndToEnd:
    URL = '/api/administrate/webhooks/test-route-token/event/'

    def test_event_updated_full_cycle(self, deps):
        body = _load('event_updated.json')
        client = APIClient()

        resp = client.post(self.URL, body, format='json')

        assert resp.status_code == 202
        inbox_id = resp.json()['inbox_id']
        # Immediate backend ran the task synchronously inside the POST call.
        row = WebhookInbox.objects.get(id=inbox_id)
        assert row.status == WebhookInbox.STATUS_APPLIED
        assert row.applied_at is not None

        event = Event.objects.get(external_id='evt_external_42')
        assert event.title == 'CB1 Tutorial — September 2026'
        assert event.lifecycle_state == 'PUBLISHED'
        assert event.cancelled is False

    def test_event_cancelled_full_cycle(self, deps):
        # Seed an active event via Event Updated first.
        client = APIClient()
        client.post(self.URL, _load('event_updated.json'), format='json')

        resp = client.post(self.URL, _load('event_cancelled.json'), format='json')
        assert resp.status_code == 202

        event = Event.objects.get(external_id='evt_external_42')
        assert event.cancelled is True
        assert event.lifecycle_state == 'CANCELLED'

    def test_missing_dependency_dead_letters_via_full_cycle(self):
        # No deps fixture — FK lookups will fail.
        body = _load('event_updated.json')
        resp = APIClient().post(self.URL, body, format='json')
        assert resp.status_code == 202

        row = WebhookInbox.objects.get(id=resp.json()['inbox_id'])
        # 5 attempts will not run under the immediate backend in one POST;
        # the first attempt fails and re-raises. The task framework's retry
        # behaviour under ImmediateBackend is to surface the exception once.
        # That single attempt leaves status='failed' with attempts=1.
        # In production with the DB backend, retries would proceed.
        assert row.status in {
            WebhookInbox.STATUS_FAILED, WebhookInbox.STATUS_DEAD,
        }
        assert 'MissingDependencyError' in row.error_message
```

- [ ] **Step 2: Run end-to-end tests**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/test_webhook_end_to_end.py -v`
Expected: 3 passed.

> If the third test reveals that `ImmediateBackend` re-raises the failure out through `.enqueue()` (i.e. the POST returns 500 instead of 202), wrap the call in `dispatch_inbox_task` with `try/except` and log+suppress non-`InvalidPayload` failures so the HTTP response stays 202 once the row is persisted. The Administrate side has already committed by then; further retries belong to the worker, not the request.

- [ ] **Step 3: Commit**

```bash
git add backend/django_Admin3/administrate/tests/test_webhook_end_to_end.py
git commit -m "test(administrate): end-to-end webhook ingestion via APIClient"
```

---

## Task 9: Registration management command — `administrate_webhooks`

**Files:**
- Create: `backend/django_Admin3/administrate/management/commands/administrate_webhooks.py`
- Create: `backend/django_Admin3/administrate/tests/management/test_administrate_webhooks_cmd.py`

- [ ] **Step 1: Inspect the existing `AdministrateAPIService` to know the call shape**

Read `backend/django_Admin3/administrate/services/api_service.py`. Identify the method (probably `execute_query(query, variables)`) used by other management commands. The command tests will mock this method.

- [ ] **Step 2: Write failing command tests**

Create `backend/django_Admin3/administrate/tests/management/__init__.py` if absent (empty).

Create `backend/django_Admin3/administrate/tests/management/test_administrate_webhooks_cmd.py`:

```python
from io import StringIO
from unittest.mock import MagicMock, patch

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
```

- [ ] **Step 3: Run tests to verify failure**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/management/test_administrate_webhooks_cmd.py -v`
Expected: 3 failures (command not found).

- [ ] **Step 4: Implement the command**

Create `backend/django_Admin3/administrate/management/commands/administrate_webhooks.py`:

```python
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
        for edge in (result.get('webhooks', {}).get('edges') or []):
            node = edge.get('node', {})
            self.stdout.write(
                f"- {node.get('id')}: {node.get('name')} "
                f"[{node.get('webhookType', {}).get('name')}]"
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
                self.stdout.write(f"[dry-run] webhooks.create {variables}")
                continue

            existing = self._find_by_name(api, spec['name'])
            if existing:
                api.execute_query(
                    'mutation Upd($id: ID!, $input: WebhookInput!) { '
                    'webhooks.update(id: $id, input: $input) { webhook { id } } }',
                    variables={'id': existing, 'input': variables},
                )
                self.stdout.write(f"updated: {spec['name']} ({existing})")
            else:
                api.execute_query(
                    'mutation Create($input: WebhookInput!) { '
                    'webhooks.create(input: $input) { webhook { id } } }',
                    variables={'input': variables},
                )
                self.stdout.write(f"created: {spec['name']}")

    def _delete_all(self, api):
        for spec in WEBHOOK_DEFINITIONS:
            existing = self._find_by_name(api, spec['name'])
            if existing:
                api.execute_query(
                    'mutation Del($id: ID!) { webhooks.delete(id: $id) { success } }',
                    variables={'id': existing},
                )
                self.stdout.write(f'deleted: {spec["name"]}')

    def _resolve_webhook_types(self, api):
        result = api.execute_query(
            'query { webhookTypes(first: 200) { edges { node { id name } } } }'
        )
        return {
            edge['node']['name']: edge['node']['id']
            for edge in (result.get('webhookTypes', {}).get('edges') or [])
        }

    def _find_by_name(self, api, name):
        result = api.execute_query(
            'query Find($name: String!) { '
            'webhooks(filter: {name: $name}, first: 1) { edges { node { id } } } }',
            variables={'name': name},
        )
        edges = (result.get('webhooks', {}).get('edges') or [])
        return edges[0]['node']['id'] if edges else None
```

> **GraphQL syntax note:** Administrate's mutation names (`webhooks.create` etc.) use dot syntax in some places per the spec. If `execute_query` rejects them, swap to the canonical `webhookCreate` form when you capture the real schema during UAT validation.

- [ ] **Step 5: Run command tests**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/management/test_administrate_webhooks_cmd.py -v`
Expected: 3 passed (the `_list` test is intentionally tolerant; the other two assert exact behaviour).

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/administrate/management/commands/administrate_webhooks.py backend/django_Admin3/administrate/tests/management/
git commit -m "feat(administrate): administrate_webhooks list/register/delete-all command"
```

---

## Task 10: Operational command `administrate_webhooks_inbox` + Django admin

**Files:**
- Create: `backend/django_Admin3/administrate/management/commands/administrate_webhooks_inbox.py`
- Create: `backend/django_Admin3/administrate/tests/management/test_administrate_webhooks_inbox_cmd.py`
- Modify: `backend/django_Admin3/administrate/admin.py`

- [ ] **Step 1: Write failing tests**

Create `backend/django_Admin3/administrate/tests/management/test_administrate_webhooks_inbox_cmd.py`:

```python
from io import StringIO
from unittest.mock import patch

import pytest
from django.core.management import call_command

from administrate.models import WebhookInbox


@pytest.fixture
def dead_row(db):
    return WebhookInbox.objects.create(
        administrate_webhook_id='wh_op_1',
        administrate_event_timestamp='2026-05-14T12:00:00Z',
        webhook_type_name='Event Updated',
        entity_type='event',
        entity_external_id='evt_op_1',
        raw_payload={'payload': {'event': {'id': 'evt_op_1'}}},
        status=WebhookInbox.STATUS_DEAD,
        attempts=5,
        error_message='boom',
    )


@pytest.mark.django_db
class TestInboxCommand:
    def test_list_status_dead(self, dead_row):
        out = StringIO()
        call_command(
            'administrate_webhooks_inbox', 'list', '--status', 'dead',
            stdout=out,
        )
        assert str(dead_row.id) in out.getvalue()

    def test_show(self, dead_row):
        out = StringIO()
        call_command('administrate_webhooks_inbox', 'show', str(dead_row.id), stdout=out)
        assert 'Event Updated' in out.getvalue()
        assert 'boom' in out.getvalue()

    @patch(
        'administrate.management.commands.administrate_webhooks_inbox'
        '.dispatch_inbox_task'
    )
    def test_replay_resets_and_enqueues(self, mock_dispatch, dead_row):
        call_command('administrate_webhooks_inbox', 'replay', str(dead_row.id))

        dead_row.refresh_from_db()
        assert dead_row.status == WebhookInbox.STATUS_RECEIVED
        assert dead_row.attempts == 0
        assert dead_row.error_message == ''
        mock_dispatch.assert_called_once_with(dead_row.id)
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/management/test_administrate_webhooks_inbox_cmd.py -v`
Expected: 3 failures.

- [ ] **Step 3: Implement the command**

Create `backend/django_Admin3/administrate/management/commands/administrate_webhooks_inbox.py`:

```python
"""Operational inspection + replay tool for the webhook inbox.

Engineers responding to a `inbox_lag_seconds` alert use this to:
  - list rows by status
  - show a single row's full payload + error
  - replay one row (or many) by flipping status back to 'received' and re-enqueueing
"""

import json
from datetime import datetime

from django.core.management.base import BaseCommand, CommandError
from django.utils.dateparse import parse_datetime

from administrate.models import WebhookInbox
from administrate.services.webhook_ingress import dispatch_inbox_task


class Command(BaseCommand):
    help = 'Inspect and replay Administrate webhook inbox rows.'

    def add_arguments(self, parser):
        sub = parser.add_subparsers(dest='action', required=True)

        lst = sub.add_parser('list')
        lst.add_argument('--status', default='dead')
        lst.add_argument('--limit', type=int, default=50)

        show = sub.add_parser('show')
        show.add_argument('inbox_id', type=int)

        rp = sub.add_parser('replay')
        rp.add_argument('inbox_id', nargs='?', type=int)
        rp.add_argument('--status', default=None)
        rp.add_argument('--since', default=None)

    def handle(self, *args, action, **opts):
        if action == 'list':
            self._list(opts['status'], opts['limit'])
        elif action == 'show':
            self._show(opts['inbox_id'])
        elif action == 'replay':
            self._replay(opts.get('inbox_id'), opts.get('status'), opts.get('since'))
        else:
            raise CommandError(f'Unknown action: {action}')

    def _list(self, status, limit):
        qs = WebhookInbox.objects.filter(status=status).order_by('-received_at')[:limit]
        for row in qs:
            self.stdout.write(
                f"{row.id}\t{row.received_at:%Y-%m-%d %H:%M:%S}\t"
                f"{row.webhook_type_name}\t{row.entity_external_id}\t"
                f"attempts={row.attempts}\t{row.error_message[:60]}"
            )

    def _show(self, inbox_id):
        try:
            row = WebhookInbox.objects.get(id=inbox_id)
        except WebhookInbox.DoesNotExist:
            raise CommandError(f'No inbox row #{inbox_id}')
        self.stdout.write(f'id:                  {row.id}')
        self.stdout.write(f'status:              {row.status}')
        self.stdout.write(f'webhook_type_name:   {row.webhook_type_name}')
        self.stdout.write(f'entity_external_id:  {row.entity_external_id}')
        self.stdout.write(f'attempts:            {row.attempts}')
        self.stdout.write(f'received_at:         {row.received_at}')
        self.stdout.write(f'applied_at:          {row.applied_at}')
        self.stdout.write(f'error_message:       {row.error_message}')
        self.stdout.write('raw_payload:')
        self.stdout.write(json.dumps(row.raw_payload, indent=2, sort_keys=True))

    def _replay(self, inbox_id, status_filter, since):
        if inbox_id is not None:
            self._replay_one(inbox_id)
            return
        if not status_filter:
            raise CommandError('replay requires <inbox_id> or --status')
        qs = WebhookInbox.objects.filter(status=status_filter)
        if since:
            since_dt = parse_datetime(since) or datetime.fromisoformat(since)
            qs = qs.filter(received_at__gte=since_dt)
        count = 0
        for row in qs:
            self._replay_one(row.id, _row=row)
            count += 1
        self.stdout.write(f'replayed {count} row(s)')

    def _replay_one(self, inbox_id, _row=None):
        row = _row or WebhookInbox.objects.get(id=inbox_id)
        row.status = WebhookInbox.STATUS_RECEIVED
        row.attempts = 0
        row.error_message = ''
        row.save(update_fields=['status', 'attempts', 'error_message'])
        dispatch_inbox_task(row.id)
        self.stdout.write(f'replayed: {row.id}')
```

- [ ] **Step 4: Run command tests**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/management/test_administrate_webhooks_inbox_cmd.py -v`
Expected: 3 passed.

- [ ] **Step 5: Register WebhookInbox in Django admin**

Read `backend/django_Admin3/administrate/admin.py`, then append:

```python
from administrate.models import WebhookInbox


@admin.register(WebhookInbox)
class WebhookInboxAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'webhook_type_name', 'entity_external_id', 'status',
        'attempts', 'received_at', 'applied_at',
    )
    list_filter = ('status', 'webhook_type_name', 'entity_type')
    search_fields = ('entity_external_id', 'administrate_webhook_id')
    ordering = ('-received_at',)
    # Only `status` is writable so operators can manually flip dead -> received.
    # Everything else is the auditable receipt and must not be edited.
    readonly_fields = (
        'administrate_webhook_id', 'administrate_event_timestamp',
        'webhook_type_name', 'entity_type', 'entity_external_id',
        'raw_payload', 'raw_headers', 'error_message', 'attempts',
        'task_id', 'received_at', 'applied_at',
    )
```

- [ ] **Step 6: Verify admin loads**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python manage.py check`
Expected: `System check identified no issues.`

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/administrate/management/commands/administrate_webhooks_inbox.py backend/django_Admin3/administrate/admin.py backend/django_Admin3/administrate/tests/management/test_administrate_webhooks_inbox_cmd.py
git commit -m "feat(administrate): inbox inspection/replay command + admin registration"
```

---

## Task 11: Structured logging + metric emission hooks

**Context:** The spec lists four metrics including `administrate_webhook_inbox_lag_seconds` as the "Primary alerting signal." The codebase has no metrics exporter today (no statsd / prometheus client), so this task adds the *emission points* as no-op hooks plus the SQL-level lag query — wire to a real exporter in a follow-up once one is chosen. The lag query is genuinely useful right now (operators can run it manually).

**Files:**
- Modify: `backend/django_Admin3/administrate/services/webhook_ingress.py`
- Modify: `backend/django_Admin3/administrate/services/webhook_dispatch.py`
- Modify: `backend/django_Admin3/administrate/views/webhooks.py`
- Create: `backend/django_Admin3/administrate/services/webhook_metrics.py`
- Create: `backend/django_Admin3/administrate/tests/test_webhook_logging.py`
- Create: `backend/django_Admin3/administrate/tests/services/test_webhook_metrics.py`

- [ ] **Step 1: Write failing log-assertion tests**

```python
import logging

import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_received_log_emitted_on_post(caplog, valid_payload_fixture):
    caplog.set_level(logging.INFO, logger='administrate.webhook')
    APIClient().post(
        '/api/administrate/webhooks/test-route-token/event/',
        valid_payload_fixture,
        format='json',
    )
    received = [r for r in caplog.records if r.message == 'administrate.webhook.received']
    assert len(received) == 1
    assert received[0].inbox_id is not None
    assert received[0].type == 'Event Updated'
```

(Re-use the `valid_payload` fixture from `test_webhook_view.py` — either move it to a `conftest.py` in `administrate/tests/` or duplicate.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/test_webhook_logging.py -v`
Expected: FAIL — no such log record.

- [ ] **Step 3: Add the three documented log statements**

In `webhooks.py` `post()` immediately after persistence:

```python
import logging
logger = logging.getLogger('administrate.webhook')

# inside post(), after the IntegrityError handling:
logger.info('administrate.webhook.received', extra={
    'inbox_id': row.id,
    'type': row.webhook_type_name,
    'entity_id': row.entity_external_id,
    'duplicate': False,
})
```

In `webhook_dispatch.apply_inbox_row`, add at the start of the handler-call block:

```python
logger.info('administrate.webhook.task.start', extra={'inbox_id': inbox_id})
```

In `_mark_applied`:

```python
logger.info('administrate.webhook.task.applied', extra={
    'inbox_id': row.id,
    'attempts': row.attempts,
})
```

In the failure path (both `_mark_failed` and `_mark_dead`):

```python
logger.error('administrate.webhook.task.failed', extra={
    'inbox_id': row.id,
    'attempt': row.attempts,
    'error': message,
    'terminal': row.status == WebhookInbox.STATUS_DEAD,
})
```

Make sure the logger uses the same dotted namespace (`administrate.webhook`) so `caplog.set_level(... logger='administrate.webhook')` picks them all up.

- [ ] **Step 4: Run tests**

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/ -v`
Expected: all administrate tests pass.

- [ ] **Step 5: Add metric emission hooks + lag query**

Create `backend/django_Admin3/administrate/services/webhook_metrics.py`:

```python
"""Metric-emission hooks for the webhook pipeline.

No exporter is configured yet, so these helpers are deliberately no-ops
that record to module-level counters for tests. When a real exporter is
adopted (statsd / prometheus_client / OpenTelemetry), replace the bodies
in this single file — call sites do not change.

The `inbox_lag_seconds()` helper is real today and is the canonical
alerting query: max(now - received_at) across rows still in flight.
"""

from collections import Counter
from typing import Optional

from django.db.models import F, Max
from django.utils import timezone

from administrate.models import WebhookInbox


# Module-level counters — used only by tests; replace with real exporter calls.
_COUNTERS: Counter = Counter()


def incr_received(webhook_type: str, outcome: str) -> None:
    """outcome ∈ {queued, duplicate, auth_failed, bad_request}."""
    _COUNTERS[('received', webhook_type, outcome)] += 1


def incr_applied(webhook_type: str) -> None:
    _COUNTERS[('applied', webhook_type)] += 1


def incr_failed(webhook_type: str, attempt: int) -> None:
    _COUNTERS[('failed', webhook_type, attempt)] += 1


def inbox_lag_seconds() -> Optional[float]:
    """Maximum age (in seconds) of any inbox row not yet in a terminal state.

    Returns None if no in-flight rows exist. This is the spec's primary
    alerting signal — wire it into whatever scraper/poller you adopt.
    """
    in_flight = WebhookInbox.objects.filter(
        status__in=[
            WebhookInbox.STATUS_RECEIVED,
            WebhookInbox.STATUS_PROCESSING,
            WebhookInbox.STATUS_FAILED,
        ]
    )
    oldest = in_flight.aggregate(oldest=Max('received_at'))['oldest']
    if oldest is None:
        return None
    return (timezone.now() - oldest).total_seconds()


def reset_for_tests() -> None:
    _COUNTERS.clear()


def get_counter_for_tests(key) -> int:
    return _COUNTERS[key]
```

Wire the four call sites:

- `webhooks.py` `post()`: call `incr_received(row.webhook_type_name, 'queued')` after successful persistence; `incr_received(_, 'duplicate')` in the IntegrityError branch; `incr_received(_, 'auth_failed')` on 401; `incr_received('', 'bad_request')` on 400. For the auth_failed/bad_request paths we don't have `webhook_type_name` yet, so pass an empty string — these are still useful for traffic-mix alerting.
- `webhook_dispatch._mark_applied()`: `incr_applied(row.webhook_type_name)`.
- `webhook_dispatch._mark_failed()` and `_mark_dead()`: `incr_failed(row.webhook_type_name, row.attempts)`.

- [ ] **Step 6: Test the lag query + counter hooks**

Create `backend/django_Admin3/administrate/tests/services/test_webhook_metrics.py`:

```python
from datetime import timedelta

import pytest
from django.utils import timezone

from administrate.models import WebhookInbox
from administrate.services import webhook_metrics


@pytest.mark.django_db
class TestLag:
    def test_no_in_flight_returns_none(self):
        assert webhook_metrics.inbox_lag_seconds() is None

    def test_old_received_row_dominates(self):
        old = WebhookInbox.objects.create(
            administrate_webhook_id='wh_lag_old',
            administrate_event_timestamp=timezone.now(),
            webhook_type_name='Event Updated',
            entity_type='event',
            entity_external_id='evt_lag',
            raw_payload={},
        )
        WebhookInbox.objects.filter(pk=old.pk).update(
            received_at=timezone.now() - timedelta(hours=2),
        )
        # Recent applied row should NOT count.
        WebhookInbox.objects.create(
            administrate_webhook_id='wh_lag_recent',
            administrate_event_timestamp=timezone.now(),
            webhook_type_name='Event Updated',
            entity_type='event',
            entity_external_id='evt_lag_2',
            raw_payload={},
            status=WebhookInbox.STATUS_APPLIED,
        )
        lag = webhook_metrics.inbox_lag_seconds()
        assert lag is not None
        assert lag > 3600  # > 1 hour
```

Run: `cd backend/django_Admin3 && DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/services/test_webhook_metrics.py -v`
Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/administrate/services/ backend/django_Admin3/administrate/views/ backend/django_Admin3/administrate/tests/test_webhook_logging.py backend/django_Admin3/administrate/tests/services/test_webhook_metrics.py
git commit -m "feat(administrate): structured logging + metric hooks with inbox-lag query"
```

---

## Final verification & PR

- [ ] **Run the full administrate test suite:**

```bash
cd backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/ -v
```

Expected: all tests pass. Note current count of pre-existing failures from MEMORY.md (22 tutorial tests due to a separate rename commit) — those are unrelated.

- [ ] **Coverage check (target 80% on new modules):**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  administrate/tests/test_webhook_inbox_model.py \
  administrate/tests/test_webhook_view.py \
  administrate/tests/services/ \
  administrate/tests/tasks/ \
  administrate/tests/test_webhook_end_to_end.py \
  administrate/tests/management/test_administrate_webhooks_cmd.py \
  administrate/tests/management/test_administrate_webhooks_inbox_cmd.py \
  --cov=administrate.views.webhooks \
  --cov=administrate.services.webhook_ingress \
  --cov=administrate.services.webhook_handlers \
  --cov=administrate.services.webhook_dispatch \
  --cov=administrate.tasks \
  --cov=administrate.management.commands.administrate_webhooks \
  --cov=administrate.management.commands.administrate_webhooks_inbox \
  --cov-report=term-missing
```

Expected: ≥ 80% on each module. If under, add tests for the uncovered branches before merging.

- [ ] **Schema placement check:**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python manage.py verify_schema_placement
```

Expected: `webhook_inbox` placed in `adm` schema; no warnings.

- [ ] **Confirm migration is reversible:**

```bash
python manage.py migrate administrate <previous_migration_number>  # rollback
python manage.py migrate administrate                                # roll forward
```

- [ ] **Pre-merge UAT capture checklist:**

The fixture files in `administrate/tests/fixtures/webhooks/` were created from the spec's GraphQL query — synthetic. Before merging:

1. Run `python manage.py administrate_webhooks register --dry-run` against UAT settings and review the mutation output.
2. Run `python manage.py administrate_webhooks register` (no dry-run) against UAT.
3. From the Administrate UAT control panel, trigger a manual Event Update on a test event.
4. Inspect the resulting `WebhookInbox` row: `python manage.py administrate_webhooks_inbox show <id>`.
5. Compare its `raw_payload` to `event_updated.json`. Update the fixture if shape differs (especially `learningMode` casing, datetime formats, or nested object keys). Re-run tests.

- [ ] **Push branch + open PR:**

```bash
git push -u origin feat/20260514-administrate-event-webhook-intake
gh pr create --base main --title \
  "feat(administrate): inbound Event webhook intake (slice 1)" --body "$(cat <<'BODY'
Implements the Administrate `Event` Created/Updated/Cancelled webhook
intake pipeline as designed in
`docs/superpowers/specs/2026-05-14-administrate-event-webhook-intake-design.md`.

## What lands

- New `adm.webhook_inbox` model + migration with UNIQUE dedup constraint.
- HTTP endpoint at `/api/administrate/webhooks/<route_token>/event/` with
  route-token + shared-secret two-layer auth (constant-time compares).
- `django.tasks` worker pipeline with row-lock, 5-attempt exponential
  backoff, dead-letter on exhaustion.
- Three webhook-type handlers (Created / Updated / Cancelled) backed by a
  pure-function payload mapper. Missing FK dependencies raise a typed
  `MissingDependencyError` → dead-letter → operator runs `sync_*` and
  replays.
- `administrate_webhooks` management command (list / register / delete-all)
  for idempotent registration against the Administrate API.
- `administrate_webhooks_inbox` management command (list / show / replay)
  for operational replay of dead rows.
- Django admin registration so the row is browsable and operators can
  manually flip status if needed.
- Structured logs at receive / start / applied / failed.

## What does NOT land (per design non-goals)

- HMAC verification (Administrate doesn't sign).
- Auto-linking `tutorial_event` FK (staff workflow).
- Other entities (Session, CourseTemplate, …) — future slices.

## Verification

- All new tests pass.
- Coverage ≥ 80% on new modules.
- Fixtures replaced with real UAT-captured payloads before merge.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

---

## Out of scope reminders

These are not in this plan and must not creep in:

- Session / CourseTemplate / PriceLevel / Venue / Location / Instructor webhooks.
- HMAC signature verification.
- Auto-linking `tutorial_event` FK.
- A staff-facing UI for managing webhook registrations.
- Replacing the existing `sync_*` commands (they remain the safety net).
