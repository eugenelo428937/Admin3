# Catalog Nested Apps Refactoring Design

**Date**: 2026-01-25
**Status**: Approved
**Author**: Brainstorming session with Claude

## Overview

Refactor the catalog app into nested Django apps for better file organization, independent deployability, and code isolation.

## Goals

1. **File organization** - Logical grouping for easier navigation (11+ model files → organized sub-modules)
2. **Independent deployability** - Sub-modules reusable in other Django projects
3. **Code isolation** - Strict boundaries between sub-modules

## Decisions

| # | Decision |
|---|----------|
| 1 | Remove `ExamSessionSubjectProduct`, migrate marking app to `store.Product` |
| 2 | Move `ProductProductGroup` to `filtering` app |
| 3 | Use Full Nested Django Apps structure |
| 4 | Dependency direction: Products layer depends on catalog core (not vice versa) |
| 5 | Fresh migrations - clean slate approach |
| 6 | Clean break - no backward-compatible imports |

## Final App Structure

```
backend/django_Admin3/
├── catalog/                              # CORE APP
│   ├── __init__.py
│   ├── apps.py                           # CatalogConfig
│   ├── models/
│   │   ├── __init__.py                   # Exports ExamSessionSubject only
│   │   └── exam_session_subject.py
│   ├── serializers/
│   ├── views/
│   ├── admin.py
│   ├── urls.py
│   └── migrations/
│
│   ├── exam_session/                     # NESTED APP
│   │   ├── __init__.py
│   │   ├── apps.py                       # ExamSessionConfig
│   │   ├── models.py                     # ExamSession
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── admin.py
│   │   └── migrations/
│   │
│   ├── subject/                          # NESTED APP
│   │   ├── __init__.py
│   │   ├── apps.py                       # SubjectConfig
│   │   ├── models.py                     # Subject
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── admin.py
│   │   └── migrations/
│   │
│   └── products/                         # NESTED APP
│       ├── __init__.py
│       ├── apps.py                       # ProductsConfig
│       ├── models/
│       │   ├── __init__.py
│       │   ├── product.py
│       │   ├── product_variation.py
│       │   └── product_product_variation.py
│       ├── serializers/
│       ├── views/
│       ├── admin.py
│       ├── migrations/
│       │
│       ├── bundle/                       # NESTED APP (level 2)
│       │   ├── apps.py
│       │   ├── models.py                 # ProductBundle, ProductBundleProduct
│       │   └── migrations/
│       │
│       └── recommendation/               # NESTED APP (level 2)
│           ├── apps.py
│           ├── models.py                 # ProductVariationRecommendation
│           └── migrations/
```

## Dependency Hierarchy

```
┌─────────────────────────────────────────────┐
│  CORE (standalone, no product dependency)   │
│  ┌──────────────┐  ┌─────────────────────┐  │
│  │ exam_session │  │      subject        │  │
│  └──────┬───────┘  └──────────┬──────────┘  │
│         └──────────┬──────────┘             │
│           ┌────────▼────────┐               │
│           │     catalog     │               │
│           │ (ExamSessionSubject)            │
│           └─────────────────┘               │
└─────────────────────────────────────────────┘
                    ▲
                    │ depends on
┌───────────────────┴─────────────────────────┐
│  PRODUCTS LAYER                             │
│           ┌─────────────────┐               │
│           │    products     │               │
│           │ (Product, PV, PPV)              │
│           └────────┬────────┘               │
│                    │                        │
│      ┌─────────────┼─────────────┐          │
│      ▼             ▼             ▼          │
│  ┌────────┐  ┌────────────┐  (future)       │
│  │ bundle │  │recommendation│               │
│  └────────┘  └────────────┘                 │
└─────────────────────────────────────────────┘
```

## App Registration

### INSTALLED_APPS

```python
# settings.py
INSTALLED_APPS = [
    # ... Django core apps ...

    # Catalog core (leaf nodes first, then parent)
    'catalog.exam_session',
    'catalog.subject',
    'catalog',

    # Products layer (depends on catalog core)
    'catalog.products',
    'catalog.products.bundle',
    'catalog.products.recommendation',

    # Store layer (depends on catalog.products)
    'store',

    # Filtering (now owns ProductProductGroup)
    'filtering',

    # Other apps...
    'cart',
    'orders',
    'marking',
]
```

### App Configs

```python
# catalog/apps.py
class CatalogConfig(AppConfig):
    name = 'catalog'
    label = 'catalog'

# catalog/exam_session/apps.py
class ExamSessionConfig(AppConfig):
    name = 'catalog.exam_session'
    label = 'catalog_exam_sessions'

# catalog/subject/apps.py
class SubjectConfig(AppConfig):
    name = 'catalog.subject'
    label = 'catalog_subjects'

# catalog/products/apps.py
class ProductsConfig(AppConfig):
    name = 'catalog.products'
    label = 'catalog_products'

# catalog/products/bundle/apps.py
class BundleConfig(AppConfig):
    name = 'catalog.products.bundle'
    label = 'catalog_products_bundles'

# catalog/products/recommendation/apps.py
class RecommendationConfig(AppConfig):
    name = 'catalog.products.recommendation'
    label = 'catalog_products_recommendations'
```

