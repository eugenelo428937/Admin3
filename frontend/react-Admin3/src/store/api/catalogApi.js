/**
 * RTK Query Catalog API Service
 * 
 * Provides cached API queries for the product catalog including the unified search endpoint.
 * Handles caching, invalidation, and automatic re-fetching.
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import config from '../../config';

// Base query with authentication and error handling
const baseQuery = fetchBaseQuery({
  baseUrl: `${config.apiBaseUrl || config.apiUrl}/api/exam-sessions-subjects-products/`,
  prepareHeaders: (headers, { getState }) => {
    // Add authentication token if available
    const token = localStorage.getItem('access_token');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    headers.set('content-type', 'application/json');
    return headers;
  },
});

// Enhanced base query with error handling
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  
  // Handle 401 unauthorized responses
  if (result.error && result.error.status === 401) {
    // Try to refresh token
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        const refreshResult = await baseQuery(
          {
            url: '/api/auth/refresh/',
            method: 'POST',
            body: { refresh: refreshToken },
          },
          api,
          extraOptions
        );
        
        if (refreshResult.data) {
          localStorage.setItem('access_token', refreshResult.data.access);
          
          // Retry the original query with new token
          result = await baseQuery(args, api, extraOptions);
        } else {
          // Refresh failed, redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
      }
    }
  }
  
  return result;
};

export const catalogApi = createApi({
  reducerPath: 'catalogApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Products', 'Filters', 'Search'],
  endpoints: (builder) => ({
    
    // Unified search endpoint - the main filtering API
    unifiedSearch: builder.query({
      query: ({ filters = {}, pagination = { page: 1, page_size: 20 }, options = {}, navbarFilters = {} }) => {
        // Build query string for navbar filters
        const queryParams = new URLSearchParams();
        if (navbarFilters.tutorial_format) queryParams.append('tutorial_format', navbarFilters.tutorial_format);
        if (navbarFilters.group) queryParams.append('group', navbarFilters.group);
        if (navbarFilters.variation) queryParams.append('variation', navbarFilters.variation);
        if (navbarFilters.distance_learning) queryParams.append('distance_learning', navbarFilters.distance_learning);
        if (navbarFilters.tutorial) queryParams.append('tutorial', navbarFilters.tutorial);
        if (navbarFilters.product) queryParams.append('product', navbarFilters.product);
        
        const queryString = queryParams.toString();
        const url = `search/${queryString ? '?' + queryString : ''}`;
        
        return {
          url,
          method: 'POST',
          body: {
            filters,
            pagination,
            options: {
              include_bundles: true,
              include_analytics: false,
              ...options,
            },
          },
        };
      },
      providesTags: (result, error, arg) => [
        'Search',
        { type: 'Products', id: 'SEARCH' },
        // Tag with specific filter combination for granular invalidation
        { type: 'Search', id: JSON.stringify(arg.filters) },
      ],
      // Keep search results cached for 5 minutes
      keepUnusedDataFor: 300, // 5 minutes
      // Transform response to ensure consistent structure
      transformResponse: (response) => {
        return {
          products: response.products || [],
          filterCounts: response.filter_counts || {},
          pagination: response.pagination || {
            page: 1,
            page_size: 20,
            total_count: 0,
            has_next: false,
            has_previous: false,
          },
        };
      },
      // Error transformation for better error messages
      transformErrorResponse: (response, meta, arg) => {
        return {
          status: response.status,
          error: response.data?.error || 'Search request failed',
          details: response.data?.details || null,
        };
      },
    }),
    
    // Legacy list products endpoint (for backward compatibility)
    listProducts: builder.query({
      query: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return `current/list/${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ['Products'],
      keepUnusedDataFor: 300,
    }),
    
    // Get filter configuration
    getFilterConfiguration: builder.query({
      query: (filterTypes = []) => {
        const params = filterTypes.length > 0 ? { types: filterTypes } : {};
        const queryString = new URLSearchParams(params).toString();
        return `filter-configuration/${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ['Filters'],
      keepUnusedDataFor: 600, // 10 minutes - filter config changes less frequently
    }),
    
    // Get default search data (subjects, categories, etc.)
    getDefaultSearchData: builder.query({
      query: () => 'current/default-search-data/',
      providesTags: ['Filters'],
      keepUnusedDataFor: 600, // 10 minutes
    }),
    
  }),
});

// Export hooks for use in functional components
export const {
  useUnifiedSearchQuery,
  useLazyUnifiedSearchQuery,
  useListProductsQuery,
  useGetFilterConfigurationQuery,
  useGetDefaultSearchDataQuery,
} = catalogApi;

// Export API for manual usage and testing
export default catalogApi;