# Epic 3 Phase 4: Per-Item VAT Calculation Service - Task Breakdown

**Phase Goal**: Build per-item VAT calculation service that applies VAT rules to individual cart items using Rules Engine integration.

**Phase Overview**: Implement the VAT calculation service that orchestrates per-item VAT calculations, integrating with Phase 1 (VAT rates), Phase 2 (audit trail), and Phase 3 (context builder).

---

## Task List

### TASK-034: Create VAT Service Tests - Calculate Single Item (TDD RED)
**Priority:** High
**TDD Stage:** RED
**Estimate:** 1 hour
**Status:** Pending
**Dependencies:** Phase 3 complete

**Description:**
Write comprehensive tests for `calculate_vat_for_item()` function that calculates VAT for a single cart item.

**Test Cases:**
- Function exists and is callable
- Calculates UK material VAT (20%)
- Calculates UK ebook VAT (0%)
- Calculates EU material VAT (0% - ROW treatment)
- Calculates ROW digital VAT (0%)
- Returns correct structure: vat_amount, vat_rate, vat_rule_applied
- Uses Decimal type with 2 decimal precision
- Handles None/invalid inputs gracefully

**File:** `backend/django_Admin3/vat/tests/test_service.py`

**Acceptance Criteria:**
- Minimum 15 tests for single item calculation
- Tests verify RED phase (imports fail)
- Tests cover all regions (UK, EU, ROW, SA)
- Tests cover all product types (material, ebook, digital, marking, live tutorial)

---

### TASK-035: Implement VAT Service - Calculate Single Item (TDD GREEN)
**Priority:** High
**TDD Stage:** GREEN
**Estimate:** 1.5 hours
**Status:** Pending
**Dependencies:** TASK-034

**Description:**
Implement `calculate_vat_for_item()` function to calculate VAT for a single cart item.

**Implementation Details:**
```python
def calculate_vat_for_item(item_context):
    """
    Calculate VAT for a single cart item.

    Args:
        item_context: Dict with user, item, settings sections

    Returns:
        dict: {
            'item_id': int,
            'net_amount': Decimal,
            'vat_amount': Decimal,
            'vat_rate': Decimal,
            'vat_rule_applied': str,
            'exemption_reason': str (optional)
        }
    """
```

**Algorithm:**
1. Extract region from item_context['user']['region']
2. Extract classification from item_context['item']['classification']
3. Call `get_vat_rate(region, classification)` from Phase 1
4. Calculate vat_amount = net_amount * vat_rate (quantized to 2 decimals)
5. Determine vat_rule_applied based on region + classification
6. Return structured result

**File:** `backend/django_Admin3/vat/service.py`

**Acceptance Criteria:**
- All TASK-034 tests pass
- Function uses Phase 1's `get_vat_rate()` function
- All monetary values use Decimal with ROUND_HALF_UP
- Django check passes

---

### TASK-036: Create VAT Service Tests - Calculate All Cart Items (TDD RED)
**Priority:** High
**TDD Stage:** RED
**Estimate:** 1 hour
**Status:** Pending
**Dependencies:** TASK-035

**Description:**
Write tests for `calculate_vat_for_cart()` function that orchestrates VAT calculation for all cart items.

**Test Cases:**
- Function exists and is callable
- Calculates VAT for empty cart (returns empty items array)
- Calculates VAT for cart with single item
- Calculates VAT for cart with multiple items
- Aggregates totals correctly (total_net, total_vat, total_gross)
- Returns correct structure with items array and totals
- Includes region_info section
- Includes execution metadata (execution_id, created_at, execution_time_ms)
- Handles mixed product types (ebook + material)
- Handles mixed regions appropriately

**File:** `backend/django_Admin3/vat/tests/test_service.py`

**Acceptance Criteria:**
- Minimum 12 tests for cart-level calculation
- Tests verify aggregation logic
- Tests verify structure matches Epic 3 VAT result structure
- Tests verify RED phase (imports fail)

---

### TASK-037: Implement VAT Service - Calculate All Cart Items (TDD GREEN)
**Priority:** High
**TDD Stage:** GREEN
**Estimate:** 2 hours
**Status:** Pending
**Dependencies:** TASK-036

**Description:**
Implement `calculate_vat_for_cart()` function to orchestrate VAT calculation for all cart items.

**Implementation Details:**
```python
def calculate_vat_for_cart(user, cart):
    """
    Calculate VAT for all items in cart.

    Args:
        user: Django User object or None
        cart: Django Cart object

    Returns:
        dict: VAT result structure matching cart.vat_result schema
    """
```

