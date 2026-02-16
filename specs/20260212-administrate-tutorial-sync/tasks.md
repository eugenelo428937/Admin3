# Tasks: Administrate-Tutorial Bidirectional Sync

**Input**: Design documents from `/specs/20260212-administrate-tutorial-sync/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/sync-commands.md, quickstart.md

**Tests**: Included — CLAUDE.md mandates TDD with 80%+ coverage for new code.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/django_Admin3/` (Django project root)
- **App**: `backend/django_Admin3/administrate/` (primary app being modified)
- **Tests**: `backend/django_Admin3/administrate/tests/`
- **Commands**: `backend/django_Admin3/administrate/management/commands/`
- **Utils**: `backend/django_Admin3/administrate/utils/`
- **Models**: `backend/django_Admin3/administrate/models/`
- **Migrations**: `backend/django_Admin3/administrate/migrations/`

---

## Database Schema Assertions

Tasks that create, move, or rename database tables MUST include a verification step that queries `information_schema.tables` to confirm the table is in the expected schema. Proxy assertions (CRUD operations, source code inspection) are NOT sufficient for schema-level tasks.

**Required test pattern for schema tasks:**

```python
def test_table_in_expected_schema(self):
    """Verify table physically resides in the correct PostgreSQL schema."""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = %s AND table_name = %s",
            ['adm', 'events'],
        )
        self.assertIsNotNone(cursor.fetchone())
```

**Convention:** `db_table` values MUST use quoted format: `'"adm"."events"'`

---

## Phase 1: Setup

**Purpose**: Branch creation and project initialization

- [x] T001 Create feature branch `20260212-administrate-tutorial-sync` from main

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared utilities, model changes, and migration that ALL user stories depend on

**Why blocking**: US1-US4 all need `sync_helpers.py` for matching/reporting/prompting. US3 needs the `tutorial_event` FK on Event. The `db_table` fix affects all queries against `adm.events` and `adm.sessions`.

### Tests (RED phase)

- [x] T002 [P] Write tests for SyncStats dataclass, match_records(), report_discrepancies(), prompt_create_unmatched(), and validate_dependencies() in `administrate/tests/test_sync_helpers.py`
- [x] T003 [P] Write schema assertion tests for Event/Session db_table fix (`"adm"."events"` / `"adm"."sessions"`) and Event.tutorial_event FK existence in `administrate/tests/test_migrations.py`

### Implementation (GREEN phase)

- [x] T004 Create `administrate/utils/sync_helpers.py` with SyncStats dataclass, match_records(), report_discrepancies(), prompt_create_unmatched(), and validate_dependencies() per contracts/sync-commands.md interface
- [x] T005 Fix db_table format on Event model (`'adm.events'` → `'"adm"."events"'`) and Session model (`'adm.sessions'` → `'"adm"."sessions"'`) in `administrate/models/events.py`
- [x] T006 Add `tutorial_event` FK field to Event model in `administrate/models/events.py` — nullable, SET_NULL, related_name='adm_events', pointing to 'tutorials.TutorialEvents'
- [x] T007 Create migration `administrate/migrations/0007_add_event_tutorial_fk.py` with dependencies on `("administrate", "0006_remove_redundant_adm_columns")` and `("tutorials", "0010_move_instructors_to_sessions")` — includes AlterModelTable for Event, AlterModelTable for Session, and AddField for tutorial_event FK
- [x] T008 Run migration, verify with `python manage.py verify_schema_placement`, and run tests to confirm GREEN

**Checkpoint**: Foundation ready — shared utilities exist, Event model has tutorial_event FK, db_table format is correct. User story implementation can now begin.

---

## Phase 3: User Story 1 — Sync Course Templates (Priority: P1) 🎯 MVP

**Goal**: The `sync_course_templates` command matches Administrate API course templates against `acted.tutorial_course_templates` by code, links them via FK in `adm.course_templates`, and reports discrepancies in both directions.

