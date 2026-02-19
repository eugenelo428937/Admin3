# Tasks: Admin Panel Backend API

**Input**: Design documents from `/specs/20260216-admin-panel-api/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included per constitution (TDD is non-negotiable). Tests written first (RED), implementation makes them pass (GREEN).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story (US1, US2, US3, US4)
- All paths relative to `backend/django_Admin3/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create test base class scaffolding for each app's admin tests

- [ ] T001 [P] Create catalog admin test file with base class setup and shared test data in catalog/tests/test_admin_views.py
- [ ] T002 [P] Create store admin test file with StoreAdminTestCase base class and shared test data in store/tests/test_admin_views.py
- [ ] T003 [P] Create users admin test file with UsersAdminTestCase base class and shared test data in users/tests/test_admin_views.py

> **T001 details**: Extend `CatalogAPITestCase` from `catalog/tests/base.py`. In `setUpTestData`, create additional test fixtures needed for admin endpoints: a second subject, second exam session, ProductVariation, ProductProductVariation, ProductBundle, ProductBundleProduct, and ProductVariationRecommendation instances. These fixtures support all US1 and US2 test classes.
>
> **T002 details**: Create `StoreAdminTestCase(APITestCase)` with JWT auth helpers (`authenticate_superuser`, `authenticate_regular_user`, `unauthenticate`) matching the `CatalogAPITestCase` pattern. In `setUpTestData`, create catalog prerequisites (Subject, ExamSession, ExamSessionSubject, Product, ProductVariation, ProductProductVariation) then store entities (store.Product, store.Price, store.Bundle, store.BundleProduct). Reference existing `store/tests/test_views.py` for data setup patterns.
>
> **T003 details**: Create `UsersAdminTestCase(APITestCase)` with same JWT auth helpers. In `setUpTestData`, create User objects with UserProfile, UserProfileAddress, UserProfileContactNumber, UserProfileEmail, and Staff instances.

**Checkpoint**: Test base classes ready — user story test writing can begin

---

## Phase 2: User Story 1 — Catalog ESS, Variations & PPV Mappings (P1)

**Goal**: Full CRUD endpoints for ExamSessionSubject, ProductVariation, and ProductProductVariation

**Independent Test**: `python manage.py test catalog.tests.test_admin_views.TestExamSessionSubjectAdminViewSet catalog.tests.test_admin_views.TestProductVariationAdminViewSet catalog.tests.test_admin_views.TestProductProductVariationAdminViewSet -v2`

### TDD RED: Write Failing Tests

- [ ] T004 [US1] Write TestExamSessionSubjectAdminViewSet in catalog/tests/test_admin_views.py — tests: list 200, retrieve 200, create 201 as superuser, create 403 as regular user, create 400 for duplicate (exam_session, subject), update 200 as superuser, delete 204 as superuser, delete 400 with dependent store products
- [ ] T005 [US1] Write TestProductVariationAdminViewSet in catalog/tests/test_admin_views.py — tests: list 200, retrieve 200, create 201 as superuser, create 403 as regular user, create 400 for duplicate (variation_type, name), update 200, delete 204, verify response includes description_short and code fields
- [ ] T006 [US1] Write TestProductProductVariationAdminViewSet in catalog/tests/test_admin_views.py — tests: list 200, retrieve 200, create 201 as superuser, create 403 as regular user, create 400 for duplicate (product, product_variation), delete 204, delete 400 with dependent store products

### TDD GREEN: Implementation

- [ ] T007 [P] [US1] Extend ProductVariationSerializer to include `description_short` and `code` fields in catalog/serializers/product_serializers.py
- [ ] T008 [P] [US1] Create ProductProductVariationAdminSerializer in catalog/serializers/product_serializers.py — fields: id (read-only), product, product_variation; unique_together validation
- [ ] T009 [P] [US1] Create ExamSessionSubjectViewSet in catalog/views/exam_session_subject_views.py — ModelViewSet with get_permissions() (AllowAny read, IsSuperUser write), destroy() with ProtectedError handling, queryset with select_related('exam_session', 'subject'), uses existing ExamSessionSubjectSerializer
- [ ] T010 [US1] Create ProductVariationViewSet and ProductProductVariationViewSet in catalog/views/product_variation_views.py — both follow same get_permissions() pattern; ProductVariationViewSet uses extended ProductVariationSerializer; ProductProductVariationViewSet uses new PPVAdminSerializer with select_related('product', 'product_variation')
- [ ] T011 [US1] Export new ViewSets from catalog/views/__init__.py and register all 3 in catalog/urls.py — routes: `exam-session-subjects`, `product-variations`, `product-product-variations`
- [ ] T012 [US1] Run US1 tests to verify GREEN: `python manage.py test catalog.tests.test_admin_views -v2`

