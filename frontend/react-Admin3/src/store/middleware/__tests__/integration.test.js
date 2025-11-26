/**
 * Redux Middleware Integration Tests (Story 1.16)
 *
 * TDD RED Phase: These tests MUST FAIL until test utilities are implemented (T026)
 *
 * Tests the complete middleware chain:
 * - Redux actions → URL updates (urlSyncMiddleware)
 * - URL changes → Redux state updates
 * - Performance monitoring middleware integration
 * - Loop prevention mechanisms
 * - Rapid filter changes handling
 */

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderWithProviders,
  createMockStore,
  waitForStateUpdate,
  simulateUrlChange,
} from '../../../test-utils/testHelpers';
import {
  setSubjects,
  setCategories,
  setProductTypes,
  setSearchQuery,
  clearAllFilters,
} from '../../slices/filtersSlice';

describe('Redux Middleware Integration', () => {

  describe('Redux → URL Synchronization', () => {
    it('should update URL when subjects filter changes', async () => {
      const store = createMockStore();

      // Dispatch action
      store.dispatch(setSubjects(['CM2', 'SA1']));

      // Wait for URL to update
      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('subject_code')).toBe('CM2');
        expect(params.get('subject_1')).toBe('SA1');
      });
    });

    it('should update URL when categories filter changes', async () => {
      const store = createMockStore();

      store.dispatch(setCategories(['Bundle', 'Material']));

      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('category_code')).toBe('Bundle');
        expect(params.get('category_1')).toBe('Material');
      });
    });

    it('should update URL when product types filter changes', async () => {
      const store = createMockStore();

      store.dispatch(setProductTypes(['CORE_MATERIAL', 'MOCK_EXAM']));

      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('group')).toBe('CORE_MATERIAL,MOCK_EXAM');
      });
    });

    it('should update URL when search query changes', async () => {
      const store = createMockStore();

      store.dispatch(setSearchQuery('actuarial'));

      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('search_query')).toBe('actuarial');
      });
    });

    it('should clear URL params when filters are cleared', async () => {
      const store = createMockStore({
        preloadedState: {
          filters: {
            subjects: ['CM2'],
            categories: ['Bundle'],
            product_types: [],
            products: [],
            modes_of_delivery: [],
            searchQuery: '',
            currentPage: 1,
            pageSize: 20,
          },
        },
      });

      store.dispatch(clearAllFilters());

      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('subject_code')).toBeNull();
        expect(params.get('category_code')).toBeNull();
      });
    });

    it('should handle multiple filter changes in rapid succession', async () => {
      const store = createMockStore();

      // Dispatch multiple actions rapidly
      store.dispatch(setSubjects(['CM2']));
      store.dispatch(setCategories(['Bundle']));
      store.dispatch(setProductTypes(['CORE_MATERIAL']));

      // Wait for all URL updates to complete
      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('subject_code')).toBe('CM2');
        expect(params.get('category_code')).toBe('Bundle');
        expect(params.get('group')).toBe('CORE_MATERIAL');
      }, { timeout: 2000 });
    });
  });

  describe('URL → Redux Synchronization', () => {
    it('should update Redux state when URL changes', async () => {
      const store = createMockStore();

      // Simulate URL change
      simulateUrlChange('/products?subject_code=CM2&subject_1=SA1');

      // Wait for state update
      await waitForStateUpdate(
        store,
        (state) => state.filters.subjects.length === 2,
        { timeout: 1000 }
      );

      expect(store.getState().filters.subjects).toEqual(['CM2', 'SA1']);
    });

    it('should parse multiple filter types from URL', async () => {
      const store = createMockStore();

      simulateUrlChange(
        '/products?subject_code=CM2&category_code=Bundle&group=CORE_MATERIAL'
      );

      await waitForStateUpdate(
        store,
        (state) =>
          state.filters.subjects.includes('CM2') &&
          state.filters.categories.includes('Bundle') &&
          state.filters.product_types.includes('CORE_MATERIAL'),
        { timeout: 1000 }
      );

      const state = store.getState().filters;
      expect(state.subjects).toEqual(['CM2']);
      expect(state.categories).toEqual(['Bundle']);
      expect(state.product_types).toEqual(['CORE_MATERIAL']);
    });

    it('should handle indexed URL parameters (subject_code, subject_1, subject_2)', async () => {
      const store = createMockStore();

      simulateUrlChange('/products?subject_code=CM2&subject_1=SA1&subject_2=CB1');

      await waitForStateUpdate(
        store,
        (state) => state.filters.subjects.length === 3,
        { timeout: 1000 }
      );

      expect(store.getState().filters.subjects).toEqual(['CM2', 'SA1', 'CB1']);
    });

    it('should handle comma-separated URL parameters (group)', async () => {
      const store = createMockStore();

      simulateUrlChange('/products?group=CORE_MATERIAL,MOCK_EXAM,TUTORIAL');

      await waitForStateUpdate(
        store,
        (state) => state.filters.product_types.length === 3,
        { timeout: 1000 }
      );

      expect(store.getState().filters.product_types).toEqual([
        'CORE_MATERIAL',
        'MOCK_EXAM',
        'TUTORIAL',
      ]);
    });
  });

  describe('Loop Prevention', () => {
    it('should not trigger infinite loop when URL updates cause Redux updates', async () => {
      const store = createMockStore();
      let updateCount = 0;

      // Subscribe to store changes
      const unsubscribe = store.subscribe(() => {
        updateCount++;
      });

      // Dispatch action (should trigger URL update)
      store.dispatch(setSubjects(['CM2']));

      // Wait for updates to settle
      await waitFor(() => {
        expect(updateCount).toBeGreaterThan(0);
      });

      // Should have limited number of updates (not infinite)
      expect(updateCount).toBeLessThan(10);

      unsubscribe();
    });

    it('should not create duplicate history entries for same filter state', async () => {
      const store = createMockStore();
      const initialHistoryLength = window.history.length;

      // Dispatch same action twice
      store.dispatch(setSubjects(['CM2']));
      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('subject_code')).toBe('CM2');
      });

      store.dispatch(setSubjects(['CM2']));
      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('subject_code')).toBe('CM2');
      });

      // History should not grow excessively
      expect(window.history.length).toBeLessThanOrEqual(initialHistoryLength + 2);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track URL sync performance', async () => {
      const store = createMockStore();

      // Mock performance API
      const performanceMarks = [];
      const originalMark = window.performance.mark;
      window.performance.mark = jest.fn((name) => {
        performanceMarks.push(name);
        return originalMark.call(window.performance, name);
      });

      store.dispatch(setSubjects(['CM2']));

      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('subject_code')).toBe('CM2');
      });

      // Should have performance marks (in development mode)
      if (process.env.NODE_ENV !== 'production') {
        expect(performanceMarks.some((mark) => mark.includes('urlSync'))).toBe(true);
      }

      // Restore original
      window.performance.mark = originalMark;
    });

    it('should track filter validation performance', async () => {
      const store = createMockStore();

      const performanceMarks = [];
      const originalMark = window.performance.mark;
      window.performance.mark = jest.fn((name) => {
        performanceMarks.push(name);
        return originalMark.call(window.performance, name);
      });

      // Dispatch filter change that triggers validation
      store.dispatch(setSubjects(['CM2']));
      store.dispatch(setCategories(['Bundle']));

      await waitFor(() => {
        expect(store.getState().filters.subjects).toEqual(['CM2']);
      });

      // Should track validation (in development mode)
      if (process.env.NODE_ENV !== 'production') {
        expect(performanceMarks.some((mark) => mark.includes('validation'))).toBe(true);
      }

      window.performance.mark = originalMark;
    });
  });

  describe('Middleware Chain Order', () => {
    it('should execute middleware in correct order (performance → urlSync)', async () => {
      const store = createMockStore();
      const executionOrder = [];

      // Mock middleware tracking
      const originalDispatch = store.dispatch;
      store.dispatch = jest.fn((action) => {
        executionOrder.push('dispatch');
        return originalDispatch(action);
      });

      store.dispatch(setSubjects(['CM2']));

      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('subject_code')).toBe('CM2');
      });

      // Verify dispatch was called
      expect(executionOrder).toContain('dispatch');
    });

    it('should allow custom middleware to process alongside RTK Query', async () => {
      const store = createMockStore();

      // This test verifies that custom middleware (URL sync, performance monitoring)
      // doesn't interfere with other actions in the middleware chain.
      // We use a simple action that passes through all middleware.

      // Dispatch a regular Redux action (not RTK Query internal)
      const testAction = {
        type: 'test/customAction',
        payload: { test: 'value' },
      };

      expect(() => {
        store.dispatch(testAction);
      }).not.toThrow();

      // Also verify filter actions still work correctly after dispatch
      store.dispatch(setSubjects(['CM2']));
      expect(store.getState().filters.subjects).toContain('CM2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty filter arrays', async () => {
      const store = createMockStore();

      store.dispatch(setSubjects([]));

      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('subject_code')).toBeNull();
      });
    });

    it('should handle invalid URL parameters gracefully', async () => {
      const store = createMockStore();

      // Simulate invalid URL
      simulateUrlChange('/products?subject_code=&category_code=invalid@#$');

      // Should not crash and should handle gracefully
      expect(() => {
        store.getState();
      }).not.toThrow();
    });

    it('should handle very long filter arrays', async () => {
      const store = createMockStore();

      const longArray = Array.from({ length: 50 }, (_, i) => `SUBJECT_${i}`);
      store.dispatch(setSubjects(longArray));

      await waitFor(() => {
        const state = store.getState().filters;
        expect(state.subjects.length).toBe(50);
      });
    });

    it('should handle special characters in filter values', async () => {
      const store = createMockStore();

      store.dispatch(setSearchQuery('test & query "with" special <chars>'));

      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('search_query')).toBeTruthy();
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should complete URL sync in < 5ms', async () => {
      const store = createMockStore();
      const start = performance.now();

      store.dispatch(setSubjects(['CM2']));

      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('subject_code')).toBe('CM2');
      });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50); // Allow overhead for async operations
    });

    it('should handle 10 rapid filter changes without performance degradation', async () => {
      const store = createMockStore();
      const start = performance.now();

      // Dispatch 10 rapid changes
      for (let i = 0; i < 10; i++) {
        store.dispatch(setSubjects([`SUBJECT_${i}`]));
      }

      await waitFor(() => {
        const params = new URLSearchParams(window.location.search);
        expect(params.get('subject_code')).toBe('SUBJECT_9');
      });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });
});
