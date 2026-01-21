# Data Model: Catalog API Consolidation

**Branch**: `002-catalog-api-consolidation` | **Date**: 2026-01-06
**Phase**: 1 - Design | **Status**: Complete

## Overview

This document describes the data models, serializers, and their relationships for the Catalog API Consolidation feature. The underlying database models already exist (created in 001-catalog-consolidation); this feature migrates the API serialization layer.

## Catalog Models (Existing)

All models reside in `catalog/models/` and were created in 001-catalog-consolidation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CATALOG MODELS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐                                  ┌────────────────────┐        │
│  │ Subject  │                                  │  ExamSession       │        │
│  ├──────────┤                                  ├────────────────────┤        │
│  │ id       │                                  │ id                 │        │
│  │ code     │                                  │ session_code       │        │
│  │ desc     │                                  │ start_date         │        │
│  │ active   │                                  │ end_date           │        │
│  └──────────┘                                  │ create_date        │        │
│                                                │ modified_date      │        │
│                                                └────────────────────┘        │
│                                                                              │
│  ┌──────────────────┐       ┌────────────────────────┐                       │
│  │ ProductVariation │       │ Product                │                       │
│  ├──────────────────┤       ├────────────────────────┤                       │
│  │ id               │       │ id                     │                       │
│  │ variation_type   │◄──────│ fullname               │                       │
│  │ name             │       │ shortname              │                       │
│  │ description      │       │ description            │                       │
│  │ description_short│       │ code                   │                       │
│  └──────────────────┘       │ is_active              │                       │
│         ▲                   │ buy_both               │                       │
│         │                   │ created_at             │                       │
│         │                   │ updated_at             │                       │
│         │                   └────────────────────────┘                       │
│         │                            ▲                                       │
│         │                            │                                       │
│  ┌──────┴─────────────────────────────┴────────┐                             │
│  │ ProductProductVariation (Junction)          │                             │
│  ├─────────────────────────────────────────────┤                             │
│  │ id                                          │                             │
│  │ product_id (FK)                             │                             │
│  │ product_variation_id (FK)                   │                             │
│  │ is_active                                   │                             │
│  └─────────────────────────────────────────────┘                             │
│         ▲                                                                    │
│         │                                                                    │
│  ┌──────┴────────────────┐     ┌────────────────────┐                        │
│  │ ProductBundleProduct  │────►│ ProductBundle      │                        │
│  │ (Junction)            │     ├────────────────────┤                        │
│  ├───────────────────────┤     │ id                 │                        │
│  │ id                    │     │ bundle_name        │                        │
│  │ bundle_id (FK)        │     │ bundle_description │                        │
│  │ ppv_id (FK)           │     │ subject_id (FK)    │                        │
│  │ default_price_type    │     │ is_featured        │                        │
│  │ quantity              │     │ is_active          │                        │
│  │ sort_order            │     │ display_order      │                        │
│  │ is_active             │     │ created_at         │                        │
│  └───────────────────────┘     │ updated_at         │                        │
│                                └────────────────────┘                        │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │ ProductProductGroup (Junction) - Links Products to FilterGroups     │     │
│  ├─────────────────────────────────────────────────────────────────────┤     │
│  │ id | product_id (FK) | filter_group_id (FK to products.FilterGroup) │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Serializer Specifications

### SubjectSerializer

**Location**: `catalog/serializers/subject_serializers.py`

```python
class SubjectSerializer(ModelSerializer):
    name = CharField(source='description', read_only=True)  # Frontend alias

    class Meta:
        model = Subject
        fields = ['id', 'code', 'description', 'name']
```

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| id | int | auto | Primary key |
| code | str | code | Subject code (e.g., "CM2") |
| description | str | description | Full subject name |
| name | str | description | Alias for frontend compatibility |

---

### ExamSessionSerializer

**Location**: `catalog/serializers/exam_session_serializers.py`

```python
class ExamSessionSerializer(ModelSerializer):
    class Meta:
        model = ExamSession
        fields = ['id', 'session_code', 'start_date', 'end_date', 'create_date', 'modified_date']
        read_only_fields = ['create_date', 'modified_date']
```

| Field | Type | Read-Only | Notes |
|-------|------|-----------|-------|
| id | int | No | Primary key |
| session_code | str | No | Session identifier |
| start_date | date | No | Session start |
| end_date | date | No | Session end |
| create_date | datetime | Yes | Auto-set on create |
| modified_date | datetime | Yes | Auto-updated |

