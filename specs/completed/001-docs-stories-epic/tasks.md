# Tasks: Material Product Card Enhanced Purchase Options

**Feature Branch**: `001-docs-stories-epic`
**Input**: Design documents from `/Users/work/Documents/Code/Admin3/specs/001-docs-stories-epic/`
**Prerequisites**: plan.md, research.md
**Status**: Ready for execution

## Execution Flow (main)
```
1. Load plan.md from feature directory → ✅ LOADED
2. Load optional design documents → ✅ research.md available
3. Generate tasks by category → ✅ 23 tasks generated
4. Apply task rules (TDD, parallel marking) → ✅ APPLIED
5. Number tasks sequentially (T001-T023) → ✅ NUMBERED
6. Generate dependency graph → ✅ BELOW
7. Create parallel execution examples → ✅ BELOW
8. Validate task completeness → ✅ VALIDATED
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths are absolute from repository root

## Path Conventions
**Web application structure** (from plan.md):
- Backend: `/Users/work/Documents/Code/Admin3/backend/django_Admin3/`
- Frontend: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/`

---

## Phase 3.1: Story 1 - Backend Recommendation System ✅ COMPLETE

### Tests First (TDD) ⚠️ MUST COMPLETE BEFORE IMPLEMENTATION

- [x] **T001 [P]** Write ProductVariationRecommendation model tests
  - **File**: `backend/django_Admin3/products/tests/test_product_variation_recommendation.py`
  - **Tests**: Model creation, OneToOneField constraint, cascade deletion, self-reference validation, circular recommendation prevention
  - **Status**: ✅ COMPLETE - 8 tests passing
  - **Estimated time**: 30 min

- [x] **T002 [P]** Write API contract tests for recommended_product field
  - **File**: `backend/django_Admin3/exam_sessions_subjects_products/tests/test_recommendation_api.py`
  - **Tests**: Search API includes recommended_product when exists, omits when none (backward compat), response schema validation
  - **Status**: ✅ COMPLETE - 4 tests passing
  - **Estimated time**: 30 min

### Implementation (ONLY after tests are failing)

- [x] **T003** Create ProductVariationRecommendation model
  - **File**: `backend/django_Admin3/products/models/product_variation_recommendation.py`
  - **Implementation**: OneToOneField (source), ForeignKey (target), clean() validation, indexes
  - **Code reference**: research.md lines 72-105
  - **Dependencies**: T001 must be failing
  - **Status**: ✅ COMPLETE - Refactored to use ProductProductVariation
  - **Estimated time**: 20 min

- [x] **T004** Update products models __init__.py
  - **File**: `backend/django_Admin3/products/models/__init__.py`
  - **Implementation**: Add import for ProductVariationRecommendation
  - **Dependencies**: T003
  - **Status**: ✅ COMPLETE
  - **Estimated time**: 2 min

- [x] **T005** Generate and apply database migration
  - **Command**: `python manage.py makemigrations products --name add_product_variation_recommendations`
  - **Command**: `python manage.py migrate`
  - **Verify**: Migration creates `acted_product_productvariation_recommendations` table with indexes
  - **Dependencies**: T003, T004
  - **Status**: ✅ COMPLETE
  - **Estimated time**: 5 min

- [x] **T006** Extend serializer with get_recommended_product() method
  - **File**: `backend/django_Admin3/exam_sessions_subjects_products/serializers.py`
  - **Implementation**: Add SerializerMethodField, implement get_recommended_product() with nested object structure
  - **Code reference**: research.md lines 138-167
  - **Dependencies**: T002 must be failing, T005
  - **Status**: ✅ COMPLETE
  - **Estimated time**: 25 min

- [x] **T007** Add recommendation query optimization to search view
  - **File**: `backend/django_Admin3/exam_sessions_subjects_products/views.py`
  - **Implementation**: Add select_related for recommendation relationships in queryset
  - **Code reference**: research.md lines 171-182
  - **Dependencies**: T006
  - **Status**: ✅ COMPLETE
  - **Estimated time**: 10 min

- [x] **T008** Create Django admin interface for recommendations
  - **File**: `backend/django_Admin3/products/admin.py`
  - **Implementation**: Register ProductVariationRecommendation with list display, filters, autocomplete fields
  - **Code reference**: docs/stories/story-1-backend-recommendation-system.md lines 162-173
  - **Dependencies**: T003
  - **Status**: ✅ COMPLETE
  - **Estimated time**: 15 min

- [x] **T009** Verify all Story 1 tests pass
  - **Commands**:
    - `cd backend/django_Admin3`
    - `python manage.py test products.tests.test_product_variation_recommendation`
    - `python manage.py test exam_sessions_subjects_products.tests.test_recommendation_api`
  - **Success criteria**: All model tests and API tests pass, zero failures
  - **Dependencies**: T001-T008
  - **Status**: ✅ COMPLETE - All 12 tests passing (8 model + 4 API)
  - **Estimated time**: 5 min

---

