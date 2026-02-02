# Tasks: Fuzzy Search Accuracy & Search Service Refactoring

**Input**: Design documents from `/specs/20260202-fuzzy-search-refactor/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/search-api.md, quickstart.md

**Tests**: Included per project constitution (TDD enforcement: RED/GREEN/REFACTOR cycle mandatory).

**Organization**: Tasks grouped by user story. US1 is independent (MVP). US2 and US3 are sequential (US3 depends on US2's ProductFilterService methods).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/django_Admin3/` (Django project root)
- **Search app**: `backend/django_Admin3/search/`
- **Filtering app**: `backend/django_Admin3/filtering/`
- **Store app**: `backend/django_Admin3/store/` (read-only reference)

---

## Phase 1: Setup

**Purpose**: Verify existing test baseline before any modifications

- [x] T001 Run baseline test suite to confirm 405 tests pass (256 search + 149 filtering): `python manage.py test search filtering -v2` from `backend/django_Admin3/`

**Checkpoint**: Baseline confirmed. All 405 existing tests pass.

---

## Phase 2: User Story 1 - Accurate Search Result Ranking (Priority: P1) MVP

**Goal**: Products whose names closely match the search query rank higher than products matching only on subject code. Replace `max(scores)` with weighted composite formula (R1) and lower threshold from 60 to 45 (R2).

**Independent Test**: `python manage.py test search.tests.test_fuzzy_scoring -v2`

**Spec References**: FR-001, FR-002, FR-003, FR-004, FR-009 | SC-001, SC-002

### Tests for User Story 1 (RED phase)

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T002 [US1] RED: Create weighted scoring test file at `backend/django_Admin3/search/tests/test_fuzzy_scoring.py` with tests covering:
  - Composite score uses weights: 0.15 subject_bonus + 0.40 token_sort + 0.25 partial_name + 0.20 token_set (R1)
  - For query "CS2 addition mock": mock exam product scores higher than course notes product (SC-001)
  - For query "CM2 study text": study text product is top result (spec scenario 2)
  - Subject-code-only bonus does not dominate ranking when content relevance differs (FR-001)
  - Score range remains 0-100 (FR-004)
  - Irrelevant products fall below threshold of 45 (FR-003, R2)
  - Query with no subject code prefix: ranks purely on content relevance (edge case)
  - Query with only subject code (e.g., "CS2"): returns all products for that subject (edge case)
- [x] T003 [US1] RED: Run tests to verify they fail against current `max()` implementation: `python manage.py test search.tests.test_fuzzy_scoring -v2`

### Implementation for User Story 1 (GREEN phase)

- [x] T004 [US1] GREEN: Replace `max(scores)` with weighted composite formula in `_calculate_fuzzy_score` at `backend/django_Admin3/search/services/search_service.py` lines 224-246. New formula: `score = 0.15 * subject_bonus + 0.40 * token_sort_ratio + 0.25 * partial_ratio_name + 0.20 * token_set_ratio` (R1)
- [x] T005 [US1] GREEN: Lower `self.min_fuzzy_score` from 60 to 45 at `backend/django_Admin3/search/services/search_service.py` lines 37-39 (R2)
- [x] T006 [US1] GREEN: Verify all scoring tests pass: `python manage.py test search.tests.test_fuzzy_scoring -v2`

**Checkpoint**: Weighted scoring works. Mock products rank above course notes for "CS2 addition mock". US1 is independently functional and testable.

---

## Phase 3: User Story 2 - Consistent Filter Behavior Between Search and Browse (Priority: P2)

**Goal**: Filter application and filter count generation use a single code path via `ProductFilterService`, eliminating duplicated filter logic in `SearchService`. New methods handle `store.Product`-specific field paths (R3) and disjunctive faceting (R4).

**Independent Test**: `python manage.py test filtering.tests.test_filter_counts search.tests.test_search_delegates_to_filter_service -v2`

**Spec References**: FR-005, FR-006, FR-010 | SC-003, SC-004

**Depends On**: None (independent of US1)

### Tests for User Story 2 (RED phase)

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T007 [P] [US2] RED: Create filter count generation test file at `backend/django_Admin3/filtering/tests/test_filter_counts.py` with tests covering:
  - `generate_filter_counts()` returns dict with 5 dimensions: subjects, categories, product_types, products, modes_of_delivery (contract)
  - Each dimension entry has `{count: int, name: str}` structure (data-model.md)
  - Empty filters returns counts for all active products
  - Disjunctive faceting: subject filter does not affect subject counts (FR-006)
  - Empty result set returns zero counts for all dimensions (edge case)
- [x] T008 [P] [US2] RED: Create filter delegation test file at `backend/django_Admin3/search/tests/test_search_delegates_to_filter_service.py` with tests covering:
  - `SearchService._apply_filters` delegates to `ProductFilterService.apply_store_product_filters()` (R6)
  - `SearchService._generate_filter_counts` delegates to `ProductFilterService.generate_filter_counts()` (R4)
  - Deprecated wrappers emit deprecation warnings (R6)
  - Identical filters applied through search and browse produce identical product sets (SC-003)
