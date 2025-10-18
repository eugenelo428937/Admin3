# VAT Printed Product Fix - Exact Solution

**Date:** 2025-10-17
**Issue:** UK Printed products incorrectly charged 20% VAT instead of 0%
**Solution:** Add `update` action to override `vat.rate` to 0 before calculating VAT

---

## Root Cause

The "UK Printed Product VAT" rule (rule_code: `calculate_vat_uk_printed_product`) uses the same actions as other product rules. All rules use `{'var': 'vat.rate'}` which is set to 0.20 (20%) by the Priority 90 "UK VAT Calculation" rule.

**Current Actions** (INCORRECT):
```json
[
    {
        "type": "call_function",
        "function": "calculate_vat_amount",
        "args": [
            {"var": "cart_item.net_amount"},
            {"var": "vat.rate"}  ← PROBLEM: Uses 20% from Priority 90 rule
        ],
        "store_result_in": "vat.amount"
    },
    {
        "type": "call_function",
        "function": "calculate_vat_amount",
        "args": [
            {"var": "cart_item.net_amount"},
            {"var": "vat.rate"}  ← PROBLEM: Uses 20%
        ],
        "store_result_in": "cart_item.vat_amount"
    },
    {
        "type": "call_function",
        "function": "add_decimals",
        "args": [
            {"var": "cart_item.net_amount"},
            {"var": "cart_item.vat_amount"}
        ],
        "store_result_in": "cart_item.gross_amount"
    }
]
```

---

## Solution: Add Update Action

### Supported Action Type
The Rules Engine's `ActionDispatcher._execute_action()` supports the `update` action type (rule_engine.py:457-485):

```python
elif action_type == "update":
    target = action.get('target')
    operation = action.get('operation')
    value = action.get('value')

    if target and operation == 'set':
        self._set_nested_value(context, target, value)
```

### Fixed Actions for UK Printed Product VAT

**New Actions** (CORRECT - adds update action first):
```json
[
    {
        "type": "update",
        "target": "vat.rate",
        "operation": "set",
        "value": 0
    },
    {
        "type": "call_function",
        "function": "calculate_vat_amount",
        "args": [
            {"var": "cart_item.net_amount"},
            {"var": "vat.rate"}
        ],
        "store_result_in": "vat.amount"
    },
    {
        "type": "call_function",
        "function": "calculate_vat_amount",
        "args": [
            {"var": "cart_item.net_amount"},
            {"var": "vat.rate"}
        ],
        "store_result_in": "cart_item.vat_amount"
    },
    {
        "type": "call_function",
        "function": "add_decimals",
        "args": [
            {"var": "cart_item.net_amount"},
            {"var": "cart_item.vat_amount"}
        ],
        "store_result_in": "cart_item.gross_amount"
    }
]
```

**What Changed:**
- Added FIRST action: `{"type": "update", "target": "vat.rate", "operation": "set", "value": 0}`
- This sets `vat.rate = 0` BEFORE the `calculate_vat_amount` calls
- Subsequent actions remain unchanged but now use `vat.rate = 0` instead of 0.20

---

## Implementation Steps

### Option 1: Update via Django Shell (Quick Fix)

```python
cd backend/django_Admin3
python manage.py shell
```

```python
from rules_engine.models import ActedRule

# Get the rule
rule = ActedRule.objects.get(rule_code='calculate_vat_uk_printed_product')

# Update the actions
rule.actions = [
    {
        "type": "update",
        "target": "vat.rate",
        "operation": "set",
        "value": 0
    },
    {
        "type": "call_function",
        "function": "calculate_vat_amount",
        "args": [
            {"var": "cart_item.net_amount"},
            {"var": "vat.rate"}
        ],
        "store_result_in": "vat.amount"
    },
    {
        "type": "call_function",
        "function": "calculate_vat_amount",
        "args": [
            {"var": "cart_item.net_amount"},
            {"var": "vat.rate"}
        ],
        "store_result_in": "cart_item.vat_amount"
    },
    {
        "type": "call_function",
        "function": "add_decimals",
        "args": [
            {"var": "cart_item.net_amount"},
            {"var": "cart_item.vat_amount"}
        ],
        "store_result_in": "cart_item.gross_amount"
    }
]

rule.save()

print(f"Updated rule: {rule.name}")
print(f"New actions: {rule.actions}")
```

### Option 2: Update via Django Admin (UI Method)

1. Navigate to: `/admin/rules_engine/actedrule/`
2. Search for: "UK Printed Product VAT" or rule_code="calculate_vat_uk_printed_product"
3. Click on the rule to edit
4. In the **Actions (JSONB)** field, update the JSON to include the new update action
5. Save

### Option 3: Update via Management Command (Recommended for Production)

Create a management command for repeatability:

