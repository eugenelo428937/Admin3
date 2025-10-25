# Implementation Plan: Filter Validation Logic

**Branch**: `1.12-filter-validation` | **Date**: 2025-10-22 | **Spec**: [spec-story-1.12-2025_10_22.md](../specs/spec-story-1.12-2025_10_22.md)
**Input**: Feature specification from `/specs/spec-story-1.12-2025_10_22.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Spec loaded successfully
2. Fill Technical Context
   → Project Type: web (React frontend with Redux state)
   → Structure Decision: Option 2 (frontend/backend split)
3. Constitution Check
   → No constitution file found, proceeding with CLAUDE.md guidelines
   → Business Logic Pattern: Validation rules separate from UI
   → User Experience: Prevent errors before they occur
4. Execute Phase 0 → Research validation patterns
   → Review existing validation in codebase
   → Research Material-UI Alert components
5. Execute Phase 1 → Design validator API and UI integration
   → Define FilterValidator class interface
   → Design validation error display strategy
6. Re-evaluate Constitution Check
   → User guidance improved ✓
   → Error prevention achieved ✓
7. Plan Phase 2 → Task generation approach documented
8. STOP - Ready for /tasks command
```

## Summary
Implement client-side validation logic framework to prevent users from selecting incompatible filter combinations before making product search API calls. This implementation adds a FilterValidator utility that validates filter state in real-time, displays clear error messages with actionable suggestions, and blocks API calls when validation errors exist.

**Primary Requirement**: Real-time filter validation with < 5ms execution time, blocking invalid API calls while providing clear user guidance

**Technical Approach**: Pure JavaScript validator utility with rule-based validation, Redux state integration for validation errors, Material-UI Alert components for error display

**⚠️ ARCHITECTURAL DECISION (2025-10-24)**: Tutorial-related filters (tutorial_format, distance_learning, tutorial) were removed from the filter state in previous implementation. The validator framework is built and tested but currently returns empty validation errors. This provides the architecture ready for future validation rules on existing filter fields:
- subjects
- categories
- product_types
- products
- modes_of_delivery

Example future validation rule: "Products must belong to selected product_types"

