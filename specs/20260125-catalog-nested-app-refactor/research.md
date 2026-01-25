# Research: Catalog Nested Apps Refactoring

**Date**: 2026-01-25
**Feature Branch**: `20260125-catalog-nested-app-refactor`

## Research Task 1: Current Import Locations

### Files Importing from catalog.models

Found **50+ import statements** across the codebase:

#### Marking App (migration required)
| File | Imports |
|------|---------|
| `marking/models/marking_paper.py` | `ExamSessionSubjectProduct` |
| `marking/views.py` | `ExamSessionSubjectProduct` |
| `marking/management/commands/import_marking_deadlines.py` | `ExamSessionSubjectProduct`, `Product`, `ExamSessionSubject` |
| `marking/tests/test_models.py` | `ExamSession`, `ExamSessionSubject`, `ExamSessionSubjectProduct`, `Subject`, `Product` |
| `marking/tests/test_views.py` | `ExamSession`, `ExamSessionSubject`, `ExamSessionSubjectProduct`, `Subject`, `Product` |

#### Filtering App
| File | Imports |
|------|---------|
| `filtering/views.py` | `Product` |
| `filtering/services/filter_service.py` | `Subject`, `ProductVariation` |

#### Catalog App (internal - will use new paths)
| File | Imports |
|------|---------|
| `catalog/views/exam_session_views.py` | `ExamSession` |
| `catalog/views/navigation_views.py` | `Subject`, `Product`, `ProductVariation` |
| `catalog/views/subject_views.py` | `Subject` |
| `catalog/views/product_views.py` | Multiple product models |
| `catalog/serializers/*.py` | Various models |
| `catalog/tests/*.py` | All models |

#### Store App
| File | Imports |
|------|---------|
| `store/tests/test_models.py` | `ExamSessionSubject`, `ProductProductVariation`, `Subject`, `ExamSession`, `Product`, `ProductVariation`, `ProductBundle` |
| `store/tests/test_views.py` | Multiple models |

#### Cart App
| File | Imports |
|------|---------|
| `cart/services/cart_service.py` | `ProductProductVariation` |
| `cart/tests/test_cart_multiple_materials.py` | Multiple models |

#### Search App
| File | Imports |
|------|---------|
| `search/services/search_service.py` | `Subject`, `ProductVariationRecommendation` |

#### Tutorials App
| File | Imports |
|------|---------|
| `tutorials/views.py` | `Product` (as `CatalogProduct`) |
| `tutorials/tests/*.py` | Multiple models |

#### Misc/Products App (legacy wrappers)
| File | Imports |
|------|---------|
| `misc/products/models/products.py` | `Product`, `ProductProductGroup` |
| `misc/products/models/product_variation.py` | `ProductVariation` |
| `misc/products/models/bundle_product.py` | `ProductBundle`, `ProductBundleProduct` |
| `misc/products/views.py` | `Product` |

#### Misc/Subjects App
| File | Imports |
|------|---------|
| `misc/subjects/models.py` | `Subject` |

### Decision: Import Update Strategy

All imports will be updated to use new nested app paths:

```python
# OLD
from catalog.models import Subject, Product, ExamSession

# NEW
from catalog.exam_session.models import ExamSession
from catalog.subject.models import Subject
from catalog.products.models import Product, ProductVariation, ProductProductVariation
from catalog.products.bundle.models import ProductBundle, ProductBundleProduct
from catalog.products.recommendation.models import ProductVariationRecommendation
from filtering.models import ProductProductGroup  # Moved to filtering
```

---

## Research Task 2: ExamSessionSubjectProduct Usage

### Current Usage (files referencing ESSP)

| Category | Files |
|----------|-------|
| **Model Definition** | `catalog/models/exam_session_subject_product.py` |
| **Marking App** (production) | `marking/models/marking_paper.py`, `marking/views.py`, `marking/management/commands/import_marking_deadlines.py` |
| **Tests** | `marking/tests/test_models.py`, `marking/tests/test_views.py`, `tutorials/tests/test_models.py`, `tutorials/tests/test_views.py` |
| **Rules Engine Tests** | `test_phase4_t027_uk_single_product.py`, `test_phase4_t028_sa_multiple_products.py`, `test_phase4_t029_row_zero_vat.py`, `test_phase4_t030_quantity_change.py`, `test_phase4_t031_item_removal.py`, `test_phase4_t032_error_handling.py` |
| **Services** | `filtering/services/filter_service.py`, `misc/products/services/filter_service.py` |
| **Migrations** | `catalog/migrations/0009_add_exam_session_subject_product.py` |

### Decision: Migration Path

**Confirmed**: ExamSessionSubjectProduct is redundant with store.Product.

- Both link `ExamSessionSubject` to a product variation
- store.Product uses `ProductProductVariation` (cleaner)
- ESSP uses direct FK to `ExamSessionSubject` + variation

**Migration Strategy** (from spec clarification):
- Marking products have **only one variation per ESS**
- Direct 1:1 mapping: Each MarkingPaper links to its corresponding store.Product
- Data migration: Find store.Product where `exam_session_subject` matches ESSP's ESS

```python
# Migration pseudocode
for marking_paper in MarkingPaper.objects.all():
    essp = marking_paper.exam_session_subject_product
    store_product = StoreProduct.objects.get(
        exam_session_subject=essp.exam_session_subject,
        product_product_variation__product_variation__variation_type='Marking'
    )
    marking_paper.product = store_product
    marking_paper.save()
```

---

## Research Task 3: Foreign Key Dependencies

### Models with FKs to Catalog Models

