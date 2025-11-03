# Data Model - Recommended Products for Marking Product Card

**Date**: 2025-10-28
**Status**: Complete

## Overview

This feature **does not introduce new data models**. It uses the existing `ProductVariationRecommendation` model and extends frontend component state to handle recommendations.

---

## Existing Data Models (No Changes)

### ProductVariationRecommendation (Backend)

**Location**: `backend/django_Admin3/products/models/product_variation_recommendation.py`
**Table**: `acted_product_productvariation_recommendations`
**Status**: ✅ Already exists, already populated with data

**Purpose**: Defines one-to-one relationships between product-variation combinations and their recommended complementary products.

**Schema**:
```python
class ProductVariationRecommendation(models.Model):
    product_product_variation = models.OneToOneField(
        'products.ProductProductVariation',
        on_delete=models.CASCADE,
        related_name='recommendation',
        help_text="Source product-variation combination"
    )

    recommended_product_product_variation = models.ForeignKey(
        'products.ProductProductVariation',
        on_delete=models.CASCADE,
        related_name='recommended_by',
        help_text="Recommended complementary product-variation"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**Business Rules** (enforced in `clean()` method):
1. A product-variation cannot recommend itself (no self-reference)
2. Circular recommendations are not allowed (A→B prevents B→A)

**Indexes**:
- `product_product_variation` (unique, for fast lookups)
- `recommended_product_product_variation` (non-unique, for reverse lookups)

**Example Data**:
```
Source: Mock Exam eBook (ProductProductVariation ID: 1001)
  → Recommends: Mock Exam Marking Service (ProductProductVariation ID: 2002)

Source: CB1 Materials Printed (ProductProductVariation ID: 1003)
  → Recommends: CB1 Mock Exam Marking (ProductProductVariation ID: 2003)
```

---

## API Response Structure (No Changes)

### Product API Endpoint

**Endpoint**: `/api/products/` (exact endpoint from existing implementation)
**Serializer**: Already includes `recommended_product` field on variations
**Status**: ✅ No backend changes required

**Response Format** (inferred from MaterialProductCard usage):
```json
{
  "id": 123,
  "product_id": 1001,
  "product_code": "MARK-CB1",
  "product_name": "CB1 Mock Exam Marking Service",
  "subject_code": "CB1",
  "type": "Marking",
  "variations": [
    {
      "id": 1,
      "variation_type": "Standard",
      "name": "Standard Marking",
      "prices": [
        {
          "id": 10,
          "price_type": "standard",
          "amount": "45.00",
          "currency": "GBP"
        },
        {
          "id": 11,
          "price_type": "retaker",
          "amount": "35.00",
          "currency": "GBP"
        }
      ],
      "recommended_product": {
        "essp_id": 202,
        "esspv_id": 2002,
        "product_code": "MAT-CB1-EBOOK",
        "product_name": "CB1 Mock Exam Materials",
        "product_short_name": "Mock Exam eBook",
        "variation_type": "eBook",
        "prices": [
          {
            "id": 20,
            "price_type": "standard",
            "amount": "16.00",
            "currency": "GBP"
          }
        ]
      }
    }
  ]
}
```

**Note**: The `recommended_product` field is **nullable**. When no recommendation exists, it is `null`.

---

## Frontend Component State (New)

### MarkingProductCard Component State

**File**: `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.js`

**New State Variables**:
```javascript
const [speedDialOpen, setSpeedDialOpen] = useState(false);
```

**Purpose**: Control SpeedDial open/close state for recommendation UI.

**Existing State (Preserved)**:
```javascript
const [deadlines, setDeadlines] = useState([]);
const [loading, setLoading] = useState(true);
const [showModal, setShowModal] = useState(false);
const [showPriceModal, setShowPriceModal] = useState(false);
const [selectedVariations, setSelectedVariations] = useState([]);
const [selectedPriceType, setSelectedPriceType] = useState("");
const [showExpiredWarning, setShowExpiredWarning] = useState(false);
const [isHovered, setIsHovered] = useState(false);
```

**State Interactions**:
- `speedDialOpen`: Independent of other state (no coupling)
- `selectedVariations`: Used to determine `currentVariation` which provides `recommended_product`
- `allExpired`: Used to disable SpeedDial actions when all deadlines expired
- `selectedPriceType`: Applies only to marking product, NOT to recommended product

---

## Data Flow

### 1. Component Mount
```
MarkingProductCard receives `product` prop
  ↓
product.variations[0].recommended_product checked
  ↓
If non-null → Render SpeedDial (Tier 2)
If null → Render standard button (Tier 3)
```

### 2. User Interaction
```
User clicks SpeedDial FAB
  ↓
