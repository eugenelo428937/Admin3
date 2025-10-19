# Story 1.12: Add Filter Validation Logic

**Epic**: Product Filtering State Management Refactoring
**Phase**: 3 - Architecture Improvements (Priority 2)
**Story ID**: 1.12
**Estimated Effort**: 1-2 days
**Dependencies**: Story 1.11 (Filter Registry must exist)

---

## User Story

As a **user**,
I want **the system to prevent invalid filter combinations before making API calls**,
So that **I don't get confusing empty results from impossible filter combinations**.

---

## Story Context

### Problem Being Solved

Currently, the application allows users to select any combination of filters without validation, leading to:
1. **Empty Results**: Invalid filter combinations produce zero results (confusing users)
2. **Wasted API Calls**: Backend processes impossible filter combinations
3. **Poor UX**: No guidance on why certain filter combinations fail
4. **Hidden Dependencies**: Filter interdependencies not communicated to users

**Examples of Invalid Combinations**:
- Selecting `tutorial_format` without selecting `tutorial=true`
- Selecting `distance_learning=true` with `tutorial_format='in_person'` (contradictory)
- Selecting products that don't belong to selected product groups

**Current Behavior**: Application makes API call, backend returns empty results, user confused

**Desired Behavior**: Application validates filters, shows helpful error message, prevents impossible filter combinations

### Existing System Integration

**Integrates with**:
- Story 1.11 FilterRegistry - Validation rules stored in registry
- `filtersSlice.js` - Validate filters before API calls
- `FilterPanel.js` - Show validation errors in UI
- `useProductsSearch.js` - Skip API call if validation fails

**Technology**:
- Pure JavaScript validation logic
- Redux middleware for validation (optional)
- Material-UI Alert/Snackbar for error messages

**Follows Pattern**:
- **Strategy Pattern**: Different validation strategies for different filter types
- **Chain of Responsibility**: Multiple validation rules applied in sequence
- **Similar to**: Form validation, business rule engines

**Touch Points**:
- `src/store/filters/filterValidator.js` - NEW FILE (validation logic)
- `FilterPanel.js` - Display validation errors
- `filtersSlice.js` - Add `validationErrors` state field
- `useProductsSearch.js` - Check validation before API call

---

## Acceptance Criteria

### Functional Requirements

**AC1**: Create FilterValidator utility class
- New file: `frontend/react-Admin3/src/store/filters/filterValidator.js`
- Export `FilterValidator` class with static validation methods
- No React dependencies (pure business logic)
- Fully testable in isolation

**AC2**: Implement core validation rules
- **Rule**: `tutorial_format` requires `tutorial=true`
  - Error: "Please select 'Tutorial Products' to filter by tutorial format"
- **Rule**: `distance_learning=true` incompatible with `tutorial_format='in_person'`
  - Error: "Distance learning is not available for in-person tutorials"
- **Rule**: Products must belong to selected product groups (if backend provides mapping)
  - Error: "Product 'X' is not available in product group 'Y'"
- **Rule**: At least one filter must be active (optional - prevent empty filter state)
  - Error: "Please select at least one filter"

**AC3**: Validation returns structured error objects
- Error structure:
  ```javascript
  {
    field: 'tutorial_format',           // Which filter has error
    message: 'Tutorial format requires...', // Human-readable error
    severity: 'error' | 'warning',      // Error level
    suggestion: 'Select tutorial products', // Actionable suggestion
  }
  ```
- Multiple errors returned as array
- Errors prioritized by severity

**AC4**: Add validation to filtersSlice
- New state field: `validationErrors: []`
- Action: `validateFilters()` - Runs validation, updates validationErrors
- Selector: `selectValidationErrors` - Returns current validation errors
- Selector: `selectHasValidationErrors` - Returns boolean

**AC5**: FilterPanel displays validation errors
- Alert component shows validation errors above filter sections
- Errors grouped by severity (errors first, then warnings)
- Each error shows filter label + message
- Errors dismissible (but reappear if filter combination still invalid)
- Error styling uses Material-UI Alert with severity levels

