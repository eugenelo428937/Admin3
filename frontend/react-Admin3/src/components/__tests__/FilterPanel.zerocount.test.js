/**
 * Tests for US2/FR-013: FilterPanel hides zero-count options.
 *
 * The backend now returns zero-count entries in filter_counts (for disjunctive
 * faceting). The frontend FilterPanel must hide options with count === 0
 * so users only see actionable filter choices.
 *
 * T022: FilterPanel hides options with zero count
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import FilterPanel from '../Product/FilterPanel';
import filtersReducer from '../../store/slices/filtersSlice';

// Mock sessionStorage
const mockSessionStorage = {};
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: jest.fn((key) => mockSessionStorage[key] || null),
    setItem: jest.fn((key, value) => { mockSessionStorage[key] = value; }),
    removeItem: jest.fn((key) => { delete mockSessionStorage[key]; }),
  },
  writable: true,
});

// Mock PerformanceTracker used by FilterRegistry
jest.mock('../../utils/PerformanceTracker', () => ({
  __esModule: true,
  default: {
    isSupported: () => false,
    startMeasure: jest.fn(),
    endMeasure: jest.fn(),
    checkBudget: jest.fn(),
  },
}));

const theme = createTheme();

/**
 * Helper to create a Redux store with pre-set filterCounts.
 */
function createStoreWithCounts(filterCounts, activeFilters = {}) {
  return configureStore({
    reducer: {
      filters: filtersReducer,
    },
    preloadedState: {
      filters: {
        subjects: activeFilters.subjects || [],
        categories: activeFilters.categories || [],
        product_types: activeFilters.product_types || [],
        products: activeFilters.products || [],
        modes_of_delivery: activeFilters.modes_of_delivery || [],
        searchQuery: '',
        searchFilterProductIds: [],
        currentPage: 1,
        pageSize: 20,
        isFilterPanelOpen: false,
        appliedFilters: {},
        isLoading: false,
        error: null,
        filterCounts,
        validationErrors: [],
        lastUpdated: null,
      },
    },
  });
}

function renderFilterPanel(store) {
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <FilterPanel />
      </ThemeProvider>
    </Provider>
  );
}

describe('FilterPanel zero-count hiding (T022, FR-013)', () => {
  test('options with count > 0 are rendered', () => {
    const store = createStoreWithCounts({
      subjects: {
        CM2: { count: 2, name: 'CM2' },
        SA1: { count: 1, name: 'SA1' },
      },
      categories: {},
      product_types: {},
      products: {},
      modes_of_delivery: {},
    });

    renderFilterPanel(store);

    // Both subjects should be visible
    expect(screen.getByText('CM2')).toBeInTheDocument();
    expect(screen.getByText('SA1')).toBeInTheDocument();
  });

  test('options with count === 0 are NOT rendered', () => {
    const store = createStoreWithCounts({
      subjects: {
        CM2: { count: 2, name: 'CM2' },
        SA1: { count: 0, name: 'SA1' },
      },
      categories: {
        Material: { count: 3, name: 'Material' },
        Tutorial: { count: 0, name: 'Tutorial' },
      },
      product_types: {},
      products: {},
      modes_of_delivery: {},
    });

    renderFilterPanel(store);

    // CM2 (count 2) should be visible
    expect(screen.getByText('CM2')).toBeInTheDocument();
    // SA1 (count 0) should NOT be visible
    expect(screen.queryByText('SA1')).not.toBeInTheDocument();

    // Material (count 3) should be visible
    expect(screen.getByText('Material')).toBeInTheDocument();
    // Tutorial (count 0) should NOT be visible
    expect(screen.queryByText('Tutorial')).not.toBeInTheDocument();
  });

  test('actively selected filter with zero count IS still rendered', () => {
    // Edge case: if user has selected a filter and its count drops to 0
    // due to other filters, it should still be visible so user can deselect it.
    const store = createStoreWithCounts(
      {
        subjects: {
          CM2: { count: 2, name: 'CM2' },
          SA1: { count: 0, name: 'SA1' },
        },
        categories: {},
        product_types: {},
        products: {},
        modes_of_delivery: {},
      },
      { subjects: ['SA1'] } // SA1 is actively selected
    );

    renderFilterPanel(store);

    // SA1 should be visible because it's actively selected, even though count=0
    expect(screen.getByText('SA1')).toBeInTheDocument();
  });
});
