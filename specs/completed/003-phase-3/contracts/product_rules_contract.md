# Contract: Product-Specific VAT Rules (11 rules)

**Rule IDs**: UK rules (4), IE/EU/SA/ROW rules (7)
**Priority**: 80-95 (lower than regional, variable for specificity)
**Entry Point**: `cart_calculate_vat`

## Purpose

Product-type-specific VAT calculation logic. Each product rule:
1. Matches specific region + product type combination
2. Calls `calculate_vat_amount()` to compute VAT
3. Updates cart item with VAT amount and gross amount
4. Stops rule processing (VAT calculation complete)

## Input Contract

```typescript
{
  cart_item: {
    id: string;
    product_type: "Digital" | "Printed" | "FlashCard" | "PBOR" | "Tutorial";
    net_amount: Decimal;
  };
  user: {
    id: string;
    country_code: string;
  };
  vat: {
    region: string;   // Set by master rule
    rate: Decimal;    // Set by regional rule (e.g., 0.20)
  };
}
```

## Output Contract

```typescript
{
  cart_item: {
    id: string;
    product_type: string;
    net_amount: Decimal;
    vat_amount: Decimal;      // Set by product rule
    gross_amount: Decimal;    // Set by product rule
  };
  user: { /* unchanged */ };
  vat: {
    region: string;
    rate: Decimal;
    amount: Decimal;          // Set by product rule (same as cart_item.vat_amount)
  };
}
```

## UK Product Rules (4 rules, varying priorities)

### 1. UK Digital Product (`calculate_vat_uk_digital_product`, Priority 95)

**Condition**: `region == "UK" AND product_type == "Digital"`
**Actions**:
1. Call `calculate_vat_amount(cart_item.net_amount, vat.rate)`
2. Update `cart_item.vat_amount` and `vat.amount`
3. Update `cart_item.gross_amount = net_amount + vat_amount`

**stop_processing**: `true` (VAT calculated, done)

### 2. UK Printed Product (`calculate_vat_uk_printed_product`, Priority 85)

**Condition**: `region == "UK" AND product_type == "Printed"`
**Actions**: Same as digital product rule

### 3. UK Flash Card (`calculate_vat_uk_flash_card`, Priority 80)

**Condition**: `region == "UK" AND product_type == "FlashCard"`
**Actions**: Same as digital product rule

### 4. UK PBOR (`calculate_vat_uk_pbor`, Priority 80)

**Condition**: `region == "UK" AND product_type == "PBOR"`
**Actions**: Same as digital product rule

## Generic Regional Product Rules (7 rules, Priority 85)

These rules handle ALL product types for their region (no product_type condition):

### 5. IE Product (`calculate_vat_ie_product`)

**Condition**: `region == "IE"`
**Actions**: Calculate VAT at Ireland rate (23%)

### 6. EU Product (`calculate_vat_eu_product`)

**Condition**: `region == "EU"`
**Actions**: Calculate VAT at country-specific EU rate

### 7. SA Product (`calculate_vat_sa_product`)

**Condition**: `region == "SA"`
**Actions**: Calculate VAT at SA rate (15%)

### 8-11. ROW Product (`calculate_vat_row_product`)

**Condition**: `region == "ROW"`
**Actions**: Calculate VAT at 0% (zero VAT for Rest of World)

## Success Criteria

- ✅ Exactly ONE product rule executes per cart item (mutually exclusive conditions + priority)
- ✅ Cart item contains `vat_amount` and `gross_amount` after execution
- ✅ `calculate_vat_amount()` called with correct net amount and rate
- ✅ Decimal precision maintained (2 decimal places, ROUND_HALF_UP)
- ✅ `stop_processing = true` prevents further rule execution
- ✅ No exceptions raised (Phase 2 function handles edge cases)

## Test Scenarios

```python
# UK Digital Product: £50 net → £10 VAT → £60 gross
input = {
    "cart_item": {"net_amount": Decimal("50.00"), "product_type": "Digital"},
    "vat": {"region": "UK", "rate": Decimal("0.20")}
}
output = {
    "cart_item": {
        "net_amount": Decimal("50.00"),
        "vat_amount": Decimal("10.00"),
        "gross_amount": Decimal("60.00")
    },
    "vat": {"amount": Decimal("10.00")}
}

# SA Product: R500 net → R75 VAT → R575 gross
input = {
    "cart_item": {"net_amount": Decimal("500.00"), "product_type": "Printed"},
    "vat": {"region": "SA", "rate": Decimal("0.15")}
}
output = {
    "cart_item": {
        "vat_amount": Decimal("75.00"),
        "gross_amount": Decimal("575.00")
    }
}

# ROW Product: Zero VAT
input = {
    "cart_item": {"net_amount": Decimal("100.00"), "product_type": "Digital"},
    "vat": {"region": "ROW", "rate": Decimal("0.00")}
}
output = {
    "cart_item": {
        "vat_amount": Decimal("0.00"),
        "gross_amount": Decimal("100.00")
    }
}

# Rounding Test: £33.33 × 0.20 = 6.666 → £6.67
input = {
    "cart_item": {"net_amount": Decimal("33.33")},
    "vat": {"rate": Decimal("0.20")}
}
output = {
    "cart_item": {"vat_amount": Decimal("6.67")}  # ROUND_HALF_UP
}
```

## Priority Explanation

**Higher Priority** (95): More specific conditions execute first
- UK Digital Product (Priority 95): Most specific (region + product type)

**Medium Priority** (85): Generic regional rules
- UK Printed, IE Product, EU Product, SA Product (Priority 85)

**Lower Priority** (80): Less common product types
- UK Flash Card, UK PBOR (Priority 80)

**Why**: If multiple rules could match, most specific executes first. After execution, `stop_processing = true` prevents other rules from running.

## Dependencies

- Phase 2 function: `calculate_vat_amount(net_amount, vat_rate) -> Decimal`
- Master rule: Must set `vat.region`
- Regional rule: Must set `vat.rate`
- Rules Engine: Context update and stop processing mechanism

## Audit Requirements

- RuleExecution record per product rule captures:
  - Input context with net_amount and rate
  - VAT calculation result
  - Final cart item state
  - Execution time (target < 2ms)
