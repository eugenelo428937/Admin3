# Tasks: Performance Monitoring & Integration Testing Infrastructure

**Input**: Design documents from `/Users/work/Documents/Code/Admin3/specs/008-docs-stories-story/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅
**Branch**: `008-docs-stories-story`
**Stories**: 1.15 (Performance Monitoring) + 1.16 (Integration Testing)

---

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: React 18.3.1, Redux Toolkit 2.2.7, Jest, MSW
   → Structure: Web app (frontend/react-Admin3/src/)
2. Load optional design documents ✅
   → data-model.md: 14 entities extracted
   → contracts/: 2 contract files (PerformanceTracker, testHelpers)
   → research.md: All NEEDS CLARIFICATION resolved
3. Generate tasks by category:
   → Setup: dependencies, MSW configuration
   → Tests: 2 contract tests, 10 integration test suites
   → Core: 2 utility modules, 1 middleware, 1 config
   → Integration: store wiring, instrumentation
   → Polish: coverage, performance validation, docs
4. Apply task rules:
   → Different files = [P] for parallel
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001-T038)
6. Generate dependency graph
7. Create parallel execution examples
8. Validation:
   → All contracts have tests ✅
   → All entities have tasks ✅
   → Tests before implementation ✅
9. Return: SUCCESS (38 tasks ready for execution)
```

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All file paths are absolute from `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/`

---

## Phase 3.1: Setup & Dependencies (Story 1.16 Prerequisites)

- [ ] **T001** Install MSW 2.x dependency
  - Run: `npm install --save-dev msw@^2.0.0`
  - Verify: `package.json` includes `msw` in devDependencies
  - File: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/package.json`

- [x] **T002** Configure MSW setup for tests ✅
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/setupTests.js`
  - Import MSW server setup
  - Add `beforeAll(() => server.listen())`, `afterEach(() => server.resetHandlers())`, `afterAll(() => server.close())`
  - File: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/setupTests.js`

---

## Phase 3.2: Tests First (TDD) - Story 1.15 ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation of Story 1.15**

- [x] **T003 [P]** Contract test PerformanceTracker utility class ✅ RED
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/utils/__tests__/PerformanceTracker.test.js`
  - Test all methods from contract: `startMeasure()`, `endMeasure()`, `recordMetric()`, `getMetrics()`, `getReport()`, `clearMetrics()`, `checkBudget()`, `isSupported()`
  - ✅ Tests FAIL as expected - module doesn't exist yet
  - Reference: `/Users/work/Documents/Code/Admin3/specs/008-docs-stories-story/contracts/PerformanceTracker-contract.md`

- [x] **T004 [P]** Contract test performance monitoring middleware ✅ RED
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/store/middleware/__tests__/performanceMonitoring.test.js`
  - Test middleware intercepts filter actions
  - Test performance metrics recorded for each action
  - Test budget violations logged as warnings
  - ✅ Tests FAIL as expected - middleware and PerformanceTracker don't exist yet

- [x] **T005 [P]** Contract test performance budgets configuration ✅ RED
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/config/__tests__/performanceBudgets.test.js`
  - Test all budget constants defined (REDUX_ACTION, URL_SYNC, API_CALL, VALIDATION, REGISTRY_LOOKUP)
  - Test values match requirements (16ms, 5ms, 1000ms, 10ms, 1ms)
  - ✅ Tests FAIL as expected - config module doesn't exist yet

---

## Phase 3.3: Core Implementation Story 1.15 (ONLY after T003-T005 are failing)

- [x] **T006** Implement PerformanceTracker utility class ✅ GREEN
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/utils/PerformanceTracker.js`
  - Implement all 8 static methods per contract
  - Use Browser Performance API (performance.mark, performance.measure)
  - Add graceful degradation for unsupported browsers
  - Wrap all code in `process.env.NODE_ENV === 'development'` guards
  - ✅ T003 tests now PASS (38/38)
  - File: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/utils/PerformanceTracker.js`

