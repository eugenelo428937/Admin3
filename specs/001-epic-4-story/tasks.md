# Tasks: Fix Cart Synchronization Issue

**Status**: ✅ **INVESTIGATION COMPLETE - BUG ALREADY FIXED**
**Findings**: See `investigation-findings.md` for full details

**Input**: Design documents from `/specs/001-epic-4-story/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

---

## 🎯 Investigation Summary

**Date**: 2025-10-26
**Conclusion**: The reported cart synchronization bug (second tutorial overwrites first) **no longer reproduces**. Story 1 work likely fixed the underlying issue.

**Evidence**:
- T001 ✅ Added debug logging to trace state flow
- T002 ✅ Executed bug reproduction scenario
- **Result**: Both tutorials correctly added to cart (expected behavior)

**Tasks Status**:
- ✅ T001: Debug logging added
- ✅ T002: Bug reproduction test (bug NOT reproducing)
- ✅ T021: Debug logging removed
- ⏭️ T003-T020: **SKIPPED** (no implementation needed)
- 📋 T024-T026: **OPTIONAL** (validation testing recommended)

**See**: `investigation-findings.md` for full analysis

---

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Tech stack: React 18, Django 5.1, Context API, Material-UI, localStorage
   → Structure: Web app (frontend/react-Admin3/, backend/django_Admin3/)
2. Load optional design documents ✓
   → data-model.md: TutorialChoice, CartItem, OperationSnapshot
   → contracts/: tutorial-choice-context.contract.md, cart-context.contract.md
   → research.md: Atomic operations, debounced localStorage, snapshot rollback
   → quickstart.md: 5 test scenarios
3. Generate tasks by category:
   → Investigation: Debug logging, bug reproduction
   → Tests: 15 contract tests, 5 integration tests (TDD RED)
   → Core: Atomic state updates, localStorage debouncing, rollback
   → Polish: Remove logging, refactor, cross-browser testing
4. Apply task rules:
   → Different test files = [P] for parallel
   → Implementation tasks sequential (shared files)
   → Tests before implementation (TDD mandatory)
5. Number tasks sequentially (T001-T020)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness ✓
   → All contracts have tests ✓
   → All integration scenarios covered ✓
   → TDD ordering enforced ✓
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Frontend**: `frontend/react-Admin3/src/`
- **Backend**: `backend/django_Admin3/`
- **Tests**: `frontend/react-Admin3/src/__tests__/`

---

## Phase 3.1: Investigation (Root Cause Analysis)

### T001: ✅ Add Debug Logging to State Flow
**File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js`
**Description**: Add temporary debug logging to trace handleAddToCart state flow
**Actions**:
- Add console.log statements at key points in handleAddToCart function (lines 114-171)
- Log: entry point, getSubjectChoices call, existingCartItem detection, API call type, markChoicesAsAdded call
- Include timestamps in all log entries
- Add similar logging to TutorialChoiceContext.addTutorialChoice (lines 54-85 in contexts/TutorialChoiceContext.js)
- Add similar logging to CartContext.addToCart and updateCartItem methods
**Success Criteria**: Console logs show timestamp sequence for multi-tutorial workflow

### T002: ⚠️ Reproduce Bug with Logging Enabled [USER ACTION REQUIRED]
**File**: Manual test execution following quickstart.md
**Description**: Execute Scenario 1 from quickstart.md with debug logging active
**Status**: **BLOCKED - Requires user to manually test in browser**

**USER INSTRUCTIONS**:
1. Start backend server: `cd backend/django_Admin3 && python manage.py runserver 8888`
2. Start frontend server: `cd frontend/react-Admin3 && npm start`
3. Open browser to http://localhost:3000
4. Open DevTools Console (F12 → Console tab)
5. Navigate to CS1 product page
6. **Execute Scenario 1 from quickstart.md**:
   - Add CS1-30-25S (Edinburgh) via dialog
   - Immediately add CS1-20-25S (London) via dialog
   - Click "Add to Cart" on summary bar
   - Open cart panel
7. **Capture console logs** - Look for:
   - `[DIALOG]` logs from selection dialog
   - `[CONTEXT]` logs from TutorialChoiceContext
   - `[CONTAINER]` logs from handleAddToCart
   - `[CART CONTEXT]` logs from cart operations
