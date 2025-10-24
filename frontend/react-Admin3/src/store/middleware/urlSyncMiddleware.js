/**
 * URL Sync Middleware (Stories 1.1, 1.6, 1.10)
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
 * - Uses centralized FilterUrlManager utility (Story 1.10)
 */

import { createListenerMiddleware } from '@reduxjs/toolkit';
import { toUrlParams, fromUrlParams } from '../../utils/filterUrlManager';

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
 * Uses centralized FilterUrlManager.fromUrlParams() (Story 1.10)
 *
 * @param {URLSearchParams} params - URL query parameters
 * @returns {Object} Partial FilterState object
 */
export const parseUrlToFilters = (params) => {
  return fromUrlParams(params);
};

/**
 * Build URL query string from Redux filter state
 *
 * Converts Redux filter state into URLSearchParams using defined mapping
 *
 * Uses centralized FilterUrlManager.toUrlParams() (Story 1.10)
 *
 * @param {Object} filters - Redux filter state
 * @returns {URLSearchParams} URL query parameters
 */
const buildUrlFromFilters = (filters) => {
  return toUrlParams(filters);
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
    console.log('[urlSyncMiddleware] Action dispatched:', action.type);

    // Get current filter state
    const state = listenerApi.getState();
    const filters = state.filters;

    console.log('[urlSyncMiddleware] Current filters:', { subjects: filters.subjects });

    // Build URL parameters from current state
    const params = buildUrlFromFilters(filters);
    const urlString = params.toString();

    console.log('[urlSyncMiddleware] Generated URL params:', urlString);

    // Loop prevention: Skip if URL hasn't changed
    if (urlString === lastUrlParams) {
      console.log('[urlSyncMiddleware] Skipped - URL unchanged');
      return;
    }

    // Update last URL params
    lastUrlParams = urlString;

    // Update browser URL using replaceState to avoid polluting browser history
    // Users don't want to click back 20 times through filter changes
    const newUrl = urlString ? `?${urlString}` : window.location.pathname;

    console.log('[urlSyncMiddleware] Updating URL to:', newUrl);

    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', newUrl);
      console.log('[urlSyncMiddleware] URL updated successfully');
    }
  },
});
