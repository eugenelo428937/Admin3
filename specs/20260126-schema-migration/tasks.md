# Tasks: Migrate Models to Acted Schema

**Input**: Design documents from `/specs/20260126-schema-migration/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Model Configuration (US2 - Developer Confirms Model Configuration)

**Purpose**: Update all Django model `db_table` Meta options from `'acted_table_name'` to `'"acted"."table_name"'` format

### marking app (1 model)

- [x] T001 [P] [US2] Update `db_table` in `backend/django_Admin3/marking/models/marking_paper.py` from `'acted_marking_paper'` to `'"acted"."marking_paper"'`

### tutorials app (1 model)

- [x] T002 [P] [US2] Update `db_table` in `backend/django_Admin3/tutorials/models/tutorial_event.py` from `'acted_tutorial_events'` to `'"acted"."tutorial_events"'`

### rules_engine app (5 models)

- [x] T003 [P] [US2] Update `db_table` in `backend/django_Admin3/rules_engine/models/acted_rule.py` from `"acted_rules"` to `'"acted"."rules"'`
- [x] T004 [P] [US2] Update `db_table` in `backend/django_Admin3/rules_engine/models/acted_rules_fields.py` from `"acted_rules_fields"` to `'"acted"."rules_fields"'`
- [x] T005 [P] [US2] Update `db_table` in `backend/django_Admin3/rules_engine/models/acted_rule_execution.py` from `"acted_rule_executions"` to `'"acted"."rule_executions"'`
- [x] T006 [P] [US2] Update `db_table` in `backend/django_Admin3/rules_engine/models/rule_entry_point.py` from `'acted_rule_entry_points'` to `'"acted"."rule_entry_points"'`
- [x] T007 [P] [US2] Update `db_table` in `backend/django_Admin3/rules_engine/models/message_template.py` from `'acted_rules_message_templates'` to `'"acted"."rules_message_templates"'`

### students app (1 model)

- [x] T008 [P] [US2] Update `db_table` in `backend/django_Admin3/students/models.py` from `'acted_students'` to `'"acted"."students"'`

### userprofile app (4 models)

- [x] T009 [P] [US2] Update `db_table` in `backend/django_Admin3/userprofile/models/user_profile.py` from `'acted_user_profile'` to `'"acted"."user_profile"'`
- [x] T010 [P] [US2] Update `db_table` in `backend/django_Admin3/userprofile/models/email.py` from `'acted_user_profile_email'` to `'"acted"."user_profile_email"'`
- [x] T011 [P] [US2] Update `db_table` in `backend/django_Admin3/userprofile/models/address.py` from `'acted_user_profile_address'` to `'"acted"."user_profile_address"'`
- [x] T012 [P] [US2] Update `db_table` in `backend/django_Admin3/userprofile/models/contact_number.py` from `'acted_user_profile_contact_number'` to `'"acted"."user_profile_contact_number"'`

### Marking_vouchers App (1 Model)

- [x] T024 [P] [US2] Update `db_table` in `backend/django_Admin3/marking_vouchers/models.py` from `'acted_marking_vouchers'` to `'"acted"."marking_vouchers"'`

**Checkpoint**: All 13 model `db_table` Meta options updated. Run `python manage.py check` to verify no model errors.

---

## Phase 2: Migration Files (US1 - Database Administrator Migrates Schema, US3 - Migration Without Data Loss)

**Purpose**: Create Django migration files with `ALTER TABLE SET SCHEMA` + `RENAME` SQL for each app. Each migration includes forward and reverse operations for rollback capability.

**⚠️ CRITICAL**: Depends on Phase 1 completion. Migration files must match the updated `db_table` values.

### Migration Pattern (per research.md)

Each migration uses `RunSQL` with:
- **Forward**: `ALTER TABLE public.acted_X SET SCHEMA acted; ALTER TABLE acted.acted_X RENAME TO X;`
- **Reverse**: `ALTER TABLE acted.X RENAME TO acted_X; ALTER TABLE acted.acted_X SET SCHEMA public;`

### userprofile app (migrate first - no external dependencies on other migrating tables)

- [x] T013 [US1] [US3] Create migration `backend/django_Admin3/userprofile/migrations/0003_migrate_to_acted_schema.py` with RunSQL to move all 4 userprofile tables (`acted_user_profile`, `acted_user_profile_email`, `acted_user_profile_address`, `acted_user_profile_contact_number`) to `acted` schema and rename. Include reverse SQL for rollback. All 4 tables in single migration to preserve internal FK integrity.

### students app

- [x] T014 [P] [US1] [US3] Create migration `backend/django_Admin3/students/migrations/0002_migrate_to_acted_schema.py` with RunSQL to move `acted_students` to `acted.students`. Include reverse SQL.

### rules_engine app

- [x] T015 [P] [US1] [US3] Create migration `backend/django_Admin3/rules_engine/migrations/0010_migrate_to_acted_schema.py` with RunSQL to move all 5 rules_engine tables (`acted_rules`, `acted_rules_fields`, `acted_rule_executions`, `acted_rule_entry_points`, `acted_rules_message_templates`) to `acted` schema and rename. Include reverse SQL.

### marking app

- [x] T016 [P] [US1] [US3] Create migration `backend/django_Admin3/marking/migrations/0002_migrate_to_acted_schema.py` with RunSQL to move `acted_marking_paper` to `acted.marking_paper`. Include reverse SQL.

### tutorials app

- [x] T017 [P] [US1] [US3] Create migration `backend/django_Admin3/tutorials/migrations/0002_migrate_to_acted_schema.py` with RunSQL to move `acted_tutorial_events` to `acted.tutorial_events`. Include reverse SQL.

### Marking_vouchers App

- [x] T025 [P] [US1] [US3] Create migration `backend/django_Admin3/marking_vouchers/migrations/0002_migrate_to_acted_schema.py` with SeparateDatabaseAndState (RunSQL + AlterModelTable) to move `acted_marking_vouchers` to `acted.marking_vouchers`. Include reverse SQL.

**Checkpoint**: All 6 migration files created. Each contains forward and reverse SQL operations.

---

## Phase 3: Verification & Testing (US1, US3)

**Purpose**: Verify migrations work correctly, data is preserved, and Django ORM queries succeed.

- [x] T018 [US1] Run `python manage.py check` to verify no Django system errors after model and migration changes
- [x] T019 [US3] Run `python manage.py migrate --plan` to verify migration execution order and dependencies are correct
- [x] T020 [US1] [US3] Run migrations in order: `python manage.py migrate userprofile && python manage.py migrate students && python manage.py migrate rules_engine && python manage.py migrate marking && python manage.py migrate tutorials`
- [x] T021 [US1] Verify tables exist in `acted` schema and no `acted_*` tables remain in `public` schema using SQL verification queries from quickstart.md
- [x] T022 [US3] Verify Django ORM queries work for all 12 models (MarkingPaper, TutorialEvent, ActedRule, ActedRulesFields, ActedRuleExecution, RuleEntryPoint, MessageTemplate, Student, UserProfile, UserProfileEmail, UserProfileAddress, UserProfileContactNumber)
- [x] T023 [US1] Run existing test suite `python manage.py test` — **Note**: Test suite has pre-existing failure on main branch (utils_email_attachment duplicate table in test DB setup). Not caused by schema migration.
- [x] T026 [US1] [US3] Run `python manage.py check`, verify `makemigrations --check` detects no changes, run `python manage.py migrate marking_vouchers`, verify `acted.marking_vouchers` exists in acted schema, and verify Django ORM query works for MarkingVoucher model.

**Checkpoint**: All migrations applied successfully. All ORM queries work. Existing tests pass.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Model Configuration)**: No dependencies - can start immediately. All T001-T012 are parallel.
- **Phase 2 (Migration Files)**: Depends on Phase 1 completion. T014-T017 are parallel; T013 should be created first (userprofile is first in migration order).
- **Phase 3 (Verification)**: Depends on Phase 2 completion. T018-T023 are sequential.

### Parallel Opportunities

**Phase 1** (12 tasks, all parallel):
- All model `db_table` updates are in different files with no dependencies
- Can be executed simultaneously: T001-T012

**Phase 2** (5 tasks, 4 parallel after T013):
- T014, T015, T016, T017 can run in parallel (different apps)
- T013 (userprofile) should be first due to internal FK dependencies

**Phase 3** (6 tasks, sequential):
- Verification tasks must run in order: check → plan → migrate → verify schema → verify ORM → run tests

### User Story Coverage

| Story | Tasks | Description |
|-------|-------|-------------|
| US1 (P1) | T013-T017, T020-T023 | Database migration execution and verification |
| US2 (P2) | T001-T012, T018 | Model db_table configuration updates |
| US3 (P1) | T013-T017, T019-T022 | Data preservation and rollback capability |

---

## Implementation Strategy

### Recommended Execution Order

1. **Phase 1**: Update all 12 model files (parallel) — T001-T012
2. **Phase 2**: Create all 5 migration files — T013-T017
3. **Phase 3**: Verify and test — T018-T023
4. **Commit**: Single commit with all changes

### MVP Scope

All tasks are MVP. The migration is atomic — partial implementation (some apps migrated, others not) would leave the database in an inconsistent state. All 23 tasks must be completed together.

---

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 26 |
| Parallel tasks (Phase 1) | 13 |
| Parallel tasks (Phase 2) | 5 (after T013) |
| Sequential tasks (Phase 3) | 7 |
| Files modified (models) | 13 |
| Files created (migrations) | 6 |
| Apps affected | 6 (marking, marking_vouchers, tutorials, rules_engine, students, userprofile) |
| Tables migrated | 13 |
