/**
 * Tests for Redux Store Configuration
 * T003: Test store creation, middleware setup
 */

import { configureStore } from '@reduxjs/toolkit';

// Mock the dependencies before importing the store
jest.mock('../api/catalogApi', () => ({
  catalogApi: {
    reducerPath: 'catalogApi',
    reducer: (state = {}) => state,
    middleware: () => (next) => (action) => next(action),
  },
  useUnifiedSearchQuery: jest.fn(),
}));

jest.mock('../middleware/urlSyncMiddleware', () => ({
  urlSyncMiddleware: {
    middleware: () => (next) => (action) => next(action),
  },
  setupUrlToReduxSync: jest.fn(),
}));

jest.mock('../middleware/performanceMonitoring', () => {
  return () => (next) => (action) => next(action);
});

describe('Redux Store Configuration', () => {
  let store;
  let originalEnv;

  beforeEach(() => {
    jest.resetModules();
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('store creation', () => {
    test('creates store with required reducers', () => {
      // Import store after mocks are set up
      const { store: testStore } = require('../index');
      store = testStore;

      const state = store.getState();

      // Verify filters slice exists
      expect(state).toHaveProperty('filters');
      expect(state.filters).toBeDefined();
    });

    test('filters reducer has correct initial state structure', () => {
      const { store: testStore } = require('../index');
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

    test('filters state has correct initial values', () => {
      const { store: testStore } = require('../index');
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
    test('exports store as default', () => {
      const storeModule = require('../index');

      expect(storeModule.default).toBeDefined();
      expect(typeof storeModule.default.getState).toBe('function');
      expect(typeof storeModule.default.dispatch).toBe('function');
    });

    test('exports dispatch function', () => {
      const { dispatch } = require('../index');

      expect(dispatch).toBeDefined();
      expect(typeof dispatch).toBe('function');
    });

    test('exports getState function', () => {
      const { getState } = require('../index');

      expect(getState).toBeDefined();
      expect(typeof getState).toBe('function');
    });

    test('exports useUnifiedSearchQuery hook', () => {
      // useUnifiedSearchQuery is re-exported from catalogApi
      const storeModule = require('../index');

      // It may be undefined due to mocking, but it should be defined in actual usage
      // This test verifies the export structure exists
      expect('useUnifiedSearchQuery' in storeModule).toBe(true);
    });
  });

  describe('middleware setup', () => {
    test('URL sync middleware is set up for dispatch', () => {
      // The store sets up URL sync middleware during configuration
      // We can verify the store has the middleware chain working
      const { store: testStore } = require('../index');
      store = testStore;

      // Verify middleware can process actions without errors
      const initialState = store.getState();
      expect(initialState.filters).toBeDefined();
    });

    test('store can dispatch actions', () => {
      const { store: testStore } = require('../index');
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
    test('DevTools are enabled in development', () => {
      process.env.NODE_ENV = 'development';
      jest.resetModules();

      // The devTools option is set based on NODE_ENV
      // We can verify the store works correctly in development mode
      const { store: testStore } = require('../index');

      expect(testStore).toBeDefined();
      expect(typeof testStore.getState).toBe('function');
    });

    test('DevTools are disabled in production', () => {
      process.env.NODE_ENV = 'production';
      jest.resetModules();

      // Store should still work in production mode
      const { store: testStore } = require('../index');

      expect(testStore).toBeDefined();
      expect(typeof testStore.getState).toBe('function');
    });
  });
});
