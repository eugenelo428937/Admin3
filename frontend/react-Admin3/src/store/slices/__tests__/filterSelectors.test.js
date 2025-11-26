/**
 * Tests for Filter Selectors
 * T004: Test all selector functions
 */

import {
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
  selectValidationErrors,
  selectHasValidationErrors,
  selectHasActiveFilters,
  selectActiveFilterCount,
  selectActiveFilterSummary,
} from '../filterSelectors';

describe('filterSelectors', () => {
  // Mock state for testing
  const createMockState = (filterOverrides = {}) => ({
    filters: {
      subjects: [],
      categories: [],
      product_types: [],
      products: [],
      modes_of_delivery: [],
      searchQuery: '',
      searchFilterProductIds: [],
      currentPage: 1,
      pageSize: 20,
      isFilterPanelOpen: false,
      isLoading: false,
      error: null,
      filterCounts: {},
      appliedFilters: null,
      lastUpdated: null,
      validationErrors: [],
      ...filterOverrides,
    },
  });

  describe('Basic Selectors', () => {
    describe('selectFilters', () => {
      test('returns core filter object with all filter types', () => {
        const state = createMockState({
          subjects: ['CM2', 'SA1'],
          categories: ['Bundle'],
          product_types: ['Tutorial'],
          products: ['PROD1'],
          modes_of_delivery: ['ONLINE'],
          searchQuery: 'actuarial',
        });

        const result = selectFilters(state);

        expect(result).toEqual({
          subjects: ['CM2', 'SA1'],
          categories: ['Bundle'],
          product_types: ['Tutorial'],
          products: ['PROD1'],
          modes_of_delivery: ['ONLINE'],
          searchQuery: 'actuarial',
        });
      });

      test('returns empty arrays for filters when no filters applied', () => {
        const state = createMockState();
        const result = selectFilters(state);

        expect(result.subjects).toEqual([]);
        expect(result.categories).toEqual([]);
        expect(result.product_types).toEqual([]);
        expect(result.products).toEqual([]);
        expect(result.modes_of_delivery).toEqual([]);
        expect(result.searchQuery).toBe('');
      });
    });

    describe('selectSearchQuery', () => {
      test('returns current search query', () => {
        const state = createMockState({ searchQuery: 'test query' });
        expect(selectSearchQuery(state)).toBe('test query');
      });

      test('returns empty string when no search query', () => {
        const state = createMockState();
        expect(selectSearchQuery(state)).toBe('');
      });
    });

    describe('selectSearchFilterProductIds', () => {
      test('returns product IDs from fuzzy search', () => {
        const state = createMockState({
          searchFilterProductIds: [1, 2, 3],
        });
        expect(selectSearchFilterProductIds(state)).toEqual([1, 2, 3]);
      });

      test('returns empty array when no product IDs', () => {
        const state = createMockState();
        expect(selectSearchFilterProductIds(state)).toEqual([]);
      });
    });

    describe('selectCurrentPage', () => {
      test('returns current page number', () => {
        const state = createMockState({ currentPage: 5 });
        expect(selectCurrentPage(state)).toBe(5);
      });

      test('returns 1 as default page', () => {
        const state = createMockState();
        expect(selectCurrentPage(state)).toBe(1);
      });
    });

    describe('selectPageSize', () => {
      test('returns page size', () => {
        const state = createMockState({ pageSize: 50 });
        expect(selectPageSize(state)).toBe(50);
      });

      test('returns 20 as default page size', () => {
        const state = createMockState();
        expect(selectPageSize(state)).toBe(20);
      });
    });

    describe('selectIsFilterPanelOpen', () => {
      test('returns true when panel is open', () => {
        const state = createMockState({ isFilterPanelOpen: true });
        expect(selectIsFilterPanelOpen(state)).toBe(true);
      });

      test('returns false when panel is closed', () => {
        const state = createMockState({ isFilterPanelOpen: false });
        expect(selectIsFilterPanelOpen(state)).toBe(false);
      });
    });

    describe('selectIsLoading', () => {
      test('returns true when loading', () => {
        const state = createMockState({ isLoading: true });
        expect(selectIsLoading(state)).toBe(true);
      });

      test('returns false when not loading', () => {
        const state = createMockState({ isLoading: false });
        expect(selectIsLoading(state)).toBe(false);
      });
    });

    describe('selectError', () => {
      test('returns error when present', () => {
        const error = { message: 'Test error' };
        const state = createMockState({ error });
        expect(selectError(state)).toEqual(error);
      });

      test('returns null when no error', () => {
        const state = createMockState();
        expect(selectError(state)).toBeNull();
      });
    });

    describe('selectFilterCounts', () => {
      test('returns filter counts object', () => {
        const filterCounts = {
          subjects: { CM2: 10, SA1: 5 },
          categories: { Bundle: 3 },
        };
        const state = createMockState({ filterCounts });
        expect(selectFilterCounts(state)).toEqual(filterCounts);
      });

      test('returns empty object when no counts', () => {
        const state = createMockState();
        expect(selectFilterCounts(state)).toEqual({});
      });
    });

    describe('selectAppliedFilters', () => {
      test('returns applied filters snapshot', () => {
        const appliedFilters = { subjects: ['CM2'] };
        const state = createMockState({ appliedFilters });
        expect(selectAppliedFilters(state)).toEqual(appliedFilters);
      });

      test('returns null when no applied filters', () => {
        const state = createMockState();
        expect(selectAppliedFilters(state)).toBeNull();
      });
    });

    describe('selectLastUpdated', () => {
      test('returns timestamp of last update', () => {
        const timestamp = '2025-01-15T10:00:00Z';
        const state = createMockState({ lastUpdated: timestamp });
        expect(selectLastUpdated(state)).toBe(timestamp);
      });

      test('returns null when never updated', () => {
        const state = createMockState();
        expect(selectLastUpdated(state)).toBeNull();
      });
    });
  });

  describe('Validation Selectors', () => {
    describe('selectValidationErrors', () => {
      test('returns validation errors array', () => {
        const errors = [
          { field: 'subjects', message: 'Invalid subject', severity: 'error' },
        ];
        const state = createMockState({ validationErrors: errors });
        expect(selectValidationErrors(state)).toEqual(errors);
      });

      test('returns empty array when no validation errors', () => {
        const state = createMockState();
        expect(selectValidationErrors(state)).toEqual([]);
      });

      test('returns empty array when validationErrors is undefined', () => {
        const state = { filters: {} };
        expect(selectValidationErrors(state)).toEqual([]);
      });
    });

    describe('selectHasValidationErrors', () => {
      test('returns true when there are errors with severity error', () => {
        const errors = [
          { field: 'subjects', message: 'Invalid', severity: 'error' },
        ];
        const state = createMockState({ validationErrors: errors });
        expect(selectHasValidationErrors(state)).toBe(true);
      });

      test('returns false when only warnings exist', () => {
        const errors = [
          { field: 'subjects', message: 'Warning', severity: 'warning' },
        ];
        const state = createMockState({ validationErrors: errors });
        expect(selectHasValidationErrors(state)).toBe(false);
      });

      test('returns false when no validation errors', () => {
        const state = createMockState();
        expect(selectHasValidationErrors(state)).toBe(false);
      });

      test('returns false when validationErrors is undefined', () => {
        const state = { filters: {} };
        expect(selectHasValidationErrors(state)).toBe(false);
      });
    });
  });

  describe('Derived Selectors (Memoized)', () => {
    describe('selectHasActiveFilters', () => {
      test('returns true when subjects are selected', () => {
        const state = createMockState({ subjects: ['CM2'] });
        expect(selectHasActiveFilters(state)).toBe(true);
      });

      test('returns true when categories are selected', () => {
        const state = createMockState({ categories: ['Bundle'] });
        expect(selectHasActiveFilters(state)).toBe(true);
      });

      test('returns true when product_types are selected', () => {
        const state = createMockState({ product_types: ['Tutorial'] });
        expect(selectHasActiveFilters(state)).toBe(true);
      });

      test('returns true when products are selected', () => {
        const state = createMockState({ products: ['PROD1'] });
        expect(selectHasActiveFilters(state)).toBe(true);
      });

      test('returns true when modes_of_delivery are selected', () => {
        const state = createMockState({ modes_of_delivery: ['ONLINE'] });
        expect(selectHasActiveFilters(state)).toBe(true);
      });

      test('returns true when search query has content', () => {
        const state = createMockState({ searchQuery: 'test' });
        expect(selectHasActiveFilters(state)).toBe(true);
      });

      test('returns false when search query is only whitespace', () => {
        const state = createMockState({ searchQuery: '   ' });
        expect(selectHasActiveFilters(state)).toBe(false);
      });

      test('returns false when no filters are active', () => {
        const state = createMockState();
        expect(selectHasActiveFilters(state)).toBe(false);
      });
    });

    describe('selectActiveFilterCount', () => {
      test('counts all filter values correctly', () => {
        const state = createMockState({
          subjects: ['CM2', 'SA1'],
          categories: ['Bundle'],
          product_types: ['Tutorial', 'Material'],
          products: ['PROD1'],
          modes_of_delivery: ['ONLINE', 'IN_PERSON'],
          searchQuery: 'test',
        });

        // 2 subjects + 1 category + 2 product_types + 1 product + 2 modes + 1 search = 9
        expect(selectActiveFilterCount(state)).toBe(9);
      });

      test('counts search query as 1 when present', () => {
        const state = createMockState({ searchQuery: 'test' });
        expect(selectActiveFilterCount(state)).toBe(1);
      });

      test('does not count empty search query', () => {
        const state = createMockState({ searchQuery: '   ' });
        expect(selectActiveFilterCount(state)).toBe(0);
      });

      test('returns 0 when no filters are active', () => {
        const state = createMockState();
        expect(selectActiveFilterCount(state)).toBe(0);
      });
    });

    describe('selectActiveFilterSummary', () => {
      test('returns comprehensive summary of all filters', () => {
        const state = createMockState({
          subjects: ['CM2', 'SA1'],
          categories: ['Bundle'],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: 'test',
        });

        const result = selectActiveFilterSummary(state);

        expect(result).toEqual({
          subjects: ['CM2', 'SA1'],
          categories: ['Bundle'],
          product_types: [],
          products: [],
          modes_of_delivery: [],
          searchQuery: 'test',
          totalCount: 4, // 2 subjects + 1 category + 1 search
          hasFilters: true,
        });
      });

      test('returns correct summary when no filters', () => {
        const state = createMockState();
        const result = selectActiveFilterSummary(state);

        expect(result.totalCount).toBe(0);
        expect(result.hasFilters).toBe(false);
      });
    });
  });

  describe('Selector Memoization', () => {
    test('selectFilters returns same reference for unchanged state', () => {
      const state = createMockState({ subjects: ['CM2'] });

      const result1 = selectFilters(state);
      const result2 = selectFilters(state);

      expect(result1).toBe(result2);
    });

    test('selectHasActiveFilters returns same value for unchanged state', () => {
      const state = createMockState({ subjects: ['CM2'] });

      const result1 = selectHasActiveFilters(state);
      const result2 = selectHasActiveFilters(state);

      expect(result1).toBe(result2);
    });

    test('selectActiveFilterCount returns same value for unchanged state', () => {
      const state = createMockState({ subjects: ['CM2', 'SA1'] });

      const result1 = selectActiveFilterCount(state);
      const result2 = selectActiveFilterCount(state);

      expect(result1).toBe(result2);
    });
  });
});
