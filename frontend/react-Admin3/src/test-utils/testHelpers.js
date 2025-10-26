/**
 * Test Helpers Module (Story 1.16)
 *
 * Reusable utilities for rendering React components with Redux store and Router
 * in integration tests. Provides helpers for state management, URL simulation,
 * and API mocking.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import filtersReducer from '../store/slices/filtersSlice';
import { urlSyncMiddleware } from '../store/middleware/urlSyncMiddleware';

// Import MemoryRouter - Jest will use manual mock from __mocks__/react-router-dom.js
import { MemoryRouter } from 'react-router-dom';

// Lazy load catalogApi to avoid ESM issues in tests
let catalogApi;
function getCatalogApi() {
  if (!catalogApi) {
    try {
      catalogApi = require('../store/api/catalogApi').catalogApi;
    } catch (error) {
      // Fallback to mock if ESM import fails
      console.warn('Using mock catalogApi due to ESM import error');
      catalogApi = require('../__mocks__/catalogApiMock').catalogApi;
    }
  }
  return catalogApi;
}

// Lazy load mockHandlers to avoid MSW ESM issues
let mockHandlers;
function getMockHandlers() {
  if (!mockHandlers) {
    try {
      mockHandlers = require('./mockHandlers');
    } catch (error) {
      // Fallback to mock if MSW ESM import fails
      console.warn('Using mock mockHandlers due to ESM import error');
      mockHandlers = require('../__mocks__/mockHandlersMock');
    }
  }
  return mockHandlers;
}

/**
 * Render component wrapped with Redux Provider and Router
 *
 * @param {React.Element} ui - Component to render
 * @param {Object} options - Configuration options
 * @param {Object} options.preloadedState - Initial Redux state
 * @param {Store} options.store - Pre-configured Redux store
 * @param {string} options.route - Initial browser URL
 * @param {History} options.history - Custom history object
 * @param {...Object} options.renderOptions - Additional RTL render options
 * @returns {RenderResult & { store: Store }} - RTL render result with store instance
 */
export function renderWithProviders(
  ui,
  {
    preloadedState = {},
    // Store will be created after setting window.location
    store,
    route = '/',
    history,
    ...renderOptions
  } = {}
) {
  // Validate required parameters
  if (!ui) {
    throw new Error('ui component is required');
  }

  // Set window.location for URL parsing BEFORE creating store (Story 1.16)
  // MemoryRouter doesn't update window.location, but tests expect it for URL → Redux sync
  if (typeof window !== 'undefined') {
    const [pathname, search] = route.split('?');

    // Set window.location (either with query string or clear it)
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        search: search ? `?${search}` : '',
        pathname: pathname || '/',
      },
      writable: true,
      configurable: true
    });
  }

  // Create store AFTER setting window.location
  if (!store) {
    const api = getCatalogApi();
    store = configureStore({
      reducer: {
        filters: filtersReducer,
        [api.reducerPath]: api.reducer,
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware()
          .prepend(urlSyncMiddleware.middleware)
          .concat(api.middleware),
      preloadedState,
    });

    // Setup URL → Redux sync for this store
    try {
      const { setupUrlToReduxSync } = require('../store/middleware/urlSyncMiddleware');
      setupUrlToReduxSync(store.dispatch);
    } catch (error) {
      console.warn('Could not setup URL → Redux sync:', error.message);
    }
  }

  // Create router wrapper
  const RouterWrapper = ({ children }) => {
    // Use MemoryRouter with initial route
    // Note: history parameter is supported for compatibility but uses MemoryRouter
    const initialEntries = history ? history.entries : [route];
    const initialIndex = history ? history.index : 0;

    return (
      <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
        {children}
      </MemoryRouter>
    );
  };

  // Create full wrapper with Provider and Router
  function Wrapper({ children }) {
    return (
      <Provider store={store}>
        <RouterWrapper>{children}</RouterWrapper>
      </Provider>
    );
  }

  // Render component
  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions });

  // Return render result with store instance
  return {
    ...renderResult,
    store,
  };
}

/**
 * Create mock Redux store for testing
 *
 * @param {Object} options - Store configuration
 * @param {Object} options.preloadedState - Initial Redux state
 * @param {Array} options.middleware - Custom middleware array
 * @param {Function} options.reducer - Custom root reducer
 * @returns {Store} - Configured Redux store
 */
export function createMockStore(options = {}) {
  const {
    preloadedState = {
      filters: {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        searchQuery: '',
        currentPage: 1,
        pageSize: 20,
        isFilterPanelOpen: false,
        isLoading: false,
        error: null,
        filterCounts: {},
        validationErrors: [],
      },
    },
    middleware,
    reducer,
  } = options;

  const api = getCatalogApi();

  const store = configureStore({
    reducer: reducer || {
      filters: filtersReducer,
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) => {
      if (middleware) {
        return getDefaultMiddleware().concat(middleware);
      }
      return getDefaultMiddleware()
        .prepend(urlSyncMiddleware.middleware)
        .concat(api.middleware);
    },
    preloadedState,
  });

  // Setup URL → Redux sync for test stores (Story 1.16)
  // Import setupUrlToReduxSync dynamically to avoid circular dependency issues
  try {
    const { setupUrlToReduxSync } = require('../store/middleware/urlSyncMiddleware');
    setupUrlToReduxSync(store.dispatch);
  } catch (error) {
    console.warn('Could not setup URL → Redux sync for mock store:', error.message);
  }

  return store;
}

