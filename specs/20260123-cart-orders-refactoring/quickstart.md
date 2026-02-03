# Quickstart: Cart and Orders Domain Separation

**Created**: 2026-01-23
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Data Model**: [data-model.md](data-model.md)

---

## Prerequisites

- Python 3.14 with virtual environment active
- Django 6.0 development server running on port 8888
- React frontend running on port 3000
- PostgreSQL database accessible (ACTEDDBDEV01)
- Existing `cart` app functional (current monolithic state)

---

## Implementation Order (TDD)

Follow this sequence strictly. Each step produces a working, testable increment.

### Step 1: Integration Tests (Safety Net)

Write integration tests for the **current** checkout flow before any refactoring:

```bash
cd backend/django_Admin3
python manage.py test cart.tests.test_integration_checkout -v2
```

**What to test**:
- Add items → checkout → verify order created
- Card payment success path
- Invoice payment path
- Terms acceptance blocking
- VAT calculation during checkout
- Cart cleared after successful checkout

**Why first**: These tests ensure no regression during refactoring. They test the current behavior, which must be preserved.

---

### Step 2: Create Orders App

```bash
cd backend/django_Admin3
mkdir -p apps/orders/{models,services,serializers,tests}
touch apps/orders/__init__.py apps/orders/apps.py apps/orders/admin.py
touch apps/orders/views.py apps/orders/urls.py
touch apps/orders/models/__init__.py
touch apps/orders/services/__init__.py
touch apps/orders/serializers/__init__.py
touch apps/orders/tests/__init__.py
```

**TDD sequence for each model**:

1. Write test: `test_order_model_points_to_existing_table`
2. Create model with `Meta.db_table = 'acted_orders'`
3. Verify test passes
4. Repeat for OrderItem, Payment, OrderAcknowledgment, etc.

**Key model pattern**:
```python
class Order(models.Model):
    # ... fields ...
    class Meta:
        db_table = 'acted_orders'
        managed = False  # No migrations during transition
```

---

### Step 3: OrderBuilder + Tests

**RED**: Write failing test
```python
class TestOrderBuilder(TestCase):
    def test_build_creates_order_with_totals(self):
        builder = OrderBuilder(cart=self.cart, user=self.user, vat_result=self.vat_data)
        order = builder.build()
        self.assertEqual(order.subtotal, Decimal('100.00'))
        self.assertEqual(order.vat_amount, Decimal('20.00'))
        self.assertEqual(order.total_amount, Decimal('120.00'))
```

**GREEN**: Implement OrderBuilder
```python
# apps/orders/services/order_builder.py
class OrderBuilder:
    def build(self) -> Order:
        with transaction.atomic():
            order = self._create_order()
            self._transfer_items(order)
            self._transfer_fees(order)
            return order
```

---

### Step 4: PaymentGateway + Tests

**RED**: Write failing test
```python
class TestPaymentGateway(TestCase):
    def test_dummy_gateway_approves_valid_card(self):
        gateway = DummyGateway()
        result = gateway.process(self.order, self.valid_card_data, '127.0.0.1', 'test')
        self.assertTrue(result.success)

    def test_dummy_gateway_declines_0002_card(self):
        gateway = DummyGateway()
        result = gateway.process(self.order, self.decline_card_data, '127.0.0.1', 'test')
        self.assertFalse(result.success)
```

**GREEN**: Implement Strategy pattern
```python
# apps/orders/services/payment_gateway.py
class PaymentGateway(ABC):
    @abstractmethod
    def process(self, order, payment_data, client_ip, user_agent) -> PaymentResult: ...
```

---

### Step 5: CheckoutOrchestrator + Tests

**RED**: Write failing test for the full pipeline
```python
class TestCheckoutOrchestrator(TestCase):
    def test_successful_card_checkout(self):
        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=self.card_data, request=self.request
        )
        result = orchestrator.execute()
        self.assertIn('order', result)
        self.assertEqual(result['order'].total_amount, Decimal('120.00'))
```

