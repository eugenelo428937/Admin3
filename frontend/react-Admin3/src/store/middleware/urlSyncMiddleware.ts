/**
 * URL Sync Middleware (Stories 1.1, 1.6, 1.10, 1.15)
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
 * - Performance monitoring instrumentation (Story 1.15)
 * - Uses centralized FilterUrlManager utility (Story 1.10)
 */

import { createListenerMiddleware } from '@reduxjs/toolkit';
import { toUrlParams, fromUrlParams } from '../../utils/filterUrlManager';
import PerformanceTracker from '../../utils/PerformanceTracker';
import { URL_SYNC_BUDGET } from '../../config/performanceBudgets';
import { setMultipleFilters as _setMultipleFilters } from '../slices/filtersSlice';

/**
 * URL Parameter Mapping Configuration
 *
 * Defines how Redux state fields map to URL query parameters
 */
const URL_PARAM_MAPPING: Record<string, { reduxField: string; urlParam: string; format: string; type: string }> = {
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
 * @param params - URL query parameters
 * @returns Partial FilterState object
 */
export const parseUrlToFilters = (params: URLSearchParams): any => {
  return fromUrlParams(params);
};

/**
 * Build URL query string from Redux filter state
 *
 * Converts Redux filter state into URLSearchParams using defined mapping
 *
 * Uses centralized FilterUrlManager.toUrlParams() (Story 1.10)
 *
 * @param filters - Redux filter state
 * @returns URL query parameters
 */
const buildUrlFromFilters = (filters: any): URLSearchParams => {
  return toUrlParams(filters);
};

/**
 * URL Sync Middleware (Story 1.1, 1.16)
 *
 * Listener middleware that automatically updates the URL when filter actions are dispatched
 * Also listens to popstate events for URL → Redux synchronization (Story 1.16)
 */
export const urlSyncMiddleware = createListenerMiddleware();

// Track last URL parameters to prevent infinite loops
let lastUrlParams: string | null = null;

// Define all filter action types that should trigger URL updates (Story 1.1, 1.16)
const FILTER_ACTION_TYPES: string[] = [
  'filters/setSubjects',
  'filters/setCategories',
  'filters/setProductTypes',
  'filters/setProducts',
  'filters/setModesOfDelivery',
  'filters/setSearchQuery',
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
  // Pagination actions (Story 1.16)
  'filters/setCurrentPage',
  'filters/setPageSize',
];

// Pages where URL sync should be active
const URL_SYNC_PAGES: string[] = ['/products', '/home', '/'];

// Patterns matching all query params owned by the filter system.
// Any param NOT matching these is preserved across URL sync updates
// (e.g., ?preview=1 for admin storefront preview, ?utm_source=... for analytics).
const FILTER_PARAM_PATTERNS: RegExp[] = [
  /^subject_code$/, /^subject_\d+$/,
  /^category_code$/, /^category_\d+$/,
  /^group$/,
  /^product$/,
  /^mode_of_delivery$/,
  /^search_query$/,
  /^page$/, /^page_size$/,
];

const isFilterParam = (key: string): boolean =>
  FILTER_PARAM_PATTERNS.some(pattern => pattern.test(key));

/**
 * Check if current page should have URL sync enabled
 * Only sync on product-related pages to avoid stripping query params on other pages
 * (e.g., /auth/activate?uid=xxx&token=xxx)
 */
const shouldSyncUrl = (): boolean => {
  if (typeof window === 'undefined') return false;
  const pathname = window.location.pathname;
  return URL_SYNC_PAGES.some(page => pathname === page || pathname.startsWith(page + '/'));
};

// Start listening to filter actions
urlSyncMiddleware.startListening({
  predicate: (action: any): boolean => {
    // Listen to all filter actions
    return FILTER_ACTION_TYPES.includes(action.type);
  },
  effect: (action: any, listenerApi: any) => {
    // Only sync URL on product-related pages
    if (!shouldSyncUrl()) {
      return;
    }
    // Start performance tracking (Story 1.15)
    if (PerformanceTracker.isSupported()) {
      PerformanceTracker.startMeasure('urlSync', { actionType: action.type });
    }

    // Get current filter state
    const state = listenerApi.getState();
    const filters = state.filters;

    // Build URL parameters from current state
    const params = buildUrlFromFilters(filters);

    // Preserve non-filter params from current URL (e.g., preview=1, utm_source).
    // Without this, the middleware would strip any foreign query param on every update.
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.forEach((value, key) => {
      if (!isFilterParam(key) && !params.has(key)) {
        params.set(key, value);
      }
    });

    const urlString = params.toString();

    // Loop prevention: Skip if URL hasn't changed
    if (urlString === lastUrlParams) {
      // End measurement even if skipped
      if (PerformanceTracker.isSupported()) {
        PerformanceTracker.endMeasure('urlSync', { skipped: true });
      }
      return;
    }


    // Update last URL params
    lastUrlParams = urlString;

    // Update browser URL using replaceState to avoid polluting browser history
    // Users don't want to click back 20 times through filter changes
    const newUrl = urlString ? `?${urlString}` : window.location.pathname;

    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', newUrl);
    }

    // End performance tracking and check budget (Story 1.15)
    if (PerformanceTracker.isSupported()) {
      const metric = PerformanceTracker.endMeasure('urlSync', {
        urlLength: urlString.length
      });

      if (metric && !(import.meta as any).env?.PROD) {
        PerformanceTracker.checkBudget('urlSync', metric.duration, URL_SYNC_BUDGET);
      }
    }
  },
});

/**
 * Setup popstate event listener for URL → Redux synchronization (Story 1.16)
 *
 * When browser URL changes (back/forward navigation or programmatic changes),
 * parse URL parameters and dispatch Redux actions to update filter state.
 *
 * This enables bidirectional sync:
 * - Redux → URL: Handled by middleware listener above
 * - URL → Redux: Handled by this popstate listener + initial URL parsing
 *
 * @param dispatch - Redux store dispatch function
 */
export const setupUrlToReduxSync = (dispatch: (action: any) => any): (() => void) | undefined => {
  if (typeof window === 'undefined') return;

  const handlePopState = (): void => {
    // Only sync on product-related pages
    if (!shouldSyncUrl()) return;

    // Parse current URL parameters
    const params = new URLSearchParams(window.location.search);
    const filters = parseUrlToFilters(params);

    // Import setMultipleFilters action dynamically to avoid circular dependency
    // This will be imported at runtime when the listener is set up
    import('../slices/filtersSlice').then(({ setMultipleFilters }) => {
      // Dispatch action to update Redux state with URL filters
      dispatch(setMultipleFilters(filters));
    }).catch((error: any) => {
      console.error('[urlSyncMiddleware] Failed to import filtersSlice:', error);
    });
  };

  // Parse initial URL on setup (for page loads and direct URL access)
  // Only do this on product-related pages to avoid stripping query params on other pages
  if (shouldSyncUrl()) {
    const initialParams = new URLSearchParams(window.location.search);
    if (initialParams.toString()) {
      // Use top-level import for synchronous initial URL restoration
      const filters = parseUrlToFilters(initialParams);
      dispatch(_setMultipleFilters(filters));
    }
  }

  // Listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', handlePopState);

  // Return cleanup function
  return () => {
    window.removeEventListener('popstate', handlePopState);
  };
};