/**
 * Wait for Redux state to match a condition
 *
 * @param {Store} store - Redux store to monitor
 * @param {Function} predicate - Function that receives state and returns boolean
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Max wait time in ms (default: 1000)
 * @param {number} options.interval - Check interval in ms (default: 50)
 * @returns {Promise<void>} - Resolves when predicate returns true
 */
export function waitForStateUpdate(store, predicate, options = {}) {
  // Validate required parameters
  if (!store || !predicate) {
    return Promise.reject(new Error('store and predicate are required'));
  }

  const { timeout = 1000, interval = 50 } = options;

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    // Check if condition already met
    if (predicate(store.getState())) {
      resolve();
      return;
    }

    // Subscribe to store changes
    const unsubscribe = store.subscribe(() => {
      const state = store.getState();

      if (predicate(state)) {
        unsubscribe();
        resolve();
      }
    });

    // Timeout checker
    const timeoutId = setTimeout(() => {
      unsubscribe();
      const error = new Error('Timeout waiting for state update');
      error.lastState = store.getState();
      reject(error);
    }, timeout);

    // Check periodically in case subscription misses update
    const intervalId = setInterval(() => {
      if (predicate(store.getState())) {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        unsubscribe();
        resolve();
      }

      // Check timeout
      if (Date.now() - startTime > timeout) {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        unsubscribe();
        reject(new Error('Timeout waiting for state update'));
      }
    }, interval);
  });
}

/**
 * Simulate browser URL change for testing URL parsing logic
 *
 * @param {string} url - New URL to navigate to
 * @param {Object} options - Navigation options
 * @param {string} options.method - Navigation method: 'push' | 'replace'
 * @param {Object} options.state - History state object
 * @returns {void}
 */
export function simulateUrlChange(url, options = {}) {
  if (!url) {
    throw new Error('url parameter is required');
  }

  const { method = 'push', state = null } = options;

  // Update window.location (in test environment with jsdom)
  if (method === 'push') {
    window.history.pushState(state, '', url);
  } else if (method === 'replace') {
    window.history.replaceState(state, '', url);
  }

  // Trigger popstate event to simulate navigation
  const popStateEvent = new PopStateEvent('popstate', { state });
  window.dispatchEvent(popStateEvent);
}

/**
 * Configure MSW handlers for mocking product API endpoints
 *
 * @param {Object} options - API mock configuration
 * @param {Array} options.products - Mock product data
 * @param {Array} options.subjects - Mock subject data
 * @param {Array} options.categories - Mock category data
 * @param {number} options.delay - Simulated network delay in ms
 * @param {number} options.errorRate - Fraction of requests that fail (0-1)
 * @returns {void}
 */
export function mockProductsApi(options = {}) {
  const { configureMockHandlers } = getMockHandlers();
  configureMockHandlers(options);
}

/**
 * Create mock history object for Router testing
 *
 * @param {Array} initialEntries - Initial history stack
 * @param {number} initialIndex - Current history index
 * @returns {Object} - Mock history object compatible with MemoryRouter
 */
export function createMockHistory(initialEntries = ['/'], initialIndex = 0) {
  // Create a simple mock history object that works with MemoryRouter
  let entries = [...initialEntries];
  let index = initialIndex;

  // Parse pathname and search from URL string
  const parseUrl = (url) => {
    const [pathname, search] = url.split('?');
    return {
      pathname,
      search: search ? `?${search}` : '',
      hash: '',
      state: null,
      key: 'default',
    };
  };

  return {
    entries,
    index,
    get location() {
      return parseUrl(entries[index] || '/');
    },
    push: (path) => {
      index++;
      entries = entries.slice(0, index);
      entries.push(path);
    },
    replace: (path) => {
      entries[index] = path;
    },
    go: (n) => {
      index = Math.max(0, Math.min(entries.length - 1, index + n));
    },
    goBack: () => {
      if (index > 0) index--;
    },
    goForward: () => {
      if (index < entries.length - 1) index++;
    },
    get length() {
      return entries.length;
    },
  };
}

/**
 * Flush all pending Promises in the microtask queue
 *
 * @returns {Promise<void>} - Resolves after all pending Promises
 */
export function flushPromises() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Setup MSW server for all tests (call in setupTests.js or test file)
 */
export function setupMockServer() {
  const { setupMockServer: setup } = getMockHandlers();
  return setup();
}
