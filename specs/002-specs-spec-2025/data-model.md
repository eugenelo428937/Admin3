# Data Model: VAT Calculation - Phase 2 Custom Functions

**Feature**: Phase 2 Custom Functions for VAT Calculation
**Date**: 2025-10-12
**Status**: Design Complete

## Overview

This phase implements three custom functions that act as data accessors and calculators for the Rules Engine. These are not database entities but **callable functions** registered in FUNCTION_REGISTRY. However, they interact with existing database models from Phase 1.

## Custom Functions (Functional "Entities")

### 1. lookup_region

**Purpose**: Map country ISO codes to VAT regions using historical date ranges

**Function Signature**:
```python
def lookup_region(country_code: str, effective_date: date = None) -> str
```

**Input Fields**:
- `country_code` (str, required): ISO 3166-1 alpha-2 country code (e.g., 'GB', 'IE', 'ZA')
- `effective_date` (date, optional): Date for historical lookup (defaults to today)

**Output Field**:
- Returns `str`: Region code ('UK', 'IE', 'EU', 'SA', 'ROW')

**Validation Rules**:
- Normalize country_code to uppercase
- Default to 'ROW' if country not found
- Default to 'ROW' if no active mapping exists
- Never raise exceptions

**State Transitions**:
N/A (pure query function, stateless)

**Relationships**:
- Queries: `UtilsCountrys` (by code)
- Queries: `UtilsCountryRegion` (by country FK, effective dates)
- Uses: `UtilsCountryRegion.region.code` via select_related

### 2. lookup_vat_rate

**Purpose**: Retrieve current VAT rate percentage for a country from database

**Function Signature**:
```python
def lookup_vat_rate(country_code: str) -> Decimal
```

**Input Fields**:
- `country_code` (str, required): ISO 3166-1 alpha-2 country code

**Output Field**:
- Returns `Decimal`: VAT rate as decimal (e.g., Decimal('0.20') for 20%)

**Validation Rules**:
- Normalize country_code to uppercase
- Convert percentage to decimal (20.00 → 0.20)
- Default to Decimal('0.00') if country not found
- Default to Decimal('0.00') if vat_percent is NULL
- Never raise exceptions

**State Transitions**:
N/A (pure query function, stateless)

**Relationships**:
- Queries: `UtilsCountrys.vat_percent` (by code)
- Filter: Only active countries (active=True)

### 3. calculate_vat_amount

**Purpose**: Calculate VAT amount from net amount and rate with financial rounding

**Function Signature**:
```python
def calculate_vat_amount(net_amount: Decimal, vat_rate: Decimal) -> Decimal
```

**Input Fields**:
- `net_amount` (Decimal, required): Net amount before VAT
- `vat_rate` (Decimal, required): VAT rate as decimal (e.g., 0.20 for 20%)

**Output Field**:
- Returns `Decimal`: VAT amount rounded to 2 decimal places

**Validation Rules**:
- Accept Decimal types only (no float conversion)
- Multiply net_amount by vat_rate
- Round result using ROUND_HALF_UP mode
- Quantize to exactly 2 decimal places
- Handle zero amounts correctly

**State Transitions**:
N/A (pure calculation function, stateless)

**Relationships**:
None (no database access)

## Database Models (Existing from Phase 1)

### UtilsRegion

**Purpose**: Define VAT regions (UK, IE, EU, SA, ROW)

**Fields**:
- `code` (str, PK): Region code
- `name` (str): Region name
- `description` (str): Region description
- `active` (bool): Is region active

**Used By**: lookup_region (via UtilsCountryRegion FK)

### UtilsCountrys

**Purpose**: Store country data with VAT rates

**Fields**:
- `code` (str, PK): ISO 3166-1 alpha-2 country code
- `name` (str): Country name
- `vat_percent` (Decimal): VAT rate percentage (e.g., 20.00 for 20%)
- `active` (bool): Is country active

**Indexes**:
- PRIMARY KEY on `code`
- Index on `active` for filtering

**Used By**:
- lookup_region (to get country object)
- lookup_vat_rate (to get vat_percent)

### UtilsCountryRegion

**Purpose**: Map countries to regions with effective date tracking

**Fields**:
- `country` (FK to UtilsCountrys): Country reference
- `region` (FK to UtilsRegion): Region reference
- `effective_from` (date): Start date for this mapping
- `effective_to` (date, nullable): End date for this mapping (NULL = current)

