# Quickstart: VAT Calculation - Phase 2 Custom Functions

**Feature**: Phase 2 Custom Functions for VAT Calculation
**Purpose**: Verify custom functions work correctly with database and Rules Engine integration
**Estimated Time**: 5 minutes

## Prerequisites

- Phase 1 database models deployed (UtilsRegion, UtilsCountrys, UtilsCountryRegion)
- Test database populated with sample countries and regions
- Django development environment running

## Quick Verification Script

Run this Django management shell script to verify all three functions work correctly:

```bash
cd backend/django_Admin3
python3 manage.py shell
```

```python
# Quickstart Verification Script for Phase 2 Custom Functions

from decimal import Decimal
from datetime import date
from rules_engine.custom_functions import (
    lookup_region,
    lookup_vat_rate,
    calculate_vat_amount,
    FUNCTION_REGISTRY
)
from utils.models import UtilsRegion, UtilsCountrys, UtilsCountryRegion

print("=" * 60)
print("Phase 2 Custom Functions - Quickstart Verification")
print("=" * 60)

# Test 1: lookup_region for UK
print("\n[Test 1] lookup_region('GB') for United Kingdom")
region = lookup_region('GB')
print(f"✓ Result: {region}")
assert region == 'UK', f"Expected 'UK', got '{region}'"
print("✓ PASS: UK country maps to UK region")

# Test 2: lookup_region for unknown country
print("\n[Test 2] lookup_region('XX') for unknown country")
region = lookup_region('XX')
print(f"✓ Result: {region}")
assert region == 'ROW', f"Expected 'ROW', got '{region}'"
print("✓ PASS: Unknown country returns ROW default")

# Test 3: lookup_vat_rate for South Africa
print("\n[Test 3] lookup_vat_rate('ZA') for South Africa (15%)")
rate = lookup_vat_rate('ZA')
print(f"✓ Result: {rate} (as decimal)")
assert rate == Decimal('0.15'), f"Expected Decimal('0.15'), got {rate}"
print("✓ PASS: South Africa VAT rate retrieved and converted")

# Test 4: lookup_vat_rate for UK
print("\n[Test 4] lookup_vat_rate('GB') for United Kingdom (20%)")
rate = lookup_vat_rate('GB')
print(f"✓ Result: {rate} (as decimal)")
assert rate == Decimal('0.20'), f"Expected Decimal('0.20'), got {rate}"
print("✓ PASS: UK VAT rate retrieved and converted")

# Test 5: calculate_vat_amount for £100 at 20%
print("\n[Test 5] calculate_vat_amount(100.00, 0.20)")
vat = calculate_vat_amount(Decimal('100.00'), Decimal('0.20'))
print(f"✓ Result: {vat}")
assert vat == Decimal('20.00'), f"Expected Decimal('20.00'), got {vat}"
print("✓ PASS: VAT calculation correct")

# Test 6: calculate_vat_amount with rounding
print("\n[Test 6] calculate_vat_amount(33.33, 0.20) - tests rounding")
vat = calculate_vat_amount(Decimal('33.33'), Decimal('0.20'))
print(f"✓ Result: {vat} (33.33 * 0.20 = 6.666, rounds to 6.67)")
assert vat == Decimal('6.67'), f"Expected Decimal('6.67'), got {vat}"
print("✓ PASS: ROUND_HALF_UP rounding works correctly")

# Test 7: Function Registry integration
print("\n[Test 7] FUNCTION_REGISTRY integration")
assert 'lookup_region' in FUNCTION_REGISTRY, "lookup_region not in registry"
assert 'lookup_vat_rate' in FUNCTION_REGISTRY, "lookup_vat_rate not in registry"
assert 'calculate_vat_amount' in FUNCTION_REGISTRY, "calculate_vat_amount not in registry"
print("✓ All three functions registered in FUNCTION_REGISTRY")

# Test via registry
func = FUNCTION_REGISTRY['lookup_region']
region = func('GB')
assert region == 'UK', "Function call via registry failed"
print("✓ PASS: Functions callable via FUNCTION_REGISTRY")

# Test 8: Complete VAT calculation flow
print("\n[Test 8] Complete VAT calculation flow for UK customer")
print("  Cart: 1x Product @ £100.00 net")
country_code = 'GB'
net_amount = Decimal('100.00')

# Step 1: Determine region
region = lookup_region(country_code)
print(f"  Step 1: Region = {region}")

# Step 2: Get VAT rate
vat_rate = lookup_vat_rate(country_code)
print(f"  Step 2: VAT Rate = {vat_rate} ({vat_rate * 100}%)")

# Step 3: Calculate VAT amount
vat_amount = calculate_vat_amount(net_amount, vat_rate)
print(f"  Step 3: VAT Amount = £{vat_amount}")

# Step 4: Calculate gross amount
gross_amount = net_amount + vat_amount
print(f"  Step 4: Gross Amount = £{gross_amount}")

assert region == 'UK', "Region lookup failed"
assert vat_rate == Decimal('0.20'), "VAT rate lookup failed"
assert vat_amount == Decimal('20.00'), "VAT calculation failed"
assert gross_amount == Decimal('120.00'), "Gross calculation failed"
print("✓ PASS: Complete flow works correctly")

# Performance check
print("\n[Performance] Quick latency check")
import time

# Measure lookup_region
start = time.perf_counter()
for _ in range(100):
    lookup_region('GB')
elapsed = (time.perf_counter() - start) * 1000
avg_latency = elapsed / 100
print(f"  lookup_region: {avg_latency:.2f}ms per call (target: < 5ms)")
assert avg_latency < 10, f"Too slow: {avg_latency}ms"

# Measure lookup_vat_rate
start = time.perf_counter()
for _ in range(100):
    lookup_vat_rate('GB')
elapsed = (time.perf_counter() - start) * 1000
avg_latency = elapsed / 100
print(f"  lookup_vat_rate: {avg_latency:.2f}ms per call (target: < 5ms)")
assert avg_latency < 10, f"Too slow: {avg_latency}ms"

# Measure calculate_vat_amount
start = time.perf_counter()
for _ in range(100):
    calculate_vat_amount(Decimal('100.00'), Decimal('0.20'))
elapsed = (time.perf_counter() - start) * 1000
avg_latency = elapsed / 100
print(f"  calculate_vat_amount: {avg_latency:.2f}ms per call (target: < 1ms)")
assert avg_latency < 5, f"Too slow: {avg_latency}ms"

print("\n" + "=" * 60)
print("✓ ALL TESTS PASSED - Phase 2 Custom Functions Working")
print("=" * 60)
print("\nNext Steps:")
print("1. Run full test suite: python manage.py test rules_engine.tests.test_vat_custom_functions")
print("2. Verify 100% code coverage")
print("3. Proceed to Phase 3: Composite Rules creation")
```