## Phase 3.2: Story 2 - Frontend SpeedDial for Buy Both ✅ COMPLETE

### Tests First (TDD) ⚠️ MUST COMPLETE BEFORE IMPLEMENTATION

- [x] **T010 [P]** Write SpeedDial component tests for buy_both
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MaterialProductCard.buyboth.test.js`
  - **Tests**: SpeedDial renders when buy_both=true, standard button when buy_both=false, "Buy Both" action adds both variations, edge cases (1 variation, missing flag)
  - **Code reference**: docs/stories/story-2-frontend-speeddial-buy-both.md lines 276-343
  - **Status**: ✅ COMPLETE - 11 tests passing
  - **Dependencies**: T009 (backend API ready)
  - **Estimated time**: 30 min

### Implementation (ONLY after tests are failing)

- [x] **T011** Add SpeedDial imports to MaterialProductCard
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js`
  - **Implementation**: Import SpeedDial, SpeedDialAction, SpeedDialIcon from @mui/material
  - **Code reference**: docs/stories/story-2-frontend-speeddial-buy-both.md lines 92-101
  - **Dependencies**: T010 must be failing
  - **Status**: ✅ COMPLETE
  - **Estimated time**: 2 min

- [x] **T012** Remove buy_both radio button code
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js`
  - **Implementation**: Delete lines 373-437 (buy_both radio button block)
  - **Verify**: Radio button code removed, no syntax errors
  - **Dependencies**: T011
  - **Status**: ✅ COMPLETE
  - **Estimated time**: 3 min

- [x] **T013** Implement conditional SpeedDial for buy_both
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js`
  - **Implementation**: Replace "Add to Cart" button with conditional rendering (buy_both → SpeedDial, else → Button)
  - **Code reference**: docs/stories/story-2-frontend-speeddial-buy-both.md lines 114-264, research.md lines 222-296
  - **Dependencies**: T012
  - **Status**: ✅ COMPLETE
  - **Estimated time**: 30 min

- [x] **T014** Implement "Buy Both" action handler
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js`
  - **Implementation**: SpeedDialAction onClick for "Buy Both" - reuse existing cart logic (lines 578-642), add both variations sequentially
  - **Code reference**: docs/stories/story-2-frontend-speeddial-buy-both.md lines 168-224
  - **Dependencies**: T013
  - **Status**: ✅ COMPLETE
  - **Estimated time**: 20 min

- [x] **T015** Verify all Story 2 tests pass
  - **Commands**:
    - `cd frontend/react-Admin3`
    - `npm test -- --testPathPattern=MaterialProductCard.buyboth.test.js`
  - **Success criteria**: All SpeedDial tests pass, no regressions in existing cart tests
  - **Dependencies**: T010-T014
  - **Status**: ✅ COMPLETE - All 11 tests passing
  - **Estimated time**: 5 min

---

## Phase 3.3: Story 3 - Frontend SpeedDial for Recommended Products ✅ COMPLETE

### Tests First (TDD) ⚠️ MUST COMPLETE BEFORE IMPLEMENTATION

- [x] **T016 [P]** Write SpeedDial component tests for recommendations
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MaterialProductCard.recommendations.test.js`
  - **Tests**: SpeedDial renders when recommended_product exists, dynamic label shows product name + price, "Buy with Recommended" adds both products, fallback to standard button
  - **Status**: ✅ COMPLETE - 14 tests created (9 failing as expected - RED phase)
  - **Dependencies**: T015 (Story 2 complete)
  - **Estimated time**: 30 min

### Implementation (ONLY after tests are failing)

- [x] **T017** Implement conditional SpeedDial for recommended_product
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js`
  - **Implementation**: Extend conditional rendering logic - check currentVariation.recommended_product before falling back to standard button
  - **Code reference**: docs/stories/story-3-frontend-speeddial-recommendations.md, research.md lines 275-288
  - **Dependencies**: T016 must be failing
  - **Status**: ✅ COMPLETE
  - **Estimated time**: 20 min

- [x] **T018** Implement dynamic label generation (product name + price)
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js`
  - **Implementation**: Extract recommended product, find standard price, format label: "Buy with {product_short_name} ({formatted_price})"
  - **Code reference**: docs/stories/story-3-frontend-speeddial-recommendations.md lines 130-151, research.md lines 242-261
  - **Dependencies**: T017
  - **Status**: ✅ COMPLETE
  - **Estimated time**: 15 min

- [x] **T019** Implement "Buy with Recommended" action handler
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js`
  - **Implementation**: SpeedDialAction onClick - add current variation + recommended product to cart sequentially, maintain metadata structure
  - **Code reference**: docs/stories/story-3-frontend-speeddial-recommendations.md lines 154-206
  - **Dependencies**: T018
  - **Status**: ✅ COMPLETE
  - **Estimated time**: 25 min

- [x] **T020** Add three-tier conditional rendering logic
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js`
  - **Implementation**: Finalize rendering order - buy_both (precedence) → recommended_product → standard button (fallback)
  - **Verify**: All three paths tested, mutual exclusivity enforced (buy_both suppresses recommendations)
  - **Code reference**: research.md lines 275-288
  - **Dependencies**: T019
  - **Status**: ✅ COMPLETE
  - **Estimated time**: 10 min

