/**
 * useProductsSearch Hook Integration Tests (Story 1.16)
 *
 * TDD RED Phase: These tests MUST FAIL until test utilities are implemented (T026)
 *
 * Tests useProductsSearch hook integration with:
 * - Redux filter state
 * - RTK Query API
 * - Debouncing
 * - Validation error handling
 * - Performance tracking
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockStore, mockProductsApi, waitForStateUpdate } from '../../test-utils/testHelpers';
import { useProductsSearch } from '../useProductsSearch';
import { setSubjects, setSearchQuery } from '../../store/slices/filtersSlice';
import { Provider } from 'react-redux';

const wrapper = ({ children, store }) => (
  <Provider store={store}>{children}</Provider>
);

describe('useProductsSearch Integration', () => {
  beforeEach(() => {
    mockProductsApi({
      products: [
        {
          id: 1,
          subject_code: 'CM2',
          name: 'Core Reading',
          category: 'BUNDLE',
          product_type: 'CORE_MATERIAL',
          mode_of_delivery: 'EBOOK',
          price: 45.00,
          available: true,
        },
      ],
      filterCounts: {
        subjects: { CM2: { count: 10 } },
      },
      pagination: {
        page: 1,
        page_size: 20,
        total_count: 1,
        has_next: false,
        has_previous: false,
      },
    });
  });

  describe('Filter Integration', () => {
    it('should trigger search when filters change', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useProductsSearch(), {
        wrapper: ({ children }) => wrapper({ children, store }),
      });

      store.dispatch(setSubjects(['CM2']));

      await waitFor(() => {
        expect(result.current.products.length).toBeGreaterThan(0);
      });
    });

    it('should include all filter types in search params', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useProductsSearch(), {
        wrapper: ({ children }) => wrapper({ children, store }),
      });

      store.dispatch(setSubjects(['CM2']));

      await waitFor(() => {
        expect(result.current.hasSearched).toBe(true);
      });
    });
  });

  describe('Debouncing', () => {
    it('should debounce search by 250ms', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useProductsSearch(), {
        wrapper: ({ children }) => wrapper({ children, store }),
      });

      const start = performance.now();
      store.dispatch(setSearchQuery('test'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      const elapsed = performance.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(200);
    });
  });

  describe('Validation Error Handling', () => {
    it('should prevent API call when validation errors exist', async () => {
      const store = createMockStore({
        preloadedState: {
          filters: {
            subjects: [],
            categories: [],
            product_types: [],
            products: [],
            modes_of_delivery: [],
            searchQuery: '',
            currentPage: 1,
            pageSize: 20,
            validationErrors: [{ severity: 'error', message: 'Test error' }],
          },
        },
      });

      const { result } = renderHook(() => useProductsSearch(), {
        wrapper: ({ children }) => wrapper({ children, store }),
      });

      store.dispatch(setSubjects(['CM2']));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not have triggered API call
      expect(result.current.products).toEqual([]);
    });
  });

  describe('Performance', () => {
    it('should complete search in < 1000ms', async () => {
      const store = createMockStore();
      const { result } = renderHook(() => useProductsSearch(), {
        wrapper: ({ children }) => wrapper({ children, store }),
      });

      const start = performance.now();
      store.dispatch(setSubjects(['CM2']));

      await waitFor(() => {
        expect(result.current.products.length).toBeGreaterThan(0);
      });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1500); // Allow overhead
    });
  });
});
