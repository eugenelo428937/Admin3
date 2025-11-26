/**
 * Tests for useProductsSearch Hook (Story 1.4 - Hook Consolidation)
 *
 * Verifies that the hook correctly reads navbar filters from Redux state
 * instead of URL parsing, establishing single source of truth.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import useProductsSearch from '../useProductsSearch';
import filtersReducer from '../../store/slices/filtersSlice';

// Mock the RTK Query API
let mockTriggerSearch;
let mockSearchResult;

jest.mock('../../store/api/catalogApi', () => ({
  useLazyUnifiedSearchQuery: jest.fn(),
}));

// Get the mocked module
const { useLazyUnifiedSearchQuery } = require('../../store/api/catalogApi');

/**
 * Create a test Redux store with initial state
 */
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      filters: filtersReducer,
    },
    preloadedState: {
      filters: {
        subjects: [],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        searchQuery: '',
        tutorial_format: null,
        distance_learning: false,
        tutorial: false,
        currentPage: 1,
        pageSize: 20,
        isFilterPanelOpen: false,
        appliedFilters: {},
        isLoading: false,
        error: null,
        lastUpdated: null,
        filterCounts: {
          subjects: {},
          categories: {},
          product_types: {},
          products: {},
          modes_of_delivery: {},
        },
        ...initialState,
      },
    },
  });
};

/**
 * Wrapper component for Redux Provider
 */
const createWrapper = (store) => {
  return ({ children }) => <Provider store={store}>{children}</Provider>;
};

