# Implementation Plan: Enhanced Address Metadata Configuration

## Goal
Enhance `addressMetadataConfig.js` to provide comprehensive address field definitions for 16 countries, adding missing optional fields (like UK county), proper labels, placeholders, and validation rules while maintaining backward compatibility with Google libaddressinput API integration.

---

## Research Summary

### Data Sources
1. **Google libaddressinput API** - Provides format strings, required fields, postcode patterns
2. **Royal Mail (UK)** - County is NOT required but optional; postcode is authoritative
3. **An Post (Ireland)** - Eircode system with 26 counties
4. **UPU Postal Addressing Standards** - Official postal formats per country

### Key Findings by Country

| Country | Required Fields | Optional Fields | Notable Features |
|---------|-----------------|-----------------|------------------|
| **GB** | address, city, postal_code | county | County optional per Royal Mail |
| **ZA** | address, city, postal_code | suburb | 4-digit postcode |
| **IN** | address, city, state, postal_code | - | 36 states, 6-digit PIN |
| **AU** | address, city, state, postal_code | - | 8 states/territories |
| **IE** | address, city | county, postal_code | Eircode optional, 26 counties |
| **MY** | address, city, postal_code | state | 16 states |
| **SG** | address, postal_code | - | City-state, no state field |
| **CN** | address, city, state, postal_code | district | 34 provinces, Chinese/Latin |
| **KE** | address, city | postal_code | P.O. Box common, 47 counties |
| **NZ** | address, city, postal_code | suburb | 4-digit postcode |
| **US** | address, city, state, postal_code | - | 50 states + DC (exists) |
| **HK** | address, state | city | 3 areas, no postcode (exists) |
| **JP** | address, state, postal_code | city | 47 prefectures, 7-digit code |
| **ZW** | address, city | province | No formal postal code system |
| **NG** | address, city | state, postal_code | 37 states, 6-digit code |
| **DE** | address, city, postal_code | - | 5-digit postcode |

---

## Architecture Decision

### Current Flow
```
DynamicAddressForm.js
    ↓
fetchAddressMetadata() [addressMetadataService.js]
    ↓
┌─────────────────────────────────────┐
│ 1. Fetch from Google API            │
│ 2. Transform to internal format     │
│ 3. Merge with ADDRESS_METADATA      │
│    custom config if exists          │
└─────────────────────────────────────┘
    ↓
addressMetadataConfig.js (custom fields override)
```

### Strategy
- **Keep Google API as primary source** for format, required fields, postcode patterns
- **Enhance ADDRESS_METADATA** with:
  - Complete `fields` definitions (labels, placeholders, validation)
  - Missing optional fields (county, suburb, district)
  - State/province dropdown options where applicable
  - Custom layouts for complex countries

---

## Implementation Tasks

### Task 1: Add UK (GB) Complete Configuration
**File:** `src/services/addressMetadataConfig.js`

Add optional county field and complete field definitions:
```javascript
'GB': {
  format: '%N%n%O%n%A%n%C%n%S%n%Z',
  required: ['address', 'city', 'postal_code'],
  optional: ['county'],  // County optional per Royal Mail
  hasPostcode: true,
  addressLookupSupported: true,
  requiresPostcodeForLookup: true,
  fields: {
    address: {
      label: 'Address',
      placeholder: '123 High Street'
    },
    city: {
      label: 'Town/City',
      placeholder: 'London'
    },
    county: {
      label: 'County',
      placeholder: 'Greater London',
      helpText: 'Optional - not required for delivery'
    },
    postal_code: {
      label: 'Postcode',
      placeholder: 'SW1A 1AA',
      pattern: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i,
      error: 'Enter a valid UK postcode (e.g., SW1A 1AA)',
      transform: (value) => value.toUpperCase()
    }
  },
  layout: [
    [{ field: 'address', span: 12 }],
    [{ field: 'city', span: 6 }, { field: 'county', span: 6 }],
    [{ field: 'postal_code', span: 6 }]
  ]
}
```

### Task 2: Add Ireland (IE) Complete Configuration