8. **Document observations**:
   - Which tutorial(s) appear in cart? (Expected: BOTH, Actual: ???)
   - What's the timestamp sequence?
   - Does existingCartItem detection show UPDATE or ADD?
   - Do both tutorials make it through to the API call?

**Expected Root Cause** (from story hypotheses):
- Hypothesis 1: Race condition in rapid additions
- Hypothesis 2: updateCartItem vs addToCart logic issue
- Hypothesis 3: markChoicesAsAdded timing issue
- Hypothesis 4: localStorage overwrite

**Success Criteria**: Root cause confirmed with empirical evidence from logs

**IMPORTANT**: Do NOT proceed to T016-T020 (implementation) until this task confirms root cause!

---

## Phase 3.2: Tests First (TDD RED Phase) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests for TutorialChoiceContext

**T003 [P]: Contract Test - addTutorialChoice creates draft**
**File**: `frontend/react-Admin3/src/__tests__/contexts/TutorialChoiceContext.contract.test.js`
**Description**: Write contract test verifying addTutorialChoice creates choice with isDraft=true
**Actions**:
- Create new test file if it doesn't exist
- Import TutorialChoiceContext and testing utilities
- Write test: `test('addTutorialChoice creates draft selection', ...)`
- Use renderHook and act to test context behavior
- Assert: choice exists, isDraft=true, subjectCode correct, timestamp set
- Run test: `npm test TutorialChoiceContext.contract.test.js`
**Expected**: TEST FAILS (feature not yet implemented)

**T004 [P]: Contract Test - removeTutorialChoice deletes selection**
**File**: `frontend/react-Admin3/src/__tests__/contexts/TutorialChoiceContext.contract.test.js`
**Description**: Write contract test for removeTutorialChoice method
**Actions**:
- Add test: `test('removeTutorialChoice deletes selection', ...)`
- Setup: Add choice, then remove it
- Assert: choice undefined after removal
- Run test to confirm it fails
**Expected**: TEST FAILS

**T005 [P]: Contract Test - markChoicesAsAdded changes isDraft flag**
**File**: `frontend/react-Admin3/src/__tests__/contexts/TutorialChoiceContext.contract.test.js`
**Description**: Write contract test for markChoicesAsAdded method
**Actions**:
- Add test: `test('markChoicesAsAdded changes isDraft flag', ...)`
- Setup: Add 2 choices for same subject
- Call markChoicesAsAdded
- Assert: both choices have isDraft=false
- Run test to confirm it fails
**Expected**: TEST FAILS

**T006 [P]: Contract Test - getSubjectChoices returns all choices**
**File**: `frontend/react-Admin3/src/__tests__/contexts/TutorialChoiceContext.contract.test.js`
**Description**: Write contract test for getSubjectChoices method
**Actions**:
- Add test: `test('getSubjectChoices returns all choices for subject', ...)`
- Setup: Add 2 CS1 choices, 1 CM2 choice
- Call getSubjectChoices('CS1')
- Assert: returns 2 choices
- Add test: `test('getSubjectChoices with draftOnly filter', ...)`
- Test filtering by isDraft flag
- Run tests to confirm they fail
**Expected**: TESTS FAIL

**T007 [P]: Contract Test - localStorage debouncing**
**File**: `frontend/react-Admin3/src/__tests__/contexts/TutorialChoiceContext.contract.test.js`
**Description**: Write test verifying localStorage writes are debounced to 300ms
**Actions**:
- Add test: `test('localStorage writes debounced to 300ms', ...)`
- Mock localStorage.setItem
- Add multiple choices rapidly (< 100ms apart)
- Use fake timers to advance 300ms
- Assert: localStorage.setItem called only once after debounce period
- Run test to confirm it fails
**Expected**: TEST FAILS

### Contract Tests for CartContext

