import { createSelector } from '@reduxjs/toolkit';

// Root state type - uses any for filters to avoid circular dependency with store/index.ts
interface RootStateWithFilters {
  filters: any;
}

// === Generic selectors over the byKey/scalar bags ===

export const selectFilterValues = (filterKey: string) => (state: RootStateWithFilters) =>
  state.filters.byKey[filterKey] ?? [];

export const selectFilterScalar = (filterKey: string) => (state: RootStateWithFilters) =>
  state.filters.scalar[filterKey] ?? null;

export const selectAllFilters = (state: RootStateWithFilters) => state.filters.byKey;
export const selectAllScalars = (state: RootStateWithFilters) => state.filters.scalar;
export const selectFilterCounts = (state: RootStateWithFilters) => state.filters.filterCounts;

export const selectActiveFilterCount = createSelector(
  [selectAllFilters, selectAllScalars],
  (byKey: Record<string, string[]>, scalar: Record<string, any>) =>
    Object.values(byKey).reduce((n: number, v: string[]) => n + v.length, 0) +
    Object.values(scalar).filter((v: any) => v !== null && v !== '').length,
);

// === UI / pagination passthroughs ===

export const selectCurrentPage = (state: RootStateWithFilters): number => state.filters.currentPage;
export const selectPageSize = (state: RootStateWithFilters): number => state.filters.pageSize;
export const selectIsLoading = (state: RootStateWithFilters): boolean => state.filters.isLoading;
export const selectError = (state: RootStateWithFilters): string | null => state.filters.error;
export const selectIsFilterPanelOpen = (state: RootStateWithFilters): boolean => state.filters.isFilterPanelOpen;
