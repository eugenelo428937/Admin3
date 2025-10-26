# Quickstart: VAT Calculation - Phase 3 Composite Rules

**Feature**: Phase 3 Composite Rule Hierarchy for VAT Calculation
**Purpose**: Verify composite rules are created correctly and execute VAT calculations end-to-end
**Estimated Time**: 10 minutes

## Prerequisites

- Phase 2 custom functions deployed (`lookup_region`, `lookup_vat_rate`, `calculate_vat_amount`)
- Rules Engine models in database (ActedRule, ActedRulesFields, RuleExecution)
- Test database populated with Phase 1 data (UtilsRegion, UtilsCountrys, UtilsCountryRegion)
- Django development environment running

## Step 1: Run Management Command

Create all 17 composite VAT rules:

```bash
cd backend/django_Admin3
python manage.py setup_vat_composite_rules --verbose
```

**Expected Output**:
```
Creating VAT composite rules...
✓ Created context schema: cart_vat_context_schema
✓ Created master rule: calculate_vat (priority 100)
✓ Created regional rules (5):
  - calculate_vat_uk (priority 90)
  - calculate_vat_ie (priority 90)
  - calculate_vat_eu (priority 90)
  - calculate_vat_sa (priority 90)
  - calculate_vat_row (priority 90)
✓ Created product rules (11):
  - calculate_vat_uk_digital_product (priority 95)
  - calculate_vat_uk_printed_product (priority 85)
  - calculate_vat_uk_flash_card (priority 80)
  - calculate_vat_uk_pbor (priority 80)
  - calculate_vat_ie_product (priority 85)
  - calculate_vat_eu_product (priority 85)
  - calculate_vat_sa_product (priority 85)
  - calculate_vat_row_product (priority 85)
  [+ 3 more product rules]

✅ All 17 rules created successfully!

Verification:
  1. Run: python manage.py shell
  2. Test: from specs.003-phase-3 import quickstart_verification
```

## Step 2: Verify Rules in Database

```bash
python manage.py shell
```

```python
from rules_engine.models import ActedRule

# Count rules at cart_calculate_vat entry point
rules = ActedRule.objects.filter(entry_point="cart_calculate_vat", active=True).order_by('-priority')
print(f"Total active rules: {rules.count()}")  # Should be 17

# Verify master rule
master = rules.filter(rule_id="calculate_vat").first()
print(f"Master rule priority: {master.priority}")  # Should be 100

# Verify regional rules
regional = rules.filter(priority=90)
print(f"Regional rules: {regional.count()}")  # Should be 5

# Verify product rules
product = rules.filter(priority__lt=90)
print(f"Product rules: {product.count()}")  # Should be 11

print("\n✅ All rules verified!")
```

## Step 3: End-to-End VAT Calculation Test

Test full rule execution flow with sample cart:

```python
from decimal import Decimal
from rules_engine.services.rule_engine import RuleEngine

# Test 1: UK Digital Product (£50 net → £10 VAT → £60 gross)
print("\n[Test 1] UK Digital Product")
context = {
    "cart_item": {
        "id": "item_test_1",
        "product_type": "Digital",
        "net_amount": Decimal("50.00")
    },
    "user": {
        "id": "user_test_1",
        "country_code": "GB"
    },
    "vat": {}
}

result = RuleEngine.execute("cart_calculate_vat", context)

print(f"  Region: {result['vat']['region']}")  # Should be 'UK'
print(f"  VAT Rate: {result['vat']['rate']}")  # Should be 0.20
print(f"  VAT Amount: {result['cart_item']['vat_amount']}")  # Should be 10.00
print(f"  Gross Amount: {result['cart_item']['gross_amount']}")  # Should be 60.00

assert result['vat']['region'] == 'UK', "Region mismatch"
assert result['vat']['rate'] == Decimal('0.20'), "VAT rate mismatch"
assert result['cart_item']['vat_amount'] == Decimal('10.00'), "VAT amount mismatch"
assert result['cart_item']['gross_amount'] == Decimal('60.00'), "Gross amount mismatch"
print("✓ PASS: UK Digital Product")

# Test 2: South Africa Printed Product (R500 net → R75 VAT → R575 gross)
print("\n[Test 2] South Africa Printed Product")
context = {
    "cart_item": {
        "id": "item_test_2",
        "product_type": "Printed",
        "net_amount": Decimal("500.00")
    },
    "user": {
        "id": "user_test_2",
        "country_code": "ZA"
    },
    "vat": {}
}

result = RuleEngine.execute("cart_calculate_vat", context)

print(f"  Region: {result['vat']['region']}")  # Should be 'SA'
print(f"  VAT Rate: {result['vat']['rate']}")  # Should be 0.15
print(f"  VAT Amount: {result['cart_item']['vat_amount']}")  # Should be 75.00
print(f"  Gross Amount: {result['cart_item']['gross_amount']}")  # Should be 575.00

assert result['vat']['region'] == 'SA', "Region mismatch"
assert result['vat']['rate'] == Decimal('0.15'), "VAT rate mismatch"
assert result['cart_item']['vat_amount'] == Decimal('75.00'), "VAT amount mismatch"
assert result['cart_item']['gross_amount'] == Decimal('575.00'), "Gross amount mismatch"
print("✓ PASS: SA Printed Product")

# Test 3: Unknown Country (ROW fallback, zero VAT)
print("\n[Test 3] Unknown Country (ROW fallback)")
context = {
    "cart_item": {
        "id": "item_test_3",
        "product_type": "Digital",
        "net_amount": Decimal("100.00")
    },
    "user": {
        "id": "user_test_3",
        "country_code": "XX"  # Unknown country
    },
    "vat": {}
}

result = RuleEngine.execute("cart_calculate_vat", context)

print(f"  Region: {result['vat']['region']}")  # Should be 'ROW'
print(f"  VAT Rate: {result['vat']['rate']}")  # Should be 0.00
print(f"  VAT Amount: {result['cart_item']['vat_amount']}")  # Should be 0.00
print(f"  Gross Amount: {result['cart_item']['gross_amount']}")  # Should be 100.00

assert result['vat']['region'] == 'ROW', "Region mismatch"
assert result['vat']['rate'] == Decimal('0.00'), "VAT rate mismatch"
assert result['cart_item']['vat_amount'] == Decimal('0.00'), "VAT amount mismatch"
assert result['cart_item']['gross_amount'] == Decimal('100.00'), "Gross amount mismatch"
print("✓ PASS: Unknown country ROW fallback")

print("\n" + "=" * 60)
print("✅ ALL TESTS PASSED - Phase 3 Composite Rules Working")
print("=" * 60)
```

## Step 4: Verify Audit Trail

Check RuleExecution logs for audit compliance:

```python
from rules_engine.models import RuleExecution

# Get recent executions for cart_calculate_vat entry point
executions = RuleExecution.objects.filter(entry_point="cart_calculate_vat").order_by('-executed_at')[:10]

print(f"\nRecent rule executions: {executions.count()}")

for exe in executions:
    print(f"\n  Rule: {exe.rule.name}")
    print(f"  Success: {exe.success}")
    print(f"  Duration: {exe.execution_duration_ms}ms")
    print(f"  Context snapshot: {exe.context_snapshot}")
    print(f"  Result: {exe.result}")

print("\n✅ Audit trail verified")
```

## Step 5: Performance Validation

Test performance targets (< 50ms for typical cart):

