# Plan: Make `acted.tutorial_events` the master; reduce `adm.events` to a bridge

**Status:** Draft, awaiting review.
**Owner:** eugenelo428937
**Date:** 2026-05-15
**Related branch:** likely needs its own branch (current `feat/20260514-administrate-event-webhook-intake` is the wrong scope)

## Goal

Eliminate the redundancy where Administrate event data is stored once on
`adm.events` and partially on `acted.tutorial_events`. End state:

- `acted.tutorial_events` carries all the Administrate-derived event fields.
- `adm.events` shrinks to a thin bridge: `(id, external_id, tutorial_event_id)`.
- The Administrate webhook updates `acted.tutorial_events` directly.
- `adm.events.external_id` remains the join key from local data to
  Administrate (for sync, attendance, etc.).

## Decisions (confirmed)

1. **Event Created with no `tutorial_events.code` match → dead-letter.**
   Operator workflow: create the `tutorial_events` row (with its
   `store_product`), then `administrate_webhooks_inbox replay`.
2. **Replace `start_date`/`end_date` (Date) with `lms_start_date`/`lms_end_date` (DateTime).**
   Migrate existing data; update every read site in the codebase to
   accept DateTime.
3. **Move every webhook-touched and adm-only field** from `adm.events`
   to `acted.tutorial_events`. Drop the columns from `adm.events`
   when migration completes.

## What stays where

| Concern | Lives on |
|---|---|
| Administrate id (the join key) | `adm.events.external_id` |
| Bridge to local entity | `adm.events.tutorial_event_id` (1:1 unique) |
| All event data (title, dates, status, capacity, urls, custom fields) | `acted.tutorial_events` |
| Sessions | `adm.sessions` (FK to `adm.events` stays for now; sessions are a separate refactor) |

## Field migration table

| Today on `adm.events` | New home on `acted.tutorial_events` | Notes |
|---|---|---|
| `external_id` | (stays on `adm.events`) | Bridge column |
| `tutorial_event` (FK) | (stays on `adm.events`) | Bridge column |
| `title` | `code` (already exists, unique) | Already mirrored |
| `lifecycle_state` | `lifecycle_state` (NEW) | DRAFT/PUBLISHED/CANCELLED |
| `learning_mode` | `learning_mode` (NEW) | CLASSROOM/BLENDED/LMS |
| `tutorial_category` | `tutorial_category` (NEW) | REGULAR/BLOCK/BUNDLE_5/6 |
| `cancelled` | `cancelled` (already exists) | Already mirrored |
| `sold_out` | `is_soldout` (already exists) | Rename in mapper |
| `web_sale` | `web_sale` (NEW) | |
| `max_places` | `max_places` (NEW) | |
| `min_places` | `min_places` (NEW) | |
| `lms_start_date` | `lms_start_date` (NEW DateTime) | Replaces `start_date` (Date) |
| `lms_end_date` | `lms_end_date` (NEW DateTime) | Replaces `end_date` (Date) |
| `registration_deadline` | `registration_deadline` (NEW) | |
| `event_url` | `event_url` (NEW) | |
| `virtual_classroom` | `virtual_classroom` (NEW) | |
| `timezone` | `timezone` (NEW) | |
| `sitting` | `sitting` (NEW) | |
| `administrator` | `administrator` (NEW) | |
| `ocr_moodle_code` | `ocr_moodle_code` (NEW) | |
| `sage_code` | `sage_code` (NEW) | |
| `recordings`, `recording_pin` | `recordings`, `recording_pin` (NEW) | |
| `extra_information`, `tutors`, `access_duration`, `session_title` | (NEW, all of them) | |
| `finalisation_date` (DateTime) | `finalisation_date` (already exists, currently Date) | **Type change Date → DateTime** |
| `course_template` (FK → `adm.course_templates`) | `course_template` (NEW FK → `adm.course_templates`) | Cross-schema FK from acted → adm |
| `location` (FK → `adm.locations`) | (kept as `tutorials.TutorialLocation`) | Resolved via `adm.locations.tutorial_location` bridge in webhook handler |
| `venue` (FK → `adm.venues`) | (kept as `tutorials.TutorialVenue`) | Resolved via `adm.venues.tutorial_venue` bridge |
| `primary_instructor` (FK → `adm.instructors`) | `main_instructor` (already exists, FK → `tutorials.TutorialInstructor`) | Resolved via `adm.instructors.tutorial_instructor` bridge |

## Phased plan

### PHASE 1 — Additive schema migration on `acted.tutorial_events`

- Add ~20 new columns. All nullable (so the migration applies without
  needing data first).
- New columns include `external_id` (CharField, unique, nullable for
  legacy rows that have never been linked to Administrate).
