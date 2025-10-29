# Sprint Change Proposal

**Change ID**: VAT-ARCH-2025-10-12
**Epic**: Epic 3 - Dynamic VAT Calculation System
**Branch**: `003-vat-calculation-rules-engine`
**Created**: 2025-10-12
**Status**: ✅ APPROVED

---

## Executive Summary

The VAT calculation implementation on branch `003-vat-calculation-rules-engine` has **critically deviated** from the approved architecture. Instead of implementing a Rules Engine-driven system (as specified in all PRD, spec, and plan documents), the implementation created traditional hardcoded Python calculation services that violate the core architectural principle: **"Rules Engine First: ALL VAT logic in Rules Engine (zero Python calculation code)"**.

**Impact Level**: 🔴 **CRITICAL** - Core architectural violation
**Work Affected**: ~40-50% of Epic 3 implementation
**Recommended Action**: **Direct Adjustment** - Delete wrong code, rebuild correctly
**Timeline Impact**: +8-12 days to correct implementation

---

## 1. Analysis Summary

### 1.1 Original Issue

**Trigger**: Review of `docs/prompt-dump/vat.md` revealed implementation does not use Rules Engine as designed.

**Root Cause**: Implementation completely bypassed Rules Engine architecture and created hardcoded Python VAT calculation services instead of configurable business rules.

### 1.2 Analyzed Impact

#### On Epic 3

| Phase | Plan Status | Actual Status | Assessment |
|-------|-------------|---------------|------------|
| Phase 1: Database Foundation | 3-4 days | ✅ COMPLETE | ✅ **KEEP** - Correct |
| Phase 2: Custom Functions | 2 days | ❌ WRONG | ❌ **REBUILD** - Monolithic function instead of granular |
| Phase 3-4: Rules Creation | 5-7 days | ❌ WRONG | ❌ **REBUILD** - 3 simple rules vs 11+ composite |
| Phase 5: Integration | 2-3 days | ❌ WRONG | ❌ **REBUILD** - Wrong entry points, Python calls |
| Phase 6: Legacy Removal | 1-2 days | ❌ NOT DONE | ❌ **DO** - Legacy code still active |
| Phase 7: Admin | 2 days | ⚠️ PARTIAL | ⚠️ **COMPLETE** - Enhance admin |
| Phase 8: Frontend | 2-3 days | ⚠️ PARTIAL | ✅ **KEEP** - VATBreakdown component good |
| Phase 9: Testing | 2-3 days | ❌ WRONG FOCUS | ❌ **REWRITE** - Tests for Python, not Rules |

**Completion Assessment**:
- ✅ **30% salvageable** (Database, frontend components, test infrastructure)
- ❌ **50% must be deleted** (Python services, wrong rules, wrong tests)
- 🔧 **40% must be rebuilt** (Correct rules, custom functions, integration)

#### On Artifacts

**Documents Requiring Action**:
- ❌ **DELETE**: `docs/qa/phase-4-per-item-vat-calculation-completion.md` - Documents wrong implementation
- ⚠️ **REVIEW**: `docs/qa/phase-3-vat-context-builder-completion.md` - May have wrong imports
- ✅ **NO CHANGES**: All PRD, spec, plan, and architecture documents are CORRECT

#### On MVP Scope

**MVP Impact**: ✅ **NO SCOPE REDUCTION NEEDED**

The MVP scope remains unchanged. The issue is implementation approach, not requirements. All original Epic 3 goals are still achievable with correct implementation.

### 1.3 Rationale for Recommended Path

**Selected Path**: **Option 1 - Direct Adjustment**

**Why This Path**:

1. **Preserves Good Foundation**:
   - Database schema (UtilsRegion, UtilsCountrys, UtilsCountryRegion) is excellent ✅
   - Migrations already applied and data populated ✅
   - Frontend VATBreakdown component reusable ✅

2. **Minimal Waste**:
   - Delete ~700 LOC of wrong Python code
   - Rebuild ~500 LOC of correct Rules Engine configuration
   - Net: Similar code volume, correct architecture

3. **Fastest to Completion**:
   - Option 1: 8-12 days to correct implementation
   - Option 2 (Full rollback): 12-15 days
   - Option 3 (Keep Python): Violates architectural requirements

4. **Maintains Business Value**:
   - Achieves "staff-configurable VAT rules" goal
   - Enables "VAT rate updates without code deployment"
   - Provides required "rules-driven calculation system"

---

## 2. Specific Proposed Edits

### 2.1 Code Deletions

#### **DELETE: `backend/django_Admin3/vat/service.py`**

