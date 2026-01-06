# Research: Catalog App Consolidation

**Feature**: 001-catalog-consolidation
**Date**: 2026-01-05
**Status**: Complete

## Executive Summary

Research phase analyzed the existing model structures, dependencies, and migration strategies for consolidating 8 models from 3 apps into a new `catalog` app with PostgreSQL `acted` schema.

## Research Areas

### 1. Existing Model Structures

#### Subject (from `subjects/models.py`)

| Field | Type | Constraints |
|-------|------|-------------|
| code | CharField(10) | unique=True |
| description | TextField | blank=True, null=True |
| active | BooleanField | default=True |
| created_at | DateTimeField | auto_now_add=True |
| updated_at | DateTimeField | auto_now=True |

**Current db_table**: `acted_subjects`
**New db_table**: `acted.catalog_subjects`

#### ExamSession (from `exam_sessions/models.py`)

| Field | Type | Constraints |
|-------|------|-------------|
| session_code | CharField(50) | null=False |
| start_date | DateTimeField | null=False |
| end_date | DateTimeField | null=False |
| create_date | DateTimeField | auto_now_add=True |
| modified_date | DateTimeField | auto_now=True |

**Current db_table**: `acted_exam_sessions`
**New db_table**: `acted.catalog_exam_sessions`

#### Product (from `products/models/products.py`)

| Field | Type | Constraints |
|-------|------|-------------|
| fullname | CharField(255) | - |
| shortname | CharField(100) | - |
| description | TextField | blank=True, null=True |
| code | CharField(10) | - |
| groups | M2M(FilterGroup) | through='ProductProductGroup' |
| product_variations | M2M(ProductVariation) | through='ProductProductVariation' |
| created_at | DateTimeField | auto_now_add=True |
| updated_at | DateTimeField | auto_now=True |
| is_active | BooleanField | default=True |
| buy_both | BooleanField | default=False |

**Current db_table**: `acted_products`
**New db_table**: `acted.catalog_products`

#### ProductVariation (from `products/models/product_variation.py`)

| Field | Type | Constraints |
|-------|------|-------------|
| variation_type | CharField(32) | choices: eBook, Hub, Printed, Marking, Tutorial |
| name | CharField(64) | - |
| description | TextField | blank=True, null=True |
| description_short | CharField(255) | blank=True, null=True |
| code | CharField(50) | unique=True, blank=True, null=True |

**Current db_table**: `acted_product_variations`
**New db_table**: `acted.catalog_product_variations`

#### ProductBundle (from `products/models/bundle_product.py`)

| Field | Type | Constraints |
|-------|------|-------------|
| bundle_name | CharField(255) | - |
| subject | FK(Subject) | on_delete=CASCADE |
| bundle_description | TextField | null=True, blank=True |
| is_featured | BooleanField | default=False |
| is_active | BooleanField | default=True |
| display_order | PositiveIntegerField | default=0 |
| created_at | DateTimeField | auto_now_add=True |
| updated_at | DateTimeField | auto_now=True |
| product_variations | M2M(ProductProductVariation) | through='ProductBundleProduct' |

**Current db_table**: `acted_product_bundles`
**New db_table**: `acted.catalog_product_bundles`

#### ProductProductVariation (from `products/models/__init__.py`)

| Field | Type | Constraints |
|-------|------|-------------|
| product | FK(Product) | on_delete=CASCADE |
| product_variation | FK(ProductVariation) | on_delete=CASCADE |

**Current db_table**: `acted_product_productvariation`
**New db_table**: `acted.catalog_product_product_variations`

#### ProductProductGroup (from `products/models/products.py`)

| Field | Type | Constraints |
|-------|------|-------------|
| product | FK(Product) | on_delete=CASCADE |
| product_group | FK(FilterGroup) | on_delete=CASCADE |

**Current db_table**: `acted_product_productgroup`
**New db_table**: `acted.catalog_product_groups`

#### ProductBundleProduct (from `products/models/bundle_product.py`)

| Field | Type | Constraints |
|-------|------|-------------|
| bundle | FK(ProductBundle) | on_delete=CASCADE |
| product_product_variation | FK(ProductProductVariation) | on_delete=CASCADE |
| default_price_type | CharField(20) | choices: standard, retaker, additional |
| quantity | PositiveIntegerField | default=1 |
| sort_order | PositiveIntegerField | default=0 |
| is_active | BooleanField | default=True |
| created_at | DateTimeField | auto_now_add=True |
| updated_at | DateTimeField | auto_now=True |

**Current db_table**: `acted_product_bundle_products`
**New db_table**: `acted.catalog_product_bundle_products`

---

