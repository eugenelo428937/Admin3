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
 *
 * BACKWARD COMPATIBILITY: The state shape includes both the new byKey/scalar
 * bags AND the legacy flat per-dimension fields (subjects, categories, etc.).
 * The legacy fields are kept in sync with byKey so existing code reading
 * state.filters.subjects continues to work. Delete in a follow-up PR.
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FilterCounts {
  [filterKey: string]: Record<string, { count: number; name: string }>;
}

// Legacy per-dimension keys that are mirrored into/from byKey
const LEGACY_ARRAY_KEYS = [
  'subjects',
  'categories',
  'product_types',
  'programme_type',
  'products',
  'modes_of_delivery',
] as const;

type LegacyArrayKey = typeof LEGACY_ARRAY_KEYS[number];

// Sync all legacy flat-field arrays into byKey (called after legacy mutations)
function syncLegacyToByKey(state: BaseFiltersState) {
  for (const key of LEGACY_ARRAY_KEYS) {
    const vals = (state as any)[key];
    if (Array.isArray(vals)) {
      state.byKey[key] = vals;
    }
  }
  if (typeof (state as any).searchQuery === 'string') {
    const sq = (state as any).searchQuery;
    if (sq) {
      state.scalar.searchQuery = sq;
    } else {
      delete state.scalar.searchQuery;
    }
  }
}

// Sync byKey back into legacy flat fields (called after generic mutations)
function syncByKeyToLegacy(state: BaseFiltersState) {
  for (const key of LEGACY_ARRAY_KEYS) {
    (state as any)[key] = state.byKey[key] ?? [];
  }
  const sq = state.scalar.searchQuery;
  (state as any).searchQuery = sq ?? '';
}

export interface BaseFiltersState {
  // === New generic bags ===
  byKey: Record<string, string[]>;
  scalar: Record<string, string | null>;
  appliedFilters: { byKey: Record<string, string[]>; scalar: Record<string, string | null> } | Record<string, any>;
  currentPage: number;
  pageSize: number;
  isFilterPanelOpen: boolean;
  isLoading: boolean;
  error: string | null;
  filterCounts: FilterCounts | Record<string, any>;
  lastUpdated: number | null;

  // === Legacy flat fields (deprecated — delete after migration) ===
  subjects: string[];
  categories: string[];
  product_types: string[];
  programme_type: string[];
  products: string[];
  modes_of_delivery: string[];
  searchQuery: string;
  searchFilterProductIds: string[];
  validationErrors: any[];
  filterConfiguration: any;
  filterConfigurationLoading: boolean;
  filterConfigurationError: string | null;
}

export const baseFiltersInitialState: BaseFiltersState = {
  // New bags
  byKey: {},
  scalar: {},
  appliedFilters: {},
  currentPage: 1,
  pageSize: 20,
  isFilterPanelOpen: false,
  isLoading: false,
  error: null,
  filterCounts: {},
  lastUpdated: null,

  // Legacy flat fields
  subjects: [],
  categories: [],
  product_types: [],
  programme_type: [],
  products: [],
  modes_of_delivery: [],
  searchQuery: '',
  searchFilterProductIds: [],
  validationErrors: [],
  filterConfiguration: null,
  filterConfigurationLoading: false,
  filterConfigurationError: null,
};

const stamp = (state: BaseFiltersState) => {
  state.currentPage = 1;
  state.lastUpdated = Date.now();
};

/**
 * Ensure byKey and scalar bags exist on state objects that may have been
 * created from the legacy flat shape (e.g., spread initialState in tests).
 * Immer proxies allow adding new keys, so this is safe inside a reducer.
 */
function ensureBags(state: BaseFiltersState) {
  if (!state.byKey) (state as any).byKey = {};
  if (!state.scalar) (state as any).scalar = {};
}

