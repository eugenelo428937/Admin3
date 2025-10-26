# Task Breakdown: Phase 3 - VAT Context Builder

**Epic:** Epic 3 - Dynamic VAT Calculation System
**Phase:** Phase 3 - VAT Context Builder
**Created:** 2025-09-30
**Based on:** epic-3-dynamic-vat-calculation-system-plan.md (Phase 3)
**Duration:** 2 days
**Prerequisites:** Phase 1 & 2 Complete ✅

---

## Phase 3 Goal

Build VAT execution context from user and cart data. This phase creates the context builder that prepares structured data for the Rules Engine VAT calculations, including:
- User region extraction from address data
- Product classification (digital, eBook, live tutorial, material)
- Per-item context structure for rules evaluation
- Settings and metadata for VAT calculation

---

## Task List

### TASK-024: Create Product Classifier Tests (TDD RED)
**Priority:** High
**TDD Stage:** RED
**Estimate:** 45 minutes
**Status:** Pending

**Description:**
Write comprehensive tests for product classification logic before implementation.

**Test File:** `backend/django_Admin3/vat/tests/test_product_classifier.py`

**Required Tests:**
1. Test classify_product function exists
2. Test eBook classification (product_code contains 'EBOOK')
3. Test printed material classification (product_code contains 'PRINT')
4. Test digital product classification (product_code contains 'DIGITAL' or 'ONLINE')
5. Test live tutorial classification (product_code contains 'LIVE' or 'TUTORIAL')
6. Test marking product classification (product_code contains 'MARK')
7. Test mixed/compound product types
8. Test unknown product types default to material
9. Test case-insensitive matching
10. Test None/empty product codes
11. Test classification returns dictionary with all flags
12. Test product variations handling

**Test Structure:**
```python
from django.test import TestCase
from vat.product_classifier import classify_product

class TestProductClassifier(TestCase):
    def test_classify_product_function_exists(self):
        """Test classify_product function can be imported."""
        self.assertTrue(callable(classify_product))

    def test_classify_ebook_product(self):
        """Test eBook products are correctly classified."""
        result = classify_product({'product_code': 'MAT-EBOOK-CS2'})
        self.assertTrue(result['is_ebook'])
        self.assertTrue(result['is_digital'])
        self.assertFalse(result['is_material'])

    def test_classify_printed_material(self):
        """Test printed materials are correctly classified."""
        result = classify_product({'product_code': 'MAT-PRINT-CM1'})
        self.assertTrue(result['is_material'])
        self.assertFalse(result['is_digital'])
        self.assertFalse(result['is_ebook'])

    # ... more tests
```

