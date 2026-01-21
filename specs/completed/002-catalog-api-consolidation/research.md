# Research: Catalog API Consolidation

**Branch**: `002-catalog-api-consolidation` | **Date**: 2026-01-06
**Phase**: 0 - Research | **Status**: Complete

## Executive Summary

This research documents the existing API layer implementations across three legacy Django apps (`subjects`, `exam_sessions`, `products`) that need to be migrated to the centralized `catalog` app. The catalog app already contains all 8 models from the 001-catalog-consolidation feature; this feature migrates the API layer (views, serializers, URLs, management commands).

## Existing Implementation Analysis

### 1. Subjects App

**Location**: `backend/django_Admin3/subjects/`

#### Views ([subjects/views.py](backend/django_Admin3/subjects/views.py))

| Component | Type | Description | Lines |
|-----------|------|-------------|-------|
| `SubjectViewSet` | ModelViewSet | CRUD operations with caching | 9-71 |
| `list()` | Override | 5-minute cache, active-only filter, lightweight values() query | 14-41 |
| `bulk_import_subjects()` | @action | POST bulk import with validation | 43-70 |

**Key Features**:
- 5-minute cache on list endpoint (`cache_key='subjects_list_v1'`)
- Only returns `active=True` subjects
- Uses `.values()` for optimized query (no ORM object instantiation)
- `name` field aliased from `description` for frontend compatibility
- Permission: `AllowAny`

#### Serializers ([subjects/serializers.py](backend/django_Admin3/subjects/serializers.py))

| Serializer | Model | Fields |
|------------|-------|--------|
| `SubjectSerializer` | Subject | id, code, description, name (alias) |

**Key Features**:
- `name` field uses `source='description'` for frontend compatibility

#### URLs ([subjects/urls.py](backend/django_Admin3/subjects/urls.py))

```python
router.register(r'subjects', SubjectViewSet, basename='subject')
urlpatterns = router.urls
```

**Endpoint**: `/api/subjects/subjects/` → `SubjectViewSet`

#### Management Commands

| Command | Location | Description |
|---------|----------|-------------|
| `import_subjects` | [subjects/management/commands/import_subjects.py](backend/django_Admin3/subjects/management/commands/import_subjects.py) | CSV/Excel import with --update-existing flag |

---

### 2. Exam Sessions App

**Location**: `backend/django_Admin3/exam_sessions/`

#### Views ([exam_sessions/views.py](backend/django_Admin3/exam_sessions/views.py))

| Component | Type | Description |
|-----------|------|-------------|
| `ExamSessionViewSet` | ModelViewSet | Standard CRUD operations |

**Key Features**:
- Uses default ModelViewSet behavior
- No permission classes defined (defaults to DRF settings)
- No caching implemented

#### Serializers ([exam_sessions/serializers.py](backend/django_Admin3/exam_sessions/serializers.py))

| Serializer | Model | Fields |
|------------|-------|--------|
| `ExamSessionSerializer` | ExamSession | id, session_code, start_date, end_date, create_date, modified_date |

**Key Features**:
- `read_only_fields = ['create_date', 'modified_date']`

#### URLs ([exam_sessions/urls.py](backend/django_Admin3/exam_sessions/urls.py))

```python
router.register('', ExamSessionViewSet)
urlpatterns = [path('', include(router.urls))]
```

**Endpoint**: `/api/exam-sessions/` → `ExamSessionViewSet`

---

### 3. Products App

**Location**: `backend/django_Admin3/products/`

#### Views ([products/views.py](backend/django_Admin3/products/views.py))

| Component | Type | Lines | Description |
|-----------|------|-------|-------------|
| `BundleViewSet` | ReadOnlyModelViewSet | 25-131 | Exam session bundles |
| `ProductViewSet` | ModelViewSet | 133-286 | Products with filtering |
| `product_group_tree` | @api_view | 374-382 | Full group tree navigation |
| `product_group_three_level_tree` | @api_view | 384-392 | Three-level group tree |
| `products_by_group` | @api_view | 394-412 | Products by group ID |
| `product_group_filters` | @api_view | 414-419 | Product group filter config |
| `filter_configuration` | @api_view | 421-441 | Dynamic filter configuration |
| `fuzzy_search` | @api_view | 444-541 | Trigram similarity search |
| `advanced_product_search` | @api_view | 543-632 | Multi-filter search |
| `navigation_data` | @api_view | 635-761 | Combined navigation endpoint (cached) |

