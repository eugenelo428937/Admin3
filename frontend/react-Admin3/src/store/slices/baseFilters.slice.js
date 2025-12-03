/**
 * Base Filters Module (Story 1.14)
 *
 * Core filter state and basic filter operations.
 * Handles set, toggle, remove, clear, pagination, UI, loading, and utility actions.
 *
 * Contract: specs/007-docs-stories-story/contracts/baseFilters-module-contract.md
 *
 * IMPORTANT: This module does NOT include FilterValidator logic.
 * Validation is handled in the main filtersSlice.js during integration.
 */

/**
 * Base filter initial state
 * Contains all filter values, pagination, UI state, loading states, and metadata
 */
export const baseFiltersInitialState = {
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

/**
 * Base filter reducers
 * Pure reducer functions that update filter state
 * All reducers use Immer draft syntax (Redux Toolkit default)
 */
export const baseFiltersReducers = {
  // ========================================
  // Set Actions (7 reducers)
  // ========================================

  setSubjects: (state, action) => {
    state.subjects = action.payload;
    state.currentPage = 1; // Reset to first page when filters change
    state.lastUpdated = Date.now();
  },

  setCategories: (state, action) => {
    state.categories = action.payload;
    state.currentPage = 1;
    state.lastUpdated = Date.now();
  },

  setProductTypes: (state, action) => {
    state.product_types = action.payload;
    state.currentPage = 1;
    state.lastUpdated = Date.now();
  },

  setProducts: (state, action) => {
    state.products = action.payload;
    state.currentPage = 1;
    state.lastUpdated = Date.now();
  },

  setModesOfDelivery: (state, action) => {
    state.modes_of_delivery = action.payload;
    state.currentPage = 1;
    state.lastUpdated = Date.now();
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

  // ========================================
  // Toggle Actions (5 reducers)
  // ========================================

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
  },

  // ========================================
  // Remove Actions (5 reducers)
  // ========================================

  removeSubjectFilter: (state, action) => {
    const value = action.payload;
    state.subjects = state.subjects.filter(item => item !== value);
    state.currentPage = 1;
    state.lastUpdated = Date.now();
  },

  removeCategoryFilter: (state, action) => {
    const value = action.payload;
    state.categories = state.categories.filter(item => item !== value);
    state.currentPage = 1;
    state.lastUpdated = Date.now();
  },

  removeProductTypeFilter: (state, action) => {
    const value = action.payload;
    state.product_types = state.product_types.filter(item => item !== value);
    state.currentPage = 1;
    state.lastUpdated = Date.now();
  },

  removeProductFilter: (state, action) => {
    const value = action.payload;
    state.products = state.products.filter(item => item !== value);
    state.currentPage = 1;
    state.lastUpdated = Date.now();
  },

  removeModeOfDeliveryFilter: (state, action) => {
    const value = action.payload;
    state.modes_of_delivery = state.modes_of_delivery.filter(item => item !== value);
    state.currentPage = 1;
    state.lastUpdated = Date.now();
  },

  // ========================================
  // Clear Actions (2 reducers)
  // ========================================

  // Clear specific filter type
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
      case 'producttypes': // Support both property names for compatibility
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

  // ========================================
  // Multi-Update (1 reducer)
  // ========================================

  // Multi-filter update action
  setMultipleFilters: (state, action) => {
    const {
      subjects,
      categories,
      product_types,
      products,
      modes_of_delivery,
      searchQuery,
      currentPage,
      pageSize
    } = action.payload;

    // Set array filters
    if (subjects !== undefined) state.subjects = subjects;
    if (categories !== undefined) state.categories = categories;
    if (product_types !== undefined) state.product_types = product_types;
    if (products !== undefined) state.products = products;
    if (modes_of_delivery !== undefined) state.modes_of_delivery = modes_of_delivery;

    // Set string filters (Story 1.16 - URL persistence)
    if (searchQuery !== undefined) state.searchQuery = searchQuery;

    // Set pagination (Story 1.16 - URL persistence)
    if (currentPage !== undefined) {
      state.currentPage = currentPage;
    } else {
      // Reset to page 1 if not explicitly provided
      state.currentPage = 1;
    }
    if (pageSize !== undefined) state.pageSize = pageSize;

    state.lastUpdated = Date.now();
  },

  // ========================================
  // Pagination Actions (2 reducers)
  // ========================================

  setCurrentPage: (state, action) => {
    state.currentPage = action.payload;
  },

  setPageSize: (state, action) => {
    state.pageSize = action.payload;
    state.currentPage = 1; // Reset to first page when page size changes
  },

  // ========================================
  // UI Actions (2 reducers)
  // ========================================

  toggleFilterPanel: (state) => {
    state.isFilterPanelOpen = !state.isFilterPanelOpen;
  },

  setFilterPanelOpen: (state, action) => {
    state.isFilterPanelOpen = action.payload;
  },

  // ========================================
  // Loading/Error Actions (3 reducers)
  // ========================================

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

  // ========================================
  // Utility Actions (4 reducers)
  // ========================================

  // Reset all filters to initial state
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

  // Set filter counts from API response
  setFilterCounts: (state, action) => {
    state.filterCounts = action.payload;
  },

  // Validation actions - for validation error management
  // (Validation logic itself handled in main slice via FilterValidator)
  clearValidationErrors: (state) => {
    state.validationErrors = [];
  },
};
