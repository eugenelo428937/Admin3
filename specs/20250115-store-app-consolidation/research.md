# Research: Store App Consolidation

**Date**: 2025-01-14
**Feature**: [spec.md](spec.md) | [plan.md](plan.md)

## Overview

Research findings for the store app consolidation feature. All technical context items were resolved from existing codebase analysis and design documentation.

---

## R1: Django Migration Strategy for Table Consolidation

### Decision
Use Django's migration framework with `RunPython` operations for data migration, combined with `SeparateDatabaseAndState` for complex schema changes.

### Rationale
- Django migrations provide atomic transactions (rollback on failure)
- `RunPython` allows complex data transformations with Python logic
- `SeparateDatabaseAndState` enables renaming without breaking FK relationships
- Existing codebase uses this pattern successfully (see `catalog/migrations/`)

### Alternatives Considered
1. **Raw SQL migrations**: Rejected - harder to maintain, no Django ORM integration
2. **Manual data scripts**: Rejected - no transaction safety, not part of migration chain
3. **Django-reversion**: Rejected - overkill for this use case

### Implementation Pattern
```python
# Example: Flattening ESSP to store.Product
def migrate_products(apps, schema_editor):
    ESSPV = apps.get_model('exam_sessions_subjects_products', 'ExamSessionSubjectProductVariation')
    StoreProduct = apps.get_model('store', 'Product')

    for esspv in ESSPV.objects.select_related('exam_session_subject_product'):
        StoreProduct.objects.create(
            id=esspv.id,  # Preserve FK
            exam_session_subject_id=esspv.exam_session_subject_product.exam_session_subject_id,
            product_product_variation_id=esspv.product_product_variation_id,
            product_code=esspv.product_code,
            is_active=True,
        )
```

---

## R2: Strangler Fig Pattern for API Compatibility

### Decision
Implement Strangler Fig pattern: new `/api/store/` endpoints alongside existing `/api/exam-sessions-subjects-products/`, with the legacy endpoint delegating to the new implementation.

### Rationale
- Zero downtime migration (frontend continues working)
- Gradual transition with deprecation warnings
- Already used successfully in the codebase (see `002-catalog-api-consolidation` migration)
- Allows frontend team to migrate at their own pace

### Alternatives Considered
1. **Big bang cutover**: Rejected - high risk, requires synchronized frontend/backend deploy
2. **API versioning (v1/v2)**: Rejected - adds permanent complexity for temporary transition
3. **Feature flags**: Rejected - unnecessary for pure backend refactoring

### Implementation Pattern
```python
# Legacy endpoint delegates to new implementation
# exam_sessions_subjects_products/views.py
class LegacyProductViewSet(viewsets.ViewSet):
    """DEPRECATED: Use /api/store/products/ instead."""

    def list(self, request):
        warnings.warn("Legacy endpoint deprecated", DeprecationWarning)
        from store.views import ProductViewSet
        return ProductViewSet.as_view({'get': 'list'})(request)
```

---

## R3: Foreign Key ID Preservation Strategy

### Decision
Preserve primary key IDs during migration by explicitly setting `id` field in the new models.

### Rationale
- Cart and Order tables reference ESSPV by ID
- Preserving IDs eliminates need to update referencing tables in same migration
- Reduces migration complexity and risk
- Existing orders remain valid with no data transformation needed

### Alternatives Considered
1. **New IDs with FK updates**: Rejected - requires updating cart/order tables simultaneously
2. **UUID migration**: Rejected - unnecessary change, adds complexity
3. **Soft mapping table**: Rejected - permanent cruft for temporary problem

### Implementation Pattern
```python
# In migration
StoreProduct.objects.create(
    id=esspv.id,  # Explicitly preserve the ID
    # ... other fields
)
```

### Verification Query
```sql
-- Verify no orphaned references after migration
SELECT ci.id, ci.product_id
FROM cart_items ci
LEFT JOIN acted.products p ON ci.product_id = p.id
WHERE p.id IS NULL;
-- Expected result: 0 rows
```

---

## R4: ExamSessionSubject Model Relocation

### Decision
Move `ExamSessionSubject` model from `exam_sessions_subjects` app to `catalog` app using Django's `CreateModel` + data copy + `DeleteModel` pattern.

### Rationale
- ExamSessionSubject is master data (belongs with catalog)
- Simplifies imports (single catalog import instead of separate app)
- Enables removal of `exam_sessions_subjects` app entirely
- Consistent with the two-app architecture (catalog + store)

### Alternatives Considered
1. **Keep in separate app**: Rejected - contradicts consolidation goal
2. **Database-level table move only**: Rejected - Django model location matters for imports
3. **Proxy model**: Rejected - adds indirection without benefit