**Checkpoint**: US1 complete — ExamSessionSubject, ProductVariation, PPV endpoints fully functional

---

## Phase 3: User Story 2 — Catalog Bundles & Recommendations (P2)

**Goal**: Full CRUD endpoints for ProductBundle, ProductBundleProduct, and ProductVariationRecommendation

**Independent Test**: `python manage.py test catalog.tests.test_admin_views.TestProductBundleAdminViewSet catalog.tests.test_admin_views.TestProductBundleProductAdminViewSet catalog.tests.test_admin_views.TestRecommendationAdminViewSet -v2`

### TDD RED: Write Failing Tests

- [ ] T013 [US2] Write TestProductBundleAdminViewSet in catalog/tests/test_admin_views.py — tests: list 200, create 201 as superuser, create 403 as regular user, create 400 for duplicate (subject, bundle_name), update 200, delete 204, delete 400 with dependent store bundles
- [ ] T014 [US2] Write TestProductBundleProductAdminViewSet in catalog/tests/test_admin_views.py — tests: list 200, list with ?bundle={id} filter, create 201, create 403 as regular user, create 400 for duplicate (bundle, product_product_variation), delete 204
- [ ] T015 [US2] Write TestRecommendationAdminViewSet in catalog/tests/test_admin_views.py — tests: list 200, create 201, create 403 as regular user, create 400 for self-reference (ppv == recommended_ppv), create 400 for duplicate (OneToOne), delete 204

### TDD GREEN: Implementation

- [ ] T016 [US2] Create ProductBundleAdminSerializer, ProductBundleProductAdminSerializer, and RecommendationAdminSerializer in catalog/serializers/product_serializers.py — ProductBundleAdmin: fields match data-model.md (bundle_name, subject, description, is_featured, is_active, display_order, timestamps read-only); ProductBundleProductAdmin: fields per data-model.md with bundle filter support; RecommendationAdmin: fields per data-model.md with self-reference validation in validate()
- [ ] T017 [P] [US2] Create ProductBundleAdminViewSet and ProductBundleProductViewSet in catalog/views/product_bundle_views.py — ProductBundleAdmin: ModelViewSet, get_permissions(), destroy() with ProtectedError; ProductBundleProduct: ModelViewSet, get_permissions(), queryset with select_related, filterset_fields=['bundle'] or get_queryset() filter
- [ ] T018 [P] [US2] Create RecommendationViewSet in catalog/views/recommendation_views.py — ModelViewSet, get_permissions(), queryset with select_related('product_product_variation', 'recommended_product_product_variation'), uses RecommendationAdminSerializer
- [ ] T019 [US2] Export new ViewSets from catalog/views/__init__.py and register all 3 in catalog/urls.py — routes: `product-bundles`, `bundle-products`, `recommendations`
- [ ] T020 [US2] Run all catalog admin tests to verify GREEN: `python manage.py test catalog.tests.test_admin_views -v2`

**Checkpoint**: US2 complete — ProductBundle, BundleProduct, Recommendation endpoints fully functional

---

## Phase 4: User Story 3 — Store API Write Operations (P3)

**Goal**: Upgrade existing read-only store endpoints to full CRUD; add new BundleProduct top-level endpoint

**Independent Test**: `python manage.py test store.tests.test_admin_views -v2`

**Backward Compatibility**: Existing GET responses MUST remain unchanged. Run existing store tests after upgrade: `python manage.py test store.tests.test_views -v2`

### TDD RED: Write Failing Tests

