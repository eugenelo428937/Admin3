# Tasks: Tutorial Sessions and Schema Migration

**Input**: Design documents from `/specs/20260204-tutorial-sessions/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-response.yaml, quickstart.md
**Branch**: `20260204-tutorial-sessions`

**Tests**: TDD is MANDATORY per project constitution (CLAUDE.md). All tasks follow RED/GREEN/REFACTOR.

**Organization**: Tasks grouped by user story. US1 and US2 are independent (both P1). US3 depends on US2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in all descriptions

---

## Phase 1: Setup

**Purpose**: Verify branch and existing state before implementation

- [x] T001 Verify feature branch `20260204-tutorial-sessions` is checked out and up to date
- [x] T002 Verify `adm` and `acted` schemas exist in PostgreSQL database
- [x] T003 Run existing test suite to confirm green baseline with `python manage.py test` in `backend/django_Admin3/`

**Checkpoint**: Clean branch with passing tests — ready for implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No shared foundational work required — US1 and US2 are independent of each other and touch separate apps. Proceed directly to user stories.

**⚠️ NOTE**: US1 (administrate migration) and US2 (tutorials model) operate on different apps and schemas. They have no shared prerequisites beyond Phase 1.

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 - Schema Migration for Administrate Tables (Priority: P1)

**Goal**: Move six administrate tables (course_templates, custom_fields, instructors, locations, pricelevels, venues) from `public` to `adm` schema with zero data loss.

**Independent Test**: Query `information_schema.tables` to verify all six tables exist in `adm` schema. Run existing administrate tests to confirm model operations still work.

**References**: FR-001 through FR-008 | research.md §1 (migration approach) | quickstart.md §Phase 1

### Tests for User Story 1 (TDD RED phase)

> **Write these tests FIRST. Ensure they FAIL before implementing the migration.**

- [x] T004 [US1] Write migration idempotency test: verify migration can run twice without error in `backend/django_Admin3/administrate/tests/test_migrations.py`
- [x] T005 [US1] Write migration data preservation test: verify all six tables exist in `adm` schema after migration in `backend/django_Admin3/administrate/tests/test_migrations.py`
- [x] T006 [US1] Write foreign key integrity test: verify Venue→Location FK still works after migration in `backend/django_Admin3/administrate/tests/test_migrations.py`
- [x] T007 [US1] Run tests to confirm RED phase (tests fail) with `python manage.py test administrate.tests.test_migrations`

### Implementation for User Story 1 (TDD GREEN phase)

- [x] T008 [US1] Create conditional schema migration using `SeparateDatabaseAndState` with `ALTER TABLE SET SCHEMA` for all six tables in `backend/django_Admin3/administrate/migrations/0003_migrate_to_adm_schema.py` — use `IF EXISTS` check on `public` schema per research.md template
- [x] T009 [US1] Run migration with `python manage.py migrate administrate` in `backend/django_Admin3/`
- [x] T010 [US1] Run tests to confirm GREEN phase (tests pass) with `python manage.py test administrate.tests.test_migrations`
- [x] T011 [US1] Run full administrate test suite to verify no regressions with `python manage.py test administrate`

**Checkpoint**: All six administrate tables verified in `adm` schema with data intact. US1 independently complete.

---

## Phase 4: User Story 2 - Tutorial Sessions Model Creation (Priority: P1) 🎯 MVP

**Goal**: Create TutorialSessions model in `acted` schema with FK to TutorialEvents, supporting session details (title, location, venue, dates, sequence, url).

**Independent Test**: Create a TutorialEvent, add multiple TutorialSessions, verify CRUD, ordering, cascade delete, and unique constraint on (event, sequence).

**References**: FR-009 through FR-022 | data-model.md | research.md §2 (model design)

### Tests for User Story 2 (TDD RED phase)

> **Write these tests FIRST. Ensure they FAIL before implementing the model.**

- [x] T012 [US2] Write model creation test: verify TutorialSessions can be created with all required fields in `backend/django_Admin3/tutorials/tests/test_models.py`
- [x] T013 [US2] Write FK relationship test: verify `event.sessions.all()` returns related sessions ordered by sequence in `backend/django_Admin3/tutorials/tests/test_models.py`
- [x] T014 [US2] Write cascade delete test: verify deleting TutorialEvent deletes related sessions in `backend/django_Admin3/tutorials/tests/test_models.py`
- [x] T015 [US2] Write date validation test: verify start_date > end_date raises ValidationError in `backend/django_Admin3/tutorials/tests/test_models.py`
- [x] T016 [US2] Write unique constraint test: verify duplicate (tutorial_event, sequence) raises IntegrityError in `backend/django_Admin3/tutorials/tests/test_models.py`
- [x] T017 [US2] Write optional field test: verify session creation succeeds with url=None in `backend/django_Admin3/tutorials/tests/test_models.py`
- [x] T018 [US2] Run tests to confirm RED phase (tests fail) with `python manage.py test tutorials.tests.test_models`

### Implementation for User Story 2 (TDD GREEN phase)

- [x] T019 [US2] Create TutorialSessions model with all fields per data-model.md in `backend/django_Admin3/tutorials/models/tutorial_sessions.py` — include Meta with `db_table = '"acted"."tutorial_sessions"'`, `unique_together`, `ordering = ['sequence']`, and `clean()` validation for date order
- [x] T020 [US2] Update models `__init__.py` to export TutorialSessions in `backend/django_Admin3/tutorials/models/__init__.py`
- [x] T021 [US2] Generate migration with `python manage.py makemigrations tutorials` in `backend/django_Admin3/`
- [x] T022 [US2] Run migration with `python manage.py migrate tutorials` in `backend/django_Admin3/`
- [x] T023 [US2] Register TutorialSessions in Django admin in `backend/django_Admin3/tutorials/admin.py`
- [x] T024 [US2] Run tests to confirm GREEN phase (tests pass) with `python manage.py test tutorials.tests.test_models`
- [x] T025 [US2] Run full tutorials test suite to verify no regressions with `python manage.py test tutorials`

**Checkpoint**: TutorialSessions model operational with CRUD, validation, cascade delete, unique constraint. US2 independently complete.

---

## Phase 5: User Story 3 - API Response Enhancement with Sessions (Priority: P2)

**Goal**: Update the unified search API serializer to include a `sessions` array nested within each tutorial event object, ordered by sequence.

**Independent Test**: Call `/api/search/unified/` for tutorial products and verify session data appears in the response matching contracts/api-response.yaml schema.

**References**: FR-023 through FR-026 | contracts/api-response.yaml | research.md §3 (serializer integration)

**Depends on**: US2 (TutorialSessions model must exist)

### Tests for User Story 3 (TDD RED phase)

> **Write these tests FIRST. Ensure they FAIL before implementing the serializer changes.**

- [x] T026 [US3] Write serializer test: verify sessions array is included in tutorial event serialization output in `backend/django_Admin3/tutorials/tests/test_sessions_serializer.py`
- [x] T027 [US3] Write serializer test: verify session fields match contract (id, title, location, venue, start_date, end_date, sequence, url) in `backend/django_Admin3/tutorials/tests/test_sessions_serializer.py`
- [x] T028 [US3] Write serializer test: verify sessions ordered by sequence ascending in `backend/django_Admin3/tutorials/tests/test_sessions_serializer.py`
- [x] T029 [US3] Write serializer test: verify empty sessions array `[]` for events with no sessions in `backend/django_Admin3/tutorials/tests/test_sessions_serializer.py`
- [x] T030 [US3] Run tests to confirm RED phase (tests fail) with `python manage.py test tutorials.tests.test_sessions_serializer`

### Implementation for User Story 3 (TDD GREEN phase)

- [x] T031 [US3] Create TutorialSessionsSerializer in `backend/django_Admin3/tutorials/serializers.py`
- [x] T032 [US3] Update `_serialize_tutorial_events` method to include `sessions` array per research.md §3 pattern in `backend/django_Admin3/search/serializers.py` — add session fields: id, title, location, venue, start_date (isoformat), end_date (isoformat), sequence, url
- [x] T033 [US3] Add `prefetch_related('tutorial_events__sessions')` to the store product queryset used by unified search in `backend/django_Admin3/search/serializers.py` (or the view that calls it)
- [x] T034 [US3] Run tests to confirm GREEN phase (tests pass) with `python manage.py test tutorials.tests.test_sessions_serializer`
- [x] T035 [US3] Run full test suite to verify no regressions with `python manage.py test`

**Checkpoint**: Unified search API returns sessions within tutorial events matching contract schema. US3 independently complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all user stories

- [x] T036 Run full test suite across all apps with `python manage.py test` in `backend/django_Admin3/`
- [ ] T037 Verify database state using quickstart.md verification SQL (all tables in correct schemas)
- [ ] T038 Manual API test: POST to `/api/search/unified/` with `{"filters": {"product_types": ["Tutorial"]}}` and verify sessions appear in response per quickstart.md
- [ ] T039 Verify API response time remains under 500ms for unified search (SC-004)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: No shared work needed — proceed to user stories
- **US1 (Phase 3)**: Independent — can start after Phase 1
- **US2 (Phase 4)**: Independent — can start after Phase 1
- **US3 (Phase 5)**: Depends on US2 completion (model must exist for serializer)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

```text
Phase 1 (Setup)
    ├──→ US1 (Phase 3): Schema Migration ──────────────────┐
    │                                                       ├──→ Phase 6 (Polish)
    └──→ US2 (Phase 4): Sessions Model ──→ US3 (Phase 5) ──┘
