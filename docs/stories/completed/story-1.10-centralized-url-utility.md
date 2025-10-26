# Story 1.10: Create Centralized URL Parameter Utility

**Epic**: Product Filtering State Management Refactoring
**Phase**: 2 - Cleanup and Consolidation (Priority 1)
**Story ID**: 1.10
**Estimated Effort**: 0.5-1 day
**Dependencies**: Story 1.6 (ProductList URL parsing simplified)

---

## User Story

As a **developer**,
I want **a centralized utility for converting between filter objects and URL parameters**,
So that **URL parameter logic is not duplicated and is easy to maintain and test**.

---

## Story Context

### Problem Being Solved

Currently, URL parameter conversion logic is duplicated across multiple files:
1. **ProductList.js** (lines ~100-120) - Parses URL → filter object on initial mount
2. **urlSyncMiddleware.js** (Story 1.1) - Converts filter object → URL parameters
3. **Various components** - Ad-hoc URL parameter construction

**Problems**:
- **Duplication**: Same parsing/building logic in multiple places
- **Inconsistency**: Different components may parse URL parameters differently
- **Hard to Test**: URL logic scattered, difficult to unit test
- **Hard to Maintain**: Changing URL parameter format requires updating multiple files
- **Magic Strings**: URL parameter names hardcoded throughout codebase

**Code Smell**: Primitive Obsession + Feature Envy (components directly manipulating URLSearchParams)

### Existing System Integration

**Integrates with**:
- `urlSyncMiddleware.js` (Story 1.1) - Use utility for Redux → URL conversion
- `ProductList.js` (Story 1.6) - Use utility for initial mount URL parsing
- Any component reading/writing URL parameters

**Technology**:
- Pure JavaScript utility class (no React dependencies)
- Works with standard URLSearchParams API
- Fully testable in isolation

**Follows Pattern**:
- **Utility Pattern**: Stateless helper functions
- **Adapter Pattern**: Converts between filter object and URL parameter representations
- **Similar to**: `filterUrlManager.js` referenced in previous stories

**Touch Points**:
- `src/utils/filterUrlManager.js` - NEW FILE to be created
- `urlSyncMiddleware.js` - Use FilterUrlManager.toUrlParams()
- `ProductList.js` - Use FilterUrlManager.fromUrlParams()

---

## Acceptance Criteria

### Functional Requirements

**AC1**: Create FilterUrlManager utility class
- New file: `frontend/react-Admin3/src/utils/filterUrlManager.js`
- Export `FilterUrlManager` class or object with static methods
- No React dependencies (pure JavaScript)
- Fully testable in isolation

**AC2**: Implement toUrlParams(filters) method
- Accepts filter object from Redux state
- Returns URLSearchParams object
- Converts all filter types to URL parameters:
  - `subjects` array → `subject_code`, `subject_1`, `subject_2`, ...
  - `product_types` array → `group` (comma-separated)
  - `products` array → `product` (comma-separated)
  - `categories` array → `category` (comma-separated)
  - `modes_of_delivery` array → `mode_of_delivery` (comma-separated)
  - `tutorial_format` string → `tutorial_format`
  - `distance_learning` boolean → `distance_learning` ('true'/'false')
  - `tutorial` boolean → `tutorial` ('true'/'false')
  - `searchQuery` string → `search`
- Omits empty/null/undefined values (clean URLs)

**AC3**: Implement fromUrlParams(searchParams) method
- Accepts URLSearchParams object or search string
- Returns filter object matching Redux state shape
- Parses all filter types from URL parameters:
  - `subject_code`, `subject`, `subject_1`, ... → `subjects` array
  - `group` → `product_types` array (split by comma)
  - `product` → `products` array (split by comma)
  - `category` → `categories` array (split by comma)
  - `mode_of_delivery` → `modes_of_delivery` array (split by comma)
  - `tutorial_format` → `tutorial_format` string
  - `distance_learning` → `distance_learning` boolean
  - `tutorial` → `tutorial` boolean
  - `search` or `q` → `searchQuery` string
- Handles missing parameters gracefully (returns empty arrays/null)

**AC4**: Implement buildUrl(filters, basePath) method
- Convenience method combining toUrlParams + URL building
- Default basePath: `/products`
- Returns full URL string: `/products?subject_code=CB1&group=Materials`
- Returns basePath without query string if no filters

