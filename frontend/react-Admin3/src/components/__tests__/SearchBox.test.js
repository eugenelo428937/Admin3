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
});
