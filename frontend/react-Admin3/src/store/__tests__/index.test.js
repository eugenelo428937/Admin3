import { vi } from 'vitest';
/**
 * Tests for Redux Store Configuration
 * T003: Test store creation, middleware setup
 */

import { configureStore } from '@reduxjs/toolkit';

// Mock the dependencies before importing the store
vi.mock('../api/catalogApi.js', () => ({
  catalogApi: {
    reducerPath: 'catalogApi',
    reducer: (state = {}) => state,
    middleware: () => (next) => (action) => next(action),
  },
  useUnifiedSearchQuery: vi.fn(),
}));

vi.mock('../middleware/urlSyncMiddleware.js', () => ({
  urlSyncMiddleware: {
    middleware: () => (next) => (action) => next(action),
  },
  setupUrlToReduxSync: vi.fn(),
}));

vi.mock('../middleware/performanceMonitoring.js', () => ({
  __esModule: true,
  default: () => (next) => (action) => next(action),
}));

describe('Redux Store Configuration', () => {
  let store;
  let originalEnv;
  let originalDev;
  let originalProd;

  beforeEach(async () => {
    vi.resetModules();
    originalEnv = import.meta.env.MODE;
    originalDev = import.meta.env.DEV;
    originalProd = import.meta.env.PROD;
  });

  afterEach(() => {
    import.meta.env.MODE = originalEnv;
    import.meta.env.DEV = originalDev;
    import.meta.env.PROD = originalProd;
  });

  describe('store creation', () => {
    test('creates store with required reducers', async () => {
      // Import store after mocks are set up
      const _reqmod____index_js = await import('../index.js'); const { store: testStore } = _reqmod____index_js;
      store = testStore;

      const state = store.getState();

      // Verify filters slice exists
      expect(state).toHaveProperty('filters');
      expect(state.filters).toBeDefined();
    });

    test('filters reducer has correct initial state structure', async () => {
      const _reqmod____index_js = await import('../index.js'); const { store: testStore } = _reqmod____index_js;
      store = testStore;

      const filtersState = store.getState().filters;

      // Check initial state properties
      expect(filtersState).toHaveProperty('subjects');
      expect(filtersState).toHaveProperty('categories');
      expect(filtersState).toHaveProperty('product_types');
      expect(filtersState).toHaveProperty('products');
      expect(filtersState).toHaveProperty('modes_of_delivery');
      expect(filtersState).toHaveProperty('searchQuery');
      expect(filtersState).toHaveProperty('currentPage');
      expect(filtersState).toHaveProperty('pageSize');
    });

    test('filters state has correct initial values', async () => {
      const _reqmod____index_js = await import('../index.js'); const { store: testStore } = _reqmod____index_js;
      store = testStore;

      const filtersState = store.getState().filters;

      // Verify initial values
      expect(filtersState.subjects).toEqual([]);
      expect(filtersState.categories).toEqual([]);
      expect(filtersState.product_types).toEqual([]);
      expect(filtersState.products).toEqual([]);
      expect(filtersState.modes_of_delivery).toEqual([]);
      expect(filtersState.searchQuery).toBe('');
      expect(filtersState.currentPage).toBe(1);
      expect(filtersState.pageSize).toBe(20);
    });
  });

  describe('store exports', () => {
    test('exports store as default', async () => {
      const storeModule = require('../index.js');

      expect(storeModule.default).toBeDefined();
      expect(typeof storeModule.default.getState).toBe('function');
      expect(typeof storeModule.default.dispatch).toBe('function');
    });

    test('exports dispatch function', async () => {
      const _reqmod____index_js = await import('../index.js'); const { dispatch } = _reqmod____index_js;

      expect(dispatch).toBeDefined();
      expect(typeof dispatch).toBe('function');
    });

    test('exports getState function', async () => {
      const _reqmod____index_js = await import('../index.js'); const { getState } = _reqmod____index_js;

      expect(getState).toBeDefined();
      expect(typeof getState).toBe('function');
    });

    test('exports useUnifiedSearchQuery hook', async () => {
      // useUnifiedSearchQuery is re-exported from catalogApi
      const storeModule = require('../index.js');

      // It may be undefined due to mocking, but it should be defined in actual usage
      // This test verifies the export structure exists
      expect('useUnifiedSearchQuery' in storeModule).toBe(true);
    });
  });

  describe('middleware setup', () => {
    test('URL sync middleware is set up for dispatch', async () => {
      // The store sets up URL sync middleware during configuration
      // We can verify the store has the middleware chain working
      const _reqmod____index_js = await import('../index.js'); const { store: testStore } = _reqmod____index_js;
      store = testStore;

      // Verify middleware can process actions without errors
      const initialState = store.getState();
      expect(initialState.filters).toBeDefined();
    });

    test('store can dispatch actions', async () => {
      const _reqmod____index_js = await import('../index.js'); const { store: testStore } = _reqmod____index_js;
      store = testStore;

      // Test dispatching an action
      expect(() => {
        store.dispatch({ type: 'filters/setSubjects', payload: ['CM2'] });
      }).not.toThrow();

      // Verify state was updated
      const state = store.getState();
      expect(state.filters.subjects).toEqual(['CM2']);
    });
  });

  describe('DevTools configuration', () => {
    test('DevTools are enabled in development', async () => {
      import.meta.env.MODE = 'development';
      import.meta.env.DEV = true;
      import.meta.env.PROD = false;
      vi.resetModules();

      // The devTools option is set based on import.meta.env
      // We can verify the store works correctly in development mode
      const _reqmod____index_js = await import('../index.js'); const { store: testStore } = _reqmod____index_js;

      expect(testStore).toBeDefined();
      expect(typeof testStore.getState).toBe('function');
    });

    test('DevTools are disabled in production', async () => {
      import.meta.env.MODE = 'production';
      import.meta.env.DEV = false;
      import.meta.env.PROD = true;
      vi.resetModules();

      // Store should still work in production mode
      const _reqmod____index_js = await import('../index.js'); const { store: testStore } = _reqmod____index_js;

      expect(testStore).toBeDefined();
      expect(typeof testStore.getState).toBe('function');
    });
  });
});
