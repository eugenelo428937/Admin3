# Data Model: SearchBox Redux Migration

**Date**: 2025-10-20
**Feature**: Migrate SearchBox to Redux State Management

## Overview

This document defines the Redux state structure for search filter management. The migration consolidates SearchBox local state into the existing Redux filters slice, eliminating duplicate state management and enabling full visibility in Redux DevTools.

## Redux State Structure

### Existing Redux Filters State (No Changes)

```javascript
filters: {
  // Filter arrays (support multiple selections)
  subjects: [],              // Array of subject codes (e.g., ['CM2', 'SA1', 'CB1'])
  categories: [],            // Array of category codes
  product_types: [],         // Array of product type codes (maps to variations)
  products: [],              // Array of product IDs
  modes_of_delivery: [],     // Array of delivery mode codes

  // Search
  searchQuery: '',           // String: search query text

  // Pagination
  currentPage: 1,            // Number: current page in product list
  pageSize: 20,              // Number: items per page

  // UI State
  isFilterPanelOpen: false,  // Boolean: filter panel visibility
  appliedFilters: {},        // Object: cache of applied filters

  // Loading/Error
  isLoading: false,          // Boolean: filter operation in progress
  error: null,               // String | null: error message

  // Metadata
  filterCounts: {            // Object: available filter counts from API
    subjects: {},            // { 'CM2': 5, 'SA1': 3 }
    categories: {},
    product_types: {},
    products: {},
    modes_of_delivery: {}
  },
  lastUpdated: null          // Number | null: timestamp of last update
}
```

### State Mapping from SearchBox Local State

**SearchBox Local State (REMOVED)**:
```javascript
// OLD: Local component state
selectedFilters: {
  subjects: [],           // Array of subject objects { id, code, description }
  product_groups: [],     // Array of product group objects { id, name }
  variations: [],         // Array of variation objects { id, name }
  products: []            // Array of product objects { id, name, shortname }
}
```

**Redux State Mapping (NEW)**:
```javascript
// NEW: Redux centralized state
filters: {
  subjects: [],           // Array of subject codes (strings) - mapped from subject.code
  product_types: [],      // Array of product type codes - mapped from product_groups + variations
  products: []            // Array of product IDs (strings) - mapped from product.id
}
```

**Mapping Logic**:
| SearchBox Local | Redux State | Transformation |
|----------------|-------------|----------------|
| `selectedFilters.subjects` | `filters.subjects` | Extract `.code` from objects → store as strings |
| `selectedFilters.product_groups` | `filters.product_types` | Extract product type identifier → store as strings |
| `selectedFilters.variations` | `filters.product_types` | Variations ARE product types → same array |
| `selectedFilters.products` | `filters.products` | Extract `.id` → store as strings |

## Entity Definitions

### Subject Filter
**Purpose**: Filter products by actuarial subject (e.g., CM2, SA1, CB1)

**Redux Storage**:
```javascript
subjects: ['CM2', 'SA1', 'CB1']  // Array of subject codes (strings)
```

**Display Objects** (from API response, not stored in Redux):
```javascript
{
  id: "101",
  code: "CM2",
  description: "Actuarial Mathematics"
}
```

**Actions**:
- `setSubjects(codes)` - Replace subjects array
- `toggleSubjectFilter(code)` - Add/remove single subject
- `removeSubjectFilter(code)` - Remove specific subject

### Product Type Filter
**Purpose**: Filter products by type/variation (e.g., Printed, eBook, Online Tutorial)

**Redux Storage**:
```javascript
product_types: ['8', '9', '11']  // Array of product type IDs (strings)
```

**Display Objects** (from API response):
```javascript
{
  id: "8",
  name: "Printed Core Study Material",
  description: "Physical textbooks"
}
```

**Mapping Notes**:
- `product_groups` from SearchBox → stored in `product_types`
- `variations` from SearchBox → also stored in `product_types`
- Both represent the same concept: how products are packaged/delivered

**Actions**:
- `setProductTypes(types)` - Replace product_types array
- `toggleProductTypeFilter(typeId)` - Add/remove single type
- `removeProductTypeFilter(typeId)` - Remove specific type

### Product Filter
**Purpose**: Filter by specific product (e.g., "CM2 Mock Pack")

**Redux Storage**:
```javascript
products: ['1234', '5678']  // Array of product IDs (strings)
```

**Display Objects** (from API response):
```javascript
{
  id: "1234",
  name: "CM2 Mock Exam Pack",
  shortname: "CM2 Mock Pack",
  product_short_name: "Mock Pack"
}
```

**Actions**:
- `setProducts(productIds)` - Replace products array
- `toggleProductFilter(productId)` - Add/remove single product
- `removeProductFilter(productId)` - Remove specific product

### Search Query
**Purpose**: Free-text search across products, subjects, categories

**Redux Storage**:
```javascript
searchQuery: "mock pack"  // String
```

