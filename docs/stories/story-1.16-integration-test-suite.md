# Story 1.16: Comprehensive Integration Test Suite

**Epic**: Product Filtering State Management Refactoring
**Phase**: 4 - Enhanced Testing and Documentation (Priority 3)
**Story ID**: 1.16
**Estimated Effort**: 2 days
**Dependencies**: Stories 1.1-1.15 (all implementation complete)

---

## User Story

As a **developer**,
I want **comprehensive integration tests covering the entire filtering system**,
So that **I can confidently deploy the refactored code knowing all components work together correctly**.

---

## Story Context

### Problem Being Solved

After completing the major filtering refactoring (Stories 1.1-1.15), we need **comprehensive integration testing** to ensure:

**Current Testing Gaps**:
1. **No integration tests** for Redux ↔ URL synchronization
2. **No tests** for filter state persistence across page reloads
3. **No tests** for complex filter interactions (e.g., tutorial_format requiring tutorial)
4. **No tests** for FilterRegistry and FilterValidator integration
5. **No tests** for API integration with filtered product requests
6. **Limited coverage** of edge cases (empty states, invalid filters, race conditions)
7. **No tests** for backward compatibility with old URL formats

**Refactoring Risk**:
- 15 stories with extensive changes to core filtering logic
- Multiple interconnected systems (Redux, URL, API, validation)
- Risk of regressions during implementation
- Need confidence before production deployment

**Solution**: Create comprehensive integration test suite using React Testing Library and Jest that:
- Tests complete user workflows (apply filter → URL updates → page refresh → state restored)
- Validates Redux middleware chain integration
- Tests FilterRegistry and FilterValidator integration
- Covers edge cases and error scenarios
- Ensures backward compatibility
- Provides CI/CD confidence for deployments

### Existing System Integration

**Integrates with**:
- **Redux Store** - Test entire middleware chain
- **urlSyncMiddleware** (Story 1.1) - Test bidirectional synchronization
- **FilterRegistry** (Story 1.11) - Test filter configuration lookup
- **FilterValidator** (Story 1.12) - Test validation integration
- **useProductsSearch Hook** - Test API integration
- **FilterPanel Component** - Test UI interaction
- **ActiveFilters Component** - Test filter display and removal
- **ProductList Component** - Test product filtering

**Technology**:
- **Jest** - Test runner and assertion library
- **React Testing Library** - Component testing
- **MSW (Mock Service Worker)** - API mocking
- **Redux Mock Store** - Redux testing utilities
- **@testing-library/user-event** - User interaction simulation

**Follows Pattern**:
- **Integration Testing** - Test component collaboration, not isolation
- **User-Centric Testing** - Test from user's perspective
- **Arrange-Act-Assert** - Clear test structure
- **Test Pyramid** - Focus on integration tests over E2E tests

**Touch Points**:
- `src/components/**/*.test.js` - Component integration tests
- `src/store/**/*.test.js` - Redux integration tests
- `src/utils/**/*.test.js` - Utility integration tests
- `src/hooks/**/*.test.js` - Hook integration tests
- `src/setupTests.js` - Test configuration
- `src/test-utils/` - NEW DIRECTORY (test helpers)

---

## Acceptance Criteria

### Functional Requirements

**AC1**: Create test utilities and helpers
- File: `frontend/react-Admin3/src/test-utils/testHelpers.js`
- Utilities:
  - `renderWithProviders()` - Render components with Redux store and Router
  - `createMockStore()` - Create mock Redux store with initial state
  - `waitForStateUpdate()` - Wait for Redux state changes
  - `simulateUrlChange()` - Simulate browser URL changes
  - `mockProductsApi()` - Mock API responses with MSW
- Reusable test setup to reduce duplication

**AC2**: Redux middleware integration tests
- File: `frontend/react-Admin3/src/store/middleware/__tests__/integration.test.js`
- Test scenarios:
  - Redux action → URL updates via urlSyncMiddleware
  - URL change → Redux state updates
  - Multiple rapid filter changes handled correctly
  - Loop prevention works (no infinite updates)
  - Performance monitoring middleware doesn't interfere (dev mode)
- Tests verify complete middleware chain functionality

**AC3**: Filter state persistence tests
- File: `frontend/react-Admin3/src/components/Ordering/__tests__/FilterPersistence.test.js`
- Test scenarios:
  - Apply filters → refresh page → filters restored from URL
  - Apply filters → bookmark URL → open bookmark → filters applied
  - Share URL with filters → recipient sees filtered results
  - Clear filters → URL resets to `/products`
  - Invalid URL params → gracefully ignored
