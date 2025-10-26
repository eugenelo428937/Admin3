# Epic 3 Phase 6: VAT Testing & Integration - Task Breakdown

**Phase Goal**: Create comprehensive test suite for VAT rules system including unit, integration, API, frontend, and end-to-end tests following the VAT Master Rule Test Matrix.

**Phase Overview**: Implement systematic testing across all layers to validate VAT calculation correctness, rule execution, API contracts, frontend integration, and complete user flows.

---

## Test Matrix Overview

### Test Stages
1. **Unit Tests (Backend Functions)** - Test Phase 1 functions in isolation
2. **Rule Tests (Per-Item Entry Point)** - Test individual rule execution
3. **Master Rule Integration Tests** - Test complete VAT flow orchestration
4. **API Contract Tests** - Test Rules Engine API endpoints
5. **Frontend Integration Tests** - Test React components with mocked APIs
6. **End-to-End Tests** - Test complete user flows with Cypress/Playwright

---

## Task List

### TASK-061: Create Unit Tests for VAT Functions (TDD RED/GREEN)
**Priority:** High
**TDD Stage:** RED/GREEN
**Estimate:** 2 hours
**Status:** Pending
**Dependencies:** Phase 5 complete

**Description:**
Create comprehensive unit tests for Phase 1 VAT calculation functions.

**Test Cases (from Test Matrix):**
| Test ID | Function | Input | Expected Output |
|---------|----------|-------|-----------------|
| UT01 | map_country_to_region | "GB" | "UK" |
| UT02 | get_vat_rate | ("UK", {"is_ebook": true}) | Decimal("0.00") |
| UT03 | get_vat_rate | ("ROW", {"is_digital": true}) | Decimal("0.00") |
| UT04 | get_vat_rate | ("SA", {"is_live_tutorial": true}) | Decimal("0.15") |
| UT05 | calculate_vat_amount | (Decimal("50.555"), Decimal("0.20")) | Decimal("10.11") |

**File:** `backend/django_Admin3/vat/tests/test_vat_unit.py`

**Test Structure:**
```python
class TestMapCountryToRegion:
    def test_gb_maps_to_uk(self):
        """UT01: GB country code maps to UK region."""
        assert map_country_to_region("GB") == "UK"

    def test_de_maps_to_eu(self):
        """DE country code maps to EU region."""
        assert map_country_to_region("DE") == "EU"

    def test_au_maps_to_row(self):
        """AU country code maps to ROW region."""
        assert map_country_to_region("AU") == "ROW"

class TestGetVATRate:
    def test_uk_ebook_zero_rate(self):
        """UT02: UK eBook has 0% VAT."""
        assert get_vat_rate("UK", {"is_ebook": True}) == Decimal("0.00")

    def test_row_digital_zero_rate(self):
        """UT03: ROW digital product has 0% VAT."""
        assert get_vat_rate("ROW", {"is_digital": True}) == Decimal("0.00")

    def test_sa_tutorial_15_rate(self):
        """UT04: SA tutorial has 15% VAT."""
        assert get_vat_rate("SA", {"is_live_tutorial": True}) == Decimal("0.15")

class TestCalculateVATAmount:
    def test_rounding_half_up(self):
        """UT05: VAT amount rounds correctly (ROUND_HALF_UP)."""
        result = calculate_vat_amount(Decimal("50.555"), Decimal("0.20"))
        assert result == Decimal("10.11")
```

**Acceptance Criteria:**
- Minimum 15 unit tests covering all Phase 1 functions
- All tests pass
- Tests verify correct data types (Decimal)
- Tests verify rounding behavior

---

### TASK-062: Create Rule Tests for Per-Item VAT Calculation (TDD RED/GREEN)
**Priority:** High
**TDD Stage:** RED/GREEN
**Estimate:** 2.5 hours
**Status:** Pending
**Dependencies:** TASK-061

**Description:**
Test individual VAT rules in isolation using `calculate_vat_per_item` entry point.

