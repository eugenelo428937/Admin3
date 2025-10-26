# Contract: Navigation Filters Module

**Module**: `navigationFilters.slice.js`
**Responsibility**: Navigation-specific filter actions with special clearing behaviors
**Version**: 1.0.0

---

## Overview

This module provides navigation menu actions that implement a "drill-down" UX pattern. Each action clears certain filters and sets a specific filter, allowing users to navigate from broad categories (subjects) to specific items (products).

**Key Behavior**: These actions modify base filter state, not separate navigation state.

---

## Exports

### No Separate Initial State

This module operates on the base filter state from `baseFilters.slice.js`. It does not add new state properties.

---

## Reducer Functions

### Navigation Actions

```javascript
/**
 * Select subject from navigation menu
 * Clears: Nothing (preserves all filters)
 * Sets: subjects = [payload]
 *
 * @param {Object} state - Current state
 * @param {Object} action - Action with payload: string (subject code)
 */
navSelectSubject: (state, action) => {
  state.subjects = [action.payload];
  state.currentPage = 1;
  state.lastUpdated = Date.now();
}

/**
 * View all products for current subject(s)
 * Clears: products, categories, product_types, modes_of_delivery, searchQuery
 * Preserves: subjects
 *
 * @param {Object} state - Current state
 */
navViewAllProducts: (state) => {
  state.products = [];
  state.categories = [];
  state.product_types = [];
  state.modes_of_delivery = [];
  state.searchQuery = '';
  state.currentPage = 1;
  state.lastUpdated = Date.now();
}

/**
 * Select product group (product type) from navigation
 * Clears: products, categories, modes_of_delivery, searchQuery
 * Sets: product_types = [payload]
 * Preserves: subjects
 *
 * @param {Object} state - Current state
 * @param {Object} action - Action with payload: string (product type code)
 */
navSelectProductGroup: (state, action) => {
  state.products = [];
  state.categories = [];
  state.product_types = [action.payload];
  state.modes_of_delivery = [];
  state.searchQuery = '';
  state.currentPage = 1;
  state.lastUpdated = Date.now();
}

/**
 * Select specific product from navigation
 * Clears: categories, product_types, modes_of_delivery, searchQuery
 * Sets: products = [payload]
 * Preserves: subjects
 *
 * @param {Object} state - Current state
 * @param {Object} action - Action with payload: number (product ID)
 */
navSelectProduct: (state, action) => {
  state.categories = [];
  state.product_types = [];
  state.products = [action.payload];
  state.modes_of_delivery = [];
  state.searchQuery = '';
  state.currentPage = 1;
  state.lastUpdated = Date.now();
}

/**
 * Select mode of delivery from navigation
 * Clears: categories, product_types, products, searchQuery
 * Sets: modes_of_delivery = [payload]
 * Preserves: subjects
 *
 * @param {Object} state - Current state
 * @param {Object} action - Action with payload: string (mode code)
 */
navSelectModeOfDelivery: (state, action) => {
  state.categories = [];
  state.product_types = [];
  state.products = [];
  state.modes_of_delivery = [action.payload];
  state.searchQuery = '';
  state.currentPage = 1;
  state.lastUpdated = Date.now();
}
```

---

## Navigation Flow Patterns

### Drill-Down Pattern

```
User Click: Subject in Menu
  ↓
navSelectSubject('CM2')
  ↓
State: { subjects: ['CM2'], ... }
  ↓
User sees all CM2 products

User Click: Product Group
  ↓
navSelectProductGroup('Core Study Material')
  ↓
State: { subjects: ['CM2'], product_types: ['Core Study Material'], categories: [], products: [], ... }
  ↓
User sees CM2 Core Study Materials

User Click: Specific Product
  ↓
navSelectProduct(123)
  ↓
State: { subjects: ['CM2'], products: [123], product_types: [], categories: [], ... }
  ↓
User sees only that product
```

### Reset Pattern

```
User Click: "View All Products"
  ↓
navViewAllProducts()
  ↓
State: { subjects: ['CM2'], products: [], categories: [], product_types: [], modes_of_delivery: [], searchQuery: '' }
  ↓
User sees all CM2 products again
```

---

## Type Definitions

```typescript
interface NavigationFiltersReducers {
  navSelectSubject: (state: FilterState, action: PayloadAction<string>) => void;
  navViewAllProducts: (state: FilterState) => void;
  navSelectProductGroup: (state: FilterState, action: PayloadAction<string>) => void;
  navSelectProduct: (state: FilterState, action: PayloadAction<number>) => void;
  navSelectModeOfDelivery: (state: FilterState, action: PayloadAction<string>) => void;
}
```

---

## Usage Examples

```javascript
// Import module in main slice
import { navigationFiltersReducers } from './navigationFilters.slice';

// Combine in createSlice
const filtersSlice = createSlice({
  name: 'filters',
  initialState: { /* ... */ },
  reducers: {
    ...baseFiltersReducers,
    ...navigationFiltersReducers,
  }
});

// Usage in component
import { navSelectSubject, navSelectProductGroup } from '../store/slices/filtersSlice';

// User clicks subject in menu
dispatch(navSelectSubject('CM2'));

// User clicks product group
dispatch(navSelectProductGroup('Core Study Material'));
```

---

## Testing Contract

**Unit Tests Required**:
- ✅ navSelectSubject sets subject correctly
- ✅ navSelectSubject preserves other filters
- ✅ navViewAllProducts clears correct filters
- ✅ navViewAllProducts preserves subjects
- ✅ navSelectProductGroup sets product_types correctly
- ✅ navSelectProductGroup clears correct filters
- ✅ navSelectProductGroup preserves subjects
- ✅ navSelectProduct sets products correctly
- ✅ navSelectProduct clears correct filters
- ✅ navSelectProduct preserves subjects
- ✅ navSelectModeOfDelivery sets modes_of_delivery correctly
- ✅ navSelectModeOfDelivery clears correct filters
- ✅ navSelectModeOfDelivery preserves subjects
- ✅ All actions update lastUpdated timestamp
- ✅ All actions reset currentPage to 1

**Test File**: `navigationFilters.test.js`
**Estimated Tests**: 12-15 unit tests

---

## Integration with Base Filters

**Dependencies**:
- Operates on state properties from `baseFilters.slice.js`
- No separate state management
- Shares state mutation patterns with base filters

**Coordination**:
- Both modules can operate on same state properties
- Navigation actions are "higher-level" operations that coordinate multiple filter changes
- Base filter actions are "low-level" operations that change one filter at a time

**Example Coordination**:
```javascript
// Low-level: User toggles a subject checkbox
dispatch(toggleSubjectFilter('CM2'));
// State: { subjects: ['CB1', 'CM2'], ... }

// High-level: User clicks subject in menu
dispatch(navSelectSubject('CM2'));
// State: { subjects: ['CM2'], ... } // Replaces, doesn't toggle
```

---

## Backward Compatibility

**Guarantees**:
- ✅ All action names unchanged
- ✅ All action payloads unchanged
- ✅ All clearing behaviors unchanged
- ✅ All preservation behaviors unchanged
- ✅ Integration with URL sync middleware unchanged

---

## Performance Requirements

- ✅ All actions must execute in O(1) time (setting arrays directly)
- ✅ No iteration or filtering required
- ✅ State updates must be atomic

---

**Status**: Contract defined, ready for implementation
