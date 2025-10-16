# Phase 0: Research & Analysis

## Feature Context
Phase 4 - Cart VAT Integration: Integrate Phase 3 composite VAT rules into shopping cart for real-time VAT calculations

## Research Questions & Findings

### 1. Phase 3 Rules Engine Integration

**Question**: How does Phase 3 rules engine execute VAT calculations? What is the entry point and context schema?

**Decision**: Use `RuleEngine.execute('cart_calculate_vat', context)` entry point

**Rationale**:
- Phase 3 created `cart_calculate_vat` entry point specifically for cart integration
- Context schema already defined in `cart_vat_context_schema` (ActedRulesFields model)
- Rules engine returns calculated VAT with region, rate, amount, gross_amount
- Execution creates audit trail automatically in `acted_rule_executions` table

**Alternatives Considered**:
- Custom VAT calculation service: Rejected - Phase 3 already provides complete rule execution
- Direct database VAT lookups: Rejected - doesn't leverage composite rules or audit trail
- Legacy VATCalculationService: Rejected - being replaced by rules engine approach

**Implementation Details**:
```python
# Context schema from Phase 3 (data-model.md lines 264-291)
context = {
    'cart_item': {
        'id': 'item_123',
        'product_type': 'Digital',  # Digital|Printed|FlashCard|PBOR|Tutorial
        'net_amount': Decimal('50.00')
    },
    'user': {
        'id': 'user_456',
        'country_code': 'GB'  # ISO 3166-1 alpha-2
    },
    'vat': {}  # Populated by rules engine
}

result = rule_engine.execute('cart_calculate_vat', context)
# Returns:
# {
#     'vat': {'region': 'UK', 'rate': Decimal('0.20'), 'amount': Decimal('10.00')},
#     'cart_item': {'vat_amount': Decimal('10.00'), 'gross_amount': Decimal('60.00')}
# }
```

---

### 2. Cart Model Extensions for VAT Storage

**Question**: What fields need to be added to Cart and CartItem models to store VAT calculations?

**Decision**: Add VAT fields to CartItem model; use existing Cart.vat_result JSONField

**Rationale**:
- CartItem needs individual VAT tracking per item (different product types = different VAT rules)
- Cart.vat_result already exists (added in Epic 3 Phase 2) for aggregate storage
- Maintains referential integrity with rules engine execution results
- Supports audit trail requirements (FR-021, FR-022)

**Model Changes Required**:
```python
# CartItem additions (backend/django_Admin3/cart/models.py)
class CartItem(models.Model):
    # ... existing fields ...

    # VAT calculation results (Phase 4)
    vat_region = models.CharField(max_length=10, null=True, blank=True)  # UK, IE, EU, SA, ROW
    vat_rate = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)  # 0.2000 for 20%
    vat_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # Calculated VAT
    gross_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # net + VAT
    vat_calculated_at = models.DateTimeField(null=True, blank=True)  # Timestamp of calculation
    vat_rule_version = models.IntegerField(null=True, blank=True)  # Rule version used
```

**Alternatives Considered**:
- Store VAT only in Cart.vat_result: Rejected - loses per-item granularity needed for display (FR-002)
- Create separate VATCalculation model: Rejected - over-engineering, adds complexity
- Use only JSONField for all VAT data: Rejected - makes queries and aggregations difficult

---

### 3. VAT Recalculation Triggers

**Question**: When and how should VAT be recalculated?

**Decision**: Trigger recalculation on cart modifications via Django signals; cache results between modifications

**Rationale**:
- Clarification answer: Recalculate only when cart modified (add/remove/quantity/country change)
- Django signals provide clean, decoupled trigger mechanism
- Caching optimizes performance (FR-020: <50ms per item requirement)
- Avoids unnecessary rule engine calls for read-only cart views

**Implementation Approach**:
```python
# Signals: backend/django_Admin3/cart/signals.py
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver

@receiver(post_save, sender=CartItem)
def recalculate_vat_on_item_save(sender, instance, created, **kwargs):
    """Trigger VAT recalculation when cart item added or quantity changed"""
    if created or 'quantity' in instance.get_dirty_fields():
        instance.cart.calculate_and_save_vat(country_code=instance.cart.user.country_code)

@receiver(post_delete, sender=CartItem)
def recalculate_vat_on_item_delete(sender, instance, **kwargs):
    """Trigger VAT recalculation when cart item removed"""
    instance.cart.calculate_and_save_vat(country_code=instance.cart.user.country_code)
```

**Alternatives Considered**:
- Recalculate on every cart view: Rejected - poor performance, violates FR-020
- Periodic batch recalculation: Rejected - stale data, poor UX
- Client-side calculation: Rejected - insecure, can't enforce server-side rules

---

### 4. API Response Structure for VAT Display

**Question**: What format should cart API responses use to display VAT breakdowns?

**Decision**: Extend existing `/api/cart/` endpoint with nested VAT structure per item and cart totals

**Rationale**:
- Clarification answer: VAT-exclusive display (net price prominent, VAT separate line)
- Frontend needs per-item VAT for display (FR-002, FR-007, FR-008)
- Cart totals needed for summary (FR-003, FR-004)
- Maintains REST best practices with nested resources

**API Response Format**:
```json
{
  "cart": {
    "id": 123,
    "items": [
      {
        "id": 456,
        "product": {...},
        "quantity": 2,
        "item_price": "50.00",
        "net_amount": "100.00",
        "vat": {
          "region": "UK",
          "rate": "0.2000",
          "rate_percent": "20%",
          "amount": "20.00"
        },
        "gross_amount": "120.00"
      }
    ],
    "totals": {
      "total_net_amount": "100.00",
      "total_vat_amount": "20.00",
      "total_gross_amount": "120.00",
      "vat_breakdown": [
        {"region": "UK", "rate": "20%", "amount": "20.00"}
      ]
    },
    "vat_calculated_at": "2025-01-12T10:30:00Z"
  }
}
```

