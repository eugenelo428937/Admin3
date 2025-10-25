/**
 * Navigation Filters Module (Story 1.14)
 *
 * Navigation-specific filter actions for navbar drill-down UX.
 * These actions clear existing filters and set new ones for drill-down navigation.
 *
 * Contract: specs/007-docs-stories-story/contracts/navigationFilters-module-contract.md
 *
 * NOTE: This module operates on the base filter state.
 * It does NOT have separate state - it uses baseFiltersInitialState.
 */

/**
 * Navigation filter reducers
 * Special behaviors for navigation menu interactions (drill-down UX)
 * All reducers use Immer draft syntax (Redux Toolkit default)
 */
export const navigationFiltersReducers = {
  /**
   * navSelectSubject
   * Triggered when user clicks a subject in the navigation menu
   * Behavior: Clear existing subjects, set new single subject
   * Preserves: All other filters unchanged
   */
  navSelectSubject: (state, action) => {
    // Clear existing subjects, then set new subject
    state.subjects = [action.payload];
    state.currentPage = 1;
    state.lastUpdated = Date.now();
  },

  /**
   * navViewAllProducts
   * Triggered when user clicks "View All Products" in navigation
   * Behavior: Clear all filters EXCEPT subjects
   * Preserves: subjects array
   */
  navViewAllProducts: (state) => {
    // Clear all filters except subjects
    state.products = [];
    state.categories = [];
    state.product_types = [];
    state.modes_of_delivery = [];
    state.searchQuery = '';
    state.currentPage = 1;
    state.lastUpdated = Date.now();
  },

  /**
   * navSelectProductGroup
   * Triggered when user clicks a product group/type in navigation
   * Behavior: Clear all except subjects, then filter by Product Type
   * Preserves: subjects array
   */
  navSelectProductGroup: (state, action) => {
    // Clear all except subjects, then filter by Product Type
    state.products = [];
    state.categories = [];
    state.product_types = [action.payload];
    state.modes_of_delivery = [];
    state.searchQuery = '';
    state.currentPage = 1;
    state.lastUpdated = Date.now();
  },

  /**
   * navSelectProduct
   * Triggered when user clicks a specific product in navigation
   * Behavior: Clear all except subjects, then filter by Product
   * Preserves: subjects array
   */
  navSelectProduct: (state, action) => {
    // Clear all except subjects, then filter by Product
    state.categories = [];
    state.product_types = [];
    state.products = [action.payload];
    state.modes_of_delivery = [];
    state.searchQuery = '';
    state.currentPage = 1;
    state.lastUpdated = Date.now();
  },

  /**
   * navSelectModeOfDelivery
   * Triggered when user clicks a mode of delivery in navigation
   * Behavior: Clear all except subjects, then filter by Mode of Delivery
   * Preserves: subjects array
   */
  navSelectModeOfDelivery: (state, action) => {
    // Clear all except subjects, then filter by Mode of Delivery
    state.categories = [];
    state.product_types = [];
    state.products = [];
    state.modes_of_delivery = [action.payload];
    state.searchQuery = '';
    state.currentPage = 1;
    state.lastUpdated = Date.now();
  },
};
