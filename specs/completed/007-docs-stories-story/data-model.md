# Data Model: FiltersSlice Modules

**Feature**: Extract Long Methods from FiltersSlice
**Date**: 2025-10-25
**Type**: Refactoring (no new state, reorganizing existing state)

## Overview

This refactoring splits the existing filter state into logical modules without changing the state structure. The data model below documents how state is distributed across modules.

---

## State Distribution Across Modules

### Base Filters Module State

**Module**: `baseFilters.slice.js`
**Responsibility**: Core filter state and standard filter operations

```javascript
{
  // Filter arrays (multi-select)
  subjects: string[],              // Subject codes (e.g., ['CM2', 'SA1'])
  categories: string[],            // Category codes
  product_types: string[],         // Product type codes
  products: number[],              // Product IDs
  modes_of_delivery: string[],    // Delivery mode codes

  // Search
  searchQuery: string,             // Search query text
  searchFilterProductIds: number[], // ESSP IDs from fuzzy search

  // Pagination
  currentPage: number,             // Current page number (default: 1)
  pageSize: number,                // Items per page (default: 20)

  // UI State
  isFilterPanelOpen: boolean,      // Filter panel visibility
  appliedFilters: object,          // Cache of applied filters

  // Loading/Error
  isLoading: boolean,
  error: string | null,

  // Metadata
  lastUpdated: number | null,      // Timestamp of last filter change

  // Filter Counts (from API)
  filterCounts: {
    subjects: Record<string, number>,
    categories: Record<string, number>,
    product_types: Record<string, number>,
    products: Record<string, number>,
    modes_of_delivery: Record<string, number>
  }
}
```

**Validation Rules**:
- All filter arrays must be arrays (can be empty)
- `currentPage` must be >= 1
- `pageSize` must be > 0
- `searchQuery` can be any string (including empty)
- `lastUpdated` is updated on any filter change

**State Transitions**:
- Set actions: Replace array entirely
- Toggle actions: Add if not present, remove if present
- Remove actions: Filter out specific value
- Clear actions: Reset to empty array
- Page changes: Update currentPage only

---

### Navigation Filters Module State

**Module**: `navigationFilters.slice.js`
**Responsibility**: No additional state - operates on base filter state with special behaviors

**Special Behaviors** (operates on base filter state):

1. **navSelectSubject**:
   - Clears: None (preserves all filters)
   - Sets: subjects = [payload]

2. **navViewAllProducts**:
   - Clears: products, categories, product_types, modes_of_delivery, searchQuery
   - Preserves: subjects

3. **navSelectProductGroup**:
   - Clears: products, categories, modes_of_delivery, searchQuery
   - Sets: product_types = [payload]
   - Preserves: subjects

4. **navSelectProduct**:
   - Clears: categories, product_types, modes_of_delivery, searchQuery
   - Sets: products = [payload]
   - Preserves: subjects

5. **navSelectModeOfDelivery**:
   - Clears: categories, product_types, products, searchQuery
   - Sets: modes_of_delivery = [payload]
   - Preserves: subjects

**Design Note**: Navigation actions implement the "drill-down" UX pattern where users navigate from broad (subject) to specific (product) while clearing intermediate filters.

---

### Validation State

**Module**: Managed in base filters, validated via FilterValidator

```javascript
{
  validationErrors: Array<{
    field: string,           // Which filter has error
    message: string,         // User-friendly error message
    severity: 'error' | 'warning',
    code: string            // Error code for programmatic handling
  }>
}
```

**Validation Rules**:
- Automatically triggered after any filter change
- FilterValidator.validate(state) called in reducers
- Errors prevent invalid filter combinations
- Warnings allow but notify users

**Current Validations** (from Story 1.12):
- Invalid filter combinations
- Missing required filters
- Conflicting filter selections

---

## Module Contracts

### Base Filters Module Contract

**Exports**:
```javascript
export const baseFiltersInitialState = { /* state shape above */ };

export const baseFiltersReducers = {
  // Set actions
  setSubjects: (state, action) => void,
  setCategories: (state, action) => void,
  setProductTypes: (state, action) => void,
  setProducts: (state, action) => void,
  setModesOfDelivery: (state, action) => void,
  setSearchQuery: (state, action) => void,
  setSearchFilterProductIds: (state, action) => void,

  // Toggle actions
  toggleSubjectFilter: (state, action) => void,
  toggleCategoryFilter: (state, action) => void,
  toggleProductTypeFilter: (state, action) => void,
  toggleProductFilter: (state, action) => void,
  toggleModeOfDeliveryFilter: (state, action) => void,

  // Remove actions
  removeSubjectFilter: (state, action) => void,
  removeCategoryFilter: (state, action) => void,
  removeProductTypeFilter: (state, action) => void,
  removeProductFilter: (state, action) => void,
  removeModeOfDeliveryFilter: (state, action) => void,

  // Clear actions
  clearFilterType: (state, action) => void,
  clearAllFilters: (state) => void,

  // Multi-update
  setMultipleFilters: (state, action) => void,

  // Pagination
  setCurrentPage: (state, action) => void,
  setPageSize: (state, action) => void,

  // UI
  toggleFilterPanel: (state) => void,
  setFilterPanelOpen: (state, action) => void,

  // Loading/Error
  setLoading: (state, action) => void,
  setError: (state, action) => void,
  clearError: (state) => void,

  // Utility
  resetFilters: (state) => void,
  applyFilters: (state) => void,
  setFilterCounts: (state, action) => void,
};
```