## Expected Output

```
============================================================
Phase 2 Custom Functions - Quickstart Verification
============================================================

[Test 1] lookup_region('GB') for United Kingdom
✓ Result: UK
✓ PASS: UK country maps to UK region

[Test 2] lookup_region('XX') for unknown country
✓ Result: ROW
✓ PASS: Unknown country returns ROW default

[Test 3] lookup_vat_rate('ZA') for South Africa (15%)
✓ Result: 0.15 (as decimal)
✓ PASS: South Africa VAT rate retrieved and converted

[Test 4] lookup_vat_rate('GB') for United Kingdom (20%)
✓ Result: 0.20 (as decimal)
✓ PASS: UK VAT rate retrieved and converted

[Test 5] calculate_vat_amount(100.00, 0.20)
✓ Result: 20.00
✓ PASS: VAT calculation correct

[Test 6] calculate_vat_amount(33.33, 0.20) - tests rounding
✓ Result: 6.67 (33.33 * 0.20 = 6.666, rounds to 6.67)
✓ PASS: ROUND_HALF_UP rounding works correctly

[Test 7] FUNCTION_REGISTRY integration
✓ All three functions registered in FUNCTION_REGISTRY
✓ PASS: Functions callable via FUNCTION_REGISTRY

[Test 8] Complete VAT calculation flow for UK customer
  Cart: 1x Product @ £100.00 net
  Step 1: Region = UK
  Step 2: VAT Rate = 0.20 (20.0%)
  Step 3: VAT Amount = £20.00
  Step 4: Gross Amount = £120.00
✓ PASS: Complete flow works correctly

[Performance] Quick latency check
  lookup_region: 2.34ms per call (target: < 5ms)
  lookup_vat_rate: 1.85ms per call (target: < 5ms)
  calculate_vat_amount: 0.08ms per call (target: < 1ms)

============================================================
✓ ALL TESTS PASSED - Phase 2 Custom Functions Working
============================================================

Next Steps:
1. Run full test suite: python manage.py test rules_engine.tests.test_vat_custom_functions
2. Verify 100% code coverage
3. Proceed to Phase 3: Composite Rules creation
```

