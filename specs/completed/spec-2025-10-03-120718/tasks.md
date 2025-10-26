# Tasks: Tutorial Cart Integration Fix

**Feature**: Tutorial Cart Integration Fix (Epic 1)
**Input**: Design documents from `specs/spec-2025-10-03-120718/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

---

## Execution Flow

```
1. Load plan.md from feature directory → ✅ DONE
2. Load design documents → ✅ DONE
   - data-model.md: TutorialChoice, TutorialChoices State, CartItem entities
   - contracts/localStorage-contract.json: localStorage schema and operations
   - research.md: React Context extension
3. Generate tasks by category → ✅ DONE
   - Story 1.1: isDraft State Management (Tasks T001-T013)
   - Story 1.2: Cart Integration Fix (Tasks T014-T027)
4. Apply task rules → ✅ DONE
   - Different files = [P] for parallel execution
   - Tests before implementation (TDD RED-GREEN-REFACTOR)
5. Number tasks sequentially → ✅ DONE (T001-T031)
6. Generate dependency graph → ✅ DONE
7. Create parallel execution examples → ✅ DONE
8. Validate task completeness → ✅ PASS
9. Return: SUCCESS (tasks ready for execution)
```

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **TDD Stage**: RED → GREEN → REFACTOR cycle enforced
- Exact file paths included in descriptions

---

## Path Conventions
**Project Type**: Web application (frontend + backend)
**Frontend Base**: `frontend/react-Admin3/src/`
**Test Base**: `frontend/react-Admin3/src/`

---

## Story 1.1: isDraft State Management

### Phase 1.1.1: Setup & Contract Tests (TDD RED)

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] **T001** [P] **TDD RED**: Write failing test for `addTutorialChoice` initializes isDraft: true
  - **File**: `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js`
  - **Description**: Test that new tutorial choices default to isDraft: true
  - **Stage**: RED
  - **Time**: 0.5 hours
  - **Dependencies**: None
  - **Acceptance**: Test fails with "isDraft is undefined"

- [ ] **T002** [P] **TDD RED**: Write failing test for `markChoicesAsAdded` sets isDraft: false
  - **File**: `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js`
  - **Description**: Test that markChoicesAsAdded changes all subject choices to isDraft: false
  - **Stage**: RED
  - **Time**: 0.5 hours
  - **Dependencies**: None
  - **Acceptance**: Test fails with "markChoicesAsAdded is not a function"

- [ ] **T003** [P] **TDD RED**: Write failing test for `getDraftChoices` filters correctly
  - **File**: `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js`
  - **Description**: Test that getDraftChoices returns only choices where isDraft === true
  - **Stage**: RED
  - **Time**: 0.5 hours
  - **Dependencies**: None
  - **Acceptance**: Test fails with "getDraftChoices is not a function"

- [ ] **T004** [P] **TDD RED**: Write failing test for `getCartedChoices` filters correctly
  - **File**: `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js`
  - **Description**: Test that getCartedChoices returns only choices where isDraft === false
  - **Stage**: RED
  - **Time**: 0.5 hours
  - **Dependencies**: None
  - **Acceptance**: Test fails with "getCartedChoices is not a function"

- [ ] **T005** [P] **TDD RED**: Write failing test for `hasCartedChoices` detection
  - **File**: `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js`
  - **Description**: Test that hasCartedChoices returns true when any choice has isDraft: false
  - **Stage**: RED
  - **Time**: 0.5 hours
  - **Dependencies**: None
  - **Acceptance**: Test fails with "hasCartedChoices is not a function"

### Phase 1.1.2: Core Implementation (TDD GREEN)

**ONLY proceed after ALL tests T001-T005 are failing**

- [ ] **T006** **TDD GREEN**: Implement isDraft flag in `addTutorialChoice` method
  - **File**: `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js`
  - **Tests**: `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js` (T001)
  - **Description**: Add `isDraft: true` when creating new tutorial choices
  - **Stage**: GREEN
  - **Time**: 0.5 hours
  - **Dependencies**: T001 (test must exist and fail first)
  - **Acceptance**: T001 test passes, choice has isDraft: true

- [ ] **T007** **TDD GREEN**: Implement `markChoicesAsAdded` method
  - **File**: `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js`
  - **Tests**: `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js` (T002)
  - **Description**: Create method to set isDraft: false for all subject choices
  - **Stage**: GREEN
  - **Time**: 1 hour
  - **Dependencies**: T002, T006
  - **Acceptance**: T002 test passes, all subject choices have isDraft: false

- [ ] **T008** **TDD GREEN**: Implement `getDraftChoices` method
  - **File**: `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js`
  - **Tests**: `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js` (T003)
  - **Description**: Filter and return only choices where isDraft === true
  - **Stage**: GREEN
  - **Time**: 0.5 hours
  - **Dependencies**: T003, T006
  - **Acceptance**: T003 test passes, only draft choices returned

- [ ] **T009** **TDD GREEN**: Implement `getCartedChoices` method
  - **File**: `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js`
  - **Tests**: `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js` (T004)
  - **Description**: Filter and return only choices where isDraft === false
  - **Stage**: GREEN
  - **Time**: 0.5 hours
  - **Dependencies**: T004, T006
  - **Acceptance**: T004 test passes, only carted choices returned

- [ ] **T010** **TDD GREEN**: Implement `hasCartedChoices` method
  - **File**: `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js`
  - **Tests**: `frontend/react-Admin3/src/contexts/__tests__/TutorialChoiceContext.test.js` (T005)
  - **Description**: Check if any choices have isDraft === false
  - **Stage**: GREEN
  - **Time**: 0.5 hours
  - **Dependencies**: T005, T006
  - **Acceptance**: T005 test passes, correctly detects carted choices

- [ ] **T011** **TDD GREEN**: Export new methods in Context value
  - **File**: `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js`
  - **Tests**: All T001-T005 tests
  - **Description**: Add markChoicesAsAdded, getDraftChoices, getCartedChoices, hasCartedChoices to context value export
  - **Stage**: GREEN
  - **Time**: 0.5 hours
  - **Dependencies**: T007-T010
  - **Acceptance**: All new methods accessible via useTutorialChoice hook

### Phase 1.1.3: Refactor & Polish

- [ ] **T012** **TDD REFACTOR**: Refactor TutorialChoiceContext for code quality
  - **File**: `frontend/react-Admin3/src/contexts/TutorialChoiceContext.js`
  - **Tests**: All T001-T005 tests must stay green
  - **Description**: Remove duplication, improve naming, add JSDoc comments, optimize performance
  - **Stage**: REFACTOR
  - **Time**: 1 hour
  - **Dependencies**: T006-T011
  - **Acceptance**: All tests pass, code coverage 80%+, no console warnings

- [ ] **T013** **Coverage Verification**: Run coverage report for Story 1.1
  - **Command**: `cd frontend/react-Admin3 && npm test -- --coverage --watchAll=false --testPathPattern=TutorialChoiceContext`
  - **Description**: Verify 80%+ test coverage for TutorialChoiceContext
  - **Stage**: VALIDATION
  - **Time**: 0.5 hours
  - **Dependencies**: T001-T012
  - **Acceptance**: Coverage report shows ≥80% for TutorialChoiceContext.js

---

## Story 1.2: Cart Integration Fix

### Phase 1.2.1: Investigation & Integration Tests (TDD RED)

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] **T014** **Investigation**: Document current cart bug root cause
  - **File**: `docs/stories/epic-tutorial-cart-fix/cart-bug-investigation.md`
  - **Description**: Analyze TutorialProductCard addToCart logic, document why duplicates occur
  - **Stage**: RESEARCH
  - **Time**: 1 hour
  - **Dependencies**: None
  - **Acceptance**: Investigation document created with root cause analysis

- [ ] **T015** [P] **TDD RED**: Write failing test for first choice creates cart item
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialProductCard.test.js`
  - **Description**: Test adding first tutorial choice creates 1 cart item
  - **Stage**: RED
  - **Time**: 1 hour
  - **Dependencies**: T014
  - **Acceptance**: Test fails (cart item not created or created incorrectly)

