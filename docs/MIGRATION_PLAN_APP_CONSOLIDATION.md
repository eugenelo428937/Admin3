# Migration Plan: App Consolidation

## Overview

This document outlines the complete migration plan to delete the three legacy Django apps:
- `exam_sessions/`
- `exam_sessions_subjects/`
- `exam_sessions_subjects_products/`

And consolidate all functionality into the `catalog/` app.

**Estimated Effort**: 2-3 days
**Risk Level**: High (production data involved)

---

## Current State

### Models to Migrate

| Current Location | Model | Target Location | DB Table |
|-----------------|-------|-----------------|----------|
| exam_sessions_subjects | ExamSessionSubject | catalog | `acted_exam_session_subjects` |
| exam_sessions_subjects_products | ExamSessionSubjectProduct | catalog | `acted_exam_session_subject_products` |
| exam_sessions_subjects_products | ExamSessionSubjectProductVariation | catalog | `acted_exam_session_subject_product_variations` |
| exam_sessions_subjects_products | Price | catalog | `acted_exam_session_subject_product_variation_price` |
| exam_sessions_subjects_products | ExamSessionSubjectBundle | catalog | `acted_exam_session_subject_bundles` |
| exam_sessions_subjects_products | ExamSessionSubjectBundleProduct | catalog | `acted_exam_session_subject_bundle_products` |

### Already Migrated (in catalog app)

- Subject (from subjects app)
- ExamSession (from exam_sessions app)
- Product, ProductVariation, ProductProductVariation (from products app)
- ProductBundle, ProductBundleProduct

---

## Pre-Migration Checklist

- [ ] Create database backup
- [ ] Run full test suite (baseline)
- [ ] Document current row counts in all affected tables
- [ ] Notify team of migration window

---

## Phase 1: Create New Models in Catalog App

### Step 1.1: Create exam_session_subject.py in catalog/models/

```python
# catalog/models/exam_session_subject.py
from django.db import models
from .exam_session import ExamSession
from .subject import Subject

class ExamSessionSubject(models.Model):
    exam_session = models.ForeignKey(
        ExamSession,
        on_delete=models.CASCADE,
        related_name='exam_session_subjects'
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='exam_session_subjects'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_exam_session_subjects'
        unique_together = ('exam_session', 'subject')
        verbose_name = 'Exam Session Subject'
        verbose_name_plural = 'Exam Session Subjects'

    def __str__(self):
        return f"{self.exam_session.session_code} - {self.subject.code}"
```

### Step 1.2: Create exam_session_subject_product.py

```python
# catalog/models/exam_session_subject_product.py
from django.db import models
from .exam_session_subject import ExamSessionSubject
from .product import Product

class ExamSessionSubjectProduct(models.Model):
    exam_session_subject = models.ForeignKey(
        ExamSessionSubject,
        on_delete=models.CASCADE,
        related_name='products'
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name='exam_session_products'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_exam_session_subject_products'
        unique_together = ('exam_session_subject', 'product')
        verbose_name = 'Exam Session Subject Product'
        verbose_name_plural = 'Exam Session Subject Products'

    def __str__(self):
        return f"{self.exam_session_subject} - {self.product.code}"
```

### Step 1.3: Create remaining model files

Similarly create:
- `catalog/models/exam_session_subject_product_variation.py`
- `catalog/models/price.py`
- `catalog/models/exam_session_subject_bundle.py`
- `catalog/models/exam_session_subject_bundle_product.py`

### Step 1.4: Update catalog/models/__init__.py

```python
# Add new exports
from .exam_session_subject import ExamSessionSubject
from .exam_session_subject_product import ExamSessionSubjectProduct
from .exam_session_subject_product_variation import ExamSessionSubjectProductVariation
from .price import Price
from .exam_session_subject_bundle import ExamSessionSubjectBundle
from .exam_session_subject_bundle_product import ExamSessionSubjectBundleProduct
```

---

## Phase 2: Create Migration with State Operations

### Step 2.1: Create migration to "take over" existing tables

