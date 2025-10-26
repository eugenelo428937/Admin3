# Story 1.11: Implement Filter Registry Pattern

**Epic**: Product Filtering State Management Refactoring
**Phase**: 3 - Architecture Improvements (Priority 2)
**Story ID**: 1.11
**Estimated Effort**: 2-3 days
**Dependencies**: Stories 1.7, 1.8 (FilterPanel and ActiveFilters extended with navbar filters)

---

## User Story

As a **developer**,
I want **a centralized filter registry that defines all filter types and their properties**,
So that **adding new filters requires only one configuration entry instead of modifying multiple files**.

---

## Story Context

### Problem Being Solved

Currently, adding a new filter type requires modifying 6+ files:
1. **filtersSlice.js** - Add state field, actions (add, remove, toggle, clear)
2. **FilterPanel.js** - Add renderFilterSection call with specific config
3. **ActiveFilters.js** - Add entry to FILTER_CONFIG mapping
4. **ProductList.js** - Add URL parameter parsing logic (deprecated after Story 1.6, but pattern established)
5. **useProductsSearch.js** - Add to API payload construction
6. **FilterUrlManager.js** (Story 1.10) - Add URL parameter conversion logic

**Code Smell**: **Shotgun Surgery** (one conceptual change requires scattered modifications)

**Problem**: Violates **Open/Closed Principle** (not open for extension without modification)

After implementing the Filter Registry Pattern:
- New filter type = **one registry entry**
- All components read from registry
- Filter rendering, URL conversion, and Redux actions become generic

### Existing System Integration

**Integrates with**:
- `FilterPanel.js` - Read filter configs from registry to render sections
- `ActiveFilters.js` - Read filter configs from registry to render chips
- `FilterUrlManager.js` - Read filter configs from registry for URL conversion
- `filtersSlice.js` - Potentially generate actions from registry (advanced)

**Technology**:
- Pure JavaScript registry (Map-based or object-based)
- Configuration-driven component rendering
- Generic filter rendering components

**Follows Pattern**:
- **Registry Pattern**: Centralized registration and lookup of filter types
- **Strategy Pattern**: Different filter types have different rendering/behavior strategies
- **Similar to**: Plugin systems, component registries in frameworks

**Touch Points**:
- `src/store/filters/filterRegistry.js` - NEW FILE (main registry)
- `FilterPanel.js` - Use registry for section rendering
- `ActiveFilters.js` - Use registry for chip configuration
- `FilterUrlManager.js` - Use registry for URL parameter mapping

---

## Acceptance Criteria

### Functional Requirements

**AC1**: Create FilterRegistry centralized configuration
- New file: `frontend/react-Admin3/src/store/filters/filterRegistry.js`
- Export `FilterRegistry` class or object
- Centralized configuration for all filter types
- No React dependencies (pure configuration)

**AC2**: Define filter configuration schema
- Each filter type has:
  - `type`: Internal Redux state key (e.g., `'subjects'`)
  - `label`: Human-readable label (e.g., `'Subject'`)
  - `pluralLabel`: Plural form (e.g., `'Subjects'`)
  - `urlParam`: URL parameter name (e.g., `'subject_code'`)
  - `urlParamAliases`: Alternative URL parameter names (e.g., `['subject']`)
  - `color`: Chip color variant (e.g., `'primary'`)
  - `multiple`: Boolean - supports multiple selections
  - `dataType`: `'array'` | `'string'` | `'boolean'` | `'number'`
  - `getDisplayValue`: Function to format value for display
  - `urlFormat`: `'single'` | `'comma-separated'` | `'indexed'`

**AC3**: Register all existing filter types
- Register: subjects, categories, product_types, products, modes_of_delivery
- Register navbar filters: tutorial_format, distance_learning, tutorial
- Each registration uses complete configuration schema
- Configuration reusable across FilterPanel, ActiveFilters, FilterUrlManager

**AC4**: FilterRegistry provides query methods
- `get(type)`: Get configuration for specific filter type
- `getAll()`: Get array of all filter configurations
- `getByUrlParam(paramName)`: Find filter by URL parameter name
- `getMultipleSelectFilters()`: Get filters that support multiple selections
- `getBooleanFilters()`: Get filters with boolean dataType

**AC5**: Update FilterPanel to use FilterRegistry
- Remove hardcoded filter section definitions
- Read filter configs from `FilterRegistry.getAll()`
- Render filter sections generically based on config
- Use `filterConfig.label`, `filterConfig.color`, etc.

