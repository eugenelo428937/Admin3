import { createSlice } from '@reduxjs/toolkit';
import { baseFiltersInitialState, baseFiltersReducers } from './baseFilters.slice';

const filtersSlice = createSlice({
  name: 'filters',
  initialState: baseFiltersInitialState,
  reducers: {
    ...baseFiltersReducers,
    // navSelectFilter added in Task 23
  },
});

export const {
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
} = filtersSlice.actions;

export default filtersSlice.reducer;
