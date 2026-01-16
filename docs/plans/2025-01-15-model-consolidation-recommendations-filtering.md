# Model Consolidation: Recommendations & Filtering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move ProductVariationRecommendation to catalog app and create a new filtering app with all models in the "acted" schema.

**Architecture:** Two-phase migration: (1) Move ProductVariationRecommendation into catalog app with table rename to `"acted".product_productvariation_recommendations`, (2) Create new `filtering` Django app and migrate FilterGroup, FilterConfiguration, and related models from products app with proper "acted" schema tables.

**Tech Stack:** Django 5.1, PostgreSQL with schema namespacing, Django migrations for table renaming

---

## Phase 1: Move ProductVariationRecommendation to Catalog App

### Task 1: Create ProductVariationRecommendation Model in Catalog

**Files:**
- Create: `backend/django_Admin3/catalog/models/product_variation_recommendation.py`
- Modify: `backend/django_Admin3/catalog/models/__init__.py`
- Modify: `backend/django_Admin3/catalog/admin.py`

**Step 1: Write the failing test**

Create test file `backend/django_Admin3/catalog/tests/test_product_variation_recommendation.py`:

```python
"""Tests for ProductVariationRecommendation model in catalog app."""
from django.test import TestCase
from django.core.exceptions import ValidationError
from catalog.models import (
    Subject, ExamSession, ExamSessionSubject,
    Product, ProductVariation, ProductProductVariation,
    ProductVariationRecommendation,
)


class ProductVariationRecommendationModelTest(TestCase):
    """Test ProductVariationRecommendation model functionality."""

    @classmethod
    def setUpTestData(cls):
        """Set up test data for all tests."""
        cls.subject = Subject.objects.create(code='CM1', description='CM1 Subject')
        cls.exam_session = ExamSession.objects.create(session_code='2025-04')
        cls.ess = ExamSessionSubject.objects.create(
            exam_session=cls.exam_session,
            subject=cls.subject,
            is_active=True
        )

        # Create products
        cls.product1 = Product.objects.create(
            code='MOCK_EXAM',
            shortname='Mock Exam',
            fullname='Mock Exam',
            is_active=True
        )
        cls.product2 = Product.objects.create(
            code='MARKING_SERVICE',
            shortname='Marking Service',
            fullname='Marking Service',
            is_active=True
        )

        # Create variations
        cls.ebook_variation = ProductVariation.objects.create(
            code='EBOOK',
            name='eBook',
            variation_type='format'
        )
        cls.service_variation = ProductVariation.objects.create(
            code='SERVICE',
            name='Service',
            variation_type='service'
        )

        # Create product-variations
        cls.ppv_source = ProductProductVariation.objects.create(
            product=cls.product1,
            product_variation=cls.ebook_variation
        )
        cls.ppv_target = ProductProductVariation.objects.create(
            product=cls.product2,
            product_variation=cls.service_variation
        )

    def test_recommendation_can_be_imported_from_catalog(self):
        """Verify ProductVariationRecommendation is importable from catalog.models."""
        from catalog.models import ProductVariationRecommendation
        self.assertIsNotNone(ProductVariationRecommendation)

    def test_recommendation_table_name(self):
        """Verify model uses correct acted schema table."""
        self.assertEqual(
            ProductVariationRecommendation._meta.db_table,
            '"acted"."product_productvariation_recommendations"'
        )

    def test_create_recommendation(self):
        """Test creating a valid recommendation."""
        rec = ProductVariationRecommendation.objects.create(
            product_product_variation=self.ppv_source,
            recommended_product_product_variation=self.ppv_target
        )
        self.assertEqual(rec.product_product_variation, self.ppv_source)
        self.assertEqual(rec.recommended_product_product_variation, self.ppv_target)

    def test_self_reference_validation(self):
        """Test that self-referencing recommendations are rejected."""
        with self.assertRaises(ValidationError):
            ProductVariationRecommendation.objects.create(
                product_product_variation=self.ppv_source,
                recommended_product_product_variation=self.ppv_source
            )
```

**Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && python3 manage.py test catalog.tests.test_product_variation_recommendation -v2`
Expected: FAIL with "cannot import name 'ProductVariationRecommendation' from 'catalog.models'"

**Step 3: Create the model file**

Create `backend/django_Admin3/catalog/models/product_variation_recommendation.py`:

```python
"""ProductVariationRecommendation model.

Recommendation relationship between product-variation combinations.
Migrated from products/models/product_variation_recommendation.py.

Table: "acted"."product_productvariation_recommendations"
"""
from django.db import models
from django.core.exceptions import ValidationError