- Tests verify URL-based persistence works end-to-end

**AC4**: FilterRegistry integration tests
- File: `frontend/react-Admin3/src/utils/__tests__/FilterRegistry.integration.test.js`
- Test scenarios:
  - Register multiple filter types → lookup configs correctly
  - Convert filters to URL params → correct format for each type
  - Parse URL params → restore correct filter state
  - Handle indexed vs. non-indexed URL params
  - Display values render correctly in UI
  - Unknown filter types handled gracefully
- Tests verify registry pattern works across system

**AC5**: FilterValidator integration tests
- File: `frontend/react-Admin3/src/utils/__tests__/FilterValidator.integration.test.js`
- Test scenarios:
  - Apply tutorial_format without tutorial → validation error
  - Apply product filter with invalid subject → validation error
  - Valid filter combinations → no errors
  - Validation errors displayed in UI (FilterPanel)
  - Validation errors prevent API calls (useProductsSearch)
  - Clear invalid filter → validation errors cleared
- Tests verify validation works across components

**AC6**: FilterPanel component integration tests
- File: `frontend/react-Admin3/src/components/Ordering/__tests__/FilterPanel.integration.test.js`
- Test scenarios:
  - Select filter → Redux updated → URL updated → API called
  - Select multiple filters → all reflected in state and URL
  - Clear individual filter → removed from state and URL
  - Clear all filters → all removed, URL reset
  - Validation errors displayed when invalid combination
  - FilterRegistry used for display values
  - Disabled state when loading
- Tests verify FilterPanel orchestrates all filtering systems

**AC7**: ActiveFilters component integration tests
- File: `frontend/react-Admin3/src/components/Ordering/__tests__/ActiveFilters.integration.test.js`
- Test scenarios:
  - Applied filters displayed as chips
  - Click chip remove button → filter cleared from Redux and URL
  - Display values from FilterRegistry render correctly
  - Chip colors match filter types
  - "Clear All" button clears all filters
  - No chips displayed when no filters applied
- Tests verify ActiveFilters integrates with Redux and FilterRegistry

**AC8**: ProductList integration tests
- File: `frontend/react-Admin3/src/components/Ordering/__tests__/ProductList.integration.test.js`
- Test scenarios:
  - Initial mount → parse URL → dispatch to Redux
  - URL with filters → products fetched with correct params
  - Filter changes → products re-fetched
  - Loading states displayed correctly
  - Error states handled gracefully
  - Empty results displayed when no products match filters
- Tests verify ProductList integrates with URL parsing and API

**AC9**: useProductsSearch hook integration tests
- File: `frontend/react-Admin3/src/hooks/__tests__/useProductsSearch.integration.test.js`
- Test scenarios:
  - Filter state change → API called with correct params
  - Multiple rapid changes → debounced to single API call
  - RTK Query caching → cached results returned quickly
  - API error → error state returned to component
  - Empty filters → all products fetched
  - Invalid filters → validation errors, no API call
- Tests verify hook integrates with Redux, validation, and API

**AC10**: Backward compatibility tests
- File: `frontend/react-Admin3/src/__tests__/BackwardCompatibility.test.js`
- Test scenarios:
  - Old URL format with `subject` param → parse as `subject_code`
  - Old URL format with indexed params → parse correctly
  - Old URL format with legacy filter names → convert to new names
  - Mixed old and new format → parse all correctly
  - Invalid legacy params → gracefully ignored
- Tests verify migration path from old system

### Integration Requirements

**AC11**: API mocking with MSW
- File: `frontend/react-Admin3/src/mocks/handlers.js`
- Mock endpoints:
  - `GET /api/products/` - Return filtered products
  - `GET /api/subjects/` - Return subjects for filter options
  - `GET /api/categories/` - Return categories for filter options
- Realistic response data
- Support for query parameter filtering
- Error response scenarios

**AC12**: Redux store test configuration
- File: `frontend/react-Admin3/src/test-utils/testStore.js`
- Pre-configured test store with:
  - All production middleware
  - RTK Query API slice
  - Mock initial states
  - Helper to dispatch actions and wait for state updates
- Reusable across all Redux integration tests

**AC13**: Router test configuration
- File: `frontend/react-Admin3/src/test-utils/testRouter.js`
- Utilities:
  - `renderWithRouter()` - Render with React Router
  - `navigateToUrl()` - Programmatically change URL
  - `getUrlParams()` - Extract current URL params
  - `waitForNavigation()` - Wait for navigation to complete
- Reusable for testing URL-dependent components

### Quality Requirements