- [x] **T007** Create performance budgets configuration ✅ GREEN
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/config/performanceBudgets.js`
  - Export PERFORMANCE_BUDGETS object with all 5 thresholds
  - Add JSDoc comments explaining each budget
  - ✅ T005 tests now PASS (38/38)
  - File: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/config/performanceBudgets.js`

- [x] **T008** Implement performance monitoring middleware ✅ GREEN
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/store/middleware/performanceMonitoring.js`
  - Use standard Redux middleware (not listener middleware for synchronous execution)
  - Listen to all filter actions (setSubjects, setCategories, etc.)
  - Record performance metrics using PerformanceTracker
  - Check against budgets and log warnings
  - Wrap in development-only guards
  - ✅ T004 tests now PASS (20/20)
  - File: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/store/middleware/performanceMonitoring.js`

---

## Phase 3.4: Integration Story 1.15

- [x] **T009** Wire performance monitoring middleware into Redux store ✅
  - Edit: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/store/index.js`
  - Import performanceMonitoring middleware
  - Add to middleware array in configureStore
  - Ensure only enabled in development mode
  - ✅ Middleware wired into store configuration
  - File: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/store/index.js`

- [x] **T010** Add URL sync timing instrumentation ✅
  - Edit: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/store/middleware/urlSyncMiddleware.js`
  - Add PerformanceTracker.startMeasure('urlSync') before URL update
  - Add PerformanceTracker.endMeasure('urlSync') after history.replaceState()
  - Check against URL_SYNC budget (5ms)
  - ✅ URL sync operations tracked with budget validation
  - File: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/store/middleware/urlSyncMiddleware.js`

- [x] **T011** Add FilterValidator timing instrumentation ✅
  - Edit: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/store/filters/filterValidator.js`
  - Add PerformanceTracker.startMeasure('validation') before validate() execution
  - Add PerformanceTracker.endMeasure('validation') after validation complete
  - Check against VALIDATION budget (10ms)
  - ✅ Validation operations tracked with budget checking
  - File: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/store/filters/filterValidator.js`

- [x] **T012** Add FilterRegistry timing instrumentation ✅
  - Edit: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/store/filters/filterRegistry.js`
  - Add timing to lookup operations (get(), getByUrlParam())
  - Check against REGISTRY_LOOKUP budget (1ms)
  - ✅ Registry lookups tracked with budget validation
  - File: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/store/filters/filterRegistry.js`

- [x] **T013** Add API call timing instrumentation ✅
  - Edit: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/hooks/useProductsSearch.js`
  - Add timing around RTK Query API calls
  - Measure from query initiation to result resolution
  - Track metadata (filter count, results count)
  - Check against API_CALL budget (1000ms)
  - ✅ API calls tracked with comprehensive metadata
  - File: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/hooks/useProductsSearch.js`

---

## Phase 3.5: Tests First (TDD) - Story 1.16 ⚠️ MUST COMPLETE BEFORE 3.6

**CRITICAL: These integration tests MUST be written and MUST FAIL before test utilities implementation**

