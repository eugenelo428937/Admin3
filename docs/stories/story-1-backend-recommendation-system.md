# Story 1: Backend Product Variation Recommendation System

**Epic:** Material Product Card SpeedDial Enhancements
**Type:** Brownfield Addition
**Priority:** High (Foundation Story)
**Dependencies:** None
**Estimated Effort:** 3-4 hours
**Story Points:** 5

---

## User Story

**As a** store administrator,
**I want** to define recommended complementary products for each product variation,
**So that** the frontend can display cross-selling opportunities to customers and increase average order value.

---

## Story Context

### Existing System Integration

- **Integrates with:** `acted_product_productvariation` table, `ProductListSerializer`, exam sessions products search API
- **Technology:** Django 6.0 ORM, Django REST Framework serializers, PostgreSQL
- **Follows pattern:** Junction table foreign key relationships (similar to `ExamSessionSubjectProductVariation`)
- **Touch points:**
  - Database: Foreign keys to existing product variation table
  - API: Nested serialization in existing search endpoint
  - Admin: New admin interface following existing product admin patterns

---

## Acceptance Criteria

### Functional Requirements

**1. Model Creation**

Create `ProductVariationRecommendation` Django model with:
- `id` (auto-increment primary key)
- `product_variation_id` (FK to `acted_product_productvariation`)
- `recommended_product_variation_id` (FK to `acted_product_productvariation`)
- `created_at` and `updated_at` timestamp fields
- Unique constraint on `product_variation_id` (one-to-one relationship)
- Cascade deletion when either variation is deleted

**2. API Extension**

Extend search API to include recommendations:
- Add `recommended_product` field to variation serialization
- Include nested object with: `essp_id`, `esspv_id`, `product_code`, `product_name`, `product_short_name`, `variation_type`, `prices` array
- Use LEFT JOIN to fetch recommendations (null when not exists)
- Field is optional/omitted when no recommendation exists (backward compatible)

**3. Django Admin**

Create admin interface for managing recommendations:
- List view shows source variation → recommended variation
- Filterable by product type and variation type
- Inline editing support
- Validation prevents circular recommendations (A→B, B→A)

### Integration Requirements

4. **Existing search API** continues to work unchanged for products without recommendations
5. **New model follows existing** junction table pattern with foreign key cascade deletion
6. **Integration with serializers** maintains current response structure (additive field only)

### Quality Requirements

7. **Tests cover:**
   - Model creation and unique constraint enforcement
   - API serialization with and without recommendations
   - Cascade deletion behavior
   - Admin validation for circular recommendations

8. **Documentation updated:**
   - API response schema documented with `recommended_product` field
   - Model docstrings explain one-to-one relationship

9. **No regression:** Existing product searches return same data (with optional additional field)

---

## Technical Implementation

### Files to Create

**1. Model File:** `backend/django_Admin3/products/models/product_variation_recommendation.py`

```python
from django.db import models
from django.core.exceptions import ValidationError
from .product_variation import ProductVariation

class ProductVariationRecommendation(models.Model):
    """
    Maps product variations to recommended complementary variations.
    Each variation can have max 1 recommendation (one-to-one relationship).
    """
    product_variation = models.OneToOneField(
        'products.ProductVariation',
        on_delete=models.CASCADE,
        related_name='recommendation',
        help_text="Source product variation"
    )
    recommended_product_variation = models.ForeignKey(
        'products.ProductVariation',
        on_delete=models.CASCADE,
        related_name='recommended_by',
        help_text="Recommended complementary product variation"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'acted_product_productvariation_recommendations'
        verbose_name = 'Product Variation Recommendation'
        verbose_name_plural = 'Product Variation Recommendations'
        indexes = [
            models.Index(fields=['product_variation']),
            models.Index(fields=['recommended_product_variation']),
        ]

    def clean(self):
        # Prevent self-reference
        if self.product_variation_id == self.recommended_product_variation_id:
            raise ValidationError("A variation cannot recommend itself.")

        # Prevent circular recommendations
        if ProductVariationRecommendation.objects.filter(
            product_variation=self.recommended_product_variation,
            recommended_product_variation=self.product_variation
        ).exists():
            raise ValidationError("Circular recommendation detected.")

    def __str__(self):
        return f"{self.product_variation} → {self.recommended_product_variation}"
```

### Files to Modify

**2. Model Init:** `backend/django_Admin3/products/models/__init__.py`

```python
# Add import
from .product_variation_recommendation import ProductVariationRecommendation
```

**3. Create Migration:**

```bash
cd backend/django_Admin3
python manage.py makemigrations products --name add_product_variation_recommendations
python manage.py migrate
```

**4. Django Admin:** `backend/django_Admin3/products/admin.py`

```python
from .models import ProductVariationRecommendation

@admin.register(ProductVariationRecommendation)
class ProductVariationRecommendationAdmin(admin.ModelAdmin):
    list_display = ['id', 'product_variation', 'recommended_product_variation', 'created_at']
    list_filter = ['created_at', 'product_variation__variation_type']
    search_fields = [
        'product_variation__name',
        'recommended_product_variation__name'
    ]
    autocomplete_fields = ['product_variation', 'recommended_product_variation']
```

**5. Serializer Extension:** `backend/django_Admin3/exam_sessions_subjects_products/serializers.py`

Add method to variation serializer:

```python
def get_recommended_product(self, obj):
    """Get recommended product variation if exists."""
    try:
        recommendation = obj.product_product_variation.product_variation.recommendation
        recommended_esspv = ExamSessionSubjectProductVariation.objects.filter(
            product_product_variation__product_variation=recommendation.recommended_product_variation
        ).select_related(
            'exam_session_subject_product__exam_session_subject__subject',
            'exam_session_subject_product__product',
            'product_product_variation__product_variation'
        ).prefetch_related('prices').first()

        if recommended_esspv:
            return {
                'essp_id': recommended_esspv.exam_session_subject_product.id,
                'esspv_id': recommended_esspv.id,
                'product_code': recommended_esspv.exam_session_subject_product.product.code,
                'product_name': recommended_esspv.exam_session_subject_product.product.fullname,
                'product_short_name': recommended_esspv.exam_session_subject_product.product.shortname,
                'variation_type': recommended_esspv.product_product_variation.product_variation.variation_type,
                'prices': PriceSerializer(recommended_esspv.prices.all(), many=True).data
            }
    except ObjectDoesNotExist:
        pass
    return None

# Add field to serializer class
recommended_product = serializers.SerializerMethodField()
```

---

## Testing Requirements

### Model Tests

**File:** `backend/django_Admin3/products/tests/test_product_variation_recommendation.py`

```python
from django.test import TestCase
from django.core.exceptions import ValidationError
from products.models import ProductVariation, ProductVariationRecommendation

class ProductVariationRecommendationTestCase(TestCase):
    def setUp(self):
        self.variation1 = ProductVariation.objects.create(
            variation_type='eBook',
            name='Mock Exam eBook'
        )
        self.variation2 = ProductVariation.objects.create(
            variation_type='Marking',
            name='Mock Exam Marking'
        )

    def test_create_recommendation(self):
        rec = ProductVariationRecommendation.objects.create(
            product_variation=self.variation1,
            recommended_product_variation=self.variation2
        )
        self.assertEqual(rec.product_variation, self.variation1)
        self.assertEqual(rec.recommended_product_variation, self.variation2)

    def test_one_to_one_constraint(self):
        ProductVariationRecommendation.objects.create(
            product_variation=self.variation1,
            recommended_product_variation=self.variation2
        )
        with self.assertRaises(Exception):
            ProductVariationRecommendation.objects.create(
                product_variation=self.variation1,
                recommended_product_variation=self.variation2
            )

    def test_prevent_self_reference(self):
        rec = ProductVariationRecommendation(
            product_variation=self.variation1,
            recommended_product_variation=self.variation1
        )
        with self.assertRaises(ValidationError):
            rec.clean()

    def test_cascade_deletion(self):
        rec = ProductVariationRecommendation.objects.create(
            product_variation=self.variation1,
            recommended_product_variation=self.variation2
        )
        self.variation1.delete()
        self.assertFalse(
            ProductVariationRecommendation.objects.filter(id=rec.id).exists()
        )
```

### API Tests

**File:** `backend/django_Admin3/exam_sessions_subjects_products/tests/test_recommendation_api.py`

```python
from rest_framework.test import APITestCase
from products.models import ProductVariation, ProductVariationRecommendation

class RecommendationAPITestCase(APITestCase):
    def setUp(self):
        # Create test data
        pass

    def test_api_includes_recommendation_when_exists(self):
        response = self.client.get('/api/exam-sessions-subjects-products/search/')
        # Assert recommended_product field exists in response
        pass

    def test_api_works_without_recommendation(self):
        response = self.client.get('/api/exam-sessions-subjects-products/search/')
        # Assert API returns successfully even without recommendations
        pass
```

---

## Risk Mitigation

### Primary Risk
N+1 query problem when fetching recommendations for multiple products

### Mitigation Strategy
- Use `prefetch_related` or `select_related` for recommendation queries
- Add database indexes on foreign key columns
- Monitor query performance with Django Debug Toolbar
- Performance test with 50+ products

### Rollback Plan
- Drop migration: `python manage.py migrate products <previous_migration_number>`
- Revert serializer changes (remove `recommended_product` field)
- No data loss (new table only)

---

## Definition of Done

- ✅ `ProductVariationRecommendation` model created with proper constraints
- ✅ Database migration applied successfully (dev environment)
- ✅ Django admin interface allows CRUD operations
- ✅ API serializer includes `recommended_product` nested object
- ✅ API tests validate response structure with/without recommendations
- ✅ Model tests validate unique constraint and cascade deletion
- ✅ Admin validation prevents circular recommendations
- ✅ Code follows Django/DRF conventions
- ✅ No regression in existing product search

---

## API Response Example

### Before Enhancement
```json
{
  "variations": [
    {
      "id": 1,
      "variation_type": "eBook",
      "name": "Vitalsource eBook",
      "prices": [{"price_type": "standard", "amount": 16}]
    }
  ]
}
```

### After Enhancement
```json
{
  "variations": [
    {
      "id": 1,
      "variation_type": "eBook",
      "name": "Vitalsource eBook",
      "prices": [{"price_type": "standard", "amount": 16}],
      "recommended_product": {
        "essp_id": 2740,
        "esspv_id": 390,
        "product_code": "M1",
        "product_name": "Mock Exam Marking",
        "product_short_name": "Mock Exam Marking",
        "variation_type": "Marking",
        "prices": [{"price_type": "standard", "amount": 73}]
      }
    }
  ]
}
```

---

**Created:** 2025-10-27
**Status:** Ready for Development
**Next Story:** Story 2 - Frontend SpeedDial for Buy Both Feature