**Test Cases (from Test Matrix):**
| Test ID | Rule | Context | Expected |
|---------|------|---------|----------|
| RT01 | vat_standard_default | UK, physical book | vat=20, rule=vat_standard_default:v1 |
| RT02 | uk_ebook_zero_vat | UK, ebook, post-2020 | vat=0, rule=uk_ebook_zero_vat:v1 |
| RT03 | row_digital_zero_vat | ROW, digital | vat=0, rule=row_digital_zero_vat:v1 |
| RT04 | sa_special_vat | SA, any product | vat=15, rule=sa_special_vat:v1 |
| RT05 | live_tutorial_vat_override | Any region, live_tutorial | vat=region_rate*200 |

**File:** `backend/django_Admin3/vat/tests/test_vat_rules.py`

**Test Structure:**
```python
@pytest.mark.django_db
class TestVATRuleStandardDefault:
    def test_rt01_uk_physical_book(self):
        """RT01: UK physical book gets 20% VAT."""
        context = {
            'user_address': {'country': 'GB', 'region': 'UK'},
            'item': {
                'item_id': 1,
                'product_code': 'MAT-PRINT-CS2',
                'net_amount': Decimal('100.00'),
                'classification': {'is_material': True, 'is_ebook': False}
            },
            'settings': {'effective_date': '2025-09-30'}
        }

        result = execute_rule('calculate_vat_per_item', context)

        assert result['item']['vat_amount'] == Decimal('20.00')
        assert result['item']['vat_rate'] == Decimal('0.20')
        assert result['item']['vat_rule_applied'] == 'vat_standard_default:v1'

@pytest.mark.django_db
class TestVATRuleUKEbookZero:
    def test_rt02_uk_ebook_post_2020(self):
        """RT02: UK eBook post-2020 gets 0% VAT."""
        context = {
            'user_address': {'country': 'GB', 'region': 'UK'},
            'item': {
                'item_id': 2,
                'product_code': 'MAT-EBOOK-CS2',
                'net_amount': Decimal('50.00'),
                'classification': {'is_ebook': True, 'is_digital': True}
            },
            'settings': {'effective_date': '2025-09-30'}
        }

        result = execute_rule('calculate_vat_per_item', context)

        assert result['item']['vat_amount'] == Decimal('0.00')
        assert result['item']['vat_rate'] == Decimal('0.00')
        assert result['item']['vat_rule_applied'] == 'uk_ebook_zero_vat:v1'
        assert result['item']['exemption_reason'] == 'UK eBook post-2020'
```

**Acceptance Criteria:**
- Minimum 10 rule tests covering all 5 item-level rules
- Tests verify rule priority (higher priority rules fire first)
- Tests verify stop_processing behavior
- Tests verify exemption_reason for zero-rated items

---

### TASK-063: Create Master Rule Integration Tests (TDD RED/GREEN)
**Priority:** High
**TDD Stage:** RED/GREEN
**Estimate:** 3 hours
**Status:** Pending
**Dependencies:** TASK-062

**Description:**
Test complete master VAT rule flow from checkout_start entry point through aggregation and result storage.

**Test Cases (from Test Matrix):**
| Test ID | Scenario | Context | Expected Totals |
|---------|----------|---------|-----------------|
| IT01 | UK mixed cart | 1 ebook (50) + 1 physical (100) | VAT: 20, Total: 170 |
| IT02 | ROW digital only | Digital item (80) | VAT: 0, Total: 80 |
| IT03 | SA tutorial cart | Tutorial (100) + book (100) | VAT: 30, Total: 230 |
| IT04 | UK ebook date cutoff | UK ebook, effective_date=2019-12-31 | VAT: 10 (20%) |
| IT05 | Multi-entry consistency | Same cart at checkout_start vs checkout_payment | VAT results consistent |

**File:** `backend/django_Admin3/vat/tests/test_vat_integration.py`

