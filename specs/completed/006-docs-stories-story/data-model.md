# Data Model - Display Navbar Filters in FilterPanel and ActiveFilters

**Feature**: Stories 1.7-1.8
**Date**: 2025-10-19

## Overview

This feature does NOT introduce new data models. It extends existing UI components to display navbar filters that already exist in Redux state (added in Story 1.2).

## Existing Data Model (No Changes)

### Redux State Shape

```javascript
{
  filters: {
    // Existing array filters
    subjects: string[],              // e.g., ['CM2', 'SA1']
    categories: string[],            // e.g., ['Bundle', 'Materials']
    product_types: string[],         // e.g., ['PRINTED', 'EBOOK']
    products: string[],              // e.g., ['74', '79']
    modes_of_delivery: string[],    // e.g., ['Online', 'Postal']

    // NAVBAR FILTERS (Story 1.2 - already exist, just displaying them)
    tutorial_format: 'online' | 'in_person' | 'hybrid' | null,
    distance_learning: boolean,      // true = only distance learning products
    tutorial: boolean,               // true = only tutorial products

    // Search and pagination
    searchQuery: string,
    currentPage: number,
    pageSize: number,

    // UI state
    isFilterPanelOpen: boolean,
    isLoading: boolean,
    error: string | null,

    // Filter counts from API
    filterCounts: {
      subjects: Record<string, number>,
      categories: Record<string, number>,
      product_types: Record<string, number>,
      products: Record<string, number>,
      modes_of_delivery: Record<string, number>
    },

    // Metadata
    lastUpdated: number | null
  }
}
```

## UI Component State

### FilterPanel Component (No New State)

**Props**: None (reads from Redux)

**Redux Selectors**:
```javascript
const filters = useSelector(selectFilters);
// Accesses: filters.tutorial_format, filters.distance_learning, filters.tutorial
```

**Redux Actions Dispatched**:
```javascript
dispatch(setTutorialFormat('online'));    // Set tutorial format
dispatch(setTutorialFormat(null));         // Clear tutorial format
dispatch(toggleDistanceLearning());        // Toggle distance learning
dispatch(setTutorial(true));               // Enable tutorial filter
dispatch(setTutorial(false));              // Disable tutorial filter
dispatch(clearAllFilters());               // Clear all (existing action)
```

**Local State**: None required

### ActiveFilters Component (Configuration Only)

**Props**: None (reads from Redux)

**Redux Selectors**:
```javascript
const filters = useSelector(selectFilters);
// Accesses all filter fields including navbar filters
```

**Redux Actions Dispatched**:
```javascript
// Same actions as FilterPanel (chip delete triggers clear action)
dispatch(setTutorialFormat(null));
dispatch(toggleDistanceLearning());
dispatch(setTutorial(false));
```

**Configuration Object** (FILTER_CONFIG - extended):
```javascript
const FILTER_CONFIG = {
  // ... existing filter configs

  tutorial_format: {
    label: 'Tutorial Format',
    color: 'secondary',
    getDisplayValue: (value) => {
      const formatLabels = {
        online: 'Online',
        in_person: 'In-Person',
        hybrid: 'Hybrid',
      };
      return formatLabels[value] || value;
    },
  },
  distance_learning: {
    label: 'Distance Learning',
    color: 'secondary',
    getDisplayValue: () => 'Active',
  },
  tutorial: {
    label: 'Tutorial Products',
    color: 'secondary',
    getDisplayValue: () => 'Active',
  },
};
```

## Value Mappings

### Tutorial Format Values

| Redux Value | URL Parameter | Display Label | Radio Button Label |
|-------------|---------------|---------------|-------------------|
| `'online'` | `tutorial_format=online` | "Online" | "Online" |
| `'in_person'` | `tutorial_format=in_person` | "In-Person" | "In-Person" |
| `'hybrid'` | `tutorial_format=hybrid` | "Hybrid" | "Hybrid" |
| `null` | (parameter absent) | - | (none checked) |

**Validation**: Only accepts exact strings 'online', 'in_person', 'hybrid', or null. Invalid values ignored.

### Distance Learning Values

| Redux Value | URL Parameter | Display Label | Checkbox State |
|-------------|---------------|---------------|----------------|
| `true` | `distance_learning=1` | "Distance Learning Only" | Checked |
| `false` | (parameter absent) | - | Unchecked |

**Validation**: Coerced to boolean. Only '1' in URL → true, anything else → false.

### Tutorial Values

| Redux Value | URL Parameter | Display Label | Checkbox State |
|-------------|---------------|---------------|----------------|
| `true` | `tutorial=1` | "Tutorial Products Only" | Checked |
| `false` | (parameter absent) | - | Unchecked |

**Validation**: Coerced to boolean. Only '1' in URL → true, anything else → false.

## State Transitions

### Tutorial Format Selection Flow

```
1. User clicks "Online" radio button in FilterPanel
   ↓
2. dispatch(setTutorialFormat('online'))
   ↓
3. Redux state updated: filters.tutorial_format = 'online'
   ↓
4. URL sync middleware updates URL: ?tutorial_format=online
   ↓
5. useProductsSearch detects filter change
   ↓
6. API call with tutorial_format: 'online' in payload
   ↓
7. Product list re-renders with filtered results
   ↓
8. FilterPanel re-renders: "Online" radio checked
   ↓
9. ActiveFilters re-renders: "Tutorial Format: Online" chip appears
```