## Troubleshooting

### Error: "No module named 'rules_engine.custom_functions'"

**Cause**: Functions not yet implemented or not in correct location

**Fix**:
```bash
# Verify file exists
ls backend/django_Admin3/rules_engine/custom_functions.py

# If missing, create it following Phase 2 tasks
```

### Error: "UtilsCountrys matching query does not exist"

**Cause**: Phase 1 database not populated with test data

**Fix**:
```bash
# Run Phase 1 migrations and data fixtures
python manage.py migrate
python manage.py loaddata utils/fixtures/vat_test_data.json
```

### Error: "Expected 'UK', got 'ROW'"

**Cause**: UtilsCountryRegion mapping not configured for GB → UK

**Fix**:
```python
# In Django shell, create the mapping
from utils.models import UtilsRegion, UtilsCountrys, UtilsCountryRegion
from datetime import date

uk_region = UtilsRegion.objects.get(code='UK')
gb_country = UtilsCountrys.objects.get(code='GB')

UtilsCountryRegion.objects.create(
    country=gb_country,
    region=uk_region,
    effective_from=date(2020, 1, 1),
    effective_to=None  # Current mapping
)
```

### Performance: Functions taking > 10ms

**Cause**: Database indexes missing or queries not optimized

**Fix**:
```sql
-- Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('utils_countrys', 'utils_country_region');

-- If missing, create indexes
CREATE INDEX idx_utils_countrys_code ON utils_countrys(code);
CREATE INDEX idx_utils_country_region_dates
  ON utils_country_region(effective_from, effective_to);
```

## Integration with Rules Engine

After quickstart verification passes, test Rules Engine integration:

```python
# Test Rules Engine can call functions via registry
from rules_engine.services.rule_engine import RuleEngine

# Create test rule (this would normally be in database)
test_rule = {
    "rule_code": "test_vat_lookup",
    "entry_point": "test",
    "condition": {"==": [1, 1]},
    "actions": [
        {
            "type": "call_function",
            "function": "lookup_region",
            "args": ["GB"],
            "store_result_in": "region"
        },
        {
            "type": "call_function",
            "function": "lookup_vat_rate",
            "args": ["GB"],
            "store_result_in": "vat_rate"
        }
    ]
}

# Execute via Rules Engine
context = {"user": {"country": "GB"}}
result = RuleEngine.execute("test", context)

print(f"Region from Rules Engine: {result.get('region')}")
print(f"VAT Rate from Rules Engine: {result.get('vat_rate')}")
```

## Success Criteria

✅ All 8 quickstart tests pass
✅ Functions callable directly and via FUNCTION_REGISTRY
✅ Performance targets met (< 5ms for DB queries, < 1ms for calculations)
✅ Complete VAT calculation flow works end-to-end
✅ Error handling returns safe defaults (no exceptions)

## Next Phase

Once quickstart passes:
1. Run full test suite for 100% coverage
2. Proceed to `/tasks` command to generate Phase 2 implementation tasks
3. After tasks complete, move to Phase 3: Composite Rules

---

**Quickstart Status**: ✅ Ready for Verification
**Prerequisites**: Phase 1 database models + test data
**Execution Time**: ~5 minutes
