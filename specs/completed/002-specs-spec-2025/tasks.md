# Implementation Tasks: VAT Calculation - Phase 2 Custom Functions

**Feature**: Phase 2 Custom Functions for VAT Calculation
**Branch**: `002-specs-spec-2025`
**Status**: Ready for Implementation
**Estimated Time**: 1-2 days (TDD workflow)

## Task Overview

This tasks file implements three custom functions for the Rules Engine using strict Test-Driven Development (TDD). Each function follows the RED → GREEN → REFACTOR cycle.

**Files to Create/Modify**:
- `backend/django_Admin3/rules_engine/tests/test_vat_custom_functions.py` (new file)
- `backend/django_Admin3/rules_engine/custom_functions.py` (append to existing)

**Test Coverage Target**: 100% (mandatory)
**Performance Target**: < 5ms per function call

---

## Task Execution Guide

### TDD Workflow

Each function follows this cycle:
1. **RED**: Write failing test first
2. **GREEN**: Write minimal code to pass test
3. **REFACTOR**: Improve code while keeping tests green

### Parallel Execution

Tasks marked **[P]** can be executed in parallel if different files are being modified.

---

## Tasks

### T001: Setup - Create Test File Structure [P]

**Phase**: Setup
**File**: `backend/django_Admin3/rules_engine/tests/test_vat_custom_functions.py`
**TDD Stage**: Setup
**Estimated Time**: 10 minutes

**Description**:
Create the test file structure with Django TestCase setup and test fixtures for UtilsCountrys and UtilsCountryRegion models.

**Acceptance Criteria**:
- [ ] Test file created at correct location
- [ ] Imports: Django TestCase, Decimal, date, custom_functions
- [ ] `setUpTestData` classmethod with test fixtures
- [ ] Test regions created (UK, ROW)
- [ ] Test countries created (GB with 20% VAT, ZA with 15% VAT)
- [ ] Country-region mappings created
- [ ] File runs without import errors

**Implementation Notes**:
```python
from django.test import TestCase
from decimal import Decimal
from datetime import date
from rules_engine.custom_functions import (
    lookup_region,
    lookup_vat_rate,
    calculate_vat_amount,
)
from utils.models import UtilsRegion, UtilsCountrys, UtilsCountryRegion

class TestLookupRegion(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Create test regions
        cls.region_uk = UtilsRegion.objects.create(code='UK', name='United Kingdom')
        cls.region_row = UtilsRegion.objects.create(code='ROW', name='Rest of World')

        # Create test countries
        cls.country_gb = UtilsCountrys.objects.create(
            code='GB', name='United Kingdom', vat_percent=20.00, active=True
        )
        cls.country_za = UtilsCountrys.objects.create(
            code='ZA', name='South Africa', vat_percent=15.00, active=True
        )

        # Create country-region mappings
        UtilsCountryRegion.objects.create(
            country=cls.country_gb,
            region=cls.region_uk,
            effective_from=date(2020, 1, 1),
            effective_to=None  # Current mapping
        )
```

**Dependencies**: None (can run first)

---

### T002: RED - Write Failing Tests for lookup_region

**Phase**: RED (Test-First)
**File**: `backend/django_Admin3/rules_engine/tests/test_vat_custom_functions.py`
**TDD Stage**: RED
**Estimated Time**: 30 minutes

**Description**:
Write 8 failing test scenarios for `lookup_region` function as specified in `contracts/lookup_region_contract.md`. Tests should fail because function doesn't exist yet.

**Test Scenarios** (from contract):
1. `test_lookup_region_valid_uk` - Returns 'UK' for country code 'GB'
2. `test_lookup_region_valid_south_africa` - Returns 'SA' for code 'ZA' (add SA setup)
3. `test_lookup_region_unknown_country` - Returns 'ROW' for code 'XX'
4. `test_lookup_region_case_insensitive` - Returns 'UK' for lowercase 'gb'
5. `test_lookup_region_historical_date` - Queries with effective_date parameter
6. `test_lookup_region_null_effective_to` - NULL effective_to included in results
7. `test_lookup_region_inactive_country` - Handles inactive countries
8. `test_lookup_region_query_optimization` - Verify select_related (no N+1)

