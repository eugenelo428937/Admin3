# API Contracts: Search & Filter

**Branch**: `20260202-fuzzy-search-refactor` | **Date**: 2026-02-02

## Overview

This feature makes **no changes to API endpoints, request formats, or response structures**. All changes are internal to the service layer. This document records the existing contracts that MUST remain unchanged (FR-008).

## Existing Endpoints (No Changes)

### POST /api/catalog/search/

**Purpose**: Fuzzy search with filters.

**Request body**:
```json
{
    "search_query": "CS2 addition mock",
    "filters": {
        "subjects": ["CS2"],
        "categories": ["Core Study Material"],
        "product_types": [],
        "products": [],
        "modes_of_delivery": ["Printed"]
    },
    "navbar_filters": {
        "group": "PRINTED"
    },
    "options": {
        "include_bundles": true
    },
    "page": 1,
    "page_size": 20
}
```

**Response body** (structure preserved):
```json
{
    "products": [
        {
            "product_short_name": "CS2 Additional Mock Exam Marking",
            "subject_code": "CS2",
            "is_bundle": false,
            "variations": [...]
        }
    ],
    "filter_counts": {
        "subjects": {"CS2": {"count": 12, "name": "CS2"}},
        "categories": {"Bundle": {"count": 3, "name": "Bundle"}},
        "product_types": {},
        "products": {},
        "modes_of_delivery": {}
    },
    "pagination": {
        "page": 1,
        "page_size": 20,
        "total_count": 45,
        "has_next": true,
        "has_previous": false,
        "total_pages": 3
    },
    "performance": {
        "duration": 0.142,
        "cached": false
    }
}
```

### POST /api/catalog/advanced-search/

**Purpose**: Advanced multi-filter search with pagination.

**Contract**: Identical filter format to `/api/catalog/search/`. No changes.

### GET /api/products/filter-configuration/

**Purpose**: Dynamic filter configuration for frontend filter panel.

**Contract**: No changes. This endpoint uses `ProductFilterService.get_filter_configuration()` which is not modified.

### GET /api/products/product-categories/all/

**Purpose**: Three-level category tree for navigation.

**Contract**: No changes.

## Internal Service Contracts (New/Modified)

### ProductFilterService.generate_filter_counts()

**New method** on `filtering.services.filter_service.ProductFilterService`.

**Signature**:
```python
def generate_filter_counts(
    self,
    base_queryset: QuerySet[StoreProduct],
    filters: dict = None
) -> dict:
```

**Parameters**:
- `base_queryset`: Unfiltered queryset of active `store.Product` instances
- `filters`: Dict with optional keys: `subjects`, `categories`, `product_types`, `products`, `modes_of_delivery`

**Returns**: Dict with five dimensions, each containing `{name: {count: int, name: str}}` entries. Empty dimensions return empty dicts.

### ProductFilterService.apply_store_product_filters()

**New method** on `filtering.services.filter_service.ProductFilterService`.

**Signature**:
```python
def apply_store_product_filters(
    self,
    queryset: QuerySet[StoreProduct],
    filters: dict
) -> QuerySet[StoreProduct]:
```

**Parameters**:
- `queryset`: Base queryset of `store.Product` instances
- `filters`: Dict with filter dimensions (same format as above)

**Returns**: Filtered and distinct queryset.

### SearchService._translate_navbar_filters()

**New method** on `search.services.search_service.SearchService`.

**Signature**:
```python
def _translate_navbar_filters(
    self,
    navbar_filters: dict
) -> dict:
```

**Parameters**:
- `navbar_filters`: Dict from GET query params with keys: `group`, `tutorial_format`, `product`, `distance_learning`

**Returns**: Standard filter dict compatible with `apply_store_product_filters()`.

### SearchService._calculate_fuzzy_score() (Modified)

**Existing method**, signature unchanged.

**Behavioral change**: Returns weighted composite score instead of `max(scores)`. Score range remains 0-100 but distribution shifts lower (average scores decrease by ~15-20 points for typical queries).

## Backward Compatibility Notes

- All external API endpoints maintain identical request/response formats
- Internal method `_apply_filters` kept as deprecated wrapper delegating to `filter_service.apply_store_product_filters()`
- Internal method `_apply_navbar_filters` kept as deprecated wrapper
- The `fuzzy_search()` and `advanced_fuzzy_search()` legacy methods continue to work via the deprecated wrappers
