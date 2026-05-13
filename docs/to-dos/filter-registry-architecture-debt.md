# Filter Registry — Architectural Debt

> Created 2026-05-11.
> Companion to the PR that removed the recurring "Products" empty
> dropdown from the FilterPanel and added the Programme Type filter.

## TL;DR

The frontend FilterRegistry **looks** dynamic but is hardcoded in **six
different files**. Adding (or removing) a filter type requires editing
all six. The DB-driven path (`registerFromBackend`) exists and is now
wired at app boot, but it only controls **what renders in the panel** —
the other five layers still need manual edits for the filter to
actually function (clicks, URL sync, validation).

If you find yourself adding `'products'` back to one of these files
because "it was already in the codebase," **stop and read this doc.**
That filter has no row in `filter_configurations` and has been
re-introduced through stale refactor copies multiple times. The git
log shows seven separate commits with the same message
"refactor(search): streamline filter handling and improve performance"
that all re-added the same hardcoded entry.

## The six places a filter type is enumerated

When adding `programme_type` (Programme Type), every one of these had
to be touched. Same for any future filter:

| # | File | What it hardcodes | Effect if missed |
|---|------|---|---|
| 1 | [`filterRegistry.ts`](../frontend/react-Admin3/src/store/filters/filterRegistry.ts) **static registrations** (≈ lines 262–355) | `FilterRegistry.register({type, label, urlParam, color, …})` per filter | Filter does not appear in FilterPanel before the backend response arrives (no fallback) |
| 2 | [`filterRegistry.ts`](../frontend/react-Admin3/src/store/filters/filterRegistry.ts) `URL_PARAM_MAP` inside `registerFromBackend` (≈ lines 203–212) | Per-`filter_key`: `urlParam`, `urlParamAliases`, `urlFormat`, `color` | Backend-loaded filter gets `color='default'` and `urlParam=<filter_key>` defaults; usually OK, but colors look wrong |
| 3 | [`baseFilters.slice.ts`](../frontend/react-Admin3/src/store/slices/baseFilters.slice.ts) | `FilterState` interface, `baseFiltersInitialState`, `FilterCounts`, `setX` / `toggleXFilter` / `removeXFilter` reducers, `clearFilterType` switch, copy lists in `clearAllFilters` / `resetFilters` / `setMultipleFilters` / `applyFilters` | Click does nothing; state shape mismatch with selectors |
| 4 | [`filtersSlice.ts`](../frontend/react-Admin3/src/store/slices/filtersSlice.ts) | `validationTriggers` array, re-exports | Validation doesn't run after the action; action not importable downstream |
| 5 | [`useFilterPanelVM.ts`](../frontend/react-Admin3/src/components/Product/useFilterPanelVM.ts) | `ExpandedPanelsState` interface + default state, `handleFilterChange` switch | Checkbox renders but click dispatches nothing |
| 6 | [`urlSyncMiddleware.ts`](../frontend/react-Admin3/src/store/middleware/urlSyncMiddleware.ts) | `FILTER_ACTION_TYPES` allowlist, `FILTER_PARAM_PATTERNS` regex | URL doesn't update on toggle; or worse: the param is treated as "foreign" and preserved verbatim, causing duplicate / wrong values |
| 7 | [`filterUrlManager.ts`](../frontend/react-Admin3/src/utils/filterUrlManager.ts) | `FilterState` interface, `DEFAULT_FILTERS` (initial shape returned by `fromUrlParams`) | TypeScript errors; `fromUrlParams({})` returns an object missing the new key |

(6) and (7) are reducible — `filterUrlManager` already drives off
`FilterRegistry.getAll()` for parsing/serialization, so only the type
shape and the empty defaults are hardcoded there. The big offenders are
(3) and (4): every filter doubles the reducer count in
`baseFilters.slice.ts`.

## Why `products` keeps coming back

The hardcoded entry at `filterRegistry.ts` was the only way the panel
ever rendered a "Products" section, because there is **no DB row** for
it in `filter_configurations`. The section was therefore always
empty in production. But because the file looked authoritative,
each "streamline filter handling" refactor would copy the entry back
in from a stale branch.

What this PR did to break that cycle:

1. **Deleted** the static `'products'` registration in
   `filterRegistry.ts`.
2. **Deleted** the `'products'` entry in the `URL_PARAM_MAP` of
   `registerFromBackend()` (which was the template most likely to be
   copied during the next refactor).