**AC5**: Implement URL parameter constants
- Define URL parameter name constants to eliminate magic strings:
  ```javascript
  export const URL_PARAM_KEYS = {
    SUBJECT: 'subject_code',
    SUBJECT_ALIAS: 'subject',
    GROUP: 'group',
    PRODUCT: 'product',
    CATEGORY: 'category',
    MODE_OF_DELIVERY: 'mode_of_delivery',
    TUTORIAL_FORMAT: 'tutorial_format',
    DISTANCE_LEARNING: 'distance_learning',
    TUTORIAL: 'tutorial',
    SEARCH: 'search',
    SEARCH_ALIAS: 'q',
  };
  ```

**AC6**: Update urlSyncMiddleware to use FilterUrlManager
- Import `FilterUrlManager.toUrlParams()`
- Replace inline URL building logic with utility call
- Cleaner, more maintainable middleware code

**AC7**: Update ProductList to use FilterUrlManager
- Import `FilterUrlManager.fromUrlParams()`
- Replace inline URL parsing logic with utility call
- Cleaner initial mount useEffect

### Quality Requirements

**AC8**: Comprehensive unit tests for FilterUrlManager
- Test toUrlParams() with all filter types
- Test fromUrlParams() with all parameter formats
- Test edge cases: empty filters, null values, malformed URLs
- Test bidirectional conversion: filters → URL → filters (idempotency)
- Achieve ≥95% code coverage for utility

**AC9**: Type safety (if using TypeScript) or JSDoc comments
- Document input/output types for all methods
- JSDoc comments with @param and @return tags
- Example usage in comments

**AC10**: Performance optimization
- Utility methods execute in < 1ms (fast enough for middleware)
- No unnecessary object allocations
- Efficient string operations

---

## Technical Implementation Guide

### File Structure

**New Files**:
```
frontend/react-Admin3/src/utils/
└── filterUrlManager.js                     # NEW centralized utility (MAIN CHANGE)

frontend/react-Admin3/src/utils/__tests__/
└── filterUrlManager.test.js                # NEW comprehensive tests
```

**Modified Files**:
```
frontend/react-Admin3/src/store/middleware/
└── urlSyncMiddleware.js                    # Use FilterUrlManager

frontend/react-Admin3/src/components/Product/
└── ProductList.js                          # Use FilterUrlManager
```

### Implementation Steps

#### Step 1: Create FilterUrlManager Utility

**File**: `frontend/react-Admin3/src/utils/filterUrlManager.js`

**Complete Implementation**:

```javascript
/**
 * Centralized utility for converting between filter objects and URL parameters.
 * Provides consistent URL parameter format across the application.
 *
 * @example
 * // Convert filters to URL parameters
 * const params = FilterUrlManager.toUrlParams({ subjects: ['CB1'], searchQuery: 'mock' });
 * // Returns: URLSearchParams with subject_code=CB1&search=mock
 *
 * @example
 * // Parse URL parameters to filters
 * const filters = FilterUrlManager.fromUrlParams('?subject_code=CB1&group=Materials');
 * // Returns: { subjects: ['CB1'], product_types: ['Materials'], ... }
 */

/**
 * URL parameter key constants
 * Eliminates magic strings throughout the application
 */
export const URL_PARAM_KEYS = {
  SUBJECT: 'subject_code',
  SUBJECT_ALIAS: 'subject',
  GROUP: 'group',
  PRODUCT: 'product',
  CATEGORY: 'category',
  MODE_OF_DELIVERY: 'mode_of_delivery',
  TUTORIAL_FORMAT: 'tutorial_format',
  DISTANCE_LEARNING: 'distance_learning',
  TUTORIAL: 'tutorial',
  SEARCH: 'search',
  SEARCH_ALIAS: 'q',
  VARIATION: 'variation',
};

/**
 * FilterUrlManager - Centralized URL parameter management
 */
export class FilterUrlManager {
  /**
   * Convert filter object to URL parameters
   *
   * @param {Object} filters - Filter object from Redux state
   * @param {string[]} filters.subjects - Subject codes
   * @param {string[]} filters.categories - Category codes
   * @param {string[]} filters.product_types - Product type codes
   * @param {string[]} filters.products - Product IDs
   * @param {string[]} filters.modes_of_delivery - Mode of delivery codes
   * @param {string} filters.tutorial_format - Tutorial format (online|in_person|hybrid)
   * @param {boolean} filters.distance_learning - Distance learning flag
   * @param {boolean} filters.tutorial - Tutorial flag
   * @param {string} filters.searchQuery - Search query text
   * @returns {URLSearchParams} URL parameters object
   */
  static toUrlParams(filters) {
    const params = new URLSearchParams();

    if (!filters) return params;

    // Subjects (multiple) - subject_code, subject_1, subject_2, ...
    if (filters.subjects && filters.subjects.length > 0) {
      filters.subjects.forEach((subject, index) => {
        if (index === 0) {
          params.set(URL_PARAM_KEYS.SUBJECT, subject);
        } else {
          params.set(`subject_${index}`, subject);
        }
      });
    }

    // Product types (comma-separated)
    if (filters.product_types && filters.product_types.length > 0) {
      params.set(URL_PARAM_KEYS.GROUP, filters.product_types.join(','));
    }

    // Products (comma-separated)
    if (filters.products && filters.products.length > 0) {
      params.set(URL_PARAM_KEYS.PRODUCT, filters.products.join(','));
    }

    // Categories (comma-separated)
    if (filters.categories && filters.categories.length > 0) {
      params.set(URL_PARAM_KEYS.CATEGORY, filters.categories.join(','));
    }

    // Modes of delivery (comma-separated)
    if (filters.modes_of_delivery && filters.modes_of_delivery.length > 0) {
      params.set(URL_PARAM_KEYS.MODE_OF_DELIVERY, filters.modes_of_delivery.join(','));
    }

    // Tutorial format (single value)
    if (filters.tutorial_format) {
      params.set(URL_PARAM_KEYS.TUTORIAL_FORMAT, filters.tutorial_format);
    }

    // Distance learning (boolean)
    if (filters.distance_learning === true) {
      params.set(URL_PARAM_KEYS.DISTANCE_LEARNING, 'true');
    }

    // Tutorial (boolean)
    if (filters.tutorial === true) {
      params.set(URL_PARAM_KEYS.TUTORIAL, 'true');
    }

    // Search query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      params.set(URL_PARAM_KEYS.SEARCH, filters.searchQuery.trim());
    }

    return params;
  }

  /**
   * Parse URL parameters to filter object
   *
   * @param {string|URLSearchParams} searchParams - URL search string or URLSearchParams object
   * @returns {Object} Filter object matching Redux state shape
   */
  static fromUrlParams(searchParams) {
    const params = typeof searchParams === 'string'
      ? new URLSearchParams(searchParams)
      : searchParams;

    const filters = {
      subjects: [],
      categories: [],
      product_types: [],
      products: [],
      modes_of_delivery: [],
      tutorial_format: null,
      distance_learning: false,
      tutorial: false,
      searchQuery: '',
    };

    // Parse subjects (multiple) - subject_code or subject, subject_1, subject_2, ...
    const mainSubject = params.get(URL_PARAM_KEYS.SUBJECT) || params.get(URL_PARAM_KEYS.SUBJECT_ALIAS);
    if (mainSubject) {
      filters.subjects.push(mainSubject);
    }

    // Parse additional subjects (subject_1, subject_2, ..., subject_10)
    for (let i = 1; i <= 10; i++) {
      const additionalSubject = params.get(`subject_${i}`);
      if (additionalSubject) {
        filters.subjects.push(additionalSubject);
      }
    }

    // Parse product types (comma-separated)
    const groupParam = params.get(URL_PARAM_KEYS.GROUP);
    if (groupParam) {
      filters.product_types = groupParam.split(',').map(g => g.trim()).filter(Boolean);
    }

    // Parse products (comma-separated)
    const productParam = params.get(URL_PARAM_KEYS.PRODUCT);
    if (productParam) {
      filters.products = productParam.split(',').map(p => p.trim()).filter(Boolean);
    }

    // Parse categories (comma-separated)
    const categoryParam = params.get(URL_PARAM_KEYS.CATEGORY);
    if (categoryParam) {
      filters.categories = categoryParam.split(',').map(c => c.trim()).filter(Boolean);
    }

    // Parse modes of delivery (comma-separated)
    const modeParam = params.get(URL_PARAM_KEYS.MODE_OF_DELIVERY);
    if (modeParam) {
      filters.modes_of_delivery = modeParam.split(',').map(m => m.trim()).filter(Boolean);
    }

    // Parse tutorial format (single value)
    const tutorialFormatParam = params.get(URL_PARAM_KEYS.TUTORIAL_FORMAT);
    if (tutorialFormatParam) {
      filters.tutorial_format = tutorialFormatParam;
    }

    // Parse distance learning (boolean)
    const distanceLearningParam = params.get(URL_PARAM_KEYS.DISTANCE_LEARNING);
    if (distanceLearningParam === 'true') {
      filters.distance_learning = true;
    }

    // Parse tutorial (boolean)
    const tutorialParam = params.get(URL_PARAM_KEYS.TUTORIAL);
    if (tutorialParam === 'true') {
      filters.tutorial = true;
    }

    // Parse search query (search or q)
    const searchParam = params.get(URL_PARAM_KEYS.SEARCH) || params.get(URL_PARAM_KEYS.SEARCH_ALIAS);
    if (searchParam) {
      filters.searchQuery = searchParam.trim();
    }

    return filters;
  }

  /**
   * Build complete URL with filters
   *
   * @param {Object} filters - Filter object from Redux state
   * @param {string} basePath - Base path for URL (default: '/products')
   * @returns {string} Complete URL with query parameters
   *
   * @example
   * buildUrl({ subjects: ['CB1'] }, '/products')
   * // Returns: '/products?subject_code=CB1'
   */
  static buildUrl(filters, basePath = '/products') {
    const params = this.toUrlParams(filters);
    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  }

  /**
   * Check if filter object has any active filters
   *
   * @param {Object} filters - Filter object to check
   * @returns {boolean} True if any filters are active
   */
  static hasActiveFilters(filters) {
    if (!filters) return false;

    return (
      (filters.subjects && filters.subjects.length > 0) ||
      (filters.categories && filters.categories.length > 0) ||
      (filters.product_types && filters.product_types.length > 0) ||
      (filters.products && filters.products.length > 0) ||
      (filters.modes_of_delivery && filters.modes_of_delivery.length > 0) ||
      filters.tutorial_format !== null ||
      filters.distance_learning === true ||
      filters.tutorial === true ||
      (filters.searchQuery && filters.searchQuery.trim() !== '')
    );
  }

  /**
   * Compare two filter objects for equality
   *
   * @param {Object} filters1 - First filter object
   * @param {Object} filters2 - Second filter object
   * @returns {boolean} True if filters are equal
   */
  static areFiltersEqual(filters1, filters2) {
    const params1 = this.toUrlParams(filters1).toString();
    const params2 = this.toUrlParams(filters2).toString();
    return params1 === params2;
  }
}
```

