/**
 * Filters Redux Slice
 *
 * Manages all filtering state including subjects, categories, products, etc.
 * Includes special navigation behaviors for menu interactions.
 * Includes filter validation logic to prevent invalid filter combinations.
 */

import { createSlice, createSelector } from '@reduxjs/toolkit';
import FilterValidator from '../filters/filterValidator';

const initialState = {
  // Filter values - arrays to support multiple selections
  subjects: [],
  categories: [],
  product_types: [],
  products: [],
  modes_of_delivery: [],

  // Search query
  searchQuery: '',

  // Search filter ESSP IDs (from fuzzy search - Issue #2 fix)
  // Stores ExamSessionSubjectProduct.id values (e.g., 2946, 2947, ...) NOT product.id
  // This ensures we only show the specific ESSPs from fuzzy search (e.g., CB1 only)
  searchFilterProductIds: [], // Name kept for compatibility, but stores ESSP IDs

  // Pagination
  currentPage: 1,
  pageSize: 20,

  // UI state
  isFilterPanelOpen: false,
  appliedFilters: {}, // Cache of currently applied filters

  // Loading states
  isLoading: false,
  error: null,

  // Filter counts from API responses
  filterCounts: {
    subjects: {},
    categories: {},
    product_types: {},
    products: {},
    modes_of_delivery: {}
  },

  // Validation errors for filter combinations (Story 1.12)
  validationErrors: [],

  // Last updated timestamp for cache management
  lastUpdated: null,
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    // Basic filter actions
    setSubjects: (state, action) => {
      state.subjects = action.payload;
      state.currentPage = 1; // Reset to first page when filters change
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },

    setCategories: (state, action) => {
      state.categories = action.payload;
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },

    setProductTypes: (state, action) => {
      state.product_types = action.payload;
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },

    setProducts: (state, action) => {
      state.products = action.payload;
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },

    setModesOfDelivery: (state, action) => {
      state.modes_of_delivery = action.payload;
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },
    
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
      state.currentPage = 1;
      state.lastUpdated = Date.now();
    },

    // Issue #2 Fix: Set ESSP IDs from fuzzy search
    // Receives ExamSessionSubjectProduct.id values (e.g., [2946, 2947, ...])
    // NOT product.id values - this ensures we only filter to the specific ESSPs returned
    setSearchFilterProductIds: (state, action) => {
      state.searchFilterProductIds = action.payload;
      state.currentPage = 1;
      state.lastUpdated = Date.now();
    },

    // Multi-filter update action
    setMultipleFilters: (state, action) => {
      const { subjects, categories, product_types, products, modes_of_delivery } = action.payload;

      if (subjects !== undefined) state.subjects = subjects;
      if (categories !== undefined) state.categories = categories;
      if (product_types !== undefined) state.product_types = product_types;
      if (products !== undefined) state.products = products;
      if (modes_of_delivery !== undefined) state.modes_of_delivery = modes_of_delivery;

      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },
    
    // Toggle filter actions (for checkboxes)
    toggleSubjectFilter: (state, action) => {
      const value = action.payload;
      const index = state.subjects.indexOf(value);
      if (index === -1) {
        state.subjects.push(value);
      } else {
        state.subjects.splice(index, 1);
      }
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },

    toggleCategoryFilter: (state, action) => {
      const value = action.payload;
      const index = state.categories.indexOf(value);
      if (index === -1) {
        state.categories.push(value);
      } else {
        state.categories.splice(index, 1);
      }
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },

    toggleProductTypeFilter: (state, action) => {
      const value = action.payload;
      const index = state.product_types.indexOf(value);
      if (index === -1) {
        state.product_types.push(value);
      } else {
        state.product_types.splice(index, 1);
      }
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },

    toggleProductFilter: (state, action) => {
      const value = action.payload;
      const index = state.products.indexOf(value);
      if (index === -1) {
        state.products.push(value);
      } else {
        state.products.splice(index, 1);
      }
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },

    toggleModeOfDeliveryFilter: (state, action) => {
      const value = action.payload;
      const index = state.modes_of_delivery.indexOf(value);
      if (index === -1) {
        state.modes_of_delivery.push(value);
      } else {
        state.modes_of_delivery.splice(index, 1);
      }
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },
    
    // Remove filter actions (for individual filter removal)
    removeSubjectFilter: (state, action) => {
      const value = action.payload;
      state.subjects = state.subjects.filter(item => item !== value);
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },

    removeCategoryFilter: (state, action) => {
      const value = action.payload;
      state.categories = state.categories.filter(item => item !== value);
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },

    removeProductTypeFilter: (state, action) => {
      const value = action.payload;
      state.product_types = state.product_types.filter(item => item !== value);
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },

    removeProductFilter: (state, action) => {
      const value = action.payload;
      state.products = state.products.filter(item => item !== value);
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },

    removeModeOfDeliveryFilter: (state, action) => {
      const value = action.payload;
      state.modes_of_delivery = state.modes_of_delivery.filter(item => item !== value);
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },
    
    // Clear filter type actions
    clearFilterType: (state, action) => {
      const filterType = action.payload;
      switch (filterType) {
        case 'subjects':
          state.subjects = [];
          break;
        case 'categories':
          state.categories = [];
          break;
        case 'product_types':
        case 'productTypes': // Support both property names for compatibility
          state.product_types = [];
          break;
        case 'products':
          state.products = [];
          break;
        case 'modes_of_delivery':
        case 'modesOfDelivery': // Support both property names for compatibility
          state.modes_of_delivery = [];
          break;
      }
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },
    
    // Clear all filters
    clearAllFilters: (state) => {
      state.subjects = [];
      state.categories = [];
      state.product_types = [];
      state.products = [];
      state.modes_of_delivery = [];
      state.searchQuery = '';
      state.searchFilterProductIds = [];
      state.validationErrors = []; // Clear validation errors when clearing all filters
      state.currentPage = 1;
      state.lastUpdated = Date.now();
    },

    // Validation actions (Story 1.12)
    validateFilters: (state) => {
      const errors = FilterValidator.validate(state);
      state.validationErrors = errors;
    },

    clearValidationErrors: (state) => {
      state.validationErrors = [];
    },
    
    // Set filter counts from API response
    setFilterCounts: (state, action) => {
      state.filterCounts = action.payload;
    },
    
    // Navigation menu special behaviors
    navSelectSubject: (state, action) => {
      // Clear existing subjects, then set new subject
      state.subjects = [action.payload];
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },

    navViewAllProducts: (state) => {
      // Clear all filters except subjects
      state.products = [];
      state.categories = [];
      state.product_types = [];
      state.modes_of_delivery = [];
      state.searchQuery = '';
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },

    navSelectProductGroup: (state, action) => {
      // Clear all except subjects, then filter by Product Type
      state.products = [];
      state.categories = [];
      state.product_types = [action.payload];
      state.modes_of_delivery = [];
      state.searchQuery = '';
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },

    navSelectProduct: (state, action) => {
      // Clear all except subjects, then filter by Product
      state.categories = [];
      state.product_types = [];
      state.products = [action.payload];
      state.modes_of_delivery = [];
      state.searchQuery = '';
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },

    navSelectModeOfDelivery: (state, action) => {
      // Clear all except subjects, then filter by Mode of Delivery
      state.categories = [];
      state.product_types = [];
      state.products = [];
      state.modes_of_delivery = [action.payload];
      state.searchQuery = '';
      state.currentPage = 1;
      state.lastUpdated = Date.now();
      // Auto-validate after filter change (Story 1.12)
      state.validationErrors = FilterValidator.validate(state);
    },
    
    
    // Pagination actions
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    
    setPageSize: (state, action) => {
      state.pageSize = action.payload;
      state.currentPage = 1; // Reset to first page when page size changes
    },
    
    // UI actions
    toggleFilterPanel: (state) => {
      state.isFilterPanelOpen = !state.isFilterPanelOpen;
    },
    
    setFilterPanelOpen: (state, action) => {
      state.isFilterPanelOpen = action.payload;
    },
    
    // Loading and error states
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    // Reset all filters
    resetFilters: (state) => {
      state.subjects = [];
      state.categories = [];
      state.product_types = [];
      state.products = [];
      state.modes_of_delivery = [];
      state.searchQuery = '';
      state.searchFilterProductIds = [];
      state.currentPage = 1;
      state.error = null;
      state.lastUpdated = Date.now();
    },
    
    // Apply filters - used to cache current filter state
    applyFilters: (state) => {
      state.appliedFilters = {
        subjects: [...state.subjects],
        categories: [...state.categories],
        product_types: [...state.product_types],
        products: [...state.products],
        modes_of_delivery: [...state.modes_of_delivery],
        searchQuery: state.searchQuery,
      };
      state.lastUpdated = Date.now();
    },
  },
});