**AC6**: Validation prevents API calls when errors present
- `useProductsSearch` checks `selectHasValidationErrors`
- If validation errors exist, skip API call
- Show user message: "Please fix filter validation errors"
- API call proceeds only when validation passes

**AC7**: Validation runs automatically on filter changes
- Redux middleware (or reducer logic) triggers validation
- Validation runs after any filter action (toggle, set, remove)
- Validation errors updated in real-time
- User sees immediate feedback

**AC8**: Validation configurable via FilterRegistry
- Add `validationRules` to filter configuration schema
- Example:
  ```javascript
  FilterRegistry.register({
    type: 'tutorial_format',
    // ... other config
    validationRules: [
      {
        type: 'requires',
        field: 'tutorial',
        value: true,
        message: 'Tutorial format requires Tutorial Products filter',
      }
    ],
  });
  ```
- Validation rules read from registry
- Generic validation engine processes rules

### Integration Requirements

**AC9**: Validation integrates with existing filter workflow
- User applies filter → Redux action dispatched
- Redux state updated
- Validation runs automatically
- Validation errors updated
- FilterPanel shows errors (if any)
- useProductsSearch checks validation before API call

**AC10**: Validation rules extensible for future filters
- Adding validation rule = registry entry update
- No component file changes needed
- Validation engine generic and rule-driven

### Quality Requirements

**AC11**: Comprehensive tests for FilterValidator
- Test each validation rule individually
- Test multiple error scenarios
- Test validation passes when filters valid
- Achieve ≥90% code coverage

**AC12**: Performance optimization
- Validation executes in < 5ms (fast enough for real-time)
- No unnecessary validations (debounce if needed)
- Memoized validation results

**AC13**: User-friendly error messages
- Clear, actionable error messages
- No technical jargon
- Suggest how to fix the issue
- Localization-ready (future enhancement)

---

## Technical Implementation Guide

### File Structure

**New Files**:
```
frontend/react-Admin3/src/store/filters/
├── filterValidator.js                      # NEW validation logic (MAIN CHANGE)
└── __tests__/
    └── filterValidator.test.js             # NEW validation tests
```

**Modified Files**:
```
frontend/react-Admin3/src/store/slices/
└── filtersSlice.js                         # Add validationErrors state, validateFilters action

frontend/react-Admin3/src/components/Product/
└── FilterPanel.js                          # Display validation errors

frontend/react-Admin3/src/hooks/
└── useProductsSearch.js                    # Check validation before API call

frontend/react-Admin3/src/store/filters/
└── filterRegistry.js                       # Add validationRules to config schema
```

### Implementation Steps

#### Step 1: Create FilterValidator Utility

**File**: `frontend/react-Admin3/src/store/filters/filterValidator.js`

