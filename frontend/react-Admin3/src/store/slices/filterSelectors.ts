import { createSelector } from '@reduxjs/toolkit';

// Root state type - uses any for filters to avoid circular dependency with store/index.ts
interface RootStateWithFilters {
  filters: any;
}

// === Generic selectors over the byKey/scalar bags ===

export const selectFilterValues = (filterKey: string) => (state: RootStateWithFilters) =>
  state.filters.byKey?.[filterKey] ?? [];

export const selectFilterScalar = (filterKey: string) => (state: RootStateWithFilters) =>
  state.filters.scalar?.[filterKey] ?? null;

export const selectAllFilters = (state: RootStateWithFilters) => state.filters.byKey ?? {};
export const selectAllScalars = (state: RootStateWithFilters) => state.filters.scalar ?? {};
export const selectFilterCounts = (state: RootStateWithFilters) =>
  state.filters.filterCounts ?? {};

export const selectActiveFilterCount = createSelector(
  (state: RootStateWithFilters) => state.filters,
  (filters: any): number => {
    // Support both new byKey/scalar shape and legacy flat shape
    if (filters.byKey !== undefined || filters.scalar !== undefined) {
      const byKey: Record<string, string[]> = filters.byKey ?? {};
      const scalar: Record<string, any> = filters.scalar ?? {};
      return (
        Object.values(byKey).reduce((n: number, v: string[]) => n + (Array.isArray(v) ? v.length : 0), 0) +
        Object.values(scalar).filter((v: any) => v !== null && v !== '' && String(v).trim() !== '').length
      );
    }
    // Legacy flat shape
    const legacyKeys = ['subjects', 'categories', 'product_types', 'products', 'modes_of_delivery'];
    let count = legacyKeys.reduce((n, k) => {
      const vals = filters[k];
      return n + (Array.isArray(vals) ? vals.length : 0);
    }, 0);
    const sq = filters.searchQuery;
    if (sq && String(sq).trim()) count += 1;
    return count;
  },
);

// === UI / pagination passthroughs ===

export const selectCurrentPage = (state: RootStateWithFilters): number =>
  state.filters.currentPage ?? 1;
export const selectPageSize = (state: RootStateWithFilters): number =>
  state.filters.pageSize ?? 20;
export const selectIsLoading = (state: RootStateWithFilters): boolean =>
  state.filters.isLoading ?? false;
export const selectError = (state: RootStateWithFilters): string | null =>
  state.filters.error ?? null;
export const selectIsFilterPanelOpen = (state: RootStateWithFilters): boolean =>
  state.filters.isFilterPanelOpen ?? false;

// =========================================================
// Filter configuration boot gate
// =========================================================
// The registry no longer self-registers at module load (see
// docs/to-dos/filter-registry-architecture-debt.md). App.js fetches
// /api/products/filter-configuration/ on mount and calls
// FilterRegistry.registerFromBackend(...). UI that depends on the
// registry (FilterPanel, ProductList) renders a spinner until the
// boot is complete — either success or error.
export const selectFilterConfigurationLoading = (state: RootStateWithFilters): boolean =>
  state.filters.filterConfigurationLoading ?? false;

export const selectFilterConfigurationError = (state: RootStateWithFilters): string | null =>
  state.filters.filterConfigurationError ?? null;

export const selectFilterConfiguration = (state: RootStateWithFilters): any =>
  state.filters.filterConfiguration ?? null;

/**
 * True once the backend boot has either succeeded (filterConfiguration set)
 * or failed (filterConfigurationError set). The UI uses this as the gate to
 * render filter-dependent components.
 */
export const selectFilterConfigurationLoaded = (state: RootStateWithFilters): boolean =>
  state.filters.filterConfiguration !== null
  || state.filters.filterConfigurationError !== null;

// =========================================================
// Deprecated per-dimension selectors (shims)
// These read from the legacy flat fields (with byKey/scalar fallback).
// Deletable in a follow-up PR once all call sites are migrated to
// selectFilterValues(key) / selectFilterScalar(key).
// =========================================================

/** @deprecated Use selectFilterValues('subjects') */
export const selectSubjects = (state: RootStateWithFilters): string[] =>
  state.filters.subjects ?? state.filters.byKey?.subjects ?? [];

/** @deprecated Use selectFilterValues('categories') */
export const selectCategories = (state: RootStateWithFilters): string[] =>
  state.filters.categories ?? state.filters.byKey?.categories ?? [];

/** @deprecated Use selectFilterValues('product_types') */
export const selectProductTypes = (state: RootStateWithFilters): string[] =>
  state.filters.product_types ?? state.filters.byKey?.product_types ?? [];

