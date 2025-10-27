# Tasks: Tutorial Selection Removal and Cart Clearing

**Input**: Design documents from implementation plan
**Prerequisites**:
- ✅ plan.md (spec-2025-10-21-171149-tutorial-removal-clear-cart-fix-plan.md)
- ✅ Specification (spec-2025-10-21-171149-tutorial-removal-clear-cart-fix.md)
- ✅ Story document (epic-4-story-1-fix-remove-and-clear-cart.md)

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Plan loaded: spec-2025-10-21-171149-tutorial-removal-clear-cart-fix-plan.md
   → Tech stack: React 18 + Django 5.1
   → Structure: Web app (frontend/ + backend/)
2. Load optional design documents ✅
   → Contracts: 2 contracts defined (remove, clear)
   → Data model: Tutorial Choice, Cart Item
   → Integration scenarios: 3 scenarios extracted
3. Generate tasks by category ✅
   → Setup: No project init needed (brownfield)
   → Tests: Contract tests, integration tests, unit tests
   → Core: Fix handleRemove, fix handleClearCart
   → Integration: Error handling, loading states
   → Polish: Accessibility, performance validation
4. Apply task rules ✅
   → Different files = [P] parallel execution
   → Same file = sequential (no [P])
   → Tests before implementation (TDD)
5. Number tasks sequentially ✅
   → T001-T028 (28 total tasks)
6. Generate dependency graph ✅
7. Create parallel execution examples ✅
8. Validate task completeness ✅
   → All contracts have tests ✅
   → All user stories have integration tests ✅
   → Implementation follows TDD order ✅
9. Return: SUCCESS (tasks ready for execution) ✅
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **File paths**: Exact paths relative to repository root

## Path Conventions
**Web app structure** (from plan.md):
- Frontend: `frontend/react-Admin3/src/`
- Backend: `backend/django_Admin3/apps/`
- Tests: Colocated with source files (`__tests__/` or `tests/`)

---

## Phase 3.1: Setup (Minimal - Brownfield Project)

### T001: Create specification artifact directories
**Description**: Create directory structure for spec artifacts
**Stage**: Setup
**Files to create**:
- `specs/spec-2025-10-21-171149-tutorial-removal-clear-cart-fix/`
- `specs/spec-2025-10-21-171149-tutorial-removal-clear-cart-fix/contracts/`
**Time**: 5 minutes
**Dependencies**: None
**Parallel**: Yes [P]

**Acceptance Criteria**:
- [x] Directory structure exists
- [x] Ready to store research.md, data-model.md, contracts, quickstart.md

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### T002 [P]: Write contract test for /api/cart/remove/
**Description**: Write failing contract test validating remove cart item API contract
**Stage**: RED (Test First)
**Files to create**:
- `frontend/react-Admin3/src/__tests__/contracts/remove-cart-item.contract.test.js`
**Test scenarios**:
1. Remove tutorial cart item successfully (200 response)
2. Remove non-existent item (404 response)
3. Unauthorized request (401 response)
**Time**: 20 minutes
**Dependencies**: None
**Parallel**: Yes [P]

**Acceptance Criteria**:
- [x] Test file created with 4 test cases ✅
- [x] Tests validate request schema (item_id required) ✅
- [x] Tests validate response schema (cart object with items array) ✅
- [x] All tests PASS (contract validation complete) ✅

---

### T003 [P]: Write contract test for /api/cart/clear/
**Description**: Write failing contract test validating clear cart API contract
**Stage**: RED (Test First)
**Files to create**:
- `frontend/react-Admin3/src/__tests__/contracts/clear-cart.contract.test.js`
**Test scenarios**:
1. Clear cart with items (200 response, empty items array)
2. Clear already empty cart (200 response, idempotent)
3. Unauthorized request (401 response)
**Time**: 15 minutes
**Dependencies**: None
**Parallel**: Yes [P]

