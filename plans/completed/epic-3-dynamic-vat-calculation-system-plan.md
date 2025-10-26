# Implementation Plan: Epic 3 - Dynamic VAT Calculation System

**Created:** 2025-09-30
**Based on:** epic-3-dynamic-vat-calculation-system.md
**Status:** Ready for Implementation

## Architecture Overview

This implementation follows a **per-item VAT evaluation architecture** that leverages the existing Rules Engine infrastructure from Epic 1. The system replaces all legacy hardcoded VAT calculations with a rules-driven approach that provides:

- **Flexibility**: VAT rules configurable through Django admin without code changes
- **Auditability**: Complete execution history with rule IDs, versions, and context snapshots
- **Precision**: Decimal-based calculations with ROUND_HALF_UP quantization
- **Performance**: < 50ms latency with caching and pre-compiled expressions

### Technology Stack

- **Backend:** Django 5.1 + Django REST Framework + PostgreSQL
- **Frontend:** React 18 + Material-UI (for VAT display updates)
- **Rules Engine:** Existing ActedRule infrastructure with JSONLogic
- **Additional:** Python Decimal for monetary calculations, JSONB for audit storage

### Key Architectural Decisions

1. **Per-Item Evaluation**: Each cart item evaluated individually (not cart-level array operations)
2. **Function Registry**: Whitelisted server-side functions (get_vat_rate, map_country_to_region, calculate_vat_amount)
3. **VAT Rates Location**: `country/vat_rates.py` module (not hardcoded in rules)
4. **Audit Trail**: Full execution history in `vat_audit` table + cart.vat_result JSONB field
5. **Discount Allocation**: Proportional allocation with VAT recalculation on adjusted net amounts

---

## Implementation Phases

### Phase 1: Foundation & VAT Rate Registry (Story 3.1 - Part 1)

**Goal:** Establish VAT rate registry and basic infrastructure

**Duration:** 2-3 days

**Tasks:**
1. Create `backend/django_Admin3/country/vat_rates.py` module
   - Implement `VAT_RATES` dictionary with Decimal values
   - Implement `REGION_MAP` with country-to-region mapping
   - Implement `map_country_to_region(country_code)` function
   - Implement `get_vat_rate(region, classification)` function with UK eBook, ROW digital, SA rules
2. Create comprehensive unit tests for vat_rates module
   - Test country-to-region mapping (UK, IE, EC, SA, ROW, CH, GG)
   - Test VAT rate retrieval for all combinations
   - Test Decimal precision and rounding
3. Update `rules_engine/custom_functions.py`
   - Register `get_vat_rate` in FUNCTION_REGISTRY
   - Register `map_country_to_region` in FUNCTION_REGISTRY
   - Implement `calculate_vat_amount(net_amount, vat_rate)` with ROUND_HALF_UP
   - Register `calculate_vat_amount` in FUNCTION_REGISTRY

**Acceptance Criteria:**
- ✅ All unit tests pass with 100% coverage
- ✅ VAT rates stored as Decimal (not float)
- ✅ Region mapping covers all specified countries
- ✅ Functions registered and callable from rules engine

---

### Phase 2: VAT Audit Trail & Database Schema (Story 3.1 - Part 2)

**Goal:** Create database schema for VAT audit trail and result storage

**Duration:** 1-2 days

**Tasks:**
1. Create `backend/django_Admin3/vat/` Django app
   - Run `python manage.py startapp vat`
   - Add to INSTALLED_APPS in settings
2. Create `vat/models.py` with VATAudit model
   - Fields: execution_id, cart_id, order_id, rule_id, rule_version, input_context (JSONB), output_data (JSONB), duration_ms, created_at
   - Indexes: execution_id, cart_id, order_id, rule_id
3. Create migration for `vat_audit` table
   - Run `python manage.py makemigrations vat`
4. Create migration for `cart.vat_result` JSONB field
   - Add `vat_result = models.JSONField(null=True, blank=True)` to Cart model
   - Create GIN index on vat_result
   - Run `python manage.py makemigrations cart`
5. Run migrations on development database
6. Create tests for VATAudit model

**Database Schema Changes:**

```sql
-- VAT audit trail
CREATE TABLE vat_audit (
    id SERIAL PRIMARY KEY,
    execution_id VARCHAR(100) NOT NULL,
    cart_id INTEGER REFERENCES cart(id),
    order_id INTEGER REFERENCES orders(id),
    rule_id VARCHAR(100) NOT NULL,
    rule_version INTEGER NOT NULL,
    input_context JSONB NOT NULL,
    output_data JSONB NOT NULL,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_vat_audit_execution_id ON vat_audit(execution_id);
CREATE INDEX idx_vat_audit_cart_id ON vat_audit(cart_id);
CREATE INDEX idx_vat_audit_rule_id ON vat_audit(rule_id);

-- Cart VAT result storage
ALTER TABLE cart ADD COLUMN vat_result JSONB;
CREATE INDEX idx_cart_vat_result ON cart USING GIN (vat_result);
```

**Acceptance Criteria:**
- ✅ Migrations run successfully without errors
- ✅ VATAudit model can store execution history
- ✅ Cart.vat_result JSONB field available
- ✅ All indexes created properly