**Acceptance Criteria (RED Phase):**
- ✅ Test file created with 12+ test cases
- ✅ Tests import classify_product function (will fail - function doesn't exist)
- ✅ All tests fail with expected errors
- ✅ Test structure covers all product types

---

### TASK-025: Implement Product Classifier (TDD GREEN)
**Priority:** High
**TDD Stage:** GREEN
**Estimate:** 30 minutes
**Status:** Pending
**Dependencies:** TASK-024

**Description:**
Implement product classification logic to make tests pass.

**File:** `backend/django_Admin3/vat/product_classifier.py`

**Implementation Requirements:**
```python
def classify_product(product):
    """
    Classify product based on product code patterns.

    Args:
        product: Product dict with at least 'product_code' field

    Returns:
        dict: Classification with flags:
            - is_digital: True for digital products
            - is_ebook: True for eBooks
            - is_material: True for physical materials
            - is_live_tutorial: True for live tutorials
            - is_marking: True for marking products
            - product_type: Primary type string
    """
    # Implementation based on product_code patterns
    # MAT-EBOOK-* → eBook (digital)
    # MAT-PRINT-* → Printed material
    # TUT-LIVE-* → Live tutorial
    # TUT-ONLINE-* → Online tutorial (digital)
    # MARK-* → Marking product
```

**Acceptance Criteria (GREEN Phase):**
- ✅ classify_product function implemented
- ✅ All classification tests pass
- ✅ Function handles edge cases (None, empty, unknown)
- ✅ Case-insensitive matching works
- ✅ Returns consistent dictionary structure

---

### TASK-026: Create Context Builder Tests (TDD RED)
**Priority:** High
**TDD Stage:** RED
**Estimate:** 1 hour
**Status:** Pending
**Dependencies:** TASK-025

**Description:**
Write comprehensive tests for VAT context builder before implementation.

**Test File:** `backend/django_Admin3/vat/tests/test_context_builder.py`

**Required Tests:**
1. Test build_vat_context function exists
2. Test context structure matches specification
3. Test user region extraction from address
4. Test user region defaults to 'ROW' if no address
5. Test cart items context building
6. Test product classification integration
7. Test net_amount calculation
8. Test settings included (effective_date)
9. Test empty cart handling
10. Test multiple cart items
11. Test cart with mixed product types
12. Test user without address
13. Test anonymous user (no user)
14. Test context metadata (timestamp, version)

**Test Structure:**
```python
from django.test import TestCase
from django.contrib.auth import get_user_model
from cart.models import Cart, CartItem
from vat.context_builder import build_vat_context

User = get_user_model()

class TestVATContextBuilder(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )
        self.cart = Cart.objects.create(user=self.user)

    def test_build_vat_context_function_exists(self):
        """Test build_vat_context function can be imported."""
        self.assertTrue(callable(build_vat_context))

    def test_context_structure(self):
        """Test context has required structure."""
        context = build_vat_context(self.user, self.cart)

        self.assertIn('user', context)
        self.assertIn('cart', context)
        self.assertIn('settings', context)

        self.assertIn('id', context['user'])
        self.assertIn('region', context['user'])
        self.assertIn('address', context['user'])

        self.assertIn('items', context['cart'])
        self.assertIn('total_net', context['cart'])

        self.assertIn('effective_date', context['settings'])

    def test_user_region_from_address(self):
        """Test user region extracted from address."""
        # Add address to user profile
        profile = UserProfile.objects.create(
            user=self.user,
            country='GB'
        )

        context = build_vat_context(self.user, self.cart)
        self.assertEqual(context['user']['region'], 'UK')

    # ... more tests
```

**Acceptance Criteria (RED Phase):**
- ✅ Test file created with 14+ test cases
- ✅ Tests import build_vat_context function (will fail)
- ✅ All tests fail with expected errors
- ✅ Test coverage includes all context components

---

### TASK-027: Implement Context Builder (TDD GREEN)
**Priority:** High
**TDD Stage:** GREEN
**Estimate:** 1.5 hours
**Status:** Pending
**Dependencies:** TASK-026

**Description:**
Implement VAT context builder to make tests pass.

**File:** `backend/django_Admin3/vat/context_builder.py`

**Implementation Requirements:**
```python
from datetime import datetime
from decimal import Decimal
from country.vat_rates import map_country_to_region
from vat.product_classifier import classify_product

def build_vat_context(user, cart):
    """
    Build VAT calculation context from user and cart data.

    Args:
        user: User object (may be None for anonymous)
        cart: Cart object with items

    Returns:
        dict: VAT context structure for rules engine:
            {
                'user': {
                    'id': user_id,
                    'region': 'UK'|'IE'|'EC'|'SA'|'ROW'|'CH'|'GG',
                    'address': {
                        'country': 'GB',
                        'postcode': 'SW1A 1AA'
                    }
                },
                'cart': {
                    'id': cart_id,
                    'items': [
                        {
                            'item_id': 1,
                            'product_id': 123,
                            'product_code': 'MAT-EBOOK-CS2',
                            'net_amount': Decimal('100.00'),
                            'quantity': 1,
                            'classification': {
                                'is_digital': True,
                                'is_ebook': True,
                                'is_material': False,
                                'is_live_tutorial': False
                            }
                        }
                    ],
                    'total_net': Decimal('100.00')
                },
                'settings': {
                    'effective_date': '2025-09-30',
                    'context_version': '1.0'
                }
            }
    """
    # Extract user region from address/profile
    # Build cart items with classification
    # Calculate totals
    # Add settings and metadata
```

**Key Implementation Points:**
1. Handle anonymous users (user=None)
2. Extract country from UserProfile or default to 'ROW'
3. Use map_country_to_region from Phase 1
4. Iterate cart items and classify each product
5. Calculate net amounts (price * quantity)
6. Aggregate total_net for cart
7. Include current date as effective_date
8. Version the context structure

**Acceptance Criteria (GREEN Phase):**
- ✅ build_vat_context function implemented
- ✅ All context builder tests pass
- ✅ Integrates with Phase 1 region mapping
- ✅ Integrates with product classifier
- ✅ Handles all edge cases (no user, no address, empty cart)

---

### TASK-028: Create Per-Item Context Builder Tests (TDD RED)
**Priority:** High
**TDD Stage:** RED
**Estimate:** 45 minutes
**Status:** Pending
**Dependencies:** TASK-027

**Description:**
Write tests for per-item context extraction for individual rule evaluation.

**Test File:** `backend/django_Admin3/vat/tests/test_per_item_context.py`

**Required Tests:**
1. Test build_item_context function exists
2. Test item context structure
3. Test user data included in item context
4. Test item-specific data extracted
5. Test classification included
6. Test net_amount calculation
7. Test discount application (if present)
8. Test metadata included

**Test Structure:**
```python
from django.test import TestCase
from vat.context_builder import build_item_context

class TestPerItemContext(TestCase):
    def test_build_item_context_function_exists(self):
        """Test build_item_context function can be imported."""
        self.assertTrue(callable(build_item_context))

    def test_item_context_structure(self):
        """Test per-item context has required structure."""
        user_context = {
            'id': 123,
            'region': 'UK',
            'address': {'country': 'GB'}
        }

        item = {
            'item_id': 1,
            'product_code': 'MAT-EBOOK-CS2',
            'net_amount': Decimal('100.00'),
            'classification': {
                'is_ebook': True,
                'is_digital': True
            }
        }

        context = build_item_context(user_context, item)

        self.assertIn('user', context)
        self.assertIn('item', context)
        self.assertEqual(context['user']['region'], 'UK')
        self.assertEqual(context['item']['net_amount'], Decimal('100.00'))
        self.assertTrue(context['item']['classification']['is_ebook'])

    # ... more tests
```

**Acceptance Criteria (RED Phase):**
- ✅ Test file created with 8+ test cases
- ✅ Tests import build_item_context function (will fail)
- ✅ All tests fail as expected
- ✅ Tests cover per-item context extraction

---

### TASK-029: Implement Per-Item Context Builder (TDD GREEN)
**Priority:** High
**TDD Stage:** GREEN
**Estimate:** 30 minutes
**Status:** Pending
**Dependencies:** TASK-028

**Description:**
Implement per-item context extraction for individual rule evaluation.

**File:** `backend/django_Admin3/vat/context_builder.py` (add to existing)

**Implementation Requirements:**
```python
def build_item_context(user_context, item):
    """
    Build per-item VAT context for individual rule evaluation.

    Args:
        user_context: User portion of context from build_vat_context
        item: Single item from cart context

    Returns:
        dict: Per-item context for rule evaluation:
            {
                'user': {
                    'region': 'UK',
                    'address': {...}
                },
                'item': {
                    'item_id': 1,
                    'product_code': 'MAT-EBOOK-CS2',
                    'net_amount': Decimal('100.00'),
                    'classification': {
                        'is_ebook': True,
                        'is_digital': True
                    }
                }
            }
    """
    return {
        'user': user_context,
        'item': item
    }
```

**Acceptance Criteria (GREEN Phase):**
- ✅ build_item_context function implemented
- ✅ All per-item context tests pass
- ✅ Function extracts correct subset of data
- ✅ Maintains data types (Decimal, etc.)

---

### TASK-030: Integration Tests for Context Builder (TDD REFACTOR)
**Priority:** Medium
**TDD Stage:** REFACTOR
**Estimate:** 1 hour
**Status:** Pending
**Dependencies:** TASK-029

**Description:**
Write integration tests that verify context builder works with real database models.

**Test File:** `backend/django_Admin3/vat/tests/test_context_builder_integration.py`

**Required Tests:**
1. Test with real User and UserProfile models
2. Test with real Cart and CartItem models
3. Test with ExamSessionSubjectProduct models
4. Test region mapping integration
5. Test product classification integration
6. Test with marking vouchers in cart
7. Test with mixed cart (materials + digital + tutorials)
8. Test performance (< 10ms for typical cart)

**Test Structure:**
```python
from django.test import TestCase
from django.contrib.auth import get_user_model
from userprofile.models import UserProfile
from cart.models import Cart, CartItem
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from vat.context_builder import build_vat_context
import time

User = get_user_model()

class TestContextBuilderIntegration(TestCase):
    def setUp(self):
        # Create test data
        self.user = User.objects.create_user(
            username='integration_test',
            email='test@acted.co.uk'
        )

        self.profile = UserProfile.objects.create(
            user=self.user,
            country='GB',
            postcode='SW1A 1AA'
        )

        self.cart = Cart.objects.create(user=self.user)

        # Create test products
        self.ebook_product = ExamSessionSubjectProduct.objects.create(
            product_code='MAT-EBOOK-CS2',
            price=Decimal('80.00')
        )

        self.print_product = ExamSessionSubjectProduct.objects.create(
            product_code='MAT-PRINT-CM1',
            price=Decimal('100.00')
        )

        # Add items to cart
        CartItem.objects.create(
            cart=self.cart,
            product=self.ebook_product,
            quantity=1,
            actual_price=Decimal('80.00')
        )

        CartItem.objects.create(
            cart=self.cart,
            product=self.print_product,
            quantity=2,
            actual_price=Decimal('100.00')
        )

    def test_full_context_with_real_models(self):
        """Test context building with real database models."""
        context = build_vat_context(self.user, self.cart)

        # Verify user context
        self.assertEqual(context['user']['id'], self.user.id)
        self.assertEqual(context['user']['region'], 'UK')
        self.assertEqual(context['user']['address']['country'], 'GB')

        # Verify cart context
        self.assertEqual(len(context['cart']['items']), 2)
        self.assertEqual(context['cart']['total_net'], Decimal('280.00'))

        # Verify item classification
        ebook_item = next(i for i in context['cart']['items']
                         if 'EBOOK' in i['product_code'])
        self.assertTrue(ebook_item['classification']['is_ebook'])
        self.assertTrue(ebook_item['classification']['is_digital'])

        print_item = next(i for i in context['cart']['items']
                         if 'PRINT' in i['product_code'])
        self.assertTrue(print_item['classification']['is_material'])
        self.assertFalse(print_item['classification']['is_digital'])

    def test_performance(self):
        """Test context building performance."""
        start_time = time.time()
        context = build_vat_context(self.user, self.cart)
        end_time = time.time()

        duration_ms = (end_time - start_time) * 1000
        self.assertLess(duration_ms, 10, f"Context building took {duration_ms}ms, expected < 10ms")

    # ... more tests
```

**Acceptance Criteria:**
- ✅ 8+ integration tests written
- ✅ All tests pass with real models
- ✅ Performance test confirms < 10ms
- ✅ Edge cases covered (empty cart, no profile, etc.)

---

### TASK-031: Add Docstrings and Type Hints (TDD REFACTOR)
**Priority:** Low
**TDD Stage:** REFACTOR
**Estimate:** 30 minutes
**Status:** Pending
**Dependencies:** TASK-030

**Description:**
Add comprehensive docstrings and type hints to all context builder functions.

**Files to Update:**
1. `backend/django_Admin3/vat/product_classifier.py`
2. `backend/django_Admin3/vat/context_builder.py`

**Requirements:**
- Add type hints for all function parameters and returns
- Add detailed docstrings with Args, Returns, Examples
- Add module-level docstrings explaining purpose
- Follow Google docstring style

**Example:**
```python
from typing import Dict, Optional, Any
from decimal import Decimal
from django.contrib.auth.models import User
from cart.models import Cart

def build_vat_context(user: Optional[User], cart: Cart) -> Dict[str, Any]:
    """
    Build VAT calculation context from user and cart data.

    Extracts user region, cart items, and product classifications
    to create a structured context for VAT rules engine evaluation.

    Args:
        user: Django User object or None for anonymous users.
            If provided, user profile will be used to extract
            address and region information.
        cart: Cart object containing items to calculate VAT for.
            Must have related CartItem objects.

    Returns:
        Dict containing VAT context with structure:
            {
                'user': {...},  # User region and address
                'cart': {...},  # Cart items with classifications
                'settings': {...}  # Calculation settings
            }

    Examples:
        >>> user = User.objects.get(id=123)
        >>> cart = Cart.objects.get(user=user)
        >>> context = build_vat_context(user, cart)
        >>> print(context['user']['region'])
        'UK'

    Raises:
        ValueError: If cart is None or has no items.
    """
```

**Acceptance Criteria:**
- ✅ All functions have type hints
- ✅ All functions have comprehensive docstrings
- ✅ Module docstrings added
- ✅ Examples included where helpful

---

### TASK-032: Run Complete Test Suite and Verify Coverage
**Priority:** High
**TDD Stage:** REFACTOR
**Estimate:** 30 minutes
**Status:** Pending
**Dependencies:** TASK-031

**Description:**
Run complete Phase 3 test suite and verify ≥80% coverage.

**Test Commands:**
```bash
cd backend/django_Admin3

# Run all VAT context builder tests
python manage.py test vat.tests.test_product_classifier -v 2
python manage.py test vat.tests.test_context_builder -v 2
python manage.py test vat.tests.test_per_item_context -v 2
python manage.py test vat.tests.test_context_builder_integration -v 2

# Run with coverage
coverage run --source='vat' manage.py test vat.tests
coverage report
coverage html
```

**Coverage Requirements:**
- product_classifier.py: ≥90% coverage
- context_builder.py: ≥80% coverage
- Overall Phase 3 code: ≥80% coverage

**Test Count Expectations:**
- Product classifier tests: 12 tests (TASK-024)
- Context builder tests: 14 tests (TASK-026)
- Per-item context tests: 8 tests (TASK-028)
- Integration tests: 8 tests (TASK-030)
- **Total Phase 3 Tests: 42 tests**

**Acceptance Criteria:**
- ✅ 42/42 tests pass (100% success rate)
- ✅ Test coverage ≥ 80% for all new code
- ✅ No test failures or errors
- ✅ Performance tests pass (< 10ms)

---

### TASK-033: Create Phase 3 Completion Documentation
**Priority:** Medium
**TDD Stage:** N/A (Documentation)
**Estimate:** 30 minutes
**Status:** Pending
**Dependencies:** TASK-032

**Description:**
Document Phase 3 completion with test results and implementation summary.

**Document:** `docs/qa/phase-3-vat-context-builder-results.md`

**Content Structure:**
1. Executive Summary
   - Phase 3 completion status
   - Test pass rate
   - Coverage percentage
2. Implementation Summary
   - Files created/modified
   - Functions implemented
   - Integration points
3. Test Execution Summary
   - Tests by category
   - Pass/fail breakdown
4. TDD Workflow Verification
   - RED → GREEN → REFACTOR for each component
5. Context Structure Validation
   - Sample context output
   - Structure verification
6. Performance Verification
   - Context building latency
   - Performance test results
7. Coverage Analysis
   - Per-file coverage
   - Overall coverage
8. Acceptance Criteria Validation
9. Known Issues/Limitations
10. Recommendations for Phase 4

**Acceptance Criteria:**
- ✅ Comprehensive documentation created
- ✅ All test results documented
- ✅ Coverage analysis included
- ✅ Sample context structures included
- ✅ Phase 3 marked as COMPLETE

---

## Task Dependencies

```
TASK-024 (Product Classifier Tests - RED)
    ↓
TASK-025 (Product Classifier - GREEN)
    ↓
TASK-026 (Context Builder Tests - RED)
    ↓
TASK-027 (Context Builder - GREEN)
    ↓
TASK-028 (Per-Item Context Tests - RED)
    ↓
TASK-029 (Per-Item Context - GREEN)
    ↓
TASK-030 (Integration Tests - REFACTOR)
    ↓
TASK-031 (Docstrings - REFACTOR)
    ↓
TASK-032 (Test Suite + Coverage)
    ↓
TASK-033 (Documentation)
```

---

## TDD Workflow Reminder

For each task:
1. **RED:** Write failing test first (verify test fails)
2. **GREEN:** Write minimal code to pass test (verify test passes)
3. **REFACTOR:** Improve code while keeping tests green
4. Run full test suite before marking task complete

---

## Progress Tracking

- **Total Tasks:** 10
- **Completed:** 0
- **In Progress:** 0
- **Blocked:** 0

### Task Status Legend
- ⏳ Pending
- 🔄 In Progress
- ✅ Complete
- ❌ Blocked

---

## Phase 3 Success Criteria

### Functionality
- ✅ Product classifier correctly identifies all product types
- ✅ Context builder extracts user region from address
- ✅ Cart items include product classifications
- ✅ Per-item context extraction works
- ✅ Empty cart and anonymous user handled

### Testing
- ✅ 42/42 tests passing (100% success rate)
- ✅ Test coverage ≥ 80%
- ✅ All TDD workflows followed (RED → GREEN → REFACTOR)
- ✅ Integration tests pass with real models

### Performance
- ✅ Context building < 10ms for typical cart
- ✅ No N+1 query problems

### Code Quality
- ✅ Type hints on all functions
- ✅ Comprehensive docstrings
- ✅ Clean, maintainable code

### Documentation
- ✅ Test results documented
- ✅ Context structure examples provided
- ✅ Phase 3 completion report created

---

## Context Structure Example

```json
{
  "user": {
    "id": 123,
    "region": "UK",
    "address": {
      "country": "GB",
      "postcode": "SW1A 1AA",
      "city": "London"
    }
  },
  "cart": {
    "id": 456,
    "items": [
      {
        "item_id": 1,
        "product_id": 789,
        "product_code": "MAT-EBOOK-CS2",
        "product_name": "CS2 Study Materials (eBook)",
        "net_amount": "80.00",
        "quantity": 1,
        "classification": {
          "is_digital": true,
          "is_ebook": true,
          "is_material": false,
          "is_live_tutorial": false,
          "is_marking": false,
          "product_type": "ebook"
        }
      },
      {
        "item_id": 2,
        "product_id": 790,
        "product_code": "MAT-PRINT-CM1",
        "product_name": "CM1 Study Materials (Printed)",
        "net_amount": "100.00",
        "quantity": 2,
        "classification": {
          "is_digital": false,
          "is_ebook": false,
          "is_material": true,
          "is_live_tutorial": false,
          "is_marking": false,
          "product_type": "material"
        }
      }
    ],
    "total_net": "280.00"
  },
  "settings": {
    "effective_date": "2025-09-30",
    "context_version": "1.0"
  }
}
```

---

## Next Phase Preview

**Phase 4: Per-Item VAT Calculation Service**
- Implement calculate_cart_vat() orchestration
- Create discount allocation logic
- Integrate with Rules Engine
- Store results and audit trail

---

*Generated by SpecKit for Admin3 - Epic 3 Phase 3*

**Created:** 2025-09-30
**Status:** Ready for Implementation
**Next:** Start with TASK-024 and follow TDD principles