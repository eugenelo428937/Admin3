# Contract: Regional VAT Rules (5 rules)

**Rule IDs**: `calculate_vat_uk`, `calculate_vat_ie`, `calculate_vat_eu`, `calculate_vat_sa`, `calculate_vat_row`
**Priority**: 90 (lower than master)
**Entry Point**: `cart_calculate_vat`

## Purpose

Region-specific VAT calculation logic. Each regional rule:
1. Matches specific region from master rule
2. Calls `lookup_vat_rate()` to get region's VAT rate
3. Stores rate in context for product rules
4. Delegates to product-specific rules

## Input Contract

```typescript
{
  cart_item: {
    id: string;
    product_type: string;
    net_amount: Decimal;
  };
  user: {
    id: string;
    country_code: string;
  };
  vat: {
    region: "UK" | "IE" | "EU" | "SA" | "ROW";  // Set by master rule
  };
}
```

## Output Contract

```typescript
{
  /* ... cart_item and user unchanged */
  vat: {
    region: string;      // unchanged
    rate: Decimal;       // Set by regional rule (e.g., 0.20 for UK)
  };
}
```

## Rule Variants

### UK Regional Rule (`calculate_vat_uk`)

**Condition**: `vat.region == "UK"`
**Action**: `lookup_vat_rate("GB")` → stores in `vat.rate`
**Delegates to**: 4 UK product rules (Digital, Printed, FlashCard, PBOR)

### IE Regional Rule (`calculate_vat_ie`)

**Condition**: `vat.region == "IE"`
**Action**: `lookup_vat_rate("IE")` → stores in `vat.rate`
**Delegates to**: 1 IE product rule (all product types)

### EU Regional Rule (`calculate_vat_eu`)

**Condition**: `vat.region == "EU"`
**Action**: `lookup_vat_rate(user.country_code)` → stores in `vat.rate` (country-specific EU rate)
**Delegates to**: 1 EU product rule (all product types)

### SA Regional Rule (`calculate_vat_sa`)

**Condition**: `vat.region == "SA"`
**Action**: `lookup_vat_rate("ZA")` → stores in `vat.rate`
**Delegates to**: 1 SA product rule (all product types)

### ROW Regional Rule (`calculate_vat_row`)

**Condition**: `vat.region == "ROW"`
**Action**: `lookup_vat_rate()` → returns `Decimal("0.00")` default
**Delegates to**: 1 ROW product rule (zero VAT for all)

## Success Criteria

- ✅ Exactly ONE regional rule executes per cart item (mutually exclusive conditions)
- ✅ Context contains `vat.rate` field after execution
- ✅ `lookup_vat_rate()` called with correct country code argument
- ✅ Product rules can access `vat.rate` in their calculations
- ✅ No exceptions raised for missing country data (Phase 2 function returns 0.00 default)

## Test Scenarios

```python
# UK: 20% VAT rate
input = {"vat": {"region": "UK"}, "user": {"country_code": "GB"}}
output = {"vat": {"region": "UK", "rate": Decimal("0.20")}}

# SA: 15% VAT rate
input = {"vat": {"region": "SA"}, "user": {"country_code": "ZA"}}
output = {"vat": {"region": "SA", "rate": Decimal("0.15")}}

# ROW: 0% VAT rate (safe default)
input = {"vat": {"region": "ROW"}, "user": {"country_code": "XX"}}
output = {"vat": {"region": "ROW", "rate": Decimal("0.00")}}

# EU: Country-specific rate (e.g., France 20%)
input = {"vat": {"region": "EU"}, "user": {"country_code": "FR"}}
output = {"vat": {"region": "EU", "rate": Decimal("0.20")}}
```

## Dependencies

- Phase 2 function: `lookup_vat_rate(country_code) -> Decimal`
- Master rule: Must execute first to set `vat.region`
- Database: UtilsCountrys model (via Phase 2 function)

## Audit Requirements

- RuleExecution record per regional rule captures:
  - Input context with region
  - Function call arguments
  - VAT rate result
  - Execution time (target < 3ms)
