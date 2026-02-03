# Filtering System Root Cause Analysis & Remediation Plan

## Executive Summary

The filtering system has **6 identified issues** spanning backend (`search_service.py`, `filter_service.py`) and frontend (`filterRegistry.js`, `FilterPanel.js`). The root causes are:

1. **SearchService bypasses** the FilterConfiguration/FilterConfigurationGroup architecture, dumping all filter groups into both `categories` and `product_types` without distinction
2. **Bundle queries** ignore non-subject filters
3. **Filter counts** are computed from an entirely unfiltered queryset
4. **Hierarchy traversal** is absent — flat string matching only
5. **Frontend hardcodes** filter types instead of using backend configuration
6. **Dual filter systems** exist with no integration between them

**Decisions made:**
- Issue 1 frontend: **Option B** — Dynamic FilterConfiguration from backend
- Issue 3 hierarchy: **Recursive CTE** first (zero schema changes), upgrade to ltree only if needed
- Redux state: **Keep static named keys** — registry controls presentation, not state shape
- Backward compatibility is not a concern (system not live)
- Schema changes are acceptable

**Architecture note:** Two parallel filter systems exist and do not communicate:
- `filtering/services/filter_service.py` — "proper" system with strategies, hierarchy, analytics (unused by search)
- `search/services/search_service.py` — actual system in use, with hardcoded queries

Long-term, SearchService should delegate to ProductFilterService. Short-term, fixes target SearchService directly.

---

## Issue 1: FilterPanel shows wrong filter sections

**Expected:** Only filters defined in backend `FilterConfiguration` table
**Actual:** 5 hardcoded filter types in frontend, regardless of backend config

### Root Cause

`filterRegistry.js:191-287` hardcodes 6 filter types via static `FilterRegistry.register()` calls. `FilterPanel.js:428-444` renders all except `searchQuery`. The backend `FilterConfiguration` model defines which filters should exist, but the frontend never fetches it.

### Solution: Fetch FilterConfiguration from backend

**Step 1 — Backend:** Ensure `/api/products/filter-configuration/` returns the active filters with their types, labels, UI config, and associated group options (via `FilterConfigurationGroup`). The endpoint already exists in `filtering/views.py:filter_configuration()` backed by `ProductFilterService.get_filter_configuration()`.

**Step 2 — Frontend RTK Query:** Add/use an RTK Query endpoint in `catalogApi.js` to fetch filter configuration:
```javascript
filterConfiguration: builder.query({
  query: () => ({ url: 'products/filter-configuration/', method: 'GET' }),
  providesTags: ['FilterConfig'],
})
```

**Step 3 — FilterRegistry refactor:** Instead of static `FilterRegistry.register()` calls at module load, populate the registry dynamically from the API response. Keep the registry class but make it data-driven:
```javascript
// On app init or FilterPanel mount
const { data: config } = useFilterConfigurationQuery();
if (config) {
  FilterRegistry.clear();
  Object.entries(config).forEach(([name, cfg]) => {
    FilterRegistry.register({
      type: cfg.filter_key,
      label: cfg.label,
      pluralLabel: cfg.label + 's', // or from backend
      urlParam: cfg.filter_key,
      order: cfg.display_order,
      // ... map other fields
    });
  });
}
```

**Step 4 — FilterPanel:** Use the dynamically populated registry. The existing `FilterRegistry.getAll()` call in `FilterPanel.js:372` already works — it just needs the registry to be populated from backend data instead of static registrations.

**Step 5 — Redux state: Keep static named keys.**

The current Redux structure uses named arrays (`subjects`, `categories`, `product_types`, `products`, `modes_of_delivery`). These are stable business concepts that do not change. **Do NOT refactor to dynamic keys** like `filters: { [key: string]: string[] }`.

Rationale — switching to dynamic keys would require changes across:
- All 11+ selectors in `filterSelectors.js`
- All 20+ toggle/set/clear/remove actions in `baseFilters.slice.js`
- All 5 navigation actions in `navigationFilters.slice.js`
- URL sync middleware
- `useProductsSearch` hook
- Every component reading filter state

