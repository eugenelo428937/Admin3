# Task Breakdown: Epic 3 - Phase 1 - VAT Foundation & Rate Registry

**Created:** 2025-09-30
**Based on:** epic-3-dynamic-vat-calculation-system-plan.md
**Phase:** 1 of 9 - Foundation & VAT Rate Registry
**Duration:** 2-3 days

---

## Task List

### Backend Tasks - VAT Rate Registry

#### TASK-001: Create country/vat_rates.py module with VAT_RATES dictionary
- [ ] **Status:** Not Started
- **TDD Stage:** RED → Write tests first
- **Priority:** P0 (Critical)
- **Estimate:** 30 minutes
- **Files:**
  - `backend/django_Admin3/country/vat_rates.py` (NEW)
  - `backend/django_Admin3/country/tests/test_vat_rates.py` (NEW)
- **Test Requirements:**
  - Test VAT_RATES contains all required regions (UK, IE, SA, ROW, CH, GG)
  - Test all rates are Decimal type (not float)
  - Test precision is correct (2 decimal places)
- **Acceptance Criteria:**
  - ✅ VAT_RATES dictionary created with Decimal values
  - ✅ UK: 0.20, IE: 0.23, SA: 0.15, ROW/CH/GG: 0.00
  - ✅ All tests fail (RED phase)

**TDD Workflow:**
```bash
# 1. RED: Write failing test
cd backend/django_Admin3
# Create test file first, run to see it fail
python manage.py test country.tests.test_vat_rates::TestVATRates::test_vat_rates_exist

# 2. GREEN: Implement minimal code
# Create vat_rates.py with VAT_RATES dictionary

# 3. REFACTOR: Improve code quality
# Add docstrings, organize imports
```

---

#### TASK-002: Implement REGION_MAP dictionary with country-to-region mapping
- [ ] **Status:** Not Started
- **TDD Stage:** RED → Write tests first
- **Priority:** P0 (Critical)
- **Estimate:** 20 minutes
- **Files:**
  - `backend/django_Admin3/country/vat_rates.py` (UPDATE)
  - `backend/django_Admin3/country/tests/test_vat_rates.py` (UPDATE)
- **Test Requirements:**
  - Test UK region contains GB, UK
  - Test IE region contains IE
  - Test EC region contains all EU countries (27 countries)
  - Test SA region contains ZA
  - Test CH region contains CH
  - Test GG region contains GG
- **Acceptance Criteria:**
  - ✅ REGION_MAP created with all country codes
  - ✅ EC region contains all 27 EU country codes
  - ✅ All tests fail (RED phase)

**TDD Workflow:**
```python
# Test example
def test_region_map_uk():
    assert 'GB' in REGION_MAP['UK']
    assert 'UK' in REGION_MAP['UK']

def test_region_map_ec_complete():
    ec_countries = {'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
                   'DE', 'GR', 'HU', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL',
                   'PT', 'RO', 'SK', 'SI', 'ES', 'SE'}
    assert REGION_MAP['EC'] == ec_countries
```

---

#### TASK-003: Implement map_country_to_region() function
- [ ] **Status:** Not Started
- **TDD Stage:** RED → Write tests first
- **Priority:** P0 (Critical)
- **Estimate:** 30 minutes
- **Files:**
  - `backend/django_Admin3/country/vat_rates.py` (UPDATE)
  - `backend/django_Admin3/country/tests/test_vat_rates.py` (UPDATE)
- **Test Requirements:**
  - Test UK: GB → 'UK', UK → 'UK'
  - Test IE: IE → 'IE'
  - Test EC: DE → 'EC', FR → 'EC', ES → 'EC'
  - Test SA: ZA → 'SA'
  - Test CH: CH → 'CH'
  - Test GG: GG → 'GG'
  - Test ROW fallback: US → 'ROW', CA → 'ROW', JP → 'ROW'
  - Test case insensitivity: 'gb' → 'UK', 'de' → 'EC'
- **Acceptance Criteria:**
  - ✅ Function maps all specified countries correctly
  - ✅ Unknown countries default to ROW
  - ✅ Case insensitive (handles both 'GB' and 'gb')
  - ✅ All tests fail (RED phase)

**TDD Workflow:**
```python
# Test example
def test_map_country_to_region_uk():
    assert map_country_to_region('GB') == 'UK'
    assert map_country_to_region('UK') == 'UK'
    assert map_country_to_region('gb') == 'UK'  # Case insensitive

def test_map_country_to_region_row_fallback():
    assert map_country_to_region('US') == 'ROW'
    assert map_country_to_region('CA') == 'ROW'
    assert map_country_to_region('UNKNOWN') == 'ROW'
```