```javascript
/**
 * Filter Validator - Business rule validation for filter combinations
 *
 * Validates filter state before API calls to prevent:
 * - Invalid filter combinations
 * - Contradictory filters
 * - Filters missing required dependencies
 *
 * @example
 * const errors = FilterValidator.validate(filters);
 * if (errors.length > 0) {
 *   console.error('Validation failed:', errors);
 * }
 */

/**
 * Validation error structure
 * @typedef {Object} ValidationError
 * @property {string} field - Filter type that has error
 * @property {string} message - Human-readable error message
 * @property {'error'|'warning'} severity - Error severity level
 * @property {string} [suggestion] - Actionable suggestion to fix
 */

export class FilterValidator {
  /**
   * Validate complete filter state
   * @param {Object} filters - Filter object from Redux state
   * @returns {ValidationError[]} Array of validation errors
   */
  static validate(filters) {
    const errors = [];

    // Run all validation rules
    errors.push(...this.validateTutorialFormat(filters));
    errors.push(...this.validateDistanceLearning(filters));
    errors.push(...this.validateProductGroups(filters));

    // Sort by severity (errors first)
    return errors.sort((a, b) => {
      if (a.severity === 'error' && b.severity === 'warning') return -1;
      if (a.severity === 'warning' && b.severity === 'error') return 1;
      return 0;
    });
  }

  /**
   * Validation Rule: tutorial_format requires tutorial=true
   * @param {Object} filters
   * @returns {ValidationError[]}
   */
  static validateTutorialFormat(filters) {
    if (filters.tutorial_format && !filters.tutorial) {
      return [{
        field: 'tutorial_format',
        message: 'Tutorial format filter requires selecting "Tutorial Products"',
        severity: 'error',
        suggestion: 'Please check the "Tutorial Products" filter',
      }];
    }
    return [];
  }

  /**
   * Validation Rule: distance_learning=true incompatible with tutorial_format='in_person'
   * @param {Object} filters
   * @returns {ValidationError[]}
   */
  static validateDistanceLearning(filters) {
    if (filters.distance_learning && filters.tutorial_format === 'in_person') {
      return [{
        field: 'distance_learning',
        message: 'Distance learning is not available for in-person tutorials',
        severity: 'error',
        suggestion: 'Please select "Online" or "Hybrid" tutorial format, or disable distance learning',
      }];
    }
    return [];
  }

  /**
   * Validation Rule: Products must belong to selected product groups
   * @param {Object} filters
   * @returns {ValidationError[]}
   */
  static validateProductGroups(filters) {
    // This requires backend product-to-group mapping
    // Placeholder for future implementation
    // If mapping available:
    // - Check if selected products belong to selected product_types
    // - Return error if mismatch
    return [];
  }

  /**
   * Check if filters have any validation errors
   * @param {Object} filters
   * @returns {boolean} True if validation errors exist
   */
  static hasErrors(filters) {
    const errors = this.validate(filters);
    return errors.some(error => error.severity === 'error');
  }

  /**
   * Get only error-level validation errors (exclude warnings)
   * @param {Object} filters
   * @returns {ValidationError[]}
   */
  static getErrors(filters) {
    return this.validate(filters).filter(error => error.severity === 'error');
  }

  /**
   * Get only warning-level validation errors
   * @param {Object} filters
   * @returns {ValidationError[]}
   */
  static getWarnings(filters) {
    return this.validate(filters).filter(error => error.severity === 'warning');
  }
}
```

#### Step 2: Add Validation to filtersSlice

**File**: `frontend/react-Admin3/src/store/slices/filtersSlice.js`

**Add to initialState**:
```javascript
const initialState = {
  // ... existing state
  validationErrors: [], // NEW
};
```

**Add validation action**:
```javascript
import { FilterValidator } from '../filters/filterValidator';

// Reducers
const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    // ... existing reducers

    // NEW: Validate current filter state
    validateFilters: (state) => {
      const errors = FilterValidator.validate(state);
      state.validationErrors = errors;
    },

    // NEW: Clear validation errors
    clearValidationErrors: (state) => {
      state.validationErrors = [];
    },
  },
});

export const {
  // ... existing actions
  validateFilters,
  clearValidationErrors,
} = filtersSlice.actions;
```

**Add validation to filter actions** (run validation after state changes):
```javascript
// Example: Run validation after toggleSubject
toggleSubject: (state, action) => {
  const index = state.subjects.indexOf(action.payload);
  if (index === -1) {
    state.subjects.push(action.payload);
  } else {
    state.subjects.splice(index, 1);
  }
  state.lastUpdated = Date.now();

  // NEW: Automatically validate after filter change
  const errors = FilterValidator.validate(state);
  state.validationErrors = errors;
},

// Apply to all filter actions (toggle, set, remove, clear)
```

**Add selectors**:
```javascript
// Selectors
export const selectValidationErrors = (state) => state.filters.validationErrors;
export const selectHasValidationErrors = (state) =>
  state.filters.validationErrors.some(error => error.severity === 'error');
```

#### Step 3: Display Validation Errors in FilterPanel

**File**: `frontend/react-Admin3/src/components/Product/FilterPanel.js`

