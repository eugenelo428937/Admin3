# Real API Testing Summary - HK Address Lookup

**Date**: 2025-11-02
**Feature**: Hong Kong Address Lookup Service Integration
**Testing Phase**: Real API validation with user queries

---

## User Test Queries

1. **Query 1**: "22 yin on street"
2. **Query 2**: "FLT A,16/F,ABBEY COURT PICTORIAL"

---

## Critical Discovery: API Format Mismatch

### Issue
During real API testing, discovered that the assumed API endpoint returns **XML instead of JSON**:

**Incorrect endpoint** (from research):
```
URL: https://www.als.gov.hk/lookup
Content-Type: application/xml;charset=UTF-8
Response starts with: <?xml version="1.0" encoding="UTF-8"?>
```

### Solution
Found alternative **JSON API endpoint**:
```
URL: https://geodata.gov.hk/gs/api/v1.0.0/locationSearch
Content-Type: application/json
Response format: Flat JSON array
```

---

## Response Format Differences

### Old (Assumed) Format - Nested JSON
```json
{
  "SuggestedAddress": [
    {
      "Address": {
        "PremisesAddress": {
          "EngPremisesAddress": {
            "EngBlock": {
              "BuildingName": "...",
              "BlockDescriptor": "...",
              "FlatDescriptor": "...",
              "FloorDescriptor": "..."
            },
            "EngStreet": { ... },
            "EngDistrict": { ... }
          },
          "Region": "HK"
        }
      }
    }
  ]
}
```

### New (Actual) Format - Flat Array
```json
[
  {
    "addressZH": "燕安街   22號",
    "nameZH": "",
    "districtZH": "九龍城區",
    "x": 837950,
    "y": 820245,
    "nameEN": "",
    "addressEN": "22 YIN ON STREET  ",
    "districtEN": "Kowloon City District"
  }
]
```

---

## Test Results with User Queries

### Query 1: "22 yin on street"
```
✅ SUCCESS

Results: 1 address found

Parsed Address:
  building: '' (no building name)
  street: '22 YIN ON STREET'
  district: 'Kowloon City District'
  region: 'KLN' (derived from district)
  is_3d: False (2D commercial address)
  formatted_address: '22 YIN ON STREET, Kowloon City District, KLN'
```

### Query 2: "FLT A,16/F,ABBEY COURT PICTORIAL"
```
✅ SUCCESS

Results: 37 addresses found

First Address:
  building: 'Abbey Court'
  street: 'PICTORIAL GARDEN PHASE I'
  district: 'Sha Tin District'
  region: 'NT' (derived from district)
  is_3d: True (detected from PHASE keyword)
  formatted_address: 'Abbey Court, PICTORIAL GARDEN PHASE I, Sha Tin District, NT'
```

---

## Changes Made

### 1. Settings Files Updated

**File**: `django_Admin3/settings/development.py`
```python
# Before
HK_ALS_API_URL = 'https://www.als.gov.hk/lookup'

# After
HK_ALS_API_URL = 'https://geodata.gov.hk/gs/api/v1.0.0/locationSearch'
# NOTE: Using geodata.gov.hk JSON API (als.gov.hk returns XML)
```

**File**: `django_Admin3/settings/uat.py` (same change)

### 2. Helper Functions Updated

**File**: `utils/hk_als_helper.py`

**Updated function**: `parse_hk_als_response(api_response)`
- Changed from parsing nested structure to flat array
- Added `_derive_region_from_district()` helper
- Added `_is_3d_address()` helper

**Region Derivation Logic**:
```python
# Hong Kong Island districts → 'HK'
['Central & Western', 'Eastern', 'Southern', 'Wan Chai']

# Kowloon districts → 'KLN'
['Kowloon City', 'Kwun Tong', 'Sham Shui Po', 'Wong Tai Sin', 'Yau Tsim Mong']

# New Territories districts → 'NT'
['Islands', 'Kwai Tsing', 'North', 'Sai Kung', 'Sha Tin', 'Tai Po',
 'Tsuen Wan', 'Tuen Mun', 'Yuen Long']
```

**3D Address Detection**:
```python
# Keywords indicating 3D address:
['FLAT', 'FLT', 'FLOOR', 'FL', 'BLK', 'BLOCK',
 'PHASE', 'TOWER', 'BUILDING', 'ESTATE']
```

### 3. Test Fixtures Updated

**File**: `utils/tests/fixtures/hk_als_responses.py`

Changed from nested structure to flat array format matching geodata.gov.hk API.

**Old format**:
```python
HK_ALS_SUCCESS_2D = {
    "SuggestedAddress": [...]
}
```

**New format**:
```python
HK_ALS_SUCCESS_2D = [
    {
        "addressEN": "2 TIM MEI AVENUE",
        "nameEN": "Central Government Offices",
        "districtEN": "Central & Western District",
        ...
    }
]
```

### 4. Contract Tests Updated

**File**: `utils/tests/test_address_lookup_hk.py`

**Updated test**: `test_address_object_structure_validation`

Changed validation from:
```python
# Old: Check for flat/floor keywords in building field only
has_flat_floor = ('flat' in building.lower() or 'floor' in building.lower())
```

To:
```python
# New: Check for 3D keywords in building OR street fields
combined = f"{building} {street}".upper()
has_3d_keywords = any(keyword in combined for keyword in
                     ['FLAT', 'FLOOR', 'BLOCK', 'PHASE', 'TOWER', 'ESTATE', 'BUILDING'])
```

**Reason**: Real API doesn't provide granular flat/floor/block details in separate fields.
Instead, keywords appear in the `addressEN` or `nameEN` fields.

---

## Contract Test Results (After Updates)

```bash
$ python manage.py test utils.tests.test_address_lookup_hk --keepdb -v 2

Ran 5 tests in 0.041s

✅ test_successful_search_returns_200_with_addresses
✅ test_missing_search_text_returns_400_with_allow_manual
✅ test_service_unavailable_returns_500_with_allow_manual
✅ test_address_object_structure_validation
✅ test_no_results_returns_empty_array

OK
```

---

## API Field Mapping

### geodata.gov.hk → Contract Format

| API Field | Contract Field | Notes |
|-----------|----------------|-------|
| `nameEN` | `building` | Building/estate name |
| `addressEN` | `street` | Street address |
| `districtEN` | `district` | District name |
| (derived) | `region` | Derived from district |
| (all fields) | `formatted_address` | Comma-separated combination |
| (keywords) | `is_3d` | Detected from keywords |

---

## Verification Checklist

- ✅ Both user queries return results successfully
- ✅ API endpoint changed from XML to JSON
- ✅ Parser updated for flat array format
- ✅ Region derivation logic implemented
- ✅ 3D address detection working correctly
- ✅ All 5 contract tests passing
- ✅ Settings updated (development and UAT)
- ✅ Test fixtures updated with real format
- ✅ No breaking changes to contract API

---

## Backend Implementation: ✅ VERIFIED WITH REAL API

**All contract tests passing. Implementation verified with real geodata.gov.hk API.**

**Ready for frontend integration.**