**AC6**: Update ActiveFilters to use FilterRegistry
- Replace hardcoded `FILTER_CONFIG` mapping with registry
- Read chip configs from `FilterRegistry.getAll()`
- Render chips generically based on config
- Use `filterConfig.getDisplayValue()` for chip labels

**AC7**: Update FilterUrlManager to use FilterRegistry
- Use registry to determine URL parameter names
- Use `filterConfig.urlParam` and `urlFormat` for conversions
- Generic URL conversion logic based on filter dataType
- Remove hardcoded URL parameter names (use registry instead)

**AC8**: Adding new filter requires only registry entry
- Developer adds single entry to FilterRegistry
- FilterPanel automatically renders new filter section
- ActiveFilters automatically renders chip for new filter
- FilterUrlManager automatically handles URL parameters
- **No component file modifications needed**

### Integration Requirements

**AC9**: FilterRegistry supports future extension
- Registry pattern allows plugin-like filter additions
- Configuration can be extended with additional properties
- Future properties: `validation`, `searchable`, `defaultValue`, etc.
- Backward compatible with existing filters

**AC10**: Filter rendering remains visually consistent
- Generic rendering produces same UI as current hardcoded sections
- No visual changes to FilterPanel or ActiveFilters
- Material-UI components used consistently
- Existing filter behavior unchanged

### Quality Requirements

**AC11**: Comprehensive tests for FilterRegistry
- Test registration and retrieval
- Test query methods (get, getAll, getByUrlParam)
- Test configuration validation
- Achieve ≥90% code coverage for registry

**AC12**: Updated tests for components using registry
- Update FilterPanel tests to verify generic rendering
- Update ActiveFilters tests to verify registry-based chips
- Update FilterUrlManager tests to verify registry-based conversion
- All existing tests pass

**AC13**: Documentation for adding new filters
- Create developer guide: "How to Add a New Filter"
- Example: Adding a `tutorial_location` filter
- Step-by-step instructions using registry
- Before/After comparison showing simplified process

---

## Technical Implementation Guide

### File Structure

**New Files**:
```
frontend/react-Admin3/src/store/filters/
├── filterRegistry.js                       # NEW centralized registry (MAIN CHANGE)
└── __tests__/
    └── filterRegistry.test.js              # NEW registry tests
```

**Modified Files**:
```
frontend/react-Admin3/src/components/Product/
├── FilterPanel.js                          # Use registry for rendering
└── ActiveFilters.js                        # Use registry for chip config

frontend/react-Admin3/src/utils/
└── filterUrlManager.js                     # Use registry for URL conversion

frontend/react-Admin3/src/store/filters/
└── filterRegistry.js                       # NEW file
```

### Implementation Steps

#### Step 1: Create FilterRegistry with Configuration Schema

**File**: `frontend/react-Admin3/src/store/filters/filterRegistry.js`

**Complete Implementation**:

```javascript
/**
 * Filter Registry - Centralized configuration for all filter types
 *
 * Adding a new filter:
 * 1. Add single entry to FilterRegistry.register()
 * 2. Add corresponding Redux state field and actions to filtersSlice
 * 3. Done! FilterPanel, ActiveFilters, and FilterUrlManager automatically handle it.
 *
 * @example
 * // Register a new filter type
 * FilterRegistry.register({
 *   type: 'tutorial_location',
 *   label: 'Tutorial Location',
 *   pluralLabel: 'Tutorial Locations',
 *   urlParam: 'tutorial_location',
 *   color: 'info',
 *   multiple: true,
 *   dataType: 'array',
 *   urlFormat: 'comma-separated',
 *   getDisplayValue: (value) => value,
 * });
 */

/**
 * Filter configuration schema
 * @typedef {Object} FilterConfig
 * @property {string} type - Redux state key (e.g., 'subjects')
 * @property {string} label - Human-readable label (e.g., 'Subject')
 * @property {string} pluralLabel - Plural form (e.g., 'Subjects')
 * @property {string} urlParam - Primary URL parameter name (e.g., 'subject_code')
 * @property {string[]} [urlParamAliases] - Alternative URL parameter names (e.g., ['subject'])
 * @property {string} color - Material-UI chip color variant
 * @property {boolean} multiple - Supports multiple selections
 * @property {'array'|'string'|'boolean'|'number'} dataType - Data type of filter value
 * @property {'single'|'comma-separated'|'indexed'} urlFormat - URL parameter format
 * @property {function} getDisplayValue - Format value for display in UI
 * @property {string} [icon] - Material-UI icon name (optional)
 * @property {number} [order] - Display order in FilterPanel (optional)
 */

export class FilterRegistry {
  static #filters = new Map();

  /**
   * Register a new filter type
   * @param {FilterConfig} config - Filter configuration
   */
  static register(config) {
    // Validate required fields
    if (!config.type) throw new Error('Filter config must have "type" field');
    if (!config.label) throw new Error('Filter config must have "label" field');
    if (!config.urlParam) throw new Error('Filter config must have "urlParam" field');

    // Set defaults
    const completeConfig = {
      pluralLabel: config.label + 's',
      urlParamAliases: [],
      color: 'default',
      multiple: true,
      dataType: 'array',
      urlFormat: 'comma-separated',
      getDisplayValue: (value) => value,
      icon: null,
      order: 100, // Default order
      ...config,
    };

    this.#filters.set(config.type, completeConfig);
  }

  /**
   * Get filter configuration by type
   * @param {string} type - Filter type (Redux state key)
   * @returns {FilterConfig|undefined}
   */
  static get(type) {
    return this.#filters.get(type);
  }

  /**
   * Get all registered filters
   * @returns {FilterConfig[]} Array of filter configurations
   */
  static getAll() {
    return Array.from(this.#filters.values())
      .sort((a, b) => a.order - b.order);
  }

  /**
   * Find filter by URL parameter name
   * @param {string} paramName - URL parameter name
   * @returns {FilterConfig|undefined}
   */
  static getByUrlParam(paramName) {
    for (const config of this.#filters.values()) {
      if (config.urlParam === paramName || config.urlParamAliases?.includes(paramName)) {
        return config;
      }
    }
    return undefined;
  }

  /**
   * Get filters that support multiple selections
   * @returns {FilterConfig[]}
   */
  static getMultipleSelectFilters() {
    return this.getAll().filter(config => config.multiple);
  }

  /**
   * Get boolean filters
   * @returns {FilterConfig[]}
   */
  static getBooleanFilters() {
    return this.getAll().filter(config => config.dataType === 'boolean');
  }

  /**
   * Get array filters
   * @returns {FilterConfig[]}
   */
  static getArrayFilters() {
    return this.getAll().filter(config => config.dataType === 'array');
  }

  /**
   * Check if filter type is registered
   * @param {string} type - Filter type
   * @returns {boolean}
   */
  static has(type) {
    return this.#filters.has(type);
  }

  /**
   * Clear all registrations (mainly for testing)
   */
  static clear() {
    this.#filters.clear();
  }
}

// ===================================================================
// Register all existing filter types
// ===================================================================

// Subjects
FilterRegistry.register({
  type: 'subjects',
  label: 'Subject',
  pluralLabel: 'Subjects',
  urlParam: 'subject_code',
  urlParamAliases: ['subject'],
  color: 'primary',
  multiple: true,
  dataType: 'array',
  urlFormat: 'indexed', // subject_code, subject_1, subject_2, ...
  getDisplayValue: (value) => value,
  order: 1,
});

// Categories
FilterRegistry.register({
  type: 'categories',
  label: 'Category',
  pluralLabel: 'Categories',
  urlParam: 'category',
  color: 'info',
  multiple: true,
  dataType: 'array',
  urlFormat: 'comma-separated',
  getDisplayValue: (value) => value,
  order: 2,
});

// Product Types
FilterRegistry.register({
  type: 'product_types',
  label: 'Product Type',
  pluralLabel: 'Product Types',
  urlParam: 'group',
  color: 'success',
  multiple: true,
  dataType: 'array',
  urlFormat: 'comma-separated',
  getDisplayValue: (value) => value,
  order: 3,
});

// Products
FilterRegistry.register({
  type: 'products',
  label: 'Product',
  pluralLabel: 'Products',
  urlParam: 'product',
  color: 'default',
  multiple: true,
  dataType: 'array',
  urlFormat: 'comma-separated',
  getDisplayValue: (value) => value,
  order: 4,
});

// Modes of Delivery
FilterRegistry.register({
  type: 'modes_of_delivery',
  label: 'Mode of Delivery',
  pluralLabel: 'Modes of Delivery',
  urlParam: 'mode_of_delivery',
  color: 'warning',
  multiple: true,
  dataType: 'array',
  urlFormat: 'comma-separated',
  getDisplayValue: (value) => value,
  order: 5,
});

// Tutorial Format (navbar filter)
FilterRegistry.register({
  type: 'tutorial_format',
  label: 'Tutorial Format',
  pluralLabel: 'Tutorial Formats',
  urlParam: 'tutorial_format',
  color: 'secondary',
  multiple: false,
  dataType: 'string',
  urlFormat: 'single',
  getDisplayValue: (value) => {
    const formatLabels = {
      online: 'Online',
      in_person: 'In-Person',
      hybrid: 'Hybrid',
    };
    return formatLabels[value] || value;
  },
  order: 6,
});

// Distance Learning (navbar filter)
FilterRegistry.register({
  type: 'distance_learning',
  label: 'Distance Learning',
  pluralLabel: 'Distance Learning',
  urlParam: 'distance_learning',
  color: 'secondary',
  multiple: false,
  dataType: 'boolean',
  urlFormat: 'single',
  getDisplayValue: () => 'Active',
  order: 7,
});

// Tutorial (navbar filter)
FilterRegistry.register({
  type: 'tutorial',
  label: 'Tutorial Products',
  pluralLabel: 'Tutorial Products',
  urlParam: 'tutorial',
  color: 'secondary',
  multiple: false,
  dataType: 'boolean',
  urlFormat: 'single',
  getDisplayValue: () => 'Active',
  order: 8,
});

// Search Query (special case - not rendered as filter section)
FilterRegistry.register({
  type: 'searchQuery',
  label: 'Search',
  pluralLabel: 'Search',
  urlParam: 'search',
  urlParamAliases: ['q'],
  color: 'info',
  multiple: false,
  dataType: 'string',
  urlFormat: 'single',
  getDisplayValue: (value) => value,
  order: 0, // First in order but not rendered in FilterPanel
});

```