**Key Features - BundleViewSet**:
- ReadOnly (list, retrieve only)
- Filters by exam_session, subject_code query params
- Uses `ExamSessionSubjectBundle` model (NOT ProductBundle)
- Complex select_related/prefetch_related for performance

**Key Features - ProductViewSet**:
- Custom `get_queryset()` with group, tutorial_format, variation, distance_learning, tutorial filters
- `bulk_import_products()` action
- `get_bundle_contents()` action for ProductBundle
- `get_bundles()` action for both master and exam session bundles

**Key Features - Function-Based Views**:
- `navigation_data`: 5-minute cache, combines 4 API calls into 1
- `fuzzy_search`: PostgreSQL trigram similarity with 0.2 threshold
- `advanced_product_search`: Pagination, multi-filter support

#### Serializers ([products/serializers.py](backend/django_Admin3/products/serializers.py))

| Serializer | Model | Lines | Key Features |
|------------|-------|-------|--------------|
| `ProductSerializer` | Product | 7-40 | type computed field, nested variations |
| `ProductBundleProductSerializer` | ProductBundleProduct | 42-67 | Component products via ProductProductVariation |
| `ProductBundleSerializer` | ProductBundle | 69-84 | Subject code/name, components count |
| `ExamSessionSubjectBundleProductSerializer` | ExamSessionSubjectBundleProduct | 86-138 | Prices, product codes |
| `ExamSessionSubjectBundleSerializer` | ExamSessionSubjectBundle | 140-162 | Full bundle with exam session |
| `FilterGroupSerializer` | FilterGroup | 164-170 | Recursive children |
| `FilterGroupThreeLevelSerializer` | FilterGroup | 172-188 | Three-level nesting |
| `ProductVariationSerializer` | ProductVariation | 190-193 | Basic variation fields |
| `ProductGroupFilterSerializer` | ProductGroupFilter | 195-208 | Filter groups |
| `FilterGroupWithProductsSerializer` | FilterGroup | 210-228 | Products in group |

#### URLs ([products/urls.py](backend/django_Admin3/products/urls.py))

```python
router.register(r'products', ProductViewSet, basename='product')
router.register(r'bundles', BundleViewSet, basename='bundle')

urlpatterns = [
    path('product-categories/all/', product_group_three_level_tree),
    path('product-groups/tree/', product_group_tree),
    path('product-groups/<int:group_id>/products/', products_by_group),
    path('product-group-filters/', product_group_filters),
    path('filter-configuration/', filter_configuration),
    path('navigation-data/', navigation_data),
    path('search/', fuzzy_search),
    path('advanced-search/', advanced_product_search),
    path('', include(router.urls)),
]
```

---

## Components Staying in Products App

Per spec, the following components are **NOT** migrated (they belong to the filter system domain):

| Component | Type | Reason |
|-----------|------|--------|
| `FilterGroup` | Model | Part of filter system |
| `FilterConfiguration` | Model | Filter system |
| `FilterConfigurationGroup` | Model | Filter system |
| `FilterPreset` | Model | Filter system |
| `FilterUsageAnalytics` | Model | Filter system |
| `ProductVariationRecommendation` | Model | Filter system |
| `filter_service.py` | Service | Filter service |
| `filter_admin.py` | Admin | Filter admin |
| `FilterGroupSerializer` | Serializer | Filter system |
| `FilterGroupThreeLevelSerializer` | Serializer | Filter system |
| `ProductGroupFilterSerializer` | Serializer | Filter system |
| `FilterGroupWithProductsSerializer` | Serializer | Filter system |
| `filter_configuration` view | View | Filter system |
| `product_group_filters` view | View | Filter system |
| `product_group_tree` view | View | Filter system |
| `product_group_three_level_tree` view | View | Filter system |
| `products_by_group` view | View | Filter system |

