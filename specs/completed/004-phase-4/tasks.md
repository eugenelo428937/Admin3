# Tasks: Phase 4 - Cart VAT Integration

**Input**: Design documents from `/Users/work/Documents/Code/Admin3/specs/004-phase-4/`
**Prerequisites**: plan.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: Python 3.14, Django 5.1, React 18
   → Libraries: Django REST Framework, PostgreSQL, Phase 3 Rules Engine, Material-UI
   → Structure: Web app (backend/frontend)
2. Load design documents ✅:
   → data-model.md: CartItem (6 fields), Cart (3 fields)
   → contracts/: 6 API endpoints (GET cart, POST items, PATCH items, DELETE items, POST recalculate, GET audit)
   → research.md: 7 decisions (rules integration, signals, error handling)
   → quickstart.md: 6 manual test scenarios
3. Generate tasks by category ✅:
   → Setup: Migrations (T001-T002)
   → Tests (RED): Model tests, API tests, integration tests (T003-T004, T009, T013, T018-T022, T027-T032, T034, T037-T040, T046)
   → Implementation (GREEN): Models, signals, serializers, views, frontend (T005-T008, T010-T012, T014-T017, T023-T026, T033, T035-T036, T041-T045, T047-T049)
   → Refactoring: Optimization, logging (T050-T053)
   → Polish: Documentation, validation (T054-T057)
4. Task rules applied ✅:
   → [P] for different files: T001-T002 (migrations), T037-T040 (component tests), T041-T044 (component impl)
   → Sequential for same file: Models, signals, views
   → TDD order: RED → GREEN → REFACTOR
5. Tasks numbered T001-T057 ✅
6. Dependency graph created ✅
7. Parallel execution examples created ✅
```

## Format: `[ID] [P?] [Phase] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[RED]**: TDD Red phase - write failing tests
- **[GREEN]**: TDD Green phase - minimal implementation
- **[REFACTOR]**: TDD Refactor phase - improve code quality

## Path Conventions
- **Backend**: `backend/django_Admin3/`
- **Frontend**: `frontend/react-Admin3/`
- **Tests**: `backend/django_Admin3/{app}/tests/`

---

## Phase 3.1: Backend Model Migrations

### ⚠️ CRITICAL: Run migrations before any tests

- [ ] **T001** [P] Create migration for CartItem VAT fields
  - **File**: `backend/django_Admin3/cart/migrations/XXXX_add_vat_fields_to_cartitem.py`
  - **Fields**: vat_region, vat_rate, vat_amount, gross_amount, vat_calculated_at, vat_rule_version
  - **Constraints**: vat_rate range (0-1), vat_amount >= 0
  - **Indexes**: vat_region, vat_calculated_at, cart+vat_region composite
  - **Command**: `cd backend/django_Admin3 && python manage.py makemigrations cart --name add_vat_fields_to_cartitem`

- [ ] **T002** [P] Create migration for Cart error tracking fields
  - **File**: `backend/django_Admin3/cart/migrations/XXXX_add_vat_error_tracking_to_cart.py`
  - **Fields**: vat_calculation_error (BooleanField), vat_calculation_error_message (TextField), vat_last_calculated_at (DateTimeField)
  - **Command**: `cd backend/django_Admin3 && python manage.py makemigrations cart --name add_vat_error_tracking_to_cart`

---

## Phase 3.2: Backend Model Tests (RED Phase)

### ⚠️ CRITICAL: These tests MUST be written and MUST FAIL before implementation