**Algorithm:**
1. Generate unique execution_id
2. Start execution timer
3. Build full context using Phase 3's `build_vat_context(user, cart)`
4. For each item in context['cart']['items']:
   - Build per-item context with user + item + settings
   - Call `calculate_vat_for_item(item_context)`
   - Append result to items array
5. Aggregate totals: sum net_amounts, vat_amounts, calculate gross
6. Build region_info from user context
7. Stop timer, calculate execution_time_ms
8. Return structured result

**File:** `backend/django_Admin3/vat/service.py`

**Acceptance Criteria:**
- All TASK-036 tests pass
- Function integrates with Phase 3's `build_vat_context()`
- Function calls `calculate_vat_for_item()` for each item
- Result structure matches Epic 3 specification
- Django check passes

---

### TASK-038: Create VAT Service Tests - Save to Cart (TDD RED)
**Priority:** High
**TDD Stage:** RED
**Estimate:** 45 minutes
**Status:** Pending
**Dependencies:** TASK-037

**Description:**
Write tests for `save_vat_result_to_cart()` function that persists VAT calculation results to cart.vat_result field.

**Test Cases:**
- Function exists and is callable
- Saves VAT result to cart.vat_result JSONB field
- Retrieves saved VAT result correctly
- Handles cart with existing vat_result (overwrites)
- Handles cart with None vat_result (creates)
- Handles None cart gracefully
- Saved data matches input structure exactly

**File:** `backend/django_Admin3/vat/tests/test_service.py`

**Acceptance Criteria:**
- Minimum 7 tests for save functionality
- Tests verify database persistence
- Tests verify JSONB serialization
- Tests verify RED phase

---

### TASK-039: Implement VAT Service - Save to Cart (TDD GREEN)
**Priority:** High
**TDD Stage:** GREEN
**Estimate:** 45 minutes
**Status:** Pending
**Dependencies:** TASK-038

**Description:**
Implement `save_vat_result_to_cart()` function to persist VAT results to cart.

**Implementation Details:**
```python
def save_vat_result_to_cart(cart, vat_result):
    """
    Save VAT calculation result to cart.vat_result field.

    Args:
        cart: Django Cart object
        vat_result: Dict with VAT calculation results

    Returns:
        bool: True if saved successfully
    """
```

**Algorithm:**
1. Validate cart is not None
2. Assign vat_result to cart.vat_result field
3. Call cart.save(update_fields=['vat_result'])
4. Return True on success

**File:** `backend/django_Admin3/vat/service.py`

**Acceptance Criteria:**
- All TASK-038 tests pass
- Function handles None cart gracefully
- Uses update_fields for efficient save
- Django check passes

---

### TASK-040: Create VAT Audit Trail Tests (TDD RED)
**Priority:** High
**TDD Stage:** RED
**Estimate:** 1 hour
**Status:** Pending
**Dependencies:** TASK-039

**Description:**
Write tests for `create_vat_audit_record()` function that persists execution audit trail.

**Test Cases:**
- Function exists and is callable
- Creates VATAudit record with all required fields
- Stores execution_id correctly
- Links to cart via foreign key
- Stores rule_id and rule_version
- Stores input_context as JSONB
- Stores output_data as JSONB
- Stores duration_ms
- Retrieves audit record by execution_id
- Handles cart=None (anonymous)
- Handles order=None (pre-checkout)

**File:** `backend/django_Admin3/vat/tests/test_service.py`

**Acceptance Criteria:**
- Minimum 11 tests for audit creation
- Tests verify database persistence
- Tests verify Phase 2 VATAudit model integration
- Tests verify RED phase

---

### TASK-041: Implement VAT Audit Trail (TDD GREEN)
**Priority:** High
**TDD Stage:** GREEN
**Estimate:** 1 hour
**Status:** Pending
**Dependencies:** TASK-040

**Description:**
Implement `create_vat_audit_record()` function to persist audit trail.

**Implementation Details:**
```python
def create_vat_audit_record(execution_id, cart, vat_result, duration_ms, order=None):
    """
    Create audit trail record for VAT calculation.

    Args:
        execution_id: Unique execution identifier
        cart: Django Cart object or None
        vat_result: Dict with VAT calculation results
        duration_ms: Execution time in milliseconds
        order: Django ActedOrder object or None

    Returns:
        VATAudit: Created audit record
    """
```