export const baseFiltersReducers = {
  // =========================================================
  // Generic actions (new API)
  // =========================================================
  setFilter: (
    state: BaseFiltersState,
    action: PayloadAction<{ filterKey: string; values: string[] }>,
  ) => {
    ensureBags(state);
    const { filterKey, values } = action.payload;
    state.byKey[filterKey] = values;
    syncByKeyToLegacy(state);
    stamp(state);
  },

  toggleFilter: (
    state: BaseFiltersState,
    action: PayloadAction<{ filterKey: string; value: string }>,
  ) => {
    ensureBags(state);
    const { filterKey, value } = action.payload;
    const current = state.byKey[filterKey] ?? [];
    const idx = current.indexOf(value);
    if (idx === -1) {
      state.byKey[filterKey] = [...current, value];
    } else {
      state.byKey[filterKey] = current.filter(v => v !== value);
    }
    syncByKeyToLegacy(state);
    stamp(state);
  },

  removeFilter: (
    state: BaseFiltersState,
    action: PayloadAction<{ filterKey: string; value: string }>,
  ) => {
    ensureBags(state);
    const { filterKey, value } = action.payload;
    const current = state.byKey[filterKey] ?? [];
    state.byKey[filterKey] = current.filter(v => v !== value);
    syncByKeyToLegacy(state);
    stamp(state);
  },

  clearFilterKey: (state: BaseFiltersState, action: PayloadAction<string>) => {
    ensureBags(state);
    delete state.byKey[action.payload];
    delete state.scalar[action.payload];
    syncByKeyToLegacy(state);
    stamp(state);
  },

  clearAllFilters: (state: BaseFiltersState) => {
    state.byKey = {};
    state.scalar = {};
    syncByKeyToLegacy(state);
    state.validationErrors = [];
    stamp(state);
  },

  resetFilters: (state: BaseFiltersState) => {
    Object.assign(state, baseFiltersInitialState, { lastUpdated: Date.now() });
  },

  setScalar: (
    state: BaseFiltersState,
    action: PayloadAction<{ filterKey: string; value: string | null }>,
  ) => {
    ensureBags(state);
    const { filterKey, value } = action.payload;
    if (value === null || value === '') {
      delete state.scalar[filterKey];
    } else {
      state.scalar[filterKey] = value;
    }
    syncByKeyToLegacy(state);
    stamp(state);
  },

  setMultipleFilters: (
    state: BaseFiltersState,
    action: PayloadAction<
      | { byKey?: Record<string, string[]>; scalar?: Record<string, string | null> }
      | Record<string, string[] | string>
    >,
  ) => {
    ensureBags(state);
    const payload = action.payload as any;
    // New generic form: { byKey, scalar }
    if (payload.byKey !== undefined || payload.scalar !== undefined) {
      if (payload.byKey) state.byKey = { ...payload.byKey };
      if (payload.scalar) state.scalar = { ...payload.scalar };
    } else {
      // Legacy form: { subjects: [...], categories: [...], searchQuery: '...' }
      for (const key of LEGACY_ARRAY_KEYS) {
        if (key in payload && Array.isArray(payload[key])) {
          state.byKey[key] = payload[key];
        }
      }
      if ('searchQuery' in payload && typeof payload.searchQuery === 'string') {
        if (payload.searchQuery) {
          state.scalar.searchQuery = payload.searchQuery;
        } else {
          delete state.scalar.searchQuery;
        }
      }
    }
    syncByKeyToLegacy(state);
    stamp(state);
  },

  applyFilters: (state: BaseFiltersState) => {
    ensureBags(state);
    // Build legacy-compatible applied filters snapshot.
    // Prefer byKey values; fall back to legacy flat fields for tests that
    // pass old-shape state (where byKey has not been populated yet).
    const legacySnapshot: Record<string, any> = {};
    for (const key of LEGACY_ARRAY_KEYS) {
      legacySnapshot[key] = state.byKey[key] ?? (state as any)[key] ?? [];
    }
    legacySnapshot.searchQuery =
      state.scalar.searchQuery ?? (state as any).searchQuery ?? '';
    state.appliedFilters = legacySnapshot;
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
    state.currentPage = 1;
  },

  setIsFilterPanelOpen: (state: BaseFiltersState, action: PayloadAction<boolean>) => {
    state.isFilterPanelOpen = action.payload;
  },

  setLoading: (state: BaseFiltersState, action: PayloadAction<boolean>) => {
    state.isLoading = action.payload;
  },

  setError: (state: BaseFiltersState, action: PayloadAction<string | null>) => {
    state.error = action.payload;
    state.isLoading = false;
  },

  navSelectFilter: (
    state: BaseFiltersState,
    action: PayloadAction<{ filterKey: string; value: string; preserve?: string[] }>,
  ) => {
    ensureBags(state);
    const { filterKey, value, preserve = [] } = action.payload;
    const preserveSet = new Set(preserve);
    // Clear everything except preserved keys
    for (const k of Object.keys(state.byKey)) {
      if (!preserveSet.has(k)) state.byKey[k] = [];
    }
    if (value !== '__keep__') {
      state.byKey[filterKey] = [value];
    }
    // Also clear scalar (searchQuery) unless it's preserved
    if (!preserveSet.has('searchQuery')) {
      delete state.scalar.searchQuery;
    }
    syncByKeyToLegacy(state);
    stamp(state);
  },

  // =========================================================
  // Legacy actions (deprecated — delete after migration)
  // =========================================================

  /** @deprecated Use setFilter({ filterKey: 'subjects', values }) */
  setSubjects: (state: BaseFiltersState, action: PayloadAction<string[]>) => {
    ensureBags(state);
    state.byKey.subjects = action.payload;
    (state as any).subjects = action.payload;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use toggleFilter({ filterKey: 'subjects', value }) */
  toggleSubjectFilter: (state: BaseFiltersState, action: PayloadAction<string>) => {
    ensureBags(state);
    const current = state.byKey.subjects ?? (state as any).subjects ?? [];
    const idx = current.indexOf(action.payload);
    const next = idx === -1 ? [...current, action.payload] : current.filter((v: string) => v !== action.payload);
    state.byKey.subjects = next;
    (state as any).subjects = next;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use removeFilter({ filterKey: 'subjects', value }) */
  removeSubjectFilter: (state: BaseFiltersState, action: PayloadAction<string>) => {
    ensureBags(state);
    const current = state.byKey.subjects ?? (state as any).subjects ?? [];
    const next = current.filter((v: string) => v !== action.payload);
    state.byKey.subjects = next;
    (state as any).subjects = next;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use setFilter({ filterKey: 'categories', values }) */
  setCategories: (state: BaseFiltersState, action: PayloadAction<string[]>) => {
    ensureBags(state);
    state.byKey.categories = action.payload;
    (state as any).categories = action.payload;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use toggleFilter({ filterKey: 'categories', value }) */
  toggleCategoryFilter: (state: BaseFiltersState, action: PayloadAction<string>) => {
    ensureBags(state);
    const current = state.byKey.categories ?? (state as any).categories ?? [];
    const idx = current.indexOf(action.payload);
    const next = idx === -1 ? [...current, action.payload] : current.filter((v: string) => v !== action.payload);
    state.byKey.categories = next;
    (state as any).categories = next;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use removeFilter({ filterKey: 'categories', value }) */
  removeCategoryFilter: (state: BaseFiltersState, action: PayloadAction<string>) => {
    ensureBags(state);
    const current = state.byKey.categories ?? (state as any).categories ?? [];
    const next = current.filter((v: string) => v !== action.payload);
    state.byKey.categories = next;
    (state as any).categories = next;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use setFilter({ filterKey: 'product_types', values }) */
  setProductTypes: (state: BaseFiltersState, action: PayloadAction<string[]>) => {
    ensureBags(state);
    state.byKey.product_types = action.payload;
    (state as any).product_types = action.payload;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use toggleFilter({ filterKey: 'product_types', value }) */
  toggleProductTypeFilter: (state: BaseFiltersState, action: PayloadAction<string>) => {
    ensureBags(state);
    const current = state.byKey.product_types ?? (state as any).product_types ?? [];
    const idx = current.indexOf(action.payload);
    const next = idx === -1 ? [...current, action.payload] : current.filter((v: string) => v !== action.payload);
    state.byKey.product_types = next;
    (state as any).product_types = next;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use removeFilter({ filterKey: 'product_types', value }) */
  removeProductTypeFilter: (state: BaseFiltersState, action: PayloadAction<string>) => {
    ensureBags(state);
    const current = state.byKey.product_types ?? (state as any).product_types ?? [];
    const next = current.filter((v: string) => v !== action.payload);
    state.byKey.product_types = next;
    (state as any).product_types = next;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use setFilter({ filterKey: 'programme_type', values }) */
  setProgrammeTypes: (state: BaseFiltersState, action: PayloadAction<string[]>) => {
    ensureBags(state);
    state.byKey.programme_type = action.payload;
    (state as any).programme_type = action.payload;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use toggleFilter({ filterKey: 'programme_type', value }) */
  toggleProgrammeTypeFilter: (state: BaseFiltersState, action: PayloadAction<string>) => {
    ensureBags(state);
    const current = state.byKey.programme_type ?? (state as any).programme_type ?? [];
    const idx = current.indexOf(action.payload);
    const next = idx === -1 ? [...current, action.payload] : current.filter((v: string) => v !== action.payload);
    state.byKey.programme_type = next;
    (state as any).programme_type = next;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use removeFilter({ filterKey: 'programme_type', value }) */
  removeProgrammeTypeFilter: (state: BaseFiltersState, action: PayloadAction<string>) => {
    ensureBags(state);
    const current = state.byKey.programme_type ?? (state as any).programme_type ?? [];
    const next = current.filter((v: string) => v !== action.payload);
    state.byKey.programme_type = next;
    (state as any).programme_type = next;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use setFilter({ filterKey: 'products', values }) */
  setProducts: (state: BaseFiltersState, action: PayloadAction<string[]>) => {
    ensureBags(state);
    state.byKey.products = action.payload;
    (state as any).products = action.payload;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use toggleFilter({ filterKey: 'products', value }) */
  toggleProductFilter: (state: BaseFiltersState, action: PayloadAction<string>) => {
    ensureBags(state);
    const current = state.byKey.products ?? (state as any).products ?? [];
    const idx = current.indexOf(action.payload);
    const next = idx === -1 ? [...current, action.payload] : current.filter((v: string) => v !== action.payload);
    state.byKey.products = next;
    (state as any).products = next;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use removeFilter({ filterKey: 'products', value }) */
  removeProductFilter: (state: BaseFiltersState, action: PayloadAction<string>) => {
    ensureBags(state);
    const current = state.byKey.products ?? (state as any).products ?? [];
    const next = current.filter((v: string) => v !== action.payload);
    state.byKey.products = next;
    (state as any).products = next;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use setFilter({ filterKey: 'modes_of_delivery', values }) */
  setModesOfDelivery: (state: BaseFiltersState, action: PayloadAction<string[]>) => {
    ensureBags(state);
    state.byKey.modes_of_delivery = action.payload;
    (state as any).modes_of_delivery = action.payload;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use toggleFilter({ filterKey: 'modes_of_delivery', value }) */
  toggleModeOfDeliveryFilter: (state: BaseFiltersState, action: PayloadAction<string>) => {
    ensureBags(state);
    const current = state.byKey.modes_of_delivery ?? (state as any).modes_of_delivery ?? [];
    const idx = current.indexOf(action.payload);
    const next = idx === -1 ? [...current, action.payload] : current.filter((v: string) => v !== action.payload);
    state.byKey.modes_of_delivery = next;
    (state as any).modes_of_delivery = next;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use removeFilter({ filterKey: 'modes_of_delivery', value }) */
  removeModeOfDeliveryFilter: (state: BaseFiltersState, action: PayloadAction<string>) => {
    ensureBags(state);
    const current = state.byKey.modes_of_delivery ?? (state as any).modes_of_delivery ?? [];
    const next = current.filter((v: string) => v !== action.payload);
    state.byKey.modes_of_delivery = next;
    (state as any).modes_of_delivery = next;
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use setScalar({ filterKey: 'searchQuery', value }) */
  setSearchQuery: (state: BaseFiltersState, action: PayloadAction<string>) => {
    ensureBags(state);
    const val = action.payload;
    (state as any).searchQuery = val;
    if (val) {
      state.scalar.searchQuery = val;
    } else {
      delete state.scalar.searchQuery;
    }
    stamp(state);
  },

  /** @deprecated Use navSelectFilter({ filterKey: 'subjects', value, preserve: [] }) */
  navSelectSubject: (state: BaseFiltersState, action: PayloadAction<string>) => {
    // Clear everything, set subjects to [value]
    state.byKey = { subjects: [action.payload] };
    state.scalar = {};
    syncByKeyToLegacy(state);
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use navSelectFilter({ filterKey: 'subjects', value: '__keep__', preserve: ['subjects'] }) */
  navViewAllProducts: (state: BaseFiltersState) => {
    ensureBags(state);
    // Keep subjects — prefer byKey, fall back to legacy flat field
    const subjectsToKeep = state.byKey.subjects ?? (state as any).subjects ?? [];
    state.byKey = { subjects: subjectsToKeep };
    state.scalar = {};
    syncByKeyToLegacy(state);
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use navSelectFilter({ filterKey: 'product_types', value: groupName, preserve: ['subjects'] }) */
  navSelectProductGroup: (state: BaseFiltersState, action: PayloadAction<string>) => {
    ensureBags(state);
    const subjectsToKeep = state.byKey.subjects ?? (state as any).subjects ?? [];
    state.byKey = { subjects: subjectsToKeep, product_types: [action.payload] };
    state.scalar = {};
    syncByKeyToLegacy(state);
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use navSelectFilter({ filterKey: 'products', value: productId, preserve: ['subjects'] }) */
  navSelectProduct: (state: BaseFiltersState, action: PayloadAction<string | number>) => {
    ensureBags(state);
    const subjectsToKeep = state.byKey.subjects ?? (state as any).subjects ?? [];
    state.byKey = { subjects: subjectsToKeep, products: [String(action.payload)] };
    state.scalar = {};
    syncByKeyToLegacy(state);
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated Use navSelectFilter({ filterKey: 'modes_of_delivery', value, preserve: ['subjects'] }) */
  navSelectModeOfDelivery: (state: BaseFiltersState, action: PayloadAction<string>) => {
    ensureBags(state);
    const subjectsToKeep = state.byKey.subjects ?? (state as any).subjects ?? [];
    state.byKey = { subjects: subjectsToKeep, modes_of_delivery: [action.payload] };
    state.scalar = {};
    syncByKeyToLegacy(state);
    state.validationErrors = [];
    stamp(state);
  },

  /** @deprecated UI alias — toggles isFilterPanelOpen */
  toggleFilterPanel: (state: BaseFiltersState) => {
    state.isFilterPanelOpen = !state.isFilterPanelOpen;
  },

  /** @deprecated Use setIsFilterPanelOpen */
  setFilterPanelOpen: (state: BaseFiltersState, action: PayloadAction<boolean>) => {
    state.isFilterPanelOpen = action.payload;
  },

  /** @deprecated Use setError(null) */
  clearError: (state: BaseFiltersState) => {
    state.error = null;
  },

  /** @deprecated Use clearFilterKey(filterKey) */
  clearFilterType: (state: BaseFiltersState, action: PayloadAction<string>) => {
    ensureBags(state);
    const key = action.payload as LegacyArrayKey;
    state.byKey[key] = [];
    (state as any)[key] = [];
    stamp(state);
  },

  /** @deprecated Clears validation errors array */
  clearValidationErrors: (state: BaseFiltersState) => {
    state.validationErrors = [];
  },

  /** @deprecated No-op: validation was part of the old architecture */
  validateFilters: (state: BaseFiltersState) => {
    // No-op — validation errors are cleared/set by other actions
    // This action exists for backward compatibility only
    state.validationErrors = [];
  },
};
