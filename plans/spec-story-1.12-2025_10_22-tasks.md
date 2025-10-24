# Tasks: Filter Validation Logic (Story 1.12)

**Input**: Design documents from `/Users/work/Documents/Code/Admin3/plans/spec-story-1.12-2025_10_22-plan.md`
**Branch**: `1.12-filter-validation`
**Prerequisites**: plan.md, contracts/FilterValidator.contract.js

## Execution Flow
```
1. Load plan.md from feature directory
   → Tech stack: React 18, JavaScript ES6+, Material-UI 5, Redux Toolkit
   → Structure: Frontend validation logic (Option 2)
2. Load contract: FilterValidator.contract.js
   → Extract validation rules and API methods
3. Generate tasks by phase:
   → Phase A: Validator Foundation (TDD)
   → Phase B: Redux Integration (state management)
   → Phase C: UI Integration (FilterPanel error display)
   → Phase D: API Call Prevention (useProductsSearch hook)
   → Phase E: Integration Testing (end-to-end verification)
4. Apply task rules:
   → Tests before implementation (strict TDD)
   → Sequential Redux integration (shared state)
   → Integration tests verify user flow
5. SUCCESS: 21 tasks ready for execution
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Phase 3.1: Setup
- [ ] **T001** Create validator file `frontend/react-Admin3/src/store/filters/filterValidator.js` with empty class stub
- [ ] **T002** Create test file `frontend/react-Admin3/src/store/filters/__tests__/filterValidator.test.js` with test suite structure

## Phase 3.2: Validator Foundation (TDD) ⚠️ Tests First

### RED Phase - Write Failing Tests
- [ ] **T003** [P] Write validateTutorialFormat tests in `filterValidator.test.js`:
  - returns error when tutorial_format set without tutorial=true
  - passes when tutorial_format set with tutorial=true
  - passes when tutorial_format not set
  - error message: "Tutorial format requires Tutorial Products filter"
  - suggestion: "Please check the 'Tutorial Products' filter"
- [ ] **T004** [P] Write validateDistanceLearning tests in `filterValidator.test.js`:
  - returns error when distance_learning=true with in_person format
  - passes when distance_learning=true with online format
  - passes when distance_learning=true with hybrid format
  - passes when distance_learning=false
  - error message: "Distance learning not available for in-person tutorials"
  - suggestion: "Select 'Online' or 'Hybrid' format instead"
- [ ] **T005** [P] Write validate() integration tests in `filterValidator.test.js`:
  - returns all applicable errors (multiple validation failures)
  - returns errors sorted by severity (errors before warnings)
  - returns empty array for valid filters
  - handles null/undefined filter values gracefully
- [ ] **T006** [P] Write helper method tests in `filterValidator.test.js`:
  - hasErrors returns true when error-severity issues exist
  - hasErrors returns false when only warnings exist
  - hasErrors returns false when no issues exist
  - getErrors returns only error-severity issues
  - getWarnings returns only warning-severity issues
- [ ] **T007** [P] Write performance tests in `filterValidator.test.js`:
  - validate() executes in < 5ms
  - validate() handles 10+ concurrent validations
  - validation doesn't block UI interactions

**GATE: Run tests and verify ALL FAIL before proceeding to GREEN phase**

### GREEN Phase - Implement Validator
- [ ] **T008** Implement FilterValidator class in `frontend/react-Admin3/src/store/filters/filterValidator.js`:
  - Implement validateTutorialFormat() rule
  - Implement validateDistanceLearning() rule
  - Implement validateProductGroups() placeholder (future)
  - Implement validate() orchestrator (runs all rules, sorts by severity)
  - Implement hasErrors(), getErrors(), getWarnings() helpers
  - Ensure < 5ms execution time (pure functions, no async)

**GATE: Run tests and verify ALL PASS before proceeding to Phase B**

## Phase 3.3: Redux Integration (State Management)

- [ ] **T009** Add validationErrors to Redux state in `frontend/react-Admin3/src/store/slices/filtersSlice.js`:
  - Add `validationErrors: []` to initialState
  - Import FilterValidator
  - Add validateFilters action (manual validation trigger)
  - Add clearValidationErrors action
  - Add selectValidationErrors selector
  - Add selectHasValidationErrors selector
- [ ] **T010** Update filter actions to auto-validate in `frontend/react-Admin3/src/store/slices/filtersSlice.js`:
  - Update toggleSubject reducer: add `state.validationErrors = FilterValidator.validate(state)`
  - Update toggleCategory reducer: add auto-validation
  - Update setProductTypes reducer: add auto-validation
  - Update setTutorialFormat reducer: add auto-validation
  - Update toggleDistanceLearning reducer: add auto-validation
  - Update toggleTutorial reducer: add auto-validation
  - Update all filter-changing reducers with auto-validation
- [ ] **T011** Write Redux integration tests in `frontend/react-Admin3/src/store/slices/__tests__/filtersSlice.validation.test.js`:
  - Setting tutorial_format without tutorial=true triggers validation error
  - Validation errors cleared when user fixes invalid combination
  - Multiple validation errors accumulated correctly
  - selectValidationErrors returns validation error array
  - selectHasValidationErrors returns true when errors exist

## Phase 3.4: UI Integration (FilterPanel Error Display)

- [ ] **T012** Update FilterPanel in `frontend/react-Admin3/src/components/Product/FilterPanel.js`:
  - Import Alert, AlertTitle, Stack from '@mui/material'
  - Import selectValidationErrors, clearValidationErrors from filtersSlice
  - Add useSelector hook to read validationErrors
  - Add validation error display section above filter sections:
    - Stack with spacing={1}
    - Alert component per error with severity={error.severity}
    - AlertTitle with error.message
    - Alert body with error.suggestion
    - onClose handler for dismissing errors
- [ ] **T013** Write FilterPanel UI integration tests in `frontend/react-Admin3/src/components/Product/__tests__/FilterPanel.validation.test.js`:
  - Displays Alert when validation error exists
  - Alert shows correct severity (error vs warning)
  - Alert shows error message as title
  - Alert shows suggestion as body
  - Multiple errors displayed in Stack
  - Errors sorted by severity (errors first)
  - Alert dismisses on close button click

## Phase 3.5: API Call Prevention (useProductsSearch Hook)

- [ ] **T014** Update useProductsSearch in `frontend/react-Admin3/src/hooks/useProductsSearch.js`:
  - Import selectHasValidationErrors from filtersSlice
  - Add hasValidationErrors to useSelector
  - Add validation check in executeSearch:
    ```javascript
    if (hasValidationErrors) {
      console.warn('Skipping API call due to filter validation errors');
      return;
    }
    ```
  - Update useCallback dependencies to include hasValidationErrors
- [ ] **T015** Write useProductsSearch validation tests in `frontend/react-Admin3/src/hooks/__tests__/useProductsSearch.validation.test.js`:
  - API call blocked when hasValidationErrors=true
  - API call proceeds when hasValidationErrors=false
  - Console warning logged when API call blocked
  - Hook re-runs when validation errors change

## Phase 3.6: Integration Testing (End-to-End)

- [ ] **T016** [P] Create integration test file `frontend/react-Admin3/tests/integration/filterValidation.integration.test.js`:
  - User selects tutorial_format without tutorial=true → error displayed
  - Error Alert shows in FilterPanel with correct message
  - User checks "Tutorial Products" filter → error disappears
  - User selects distance_learning + in_person → error displayed
  - User changes format to online → error disappears
  - Multiple errors display simultaneously with severity sorting
- [ ] **T017** [P] Write API blocking integration tests in `frontend/react-Admin3/tests/integration/filterValidation.integration.test.js`:
  - Apply invalid filter combination → verify API not called
  - Console warning present when API blocked
  - Fix validation error → verify API call proceeds
  - Verify no API calls made while validation errors exist

## Phase 3.7: Verification & Polish

- [ ] **T018** [P] Run full test suite and verify coverage:
  - Run `npm test -- filterValidator.test.js` (verify all validator tests pass)
  - Run `npm test -- filtersSlice.validation.test.js` (verify Redux integration)
  - Run `npm test -- FilterPanel.validation.test.js` (verify UI integration)
  - Run `npm test -- useProductsSearch.validation.test.js` (verify API prevention)
  - Run `npm test -- filterValidation.integration.test.js` (verify end-to-end)
  - Verify coverage ≥90% for filterValidator.js
- [ ] **T019** [P] Performance profiling and validation:
  - Measure validate() execution time (verify < 5ms)
  - Test validation with 10+ concurrent filter changes
  - Verify no UI lag when validation runs
  - Profile Redux state updates with validation
- [ ] **T020** [P] Manual UX testing scenarios:
  - Scenario 1: Tutorial Format Dependency
    - Select "Online" tutorial format → error appears
    - Check "Tutorial Products" → error disappears
  - Scenario 2: Distance Learning Incompatibility
    - Check "Tutorial Products"
    - Select "In-Person" tutorial format
    - Check "Distance Learning" → error appears
    - Change format to "Online" → error disappears
  - Scenario 3: Multiple Errors
    - Apply 2+ invalid combinations → verify all errors shown
    - Verify errors sorted (error severity before warning)
  - Scenario 4: API Blocking
    - Apply invalid filter → open Network tab
    - Verify no product search API call made
    - Fix validation → verify API call proceeds
- [ ] **T021** [P] Accessibility and error messaging review:
  - Verify Alert components have proper ARIA labels
  - Test with screen reader (error messages announced)
  - Verify keyboard navigation (focus on Alert, dismiss with Escape)
  - Review error messages for clarity and actionability
  - Test color contrast for warning/error alerts

## Dependencies
```
Phase 3.1 (Setup) → Phase 3.2 (Validator TDD) → Phase 3.3 (Redux) → Phase 3.4 (UI) → Phase 3.5 (API Prevention) → Phase 3.6 (Integration) → Phase 3.7 (Verification)

