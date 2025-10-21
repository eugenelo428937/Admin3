/**
 * useProductsSearch Hook
 * 
 * Custom hook for debounced product search using RTK Query.
 * Handles debouncing, loading states, and error management.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLazyUnifiedSearchQuery } from '../store/api/catalogApi';
import {
  selectFilters,
  selectSearchQuery,
  selectSearchFilterProductIds,
  selectCurrentPage,
  selectPageSize,
  setLoading,
  setError,
  clearError,
  setFilterCounts,
} from '../store/slices/filtersSlice';

// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 250;

/**
 * Custom hook for debounced product search
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoSearch - Whether to automatically search when filters change
 * @param {number} options.debounceDelay - Custom debounce delay (default: 250ms)
 * @returns {Object} Search state and functions
 */
export const useProductsSearch = (options = {}) => {
  const {
    autoSearch = true,
    debounceDelay = DEBOUNCE_DELAY,
  } = options;

  const dispatch = useDispatch();

  // Redux state selectors
  const filters = useSelector(selectFilters);
  const searchQuery = useSelector(selectSearchQuery);
  const searchFilterProductIds = useSelector(selectSearchFilterProductIds);
  const currentPage = useSelector(selectCurrentPage);
  const pageSize = useSelector(selectPageSize);
  const isLoading = useSelector(state => state.filters.isLoading);
  const error = useSelector(state => state.filters.error);

  // Navbar filter selectors (Story 1.4 - from Redux, not URL)
  const tutorial_format = useSelector(state => state.filters.tutorial_format);
  const distance_learning = useSelector(state => state.filters.distance_learning);
  const tutorial = useSelector(state => state.filters.tutorial);
  
  // RTK Query lazy search hook
  const [triggerSearch, searchResult] = useLazyUnifiedSearchQuery();
  
  // Local state
  const [searchData, setSearchData] = useState({
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
  const debounceTimerRef = useRef(null);
  const lastSearchParamsRef = useRef(null);
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
  const executeSearch = useCallback(async (forceSearch = false) => {
    try {
      dispatch(setLoading(true));
      dispatch(clearError());

      // Build navbar filters from Redux state (Story 1.4 - single source of truth)
      const navbarFilters = {};
      if (tutorial_format) navbarFilters.tutorial_format = tutorial_format;
      if (distance_learning) navbarFilters.distance_learning = distance_learning ? '1' : undefined;
      if (tutorial) navbarFilters.tutorial = tutorial ? '1' : undefined;

      // Issue #2 Fix: Use searchFilterProductIds if present (from fuzzy search)
      const effectiveProducts = searchFilterProductIds.length > 0
        ? searchFilterProductIds
        : filters.products;

      // Prepare search parameters
      const searchParams = {
        filters: {
          ...filters,
          products: effectiveProducts, // Use fuzzy search IDs if available
          // Note: searchQuery is NOT sent to unified_search endpoint
          // Text search is handled by the fuzzy-search endpoint in SearchBox
          // The unified_search endpoint only accepts: subjects, categories, product_types, products, modes_of_delivery
        },
        navbarFilters,
        pagination: {
          page: currentPage,
          page_size: pageSize,
        },
        options: {
          include_bundles: true,
          include_analytics: false,
        },
      };
      
      // Check if search parameters have changed (avoid duplicate requests)
      // Use a fast hash instead of JSON.stringify for performance
      // Note: searchQuery removed since it's not sent to unified_search endpoint
      // Issue #2 Fix: Include searchFilterProductIds in hash
      const paramsHash = `${filters.subjects?.join(',')||''}|${filters.categories?.join(',')||''}|${filters.product_types?.join(',')||''}|${effectiveProducts?.join(',')||''}|${currentPage}|${pageSize}|${tutorial_format||''}|${distance_learning}|${tutorial}`;

      if (!forceSearch && lastSearchParamsRef.current === paramsHash) {
        dispatch(setLoading(false));
        return;
      }

      // Update last search params
      lastSearchParamsRef.current = paramsHash;
      
      // Trigger the search
      const result = await triggerSearch(searchParams).unwrap();
      
      // Update local state with results
      const data = {
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
      
    } catch (error) {
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
  }, [filters, searchQuery, searchFilterProductIds, currentPage, pageSize, tutorial_format, distance_learning, tutorial, triggerSearch, dispatch]);
  
  /**
   * Debounced search function
   */
  const debouncedSearch = useCallback((forceSearch = false) => {
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
  const search = useCallback((forceSearch = true) => {
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
  
  // Create stable references for effect dependencies
  // Note: searchQuery removed since it's not sent to unified_search endpoint
  // Issue #2 Fix: Include searchFilterProductIds in filter hash
  const filterHash = useMemo(() => {
    const effectiveProducts = searchFilterProductIds.length > 0 ? searchFilterProductIds : filters.products;
    return `${filters.subjects?.join(',')||''}|${filters.categories?.join(',')||''}|${filters.product_types?.join(',')||''}|${effectiveProducts?.join(',')||''}|${currentPage}|${pageSize}|${tutorial_format||''}|${distance_learning}|${tutorial}`;
  }, [filters.subjects, filters.categories, filters.product_types, filters.products, searchFilterProductIds, currentPage, pageSize, tutorial_format, distance_learning, tutorial]);

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
      const data = {
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
      if (searchResult.error?.message) {
        errorMessage = searchResult.error.message;
      } else if (searchResult.error?.error) {
        errorMessage = searchResult.error.error;
      } else if (searchResult.error?.data?.message) {
        errorMessage = searchResult.error.data.message;
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