**Implementation Signature:**
```python
def map_country_to_region(country_code: str) -> str:
    """Map country code to VAT region."""
    pass
```

---

#### TASK-004: Implement get_vat_rate() function with classification logic
- [ ] **Status:** Not Started
- **TDD Stage:** RED → Write tests first
- **Priority:** P0 (Critical)
- **Estimate:** 45 minutes
- **Files:**
  - `backend/django_Admin3/country/vat_rates.py` (UPDATE)
  - `backend/django_Admin3/country/tests/test_vat_rates.py` (UPDATE)
- **Test Requirements:**
  - Test UK standard: 0.20
  - Test UK eBook: 0.00 (zero VAT)
  - Test IE standard: 0.23
  - Test ROW digital: 0.00 (zero VAT)
  - Test ROW physical: 0.00 (default ROW rate)
  - Test SA standard: 0.15
  - Test SA live tutorial: 0.15
  - Test EC standard: Use region default (future expansion)
  - Test return type is Decimal
- **Acceptance Criteria:**
  - ✅ UK eBooks return Decimal('0.00')
  - ✅ ROW digital products return Decimal('0.00')
  - ✅ SA products return Decimal('0.15')
  - ✅ All other combinations return region default
  - ✅ All returns are Decimal type
  - ✅ All tests fail (RED phase)

**TDD Workflow:**
```python
# Test examples
def test_get_vat_rate_uk_ebook():
    classification = {'is_ebook': True}
    rate = get_vat_rate('UK', classification)
    assert rate == Decimal('0.00')
    assert isinstance(rate, Decimal)

def test_get_vat_rate_uk_standard():
    classification = {'is_ebook': False}
    rate = get_vat_rate('UK', classification)
    assert rate == Decimal('0.20')
    assert isinstance(rate, Decimal)

def test_get_vat_rate_row_digital():
    classification = {'is_digital': True}
    rate = get_vat_rate('ROW', classification)
    assert rate == Decimal('0.00')

def test_get_vat_rate_sa():
    classification = {}
    rate = get_vat_rate('SA', classification)
    assert rate == Decimal('0.15')
```

**Implementation Signature:**
```python
def get_vat_rate(region: str, classification: dict) -> Decimal:
    """
    Get VAT rate based on region and product classification.

    Rules:
    - UK eBooks: 0% (post-2020)
    - ROW digital: 0%
    - SA specific products: 15%
    - Standard: region rate
    """
    pass
```

---

### Backend Tasks - Rules Engine Integration

#### TASK-005: Update rules_engine/custom_functions.py with VAT functions
- [ ] **Status:** Not Started
- **TDD Stage:** RED → Write tests first
- **Priority:** P0 (Critical)
- **Estimate:** 40 minutes
- **Files:**
  - `backend/django_Admin3/rules_engine/custom_functions.py` (UPDATE)
  - `backend/django_Admin3/rules_engine/tests/test_custom_functions_vat.py` (NEW)
- **Test Requirements:**
  - Test get_vat_rate registered in FUNCTION_REGISTRY
  - Test map_country_to_region registered in FUNCTION_REGISTRY
  - Test calculate_vat_amount registered in FUNCTION_REGISTRY
  - Test functions callable via registry
- **Acceptance Criteria:**
  - ✅ All three functions imported from country.vat_rates
  - ✅ All functions registered in FUNCTION_REGISTRY
  - ✅ Functions callable via registry lookup
  - ✅ All tests fail (RED phase)

**TDD Workflow:**
```python
# Test example
def test_vat_functions_registered():
    from rules_engine.custom_functions import FUNCTION_REGISTRY
    assert 'get_vat_rate' in FUNCTION_REGISTRY
    assert 'map_country_to_region' in FUNCTION_REGISTRY
    assert 'calculate_vat_amount' in FUNCTION_REGISTRY

def test_get_vat_rate_callable_via_registry():
    from rules_engine.custom_functions import FUNCTION_REGISTRY
    func = FUNCTION_REGISTRY['get_vat_rate']
    result = func('UK', {'is_ebook': True})
    assert result == Decimal('0.00')
```

**Implementation:**
```python
# rules_engine/custom_functions.py
from country.vat_rates import get_vat_rate, map_country_to_region
from decimal import Decimal, ROUND_HALF_UP

FUNCTION_REGISTRY = {
    "get_vat_rate": get_vat_rate,
    "map_country_to_region": map_country_to_region,
    # ... existing functions
}
```