#### Step 2: Create Registry Tests

**File**: `frontend/react-Admin3/src/store/filters/__tests__/filterRegistry.test.js`

```javascript
import { FilterRegistry } from '../filterRegistry';

describe('FilterRegistry', () => {
  beforeEach(() => {
    // Clear registry before each test
    FilterRegistry.clear();
  });

  describe('register', () => {
    test('registers new filter type', () => {
      FilterRegistry.register({
        type: 'test_filter',
        label: 'Test Filter',
        urlParam: 'test',
      });

      expect(FilterRegistry.has('test_filter')).toBe(true);
    });

    test('throws error if type missing', () => {
      expect(() => {
        FilterRegistry.register({
          label: 'Test',
          urlParam: 'test',
        });
      }).toThrow('Filter config must have "type" field');
    });

    test('throws error if label missing', () => {
      expect(() => {
        FilterRegistry.register({
          type: 'test',
          urlParam: 'test',
        });
      }).toThrow('Filter config must have "label" field');
    });

    test('sets default values for optional fields', () => {
      FilterRegistry.register({
        type: 'test',
        label: 'Test',
        urlParam: 'test',
      });

      const config = FilterRegistry.get('test');
      expect(config.pluralLabel).toBe('Tests');
      expect(config.color).toBe('default');
      expect(config.multiple).toBe(true);
      expect(config.dataType).toBe('array');
    });
  });

  describe('get', () => {
    test('retrieves registered filter by type', () => {
      FilterRegistry.register({
        type: 'subjects',
        label: 'Subject',
        urlParam: 'subject_code',
        color: 'primary',
      });

      const config = FilterRegistry.get('subjects');
      expect(config.label).toBe('Subject');
      expect(config.color).toBe('primary');
    });

    test('returns undefined for unregistered type', () => {
      expect(FilterRegistry.get('nonexistent')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    test('returns all registered filters', () => {
      FilterRegistry.register({
        type: 'filter1',
        label: 'Filter 1',
        urlParam: 'f1',
        order: 2,
      });

      FilterRegistry.register({
        type: 'filter2',
        label: 'Filter 2',
        urlParam: 'f2',
        order: 1,
      });

      const all = FilterRegistry.getAll();
      expect(all).toHaveLength(2);
      expect(all[0].type).toBe('filter2'); // Lower order first
      expect(all[1].type).toBe('filter1');
    });
  });

  describe('getByUrlParam', () => {
    test('finds filter by primary URL parameter', () => {
      FilterRegistry.register({
        type: 'subjects',
        label: 'Subject',
        urlParam: 'subject_code',
      });

      const config = FilterRegistry.getByUrlParam('subject_code');
      expect(config.type).toBe('subjects');
    });

    test('finds filter by URL parameter alias', () => {
      FilterRegistry.register({
        type: 'subjects',
        label: 'Subject',
        urlParam: 'subject_code',
        urlParamAliases: ['subject'],
      });

      const config = FilterRegistry.getByUrlParam('subject');
      expect(config.type).toBe('subjects');
    });

    test('returns undefined for unknown URL parameter', () => {
      expect(FilterRegistry.getByUrlParam('unknown')).toBeUndefined();
    });
  });

  describe('getMultipleSelectFilters', () => {
    test('returns only filters with multiple=true', () => {
      FilterRegistry.register({
        type: 'subjects',
        label: 'Subject',
        urlParam: 'subject',
        multiple: true,
      });

      FilterRegistry.register({
        type: 'tutorial_format',
        label: 'Tutorial Format',
        urlParam: 'tutorial_format',
        multiple: false,
      });

      const multipleFilters = FilterRegistry.getMultipleSelectFilters();
      expect(multipleFilters).toHaveLength(1);
      expect(multipleFilters[0].type).toBe('subjects');
    });
  });

  describe('getBooleanFilters', () => {
    test('returns only filters with dataType=boolean', () => {
      FilterRegistry.register({
        type: 'distance_learning',
        label: 'Distance Learning',
        urlParam: 'distance_learning',
        dataType: 'boolean',
      });

      FilterRegistry.register({
        type: 'subjects',
        label: 'Subject',
        urlParam: 'subject',
        dataType: 'array',
      });

      const booleanFilters = FilterRegistry.getBooleanFilters();
      expect(booleanFilters).toHaveLength(1);
      expect(booleanFilters[0].type).toBe('distance_learning');
    });
  });
});
```

