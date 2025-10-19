/**
 * URL Sync Middleware (Stories 1.1, 1.6)
 *
 * Provides bidirectional synchronization between Redux filter state and browser URL:
 * - Redux → URL: Automatically update URL when filter actions are dispatched
 * - URL → Redux: Parse URL parameters and restore filter state
 *
 * Features:
 * - Multiple URL formats: indexed, comma-separated, boolean
 * - Loop prevention to avoid infinite Redux ↔ URL cycles
 * - Backward compatibility with legacy parameter names
 * - Performance optimized (< 5ms URL updates)
 */

import { createListenerMiddleware } from '@reduxjs/toolkit';

/**
 * URL Parameter Mapping Configuration
 *
 * Defines how Redux state fields map to URL query parameters
 */
const URL_PARAM_MAPPING = {
  subjects: {
    reduxField: 'subjects',
    urlParam: 'subject_code',
    format: 'indexed',        // subject_code, subject_1, subject_2
    type: 'array'
  },
  categories: {
    reduxField: 'categories',
    urlParam: 'category_code',
    format: 'indexed',        // category_code, category_1, category_2
    type: 'array'
  },
  product_types: {
    reduxField: 'product_types',
    urlParam: 'group',        // Legacy name for backward compatibility
    format: 'comma-separated', // group=PRINTED,EBOOK
    type: 'array'
  },
  products: {
    reduxField: 'products',
    urlParam: 'product',
    format: 'comma-separated', // product=PROD1,PROD2
    type: 'array'
  },
  modes_of_delivery: {
    reduxField: 'modes_of_delivery',
    urlParam: 'mode_of_delivery',
    format: 'comma-separated',
    type: 'array'
  },
  tutorial_format: {
    reduxField: 'tutorial_format',
    urlParam: 'tutorial_format',
    format: 'single',
    type: 'string',
    validValues: ['online', 'in_person', 'hybrid']
  },
  distance_learning: {
    reduxField: 'distance_learning',
    urlParam: 'distance_learning',
    format: 'boolean',        // '1' or absent
    type: 'boolean'
  },
  tutorial: {
    reduxField: 'tutorial',
    urlParam: 'tutorial',
    format: 'boolean',        // '1' or absent
    type: 'boolean'
  },
  searchQuery: {
    reduxField: 'searchQuery',
    urlParam: 'search_query',
    format: 'single',
    type: 'string'
  }
};

/**
 * Parse URL parameters to Redux filter state
 *
 * Converts URLSearchParams into a partial FilterState object
 * Supports multiple URL formats for backward compatibility
 *
 * @param {URLSearchParams} params - URL query parameters
 * @returns {Object} Partial FilterState object
 */
export const parseUrlToFilters = (params) => {
  const filters = {
    subjects: [],
    categories: [],
    product_types: [],
    products: [],
    modes_of_delivery: [],
    tutorial_format: null,
    distance_learning: false,
    tutorial: false,
    searchQuery: ''
  };

  // Parse indexed parameters (subject_code, subject_1, subject_2, etc.)
  const parseIndexedParams = (baseParam, indexedBase) => {
    const values = [];

    // Get base parameter (e.g., subject_code)
    const baseValue = params.get(baseParam);
    if (baseValue) {
      values.push(baseValue);
    }

    // Get indexed parameters (e.g., subject_1, subject_2)
    // Note: indexed params use shortened base (subject not subject_code)
    let index = 1;
    let indexedValue;
    while ((indexedValue = params.get(`${indexedBase}_${index}`)) !== null) {
      values.push(indexedValue);
      index++;
    }

    return values;
  };

  // Parse comma-separated parameters (group=PRINTED,EBOOK)
  const parseCommaSeparatedParam = (param) => {
    const value = params.get(param);
    if (!value) return [];

    return value.split(',').map(v => v.trim()).filter(v => v.length > 0);
  };

  // Parse boolean parameters ('1' = true, absent = false)
  const parseBooleanParam = (param) => {
    return params.get(param) === '1';
  };

  // Parse subjects (indexed format: subject_code, subject_1, subject_2)
  filters.subjects = parseIndexedParams('subject_code', 'subject');

  // Parse categories (indexed format: category_code, category_1, category_2)
  filters.categories = parseIndexedParams('category_code', 'category');

  // Parse product types (comma-separated, legacy name 'group')
  filters.product_types = parseCommaSeparatedParam('group');

  // Parse products (comma-separated)
  filters.products = parseCommaSeparatedParam('product');

  // Parse modes of delivery (comma-separated)
  filters.modes_of_delivery = parseCommaSeparatedParam('mode_of_delivery');

  // Parse tutorial_format (single value with validation)
  const tutorialFormat = params.get('tutorial_format');
  if (tutorialFormat) {
    const validFormats = ['online', 'in_person', 'hybrid'];
    if (validFormats.includes(tutorialFormat)) {
      filters.tutorial_format = tutorialFormat;
    } else {
      console.warn(`Invalid tutorial_format value: ${tutorialFormat}. Expected one of: ${validFormats.join(', ')}`);
    }
  }

  // Parse boolean filters
  filters.distance_learning = parseBooleanParam('distance_learning');
  filters.tutorial = parseBooleanParam('tutorial');

  // Parse search query
  const searchQuery = params.get('search_query');
  if (searchQuery) {
    filters.searchQuery = searchQuery;
  }

  return filters;
};

