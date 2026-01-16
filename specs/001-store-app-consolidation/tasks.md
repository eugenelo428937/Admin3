# Tasks: Store App Consolidation

**Input**: Design documents from `/specs/001-store-app-consolidation/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: Included per Constitution requirement (TDD Non-Negotiable, 80% coverage for new code)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/django_Admin3/`
- **Frontend**: `frontend/react-Admin3/`
- **Migrations**: `backend/django_Admin3/{app}/migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create store app structure and prepare for migration

- [X] T001 Create store app directory structure in backend/django_Admin3/store/
- [X] T002 Create store/apps.py with StoreConfig
- [X] T003 [P] Create store/models/__init__.py with model exports
- [X] T004 [P] Create store/serializers/__init__.py with serializer exports
- [X] T005 [P] Create store/views/__init__.py with view exports
- [X] T006 Register store app in backend/django_Admin3/django_Admin3/settings/base.py INSTALLED_APPS
- [X] T007 Create store/urls.py with router configuration
- [X] T008 Register store URLs in backend/django_Admin3/django_Admin3/urls.py

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Catalog app updates that MUST complete before store models can be created

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T009 Create ExamSessionSubject model in backend/django_Admin3/catalog/models/exam_session_subject.py (move from exam_sessions_subjects)
- [X] T010 Update backend/django_Admin3/catalog/models/__init__.py to export ExamSessionSubject
- [X] T011 Create migration backend/django_Admin3/catalog/migrations/0006_add_exam_session_subject.py to move ESS model
- [X] T012 Create alias in backend/django_Admin3/exam_sessions_subjects/models.py pointing to catalog.ExamSessionSubject
- [X] T013 Apply catalog ESS migration and verify data integrity (24 records migrated, IDs preserved)

**Checkpoint**: ✅ Foundation ready - catalog.ExamSessionSubject exists, user story implementation can begin

---

## Phase 3: User Story 1 - Product Catalog Data Integrity (Priority: P1) 🎯 MVP

**Goal**: Eliminate redundant ESSP table, create clean store.Product model linking directly to ESS

**Independent Test**: Create products and verify all information comes from catalog.ProductProductVariation without intermediate lookups

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T014 [P] [US1] Create test file backend/django_Admin3/store/tests/__init__.py
- [ ] T015 [P] [US1] Test store.Product model in backend/django_Admin3/store/tests/test_models.py
- [ ] T016 [P] [US1] Test store.Price model in backend/django_Admin3/store/tests/test_models.py
- [ ] T017 [P] [US1] Test store.Bundle model in backend/django_Admin3/store/tests/test_models.py
- [ ] T018 [P] [US1] Test store.BundleProduct model in backend/django_Admin3/store/tests/test_models.py
- [ ] T019 [P] [US1] Test product code generation in backend/django_Admin3/store/tests/test_models.py
- [ ] T020 [P] [US1] Test unique constraints (ESS+PPV combination) in backend/django_Admin3/store/tests/test_models.py

### Implementation for User Story 1

- [ ] T021 [P] [US1] Create store.Product model in backend/django_Admin3/store/models/product.py
- [ ] T022 [P] [US1] Create store.Price model in backend/django_Admin3/store/models/price.py
- [ ] T023 [P] [US1] Create store.Bundle model in backend/django_Admin3/store/models/bundle.py
- [ ] T024 [P] [US1] Create store.BundleProduct model in backend/django_Admin3/store/models/bundle_product.py
- [ ] T025 [US1] Update backend/django_Admin3/store/models/__init__.py to export all models
- [ ] T026 [US1] Create migration backend/django_Admin3/store/migrations/0001_initial.py for store tables
- [ ] T027 [US1] Create data migration backend/django_Admin3/store/migrations/0002_migrate_product_data.py (ESSPV → store.Product)
- [ ] T028 [US1] Create data migration backend/django_Admin3/store/migrations/0003_migrate_price_data.py
- [ ] T029 [US1] Create data migration backend/django_Admin3/store/migrations/0004_migrate_bundle_data.py
- [ ] T030 [US1] Apply store migrations and verify zero data loss
- [ ] T031 [US1] Verify product queries use ≤ 2 joins (SC-003)

**Checkpoint**: store.Product exists, data migrated with preserved FK IDs, tests pass

---

## Phase 4: User Story 2 - Shopping Cart and Order Continuity (Priority: P1)

**Goal**: Update cart FK references to use store.Product while preserving all cart/order functionality

**Independent Test**: Add products to cart, complete checkout, verify order history displays correctly

### Tests for User Story 2 ⚠️

- [ ] T032 [P] [US2] Test cart FK to store.Product in backend/django_Admin3/cart/tests/test_models.py
- [ ] T033 [P] [US2] Test cart add/remove operations in backend/django_Admin3/cart/tests/test_views.py
- [ ] T034 [P] [US2] Test checkout flow in backend/django_Admin3/cart/tests/test_views.py
- [ ] T035 [P] [US2] Test order history display in backend/django_Admin3/cart/tests/test_views.py

### Implementation for User Story 2

- [ ] T036 [US2] Update CartItem model FK in backend/django_Admin3/cart/models.py (ESSPV → store.Product)
- [ ] T037 [US2] Create migration backend/django_Admin3/cart/migrations/0XXX_update_product_fk.py
- [ ] T038 [US2] Update cart serializers in backend/django_Admin3/cart/serializers.py
- [ ] T039 [US2] Update cart views in backend/django_Admin3/cart/views.py
- [ ] T040 [US2] Apply cart migration and verify FK integrity
- [ ] T041 [US2] Run existing cart tests to verify continuity (SC-001)

**Checkpoint**: Cart and checkout working with store.Product, historical orders display correctly

---

## Phase 5: User Story 3 - Clean Architecture for Maintenance (Priority: P2)

**Goal**: Remove redundant wrapper apps and intermediate entities

**Independent Test**: Verify reduced app count and simplified query patterns

### Tests for User Story 3 ⚠️

- [ ] T042 [P] [US3] Test that old ESSP imports are deprecated in backend/django_Admin3/exam_sessions_subjects_products/tests/
- [ ] T043 [P] [US3] Test catalog imports work correctly in backend/django_Admin3/catalog/tests/

### Implementation for User Story 3

- [ ] T044 [US3] Create deprecation wrapper in backend/django_Admin3/exam_sessions_subjects_products/models.py
- [ ] T045 [US3] Create deprecation wrapper in backend/django_Admin3/exam_sessions_subjects/models.py
- [ ] T046 [P] [US3] Update backend/django_Admin3/tutorials/views.py imports to use catalog/store
- [ ] T047 [P] [US3] Update backend/django_Admin3/marking/views.py imports to use catalog/store
- [ ] T048 [US3] Run full test suite to verify no import breaks
- [ ] T049 [US3] Verify app count reduced (SC-004)

**Checkpoint**: Legacy apps contain only deprecation wrappers, all imports updated

---

## Phase 6: User Story 4 - Admin Product Management (Priority: P2)

**Goal**: Admin interface and API for store models CRUD operations

**Independent Test**: Create, update, delete products, prices, and bundles via admin interface

### Tests for User Story 4 ⚠️

- [ ] T050 [P] [US4] Test Product API endpoints in backend/django_Admin3/store/tests/test_views.py
- [ ] T051 [P] [US4] Test Price API endpoints in backend/django_Admin3/store/tests/test_views.py
- [ ] T052 [P] [US4] Test Bundle API endpoints in backend/django_Admin3/store/tests/test_views.py
- [ ] T053 [P] [US4] Test BundleProduct API endpoints in backend/django_Admin3/store/tests/test_views.py

### Implementation for User Story 4

- [ ] T054 [P] [US4] Create ProductSerializer in backend/django_Admin3/store/serializers/product_serializer.py
- [ ] T055 [P] [US4] Create PriceSerializer in backend/django_Admin3/store/serializers/price_serializer.py
- [ ] T056 [P] [US4] Create BundleSerializer in backend/django_Admin3/store/serializers/bundle_serializer.py
- [ ] T057 [P] [US4] Create BundleProductSerializer in backend/django_Admin3/store/serializers/bundle_product_serializer.py
- [ ] T058 [US4] Update backend/django_Admin3/store/serializers/__init__.py exports
- [ ] T059 [P] [US4] Create ProductViewSet in backend/django_Admin3/store/views/product_views.py
- [ ] T060 [P] [US4] Create PriceViewSet in backend/django_Admin3/store/views/price_views.py
- [ ] T061 [P] [US4] Create BundleViewSet in backend/django_Admin3/store/views/bundle_views.py
- [ ] T062 [P] [US4] Create BundleProductViewSet in backend/django_Admin3/store/views/bundle_product_views.py
- [ ] T063 [US4] Update backend/django_Admin3/store/views/__init__.py exports
- [ ] T064 [US4] Register viewsets in backend/django_Admin3/store/urls.py router
- [ ] T065 [US4] Create store admin configuration in backend/django_Admin3/store/admin.py
- [ ] T066 [US4] Verify admin CRUD operations work (SC-007)

**Checkpoint**: Store API fully functional, admin interface operational

---

## Phase 7: User Story 5 - Filter System Consolidation (Priority: P3)

**Goal**: Move filter system from products app to catalog app

**Independent Test**: Apply filters and verify correct results

### Tests for User Story 5 ⚠️

- [ ] T067 [P] [US5] Test filter views in backend/django_Admin3/catalog/tests/test_filter_views.py
- [ ] T068 [P] [US5] Test filter serializers in backend/django_Admin3/catalog/tests/test_filter_serializers.py

### Implementation for User Story 5

- [ ] T069 [P] [US5] Move filter models to backend/django_Admin3/catalog/models/filters.py
- [ ] T070 [P] [US5] Move filter views to backend/django_Admin3/catalog/views/filter_views.py
- [ ] T071 [P] [US5] Move filter serializers to backend/django_Admin3/catalog/serializers/filter_serializers.py
- [ ] T072 [US5] Update backend/django_Admin3/catalog/models/__init__.py with filter exports
- [ ] T073 [US5] Update backend/django_Admin3/catalog/urls.py with filter endpoints
- [ ] T074 [US5] Create deprecation wrapper in backend/django_Admin3/products/views.py
- [ ] T075 [US5] Verify filter functionality returns accurate results (SC-008)

**Checkpoint**: Filter system consolidated in catalog app, working correctly

---

## Phase 8: Strangler Fig API Compatibility

**Purpose**: Legacy API endpoints delegate to new store API

- [ ] T076 Create legacy endpoint wrapper in backend/django_Admin3/exam_sessions_subjects_products/views.py
- [ ] T077 Add deprecation warnings to legacy API responses
- [ ] T078 Update frontend API client in frontend/react-Admin3/src/services/ if needed
- [ ] T079 Test legacy API still returns expected responses

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, verification, and final validation

- [ ] T080 [P] Run full backend test suite: python manage.py test
- [ ] T081 [P] Verify test coverage meets 80% threshold for new code
- [ ] T082 Verify all success criteria from spec.md are met
- [ ] T083 Verify inactive catalog template handling (FR-012) in store/views/product_views.py
- [ ] T084 Create management command to clear carts pre-migration (FR-013)
- [ ] T085 [P] Update backend/django_Admin3/catalog/models/product.py docstrings (rename context)
- [ ] T086 Run quickstart.md validation steps
- [ ] T087 Cleanup: Remove dead code from legacy apps after deprecation period

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phase 3-7 (User Stories)**: All depend on Phase 2 completion
- **Phase 8 (Strangler Fig)**: Depends on Phase 6 (US4 API)
- **Phase 9 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 - No dependencies on other stories
- **US2 (P1)**: Depends on US1 (needs store.Product to exist)
- **US3 (P2)**: Depends on US1 and US2 (needs store models and cart updates)
- **US4 (P2)**: Depends on US1 (needs store models)
- **US5 (P3)**: Independent - can run in parallel with US3/US4 after US1

### Critical Path

```
Setup → Foundational → US1 → US2 → (US3 | US4 | US5) → Strangler Fig → Polish
```

### Parallel Opportunities

**After Phase 2 (Foundational):**
- All US1 test tasks (T014-T020) can run in parallel
- All US1 model tasks (T021-T024) can run in parallel

**After US1 completion:**
- US3 (architecture cleanup) and US4 (admin API) can run in parallel
- US5 (filter consolidation) can start independently

**Within US4:**
- All serializer tasks (T054-T057) can run in parallel
- All viewset tasks (T059-T062) can run in parallel

---

## Parallel Example: User Story 1 Models

```bash
# Launch all US1 model tasks together (after tests written):
Task: "Create store.Product model in backend/django_Admin3/store/models/product.py"
Task: "Create store.Price model in backend/django_Admin3/store/models/price.py"
Task: "Create store.Bundle model in backend/django_Admin3/store/models/bundle.py"
Task: "Create store.BundleProduct model in backend/django_Admin3/store/models/bundle_product.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 (data model consolidation)
4. Complete Phase 4: User Story 2 (cart continuity)
5. **STOP and VALIDATE**: Test cart add/checkout/order history
6. Deploy to staging for validation

### Incremental Delivery

| Milestone | Stories Complete | Value Delivered |
|-----------|-----------------|-----------------|
| M1 | US1 + US2 | Core consolidation + cart working |
| M2 | + US3 | Legacy apps deprecated |
| M3 | + US4 | Admin API operational |
| M4 | + US5 | Filter system consolidated |
| M5 | Polish | Production-ready |

### Pre-Migration Checklist (FR-013)

Before running migrations on production:

1. [ ] Notify users of upcoming maintenance window
2. [ ] Run T084 to clear all shopping carts
3. [ ] Backup database
4. [ ] Run migrations on staging first
5. [ ] Verify all FK IDs preserved

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD Constitution requirement)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- FK ID preservation is CRITICAL for cart/order integrity