## Technical Context
**Language/Version**: JavaScript ES6+, React 18, Redux Toolkit, Material-UI 5
**Primary Dependencies**: React, Redux Toolkit (state management), Material-UI (Alert, AlertTitle components)
**Storage**: Redux state (validationErrors array)
**Testing**: Jest (unit tests for validator), React Testing Library (UI integration tests)
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: web - React frontend validation
**Performance Goals**: < 5ms validation execution time (real-time feedback)
**Constraints**: Non-blocking validation (doesn't slow filter changes), clear error messages
**Scale/Scope**: ~150-200 lines validator + tests, Redux state changes, FilterPanel UI changes

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### User Experience Principles (from CLAUDE.md)
- ✅ **Error Prevention**: Validate before API call, not after empty results
- ✅ **User Guidance**: Clear, actionable error messages
- ✅ **Real-time Feedback**: Immediate validation on filter changes
- ✅ **Non-Blocking**: Validation doesn't slow UI interactions
- ✅ **Graceful Degradation**: Warnings advise, errors block

### Code Quality Principles
- ✅ **Separation of Concerns**: Validation logic separate from UI
- ✅ **Testability**: Pure validator functions, fully unit-testable
- ✅ **Extensibility**: Easy to add new validation rules
- ✅ **Single Responsibility**: Validator handles validation only

**Status**: ✅ PASS - Validation improves UX and prevents user errors

## Project Structure

### Documentation (this feature)
```
specs/spec-story-1.12-2025_10_22/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (validation pattern research)
├── contracts/           # Phase 1 output (validator API contract)
│   └── FilterValidator.contract.js
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
frontend/react-Admin3/
├── src/
│   ├── store/
│   │   ├── filters/
│   │   │   ├── filterValidator.js              # NEW: Validation logic
│   │   │   └── __tests__/
│   │   │       └── filterValidator.test.js     # NEW: Validator tests
│   │   └── slices/
│   │       └── filtersSlice.js                 # MODIFY: Add validationErrors state
│   ├── components/
│   │   └── Product/
│   │       └── FilterPanel.js                  # MODIFY: Display validation errors
│   └── hooks/
│       └── useProductsSearch.js                # MODIFY: Check validation before API call
└── tests/
    └── integration/
        └── filterValidation.integration.test.js  # NEW: End-to-end validation tests
```

**Structure Decision**: Option 2 (web application) - Frontend validation logic

## Phase 0: Outline & Research
**Status**: Research validation patterns and UI components

### Research Tasks
1. **Review existing validation patterns in codebase**:
   - Search for existing validation logic
   - Document current error handling approaches
   - Identify validation best practices already in use

2. **Research Material-UI Alert components**:
   - Alert API and variants (error, warning, info)
   - AlertTitle for structured error messages
   - Dismissible alerts (onClose prop)
   - Severity-based styling

3. **Performance validation patterns**:
   - Fast validation techniques (< 5ms target)
   - When to run validation (after each change, debounced, on blur)
   - Memoization strategies for validation results

4. **Validation rule patterns**:
   - Rule 1: Dependency validation (A requires B)
   - Rule 2: Incompatibility validation (A incompatible with B)
   - Rule 3: Cross-field validation (products must match groups)

### Research Findings
```markdown
# research.md content:

## Existing Validation Patterns
- Form validation uses Material-UI TextField error prop
- API error handling shows Snackbar notifications
- No existing filter validation found

## Material-UI Alert Pattern
```javascript
import { Alert, AlertTitle, Stack } from '@mui/material';

<Stack spacing={1}>
  <Alert severity="error" onClose={handleDismiss}>
    <AlertTitle>Error Message Title</AlertTitle>
    Detailed error explanation with actionable suggestion.
  </Alert>
  <Alert severity="warning">
    <AlertTitle>Warning Message Title</AlertTitle>
    Advisory message that doesn't block action.
  </Alert>
</Stack>
```

## Validation Performance
- Pure function validation: < 1ms per rule
- Target: < 5ms total execution time
- Run validation after each filter change (synchronous)
- No debouncing needed (fast enough for real-time)

## Validation Rule Design

**NOTE**: Tutorial-related validation rules were removed as those filter fields no longer exist in the current implementation. The examples below are for reference and documentation of the validation framework architecture.

### Example Future Rule: Product/Product Type Dependency
```javascript
validateProductTypesDependency(filters) {
  if (filters.products.length > 0 && filters.product_types.length === 0) {
    return {
      field: 'products',
      message: 'Select a product type before selecting specific products',
      severity: 'warning',
      suggestion: 'Choose a product type to filter available products'
    };
  }
  return null;
}
```

### Example Future Rule: Category/Subject Compatibility
```javascript
validateCategorySubjectCompatibility(filters) {
  // Example: Validate certain categories only apply to specific subjects
  if (filters.categories.includes('Bundle') && filters.subjects.length === 0) {
    return {
      field: 'categories',
      message: 'Bundle category requires subject selection',
      severity: 'warning',
      suggestion: 'Please select a subject to view bundles'
    };
  }
  return null;
}
```

## Decision: Validation Strategy
- Run validation synchronously after each filter change
- Store validation results in Redux state
- Display errors in FilterPanel above filter sections
- Block API calls in useProductsSearch when errors exist
- Currently returns empty errors (no validation rules active)
- Framework ready for future validation rule implementation
```

**Output**: research.md with validation patterns and UI component research

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

### 1. FilterValidator API Contract
**File**: `contracts/FilterValidator.contract.js`

```javascript
/**
 * FilterValidator API Contract
 *
 * Client-side validation logic for filter combinations.
 * Prevents invalid filter combinations and provides user guidance.
 */

export const FilterValidatorContract = {
  // Core validation method
  validate: {
    signature: '(filters: FilterObject) => ValidationError[]',
    description: 'Validate complete filter state against all rules',
    performance: '< 5ms (target ~3ms)',
    returns: 'Array of validation errors (empty if valid)',
    sorting: 'Errors sorted by severity (errors first, then warnings)'
  },

  // Validation rule methods (called by validate())
  validateTutorialFormat: {
    signature: '(filters: FilterObject) => ValidationError[]',
    rule: 'tutorial_format requires tutorial=true',
    severity: 'error',
    returns: 'Empty array if valid, single error if invalid'
  },

  validateDistanceLearning: {
    signature: '(filters: FilterObject) => ValidationError[]',
    rule: 'distance_learning=true incompatible with tutorial_format=in_person',
    severity: 'error',
    returns: 'Empty array if valid, single error if invalid'
  },

  validateProductGroups: {
    signature: '(filters: FilterObject) => ValidationError[]',
    rule: 'products must belong to selected product_types (future)',
    severity: 'warning',
    returns: 'Empty array (placeholder for future implementation)'
  },

  // Helper methods
  hasErrors: {
    signature: '(filters: FilterObject) => boolean',
    description: 'Check if any error-severity issues exist',
    usage: 'Use to block API calls'
  },

  getErrors: {
    signature: '(filters: FilterObject) => ValidationError[]',
    description: 'Get only error-severity validation issues',
    usage: 'Display blocking errors separately'
  },

  getWarnings: {
    signature: '(filters: FilterObject) => ValidationError[]',
    description: 'Get only warning-severity validation issues',
    usage: 'Display advisory warnings separately'
  }
};

/**
 * ValidationError Type Definition
 */
export const ValidationErrorSchema = {
  field: 'string (filter type that has error)',
  message: 'string (human-readable error explanation)',
  severity: '"error" | "warning" (error blocks, warning advises)',
  suggestion: 'string (actionable instruction to fix)'
};
```

### 2. Redux State Integration
**File**: `src/store/slices/filtersSlice.js` (modifications)

```javascript
const initialState = {
  // ... existing filter state
  validationErrors: [],  // NEW: Array of ValidationError objects
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    // ... existing reducers

    // NEW: Run validation after filter changes
    toggleSubject: (state, action) => {
      const index = state.subjects.indexOf(action.payload);
      if (index === -1) {
        state.subjects.push(action.payload);
      } else {
        state.subjects.splice(index, 1);
      }
      // ADDED: Auto-validate after change
      state.validationErrors = FilterValidator.validate(state);
    },

    // Apply auto-validation to all filter actions:
    // - toggleCategory
    // - setProductTypes
    // - setTutorialFormat
    // - toggleDistanceLearning
    // - etc.

    // NEW: Manual validation action
    validateFilters: (state) => {
      state.validationErrors = FilterValidator.validate(state);
    },

    // NEW: Clear validation errors
    clearValidationErrors: (state) => {
      state.validationErrors = [];
    },
  },
});

// NEW: Selectors
export const selectValidationErrors = (state) => state.filters.validationErrors;
export const selectHasValidationErrors = (state) =>
  state.filters.validationErrors.some(error => error.severity === 'error');
```

### 3. FilterPanel UI Integration
**File**: `src/components/Product/FilterPanel.js` (modifications)

```javascript
import { Alert, AlertTitle, Stack } from '@mui/material';
import { selectValidationErrors } from '../../store/slices/filtersSlice';

const FilterPanel = () => {
  const validationErrors = useSelector(selectValidationErrors);

  return (
    <Box>
      {/* NEW: Validation errors display */}
      {validationErrors.length > 0 && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {validationErrors.map((error, index) => (
            <Alert
              key={index}
              severity={error.severity}
              onClose={() => dispatch(clearValidationErrors())}
            >
              <AlertTitle>{error.message}</AlertTitle>
              {error.suggestion}
            </Alert>
          ))}
        </Stack>
      )}

      {/* Existing filter sections */}
      {/* ... accordion sections ... */}
    </Box>
  );
};
```

### 4. API Call Prevention
**File**: `src/hooks/useProductsSearch.js` (modifications)

```javascript
import { selectHasValidationErrors } from '../store/slices/filtersSlice';

const useProductsSearch = () => {
  const hasValidationErrors = useSelector(selectHasValidationErrors);

  const executeSearch = useCallback(async () => {
    // NEW: Check validation before API call
    if (hasValidationErrors) {
      console.warn('Skipping API call due to filter validation errors');
      // Optional: Show user notification
      return;
    }

    // Proceed with API call
    try {
      const response = await apiCall(filters);
      // ... handle response
    } catch (error) {
      // ... handle error
    }
  }, [filters, hasValidationErrors]);

  // ... rest of hook
};
```

### 5. Test Suite Structure
**File**: `src/store/filters/__tests__/filterValidator.test.js`

```javascript
describe('FilterValidator', () => {
  describe('validateTutorialFormat', () => {
    test('returns error when tutorial_format set without tutorial=true')
    test('passes when tutorial_format set with tutorial=true')
    test('passes when tutorial_format not set')
  });

  describe('validateDistanceLearning', () => {
    test('returns error when distance_learning=true with in_person format')
    test('passes when distance_learning=true with online format')
    test('passes when distance_learning=true with hybrid format')
    test('passes when distance_learning=false')
  });

  describe('validate', () => {
    test('returns all applicable errors')
    test('returns errors sorted by severity (errors first)')
    test('returns empty array for valid filters')
  });

  describe('hasErrors', () => {
    test('returns true when errors exist')
    test('returns false when only warnings exist')
    test('returns false when no issues exist')
  });

  describe('Performance', () => {
    test('validate() executes in < 5ms')
    test('validate() handles 10+ concurrent validations')
  });
});

// Total: ~25-30 tests targeting ≥90% coverage
```

**Integration Tests**:
```javascript
describe('Filter Validation Integration', () => {
  test('displays error when tutorial format selected without tutorial products')
  test('error disappears when user checks tutorial products')
  test('API call blocked when validation errors exist')
  test('API call proceeds when validation errors cleared')
  test('multiple errors displayed with correct severity sorting')
});
```

### 6. No Data Model Changes
Redux adds validationErrors array to existing filter state - no backend changes.

### 7. No API Endpoints
Frontend validation only - no backend changes.

**Output**: Validator API contract, Redux integration, UI integration, test structure

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

### Task Generation Strategy
**TDD Approach with UI Integration**:

**Phase A: Validator Foundation** [TDD - tests first]
1. Create filterValidator.js (empty/stub)
2. Create filterValidator.test.js
3. Write validation rule tests (RED - tests fail)
4. Implement FilterValidator class (GREEN - make tests pass)
5. Write performance tests
6. Optimize if needed

**Phase B: Redux Integration** [State management]
7. Add validationErrors to filtersSlice initialState
8. Add validateFilters and clearValidationErrors actions
9. Add selectValidationErrors and selectHasValidationErrors selectors
10. Update filter actions to run validation automatically
11. Test Redux integration

**Phase C: UI Integration** [FilterPanel changes]
12. Import Material-UI Alert components
13. Add validation error display to FilterPanel
14. Style error alerts appropriately
15. Test error display with various error scenarios

**Phase D: API Call Prevention** [useProductsSearch hook]
16. Update useProductsSearch to check validation
17. Add console warning for blocked API calls
18. Test API call prevention

**Phase E: Integration Testing** [End-to-end verification]
19. Write integration tests (user applies invalid filters → sees errors → corrects → errors clear)
20. Manual testing (apply each validation rule, verify display and behavior)
21. Performance profiling (verify < 5ms execution time)

### Ordering Strategy
**TDD Order**:
1. RED: Write failing validation tests
2. GREEN: Implement validator to pass tests
3. INTEGRATE: Add to Redux, UI, API prevention
4. VERIFY: Integration tests + manual testing

**Estimated Output**: 18-22 numbered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD + UI integration)
**Phase 5**: Validation (run tests, verify ≥90% coverage, manual UX testing)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**Status**: No violations - validation improves UX

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A       | N/A        | N/A - Prevents user errors          |

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (validation patterns, UI components)
- [x] Phase 1: Design complete (validator API + UI integration)
- [x] Phase 2: Task planning complete (TDD + UI integration approach)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (UX improvement, error prevention)
- [x] Post-Design Constitution Check: PASS (clean validator API)
- [x] All NEEDS CLARIFICATION resolved (severity levels documented)
- [x] Complexity deviations documented (N/A - improves UX)

