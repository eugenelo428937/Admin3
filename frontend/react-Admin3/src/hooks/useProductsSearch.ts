/**
 * useProductsSearch Hook (Story 1.15)
 *
 * Custom hook for debounced product search using RTK Query.
 * Handles debouncing, loading states, error management, and performance tracking.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLazyUnifiedSearchQuery } from '../store/api/catalogApi';
import {
  selectFilters,
  selectAllFilters,
  selectSearchQuery,
  selectCurrentPage,
  selectPageSize,
  selectHasValidationErrors,
  setLoading,
  setError,
  clearError,
  setFilterCounts,
} from '../store/slices/filtersSlice';
import PerformanceTracker from '../utils/PerformanceTracker';
import { API_CALL_BUDGET } from '../config/performanceBudgets';

// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 250;

interface UseProductsSearchOptions {
  autoSearch?: boolean;
  debounceDelay?: number;
}

interface Pagination {
  page: number;
  page_size: number;
  total_count: number;
  has_next: boolean;
  has_previous: boolean;
}

interface SearchData {
  products: any[];
  filterCounts: Record<string, any>;
  pagination: Pagination;
}

interface SearchResultMeta {
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: any;
  data: any;
}

interface UseProductsSearchReturn {
  // Search data
  products: any[];
  filterCounts: Record<string, any>;
  pagination: Pagination;

  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // Search functions
  search: (forceSearch?: boolean) => void;
  refresh: () => void;
  reset: () => void;
  debouncedSearch: (forceSearch?: boolean) => void;

  // Search metadata
  hasSearched: boolean;
  isInitialLoading: boolean;

  // RTK Query metadata (for advanced usage)
  searchResult: SearchResultMeta;
}

/**
 * Custom hook for debounced product search
 *
 * @param options - Configuration options
 * @param options.autoSearch - Whether to automatically search when filters change
 * @param options.debounceDelay - Custom debounce delay (default: 250ms)
 * @returns Search state and functions
 */
