# Contract: calculate_vat_amount Function

**Function**: `calculate_vat_amount`
**Module**: `rules_engine.custom_functions`
**Purpose**: Calculate VAT amount with financial rounding standards

## Function Signature

```python
def calculate_vat_amount(net_amount: Decimal, vat_rate: Decimal) -> Decimal:
    """
    Calculate VAT amount with proper rounding.

    Args:
        net_amount: Net amount before VAT (e.g., Decimal('100.00'))
        vat_rate: VAT rate as decimal (e.g., Decimal('0.20') for 20%)

    Returns:
        VAT amount rounded to 2 decimal places with ROUND_HALF_UP

    Raises:
        None (handles zero amounts gracefully)
    """
```

## Input Contract

### Required Parameters

**net_amount** (Decimal):
- Type: Python Decimal (NOT float)
- Format: Monetary amount before VAT
- Examples: `Decimal('100.00')`, `Decimal('50.50')`, `Decimal('0.00')`
- Precision: Can have any number of decimal places (will be rounded in output)
- Sign: Positive, zero, or negative (function processes mathematically)
- Invalid values: N/A (function handles all Decimal values)

**vat_rate** (Decimal):
- Type: Python Decimal (NOT float)
- Format: Decimal rate (e.g., `Decimal('0.20')` for 20%)
- Examples: `Decimal('0.20')`, `Decimal('0.15')`, `Decimal('0.00')`
- Range: Typically 0.00 to 1.00 (0% to 100%)
- Precision: Any decimal precision accepted
- Invalid values: N/A (function handles all Decimal values)

## Output Contract

### Return Value

**Type**: `Decimal`

**Format**:
- Always exactly 2 decimal places
- Rounded using ROUND_HALF_UP mode
- Result of: `net_amount * vat_rate`

**Possible Values**:
- `Decimal('0.00')` - Zero amount or zero rate
- `Decimal('20.00')` - VAT for £100 at 20%
- `Decimal('15.00')` - VAT for £100 at 15%
- Any valid monetary amount with 2 decimal places

**Guarantees**:
- Always returns a Decimal (never None, never float)
- Always returns exactly 2 decimal places
- Deterministic: Same inputs always produce same output
- No exceptions raised
- No database access (pure calculation)

## Behavior Contract

### Normal Operation

```python
# Calculation
vat_amount = net_amount * vat_rate

# Rounding
vat_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
```

### Rounding Behavior

**ROUND_HALF_UP Mode**:
- 0.124 → 0.12 (round down)
- 0.125 → 0.13 (round up - tie break)
- 0.126 → 0.13 (round up)

**Examples**:
```python
calculate_vat_amount(Decimal('100.00'), Decimal('0.20'))
# 100.00 * 0.20 = 20.00
# Result: Decimal('20.00')

calculate_vat_amount(Decimal('100.00'), Decimal('0.155'))
# 100.00 * 0.155 = 15.50
# Result: Decimal('15.50')

calculate_vat_amount(Decimal('33.33'), Decimal('0.20'))
# 33.33 * 0.20 = 6.666
# Rounds to: Decimal('6.67')  (ROUND_HALF_UP)
```

### Edge Cases

| Input | Calculation | Output | Notes |
|-------|-------------|--------|-------|
| net=0, rate=0.20 | 0 * 0.20 = 0 | Decimal('0.00') | Zero net amount |
| net=100, rate=0 | 100 * 0 = 0 | Decimal('0.00') | Zero VAT rate |
| net=100, rate=0.055 | 100 * 0.055 = 5.5 | Decimal('5.50') | Fractional rate |
| net=33.33, rate=0.20 | 33.33 * 0.20 = 6.666 | Decimal('6.67') | Rounding up |
| net=-100, rate=0.20 | -100 * 0.20 = -20 | Decimal('-20.00') | Negative amount |

### Side Effects

- **Database Reads**: None (pure calculation)
- **Database Writes**: None
- **Logging**: None
- **Caching**: None (stateless function)
- **Performance**: ~0.1ms (pure Python, no I/O)

## Performance Contract

### Latency Targets

- **Typical**: 0.1ms (Decimal multiplication is fast)
- **Maximum**: 1ms (even under heavy load)
- **Bottleneck**: None (CPU-bound, trivial operation)

### Scalability

- **Concurrent Calls**: Unlimited (no shared state, no I/O)
- **Batch Support**: Not needed (individual calls are trivial)
- **Memory**: Minimal (single Decimal object allocation)

## Dependencies

### External Dependencies

- **Python Decimal module**: `from decimal import Decimal, ROUND_HALF_UP`

### Internal Dependencies

None (pure calculation function, no database or other functions)

## Test Contract

### Test Scenarios (Minimum Required)

1. **Normal calculation (100 * 0.20)** → `Decimal('20.00')`
2. **Zero net amount** → `Decimal('0.00')`
3. **Zero VAT rate** → `Decimal('0.00')`
4. **Fractional rate (5.5%)** → Correct calculation
5. **Rounding up (6.666 → 6.67)** → ROUND_HALF_UP verified
6. **Rounding down (6.664 → 6.66)** → ROUND_HALF_UP verified
7. **Exact 2 decimal places** → Always returns 2 places
8. **Negative amount** → Mathematically correct result