- [ ] **T016** [P] **TDD RED**: Write failing test for second choice updates cart item (no duplicate)
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialProductCard.test.js`
  - **Description**: Test adding second choice for same subject updates existing cart item
  - **Stage**: RED
  - **Time**: 1 hour
  - **Dependencies**: T014
  - **Acceptance**: Test fails (duplicate cart item created instead of update)

- [ ] **T017** [P] **TDD RED**: Write failing test for third choice updates cart item
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialProductCard.test.js`
  - **Description**: Test adding third choice continues to update same cart item
  - **Stage**: RED
  - **Time**: 0.5 hours
  - **Dependencies**: T014
  - **Acceptance**: Test fails (cart logic not updated)

- [ ] **T018** [P] **TDD RED**: Write failing test for cart removal restores draft state
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialProductCard.test.js`
  - **Description**: Test removing cart item sets all choices back to isDraft: true
  - **Stage**: RED
  - **Time**: 1 hour
  - **Dependencies**: T014
  - **Acceptance**: Test fails (state not synced on cart removal)

- [ ] **T019** [P] **TDD RED**: Write failing test for multiple subjects in cart
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialProductCard.test.js`
  - **Description**: Test that CS2 and CP1 can have separate cart items simultaneously
  - **Stage**: RED
  - **Time**: 0.5 hours
  - **Dependencies**: T014
  - **Acceptance**: Test fails (multi-subject cart not handled correctly)