**Test Structure:**
```python
@pytest.mark.django_db
class TestMasterVATRule:

    def test_it01_uk_mixed_cart(self, api_client, uk_user, uk_cart_mixed):
        """IT01: UK user with ebook + physical book."""
        response = api_client.post('/api/rules/engine/execute/', {
            'entryPoint': 'checkout_start',
            'context': build_vat_context(uk_user, uk_cart_mixed)
        })

        assert response.status_code == 200
        data = response.json()

        # Verify items
        items = data['vat_calculations']['items']
        assert len(items) == 2

        # Ebook (50) - 0% VAT
        ebook = next(i for i in items if i['product_code'] == 'MAT-EBOOK-CS2')
        assert ebook['vat_amount'] == '0.00'

        # Physical (100) - 20% VAT
        physical = next(i for i in items if i['product_code'] == 'MAT-PRINT-CS2')
        assert physical['vat_amount'] == '20.00'

        # Verify totals
        totals = data['vat_calculations']['totals']
        assert totals['total_net'] == '150.00'
        assert totals['total_vat'] == '20.00'
        assert totals['total_gross'] == '170.00'

        # Verify rules executed
        assert 'calculate_vat_master' in data['rules_executed']
        assert 'uk_ebook_zero_vat:v1' in data['rules_executed']
        assert 'vat_standard_default:v1' in data['rules_executed']

    def test_it02_row_digital_only(self, api_client, row_user, row_cart_digital):
        """IT02: ROW user with digital product."""
        response = api_client.post('/api/rules/engine/execute/', {
            'entryPoint': 'checkout_start',
            'context': build_vat_context(row_user, row_cart_digital)
        })

        assert response.status_code == 200
        data = response.json()

        totals = data['vat_calculations']['totals']
        assert totals['total_net'] == '80.00'
        assert totals['total_vat'] == '0.00'
        assert totals['total_gross'] == '80.00'

        # Verify ROW digital rule applied
        assert 'row_digital_zero_vat:v1' in data['rules_executed']
```

**Acceptance Criteria:**
- Minimum 10 integration tests covering all scenarios
- Tests verify complete flow: region determination → per-item calculation → aggregation → storage
- Tests verify cart.vat_result JSONB persistence
- Tests verify VATAudit record creation
- Tests verify rules_executed tracking

---

### TASK-064: Create API Contract Tests (TDD RED/GREEN)
**Priority:** High
**TDD Stage:** RED/GREEN
**Estimate:** 2 hours
**Status:** Pending
**Dependencies:** TASK-063

**Description:**
Test Rules Engine API endpoint contracts for VAT calculation.

**Test Cases (from Test Matrix):**
| Test ID | Endpoint | Input | Expected |
|---------|----------|-------|----------|
| API01 | POST /api/rules/engine/execute/ | entryPoint=checkout_start, valid context | 200, vat_calculations structure |
| API02 | POST /api/rules/engine/execute/ | Execute rule | ActedRuleExecution row created |
| API03 | POST /api/rules/engine/execute/ | Missing user_address | 400 validation error |

**File:** `backend/django_Admin3/vat/tests/test_vat_api.py`

**Test Structure:**
```python
@pytest.mark.django_db
class TestVATAPIEndpoint:

    def test_api01_execute_master_rule(self, api_client, uk_user, uk_cart):
        """API01: Execute master VAT rule via API."""
        response = api_client.post('/api/rules/engine/execute/', {
            'entryPoint': 'checkout_start',
            'context': {
                'user_address': {'country': 'GB'},
                'cart': {'id': uk_cart.id, 'items': []},
                'settings': {'effective_date': '2025-09-30'}
            }
        }, content_type='application/json')

        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert 'vat_calculations' in data
        assert 'items' in data['vat_calculations']
        assert 'totals' in data['vat_calculations']
        assert 'region_info' in data['vat_calculations']
        assert 'rules_executed' in data
        assert 'execution_id' in data

    def test_api02_logs_execution(self, api_client, uk_user, uk_cart):
        """API02: Rule execution creates audit record."""
        from rules_engine.models import ActedRuleExecution

        initial_count = ActedRuleExecution.objects.count()

        response = api_client.post('/api/rules/engine/execute/', {
            'entryPoint': 'checkout_start',
            'context': build_vat_context(uk_user, uk_cart)
        }, content_type='application/json')

        assert response.status_code == 200
        assert ActedRuleExecution.objects.count() == initial_count + 1

        # Verify execution record
        execution = ActedRuleExecution.objects.latest('created_at')
        assert execution.entry_point == 'checkout_start'
        assert 'calculate_vat_master' in execution.rules_executed

    def test_api03_bad_context_validation(self, api_client):
        """API03: Missing required fields returns validation error."""
        response = api_client.post('/api/rules/engine/execute/', {
            'entryPoint': 'checkout_start',
            'context': {
                # Missing user_address
                'cart': {'id': 1, 'items': []},
                'settings': {}
            }
        }, content_type='application/json')

        assert response.status_code == 400
        assert 'validation' in response.json().get('error', '').lower()
```