**T008 [P]: Contract Test - addToCart creates new cart item**
**File**: `frontend/react-Admin3/src/__tests__/contexts/CartContext.contract.test.js`
**Description**: Write contract test for addToCart method
**Actions**:
- Create new test file if it doesn't exist
- Mock API calls (axios or fetch)
- Write test: `test('addToCart creates new cart item', ...)`
- Mock POST /api/cart/items/ response
- Call addToCart with product data
- Assert: cart item added to state, API called with correct payload
- Run test to confirm it fails
**Expected**: TEST FAILS

**T009 [P]: Contract Test - updateCartItem merges tutorial selections**
**File**: `frontend/react-Admin3/src/__tests__/contexts/CartContext.contract.test.js`
**Description**: Write contract test verifying updateCartItem merges (not replaces) tutorial selections
**Actions**:
- Write test: `test('updateCartItem merges tutorial selections', ...)`
- Setup: Existing cart item with 1 selection
- Mock PUT /api/cart/items/{id}/ to return merged selections
- Call updateCartItem with new selection
- Assert: response contains both old and new selections
- Run test to confirm it fails
**Expected**: TEST FAILS (critical for bug fix)

**T010 [P]: Contract Test - removeFromCart deletes item**
**File**: `frontend/react-Admin3/src/__tests__/contexts/CartContext.contract.test.js`
**Description**: Write contract test for removeFromCart method
**Actions**:
- Write test: `test('removeFromCart deletes item', ...)`
- Setup: Cart with 1 item
- Mock DELETE /api/cart/items/{id}/
- Call removeFromCart
- Assert: item removed from state, API called
- Run test to confirm it fails
**Expected**: TEST FAILS

**T011 [P]: Contract Test - error handling with rollback**
**File**: `frontend/react-Admin3/src/__tests__/contexts/CartContext.contract.test.js`
**Description**: Write test verifying cart operations rollback on API failure
**Actions**:
- Write test: `test('addToCart rolls back on API failure', ...)`
- Mock API to reject with error
- Record initial cart state
- Attempt addToCart
- Assert: cart state unchanged after failure, error message set
- Run test to confirm it fails
**Expected**: TEST FAILS

### Integration Tests

**T012 [P]: Integration Test - Multi-tutorial addition (Scenario 1)**
**File**: `frontend/react-Admin3/src/__tests__/integration/CartSynchronization.integration.test.js`
**Description**: Write integration test reproducing the exact bug scenario
**Actions**:
- Create new integration test file
- Setup: Mock tutorial events, cart API
- Simulate: Add CS1-30-25S, add CS1-20-25S, click "Add to Cart"
- Assert: BOTH tutorials in cart (not just second one)
- Assert: summary bar shows both tutorials
- Use React Testing Library to simulate full user workflow
- Run test to confirm it fails (bug currently reproduces)
**Expected**: TEST FAILS (reproduces bug)

**T013 [P]: Integration Test - Page refresh persistence (Scenario 2)**
**File**: `frontend/react-Admin3/src/__tests__/integration/CartSynchronization.integration.test.js`
**Description**: Write test for state restoration after page refresh
**Actions**:
- Add test: `test('cart state persists after page refresh', ...)`
- Setup: Add tutorials to cart
- Simulate page refresh: unmount and remount components
- Mock fetchCart to return saved cart items
- Assert: cart items restored, summary bar shows correct status
- Run test to confirm behavior
**Expected**: TEST FAILS or PASSES (document current behavior)

**T014 [P]: Integration Test - Rapid sequential additions (Scenario 5)**
**File**: `frontend/react-Admin3/src/__tests__/integration/CartSynchronization.integration.test.js`
**Description**: Write test for race condition scenario (< 500ms between additions)
**Actions**:
- Add test: `test('handles rapid sequential additions', ...)`
- Setup: Mock API with delayed responses
- Add 2 tutorials with < 100ms gap
- Use Promise control to test race condition
- Assert: both tutorials successfully added, no data loss
- Run test to confirm it fails (race condition exists)
**Expected**: TEST FAILS

**T015 [P]: Integration Test - Clear cart removes all selections (Scenario 4)**
**File**: `frontend/react-Admin3/src/__tests__/integration/CartSynchronization.integration.test.js`
**Description**: Write test for clearCart functionality
**Actions**:
- Add test: `test('clearCart removes all selections', ...)`
- Setup: Cart with 2 tutorial selections
- Call clearCart
- Assert: cart empty, summary bar reset to draft state
- Simulate page refresh
- Assert: cart still empty (no localStorage orphans)
- Run test
**Expected**: TEST PASSES or FAILS (document current behavior)

