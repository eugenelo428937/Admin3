# Filter System Redesign — Design Document

> **Date:** 2026-05-13
> **Author:** brainstormed with Claude (superpowers:brainstorming)
> **Companion:** [docs/to-dos/filter-registry-architecture-debt.md](../../to-dos/filter-registry-architecture-debt.md)
> **Status:** Approved for implementation planning

## TL;DR

The current filter system is hardcoded in six frontend files and uses a tree-walking backend that no longer matches the imported data. This redesign makes `filter_configurations` the single source of truth: backend dispatches on `filter_type` to handler classes; frontend uses a generic `byKey` Redux state driven entirely by the registry; nav menu carries its filter target in the API response. Adding a new filter type (e.g. `tutorial_location`) becomes a DB row plus one backend handler class — zero frontend changes.

Breaking change: URL contract switches to canonical `?{filter_key}={comma_values}` form. An Nginx-layer rewrite preserves legacy URLs for 30 days post-deploy.

## Decisions log

| # | Decision | Rationale |
|---|---|---|
| 1 | Full vertical (backend + frontend + nav) | Solves the 6-layer recurrence problem permanently |
| 2 | Drop `FilterGroup.parent_id` entirely (migration) | Tree provided no value once flat PPG mapping was imported |
| 3 | Hard switch to canonical URL form | No alias maintenance debt in app code |
| 4 | Each nav item declares `{filter_key, value, preserve}` in API response | Removes hardcoded "Material → product_types" assumption (which is now wrong) |
| 5 | Single PR, ship together | Breaking-by-design change; cleanest review |
| 6 | Drop dead `validation_rules` + `dependency_rules` columns | Zero readers outside admin form |
| 7 | Include Nginx alias as part of spec | External marketing/SEO/bookmark traffic exists today |

## Problem statement

