# Quickstart: Filtering System Remediation

**Branch**: `20260129-filter-system-fix`
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

## Implementation Order

Work follows the priority order from the spec (P1 → P2 → P3). Each user story is independently testable.

### Phase 1: P1 - Core Filtering Fixes (US1 + US2)

**US1 - Filter Partitioning** (FR-001, FR-009):
1. Modify `_generate_filter_counts()` in `search/services/search_service.py` to use `FilterConfigurationGroup` for partitioning `categories` vs `product_types`
2. Modify `_apply_filters()` to resolve group names through FilterConfiguration assignments
3. Update filter-configuration endpoint response to include `filter_groups` array

**US2 - Disjunctive Faceting** (FR-002, FR-013):
1. Rewrite `_generate_filter_counts()` to compute per-dimension counts excluding that dimension's filter
2. Accept the active filters as parameter (currently ignores them)
3. Frontend: hide zero-count options in FilterPanel.js

### Phase 2: P2 - Hierarchy + Bundles (US3 + US4)

**US3 - Hierarchical Resolution** (FR-003, FR-010):
1. In `_apply_filters()`, resolve category/product_type selections to include descendant groups
2. Use existing `FilterGroup.get_descendants()` method
3. Update count generation to account for hierarchy

**US4 - Bundle Filtering** (FR-004, FR-005, FR-014):
1. Expand `_get_bundles()` to apply all filter dimensions, not just subject
2. Filter through `BundleProduct → store.Product` with same Q-objects as regular product filtering
3. Implement single-product matching semantics (one component must match ALL dimensions)
4. Update bundle count in filter_counts to reflect filtered state

### Phase 3: P3 - Dynamic Config + Format Cleanup (US5 + US6)

**US5 - Dynamic Frontend Config** (FR-006, FR-007, FR-011, FR-012):
1. Add RTK Query endpoint for filter configuration
2. Add `registerFromBackend()` method to FilterRegistry
3. Populate FilterPanel from backend config on mount
4. Add "Filters unavailable" fallback state
5. Preserve Redux state key structure (FR-007)

**US6 - Format Cleanup** (FR-008):
1. Create data migration removing format groups (eBook, Printed, Hub) from category/product_type FilterConfigurationGroup records
2. Verify modes_of_delivery counts use variation_type (already correct)

### Phase 4: Pact + Integration

1. Update consumer Pact tests for changed response structures
2. Update provider state handlers
3. Run full provider verification
4. Run all existing backend and frontend test suites

## Key Files to Modify

### Backend (ordered by change priority)

| File | Changes | Story |
|------|---------|-------|
| `search/services/search_service.py` | Rewrite `_generate_filter_counts()`, fix `_apply_filters()`, expand `_get_bundles()` | US1, US2, US3, US4 |
| `filtering/views.py` | Add `filter_groups` to filter_configuration response | US1, US5 |
| `filtering/serializers.py` | Add serializer for config + groups response | US1, US5 |
| `filtering/services/filter_service.py` | Ensure hierarchy traversal is used in strategies | US3 |
| `filtering/models/product_group_filter.py` | Add deprecation warnings | US5 |
| `pact_tests/state_handlers.py` | Update provider states for new response structures | All |

### Frontend (ordered by change priority)

| File | Changes | Story |
|------|---------|-------|
| `components/Product/FilterPanel.js` | Hide zero-count options, dynamic config rendering | US2, US5 |
| `store/filters/filterRegistry.js` | Add `registerFromBackend()` method | US5 |
| `store/slices/baseFilters.slice.js` | Add filterConfiguration state fields | US5 |
| `store/api/catalogApi.js` | Add/update filter configuration RTK Query endpoint | US5 |
| `components/Product/ActiveFilters.js` | Dynamic removal actions from registry | US5 |
| `pact/consumers/products.pact.test.js` | Update filter-configuration contract | All |
| `pact/consumers/search.pact.test.js` | Add/update unified search contract | All |

### Migrations

| Migration | Type | Story |
|-----------|------|-------|
| Remove format groups from category/product_type configs | Data migration | US6 |

## Test Strategy

### TDD Approach (Per Constitution)

Each fix follows RED → GREEN → REFACTOR:

1. **RED**: Write failing test capturing the desired behavior
2. **GREEN**: Implement minimal fix to pass the test
3. **REFACTOR**: Clean up while keeping tests green

### Backend Tests

```bash
cd backend/django_Admin3
python manage.py test filtering.tests search.tests store.tests pact_tests
```

**New test files needed**:
- `filtering/tests/test_filter_partitioning.py` - US1 partitioning
- `search/tests/test_disjunctive_faceting.py` - US2 counts
- `filtering/tests/test_hierarchy_resolution.py` - US3 hierarchy
- `search/tests/test_bundle_filtering.py` - US4 bundles
- `filtering/tests/test_filter_configuration_api.py` - US5 config endpoint

### Frontend Tests

```bash
cd frontend/react-Admin3
npm test -- --watchAll=false
npm run test:pact
```

**New/modified test files**:
- `components/__tests__/FilterPanel.test.js` - Zero-count hiding, dynamic rendering
- `store/filters/__tests__/filterRegistry.test.js` - Dynamic registration
- `pact/consumers/products.pact.test.js` - Updated contract
- `pact/consumers/search.pact.test.js` - Updated contract

### Pact Contract Tests

```bash
# Consumer (frontend)
cd frontend/react-Admin3
npm run test:pact:consumer

# Provider (backend)
cd backend/django_Admin3
python manage.py test pact_tests --settings=django_Admin3.settings.development --keepdb
```

## Development Environment

```bash
# Backend
cd backend/django_Admin3
python manage.py runserver 8888

# Frontend
cd frontend/react-Admin3
npm start
# Access at http://127.0.0.1:3000

# Run all tests before committing
cd backend/django_Admin3 && python manage.py test
cd frontend/react-Admin3 && npm test -- --watchAll=false && npm run test:pact
```
