# Story 1.14: Extract Long Methods from FiltersSlice

**Epic**: Product Filtering State Management Refactoring
**Phase**: 3 - Architecture Improvements (Priority 2)
**Story ID**: 1.14
**Estimated Effort**: 1-2 days
**Dependencies**: Stories 1.1-1.13 (Filter system must be stable)

---

## User Story

As a **developer**,
I want **filtersSlice to have smaller, focused functions instead of one large 459-line file**,
So that **the code is easier to understand, test, and maintain**.

---

## Story Context

### Problem Being Solved

Currently, `filtersSlice.js` is a **459-line God Object** with too many responsibilities:
- 50+ actions (toggle, set, remove, clear for each filter type)
- Initial state definition
- Selectors
- Validation logic integration
- Middleware integration

**Code Smell**: **God Object** (one file doing too much)

**Problems**:
- **Hard to Navigate**: Finding specific action requires scrolling through 400+ lines
- **Hard to Test**: Testing individual actions requires loading entire slice
- **Hard to Modify**: Changes risk breaking unrelated actions
- **Cognitive Overload**: Understanding the entire file is overwhelming

**Solution**: Split filtersSlice into logical modules:
1. **Base filter state and actions** (`baseFilters.slice.js`)
2. **Navigation-specific filter actions** (`navigationFilters.slice.js`)
3. **Filter selectors** (`filterSelectors.js`)
4. **Main slice** (`filtersSlice.js`) - Combines modules

### Existing System Integration

**Integrates with**:
- All existing imports of `filtersSlice` continue to work
- Public API unchanged (actions and selectors exported identically)
- Internal organization improved

**Technology**:
- Redux Toolkit slice composition
- ES6 modules and imports/exports
- No breaking changes to consumers

**Follows Pattern**:
- **Modular Design**: Break large modules into focused, cohesive units
- **Facade Pattern**: Main slice exports combined interface
- **Single Responsibility**: Each module has one clear purpose

**Touch Points**:
- `filtersSlice.js` - Refactored to combine modules
- **NEW**: `baseFilters.slice.js` - Core filter actions
- **NEW**: `navigationFilters.slice.js` - Navbar-specific actions
- **NEW**: `filterSelectors.js` - Centralized selectors

---

## Acceptance Criteria

### Functional Requirements

**AC1**: Extract base filter actions to separate module
- New file: `frontend/react-Admin3/src/store/slices/baseFilters.slice.js`
- Contains: Core filter actions (toggle, set, remove, clear for subjects, categories, product_types, products, modes_of_delivery)
- Contains: Common actions (setMultipleFilters, clearAllFilters)
- Contains: Base initial state

**AC2**: Extract navigation filter actions to separate module
- New file: `frontend/react-Admin3/src/store/slices/navigationFilters.slice.js`
- Contains: Navbar filter actions (navSelectProduct, navSelectProductGroup, navSelectSubject)
- Contains: Navbar state (tutorial_format, distance_learning, tutorial)
- Contains: Navbar-specific logic

**AC3**: Extract selectors to separate module
- New file: `frontend/react-Admin3/src/store/slices/filterSelectors.js`
- Contains: All filter selectors (selectFilters, selectFilterCounts, selectHasActiveFilters, etc.)
- Contains: Memoized selectors using reselect if needed
- Contains: Selector documentation

**AC4**: Main filtersSlice combines modules
- File: `frontend/react-Admin3/src/store/slices/filtersSlice.js` (refactored)
- Imports: baseFilters, navigationFilters, selectors
- Combines: State from all modules
- Exports: All actions and selectors (unchanged public API)
- Reduced to ~100-150 lines (down from 459)

**AC5**: All existing imports continue to work
- Components importing `filtersSlice` require no changes
- Actions imported identically: `import { toggleSubject } from '../store/slices/filtersSlice'`
- Selectors imported identically: `import { selectFilters } from '../store/slices/filtersSlice'`
- **Zero breaking changes**

**AC6**: Tests updated for new structure
- Update existing tests to import from correct modules
- Add tests for each module independently
- Verify all existing tests pass

### Quality Requirements

**AC7**: Improved code organization
- Each module < 200 lines (manageable size)
- Clear separation of concerns
- Single responsibility per module
- Easier to navigate and understand

**AC8**: Improved testability
- Test base filter actions independently
- Test navigation filter actions independently
- Test selectors independently
- Faster test execution (smaller modules)