Add county dropdown and Eircode validation:
```javascript
'IE': {
  format: '%N%n%O%n%A%n%D%n%C%n%S%n%Z',
  required: ['address', 'city'],
  optional: ['county', 'postal_code'],  // Eircode optional
  hasPostcode: true,
  addressLookupSupported: true,
  requiresPostcodeForLookup: false,
  fields: {
    address: {
      label: 'Address',
      placeholder: '123 Main Street'
    },
    city: {
      label: 'Town/City',
      placeholder: 'Dublin'
    },
    county: {
      label: 'County',
      type: 'select',
      options: [
        { value: 'Carlow', label: 'Carlow' },
        { value: 'Cavan', label: 'Cavan' },
        // ... all 26 counties
        { value: 'Dublin', label: 'Dublin' },
        // ...
      ]
    },
    postal_code: {
      label: 'Eircode',
      placeholder: 'D02 X285',
      pattern: /^[A-Z\d]{3}\s?[A-Z\d]{4}$/i,
      error: 'Enter a valid Eircode (e.g., D02 X285)',
      transform: (value) => value.toUpperCase(),
      helpText: 'Optional - unique identifier for your address'
    }
  },
  layout: [
    [{ field: 'address', span: 12 }],
    [{ field: 'city', span: 6 }, { field: 'county', span: 6 }],
    [{ field: 'postal_code', span: 6 }]
  ]
}
```

### Task 3: Add South Africa (ZA) Complete Configuration

Add suburb field and validation:
```javascript
'ZA': {
  format: '%N%n%O%n%A%n%D%n%C%n%Z',
  required: ['address', 'city', 'postal_code'],
  optional: ['suburb'],
  hasPostcode: true,
  addressLookupSupported: true,
  requiresPostcodeForLookup: false,
  fields: {
    address: {
      label: 'Street Address',
      placeholder: '123 Main Road'
    },
    suburb: {
      label: 'Suburb',
      placeholder: 'Sandton'
    },
    city: {
      label: 'City',
      placeholder: 'Johannesburg'
    },
    postal_code: {
      label: 'Postal Code',
      placeholder: '2196',
      pattern: /^\d{4}$/,
      error: 'Enter a valid 4-digit postal code'
    }
  },
  layout: [
    [{ field: 'address', span: 12 }],
    [{ field: 'suburb', span: 6 }, { field: 'city', span: 6 }],
    [{ field: 'postal_code', span: 6 }]
  ]
}
```

### Task 4: Add India (IN) Complete Configuration

Add state dropdown with 36 states/territories:
```javascript
'IN': {
  format: '%N%n%O%n%A%n%C %Z%n%S',
  required: ['address', 'city', 'state', 'postal_code'],
  optional: [],
  hasPostcode: true,
  addressLookupSupported: true,
  requiresPostcodeForLookup: false,
  fields: {
    address: {
      label: 'Street Address',
      placeholder: '123 MG Road'
    },
    city: {
      label: 'City',
      placeholder: 'Mumbai'
    },
    state: {
      label: 'State',
      type: 'select',
      options: [
        { value: 'AN', label: 'Andaman & Nicobar' },
        { value: 'AP', label: 'Andhra Pradesh' },
        // ... all 36 states/territories
      ]
    },
    postal_code: {
      label: 'PIN Code',
      placeholder: '400001',
      pattern: /^\d{6}$/,
      error: 'Enter a valid 6-digit PIN code'
    }
  },
  layout: [
    [{ field: 'address', span: 12 }],
    [{ field: 'city', span: 6 }, { field: 'state', span: 6 }],
    [{ field: 'postal_code', span: 6 }]
  ]
}
```

### Task 5: Add Australia (AU) Complete Configuration