---

#### TASK-006: Implement calculate_vat_amount() function with ROUND_HALF_UP
- [ ] **Status:** Not Started
- **TDD Stage:** RED → Write tests first
- **Priority:** P0 (Critical)
- **Estimate:** 30 minutes
- **Files:**
  - `backend/django_Admin3/rules_engine/custom_functions.py` (UPDATE)
  - `backend/django_Admin3/rules_engine/tests/test_custom_functions_vat.py` (UPDATE)
- **Test Requirements:**
  - Test basic calculation: 100.00 * 0.20 = 20.00
  - Test rounding up: 50.555 * 0.20 = 10.11 (10.111 rounds up)
  - Test rounding down: 50.554 * 0.20 = 10.11 (10.1108 rounds down)
  - Test zero rate: 100.00 * 0.00 = 0.00
  - Test return type is Decimal
  - Test precision is 2 decimal places
- **Acceptance Criteria:**
  - ✅ Calculation uses Decimal arithmetic
  - ✅ Rounding uses ROUND_HALF_UP
  - ✅ Result quantized to 0.01 (2 decimal places)
  - ✅ All tests fail (RED phase)

**TDD Workflow:**
```python
# Test examples
def test_calculate_vat_amount_basic():
    result = calculate_vat_amount(Decimal('100.00'), Decimal('0.20'))
    assert result == Decimal('20.00')
    assert isinstance(result, Decimal)

def test_calculate_vat_amount_rounding_up():
    # 50.555 * 0.20 = 10.111 → rounds to 10.11
    result = calculate_vat_amount(Decimal('50.555'), Decimal('0.20'))
    assert result == Decimal('10.11')

def test_calculate_vat_amount_rounding_down():
    # 50.554 * 0.20 = 10.1108 → rounds to 10.11
    result = calculate_vat_amount(Decimal('50.554'), Decimal('0.20'))
    assert result == Decimal('10.11')

def test_calculate_vat_amount_zero_rate():
    result = calculate_vat_amount(Decimal('100.00'), Decimal('0.00'))
    assert result == Decimal('0.00')
```

**Implementation Signature:**
```python
def calculate_vat_amount(net_amount, vat_rate):
    """Calculate VAT amount with proper rounding (ROUND_HALF_UP to 2 decimal places)."""
    amount = Decimal(str(net_amount)) * Decimal(str(vat_rate))
    return amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
```

---

#### TASK-007: Register calculate_vat_amount in FUNCTION_REGISTRY
- [ ] **Status:** Not Started
- **TDD Stage:** GREEN
- **Priority:** P0 (Critical)
- **Estimate:** 10 minutes
- **Files:**
  - `backend/django_Admin3/rules_engine/custom_functions.py` (UPDATE)
  - `backend/django_Admin3/rules_engine/tests/test_custom_functions_vat.py` (UPDATE)
- **Test Requirements:**
  - Test calculate_vat_amount registered
  - Test callable via registry
- **Acceptance Criteria:**
  - ✅ Function registered in FUNCTION_REGISTRY
  - ✅ Function callable via registry lookup
  - ✅ All tests pass (GREEN phase)

---

### Testing Tasks

#### TASK-008: Run complete test suite for vat_rates module
- [ ] **Status:** Not Started
- **TDD Stage:** REFACTOR
- **Priority:** P0 (Critical)
- **Estimate:** 20 minutes
- **Commands:**
  ```bash
  cd backend/django_Admin3
  python manage.py test country.tests.test_vat_rates --coverage
  ```
- **Coverage Requirements:**
  - Test coverage ≥ 100% for vat_rates.py
  - All tests pass
- **Acceptance Criteria:**
  - ✅ All 20+ tests pass
  - ✅ Coverage report shows 100% for vat_rates.py
  - ✅ No linting errors

---

#### TASK-009: Run complete test suite for custom_functions VAT integration
- [ ] **Status:** Not Started
- **TDD Stage:** REFACTOR
- **Priority:** P0 (Critical)
- **Estimate:** 15 minutes
- **Commands:**
  ```bash
  cd backend/django_Admin3
  python manage.py test rules_engine.tests.test_custom_functions_vat --coverage
  ```
- **Coverage Requirements:**
  - Test coverage ≥ 100% for VAT functions in custom_functions.py
  - All tests pass
