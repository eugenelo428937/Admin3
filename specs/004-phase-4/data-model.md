# Phase 1: Data Model Design

## Overview
Phase 4 extends existing Django models to store VAT calculations performed by Phase 3 rules engine. No new models created - extends Cart, CartItem, and uses existing VATAudit model.

## Entity Modifications

### 1. CartItem Model Extensions

**File**: `backend/django_Admin3/cart/models.py`

**Purpose**: Store per-item VAT calculation results from rules engine

**New Fields**:

| Field Name | Type | Constraints | Purpose |
|------------|------|-------------|---------|
| `vat_region` | CharField(10) | null=True, blank=True | Regional VAT classification (UK, IE, EU, SA, ROW) |
| `vat_rate` | DecimalField(5,4) | null=True, blank=True | VAT rate applied (e.g., 0.2000 for 20%) |
| `vat_amount` | DecimalField(10,2) | null=True, blank=True | Calculated VAT amount |
| `gross_amount` | DecimalField(10,2) | null=True, blank=True | Total including VAT (net + VAT) |
| `vat_calculated_at` | DateTimeField | null=True, blank=True | Timestamp of last calculation |
| `vat_rule_version` | IntegerField | null=True, blank=True | Version of rule that calculated VAT |

**Validation Rules**:
- `vat_rate` must be between 0.0000 and 1.0000
- `vat_amount` must be >= 0
- `gross_amount` must equal `item_price * quantity + vat_amount`
- `vat_region` must be one of: UK, IE, EU, SA, ROW (or null)

**Relationships**:
- Existing relationship to Cart via `cart` ForeignKey
- Existing relationship to ExamSessionSubjectProduct via `product` ForeignKey
- New implicit relationship to Phase 3 rules via `vat_rule_version`

**Migration Notes**:
```python
# Generated migration
class Migration(migrations.Migration):
    dependencies = [
        ('cart', 'XXXX_previous_migration'),
    ]

    operations = [
        migrations.AddField(
            model_name='cartitem',
            name='vat_region',
            field=models.CharField(max_length=10, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='cartitem',
            name='vat_rate',
            field=models.DecimalField(decimal_places=4, max_digits=5, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='cartitem',
            name='vat_amount',
            field=models.DecimalField(decimal_places=2, max_digits=10, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='cartitem',
            name='gross_amount',
            field=models.DecimalField(decimal_places=2, max_digits=10, null=True, blank=True),
        ),
        migrations.AddField(
            model_name='cartitem',
            name='vat_calculated_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='cartitem',
            name='vat_rule_version',
            field=models.IntegerField(null=True, blank=True),
        ),
        migrations.AddIndex(
            model_name='cartitem',
            index=models.Index(fields=['vat_region'], name='idx_cartitem_vat_region'),
        ),
    ]
```

---

### 2. Cart Model Extensions

**File**: `backend/django_Admin3/cart/models.py`

**Purpose**: Store aggregate VAT calculation results and error state

**Existing Field Reused**:
- `vat_result` (JSONField) - Already exists from Epic 3 Phase 2, will store aggregate VAT totals

**New Fields**:

| Field Name | Type | Constraints | Purpose |
|------------|------|-------------|---------|
| `vat_calculation_error` | BooleanField | default=False | Indicates if last VAT calculation failed |
| `vat_calculation_error_message` | TextField | null=True, blank=True | Error message for frontend display |
| `vat_last_calculated_at` | DateTimeField | null=True, blank=True | Timestamp of last successful calculation |

**`vat_result` JSON Structure**:
```json
{
  "total_net_amount": "100.00",
  "total_vat_amount": "20.00",
  "total_gross_amount": "120.00",
  "vat_breakdown": [
    {
      "region": "UK",
      "rate": "0.2000",
      "rate_percent": "20%",
      "amount": "20.00",
      "item_count": 3
    }
  ],
  "calculated_at": "2025-01-12T10:30:00Z",
  "rule_executions": [
    {
      "rule_code": "calculate_vat_uk_digital_product",
      "version": 1,
      "item_id": 456
    }
  ]
}
```