- [x] T009 [US2] RED: Verify both test files fail: `python manage.py test filtering.tests.test_filter_counts search.tests.test_search_delegates_to_filter_service -v2`

### Implementation for User Story 2 (GREEN phase)

#### ProductFilterService new methods (filtering app)

- [x] T010 [US2] GREEN: Add `_resolve_group_ids_with_hierarchy` static method to `ProductFilterService` in `backend/django_Admin3/filtering/services/filter_service.py`. Resolves filter group names/codes to IDs including all descendant groups via `FilterGroup.get_descendants()`. Port logic from `SearchService._resolve_group_ids_with_hierarchy` at search_service.py:664-693 (R3)
- [x] T011 [US2] GREEN: Add `apply_store_product_filters` method to `ProductFilterService` in `backend/django_Admin3/filtering/services/filter_service.py`. Applies filters to `store.Product` queryset using field paths: `exam_session_subject__subject__id__in` (subjects), `product_product_variation__product__groups__id__in` (categories, product_types), `product_product_variation__product_variation__name__in` (modes_of_delivery). Returns distinct queryset (R3, contract)
- [x] T012 [US2] GREEN: Add `_apply_filters_excluding` method to `ProductFilterService` in `backend/django_Admin3/filtering/services/filter_service.py`. Applies all filters EXCEPT one specified dimension, for disjunctive faceting. Uses `apply_store_product_filters` internally (R4)
- [x] T013 [US2] GREEN: Add `generate_filter_counts` method to `ProductFilterService` in `backend/django_Admin3/filtering/services/filter_service.py`. Computes per-dimension counts using `_apply_filters_excluding` for disjunctive faceting. Queries `FilterConfigurationGroup` and `FilterGroup` models. Returns dict matching contract shape (R4, contract)
- [x] T014 [US2] GREEN: Verify filter count tests pass: `python manage.py test filtering.tests.test_filter_counts -v2`

#### SearchService delegation (search app)

- [x] T015 [US2] GREEN: Update `SearchService.__init__` to instantiate `ProductFilterService` in `backend/django_Admin3/search/services/search_service.py`. Add `from filtering.services.filter_service import ProductFilterService` import and `self.filter_service = ProductFilterService()`
- [x] T016 [US2] GREEN: Delegate `SearchService._apply_filters` to `self.filter_service.apply_store_product_filters()` in `backend/django_Admin3/search/services/search_service.py` lines 248-322. Keep method as deprecated wrapper with deprecation warning (R6)
- [x] T017 [US2] GREEN: Delegate `SearchService._generate_filter_counts` to `self.filter_service.generate_filter_counts()` in `backend/django_Admin3/search/services/search_service.py` lines 486-638. Keep method as deprecated wrapper with deprecation warning (R6)
- [x] T018 [US2] GREEN: Verify delegation tests pass: `python manage.py test search.tests.test_search_delegates_to_filter_service -v2`

**Checkpoint**: Search and browse use same filter code path. Filter counts are consistent. US2 is independently functional and testable.

---

## Phase 4: User Story 3 - Navigation Menu Filter Consistency (Priority: P3)

**Goal**: Navbar filter parameters (group, tutorial_format, product, distance_learning) are translated to standard filter dict format and processed through `ProductFilterService`, eliminating the separate navbar filter code path (R5).

**Independent Test**: `python manage.py test search.tests.test_navbar_filter_translation -v2`

**Spec References**: FR-007 | SC-005

**Depends On**: US2 (requires `apply_store_product_filters` on ProductFilterService)

### Tests for User Story 3 (RED phase)

> **Write these tests FIRST, ensure they FAIL before implementation**

- [x] T019 [US3] RED: Create navbar translation test file at `backend/django_Admin3/search/tests/test_navbar_filter_translation.py` with tests covering:
  - `group` param translates to `categories` list (R5 mapping)
  - `tutorial_format` param appends to `categories` list (R5 mapping)
  - `product` param translates to `product_ids` list (R5 mapping)
  - `distance_learning` param maps to 'Material' in `categories` (R5 mapping)
  - Multiple navbar params combine correctly
  - Empty navbar_filters returns empty filter dict
  - Missing/nonexistent group handled gracefully (edge case)
  - Navbar filter results match equivalent filter panel selection (SC-005)
- [x] T020 [US3] RED: Verify tests fail: `python manage.py test search.tests.test_navbar_filter_translation -v2`

### Implementation for User Story 3 (GREEN phase)