---

## Phase 3.3: Core Implementation (GREEN Phase - ONLY after tests are failing)

### T016: Implement Atomic State Updates in handleAddToCart
**File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js`
**Description**: Modify handleAddToCart to build complete payload before API call (atomic operation)
**Actions**:
- Locate handleAddToCart function (lines 114-171)
- BEFORE making API call: Get ALL draft choices for subject
- Build complete tutorialSelections array with all choices
- Make single API call (POST or PUT) with complete payload
- AFTER API success: Mark all choices as added
- Implement try-catch with error handling
- Run contract tests: T003-T007 should now PASS
- Run integration test T012: Should now PASS (bug fixed)
**Success Criteria**: Multi-tutorial addition works, T012 passes

### T017: Implement Snapshot-Based Rollback for Error Handling
**File**: `frontend/react-Admin3/src/contexts/CartContext.js`
**Description**: Add rollback mechanism for cart operations that fail
**Actions**:
- Create helper function: `createSnapshot(tutorialChoices, cartItems)`
- Create helper function: `rollbackToSnapshot(snapshot)`
- Modify addToCart and updateCartItem:
  - Take snapshot before state mutation
  - On catch block: Call rollbackToSnapshot
  - Set error state with user-friendly message
- Run contract test T011: Should now PASS
**Success Criteria**: T011 passes, failed operations rollback correctly

### T018: Implement localStorage Debouncing in TutorialChoiceContext
**File**: `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js`
**Description**: Add 300ms debounce to localStorage writes to prevent rapid write conflicts
**Actions**:
- Locate useEffect that writes to localStorage
- Replace with debounced version using setTimeout pattern
- Debounce time: 300ms
- Clear timeout on cleanup
- Run contract test T007: Should now PASS
**Success Criteria**: T007 passes, localStorage writes batched correctly

### T019: Fix Cart API Backend to Merge Tutorial Selections
**File**: `backend/django_Admin3/apps/cart/views.py` (or equivalent cart API view)
**Description**: Ensure PUT /api/cart/items/{id}/ merges tutorial selections instead of replacing
**Actions**:
- Locate cart item update view/endpoint
- In update logic: Extract existing tutorialSelections from metadata
- Merge new selections with existing: `existing + new`
- Save merged selections back to cart item
- Return updated cart item
- Test with Postman or curl: PUT with new selection should preserve existing
**Success Criteria**: T009 passes, backend merges selections correctly

### T020: Update TutorialChoiceContext reconciliation on page load
**File**: `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js`
**Description**: Ensure page load reconciles localStorage with backend cart (mark carted items as isDraft=false)
**Actions**:
- Locate context initialization useEffect
- After loading from localStorage: Call reconciliation function
- Reconciliation: For each choice in localStorage, check if in backend cart
- If in cart: Set isDraft=false
- If not in cart: Keep isDraft=true
- Run integration test T013: Should now PASS
**Success Criteria**: T013 passes, state correctly restored after refresh

---

## Phase 3.4: Refactor and Clean Up (REFACTOR Phase)

### T021: ✅ Remove Debug Logging Code
**Files**:
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js`
- `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js`
- `frontend/react-Admin3/src/contexts/CartContext.js`
**Description**: Remove all temporary console.log statements added in T001
**Actions**:
- Search for debug log statements added in T001
- Remove all console.log calls (except production-appropriate error logging)
- Run all tests to ensure removal doesn't break anything
- Commit: "chore: remove debug logging from cart synchronization fix"
**Success Criteria**: No debug logs in production code, all tests still pass