| Source Model | FK Field | Target Model | String Reference After |
|--------------|----------|--------------|----------------------|
| `catalog.ExamSessionSubject` | `exam_session` | `ExamSession` | `'catalog_exam_sessions.ExamSession'` |
| `catalog.ExamSessionSubject` | `subject` | `Subject` | `'catalog_subjects.Subject'` |
| `catalog.ProductProductVariation` | `product` | `Product` | `'catalog_products.Product'` |
| `catalog.ProductProductVariation` | `product_variation` | `ProductVariation` | `'catalog_products.ProductVariation'` |
| `catalog.ProductBundle` | `subject` | `Subject` | `'catalog_subjects.Subject'` |
| `catalog.ProductBundleProduct` | `bundle` | `ProductBundle` | `'catalog_products_bundles.ProductBundle'` |
| `catalog.ProductBundleProduct` | `product_product_variation` | `ProductProductVariation` | `'catalog_products.ProductProductVariation'` |
| `catalog.ProductVariationRecommendation` | (multiple) | `ProductProductVariation` | `'catalog_products.ProductProductVariation'` |
| `catalog.ProductProductGroup` | `product` | `Product` | `'catalog_products.Product'` |
| `catalog.ProductProductGroup` | `product_group` | `FilterGroup` | `'filtering.FilterGroup'` |
| `store.Product` | `exam_session_subject` | `ExamSessionSubject` | `'catalog.ExamSessionSubject'` |
| `store.Product` | `product_product_variation` | `ProductProductVariation` | `'catalog_products.ProductProductVariation'` |
| `marking.MarkingPaper` | (new) | `store.Product` | `'store.Product'` |

### Decision: Use String References

All cross-app ForeignKeys will use string references to avoid circular imports:

```python
# In catalog/models/exam_session_subject.py
exam_session = models.ForeignKey(
    'catalog_exam_sessions.ExamSession',
    on_delete=models.CASCADE
)

# In store/models/product.py
product_product_variation = models.ForeignKey(
    'catalog_products.ProductProductVariation',
    on_delete=models.CASCADE
)
```

---

## Research Task 4: Migration Order

### INSTALLED_APPS Order (dependencies first)

```python
INSTALLED_APPS = [
    # ... Django core ...

    # Catalog core (leaf nodes first - no internal dependencies)
    'catalog.exam_session',    # No catalog dependencies
    'catalog.subject',          # No catalog dependencies
    'catalog',                  # Depends on exam_session, subject

    # Products layer (depends on catalog core)
    'catalog.products',                    # Depends on catalog
    'catalog.products.bundle',             # Depends on products
    'catalog.products.recommendation',     # Depends on products

    # Other apps
    'filtering',  # ProductProductGroup moves here
    'store',      # Depends on catalog, catalog.products
    'marking',    # Depends on store
    'cart',
    'orders',
    # ...
]
```

### Fresh Migration Order

```bash
# 1. Delete old migrations
rm -rf catalog/migrations/

# 2. Create new migration directories
mkdir -p catalog/migrations
mkdir -p catalog/exam_session/migrations
mkdir -p catalog/subject/migrations
mkdir -p catalog/products/migrations
mkdir -p catalog/products/bundle/migrations
mkdir -p catalog/products/recommendation/migrations

# 3. Create migrations in dependency order
python manage.py makemigrations catalog_exam_sessions  # Leaf
python manage.py makemigrations catalog_subjects        # Leaf
python manage.py makemigrations catalog                 # Depends on above
python manage.py makemigrations catalog_products        # Depends on catalog
python manage.py makemigrations catalog_products_bundles      # Depends on products
python manage.py makemigrations catalog_products_recommendations  # Depends on products
python manage.py makemigrations filtering               # Add ProductProductGroup

# 4. On existing database with data
python manage.py migrate --fake
```

---

## Research Task 5: App Registration in Django 6.0

### Verified Pattern

Django 6.0 supports nested app registration with unique labels:

```python
# catalog/exam_session/apps.py
from django.apps import AppConfig

class ExamSessionConfig(AppConfig):
    name = 'catalog.exam_session'         # Full dotted path
    label = 'catalog_exam_sessions'        # Unique label (used in FK strings)
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = 'Catalog - Exam Sessions'
```

### Label Usage

- `name`: Full Python import path (how Django finds the app)
- `label`: Unique identifier (used in database tables, FK strings, admin)

Labels must be globally unique. Our pattern:
- `catalog` (parent app)
- `catalog_exam_sessions`
- `catalog_subjects`
- `catalog_products`
- `catalog_products_bundles`
- `catalog_products_recommendations`

---

## Research Task 6: ProductProductGroup Destination

### Current Location

`catalog/models/product_product_group.py`:
- Links `catalog.Product` to `filtering.FilterGroup`
- Table: `acted.catalog_product_product_groups`

### Target Location

`filtering/models/product_product_group.py`:
- Improves cohesion (filter-related models together)
- Table: `acted.filtering_product_product_groups` (new table name)
- FK to `catalog_products.Product` (string reference)

### Migration Considerations

1. Create new model in filtering app
2. Data migration to copy rows
3. Update FK references in other models
4. Remove old model from catalog

---

## Summary of Decisions

| Research Area | Decision | Rationale |
|---------------|----------|-----------|
| Import Updates | Update all 50+ imports to new paths | Clean break, no backward compatibility (Decision #6) |
| ESSP Removal | Migrate marking to store.Product, delete ESSP | 1:1 mapping, marking has single variation |
| FK References | Use string labels (`'catalog_products.Product'`) | Prevents circular imports |
| Migration Order | Leaf apps first, then dependents | Django dependency resolution |
| App Labels | Plural form (`catalog_exam_sessions`) | User preference, consistent naming |
| ProductProductGroup | Move to filtering app | Cohesion with filter models (Decision #2) |