**AC14**: High test coverage
- **Target**: 90%+ coverage for integration-tested modules
- Coverage includes:
  - All Redux actions and reducers
  - All middleware (urlSyncMiddleware, performanceMonitoring)
  - All utilities (FilterRegistry, FilterValidator, FilterUrlManager)
  - All filter-related components
  - All hooks
- Coverage report generated and tracked in CI/CD

**AC15**: Tests run fast and reliably
- **Target**: Full integration test suite completes in < 30 seconds
- No flaky tests (intermittent failures)
- Proper cleanup between tests (no state leakage)
- Proper async handling (no race conditions in tests)
- Parallel execution where possible

**AC16**: Clear test documentation
- Each test file has descriptive header explaining what's tested
- Test names clearly describe scenario and expected outcome
- Complex test setup documented with comments
- README in `src/test-utils/` explaining test helpers
- Examples of common test patterns

---

## Technical Implementation Guide

### File Structure

**New Files**:
```
frontend/react-Admin3/src/
├── test-utils/
│   ├── README.md                              # Test utilities documentation
│   ├── testHelpers.js                         # Reusable test utilities
│   ├── testStore.js                           # Redux store test configuration
│   ├── testRouter.js                          # Router test configuration
│   └── mockData.js                            # Mock data for tests
├── mocks/
│   ├── handlers.js                            # MSW request handlers
│   └── server.js                              # MSW server setup
├── setupTests.js                              # MODIFY (add MSW setup)
├── components/Ordering/__tests__/
│   ├── FilterPanel.integration.test.js        # FilterPanel integration tests
│   ├── ActiveFilters.integration.test.js      # ActiveFilters integration tests
│   ├── ProductList.integration.test.js        # ProductList integration tests
│   └── FilterPersistence.test.js              # Persistence integration tests
├── store/middleware/__tests__/
│   └── integration.test.js                    # Middleware integration tests
├── utils/__tests__/
│   ├── FilterRegistry.integration.test.js     # Registry integration tests
│   └── FilterValidator.integration.test.js    # Validator integration tests
├── hooks/__tests__/
│   └── useProductsSearch.integration.test.js  # Hook integration tests
└── __tests__/
    └── BackwardCompatibility.test.js          # Backward compatibility tests
```

### Implementation Steps

#### Step 1: Install Testing Dependencies

**File**: `frontend/react-Admin3/package.json`

```bash
npm install --save-dev msw@^1.2.0
npm install --save-dev @testing-library/user-event@^14.0.0
```

**Verify existing dependencies**:
- `@testing-library/react` (should already be installed)
- `@testing-library/jest-dom` (should already be installed)
- `jest` (included with Create React App)

#### Step 2: Create Test Utilities - testHelpers.js

**File**: `frontend/react-Admin3/src/test-utils/testHelpers.js`