- [ ] T021 [US3] Write TestStoreProductAdminWrite in store/tests/test_admin_views.py — tests: existing GET list unchanged (backward compat), create 201 with auto-generated product_code, create 403 as regular user, create 400 for duplicate (ess, ppv), update 200, delete 204, delete 400 with dependent cart items/prices
- [ ] T022 [US3] Write TestStorePriceAdminWrite in store/tests/test_admin_views.py — tests: existing GET list unchanged, create 201, create 403 as regular user, create 400 for duplicate (product, price_type), update 200, delete 204
- [ ] T023 [US3] Write TestStoreBundleAdminWrite in store/tests/test_admin_views.py — tests: existing GET list unchanged, existing GET {id}/products/ unchanged, create 201, create 403, create 400 for duplicate (bundle_template, ess), update 200, delete 204, delete 400 with dependent bundle products
- [ ] T024 [US3] Write TestStoreBundleProductViewSet in store/tests/test_admin_views.py — tests: list 200, create 201, create 403, create 400 for duplicate (bundle, product), update 200, delete 204

### TDD GREEN: Implementation

- [ ] T025 [US3] Create BundleAdminWriteSerializer in store/serializers/bundle.py — simple ModelSerializer for write operations with fields: bundle_template, exam_session_subject, is_active, override_name, override_description, display_order (avoids heavy computed fields in existing BundleSerializer)
- [ ] T026 [P] [US3] Upgrade ProductViewSet in store/views/product.py — change ReadOnlyModelViewSet → ModelViewSet, add get_permissions() (AllowAny for list/retrieve, IsSuperUser for writes), add destroy() with ProtectedError handling, preserve existing custom list() and get_serializer_class() unchanged
- [ ] T027 [P] [US3] Upgrade PriceViewSet in store/views/price.py — change ReadOnlyModelViewSet → ModelViewSet, add get_permissions(), add destroy() method
- [ ] T028 [P] [US3] Upgrade BundleViewSet in store/views/bundle.py — change ReadOnlyModelViewSet → ModelViewSet, add get_permissions(), add get_serializer_class() returning BundleAdminWriteSerializer for create/update actions and existing BundleSerializer for read actions, add destroy() with ProtectedError, preserve existing @action products endpoint
- [ ] T029 [US3] Create BundleProductViewSet in store/views/bundle_product.py — new ModelViewSet with get_permissions() (AllowAny read, IsSuperUser write), uses existing BundleProductSerializer, queryset with select_related('bundle', 'product')
- [ ] T030 [US3] Export BundleProductViewSet from store/views/__init__.py (if applicable) and register in store/urls.py — route: `bundle-products`
- [ ] T031 [US3] Run all store tests (admin + existing) to verify GREEN and backward compat: `python manage.py test store.tests -v2`

**Checkpoint**: US3 complete — Store products, prices, bundles upgraded to CRUD; bundle-products endpoint added

---

## Phase 5: User Story 4 — User Profiles & Staff Management (P4)

**Goal**: New endpoints for user profile management (with nested sub-resources) and staff CRUD

**Independent Test**: `python manage.py test users.tests.test_admin_views -v2`

**Permission Note**: ALL operations (including GET) require IsSuperUser — user data is sensitive

### TDD RED: Write Failing Tests

- [ ] T032 [US4] Write TestUserProfileAdminViewSet in users/tests/test_admin_views.py — tests: list 200 as superuser, list 403 as regular user, retrieve 200 with nested user info (username, first_name, last_name, email), update 200 (title, send_invoices_to, send_study_material_to, remarks), update ignores user field changes (read-only)
- [ ] T033 [US4] Write TestUserProfileNestedEndpoints in users/tests/test_admin_views.py — tests: GET addresses 200 as superuser, GET addresses 403 as regular user, PUT address 200, GET contacts 200, PUT contact 200, GET emails 200, PUT email 200
- [ ] T034 [US4] Write TestStaffAdminViewSet in users/tests/test_admin_views.py — tests: list 200 as superuser, list 403 as regular user, create 201, create 400 for duplicate user (OneToOne), retrieve 200 with nested user info, update 200, delete 204

### TDD GREEN: Implementation