```python
# catalog/migrations/XXXX_take_over_exam_session_models.py
from django.db import migrations

class Migration(migrations.Migration):
    """
    This migration uses SeparateDatabaseAndState to:
    1. Tell Django the models now live in catalog app
    2. NOT modify the actual database tables (they already exist)
    """

    dependencies = [
        ('catalog', 'previous_migration'),
        ('exam_sessions_subjects', 'latest_migration'),
        ('exam_sessions_subjects_products', 'latest_migration'),
    ]

    state_operations = [
        migrations.CreateModel(
            name='ExamSessionSubject',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('exam_session', models.ForeignKey(on_delete=models.CASCADE, related_name='exam_session_subjects', to='catalog.examsession')),
                ('subject', models.ForeignKey(on_delete=models.CASCADE, related_name='exam_session_subjects', to='catalog.subject')),
            ],
            options={
                'db_table': 'acted_exam_session_subjects',
                'verbose_name': 'Exam Session Subject',
                'verbose_name_plural': 'Exam Session Subjects',
                'unique_together': {('exam_session', 'subject')},
            },
        ),
        # ... repeat for all other models
    ]

    operations = [
        migrations.SeparateDatabaseAndState(state_operations=state_operations),
    ]
```

### Step 2.2: Delete models from old apps (state only)

```python
# exam_sessions_subjects/migrations/XXXX_delete_model_state.py
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('exam_sessions_subjects', 'previous_migration'),
        ('catalog', 'take_over_migration'),  # Must run after catalog takes over
    ]

    state_operations = [
        migrations.DeleteModel(name='ExamSessionSubject'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(state_operations=state_operations),
    ]
```

---

## Phase 3: Update All Imports

### Files to Update (50+ files)

#### Cart App
```python
# cart/models.py
# Before:
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
# After:
from catalog.models import ExamSessionSubjectProduct

# cart/views.py - same pattern
```

#### Marking App
```python
# marking/models/marking_paper.py
# Before:
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
# After:
from catalog.models import ExamSessionSubjectProduct
```

#### Tutorials App
```python
# tutorials/models/tutorial_event.py
# Before:
from exam_sessions_subjects_products.models import ExamSessionSubjectProductVariation
# After:
from catalog.models import ExamSessionSubjectProductVariation
```

#### Products App
```python
# products/services/filter_service.py
# Before:
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
# After:
from catalog.models import ExamSessionSubjectProduct
```

### Complete Import Update List

| File | Old Import | New Import |
|------|-----------|------------|
| cart/models.py | exam_sessions_subjects_products.models | catalog.models |
| cart/views.py | exam_sessions_subjects_products.models | catalog.models |
| marking/models/marking_paper.py | exam_sessions_subjects_products.models | catalog.models |
| marking/views.py | exam_sessions_subjects_products.models | catalog.models |
| marking/management/commands/import_marking_deadlines.py | exam_sessions_subjects_products.models | catalog.models |
| tutorials/models/tutorial_event.py | exam_sessions_subjects_products.models | catalog.models |
| tutorials/views.py | exam_sessions_subjects_products.models | catalog.models |
| products/services/filter_service.py | exam_sessions_subjects_products.models | catalog.models |
| products/admin/filter_admin.py | exam_sessions_subjects_products.models | catalog.models |
| catalog/views/navigation_views.py | exam_sessions_subjects_products.models | catalog.models |
| catalog/views/product_views.py | exam_sessions_subjects_products.models | catalog.models |
| catalog/views/bundle_views.py | exam_sessions_subjects_products.models | catalog.models |

---

## Phase 4: Move Services and Views

### Step 4.1: Move services to catalog

```bash
# Move search services
mv exam_sessions_subjects_products/services/fuzzy_search_service.py catalog/services/
mv exam_sessions_subjects_products/services/optimized_search_service.py catalog/services/
```

### Step 4.2: Move serializers

Either:
- Copy serializers to catalog app
- Or keep in products app (filter-related)

### Step 4.3: Move admin registrations