**Alternatives Considered**:
- Separate `/api/cart/vat/` endpoint: Rejected - requires multiple API calls
- VAT-inclusive pricing first: Rejected - contradicts clarification answer
- Flat structure without nesting: Rejected - difficult to parse for display

---

### 5. Error Handling and Retry Strategy

**Question**: How should VAT calculation errors be handled gracefully?

**Decision**: Display error message with "Recalculate VAT" button; fall back to 0% VAT; log errors

**Rationale**:
- Clarification answer: Display error message with retry button (option C)
- FR-014: Handle failures gracefully without blocking cart view
- FR-015: Default to 0% VAT if calculation fails
- FR-016: Log errors for admin review
- FR-017: Notify users with retry capability

**Error Handling Flow**:
```python
try:
    result = rule_engine.execute('cart_calculate_vat', context)
    cart_item.vat_region = result['vat']['region']
    cart_item.vat_rate = result['vat']['rate']
    cart_item.vat_amount = result['cart_item']['vat_amount']
    cart_item.gross_amount = result['cart_item']['gross_amount']
except RuleEngineError as e:
    logger.error(f"VAT calculation failed for cart {cart.id}: {str(e)}")
    # Fallback to 0% VAT
    cart_item.vat_region = 'ROW'
    cart_item.vat_rate = Decimal('0.0000')
    cart_item.vat_amount = Decimal('0.00')
    cart_item.gross_amount = cart_item.net_amount
    # Set error flag for frontend display
    cart.vat_calculation_error = True
    cart.vat_calculation_error_message = str(e)
```

**Frontend Retry Component**:
```jsx
{cart.vat_calculation_error && (
  <Alert severity="error" action={
    <Button onClick={handleRetryVAT}>Recalculate VAT</Button>
  }>
    VAT calculation failed: {cart.vat_calculation_error_message}
  </Alert>
)}
```

**Alternatives Considered**:
- Silent fail only: Rejected - contradicts clarification answer, poor UX
- Block cart/checkout: Rejected - too restrictive, could block legitimate purchases
- Automatic retry without user action: Rejected - could cause infinite loops

---

### 6. Historical VAT Data Retention

**Question**: How to implement 2-year VAT data retention for compliance?

**Decision**: Use existing VATAudit model; implement Django management command for cleanup

**Rationale**:
- Clarification answer: 2 years retention (standard tax audit period)
- VATAudit model already exists from Epic 3 Phase 2
- Management command allows scheduled cleanup via cron/celery
- Maintains audit trail without manual intervention

**Implementation**:
```python
# management/commands/cleanup_vat_audit.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from vat.models import VATAudit

class Command(BaseCommand):
    help = 'Delete VAT audit records older than 2 years'

    def handle(self, *args, **options):
        cutoff_date = timezone.now() - timedelta(days=730)  # 2 years
        deleted_count, _ = VATAudit.objects.filter(
            created_at__lt=cutoff_date
        ).delete()
        self.stdout.write(
            self.style.SUCCESS(f'Deleted {deleted_count} VAT audit records older than 2 years')
        )
```

**Alternatives Considered**:
- Indefinite retention: Rejected - storage cost, not required by spec
- 6 months retention: Rejected - too short for most tax authorities
- 7 years retention: Rejected - over-specification, user selected 2 years

---

### 7. VAT Rate Locking at Order Creation

**Question**: How to lock VAT rates when order is created?

**Decision**: Copy VAT fields from CartItem to ActedOrderItem; timestamp on order creation

**Rationale**:
- Clarification answer: Lock VAT rates at order creation with timestamp
- ActedOrderItem already has vat_amount, vat_rate, net_amount, gross_amount fields
- Order creation process copies cart items to order items
- Timestamp provides audit trail for rate changes

**Order Creation VAT Locking**:
```python
def create_order_from_cart(cart, user):
    order = ActedOrder.objects.create(
        user=user,
        vat_country=user.country_code,
        created_at=timezone.now()  # Lock timestamp
    )

    for cart_item in cart.items.all():
        ActedOrderItem.objects.create(
            order=order,
            product=cart_item.product,
            quantity=cart_item.quantity,
            net_amount=cart_item.item_price * cart_item.quantity,
            vat_amount=cart_item.vat_amount,  # Locked from cart
            vat_rate=cart_item.vat_rate,      # Locked from cart
            gross_amount=cart_item.gross_amount,  # Locked from cart
            metadata={'vat_region': cart_item.vat_region, 'vat_rule_version': cart_item.vat_rule_version}
        )

    return order
```

**Alternatives Considered**:
- Lock at checkout entry: Rejected - clarification specified order creation
- Recalculate until payment: Rejected - could cause price inconsistencies
- Lock at cart last modification: Rejected - doesn't account for time between cart and order

---

## Research Summary

**All Technical Context questions resolved** ✅

**Key Integration Points**:
1. Phase 3 Rules Engine: `cart_calculate_vat` entry point with defined context schema
2. Cart Models: CartItem extended with 6 VAT fields; Cart.vat_result reused for aggregate
3. API Structure: Nested VAT breakdown in cart response with per-item and total calculations
4. Error Handling: Graceful fallback to 0% VAT with user-facing retry button
5. Data Retention: VATAudit cleanup via management command (2 years)
6. Order Locking: VAT fields copied from CartItem to ActedOrderItem at order creation

**No remaining NEEDS CLARIFICATION** - ready for Phase 1 design