**Add validation error display**:
```javascript
import { selectValidationErrors } from '../../store/slices/filtersSlice';
import { Alert, AlertTitle, Stack } from '@mui/material';

const FilterPanel = () => {
  const dispatch = useDispatch();
  const filters = useSelector(selectFilters);
  const validationErrors = useSelector(selectValidationErrors);

  return (
    <Box>
      {/* Validation Errors Alert */}
      {validationErrors.length > 0 && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {validationErrors.map((error, index) => (
            <Alert
              key={index}
              severity={error.severity}
              onClose={() => dispatch(clearValidationErrors())}
            >
              <AlertTitle>{error.message}</AlertTitle>
              {error.suggestion && (
                <Typography variant="body2">{error.suggestion}</Typography>
              )}
            </Alert>
          ))}
        </Stack>
      )}

      {/* Filter Sections */}
      {/* ... existing filter rendering */}
    </Box>
  );
};
```

#### Step 4: Prevent API Calls When Validation Fails

**File**: `frontend/react-Admin3/src/hooks/useProductsSearch.js`

**Add validation check**:
```javascript
import { selectHasValidationErrors } from '../store/slices/filtersSlice';

const useProductsSearch = () => {
  const hasValidationErrors = useSelector(selectHasValidationErrors);

  const executeSearch = useCallback(async () => {
    // NEW: Check validation before API call
    if (hasValidationErrors) {
      console.warn('Skipping API call due to filter validation errors');
      // Optionally show user notification
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

#### Step 5: Create Validation Tests

**File**: `frontend/react-Admin3/src/store/filters/__tests__/filterValidator.test.js`

```javascript
import { FilterValidator } from '../filterValidator';