- [ ] **T020** [P] **TDD RED**: Write failing test for cart item deleted externally
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/__tests__/TutorialProductCard.test.js`
  - **Description**: Test sync when cart item removed externally (e.g., timeout)
  - **Stage**: RED
  - **Time**: 1 hour
  - **Dependencies**: T014
  - **Acceptance**: Test fails (orphaned state not cleaned up)

### Phase 1.2.2: Cart Integration Implementation (TDD GREEN)

**ONLY proceed after ALL tests T015-T020 are failing**

- [ ] **T021** **TDD GREEN**: Implement lookup-then-merge cart integration pattern
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`
  - **Tests**: T015-T017
  - **Description**: Find existing cart item by subject, merge or create as needed
  - **Stage**: GREEN
  - **Time**: 3 hours
  - **Dependencies**: T015-T017, Story 1.1 complete (T001-T013)
  - **Acceptance**: T015-T017 tests pass, single cart item per subject

- [ ] **T022** **TDD GREEN**: Implement state transition on add to cart (isDraft: false)
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`
  - **Tests**: T015-T017
  - **Description**: Call markChoicesAsAdded after successful cart add/update
  - **Stage**: GREEN
  - **Time**: 1 hour
  - **Dependencies**: T021
  - **Acceptance**: Draft choices transition to isDraft: false when added to cart

- [ ] **T023** **TDD GREEN**: Implement state transition on cart removal (isDraft: true)
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`
  - **Tests**: T018
  - **Description**: Restore isDraft: true when cart item is removed
  - **Stage**: GREEN
  - **Time**: 1.5 hours
  - **Dependencies**: T018, T021
  - **Acceptance**: T018 test passes, removing cart item restores draft state

- [ ] **T024** **TDD GREEN**: Implement multi-subject cart handling
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`
  - **Tests**: T019
  - **Description**: Ensure lookup-then-merge works correctly for multiple subjects
  - **Stage**: GREEN
  - **Time**: 1 hour
  - **Dependencies**: T019, T021
  - **Acceptance**: T019 test passes, multiple subjects have separate cart items

- [ ] **T025** **TDD GREEN**: Implement cart sync for externally deleted items
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`
  - **Tests**: T020
  - **Description**: useEffect to sync TutorialChoiceContext state when cart items disappear
  - **Stage**: GREEN
  - **Time**: 2 hours
  - **Dependencies**: T020, T021
  - **Acceptance**: T020 test passes, orphaned choice states cleaned up

### Phase 1.2.3: Refactor & Polish

- [ ] **T026** **TDD REFACTOR**: Refactor cart integration code for quality
  - **File**: `frontend/react-Admin3/src/components/Product/ProductCard/Tutorial/TutorialProductCard.js`
  - **Tests**: All T015-T020 tests must stay green
  - **Description**: Extract cart logic to helper functions, add JSDoc, optimize re-renders
  - **Stage**: REFACTOR
  - **Time**: 2 hours
  - **Dependencies**: T021-T025
  - **Acceptance**: All tests pass, code is clean and documented

- [ ] **T027** **Coverage Verification**: Run coverage report for Story 1.2 (100% requirement)
  - **Command**: `cd frontend/react-Admin3 && npm test -- --coverage --watchAll=false --testPathPattern=TutorialProductCard`
  - **Description**: Verify 100% test coverage for critical cart integration logic
  - **Stage**: VALIDATION
  - **Time**: 0.5 hours
  - **Dependencies**: T015-T026
  - **Acceptance**: Coverage report shows 100% for cart integration methods in TutorialProductCard.js

---

## Final Validation

### Regression Testing

- [ ] **T028** **Regression**: Verify no impact to Materials product cart
  - **Tests**: Run Materials product cart tests
  - **Command**: `npm test -- --testPathPattern=MaterialProductCard`
  - **Time**: 0.5 hours
  - **Dependencies**: T027
  - **Acceptance**: All MaterialProductCard tests pass