- **Acceptance Criteria:**
  - ✅ All tests pass
  - ✅ Functions callable from rules engine
  - ✅ No integration issues

---

#### TASK-010: Verify Jenny specification compliance
- [ ] **Status:** Not Started
- **TDD Stage:** REFACTOR
- **Priority:** P1 (High)
- **Estimate:** 30 minutes
- **Process:**
  - Call /BMad:agents:qa agent
  - Provide evidence of implementation vs specification
  - Verify all acceptance criteria met
- **Acceptance Criteria:**
  - ✅ Jenny verification passes
  - ✅ All specification requirements met
  - ✅ Evidence-based assessment completed

---

### Documentation Tasks

#### TASK-011: Add docstrings to all vat_rates functions
- [ ] **Status:** Not Started
- **TDD Stage:** REFACTOR
- **Priority:** P2 (Medium)
- **Estimate:** 15 minutes
- **Files:**
  - `backend/django_Admin3/country/vat_rates.py` (UPDATE)
- **Requirements:**
  - Add module-level docstring
  - Add function docstrings with Args, Returns, Examples
  - Add inline comments for complex logic
- **Acceptance Criteria:**
  - ✅ All functions have clear docstrings
  - ✅ Examples provided for key functions
  - ✅ Type hints included

---

## Task Dependencies

```
TASK-001 (VAT_RATES) → TASK-002 (REGION_MAP) → TASK-003 (map_country_to_region)
                                              → TASK-004 (get_vat_rate)
TASK-004 → TASK-005 (Register in Rules Engine)
TASK-005 → TASK-006 (calculate_vat_amount) → TASK-007 (Register calculate_vat_amount)
TASK-007 → TASK-008 (Test vat_rates)
TASK-007 → TASK-009 (Test custom_functions)
TASK-008 + TASK-009 → TASK-010 (Jenny verification)
TASK-010 → TASK-011 (Documentation)
```

---

## TDD Workflow Reminder

For each task:
1. **RED:** Write failing test first
   ```bash
   python manage.py test [test_path] # Should FAIL
   ```

2. **GREEN:** Write minimal code to pass test
   ```bash
   python manage.py test [test_path] # Should PASS
   ```

3. **REFACTOR:** Improve code while keeping tests green
   ```bash
   python manage.py test [test_path] # Should still PASS
   ```

4. **Run full test suite before marking task complete**
   ```bash
   python manage.py test country.tests.test_vat_rates --coverage
   ```

---

## Progress Tracking

- **Total Tasks:** 11
- **Completed:** 0
- **In Progress:** 0
- **Blocked:** 0
- **Estimated Duration:** 2-3 days (total ~5 hours)

### Task Status Summary
| Task ID | Task Name | Status | TDD Stage | Assignee |
|---------|-----------|--------|-----------|----------|
| TASK-001 | VAT_RATES dictionary | ⬜ Not Started | RED | - |
| TASK-002 | REGION_MAP dictionary | ⬜ Not Started | RED | - |
| TASK-003 | map_country_to_region() | ⬜ Not Started | RED | - |
| TASK-004 | get_vat_rate() | ⬜ Not Started | RED | - |
| TASK-005 | Register functions | ⬜ Not Started | RED | - |
| TASK-006 | calculate_vat_amount() | ⬜ Not Started | RED | - |
| TASK-007 | Register calculate_vat_amount | ⬜ Not Started | GREEN | - |
| TASK-008 | Test vat_rates module | ⬜ Not Started | REFACTOR | - |
| TASK-009 | Test custom_functions | ⬜ Not Started | REFACTOR | - |
| TASK-010 | Jenny verification | ⬜ Not Started | REFACTOR | - |
| TASK-011 | Documentation | ⬜ Not Started | REFACTOR | - |

---

## Commands Quick Reference

```bash
# Backend Tests
cd backend/django_Admin3
python manage.py test country.tests.test_vat_rates
python manage.py test rules_engine.tests.test_custom_functions_vat

# Coverage Reports
python manage.py test country.tests.test_vat_rates --coverage
python manage.py test rules_engine.tests.test_custom_functions_vat --coverage

# Run ALL tests
python manage.py test

# Create test files
# backend/django_Admin3/country/tests/test_vat_rates.py
# backend/django_Admin3/rules_engine/tests/test_custom_functions_vat.py
```

---

*Generated by SpecKit for Admin3 project - Phase 1: VAT Foundation*

**Next:** Start with TASK-001 following strict TDD workflow (RED → GREEN → REFACTOR)