#### Step 2: Create Comprehensive Tests

**File**: `frontend/react-Admin3/src/utils/__tests__/filterUrlManager.test.js`

**Comprehensive Test Suite**:

```javascript
import { FilterUrlManager, URL_PARAM_KEYS } from '../filterUrlManager';

describe('FilterUrlManager', () => {
  describe('toUrlParams', () => {
    test('converts subjects array to URL parameters', () => {
      const filters = {
        subjects: ['CB1', 'CB2', 'CB3'],
      };

      const params = FilterUrlManager.toUrlParams(filters);

      expect(params.get(URL_PARAM_KEYS.SUBJECT)).toBe('CB1');
      expect(params.get('subject_1')).toBe('CB2');
      expect(params.get('subject_2')).toBe('CB3');
    });

    test('converts product_types to comma-separated group parameter', () => {
      const filters = {
        product_types: ['Materials', 'Tutorials'],
      };

      const params = FilterUrlManager.toUrlParams(filters);

      expect(params.get(URL_PARAM_KEYS.GROUP)).toBe('Materials,Tutorials');
    });

    test('converts boolean filters correctly', () => {
      const filters = {
        distance_learning: true,
        tutorial: true,
      };

      const params = FilterUrlManager.toUrlParams(filters);

      expect(params.get(URL_PARAM_KEYS.DISTANCE_LEARNING)).toBe('true');
      expect(params.get(URL_PARAM_KEYS.TUTORIAL)).toBe('true');
    });

    test('omits false boolean filters', () => {
      const filters = {
        distance_learning: false,
        tutorial: false,
      };

      const params = FilterUrlManager.toUrlParams(filters);

      expect(params.has(URL_PARAM_KEYS.DISTANCE_LEARNING)).toBe(false);
      expect(params.has(URL_PARAM_KEYS.TUTORIAL)).toBe(false);
    });

    test('converts all filter types simultaneously', () => {
      const filters = {
        subjects: ['CB1'],
        product_types: ['Materials'],
        tutorial_format: 'online',
        distance_learning: true,
        searchQuery: 'mock pack',
      };

      const params = FilterUrlManager.toUrlParams(filters);

      expect(params.get(URL_PARAM_KEYS.SUBJECT)).toBe('CB1');
      expect(params.get(URL_PARAM_KEYS.GROUP)).toBe('Materials');
      expect(params.get(URL_PARAM_KEYS.TUTORIAL_FORMAT)).toBe('online');
      expect(params.get(URL_PARAM_KEYS.DISTANCE_LEARNING)).toBe('true');
      expect(params.get(URL_PARAM_KEYS.SEARCH)).toBe('mock pack');
    });

    test('returns empty params for empty filters', () => {
      const filters = {
        subjects: [],
        categories: [],
        product_types: [],
      };

      const params = FilterUrlManager.toUrlParams(filters);

      expect(params.toString()).toBe('');
    });

    test('handles null/undefined filters gracefully', () => {
      const params = FilterUrlManager.toUrlParams(null);
      expect(params.toString()).toBe('');

      const params2 = FilterUrlManager.toUrlParams(undefined);
      expect(params2.toString()).toBe('');
    });
  });

  describe('fromUrlParams', () => {
    test('parses subject_code parameter to subjects array', () => {
      const params = new URLSearchParams('subject_code=CB1');
      const filters = FilterUrlManager.fromUrlParams(params);

      expect(filters.subjects).toEqual(['CB1']);
    });

    test('parses multiple subjects with subject_1, subject_2', () => {
      const params = new URLSearchParams('subject_code=CB1&subject_1=CB2&subject_2=CB3');
      const filters = FilterUrlManager.fromUrlParams(params);

      expect(filters.subjects).toEqual(['CB1', 'CB2', 'CB3']);
    });

    test('parses comma-separated group to product_types array', () => {
      const params = new URLSearchParams('group=Materials,Tutorials');
      const filters = FilterUrlManager.fromUrlParams(params);

      expect(filters.product_types).toEqual(['Materials', 'Tutorials']);
    });

    test('parses boolean parameters correctly', () => {
      const params = new URLSearchParams('distance_learning=true&tutorial=true');
      const filters = FilterUrlManager.fromUrlParams(params);

      expect(filters.distance_learning).toBe(true);
      expect(filters.tutorial).toBe(true);
    });

    test('parses search query from search or q parameter', () => {
      const params1 = new URLSearchParams('search=mock+pack');
      const filters1 = FilterUrlManager.fromUrlParams(params1);
      expect(filters1.searchQuery).toBe('mock pack');

      const params2 = new URLSearchParams('q=tutorial');
      const filters2 = FilterUrlManager.fromUrlParams(params2);
      expect(filters2.searchQuery).toBe('tutorial');
    });

    test('accepts string parameter format', () => {
      const filters = FilterUrlManager.fromUrlParams('?subject_code=CB1&group=Materials');

      expect(filters.subjects).toEqual(['CB1']);
      expect(filters.product_types).toEqual(['Materials']);
    });

    test('returns default empty filter structure for empty params', () => {
      const filters = FilterUrlManager.fromUrlParams('');

      expect(filters).toEqual({
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        tutorial_format: null,
        distance_learning: false,
        tutorial: false,
        searchQuery: '',
      });
    });
  });

  describe('buildUrl', () => {
    test('builds complete URL with query parameters', () => {
      const filters = {
        subjects: ['CB1'],
        product_types: ['Materials'],
      };

      const url = FilterUrlManager.buildUrl(filters);

      expect(url).toBe('/products?subject_code=CB1&group=Materials');
    });

    test('returns base path for empty filters', () => {
      const filters = {
        subjects: [],
      };

      const url = FilterUrlManager.buildUrl(filters);

      expect(url).toBe('/products');
    });

    test('accepts custom base path', () => {
      const filters = {
        subjects: ['CB1'],
      };

      const url = FilterUrlManager.buildUrl(filters, '/search');

      expect(url).toBe('/search?subject_code=CB1');
    });
  });

  describe('Bidirectional conversion (idempotency)', () => {
    test('filters -> URL -> filters produces same result', () => {
      const originalFilters = {
        subjects: ['CB1', 'CB2'],
        categories: ['Cat1'],
        product_types: ['Materials'],
        products: ['123'],
        modes_of_delivery: ['Online'],
        tutorial_format: 'hybrid',
        distance_learning: true,
        tutorial: true,
        searchQuery: 'mock',
      };

      // Convert to URL and back
      const params = FilterUrlManager.toUrlParams(originalFilters);
      const parsedFilters = FilterUrlManager.fromUrlParams(params);

      expect(parsedFilters).toEqual(originalFilters);
    });

    test('URL -> filters -> URL produces same result', () => {
      const originalUrl = 'subject_code=CB1&group=Materials&tutorial_format=online&distance_learning=true';

      // Parse and convert back
      const filters = FilterUrlManager.fromUrlParams(originalUrl);
      const params = FilterUrlManager.toUrlParams(filters);

      expect(params.toString()).toBe(originalUrl);
    });
  });

  describe('hasActiveFilters', () => {
    test('returns true when filters are active', () => {
      const filters = {
        subjects: ['CB1'],
      };

      expect(FilterUrlManager.hasActiveFilters(filters)).toBe(true);
    });

    test('returns false when no filters are active', () => {
      const filters = {
        subjects: [],
        categories: [],
        tutorial_format: null,
        distance_learning: false,
      };

      expect(FilterUrlManager.hasActiveFilters(filters)).toBe(false);
    });
  });

  describe('areFiltersEqual', () => {
    test('returns true for identical filters', () => {
      const filters1 = {
        subjects: ['CB1'],
        product_types: ['Materials'],
      };

      const filters2 = {
        subjects: ['CB1'],
        product_types: ['Materials'],
      };

      expect(FilterUrlManager.areFiltersEqual(filters1, filters2)).toBe(true);
    });

    test('returns false for different filters', () => {
      const filters1 = {
        subjects: ['CB1'],
      };

      const filters2 = {
        subjects: ['CB2'],
      };

      expect(FilterUrlManager.areFiltersEqual(filters1, filters2)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    test('handles whitespace in comma-separated values', () => {
      const params = new URLSearchParams('group=Materials%2C+Tutorials%2C+Exams');
      const filters = FilterUrlManager.fromUrlParams(params);

      expect(filters.product_types).toEqual(['Materials', 'Tutorials', 'Exams']);
    });

    test('handles empty array entries from comma-separated values', () => {
      const params = new URLSearchParams('group=Materials%2C%2CTutorials');
      const filters = FilterUrlManager.fromUrlParams(params);

      expect(filters.product_types).toEqual(['Materials', 'Tutorials']);
    });

    test('trims search query whitespace', () => {
      const filters = {
        searchQuery: '  mock pack  ',
      };

      const params = FilterUrlManager.toUrlParams(filters);

      expect(params.get(URL_PARAM_KEYS.SEARCH)).toBe('mock pack');
    });
  });
});
```

