# Contract: lookup_vat_rate Function

**Function**: `lookup_vat_rate`
**Module**: `rules_engine.custom_functions`
**Purpose**: Retrieve current VAT rate for a country from database

## Function Signature

```python
def lookup_vat_rate(country_code: str) -> Decimal:
    """
    Get VAT rate percentage from UtilsCountrys.

    Args:
        country_code: ISO 3166-1 alpha-2 country code (e.g., 'GB', 'IE', 'ZA')

    Returns:
        VAT rate as Decimal (e.g., Decimal('0.20') for 20%)

    Raises:
        None (returns Decimal('0.00') for all error conditions)
    """
```

## Input Contract

### Required Parameters

**country_code** (str):
- Format: ISO 3166-1 alpha-2 country code
- Examples: `'GB'`, `'IE'`, `'ZA'`, `'DE'`
- Case-insensitive: `'za'` and `'ZA'` are equivalent
- Validation: Normalized to uppercase before database query
- Invalid values: Returns `Decimal('0.00')` default

## Output Contract

### Return Value

**Type**: `Decimal`

**Format**:
- Decimal rate (e.g., `Decimal('0.20')` for 20%)
- Always 2 decimal places minimum
- Converted from percentage stored in database (20.00 → 0.20)

**Possible Values**:
- `Decimal('0.00')` - Zero rate or error condition
- `Decimal('0.15')` - 15% rate (South Africa)
- `Decimal('0.20')` - 20% rate (UK)
- `Decimal('0.23')` - 23% rate (Ireland)
- Any valid percentage between 0-100% converted to decimal

**Guarantees**:
- Always returns a Decimal (never None, never float)
- Always returns non-negative value
- Precision maintained (no float conversion)
- Deterministic: Same inputs always produce same output
- No exceptions raised

## Behavior Contract

### Normal Operation

1. Normalize country_code to uppercase
2. Query UtilsCountrys.objects.get(code=country_code, active=True)
3. Get country.vat_percent (e.g., 20.00)
4. Convert percentage to decimal: vat_percent / 100
5. Return as Decimal type

### Error Handling

| Error Condition | Behavior | Return Value | Logged |
|-----------------|----------|--------------|---------|
| Country not found (DoesNotExist) | Return default | `Decimal('0.00')` | WARNING |
| vat_percent is NULL | Return default | `Decimal('0.00')` | WARNING |
| Country inactive (active=False) | Return default | `Decimal('0.00')` | WARNING |
| Database connection error | Propagate exception | N/A | ERROR |

### Conversion Logic

```python
# Database stores: vat_percent = 20.00 (percentage)
# Function returns: Decimal('0.20') (decimal rate)

vat_rate = country.vat_percent / Decimal('100')
# 20.00 / 100 = 0.20
```

### Side Effects

- **Database Reads**: 1 SELECT query (PRIMARY KEY lookup)
- **Database Writes**: None
- **Logging**: WARNING level for missing countries or NULL rates
- **Caching**: None (stateless function)

## Performance Contract

### Latency Targets

- **Typical**: 1-3ms (PRIMARY KEY lookup, single table)
- **Maximum**: 8ms (under heavy load)
- **Cached**: N/A (no caching in Phase 2)

### Query Optimization

```sql
-- Single query: PRIMARY KEY lookup
SELECT vat_percent
FROM utils_countrys
WHERE code = 'ZA' AND active = true;
```

### Scalability

- **N+1 Queries**: Not applicable (single query per call)
- **Batch Support**: Not available in Phase 2 (future enhancement)
- **Concurrent Calls**: Thread-safe (no shared state)

## Dependencies

### Required Models

- `utils.models.UtilsCountrys` (code, vat_percent, active)

### Required Indexes

- `utils_countrys.code` (PRIMARY KEY)
- `utils_countrys.active` (for filtering)

## Test Contract

### Test Scenarios (Minimum Required)

1. **Valid South Africa (15%)** → Returns `Decimal('0.15')`
2. **Valid UK (20%)** → Returns `Decimal('0.20')`
3. **Unknown country 'XX'** → Returns `Decimal('0.00')`
4. **Case insensitive 'za'** → Returns `Decimal('0.15')`
5. **NULL vat_percent** → Returns `Decimal('0.00')`
6. **Inactive country** → Returns `Decimal('0.00')`
7. **Fractional rate (5.5%)** → Returns `Decimal('0.055')`
8. **Zero rate country** → Returns `Decimal('0.00')`

### Test Assertions

```python
from decimal import Decimal
from rules_engine.custom_functions import lookup_vat_rate

def test_lookup_vat_rate_south_africa():
    result = lookup_vat_rate('ZA')
    assert result == Decimal('0.15')
    assert isinstance(result, Decimal)

def test_lookup_vat_rate_unknown_country():
    result = lookup_vat_rate('XX')
    assert result == Decimal('0.00')

def test_lookup_vat_rate_conversion():
    # Database has 20.00, function returns 0.20
    result = lookup_vat_rate('GB')
    assert result == Decimal('0.20')
    assert result != Decimal('20.00')  # Verify conversion happened
```

## Integration Contract

### Rules Engine Integration

**Registration**:
```python
FUNCTION_REGISTRY['lookup_vat_rate'] = lookup_vat_rate
```

**Usage in Rules**:
```json
{
  "actions": [
    {
      "type": "call_function",
      "function": "lookup_vat_rate",
      "args": [{"var": "user.country"}],
      "store_result_in": "context.vat_rate"
    }
  ]
}
```

### Calling Conventions

**From Rules Engine**:
```python
func = FUNCTION_REGISTRY['lookup_vat_rate']
rate = func(country_code='ZA')
# Returns: Decimal('0.15')
```

**From Tests**:
```python
from rules_engine.custom_functions import lookup_vat_rate
rate = lookup_vat_rate('ZA')
```

**Usage with calculate_vat_amount**:
```python
# Typical Rules Engine flow
vat_rate = lookup_vat_rate('GB')  # Decimal('0.20')
vat_amount = calculate_vat_amount(Decimal('100.00'), vat_rate)
# Result: Decimal('20.00')
```

## Data Contract

### Database Schema

**UtilsCountrys.vat_percent**:
- Type: DecimalField
- Format: Percentage (e.g., 20.00 for 20%)
- Precision: 2 decimal places
- Nullable: Yes (treated as 0.00 by function)

### Conversion Examples

| Database Value | Function Return | Interpretation |
|----------------|-----------------|----------------|
| 20.00 | Decimal('0.20') | 20% rate |
| 15.00 | Decimal('0.15') | 15% rate |
| 23.00 | Decimal('0.23') | 23% rate |
| 5.50 | Decimal('0.055') | 5.5% rate |
| 0.00 | Decimal('0.00') | 0% rate |
| NULL | Decimal('0.00') | No rate configured |

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-12 | Initial contract definition for Phase 2 |

## Contract Validation

**This contract must be verified by**:
- Unit tests in `test_vat_custom_functions.py`
- Integration tests with UtilsCountrys data
- Decimal precision tests (no float conversion)

**Contract is binding for**:
- Phase 3: VAT Rules (will call this function for rate lookup)
- calculate_vat_amount function (consumes this output)

---

**Contract Status**: ✅ Ready for Implementation
**Test-First**: Yes - contract tests must be written before implementation