Update with 8 states/territories dropdown:
```javascript
'AU': {
  format: '%O%n%N%n%A%n%C %S %Z',
  required: ['address', 'city', 'state', 'postal_code'],
  optional: [],
  hasPostcode: true,
  addressLookupSupported: true,
  requiresPostcodeForLookup: false,
  fields: {
    address: {
      label: 'Street Address',
      placeholder: '123 George Street'
    },
    city: {
      label: 'Suburb',  // Australia uses "suburb" terminology
      placeholder: 'Sydney'
    },
    state: {
      label: 'State',
      type: 'select',
      options: [
        { value: 'ACT', label: 'Australian Capital Territory' },
        { value: 'NSW', label: 'New South Wales' },
        { value: 'NT', label: 'Northern Territory' },
        { value: 'QLD', label: 'Queensland' },
        { value: 'SA', label: 'South Australia' },
        { value: 'TAS', label: 'Tasmania' },
        { value: 'VIC', label: 'Victoria' },
        { value: 'WA', label: 'Western Australia' }
      ]
    },
    postal_code: {
      label: 'Postcode',
      placeholder: '2000',
      pattern: /^\d{4}$/,
      error: 'Enter a valid 4-digit postcode'
    }
  },
  layout: [
    [{ field: 'address', span: 12 }],
    [{ field: 'city', span: 4 }, { field: 'state', span: 4 }, { field: 'postal_code', span: 4 }]
  ]
}
```

### Task 6: Add Malaysia (MY) Complete Configuration

Add state dropdown with 16 states:
```javascript
'MY': {
  format: '%N%n%O%n%A%n%D%n%Z %C%n%S',
  required: ['address', 'city', 'postal_code'],
  optional: ['state'],
  hasPostcode: true,
  addressLookupSupported: true,
  requiresPostcodeForLookup: false,
  fields: {
    address: {
      label: 'Street Address',
      placeholder: '123 Jalan Sultan Ismail'
    },
    city: {
      label: 'City',
      placeholder: 'Kuala Lumpur'
    },
    state: {
      label: 'State',
      type: 'select',
      options: [
        { value: 'JHR', label: 'Johor' },
        { value: 'KDH', label: 'Kedah' },
        { value: 'KTN', label: 'Kelantan' },
        { value: 'KUL', label: 'Kuala Lumpur' },
        { value: 'LBN', label: 'Labuan' },
        { value: 'MLK', label: 'Melaka' },
        { value: 'NSN', label: 'Negeri Sembilan' },
        { value: 'PHG', label: 'Pahang' },
        { value: 'PNG', label: 'Penang' },
        { value: 'PRK', label: 'Perak' },
        { value: 'PLS', label: 'Perlis' },
        { value: 'PJY', label: 'Putrajaya' },
        { value: 'SBH', label: 'Sabah' },
        { value: 'SWK', label: 'Sarawak' },
        { value: 'SGR', label: 'Selangor' },
        { value: 'TRG', label: 'Terengganu' }
      ]
    },
    postal_code: {
      label: 'Postcode',
      placeholder: '50000',
      pattern: /^\d{5}$/,
      error: 'Enter a valid 5-digit postcode'
    }
  },
  layout: [
    [{ field: 'address', span: 12 }],
    [{ field: 'city', span: 6 }, { field: 'state', span: 6 }],
    [{ field: 'postal_code', span: 6 }]
  ]
}
```

### Task 7: Add Singapore (SG) Complete Configuration

Simplify to just address + postal code:
```javascript
'SG': {
  format: '%N%n%O%n%A%nSINGAPORE %Z',
  required: ['address', 'postal_code'],
  optional: [],
  hasPostcode: true,
  addressLookupSupported: true,
  requiresPostcodeForLookup: false,
  fields: {
    address: {
      label: 'Street Address',
      placeholder: 'Block 123 Orchard Road #01-01'
    },
    postal_code: {
      label: 'Postal Code',
      placeholder: '238858',
      pattern: /^\d{6}$/,
      error: 'Enter a valid 6-digit postal code'
    }
  },
  layout: [
    [{ field: 'address', span: 8 }, { field: 'postal_code', span: 4 }]
  ]
}
```

### Task 8: Add China (CN) Complete Configuration