- New cross-schema FK `course_template` → `adm.course_templates`.
- Add new `lms_start_date`/`lms_end_date` DateTime columns alongside
  existing `start_date`/`end_date` Date columns.
- **No code changes yet.** The migration is reversible.

### PHASE 2 — New webhook handler targets `tutorial_events`

- Write `map_node_to_tutorial_event_fields(node)` mapper.
- Write `_upsert_tutorial_event(node)` handler that:
  1. Looks up `TutorialEvents.objects.filter(code=node['title']).first()`.
  2. If no match → raise `MissingDependencyError('TutorialEvents', node['title'])`.
  3. If match → update the row with mapped fields.
  4. Upsert `adm.events` bridge row: `(external_id=node['id'], tutorial_event=found)`.
- Keep the old `_upsert_event` handler around but stop registering it.
- All new handlers register against `'Event Updated'`/`'Event Created'`/`'Event Cancelled'`.
- Tests: rewrite `tests/services/test_webhook_handlers.py` to assert against
  the new mapper + dispatch path.

### PHASE 3 — Data migration (one-shot management command)

- `python manage.py migrate_adm_events_to_tutorial_events [--dry-run]`
- For each `adm.events` row WHERE `tutorial_event_id IS NOT NULL`:
  - Copy mapped fields to the linked tutorial_events row.
  - Convert `start_date`/`end_date` Date to `lms_start_date`/`lms_end_date`
    DateTime (midnight in `Europe/London`).
- For each `adm.events` row WHERE `tutorial_event_id IS NULL`:
  - Log + skip. Surface the count so staff can decide what to do
    (manual link or accept loss).
- Run UAT, verify counts, then run prod.

### PHASE 4 — Switch all writers + readers

- `sync_events`: rewrite to upsert `tutorial_events` (with bridge row),
  not `adm.events` directly.
- `import_event_sessions`: same.
- `attendance_sync_service`: switch reads from `AdmEvent` to
  `TutorialEvents` (joining via the bridge).
- Update `webhook_dispatch.EVENT_HANDLERS` to point at the new handlers.
- Drop the old `adm.events`-targeted code path entirely.

### PHASE 5 — Drop legacy columns from `adm.events`

- Migration: drop all columns except `id`, `external_id`,
  `tutorial_event_id`, `created_at`, `updated_at`.
- Drop `acted.tutorial_events.start_date`/`end_date` (replaced by
  `lms_start_date`/`lms_end_date`).
- Update `tutorial_events.finalisation_date` from Date to DateTime.

## Test scope (rough estimate)

- ~50 test files reference `Event` or `adm.events` columns, but most
  are integration tests that just need the fixture/factory updated.
- New tests needed for:
  - The new tutorial_events upsert handler (~6 tests).
  - The dead-letter path on no-code-match (~2 tests).
  - The cross-schema FK to `adm.course_templates` (~2 tests).
  - The data migration command (~4 tests including dry-run).
- Existing tests to update:
  - `test_webhook_handlers.py` — full rewrite of mapper assertions.
  - `test_webhook_end_to_end.py` — fixtures now produce
    tutorial_events rows.
  - `test_sync_events_cmd.py` — upsert target changes.
  - All consumers of `event.title`, `event.lifecycle_state`,
    `event.cancelled`, etc.

## Risks and edge cases

1. **Historical `adm.events` rows with no `tutorial_event` link.** Their
   data has no destination after the migration. We log + skip (Phase 3).
   Manual cleanup is operator's call.
2. **Cross-schema FK from `acted` → `adm`.** PostgreSQL handles it; Django
   handles it via `db_constraint=True` on the FK. Tests must use a real
   PG database (already the project default per `CLAUDE.md`).
3. **Date → DateTime conversion timezone**: Choose `Europe/London`
   midnight as the canonical conversion (matches `timezone` field default).
   Document in migration.
4. **`TutorialEvents.store_product` NOT NULL**: An Event Created webhook
   for a brand-new event without a pre-existing `tutorial_events` row
   *cannot* create one — must dead-letter (operator creates the row first).
   This is the single behavior change visible to staff: today these go
   straight into `adm.events`; after the refactor they fail until staff
   acts.
5. **Backward-compat reads**: Code that reads `event.title` etc. through
   `adm.events` will break in Phase 5. We catch this in Phase 4 by
   updating all consumers; the test suite is the safety net.

## Out of scope

- Sessions refactor (`adm.sessions` keeps its FK to `adm.events`).
- Master-data unification (`adm.locations` vs `tutorials.TutorialLocation`
  etc. stay separate).
- Any change to the registration command or webhook intake auth.

## Suggested execution branch

`refactor/20260515-tutorial-events-as-master`

The current branch (`feat/20260514-administrate-event-webhook-intake`)
should be merged first — its scope is "make webhooks work end-to-end",
which has been completed. This refactor is a separate concern.
