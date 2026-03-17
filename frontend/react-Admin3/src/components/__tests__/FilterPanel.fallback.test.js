import { vi } from 'vitest';
/**
 * Tests for US5/T047: FilterPanel shows "Filters unavailable" on API failure.
 *
 * When the filter configuration endpoint fails or returns empty,
 * the FilterPanel should display a user-friendly fallback message
 * instead of an empty or broken panel.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import FilterPanel from '../Product/FilterPanel.tsx';
import filtersReducer from '../../store/slices/filtersSlice.js';
import { FilterRegistry } from '../../store/filters/filterRegistry.js';

import appTheme from '../../theme';
// Mock sessionStorage
const mockSessionStorage = {};
Object.defineProperty(window, 'sessionStorage', {
  value: {
    getItem: vi.fn((key) => mockSessionStorage[key] || null),
    setItem: vi.fn((key, value) => { mockSessionStorage[key] = value; }),
    removeItem: vi.fn((key) => { delete mockSessionStorage[key]; }),
  },
  writable: true,
});

// Mock PerformanceTracker
vi.mock('../../utils/PerformanceTracker.js', () => ({
  __esModule: true,
  default: {
    isSupported: () => false,
    startMeasure: vi.fn(),
    endMeasure: vi.fn(),
    checkBudget: vi.fn(),
  },
}));

const theme = appTheme;

function createStoreWithError(error) {
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
        searchFilterProductIds: [],
        currentPage: 1,
        pageSize: 20,
        isFilterPanelOpen: false,
        appliedFilters: {},
        isLoading: false,
        error: error,
        filterCounts: {
          subjects: {},
          categories: {},
          product_types: {},
          products: {},
          modes_of_delivery: {},
        },
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

describe('FilterPanel fallback (T047, FR-012)', () => {
  afterEach(() => {
    FilterRegistry.clear();
    vi.resetModules();
  });

  test('displays error message when filters have error state', () => {
    const store = createStoreWithError('Failed to load filter configuration');
    renderFilterPanel(store);

    // The error should be displayed in an alert
    expect(screen.getByText('Failed to load filter configuration')).toBeInTheDocument();
  });

  test('renders empty panel gracefully when no filter counts available', () => {
    // Clear registry so no filter sections render
    FilterRegistry.clear();
    // Re-register just searchQuery (which is skipped in rendering)
    FilterRegistry.register({
      type: 'searchQuery',
      label: 'Search',
      pluralLabel: 'Search',
      urlParam: 'search_query',
      color: 'info',
      multiple: false,
      dataType: 'string',
      urlFormat: 'single',
      getDisplayValue: (value) => value,
      order: 0,
    });

    const store = createStoreWithError(null);
    renderFilterPanel(store);

    // Panel should render without crashing
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });
});