Instead, the FilterRegistry controls **presentation** (which filters are visible, their labels, order) while Redux controls **state** (the actual selected values). The registry maps backend `filter_key` to Redux state keys.

### Files to modify

| File | Change |
|------|--------|
| `catalogApi.js` | Add/verify `filterConfiguration` RTK Query endpoint |
| `filterRegistry.js` | Remove static registrations, add `populateFromConfig()` method |
| `FilterPanel.js` | Fetch config on mount, populate registry before render |

### Files NOT to modify

| File | Reason |
|------|--------|
| `filtersSlice.js` / `baseFilters.slice.js` | Keep static named keys — no changes needed |
| `filterSelectors.js` | No changes — selectors reference stable keys |
| `urlSyncMiddleware.js` | No changes — reads from FilterRegistry which handles mapping |

---

## Issue 2: Product Type and Category show identical (duplicated) filter options

**Expected:** Each filter shows only its associated groups (via `FilterConfigurationGroup`)
**Actual:** ALL groups dumped into BOTH filters

### Root Cause

`search_service.py:484-491`:
```python
filter_counts['categories'][group_name] = {'count': count, 'name': group_name}
filter_counts['product_types'][group_name] = {'count': count, 'name': group_name}
```

`FilterConfigurationGroup` junction table is completely ignored by `SearchService`.

### Solution

Modify `_generate_filter_counts()` to query `FilterConfigurationGroup` and partition groups by their owning filter configuration:

```python
# Load group-to-filter mappings
from filtering.models import FilterConfiguration, FilterConfigurationGroup

filter_configs = FilterConfiguration.objects.filter(
    is_active=True, filter_type='filter_group'
).prefetch_related('filter_groups')

config_group_map = {}  # {filter_key: set(group_ids)}
for config in filter_configs:
    group_ids = set(config.filter_groups.values_list('id', flat=True))
    config_group_map[config.filter_key] = group_ids

# Then in the group_counts loop:
for item in group_counts:
    group_id = item['product_product_variation__product__groups__id']
    group_name = item['product_product_variation__product__groups__name']
    count = item['count']

    for filter_key, group_ids in config_group_map.items():
        if group_id in group_ids:
            filter_counts[filter_key][group_name] = {'count': count, 'name': group_name}
```

### Files to modify

| File | Change |
|------|--------|
| `search_service.py` | `_generate_filter_counts()` — use `FilterConfigurationGroup` mapping |

### Prerequisites