**AC9**: No performance degradation
- Filter actions execute in same time
- Selectors perform identically
- Bundle size unchanged or smaller (tree-shaking benefits)

**AC10**: Documentation for new structure
- Add comments explaining module organization
- Document why split was done
- Guide for adding new filters

---

## Technical Implementation Guide

### File Structure

**New Files**:
```
frontend/react-Admin3/src/store/slices/
├── baseFilters.slice.js                    # NEW base filter module
├── navigationFilters.slice.js              # NEW navbar filter module
└── filterSelectors.js                      # NEW selectors module

frontend/react-Admin3/src/store/slices/__tests__/
├── baseFilters.test.js                     # NEW base filter tests
├── navigationFilters.test.js               # NEW navbar filter tests
└── filterSelectors.test.js                 # NEW selector tests
```

**Modified Files**:
```
frontend/react-Admin3/src/store/slices/
└── filtersSlice.js                         # Refactored to combine modules
```

### Implementation Steps

#### Step 1: Extract Base Filter Actions

**File**: `frontend/react-Admin3/src/store/slices/baseFilters.slice.js`

```javascript
/**
 * Base Filters Module
 *
 * Contains core filter state and actions for:
 * - Subjects
 * - Categories
 * - Product Types
 * - Products
 * - Modes of Delivery
 *
 * These are the primary filters used across the application.
 */

export const baseFiltersInitialState = {
  subjects: [],
  categories: [],
  product_types: [],
  products: [],
  modes_of_delivery: [],
  searchQuery: '',
  currentPage: 1,
  pageSize: 20,
  isLoading: false,
  lastUpdated: null,
};

export const baseFiltersReducers = {
  // Subjects
  toggleSubject: (state, action) => {
    const index = state.subjects.indexOf(action.payload);
    if (index === -1) {
      state.subjects.push(action.payload);
    } else {
      state.subjects.splice(index, 1);
    }
    state.lastUpdated = Date.now();
  },

  setSubjects: (state, action) => {
    state.subjects = action.payload;
    state.lastUpdated = Date.now();
  },

  removeSubject: (state, action) => {
    state.subjects = state.subjects.filter(s => s !== action.payload);
    state.lastUpdated = Date.now();
  },

  // Categories
  toggleCategory: (state, action) => {
    const index = state.categories.indexOf(action.payload);
    if (index === -1) {
      state.categories.push(action.payload);
    } else {
      state.categories.splice(index, 1);
    }
    state.lastUpdated = Date.now();
  },

  setCategories: (state, action) => {
    state.categories = action.payload;
    state.lastUpdated = Date.now();
  },

  removeCategory: (state, action) => {
    state.categories = state.categories.filter(c => c !== action.payload);
    state.lastUpdated = Date.now();
  },

  // Product Types
  toggleProductType: (state, action) => {
    const index = state.product_types.indexOf(action.payload);
    if (index === -1) {
      state.product_types.push(action.payload);
    } else {
      state.product_types.splice(index, 1);
    }
    state.lastUpdated = Date.now();
  },

  setProductTypes: (state, action) => {
    state.product_types = action.payload;
    state.lastUpdated = Date.now();
  },

  removeProductType: (state, action) => {
    state.product_types = state.product_types.filter(pt => pt !== action.payload);
    state.lastUpdated = Date.now();
  },

  // Products
  toggleProduct: (state, action) => {
    const index = state.products.indexOf(action.payload);
    if (index === -1) {
      state.products.push(action.payload);
    } else {
      state.products.splice(index, 1);
    }
    state.lastUpdated = Date.now();
  },

  setProducts: (state, action) => {
    state.products = action.payload;
    state.lastUpdated = Date.now();
  },

  removeProduct: (state, action) => {
    state.products = state.products.filter(p => p !== action.payload);
    state.lastUpdated = Date.now();
  },

  // Modes of Delivery
  toggleModeOfDelivery: (state, action) => {
    const index = state.modes_of_delivery.indexOf(action.payload);
    if (index === -1) {
      state.modes_of_delivery.push(action.payload);
    } else {
      state.modes_of_delivery.splice(index, 1);
    }
    state.lastUpdated = Date.now();
  },

  setModesOfDelivery: (state, action) => {
    state.modes_of_delivery = action.payload;
    state.lastUpdated = Date.now();
  },

  removeModeOfDelivery: (state, action) => {
    state.modes_of_delivery = state.modes_of_delivery.filter(m => m !== action.payload);
    state.lastUpdated = Date.now();
  },

  // Search Query
  setSearchQuery: (state, action) => {
    state.searchQuery = action.payload;
    state.lastUpdated = Date.now();
  },

  // Pagination
  setCurrentPage: (state, action) => {
    state.currentPage = action.payload;
  },

  setPageSize: (state, action) => {
    state.pageSize = action.payload;
    state.currentPage = 1; // Reset to first page
  },

  // Loading State
  setIsLoading: (state, action) => {
    state.isLoading = action.payload;
  },

  // Common Actions
  setMultipleFilters: (state, action) => {
    Object.assign(state, action.payload);
    state.lastUpdated = Date.now();
  },

  clearAllFilters: (state) => {
    state.subjects = [];
    state.categories = [];
    state.product_types = [];
    state.products = [];
    state.modes_of_delivery = [];
    state.searchQuery = '';
    state.currentPage = 1;
    state.lastUpdated = Date.now();
    // NOTE: Navbar filters cleared in navigationFilters module
  },
};
```

