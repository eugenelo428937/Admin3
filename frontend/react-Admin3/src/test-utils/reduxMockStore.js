import { configureStore } from '@reduxjs/toolkit';
import filtersReducer from '../store/slices/filtersSlice';

/**
 * Create a mock Redux store for testing
 * @param {Object} preloadedState - Initial state for the store
 * @returns {Object} Configured Redux store
 */
export const createMockStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      filters: filtersReducer,
      // Add more reducers here as needed
    },
    preloadedState,
  });
};

/**
 * Default mock filter state for testing
 */
export const mockFiltersState = {
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
    filterCounts: {
      subjects: {},
      categories: {},
      product_types: {},
      products: {},
      modes_of_delivery: {},
    },
  },
};

/**
 * Create a store with filters pre-populated
 * @param {Object} filterOverrides - Override default filter values
 * @returns {Object} Configured Redux store with filters
 */
export const createStoreWithFilters = (filterOverrides = {}) => {
  return createMockStore({
    filters: {
      ...mockFiltersState.filters,
      ...filterOverrides,
    },
  });
};

/**
 * Helper to extract actions dispatched during a test
 * @param {Object} store - Redux store
 * @returns {Array} Array of dispatched actions
 */
export const getDispatchedActions = (store) => {
  const actions = [];
  const originalDispatch = store.dispatch;
  
  store.dispatch = (action) => {
    actions.push(action);
    return originalDispatch(action);
  };
  
  return actions;
};
