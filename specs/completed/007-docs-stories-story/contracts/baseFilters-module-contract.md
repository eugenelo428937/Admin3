# Contract: Base Filters Module

**Module**: `baseFilters.slice.js`
**Responsibility**: Core filter state and standard filter operations
**Version**: 1.0.0

---

## Exports

### Initial State

```javascript
export const baseFiltersInitialState = {
  // Filter arrays
  subjects: [],
  categories: [],
  product_types: [],
  products: [],
  modes_of_delivery: [],

  // Search
  searchQuery: '',
  searchFilterProductIds: [],

  // Pagination
  currentPage: 1,
  pageSize: 20,

  // UI State
  isFilterPanelOpen: false,
  appliedFilters: {},

  // Loading/Error
  isLoading: false,
  error: null,

  // Metadata
  lastUpdated: null,

  // Filter counts
  filterCounts: {
    subjects: {},
    categories: {},
    product_types: {},
    products: {},
    modes_of_delivery: {}
  }
};
```

---

## Reducer Functions

### Set Actions

```javascript
/**
 * Set subjects filter
 * @param {Object} state - Current state
 * @param {Object} action - Action with payload: string[]
 */
setSubjects: (state, action) => {
  state.subjects = action.payload;
  state.currentPage = 1;
  state.lastUpdated = Date.now();
}

// Similar for:
// setCategories(payload: string[])
// setProductTypes(payload: string[])
// setProducts(payload: number[])
// setModesOfDelivery(payload: string[])
// setSearchQuery(payload: string)
// setSearchFilterProductIds(payload: number[])
```

### Toggle Actions

```javascript
/**
 * Toggle subject in filter array
 * @param {Object} state - Current state
 * @param {Object} action - Action with payload: string
 */
toggleSubjectFilter: (state, action) => {
  const value = action.payload;
  const index = state.subjects.indexOf(value);
  if (index === -1) {
    state.subjects.push(value);
  } else {
    state.subjects.splice(index, 1);
  }
  state.currentPage = 1;
  state.lastUpdated = Date.now();
}

// Similar for:
// toggleCategoryFilter(payload: string)
// toggleProductTypeFilter(payload: string)
// toggleProductFilter(payload: number)
// toggleModeOfDeliveryFilter(payload: string)
```

### Remove Actions

```javascript
/**
 * Remove specific subject from filter
 * @param {Object} state - Current state
 * @param {Object} action - Action with payload: string
 */
removeSubjectFilter: (state, action) => {
  const value = action.payload;
  state.subjects = state.subjects.filter(item => item !== value);
  state.currentPage = 1;
  state.lastUpdated = Date.now();
}

// Similar for:
// removeCategoryFilter(payload: string)
// removeProductTypeFilter(payload: string)
// removeProductFilter(payload: number)
// removeModeOfDeliveryFilter(payload: string)
```

### Clear Actions

```javascript
/**
 * Clear specific filter type
 * @param {Object} state - Current state
 * @param {Object} action - Action with payload: 'subjects' | 'categories' | etc.
 */
clearFilterType: (state, action) => {
  const filterType = action.payload;
  switch (filterType) {
    case 'subjects':
      state.subjects = [];
      break;
    case 'categories':
      state.categories = [];
      break;
    case 'product_types':
    case 'producttypes':
      state.product_types = [];
      break;
    case 'products':
      state.products = [];
      break;
    case 'modes_of_delivery':
    case 'modesOfDelivery':
      state.modes_of_delivery = [];
      break;
  }
  state.currentPage = 1;
  state.lastUpdated = Date.now();
}

/**
 * Clear all filters (base only, validation in main slice)
 */
clearAllFilters: (state) => {
  state.subjects = [];
  state.categories = [];
  state.product_types = [];
  state.products = [];
  state.modes_of_delivery = [];
  state.searchQuery = '';
  state.searchFilterProductIds = [];
  state.currentPage = 1;
  state.lastUpdated = Date.now();
}
```

### Multi-Update Actions

```javascript
/**
 * Set multiple filters at once
 * @param {Object} action - Action with payload: Partial<FilterState>
 */
setMultipleFilters: (state, action) => {
  const { subjects, categories, product_types, products, modes_of_delivery } = action.payload;

  if (subjects !== undefined) state.subjects = subjects;
  if (categories !== undefined) state.categories = categories;
  if (product_types !== undefined) state.product_types = product_types;
  if (products !== undefined) state.products = products;
  if (modes_of_delivery !== undefined) state.modes_of_delivery = modes_of_delivery;

  state.currentPage = 1;
  state.lastUpdated = Date.now();
}
```