- [ ] T035 [US4] Create serializers in users/serializers.py — UserProfileAdminSerializer (nested read-only UserSerializer for user field, writable: title, send_invoices_to, send_study_material_to, remarks), UserProfileAddressSerializer, UserProfileContactSerializer, UserProfileEmailSerializer, StaffAdminSerializer (nested read-only UserSerializer on reads, writable user FK ID on writes)
- [ ] T036 [US4] Create UserProfileViewSet in users/views.py — ModelViewSet with permission_classes=[IsSuperUser] for ALL actions, queryset with select_related('user'), @action(detail=True) endpoints for addresses/contacts/emails returning filtered sub-resource lists
- [ ] T037 [US4] Create StaffViewSet in users/views.py — ModelViewSet with permission_classes=[IsSuperUser] for ALL actions, queryset with select_related('user'), uses StaffAdminSerializer
- [ ] T038 [US4] Register ViewSets and custom URL patterns in users/urls.py — router.register profiles and staff; add explicit path() entries for PUT on nested sub-resources: `profiles/<int:profile_pk>/addresses/<int:pk>/`, `profiles/<int:profile_pk>/contacts/<int:pk>/`, `profiles/<int:profile_pk>/emails/<int:pk>/`
- [ ] T039 [US4] Run all users admin tests to verify GREEN: `python manage.py test users.tests.test_admin_views -v2`

**Checkpoint**: US4 complete — User profiles with nested sub-resources and staff management fully functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full validation across all stories and contract verification

- [ ] T040 Run full test suite across all 3 apps: `python manage.py test catalog.tests.test_admin_views store.tests.test_admin_views users.tests.test_admin_views -v2`
- [ ] T041 Run existing test suites to verify no regressions: `python manage.py test catalog.tests.test_views store.tests.test_views -v2`
- [ ] T042 [P] Verify all 12 frontend service contracts are satisfied — check each endpoint URL from spec.md gap table responds with expected status codes and response formats per contracts/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately. T001, T002, T003 are parallel (different files).
- **US1 (Phase 2)**: Depends on T001 (catalog test base class)
- **US2 (Phase 3)**: Depends on Phase 2 completion (US2 tests append to same catalog test file; US2 serializers append to same serializer file)
- **US3 (Phase 4)**: Depends on T002 (store test base class). Independent of US1/US2.
- **US4 (Phase 5)**: Depends on T003 (users test base class). Independent of US1/US2/US3.
- **Polish (Phase 6)**: Depends on all story phases complete

### User Story Independence

- **US1 + US2**: Sequential (same catalog test and serializer files)
- **US3**: Fully independent of US1/US2 (different app, different files)
- **US4**: Fully independent of US1/US2/US3 (different app, different files)

### Parallel Opportunities

After Phase 1 setup completes:
- **US1 → US2** (sequential within catalog) can run in parallel with **US3** (store) and **US4** (users)
- Within US3: T026, T027, T028 are parallel (different view files)
- Within US1: T007, T008, T009 are parallel (different files)
- Within US2: T017, T018 are parallel (different view files)

---

## Parallel Example: Maximum Throughput

```text
# After Phase 1 completes, launch 3 parallel streams:

Stream A (Catalog):     US1 (T004→T012) → US2 (T013→T020)
Stream B (Store):       US3 (T021→T031)
Stream C (Users):       US4 (T032→T039)

# Then converge for Phase 6: T040→T042
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: US1 (T004-T012)
3. **STOP and VALIDATE**: ExamSessionSubject, ProductVariation, PPV endpoints work
4. Deploy/demo if ready

### Incremental Delivery

1. Setup → Foundation ready
2. Add US1 → Test → 3 new catalog endpoints working (MVP)
3. Add US2 → Test → 3 more catalog endpoints (bundles, recommendations)
4. Add US3 → Test → 4 store endpoints upgraded to CRUD
5. Add US4 → Test → 2 user endpoints (profiles, staff)
6. Each story adds value without breaking previous stories

### Full Parallel Strategy

With 3 parallel streams:
1. All complete Setup together
2. Stream A: US1 → US2 (catalog)
3. Stream B: US3 (store) — starts simultaneously with Stream A
4. Stream C: US4 (users) — starts simultaneously with Streams A and B
5. Converge for Polish phase

---

## Notes

- All models pre-exist — no migrations needed
- [P] tasks = different files, no dependencies between them
- [Story] label maps task to specific user story for traceability
- Follow quickstart.md patterns exactly for ViewSets, permissions, and tests
- Reference contracts/ for exact request/response formats
- Reference data-model.md for serializer field specifications
- Commit after each phase checkpoint