**Reason**: Entire file violates "zero Python calculation code" principle

**Lines to Delete**: All 306 lines

**Critical Violations**:
```python
# Line 11: Imports legacy hardcoded VAT rates
from country.vat_rates import get_vat_rate

# Lines 14-78: Hardcoded Python VAT calculation logic
def calculate_vat_for_item(item_context):
    vat_rate = get_vat_rate(region, classification)  # ← Should be Rules Engine
    vat_amount = (net_amount * vat_rate).quantize(...)  # ← Should be in Rules

# Lines 80-136: Hardcoded rule determination
def _determine_vat_rule(region, classification, vat_rate):
    if region == 'UK' and classification.get('is_ebook', False):  # ← Should be Rule
        return 'vat_uk_ebook_zero:v1'
```

**Replacement**: Rules Engine custom functions + composite rules

---

#### **DELETE: `backend/django_Admin3/utils/services/vat_service.py`**

**Reason**: Python calculation service contradicts architecture

**Lines to Delete**: All 294 lines

**Critical Violations**:
```python
# Lines 25-278: VATCalculationService class with Python logic
class VATCalculationService:
    def calculate_vat(self, country_code: str, net_amount: Decimal):
        vat_rate = country.vat_percent  # ← Good: uses utils_countrys
        vat_amount = self._calculate_vat_amount(net_amount, vat_rate)  # ← Bad: Python calc
```

**Keep Concept**: Database lookups are correct, but calculations must move to Rules Engine

---

#### **DELETE: `backend/django_Admin3/vat/product_classifier.py`**

**Reason**: Unnecessary - cart context already has `product_type` and `metadata`

**Lines to Delete**: Entire file

**Replacement**: Use existing cart item data structure

---

#### **DELETE: `backend/django_Admin3/rules_engine/migrations/0009_setup_vat_calculation_rules.py`**

**Reason**: Creates wrong rule pattern (3 simple rules with monolithic function)

**Lines to Delete**: All 130 lines

**Critical Violations**:
```python
# Lines 11-39: Wrong rule pattern
ActedRule.objects.create(
    rule_code='vat_calculation_cart_view',
    entry_point='cart_view',  # ← Wrong entry point
    actions=[{
        "type": "calculate",
        "function_name": "calculate_vat_for_context",  # ← Monolithic function
    }]
)
```

**Replacement**: New migration with 11+ composite rules following specification

---

#### **DELETE: `backend/django_Admin3/vat/context_builder.py` Lines 26, 89**

**Reason**: Imports legacy hardcoded VAT rates

**Specific Deletions**:
```python
# Line 26 - DELETE this import
from country.vat_rates import map_country_to_region

# Line 89 - DELETE this function call
region = map_country_to_region(country_code)
```

**Replacement**:
```python
# Use utils models and Rules Engine custom function
from utils.models import UtilsCountryRegion
# In Rules Engine custom_functions.py:
def lookup_region(country_code):
    # Query UtilsCountryRegion for region
```

---

### 2.2 Code Rebuilds

#### **REBUILD: `backend/django_Admin3/rules_engine/custom_functions.py`**

**Add Granular VAT Functions**:

```python
# Addition to custom_functions.py (NEW functions)

from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone
from django.db.models import Q
from utils.models import UtilsCountrys, UtilsCountryRegion

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

        return mapping.region.code if mapping else 'ROW'
    except UtilsCountrys.DoesNotExist:
        return 'ROW'


def lookup_vat_rate(country_code: str) -> Decimal:
    """
    Get VAT rate percentage from UtilsCountrys.

    Args:
        country_code: ISO 3166-1 alpha-2 country code

    Returns:
        VAT rate as Decimal (e.g., Decimal('0.20') for 20%)
    """
    try:
        country = UtilsCountrys.objects.get(code=country_code.upper())
        return country.vat_percent / Decimal('100')  # Convert percentage to decimal
    except UtilsCountrys.DoesNotExist:
        return Decimal('0.00')


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


# Register functions
FUNCTION_REGISTRY.update({
    'lookup_region': lookup_region,
    'lookup_vat_rate': lookup_vat_rate,
    'calculate_vat_amount': calculate_vat_amount,
})
```

---

#### **REBUILD: Rules Engine VAT Rule Hierarchy**

**New Migration**: `backend/django_Admin3/rules_engine/migrations/0010_correct_vat_rules.py`

