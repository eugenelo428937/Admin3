# Phase 4 Test Scripts - Quick Reference

## Quick Start

```bash
# Navigate to Django directory
cd backend/django_Admin3

# Activate virtual environment
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# Ensure products exist
python manage.py import_subjects

# Run all tests
python run_all_phase4_tests.py
```

## Individual Tests

```bash
# T027: UK Single Product (£50 → £60 with 20% VAT)
python test_phase4_t027_uk_single_product.py

# T028: SA Multiple Products (R1100 → R1265 with 15% VAT)
python test_phase4_t028_sa_multiple_products.py

# T029: ROW Zero VAT (£100 → £100 with 0% VAT)
python test_phase4_t029_row_zero_vat.py

# T030: Quantity Change (qty 1→3, VAT scales £10→£30)
python test_phase4_t030_quantity_change.py

# T031: Item Removal (2 items→1, VAT £30→£20)
python test_phase4_t031_item_removal.py

# T032: Error Handling (error → fallback → retry)
python test_phase4_t032_error_handling.py
```

## Expected Results

| Test | Input | Expected Output |
|------|-------|-----------------|
| T027 | UK, £50 | Net: £50, VAT: £10 (20%), Gross: £60 |
| T028 | SA, R500+R600 | Net: R1100, VAT: R165 (15%), Gross: R1265 |
| T029 | US, £100 | Net: £100, VAT: £0 (0%), Gross: £100 |
| T030 | UK, £50×1→3 | VAT scales: £10 → £30 |
| T031 | UK, 2→1 items | VAT reduces: £30 → £20 |
| T032 | Error simulation | Fallback ROW, then correct on retry |

## Interpreting Output

### ✅ Success
```
✅ TEST PASSED: T027 - UK Customer Single Digital Product
```

### ❌ Failure
```
❌ TEST FAILED: Some validations did not pass
   ✗ Net amount: £50.00
   ✗ VAT amount: £10.00
```

### Verbose Mode
```bash
python run_all_phase4_tests.py --verbose
# Shows full output for failed tests
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "No Digital products found" | `python manage.py import_subjects` |
| Schema validation errors | Verify Phase 3 rules active: `python manage.py shell -c "from rules_engine.models import ActedRule; print(ActedRule.objects.filter(entry_point='cart_calculate_vat', active=True).count())"` |
| "cart_calculate_vat entry point missing" | Verify migration applied: `python manage.py migrate rules_engine` |

## File Locations

```
backend/django_Admin3/
├── test_phase4_t027_uk_single_product.py
├── test_phase4_t028_sa_multiple_products.py
├── test_phase4_t029_row_zero_vat.py
├── test_phase4_t030_quantity_change.py
├── test_phase4_t031_item_removal.py
├── test_phase4_t032_error_handling.py
├── run_all_phase4_tests.py
├── PHASE4_TEST_SCRIPTS_README.md (detailed docs)
└── PHASE4_QUICK_REFERENCE.md (this file)
```

## Cleanup Test Data

```bash
# Remove test users
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.filter(username__startswith='test_').delete()"

# Remove test carts
python manage.py shell -c "from cart.models import Cart; Cart.objects.filter(user__username__startswith='test_').delete()"
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Run Phase 4 Integration Tests
  run: |
    cd backend/django_Admin3
    python run_all_phase4_tests.py
```

## Windows PowerShell

```powershell
# Navigate and activate
cd C:\Code\Admin3\backend\django_Admin3
.\.venv\Scripts\Activate.ps1

# Run all tests
python run_all_phase4_tests.py
```

## Exit Codes

- `0` = All tests passed ✅
- `1` = One or more tests failed ❌
- `130` = Interrupted by user (Ctrl+C)

---

**Quick Tip**: Run `python run_all_phase4_tests.py` first. If all pass, your Phase 4 VAT integration is fully operational! 🎉
