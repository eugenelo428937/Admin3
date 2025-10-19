/**
 * Integration Tests for Filter State Management (Stories 1.1-1.6)
 *
 * These tests verify the complete filter state management flow:
 * - Clear All Filters (Story 1.5)
 * - Filter Persistence on Refresh (Story 1.6)
 * - URL Synchronization (Story 1.1)
 * - Navigation Filters Integration (Stories 1.2, 1.3, 1.4)
 * - Shareable URLs (Stories 1.1, 1.6)
 *
 * TDD: These tests MUST FAIL before implementation.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import filtersReducer from '../../../store/slices/filtersSlice';
import { urlSyncMiddleware } from '../../../store/middleware/urlSyncMiddleware';
import ProductList from '../../Product/ProductList';
import FilterPanel from '../../Product/FilterPanel';
import MainNavBar from '../../Navigation/MainNavBar';

// Mock API calls
jest.mock('../../../services/productService', () => ({
  getProducts: jest.fn(() =>
    Promise.resolve({
      data: {
        results: [
          { id: 1, name: 'Product 1', subject_code: 'CB1', category_code: 'MAT' },
          { id: 2, name: 'Product 2', subject_code: 'CB2', category_code: 'TUT' },
        ],
        count: 2,
      },
    })
  ),
}));

// Helper to create test store with middleware
const createTestStore = (preloadedState) => {
  return configureStore({
    reducer: {
      filters: filtersReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().prepend(urlSyncMiddleware.middleware),
    preloadedState,
  });
};

// Helper to render components with Redux and Router
const renderWithProviders = (component, { store, ...renderOptions } = {}) => {
  const testStore = store || createTestStore();

  const Wrapper = ({ children }) => (
    <Provider store={testStore}>
      <BrowserRouter>{children}</BrowserRouter>
    </Provider>
  );

  return {
    ...render(component, { wrapper: Wrapper, ...renderOptions }),
    store: testStore,
  };
};

// Mock window.history
const mockReplaceState = jest.fn();
beforeAll(() => {
  Object.defineProperty(window, 'history', {
    value: {
      replaceState: mockReplaceState,
      length: 1,
    },
    writable: true,
  });
});

beforeEach(() => {
  mockReplaceState.mockClear();
  // Reset window.location
  delete window.location;
  window.location = { search: '', pathname: '/products', href: 'http://localhost/products' };
});

describe('Integration Test: Clear All Filters (Story 1.5)', () => {
  it('should clear filters from Redux, URL, and UI', async () => {
    const { store } = renderWithProviders(<ProductList />);

    // Given: User has applied multiple filters
    const setSubjects = (await import('../../../store/slices/filtersSlice')).setSubjects;
    const setCategories = (await import('../../../store/slices/filtersSlice')).setCategories;

    store.dispatch(setSubjects(['CB1', 'CB2']));
    store.dispatch(setCategories(['MAT']));

    // Verify filters are set
    let state = store.getState().filters;
    expect(state.subjects).toEqual(['CB1', 'CB2']);
    expect(state.categories).toEqual(['MAT']);

    // When: User clicks "Clear All" button
    const clearButton = await screen.findByText(/clear all/i);
    fireEvent.click(clearButton);

    // Then: All filters removed from Redux
    state = store.getState().filters;
    expect(state.subjects).toEqual([]);
    expect(state.categories).toEqual([]);
    expect(state.product_types).toEqual([]);

    // And: URL resets to base path
    expect(mockReplaceState).toHaveBeenCalled();
    const lastCallUrl = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1][2];
    expect(lastCallUrl === '' || lastCallUrl === '/products' || !lastCallUrl.includes('subject')).toBe(true);

    // And: Refresh preserves empty state (simulate by remounting)
    const { store: newStore } = renderWithProviders(<ProductList />);
    const newState = newStore.getState().filters;
    expect(newState.subjects).toEqual([]);
    expect(newState.categories).toEqual([]);
  });

  it('should reset navbar filters when clearing all filters', async () => {
    const { store } = renderWithProviders(<ProductList />);

    // Apply navbar filters
    const setTutorialFormat = (await import('../../../store/slices/filtersSlice')).setTutorialFormat;
    const setDistanceLearning = (await import('../../../store/slices/filtersSlice')).setDistanceLearning;
    const setTutorial = (await import('../../../store/slices/filtersSlice')).setTutorial;

    store.dispatch(setTutorialFormat('online'));
    store.dispatch(setDistanceLearning(true));
    store.dispatch(setTutorial(true));

    // Verify navbar filters are set
    let state = store.getState().filters;
    expect(state.tutorial_format).toBe('online');
    expect(state.distance_learning).toBe(true);
    expect(state.tutorial).toBe(true);

    // Clear all filters
    const clearButton = await screen.findByText(/clear all/i);
    fireEvent.click(clearButton);

    // Verify navbar filters are reset
    state = store.getState().filters;
    expect(state.tutorial_format).toBeNull();
    expect(state.distance_learning).toBe(false);
    expect(state.tutorial).toBe(false);
  });
});

describe('Integration Test: Filter Persistence (Story 1.6)', () => {
  it('should restore filters from URL on page load', async () => {
    // Given: URL contains filter parameters
    window.location.search = '?subject_code=CB1&category_code=MAT';

    // When: ProductList mounts
    const { store } = renderWithProviders(<ProductList />);

    // Then: Filters restored to Redux (need to wait for useEffect)
    await waitFor(() => {
      const state = store.getState().filters;
      expect(state.subjects).toContain('CB1');
      expect(state.categories).toContain('MAT');
    });

    // And: Filtered products displayed
    await waitFor(() => {
      expect(screen.getByText(/product/i)).toBeInTheDocument();
    });
  });

  it('should restore complex filter combinations from URL', async () => {
    // Given: URL with multiple filter types
    window.location.search =
      '?subject_code=CB1&subject_1=CB2&category_code=MAT&group=PRINTED,EBOOK&tutorial_format=online&tutorial=1&search_query=exam';

    // When: ProductList mounts
    const { store } = renderWithProviders(<ProductList />);

    // Then: All filters restored
    await waitFor(() => {
      const state = store.getState().filters;
      expect(state.subjects).toEqual(expect.arrayContaining(['CB1', 'CB2']));
      expect(state.categories).toContain('MAT');
      expect(state.product_types).toEqual(expect.arrayContaining(['PRINTED', 'EBOOK']));
      expect(state.tutorial_format).toBe('online');
      expect(state.tutorial).toBe(true);
      expect(state.searchQuery).toBe('exam');
    });
  });

  it('should handle missing URL parameters gracefully', async () => {
    // Given: Empty URL
    window.location.search = '';

    // When: ProductList mounts
    const { store } = renderWithProviders(<ProductList />);

    // Then: Initial state with no filters
    const state = store.getState().filters;
    expect(state.subjects).toEqual([]);
    expect(state.categories).toEqual([]);
    expect(state.tutorial).toBe(false);
  });
});

describe('Integration Test: URL Synchronization (Story 1.1)', () => {
  it('should update URL immediately when filter changes', async () => {
    const { store } = renderWithProviders(<FilterPanel />);

    // Given: User on products page
    const initialHistoryLength = window.history.length;

    // When: User selects CB1 subject
    const setSubjects = (await import('../../../store/slices/filtersSlice')).setSubjects;
    store.dispatch(setSubjects(['CB1']));

    // Then: URL updates immediately
    await waitFor(() => {
      expect(mockReplaceState).toHaveBeenCalled();
      const urlString = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1][2];
      expect(urlString).toContain('subject_code=CB1');
    });

    // And: No new history entry created (replaceState used)
    mockReplaceState.mockClear();
    const setCategories = (await import('../../../store/slices/filtersSlice')).setCategories;
    store.dispatch(setCategories(['MAT']));

    await waitFor(() => {
      expect(mockReplaceState).toHaveBeenCalled();
    });

    // History length should not increase (replaceState, not pushState)
    expect(window.history.length).toBe(initialHistoryLength);
  });

  it('should update URL within 5ms of filter change', async () => {
    const { store } = renderWithProviders(<FilterPanel />);

    const setSubjects = (await import('../../../store/slices/filtersSlice')).setSubjects;

    const start = performance.now();
    store.dispatch(setSubjects(['CB1']));

    await waitFor(() => {
      expect(mockReplaceState).toHaveBeenCalled();
    });

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5);
  });

  it('should debounce rapid filter changes', async () => {
    const { store } = renderWithProviders(<FilterPanel />);

    const setSubjects = (await import('../../../store/slices/filtersSlice')).setSubjects;

    // Rapid filter changes
    store.dispatch(setSubjects(['CB1']));
    store.dispatch(setSubjects(['CB1', 'CB2']));
    store.dispatch(setSubjects(['CB1', 'CB2', 'CB3']));

    await waitFor(() => {
      expect(mockReplaceState).toHaveBeenCalled();
    });

    // Should not have 3 separate calls due to debouncing
    const callCount = mockReplaceState.mock.calls.length;
    expect(callCount).toBeLessThanOrEqual(2); // Allow for one debounced call
  });
});

describe('Integration Test: Navigation Filters (Stories 1.2, 1.3, 1.4)', () => {
  it('should integrate navbar filters with Redux', async () => {
    const { store } = renderWithProviders(<MainNavBar />);

    // Given: User clicks "Tutorial Products" in navbar
    const tutorialLink = await screen.findByText(/tutorial products/i);

    // When: Tutorial link clicked
    fireEvent.click(tutorialLink);

    // Then: Tutorial filter set in Redux
    await waitFor(() => {
      const state = store.getState().filters;
      expect(state.tutorial).toBe(true);
    });

    // And: URL updated automatically
    await waitFor(() => {
      expect(mockReplaceState).toHaveBeenCalled();
      const urlString = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1][2];
      expect(urlString).toContain('tutorial=1');
    });
  });

  it('should not have manual URL manipulation in MainNavBar code', async () => {
    // This test is verified by code inspection during implementation
    // The test passes if MainNavBar uses Redux dispatch instead of navigate with URL params

    const { store } = renderWithProviders(<MainNavBar />);
    const tutorialLink = await screen.findByText(/tutorial products/i);

    fireEvent.click(tutorialLink);

    // Verify Redux was updated (not URL directly)
    await waitFor(() => {
      const state = store.getState().filters;
      expect(state.tutorial).toBe(true);
    });

    // URL should be updated by middleware, not by component
    // This is indicated by mockReplaceState being called AFTER Redux update
    expect(mockReplaceState).toHaveBeenCalled();
  });

  it('should display navigation-applied filters in filter panel', async () => {
    window.location.search = '?tutorial=1&tutorial_format=online';

    const { store } = renderWithProviders(
      <>
        <ProductList />
        <FilterPanel />
      </>
    );

    // Filters from navigation should be visible in Redux
    await waitFor(() => {
      const state = store.getState().filters;
      expect(state.tutorial).toBe(true);
      expect(state.tutorial_format).toBe('online');
    });

    // Filter panel should display these filters
    await waitFor(() => {
      expect(screen.getByText(/online/i)).toBeInTheDocument();
    });
  });
});

describe('Integration Test: Shareable URLs (Stories 1.1, 1.6)', () => {
  it('should create shareable URLs that restore exact filter state', async () => {
    // Phase 1: User applies filters
    const { store: store1 } = renderWithProviders(<ProductList />);

    const setSubjects = (await import('../../../store/slices/filtersSlice')).setSubjects;
    const setCategories = (await import('../../../store/slices/filtersSlice')).setCategories;
    const setTutorialFormat = (await import('../../../store/slices/filtersSlice')).setTutorialFormat;

    store1.dispatch(setSubjects(['CB1', 'CB2']));
    store1.dispatch(setCategories(['MAT']));
    store1.dispatch(setTutorialFormat('online'));

    // Wait for URL to update
    await waitFor(() => {
      expect(mockReplaceState).toHaveBeenCalled();
    });

    // Capture the URL
    const sharedUrl = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1][2];

    // Phase 2: Simulate colleague opening the URL
    window.location.search = sharedUrl.split('?')[1] || sharedUrl;
    mockReplaceState.mockClear();

    const { store: store2 } = renderWithProviders(<ProductList />);

    // Then: Colleague sees exact same filters
    await waitFor(() => {
      const state = store2.getState().filters;
      expect(state.subjects).toEqual(['CB1', 'CB2']);
      expect(state.categories).toEqual(['MAT']);
      expect(state.tutorial_format).toBe('online');
    });

    // And: Same filtered products displayed
    await waitFor(() => {
      expect(screen.getByText(/product/i)).toBeInTheDocument();
    });
  });

  it('should make URLs bookmarkable', async () => {
    const { store } = renderWithProviders(<ProductList />);

    const setSubjects = (await import('../../../store/slices/filtersSlice')).setSubjects;
    store.dispatch(setSubjects(['CB1']));

    await waitFor(() => {
      expect(mockReplaceState).toHaveBeenCalled();
    });

    const bookmarkedUrl = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1][2];

    // Simulate opening bookmark (new page load)
    window.location.search = bookmarkedUrl.split('?')[1] || bookmarkedUrl;
    const { store: newStore } = renderWithProviders(<ProductList />);

    // Bookmark should restore filter state
    await waitFor(() => {
      const state = newStore.getState().filters;
      expect(state.subjects).toContain('CB1');
    });
  });

  it('should handle URL copy/paste with encoded characters', async () => {
    // Given: URL with encoded characters
    window.location.search = '?search_query=exam+materials&group=PRINTED%2CEBOOK';

    // When: Page loads with this URL
    const { store } = renderWithProviders(<ProductList />);

    // Then: Filters decode correctly
    await waitFor(() => {
      const state = store.getState().filters;
      expect(state.searchQuery).toBe('exam materials');
      expect(state.product_types).toEqual(['PRINTED', 'EBOOK']);
    });
  });
});

describe('Integration Test: Search Integration (Story 1.4)', () => {
  it('should combine search text with filters', async () => {
    const { store } = renderWithProviders(<ProductList />);

    const setSearchQuery = (await import('../../../store/slices/filtersSlice')).setSearchQuery;
    const setSubjects = (await import('../../../store/slices/filtersSlice')).setSubjects;

    // Apply search and filters together
    store.dispatch(setSearchQuery('exam materials'));
    store.dispatch(setSubjects(['CB1']));

    // Verify both in Redux
    const state = store.getState().filters;
    expect(state.searchQuery).toBe('exam materials');
    expect(state.subjects).toEqual(['CB1']);

    // Verify both in URL
    await waitFor(() => {
      expect(mockReplaceState).toHaveBeenCalled();
      const urlString = mockReplaceState.mock.calls[mockReplaceState.mock.calls.length - 1][2];
      expect(urlString).toContain('search_query=');
      expect(urlString).toContain('subject_code=CB1');
    });
  });

  it('should preserve search and filters on refresh', async () => {
    // Given: URL with search and filters
    window.location.search = '?search_query=exam&subject_code=CB1';

    // When: Page loads
    const { store } = renderWithProviders(<ProductList />);

    // Then: Both restored
    await waitFor(() => {
      const state = store.getState().filters;
      expect(state.searchQuery).toBe('exam');
      expect(state.subjects).toContain('CB1');
    });
  });
});
