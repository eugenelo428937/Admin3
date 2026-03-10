# Plan: Fix Address Not Saved During Registration

## Problem Summary

When registering a new account, home and work addresses are not saved to the database despite the user entering full address information.

**What user entered:** Full address with street, city, postcode, etc.

**Payload actually sent to API:**
```json
{
  "profile": {
    "home_address": {
      "country": "United Kingdom"
    },
    "work_address": {
      "country": "United Kingdom",
      "company": "ActEd",
      "department": "IT"
    }
  }
}
```

**Result:** Only `country` reaches the API - all other address fields (street, city, postcode) are lost!

---

## Root Cause Analysis

### Location of Bug
**File:** `frontend/react-Admin3/src/components/User/UserFormWizard.js` (lines 893-923)

### The Problem
The `formatAddressData()` function uses **synchronous fallback metadata** to determine which fields to extract:

```javascript
const formatAddressData = (addressPrefix) => {
   const country = form[`${addressPrefix}_country`];
   if (!country) return {};

   // BUG: Uses synchronous fallback metadata
   const countryCode = addressMetadataService.getCountryCode(country);
   const metadata = addressMetadataService.getAddressMetadata(countryCode);  // <-- SYNC FALLBACK!

   const addressData = { country };

   // BUG: For UK, metadata.fields is {} (empty!)
   Object.keys(metadata.fields).forEach((fieldName) => {
      // This loop does NOTHING for UK because fields is empty
      const value = form[`${addressPrefix}_${fieldName}`];
      if (value && value.trim()) {
         addressData[fieldName] = value.trim();
      }
   });

   return addressData;  // Only { country: "United Kingdom" } is returned!
};
```

### Why This Happens

**Metadata Mismatch:**

| Component | Metadata Source | UK `fields` |
|-----------|----------------|-------------|
| Form Rendering (`SmartAddressInput`) | `fetchAddressMetadata()` (async Google API) | Full field definitions |
| Data Submission (`formatAddressData`) | `getAddressMetadata()` (sync fallback) | `{}` (empty!) |

The frontend uses Google's libaddressinput API to dynamically generate address fields based on country. Different countries have different required/optional fields. But the data extraction function uses the synchronous fallback which has `fields: {}` for UK.

### Data Flow Trace

```
User fills form (address, city, postcode, etc.)
    |
    v Form state has: { home_address: "123 Main St", home_city: "London", home_postal_code: "SW1A 1AA", ... }
    |
    v formatAddressData("home") called
    |
    v getAddressMetadata("GB") returns { fields: {} }  <-- EMPTY!
    |
    v Object.keys({}).forEach(...) iterates over NOTHING
    |
    v Only { country: "United Kingdom" } is returned
    |
    v API receives incomplete address
```

---

## Solution

### Fix: Extract All Known Address Fields Regardless of Metadata

**Change:** Modify `formatAddressData()` to extract ALL known address field names directly from the form state, not depending on `metadata.fields`.

**Rationale:**
- The form rendering uses dynamic Google API metadata which varies by country
- The data extraction should not depend on a different metadata source
- Extracting all known fields ensures no data is lost regardless of country

### Code Change

**Before:**
```javascript
const formatAddressData = (addressPrefix) => {
   const country = form[`${addressPrefix}_country`];
   if (!country) return {};

   const countryCode = addressMetadataService.getCountryCode(country);
   const metadata = addressMetadataService.getAddressMetadata(countryCode);

   const addressData = { country };

   // BUG: Depends on metadata.fields which may be empty
   Object.keys(metadata.fields).forEach((fieldName) => {
      const formFieldName = `${addressPrefix}_${fieldName}`;
      const value = form[formFieldName];
      if (value && value.trim()) {
         addressData[fieldName] = value.trim();
      }
   });

   // ... company/department handling
   return addressData;
};
```

**After:**
```javascript
const formatAddressData = (addressPrefix) => {
   const country = form[`${addressPrefix}_country`];
   if (!country) return {};

   const addressData = { country };

   // Extract all known address field names regardless of country metadata
   // This ensures no data is lost regardless of which metadata was used for form rendering
   const addressFields = [
      'address',        // Street address
      'city',           // City/Town
      'county',         // County (UK)
      'state',          // State/Province
      'postal_code',    // Postal/ZIP code
      'district',       // District
      'building',       // Building name
      'sub_building_name',  // Flat/Unit
      'building_name',      // Building
      'building_number'     // Street number
   ];

   addressFields.forEach((fieldName) => {
      const formFieldName = `${addressPrefix}_${fieldName}`;
      const value = form[formFieldName];
      if (value && value.trim()) {
         addressData[fieldName] = value.trim();
      }
   });

   // Add company and department for work addresses
   if (addressPrefix === "work") {
      if (form.work_company) addressData.company = form.work_company;
      if (form.work_department) addressData.department = form.work_department;
   }

   return addressData;
};
```

---

## Tasks

| ID | Task | File | Effort |
|----|------|------|--------|
| T01 | Write failing test for address data extraction | `frontend/.../UserFormWizard.test.js` | Small |
| T02 | Fix `formatAddressData` to extract all known fields | `UserFormWizard.js` | Small |
| T03 | Update backend `_has_valid_address_data` for robustness | `users/serializers.py` | Small |
| T04 | Run full test suite | - | Small |
| T05 | Manual E2E test with frontend | - | Small |

---

## Secondary Fix: Backend Robustness

While the primary bug is in the frontend, the backend should also be updated to accept addresses more flexibly (not hardcoded field names).

**Current backend validation:**
```python
def _has_valid_address_data(self, address_dict):
    required_fields = ['street', 'town', 'city', 'address']
    return any(address_dict.get(field) for field in required_fields)
```

**Updated backend validation:**
```python
def _has_valid_address_data(self, address_dict):
    """Check if address dictionary contains any meaningful data.

    Does not hardcode specific field names since different countries
    have different address formats (per Google libaddressinput).
    """
    # Accept any non-empty value as valid address data
    return any(
        value and str(value).strip()
        for key, value in address_dict.items()
    )
```

This ensures:
1. Country-only addresses are accepted (user can complete later)
2. Any address format from any country is accepted
3. Aligns with Google libaddressinput's dynamic field system

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Over-extraction of fields | Low | Low | Only extract known field names |
| Backend still rejects | Low | Medium | Also fix backend validation |
| Test coverage gaps | Low | Medium | Add comprehensive test cases |

---

## Verification Plan

1. **Unit Tests:** Test `formatAddressData` extracts all fields
2. **Integration Test:** Register via API with full UK address
3. **E2E Test:** Full registration flow via frontend
4. **Database Check:** Verify `UserProfileAddress` records contain all fields

---

## Files to Modify

1. `frontend/react-Admin3/src/components/User/UserFormWizard.js` - Fix `formatAddressData`
2. `backend/django_Admin3/users/serializers.py` - Update `_has_valid_address_data`

---

## Approval Checklist

- [x] Root cause analysis is correct (frontend metadata mismatch)
- [x] Solution approach is appropriate (extract all known fields)
- [ ] Test coverage is adequate
- [ ] Risk is acceptable
- [ ] Ready to implement