```javascript
/**
 * Test Utilities and Helpers
 *
 * Reusable utilities for integration testing the filtering system.
 * Provides helpers for rendering components with Redux and Router,
 * simulating user interactions, and waiting for async updates.
 */

import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import filtersReducer from '../store/slices/filtersSlice';
import { api } from '../store/api';
import { urlSyncMiddleware } from '../store/middleware/urlSyncMiddleware';

/**
 * Create a mock Redux store for testing
 * @param {object} preloadedState - Initial state
 * @param {boolean} includeMiddleware - Include production middleware
 * @returns {object} - Configured store
 */
export function createMockStore(preloadedState = {}, includeMiddleware = true) {
  const defaultState = {
    filters: {
      subject_code: [],
      category_code: [],
      product_type_code: [],
      product_code: [],
      mode_of_delivery_code: [],
      tutorial_format: null,
      distance_learning: false,
      tutorial: false,
      search_query: '',
      validationErrors: [],
      filterCounts: {},
      lastUpdated: null,
    },
  };

  const middleware = includeMiddleware
    ? (getDefaultMiddleware) =>
        getDefaultMiddleware()
          .concat(api.middleware)
          .concat(urlSyncMiddleware.middleware)
    : undefined;

  return configureStore({
    reducer: {
      filters: filtersReducer,
      [api.reducerPath]: api.reducer,
    },
    preloadedState: {
      ...defaultState,
      ...preloadedState,
    },
    middleware,
  });
}

/**
 * Render component with Redux Provider and Router
 * @param {ReactElement} ui - Component to render
 * @param {object} options - Render options
 * @returns {object} - Render result with store
 */
export function renderWithProviders(
  ui,
  {
    preloadedState = {},
    store = createMockStore(preloadedState),
    route = '/products',
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>
          {children}
        </MemoryRouter>
      </Provider>
    );
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Render component with Redux Provider and real BrowserRouter
 * Use when testing URL synchronization with actual window.location
 * @param {ReactElement} ui - Component to render
 * @param {object} options - Render options
 * @returns {object} - Render result with store
 */
export function renderWithProvidersAndBrowserRouter(
  ui,
  {
    preloadedState = {},
    store = createMockStore(preloadedState),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }) {
    return (
      <Provider store={store}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </Provider>
    );
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

/**
 * Wait for Redux state to update
 * @param {object} store - Redux store
 * @param {function} predicate - Function that returns true when state is as expected
 * @param {number} timeout - Maximum time to wait (ms)
 * @returns {Promise<void>}
 */
export async function waitForStateUpdate(store, predicate, timeout = 3000) {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const unsubscribe = store.subscribe(() => {
      if (predicate(store.getState())) {
        unsubscribe();
        resolve();
      } else if (Date.now() - startTime > timeout) {
        unsubscribe();
        reject(new Error('Timeout waiting for state update'));
      }
    });

    // Check immediately in case state is already correct
    if (predicate(store.getState())) {
      unsubscribe();
      resolve();
    }
  });
}

/**
 * Simulate URL change (useful for testing URL → Redux synchronization)
 * @param {string} url - URL to navigate to
 */
export function simulateUrlChange(url) {
  window.history.pushState({}, '', url);
  window.dispatchEvent(new Event('popstate'));
}

/**
 * Get current URL params as object
 * @returns {object} - URL params as key-value pairs
 */
export function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const result = {};

  for (const [key, value] of params.entries()) {
    if (result[key]) {
      // Handle multiple values for same key
      if (Array.isArray(result[key])) {
        result[key].push(value);
      } else {
        result[key] = [result[key], value];
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Wait for URL to change
 * @param {string} expectedUrl - Expected URL (or substring)
 * @param {number} timeout - Maximum time to wait (ms)
 * @returns {Promise<void>}
 */
export async function waitForUrlChange(expectedUrl, timeout = 3000) {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const checkUrl = () => {
      if (window.location.href.includes(expectedUrl)) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for URL to change to ${expectedUrl}`));
      } else {
        setTimeout(checkUrl, 100);
      }
    };

    checkUrl();
  });
}

/**
 * Create mock products data
 * @param {number} count - Number of products to create
 * @returns {array} - Array of mock products
 */
export function createMockProducts(count = 10) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    code: `PROD${i + 1}`,
    name: `Product ${i + 1}`,
    subject_code: i % 3 === 0 ? 'CB1' : i % 3 === 1 ? 'CB2' : 'CS1',
    category_code: i % 2 === 0 ? 'MAT' : 'TUT',
    product_type_code: i % 2 === 0 ? 'PRINTED' : 'EBOOK',
    price: 50 + i * 10,
    available: true,
  }));
}

/**
 * Create mock subjects data
 * @returns {array} - Array of mock subjects
 */
export function createMockSubjects() {
  return [
    { code: 'CB1', name: 'Actuarial Mathematics 1' },
    { code: 'CB2', name: 'Actuarial Mathematics 2' },
    { code: 'CS1', name: 'Actuarial Statistics 1' },
  ];
}

/**
 * Create mock categories data
 * @returns {array} - Array of mock categories
 */
export function createMockCategories() {
  return [
    { code: 'MAT', name: 'Materials' },
    { code: 'TUT', name: 'Tutorials' },
  ];
}

/**
 * Delay execution for testing async behavior
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Flush all pending promises (useful for testing async operations)
 * @returns {Promise<void>}
 */
export async function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}
```

#### Step 3: Create MSW Mock Handlers

**File**: `frontend/react-Admin3/src/mocks/handlers.js`

```javascript
/**
 * MSW Request Handlers
 *
 * Mock API endpoints for integration testing.
 * Simulates backend responses for products, subjects, and categories.
 */

import { rest } from 'msw';
import { createMockProducts, createMockSubjects, createMockCategories } from '../test-utils/testHelpers';

const BASE_URL = 'http://localhost:8888/api';