**Master Rule Structure**:
```python
def create_correct_vat_rules(apps, schema_editor):
    ActedRule = apps.get_model('rules_engine', 'ActedRule')

    # Master Rule: calculate_vat
    ActedRule.objects.create(
        rule_code='calculate_vat',
        name='Master VAT Calculation',
        entry_point='calculate_vat',  # NEW entry point
        priority=100,
        active=True,
        condition={"==": [1, 1]},  # Always execute
        actions=[
            {
                "type": "call_function",
                "function": "lookup_region",
                "args": [{"var": "user.country"}],
                "target": "context.region"
            },
            {
                "type": "call_rule",
                "rule_id": {
                    "if": [
                        {"==": [{"var": "context.region"}, "UK"]}, "calculate_vat_uk",
                        {"==": [{"var": "context.region"}, "EU"]}, "calculate_vat_eu",
                        {"==": [{"var": "context.region"}, "SA"]}, "calculate_vat_sa",
                        {"==": [{"var": "context.region"}, "IE"]}, "calculate_vat_ie",
                        "calculate_vat_row"
                    ]
                }
            }
        ]
    )

    # Regional Rule: calculate_vat_uk
    ActedRule.objects.create(
        rule_code='calculate_vat_uk',
        name='UK VAT Calculation',
        priority=90,
        condition={"==": [{"var": "context.region"}, "UK"]},
        actions=[{
            "type": "foreach",
            "collection": "cart.items",
            "actions": [
                {"type": "call_rule", "rule_id": "calculate_vat_uk_digital_product"},
                {"type": "call_rule", "rule_id": "calculate_vat_uk_printed_product"},
                {"type": "call_rule", "rule_id": "calculate_vat_uk_flash_card"},
                {"type": "call_rule", "rule_id": "calculate_vat_uk_pbor"}
            ]
        }]
    )

    # Product Rule: calculate_vat_uk_digital_product
    ActedRule.objects.create(
        rule_code='calculate_vat_uk_digital_product',
        name='UK Digital Product - Zero VAT',
        priority=95,
        condition={
            "and": [
                {"==": [{"var": "item.product_type"}, "digital"]},
                {"or": [
                    {"==": [{"var": "item.metadata.is_ebook"}, True]},
                    {"==": [{"var": "item.metadata.is_online_classroom"}, True]}
                ]}
            ]
        },
        actions=[
            {"type": "update", "target": "item.vat", "value": 0},
            {"type": "update", "target": "item.vat_rule_applied", "value": "calculate_vat_uk_digital_product:v1"}
        ],
        stop_processing=True
    )

    # ... Continue for all 11+ rules in hierarchy
```

**Complete Rule Tree**:
```
calculate_vat (master - Priority 100)
├── calculate_vat_uk (Priority 90)
│   ├── calculate_vat_uk_digital_product (Priority 95)
│   ├── calculate_vat_uk_printed_product (Priority 85)
│   ├── calculate_vat_uk_flash_card (Priority 80)
│   └── calculate_vat_uk_pbor (Priority 80)
├── calculate_vat_eu (Priority 90)
│   └── calculate_vat_eu_product (Priority 85)
├── calculate_vat_sa (Priority 90)
│   └── calculate_vat_sa_product (Priority 85)
├── calculate_vat_ie (Priority 90)
│   └── calculate_vat_ie_product (Priority 85)
└── calculate_vat_row (Priority 90)
    └── calculate_vat_row_product (Priority 85)
```

---

#### **REBUILD: Entry Point Integration**

**File**: `backend/django_Admin3/cart/views.py`

**Current (WRONG)**:
```python
# Direct Python function calls
from vat.service import calculate_vat_for_cart
vat_result = calculate_vat_for_cart(user, cart)
```

**Corrected**:
```python
# Rules Engine execution
from rules_engine.services.rule_engine import RuleEngine

# At add_to_cart
context = build_cart_context(user, cart)
vat_result = RuleEngine.execute('calculate_vat', context)
cart.vat_result = vat_result
cart.save(update_fields=['vat_result'])

# At checkout_start
context = build_cart_context(user, cart)
vat_result = RuleEngine.execute('calculate_vat', context)
cart.vat_result = vat_result
cart.save(update_fields=['vat_result'])

# At checkout_payment
context = build_cart_context(user, cart)
vat_result = RuleEngine.execute('calculate_vat', context)
# Validate vat_result matches expectations
```

---

### 2.3 Test Rewrites

#### **REWRITE: All VAT Tests**

**Change Focus**: From "Test Python calculations" → "Test Rules Engine execution"

**Example Test Conversion**:

**WRONG (Current)**:
```python
# vat/tests/test_service.py
def test_calculate_vat_for_item_uk_material():
    item_context = {...}
    result = calculate_vat_for_item(item_context)  # ← Testing Python function
    assert result['vat_amount'] == Decimal('20.00')
```