Today the filter system is hardcoded in six places (registry static block, registry URL_PARAM_MAP, baseFilters slice, filtersSlice, useFilterPanelVM, urlSyncMiddleware, filterUrlManager — and that's seven if you count `filterUrlManager.DEFAULT_FILTERS`). Adding a single filter type requires editing all of them; removing one (`products`) keeps coming back because each refactor copies a stale list. Backend separately uses descendant-tree walking that's now redundant with the flat `filter_product_product_groups` data model the user has populated, and `FilterConfiguration.filter_type='subject_type'` has no handler so the `SUBJECT_TYPE_FILTER` row currently returns zero options.

Expected outcome after this PR:

- Filter panel renders **six** sections in display_order from DB: SUBJECT, SUBJECT_TYPE, PROGRAMME_TYPE, CATEGORY, PRODUCT_TYPE, DELIVERY_MODE.
- Adding a seventh (e.g. `tutorial_location`) requires: one row in `filter_configurations`, one `TutorialLocationHandler` class, one line in the dispatch dict. **No** frontend changes.
- Nav menu clicks dispatch the right filter automatically based on backend-declared target.
- URLs are canonical: `/products?subjects=CB1,CB2&categories=Material&product_types=Core+Study+Materials`.

## Section 1: Data Model

### Schema changes

**Migration 0012** — drop `filter_groups.parent_id` column.
- Existing tree data (e.g. Material → Core Study Materials → eBook) is flattened. The flat rows in `filter_product_product_groups` already cover what the tree conveyed.
- `code`, `name`, `display_order`, `is_active` remain.

**Migration 0013** — `FilterConfiguration` cleanup:
- Add `'subject_type'` to `FILTER_TYPE_CHOICES`.
- Drop `dependency_rules` JSONField.
- Drop `validation_rules` JSONField.
- Drop the `is_dependent_on()` helper method on the model.

**Migration 0014** — data cleanup:
- Delete the `FilterConfigurationGroup` row mapping `subject_type → "South Africa" FilterGroup` (leftover; `subject_type` enumerates from `Subject.SubjectType` choices, not from FilterGroup).

**No changes** to: `filter_configurations`, `filter_configuration_groups`, `filter_product_product_groups` data already imported by user.

### Conceptual contract

> A `FilterConfiguration` row defines one section of the FilterPanel. Its `filter_type` tells the backend how to compute options and how to apply the filter. Its `filter_key` is what the URL, Redux state, and the React component all call this filter. The frontend never hardcodes any filter's name — it iterates `FilterConfiguration.objects.filter(is_active=True).order_by('display_order')`.

### Allowed `filter_type` values

| filter_type | Options source | Match query (on store.Product queryset) |
|---|---|---|
| `subject` | `catalog_subjects.code` rows where `active=True` | `exam_session_subject__subject__code__in=values` |
| `subject_type` | `Subject.SubjectType.choices` (UK / SA / CAA / PMS) | `exam_session_subject__subject__subject_type__in=values` |
| `filter_group` | groups joined via `filter_configuration_groups` | `product_product_variation__product_groups__product_group__name__in=values` |
| *(future)* `product_variation` | `ProductVariation` rows | `product_product_variation_id__in=values` |
| *(future)* `tutorial_location` | distinct `tutorial_events.location` | `tutorial_events__location__in=values` |

The dispatch table lives in **one** file: `filtering/services/filter_handlers.py`.

## Section 2: Backend Filter Dispatcher

### `FilterHandler` interface

```python
# backend/django_Admin3/filtering/services/filter_handlers.py

class FilterHandler(ABC):
    """One per filter_type. Knows option enumeration, query construction,
    and disjunctive-facet count path."""

    @abstractmethod
    def get_options(self, config: FilterConfiguration) -> list[dict]: ...
    # returns [{value, label, code?, description?}, ...]

    @abstractmethod
    def build_q(self, config: FilterConfiguration, values: list[str]) -> Q: ...

    @abstractmethod
    def count_path(self, config: FilterConfiguration) -> str: ...
    # the queryset .values(<path>) used in disjunctive faceting

class SubjectHandler(FilterHandler): ...
class SubjectTypeHandler(FilterHandler): ...
class FilterGroupHandler(FilterHandler): ...

FILTER_HANDLERS: dict[str, FilterHandler] = {
    'subject':       SubjectHandler(),
    'subject_type':  SubjectTypeHandler(),
    'filter_group':  FilterGroupHandler(),
}
```

`FilterGroupHandler.build_q` joins on `name` (matches what's in the URL). `FilterGroup.name` is canonically free of commas — enforced by convention, not validation, given current data has none.

### `ProductFilterService` rewrite

```python
class ProductFilterService:
    def get_filter_configuration(self) -> dict:
        result = {}
        for config in FilterConfiguration.objects.filter(is_active=True).order_by('display_order'):
            handler = FILTER_HANDLERS.get(config.filter_type)
            if not handler:
                logger.warning(f"No handler for filter_type={config.filter_type!r}")
                continue
            result[config.filter_key] = {
                'filter_key': config.filter_key,
                'filter_type': config.filter_type,
                'label': config.display_label,
                'ui_component': config.ui_component,
                'display_order': config.display_order,
                'allow_multiple': config.allow_multiple,
                'is_collapsible': config.is_collapsible,
                'is_expanded_by_default': config.is_expanded_by_default,
                'options': handler.get_options(config),
            }
        return result

    def apply_filters(self, queryset, filters: dict[str, list[str]]):
        for config in FilterConfiguration.objects.filter(is_active=True):
            values = filters.get(config.filter_key) or []
            if not values:
                continue
            handler = FILTER_HANDLERS.get(config.filter_type)
            if not handler:
                continue
            queryset = queryset.filter(handler.build_q(config, values))
        return queryset.distinct()

    def generate_filter_counts(self, base_queryset, filters):
        # disjunctive faceting — same algorithm as today, but loops over
        # configs and calls handler.count_path() / handler.build_q().
        ...
```

### What this kills

- `_build_descendant_map()` — deleted.
- `_resolve_group_ids_with_hierarchy()` — deleted.
- `apply_store_product_filters()` named-dimension branches — replaced by `apply_filters` loop.
- `get_main_category_filter()` — verify dead, delete.
- `FilterOptionProvider` class — dissolved into handler classes.
- `FilterConfiguration.is_dependent_on()` — deleted with the field.

### API contract change

**`GET /api/products/filter-configuration/`** — top-level keys change from `FilterConfiguration.name` (e.g. `SUBJECT_FILTER`) to `FilterConfiguration.filter_key` (e.g. `subjects`). Removed fields per entry: `validation_rules`, `dependency_rules`, `filter_groups` (junction array — frontend never needed it).

**Filter application payload** stays the same shape (`{filters: {<filter_key>: [...]}}`) — but the set of keys is now open (DB-driven), not a closed enum.

## Section 3: Frontend Generic Redux State

### State shape

```typescript
interface FiltersState {
  byKey: Record<string, string[]>;        // array filters
  scalar: Record<string, string | null>;  // single-value filters (searchQuery, future booleans)
  currentPage: number;
  pageSize: number;
  isFilterPanelOpen: boolean;
  isLoading: boolean;
  error: string | null;
  filterCounts: Record<string, Record<string, number>>;  // keyed by filter_key
}
```

### Three generic action creators replace twenty-plus named ones

```typescript
setFilter({ filterKey, values })
toggleFilter({ filterKey, value })
removeFilter({ filterKey, value })
clearFilterKey(filterKey)
clearAllFilters()
setScalar({ filterKey, value })
navSelectFilter({ filterKey, value, preserve = ['subjects'] })
setMultipleFilters(byKeyDict)        // for URL→Redux restore
```

`navSelectFilter` default `preserve: ['subjects']` matches today's "preserve subject selection when clicking a category" semantic.

### What this kills

From `baseFilters.slice.ts`: all 18+ named reducers (`setSubjects`, `toggleSubjectFilter`, `removeSubjectFilter`, … times five dimensions plus the recently-added programme_type triad) collapse to three generic reducers. The `FilterCounts` interface with hand-listed dimensions, the switch in `clearFilterType`, and the copy lists in `clearAllFilters` / `resetFilters` / `setMultipleFilters` / `applyFilters` all go away.

From `filtersSlice.ts`: `validationTriggers` array enumerating each named action collapses to four generic types; the destructured re-export block disappears.

The `navigationFilters.slice.ts` module collapses to a single `navSelectFilter` reducer (moved into the main slice).

### Backward-compatibility shims (one file, deleted in follow-up PR)

```typescript
// src/store/slices/filtersSlice.legacy.ts — ~30 lines
/** @deprecated Use setFilter({filterKey:'subjects',values}) */
export const setSubjects = (values: string[]) =>
  setFilter({ filterKey: 'subjects', values });
// ...one per legacy action.
```

Re-exported from `filtersSlice.ts` so existing imports keep working. Strikethrough in editors via `@deprecated`. Console.warn once per legacy action name in dev. **Deleted in a follow-up PR** after grep-replace migration of ~12 call sites.

### Selectors

```typescript
export const selectFilterValues = (filterKey: string) =>
  (s: RootState) => s.filters.byKey[filterKey] ?? [];

export const selectAllFilters = (s: RootState) => s.filters.byKey;

export const selectActiveFilterCount = createSelector(...)
```

The 5 existing per-dimension selectors (`selectSubjects`, …) get deprecation shims in the same legacy file.

### FilterPanel becomes truly registry-driven

```typescript
// useFilterPanelVM.ts
const filters = useSelector(selectAllFilters);
const sections = FilterRegistry.getAll().filter(c => c.type !== 'searchQuery');
const handleFilterChange = (filterKey, value) =>
  dispatch(toggleFilter({ filterKey, value }));
```

No switch. Adding `tutorial_location` requires zero changes here.

## Section 4: URL Sync — Canonical Contract

### Format

```
/products?subjects=CB1,CB2&subject_type=UK&programme_type=UK,CAA&categories=Material,Marking&product_types=Core+Study+Materials&modes_of_delivery=eBook,Printed&search_query=exam
```

Rules:
- One param per `filter_key`, comma-separated values. No indexed format anywhere.
- Param name IS the `filter_key`. No remap table, no aliases.
- Missing/empty param = filter not active. Empty `?subjects=` not written.
- Values containing commas not supported (current `FilterGroup.name` data is clean — enforced by convention).
- Scalars use single-value form, same param shape.

### Migration matrix

| Today | After deploy |
|---|---|
| `?subject_code=CB1&subject_1=CB2` | `?subjects=CB1,CB2` |
| `?group=PRINTED,EBOOK` | `?product_types=PRINTED,EBOOK` |
| `?category_code=MAT&category_1=TUT` | `?categories=MAT,TUT` |
| `?mode_of_delivery=eBook,Printed` | `?modes_of_delivery=eBook,Printed` |
| `?programme_type=UK,CAA` | `?programme_type=UK,CAA` (unchanged) |
| `?search_query=exam+materials` | `?search_query=exam+materials` (unchanged) |
| `?product=PROD1,PROD2` | ignored (no `products` filter) |
| `?subject=CB1` (legacy alias) | ignored |

### Middleware shape

```typescript
// Allowlist derived at runtime from registry — no static array.
const ACTION_TYPES = new Set([
  setFilter.type, toggleFilter.type, removeFilter.type,
  clearFilterKey.type, clearAllFilters.type,
  setScalar.type, navSelectFilter.type, setMultipleFilters.type,
]);

listenerMiddleware.startListening({
  predicate: (action) => ACTION_TYPES.has(action.type),
  effect: (action, api) => {
    const url = buildUrlFromState(api.getState().filters);
    if (url === lastUrl) return;
    window.history.replaceState({}, '', url);
    lastUrl = url;
  },
});
```

`buildUrlFromState` and `parseUrlToFilters` move into `filterUrlManager.ts` (already mostly registry-driven). `DEFAULT_FILTERS` is built dynamically from `FilterRegistry.getAll()`.

### Boot gate (required)

```javascript
// App.js
const [bootComplete, setBootComplete] = useState(false);
useEffect(() => {
  productService.getFilterConfiguration().then(cfg => {
    FilterRegistry.registerFromBackend(cfg);
    store.dispatch(setFilterConfiguration(cfg));
    const fromUrl = parseUrlToFilters(new URLSearchParams(window.location.search));
    store.dispatch(setMultipleFilters(fromUrl));
    setBootComplete(true);
  });
}, []);
// Render <Routes /> only when bootComplete.
```

The static fallback registrations in `filterRegistry.ts` are **removed**. The registry is empty until the backend response lands. Without the gate, ProductList would mount with zero registered filters and strip all URL params.

### What this kills

- Hardcoded `FILTER_ACTION_TYPES` array.
- `FILTER_PARAM_PATTERNS` regex list.
- Per-filter URL format branching (indexed/comma/single).
- All static registrations in `filterRegistry.ts`.
- `urlFormat` field on `FilterConfig` becomes unused — kept on the type for forward compat, deletable in a follow-up.

## Section 5: Nav Menu API + Handlers

### API change — `/api/catalog/navigation-data/`

Each clickable item carries an explicit `filter` object:

```json
{
  "subjects": [
    { "code": "CB1", "label": "CB1 - Business Finance",
      "filter": { "key": "subjects", "value": "CB1", "preserve": [] } }
  ],
  "navbarProductGroups": [
    { "id": 1, "label": "Materials",
      "filter": { "key": "categories", "value": "Material", "preserve": ["subjects"] },
      "children": [
        { "id": 11, "label": "Core Study Materials",
          "filter": { "key": "product_types", "value": "Core Study Materials", "preserve": ["subjects"] } }
      ]
    }
  ],
  "distanceLearningData": [
    { "id": 41, "label": "eBook",
      "filter": { "key": "modes_of_delivery", "value": "eBook", "preserve": ["subjects"] } }
  ],
  "tutorialData": {
    "rootLink": { "filter": { "key": "categories", "value": "Tutorial", "preserve": ["subjects"] } }
  }
}
```

Items that don't filter (e.g. "Help" link) omit the `filter` object.

### Backend implementation

The `filter` object is resolved by querying `FilterConfigurationGroup` per item — single prefetch per request:

```python
def resolve_nav_filter(group_name: str) -> dict | None:
    fcg = FilterConfigurationGroup.objects.filter(
        filter_group__name=group_name,
        filter_configuration__is_active=True,
    ).select_related('filter_configuration').first()
    if not fcg:
        return None
    return {
        "key": fcg.filter_configuration.filter_key,
        "value": group_name,
        "preserve": ["subjects"],
    }
```

For subjects, the lookup is trivial (`key=subjects`, `value=subject.code`, `preserve=[]`).

### Frontend: one handler

```typescript
const handleNavClick = useCallback((filter?: NavFilter) => {
  if (!filter || !FilterRegistry.has(filter.key)) {
    if (filter) console.warn(`[Nav] Unknown filter_key: ${filter.key}`);
    navigate('/products');
    setExpanded(false);
    return;
  }
  dispatch(navSelectFilter({
    filterKey: filter.key,
    value: filter.value,
    preserve: filter.preserve ?? [],
  }));
  navigate('/products');
  setExpanded(false);
}, [dispatch, navigate]);
```

The 5 existing handlers (`handleSubjectClick`, `handleProductClick`, `handleProductGroupClick`, `handleSpecificProductClick`, `handleProductVariationClick`, `handleMarkingVouchersClick`) collapse to `handleNavClick`. The `NavigationMenu` / `MobileNavigation` prop signature shrinks from six click props to one.

The "Marking Vouchers" special case (which dispatched `navSelectProductGroup('8')` — magic number) becomes a regular nav item with `{filter: {key: 'product_types', value: 'Marking Vouchers', preserve: ['subjects']}}`.

### What this kills

- `navSelectSubject`, `navViewAllProducts`, `navSelectProductGroup`, `navSelectProduct` named action creators (replaced by single `navSelectFilter`).
- The 5 click handlers and their `useCallback` blocks.
- The 6 click props on navigation components.
- The hardcoded "Material maps to product_types" assumption (currently wrong under the new model).
- The magic group-id `'8'` for Marking Vouchers.

## Section 6: Migration, Tests, Rollout

### Backend migrations (3, all in this PR)

- `0012_drop_filter_group_parent.py` — `RemoveField(model='FilterGroup', name='parent')`.
- `0013_filter_configuration_cleanup.py` — add `subject_type` choice, drop `dependency_rules`, drop `validation_rules`.
- `0014_clean_subject_type_fcg_mapping.py` — `RunPython` deleting the leftover `subject_type → "South Africa"` FCG row.

### Backend test changes

**New:**
- `filtering/tests/test_filter_handlers.py` — unit tests per `FilterHandler` (`get_options`, `build_q`, `count_path`). ~30 tests.
- `filtering/tests/test_filter_service_dispatch.py` — integration tests for `apply_filters` and `generate_filter_counts` with mixed `filter_type` configs. ~15 tests.

**Rewritten:**
- `test_filter_service.py` — replace named-dimension assertions with handler-driven tests; disjunctive-facet algorithm test stays here using real handlers.
- `test_filter_configuration_api.py` — update response shape (top-level keys = `filter_key`; remove `validation_rules` / `dependency_rules` / `filter_groups` from per-entry shape).
- `test_filter_partitioning.py` — add subject_type partitioning.

**Deleted:**
- `test_filter_group_hierarchy.py` — no more hierarchy.
- `test_hierarchy_resolution.py` — same.
- `test_resolve_group_warns_on_miss.py` — same.
- `test_coverage_gaps.py` — dependency_rules / is_dependent_on assertions go (verify rest of file is still relevant).
- `test_backfill_tutorial_filter_groups.py` — review; rewrite to verify FCG mappings or delete if tree-only.

### Frontend test changes

**New:**
- `src/store/slices/__tests__/filtersSlice.generic.test.js` — all-new tests for the generic actions against `byKey`. ~40 tests.
- `src/components/Navigation/__tests__/useMainNavBarVM.generic.test.js` — `handleNavClick` with various `{filter}` shapes.

**Rewritten:**
- `filtersSlice.test.js` — assertions move from `state.subjects` to `state.byKey.subjects`. Plus ~10 thin passthrough tests for the legacy shim file.
- `urlSyncMiddleware.test.js` — canonical URL contract, registry-driven format tests, drop indexed-format tests. Add a runtime "register fake filter_key" regression test.
- `filterUrlManager.test.js` — same shape changes as middleware.
- `filterRegistry.test.js` — `byKey` instead of named fields; `registerFromBackend` test covers all six filter_keys.
- `MainNavBar.test.js` / `NavigationMenu.test.js` — assert single `handleNavClick` prop instead of six.

**Deleted:**
- `src/store/slices/__tests__/navigationFilters.slice.test.js` — module gone.

### Rollout (single PR, single deploy)

1. Pre-deploy: ship Nginx alias rules to staging (see next section), confirm they rewrite correctly.
2. Run migrations on staging: `python manage.py migrate filtering` — confirm parent_id dropped, choices updated, FCG row deleted.
3. Hit `/api/products/filter-configuration/` — assert top-level keys are filter_keys.
4. Hit `/api/catalog/navigation-data/` — assert each item has `filter` object.
5. Browser test: load `/products` cold, 6 filter sections render in display_order.
6. Browser test: click each nav item, confirm URL becomes canonical and right filter activates.
7. Browser test: paste canonical URLs, confirm filter restoration.
8. Browser test: paste legacy URLs (`?subject_code=CB1`) → Nginx rewrites them → app sees `?subjects=CB1` → filter restored.
9. Browser test: dispatch legacy action via shim, confirm `console.warn` fires once.

### Ops: Legacy URL alias (30-day deprecation window)

External traffic (marketing emails, indexed search results, customer bookmarks) uses the old URL form. We rewrite legacy params to canonical form **before** the React app sees them. Implementation lives in Django middleware — testable, deletable in one commit when the window closes, no deploy-config changes required.

(Nginx with `if`/`set` was considered and rejected: it cannot cleanly merge `subject_code` + `subject_1` + `subject_2` into a single comma-joined `subjects=` value without `njs` or Lua. Django middleware is simpler.)

```python
# backend/django_Admin3/filtering/middleware/legacy_url_alias.py
class LegacyFilterURLAliasMiddleware:
    """Rewrites legacy filter params on /products to canonical form.
    Scheduled for removal 30 days after deploy."""

    # Direct param renames: old key → canonical filter_key
    ALIAS_MAP = {
        'group':              'product_types',
        'category_code':      'categories',
        'mode_of_delivery':   'modes_of_delivery',  # same key, different param-name shape (was scalar)
    }

    # Indexed-format mergers: prefix → canonical filter_key
    # subject_code=A, subject_1=B, subject_2=C  →  subjects=A,B,C
    INDEXED_PREFIXES = {
        'subject_code': 'subjects',     # first value uses literal *_code
        'category_code': 'categories',
    }

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path != '/products' or not request.GET:
            return self.get_response(request)
        canonical = self._canonicalize(request.GET)
        if canonical != dict(request.GET.lists()):
            return redirect(f"/products?{urlencode(canonical, doseq=True)}", permanent=True)
        return self.get_response(request)

    def _canonicalize(self, qs: QueryDict) -> dict[str, list[str]]:
        """Walk QueryDict and produce a {canonical_key: [values]} dict.

        For each legacy param: append its value(s) to the canonical key's
        list under ALIAS_MAP, or under INDEXED_PREFIXES (collecting the
        base *_code value AND any *_1, *_2, ... siblings). Params that are
        already canonical (subjects=, categories=, product_types=, etc.)
        pass through untouched. Unknown params are preserved verbatim.
        """
        out: dict[str, list[str]] = {}
        consumed_indexed = set()  # param names already merged into a canonical key

        # Pass 1: indexed prefixes (subject_code → subjects, category_code → categories)
        for prefix, target in self.INDEXED_PREFIXES.items():
            base = qs.get(prefix)
            indexed = sorted(
                [(int(k.rsplit('_', 1)[1]), v) for k, v in qs.lists()
                 if k.startswith(prefix.rsplit('_', 1)[0] + '_')
                 and k.rsplit('_', 1)[1].isdigit()
                 for v in v],
                key=lambda t: t[0],
            )
            values = ([base] if base else []) + [v for _, v in indexed]
            if values:
                out[target] = values
                consumed_indexed.add(prefix)
                consumed_indexed.update(k for k, _ in qs.lists()
                                        if k.startswith(prefix.rsplit('_', 1)[0] + '_')
                                        and k.rsplit('_', 1)[1].isdigit())

        # Pass 2: direct aliases (group → product_types, etc.) and passthrough
        for key, values in qs.lists():
            if key in consumed_indexed:
                continue
            canonical_key = self.ALIAS_MAP.get(key, key)
            out.setdefault(canonical_key, []).extend(values)

        return out
```

Wire-up in `django_Admin3/settings/base.py`:

```python
MIDDLEWARE = [
    # ... other middleware
    'filtering.middleware.legacy_url_alias.LegacyFilterURLAliasMiddleware',
    # ... rest
]
```

**Test coverage:** `filtering/tests/middleware/test_legacy_url_alias.py` covers each rewrite shape, idempotency, passthrough of unknown params, and that requests to paths other than `/products` are not affected. ~12 test cases.

**Removal schedule:** delete `LegacyFilterURLAliasMiddleware`, its test file, and the `MIDDLEWARE` entry exactly 30 days post-deploy. Track via dated TODO in the middleware module docstring.

### Out of scope

- **Removing legacy action shims** — follow-up PR. Migrate ~12 call sites (grep-replace), delete shim file.
- **Adding the `tutorial_location` filter** — designed-for, not implemented. Doing it later proves the design works.
- **Filter `dependency_rules` UX** — the field is being deleted; if someday we want cross-filter dependencies, separate spec.
- **`FilterPreset` saved-search model** — untouched.
- **Django admin redesign for filter_configurations** — current admin keeps working; just shows one fewer column.

### Estimated diff

| Phase | Source files | Test files | Net LOC |
|---|---|---|---|
| Backend dispatcher + handlers + migrations | ~10 | ~8 | −200 |
| Frontend generic Redux + shims | ~6 | ~6 | +50 |
| URL sync + boot gate | ~3 | ~3 | −100 |
| Nav menu API + handler | ~6 | ~4 | −50 |
| Legacy URL alias middleware | ~2 | ~2 | +80 (deletable after 30d) |
| **Total** | ~27 | ~23 | **~−220 LOC net** |

## Appendix: File map of changes

### Backend created
- `filtering/services/filter_handlers.py` — `FilterHandler` ABC + 3 concrete handlers + `FILTER_HANDLERS` dict.
- `filtering/middleware/legacy_url_alias.py` — 30-day URL rewrite shim.
- `filtering/migrations/0012_drop_filter_group_parent.py`
- `filtering/migrations/0013_filter_configuration_cleanup.py`
- `filtering/migrations/0014_clean_subject_type_fcg_mapping.py`

### Backend modified
- `filtering/services/filter_service.py` — rewritten thin facade.
- `filtering/models/filter_configuration.py` — drop two JSONFields + helper.
- `filtering/models/filter_group.py` — drop `parent` field + tree helpers.
- `filtering/serializers.py` — remove tree-shaped serializers; add filter-config response serializer.
- `filtering/admin.py` — drop fieldset entries for removed fields.
- `catalog/views/navigation.py` (or equivalent) — embed `filter` object per item.
- `django_Admin3/settings/*.py` — register `LegacyFilterURLAliasMiddleware`.

### Backend deleted
- `filtering/tests/test_filter_group_hierarchy.py`
- `filtering/tests/test_hierarchy_resolution.py`
- `filtering/tests/test_resolve_group_warns_on_miss.py`

### Frontend created
- `src/store/slices/filtersSlice.legacy.ts` — deprecation shim.
- `src/store/slices/__tests__/filtersSlice.generic.test.js`
- `src/components/Navigation/__tests__/useMainNavBarVM.generic.test.js`

### Frontend modified
- `src/store/slices/baseFilters.slice.ts` — replace with generic `byKey` reducers.
- `src/store/slices/filtersSlice.ts` — `validationTriggers` simplified; legacy shim re-exports.
- `src/store/slices/filterSelectors.js` — generic selectors.
- `src/store/middleware/urlSyncMiddleware.ts` — registry-driven allowlist.
- `src/store/filters/filterRegistry.ts` — remove static fallback registrations; keep `registerFromBackend`.
- `src/utils/filterUrlManager.ts` — dynamic `DEFAULT_FILTERS`; comma-only serialization.
- `src/components/Product/useFilterPanelVM.ts` — drop switch, iterate registry.
- `src/components/Navigation/useMainNavBarVM.ts` — single `handleNavClick`.
- `src/components/Navigation/NavigationMenu.tsx` / `MobileNavigation.tsx` — single click prop.
- `App.js` — boot gate around router.

### Frontend deleted
- `src/store/slices/navigationFilters.slice.ts` — module folded into main slice.
- `src/store/slices/__tests__/navigationFilters.slice.test.js`

## Open assumptions

- Current `FilterGroup.name` values contain no commas. Verified against today's data: "Mock Exam Marking", "Core Study Materials", "Live Online", "Online Classroom" — all clean. If this becomes false in the future, value-level percent-encoding can be added.
- The user has populated `filter_configuration_groups` correctly such that each FilterGroup mapped to a configuration belongs to exactly one configuration. (Today's data dump shows this is the case: each row appears under exactly one `filter_configuration.filter_key`.)
- The `tutorial_format`, `bundle`, `product_variation`, `custom_field`, `computed`, `date_range`, `numeric_range` filter_type choices retained for forward compat are not in active use today. Confirmed by reading `FilterOptionProvider` — only `subject`, `filter_group`, and `product_variation` had implementations, and `product_variation` is never instantiated by current `FilterConfiguration` rows.