// Export actions
export const {
  setSubjects,
  setCategories,
  setProductTypes,
  setProducts,
  setModesOfDelivery,
  setSearchQuery,
  setSearchFilterProductIds,
  setMultipleFilters,
  toggleSubjectFilter,
  toggleCategoryFilter,
  toggleProductTypeFilter,
  toggleProductFilter,
  toggleModeOfDeliveryFilter,
  removeSubjectFilter,
  removeCategoryFilter,
  removeProductTypeFilter,
  removeProductFilter,
  removeModeOfDeliveryFilter,
  clearFilterType,
  clearAllFilters,
  setFilterCounts,
  navSelectSubject,
  navViewAllProducts,
  navSelectProductGroup,
  navSelectProduct,
  navSelectModeOfDelivery,
  setCurrentPage,
  setPageSize,
  toggleFilterPanel,
  setFilterPanelOpen,
  setLoading,
  setError,
  clearError,
  resetFilters,
  applyFilters,
  validateFilters,
  clearValidationErrors,
} = filtersSlice.actions;

// Selectors
export const selectFilters = createSelector(
  [(state) => state.filters],
  (filters) => ({
    subjects: filters.subjects,
    categories: filters.categories,
    product_types: filters.product_types,
    products: filters.products,
    modes_of_delivery: filters.modes_of_delivery,
  })
);