```python
import time

print("\n[Performance] VAT Calculation Latency Test")

context = {
    "cart_item": {"id": "perf_test", "product_type": "Digital", "net_amount": Decimal("100.00")},
    "user": {"id": "user_perf", "country_code": "GB"},
    "vat": {}
}

# Measure 100 executions
start = time.perf_counter()
for _ in range(100):
    RuleEngine.execute("cart_calculate_vat", context)
elapsed = (time.perf_counter() - start) * 1000
avg_latency = elapsed / 100

print(f"  Average latency: {avg_latency:.2f}ms per calculation")
print(f"  Target: < 50ms for typical cart")

assert avg_latency < 50, f"Too slow: {avg_latency}ms"
print("✓ PASS: Performance target met")
```

## Step 6: Multi-Item Cart Test

Test multiple items with different product types:

```python
print("\n[Test 4] Multi-Item Cart (UK customer)")

cart_items = [
    {"id": "item_1", "product_type": "Digital", "net_amount": Decimal("50.00")},
    {"id": "item_2", "product_type": "Printed", "net_amount": Decimal("100.00")},
    {"id": "item_3", "product_type": "FlashCard", "net_amount": Decimal("30.00")}
]

total_vat = Decimal("0.00")
total_gross = Decimal("0.00")

for item in cart_items:
    context = {
        "cart_item": item,
        "user": {"id": "user_multi", "country_code": "GB"},
        "vat": {}
    }
    result = RuleEngine.execute("cart_calculate_vat", context)

    vat_amount = result['cart_item']['vat_amount']
    gross_amount = result['cart_item']['gross_amount']

    print(f"  Item {item['id']}: £{item['net_amount']} + £{vat_amount} VAT = £{gross_amount}")

    total_vat += vat_amount
    total_gross += gross_amount

print(f"\n  Total VAT: £{total_vat}")  # Should be 10 + 20 + 6 = £36.00
print(f"  Total Gross: £{total_gross}")  # Should be £216.00

assert total_vat == Decimal("36.00"), "Total VAT mismatch"
print("✓ PASS: Multi-item cart calculation correct")
```

## Troubleshooting

### Error: "No rules found for entry_point"

**Cause**: Management command not run or rules not created

**Fix**:
```bash
python manage.py setup_vat_composite_rules --force
```

### Error: "KeyError: 'vat'"

**Cause**: Context structure incorrect

**Fix**: Ensure context has `vat: {}` empty object:
```python
context = {
    "cart_item": {...},
    "user": {...},
    "vat": {}  # Required
}
```

### Error: "Phase 2 functions not found"

**Cause**: Phase 2 custom functions not deployed

**Fix**:
```bash
# Verify Phase 2 functions exist
python manage.py shell
>>> from rules_engine.custom_functions import lookup_region, lookup_vat_rate, calculate_vat_amount
>>> lookup_region('GB')  # Should return 'UK'
```

### Performance: Calculations taking > 50ms

**Cause**: Database indexes missing or not optimized

**Fix**:
```sql
-- Verify indexes exist
SELECT indexname FROM pg_indexes
WHERE tablename = 'acted_rules_engine'
  AND indexdef LIKE '%entry_point%';

-- If missing, indexes should have been created with Rules Engine migrations
```

## Success Criteria

✅ 17 rules created in database (1 master + 5 regional + 11 product)
✅ Master rule executes first (priority 100)
✅ Regional rules execute after master (priority 90)
✅ Product rules execute last (priority 80-95)
✅ Context enriched at each level (region → rate → VAT amount)
✅ VAT calculations correct (UK 20%, SA 15%, ROW 0%)
✅ Audit trail complete (RuleExecution logs)
✅ Performance < 50ms per cart item

## Next Phase

Once quickstart passes:
1. Run full test suite: `python manage.py test rules_engine.tests.test_composite_vat_rules`
2. Run integration tests: `python manage.py test rules_engine.tests.test_vat_integration`
3. Proceed to Phase 4: Cart integration

---

**Quickstart Status**: ✅ Ready for Verification
**Prerequisites**: Phase 2 custom functions deployed
**Execution Time**: ~10 minutes
