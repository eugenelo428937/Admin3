# Tasks: Cart and Orders Domain Separation

**Input**: Design documents from `/specs/20260123-cart-orders-refactoring/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per TDD requirement (CLAUDE.md Constitution Principle I: NON-NEGOTIABLE).

**Organization**: Tasks grouped by user story. Execution order reflects dependency chain: US5 → US2 → US1 → US4, with US3 independent.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1–US5) this task belongs to
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/django_Admin3/`
- **Frontend**: `frontend/react-Admin3/src/`
- **App root (cart)**: `backend/django_Admin3/cart/`
- **App root (orders)**: `backend/django_Admin3/orders/`

---

## Phase 1: Setup (App Structure)

**Purpose**: Create the orders app directory structure and configuration

- [ ] T001 Create orders app directory structure: `backend/django_Admin3/orders/` with subdirectories `models/`, `services/`, `serializers/`, `tests/`
- [ ] T002 [P] Create orders app configuration in `backend/django_Admin3/orders/apps.py` (OrdersConfig with name='orders')
- [ ] T003 [P] Create `backend/django_Admin3/orders/__init__.py` with default_app_config

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Integration tests (safety net) and order models that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

### Integration Tests (Safety Net)

- [ ] T004 Write integration test for add-to-cart flow in `backend/django_Admin3/cart/tests/test_integration_checkout.py` — test add product, add marking voucher, add tutorial product with metadata
- [ ] T005 [P] Write integration test for full checkout (card payment) in `backend/django_Admin3/cart/tests/test_integration_checkout.py` — test cart → order creation → payment → cart cleared
- [ ] T006 [P] Write integration test for checkout (invoice payment) in `backend/django_Admin3/cart/tests/test_integration_checkout.py` — test invoice flow with pending payment status
- [ ] T007 [P] Write integration test for checkout blocking rules in `backend/django_Admin3/cart/tests/test_integration_checkout.py` — test terms acceptance required, checkout blocked without it
- [ ] T008 [P] Write integration test for VAT calculation during checkout in `backend/django_Admin3/cart/tests/test_integration_checkout.py` — test VAT applied to order items
- [ ] T009 [P] Write integration test for guest cart merge in `backend/django_Admin3/cart/tests/test_integration_checkout.py` — test guest session items merge into user cart on login

### Order Models (Shared Foundation)

- [ ] T010 Create Order model in `backend/django_Admin3/orders/models/order.py` with db_table='acted_orders', managed=False
- [ ] T011 [P] Create OrderItem model in `backend/django_Admin3/orders/models/order_item.py` with db_table='acted_order_items', managed=False
- [ ] T012 [P] Create OrderAcknowledgment model in `backend/django_Admin3/orders/models/acknowledgment.py` with db_table='acted_order_user_acknowledgments', managed=False
- [ ] T013 [P] Create OrderPreference model in `backend/django_Admin3/orders/models/preference.py` with db_table='acted_order_user_preferences', managed=False
- [ ] T014 [P] Create OrderContact model in `backend/django_Admin3/orders/models/contact.py` with db_table='acted_order_user_contact', managed=False
- [ ] T015 [P] Create OrderDelivery model in `backend/django_Admin3/orders/models/delivery.py` with db_table='acted_order_delivery_detail', managed=False
- [ ] T016 Create `backend/django_Admin3/orders/models/__init__.py` exporting all models (Order, OrderItem, OrderAcknowledgment, OrderPreference, OrderContact, OrderDelivery)
- [ ] T017 Write model unit tests in `backend/django_Admin3/orders/tests/test_models.py` — verify all models point to correct existing tables and fields are accessible

**Checkpoint**: Foundation ready — all order models accessible, integration tests provide safety net

---

## Phase 3: User Story 5 - Payment Processing (Priority: P2, Dependency of US2)

**Goal**: Pluggable payment processing via Strategy pattern (card, invoice, dummy)

**Independent Test**: Process card payments (success + failure) and invoice payments independently

**Why before US2**: CheckoutOrchestrator depends on PaymentGateway to process payments

### Tests for User Story 5