```

- **US1 ↔ US2**: Fully independent (different apps, different schemas)
- **US3 → US2**: US3 requires the TutorialSessions model from US2

### Within Each User Story

1. Tests MUST be written and FAIL before implementation (TDD RED)
2. Implementation makes tests pass (TDD GREEN)
3. Refactor if needed (tests stay green)
4. Run full suite before marking story complete

### Parallel Opportunities

**Cross-story parallelism** (different apps, no conflicts):
- US1 (administrate app) and US2 (tutorials app) can execute simultaneously

**Within-story parallelism**:
- US2 test tasks T012-T017 are all in the same file — write sequentially
- US3 test tasks T026-T029 are all in the same file — write sequentially

---

## Parallel Example: US1 + US2 Simultaneously

```bash
# Agent A: User Story 1 (administrate app)
Task: T004 - Write migration tests in administrate/tests/test_migrations.py
Task: T008 - Create migration in administrate/migrations/0003_migrate_to_adm_schema.py

# Agent B: User Story 2 (tutorials app) — simultaneously
Task: T012-T017 - Write model tests in tutorials/tests/test_models.py
Task: T019 - Create TutorialSessions model in tutorials/models/tutorial_sessions.py
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup (verify branch, schemas, baseline tests)
2. Complete US1 and US2 in parallel (both P1, independent apps)
3. **STOP and VALIDATE**: Both stories independently testable
4. Proceed to US3 once US2 is confirmed

### Incremental Delivery

1. Setup → Baseline verified
2. US1 (Schema Migration) → Tables in `adm` schema ✓
3. US2 (Sessions Model) → CRUD operations working ✓
4. US3 (API Enhancement) → Sessions in API response ✓
5. Polish → Full validation across all stories ✓

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [US*] label maps task to specific user story for traceability
- TDD phases (RED/GREEN) are explicitly marked in each story
- Commit after each completed story (not after each task)
- Stop at any checkpoint to validate story independently
- All file paths are relative to `backend/django_Admin3/` unless otherwise noted
