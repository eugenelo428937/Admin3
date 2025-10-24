# How to Add a New Filter - Developer Guide

**Last Updated**: 2025-10-23
**Story**: 1.11 - Filter Registry Pattern

## Quick Start

Adding a new filter type now requires changes to **only 2 files** (was 6+ files before):

1. **FilterRegistry.js** - Register filter metadata
2. **filtersSlice.js** - Add Redux state and actions

That's it! FilterPanel and ActiveFilters will automatically render the new filter.

## Step-by-Step Guide

### Step 1: Register Filter in FilterRegistry

**File**: `frontend/react-Admin3/src/store/filters/filterRegistry.js`

Add a new `FilterRegistry.register()` call at the bottom of the file:

```javascript
// Example: Adding a "Tutorial Location" filter
FilterRegistry.register({
  type: 'tutorial_location',           // Redux state key (must match)
  label: 'Tutorial Location',          // Singular form for chip labels
  pluralLabel: 'Tutorial Locations',   // Plural form for filter panel sections
  urlParam: 'tutorial_location',       // Primary URL parameter name
  urlParamAliases: ['loc'],           // Alternative URL params (optional)
  color: 'secondary',                  // MUI chip color: primary, secondary, info, success, warning, error
  multiple: true,                      // Allow multiple selections?
  dataType: 'array',                   // 'array', 'string', 'boolean', 'number'
  urlFormat: 'comma-separated',        // 'comma-separated', 'indexed', 'single'
  getDisplayValue: (value) => value,   // Format value for display (optional)
  icon: null,                          // Material-UI icon name (optional)
  order: 6,                            // Display order in FilterPanel (lower = earlier)
});
```

### Step 2: Add Redux State and Actions

**File**: `frontend/react-Admin3/src/store/slices/filtersSlice.js`

#### 2a. Add State Field

Find the `initialState` object and add your filter:

```javascript
const initialState = {
  subjects: [],
  categories: [],
  product_types: [],
  products: [],
  modes_of_delivery: [],
  tutorial_location: [],  // ← Add your new filter here
  // ... other fields
};
```

#### 2b. Add Reducer Actions

Add setter, toggle, and remove actions in the `reducers` section:

```javascript
const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    // ... existing reducers

    // Add your filter's actions:
    setTutorialLocation: (state, action) => {
      state.tutorial_location = action.payload;
    },
    toggleTutorialLocationFilter: (state, action) => {
      const value = action.payload;
      if (state.tutorial_location.includes(value)) {
        state.tutorial_location = state.tutorial_location.filter(v => v !== value);
      } else {
        state.tutorial_location.push(value);
      }
    },
    removeTutorialLocationFilter: (state, action) => {
      state.tutorial_location = state.tutorial_location.filter(v => v !== action.payload);
    },

    // Don't forget to add to clearAllFilters:
    clearAllFilters: (state) => {
      state.subjects = [];
      state.categories = [];
      state.product_types = [];
      state.products = [];
      state.modes_of_delivery = [];
      state.tutorial_location = [];  // ← Add here too
      state.searchQuery = '';
    },
  },
});
```

#### 2c. Export Actions

Add your actions to the exports at the bottom:

```javascript
export const {
  setSubjects,
  toggleSubjectFilter,
  removeSubjectFilter,
  // ... other exports
  setTutorialLocation,           // ← Add here
  toggleTutorialLocationFilter,  // ← Add here
  removeTutorialLocationFilter,  // ← Add here
} = filtersSlice.actions;
```

### Step 3: Update ActiveFilters (If Needed)

**File**: `frontend/react-Admin3/src/components/Product/ActiveFilters.js`

Add removal action to `FILTER_REMOVAL_ACTIONS` map:

```javascript
const FILTER_REMOVAL_ACTIONS = {
    subjects: removeSubjectFilter,
    categories: removeCategoryFilter,
    product_types: removeProductTypeFilter,
    products: removeProductFilter,
    modes_of_delivery: removeModeOfDeliveryFilter,
    tutorial_location: removeTutorialLocationFilter,  // ← Add here
};
```

### Step 4: Update FilterPanel (If Needed - Advanced)

**File**: `frontend/react-Admin3/src/components/Product/FilterPanel.js`

**Only needed if** your filter has custom rendering logic. For most filters, this is automatic!

If you need custom handling, add a case in the `handleFilterChange` function:

```javascript
const handleFilterChange = useCallback((filterType, value) => {
    switch (filterType) {
        case 'subjects':
            dispatch(toggleSubjectFilter(value));
            break;
        // ... other cases
        case 'tutorial_location':  // ← Add custom handling if needed
            dispatch(toggleTutorialLocationFilter(value));
            break;
        default:
            // Automatically handles most filters
    }
}, [dispatch]);
```

## Done! 🎉

That's it! Your new filter will now:

✅ Appear in FilterPanel (automatically)
✅ Display as chips in ActiveFilters (automatically)
✅ Sync with URL parameters (automatically)
✅ Update product search results (automatically)

## Common Filter Types

### Array Filter (Multiple Selection)
```javascript
FilterRegistry.register({
  type: 'regions',
  label: 'Region',
  pluralLabel: 'Regions',
  urlParam: 'region',
  color: 'info',
  multiple: true,
  dataType: 'array',
  urlFormat: 'comma-separated',
  order: 10,
});
```