### T022: Extract Helper Functions for Readability
**Files**:
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js`
- `frontend/react-Admin3/src/contexts/CartContext.js`
**Description**: Refactor complex logic into named helper functions
**Actions**:
- Extract payload building logic: `buildCartPayload(choices, product, price)`
- Extract snapshot logic: `createStateSnapshot()`, `rollbackToSnapshot(snapshot)`
- Extract merge logic: `mergeTutorialSelections(existing, new)`
- Add inline comments explaining fix rationale
- Run all tests to ensure refactoring doesn't break functionality
**Success Criteria**: Code more readable, all tests still pass

---

## Phase 3.5: Polish and Validation

### T023 [P]: Run Full Test Suite
**File**: Frontend test suite
**Description**: Execute all tests and verify 80%+ coverage on modified files
**Actions**:
- Run: `cd frontend/react-Admin3 && npm test -- --coverage --watchAll=false`
- Verify all tests pass (15 contract tests + 5 integration tests)
- Check coverage report for modified files:
  - TutorialChoiceContext.js (target: 80%+)
  - CartContext.js (target: 80%+)
  - TutorialSummaryBarContainer.js (target: 80%+)
- Fix any failing tests
- If coverage < 80%, add additional unit tests
**Success Criteria**: All tests pass, 80%+ coverage achieved

### T024: Manual Quickstart Validation
**File**: Execute all scenarios in `specs/001-epic-4-story/quickstart.md`
**Description**: Manually test all 5 scenarios to validate fix in real browser
**Actions**:
- Start backend: `cd backend/django_Admin3 && python manage.py runserver 8888`
- Start frontend: `cd frontend/react-Admin3 && npm start`
- Execute Scenario 1: Multi-tutorial addition (verify both appear in cart)
- Execute Scenario 2: Page refresh persistence
- Execute Scenario 3: Remove individual tutorial
- Execute Scenario 4: Clear cart
- Execute Scenario 5: Rapid sequential additions (< 500ms timing)
- Measure performance:
  - Cart sync on page load: < 2 seconds ✓
  - Add to cart operation: < 3 seconds ✓
- Document any issues found
**Success Criteria**: All 5 scenarios pass, performance targets met, no console errors

### T025 [P]: Cross-Browser Testing
**File**: Manual testing across browsers
**Description**: Validate fix works on Chrome, Firefox, Safari
**Actions**:
- Test Scenario 1 (multi-tutorial addition) on each browser:
  - Chrome (primary)
  - Firefox
  - Safari
- Verify localStorage compatibility on all browsers
- Verify performance targets met on all browsers
- Document any browser-specific issues
**Success Criteria**: Fix works correctly on all target browsers

### T026 [P]: Performance Validation
**File**: Performance measurement
**Description**: Measure and validate performance targets
**Actions**:
- Use Chrome DevTools Performance tab
- Measure cart synchronization on page load:
  - Record from page load start to cart fully loaded
  - Target: < 2 seconds (FR-024)
- Measure add-to-cart operation:
  - Record from button click to cart updated
  - Target: < 3 seconds (FR-025)
- Measure state update latency:
  - Record from action to UI update
  - Target: < 200ms p95
- Document measurements
**Success Criteria**: All performance targets met

---

## Dependencies

### Phase Dependencies
- **T001-T002 (Investigation)**: Must complete before writing tests
- **T003-T015 (Tests)**: Must ALL be written and failing before T016-T020
- **T016-T020 (Implementation)**: Can only start after all tests exist and fail
- **T021-T022 (Refactor)**: Can only start after all tests pass
- **T023-T026 (Polish)**: Can only start after refactor complete

### Task Dependencies
- T002 depends on T001 (need logging to reproduce bug)
- T003-T015 must ALL complete before T016 starts (TDD RED before GREEN)
- T016 blocks T023 (tests must pass before full suite run)
- T019 blocks T016 (backend must merge selections for frontend to work)
- T020 depends on T016 (reconciliation needs working cart operations)
- T021 depends on T016-T020 (can't remove logging until fix works)
- T024 depends on T023 (automated tests must pass before manual validation)

---

## Parallel Execution Examples

### Phase 3.2: Launch All Contract Tests in Parallel
```bash
# All tests write to different files, can run in parallel
Task: "Contract test addTutorialChoice in TutorialChoiceContext.contract.test.js"
Task: "Contract test removeTutorialChoice in TutorialChoiceContext.contract.test.js"
Task: "Contract test markChoicesAsAdded in TutorialChoiceContext.contract.test.js"
Task: "Contract test getSubjectChoices in TutorialChoiceContext.contract.test.js"
Task: "Contract test localStorage debouncing in TutorialChoiceContext.contract.test.js"
Task: "Contract test addToCart in CartContext.contract.test.js"
Task: "Contract test updateCartItem in CartContext.contract.test.js"
Task: "Contract test removeFromCart in CartContext.contract.test.js"
Task: "Contract test error rollback in CartContext.contract.test.js"
```

### Phase 3.2: Launch All Integration Tests in Parallel
```bash
Task: "Integration test multi-tutorial addition in CartSynchronization.integration.test.js"
Task: "Integration test page refresh persistence in CartSynchronization.integration.test.js"
Task: "Integration test rapid sequential additions in CartSynchronization.integration.test.js"
Task: "Integration test clear cart in CartSynchronization.integration.test.js"
```

### Phase 3.5: Launch Polish Tasks in Parallel
```bash
Task: "Run full test suite with coverage"
Task: "Cross-browser testing on Chrome, Firefox, Safari"
Task: "Performance validation using DevTools"
```

---

## Notes

### TDD Enforcement
- ⚠️ **CRITICAL**: Do NOT start T016 until T003-T015 are ALL complete and failing
- Each contract test must be verified to fail before implementation
- Use `npm test -- --watch` during development to see tests go RED → GREEN

### Parallel Execution Rules
- [P] tasks = different files, can run simultaneously
- Non-[P] tasks = same file or sequential dependency, must run in order
- Always verify tests fail before marking [P] tasks complete

### Commit Strategy
- Commit after T002: "docs: document root cause of cart sync bug"
- Commit after T003-T015: "test: add failing tests for cart synchronization fix (TDD RED)"
- Commit after T016-T020: "fix: implement atomic state updates for cart synchronization (TDD GREEN)"
- Commit after T021-T022: "refactor: clean up cart synchronization code (TDD REFACTOR)"
- Commit after T023-T026: "test: validate cart synchronization fix"

### Testing Commands
```bash
# Run specific contract tests
npm test TutorialChoiceContext.contract.test.js