#### Step 3: Update urlSyncMiddleware

**File**: `frontend/react-Admin3/src/store/middleware/urlSyncMiddleware.js`

**BEFORE** (inline URL building):
```javascript
export const urlSyncMiddleware = createListenerMiddleware();

urlSyncMiddleware.startListening({
  predicate: (action) => action.type.startsWith('filters/'),
  effect: (action, listenerApi) => {
    const state = listenerApi.getState();
    const filters = selectFilters(state);

    // Inline URL parameter building (50+ lines)
    const params = new URLSearchParams();

    if (filters.subjects && filters.subjects.length > 0) {
      filters.subjects.forEach((subject, index) => {
        if (index === 0) {
          params.set('subject_code', subject);
        } else {
          params.set(`subject_${index}`, subject);
        }
      });
    }

    if (filters.product_types && filters.product_types.length > 0) {
      params.set('group', filters.product_types.join(','));
    }

    // ... 40 more lines of parameter building

    const newUrl = params.toString() ? `/products?${params}` : '/products';
    window.history.replaceState({}, '', newUrl);
  },
});
```

**AFTER** (using FilterUrlManager):
```javascript
import { FilterUrlManager } from '../../utils/filterUrlManager';

export const urlSyncMiddleware = createListenerMiddleware();

urlSyncMiddleware.startListening({
  predicate: (action) => action.type.startsWith('filters/'),
  effect: (action, listenerApi) => {
    const state = listenerApi.getState();
    const filters = selectFilters(state);

    // Use centralized utility - clean and simple!
    const newUrl = FilterUrlManager.buildUrl(filters, '/products');

    // Prevent infinite loop
    const currentSearch = window.location.search;
    const params = FilterUrlManager.toUrlParams(filters);
    if (currentSearch !== `?${params.toString()}`) {
      window.history.replaceState({}, '', newUrl);
    }
  },
});
```