### Boolean Filter (On/Off Toggle)
```javascript
FilterRegistry.register({
  type: 'has_discount',
  label: 'Discount Available',
  pluralLabel: 'Discount Available',
  urlParam: 'has_discount',
  color: 'success',
  multiple: false,
  dataType: 'boolean',
  urlFormat: 'single',
  getDisplayValue: () => 'Active',
  order: 11,
});
```

### String Filter (Single Selection)
```javascript
FilterRegistry.register({
  type: 'sort_by',
  label: 'Sort By',
  pluralLabel: 'Sort By',
  urlParam: 'sort',
  color: 'default',
  multiple: false,
  dataType: 'string',
  urlFormat: 'single',
  getDisplayValue: (value) => {
    const labels = {
      'price_asc': 'Price: Low to High',
      'price_desc': 'Price: High to Low',
      'name': 'Name A-Z',
    };
    return labels[value] || value;
  },
  order: 12,
});
```

## URL Parameter Formats

### Comma-Separated
```
?category=Materials,Bundle,Tutorial
```

```javascript
urlFormat: 'comma-separated'
```

### Indexed
```
?subject_code=CM2&subject_1=SA1&subject_2=CB1
```

```javascript
urlFormat: 'indexed'
```

### Single
```
?sort=price_asc
```

```javascript
urlFormat: 'single'
```

## Field Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `type` | string | ✅ Yes | - | Redux state key (must match slice) |
| `label` | string | ✅ Yes | - | Singular form (e.g., "Subject") |
| `urlParam` | string | ✅ Yes | - | Primary URL parameter name |
| `pluralLabel` | string | No | `label + 's'` | Plural form (e.g., "Subjects") |
| `urlParamAliases` | string[] | No | `[]` | Alternative URL parameter names |
| `color` | string | No | `'default'` | MUI chip color variant |
| `multiple` | boolean | No | `true` | Allow multiple selections |
| `dataType` | string | No | `'array'` | Data type: array, string, boolean, number |
| `urlFormat` | string | No | `'comma-separated'` | URL format: comma-separated, indexed, single |
| `getDisplayValue` | function | No | `(v) => v` | Format value for display in UI |
| `icon` | string | No | `null` | Material-UI icon name |
| `order` | number | No | `100` | Display order (lower appears first) |

## Custom Display Values

Use `getDisplayValue` to format filter values for display:

```javascript
FilterRegistry.register({
  type: 'price_range',
  label: 'Price Range',
  urlParam: 'price',
  getDisplayValue: (value) => {
    const ranges = {
      '0-50': 'Under £50',
      '50-100': '£50 - £100',
      '100-200': '£100 - £200',
      '200+': 'Over £200',
    };
    return ranges[value] || value;
  },
});
```

## Testing Your New Filter

After adding a filter, verify it works:

1. **FilterPanel**: Check filter appears as checkbox/radio section
2. **URL Sync**: Select filter → verify URL updates
3. **ActiveFilters**: Verify chip appears with correct color and label
4. **Clear**: Click chip's X button → verify filter removes
5. **Persistence**: Reload page → verify filter restores from URL
6. **API**: Verify backend receives correct filter parameters

## Troubleshooting

### Filter doesn't appear in FilterPanel
- ✅ Check `type` matches Redux state key exactly
- ✅ Check `dataType` is 'array' (boolean/string filters don't render in panel)
- ✅ Verify FilterRegistry.register() is called

### Filter chip doesn't appear in ActiveFilters
- ✅ Check Redux state has filter values
- ✅ Check `FILTER_REMOVAL_ACTIONS` includes your filter
- ✅ Verify import statement for removal action

### URL doesn't sync
- ✅ Check `urlParam` is unique
- ✅ Check `urlFormat` matches your data type
- ✅ Verify middleware is enabled in store

### Filter doesn't clear
- ✅ Add filter to `clearAllFilters` reducer
- ✅ Add removal action to `FILTER_REMOVAL_ACTIONS`

## Before FilterRegistry (6+ Files)

### Old Way - Required Modifications in:
1. ❌ FilterPanel.js (add hardcoded section)
2. ❌ ActiveFilters.js (add to FILTER_CONFIG)
3. ❌ filterUrlManager.js (add URL parameter mapping)
4. ❌ filtersSlice.js (add state and actions)
5. ❌ ProductList.js (potentially add filter handling)
6. ❌ SearchModal.js (potentially add filter option)

### New Way - Only 2 Files:
1. ✅ FilterRegistry.js (register filter metadata)
2. ✅ filtersSlice.js (add Redux state and actions)

**Result**: **67% reduction** in files that need modification!

## Advanced: Conditional Rendering

Filters registered in FilterRegistry automatically render in FilterPanel and ActiveFilters. To conditionally show filters:

```javascript
// In FilterPanel or ActiveFilters
const registeredFilters = FilterRegistry.getAll().filter(config => {
  // Example: Only show filters with values
  return filters[config.type]?.length > 0;
});
```

## See Also

- `docs/FILTER-REGISTRY-PATTERN.md` - Architecture overview
- `specs/spec-story-1.11-2025_10_22.md` - Full specification
- `src/store/filters/filterRegistry.js` - Registry implementation
- `src/store/filters/__tests__/filterRegistry.test.js` - Test examples

## Questions?

Check existing filter registrations in `filterRegistry.js` for examples, or refer to the test suite for comprehensive usage patterns.

---

**Summary**: Add filter → Register in FilterRegistry → Add Redux state/actions → Done!