- [ ] **T029** **Regression**: Verify no impact to Bundles product cart
  - **Tests**: Run Bundle product cart tests
  - **Command**: `npm test -- --testPathPattern=BundleCard`
  - **Time**: 0.5 hours
  - **Dependencies**: T027
  - **Acceptance**: All BundleCard tests pass

- [ ] **T030** **Regression**: Run full frontend test suite
  - **Command**: `cd frontend/react-Admin3 && npm test -- --watchAll=false`
  - **Time**: 1 hour
  - **Dependencies**: T028, T029
  - **Acceptance**: All tests pass, no regressions

### Manual Validation

- [ ] **T031** **Manual Testing**: Execute quickstart.md scenarios
  - **File**: `specs/spec-2025-10-03-120718/quickstart.md`
  - **Description**: Manually test all 5 user scenarios end-to-end
  - **Time**: 2 hours
  - **Dependencies**: T030
  - **Acceptance**: All quickstart scenarios pass

---

## Dependencies Graph

```
Story 1.1: isDraft State Management
─────────────────────────────────────
T001-T005 (Tests - Parallel)
    ↓
T006 (Add isDraft flag)
    ↓
T007-T010 (New methods - Sequential after T006)
    ↓
T011 (Export methods - depends on T007-T010)
    ↓
T012 (Refactor - depends on all implementation)
    ↓
T013 (Coverage - depends on all)
    ↓
Story 1.2: Cart Integration Fix
─────────────────────────────────────
T014 (Investigation)
    ↓
T015-T020 (Tests - Parallel, depend on T014)
    ↓
T021 (Lookup-merge pattern - depends on Story 1.1 + tests)
    ↓
T022 (Add state transition - depends on T021)
T023 (Remove state transition - depends on T021)
T024 (Multi-subject - depends on T021)
T025 (Sync external deletion - depends on T021)
    ↓
T026 (Refactor - depends on T021-T025)
    ↓
T027 (Coverage - depends on all)
    ↓
Final Validation
─────────────────────────────────────
T028, T029 (Regression - Parallel)
    ↓
T030 (Full test suite)
    ↓
T031 (Manual testing)
```

---

## Parallel Execution Examples

### Phase 1.1.1 (RED): All tests can run in parallel
```bash
# Launch T001-T005 together (all write to same test file but different test cases)
npm test -- --testPathPattern=TutorialChoiceContext --watch
# Write all 5 test cases in one session
```

### Phase 1.1.2 (GREEN): Implementation tasks are sequential
```
T006 must complete before T007-T010
T007-T010 can theoretically run in parallel (different methods)
but recommend sequential for merge safety
```

### Phase 1.2.1 (RED): All tests can run in parallel
```bash
# Launch T015-T020 together (all write to same test file but different test cases)
npm test -- --testPathPattern=TutorialProductCard --watch
# Write all 6 test cases in one session
```

---

## Validation Checklist

- [x] All contracts have corresponding tests (localStorage contract covered in context tests)
- [x] All entities have model tasks (TutorialChoice → implicit in Context)
- [x] All tests come before implementation (T001-T005 before T006-T013, T015-T020 before T021-T027)
- [x] Parallel tasks truly independent (test writing tasks are parallelizable)
- [x] Each task specifies exact file path (all tasks have file paths)
- [x] No task modifies same file as another [P] task (test tasks write different test cases)

---

## Task Summary

**Total Tasks**: 31 (27 core + 4 validation)
**Estimated Time**: ~27 hours
**Story 1.1 Time**: ~7 hours
**Story 1.2 Time**: ~16 hours
**Validation Time**: ~4 hours

**TDD Breakdown**:
- RED Phase: 11 tasks (T001-T005, T015-T020)
- GREEN Phase: 11 tasks (T006-T011, T021-T025)
- REFACTOR Phase: 2 tasks (T012, T026)
- Validation: 7 tasks (T013, T014, T027-T031)

**Parallelization Opportunities**:
- T001-T005: Write all tests in parallel
- T015-T020: Write all tests in parallel
- T028-T029: Run regression tests in parallel

---

## Next Steps

1. **Review tasks**: Ensure understanding of each task before starting
2. **Use TodoWrite**: Track progress with TodoWrite tool during implementation
3. **Follow TDD strictly**: RED → GREEN → REFACTOR cycle enforced
4. **Run tests frequently**: Verify each task completion with test runs
5. **Commit often**: Commit after each task completion

---

**Tasks Status**: ✅ READY FOR EXECUTION

**Suggested Command**:
```bash
# Start with Story 1.1
cd frontend/react-Admin3
npm test -- --testPathPattern=TutorialChoiceContext --watch

# Track progress
# Use TodoWrite tool to mark tasks complete as you go
```
