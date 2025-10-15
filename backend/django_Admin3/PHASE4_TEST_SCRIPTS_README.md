# Phase 4 VAT Integration Test Scripts

Standalone Python scripts for validating Phase 4 Cart VAT Integration functionality.

## Overview

These scripts provide real-world validation of the VAT calculation system by:
- Creating test data (users, carts, products)
- Executing VAT calculations via rules engine
- Validating results against expected values
- Providing clear pass/fail output

## Prerequisites

1. **Django environment configured**:
   ```bash
   cd backend/django_Admin3
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   ```

2. **Database with product data**:
   ```bash
   python manage.py migrate
   python manage.py import_subjects  # Import products if not already done
   ```

3. **Rules Engine setup**:
   - Phase 1: VAT database models populated
   - Phase 2: Custom functions registered
   - Phase 3: 14 rules active at `cart_calculate_vat` entry point

## Test Scripts

### T027: UK Customer Single Digital Product
**File**: `test_phase4_t027_uk_single_product.py`

**Scenario**: UK customer adds single digital product (£50)

**Expected**:
- Net: £50.00
- VAT (20%): £10.00
- Gross: £60.00

**Run**:
```bash
python test_phase4_t027_uk_single_product.py
```

---

### T028: SA Customer Multiple Mixed Products
**File**: `test_phase4_t028_sa_multiple_products.py`

**Scenario**: SA customer adds Printed (R500) + Digital (R300 × 2)

**Expected**:
- Net: R1100.00
- VAT (15%): R165.00
- Gross: R1265.00

**Run**:
```bash
python test_phase4_t028_sa_multiple_products.py
```

---

### T029: ROW Customer Zero VAT
**File**: `test_phase4_t029_row_zero_vat.py`

**Scenario**: ROW customer (US) adds product (£100)

**Expected**:
- Net: £100.00
- VAT (0%): £0.00
- Gross: £100.00
- Region: ROW

**Run**:
```bash
python test_phase4_t029_row_zero_vat.py
```

---

### T030: Quantity Change Recalculation
**File**: `test_phase4_t030_quantity_change.py`

**Scenario**: UK customer adds product (£50, qty 1), then updates to qty 3

**Expected**:
- Initial: £50 → £10 VAT → £60
- Updated: £150 → £30 VAT → £180
- VAT timestamp updated

**Run**:
```bash
python test_phase4_t030_quantity_change.py
```

---

### T031: Item Removal Recalculation
**File**: `test_phase4_t031_item_removal.py`

**Scenario**: UK customer adds 2 products (£50 + £100), then removes first

**Expected**:
- Initial: £150 → £30 VAT → £180 (2 items)
- Updated: £100 → £20 VAT → £120 (1 item)

**Run**:
```bash
python test_phase4_t031_item_removal.py
```

---

### T032: Error Handling and Retry
**File**: `test_phase4_t032_error_handling.py`

**Scenario**: Simulate rules engine error → fallback to 0% VAT → retry → success

**Expected**:
- Error state: Fallback to ROW (0% VAT), error flags set
- Retry state: Correct UK VAT (20%), error flags cleared

**Run**:
```bash
python test_phase4_t032_error_handling.py
```

---

## Run All Tests

**File**: `run_all_phase4_tests.py`

Runs all 6 test scripts in sequence and provides summary report.

**Run**:
```bash
# Standard output
python run_all_phase4_tests.py

# Verbose output (shows details for failed tests)
python run_all_phase4_tests.py --verbose
```

**Sample Output**:
```
================================================================================
PHASE 4 INTEGRATION TEST SUITE
================================================================================

Started: 2025-10-14 15:30:00
Total Tests: 6

[1/6] Running T027: UK Customer Single Digital Product
--------------------------------------------------------------------------------
   ✅ PASSED

[2/6] Running T028: SA Customer Multiple Mixed Products
--------------------------------------------------------------------------------
   ✅ PASSED

... (remaining tests)

================================================================================
TEST SUMMARY
================================================================================

Total Tests: 6
Passed: 6
Failed: 0
Success Rate: 100.0%

Detailed Results:
  ✅ PASS - T027: UK Customer Single Digital Product
  ✅ PASS - T028: SA Customer Multiple Mixed Products
  ✅ PASS - T029: ROW Customer Zero VAT
  ✅ PASS - T030: Quantity Change Recalculation
  ✅ PASS - T031: Item Removal Recalculation
  ✅ PASS - T032: Error Handling and Retry

Completed: 2025-10-14 15:30:45
================================================================================
```

## Exit Codes

- **0**: All tests passed
- **1**: One or more tests failed
- **130**: Tests interrupted by user (Ctrl+C)

## Troubleshooting

### "No Digital products found"
**Solution**: Import product data
```bash
python manage.py import_subjects
```

### "Cannot resolve keyword 'is_available'"
**Solution**: Scripts use correct field structure. Verify ExamSessionSubjectProduct model has products.

### "Rules engine validation failed"
**Cause**: Using `item_type='fee'` without real product
**Solution**: Scripts automatically fetch real products with valid `product_type`

### "Schema validation errors"
**Cause**: Phase 3 rules expect product_type in ['Digital', 'Printed', 'FlashCard', 'PBOR', 'Tutorial']
**Solution**: Scripts filter for valid product types

## Integration with CI/CD

Add to your test pipeline:

```bash
#!/bin/bash
# Run Phase 4 integration tests

cd backend/django_Admin3
python run_all_phase4_tests.py

if [ $? -eq 0 ]; then
    echo "✅ Phase 4 integration tests passed"
else
    echo "❌ Phase 4 integration tests failed"
    exit 1
fi
```

## What Each Test Validates

| Test | Validates |
|------|-----------|
| T027 | Single-item VAT calculation for UK (20%) |
| T028 | Multi-item VAT aggregation for SA (15%) |
| T029 | Zero VAT for ROW countries (0%) |
| T030 | VAT recalculation on quantity updates |
| T031 | VAT recalculation on item removal |
| T032 | Error handling, fallback, and retry mechanism |

## Database Impact

All scripts:
- Create test users with pattern `test_<country>_<testid>`
- Use `get_or_create` to avoid duplicates
- Clean up cart items before each test
- **Do NOT** delete data after completion (for inspection)

To clean up test data:
```bash
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username__startswith='test_').delete()"
```

## Related Documentation

- **Phase 4 Spec**: `specs/004-phase-4/spec.md`
- **Quickstart Guide**: `specs/004-phase-4/quickstart.md`
- **Validation Guide**: `PHASE_1-4_VALIDATION_GUIDE.md`
- **Django Tests**: `cart/tests/test_cart_vat_integration.py`

---

**Generated**: 2025-10-14
**Phase**: Phase 4 - Cart VAT Integration
**Tests**: T027-T032