Add province dropdown with 34 provinces:
```javascript
'CN': {
  format: '%Z%n%S%C%D%n%A%n%O%n%N',
  required: ['address', 'city', 'state', 'postal_code'],
  optional: ['district'],
  hasPostcode: true,
  addressLookupSupported: true,
  requiresPostcodeForLookup: false,
  fields: {
    address: {
      label: 'Street Address',
      placeholder: '123 Nanjing Road'
    },
    district: {
      label: 'District',
      placeholder: 'Huangpu'
    },
    city: {
      label: 'City',
      placeholder: 'Shanghai'
    },
    state: {
      label: 'Province',
      type: 'select',
      options: [
        { value: 'AH', label: 'Anhui' },
        { value: 'BJ', label: 'Beijing' },
        // ... all 34 provinces/municipalities
      ]
    },
    postal_code: {
      label: 'Postal Code',
      placeholder: '200001',
      pattern: /^\d{6}$/,
      error: 'Enter a valid 6-digit postal code'
    }
  },
  layout: [
    [{ field: 'address', span: 12 }],
    [{ field: 'district', span: 6 }, { field: 'city', span: 6 }],
    [{ field: 'state', span: 6 }, { field: 'postal_code', span: 6 }]
  ]
}
```

### Task 9: Add Kenya (KE) Complete Configuration

Add county dropdown with 47 counties:
```javascript
'KE': {
  format: '%N%n%O%n%A%n%C%n%Z',
  required: ['address', 'city'],
  optional: ['county', 'postal_code'],
  hasPostcode: true,
  addressLookupSupported: true,
  requiresPostcodeForLookup: false,
  fields: {
    address: {
      label: 'Address / P.O. Box',
      placeholder: 'P.O. Box 1234 or 123 Kenyatta Avenue'
    },
    city: {
      label: 'Town/City',
      placeholder: 'Nairobi'
    },
    county: {
      label: 'County',
      type: 'select',
      options: [
        { value: 'Baringo', label: 'Baringo' },
        { value: 'Bomet', label: 'Bomet' },
        // ... all 47 counties
        { value: 'Nairobi', label: 'Nairobi' },
        // ...
      ]
    },
    postal_code: {
      label: 'Postal Code',
      placeholder: '00100',
      pattern: /^\d{5}$/,
      error: 'Enter a valid 5-digit postal code'
    }
  },
  layout: [
    [{ field: 'address', span: 12 }],
    [{ field: 'city', span: 6 }, { field: 'county', span: 6 }],
    [{ field: 'postal_code', span: 6 }]
  ]
}
```

### Task 10: Add New Zealand (NZ) Complete Configuration

Add suburb field:
```javascript
'NZ': {
  format: '%N%n%O%n%A%n%D%n%C %Z',
  required: ['address', 'city', 'postal_code'],
  optional: ['suburb'],
  hasPostcode: true,
  addressLookupSupported: true,
  requiresPostcodeForLookup: false,
  fields: {
    address: {
      label: 'Street Address',
      placeholder: '123 Queen Street'
    },
    suburb: {
      label: 'Suburb',
      placeholder: 'Auckland Central'
    },
    city: {
      label: 'Town/City',
      placeholder: 'Auckland'
    },
    postal_code: {
      label: 'Postcode',
      placeholder: '1010',
      pattern: /^\d{4}$/,
      error: 'Enter a valid 4-digit postcode'
    }
  },
  layout: [
    [{ field: 'address', span: 12 }],
    [{ field: 'suburb', span: 6 }, { field: 'city', span: 6 }],
    [{ field: 'postal_code', span: 6 }]
  ]
}
```

### Task 11: Add Japan (JP) Complete Configuration

