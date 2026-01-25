# Cart → Cart + Orders Refactoring Plan

**Branch**: `20260123-cart-orders-refactoring` | **Date**: 2026-01-23 | **Spec**: [spec.md](spec.md)

## Overview

Refactor the monolithic `cart` app into two focused Django apps following Domain-Driven Design with a Service Layer pattern (Option B). No backward compatibility required.

**Current State**: Single `cart` app (700+ line view, 10 database tables, mixed concerns)
**Target State**: Two apps — `cart` (ephemeral shopping state) + `orders` (persistent business records)

## Technical Context

**Language/Version**: Python 3.14, Django 6.0 + Django REST Framework
**Primary Dependencies**: DRF, Rules Engine (`rules_engine` app), Opayo Payment Gateway, Email System
**Storage**: PostgreSQL (existing `acted` schema — no migrations)
**Testing**: Django `APITestCase`, `TestCase`; Frontend: Jest + React Testing Library
**Target Platform**: Web (Django API + React SPA)
**Project Type**: Web application (backend + frontend)
**Performance Goals**: Cart ops < 1s, VAT calc < 500ms, Checkout < 10s (from SC-001/002/003)
**Constraints**: No schema changes, no backward compatibility, existing rules engine unchanged
**Scale/Scope**: ~10 tables, ~1430 lines deleted, ~1040 lines added, 8 frontend API calls updated

## Constitution Check

*GATE: Passed. No violations.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. TDD (NON-NEGOTIABLE) | ✅ PASS | Step 1 writes integration tests first; each service developed test-first |
| II. Modular Architecture | ✅ PASS | Two focused apps, service layer, strategy pattern |
| III. Security First | ✅ PASS | JWT auth preserved, audit trail maintained, no secrets in code |
| IV. Performance Optimization | ✅ PASS | Performance targets in success criteria, select_related patterns |
| V. Code Quality & Conventions | ✅ PASS | snake_case, DRF patterns, clean model names, conventional commits |

## Project Structure

### Documentation (this feature)

```text
specs/20260123-cart-orders-refactoring/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: architectural decisions
├── data-model.md        # Phase 1: entity definitions
├── quickstart.md        # Phase 1: implementation guide
├── contracts/           # Phase 1: API contracts
│   ├── cart-api.yaml    # Cart REST API (OpenAPI 3.0)
│   └── orders-api.yaml  # Orders REST API (OpenAPI 3.0)
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
backend/django_Admin3/
├── apps/
│   ├── cart/                    # Refactored cart app (ephemeral state)
│   │   ├── models/             # Cart, CartItem, CartFee
│   │   ├── services/
│   │   │   └── cart_service.py # CartService facade (~200 lines)
│   │   ├── serializers/        # Cart serializers
│   │   ├── views.py            # Slim CartViewSet (~60 lines)
│   │   ├── urls.py             # RESTful cart endpoints
│   │   └── tests/              # Cart-specific tests
│   └── orders/                  # New orders app (persistent records)
│       ├── models/             # Order, OrderItem, Payment, etc.
│       ├── services/
│       │   ├── checkout_orchestrator.py  # Pipeline pattern (~150 lines)
│       │   ├── order_builder.py          # Builder pattern (~60 lines)
│       │   ├── payment_gateway.py        # Strategy pattern (~150 lines)
│       │   └── order_notification.py     # Email notifications (~30 lines)
│       ├── serializers/        # Order serializers
│       ├── views.py            # CheckoutView + OrderViewSet (~80 lines)
│       ├── urls.py             # RESTful order endpoints
│       └── tests/              # Order-specific tests
└── ...

frontend/react-Admin3/src/
├── services/
│   └── cartService.js          # Updated API calls (8 endpoints changed)
└── contexts/
    └── CartContext.js           # Updated to use new endpoints
```

**Structure Decision**: Web application (Option 2) — existing Django backend + React frontend structure preserved. New `orders` app added alongside refactored `cart` app.

---

## Architecture Decision: VAT Calculation Consolidation

### Problem: Three Redundant VAT Implementations

The codebase has **three overlapping** VAT calculation paths (total ~780 lines):