**Actions**:
- `setSearchQuery(query)` - Set search query text

## State Transitions

### Filter Selection Flow

```
┌─────────────────┐
│ User clicks     │
│ filter checkbox │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ SearchBox dispatches:   │
│ toggleSubjectFilter('CM2'│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Redux reducer updates   │
│ subjects: ['CM2']       │
│ lastUpdated: timestamp  │
└────────┬────────────────┘
         │
         ├──────────────────────┐
         ▼                      ▼
┌─────────────────┐    ┌──────────────────┐
│ SearchBox       │    │ URL Middleware   │
│ re-renders with │    │ updates browser  │
│ new Redux state │    │ URL parameters   │
└─────────────────┘    └──────────────────┘
```

### Modal Close/Reopen Flow

```
┌──────────────────┐
│ User closes modal│
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ SearchModal unmounts │
│ (component cleanup)  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Redux state persists │
│ (no change)          │
└────────┬─────────────┘
         │
         ▼
┌──────────────────┐
│ User reopens     │
│ modal            │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ SearchBox mounts     │
│ useSelector reads    │
│ Redux state          │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Filters displayed    │
│ (persisted state)    │
└──────────────────────┘
```

### Show Matching Products Flow

```
┌──────────────────────┐
│ User clicks "Show    │
│ Matching Products"   │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ SearchModal calls    │
│ handleShowMatching   │
│ Products()           │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Filters already in   │
│ Redux (no dispatch   │
│ needed)              │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ navigate('/products')│
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ URL middleware syncs │
│ URL parameters       │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ ProductList reads    │
│ Redux and displays   │
│ filtered results     │
└──────────────────────┘
```

## Validation Rules

### Filter Arrays
- **Type**: Array of strings
- **Min Length**: 0 (empty array = no filter)
- **Max Length**: Unlimited (but UI should handle display)
- **Item Type**: String (code/ID)
- **Uniqueness**: No duplicates allowed

### Search Query
- **Type**: String
- **Min Length**: 0 (empty string = no search)
- **Max Length**: 255 characters (typical search limit)
- **Trimming**: Leading/trailing whitespace removed before dispatch
- **Validation**: No special validation (fuzzy search handles all input)

### Timestamps
- **lastUpdated**: Number (milliseconds since epoch) or null
- **Generated by**: Date.now() in reducer
- **Purpose**: Cache invalidation, debugging

## Performance Considerations

### State Size
- Typical filter state: ~500 bytes
- With 10 subjects, 5 product types, 3 products: ~200 bytes
- Search query: ~50 bytes average
- **Total**: < 1 KB typical, < 5 KB maximum

### Update Frequency
- Filter checkbox: 1-5 updates/second typical, 10/second stress test
- Search query: 1 update every 300ms (debounced)
- Redux update overhead: < 1ms per action
- **Target**: < 50ms end-to-end (click → UI update)

### Selector Memoization
All selectors use `createSelector` from Redux Toolkit for memoization:
- Prevents unnecessary component re-renders
- Caches derived state calculations
- Updates only when dependencies change

## Migration Notes

### Data Transformation
When migrating from SearchBox local state to Redux:

**Before** (local state stores objects):
```javascript
selectedFilters.subjects = [
  { id: "101", code: "CM2", description: "Actuarial Mathematics" }
]
```

**After** (Redux stores codes):
```javascript
filters.subjects = ["CM2"]
```

**Transformation Function**:
```javascript
// Extract codes from objects for Redux
const subjectCodes = selectedFilters.subjects.map(s => s.code);
dispatch(setSubjects(subjectCodes));

// Reverse: Match codes to display objects (from API data)
const displaySubjects = apiSubjects.filter(s =>
  filters.subjects.includes(s.code)
);
```

### Backward Compatibility
- URL format unchanged: `/products?subject_code=CM2&group=8`
- API requests unchanged: Still send subject codes, product type IDs
- UI display: Match Redux codes to API response objects for display names

## Related Files

- **Redux Slice**: `frontend/react-Admin3/src/store/slices/filtersSlice.js`
- **URL Middleware**: `frontend/react-Admin3/src/store/middleware/urlSyncMiddleware.js`
- **Components**:
  - `frontend/react-Admin3/src/components/SearchBox.js`
  - `frontend/react-Admin3/src/components/Navigation/SearchModal.js`
  - `frontend/react-Admin3/src/components/SearchResults.js`

## Summary

**Key Points**:
1. No changes to Redux state structure (already comprehensive)
2. Map SearchBox object arrays to Redux string arrays (codes/IDs)
3. `variations` and `product_groups` both map to `product_types`
4. State persists across component mount/unmount by design
5. All filter operations use existing Redux actions
6. Performance impact minimal (< 1ms Redux overhead)

**State Ownership**: Redux owns all filter state. Components only own UI state (loading, error, modal open/close).
