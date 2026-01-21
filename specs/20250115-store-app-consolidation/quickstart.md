# Quickstart: Store App Consolidation

**Date**: 2025-01-14
**Feature**: [spec.md](spec.md) | [plan.md](plan.md)

## Overview

This guide provides step-by-step instructions for implementing the store app consolidation. Follow the phases in order to ensure safe migration.

---

## Prerequisites

Before starting implementation:

1. **Backup database**
   ```bash
   pg_dump -h ACTEDDBDEV01 -U postgres -d admin3 > backup_pre_store_migration.sql
   ```

2. **Verify test coverage**
   ```bash
   cd backend/django_Admin3
   python manage.py test --coverage
   # Ensure baseline coverage for affected apps
   ```

3. **Clear shopping carts** (with user notification)
   ```bash
   python manage.py clear_carts --notify-users
   ```

---

## Phase 1: Create Store App Structure

### Step 1.1: Create the store app

```bash
cd backend/django_Admin3
python manage.py startapp store
```

### Step 1.2: Create model files

Create the following directory structure:

```
store/
├── __init__.py
├── apps.py
├── models/
│   ├── __init__.py
│   ├── product.py
│   ├── price.py
│   ├── bundle.py
│   └── bundle_product.py
├── serializers/
│   ├── __init__.py
│   ├── product_serializer.py
│   ├── price_serializer.py
│   ├── bundle_serializer.py
│   └── bundle_product_serializer.py
├── views/
│   ├── __init__.py
│   ├── product_views.py
│   ├── price_views.py
│   ├── bundle_views.py
│   └── bundle_product_views.py
├── admin.py
├── urls.py
└── tests/
    ├── __init__.py
    ├── test_models.py
    └── test_views.py
```

### Step 1.3: Register the app

Add to `django_Admin3/settings/base.py`:

```python
INSTALLED_APPS = [
    # ... existing apps
    'store',
]
```

---

## Phase 2: Implement Store Models

### Step 2.1: Create store.Product model

```python
# store/models/product.py
from django.db import models


class Product(models.Model):
    """Purchasable product linking ESS to PPV."""

    exam_session_subject = models.ForeignKey(
        'catalog.ExamSessionSubject',
        on_delete=models.CASCADE,
        related_name='store_products'
    )
    product_product_variation = models.ForeignKey(
        'catalog.ProductProductVariation',
        on_delete=models.CASCADE,
        related_name='store_products'
    )
    product_code = models.CharField(max_length=64, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."products"'
        unique_together = ('exam_session_subject', 'product_product_variation')
        verbose_name = 'Store Product'
        verbose_name_plural = 'Store Products'

    def save(self, *args, **kwargs):
        if not self.product_code:
            self.product_code = self._generate_product_code()
        super().save(*args, **kwargs)

    def _generate_product_code(self):
        """Generate product code from related entities."""
        ess = self.exam_session_subject
        ppv = self.product_product_variation
        subject_code = ess.subject.code
        exam_code = ess.exam_session.session_code
        product_code = ppv.product.code
        variation = ppv.product_variation
        prefix = variation.variation_type[0].upper()
        return f"{subject_code}/{prefix}{product_code}{variation.code}/{exam_code}"

    def __str__(self):
        return self.product_code
```

### Step 2.2: Create store.Price model

```python
# store/models/price.py
from django.db import models


class Price(models.Model):
    """Pricing for store products."""

    PRICE_TYPE_CHOICES = [
        ("standard", "Standard"),
        ("retaker", "Retaker"),
        ("reduced", "Reduced Rate"),
        ("additional", "Additional Copy"),
    ]

    product = models.ForeignKey(
        'store.Product',
        on_delete=models.CASCADE,
        related_name='prices'
    )
    price_type = models.CharField(
        max_length=20,
        choices=PRICE_TYPE_CHOICES,
        default="standard"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, default="GBP")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."prices"'
        unique_together = ('product', 'price_type')
        verbose_name = 'Price'
        verbose_name_plural = 'Prices'

    def __str__(self):
        return f"{self.product} - {self.price_type}: {self.amount} {self.currency}"
```

### Step 2.3: Create store.Bundle and store.BundleProduct models

See [data-model.md](data-model.md) for complete model definitions.

---

## Phase 3: Create Migrations

### Step 3.1: Generate initial migration

```bash
python manage.py makemigrations store --name initial
```

### Step 3.2: Create data migration

```bash
python manage.py makemigrations store --empty --name migrate_product_data
```

Edit the migration file:

```python
# store/migrations/0002_migrate_product_data.py
from django.db import migrations


def migrate_products(apps, schema_editor):
    """Flatten ESSPV → store.Product through ESSP."""
    ESSPV = apps.get_model('exam_sessions_subjects_products', 'ExamSessionSubjectProductVariation')
    StoreProduct = apps.get_model('store', 'Product')

    for esspv in ESSPV.objects.select_related('exam_session_subject_product'):
        essp = esspv.exam_session_subject_product
        StoreProduct.objects.create(
            id=esspv.id,  # Preserve ID for FK integrity
            exam_session_subject_id=essp.exam_session_subject_id,
            product_product_variation_id=esspv.product_product_variation_id,
            product_code=esspv.product_code,
            is_active=True,
        )


def reverse_migrate(apps, schema_editor):
    """Reverse migration - clear store products."""
    StoreProduct = apps.get_model('store', 'Product')
    StoreProduct.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ('store', '0001_initial'),
        ('exam_sessions_subjects_products', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(migrate_products, reverse_migrate),
    ]
```

### Step 3.3: Apply migrations

```bash
python manage.py migrate store
```

---

## Phase 4: Update Cart Foreign Keys

### Step 4.1: Create cart migration

```bash
python manage.py makemigrations cart --empty --name update_product_fk
```

### Step 4.2: Update cart models

Change FK references from `ExamSessionSubjectProductVariation` to `store.Product`:

```python
# cart/models.py
# Before:
from exam_sessions_subjects_products.models import ExamSessionSubjectProductVariation
product = models.ForeignKey(ExamSessionSubjectProductVariation, ...)

# After:
product = models.ForeignKey('store.Product', ...)
```

---

## Phase 5: Create Store API

### Step 5.1: Create serializers

```python
# store/serializers/product_serializer.py
from rest_framework import serializers
from store.models import Product, Price


class PriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Price
        fields = ['id', 'price_type', 'amount', 'currency']


class ProductSerializer(serializers.ModelSerializer):
    prices = PriceSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'exam_session_subject', 'product_product_variation',
            'product_code', 'is_active', 'prices', 'created_at', 'updated_at'
        ]
```

### Step 5.2: Create views

```python
# store/views/product_views.py
from rest_framework import viewsets
from store.models import Product
from store.serializers import ProductSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet for store products."""
    queryset = Product.objects.filter(
        is_active=True,
        product_product_variation__product__is_active=True  # FR-012
    ).select_related(
        'exam_session_subject__exam_session',
        'exam_session_subject__subject',
        'product_product_variation__product',
        'product_product_variation__product_variation',
    ).prefetch_related('prices')
    serializer_class = ProductSerializer
```

### Step 5.3: Configure URLs

```python
# store/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from store.views import ProductViewSet, PriceViewSet, BundleViewSet

router = DefaultRouter()
router.register('products', ProductViewSet)
router.register('prices', PriceViewSet)
router.register('bundles', BundleViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
```

```python
# django_Admin3/urls.py
urlpatterns = [
    # ... existing patterns
    path('api/store/', include('store.urls')),
]
```

---

## Phase 6: Strangler Fig Pattern

### Step 6.1: Update legacy endpoints

```python
# exam_sessions_subjects_products/views.py
import warnings
from store.views import ProductViewSet


class LegacyProductViewSet(viewsets.ViewSet):
    """DEPRECATED: Use /api/store/products/ instead."""

    def list(self, request):
        warnings.warn(
            "exam_sessions_subjects_products API is deprecated. "
            "Use /api/store/products/ instead.",
            DeprecationWarning
        )
        return ProductViewSet.as_view({'get': 'list'})(request)
```

---

## Phase 7: Run Tests

### Step 7.1: Run existing tests

```bash
python manage.py test
```

### Step 7.2: Run new store tests

```bash
python manage.py test store
```

### Step 7.3: Verify FK integrity

```sql
-- Verify no orphaned cart items
SELECT COUNT(*) FROM cart_items ci
LEFT JOIN acted.products p ON ci.product_id = p.id
WHERE p.id IS NULL;
-- Expected: 0
```

---

## Verification Checklist

- [ ] All existing tests pass
- [ ] Cart add/remove products works
- [ ] Checkout flow completes
- [ ] Order history displays correctly
- [ ] Bundle functionality works
- [ ] Admin interface operational
- [ ] Frontend product pages load
- [ ] Products with inactive templates are hidden (FR-012)
- [ ] Product queries use ≤ 2 joins (SC-003)

---

## Rollback Plan

If issues are encountered:

1. **Revert migrations**
   ```bash
   python manage.py migrate store zero
   python manage.py migrate cart <previous_migration>
   ```

2. **Restore database**
   ```bash
   psql -h ACTEDDBDEV01 -U postgres -d admin3 < backup_pre_store_migration.sql
   ```

3. **Remove store app from INSTALLED_APPS**

4. **Restart services**

---

## Support

- **Spec**: [spec.md](spec.md)
- **Plan**: [plan.md](plan.md)
- **Research**: [research.md](research.md)
- **Data Model**: [data-model.md](data-model.md)
- **API Contract**: [contracts/store-api.yaml](contracts/store-api.yaml)
