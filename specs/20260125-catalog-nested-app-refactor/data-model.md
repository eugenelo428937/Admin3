# Data Model: Catalog Nested Apps Refactoring

**Date**: 2026-01-25
**Feature Branch**: `20260125-catalog-nested-app-refactor`

## Model Relocation Map

### Core Catalog Layer

| Model | Current Location | New Location | New App Label |
|-------|------------------|--------------|---------------|
| `ExamSession` | `catalog/models/exam_session.py` | `catalog/exam_session/models.py` | `catalog_exam_sessions` |
| `Subject` | `catalog/models/subject.py` | `catalog/subject/models.py` | `catalog_subjects` |
| `ExamSessionSubject` | `catalog/models/exam_session_subject.py` | `catalog/models/exam_session_subject.py` | `catalog` |

### Products Layer

| Model | Current Location | New Location | New App Label |
|-------|------------------|--------------|---------------|
| `Product` | `catalog/models/product.py` | `catalog/products/models/product.py` | `catalog_products` |
| `ProductVariation` | `catalog/models/product_variation.py` | `catalog/products/models/product_variation.py` | `catalog_products` |
| `ProductProductVariation` | `catalog/models/product_product_variation.py` | `catalog/products/models/product_product_variation.py` | `catalog_products` |

### Bundle Sub-Layer

| Model | Current Location | New Location | New App Label |
|-------|------------------|--------------|---------------|
| `ProductBundle` | `catalog/models/product_bundle.py` | `catalog/products/bundle/models.py` | `catalog_products_bundles` |
| `ProductBundleProduct` | `catalog/models/product_bundle_product.py` | `catalog/products/bundle/models.py` | `catalog_products_bundles` |

### Recommendation Sub-Layer

| Model | Current Location | New Location | New App Label |
|-------|------------------|--------------|---------------|
| `ProductVariationRecommendation` | `catalog/models/product_variation_recommendation.py` | `catalog/products/recommendation/models.py` | `catalog_products_recommendations` |

### Moved to Filtering App

| Model | Current Location | New Location | New App Label |
|-------|------------------|--------------|---------------|
| `ProductProductGroup` | `catalog/models/product_product_group.py` | `filtering/models/product_product_group.py` | `filtering` |

### Removed

| Model | Current Location | Reason |
|-------|------------------|--------|
| `ExamSessionSubjectProduct` | `catalog/models/exam_session_subject_product.py` | Redundant with `store.Product` |

---

## New Import Paths

### Core Catalog

```python
# ExamSession
from catalog.exam_session.models import ExamSession

# Subject
from catalog.subject.models import Subject

# ExamSessionSubject (stays in parent app)
from catalog.models import ExamSessionSubject
```

### Products

```python
# Product models
from catalog.products.models import Product
from catalog.products.models import ProductVariation
from catalog.products.models import ProductProductVariation

# Bundle models
from catalog.products.bundle.models import ProductBundle
from catalog.products.bundle.models import ProductBundleProduct

# Recommendation models
from catalog.products.recommendation.models import ProductVariationRecommendation
```

### Filtering (Moved Model)

```python
# ProductProductGroup now in filtering app
from filtering.models import ProductProductGroup
```

---

## Database Tables

All tables remain in the `acted` schema with consistent naming:

| Model | Table Name |
|-------|------------|
| `ExamSession` | `acted.catalog_exam_sessions` |
| `Subject` | `acted.catalog_subjects` |
| `ExamSessionSubject` | `acted.catalog_exam_session_subjects` |
| `Product` | `acted.catalog_products` |
| `ProductVariation` | `acted.catalog_product_variations` |
| `ProductProductVariation` | `acted.catalog_product_product_variations` |
| `ProductBundle` | `acted.catalog_product_bundles` |
| `ProductBundleProduct` | `acted.catalog_product_bundle_products` |
| `ProductVariationRecommendation` | `acted.catalog_product_variation_recommendations` |
| `ProductProductGroup` (moved) | `acted.filtering_product_product_groups` |

---

## Foreign Key Reference Updates

### String-Based References (Prevent Circular Imports)

```python
# catalog/models/exam_session_subject.py
class ExamSessionSubject(models.Model):
    exam_session = models.ForeignKey(
        'catalog_exam_sessions.ExamSession',  # String reference
        on_delete=models.CASCADE,
        related_name='exam_session_subjects'
    )
    subject = models.ForeignKey(
        'catalog_subjects.Subject',  # String reference
        on_delete=models.CASCADE,
        related_name='exam_session_subjects'
    )
```