| # | Location | Method | Calls | Phase |
|---|----------|--------|-------|-------|
| 1 | `Cart` model (line 62) | `calculate_vat(country_code)` | `VATCalculationService` directly (bypasses rules) | Phase 2 |
| 2 | `Cart` model (line 144) | `calculate_vat_for_all_items(country_code)` | `rule_engine.execute()` per item | Phase 4 |
| 3 | `VATOrchestrator` service (566 lines) | `execute_vat_calculation(cart)` | `rule_engine.execute()` per item | Phase 5 |

Each phase added a new implementation without removing the previous one.

### Decision: Replace All Three With `CartService.calculate_vat()`

**Delete** (780 lines):
- `Cart.calculate_vat()` — bypasses rules engine, redundant
- `Cart.calculate_and_save_vat()` — wrapper around #1, redundant
- `Cart.get_vat_calculation()` — trivial getter, move to serializer
- `Cart.calculate_vat_for_all_items()` — superseded by VATOrchestrator
- `VATOrchestrator` class — replaced by CartService method

**Keep** (unchanged):
- `VATCalculationService` (utils/services/) — still used by rules engine's `FUNCTION_REGISTRY`
- `FUNCTION_REGISTRY` functions — `lookup_region`, `lookup_vat_rate`, `calculate_vat_amount`
- Rules engine `cart_calculate_vat` entry point and database rules

**Add** (~60 lines):
- `CartService.calculate_vat(cart)` — thin coordinator method

### Why CartService.calculate_vat() Cannot Be Merged Into Rules Engine

The rules engine is a **generic** condition→action evaluator. These cart-domain concerns don't belong in it:

| Concern | Why Cart-Domain |
|---------|----------------|
| User country resolution | Queries `UserProfileAddress.filter(address_type='HOME')` → `Country` model |
| Product type detection | Reads `CartItem.metadata['variationType']` or variation chain |
| Per-item iteration | Rules engine expects singular `cart_item`, not array |
| Aggregation | Sum per-item VAT into cart totals with ROUND_HALF_UP |
| JSONB storage | Write to `cart.vat_result` field |
| CartItem field updates | Set `vat_region`, `vat_rate`, `vat_amount`, `gross_amount` |

### Responsibility Split

```
CartService.calculate_vat()     = WHAT to calculate (which items, which user, store where)
Rules Engine                    = HOW to calculate (which rules, what rate, what region)
VATCalculationService           = THE MATH (rate × net = vat, net + vat = gross)
```

See `docs/architecture/vat-calculation-architecture.md` for full details.

---

## Target App Structure

### Cart App (`apps/cart/`)

```
apps/cart/
├── __init__.py
├── models/
│   ├── __init__.py          # Exports: Cart, CartItem, CartFee
│   ├── cart.py              # Cart aggregate root
│   ├── cart_item.py         # CartItem entity
│   └── cart_fee.py          # CartFee value object
├── services/
│   ├── __init__.py          # Exports: cart_service
│   └── cart_service.py      # CartService facade (all cart operations + VAT)
├── serializers/
│   ├── __init__.py          # Exports: CartSerializer, CartItemSerializer, CartFeeSerializer
│   ├── cart_serializer.py
│   ├── cart_item_serializer.py
│   └── cart_fee_serializer.py
├── views.py                 # CartViewSet (CRUD + VAT only)
├── urls.py                  # RESTful cart endpoints
├── signals.py               # VAT cache invalidation
├── admin.py                 # Cart admin registrations
├── apps.py
└── tests/
    ├── __init__.py
    ├── test_models.py
    ├── test_cart_service.py
    ├── test_views.py
    └── test_signals.py
```

### Orders App (`apps/orders/`)