---

### ProductVariationSerializer

**Location**: `catalog/serializers/product_serializers.py`

```python
class ProductVariationSerializer(ModelSerializer):
    class Meta:
        model = ProductVariation
        fields = ['id', 'variation_type', 'name', 'description']
```

| Field | Type | Notes |
|-------|------|-------|
| id | int | Primary key |
| variation_type | str | Type category (eBook, Printed, etc.) |
| name | str | Variation name |
| description | str | Full description |

---

### ProductSerializer

**Location**: `catalog/serializers/product_serializers.py`

```python
class ProductSerializer(ModelSerializer):
    product_name = CharField(source='shortname', read_only=True)
    type = SerializerMethodField()
    variations = SerializerMethodField()

    class Meta:
        model = Product
        fields = ['id', 'fullname', 'shortname', 'product_name', 'description', 'code',
                 'type', 'variations', 'created_at', 'updated_at', 'is_active', 'buy_both']
        read_only_fields = ['created_at', 'updated_at']
```

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| id | int | auto | Primary key |
| fullname | str | fullname | Full product name |
| shortname | str | shortname | Short name |
| product_name | str | shortname | Alias for frontend |
| description | str | description | Product description |
| code | str | code | Product code |
| type | str | computed | "Tutorial", "Markings", or "Material" |
| variations | list | computed | Nested variation objects |
| created_at | datetime | created_at | Read-only |
| updated_at | datetime | updated_at | Read-only |
| is_active | bool | is_active | Active status |
| buy_both | bool | buy_both | Buy-both option flag |

**Type Computation Logic**:
```python
def get_type(self, obj):
    group_names = [g.name for g in obj.groups.all()]
    if 'Tutorial' in group_names:
        return 'Tutorial'
    elif 'Marking' in group_names:
        return 'Markings'
    return 'Material'
```

---

### ProductBundleProductSerializer

**Location**: `catalog/serializers/bundle_serializers.py`

```python
class ProductBundleProductSerializer(ModelSerializer):
    product = SerializerMethodField()
    product_variation = SerializerMethodField()

    class Meta:
        model = ProductBundleProduct
        fields = ['id', 'product', 'product_variation', 'default_price_type',
                 'quantity', 'sort_order', 'is_active']
```

| Field | Type | Notes |
|-------|------|-------|
| id | int | Primary key |
| product | object | Nested {id, shortname, fullname, code} |
| product_variation | object | Nested {id, name, variation_type} |
| default_price_type | str | Default price type |
| quantity | int | Quantity in bundle |
| sort_order | int | Display order |
| is_active | bool | Active status |

---

### ProductBundleSerializer

**Location**: `catalog/serializers/bundle_serializers.py`

```python
class ProductBundleSerializer(ModelSerializer):
    subject_code = CharField(source='subject.code', read_only=True)
    subject_name = CharField(source='subject.name', read_only=True)
    components = ProductBundleProductSerializer(source='bundle_products', many=True, read_only=True)
    components_count = SerializerMethodField()

    class Meta:
        model = ProductBundle
        fields = ['id', 'bundle_name', 'bundle_description', 'subject_code', 'subject_name',
                 'is_featured', 'is_active', 'display_order', 'components', 'components_count',
                 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
```

| Field | Type | Notes |
|-------|------|-------|
| id | int | Primary key |
| bundle_name | str | Bundle display name |
| bundle_description | str | Description |
| subject_code | str | Related subject code |
| subject_name | str | Related subject name |
| is_featured | bool | Featured flag |
| is_active | bool | Active status |
| display_order | int | Sort order |
| components | list | Nested ProductBundleProductSerializer |
| components_count | int | Active components count |
| created_at | datetime | Read-only |
| updated_at | datetime | Read-only |

---

## View-Model Relationships

### ViewSet to Model Mapping

| ViewSet | Model | Serializer | Actions |
|---------|-------|------------|---------|
| SubjectViewSet | Subject | SubjectSerializer | list, retrieve, create, update, delete, bulk_import |
| ExamSessionViewSet | ExamSession | ExamSessionSerializer | list, retrieve, create, update, delete |
| ProductViewSet | Product | ProductSerializer | list, retrieve, create, update, delete, bulk_import, bundle_contents, bundles |
| BundleViewSet | ExamSessionSubjectBundle | ExamSessionSubjectBundleSerializer | list, retrieve |