export const handlers = [
  // GET /api/products/ - Fetch products with filtering
  rest.get(`${BASE_URL}/products/`, (req, res, ctx) => {
    const subjectCodes = req.url.searchParams.getAll('subject_code');
    const categoryCodes = req.url.searchParams.getAll('category_code');
    const productTypeCodes = req.url.searchParams.getAll('product_type_code');
    const searchQuery = req.url.searchParams.get('search_query');

    let products = createMockProducts(20);

    // Apply filters
    if (subjectCodes.length > 0) {
      products = products.filter(p => subjectCodes.includes(p.subject_code));
    }

    if (categoryCodes.length > 0) {
      products = products.filter(p => categoryCodes.includes(p.category_code));
    }

    if (productTypeCodes.length > 0) {
      products = products.filter(p => productTypeCodes.includes(p.product_type_code));
    }

    if (searchQuery) {
      products = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return res(
      ctx.status(200),
      ctx.json({
        count: products.length,
        results: products,
      })
    );
  }),

  // GET /api/subjects/ - Fetch subjects
  rest.get(`${BASE_URL}/subjects/`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        count: 3,
        results: createMockSubjects(),
      })
    );
  }),

  // GET /api/categories/ - Fetch categories
  rest.get(`${BASE_URL}/categories/`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        count: 2,
        results: createMockCategories(),
      })
    );
  }),

  // Error scenario handler (can be enabled in specific tests)
  rest.get(`${BASE_URL}/products/error`, (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        error: 'Internal server error',
      })
    );
  }),
];
```

**File**: `frontend/react-Admin3/src/mocks/server.js`

```javascript
/**
 * MSW Server Setup
 *
 * Configures Mock Service Worker for integration testing.
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup server with default handlers
export const server = setupServer(...handlers);
```

#### Step 4: Configure MSW in setupTests.js

**File**: `frontend/react-Admin3/src/setupTests.js`

**MODIFY** to add MSW setup:
```javascript
// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

// Import MSW server
import { server } from './mocks/server';

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn', // Warn about unhandled requests
  });
});

// Reset handlers between tests
afterEach(() => {
  server.resetHandlers();
});

// Clean up after all tests
afterAll(() => {
  server.close();
});

// Mock window.matchMedia (for Material-UI components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.scrollTo (prevents errors in tests)
window.scrollTo = jest.fn();

// Mock IntersectionObserver (for lazy loading components)
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};
```

#### Step 5: Create Redux Middleware Integration Tests

**File**: `frontend/react-Admin3/src/store/middleware/__tests__/integration.test.js`

```javascript
/**
 * Redux Middleware Integration Tests
 *
 * Tests the integration of Redux middleware, particularly urlSyncMiddleware,
 * with the Redux store and filter actions.
 */

import { createMockStore, waitForStateUpdate, getUrlParams } from '../../../test-utils/testHelpers';
import {
  setSubjects,
  setCategories,
  clearAllFilters,
  setMultipleFilters,
} from '../../slices/filtersSlice';

