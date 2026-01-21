# Quickstart: Catalog App Consolidation

**Feature**: 001-catalog-consolidation
**Date**: 2026-01-05

## Overview

This guide provides step-by-step instructions for implementing the catalog app consolidation. Follow these steps in order.

## Prerequisites

- Python 3.14+
- Django 5.1+
- PostgreSQL 12+ with schema support
- Access to `backend/django_Admin3/` directory

## Implementation Steps

### Step 1: Create Catalog App Structure

```bash
cd backend/django_Admin3
python manage.py startapp catalog
```

Then organize the app structure:

```text
catalog/
├── __init__.py
├── apps.py
├── admin.py
├── models/
│   ├── __init__.py
│   ├── subject.py                    # Subject model
│   ├── exam_session.py               # ExamSession model
│   ├── product.py                    # Product model
│   ├── product_variation.py          # ProductVariation model
│   ├── product_product_variation.py  # ProductProductVariation junction
│   ├── product_product_group.py      # ProductProductGroup junction
│   ├── product_bundle.py             # ProductBundle model
│   └── product_bundle_product.py     # ProductBundleProduct junction
├── migrations/
│   └── __init__.py
├── serializers/
│   └── __init__.py
├── views/
│   └── __init__.py
├── urls.py
└── tests/
    ├── __init__.py
    ├── test_models.py
    ├── test_migrations.py
    └── test_backward_compat.py
```

### Step 2: Configure AppConfig

**File**: `catalog/apps.py`

```python
from django.apps import AppConfig


class CatalogConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'catalog'
    verbose_name = 'Catalog'
```

### Step 3: Add to INSTALLED_APPS

**File**: `django_Admin3/settings/base.py`

Add `catalog` BEFORE the apps that will depend on it:

```python
INSTALLED_APPS = [
    # Django built-ins...
    'catalog',  # Must be before subjects, exam_sessions, products
    'subjects',
    'exam_sessions',
    'products',
    # Other apps...
]
```

### Step 4: Create Model Files

Copy models from source apps to catalog, updating `db_table` meta option:

| Model | Source File | Dest File | New db_table |
|-------|-------------|-----------|--------------|
| Subject | subjects/models.py | catalog/models/subject.py | `acted.catalog_subjects` |
| ExamSession | exam_sessions/models.py | catalog/models/exam_session.py | `acted.catalog_exam_sessions` |
| Product | products/models/products.py | catalog/models/product.py | `acted.catalog_products` |
| ProductVariation | products/models/product_variation.py | catalog/models/product_variation.py | `acted.catalog_product_variations` |
| ProductProductVariation | products/models/__init__.py | catalog/models/product_product_variation.py | `acted.catalog_product_product_variations` |
| ProductProductGroup | products/models/products.py | catalog/models/product_product_group.py | `acted.catalog_product_product_groups` |
| ProductBundle | products/models/bundle_product.py | catalog/models/product_bundle.py | `acted.catalog_product_bundles` |
| ProductBundleProduct | products/models/bundle_product.py | catalog/models/product_bundle_product.py | `acted.catalog_product_bundle_products` |

### Step 5: Create Model Re-exports

**File**: `catalog/models/__init__.py`

```python
from .subject import Subject
from .exam_session import ExamSession
from .product import Product
from .product_variation import ProductVariation
from .product_product_variation import ProductProductVariation
from .product_product_group import ProductProductGroup
from .product_bundle import ProductBundle
from .product_bundle_product import ProductBundleProduct

__all__ = [
    'Subject',
    'ExamSession',
    'Product',
    'ProductVariation',
    'ProductProductVariation',
    'ProductProductGroup',
    'ProductBundle',
    'ProductBundleProduct',
]
```

### Step 6: Create Migrations

#### Migration 1: Create Schema

```bash
python manage.py makemigrations catalog --empty --name create_schema
```

Edit to add:

```python
from django.db import migrations


class Migration(migrations.Migration):
    initial = True
    dependencies = []

    operations = [
        migrations.RunSQL(
            sql="CREATE SCHEMA IF NOT EXISTS acted;",
            reverse_sql="DROP SCHEMA IF EXISTS acted CASCADE;"
        ),
    ]
```

#### Migration 2: Create Tables

```bash
python manage.py makemigrations catalog
```

This auto-generates model creation based on your model definitions.

#### Migration 3: Copy Data

```bash
python manage.py makemigrations catalog --empty --name copy_data
```

Edit to add data copy operations (see research.md for SQL patterns).

### Step 7: Update Source Apps for Backward Compatibility

**File**: `subjects/models.py`

```python
# Re-export Subject from catalog for backward compatibility
from catalog.models import Subject

__all__ = ['Subject']
```

**File**: `exam_sessions/models.py`

```python
# Re-export ExamSession from catalog for backward compatibility
from catalog.models import ExamSession

__all__ = ['ExamSession']
```

**File**: `products/models/__init__.py`

Update to re-export from catalog while keeping filter system models local:

```python
# Re-export catalog models for backward compatibility
from catalog.models import (
    Product,
    ProductVariation,
    ProductProductVariation,
    ProductProductGroup,
    ProductBundle,
    ProductBundleProduct,
)

# Local models that stay in products app
from .filter_system import (
    FilterGroup,
    FilterConfiguration,
    FilterConfigurationGroup,
    FilterPreset,
    FilterUsageAnalytics,
)
from .product_variation_recommendation import ProductVariationRecommendation

__all__ = [
    # Re-exported from catalog
    'Product',
    'ProductVariation',
    'ProductProductVariation',
    'ProductProductGroup',
    'ProductBundle',
    'ProductBundleProduct',
    # Local models
    'FilterGroup',
    'FilterConfiguration',
    'FilterConfigurationGroup',
    'FilterPreset',
    'FilterUsageAnalytics',
    'ProductVariationRecommendation',
]
```

### Step 8: Run Migrations

```bash
python manage.py migrate catalog
```

### Step 9: Verify

```bash
# Run all tests
python manage.py test

# Verify imports work
python -c "from catalog.models import Subject, Product, ExamSession; print('OK')"
python -c "from subjects.models import Subject; print('OK')"
python -c "from products.models import Product; print('OK')"
```

## Verification Checklist

- [x] `acted` schema exists in PostgreSQL
- [x] All 8 tables created with `acted.catalog_` prefix
- [x] Data copied from old tables to new tables
- [x] Row counts verified (603 total rows across 8 tables)
- [x] `from catalog.models import ...` works for all models
- [x] `from subjects.models import Subject` still works
- [x] `from products.models import Product` still works
- [x] `from exam_sessions.models import ExamSession` still works
- [x] All existing tests pass (44 functional tests)
- [x] No circular import errors

**Verified**: 2026-01-06

## Rollback Procedure

If issues occur:

1. Revert INSTALLED_APPS changes
2. Revert backward-compat imports in source apps
3. Run `python manage.py migrate catalog zero` to remove catalog migrations
4. Old tables remain intact with original data

## Common Issues

### Circular Import Error

**Cause**: App ordering issue or import order
**Fix**: Ensure `catalog` is first in INSTALLED_APPS, use late imports if needed

### Foreign Key Reference Error

**Cause**: Migration order issue
**Fix**: Add explicit `dependencies` in migration files

### Data Mismatch After Copy

**Cause**: Sequence not updated after data copy
**Fix**: Run `SELECT setval('acted.catalog_subjects_id_seq', (SELECT MAX(id) FROM acted.catalog_subjects));` for each table
