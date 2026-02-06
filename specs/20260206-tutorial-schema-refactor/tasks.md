# Tasks: Tutorial Schema Refactor - Acted Owned Tables

**Input**: Design documents from `/specs/20260206-tutorial-schema-refactor/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, research.md, quickstart.md

**Tests**: Included (TDD mandated by project constitution — CLAUDE.md)

**Organization**: Tasks grouped by user story. US1 is foundational MVP; US2/US3 share a migration; US4→US5→US6 are sequential.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/django_Admin3/`
- **Tutorials app**: `backend/django_Admin3/tutorials/`
- **Administrate app**: `backend/django_Admin3/administrate/`

---

## Database Schema Assertions

Tasks that create or modify database tables MUST include verification that queries `information_schema.tables` to confirm the table is in the expected schema.

**Required test pattern:**

```python
def test_table_in_expected_schema(self):
    """Verify table physically resides in the correct PostgreSQL schema."""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = %s AND table_name = %s",
            ['acted', 'tutorial_locations'],
        )
        self.assertIsNotNone(cursor.fetchone())
```

**Convention:** `db_table` values MUST use quoted format: `'"acted"."tutorial_locations"'`

---

## Phase 1: Setup

**Purpose**: Verify prerequisites and prepare test infrastructure

- [ ] T001 Verify current migration state and acted schema exists by running `python manage.py showmigrations tutorials` and `python manage.py showmigrations administrate`
- [ ] T002 Read existing model files to confirm current field definitions: `backend/django_Admin3/tutorials/models/tutorial_events.py` and `backend/django_Admin3/tutorials/models/tutorial_sessions.py`

---

## Phase 2: User Story 1 - Create Acted-Owned Reference Tables (Priority: P1) MVP

**Goal**: Create 5 new tables in the `acted` schema: tutorial_course_templates, staff, tutorial_instructors, tutorial_locations, tutorial_venues

**Independent Test**: Verify all five new tables exist in `acted` schema with correct columns, constraints, and FK relationships. Run `python manage.py verify_schema_placement`.

**Spec References**: FR-001 through FR-006, SC-001

### Tests for User Story 1 (TDD - RED phase)

> **Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T003 [P] [US1] Write model tests for TutorialCourseTemplate (CRUD, unique code constraint, `__str__`, schema placement) in `backend/django_Admin3/tutorials/tests/test_models.py`
- [ ] T004 [P] [US1] Write model tests for Staff (CRUD, OneToOne auth_user constraint, PROTECT on delete, `__str__`, schema placement) in `backend/django_Admin3/tutorials/tests/test_models.py`
- [ ] T005 [P] [US1] Write model tests for TutorialInstructor (CRUD, nullable staff OneToOneField, `__str__` with/without staff, schema placement) in `backend/django_Admin3/tutorials/tests/test_models.py`
- [ ] T006 [P] [US1] Write model tests for TutorialLocation (CRUD, `__str__`, schema placement) in `backend/django_Admin3/tutorials/tests/test_models.py`
- [ ] T007 [P] [US1] Write model tests for TutorialVenue (CRUD, nullable location FK, `__str__`, schema placement) in `backend/django_Admin3/tutorials/tests/test_models.py`

### Implementation for User Story 1 (TDD - GREEN phase)