Add prefecture dropdown with 47 prefectures:
```javascript
'JP': {
  format: '〒%Z%n%S%n%A%n%O%n%N',
  required: ['address', 'state', 'postal_code'],
  optional: ['city'],
  hasPostcode: true,
  addressLookupSupported: true,
  requiresPostcodeForLookup: false,
  fields: {
    address: {
      label: 'Street Address',
      placeholder: '1-2-3 Shibuya'
    },
    city: {
      label: 'City/Ward',
      placeholder: 'Shibuya-ku'
    },
    state: {
      label: 'Prefecture',
      type: 'select',
      options: [
        { value: '01', label: 'Hokkaido' },
        { value: '02', label: 'Aomori' },
        // ... all 47 prefectures
        { value: '13', label: 'Tokyo' },
        // ...
      ]
    },
    postal_code: {
      label: 'Postal Code',
      placeholder: '150-0002',
      pattern: /^\d{3}-?\d{4}$/,
      error: 'Enter a valid postal code (e.g., 150-0002)',
      transform: (value) => {
        // Auto-format: 1500002 -> 150-0002
        const digits = value.replace(/\D/g, '');
        if (digits.length === 7) {
          return `${digits.slice(0, 3)}-${digits.slice(3)}`;
        }
        return value;
      }
    }
  },
  layout: [
    [{ field: 'postal_code', span: 4 }, { field: 'state', span: 4 }, { field: 'city', span: 4 }],
    [{ field: 'address', span: 12 }]
  ]
}
```

### Task 12: Add Zimbabwe (ZW) Complete Configuration

No formal postal code system:
```javascript
'ZW': {
  format: '%N%n%O%n%A%n%C%n%S',
  required: ['address', 'city'],
  optional: ['province'],
  hasPostcode: false,
  addressLookupSupported: true,
  requiresPostcodeForLookup: false,
  fields: {
    address: {
      label: 'Street Address',
      placeholder: '123 Samora Machel Avenue'
    },
    city: {
      label: 'Town/City',
      placeholder: 'Harare'
    },
    province: {
      label: 'Province',
      type: 'select',
      options: [
        { value: 'BU', label: 'Bulawayo' },
        { value: 'HA', label: 'Harare' },
        { value: 'MA', label: 'Manicaland' },
        { value: 'MC', label: 'Mashonaland Central' },
        { value: 'ME', label: 'Mashonaland East' },
        { value: 'MW', label: 'Mashonaland West' },
        { value: 'MV', label: 'Masvingo' },
        { value: 'MN', label: 'Matabeleland North' },
        { value: 'MS', label: 'Matabeleland South' },
        { value: 'MI', label: 'Midlands' }
      ]
    }
  },
  layout: [
    [{ field: 'address', span: 12 }],
    [{ field: 'city', span: 6 }, { field: 'province', span: 6 }]
  ]
}
```

### Task 13: Add Nigeria (NG) Complete Configuration

Add state dropdown with 37 states:
```javascript
'NG': {
  format: '%N%n%O%n%A%n%D%n%C %Z%n%S',
  required: ['address', 'city'],
  optional: ['state', 'postal_code'],
  hasPostcode: true,
  addressLookupSupported: true,
  requiresPostcodeForLookup: false,
  fields: {
    address: {
      label: 'Street Address',
      placeholder: '123 Broad Street'
    },
    city: {
      label: 'Town/City',
      placeholder: 'Lagos'
    },
    state: {
      label: 'State',
      type: 'select',
      options: [
        { value: 'AB', label: 'Abia' },
        { value: 'AD', label: 'Adamawa' },
        // ... all 37 states including FCT
        { value: 'LA', label: 'Lagos' },
        { value: 'FC', label: 'Federal Capital Territory' },
        // ...
      ]
    },
    postal_code: {
      label: 'Postal Code',
      placeholder: '100001',
      pattern: /^\d{6}$/,
      error: 'Enter a valid 6-digit postal code'
    }
  },
  layout: [
    [{ field: 'address', span: 12 }],
    [{ field: 'city', span: 6 }, { field: 'state', span: 6 }],
    [{ field: 'postal_code', span: 6 }]
  ]
}
```

### Task 14: Add Germany (DE) Complete Configuration