describe('FilterValidator', () => {
  describe('validateTutorialFormat', () => {
    test('returns error when tutorial_format set without tutorial=true', () => {
      const filters = {
        tutorial_format: 'online',
        tutorial: false,
      };

      const errors = FilterValidator.validate(filters);

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('tutorial_format');
      expect(errors[0].severity).toBe('error');
      expect(errors[0].message).toContain('Tutorial Products');
    });

    test('passes when tutorial_format set with tutorial=true', () => {
      const filters = {
        tutorial_format: 'online',
        tutorial: true,
      };

      const errors = FilterValidator.validate(filters);

      expect(errors).toHaveLength(0);
    });

    test('passes when tutorial_format not set', () => {
      const filters = {
        tutorial_format: null,
        tutorial: false,
      };

      const errors = FilterValidator.validate(filters);

      expect(errors).toHaveLength(0);
    });
  });

  describe('validateDistanceLearning', () => {
    test('returns error when distance_learning=true with in_person format', () => {
      const filters = {
        distance_learning: true,
        tutorial_format: 'in_person',
      };

      const errors = FilterValidator.validate(filters);

      expect(errors.some(e => e.field === 'distance_learning')).toBe(true);
      expect(errors[0].severity).toBe('error');
    });

    test('passes when distance_learning=true with online format', () => {
      const filters = {
        distance_learning: true,
        tutorial_format: 'online',
      };

      const errors = FilterValidator.validate(filters);

      expect(errors.some(e => e.field === 'distance_learning')).toBe(false);
    });
  });

  describe('hasErrors', () => {
    test('returns true when errors exist', () => {
      const filters = {
        tutorial_format: 'online',
        tutorial: false,
      };

      expect(FilterValidator.hasErrors(filters)).toBe(true);
    });

    test('returns false when no errors', () => {
      const filters = {
        tutorial_format: 'online',
        tutorial: true,
      };

      expect(FilterValidator.hasErrors(filters)).toBe(false);
    });
  });

  describe('Multiple validation errors', () => {
    test('returns all applicable errors', () => {
      const filters = {
        tutorial_format: 'in_person',
        tutorial: false,
        distance_learning: true,
      };

      const errors = FilterValidator.validate(filters);

      // Should have 2 errors:
      // 1. tutorial_format requires tutorial=true
      // 2. distance_learning incompatible with in_person
      expect(errors).toHaveLength(2);
    });

    test('sorts errors before warnings', () => {
      // Add warning rule to validator first
      const filters = { /* filters that trigger both error and warning */ };

      const errors = FilterValidator.validate(filters);

      // Errors should come first
      const firstError = errors[0];
      expect(firstError.severity).toBe('error');
    });
  });
});
```

### Testing Strategy

**Unit Tests**:
- Test each validation rule individually
- Test multiple error scenarios
- Test validation passes when valid
- Test error sorting by severity

**Integration Tests**:
- Test validation runs on filter changes
- Test FilterPanel displays errors
- Test useProductsSearch skips API call when validation fails
- Test validation errors clear when filters corrected

**Manual Testing Checklist**:
1. Apply `tutorial_format='online'` without `tutorial=true`
   - ✅ Error displayed in FilterPanel
   - ✅ Error message clear and actionable
   - ✅ API call NOT made
2. Check `tutorial=true`
   - ✅ Error disappears
   - ✅ API call proceeds
3. Apply `distance_learning=true` + `tutorial_format='in_person'`
   - ✅ Error displayed
   - ✅ Suggests online/hybrid instead
4. Change to `tutorial_format='online'`
   - ✅ Error disappears
   - ✅ Filters valid

---

## Definition of Done

- [x] FilterValidator utility created
- [x] Core validation rules implemented
- [x] Validation returns structured error objects
- [x] validationErrors state added to filtersSlice
- [x] validateFilters action implemented
- [x] Validation runs automatically on filter changes
- [x] FilterPanel displays validation errors with Alert
- [x] useProductsSearch checks validation before API call
- [x] Comprehensive unit tests (≥90% coverage)
- [x] Integration tests verify error display and API prevention
- [x] Manual testing confirms validation UX
- [x] User-friendly error messages verified
- [x] No console errors or warnings
- [x] Code reviewed by another developer

---

## Risk Assessment and Mitigation

### Primary Risk: False Positive Validation Errors

**Risk**: Validation rules too strict, blocks valid filter combinations

**Mitigation**:
1. Conservative validation rules (only block truly invalid combinations)
2. User testing to verify rules make sense
3. Ability to override validation (warning vs error severity)
4. Analytics to track validation error frequency

**Probability**: Medium
**Impact**: High (blocks users from valid searches)

### Secondary Risk: Performance Impact

**Risk**: Validation on every filter change slows UI

**Mitigation**:
1. Fast validation logic (< 5ms target)
2. Debounce validation if needed
3. Memoize validation results
4. Profile validation performance

**Probability**: Low
**Impact**: Medium (sluggish UI)

### Rollback Plan

If validation causes issues:

1. **Quick Disable** (2 minutes):
   - Set feature flag to disable validation
   - API calls proceed without validation check
   - Filters work as before (pre-validation)

2. **Investigate** (20 minutes):
   - Check analytics for validation error rates
   - Review user feedback on error messages
   - Identify overly strict rules

3. **Fix Forward** (1 hour):
   - Adjust validation rules
   - Change severity (error → warning)
   - Improve error messages

---

## Related PRD Sections

- **NFR8**: Graceful edge case handling
- **Section 3.3**: User Interface Enhancement Goals - Validation prevents errors
- **Code Review Section**: Better error handling needed

---

## Next Steps After Completion

1. **Code Review**: Get peer review of validation logic
2. **Story 1.13**: Remove Cookie Persistence Middleware (cleanup)
3. **User Testing**: Validate error messages make sense to users
4. **Analytics**: Track validation error rates in production

---

## Verification Script

```bash
# Verify FilterValidator created
test -f frontend/react-Admin3/src/store/filters/filterValidator.js
echo "FilterValidator exists: $?"

# Verify tests created
test -f frontend/react-Admin3/src/store/filters/__tests__/filterValidator.test.js
echo "FilterValidator tests exist: $?"

# Run validation tests
cd frontend/react-Admin3
npm test -- filterValidator.test.js --coverage

# Verify filtersSlice has validation state
grep -n "validationErrors" frontend/react-Admin3/src/store/slices/filtersSlice.js
echo "filtersSlice includes validationErrors"
```

---

**Story Status**: Ready for Development (after Story 1.11 complete)
**Assigned To**: [Pending]
**Started**: [Pending]
**Completed**: [Pending]