- [ ] T008 [P] [US1] Create TutorialCourseTemplate model in `backend/django_Admin3/tutorials/models/tutorial_course_template.py` with fields: code (CharField 50, unique), title (CharField 255), description (TextField, blank, default=""), is_active (BooleanField, default=True), created_at, updated_at. Meta: `db_table = '"acted"."tutorial_course_templates"'`
- [ ] T009 [P] [US1] Create Staff model in `backend/django_Admin3/tutorials/models/staff.py` with fields: user (OneToOneField to auth.User, on_delete=PROTECT), created_at, updated_at. Meta: `db_table = '"acted"."staff"'`. `__str__` returns `user.get_full_name()` or `user.username`
- [ ] T010 [P] [US1] Create TutorialInstructor model in `backend/django_Admin3/tutorials/models/tutorial_instructor.py` with fields: staff (OneToOneField to Staff, nullable, on_delete=SET_NULL), is_active (BooleanField, default=True), created_at, updated_at. Meta: `db_table = '"acted"."tutorial_instructors"'`. `__str__` returns staff name or `"Instructor #{id}"`
- [ ] T011 [P] [US1] Create TutorialLocation model in `backend/django_Admin3/tutorials/models/tutorial_location.py` with fields: name (CharField 255), code (CharField 50, blank=True), is_active (BooleanField, default=True), created_at, updated_at. Meta: `db_table = '"acted"."tutorial_locations"'`. `__str__` returns `name`
- [ ] T012 [P] [US1] Create TutorialVenue model in `backend/django_Admin3/tutorials/models/tutorial_venue.py` with fields: name (CharField 255), description (TextField, blank, default=""), location (FK to TutorialLocation, nullable, on_delete=SET_NULL), created_at, updated_at. Meta: `db_table = '"acted"."tutorial_venues"'`. `__str__` returns `name`
- [ ] T013 [US1] Update `backend/django_Admin3/tutorials/models/__init__.py` to export all 5 new models: TutorialCourseTemplate, Staff, TutorialInstructor, TutorialLocation, TutorialVenue
- [ ] T014 [US1] Generate migration: run `python manage.py makemigrations tutorials` — expect migration `0004_*.py` creating 5 new tables
- [ ] T015 [US1] Run migration: `python manage.py migrate tutorials` — verify tables created in `acted` schema
- [ ] T016 [US1] Run US1 tests to verify all pass (TDD GREEN): `python manage.py test tutorials.tests.test_models`
- [ ] T017 [US1] Register new models in Django admin in `backend/django_Admin3/tutorials/admin.py`

**Checkpoint**: 5 new acted-schema tables exist with correct columns and constraints. `verify_schema_placement` should be updated later (Phase 8).

---

## Phase 3: User Story 2 + User Story 3 - Add Instructor/Venue/Location FKs to Events and Sessions (Priority: P1)

**Goal**: Add instructor FK and replace venue/location CharFields with FKs on tutorial_events and tutorial_sessions. US2 and US3 are combined because they modify the same files and share a single migration.

**Independent Test**: Create instructor, venue, and location records, then create events and sessions referencing them via FK. Verify SET_NULL behavior on delete.

**Spec References**: FR-007 through FR-012, SC-004

### Tests for User Stories 2+3 (TDD - RED phase)

- [ ] T018 [P] [US2] Write tests for instructor FK on TutorialEvents (create event with instructor, null instructor, SET_NULL on instructor delete) in `backend/django_Admin3/tutorials/tests/test_models.py`
- [ ] T019 [P] [US3] Write tests for venue/location FKs on TutorialEvents (create event with venue FK, location FK, null allowed, SET_NULL on delete) in `backend/django_Admin3/tutorials/tests/test_models.py`
- [ ] T020 [P] [US2] Write tests for instructor FK on TutorialSessions (create session with instructor, null instructor, SET_NULL on delete) in `backend/django_Admin3/tutorials/tests/test_models.py`
- [ ] T021 [P] [US3] Write tests for venue/location FKs on TutorialSessions (create session with venue FK, location FK, null allowed, SET_NULL on delete) in `backend/django_Admin3/tutorials/tests/test_models.py`

### Implementation for User Stories 2+3 (TDD - GREEN phase)

- [ ] T022 [US2] Modify TutorialEvents model in `backend/django_Admin3/tutorials/models/tutorial_events.py`: add `instructor` FK to TutorialInstructor (nullable, SET_NULL, related_name='events'), replace `venue` CharField with FK to TutorialVenue (nullable, SET_NULL, related_name='events'), add `location` FK to TutorialLocation (nullable, SET_NULL, related_name='events')
- [ ] T023 [US3] Modify TutorialSessions model in `backend/django_Admin3/tutorials/models/tutorial_sessions.py`: add `instructor` FK to TutorialInstructor (nullable, SET_NULL, related_name='sessions'), replace `venue` CharField with FK to TutorialVenue (nullable, SET_NULL, related_name='sessions'), replace `location` CharField with FK to TutorialLocation (nullable, SET_NULL, related_name='sessions')
- [ ] T024 [US3] Generate migration: run `python manage.py makemigrations tutorials` — expect migration `0005_*.py` with RemoveField + AddField operations for venue/location and new instructor field
- [ ] T025 [US3] Run migration: `python manage.py migrate tutorials`
- [ ] T026 [US3] Run US2+US3 tests to verify all pass (TDD GREEN): `python manage.py test tutorials.tests.test_models`
- [ ] T027 [US3] Update serializers in `backend/django_Admin3/tutorials/serializers.py` to handle new FK fields (instructor, venue, location) instead of CharFields. Use PrimaryKeyRelatedField for instructor, venue, location FKs; include nested read serializers if needed for API consumers