/** @deprecated Use selectFilterValues('programme_type') */
export const selectProgrammeType = (state: RootStateWithFilters): string[] =>
  state.filters.programme_type ?? state.filters.byKey?.programme_type ?? [];

/** @deprecated Use selectFilterValues('products') */
export const selectProducts = (state: RootStateWithFilters): string[] =>
  state.filters.products ?? state.filters.byKey?.products ?? [];

/** @deprecated Use selectFilterValues('modes_of_delivery') */
export const selectModesOfDelivery = (state: RootStateWithFilters): string[] =>
  state.filters.modes_of_delivery ?? state.filters.byKey?.modes_of_delivery ?? [];

/** @deprecated Use selectFilterScalar('searchQuery') */
export const selectSearchQuery = (state: RootStateWithFilters): string =>
  state.filters.searchQuery ?? state.filters.scalar?.searchQuery ?? '';

/** @deprecated Use selectFilterValues + selectFilterScalar individually */
export const selectSearchFilterProductIds = (state: RootStateWithFilters): string[] =>
  state.filters.searchFilterProductIds ?? [];

/** @deprecated Use selectFilterCounts */
export const selectAppliedFilters = (state: RootStateWithFilters): any =>
  state.filters.appliedFilters ?? null;

/** @deprecated */
export const selectLastUpdated = (state: RootStateWithFilters): any =>
  state.filters.lastUpdated ?? null;

/** @deprecated */
export const selectValidationErrors = (state: RootStateWithFilters): any[] =>
  state.filters.validationErrors ?? [];

/** @deprecated */
export const selectHasValidationErrors = (state: RootStateWithFilters): boolean => {
  const errors: any[] = state.filters.validationErrors ?? [];
  return errors.some((e: any) => e?.severity === 'error');
};

/**
 * @deprecated Build from selectAllFilters + selectAllScalars.
 *
 * Returns the legacy filter object shape used by ProductList, FilterPanel, etc.
 * Reads legacy flat fields first (populated by legacy reducers), falls back to byKey/scalar.
 */
export const selectFilters = createSelector(
  (state: RootStateWithFilters) => state.filters,
  (filters: any) => ({
    subjects: filters.subjects ?? filters.byKey?.subjects ?? [],
    categories: filters.categories ?? filters.byKey?.categories ?? [],
    product_types: filters.product_types ?? filters.byKey?.product_types ?? [],
    products: filters.products ?? filters.byKey?.products ?? [],
    modes_of_delivery: filters.modes_of_delivery ?? filters.byKey?.modes_of_delivery ?? [],
    searchQuery: filters.searchQuery ?? filters.scalar?.searchQuery ?? '',
  }),
);

/**
 * @deprecated Use selectActiveFilterCount > 0.
 */
export const selectHasActiveFilters = createSelector(
  (state: RootStateWithFilters) => state.filters,
  (filters: any): boolean => {
    const subjects = filters.subjects ?? filters.byKey?.subjects ?? [];
    const categories = filters.categories ?? filters.byKey?.categories ?? [];
    const product_types = filters.product_types ?? filters.byKey?.product_types ?? [];
    const products = filters.products ?? filters.byKey?.products ?? [];
    const modes_of_delivery = filters.modes_of_delivery ?? filters.byKey?.modes_of_delivery ?? [];
    const searchQuery = filters.searchQuery ?? filters.scalar?.searchQuery ?? '';

    return (
      subjects.length > 0 ||
      categories.length > 0 ||
      product_types.length > 0 ||
      products.length > 0 ||
      modes_of_delivery.length > 0 ||
      (typeof searchQuery === 'string' && searchQuery.trim().length > 0)
    );
  },
);

/**
 * @deprecated Use selectActiveFilterCount + selectHasActiveFilters.
 */
export const selectActiveFilterSummary = createSelector(
  (state: RootStateWithFilters) => state.filters,
  (filters: any) => {
    const subjects = filters.subjects ?? filters.byKey?.subjects ?? [];
    const categories = filters.categories ?? filters.byKey?.categories ?? [];
    const product_types = filters.product_types ?? filters.byKey?.product_types ?? [];
    const products = filters.products ?? filters.byKey?.products ?? [];
    const modes_of_delivery = filters.modes_of_delivery ?? filters.byKey?.modes_of_delivery ?? [];
    const searchQuery = filters.searchQuery ?? filters.scalar?.searchQuery ?? '';

    const totalCount =
      subjects.length +
      categories.length +
      product_types.length +
      products.length +
      modes_of_delivery.length +
      (typeof searchQuery === 'string' && searchQuery.trim().length > 0 ? 1 : 0);

    return {
      subjects,
      categories,
      product_types,
      products,
      modes_of_delivery,
      searchQuery,
      totalCount,
      hasFilters: totalCount > 0,
    };
  },
);
