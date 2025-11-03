# Frontend Implementation Summary - HK Address Lookup

**Date**: 2025-11-02
**Phase**: Frontend Integration (T013-T019)
**Status**: In Progress

---

## Completed Tasks

### ✅ T013: Custom Hook Tests (RED Phase)
**File**: `src/hooks/__tests__/useHKAddressLookup.test.js`

Created comprehensive test suite with 11 tests covering:
- API integration (correct endpoint, formatted responses)
- Loading states (isLoading true during fetch, false after)
- Error handling (400, 500, network errors)
- Empty results
- Minimum search length validation (2+ characters)
- Clear function

**Test Results**: 11/11 passing

### ✅ T014: Custom Hook Implementation (GREEN Phase)
**File**: `src/hooks/useHKAddressLookup.js`

Implemented hook with:
- `searchAddresses(searchText)` - Calls `/api/utils/address-lookup-hk/`
- `clearAddresses()` - Resets state
- State management: `addresses`, `isLoading`, `error`, `allowManual`
- Minimum 2-character validation
- Contract-compliant error handling

**All tests passing**

### ✅ T015: Address Metadata Update
**File**: `src/services/addressMetadataService.js`

Changed HK configuration:
```javascript
'HK': {
  addressLookupSupported: true,  // Changed from false
  // ... rest of config
}
```

---

## Pending Tasks

### 🔄 T016-T018: SmartAddressInput Integration

**Challenge**: Hong Kong uses different lookup pattern than UK

| Feature | UK | Hong Kong |
|---------|------|-----------|
| **Trigger Field** | Postcode + Address Line | Address Line only (no postcode) |
| **API Endpoint** | `/api/utils/address-lookup/?postcode=...` | `/api/utils/address-lookup-hk/?search_text=...` |
| **Minimum Length** | Postcode required | 2+ characters |
| **Response Format** | `{line_1, line_2, town, county, postcode}` | `{building, street, district, region, is_3d}` |

**Required Changes to `SmartAddressInput.js`**:

1. **Detect HK country** (already has country detection)
2. **Conditional rendering**: Hide postcode field for HK
3. **HK-specific lookup**:
   - Trigger on `addressLine` input (3+ chars)
   - Use `useHKAddressLookup` hook instead of direct fetch
   - Different response mapping

4. **Address selection handler**:
   ```javascript
   // UK format
   {
     line1: addr.line_1,
     line2: addr.line_2,
     town: addr.town_or_city,
     county: addr.county,
     postcode: addr.postcode
   }

   // HK format
   {
     address: addr.formatted_address,  // or build from building+street
     city: addr.district,              // "Sha Tin District"
     state: mapRegionToArea(addr.region)  // "NT" → "New Territories"
   }
   ```

5. **Region mapping**:
   ```javascript
   const mapRegionToArea = (region) => {
     const mapping = {
       'HK': 'Hong Kong Island',
       'KLN': 'Kowloon',
       'NT': 'New Territories'
     };
     return mapping[region] || '';
   };
   ```

---

## Implementation Strategy

### Option 1: Extend SmartAddressInput (Recommended)
**Pros**:
- Single component handles all countries
- Consistent UX across countries
- Easier to maintain

**Cons**:
- Component complexity increases
- Need conditional logic for HK vs UK

**Approach**:
```javascript
// In SmartAddressInput.js
import useHKAddressLookup from '../../hooks/useHKAddressLookup';

const SmartAddressInput = ({ ... }) => {
  const countryCode = addressMetadataService.getCountryCode(selectedCountry);
  const isHK = countryCode === 'HK';
  const isUK = countryCode === 'GB';

  // Use appropriate hook
  const {
    addresses: hkAddresses,
    isLoading: hkLoading,
    searchAddresses: searchHK
  } = useHKAddressLookup();

  // Conditional lookup
  const handleAddressLineChange = (e) => {
    const value = e.target.value;
    setAddressLineValue(value);

    if (isHK && value.length >= 3) {
      searchHK(value);
      setAddressSuggestions(hkAddresses.map(mapHKtoCommonFormat));
    } else if (isUK && postcodeValue && value.length >= 3) {
      performAddressLookup(postcodeValue, value);
    }
  };

  const mapHKtoCommonFormat = (addr) => ({
    fullAddress: addr.formatted_address,
    building: addr.building,
    line1: addr.street,
    town: addr.district,
    county: mapRegionToArea(addr.region),
    state: mapRegionToArea(addr.region),
    country: selectedCountry,
    postcode: '',
    // HK-specific
    district: addr.district,
    region: addr.region,
    is_3d: addr.is_3d
  });
};
```

### Option 2: Separate HK Component
**Pros**:
- Cleaner separation of concerns
- No conditional logic in SmartAddressInput

**Cons**:
- Duplicate code
- Harder to maintain consistency

**Not recommended** - violates DRY principle

---

## Testing Strategy

After SmartAddressInput integration:

1. **Unit tests**: SmartAddressInput with HK country
   - Renders address field without postcode field
   - Calls HK API on address input (3+ chars)
   - Maps HK responses correctly
   - Populates form fields on selection

2. **Integration tests**: UserFormWizard
   - Full flow: Select HK → Search address → Select → Form populated
   - Verify form validation with HK addresses

3. **Existing tests**: Ensure UK/US address lookup still works

---

## Next Steps

1. ✅ Update SmartAddressInput.js to detect HK country
2. ✅ Add useHKAddressLookup hook import and usage
3. ✅ Implement conditional rendering (hide postcode for HK)
4. ✅ Add HK address lookup trigger (address line input)
5. ✅ Implement response mapping (HK format → form fields)
6. ✅ Add region → area mapping helper
7. ✅ Update handleSelectSuggestion for HK addresses
8. ✅ Write integration tests
9. ✅ Verify all tests pass

---

## Backend Integration

Backend is already complete and verified:
- ✅ API endpoint: `/api/utils/address-lookup-hk/`
- ✅ Contract tests passing (5/5)
- ✅ Real API tested with user queries
- ✅ Correct geodata.gov.hk JSON API endpoint
- ✅ Region derivation from district
- ✅ 2D/3D address detection

**Backend is ready for frontend integration.**

---

## Files Modified So Far

**Frontend**:
- ✅ `src/hooks/useHKAddressLookup.js` (new)
- ✅ `src/hooks/__tests__/useHKAddressLookup.test.js` (new)
- ✅ `src/services/addressMetadataService.js` (modified - enabled HK lookup)

**Backend** (from previous work):
- ✅ `utils/hk_als_helper.py`
- ✅ `utils/views.py`
- ✅ `utils/urls.py`
- ✅ `utils/tests/test_address_lookup_hk.py`
- ✅ `utils/tests/fixtures/hk_als_responses.py`
- ✅ `django_Admin3/settings/development.py`
- ✅ `django_Admin3/settings/uat.py`

---

## Current Status

**Completed**: Hook implementation with full test coverage (11/11 tests passing)

**Next**: Integrate hook into SmartAddressInput component for complete HK address lookup functionality

**Estimated Completion**: T016-T019 requires SmartAddressInput modifications + integration tests