**Acceptance Criteria:**
- Minimum 8 API contract tests
- Tests verify request/response structure
- Tests verify validation errors
- Tests verify audit trail creation
- Tests verify error handling

---

### TASK-065: Create pytest Fixtures and Helpers (TDD GREEN)
**Priority:** High
**TDD Stage:** GREEN
**Estimate:** 2 hours
**Status:** Pending
**Dependencies:** TASK-064

**Description:**
Create reusable pytest fixtures and helper functions for VAT testing.

**Fixtures to Create:**
- `uk_user` - User with UK address
- `eu_user` - User with EU address
- `row_user` - User with ROW address
- `sa_user` - User with SA address
- `uk_cart_mixed` - UK cart with ebook + physical book
- `row_cart_digital` - ROW cart with digital product
- `sa_cart_tutorial` - SA cart with tutorial
- `empty_cart` - Empty cart for edge case testing

**File:** `backend/django_Admin3/vat/tests/conftest.py`

**Fixture Structure:**
```python
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from cart.models import Cart, CartItem
from products.models import Products
from country.models import Country
from userprofile.models import UserProfile

User = get_user_model()

@pytest.fixture
def uk_user(db):
    """User with UK address."""
    user = User.objects.create_user(
        username='uk_user',
        email='uk@example.com',
        password='testpass'
    )
    country = Country.objects.get_or_create(code='GB', defaults={'name': 'United Kingdom'})[0]
    UserProfile.objects.create(user=user, country=country, postcode='SW1A 1AA')
    return user

@pytest.fixture
def uk_cart_mixed(db, uk_user):
    """UK cart with ebook + physical book."""
    cart = Cart.objects.create(user_id=uk_user.id)

    ebook = Products.objects.create(
        product_name='CS2 eBook',
        product_code='MAT-EBOOK-CS2',
        price=Decimal('50.00')
    )

    physical = Products.objects.create(
        product_name='CS2 Printed Material',
        product_code='MAT-PRINT-CS2',
        price=Decimal('100.00')
    )

    CartItem.objects.create(cart=cart, product=ebook, quantity=1, price=ebook.price)
    CartItem.objects.create(cart=cart, product=physical, quantity=1, price=physical.price)

    return cart
```

**Acceptance Criteria:**
- All fixtures created and documented
- Fixtures cover all regions (UK, EU, ROW, SA)
- Fixtures cover all product types (ebook, material, digital, tutorial, marking)
- Fixtures create realistic test data

---

### TASK-066: Create Test Matrix Documentation (Documentation)
**Priority:** Medium
**TDD Stage:** REFACTOR
**Estimate:** 2 hours
**Status:** Pending
**Dependencies:** TASK-065

**Description:**
Create comprehensive test matrix documentation for all test stages.

**File:** `docs/testing/vat-rule-test-matrix.md`

**Content Structure:**
1. Test Matrix Overview
2. Stage 1: Unit Tests (5+ test cases)
3. Stage 2: Rule Tests (10+ test cases)
4. Stage 3: Master Rule Integration Tests (10+ test cases)
5. Stage 4: API Contract Tests (8+ test cases)
6. Stage 5: Frontend Integration Tests (placeholder - future)
7. Stage 6: End-to-End Tests (placeholder - future)
8. Test Execution Guide
9. Coverage Requirements (80%+ for vat service)
10. Troubleshooting Guide