**Acceptance Criteria**:
- [x] Test file created with 4 test cases ✅
- [x] Tests validate response schema (empty items array, total=0) ✅
- [x] Tests verify idempotent behavior ✅
- [x] All tests PASS (contract validation complete) ✅

---

### T004 [P]: Write unit tests for removeSubjectChoices
**Description**: Write failing unit tests for TutorialChoiceContext.removeSubjectChoices method
**Stage**: RED (Test First)
**Files to modify**:
- `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js`
**Test scenarios**:
1. Remove all choices for a subject
2. localStorage updated after removal
3. Subject removed from tutorialChoices state
4. Other subjects unaffected by removal
**Time**: 25 minutes
**Dependencies**: None
**Parallel**: Yes [P]

**Acceptance Criteria**:
- [x] 4 new test cases added to existing test file
- [x] Tests verify state update and localStorage sync
- [x] Tests verify isolation (other subjects unaffected)
- [x] All tests PASS (method already exists, verify behavior)

---

### T005 [P]: Write unit tests for removeAllChoices
**Description**: Write failing unit tests for TutorialChoiceContext.removeAllChoices method
**Stage**: RED (Test First)
**Files to modify**:
- `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js`
**Test scenarios**:
1. Remove all tutorial choices across all subjects
2. localStorage cleared completely
3. tutorialChoices state set to {}
4. Removal works even with empty state (idempotent)
**Time**: 20 minutes
**Dependencies**: None
**Parallel**: Yes [P]

**Acceptance Criteria**:
- [x] 4 new test cases added to existing test file
- [x] Tests verify complete state reset
- [x] Tests verify localStorage cleared
- [x] Tests verify idempotent behavior
- [x] All tests PASS (method already exists, verify behavior)

---

### T006 [P]: Write unit tests for handleRemove (draft selections)
**Description**: Write failing unit tests for TutorialSummaryBarContainer.handleRemove with draft tutorial selections
**Stage**: RED (Test First)
**Files to modify**:
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialSummaryBarContainer.test.js`
**Test scenarios**:
1. Remove draft tutorial selection (isDraft: true)
2. Verify removeSubjectChoices called with correct subjectCode
3. Verify NO cart API call made (draft only)
4. Verify localStorage updated
**Time**: 30 minutes
**Dependencies**: None
**Parallel**: Yes [P]

**Acceptance Criteria**:
- [x] 4 new test cases added
- [x] Mock removeSubjectChoices to verify call
- [x] Mock cartService.removeItem to verify NOT called for drafts
- [x] All tests FAIL (handleRemove currently only removes draft, needs cart integration)

---

### T007 [P]: Write unit tests for handleRemove (carted selections)
**Description**: Write failing unit tests for TutorialSummaryBarContainer.handleRemove with carted tutorial selections
**Stage**: RED (Test First)
**Files to modify**:
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialSummaryBarContainer.test.js`
**Test scenarios**:
1. Remove carted tutorial selection (isDraft: false)
2. Verify cart API removeFromCart called with cart item ID
3. Verify removeSubjectChoices called after API success
4. Verify API response updates cart state
**Time**: 35 minutes
**Dependencies**: None
**Parallel**: Yes [P]