setSpeedDialOpen(true)
  ↓
SpeedDial actions appear:
  - "Buy Marking Only" (standard price + any discount)
  - "Buy with Recommended" (marking + recommended product at standard prices)
```

### 3. Purchase Action
```
User selects "Buy with Recommended"
  ↓
handleAddToCart() called
  ↓
Two cart items created:
  1. Marking product (with user's selected price type: standard/retaker/additional)
  2. Recommended product (always "standard" price type)
  ↓
Both added to cart via onAddToCart() callback (2 calls)
  ↓
SpeedDial closes (setSpeedDialOpen(false))
```

---

## Validation Rules

### Frontend Validation

**Recommendation Display**:
- ✅ Show SpeedDial ONLY if `currentVariation?.recommended_product` exists
- ✅ Validate `recommended_product.prices` array is non-empty
- ✅ Validate `recommended_product.prices` includes "standard" price type

**Disabled State**:
- ✅ Disable SpeedDial when `allExpired === true`
- ✅ Disable SpeedDial when `hasVariations && !singleVariation && selectedVariations.length === 0`

**Price Type Selection**:
- ✅ Marking product: Use user-selected price type (`selectedPriceType` or fallback to "standard")
- ✅ Recommended product: Always use "standard" price type (no discounts)

### Backend Validation (Existing)

**Database Constraints**:
- ✅ One-to-one relationship on source product-variation (enforced by `OneToOneField`)
- ✅ No self-reference (enforced by `ProductVariationRecommendation.clean()`)
- ✅ No circular recommendations (enforced by `ProductVariationRecommendation.clean()`)

---

## State Transitions

### SpeedDial State Machine

```
CLOSED (initial state)
  ↓ [user clicks FAB]
OPEN
  ↓ [user clicks action OR clicks away]
CLOSED

CLOSED
  ↓ [allExpired = true]
DISABLED (SpeedDial visible but non-interactive)
```

### Recommendation Availability

```
NO RECOMMENDATION (recommended_product = null)
  ↓
Render: Standard "Add to Cart" button (Tier 3)

HAS RECOMMENDATION (recommended_product != null)
  ↓
Check: Deadlines
  ↓
  ├─→ All Expired: SpeedDial DISABLED
  └─→ Some/None Expired: SpeedDial ENABLED
```

---

## Data Dependencies

### Component Props
```javascript
MarkingProductCard({
  product,           // Required: Full product object with variations
  onAddToCart,       // Required: Callback for cart operations
  allEsspIds,        // Optional: For deadline bulk loading
  bulkDeadlines      // Optional: Pre-loaded deadline data
})
```

### External Context
```javascript
const { cartData } = useCart();  // For VAT region (existing usage)
```

### Computed Values
```javascript
const currentVariation = useMemo(() => {
  // Existing logic - determines which variation to display
  // Returns variation object or null
}, [product.variations, selectedVariations]);

const allExpired = deadlines.length > 0 && expired.length === deadlines.length;
```

---

## No Schema Migrations Required

✅ **Backend**: No database changes
✅ **API**: No endpoint changes
✅ **Models**: No new models
✅ **Serializers**: No serializer changes

**Scope**: Frontend-only implementation using existing data structures.

---

## Testing Data Requirements

### Mock Product Structure (for Tests)

**File**: `MarkingProductCard.recommendations.test.js` (new file)

**Mock Data Pattern** (from MaterialProductCard.recommendations.test.js):
```javascript
const createMockMarkingProduct = (overrides = {}) => ({
  id: 1,
  product_id: 1001,
  product_code: 'MARK001',
  product_name: 'Mock Exam Marking Service',
  subject_code: 'CB1',
  type: 'Marking',
  variations: [
    {
      id: 1,
      variation_type: 'Standard',
      name: 'Standard Marking',
      prices: [
        { price_type: 'standard', amount: '45.00' },
        { price_type: 'retaker', amount: '35.00' },
      ],
      recommended_product: null,  // Override in tests that need recommendations
    },
  ],
  ...overrides,
});

const createRecommendedProduct = () => ({
  essp_id: 202,
  esspv_id: 2002,
  product_code: 'MAT001',
  product_name: 'Mock Exam eBook',
  product_short_name: 'Mock Exam eBook',
  variation_type: 'eBook',
  prices: [
    { price_type: 'standard', amount: '16.00' },
  ],
});
```

---

## Summary

**Data Changes**: NONE
**Backend Work**: NONE
**Frontend Work**: Component state + UI rendering only
**Risk**: LOW (reusing existing data structures and patterns)

**Phase 1 Data Model**: ✅ Complete
