/**
 * Filter Selectors Module (Story 1.14)
 *
 * All selectors for accessing filter state from Redux store.
 * Includes basic selectors, validation selectors, and memoized derived selectors.
 *
 * Contract: specs/007-docs-stories-story/contracts/filterSelectors-module-contract.md
 */

import { createSelector } from '@reduxjs/toolkit';

// ========================================
// Basic Selectors (11 selectors)
// ========================================

/**
 * selectFilters
 * Returns the core filter object (subjects, categories, product_types, products, modes_of_delivery, searchQuery)
 * Memoized to prevent unnecessary re-renders
 */
export const selectFilters = createSelector(
  [(state) => state.filters],
  (filters) => ({
    subjects: filters.subjects,
    categories: filters.categories,
    product_types: filters.product_types,
    products: filters.products,
    modes_of_delivery: filters.modes_of_delivery,
    searchQuery: filters.searchQuery
  })
);

/**
 * selectSearchQuery
 * Returns the current search query string
 */
export const selectSearchQuery = (state) => state.filters.searchQuery;

/**
 * selectSearchFilterProductIds
 * Returns the ESSP product IDs array from fuzzy search
 * These are ExamSessionSubjectProduct.id values (NOT product.id)
 */
export const selectSearchFilterProductIds = (state) => state.filters.searchFilterProductIds;

/**
 * selectCurrentPage
 * Returns the current page number for pagination
 */
export const selectCurrentPage = (state) => state.filters.currentPage;

/**
 * selectPageSize
 * Returns the page size for pagination
 */
export const selectPageSize = (state) => state.filters.pageSize;

/**
 * selectIsFilterPanelOpen
 * Returns whether the filter panel is open
 */
export const selectIsFilterPanelOpen = (state) => state.filters.isFilterPanelOpen;

/**
 * selectIsLoading
 * Returns the loading state
 */
export const selectIsLoading = (state) => state.filters.isLoading;

/**
 * selectError
 * Returns the current error (null if no error)
 */
export const selectError = (state) => state.filters.error;

/**
 * selectFilterCounts
 * Returns the filter counts object from API responses
 */
export const selectFilterCounts = (state) => state.filters.filterCounts;

/**
 * selectAppliedFilters
 * Returns the cached snapshot of applied filters
 */
export const selectAppliedFilters = (state) => state.filters.appliedFilters;

/**
 * selectLastUpdated
 * Returns the timestamp of last filter update
 */
export const selectLastUpdated = (state) => state.filters.lastUpdated;

// ========================================
// Validation Selectors (2 selectors)
// ========================================

/**
 * selectValidationErrors
 * Returns the array of validation errors
 */
export const selectValidationErrors = (state) => state.filters.validationErrors;

/**
 * selectHasValidationErrors
 * Returns true if there are any validation errors with severity='error'
 * Does NOT count warnings
 */
export const selectHasValidationErrors = (state) =>
  state.filters.validationErrors.some(error => error.severity === 'error');

// ========================================
// Derived Selectors (3 memoized selectors)
// ========================================

/**
 * selectHasActiveFilters
 * Returns true if any filter is active (including search query)
 * Memoized - only recomputes when filter values change
 */
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

/**
 * selectActiveFilterCount
 * Returns the total count of active filter values
 * Memoized - only recomputes when filter values change
 */
export const selectActiveFilterCount = createSelector(
  [selectFilters, selectSearchQuery],
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

/**
 * selectActiveFilterSummary
 * Returns a comprehensive summary of all active filters
 * Includes filter values, total count, and hasFilters flag
 * Memoized - only recomputes when filter values change
 */
export const selectActiveFilterSummary = createSelector(
  [selectFilters, selectSearchQuery, selectActiveFilterCount, selectHasActiveFilters],
  (filters, searchQuery, totalCount, hasFilters) => ({
    subjects: filters.subjects,
    categories: filters.categories,
    product_types: filters.product_types,
    products: filters.products,
    modes_of_delivery: filters.modes_of_delivery,
    searchQuery: searchQuery,
    totalCount: totalCount,
    hasFilters: hasFilters
  })
);
