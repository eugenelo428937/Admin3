# Story 1.2: Extend FiltersSlice with Navbar Filter State

**Epic**: Product Filtering State Management Refactoring
**Phase**: 1 - Critical Fixes (Priority 0)
**Story ID**: 1.2
**Estimated Effort**: 1-2 days
**Dependencies**: None (can develop in parallel with Story 1.1)

---

## User Story

As a **developer**,
I want **navbar filters (tutorial_format, distance_learning, tutorial) added to Redux state**,
so that **all filters are managed in a single source of truth**.

---

## Story Context

### Problem Being Solved

Currently, navbar filters bypass Redux entirely and are extracted directly from URL parameters in `useProductsSearch.js` (lines 91-99). This creates:
- **Hidden filters**: Users can't see these filters in FilterPanel or ActiveFilters
- **Dual filter systems**: Both Redux filters and navbarFilters sent to API separately
- **Inconsistent state**: No single source of truth for filter state

This story consolidates navbar filters into Redux, making them visible and manageable like all other filters.

### Existing System Integration

**Integrates with**:
- `filtersSlice.js` (Redux state management for filters)
- Story 1.1 middleware (will sync navbar filters to URL)
- Story 1.4 `useProductsSearch` hook (will use Redux instead of URL parsing)
- Story 1.7 FilterPanel (will display navbar filter sections)
- Story 1.8 ActiveFilters (will display navbar filter chips)

**Technology**:
- Redux Toolkit (RTK) with Immer for immutable updates
- Redux slice pattern with action creators and selectors

**Follows Pattern**:
- Existing filter state structure in `filtersSlice.js`
- Existing action creator naming: `set*`, `toggle*`, `clear*`
- Existing selector pattern: `selectFilters`, `selectFilterCounts`

**Touch Points**:
- Redux state shape (add new fields)
- Action creators (add new actions)
- Selectors (include navbar filters in output)
- Initial state (add navbar filter defaults)

---

## Acceptance Criteria

### Functional Requirements

**AC1**: Add `tutorial_format: null` to filtersSlice initial state
- New state field for tutorial format selection (online, intensive, etc.)
- Default value: `null` (no tutorial format selected)
- Type: String or null

**AC2**: Add `distance_learning: false` to filtersSlice initial state
- New state field for distance learning filter (boolean flag)
- Default value: `false` (distance learning not selected)
- Type: Boolean

**AC3**: Add `tutorial: false` to filtersSlice initial state
- New state field for tutorial filter (boolean flag)
- Default value: `false` (tutorial not selected)
- Type: Boolean

**AC4**: Create `setTutorialFormat` action creator
- Action: `setTutorialFormat(state, action)`
- Payload: String value (tutorial format name) or null
- Sets `state.tutorial_format = action.payload`
- Updates `state.lastUpdated = Date.now()`

**AC5**: Create `toggleDistanceLearning` action creator
- Action: `toggleDistanceLearning(state)`
- No payload (toggles current value)
- Sets `state.distance_learning = !state.distance_learning`
- Updates `state.lastUpdated = Date.now()`

**AC6**: Create `toggleTutorial` action creator
- Action: `toggleTutorial(state)`
- No payload (toggles current value)
- Sets `state.tutorial = !state.tutorial`
- Updates `state.lastUpdated = Date.now()`

