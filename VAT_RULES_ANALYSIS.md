# VAT Rules Analysis: Product-Specific Rate Issue

**Date:** 2025-10-17
**Issue:** All products receiving 20% VAT regardless of product type
**Root Cause:** Product-specific rules have identical actions that all use the same `vat.rate` variable

---

## Problem Summary

**User Report:**
- All cart items getting 20% VAT for UK user
- Expected behavior:
  - **Printed Series X Assignments**: 0% VAT (UK Printed Product VAT rule)
  - **Digital Mini ASET**: 20% VAT (UK Digital Product VAT rule)
  - **FlashCards**: 20% VAT (UK FlashCard Product VAT rule)

**User's Observation:**
> "the actions fields in those rules in acted_rules is identical? How do user set the vat rate with those specialised rule?"

**Analysis Result:** User is CORRECT - the actions are identical across all product-specific rules.

---

## Current Rules Architecture

### Rule Execution Flow (by Priority - higher executes first)

#### Priority 100: Master Region Lookup
```python
Rule: "Master VAT Calculation Rule"
Condition: user.country_code != None
Actions: [
    lookup_region(user.country_code) → stores in vat.region
]
# For GB user → vat.region = 'UK'
```

#### Priority 90: Region-Specific Rate Lookup
```python
Rule: "UK VAT Calculation"
Condition: vat.region == 'UK'
Actions: [
    lookup_vat_rate('GB') → stores in vat.rate
]
# For UK → vat.rate = 0.20 (20% from UtilsCountrys table)
```

#### Priority 85: Product-Specific VAT Application
```python
Rule: "UK Printed Product VAT"
Condition: vat.region == 'UK' AND cart_item.product_type == 'Printed'
Actions: [
    calculate_vat_amount(cart_item.net_amount, vat.rate) → stores in vat.amount,
    calculate_vat_amount(cart_item.net_amount, vat.rate) → stores in cart_item.vat_amount,
    add_decimals(cart_item.net_amount, cart_item.vat_amount) → stores in cart_item.gross_amount
]
# Uses vat.rate = 0.20 (from Priority 90 rule)
# PROBLEM: Should use 0 for printed products!
```

```python
Rule: "UK Digital Product VAT"
Condition: vat.region == 'UK' AND cart_item.product_type == 'Digital'
Actions: [
    calculate_vat_amount(cart_item.net_amount, vat.rate) → stores in vat.amount,
    calculate_vat_amount(cart_item.net_amount, vat.rate) → stores in cart_item.vat_amount,
    add_decimals(cart_item.net_amount, cart_item.vat_amount) → stores in cart_item.gross_amount
]
# Uses vat.rate = 0.20 (from Priority 90 rule)
# CORRECT: Should use 20% for digital products
```

```python
Rule: "UK FlashCard Product VAT" (Priority 80)
Condition: vat.region == 'UK' AND cart_item.product_type == 'FlashCard'
Actions: [
    # IDENTICAL ACTIONS - also uses vat.rate = 0.20
]
# CORRECT: Should use 20% for flashcards
```

---

## Root Cause Analysis

### Database Structure
```python
# UtilsCountrys model
class UtilsCountrys(models.Model):
    code = CharField(max_length=2)  # 'GB'
    name = CharField(max_length=100)  # 'United Kingdom'
    vat_percent = DecimalField(max_digits=5, decimal_places=2)  # 20.00
    active = BooleanField()
```

**Key Finding:** Database stores ONE VAT rate per country, not product-specific rates.

### The Problem
1. UtilsCountrys table has `vat_percent = 20.00%` for GB
2. Priority 90 rule calls `lookup_vat_rate('GB')` → sets `vat.rate = 0.20`
3. **ALL** Priority 85/80 product-specific rules use `{'var': 'vat.rate'}` in their actions
4. Therefore, ALL products calculate VAT at 20%

