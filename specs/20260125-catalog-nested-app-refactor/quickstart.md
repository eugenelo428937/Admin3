# Quickstart Guide: Catalog Nested Apps Refactoring

**Date**: 2026-01-25
**Feature Branch**: `20260125-catalog-nested-app-refactor`

## Prerequisites

- Git branch: `20260125-catalog-nested-app-refactor`
- Database backup completed
- Virtual environment activated

```bash
cd backend/django_Admin3
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
```

---

## Implementation Phases

### Phase 1: Create Nested App Structure

#### Step 1.1: Create Directory Structure

```bash
# Create nested app directories
mkdir -p catalog/exam_session
mkdir -p catalog/subject
mkdir -p catalog/products/models
mkdir -p catalog/products/bundle
mkdir -p catalog/products/recommendation
```

#### Step 1.2: Create apps.py Files

Create `apps.py` for each nested app (see [data-model.md](./data-model.md) for full content):

1. `catalog/exam_session/apps.py` - ExamSessionConfig
2. `catalog/subject/apps.py` - SubjectConfig
3. `catalog/products/apps.py` - ProductsConfig
4. `catalog/products/bundle/apps.py` - BundleConfig
5. `catalog/products/recommendation/apps.py` - RecommendationConfig

#### Step 1.3: Create __init__.py Files

Each directory needs `__init__.py`:
- `catalog/exam_session/__init__.py`
- `catalog/subject/__init__.py`
- `catalog/products/__init__.py`
- `catalog/products/models/__init__.py`
- `catalog/products/bundle/__init__.py`
- `catalog/products/recommendation/__init__.py`

---

### Phase 2: Move Models

#### Step 2.1: Move Core Models

```bash
# Move ExamSession
mv catalog/models/exam_session.py catalog/exam_session/models.py

# Move Subject
mv catalog/models/subject.py catalog/subject/models.py
```

Update `db_table` and add `app_label` in Meta class:

```python
class Meta:
    db_table = '"acted"."catalog_exam_sessions"'
    app_label = 'catalog_exam_sessions'
```

#### Step 2.2: Move Product Models

```bash
# Move to products/models/
mv catalog/models/product.py catalog/products/models/product.py
mv catalog/models/product_variation.py catalog/products/models/product_variation.py
mv catalog/models/product_product_variation.py catalog/products/models/product_product_variation.py
```

#### Step 2.3: Move Bundle Models

```bash
# Combine into single file
# Move ProductBundle and ProductBundleProduct to bundle/models.py
mv catalog/models/product_bundle.py catalog/products/bundle/models.py
# Append ProductBundleProduct content
cat catalog/models/product_bundle_product.py >> catalog/products/bundle/models.py
rm catalog/models/product_bundle_product.py
```

#### Step 2.4: Move Recommendation Model

```bash
mv catalog/models/product_variation_recommendation.py catalog/products/recommendation/models.py
```

#### Step 2.5: Move ProductProductGroup to Filtering

```bash
mv catalog/models/product_product_group.py filtering/models/product_product_group.py
```

Update `filtering/models/__init__.py` to export `ProductProductGroup`.

#### Step 2.6: Keep ExamSessionSubject in Catalog Parent

- Keep `catalog/models/exam_session_subject.py`
- Update `catalog/models/__init__.py` to export only `ExamSessionSubject`

---

### Phase 3: Update Foreign Key References

#### Step 3.1: Convert to String References

In each model file, update ForeignKey definitions to use string labels:

```python
# Before
from catalog.models import ExamSession
exam_session = models.ForeignKey(ExamSession, ...)

# After
exam_session = models.ForeignKey('catalog_exam_sessions.ExamSession', ...)
```

#### Step 3.2: Key Files to Update

| File | FK Fields to Update |
|------|---------------------|
| `catalog/models/exam_session_subject.py` | `exam_session`, `subject` |
| `catalog/products/models/product_product_variation.py` | `product`, `product_variation` |
| `catalog/products/bundle/models.py` | `subject`, `bundle`, `product_product_variation` |
| `catalog/products/recommendation/models.py` | `source_ppv`, `recommended_ppv` |
| `filtering/models/product_product_group.py` | `product` |

---

### Phase 4: Update INSTALLED_APPS

Edit `django_Admin3/settings.py`:

```python
INSTALLED_APPS = [
    # ... Django core apps ...

    # Catalog core (leaf nodes first)
    'catalog.exam_session',
    'catalog.subject',
    'catalog',

    # Products layer
    'catalog.products',
    'catalog.products.bundle',
    'catalog.products.recommendation',

    # Other apps
    'filtering',
    'store',
    'marking',
    'cart',
    'orders',
    # ...
]
```

---

### Phase 5: Update Import Statements

#### Step 5.1: Find All Imports

```bash
# Find all files importing from catalog.models
grep -r "from catalog.models import" --include="*.py" . > /tmp/catalog_imports.txt
```

#### Step 5.2: Update Import Patterns

