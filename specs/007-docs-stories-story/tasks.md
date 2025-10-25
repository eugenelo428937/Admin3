# Tasks: Extract Long Methods from FiltersSlice

**Feature Branch**: `007-docs-stories-story`
**Input**: Design documents from `/specs/007-docs-stories-story/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

---

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: JavaScript ES6+, React 18, Redux Toolkit, Jest
   → Structure: Web app (frontend/react-Admin3/)
2. Load design documents ✅
   → data-model.md: 3 modules (baseFilters, navigationFilters, selectors)
   → contracts/: 3 contract files (35 reducers + 5 nav actions + 16 selectors)
   → research.md: Composition patterns, memoization, testing strategy
3. Generate tasks by category:
   → Setup: Verify environment (1 task)
   → Tests: Contract tests for 3 modules (3 tasks) [P]
   → Core: Implement 3 modules (3 tasks)
   → Integration: Refactor main slice (1 task)
   → Validation: Existing tests + quickstart (3 tasks)
   → Polish: Code review, docs, cleanup (3 tasks)
4. Apply task rules:
   → Test files = [P] (parallel)
   → Implementation = sequential (TDD cycle)
   → Validation = sequential (dependencies)
5. Tasks numbered T001-T020
6. Dependency graph created below
7. Parallel execution examples included
8. Validation: All contracts → tests ✅, TDD order ✅
9. SUCCESS: Tasks ready for execution
```

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All file paths are absolute from repository root

---

## Path Conventions
**Project Type**: Web application (frontend only)
**Base Path**: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/`
**Source**: `src/store/slices/`
**Tests**: `src/__tests__/store/slices/`

---

## Phase 3.1: Setup & Verification

### T001: Verify Development Environment
**Type**: Setup
**File**: N/A (verification task)
**Estimated Time**: 5 minutes

**Checklist**:
- [ ] Verify Node.js and npm installed
- [ ] Navigate to `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/`
- [ ] Run `npm install` to ensure dependencies up to date
- [ ] Verify Redux Toolkit and reselect available
- [ ] Run existing tests: `npm test -- filtersSlice.test.js --watchAll=false`
- [ ] Confirm all 43 existing tests pass (baseline)
- [ ] Record current filtersSlice.js line count: `wc -l src/store/slices/filtersSlice.js`

**Success Criteria**:
- ✅ All 43 existing tests pass
- ✅ Current line count recorded (baseline: 532 lines)
- ✅ Development environment ready

**Dependencies**: None

---

## Phase 3.2: Tests First (TDD - RED Phase) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL**: These tests MUST be written and MUST FAIL before ANY implementation

### T002 [P]: Write Base Filters Module Tests
**Type**: Test (RED phase)
**File**: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/__tests__/store/slices/baseFilters.test.js`
**Contract**: `contracts/baseFilters-module-contract.md`
**Estimated Time**: 45 minutes

**Test Requirements** (35 tests total):

**Set Actions** (7 tests):
- [ ] setSubjects updates subjects array and resets currentPage
- [ ] setCategories updates categories array and resets currentPage
- [ ] setProductTypes updates product_types array and resets currentPage
- [ ] setProducts updates products array and resets currentPage
- [ ] setModesOfDelivery updates modes_of_delivery array and resets currentPage
- [ ] setSearchQuery updates searchQuery and resets currentPage
- [ ] setSearchFilterProductIds updates searchFilterProductIds and resets currentPage

**Toggle Actions** (5 tests):
- [ ] toggleSubjectFilter adds subject when not present
- [ ] toggleSubjectFilter removes subject when present
- [ ] toggleCategoryFilter toggles category correctly
- [ ] toggleProductTypeFilter toggles product type correctly
- [ ] toggleProductFilter toggles product correctly
- [ ] toggleModeOfDeliveryFilter toggles mode correctly

**Remove Actions** (5 tests):
- [ ] removeSubjectFilter removes specific subject
- [ ] removeCategoryFilter removes specific category
- [ ] removeProductTypeFilter removes specific product type
- [ ] removeProductFilter removes specific product
- [ ] removeModeOfDeliveryFilter removes specific mode

**Clear Actions** (2 tests):
- [ ] clearFilterType clears specific filter type
- [ ] clearAllFilters resets all base filters to initial state

**Multi-Update** (1 test):
- [ ] setMultipleFilters updates multiple filters at once

**Pagination** (2 tests):
- [ ] setCurrentPage updates currentPage
- [ ] setPageSize updates pageSize and resets currentPage to 1

**UI Actions** (2 tests):
- [ ] toggleFilterPanel toggles isFilterPanelOpen
- [ ] setFilterPanelOpen sets isFilterPanelOpen to specific value