---

### Phase 3: VAT Context Builder (Story 3.1 - Part 3)

**Goal:** Build VAT execution context from user and cart data

**Duration:** 2 days

**Tasks:**
1. Create `vat/context_builder.py`
   - Implement `build_vat_context(user, cart)` function
   - Extract user address and region
   - Build cart items with product classification
   - Add settings (effective_date)
2. Create `vat/product_classifier.py`
   - Implement `classify_product(product)` function
   - Determine is_digital, is_ebook, is_live_tutorial flags
   - Use product_code patterns for classification
3. Create comprehensive tests for context_builder
   - Test with various user address scenarios
   - Test with mixed cart items (digital, physical, eBooks)
   - Test product classification logic

**Acceptance Criteria:**
- ✅ Context structure matches specification
- ✅ Product classification accurate for all product types
- ✅ User address region correctly determined
- ✅ All tests pass with 80%+ coverage

---

### Phase 4: Per-Item VAT Calculation Service (Story 3.1 - Part 4)

**Goal:** Implement per-item VAT calculation orchestration

**Duration:** 3-4 days

**Tasks:**
1. Create `vat/service.py` with `calculate_cart_vat(context)` function
   - Iterate through cart items
   - Create per-item context for each item
   - Call `rules_engine.execute("calculate_vat_per_item", item_context)`
   - Collect results with vat_amount, vat_rate, vat_rule_applied
   - Aggregate totals
   - Persist to cart.vat_result JSONB
   - Store audit trail in VATAudit model
2. Create `vat/discount_allocator.py`
   - Implement `allocate_discounts_and_recalc(context, vat_results)` function
   - Proportional discount allocation algorithm
   - VAT recalculation on adjusted net amounts
3. Create integration tests for calculate_cart_vat
   - Test mixed cart (digital + physical)
   - Test UK eBook zero VAT
   - Test ROW digital zero VAT
   - Test discount allocation
   - Test audit trail persistence
4. Create performance tests
   - Measure latency for various cart sizes
   - Ensure < 50ms target met

**Acceptance Criteria:**
- ✅ Per-item evaluation working correctly
- ✅ Results aggregated properly
- ✅ Audit trail stored in vat_audit table
- ✅ cart.vat_result JSONB populated
- ✅ Discount allocation algorithm correct
- ✅ Performance target met (< 50ms)
- ✅ All integration tests pass

---

### Phase 5: VAT Rules Creation (Story 3.1 - Part 5)

**Goal:** Create ActedRule entries for VAT calculation

**Duration:** 2 days

**Tasks:**
1. Create `calculate_vat_per_item` entry point in RuleEntryPoint model
2. Create VAT rules via Django admin:
   - `vat_uk_standard` (UK 20% VAT rule)
   - `vat_uk_ebook_zero` (UK eBook 0% VAT post-2020 rule)
   - `vat_row_digital_zero` (ROW digital 0% VAT rule)
   - `vat_sa_standard` (South Africa 15% VAT rule)
   - `vat_default_fallback` (Default fallback rule)
3. Create rule JSON examples for documentation
4. Test rules via Rules Engine execute endpoint

**Example Rule JSON:**

```json
{
  "rule_id": "vat_uk_ebook_zero",
  "name": "UK eBook Zero VAT (Post-2020)",
  "entry_point": "calculate_vat_per_item",
  "priority": 10,
  "active": true,
  "version": 1,
  "condition": {
    "and": [
      {"==": [{"var": "user_address.region"}, "UK"]},
      {"==": [{"var": "item.product_classification.is_ebook"}, true]},
      {">=": [{"var": "settings.effective_date"}, "2020-05-01"]}
    ]
  },
  "actions": [
    {
      "type": "update",
      "target": "item.vat_amount",
      "operation": "set",
      "value": {"function": "calculate_vat_amount", "args": ["item.net_amount", 0.00]}
    },
    {
      "type": "update",
      "target": "item.vat_rate",
      "operation": "set",
      "value": 0.00
    },
    {
      "type": "update",
      "target": "item.vat_rule_applied",
      "operation": "set",
      "value": "vat_uk_ebook_zero:v1"
    }
  ],
  "stop_processing": true
}
```

**Acceptance Criteria:**
- ✅ All VAT rules created and active
- ✅ Rules execute correctly via API
- ✅ Rule chaining works (priority ordering)
- ✅ stop_processing flag respected

---

### Phase 6: Entry Point Integration (Story 3.1 - Part 6)

**Goal:** Integrate VAT calculation with checkout entry points

**Duration:** 2 days

**Tasks:**
1. Create `checkout_start` entry point integration
   - Call `calculate_cart_vat` when checkout starts
   - Return vat_calculations in response
2. Create `checkout_payment` entry point integration
   - Recalculate VAT at payment step
   - Validate cart.vat_result matches current calculation
3. Update cart API endpoints to include vat_result
4. Create API contract tests
   - Test `/api/rules/engine/execute/` with checkout_start
   - Test `/api/rules/engine/execute/` with checkout_payment
   - Verify response structure