```
apps/orders/
├── __init__.py
├── models/
│   ├── __init__.py          # Exports: Order, OrderItem, Payment, etc.
│   ├── order.py             # Order aggregate root
│   ├── order_item.py        # OrderItem entity
│   ├── payment.py           # Payment entity (Opayo + Invoice + Dummy)
│   ├── acknowledgment.py   # OrderAcknowledgment value object
│   ├── preference.py        # OrderPreference value object
│   ├── contact.py           # OrderContact value object
│   └── delivery.py          # OrderDelivery value object
├── services/
│   ├── __init__.py          # Exports: checkout_orchestrator, payment_gateway
│   ├── checkout_orchestrator.py  # Pipeline: cart → order conversion
│   ├── order_builder.py          # Builder pattern: constructs Order from Cart
│   ├── payment_gateway.py        # Strategy pattern: pluggable payment providers
│   └── order_notification.py     # Email notifications
├── serializers/
│   ├── __init__.py
│   ├── order_serializer.py
│   └── order_item_serializer.py
├── views.py                 # CheckoutView + OrderViewSet
├── urls.py                  # RESTful order endpoints
├── admin.py                 # Order admin registrations
├── apps.py
└── tests/
    ├── __init__.py
    ├── test_models.py
    ├── test_checkout_orchestrator.py
    ├── test_order_builder.py
    ├── test_payment_gateway.py
    └── test_views.py
```

---

## Design Patterns

### 1. CartService (Facade Pattern)

Single interface for all cart operations. Replaces scattered helper methods in the current ViewSet.

```python
class CartService:
    """Facade for all cart operations."""

    def get_or_create(self, user=None, session_key=None) -> Cart:
        """Get existing cart or create new one."""

    def add_item(self, cart, product, quantity=1, price_type='standard',
                 actual_price=None, metadata=None) -> CartItem:
        """Add product to cart. Handles tutorial merging, variation dedup."""

    def add_marking_voucher(self, cart, voucher_id, quantity=1) -> CartItem:
        """Add marking voucher to cart."""

    def update_item(self, cart, item_id, **kwargs) -> CartItem:
        """Update cart item fields (quantity, metadata, price_type, actual_price)."""

    def remove_item(self, cart, item_id) -> None:
        """Remove item from cart."""

    def clear(self, cart) -> None:
        """Remove all items from cart."""

    def merge_guest_cart(self, user_cart, guest_session_key) -> Cart:
        """Merge guest cart items into authenticated user's cart."""

    def calculate_vat(self, cart) -> dict:
        """
        Calculate VAT via rules engine. Thin coordinator (~60 lines).
        Replaces: VATOrchestrator (566 lines) + Cart model methods (215 lines).

        Flow: resolve country → iterate items → call rules engine per item → aggregate → store
        """
        user_context = self._resolve_user_country(cart)

        items_results = []
        for cart_item in cart.items.all():
            context = {
                'user': user_context,
                'cart_item': {
                    'id': str(cart_item.id),
                    'product_type': self._get_product_type(cart_item),
                    'product_code': self._get_product_code(cart_item),
                    'net_amount': float((cart_item.actual_price or 0) * cart_item.quantity),
                }
            }
            result = rule_engine.execute('cart_calculate_vat', context)
            items_results.append(result)

        aggregated = self._aggregate_vat(items_results)
        self._store_vat_result(cart, aggregated)
        return aggregated

    # Private helpers
    def _resolve_user_country(self, cart) -> dict: ...   # ~15 lines: profile → address → country
    def _get_product_type(self, cart_item) -> str: ...   # ~20 lines: metadata → variation chain
    def _get_product_code(self, cart_item) -> str: ...   # ~5 lines: product.product.code
    def _aggregate_vat(self, results) -> dict: ...       # ~20 lines: sum totals, build items list
    def _store_vat_result(self, cart, data) -> None: ... # ~5 lines: cart.vat_result = data; save
    def _update_cart_flags(self, cart) -> None: ...
    def _handle_tutorial_merge(self, cart, product, metadata, ...) -> CartItem: ...
```

### 2. CheckoutOrchestrator (Pipeline Pattern)

Replaces the 300+ line checkout method with a step-by-step pipeline.

