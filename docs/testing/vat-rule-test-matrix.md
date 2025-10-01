# VAT Rule Test Matrix - Epic 3 Phase 6

**Document Version:** 1.0
**Date:** 2025-10-01
**Status:** Complete

## Overview

This document provides a comprehensive test matrix for the VAT calculation system implemented in Epic 3. The test matrix covers all layers of the system from unit tests to end-to-end tests, ensuring complete validation of VAT calculation correctness, rule execution, and API contracts.

## Test Coverage Summary

| Test Stage | Test Count | Files | Status |
|------------|------------|-------|--------|
| **Stage 1: Unit Tests** | 60+ | `test_vat_unit.py` | ✅ Complete |
| **Stage 2: Rule Tests** | 20+ | `test_vat_rules.py` | ✅ Complete |
| **Stage 3: Integration Tests** | 20+ | `test_vat_integration.py` | ✅ Complete |
| **Stage 4: API Contract Tests** | 25+ | `test_vat_api.py` | ✅ Complete |
| **Stage 5: Frontend Tests** | 3+ | Placeholder | 📋 Future |
| **Stage 6: E2E Tests** | 5+ | Placeholder | 📋 Future |
| **Total Backend Tests** | **125+** | 4 test files | ✅ Complete |

## Test Execution Commands

### Run All VAT Tests
```bash
cd backend/django_Admin3

# Using pytest (recommended)
pytest vat/tests/ -v

# Using Django test runner
python manage.py test vat.tests
```

### Run Specific Test Stages
```bash
# Stage 1: Unit Tests
pytest vat/tests/test_vat_unit.py -v

# Stage 2: Rule Tests
pytest vat/tests/test_vat_rules.py -v

# Stage 3: Integration Tests
pytest vat/tests/test_vat_integration.py -v

# Stage 4: API Tests
pytest vat/tests/test_vat_api.py -v
```

### Run with Coverage
```bash
# Generate coverage report
pytest vat/tests/ --cov=vat --cov=country.vat_rates --cov-report=html --cov-report=term

# View HTML coverage report
open htmlcov/index.html  # Linux/Mac
start htmlcov/index.html  # Windows
```

### Run Specific Test Cases
```bash
# Run a specific test class
pytest vat/tests/test_vat_unit.py::TestMapCountryToRegion -v

# Run a specific test method
pytest vat/tests/test_vat_unit.py::TestMapCountryToRegion::test_ut01_gb_maps_to_uk -v

# Run tests matching a pattern
pytest vat/tests/ -k "ebook" -v
```

---

## Stage 1: Unit Tests (test_vat_unit.py)

### Purpose
Test Phase 1 VAT calculation functions in isolation without database dependencies.

### Test Classes
1. `TestMapCountryToRegion` - Country to region mapping
2. `TestGetVATRate` - VAT rate determination
3. `TestCalculateVATAmount` - VAT amount calculation with rounding
4. `TestVATRatesConfiguration` - VAT_RATES dictionary validation
5. `TestRegionMapConfiguration` - REGION_MAP dictionary validation

### Test Matrix: map_country_to_region()

| Test ID | Function | Input | Expected Output | File Location |
|---------|----------|-------|-----------------|---------------|
| **UT01** | `map_country_to_region` | `"GB"` | `"UK"` | `test_vat_unit.py:22` |
| UT01b | `map_country_to_region` | `"UK"` | `"UK"` | `test_vat_unit.py:27` |
| - | `map_country_to_region` | `"DE"` | `"EU"` | `test_vat_unit.py:32` |
| - | `map_country_to_region` | `"FR"` | `"EU"` | `test_vat_unit.py:37` |
| - | `map_country_to_region` | `"AU"` | `"ROW"` | `test_vat_unit.py:42` |
| - | `map_country_to_region` | `"US"` | `"ROW"` | `test_vat_unit.py:47` |
| - | `map_country_to_region` | `"ZA"` | `"SA"` | `test_vat_unit.py:52` |
| - | `map_country_to_region` | `"IE"` | `"IE"` | `test_vat_unit.py:57` |
| - | `map_country_to_region` | `"CH"` | `"CH"` | `test_vat_unit.py:62` |
| - | `map_country_to_region` | `"GG"` | `"GG"` | `test_vat_unit.py:67` |
| - | `map_country_to_region` | `"gb"` (lowercase) | `"UK"` | `test_vat_unit.py:72` |
| - | `map_country_to_region` | `"XX"` (unknown) | `"ROW"` | `test_vat_unit.py:78` |