**CORRECT (New)**:
```python
# rules_engine/tests/test_vat_rules_integration.py
def test_vat_rule_uk_material():
    context = {
        'user': {'country': 'GB'},
        'cart': {'items': [
            {'product_type': 'physical', 'actual_price': 100, 'metadata': {}}
        ]}
    }
    result = RuleEngine.execute('calculate_vat', context)  # ← Testing Rules Engine
    assert result['cart']['items'][0]['vat'] == 20.00
    assert 'calculate_vat_uk' in result['rules_executed']
```

**Test Files to Rewrite**:
- ❌ DELETE: `vat/tests/test_service.py` (tests Python functions)
- ✅ CREATE: `rules_engine/tests/test_vat_rules_integration.py` (tests Rules execution)
- ✅ CREATE: `rules_engine/tests/test_vat_custom_functions.py` (tests granular functions)
- ✅ UPDATE: `cart/tests/test_cart_vat_integration.py` (fix to call Rules Engine)

---

### 2.4 Documentation Updates

#### **DELETE: `docs/qa/phase-4-per-item-vat-calculation-completion.md`**

**Reason**: Documents wrong Python service implementation

**Status**: Mark as **DEPRECATED** or delete entirely

**Replacement**: Create new completion report after correct implementation

---

#### **REVIEW: `docs/qa/phase-3-vat-context-builder-completion.md`**

**Check For**: References to `country.vat_rates` imports

**If Found**: Update to reference `utils.models` and Rules Engine custom functions

---

### 2.5 Entry Points

**Update**: `backend/django_Admin3/rules_engine/models/rule_entry_point.py`

**Add New Entry Points**:
```python
# Correct entry points per specification
ENTRY_POINTS = [
    ('calculate_vat', 'Calculate VAT'),  # NEW - Master VAT entry point
    ('add_to_cart', 'Add to Cart'),
    ('checkout_start', 'Checkout Start'),
    ('checkout_payment', 'Checkout Payment'),
    # ... existing entry points
]
```

**Remove Wrong Entry Points**:
- ❌ `cart_view` (not in specification)
- ❌ `order_summary` (wrong timing)

---

## 3. Implementation Plan

### 3.1 Execution Phases

**Phase 1: Cleanup (1-2 days)**
1. Create backup branch `003-vat-backup`
2. Delete `vat/service.py`
3. Delete `utils/services/vat_service.py`
4. Delete `vat/product_classifier.py`
5. Rollback migration 0009
6. Remove wrong imports from `vat/context_builder.py`
7. Mark QA completion reports as deprecated

**Phase 2: Custom Functions (1-2 days)**
1. Implement `lookup_region()` in `rules_engine/custom_functions.py`
2. Implement `lookup_vat_rate()` in `rules_engine/custom_functions.py`
3. Implement `calculate_vat_amount()` in `rules_engine/custom_functions.py`
4. Register functions in FUNCTION_REGISTRY
5. Write unit tests for each function

**Phase 3: Composite Rules (3-4 days)**
1. Create migration 0010 with master `calculate_vat` rule
2. Create 5 regional rules (UK, EU, SA, IE, ROW)
3. Create 11+ product-specific sub-rules
4. Test rule routing logic
5. Verify rule execution order (priority + created_at)

**Phase 4: Entry Point Integration (2-3 days)**
1. Add `calculate_vat` entry point to RuleEntryPoint model
2. Update `cart/views.py` add_to_cart to call Rules Engine
3. Update `cart/views.py` checkout flows to call Rules Engine
4. Remove direct Python function calls
5. Test end-to-end cart → checkout flow

**Phase 5: Legacy Removal (1 day)**
1. Remove all `country.vat_rates` imports
2. Verify no hardcoded VAT calculations remain
3. Run full test suite
4. Code review for compliance

**Phase 6: Testing (1-2 days)**
1. Rewrite VAT tests to validate Rules Engine
2. Create integration tests for full checkout flow
3. Test all region × product combinations
4. Verify audit trail creation
5. Performance testing (< 50ms target)

---

### 3.2 Acceptance Criteria for Completion

**Technical**:
- [ ] ✅ Zero Python VAT calculation code remains
- [ ] ✅ All VAT logic in Rules Engine (11+ rules created)
- [ ] ✅ Custom functions use UtilsCountrys for VAT rates
- [ ] ✅ Entry points: add_to_cart, checkout_start, checkout_payment
- [ ] ✅ Composite rule pattern working (master → regional → product)
- [ ] ✅ All tests rewritten to validate Rules Engine execution
- [ ] ✅ VAT calculations < 50ms per cart
- [ ] ✅ Audit trail created for all calculations