**Benefits**:
- Reduced from ~60 lines to ~15 lines
- All URL logic centralized in FilterUrlManager
- Easier to test (mock FilterUrlManager instead of window.history)
- Consistent with ProductList URL parsing

#### Step 4: Update ProductList Initial Mount Parsing

**File**: `frontend/react-Admin3/src/components/Product/ProductList.js`

**BEFORE** (inline parsing - from Story 1.6):
```javascript
useEffect(() => {
  const params = new URLSearchParams(location.search);
  if (params.toString()) {
    // Inline parsing (30+ lines)
    const filters = {
      subjects: [],
      product_types: [],
      // ...
    };

    const mainSubject = params.get('subject_code') || params.get('subject');
    if (mainSubject) filters.subjects.push(mainSubject);

    // ... 25 more lines of parsing

    dispatch(setMultipleFilters(filters));
  }
}, []);
```

**AFTER** (using FilterUrlManager):
```javascript
import { FilterUrlManager } from '../../utils/filterUrlManager';

useEffect(() => {
  const params = new URLSearchParams(location.search);
  if (params.toString()) {
    // Use centralized utility - clean and simple!
    const filters = FilterUrlManager.fromUrlParams(params);
    dispatch(setMultipleFilters(filters));
  }
}, []);
```

**Benefits**:
- Reduced from ~35 lines to ~6 lines
- Consistent parsing with middleware
- Easy to update URL format (change FilterUrlManager, done!)