### Current Rule Actions (ALL IDENTICAL)
```python
Actions: [
    {
        'type': 'call_function',
        'function': 'calculate_vat_amount',
        'args': [
            {'var': 'cart_item.net_amount'},
            {'var': 'vat.rate'}  # ← PROBLEM: Always 20% from Priority 90 rule
        ],
        'store_result_in': 'vat.amount'
    },
    {
        'type': 'call_function',
        'function': 'calculate_vat_amount',
        'args': [
            {'var': 'cart_item.net_amount'},
            {'var': 'vat.rate'}  # ← PROBLEM: Always 20% from Priority 90 rule
        ],
        'store_result_in': 'cart_item.vat_amount'
    },
    {
        'type': 'call_function',
        'function': 'add_decimals',
        'args': [
            {'var': 'cart_item.net_amount'},
            {'var': 'cart_item.vat_amount'}
        ],
        'store_result_in': 'cart_item.gross_amount'
    }
]
```

---

## Solution: Product-Specific Rate Override

### Approach 1: Set Product-Specific Rate Before Calculation

For product types that need different VAT rates, add a `set_variable` action BEFORE the calculation:

#### Fix for UK Printed Products (0% VAT)
```python
Rule: "UK Printed Product VAT"
Condition: vat.region == 'UK' AND cart_item.product_type == 'Printed'
Actions: [
    # NEW: Override vat.rate to 0 for printed products
    {
        'type': 'set_variable',
        'variable': 'vat.rate',
        'value': 0
    },
    # THEN: Calculate VAT using overridden rate
    {
        'type': 'call_function',
        'function': 'calculate_vat_amount',
        'args': [{'var': 'cart_item.net_amount'}, {'var': 'vat.rate'}],
        'store_result_in': 'vat.amount'
    },
    {
        'type': 'call_function',
        'function': 'calculate_vat_amount',
        'args': [{'var': 'cart_item.net_amount'}, {'var': 'vat.rate'}],
        'store_result_in': 'cart_item.vat_amount'
    },
    {
        'type': 'call_function',
        'function': 'add_decimals',
        'args': [{'var': 'cart_item.net_amount'}, {'var': 'cart_item.vat_amount'}],
        'store_result_in': 'cart_item.gross_amount'
    }
]
```

#### Keep UK Digital Products (20% VAT) - NO CHANGE NEEDED
```python
Rule: "UK Digital Product VAT"
Condition: vat.region == 'UK' AND cart_item.product_type == 'Digital'
Actions: [
    # NO CHANGE - uses vat.rate from Priority 90 rule (20%)
    {
        'type': 'call_function',
        'function': 'calculate_vat_amount',
        'args': [{'var': 'cart_item.net_amount'}, {'var': 'vat.rate'}],
        'store_result_in': 'vat.amount'
    },
    # ... rest unchanged
]
```

#### Keep UK FlashCard Products (20% VAT) - NO CHANGE NEEDED
```python
Rule: "UK FlashCard Product VAT"
Condition: vat.region == 'UK' AND cart_item.product_type == 'FlashCard'
Actions: [
    # NO CHANGE - uses vat.rate from Priority 90 rule (20%)
    # ... same as Digital
]
```

---

### Approach 2: Direct Rate in Calculation (Alternative)

Instead of setting `vat.rate` variable, pass the rate directly:

```python
Rule: "UK Printed Product VAT"
Actions: [
    {
        'type': 'call_function',
        'function': 'calculate_vat_amount',
        'args': [
            {'var': 'cart_item.net_amount'},
            0  # ← Direct value instead of variable
        ],
        'store_result_in': 'vat.amount'
    },
    {
        'type': 'call_function',
        'function': 'calculate_vat_amount',
        'args': [
            {'var': 'cart_item.net_amount'},
            0  # ← Direct value
        ],
        'store_result_in': 'cart_item.vat_amount'
    },
    # ... rest
]
```

**Pros:** Simpler, no variable override needed
**Cons:** Less flexible if rates need to change (would require rule update)

---

## Recommended Solution

**Use Approach 1** (set_variable) for products needing different rates:

### Implementation Steps:

1. **Update "UK Printed Product VAT" rule** - Add `set_variable` action to set `vat.rate = 0`
2. **Keep other UK product rules unchanged** - They correctly use 20% from Priority 90 rule
3. **Verify Rules Engine supports `set_variable` action type** - Check ActionDispatcher implementation
4. **Test with real cart data** - Ensure printed products now show 0% VAT

### Testing Checklist:
- [ ] Printed product: 0% VAT
- [ ] Digital product: 20% VAT
- [ ] FlashCard product: 20% VAT
- [ ] Tutorial product: 20% VAT (if applicable)
- [ ] Verify VATAudit records show correct rates in `output_data.totals`

---

## Alternative: Database Schema Enhancement (Future)

For more comprehensive product-specific VAT management, consider:

### Add ProductVATRate Model
```python
class ProductVATRate(models.Model):
    """Product type-specific VAT rates per country."""
    country = ForeignKey(UtilsCountrys, on_delete=CASCADE)
    product_type = CharField(max_length=50)  # 'Printed', 'Digital', 'FlashCard', etc.
    vat_percent = DecimalField(max_digits=5, decimal_places=2)
    effective_from = DateField()
    effective_to = DateField(null=True, blank=True)
    active = BooleanField(default=True)

    class Meta:
        unique_together = ['country', 'product_type', 'effective_from']
```

### Update custom_functions.py
```python
def lookup_product_vat_rate(country_code, product_type):
    """
    Get VAT rate for specific product type and country.
    Falls back to country default if no product-specific rate found.
    """
    from utils.models import ProductVATRate, UtilsCountrys
    from datetime import date

    today = date.today()

    # Try to find product-specific rate
    product_rate = ProductVATRate.objects.filter(
        country__code=country_code.upper(),
        product_type=product_type,
        effective_from__lte=today,
        active=True
    ).filter(
        Q(effective_to__gte=today) | Q(effective_to__isnull=True)
    ).first()

    if product_rate:
        return product_rate.vat_percent / Decimal('100')

    # Fallback to country default
    return lookup_vat_rate(country_code)
```

### Update Priority 90 Rules
```python
Rule: "UK VAT Calculation"
Actions: [
    {
        'type': 'call_function',
        'function': 'lookup_product_vat_rate',
        'args': ['GB', {'var': 'cart_item.product_type'}],
        'store_result_in': 'vat.rate'
    }
]
```

**Benefits:**
- Product-specific rates managed in database via Django Admin
- Rules remain simple and identical
- Historical rate tracking with effective_from/effective_to dates
- Staff can update rates without touching rules

**Drawback:**
- Requires schema migration and data migration
- More complex than simple rule fix

---

## Answer to User's Question

> "How do user set the vat rate with those specialised rule?"

**Answer:** The product-specific rules currently DON'T set different VAT rates - that's the bug. They all use the same `vat.rate` variable set by the Priority 90 region rule.

**To fix:**
1. **Short-term:** Update the "UK Printed Product VAT" rule's actions to include a `set_variable` action that sets `vat.rate = 0` before calling `calculate_vat_amount`
2. **Long-term:** Consider adding a `ProductVATRate` model to manage product-specific rates in the database with Django Admin interface

---

## Files to Modify

### Immediate Fix (Rules Only):
- `ActedRule` record for rule_code='calculate_vat_uk_printed_product'
  - Update `actions` JSONB field to include rate override

### Database Enhancement (Future):
- Create migration: `backend/django_Admin3/utils/migrations/XXXX_add_product_vat_rate.py`
- Update model: `backend/django_Admin3/utils/models.py` (add ProductVATRate)
- Update admin: `backend/django_Admin3/utils/admin.py` (add ProductVATRateAdmin)
- Update functions: `backend/django_Admin3/rules_engine/custom_functions.py` (add lookup_product_vat_rate)
- Update rules: Modify Priority 90 rules to use new function
- Add tests: `backend/django_Admin3/utils/tests/test_product_vat_rate.py`

---

*Analysis completed: 2025-10-17*