---

## Migration Strategy

### Strangler Fig Pattern

1. **Phase 1**: Create new endpoints in catalog app under `/api/catalog/` prefix
2. **Phase 2**: Legacy endpoints delegate to catalog implementations
3. **Phase 3**: (Future) Remove legacy apps when frontend migrates

### URL Structure

| Legacy URL | New Catalog URL | Handler |
|------------|-----------------|---------|
| `/api/subjects/subjects/` | `/api/catalog/subjects/` | `SubjectViewSet` |
| `/api/exam-sessions/` | `/api/catalog/exam-sessions/` | `ExamSessionViewSet` |
| `/api/products/products/` | `/api/catalog/products/` | `ProductViewSet` |
| `/api/products/bundles/` | `/api/catalog/bundles/` | `BundleViewSet` |
| `/api/products/navigation-data/` | `/api/catalog/navigation-data/` | `navigation_data` |
| `/api/products/search/` | `/api/catalog/search/` | `fuzzy_search` |
| `/api/products/advanced-search/` | `/api/catalog/advanced-search/` | `advanced_product_search` |

### Permission Classes

Per FR-013:
- **Read operations** (list, retrieve): `AllowAny`
- **Write operations** (create, update, delete): `IsSuperUser` (custom permission class)

---

## Dependencies and Imports

### External Dependencies

| Package | Usage |
|---------|-------|
| `rest_framework` | ViewSets, Serializers, decorators |
| `django.core.cache` | Caching (subjects list, navigation data) |
| `django.contrib.postgres.search.TrigramSimilarity` | Fuzzy search |
| `django.db.models.Q` | Complex queries |
| `django.db.models.Prefetch` | Optimized prefetching |

### Internal Dependencies (Catalog Models)

```python
from catalog.models import (
    Subject,
    ExamSession,
    Product,
    ProductVariation,
    ProductProductVariation,
    ProductProductGroup,
    ProductBundle,
    ProductBundleProduct,
)
```

### External Model Dependencies (Stay in Legacy Apps)

```python
from exam_sessions_subjects_products.models import (
    ExamSessionSubjectBundle,
    ExamSessionSubjectBundleProduct,
)
from products.models.filter_system import FilterGroup
from products.services.filter_service import get_filter_service
```

---

## Caching Strategy

| Cache Key | TTL | Location | Data |
|-----------|-----|----------|------|
| `subjects_list_v1` | 300s | SubjectViewSet.list | Active subjects |
| `navigation_data_v2` | 300s | navigation_data view | Combined nav data |

**Recommendation**: Maintain existing cache keys and TTLs for backward compatibility.

---

## Test Coverage Analysis

### Existing Tests

| App | Test File | Coverage |
|-----|-----------|----------|
| subjects | (None found) | 0% |
| exam_sessions | (None found) | 0% |
| products | (None found for views) | 0% |
| catalog | test_models.py, test_backward_compat.py | Models only |

### Required New Tests (FR-015)

1. **catalog/tests/test_views.py**: ViewSet tests for all catalog endpoints
2. **catalog/tests/test_serializers.py**: Serializer unit tests
3. **catalog/tests/test_backward_compat.py**: Extended to cover API re-exports

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Response format changes | HIGH | Snapshot tests comparing legacy vs catalog responses |
| Cache key conflicts | MEDIUM | Use same cache keys initially |
| Import path changes | MEDIUM | Re-exports in legacy apps |
| Permission changes | HIGH | Test all permission scenarios |
| Circular imports | MEDIUM | Careful import ordering, lazy imports |

---

## Recommendations

1. **Start with simplest migrations first**: SubjectViewSet, ExamSessionViewSet (minimal logic)
2. **ProductViewSet last**: Most complex with many actions and dependencies
3. **Create IsSuperUser permission class**: Reusable across all ViewSets
4. **Maintain cache keys**: Avoid cache invalidation issues
5. **Comprehensive test fixtures**: Shared fixtures across test files
6. **Response comparison tests**: Ensure 1:1 API response compatibility