**Independent Test**: Run `python manage.py sync_course_templates --debug` with test data in both tutorial_course_templates and mock API responses; verify `adm.course_templates` records have correct `external_id` and `tutorial_course_template` FK values.

**Functional Requirements**: FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-017, FR-021

### Tests (RED phase)

- [x] T009 [P] [US1] Write tests for sync_course_templates tutorial matching: matched records get FK set, unmatched tutorial records reported, unmatched API records reported, --no-prompt skips prompting, CustomField dependency validation — in `administrate/tests/test_sync_course_templates.py`

### Implementation (GREEN phase)

- [x] T010 [US1] Add `--no-prompt` argument to `sync_course_templates.py` argument parser (add_arguments method)
- [x] T011 [US1] Add tutorial_course_template loading (keyed by lowercase code) and call `sync_helpers.match_records()` to match API records in `sync_course_templates.py`
- [x] T012 [US1] Set `tutorial_course_template` FK on `adm.CourseTemplate` during create/update for matched records in `sync_course_templates.py`
- [x] T013 [US1] Add discrepancy reporting via `sync_helpers.report_discrepancies()` and create-unmatched prompting via `sync_helpers.prompt_create_unmatched()` at end of sync in `sync_course_templates.py`
- [x] T014 [US1] Add CustomField dependency validation via `sync_helpers.validate_dependencies()` at start of `sync_course_templates.py` handle method

**Checkpoint**: `sync_course_templates` fully links tutorial and Administrate course templates. Can be tested independently.

---

## Phase 4: User Story 2 — Sync Reference Data (Priority: P1)

**Goal**: Sync commands for locations, venues, instructors, custom fields, and price levels all match against tutorial tables (where applicable), support `--no-prompt`, and a master `sync_all` runs them in dependency order.

**Independent Test**: Run each sync command individually and verify FK linking; then run `python manage.py sync_all --debug --no-prompt` and verify all 7 commands complete.

**Functional Requirements**: FR-001 through FR-009, FR-018, FR-019, FR-020, FR-021, FR-022

### Tests (RED phase)

- [x] T015 [P] [US2] Write tests for sync_locations tutorial matching (name-based, case-insensitive) and --no-prompt in `administrate/tests/test_sync_locations.py`
- [x] T016 [P] [US2] Write tests for sync_venues tutorial matching (name + location chain resolution) and --no-prompt in `administrate/tests/test_sync_venues.py`
- [x] T017 [P] [US2] Write tests for sync_instructors tutorial matching (first_name + last_name via Staff→User) and --no-prompt in `administrate/tests/test_sync_instructors.py`
- [x] T018 [P] [US2] Write tests for sync_all orchestrator: correct execution order, --debug/--no-prompt pass-through, --skip-errors continues on failure, dependency validation — in `administrate/tests/test_sync_all.py`

### Implementation: Locations (GREEN phase)

- [x] T019 [US2] Add `--no-prompt` argument and tutorial location matching (keyed by lowercase name) to `sync_locations.py` — set `tutorial_location` FK, add discrepancy reporting and prompting

### Implementation: Venues (GREEN phase)

- [x] T020 [US2] Add `--no-prompt` argument and tutorial venue matching (keyed by lowercase name + location) to `sync_venues.py` — resolve location chain: API location.id → `adm.locations.external_id` → `adm.locations.tutorial_location` → `TutorialVenue.location`; set `tutorial_venue` FK, add discrepancy reporting, add Location dependency validation

### Implementation: Instructors (GREEN phase)

- [x] T021 [US2] Add `--no-prompt` argument and tutorial instructor matching (keyed by lowercase first_name + last_name from Staff→User) to `sync_instructors.py` — set `tutorial_instructor` FK, add discrepancy reporting and prompting

### Implementation: Administrate-Owned Entities (GREEN phase)

- [x] T022 [P] [US2] Add `--no-prompt` flag to `sync_custom_fields.py` argument parser (no tutorial matching needed — Administrate-owned data)
- [x] T023 [P] [US2] Add `--no-prompt` flag to `sync_price_levels.py` argument parser (no tutorial matching needed — Administrate-owned data)