### Function-Based Views

| View | Primary Model | Serializers Used |
|------|---------------|------------------|
| navigation_data | Subject, FilterGroup, Product, ProductVariation | Inline dict construction |
| fuzzy_search | Subject, FilterGroup, ProductVariation, Product | SubjectSerializer, FilterGroupSerializer, ProductVariationSerializer, ProductSerializer |
| advanced_product_search | Product | ProductSerializer |

---

## Permission Model

### IsSuperUser Permission Class

**Location**: `catalog/permissions.py`

```python
from rest_framework.permissions import BasePermission

class IsSuperUser(BasePermission):
    """
    Allows access only to superusers (is_superuser=True).
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)
```

### Permission Matrix

| ViewSet | list | retrieve | create | update | delete |
|---------|------|----------|--------|--------|--------|
| SubjectViewSet | AllowAny | AllowAny | IsSuperUser | IsSuperUser | IsSuperUser |
| ExamSessionViewSet | AllowAny | AllowAny | IsSuperUser | IsSuperUser | IsSuperUser |
| ProductViewSet | AllowAny | AllowAny | IsSuperUser | IsSuperUser | IsSuperUser |
| BundleViewSet | AllowAny | AllowAny | N/A | N/A | N/A |

---

## Caching Model

### Cache Keys and TTL

| Cache Key | TTL | Invalidation Trigger |
|-----------|-----|----------------------|
| `subjects_list_v1` | 300s (5 min) | Subject create/update/delete |
| `navigation_data_v2` | 300s (5 min) | Subject/FilterGroup/Product changes |

### Cache Strategy

1. **Read-through caching**: Check cache before DB query
2. **Manual invalidation**: Clear on write operations
3. **Versioned keys**: Allows safe key schema updates

---

## External Dependencies

### Models from Other Apps (Not Migrated)

| Model | App | Usage |
|-------|-----|-------|
| FilterGroup | products | Product groups, navigation |
| ExamSessionSubjectBundle | exam_sessions_subjects_products | BundleViewSet queryset |
| ExamSessionSubjectBundleProduct | exam_sessions_subjects_products | Bundle components |
| ExamSessionSubjectProduct | exam_sessions_subjects_products | Product filtering |

### Services from Other Apps

| Service | App | Usage |
|---------|-----|-------|
| get_filter_service() | products | filter_configuration view |
| get_product_filter_service() | products | Product filtering |

---

## Data Flow Diagrams

### Subject List Request Flow

```
┌────────┐     ┌─────────────┐     ┌───────┐     ┌────────────┐
│ Client │────►│ SubjectView │────►│ Cache │────►│ PostgreSQL │
└────────┘     └─────────────┘     └───────┘     └────────────┘
     │               │                  │               │
     │  GET /api/    │  Check cache     │               │
     │  catalog/     │  subjects_list   │               │
     │  subjects/    │      v1          │               │
     │               │                  │               │
     │               │◄─────────────────┤ Cache hit     │
     │◄──────────────┤  Return cached   │               │
     │               │  response        │               │
     │               │                  │               │
     │               │  Cache miss      │               │
     │               │──────────────────┼──────────────►│
     │               │                  │               │
     │               │◄─────────────────┼───────────────┤
     │               │  Query + cache   │               │
     │◄──────────────┤  set (300s)      │               │
     │               │                  │               │
     └───────────────┴──────────────────┴───────────────┘
```

### Product Bundle Contents Flow

```
┌────────┐     ┌─────────────────┐     ┌────────────┐
│ Client │────►│ ProductViewSet  │────►│ PostgreSQL │
└────────┘     └─────────────────┘     └────────────┘
     │               │                       │
     │  GET /api/    │                       │
     │  catalog/     │  get_bundle_contents  │
     │  products/    │  action               │
     │  {pk}/        │                       │
     │  bundle-      │  1. Get ProductBundle │
     │  contents/    │─────────────────────►│
     │               │◄─────────────────────│
     │               │                       │
     │               │  2. Get              │
     │               │  ProductBundleProduct│
     │               │  with select_related │
     │               │─────────────────────►│
     │               │◄─────────────────────│
     │               │                       │
     │               │  3. Serialize        │
     │◄──────────────┤  with nested data    │
     │               │                       │
     └───────────────┴───────────────────────┘
```