### 2. Dependency Analysis

#### Models Being Moved (Internal Dependencies)

```text
Subject ← ProductBundle.subject (FK)
ProductVariation ← ProductProductVariation.product_variation (FK)
Product ← ProductProductVariation.product (FK)
Product ← ProductProductGroup.product (FK)
ProductBundle ← ProductBundleProduct.bundle (FK)
ProductProductVariation ← ProductBundleProduct.product_product_variation (FK)
```

**Decision**: Move all models together to maintain internal consistency. ProductBundle references Subject, so Subject must be defined first in the catalog models.

#### Models NOT Being Moved (External Dependencies)

| Model | Remains In | Referenced By Catalog |
|-------|------------|----------------------|
| FilterGroup | products.filter_system | Product.groups (M2M) |

**Decision**: ProductProductGroup references FilterGroup which stays in `products` app. This creates a cross-app FK reference: `catalog.ProductProductGroup → products.FilterGroup`.

#### External Apps Referencing Catalog Models

| External App | References | Model |
|--------------|------------|-------|
| cart | FK | Product, ProductVariation |
| tutorials | FK | Product, ExamSession |
| marking | FK | Product, Subject |
| exam_sessions_subjects | FK | Subject, ExamSession |
| exam_sessions_subjects_products | FK | Product, ProductProductVariation |

**Decision**: Backward-compatible re-exports ensure these apps continue working without modification.

---

### 3. PostgreSQL Schema Creation

**Best Practice**: Use raw SQL in Django migration with `RunSQL` operation.

```python
# Migration approach for schema creation
operations = [
    migrations.RunSQL(
        sql="CREATE SCHEMA IF NOT EXISTS acted;",
        reverse_sql="DROP SCHEMA IF EXISTS acted CASCADE;"
    ),
]
```

**Decision**: Create schema in first migration, create tables in second migration, copy data in third migration.

---

### 4. Data Migration Strategy

**Decision**: Copy and Preserve (from clarification)

**Approach**:
1. Create new tables in `acted` schema with new names
2. Copy data using `INSERT INTO ... SELECT FROM` pattern
3. Keep old tables as backup (do not drop)
4. Update Django models to use new `db_table`

**Migration SQL Pattern**:
```sql
INSERT INTO acted.catalog_subjects (id, code, description, active, created_at, updated_at)
SELECT id, code, description, active, created_at, updated_at
FROM acted_subjects;
```

**Decision**: Use Django's `RunSQL` with forward/reverse migrations for data copy.

---

### 5. Backward Compatibility Pattern

**Best Practice**: Re-export pattern in Python modules.

```python
# subjects/models.py (after migration)
from catalog.models import Subject

__all__ = ['Subject']
```

**Decision**: All three source apps (subjects, exam_sessions, products) will re-export moved models from catalog.

---

### 6. INSTALLED_APPS Order

**Requirement**: `catalog` must be listed before dependent apps to ensure migrations run in correct order.

```python
INSTALLED_APPS = [
    # ... Django built-ins ...
    'catalog',  # Must be before subjects, exam_sessions, products
    'subjects',
    'exam_sessions',
    'products',
    # ... other apps that depend on catalog models ...
]
```

**Decision**: Add catalog as first custom app in INSTALLED_APPS.

---

## Decisions Summary

| Area | Decision | Rationale |
|------|----------|-----------|
| Schema creation | `CREATE SCHEMA IF NOT EXISTS acted` | Safe idempotent approach |
| Data migration | Copy and Preserve | Allows rollback, old tables as backup |
| Table naming | `acted.catalog_*` with pluralized names | Consistent naming convention |
| Model organization | Separate files in `models/` directory | Better maintainability |
| Backward compat | Re-export pattern | Zero breaking changes |
| App order | `catalog` first in INSTALLED_APPS | Correct migration order |
| FilterGroup FK | Cross-app reference preserved | FilterGroup stays in products |

## Alternatives Considered

### 1. Table Renaming vs New Tables

**Considered**: Use `ALTER TABLE ... RENAME` and `ALTER TABLE ... SET SCHEMA`
**Rejected Because**: Higher risk, no easy rollback, requires careful FK handling
**Chosen**: Copy to new tables, preserve old ones

### 2. Single Migration vs Multi-Migration

**Considered**: Single migration for all changes
**Rejected Because**: Harder to debug, no partial rollback
**Chosen**: Three migrations (schema, tables, data)

### 3. Lazy Import vs Direct Import for Re-exports

**Considered**: Lazy imports to avoid circular dependencies
**Rejected Because**: Catalog has no dependencies on other apps
**Chosen**: Direct imports since catalog is leaf node in dependency graph