**Checkpoint**: Events and sessions use FK references for instructor, venue, and location. Existing tests must still pass.

---

## Phase 4: User Story 4 - Add Cross-Schema FKs from ADM to Acted (Priority: P2)

**Goal**: Add FK columns on adm tables (course_templates, instructors, locations, venues) pointing to their acted counterparts

**Independent Test**: Create an acted record, set the FK on the corresponding adm record, verify the relationship resolves correctly in both directions.

**Spec References**: FR-013 through FR-016, SC-003

### Tests for User Story 4 (TDD - RED phase)

- [ ] T028 [P] [US4] Write tests for cross-schema FK on CourseTemplate → TutorialCourseTemplate in `backend/django_Admin3/administrate/tests/test_cross_schema_fks.py`
- [ ] T029 [P] [US4] Write tests for cross-schema FK on Instructor → TutorialInstructor in `backend/django_Admin3/administrate/tests/test_cross_schema_fks.py`
- [ ] T030 [P] [US4] Write tests for cross-schema FK on Location → TutorialLocation in `backend/django_Admin3/administrate/tests/test_cross_schema_fks.py`
- [ ] T031 [P] [US4] Write tests for cross-schema FK on Venue → TutorialVenue in `backend/django_Admin3/administrate/tests/test_cross_schema_fks.py`

### Implementation for User Story 4 (TDD - GREEN phase)

- [ ] T032 [P] [US4] Add `tutorial_course_template` FK (nullable, SET_NULL) to CourseTemplate model in `backend/django_Admin3/administrate/models/course_templates.py`
- [ ] T033 [P] [US4] Add `tutorial_instructor` FK (nullable, SET_NULL) to Instructor model in `backend/django_Admin3/administrate/models/instructors.py`
- [ ] T034 [P] [US4] Add `tutorial_location` FK (nullable, SET_NULL) to Location model in `backend/django_Admin3/administrate/models/locations.py`
- [ ] T035 [P] [US4] Add `tutorial_venue` FK (nullable, SET_NULL) to Venue model in `backend/django_Admin3/administrate/models/venues.py`
- [ ] T036 [US4] Generate migration: run `python manage.py makemigrations administrate` — expect migration `0005_*.py` adding 4 FK columns
- [ ] T037 [US4] Run migration: `python manage.py migrate administrate`
- [ ] T038 [US4] Run US4 tests to verify all pass (TDD GREEN): `python manage.py test administrate.tests.test_cross_schema_fks`

**Checkpoint**: All 4 adm tables have nullable FK columns pointing to their acted counterparts. Cross-schema queries work via Django ORM.

---

## Phase 5: User Story 5 - Migrate Data from ADM to Acted Schema (Priority: P2)

**Goal**: Copy existing data from adm tables to acted tables using a Django data migration, then set cross-schema FKs on adm records

**Independent Test**: Run data migration, compare row counts and field values between adm and acted tables, verify idempotency by running twice.

**Spec References**: FR-017 through FR-023, SC-002, SC-003, SC-007

### Tests for User Story 5 (TDD - RED phase)

- [ ] T039 [US5] Write data migration tests in `backend/django_Admin3/tutorials/tests/test_data_migration.py`: verify row counts match between adm and acted, verify field-level accuracy (code/title mapping, is_active/active mapping, venue→location FK resolution), verify adm cross-schema FKs are set, verify idempotency (run twice, same counts)

### Implementation for User Story 5 (TDD - GREEN phase)

