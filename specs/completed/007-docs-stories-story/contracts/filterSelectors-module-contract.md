# Contract: Filter Selectors Module

**Module**: `filterSelectors.js`
**Responsibility**: Centralized selectors for accessing and deriving filter state
**Version**: 1.0.0

---

## Overview

This module provides all selectors for the filter state. Selectors are functions that extract and derive data from the Redux store.

**Performance**: Uses `createSelector` from reselect for memoization of derived selectors.

---

## Exports

### Basic Selectors (Direct State Access)

```javascript
/**
 * Select complete filter state
 * @param {Object} state - Redux root state
 * @returns {Object} Filter state with subjects, categories, etc.
 */
export const selectFilters = createSelector(
  [(state) => state.filters],
  (filters) => ({
    subjects: filters.subjects,
    categories: filters.categories,
    product_types: filters.product_types,
    products: filters.products,
    modes_of_delivery: filters.modes_of_delivery,
  })
);

/**
 * Select search query
 * @param {Object} state - Redux root state
 * @returns {string} Search query text
 */
export const selectSearchQuery = (state) => state.filters.searchQuery;

/**
 * Select search filter product IDs (ESSP IDs from fuzzy search)
 * @param {Object} state - Redux root state
 * @returns {number[]} Array of ESSP IDs
 */
export const selectSearchFilterProductIds = (state) => state.filters.searchFilterProductIds;

/**
 * Select current page number
 * @param {Object} state - Redux root state
 * @returns {number} Current page (1-indexed)
 */
export const selectCurrentPage = (state) => state.filters.currentPage;

/**
 * Select page size
 * @param {Object} state - Redux root state
 * @returns {number} Items per page
 */
export const selectPageSize = (state) => state.filters.pageSize;

/**
 * Select filter panel open state
 * @param {Object} state - Redux root state
 * @returns {boolean} True if panel is open
 */
export const selectIsFilterPanelOpen = (state) => state.filters.isFilterPanelOpen;

/**
 * Select loading state
 * @param {Object} state - Redux root state
 * @returns {boolean} True if loading
 */
export const selectIsLoading = (state) => state.filters.isLoading;

/**
 * Select error state
 * @param {Object} state - Redux root state
 * @returns {string | null} Error message or null
 */
export const selectError = (state) => state.filters.error;

/**
 * Select applied filters cache
 * @param {Object} state - Redux root state
 * @returns {Object} Cached filter state
 */
export const selectAppliedFilters = (state) => state.filters.appliedFilters;

/**
 * Select last updated timestamp
 * @param {Object} state - Redux root state
 * @returns {number | null} Timestamp or null
 */
export const selectLastUpdated = (state) => state.filters.lastUpdated;

/**
 * Select filter counts from API
 * @param {Object} state - Redux root state
 * @returns {Object} Filter counts by type
 */
export const selectFilterCounts = (state) => state.filters.filterCounts;
```

---

### Validation Selectors

```javascript
/**
 * Select validation errors
 * @param {Object} state - Redux root state
 * @returns {Array} Validation error objects
 */
export const selectValidationErrors = (state) => state.filters.validationErrors;

/**
 * Select if there are any error-level validation issues
 * @param {Object} state - Redux root state
 * @returns {boolean} True if errors exist
 */
export const selectHasValidationErrors = (state) =>
  state.filters.validationErrors.some(error => error.severity === 'error');
```

---

### Derived Selectors (Memoized)

```javascript
/**
 * Check if any filters are currently active
 * Memoized to prevent unnecessary re-computation
 * @param {Object} state - Redux root state
 * @returns {boolean} True if any filter is applied
 */
export const selectHasActiveFilters = createSelector(
  [selectFilters, selectSearchQuery],
  (filters, searchQuery) => (
    filters.subjects.length > 0 ||
    filters.categories.length > 0 ||
    filters.product_types.length > 0 ||
    filters.products.length > 0 ||
    filters.modes_of_delivery.length > 0 ||
    searchQuery.trim().length > 0
  )
);

/**
 * Count total number of active filters
 * Memoized to prevent unnecessary re-computation
 * @param {Object} state - Redux root state
 * @returns {number} Total count of active filters
 */
export const selectActiveFilterCount = createSelector(
  [selectFilters, selectSearchQuery],
  (filters, searchQuery) => {
    let count = 0;
    count += filters.subjects.length;
    count += filters.categories.length;
    count += filters.product_types.length;
    count += filters.products.length;
    count += filters.modes_of_delivery.length;
    if (searchQuery.trim().length > 0) count += 1;

    return count;
  }
);
```

---

## Memoization Strategy