# Run all integration tests
npm test CartSynchronization.integration.test.js

# Run with coverage
npm test -- --coverage --watchAll=false

# Run in watch mode during development
npm test -- --watch
```

### Debugging Tips
- If tests fail unexpectedly, check mock setup
- Use `screen.debug()` in React Testing Library tests to inspect DOM
- Use `console.log(result.current)` in hook tests to inspect state
- Check Network tab in DevTools during manual testing
- Verify localStorage contents: `JSON.parse(localStorage.getItem('tutorialChoices'))`

---

## Validation Checklist
*GATE: Confirm before marking plan complete*

- [x] All contracts have corresponding tests (T003-T011 for both contexts)
- [x] All integration scenarios have tests (T012-T015 for 5 quickstart scenarios)
- [x] All tests come before implementation (T003-T015 before T016-T020)
- [x] Parallel tasks truly independent (different files, no shared state)
- [x] Each task specifies exact file path ✓
- [x] No task modifies same file as another [P] task ✓
- [x] TDD ordering enforced (RED → GREEN → REFACTOR) ✓
- [x] Performance validation included (T026)
- [x] Cross-browser testing included (T025)
- [x] Manual testing included (T024 with quickstart.md)

---

## Summary

**Total Tasks**: 26
**Test Tasks**: 13 (T003-T015)
**Implementation Tasks**: 5 (T016-T020)
**Refactor Tasks**: 2 (T021-T022)
**Validation Tasks**: 4 (T023-T026)
**Investigation Tasks**: 2 (T001-T002)

**Estimated Duration**:
- Investigation: 2-3 hours
- Writing tests: 4-6 hours
- Implementation: 6-8 hours
- Refactor: 1-2 hours
- Validation: 2-3 hours
- **Total**: 15-22 hours

**Critical Path**: T001 → T002 → T003-T015 (all tests) → T016-T020 (implementation) → T023 (test suite) → T024 (manual validation)

**Parallelization Benefit**: Writing tests in parallel (T003-T015) saves ~6 hours compared to sequential execution