Detailed:
- T001-T002 (Setup) before T003-T007 (RED tests)
- T003-T007 (RED tests) must ALL FAIL before T008 (GREEN implementation)
- T008 (Validator implementation) before T009 (Redux integration)
- T009 (Redux state) before T010 (Auto-validation in reducers)
- T010 (Auto-validation) before T011 (Redux tests)
- T011 (Redux tests pass) before T012 (UI integration)
- T012 (FilterPanel updates) before T013 (UI tests)
- T013 (UI tests pass) before T014 (API prevention)
- T014 (API prevention) before T015 (API tests)
- T015 (API tests pass) before T016-T017 (Integration tests)
- T016-T017 (Integration tests pass) before T018-T021 (Final verification)
```

## Parallel Execution Examples
```bash
# Phase 3.2: RED Tests (all parallel - different test suites)
# Launch T003-T007 together:
Task: "Write validateTutorialFormat tests in filterValidator.test.js"
Task: "Write validateDistanceLearning tests in filterValidator.test.js"
Task: "Write validate() integration tests in filterValidator.test.js"
Task: "Write helper method tests in filterValidator.test.js"
Task: "Write performance tests in filterValidator.test.js"

# Phase 3.3-3.5: Implementation (sequential - shared state files)
# Must run one at a time: T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015