**Acceptance Criteria:**
- Matrix includes all test IDs from test matrix
- Matrix includes input/output for each test
- Matrix includes pytest test references
- Matrix includes coverage requirements
- Matrix formatted in Markdown with tables

---

### TASK-067: Create Frontend Test Placeholders (Documentation)
**Priority:** Low
**TDD Stage:** REFACTOR
**Estimate:** 1 hour
**Status:** Pending
**Dependencies:** TASK-066

**Description:**
Create placeholder test files and documentation for future frontend VAT testing.

**Test Cases (from Test Matrix):**
| Test ID | Component | Mock API Response | Expected Behavior |
|---------|-----------|-------------------|-------------------|
| FE01 | CheckoutSummary | total_vat=20 | UI shows "VAT: £20.00" |
| FE02 | CheckoutSummary | VAT=0 for ebook | UI shows "VAT: £0.00" |
| FE03 | CheckoutSummary | API returns 400 | UI shows error banner |

**Files:**
- `frontend/react-Admin3/src/components/Ordering/__tests__/CheckoutVAT.test.js` (placeholder)
- `docs/testing/vat-frontend-testing-guide.md`

**Content:**
```javascript
// Placeholder for future VAT frontend tests
import { render, screen } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import CheckoutSummary from '../CheckoutSummary';

// FE01: Checkout summary shows VAT correctly
test('FE01: displays VAT amount in checkout summary', async () => {
  // Mock API response with VAT calculation
  const server = setupServer(
    rest.post('/api/rules/engine/execute/', (req, res, ctx) => {
      return res(ctx.json({
        vat_calculations: {
          totals: {
            total_net: '100.00',
            total_vat: '20.00',
            total_gross: '120.00'
          }
        }
      }));
    })
  );

  server.listen();

  render(<CheckoutSummary />);

  // TODO: Implement assertion
  expect(screen.getByText(/VAT.*£20\.00/i)).toBeInTheDocument();

  server.close();
});
```

**Acceptance Criteria:**
- Placeholder test files created
- Frontend testing guide documented
- MSW setup documented
- React Testing Library patterns documented

---

### TASK-068: Create End-to-End Test Placeholders (Documentation)
**Priority:** Low
**TDD Stage:** REFACTOR
**Estimate:** 1 hour
**Status:** Pending
**Dependencies:** TASK-067

**Description:**
Create placeholder test scenarios for future Cypress/Playwright end-to-end testing.

**Test Cases (from Test Matrix):**
| Test ID | Scenario | Steps | Expected |
|---------|----------|-------|----------|
| E2E01 | UK ebook flow | Go to checkout, see VAT=0 | VAT=0, Gross=Net |
| E2E02 | ROW digital flow | Add to cart → checkout | VAT=0 |
| E2E03 | SA tutorial flow | Checkout | VAT=15% applied |
| E2E04 | Date cutoff | UK ebook, effective_date < 2020-05-01 | VAT=20% applied |
| E2E05 | Mixed cart | UK cart: ebook + book | VAT only on physical |

**File:** `docs/testing/vat-e2e-testing-guide.md`

**Content:**
```javascript
// Placeholder for future Cypress E2E tests
describe('E2E01: UK eBook Flow', () => {
  it('should show zero VAT for UK eBook purchase', () => {
    cy.visit('/products');
    cy.get('[data-testid="product-MAT-EBOOK-CS2"]').click();
    cy.get('[data-testid="add-to-cart"]').click();
    cy.visit('/checkout');

    // Verify VAT is zero
    cy.get('[data-testid="vat-amount"]').should('contain', '£0.00');
    cy.get('[data-testid="total-gross"]').should('equal', '[data-testid="total-net"]');
  });
});
```

**Acceptance Criteria:**
- E2E test scenarios documented
- Cypress/Playwright setup documented
- Data seeding approach documented
- Test execution guide created

---