export const selectSearchQuery = (state) => state.filters.searchQuery;
export const selectSearchFilterProductIds = (state) => state.filters.searchFilterProductIds;
export const selectCurrentPage = (state) => state.filters.currentPage;
export const selectPageSize = (state) => state.filters.pageSize;
export const selectIsFilterPanelOpen = (state) => state.filters.isFilterPanelOpen;
export const selectIsLoading = (state) => state.filters.isLoading;
export const selectError = (state) => state.filters.error;
export const selectAppliedFilters = (state) => state.filters.appliedFilters;
export const selectLastUpdated = (state) => state.filters.lastUpdated;
export const selectFilterCounts = (state) => state.filters.filterCounts;

// Validation selectors (Story 1.12)
export const selectValidationErrors = (state) => state.filters.validationErrors;
export const selectHasValidationErrors = (state) =>
  state.filters.validationErrors.some(error => error.severity === 'error');

// Complex selectors
export const selectHasActiveFilters = createSelector(
  [selectFilters, selectSearchQuery],
  (filters, searchQuery) => (
    filters.subjects.length > 0 ||
    filters.categories.length > 0 ||
    filters.product_types.length > 0 ||
    filters.products.length > 0 ||
    filters.modes_of_delivery.length > 0 ||
    searchQuery.trim().length > 0
  )
);

export const selectActiveFilterCount = createSelector(
  [
    selectFilters,
    selectSearchQuery
  ],
  (filters, searchQuery) => {
    let count = 0;
    count += filters.subjects.length;
    count += filters.categories.length;
    count += filters.product_types.length;
    count += filters.products.length;
    count += filters.modes_of_delivery.length;
    if (searchQuery.trim().length > 0) count += 1;

    return count;
  }
);

// Export the reducer
export default filtersSlice.reducer;