| Old Import | New Import |
|------------|------------|
| `from catalog.models import ExamSession` | `from catalog.exam_session.models import ExamSession` |
| `from catalog.models import Subject` | `from catalog.subject.models import Subject` |
| `from catalog.models import ExamSessionSubject` | `from catalog.models import ExamSessionSubject` |
| `from catalog.models import Product` | `from catalog.products.models import Product` |
| `from catalog.models import ProductVariation` | `from catalog.products.models import ProductVariation` |
| `from catalog.models import ProductProductVariation` | `from catalog.products.models import ProductProductVariation` |
| `from catalog.models import ProductBundle` | `from catalog.products.bundle.models import ProductBundle` |
| `from catalog.models import ProductBundleProduct` | `from catalog.products.bundle.models import ProductBundleProduct` |
| `from catalog.models import ProductVariationRecommendation` | `from catalog.products.recommendation.models import ProductVariationRecommendation` |
| `from catalog.models import ProductProductGroup` | `from filtering.models import ProductProductGroup` |

#### Step 5.3: Files to Update (by priority)

**High Priority** (production code):
1. `marking/models/marking_paper.py`
2. `marking/views.py`
3. `marking/management/commands/import_marking_deadlines.py`
4. `filtering/views.py`
5. `filtering/services/filter_service.py`
6. `cart/services/cart_service.py`
7. `store/models/*.py` (verify FKs)
8. `tutorials/views.py`
9. `search/services/search_service.py`

**Medium Priority** (catalog internal):
1. `catalog/views/*.py`
2. `catalog/serializers/*.py`
3. `catalog/admin.py`
4. `misc/products/models/*.py`
5. `misc/subjects/models.py`

**Low Priority** (tests):
1. `marking/tests/*.py`
2. `store/tests/*.py`
3. `catalog/tests/*.py`
4. `tutorials/tests/*.py`
5. `cart/tests/*.py`

---

### Phase 6: Migrate Marking App

#### Step 6.1: Update MarkingPaper Model

```python
# marking/models/marking_paper.py
class MarkingPaper(models.Model):
    product = models.ForeignKey(
        'store.Product',
        on_delete=models.CASCADE,
        related_name='marking_papers',
        help_text='The store product (marking variation) for this paper'
    )
    # ... rest of fields unchanged ...
```

#### Step 6.2: Create Data Migration

See [data-model.md](./data-model.md) for full migration script.

```bash
python manage.py makemigrations marking --name migrate_to_store_product
```

#### Step 6.3: Remove ExamSessionSubjectProduct

After marking migration completes:
1. Delete `catalog/models/exam_session_subject_product.py`
2. Remove from `catalog/models/__init__.py`
3. Remove from `catalog/admin.py`

---

### Phase 7: Fresh Migrations

#### Step 7.1: Backup and Delete Old Migrations

```bash
# Backup old migrations
cp -r catalog/migrations catalog/migrations_backup

# Delete old migrations (keep __init__.py)
rm catalog/migrations/0*.py
```

#### Step 7.2: Create New Migration Directories

```bash
mkdir -p catalog/exam_session/migrations
mkdir -p catalog/subject/migrations
mkdir -p catalog/products/migrations
mkdir -p catalog/products/bundle/migrations
mkdir -p catalog/products/recommendation/migrations

# Create __init__.py files
touch catalog/exam_session/migrations/__init__.py
touch catalog/subject/migrations/__init__.py
touch catalog/products/migrations/__init__.py
touch catalog/products/bundle/migrations/__init__.py
touch catalog/products/recommendation/migrations/__init__.py
```

#### Step 7.3: Create Fresh Migrations

```bash
# Order matters - dependencies first
python manage.py makemigrations catalog_exam_sessions
python manage.py makemigrations catalog_subjects
python manage.py makemigrations catalog
python manage.py makemigrations catalog_products
python manage.py makemigrations catalog_products_bundles
python manage.py makemigrations catalog_products_recommendations
python manage.py makemigrations filtering  # For ProductProductGroup
```

#### Step 7.4: Fake Apply on Existing Database

```bash
python manage.py migrate --fake
```

---

### Phase 8: Verification

#### Step 8.1: Django Check

```bash
python manage.py check
```

Expected: No errors about missing apps or circular imports.

#### Step 8.2: Run Tests

```bash
python manage.py test
```

Expected: All existing tests pass.

#### Step 8.3: Verify Imports

```bash
# Should return zero results
grep -r "from catalog.models import Product" --include="*.py" . | grep -v test
grep -r "from catalog.models import ExamSession" --include="*.py" . | grep -v test
```

#### Step 8.4: Verify No ESSP References

```bash
# Should return zero results (except migrations_backup)
grep -r "ExamSessionSubjectProduct" --include="*.py" . | grep -v migrations_backup
```

---

## Rollback Plan

If issues occur:

1. **Git Reset**: `git checkout main -- backend/django_Admin3/`
2. **Restore Migrations**: `cp -r catalog/migrations_backup/* catalog/migrations/`
3. **Re-fake Migrations**: `python manage.py migrate --fake`

---

## Checklist

- [ ] Directory structure created
- [ ] apps.py files created with correct labels
- [ ] Models moved to new locations
- [ ] db_table and app_label updated in Meta classes
- [ ] ForeignKeys converted to string references
- [ ] INSTALLED_APPS updated
- [ ] All import statements updated (50+ files)
- [ ] MarkingPaper migrated to store.Product
- [ ] ExamSessionSubjectProduct removed
- [ ] ProductProductGroup moved to filtering
- [ ] Fresh migrations created
- [ ] `migrate --fake` applied
- [ ] `manage.py check` passes
- [ ] All tests pass
- [ ] No old import patterns remain
