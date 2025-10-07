# Tasks: Global Tutorial Summary Bars Architecture

**Input**: Design documents from `specs/001-docs-stories-epic/`
**Prerequisites**: plan-global-summary-bars.md, ARCHITECTURE_CORRECTION_GLOBAL_SUMMARY_BARS.md, data-model.md

**Branch**: `001-docs-stories-epic`
**Date**: 2025-10-07
**Estimated Total Time**: 12-14 hours

---

## ✅ Tasks Generation Complete

**Total Tasks**: 22 (T001-T022)
**Parallel Tasks**: 9 (T003-T009, T016-T017)
**Estimated Time**: 13-14 hours

---

## Quick Summary

### Phase Breakdown
- **Setup** (T001-T002): Verify baseline, audit cleanup - 0.5h
- **RED Tests** (T003-T009): Create 7 failing tests - 3.5h
- **GREEN Core** (T010-T014): Implement context + component - 5h
- **Integration** (T015-T017): App-level integration + tests - 2h
- **Polish** (T018-T022): Validation, cleanup, docs - 2.5h

### Critical Path
```
T001 → T003-T009[P] → T010 → T012 → T015 → T019 → T020 → T022
```

---

## All Tasks

### Phase 3.1: Setup (0.5 hours)

**T001**: Verify existing test suite passes (41/41 tests)
- Stage: VERIFY  
- Command: `npm test -- --testPathPattern=TutorialChoiceContext.test.js`
- Time: 0.25h
- Acceptance: Clean baseline

**T002**: Document incorrect files to be removed
- Stage: AUDIT
- Files: TutorialProductList.js, /tutorials route
- Time: 0.25h
- Acceptance: Cleanup checklist created

---

### Phase 3.2: Tests First - RED (3.5 hours)

**T003** [P]: Failing test - Container renders nothing when empty
- Stage: RED
- File: `TutorialSummaryBarContainer.test.js` (NEW)
- Test: `should render nothing when tutorialChoices is empty`
- Time: 0.5h
- Expected: FAIL

**T004** [P]: Failing test - Container renders bars for subjects
- Stage: RED
- File: `TutorialSummaryBarContainer.test.js`
- Test: `should render TutorialSelectionSummaryBar for each subject`
- Time: 0.5h
- Expected: FAIL

**T005** [P]: Failing test - handleAddToCart action
- Stage: RED
- File: `TutorialSummaryBarContainer.test.js`
- Test: `should call addToCart and markChoicesAsAdded`
- Time: 0.5h
- Expected: FAIL

**T006** [P]: Failing test - handleEdit action
- Stage: RED
- File: `TutorialSummaryBarContainer.test.js`
- Test: `should call openEditDialog with subject code`
- Time: 0.5h
- Expected: FAIL

**T007** [P]: Failing test - handleRemove action
- Stage: RED
- File: `TutorialSummaryBarContainer.test.js`
- Test: `should remove all draft choices`
- Time: 0.5h
- Expected: FAIL

**T008** [P]: Failing test - openEditDialog context method
- Stage: RED
- File: `TutorialChoiceContext.test.js`
- Test: `should set editDialogOpen`
- Time: 0.5h
- Expected: FAIL

**T009** [P]: Failing test - closeEditDialog context method
- Stage: RED
- File: `TutorialChoiceContext.test.js`
- Test: `should clear editDialogOpen`
- Time: 0.5h
- Expected: FAIL

---

### Phase 3.3: Core Implementation - GREEN (5 hours)

**T010**: Implement openEditDialog/closeEditDialog in context
- Stage: GREEN
- File: `TutorialChoiceContext.js`
- Makes pass: T008, T009
- Time: 1h
- Acceptance: 43/43 tests passing

**T011**: Update addTutorialChoice to accept product metadata
- Stage: GREEN
- File: `TutorialChoiceContext.js`
- Adds: productId, productName, subjectName fields
- Time: 0.5h
- Acceptance: Metadata stored in localStorage