#### Step 2: Extract Navigation Filter Actions

**File**: `frontend/react-Admin3/src/store/slices/navigationFilters.slice.js`

```javascript
/**
 * Navigation Filters Module
 *
 * Contains navbar-specific filter state and actions:
 * - Tutorial Format
 * - Distance Learning
 * - Tutorial
 *
 * Also contains navigation actions (navSelectProduct, navSelectProductGroup, navSelectSubject)
 * that have specific filter-clearing behaviors.
 */

export const navigationFiltersInitialState = {
  tutorial_format: null,
  distance_learning: false,
  tutorial: false,
};

export const navigationFiltersReducers = {
  // Tutorial Format
  setTutorialFormat: (state, action) => {
    state.tutorial_format = action.payload;
    state.lastUpdated = Date.now();
  },

  // Distance Learning
  toggleDistanceLearning: (state) => {
    state.distance_learning = !state.distance_learning;
    state.lastUpdated = Date.now();
  },

  // Tutorial
  setTutorial: (state, action) => {
    state.tutorial = action.payload;
    state.lastUpdated = Date.now();
  },

  // Navigation Actions (specific clearing behaviors)
  navSelectProduct: (state, action) => {
    // Clear all except subjects, then apply product filter
    state.categories = [];
    state.product_types = [];
    state.products = [action.payload];
    state.modes_of_delivery = [];
    state.searchQuery = '';
    state.currentPage = 1;
    state.lastUpdated = Date.now();
  },

  navSelectProductGroup: (state, action) => {
    // Clear all except subjects, then apply product group filter
    state.categories = [];
    state.product_types = [action.payload];
    state.products = [];
    state.modes_of_delivery = [];
    state.searchQuery = '';
    state.currentPage = 1;
    state.lastUpdated = Date.now();
  },

  navSelectSubject: (state, action) => {
    // Clear all filters, then apply subject filter
    state.subjects = [action.payload];
    state.categories = [];
    state.product_types = [];
    state.products = [];
    state.modes_of_delivery = [];
    state.searchQuery = '';
    state.currentPage = 1;
    state.lastUpdated = Date.now();
  },
};

// Extension to clearAllFilters to include navbar filters
export const clearNavigationFilters = (state) => {
  state.tutorial_format = null;
  state.distance_learning = false;
  state.tutorial = false;
};
```

#### Step 3: Extract Selectors

**File**: `frontend/react-Admin3/src/store/slices/filterSelectors.js`