## Database Tables

All tables use the `acted` schema:

| Model | Table Name |
|-------|------------|
| ExamSession | `acted.catalog_exam_sessions` |
| Subject | `acted.catalog_subjects` |
| ExamSessionSubject | `acted.catalog_exam_session_subjects` |
| Product | `acted.catalog_products` |
| ProductVariation | `acted.catalog_product_variations` |
| ProductProductVariation | `acted.catalog_product_product_variations` |
| ProductBundle | `acted.catalog_product_bundles` |
| ProductBundleProduct | `acted.catalog_product_bundle_products` |
| ProductVariationRecommendation | `acted.catalog_product_variation_recommendations` |
| ProductProductGroup (moved) | `acted.filtering_product_product_groups` |

## Model Relocations

| Model | Current Location | New Location | Action |
|-------|------------------|--------------|--------|
| ExamSession | `catalog/models/` | `catalog/exam_session/` | Move |
| Subject | `catalog/models/` | `catalog/subject/` | Move |
| ExamSessionSubject | `catalog/models/` | `catalog/models/` | Keep |
| Product | `catalog/models/` | `catalog/products/models/` | Move |
| ProductVariation | `catalog/models/` | `catalog/products/models/` | Move |
| ProductProductVariation | `catalog/models/` | `catalog/products/models/` | Move |
| ProductBundle | `catalog/models/` | `catalog/products/bundle/` | Move |
| ProductBundleProduct | `catalog/models/` | `catalog/products/bundle/` | Move |
| ProductVariationRecommendation | `catalog/models/` | `catalog/products/recommendation/` | Move |
| ExamSessionSubjectProduct | `catalog/models/` | **REMOVED** | Delete |
| ProductProductGroup | `catalog/models/` | `filtering/models/` | Move |

## New Import Paths

```python
# Models
from catalog.exam_session.models import ExamSession
from catalog.subject.models import Subject
from catalog.models import ExamSessionSubject
from catalog.products.models import Product, ProductVariation, ProductProductVariation
from catalog.products.bundle.models import ProductBundle, ProductBundleProduct
from catalog.products.recommendation.models import ProductVariationRecommendation
from filtering.models import ProductProductGroup

# ForeignKey references (use app labels)
models.ForeignKey('catalog_exam_sessions.ExamSession', ...)
models.ForeignKey('catalog_subjects.Subject', ...)
models.ForeignKey('catalog_products.Product', ...)
```

## Migration Strategy

### Phase 1: Preparation
1. Create git branch for the refactoring
2. Document all current import locations using `grep`
3. Backup database before migration

### Phase 2: Create New App Structure
1. Create folder structure for all nested apps
2. Create `apps.py` for each nested app
3. Move model files to new locations
4. Update all `db_table` Meta options to use `acted` schema

### Phase 3: Update Imports Across Codebase
Update all files that import from catalog:
- `store/` models (FKs to catalog)
- `cart/` models
- `orders/` models
- `marking/` models (migrate to store.Product)
- `filtering/` (receives ProductProductGroup)
- Serializers, views, admin files
- Tests
- Management commands

### Phase 4: Fresh Migrations
```bash
# Delete old migrations
rm -rf catalog/migrations/

# Create new migration folders
mkdir catalog/migrations catalog/exam_session/migrations ...

# Create fresh migrations (order matters - leaf nodes first)
python manage.py makemigrations catalog_exam_sessions
python manage.py makemigrations catalog_subjects
python manage.py makemigrations catalog
python manage.py makemigrations catalog_products
python manage.py makemigrations catalog_products_bundles
python manage.py makemigrations catalog_products_recommendations

# On existing database: fake the migrations
python manage.py migrate --fake
```

### Phase 5: Marking App Migration
1. Update `MarkingPaper` FK from `ExamSessionSubjectProduct` → `store.Product`
2. Create data migration to link existing marking papers to store products
3. Remove `ExamSessionSubjectProduct` model entirely

## Filtering App Changes

Move `ProductProductGroup` to filtering app:

```python
# filtering/models/product_product_group.py
from django.db import models

class ProductProductGroup(models.Model):
    """Junction table linking catalog products to filter groups."""

    product = models.ForeignKey(
        'catalog_products.Product',
        on_delete=models.CASCADE,
        related_name='product_groups'
    )
    product_group = models.ForeignKey(
        'filtering.FilterGroup',
        on_delete=models.CASCADE,
        related_name='product_mappings'
    )

    class Meta:
        db_table = '"acted"."filtering_product_product_groups"'
        unique_together = ('product', 'product_group')
```

## Risk Mitigation

1. **Database backup** before any migration
2. **Feature branch** for all changes
3. **Comprehensive grep** to find all import locations
4. **Fresh migrations with --fake** on existing databases
5. **Test suite** must pass before merge

## Success Criteria

- [ ] All nested apps created with correct structure
- [ ] All models moved to correct locations
- [ ] All imports updated across codebase
- [ ] Fresh migrations created and applied (--fake on existing DB)
- [ ] Marking app migrated to use store.Product
- [ ] ProductProductGroup moved to filtering app
- [ ] ExamSessionSubjectProduct removed
- [ ] All tests passing
- [ ] No circular import errors