```python
class CheckoutOrchestrator:
    """Coordinates the multi-step checkout process."""

    def __init__(self, cart, user, request_data, request):
        self.cart = cart
        self.user = user
        self.request_data = request_data
        self.request = request
        self.order = None
        self.payment_result = None

    def execute(self) -> dict:
        """Execute the full checkout pipeline. Returns order + payment info."""
        self._validate_payment_data()
        self._validate_blocking_rules()
        vat_result = self._calculate_vat()
        self.order = self._build_order(vat_result)
        self._save_acknowledgments()
        self._save_preferences()
        self._save_contact_delivery()
        self.payment_result = self._process_payment()
        self._send_notifications()
        self._clear_cart()
        return self._build_response()

    def _validate_payment_data(self) -> None:
        """Validate payment method + required data. Raises ValidationError."""

    def _validate_blocking_rules(self) -> None:
        """Execute checkout_payment rules. Raises CheckoutBlockedError if blocked."""

    def _calculate_vat(self) -> dict:
        """Calculate VAT outside transaction (prevents broken transactions)."""

    def _build_order(self, vat_result) -> Order:
        """Use OrderBuilder to create order from cart + VAT data."""

    def _save_acknowledgments(self) -> None:
        """Transfer session acknowledgments + create T&C records."""

    def _save_preferences(self) -> None:
        """Save user preferences from rules engine."""

    def _save_contact_delivery(self) -> None:
        """Extract and save contact + delivery info."""

    def _process_payment(self) -> dict:
        """Process payment via PaymentGateway strategy."""

    def _send_notifications(self) -> None:
        """Send order confirmation email."""

    def _clear_cart(self) -> None:
        """Clear cart items after successful checkout."""

    def _build_response(self) -> dict:
        """Build final API response."""
```

### 3. OrderBuilder (Builder Pattern)

Clean construction of Order from Cart + VAT data.

```python
class OrderBuilder:
    """Builds an Order from a Cart with calculated VAT."""

    def __init__(self, cart, user, vat_result):
        self.cart = cart
        self.user = user
        self.vat_result = vat_result

    def build(self) -> Order:
        """Build complete order within a transaction."""
        with transaction.atomic():
            order = self._create_order()
            self._transfer_items(order)
            self._transfer_fees(order)
            return order

    def _create_order(self) -> Order:
        """Create order with VAT totals."""

    def _transfer_items(self, order) -> None:
        """Convert CartItems → OrderItems with per-item VAT."""

    def _transfer_fees(self, order) -> None:
        """Convert CartFees → OrderItems (fee type)."""
```

### 4. PaymentGateway (Strategy Pattern)

Pluggable payment processing. Replaces the current if/else + settings-based service selection.

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass

@dataclass
class PaymentResult:
    success: bool
    payment_id: int | None = None
    transaction_id: str | None = None
    message: str = ''
    error_code: str | None = None
    redirect_url: str | None = None

class PaymentGateway(ABC):
    """Abstract payment gateway interface."""

    @abstractmethod
    def process(self, order, payment_data, client_ip, user_agent) -> PaymentResult:
        """Process payment for order."""

class OpayoGateway(PaymentGateway):
    """Opayo (Elavon) hosted payment gateway."""
    def process(self, order, payment_data, client_ip, user_agent) -> PaymentResult: ...

class InvoiceGateway(PaymentGateway):
    """Invoice-based payment (no immediate charge)."""
    def process(self, order, payment_data, client_ip, user_agent) -> PaymentResult: ...

class DummyGateway(PaymentGateway):
    """Development/testing gateway."""
    def process(self, order, payment_data, client_ip, user_agent) -> PaymentResult: ...

def get_payment_gateway(method: str) -> PaymentGateway:
    """Factory: returns appropriate gateway based on payment method + settings."""
    if getattr(settings, 'USE_DUMMY_PAYMENT_GATEWAY', False):
        return DummyGateway()
    if method == 'invoice':
        return InvoiceGateway()
    return OpayoGateway()
```

---

## API Endpoints (RESTful)

### Cart Endpoints (`/api/cart/`)

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/cart/` | Get current cart with items, fees, VAT |
| POST | `/api/cart/items/` | Add item to cart |
| PATCH | `/api/cart/items/{id}/` | Update cart item |
| DELETE | `/api/cart/items/{id}/` | Remove cart item |
| DELETE | `/api/cart/items/` | Clear all items |
| POST | `/api/cart/vat/` | Force VAT recalculation |

