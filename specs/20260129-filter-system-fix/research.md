# Research: Filtering System Remediation

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)
**Date**: 2026-01-29

## Research Summary

All technical unknowns have been resolved through codebase exploration. No external research was needed as this is a remediation of existing code with well-understood patterns.

---

## Decision 1: Filter Partitioning Strategy (US1, FR-001)

**Problem**: `_generate_filter_counts()` in `search_service.py` populates both `categories` and `product_types` from the same query against `product__groups`, producing identical option sets.

**Decision**: Use `FilterConfigurationGroup` junction table to partition groups into their assigned filter sections. Each filter dimension queries only the groups assigned to its `FilterConfiguration` record.

**Rationale**: The `FilterConfigurationGroup` table already exists with the correct mappings. The current code bypasses it entirely by querying all groups and dumping them into both dimensions. The fix is to join through `FilterConfigurationGroup` when building count queries.

**Alternatives Considered**:
- **Hardcode group-to-dimension mapping in search service**: Rejected. Defeats the purpose of the dynamic configuration system already built.
- **Use ProductGroupFilter (deprecated model)**: Rejected. The spec mandates migration to FilterConfiguration (FR-009).

**Key Files**:
- `backend/django_Admin3/search/services/search_service.py` (lines 475-491): Current broken count generation
- `backend/django_Admin3/filtering/models/filter_configuration.py` (lines 182-214): FilterConfigurationGroup junction table
- `backend/django_Admin3/filtering/services/filter_service.py` (lines 355-380): `get_filter_configuration()` already loads configs correctly

---

## Decision 2: Disjunctive Faceting Implementation (US2, FR-002)

**Problem**: `_generate_filter_counts()` runs counts against ALL active products (unfiltered base queryset), not the filtered queryset with other dimensions' filters applied.

**Decision**: For each filter dimension, compute counts by applying ALL filters EXCEPT that dimension's own filter to a base queryset, then annotating counts for that dimension's groups/values.

**Rationale**: This is the standard e-commerce faceted navigation pattern (used by Elasticsearch, Solr, etc.). For N filter dimensions, this requires N separate count queries, each excluding one dimension. With 5 dimensions (subjects, categories, product_types, modes_of_delivery, products), this means 5 queries per search request.

**Performance Analysis**:
- Current: 1 query for all counts (but wrong)
- Proposed: 5 queries, each on a filtered queryset (~50-500 products after filtering)
- Expected overhead: < 50ms additional per request (well within 200ms p95 budget)
- Mitigation: Results are already cached for 15 minutes via filter options cache

**Alternatives Considered**:
- **Single query with conditional aggregation**: Rejected. PostgreSQL conditional aggregation is complex for multi-dimensional faceting and harder to maintain.
- **Pre-compute counts in a materialized view**: Rejected. Over-engineering for ~50 filter groups. Real-time counts are sufficient.

**Key Files**:
- `backend/django_Admin3/search/services/search_service.py` (lines 452-540): `_generate_filter_counts()` - must be rewritten
- `backend/django_Admin3/search/services/search_service.py` (lines 244-303): `_apply_filters()` - reusable filter logic

---

## Decision 3: Hierarchical Filter Resolution (US3, FR-003, FR-010)

**Problem**: `_apply_filters()` uses `groups__name__iexact=category` which matches only the exact group name, not descendants. Selecting "Material" misses "Core Study Materials" and "Revision Materials".

**Decision**: Use the existing `FilterGroup.get_descendants()` method (recursive Python traversal) to resolve all descendant group IDs before filtering. The filter query becomes `groups__id__in=[parent_id, child1_id, child2_id, ...]`.

**Rationale**: The `get_descendants()` method already exists on `FilterGroup` (lines 78-85 in filter_group.py). The `FilterGroupStrategy._get_all_descendant_ids()` method in `filter_service.py` (lines 173-186) also implements this pattern. The search service just needs to call it instead of using exact name matching.

**Performance**: With ~50 filter groups and max 3-4 depth levels, recursive traversal completes in < 1ms. No need for a recursive CTE at this scale.

**Alternatives Considered**:
- **PostgreSQL Recursive CTE**: Valid but unnecessary for ~50 rows. Adds SQL complexity without measurable performance benefit.
- **Materialized path (e.g., `path = '/1/3/7/'`)**: Requires schema change. Rejected per assumption of minimal schema changes.
- **Nested set model**: Over-engineering for this scale and adds write complexity.

**Key Files**:
- `backend/django_Admin3/filtering/models/filter_group.py` (lines 78-85): `get_descendants(include_self=True)`
- `backend/django_Admin3/filtering/services/filter_service.py` (lines 173-186): `_get_all_descendant_ids()`
- `backend/django_Admin3/search/services/search_service.py` (lines 259-272): Category and product type filter application

---

## Decision 4: Bundle Filter Expansion (US4, FR-004, FR-005, FR-014)

**Problem**: `_get_bundles()` in search_service.py only applies subject filter to bundles (lines 365-372). All other filter dimensions are ignored, causing bundles to appear regardless of category, product type, or delivery mode selections.

**Decision**: Apply all active filters to bundle queries by filtering on bundle component products. A bundle is included if at least one of its `BundleProduct` items has a `store.Product` that satisfies ALL active filter dimensions simultaneously (single-product matching semantics per FR-014).

**Rationale**: This matches the clarified spec requirement. The query joins through `BundleProduct → store.Product` and applies the same filter Q-objects used for regular product filtering.