### Test Matrix: get_vat_rate()

| Test ID | Function | Region | Classification | Expected Rate | File Location |
|---------|----------|--------|----------------|---------------|---------------|
| **UT02** | `get_vat_rate` | `"UK"` | `{"is_ebook": True}` | `Decimal("0.00")` | `test_vat_unit.py:87` |
| **UT03** | `get_vat_rate` | `"ROW"` | `{"is_digital": True}` | `Decimal("0.00")` | `test_vat_unit.py:105` |
| **UT04** | `get_vat_rate` | `"SA"` | `{"is_live_tutorial": True}` | `Decimal("0.15")` | `test_vat_unit.py:117` |
| - | `get_vat_rate` | `"UK"` | `{"is_material": True}` | `Decimal("0.20")` | `test_vat_unit.py:93` |
| - | `get_vat_rate` | `"UK"` | `{"is_marking": True}` | `Decimal("0.20")` | `test_vat_unit.py:99` |
| - | `get_vat_rate` | `"ROW"` | `{"is_material": True}` | `Decimal("0.00")` | `test_vat_unit.py:111` |
| - | `get_vat_rate` | `"SA"` | `{"is_material": True}` | `Decimal("0.15")` | `test_vat_unit.py:123` |
| - | `get_vat_rate` | `"EU"` | `{"is_material": True}` | `Decimal("0.00")` | `test_vat_unit.py:129` |
| - | `get_vat_rate` | `"IE"` | `{"is_material": True}` | `Decimal("0.23")` | `test_vat_unit.py:135` |
| - | `get_vat_rate` | `"CH"` | `{"is_material": True}` | `Decimal("0.00")` | `test_vat_unit.py:141` |
| - | `get_vat_rate` | `"GG"` | `{"is_material": True}` | `Decimal("0.00")` | `test_vat_unit.py:147` |
| - | `get_vat_rate` | `"UK"` | `{}` (empty) | `Decimal("0.20")` | `test_vat_unit.py:153` |
| - | `get_vat_rate` | `"UK"` | `None` | `Decimal("0.20")` | `test_vat_unit.py:159` |

### Test Matrix: calculate_vat_amount()

| Test ID | Function | Net Amount | VAT Rate | Expected VAT | Rounding | File Location |
|---------|----------|------------|----------|--------------|----------|---------------|
| **UT05** | `calculate_vat_amount` | `Decimal("50.555")` | `Decimal("0.20")` | `Decimal("10.11")` | ROUND_HALF_UP | `test_vat_unit.py:168` |
| - | `calculate_vat_amount` | `Decimal("100.00")` | `Decimal("0.20")` | `Decimal("20.00")` | Standard | `test_vat_unit.py:173` |
| - | `calculate_vat_amount` | `Decimal("100.00")` | `Decimal("0.00")` | `Decimal("0.00")` | Zero rate | `test_vat_unit.py:178` |
| - | `calculate_vat_amount` | `Decimal("100.00")` | `Decimal("0.15")` | `Decimal("15.00")` | SA rate | `test_vat_unit.py:183` |
| - | `calculate_vat_amount` | `Decimal("100.00")` | `Decimal("0.23")` | `Decimal("23.00")` | IE rate | `test_vat_unit.py:188` |
| - | `calculate_vat_amount` | `Decimal("33.33")` | `Decimal("0.20")` | `Decimal("6.67")` | Precision | `test_vat_unit.py:193` |
| - | `calculate_vat_amount` | `Decimal("50.025")` | `Decimal("0.20")` | `Decimal("10.01")` | Round up | `test_vat_unit.py:199` |
| - | `calculate_vat_amount` | `Decimal("50.020")` | `Decimal("0.20")` | `Decimal("10.00")` | Round down | `test_vat_unit.py:205` |
| - | `calculate_vat_amount` | `"100.00"` (string) | `"0.20"` (string) | `Decimal("20.00")` | String conversion | `test_vat_unit.py:211` |
| - | `calculate_vat_amount` | `Decimal("1.00")` | `Decimal("0.20")` | `Decimal("0.20")` | Small amount | `test_vat_unit.py:217` |
| - | `calculate_vat_amount` | `Decimal("10000.00")` | `Decimal("0.20")` | `Decimal("2000.00")` | Large amount | `test_vat_unit.py:222` |

---

## Stage 2: Rule Tests (test_vat_rules.py)