Simple address format:
```javascript
'DE': {
  format: '%N%n%O%n%A%n%Z %C',
  required: ['address', 'city', 'postal_code'],
  optional: [],
  hasPostcode: true,
  addressLookupSupported: true,
  requiresPostcodeForLookup: false,
  fields: {
    address: {
      label: 'Straße und Hausnummer',  // German label
      placeholder: 'Musterstraße 123'
    },
    city: {
      label: 'Stadt',  // German label
      placeholder: 'Berlin'
    },
    postal_code: {
      label: 'Postleitzahl',  // German label
      placeholder: '10115',
      pattern: /^\d{5}$/,
      error: 'Bitte geben Sie eine gültige 5-stellige PLZ ein'
    }
  },
  layout: [
    [{ field: 'address', span: 12 }],
    [{ field: 'postal_code', span: 4 }, { field: 'city', span: 8 }]
  ]
}
```

### Task 15: Update COUNTRY_CODE_MAPPINGS

Add missing country mappings:
```javascript
export const COUNTRY_CODE_MAPPINGS = {
  'United States': 'US',
  'United Kingdom': 'GB',
  'Hong Kong': 'HK',
  'Canada': 'CA',
  'Taiwan': 'TW',
  'Australia': 'AU',
  'Germany': 'DE',
  'France': 'FR',
  'Japan': 'JP',
  'South Korea': 'KR',
  'Singapore': 'SG',
  'India': 'IN',
  'China': 'CN',
  'South Africa': 'ZA',
  'Ireland': 'IE',
  'Malaysia': 'MY',
  'New Zealand': 'NZ',
  'Mauritius': 'MU',
  'Kenya': 'KE',
  'Zimbabwe': 'ZW',
  'Cyprus': 'CY',
  'Bermuda': 'BM',
  'Poland': 'PL',
  'Malta': 'MT',
  'Nigeria': 'NG'  // Add Nigeria
};
```

### Task 16: Update googleAddressMetadata.js Layout Generation

Modify `generateLayout()` to handle optional fields like county/suburb:
- Add dependent_locality (suburb) to layout when present
- Handle countries with county field (GB, IE, KE)
- Respect field order from format string

### Task 17: Write Unit Tests

Create tests for:
- Each country's field configuration
- Validation patterns (postcode formats)
- Required vs optional field classification
- State/county dropdown options
- Layout generation

---

## Validation Rules Summary

| Country | Field | Pattern | Example |
|---------|-------|---------|---------|
| GB | postal_code | `/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i` | SW1A 1AA |
| IE | postal_code | `/^[A-Z\d]{3}\s?[A-Z\d]{4}$/i` | D02 X285 |
| ZA | postal_code | `/^\d{4}$/` | 2196 |
| IN | postal_code | `/^\d{6}$/` | 400001 |
| AU | postal_code | `/^\d{4}$/` | 2000 |
| MY | postal_code | `/^\d{5}$/` | 50000 |
| SG | postal_code | `/^\d{6}$/` | 238858 |
| CN | postal_code | `/^\d{6}$/` | 200001 |
| KE | postal_code | `/^\d{5}$/` | 00100 |
| NZ | postal_code | `/^\d{4}$/` | 1010 |
| JP | postal_code | `/^\d{3}-?\d{4}$/` | 150-0002 |
| NG | postal_code | `/^\d{6}$/` | 100001 |
| DE | postal_code | `/^\d{5}$/` | 10115 |
| US | postal_code | `/^(\d{5})(?:[-\s]?(\d{4}))?$/` | 12345-6789 |
| CA | postal_code | `/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i` | K1A 0A6 |

---

## Files to Modify

1. **`src/services/addressMetadataConfig.js`** - Main configuration file (Tasks 1-15)
2. **`src/services/googleAddressMetadata.js`** - Layout generation (Task 16)
3. **`src/services/__tests__/addressMetadataConfig.test.js`** - Unit tests (Task 17)

---

## Backward Compatibility

- Existing US, CA, HK configurations remain unchanged (already complete)
- New fields added are optional, won't break existing forms
- Google API fallback still works if custom config missing
- Field merging logic in `fetchAddressMetadata()` handles custom overrides

---

## Estimated LOC Changes

| File | Lines Added | Lines Modified |
|------|-------------|----------------|
| addressMetadataConfig.js | ~800 | ~50 |
| googleAddressMetadata.js | ~30 | ~10 |
| Tests | ~300 | 0 |
| **Total** | **~1,130** | **~60** |
