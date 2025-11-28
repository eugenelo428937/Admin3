/**
 * SearchBox Contract Tests
 *
 * Tests for SearchBox component Redux integration (Search-Only Implementation).
 * All tests follow TDD RED-GREEN-REFACTOR cycle.
 *
 * Test file created: 2025-10-20
 * Updated: 2025-10-21 - Removed dead filter tests, search-only implementation
 * Feature: Search Modal Filter Removal and Simplification
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SearchBox from '../SearchBox';
import filtersReducer from '../../store/slices/filtersSlice';

// Mock searchService to avoid API calls during tests
jest.mock('../../services/searchService', () => ({
  getDefaultSearchData: jest.fn(() => Promise.resolve({
    suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
    suggested_products: [],
    search_info: { query: '', type: 'default' },
    total_count: 0
  })),
  fuzzySearch: jest.fn((query) => Promise.resolve({
    suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
    suggested_products: [],
    search_info: { query, type: 'fuzzy' },
    total_count: 0
  }))
}));

/**
 * Test helper: Create mock Redux store
 *
 * @param {Object} initialState - Initial filter state to merge with defaults
 * @returns {Object} Configured Redux store
 */
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      filters: filtersReducer
    },
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
        isFilterPanelOpen: false,
        isLoading: false,
        error: null,
        filterCounts: {},
        lastUpdated: null,
        appliedFilters: {},
        ...initialState
      }
    }
  });
};

/**
 * Test helper: Render component with Redux provider
 *
 * @param {ReactElement} component - Component to render
 * @param {Object} initialState - Initial Redux state
 * @returns {Object} Render result + Redux store
 */
const renderWithRedux = (component, initialState = {}) => {
  const store = createMockStore(initialState);
  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store
  };
};