class ProductVariationRecommendation(models.Model):
    """
    Recommendation relationship between product-variation combinations.

    Each product-variation combination can recommend at most one complementary product
    (one-to-one relationship on source). Multiple products can recommend
    the same target product (many-to-one on target).

    Example: Mock Exam eBook (ProductProductVariation) → Mock Exam Marking Service (ProductProductVariation)

    **Usage Example**::

        from catalog.models import ProductVariationRecommendation, ProductProductVariation

        ppv_source = ProductProductVariation.objects.get(product__code='MOCK_EXAM')
        ppv_target = ProductProductVariation.objects.get(product__code='MARKING_SERVICE')

        recommendation = ProductVariationRecommendation.objects.create(
            product_product_variation=ppv_source,
            recommended_product_product_variation=ppv_target
        )
    """

    product_product_variation = models.OneToOneField(
        'catalog.ProductProductVariation',
        on_delete=models.CASCADE,
        related_name='recommendation',
        help_text="Source product-variation combination that makes the recommendation"
    )

    recommended_product_product_variation = models.ForeignKey(
        'catalog.ProductProductVariation',
        on_delete=models.CASCADE,
        related_name='recommended_by',
        help_text="Recommended complementary product-variation combination"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."product_productvariation_recommendations"'
        indexes = [
            models.Index(fields=['product_product_variation']),
            models.Index(fields=['recommended_product_product_variation']),
        ]
        verbose_name = 'Product Variation Recommendation'
        verbose_name_plural = 'Product Variation Recommendations'

    def clean(self):
        """
        Validate business rules:
        1. A product-variation combination cannot recommend itself (self-reference)
        2. Circular recommendations are not allowed (A→B, B→A)
        """
        super().clean()

        # Prevent self-reference
        if self.product_product_variation_id == self.recommended_product_product_variation_id:
            raise ValidationError("A product-variation combination cannot recommend itself.")

        # Prevent circular recommendations
        if ProductVariationRecommendation.objects.filter(
            product_product_variation=self.recommended_product_product_variation,
            recommended_product_product_variation=self.product_product_variation
        ).exists():
            raise ValidationError(
                "Circular recommendation detected: "
                f"{self.recommended_product_product_variation} already recommends "
                f"{self.product_product_variation}"
            )

    def save(self, *args, **kwargs):
        """Override save to call clean() for validation."""
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        ppv = self.product_product_variation
        rec_ppv = self.recommended_product_product_variation
        return f"{ppv.product.shortname} {ppv.product_variation.name} → {rec_ppv.product.shortname} {rec_ppv.product_variation.name}"
```

**Step 4: Update catalog/models/__init__.py**

Add to `backend/django_Admin3/catalog/models/__init__.py`:

```python
"""Catalog models package.

Re-exports all catalog models for clean imports:
    from catalog.models import Subject, Product, ExamSession, ExamSessionSubject, ...
"""
from .subject import Subject
from .exam_session import ExamSession
from .exam_session_subject import ExamSessionSubject
from .product import Product
from .product_variation import ProductVariation
from .product_product_variation import ProductProductVariation
from .product_product_group import ProductProductGroup
from .product_bundle import ProductBundle
from .product_bundle_product import ProductBundleProduct
from .product_variation_recommendation import ProductVariationRecommendation

__all__ = [
    'Subject',
    'ExamSession',
    'ExamSessionSubject',
    'Product',
    'ProductVariation',
    'ProductProductVariation',
    'ProductProductGroup',
    'ProductBundle',
    'ProductBundleProduct',
    'ProductVariationRecommendation',
]
```

**Step 5: Run test to verify it passes**

Run: `cd backend/django_Admin3 && python3 manage.py test catalog.tests.test_product_variation_recommendation -v2`
Expected: PASS (import test passes, database tests may fail - migration needed)

**Step 6: Commit**

```bash
git add backend/django_Admin3/catalog/models/product_variation_recommendation.py
git add backend/django_Admin3/catalog/models/__init__.py
git add backend/django_Admin3/catalog/tests/test_product_variation_recommendation.py
git commit -m "feat(catalog): add ProductVariationRecommendation model

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Create Migration for ProductVariationRecommendation Table Rename

**Files:**
- Create: `backend/django_Admin3/catalog/migrations/0005_add_product_variation_recommendation.py`

**Step 1: Create the migration file**

Create `backend/django_Admin3/catalog/migrations/0005_add_product_variation_recommendation.py`:

```python
"""Migration to move ProductVariationRecommendation to catalog app.

This migration:
1. Renames table from acted_product_productvariation_recommendations to "acted"."product_productvariation_recommendations"
2. Transfers model ownership from products app to catalog app
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """Move ProductVariationRecommendation to catalog with schema-qualified table name."""

    dependencies = [
        ("catalog", "0004_ensure_schema"),
        ("products", "0003_update_fk_to_catalog"),
    ]

    operations = [
        # Step 1: Rename the table to use schema-qualified name
        migrations.RunSQL(
            sql='ALTER TABLE acted_product_productvariation_recommendations RENAME TO product_productvariation_recommendations;',
            reverse_sql='ALTER TABLE "acted"."product_productvariation_recommendations" RENAME TO acted_product_productvariation_recommendations;',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE product_productvariation_recommendations SET SCHEMA acted;',
            reverse_sql='ALTER TABLE "acted"."product_productvariation_recommendations" SET SCHEMA public;',
        ),

        # Step 2: Register the model in catalog app
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='ProductVariationRecommendation',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('updated_at', models.DateTimeField(auto_now=True)),
                        ('product_product_variation', models.OneToOneField(
                            help_text='Source product-variation combination that makes the recommendation',
                            on_delete=django.db.models.deletion.CASCADE,
                            related_name='recommendation',
                            to='catalog.productproductvariation',
                        )),
                        ('recommended_product_product_variation', models.ForeignKey(
                            help_text='Recommended complementary product-variation combination',
                            on_delete=django.db.models.deletion.CASCADE,
                            related_name='recommended_by',
                            to='catalog.productproductvariation',
                        )),
                    ],
                    options={
                        'verbose_name': 'Product Variation Recommendation',
                        'verbose_name_plural': 'Product Variation Recommendations',
                        'db_table': '"acted"."product_productvariation_recommendations"',
                    },
                ),
            ],
            database_operations=[],
        ),

        # Step 3: Add indexes
        migrations.AddIndex(
            model_name='productvariationrecommendation',
            index=models.Index(fields=['product_product_variation'], name='acted_pvr_ppv_idx'),
        ),
        migrations.AddIndex(
            model_name='productvariationrecommendation',
            index=models.Index(fields=['recommended_product_product_variation'], name='acted_pvr_rec_ppv_idx'),
        ),
    ]
```

**Step 2: Check migration dependencies**

Run: `cd backend/django_Admin3 && ls catalog/migrations/`
Expected: See existing migrations to confirm 0004 exists

**Step 3: Run migration**

Run: `cd backend/django_Admin3 && python3 manage.py migrate catalog`
Expected: Migration applies successfully

**Step 4: Verify table location**

Run: `cd backend/django_Admin3 && python3 manage.py shell -c "from catalog.models import ProductVariationRecommendation; print(ProductVariationRecommendation._meta.db_table)"`
Expected: `"acted"."product_productvariation_recommendations"`

**Step 5: Run tests to verify**

Run: `cd backend/django_Admin3 && python3 manage.py test catalog.tests.test_product_variation_recommendation -v2`
Expected: PASS

**Step 6: Commit**

```bash
git add backend/django_Admin3/catalog/migrations/0005_add_product_variation_recommendation.py
git commit -m "feat(catalog): migrate ProductVariationRecommendation table to acted schema

Renames table from acted_product_productvariation_recommendations to
'acted'.'product_productvariation_recommendations'

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Add ProductVariationRecommendation to Catalog Admin

**Files:**
- Modify: `backend/django_Admin3/catalog/admin.py`

**Step 1: Write the failing test**

Add to `backend/django_Admin3/catalog/tests/test_product_variation_recommendation.py`:

```python
class ProductVariationRecommendationAdminTest(TestCase):
    """Test ProductVariationRecommendation admin registration."""

    def test_recommendation_registered_in_admin(self):
        """Verify model is registered in Django admin."""
        from django.contrib import admin
        from catalog.models import ProductVariationRecommendation
        self.assertIn(ProductVariationRecommendation, admin.site._registry)
```

**Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && python3 manage.py test catalog.tests.test_product_variation_recommendation.ProductVariationRecommendationAdminTest -v2`
Expected: FAIL with AssertionError

**Step 3: Add admin registration**

Add to `backend/django_Admin3/catalog/admin.py` after existing imports:

```python
from .models import (
    Subject,
    ExamSession,
    ExamSessionSubject,
    Product,
    ProductVariation,
    ProductProductVariation,
    ProductProductGroup,
    ProductBundle,
    ProductBundleProduct,
    ProductVariationRecommendation,
)

# ... existing admin classes ...

@admin.register(ProductVariationRecommendation)
class ProductVariationRecommendationAdmin(admin.ModelAdmin):
    """
    Admin interface for ProductVariationRecommendation model.

    Manages recommendation relationships between product-variation combinations,
    e.g., Mock Exam eBook recommends Marking Service.
    """
    list_display = ('id', 'get_source_product', 'get_source_variation', 'get_recommended_product', 'get_recommended_variation', 'created_at')
    list_filter = ('created_at',)
    search_fields = (
        'product_product_variation__product__shortname',
        'product_product_variation__product__code',
        'recommended_product_product_variation__product__shortname',
        'recommended_product_product_variation__product__code',
    )
    autocomplete_fields = ('product_product_variation', 'recommended_product_product_variation')
    ordering = ('-created_at',)

    @admin.display(description='Source Product')
    def get_source_product(self, obj):
        return obj.product_product_variation.product.shortname

    @admin.display(description='Source Variation')
    def get_source_variation(self, obj):
        return obj.product_product_variation.product_variation.name

    @admin.display(description='Recommended Product')
    def get_recommended_product(self, obj):
        return obj.recommended_product_product_variation.product.shortname

    @admin.display(description='Recommended Variation')
    def get_recommended_variation(self, obj):
        return obj.recommended_product_product_variation.product_variation.name
```

**Step 4: Run test to verify it passes**

Run: `cd backend/django_Admin3 && python3 manage.py test catalog.tests.test_product_variation_recommendation.ProductVariationRecommendationAdminTest -v2`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/django_Admin3/catalog/admin.py
git commit -m "feat(catalog): add ProductVariationRecommendation to admin

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Update Products App to Re-export from Catalog

**Files:**
- Modify: `backend/django_Admin3/products/models/__init__.py`
- Create: `backend/django_Admin3/products/migrations/0004_remove_productvariationrecommendation.py`

**Step 1: Write the failing test for backward compatibility**

Add to `backend/django_Admin3/catalog/tests/test_backward_compat.py`:

```python
def test_recommendation_importable_from_products(self):
    """Verify ProductVariationRecommendation can be imported from products.models."""
    from products.models import ProductVariationRecommendation
    from catalog.models import ProductVariationRecommendation as CatalogRec
    self.assertIs(ProductVariationRecommendation, CatalogRec)
```

**Step 2: Run test to verify current state**

Run: `cd backend/django_Admin3 && python3 manage.py test catalog.tests.test_backward_compat -v2`
Expected: May pass or fail depending on current state

**Step 3: Update products/models/__init__.py**

Update `backend/django_Admin3/products/models/__init__.py`:

```python
"""Products app models package.

Product-related models have been moved to catalog.models as part of the
catalog consolidation (001-catalog-consolidation). They are re-exported
here for backward compatibility.

DEPRECATED: New code should import these from catalog.models instead:
    from catalog.models import Product, ProductVariation, ProductBundle, ProductVariationRecommendation, ...

Models that remain in products app:
    - FilterGroup, FilterConfiguration, FilterConfigurationGroup,
      FilterPreset, FilterUsageAnalytics (filter system - to be moved to filtering app)
"""
# Re-export catalog models for backward compatibility
from catalog.models import (
    Product,
    ProductVariation,
    ProductProductVariation,
    ProductProductGroup,
    ProductBundle,
    ProductBundleProduct,
    ProductVariationRecommendation,
)

# Filter system models remain in products app (until filtering app created)
from .filter_system import (
    FilterGroup,
    FilterConfiguration,
    FilterConfigurationGroup,
    FilterPreset,
    FilterUsageAnalytics,
)

__all__ = [
    # Catalog re-exports (deprecated - use catalog.models)
    'Product',
    'ProductVariation',
    'ProductProductVariation',
    'ProductProductGroup',
    'ProductBundle',
    'ProductBundleProduct',
    'ProductVariationRecommendation',
    # Filter system (to be moved to filtering app)
    'FilterGroup',
    'FilterConfiguration',
    'FilterConfigurationGroup',
    'FilterPreset',
    'FilterUsageAnalytics',
]
```

**Step 4: Create migration to remove model from products**

Create `backend/django_Admin3/products/migrations/0004_remove_productvariationrecommendation.py`:

```python
"""Remove ProductVariationRecommendation from products app.

Model has been moved to catalog app. This migration only updates Django's
state - the database table was already moved by catalog migration.
"""
from django.db import migrations


class Migration(migrations.Migration):
    """Remove ProductVariationRecommendation from products app state."""

    dependencies = [
        ("products", "0003_update_fk_to_catalog"),
        ("catalog", "0005_add_product_variation_recommendation"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.DeleteModel(
                    name='ProductVariationRecommendation',
                ),
            ],
            database_operations=[],
        ),
    ]
```

**Step 5: Run migration**

Run: `cd backend/django_Admin3 && python3 manage.py migrate products`
Expected: Migration applies successfully

**Step 6: Run backward compatibility tests**

Run: `cd backend/django_Admin3 && python3 manage.py test catalog.tests.test_backward_compat -v2`
Expected: PASS

**Step 7: Commit**

```bash
git add backend/django_Admin3/products/models/__init__.py
git add backend/django_Admin3/products/migrations/0004_remove_productvariationrecommendation.py
git commit -m "refactor(products): re-export ProductVariationRecommendation from catalog

Maintains backward compatibility for existing imports.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Update Import Statements Across Codebase

**Files:**
- Modify: `backend/django_Admin3/search/services/search_service.py`
- Modify: `backend/django_Admin3/search/serializers.py`
- Modify: `backend/django_Admin3/exam_sessions_subjects_products/serializers.py`
- Modify: `backend/django_Admin3/exam_sessions_subjects_products/services/optimized_search_service.py`

**Step 1: Update search/services/search_service.py**

Change line 158 from:
```python
from products.models import ProductVariationRecommendation
```
to:
```python
from catalog.models import ProductVariationRecommendation
```

**Step 2: Update search/serializers.py if needed**

Check for any ProductVariationRecommendation imports and update to use catalog.models.

**Step 3: Update exam_sessions_subjects_products/serializers.py**

Change line 6 from:
```python
from products.models import ProductVariationRecommendation
```
to:
```python
from catalog.models import ProductVariationRecommendation
```

**Step 4: Update exam_sessions_subjects_products/services/optimized_search_service.py**

Change line 270 from:
```python
from products.models import ProductVariationRecommendation
```
to:
```python
from catalog.models import ProductVariationRecommendation
```

**Step 5: Run full test suite**

Run: `cd backend/django_Admin3 && python3 manage.py test --keepdb`
Expected: All tests pass (1287+)

**Step 6: Commit**

```bash
git add backend/django_Admin3/search/services/search_service.py
git add backend/django_Admin3/search/serializers.py
git add backend/django_Admin3/exam_sessions_subjects_products/serializers.py
git add backend/django_Admin3/exam_sessions_subjects_products/services/optimized_search_service.py
git commit -m "refactor: update imports to use catalog.ProductVariationRecommendation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Phase 2: Create Filtering App

### Task 6: Create Filtering App Structure

**Files:**
- Create: `backend/django_Admin3/filtering/__init__.py`
- Create: `backend/django_Admin3/filtering/apps.py`
- Modify: `backend/django_Admin3/django_Admin3/settings/base.py`

**Step 1: Create app directory and files**

Create `backend/django_Admin3/filtering/__init__.py`:
```python
"""Filtering app for product filter configuration and management."""
default_app_config = 'filtering.apps.FilteringConfig'
```

Create `backend/django_Admin3/filtering/apps.py`:
```python
"""Filtering app configuration."""
from django.apps import AppConfig


class FilteringConfig(AppConfig):
    """Configuration for the filtering app."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'filtering'
    verbose_name = 'Product Filtering'
```

**Step 2: Add to INSTALLED_APPS**

Add to `backend/django_Admin3/django_Admin3/settings/base.py` in INSTALLED_APPS:
```python
'filtering.apps.FilteringConfig',
```

**Step 3: Verify app loads**

Run: `cd backend/django_Admin3 && python3 manage.py check`
Expected: System check identified no issues

**Step 4: Commit**

```bash
git add backend/django_Admin3/filtering/
git add backend/django_Admin3/django_Admin3/settings/base.py
git commit -m "feat(filtering): create filtering app structure

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 7: Create Filter Models in Filtering App

**Files:**
- Create: `backend/django_Admin3/filtering/models/__init__.py`
- Create: `backend/django_Admin3/filtering/models/filter_group.py`
- Create: `backend/django_Admin3/filtering/models/filter_configuration.py`
- Create: `backend/django_Admin3/filtering/models/filter_preset.py`
- Create: `backend/django_Admin3/filtering/models/filter_analytics.py`

**Step 1: Write the failing test**

Create `backend/django_Admin3/filtering/tests/__init__.py` (empty).

Create `backend/django_Admin3/filtering/tests/test_models.py`:

```python
"""Tests for filtering app models."""
from django.test import TestCase


class FilterGroupModelTest(TestCase):
    """Test FilterGroup model."""

    def test_filter_group_importable(self):
        """Verify FilterGroup can be imported from filtering.models."""
        from filtering.models import FilterGroup
        self.assertIsNotNone(FilterGroup)

    def test_filter_group_table_name(self):
        """Verify FilterGroup uses acted schema."""
        from filtering.models import FilterGroup
        self.assertEqual(FilterGroup._meta.db_table, '"acted"."filter_groups"')


class FilterConfigurationModelTest(TestCase):
    """Test FilterConfiguration model."""

    def test_filter_configuration_importable(self):
        """Verify FilterConfiguration can be imported from filtering.models."""
        from filtering.models import FilterConfiguration
        self.assertIsNotNone(FilterConfiguration)

    def test_filter_configuration_table_name(self):
        """Verify FilterConfiguration uses acted schema."""
        from filtering.models import FilterConfiguration
        self.assertEqual(FilterConfiguration._meta.db_table, '"acted"."filter_configurations"')
```

**Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && python3 manage.py test filtering.tests.test_models -v2`
Expected: FAIL with ModuleNotFoundError

**Step 3: Create FilterGroup model**

Create `backend/django_Admin3/filtering/models/filter_group.py`:

```python
"""FilterGroup model for hierarchical product filtering.

Provides tree structure for organizing product filters.

Table: "acted"."filter_groups"
"""
from django.db import models


class FilterGroup(models.Model):
    """
    Hierarchical filter groups for product categorization.

    Supports parent-child relationships for nested filter hierarchies
    like Material > Study Text > eBook.

    **Usage Example**::

        from filtering.models import FilterGroup

        # Get root categories
        roots = FilterGroup.objects.filter(parent__isnull=True)

        # Get descendants of a group
        material_group = FilterGroup.objects.get(code='MATERIAL')
        descendants = material_group.get_descendants()
    """
    name = models.CharField(
        max_length=100,
        help_text='Display name for the filter group'
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children',
        help_text='Parent group for hierarchy'
    )
    code = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
        help_text='Unique code identifier'
    )
    description = models.TextField(
        blank=True,
        help_text='Description of the filter group'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether group is available for filtering'
    )
    display_order = models.IntegerField(
        default=0,
        help_text='Sort order for display'
    )

    class Meta:
        db_table = '"acted"."filter_groups"'
        ordering = ['display_order', 'name']
        verbose_name = 'Filter Group'
        verbose_name_plural = 'Filter Groups'

    def __str__(self):
        return self.name

    def get_full_path(self):
        """Get the full hierarchical path."""
        path = [self.name]
        parent = self.parent
        while parent:
            path.insert(0, parent.name)
            parent = parent.parent
        return ' > '.join(path)

    def get_descendants(self, include_self=True):
        """Get all descendant groups."""
        descendants = []
        if include_self:
            descendants.append(self)
        for child in self.children.all():
            descendants.extend(child.get_descendants(include_self=True))
        return descendants

    def get_level(self):
        """Get the depth level in the hierarchy."""
        level = 0
        parent = self.parent
        while parent:
            level += 1
            parent = parent.parent
        return level
```

**Step 4: Create FilterConfiguration model**

Create `backend/django_Admin3/filtering/models/filter_configuration.py`:

```python
"""FilterConfiguration model for dynamic filter setup.

Defines available filters with UI configuration and behavior.

Table: "acted"."filter_configurations"
"""
from django.db import models
from django.contrib.auth.models import User


class FilterConfiguration(models.Model):
    """
    Enhanced filter configuration for dynamic UI rendering.

    Defines filter behavior, UI component type, and validation rules.

    **Usage Example**::

        from filtering.models import FilterConfiguration

        # Get active filters ordered for display
        filters = FilterConfiguration.objects.filter(is_active=True).order_by('display_order')

        for f in filters:
            print(f.display_label, f.ui_component)
    """
    FILTER_TYPE_CHOICES = [
        ('subject', 'Subject'),
        ('filter_group', 'Filter Group'),
        ('product_variation', 'Product Variation'),
        ('tutorial_format', 'Tutorial Format'),
        ('bundle', 'Bundle'),
        ('custom_field', 'Custom Field'),
        ('computed', 'Computed Filter'),
        ('date_range', 'Date Range'),
        ('numeric_range', 'Numeric Range'),
    ]

    UI_COMPONENT_CHOICES = [
        ('multi_select', 'Multi-Select Checkboxes'),
        ('single_select', 'Single Select Dropdown'),
        ('checkbox', 'Single Checkbox'),
        ('radio_buttons', 'Radio Buttons'),
        ('toggle_buttons', 'Toggle Buttons'),
        ('search_select', 'Searchable Select'),
        ('tree_select', 'Hierarchical Tree Select'),
        ('range_slider', 'Range Slider'),
        ('date_picker', 'Date Picker'),
        ('tag_input', 'Tag Input'),
    ]

    # Basic Configuration
    name = models.CharField(
        max_length=100,
        unique=True,
        help_text='Internal name for the filter'
    )
    display_label = models.CharField(
        max_length=100,
        help_text='User-facing label'
    )
    description = models.TextField(
        blank=True,
        help_text='Description for admin users'
    )
    filter_type = models.CharField(
        max_length=32,
        choices=FILTER_TYPE_CHOICES,
        help_text='Type of filter'
    )
    filter_key = models.CharField(
        max_length=50,
        help_text='Key used in API requests'
    )

    # UI Configuration
    ui_component = models.CharField(
        max_length=32,
        choices=UI_COMPONENT_CHOICES,
        default='multi_select',
        help_text='UI component type'
    )
    display_order = models.IntegerField(
        default=0,
        help_text='Order in which filters appear'
    )

    # Behavior Configuration
    is_active = models.BooleanField(default=True)
    is_collapsible = models.BooleanField(default=True)
    is_expanded_by_default = models.BooleanField(default=False)
    is_required = models.BooleanField(default=False)
    allow_multiple = models.BooleanField(default=True)

    # Advanced Configuration (JSON fields)
    ui_config = models.JSONField(
        default=dict,
        blank=True,
        help_text='UI-specific configuration'
    )
    validation_rules = models.JSONField(
        default=dict,
        blank=True,
        help_text='Validation rules'
    )
    dependency_rules = models.JSONField(
        default=dict,
        blank=True,
        help_text='Dependencies on other filters'
    )

    # Filter Groups (Many-to-Many relationship)
    filter_groups = models.ManyToManyField(
        'filtering.FilterGroup',
        through='filtering.FilterConfigurationGroup',
        blank=True
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    class Meta:
        db_table = '"acted"."filter_configurations"'
        ordering = ['display_order', 'display_label']
        verbose_name = 'Filter Configuration'
        verbose_name_plural = 'Filter Configurations'

    def __str__(self):
        return f'{self.display_label} ({self.filter_type})'

    def get_ui_config(self):
        """Get UI configuration with defaults."""
        defaults = {
            'show_count': True,
            'show_select_all': False,
            'placeholder': f'Select {self.display_label.lower()}...',
            'search_placeholder': f'Search {self.display_label.lower()}...',
            'collapsible': self.is_collapsible,
            'expanded': self.is_expanded_by_default,
        }
        config = defaults.copy()
        config.update(self.ui_config)
        return config


class FilterConfigurationGroup(models.Model):
    """
    Junction table linking filter configurations to filter groups.

    Table: "acted"."filter_configuration_groups"
    """
    filter_configuration = models.ForeignKey(
        FilterConfiguration,
        on_delete=models.CASCADE
    )
    filter_group = models.ForeignKey(
        'filtering.FilterGroup',
        on_delete=models.CASCADE
    )
    is_default = models.BooleanField(
        default=False,
        help_text='Is this a default option for the filter?'
    )
    display_order = models.IntegerField(
        default=0,
        help_text='Order within this filter'
    )

    class Meta:
        db_table = '"acted"."filter_configuration_groups"'
        unique_together = [['filter_configuration', 'filter_group']]
        ordering = ['display_order', 'filter_group__name']
        verbose_name = 'Filter Configuration Group'
        verbose_name_plural = 'Filter Configuration Groups'

    def __str__(self):
        return f'{self.filter_configuration.display_label} -> {self.filter_group.name}'
```

**Step 5: Create FilterPreset and FilterUsageAnalytics models**

Create `backend/django_Admin3/filtering/models/filter_preset.py`:

```python
"""FilterPreset model for saved filter combinations.

Table: "acted"."filter_presets"
"""
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class FilterPreset(models.Model):
    """
    Saved filter combinations for quick access.

    **Usage Example**::

        from filtering.models import FilterPreset

        # Get user's presets
        presets = FilterPreset.objects.filter(created_by=user)

        # Get public presets
        public_presets = FilterPreset.objects.filter(is_public=True)
    """
    name = models.CharField(
        max_length=100,
        help_text='Preset name'
    )
    description = models.TextField(
        blank=True,
        help_text='Description of the preset'
    )
    filter_values = models.JSONField(
        default=dict,
        help_text='Saved filter values'
    )
    is_public = models.BooleanField(
        default=False,
        help_text='Available to all users'
    )

    # Usage tracking
    usage_count = models.IntegerField(default=0)
    last_used = models.DateTimeField(null=True, blank=True)

    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = '"acted"."filter_presets"'
        ordering = ['-usage_count', 'name']
        verbose_name = 'Filter Preset'
        verbose_name_plural = 'Filter Presets'

    def __str__(self):
        return self.name

    def increment_usage(self):
        """Increment usage count and update last used timestamp."""
        self.usage_count += 1
        self.last_used = timezone.now()
        self.save(update_fields=['usage_count', 'last_used'])
```

Create `backend/django_Admin3/filtering/models/filter_analytics.py`:

```python
"""FilterUsageAnalytics model for tracking filter usage.

Table: "acted"."filter_usage_analytics"
"""
from django.db import models
from django.contrib.auth.models import User


class FilterUsageAnalytics(models.Model):
    """
    Track filter usage for analytics and optimization.

    **Usage Example**::

        from filtering.models import FilterUsageAnalytics

        # Get most used filters
        popular = FilterUsageAnalytics.objects.order_by('-usage_count')[:10]
    """
    filter_configuration = models.ForeignKey(
        'filtering.FilterConfiguration',
        on_delete=models.CASCADE
    )
    filter_value = models.CharField(
        max_length=100,
        help_text='The actual filter value used'
    )
    usage_count = models.IntegerField(default=0)
    last_used = models.DateTimeField(auto_now=True)

    # Optional user tracking
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    session_id = models.CharField(
        max_length=100,
        blank=True,
        help_text='Session ID for anonymous users'
    )

    class Meta:
        db_table = '"acted"."filter_usage_analytics"'
        unique_together = [['filter_configuration', 'filter_value']]
        indexes = [
            models.Index(fields=['filter_configuration', '-usage_count']),
            models.Index(fields=['last_used']),
        ]
        verbose_name = 'Filter Usage Analytics'
        verbose_name_plural = 'Filter Usage Analytics'

    def __str__(self):
        return f'{self.filter_configuration.display_label}: {self.filter_value} ({self.usage_count}x)'
```

**Step 6: Create models __init__.py**

Create `backend/django_Admin3/filtering/models/__init__.py`:

```python
"""Filtering app models package.

Re-exports all filtering models for clean imports:
    from filtering.models import FilterGroup, FilterConfiguration, ...
"""
from .filter_group import FilterGroup
from .filter_configuration import FilterConfiguration, FilterConfigurationGroup
from .filter_preset import FilterPreset
from .filter_analytics import FilterUsageAnalytics

__all__ = [
    'FilterGroup',
    'FilterConfiguration',
    'FilterConfigurationGroup',
    'FilterPreset',
    'FilterUsageAnalytics',
]
```

**Step 7: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && python3 manage.py test filtering.tests.test_models -v2`
Expected: PASS (import tests pass, database tests need migration)

**Step 8: Commit**

```bash
git add backend/django_Admin3/filtering/models/
git add backend/django_Admin3/filtering/tests/
git commit -m "feat(filtering): add filter models with acted schema tables

- FilterGroup for hierarchical categorization
- FilterConfiguration for dynamic filter UI
- FilterConfigurationGroup junction table
- FilterPreset for saved filter combinations
- FilterUsageAnalytics for usage tracking

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 8: Create Migration for Filtering App

**Files:**
- Create: `backend/django_Admin3/filtering/migrations/__init__.py`
- Create: `backend/django_Admin3/filtering/migrations/0001_initial.py`

**Step 1: Create migration directory**

Create `backend/django_Admin3/filtering/migrations/__init__.py` (empty file).

**Step 2: Create initial migration**

Create `backend/django_Admin3/filtering/migrations/0001_initial.py`:

```python
"""Initial migration for filtering app.

Creates tables in the acted schema by renaming existing tables from products app.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    """Create filtering app tables in acted schema."""

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Step 1: Rename existing tables to new schema-qualified names
        migrations.RunSQL(
            sql='ALTER TABLE acted_filter_group SET SCHEMA acted; ALTER TABLE acted.acted_filter_group RENAME TO filter_groups;',
            reverse_sql='ALTER TABLE "acted"."filter_groups" RENAME TO acted_filter_group; ALTER TABLE acted.acted_filter_group SET SCHEMA public;',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE acted_filter_configuration SET SCHEMA acted; ALTER TABLE acted.acted_filter_configuration RENAME TO filter_configurations;',
            reverse_sql='ALTER TABLE "acted"."filter_configurations" RENAME TO acted_filter_configuration; ALTER TABLE acted.acted_filter_configuration SET SCHEMA public;',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE acted_filter_configuration_group SET SCHEMA acted; ALTER TABLE acted.acted_filter_configuration_group RENAME TO filter_configuration_groups;',
            reverse_sql='ALTER TABLE "acted"."filter_configuration_groups" RENAME TO acted_filter_configuration_group; ALTER TABLE acted.acted_filter_configuration_group SET SCHEMA public;',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE acted_filter_preset SET SCHEMA acted; ALTER TABLE acted.acted_filter_preset RENAME TO filter_presets;',
            reverse_sql='ALTER TABLE "acted"."filter_presets" RENAME TO acted_filter_preset; ALTER TABLE acted.acted_filter_preset SET SCHEMA public;',
        ),
        migrations.RunSQL(
            sql='ALTER TABLE acted_filter_usage_analytics SET SCHEMA acted; ALTER TABLE acted.acted_filter_usage_analytics RENAME TO filter_usage_analytics;',
            reverse_sql='ALTER TABLE "acted"."filter_usage_analytics" RENAME TO acted_filter_usage_analytics; ALTER TABLE acted.acted_filter_usage_analytics SET SCHEMA public;',
        ),

        # Step 2: Register models in filtering app state
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name='FilterGroup',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('name', models.CharField(help_text='Display name for the filter group', max_length=100)),
                        ('code', models.CharField(blank=True, help_text='Unique code identifier', max_length=100, null=True, unique=True)),
                        ('description', models.TextField(blank=True, help_text='Description of the filter group')),
                        ('is_active', models.BooleanField(default=True, help_text='Whether group is available for filtering')),
                        ('display_order', models.IntegerField(default=0, help_text='Sort order for display')),
                        ('parent', models.ForeignKey(blank=True, help_text='Parent group for hierarchy', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to='filtering.filtergroup')),
                    ],
                    options={
                        'verbose_name': 'Filter Group',
                        'verbose_name_plural': 'Filter Groups',
                        'db_table': '"acted"."filter_groups"',
                        'ordering': ['display_order', 'name'],
                    },
                ),
                migrations.CreateModel(
                    name='FilterConfiguration',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('name', models.CharField(help_text='Internal name for the filter', max_length=100, unique=True)),
                        ('display_label', models.CharField(help_text='User-facing label', max_length=100)),
                        ('description', models.TextField(blank=True, help_text='Description for admin users')),
                        ('filter_type', models.CharField(choices=[('subject', 'Subject'), ('filter_group', 'Filter Group'), ('product_variation', 'Product Variation'), ('tutorial_format', 'Tutorial Format'), ('bundle', 'Bundle'), ('custom_field', 'Custom Field'), ('computed', 'Computed Filter'), ('date_range', 'Date Range'), ('numeric_range', 'Numeric Range')], help_text='Type of filter', max_length=32)),
                        ('filter_key', models.CharField(help_text='Key used in API requests', max_length=50)),
                        ('ui_component', models.CharField(choices=[('multi_select', 'Multi-Select Checkboxes'), ('single_select', 'Single Select Dropdown'), ('checkbox', 'Single Checkbox'), ('radio_buttons', 'Radio Buttons'), ('toggle_buttons', 'Toggle Buttons'), ('search_select', 'Searchable Select'), ('tree_select', 'Hierarchical Tree Select'), ('range_slider', 'Range Slider'), ('date_picker', 'Date Picker'), ('tag_input', 'Tag Input')], default='multi_select', help_text='UI component type', max_length=32)),
                        ('display_order', models.IntegerField(default=0, help_text='Order in which filters appear')),
                        ('is_active', models.BooleanField(default=True)),
                        ('is_collapsible', models.BooleanField(default=True)),
                        ('is_expanded_by_default', models.BooleanField(default=False)),
                        ('is_required', models.BooleanField(default=False)),
                        ('allow_multiple', models.BooleanField(default=True)),
                        ('ui_config', models.JSONField(blank=True, default=dict, help_text='UI-specific configuration')),
                        ('validation_rules', models.JSONField(blank=True, default=dict, help_text='Validation rules')),
                        ('dependency_rules', models.JSONField(blank=True, default=dict, help_text='Dependencies on other filters')),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('updated_at', models.DateTimeField(auto_now=True)),
                        ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                    ],
                    options={
                        'verbose_name': 'Filter Configuration',
                        'verbose_name_plural': 'Filter Configurations',
                        'db_table': '"acted"."filter_configurations"',
                        'ordering': ['display_order', 'display_label'],
                    },
                ),
                migrations.CreateModel(
                    name='FilterConfigurationGroup',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('is_default', models.BooleanField(default=False, help_text='Is this a default option for the filter?')),
                        ('display_order', models.IntegerField(default=0, help_text='Order within this filter')),
                        ('filter_configuration', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='filtering.filterconfiguration')),
                        ('filter_group', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='filtering.filtergroup')),
                    ],
                    options={
                        'verbose_name': 'Filter Configuration Group',
                        'verbose_name_plural': 'Filter Configuration Groups',
                        'db_table': '"acted"."filter_configuration_groups"',
                        'ordering': ['display_order', 'filter_group__name'],
                        'unique_together': {('filter_configuration', 'filter_group')},
                    },
                ),
                migrations.CreateModel(
                    name='FilterPreset',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('name', models.CharField(help_text='Preset name', max_length=100)),
                        ('description', models.TextField(blank=True, help_text='Description of the preset')),
                        ('filter_values', models.JSONField(default=dict, help_text='Saved filter values')),
                        ('is_public', models.BooleanField(default=False, help_text='Available to all users')),
                        ('usage_count', models.IntegerField(default=0)),
                        ('last_used', models.DateTimeField(blank=True, null=True)),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                    ],
                    options={
                        'verbose_name': 'Filter Preset',
                        'verbose_name_plural': 'Filter Presets',
                        'db_table': '"acted"."filter_presets"',
                        'ordering': ['-usage_count', 'name'],
                    },
                ),
                migrations.CreateModel(
                    name='FilterUsageAnalytics',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('filter_value', models.CharField(help_text='The actual filter value used', max_length=100)),
                        ('usage_count', models.IntegerField(default=0)),
                        ('last_used', models.DateTimeField(auto_now=True)),
                        ('session_id', models.CharField(blank=True, help_text='Session ID for anonymous users', max_length=100)),
                        ('filter_configuration', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='filtering.filterconfiguration')),
                        ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                    ],
                    options={
                        'verbose_name': 'Filter Usage Analytics',
                        'verbose_name_plural': 'Filter Usage Analytics',
                        'db_table': '"acted"."filter_usage_analytics"',
                        'unique_together': {('filter_configuration', 'filter_value')},
                    },
                ),
                migrations.AddField(
                    model_name='filterconfiguration',
                    name='filter_groups',
                    field=models.ManyToManyField(blank=True, through='filtering.FilterConfigurationGroup', to='filtering.filtergroup'),
                ),
            ],
            database_operations=[],
        ),
    ]
```

**Step 3: Run migration**

Run: `cd backend/django_Admin3 && python3 manage.py migrate filtering`
Expected: Migration applies successfully

**Step 4: Run tests**

Run: `cd backend/django_Admin3 && python3 manage.py test filtering.tests.test_models -v2`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/django_Admin3/filtering/migrations/
git commit -m "feat(filtering): add migration to move tables to acted schema

Renames tables from acted_filter_* to 'acted'.'filter_*' with proper
schema namespacing.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 9: Create Filtering Admin

**Files:**
- Create: `backend/django_Admin3/filtering/admin.py`

**Step 1: Write the failing test**

Add to `backend/django_Admin3/filtering/tests/test_models.py`:

```python
class FilterAdminTest(TestCase):
    """Test filter admin registration."""

    def test_filter_group_registered_in_admin(self):
        """Verify FilterGroup is registered in Django admin."""
        from django.contrib import admin
        from filtering.models import FilterGroup
        self.assertIn(FilterGroup, admin.site._registry)

    def test_filter_configuration_registered_in_admin(self):
        """Verify FilterConfiguration is registered in Django admin."""
        from django.contrib import admin
        from filtering.models import FilterConfiguration
        self.assertIn(FilterConfiguration, admin.site._registry)
```

**Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && python3 manage.py test filtering.tests.test_models.FilterAdminTest -v2`
Expected: FAIL with AssertionError

**Step 3: Create admin.py**

Create `backend/django_Admin3/filtering/admin.py`:

```python
"""Django admin configuration for filtering models."""
from django.contrib import admin
from .models import (
    FilterGroup,
    FilterConfiguration,
    FilterConfigurationGroup,
    FilterPreset,
    FilterUsageAnalytics,
)


class FilterGroupInline(admin.TabularInline):
    """Inline for FilterConfigurationGroup."""
    model = FilterConfigurationGroup
    extra = 1
    autocomplete_fields = ['filter_group']


@admin.register(FilterGroup)
class FilterGroupAdmin(admin.ModelAdmin):
    """Admin interface for FilterGroup model."""
    list_display = ('name', 'code', 'parent', 'is_active', 'display_order')
    list_filter = ('is_active', 'parent')
    search_fields = ('name', 'code', 'description')
    ordering = ('display_order', 'name')
    autocomplete_fields = ('parent',)


@admin.register(FilterConfiguration)
class FilterConfigurationAdmin(admin.ModelAdmin):
    """Admin interface for FilterConfiguration model."""
    list_display = ('display_label', 'name', 'filter_type', 'ui_component', 'is_active', 'display_order')
    list_filter = ('filter_type', 'ui_component', 'is_active')
    search_fields = ('name', 'display_label', 'description')
    ordering = ('display_order', 'display_label')
    inlines = [FilterGroupInline]
    fieldsets = (
        ('Basic Configuration', {
            'fields': ('name', 'display_label', 'description', 'filter_type', 'filter_key')
        }),
        ('UI Configuration', {
            'fields': ('ui_component', 'display_order', 'is_collapsible', 'is_expanded_by_default')
        }),
        ('Behavior', {
            'fields': ('is_active', 'is_required', 'allow_multiple')
        }),
        ('Advanced Configuration', {
            'fields': ('ui_config', 'validation_rules', 'dependency_rules'),
            'classes': ('collapse',)
        }),
    )


@admin.register(FilterConfigurationGroup)
class FilterConfigurationGroupAdmin(admin.ModelAdmin):
    """Admin interface for FilterConfigurationGroup junction table."""
    list_display = ('filter_configuration', 'filter_group', 'is_default', 'display_order')
    list_filter = ('filter_configuration', 'is_default')
    search_fields = ('filter_configuration__name', 'filter_group__name')
    autocomplete_fields = ('filter_configuration', 'filter_group')


@admin.register(FilterPreset)
class FilterPresetAdmin(admin.ModelAdmin):
    """Admin interface for FilterPreset model."""
    list_display = ('name', 'created_by', 'is_public', 'usage_count', 'last_used')
    list_filter = ('is_public', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('usage_count', 'last_used', 'created_at')


@admin.register(FilterUsageAnalytics)
class FilterUsageAnalyticsAdmin(admin.ModelAdmin):
    """Admin interface for FilterUsageAnalytics model."""
    list_display = ('filter_configuration', 'filter_value', 'usage_count', 'last_used')
    list_filter = ('filter_configuration', 'last_used')
    search_fields = ('filter_value',)
    readonly_fields = ('usage_count', 'last_used')
```

**Step 4: Run test to verify it passes**

Run: `cd backend/django_Admin3 && python3 manage.py test filtering.tests.test_models.FilterAdminTest -v2`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/django_Admin3/filtering/admin.py
git commit -m "feat(filtering): add admin registration for filter models

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 10: Update Products App to Remove Filter Models

**Files:**
- Modify: `backend/django_Admin3/products/models/__init__.py`
- Create: `backend/django_Admin3/products/migrations/0005_remove_filter_models.py`

**Step 1: Create migration to remove filter models from products state**

Create `backend/django_Admin3/products/migrations/0005_remove_filter_models.py`:

```python
"""Remove filter models from products app.

Models have been moved to filtering app. This migration only updates Django's
state - the database tables were already moved by filtering migration.
"""
from django.db import migrations


class Migration(migrations.Migration):
    """Remove filter models from products app state."""

    dependencies = [
        ("products", "0004_remove_productvariationrecommendation"),
        ("filtering", "0001_initial"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.DeleteModel(name='FilterUsageAnalytics'),
                migrations.DeleteModel(name='FilterPreset'),
                migrations.DeleteModel(name='FilterConfigurationGroup'),
                migrations.DeleteModel(name='FilterConfiguration'),
                migrations.DeleteModel(name='FilterGroup'),
            ],
            database_operations=[],
        ),
    ]
```

**Step 2: Update products/models/__init__.py for backward compatibility**

Update `backend/django_Admin3/products/models/__init__.py`:

```python
"""Products app models package.

DEPRECATED: This app is a compatibility shim. All models have been migrated:

- Product, ProductVariation, ProductBundle models → catalog app
- ProductVariationRecommendation → catalog app
- FilterGroup, FilterConfiguration models → filtering app

New code should import from the appropriate app:
    from catalog.models import Product, ProductVariation, ProductVariationRecommendation
    from filtering.models import FilterGroup, FilterConfiguration
"""
# Re-export catalog models for backward compatibility
from catalog.models import (
    Product,
    ProductVariation,
    ProductProductVariation,
    ProductProductGroup,
    ProductBundle,
    ProductBundleProduct,
    ProductVariationRecommendation,
)

# Re-export filtering models for backward compatibility
from filtering.models import (
    FilterGroup,
    FilterConfiguration,
    FilterConfigurationGroup,
    FilterPreset,
    FilterUsageAnalytics,
)

__all__ = [
    # Catalog re-exports (deprecated - use catalog.models)
    'Product',
    'ProductVariation',
    'ProductProductVariation',
    'ProductProductGroup',
    'ProductBundle',
    'ProductBundleProduct',
    'ProductVariationRecommendation',
    # Filtering re-exports (deprecated - use filtering.models)
    'FilterGroup',
    'FilterConfiguration',
    'FilterConfigurationGroup',
    'FilterPreset',
    'FilterUsageAnalytics',
]
```

**Step 3: Run migration**

Run: `cd backend/django_Admin3 && python3 manage.py migrate products`
Expected: Migration applies successfully

**Step 4: Run backward compatibility tests**

Run: `cd backend/django_Admin3 && python3 manage.py test catalog.tests.test_backward_compat -v2`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/django_Admin3/products/models/__init__.py
git add backend/django_Admin3/products/migrations/0005_remove_filter_models.py
git commit -m "refactor(products): remove filter models, re-export from filtering app

Maintains backward compatibility for existing imports.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 11: Update Import Statements for Filtering Models

**Files:**
- Modify: `backend/django_Admin3/search/services/search_service.py`
- Modify: `backend/django_Admin3/catalog/views/navigation_views.py`
- Modify: `backend/django_Admin3/exam_sessions_subjects_products/views.py`
- Modify: `backend/django_Admin3/exam_sessions_subjects_products/services/optimized_search_service.py`
- Modify: `backend/django_Admin3/products/services/filter_service.py`
- Modify: `backend/django_Admin3/products/admin/filter_admin.py`

**Step 1: Update search/services/search_service.py**

Change line 19 from:
```python
from products.models.filter_system import FilterGroup, FilterConfiguration
```
to:
```python
from filtering.models import FilterGroup, FilterConfiguration
```

**Step 2: Update catalog/views/navigation_views.py**

Change line 56 from:
```python
from products.models.filter_system import FilterGroup
```
to:
```python
from filtering.models import FilterGroup
```

Change line 221-222 from:
```python
from products.models.filter_system import FilterGroup
from products.serializers import FilterGroupSerializer
```
to:
```python
from filtering.models import FilterGroup
from products.serializers import FilterGroupSerializer
```

**Step 3: Update exam_sessions_subjects_products/views.py**

Change line 192 from:
```python
from products.models.filter_system import FilterConfiguration
```
to:
```python
from filtering.models import FilterConfiguration
```

**Step 4: Update exam_sessions_subjects_products/services/optimized_search_service.py**

Change line 14 from:
```python
from products.models.filter_system import FilterConfiguration
```
to:
```python
from filtering.models import FilterConfiguration
```

Change lines 432, 443, 458, 482 from:
```python
from products.models.filter_system import FilterGroup
```
to:
```python
from filtering.models import FilterGroup
```

**Step 5: Update products/services/filter_service.py**

Change line 8 from:
```python
from products.models.filter_system import (
    FilterGroup,
    FilterConfiguration,
    FilterConfigurationGroup,
    FilterPreset,
    FilterUsageAnalytics,
)
```
to:
```python
from filtering.models import (
    FilterGroup,
    FilterConfiguration,
    FilterConfigurationGroup,
    FilterPreset,
    FilterUsageAnalytics,
)
```

Change line 463 from:
```python
from products.models.filter_system import migrate_old_product_groups, setup_main_category_filter
```
to:
```python
# Note: Migration helpers removed - use Django migrations instead
pass
```

**Step 6: Update products/admin/filter_admin.py**

Change line 11 from:
```python
from products.models.filter_system import (
    FilterGroup,
    FilterConfiguration,
    FilterConfigurationGroup,
    FilterPreset,
    FilterUsageAnalytics,
)
```
to:
```python
from filtering.models import (
    FilterGroup,
    FilterConfiguration,
    FilterConfigurationGroup,
    FilterPreset,
    FilterUsageAnalytics,
)
```

**Step 7: Run full test suite**

Run: `cd backend/django_Admin3 && python3 manage.py test --keepdb`
Expected: All tests pass (1287+)

**Step 8: Commit**

```bash
git add backend/django_Admin3/search/services/search_service.py
git add backend/django_Admin3/catalog/views/navigation_views.py
git add backend/django_Admin3/exam_sessions_subjects_products/views.py
git add backend/django_Admin3/exam_sessions_subjects_products/services/optimized_search_service.py
git add backend/django_Admin3/products/services/filter_service.py
git add backend/django_Admin3/products/admin/filter_admin.py
git commit -m "refactor: update imports to use filtering app models

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 12: Delete Old Filter System File from Products

**Files:**
- Delete: `backend/django_Admin3/products/models/filter_system.py`
- Delete: `backend/django_Admin3/products/admin/filter_admin.py` (if redundant)

**Step 1: Verify backward compatibility still works**

Run: `cd backend/django_Admin3 && python3 manage.py test catalog.tests.test_backward_compat -v2`
Expected: PASS

**Step 2: Delete filter_system.py**

Run: `rm backend/django_Admin3/products/models/filter_system.py`

**Step 3: Run tests to ensure nothing breaks**

Run: `cd backend/django_Admin3 && python3 manage.py test --keepdb`
Expected: All tests pass

**Step 4: Commit**

```bash
git add -u backend/django_Admin3/products/models/filter_system.py
git commit -m "chore(products): remove deprecated filter_system.py

Models now live in filtering app.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 13: Final Verification

**Step 1: Verify all table names**

Run:
```bash
cd backend/django_Admin3 && python3 manage.py shell -c "
from catalog.models import ProductVariationRecommendation
from filtering.models import FilterGroup, FilterConfiguration, FilterConfigurationGroup, FilterPreset, FilterUsageAnalytics

print('ProductVariationRecommendation:', ProductVariationRecommendation._meta.db_table)
print('FilterGroup:', FilterGroup._meta.db_table)
print('FilterConfiguration:', FilterConfiguration._meta.db_table)
print('FilterConfigurationGroup:', FilterConfigurationGroup._meta.db_table)
print('FilterPreset:', FilterPreset._meta.db_table)
print('FilterUsageAnalytics:', FilterUsageAnalytics._meta.db_table)
"
```
Expected:
```
ProductVariationRecommendation: "acted"."product_productvariation_recommendations"
FilterGroup: "acted"."filter_groups"
FilterConfiguration: "acted"."filter_configurations"
FilterConfigurationGroup: "acted"."filter_configuration_groups"
FilterPreset: "acted"."filter_presets"
FilterUsageAnalytics: "acted"."filter_usage_analytics"
```

**Step 2: Run full test suite**

Run: `cd backend/django_Admin3 && python3 manage.py test --keepdb`
Expected: All tests pass (1287+)

**Step 3: Verify admin works**

Run: `cd backend/django_Admin3 && python3 manage.py runserver 8888`
Navigate to: `http://127.0.0.1:8888/admin/`
Expected: See Catalog > Product Variation Recommendations and Filtering > Filter Groups, Filter Configurations

**Step 4: Commit final state**

```bash
git add -A
git commit -m "docs: complete model consolidation to acted schema

Phase 1: ProductVariationRecommendation moved to catalog app
Phase 2: Filter models moved to new filtering app

All tables now use 'acted' schema namespace.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| Model | Old Location | New Location | Old Table | New Table |
|-------|--------------|--------------|-----------|-----------|
| ProductVariationRecommendation | products | catalog | acted_product_productvariation_recommendations | "acted"."product_productvariation_recommendations" |
| FilterGroup | products | filtering | acted_filter_group | "acted"."filter_groups" |
| FilterConfiguration | products | filtering | acted_filter_configuration | "acted"."filter_configurations" |
| FilterConfigurationGroup | products | filtering | acted_filter_configuration_group | "acted"."filter_configuration_groups" |
| FilterPreset | products | filtering | acted_filter_preset | "acted"."filter_presets" |
| FilterUsageAnalytics | products | filtering | acted_filter_usage_analytics | "acted"."filter_usage_analytics" |

**Backward Compatibility:** All models remain importable from `products.models` via re-exports.