**Acceptance Criteria**:
- [ ] All 8 test methods written in `TestLookupRegion` class
- [ ] Each test has descriptive docstring
- [ ] Tests use `self.assertEqual()` assertions
- [ ] Tests use test fixture data from setUpTestData
- [ ] Run tests: `python manage.py test rules_engine.tests.test_vat_custom_functions.TestLookupRegion`
- [ ] **All tests FAIL** with ImportError or AttributeError (function doesn't exist)

**Implementation Notes**:
```python
class TestLookupRegion(TestCase):
    @classmethod
    def setUpTestData(cls):
        # ... existing setup ...

    def test_lookup_region_valid_uk(self):
        """lookup_region('GB') should return 'UK' for United Kingdom."""
        result = lookup_region('GB')
        self.assertEqual(result, 'UK')
        self.assertIsInstance(result, str)

    def test_lookup_region_unknown_country(self):
        """lookup_region('XX') should return 'ROW' for unknown country."""
        result = lookup_region('XX')
        self.assertEqual(result, 'ROW')

    # ... 6 more test methods ...
```

**Dependencies**: T001 (test file structure)

---

### T003: RED - Write Failing Tests for lookup_vat_rate [P]

**Phase**: RED (Test-First)
**File**: `backend/django_Admin3/rules_engine/tests/test_vat_custom_functions.py`
**TDD Stage**: RED
**Estimated Time**: 20 minutes
**Parallel**: Can run parallel with T002 (different test class)

**Description**:
Write 6 failing test scenarios for `lookup_vat_rate` function as specified in `contracts/lookup_vat_rate_contract.md`.

**Test Scenarios** (from contract):
1. `test_lookup_vat_rate_south_africa` - Returns Decimal('0.15') for 'ZA'
2. `test_lookup_vat_rate_uk` - Returns Decimal('0.20') for 'GB'
3. `test_lookup_vat_rate_unknown_country` - Returns Decimal('0.00') for 'XX'
4. `test_lookup_vat_rate_case_insensitive` - Returns Decimal('0.15') for 'za'
5. `test_lookup_vat_rate_null_vat_percent` - Returns Decimal('0.00') for NULL rate
6. `test_lookup_vat_rate_inactive_country` - Returns Decimal('0.00') for inactive

**Acceptance Criteria**:
- [ ] All 6 test methods written in `TestLookupVATRate` class
- [ ] Tests use `Decimal` comparisons (not float)
- [ ] Tests verify percentage → decimal conversion (20.00 → 0.20)
- [ ] Run tests: `python manage.py test rules_engine.tests.test_vat_custom_functions.TestLookupVATRate`
- [ ] **All tests FAIL** (function doesn't exist)

**Implementation Notes**:
```python
class TestLookupVATRate(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Reuse fixtures or create new ones
        cls.country_gb = UtilsCountrys.objects.create(
            code='GB', name='United Kingdom', vat_percent=20.00, active=True
        )

    def test_lookup_vat_rate_uk(self):
        """lookup_vat_rate('GB') should return Decimal('0.20') for 20% rate."""
        result = lookup_vat_rate('GB')
        self.assertEqual(result, Decimal('0.20'))
        self.assertIsInstance(result, Decimal)
        # Verify conversion happened: 20.00 → 0.20
        self.assertNotEqual(result, Decimal('20.00'))

    # ... 5 more test methods ...
```

**Dependencies**: T001 (test file structure)

---

### T004: RED - Write Failing Tests for calculate_vat_amount [P]

**Phase**: RED (Test-First)
**File**: `backend/django_Admin3/rules_engine/tests/test_vat_custom_functions.py`
**TDD Stage**: RED
**Estimated Time**: 20 minutes
**Parallel**: Can run parallel with T002, T003 (different test class)

**Description**:
Write 6 failing test scenarios for `calculate_vat_amount` function as specified in `contracts/calculate_vat_amount_contract.md`.

**Test Scenarios** (from contract):
1. `test_calculate_vat_amount_normal` - 100.00 * 0.20 = 20.00
2. `test_calculate_vat_amount_zero_net` - 0.00 * 0.20 = 0.00
3. `test_calculate_vat_amount_zero_rate` - 100.00 * 0.00 = 0.00
4. `test_calculate_vat_amount_fractional_rate` - 100.00 * 0.055 = 5.50
5. `test_calculate_vat_amount_rounding_up` - 33.33 * 0.20 = 6.67 (ROUND_HALF_UP)
6. `test_calculate_vat_amount_rounding_down` - 33.32 * 0.20 = 6.66

**Acceptance Criteria**:
- [ ] All 6 test methods written in `TestCalculateVATAmount` class
- [ ] Tests verify ROUND_HALF_UP rounding mode
- [ ] Tests verify exactly 2 decimal places in result
- [ ] Tests use Decimal type exclusively (no float)
- [ ] Run tests: `python manage.py test rules_engine.tests.test_vat_custom_functions.TestCalculateVATAmount`
- [ ] **All tests FAIL** (function doesn't exist)

**Implementation Notes**:
```python
class TestCalculateVATAmount(TestCase):
    def test_calculate_vat_amount_normal(self):
        """calculate_vat_amount(100.00, 0.20) should return 20.00."""
        result = calculate_vat_amount(Decimal('100.00'), Decimal('0.20'))
        self.assertEqual(result, Decimal('20.00'))
        self.assertIsInstance(result, Decimal)
        # Verify exactly 2 decimal places
        self.assertEqual(result.as_tuple().exponent, -2)

    def test_calculate_vat_amount_rounding_up(self):
        """33.33 * 0.20 = 6.666 should round to 6.67 (ROUND_HALF_UP)."""
        result = calculate_vat_amount(Decimal('33.33'), Decimal('0.20'))
        self.assertEqual(result, Decimal('6.67'))

    # ... 4 more test methods ...
```

**Dependencies**: T001 (test file structure)

---

### T005: Verify RED Phase - All Tests Failing

**Phase**: RED Verification
**File**: `backend/django_Admin3/rules_engine/tests/test_vat_custom_functions.py`
**TDD Stage**: RED
**Estimated Time**: 5 minutes

**Description**:
Run the full test suite to verify all 20 tests fail correctly (RED phase complete). This confirms tests are written properly before implementation.

**Acceptance Criteria**:
- [ ] Run: `python manage.py test rules_engine.tests.test_vat_custom_functions`
- [ ] **20 tests FAIL** (8 + 6 + 6)
- [ ] Failures are ImportError or AttributeError (functions don't exist)
- [ ] No syntax errors in test file
- [ ] Test output shows all test names clearly

**Command**:
```bash
cd backend/django_Admin3
python manage.py test rules_engine.tests.test_vat_custom_functions --verbosity=2
```

**Expected Output**:
```
test_lookup_region_valid_uk ... ERROR
test_lookup_region_unknown_country ... ERROR
... (18 more errors)
----------------------------------------------------------------------
Ran 20 tests in 0.XXXs

FAILED (errors=20)
```

**Dependencies**: T002, T003, T004 (all RED phase tests written)

---

### T006: GREEN - Implement lookup_region Function

**Phase**: GREEN (Minimal Implementation)
**File**: `backend/django_Admin3/rules_engine/custom_functions.py`
**TDD Stage**: GREEN
**Estimated Time**: 30 minutes

**Description**:
Implement `lookup_region` function with minimal code to make all 8 tests pass. Follow the contract specification and research decisions.

**Implementation Requirements**:
- Query UtilsCountrys by code (uppercase normalized)
- Query UtilsCountryRegion with effective_from/to date filter
- Use select_related('region') for optimization
- Return region.code or 'ROW' default
- Handle DoesNotExist gracefully (return 'ROW')
- Log WARNING for missing countries

**Acceptance Criteria**:
- [ ] Function signature matches contract: `def lookup_region(country_code: str, effective_date=None) -> str`
- [ ] All 8 `TestLookupRegion` tests PASS
- [ ] No hardcoded region mappings (all from database)
- [ ] select_related used (verify with assertNumQueries)
- [ ] Run tests: `python manage.py test rules_engine.tests.test_vat_custom_functions.TestLookupRegion`
- [ ] **8/8 tests PASS** ✅

**Implementation Template**:
```python
import logging
from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone
from django.db.models import Q
from utils.models import UtilsCountrys, UtilsCountryRegion

logger = logging.getLogger(__name__)

def lookup_region(country_code: str, effective_date=None) -> str:
    """
    Lookup VAT region for country code using UtilsCountryRegion.

    Args:
        country_code: ISO 3166-1 alpha-2 country code
        effective_date: Date for lookup (defaults to today)

    Returns:
        Region code: UK, IE, EU, SA, ROW
    """
    if effective_date is None:
        effective_date = timezone.now().date()

    try:
        country = UtilsCountrys.objects.get(code=country_code.upper())
        mapping = UtilsCountryRegion.objects.filter(
            country=country,
            effective_from__lte=effective_date
        ).filter(
            Q(effective_to__isnull=True) | Q(effective_to__gte=effective_date)
        ).select_related('region').first()

        if mapping:
            return mapping.region.code
        else:
            logger.warning(f'No region mapping found for {country_code}')
            return 'ROW'
    except UtilsCountrys.DoesNotExist:
        logger.warning(f'Country not found: {country_code}')
        return 'ROW'
```

**Dependencies**: T005 (RED phase verified)

---

### T007: GREEN - Implement lookup_vat_rate Function [P]

**Phase**: GREEN (Minimal Implementation)
**File**: `backend/django_Admin3/rules_engine/custom_functions.py`
**TDD Stage**: GREEN
**Estimated Time**: 20 minutes
**Parallel**: Can run parallel with T006 (appending to same file, but independent function)

**Description**:
Implement `lookup_vat_rate` function with minimal code to make all 6 tests pass.

**Implementation Requirements**:
- Query UtilsCountrys by code (uppercase normalized)
- Filter by active=True
- Get vat_percent field
- Convert percentage to decimal (divide by 100)
- Return Decimal('0.00') for missing/NULL rates
- Log WARNING for missing countries

**Acceptance Criteria**:
- [ ] Function signature matches contract: `def lookup_vat_rate(country_code: str) -> Decimal`
- [ ] All 6 `TestLookupVATRate` tests PASS
- [ ] Returns Decimal type (not float)
- [ ] Converts percentage correctly (20.00 → 0.20)
- [ ] Run tests: `python manage.py test rules_engine.tests.test_vat_custom_functions.TestLookupVATRate`
- [ ] **6/6 tests PASS** ✅

**Implementation Template**:
```python
def lookup_vat_rate(country_code: str) -> Decimal:
    """
    Get VAT rate percentage from UtilsCountrys.

    Args:
        country_code: ISO 3166-1 alpha-2 country code

    Returns:
        VAT rate as Decimal (e.g., Decimal('0.20') for 20%)
    """
    try:
        country = UtilsCountrys.objects.get(code=country_code.upper(), active=True)
        if country.vat_percent is None:
            logger.warning(f'VAT percent is NULL for {country_code}')
            return Decimal('0.00')
        return country.vat_percent / Decimal('100')
    except UtilsCountrys.DoesNotExist:
        logger.warning(f'Country not found: {country_code}')
        return Decimal('0.00')
```

**Dependencies**: T005 (RED phase verified)

---

### T008: GREEN - Implement calculate_vat_amount Function [P]

**Phase**: GREEN (Minimal Implementation)
**File**: `backend/django_Admin3/rules_engine/custom_functions.py`
**TDD Stage**: GREEN
**Estimated Time**: 15 minutes
**Parallel**: Can run parallel with T006, T007 (independent function)

**Description**:
Implement `calculate_vat_amount` function with minimal code to make all 6 tests pass.

**Implementation Requirements**:
- Multiply net_amount by vat_rate
- Use Decimal.quantize with ROUND_HALF_UP rounding mode
- Return exactly 2 decimal places
- No database access (pure calculation)

**Acceptance Criteria**:
- [ ] Function signature matches contract: `def calculate_vat_amount(net_amount: Decimal, vat_rate: Decimal) -> Decimal`
- [ ] All 6 `TestCalculateVATAmount` tests PASS
- [ ] Uses ROUND_HALF_UP (not default rounding)
- [ ] Returns exactly 2 decimal places
- [ ] Run tests: `python manage.py test rules_engine.tests.test_vat_custom_functions.TestCalculateVATAmount`
- [ ] **6/6 tests PASS** ✅

**Implementation Template**:
```python
def calculate_vat_amount(net_amount: Decimal, vat_rate: Decimal) -> Decimal:
    """
    Calculate VAT amount with proper rounding.

    Args:
        net_amount: Net amount before VAT
        vat_rate: VAT rate as decimal (e.g., 0.20 for 20%)

    Returns:
        VAT amount rounded to 2 decimal places with ROUND_HALF_UP
    """
    vat_amount = net_amount * vat_rate
    return vat_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
```

**Dependencies**: T005 (RED phase verified)

---

### T009: Verify GREEN Phase - All Tests Passing

**Phase**: GREEN Verification
**File**: N/A (test execution)
**TDD Stage**: GREEN
**Estimated Time**: 5 minutes

**Description**:
Run the full test suite to verify all 20 tests pass (GREEN phase complete). This confirms implementations work correctly.

**Acceptance Criteria**:
- [ ] Run: `python manage.py test rules_engine.tests.test_vat_custom_functions`
- [ ] **20/20 tests PASS** ✅
- [ ] No test failures or errors
- [ ] Test execution time < 1 second (fast tests)

**Command**:
```bash
cd backend/django_Admin3
python manage.py test rules_engine.tests.test_vat_custom_functions --verbosity=2
```

**Expected Output**:
```
test_lookup_region_valid_uk ... ok
test_lookup_region_unknown_country ... ok
... (18 more ok)
----------------------------------------------------------------------
Ran 20 tests in 0.XXXs

OK
```

**Dependencies**: T006, T007, T008 (all GREEN phase implementations complete)

---

### T010: REFACTOR - Optimize and Document Functions

**Phase**: REFACTOR
**File**: `backend/django_Admin3/rules_engine/custom_functions.py`
**TDD Stage**: REFACTOR
**Estimated Time**: 20 minutes

**Description**:
Refactor all three functions to improve code quality, add comprehensive docstrings, and optimize queries. Keep all tests passing (GREEN).

**Refactoring Goals**:
- Add detailed docstrings with examples
- Improve variable names for clarity
- Verify query optimization (select_related)
- Add inline comments for complex logic
- Ensure consistent error handling patterns
- Verify logging uses correct levels

**Acceptance Criteria**:
- [ ] All three functions have comprehensive docstrings
- [ ] Code follows Django best practices
- [ ] No code duplication
- [ ] All 20 tests still PASS after refactoring
- [ ] Run tests: `python manage.py test rules_engine.tests.test_vat_custom_functions`
- [ ] **20/20 tests PASS** ✅ (regression test)

**Refactoring Checklist**:
```python
# Example docstring enhancement
def lookup_region(country_code: str, effective_date=None) -> str:
    """
    Lookup VAT region for country code using UtilsCountryRegion.

    Queries the database for the VAT region mapping of a given country,
    respecting effective date ranges for historical accuracy.

    Args:
        country_code: ISO 3166-1 alpha-2 country code (e.g., 'GB', 'IE', 'ZA')
                      Case-insensitive.
        effective_date: Date for historical lookup (defaults to today).
                        Used for audit trails and historical VAT calculations.

    Returns:
        Region code string: 'UK', 'IE', 'EU', 'SA', or 'ROW'
        Returns 'ROW' (Rest of World) as safe default for:
        - Unknown country codes
        - Countries with no active region mapping
        - Database errors

    Example:
        >>> lookup_region('GB')
        'UK'
        >>> lookup_region('XX')  # Unknown country
        'ROW'
        >>> lookup_region('GB', effective_date=date(2020, 1, 1))
        'UK'  # Historical lookup

    Performance:
        - 2-4ms typical (with indexed code field)
        - Uses select_related to avoid N+1 queries
        - Single DB query per call
    """
```

**Dependencies**: T009 (GREEN phase verified)

---

### T011: REFACTOR - Verify 100% Test Coverage

**Phase**: REFACTOR
**File**: N/A (coverage analysis)
**TDD Stage**: REFACTOR
**Estimated Time**: 10 minutes

**Description**:
Run test coverage analysis to verify 100% code coverage for all three custom functions.

**Acceptance Criteria**:
- [ ] Run: `python manage.py test rules_engine.tests.test_vat_custom_functions --coverage`
- [ ] Coverage report generated
- [ ] `lookup_region`: 100% coverage
- [ ] `lookup_vat_rate`: 100% coverage
- [ ] `calculate_vat_amount`: 100% coverage
- [ ] Overall: 100% coverage for custom_functions.py VAT functions

**Commands**:
```bash
cd backend/django_Admin3

# Option 1: Django coverage (if installed)
python manage.py test rules_engine.tests.test_vat_custom_functions --coverage

# Option 2: coverage.py
coverage run --source='rules_engine.custom_functions' manage.py test rules_engine.tests.test_vat_custom_functions
coverage report
coverage html  # Generate HTML report
```

**Expected Output**:
```
Name                                      Stmts   Miss  Cover
-------------------------------------------------------------
rules_engine/custom_functions.py            45      0   100%
-------------------------------------------------------------
TOTAL                                        45      0   100%
```

**If Coverage < 100%**:
- Identify uncovered lines
- Write additional tests for edge cases
- Re-run until 100% coverage achieved

**Dependencies**: T010 (refactoring complete)

---

### T012: Integration - Register Functions in FUNCTION_REGISTRY

**Phase**: Integration
**File**: `backend/django_Admin3/rules_engine/custom_functions.py`
**TDD Stage**: Integration
**Estimated Time**: 10 minutes

**Description**:
Register all three custom functions in the FUNCTION_REGISTRY dictionary so Rules Engine can discover and invoke them by name.

**Acceptance Criteria**:
- [ ] Add to FUNCTION_REGISTRY at end of custom_functions.py
- [ ] All three functions registered with correct names
- [ ] Verify registry in Python shell: `FUNCTION_REGISTRY['lookup_region']` works
- [ ] Functions callable via registry: `FUNCTION_REGISTRY['lookup_region']('GB')` returns 'UK'

**Implementation**:
```python
# At end of custom_functions.py, after all function definitions

# Register VAT custom functions in FUNCTION_REGISTRY
FUNCTION_REGISTRY.update({
    'lookup_region': lookup_region,
    'lookup_vat_rate': lookup_vat_rate,
    'calculate_vat_amount': calculate_vat_amount,
})
```

**Verification Command**:
```bash
cd backend/django_Admin3
python manage.py shell
```

```python
>>> from rules_engine.custom_functions import FUNCTION_REGISTRY
>>> 'lookup_region' in FUNCTION_REGISTRY
True
>>> func = FUNCTION_REGISTRY['lookup_region']
>>> func('GB')
'UK'
```

**Dependencies**: T011 (100% coverage verified)

---

### T013: Integration - Run Quickstart Verification Script

**Phase**: Integration
**File**: N/A (quickstart execution)
**TDD Stage**: Integration
**Estimated Time**: 10 minutes

**Description**:
Execute the quickstart.md verification script to validate all three functions work correctly in a complete flow with database integration.

**Acceptance Criteria**:
- [ ] Run quickstart script from `specs/002-specs-spec-2025/quickstart.md`
- [ ] All 8 quickstart tests PASS
- [ ] FUNCTION_REGISTRY integration verified
- [ ] Complete VAT calculation flow works (lookup region → get rate → calculate amount)
- [ ] Performance check shows functions under target latency

**Commands**:
```bash
cd backend/django_Admin3
python manage.py shell < ../../specs/002-specs-spec-2025/quickstart.md
```

Or manually in Django shell:
```python
# Copy quickstart verification script and run
```

**Expected Output**:
```
============================================================
Phase 2 Custom Functions - Quickstart Verification
============================================================

[Test 1] lookup_region('GB') for United Kingdom
✓ PASS: UK country maps to UK region

[Test 2] lookup_region('XX') for unknown country
✓ PASS: Unknown country returns ROW default

... (6 more tests)

[Performance] Quick latency check
  lookup_region: 2.34ms per call (target: < 5ms)
  lookup_vat_rate: 1.85ms per call (target: < 5ms)
  calculate_vat_amount: 0.08ms per call (target: < 1ms)

============================================================
✓ ALL TESTS PASSED - Phase 2 Custom Functions Working
============================================================
```

**Dependencies**: T012 (FUNCTION_REGISTRY registration)

---

### T014: Performance - Validate Latency Targets

**Phase**: Performance
**File**: N/A (performance test)
**TDD Stage**: Validation
**Estimated Time**: 15 minutes

**Description**:
Run performance tests to verify all three functions meet the < 5ms latency target under load.

**Performance Targets**:
- `lookup_region`: < 5ms per call
- `lookup_vat_rate`: < 5ms per call
- `calculate_vat_amount`: < 1ms per call

**Acceptance Criteria**:
- [ ] Write performance test script
- [ ] Run 100 iterations of each function
- [ ] Calculate average latency
- [ ] All functions meet target latency
- [ ] No N+1 query problems detected

**Performance Test Script**:
```python
# In Django shell or test file
import time
from decimal import Decimal
from rules_engine.custom_functions import (
    lookup_region,
    lookup_vat_rate,
    calculate_vat_amount,
)

def benchmark_function(func, args, iterations=100):
    start = time.perf_counter()
    for _ in range(iterations):
        func(*args)
    elapsed = (time.perf_counter() - start) * 1000
    return elapsed / iterations

# Benchmark lookup_region
avg_latency = benchmark_function(lookup_region, ('GB',), 100)
print(f"lookup_region: {avg_latency:.2f}ms (target: < 5ms)")
assert avg_latency < 10, f"Too slow: {avg_latency}ms"

# Benchmark lookup_vat_rate
avg_latency = benchmark_function(lookup_vat_rate, ('GB',), 100)
print(f"lookup_vat_rate: {avg_latency:.2f}ms (target: < 5ms)")
assert avg_latency < 10, f"Too slow: {avg_latency}ms"

# Benchmark calculate_vat_amount
avg_latency = benchmark_function(
    calculate_vat_amount,
    (Decimal('100.00'), Decimal('0.20')),
    1000  # More iterations for fast function
)
print(f"calculate_vat_amount: {avg_latency:.2f}ms (target: < 1ms)")
assert avg_latency < 5, f"Too slow: {avg_latency}ms"

print("✓ All performance targets met")
```

**If Performance Issues**:
- Check database indexes exist
- Verify select_related is used
- Profile queries with Django Debug Toolbar
- Add query optimization

**Dependencies**: T013 (quickstart verification passed)

---

### T015: Final - Commit Phase 2 Implementation

**Phase**: Final
**File**: Multiple (git commit)
**TDD Stage**: Complete
**Estimated Time**: 10 minutes

**Description**:
Create git commit for Phase 2 Custom Functions implementation with comprehensive commit message.

**Acceptance Criteria**:
- [ ] All 20 tests passing
- [ ] 100% test coverage
- [ ] Performance targets met
- [ ] Quickstart verification passed
- [ ] Functions registered in FUNCTION_REGISTRY
- [ ] Git commit created with descriptive message

**Git Commit Command**:
```bash
cd backend/django_Admin3
git add rules_engine/custom_functions.py
git add rules_engine/tests/test_vat_custom_functions.py

git commit -m "$(cat <<'EOF'
feat: Implement Phase 2 VAT custom functions for Rules Engine

Add three granular custom functions to enable dynamic VAT calculations:
- lookup_region: Map country codes to VAT regions using UtilsCountryRegion
- lookup_vat_rate: Retrieve VAT rates from UtilsCountrys database
- calculate_vat_amount: Calculate VAT with ROUND_HALF_UP precision

Implementation follows TDD methodology (RED → GREEN → REFACTOR):
- 20 test scenarios (8 + 6 + 6)
- 100% test coverage
- Performance: All functions < 5ms target

Technical details:
- Database-driven (no hardcoded VAT rates)
- Safe error handling (return defaults, never crash)
- Django ORM with query optimization (select_related)
- Decimal precision for monetary calculations
- Registered in FUNCTION_REGISTRY for Rules Engine access

Follows CLAUDE.md TDD requirements and Sprint Change Proposal
(docs/sprint-change-proposal-vat-arch-2025-10-12.md).

Files:
- rules_engine/custom_functions.py: +150 LOC (3 functions)
- rules_engine/tests/test_vat_custom_functions.py: +400 LOC (20 tests)

Testing:
  python manage.py test rules_engine.tests.test_vat_custom_functions

Ready for Phase 3: Composite Rules creation.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

**Dependencies**: T014 (all validations complete)

---

## Parallel Execution Examples

### Parallel Group 1: RED Phase (Tests)
All RED phase tasks can run in parallel (different test classes):

```bash
# Terminal 1: Write lookup_region tests
# Task T002

# Terminal 2: Write lookup_vat_rate tests
# Task T003

# Terminal 3: Write calculate_vat_amount tests
# Task T004
```

### Parallel Group 2: GREEN Phase (Implementation)
GREEN phase tasks can run in parallel after RED verification (independent functions):

```bash
# After T005 (RED verification) passes:

# Terminal 1: Implement lookup_region
# Task T006

# Terminal 2: Implement lookup_vat_rate
# Task T007

# Terminal 3: Implement calculate_vat_amount
# Task T008
```

**Note**: These are technically appending to the same file, but since they're independent functions, conflicts are minimal if coordinated properly.

---

## Progress Checklist

### Setup Phase
- [ ] T001: Create test file structure

### RED Phase (Test-First)
- [ ] T002: Write failing tests for lookup_region (8 scenarios)
- [ ] T003: Write failing tests for lookup_vat_rate (6 scenarios)
- [ ] T004: Write failing tests for calculate_vat_amount (6 scenarios)
- [ ] T005: Verify all 20 tests failing

### GREEN Phase (Implementation)
- [ ] T006: Implement lookup_region function
- [ ] T007: Implement lookup_vat_rate function
- [ ] T008: Implement calculate_vat_amount function
- [ ] T009: Verify all 20 tests passing

### REFACTOR Phase (Optimization)
- [ ] T010: Optimize and document functions
- [ ] T011: Verify 100% test coverage

### Integration Phase
- [ ] T012: Register functions in FUNCTION_REGISTRY
- [ ] T013: Run quickstart verification script
- [ ] T014: Validate performance targets

### Final Phase
- [ ] T015: Commit Phase 2 implementation

---

## Success Criteria

✅ **All tasks completed**
✅ **20/20 tests passing**
✅ **100% test coverage**
✅ **Performance targets met** (< 5ms per function)
✅ **Quickstart verification passed**
✅ **Functions registered in FUNCTION_REGISTRY**
✅ **Git commit created**

---

## Next Phase

After completing all tasks:
1. Update plan.md Progress Tracking: Phase 3 complete ✅
2. Proceed to Phase 3: Composite Rules creation (Epic 3 continuation)
3. Create VAT calculation rules that use these three custom functions

**Command for Phase 3**:
```bash
/specify specs/spec-2025-10-06-121922.md phase 3
```

---

**Tasks Generated**: 2025-10-12
**Status**: Ready for TDD Implementation
**Estimated Total Time**: 4-6 hours (with TDD workflow and breaks)