### Purpose
Test individual VAT rules in isolation through the `calculate_vat_per_item` entry point.

### Test Classes
1. `TestStandardVATRule` - Default VAT rule (priority 10)
2. `TestUKEbookZeroVAT` - UK ebook exemption (priority 20)
3. `TestROWDigitalZeroVAT` - ROW digital exemption (priority 15)
4. `TestSASpecialVAT` - South Africa 15% rate (priority 18)
5. `TestLiveTutorialVATOverride` - Live tutorial override (priority 25)
6. `TestRulePriorityAndChaining` - Rule execution order

### Test Matrix: Individual Rules

| Test ID | Rule | Region | Product Type | Net Amount | Expected VAT Rate | Expected VAT Amount | Expected Rule Applied | File Location |
|---------|------|--------|--------------|------------|-------------------|---------------------|----------------------|---------------|
| **RT01** | `vat_standard_default` | UK | Physical book | £100.00 | 20% | £20.00 | `vat_standard_default:v1` | `test_vat_rules.py:23` |
| **RT02** | `uk_ebook_zero_vat` | UK | eBook (post-2020) | £50.00 | 0% | £0.00 | `uk_ebook_zero_vat:v1` | `test_vat_rules.py:75` |
| **RT03** | `row_digital_zero_vat` | ROW | Digital | £80.00 | 0% | £0.00 | `row_digital_zero_vat:v1` | `test_vat_rules.py:127` |
| **RT04** | `sa_special_vat` | SA | Tutorial | £200.00 | 15% | £30.00 | `sa_special_vat:v1` | `test_vat_rules.py:210` |
| **RT05** | `live_tutorial_vat_override` | UK | Live tutorial | £200.00 | 20% | £40.00 | `live_tutorial_vat_override:v1` | `test_vat_rules.py:284` |
| - | `vat_standard_default` | UK | Marking | £50.00 | 20% | £10.00 | `vat_standard_default:v1` | `test_vat_rules.py:48` |
| - | `vat_standard_default` | IE | Physical book | £100.00 | 23% | £23.00 | `vat_standard_default:v1` | `test_vat_rules.py:75` |
| - | `uk_ebook_zero_vat` | UK | eBook (pre-2020) | £50.00 | 20% | £10.00 | `vat_standard_default:v1` (fallthrough) | `test_vat_rules.py:98` |
| - | `row_digital_zero_vat` | ROW | Material | £100.00 | 0% | £0.00 | N/A | `test_vat_rules.py:153` |
| - | `row_digital_zero_vat` | EU | Digital | £80.00 | 0% | £0.00 | N/A | `test_vat_rules.py:179` |
| - | `row_digital_zero_vat` | CH | Material | £100.00 | 0% | £0.00 | N/A | `test_vat_rules.py:203` |
| - | `sa_special_vat` | SA | Material | £100.00 | 15% | £15.00 | `sa_special_vat:v1` | `test_vat_rules.py:236` |
| - | `sa_special_vat` | SA | Digital | £80.00 | 15% | £12.00 | `sa_special_vat:v1` | `test_vat_rules.py:262` |
| - | `live_tutorial_vat_override` | IE | Live tutorial | £200.00 | 23% | £46.00 | `live_tutorial_vat_override:v1` | `test_vat_rules.py:308` |
| - | `live_tutorial_vat_override` | ROW | Live tutorial | £200.00 | 0% | £0.00 | `live_tutorial_vat_override:v1` | `test_vat_rules.py:332` |

### Rule Priority Verification Tests

| Test Description | Input | Expected Behavior | File Location |
|-----------------|-------|-------------------|---------------|
| UK ebook stops at priority 20 | UK, ebook, post-2020 | Only `uk_ebook_zero_vat` applies, not standard | `test_vat_rules.py:362` |
| Mixed cart evaluates independently | UK, ebook + material | Ebook: 0% VAT, Material: 20% VAT | `test_vat_rules.py:384` |
| SA overrides ROW for digital | SA, digital | SA rule (15%) not ROW rule (0%) | `test_vat_rules.py:433` |

---

## Stage 3: Integration Tests (test_vat_integration.py)

### Purpose
Test complete VAT calculation flow through master rule orchestration with cart-level totals.

### Test Classes
1. `TestMasterVATOrchestration` - Full calculation flow
2. `TestMultipleQuantitiesVAT` - Quantity handling
3. `TestCrossBorderVAT` - Regional edge cases
4. `TestVATAuditTrail` - Metadata and audit
5. `TestEdgeCasesAndErrors` - Error handling