describe('useProductsSearch - Navbar Filter Consolidation (Story 1.4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize mock functions
    mockTriggerSearch = jest.fn().mockResolvedValue({
      unwrap: () => Promise.resolve({
        products: [],
        filterCounts: {},
        pagination: {
          page: 1,
          page_size: 20,
          total_count: 0,
          has_next: false,
          has_previous: false,
        },
      }),
    });

    mockSearchResult = {
      data: {
        products: [],
        filterCounts: {},
        pagination: {
          page: 1,
          page_size: 20,
          total_count: 0,
          has_next: false,
          has_previous: false,
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    };

    // Mock the return value of useLazyUnifiedSearchQuery
    useLazyUnifiedSearchQuery.mockReturnValue([mockTriggerSearch, mockSearchResult]);
  });

  it('should read tutorial filter from Redux state (not URL)', async () => {
    // Arrange: Create store with tutorial filter set to true
    const store = createTestStore({ tutorial: true });
    const wrapper = createWrapper(store);

    // Act: Render hook
    const { result } = renderHook(() => useProductsSearch({ autoSearch: false }), {
      wrapper,
    });

    // Manually trigger search
    await result.current.search();

    // Assert: Verify triggerSearch was called with tutorial from Redux
    await waitFor(() => {
      expect(mockTriggerSearch).toHaveBeenCalled();
      const callArgs = mockTriggerSearch.mock.calls[0][0];
      expect(callArgs.navbarFilters).toBeDefined();
      expect(callArgs.navbarFilters.tutorial).toBe('1');
    });
  });

  it('should read tutorial_format filter from Redux state (not URL)', async () => {
    // Arrange: Create store with tutorial_format set to 'online'
    const store = createTestStore({ tutorial_format: 'online' });
    const wrapper = createWrapper(store);

    // Act: Render hook
    const { result } = renderHook(() => useProductsSearch({ autoSearch: false }), {
      wrapper,
    });

    // Manually trigger search
    await result.current.search();

    // Assert: Verify triggerSearch was called with tutorial_format from Redux
    await waitFor(() => {
      expect(mockTriggerSearch).toHaveBeenCalled();
      const callArgs = mockTriggerSearch.mock.calls[0][0];
      expect(callArgs.navbarFilters).toBeDefined();
      expect(callArgs.navbarFilters.tutorial_format).toBe('online');
    });
  });

  it('should read distance_learning filter from Redux state (not URL)', async () => {
    // Arrange: Create store with distance_learning set to true
    const store = createTestStore({ distance_learning: true });
    const wrapper = createWrapper(store);

    // Act: Render hook
    const { result } = renderHook(() => useProductsSearch({ autoSearch: false }), {
      wrapper,
    });

    // Manually trigger search
    await result.current.search();

    // Assert: Verify triggerSearch was called with distance_learning from Redux
    await waitFor(() => {
      expect(mockTriggerSearch).toHaveBeenCalled();
      const callArgs = mockTriggerSearch.mock.calls[0][0];
      expect(callArgs.navbarFilters).toBeDefined();
      expect(callArgs.navbarFilters.distance_learning).toBe('1');
    });
  });

  it('should include all navbar filters in API call', async () => {
    // Arrange: Create store with all navbar filters set
    const store = createTestStore({
      tutorial: true,
      tutorial_format: 'hybrid',
      distance_learning: true,
    });
    const wrapper = createWrapper(store);

    // Act: Render hook
    const { result } = renderHook(() => useProductsSearch({ autoSearch: false }), {
      wrapper,
    });

    // Manually trigger search
    await result.current.search();

    // Assert: Verify all navbar filters are included in API call
    await waitFor(() => {
      expect(mockTriggerSearch).toHaveBeenCalled();
      const callArgs = mockTriggerSearch.mock.calls[0][0];

      expect(callArgs.navbarFilters).toBeDefined();
      expect(callArgs.navbarFilters.tutorial).toBe('1');
      expect(callArgs.navbarFilters.tutorial_format).toBe('hybrid');
      expect(callArgs.navbarFilters.distance_learning).toBe('1');
    });
  });

  it('should not include navbar filters when they are false/null', async () => {
    // Arrange: Create store with all navbar filters disabled/null
    const store = createTestStore({
      tutorial: false,
      tutorial_format: null,
      distance_learning: false,
    });
    const wrapper = createWrapper(store);

    // Act: Render hook
    const { result } = renderHook(() => useProductsSearch({ autoSearch: false }), {
      wrapper,
    });

    // Manually trigger search
    await result.current.search();

    // Assert: Verify navbar filters are not included when disabled
    await waitFor(() => {
      expect(mockTriggerSearch).toHaveBeenCalled();
      const callArgs = mockTriggerSearch.mock.calls[0][0];

      expect(callArgs.navbarFilters).toBeDefined();
      // Should be empty object or not have these properties
      expect(callArgs.navbarFilters.tutorial).toBeUndefined();
      expect(callArgs.navbarFilters.tutorial_format).toBeUndefined();
      expect(callArgs.navbarFilters.distance_learning).toBeUndefined();
    });
  });

  it('should update search when navbar filters change in Redux', async () => {
    // Arrange: Create store with initial state
    const store = createTestStore({
      tutorial: false,
      tutorial_format: null,
      distance_learning: false,
    });
    const wrapper = createWrapper(store);

    // Act: Render hook with autoSearch enabled
    const { result, rerender } = renderHook(() => useProductsSearch({ autoSearch: true }), {
      wrapper,
    });

    // Update Redux state to enable tutorial filter
    store.dispatch({ type: 'filters/setTutorial', payload: true });

    // Force re-render to trigger effect
    rerender();

    // Assert: Verify search is triggered with new filter
    await waitFor(() => {
      expect(mockTriggerSearch).toHaveBeenCalled();
      // Find the most recent call
      const lastCallArgs = mockTriggerSearch.mock.calls[mockTriggerSearch.mock.calls.length - 1][0];
      expect(lastCallArgs.navbarFilters.tutorial).toBe('1');
    }, { timeout: 3000 });
  });

  it('should include navbar filters along with other filters in search params', async () => {
    // Arrange: Create store with both regular filters and navbar filters
    const store = createTestStore({
      subjects: ['CM2', 'SA1'],
      categories: ['Bundle'],
      tutorial: true,
      tutorial_format: 'online',
    });
    const wrapper = createWrapper(store);

    // Act: Render hook
    const { result } = renderHook(() => useProductsSearch({ autoSearch: false }), {
      wrapper,
    });

    // Manually trigger search
    await result.current.search();

    // Assert: Verify both regular filters and navbar filters are included
    await waitFor(() => {
      expect(mockTriggerSearch).toHaveBeenCalled();
      const callArgs = mockTriggerSearch.mock.calls[0][0];

      // Regular filters
      expect(callArgs.filters).toBeDefined();
      expect(callArgs.filters.subjects).toEqual(['CM2', 'SA1']);
      expect(callArgs.filters.categories).toEqual(['Bundle']);

      // Navbar filters
      expect(callArgs.navbarFilters).toBeDefined();
      expect(callArgs.navbarFilters.tutorial).toBe('1');
      expect(callArgs.navbarFilters.tutorial_format).toBe('online');
    });
  });
});