### Order Endpoints (`/api/orders/`)

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/api/orders/checkout/` | Create order from cart (authenticated) |
| GET | `/api/orders/` | List user's order history (authenticated) |
| GET | `/api/orders/{id}/` | Get order detail (authenticated) |
| POST | `/api/orders/{id}/test-email/` | Send test order email (authenticated) |

---

## Database Tables (No Schema Changes)

All tables remain in the `acted` schema with existing names. Only the Django model location changes:

| Table | Current App | New App | Model Name |
|-------|-------------|---------|------------|
| `acted_carts` | cart | **cart** | Cart |
| `acted_cart_items` | cart | **cart** | CartItem |
| `acted_cart_fees` | cart | **cart** | CartFee |
| `acted_orders` | cart | **orders** | Order |
| `acted_order_items` | cart | **orders** | OrderItem |
| `acted_order_payments` | cart | **orders** | Payment |
| `acted_order_user_acknowledgments` | cart | **orders** | OrderAcknowledgment |
| `acted_order_user_preferences` | cart | **orders** | OrderPreference |
| `acted_order_user_contact` | cart | **orders** | OrderContact |
| `acted_order_delivery_detail` | cart | **orders** | OrderDelivery |

**Note**: Model class names simplified (e.g., `ActedOrder` → `Order`, `ActedOrderItem` → `OrderItem`). The `db_table` meta keeps the database table name unchanged.

---

## Migration Strategy

### Phase 1: Create New Apps (No Breaking Changes)

1. Create `apps/cart_new/` and `apps/orders/` app directories
2. Write all new models pointing to existing `acted_*` tables via `Meta.db_table`
3. Write services, serializers, views
4. Write tests for new structure
5. Register new URL patterns alongside old ones (temporarily)

### Phase 2: Swap (Clean Cut)

1. Remove old `cart` app from `INSTALLED_APPS`
2. Rename `cart_new` → `cart`
3. Add `cart` and `orders` to `INSTALLED_APPS`
4. Update all imports across the project
5. Update frontend API calls to new endpoints
6. Remove old `cart/` directory

### Phase 3: Cleanup

1. Delete old test files
2. Update CLAUDE.md documentation
3. Run full test suite
4. Verify admin interface works

---

## Detailed File-by-File Migration Plan

### Step 1: Create Orders App

#### `apps/orders/__init__.py`
```python
default_app_config = 'apps.orders.apps.OrdersConfig'
```

#### `apps/orders/apps.py`
```python
from django.apps import AppConfig

class OrdersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'orders'
    verbose_name = 'Orders'
```

#### `apps/orders/models/order.py`
- Move `ActedOrder` → `Order`
- Keep `db_table = 'acted_orders'`
- Remove `Acted` prefix from class name
- Add `managed = False` during transition (or generate empty migration)

#### `apps/orders/models/order_item.py`
- Move `ActedOrderItem` → `OrderItem`
- Keep `db_table = 'acted_order_items'`
- FK to `Order` (same app), FK to `store.Product` (cross-app)

#### `apps/orders/models/payment.py`
- Move `ActedOrderPayment` → `Payment`
- Keep `db_table = 'acted_order_payments'`

#### `apps/orders/models/acknowledgment.py`
- Move `OrderUserAcknowledgment` → `OrderAcknowledgment`
- Keep `db_table = 'acted_order_user_acknowledgments'`

#### `apps/orders/models/preference.py`
- Move `OrderUserPreference` → `OrderPreference`
- Keep `db_table = 'acted_order_user_preferences'`

#### `apps/orders/models/contact.py`
- Move `OrderUserContact` → `OrderContact`
- Keep `db_table = 'acted_order_user_contact'`

#### `apps/orders/models/delivery.py`
- Move `OrderDeliveryDetail` → `OrderDelivery`
- Keep `db_table = 'acted_order_delivery_detail'`

#### `apps/orders/services/checkout_orchestrator.py`
- Extract checkout logic from `CartViewSet.checkout()`
- Split into pipeline steps (see design above)

#### `apps/orders/services/order_builder.py`
- Extract order creation + item transfer logic
- Clean Builder pattern implementation

#### `apps/orders/services/payment_gateway.py`
- Move from `cart/services/payment_service.py`
- Refactor into Strategy pattern (ABC + concrete implementations)
- Move `OpayoPaymentService` → `OpayoGateway`
- Move `DummyPaymentService` → `DummyGateway`
- Add `InvoiceGateway` (extracted from `process_invoice_payment`)

#### `apps/orders/services/order_notification.py`
- Extract email sending logic from checkout
- Uses `email_system.services.email_service`

#### `apps/orders/views.py`
- `CheckoutView`: POST endpoint, delegates to `CheckoutOrchestrator`
- `OrderViewSet`: GET list/detail for order history

#### `apps/orders/serializers/order_serializer.py`
- Move `ActedOrderSerializer` → `OrderSerializer`
- Move `ActedOrderItemSerializer` → `OrderItemSerializer`

#### `apps/orders/urls.py`
```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CheckoutView, OrderViewSet

