# Tasks: Catalog App Consolidation

**Input**: Design documents from `/specs/001-catalog-consolidation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included per project constitution (TDD enforcement)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/django_Admin3/`
- **New catalog app**: `backend/django_Admin3/catalog/`
- **Existing apps**: `backend/django_Admin3/subjects/`, `backend/django_Admin3/exam_sessions/`, `backend/django_Admin3/products/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create catalog app structure and configuration

- [x] T001 Create catalog app directory structure in backend/django_Admin3/catalog/ with __init__.py, apps.py, admin.py, urls.py, and subdirectories: models/, migrations/, serializers/, views/, tests/ (each with __init__.py)
- [x] T002 Create CatalogConfig in backend/django_Admin3/catalog/apps.py
- [x] T003 Add 'catalog' to INSTALLED_APPS (before subjects, exam_sessions, products) in backend/django_Admin3/django_Admin3/settings/base.py

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create PostgreSQL schema infrastructure that MUST be complete before models can be created

**⚠️ CRITICAL**: No model creation can begin until schema migration is ready

- [x] T004 Create 0001_initial.py migration with CREATE SCHEMA IF NOT EXISTS acted in backend/django_Admin3/catalog/migrations/0001_initial.py

**Checkpoint**: Schema infrastructure ready - model creation can now begin

---

## Phase 3: User Stories 1 & 2 - Catalog Models & Schema (Priority: P1) 🎯 MVP

**Goal US1**: All catalog models importable from `catalog.models` in a single import
**Goal US2**: All tables exist in `acted` schema with `acted.catalog_*` naming

**Independent Test US1**: `from catalog.models import Subject, Product, ExamSession, ProductVariation, ProductBundle` succeeds
**Independent Test US2**: Query `SELECT table_name FROM information_schema.tables WHERE table_schema = 'acted'` returns all 8 tables

### Tests for User Stories 1 & 2 (TDD: RED Phase - Write First, Must Fail)

**⚠️ TDD ENFORCEMENT**: Tests T005-T006 MUST complete and FAIL before implementation T007-T014 begins

- [x] T005 [US1] Create test_models.py with import tests in backend/django_Admin3/catalog/tests/test_models.py
- [x] T006 [US2] Create test_migrations.py with schema verification tests in backend/django_Admin3/catalog/tests/test_migrations.py

**Checkpoint**: Tests written and failing - proceed to implementation (GREEN phase)

### Implementation - Models (All Parallel - Different Files)

- [x] T007 [P] [US1] Create Subject model with db_table='acted.catalog_subjects' in backend/django_Admin3/catalog/models/subject.py
- [x] T008 [P] [US1] Create ExamSession model with db_table='acted.catalog_exam_sessions' in backend/django_Admin3/catalog/models/exam_session.py
- [x] T009 [P] [US1] Create Product model with db_table='acted.catalog_products' in backend/django_Admin3/catalog/models/product.py
- [x] T010 [P] [US1] Create ProductVariation model with db_table='acted.catalog_product_variations' in backend/django_Admin3/catalog/models/product_variation.py
- [x] T011 [P] [US1] Create ProductProductVariation junction with db_table='acted.catalog_product_product_variations' in backend/django_Admin3/catalog/models/product_product_variation.py
- [x] T012 [P] [US1] Create ProductProductGroup junction with db_table='acted.catalog_product_product_groups' in backend/django_Admin3/catalog/models/product_product_group.py
- [x] T013 [P] [US1] Create ProductBundle model with db_table='acted.catalog_product_bundles' in backend/django_Admin3/catalog/models/product_bundle.py
- [x] T014 [P] [US1] Create ProductBundleProduct junction with db_table='acted.catalog_product_bundle_products' in backend/django_Admin3/catalog/models/product_bundle_product.py

### Implementation - Re-exports and Migrations

- [x] T015 [US1] Create models/__init__.py re-exporting all 8 models in backend/django_Admin3/catalog/models/__init__.py
- [x] T016 [US2] Generate 0002 migration for model tables via makemigrations
- [x] T017 [US2] Create 0003_copy_data.py migration to copy data from old tables to new schema in backend/django_Admin3/catalog/migrations/0003_copy_data.py
- [x] T018 [US2] Run migrations and verify schema creation with python manage.py migrate catalog

**Checkpoint**: User Stories 1 & 2 complete - catalog models importable and schema created with data

---

## Phase 4: User Story 3 - Backward Compatibility (Priority: P2)

**Goal**: Existing code using `from subjects.models import Subject` continues to work without changes

**Independent Test**: Run existing imports from subjects, exam_sessions, and products apps - all succeed

### Tests for User Story 3 (TDD: RED Phase)

**⚠️ TDD ENFORCEMENT**: Test T019 MUST complete and FAIL before implementation T020-T022 begins

- [x] T019 [US3] Create test_backward_compat.py with re-export tests in backend/django_Admin3/catalog/tests/test_backward_compat.py

**Checkpoint**: Test written and passing - all 12 backward compatibility tests verified

### Implementation - Re-exports in Original Apps (All Parallel)

- [x] T020 [P] [US3] Update subjects/models.py to re-export Subject from catalog in backend/django_Admin3/subjects/models.py
- [x] T021 [P] [US3] Update exam_sessions/models.py to re-export ExamSession from catalog in backend/django_Admin3/exam_sessions/models.py
- [x] T022 [US3] Update products/models/__init__.py to re-export product models from catalog in backend/django_Admin3/products/models/__init__.py

**Checkpoint**: User Story 3 complete - backward compatibility verified ✅

---

## Phase 5: User Story 4 - Test Verification (Priority: P2)

**Goal**: All existing tests pass after migration with zero code changes to test files

**Independent Test**: `python manage.py test` runs all tests successfully

### Implementation

- [x] T023 [US4] Run full test suite to verify no regressions with python manage.py test (44 catalog tests pass)
- [x] T024 [US4] Verify data integrity - row counts match before/after for all 8 tables
- [x] T025 [US4] Verify foreign key relationships from dependent apps (cart, tutorials, marking) still work
- [x] T026 [US4] Create test_circular_imports.py to verify catalog has no circular import dependencies (SC-005) in backend/django_Admin3/catalog/tests/test_circular_imports.py

**Checkpoint**: User Story 4 complete - full regression testing passed ✅

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete app structure and documentation

- [x] T027 [P] Create admin.py with model registrations in backend/django_Admin3/catalog/admin.py
- [x] T027.5 Add Django admindocs-compatible docstrings to all catalog models (reStructuredText format with :model: references)
- [x] T028 [P] Create empty serializers/__init__.py in backend/django_Admin3/catalog/serializers/__init__.py (already exists)
- [x] T029 [P] Create empty views/__init__.py in backend/django_Admin3/catalog/views/__init__.py (already exists)
- [x] T030 [P] Create urls.py in backend/django_Admin3/catalog/urls.py (already exists)
- [x] T031 [P] Create tests/__init__.py in backend/django_Admin3/catalog/tests/__init__.py (already exists)
- [x] T032 Run quickstart.md verification checklist (all 10 items verified)
- [x] T033 Update spec.md status from Draft to Complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all model work
- **User Stories 1 & 2 (Phase 3)**: Depends on Foundational - core MVP
- **User Story 3 (Phase 4)**: Depends on US1 & US2 models existing
- **User Story 4 (Phase 5)**: Depends on US3 backward compat being done
- **Polish (Phase 6)**: Can run in parallel with later phases

### User Story Dependencies

```text
Setup (P1) → Foundational (P2) → US1 & US2 (P3) → US3 (P4) → US4 (P5) → Polish (P6)
                                      ↓
                               (MVP Complete)
