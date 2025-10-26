# Phase 4 Quickstart - Cart VAT Integration

## Purpose
This quickstart validates Phase 4 Cart VAT Integration through manual and automated test scenarios. It ensures VAT calculations work end-to-end from cart item addition through order creation.

## Prerequisites

### 1. Environment Setup
```bash
# Backend
cd backend/django_Admin3
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Verify Phase 3 rules exist
python manage.py shell
>>> from rules_engine.models import ActedRule
>>> ActedRule.objects.filter(entry_point='cart_calculate_vat').count()
17  # Expected: 1 master + 5 regional + 11 product rules

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Start backend server
python manage.py runserver 8888
```

### 2. Test Data Setup
```bash
# Create test users with different countries
python manage.py shell
>>> from django.contrib.auth import get_user_model
>>> from utils.models import UtilsCountrys
>>> User = get_user_model()

>>> # UK user
>>> uk_user = User.objects.create_user(
...     username='uk_test_user',
...     email='uk@test.com',
...     password='testpass123',
...     country_code='GB'
... )

>>> # SA user
>>> sa_user = User.objects.create_user(
...     username='sa_test_user',
...     email='sa@test.com',
...     password='testpass123',
...     country_code='ZA'
... )

>>> # ROW user (US)
>>> row_user = User.objects.create_user(
...     username='row_test_user',
...     email='row@test.com',
...     password='testpass123',
...     country_code='US'
... )
```

### 3. Verify Phase 3 Rules
```bash
python manage.py shell
>>> from rules_engine.services.rule_engine import rule_engine
>>> from decimal import Decimal

>>> # Test UK Digital product
>>> context = {
...     'cart_item': {
...         'id': 'test_1',
...         'product_type': 'Digital',
...         'net_amount': Decimal('50.00')
...     },
...     'user': {
...         'id': 'test_user',
...         'country_code': 'GB'
...     },
...     'vat': {}
... }

>>> result = rule_engine.execute('cart_calculate_vat', context)
>>> print(result)
# Expected: {'vat': {'region': 'UK', 'rate': Decimal('0.20')}, 'cart_item': {'vat_amount': Decimal('10.00'), 'gross_amount': Decimal('60.00')}}
```

---

## Manual Test Scenarios

### Scenario 1: UK Customer - Single Digital Product

**Objective**: Verify basic VAT calculation for UK customer with one digital product

**Steps**:
1. Login as UK user via `/api/auth/login/`
2. Add Digital product to cart:
   ```bash
   curl -X POST http://localhost:8888/api/cart/items/ \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"product_id": 101, "quantity": 1, "price_type": "standard"}'
   ```

3. Get cart with VAT:
   ```bash
   curl -X GET http://localhost:8888/api/cart/ \
     -H "Authorization: Bearer <token>"
   ```

**Expected Response**:
```json
{
  "cart": {
    "id": 1,
    "items": [
      {
        "id": 1,
        "product": {
          "id": 101,
          "name": "Digital Course Materials",
          "product_type": "Digital"
        },
        "quantity": 1,
        "item_price": "50.00",
        "net_amount": "50.00",
        "vat": {
          "region": "UK",
          "rate": "0.2000",
          "rate_percent": "20%",
          "amount": "10.00"
        },
        "gross_amount": "60.00"
      }
    ],
    "totals": {
      "total_net_amount": "50.00",
      "total_vat_amount": "10.00",
      "total_gross_amount": "60.00",
      "vat_breakdown": [
        {
          "region": "UK",
          "rate": "20%",
          "amount": "10.00",
          "item_count": 1
        }
      ]
    },
    "vat_calculated_at": "2025-01-12T10:30:00Z",
    "vat_calculation_error": false
  }
}
```

**Validation Checks**:
- ✅ `vat.region` = "UK"
- ✅ `vat.rate` = "0.2000"
- ✅ `vat.amount` = "10.00" (20% of £50)
- ✅ `gross_amount` = "60.00" (£50 + £10)
- ✅ `vat_calculation_error` = false

---

### Scenario 2: SA Customer - Multiple Mixed Products

**Objective**: Verify VAT calculation for South African customer with multiple product types

**Steps**:
1. Login as SA user
2. Add Printed product (R500):
   ```bash
   curl -X POST http://localhost:8888/api/cart/items/ \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"product_id": 201, "quantity": 1, "price_type": "standard"}'
   ```

3. Add Digital product (R300):
   ```bash
   curl -X POST http://localhost:8888/api/cart/items/ \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"product_id": 202, "quantity": 2, "price_type": "standard"}'
   ```