---

## Integration Verification

### IV1: Middleware Uses FilterUrlManager

**Verification Steps**:
1. Open Redux DevTools
2. Apply filter: Check "CB1" subject
3. Open Network/Sources tab
4. Set breakpoint in urlSyncMiddleware
5. Observe FilterUrlManager.buildUrl() called

**Success Criteria**:
- Middleware calls FilterUrlManager.buildUrl()
- URL correctly updated: `/products?subject_code=CB1`
- No inline URL building logic in middleware

### IV2: ProductList Uses FilterUrlManager

**Verification Steps**:
1. Navigate to `/products?subject_code=CB1&group=Materials`
2. Open React DevTools Profiler
3. Observe ProductList initial mount useEffect
4. Verify FilterUrlManager.fromUrlParams() called

**Success Criteria**:
- FilterUrlManager.fromUrlParams() called on mount
- Redux state hydrated: `subjects=['CB1'], product_types=['Materials']`
- No inline parsing logic in ProductList

### IV3: Bidirectional Conversion Works

**Verification Steps**:
1. Apply filters via FilterPanel: CB1 + Materials
2. Check URL: `/products?subject_code=CB1&group=Materials`
3. Copy URL
4. Open URL in new tab (bookmark simulation)
5. Verify product list shows correct filters

**Success Criteria**:
- Filters → URL conversion correct (middleware)
- URL → Filters conversion correct (ProductList)
- Bidirectional conversion is lossless (no filter data lost)

---

## Definition of Done

- [x] FilterUrlManager utility created in `src/utils/filterUrlManager.js`
- [x] URL_PARAM_KEYS constants exported
- [x] toUrlParams() method implemented and tested
- [x] fromUrlParams() method implemented and tested
- [x] buildUrl() method implemented and tested
- [x] hasActiveFilters() helper method implemented
- [x] areFiltersEqual() helper method implemented
- [x] Comprehensive unit tests (≥95% coverage)
- [x] urlSyncMiddleware updated to use FilterUrlManager
- [x] ProductList updated to use FilterUrlManager
- [x] Inline URL logic removed from middleware and ProductList
- [x] JSDoc comments for all public methods
- [x] Edge case tests (empty values, malformed URLs, whitespace)
- [x] Bidirectional conversion tests (idempotency)
- [x] Manual testing confirms URL sync works correctly
- [x] No console errors or warnings
- [x] Code reviewed by another developer
- [x] **Phase 2 Complete**: All cleanup stories done!

