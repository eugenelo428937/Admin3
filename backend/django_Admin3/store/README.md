# Store App

Purchasable items available in the online store for Actuarial Education.

## Overview

The **store** app manages products that customers can purchase, including individual products, pricing tiers, and product bundles. It links master catalog data (exam sessions, subjects, product templates) to purchasable items.

### Architecture: Catalog vs Store

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CATALOG APP                                  │
│  (Master Data - Templates & Definitions)                            │
│                                                                      │
│  ┌──────────────┐   ┌──────────────────┐   ┌────────────────────┐   │
│  │ ExamSession  │   │     Subject      │   │      Product       │   │
│  │  2025-04     │   │       CM2        │   │  (template)        │   │
│  └──────┬───────┘   └────────┬─────────┘   └─────────┬──────────┘   │
│         │                    │                       │              │
│         └────────┬───────────┘                       │              │
│                  ▼                                   │              │
│         ┌────────────────────┐              ┌───────┴──────────┐   │
│         │ ExamSessionSubject │              │ ProductVariation │   │
│         │   CM2 + 2025-04    │              │  (eBook, Print)  │   │
│         └────────┬───────────┘              └───────┬──────────┘   │
│                  │                                  │              │
│                  │         ┌────────────────────────┘              │
│                  │         ▼                                        │
│                  │  ┌──────────────────────┐                       │
│                  │  │ProductProductVariation│                       │
│                  │  │   (template+variant)  │                       │
│                  │  └──────────┬───────────┘                       │
└──────────────────┼─────────────┼────────────────────────────────────┘
                   │             │
                   ▼             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          STORE APP                                   │
│  (Purchasable Items - For Sale)                                     │
│                                                                      │
│         ┌─────────────────────────────────────┐                     │
│         │           store.Product              │                     │
│         │  Links ESS + PPV → purchasable item  │                     │
│         │  product_code: CM2/PCSM01P/2025-04   │                     │
│         └───────────────┬─────────────────────┘                     │
│                         │                                            │
│           ┌─────────────┼─────────────┐                             │
│           ▼             ▼             ▼                             │
│    ┌──────────┐  ┌────────────┐  ┌──────────────┐                   │
│    │  Price   │  │   Bundle   │  │ BundleProduct│                   │
│    │ standard │  │ Study Pack │  │  (member)    │                   │
│    │ retaker  │  └────────────┘  └──────────────┘                   │
│    └──────────┘                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Models

### Product

A purchasable item linking an exam session subject to a product variation.

```python
from store.models import Product

# Get a product by code
product = Product.objects.get(product_code='CM2/PCSM01P/2025-04')

# Access related catalog data
ess = product.exam_session_subject       # catalog.ExamSessionSubject
ppv = product.product_product_variation   # catalog.ProductProductVariation

# Get prices
prices = product.prices.all()
standard_price = product.prices.get(price_type='standard')

# Backward-compatible properties (for existing cart/order code)
template = product.product            # catalog.Product (template)
variation = product.product_variation  # catalog.ProductVariation
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `exam_session_subject` | FK | Link to catalog.ExamSessionSubject |
| `product_product_variation` | FK | Link to catalog.ProductProductVariation |
| `product_code` | CharField | Auto-generated unique product code |
| `is_active` | BooleanField | Whether product is available for purchase |

**Unique Constraint:** `(exam_session_subject, product_product_variation)`

### Price

Pricing tiers for a store product.

```python
from store.models import Product, Price

product = Product.objects.get(product_code='CM2/PCSM01P/2025-04')

# Get specific price type
standard = product.prices.get(price_type='standard')
retaker = product.prices.filter(price_type='retaker').first()

# Create a price
Price.objects.create(
    product=product,
    price_type='standard',
    amount=Decimal('129.99'),
    currency='GBP'
)
```

**Price Types:**

| Type | Description |
|------|-------------|
| `standard` | Regular price |
| `retaker` | Price for returning exam candidates |
| `reduced` | Discounted rate (e.g., student discount) |
| `additional` | Price for additional copies |

**Unique Constraint:** `(product, price_type)` - one price per type per product

### Bundle

A collection of products sold together.

```python
from store.models import Bundle

# Get bundle for an exam session subject
bundle = Bundle.objects.get(
    bundle_template__bundle_name='Complete Study Pack',
    exam_session_subject__exam_session__session_code='2025-04'
)

# Access bundle properties (with override support)
print(bundle.name)         # Returns override_name or template name
print(bundle.description)  # Returns override_description or template description

