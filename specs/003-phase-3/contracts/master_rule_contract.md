# Contract: Master VAT Rule (`calculate_vat`)

**Rule ID**: `calculate_vat`
**Priority**: 100 (highest)
**Entry Point**: `cart_calculate_vat`

## Purpose

Single entry point for all VAT calculations. Determines customer's VAT region by calling `lookup_region()` Phase 2 function and stores result in context for downstream regional rules.

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
    country_code: string;  // ISO 3166-1 alpha-2 (e.g., "GB", "IE", "ZA")
  };
  vat: {};  // Empty object, enriched by this rule
}
```

## Output Contract

```typescript
{
  cart_item: { /* unchanged */ };
  user: { /* unchanged */ };
  vat: {
    region: "UK" | "IE" | "EU" | "SA" | "ROW";  // Set by this rule
  };
}
```

## Rule Actions

1. **Validate Context**: Ensure `user.country_code` is not null
2. **Call Function**: `lookup_region(user.country_code)` → returns region code
3. **Update Context**: Store result in `context.vat.region`
4. **Continue Processing**: `stop_processing = false` (allow regional rules to execute)

## Execution Condition

```javascript
{"!=": [{"var": "user.country_code"}, null]}
```

**Meaning**: Execute if country code is provided (not null)

## Success Criteria

- ✅ Context contains `vat.region` field with valid region code
- ✅ `lookup_region()` called exactly once with correct country code
- ✅ No exceptions raised
- ✅ Execution logged in RuleExecution table
- ✅ Regional rules can access `vat.region` in their conditions

## Edge Cases

1. **Unknown Country Code**: `lookup_region()` returns 'ROW' default (safe)
2. **Invalid Country Code Format**: Rule executes, function handles normalization
3. **Null Country Code**: Rule condition FALSE, skips execution (validation failure upstream)

## Test Scenarios

```python
# Test 1: Valid UK country code
input = {"user": {"country_code": "GB"}, "cart_item": {...}, "vat": {}}
output = {"vat": {"region": "UK"}}

# Test 2: Unknown country code falls back to ROW
input = {"user": {"country_code": "XX"}, "cart_item": {...}, "vat": {}}
output = {"vat": {"region": "ROW"}}

# Test 3: Case-insensitive (lowercase handled by function)
input = {"user": {"country_code": "gb"}, "cart_item": {...}, "vat": {}}
output = {"vat": {"region": "UK"}}
```

## Dependencies

- Phase 2 function: `lookup_region(country_code, effective_date=None) -> str`
- Rules Engine: Context update mechanism
- Database: UtilsCountryRegion model (via Phase 2 function)

## Audit Requirements

- RuleExecution record must capture:
  - Input context with country_code
  - Function call result (region)
  - Updated context with vat.region
  - Execution time (target < 5ms)
