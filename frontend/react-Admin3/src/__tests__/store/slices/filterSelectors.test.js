/**
 * Filter Selectors Module Tests (Story 1.14)
 *
 * Tests for the filter selectors module - all selectors extracted from filtersSlice.
 * Contract: specs/007-docs-stories-story/contracts/filterSelectors-module-contract.md
 *
 * TDD Phase: RED - These tests should FAIL until T007 implements the module
 */

import {
  // Basic selectors
  selectFilters,
  selectSearchQuery,
  selectSearchFilterProductIds,
  selectCurrentPage,
  selectPageSize,
  selectIsFilterPanelOpen,
  selectIsLoading,
  selectError,
  selectFilterCounts,
  selectAppliedFilters,
  selectLastUpdated,

  // Validation selectors
  selectValidationErrors,
  selectHasValidationErrors,

  // Derived selectors (memoized)
  selectHasActiveFilters,
  selectActiveFilterCount,
  selectActiveFilterSummary
} from '../../../store/slices/filterSelectors';

describe('Filter Selectors Module', () => {
  let mockState;

  beforeEach(() => {
    // Mock Redux state structure
    mockState = {
      filters: {
        subjects: ['CM2', 'SA1'],
        categories: ['Bundle'],
        product_types: ['EBOOK'],
        products: [1, 2],
        modes_of_delivery: ['online'],
        searchQuery: 'actuarial',
        searchFilterProductIds: [10, 20, 30],
        currentPage: 3,
        pageSize: 20,
        isFilterPanelOpen: true,
        isLoading: false,
        error: null,
        filterCounts: {
          subjects: { 'CM2': 10, 'SA1': 5 },
          categories: { 'Bundle': 3 }
        },
        appliedFilters: {
          subjects: ['CM2'],
          categories: [],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: ''
        },
        lastUpdated: 1609459200000,
        validationErrors: []
      }
    };
  });

  describe('Basic Selectors', () => {
    test('selectFilters returns complete filter object', () => {
      const result = selectFilters(mockState);

      expect(result).toEqual({
        subjects: ['CM2', 'SA1'],
        categories: ['Bundle'],
        product_types: ['EBOOK'],
        products: [1, 2],
        modes_of_delivery: ['online'],
        searchQuery: 'actuarial'
      });
    });

    test('selectSearchQuery returns search query string', () => {
      const result = selectSearchQuery(mockState);

      expect(result).toBe('actuarial');
    });

    test('selectSearchFilterProductIds returns ESSP product IDs array', () => {
      const result = selectSearchFilterProductIds(mockState);

      expect(result).toEqual([10, 20, 30]);
    });

    test('selectCurrentPage returns current page number', () => {
      const result = selectCurrentPage(mockState);

      expect(result).toBe(3);
    });

    test('selectPageSize returns page size number', () => {
      const result = selectPageSize(mockState);

      expect(result).toBe(20);
    });

    test('selectIsFilterPanelOpen returns panel open state', () => {
      const result = selectIsFilterPanelOpen(mockState);

      expect(result).toBe(true);
    });

    test('selectIsLoading returns loading state', () => {
      const result = selectIsLoading(mockState);

      expect(result).toBe(false);
    });

    test('selectError returns error state', () => {
      mockState.filters.error = 'Test error';
      const result = selectError(mockState);

      expect(result).toBe('Test error');
    });

    test('selectFilterCounts returns filter counts object', () => {
      const result = selectFilterCounts(mockState);

      expect(result).toEqual({
        subjects: { 'CM2': 10, 'SA1': 5 },
        categories: { 'Bundle': 3 }
      });
    });

    test('selectAppliedFilters returns applied filters snapshot', () => {
      const result = selectAppliedFilters(mockState);

      expect(result).toEqual({
        subjects: ['CM2'],
        categories: [],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        searchQuery: ''
      });
    });

    test('selectLastUpdated returns timestamp', () => {
      const result = selectLastUpdated(mockState);

      expect(result).toBe(1609459200000);
    });
  });

  describe('Validation Selectors', () => {
    test('selectValidationErrors returns errors array', () => {
      mockState.filters.validationErrors = [
        { field: 'subjects', severity: 'error', message: 'Invalid subject' }
      ];

      const result = selectValidationErrors(mockState);

      expect(result).toEqual([
        { field: 'subjects', severity: 'error', message: 'Invalid subject' }
      ]);
    });

    test('selectHasValidationErrors returns true only for errors (not warnings)', () => {
      mockState.filters.validationErrors = [
        { field: 'subjects', severity: 'warning', message: 'Subject warning' },
        { field: 'categories', severity: 'error', message: 'Category error' }
      ];

      const result = selectHasValidationErrors(mockState);

      expect(result).toBe(true);
    });

    test('selectHasValidationErrors returns false when no errors (only warnings)', () => {
      mockState.filters.validationErrors = [
        { field: 'subjects', severity: 'warning', message: 'Subject warning' }
      ];

      const result = selectHasValidationErrors(mockState);

      expect(result).toBe(false);
    });

    test('selectHasValidationErrors returns false when no validation errors', () => {
      mockState.filters.validationErrors = [];

      const result = selectHasValidationErrors(mockState);

      expect(result).toBe(false);
    });
  });

  describe('Derived Selectors (Memoized)', () => {
    test('selectHasActiveFilters returns false when no filters', () => {
      mockState.filters.subjects = [];
      mockState.filters.categories = [];
      mockState.filters.product_types = [];
      mockState.filters.products = [];
      mockState.filters.modes_of_delivery = [];
      mockState.filters.searchQuery = '';

      const result = selectHasActiveFilters(mockState);

      expect(result).toBe(false);
    });

    test('selectHasActiveFilters returns true when any filter active', () => {
      const result = selectHasActiveFilters(mockState);

      expect(result).toBe(true);
    });

    test('selectHasActiveFilters returns true for search query only', () => {
      mockState.filters.subjects = [];
      mockState.filters.categories = [];
      mockState.filters.product_types = [];
      mockState.filters.products = [];
      mockState.filters.modes_of_delivery = [];
      mockState.filters.searchQuery = 'test';

      const result = selectHasActiveFilters(mockState);

      expect(result).toBe(true);
    });

    test('selectActiveFilterCount returns correct count', () => {
      // subjects: 2, categories: 1, product_types: 1, products: 2, modes_of_delivery: 1, searchQuery: 1
      const result = selectActiveFilterCount(mockState);

      expect(result).toBe(8);
    });

    test('selectActiveFilterCount returns 0 when no filters', () => {
      mockState.filters.subjects = [];
      mockState.filters.categories = [];
      mockState.filters.product_types = [];
      mockState.filters.products = [];
      mockState.filters.modes_of_delivery = [];
      mockState.filters.searchQuery = '';

      const result = selectActiveFilterCount(mockState);

      expect(result).toBe(0);
    });

    test('selectActiveFilterSummary returns summary object', () => {
      const result = selectActiveFilterSummary(mockState);

      expect(result).toEqual({
        subjects: ['CM2', 'SA1'],
        categories: ['Bundle'],
        product_types: ['EBOOK'],
        products: [1, 2],
        modes_of_delivery: ['online'],
        searchQuery: 'actuarial',
        totalCount: 8,
        hasFilters: true
      });
    });
  });

  describe('Memoization Tests', () => {
    test('selectFilters returns same reference when state unchanged', () => {
      const result1 = selectFilters(mockState);
      const result2 = selectFilters(mockState);

      expect(result1).toBe(result2);
    });

    test('selectHasActiveFilters returns same reference when dependencies unchanged', () => {
      const result1 = selectHasActiveFilters(mockState);
      const result2 = selectHasActiveFilters(mockState);

      expect(result1).toBe(result2);
    });

    test('selectHasActiveFilters recomputes when filter changes', () => {
      const result1 = selectHasActiveFilters(mockState);

      // Change filter state
      mockState.filters.subjects = ['CB1'];

      const result2 = selectHasActiveFilters(mockState);

      // Both true, but different references (recomputed)
      expect(result1).toBe(true);
      expect(result2).toBe(true);
      // Note: Can't test reference equality directly since both are primitives
      // Testing that selector responds to changes
    });

    test('selectActiveFilterCount memoizes when state unchanged', () => {
      const result1 = selectActiveFilterCount(mockState);
      const result2 = selectActiveFilterCount(mockState);

      expect(result1).toBe(result2);
      expect(result1).toBe(8);
    });

    test('selectActiveFilterCount recomputes when filters change', () => {
      const result1 = selectActiveFilterCount(mockState);
      expect(result1).toBe(8);

      // Create NEW state object with changed filters (trigger recomputation)
      const newMockState = {
        ...mockState,
        filters: {
          ...mockState.filters,
          categories: [] // Remove category filter
        }
      };

      const result2 = selectActiveFilterCount(newMockState);
      expect(result2).toBe(7);
    });

    test('selectActiveFilterSummary returns same reference when dependencies unchanged', () => {
      const result1 = selectActiveFilterSummary(mockState);
      const result2 = selectActiveFilterSummary(mockState);

      expect(result1).toBe(result2); // Same object reference
    });

    test('selectActiveFilterSummary recomputes when filters change', () => {
      const result1 = selectActiveFilterSummary(mockState);
      expect(result1.totalCount).toBe(8);

      // Create NEW state object with changed filters (trigger recomputation)
      const newMockState = {
        ...mockState,
        filters: {
          ...mockState.filters,
          subjects: [] // Remove subjects (was 2 values)
        }
      };

      const result2 = selectActiveFilterSummary(newMockState);
      expect(result2.totalCount).toBe(6);
      expect(result1).not.toBe(result2); // Different object references
    });
  });
});