**Indexes**:
- Foreign key index on `country`
- Foreign key index on `region`
- Composite index on (`effective_from`, `effective_to`)

**Used By**: lookup_region (to map country to region with date filter)

## Data Flow

### Example: Calculate VAT for UK Customer

```
1. Rules Engine calls: lookup_region('GB')
   ├─> Query: UtilsCountrys.objects.get(code='GB')
   ├─> Query: UtilsCountryRegion.objects.filter(country=country, effective_to__isnull=True)
   ├─> select_related('region')
   └─> Returns: 'UK'

2. Rules Engine calls: lookup_vat_rate('GB')
   ├─> Query: UtilsCountrys.objects.get(code='GB')
   ├─> Get: country.vat_percent (e.g., 20.00)
   ├─> Convert: 20.00 / 100 = 0.20
   └─> Returns: Decimal('0.20')

3. Rules Engine calls: calculate_vat_amount(Decimal('100.00'), Decimal('0.20'))
   ├─> Calculate: 100.00 * 0.20 = 20.00
   ├─> Quantize: 20.00 → Decimal('20.00') with ROUND_HALF_UP
   └─> Returns: Decimal('20.00')

4. Rules Engine stores VAT result in cart.vat_result
```

### Example: Historical Lookup (Audit Trail)

```
1. Rules Engine calls: lookup_region('GB', effective_date=date(2020, 4, 1))
   ├─> Query: UtilsCountrys.objects.get(code='GB')
   ├─> Query: UtilsCountryRegion.objects.filter(
   │       country=country,
   │       effective_from__lte=2020-04-01,
   │       Q(effective_to__isnull=True) | Q(effective_to__gte=2020-04-01)
   │   )
   └─> Returns: Historical region code for that date
```

## Function Registry Integration

**Registry Location**: `rules_engine/custom_functions.py`

**Registry Structure**:
```python
FUNCTION_REGISTRY = {
    # ... existing functions ...
    'lookup_region': lookup_region,
    'lookup_vat_rate': lookup_vat_rate,
    'calculate_vat_amount': calculate_vat_amount,
}
```

**Usage by Rules Engine**:
```python
# Rules Engine can call functions by string name
func = FUNCTION_REGISTRY['lookup_region']
region = func('GB')
```

## Error Handling Model

### Graceful Degradation Strategy

| Error Condition | Function | Return Value | Logged? |
|-----------------|----------|--------------|---------|
| Country not found | lookup_region | 'ROW' | WARNING |
| Country not found | lookup_vat_rate | Decimal('0.00') | WARNING |
| No active region mapping | lookup_region | 'ROW' | WARNING |
| vat_percent is NULL | lookup_vat_rate | Decimal('0.00') | WARNING |
| Zero net_amount | calculate_vat_amount | Decimal('0.00') | No |
| Zero vat_rate | calculate_vat_amount | Decimal('0.00') | No |

**Philosophy**: Never crash the Rules Engine. Return safe defaults that allow VAT calculations to continue, with audit trail showing what defaults were used.

## Performance Characteristics

### Query Optimization

**lookup_region**:
- Uses `select_related('region')` to avoid N+1 queries
- Indexed on `UtilsCountrys.code` (PRIMARY KEY)
- Indexed on `UtilsCountryRegion` date fields
- Expected: 2-4ms per call

**lookup_vat_rate**:
- Single table query with PRIMARY KEY lookup
- No joins required
- Expected: 1-3ms per call

**calculate_vat_amount**:
- Pure Python calculation (no I/O)
- Decimal math is fast for small numbers
- Expected: 0.1ms per call

### Scaling Considerations

**Caching Strategy** (future enhancement):
- VAT rates change infrequently (weeks/months)
- Could cache country → region mappings (TTL: 1 hour)
- Could cache country → VAT rate mappings (TTL: 1 hour)
- Not implemented in Phase 2 to keep it simple

**Batch Optimization** (future enhancement):
- Could add `lookup_regions_batch(['GB', 'IE', 'DE'])` for cart with multiple countries
- Not needed for Phase 2 (typical cart = single customer = single country)

## Validation & Constraints

### Input Validation

All functions follow these validation principles:

1. **Type Safety**: Accept only specified types (str, Decimal, date)
2. **Normalization**: Convert country_code to uppercase automatically
3. **No Exceptions**: Return safe defaults instead of raising errors
4. **Logging**: Log warnings for unexpected database states

### Output Guarantees

All functions guarantee:

1. **Type Consistency**: Always return specified return type
2. **Precision**: Decimal results always have 2 decimal places
3. **Non-Null**: Never return None (always return a value)
4. **Deterministic**: Same inputs always produce same outputs (no randomness)

## Testing Strategy

### Test Coverage Requirements

**Minimum Coverage**: 100% (FR-047)

**Test Organization**:
```
rules_engine/tests/test_vat_custom_functions.py
├── TestLookupRegion (8 test methods)
├── TestLookupVATRate (6 test methods)
└── TestCalculateVATAmount (6 test methods)
```

### Test Fixtures

**Required Fixtures**:
```python
# Test data setup
@classmethod
def setUpTestData(cls):
    # Create test regions
    cls.region_uk = UtilsRegion.objects.create(code='UK', name='United Kingdom')
    cls.region_row = UtilsRegion.objects.create(code='ROW', name='Rest of World')

    # Create test countries
    cls.country_gb = UtilsCountrys.objects.create(
        code='GB', name='United Kingdom', vat_percent=20.00, active=True
    )
    cls.country_za = UtilsCountrys.objects.create(
        code='ZA', name='South Africa', vat_percent=15.00, active=True
    )

    # Create country-region mappings
    UtilsCountryRegion.objects.create(
        country=cls.country_gb,
        region=cls.region_uk,
        effective_from=date(2020, 1, 1),
        effective_to=None  # Current mapping
    )
```

### Test Scenarios

**lookup_region**:
1. Valid country returns correct region
2. Unknown country returns 'ROW'
3. Historical date query returns correct historical region
4. NULL effective_to treated as current mapping
5. Multiple mappings filtered by date correctly
6. Case-insensitive country code ('gb' → 'GB')
7. Inactive country still maps to region
8. select_related optimization verified (no N+1 queries)

**lookup_vat_rate**:
1. Valid country returns correct rate as decimal
2. Unknown country returns Decimal('0.00')
3. NULL vat_percent returns Decimal('0.00')
4. Percentage correctly converted to decimal (20.00 → 0.20)
5. Inactive country filtered out, returns Decimal('0.00')
6. Case-insensitive country code

**calculate_vat_amount**:
1. Normal calculation (100.00 * 0.20 = 20.00)
2. Zero net_amount returns Decimal('0.00')
3. Zero vat_rate returns Decimal('0.00')
4. Fractional rate (5.5%) calculated correctly
5. Rounding: ROUND_HALF_UP verified (e.g., 0.125 → 0.13, 0.124 → 0.12)
6. Result always has exactly 2 decimal places

## Dependencies & Relationships

### Upstream Dependencies

**Phase 1 Database Models** (must exist):
- `utils.models.UtilsRegion`
- `utils.models.UtilsCountrys`
- `utils.models.UtilsCountryRegion`

**Rules Engine Infrastructure** (must exist):
- `rules_engine.custom_functions.FUNCTION_REGISTRY`

### Downstream Consumers

**Phase 3 VAT Rules** (will use these functions):
- Master VAT calculation rule: calls all 3 functions
- Regional rules: call lookup_vat_rate, calculate_vat_amount
- Product-specific rules: call calculate_vat_amount

**Phase 4 Entry Point Integration** (will invoke via Rules Engine):
- Cart views: trigger Rules Engine → functions called indirectly
- Checkout views: trigger Rules Engine → functions called indirectly

## Migration & Rollout

### Database Changes

**None required**. All database models already exist from Phase 1.

### Code Changes

**New File**: `backend/django_Admin3/rules_engine/custom_functions.py` (append to existing)
**New File**: `backend/django_Admin3/rules_engine/tests/test_vat_custom_functions.py`

### Rollout Strategy

1. Deploy custom functions code (backward compatible, no impact)
2. Run tests to verify 100% coverage
3. Register functions in FUNCTION_REGISTRY
4. Phase 3 can begin creating rules that reference these functions

No data migration needed. No user-facing changes in this phase.

---

**Data Model Complete**: 2025-10-12
**Ready for Contract Creation**: ✅