**Implementation Approach**:
1. Build the same filter Q-object used for regular products
2. Apply it to `BundleProduct.objects.filter(product__<filter_conditions>)`
3. Get distinct bundle IDs from matching bundle products
4. Filter bundles by those IDs

**Key Files**:
- `backend/django_Admin3/search/services/search_service.py` (lines 346-450): `_get_bundles()` method
- `backend/django_Admin3/store/models/bundle_product.py`: `BundleProduct` model (bundle → product junction)

---

## Decision 5: Frontend Dynamic Filter Configuration (US5, FR-006, FR-007, FR-011)

**Problem**: `FilterRegistry` uses static `register()` calls (lines 190-287 in filterRegistry.js) to define 6 hardcoded filter types. The filter panel should be driven by backend configuration.

**Decision**: Add an RTK Query endpoint to fetch `FilterConfiguration` records from the backend. On app load, populate the `FilterRegistry` dynamically from the API response. Preserve the existing static registrations as fallback (FR-012: "Filters unavailable" message if endpoint fails).

**Rationale**: The backend `filter_configuration` endpoint already exists (filtering/views.py lines 78-97) and returns all active configurations with UI settings. The frontend just needs to consume it and populate the registry dynamically instead of using hardcoded calls.

**Key Changes**:
1. **FilterRegistry**: Add `registerFromBackend(configs)` method that clears and re-registers from API data
2. **catalogApi.js**: Add/update `getFilterConfiguration` RTK Query endpoint
3. **FilterPanel.js**: Fetch config on mount, populate registry, render dynamically
4. **Fallback**: If API fails, show "Filters unavailable" message (FR-012). Preserve existing static registrations as initial state until API responds.
5. **Redux state**: Add `filterConfiguration` to baseFilters state (loaded configs for reference)

**Key constraint** (FR-007): Redux state keys (`subjects`, `categories`, `product_types`, `products`, `modes_of_delivery`) remain static. The registry controls presentation (labels, order, UI component) while Redux keys are fixed.

**Key Files**:
- `frontend/react-Admin3/src/store/filters/filterRegistry.js` (lines 190-287): Static registrations to replace
- `frontend/react-Admin3/src/store/api/catalogApi.js` (lines 164-172): Existing filter config endpoint
- `frontend/react-Admin3/src/components/Product/FilterPanel.js`: Main filter UI component

---

## Decision 6: Format Filtering Cleanup (US6, FR-008)

**Problem**: Format-level groups (eBook, Printed) exist in the `filter_groups` table and can appear in category/product type filters, duplicating the `modes_of_delivery` filter which correctly uses `variation_type`.

**Decision**: Remove format-level groups from `FilterConfigurationGroup` assignments (data migration). The `modes_of_delivery` filter already correctly uses `variation_type` matching. No code change needed for the filter itself - only data cleanup.

**Rationale**: The mode of delivery filter in `_apply_filters()` (lines 293-298 in search_service.py) already uses `product_variation__variation_type__iexact` which is the correct approach. The problem is data, not code.

**Implementation**:
1. Data migration to remove eBook/Printed/Hub groups from category and product type FilterConfigurationGroup assignments
2. Verify `modes_of_delivery` filter counts use `variation_type` not groups
3. No code changes to mode of delivery filter logic needed

**Key Files**:
- `backend/django_Admin3/search/services/search_service.py` (lines 293-298): Mode of delivery filter (already correct)
- `backend/django_Admin3/search/services/search_service.py` (lines 523-538): Mode of delivery count generation (already uses variation_type)

---

## Decision 7: Pact Contract Updates

**Problem**: The user requested that Pact contracts be kept up to date with all changes. The current contracts cover `filter-configuration` and `product-group-filters` endpoints but do not cover the `POST /api/search/unified/` endpoint which is the primary endpoint being modified.

**Decision**: Update existing Pact consumer tests for `filter-configuration` and `product-group-filters`, and add a new consumer interaction for `POST /api/search/unified/` that validates the updated response structure including disjunctive filter counts and partitioned filter options.

**Implementation**:
1. **Update** `products.pact.test.js`: Modify `filter-configuration` interaction to include `filter_groups` in response (partitioned groups per config)
2. **Add** to `search.pact.test.js`: New interaction for `POST /api/search/unified/` with filter counts structure
3. **Update** `state_handlers.py`: Add/modify provider states to seed FilterConfigurationGroup data correctly
4. **Verify**: Run provider verification against updated contracts

**Key Files**:
- `frontend/react-Admin3/src/pact/consumers/products.pact.test.js` (lines 175-208): filter-configuration contract
- `frontend/react-Admin3/src/pact/consumers/search.pact.test.js`: search contracts
- `backend/django_Admin3/pact_tests/state_handlers.py`: Provider state handlers
- `pacts/Admin3Frontend-Admin3Backend.json`: Generated contract file

---

## Decision 8: Zero-Count Option Hiding (FR-013)

**Problem**: Spec clarification requires zero-count filter options to be hidden entirely from the panel (not shown with zero badge).

**Decision**: Backend returns all options including zero-count ones (for completeness). Frontend filters out zero-count options before rendering in FilterPanel.

**Rationale**: Backend computing and returning all counts (including zeros) is simpler and more cacheable. The hiding decision is a UI concern. If the requirement changes in the future (e.g., show greyed out), only frontend needs updating.

**Key Files**:
- `frontend/react-Admin3/src/components/Product/FilterPanel.js` (lines 313-349): Filter count display - add zero-count filtering