### Implementation: Master Sync Orchestrator (GREEN phase)

- [x] T024 [US2] Create `sync_all.py` management command in `administrate/management/commands/` — runs all 7 sync commands in order (custom_fields → price_levels → locations → venues → instructors → course_templates → course_template_price_levels), supports `--debug`, `--no-prompt`, `--skip-errors` flags, reports per-command and total stats per contracts/sync-commands.md output format

**Checkpoint**: All 7 sync commands support `--no-prompt` and tutorial FK linking. `sync_all` orchestrates them in dependency order. Each command testable independently.

---

## Phase 5: User Story 3 — Event Importer Dual-Write (Priority: P2)

**Goal**: The event importer creates `acted.tutorial_events` and `acted.tutorial_sessions` records FIRST, then calls the Administrate API, then stores the returned external_id in `adm.events` via the new `tutorial_event` FK. If the API fails, local tutorial records survive.

**Independent Test**: Run `python manage.py import_events sample.xlsx --dry-run --debug` to validate; then run without `--dry-run` and verify records in both `acted.tutorial_events`/`tutorial_sessions` and `adm.events`.

**Functional Requirements**: FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-016

### Tests (RED phase)

- [x] T025 [P] [US3] Write tests for create_tutorial_event(): validates FK resolution (store_product, location, venue), creates TutorialEvents record — in `administrate/tests/test_event_importer.py`
- [x] T026 [P] [US3] Write tests for create_tutorial_session(): creates TutorialSessions record linked to parent event, creates M2M instructor links — in `administrate/tests/test_event_importer.py`
- [x] T027 [P] [US3] Write tests for create_event_bridge_record(): creates adm.Event with external_id and tutorial_event FK — in `administrate/tests/test_event_importer.py`
- [x] T028 [P] [US3] Write tests for API failure handling: tutorial records preserved when Administrate API fails, error reported — in `administrate/tests/test_event_importer.py`

### Implementation (GREEN phase)

- [x] T029 [US3] Implement `create_tutorial_event(row_data, debug)` in `administrate/utils/event_dual_write.py` — resolve store_product FK (course_template → subject → exam_session → product), TutorialLocation FK, TutorialVenue FK from row data
- [x] T030 [US3] Implement `create_tutorial_session(row_data, tutorial_event, debug)` in `administrate/utils/event_dual_write.py` — create TutorialSessions record, resolve and create TutorialSessionInstructors M2M links
- [x] T031 [US3] Implement `create_event_bridge_record(tutorial_event, api_event_id, row_data, debug)` in `administrate/utils/event_dual_write.py` — create/update adm.Event with external_id and tutorial_event FK
- [x] T032 [US3] Integrate tutorial record creation into main event importer flow in `administrate/utils/event_importer.py` — imports from event_dual_write.py; modify `create_administrate_events()` to call create_tutorial_event() → API call → create_event_bridge_record() in sequence; sessions follow same local-first pattern
- [x] T033 [US3] Add API failure handling: wrap Administrate API calls in try/except, preserve local tutorial records on failure, report error with retry details in `administrate/utils/event_importer.py`

**Checkpoint**: Event importer creates records in both tutorial tables and Administrate. Local records survive API failures. Bridge records link both systems.

---

## Phase 6: User Story 4 — Sync Course Template Price Levels (Priority: P3)

**Goal**: The `sync_course_template_price_levels` command resolves FKs through `adm.*` bridge tables, supports `--no-prompt`, and validates that course templates and price levels are synced before running.

**Independent Test**: Run `python manage.py sync_course_template_price_levels --debug` after course templates and price levels are synced; verify `adm.course_template_price_levels` records have correct amounts and FKs.

**Functional Requirements**: FR-009, FR-021

### Tests (RED phase)

- [x] T034 [P] [US4] Write tests for sync_course_template_price_levels dependency validation (fails if no CourseTemplate or PriceLevel records exist) and --no-prompt flag in `administrate/tests/test_sync_course_template_price_levels.py`