**AC7**: Create `setNavbarFilters` batch action for setting multiple navbar filters
- Action: `setNavbarFilters(state, action)`
- Payload: Object with optional keys: `{ tutorial_format, distance_learning, tutorial }`
- Updates only provided fields (doesn't clear unprovided fields)
- Updates `state.lastUpdated = Date.now()`
- Useful for Story 1.6 when parsing URL on page load

**AC8**: Update `clearAllFilters` action to reset navbar filters to initial state
- Existing action already clears subjects, categories, product_types, etc.
- Extend to also clear: `tutorial_format = null`, `distance_learning = false`, `tutorial = false`
- Updates `state.lastUpdated = Date.now()`

**AC9**: Existing selectors (`selectFilters`) include navbar filters in output
- `selectFilters(state)` returns object including navbar filter fields
- Output format:
  ```javascript
  {
    subjects: [...],
    categories: [...],
    product_types: [...],
    products: [...],
    modes_of_delivery: [...],
    tutorial_format: null,      // NEW
    distance_learning: false,   // NEW
    tutorial: false,            // NEW
    searchQuery: '',
    currentPage: 1,
    pageSize: 20,
    lastUpdated: 1234567890
  }
  ```

**AC10**: Unit tests verify navbar filter actions and state updates
- Test suite: `filtersSlice.test.js` (extend existing tests)
- Test cases:
  - Initial state includes navbar filters with correct defaults
  - `setTutorialFormat` updates tutorial_format field
  - `toggleDistanceLearning` toggles boolean value
  - `toggleTutorial` toggles boolean value
  - `setNavbarFilters` batch updates multiple fields
  - `clearAllFilters` resets navbar filters to defaults
  - Selectors return navbar filters

### Integration Requirements

**AC11**: Existing filter actions (setSubjects, toggleCategory) continue working
- No breaking changes to existing action creators
- Existing reducers update their respective fields unchanged
- Redux state shape remains backward compatible (additive only)

**AC12**: Existing selectors return navbar filters alongside current filters
- `selectFilters` includes new fields automatically
- Components using `selectFilters` receive extended object
- No changes required to selector usage in components (additive fields)

**AC13**: Redux store configuration loads without errors
- Redux DevTools shows new state fields correctly
- Initial state hydration works properly
- No type errors or warnings in console

### Quality Requirements

**AC14**: Code follows existing Redux Toolkit patterns
- Use Immer for immutable updates (automatic in RTK)
- Action creator naming consistent: `set*`, `toggle*` prefixes
- State updates include `lastUpdated` timestamp like existing actions

**AC15**: JSDoc comments added for new action creators
- Document action purpose, payload format, and example usage
- Match documentation style of existing actions

**AC16**: Tests cover edge cases
- Test toggling distance_learning multiple times
- Test setting tutorial_format to null (clearing)
- Test batch update with partial fields

---

## Technical Implementation Guide

### File Structure

**Modified Files**:
```
frontend/react-Admin3/src/store/slices/
├── filtersSlice.js                    # Add navbar filter state and actions
└── __tests__/
    └── filtersSlice.test.js           # Extend test suite
```

### Implementation Steps

#### Step 1: Extend Initial State

**File**: `frontend/react-Admin3/src/store/slices/filtersSlice.js`

**Find the existing initialState** (around line 10-20):
```javascript
const initialState = {
  subjects: [],
  categories: [],
  product_types: [],
  products: [],
  modes_of_delivery: [],
  searchQuery: '',
  currentPage: 1,
  pageSize: 20,
  isLoading: false,
  error: null,
  filterCounts: {},
  lastUpdated: null,
};
```

**Add navbar filter fields**:
```javascript
const initialState = {
  subjects: [],
  categories: [],
  product_types: [],
  products: [],
  modes_of_delivery: [],

  // NEW: Navbar filters (Phase 1 - Story 1.2)
  tutorial_format: null,        // Tutorial format selection (string or null)
  distance_learning: false,     // Distance learning flag (boolean)
  tutorial: false,              // Tutorial flag (boolean)

  searchQuery: '',
  currentPage: 1,
  pageSize: 20,
  isLoading: false,
  error: null,
  filterCounts: {},
  lastUpdated: null,
};
```

#### Step 2: Add Action Creators

**Find the reducers section** in `createSlice` (around line 30-250):

**Add navbar filter actions** (add after existing filter actions):
```javascript
export const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    // ... existing actions (setSubjects, toggleCategory, etc.)

    /**
     * Set tutorial format filter
     * @param {Object} action.payload - Tutorial format value (string) or null to clear
     */
    setTutorialFormat: (state, action) => {
      state.tutorial_format = action.payload;
      state.lastUpdated = Date.now();
    },

    /**
     * Toggle distance learning filter
     */
    toggleDistanceLearning: (state) => {
      state.distance_learning = !state.distance_learning;
      state.lastUpdated = Date.now();
    },

    /**
     * Toggle tutorial filter
     */
    toggleTutorial: (state) => {
      state.tutorial = !state.tutorial;
      state.lastUpdated = Date.now();
    },

    /**
     * Set multiple navbar filters at once (batch operation)
     * Useful for URL parsing or bulk updates
     * @param {Object} action.payload - Object with optional keys: { tutorial_format, distance_learning, tutorial }
     */
    setNavbarFilters: (state, action) => {
      const { tutorial_format, distance_learning, tutorial } = action.payload;

      if (tutorial_format !== undefined) {
        state.tutorial_format = tutorial_format;
      }

      if (distance_learning !== undefined) {
        state.distance_learning = distance_learning;
      }

      if (tutorial !== undefined) {
        state.tutorial = tutorial;
      }

      state.lastUpdated = Date.now();
    },

    // ... rest of existing actions
  },
});
```

#### Step 3: Update clearAllFilters Action

**Find the existing clearAllFilters action** (around line 220-230):
```javascript
clearAllFilters: (state) => {
  state.subjects = [];
  state.categories = [];
  state.product_types = [];
  state.products = [];
  state.modes_of_delivery = [];
  state.searchQuery = '';
  state.currentPage = 1;
  state.lastUpdated = Date.now();
},
```

**Add navbar filter clearing**:
```javascript
clearAllFilters: (state) => {
  state.subjects = [];
  state.categories = [];
  state.product_types = [];
  state.products = [];
  state.modes_of_delivery = [];

  // NEW: Clear navbar filters
  state.tutorial_format = null;
  state.distance_learning = false;
  state.tutorial = false;

  state.searchQuery = '';
  state.currentPage = 1;
  state.lastUpdated = Date.now();
},
```

#### Step 4: Export New Actions

**Find the export statement** (bottom of file):
```javascript
export const {
  setSubjects,
  toggleCategory,
  setMultipleFilters,
  clearAllFilters,
  // ... other existing actions
} = filtersSlice.actions;
```

**Add navbar filter actions**:
```javascript
export const {
  setSubjects,
  toggleCategory,
  setMultipleFilters,
  clearAllFilters,
  // ... other existing actions

  // NEW: Navbar filter actions (Story 1.2)
  setTutorialFormat,
  toggleDistanceLearning,
  toggleTutorial,
  setNavbarFilters,
} = filtersSlice.actions;
```

#### Step 5: Verify Selectors

**Check existing selectFilters selector** (usually at bottom of file):
```javascript
// Selectors
export const selectFilters = (state) => state.filters;
export const selectFilterCounts = (state) => state.filters.filterCounts;
```

**No changes needed** - `selectFilters` returns entire state object, which now includes navbar filters automatically.

#### Step 6: Extend Test Suite

**File**: `frontend/react-Admin3/src/store/slices/__tests__/filtersSlice.test.js`

**Add test cases** (add to existing test suite):
```javascript
import filtersReducer, {
  setSubjects,
  clearAllFilters,
  // NEW imports
  setTutorialFormat,
  toggleDistanceLearning,
  toggleTutorial,
  setNavbarFilters,
} from '../filtersSlice';

describe('filtersSlice - Navbar Filters (Story 1.2)', () => {
  test('initial state includes navbar filters with correct defaults', () => {
    const state = filtersReducer(undefined, { type: 'unknown' });

    expect(state.tutorial_format).toBeNull();
    expect(state.distance_learning).toBe(false);
    expect(state.tutorial).toBe(false);
  });

  test('setTutorialFormat updates tutorial_format field', () => {
    const initialState = {
      tutorial_format: null,
      lastUpdated: null,
    };

    const state = filtersReducer(initialState, setTutorialFormat('online'));

    expect(state.tutorial_format).toBe('online');
    expect(state.lastUpdated).toBeTruthy();
  });

  test('setTutorialFormat can clear tutorial_format with null', () => {
    const initialState = {
      tutorial_format: 'online',
      lastUpdated: null,
    };

    const state = filtersReducer(initialState, setTutorialFormat(null));

    expect(state.tutorial_format).toBeNull();
  });

  test('toggleDistanceLearning toggles boolean value', () => {
    const initialState = {
      distance_learning: false,
      lastUpdated: null,
    };

    let state = filtersReducer(initialState, toggleDistanceLearning());
    expect(state.distance_learning).toBe(true);

    state = filtersReducer(state, toggleDistanceLearning());
    expect(state.distance_learning).toBe(false);
  });

  test('toggleTutorial toggles boolean value', () => {
    const initialState = {
      tutorial: false,
      lastUpdated: null,
    };

    let state = filtersReducer(initialState, toggleTutorial());
    expect(state.tutorial).toBe(true);

    state = filtersReducer(state, toggleTutorial());
    expect(state.tutorial).toBe(false);
  });

  test('setNavbarFilters batch updates multiple fields', () => {
    const initialState = {
      tutorial_format: null,
      distance_learning: false,
      tutorial: false,
      lastUpdated: null,
    };

    const state = filtersReducer(
      initialState,
      setNavbarFilters({
        tutorial_format: 'intensive',
        distance_learning: true,
        tutorial: true,
      })
    );

    expect(state.tutorial_format).toBe('intensive');
    expect(state.distance_learning).toBe(true);
    expect(state.tutorial).toBe(true);
    expect(state.lastUpdated).toBeTruthy();
  });

  test('setNavbarFilters updates only provided fields', () => {
    const initialState = {
      tutorial_format: 'online',
      distance_learning: false,
      tutorial: true,
      lastUpdated: null,
    };

    const state = filtersReducer(
      initialState,
      setNavbarFilters({
        distance_learning: true,
        // tutorial_format and tutorial not provided, should remain unchanged
      })
    );

    expect(state.tutorial_format).toBe('online'); // Unchanged
    expect(state.distance_learning).toBe(true);   // Updated
    expect(state.tutorial).toBe(true);            // Unchanged
  });

  test('clearAllFilters resets navbar filters to defaults', () => {
    const initialState = {
      subjects: ['CB1'],
      tutorial_format: 'online',
      distance_learning: true,
      tutorial: true,
      lastUpdated: null,
    };

    const state = filtersReducer(initialState, clearAllFilters());

    expect(state.subjects).toEqual([]);
    expect(state.tutorial_format).toBeNull();
    expect(state.distance_learning).toBe(false);
    expect(state.tutorial).toBe(false);
  });

  test('selectFilters returns navbar filters', () => {
    const mockState = {
      filters: {
        subjects: ['CB1'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        tutorial_format: 'online',
        distance_learning: true,
        tutorial: false,
        searchQuery: '',
        currentPage: 1,
        pageSize: 20,
        lastUpdated: 1234567890,
      },
    };

    const filters = selectFilters(mockState);

    expect(filters.tutorial_format).toBe('online');
    expect(filters.distance_learning).toBe(true);
    expect(filters.tutorial).toBe(false);
  });
});
```

### Testing Strategy

**Unit Tests** (Target: 100% coverage for new actions):
- Initial state includes navbar filters
- Each action creator works correctly
- Batch action updates only provided fields
- clearAllFilters resets navbar filters
- Selectors include navbar filters

**Integration Tests** (in later stories):
- Story 1.4: useProductsSearch uses Redux navbar filters
- Story 1.7: FilterPanel displays navbar filter sections
- Story 1.8: ActiveFilters shows navbar filter chips

**Manual Testing Checklist**:
1. Open Redux DevTools → State tab
2. Verify initial state includes `tutorial_format`, `distance_learning`, `tutorial`
3. Dispatch `setTutorialFormat('online')` from console → State should update
4. Dispatch `toggleDistanceLearning()` → Should toggle true/false
5. Dispatch `clearAllFilters()` → Navbar filters should reset to defaults
6. Verify no errors in console

---

## Integration Verification

### IV1: Existing Filter Actions Continue Working

**Verification Steps**:
1. Test existing filter operations: `setSubjects`, `toggleCategory`, `setMultipleFilters`
2. Verify Redux DevTools shows actions completing successfully
3. Confirm existing components (FilterPanel, ActiveFilters) still function
4. Check that no existing tests fail

**Success Criteria**:
- All existing action creators dispatch without errors
- Existing state fields update correctly
- No breaking changes to existing functionality

### IV2: Existing Selectors Return Navbar Filters Alongside Current Filters

**Verification Steps**:
1. Use `selectFilters(state)` in Redux DevTools or console
2. Verify output includes navbar filter fields
3. Test in components using `useSelector(selectFilters)`
4. Confirm components receive extended object without errors

**Success Criteria**:
- `selectFilters` returns object with navbar filter fields
- Components using selector don't throw errors
- TypeScript/PropTypes (if used) accept extended object

### IV3: Redux Store Configuration Loads Without Errors

**Verification Steps**:
1. Start development server
2. Check browser console for errors
3. Open Redux DevTools → State tab
4. Verify state shape matches expected structure
5. Check that initial state hydration works

**Success Criteria**:
- No console errors on app load
- Redux DevTools shows state correctly
- Initial state includes navbar filters with correct defaults

---

## Technical Notes

### Integration Approach

**How It Connects**:
1. Extends existing `filtersSlice` with additive fields (no breaking changes)
2. Follows same pattern as existing filter fields (consistency)
3. Navbar filters will be used by:
   - Story 1.1 middleware (sync to URL)
   - Story 1.4 useProductsSearch (use instead of URL parsing)
   - Story 1.7 FilterPanel (display sections)
   - Story 1.8 ActiveFilters (display chips)

### Existing Pattern Reference

**Redux Toolkit Slice Pattern**:
- Docs: https://redux-toolkit.js.org/api/createSlice
- Immer for immutable updates (automatic)
- Action creator naming: `set*` for value setting, `toggle*` for booleans

**Existing filtersSlice Actions**:
- `setSubjects(state, action)` - Sets array of subjects
- `toggleCategory(state, action)` - Toggles category in array
- `clearAllFilters(state)` - Resets all filters

**New Actions Mirror Existing Patterns**:
- `setTutorialFormat` - Like `setSubjects` (value setter)
- `toggleDistanceLearning` - Like `toggleCategory` (boolean toggle)
- `setNavbarFilters` - Like `setMultipleFilters` (batch setter)

### Key Constraints

1. **Additive Only**: No breaking changes to existing state fields or actions
2. **Backward Compatibility**: Existing selectors return extended object (components may ignore new fields)
3. **Naming Convention**: Use snake_case for state fields (matches backend naming)
4. **Default Values**: Must match initial state to avoid undefined errors

### Data Types

| Field | Type | Default | Valid Values |
|-------|------|---------|--------------|
| `tutorial_format` | `string \| null` | `null` | `'online'`, `'intensive'`, `'weekend'`, `null` |
| `distance_learning` | `boolean` | `false` | `true`, `false` |
| `tutorial` | `boolean` | `false` | `true`, `false` |

---

## Definition of Done

- [x] `tutorial_format`, `distance_learning`, `tutorial` added to initial state
- [x] `setTutorialFormat` action creator implemented
- [x] `toggleDistanceLearning` action creator implemented
- [x] `toggleTutorial` action creator implemented
- [x] `setNavbarFilters` batch action implemented
- [x] `clearAllFilters` updated to reset navbar filters
- [x] Actions exported from filtersSlice
- [x] Test suite extended with ≥100% coverage for new actions
- [x] All tests pass (unit tests)
- [x] Redux DevTools shows navbar filters in state
- [x] No console errors on app load
- [x] JSDoc comments added for new actions
- [x] Code reviewed by another developer

---

## Risk Assessment and Mitigation

### Primary Risk: State Shape Changes Break Components

**Risk**: Adding new fields to Redux state could break components expecting specific shape

**Mitigation**:
1. **Additive Only**: New fields don't replace or modify existing fields
2. **Selector Pattern**: Components use `selectFilters` selector, not direct state access
3. **PropTypes/TypeScript**: Type checking will catch incompatibilities (if used)
4. **Gradual Integration**: Story 1.7 and 1.8 will integrate navbar filters into UI

**Probability**: Low (additive changes are safe)

**Impact**: Low (easy to fix if components break)

### Secondary Risk: Navbar Filter Data Types Mismatch

**Risk**: Backend expects different data types for navbar filters (e.g., string instead of boolean)

**Mitigation**:
1. **Review API Contract**: Check `/api/products/search` expected format
2. **Story 1.4**: Will handle any type conversions when sending to API
3. **Default Values**: Match what URL parsing currently provides

**Probability**: Low (using same types as URL parameters)

**Impact**: Low (can adjust types in Story 1.4 if needed)

### Rollback Plan

If navbar filter state causes issues:

1. **Quick Rollback** (10 minutes):
   - Git revert commits for Story 1.2
   - Redeploy frontend
   - System reverts to previous state shape

2. **Partial Rollback** (if only specific action is problematic):
   - Comment out specific action creator
   - Don't use that action until fixed
   - Other navbar filters continue working

---

## Dependencies and Blockers

**Dependencies**:
- None (can develop independently)

**Blockers**:
- None identified

**Parallel Development**:
- Can develop simultaneously with Story 1.1 (middleware)
- No conflicts between the two stories

**Enables**:
- Story 1.4 (useProductsSearch will use Redux navbar filters)
- Story 1.7 (FilterPanel will display navbar filter sections)
- Story 1.8 (ActiveFilters will display navbar filter chips)

---

## Related PRD Sections

- **FR3**: Consolidate navbar filters into Redux store requirement
- **FR6**: FilterPanel shall display ALL filters (enables Story 1.7)
- **FR7**: ActiveFilters shall render chips for all filters (enables Story 1.8)
- **Section 4.2**: Redux store integration strategy
- **Section 4.3**: Naming conventions (snake_case for state fields)

---

## Next Steps After Completion

1. **Code Review**: Get peer review of Redux state changes
2. **Story 1.3**: Can proceed (remove manual URL updates from nav handlers)
3. **Story 1.4**: Can start using Redux navbar filters in useProductsSearch
4. **Redux DevTools**: Confirm new state fields visible for debugging

---

## Example Usage (After Implementation)

```javascript
// In a React component
import { useDispatch, useSelector } from 'react-redux';
import {
  setTutorialFormat,
  toggleDistanceLearning,
  selectFilters
} from '../store/slices/filtersSlice';

function TutorialFilterComponent() {
  const dispatch = useDispatch();
  const filters = useSelector(selectFilters);

  const handleTutorialFormatChange = (format) => {
    dispatch(setTutorialFormat(format));
  };

  const handleDistanceLearningToggle = () => {
    dispatch(toggleDistanceLearning());
  };

  return (
    <div>
      <select
        value={filters.tutorial_format || ''}
        onChange={(e) => handleTutorialFormatChange(e.target.value || null)}
      >
        <option value="">All Formats</option>
        <option value="online">Online</option>
        <option value="intensive">Intensive</option>
      </select>

      <label>
        <input
          type="checkbox"
          checked={filters.distance_learning}
          onChange={handleDistanceLearningToggle}
        />
        Distance Learning Only
      </label>
    </div>
  );
}
```

---

**Story Status**: Ready for Development
**Assigned To**: [Pending]
**Started**: [Pending]
**Completed**: [Pending]