- [ ] T018 [P] [US5] Write PaymentGateway unit tests in `backend/django_Admin3/orders/tests/test_payment_gateway.py` — test DummyGateway approve/decline, InvoiceGateway always pending, OpayoGateway mock calls
- [ ] T019 [P] [US5] Write Payment model test in `backend/django_Admin3/orders/tests/test_models.py` — verify Payment model with db_table='acted_order_payments', status transitions, is_successful property

### Implementation for User Story 5

- [ ] T020 [US5] Create Payment model in `backend/django_Admin3/orders/models/payment.py` with db_table='acted_order_payments', managed=False, all status choices and Opayo fields
- [ ] T021 [US5] Update `backend/django_Admin3/orders/models/__init__.py` to export Payment model
- [ ] T022 [US5] Implement PaymentGateway ABC + PaymentResult dataclass in `backend/django_Admin3/orders/services/payment_gateway.py` — abstract process() method, success/error result
- [ ] T023 [P] [US5] Implement DummyGateway in `backend/django_Admin3/orders/services/payment_gateway.py` — card ending '0002' declines, all others approve
- [ ] T024 [P] [US5] Implement InvoiceGateway in `backend/django_Admin3/orders/services/payment_gateway.py` — always creates pending payment record
- [ ] T025 [US5] Implement OpayoGateway in `backend/django_Admin3/orders/services/payment_gateway.py` — extract from current cart/services/payment_service.py OpayoPaymentService
- [ ] T026 [US5] Implement get_payment_gateway() factory function in `backend/django_Admin3/orders/services/payment_gateway.py` — USE_DUMMY_PAYMENT_GATEWAY setting, method-based selection
- [ ] T027 [US5] Run US5 tests and verify all pass: `python manage.py test orders.tests.test_payment_gateway`

**Checkpoint**: PaymentGateway strategy pattern functional — DummyGateway for dev, OpayoGateway for production, InvoiceGateway for corporate

---

## Phase 4: User Story 2 - Checkout and Order Creation (Priority: P1)

**Goal**: Convert cart to persistent order through CheckoutOrchestrator pipeline

**Independent Test**: Complete checkout with card/invoice, verify order created, payment processed, cart cleared

**Dependencies**: Phase 2 (order models), Phase 3 (PaymentGateway)

### Tests for User Story 2

- [ ] T028 [P] [US2] Write OrderBuilder unit tests in `backend/django_Admin3/orders/tests/test_order_builder.py` — test order creation with totals, item transfer, fee transfer, atomic transaction
- [ ] T029 [P] [US2] Write CheckoutOrchestrator unit tests in `backend/django_Admin3/orders/tests/test_checkout_orchestrator.py` — test full pipeline: validation → VAT → build → payment → notify → clear
- [ ] T030 [P] [US2] Write CheckoutView API tests in `backend/django_Admin3/orders/tests/test_views.py` — test POST /api/orders/checkout/ with card data, invoice data, missing fields, blocked rules

### Implementation for User Story 2

- [ ] T031 [US2] Implement OrderBuilder in `backend/django_Admin3/orders/services/order_builder.py` — build() within transaction.atomic(), _create_order(), _transfer_items(), _transfer_fees()
- [ ] T032 [US2] Implement order_notification service in `backend/django_Admin3/orders/services/order_notification.py` — send_order_confirmation() using email_system.services
- [ ] T033 [US2] Implement CheckoutOrchestrator in `backend/django_Admin3/orders/services/checkout_orchestrator.py` — pipeline: validate → blocking rules → VAT → build → acks → prefs → contact → payment → notify → clear
- [ ] T034 [US2] Create OrderSerializer and OrderItemSerializer in `backend/django_Admin3/orders/serializers/order_serializer.py`
- [ ] T035 [US2] Implement CheckoutView (APIView, POST) in `backend/django_Admin3/orders/views.py` — delegates to CheckoutOrchestrator, returns order + payment result
- [ ] T036 [US2] Create orders URL configuration in `backend/django_Admin3/orders/urls.py` — path('checkout/', CheckoutView.as_view())
- [ ] T037 [US2] Register orders URLs in root `backend/django_Admin3/django_Admin3/urls.py` — path('api/orders/', include('orders.urls'))
- [ ] T038 [US2] Create `backend/django_Admin3/orders/services/__init__.py` exporting checkout_orchestrator, payment_gateway, order_builder
- [ ] T039 [US2] Run US2 tests and verify all pass: `python manage.py test orders.tests.test_order_builder orders.tests.test_checkout_orchestrator orders.tests.test_views`

