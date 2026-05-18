# Administrate Event Webhook — Testing & Integration Guide

**Audience:** Engineers verifying the webhook intake locally and rolling it out to UAT/production.

**Spec:** [`docs/superpowers/specs/2026-05-14-administrate-event-webhook-intake-design.md`](superpowers/specs/2026-05-14-administrate-event-webhook-intake-design.md)
**Original plan:** [`docs/superpowers/plans/2026-05-14-administrate-event-webhook-intake.md`](superpowers/plans/2026-05-14-administrate-event-webhook-intake.md)
**Tutorial-events-as-master refactor (2026-05-15):** [`docs/superpowers/plans/2026-05-15-tutorial-events-as-master-refactor.md`](superpowers/plans/2026-05-15-tutorial-events-as-master-refactor.md)

---

## What this slice does

Receives `Event Created`, `Event Updated`, `Event Cancelled` webhooks from Administrate and reflects each change in `acted.tutorial_events` (the master). `adm.events` is a thin bridge keyed by `external_id` that links the Administrate id to the master row.

**Pipeline:** HTTPS POST → auth (route token + body secret) → persist to `adm.webhook_inbox` → `django.tasks` worker → handler looks up `tutorial_events` by `code = node.title` → if matched, update the master + upsert the bridge → reply 202. If no `tutorial_events.code` matches, the inbox row dead-letters (operator workflow: create the `tutorial_events` row first, then `administrate_webhooks_inbox replay`).

