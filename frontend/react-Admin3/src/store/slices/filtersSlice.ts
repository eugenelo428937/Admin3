import { createSlice } from '@reduxjs/toolkit';
import { baseFiltersInitialState, baseFiltersReducers } from './baseFilters.slice';

const filtersSlice = createSlice({
  name: 'filters',
  initialState: baseFiltersInitialState,
  reducers: {
    ...baseFiltersReducers,
  },
});

export const {
  // === Generic actions (new API) ===
  setFilter,
  toggleFilter,
  removeFilter,
  clearFilterKey,
  clearAllFilters,
  resetFilters,
  setScalar,
  setMultipleFilters,
  applyFilters,
  setFilterCounts,
  setCurrentPage,
  setPageSize,
  setIsFilterPanelOpen,
  setLoading,
  setError,
  navSelectFilter,

  // === Legacy actions (deprecated — shim wrappers, deletable after migration) ===
  setSubjects,
  toggleSubjectFilter,
  removeSubjectFilter,
  setCategories,
  toggleCategoryFilter,
  removeCategoryFilter,
  setProductTypes,
  toggleProductTypeFilter,
  removeProductTypeFilter,
  setProgrammeTypes,
  toggleProgrammeTypeFilter,
  removeProgrammeTypeFilter,
  setProducts,
  toggleProductFilter,
  removeProductFilter,
  setModesOfDelivery,
  toggleModeOfDeliveryFilter,
  removeModeOfDeliveryFilter,
  setSearchQuery,
  navSelectSubject,
  navViewAllProducts,
  navSelectProductGroup,
  navSelectProduct,
  navSelectModeOfDelivery,
  toggleFilterPanel,
  setFilterPanelOpen,
  clearError,
  clearFilterType,
  clearValidationErrors,
  validateFilters,

  // === Filter configuration (backend boot) ===
  setFilterConfiguration,
  setFilterConfigurationLoading,
  setFilterConfigurationError,

  // === Search-driven product-id list (used by useActiveFiltersVM) ===
  setSearchFilterProductIds,
} = filtersSlice.actions;

export default filtersSlice.reducer;

// Selector re-exports so callers can import from a single location
export {
  selectFilterValues,
  selectFilterScalar,
  selectAllFilters,
  selectAllScalars,
  selectFilterCounts,
  selectActiveFilterCount,
  selectCurrentPage,
  selectPageSize,
  selectIsLoading,
  selectError,
  selectIsFilterPanelOpen,
  // Legacy / deprecated selectors
  selectSubjects,
  selectCategories,
  selectProductTypes,
  selectProgrammeType,
  selectProducts,
  selectModesOfDelivery,
  selectSearchQuery,
  selectSearchFilterProductIds,
  selectAppliedFilters,
  selectLastUpdated,
  selectValidationErrors,
  selectHasValidationErrors,
  selectFilters,
  selectHasActiveFilters,
  selectActiveFilterSummary,
  // Boot gate
  selectFilterConfiguration,
  selectFilterConfigurationLoading,
  selectFilterConfigurationError,
  selectFilterConfigurationLoaded,
} from './filterSelectors';

// Legacy shim re-exports — deletable in a follow-up PR
export * from './filtersSlice.legacy';