```python
# catalog/admin.py - add these registrations
from .models import (
    ExamSessionSubject,
    ExamSessionSubjectProduct,
    ExamSessionSubjectProductVariation,
    Price,
    ExamSessionSubjectBundle,
    ExamSessionSubjectBundleProduct
)

@admin.register(ExamSessionSubject)
class ExamSessionSubjectAdmin(admin.ModelAdmin):
    list_display = ['exam_session', 'subject', 'created_at']
    list_filter = ['exam_session', 'subject']
    search_fields = ['exam_session__session_code', 'subject__code']

# ... etc for other models
```

---

## Phase 5: Update URL Routes

### Step 5.1: Update django_Admin3/urls.py

```python
# Before:
path('api/exam-sessions/', include('exam_sessions.urls')),
path('api/exam-sessions-subjects/', include('exam_sessions_subjects.urls')),
path('api/products/current/', include('exam_sessions_subjects_products.urls')),

# After:
# All handled by catalog app
path('api/catalog/', include('catalog.urls')),

# Keep deprecated routes for backward compatibility (optional)
path('api/exam-sessions/', include('catalog.urls.exam_sessions')),
```

### Step 5.2: Create catalog URL submodules if needed

---

## Phase 6: Remove Old Apps

### Step 6.1: Update settings.py

```python
# django_Admin3/settings/base.py
INSTALLED_APPS = [
    # ... other apps
    # REMOVE these:
    # 'exam_sessions',
    # 'exam_sessions_subjects',
    # 'exam_sessions_subjects_products',
]
```

### Step 6.2: Delete app directories

```bash
rm -rf backend/django_Admin3/exam_sessions/
rm -rf backend/django_Admin3/exam_sessions_subjects/
rm -rf backend/django_Admin3/exam_sessions_subjects_products/
```

### Step 6.3: Clean up migration references (optional)

```bash
# Run squashmigrations to clean up history
python manage.py squashmigrations catalog 0001 XXXX
```

---

## Phase 7: Testing

### Step 7.1: Run full test suite

```bash
python manage.py test --keepdb
```

### Step 7.2: Manual testing checklist

- [ ] Admin UI: Can view/edit exam sessions
- [ ] Admin UI: Can view/edit exam session subjects
- [ ] Admin UI: Can view/edit exam session subject products
- [ ] Admin UI: Can view/edit prices
- [ ] API: /api/catalog/products/ returns data
- [ ] API: /api/catalog/bundles/ returns data
- [ ] Frontend: Navigation menu loads
- [ ] Frontend: Product listing works
- [ ] Frontend: Shopping cart works
- [ ] Frontend: Checkout flow works

---

## Rollback Plan

If migration fails:

1. **Restore database backup**
2. **Revert code changes** via git
3. **Run migrations backward**
   ```bash
   python manage.py migrate catalog PREVIOUS_MIGRATION
   python manage.py migrate exam_sessions_subjects_products PREVIOUS_MIGRATION
   python manage.py migrate exam_sessions_subjects PREVIOUS_MIGRATION
   ```

---

## Post-Migration Cleanup

After successful migration:

1. Delete old app directories
2. Remove old migrations from version control history (squash)
3. Update documentation
4. Remove deprecation warnings from API responses
5. Update frontend API endpoints if needed

---

## Database Tables Summary

### Tables Being Consolidated (NO SCHEMA CHANGES)

| Table | Row Count (est.) | Notes |
|-------|-----------------|-------|
| acted_exam_session_subjects | ~500 | Session-subject mappings |
| acted_exam_session_subject_products | ~2000 | Products per session |
| acted_exam_session_subject_product_variations | ~3000 | Variations per product |
| acted_exam_session_subject_product_variation_price | ~6000 | Prices per variation |
| acted_exam_session_subject_bundles | ~100 | Bundle definitions |
| acted_exam_session_subject_bundle_products | ~300 | Products in bundles |

**Key Point**: No data migration needed - only Django model ownership changes.

---

## Timeline

| Day | Phase | Tasks |
|-----|-------|-------|
| Day 1 | Phases 1-2 | Create models, migrations |
| Day 2 | Phases 3-4 | Update imports, move services |
| Day 3 | Phases 5-7 | Update routes, remove apps, testing |

---

## Questions for Stakeholder

1. Should we keep backward-compatible API routes during transition?
2. Is there a preferred maintenance window for database operations?
3. Should we notify frontend team of API endpoint changes?