**Loading/Error** (3 tests):
- [ ] setLoading updates isLoading
- [ ] setError sets error and sets isLoading to false
- [ ] clearError clears error state

**Utility** (4 tests):
- [ ] resetFilters resets all filters to initial state
- [ ] applyFilters caches current filter state
- [ ] setFilterCounts updates filterCounts
- [ ] All filter changes update lastUpdated timestamp

**Implementation**:
```javascript
import { baseFiltersInitialState, baseFiltersReducers } from '../../../store/slices/baseFilters.slice';

describe('Base Filters Module', () => {
  let state;

  beforeEach(() => {
    state = { ...baseFiltersInitialState };
  });

  describe('Set Actions', () => {
    test('setSubjects updates subjects and resets currentPage', () => {
      // Test implementation
      // EXPECTED: Test should FAIL (module not implemented yet)
    });
    // ... other tests
  });
});
```

**Run Tests**:
```bash
cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3
npm test -- baseFilters.test.js --watchAll=false
```

**Expected Result**: ❌ All tests FAIL (module doesn't exist yet)

**Success Criteria**:
- ✅ Test file created with 35 test cases
- ✅ All tests fail with "cannot find module" or similar
- ✅ Test structure follows contract requirements

**Dependencies**: T001

---

### T003 [P]: Write Navigation Filters Module Tests
**Type**: Test (RED phase)
**File**: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/__tests__/store/slices/navigationFilters.test.js`
**Contract**: `contracts/navigationFilters-module-contract.md`
**Estimated Time**: 25 minutes

**Test Requirements** (15 tests total):

**navSelectSubject** (3 tests):
- [ ] Sets subjects to single subject
- [ ] Preserves all other filters
- [ ] Updates lastUpdated and resets currentPage

**navViewAllProducts** (3 tests):
- [ ] Clears products, categories, product_types, modes_of_delivery, searchQuery
- [ ] Preserves subjects
- [ ] Updates lastUpdated and resets currentPage

**navSelectProductGroup** (3 tests):
- [ ] Sets product_types to single type and clears others
- [ ] Preserves subjects
- [ ] Updates lastUpdated and resets currentPage

**navSelectProduct** (3 tests):
- [ ] Sets products to single product and clears others
- [ ] Preserves subjects
- [ ] Updates lastUpdated and resets currentPage

**navSelectModeOfDelivery** (3 tests):
- [ ] Sets modes_of_delivery to single mode and clears others
- [ ] Preserves subjects
- [ ] Updates lastUpdated and resets currentPage

**Implementation**:
```javascript
import { navigationFiltersReducers } from '../../../store/slices/navigationFilters.slice';

describe('Navigation Filters Module', () => {
  describe('navSelectSubject', () => {
    test('sets subjects to single subject', () => {
      // Test implementation
      // EXPECTED: Test should FAIL
    });
  });
});
```

**Run Tests**:
```bash
npm test -- navigationFilters.test.js --watchAll=false
```

**Expected Result**: ❌ All tests FAIL (module doesn't exist yet)

**Success Criteria**:
- ✅ Test file created with 15 test cases
- ✅ All tests fail appropriately
- ✅ Tests verify navigation clearing behaviors

**Dependencies**: T001

---

### T004 [P]: Write Filter Selectors Module Tests
**Type**: Test (RED phase)
**File**: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/__tests__/store/slices/filterSelectors.test.js`
**Contract**: `contracts/filterSelectors-module-contract.md`
**Estimated Time**: 35 minutes

**Test Requirements** (25 tests total):

**Basic Selectors** (11 tests):
- [ ] selectFilters returns filter object
- [ ] selectSearchQuery returns search query
- [ ] selectSearchFilterProductIds returns ESSP IDs
- [ ] selectCurrentPage returns current page
- [ ] selectPageSize returns page size
- [ ] selectIsFilterPanelOpen returns panel state
- [ ] selectIsLoading returns loading state
- [ ] selectError returns error state
- [ ] selectAppliedFilters returns applied filters
- [ ] selectLastUpdated returns timestamp
- [ ] selectFilterCounts returns counts object

**Validation Selectors** (2 tests):
- [ ] selectValidationErrors returns errors array
- [ ] selectHasValidationErrors returns true only for errors (not warnings)

**Derived Selectors** (6 tests):
- [ ] selectHasActiveFilters returns false when no filters
- [ ] selectHasActiveFilters returns true when any filter active
- [ ] selectHasActiveFilters returns true when search query present
- [ ] selectActiveFilterCount returns 0 when no filters
- [ ] selectActiveFilterCount counts all filter types
- [ ] selectActiveFilterCount counts search query as 1

**Memoization Tests** (6 tests):
- [ ] selectFilters returns same reference when state unchanged
- [ ] selectHasActiveFilters returns same reference when dependencies unchanged
- [ ] selectActiveFilterCount returns same reference when dependencies unchanged
- [ ] selectHasActiveFilters recomputes when filters change
- [ ] selectActiveFilterCount recomputes when filters change
- [ ] Selectors don't recompute when unrelated state changes

**Implementation**:
```javascript
import {
  selectFilters,
  selectHasActiveFilters,
  selectActiveFilterCount,
  // ... other selectors
} from '../../../store/slices/filterSelectors';

describe('Filter Selectors Module', () => {
  const mockState = {
    filters: {
      subjects: ['CM2'],
      categories: [],
      // ... complete state
    }
  };

  describe('Basic Selectors', () => {
    test('selectFilters returns filter object', () => {
      // Test implementation
      // EXPECTED: Test should FAIL
    });
  });

  describe('Memoization', () => {
    test('selectHasActiveFilters returns same reference when unchanged', () => {
      const result1 = selectHasActiveFilters(mockState);
      const result2 = selectHasActiveFilters(mockState);
      expect(result1).toBe(result2); // Same reference
    });
  });
});
```

**Run Tests**:
```bash
npm test -- filterSelectors.test.js --watchAll=false
```

**Expected Result**: ❌ All tests FAIL (module doesn't exist yet)

**Success Criteria**:
- ✅ Test file created with 25 test cases
- ✅ All tests fail appropriately
- ✅ Memoization tests verify reference equality

**Dependencies**: T001

---

## Parallel Execution Example (T002-T004)

These three test tasks can run in parallel as they write to different files:

```bash
# Launch all test tasks together
cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3

# Terminal 1
npm test -- baseFilters.test.js --watchAll=false

# Terminal 2
npm test -- navigationFilters.test.js --watchAll=false

# Terminal 3
npm test -- filterSelectors.test.js --watchAll=false
```

Or using the Task tool (recommended):
```
Task 1: "Write base filters module tests in baseFilters.test.js with 35 test cases"
Task 2: "Write navigation filters module tests in navigationFilters.test.js with 15 test cases"
Task 3: "Write filter selectors module tests in filterSelectors.test.js with 25 test cases"
```

---

## Phase 3.3: Core Implementation (GREEN Phase) - ONLY AFTER TESTS FAIL

**GATE**: ⚠️ DO NOT START until T002-T004 are complete and tests are FAILING

### T005: Implement Base Filters Module
**Type**: Implementation (GREEN phase)
**File**: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/store/slices/baseFilters.slice.js`
**Contract**: `contracts/baseFilters-module-contract.md`
**Tests**: T002 (35 failing tests)
**Estimated Time**: 60 minutes

**Implementation Checklist**:
- [ ] Create file `src/store/slices/baseFilters.slice.js`
- [ ] Export `baseFiltersInitialState` object (14 properties)
- [ ] Export `baseFiltersReducers` object with 35 reducer functions:
  - 7 set actions (setSubjects, setCategories, setProductTypes, setProducts, setModesOfDelivery, setSearchQuery, setSearchFilterProductIds)
  - 5 toggle actions (toggleSubjectFilter, toggleCategoryFilter, toggleProductTypeFilter, toggleProductFilter, toggleModeOfDeliveryFilter)
  - 5 remove actions (removeSubjectFilter, removeCategoryFilter, removeProductTypeFilter, removeProductFilter, removeModeOfDeliveryFilter)
  - 2 clear actions (clearFilterType, clearAllFilters)
  - 1 multi-update action (setMultipleFilters)
  - 2 pagination actions (setCurrentPage, setPageSize)
  - 2 UI actions (toggleFilterPanel, setFilterPanelOpen)
  - 3 loading/error actions (setLoading, setError, clearError)
  - 4 utility actions (resetFilters, applyFilters, setFilterCounts, plus timestamp updates)
- [ ] All reducers update `lastUpdated` timestamp where appropriate
- [ ] All filter changes reset `currentPage` to 1
- [ ] Follow exact implementation from contract

**Run Tests**:
```bash
npm test -- baseFilters.test.js --watchAll=false
```

**Expected Result**: ✅ All 35 tests PASS

**Code Quality Checks**:
- [ ] Module is under 200 lines
- [ ] Each reducer uses Immer draft syntax correctly
- [ ] No duplication (extract common patterns if needed)
- [ ] JSDoc comments for exported objects

**Success Criteria**:
- ✅ All 35 tests pass
- ✅ Module < 200 lines
- ✅ No ESLint errors
- ✅ Code matches contract exactly

**Dependencies**: T002 (tests must exist and fail first)

---

### T006: Implement Navigation Filters Module
**Type**: Implementation (GREEN phase)
**File**: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/store/slices/navigationFilters.slice.js`
**Contract**: `contracts/navigationFilters-module-contract.md`
**Tests**: T003 (15 failing tests)
**Estimated Time**: 30 minutes

**Implementation Checklist**:
- [ ] Create file `src/store/slices/navigationFilters.slice.js`
- [ ] Export `navigationFiltersReducers` object with 5 reducer functions:
  - navSelectSubject (clears nothing, sets subjects)
  - navViewAllProducts (clears products/categories/types/modes/search, preserves subjects)
  - navSelectProductGroup (clears products/categories/modes/search, sets types, preserves subjects)
  - navSelectProduct (clears categories/types/modes/search, sets products, preserves subjects)
  - navSelectModeOfDelivery (clears categories/types/products/search, sets modes, preserves subjects)
- [ ] All reducers update `lastUpdated` timestamp
- [ ] All reducers reset `currentPage` to 1
- [ ] Implement exact clearing behaviors from contract

**Run Tests**:
```bash
npm test -- navigationFilters.test.js --watchAll=false
```

**Expected Result**: ✅ All 15 tests PASS

**Code Quality Checks**:
- [ ] Module is under 200 lines (should be ~100 lines)
- [ ] Clearing logic is explicit and correct
- [ ] Comments explain drill-down pattern
- [ ] No magic values

**Success Criteria**:
- ✅ All 15 tests pass
- ✅ Module < 200 lines
- ✅ Navigation behaviors match contract

**Dependencies**: T003 (tests must exist and fail first)

---

### T007: Implement Filter Selectors Module
**Type**: Implementation (GREEN phase)
**File**: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/store/slices/filterSelectors.js`
**Contract**: `contracts/filterSelectors-module-contract.md`
**Tests**: T004 (25 failing tests)
**Estimated Time**: 40 minutes

**Implementation Checklist**:
- [ ] Create file `src/store/slices/filterSelectors.js`
- [ ] Import `createSelector` from `@reduxjs/toolkit` (or `reselect`)
- [ ] Export 11 basic selectors (direct state access):
  - selectFilters (memoized with createSelector)
  - selectSearchQuery
  - selectSearchFilterProductIds
  - selectCurrentPage
  - selectPageSize
  - selectIsFilterPanelOpen
  - selectIsLoading
  - selectError
  - selectAppliedFilters
  - selectLastUpdated
  - selectFilterCounts
- [ ] Export 2 validation selectors:
  - selectValidationErrors
  - selectHasValidationErrors
- [ ] Export 3 derived selectors (memoized with createSelector):
  - selectHasActiveFilters
  - selectActiveFilterCount
  - (selectFilters already memoized above)
- [ ] All derived selectors use `createSelector` for memoization
- [ ] Memoization dependencies are minimal

**Run Tests**:
```bash
npm test -- filterSelectors.test.js --watchAll=false
```

**Expected Result**: ✅ All 25 tests PASS

**Code Quality Checks**:
- [ ] Module is under 200 lines (should be ~150 lines)
- [ ] All derived selectors use createSelector
- [ ] Dependencies for memoization are minimal
- [ ] JSDoc comments explain each selector

**Success Criteria**:
- ✅ All 25 tests pass
- ✅ Module < 200 lines
- ✅ Memoization tests verify reference equality
- ✅ Selectors match contract

**Dependencies**: T004 (tests must exist and fail first)

---

## Phase 3.4: Integration (Refactor Main Slice)

### T008: Refactor Main FiltersSlice to Use Modules
**Type**: Integration/Refactoring
**File**: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/store/slices/filtersSlice.js`
**Estimated Time**: 45 minutes

**Refactoring Checklist**:
- [ ] Read current filtersSlice.js (532 lines) to understand structure
- [ ] Import modules:
  ```javascript
  import { baseFiltersInitialState, baseFiltersReducers } from './baseFilters.slice';
  import { navigationFiltersReducers } from './navigationFilters.slice';
  import FilterValidator from '../filters/filterValidator';
  ```
- [ ] Combine initial states:
  ```javascript
  const initialState = {
    ...baseFiltersInitialState,
    validationErrors: [],
  };
  ```
- [ ] Combine reducers in createSlice:
  ```javascript
  const filtersSlice = createSlice({
    name: 'filters',
    initialState,
    reducers: {
      ...baseFiltersReducers,
      ...navigationFiltersReducers,

      // Add validation actions (not in modules)
      validateFilters: (state) => {
        const errors = FilterValidator.validate(state);
        state.validationErrors = errors;
      },

      clearValidationErrors: (state) => {
        state.validationErrors = [];
      },

      // Override clearAllFilters to include validation
      clearAllFilters: (state) => {
        baseFiltersReducers.clearAllFilters(state);
        state.validationErrors = [];
      },
    }
  });
  ```
- [ ] Export ALL actions (unchanged from current):
  ```javascript
  export const {
    // Base filter actions (35)
    setSubjects,
    setCategories,
    // ... all others

    // Navigation actions (5)
    navSelectSubject,
    // ... all others

    // Validation actions (2)
    validateFilters,
    clearValidationErrors,
  } = filtersSlice.actions;
  ```
- [ ] Re-export ALL selectors:
  ```javascript
  export {
    selectFilters,
    selectSearchQuery,
    // ... all 16+ selectors
  } from './filterSelectors';
  ```
- [ ] Export reducer:
  ```javascript
  export default filtersSlice.reducer;
  ```
- [ ] Add validation calls in appropriate reducers (Story 1.12 integration)

**Run Tests**:
```bash
# Run existing tests to verify no breaking changes
npm test -- filtersSlice.test.js --watchAll=false

# Run all filter tests
npm test -- --testPathPattern="filters" --watchAll=false
```

**Expected Result**:
- ✅ All 43 existing filtersSlice tests PASS
- ✅ All 75 new module tests PASS (T002-T004)
- ✅ Total: 118 tests passing

**Code Quality Checks**:
- [ ] Main slice reduced to ~100-150 lines (from 532)
- [ ] All exports match previous version exactly
- [ ] No console errors
- [ ] FilterValidator integration preserved

**Success Criteria**:
- ✅ All 118 tests pass (43 existing + 75 new)
- ✅ Main slice < 150 lines
- ✅ Zero breaking changes (all imports work)
- ✅ Validation logic preserved

**Dependencies**: T005, T006, T007 (all modules must be implemented first)

---

## Phase 3.5: Validation & Verification

### T009: Run Existing Integration Tests
**Type**: Validation
**File**: N/A (test runner)
**Estimated Time**: 10 minutes

**Verification Steps**:
- [ ] Run all existing filter-related tests:
  ```bash
  cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3
  npm test -- --testPathPattern="filter" --watchAll=false
  ```
- [ ] Verify URL sync middleware tests pass:
  ```bash
  npm test -- urlSyncMiddleware.test.js --watchAll=false
  ```
- [ ] Verify product search hook tests pass:
  ```bash
  npm test -- useProductsSearch.test.js --watchAll=false
  ```
- [ ] Check for any console errors or warnings
- [ ] Review test output for any skipped or pending tests

**Expected Results**:
- ✅ filtersSlice.test.js: 43 tests pass
- ✅ urlSyncMiddleware.test.js: 33 tests pass
- ✅ useProductsSearch.test.js: 7 tests pass
- ✅ baseFilters.test.js: 35 tests pass
- ✅ navigationFilters.test.js: 15 tests pass
- ✅ filterSelectors.test.js: 25 tests pass
- ✅ **Total**: 158 tests passing

**Success Criteria**:
- ✅ All filter-related tests pass
- ✅ No test failures or errors
- ✅ No new console warnings

**Dependencies**: T008 (main slice refactored)

---

### T010: Execute Quickstart Verification
**Type**: Validation
**File**: Follow steps in `quickstart.md`
**Estimated Time**: 15 minutes

**Verification Steps** (from quickstart.md):

1. **Verify File Structure**:
   ```bash
   ls -la src/store/slices/ | grep -E "(baseFilters|navigationFilters|filterSelectors)"
   # Expected: All 3 new files exist
   ```

2. **Verify Line Counts**:
   ```bash
   wc -l src/store/slices/baseFilters.slice.js
   wc -l src/store/slices/navigationFilters.slice.js
   wc -l src/store/slices/filterSelectors.js
   wc -l src/store/slices/filtersSlice.js
   # Expected: All < 200 lines, main slice ~100-150 lines
   ```

3. **Verify Exports**:
   ```bash
   grep "export const {" src/store/slices/filtersSlice.js
   # Expected: Long list of actions

   grep "export {" src/store/slices/filtersSlice.js | grep "from './filterSelectors'"
   # Expected: Selector re-exports
   ```

4. **Verify No Component Changes**:
   ```bash
   cd src
   grep -r "from.*filtersSlice" components/
   # Expected: All still import from filtersSlice, none from new modules
   ```

5. **Manual Browser Test** (if dev server available):
   - [ ] Navigate to /products
   - [ ] Click subject in navigation menu → filters update
   - [ ] Toggle filter checkbox → filter applies
   - [ ] Click "Clear All Filters" → all filters clear
   - [ ] No console errors in browser DevTools

**Success Criteria**:
- ✅ All 4 module files exist
- ✅ Line counts meet requirements
- ✅ Exports verified
- ✅ No component imports changed
- ✅ Manual tests pass (if executed)

**Dependencies**: T008 (main slice refactored)

---

### T011: Performance Validation
**Type**: Validation
**File**: N/A (performance measurement)
**Estimated Time**: 10 minutes

**Performance Checks**:
- [ ] Run URL sync performance tests (if they exist):
  ```bash
  npm test -- urlSyncPerformance.test.js --watchAll=false
  ```
- [ ] Measure typical filter operation timing:
  ```javascript
  // In browser console or Node REPL
  console.time('filter-action');
  dispatch(setSubjects(['CM2', 'SA1']));
  console.timeEnd('filter-action');
  // Expected: < 1ms
  ```
- [ ] Check bundle size (production build):
  ```bash
  npm run build
  ls -lh build/static/js/main.*.js
  # Compare with baseline (should be same or smaller)
  ```
- [ ] Verify selector memoization working:
  ```javascript
  // Test that selectors return same reference
  const result1 = selectHasActiveFilters(state);
  const result2 = selectHasActiveFilters(state);
  console.log(result1 === result2); // Should be true
  ```

**Expected Results**:
- ✅ URL sync < 5ms (target: maintain current 0.069ms avg)
- ✅ Filter actions < 1ms
- ✅ Bundle size unchanged or reduced
- ✅ Selector memoization verified

**Success Criteria**:
- ✅ No performance degradation
- ✅ URL sync performance maintained
- ✅ Bundle size acceptable

**Dependencies**: T008 (main slice refactored)

---

## Phase 3.6: Polish & Cleanup

### T012 [P]: Code Review and Documentation
**Type**: Polish
**Files**: All new modules + main slice
**Estimated Time**: 30 minutes

**Review Checklist**:
- [ ] Review `baseFilters.slice.js`:
  - Consistent naming conventions
  - JSDoc comments for exports
  - No magic numbers or strings
  - Clear separation of concerns
- [ ] Review `navigationFilters.slice.js`:
  - Navigation clearing logic clearly commented
  - Drill-down pattern explained
  - Consistent with base filter patterns
- [ ] Review `filterSelectors.js`:
  - All selectors have JSDoc comments
  - Memoization strategy documented
  - Performance notes included
- [ ] Review refactored `filtersSlice.js`:
  - Module organization documented in file header
  - Re-export pattern clear
  - Validation integration explained
- [ ] Add module header comments explaining architecture:
  ```javascript
  /**
   * Base Filters Module
   *
   * Contains core filter state and actions for:
   * - Subjects, Categories, Product Types, Products, Modes of Delivery
   * - Search query and pagination
   * - UI state and loading states
   *
   * Part of the modular filters architecture. See filtersSlice.js for
   * the main facade that combines all filter modules.
   */
  ```

**Documentation Updates**:
- [ ] Update inline comments for complex logic
- [ ] Ensure all reducers have clear descriptions
- [ ] Document module relationships
- [ ] Add examples for common operations

**Success Criteria**:
- ✅ All modules have clear documentation
- ✅ Architecture documented in file headers
- ✅ Complex logic explained
- ✅ Ready for team review

**Dependencies**: T008 (implementation complete)

---

### T013 [P]: Remove Duplication and Refactor
**Type**: Refactoring (REFACTOR phase)
**Files**: All modules
**Estimated Time**: 20 minutes

**Refactoring Opportunities**:
- [ ] Check for repeated patterns in reducers:
  ```javascript
  // Pattern: state.currentPage = 1; state.lastUpdated = Date.now();
  // Could extract to helper function if used extensively
  ```
- [ ] Verify no code duplication between modules
- [ ] Check for consistent error handling patterns
- [ ] Simplify complex conditional logic if any
- [ ] Extract common validation logic if duplicated

**Code Quality**:
- [ ] Run ESLint and fix any issues:
  ```bash
  npm run lint src/store/slices/baseFilters.slice.js
  npm run lint src/store/slices/navigationFilters.slice.js
  npm run lint src/store/slices/filterSelectors.js
  npm run lint src/store/slices/filtersSlice.js
  ```
- [ ] Format code consistently:
  ```bash
  npm run format src/store/slices/
  ```
- [ ] Remove any console.log or debug statements
- [ ] Verify no unused imports

**Run Tests After Refactoring**:
```bash
npm test -- --testPathPattern="filters" --watchAll=false
```

**Expected Result**: ✅ All 158 tests still pass

**Success Criteria**:
- ✅ No code duplication
- ✅ ESLint clean
- ✅ Code formatted consistently
- ✅ All tests pass after refactoring

**Dependencies**: T008 (implementation complete)

---

### T014: Final Line Count Verification
**Type**: Validation
**Files**: All modules
**Estimated Time**: 5 minutes

**Verification Steps**:
- [ ] Count lines in each module:
  ```bash
  cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/store/slices

  echo "=== Line Counts ==="
  echo -n "baseFilters.slice.js: "; wc -l baseFilters.slice.js | awk '{print $1}'
  echo -n "navigationFilters.slice.js: "; wc -l navigationFilters.slice.js | awk '{print $1}'
  echo -n "filterSelectors.js: "; wc -l filterSelectors.js | awk '{print $1}'
  echo -n "filtersSlice.js: "; wc -l filtersSlice.js | awk '{print $1}'

  echo ""
  echo "=== Requirements ==="
  echo "Each module: < 200 lines"
  echo "Main slice: ~100-150 lines (was 532)"
  ```
- [ ] Verify all modules meet size requirements
- [ ] Calculate total line reduction
- [ ] Document metrics for completion report

**Expected Results**:
- ✅ baseFilters.slice.js: ~150-180 lines (< 200)
- ✅ navigationFilters.slice.js: ~80-100 lines (< 200)
- ✅ filterSelectors.js: ~120-150 lines (< 200)
- ✅ filtersSlice.js: ~100-150 lines (was 532)
- ✅ **Total reduction**: ~200+ lines

**Success Criteria**:
- ✅ All modules < 200 lines
- ✅ Main slice < 150 lines
- ✅ Significant line reduction achieved

**Dependencies**: T013 (refactoring complete)

---

## Phase 3.7: Completion

### T015: Create Completion Report
**Type**: Documentation
**File**: `/Users/work/Documents/Code/Admin3/specs/007-docs-stories-story/completion-report.md`
**Estimated Time**: 15 minutes

**Report Contents**:
- [ ] Summary of changes:
  - Files created (4 new modules)
  - Files modified (1 main slice)
  - Tests added (75 new tests)
- [ ] Metrics:
  - Line count before/after
  - Test count before/after
  - Module sizes
  - Performance measurements
- [ ] Verification results:
  - All tests passing (158 total)
  - Quickstart validation results
  - Performance validation results
- [ ] Architecture notes:
  - Module organization
  - Re-export pattern
  - Backward compatibility confirmed
- [ ] Next steps:
  - Code review required
  - Integration testing recommended
  - Documentation updates needed

**Success Criteria**:
- ✅ Comprehensive report created
- ✅ All metrics documented
- ✅ Results clearly summarized

**Dependencies**: T014 (all validation complete)

---

### T016: Commit Changes with Descriptive Message
**Type**: Version Control
**Files**: All changes
**Estimated Time**: 10 minutes

**Commit Steps**:
- [ ] Review all changes:
  ```bash
  cd /Users/work/Documents/Code/Admin3
  git status
  git diff src/store/slices/
  ```
- [ ] Stage new files:
  ```bash
  git add frontend/react-Admin3/src/store/slices/baseFilters.slice.js
  git add frontend/react-Admin3/src/store/slices/navigationFilters.slice.js
  git add frontend/react-Admin3/src/store/slices/filterSelectors.js
  ```
- [ ] Stage modified files:
  ```bash
  git add frontend/react-Admin3/src/store/slices/filtersSlice.js
  ```
- [ ] Stage test files:
  ```bash
  git add frontend/react-Admin3/src/__tests__/store/slices/baseFilters.test.js
  git add frontend/react-Admin3/src/__tests__/store/slices/navigationFilters.test.js
  git add frontend/react-Admin3/src/__tests__/store/slices/filterSelectors.test.js
  ```
- [ ] Create commit:
  ```bash
  git commit -m "$(cat <<'EOF'
  refactor: extract filtersSlice into focused modules (Story 1.14)

  - Split 532-line filtersSlice into 4 focused modules
  - Created baseFilters.slice.js (core filter actions)
  - Created navigationFilters.slice.js (navigation menu actions)
  - Created filterSelectors.js (centralized selectors)
  - Refactored main filtersSlice to use modules (now ~120 lines)

  - Added 75 new module-specific tests
  - All 43 existing tests pass unchanged
  - Total: 158 tests passing

  - Zero breaking changes (re-export pattern maintains all imports)
  - Performance maintained (URL sync < 5ms)
  - Each module < 200 lines

  Addresses God Object code smell, improves maintainability and testability.

  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>
  EOF
  )"
  ```

**Verify Commit**:
```bash
git log -1 --stat
git show --name-status
```

**Success Criteria**:
- ✅ All changes committed
- ✅ Descriptive commit message
- ✅ No uncommitted changes remain

**Dependencies**: T015 (completion report ready)

---

### T017: Prepare for Code Review
**Type**: Documentation
**Files**: N/A (preparation task)
**Estimated Time**: 10 minutes

**Preparation Steps**:
- [ ] Create pull request (if using GitHub workflow):
  ```bash
  # Push branch
  git push -u origin 007-docs-stories-story

  # Create PR via gh CLI or web interface
  gh pr create --title "Story 1.14: Extract FiltersSlice into Focused Modules" \
    --body "$(cat <<'EOF'
  ## Summary
  Refactors filtersSlice.js (532 lines) into 4 focused modules to address God Object code smell.

  ## Changes
  - ✅ Created baseFilters.slice.js (~180 lines) - Core filter actions
  - ✅ Created navigationFilters.slice.js (~100 lines) - Navigation menu actions
  - ✅ Created filterSelectors.js (~150 lines) - Centralized selectors
  - ✅ Refactored filtersSlice.js to ~120 lines (down from 532)

  ## Testing
  - ✅ Added 75 new module-specific tests
  - ✅ All 43 existing tests pass unchanged
  - ✅ Total: 158 tests passing
  - ✅ Quickstart validation complete
  - ✅ Performance maintained (URL sync < 5ms)

  ## Verification
  - ✅ Zero breaking changes (all imports work identically)
  - ✅ Each module < 200 lines
  - ✅ No console errors
  - ✅ Bundle size unchanged

  ## Review Focus
  - Module organization and separation of concerns
  - Re-export pattern for backward compatibility
  - Test coverage for new modules
  - Documentation and code comments

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  EOF
  )"
  ```
- [ ] Or prepare review notes if not using PR workflow
- [ ] List files for reviewer to examine:
  - New modules (3 files)
  - Refactored main slice (1 file)
  - New tests (3 files)
  - Completion report
- [ ] Highlight key architectural decisions:
  - Reducer composition pattern
  - Re-export facade for backward compatibility
  - Memoized selectors for performance

**Success Criteria**:
- ✅ PR created or review notes prepared
- ✅ All context provided for reviewer
- ✅ Key files highlighted

**Dependencies**: T016 (changes committed)

---

## Dependencies Graph

```
T001 (Setup)
  ↓
├─→ T002 [P] (Base Filters Tests)
├─→ T003 [P] (Navigation Filters Tests)
└─→ T004 [P] (Selectors Tests)
      ↓
    T002 → T005 (Implement Base Filters)
      ↓
    T003 → T006 (Implement Navigation Filters)
      ↓
    T004 → T007 (Implement Selectors)
      ↓
    T005 + T006 + T007 → T008 (Refactor Main Slice)
      ↓
    T008 → T009 (Run Existing Tests)
      ↓
    T008 → T010 (Quickstart Verification)
      ↓
    T008 → T011 (Performance Validation)
      ↓
    T008 → T012 [P] (Code Review & Docs)
      ↓
    T008 → T013 [P] (Refactoring)
      ↓
    T013 → T014 (Line Count Verification)
      ↓
    T014 → T015 (Completion Report)
      ↓
    T015 → T016 (Commit)
      ↓
    T016 → T017 (Prepare Review)
```

---

## Task Summary

**Total Tasks**: 17
**Estimated Total Time**: ~6-7 hours

**By Phase**:
- Setup (1 task): ~5 min
- Tests (3 tasks): ~105 min
- Implementation (3 tasks): ~130 min
- Integration (1 task): ~45 min
- Validation (3 tasks): ~35 min
- Polish (3 tasks): ~55 min
- Completion (3 tasks): ~35 min

**Parallelization Opportunities**:
- T002-T004: Test writing (3 tasks in parallel)
- T012-T013: Code review and refactoring (2 tasks in parallel)

**Critical Path**: T001 → T002 → T005 → T008 → T009 → T014 → T016 → T017

---

## Validation Checklist

✅ All contracts have corresponding tests:
- baseFilters-module-contract.md → T002 (35 tests)
- navigationFilters-module-contract.md → T003 (15 tests)
- filterSelectors-module-contract.md → T004 (25 tests)

✅ All entities have implementation tasks:
- Base Filters Module → T005
- Navigation Filters Module → T006
- Filter Selectors Module → T007
- Main Slice Integration → T008

✅ All tests come before implementation:
- T002-T004 (RED) → T005-T007 (GREEN) → T013 (REFACTOR)

✅ Parallel tasks are truly independent:
- T002-T004: Different test files
- T012-T013: Different concerns (docs vs. code)

✅ Each task specifies exact file path

✅ No task modifies same file as another [P] task

---

## Notes

- **TDD Strictly Enforced**: Tests must be written and FAIL before implementation
- **Zero Breaking Changes**: All imports must work identically after refactoring
- **Module Size Constraint**: Each module < 200 lines enforced in T014
- **Performance Requirement**: URL sync < 5ms validated in T011
- **Test Coverage**: 158 total tests (43 existing + 75 new + 40 integration)
- **Backward Compatibility**: Verified through existing test suite (T009)

---

**Status**: Tasks ready for execution
**Next Step**: Begin with T001 (Setup & Verification)