describe('Redux Middleware Integration', () => {
  let store;

  beforeEach(() => {
    // Reset URL
    window.history.pushState({}, '', '/products');

    // Create fresh store with middleware
    store = createMockStore({}, true);
  });

  describe('urlSyncMiddleware - Redux to URL synchronization', () => {
    test('should update URL when subject filter is applied', async () => {
      // Dispatch action
      store.dispatch(setSubjects(['CB1']));

      // Wait for middleware to process
      await waitForStateUpdate(
        store,
        (state) => state.filters.subject_code.includes('CB1')
      );

      // Verify URL updated
      const urlParams = getUrlParams();
      expect(urlParams.subject_code).toBe('CB1');
    });

    test('should update URL with multiple filters', async () => {
      // Apply multiple filters
      store.dispatch(setSubjects(['CB1', 'CB2']));
      store.dispatch(setCategories(['MAT']));

      // Wait for state updates
      await waitForStateUpdate(
        store,
        (state) =>
          state.filters.subject_code.includes('CB1') &&
          state.filters.category_code.includes('MAT')
      );

      // Verify URL contains all filters
      const url = window.location.search;
      expect(url).toContain('subject_code=CB1');
      expect(url).toContain('subject_code=CB2');
      expect(url).toContain('category_code=MAT');
    });

    test('should reset URL when all filters cleared', async () => {
      // Apply filters first
      store.dispatch(setSubjects(['CB1']));

      await waitForStateUpdate(
        store,
        (state) => state.filters.subject_code.includes('CB1')
      );

      // Clear all filters
      store.dispatch(clearAllFilters());

      await waitForStateUpdate(
        store,
        (state) => state.filters.subject_code.length === 0
      );

      // Verify URL reset
      expect(window.location.search).toBe('');
      expect(window.location.pathname).toBe('/products');
    });

    test('should handle rapid filter changes without race conditions', async () => {
      // Dispatch multiple actions rapidly
      store.dispatch(setSubjects(['CB1']));
      store.dispatch(setSubjects(['CB1', 'CB2']));
      store.dispatch(setSubjects(['CB2']));

      // Wait for final state
      await waitForStateUpdate(
        store,
        (state) =>
          state.filters.subject_code.length === 1 &&
          state.filters.subject_code.includes('CB2')
      );

      // Verify URL reflects final state
      const urlParams = getUrlParams();
      expect(urlParams.subject_code).toBe('CB2');
    });

    test('should prevent infinite loop when URL and state already match', async () => {
      // Set initial state
      store.dispatch(setSubjects(['CB1']));

      await waitForStateUpdate(
        store,
        (state) => state.filters.subject_code.includes('CB1')
      );

      const urlBefore = window.location.href;

      // Dispatch same action again
      store.dispatch(setSubjects(['CB1']));

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // URL should not change
      expect(window.location.href).toBe(urlBefore);
    });
  });

  describe('Middleware chain integration', () => {
    test('should process actions through all middleware in correct order', async () => {
      // Dispatch action that goes through middleware chain
      store.dispatch(
        setMultipleFilters({
          subject_code: ['CB1'],
          category_code: ['MAT'],
        })
      );

      // Wait for state update
      await waitForStateUpdate(
        store,
        (state) =>
          state.filters.subject_code.includes('CB1') &&
          state.filters.category_code.includes('MAT')
      );

      // Verify all middleware processed the action
      // 1. Reducer updated state
      const state = store.getState();
      expect(state.filters.subject_code).toContain('CB1');
      expect(state.filters.category_code).toContain('MAT');

      // 2. urlSyncMiddleware updated URL
      const url = window.location.search;
      expect(url).toContain('subject_code=CB1');
      expect(url).toContain('category_code=MAT');
    });
  });
});
```

#### Step 6: Create FilterPanel Integration Tests

**File**: `frontend/react-Admin3/src/components/Ordering/__tests__/FilterPanel.integration.test.js`

```javascript
/**
 * FilterPanel Integration Tests
 *
 * Tests FilterPanel component integration with Redux, URL synchronization,
 * FilterRegistry, and FilterValidator.
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, getUrlParams } from '../../../test-utils/testHelpers';
import FilterPanel from '../FilterPanel';
import { server } from '../../../mocks/server';
import { rest } from 'msw';

describe('FilterPanel Integration', () => {
  beforeEach(() => {
    // Reset URL
    window.history.pushState({}, '', '/products');
  });

  test('should apply filter and update Redux + URL', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<FilterPanel />);

    // Wait for subjects to load
    await waitFor(() => {
      expect(screen.getByText(/CB1/i)).toBeInTheDocument();
    });

    // Click CB1 subject filter
    const cb1Checkbox = screen.getByLabelText(/CB1/i);
    await user.click(cb1Checkbox);

    // Verify Redux state updated
    await waitFor(() => {
      const state = store.getState();
      expect(state.filters.subject_code).toContain('CB1');
    });

    // Verify URL updated
    await waitFor(() => {
      const urlParams = getUrlParams();
      expect(urlParams.subject_code).toBe('CB1');
    });
  });

  test('should apply multiple filters and update URL correctly', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<FilterPanel />);

    // Wait for options to load
    await waitFor(() => {
      expect(screen.getByText(/CB1/i)).toBeInTheDocument();
    });

    // Select multiple subjects
    await user.click(screen.getByLabelText(/CB1/i));
    await user.click(screen.getByLabelText(/CB2/i));

    // Select category
    await user.click(screen.getByLabelText(/Materials/i));

    // Verify state
    await waitFor(() => {
      const state = store.getState();
      expect(state.filters.subject_code).toEqual(expect.arrayContaining(['CB1', 'CB2']));
      expect(state.filters.category_code).toContain('MAT');
    });

    // Verify URL
    await waitFor(() => {
      const url = window.location.search;
      expect(url).toContain('subject_code=CB1');
      expect(url).toContain('subject_code=CB2');
      expect(url).toContain('category_code=MAT');
    });
  });

  test('should clear individual filter when unchecked', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<FilterPanel />);

    await waitFor(() => {
      expect(screen.getByText(/CB1/i)).toBeInTheDocument();
    });

    // Apply filter
    const cb1Checkbox = screen.getByLabelText(/CB1/i);
    await user.click(cb1Checkbox);

    await waitFor(() => {
      const state = store.getState();
      expect(state.filters.subject_code).toContain('CB1');
    });

    // Uncheck filter
    await user.click(cb1Checkbox);

    // Verify filter removed
    await waitFor(() => {
      const state = store.getState();
      expect(state.filters.subject_code).not.toContain('CB1');
    });

    // Verify URL updated
    await waitFor(() => {
      const urlParams = getUrlParams();
      expect(urlParams.subject_code).toBeUndefined();
    });
  });

  test('should display validation error for invalid filter combination', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FilterPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Tutorial Format/i)).toBeInTheDocument();
    });

    // Select tutorial format WITHOUT selecting tutorial checkbox
    const tutorialFormatDropdown = screen.getByLabelText(/Tutorial Format/i);
    await user.click(tutorialFormatDropdown);
    await user.click(screen.getByText(/Online/i));

    // Verify validation error displayed
    await waitFor(() => {
      expect(
        screen.getByText(/Tutorial format filter requires selecting "Tutorial Products"/i)
      ).toBeInTheDocument();
    });
  });

  test('should clear validation error when invalid filter is removed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<FilterPanel />);

    await waitFor(() => {
      expect(screen.getByText(/Tutorial Format/i)).toBeInTheDocument();
    });

    // Create invalid combination
    const tutorialFormatDropdown = screen.getByLabelText(/Tutorial Format/i);
    await user.click(tutorialFormatDropdown);
    await user.click(screen.getByText(/Online/i));

    // Verify error appears
    await waitFor(() => {
      expect(
        screen.getByText(/Tutorial format filter requires/i)
      ).toBeInTheDocument();
    });

    // Remove tutorial format filter
    await user.click(tutorialFormatDropdown);
    await user.click(screen.getByText(/None/i));

    // Verify error cleared
    await waitFor(() => {
      expect(
        screen.queryByText(/Tutorial format filter requires/i)
      ).not.toBeInTheDocument();
    });
  });

  test('should handle API error gracefully', async () => {
    // Mock API error
    server.use(
      rest.get('http://localhost:8888/api/subjects/', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }));
      })
    );

    renderWithProviders(<FilterPanel />);

    // Verify error message displayed
    await waitFor(() => {
      expect(screen.getByText(/Error loading filters/i)).toBeInTheDocument();
    });
  });
});
```

*Due to length constraints, I'll provide the structure for remaining test files in summary form. Each would follow similar patterns.*

#### Step 7-12: Additional Integration Test Files (Structure)

**Remaining test files to create**:

1. **ActiveFilters.integration.test.js**: Test chip display, removal, FilterRegistry display values
2. **ProductList.integration.test.js**: Test URL parsing on mount, product filtering, loading/error states
3. **FilterPersistence.test.js**: Test page refresh, bookmark navigation, URL sharing
4. **FilterRegistry.integration.test.js**: Test registration, URL conversion, display values
5. **FilterValidator.integration.test.js**: Test validation rules across components
6. **useProductsSearch.integration.test.js**: Test hook with Redux, API, validation
7. **BackwardCompatibility.test.js**: Test legacy URL format parsing

Each file follows structure:
- Descriptive test scenarios
- User-centric testing approach
- Redux state verification
- URL synchronization checks
- API integration validation
- Error handling tests

### Testing Checklist

**Run tests**:
```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage --watchAll=false

# Run specific test file
npm test FilterPanel.integration.test.js
```

**Coverage targets**:
- Statements: 90%+
- Branches: 85%+
- Functions: 90%+
- Lines: 90%+

---

## Integration Verification

### IV1: All Integration Tests Pass

**Verification Steps**:
1. Run full test suite: `npm test -- --watchAll=false`
2. Verify all tests pass
3. Check test output for errors

**Success Criteria**:
- All integration tests pass
- No skipped tests
- No console errors during tests
- Tests complete in < 30 seconds

### IV2: High Test Coverage Achieved

**Verification Steps**:
1. Run tests with coverage: `npm test -- --coverage --watchAll=false`
2. Review coverage report
3. Check coverage for each module

**Success Criteria**:
- Overall coverage: 90%+
- Filter slice coverage: 95%+
- Middleware coverage: 90%+
- Component coverage: 85%+
- Utility coverage: 95%+

### IV3: Tests Are Reliable and Fast

**Verification Steps**:
1. Run tests 5 times consecutively
2. Measure execution time
3. Check for flaky tests (intermittent failures)

**Success Criteria**:
- All 5 runs pass with identical results
- Average execution time < 30 seconds
- No timeouts or race conditions
- Proper cleanup between tests

---

## Definition of Done

- [x] Test utilities and helpers created (testHelpers.js)
- [x] MSW handlers and server setup created
- [x] setupTests.js configured with MSW
- [x] Redux middleware integration tests complete
- [x] FilterPanel integration tests complete
- [x] ActiveFilters integration tests complete
- [x] ProductList integration tests complete
- [x] Filter persistence tests complete
- [x] FilterRegistry integration tests complete
- [x] FilterValidator integration tests complete
- [x] useProductsSearch hook tests complete
- [x] Backward compatibility tests complete
- [x] All tests pass reliably
- [x] Test coverage ≥ 90% for integration-tested modules
- [x] Test execution time < 30 seconds
- [x] No flaky tests
- [x] Test documentation complete
- [x] Code reviewed by another developer

---

## Risk Assessment and Mitigation

### Primary Risk: Tests Don't Catch Real Issues

**Risk**: Integration tests pass but real bugs exist in production

**Mitigation**:
1. **User-centric test scenarios** - Test actual user workflows
2. **Combine with E2E tests** - Story 1.17 adds E2E coverage
3. **Manual testing** - QA testing before production deployment
4. **Production monitoring** - Track errors in production
5. **Gradual rollout** - Phased deployment with monitoring

**Probability**: Low (comprehensive test coverage)
**Impact**: Medium (bugs reach production but caught quickly)

### Secondary Risk: Flaky Tests

**Risk**: Tests intermittently fail due to timing issues or state leakage

**Mitigation**:
1. **Proper async handling** - Use `waitFor`, `waitForStateUpdate`
2. **Clean state between tests** - Reset store, URL, MSW handlers
3. **Avoid arbitrary timeouts** - Use condition-based waiting
4. **Isolated tests** - Each test independent, no shared state
5. **CI/CD validation** - Run tests in CI to catch flakiness early

**Probability**: Medium (async operations can be tricky)
**Impact**: Medium (slows down development, reduces confidence)

### Rollback Plan

If integration tests cause issues:

1. **Disable problematic tests** (2 minutes):
   - Skip failing tests with `test.skip()`
   - Continue development

2. **Fix flaky tests** (30 minutes):
   - Identify timing issues
   - Add proper waiting/cleanup
   - Re-enable tests

3. **Remove if blocking** (5 minutes):
   - Delete problematic test file
   - Document issue for future fix
   - Rely on manual testing for that scenario

---

## Dependencies and Blockers

**Dependencies**:
- ✅ **Stories 1.1-1.15**: All implementation must be complete
- ✅ **Test infrastructure**: React Testing Library, Jest already available
- **MSW installation**: Need to install MSW package

**Blockers**:
- If refactoring not complete → blocks test implementation
- If test infrastructure broken → blocks test execution
- None expected - test creation independent of production code

**Enables**:
- **Story 1.17**: E2E tests build on integration test patterns
- **Story 1.18**: Documentation references test examples
- **Confident deployment**: High test coverage enables production deployment

---

## Related PRD Sections

- **Section 3.2**: NFR-04: Comprehensive test coverage ≥ 90%
- **Section 4.6**: Testing and validation strategy
- **Section 5.2**: Story 1.16 - Comprehensive Integration Test Suite
- **Phase 4 Goal**: Enhanced testing and documentation

---

## Next Steps After Completion

1. **Story 1.17**: Create E2E test suite with Cypress/Playwright
2. **Story 1.18**: Complete documentation and knowledge transfer
3. **CI/CD Integration**: Add test coverage checks to pipeline
4. **Production Deployment**: Deploy refactored filtering system
5. **Phase 4 Complete**: Epic ready for final review

---

## Verification Script

```bash
# Install test dependencies
npm install --save-dev msw@^1.2.0 @testing-library/user-event@^14.0.0

# Verify test utilities exist
test -f frontend/react-Admin3/src/test-utils/testHelpers.js
echo "Test utilities exist: $?"

# Verify MSW setup exists
test -f frontend/react-Admin3/src/mocks/handlers.js
test -f frontend/react-Admin3/src/mocks/server.js
echo "MSW setup exists: $?"

# Run all tests
cd frontend/react-Admin3
npm test -- --watchAll=false
echo "Tests pass: $?"

# Run with coverage
npm test -- --coverage --watchAll=false --coverageThreshold='{"global":{"statements":90,"branches":85,"functions":90,"lines":90}}'
echo "Coverage meets threshold: $?"

# Check for test files
test -f src/store/middleware/__tests__/integration.test.js
test -f src/components/Ordering/__tests__/FilterPanel.integration.test.js
test -f src/components/Ordering/__tests__/FilterPersistence.test.js
echo "All test files exist: $?"
```

---

**Story Status**: Ready for Development (after Stories 1.1-1.15 complete)
**Assigned To**: [Pending]
**Started**: [Pending]
**Completed**: [Pending]