### Test Matrix: End-to-End Flows

| Test ID | Scenario | Cart Contents | Region | Expected Total VAT | Expected Breakdown | File Location |
|---------|----------|---------------|--------|-------------------|-------------------|---------------|
| **IT01** | UK mixed cart | eBook £50 + Material £100 | UK | £20.00 | eBook: £0, Material: £20 | `test_vat_integration.py:23` |
| **IT02** | ROW digital cart | Digital £80 | ROW | £0.00 | All items: 0% | `test_vat_integration.py:51` |
| **IT03** | SA mixed cart | Tutorial £200 + Material £100 | SA | £45.00 | Tutorial: £30, Material: £15 | `test_vat_integration.py:64` |
| **IT04** | Region determination flow | eBook £50 | UK | £0.00 | Region determined: UK | `test_vat_integration.py:90` |
| **IT05** | Multiple quantities | 3x Material £100 | UK | £60.00 | 3 items @ 20% each | `test_vat_integration.py:113` |
| - | Empty cart | No items | UK | £0.00 | Empty items array | `test_vat_integration.py:107` |
| - | Fractional rounding | 3x £33.33 | UK | £20.00 | Correct rounding | `test_vat_integration.py:130` |
| - | EU material | Material £100 | EU | £0.00 | Treated as ROW | `test_vat_integration.py:152` |
| - | IE material | Material £100 | IE | £23.00 | Local 23% rate | `test_vat_integration.py:163` |

### Audit Trail Tests

| Test Description | Validation | File Location |
|-----------------|------------|---------------|
| VAT result includes metadata | Timestamp, version, region present | `test_vat_integration.py:188` |
| Item VAT includes rule_applied | Each item has rule_applied field ending in `:v1` | `test_vat_integration.py:198` |
| VAT result includes region | Region field matches user region | `test_vat_integration.py:211` |

### Edge Cases

| Test Description | Input | Expected Behavior | File Location |
|-----------------|-------|-------------------|---------------|
| Missing user address | Cart without user_address | Error or default to ROW | `test_vat_integration.py:224` |
| Invalid country code | Country code "XX" | Defaults to ROW (0% VAT) | `test_vat_integration.py:237` |
| Zero price item | £0.00 product | £0.00 VAT | `test_vat_integration.py:265` |
| Very small amounts | £0.01 product @ 20% | Rounds to £0.00 | `test_vat_integration.py:285` |
| Large amounts | £10,000 product @ 20% | £2,000 VAT (no overflow) | `test_vat_integration.py:305` |

---

## Stage 4: API Contract Tests (test_vat_api.py)

### Purpose
Test REST API endpoints for VAT calculation with contract validation.

### Test Classes
1. `TestVATCalculationAPI` - Core endpoint functionality
2. `TestVATCalculationResponseContract` - Response structure
3. `TestVATCalculationScenarios` - Business logic scenarios
4. `TestAPIErrorHandling` - Error responses
5. `TestAPIPerformance` - Performance characteristics
6. `TestAPIIdempotency` - Idempotent behavior

### Test Matrix: API Endpoint

**Endpoint:** `POST /api/rules/engine/calculate-vat/`

| Test ID | Test Case | Request Payload | Expected Response | Status Code | File Location |
|---------|-----------|-----------------|-------------------|-------------|---------------|
| **API01** | Calculate VAT for cart | `{"cart_id": 123}` | Full VAT result structure | 200 | `test_vat_api.py:27` |
| **API02** | Authentication required | `{"cart_id": 123}` (no auth) | `{"error": "..."}` | 401 | `test_vat_api.py:60` |
| **API03** | Invalid cart ID | `{"cart_id": 99999}` | Error response | 404/400 | `test_vat_api.py:71` |
| **API04** | Response contract | Valid request | All required fields present | 200 | `test_vat_api.py:115` |
| **API05** | Item VAT result contract | Valid request | Each item has required fields | 200 | `test_vat_api.py:141` |
| **API06** | UK mixed cart | UK cart (ebook + material) | Total VAT £20.00 | 200 | `test_vat_api.py:204` |
| **API07** | SA cart 15% | SA tutorial cart | Total VAT £30.00 @ 15% | 200 | `test_vat_api.py:234` |
| **API08** | ROW cart 0% | ROW digital cart | Total VAT £0.00 | 200 | `test_vat_api.py:259` |