export const useProductsSearch = (options: UseProductsSearchOptions = {}): UseProductsSearchReturn => {
  const {
    autoSearch = true,
    debounceDelay = DEBOUNCE_DELAY,
  } = options;

  const dispatch = useDispatch();

  // Redux state selectors.
  //
  // `filters` (selectFilters) is the legacy derived shape with a fixed set of
  // keys (subjects, categories, product_types, products, modes_of_delivery,
  // searchQuery). Kept for the PerformanceTracker filter-count metric below
  // until that selector is replaced.
  //
  // `byKey` (selectAllFilters) is the generic Redux bag — every filter the
  // user has set, keyed by the FilterConfiguration.filter_key the backend
  // knows. This is what gets sent in the request payload so new filter
  // types (subject_type, programme_type, …) work end-to-end without a
  // frontend touch.
  const filters = useSelector(selectFilters) as any;
  const byKey = useSelector(selectAllFilters) as Record<string, string[]>;
  const searchQuery = useSelector(selectSearchQuery) as string;
  const currentPage = useSelector(selectCurrentPage) as number;
  const pageSize = useSelector(selectPageSize) as number;
  const hasValidationErrors = useSelector(selectHasValidationErrors) as boolean;
  const isLoading = useSelector((state: any) => state.filters.isLoading) as boolean;
  const error = useSelector((state: any) => state.filters.error) as string | null;

  // Story 1.4: Navbar filters from Redux state (not URL)
  const tutorial = useSelector((state: any) => state.filters.tutorial);
  const tutorialFormat = useSelector((state: any) => state.filters.tutorial_format);
  const distanceLearning = useSelector((state: any) => state.filters.distance_learning);

  // RTK Query lazy search hook
  const [triggerSearch, searchResult] = useLazyUnifiedSearchQuery();

  // Local state
  const [searchData, setSearchData] = useState<SearchData>({
    products: [],
    filterCounts: {},
    pagination: {
      page: 1,
      page_size: 20,
      total_count: 0,
      has_next: false,
      has_previous: false,
    },
  });

  // Refs for debouncing
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSearchParamsRef = useRef<string | null>(null);
  const searchParamsCache = useRef(new WeakMap());

  /**
   * Clear any pending debounced search
   */
  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  /**
   * Execute the search with current parameters
   */
  const executeSearch = useCallback(async (forceSearch: boolean = false) => {
    // Story 1.12: Prevent API calls when validation errors exist
    if (hasValidationErrors) {
      console.warn('Skipping API call due to filter validation errors');
      dispatch(setLoading(false));
      return;
    }

    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      // Prepare search parameters with searchQuery (single-call pattern)
      // searchQuery parameter triggers fuzzy search + relevance sorting on backend

      // Story 1.4: Build navbarFilters object (only include non-empty values)
      const navbarFilters: Record<string, string> = {};
      if (tutorial) navbarFilters.tutorial = '1';
      if (tutorialFormat) navbarFilters.tutorial_format = tutorialFormat;
      if (distanceLearning) navbarFilters.distance_learning = '1';

      // Send the full byKey bag — only non-empty arrays — so any
      // FilterConfiguration the backend knows about (current set:
      // subject_type, subjects, programme_type, categories,
      // product_types, modes_of_delivery, products) flows through
      // automatically. Backend's apply_filters() ignores keys it has no
      // handler for, so unknown keys are harmless.
      const activeFilters: Record<string, string[]> = {};
      for (const [key, values] of Object.entries(byKey)) {
        if (Array.isArray(values) && values.length > 0) {
          activeFilters[key] = values;
        }
      }

      const searchParams = {
        searchQuery: searchQuery || '',
        filters: activeFilters,
        navbarFilters, // Story 1.4: Include navbar filters
        pagination: {
          page: currentPage,
          page_size: pageSize,
        },
        options: {
          include_bundles: true,
          include_analytics: false,
        },
      };

      // Cache-key the request by its observable shape. Sort keys so
      // {subjects:['CB1'],categories:['Material']} and
      // {categories:['Material'],subjects:['CB1']} hash the same.
      const filterFingerprint = Object.keys(activeFilters)
        .sort()
        .map((k) => `${k}=${activeFilters[k].slice().sort().join(',')}`)
        .join('|');
      const paramsHash = `${searchQuery || ''}||${filterFingerprint}||${currentPage}|${pageSize}|${tutorial}|${tutorialFormat || ''}|${distanceLearning}`;

      if (!forceSearch && lastSearchParamsRef.current === paramsHash) {
        dispatch(setLoading(false));
        return;
      }

      // Update last search params
      lastSearchParamsRef.current = paramsHash;

      // Start performance tracking for API call (Story 1.15)
      if (PerformanceTracker.isSupported()) {
        PerformanceTracker.startMeasure('api.products', {
          hasSearchQuery: !!searchQuery,
          filterCount: Object.values(activeFilters).reduce(
            (count: number, values: string[]) => count + values.length,
            0
          ),
          page: currentPage
        });
      }

      // Trigger the search
      const result = await triggerSearch(searchParams).unwrap();

      // End performance tracking (Story 1.15)
      if (PerformanceTracker.isSupported()) {
        const metric = PerformanceTracker.endMeasure('api.products', {
          resultsCount: result.products?.length || 0,
          totalCount: result.pagination?.total_count || 0
        });

        if (metric && !import.meta.env?.PROD) {
          PerformanceTracker.checkBudget('api.products', metric.duration, API_CALL_BUDGET);
        }
      }

      // Update local state with results
      const data: SearchData = {
        products: result.products || [],
        filterCounts: result.filterCounts || {},
        pagination: result.pagination || {
          page: currentPage,
          page_size: pageSize,
          total_count: 0,
          has_next: false,
          has_previous: false,
        },
      };

      setSearchData(data);

      // Update Redux store with filter counts for FilterPanel
      dispatch(setFilterCounts(data.filterCounts));

      dispatch(setLoading(false));

    } catch (error: any) {
      console.error('🔍 [SEARCH] Search failed:', error);

      // Format error message consistently
      let errorMessage = 'Search request failed';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = error.error;
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      dispatch(setError(errorMessage));
      dispatch(setLoading(false));
    }
  }, [hasValidationErrors, filters, searchQuery, currentPage, pageSize, tutorial, tutorialFormat, distanceLearning, triggerSearch, dispatch]);

  /**
   * Debounced search function
   */
  const debouncedSearch = useCallback((forceSearch: boolean = false) => {
    clearDebounce();

    if (forceSearch) {
      executeSearch(true);
    } else {
      debounceTimerRef.current = setTimeout(() => {
        executeSearch();
      }, debounceDelay);
    }
  }, [clearDebounce, executeSearch, debounceDelay]);

  /**
   * Manual search trigger (bypasses debounce)
   */
  const search = useCallback((forceSearch: boolean = true) => {
    debouncedSearch(forceSearch);
  }, [debouncedSearch]);

  /**
   * Refresh current search
   */
  const refresh = useCallback(() => {
    search(true);
  }, [search]);

  /**
   * Reset search state
   */
  const reset = useCallback(() => {
    clearDebounce();
    setSearchData({
      products: [],
      filterCounts: {},
      pagination: {
        page: 1,
        page_size: 20,
        total_count: 0,
        has_next: false,
        has_previous: false,
      },
    });
    dispatch(clearError());
    lastSearchParamsRef.current = null;
  }, [clearDebounce, dispatch]);

  // Generic, byKey-derived effect trigger. New filter keys (subject_type,
  // programme_type, anything added later) are picked up automatically —
  // no need to extend this hash when the filter taxonomy changes.
  const filterHash = useMemo(() => {
    const fp = Object.keys(byKey)
      .filter((k) => Array.isArray(byKey[k]) && byKey[k].length > 0)
      .sort()
      .map((k) => `${k}=${byKey[k].slice().sort().join(',')}`)
      .join('|');
    return `${searchQuery || ''}||${fp}||${currentPage}|${pageSize}|${tutorial}|${tutorialFormat || ''}|${distanceLearning}`;
  }, [searchQuery, byKey, currentPage, pageSize, tutorial, tutorialFormat, distanceLearning]);

  // Auto-search when filters change (if enabled)
  useEffect(() => {
    if (autoSearch) {
      // Clear existing timer first
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounced search
      debounceTimerRef.current = setTimeout(() => {
        executeSearch();
      }, debounceDelay);
    }

    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filterHash, autoSearch, debounceDelay]); // Use stable hash instead of complex objects

  // Update search data from RTK Query result
  useEffect(() => {
    if (searchResult.data && !searchResult.isLoading && !searchResult.error) {
      const data: SearchData = {
        products: searchResult.data.products || [],
        filterCounts: searchResult.data.filterCounts || {},
        pagination: searchResult.data.pagination || {
          page: currentPage,
          page_size: pageSize,
          total_count: 0,
          has_next: false,
          has_previous: false,
        },
      };

      setSearchData(data);

      // Update Redux store with filter counts for FilterPanel
      dispatch(setFilterCounts(data.filterCounts));
    }
  }, [searchResult.data, searchResult.isLoading, searchResult.error, currentPage, pageSize, dispatch]);

  // Handle RTK Query errors
  useEffect(() => {
    if (searchResult.error) {
      // Format error message consistently
      let errorMessage = 'Search request failed';
      const err = searchResult.error as any;
      if (err?.message) {
        errorMessage = err.message;
      } else if (err?.error) {
        errorMessage = err.error;
      } else if (err?.data?.message) {
        errorMessage = err.data.message;
      } else if (typeof searchResult.error === 'string') {
        errorMessage = searchResult.error;
      }

      dispatch(setError(errorMessage));
      dispatch(setLoading(false));
    }
  }, [searchResult.error, dispatch]);

  return {
    // Search data
    products: searchData.products,
    filterCounts: searchData.filterCounts,
    pagination: searchData.pagination,

    // Loading and error states
    isLoading: isLoading || searchResult.isLoading,
    error: error || (searchResult.error ? 'Search request failed' : null),

    // Search functions
    search,
    refresh,
    reset,
    debouncedSearch,

    // Search metadata
    hasSearched: lastSearchParamsRef.current !== null,
    isInitialLoading: isLoading && searchData.products.length === 0,

    // RTK Query metadata (for advanced usage)
    searchResult: {
      isLoading: searchResult.isLoading,
      isFetching: searchResult.isFetching,
      isError: searchResult.isError,
      error: searchResult.error,
      data: searchResult.data,
    },
  };
};

export default useProductsSearch;