---

### Navigation Filters Module Contract

**Exports**:
```javascript
export const navigationFiltersReducers = {
  navSelectSubject: (state, action) => void,
  navViewAllProducts: (state) => void,
  navSelectProductGroup: (state, action) => void,
  navSelectProduct: (state, action) => void,
  navSelectModeOfDelivery: (state, action) => void,
};
```

**Action Payloads**:
- `navSelectSubject`: `string` (subject code)
- `navViewAllProducts`: no payload
- `navSelectProductGroup`: `string` (product type code)
- `navSelectProduct`: `number` (product ID)
- `navSelectModeOfDelivery`: `string` (mode code)

---

### Filter Selectors Module Contract

**Exports**:
```javascript
// Basic selectors (direct state access)
export const selectFilters: (state) => FilterState;
export const selectSearchQuery: (state) => string;
export const selectSearchFilterProductIds: (state) => number[];
export const selectCurrentPage: (state) => number;
export const selectPageSize: (state) => number;
export const selectIsFilterPanelOpen: (state) => boolean;
export const selectIsLoading: (state) => boolean;
export const selectError: (state) => string | null;
export const selectAppliedFilters: (state) => object;
export const selectLastUpdated: (state) => number | null;
export const selectFilterCounts: (state) => object;

// Validation selectors
export const selectValidationErrors: (state) => ValidationError[];
export const selectHasValidationErrors: (state) => boolean;

// Derived selectors (memoized with createSelector)
export const selectHasActiveFilters: (state) => boolean;
export const selectActiveFilterCount: (state) => number;
```

**Memoization Strategy**:
- Simple selectors: Direct state access (no memoization needed)
- Derived selectors: Use `createSelector` from reselect
- Dependencies: Minimal to maximize cache hits

---

### Main Filters Slice Contract (Facade)

**Exports**:
```javascript
// Combined initial state
const initialState = {
  ...baseFiltersInitialState,
  validationErrors: []
};

// Combined slice
const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    ...baseFiltersReducers,
    ...navigationFiltersReducers,

    // Validation actions (not in modules)
    validateFilters: (state) => void,
    clearValidationErrors: (state) => void,
  }
});

// Re-export ALL actions (unchanged from current)
export const {
  setSubjects,
  setCategories,
  // ... all 45+ actions
} = filtersSlice.actions;

// Re-export ALL selectors (unchanged from current)
export {
  selectFilters,
  selectHasActiveFilters,
  // ... all 15+ selectors
} from './filterSelectors';

// Export reducer
export default filtersSlice.reducer;
```

**Compatibility Guarantee**:
- ✅ All existing action imports work unchanged
- ✅ All existing selector imports work unchanged
- ✅ Reducer export identical
- ✅ State shape unchanged

---

## State Flow Diagram

```
User Action (Component)
         ↓
   Dispatch Action
         ↓
   filtersSlice.reducer
         ↓
   [Appropriate Module Reducer]
         ↓
   State Update + Validation
         ↓
   URL Sync Middleware (existing)
         ↓
   Component Re-render (via selectors)
```

**No changes to flow** - only internal organization improved

---

## Migration Notes

### What Changes
- ✅ File organization (1 file → 4 files)
- ✅ Code location (actions moved to modules)
- ✅ Test organization (module-specific tests added)

### What Stays The Same
- ✅ State shape (identical)
- ✅ Action names (identical)
- ✅ Selector names (identical)
- ✅ Import paths (from filtersSlice.js)
- ✅ Reducer behavior (identical)
- ✅ Validation logic (identical)
- ✅ Performance characteristics (identical or better)

---

## Validation & Testing

**State Validation**:
- FilterValidator runs after every filter change
- Validation errors stored in state
- Components can display validation messages

**Test Coverage**:
- Unit tests per module (test reducers in isolation)
- Integration tests (test combined slice)
- All 96 existing tests must pass
- ~30-40 new module-specific tests

**Performance Testing**:
- Selector memoization verified
- URL sync performance maintained (< 5ms)
- Bundle size unchanged or reduced

---

**Status**: Data model documented, ready for contract generation