4. Get cart

**Expected Response**:
```json
{
  "cart": {
    "items": [
      {
        "product": {"product_type": "Printed"},
        "quantity": 1,
        "net_amount": "500.00",
        "vat": {
          "region": "SA",
          "rate": "0.1500",
          "rate_percent": "15%",
          "amount": "75.00"
        },
        "gross_amount": "575.00"
      },
      {
        "product": {"product_type": "Digital"},
        "quantity": 2,
        "net_amount": "600.00",
        "vat": {
          "region": "SA",
          "rate": "0.1500",
          "rate_percent": "15%",
          "amount": "90.00"
        },
        "gross_amount": "690.00"
      }
    ],
    "totals": {
      "total_net_amount": "1100.00",
      "total_vat_amount": "165.00",
      "total_gross_amount": "1265.00",
      "vat_breakdown": [
        {
          "region": "SA",
          "rate": "15%",
          "amount": "165.00",
          "item_count": 2
        }
      ]
    }
  }
}
```

**Validation Checks**:
- ✅ Both items have `vat.region` = "SA"
- ✅ Both items have `vat.rate` = "0.1500"
- ✅ Total VAT = R165.00 (15% of R1100)
- ✅ Gross total = R1265.00

---

### Scenario 3: ROW Customer - Zero VAT

**Objective**: Verify 0% VAT for unknown/ROW countries

**Steps**:
1. Login as ROW user (US)
2. Add any product (£100)
3. Get cart

**Expected Response**:
```json
{
  "cart": {
    "items": [
      {
        "quantity": 1,
        "net_amount": "100.00",
        "vat": {
          "region": "ROW",
          "rate": "0.0000",
          "rate_percent": "0%",
          "amount": "0.00"
        },
        "gross_amount": "100.00"
      }
    ],
    "totals": {
      "total_net_amount": "100.00",
      "total_vat_amount": "0.00",
      "total_gross_amount": "100.00",
      "vat_breakdown": [
        {
          "region": "ROW",
          "rate": "0%",
          "amount": "0.00",
          "item_count": 1
        }
      ]
    }
  }
}
```

**Validation Checks**:
- ✅ `vat.region` = "ROW"
- ✅ `vat.rate` = "0.0000"
- ✅ `vat.amount` = "0.00"
- ✅ `gross_amount` = `net_amount` (no VAT added)

---

### Scenario 4: Quantity Change - VAT Recalculation

**Objective**: Verify VAT recalculates when quantity changes

**Steps**:
1. Login as UK user
2. Add Digital product (£50, quantity 1)
3. Verify VAT = £10.00
4. Update quantity to 3:
   ```bash
   curl -X PATCH http://localhost:8888/api/cart/items/1/ \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"quantity": 3}'
   ```

5. Get cart and verify recalculation

**Expected Changes**:
- Before: net=£50, VAT=£10, gross=£60
- After: net=£150, VAT=£30, gross=£180

**Validation Checks**:
- ✅ `net_amount` = "150.00" (£50 × 3)
- ✅ `vat.amount` = "30.00" (20% of £150)
- ✅ `gross_amount` = "180.00"
- ✅ `vat_calculated_at` timestamp updated

---

### Scenario 5: Item Removal - VAT Recalculation

**Objective**: Verify VAT recalculates when item removed

**Steps**:
1. Login as UK user
2. Add 2 products: Digital (£50) + Printed (£100)
3. Verify total VAT = £30.00
4. Remove Digital product:
   ```bash
   curl -X DELETE http://localhost:8888/api/cart/items/1/ \
     -H "Authorization: Bearer <token>"
   ```

5. Get cart and verify recalculation

**Expected Changes**:
- Before: total VAT = £30.00 (£10 + £20)
- After: total VAT = £20.00 (only Printed item remains)

**Validation Checks**:
- ✅ Only 1 item in cart
- ✅ `total_vat_amount` = "20.00"
- ✅ `total_gross_amount` = "120.00"

---

### Scenario 6: Error Handling - Manual Recalculation

**Objective**: Verify error display and retry functionality

**Steps**:
1. Simulate error by temporarily disabling rules engine
2. Add product to cart
3. Verify error state in cart response:
   ```json
   {
     "cart": {
       "vat_calculation_error": true,
       "vat_calculation_error_message": "Rule engine execution failed",
       "items": [
         {
           "net_amount": "50.00",
           "vat": {
             "region": "ROW",
             "rate": "0.0000",
             "amount": "0.00"
           },
           "gross_amount": "50.00"
         }
       ]
     }
   }
   ```