```python
# File: backend/django_Admin3/rules_engine/management/commands/fix_printed_vat.py

from django.core.management.base import BaseCommand
from rules_engine.models import ActedRule

class Command(BaseCommand):
    help = 'Fix UK Printed Product VAT rate (set to 0%)'

    def handle(self, *args, **options):
        rule = ActedRule.objects.get(rule_code='calculate_vat_uk_printed_product')

        self.stdout.write(f"Updating rule: {rule.name}")
        self.stdout.write(f"Current actions: {len(rule.actions)} actions")

        # Define new actions with VAT rate override
        new_actions = [
            {
                "type": "update",
                "target": "vat.rate",
                "operation": "set",
                "value": 0
            },
            {
                "type": "call_function",
                "function": "calculate_vat_amount",
                "args": [
                    {"var": "cart_item.net_amount"},
                    {"var": "vat.rate"}
                ],
                "store_result_in": "vat.amount"
            },
            {
                "type": "call_function",
                "function": "calculate_vat_amount",
                "args": [
                    {"var": "cart_item.net_amount"},
                    {"var": "vat.rate"}
                ],
                "store_result_in": "cart_item.vat_amount"
            },
            {
                "type": "call_function",
                "function": "add_decimals",
                "args": [
                    {"var": "cart_item.net_amount"},
                    {"var": "cart_item.vat_amount"}
                ],
                "store_result_in": "cart_item.gross_amount"
            }
        ]

        rule.actions = new_actions
        rule.save()

        # Invalidate cache
        from rules_engine.services.rule_engine import RuleRepository
        repo = RuleRepository()
        repo.invalidate_cache('cart_calculate_vat')

        self.stdout.write(self.style.SUCCESS(
            f'Successfully updated {rule.name} - VAT rate now set to 0%'
        ))
        self.stdout.write(f"New actions: {len(new_actions)} actions")
```

**Run with:**
```bash
cd backend/django_Admin3
python manage.py fix_printed_vat
```

---

## Verification Steps

### 1. Check Rule Update

```bash
python manage.py shell -c "
from rules_engine.models import ActedRule
rule = ActedRule.objects.get(rule_code='calculate_vat_uk_printed_product')
print(f'Rule: {rule.name}')
print(f'Actions count: {len(rule.actions)}')
print(f'First action: {rule.actions[0]}')
"
```

**Expected Output:**
```
Rule: UK Printed Product VAT
Actions count: 4
First action: {'type': 'update', 'target': 'vat.rate', 'operation': 'set', 'value': 0}
```

### 2. Test VAT Calculation

Add a UK user's cart with printed product and check VAT:

```bash
python manage.py shell
```

```python
from cart.models import Cart
from vat.models import VATAudit

# Find recent cart for UK user with printed product
cart = Cart.objects.filter(user__country_code='GB').order_by('-created_at').first()

# Check VAT result
if cart.vat_result:
    print(f"Cart ID: {cart.id}")
    print(f"VAT Result: {cart.vat_result}")

    # Check items
    for item_data in cart.vat_result.get('items', []):
        print(f"\nItem: {item_data.get('product_name', 'Unknown')}")
        print(f"  Product Type: {item_data.get('product_type')}")
        print(f"  Net: {item_data.get('net_amount')}")
        print(f"  VAT Rate: {item_data.get('vat_rate')}")  # Should be 0 for Printed
        print(f"  VAT Amount: {item_data.get('vat_amount')}")  # Should be 0.00 for Printed
        print(f"  Gross: {item_data.get('gross_amount')}")
```

**Expected Output for Printed Product:**
```
Item: Series X Assignments (Printed)
  Product Type: Printed
  Net: 50.00
  VAT Rate: 0
  VAT Amount: 0.00
  Gross: 50.00
```

### 3. Check VATAudit Trail

```bash
python manage.py shell -c "
from vat.models import VATAudit
audit = VATAudit.objects.order_by('-created_at').first()
print(f'Latest VAT Audit:')
print(f'  Cart: {audit.cart_id}')
print(f'  Output Data:')
import json
print(json.dumps(audit.output_data, indent=2))
"
```

Look for items with `product_type: "Printed"` and verify `vat_rate: 0` and `vat_amount: 0.00`.

---

## Other Product Types (No Changes Needed)

### UK Digital Product VAT (CORRECT - keep as is)
- Rule code: `calculate_vat_uk_digital_product`
- Should use 20% VAT from Priority 90 rule
- Actions: NO CHANGE needed

### UK FlashCard Product VAT (CORRECT - keep as is)
- Rule code: `calculate_vat_uk_flash_card`
- Should use 20% VAT from Priority 90 rule
- Actions: NO CHANGE needed

### UK PBOR Product VAT
- Rule code: `calculate_vat_uk_pbor`
- Verify if PBOR products should have special VAT treatment
- Currently uses 20% - update if needed using same pattern

---

## Testing Checklist

After applying the fix:

- [ ] UK Printed products: 0% VAT (0.00 VAT amount)
- [ ] UK Digital products: 20% VAT (correct amount calculated)
- [ ] UK FlashCard products: 20% VAT (correct amount calculated)
- [ ] UK Tutorial products: 20% VAT (if applicable)
- [ ] VATAudit records show correct rates in output_data
- [ ] Cart totals calculate correctly
- [ ] No errors in Django logs
- [ ] Cache invalidated for cart_calculate_vat entry point

---

## Answer to User's Question

> "How do user set the vat rate with those specialised rule?"

**Answer:**

Product-specific VAT rules set different rates by adding an `update` action BEFORE the VAT calculation:

```json
{
    "type": "update",
    "target": "vat.rate",
    "operation": "set",
    "value": 0
}
```

This overrides the `vat.rate` variable that was set by the Priority 90 region rule (which sets it to 20% for UK).

**Supported Update Operations:**
- `"operation": "set"` - Set value directly
- `"operation": "increment"` - Add to existing value
- Other operations: append, remove (for arrays/lists)

**Example Usage:**
- Printed products → set vat.rate = 0
- Digital products → use vat.rate from region (20%)
- Special offers → set vat.rate = 0.05 (5%)
- Educational materials → set vat.rate = 0 (exempt)

---

*Fix documentation completed: 2025-10-17*
