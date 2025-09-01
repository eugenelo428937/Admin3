/**
 * useProductsSearch Hook
 * 
 * Custom hook for debounced product search using RTK Query.
 * Handles debouncing, loading states, and error management.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useLazyUnifiedSearchQuery } from '../store/api/catalogApi';
import {
  selectFilters,
  selectSearchQuery,
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
  const location = useLocation();
  
  // Redux state selectors
  const filters = useSelector(selectFilters);
  const searchQuery = useSelector(selectSearchQuery);
  const currentPage = useSelector(selectCurrentPage);
  const pageSize = useSelector(selectPageSize);
  const isLoading = useSelector(state => state.filters.isLoading);
  const error = useSelector(state => state.filters.error);
  
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
      
      // Parse navbar filters from URL
      const queryParams = new URLSearchParams(location.search);
      const navbarFilters = {};
      if (queryParams.get('tutorial_format')) navbarFilters.tutorial_format = queryParams.get('tutorial_format');
      if (queryParams.get('group')) navbarFilters.group = queryParams.get('group');
      if (queryParams.get('variation')) navbarFilters.variation = queryParams.get('variation');
      if (queryParams.get('distance_learning')) navbarFilters.distance_learning = queryParams.get('distance_learning');
      if (queryParams.get('tutorial')) navbarFilters.tutorial = queryParams.get('tutorial');
      if (queryParams.get('product')) navbarFilters.product = queryParams.get('product');
      
      // Prepare search parameters
      const searchParams = {
        filters: {
          ...filters,
          // Add search query to filters if present
          ...(searchQuery && { searchQuery }),
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
      const currentParamsString = JSON.stringify(searchParams);
      if (!forceSearch && lastSearchParamsRef.current === currentParamsString) {
        dispatch(setLoading(false));
        return;
      }
      
      // Update last search params
      lastSearchParamsRef.current = currentParamsString;
      
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
  }, [filters, searchQuery, currentPage, pageSize, triggerSearch, dispatch]);
  
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
  
  // Auto-search when filters change (if enabled)
  useEffect(() => {
    if (autoSearch) {
      debouncedSearch();
    }
    
    // Cleanup on unmount
    return clearDebounce;
  }, [filters, searchQuery, currentPage, pageSize, autoSearch, debouncedSearch, clearDebounce]);
  
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