router = DefaultRouter()
router.register(r'', OrderViewSet, basename='orders')

urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('', include(router.urls)),
]
```

#### `apps/orders/admin.py`
- Move order-related admin classes from `cart/admin.py`

---

### Step 2: Refactor Cart App

#### `apps/cart/models/cart.py`
- Keep `Cart` model as-is
- Remove VAT calculation methods from model (move to CartService)
- Keep `db_table = 'acted_carts'`

#### `apps/cart/models/cart_item.py`
- Keep `CartItem` model as-is
- Keep `db_table = 'acted_cart_items'`

#### `apps/cart/models/cart_fee.py`
- Keep `CartFee` model as-is
- Keep `db_table = 'acted_cart_fees'`

#### `apps/cart/services/cart_service.py`
- Consolidate all cart logic from:
  - `CartViewSet` helper methods (`_is_marking_product`, `_update_cart_flags`, etc.)
  - `VATOrchestrator` (context building + rules engine calls + aggregation)
  - `CartService` from `payment_service.py` (marking voucher operations)
- Single `CartService` class with clean public interface

#### `apps/cart/views.py`
- Slim `CartViewSet` that delegates to `CartService`
- ~50 lines instead of current 700+
- RESTful action methods: `list`, `create_item`, `update_item`, `destroy_item`, `clear`, `recalculate_vat`

#### `apps/cart/serializers/cart_serializer.py`
- Move existing `CartSerializer`
- Remove order-related serializer imports

#### `apps/cart/serializers/cart_item_serializer.py`
- Move existing `CartItemSerializer`

#### `apps/cart/signals.py`
- Keep VAT cache invalidation signals (unchanged)

#### `apps/cart/urls.py`
```python
from django.urls import path
from .views import CartViewSet

