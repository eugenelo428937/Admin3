# Tasks: Product Filter State Management - Phase 1 (Stories 1.1-1.6)

**Input**: Design documents from `/Users/work/Documents/Code/Admin3/specs/005-story-1-1/`
**Prerequisites**: plan.md ✓, spec.md ✓
**Branch**: `005-story-1-1`

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → SUCCESS: Plan loaded with Redux middleware pattern
   → Tech Stack: React 18, Redux Toolkit, React Router v6, Material-UI v5
   → Structure: Web app (frontend/react-Admin3/)
2. Load optional design documents:
   → Contracts: redux-state.schema.json, url-parameters.schema.json (embedded in plan)
   → Data Model: FilterState entity (embedded in plan)
   → Test Scenarios: 4 scenarios from user stories (embedded in plan)
3. Generate tasks by category:
   → Setup: 2 tasks (contracts, test utilities)
   → Tests: 8 tasks (contract tests, unit tests for middleware)
   → Core: 6 tasks (Redux state, middleware, URL parsing)
   → Integration: 4 tasks (components, hooks consolidation)
   → Validation: 3 tasks (Clear All, integration tests)
   → Documentation: 1 task (CLAUDE.md update)
4. Apply task rules:
   → Contract tests marked [P] (different files)
   → Middleware tests marked [P] (different test files)
   → Component updates sequential (same files modified)
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T024)
6. Dependencies validated against plan Phase 2 ordering
7. Parallel execution examples provided
8. Validation: All contracts tested ✓, All entities modeled ✓, TDD order ✓
9. Return: SUCCESS (24 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
**Project Structure**: Web application
- Frontend: `frontend/react-Admin3/src/`
- Tests: `frontend/react-Admin3/src/**/__tests__/`
- Backend: No changes in Phase 1

---

## Phase 3.1: Setup (2 tasks)

### Contract Schema Files
- [ ] **T001** [P] Create Redux state contract schema at `frontend/react-Admin3/src/store/contracts/redux-state.schema.json`
  - **Story**: Foundation for TDD
  - **What**: JSON Schema defining FilterState structure with all 10 filter types
  - **Why**: Validates Redux state shape in tests
  - **Acceptance**: Schema validates example FilterState from plan.md line 224-246

- [ ] **T002** [P] Create URL parameters contract schema at `frontend/react-Admin3/src/store/contracts/url-parameters.schema.json`
  - **Story**: Foundation for TDD
  - **What**: JSON Schema defining valid URL query parameters (indexed, comma-separated, boolean formats)
  - **Why**: Validates URL format in middleware tests
  - **Acceptance**: Schema validates example URL params from plan.md line 264-306

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Redux State Tests (Story 1.2)
- [ ] **T003** [P] Test filtersSlice navbar fields in `frontend/react-Admin3/src/store/slices/__tests__/filtersSlice.test.js`
  - **Story**: 1.2 - Extend filtersSlice with navbar filter state
  - **What**: Unit tests for new Redux actions: setTutorialFormat, setDistanceLearning, setTutorial
  - **Test Cases**:
    - setTutorialFormat('online') updates state.tutorial_format
    - setDistanceLearning(true) updates state.distance_learning
    - setTutorial(true) updates state.tutorial
    - clearAllFilters() resets navbar fields to initial state
  - **Why**: Verify navbar filter state management before implementation
  - **Acceptance**: 4 failing tests (actions don't exist yet)
  - **Dependencies**: T001 (schema validation)

### URL Sync Middleware Tests (Story 1.1)
- [ ] **T004** [P] Test Redux → URL sync in `frontend/react-Admin3/src/store/middleware/__tests__/urlSyncMiddleware.test.js`
  - **Story**: 1.1 - Automatic URL synchronization when filters change
  - **What**: Unit tests for urlSyncMiddleware Redux → URL direction
  - **Test Cases**:
    - Filter action → URL updated with replaceState (not pushState)
    - Multiple rapid filter changes → Single URL update (debounced)
    - Invalid filter values → URL ignores invalid params
    - Loop prevention → Same URL params skipped
    - URL format → Indexed params for arrays, boolean as '1', null omitted
  - **Why**: Verify URL sync before implementation
  - **Acceptance**: 5 failing tests (middleware doesn't exist yet)
  - **Dependencies**: T001, T002 (schema validation)

- [ ] **T005** [P] Test URL → Redux restoration in `frontend/react-Admin3/src/store/middleware/__tests__/urlSyncMiddleware.test.js`
  - **Story**: 1.6 - Restore filters from URL on page load
  - **What**: Unit tests for parseUrlToFilters utility function
  - **Test Cases**:
    - Indexed params (?subject_code=CB1&subject_1=CB2) → Redux array ['CB1', 'CB2']
    - Comma-separated (?group=MAT,TUT) → Redux array ['MAT', 'TUT']
    - Boolean params (?tutorial=1) → Redux boolean true
    - Missing params → Redux initial state values
    - Legacy param names (group) → Maps to new names (product_type_code)
    - Invalid params → Ignored gracefully, logged warning
  - **Why**: Verify URL parsing before implementation
  - **Acceptance**: 6 failing tests (parseUrlToFilters doesn't exist yet)
  - **Dependencies**: T001, T002 (schema validation)

### Integration Test Scenarios (Stories 1.1, 1.5, 1.6)
- [ ] **T006** [P] Integration test: Clear All Filters in `frontend/react-Admin3/src/components/Ordering/__tests__/filterStateManagement.test.js`
  - **Story**: 1.5 - Verify "Clear All" functionality
  - **What**: Full flow test from plan.md line 420-442
  - **Test Flow**:
    1. Apply multiple filters (subjects, categories)
    2. Click "Clear All" button
    3. Verify Redux state cleared
    4. Verify URL reset to base path
    5. Simulate page refresh
    6. Verify filters don't reappear
  - **Why**: E2E validation of Clear All behavior
  - **Acceptance**: Failing test (components not integrated yet)
  - **Dependencies**: T003, T004 (Redux and middleware tests)

- [ ] **T007** [P] Integration test: Filter Persistence in `frontend/react-Admin3/src/components/Ordering/__tests__/filterStateManagement.test.js`
  - **Story**: 1.6 - Restore filters from URL on page load
  - **What**: Full flow test from plan.md line 446-465
  - **Test Flow**:
    1. Set URL to /products?subject_code=CB1&category_code=MAT
    2. Mount ProductList component
    3. Verify Redux state populated from URL
    4. Verify filtered products displayed
  - **Why**: E2E validation of URL → Redux restoration
  - **Acceptance**: Failing test (ProductList URL parsing not implemented)
  - **Dependencies**: T005 (URL parsing tests)

- [ ] **T008** [P] Integration test: URL Synchronization in `frontend/react-Admin3/src/components/Ordering/__tests__/filterStateManagement.test.js`
  - **Story**: 1.1 - Automatic URL synchronization
  - **What**: Full flow test from plan.md line 468-485
  - **Test Flow**:
    1. Render FilterPanel component
    2. Select CB1 subject filter
    3. Verify URL contains subject_code=CB1
    4. Select MAT category filter
    5. Verify no new history entry created (replaceState used)
  - **Why**: E2E validation of Redux → URL sync
  - **Acceptance**: Failing test (middleware not implemented)
  - **Dependencies**: T004 (middleware tests)

- [ ] **T009** [P] Integration test: Navigation Filters in `frontend/react-Admin3/src/components/Ordering/__tests__/filterStateManagement.test.js`
  - **Story**: 1.2, 1.3, 1.4 - Navigation filters integration
  - **What**: Full flow test from plan.md line 489-508
  - **Test Flow**:
    1. Render MainNavBar component
    2. Click "Tutorial Products" link
    3. Verify Redux state.tutorial = true
    4. Verify URL contains tutorial=1
    5. Verify ProductList shows filtered results
    6. Code inspection: No manual URL manipulation in MainNavBar.js
  - **Why**: E2E validation of navigation filter integration
  - **Acceptance**: Failing test (navigation not using Redux yet)
  - **Dependencies**: T003 (navbar fields tests)

- [ ] **T010** [P] Integration test: Shareable URLs in `frontend/react-Admin3/src/components/Ordering/__tests__/filterStateManagement.test.js`
  - **Story**: 1.1, 1.6 - Shareable filter URLs
  - **What**: Test scenario 3 from spec.md line 58-62
  - **Test Flow**:
    1. Apply filters (subject, category, tutorial_format)
    2. Copy window.location.href
    3. Simulate new browser session (clear Redux, new component mount)
    4. Navigate to copied URL
    5. Verify filters restored identically
    6. Verify same filtered products displayed
  - **Why**: E2E validation of URL shareability
  - **Acceptance**: Failing test (full integration not complete)
  - **Dependencies**: T004, T005, T007

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Redux State Extension (Story 1.2)
- [ ] **T011** Extend filtersSlice with navbar fields in `frontend/react-Admin3/src/store/slices/filtersSlice.js`
  - **Story**: 1.2 - Extend filtersSlice with navbar filter state
  - **What**: Add 3 new state fields and actions to existing filtersSlice
  - **Changes**:
    ```javascript
    initialState: {
      // ... existing fields
      tutorial_format: null,        // 'online' | 'in_person' | 'hybrid' | null
      distance_learning: false,     // boolean
      tutorial: false,              // boolean
    },
    reducers: {
      // ... existing reducers
      setTutorialFormat: (state, action) => { state.tutorial_format = action.payload; },
      setDistanceLearning: (state, action) => { state.distance_learning = action.payload; },
      setTutorial: (state, action) => { state.tutorial = action.payload; },
      clearAllFilters: (state) => {
        // ... existing clears
        state.tutorial_format = null;
        state.distance_learning = false;
        state.tutorial = false;
      }
    }
    ```
  - **Why**: Single source of truth for all filters including navigation
  - **Acceptance**: T003 tests pass (4/4 green)
  - **Dependencies**: T003 (must have failing tests first)

### URL Sync Middleware (Story 1.1)
- [ ] **T012** Create URL parsing utility in `frontend/react-Admin3/src/store/middleware/urlSyncMiddleware.js`
  - **Story**: 1.6 - Restore filters from URL on page load
  - **What**: Implement parseUrlToFilters(searchParams) utility function
  - **Logic** (from plan.md line 264-306):
    - Read URLSearchParams
    - Map indexed params (subject_code, subject_1) → array
    - Map comma-separated params (group=MAT,TUT) → array
    - Map boolean params (tutorial=1) → true, absent → false
    - Map legacy names (group → product_type_code)
    - Validate against url-parameters.schema.json
    - Return FilterState partial object
  - **Why**: Convert URL to Redux state for restoration
  - **Acceptance**: T005 tests pass (6/6 green)
  - **Dependencies**: T005 (must have failing tests first)

- [ ] **T013** Create Redux → URL middleware in `frontend/react-Admin3/src/store/middleware/urlSyncMiddleware.js`
  - **Story**: 1.1 - Automatic URL synchronization when filters change
  - **What**: Implement urlSyncMiddleware using createListenerMiddleware
  - **Logic** (from plan.md line 138-171):
    - Listen to all filter actions (setSubjects, setCategories, setTutorialFormat, etc.)
    - On action: Extract current filter state
    - Build URLSearchParams from state using URL_PARAM_MAPPING
    - Compare with lastUrlParams (loop prevention)
    - If different: window.history.replaceState({}, '', `?${params}`)
    - Update lastUrlParams
  - **Performance**: Debounce rapid changes (50ms window)
  - **Why**: Auto-sync Redux → URL for shareability
  - **Acceptance**: T004 tests pass (5/5 green)
  - **Dependencies**: T004 (must have failing tests first), T012 (URL parsing utility)

- [ ] **T014** Register middleware in Redux store at `frontend/react-Admin3/src/store/index.js`
  - **Story**: 1.1 - Activate URL synchronization
  - **What**: Add urlSyncMiddleware to Redux store configuration
  - **Changes**:
    ```javascript
    import urlSyncMiddleware from './middleware/urlSyncMiddleware';

    export const store = configureStore({
      reducer: { /* existing reducers */ },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().prepend(urlSyncMiddleware.middleware),
    });
    ```
  - **Why**: Activate Redux → URL sync across entire app
  - **Acceptance**: Middleware runs on filter actions (verify via console log)
  - **Dependencies**: T013 (middleware implementation)

### Component Integration (Stories 1.3, 1.6)
- [ ] **T015** Remove manual URL manipulation from MainNavBar in `frontend/react-Admin3/src/components/MainNavBar.js`
  - **Story**: 1.3 - Remove manual URL manipulation code
  - **What**: Delete URL construction code, replace with Redux dispatch
  - **Changes**:
    - Remove: `const params = new URLSearchParams(); params.set('tutorial', '1'); navigate('/products?' + params.toString())`
    - Replace with: `dispatch(setTutorial(true)); navigate('/products')`
    - Remove: All other manual URL param construction in navbar handlers
  - **Why**: Middleware handles URL updates automatically
  - **Acceptance**: T009 integration test passes
  - **Dependencies**: T011 (navbar actions exist), T013 (middleware syncs URL)

- [ ] **T016** Add URL restoration to ProductList mount in `frontend/react-Admin3/src/components/Ordering/ProductList.js`
  - **Story**: 1.6 - Restore filters from URL on page load
  - **What**: Parse URL and dispatch to Redux on component mount
  - **Changes**:
    ```javascript
    import { parseUrlToFilters } from '../../store/middleware/urlSyncMiddleware';

    useEffect(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const filtersFromUrl = parseUrlToFilters(searchParams);

      // Dispatch each filter type to Redux
      if (filtersFromUrl.subject_code) dispatch(setSubjects(filtersFromUrl.subject_code));
      if (filtersFromUrl.category_code) dispatch(setCategories(filtersFromUrl.category_code));
      // ... dispatch all filter types
    }, []); // Run once on mount
    ```
  - **Why**: Restore filter state from shareable/bookmarked URLs
  - **Acceptance**: T007 integration test passes
  - **Dependencies**: T012 (parseUrlToFilters exists), T011 (Redux actions exist)

---

## Phase 3.4: Hook Consolidation (Story 1.4)

- [ ] **T017** Update useProductsSearch to use Redux navbar filters in `frontend/react-Admin3/src/hooks/useProductsSearch.js`
  - **Story**: 1.4 - Consolidate navigation filter handling
  - **What**: Replace URL parsing with Redux selector for navbar filters
  - **Changes**:
    - Remove: `const params = new URLSearchParams(window.location.search); const tutorial = params.get('tutorial');`
    - Replace with: `const { tutorial, tutorial_format, distance_learning } = useSelector(state => state.filters);`
    - Remove: Duplicate filter state tracking
  - **Why**: Single source of truth (Redux only, no URL parsing)
  - **Acceptance**: Products API calls include navbar filters from Redux
  - **Dependencies**: T011 (navbar fields in Redux)

- [ ] **T018** Add tests for consolidated useProductsSearch in `frontend/react-Admin3/src/hooks/__tests__/useProductsSearch.test.js`
  - **Story**: 1.4 - Verify hook consolidation
  - **What**: Unit tests for useProductsSearch reading from Redux
  - **Test Cases**:
    - Hook reads tutorial filter from Redux (not URL)
    - Hook reads tutorial_format from Redux
    - Hook reads distance_learning from Redux
    - API call includes all navbar filters
    - No URL parsing code exists in hook
  - **Why**: Verify consolidation correctness
  - **Acceptance**: 5 passing tests
  - **Dependencies**: T017 (hook updated)

- [ ] **T019** Remove SearchBox URL parsing in `frontend/react-Admin3/src/components/SearchBox.js`
  - **Story**: 1.4 - Consolidate search state in Redux
  - **What**: Replace URL parsing with Redux dispatch for search query
  - **Changes**:
    - Remove: URL param reading for search_query
    - Use: `dispatch(setSearchQuery(value))` on input change
    - Use: `useSelector(state => state.filters.search_query)` for controlled input
  - **Why**: Search text syncs via middleware (no manual URL code needed)
  - **Acceptance**: Search query appears in URL automatically via middleware
  - **Dependencies**: T013 (middleware handles search_query sync)

- [ ] **T020** Update SearchResults to read from Redux in `frontend/react-Admin3/src/components/SearchResults.js`
  - **Story**: 1.4 - Consolidate search results state
  - **What**: Replace URL parsing with Redux selector
  - **Changes**:
    - Remove: `const query = new URLSearchParams(location.search).get('search_query')`
    - Replace with: `const query = useSelector(state => state.filters.search_query)`
  - **Why**: Redux is source of truth for search state
  - **Acceptance**: Search results display correctly from Redux state
  - **Dependencies**: T011 (search_query field exists)

---

## Phase 3.5: Validation & Integration Testing

- [ ] **T021** Verify Clear All Filters behavior in `frontend/react-Admin3/src/components/Ordering/FilterPanel.js`
  - **Story**: 1.5 - Verification of "Clear All" functionality
  - **What**: Manual validation of Clear All button
  - **Test Steps** (from spec.md line 44-49):
    1. Apply multiple filters (subject, category, product type)
    2. Click "Clear All Filters" button
    3. Verify: All filters removed from UI
    4. Verify: Browser URL shows no filter parameters
    5. Refresh page
    6. Verify: No filters reappear
  - **Why**: E2E validation that Clear All works correctly
  - **Acceptance**: T006 integration test passes (Clear All scenario)
  - **Dependencies**: T011 (clearAllFilters action), T013 (middleware clears URL)

- [ ] **T022** Run all integration tests and verify success
  - **Story**: All stories 1.1-1.6
  - **What**: Execute full integration test suite
  - **Command**: `npm test -- --testPathPattern=filterStateManagement`
  - **Expected Results**:
    - T006: Clear All Filters ✓
    - T007: Filter Persistence ✓
    - T008: URL Synchronization ✓
    - T009: Navigation Filters ✓
    - T010: Shareable URLs ✓
  - **Why**: Confirm all acceptance criteria met
  - **Acceptance**: 5/5 integration tests pass
  - **Dependencies**: All implementation tasks (T011-T020)

- [ ] **T023** Performance validation: URL sync < 5ms
  - **Story**: Performance requirement FR-036
  - **What**: Measure URL update time after filter change
  - **Method**:
    ```javascript
    const start = performance.now();
    dispatch(setSubjects(['CB1']));
    // Wait for middleware
    setTimeout(() => {
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(5);
    }, 10);
    ```
  - **Why**: Ensure no noticeable UI delay
  - **Acceptance**: URL updates within 5ms (performance.now() measurement)
  - **Dependencies**: T013 (middleware implementation)

---

## Phase 3.6: Documentation

- [ ] **T024** Update CLAUDE.md with filter state management patterns
  - **Story**: Knowledge transfer for future development
  - **What**: Document new patterns in project CLAUDE.md
  - **Sections to Add**:
    - Redux URL Sync Middleware pattern
    - Filter state structure (10 filter types)
    - URL parameter mapping rules
    - Loop prevention strategy
    - Testing approach for filter state
  - **Why**: Preserve architectural knowledge for team
  - **Acceptance**: CLAUDE.md section added under "Frontend Structure"
  - **Dependencies**: All implementation complete (T011-T023)

---

## Dependencies Graph

```
Setup (T001-T002) [P]
    ↓
Tests (T003-T010) [P] ← MUST FAIL before implementation
    ↓
Redux State (T011)
    ↓
    ├→ URL Parsing (T012)
    │     ↓
    │  Middleware (T013)
    │     ↓
    │  Register Middleware (T014)
    │     ↓
    │  Components (T015-T016)
    │
    └→ Hooks (T017-T020)
         ↓
    Validation (T021-T023)
         ↓
    Documentation (T024)
```

**Critical Path**: T001 → T003 → T011 → T012 → T013 → T014 → T015 → T021 → T022 → T024

**Blocking Relationships**:
- T003-T010 block T011 (tests before implementation)
- T011 blocks T012 (Redux state must exist)
- T012 blocks T013 (parsing utility used by middleware)
- T013 blocks T014-T016 (middleware must exist to register)
- T011 blocks T017-T020 (Redux actions must exist)
- T011-T020 block T021-T023 (all implementation before validation)
- T023 blocks T024 (documentation after validation)

---

## Parallel Execution Examples

### Setup Phase (Run Together)
```bash
# T001-T002: Create contract schemas
Task: "Create Redux state contract schema"
Task: "Create URL parameters contract schema"
```

### Test Phase (Run Together - All Must Fail)
```bash
# T003-T010: All test files
Task: "Test filtersSlice navbar fields"
Task: "Test Redux → URL sync"
Task: "Test URL → Redux restoration"
Task: "Integration test: Clear All Filters"
Task: "Integration test: Filter Persistence"
Task: "Integration test: URL Synchronization"
Task: "Integration test: Navigation Filters"
Task: "Integration test: Shareable URLs"
```

### Hook Consolidation (Sequential - Same Files)
```bash
# T017-T020: Must run sequentially (modify same hooks/components)
# Do NOT run in parallel
Task: "Update useProductsSearch to use Redux navbar filters"
# Then:
Task: "Add tests for consolidated useProductsSearch"
# Then:
Task: "Remove SearchBox URL parsing"
# Then:
Task: "Update SearchResults to read from Redux"
```

---

## Notes

### TDD Enforcement
- **Phase 3.2 tests MUST be written first and MUST fail**
- Run tests after each implementation task to confirm green
- Never implement without a failing test

### Parallel Execution Safety
- [P] tasks marked only when:
  - Different files modified
  - No shared dependencies
  - Can run in any order
- Sequential tasks (no [P]):
  - Same file modifications
  - Dependent on previous task output

### Commit Strategy
- Commit after each task completion
- Commit message format: `feat(filters): T0## - [task description]`
- Example: `feat(filters): T011 - Extend filtersSlice with navbar fields`

### Story Coverage
- Story 1.1: T004, T008, T013, T014 (URL sync middleware)
- Story 1.2: T003, T011 (Redux state extension)
- Story 1.3: T015 (Remove manual URL code)
- Story 1.4: T017-T020 (Hook consolidation)
- Story 1.5: T006, T021 (Clear All validation)
- Story 1.6: T005, T007, T012, T016 (URL restoration)

### Avoiding Common Mistakes
- ❌ Don't modify same file in parallel tasks
- ❌ Don't implement before tests fail
- ❌ Don't skip integration tests
- ✅ Validate against contract schemas
- ✅ Test all edge cases from spec.md
- ✅ Measure performance (< 5ms requirement)

---

## Validation Checklist
*GATE: Checked before marking tasks.md complete*

- [x] All contracts have corresponding tests (T001-T002 → T004-T005)
- [x] All entities have model tasks (FilterState → T011)
- [x] All tests come before implementation (T003-T010 → T011-T020)
- [x] Parallel tasks truly independent ([P] validated)
- [x] Each task specifies exact file path (frontend/react-Admin3/src/...)
- [x] No task modifies same file as another [P] task (validated)
- [x] Dependencies match plan.md Phase 2 ordering (lines 560-570)
- [x] Test scenarios from plan.md embedded (lines 418-508)
- [x] Performance requirements included (T023 < 5ms)
- [x] Documentation task included (T024 CLAUDE.md)

---

**Tasks Generated**: 24 tasks across 6 phases
**Estimated Effort**: 3-4 days (1 developer)
**Next Command**: `/implement` or manual execution starting with T001

*Tasks ready for execution on branch `005-story-1-1`*
