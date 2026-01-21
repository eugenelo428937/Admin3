# Database Schema Consolidation: Store App Creation

**Date**: 2025-01-07
**Status**: Approved for Implementation

## Summary

Consolidate exam session product models into a clean two-app architecture:
- **catalog**: Master data (templates, definitions)
- **store**: Purchasable items (products available for sale)

## Problem Statement

The current architecture has redundancy and complexity:
1. `ExamSessionSubjectProduct` (ESSP) table is redundant - product info can be derived from `ProductProductVariation`
2. Multiple legacy wrapper apps (`subjects`, `exam_sessions`, `products`) that only re-export from `catalog`
3. Filter system is stranded in `products` app instead of being with catalog data

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CATALOG APP (Master Data)                      │
├─────────────────────────────────────────────────────────────────────────┤
│  ProductTemplate (renamed from Product)     table: acted.catalog_product_templates │
│  ProductVariation                           table: acted.catalog_product_variations │
│  ProductProductVariation                    table: acted.catalog_product_product_variations │
│  ProductBundle                              table: acted.catalog_product_bundles │
│  ExamSession                                table: acted.catalog_exam_sessions │
│  Subject                                    table: acted.catalog_subjects │
│  ExamSessionSubject (MOVED from separate app) table: acted.catalog_exam_session_subjects │
│  Filter System (MOVED from products app)                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           STORE APP (Purchasable Items)                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Product (from ESSPV, links directly to ESS)  table: acted.products     │
│  Price                                        table: acted.prices       │
│  Bundle                                       table: acted.bundles      │
│  BundleProduct                                table: acted.bundle_products │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Changes

### 1. Rename `catalog.Product` → `catalog.ProductTemplate`
- Table: `acted.catalog_product_templates` (renamed from `acted.catalog_products`)
- Represents master product definitions, not purchasable items

### 2. Move `ExamSessionSubject` to Catalog App
- From: `exam_sessions_subjects.ExamSessionSubject`
- To: `catalog.ExamSessionSubject`
- Table: `acted.catalog_exam_session_subjects`

### 3. Create New `store` App

| Model | Table | Source Model |
|-------|-------|--------------|
| `store.Product` | `acted.products` | ExamSessionSubjectProductVariation |
| `store.Price` | `acted.prices` | Price |
| `store.Bundle` | `acted.bundles` | ExamSessionSubjectBundle |
| `store.BundleProduct` | `acted.bundle_products` | ExamSessionSubjectBundleProduct |

**Critical Schema Change**: `store.Product` links DIRECTLY to `ExamSessionSubject`, removing the redundant ESSP intermediate table.

### 4. Move Filter System to Catalog
- `FilterGroup`, `FilterConfiguration`, `ProductGroupFilter`, `ProductVariationRecommendation`
- Filter views and serializers

### 5. Remove Legacy Apps/Tables
- `ExamSessionSubjectProduct` (ESSP) - eliminated (redundant)
- `exam_sessions_subjects` app - merged into catalog
- `exam_sessions_subjects_products` app - replaced by store
- `subjects`, `exam_sessions` apps - wrappers only, remove
- `products` app - filter system moved to catalog, then remove entirely

---

## New Data Model

### Before (Current)
```
ExamSessionSubject (ESS)
        │
        ▼
ExamSessionSubjectProduct (ESSP)  ← REDUNDANT: product_id duplicates info in PPV
        │
        ▼
ExamSessionSubjectProductVariation (ESSPV)
        │
        └──► ProductProductVariation (PPV) ──► Product + ProductVariation
```

### After (Target)
```
catalog.ExamSessionSubject (ESS)
        │
        ▼
store.Product (direct link, no ESSP)
        │
        └──► catalog.ProductProductVariation ──► ProductTemplate + ProductVariation
```

---

## Implementation Phases

### Phase 1: Create Store App Structure
```
backend/django_Admin3/store/
├── __init__.py
├── apps.py
├── models/
│   ├── __init__.py
│   ├── product.py          # store.Product
│   ├── price.py            # store.Price
│   ├── bundle.py           # store.Bundle
│   └── bundle_product.py   # store.BundleProduct
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
└── migrations/
```

### Phase 2: Catalog App Updates
1. Create `catalog/models/product_template.py` (rename from product.py)
2. Create `catalog/models/exam_session_subject.py` (move from exam_sessions_subjects)
3. Move filter system from `products` app to `catalog`
4. Update `catalog/models/__init__.py` exports
5. Create migrations for table renames and data copies

### Phase 3: Data Migration
```sql
-- Key migration: ESSPV → store.Product (flatten through ESSP)
INSERT INTO acted.products (id, exam_session_subject_id, product_product_variation_id, product_code, ...)
SELECT
    esspv.id,
    essp.exam_session_subject_id,  -- Navigate through ESSP to get ESS directly
    esspv.product_product_variation_id,
    esspv.product_code,
    ...
FROM acted_exam_session_subject_product_variations esspv
JOIN acted_exam_session_subject_products essp
    ON esspv.exam_session_subject_product_id = essp.id;
```

### Phase 4: Update Foreign Key References

| File | Current | New |
|------|---------|-----|
| `cart/models.py:4` | `from exam_sessions_subjects_products.models import ExamSessionSubjectProduct` | `from store.models import Product` |
| `cart/models.py:323` | `product = FK(ExamSessionSubjectProduct)` | `product = FK('store.Product')` |
| `cart/models.py:527` | `product = FK(ExamSessionSubjectProduct)` | `product = FK('store.Product')` |

