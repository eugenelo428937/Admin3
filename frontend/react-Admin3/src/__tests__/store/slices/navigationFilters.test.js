/**
 * Navigation Filters Module Tests (Story 1.14)
 *
 * Tests for the navigation filters module - navbar-specific filter actions
 * Contract: specs/007-docs-stories-story/contracts/navigationFilters-module-contract.md
 *
 * TDD Phase: RED - These tests should FAIL until T006 implements the module
 */

import { navigationFiltersReducers } from '../../../store/slices/navigationFilters.slice';

describe('Navigation Filters Module', () => {
  let state;

  beforeEach(() => {
    // Mock base filter state (navigation reducers operate on base state)
    state = {
      subjects: [],
      categories: [],
      product_types: [],
      products: [],
      modes_of_delivery: [],
      searchQuery: '',
      currentPage: 1,
      lastUpdated: null
    };
  });

  describe('navSelectSubject', () => {
    test('sets subjects to single subject', () => {
      state.subjects = ['CM2', 'SA1'];
      const action = { payload: 'CB1' };

      navigationFiltersReducers.navSelectSubject(state, action);

      expect(state.subjects).toEqual(['CB1']);
    });

    test('preserves all other filters', () => {
      state.categories = ['Bundle'];
      state.product_types = ['EBOOK'];
      const action = { payload: 'CM2' };

      navigationFiltersReducers.navSelectSubject(state, action);

      expect(state.categories).toEqual(['Bundle']);
      expect(state.product_types).toEqual(['EBOOK']);
    });

    test('updates lastUpdated and resets currentPage', () => {
      const action = { payload: 'CM2' };

      navigationFiltersReducers.navSelectSubject(state, action);

      expect(state.lastUpdated).toBeTruthy();
      expect(state.currentPage).toBe(1);
    });
  });

  describe('navViewAllProducts', () => {
    test('clears products, categories, product_types, modes_of_delivery, searchQuery', () => {
      state.products = [1, 2];
      state.categories = ['Bundle'];
      state.product_types = ['EBOOK'];
      state.modes_of_delivery = ['online'];
      state.searchQuery = 'test';

      navigationFiltersReducers.navViewAllProducts(state);

      expect(state.products).toEqual([]);
      expect(state.categories).toEqual([]);
      expect(state.product_types).toEqual([]);
      expect(state.modes_of_delivery).toEqual([]);
      expect(state.searchQuery).toBe('');
    });

    test('preserves subjects', () => {
      state.subjects = ['CM2', 'SA1'];

      navigationFiltersReducers.navViewAllProducts(state);

      expect(state.subjects).toEqual(['CM2', 'SA1']);
    });

    test('updates lastUpdated and resets currentPage', () => {
      navigationFiltersReducers.navViewAllProducts(state);

      expect(state.lastUpdated).toBeTruthy();
      expect(state.currentPage).toBe(1);
    });
  });

  describe('navSelectProductGroup', () => {
    test('sets product_types to single type and clears others', () => {
      state.products = [1, 2];
      state.categories = ['Bundle'];
      state.modes_of_delivery = ['online'];
      state.searchQuery = 'test';
      const action = { payload: 'EBOOK' };

      navigationFiltersReducers.navSelectProductGroup(state, action);

      expect(state.product_types).toEqual(['EBOOK']);
      expect(state.products).toEqual([]);
      expect(state.categories).toEqual([]);
      expect(state.modes_of_delivery).toEqual([]);
      expect(state.searchQuery).toBe('');
    });

    test('preserves subjects', () => {
      state.subjects = ['CM2'];
      const action = { payload: 'EBOOK' };

      navigationFiltersReducers.navSelectProductGroup(state, action);

      expect(state.subjects).toEqual(['CM2']);
    });

    test('updates lastUpdated and resets currentPage', () => {
      const action = { payload: 'EBOOK' };

      navigationFiltersReducers.navSelectProductGroup(state, action);

      expect(state.lastUpdated).toBeTruthy();
      expect(state.currentPage).toBe(1);
    });
  });

  describe('navSelectProduct', () => {
    test('sets products to single product and clears others', () => {
      state.categories = ['Bundle'];
      state.product_types = ['EBOOK'];
      state.modes_of_delivery = ['online'];
      state.searchQuery = 'test';
      const action = { payload: 123 };

      navigationFiltersReducers.navSelectProduct(state, action);

      expect(state.products).toEqual([123]);
      expect(state.categories).toEqual([]);
      expect(state.product_types).toEqual([]);
      expect(state.modes_of_delivery).toEqual([]);
      expect(state.searchQuery).toBe('');
    });

    test('preserves subjects', () => {
      state.subjects = ['CM2'];
      const action = { payload: 123 };

      navigationFiltersReducers.navSelectProduct(state, action);

      expect(state.subjects).toEqual(['CM2']);
    });

    test('updates lastUpdated and resets currentPage', () => {
      const action = { payload: 123 };

      navigationFiltersReducers.navSelectProduct(state, action);

      expect(state.lastUpdated).toBeTruthy();
      expect(state.currentPage).toBe(1);
    });
  });

  describe('navSelectModeOfDelivery', () => {
    test('sets modes_of_delivery to single mode and clears others', () => {
      state.categories = ['Bundle'];
      state.product_types = ['EBOOK'];
      state.products = [1, 2];
      state.searchQuery = 'test';
      const action = { payload: 'online' };

      navigationFiltersReducers.navSelectModeOfDelivery(state, action);

      expect(state.modes_of_delivery).toEqual(['online']);
      expect(state.categories).toEqual([]);
      expect(state.product_types).toEqual([]);
      expect(state.products).toEqual([]);
      expect(state.searchQuery).toBe('');
    });

    test('preserves subjects', () => {
      state.subjects = ['CM2'];
      const action = { payload: 'online' };

      navigationFiltersReducers.navSelectModeOfDelivery(state, action);

      expect(state.subjects).toEqual(['CM2']);
    });

    test('updates lastUpdated and resets currentPage', () => {
      const action = { payload: 'online' };

      navigationFiltersReducers.navSelectModeOfDelivery(state, action);

      expect(state.lastUpdated).toBeTruthy();
      expect(state.currentPage).toBe(1);
    });
  });
});