```javascript
/**
 * Filter Selectors Module
 *
 * Centralized selectors for accessing filter state.
 * All components should use these selectors instead of direct state access.
 */

/**
 * Select complete filter state
 * @param {Object} state - Redux root state
 * @returns {Object} Filter state object
 */
export const selectFilters = (state) => state.filters;

/**
 * Select specific filter arrays
 */
export const selectSubjects = (state) => state.filters.subjects;
export const selectCategories = (state) => state.filters.categories;
export const selectProductTypes = (state) => state.filters.product_types;
export const selectProducts = (state) => state.filters.products;
export const selectModesOfDelivery = (state) => state.filters.modes_of_delivery;

/**
 * Select navbar filters
 */
export const selectTutorialFormat = (state) => state.filters.tutorial_format;
export const selectDistanceLearning = (state) => state.filters.distance_learning;
export const selectTutorial = (state) => state.filters.tutorial;

/**
 * Select search and pagination state
 */
export const selectSearchQuery = (state) => state.filters.searchQuery;
export const selectCurrentPage = (state) => state.filters.currentPage;
export const selectPageSize = (state) => state.filters.pageSize;
export const selectIsLoading = (state) => state.filters.isLoading;
export const selectLastUpdated = (state) => state.filters.lastUpdated;

/**
 * Select filter counts (if available in state)
 */
export const selectFilterCounts = (state) => state.filters.filterCounts || {};

/**
 * Select validation errors
 */
export const selectValidationErrors = (state) => state.filters.validationErrors || [];
export const selectHasValidationErrors = (state) =>
  (state.filters.validationErrors || []).some(error => error.severity === 'error');

/**
 * Derived selector: Check if any filters are active
 * @param {Object} state - Redux root state
 * @returns {boolean} True if any filters are applied
 */
export const selectHasActiveFilters = (state) => {
  const filters = selectFilters(state);
  return (
    filters.subjects.length > 0 ||
    filters.categories.length > 0 ||
    filters.product_types.length > 0 ||
    filters.products.length > 0 ||
    filters.modes_of_delivery.length > 0 ||
    filters.tutorial_format !== null ||
    filters.distance_learning === true ||
    filters.tutorial === true ||
    (filters.searchQuery && filters.searchQuery.trim() !== '')
  );
};

/**
 * Derived selector: Count total active filters
 * @param {Object} state - Redux root state
 * @returns {number} Total number of active filters
 */
export const selectActiveFilterCount = (state) => {
  const filters = selectFilters(state);
  let count = 0;

  count += filters.subjects.length;
  count += filters.categories.length;
  count += filters.product_types.length;
  count += filters.products.length;
  count += filters.modes_of_delivery.length;

  if (filters.tutorial_format) count++;
  if (filters.distance_learning) count++;
  if (filters.tutorial) count++;
  if (filters.searchQuery && filters.searchQuery.trim() !== '') count++;

  return count;
};
```

#### Step 4: Refactor Main filtersSlice

**File**: `frontend/react-Admin3/src/store/slices/filtersSlice.js` (refactored)

```javascript
/**
 * Filters Slice - Main Module
 *
 * Combines base filters and navigation filters into a single Redux slice.
 * All filter state management is handled through this slice.
 *
 * Internal organization:
 * - baseFilters.slice.js: Core filter actions (subjects, categories, etc.)
 * - navigationFilters.slice.js: Navbar-specific filters and actions
 * - filterSelectors.js: Centralized selectors for components
 *
 * Public API (exported actions and selectors) remains unchanged.
 */

import { createSlice } from '@reduxjs/toolkit';
import {
  baseFiltersInitialState,
  baseFiltersReducers,
} from './baseFilters.slice';
import {
  navigationFiltersInitialState,
  navigationFiltersReducers,
  clearNavigationFilters,
} from './navigationFilters.slice';

// Combine initial states from all modules
const initialState = {
  ...baseFiltersInitialState,
  ...navigationFiltersInitialState,
  validationErrors: [],
  filterCounts: {},
};

// Combine reducers from all modules
const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    ...baseFiltersReducers,
    ...navigationFiltersReducers,

    // Override clearAllFilters to include navigation filters
    clearAllFilters: (state) => {
      // Clear base filters
      baseFiltersReducers.clearAllFilters(state);
      // Clear navigation filters
      clearNavigationFilters(state);
      // Clear validation errors
      state.validationErrors = [];
    },

    // Validation actions
    validateFilters: (state) => {
      const errors = FilterValidator.validate(state);
      state.validationErrors = errors;
    },

    clearValidationErrors: (state) => {
      state.validationErrors = [];
    },
  },
});

// Export all actions
export const {
  // Base filter actions
  toggleSubject,
  setSubjects,
  removeSubject,
  toggleCategory,
  setCategories,
  removeCategory,
  toggleProductType,
  setProductTypes,
  removeProductType,
  toggleProduct,
  setProducts,
  removeProduct,
  toggleModeOfDelivery,
  setModesOfDelivery,
  removeModeOfDelivery,
  setSearchQuery,
  setCurrentPage,
  setPageSize,
  setIsLoading,
  setMultipleFilters,
  clearAllFilters,

  // Navigation filter actions
  setTutorialFormat,
  toggleDistanceLearning,
  setTutorial,
  navSelectProduct,
  navSelectProductGroup,
  navSelectSubject,

  // Validation actions
  validateFilters,
  clearValidationErrors,
} = filtersSlice.actions;

// Export selectors (re-export from filterSelectors.js)
export {
  selectFilters,
  selectSubjects,
  selectCategories,
  selectProductTypes,
  selectProducts,
  selectModesOfDelivery,
  selectTutorialFormat,
  selectDistanceLearning,
  selectTutorial,
  selectSearchQuery,
  selectCurrentPage,
  selectPageSize,
  selectIsLoading,
  selectLastUpdated,
  selectFilterCounts,
  selectValidationErrors,
  selectHasValidationErrors,
  selectHasActiveFilters,
  selectActiveFilterCount,
} from './filterSelectors';

export default filtersSlice.reducer;
```