**Business**:
- [ ] ✅ Staff can modify VAT rates via Django admin (no code changes)
- [ ] ✅ Staff can enable/disable VAT rules via admin
- [ ] ✅ All regions supported (UK, IE, EU, SA, ROW)
- [ ] ✅ All product types supported (digital, physical, tutorials, etc.)
- [ ] ✅ Complete VAT calculation audit trail

**Compliance**:
- [ ] ✅ Architecture matches PRD specification exactly
- [ ] ✅ All 45 functional requirements met
- [ ] ✅ Zero conflicts with approved architecture documents
- [ ] ✅ TDD methodology maintained throughout corrections

---

## 4. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Rules Engine doesn't support needed functionality | LOW | HIGH | Verify capabilities before deletion, extend if needed |
| Performance issues with Rules Engine | MEDIUM | MEDIUM | Performance testing in Phase 6, optimize rule execution |
| Team morale from deleting recent work | MEDIUM | LOW | Clear communication of architectural importance |
| Timeline slip beyond 12 days | MEDIUM | MEDIUM | Daily progress tracking, adjust scope if critical |
| Test coverage gaps during rewrite | MEDIUM | MEDIUM | Comprehensive test planning before deletion |

---

## 5. Success Validation Criteria

**How to Confirm Correction is Complete**:

1. **Code Verification**:
```bash
# No Python VAT calculation code should exist
grep -r "def calculate_vat" backend/django_Admin3/vat/  # Should return nothing
grep -r "vat_rate \* " backend/django_Admin3/  # Should only be in tests

# All VAT logic should be in Rules Engine
grep -r "calculate_vat" backend/django_Admin3/rules_engine/migrations/  # Should find 0010
```

2. **Rules Engine Verification**:
```bash
# Check rules created
python manage.py shell
>>> from rules_engine.models import ActedRule
>>> ActedRule.objects.filter(rule_code__startswith='calculate_vat').count()
11  # Should be 11+ rules

>>> ActedRule.objects.get(rule_code='calculate_vat').entry_point
'calculate_vat'  # Correct entry point
```

3. **Integration Verification**:
```bash
# Check cart views call Rules Engine
grep -r "RuleEngine.execute" backend/django_Admin3/cart/views.py  # Should find it
grep -r "calculate_vat_for_cart" backend/django_Admin3/cart/views.py  # Should NOT find it
```

4. **Test Verification**:
```bash
# Run all VAT tests
cd backend/django_Admin3
python manage.py test rules_engine.tests.test_vat_rules_integration
python manage.py test rules_engine.tests.test_vat_custom_functions
python manage.py test cart.tests.test_cart_vat_integration

# All should pass with Rules Engine execution
```

---

## 6. Next Steps

### Immediate Actions (Day 1)

1. **Create Backup Branch**:
```bash
git checkout 003-vat-calculation-rules-engine
git checkout -b 003-vat-backup
git push -u origin 003-vat-backup
git checkout 003-vat-calculation-rules-engine
```

2. **Begin Phase 1 Cleanup**:
```bash
# Delete Python VAT services
rm backend/django_Admin3/vat/service.py
rm backend/django_Admin3/utils/services/vat_service.py
rm backend/django_Admin3/vat/product_classifier.py

# Rollback wrong migration
python manage.py migrate rules_engine 0008
rm backend/django_Admin3/rules_engine/migrations/0009_setup_vat_calculation_rules.py

# Commit deletions
git add -A
git commit -m "refactor: Remove Python VAT services (architectural correction)

Ref: Sprint Change Proposal VAT-ARCH-2025-10-12"
```

### Agent Handoff

**Recommended for Implementation**: DEV Agent

**Context for Handoff**:
- Task: Execute Epic 3 VAT architectural correction
- Branch: `003-vat-calculation-rules-engine`
- Timeline: 8-12 days across 6 phases
- Reference: This Sprint Change Proposal

---

## 7. Approval

**Status**: ✅ **APPROVED** by user on 2025-10-12

**Approved Actions**:
1. ✅ Delete ~700 lines of wrong Python VAT services
2. ✅ Rebuild ~500 lines of correct Rules Engine configuration
3. ✅ Achieve architectural compliance with PRD/spec
4. ✅ Complete Epic 3 using Direct Adjustment approach (8-12 days)

---

**Document Control**
**Created**: 2025-10-12
**Change Analysis Method**: BMAD Change Navigation Checklist
**Reviewed By**: PM Agent (John)
**Approved By**: User
**Status**: Ready for Implementation