```

- **User Stories 1 & 2 (P1)**: Combined because models and schema are interdependent
- **User Story 3 (P2)**: Depends on catalog models existing to re-export
- **User Story 4 (P2)**: Depends on backward compat to ensure tests pass

### Within Phase 3 (Model Creation) - TDD Flow

1. **RED Phase**: T005, T006 (tests) - run in parallel, MUST complete and FAIL first
2. **GREEN Phase**: T007-T014 (models) - can run in parallel after tests written
3. **Finalization**: T015 → T016 → T017 → T018 (sequential dependencies)

### Parallel Opportunities

**Phase 1**: T001 → T002, T003 (sequential due to dependencies)
**Phase 3 Tests (RED)**: T005, T006 (parallel) - MUST complete before implementation
**Phase 3 Models (GREEN)**: T007, T008, T009, T010, T011, T012, T013, T014 (all parallel after tests)
**Phase 4 Tests**: T019 (MUST complete before T020-T022)
**Phase 4 Implementation**: T020, T021 (parallel), T022 (depends on others)
**Phase 6**: T027, T028, T029, T030, T031 (all parallel)

---

## Parallel Example: Phase 3 Models

```bash
# Launch all model files together (8 parallel tasks):
Task: "T007 Create Subject model in backend/django_Admin3/catalog/models/subject.py"
Task: "T008 Create ExamSession model in backend/django_Admin3/catalog/models/exam_session.py"
Task: "T009 Create Product model in backend/django_Admin3/catalog/models/product.py"
Task: "T010 Create ProductVariation model in backend/django_Admin3/catalog/models/product_variation.py"
Task: "T011 Create ProductProductVariation in backend/django_Admin3/catalog/models/product_product_variation.py"
Task: "T012 Create ProductProductGroup in backend/django_Admin3/catalog/models/product_product_group.py"
Task: "T013 Create ProductBundle model in backend/django_Admin3/catalog/models/product_bundle.py"
Task: "T014 Create ProductBundleProduct in backend/django_Admin3/catalog/models/product_bundle_product.py"
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (schema migration)
3. Complete Phase 3: User Stories 1 & 2 (models + data migration)
4. **STOP and VALIDATE**: Test imports work, schema exists, data migrated
5. This is a deployable MVP

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. US1 & US2 → Test catalog imports + schema → MVP Complete!
3. US3 → Test backward compat imports → Backward compatibility done
4. US4 → Run full test suite → Regression testing complete
5. Polish → Admin, docs → Feature complete

### Recommended Flow

```text
Day 1: Phase 1 (Setup) + Phase 2 (Foundational)
Day 2: Phase 3 (Models - all parallel) + Migrations
Day 3: Phase 4 (Backward Compat) + Phase 5 (Testing)
Day 4: Phase 6 (Polish) + Final verification
```

---

## Notes

- [P] tasks = different files, no dependencies, can run simultaneously
- [Story] label maps task to specific user story for traceability
- US1 and US2 are combined in Phase 3 because models and schema are tightly coupled
- All model files can be created in parallel since FKs don't affect file creation
- ProductProductGroup has external FK to FilterGroup (stays in products app) - use string reference
- Old tables preserved per clarification - do NOT drop after data copy
- Verify row counts match before/after migration for data integrity

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 33 |
| Phase 1 (Setup) | 3 tasks |
| Phase 2 (Foundational) | 1 task |
| Phase 3 (US1 & US2) | 14 tasks |
| Phase 4 (US3) | 4 tasks |
| Phase 5 (US4) | 4 tasks |
| Phase 6 (Polish) | 7 tasks |
| Parallel Opportunities | 18 tasks marked [P] (tests excluded per TDD) |
| MVP Scope | Phases 1-3 (18 tasks) |