**New Method**:
```python
def calculate_vat_for_all_items(self, country_code):
    """
    Calculate VAT for all cart items using Phase 3 rules engine.

    Args:
        country_code (str): ISO 3166-1 alpha-2 country code

    Returns:
        dict: Aggregate VAT calculation results

    Raises:
        RuleEngineError: If rule execution fails
    """
```

---

### 3. VATAudit Model (No Changes)

**File**: `backend/django_Admin3/vat/models.py`

**Purpose**: Provides audit trail for VAT calculations (already exists)

**Usage in Phase 4**:
- Automatically populated by rules engine during `cart_calculate_vat` execution
- Links to Cart via `cart` ForeignKey
- Stores full context and output for compliance (FR-021, FR-022)
- Queried for 2-year retention cleanup (FR-023)

**No schema changes required** - existing model meets all Phase 4 requirements

---

## State Transitions

### Cart Item VAT Calculation Lifecycle

```
┌─────────────────┐
│   Item Added    │
│  (no VAT data)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Trigger VAT    │─────▶│  Rules Engine    │
│  Calculation    │      │  Execution       │
└────────┬────────┘      │  cart_calculate_ │
         │               │  vat entry point │
         │               └────────┬─────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌──────────────────┐
│  VAT Fields     │◀─────│  Calculation     │
│  Populated      │      │  Success         │
│  - vat_region   │      └──────────────────┘
│  - vat_rate     │               │
│  - vat_amount   │               │ (error)
│  - gross_amount │               ▼
└────────┬────────┘      ┌──────────────────┐
         │               │  Fallback to 0%  │
         │               │  + Error Flag    │
         │               └────────┬─────────┘
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌──────────────────┐
│  Item in Cart   │      │  Error State     │
│  with VAT       │      │  User notified   │
└─────────────────┘      └──────────────────┘
         │                        │
         │ (modification)         │ (retry)
         │                        │
         └────────┬───────────────┘
                  ▼
         ┌─────────────────┐
         │  Recalculate    │
         │  VAT            │
         └─────────────────┘
```

**State Invariants**:
1. If `vat_amount` is set, `vat_rate`, `vat_region`, `gross_amount` must also be set
2. If `vat_calculation_error = True`, cart may have 0% VAT fallback values
3. `vat_calculated_at` must be <= `updated_at` for CartItem

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │ Cart Page  │  │ Add to Cart  │  │ Error Alert +     │   │
│  │ Component  │  │ Button       │  │ Retry Button      │   │
│  └─────┬──────┘  └──────┬───────┘  └────────┬──────────┘   │
└────────┼─────────────────┼──────────────────┼──────────────┘
         │                 │                   │
         │ GET /api/cart/  │ POST /api/cart/  │ POST /api/cart/vat/recalculate/
         │                 │ items/            │
         ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API (Django REST)                       │
│  ┌──────────────────┐  ┌──────────────────────────────┐    │
│  │ CartViewSet      │  │ CartItemViewSet             │     │
│  │ - list()         │  │ - create()                  │     │
│  │ - retrieve()     │  │ - update()                  │     │
│  │                  │  │ - destroy()                 │     │
│  └─────────┬────────┘  └──────────┬───────────────────┘    │
│            │                       │                         │
│            ▼                       ▼                         │
│  ┌──────────────────────────────────────────────────┐      │
│  │           Cart Signals (signals.py)              │      │
│  │  - post_save(CartItem) → recalculate_vat()      │      │
│  │  - post_delete(CartItem) → recalculate_vat()    │      │
│  └─────────────────────┬────────────────────────────┘      │
│                        │                                     │
│                        ▼                                     │
│  ┌──────────────────────────────────────────────────┐      │
│  │   Cart.calculate_vat_for_all_items()             │      │
│  │   - Build context for each cart item             │      │
│  │   - Call rules engine per item                   │      │
│  │   - Aggregate results                            │      │
│  │   - Update Cart.vat_result                       │      │
│  └─────────────────────┬────────────────────────────┘      │
└────────────────────────┼─────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          Rules Engine (Phase 3)                              │
│  ┌────────────────────────────────────────────────┐         │
│  │  RuleEngine.execute('cart_calculate_vat', ctx) │         │
│  │  - Master rule: lookup_region(country_code)    │         │
│  │  - Regional rule: lookup_vat_rate(country)     │         │
│  │  - Product rule: calculate_vat_amount()        │         │
│  └─────────────────────┬──────────────────────────┘         │
│                        │                                     │
│                        ▼                                     │
│  ┌──────────────────────────────────────────────────┐      │
│  │         ActedRuleExecution Record Created        │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│             Database (PostgreSQL)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  CartItem    │  │  Cart        │  │  VATAudit    │     │
│  │  - vat_rate  │  │  - vat_result│  │  (via Rule   │     │
│  │  - vat_amount│  │              │  │   Execution) │     │
│  │  - gross_amt │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Validation Rules Summary