### Pagination Actions

```javascript
/**
 * Set current page
 * @param {Object} action - Action with payload: number
 */
setCurrentPage: (state, action) => {
  state.currentPage = action.payload;
}

/**
 * Set page size
 * @param {Object} action - Action with payload: number
 */
setPageSize: (state, action) => {
  state.pageSize = action.payload;
  state.currentPage = 1; // Reset to first page
}
```

### UI Actions

```javascript
/**
 * Toggle filter panel visibility
 */
toggleFilterPanel: (state) => {
  state.isFilterPanelOpen = !state.isFilterPanelOpen;
}

/**
 * Set filter panel visibility
 * @param {Object} action - Action with payload: boolean
 */
setFilterPanelOpen: (state, action) => {
  state.isFilterPanelOpen = action.payload;
}
```

### Loading/Error Actions

```javascript
/**
 * Set loading state
 * @param {Object} action - Action with payload: boolean
 */
setLoading: (state, action) => {
  state.isLoading = action.payload;
}

/**
 * Set error state
 * @param {Object} action - Action with payload: string | null
 */
setError: (state, action) => {
  state.error = action.payload;
  state.isLoading = false;
}

/**
 * Clear error state
 */
clearError: (state) => {
  state.error = null;
}
```

### Utility Actions

```javascript
/**
 * Reset all filters to initial state
 */
resetFilters: (state) => {
  state.subjects = [];
  state.categories = [];
  state.product_types = [];
  state.products = [];
  state.modes_of_delivery = [];
  state.searchQuery = '';
  state.searchFilterProductIds = [];
  state.currentPage = 1;
  state.error = null;
  state.lastUpdated = Date.now();
}

/**
 * Apply filters (cache current state)
 */
applyFilters: (state) => {
  state.appliedFilters = {
    subjects: [...state.subjects],
    categories: [...state.categories],
    product_types: [...state.product_types],
    products: [...state.products],
    modes_of_delivery: [...state.modes_of_delivery],
    searchQuery: state.searchQuery,
  };
  state.lastUpdated = Date.now();
}

/**
 * Set filter counts from API
 * @param {Object} action - Action with payload: FilterCounts
 */
setFilterCounts: (state, action) => {
  state.filterCounts = action.payload;
}
```

---

## Type Definitions

```typescript
interface FilterCounts {
  subjects: Record<string, number>;
  categories: Record<string, number>;
  product_types: Record<string, number>;
  products: Record<string, number>;
  modes_of_delivery: Record<string, number>;
}

interface BaseFiltersState {
  subjects: string[];
  categories: string[];
  product_types: string[];
  products: number[];
  modes_of_delivery: string[];
  searchQuery: string;
  searchFilterProductIds: number[];
  currentPage: number;
  pageSize: number;
  isFilterPanelOpen: boolean;
  appliedFilters: object;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  filterCounts: FilterCounts;
}
```

---

## Usage Examples

```javascript
// Import module in main slice
import { baseFiltersInitialState, baseFiltersReducers } from './baseFilters.slice';

// Combine in createSlice
const filtersSlice = createSlice({
  name: 'filters',
  initialState: {
    ...baseFiltersInitialState,
    // ... other state
  },
  reducers: {
    ...baseFiltersReducers,
    // ... other reducers
  }
});
```

---

## Testing Contract

**Unit Tests Required**:
- ✅ Each set action updates state correctly
- ✅ Each toggle action adds/removes correctly
- ✅ Each remove action filters correctly
- ✅ clearFilterType clears correct filter
- ✅ clearAllFilters resets base filters
- ✅ setMultipleFilters updates multiple filters
- ✅ Pagination actions update correctly
- ✅ UI actions toggle/set correctly
- ✅ Loading/error actions update correctly
- ✅ Utility actions work as expected
- ✅ lastUpdated timestamp updates on all filter changes
- ✅ currentPage resets to 1 on filter changes

**Test File**: `baseFilters.test.js`
**Estimated Tests**: 30-35 unit tests

---

## Performance Requirements

- ✅ All reducer operations must be O(n) or better
- ✅ Toggle operations must use indexOf (O(n))
- ✅ Filter operations must use Array.filter (O(n))
- ✅ No deep cloning of entire state

---

## Backward Compatibility

**Guarantees**:
- ✅ All reducer function signatures unchanged
- ✅ All state property names unchanged
- ✅ All action payloads unchanged
- ✅ Behavior identical to current implementation

---

**Status**: Contract defined, ready for implementation