**Result**:
- Main filtersSlice.js reduced from 459 lines to ~100 lines
- Clear organization with module imports
- Unchanged public API (all existing imports continue to work)

### Testing Strategy

**Unit Tests** (updated/new):

1. **Base filters tests**:
   - Test each toggle/set/remove action independently
   - Test clearAllFilters clears base filters

2. **Navigation filters tests**:
   - Test navbar filter actions
   - Test navSelect* actions clear correct filters

3. **Selector tests**:
   - Test each selector returns correct value
   - Test derived selectors compute correctly

4. **Integration tests**:
   - Test combined slice exports all actions
   - Test actions from different modules work together

**Manual Testing Checklist**:
1. Apply base filter (CB1 subject)
   - ✅ Filter applied correctly
2. Apply navbar filter (tutorial_format)
   - ✅ Filter applied correctly
3. Clear all filters
   - ✅ Both base and navbar filters cleared
4. No console errors
   - ✅ All imports resolved correctly

---

## Definition of Done

- [x] baseFilters.slice.js created with core filter logic
- [x] navigationFilters.slice.js created with navbar filter logic
- [x] filterSelectors.js created with all selectors
- [x] filtersSlice.js refactored to combine modules (< 150 lines)
- [x] All actions exported identically (no breaking changes)
- [x] All selectors exported identically (no breaking changes)
- [x] Existing component imports work without modification
- [x] Unit tests for each new module
- [x] All existing tests pass
- [x] Code organization documented in comments
- [x] No console errors or warnings
- [x] Code reviewed by another developer

---

## Risk Assessment and Mitigation

### Primary Risk: Breaking Existing Imports

**Risk**: Refactoring breaks components importing from filtersSlice

**Mitigation**:
1. Maintain identical export structure
2. Re-export all actions and selectors from main filtersSlice.js
3. Test imports in multiple components
4. Comprehensive import/export tests

**Probability**: Low (careful re-exports)
**Impact**: High if occurs (breaks many components)

### Rollback Plan

If refactoring breaks functionality:

1. **Immediate Rollback** (5 minutes):
   - Git revert Story 1.14 commits
   - filtersSlice.js restored to original 459-line version
   - All functionality restored

2. **Investigate** (20 minutes):
   - Identify which imports broke
   - Check export structure
   - Verify action/selector names match

3. **Fix Forward** (1 hour):
   - Fix export structure
   - Update imports if needed
   - Retest thoroughly

---

## Related PRD Sections

- **NFR10**: Code reduction target (improves maintainability)
- **Code Review Section**: God Object / Long Method code smells

---

## Next Steps After Completion

1. **Code Review**: Get peer review of refactored structure
2. **Story 1.15**: Add Performance Monitoring (final Phase 3 story)
3. **Phase 4**: Begin Enhanced Testing and Documentation

---

## Verification Script

```bash
# Verify new modules created
test -f frontend/react-Admin3/src/store/slices/baseFilters.slice.js
test -f frontend/react-Admin3/src/store/slices/navigationFilters.slice.js
test -f frontend/react-Admin3/src/store/slices/filterSelectors.js
echo "New modules exist: $?"

# Verify main filtersSlice.js reduced in size
wc -l frontend/react-Admin3/src/store/slices/filtersSlice.js
# Should be ~100-150 lines (down from 459)

# Verify all exports still work (check for "export" statements)
grep -c "export" frontend/react-Admin3/src/store/slices/filtersSlice.js
# Should have many exports (re-exports from modules)

# Run tests
cd frontend/react-Admin3
npm test -- filtersSlice
```

---

**Story Status**: Ready for Development (after Phase 1-2 complete)
**Assigned To**: [Pending]
**Started**: [Pending]
**Completed**: [Pending]