**GREEN**: Implement pipeline steps one at a time

---

### Step 6: Orders Views/URLs

Wire up the new endpoints:

```python
# apps/orders/urls.py
urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('', include(router.urls)),
]

# Root urls.py addition:
path('api/orders/', include('orders.urls')),
```

Run integration tests to verify checkout works through new endpoint.

---

### Step 7: Refactor Cart App

**CartService** replaces scattered ViewSet helpers:

```python
# apps/cart/services/cart_service.py
class CartService:
    def add_item(self, cart, product, quantity=1, ...): ...
    def update_item(self, cart, item_id, **kwargs): ...
    def remove_item(self, cart, item_id): ...
    def clear(self, cart): ...
    def calculate_vat(self, cart): ...
```

Slim down `CartViewSet` to ~60 lines (delegate everything to CartService).

---

### Step 8: Delete VATOrchestrator

Replace with `CartService.calculate_vat()` (~60 lines).

**Verify**: Run all VAT-related tests. The CartService method should pass all existing VATOrchestrator tests.

---

### Step 9: Update Frontend

Update `cartService.js` API calls:

| Old | New |
|-----|-----|
| `POST /api/cart/add/` | `POST /api/cart/items/` |
| `PATCH /api/cart/update_item/` | `PATCH /api/cart/items/${id}/` |
| `DELETE /api/cart/remove/` | `DELETE /api/cart/items/${id}/` |
| `POST /api/cart/clear/` | `DELETE /api/cart/items/` |
| `POST /api/cart/checkout/` | `POST /api/orders/checkout/` |
| `GET /api/cart/orders/` | `GET /api/orders/` |

---

### Step 10: Delete Old Files

Remove superseded code:
- `cart/services/vat_orchestrator.py` (566 lines)
- `cart/services/payment_service.py` (338 lines)
- Cart model VAT methods (calculate_vat, calculate_and_save_vat, etc.)
- Old test files for deleted code

---

### Step 11: Full Regression

```bash
# Backend
cd backend/django_Admin3
python manage.py test -v2

# Frontend
cd frontend/react-Admin3
npm test -- --watchAll=false
```

---

## Key Files Reference

| New File | Purpose | Lines (est.) |
|----------|---------|-------------|
| `apps/orders/models/order.py` | Order model | ~30 |
| `apps/orders/models/order_item.py` | OrderItem model | ~50 |
| `apps/orders/models/payment.py` | Payment model | ~60 |
| `apps/orders/models/acknowledgment.py` | OrderAcknowledgment | ~80 |
| `apps/orders/models/preference.py` | OrderPreference | ~70 |
| `apps/orders/models/contact.py` | OrderContact | ~30 |
| `apps/orders/models/delivery.py` | OrderDelivery | ~40 |
| `apps/orders/services/checkout_orchestrator.py` | Checkout pipeline | ~150 |
| `apps/orders/services/order_builder.py` | Order construction | ~60 |
| `apps/orders/services/payment_gateway.py` | Payment strategy | ~150 |
| `apps/orders/services/order_notification.py` | Email sending | ~30 |
| `apps/orders/views.py` | CheckoutView + OrderViewSet | ~80 |
| `apps/cart/services/cart_service.py` | CartService facade | ~200 |
| `apps/cart/views.py` (refactored) | Slim ViewSet | ~60 |

**Net result**: ~1430 lines deleted, ~1040 lines added = ~390 line reduction + massive complexity reduction.

---

## Validation Checklist

After each step, verify:

- [ ] All existing tests still pass
- [ ] New tests cover the implemented code (≥80% coverage)
- [ ] No circular imports between cart and orders
- [ ] Database unchanged (no migrations generated)
- [ ] API contracts match implementation
- [ ] Constitution principles maintained (TDD, modular, secure)