```python
# catalog/products/models/product_product_variation.py
class ProductProductVariation(models.Model):
    product = models.ForeignKey(
        'catalog_products.Product',  # Same app, but string for consistency
        on_delete=models.CASCADE,
        related_name='product_variations'
    )
    product_variation = models.ForeignKey(
        'catalog_products.ProductVariation',
        on_delete=models.CASCADE
    )
```

```python
# catalog/products/bundle/models.py
class ProductBundle(models.Model):
    subject = models.ForeignKey(
        'catalog_subjects.Subject',  # Cross-app reference
        on_delete=models.CASCADE,
        related_name='bundles'
    )

class ProductBundleProduct(models.Model):
    bundle = models.ForeignKey(
        'catalog_products_bundles.ProductBundle',  # Same app
        on_delete=models.CASCADE,
        related_name='bundle_products'
    )
    product_product_variation = models.ForeignKey(
        'catalog_products.ProductProductVariation',  # Cross-app
        on_delete=models.CASCADE
    )
```

```python
# filtering/models/product_product_group.py (MOVED)
class ProductProductGroup(models.Model):
    product = models.ForeignKey(
        'catalog_products.Product',  # Cross-app reference
        on_delete=models.CASCADE,
        related_name='product_groups'
    )
    product_group = models.ForeignKey(
        'filtering.FilterGroup',  # Same app
        on_delete=models.CASCADE,
        related_name='product_product_groups'
    )

    class Meta:
        db_table = '"acted"."filtering_product_product_groups"'
```

---

## Marking App Migration

### Before (ExamSessionSubjectProduct)

```python
# marking/models/marking_paper.py (CURRENT)
from catalog.models import ExamSessionSubjectProduct

class MarkingPaper(models.Model):
    exam_session_subject_product = models.ForeignKey(
        ExamSessionSubjectProduct,
        on_delete=models.CASCADE,
        related_name='marking_papers'
    )
```

### After (store.Product)

```python
# marking/models/marking_paper.py (NEW)
class MarkingPaper(models.Model):
    product = models.ForeignKey(
        'store.Product',
        on_delete=models.CASCADE,
        related_name='marking_papers',
        help_text='The store product (marking variation) for this paper'
    )
```

### Data Migration Script

```python
# marking/migrations/0002_migrate_to_store_product.py
from django.db import migrations

def migrate_marking_to_store_product(apps, schema_editor):
    """
    Migrate MarkingPaper FK from ExamSessionSubjectProduct to store.Product.

    Each marking product has only one variation, so this is a 1:1 mapping.
    """
    MarkingPaper = apps.get_model('marking', 'MarkingPaper')
    StoreProduct = apps.get_model('store', 'Product')

    for paper in MarkingPaper.objects.select_related('exam_session_subject_product'):
        essp = paper.exam_session_subject_product

        # Find the corresponding store.Product
        # Marking products have variation_type='Marking'
        store_product = StoreProduct.objects.filter(
            exam_session_subject=essp.exam_session_subject,
            product_product_variation__product_variation__variation_type='Marking'
        ).first()

        if store_product:
            paper.product = store_product
            paper.save()
        else:
            raise ValueError(f"No store.Product found for MarkingPaper {paper.id}")

def reverse_migration(apps, schema_editor):
    # Reverse is complex - would need to recreate ESSP records
    # Mark as irreversible or implement if needed
    pass

class Migration(migrations.Migration):
    dependencies = [
        ('marking', '0001_initial'),
        ('store', '0001_initial'),
    ]

    operations = [
        # Step 1: Add new FK field (nullable initially)
        migrations.AddField(
            model_name='markingpaper',
            name='product',
            field=models.ForeignKey(
                null=True,
                on_delete=models.CASCADE,
                related_name='marking_papers',
                to='store.Product'
            ),
        ),

        # Step 2: Run data migration
        migrations.RunPython(
            migrate_marking_to_store_product,
            reverse_migration
        ),

        # Step 3: Remove old FK
        migrations.RemoveField(
            model_name='markingpaper',
            name='exam_session_subject_product',
        ),

        # Step 4: Make new FK non-nullable
        migrations.AlterField(
            model_name='markingpaper',
            name='product',
            field=models.ForeignKey(
                on_delete=models.CASCADE,
                related_name='marking_papers',
                to='store.Product'
            ),
        ),
    ]
```