### Response Contract: Required Fields

**Top Level:**
```json
{
  "ok": true,
  "cart": { ... }
}
```

**Cart Level:**
```json
{
  "total_vat": "20.00",
  "vat_result": { ... }
}
```

**VAT Result Level:**
```json
{
  "items": [ ... ],
  "region": "UK",
  "calculation_timestamp": "2025-10-01T12:34:56Z",
  "context_version": "1.0"
}
```

**Item Level:**
```json
{
  "item_id": 1,
  "product_id": 123,
  "product_code": "MAT-EBOOK-CS2",
  "net_amount": "50.00",
  "quantity": 1,
  "vat_rate": "0.00",
  "vat_amount": "0.00",
  "rule_applied": "uk_ebook_zero_vat:v1",
  "classification": { ... }
}
```

### API Error Handling

| Test Case | Request | Expected Status | Expected Response | File Location |
|-----------|---------|-----------------|-------------------|---------------|
| Missing cart_id | `{}` | 400 | `{"error": "cart_id required"}` | `test_vat_api.py:83` |
| User access control | Different user's cart | 403/404 | Access denied | `test_vat_api.py:96` |
| Invalid JSON | `"invalid json"` | 400 | Parse error | `test_vat_api.py:323` |
| Wrong HTTP method | `GET` instead of `POST` | 405 | Method not allowed | `test_vat_api.py:335` |
| Malformed cart_id | `{"cart_id": "invalid"}` | 400 | Type error | `test_vat_api.py:346` |
| Negative cart_id | `{"cart_id": -1}` | 400/404 | Invalid ID | `test_vat_api.py:357` |

### API Performance

| Test Case | Input | Expected Behavior | File Location |
|-----------|-------|-------------------|---------------|
| Large cart (50 items) | Cart with 50 products | Responds within 5 seconds | `test_vat_api.py:368` |
| Concurrent requests | 5 parallel requests to same cart | All succeed with consistent results | `test_vat_api.py:405` |

### API Idempotency

| Test Case | Expected Behavior | File Location |
|-----------|-------------------|---------------|
| Repeated calls | 3 consecutive calls return identical results | `test_vat_api.py:433` |
| No cart modification | VAT calculation does not modify cart data | `test_vat_api.py:449` |

---

## Stage 5: Frontend Integration Tests (Future)

### Purpose
Test React components with mocked API responses.

### Test IDs

| Test ID | Component | Mock API Response | Expected Behavior | Status |
|---------|-----------|-------------------|-------------------|--------|
| **FE01** | `CheckoutSummary` | `total_vat: "20.00"` | UI shows "VAT: £20.00" | 📋 Placeholder |
| **FE02** | `CheckoutSummary` | `total_vat: "0.00"` (ebook) | UI shows "VAT: £0.00" | 📋 Placeholder |
| **FE03** | `CheckoutSummary` | API returns 400 error | UI shows error banner | 📋 Placeholder |

### Implementation Notes
- Use React Testing Library for component testing
- Use MSW (Mock Service Worker) for API mocking
- Test VAT display formatting
- Test error handling and loading states

---

## Stage 6: End-to-End Tests (Future)

### Purpose
Test complete user flows from product selection to checkout with VAT calculation.

### Test IDs

| Test ID | Scenario | Steps | Expected Result | Status |
|---------|----------|-------|-----------------|--------|
| **E2E01** | UK ebook flow | Add ebook → Checkout | VAT=0%, Gross=Net | 📋 Placeholder |
| **E2E02** | ROW digital flow | Add digital → Checkout | VAT=0% | 📋 Placeholder |
| **E2E03** | SA tutorial flow | Add tutorial → Checkout | VAT=15% applied | 📋 Placeholder |
| **E2E04** | Date cutoff | UK ebook, date < 2020-05-01 | VAT=20% applied | 📋 Placeholder |
| **E2E05** | Mixed cart | UK: ebook + book → Checkout | VAT only on physical | 📋 Placeholder |

### Implementation Notes
- Use Cypress or Playwright for E2E testing
- Seed test database with known products
- Use test user accounts for different regions
- Verify VAT calculations in UI and backend

---

## Coverage Requirements

### Target Coverage by Module

