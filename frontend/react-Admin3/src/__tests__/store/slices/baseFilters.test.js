/**
 * Base Filters Module Tests (Story 1.14)
 *
 * Tests for the base filters module that will be extracted from filtersSlice.
 * These tests follow the contract defined in:
 * specs/007-docs-stories-story/contracts/baseFilters-module-contract.md
 *
 * TDD Phase: RED - These tests should FAIL until T005 implements the module
 */

import { baseFiltersInitialState, baseFiltersReducers } from '../../../store/slices/baseFilters.slice';

describe('Base Filters Module', () => {
  let state;

  beforeEach(() => {
    state = { ...baseFiltersInitialState };
  });

  describe('Set Actions', () => {
    test('setSubjects updates subjects array and resets currentPage', () => {
      state.subjects = ['CM2'];
      state.currentPage = 5;
      const action = { payload: ['SA1', 'CB1'] };

      baseFiltersReducers.setSubjects(state, action);

      expect(state.subjects).toEqual(['SA1', 'CB1']);
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });

    test('setCategories updates categories array and resets currentPage', () => {
      state.categories = ['Bundle'];
      state.currentPage = 3;
      const action = { payload: ['Core Reading', 'Revision'] };

      baseFiltersReducers.setCategories(state, action);

      expect(state.categories).toEqual(['Core Reading', 'Revision']);
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });

    test('setProductTypes updates product_types array and resets currentPage', () => {
      state.product_types = ['PRINTED'];
      state.currentPage = 2;
      const action = { payload: ['EBOOK', 'ONLINE'] };

      baseFiltersReducers.setProductTypes(state, action);

      expect(state.product_types).toEqual(['EBOOK', 'ONLINE']);
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });

    test('setProducts updates products array and resets currentPage', () => {
      state.products = [1, 2];
      state.currentPage = 4;
      const action = { payload: [3, 4, 5] };

      baseFiltersReducers.setProducts(state, action);

      expect(state.products).toEqual([3, 4, 5]);
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });

    test('setModesOfDelivery updates modes_of_delivery array and resets currentPage', () => {
      state.modes_of_delivery = ['online'];
      state.currentPage = 2;
      const action = { payload: ['paper', 'digital'] };

      baseFiltersReducers.setModesOfDelivery(state, action);

      expect(state.modes_of_delivery).toEqual(['paper', 'digital']);
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });

    test('setSearchQuery updates searchQuery and resets currentPage', () => {
      state.searchQuery = 'old query';
      state.currentPage = 3;
      const action = { payload: 'new search query' };

      baseFiltersReducers.setSearchQuery(state, action);

      expect(state.searchQuery).toBe('new search query');
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });

    test('setSearchFilterProductIds updates searchFilterProductIds and resets currentPage', () => {
      state.searchFilterProductIds = [1, 2];
      state.currentPage = 2;
      const action = { payload: [3, 4, 5] };

      baseFiltersReducers.setSearchFilterProductIds(state, action);

      expect(state.searchFilterProductIds).toEqual([3, 4, 5]);
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });
  });

  describe('Toggle Actions', () => {
    test('toggleSubjectFilter adds subject when not present', () => {
      state.subjects = ['CM2'];
      const action = { payload: 'SA1' };

      baseFiltersReducers.toggleSubjectFilter(state, action);

      expect(state.subjects).toEqual(['CM2', 'SA1']);
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });

    test('toggleSubjectFilter removes subject when present', () => {
      state.subjects = ['CM2', 'SA1', 'CB1'];
      const action = { payload: 'SA1' };

      baseFiltersReducers.toggleSubjectFilter(state, action);

      expect(state.subjects).toEqual(['CM2', 'CB1']);
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });

    test('toggleCategoryFilter toggles category correctly', () => {
      state.categories = ['Bundle'];
      const action = { payload: 'Core Reading' };

      baseFiltersReducers.toggleCategoryFilter(state, action);

      expect(state.categories).toContain('Core Reading');

      // Toggle again to remove
      baseFiltersReducers.toggleCategoryFilter(state, action);
      expect(state.categories).not.toContain('Core Reading');
    });

    test('toggleProductTypeFilter toggles product type correctly', () => {
      state.product_types = [];
      const action = { payload: 'EBOOK' };

      baseFiltersReducers.toggleProductTypeFilter(state, action);

      expect(state.product_types).toContain('EBOOK');
    });

    test('toggleProductFilter toggles product correctly', () => {
      state.products = [1, 2];
      const action = { payload: 3 };

      baseFiltersReducers.toggleProductFilter(state, action);

      expect(state.products).toContain(3);

      // Toggle again to remove
      baseFiltersReducers.toggleProductFilter(state, action);
      expect(state.products).not.toContain(3);
    });

    test('toggleModeOfDeliveryFilter toggles mode correctly', () => {
      state.modes_of_delivery = ['online'];
      const action = { payload: 'paper' };

      baseFiltersReducers.toggleModeOfDeliveryFilter(state, action);

      expect(state.modes_of_delivery).toContain('paper');
    });
  });

  describe('Remove Actions', () => {
    test('removeSubjectFilter removes specific subject', () => {
      state.subjects = ['CM2', 'SA1', 'CB1'];
      const action = { payload: 'SA1' };

      baseFiltersReducers.removeSubjectFilter(state, action);

      expect(state.subjects).toEqual(['CM2', 'CB1']);
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });

    test('removeCategoryFilter removes specific category', () => {
      state.categories = ['Bundle', 'Core Reading'];
      const action = { payload: 'Bundle' };

      baseFiltersReducers.removeCategoryFilter(state, action);

      expect(state.categories).toEqual(['Core Reading']);
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });

    test('removeProductTypeFilter removes specific product type', () => {
      state.product_types = ['EBOOK', 'PRINTED'];
      const action = { payload: 'EBOOK' };

      baseFiltersReducers.removeProductTypeFilter(state, action);

      expect(state.product_types).toEqual(['PRINTED']);
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });

    test('removeProductFilter removes specific product', () => {
      state.products = [1, 2, 3];
      const action = { payload: 2 };

      baseFiltersReducers.removeProductFilter(state, action);

      expect(state.products).toEqual([1, 3]);
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });

    test('removeModeOfDeliveryFilter removes specific mode', () => {
      state.modes_of_delivery = ['online', 'paper', 'digital'];
      const action = { payload: 'paper' };

      baseFiltersReducers.removeModeOfDeliveryFilter(state, action);

      expect(state.modes_of_delivery).toEqual(['online', 'digital']);
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });
  });

  describe('Clear Actions', () => {
    test('clearFilterType clears specific filter type', () => {
      state.subjects = ['CM2', 'SA1'];
      state.categories = ['Bundle'];

      let action = { payload: 'subjects' };
      baseFiltersReducers.clearFilterType(state, action);

      expect(state.subjects).toEqual([]);
      expect(state.categories).toEqual(['Bundle']); // Other filters preserved
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });

    test('clearAllFilters resets all base filters to initial state', () => {
      state.subjects = ['CM2'];
      state.categories = ['Bundle'];
      state.product_types = ['EBOOK'];
      state.products = [1, 2];
      state.modes_of_delivery = ['online'];
      state.searchQuery = 'test query';
      state.searchFilterProductIds = [3, 4];
      state.currentPage = 5;

      baseFiltersReducers.clearAllFilters(state);

      expect(state.subjects).toEqual([]);
      expect(state.categories).toEqual([]);
      expect(state.product_types).toEqual([]);
      expect(state.products).toEqual([]);
      expect(state.modes_of_delivery).toEqual([]);
      expect(state.searchQuery).toBe('');
      expect(state.searchFilterProductIds).toEqual([]);
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });
  });

  describe('Multi-Update', () => {
    test('setMultipleFilters updates multiple filters at once', () => {
      const action = {
        payload: {
          subjects: ['CM2'],
          categories: ['Bundle'],
          product_types: ['EBOOK']
        }
      };

      baseFiltersReducers.setMultipleFilters(state, action);

      expect(state.subjects).toEqual(['CM2']);
      expect(state.categories).toEqual(['Bundle']);
      expect(state.product_types).toEqual(['EBOOK']);
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });
  });

  describe('Pagination', () => {
    test('setCurrentPage updates currentPage', () => {
      state.currentPage = 1;
      const action = { payload: 3 };

      baseFiltersReducers.setCurrentPage(state, action);

      expect(state.currentPage).toBe(3);
    });

    test('setPageSize updates pageSize and resets currentPage to 1', () => {
      state.pageSize = 20;
      state.currentPage = 5;
      const action = { payload: 50 };

      baseFiltersReducers.setPageSize(state, action);

      expect(state.pageSize).toBe(50);
      expect(state.currentPage).toBe(1); // Reset to first page
    });
  });

  describe('UI Actions', () => {
    test('toggleFilterPanel toggles isFilterPanelOpen', () => {
      state.isFilterPanelOpen = false;

      baseFiltersReducers.toggleFilterPanel(state);
      expect(state.isFilterPanelOpen).toBe(true);

      baseFiltersReducers.toggleFilterPanel(state);
      expect(state.isFilterPanelOpen).toBe(false);
    });

    test('setFilterPanelOpen sets isFilterPanelOpen to specific value', () => {
      state.isFilterPanelOpen = false;
      const action = { payload: true };

      baseFiltersReducers.setFilterPanelOpen(state, action);

      expect(state.isFilterPanelOpen).toBe(true);
    });
  });

  describe('Loading/Error', () => {
    test('setLoading updates isLoading', () => {
      state.isLoading = false;
      const action = { payload: true };

      baseFiltersReducers.setLoading(state, action);

      expect(state.isLoading).toBe(true);
    });

    test('setError sets error and sets isLoading to false', () => {
      state.isLoading = true;
      state.error = null;
      const action = { payload: 'An error occurred' };

      baseFiltersReducers.setError(state, action);

      expect(state.error).toBe('An error occurred');
      expect(state.isLoading).toBe(false);
    });

    test('clearError clears error state', () => {
      state.error = 'Some error';

      baseFiltersReducers.clearError(state);

      expect(state.error).toBeNull();
    });
  });

  describe('Utility', () => {
    test('resetFilters resets all filters to initial state', () => {
      state.subjects = ['CM2'];
      state.error = 'Some error';
      state.currentPage = 5;

      baseFiltersReducers.resetFilters(state);

      expect(state.subjects).toEqual([]);
      expect(state.error).toBeNull();
      expect(state.currentPage).toBe(1);
      expect(state.lastUpdated).toBeTruthy();
    });

    test('applyFilters caches current filter state', () => {
      state.subjects = ['CM2'];
      state.categories = ['Bundle'];
      state.searchQuery = 'test';

      baseFiltersReducers.applyFilters(state);

      expect(state.appliedFilters).toEqual({
        subjects: ['CM2'],
        categories: ['Bundle'],
        product_types: [],
        products: [],
        modes_of_delivery: [],
        searchQuery: 'test'
      });
      expect(state.lastUpdated).toBeTruthy();
    });

    test('setFilterCounts updates filterCounts', () => {
      const action = {
        payload: {
          subjects: { 'CM2': 10, 'SA1': 5 },
          categories: { 'Bundle': 3 }
        }
      };

      baseFiltersReducers.setFilterCounts(state, action);

      expect(state.filterCounts).toEqual({
        subjects: { 'CM2': 10, 'SA1': 5 },
        categories: { 'Bundle': 3 }
      });
    });

    test('All filter changes update lastUpdated timestamp', () => {
      const beforeTimestamp = Date.now();

      // Test a few different actions
      baseFiltersReducers.setSubjects(state, { payload: ['CM2'] });
      expect(state.lastUpdated).toBeGreaterThanOrEqual(beforeTimestamp);

      const firstTimestamp = state.lastUpdated;

      // Small delay to ensure different timestamp
      setTimeout(() => {
        baseFiltersReducers.toggleCategoryFilter(state, { payload: 'Bundle' });
        expect(state.lastUpdated).toBeGreaterThanOrEqual(firstTimestamp);
      }, 10);
    });
  });
});