**API Endpoints:**

```
POST /api/rules/engine/execute/
  Body: { "entryPoint": "checkout_start", "context": {...} }
  Response: { "vat_calculations": {...}, "rules_executed": [...], "execution_id": "..." }
```

**Acceptance Criteria:**
- ✅ checkout_start triggers VAT calculation
- ✅ checkout_payment triggers VAT recalculation
- ✅ API responses include vat_calculations
- ✅ All contract tests pass

---

### Phase 7: Legacy VAT Code Removal (Story 3.1 - Part 7)

**Goal:** Remove all legacy hardcoded VAT calculations

**Duration:** 1 day

**Tasks:**
1. Remove hardcoded VAT calculation from `cart/services.py:473-485`
   - Replace with `calculate_cart_vat` call
2. Search and remove all backend VAT-related legacy code
   - Run tests from `cart/tests/test_vat_removal.py` to verify
3. Update cart serializers to use vat_result field
4. Create regression tests comparing legacy vs new VAT calculations

**Files to Update:**
- `backend/django_Admin3/cart/services.py` - Remove lines 473-485 (hardcoded 20% VAT)
- Search for any remaining `vat_rate = Decimal('0.20')` patterns

**Acceptance Criteria:**
- ✅ All legacy VAT code removed from backend
- ✅ `test_vat_removal.py` tests pass
- ✅ Regression tests show matching results
- ✅ No hardcoded VAT rates remain

---

### Phase 8: Frontend VAT Display Updates (Story 3.1 - Part 8)

**Goal:** Update React frontend to consume new VAT calculations

**Duration:** 2-3 days

**Tasks:**
1. Update ProductCard components to use VAT from API
2. Update CheckoutSteps to display vat_calculations
3. Remove any frontend VAT calculation logic
4. Update cart total display components
5. Create frontend tests for VAT display
6. Use Browser MCP to verify visual rendering

**Frontend Components to Update:**
- `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.js`
- `frontend/react-Admin3/src/components/Ordering/CheckoutSteps.js`
- `frontend/react-Admin3/src/components/Product/ProductGrid.js`
- `frontend/react-Admin3/src/components/Product/ProductList.js`

**Acceptance Criteria:**
- ✅ All frontend components use API VAT data
- ✅ No frontend VAT calculation logic remains
- ✅ Browser MCP verification passes
- ✅ Visual rendering correct

---

### Phase 9: Testing & Documentation (Story 3.1 - Part 9)

**Goal:** Comprehensive testing and documentation

**Duration:** 2-3 days

**Tasks:**
1. Run complete test suite
   - Unit tests (vat_rates, context_builder, service)
   - Integration tests (calculate_cart_vat, discount allocation)
   - Contract tests (API endpoints)
   - Regression tests (legacy comparison)
   - Performance tests (< 50ms latency)
2. Verify test coverage (80%+ minimum)
3. Create user documentation for VAT admin interface
4. Create technical documentation for VAT system
5. Run Jenny specification compliance verification

**Testing Requirements:**

```bash
# Backend tests
cd backend/django_Admin3
python manage.py test vat --coverage
python manage.py test country.tests.test_vat_rates --coverage

# Verify coverage
python manage.py test --coverage --coverage-report
```

**Acceptance Criteria:**
- ✅ All tests pass (100% success rate)
- ✅ Test coverage > 80%
- ✅ Jenny verification passes
- ✅ Documentation complete
- ✅ Performance benchmarks met

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Legacy VAT calculations differ from new system | High | Run parallel execution in shadow mode, compare results, extensive regression testing |
| Performance degradation with complex carts | Medium | Implement caching, pre-compile rule expressions, performance testing |
| Discount allocation edge cases | Medium | Comprehensive unit tests, business user validation |
| Rule misconfiguration causes incorrect VAT | High | Dry-run mode for testing, rule versioning with rollback capability |
| Database migration issues in production | Medium | Test migrations on staging first, have rollback plan |

---

## Success Metrics

### Technical Success Criteria
- ✅ All tests passing (100% success rate)
- ✅ Test coverage > 80% for new code
- ✅ Performance < 50ms per cart VAT calculation
- ✅ Zero regression issues from legacy comparison
- ✅ Jenny specification compliance verification passes

### Business Success Criteria
- ✅ VAT calculations match legacy system (parallel run validation)
- ✅ All product types correctly classified
- ✅ All regional VAT rules working correctly
- ✅ Finance team can manage VAT rates via admin interface
- ✅ Complete audit trail for compliance

### Deployment Readiness
- ✅ All migrations tested on staging
- ✅ Rollback procedure documented and tested
- ✅ Monitoring and alerting configured
- ✅ Documentation complete

---

## Next Steps

1. ✅ **Review this implementation plan** - Validate approach and phases
2. 🚀 **Run `/tasks`** - Generate detailed task breakdown for Phase 1
3. 🧪 **Begin TDD implementation** - Start with vat_rates unit tests (RED phase)
4. ✅ **Use Jenny verification** - Verify each phase against specifications

---

*Generated by SpecKit for Admin3 project*
*Based on: Epic 3 - Dynamic VAT Calculation System*