---

## App Configuration Files

### catalog/apps.py

```python
from django.apps import AppConfig

class CatalogConfig(AppConfig):
    name = 'catalog'
    label = 'catalog'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = 'Catalog'
```

### catalog/exam_session/apps.py

```python
from django.apps import AppConfig

class ExamSessionConfig(AppConfig):
    name = 'catalog.exam_session'
    label = 'catalog_exam_sessions'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = 'Catalog - Exam Sessions'
```

### catalog/subject/apps.py

```python
from django.apps import AppConfig

class SubjectConfig(AppConfig):
    name = 'catalog.subject'
    label = 'catalog_subjects'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = 'Catalog - Subjects'
```

### catalog/products/apps.py

```python
from django.apps import AppConfig

class ProductsConfig(AppConfig):
    name = 'catalog.products'
    label = 'catalog_products'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = 'Catalog - Products'
```

### catalog/products/bundle/apps.py

```python
from django.apps import AppConfig

class BundleConfig(AppConfig):
    name = 'catalog.products.bundle'
    label = 'catalog_products_bundles'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = 'Catalog - Product Bundles'
```

### catalog/products/recommendation/apps.py

```python
from django.apps import AppConfig

class RecommendationConfig(AppConfig):
    name = 'catalog.products.recommendation'
    label = 'catalog_products_recommendations'
    default_auto_field = 'django.db.models.BigAutoField'
    verbose_name = 'Catalog - Product Recommendations'
```

---

## Model __init__.py Files

### catalog/models/__init__.py

```python
"""Catalog app models.

Exports ExamSessionSubject only. Other models in nested apps.
"""
from .exam_session_subject import ExamSessionSubject

__all__ = ['ExamSessionSubject']
```

### catalog/exam_session/models.py

```python
"""ExamSession model - standalone, no product dependencies."""
from django.db import models

class ExamSession(models.Model):
    # ... existing fields ...

    class Meta:
        db_table = '"acted"."catalog_exam_sessions"'
        app_label = 'catalog_exam_sessions'
```

### catalog/subject/models.py

```python
"""Subject model - standalone, no product dependencies."""
from django.db import models

class Subject(models.Model):
    # ... existing fields ...

    class Meta:
        db_table = '"acted"."catalog_subjects"'
        app_label = 'catalog_subjects'
```

### catalog/products/models/__init__.py

```python
"""Products app models."""
from .product import Product
from .product_variation import ProductVariation
from .product_product_variation import ProductProductVariation

__all__ = ['Product', 'ProductVariation', 'ProductProductVariation']
```

### catalog/products/bundle/models.py

```python
"""Bundle models."""
from django.db import models

class ProductBundle(models.Model):
    # ... existing fields ...

    class Meta:
        db_table = '"acted"."catalog_product_bundles"'
        app_label = 'catalog_products_bundles'

class ProductBundleProduct(models.Model):
    # ... existing fields ...

    class Meta:
        db_table = '"acted"."catalog_product_bundle_products"'
        app_label = 'catalog_products_bundles'
```

### catalog/products/recommendation/models.py

```python
"""Recommendation models."""
from django.db import models

class ProductVariationRecommendation(models.Model):
    # ... existing fields ...

    class Meta:
        db_table = '"acted"."catalog_product_variation_recommendations"'
        app_label = 'catalog_products_recommendations'
```

---

## Dependency Graph

```
                    ┌──────────────────┐
                    │  exam_session    │
                    │  (standalone)    │
                    └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │                  │
            ┌───────▼──────┐   ┌───────▼──────┐
            │   subject    │   │   catalog    │
            │ (standalone) │   │    (ESS)     │
            └───────┬──────┘   └───────┬──────┘
                    │                  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │    products      │
                    │ (Product, PV,    │
                    │  PPV)            │
                    └────────┬─────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
    ┌───────▼──────┐ ┌───────▼──────┐ ┌───────▼──────┐
    │    bundle    │ │recommendation│ │  filtering   │
    │              │ │              │ │   (PPG)      │
    └──────────────┘ └──────────────┘ └──────────────┘
                             │
                    ┌────────▼─────────┐
                    │      store       │
                    │   (Product)      │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │     marking      │
                    │  (MarkingPaper)  │
                    └──────────────────┘
```