- [x] **T021** Verify all Story 3 tests pass
  - **Commands**:
    - `cd frontend/react-Admin3`
    - `npm test -- --testPathPattern=MaterialProductCard.recommendations.test.js`
  - **Success criteria**: All recommendation SpeedDial tests pass, no regressions
  - **Dependencies**: T016-T020
  - **Status**: ✅ COMPLETE - All 14 tests passing, no regressions in buy_both tests
  - **Estimated time**: 5 min

---

## Phase 3.4: Integration & Validation

- [ ] **T022** Run full regression test suite (backend + frontend)
  - **Commands**:
    - Backend: `cd backend/django_Admin3 && python manage.py test`
    - Frontend: `cd frontend/react-Admin3 && npm test -- --coverage --watchAll=false`
  - **Success criteria**: All tests pass, coverage ≥ 80% for new code
  - **Dependencies**: T021
  - **Estimated time**: 10 min

- [ ] **T023** Manual QA: Test all product types
  - **Test scenarios**:
    1. Materials with buy_both=true → SpeedDial with "Buy Both" action
    2. Materials with recommendation → SpeedDial with "Buy with {Product}" action
    3. Materials without flags → standard "Add to Cart" button
    4. Tutorials, Markings, Bundles → verify no regression
  - **Verify**: Cart additions maintain correct metadata, pricing accurate
  - **Dependencies**: T022
  - **Estimated time**: 20 min

---

## Dependencies Graph

```
Setup & Backend (T001-T009):
  T001 [P] ──┐
  T002 [P] ──┼──> T003 ──> T004 ──> T005 ──┐
             │                              ├──> T006 ──> T007
             └────────────────> T008 ───────┘             │
                                                          ↓
                                                        T009

Frontend Story 2 (T010-T015):
  T009 ──> T010 [P] ──> T011 ──> T012 ──> T013 ──> T014 ──> T015

Frontend Story 3 (T016-T021):
  T015 ──> T016 [P] ──> T017 ──> T018 ──> T019 ──> T020 ──> T021

Integration (T022-T023):
  T021 ──> T022 ──> T023
```

---

## Parallel Execution Examples

### Example 1: Backend Tests (start of project)
```bash
# Launch T001 and T002 together (different files, no dependencies):
cd backend/django_Admin3

# Terminal 1:
python manage.py test products.tests.test_product_variation_recommendation -v 2

# Terminal 2:
python manage.py test exam_sessions_subjects_products.tests.test_recommendation_api -v 2

# Expected: Both fail (RED phase) - proceed to implementation
```

### Example 2: Frontend Tests (after backend complete)
```bash
# Launch T010 and T016 in sequence (T016 depends on T015):
cd frontend/react-Admin3

# T010 first (Story 2 tests):
npm test -- --testPathPattern=MaterialProductCard.buyboth.test.js --watch=false

# Complete T011-T015 implementation...

# T016 after Story 2 complete (Story 3 tests):
npm test -- --testPathPattern=MaterialProductCard.recommendations.test.js --watch=false
```

---

## Validation Checklist
*GATE: Verify before marking tasks.md complete*

- [x] All contracts have corresponding tests → T002 covers API contract
- [x] All entities have model tasks → T003 creates ProductVariationRecommendation model
- [x] All tests come before implementation → T001, T002, T010, T016 before implementation tasks
- [x] Parallel tasks truly independent → T001||T002, T010 (different files, no shared state)
- [x] Each task specifies exact file path → All tasks include full paths
- [x] No task modifies same file as another [P] task → Verified (parallel tasks target different files)

---

## Task Summary

**Total Tasks**: 23
**Parallel Tasks**: 4 (T001, T002, T010, T016)
**Estimated Total Time**: 6-7 hours

**Breakdown by Phase**:
- Story 1 (Backend): 9 tasks, ~2.5 hours
- Story 2 (Frontend Buy Both): 6 tasks, ~1.5 hours
- Story 3 (Frontend Recommendations): 6 tasks, ~1.5 hours
- Integration: 2 tasks, ~0.5 hours

---

## Notes for Execution

1. **TDD Mandatory**: Tasks T001, T002, T010, T016 MUST fail before proceeding to implementation
2. **Database Changes**: T005 creates new table - verify migration success before continuing
3. **API Backward Compatibility**: T006-T007 add optional field - existing consumers unaffected
4. **Frontend Refactoring**: T012 removes 64 lines of radio button code
5. **Zero Regression Goal**: T022-T023 validate all existing product types still work

**Git Workflow**:
- Commit after each completed task
- Use descriptive commit messages referencing task IDs
- Example: `T003: Add ProductVariationRecommendation model with validation`

---

**Tasks Status**: ✅ READY FOR EXECUTION - Follow TDD order, mark [P] tasks for parallel runs