### Implementation (GREEN phase)

- [x] T035 [US4] Add `--no-prompt` flag and dependency validation (CourseTemplate + PriceLevel must exist) via `sync_helpers.validate_dependencies()` to `sync_course_template_price_levels.py`

**Checkpoint**: Course template price levels sync with proper dependency validation and non-interactive support.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification, coverage, and cleanup across all user stories

- [x] T036 Run full test suite (`python manage.py test administrate --verbosity=2`) — 105 tests, 104 passed, 1 skipped (external API), 0 failures
- [x] T037 [P] Run `python manage.py verify_schema_placement` to confirm all db_table formats are correct — events and sessions added to verification list
- [x] T038 Run quickstart.md verification checklist (all 12 items from quickstart.md § Verification Checklist) — all 12 items PASS
- [x] T039 [P] Investigate Administrate GraphQL API for create mutations (course templates, locations, venues, instructors) — API only supports event-related mutations; create mutations for reference data entities not available; prompt_create_unmatched() fallback handles gracefully

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — **BLOCKS all user stories**
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (P1) and US2 (P1) can proceed in parallel after Foundation
  - US3 (P2) depends on US1 + US2 (needs linked reference data for FK resolution)
  - US4 (P3) depends on US1 (needs synced course templates) and US2 (needs synced price levels)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 2: Foundation
    ├──→ US1: Course Templates (P1) ──┐
    │                                  ├──→ US3: Event Importer (P2)
    ├──→ US2: Reference Data (P1) ───┘
    │         ├──→ US4: Price Levels (P3)
    │         └── (internally: locations before venues, custom_fields before course_templates)
    └──→ Phase 7: Polish (after all stories)
```

### Within Each User Story

1. Tests MUST be written and FAIL before implementation (TDD RED phase)
2. Implementation follows contracts/sync-commands.md interface specifications
3. Each story independently testable after completion
4. Run `python manage.py test apps.administrate` before marking story complete

### Parallel Opportunities

**Phase 2 (Foundation)**:
- T002 and T003 can run in parallel (different test files)

**Phase 3-4 (US1 + US2 after Foundation)**:
- US1 and US2 can start in parallel (no cross-dependencies)
- Within US2: T015, T016, T017, T018 (all test tasks) can run in parallel
- Within US2: T022 and T023 can run in parallel (different files, no tutorial matching)

**Phase 5 (US3)**:
- T025, T026, T027, T028 (all test tasks) can run in parallel (same file but different test classes)

---

## Parallel Example: User Story 2

```bash
# Launch all test tasks in parallel (different test files):
Task T015: "Tests for sync_locations in test_sync_locations.py"
Task T016: "Tests for sync_venues in test_sync_venues.py"
Task T017: "Tests for sync_instructors in test_sync_instructors.py"
Task T018: "Tests for sync_all in test_sync_all.py"

# After tests written, launch independent implementations in parallel:
Task T022: "Add --no-prompt to sync_custom_fields.py"
Task T023: "Add --no-prompt to sync_price_levels.py"

# Sequential implementations (each touches one file, but venues depends on locations):
Task T019: "sync_locations tutorial matching" → then
Task T020: "sync_venues tutorial matching" → then
Task T021: "sync_instructors tutorial matching" → then
Task T024: "sync_all orchestrator"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002-T008)
3. Complete Phase 3: User Story 1 (T009-T014)
4. **STOP and VALIDATE**: Run `python manage.py sync_course_templates --debug` with test data
5. Course template sync works end-to-end → MVP delivered

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test course template sync → MVP!
3. Add User Story 2 → Test all reference data sync + sync_all → Full sync capability
4. Add User Story 3 → Test event importer dual-write → Core workflow complete
5. Add User Story 4 → Test price level sync → Pricing linked
6. Polish → Full verification → Feature complete

### Suggested MVP Scope

**US1 (Phase 3)** alone delivers the most critical sync capability — course templates are the foundational entity. This is a meaningful, testable, and deployable increment after the foundational phase.
