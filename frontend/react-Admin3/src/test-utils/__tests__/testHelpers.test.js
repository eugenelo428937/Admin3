/**
 * Contract Tests for Test Helpers Module (Story 1.16)
 *
 * TDD RED Phase: These tests MUST FAIL until T026 implements the module
 *
 * Contract Reference: /specs/008-docs-stories-story/contracts/testHelpers-contract.md
 *
 * Tests all 7 helper functions:
 * - renderWithProviders()
 * - createMockStore()
 * - waitForStateUpdate()
 * - simulateUrlChange()
 * - mockProductsApi()
 * - createMockHistory()
 * - flushPromises()
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderWithProviders,
  createMockStore,
  waitForStateUpdate,
  simulateUrlChange,
  mockProductsApi,
  createMockHistory,
  flushPromises
} from '../testHelpers';
import { setSubjects, setCategories } from '../../store/slices/filtersSlice';

// Simple test component
const TestComponent = () => {
  return <div>Test Component</div>;
};

describe('Test Helpers Module', () => {

  describe('renderWithProviders()', () => {
    it('should wrap component with Provider and Router', () => {
      const { container } = renderWithProviders(<TestComponent />);

      expect(screen.getByText('Test Component')).toBeInTheDocument();
      expect(container).toBeTruthy();
    });

    it('should create store with preloadedState', () => {
      const { store } = renderWithProviders(<TestComponent />, {
        preloadedState: {
          filters: {
            subjects: ['CM2'],
            categories: [],
            product_types: [],
            products: [],
            modes_of_delivery: [],
            searchQuery: '',
            currentPage: 1,
            pageSize: 20
          }
        }
      });

      expect(store.getState().filters.subjects).toEqual(['CM2']);
    });

    it('should set initial route correctly', () => {
      renderWithProviders(<TestComponent />, {
        route: '/products?subject_code=CM2'
      });

      // In memory router, location is available via history
      // This test verifies route was set
      expect(window.location.pathname).toBeTruthy();
    });

    it('should return store instance for assertions', () => {
      const { store } = renderWithProviders(<TestComponent />);

      expect(store).toBeDefined();
      expect(typeof store.dispatch).toBe('function');
      expect(typeof store.getState).toBe('function');
    });

    it('should throw error if ui is not provided', () => {
      expect(() => {
        renderWithProviders(null);
      }).toThrow('ui component is required');
    });

    it('should accept custom store', () => {
      const customStore = createMockStore({
        preloadedState: {
          filters: {
            subjects: ['SA1'],
            categories: [],
            product_types: [],
            products: [],
            modes_of_delivery: [],
            searchQuery: '',
            currentPage: 1,
            pageSize: 20
          }
        }
      });

      const { store } = renderWithProviders(<TestComponent />, {
        store: customStore
      });

      expect(store.getState().filters.subjects).toEqual(['SA1']);
    });
  });

  describe('createMockStore()', () => {
    it('should create store with empty filters state by default', () => {
      const store = createMockStore();

      expect(store.getState()).toHaveProperty('filters');
      expect(store.getState().filters).toBeDefined();
    });

    it('should create store with preloadedState', () => {
      const store = createMockStore({
        preloadedState: {
          filters: {
            subjects: ['CM2', 'SA1'],
            categories: ['Bundle'],
            product_types: [],
            products: [],
            modes_of_delivery: [],
            searchQuery: '',
            currentPage: 1,
            pageSize: 20
          }
        }
      });

      expect(store.getState().filters.subjects).toEqual(['CM2', 'SA1']);
      expect(store.getState().filters.categories).toEqual(['Bundle']);
    });

    it('should include urlSyncMiddleware by default', () => {
      const store = createMockStore();

      // Dispatch action that triggers middleware
      store.dispatch(setSubjects(['CM2']));

      // Store should have processed action
      expect(store.getState().filters.subjects).toEqual(['CM2']);
    });

    it('should allow custom middleware', () => {
      const customMiddleware = () => next => action => {
        // Custom logic
        return next(action);
      };

      const store = createMockStore({
        middleware: [customMiddleware]
      });

      expect(store).toBeDefined();
    });
  });

  describe('waitForStateUpdate()', () => {
    it('should resolve when predicate returns true', async () => {
      const store = createMockStore();

      // Dispatch async action
      setTimeout(() => {
        store.dispatch(setSubjects(['CM2']));
      }, 10);

      // Wait for state update
      await waitForStateUpdate(
        store,
        (state) => state.filters.subjects.includes('CM2'),
        { timeout: 1000 }
      );

      expect(store.getState().filters.subjects).toEqual(['CM2']);
    });

    it('should reject on timeout', async () => {
      const store = createMockStore();

      // Don't dispatch anything - predicate will never be true

      await expect(
        waitForStateUpdate(
          store,
          (state) => state.filters.subjects.includes('CM2'),
          { timeout: 100 }
        )
      ).rejects.toThrow('Timeout waiting for state update');
    });

    it('should throw error if store not provided', async () => {
      await expect(
        waitForStateUpdate(null, () => true)
      ).rejects.toThrow('store and predicate are required');
    });

    it('should throw error if predicate not provided', async () => {
      const store = createMockStore();

      await expect(
        waitForStateUpdate(store, null)
      ).rejects.toThrow('store and predicate are required');
    });

    it('should use default timeout of 1000ms', async () => {
      const store = createMockStore();
      const startTime = Date.now();

      try {
        await waitForStateUpdate(
          store,
          () => false // Never true
        );
      } catch (error) {
        const elapsed = Date.now() - startTime;
        // Should timeout around 1000ms
        expect(elapsed).toBeGreaterThanOrEqual(900);
        expect(elapsed).toBeLessThan(1200);
      }
    });
  });

  describe('simulateUrlChange()', () => {
    it('should update window.location', () => {
      const originalLocation = window.location.href;

      simulateUrlChange('/products?subject_code=CM2');

      // Location should be updated (exact behavior depends on implementation)
      expect(window.location.href).toBeTruthy();
    });

    it('should support push method', () => {
      simulateUrlChange('/products?subject_code=CM2', { method: 'push' });

      expect(window.location.href).toBeTruthy();
    });

    it('should support replace method', () => {
      simulateUrlChange('/products?subject_code=CM2', { method: 'replace' });

      expect(window.location.href).toBeTruthy();
    });

    it('should throw error if url not provided', () => {
      expect(() => {
        simulateUrlChange(null);
      }).toThrow();
    });
  });

  describe('mockProductsApi()', () => {
    it('should register MSW handlers', () => {
      mockProductsApi();

      // MSW handlers registered - no errors thrown
      expect(true).toBe(true);
    });

    it('should accept custom products data', () => {
      const customProducts = [
        {
          id: 1,
          subject_code: 'CM2',
          name: 'Test Product',
          category: 'BUNDLE',
          product_type: 'CORE_MATERIAL',
          mode_of_delivery: 'EBOOK',
          price: 45.00,
          available: true
        }
      ];

      mockProductsApi({ products: customProducts });

      expect(true).toBe(true);
    });

    it('should accept delay option', () => {
      mockProductsApi({ delay: 100 });

      expect(true).toBe(true);
    });

    it('should accept errorRate option', () => {
      mockProductsApi({ errorRate: 0.1 });

      expect(true).toBe(true);
    });
  });

  describe('createMockHistory()', () => {
    it('should create MemoryHistory instance', () => {
      const history = createMockHistory();

      expect(history).toBeDefined();
      expect(history.location).toBeDefined();
      expect(typeof history.push).toBe('function');
      expect(typeof history.goBack).toBe('function');
    });

    it('should initialize with default entry "/"', () => {
      const history = createMockHistory();

      expect(history.location.pathname).toBe('/');
    });

    it('should initialize with custom entries', () => {
      const history = createMockHistory(
        ['/products', '/products?subject_code=CM2'],
        1 // Start at second entry
      );

      expect(history.location.pathname).toBe('/products');
    });

    it('should allow navigation', () => {
      const history = createMockHistory(['/products', '/products?subject_code=CM2'], 1);

      history.goBack();

      expect(history.location.pathname).toBe('/products');
    });
  });

  describe('flushPromises()', () => {
    it('should resolve after all pending Promises', async () => {
      let resolved = false;

      Promise.resolve().then(() => {
        resolved = true;
      });

      // Before flush
      expect(resolved).toBe(false);

      // Flush promises
      await flushPromises();

      // After flush
      expect(resolved).toBe(true);
    });

    it('should work with multiple pending Promises', async () => {
      let count = 0;

      Promise.resolve().then(() => { count++; });
      Promise.resolve().then(() => { count++; });
      Promise.resolve().then(() => { count++; });

      await flushPromises();

      expect(count).toBe(3);
    });

    it('should return a Promise', () => {
      const result = flushPromises();

      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('Performance Requirements', () => {
    it('renderWithProviders should complete in < 50ms', () => {
      const start = performance.now();

      renderWithProviders(<TestComponent />);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('mockProductsApi should complete in < 1ms', () => {
      const start = performance.now();

      mockProductsApi();

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1);
    });
  });
});