describe('SearchBox Redux Integration (Search-Only)', () => {
  /**
   * T001: Contract Test - SearchBox displays search query from Redux state
   *
   * Requirement: FR-001, FR-013 (spec-filter-searching-refinement-20251021)
   * TDD Phase: GREEN (test passes - implementation complete)
   *
   * This test verifies that SearchBox reads search query from Redux
   * using useSelector instead of managing local state with useState.
   *
   * When this test passes, it confirms:
   * - SearchBox uses useSelector to read searchQuery from Redux
   * - Component displays Redux state instead of local state
   * - Single source of truth established (Redux)
   * - Search-only implementation (no filter UI)
   */
  test('T001: displays search query from Redux state', () => {
    // ARRANGE: Redux state has search query
    const initialState = {
      searchQuery: 'mock pack'
    };

    // ACT: Render SearchBox with Redux state
    renderWithRedux(<SearchBox />, initialState);

    // ASSERT: SearchBox displays Redux searchQuery in input field
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput.value).toBe('mock pack');
  });

  /**
   * T003: Contract Test - SearchBox dispatches setSearchQuery on input change
   *
   * Requirement: FR-001, FR-002 (spec-filter-searching-refinement-20251021)
   * TDD Phase: GREEN (test passes - implementation complete)
   *
   * This test verifies that typing in the search input dispatches
   * setSearchQuery action to Redux (with debounce).
   *
   * When this test passes, it confirms:
   * - Search input changes dispatch to Redux
   * - Debounce mechanism works (300ms)
   * - searchQuery state managed in Redux
   * - Search-only implementation (no filter dispatches)
   */
  test('T003: dispatches setSearchQuery when search input changes', async () => {
    // ARRANGE
    const { store } = renderWithRedux(<SearchBox placeholder="Search..." />);
    const searchInput = screen.getByPlaceholderText(/search/i);

    // ACT: Type in search input
    fireEvent.change(searchInput, { target: { value: 'mock pack' } });

    // ASSERT: Redux action dispatched after debounce (300ms)
    await waitFor(() => {
      const state = store.getState();
      expect(state.filters.searchQuery).toBe('mock pack');
    }, { timeout: 500 });
  });

  /**
   * T004: Contract Test - Search query persists across unmount/remount
   *
   * Requirement: FR-013, FR-014 (spec-filter-searching-refinement-20251021)
   * TDD Phase: GREEN (test passes - implementation complete)
   *
   * This test verifies that Redux state persists when SearchBox
   * component unmounts and remounts.
   *
   * When this test passes, it confirms:
   * - Redux state unchanged during unmount/remount
   * - No cleanup that clears search query state
   * - Search query persistence works as expected
   * - Search-only implementation maintains Redux persistence
   */
  test('T004: search query persists across unmount and remount', async () => {
    // ARRANGE: Initial state with search query
    const initialState = {
      searchQuery: 'mock'
    };

    // ACT: Render, verify state, unmount, remount
    const { unmount, store } = renderWithRedux(<SearchBox />, initialState);

    // Verify initial state
    const state1 = store.getState();
    expect(state1.filters.searchQuery).toBe('mock');

    // Unmount component
    unmount();

    // ASSERT: Redux state persists after unmount
    const state2 = store.getState();
    expect(state2.filters.searchQuery).toBe('mock');

    // Remount component with same store
    render(
      <Provider store={store}>
        <SearchBox />
      </Provider>
    );

    // Verify state still persists after remount
    const state3 = store.getState();
    expect(state3.filters.searchQuery).toBe('mock');
  });

  /**
   * T005: Contract Test - SearchBox calls onSearchResults callback with results
   *
   * This test verifies that SearchBox passes search results to parent via callback.
   */
  test('T005: calls onSearchResults callback with results', async () => {
    // ARRANGE: Mock callback and searchService
    const mockOnSearchResults = jest.fn();

    renderWithRedux(<SearchBox onSearchResults={mockOnSearchResults} />);
    const searchInput = screen.getByPlaceholderText(/search/i);

    // ACT: Type query with 3+ characters
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // ASSERT: Callback called with results after debounce (300ms) + API response
    // The mock in jest.mock returns default fuzzy results
    await waitFor(() => {
      expect(mockOnSearchResults).toHaveBeenCalled();
    }, { timeout: 600 });

    // The callback was called - verify it was called with proper arguments
    const callArgs = mockOnSearchResults.mock.calls;
    expect(callArgs.length).toBeGreaterThan(0);
    // Second argument should be the query
    expect(callArgs[callArgs.length - 1][1]).toBe('test');
  });

  /**
   * T006: Contract Test - SearchBox does not call API for short queries
   *
   * This test verifies that queries under 3 characters don't trigger API calls.
   */
  test('T006: does not call API for queries shorter than 3 characters', async () => {
    // ARRANGE
    const mockOnSearchResults = jest.fn();
    const searchService = require('../../services/searchService');
    searchService.fuzzySearch.mockClear();

    renderWithRedux(<SearchBox onSearchResults={mockOnSearchResults} />);
    const searchInput = screen.getByPlaceholderText(/search/i);

    // ACT: Type short query
    fireEvent.change(searchInput, { target: { value: 'ab' } });

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 400));

    // ASSERT: API not called for short queries
    expect(searchService.fuzzySearch).not.toHaveBeenCalled();

    // But callback should still be called with null results
    await waitFor(() => {
      expect(mockOnSearchResults).toHaveBeenCalledWith(null, 'ab');
    });
  });

  /**
   * T007: Contract Test - SearchBox handles API error gracefully
   *
   * This test verifies that search errors are handled and displayed.
   */
  test('T007: handles search API error gracefully', async () => {
    // ARRANGE: Mock API error
    const mockOnSearchResults = jest.fn();
    const searchService = require('../../services/searchService');
    searchService.fuzzySearch.mockRejectedValueOnce(new Error('Network error'));

    renderWithRedux(<SearchBox onSearchResults={mockOnSearchResults} />);
    const searchInput = screen.getByPlaceholderText(/search/i);

    // ACT: Type query that triggers error
    fireEvent.change(searchInput, { target: { value: 'error test' } });

    // ASSERT: Error message displayed
    await waitFor(() => {
      expect(screen.getByText('Search failed. Please try again.')).toBeInTheDocument();
    }, { timeout: 500 });

    // Callback should still be called with fallback results
    expect(mockOnSearchResults).toHaveBeenCalledWith(
      expect.objectContaining({
        search_info: expect.objectContaining({ type: 'fallback' })
      }),
      'error test'
    );
  });

  /**
   * T008: Contract Test - SearchBox calls onShowMatchingProducts on Enter key
   *
   * This test verifies that pressing Enter navigates to products page.
   */
  test('T008: calls onShowMatchingProducts when Enter pressed with results', async () => {
    // ARRANGE
    const mockOnShowMatchingProducts = jest.fn();
    const mockOnSearchResults = jest.fn();
    const searchService = require('../../services/searchService');
    searchService.fuzzySearch.mockResolvedValueOnce({
      suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
      suggested_products: [{ id: 1, name: 'Test Product' }],
      search_info: { query: 'test', type: 'fuzzy' },
      total_count: 1
    });

    renderWithRedux(
      <SearchBox
        onShowMatchingProducts={mockOnShowMatchingProducts}
        onSearchResults={mockOnSearchResults}
      />
    );
    const searchInput = screen.getByPlaceholderText(/search/i);

    // ACT: Type query and wait for search to complete
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Wait for the search callback to be called (indicates search completed)
    await waitFor(() => {
      expect(mockOnSearchResults).toHaveBeenCalled();
    }, { timeout: 600 });

    // Press Enter after results are available
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    // ASSERT: onShowMatchingProducts called
    expect(mockOnShowMatchingProducts).toHaveBeenCalled();
  });

  /**
   * T009: Contract Test - SearchBox does not navigate on Enter without results
   *
   * This test verifies that Enter key does nothing when no results exist.
   */
  test('T009: does not call onShowMatchingProducts when Enter pressed without results', async () => {
    // ARRANGE
    const mockOnShowMatchingProducts = jest.fn();

    renderWithRedux(<SearchBox onShowMatchingProducts={mockOnShowMatchingProducts} />);
    const searchInput = screen.getByPlaceholderText(/search/i);

    // ACT: Press Enter without any search results
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    // ASSERT: onShowMatchingProducts NOT called
    expect(mockOnShowMatchingProducts).not.toHaveBeenCalled();
  });

  /**
   * T010: Contract Test - SearchBox auto-focuses when autoFocus prop is true
   */
  test('T010: auto-focuses input when autoFocus prop is true', () => {
    // ARRANGE & ACT
    renderWithRedux(<SearchBox autoFocus={true} />);

    // ASSERT: Input is focused
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(document.activeElement).toBe(searchInput);
  });

  /**
   * T011: Contract Test - SearchBox does not auto-focus when autoFocus is false
   */
  test('T011: does not auto-focus when autoFocus prop is false', () => {
    // ARRANGE & ACT
    renderWithRedux(<SearchBox autoFocus={false} />);

    // ASSERT: Input is NOT focused
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(document.activeElement).not.toBe(searchInput);
  });

  /**
   * T012: Contract Test - SearchBox reloads results on mount with existing query
   */
  test('T012: reloads search results on mount when query already exists in Redux', async () => {
    // ARRANGE
    const mockOnSearchResults = jest.fn();
    const searchService = require('../../services/searchService');
    searchService.fuzzySearch.mockClear();
    searchService.fuzzySearch.mockResolvedValueOnce({
      suggested_filters: { subjects: [], product_groups: [], variations: [], products: [] },
      suggested_products: [{ id: 1, name: 'Existing Result' }],
      search_info: { query: 'existing', type: 'fuzzy' },
      total_count: 1
    });

    // ACT: Mount with existing search query in Redux
    renderWithRedux(
      <SearchBox onSearchResults={mockOnSearchResults} />,
      { searchQuery: 'existing' }
    );

    // ASSERT: Search is performed on mount
    await waitFor(() => {
      expect(searchService.fuzzySearch).toHaveBeenCalledWith('existing');
    }, { timeout: 500 });
  });

  /**
   * T013: Contract Test - SearchBox displays custom placeholder
   */
  test('T013: displays custom placeholder when provided', () => {
    // ARRANGE & ACT
    renderWithRedux(<SearchBox placeholder="Custom placeholder text" />);

    // ASSERT: Custom placeholder is displayed
    expect(screen.getByPlaceholderText('Custom placeholder text')).toBeInTheDocument();
  });
});