**Checkpoint**: Checkout works via POST /api/orders/checkout/ — cart items become order, payment processed, confirmation sent

---

## Phase 5: User Story 1 - Shopping Cart Management (Priority: P1)

**Goal**: CartService facade replaces scattered ViewSet helpers, RESTful API endpoints

**Independent Test**: Add/update/remove/clear items, verify totals and VAT, guest cart merge

**Dependencies**: Phase 4 (checkout extracted from cart — cart views can now be slimmed)

### Tests for User Story 1

- [ ] T040 [P] [US1] Write CartService unit tests in `backend/django_Admin3/cart/tests/test_cart_service.py` — test add_item, update_item, remove_item, clear, merge_guest_cart, _update_cart_flags
- [ ] T041 [P] [US1] Write Cart API tests in `backend/django_Admin3/cart/tests/test_views.py` — test GET /api/cart/, POST /api/cart/items/, PATCH /api/cart/items/{id}/, DELETE /api/cart/items/{id}/, DELETE /api/cart/items/

### Implementation for User Story 1

- [ ] T042 [US1] Split Cart model to `backend/django_Admin3/cart/models/cart.py` — remove VAT calculation methods (calculate_vat, calculate_and_save_vat, get_vat_calculation, calculate_vat_for_all_items)
- [ ] T043 [P] [US1] Split CartItem model to `backend/django_Admin3/cart/models/cart_item.py`
- [ ] T044 [P] [US1] Split CartFee model to `backend/django_Admin3/cart/models/cart_fee.py`
- [ ] T045 [US1] Create `backend/django_Admin3/cart/models/__init__.py` exporting Cart, CartItem, CartFee
- [ ] T046 [US1] Implement CartService facade in `backend/django_Admin3/cart/services/cart_service.py` — get_or_create, add_item, add_marking_voucher, update_item, remove_item, clear, merge_guest_cart, _update_cart_flags, _handle_tutorial_merge
- [ ] T047 [US1] Create CartSerializer, CartItemSerializer, CartFeeSerializer in `backend/django_Admin3/cart/serializers/` — split from current monolithic serializers.py
- [ ] T048 [US1] Rewrite CartViewSet in `backend/django_Admin3/cart/views.py` — slim ~60 lines delegating to CartService: list, create_item, update_item, destroy_item, clear
- [ ] T049 [US1] Create RESTful cart URL configuration in `backend/django_Admin3/cart/urls.py` — GET /, POST /items/, PATCH/DELETE /items/{id}/, DELETE /items/, POST /vat/
- [ ] T050 [US1] Run US1 tests and verify all pass: `python manage.py test cart.tests.test_cart_service cart.tests.test_views`

**Checkpoint**: Cart CRUD works via RESTful endpoints, CartService handles all business logic, ViewSet is < 80 lines

---

## Phase 6: User Story 4 - VAT Calculation Accuracy (Priority: P2)

**Goal**: Single CartService.calculate_vat() replaces 3 redundant implementations (~780 lines → ~60 lines)

**Independent Test**: Configure customers with different countries, verify correct VAT rates per item

**Dependencies**: Phase 5 (CartService exists)

### Tests for User Story 4

- [ ] T051 [P] [US4] Write CartService.calculate_vat() unit tests in `backend/django_Admin3/cart/tests/test_cart_service_vat.py` — test UK 20%, Ireland 23%, ROW 0%, zero-rate products (FC code), multi-item aggregation, anonymous default UK
- [ ] T052 [P] [US4] Write VAT recalculate endpoint test in `backend/django_Admin3/cart/tests/test_views.py` — test POST /api/cart/vat/ triggers recalculation

### Implementation for User Story 4