### Distance Learning Toggle Flow

```
1. User clicks "Distance Learning Only" checkbox
   ↓
2. dispatch(toggleDistanceLearning())
   ↓
3. Redux state toggled: filters.distance_learning = !filters.distance_learning
   ↓
4. URL sync middleware updates URL: ?distance_learning=1 (or removes parameter)
   ↓
5. useProductsSearch detects filter change
   ↓
6. API call with distance_learning boolean in payload
   ↓
7. Product list re-renders with filtered results
   ↓
8. FilterPanel re-renders: checkbox checked/unchecked
   ↓
9. ActiveFilters re-renders: "Distance Learning" chip appears/disappears
```

### Chip Delete Flow

```
1. User clicks × on "Tutorial Format: Online" chip
   ↓
2. dispatch(setTutorialFormat(null))
   ↓
3. Redux state cleared: filters.tutorial_format = null
   ↓
4. URL sync middleware removes parameter from URL
   ↓
5. useProductsSearch detects filter change
   ↓
6. API call without tutorial_format in payload
   ↓
7. Product list re-renders with more products (filter removed)
   ↓
8. FilterPanel re-renders: no radio checked
   ↓
9. ActiveFilters re-renders: chip disappears
```

### Clear All Flow

```
1. User clicks "Clear All Filters" button
   ↓
2. dispatch(clearAllFilters())
   ↓
3. Redux state reset to initial values (all filters cleared)
   ↓
4. URL sync middleware resets URL to /products
   ↓
5. useProductsSearch detects filter change
   ↓
6. API call with no filters in payload
   ↓
7. Product list re-renders with all products
   ↓
8. FilterPanel re-renders: all checkboxes/radios unchecked
   ↓
9. ActiveFilters re-renders: all chips (including navbar filter chips) disappear
```

## URL State Synchronization

### URL Parameter Format (Handled by existing middleware)

**Single URL with multiple navbar filters**:
```
/products?tutorial_format=online&distance_learning=1&tutorial=1
```

**Combined with existing filters**:
```
/products?subject_code=CB1&tutorial_format=online&distance_learning=1
```

**Parsing Logic** (existing - no changes):
```javascript
// parseUrlToFilters() in urlSyncMiddleware.js
const params = new URLSearchParams(window.location.search);

tutorial_format: params.get('tutorial_format'),  // 'online' | 'in_person' | 'hybrid' | null
distance_learning: params.get('distance_learning') === '1',  // boolean
tutorial: params.get('tutorial') === '1',  // boolean
```

**Building Logic** (existing - no changes):
```javascript
// buildUrlFromFilters() in urlSyncMiddleware.js
if (filters.tutorial_format) {
  params.set('tutorial_format', filters.tutorial_format);
}
if (filters.distance_learning) {
  params.set('distance_learning', '1');
}
if (filters.tutorial) {
  params.set('tutorial', '1');
}
```

## API Contract (No Changes)

### Existing API Endpoint

**Endpoint**: `POST /api/products/unified-search/`

**Request Payload** (navbar filters included by useProductsSearch hook):
```json
{
  "filters": {
    "subjects": ["CB1"],
    "categories": [],
    "product_types": [],
    "products": [],
    "modes_of_delivery": [],
    "tutorial_format": "online",        // ← Navbar filter
    "distance_learning": true,          // ← Navbar filter
    "tutorial": false,                  // ← Navbar filter
    "searchQuery": ""
  },
  "navbarFilters": {
    "tutorial_format": "online",
    "distance_learning": true,
    "tutorial": false
  },
  "pagination": {
    "page": 1,
    "page_size": 20
  },
  "options": {
    "include_bundles": true,
    "include_analytics": false
  }
}
```

**Response** (unchanged):
```json
{
  "products": [...],
  "pagination": { ... },
  "filterCounts": { ... }
}
```

**No backend changes required** - Backend already handles navbar filters (Story 1.4).

## Validation Rules

### Input Validation

**Tutorial Format**:
- Must be one of: 'online', 'in_person', 'hybrid', or null
- Invalid values → ignored, treated as null
- Case-sensitive

**Distance Learning**:
- Must be boolean (true/false)
- URL parameter '1' → true
- URL parameter absent → false
- Any other value → false

**Tutorial**:
- Must be boolean (true/false)
- URL parameter '1' → true
- URL parameter absent → false
- Any other value → false

### Business Rules

**Filter Combination Logic**:
- All filters use AND logic (must match all active filters)
- Multiple navbar filters active simultaneously is valid
- Navbar filters combine with existing filters (subjects, categories, etc.)

**Example**:
```javascript
{
  subjects: ['CB1'],
  tutorial_format: 'online',
  distance_learning: true
}
// Products must be: CB1 subject AND online tutorials AND distance learning
```

## Summary

**Key Points**:
1. **No new data models** - Uses existing Redux state from Story 1.2
2. **No state management changes** - Just reading and dispatching existing actions
3. **No API changes** - Backend already handles navbar filters
4. **Pure UI extension** - Displaying and interacting with existing data
5. **URL synchronization automatic** - Middleware handles all URL updates

**Data Flow**:
```
User Interaction → Redux Action → State Update → URL Sync → API Call → UI Re-render
                                       ↑                                     ↓
                                       └─────────── (Feedback Loop) ────────┘
```

All data flows already implemented - this feature just adds UI controls to trigger them.