**Algorithm:**
1. Import VATAudit from vat.models
2. Create VATAudit instance with all fields
3. Set rule_id = "calculate_vat_per_item" (or from result)
4. Set rule_version = 1 (or from result)
5. Set input_context from build_vat_context output
6. Set output_data = vat_result
7. Save and return audit record

**File:** `backend/django_Admin3/vat/service.py`

**Acceptance Criteria:**
- All TASK-040 tests pass
- Function creates VATAudit records successfully
- Function handles None cart/order
- Django check passes

---

### TASK-042: Create Integration Tests for Complete VAT Flow (TDD REFACTOR)
**Priority:** High
**TDD Stage:** REFACTOR
**Estimate:** 1.5 hours
**Status:** Pending
**Dependencies:** TASK-041

**Description:**
Write end-to-end integration tests for complete VAT calculation flow.

**Test Cases:**
- Complete flow: build context → calculate VAT → save result → create audit
- UK user with mixed cart (ebook + material)
- EU user with material products
- ROW user with digital products
- Anonymous user checkout
- Empty cart handling
- Multiple items with different VAT rates
- Audit trail verification
- Cart.vat_result persistence verification
- Decimal precision throughout flow
- Execution time tracking

**File:** `backend/django_Admin3/vat/tests/test_service_integration.py`

**Acceptance Criteria:**
- Minimum 12 end-to-end integration tests
- Tests verify complete data flow from user/cart to audit trail
- Tests verify Phase 1 + Phase 2 + Phase 3 integration
- All tests pass

---

### TASK-043: Add Docstrings and Type Hints (TDD REFACTOR)
**Priority:** Medium
**TDD Stage:** REFACTOR
**Estimate:** 30 minutes
**Status:** Pending
**Dependencies:** TASK-042

**Description:**
Add comprehensive docstrings and type hints to all VAT service functions.

**Requirements:**
- Google-style docstrings for all public functions
- Type hints for all function parameters and returns
- Examples in docstrings for complex functions
- Links to related Epic 3 documentation

**File:** `backend/django_Admin3/vat/service.py`

**Acceptance Criteria:**
- All functions have complete docstrings
- All functions have type hints
- Docstrings include Args, Returns, Raises sections
- Django check passes

---

### TASK-044: Run Complete Test Suite and Verify Coverage
**Priority:** High
**TDD Stage:** REFACTOR
**Estimate:** 30 minutes
**Status:** Pending
**Dependencies:** TASK-043

**Description:**
Run complete Phase 4 test suite and verify test coverage meets requirements.

**Commands:**
```bash
# Run all VAT tests
python manage.py test vat.tests --keepdb -v 2

# Check coverage
python manage.py test vat.tests --coverage
```

**Acceptance Criteria:**
- All Phase 4 tests pass
- Minimum 80% test coverage for vat/service.py
- No failing tests
- No Django check errors

---

### TASK-045: Create Phase 4 Completion Documentation
**Priority:** Medium
**TDD Stage:** REFACTOR
**Estimate:** 45 minutes
**Status:** Pending
**Dependencies:** TASK-044

**Description:**
Create comprehensive Phase 4 completion documentation summarizing implementation.

**Content:**
- Implementation summary
- Test results (total tests, coverage %)
- Integration points with Phase 1, 2, 3
- VAT calculation algorithm documentation
- Success criteria validation
- Known limitations
- Next phase readiness checklist

**File:** `docs/qa/phase-4-per-item-vat-calculation-completion.md`

**Acceptance Criteria:**
- Document includes all required sections
- Document includes test statistics
- Document includes integration verification
- Document formatted in Markdown

---

## Phase 4 Summary

**Total Tasks:** 12 (TASK-034 through TASK-045)
**Estimated Time:** 12.5 hours
**TDD Breakdown:**
- RED Phase: 5 tasks (TASK-034, TASK-036, TASK-038, TASK-040, TASK-042)
- GREEN Phase: 5 tasks (TASK-035, TASK-037, TASK-039, TASK-041, TASK-043)
- REFACTOR Phase: 2 tasks (TASK-044, TASK-045)

**Key Deliverables:**
1. VAT service module (`vat/service.py`)
2. Comprehensive test suite (60+ tests)
3. Integration with Phase 1, 2, 3
4. Complete VAT calculation flow
5. Audit trail integration
6. Phase 4 completion documentation

**Success Criteria:**
- ✅ All tests pass
- ✅ 80%+ test coverage
- ✅ Per-item VAT calculation implemented
- ✅ Cart-level aggregation implemented
- ✅ Audit trail integration complete
- ✅ Django check passes with no errors
- ✅ 100% TDD compliance maintained