- [ ] T053 [US4] Implement CartService.calculate_vat() in `backend/django_Admin3/cart/services/cart_service.py` — _resolve_user_country, per-item rules engine call, _aggregate_vat, _store_vat_result, _update_cart_item_vat_fields
- [ ] T054 [US4] Add recalculate_vat action to CartViewSet in `backend/django_Admin3/cart/views.py` — POST /api/cart/vat/ delegates to CartService.calculate_vat()
- [ ] T055 [US4] Delete VATOrchestrator: remove `backend/django_Admin3/cart/services/vat_orchestrator.py` (566 lines)
- [ ] T056 [US4] Delete Cart model VAT methods from `backend/django_Admin3/cart/models/cart.py` — remove calculate_vat, calculate_and_save_vat, get_vat_calculation, calculate_vat_for_all_items (~215 lines)
- [ ] T057 [US4] Run US4 tests and verify all pass: `python manage.py test cart.tests.test_cart_service_vat`

**Checkpoint**: VAT calculation through single CartService method, 3 old implementations deleted, rules engine flow preserved

---

## Phase 7: User Story 3 - Order History (Priority: P2)

**Goal**: Authenticated customers view past orders with details, items, VAT breakdown

**Independent Test**: Create orders, then list/view via GET /api/orders/ and GET /api/orders/{id}/

**Dependencies**: Phase 2 (order models), Phase 4 (orders app exists with URLs)

**Note**: Can be developed in parallel with Phase 5/6 since it only depends on Phase 2+4

### Tests for User Story 3

- [ ] T058 [P] [US3] Write OrderViewSet list/detail tests in `backend/django_Admin3/orders/tests/test_views.py` — test GET /api/orders/ paginated, GET /api/orders/{id}/ with items, unauthorized access blocked, only own orders visible

### Implementation for User Story 3

- [ ] T059 [US3] Add OrderViewSet (list, retrieve) to `backend/django_Admin3/orders/views.py` — ModelViewSet with read-only actions, user filtering
- [ ] T060 [US3] Update `backend/django_Admin3/orders/urls.py` — register OrderViewSet with router
- [ ] T061 [US3] Add OrderDetailSerializer with nested items and payments in `backend/django_Admin3/orders/serializers/order_serializer.py`
- [ ] T062 [US3] Run US3 tests and verify all pass: `python manage.py test orders.tests.test_views`

**Checkpoint**: Order history accessible via GET /api/orders/ (list) and GET /api/orders/{id}/ (detail)

---

## Phase 8: Polish and Cross-Cutting Concerns

**Purpose**: Frontend updates, cleanup, project configuration, full regression

### Frontend API Updates

- [ ] T063 [P] Update `frontend/react-Admin3/src/services/cartService.js` — change all Axios calls to new RESTful endpoints (POST /items/, PATCH /items/{id}/, DELETE /items/{id}/, DELETE /items/, POST /vat/)
- [ ] T064 [P] Update `frontend/react-Admin3/src/services/cartService.js` — change checkout to POST /api/orders/checkout/, orders to GET /api/orders/
- [ ] T065 Update `frontend/react-Admin3/src/contexts/CartContext.js` — update API calls to match new cartService methods

### Project Configuration

- [ ] T066 Add 'orders' to INSTALLED_APPS in `backend/django_Admin3/django_Admin3/settings.py`
- [ ] T067 [P] Create orders admin registrations in `backend/django_Admin3/orders/admin.py` — register Order, OrderItem, Payment models
- [ ] T068 [P] Remove order-related admin classes from `backend/django_Admin3/cart/admin.py`

### Cleanup

- [ ] T069 Delete old `backend/django_Admin3/cart/services/payment_service.py` (498 lines — moved to orders/services/payment_gateway.py)
- [ ] T070 Delete old cart VAT test files that tested removed methods: `backend/django_Admin3/cart/tests/test_vat_orchestrator.py`
- [ ] T071 Remove old order models from `backend/django_Admin3/cart/models.py` (ActedOrder, ActedOrderItem, ActedOrderPayment, OrderUserAcknowledgment, OrderUserPreference, OrderUserContact, OrderDeliveryDetail)
- [ ] T072 Update all cross-project imports that reference old cart order models to use new orders app imports