- [ ] T040 [US5] Generate empty migration: `python manage.py makemigrations tutorials --empty --name data_migration_adm_to_acted` — creates `0006_data_migration_adm_to_acted.py`
- [ ] T041 [US5] Implement forward migration function in `backend/django_Admin3/tutorials/migrations/0006_data_migration_adm_to_acted.py` with these steps in order: (1) Copy locations using get_or_create on name, set adm.locations FK; (2) Copy venues using get_or_create on name, resolve location FK via adm.locations cross-schema FK, set adm.venues FK; (3) Copy course templates using get_or_create on code, set adm.course_templates FK; (4) Create staff records for instructors with matching auth_user, create tutorial_instructors with get_or_create, set adm.instructors FK; (5) Add dependency on administrate migration 0005. **Logging**: Use `print()` or Django logger to log each migration step count (e.g., "Migrated N locations, N venues") and warnings for skipped/duplicate records
- [ ] T042 [US5] Run migration: `python manage.py migrate tutorials`
- [ ] T043 [US5] Run data migration tests to verify all pass (TDD GREEN): `python manage.py test tutorials.tests.test_data_migration`
- [ ] T044 [US5] Verify data migration counts via Django shell (quickstart.md verification commands)

**Checkpoint**: All adm data copied to acted. Every adm record has its cross-schema FK set. Migration is idempotent.

---

## Phase 6: User Story 6 - Remove Redundant ADM Columns (Priority: P3)

**Goal**: Remove columns from adm tables that are now redundant (data lives in acted schema)

**Independent Test**: Verify columns no longer exist on adm tables. Verify adm records still have id, external_id, FK to acted, and sync fields.

**Spec References**: FR-024 through FR-028, SC-005

### Tests for User Story 6 (TDD - RED phase)

- [ ] T045 [US6] Write column removal verification tests in `backend/django_Admin3/administrate/tests/test_column_removal.py`: query `information_schema.columns` to assert removed columns are absent and retained columns are present for all 4 adm tables

### Implementation for User Story 6 (TDD - GREEN phase)

- [ ] T046 [P] [US6] Remove fields from CourseTemplate model in `backend/django_Admin3/administrate/models/course_templates.py`: remove code, title, categories, active (retain: id, external_id, event_learning_mode, custom_fields, tutorial_course_template FK, created_at, updated_at)
- [ ] T047 [P] [US6] Remove fields from Instructor model in `backend/django_Admin3/administrate/models/instructors.py`: remove first_name, last_name, email (retain: id, external_id, legacy_id, is_active, tutorial_instructor FK, created_at, updated_at, last_synced)
- [ ] T048 [P] [US6] Remove fields from Location model in `backend/django_Admin3/administrate/models/locations.py`: remove name, code, active (retain: id, external_id, legacy_id, tutorial_location FK, created_at, updated_at)
- [ ] T049 [P] [US6] Remove fields from Venue model in `backend/django_Admin3/administrate/models/venues.py`: remove name, description (retain: id, external_id, location FK, tutorial_venue FK, created_at, updated_at)
- [ ] T050 [US6] Generate migration: run `python manage.py makemigrations administrate` — expect migration `0006_*.py` with RemoveField operations
- [ ] T051 [US6] Run migration: `python manage.py migrate administrate`
- [ ] T052 [US6] Run US6 tests to verify all pass (TDD GREEN): `python manage.py test administrate.tests.test_column_removal`

**Checkpoint**: All redundant columns removed. adm tables retain only id, external_id, FKs, and sync metadata.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Schema verification, admin `__str__` updates for adm models, and full test suite

- [ ] T053 Update `backend/django_Admin3/administrate/management/commands/verify_schema_placement.py`: add 5 new table names to `EXPECTED_SCHEMAS['acted']` list: tutorial_course_templates, staff, tutorial_instructors, tutorial_locations, tutorial_venues
- [ ] T054 Run schema verification: `python manage.py verify_schema_placement` — all tables in correct schemas
- [ ] T055 Update `__str__` methods on adm models (CourseTemplate, Instructor, Location, Venue) to follow the FK to acted tables for display names since local name fields are removed
- [ ] T056 Run full test suite: `python manage.py test` — zero regressions, all existing and new tests pass
- [ ] T057 Run quickstart.md verification commands to validate complete implementation

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ─────────────────────────────────────────────────┐
                                                                │
Phase 2: US1 (Create 5 new tables) ◄───────────────────────────┘
    │
    ├──► Phase 3: US2+US3 (FK updates on events/sessions)
    │
    └──► Phase 4: US4 (Cross-schema FKs from adm)
              │
              ▼
         Phase 5: US5 (Data migration) ◄── depends on Phase 3 + Phase 4
              │
              ▼
         Phase 6: US6 (Column removal) ◄── depends on Phase 5
              │
              ▼
         Phase 7: Polish ◄── depends on Phase 6
