# Tasks: Admin Panel

**Input**: Design documents from `/specs/20260216-admin-panel/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/frontend-services.md, quickstart.md

**Tests**: Tests are included per the project constitution (TDD enforcement, SC-008: 80% coverage minimum). Each entity gets `__tests__/` with component tests written before implementation.

**Organization**: Tasks grouped by user story (P1-P5) for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend root**: `frontend/react-Admin3/src/`
- **Components**: `frontend/react-Admin3/src/components/admin/{entity}/`
- **Tests**: `frontend/react-Admin3/src/components/admin/{entity}/__tests__/`
- **Services**: `frontend/react-Admin3/src/services/`
- **Navigation**: `frontend/react-Admin3/src/components/Navigation/`
- **Routes**: `frontend/react-Admin3/src/App.js`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify existing patterns and establish foundation for new admin pages

- [ ] T001 Verify existing admin component patterns by reading frontend/react-Admin3/src/components/admin/exam-sessions/ExamSessionList.js, ExamSessionForm.js, and __tests__/ to confirm List/Form/test conventions
- [ ] T002 Verify existing service patterns by reading frontend/react-Admin3/src/services/examSessionService.js and frontend/react-Admin3/src/services/subjectService.js to confirm httpService + config URL conventions
- [ ] T003 Verify MegaMenuPopover component API by reading frontend/react-Admin3/src/components/Navigation/MegaMenuPopover.js to confirm props: id, label, children, width, onOpen, onClose

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No foundational infrastructure changes needed. Existing httpService, config, useAuth, and MegaMenuPopover are all in place and READ ONLY. All new services compose URLs from existing config entries (R4).

**Checkpoint**: Foundation is already ready — user story implementation can begin immediately after Phase 1 verification.

---

## Phase 3: User Story 1 — Admin MegaMenu Navigation (Priority: P1) MVP

**Goal**: Replace the current 3-item Admin `<Menu>` dropdown with a full-width `<MegaMenuPopover>` organized in two rows of categorized admin links with disabled placeholders for future modules.

**Independent Test**: Login as superuser, verify all menu categories appear, enabled links navigate correctly, disabled links are dimmed and non-clickable, non-superusers don't see the Admin button.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T004 [P] [US1] Write MegaMenu navigation tests in frontend/react-Admin3/src/components/Navigation/__tests__/NavigationMenu.admin.test.js — test: MegaMenuPopover renders for superuser, all category headings present (Catalog, Store, Filtering, User, Tutorials, Marking, Orders), enabled links navigate, disabled links have opacity 0.5 and pointerEvents none, menu hidden for non-superuser, menu closes on link click, menu closes on outside click

### Implementation for User Story 1

- [ ] T005 [US1] Replace Admin `<Menu>` dropdown with `<MegaMenuPopover>` in frontend/react-Admin3/src/components/Navigation/NavigationMenu.js — remove lines ~667-722 (the existing `<Menu>` + 3 `<MenuItem>` for admin), add `<MegaMenuPopover id="admin-menu" label="Admin">` with `<Grid container>` children organized in two rows: Row 1 (Catalog, Store, Filtering [disabled], User), Row 2 (Tutorials [disabled], Marking [disabled], Orders [disabled]). Each category is a `<Grid item>` with a heading `<Typography>` and a list of `<MenuItem>` links using `react-router-dom` `useNavigate`. Disabled categories use `sx={{ opacity: 0.5, pointerEvents: 'none' }}`. Only render when `isSuperuser` is true.
- [ ] T006 [US1] Verify all US1 tests pass and MegaMenu renders correctly with enabled/disabled states

**Checkpoint**: Admin MegaMenu navigation fully functional. All enabled links should navigate to existing or future admin pages. Disabled items visible but non-interactive.

---

## Phase 4: User Story 2 — Catalog Admin: Exam Sessions & Subjects (Priority: P2)

**Goal**: Update existing Exam Sessions and Subjects admin pages to integrate with the new MegaMenu navigation and ensure they follow the consistent admin page pattern (FR-040/041).

**Independent Test**: Navigate from Admin MegaMenu to Exam Sessions and Subjects pages, verify list/create/edit/delete operations work, pages follow consistent pattern.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T007 [P] [US2] Review and update tests in frontend/react-Admin3/src/components/admin/exam-sessions/__tests__/ExamSessionList.test.js — ensure tests cover: superuser access check, redirect for non-superuser, list rendering with loading/error/empty states, create/edit/delete operations with confirmation
- [ ] T008 [P] [US2] Review and update tests in frontend/react-Admin3/src/components/admin/exam-sessions/__tests__/ExamSessionForm.test.js — ensure tests cover: create mode vs edit mode, form validation, submit success/error feedback
- [ ] T009 [P] [US2] Review and update tests in frontend/react-Admin3/src/components/admin/subjects/__tests__/SubjectList.test.js — ensure tests cover same patterns as T007
- [ ] T010 [P] [US2] Review and update tests in frontend/react-Admin3/src/components/admin/subjects/__tests__/SubjectForm.test.js — ensure tests cover same patterns as T008
- [ ] T011 [P] [US2] Review and update tests in frontend/react-Admin3/src/components/admin/subjects/__tests__/SubjectDetail.test.js — ensure tests cover detail view with edit/delete buttons

### Implementation for User Story 2

- [ ] T012 [P] [US2] Update frontend/react-Admin3/src/components/admin/exam-sessions/ExamSessionList.js — add isSuperuser check with redirect, ensure consistent pattern (heading, action buttons, data table, loading/error/empty states per FR-040)
- [ ] T013 [P] [US2] Update frontend/react-Admin3/src/components/admin/exam-sessions/ExamSessionForm.js — add isSuperuser check, ensure consistent form pattern (heading, fields, validation, submit/cancel, loading, error per FR-041)
- [ ] T014 [P] [US2] Update frontend/react-Admin3/src/components/admin/subjects/SubjectList.js — add isSuperuser check with redirect, ensure consistent pattern per FR-040
- [ ] T015 [P] [US2] Update frontend/react-Admin3/src/components/admin/subjects/SubjectForm.js — add isSuperuser check, ensure consistent form pattern per FR-041
- [ ] T016 [P] [US2] Update frontend/react-Admin3/src/components/admin/subjects/SubjectDetail.js — add isSuperuser check, ensure delete requires confirmation (FR-042)
- [ ] T017 [US2] Verify routes in frontend/react-Admin3/src/App.js for admin/exam-sessions and admin/subjects are correctly configured with list/new/:id/:id/edit patterns
- [ ] T018 [US2] Verify all US2 tests pass — run `npm test -- --testPathPattern=admin/(exam-sessions|subjects)`

**Checkpoint**: Existing Exam Sessions and Subjects admin pages fully integrated with MegaMenu, consistent patterns, and superuser protection.

---

## Phase 5: User Story 3 — Catalog Admin: ESS, Products, Variations & Bundles (Priority: P3)

**Goal**: Create new admin CRUD pages for Exam Session Subjects, Product Catalog (update existing), Product Variations + PPV mappings, and Product Bundles + Bundle Products.

**Independent Test**: Navigate from Admin MegaMenu to each new catalog page, verify CRUD operations, data relationships displayed correctly.

### Services for User Story 3

- [ ] T019 [P] [US3] Create frontend/react-Admin3/src/services/examSessionSubjectService.js — CRUD methods (getAll, getById, create, update, delete) using `${config.catalogUrl}/exam-session-subjects` per contracts/frontend-services.md
- [ ] T020 [P] [US3] Create frontend/react-Admin3/src/services/productVariationService.js — CRUD methods using `${config.catalogUrl}/product-variations`
- [ ] T021 [P] [US3] Create frontend/react-Admin3/src/services/productProductVariationService.js — CRUD methods using `${config.catalogUrl}/product-product-variations`
- [ ] T022 [P] [US3] Create frontend/react-Admin3/src/services/catalogBundleService.js — CRUD methods using `${config.catalogUrl}/product-bundles`
- [ ] T023 [P] [US3] Create frontend/react-Admin3/src/services/catalogBundleProductService.js — methods (getAll, getByBundleId, create, update, delete) using `${config.catalogUrl}/bundle-products`

### Exam Session Subjects

- [ ] T024 [P] [US3] Write tests in frontend/react-Admin3/src/components/admin/exam-session-subjects/__tests__/ExamSessionSubjectList.test.js — test: list rendering with exam_session.session_code and subject.code display, create/edit/delete operations, loading/error/empty states, superuser check
- [ ] T025 [P] [US3] Write tests in frontend/react-Admin3/src/components/admin/exam-session-subjects/__tests__/ExamSessionSubjectForm.test.js — test: create/edit modes, dropdown selects for exam session and subject, unique constraint validation, submit/cancel
- [ ] T026 [US3] Create frontend/react-Admin3/src/components/admin/exam-session-subjects/ExamSessionSubjectList.js — list page with table showing id, session_code, subject_code, is_active; CRUD buttons; isSuperuser check; FR-040 pattern
- [ ] T027 [US3] Create frontend/react-Admin3/src/components/admin/exam-session-subjects/ExamSessionSubjectForm.js — create/edit form with exam session dropdown, subject dropdown, is_active toggle; FR-041 pattern

### Product Catalog (update existing)

- [ ] T028 [P] [US3] Review and update tests in frontend/react-Admin3/src/components/admin/products/__tests__/ProductList.test.js — ensure consistent admin pattern, superuser check
- [ ] T029 [P] [US3] Review and update tests in frontend/react-Admin3/src/components/admin/products/__tests__/ProductForm.test.js — ensure consistent admin pattern
- [ ] T030 [P] [US3] Update frontend/react-Admin3/src/components/admin/products/ProductList.js — add isSuperuser check, ensure FR-040 pattern
- [ ] T031 [P] [US3] Update frontend/react-Admin3/src/components/admin/products/ProductForm.js — add isSuperuser check, ensure FR-041 pattern
- [ ] T032 [P] [US3] Update frontend/react-Admin3/src/components/admin/products/ProductDetail.js — add isSuperuser check, delete confirmation per FR-042

### Product Variations + PPV Mappings

- [ ] T033 [P] [US3] Write tests in frontend/react-Admin3/src/components/admin/product-variations/__tests__/ProductVariationList.test.js — test: list with variation_type, name, code columns; CRUD; loading/error/empty; superuser check
- [ ] T034 [P] [US3] Write tests in frontend/react-Admin3/src/components/admin/product-variations/__tests__/ProductVariationForm.test.js — test: create/edit modes, variation_type dropdown (eBook/Hub/Printed/Marking/Tutorial), name, code fields; submit/cancel
- [ ] T035 [US3] Create frontend/react-Admin3/src/components/admin/product-variations/ProductVariationList.js — list page showing ProductVariations with a section/tab to manage ProductProductVariation mappings; FR-040 pattern
- [ ] T036 [US3] Create frontend/react-Admin3/src/components/admin/product-variations/ProductVariationForm.js — create/edit form for ProductVariation; variation_type select, name, description, code; FR-041 pattern

### Product Bundles + Bundle Products

- [ ] T037 [P] [US3] Write tests in frontend/react-Admin3/src/components/admin/product-bundles/__tests__/ProductBundleList.test.js — test: list with bundle_name, subject_code, is_featured, is_active, components_count columns; CRUD; superuser check
- [ ] T038 [P] [US3] Write tests in frontend/react-Admin3/src/components/admin/product-bundles/__tests__/ProductBundleForm.test.js — test: create/edit modes, subject dropdown, bundle_name, description, is_featured, display_order fields; inline bundle product management; submit/cancel
- [ ] T039 [US3] Create frontend/react-Admin3/src/components/admin/product-bundles/ProductBundleList.js — list page showing catalog product bundles with components_count; FR-040 pattern
- [ ] T040 [US3] Create frontend/react-Admin3/src/components/admin/product-bundles/ProductBundleForm.js — create/edit form for ProductBundle with inline ProductBundleProduct management (add/remove PPV items, set default_price_type, quantity, sort_order); FR-041 pattern

### Routes for User Story 3

- [ ] T041 [US3] Add routes to frontend/react-Admin3/src/App.js for: admin/exam-session-subjects (list/new/:id/:id/edit), admin/catalog-products (list/new/:id/:id/edit), admin/product-variations (list/new/:id/:id/edit), admin/product-bundles (list/new/:id/:id/edit)
- [ ] T042 [US3] Verify all US3 tests pass — run `npm test -- --testPathPattern=admin/(exam-session-subjects|products|product-variations|product-bundles)`

**Checkpoint**: All catalog admin pages functional with CRUD operations. Exam Session Subjects, Product Variations, Product Bundles are new. Product Catalog is updated.

---

## Phase 6: User Story 4 — Store Admin: Products, Recommendations, Prices & Bundles (Priority: P4)

**Goal**: Create admin CRUD pages for Store Products, PPV Recommendations, Prices, and Store Bundles with Bundle Products.

**Independent Test**: Navigate from Admin MegaMenu to each store admin page, verify CRUD operations, foreign key relationships displayed with readable labels.

### Services for User Story 4

- [ ] T043 [P] [US4] Create frontend/react-Admin3/src/services/storeProductService.js — CRUD methods using `${config.apiBaseUrl}/api/store/products` per contracts/frontend-services.md
- [ ] T044 [P] [US4] Create frontend/react-Admin3/src/services/recommendationService.js — CRUD methods using `${config.catalogUrl}/recommendations`
- [ ] T045 [P] [US4] Create frontend/react-Admin3/src/services/priceService.js — methods (getAll, getById, getByProductId, create, update, delete) using `${config.apiBaseUrl}/api/store/prices`
- [ ] T046 [P] [US4] Create frontend/react-Admin3/src/services/storeBundleService.js — CRUD methods using `${config.apiBaseUrl}/api/store/bundles`
- [ ] T047 [P] [US4] Create frontend/react-Admin3/src/services/storeBundleProductService.js — methods (getAll, getByBundleId, create, update, delete) using `${config.apiBaseUrl}/api/store/bundle-products`

### Store Products

- [ ] T048 [P] [US4] Write tests in frontend/react-Admin3/src/components/admin/store-products/__tests__/StoreProductList.test.js — test: list with product_code, subject_code, session_code, variation_type, product_name, is_active columns; CRUD; superuser check
- [ ] T049 [P] [US4] Write tests in frontend/react-Admin3/src/components/admin/store-products/__tests__/StoreProductForm.test.js — test: create/edit modes, exam_session_subject and product_product_variation dropdowns, is_active toggle; product_code shown as read-only in edit mode
- [ ] T050 [US4] Create frontend/react-Admin3/src/components/admin/store-products/StoreProductList.js — list page with display columns from nested read-only fields; FR-040 pattern
- [ ] T051 [US4] Create frontend/react-Admin3/src/components/admin/store-products/StoreProductForm.js — create/edit form; FR-041 pattern

### Recommendations

- [ ] T052 [P] [US4] Write tests in frontend/react-Admin3/src/components/admin/recommendations/__tests__/RecommendationList.test.js — test: list showing source PPV label → recommended PPV label; CRUD; superuser check
- [ ] T053 [P] [US4] Write tests in frontend/react-Admin3/src/components/admin/recommendations/__tests__/RecommendationForm.test.js — test: create/edit modes, source PPV dropdown (OneToOne), recommended PPV dropdown, validation (no self-reference)
- [ ] T054 [US4] Create frontend/react-Admin3/src/components/admin/recommendations/RecommendationList.js — list page with source → recommended display; FR-040 pattern
- [ ] T055 [US4] Create frontend/react-Admin3/src/components/admin/recommendations/RecommendationForm.js — create/edit form with PPV selectors; FR-041 pattern

### Prices

- [ ] T056 [P] [US4] Write tests in frontend/react-Admin3/src/components/admin/prices/__tests__/PriceList.test.js — test: list with product_code, price_type, amount, currency columns; CRUD; superuser check
- [ ] T057 [P] [US4] Write tests in frontend/react-Admin3/src/components/admin/prices/__tests__/PriceForm.test.js — test: create/edit modes, product dropdown, price_type select (standard/retaker/reduced/additional), amount decimal input, currency; unique constraint validation
- [ ] T058 [US4] Create frontend/react-Admin3/src/components/admin/prices/PriceList.js — list page; FR-040 pattern
- [ ] T059 [US4] Create frontend/react-Admin3/src/components/admin/prices/PriceForm.js — create/edit form; FR-041 pattern

### Store Bundles + Bundle Products

- [ ] T060 [P] [US4] Write tests in frontend/react-Admin3/src/components/admin/store-bundles/__tests__/StoreBundleList.test.js — test: list with name, subject_code, exam_session_code, is_active, components_count columns; CRUD; superuser check
- [ ] T061 [P] [US4] Write tests in frontend/react-Admin3/src/components/admin/store-bundles/__tests__/StoreBundleForm.test.js — test: create/edit modes, bundle_template dropdown, exam_session_subject dropdown, override_name/description, inline StoreBundleProduct management
- [ ] T062 [US4] Create frontend/react-Admin3/src/components/admin/store-bundles/StoreBundleList.js — list page with computed name; FR-040 pattern
- [ ] T063 [US4] Create frontend/react-Admin3/src/components/admin/store-bundles/StoreBundleForm.js — create/edit form with inline bundle product management; FR-041 pattern

### Routes for User Story 4

- [ ] T064 [US4] Add routes to frontend/react-Admin3/src/App.js for: admin/store-products (list/new/:id/:id/edit), admin/recommendations (list/new/:id/:id/edit), admin/prices (list/new/:id/:id/edit), admin/store-bundles (list/new/:id/:id/edit)
- [ ] T065 [US4] Verify all US4 tests pass — run `npm test -- --testPathPattern=admin/(store-products|recommendations|prices|store-bundles)`

**Checkpoint**: All store admin pages functional with CRUD operations for products, recommendations, prices, and bundles.

---

## Phase 7: User Story 5 — User Admin: Profiles, Addresses, Contacts, Emails & Staff (Priority: P5)

**Goal**: Create admin pages for User Profiles (list + edit with nested sub-resources: addresses, contacts, emails) and Staff (full CRUD).

**Independent Test**: Navigate from Admin MegaMenu to User Profile and Staff pages, verify list/edit operations, profile sub-resources accessible from profile detail.

### Services for User Story 5

- [ ] T066 [P] [US5] Create frontend/react-Admin3/src/services/userProfileService.js — methods (getAll, getById, update, getAddresses, updateAddress, getContacts, updateContact, getEmails, updateEmail) using `${config.userUrl}/profiles` per contracts/frontend-services.md
- [ ] T067 [P] [US5] Create frontend/react-Admin3/src/services/staffService.js — CRUD methods using `${config.userUrl}/staff`

### User Profiles (with sub-resources)

- [ ] T068 [P] [US5] Write tests in frontend/react-Admin3/src/components/admin/user-profiles/__tests__/UserProfileList.test.js — test: list with user_email, user_first_name, user_last_name, title columns; search/filter; edit link (no create/delete); superuser check
- [ ] T069 [P] [US5] Write tests in frontend/react-Admin3/src/components/admin/user-profiles/__tests__/UserProfileForm.test.js — test: edit mode only (no create), fields: title, send_invoices_to, send_study_material_to, remarks; tabs/sections for addresses, contacts, emails sub-resources; submit/cancel
- [ ] T070 [US5] Create frontend/react-Admin3/src/components/admin/user-profiles/UserProfileList.js — list page (list + edit only, no create/delete); FR-040 pattern
- [ ] T071 [US5] Create frontend/react-Admin3/src/components/admin/user-profiles/UserProfileForm.js — edit form with tabs/sections for profile fields and inline sub-resource management (addresses, contacts, emails); FR-041 pattern

### Staff

- [ ] T072 [P] [US5] Write tests in frontend/react-Admin3/src/components/admin/staff/__tests__/StaffList.test.js — test: list with user_email, user_first_name, user_last_name columns; full CRUD; superuser check
- [ ] T073 [P] [US5] Write tests in frontend/react-Admin3/src/components/admin/staff/__tests__/StaffForm.test.js — test: create/edit modes, user selector (link to Django User); submit/cancel
- [ ] T074 [US5] Create frontend/react-Admin3/src/components/admin/staff/StaffList.js — list page with full CRUD; FR-040 pattern
- [ ] T075 [US5] Create frontend/react-Admin3/src/components/admin/staff/StaffForm.js — create/edit form; FR-041 pattern

### Routes for User Story 5

- [ ] T076 [US5] Add routes to frontend/react-Admin3/src/App.js for: admin/user-profiles (list/:id/edit), admin/staff (list/new/:id/:id/edit)
- [ ] T077 [US5] Verify all US5 tests pass — run `npm test -- --testPathPattern=admin/(user-profiles|staff)`

**Checkpoint**: User admin pages functional. Profiles with nested sub-resources, Staff with full CRUD.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all user stories

- [ ] T078 [P] Run full test suite — `cd frontend/react-Admin3 && npm test -- --coverage --watchAll=false` — verify minimum 80% coverage on new code (SC-008)
- [ ] T079 [P] Verify all admin pages follow consistent pattern (FR-040/FR-041) — spot check heading, action buttons, data table, loading/error/empty states across all pages
- [ ] T080 Verify all destructive operations require confirmation (FR-042) — check delete buttons on all entity list/detail pages
- [ ] T081 Verify non-superuser redirect works on all admin routes (FR-044) — test direct URL access without superuser
- [ ] T082 Verify Admin MegaMenu links match all implemented routes — cross-reference NavigationMenu.js links with App.js routes
- [ ] T083 Run quickstart.md validation — follow the quickstart guide end-to-end to verify all steps work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — read-only verification
- **Foundational (Phase 2)**: N/A — existing infrastructure sufficient
- **US1 (Phase 3)**: Can start immediately — MegaMenu navigation
- **US2 (Phase 4)**: Depends on US1 (menu links must navigate to existing pages)
- **US3 (Phase 5)**: Depends on US1 (menu links). Independent of US2.
- **US4 (Phase 6)**: Depends on US1 (menu links). Independent of US2/US3.
- **US5 (Phase 7)**: Depends on US1 (menu links). Independent of US2/US3/US4.
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Phase 1: Setup (verification)
    ↓
Phase 3: US1 — MegaMenu Navigation (MVP)
    ↓ (menu links exist)
    ├── Phase 4: US2 — Update Exam Sessions & Subjects
    ├── Phase 5: US3 — New Catalog Pages (ESS, Variations, Bundles)
    ├── Phase 6: US4 — Store Pages (Products, Recommendations, Prices, Bundles)
    └── Phase 7: US5 — User Pages (Profiles, Staff)
    ↓ (all stories complete)
Phase 8: Polish & Cross-Cutting
```