### Regression

- [ ] T073 Run full backend test suite: `python manage.py test -v2`
- [ ] T074 [P] Run full frontend test suite: `cd frontend/react-Admin3 && npm test -- --watchAll=false`
- [ ] T075 Run original integration tests to verify no regression: `python manage.py test cart.tests.test_integration_checkout -v2`

---

## Dependencies and Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ─────────────────────────────────────────────────► Phase 2 (Foundational)
                                                                         │
                            ┌────────────────────────────────────────────┤
                            │                                            │
                            ▼                                            ▼
                   Phase 3 (US5 Payment)                        Phase 7 (US3 Order History)
                            │                                   [Can parallel with 5/6]
                            ▼
                   Phase 4 (US2 Checkout)
                            │
                            ▼
                   Phase 5 (US1 Cart Management)
                            │
                            ▼
                   Phase 6 (US4 VAT Calculation)
                            │
                            ▼
                   Phase 8 (Polish)
```

### User Story Dependencies

- **US5 (Payment)**: Depends on Phase 2 (order models). No other story dependencies.
- **US2 (Checkout)**: Depends on US5 (payment gateway) + Phase 2 (order models).
- **US1 (Cart Management)**: Depends on US2 (checkout extracted from cart app).
- **US4 (VAT Calculation)**: Depends on US1 (CartService exists to add calculate_vat method).
- **US3 (Order History)**: Depends on Phase 2 + Phase 4 (orders app with URLs). Independent of US1/US4/US5.

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models before services
- Services before views/endpoints
- Run story-specific tests at checkpoint

### Parallel Opportunities

- T002, T003: Setup tasks (different files)
- T005–T009: Integration tests (same file but independent test methods)
- T010–T016: Order models (different files)
- T018, T019: US5 tests (different test files)
- T023, T024: DummyGateway + InvoiceGateway (same file, independent classes)
- T028–T030: US2 tests (different test files)
- T040, T041: US1 tests (different test files)
- T043, T044: CartItem + CartFee split (different files)
- T051, T052: US4 tests (different files)
- T063, T064: Frontend service updates (same file, different functions)
- T067, T068: Admin registrations (different files)
- T073, T074: Backend + frontend regression (independent)

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all integration tests in parallel (same file, independent methods):
Task: T005 "Integration test for card checkout"
Task: T006 "Integration test for invoice checkout"
Task: T007 "Integration test for blocking rules"
Task: T008 "Integration test for VAT during checkout"
Task: T009 "Integration test for guest cart merge"

# Launch all order models in parallel (different files):
Task: T010 "Create Order model in orders/models/order.py"
Task: T011 "Create OrderItem model in orders/models/order_item.py"
Task: T012 "Create OrderAcknowledgment model in orders/models/acknowledgment.py"
Task: T013 "Create OrderPreference model in orders/models/preference.py"
Task: T014 "Create OrderContact model in orders/models/contact.py"
Task: T015 "Create OrderDelivery model in orders/models/delivery.py"
```

---

## Implementation Strategy

### MVP First (US5 + US2 = Checkout Works)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (integration tests + order models)
3. Complete Phase 3: US5 (Payment gateway ready)
4. Complete Phase 4: US2 (Checkout via new endpoint)
5. **STOP and VALIDATE**: POST /api/orders/checkout/ works end-to-end
6. Existing cart API still works (not yet refactored)

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US5 + US2 → Checkout works via new endpoint (MVP!)
3. Add US1 → Cart fully refactored with CartService + RESTful endpoints
4. Add US4 → VAT consolidated, old implementations deleted
5. Add US3 → Order history accessible (can parallel with US1/US4)
6. Polish → Frontend updated, cleanup complete, full regression passes

### Net Code Impact

| Metric | Lines |
|--------|-------|
| Deleted | ~1430 (VATOrchestrator 566, PaymentService 498, Cart model methods 215, old tests ~150) |
| Added | ~1040 (CartService 200, CheckoutOrchestrator 150, PaymentGateway 150, OrderBuilder 60, models 280, views 80, serializers 80, tests 400+) |
| **Net reduction** | **~390 lines** + massive complexity reduction |