describe('useProductsSearch - Loading/Success/Error States (T051)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Initialize mock functions with default success response
    mockTriggerSearch = jest.fn().mockResolvedValue({
      unwrap: () => Promise.resolve({
        products: [
          { id: 1, name: 'Test Product', subject_code: 'CM2' }
        ],
        filterCounts: {},
        pagination: {
          page: 1,
          page_size: 20,
          total_count: 1,
          has_next: false,
          has_previous: false,
        },
      }),
    });

    mockSearchResult = {
      data: {
        products: [],
        filterCounts: {},
        pagination: {
          page: 1,
          page_size: 20,
          total_count: 0,
          has_next: false,
          has_previous: false,
        },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    };

    useLazyUnifiedSearchQuery.mockReturnValue([mockTriggerSearch, mockSearchResult]);
  });

  describe('Loading State', () => {
    it('should indicate loading state when search is in progress', async () => {
      // Set up mock to indicate loading
      mockSearchResult = {
        ...mockSearchResult,
        isLoading: true,
        isFetching: true,
      };
      useLazyUnifiedSearchQuery.mockReturnValue([mockTriggerSearch, mockSearchResult]);

      const store = createTestStore();
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => useProductsSearch({ autoSearch: false }), {
        wrapper,
      });

      // Hook should expose loading state
      expect(result.current.isLoading || result.current.isFetching).toBe(true);
    });

    it('should clear loading state after search completes', async () => {
      const store = createTestStore();
      const wrapper = createWrapper(store);

      const { result, rerender } = renderHook(() => useProductsSearch({ autoSearch: false }), {
        wrapper,
      });

      // Trigger search
      await result.current.search();

      // Update mock to simulate completed search
      mockSearchResult = {
        ...mockSearchResult,
        isLoading: false,
        isFetching: false,
        data: {
          products: [{ id: 1, name: 'Test Product' }],
          filterCounts: {},
          pagination: { page: 1, page_size: 20, total_count: 1, has_next: false, has_previous: false },
        },
      };
      useLazyUnifiedSearchQuery.mockReturnValue([mockTriggerSearch, mockSearchResult]);

      rerender();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Success State', () => {
    it('should return products after successful search', async () => {
      mockSearchResult = {
        ...mockSearchResult,
        isLoading: false,
        isFetching: false,
        data: {
          products: [
            { id: 1, name: 'CM2 Study Material', subject_code: 'CM2' },
            { id: 2, name: 'SA1 Core Reading', subject_code: 'SA1' },
          ],
          filterCounts: { subjects: { CM2: 1, SA1: 1 } },
          pagination: {
            page: 1,
            page_size: 20,
            total_count: 2,
            has_next: false,
            has_previous: false,
          },
        },
      };
      useLazyUnifiedSearchQuery.mockReturnValue([mockTriggerSearch, mockSearchResult]);

      const store = createTestStore();
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => useProductsSearch({ autoSearch: false }), {
        wrapper,
      });

      // Trigger search
      await result.current.search();

      await waitFor(() => {
        expect(mockTriggerSearch).toHaveBeenCalled();
      });

      // Hook should expose products from successful search
      expect(result.current.products).toBeDefined();
    });

    it('should return filter counts after successful search', async () => {
      mockSearchResult = {
        ...mockSearchResult,
        isLoading: false,
        data: {
          products: [],
          filterCounts: {
            subjects: { CM2: 5, SA1: 3 },
            categories: { Bundle: 2 },
          },
          pagination: { page: 1, page_size: 20, total_count: 8, has_next: false, has_previous: false },
        },
      };
      useLazyUnifiedSearchQuery.mockReturnValue([mockTriggerSearch, mockSearchResult]);

      const store = createTestStore();
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => useProductsSearch({ autoSearch: false }), {
        wrapper,
      });

      await result.current.search();

      await waitFor(() => {
        expect(mockTriggerSearch).toHaveBeenCalled();
      });

      // Hook should expose filter counts
      expect(result.current.filterCounts).toBeDefined();
    });

    it('should return pagination info after successful search', async () => {
      mockSearchResult = {
        ...mockSearchResult,
        isLoading: false,
        data: {
          products: Array(20).fill({ id: 1, name: 'Product' }),
          filterCounts: {},
          pagination: {
            page: 1,
            page_size: 20,
            total_count: 100,
            has_next: true,
            has_previous: false,
          },
        },
      };
      useLazyUnifiedSearchQuery.mockReturnValue([mockTriggerSearch, mockSearchResult]);

      const store = createTestStore();
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => useProductsSearch({ autoSearch: false }), {
        wrapper,
      });

      await result.current.search();

      await waitFor(() => {
        expect(mockTriggerSearch).toHaveBeenCalled();
      });

      // Hook should expose pagination
      expect(result.current.pagination).toBeDefined();
    });
  });

  describe('Error State', () => {
    it('should indicate error state when search fails', async () => {
      mockSearchResult = {
        ...mockSearchResult,
        isLoading: false,
        isFetching: false,
        isError: true,
        error: { message: 'Network error' },
        data: null,
      };
      useLazyUnifiedSearchQuery.mockReturnValue([mockTriggerSearch, mockSearchResult]);

      const store = createTestStore();
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => useProductsSearch({ autoSearch: false }), {
        wrapper,
      });

      // Hook exposes error as string/null, not isError boolean
      expect(result.current.error).toBeTruthy();
    });

    it('should handle API rejection gracefully', async () => {
      // Mock triggerSearch to reject
      mockTriggerSearch = jest.fn().mockResolvedValue({
        unwrap: () => Promise.reject(new Error('API Error')),
      });
      useLazyUnifiedSearchQuery.mockReturnValue([mockTriggerSearch, mockSearchResult]);

      const store = createTestStore();
      const wrapper = createWrapper(store);

      // Hook should not throw during render even with potential errors
      expect(() => {
        renderHook(() => useProductsSearch({ autoSearch: false }), {
          wrapper,
        });
      }).not.toThrow();
    });

    it('should reflect error state from query result', async () => {
      // When query has error, hook should expose it
      mockSearchResult = {
        ...mockSearchResult,
        isError: true,
        error: { message: 'Query error' },
        data: null,
      };
      useLazyUnifiedSearchQuery.mockReturnValue([mockTriggerSearch, mockSearchResult]);

      const store = createTestStore();
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => useProductsSearch({ autoSearch: false }), {
        wrapper,
      });

      // Hook should expose error from query result
      expect(result.current.error).toBeTruthy();

      // Products should still be accessible (as empty array) even during error
      expect(Array.isArray(result.current.products)).toBe(true);
    });

    it('should return empty products array on error', async () => {
      mockSearchResult = {
        ...mockSearchResult,
        isError: true,
        error: { message: 'Server error' },
        data: null,
      };
      useLazyUnifiedSearchQuery.mockReturnValue([mockTriggerSearch, mockSearchResult]);

      const store = createTestStore();
      const wrapper = createWrapper(store);

      const { result } = renderHook(() => useProductsSearch({ autoSearch: false }), {
        wrapper,
      });

      // Products should be empty array (not undefined) on error
      expect(Array.isArray(result.current.products)).toBe(true);
      expect(result.current.products.length).toBe(0);
    });
  });

  describe('Auto Search Behavior', () => {
    it('should automatically search when autoSearch is true', async () => {
      const store = createTestStore({ subjects: ['CM2'] });
      const wrapper = createWrapper(store);

      renderHook(() => useProductsSearch({ autoSearch: true }), {
        wrapper,
      });

      // Should trigger search automatically
      await waitFor(() => {
        expect(mockTriggerSearch).toHaveBeenCalled();
      });
    });

    it('should not automatically search when autoSearch is false', async () => {
      const store = createTestStore({ subjects: ['CM2'] });
      const wrapper = createWrapper(store);

      renderHook(() => useProductsSearch({ autoSearch: false }), {
        wrapper,
      });

      // Should NOT trigger search automatically
      expect(mockTriggerSearch).not.toHaveBeenCalled();
    });
  });
});
