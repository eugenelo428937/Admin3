# Tasks: Filtering System Remediation

**Input**: Design documents from `/specs/20260129-filter-system-fix/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md
**Branch**: `20260129-filter-system-fix`
**TDD**: All implementation tasks follow RED → GREEN → REFACTOR per constitution

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Tests are written FIRST and must FAIL before implementation begins

---

## Phase 1: Setup

**Purpose**: Branch creation and environment verification

- [ ] T001 Create feature branch `20260129-filter-system-fix` from main
- [ ] T002 Verify backend test infrastructure runs: `cd backend/django_Admin3 && python manage.py test filtering.tests search.tests --keepdb`
- [ ] T003 [P] Verify frontend test infrastructure runs: `cd frontend/react-Admin3 && npm test -- --watchAll=false`

---

## Phase 2: Foundational (Shared Test Infrastructure)

**Purpose**: Create reusable test factories and fixtures that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create backend test factory for FilterConfiguration + FilterConfigurationGroup + FilterGroup hierarchy in `backend/django_Admin3/filtering/tests/factories.py` — include helper methods: `create_filter_config(name, filter_key, filter_type)`, `create_filter_group(name, parent=None, code=None)`, `assign_group_to_config(config, group)`
- [ ] T005 [P] Create backend test factory for store.Product + store.Bundle + BundleProduct in `backend/django_Admin3/search/tests/factories.py` — include helper methods: `create_store_product(subject, product, variation)`, `create_bundle_with_products(subject, products)`
- [ ] T006 [P] Verify existing FilterGroup.get_descendants() works correctly by writing a smoke test in `backend/django_Admin3/filtering/tests/test_filter_group_hierarchy.py`

**Checkpoint**: Test factories ready — user story implementation can begin

---

## Phase 3: User Story 1 — Correct Filter Partitioning (Priority: P1) MVP

**Goal**: Categories and product_types display distinct, non-overlapping filter groups based on FilterConfigurationGroup assignments

**Independent Test**: Call unified search API and verify `filter_counts.categories` and `filter_counts.product_types` contain non-overlapping group sets matching their FilterConfigurationGroup records

### Tests (RED phase) — US1

> Write these tests FIRST. Ensure they FAIL before implementation.

- [ ] T007 [P] [US1] Backend test: categories and product_types return distinct groups partitioned by FilterConfigurationGroup — `backend/django_Admin3/filtering/tests/test_filter_partitioning.py::TestFilterPartitioning::test_categories_and_product_types_are_distinct`
- [ ] T008 [P] [US1] Backend test: unassigned groups do not appear in any filter section — `backend/django_Admin3/filtering/tests/test_filter_partitioning.py::TestFilterPartitioning::test_unassigned_groups_excluded`
- [ ] T009 [P] [US1] Backend test: group assigned to multiple configs appears in both sections — `backend/django_Admin3/filtering/tests/test_filter_partitioning.py::TestFilterPartitioning::test_dual_assignment_respected`
- [ ] T010 [P] [US1] Backend test: filter-configuration API returns filter_groups array per config — `backend/django_Admin3/filtering/tests/test_filter_configuration_api.py::TestFilterConfigurationAPI::test_response_includes_filter_groups`
- [ ] T011 [P] [US1] Pact consumer test: update filter-configuration interaction to expect filter_groups in response — `frontend/react-Admin3/src/pact/consumers/products.pact.test.js`

### Implementation (GREEN phase) — US1

- [ ] T012 [US1] Modify `_generate_filter_counts()` in `backend/django_Admin3/search/services/search_service.py` to query FilterConfigurationGroup for category group IDs and product_type group IDs separately (replaces current identical group query)
- [ ] T013 [US1] Modify `_apply_filters()` in `backend/django_Admin3/search/services/search_service.py` to resolve incoming category/product_type filter values through FilterConfiguration assignments (match by group name/code within assigned groups only)
- [ ] T014 [US1] Add `FilterConfigurationGroupSerializer` in `backend/django_Admin3/filtering/serializers.py` to serialize filter_groups with fields: id, name, code, display_order, is_default, parent_id
- [ ] T015 [US1] Update filter-configuration endpoint in `backend/django_Admin3/filtering/views.py` to include filter_groups array in each configuration entry (using the new serializer)
- [ ] T016 [US1] Update Pact provider state handler in `backend/django_Admin3/pact_tests/state_handlers.py` to seed FilterConfigurationGroup data for the updated filter-configuration contract

**Checkpoint**: Filter partitioning works — categories and product_types show distinct groups. Run: `python manage.py test filtering.tests.test_filter_partitioning filtering.tests.test_filter_configuration_api`

---

## Phase 4: User Story 2 — Accurate Filter Counts via Disjunctive Faceting (Priority: P1) MVP

**Goal**: Each filter dimension's counts reflect the queryset with all OTHER active filters applied, excluding that dimension's own filter

**Independent Test**: Apply subject filter "CM2", verify category counts reflect only CM2 products (not entire catalog)

### Tests (RED phase) — US2

> Write these tests FIRST. Ensure they FAIL before implementation.

- [ ] T017 [P] [US2] Backend test: with no filters active, counts reflect total catalog — `backend/django_Admin3/search/tests/test_disjunctive_faceting.py::TestDisjunctiveFaceting::test_no_filters_counts_total_catalog`
- [ ] T018 [P] [US2] Backend test: with subject filter active, category counts reflect only matching subjects — `backend/django_Admin3/search/tests/test_disjunctive_faceting.py::TestDisjunctiveFaceting::test_subject_filter_affects_category_counts`
- [ ] T019 [P] [US2] Backend test: with subject + category active, product_type counts reflect both filters — `backend/django_Admin3/search/tests/test_disjunctive_faceting.py::TestDisjunctiveFaceting::test_multi_filter_disjunctive_counts`
- [ ] T020 [P] [US2] Backend test: subject dimension counts exclude subject filter (self-exclusion) — `backend/django_Admin3/search/tests/test_disjunctive_faceting.py::TestDisjunctiveFaceting::test_dimension_excludes_own_filter`
- [ ] T021 [P] [US2] Backend test: zero-count entries ARE included in API response — `backend/django_Admin3/search/tests/test_disjunctive_faceting.py::TestDisjunctiveFaceting::test_zero_count_entries_included`
- [ ] T022 [P] [US2] Frontend test: FilterPanel hides options with zero count — `frontend/react-Admin3/src/components/__tests__/FilterPanel.zerocount.test.js`
- [ ] T023 [P] [US2] Pact consumer test: update unified search interaction to expect disjunctive filter_counts structure — `frontend/react-Admin3/src/pact/consumers/search.pact.test.js`

### Implementation (GREEN phase) — US2

- [ ] T024 [US2] Rewrite `_generate_filter_counts()` in `backend/django_Admin3/search/services/search_service.py` — for each filter dimension, build a queryset with all OTHER filters applied, then annotate counts for that dimension's values
- [ ] T025 [US2] Modify search endpoint caller to pass active filters into `_generate_filter_counts()` (currently the method ignores active filters)
- [ ] T026 [US2] Update FilterPanel.js in `frontend/react-Admin3/src/components/Product/FilterPanel.js` to filter out zero-count options before rendering (FR-013)
- [ ] T027 [US2] Update Pact provider state handler in `backend/django_Admin3/pact_tests/state_handlers.py` to seed data producing verifiable disjunctive count states

**Checkpoint**: Disjunctive counts work — selecting filters updates other dimensions' counts. Zero-count options hidden in UI. Run: `python manage.py test search.tests.test_disjunctive_faceting` and `cd frontend/react-Admin3 && npm test -- --testPathPattern=FilterPanel.zerocount`

---

## Phase 5: User Story 3 — Hierarchical Filter Resolution (Priority: P2)

**Goal**: Selecting a parent group includes products from all descendant groups at every depth level

**Independent Test**: Select parent group "Material", verify results include products from child groups "Core Study Materials" and "Revision Materials"

### Tests (RED phase) — US3

> Write these tests FIRST. Ensure they FAIL before implementation.

- [ ] T028 [P] [US3] Backend test: selecting parent group includes child group products — `backend/django_Admin3/filtering/tests/test_hierarchy_resolution.py::TestHierarchyResolution::test_parent_includes_children`
- [ ] T029 [P] [US3] Backend test: multi-level hierarchy resolves all descendants — `backend/django_Admin3/filtering/tests/test_hierarchy_resolution.py::TestHierarchyResolution::test_grandparent_includes_all_descendants`
- [ ] T030 [P] [US3] Backend test: leaf group returns only direct products — `backend/django_Admin3/filtering/tests/test_hierarchy_resolution.py::TestHierarchyResolution::test_leaf_returns_direct_only`
- [ ] T031 [P] [US3] Backend test: group with direct products AND children returns both — `backend/django_Admin3/filtering/tests/test_hierarchy_resolution.py::TestHierarchyResolution::test_parent_with_direct_products`
- [ ] T032 [P] [US3] Backend test: hierarchy-aware counts reflect descendant products — `backend/django_Admin3/filtering/tests/test_hierarchy_resolution.py::TestHierarchyResolution::test_hierarchy_aware_counts`

### Implementation (GREEN phase) — US3

- [ ] T033 [US3] Modify `_apply_filters()` in `backend/django_Admin3/search/services/search_service.py` to resolve category/product_type selections using `FilterGroup.get_descendants(include_self=True)` before building Q-objects (replace `groups__name__iexact` with `groups__id__in`)
- [ ] T034 [US3] Update `_generate_filter_counts()` in `backend/django_Admin3/search/services/search_service.py` to account for hierarchy when computing counts (descendant products roll up to parent count)
- [ ] T035 [US3] Verify `FilterGroupStrategy` in `backend/django_Admin3/filtering/services/filter_service.py` uses `_get_all_descendant_ids()` consistently with the search service implementation

**Checkpoint**: Hierarchy resolution works — parent selections include all descendant products. Run: `python manage.py test filtering.tests.test_hierarchy_resolution`

---

## Phase 6: User Story 4 — Bundle Filtering Across All Dimensions (Priority: P2)

**Goal**: Bundles are filtered by ALL active dimensions (not just subject), using single-product matching semantics

**Independent Test**: Apply category filter "Core Study Materials", verify only bundles containing at least one Core Study Materials product appear in results

### Tests (RED phase) — US4

> Write these tests FIRST. Ensure they FAIL before implementation.

- [ ] T036 [P] [US4] Backend test: bundles filtered by category (not just subject) — `backend/django_Admin3/search/tests/test_bundle_filtering.py::TestBundleFiltering::test_category_filter_applied_to_bundles`
- [ ] T037 [P] [US4] Backend test: bundles filtered by mode of delivery — `backend/django_Admin3/search/tests/test_bundle_filtering.py::TestBundleFiltering::test_mode_of_delivery_filter_applied`
- [ ] T038 [P] [US4] Backend test: single-product matching semantics (one product must match ALL dimensions) — `backend/django_Admin3/search/tests/test_bundle_filtering.py::TestBundleFiltering::test_single_product_matches_all_dimensions`
- [ ] T039 [P] [US4] Backend test: no filters returns all active bundles — `backend/django_Admin3/search/tests/test_bundle_filtering.py::TestBundleFiltering::test_no_filters_returns_all_bundles`
- [ ] T040 [P] [US4] Backend test: bundle count in filter_counts reflects filtered state — `backend/django_Admin3/search/tests/test_bundle_filtering.py::TestBundleFiltering::test_bundle_count_reflects_filters`

### Implementation (GREEN phase) — US4

- [ ] T041 [US4] Expand `_get_bundles()` in `backend/django_Admin3/search/services/search_service.py` to build filter Q-objects for all active dimensions (category, product_type, mode_of_delivery, product) using the same logic as `_apply_filters()`
- [ ] T042 [US4] Implement single-product matching: filter `BundleProduct.objects.filter(product__<all_conditions>)` to find bundles where at least one component product satisfies ALL active filters simultaneously
- [ ] T043 [US4] Update bundle count in `_generate_filter_counts()` to reflect the filtered bundle count (not total active bundles)
- [ ] T044 [US4] Update Pact provider state handler in `backend/django_Admin3/pact_tests/state_handlers.py` to seed bundle data with component products for verifying filtered bundle behavior

**Checkpoint**: Bundle filtering works across all dimensions with single-product matching. Run: `python manage.py test search.tests.test_bundle_filtering`

---

## Phase 7: User Story 5 — Dynamic Frontend Filter Configuration (Priority: P3)

**Goal**: Frontend filter panel populated dynamically from backend FilterConfiguration endpoint, removing hardcoded filter registrations

**Independent Test**: Modify a FilterConfiguration record (disable a filter or change label), reload frontend, verify the change is reflected

### Tests (RED phase) — US5

> Write these tests FIRST. Ensure they FAIL before implementation.

- [ ] T045 [P] [US5] Frontend test: FilterRegistry.registerFromBackend() populates registry from config array — `frontend/react-Admin3/src/store/filters/__tests__/filterRegistry.test.js`
- [ ] T046 [P] [US5] Frontend test: FilterPanel renders sections from backend config (label, order, UI component) — `frontend/react-Admin3/src/components/__tests__/FilterPanel.dynamic.test.js`
- [ ] T047 [P] [US5] Frontend test: FilterPanel shows "Filters unavailable" on API failure — `frontend/react-Admin3/src/components/__tests__/FilterPanel.fallback.test.js`
- [ ] T048 [P] [US5] Frontend test: Redux state keys preserved (subjects, categories, product_types, products, modes_of_delivery unchanged) — `frontend/react-Admin3/src/store/filters/__tests__/filterRegistry.test.js`
- [ ] T049 [P] [US5] Backend test: filter-configuration API returns full configuration with all UI fields — `backend/django_Admin3/filtering/tests/test_filter_configuration_api.py::TestFilterConfigurationAPI::test_full_config_response`
- [ ] T050 [P] [US5] Pact consumer test: add/update filter-configuration interaction for full dynamic config response — `frontend/react-Admin3/src/pact/consumers/products.pact.test.js`

### Implementation (GREEN phase) — US5

- [ ] T051 [US5] Add `registerFromBackend(configurations)` method to FilterRegistry in `frontend/react-Admin3/src/store/filters/filterRegistry.js` — clears existing registrations and re-registers from backend config array while preserving Redux state key mappings (FR-007)
- [ ] T052 [US5] Add/update RTK Query endpoint `getFilterConfiguration` in `frontend/react-Admin3/src/store/api/catalogApi.js` to fetch from `/api/products/filter-configuration/`
- [ ] T053 [US5] Add `filterConfiguration`, `filterConfigurationError`, `filterConfigurationLoading` fields to initial state in `frontend/react-Admin3/src/store/slices/baseFilters.slice.js`
- [ ] T054 [US5] Update FilterPanel.js in `frontend/react-Admin3/src/components/Product/FilterPanel.js` to fetch filter configuration on mount, call `registerFromBackend()`, and render filter sections dynamically from registry
- [ ] T055 [US5] Add "Filters unavailable" fallback UI state in FilterPanel.js for when configuration endpoint fails or returns empty (FR-012)
- [ ] T056 [US5] Update ActiveFilters.js in `frontend/react-Admin3/src/components/Product/ActiveFilters.js` to use FilterRegistry for dynamic removal action labels and filter key resolution
- [ ] T057 [US5] Add deprecation warnings to ProductGroupFilter model in `backend/django_Admin3/filtering/models/product_group_filter.py` (FR-009)
- [ ] T058 [US5] Update Pact provider state handler in `backend/django_Admin3/pact_tests/state_handlers.py` for updated filter-configuration contract with full UI config fields

**Checkpoint**: Frontend filter panel driven by backend config. Run: `cd frontend/react-Admin3 && npm test -- --testPathPattern="filterRegistry|FilterPanel"` and `python manage.py test filtering.tests.test_filter_configuration_api`

---

## Phase 8: User Story 6 — Format Filtering via Modes of Delivery (Priority: P3)

**Goal**: Remove format-level groups (eBook, Printed, Hub) from category/product_type FilterConfigurationGroup assignments; modes_of_delivery uses variation_type exclusively

**Independent Test**: Filter by mode_of_delivery "eBook", verify only eBook variations appear and no format groups appear in category/product_type options

### Tests (RED phase) — US6

> Write these tests FIRST. Ensure they FAIL before implementation.

- [ ] T059 [P] [US6] Backend test: data migration removes eBook/Printed/Hub from category and product_type configs — `backend/django_Admin3/filtering/tests/test_format_cleanup.py::TestFormatCleanup::test_migration_removes_format_groups`
- [ ] T060 [P] [US6] Backend test: modes_of_delivery counts use variation_type not filter groups — `backend/django_Admin3/filtering/tests/test_format_cleanup.py::TestFormatCleanup::test_modes_uses_variation_type`
- [ ] T061 [P] [US6] Backend test: format groups do not appear in category or product_type filter options after migration — `backend/django_Admin3/filtering/tests/test_format_cleanup.py::TestFormatCleanup::test_no_format_groups_in_category_options`

### Implementation (GREEN phase) — US6

- [ ] T062 [US6] Create data migration in `backend/django_Admin3/filtering/migrations/` to delete FilterConfigurationGroup records where filter_configuration.filter_key IN ('categories', 'product_types') AND filter_group.name IN ('eBook', 'Printed', 'Hub') — include reverse migration to re-create deleted records
- [ ] T063 [US6] Verify modes_of_delivery filtering in `backend/django_Admin3/search/services/search_service.py` uses `product_variation__variation_type` (expected to already be correct — validation only)

**Checkpoint**: Format groups removed from category/product_type configs. Run: `python manage.py test filtering.tests.test_format_cleanup`

---

## Phase 9: Pact Verification & Full Integration

**Purpose**: End-to-end contract verification and full test suite validation

- [ ] T064 Run full Pact consumer test suite: `cd frontend/react-Admin3 && npm run test:pact:consumer`
- [ ] T065 Run full Pact provider verification: `cd backend/django_Admin3 && python manage.py test pact_tests --settings=django_Admin3.settings.development --keepdb`
- [ ] T066 Run complete backend test suite: `cd backend/django_Admin3 && python manage.py test`
- [ ] T067 Run complete frontend test suite: `cd frontend/react-Admin3 && npm test -- --watchAll=false`
- [ ] T068 Cross-story integration validation: apply filters across all dimensions simultaneously and verify correct products, bundles, counts, and partitioning
- [ ] T069 Run quickstart.md validation: verify all development environment commands work as documented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — first priority, modifies shared count generation
- **US2 (Phase 4)**: Depends on US1 (both modify `_generate_filter_counts()`) — second P1 story
- **US3 (Phase 5)**: Depends on US2 (hierarchy affects count queries) — can start after US2
- **US4 (Phase 6)**: Depends on US1 (needs correct partitioning) — can run in parallel with US3
- **US5 (Phase 7)**: Independent of US2/US3/US4 on frontend — backend tests depend on US1 serializer
- **US6 (Phase 8)**: Independent — can run in parallel with US3/US4/US5
- **Pact & Integration (Phase 9)**: Depends on ALL user stories complete

### Critical Path

```
Setup → Foundational → US1 → US2 → US3 ──→ Integration
                                    ↗       ↗
                         US1 → US4 ─┘      /
                         US1 → US5 ────────┘
                    Foundational → US6 ────┘