```

### User Story Dependencies

- **US1 (P1)**: No dependencies — foundational MVP
- **US2 (P1)**: Depends on US1 (instructor model must exist)
- **US3 (P1)**: Depends on US1 (venue/location models must exist). Combined with US2 (same files modified)
- **US4 (P2)**: Depends on US1 (acted tables must exist for FK targets)
- **US5 (P2)**: Depends on US1 + US4 (both acted tables and adm FK columns must exist)
- **US6 (P3)**: Depends on US5 (data must be migrated before columns can be dropped)

### Parallel Opportunities

- **Phase 2 (US1)**: T003-T007 tests can run in parallel; T008-T012 model files can run in parallel
- **Phase 3 (US2+US3)**: T018-T021 tests can run in parallel; T022-T023 model edits are independent files
- **Phase 4 (US4)**: T028-T031 tests can run in parallel; T032-T035 model edits can run in parallel
- **Phase 6 (US6)**: T046-T049 field removals can run in parallel
- **Phase 3 and Phase 4 can run in parallel** (US2/US3 modify tutorials models, US4 modifies administrate models — no file conflicts)

---

## Parallel Example: Phase 2 (US1)

```bash
# Launch all RED-phase tests in parallel (5 model test classes):
Task: "Write model tests for TutorialCourseTemplate in tutorials/tests/test_models.py"
Task: "Write model tests for Staff in tutorials/tests/test_models.py"
Task: "Write model tests for TutorialInstructor in tutorials/tests/test_models.py"
Task: "Write model tests for TutorialLocation in tutorials/tests/test_models.py"
Task: "Write model tests for TutorialVenue in tutorials/tests/test_models.py"

# Then launch all GREEN-phase model files in parallel:
Task: "Create TutorialCourseTemplate model in tutorials/models/tutorial_course_template.py"
Task: "Create Staff model in tutorials/models/staff.py"
Task: "Create TutorialInstructor model in tutorials/models/tutorial_instructor.py"
Task: "Create TutorialLocation model in tutorials/models/tutorial_location.py"
Task: "Create TutorialVenue model in tutorials/models/tutorial_venue.py"
```

## Parallel Example: Phase 3 + Phase 4 (concurrent)

```bash
# Phase 3 (tutorials app) and Phase 4 (administrate app) can run simultaneously:

# Agent A — Phase 3:
Task: "Modify TutorialEvents model in tutorials/models/tutorial_events.py"
Task: "Modify TutorialSessions model in tutorials/models/tutorial_sessions.py"

# Agent B — Phase 4:
Task: "Add FK to CourseTemplate in administrate/models/course_templates.py"
Task: "Add FK to Instructor in administrate/models/instructors.py"
Task: "Add FK to Location in administrate/models/locations.py"
Task: "Add FK to Venue in administrate/models/venues.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup verification
2. Complete Phase 2: US1 — Create 5 new acted tables (TDD)
3. **STOP and VALIDATE**: Run `verify_schema_placement`, confirm all 5 tables exist
4. Commit as a working increment

### Incremental Delivery

1. Phase 1 + Phase 2 (US1) → 5 new acted tables → Commit
2. Phase 3 (US2+US3) → FK references on events/sessions → Commit
3. Phase 4 (US4) → Cross-schema FKs on adm → Commit
4. Phase 5 (US5) → Data migrated from adm to acted → Commit
5. Phase 6 (US6) → Redundant adm columns removed → Commit
6. Phase 7 → Polish, full test suite, verify → Final commit

### Critical Path

The longest dependency chain is: US1 → US4 → US5 → US6 → Polish (5 sequential phases). US2/US3 can run parallel with US4 to reduce wall time.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- TDD is mandatory: RED (failing test) → GREEN (minimal implementation) → REFACTOR
- All `db_table` values use double-quoted format per project convention
- All new FK fields on events/sessions use SET_NULL (Clarification #1)
- Sync pipeline updates are OUT OF SCOPE (Clarification #2, Assumption #11)
- Data migration uses `get_or_create` for idempotency (Research R3)
- Venue→location FK mapping during data migration uses two-pass approach (Research R6)
- Commit after each phase checkpoint
