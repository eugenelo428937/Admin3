/**
 * Filters Redux Slice (Story 1.14 - Refactored)
 *
 * FACADE MODULE - Combines base filters, navigation filters, and selectors.
 * Maintains 100% backward compatibility via re-exports.
 *
 * Module Structure:
 * - baseFilters.slice.js: Core filter state and operations
 * - navigationFilters.slice.js: Navigation-specific drill-down actions
 * - filterSelectors.js: All selectors for accessing filter state
 * - filtersSlice.js (this file): Main facade that combines everything
 *
 * IMPORTANT: This file adds FilterValidator integration on top of base modules.
 */

import { createSlice } from '@reduxjs/toolkit';
import FilterValidator from '../filters/filterValidator';
import { baseFiltersInitialState, baseFiltersReducers } from './baseFilters.slice';
import { navigationFiltersReducers } from './navigationFilters.slice';

/**
 * Create the main filters slice
 * Combines base filters + navigation filters + validation logic
 */
const filtersSlice = createSlice({
  name: 'filters',
  initialState: baseFiltersInitialState,
  reducers: {
    // ========================================
    // Base Filter Reducers
    // ========================================
    // Spread all base filter reducers and add validation
    ...Object.fromEntries(
      Object.entries(baseFiltersReducers).map(([key, reducer]) => {
        // Actions that should trigger validation after execution
        const validationTriggers = [
          'setSubjects',
          'setCategories',
          'setProductTypes',
          'setProducts',
          'setModesOfDelivery',
          'setMultipleFilters',
          'toggleSubjectFilter',
          'toggleCategoryFilter',
          'toggleProductTypeFilter',
          'toggleProductFilter',
          'toggleModeOfDeliveryFilter',
          'removeSubjectFilter',
          'removeCategoryFilter',
          'removeProductTypeFilter',
          'removeProductFilter',
          'removeModeOfDeliveryFilter',
          'clearFilterType'
        ];

        // Wrap reducer with validation logic if it's a validation trigger
        if (validationTriggers.includes(key)) {
          return [
            key,
            (state, action) => {
              reducer(state, action);
              // Auto-validate after filter change (Story 1.12)
              state.validationErrors = FilterValidator.validate(state);
            }
          ];
        }

        // Return unwrapped reducer for non-validation actions
        return [key, reducer];
      })
    ),

    // ========================================
    // Navigation Filter Reducers
    // ========================================
    // Spread all navigation filter reducers and add validation
    ...Object.fromEntries(
      Object.entries(navigationFiltersReducers).map(([key, reducer]) => [
        key,
        (state, action) => {
          reducer(state, action);
          // Auto-validate after navigation filter change (Story 1.12)
          state.validationErrors = FilterValidator.validate(state);
        }
      ])
    ),

    // ========================================
    // Validation Actions (Story 1.12)
    // ========================================
    // These are specific to the main slice and not in base modules

    /**
     * validateFilters
     * Manually trigger filter validation
     */
    validateFilters: (state) => {
      const errors = FilterValidator.validate(state);
      state.validationErrors = errors;
    },

    // clearValidationErrors is already in baseFiltersReducers
    // No need to redefine it here
  },
});

// ========================================
// Export Actions
// ========================================
// Re-export ALL actions from the slice (base + navigation + validation)
export const {
  // Base filter actions - Set
  setSubjects,
  setCategories,
  setProductTypes,
  setProducts,
  setModesOfDelivery,
  setSearchQuery,
  setSearchFilterProductIds,
  setMultipleFilters,

  // Navbar filter actions (Story 1.2)
  setTutorialFormat,
  setDistanceLearning,
  setTutorial,

  // Base filter actions - Toggle
  toggleSubjectFilter,
  toggleCategoryFilter,
  toggleProductTypeFilter,
  toggleProductFilter,
  toggleModeOfDeliveryFilter,

  // Base filter actions - Remove
  removeSubjectFilter,
  removeCategoryFilter,
  removeProductTypeFilter,
  removeProductFilter,
  removeModeOfDeliveryFilter,

  // Base filter actions - Clear
  clearFilterType,
  clearAllFilters,

  // Base filter actions - Pagination
  setCurrentPage,
  setPageSize,

  // Base filter actions - UI
  toggleFilterPanel,
  setFilterPanelOpen,

  // Base filter actions - Loading/Error
  setLoading,
  setError,
  clearError,

  // Base filter actions - Utility
  resetFilters,
  applyFilters,
  setFilterCounts,
  clearValidationErrors,

  // Navigation filter actions
  navSelectSubject,
  navViewAllProducts,
  navSelectProductGroup,
  navSelectProduct,
  navSelectModeOfDelivery,

  // Validation actions (main slice only)
  validateFilters,
} = filtersSlice.actions;

// ========================================
// Export Selectors
// ========================================
// Re-export ALL selectors from filterSelectors.js

export {
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
  selectActiveFilterSummary,
} from './filterSelectors';

// ========================================
// Export Reducer
// ========================================
export default filtersSlice.reducer;