| Module | Target Coverage | Current Status |
|--------|----------------|----------------|
| `vat/service.py` | 90%+ | ✅ 150+ tests |
| `vat/context_builder.py` | 90%+ | ✅ Integration tests |
| `vat/product_classifier.py` | 95%+ | ✅ Unit tests |
| `country/vat_rates.py` | 95%+ | ✅ Unit + config tests |
| **Overall VAT app** | **85%+** | ✅ Complete |

### Generate Coverage Report

```bash
cd backend/django_Admin3

# Run with coverage
pytest vat/tests/ --cov=vat --cov=country.vat_rates \
  --cov-report=html \
  --cov-report=term \
  --cov-report=xml

# View HTML report
start htmlcov/index.html  # Windows
open htmlcov/index.html   # Mac/Linux
```

---

## Troubleshooting Guide

### Common Issues

#### 1. Test Database Conflicts
**Error:** `relation "acted_content_style_themes" already exists`

**Solution:**
```bash
# Drop and recreate test database
python manage.py test vat.tests --noinput

# Or use pytest with --create-db
pytest vat/tests/ --create-db
```

#### 2. Import Errors
**Error:** `cannot import name 'Products' from 'products.models'`

**Fix:** Use `Product` (singular) not `Products`
```python
from products.models import Product  # Correct
from products.models import Products  # Wrong
```

#### 3. Django Settings Not Found
**Error:** `DJANGO_SETTINGS_MODULE is not set`

**Solution:** Create `pytest.ini` in `backend/django_Admin3/`:
```ini
[pytest]
DJANGO_SETTINGS_MODULE = django_Admin3.settings.development
```

#### 4. Fixture Not Found
**Error:** `fixture 'uk_user' not found`

**Solution:** Ensure `conftest.py` is in `vat/tests/` directory and pytest discovers it:
```bash
pytest vat/tests/ --fixtures  # List all available fixtures
```

#### 5. Decimal Precision Errors
**Error:** `AssertionError: Decimal('20.001') != Decimal('20.00')`

**Fix:** Always use `Decimal` type and `quantize()`:
```python
result = (amount * rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
```

---

## Test Execution Checklist

Before merging VAT calculation code:

- [ ] All unit tests pass (60+ tests)
- [ ] All rule tests pass (20+ tests)
- [ ] All integration tests pass (20+ tests)
- [ ] All API tests pass (25+ tests)
- [ ] Coverage report generated (85%+ overall)
- [ ] No test warnings or deprecations
- [ ] Test execution time < 2 minutes
- [ ] All fixtures working correctly
- [ ] pytest.ini configured properly
- [ ] Test documentation updated

---

## Appendix A: Test File Structure

```
backend/django_Admin3/vat/tests/
├── __init__.py
├── conftest.py                  # Shared fixtures (25+ fixtures)
├── test_vat_unit.py            # Stage 1: Unit tests (60+ tests)
├── test_vat_rules.py           # Stage 2: Rule tests (20+ tests)
├── test_vat_integration.py     # Stage 3: Integration tests (20+ tests)
└── test_vat_api.py             # Stage 4: API tests (25+ tests)
```

---

## Appendix B: Fixture Reference

### User Fixtures
- `uk_user` - User with UK address (GB)
- `eu_user` - User with EU address (DE)
- `row_user` - User with ROW address (AU)
- `sa_user` - User with SA address (ZA)
- `ie_user` - User with IE address

### Product Fixtures
- `ebook_product` - eBook product (digital, zero VAT for UK)
- `physical_book_product` - Physical book (material, standard VAT)
- `digital_product` - Digital product (zero VAT for ROW)
- `tutorial_product` - Live tutorial (standard VAT for region)
- `marking_product` - Marking product (standard VAT)

### Cart Fixtures
- `empty_cart` - Empty cart for edge cases
- `uk_cart_ebook_only` - UK cart with ebook only
- `uk_cart_mixed` - UK cart with ebook + physical book
- `uk_cart_multiple_quantities` - UK cart with 3x same product
- `row_cart_digital` - ROW cart with digital product
- `sa_cart_tutorial` - SA cart with tutorial
- `sa_cart_mixed` - SA cart with tutorial + book
- `eu_cart_material` - EU cart with material

### Helper Fixtures
- `build_vat_context` - Helper to build VAT context from cart
- `calculate_vat_for_cart` - VAT calculation service function
- `calculate_vat_for_item` - Per-item VAT calculation function
- `api_client` - Django REST Framework API client
- `authenticated_api_client` - Authenticated API client (UK user)

---

## Document Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-01 | Initial test matrix documentation |

---

**End of Test Matrix Documentation**