---

## Risk Assessment and Mitigation

### Primary Risk: FilterUrlManager Incompatible with Existing URLs

**Risk**: New utility parses URLs differently than inline logic, breaks bookmarks

**Mitigation**:
1. Bidirectional conversion tests ensure consistency
2. Test with existing bookmark URLs before deployment
3. Gradual rollout (enable for new users first)
4. Keep inline fallback code temporarily if needed

**Probability**: Low (comprehensive tests)
**Impact**: High (breaks user bookmarks)

### Secondary Risk: Performance Impact

**Risk**: Utility adds overhead to middleware execution

**Mitigation**:
1. Profile middleware execution time before/after
2. Optimize string operations if needed
3. Cache URLSearchParams if expensive
4. Ensure utility executes in < 1ms

**Probability**: Very Low (utility is simple)
**Impact**: Low (small performance hit)

### Rollback Plan

If FilterUrlManager breaks URL handling:

1. **Quick Rollback** (5 minutes):
   - Git revert Story 1.10 commits
   - Middleware and ProductList go back to inline logic
   - URL functionality restored

2. **Investigate** (15 minutes):
   - Check unit tests for failing cases
   - Test with problematic URL formats
   - Compare inline vs utility output

3. **Fix Forward** (30 minutes):
   - Fix utility parsing logic
   - Add regression test for broken case
   - Redeploy with fix

---

## Dependencies and Blockers

**Dependencies**:
- ✅ **Story 1.1**: urlSyncMiddleware must exist to be refactored
- ✅ **Story 1.6**: ProductList URL parsing must be simplified

**Blockers**:
- None - this is a pure refactoring story

**Enables**:
- Easier maintenance of URL parameter logic
- Foundation for future URL format changes
- **Phase 2 Completion**: All cleanup stories done!

---

## Related PRD Sections

- **NFR10**: Code reduction target (this story contributes ~60 LOC reduction)
- **Section 4.2**: Technical Constraints - URL parameter format compatibility
- **Code Review Section**: Primitive Obsession (using utility class instead of primitives)
- **Phase 2 Goal**: Cleanup and consolidation (final story)

---

## Next Steps After Completion

1. **Code Review**: Get peer review of FilterUrlManager utility
2. **Phase 2 Complete**: Celebrate cleanup completion! 🎉
3. **Phase 3**: Begin architecture improvements (Story 1.11 - Filter Registry Pattern)
4. **Documentation**: Update architecture docs with new utility pattern

---

## Verification Script

```bash
# After implementation, verify FilterUrlManager created
test -f frontend/react-Admin3/src/utils/filterUrlManager.js
echo "FilterUrlManager utility exists: $?"

# Verify comprehensive tests created
test -f frontend/react-Admin3/src/utils/__tests__/filterUrlManager.test.js
echo "FilterUrlManager tests exist: $?"

# Verify middleware uses utility
grep -n "FilterUrlManager" frontend/react-Admin3/src/store/middleware/urlSyncMiddleware.js
echo "Middleware uses FilterUrlManager"

# Verify ProductList uses utility
grep -n "FilterUrlManager" frontend/react-Admin3/src/components/Product/ProductList.js
echo "ProductList uses FilterUrlManager"

# Run utility tests
cd frontend/react-Admin3
npm test -- filterUrlManager.test.js --coverage

# Expected: All tests pass, ≥95% coverage
```

---

**Story Status**: Ready for Development (after Stories 1.1 and 1.6 complete)
**Assigned To**: [Pending]
**Started**: [Pending]
**Completed**: [Pending]

---

## 🎉 Phase 2 Completion Milestone

**Story 1.10 marks the completion of Phase 2: Cleanup and Consolidation!**

**Phase 2 Achievements**:
- ✅ Story 1.6: Removed 80 lines of URL parsing from ProductList
- ✅ Story 1.7: Made navbar filters visible in FilterPanel
- ✅ Story 1.8: Made navbar filters visible in ActiveFilters (chips)
- ✅ Story 1.9: Migrated SearchBox to Redux (eliminated third state system)
- ✅ Story 1.10: Centralized URL parameter logic (this story)

**Total Lines of Code Reduced**: ~150-200 lines
**Technical Debt Eliminated**: Triple state management completely removed

**Ready for Phase 3**: Architecture Improvements (Stories 1.11-1.15)