- [x] T021 [US3] GREEN: Implement `_translate_navbar_filters` method on `SearchService` in `backend/django_Admin3/search/services/search_service.py`. Translation mapping per R5: `group` → `categories[]`, `tutorial_format` → `categories[]`, `product` → `product_ids[]`, `distance_learning` → `categories['Material']` (contract)
- [x] T022 [US3] GREEN: Update `unified_search` in `backend/django_Admin3/search/services/search_service.py` lines 86-158 to call `_translate_navbar_filters()` then merge result with panel filters before delegating to `self.filter_service.apply_store_product_filters()`. Remove direct call to `_apply_navbar_filters` from unified_search flow
- [x] T023 [US3] GREEN: Convert `SearchService._apply_navbar_filters` at `backend/django_Admin3/search/services/search_service.py` lines 324-363 to deprecated wrapper with deprecation warning, delegating to `_translate_navbar_filters` + `apply_store_product_filters` (R6)
- [x] T024 [US3] GREEN: Verify tests pass: `python manage.py test search.tests.test_navbar_filter_translation -v2`

**Checkpoint**: All three user stories complete. Navbar and panel filters use same code path.

---

## Phase 5: Polish & Regression

**Purpose**: Full regression validation, coverage check, and API contract verification

- [x] T025 Run full regression suite across both apps: `python manage.py test search filtering -v2` (expect 405+ tests passing)
- [x] T026 Fix any regression test assertion adjustments needed for new scoring formula distribution (scores shift ~15-20 points lower per R1). Update expected values in existing tests if needed
- [x] T027 Run test coverage report: `python manage.py test search filtering --coverage`. Verify new code meets 80% minimum coverage (constitution requirement)
- [x] T028 Verify API response structure unchanged for `POST /api/catalog/search/` and `POST /api/catalog/advanced-search/` endpoints per contracts/search-api.md (FR-008, SC-006)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **User Story 1 (Phase 2)**: Depends on Setup - can start after baseline verified
- **User Story 2 (Phase 3)**: Depends on Setup - can start after baseline verified (independent of US1)
- **User Story 3 (Phase 4)**: Depends on US2 completion (needs `apply_store_product_filters` on ProductFilterService)
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent - no dependencies on other stories
- **US2 (P2)**: Independent - no dependencies on other stories
- **US3 (P3)**: Depends on US2 (`_translate_navbar_filters` output is processed by `apply_store_product_filters` from US2)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (RED phase)
- Implementation makes tests pass (GREEN phase)
- Helper/utility methods before methods that depend on them
- Service methods before delegation wrappers
- Verify tests pass at each phase checkpoint

### Parallel Opportunities

- **US1 and US2 can run in parallel** after Phase 1 (different files: scoring vs filtering)
- Within US2: T007 and T008 test files can be created in parallel (different files)
- Within US2: T010-T013 (ProductFilterService methods) must be sequential (each depends on previous)
- US3 must wait for US2 completion

---

## Parallel Example: US1 + US2 Concurrent Start

```bash
# After Phase 1 baseline passes, both stories can begin simultaneously:

# Agent A: User Story 1 (scoring)
# T002: Create test_fuzzy_scoring.py
# T003: Verify tests fail
# T004-T005: Implement scoring changes
# T006: Verify tests pass

# Agent B: User Story 2 (filter delegation) - in parallel
# T007+T008: Create both test files (parallel)
# T009: Verify tests fail
# T010-T013: Add ProductFilterService methods (sequential)
# T014: Verify filter tests pass
# T015-T017: Delegate SearchService methods
# T018: Verify delegation tests pass
```

---

## Parallel Example: US2 Test Files

```bash
# T007 and T008 can be created simultaneously:
Task: "Create test_filter_counts.py in backend/django_Admin3/filtering/tests/test_filter_counts.py"
Task: "Create test_search_delegates_to_filter_service.py in backend/django_Admin3/search/tests/test_search_delegates_to_filter_service.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (baseline verification)
2. Complete Phase 2: User Story 1 (weighted scoring)
3. **STOP and VALIDATE**: Search ranking is accurate - students see relevant products first
4. This alone solves the core user-facing problem

### Incremental Delivery

1. Setup → Baseline verified
2. Add US1 → Scoring accuracy fixed (MVP!)
3. Add US2 → Filter consistency between search and browse
4. Add US3 → Navbar filter consistency
5. Polish → Full regression + coverage validated
6. Each story adds value without breaking previous stories

### Single Developer Strategy (Recommended)

1. Complete Setup (Phase 1)
2. US1 first (Phase 2) - immediate user value, independent
3. US2 next (Phase 3) - filter consistency, required by US3
4. US3 last (Phase 4) - depends on US2
5. Polish (Phase 5) - regression and coverage

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- No database migrations needed (data-model.md: no schema changes)
- No frontend changes needed (plan.md: backend only)
- No API contract changes (contracts/search-api.md: FR-008)
- All new methods added at end of existing files (minimal merge conflicts)
- Deprecated wrappers ensure backward compatibility with legacy `fuzzy_search()` and `advanced_fuzzy_search()` callers (R6)
- Threshold of 45 may need empirical tuning post-deployment (R2 risk)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
