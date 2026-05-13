/**
 * Generic byKey filter state.
 *
 * Replaces the per-dimension state (subjects/categories/product_types/…)
 * and named reducers (setSubjects, toggleSubjectFilter, …) with three
 * generic actions over a Record<filterKey, string[]> bag.
 *
 * Legacy action names (setSubjects, etc.) are re-exported from
 * filtersSlice.legacy.ts as thin wrappers for backward compatibility.
 * That shim is deletable in a follow-up PR once all call sites have
 * been migrated to the generic actions.
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FilterCounts {
  [filterKey: string]: Record<string, { count: number; name: string }>;
}

export interface BaseFiltersState {
  byKey: Record<string, string[]>;
  scalar: Record<string, string | null>;
  appliedFilters: { byKey: Record<string, string[]>; scalar: Record<string, string | null> };
  currentPage: number;
  pageSize: number;
  isFilterPanelOpen: boolean;
  isLoading: boolean;
  error: string | null;
  filterCounts: FilterCounts;
  lastUpdated: number | null;
}

export const baseFiltersInitialState: BaseFiltersState = {
  byKey: {},
  scalar: {},
  appliedFilters: { byKey: {}, scalar: {} },
  currentPage: 1,
  pageSize: 20,
  isFilterPanelOpen: false,
  isLoading: false,
  error: null,
  filterCounts: {},
  lastUpdated: null,
};

const stamp = (state: BaseFiltersState) => {
  state.currentPage = 1;
  state.lastUpdated = Date.now();
};

export const baseFiltersReducers = {
  setFilter: (
    state: BaseFiltersState,
    action: PayloadAction<{ filterKey: string; values: string[] }>,
  ) => {
    const { filterKey, values } = action.payload;
    state.byKey[filterKey] = values;
    stamp(state);
  },

  toggleFilter: (
    state: BaseFiltersState,
    action: PayloadAction<{ filterKey: string; value: string }>,
  ) => {
    const { filterKey, value } = action.payload;
    const current = state.byKey[filterKey] ?? [];
    const idx = current.indexOf(value);
    if (idx === -1) {
      state.byKey[filterKey] = [...current, value];
    } else {
      state.byKey[filterKey] = current.filter(v => v !== value);
    }
    stamp(state);
  },

  removeFilter: (
    state: BaseFiltersState,
    action: PayloadAction<{ filterKey: string; value: string }>,
  ) => {
    const { filterKey, value } = action.payload;
    const current = state.byKey[filterKey] ?? [];
    state.byKey[filterKey] = current.filter(v => v !== value);
    stamp(state);
  },

  clearFilterKey: (state: BaseFiltersState, action: PayloadAction<string>) => {
    delete state.byKey[action.payload];
    delete state.scalar[action.payload];
    stamp(state);
  },

  clearAllFilters: (state: BaseFiltersState) => {
    state.byKey = {};
    state.scalar = {};
    stamp(state);
  },

  resetFilters: (state: BaseFiltersState) => {
    Object.assign(state, baseFiltersInitialState, { lastUpdated: Date.now() });
  },

  setScalar: (
    state: BaseFiltersState,
    action: PayloadAction<{ filterKey: string; value: string | null }>,
  ) => {
    const { filterKey, value } = action.payload;
    if (value === null || value === '') {
      delete state.scalar[filterKey];
    } else {
      state.scalar[filterKey] = value;
    }
    stamp(state);
  },

  setMultipleFilters: (
    state: BaseFiltersState,
    action: PayloadAction<{ byKey?: Record<string, string[]>; scalar?: Record<string, string | null> }>,
  ) => {
    if (action.payload.byKey) state.byKey = { ...action.payload.byKey };
    if (action.payload.scalar) state.scalar = { ...action.payload.scalar };
    stamp(state);
  },

  applyFilters: (state: BaseFiltersState) => {
    state.appliedFilters = {
      byKey: { ...state.byKey },
      scalar: { ...state.scalar },
    };
    state.lastUpdated = Date.now();
  },

  setFilterCounts: (state: BaseFiltersState, action: PayloadAction<FilterCounts>) => {
    state.filterCounts = action.payload;
  },

  setCurrentPage: (state: BaseFiltersState, action: PayloadAction<number>) => {
    state.currentPage = action.payload;
  },

  setPageSize: (state: BaseFiltersState, action: PayloadAction<number>) => {
    state.pageSize = action.payload;
  },

  setIsFilterPanelOpen: (state: BaseFiltersState, action: PayloadAction<boolean>) => {
    state.isFilterPanelOpen = action.payload;
  },

  setLoading: (state: BaseFiltersState, action: PayloadAction<boolean>) => {
    state.isLoading = action.payload;
  },

  setError: (state: BaseFiltersState, action: PayloadAction<string | null>) => {
    state.error = action.payload;
  },

  navSelectFilter: (
    state: BaseFiltersState,
    action: PayloadAction<{ filterKey: string; value: string; preserve?: string[] }>,
  ) => {
    const { filterKey, value, preserve = [] } = action.payload;
    const preserveSet = new Set(preserve);
    // Clear everything except preserved keys
    for (const k of Object.keys(state.byKey)) {
      if (!preserveSet.has(k)) state.byKey[k] = [];
    }
    state.byKey[filterKey] = [value];
    stamp(state);
  },
};