/**
 * Build URL query string from Redux filter state
 *
 * Converts Redux filter state into URLSearchParams using defined mapping
 *
 * @param {Object} filters - Redux filter state
 * @returns {URLSearchParams} URL query parameters
 */
const buildUrlFromFilters = (filters) => {
  const params = new URLSearchParams();

  // Helper to add indexed parameters (subject_code, subject_1, subject_2)
  const addIndexedParams = (values, baseParam, indexedBase) => {
    if (!values || values.length === 0) return;

    // First value uses base parameter name
    params.set(baseParam, values[0]);

    // Additional values use indexed names
    for (let i = 1; i < values.length; i++) {
      params.set(`${indexedBase}_${i}`, values[i]);
    }
  };

  // Helper to add comma-separated parameters
  const addCommaSeparatedParam = (values, paramName) => {
    if (!values || values.length === 0) return;
    params.set(paramName, values.join(','));
  };

  // Helper to add boolean parameters ('1' if true, omit if false)
  const addBooleanParam = (value, paramName) => {
    if (value === true) {
      params.set(paramName, '1');
    }
    // Omit parameter if false
  };

  // Add subjects (indexed format)
  addIndexedParams(filters.subjects, 'subject_code', 'subject');

  // Add categories (indexed format)
  addIndexedParams(filters.categories, 'category_code', 'category');

  // Add product types (comma-separated, legacy name 'group')
  addCommaSeparatedParam(filters.product_types, 'group');

  // Add products (comma-separated)
  addCommaSeparatedParam(filters.products, 'product');

  // Add modes of delivery (comma-separated)
  addCommaSeparatedParam(filters.modes_of_delivery, 'mode_of_delivery');

  // Add tutorial_format (single value, only if not null and valid)
  if (filters.tutorial_format) {
    const validFormats = ['online', 'in_person', 'hybrid'];
    if (validFormats.includes(filters.tutorial_format)) {
      params.set('tutorial_format', filters.tutorial_format);
    }
    // Invalid values are silently ignored (not added to URL)
  }

  // Add boolean filters
  addBooleanParam(filters.distance_learning, 'distance_learning');
  addBooleanParam(filters.tutorial, 'tutorial');

  // Add search query (only if not empty)
  if (filters.searchQuery && filters.searchQuery.trim()) {
    params.set('search_query', filters.searchQuery);
  }

  return params;
};

/**
 * URL Sync Middleware (Story 1.1)
 *
 * Listener middleware that automatically updates the URL when filter actions are dispatched
 */
export const urlSyncMiddleware = createListenerMiddleware();

// Track last URL parameters to prevent infinite loops
let lastUrlParams = null;

// Define all filter action types that should trigger URL updates
const FILTER_ACTION_TYPES = [
  'filters/setSubjects',
  'filters/setCategories',
  'filters/setProductTypes',
  'filters/setProducts',
  'filters/setModesOfDelivery',
  'filters/setSearchQuery',
  'filters/setTutorialFormat',
  'filters/setDistanceLearning',
  'filters/setTutorial',
  'filters/setMultipleFilters',
  'filters/toggleSubjectFilter',
  'filters/toggleCategoryFilter',
  'filters/toggleProductTypeFilter',
  'filters/toggleProductFilter',
  'filters/toggleModeOfDeliveryFilter',
  'filters/removeSubjectFilter',
  'filters/removeCategoryFilter',
  'filters/removeProductTypeFilter',
  'filters/removeProductFilter',
  'filters/removeModeOfDeliveryFilter',
  'filters/clearFilterType',
  'filters/clearAllFilters',
  'filters/resetFilters',
  'filters/navSelectSubject',
  'filters/navViewAllProducts',
  'filters/navSelectProductGroup',
  'filters/navSelectProduct',
  'filters/navSelectModeOfDelivery',
];

// Start listening to filter actions
urlSyncMiddleware.startListening({
  predicate: (action) => {
    // Listen to all filter actions
    return FILTER_ACTION_TYPES.includes(action.type);
  },
  effect: (action, listenerApi) => {
    // Get current filter state
    const state = listenerApi.getState();
    const filters = state.filters;

    // Build URL parameters from current state
    const params = buildUrlFromFilters(filters);
    const urlString = params.toString();

    // Loop prevention: Skip if URL hasn't changed
    if (urlString === lastUrlParams) {
      return;
    }

    // Update last URL params
    lastUrlParams = urlString;

    // Update browser URL using pushState to create history entries
    // This allows browser back/forward buttons to work correctly
    const newUrl = urlString ? `?${urlString}` : window.location.pathname;

    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState({}, '', newUrl);
    }
  },
});