### CartItem VAT Fields

**Database Constraints**:
```python
class Meta:
    constraints = [
        # Existing constraints...
        models.CheckConstraint(
            check=models.Q(vat_rate__gte=0) & models.Q(vat_rate__lte=1),
            name='cartitem_vat_rate_valid_range'
        ),
        models.CheckConstraint(
            check=models.Q(vat_amount__gte=0),
            name='cartitem_vat_amount_non_negative'
        ),
        models.CheckConstraint(
            check=models.Q(gross_amount__gte=0),
            name='cartitem_gross_amount_non_negative'
        ),
    ]
```

**Application-Level Validations**:
1. **VAT Region**: Must be one of UK, IE, EU, SA, ROW (enum validation)
2. **VAT Rate Precision**: Must have exactly 4 decimal places (e.g., 0.2000)
3. **Calculation Consistency**: `gross_amount` must equal `net_amount + vat_amount` within 0.01 tolerance
4. **Timestamp Ordering**: `vat_calculated_at` must be >= `added_at` and <= `cart.updated_at`

---

## Migration Strategy

### Phase 4 Migration Plan

**Migration 1**: Add VAT fields to CartItem
```bash
python manage.py makemigrations cart --name add_vat_fields_to_cartitem
```

**Migration 2**: Add error tracking fields to Cart
```bash
python manage.py makemigrations cart --name add_vat_error_tracking_to_cart
```

**Data Migration**: Backfill existing cart items with 0% VAT (ROW region)
```python
def backfill_existing_carts(apps, schema_editor):
    CartItem = apps.get_model('cart', 'CartItem')
    for item in CartItem.objects.filter(vat_region__isnull=True):
        item.vat_region = 'ROW'
        item.vat_rate = Decimal('0.0000')
        item.vat_amount = Decimal('0.00')
        item.gross_amount = item.item_price * item.quantity
        item.save(update_fields=['vat_region', 'vat_rate', 'vat_amount', 'gross_amount'])
```

**Rollback Plan**:
- Fields are nullable, so rollback is safe
- No data loss on migration reversal
- Frontend can handle missing VAT data gracefully

---

## Index Strategy

**New Indexes**:
```python
class Meta:
    indexes = [
        # Existing indexes...
        models.Index(fields=['vat_region'], name='idx_cartitem_vat_region'),
        models.Index(fields=['vat_calculated_at'], name='idx_cartitem_vat_calc_at'),
        models.Index(fields=['cart', 'vat_region'], name='idx_cartitem_cart_vat'),
    ]
```

**Rationale**:
- `vat_region` index: Support reporting/analytics by region
- `vat_calculated_at` index: Support cache invalidation queries
- Composite `cart + vat_region`: Support cart totals aggregation by region

**Query Patterns Supported**:
```sql
-- Aggregate VAT by region for a cart
SELECT vat_region, SUM(vat_amount)
FROM acted_cart_items
WHERE cart_id = 123
GROUP BY vat_region;

-- Find stale calculations (> 1 hour old)
SELECT * FROM acted_cart_items
WHERE vat_calculated_at < NOW() - INTERVAL '1 hour';
```

---

## Data Model Summary

**Modified Entities**: 2 (Cart, CartItem)
**New Entities**: 0
**Total New Fields**: 9
**New Indexes**: 3
**New Constraints**: 3
**Migration Files**: 3 (2 schema + 1 data)

**Compliance Mapping**:
- FR-021 (store VAT amounts): CartItem.vat_amount, Cart.vat_result
- FR-022 (preserve metadata): CartItem.vat_region, vat_rule_version, Cart.vat_result
- FR-023 (2-year retention): VATAudit cleanup via management command

**Ready for Contract Generation** ✅