### Phase 5: Update API Layer
- Create `/api/store/` endpoints
- Deprecate `/api/exam-sessions-subjects-products/`

### Phase 6: Remove Legacy Apps
1. Remove `exam_sessions_subjects/`
2. Remove `exam_sessions_subjects_products/`
3. Remove `subjects/`, `exam_sessions/`
4. Remove `products/` entirely

---

## New Model Definitions

### store.Product
```python
class Product(models.Model):
    exam_session_subject = models.ForeignKey(
        'catalog.ExamSessionSubject',
        on_delete=models.CASCADE,
        related_name='products'
    )
    product_product_variation = models.ForeignKey(
        'catalog.ProductProductVariation',
        on_delete=models.CASCADE
    )
    product_code = models.CharField(max_length=64, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."products"'
        unique_together = ('exam_session_subject', 'product_product_variation')
```

### store.Price
```python
class Price(models.Model):
    PRICE_TYPE_CHOICES = [
        ("standard", "Standard"),
        ("retaker", "Retaker"),
        ("reduced", "Reduced Rate"),
        ("additional", "Additional Copy"),
    ]
    product = models.ForeignKey('store.Product', on_delete=models.CASCADE, related_name='prices')
    price_type = models.CharField(max_length=20, choices=PRICE_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, default='GBP')

    class Meta:
        db_table = '"acted"."prices"'
        unique_together = ('product', 'price_type')
```

### store.Bundle
```python
class Bundle(models.Model):
    bundle_template = models.ForeignKey(
        'catalog.ProductBundle',
        on_delete=models.CASCADE,
        related_name='store_bundles'
    )
    exam_session_subject = models.ForeignKey(
        'catalog.ExamSessionSubject',
        on_delete=models.CASCADE,
        related_name='bundles'
    )
    is_active = models.BooleanField(default=True)
    override_name = models.CharField(max_length=255, blank=True, null=True)
    override_description = models.TextField(blank=True, null=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = '"acted"."bundles"'
        unique_together = ['bundle_template', 'exam_session_subject']
```

### store.BundleProduct
```python
class BundleProduct(models.Model):
    bundle = models.ForeignKey(
        'store.Bundle',
        on_delete=models.CASCADE,
        related_name='bundle_products'
    )
    product = models.ForeignKey(
        'store.Product',
        on_delete=models.CASCADE
    )
    default_price_type = models.CharField(max_length=20, default='standard')
    quantity = models.PositiveIntegerField(default=1)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = '"acted"."bundle_products"'
        unique_together = ['bundle', 'product']
```

---

## Migration Order

1. `catalog/0005_add_exam_session_subject.py`
2. `catalog/0006_rename_product_to_product_template.py`
3. `store/0001_initial.py` (create tables)
4. `store/0002_migrate_product_data.py` (ESSPV → Product with ESSP flattening)
5. `store/0003_migrate_price_data.py`
6. `store/0004_migrate_bundle_data.py`
7. `cart/migrations/00XX_update_product_fk.py`
8. Cleanup migrations (drop old tables)

---

## Files to Modify

### High Priority - Models
- `backend/django_Admin3/store/models/product.py` (NEW)
- `backend/django_Admin3/store/models/price.py` (NEW)
- `backend/django_Admin3/store/models/bundle.py` (NEW)
- `backend/django_Admin3/store/models/bundle_product.py` (NEW)
- `backend/django_Admin3/catalog/models/product_template.py` (RENAME)
- `backend/django_Admin3/catalog/models/exam_session_subject.py` (MOVE)
- `backend/django_Admin3/catalog/models/__init__.py`
- `backend/django_Admin3/cart/models.py` (FK updates)

### Medium Priority - Views/Serializers
- `backend/django_Admin3/store/views/` (NEW folder)
- `backend/django_Admin3/store/serializers/` (NEW folder)
- `backend/django_Admin3/store/urls.py` (NEW)
- `backend/django_Admin3/catalog/views/filter_views.py` (MOVE)
- `backend/django_Admin3/catalog/serializers/filter_serializers.py` (MOVE)
- `backend/django_Admin3/cart/views.py`
- `backend/django_Admin3/tutorials/views.py`
- `backend/django_Admin3/marking/views.py`

### Lower Priority - Config/Tests
- `backend/django_Admin3/django_Admin3/settings/base.py` (INSTALLED_APPS)
- `backend/django_Admin3/django_Admin3/urls.py`
- Test files (30+ files)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Cart/Order FK integrity | Preserve IDs during migration, extensive testing |
| ESSP flattening data loss | SQL JOIN preserves all relationships |
| 44+ file import updates | Systematic grep/replace, test coverage |
| Frontend API breaks | Strangler Fig pattern, deprecation period |

---

## Testing Checklist

- [ ] All existing tests pass after migration
- [ ] Cart add/remove products works
- [ ] Checkout flow completes
- [ ] Order history displays correctly
- [ ] Bundle functionality works
- [ ] Admin interface operational
- [ ] Frontend product pages load

---

## Benefits

1. **Clean Architecture**: Clear separation between master data (catalog) and purchasable items (store)
2. **No Redundancy**: Product info derived from single source (ProductProductVariation)
3. **Data Integrity**: Impossible for ESSP.product vs PPV.product mismatch
4. **Simpler Queries**: Fewer joins to get product details
5. **Maintainability**: Fewer apps, clearer structure