3. **Wired** `productService.getFilterConfiguration() →
   FilterRegistry.registerFromBackend(cfg)` in `App.js` boot, so the
   DB is now the authoritative source for *which filters render*.
4. **Left a tombstone comment** in `filterRegistry.ts` at the spot
   where `products` used to live, explaining why it is absent. The
   next refactorer reads "do not re-add" before they touch it.
5. **Updated tests** in `filterRegistry.test.js` and
   `filterUrlManager.test.js` to explicitly assert that `'products'`
   is NOT registered after module load and that `?product=PROD1,PROD2`
   URLs are ignored. Regressions are caught at test time, not in prod.

## How to add a new filter (the honest checklist)

If the next filter you need is `study_format`, every step here is
mandatory unless explicitly stated otherwise.

### Step 0: Backend

1. Insert row in `filter_configurations` with `filter_key='study_format'`
   and `display_order=N`.
2. Insert rows in `filter_groups` for the options.
3. Insert junction rows in `filter_configuration_groups`.
4. Populate `filter_product_product_groups` to link real products.

### Step 1: Frontend rendering (3 files)

1. `filterRegistry.ts` — add a static `FilterRegistry.register({type: 'study_format', …})` as fallback **and** add `study_format` to `URL_PARAM_MAP` inside `registerFromBackend` (color + urlFormat).
2. `filterUrlManager.ts` — add `study_format: string[]` to the `FilterState` interface, add `study_format: []` to `DEFAULT_FILTERS`.

If you stop here, the section will render with checkboxes but
**clicks will do nothing**.

### Step 2: Frontend functionality (4 files)

3. `baseFilters.slice.ts` — add the state field, `FilterCounts` entry, three reducers (`set` / `toggle` / `remove`), and add `study_format` to every list/switch (`clearFilterType`, `clearAllFilters`, `resetFilters`, `setMultipleFilters`, `applyFilters`).
4. `filtersSlice.ts` — add the three new action names to `validationTriggers` and to the destructured re-exports.
5. `useFilterPanelVM.ts` — add `study_format: false` to `ExpandedPanelsState` defaults, add a `case 'study_format'` to `handleFilterChange` switch dispatching the new toggle action.
6. `urlSyncMiddleware.ts` — add the three `filters/setStudyFormats` / `toggleStudyFormatFilter` / `removeStudyFormatFilter` action types to `FILTER_ACTION_TYPES`; add a `/^study_format$/` pattern to `FILTER_PARAM_PATTERNS`.

### Step 3: Tests (mirror the existing ones)

- `filterRegistry.test.js` "module initialization (default registrations)" — bump the count + add the new key.
- `filtersSlice.test.js` — copy the `setProgrammeTypes` / `toggleProgrammeTypeFilter` / `removeProgrammeTypeFilter` / `clearAllFilters` / `clearFilterType('programme_type')` test patterns.
- `urlSyncMiddleware.test.js` — copy the comma-separated parsing test for the new param.
- `filterUrlManager.test.js` — update fixtures so `DEFAULT_FILTERS` matches the new shape.

## The path to actual dynamism

If we ever want this to be "edit DB only" for the **full vertical**:

1. Replace the static `FilterState` fields in `baseFilters.slice.ts`
   with a generic `state.filters.byKey: Record<string, string[]>`. This
   collapses (3) and (5) and (7).
2. Replace the named `setSubjects` / `toggleCategoryFilter` etc. actions
   with three generic actions: `setFilter`, `toggleFilter`, `removeFilter`,
   each taking `{ filterKey, value }`. This collapses (4) and (6).
3. Then `FilterRegistry` becomes the *only* source of which keys exist;
   the registry is registered at boot from the DB, and adding a filter
   is genuinely just a DB row.

That refactor is multi-day and out of scope for the current PR. It is,
however, the only true fix for the recurrence pattern. Until then,
this doc IS the fix — read it before editing any of the six files.

## Quick smoke test after editing

```bash
cd frontend/react-Admin3
npx vitest run \
  src/store/filters/__tests__/filterRegistry.test.js \
  src/store/slices/filtersSlice.test.js \
  src/store/middleware/__tests__/urlSyncMiddleware.test.js \
  src/utils/__tests__/filterUrlManager.test.js \
  src/components/__tests__/FilterPanel.dynamic.test.js
```

All five files must pass. If `filterRegistry.test.js` "module
initialization" fails specifically, you probably re-added `'products'`
to the static list — the test catches that explicitly.