# Phase 3.6: Integration Tests (parallel - different test files)
# Launch T016-T017 together:
Task: "Create integration test file filterValidation.integration.test.js"
Task: "Write API blocking integration tests in filterValidation.integration.test.js"

# Phase 3.7: Final Verification (all parallel - independent checks)
# Launch T018-T021 together:
Task: "Run full test suite and verify coverage"
Task: "Performance profiling and validation"
Task: "Manual UX testing scenarios"
Task: "Accessibility and error messaging review"
```

## Success Metrics
- ✅ **Error Prevention**: Invalid API calls eliminated (zero empty result pages from validation-preventable issues)
- ✅ **User Guidance**: Clear, actionable error messages displayed
- ✅ **Real-time Feedback**: Validation runs on every filter change (< 5ms)
- ✅ **Test Coverage**: ≥90% for filterValidator.js
- ✅ **Performance**: < 5ms validation execution time (measured)
- ✅ **UX**: Automatic error correction (errors disappear when user fixes)

## Notes
- **Strict TDD**: Tests (T003-T007) MUST fail before implementation (T008)
- **[P] tasks**: Can run in parallel (different files, independent checks)
- **Sequential Redux integration**: Shared state requires sequential updates
- **UX Focus**: Error messages must be clear and actionable
- **Performance critical**: Validation must not slow UI interactions
- **Commit strategy**: Commit after each phase completion

## Validation Checklist
*GATE: Checked before marking story complete*

- [ ] All validator tests passing (T003-T007, 25-30 tests)
- [ ] Implementation passes all tests (T008)
- [ ] Redux integration complete (T009-T011)
- [ ] UI integration complete (T012-T013)
- [ ] API prevention complete (T014-T015)
- [ ] Integration tests passing (T016-T017)
- [ ] Coverage ≥90% for filterValidator.js (T018)
- [ ] Performance < 5ms verified (T019)
- [ ] Manual UX scenarios pass (T020)
- [ ] Accessibility verified (T021)
- [ ] Error messages clear and actionable
- [ ] No false positives (validation rules conservative)