1. `FilterConfigurationGroup` records must be populated in the database. Need a data migration or management command to set up the correct group-to-filter mappings.
2. Clarify relationship between `ProductGroupFilter` model (in `filtering/models/product_group_filter.py`) and `FilterConfiguration`/`FilterConfigurationGroup`. Both map groups to filter types. `ProductGroupFilter` should be deprecated if `FilterConfiguration` is the canonical source. See [Architectural Decision: Canonical Filter Model](#architectural-decision-canonical-filter-model).

---

## Issue 3: Hierarchy not respected in filtering

**Expected:** Selecting parent "Material" includes descendants (Core Study Materials, eBook, Printed)
**Actual:** Flat `name__iexact` match only

### Root Cause

`search_service.py:263` and `:271`:
```python
category_q |= Q(product_product_variation__product__groups__name__iexact=category)
```

No tree traversal. The `FilterGroupStrategy` in `filter_service.py:173-186` has `_get_all_descendant_ids()` but `SearchService` doesn't use it.

### Solution: Recursive CTE (zero schema changes)

The `filter_groups` table is small (~20-50 rows). A recursive CTE is sufficient and requires no schema changes, no extensions, and no path maintenance.

**Step 1 — Add helper method to SearchService:**
```python
def _get_group_ids_with_descendants(self, group_names):
    """Get group IDs including all descendants using recursive CTE."""
    from django.db import connection

    if not group_names:
        return []

    with connection.cursor() as cursor:
        cursor.execute('''
            WITH RECURSIVE descendants AS (
                SELECT id, name, parent_id
                FROM "acted"."filter_groups"
                WHERE name IN %s
                UNION ALL
                SELECT fg.id, fg.name, fg.parent_id
                FROM "acted"."filter_groups" fg
                JOIN descendants d ON fg.parent_id = d.id
            )
            SELECT DISTINCT id FROM descendants
        ''', [tuple(group_names)])
        return [row[0] for row in cursor.fetchall()]
```

**Step 2 — Update `_apply_filters()` to use hierarchical resolution:**
```python
# Category filter with hierarchy
if filters.get('categories'):
    categories = [c for c in filters['categories'] if c != 'Bundle']
    if categories:
        group_ids = self._get_group_ids_with_descendants(categories)
        q_filter &= Q(product_product_variation__product__groups__id__in=group_ids)

# Product type filter with hierarchy
if filters.get('product_types'):
    group_ids = self._get_group_ids_with_descendants(filters['product_types'])
    q_filter &= Q(product_product_variation__product__groups__id__in=group_ids)
```

**Step 3 — Update FilterGroupStrategy in filter_service.py for consistency:**
```python
def _get_all_descendant_ids(self, parent_ids: List[int]) -> List[int]:
    """Get all descendant group IDs using recursive CTE."""
    from django.db import connection

    if not parent_ids:
        return []

    with connection.cursor() as cursor:
        cursor.execute('''
            WITH RECURSIVE descendants AS (
                SELECT id, parent_id
                FROM "acted"."filter_groups"
                WHERE id IN %s
                UNION ALL
                SELECT fg.id, fg.parent_id
                FROM "acted"."filter_groups" fg
                JOIN descendants d ON fg.parent_id = d.id
            )
            SELECT DISTINCT id FROM descendants
        ''', [tuple(parent_ids)])
        return [row[0] for row in cursor.fetchall()]
```

### Hierarchy approach comparison

| Approach | Schema Change | Query | Write Cost | Django Support | Best For |
|----------|:---:|:---:|:---:|:---:|:---:|
| **Recursive CTE** | None | Single query | None | Raw SQL (simple) | Small trees (<1000 nodes) |
| **ltree** | Extension + column + index | Single query, GiST | Must maintain paths | Raw SQL (complex) | Large trees, frequent queries |
| **Nested Sets (MPTT)** | Add `lft`/`rgt`/`tree_id`/`level` | Single query, btree | Must renumber on insert | `django-mptt` (mature) | Read-heavy, stable trees |
| **Closure Table** | New junction table | Single JOIN, btree | Insert N rows per node | Custom | Frequent writes |

**Decision: Recursive CTE** — zero overhead for a ~50-row table. Upgrade to ltree or MPTT only if measured performance issues arise.

### Future: Upgrade path to ltree

If the filter tree grows significantly or queries become frequent, upgrade to ltree:

1. Install extension: `CREATE EXTENSION IF NOT EXISTS ltree;`
2. Add `path` column to `filter_groups`: `ALTER TABLE "acted"."filter_groups" ADD COLUMN path text DEFAULT '';`
3. Populate paths via management command
4. Add GiST index: `CREATE INDEX idx_filter_groups_path ON "acted"."filter_groups" USING GIST (path::ltree);`
5. Replace CTE queries with `WHERE path::ltree <@ %s::ltree`
6. Add `post_save` signal on FilterGroup to maintain descendant paths on tree mutations

### Files to modify

| File | Change |
|------|--------|
| `search_service.py` | Add `_get_group_ids_with_descendants()`, update `_apply_filters()` |
| `filter_service.py` | Update `FilterGroupStrategy._get_all_descendant_ids()` to use CTE |

### Files NOT to modify (for CTE approach)

| File | Reason |
|------|--------|
| `filter_group.py` | No schema change needed |
| Migrations | No new migration needed |

---

## Issue 4: Results always include ALL Bundles regardless of filters

**Expected:** Only bundles matching active filters appear
**Actual:** All active bundles always appear

### Root Cause

`_get_bundles()` at `search_service.py:346-372` only applies subject filter. No category, product_type, or mode_of_delivery filtering on bundles.

### Solution

**Step 1 — Apply all filters to bundle queries:**
```python
def _get_bundles(self, filters, search_query, bundle_filter_active, no_fuzzy_results):
    # ... existing subject filter ...

    # Category filter on bundle components
    if filters.get('categories'):
        categories = [c for c in filters['categories'] if c != 'Bundle']
        if categories:
            group_ids = self._get_group_ids_with_descendants(categories)
            bundles_queryset = bundles_queryset.filter(
                bundle_products__product__product_product_variation__product__groups__id__in=group_ids
            ).distinct()

    # Product type filter on bundle components
    if filters.get('product_types'):
        group_ids = self._get_group_ids_with_descendants(filters['product_types'])
        bundles_queryset = bundles_queryset.filter(
            bundle_products__product__product_product_variation__product__groups__id__in=group_ids
        ).distinct()

    # Mode of delivery filter on bundle components
    if filters.get('modes_of_delivery'):
        mode_q = Q()
        for mode in filters['modes_of_delivery']:
            mode_q |= Q(bundle_products__product__product_product_variation__product_variation__variation_type__iexact=mode)
        bundles_queryset = bundles_queryset.filter(mode_q).distinct()
```

### Files to modify

| File | Change |
|------|--------|
| `search_service.py` | `_get_bundles()` — add category/product_type/mode filters |

---

## Issue 5: Filter counts computed from unfiltered queryset

**Expected:** Filter counts reflect the user's current filter selections (disjunctive faceting)
**Actual:** Filter counts always reflect the entire unfiltered catalog

### Root Cause

`search_service.py:135`:
```python
filter_counts = self._generate_filter_counts(self._build_optimized_queryset())
```

This calls `_build_optimized_queryset()` **again** — creating a fresh, completely unfiltered queryset. The filter counts reflect the **entire catalog**, not the user's current filter state.

Additionally, the "Bundle" count at `search_service.py:494` always counts ALL active bundles:
```python
bundle_count = StoreBundle.objects.filter(is_active=True).count()
```

### Solution

**Step 1 — Pass active filters to `_generate_filter_counts()`:**
```python
# In unified_search():
filter_counts = self._generate_filter_counts(
    self._build_optimized_queryset(),
    active_filters=filters  # Pass current filters
)
```

**Step 2 — Implement disjunctive faceting:**

For proper e-commerce faceting, each filter dimension's counts should be computed from a queryset that has all OTHER filters applied but NOT its own dimension. This ensures the user sees "how many results would I get if I toggled this option?"

```python
def _generate_filter_counts(self, base_queryset, active_filters=None):
    """Generate disjunctive facet counts."""
    active_filters = active_filters or {}
    filter_counts = {}

    # Define dimensions and their count queries
    dimensions = {
        'subjects': lambda qs: qs.values(
            'exam_session_subject__subject__code'
        ).annotate(count=Count('id')).order_by('-count'),

        'categories': lambda qs: self._count_groups_for_filter(qs, 'categories'),

        'product_types': lambda qs: self._count_groups_for_filter(qs, 'product_types'),

        'products': lambda qs: qs.values(
            'product_product_variation__product__id',
            'product_product_variation__product__shortname',
            'product_product_variation__product__fullname'
        ).annotate(count=Count('id', distinct=True)).order_by('-count'),

        'modes_of_delivery': lambda qs: qs.values(
            'product_product_variation__product_variation__variation_type',
            'product_product_variation__product_variation__name'
        ).annotate(count=Count('id', distinct=True)).order_by('-count'),
    }

    for dimension, count_fn in dimensions.items():
        # Apply all OTHER filters, not this dimension's filter
        other_filters = {k: v for k, v in active_filters.items()
                         if k != dimension and v}
        dimension_queryset = self._apply_filters(base_queryset, other_filters)

        # Run the count query for this dimension
        filter_counts[dimension] = {}
        # ... process count_fn(dimension_queryset) results ...

    # Bundle count — also filtered
    bundle_filters = {k: v for k, v in active_filters.items()
                      if k != 'categories' and v}
    bundle_count = self._count_filtered_bundles(bundle_filters)
    if bundle_count > 0:
        filter_counts.setdefault('categories', {})['Bundle'] = {
            'count': bundle_count, 'name': 'Bundle'
        }

    return filter_counts
```

**Step 3 — Add filtered bundle count helper:**
```python
def _count_filtered_bundles(self, filters):
    """Count bundles matching the given filters (excluding category filter)."""
    qs = StoreBundle.objects.filter(is_active=True)
    if filters.get('subjects'):
        subject_q = Q()
        for subject in filters['subjects']:
            subject_q |= Q(exam_session_subject__subject__code=subject)
        qs = qs.filter(subject_q)
    # Apply other filters via bundle components...
    return qs.count()
```

### Performance note

Disjunctive faceting means N queries where N = number of filter dimensions (currently 5). For 5 dimensions on a modest catalog, this is acceptable. If performance becomes an issue, consider:
- Caching facet counts (short TTL)
- Pre-computing counts on product save signals
- Moving to a search engine (Elasticsearch/Meilisearch)

### Files to modify

| File | Change |
|------|--------|
| `search_service.py` | `_generate_filter_counts()` — implement disjunctive faceting |
| `search_service.py` | `unified_search()` — pass active filters to count generator |
| `search_service.py` | Add `_count_filtered_bundles()` helper |
| `search_service.py` | Add `_count_groups_for_filter()` helper (uses FilterConfigurationGroup) |

---

## Issue 6: Change `catalog_product_product_groups` FK target

### Current: `catalog.Product` -> `FilterGroup`
### Proposed: `catalog.ProductProductVariation` -> `FilterGroup`

### Assessment: Not Recommended As Replacement

**Reasons:**
1. Most groups (Material, Core Study Materials, Marking, Tutorial) are **product-level** categories — they don't change between eBook and Printed variations
2. Delivery format (eBook, Printed, Hub) is already handled by `product_variation.variation_type` — no need to duplicate in groups
3. Data explosion: N products x M variations x G groups instead of N x G
4. Every query path changes (`product__groups` -> `ppv__ppv_groups`)

### Legitimate sub-concern: eBook/Printed cross-contamination

Groups like "eBook" (id:14) and "Printed" (id:15) are variation-specific, but are stored at the Product level. A "Course Notes" product belongs to BOTH eBook AND Printed filter groups simultaneously. When a user filters by "eBook" via the filter groups, the query matches the Product (which has both variations), returning **both** eBook and Printed store products.

**Fix:** Format-level filtering should use `modes_of_delivery` (which queries `product_variation.variation_type`) — not filter groups. Remove eBook/Printed from the `filter_groups` table since they duplicate `variation_type`.

### Better Alternative

1. **Keep `ProductProductGroup` on `catalog.Product`** for semantic categories (Material, Core Study Materials, Marking, Tutorial)
2. **Use `variation_type`** for delivery format filtering (already works via `modes_of_delivery`)
3. **Remove format-level groups** (eBook, Printed) from `filter_groups` table since they duplicate `variation_type` and cause cross-contamination
4. If variation-specific groups are needed later, add a **supplementary** `ProductProductVariationGroup` table — don't replace the existing one

---

## Architectural Decision: Canonical Filter Model

### Problem

Three models define filter-to-group mappings:

| Model | Table | Purpose |
|-------|-------|---------|
| `FilterConfiguration` + `FilterConfigurationGroup` | `acted.filter_configurations` + `acted.filter_configuration_groups` | Full filter config with UI settings, validation, dependencies |
| `ProductGroupFilter` | `acted.product_group_filter` + `acted.product_group_filter_groups` | Simple filter_type -> groups mapping |

### Decision

`FilterConfiguration` / `FilterConfigurationGroup` is the canonical source. It provides:
- UI component configuration
- Validation rules
- Dependency rules
- Display ordering
- Collapsible/expandable settings
- Active/inactive flag

`ProductGroupFilter` should be **deprecated**. Add a deprecation comment and plan for removal once all references are migrated.

### Files to modify

| File | Change |
|------|--------|
| `product_group_filter.py` | Add deprecation docstring |
| `filtering/views.py` | Ensure `product_group_filters()` view delegates to FilterConfiguration |

---

## Architectural Decision: SearchService and FilterService Integration

### Problem

`SearchService` reimplements filtering logic that already exists in `ProductFilterService`:

| Feature | SearchService | ProductFilterService |
|---------|:---:|:---:|
| Subject filtering | Inline Q() construction | `SubjectFilterStrategy.apply()` |
| Group filtering | Flat `name__iexact` | `FilterGroupStrategy.apply()` with hierarchy |
| Mode of delivery | Inline Q() construction | `ProductVariationFilterStrategy.apply()` |
| Analytics tracking | None | `track_usage()` on every strategy |
| Caching | None | 15-minute cache on options |
| Validation | None | `validate_filters()` method |
| FilterConfigurationGroup | Ignored | Used via `filter_groups` prefetch |

### Recommendation

**Short-term (this remediation):** Fix SearchService directly. The filter_service strategies operate on different querysets (they assume `product__groups` lookup path, while SearchService uses `product_product_variation__product__groups`).

**Medium-term:** Refactor strategies to accept a configurable lookup prefix, then have SearchService delegate to ProductFilterService strategies. This eliminates duplicate logic and ensures both systems stay in sync.

---

## Implementation Order

| Step | Issue | What | Risk | Files |
|------|-------|------|------|-------|
| 1 | 2 | Fix `_generate_filter_counts()` to use `FilterConfigurationGroup` mapping | Low | `search_service.py` |
| 2 | 5 | Fix line 135: pass active filters to `_generate_filter_counts()` for disjunctive faceting | Medium | `search_service.py` |
| 3 | 3 | Add `_get_group_ids_with_descendants()` using recursive CTE; update `_apply_filters()` | Low | `search_service.py`, `filter_service.py` |
| 4 | 4 | Apply all filters to `_get_bundles()` + fix bundle count in filter counts | Medium | `search_service.py` |
| 5 | 1 | Frontend: fetch `/api/products/filter-configuration/`, populate FilterRegistry dynamically | Medium | `catalogApi.js`, `filterRegistry.js`, `FilterPanel.js` |
| 6 | 6 | Remove eBook/Printed from filter_groups; ensure format filtering uses `modes_of_delivery` only | Low | Data migration |
| 7 | — | Deprecate `ProductGroupFilter` model | Low | `product_group_filter.py` |

### Rationale for ordering

- Steps 1-4 are **backend-only** fixes that can be verified independently via API tests
- Step 5 (frontend) depends on Steps 1-4 producing correct backend data
- Steps 6-7 are cleanup that can happen anytime after Steps 1-4

---

## Verification Plan

### Backend verification (after Steps 1-4)

1. **Filter partitioning test**: `/api/search/unified/` returns distinct options in `categories` vs `product_types` — no overlap unless a group is assigned to both
2. **Disjunctive faceting test**: Select subject="CM2" -> category counts reflect only CM2 products, not entire catalog
3. **Hierarchy test**: Select "Material" -> products in Core Study Materials, Revision Materials included
4. **Bundle filtering test**: Select category="Core Study Materials" -> only bundles containing matching products appear
5. **Bundle count test**: Select category="Core Study Materials" -> Bundle count in filter options reflects only matching bundles, not all bundles
6. **CTE hierarchy test**: Verify recursive CTE returns correct descendants for each root group

### Frontend verification (after Step 5)

7. **Dynamic config test**: FilterPanel renders only backend-configured filters, not hardcoded ones
8. **Config change test**: Disable a filter in Django admin -> FilterPanel no longer renders it (no code change needed)

### Cross-cutting verification

9. **eBook/Printed deduplication**: Filter by mode_of_delivery="eBook" -> only eBook variations shown, not Printed versions of same product
10. **Combined filter test**: Select subject="CM2" + category="Core Study Materials" + mode="eBook" -> correct intersection of results
11. **Empty state test**: Select filters with no matching products -> empty results with correct zero counts
12. **Performance test**: Disjunctive faceting completes in < 500ms for full catalog