**Simple Selectors** (no memoization):
- Direct state property access
- Examples: `selectSearchQuery`, `selectCurrentPage`, `selectIsLoading`
- Reason: Redux already optimizes direct property access

**Derived Selectors** (memoized with `createSelector`):
- Computed values based on multiple state properties
- Examples: `selectHasActiveFilters`, `selectActiveFilterCount`
- Reason: Prevents re-computation when dependencies haven't changed

**Complex Selector** (`selectFilters`):
- Memoized even though it's "simple" because it creates a new object
- Prevents components from re-rendering when filter object reference changes
- Dependencies: Only filter state itself

---

## Type Definitions

```typescript
interface FilterState {
  subjects: string[];
  categories: string[];
  product_types: string[];
  products: number[];
  modes_of_delivery: string[];
}

interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  code: string;
}

// Selector types
type FilterSelector = (state: RootState) => FilterState;
type SearchQuerySelector = (state: RootState) => string;
type ActiveFiltersSelector = (state: RootState) => boolean;
type FilterCountSelector = (state: RootState) => number;
```

---

## Usage Examples

```javascript
// Import in component
import { useSelector } from 'react-redux';
import {
  selectFilters,
  selectSearchQuery,
  selectHasActiveFilters,
  selectActiveFilterCount
} from '../store/slices/filtersSlice';

function FilterPanel() {
  // Basic selectors
  const filters = useSelector(selectFilters);
  const searchQuery = useSelector(selectSearchQuery);

  // Derived selectors (memoized)
  const hasActiveFilters = useSelector(selectHasActiveFilters);
  const filterCount = useSelector(selectActiveFilterCount);

  return (
    <div>
      <p>Active filters: {filterCount}</p>
      {hasActiveFilters && <button>Clear All</button>}
      <p>Subjects: {filters.subjects.join(', ')}</p>
    </div>
  );
}
```

---

## Testing Contract

**Unit Tests Required**:

**Basic Selectors**:
- ✅ selectFilters returns correct filter object
- ✅ selectSearchQuery returns search query string
- ✅ selectSearchFilterProductIds returns ESSP ID array
- ✅ selectCurrentPage returns page number
- ✅ selectPageSize returns page size
- ✅ selectIsFilterPanelOpen returns boolean
- ✅ selectIsLoading returns boolean
- ✅ selectError returns error or null
- ✅ selectAppliedFilters returns applied filters
- ✅ selectLastUpdated returns timestamp
- ✅ selectFilterCounts returns counts object

**Validation Selectors**:
- ✅ selectValidationErrors returns errors array
- ✅ selectHasValidationErrors returns true when errors exist
- ✅ selectHasValidationErrors returns false when only warnings exist

**Derived Selectors**:
- ✅ selectHasActiveFilters returns false when no filters
- ✅ selectHasActiveFilters returns true when any filter active
- ✅ selectHasActiveFilters returns true when search query active
- ✅ selectActiveFilterCount returns 0 when no filters
- ✅ selectActiveFilterCount counts all filter types
- ✅ selectActiveFilterCount counts search query as 1

**Memoization Tests**:
- ✅ Derived selectors return same reference when state unchanged
- ✅ Derived selectors recompute when dependencies change
- ✅ Derived selectors don't recompute when unrelated state changes

**Test File**: `filterSelectors.test.js`
**Estimated Tests**: 20-25 unit tests

---

## Performance Requirements

- ✅ Simple selectors must be O(1) (direct property access)
- ✅ Derived selectors must be memoized (no recomputation unless dependencies change)
- ✅ selectActiveFilterCount must be O(1) after initial computation
- ✅ selectHasActiveFilters must short-circuit on first truthy value

---

## Integration with Components

**Best Practices**:
1. Always use selectors instead of accessing `state.filters` directly
2. Use the most specific selector available (e.g., `selectSearchQuery` not `selectFilters().searchQuery`)
3. Rely on memoization for performance (don't add your own caching)
4. Multiple components can use same selectors without performance penalty

**Anti-Patterns to Avoid**:
```javascript
// ❌ DON'T: Direct state access
const filters = useSelector(state => state.filters);

// ✅ DO: Use selector
const filters = useSelector(selectFilters);

// ❌ DON'T: Compute derived values in component
const hasFilters = filters.subjects.length > 0 || filters.categories.length > 0;

// ✅ DO: Use derived selector
const hasFilters = useSelector(selectHasActiveFilters);
```

---

## Backward Compatibility

**Guarantees**:
- ✅ All selector names unchanged
- ✅ All selector signatures unchanged
- ✅ All selector return types unchanged
- ✅ Memoization behavior unchanged (createSelector already used)
- ✅ Can be imported from filtersSlice.js (re-exported)

---

**Status**: Contract defined, ready for implementation