#### Step 3: Update FilterPanel to Use Registry

**File**: `frontend/react-Admin3/src/components/Product/FilterPanel.js`

**BEFORE** (hardcoded sections):
```javascript
return (
  <Box>
    {/* Subjects section */}
    <Accordion>
      <AccordionSummary>
        <Typography>Subjects</Typography>
      </AccordionSummary>
      {/* ... */}
    </Accordion>

    {/* Categories section */}
    <Accordion>
      {/* ... */}
    </Accordion>

    {/* ... 6 more hardcoded sections */}
  </Box>
);
```

**AFTER** (registry-based rendering):
```javascript
import { FilterRegistry } from '../../store/filters/filterRegistry';

const FilterPanel = () => {
  const dispatch = useDispatch();
  const filters = useSelector(selectFilters);

  // Get all filter configs from registry
  const filterConfigs = FilterRegistry.getAll();

  return (
    <Box>
      {filterConfigs.map((config) => {
        // Skip search query (not rendered as filter section)
        if (config.type === 'searchQuery') return null;

        // Get current filter value from Redux
        const filterValue = filters[config.type];

        // Determine if filter is active
        const isActive = config.dataType === 'array'
          ? filterValue && filterValue.length > 0
          : config.dataType === 'boolean'
            ? filterValue === true
            : Boolean(filterValue);

        return (
          <Accordion key={config.type}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">
                {config.pluralLabel}
                {isActive && (
                  <Chip
                    size="small"
                    label={config.dataType === 'array' ? filterValue.length : '✓'}
                    color={config.color}
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {renderFilterContent(config, filterValue, dispatch)}
            </AccordionDetails>
          </Accordion>
        );
      })}

      {/* Clear All button */}
      <Button onClick={() => dispatch(clearAllFilters())}>
        Clear All Filters
      </Button>
    </Box>
  );
};

// Helper function to render filter content based on dataType
const renderFilterContent = (config, filterValue, dispatch) => {
  if (config.dataType === 'boolean') {
    // Single checkbox
    return (
      <FormControlLabel
        control={
          <Checkbox
            checked={filterValue === true}
            onChange={() => dispatch(toggleFilter(config.type))}
          />
        }
        label={config.label}
      />
    );
  }

  if (config.dataType === 'string' && !config.multiple) {
    // Radio buttons (e.g., tutorial_format)
    const options = config.options || [];
    return (
      <RadioGroup value={filterValue || ''}>
        {options.map(option => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            control={<Radio />}
            label={option.label}
          />
        ))}
      </RadioGroup>
    );
  }

  // Default: Checkboxes for array filters
  // (Requires filterOptions data - implementation detail)
  return <Typography>Filter options here</Typography>;
};
```

**Note**: This is a simplified example. Actual implementation may need filter options data (e.g., list of subjects, categories) which could also come from registry or separate data source.

(Continued in next response due to length...)

---

**Story Status**: IN PROGRESS (Implementation guide continues)
**Assigned To**: [Pending]
**Started**: [Pending]
**Completed**: [Pending]