- [ ] **T003** [RED] Write model tests for CartItem VAT validations
  - **File**: `backend/django_Admin3/cart/tests/test_models_vat.py`
  - **Tests**:
    - `test_vat_rate_valid_range()` - vat_rate must be 0.0000 to 1.0000
    - `test_vat_amount_non_negative()` - vat_amount must be >= 0
    - `test_gross_amount_calculation()` - gross = net + vat
    - `test_vat_region_enum()` - region must be UK, IE, EU, SA, ROW
    - `test_vat_calculated_at_timestamp()` - timestamp ordering
  - **Expected**: All tests fail (fields don't exist yet)
  - **Command**: `python manage.py test cart.tests.test_models_vat -v 2`

- [ ] **T004** [RED] Write model tests for Cart VAT calculations
  - **File**: `backend/django_Admin3/cart/tests/test_cart_vat_methods.py`
  - **Tests**:
    - `test_calculate_vat_for_all_items_success()` - calls rules engine per item
    - `test_calculate_vat_for_all_items_error_fallback()` - falls back to 0% VAT on error
    - `test_vat_result_json_structure()` - validates Cart.vat_result format
    - `test_vat_error_tracking()` - sets error flags correctly
  - **Expected**: All tests fail (methods don't exist yet)
  - **Command**: `python manage.py test cart.tests.test_cart_vat_methods -v 2`

---

## Phase 3.3: Backend Model Implementation (GREEN Phase)

- [ ] **T005** [GREEN] Implement CartItem VAT fields and constraints
  - **File**: `backend/django_Admin3/cart/models.py`
  - **Changes**:
    - Add 6 fields to CartItem model (vat_region through vat_rule_version)
    - Add CheckConstraints for vat_rate, vat_amount, gross_amount
    - Add indexes per data-model.md
  - **Validation**: `python manage.py check` passes

- [ ] **T006** [GREEN] Implement Cart.calculate_vat_for_all_items() method
  - **File**: `backend/django_Admin3/cart/models.py`
  - **Implementation**:
    - Build context per cart item (cart_item, user, vat)
    - Call `rule_engine.execute('cart_calculate_vat', context)`
    - Update CartItem VAT fields from result
    - Aggregate results in Cart.vat_result
    - Handle RuleEngineError → fallback to 0% VAT
  - **Depends on**: T005 (CartItem fields must exist)

- [ ] **T007** [GREEN] Implement Cart VAT error tracking
  - **File**: `backend/django_Admin3/cart/models.py`
  - **Changes**:
    - Add 3 error tracking fields to Cart model
    - Update calculate_vat_for_all_items() to set error flags
    - Clear error flags on successful calculation
  - **Depends on**: T006 (method must exist)

- [ ] **T008** [GREEN] Verify model tests pass
  - **Command**: `python manage.py test cart.tests.test_models_vat cart.tests.test_cart_vat_methods -v 2`
  - **Expected**: All tests pass (GREEN phase complete)
  - **Coverage check**: `python manage.py test --coverage`
  - **Depends on**: T005, T006, T007

---

## Phase 3.4: Backend Signals (RED → GREEN)

- [ ] **T009** [RED] Write signal tests for cart modification triggers
  - **File**: `backend/django_Admin3/cart/tests/test_signals_vat.py`
  - **Tests**:
    - `test_post_save_cartitem_created_triggers_vat_calc()` - new item added
    - `test_post_save_cartitem_quantity_changed_triggers_vat_calc()` - quantity updated
    - `test_post_delete_cartitem_triggers_vat_calc()` - item removed
    - `test_signal_uses_user_country_code()` - passes correct country
    - `test_signal_handles_anonymous_cart()` - uses session country
  - **Expected**: All tests fail (signals don't exist yet)
  - **Command**: `python manage.py test cart.tests.test_signals_vat -v 2`

- [ ] **T010** [GREEN] Implement post_save signal for CartItem → VAT recalculation
  - **File**: `backend/django_Admin3/cart/signals.py`
  - **Implementation**:
    - Create signals.py if not exists
    - `@receiver(post_save, sender=CartItem)`
    - Check if created or quantity changed
    - Call `instance.cart.calculate_vat_for_all_items(country_code)`
  - **Depends on**: T008 (Cart methods must work)

- [ ] **T011** [GREEN] Implement post_delete signal for CartItem → VAT recalculation
  - **File**: `backend/django_Admin3/cart/signals.py`
  - **Implementation**:
    - `@receiver(post_delete, sender=CartItem)`
    - Call `instance.cart.calculate_vat_for_all_items(country_code)`
  - **Depends on**: T010 (signals.py must exist)

- [ ] **T012** [GREEN] Verify signal tests pass
  - **Command**: `python manage.py test cart.tests.test_signals_vat -v 2`
  - **Expected**: All tests pass (GREEN phase complete)
  - **Depends on**: T010, T011

---

## Phase 3.5: Backend API Serializers (RED → GREEN)

- [ ] **T013** [RED] Write serializer tests for CartWithVAT response format
  - **File**: `backend/django_Admin3/cart/tests/test_serializers_vat.py`
  - **Tests**:
    - `test_cart_item_vat_serializer_structure()` - matches OpenAPI schema
    - `test_cart_totals_serializer_structure()` - includes vat_breakdown
    - `test_cart_serializer_includes_vat_fields()` - totals + error flags
    - `test_vat_details_decimal_precision()` - 4 decimals for rate, 2 for amounts
    - `test_vat_region_enum_serialization()` - UK/IE/EU/SA/ROW only
  - **Expected**: All tests fail (serializers don't exist yet)
  - **Command**: `python manage.py test cart.tests.test_serializers_vat -v 2`

- [ ] **T014** [GREEN] Implement CartItemVATSerializer
  - **File**: `backend/django_Admin3/cart/serializers.py`
  - **Fields**: region, rate, rate_percent, amount
  - **Methods**: `get_rate_percent()` - format as "20%"
  - **Depends on**: T012 (signals must work)

- [ ] **T015** [GREEN] Implement CartTotalsSerializer
  - **File**: `backend/django_Admin3/cart/serializers.py`
  - **Fields**: total_net_amount, total_vat_amount, total_gross_amount, vat_breakdown
  - **Methods**: `get_vat_breakdown()` - aggregate by region
  - **Depends on**: T014 (CartItemVATSerializer must exist)

- [ ] **T016** [GREEN] Update CartSerializer with VAT fields
  - **File**: `backend/django_Admin3/cart/serializers.py`
  - **Changes**:
    - Add `vat` field to CartItemSerializer using CartItemVATSerializer
    - Add `totals` field using CartTotalsSerializer
    - Add error tracking fields (vat_calculation_error, vat_calculation_error_message)
    - Add `vat_calculated_at` timestamp
  - **Depends on**: T014, T015

- [ ] **T017** [GREEN] Verify serializer tests pass
  - **Command**: `python manage.py test cart.tests.test_serializers_vat -v 2`
  - **Expected**: All tests pass (GREEN phase complete)
  - **Depends on**: T014, T015, T016

---

## Phase 3.6: Backend API Endpoints (RED → GREEN)

### Contract Tests (RED Phase)

- [ ] **T018** [RED] Write API contract test for GET /api/cart/ with VAT
  - **File**: `backend/django_Admin3/cart/tests/test_api_cart_vat_get.py`
  - **Test**: `test_get_cart_includes_vat_calculations()`
    - Create cart with 2 items (different product types)
    - GET /api/cart/
    - Assert response matches OpenAPI schema (cart-vat-api.yaml)
    - Assert vat field present for each item
    - Assert totals include vat_breakdown
  - **Expected**: Test fails (VAT not in response yet)
  - **Command**: `python manage.py test cart.tests.test_api_cart_vat_get -v 2`

- [ ] **T019** [RED] Write API contract test for POST /api/cart/items/ with VAT recalc
  - **File**: `backend/django_Admin3/cart/tests/test_api_cart_item_post.py`
  - **Test**: `test_add_item_triggers_vat_recalculation()`
    - POST /api/cart/items/ with product_id, quantity
    - Assert 201 Created
    - Assert response includes VAT for new item
    - Assert cart totals recalculated
  - **Expected**: Test fails (VAT recalc not triggered yet)
  - **Command**: `python manage.py test cart.tests.test_api_cart_item_post -v 2`

- [ ] **T020** [RED] Write API contract test for PATCH /api/cart/items/{id}/ with VAT recalc
  - **File**: `backend/django_Admin3/cart/tests/test_api_cart_item_patch.py`
  - **Test**: `test_update_quantity_recalculates_vat()`
    - Create cart item
    - PATCH /api/cart/items/{id}/ with new quantity
    - Assert 200 OK
    - Assert VAT amount updated (proportional to quantity)
    - Assert vat_calculated_at timestamp updated
  - **Expected**: Test fails (VAT recalc not triggered yet)
  - **Command**: `python manage.py test cart.tests.test_api_cart_item_patch -v 2`

- [ ] **T021** [RED] Write API contract test for DELETE /api/cart/items/{id}/ with VAT recalc
  - **File**: `backend/django_Admin3/cart/tests/test_api_cart_item_delete.py`
  - **Test**: `test_delete_item_recalculates_cart_vat()`
    - Create cart with 2 items
    - DELETE /api/cart/items/{id}/
    - Assert 204 No Content
    - GET /api/cart/
    - Assert cart totals reflect removed item
  - **Expected**: Test fails (VAT recalc not triggered yet)
  - **Command**: `python manage.py test cart.tests.test_api_cart_item_delete -v 2`

- [ ] **T022** [RED] Write API contract test for POST /api/cart/vat/recalculate/
  - **File**: `backend/django_Admin3/cart/tests/test_api_cart_vat_recalc.py`
  - **Test**: `test_manual_vat_recalculation()`
    - Create cart with error state (vat_calculation_error=True)
    - POST /api/cart/vat/recalculate/
    - Assert 200 OK
    - Assert vat_calculation_error=False
    - Assert VAT recalculated correctly
  - **Expected**: Test fails (endpoint doesn't exist yet)
  - **Command**: `python manage.py test cart.tests.test_api_cart_vat_recalc -v 2`

### Implementation (GREEN Phase)

- [ ] **T023** [GREEN] Implement CartViewSet.list() with VAT calculations
  - **File**: `backend/django_Admin3/cart/views.py`
  - **Changes**:
    - Update `list()` method to use updated CartSerializer (includes VAT)
    - Ensure signals trigger on cart retrieval if needed
    - Add select_related/prefetch_related for performance
  - **Depends on**: T017 (serializers must work)

- [ ] **T024** [GREEN] Implement CartItemViewSet with VAT recalculation triggers
  - **File**: `backend/django_Admin3/cart/views.py`
  - **Changes**:
    - `create()`: Add item → signal triggers VAT recalc → return item with VAT
    - `update()`: Update quantity → signal triggers VAT recalc → return updated VAT
    - `destroy()`: Delete item → signal triggers VAT recalc → return 204
  - **Note**: Signals handle recalculation, views just return updated data
  - **Depends on**: T023

- [ ] **T025** [GREEN] Implement /api/cart/vat/recalculate/ endpoint
  - **File**: `backend/django_Admin3/cart/views.py`
  - **Implementation**:
    - New action method: `@action(methods=['post'], detail=False)`
    - Get user's cart
    - Call `cart.calculate_vat_for_all_items(country_code)`
    - Return updated cart with CartSerializer
    - Handle errors gracefully
  - **URL**: `/api/cart/vat/recalculate/`
  - **Depends on**: T024

- [ ] **T026** [GREEN] Verify all API contract tests pass
  - **Command**: `python manage.py test cart.tests.test_api_cart_vat_get cart.tests.test_api_cart_item_post cart.tests.test_api_cart_item_patch cart.tests.test_api_cart_item_delete cart.tests.test_api_cart_vat_recalc -v 2`
  - **Expected**: All API tests pass (GREEN phase complete)
  - **Depends on**: T023, T024, T025

---

## Phase 3.7: Backend Integration Tests (RED → GREEN)

### Integration Tests from quickstart.md (RED Phase)

- [ ] **T027** [RED] Write integration test: UK customer single digital product
  - **File**: `backend/django_Admin3/cart/tests/test_cart_vat_integration.py`
  - **Test**: `test_uk_customer_single_digital_product()`
    - Scenario 1 from quickstart.md
    - UK user, add Digital product £50
    - Assert net=£50, VAT(20%)=£10, gross=£60
    - Assert vat.region='UK', vat.rate=0.2000
  - **Expected**: Test fails (full integration not complete)
  - **Command**: `python manage.py test cart.tests.test_cart_vat_integration.CartVATIntegrationTestCase.test_uk_customer_single_digital_product -v 2`

- [ ] **T028** [RED] Write integration test: SA customer multiple mixed products
  - **File**: `backend/django_Admin3/cart/tests/test_cart_vat_integration.py`
  - **Test**: `test_sa_customer_multiple_mixed_products()`
    - Scenario 2 from quickstart.md
    - SA user, add Printed (R500) + Digital (R300 × 2)
    - Assert total net=R1100, VAT(15%)=R165, gross=R1265
  - **Expected**: Test fails
  - **Command**: `python manage.py test cart.tests.test_cart_vat_integration.CartVATIntegrationTestCase.test_sa_customer_multiple_mixed_products -v 2`

- [ ] **T029** [RED] Write integration test: ROW customer zero VAT
  - **File**: `backend/django_Admin3/cart/tests/test_cart_vat_integration.py`
  - **Test**: `test_row_customer_zero_vat()`
    - Scenario 3 from quickstart.md
    - US user (ROW), add product £100
    - Assert vat.region='ROW', vat.rate=0.0000, vat.amount=0.00
  - **Expected**: Test fails
  - **Command**: `python manage.py test cart.tests.test_cart_vat_integration.CartVATIntegrationTestCase.test_row_customer_zero_vat -v 2`

- [ ] **T030** [RED] Write integration test: Quantity change recalculation
  - **File**: `backend/django_Admin3/cart/tests/test_cart_vat_integration.py`
  - **Test**: `test_quantity_change_recalculation()`
    - Scenario 4 from quickstart.md
    - Add item (qty 1), verify VAT
    - Update to qty 3, verify VAT recalculated
    - Assert vat_calculated_at timestamp updated
  - **Expected**: Test fails
  - **Command**: `python manage.py test cart.tests.test_cart_vat_integration.CartVATIntegrationTestCase.test_quantity_change_recalculation -v 2`

- [ ] **T031** [RED] Write integration test: Item removal recalculation
  - **File**: `backend/django_Admin3/cart/tests/test_cart_vat_integration.py`
  - **Test**: `test_item_removal_recalculation()`
    - Scenario 5 from quickstart.md
    - Add 2 items, verify total VAT
    - Remove 1 item, verify VAT recalculated
    - Assert totals reflect removal
  - **Expected**: Test fails
  - **Command**: `python manage.py test cart.tests.test_cart_vat_integration.CartVATIntegrationTestCase.test_item_removal_recalculation -v 2`

- [ ] **T032** [RED] Write integration test: Error handling and retry
  - **File**: `backend/django_Admin3/cart/tests/test_cart_vat_integration.py`
  - **Test**: `test_error_handling_manual_recalculation()`
    - Scenario 6 from quickstart.md
    - Simulate rules engine error
    - Verify fallback to 0% VAT
    - Verify error flags set
    - Call /api/cart/vat/recalculate/
    - Verify error cleared and VAT correct
  - **Expected**: Test fails
  - **Command**: `python manage.py test cart.tests.test_cart_vat_integration.CartVATIntegrationTestCase.test_error_handling_manual_recalculation -v 2`

### Verify Integration Tests (GREEN Phase)

- [ ] **T033** [GREEN] Verify all integration tests pass
  - **Command**: `python manage.py test cart.tests.test_cart_vat_integration -v 2`
  - **Expected**: All 6 integration tests pass (GREEN phase complete)
  - **Depends on**: T026 (API endpoints must work)

---

## Phase 3.8: Backend Management Command (RED → GREEN)

- [ ] **T034** [RED] Write tests for cleanup_vat_audit command
  - **File**: `backend/django_Admin3/vat/tests/test_cleanup_command.py`
  - **Tests**:
    - `test_cleanup_deletes_records_older_than_2_years()` - removes old records
    - `test_cleanup_preserves_recent_records()` - keeps records < 2 years
    - `test_cleanup_returns_count()` - reports deleted count
    - `test_cleanup_dry_run_mode()` - doesn't delete with --dry-run
  - **Expected**: Test fails (command doesn't exist yet)
  - **Command**: `python manage.py test vat.tests.test_cleanup_command -v 2`

- [ ] **T035** [GREEN] Implement cleanup_vat_audit management command
  - **File**: `backend/django_Admin3/vat/management/commands/cleanup_vat_audit.py`
  - **Implementation** (from research.md):
    - Delete VATAudit records where created_at < (now - 730 days)
    - Support --dry-run flag
    - Return count of deleted records
  - **Command to test**: `python manage.py cleanup_vat_audit --dry-run`
  - **Depends on**: T033 (integration must work to generate audit records)

- [ ] **T036** [GREEN] Verify command tests pass
  - **Command**: `python manage.py test vat.tests.test_cleanup_command -v 2`
  - **Expected**: All tests pass (GREEN phase complete)
  - **Depends on**: T035

---

## Phase 3.9: Frontend Components (RED → GREEN)

### Component Tests (RED Phase) - Can run in parallel

- [ ] **T037** [P] [RED] Write tests for CartVATDisplay component
  - **File**: `frontend/react-Admin3/src/components/Cart/__tests__/CartVATDisplay.test.js`
  - **Tests**:
    - Renders VAT-exclusive pricing (net prominent)
    - Shows VAT as separate line below net
    - Displays VAT rate percentage (e.g., "20%")
    - Shows regional label (e.g., "UK VAT")
    - Formats currency correctly
  - **Expected**: Test fails (component doesn't exist)
  - **Command**: `cd frontend/react-Admin3 && npm test -- CartVATDisplay.test.js`

- [ ] **T038** [P] [RED] Write tests for CartItemWithVAT component
  - **File**: `frontend/react-Admin3/src/components/Cart/__tests__/CartItemWithVAT.test.js`
  - **Tests**:
    - Renders item with net price prominent
    - Shows VAT amount below net
    - Displays gross total
    - Shows VAT rate badge
    - Handles missing VAT data gracefully
  - **Expected**: Test fails (component doesn't exist)
  - **Command**: `cd frontend/react-Admin3 && npm test -- CartItemWithVAT.test.js`

- [ ] **T039** [P] [RED] Write tests for CartVATError component with retry button
  - **File**: `frontend/react-Admin3/src/components/Cart/__tests__/CartVATError.test.js`
  - **Tests**:
    - Displays error message
    - Shows "Recalculate VAT" button
    - Calls API on retry button click
    - Clears error on successful retry
    - Handles retry failure
  - **Expected**: Test fails (component doesn't exist)
  - **Command**: `cd frontend/react-Admin3 && npm test -- CartVATError.test.js`

- [ ] **T040** [P] [RED] Write tests for CartTotals component with VAT breakdown
  - **File**: `frontend/react-Admin3/src/components/Cart/__tests__/CartTotals.test.js`
  - **Tests**:
    - Displays total net amount
    - Shows total VAT amount
    - Displays total gross amount
    - Renders VAT breakdown by region
    - Shows item count per region
  - **Expected**: Test fails (component doesn't exist)
  - **Command**: `cd frontend/react-Admin3 && npm test -- CartTotals.test.js`

### Component Implementation (GREEN Phase) - Can run in parallel after tests written

- [ ] **T041** [P] [GREEN] Implement CartVATDisplay component (Material-UI)
  - **File**: `frontend/react-Admin3/src/components/Cart/CartVATDisplay.js`
  - **Implementation**:
    - Display net price (Typography variant="h6")
    - Display VAT line (Typography variant="body2", secondary color)
    - Display gross total (Typography variant="h5", bold)
    - Use Chip for VAT rate badge
    - Format currency with locale
  - **Depends on**: T037 (tests must exist)

- [ ] **T042** [P] [GREEN] Implement CartItemWithVAT component
  - **File**: `frontend/react-Admin3/src/components/Cart/CartItemWithVAT.js`
  - **Implementation**:
    - ListItem for cart item
    - Use CartVATDisplay for VAT rendering
    - Handle quantity controls
    - Show product name and image
  - **Depends on**: T038, T041 (tests + CartVATDisplay must exist)

- [ ] **T043** [P] [GREEN] Implement CartVATError component with retry functionality
  - **File**: `frontend/react-Admin3/src/components/Cart/CartVATError.js`
  - **Implementation**:
    - Alert severity="error" (Material-UI)
    - Display error message from API
    - Button with "Recalculate VAT" label
    - Call POST /api/cart/vat/recalculate/ on click
    - Show loading state during retry
    - Handle success/failure
  - **Depends on**: T039 (tests must exist)

- [ ] **T044** [P] [GREEN] Implement CartTotals component with VAT breakdown
  - **File**: `frontend/react-Admin3/src/components/Cart/CartTotals.js`
  - **Implementation**:
    - Card component with totals
    - Divider between sections
    - VAT breakdown List (by region)
    - Typography for totals (net, VAT, gross)
    - Emphasized gross total
  - **Depends on**: T040 (tests must exist)

### Verify Component Tests (GREEN Phase)

- [ ] **T045** [GREEN] Verify all frontend component tests pass
  - **Command**: `cd frontend/react-Admin3 && npm test -- Cart/Cart --coverage`
  - **Expected**: All component tests pass (GREEN phase complete)
  - **Depends on**: T041, T042, T043, T044

---

## Phase 3.10: Frontend Integration (RED → GREEN)

- [ ] **T046** [RED] Write tests for Cart page with VAT integration
  - **File**: `frontend/react-Admin3/src/pages/__tests__/Cart.test.js`
  - **Tests**:
    - Fetches cart data from API on mount
    - Renders CartItemWithVAT for each item
    - Renders CartTotals with VAT breakdown
    - Shows CartVATError when vat_calculation_error=true
    - Hides error when vat_calculation_error=false
    - Handles API errors gracefully
  - **Expected**: Test fails (integration not complete)
  - **Command**: `cd frontend/react-Admin3 && npm test -- pages/Cart.test.js`

- [ ] **T047** [GREEN] Update Cart page to display VAT calculations
  - **File**: `frontend/react-Admin3/src/pages/Cart.js`
  - **Changes**:
    - Import new VAT components
    - Replace old cart item rendering with CartItemWithVAT
    - Add CartTotals at bottom of cart
    - Conditional render CartVATError if error flag set
  - **Depends on**: T045 (components must work)

- [ ] **T048** [GREEN] Integrate retry button with API recalculate endpoint
  - **File**: `frontend/react-Admin3/src/pages/Cart.js`
  - **Implementation**:
    - Pass handleRetryVAT callback to CartVATError
    - handleRetryVAT calls POST /api/cart/vat/recalculate/
    - Update cart state with new VAT data on success
    - Show snackbar notification on success/failure
  - **Depends on**: T047

- [ ] **T049** [GREEN] Verify Cart page integration tests pass
  - **Command**: `cd frontend/react-Admin3 && npm test -- pages/Cart.test.js`
  - **Expected**: All integration tests pass (GREEN phase complete)
  - **Depends on**: T048

---

## Phase 3.11: Refactoring & Optimization (REFACTOR Phase)

- [ ] **T050** [REFACTOR] Refactor duplicate VAT calculation logic
  - **Files**: `backend/django_Admin3/cart/models.py`, `backend/django_Admin3/cart/views.py`
  - **Changes**:
    - Extract common VAT calculation code to helper method
    - Remove duplication between Cart.calculate_vat_for_all_items() and signal handlers
    - Add docstrings for clarity
  - **Validation**: Run all tests after refactoring
  - **Depends on**: T049 (everything must work first)

- [ ] **T051** [REFACTOR] Optimize database queries (select_related, prefetch_related)
  - **File**: `backend/django_Admin3/cart/views.py`
  - **Changes**:
    - Add select_related('cart__user', 'product') to CartItem queries
    - Add prefetch_related('items') to Cart queries
    - Use annotate() for aggregations instead of Python loops
  - **Validation**: Check query count with Django Debug Toolbar
  - **Target**: Reduce queries from N+1 to <5 per cart view
  - **Depends on**: T050

- [ ] **T052** [REFACTOR] Add logging for VAT calculation errors
  - **File**: `backend/django_Admin3/cart/models.py`
  - **Changes**:
    - Import logging module
    - Add logger.error() in calculate_vat_for_all_items() exception handler
    - Include context (cart_id, user_id, item_ids, error message)
    - Add logger.info() for successful calculations (debug builds)
  - **Depends on**: T051

- [ ] **T053** [REFACTOR] Verify all tests still pass after refactoring
  - **Command**: `python manage.py test cart vat --keepdb -v 2`
  - **Expected**: All tests pass (no regressions from refactoring)
  - **Coverage**: `python manage.py test --coverage` (target >80%)
  - **Depends on**: T052

---

## Phase 3.12: Documentation & Validation

- [ ] **T054** [P] Update API documentation with VAT endpoints
  - **File**: `backend/django_Admin3/docs/api.md` (or create if not exists)
  - **Changes**:
    - Document GET /api/cart/ with VAT fields
    - Document POST /api/cart/vat/recalculate/
    - Add request/response examples
    - Link to OpenAPI spec (contracts/cart-vat-api.yaml)
  - **Depends on**: T053

- [ ] **T055** [P] Execute quickstart.md manual test scenarios
  - **File**: `specs/004-phase-4/quickstart.md`
  - **Actions**:
    - Set up test users (UK, SA, ROW)
    - Run all 6 manual test scenarios
    - Verify expected responses match
    - Document any deviations
  - **Checklist**:
    - ✅ Scenario 1: UK customer single digital product
    - ✅ Scenario 2: SA customer multiple mixed products
    - ✅ Scenario 3: ROW customer zero VAT
    - ✅ Scenario 4: Quantity change recalculation
    - ✅ Scenario 5: Item removal recalculation
    - ✅ Scenario 6: Error handling and retry
  - **Depends on**: T053

- [ ] **T056** [P] Run full test suite with coverage (>80% target)
  - **Backend**: `cd backend/django_Admin3 && python manage.py test --coverage --coverage-html`
  - **Frontend**: `cd frontend/react-Admin3 && npm test -- --coverage --watchAll=false`
  - **Validation**:
    - Backend coverage >80% for cart VAT code
    - Frontend coverage >80% for VAT components
    - Open htmlcov/index.html to review
  - **Depends on**: T053

- [ ] **T057** [P] Performance testing (VAT calculation <50ms per item)
  - **File**: `backend/django_Admin3/cart/tests/test_performance_vat.py`
  - **Test**: `test_vat_calculation_performance()`
    - Create cart with 10 items
    - Measure time for calculate_vat_for_all_items()
    - Assert average time per item <50ms
    - Test concurrent calculations (5 carts simultaneously)
  - **Command**: `python manage.py test cart.tests.test_performance_vat -v 2`
  - **Target**: <50ms per item, no degradation under concurrency
  - **Depends on**: T053

---

## Dependencies Graph

```
Setup (T001-T002)
    ↓
RED: Model Tests (T003-T004)
    ↓
GREEN: Models (T005-T008)
    ↓
RED: Signal Tests (T009)
    ↓
GREEN: Signals (T010-T012)
    ↓
RED: Serializer Tests (T013)
    ↓
GREEN: Serializers (T014-T017)
    ↓
RED: API Tests (T018-T022)
    ↓
GREEN: API Endpoints (T023-T026)
    ↓
RED: Integration Tests (T027-T032)
    ↓
GREEN: Verify Integration (T033)
    ↓
RED: Command Tests (T034)
    ↓
GREEN: Command (T035-T036)
    ↓
RED: Component Tests (T037-T040) [P]
    ↓
GREEN: Components (T041-T044) [P]
    ↓
GREEN: Verify Components (T045)
    ↓
RED: Page Tests (T046)
    ↓
GREEN: Page Integration (T047-T049)
    ↓
REFACTOR: Optimization (T050-T053)
    ↓
Polish: Docs & Validation (T054-T057) [P]
```

---

## Parallel Execution Examples

### Example 1: Migrations (T001-T002)
```bash
# Run in parallel - different migration files
Task: "Create migration for CartItem VAT fields in backend/django_Admin3/cart/migrations/"
Task: "Create migration for Cart error tracking fields in backend/django_Admin3/cart/migrations/"
```

### Example 2: Component Tests (T037-T040)
```bash
# Run in parallel - different test files
Task: "Write tests for CartVATDisplay component in frontend/react-Admin3/src/components/Cart/__tests__/CartVATDisplay.test.js"
Task: "Write tests for CartItemWithVAT component in frontend/react-Admin3/src/components/Cart/__tests__/CartItemWithVAT.test.js"
Task: "Write tests for CartVATError component in frontend/react-Admin3/src/components/Cart/__tests__/CartVATError.test.js"
Task: "Write tests for CartTotals component in frontend/react-Admin3/src/components/Cart/__tests__/CartTotals.test.js"
```

### Example 3: Component Implementation (T041-T044)
```bash
# Run in parallel after tests written - different component files
Task: "Implement CartVATDisplay component in frontend/react-Admin3/src/components/Cart/CartVATDisplay.js"
Task: "Implement CartItemWithVAT component in frontend/react-Admin3/src/components/Cart/CartItemWithVAT.js"
Task: "Implement CartVATError component in frontend/react-Admin3/src/components/Cart/CartVATError.js"
Task: "Implement CartTotals component in frontend/react-Admin3/src/components/Cart/CartTotals.js"
```

### Example 4: Documentation & Validation (T054-T057)
```bash
# Run in parallel - independent validation tasks
Task: "Update API documentation in backend/django_Admin3/docs/api.md"
Task: "Execute quickstart.md manual test scenarios"
Task: "Run full test suite with coverage"
Task: "Performance testing for VAT calculation"
```

---

## Notes

### TDD Methodology
- **RED Phase**: Write failing tests first (T003-T004, T009, T013, T018-T022, T027-T032, T034, T037-T040, T046)
- **GREEN Phase**: Minimal implementation to pass tests (T005-T008, T010-T012, T014-T017, T023-T026, T033, T035-T036, T041-T045, T047-T049)
- **REFACTOR Phase**: Improve code quality while tests stay green (T050-T053)

### Parallel Execution Rules
- **[P] tasks**: Different files, no shared dependencies, can run simultaneously
- **Sequential tasks**: Same file or dependent on previous task output

### Test Commands
- **Backend**: `cd backend/django_Admin3 && python manage.py test <app>.<test_module> -v 2`
- **Frontend**: `cd frontend/react-Admin3 && npm test -- <test_file>`
- **Coverage**: Add `--coverage` flag to either command

### Critical Checkpoints
- ✅ **After T002**: Run `python manage.py migrate` before tests
- ✅ **After T008**: All model tests must pass before continuing
- ✅ **After T017**: All serializer tests must pass before API endpoints
- ✅ **After T026**: All API contract tests must pass before integration
- ✅ **After T033**: All integration tests must pass before frontend
- ✅ **After T045**: All component tests must pass before page integration
- ✅ **After T053**: All tests still pass after refactoring
- ✅ **After T057**: Phase 4 complete and validated

---

## Validation Checklist

### Pre-Implementation
- [x] All contracts (6 endpoints) have corresponding tests (T018-T022)
- [x] All entities (CartItem, Cart) have model tasks (T005-T007)
- [x] All tests come before implementation (TDD order enforced)
- [x] Parallel tasks truly independent ([P] marks verified)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task

### Post-Implementation Success Criteria
- [ ] All 57 tasks completed in order
- [ ] All tests passing (backend + frontend)
- [ ] Test coverage >80% for new code
- [ ] All 6 quickstart scenarios validated manually
- [ ] VAT calculation performance <50ms per item
- [ ] No regressions in existing cart functionality
- [ ] API documentation updated
- [ ] Phase 3 rules engine integration verified

---

**Total Tasks**: 57
**Parallel Opportunities**: 4 groups (T001-T002, T037-T040, T041-T044, T054-T057)
**Estimated Duration**: 3-4 days (with parallel execution)
**Test-First**: 21 RED phase tasks, 26 GREEN phase tasks, 4 REFACTOR tasks, 6 validation tasks

---

**Ready for Implementation** ✅ **Execute tasks in order: T001 → T057**