### Test Assertions

```python
from decimal import Decimal, ROUND_HALF_UP
from rules_engine.custom_functions import calculate_vat_amount

def test_calculate_vat_amount_normal():
    result = calculate_vat_amount(Decimal('100.00'), Decimal('0.20'))
    assert result == Decimal('20.00')
    assert isinstance(result, Decimal)
    assert result.as_tuple().exponent == -2  # Exactly 2 decimal places

def test_calculate_vat_amount_rounding():
    # 33.33 * 0.20 = 6.666 → should round to 6.67
    result = calculate_vat_amount(Decimal('33.33'), Decimal('0.20'))
    assert result == Decimal('6.67')

def test_calculate_vat_amount_zero_rate():
    result = calculate_vat_amount(Decimal('100.00'), Decimal('0.00'))
    assert result == Decimal('0.00')

def test_calculate_vat_amount_zero_net():
    result = calculate_vat_amount(Decimal('0.00'), Decimal('0.20'))
    assert result == Decimal('0.00')
```

## Integration Contract

### Rules Engine Integration

**Registration**:
```python
FUNCTION_REGISTRY['calculate_vat_amount'] = calculate_vat_amount
```

**Usage in Rules**:
```json
{
  "actions": [
    {
      "type": "call_function",
      "function": "calculate_vat_amount",
      "args": [
        {"var": "item.net_amount"},
        {"var": "context.vat_rate"}
      ],
      "store_result_in": "item.vat_amount"
    }
  ]
}
```

### Typical Usage Flow

```python
# Step 1: Get VAT rate
vat_rate = lookup_vat_rate('GB')  # Decimal('0.20')

# Step 2: Calculate VAT amount
net_amount = Decimal('100.00')
vat_amount = calculate_vat_amount(net_amount, vat_rate)
# Result: Decimal('20.00')

# Step 3: Calculate gross amount
gross_amount = net_amount + vat_amount
# Result: Decimal('120.00')
```

### Calling Conventions

**From Rules Engine**:
```python
func = FUNCTION_REGISTRY['calculate_vat_amount']
vat = func(net_amount=Decimal('100.00'), vat_rate=Decimal('0.20'))
```

**From Tests**:
```python
from rules_engine.custom_functions import calculate_vat_amount
vat = calculate_vat_amount(Decimal('100.00'), Decimal('0.20'))
```

**Direct Usage** (if needed):
```python
from decimal import Decimal
from rules_engine.custom_functions import calculate_vat_amount

# Calculate VAT for multiple items
items = [
    {'net': Decimal('100.00'), 'rate': Decimal('0.20')},
    {'net': Decimal('50.00'), 'rate': Decimal('0.15')},
]

total_vat = sum(
    calculate_vat_amount(item['net'], item['rate'])
    for item in items
)
# Result: Decimal('27.50')  (20.00 + 7.50)
```

## Decimal Precision Contract

### Type Safety

**MUST Accept**: `Decimal` type only (no float conversion)

**Examples**:
```python
# CORRECT: Decimal inputs
calculate_vat_amount(Decimal('100.00'), Decimal('0.20'))

# INCORRECT: Float inputs (would work but discouraged)
# calculate_vat_amount(100.0, 0.20)  # Don't do this

# CORRECT: String to Decimal conversion
net = Decimal('100.00')  # From string
rate = Decimal(str(0.20))  # Convert float to string first
```

### Rounding Mode Guarantee

**Mode**: `ROUND_HALF_UP` (never use default rounding)

**Why ROUND_HALF_UP**:
- Financial standard (banker's rounding)
- Specified in FR-022 requirement
- Prevents systematic bias in rounding

**Verification**:
```python
# Test that ROUND_HALF_UP is used, not default
from decimal import Decimal, ROUND_HALF_UP, ROUND_HALF_EVEN

# With ROUND_HALF_UP: 0.125 → 0.13
result = calculate_vat_amount(Decimal('0.625'), Decimal('0.20'))
assert result == Decimal('0.13')  # 0.625 * 0.20 = 0.125 → rounds to 0.13

# With ROUND_HALF_EVEN (banker's): 0.125 → 0.12 (rounds to even)
# Function must NOT use ROUND_HALF_EVEN
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-12 | Initial contract definition for Phase 2 |

## Contract Validation

**This contract must be verified by**:
- Unit tests in `test_vat_custom_functions.py`
- Decimal precision tests (no float errors)
- Rounding mode tests (ROUND_HALF_UP verified)
- Performance tests (< 1ms target)

**Contract is binding for**:
- Phase 3: VAT Rules (will call this function for each cart item)
- All downstream consumers of VAT calculation results

---

**Contract Status**: ✅ Ready for Implementation
**Test-First**: Yes - contract tests must be written before implementation