4. Re-enable rules engine
5. Trigger manual recalculation:
   ```bash
   curl -X POST http://localhost:8888/api/cart/vat/recalculate/ \
     -H "Authorization: Bearer <token>"
   ```

6. Verify error cleared and VAT calculated correctly

**Validation Checks**:
- ✅ Initial state: `vat_calculation_error` = true, fallback to 0% VAT
- ✅ After retry: `vat_calculation_error` = false, correct VAT applied

---

## Automated Test Execution

### Run Backend Tests
```bash
cd backend/django_Admin3

# Run all Phase 4 cart VAT tests
python manage.py test cart.tests.test_cart_vat_integration -v 2

# Run specific test scenarios
python manage.py test cart.tests.test_cart_vat_integration.CartVATIntegrationTestCase.test_uk_customer_single_digital_product -v 2
python manage.py test cart.tests.test_cart_vat_integration.CartVATIntegrationTestCase.test_sa_customer_multiple_mixed_products -v 2
python manage.py test cart.tests.test_cart_vat_integration.CartVATIntegrationTestCase.test_row_customer_zero_vat -v 2
python manage.py test cart.tests.test_cart_vat_integration.CartVATIntegrationTestCase.test_quantity_change_recalculation -v 2
python manage.py test cart.tests.test_cart_vat_integration.CartVATIntegrationTestCase.test_item_removal_recalculation -v 2
python manage.py test cart.tests.test_cart_vat_integration.CartVATIntegrationTestCase.test_error_handling_manual_recalculation -v 2

# Check test coverage
python manage.py test --coverage --coverage-html
# Expected: >80% coverage for cart VAT integration code
```

### Run Frontend Tests
```bash
cd frontend/react-Admin3

# Run Cart VAT component tests
npm test -- --testPathPattern=Cart --coverage

# Run specific component tests
npm test -- Cart/CartVATDisplay.test.js
npm test -- Cart/CartVATError.test.js
npm test -- Cart/CartItemWithVAT.test.js
```

---

## Success Criteria

### Phase 4 Complete When:

**Backend**:
- ✅ All 6 cart VAT integration tests passing
- ✅ CartItem model has 6 new VAT fields
- ✅ Cart model has 3 new error tracking fields
- ✅ Cart signals trigger VAT recalculation on modifications
- ✅ `/api/cart/` endpoint returns VAT calculations
- ✅ `/api/cart/vat/recalculate/` endpoint works
- ✅ VATAudit records created for each calculation
- ✅ >80% test coverage for new code

**Frontend**:
- ✅ Cart page displays VAT-exclusive pricing (net prominent, VAT below)
- ✅ Per-item VAT breakdown visible
- ✅ Cart totals show aggregate VAT
- ✅ Error alert with "Recalculate VAT" button displays on failure
- ✅ Retry button successfully triggers recalculation
- ✅ All Cart VAT component tests passing

**Integration**:
- ✅ All 6 manual test scenarios pass
- ✅ VAT recalculates on add/remove/quantity change
- ✅ Error handling works end-to-end
- ✅ Phase 3 rules execute correctly for all regions
- ✅ VAT data persists in database

---

## Troubleshooting

### Issue: VAT not calculating (0% for all items)

**Possible Causes**:
1. Phase 3 rules not loaded
   - Solution: `python manage.py setup_vat_composite_rules`
2. Rules inactive
   - Solution: Check `ActedRule.objects.filter(active=True, entry_point='cart_calculate_vat').count()` = 17
3. User country_code not set
   - Solution: Update user.country_code field

### Issue: VAT calculation error

**Possible Causes**:
1. Invalid context schema
   - Solution: Check rules_engine logs for validation errors
2. Rules engine service down
   - Solution: Verify RuleEngine.execute() works in shell
3. Missing product_type in context
   - Solution: Ensure cart item includes product.product_type

### Issue: Frontend not displaying VAT

**Possible Causes**:
1. API response missing vat field
   - Solution: Check CartSerializer includes vat serialization
2. Component not rendering VAT section
   - Solution: Check CartVATDisplay component mounted
3. API authentication failure
   - Solution: Verify JWT token valid

---

## Next Steps

After successful quickstart validation:
1. Run full test suite: `python manage.py test --keepdb`
2. Check test coverage report: Open `htmlcov/index.html`
3. Manual UAT testing with real products
4. Performance testing: Verify <50ms VAT calculation time
5. Proceed to production deployment

---

**Quickstart Validation Complete** ✅
