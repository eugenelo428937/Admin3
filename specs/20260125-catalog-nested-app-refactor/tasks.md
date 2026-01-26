# Tasks: Catalog Nested Apps Refactoring

**Input**: Design documents from `/specs/20260125-catalog-nested-app-refactor/`
**Prerequisites**: plan.md (tech stack), spec.md (user stories), research.md (50+ import locations), data-model.md (model relocations), quickstart.md (implementation guide)

**Tests**: Not explicitly requested in spec. Existing Django tests will validate behavior preservation.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (US1-US5)
- All paths relative to `backend/django_Admin3/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create nested app directory structure and base configuration

- [ ] T001 Create feature branch `20260125-catalog-nested-app-refactor` if not exists
- [ ] T002 [P] Create directory structure `catalog/exam_session/` with `__init__.py`
- [ ] T003 [P] Create directory structure `catalog/subject/` with `__init__.py`
- [ ] T004 [P] Create directory structure `catalog/products/` with `__init__.py`
- [ ] T005 [P] Create directory structure `catalog/products/models/` with `__init__.py`
- [ ] T006 [P] Create directory structure `catalog/products/bundle/` with `__init__.py`
- [ ] T007 [P] Create directory structure `catalog/products/recommendation/` with `__init__.py`
- [ ] T008 [P] Create migration directories `catalog/exam_session/migrations/` with `__init__.py`
- [ ] T009 [P] Create migration directories `catalog/subject/migrations/` with `__init__.py`
- [ ] T010 [P] Create migration directories `catalog/products/migrations/` with `__init__.py`
- [ ] T011 [P] Create migration directories `catalog/products/bundle/migrations/` with `__init__.py`
- [ ] T012 [P] Create migration directories `catalog/products/recommendation/migrations/` with `__init__.py`

**Checkpoint**: All directory structures ready for model placement

---

## Phase 2: Foundational (App Configuration)

**Purpose**: Configure Django app registry for all nested apps - BLOCKS all user story work

**⚠️ CRITICAL**: No user story work can begin until all apps.py files are registered

- [ ] T013 Create `catalog/exam_session/apps.py` with ExamSessionConfig (label='catalog_exam_sessions')
- [ ] T014 [P] Create `catalog/subject/apps.py` with SubjectConfig (label='catalog_subjects')
- [ ] T015 [P] Create `catalog/products/apps.py` with ProductsConfig (label='catalog_products')
- [ ] T016 [P] Create `catalog/products/bundle/apps.py` with BundleConfig (label='catalog_products_bundles')
- [ ] T017 [P] Create `catalog/products/recommendation/apps.py` with RecommendationConfig (label='catalog_products_recommendations')
- [ ] T018 Update `django_Admin3/settings.py` INSTALLED_APPS with all nested apps in dependency order
- [ ] T019 Verify `python manage.py check` passes with new app configuration

**Checkpoint**: All 6 apps registered in Django - model relocation can begin

---

## Phase 3: User Story 1 - Core Catalog Independence (Priority: P1) 🎯 MVP

**Goal**: Make ExamSession and Subject modules independently deployable without product dependencies

**Independent Test**: Deploy catalog.exam_session and catalog.subject to fresh Django project - migrations complete without product imports

### Implementation for User Story 1

- [ ] T020 [US1] Move `catalog/models/exam_session.py` to `catalog/exam_session/models.py` with updated Meta (app_label='catalog_exam_sessions')
- [ ] T021 [P] [US1] Move `catalog/models/subject.py` to `catalog/subject/models.py` with updated Meta (app_label='catalog_subjects')
- [ ] T022 [US1] Update `catalog/models/exam_session_subject.py` FKs to string references ('catalog_exam_sessions.ExamSession', 'catalog_subjects.Subject')
- [ ] T023 [US1] Update `catalog/models/__init__.py` to export only ExamSessionSubject (remove all product exports)
- [ ] T024 [US1] Update `catalog/admin.py` to import ExamSession and Subject from new locations
- [ ] T025 [US1] Update `catalog/serializers/` files to import from new locations
- [ ] T026 [US1] Update `catalog/views/exam_session_views.py` import path
- [ ] T027 [US1] Update `catalog/views/subject_views.py` import path
- [ ] T028 [US1] Update `misc/subjects/models.py` import from `catalog.subject.models`
- [ ] T029 [US1] Verify no product imports exist in catalog/exam_session/ or catalog/subject/
- [ ] T030 [US1] Run `python manage.py test catalog.exam_session catalog.subject` to verify isolation

**Checkpoint**: Core catalog modules (ExamSession, Subject) are isolated and independently testable

---

## Phase 4: User Story 2 - Products Layer Organization (Priority: P2)

**Goal**: Organize product-related models into catalog/products/ with bundle and recommendation sub-apps

**Independent Test**: Navigate to any product model by folder hierarchy (products/, products/bundle/, products/recommendation/)

### Implementation for User Story 2

- [ ] T031 [US2] Move `catalog/models/product.py` to `catalog/products/models/product.py` with updated Meta (app_label='catalog_products')
- [ ] T032 [P] [US2] Move `catalog/models/product_variation.py` to `catalog/products/models/product_variation.py` with updated Meta
- [ ] T033 [P] [US2] Move `catalog/models/product_product_variation.py` to `catalog/products/models/product_product_variation.py` with updated Meta
- [ ] T034 [US2] Create `catalog/products/models/__init__.py` exporting Product, ProductVariation, ProductProductVariation
- [ ] T035 [US2] Move `catalog/models/product_bundle.py` to `catalog/products/bundle/models.py` with updated Meta (app_label='catalog_products_bundles')
- [ ] T036 [US2] Append ProductBundleProduct from `catalog/models/product_bundle_product.py` to `catalog/products/bundle/models.py`
- [ ] T037 [US2] Move `catalog/models/product_variation_recommendation.py` to `catalog/products/recommendation/models.py` with updated Meta (app_label='catalog_products_recommendations')
- [ ] T038 [US2] Update FKs in `catalog/products/bundle/models.py` to string references ('catalog_subjects.Subject', 'catalog_products.ProductProductVariation')
- [ ] T039 [US2] Update FKs in `catalog/products/recommendation/models.py` to string references ('catalog_products.ProductProductVariation')
- [ ] T040 [US2] Update FKs in `catalog/products/models/product_product_variation.py` to string references ('catalog_products.Product', 'catalog_products.ProductVariation')
- [ ] T041 [US2] Delete old model files from `catalog/models/` (product.py, product_variation.py, product_product_variation.py, product_bundle.py, product_bundle_product.py, product_variation_recommendation.py)
- [ ] T042 [US2] Run `python manage.py check` to verify products layer configuration

**Checkpoint**: Products layer organized into nested structure with bundle/recommendation sub-apps

---

## Phase 5: User Story 3 - Filter System Cohesion (Priority: P2)

**Goal**: Move ProductProductGroup to filtering app for filter-related model cohesion

**Independent Test**: Filter queries use only filtering app models

### Implementation for User Story 3

- [ ] T043 [US3] Move `catalog/models/product_product_group.py` to `filtering/models/product_product_group.py`
- [ ] T044 [US3] Update ProductProductGroup Meta (db_table='"acted"."filtering_product_product_groups"')
- [ ] T045 [US3] Update ProductProductGroup FKs to string references ('catalog_products.Product', 'filtering.FilterGroup')
- [ ] T046 [US3] Update `filtering/models/__init__.py` to export ProductProductGroup
- [ ] T047 [US3] Delete `catalog/models/product_product_group.py`
- [ ] T048 [US3] Verify catalog app has no imports from filtering app
- [ ] T049 [US3] Run `python manage.py check` to verify filtering configuration

**Checkpoint**: ProductProductGroup relocated to filtering app, catalog has no filtering dependencies

---

## Phase 6: User Story 4 - Marking App Migration (Priority: P3)

**Goal**: Migrate marking app from ExamSessionSubjectProduct to store.Product, then remove ESSP

**Independent Test**: Create and query marking papers using store.Product references

### Implementation for User Story 4

- [ ] T050 [US4] Update `marking/models/marking_paper.py` to add nullable FK to store.Product
- [ ] T051 [US4] Create data migration `marking/migrations/0002_migrate_to_store_product.py` per data-model.md
- [ ] T052 [US4] Update `marking/models/marking_paper.py` to remove ExamSessionSubjectProduct FK
- [ ] T053 [US4] Update `marking/views.py` to use store.Product instead of ESSP
- [ ] T054 [US4] Update `marking/management/commands/import_marking_deadlines.py` to use store.Product
- [ ] T055 [US4] Delete `catalog/models/exam_session_subject_product.py`
- [ ] T056 [US4] Remove ExamSessionSubjectProduct from `catalog/admin.py`
- [ ] T057 [US4] Run `python manage.py test marking` to verify migration
- [ ] T058 [US4] Verify no ExamSessionSubjectProduct references remain in codebase (except migrations_backup)

**Checkpoint**: Marking app uses store.Product, ExamSessionSubjectProduct removed

---

## Phase 7: Import Statement Updates (Cross-Story)

**Purpose**: Update all 50+ import statements across the codebase to use new paths

**Note**: This phase can be parallelized with US3/US4 since files are different

### High Priority (Production Code)

- [ ] T059 [P] Update `filtering/views.py` imports from `catalog.products.models import Product`
- [ ] T060 [P] Update `filtering/services/filter_service.py` imports from catalog.subject and catalog.products
- [ ] T061 [P] Update `cart/services/cart_service.py` imports from catalog.products.models
- [ ] T062 [P] Update `store/models/product.py` FK string reference to 'catalog_products.ProductProductVariation'
- [ ] T063 [P] Update `tutorials/views.py` imports from catalog.products.models
- [ ] T064 [P] Update `search/services/search_service.py` imports from catalog.subject and catalog.products.recommendation

### Medium Priority (Catalog Internal)

- [ ] T065 [P] Update `catalog/views/navigation_views.py` imports from new nested locations
- [ ] T066 [P] Update `catalog/views/product_views.py` imports from catalog.products.models
- [ ] T067 [P] Update all `catalog/serializers/*.py` files with new import paths
- [ ] T068 [P] Update `misc/products/models/products.py` imports from catalog.products.models
- [ ] T069 [P] Update `misc/products/models/product_variation.py` imports
- [ ] T070 [P] Update `misc/products/models/bundle_product.py` imports from catalog.products.bundle.models

### Low Priority (Tests)

- [ ] T071 [P] Update `marking/tests/test_models.py` imports
- [ ] T072 [P] Update `marking/tests/test_views.py` imports
- [ ] T073 [P] Update `store/tests/test_models.py` imports
- [ ] T074 [P] Update `store/tests/test_views.py` imports
- [ ] T075 [P] Update `catalog/tests/*.py` imports
- [ ] T076 [P] Update `tutorials/tests/*.py` imports
- [ ] T077 [P] Update `cart/tests/*.py` imports
- [ ] T078 [P] Update rules engine test imports (test_phase4_t027-t032)

**Checkpoint**: All import statements use new paths

---

## Phase 8: User Story 5 - Fresh Migration Baseline (Priority: P3)

**Goal**: Create fresh migrations for all nested apps with correct table names in acted schema

**Independent Test**: Run `python manage.py migrate --fake` on existing database without errors

### Implementation for User Story 5

- [ ] T079 [US5] Backup existing migrations `cp -r catalog/migrations catalog/migrations_backup`
- [ ] T080 [US5] Delete old migration files from `catalog/migrations/` (keep __init__.py)
- [ ] T081 [US5] Run `python manage.py makemigrations catalog_exam_sessions`
- [ ] T082 [US5] Run `python manage.py makemigrations catalog_subjects`
- [ ] T083 [US5] Run `python manage.py makemigrations catalog`
- [ ] T084 [US5] Run `python manage.py makemigrations catalog_products`
- [ ] T085 [US5] Run `python manage.py makemigrations catalog_products_bundles`
- [ ] T086 [US5] Run `python manage.py makemigrations catalog_products_recommendations`
- [ ] T087 [US5] Run `python manage.py makemigrations filtering` for ProductProductGroup
- [ ] T088 [US5] Verify all migration files reference `acted` schema in db_table
- [ ] T089 [US5] Run `python manage.py migrate --fake` on existing database
- [ ] T090 [US5] Verify `python manage.py check` passes with no warnings

**Checkpoint**: Fresh migrations created and fake-applied to existing database

---

## Phase 9: Polish & Verification

**Purpose**: Final validation and cleanup

- [ ] T091 Run full test suite `python manage.py test` to verify no regressions
- [ ] T092 Verify no circular imports at Django startup
- [ ] T093 Verify no old import patterns remain: `grep -r "from catalog.models import Product" --include="*.py" .`
- [ ] T094 Verify no ESSP references: `grep -r "ExamSessionSubjectProduct" --include="*.py" . | grep -v migrations_backup`
- [ ] T095 Update CLAUDE.md Active Technologies section with refactoring notes
- [ ] T096 Create git commit with all changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all model moves
- **Phase 3 (US1)**: Depends on Phase 2 - core catalog isolation
- **Phase 4 (US2)**: Depends on Phase 2 - can run parallel with US1 after T023
- **Phase 5 (US3)**: Depends on T041 (products moved before PPG move)
- **Phase 6 (US4)**: Depends on Phase 2 - independent of US1-3
- **Phase 7 (Imports)**: Can run parallel with US3/US4 (different files)
- **Phase 8 (US5)**: Depends on ALL model moves complete (US1-4)
- **Phase 9 (Polish)**: Depends on all previous phases

### User Story Dependencies

```text
             ┌────────────────┐
             │  Phase 2       │
             │ (Foundational) │
             └───────┬────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
   ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
   │  US1    │  │  US2    │  │  US4    │
   │ (Core)  │  │(Products)│  │(Marking)│
   └────┬────┘  └────┬────┘  └────┬────┘
        │            │            │
        │       ┌────▼────┐       │
        │       │  US3    │       │
        │       │(Filter) │       │
        │       └────┬────┘       │
        │            │            │
        └────────────┼────────────┘
                     │
             ┌───────▼────────┐
             │     US5        │
             │  (Migrations)  │
             └────────────────┘
```

- **US1 (P1)**: Can start after Phase 2 - No story dependencies
- **US2 (P2)**: Can start after Phase 2 - Parallel with US1
- **US3 (P2)**: Depends on US2 (products must be moved first)
- **US4 (P3)**: Can start after Phase 2 - Parallel with US1-3
- **US5 (P3)**: Depends on US1-4 (all model moves must be complete)

### Parallel Opportunities

Within each phase, tasks marked [P] can run in parallel:
- **Phase 1**: All directory creations (T002-T012) can run in parallel
- **Phase 2**: App configs (T014-T017) can run in parallel
- **Phase 3**: T020, T021 can run in parallel
- **Phase 4**: T031-T033 can run in parallel
- **Phase 7**: All import updates (T059-T078) can run in parallel

---

## Parallel Example: Phase 1 Setup

```bash
# Launch all directory creations together:
Task: "Create directory structure catalog/exam_session/ with __init__.py"
Task: "Create directory structure catalog/subject/ with __init__.py"
Task: "Create directory structure catalog/products/ with __init__.py"
Task: "Create directory structure catalog/products/models/ with __init__.py"
Task: "Create directory structure catalog/products/bundle/ with __init__.py"
Task: "Create directory structure catalog/products/recommendation/ with __init__.py"
```

## Parallel Example: Phase 7 Imports

```bash
# Launch all production code import updates together:
Task: "Update filtering/views.py imports"
Task: "Update filtering/services/filter_service.py imports"
Task: "Update cart/services/cart_service.py imports"
Task: "Update store/models/product.py FK string reference"
Task: "Update tutorials/views.py imports"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (directory structure)
2. Complete Phase 2: Foundational (app configuration)
3. Complete Phase 3: User Story 1 (core catalog isolation)
4. **STOP and VALIDATE**: Test ExamSession/Subject independence
5. Core catalog can now be deployed independently

### Incremental Delivery

1. Setup + Foundational → App structure ready
2. Add US1 (Core) → Test independently → Core modules deployable ✓
3. Add US2 (Products) → Test independently → Products organized ✓
4. Add US3 (Filter) → Test independently → Filter cohesion complete ✓
5. Add US4 (Marking) → Test independently → ESSP removed ✓
6. Add US5 (Migrations) → Run --fake → Clean migration baseline ✓
7. Phase 9 (Polish) → Full test suite green → Ready for merge

### Recommended Sequence (Single Developer)

1. Phases 1-2 (Setup + Foundational) → ~30 min
2. Phase 3 (US1) → ~1 hour
3. Phase 4 (US2) → ~1 hour
4. Phase 5 (US3) → ~30 min
5. Phase 6 (US4) → ~1 hour
6. Phase 7 (Imports) → ~2 hours
7. Phase 8 (US5) → ~30 min
8. Phase 9 (Polish) → ~30 min

---

## Notes

- All directory paths relative to `backend/django_Admin3/`
- Existing tests validate behavior preservation - no new tests required
- Use `python manage.py check` after each major change
- Commit after each checkpoint for safe rollback
- Fresh migrations use --fake strategy for existing database with data
- ESSP removal is irreversible - ensure marking migration is verified first
