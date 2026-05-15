# Administrate Event Webhook — Testing & Integration Guide

**Audience:** Engineers verifying the slice 1 webhook intake locally and rolling it out to UAT/production.

**Branch under test:** `feat/20260514-administrate-event-webhook-intake`
**Spec:** [`docs/superpowers/specs/2026-05-14-administrate-event-webhook-intake-design.md`](superpowers/specs/2026-05-14-administrate-event-webhook-intake-design.md)
**Plan:** [`docs/superpowers/plans/2026-05-14-administrate-event-webhook-intake.md`](superpowers/plans/2026-05-14-administrate-event-webhook-intake.md)

---

## What this slice does

Receives `Event Created`, `Event Updated`, `Event Cancelled` webhooks from Administrate and reflects each change in the local `adm.events` table — replacing exclusive reliance on polling `sync_*` commands.

**Pipeline:** HTTPS POST → auth (route token + body secret) → persist to `adm.webhook_inbox` → `django.tasks` worker → handler → `Event.objects.update_or_create` → reply 202.

**Out of scope (slice 1):** Sessions / CourseTemplate / other entities. HMAC verification (Administrate doesn't sign). Auto-linking the cross-schema `tutorial_event` FK (staff workflow).

---

## Part 1 — Local verification

### 1.1 Run the test suite

From the project root:

```bash
cd backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/ -v
```

**Expected:** 211 passed, 1 skipped (the skip is an Administrate live-API connection test — environmental).

If you hit `relation "..._webhook_inbox" does not exist`, the test DB cache is stale. Refresh once:

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/ --create-db
```

### 1.2 Run only the webhook tests (faster feedback)

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  administrate/tests/test_webhook_inbox_model.py \
  administrate/tests/test_webhook_view.py \
  administrate/tests/test_webhook_logging.py \
  administrate/tests/test_webhook_end_to_end.py \
  administrate/tests/test_checks.py \
  administrate/tests/services/test_webhook_mapper.py \
  administrate/tests/services/test_webhook_handlers.py \
  administrate/tests/services/test_webhook_dispatch.py \
  administrate/tests/services/test_webhook_metrics.py \
  administrate/tests/tasks/test_process_webhook_inbox.py \
  administrate/tests/management/test_administrate_webhooks_cmd.py \
  administrate/tests/management/test_administrate_webhooks_inbox_cmd.py \
  -v
```

### 1.3 Run the system-check guard

The webhook receiver refuses to boot in non-debug environments with empty credentials:

```bash
# Simulate prod with missing env vars — should fail with administrate.E001
DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat \
ADMINISTRATE_WEBHOOK_SECRET= ADMINISTRATE_WEBHOOK_ROUTE_TOKEN= \
python manage.py check
```

**Expected:** `SystemCheckError: System check identified some issues: ERRORS: ?: Empty ADMINISTRATE_WEBHOOK_SECRET ...`

```bash
# Same env, but with collectstatic — should succeed (build phase skips system checks)
DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat \
ADMINISTRATE_WEBHOOK_SECRET= ADMINISTRATE_WEBHOOK_ROUTE_TOKEN= \
python manage.py collectstatic --noinput --dry-run
```

**Expected:** completes without `ImproperlyConfigured`.

---

## Part 2 — Local smoke test (manual end-to-end)

### 2.1 Set local env vars

Add to `backend/django_Admin3/.env.development`:

```dotenv
ADMINISTRATE_WEBHOOK_ROUTE_TOKEN=dev-token-change-me
ADMINISTRATE_WEBHOOK_SECRET=dev-secret-change-me
ADMINISTRATE_WEBHOOK_BASE_URL=http://127.0.0.1:8888
ADMINISTRATE_WEBHOOK_NOTIFICATION_EMAILS=
```

Generate real tokens via:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Use one for the route token, another for the secret.

### 2.2 Apply the migration

```bash
cd backend/django_Admin3
python manage.py migrate administrate
```

**Expected:** `Applying administrate.0010_webhookinbox... OK`

### 2.3 Start the dev server

```bash
python manage.py runserver 8888
```

The endpoint is now live at:

```
POST http://127.0.0.1:8888/api/administrate/webhooks/<route_token>/event/
```

### 2.4 Send a test delivery (happy path requires seeded FKs)

The handler resolves `course_template`, `location`, `primary_instructor` by `external_id`. Without those rows in the DB, the row dead-letters. Pick one of two seeding options.

**Option A (recommended): seed via existing sync commands** — uses real Administrate data:

```bash
python manage.py sync_course_templates
python manage.py sync_locations
python manage.py sync_instructors
python manage.py sync_venues
```

**Option B (offline smoke test): seed minimal placeholder rows via shell.** Copy-paste this whole block at once — the Python lines must be at column 0 or Python raises `IndentationError`:

```bash
python manage.py shell <<'PY'
from administrate.models import CourseTemplate, Location, Instructor, Venue
loc = Location.objects.create(external_id='loc_smoke')
Venue.objects.create(external_id='ven_smoke', location=loc)
Instructor.objects.create(external_id='ins_smoke')
CourseTemplate.objects.create(external_id='ct_smoke')
print('Seeded 4 placeholder rows.')
PY
```

Then POST a synthetic delivery (replace tokens with your `.env.development` values):

```bash
ROUTE_TOKEN="fr6Ldhabvg9-WibiD-peanie-fvi4QK1iTZDkRq59XRN8ILnaBRUKa5Npdgg7YpA"
SECRET="3LkALQ7hOUnovt_jX5_ZQ0CDA-qjt4XeKEridNzljrUyc64SY3Wvpf9sG12DhAze"

curl -i -X POST "http://127.0.0.1:8888/api/administrate/webhooks/${ROUTE_TOKEN}/event/" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "metadata": {
    "webhookId": "wh_smoke_1",
    "webhookTypeName": "Event Updated",
    "eventTimestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "entityId": "evt_smoke_1"
  },
  "payload": {
    "event": {
      "id": "evt_smoke_1",
      "title": "Smoke Test Event",
      "lifecycleState": "PUBLISHED",
      "cancelled": false,
      "soldOut": false,
      "webSale": true,
      "learningMode": "CLASSROOM",
      "maxPlaces": 30,
      "minPlaces": 5,
      "location": {"id": "loc_smoke"},
      "venue": {"id": "ven_smoke"},
      "primaryInstructor": {"id": "ins_smoke"},
      "courseTemplate": {"id": "ct_smoke"},
      "eventUrl": "https://example.com/event/smoke",
      "virtualClassroom": "",
      "timezone": "Europe/London",
      "lmsStartDate": "2026-09-01T09:00:00Z",
      "lmsEndDate": "2026-12-01T17:00:00Z",
      "registrationDeadline": "2026-08-25T23:59:59Z",
      "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    }
  },
  "configuration": {"secret": "${SECRET}"}
}
EOF
```

**Expected response:** `HTTP/1.1 202 Accepted` with body `{"status": "queued", "inbox_id": <N>}`.

### 2.5 Verify the row was applied

```bash
python manage.py administrate_webhooks_inbox show <N>
```

**Expected fields:**
- `status: applied`
- `attempts: 1`
- `applied_at: <recent timestamp>`
- `error_message:` (empty)

Verify the `Event` row landed:

```bash
python manage.py shell -c "from administrate.models import Event; print(Event.objects.get(external_id='evt_smoke_1').title)"
```

Expected output: `Smoke Test Event`

### 2.6 Verify the auth failure paths

**Wrong route token → 404:**

```bash
curl -i -X POST "http://127.0.0.1:8888/api/administrate/webhooks/wrong-token/event/" \
  -H "Content-Type: application/json" \
  -d '{"configuration": {"secret": "dev-secret-change-me"}}'
# HTTP/1.1 404 Not Found
```

**Wrong secret → 401:**

```bash
curl -i -X POST "http://127.0.0.1:8888/api/administrate/webhooks/${ROUTE_TOKEN}/event/" \
  -H "Content-Type: application/json" \
  -d '{"configuration": {"secret": "wrong-secret"}}'
# HTTP/1.1 401 Unauthorized
```

**Malformed body → 400:**

```bash
curl -i -X POST "http://127.0.0.1:8888/api/administrate/webhooks/${ROUTE_TOKEN}/event/" \
  -H "Content-Type: application/json" \
  -d "{\"configuration\": {\"secret\": \"${SECRET}\"}}"
# HTTP/1.1 400 Bad Request — body: {"error": "metadata missing or not an object"}
```

**Duplicate delivery → 200:** The dedup UNIQUE constraint is on `(webhookId, entityId, eventTimestamp)` together. The Section 2.4 payload uses `$(date ...)` which the shell re-evaluates on every paste, so two casual re-sends create two distinct deliveries (different timestamps → no collision). To actually exercise dedup, use a **fixed** timestamp on both POSTs. Paste this block twice in succession:

```bash
`ROUTE_TOKEN="fr6Ldhabvg9-WibiD-peanie-fvi4QK1iTZDkRq59XRN8ILnaBRUKa5Npdgg7YpA"
SECRET="3LkALQ7hOUnovt_jX5_ZQ0CDA-qjt4XeKEridNzljrUyc64SY3Wvpf9sG12DhAze"

curl -i -X POST "http://127.0.0.1:8888/api/administrate/webhooks/${ROUTE_TOKEN}/event/" \
  -H "Content-Type: application/json" \
  -d @- <<'EOF'
{
  "metadata": {
    "webhookId": "wh_dedup_1",
    "webhookTypeName": "Event Updated",
    "eventTimestamp": "2026-05-15T10:00:00Z",
    "entityId": "evt_smoke_1"
  },
  "payload": {"event": {
    "id": "evt_smoke_1", "title": "Smoke Test Event",
    "lifecycleState": "PUBLISHED", "cancelled": false,
    "soldOut": false, "webSale": true, "learningMode": "CLASSROOM",
    "maxPlaces": 30, "minPlaces": 5,
    "location": {"id": "TG9jYXRpb246OTE="},
    "venue": {"id": "VmVudWU6MjQ="},
    "primaryInstructor": {"id": "UGVyc29uOjU1Nzg4"},
    "courseTemplate": {"id": "Q291cnNlVGVtcGxhdGU6OTk="},
    "eventUrl": "https://example.com/event/smoke",
    "virtualClassroom": "", "timezone": "Europe/London",
    "lmsStartDate": "2026-09-01T09:00:00Z",
    "lmsEndDate": "2026-12-01T17:00:00Z",
    "registrationDeadline": "2026-08-25T23:59:59Z",
    "updatedAt": "2026-05-15T10:00:00Z"
  }},
  "configuration": {"secret": "3LkALQ7hOUnovt_jX5_ZQ0CDA-qjt4XeKEridNzljrUyc64SY3Wvpf9sG12DhAze"}
}
EOF`
```

- **First paste:** `HTTP/1.1 202 Accepted`, body `{"status":"queued","inbox_id":<N>}`.
- **Second paste:** `HTTP/1.1 200 OK`, body `{"status":"duplicate"}`. No new inbox row.

(Notice the `<<'EOF'` is **quoted** — single quotes around `EOF`. That suppresses shell variable expansion in the heredoc, so `$(date)` and `${SECRET}` are NOT interpolated. The unquoted `<<EOF` in Section 2.4 *does* interpolate, which is why Section 2.4 produces a fresh timestamp on every paste.)

**Diagnosing if you accidentally created a fresh row instead of triggering dedup:**

```bash
python manage.py administrate_webhooks_inbox show <inbox_id>
```

Look at the `eventTimestamp` in the dumped `raw_payload.metadata`. If two rows for the same event have *different* timestamps, the shell ran `$(date)` twice — use the fixed-timestamp block above instead.

### 2.7 Verify logs

In your `runserver` terminal, after the 2.4 POST you should see structured log lines (default Django formatter):

```
INFO administrate.webhook administrate.webhook.received
INFO administrate.webhook administrate.webhook.task.start
INFO administrate.webhook administrate.webhook.task.applied
```

Each carries `extra={'inbox_id': N, ...}`. If your project has structured-log shipping configured, those `extra` fields land as queryable JSON keys.

### 2.8 Verify the lag-query helper

```bash
python manage.py shell -c "from administrate.services.webhook_metrics import inbox_lag_seconds; print(inbox_lag_seconds())"
```

Expected output when no in-flight rows: `None`

If a row is stuck (e.g. you POSTed without seeding FKs), the same command returns a float — seconds since the oldest in-flight row was received:

```
12.4
```

This is the canonical alerting signal. Wire it into whatever metrics scraper you adopt.

---

## Part 3 — UAT integration

### 3.1 Set UAT env vars

In Railway / your hosting platform's UAT environment, set:

```
ADMINISTRATE_WEBHOOK_ROUTE_TOKEN=<48-char random URL-safe token>
ADMINISTRATE_WEBHOOK_SECRET=<48-char random URL-safe token>
ADMINISTRATE_WEBHOOK_BASE_URL=https://<uat-host>
ADMINISTRATE_WEBHOOK_NOTIFICATION_EMAILS=ops@example.com,oncall@example.com
```

Generate values out-of-band:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Both values are rotatable: change the env var, redeploy, and re-run `administrate_webhooks register` (Section 3.3) to push the new values to Administrate.

### 3.2 Deploy & migrate

Deploy the branch. The migration runs automatically per the existing pipeline (or run `python manage.py migrate administrate` against the UAT DB).

### 3.3 Inspect the registration mutations (dry-run first)

SSH or Railway-exec into a UAT shell:

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat \
python manage.py administrate_webhooks register --dry-run
```

**Expected output:** Three `[dry-run] webhook.create {...}` lines, one per webhook type (Updated / Created / Cancelled). The `secret` field is masked as `'***'`.

**Verify each mutation's `url`** points at `https://<uat-host>/api/administrate/webhooks/<route_token>/event/`. If wrong, check `ADMINISTRATE_WEBHOOK_BASE_URL` and `ADMINISTRATE_WEBHOOK_ROUTE_TOKEN`.

### 3.4 Register for real

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat \
python manage.py administrate_webhooks register
```

**Expected output:** Three lines like `created: Admin3 Event Updated` (first run) or `updated: Admin3 Event Updated (wh_xxxxx)` (subsequent runs). Idempotent.

**Likely first-run failures and fixes:**

| Symptom | Cause | Fix |
|---|---|---|
| `CommandError: Unknown webhook type from Administrate: Event Updated` | `webhookTypes` query returned nothing — likely the data-envelope unwrap is wrong | Check that `_resolve_webhook_types` reads `result['data']['webhookTypes']`. Already fixed in this branch but worth confirming if you see this. |
| `GraphQL syntax error at 'webhook { create'` | Administrate's actual mutation field name differs from the code's guess (`webhook { create }`) | Inspect the schema via Administrate's GraphiQL or docs and update the three mutation strings in [`administrate/management/commands/administrate_webhooks.py`](../backend/django_Admin3/administrate/management/commands/administrate_webhooks.py). The code's nested-action pattern (`webhook { create }`) follows the codebase convention but the inner field name needs UAT verification. |
| `webhooks(filter: ...)` rejected | Filter argument shape differs | Look at Administrate's webhook list query in their docs and update `_find_by_name`. |

### 3.5 Capture a real UAT payload

The fixture files in [`administrate/tests/fixtures/webhooks/`](../backend/django_Admin3/administrate/tests/fixtures/webhooks/) are synthetic. Replace them with real captures:

1. From Administrate's UAT control panel, edit any test event (change the title).
2. Wait ~30 seconds for the webhook to fire.
3. Find the resulting inbox row:

   ```bash
   DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat \
   python manage.py administrate_webhooks_inbox list --status applied --limit 5
   ```
4. Capture the full row:

   ```bash
   DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat \
   python manage.py administrate_webhooks_inbox show <id> > /tmp/captured-event-updated.json
   ```
5. The `raw_payload` JSON is what Administrate actually sends. Copy it into [`administrate/tests/fixtures/webhooks/event_updated.json`](../backend/django_Admin3/administrate/tests/fixtures/webhooks/event_updated.json), then re-run the test suite. Adjust the mapper or model choices if any field shape differs (e.g., if `learningMode` arrives lowercase).
6. Repeat for Created (publish a draft event) and Cancelled (cancel a test event).
7. Commit the updated fixtures.

### 3.6 Verify end-to-end against UAT

After Section 3.4, trigger an event change in Administrate's UI and check:

```bash
# Most recent applied delivery
DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat \
python manage.py administrate_webhooks_inbox list --status applied --limit 1

# Verify the Event row reflects the change (replace EVT_ID with the real id)
DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat \
  python manage.py shell -c "from administrate.models import Event; print(Event.objects.get(external_id='EVT_ID').title)"
```

### 3.7 Operational alerts

Wire `administrate.services.webhook_metrics.inbox_lag_seconds()` into whatever monitoring you have. Suggested alert rule:

> Alert if `inbox_lag_seconds()` returns a value > 600 (10 minutes) for more than 5 minutes.

Until you have a metrics exporter, run as a cron probe:

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat python -c "
from administrate.services.webhook_metrics import inbox_lag_seconds
lag = inbox_lag_seconds()
if lag is not None and lag > 600:
    raise SystemExit(f'LAG ALERT: {lag:.0f}s')
"
```

---

## Part 4 — Production rollout

Same as UAT (Sections 3.1–3.4), but:

- Use **production** env vars (different `ROUTE_TOKEN` and `SECRET` from UAT).
- Run `register --dry-run` first; sanity-check the URLs and `notificationEmails`.
- Run `register` only after at least one full UAT day with no dead-letter rows.
- Keep the existing `sync_*` polling commands running on schedule. They are now the **safety net**, not the primary mechanism. Reduce their frequency once you've observed clean webhook coverage for ~1 week.

### 4.1 Rollback

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.production \
python manage.py administrate_webhooks delete-all
```

This removes the registrations on the Administrate side. Our endpoint stays live but receives nothing. The `adm.webhook_inbox` table can stay (audit log).

To roll the migration back too:

```bash
python manage.py migrate administrate 0009
```

---

## Part 5 — Operator runbook

### 5.1 "An alert says lag is high"

```bash
# 1. List in-flight rows
python manage.py administrate_webhooks_inbox list --status received --limit 20
python manage.py administrate_webhooks_inbox list --status processing --limit 20
python manage.py administrate_webhooks_inbox list --status failed --limit 20
```

If rows are stuck in `processing` (worker crash):

```bash
python manage.py administrate_webhooks_inbox replay --status processing --dry-run
python manage.py administrate_webhooks_inbox replay --status processing
```

### 5.2 "A row failed because of a missing FK"

The error message tells you which model and external_id is missing:

```
MissingDependencyError: CourseTemplate external_id='ct_external_999'
```

Run the matching sync command:

```bash
python manage.py sync_course_templates  # for CourseTemplate
python manage.py sync_locations         # for Location
python manage.py sync_instructors       # for Instructor
python manage.py sync_venues            # for Venue
```

Then replay:

```bash
python manage.py administrate_webhooks_inbox replay <inbox_id>
```

For bulk replay of all rows that failed for the same reason:

```bash
python manage.py administrate_webhooks_inbox replay --status failed --dry-run  # preview count
python manage.py administrate_webhooks_inbox replay --status failed
```

### 5.3 "Investigate a single row in detail"

```bash
python manage.py administrate_webhooks_inbox show <inbox_id>
```

Output includes status, attempts, timestamps, error_message, and the full pretty-printed `raw_payload` JSON. The `configuration.secret` field is redacted as `'***'` in the audit log.

### 5.4 "Webhook secret was leaked / needs rotation"

1. Generate a new secret: `python -c "import secrets; print(secrets.token_urlsafe(48))"`
2. Update env var `ADMINISTRATE_WEBHOOK_SECRET` in the deployment.
3. Redeploy.
4. Re-run `administrate_webhooks register` — it pushes the new secret to Administrate.
5. The old secret is rejected immediately (constant-time compare against the new value).

Same procedure for `ADMINISTRATE_WEBHOOK_ROUTE_TOKEN` rotation.

---

## Part 6 — Architecture quick reference

### Files

| Layer | File |
|---|---|
| HTTP edge | [`administrate/views/webhooks.py`](../backend/django_Admin3/administrate/views/webhooks.py) |
| URL routing | [`administrate/urls.py`](../backend/django_Admin3/administrate/urls.py), [`django_Admin3/urls.py`](../backend/django_Admin3/django_Admin3/urls.py) |
| Inbox model | [`administrate/models/webhook_inbox.py`](../backend/django_Admin3/administrate/models/webhook_inbox.py) |
| Persist + parse | [`administrate/services/webhook_ingress.py`](../backend/django_Admin3/administrate/services/webhook_ingress.py) |
| Task body | [`administrate/tasks.py`](../backend/django_Admin3/administrate/tasks.py) |
| Dispatch + retry/dead-letter | [`administrate/services/webhook_dispatch.py`](../backend/django_Admin3/administrate/services/webhook_dispatch.py) |
| Per-type handlers + mapper | [`administrate/services/webhook_handlers.py`](../backend/django_Admin3/administrate/services/webhook_handlers.py) |
| Typed errors | [`administrate/exceptions.py`](../backend/django_Admin3/administrate/exceptions.py) |
| Logging + metrics | [`administrate/services/webhook_metrics.py`](../backend/django_Admin3/administrate/services/webhook_metrics.py) |
| Boot guard | [`administrate/checks.py`](../backend/django_Admin3/administrate/checks.py) |
| Admin | [`administrate/admin.py`](../backend/django_Admin3/administrate/admin.py) |
| Registration command | [`administrate/management/commands/administrate_webhooks.py`](../backend/django_Admin3/administrate/management/commands/administrate_webhooks.py) |
| Operational command | [`administrate/management/commands/administrate_webhooks_inbox.py`](../backend/django_Admin3/administrate/management/commands/administrate_webhooks_inbox.py) |

### Inbox status lifecycle

```
received ──► processing ──► applied
   ▲             │
   │             ├──► failed ──► (replay) ──► received ...
   │             │       │
   │             │       └─ after MAX_ATTEMPTS=5 ─► dead
   │             │
   │             └─► dead (unknown handler / non-retryable)
   │
duplicate (dedup constraint hit; never enters processing)
```

| Status | Meaning | Replayable? |
|---|---|---|
| `received` | Persisted, awaiting dispatch | yes (idempotent) |
| `processing` | Worker has it (or crashed mid-flight) | yes (crash recovery) |
| `applied` | Handler succeeded; Event row updated | NO (would clobber data) |
| `duplicate` | UNIQUE constraint hit; dropped | NO (no work to do) |
| `failed` | Handler raised, attempts < 5 | yes |
| `dead` | Handler raised, attempts ≥ 5, OR unknown handler | yes |

### HTTP response codes

| Code | When | Administrate behavior |
|---|---|---|
| 202 | Fresh delivery accepted | Success, no retry |
| 200 | Duplicate (UNIQUE constraint) | Success, no retry |
| 400 | Malformed JSON / missing required keys | No retry (4xx) |
| 401 | `configuration.secret` mismatch or empty configured secret | No retry (4xx) |
| 404 | `route_token` mismatch or empty configured token | No retry (4xx); deliberately doesn't confirm URL exists |
| 5xx | DB outage / unhandled framework crash before persistence | Administrate retries |

---

## Part 7 — Known UAT-time adaptations

Documented here for pre-merge confirmation:

1. **GraphQL mutation field names** in [`administrate_webhooks.py`](../backend/django_Admin3/administrate/management/commands/administrate_webhooks.py) use the codebase-standard nested-action pattern (`webhook { create }`, `webhook { update }`, `webhook { delete }`). The exact inner field names are inferred from the convention; verify against Administrate's actual schema during the first `register` run.

2. **`webhooks(filter:{name:...})`** argument shape in `_find_by_name` is speculative — Administrate's real filter syntax may differ.

3. **Test fixture files** in [`administrate/tests/fixtures/webhooks/`](../backend/django_Admin3/administrate/tests/fixtures/webhooks/) are synthetic. Replace with real UAT captures (Section 3.5) before merge.

4. **`learningMode` value casing.** Code assumes uppercase (`'CLASSROOM'`, `'BLENDED'`, `'LMS'`) matching the local model's choices. If Administrate emits lowercase, add `.upper()` normalization in [`webhook_handlers.py`](../backend/django_Admin3/administrate/services/webhook_handlers.py) `map_node_to_event_fields`.

5. **Async backend.** Slice 1 uses `django.tasks.backends.immediate.ImmediateBackend` (handlers run in-request) because Django 6.0.1 ships only the immediate backend. To swap to a real DB-backed queue (django-q2, future `django.tasks.backends.database`):

   - Change one line in [`settings/base.py`](../backend/django_Admin3/django_Admin3/settings/base.py) `TASKS['default']['BACKEND']`.
   - Add a worker process to deployment (e.g. `python manage.py db_worker --queue-name administrate_webhooks` once the framework supports it).
   - The view's `dispatch_inbox_task` indirection and the `apply_inbox_row` retry logic stay unchanged.