**T012**: Implement TutorialSummaryBarContainer component
- Stage: GREEN
- File: `TutorialSummaryBarContainer.js` (NEW)
- Makes pass: T003-T007
- Handlers: handleEdit, handleAddToCart, handleRemove
- Time: 2h
- Acceptance: 48/48 tests passing

**T013**: Update TutorialProductCard to pass product metadata
- Stage: GREEN
- File: `TutorialProductCard.js`
- Update: All addTutorialChoice calls
- Time: 0.5h
- Acceptance: No missing metadata warnings

**T014**: Connect TutorialProductCard to context dialog state
- Stage: GREEN
- File: `TutorialProductCard.js`
- Read: editDialogOpen from context
- Time: 1h
- Acceptance: Edit button opens correct dialog

---

### Phase 3.4: Integration (2 hours)

**T015**: Integrate TutorialSummaryBarContainer in App.js
- Stage: GREEN
- File: `App.js` or `MainLayout.js`
- Add: Global container after Routes
- Time: 0.5h
- Acceptance: Bars visible on all routes

**T016** [P]: Integration test - cross-page visibility
- Stage: RED → GREEN
- File: `TutorialSummaryBarContainer.integration.test.js` (NEW)
- Test: `should remain visible when navigating`
- Time: 1h
- Acceptance: Test passes after T015

**T017** [P]: Integration test - vertical stacking
- Stage: RED → GREEN
- File: `TutorialSummaryBarContainer.integration.test.js`
- Test: `should stack vertically with gap`
- Time: 0.5h
- Acceptance: Flexbox layout verified

---

### Phase 3.5: Polish & Validation (2.5 hours)

**T018**: Run full test suite and verify coverage
- Stage: VERIFY
- Command: `npm test -- --coverage`
- Time: 0.5h
- Acceptance: 48+ tests, 80%+ coverage

**T019**: Manual validation with quickstart.md (6 tests)
- Stage: VERIFY
- Tests: Basic rendering, cross-page, stacking, cart, edit, remove
- Time: 1h
- Acceptance: All 6 manual tests pass

**T020**: Remove incorrect TutorialProductList.js
- Stage: CLEANUP
- Delete: TutorialProductList.js
- Update: Navigation routes
- Time: 0.5h
- Acceptance: No import errors, tests passing

**T021**: Update documentation
- Stage: DOCUMENTATION
- Files: CLAUDE.md, COMPLETION_NOTES.md
- Time: 0.5h
- Acceptance: Architecture documented

**T022**: Final test suite execution
- Stage: VERIFY
- Command: `npm test -- --verbose`
- Time: 0.5h
- Acceptance: 100% pass rate, no regressions

---

## Dependencies

### Dependency Graph
```
T001 → T002 → T003-T009[P] → T010 → T011 → T012 → T013 → T014 → T015 → T016-T017[P] → T018 → T019 → T020 → T021 → T022
```

### Blocking Relationships
- T010 blocks: T012, T014
- T011 blocks: T013
- T012 blocks: T015
- T015 blocks: T016, T019
- T019 blocks: T020

---

## Parallel Execution

### Round 1: All RED Tests (T003-T009)
All 7 tests can be written simultaneously:
- T003-T007: TutorialSummaryBarContainer tests
- T008-T009: Context method tests

### Round 2: Integration Tests (T016-T017)
After T015 complete, run in parallel:
- T016: Cross-page visibility test
- T017: Vertical stacking test

---

## TDD Workflow

1. **RED**: Write test → Run → FAIL ✅ → Commit
2. **GREEN**: Write code → Run → PASS ✅ → Commit  
3. **REFACTOR**: Improve → Run → PASS ✅ → Commit

---

## Estimated Timeline

| Phase | Duration |
|-------|----------|
| Setup | 0.5h |
| RED Tests | 3.5h |
| GREEN Core | 5h |
| Integration | 2h |
| Polish | 2.5h |
| **TOTAL** | **13-14h** |

---

**Status**: ✅ READY FOR EXECUTION

**Next Step**: Use TodoWrite to track tasks during implementation

---

*TDD Enforced: 🔴 RED → 🟢 GREEN → ♻️ REFACTOR*