urlpatterns = [
    path('', CartViewSet.as_view({'get': 'list'}), name='cart-detail'),
    path('items/', CartViewSet.as_view({'post': 'create_item', 'delete': 'clear'}), name='cart-items'),
    path('items/<int:pk>/', CartViewSet.as_view({'patch': 'update_item', 'delete': 'destroy_item'}), name='cart-item-detail'),
    path('vat/', CartViewSet.as_view({'post': 'recalculate_vat'}), name='cart-vat'),
]
```

---

### Step 3: Delete Old Files

| File/Method to Delete | Lines | Reason |
|-----------------------|-------|--------|
| `cart/services/vat_orchestrator.py` | 566 | Replaced by CartService.calculate_vat() (~60 lines) |
| `cart/services/payment_service.py` | 338 | Moved to orders/services/payment_gateway.py |
| `Cart.calculate_vat()` | 40 | Bypasses rules engine, redundant |
| `Cart.calculate_and_save_vat()` | 25 | Wrapper around above, redundant |
| `Cart.get_vat_calculation()` | 10 | Trivial getter, moved to serializer |
| `Cart.calculate_vat_for_all_items()` | 150 | Superseded by VATOrchestrator (now CartService) |
| `cart/tests/test_vat_orchestrator.py` | ~200 | Replaced by test_cart_service.py |
| `cart/tests/test_cart_vat_methods.py` | ~100 | Tests for deleted model methods |
| **Total deleted** | **~1430** | |

---

### Step 4: Update Imports Across Project

Files that import from the old `cart` app:

| File | Current Import | New Import |
|------|---------------|------------|
| `cart/views.py` (old checkout) | `from .models import ActedOrder, ...` | Removed (checkout in orders app) |
| `rules_engine/services/*` | `from cart.models import Cart` | `from cart.models import Cart` (unchanged) |
| Frontend API calls | `POST /api/cart/checkout/` | `POST /api/orders/checkout/` |
| Frontend API calls | `GET /api/cart/orders/` | `GET /api/orders/` |
| Frontend API calls | `POST /api/cart/add/` | `POST /api/cart/items/` |
| Frontend API calls | `PATCH /api/cart/update_item/` | `PATCH /api/cart/items/{id}/` |
| Frontend API calls | `DELETE /api/cart/remove/` | `DELETE /api/cart/items/{id}/` |
| Frontend API calls | `POST /api/cart/clear/` | `DELETE /api/cart/items/` |
| Frontend API calls | `POST /api/cart/vat/recalculate/` | `POST /api/cart/vat/` |

---

### Step 5: Update Project Configuration

#### `settings.py` (INSTALLED_APPS)
```python
INSTALLED_APPS = [
    ...
    'cart',          # Shopping cart (replaces old monolithic cart)
    'orders',        # Order processing, payments, fulfillment
    ...
]
```

#### Root `urls.py`
```python
urlpatterns = [
    ...
    path('api/cart/', include('cart.urls')),
    path('api/orders/', include('orders.urls')),
    ...
]
```

---

## Frontend API Changes

### Axios Service Updates

| Current | New | Notes |
|---------|-----|-------|
| `axios.get('/api/cart/')` | `axios.get('/api/cart/')` | Unchanged |
| `axios.post('/api/cart/add/', data)` | `axios.post('/api/cart/items/', data)` | RESTful |
| `axios.patch('/api/cart/update_item/', data)` | `axios.patch(\`/api/cart/items/${id}/\`, data)` | Item ID in URL |
| `axios.delete('/api/cart/remove/', {data})` | `axios.delete(\`/api/cart/items/${id}/\`)` | Item ID in URL |
| `axios.post('/api/cart/clear/')` | `axios.delete('/api/cart/items/')` | DELETE collection |
| `axios.post('/api/cart/vat/recalculate/')` | `axios.post('/api/cart/vat/')` | Simplified |
| `axios.post('/api/cart/checkout/', data)` | `axios.post('/api/orders/checkout/', data)` | New app |
| `axios.get('/api/cart/orders/')` | `axios.get('/api/orders/')` | New app |

---

## Benefits Summary

| Metric | Before | After |
|--------|--------|-------|
| Cart views.py | 700+ lines | ~60 lines |
| Largest method | checkout (~300 lines) | CheckoutOrchestrator steps (~30 lines each) |
| Services | 2 (VATOrchestrator + PaymentService) | 4 focused services |
| Models per file | 1 monolithic models.py | 1 model per file |
| Testability | Hard (tightly coupled) | Easy (each service independently testable) |
| Adding payment provider | Modify PaymentService class | Add new Gateway class |
| Understanding checkout | Read 300-line method | Read pipeline steps |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Django migration conflicts | Use `managed = False` + empty migrations pointing to existing tables |
| Frontend breakage | Update all Axios calls in single commit |
| Cross-app circular imports | Cart knows nothing about Orders; Orders imports from Cart |
| Missing edge cases in checkout | Write integration tests before refactoring |

---

## Implementation Order

1. **Write integration tests** for current checkout flow (safety net)
2. **Create `orders` app** with models pointing to existing tables
3. **Write OrderBuilder** + tests
4. **Write PaymentGateway** + tests
5. **Write CheckoutOrchestrator** + tests
6. **Create orders views/urls** and verify checkout works
7. **Refactor `cart` app** — extract CartService, slim views
8. **Delete VATOrchestrator** — absorb into CartService
9. **Update frontend** API calls
10. **Delete old cart files** + update INSTALLED_APPS
11. **Full regression test** (backend + frontend)