### Within Each User Story

1. Services created first (parallel, different files)
2. Tests written and verified to FAIL (parallel, different files)
3. List components implemented (depends on service)
4. Form components implemented (depends on service)
5. Routes added to App.js
6. Story verification test run

### Parallel Opportunities

**US3-US5 are fully parallelizable** after US1 completes:
- US2, US3, US4, US5 can all proceed in parallel (different directories, different services)
- Within each story: all services [P], all tests [P], list/form components for different entities [P]

---

## Parallel Example: User Story 3

```bash
# Launch all services in parallel (different files):
T019: examSessionSubjectService.js
T020: productVariationService.js
T021: productProductVariationService.js
T022: catalogBundleService.js
T023: catalogBundleProductService.js

# Launch all tests in parallel (different files):
T024 + T025: ExamSessionSubject tests
T033 + T034: ProductVariation tests
T037 + T038: ProductBundle tests
T028 + T029: Product tests (update)

# Launch list components in parallel (different directories):
T026: ExamSessionSubjectList.js
T035: ProductVariationList.js
T039: ProductBundleList.js
T030: ProductList.js (update)
```

## Parallel Example: User Stories 3, 4, 5 Concurrent

```bash
# After US1 completes, three developers can work simultaneously:
Developer A (US3): T019-T042 — Catalog pages
Developer B (US4): T043-T065 — Store pages
Developer C (US5): T066-T077 — User pages
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup verification
2. Complete Phase 3: US1 — Admin MegaMenu Navigation
3. **STOP and VALIDATE**: Test MegaMenu independently
4. Deploy/demo — admin navigation is functional

### Incremental Delivery

1. US1 → MegaMenu navigation (MVP)
2. US2 → Update existing Exam Sessions & Subjects pages
3. US3 → New catalog admin pages (ESS, Variations, Bundles)
4. US4 → Store admin pages (Products, Recommendations, Prices, Bundles)
5. US5 → User admin pages (Profiles, Staff)
6. Polish → Cross-cutting validation

Each story adds admin capability without breaking previous stories.

### Backend Dependency Note

US3, US4, and US5 require backend API endpoints that may not exist yet (see plan.md Backend Dependencies table). Frontend services should be built targeting the expected endpoints. If backend is not ready, services can be temporarily stubbed for UI development and testing with mock data.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable after US1
- Verify tests fail before implementing (TDD: RED → GREEN)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All admin components follow existing exam-sessions/subjects/products pattern (D1)
- All services compose URLs from existing config entries (D3/R4)
- All pages check isSuperuser and redirect if false (D4/R5)