### TASK-069: Run Complete Test Suite and Generate Coverage Report
**Priority:** High
**TDD Stage:** REFACTOR
**Estimate:** 1 hour
**Status:** Pending
**Dependencies:** TASK-065

**Description:**
Run complete Phase 6 test suite and generate coverage reports.

**Commands:**
```bash
# Run all VAT tests
pytest backend/django_Admin3/vat/tests/ -v

# Run with coverage
pytest backend/django_Admin3/vat/tests/ --cov=vat --cov-report=html --cov-report=term

# Run specific test stages
pytest backend/django_Admin3/vat/tests/test_vat_unit.py -v        # Unit tests
pytest backend/django_Admin3/vat/tests/test_vat_rules.py -v       # Rule tests
pytest backend/django_Admin3/vat/tests/test_vat_integration.py -v # Integration tests
pytest backend/django_Admin3/vat/tests/test_vat_api.py -v         # API tests
```

**Coverage Requirements:**
- vat/service.py: 90%+
- vat/context_builder.py: 90%+
- vat/product_classifier.py: 95%+
- country/vat_rates.py: 95%+
- Overall vat app: 85%+

**Acceptance Criteria:**
- All unit tests pass (15+)
- All rule tests pass (10+)
- All integration tests pass (10+)
- All API tests pass (8+)
- Coverage requirements met
- Coverage report generated (HTML + terminal)

---

### TASK-070: Create Phase 6 Completion Documentation
**Priority:** Medium
**TDD Stage:** REFACTOR
**Estimate:** 1.5 hours
**Status:** Pending
**Dependencies:** TASK-069

**Description:**
Create comprehensive Phase 6 completion documentation.

**Content:**
- Implementation summary
- Test statistics (total tests, coverage %)
- Test matrix reference with all test IDs
- Test execution guide
- Coverage report summary
- Known issues/limitations
- Next phase readiness (Phase 7: Legacy Code Removal)

**File:** `docs/qa/phase-6-vat-testing-integration-completion.md`

**Acceptance Criteria:**
- Document includes all test statistics
- Document includes coverage report
- Document includes test execution commands
- Document includes troubleshooting guide
- Document formatted in Markdown

---

## Phase 6 Summary

**Total Tasks:** 10 (TASK-061 through TASK-070)
**Estimated Time:** 18 hours
**TDD Breakdown:**
- RED/GREEN Phase: 5 tasks (unit, rule, integration, API tests + fixtures)
- REFACTOR Phase: 5 tasks (documentation, placeholders, coverage, completion)

**Test Coverage by Stage:**

| Stage | Test Count | Files | Status |
|-------|------------|-------|--------|
| Unit Tests | 15+ | test_vat_unit.py | To implement |
| Rule Tests | 10+ | test_vat_rules.py | To implement |
| Integration Tests | 10+ | test_vat_integration.py | To implement |
| API Tests | 8+ | test_vat_api.py | To implement |
| Fixtures | 10+ | conftest.py | To implement |
| Frontend Tests | 3 | (placeholder) | Future |
| E2E Tests | 5 | (placeholder) | Future |
| **Total** | **43+** | **6 files** | **Phase 6** |

**Test Matrix Implementation:**

✅ **Stage 1: Unit Tests** - 15+ tests (UT01-UT05+)
✅ **Stage 2: Rule Tests** - 10+ tests (RT01-RT05+)
✅ **Stage 3: Integration Tests** - 10+ tests (IT01-IT05+)
✅ **Stage 4: API Tests** - 8+ tests (API01-API03+)
📋 **Stage 5: Frontend Tests** - Placeholder (FE01-FE03)
📋 **Stage 6: E2E Tests** - Placeholder (E2E01-E2E05)

**Success Criteria:**
- ✅ All unit tests pass (15+)
- ✅ All rule tests pass (10+)
- ✅ All integration tests pass (10+)
- ✅ All API tests pass (8+)
- ✅ Coverage > 85% for vat app
- ✅ Test matrix documentation complete
- ✅ pytest fixtures created
- ✅ Frontend/E2E placeholders documented
- ✅ 100% TDD compliance maintained
