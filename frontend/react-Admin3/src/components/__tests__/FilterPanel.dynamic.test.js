import { vi } from 'vitest';
/**
 * Tests for US5/T046: FilterPanel renders sections from backend config.
 *
 * Verifies that FilterPanel renders filter sections dynamically from
 * the FilterRegistry (which is populated by backend config), including
 * correct labels and display order.
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

function createStoreWithCounts(filterCounts) {
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

describe('FilterPanel dynamic rendering (T046)', () => {
  afterEach(() => {
    // Restore default registrations after each test by re-importing
    FilterRegistry.clear();
    vi.resetModules();
  });

  test('renders filter sections using registry labels', () => {
    // Set up registry with backend-style config
    FilterRegistry.registerFromBackend({
      'Subjects': {
        filter_key: 'subjects',
        label: 'Subject',
        display_order: 0,
        type: 'subject',
        allow_multiple: true,
        collapsible: true,
        default_open: true,
        filter_groups: [],
      },
      'Categories': {
        filter_key: 'categories',
        label: 'Category',
        display_order: 1,
        type: 'filter_group',
        allow_multiple: true,
        collapsible: true,
        default_open: false,
        filter_groups: [],
      },
    });

    const store = createStoreWithCounts({
      subjects: {
        CM2: { count: 3, name: 'CM2' },
      },
      categories: {
        Material: { count: 5, name: 'Material' },
      },
      product_types: {},
      products: {},
      modes_of_delivery: {},
    });

    renderFilterPanel(store);

    // FilterPanel should render sections with the registry's pluralLabel
    expect(screen.getByText('Subjects')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
  });

  test('renders sections in display_order sequence', () => {
    // Register with explicit ordering: categories (1) before subjects (2)
    FilterRegistry.registerFromBackend({
      'Subjects': {
        filter_key: 'subjects',
        label: 'Subject',
        display_order: 2,
        type: 'subject',
        allow_multiple: true,
        collapsible: true,
        default_open: true,
        filter_groups: [],
      },
      'Categories': {
        filter_key: 'categories',
        label: 'Category',
        display_order: 1,
        type: 'filter_group',
        allow_multiple: true,
        collapsible: true,
        default_open: false,
        filter_groups: [],
      },
    });

    const store = createStoreWithCounts({
      subjects: {
        CM2: { count: 3, name: 'CM2' },
      },
      categories: {
        Material: { count: 5, name: 'Material' },
      },
      product_types: {},
      products: {},
      modes_of_delivery: {},
    });

    renderFilterPanel(store);

    // Both should be present (order is tested by DOM position)
    const categoriesEl = screen.getByText('Categories');
    const subjectsEl = screen.getByText('Subjects');
    expect(categoriesEl).toBeInTheDocument();
    expect(subjectsEl).toBeInTheDocument();

    // Categories should appear before Subjects in the DOM
    // (since it has lower display_order)
    const allAccordionLabels = screen.getAllByRole('button')
      .map(el => el.textContent)
      .filter(text => text === 'Categories' || text === 'Subjects');

    // Categories first due to display_order: 1 < 2
    expect(allAccordionLabels.indexOf('Categories'))
      .toBeLessThan(allAccordionLabels.indexOf('Subjects'));
  });
});