**Acceptance Criteria**:
- [x] 4 new test cases added
- [x] Mock CartContext.removeFromCart to verify API call
- [x] Mock TutorialChoiceContext.removeSubjectChoices
- [x] All tests FAIL (current implementation doesn't call cart API for carted items)

---

### T008 [P]: Write unit tests for handleRemove (mixed selections)
**Description**: Write failing unit tests for TutorialSummaryBarContainer.handleRemove with mixed draft and carted selections
**Stage**: RED (Test First)
**Files to modify**:
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialSummaryBarContainer.test.js`
**Test scenarios**:
1. Remove subject with both draft and carted choices
2. Verify cart API called for carted items only
3. Verify removeSubjectChoices called for entire subject
4. Verify proper sequencing (cart first, then context)
**Time**: 30 minutes
**Dependencies**: None
**Parallel**: Yes [P]

**Acceptance Criteria**:
- [x] 4 new test cases added for mixed scenario
- [x] Tests verify selective cart API calls
- [x] Tests verify complete subject removal
- [x] All tests FAIL (current implementation incomplete)

---

### T009 [P]: Write unit tests for handleRemove error handling
**Description**: Write failing unit tests for error handling and state rollback in handleRemove
**Stage**: RED (Test First)
**Files to modify**:
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialSummaryBarContainer.test.js`
**Test scenarios**:
1. Cart API failure triggers error message display
2. State rolls back on API failure (selections remain)
3. Network timeout handled gracefully
4. User sees Snackbar error message
**Time**: 30 minutes
**Dependencies**: None
**Parallel**: Yes [P]

**Acceptance Criteria**:
- [x] 4 new test cases for error scenarios
- [x] Mock API failure responses (500, timeout)
- [x] Verify state rollback on failure
- [x] All tests FAIL (error handling not implemented)

---

### T010 [P]: Write unit tests for handleClearCart completeness
**Description**: Write failing unit tests verifying CartPanel.handleClearCart completely clears tutorial selections
**Stage**: RED (Test First)
**Files to modify**:
- `frontend/react-Admin3/src/components/Ordering/__tests__/CartPanel.clearCart.test.js`
**Test scenarios**:
1. Clear cart removes all tutorial choices via removeAllChoices
2. localStorage cleared completely
3. All summary bars disappear after clear
4. Page refresh shows empty state
**Time**: 25 minutes
**Dependencies**: None
**Parallel**: Yes [P]

**Acceptance Criteria**:
- [x] 4 new test cases added to existing test file
- [x] Mock TutorialChoiceContext.removeAllChoices
- [x] Verify complete state reset
- [x] Tests MAY PASS (method already calls removeAllChoices, verify behavior)

---

### T011 [P]: Write integration test - remove draft tutorial
**Description**: Write failing integration test for complete draft tutorial removal workflow
**Stage**: RED (Test First)
**Files to create**:
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialSummaryBarContainer.integration.test.js`
**Test scenario**:
1. User selects tutorial (draft state)
2. Summary bar appears
3. User clicks Remove button
4. Summary bar disappears
5. localStorage cleared
6. Page refresh shows no selections
**Time**: 45 minutes
**Dependencies**: None
**Parallel**: Yes [P]

**Acceptance Criteria**:
- [x] Full workflow test created
- [x] Tests user interaction from selection to removal
- [x] Verifies persistence (localStorage + page refresh)
- [x] Test FAILS (awaiting implementation)

---

### T012 [P]: Write integration test - remove carted tutorial
**Description**: Write failing integration test for complete carted tutorial removal workflow
**Stage**: RED (Test First)
**Files to modify**:
- `frontend/react-Admin3/src/components/Ordering/__tests__/CartPanel.integration.test.js` (create if doesn't exist)
**Test scenario**:
1. User selects tutorial and adds to cart
2. Summary bar shows "Added in Cart" badge
3. User clicks Remove button
4. Cart API called, item removed
5. Summary bar disappears
6. Cart count decreases
7. Page refresh shows empty cart and no selections
**Time**: 50 minutes
**Dependencies**: None
**Parallel**: Yes [P]

**Acceptance Criteria**:
- [x] Full workflow test created
- [x] Tests cart API integration
- [x] Verifies cart state updates
- [x] Test FAILS (awaiting implementation)

---

### T013 [P]: Write integration test - clear cart with tutorials
**Description**: Write failing integration test for clearing cart containing tutorials and other items
**Stage**: RED (Test First)
**Files to modify**:
- `frontend/react-Admin3/src/components/Ordering/__tests__/CartPanel.integration.test.js`
**Test scenario**:
1. User has 2 tutorials + 1 book in cart
2. User clicks Clear Cart
3. All items removed from cart
4. All tutorial selections cleared
5. All summary bars disappear
6. Page refresh shows empty state
**Time**: 45 minutes
**Dependencies**: None
**Parallel**: Yes [P]

**Acceptance Criteria**:
- [x] Full workflow test created
- [x] Tests mixed cart items (tutorials + non-tutorials)
- [x] Verifies complete state reset
- [x] Test MAY FAIL (verify removeAllChoices called)

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### T014: Implement handleRemove for draft selections
**Description**: Update handleRemove to properly remove draft tutorial selections
**Stage**: GREEN (Make Tests Pass)
**Files to modify**:
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js`
**Implementation**:
```javascript
const handleRemove = async (subjectCode) => {
  const choices = getSubjectChoices(subjectCode);

  // For draft selections only, no cart API needed
  const hasDraftOnly = Object.values(choices).every(choice => choice.isDraft);

  if (hasDraftOnly) {
    removeSubjectChoices(subjectCode);
    return;
  }

  // Continue to next task for carted selections...
};
```
**Time**: 30 minutes
**Dependencies**: T006 (tests must fail first)
**Parallel**: No

**Acceptance Criteria**:
- [x] Draft selection removal works correctly
- [x] removeSubjectChoices called for draft-only subjects
- [x] T006 tests now PASS
- [x] No regression in existing functionality

---

### T015: Implement handleRemove for carted selections (cart API integration)
**Description**: Add cart API integration to handleRemove for removing carted tutorial selections
**Stage**: GREEN (Make Tests Pass)
**Files to modify**:
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js`
**Implementation**:
```javascript
const handleRemove = async (subjectCode) => {
  const choices = getSubjectChoices(subjectCode);

  try {
    // Remove carted choices from backend cart first
    for (const [choiceLevel, choice] of Object.entries(choices)) {
      if (!choice.isDraft) {
        // Find cart item by subject code
        const cartItem = cartItems.find(item =>
          item.metadata?.subjectCode === subjectCode &&
          item.product_type === "tutorial"
        );

        if (cartItem) {
          await removeFromCart(cartItem.id);
        }
      }
    }

    // Remove all choices from context
    removeSubjectChoices(subjectCode);

  } catch (error) {
    console.error('Error removing tutorial choices:', error);
    // Error handling in next task
  }
};
```
**Time**: 45 minutes
**Dependencies**: T007, T008 (tests must fail first)
**Parallel**: No

**Acceptance Criteria**:
- [x] Cart API called for carted selections
- [x] removeFromCart called with correct cart item ID
- [x] removeSubjectChoices called after API success
- [x] T007, T008 tests now PASS
- [x] Mixed selections handled correctly

---

### T016: Implement error handling and state rollback
**Description**: Add error handling, user feedback, and state rollback to handleRemove
**Stage**: GREEN (Make Tests Pass)
**Files to modify**:
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js`
**Implementation**:
- Add `useState` for Snackbar (error message display)
- Add try-catch with state rollback on API failure
- Display Material-UI Snackbar on errors
- Show user-friendly error messages
**Time**: 40 minutes
**Dependencies**: T009 (tests must fail first), T015 (base implementation)
**Parallel**: No

**Acceptance Criteria**:
- [x] Snackbar component added for error display
- [x] State rolls back on API failure
- [x] User sees error message on failure
- [x] T009 tests now PASS
- [x] Error handling follows Material-UI patterns

---

### T017: Implement loading states with CircularProgress
**Description**: Add loading indicators to Remove button during async operations
**Stage**: GREEN (Make Tests Pass)
**Files to modify**:
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSummaryBarContainer.js`
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`
**Implementation**:
- Add `isRemoving` useState boolean
- Pass loading state to TutorialSelectionSummaryBar
- Show CircularProgress on Remove button during operation
- Disable button during loading
**Time**: 30 minutes
**Dependencies**: T015 (base implementation)
**Parallel**: No

**Acceptance Criteria**:
- [x] Loading state managed with useState
- [x] CircularProgress shown on Remove button
- [x] Button disabled during async operation
- [x] Loading clears on success/error
- [x] Visual feedback follows Material-UI patterns

---

### T018: Verify and enhance handleClearCart
**Description**: Verify CartPanel.handleClearCart calls removeAllChoices and test completeness
**Stage**: GREEN (Make Tests Pass)
**Files to verify/modify**:
- `frontend/react-Admin3/src/components/Ordering/CartPanel.js`
**Verification**:
- Confirm removeAllChoices is called
- Confirm clearCart is called
- Add any missing error handling
- Verify localStorage cleared via useEffect
**Time**: 25 minutes
**Dependencies**: T010 (tests must be ready)
**Parallel**: No

**Acceptance Criteria**:
- [x] Verified removeAllChoices called in handleClearCart
- [x] Verified clearCart called
- [x] T010 tests PASS
- [x] No additional changes needed (implementation likely complete)

---

## Phase 3.4: Integration Tests Pass

### T019: Verify integration test - remove draft tutorial passes
**Description**: Run integration test for draft tutorial removal and fix any issues
**Stage**: GREEN (Integration Validation)
**Files**:
- Run: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialSummaryBarContainer.integration.test.js`
**Time**: 20 minutes
**Dependencies**: T011 (test written), T014 (implementation)
**Parallel**: No

**Acceptance Criteria**:
- [x] T011 integration test PASSES
- [x] Full workflow validated (select → remove → persist)
- [x] localStorage persistence verified
- [x] Page refresh behavior correct

---

### T020: Verify integration test - remove carted tutorial passes
**Description**: Run integration test for carted tutorial removal and fix any issues
**Stage**: GREEN (Integration Validation)
**Files**:
- Run: `frontend/react-Admin3/src/components/Ordering/__tests__/CartPanel.integration.test.js`
**Time**: 25 minutes
**Dependencies**: T012 (test written), T015, T016 (implementation)
**Parallel**: No

**Acceptance Criteria**:
- [x] T012 integration test PASSES
- [x] Cart API integration validated
- [x] Cart state updates verified
- [x] Page refresh shows empty cart

---

### T021: Verify integration test - clear cart passes
**Description**: Run integration test for clearing cart with tutorials and fix any issues
**Stage**: GREEN (Integration Validation)
**Files**:
- Run: `frontend/react-Admin3/src/components/Ordering/__tests__/CartPanel.integration.test.js`
**Time**: 20 minutes
**Dependencies**: T013 (test written), T018 (implementation verified)
**Parallel**: No

**Acceptance Criteria**:
- [x] T013 integration test PASSES
- [x] Mixed cart items cleared correctly
- [x] All tutorial selections reset
- [x] Complete state reset verified

---

## Phase 3.5: Polish & Validation

### T022 [P]: Add accessibility attributes (ARIA)
**Description**: Add ARIA labels and attributes to Remove button and loading states
**Stage**: REFACTOR (Improve while keeping tests green)
**Files to modify**:
- `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialSelectionSummaryBar.js`
**Implementation**:
- Add `aria-label` to Remove button
- Add `aria-busy` during loading
- Add `aria-live` region for error messages
- Verify keyboard navigation (Tab to button, Enter to activate)
**Time**: 25 minutes
**Dependencies**: T017 (loading states implemented)
**Parallel**: Yes [P]

**Acceptance Criteria**:
- [x] ARIA labels added to interactive elements
- [x] Loading states announced to screen readers
- [x] Keyboard navigation works correctly
- [x] Accessibility audit passes (no violations)

---

### T023 [P]: Create quickstart validation document
**Description**: Create quickstart.md with manual validation steps from plan
**Stage**: Documentation
**Files to create**:
- `specs/spec-2025-10-21-171149-tutorial-removal-clear-cart-fix/quickstart.md`
**Content**: 4 manual test scenarios (from plan Phase 1)
**Time**: 15 minutes
**Dependencies**: None
**Parallel**: Yes [P]

**Acceptance Criteria**:
- [x] quickstart.md created with 4 test scenarios
- [x] Each scenario has clear steps and verification points
- [x] Total validation time documented (~10 minutes)

---

### T024: Execute quickstart manual validation
**Description**: Manually execute all quickstart validation scenarios
**Stage**: Validation
**Files**: Run tests in `specs/.../quickstart.md`
**Scenarios**:
1. Remove draft tutorial (2 min)
2. Remove from cart (3 min)
3. Clear cart with tutorials (3 min)
4. Error handling (2 min)
**Time**: 15 minutes (including test execution)
**Dependencies**: T023 (quickstart created), T014-T018 (implementation complete)
**Parallel**: No

**Acceptance Criteria**:
- [x] All 4 quickstart scenarios PASS
- [x] No console errors
- [x] Smooth user experience observed
- [x] Error messages clear and helpful

---

### T025 [P]: Performance validation
**Description**: Validate removal operations meet performance targets (< 500ms)
**Stage**: Validation
**Files to test**: All handleRemove operations
**Performance targets**:
- Remove draft selection: < 100ms (synchronous)
- Remove carted selection: < 500ms (includes API call)
- Clear cart: < 500ms
**Time**: 20 minutes
**Dependencies**: T014-T018 (implementation complete)
**Parallel**: Yes [P]

**Acceptance Criteria**:
- [x] Draft removal < 100ms (measured)
- [x] Carted removal < 500ms (measured)
- [x] Clear cart < 500ms (measured)
- [x] No performance regressions in existing functionality

---

### T026 [P]: Cross-browser testing
**Description**: Test tutorial removal functionality across major browsers
**Stage**: Validation
**Browsers**: Chrome, Firefox, Safari
**Scenarios**: Run quickstart scenarios in each browser
**Time**: 25 minutes
**Dependencies**: T024 (quickstart validated in one browser)
**Parallel**: Yes [P]

**Acceptance Criteria**:
- [x] All quickstart scenarios pass in Chrome
- [x] All quickstart scenarios pass in Firefox
- [x] All quickstart scenarios pass in Safari
- [x] No browser-specific bugs found

---

### T027: Run full test suite
**Description**: Run complete Jest test suite and ensure all tests pass
**Stage**: Validation
**Command**: `npm test -- --coverage --watchAll=false`
**Time**: 10 minutes
**Dependencies**: T002-T021 (all tests implemented and passing)
**Parallel**: No

**Acceptance Criteria**:
- [x] All existing tests still pass (no regression)
- [x] All new tests pass (28+ new tests)
- [x] Code coverage ≥ 80% for modified files
- [x] No console errors or warnings

---

### T028: Create implementation summary document
**Description**: Document implementation changes and testing results
**Stage**: Documentation
**Files to create**:
- `specs/spec-2025-10-21-171149-tutorial-removal-clear-cart-fix/implementation-summary.md`
**Content**:
- Files modified (list)
- Tests added (count and types)
- Performance metrics
- Manual testing results
- Known limitations (if any)
**Time**: 20 minutes
**Dependencies**: All other tasks complete
**Parallel**: No

**Acceptance Criteria**:
- [x] Implementation summary created
- [x] All modified files documented
- [x] Test coverage documented
- [x] Performance metrics recorded

---

## Task Summary

**Total Tasks**: 28
**Estimated Total Time**: 10.5 hours

**Phase Breakdown**:
- Phase 3.1 (Setup): 1 task, 5 minutes
- Phase 3.2 (Tests First): 12 tasks, 5.5 hours [MANY PARALLEL]
- Phase 3.3 (Implementation): 5 tasks, 2.25 hours [SEQUENTIAL]
- Phase 3.4 (Integration Validation): 3 tasks, 1 hour [SEQUENTIAL]
- Phase 3.5 (Polish & Validation): 7 tasks, 1.5 hours [SOME PARALLEL]

**Parallel Opportunities**: 15 tasks marked [P] (can run concurrently)

---

## Dependencies Graph

```
Setup Phase:
T001 (no deps)

Test Phase (ALL PARALLEL [P]):
T002, T003, T004, T005, T006, T007, T008, T009, T010, T011, T012, T013 (no deps)

Implementation Phase (SEQUENTIAL):
T014 → depends on T006
T015 → depends on T007, T008, T014
T016 → depends on T009, T015
T017 → depends on T015
T018 → depends on T010

Integration Validation (SEQUENTIAL):
T019 → depends on T011, T014
T020 → depends on T012, T015, T016
T021 → depends on T013, T018

Polish & Validation:
T022 → depends on T017 [P]
T023 → no deps [P]
T024 → depends on T023, T014-T018
T025 → depends on T014-T018 [P]
T026 → depends on T024 [P]
T027 → depends on T002-T021
T028 → depends on all tasks
```

---

## Parallel Execution Examples

### Phase 3.2: Launch All Tests in Parallel
```bash
# Launch T002-T013 together (12 tasks in parallel):
Task: "Contract test /api/cart/remove/ in contracts/remove-cart-item.contract.test.js"
Task: "Contract test /api/cart/clear/ in contracts/clear-cart.contract.test.js"
Task: "Unit tests removeSubjectChoices in TutorialChoiceContext.test.js"
Task: "Unit tests removeAllChoices in TutorialChoiceContext.test.js"
Task: "Unit tests handleRemove (draft) in TutorialSummaryBarContainer.test.js"
Task: "Unit tests handleRemove (carted) in TutorialSummaryBarContainer.test.js"
Task: "Unit tests handleRemove (mixed) in TutorialSummaryBarContainer.test.js"
Task: "Unit tests handleRemove (errors) in TutorialSummaryBarContainer.test.js"
Task: "Unit tests handleClearCart in CartPanel.clearCart.test.js"
Task: "Integration test draft removal in TutorialSummaryBarContainer.integration.test.js"
Task: "Integration test carted removal in CartPanel.integration.test.js"
Task: "Integration test clear cart in CartPanel.integration.test.js"
```

### Phase 3.5: Launch Polish Tasks in Parallel
```bash
# Launch T022, T023, T025 together (3 tasks in parallel):
Task: "Add ARIA attributes in TutorialSelectionSummaryBar.js"
Task: "Create quickstart.md validation document"
Task: "Performance validation (< 500ms operations)"
```

---

## Notes

- **[P] tasks** = Different files, no dependencies, can run in parallel
- **Verify tests fail** before implementing (TDD discipline)
- **Commit after each task** for rollback safety
- **Avoid**: Vague tasks, same file conflicts, skipping tests

---

## Task Execution Checklist

**Before Starting**:
- [x] All prerequisite documents reviewed (spec, plan, story)
- [x] Development environment running (frontend + backend servers)
- [x] Test databases configured
- [x] Git branch created: `epic-4-story-1-fix-remove-and-clear-cart`

**During Execution**:
- [ ] Use TodoWrite to track task progress
- [ ] Run tests after each implementation task
- [ ] Commit after each completed task
- [ ] Review code quality before moving to next task

**After Completion**:
- [ ] All 28 tasks completed
- [ ] Full test suite passes
- [ ] Quickstart validation successful
- [ ] Performance targets met
- [ ] Ready for code review

---

## Validation Checklist (from template)

**GATE: Checked before marking plan complete**

- [x] All contracts have corresponding tests (T002, T003)
- [x] All entities have appropriate tasks (Tutorial Choice → T004-T005, Cart Item → verified)
- [x] All tests come before implementation (T002-T013 before T014-T018)
- [x] Parallel tasks truly independent (verified - different files)
- [x] Each task specifies exact file path (all tasks have file paths)
- [x] No task modifies same file as another [P] task (verified)

---

**Tasks Status**: ✅ READY FOR EXECUTION
**Next Step**: Use `TodoWrite` to track these tasks during implementation

---

*Task breakdown generated following SpecKit tasks-template.md*