## Risk Mitigation

### Risk 1: Overly Strict Validation (False Positives)
**Mitigation**: Conservative validation rules + warning severity option
- Start with known invalid combinations only
- Use warning severity for uncertain cases
- Monitor user feedback and validation error rates in production
- Easy to relax rules if too strict

### Risk 2: Performance Impact (UI Lag)
**Mitigation**: Performance testing and optimization
- Target: < 5ms validation time
- Performance tests in test suite
- Profile if users report lag
- Debounce validation only if necessary

### Risk 3: Validation Out of Sync with Backend
**Mitigation**: Document validation rules + coordinate with backend
- Document all validation rules clearly
- Share with backend team to ensure alignment
- Monitor for cases where validation blocks valid searches
- Add override mechanism if needed (advanced)

## Success Metrics

### User Experience
- ✅ **Error Prevention**: Invalid API calls eliminated (zero empty result pages from validation-preventable issues)
- ✅ **User Guidance**: Clear, actionable error messages displayed
- ✅ **Real-time Feedback**: Validation runs on every filter change (< 5ms)
- ✅ **Automatic Correction**: Errors disappear when user fixes combination

### Code Quality
- ✅ **Test Coverage**: ≥90% for filterValidator.js
- ✅ **Performance**: < 5ms validation execution time (measured)
- ✅ **Separation of Concerns**: Validator separate from UI components
- ✅ **Extensibility**: Easy to add new validation rules

### Functional
- ✅ **API Call Blocking**: Error-severity validation blocks search
- ✅ **Warning Support**: Warning-severity validation advises but allows
- ✅ **Multiple Errors**: Multiple validation errors displayed correctly, severity-sorted

---
*Plan follows CLAUDE.md principles with focus on user experience and error prevention*