### Implementation Pattern
```python
# catalog/models/exam_session_subject.py
class ExamSessionSubject(models.Model):
    exam_session = models.ForeignKey('catalog.ExamSession', on_delete=models.CASCADE)
    subject = models.ForeignKey('catalog.Subject', on_delete=models.CASCADE)
    # ... other fields

    class Meta:
        db_table = '"acted"."catalog_exam_session_subjects"'
```

---

## R5: Filter System Relocation

### Decision
Move filter models (`FilterGroup`, `FilterConfiguration`, `ProductGroupFilter`, `ProductVariationRecommendation`) from `products` app to `catalog` app.

### Rationale
- Filters operate on catalog data (subjects, products, variations)
- Logical cohesion: filter definitions belong with the data they filter
- Enables eventual removal of `products` app
- Reduces cross-app dependencies

### Alternatives Considered
1. **Keep in products app**: Rejected - products app will be mostly empty after migration
2. **Separate filters app**: Rejected - unnecessary fragmentation
3. **Move to store app**: Rejected - filters are catalog-level, not store-level

### Migration Approach
1. Create new models in `catalog/models/filters.py`
2. Data migration to copy filter configuration
3. Update views/serializers to use catalog models
4. Remove old models from products app

---

## R6: Cart Clearing Pre-Migration

### Decision
Clear all shopping carts before migration with advance user notification (per spec clarification).

### Rationale
- Eliminates FK integrity risks during migration
- Simpler than migrating cart items simultaneously
- Cart items are transient (unlike orders)
- User notification is acceptable for planned maintenance

### Alternatives Considered
1. **Migrate cart items**: Rejected - adds complexity for transient data
2. **Soft-delete carts**: Rejected - carts would reference invalid FKs
3. **No action**: Rejected - would cause integrity errors

### Implementation
```python
# Pre-migration management command
class Command(BaseCommand):
    def handle(self, *args, **options):
        # Send notification emails first
        notify_cart_owners()

        # Clear carts
        CartItem.objects.all().delete()
        Cart.objects.all().delete()
```

---

## R7: Inactive Catalog Template Handling

### Decision
Store products referencing inactive catalog templates are hidden from browsing/search (per spec clarification FR-012).

### Rationale
- Maintains data integrity (products not orphaned)
- Prevents users from purchasing unavailable items
- Admin can reactivate templates without recreating products
- Soft-delete pattern consistent with existing codebase

### Implementation Pattern
```python
# store/managers.py
class ActiveProductManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(
            is_active=True,
            product_product_variation__product__is_active=True
        )

# store/models/product.py
class Product(models.Model):
    objects = models.Manager()  # Default manager
    active = ActiveProductManager()  # Filtered manager
```

---

## R8: Bundle Handling for Inactive Products

### Decision
Bundles containing inactive products remain visible but display inactive products as unavailable.

### Rationale
- Matches existing bundle behavior in codebase
- Users can see bundle contents before purchase decision
- Admin can manage product availability independently
- Checkout validation prevents purchasing unavailable items

### Validation Pattern
```python
# store/validators.py
def validate_bundle_availability(bundle):
    inactive = bundle.bundle_products.filter(
        Q(product__is_active=False) |
        Q(product__product_product_variation__product__is_active=False)
    )
    if inactive.exists():
        raise ValidationError(f"Bundle contains unavailable products: {list(inactive)}")
```

---

## R9: Historical Order Data Integrity

### Decision
Historical orders maintain references to original product data via preserved FK IDs.

### Rationale
- Order records are immutable audit trail
- FK ID preservation means no order data changes needed
- Product details at time of purchase are already stored in order items
- Query joins work identically before and after migration

### Verification
```sql
-- Verify historical orders remain intact
SELECT COUNT(*) FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN acted.products p ON oi.product_id = p.id
WHERE o.created_at < '2025-01-14';
-- Should match pre-migration count
```

---

## Summary

| Research Item | Decision | Confidence |
|--------------|----------|------------|
| R1: Migration Strategy | Django RunPython + SeparateDatabaseAndState | High |
| R2: API Compatibility | Strangler Fig pattern | High |
| R3: FK Preservation | Explicit ID preservation | High |
| R4: ESS Relocation | Move to catalog app | High |
| R5: Filter Relocation | Move to catalog app | High |
| R6: Cart Clearing | Pre-migration clear with notification | High |
| R7: Inactive Templates | Hide products from browsing | High |
| R8: Bundle Inactive Products | Display as unavailable | Medium |
| R9: Historical Orders | Preserve via FK IDs | High |

All NEEDS CLARIFICATION items from Technical Context have been resolved.