**Out of scope:** Sessions / CourseTemplate / other entities. HMAC verification (Administrate doesn't sign).

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
  administrate/tests/services/test_webhook_ingress.py \
  administrate/tests/services/test_webhook_mapper.py \
  administrate/tests/services/test_webhook_handlers.py \
  administrate/tests/services/test_tutorial_event_webhook_handler.py \
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

### 2.4 Send a test delivery (happy path requires a seeded `tutorial_events` row)

The handler looks up `acted.tutorial_events` by `code = node.title` (exact match). Master-data FKs (`location`, `venue`, `course_template`) are resolved through the `adm.locations.tutorial_location` etc. bridges. Three seeding options, in order of realism:

**Option A (recommended): seed via existing sync commands** — uses real Administrate data:

```bash
python manage.py sync_course_templates
python manage.py sync_locations
python manage.py sync_instructors
python manage.py sync_venues
```

You also need at least one `acted.tutorial_events` row whose `code` matches the title in your test payload. Easiest way is to import a CSV via `python manage.py import_tutorial_events_csv <path>` if you have one handy.

**Option B (offline smoke test): seed minimal rows via shell.** Pick a `code` for your test event (e.g. `SMOKE-1-26S`) and pre-create the master row, the bridge master data, and the `WebhookRegistration` mapping. Copy-paste this whole block at once — the Python lines must be at column 0 or Python raises `IndentationError`:

```bash
python manage.py shell <<'PY'
from administrate.models import (
    CourseTemplate, Location, Instructor, Venue, WebhookRegistration,
)
from tutorials.models import (
    TutorialEvents, TutorialLocation, TutorialVenue, TutorialInstructor,
)
# Tutorials-side master data + bridges from adm.* to tutorials.*
tloc = TutorialLocation.objects.create(name='Smoke Location')
tven = TutorialVenue.objects.create(name='Smoke Venue', location=tloc)
tins = TutorialInstructor.objects.create(is_active=True)
loc = Location.objects.create(external_id='loc_smoke', tutorial_location=tloc)
Venue.objects.create(external_id='ven_smoke', location=loc, tutorial_venue=tven)
Instructor.objects.create(external_id='ins_smoke', tutorial_instructor=tins)
CourseTemplate.objects.create(external_id='ct_smoke')
# WebhookRegistration: Administrate's payload only echoes webhook_id; we
# look up the type name in this table at ingress.
WebhookRegistration.objects.create(
    administrate_webhook_id='wh_smoke_1',
    name='Smoke Updated',
    webhook_type_name='Event Updated',
)
# The master row that the webhook handler will look up by code=title.
# NOTE: you'll need an existing store.TutorialProduct to satisfy the
# NOT NULL FK — see administrate/tests/test_webhook_end_to_end.py for
# the minimal store_product fixture chain.
print('Seeded master data + WebhookRegistration. Now create a TutorialEvents '
      'row with code=\"SMOKE-1-26S\" pointing at any TutorialProduct.')
PY
```

**Option C (skip the master row): provoke a dead-letter on purpose.** Skip the `TutorialEvents` row creation. The webhook will reach the handler, fail to find a matching code, and the inbox row will be marked `dead` with a `MissingDependencyError('TutorialEvents', 'SMOKE-1-26S')` message. Useful for verifying the dead-letter path without building the full master row.

Then POST a synthetic delivery (replace tokens with your `.env.development` values; payload uses Administrate's actual snake_case envelope):

```bash
ROUTE_TOKEN="<your route token from .env.development>"
SECRET="<your shared secret from .env.development>"

curl -i -X POST "http://127.0.0.1:8888/api/administrate/webhooks/${ROUTE_TOKEN}/event/" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "metadata": {
    "user": {"email": null},
    "instance": "https://local-smoke.test",
    "triggered_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "sent_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "context": "graphql",
    "webhook_id": "wh_smoke_1",
    "is_retry": false
  },
  "payload": {
    "node": {
      "id": "evt_smoke_1",
      "title": "SMOKE-1-26S",
      "lifecycleState": "PUBLISHED",
      "cancelledAt": null,
      "isSoldOut": false,
      "learningMode": "CLASSROOM",
      "maxPlaces": 30,
      "minPlaces": 5,
      "location": {"id": "loc_smoke"},
      "venue": {"id": "ven_smoke"},
      "courseTemplate": {"id": "ct_smoke"},
      "timeZoneName": "Europe/London",
      "lmsStart": "2026-09-01T09:00:00Z",
      "lmsEnd": "2026-12-01T17:00:00Z",
      "registrationDeadline": "2026-08-25T23:59:59Z",
      "updatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
      "customFieldValues": []
    }
  },
  "configuration": {"secret": "${SECRET}"}
}
EOF
```

**Expected response:**
- With Option A or B (matching `tutorial_events.code` exists): `HTTP/1.1 202 Accepted` with body `{"status": "queued", "inbox_id": <N>}`. The inbox row reaches `applied`, `tutorial_events` is updated, and the `adm.events` bridge row is upserted.
- With Option C (no matching code): same `HTTP/1.1 202 Accepted` (we always accept the delivery), but the inbox row reaches `dead` with `MissingDependencyError('TutorialEvents', 'SMOKE-1-26S')`. Verify with Section 2.5.

### 2.5 Verify the row was applied

```bash
python manage.py administrate_webhooks_inbox show <N>
```

**Expected fields (Option A or B — happy path):**
- `status: applied`
- `attempts: 1`
- `applied_at: <recent timestamp>`
- `error_message:` (empty)

**Expected fields (Option C — dead-letter path):**
- `status: dead`
- `attempts: 1`
- `error_message:` contains `MissingDependencyError: TutorialEvents external_id='SMOKE-1-26S'`
- Operator workflow: create the `tutorial_events` row matching the title, then `python manage.py administrate_webhooks_inbox replay <N>`.

For Option A or B, verify the master row updated and the bridge linked it:

```bash
python manage.py shell -c "from tutorials.models import TutorialEvents; te = TutorialEvents.objects.get(code='SMOKE-1-26S'); print(te.lifecycle_state, te.external_id)"
```

Expected output: `PUBLISHED evt_smoke_1`

```bash
python manage.py shell -c "from administrate.models import Event; ev = Event.objects.get(external_id='evt_smoke_1'); print(ev.tutorial_event.code if ev.tutorial_event else 'unlinked')"
```

Expected output: `SMOKE-1-26S`

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

**Duplicate delivery → 200:** The dedup UNIQUE constraint is on `(administrate_webhook_id, entity_external_id, administrate_event_timestamp)` together — sourced from `metadata.webhook_id`, `payload.node.id`, and `metadata.triggered_at`. The Section 2.4 payload uses `$(date ...)` which the shell re-evaluates on every paste, so two casual re-sends create two distinct deliveries (different timestamps → no collision). To actually exercise dedup, use a **fixed** timestamp on both POSTs. Paste this block twice in succession:

```bash
ROUTE_TOKEN="<your route token>"

curl -i -X POST "http://127.0.0.1:8888/api/administrate/webhooks/${ROUTE_TOKEN}/event/" \
  -H "Content-Type: application/json" \
  -d @- <<'EOF'
{
  "metadata": {
    "user": {"email": null},
    "instance": "https://local-smoke.test",
    "triggered_at": "2026-05-15T10:00:00Z",
    "sent_at": "2026-05-15T10:00:00Z",
    "context": "graphql",
    "webhook_id": "wh_smoke_1",
    "is_retry": false
  },
  "payload": {"node": {
    "id": "evt_smoke_1",
    "title": "SMOKE-1-26S",
    "lifecycleState": "PUBLISHED",
    "cancelledAt": null,
    "isSoldOut": false,
    "learningMode": "CLASSROOM",
    "maxPlaces": 30, "minPlaces": 5,
    "location": {"id": "loc_smoke"},
    "venue": {"id": "ven_smoke"},
    "courseTemplate": {"id": "ct_smoke"},
    "timeZoneName": "Europe/London",
    "lmsStart": "2026-09-01T09:00:00Z",
    "lmsEnd": "2026-12-01T17:00:00Z",
    "registrationDeadline": "2026-08-25T23:59:59Z",
    "updatedAt": "2026-05-15T10:00:00Z",
    "customFieldValues": []
  }},
  "configuration": {"secret": "<your shared secret>"}
}
EOF
```

- **First paste:** `HTTP/1.1 202 Accepted`, body `{"status":"queued","inbox_id":<N>}`.
- **Second paste:** `HTTP/1.1 200 OK`, body `{"status":"duplicate"}`. No new inbox row.

(Notice the `<<'EOF'` is **quoted** — single quotes around `EOF`. That suppresses shell variable expansion in the heredoc, so `$(date)` and `${SECRET}` are NOT interpolated. The unquoted `<<EOF` in Section 2.4 *does* interpolate, which is why Section 2.4 produces a fresh timestamp on every paste. You'll need to substitute the secret manually inside the quoted heredoc — that's the trade-off for fixed timestamps.)

**Diagnosing if you accidentally created a fresh row instead of triggering dedup:**

```bash
python manage.py administrate_webhooks_inbox show <inbox_id>
```

Look at `triggered_at` in the dumped `raw_payload.metadata`. If two rows for the same event have *different* timestamps, the shell ran `$(date)` twice — use the fixed-timestamp block above instead.

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

Fixture files in [`administrate/tests/fixtures/webhooks/`](../backend/django_Admin3/administrate/tests/fixtures/webhooks/) were updated 2026-05-15 to match Administrate's real envelope (`metadata.webhook_id`, `triggered_at`, `payload.node`). If Administrate ever changes the shape, refresh the fixtures:

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
5. The `raw_payload` JSON is what Administrate actually sends. Copy it into [`administrate/tests/fixtures/webhooks/event_updated.json`](../backend/django_Admin3/administrate/tests/fixtures/webhooks/event_updated.json), then re-run the test suite. Adjust [`map_node_to_tutorial_event_fields`](../backend/django_Admin3/administrate/services/webhook_handlers.py) if any field shape differs.
6. Repeat for Created (publish a draft event) and Cancelled (cancel a test event).
7. Commit the updated fixtures.

### 3.6 Verify end-to-end against UAT

After Section 3.4, trigger an event change in Administrate's UI and check:

```bash
# Most recent applied delivery
DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat \
python manage.py administrate_webhooks_inbox list --status applied --limit 1
```

Then verify the master row reflects the change. Replace `<CODE>` with the `tutorial_events.code` you targeted (e.g. `CM1-65-26A`):

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat \
  python manage.py shell -c "from tutorials.models import TutorialEvents; te = TutorialEvents.objects.get(code='<CODE>'); print(te.lifecycle_state, te.external_id, te.lms_start_date)"
```

And verify the `adm.events` bridge row points at the master:

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.uat \
  python manage.py shell -c "from administrate.models import Event; ev = Event.objects.get(external_id='<EVT_ID>'); print(ev.tutorial_event.code if ev.tutorial_event else 'unlinked')"
```

If the inbox row went to `dead` instead of `applied`, the most likely cause is "no `tutorial_events.code` matches `node.title`". Create the master row first (or fix the mismatch), then `python manage.py administrate_webhooks_inbox replay <inbox_id>`.

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

To roll the migration back too (note: the schema spans both `administrate` and `tutorials` apps after the 2026-05-15 refactor — roll both back together):

```bash
python manage.py migrate administrate 0009
python manage.py migrate tutorials 0024_attendance_sync_job
```

This drops `WebhookInbox`, `WebhookRegistration`, and the Administrate-derived columns on `acted.tutorial_events`. Existing `tutorial_events` rows survive — the columns being removed are all nullable extensions, never the canonical fields like `code` or `store_product`.

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

The error message tells you which model and external_id is missing. Two main flavours after the tutorial-events-as-master refactor:

**Flavour A — no matching `tutorial_events.code`** (the most common after the 2026-05-15 refactor; happens when Administrate creates a brand-new event):

```
MissingDependencyError: TutorialEvents external_id='CB1-15-26S'
```

Operator workflow:

1. Identify the title/code Administrate sent: `python manage.py administrate_webhooks_inbox show <inbox_id>` and look at `raw_payload.payload.node.title`.
2. Create the `tutorial_events` row with `code=<that title>` and the right `store_product`. Easiest paths: import a CSV via `import_tutorial_events_csv`, or manually create through Django admin.
3. Replay: `python manage.py administrate_webhooks_inbox replay <inbox_id>`.

**Flavour B — missing Administrate-side master data** (a `Location`, `Venue`, `CourseTemplate`, or `Instructor` that the bridge can't resolve):

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
| Per-type handlers + tutorial-events mapper (`map_node_to_tutorial_event_fields`, `_upsert_tutorial_event`) | [`administrate/services/webhook_handlers.py`](../backend/django_Admin3/administrate/services/webhook_handlers.py) |
| Bridge model (Administrate id → tutorial_events FK) | [`administrate/models/events.py`](../backend/django_Admin3/administrate/models/events.py) |
| Master row (acted.tutorial_events) | [`tutorials/models/tutorial_events.py`](../backend/django_Admin3/tutorials/models/tutorial_events.py) |
| Webhook id → type-name mapping | [`administrate/models/webhook_registration.py`](../backend/django_Admin3/administrate/models/webhook_registration.py) |
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

## Part 7 — Resolved UAT-time adaptations (historical)

These items were unknowns when the slice first shipped; all were resolved during 2026-05-15 UAT.

1. ✅ **GraphQL mutation envelope** — Administrate uses the plural `webhooks { create }` / `webhooks { update }` (not singular `webhook`). The `update` form takes `webhookId` (not `id`) and rejects `webhookTypeId` since type is immutable post-create. Code in [`administrate_webhooks.py`](../backend/django_Admin3/administrate/management/commands/administrate_webhooks.py) is correct.
2. ✅ **`webhooks(filters:[...])`** argument syntax — Administrate accepts the filter form but the supported `field` enums aren't documented; the code uses list-all + client-side filter via `_find_by_name` (bulletproof for ~3 webhooks).
3. ✅ **Test fixture files** — [`administrate/tests/fixtures/webhooks/`](../backend/django_Admin3/administrate/tests/fixtures/webhooks/) updated to match Administrate's real envelope (`metadata.webhook_id`, `triggered_at`, `payload.node`, snake_case throughout). 2026-05-15.
4. ✅ **`lifecycleState` value casing** — Administrate emits lowercase (`"published"`, `"cancelled"`). The new `map_node_to_tutorial_event_fields` doesn't normalise; values land lowercase on `tutorial_events.lifecycle_state`. The `Event Cancelled` handler explicitly forces `'CANCELLED'` (uppercase) regardless of payload.
5. ✅ **Webhook payload schema** — Administrate's typed `Event` interface lacks several fields the original code expected: `cancelled` (derive from `cancelledAt`), `webSale` / `eventUrl` (custom-field values keyed by base64 `definitionKey`), `primaryInstructor` (in `staff` connection — not fetchable in webhook query). All accommodated.
6. ✅ **No `id` field on `WebhookUpdateInput`** — Administrate's update mutation addresses by `webhookId`, not `id`. Code uses the correct shape.

### Open architectural notes (still relevant)

**Async backend.** This slice uses `django.tasks.backends.immediate.ImmediateBackend` (handlers run in-request) because Django 6.0.1 ships only the immediate backend. To swap to a real DB-backed queue (django-q2, future `django.tasks.backends.database`):

- Change one line in [`settings/base.py`](../backend/django_Admin3/django_Admin3/settings/base.py) `TASKS['default']['BACKEND']`.
- Add a worker process to deployment (e.g. `python manage.py db_worker --queue-name administrate_webhooks` once the framework supports it).
- The view's `dispatch_inbox_task` indirection and the `apply_inbox_row` retry logic stay unchanged.

**`store_product` NOT NULL on `tutorial_events`.** Brand-new Administrate events without a pre-existing `tutorial_events` row dead-letter (since the webhook payload doesn't carry store_product info). Operator workflow: create the master row first, then replay. This is by design — see [`docs/superpowers/plans/2026-05-15-tutorial-events-as-master-refactor.md`](superpowers/plans/2026-05-15-tutorial-events-as-master-refactor.md) §"Risks and edge cases" #4.

---

## 8. Session + Learner webhook expansion (2026-05-18)

Extended the original Event-only slice to cover 5 new webhook types
across 2 new entity domains. CSV bulk import remains the source of
truth for *initial setup* (and for ongoing attendance); webhooks handle
*daily enrolment-lifecycle updates*.

### 8.1 New webhook types and routes

**Session events** — ingress URL `/api/administrate/webhooks/<token>/session/`:

- `Session Created` → `handle_session_created`
- `Session Updated` → `handle_session_updated`
- `Session Deleted` → `handle_session_deleted`

**Learner events** — ingress URL `/api/administrate/webhooks/<token>/learner/`:

- `Learner Created` → `handle_learner_created`
- `Learner Cancelled` → `handle_learner_cancelled`

**Not registered (by design):** `Learner Attended Session`. Attendance
flows through `tutorials.TutorialAttendance` via the existing CSV import
and public-attendance views path. We don't mirror attendance state on
the Administrate side — there's no `adm.learner_attendance` bridge.

Per-entity routes (instead of one polymorphic route) preserve the
existing per-entity deployment kill-switch — disabling a route at the
load-balancer level stops only that entity's webhooks from being
accepted. Handler dispatch is still keyed off `webhook_type_name`
from the local `WebhookRegistration` table (Administrate's payload
doesn't echo a type label).

### 8.2 New bridge models (`adm` schema)

All four are thin "mapper-only" bridges following the
`adm.events` / `adm.sessions` thin-bridge pattern (PR #120, Phase 2 of
this PR). No data columns — `external_id` + FK to the acted master +
timestamps.

- **`adm.contacts`** → `students.Student`. 1:1 OneToOne with unique
  `external_id`.
- **`adm.sessions`** → `tutorials.TutorialSessions`. 1:1, refactored
  from data-carrying model in Phase 2 of this PR.
- **`adm.learners`** → `tutorials.TutorialRegistration`. Composite
  unique on `(external_id, tutorial_registration)` — one Administrate
  Learner spans N session-level registrations (Option α cardinality).

### 8.3 Recovery workflow per entity

The standard dead-letter recovery pattern (fix upstream, then replay)
applies, with these per-entity nuances:

- **Session Created/Updated/Deleted**: handler resolves the parent
  `adm.events.Event` from `payload.node.event.id` and walks to the
  `tutorial_events` row. Dead-letters if: the bridge doesn't exist
  (replay parent Event webhook first), the bridge has `tutorial_event=NULL`
  (link the bridge first), or no `tutorial_sessions` row matches
  `(tutorial_event, title)` (operator workflow: run the session CSV
  import for that event, then replay).
- **Learner Created**: lazy-creates `adm.contacts` from
  `learner.contact` via `personalName.middleName` → `Student.student_ref`.
  Dead-letters on empty/non-numeric middleName or unknown student_ref.
  Then iterates `attendance.sessionDetail.edges` and creates one
  `TutorialRegistration` + `adm.Learner` per session; dead-letters if any
  `adm.sessions` bridge is missing or unlinked.
- **Learner Cancelled**: deactivates every `TutorialRegistration` reached
  via the bridge — soft-delete via `is_active=False` + `deactivated_at`.
  Bridge rows survive (audit history). Dead-letters if no
  `adm.Learner` row exists for the learner id.

### 8.4 Schema prep that landed alongside this work

- `tutorial_sessions.cancelled` (BooleanField, default False): receives
  the cancellation state. The Session Deleted webhook sets this rather
  than hard-deleting — preserves attendance/registration history.
- `tutorial_sessions.start_date` / `end_date`: now nullable. Administrate's
  Session typed interface doesn't expose dates (sessions inherit
  scheduling from the parent Event in their model), so webhook-created
  rows land with NULL dates until CSV bulk import populates them.
- `adm.sessions`: refactored from data-carrying (title, day_number,
  classroom_*, session_instructor, session_url, cancelled, event FK) into
  a thin bridge (external_id + tutorial_session FK only). Data backfill
  and column drop both live in
  [migration 0014](../backend/django_Admin3/administrate/migrations/0014_session_thin_bridge_refactor.py).

### 8.5 GraphQL queries (registered)

Three query strings ship as Python constants in
[`administrate_webhooks.py`](../backend/django_Admin3/administrate/management/commands/administrate_webhooks.py):

- `EVENT_WEBHOOK_QUERY` (unchanged from §2)
- `SESSION_WEBHOOK_QUERY`: fetches `title`, `event.id`, `venue.id`,
  `location.id`, and `customFieldValues` (handler filters by
  `definitionKey` for URL / sequence / recording).
- `LEARNER_WEBHOOK_QUERY`: fetches `lifecycleState`, `contact.id`,
  `contact.personalName.middleName`, `event.id`, and the
  `attendance.sessionDetail` subtree with `session.id` only (we don't
  fetch `attendanceMark` — attendance writes through other paths, not
  this flow). Same query is registered for `Learner Created` and
  `Learner Cancelled` (handler dispatches by `webhook_type_name`).

Re-running `python manage.py administrate_webhooks register` is
idempotent — it updates existing webhooks by name rather than duplicating.

### 8.6 Contact gap (intentional)

We did *not* register `Contact Created` / `Contact Updated` webhooks in
this slice. Reasoning: Learner Created already needs the contact data
(to resolve student), so it lazy-creates the `adm.Contact` bridge on
first encounter. Adding a separate Contact webhook would double-write
the bridge with no functional benefit. If we ever need
contact-only updates (rename / email change without a fresh enrolment),
add the webhook + a `handle_contact_updated` that re-resolves the
student and updates the bridge.