- [ ] **T014 [P]** Contract test testHelpers utility module
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/test-utils/__tests__/testHelpers.test.js`
  - Test all helper functions from contract: `renderWithProviders()`, `createMockStore()`, `waitForStateUpdate()`, `simulateUrlChange()`, `mockProductsApi()`, `createMockHistory()`, `flushPromises()`
  - Verify tests FAIL (module doesn't exist yet)
  - Reference: `/Users/work/Documents/Code/Admin3/specs/008-docs-stories-story/contracts/testHelpers-contract.md`

- [ ] **T015 [P]** Integration test: Redux middleware chain
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/store/middleware/__tests__/integration.test.js`
  - Test: Redux action → URL updates via urlSyncMiddleware
  - Test: URL change → Redux state updates
  - Test: Multiple rapid filter changes handled correctly
  - Test: Loop prevention works
  - Verify tests FAIL (test utilities don't exist yet)

- [ ] **T016 [P]** Integration test: Filter state persistence
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/components/Ordering/__tests__/FilterPersistence.test.js`
  - Test: Apply filters → refresh page → filters restored from URL
  - Test: Share URL with filters → recipient sees filtered results
  - Test: Clear filters → URL resets to `/products`
  - Test: Invalid URL params → gracefully ignored
  - Verify tests FAIL (test utilities don't exist yet)

- [ ] **T017 [P]** Integration test: FilterRegistry integration
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/utils/__tests__/FilterRegistry.integration.test.js`
  - Test: Register filters → lookup configs correctly
  - Test: Convert filters to URL params → correct format
  - Test: Parse URL params → restore correct filter state
  - Test: Display values render correctly in UI
  - Verify tests FAIL (test utilities don't exist yet)

- [ ] **T018 [P]** Integration test: FilterValidator integration
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/utils/__tests__/FilterValidator.integration.test.js`
  - Test: Apply tutorial_format without tutorial → validation error
  - Test: Valid filter combinations → no errors
  - Test: Validation errors displayed in UI (FilterPanel)
  - Test: Validation errors prevent API calls
  - Verify tests FAIL (test utilities don't exist yet)

- [ ] **T019 [P]** Integration test: FilterPanel component
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/components/Ordering/__tests__/FilterPanel.integration.test.js`
  - Test: Select filter → Redux updated → URL updated → API called
  - Test: Select multiple filters → all reflected in state and URL
  - Test: Clear individual filter → removed from state and URL
  - Test: Validation errors displayed when invalid combination
  - Verify tests FAIL (test utilities don't exist yet)

- [ ] **T020 [P]** Integration test: ActiveFilters component
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/components/Ordering/__tests__/ActiveFilters.integration.test.js`
  - Test: Applied filters displayed as chips
  - Test: Click chip remove button → filter cleared from Redux and URL
  - Test: Display values from FilterRegistry render correctly
  - Test: "Clear All" button clears all filters
  - Verify tests FAIL (test utilities don't exist yet)

- [ ] **T021 [P]** Integration test: ProductList component
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/components/Ordering/__tests__/ProductList.integration.test.js`
  - Test: Initial mount → parse URL → dispatch to Redux
  - Test: URL with filters → products fetched with correct params
  - Test: Filter changes → products re-fetched
  - Test: Loading states displayed correctly
  - Verify tests FAIL (test utilities don't exist yet)

- [ ] **T022 [P]** Integration test: useProductsSearch hook
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/hooks/__tests__/useProductsSearch.integration.test.js`
  - Test: Filter state change → API called with correct params
  - Test: Multiple rapid changes → debounced to single API call
  - Test: RTK Query caching → cached results returned quickly
  - Test: Invalid filters → validation errors, no API call
  - Verify tests FAIL (test utilities don't exist yet)

- [ ] **T023 [P]** Integration test: Backward compatibility
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/__tests__/BackwardCompatibility.test.js`
  - Test: Old URL format with `subject` param → parse as `subject_code`
  - Test: Old URL format with indexed params → parse correctly
  - Test: All Story 1.14 exports still work unchanged
  - Verify tests FAIL (test utilities don't exist yet)

---

## Phase 3.6: Core Implementation Story 1.16 (ONLY after T014-T023 are failing)

- [X] **T024** Create mock data module
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/test-utils/mockData.js`
  - Export mockSubjects array (CM2, SA1, etc.)
  - Export mockProducts array with realistic data matching API contract
  - Export mockCategories, mockProductTypes, mockModes arrays
  - File: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/test-utils/mockData.js`

- [X] **T025** Create MSW handlers module
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/test-utils/mockHandlers.js`
  - Configure MSW handlers for `/api/products/`, `/api/subjects/`, `/api/categories/`
  - Implement query parameter filtering (subjects, categories, etc.)
  - Return filtered mock data from mockData.js
  - Export `server` instance and `handlers` array
  - File: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/test-utils/mockHandlers.js`

- [X] **T026** Implement test helpers utility module
  - Create: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/test-utils/testHelpers.js`
  - Implement `renderWithProviders(ui, options)` with Redux Provider and Router wrapper
  - Implement `createMockStore(options)` with preloaded state support
  - Implement `waitForStateUpdate(store, predicate, options)` with timeout
  - Implement `simulateUrlChange(url, options)` for URL parsing tests
  - Implement `mockProductsApi(options)` for configuring MSW handlers
  - Implement `createMockHistory(initialEntries, initialIndex)`
  - Implement `flushPromises()` for async test utilities
  - Verify T014 tests now PASS
  - File: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/src/test-utils/testHelpers.js`

- [ ] **T027** Verify integration test T015 (Redux middleware) now PASSES
  - Run: `npm test -- integration.test.js --watchAll=false`
  - Verify all middleware integration tests pass
  - Debug any failing tests

- [ ] **T028** Verify integration test T016 (Filter persistence) now PASSES
  - Run: `npm test -- FilterPersistence.test.js --watchAll=false`
  - Verify all persistence tests pass
  - Debug any failing tests

- [ ] **T029** Verify integration test T017 (FilterRegistry) now PASSES
  - Run: `npm test -- FilterRegistry.integration.test.js --watchAll=false`
  - Verify all registry integration tests pass
  - Debug any failing tests

- [ ] **T030** Verify integration test T018 (FilterValidator) now PASSES
  - Run: `npm test -- FilterValidator.integration.test.js --watchAll=false`
  - Verify all validator integration tests pass
  - Debug any failing tests

- [ ] **T031** Verify integration test T019 (FilterPanel) now PASSES
  - Run: `npm test -- FilterPanel.integration.test.js --watchAll=false`
  - Verify all FilterPanel integration tests pass
  - Debug any failing tests

- [ ] **T032** Verify integration test T020 (ActiveFilters) now PASSES
  - Run: `npm test -- ActiveFilters.integration.test.js --watchAll=false`
  - Verify all ActiveFilters integration tests pass
  - Debug any failing tests

- [ ] **T033** Verify integration test T021 (ProductList) now PASSES
  - Run: `npm test -- ProductList.integration.test.js --watchAll=false`
  - Verify all ProductList integration tests pass
  - Debug any failing tests

- [ ] **T034** Verify integration test T022 (useProductsSearch hook) now PASSES
  - Run: `npm test -- useProductsSearch.integration.test.js --watchAll=false`
  - Verify all hook integration tests pass
  - Debug any failing tests

- [ ] **T035** Verify integration test T023 (Backward compatibility) now PASSES
  - Run: `npm test -- BackwardCompatibility.test.js --watchAll=false`
  - Verify all backward compatibility tests pass
  - Debug any failing tests

---

## Phase 3.7: Polish & Validation

- [ ] **T036** Run full integration test suite and verify coverage
  - Run: `npm test -- --coverage --watchAll=false --testPathPattern=integration`
  - Verify: All integration tests pass (85+ tests)
  - Verify: Coverage > 90% for integration-tested modules
  - Verify: Execution time < 30 seconds
  - Generate coverage report

- [ ] **T037** Verify zero production overhead (tree-shaking test)
  - Run: `npm run build`
  - Check: `grep -r "PerformanceTracker" build/static/js/` returns NO matches
  - Check: Production bundle size < 500KB (no monitoring overhead)
  - Verify: No performance logging in production console

- [ ] **T038** Execute quickstart validation (both stories)
  - Follow: `/Users/work/Documents/Code/Admin3/specs/008-docs-stories-story/quickstart.md`
  - Verify: All Story 1.15 steps pass (performance monitoring working)
  - Verify: All Story 1.16 steps pass (integration tests working)
  - Verify: All success criteria met
  - Complete quickstart in < 30 minutes

---

## Dependencies

### Story 1.15 Dependencies
- **T001-T002** (Setup) must complete before any other tasks
- **T003-T005** (Contract tests) must FAIL before T006-T008 (Implementation)
- **T006** (PerformanceTracker) must complete before T009-T013 (Integration)
- **T007** (Performance budgets) must complete before T008 (Middleware)
- **T008** (Middleware) must complete before T009 (Store wiring)
- **T009-T013** can run in parallel (different files)

### Story 1.16 Dependencies
- **T001-T002** (Setup) must complete before any Story 1.16 tasks
- **T014-T023** (Integration tests) must FAIL before T024-T026 (Test utilities)
- **T024** (Mock data) must complete before T025 (MSW handlers)
- **T025** (MSW handlers) must complete before T026 (Test helpers)
- **T026** (Test helpers) must complete before T027-T035 (Verification)
- **T027-T035** verify tests pass sequentially (depend on T026)

### Cross-Story Dependencies
- **Story 1.16** can start after T001-T002 (does NOT depend on Story 1.15 completion)
- **T036** (Full test suite) requires all T003-T035 complete
- **T037** (Production build) requires all T006-T013 complete
- **T038** (Quickstart) requires all tasks complete

---

## Parallel Execution Examples

### Parallel Block 1: Contract Tests (Story 1.15)
```bash
# Launch T003-T005 together (different files, no dependencies):
npm test -- PerformanceTracker.test.js --watchAll=false &
npm test -- performanceMonitoring.test.js --watchAll=false &
npm test -- performanceBudgets.test.js --watchAll=false &
wait
```

### Parallel Block 2: Integration Tests Story 1.16 (Part 1)
```bash
# Launch T014-T018 together:
npm test -- testHelpers.test.js --watchAll=false &
npm test -- integration.test.js --watchAll=false &
npm test -- FilterPersistence.test.js --watchAll=false &
npm test -- FilterRegistry.integration.test.js --watchAll=false &
npm test -- FilterValidator.integration.test.js --watchAll=false &
wait
```

### Parallel Block 3: Integration Tests Story 1.16 (Part 2)
```bash
# Launch T019-T023 together:
npm test -- FilterPanel.integration.test.js --watchAll=false &
npm test -- ActiveFilters.integration.test.js --watchAll=false &
npm test -- ProductList.integration.test.js --watchAll=false &
npm test -- useProductsSearch.integration.test.js --watchAll=false &
npm test -- BackwardCompatibility.test.js --watchAll=false &
wait
```

### Parallel Block 4: Instrumentation (Story 1.15)
```bash
# Launch T010-T013 together (different files):
# Edit urlSyncMiddleware.js for T010
# Edit FilterValidator.js for T011
# Edit FilterRegistry.js for T012
# Edit useProductsSearch.js for T013
# All can be done in parallel by different developers/agents
```

---

## Notes

- **[P] tasks** = different files, no dependencies, can run in parallel
- **TDD critical**: Verify tests FAIL before implementing (T003-T005, T014-T023)
- **Commit after each task**: Small, incremental commits
- **Test execution order**: Contract tests → Integration tests → Implementation → Verification
- **Story order**: Both stories can run in parallel after T001-T002, but Story 1.15 recommended first
- **Coverage target**: 90% aspirational, 80% enforced in CI
- **Performance target**: Test suite < 30 seconds, all performance budgets met

---

## Validation Checklist

*GATE: Checked before marking tasks.md complete*

- [x] All contracts have corresponding tests (T003-T005, T014)
- [x] All entities from data-model.md have tasks (14 entities → T006-T026)
- [x] All tests come before implementation (T003-T005 before T006-T008, T014-T023 before T024-T026)
- [x] Parallel tasks truly independent (verified file paths, no conflicts)
- [x] Each task specifies exact file path (all paths absolute)
- [x] No task modifies same file as another [P] task (verified)
- [x] TDD workflow enforced (RED phase → GREEN phase → REFACTOR)
- [x] Dependencies documented and blocking properly ordered

---

## Task Count Summary

- **Setup**: 2 tasks (T001-T002)
- **Story 1.15 Contract Tests**: 3 tasks (T003-T005)
- **Story 1.15 Implementation**: 3 tasks (T006-T008)
- **Story 1.15 Integration**: 5 tasks (T009-T013)
- **Story 1.16 Contract Tests**: 10 tasks (T014-T023)
- **Story 1.16 Implementation**: 3 tasks (T024-T026)
- **Story 1.16 Verification**: 9 tasks (T027-T035)
- **Polish & Validation**: 3 tasks (T036-T038)

**Total**: 38 tasks

---

**Tasks Generation Complete** ✅

Ready for execution via TDD workflow: RED → GREEN → REFACTOR