# Get products in bundle
for bp in bundle.bundle_products.filter(is_active=True):
    print(f"{bp.product.product_code}: {bp.quantity}x")
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `bundle_template` | FK | Link to catalog.ProductBundle |
| `exam_session_subject` | FK | Link to catalog.ExamSessionSubject |
| `is_active` | BooleanField | Whether bundle is available |
| `override_name` | CharField | Optional: override template name |
| `override_description` | TextField | Optional: override template description |
| `display_order` | PositiveIntegerField | Sort order for display |

### BundleProduct

Individual products within a bundle.

```python
from store.models import BundleProduct

# Get all products in a bundle
bundle_products = BundleProduct.objects.filter(
    bundle=bundle,
    is_active=True
).order_by('sort_order')

for bp in bundle_products:
    price = bp.product.prices.get(price_type=bp.default_price_type)
    print(f"{bp.product.product_code}: {bp.quantity}x @ {price.amount}")
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `bundle` | FK | The parent bundle |
| `product` | FK | The store.Product in this bundle |
| `default_price_type` | CharField | Price type for bundle pricing |
| `quantity` | PositiveIntegerField | Quantity in bundle |
| `sort_order` | PositiveIntegerField | Display order |
| `is_active` | BooleanField | Whether active in bundle |

## API Endpoints

Base URL: `/api/store/`

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/products/` | GET | List store products |
| `/products/{id}/` | GET | Retrieve single product |
| `/products/{id}/prices/` | GET | Get prices for a product |
| `/prices/` | GET | List all prices |
| `/prices/{id}/` | GET | Retrieve single price |
| `/bundles/` | GET | List store bundles |
| `/bundles/{id}/` | GET | Retrieve single bundle |
| `/bundles/{id}/products/` | GET | Get products in a bundle |

### Example API Response

```json
{
  "id": 123,
  "product_code": "CM2/PCSM01P/2025-04",
  "is_active": true,
  "exam_session_subject": {
    "id": 45,
    "subject_code": "CM2",
    "exam_session_code": "2025-04"
  },
  "product_product_variation": {
    "id": 67,
    "product_name": "Printed Combined Pack",
    "variation_type": "Printed"
  },
  "prices": [
    {"price_type": "standard", "amount": "129.99", "currency": "GBP"},
    {"price_type": "retaker", "amount": "99.99", "currency": "GBP"}
  ]
}
```

## Product Code Generation

Product codes are auto-generated based on variation type:

| Variation Type | Format | Example |
|---------------|--------|---------|
| eBook | `{subject}/{variation_code}{product_code}/{exam_session}` | `CB1/EBK01/2025-04` |
| Printed | `{subject}/{variation_code}{product_code}/{exam_session}` | `CB1/PC/2025-04` |
| Marking | `{subject}/{variation_code}{product_code}/{exam_session}` | `CM2/M01/2025-04` |
| Tutorial | `{subject}/{prefix}{product_code}{variation_code}/{exam_session}-{id}` | `CB1/TLONCB1_f2f_3/2025-04-472` |

## Database Schema

All tables use the `acted` schema:

- `acted.products` - Store products
- `acted.prices` - Product prices
- `acted.bundles` - Product bundles
- `acted.bundle_products` - Bundle membership

## Testing

```bash
# Run store app tests
cd backend/django_Admin3
python manage.py test store

# Run specific test file
python manage.py test store.tests.test_models
python manage.py test store.tests.test_views

# Run with coverage
python manage.py test store --verbosity=2
```

## Migration History

The store app was created as part of the **Store App Consolidation** project (January 2025).

### Key Migration Details

1. **Data Migration**: Products migrated from `exam_sessions_subjects_products_variations` (ESSPV) to `store.Product`
2. **FK Preservation**: All foreign key IDs preserved for cart/order integrity
3. **Backward Compatibility**: Legacy ESSP app delegates to store with deprecation warnings

### Strangler Fig Pattern

Legacy apps now delegate to store:

```python
# exam_sessions_subjects_products/models.py
from store.models import Product  # Deprecated - use store.Product directly

import warnings
warnings.warn(
    "Import from store.models instead of exam_sessions_subjects_products.models",
    DeprecationWarning,
    stacklevel=2
)
```

## Related Documentation

- [CLAUDE.md](../../../CLAUDE.md) - Project-wide architecture documentation
- [Store Consolidation Spec](../../../specs/20250115-store-app-consolidation/spec.md) - Original specification
- [Data Model](../../../specs/20250115-store-app-consolidation/data-model.md) - Entity relationships