```

### Within Each User Story

1. Tests (RED) MUST be written and FAIL before implementation begins
2. Implementation (GREEN) makes tests pass with minimal code
3. REFACTOR while keeping tests green
4. Pact consumer test updates (where applicable) run with story tests
5. Pact provider state handlers updated alongside backend implementation

### Parallel Opportunities

- **Phase 2**: T004, T005, T006 can all run in parallel (different files)
- **US1 RED**: T007–T011 can all run in parallel (different test files)
- **US2 RED**: T017–T023 can all run in parallel (different test files)
- **US3 RED**: T028–T032 can all run in parallel (same file but independent tests)
- **US4 RED**: T036–T040 can all run in parallel (same file but independent tests)
- **US5 RED**: T045–T050 can all run in parallel (different test files across frontend/backend)
- **US6 RED**: T059–T061 can all run in parallel (same file but independent tests)
- **US3 + US4**: Can run in parallel after US2 (US4 depends on US1, not US2)
- **US5 frontend + US6**: Can run in parallel with US3/US4

---

## Task Summary

| Phase | Story | Task Count | Parallel Tasks |
|-------|-------|------------|----------------|
| Setup | — | 3 | 1 |
| Foundational | — | 3 | 2 |
| US1 - Partitioning | P1 | 10 | 5 (tests) |
| US2 - Disjunctive Counts | P1 | 11 | 7 (tests) |
| US3 - Hierarchy | P2 | 8 | 5 (tests) |
| US4 - Bundles | P2 | 9 | 5 (tests) |
| US5 - Dynamic Config | P3 | 14 | 6 (tests) |
| US6 - Format Cleanup | P3 | 5 | 3 (tests) |
| Integration | — | 6 | — |
| **Total** | | **69** | |

### MVP Scope (P1 Only)

Phases 1–4 (US1 + US2): **27 tasks** — delivers correct filter partitioning and accurate disjunctive counts

### Pact Tasks Per Story

| Story | Consumer Test | Provider State | File |
|-------|--------------|----------------|------|
| US1 | T011 | T016 | products.pact.test.js, state_handlers.py |
| US2 | T023 | T027 | search.pact.test.js, state_handlers.py |
| US4 | — | T044 | state_handlers.py |
| US5 | T050 | T058 | products.pact.test.js, state_handlers.py |
| Integration | T064, T065 | — | Full suite verification |
