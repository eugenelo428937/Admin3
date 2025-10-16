# Contract: lookup_region Function

**Function**: `lookup_region`
**Module**: `rules_engine.custom_functions`
**Purpose**: Map country ISO codes to VAT regions with historical date support

## Function Signature

```python
def lookup_region(country_code: str, effective_date: date = None) -> str:
    """
    Lookup VAT region for country code using UtilsCountryRegion.

    Args:
        country_code: ISO 3166-1 alpha-2 country code (e.g., 'GB', 'IE', 'ZA')
        effective_date: Date for historical lookup (defaults to today)

    Returns:
        Region code string: 'UK', 'IE', 'EU', 'SA', or 'ROW'

    Raises:
        None (returns 'ROW' for all error conditions)
    """
```

## Input Contract

### Required Parameters

**country_code** (str):
- Format: ISO 3166-1 alpha-2 country code
- Examples: `'GB'`, `'IE'`, `'ZA'`, `'DE'`, `'US'`
- Case-insensitive: `'gb'` and `'GB'` are equivalent
- Validation: Normalized to uppercase before database query
- Invalid values: Returns `'ROW'` default

### Optional Parameters

**effective_date** (date | None):
- Format: Python datetime.date object
- Default: `None` (uses today's date)
- Purpose: Historical region lookup for audit trails
- Examples: `date(2020, 1, 1)`, `date.today()`
- Invalid values: N/A (None is valid, uses current date)

## Output Contract

### Return Value

**Type**: `str`

**Possible Values**:
- `'UK'` - United Kingdom
- `'IE'` - Ireland
- `'EU'` - European Union
- `'SA'` - South Africa
- `'ROW'` - Rest of World (default for unknown countries)

**Guarantees**:
- Always returns a string (never None)
- Always returns one of the 5 valid region codes
- Deterministic: Same inputs always produce same output
- No exceptions raised

## Behavior Contract

### Normal Operation

1. Normalize country_code to uppercase
2. Query UtilsCountrys.objects.get(code=country_code, active=True)
3. Query UtilsCountryRegion.objects.filter(country=country, effective_date range)
4. Use select_related('region') for optimization
5. Return region.code

### Error Handling

| Error Condition | Behavior | Return Value | Logged |
|-----------------|----------|--------------|---------|
| Country not found (DoesNotExist) | Return default | `'ROW'` | WARNING |
| No active region mapping | Return default | `'ROW'` | WARNING |
| Multiple mappings (should not happen) | Use .first() | First match | No |
| Database connection error | Propagate exception | N/A | ERROR |

### Side Effects

- **Database Reads**: 1-2 SELECT queries (optimized with select_related)
- **Database Writes**: None
- **Logging**: WARNING level for missing countries/mappings
- **Caching**: None (stateless function)

## Performance Contract

### Latency Targets

- **Typical**: 2-4ms (with database indexed on code)
- **Maximum**: 10ms (under heavy load)
- **Cached**: N/A (no caching in Phase 2)

### Query Optimization

```sql
-- Query 1: Get country (PRIMARY KEY lookup)
SELECT * FROM utils_countrys WHERE code = 'GB' AND active = true;

-- Query 2: Get region mapping (optimized with select_related)
SELECT ucr.*, ur.code
FROM utils_country_region ucr
INNER JOIN utils_region ur ON ucr.region_id = ur.id
WHERE ucr.country_id = 123
  AND ucr.effective_from <= '2025-10-12'
  AND (ucr.effective_to IS NULL OR ucr.effective_to >= '2025-10-12');
```

### Scalability

- **N+1 Queries**: Prevented by select_related('region')
- **Batch Support**: Not available in Phase 2 (future enhancement)
- **Concurrent Calls**: Thread-safe (no shared state)

## Dependencies

### Required Models

- `utils.models.UtilsCountrys` (code, name, active)
- `utils.models.UtilsCountryRegion` (country FK, region FK, effective_from, effective_to)
- `utils.models.UtilsRegion` (code, name)

### Required Indexes

- `utils_countrys.code` (PRIMARY KEY)
- `utils_country_region.country_id` (foreign key index)
- `utils_country_region.effective_from, effective_to` (composite index)

## Test Contract

### Test Scenarios (Minimum Required)

1. **Valid UK country** → Returns `'UK'`
2. **Valid South Africa country** → Returns `'SA'`
3. **Unknown country 'XX'** → Returns `'ROW'`
4. **Case insensitive 'gb'** → Returns `'UK'`
5. **Historical date query** → Returns correct historical region
6. **NULL effective_to (current)** → Included in query results
7. **Multiple mappings with dates** → Filters correctly by effective_date
8. **Query optimization** → No N+1 queries (verify with assertNumQueries)

### Test Assertions

```python
from datetime import date
from rules_engine.custom_functions import lookup_region

def test_lookup_region_valid_country():
    result = lookup_region('GB')
    assert result == 'UK'
    assert isinstance(result, str)

def test_lookup_region_unknown_country():
    result = lookup_region('XX')
    assert result == 'ROW'

def test_lookup_region_historical():
    result = lookup_region('GB', effective_date=date(2020, 1, 1))
    assert result in ['UK', 'IE', 'EU', 'SA', 'ROW']
```

## Integration Contract

### Rules Engine Integration

**Registration**:
```python
FUNCTION_REGISTRY['lookup_region'] = lookup_region
```

**Usage in Rules**:
```json
{
  "actions": [
    {
      "type": "call_function",
      "function": "lookup_region",
      "args": [{"var": "user.country"}],
      "store_result_in": "context.region"
    }
  ]
}
```

### Calling Conventions

**From Rules Engine**:
```python
func = FUNCTION_REGISTRY['lookup_region']
region = func(country_code='GB')
```

**From Tests**:
```python
from rules_engine.custom_functions import lookup_region
region = lookup_region('GB')
```

**From Application Code** (discouraged):
```python
# Don't call directly - use Rules Engine instead
from rules_engine.custom_functions import lookup_region
region = lookup_region('GB')  # Prefer Rules Engine execution
```

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-12 | Initial contract definition for Phase 2 |

## Contract Validation

**This contract must be verified by**:
- Unit tests in `test_vat_custom_functions.py`
- Integration tests with UtilsCountryRegion data
- Performance tests under load (< 5ms target)

**Contract is binding for**:
- Phase 3: VAT Rules (will call this function)
- Phase 4: Entry Point Integration (indirect via Rules Engine)

---

**Contract Status**: ✅ Ready for Implementation
**Test-First**: Yes - contract tests must be written before implementation
