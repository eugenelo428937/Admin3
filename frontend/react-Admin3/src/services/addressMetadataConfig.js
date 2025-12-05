/**
 * Address Metadata Configuration
 *
 * Comprehensive address field configurations for all supported countries.
 * Provides labels, placeholders, validation patterns, and dropdown options.
 *
 * Architecture:
 * - Google libaddressinput API provides base format and required fields
 * - This config enhances with:
 *   - Complete field definitions (labels, placeholders, validation)
 *   - Missing optional fields (county, suburb, district)
 *   - State/province dropdown options
 *   - Custom layouts
 *
 * Sources:
 * - Google libaddressinput: https://chromium-i18n.appspot.com/ssl-address/data/
 * - Royal Mail (UK): County is optional
 * - An Post (Ireland): Eircode with 26 counties
 * - UPU Postal Addressing Standards
 */

// Country-specific address metadata
export const ADDRESS_METADATA = {
  // ============================================================
  // UNITED STATES
  // ============================================================
  'US': {
    format: '%N%n%O%n%A%n%C, %S %Z',
    required: ['address', 'city', 'state', 'postal_code'],
    optional: [],
    hasPostcode: true,
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,
    fields: {
      address: {
        label: 'Street Address',
        placeholder: '123 Main St'
      },
      city: {
        label: 'City',
        placeholder: 'New York'
      },
      state: {
        label: 'State',
        placeholder: 'NY',
        type: 'select',
        options: [
          { value: 'AL', label: 'Alabama' },
          { value: 'AK', label: 'Alaska' },
          { value: 'AZ', label: 'Arizona' },
          { value: 'AR', label: 'Arkansas' },
          { value: 'CA', label: 'California' },
          { value: 'CO', label: 'Colorado' },
          { value: 'CT', label: 'Connecticut' },
          { value: 'DE', label: 'Delaware' },
          { value: 'FL', label: 'Florida' },
          { value: 'GA', label: 'Georgia' },
          { value: 'HI', label: 'Hawaii' },
          { value: 'ID', label: 'Idaho' },
          { value: 'IL', label: 'Illinois' },
          { value: 'IN', label: 'Indiana' },
          { value: 'IA', label: 'Iowa' },
          { value: 'KS', label: 'Kansas' },
          { value: 'KY', label: 'Kentucky' },
          { value: 'LA', label: 'Louisiana' },
          { value: 'ME', label: 'Maine' },
          { value: 'MD', label: 'Maryland' },
          { value: 'MA', label: 'Massachusetts' },
          { value: 'MI', label: 'Michigan' },
          { value: 'MN', label: 'Minnesota' },
          { value: 'MS', label: 'Mississippi' },
          { value: 'MO', label: 'Missouri' },
          { value: 'MT', label: 'Montana' },
          { value: 'NE', label: 'Nebraska' },
          { value: 'NV', label: 'Nevada' },
          { value: 'NH', label: 'New Hampshire' },
          { value: 'NJ', label: 'New Jersey' },
          { value: 'NM', label: 'New Mexico' },
          { value: 'NY', label: 'New York' },
          { value: 'NC', label: 'North Carolina' },
          { value: 'ND', label: 'North Dakota' },
          { value: 'OH', label: 'Ohio' },
          { value: 'OK', label: 'Oklahoma' },
          { value: 'OR', label: 'Oregon' },
          { value: 'PA', label: 'Pennsylvania' },
          { value: 'RI', label: 'Rhode Island' },
          { value: 'SC', label: 'South Carolina' },
          { value: 'SD', label: 'South Dakota' },
          { value: 'TN', label: 'Tennessee' },
          { value: 'TX', label: 'Texas' },
          { value: 'UT', label: 'Utah' },
          { value: 'VT', label: 'Vermont' },
          { value: 'VA', label: 'Virginia' },
          { value: 'WA', label: 'Washington' },
          { value: 'WV', label: 'West Virginia' },
          { value: 'WI', label: 'Wisconsin' },
          { value: 'WY', label: 'Wyoming' },
          { value: 'DC', label: 'District of Columbia' }
        ]
      },
      postal_code: {
        label: 'ZIP Code',
        placeholder: '12345',
        pattern: /^(\d{5})(?:[-\s]?(\d{4}))?$/,
        error: 'Enter a valid ZIP code (e.g., 12345 or 12345-6789)'
      }
    },
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'state', span: 3 }, { field: 'postal_code', span: 3 }]
    ]
  },

  // ============================================================
  // UNITED KINGDOM
  // County is optional per Royal Mail guidelines
  // District is the locality/village (e.g., Garsington)
  // ============================================================
  'GB': {
    format: '%N%n%O%n%A%n%D%n%C%n%S%n%Z',
    required: ['address', 'city', 'postal_code'],
    optional: ['district', 'county'],
    hasPostcode: true,
    addressLookupSupported: true,
    requiresPostcodeForLookup: true,
    fields: {
      address: {
        label: 'Address',
        placeholder: '123 High Street'
      },
      district: {
        label: 'Locality',
        placeholder: 'e.g., Garsington',
        helpText: 'Village or locality if different from town'
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
      [{ field: 'district', span: 6 }, { field: 'city', span: 6 }],
      [{ field: 'county', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },

  // ============================================================
  // IRELAND
  // Eircode is optional, 26 counties
  // ============================================================
  'IE': {
    format: '%N%n%O%n%A%n%D%n%C%n%S%n%Z',
    required: ['address', 'city'],
    optional: ['county', 'postal_code'],
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
          { value: 'Clare', label: 'Clare' },
          { value: 'Cork', label: 'Cork' },
          { value: 'Donegal', label: 'Donegal' },
          { value: 'Dublin', label: 'Dublin' },
          { value: 'Galway', label: 'Galway' },
          { value: 'Kerry', label: 'Kerry' },
          { value: 'Kildare', label: 'Kildare' },
          { value: 'Kilkenny', label: 'Kilkenny' },
          { value: 'Laois', label: 'Laois' },
          { value: 'Leitrim', label: 'Leitrim' },
          { value: 'Limerick', label: 'Limerick' },
          { value: 'Longford', label: 'Longford' },
          { value: 'Louth', label: 'Louth' },
          { value: 'Mayo', label: 'Mayo' },
          { value: 'Meath', label: 'Meath' },
          { value: 'Monaghan', label: 'Monaghan' },
          { value: 'Offaly', label: 'Offaly' },
          { value: 'Roscommon', label: 'Roscommon' },
          { value: 'Sligo', label: 'Sligo' },
          { value: 'Tipperary', label: 'Tipperary' },
          { value: 'Waterford', label: 'Waterford' },
          { value: 'Westmeath', label: 'Westmeath' },
          { value: 'Wexford', label: 'Wexford' },
          { value: 'Wicklow', label: 'Wicklow' }
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
  },

  // ============================================================
  // SOUTH AFRICA
  // 4-digit postal code, suburb field
  // ============================================================
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
  },

  // ============================================================
  // INDIA
  // 36 states/territories, 6-digit PIN code
  // ============================================================
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
          { value: 'AR', label: 'Arunachal Pradesh' },
          { value: 'AS', label: 'Assam' },
          { value: 'BR', label: 'Bihar' },
          { value: 'CH', label: 'Chandigarh' },
          { value: 'CT', label: 'Chhattisgarh' },
          { value: 'DN', label: 'Dadra & Nagar Haveli' },
          { value: 'DD', label: 'Daman & Diu' },
          { value: 'DL', label: 'Delhi' },
          { value: 'GA', label: 'Goa' },
          { value: 'GJ', label: 'Gujarat' },
          { value: 'HR', label: 'Haryana' },
          { value: 'HP', label: 'Himachal Pradesh' },
          { value: 'JK', label: 'Jammu & Kashmir' },
          { value: 'JH', label: 'Jharkhand' },
          { value: 'KA', label: 'Karnataka' },
          { value: 'KL', label: 'Kerala' },
          { value: 'LA', label: 'Ladakh' },
          { value: 'LD', label: 'Lakshadweep' },
          { value: 'MP', label: 'Madhya Pradesh' },
          { value: 'MH', label: 'Maharashtra' },
          { value: 'MN', label: 'Manipur' },
          { value: 'ML', label: 'Meghalaya' },
          { value: 'MZ', label: 'Mizoram' },
          { value: 'NL', label: 'Nagaland' },
          { value: 'OR', label: 'Odisha' },
          { value: 'PY', label: 'Puducherry' },
          { value: 'PB', label: 'Punjab' },
          { value: 'RJ', label: 'Rajasthan' },
          { value: 'SK', label: 'Sikkim' },
          { value: 'TN', label: 'Tamil Nadu' },
          { value: 'TG', label: 'Telangana' },
          { value: 'TR', label: 'Tripura' },
          { value: 'UP', label: 'Uttar Pradesh' },
          { value: 'UK', label: 'Uttarakhand' },
          { value: 'WB', label: 'West Bengal' }
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
  },

  // ============================================================
  // AUSTRALIA
  // 8 states/territories, 4-digit postcode
  // ============================================================
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
        label: 'Suburb',
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
  },

  // ============================================================
  // MALAYSIA
  // 16 states, 5-digit postcode
  // ============================================================
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
  },

  // ============================================================
  // SINGAPORE
  // City-state, no state field, 6-digit postal code
  // ============================================================
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
  },

  // ============================================================
  // CHINA
  // 34 provinces/municipalities, 6-digit postal code
  // ============================================================
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
          { value: 'CQ', label: 'Chongqing' },
          { value: 'FJ', label: 'Fujian' },
          { value: 'GS', label: 'Gansu' },
          { value: 'GD', label: 'Guangdong' },
          { value: 'GX', label: 'Guangxi' },
          { value: 'GZ', label: 'Guizhou' },
          { value: 'HI', label: 'Hainan' },
          { value: 'HE', label: 'Hebei' },
          { value: 'HL', label: 'Heilongjiang' },
          { value: 'HA', label: 'Henan' },
          { value: 'HK', label: 'Hong Kong' },
          { value: 'HB', label: 'Hubei' },
          { value: 'HN', label: 'Hunan' },
          { value: 'JS', label: 'Jiangsu' },
          { value: 'JX', label: 'Jiangxi' },
          { value: 'JL', label: 'Jilin' },
          { value: 'LN', label: 'Liaoning' },
          { value: 'MO', label: 'Macau' },
          { value: 'NM', label: 'Inner Mongolia' },
          { value: 'NX', label: 'Ningxia' },
          { value: 'QH', label: 'Qinghai' },
          { value: 'SN', label: 'Shaanxi' },
          { value: 'SD', label: 'Shandong' },
          { value: 'SH', label: 'Shanghai' },
          { value: 'SX', label: 'Shanxi' },
          { value: 'SC', label: 'Sichuan' },
          { value: 'TW', label: 'Taiwan' },
          { value: 'TJ', label: 'Tianjin' },
          { value: 'XJ', label: 'Xinjiang' },
          { value: 'XZ', label: 'Tibet' },
          { value: 'YN', label: 'Yunnan' },
          { value: 'ZJ', label: 'Zhejiang' }
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
  },

  // ============================================================
  // KENYA
  // 47 counties, P.O. Box common, 5-digit postal code optional
  // ============================================================
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
          { value: 'Bungoma', label: 'Bungoma' },
          { value: 'Busia', label: 'Busia' },
          { value: 'Elgeyo-Marakwet', label: 'Elgeyo-Marakwet' },
          { value: 'Embu', label: 'Embu' },
          { value: 'Garissa', label: 'Garissa' },
          { value: 'Homa Bay', label: 'Homa Bay' },
          { value: 'Isiolo', label: 'Isiolo' },
          { value: 'Kajiado', label: 'Kajiado' },
          { value: 'Kakamega', label: 'Kakamega' },
          { value: 'Kericho', label: 'Kericho' },
          { value: 'Kiambu', label: 'Kiambu' },
          { value: 'Kilifi', label: 'Kilifi' },
          { value: 'Kirinyaga', label: 'Kirinyaga' },
          { value: 'Kisii', label: 'Kisii' },
          { value: 'Kisumu', label: 'Kisumu' },
          { value: 'Kitui', label: 'Kitui' },
          { value: 'Kwale', label: 'Kwale' },
          { value: 'Laikipia', label: 'Laikipia' },
          { value: 'Lamu', label: 'Lamu' },
          { value: 'Machakos', label: 'Machakos' },
          { value: 'Makueni', label: 'Makueni' },
          { value: 'Mandera', label: 'Mandera' },
          { value: 'Marsabit', label: 'Marsabit' },
          { value: 'Meru', label: 'Meru' },
          { value: 'Migori', label: 'Migori' },
          { value: 'Mombasa', label: 'Mombasa' },
          { value: 'Murang\'a', label: 'Murang\'a' },
          { value: 'Nairobi', label: 'Nairobi' },
          { value: 'Nakuru', label: 'Nakuru' },
          { value: 'Nandi', label: 'Nandi' },
          { value: 'Narok', label: 'Narok' },
          { value: 'Nyamira', label: 'Nyamira' },
          { value: 'Nyandarua', label: 'Nyandarua' },
          { value: 'Nyeri', label: 'Nyeri' },
          { value: 'Samburu', label: 'Samburu' },
          { value: 'Siaya', label: 'Siaya' },
          { value: 'Taita-Taveta', label: 'Taita-Taveta' },
          { value: 'Tana River', label: 'Tana River' },
          { value: 'Tharaka-Nithi', label: 'Tharaka-Nithi' },
          { value: 'Trans-Nzoia', label: 'Trans-Nzoia' },
          { value: 'Turkana', label: 'Turkana' },
          { value: 'Uasin Gishu', label: 'Uasin Gishu' },
          { value: 'Vihiga', label: 'Vihiga' },
          { value: 'Wajir', label: 'Wajir' },
          { value: 'West Pokot', label: 'West Pokot' }
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
  },

  // ============================================================
  // NEW ZEALAND
  // 4-digit postcode, suburb field
  // ============================================================
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
  },

  // ============================================================
  // JAPAN
  // 47 prefectures, 7-digit postal code (XXX-XXXX format)
  // ============================================================
  'JP': {
    format: '%Z%n%S%n%A%n%O%n%N',
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
          { value: '03', label: 'Iwate' },
          { value: '04', label: 'Miyagi' },
          { value: '05', label: 'Akita' },
          { value: '06', label: 'Yamagata' },
          { value: '07', label: 'Fukushima' },
          { value: '08', label: 'Ibaraki' },
          { value: '09', label: 'Tochigi' },
          { value: '10', label: 'Gunma' },
          { value: '11', label: 'Saitama' },
          { value: '12', label: 'Chiba' },
          { value: '13', label: 'Tokyo' },
          { value: '14', label: 'Kanagawa' },
          { value: '15', label: 'Niigata' },
          { value: '16', label: 'Toyama' },
          { value: '17', label: 'Ishikawa' },
          { value: '18', label: 'Fukui' },
          { value: '19', label: 'Yamanashi' },
          { value: '20', label: 'Nagano' },
          { value: '21', label: 'Gifu' },
          { value: '22', label: 'Shizuoka' },
          { value: '23', label: 'Aichi' },
          { value: '24', label: 'Mie' },
          { value: '25', label: 'Shiga' },
          { value: '26', label: 'Kyoto' },
          { value: '27', label: 'Osaka' },
          { value: '28', label: 'Hyogo' },
          { value: '29', label: 'Nara' },
          { value: '30', label: 'Wakayama' },
          { value: '31', label: 'Tottori' },
          { value: '32', label: 'Shimane' },
          { value: '33', label: 'Okayama' },
          { value: '34', label: 'Hiroshima' },
          { value: '35', label: 'Yamaguchi' },
          { value: '36', label: 'Tokushima' },
          { value: '37', label: 'Kagawa' },
          { value: '38', label: 'Ehime' },
          { value: '39', label: 'Kochi' },
          { value: '40', label: 'Fukuoka' },
          { value: '41', label: 'Saga' },
          { value: '42', label: 'Nagasaki' },
          { value: '43', label: 'Kumamoto' },
          { value: '44', label: 'Oita' },
          { value: '45', label: 'Miyazaki' },
          { value: '46', label: 'Kagoshima' },
          { value: '47', label: 'Okinawa' }
        ]
      },
      postal_code: {
        label: 'Postal Code',
        placeholder: '150-0002',
        pattern: /^\d{3}-?\d{4}$/,
        error: 'Enter a valid postal code (e.g., 150-0002)',
        transform: (value) => {
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
  },

  // ============================================================
  // ZIMBABWE
  // 10 provinces, no formal postal code system
  // ============================================================
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
  },

  // ============================================================
  // NIGERIA
  // 37 states (including FCT), 6-digit postal code optional
  // ============================================================
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
          { value: 'AK', label: 'Akwa Ibom' },
          { value: 'AN', label: 'Anambra' },
          { value: 'BA', label: 'Bauchi' },
          { value: 'BY', label: 'Bayelsa' },
          { value: 'BE', label: 'Benue' },
          { value: 'BO', label: 'Borno' },
          { value: 'CR', label: 'Cross River' },
          { value: 'DE', label: 'Delta' },
          { value: 'EB', label: 'Ebonyi' },
          { value: 'ED', label: 'Edo' },
          { value: 'EK', label: 'Ekiti' },
          { value: 'EN', label: 'Enugu' },
          { value: 'FC', label: 'Federal Capital Territory' },
          { value: 'GO', label: 'Gombe' },
          { value: 'IM', label: 'Imo' },
          { value: 'JI', label: 'Jigawa' },
          { value: 'KD', label: 'Kaduna' },
          { value: 'KN', label: 'Kano' },
          { value: 'KT', label: 'Katsina' },
          { value: 'KE', label: 'Kebbi' },
          { value: 'KO', label: 'Kogi' },
          { value: 'KW', label: 'Kwara' },
          { value: 'LA', label: 'Lagos' },
          { value: 'NA', label: 'Nasarawa' },
          { value: 'NI', label: 'Niger' },
          { value: 'OG', label: 'Ogun' },
          { value: 'ON', label: 'Ondo' },
          { value: 'OS', label: 'Osun' },
          { value: 'OY', label: 'Oyo' },
          { value: 'PL', label: 'Plateau' },
          { value: 'RI', label: 'Rivers' },
          { value: 'SO', label: 'Sokoto' },
          { value: 'TA', label: 'Taraba' },
          { value: 'YO', label: 'Yobe' },
          { value: 'ZA', label: 'Zamfara' }
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
  },

  // ============================================================
  // GERMANY
  // 5-digit postcode (PLZ), simple format
  // ============================================================
  'DE': {
    format: '%N%n%O%n%A%n%Z %C',
    required: ['address', 'city', 'postal_code'],
    optional: [],
    hasPostcode: true,
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,
    fields: {
      address: {
        label: 'Street Address',
        placeholder: 'Musterstrasse 123'
      },
      city: {
        label: 'City',
        placeholder: 'Berlin'
      },
      postal_code: {
        label: 'Postal Code',
        placeholder: '10115',
        pattern: /^\d{5}$/,
        error: 'Enter a valid 5-digit postal code'
      }
    },
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'postal_code', span: 4 }, { field: 'city', span: 8 }]
    ]
  },

  // ============================================================
  // CANADA
  // 13 provinces/territories, postal code format A1A 1A1
  // ============================================================
  'CA': {
    format: '%N%n%O%n%A%n%C %S %Z',
    required: ['address', 'city', 'state', 'postal_code'],
    optional: [],
    hasPostcode: true,
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,
    fields: {
      address: {
        label: 'Street Address',
        placeholder: '123 Main Street'
      },
      city: {
        label: 'City',
        placeholder: 'Toronto'
      },
      state: {
        label: 'Province',
        type: 'select',
        options: [
          { value: 'AB', label: 'Alberta' },
          { value: 'BC', label: 'British Columbia' },
          { value: 'MB', label: 'Manitoba' },
          { value: 'NB', label: 'New Brunswick' },
          { value: 'NL', label: 'Newfoundland and Labrador' },
          { value: 'NS', label: 'Nova Scotia' },
          { value: 'NT', label: 'Northwest Territories' },
          { value: 'NU', label: 'Nunavut' },
          { value: 'ON', label: 'Ontario' },
          { value: 'PE', label: 'Prince Edward Island' },
          { value: 'QC', label: 'Quebec' },
          { value: 'SK', label: 'Saskatchewan' },
          { value: 'YT', label: 'Yukon' }
        ]
      },
      postal_code: {
        label: 'Postal Code',
        placeholder: 'K1A 0A6',
        pattern: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i,
        error: 'Enter a valid Canadian postal code (e.g., K1A 0A6)',
        transform: (value) => value.toUpperCase()
      }
    },
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'state', span: 3 }, { field: 'postal_code', span: 3 }]
    ]
  },

  // ============================================================
  // HONG KONG
  // 3 areas, no postal code
  // ============================================================
  'HK': {
    format: '%N%n%O%n%A%n%C%n%S',
    required: ['address', 'city', 'state'],
    optional: [],
    hasPostcode: false,
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,
    fields: {
      address: {
        label: 'Street Address',
        placeholder: 'Flat A, 12/F, ABC Building, Street Name'
      },
      city: {
        label: 'District',
        placeholder: 'Central'
      },
      state: {
        label: 'Area',
        type: 'select',
        options: [
          { value: 'Hong Kong Island', label: 'Hong Kong Island' },
          { value: 'Kowloon', label: 'Kowloon' },
          { value: 'New Territories', label: 'New Territories' }
        ]
      }
    },
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 8 }, { field: 'state', span: 4 }]
    ]
  },

  // ============================================================
  // OTHER COUNTRIES (minimal configs - Google API provides details)
  // ============================================================

  'MU': {  // Mauritius
    format: '%N%n%O%n%A%n%C%n%Z',
    required: ['address', 'city'],
    optional: ['postal_code'],
    hasPostcode: true,
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,
    fields: {
      address: {
        label: 'Street Address',
        placeholder: '123 Royal Road'
      },
      city: {
        label: 'Town/City',
        placeholder: 'Port Louis'
      },
      postal_code: {
        label: 'Postal Code',
        placeholder: '11302',
        pattern: /^\d{5}$/,
        error: 'Enter a valid 5-digit postal code'
      }
    },
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },

  'CY': {  // Cyprus
    format: '%N%n%O%n%A%n%Z %C',
    required: ['address', 'city', 'postal_code'],
    optional: [],
    hasPostcode: true,
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,
    fields: {
      address: {
        label: 'Street Address',
        placeholder: '123 Makarios Avenue'
      },
      city: {
        label: 'City',
        placeholder: 'Nicosia'
      },
      postal_code: {
        label: 'Postal Code',
        placeholder: '1065',
        pattern: /^\d{4}$/,
        error: 'Enter a valid 4-digit postal code'
      }
    },
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'postal_code', span: 4 }, { field: 'city', span: 8 }]
    ]
  },

  'BM': {  // Bermuda
    format: '%N%n%O%n%A%n%C %Z',
    required: ['address', 'city'],
    optional: ['postal_code'],
    hasPostcode: true,
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,
    fields: {
      address: {
        label: 'Street Address',
        placeholder: '123 Front Street'
      },
      city: {
        label: 'Parish/City',
        placeholder: 'Hamilton'
      },
      postal_code: {
        label: 'Postal Code',
        placeholder: 'HM 12',
        pattern: /^[A-Z]{2}\s?\d{2}$/i,
        error: 'Enter a valid postal code (e.g., HM 12)',
        transform: (value) => value.toUpperCase()
      }
    },
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },

  'PL': {  // Poland
    format: '%N%n%O%n%A%n%Z %C',
    required: ['address', 'city', 'postal_code'],
    optional: [],
    hasPostcode: true,
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,
    fields: {
      address: {
        label: 'Street Address',
        placeholder: 'ul. Marszalkowska 123'
      },
      city: {
        label: 'City',
        placeholder: 'Warsaw'
      },
      postal_code: {
        label: 'Postal Code',
        placeholder: '00-001',
        pattern: /^\d{2}-\d{3}$/,
        error: 'Enter a valid postal code (e.g., 00-001)',
        transform: (value) => {
          const digits = value.replace(/\D/g, '');
          if (digits.length === 5) {
            return `${digits.slice(0, 2)}-${digits.slice(2)}`;
          }
          return value;
        }
      }
    },
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'postal_code', span: 4 }, { field: 'city', span: 8 }]
    ]
  },

  'MT': {  // Malta
    format: '%N%n%O%n%A%n%C %Z',
    required: ['address', 'city', 'postal_code'],
    optional: [],
    hasPostcode: true,
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,
    fields: {
      address: {
        label: 'Street Address',
        placeholder: '123 Republic Street'
      },
      city: {
        label: 'Town/City',
        placeholder: 'Valletta'
      },
      postal_code: {
        label: 'Postal Code',
        placeholder: 'VLT 1234',
        pattern: /^[A-Z]{3}\s?\d{4}$/i,
        error: 'Enter a valid postal code (e.g., VLT 1234)',
        transform: (value) => value.toUpperCase()
      }
    },
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },

  'TW': {  // Taiwan
    format: '%Z%n%S%C%n%A%n%O%n%N',
    required: ['address', 'city', 'postal_code'],
    optional: ['state'],
    hasPostcode: true,
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,
    fields: {
      address: {
        label: 'Street Address',
        placeholder: '123 Zhongxiao East Road'
      },
      city: {
        label: 'City/District',
        placeholder: 'Da\'an District'
      },
      state: {
        label: 'City/County',
        placeholder: 'Taipei City'
      },
      postal_code: {
        label: 'Postal Code',
        placeholder: '106',
        pattern: /^\d{3,5}$/,
        error: 'Enter a valid 3-5 digit postal code'
      }
    },
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'state', span: 6 }],
      [{ field: 'postal_code', span: 6 }]
    ]
  },

  // ============================================================
  // DEFAULT FALLBACK
  // ============================================================
  'DEFAULT': {
    format: '%N%n%O%n%A%n%C%n%S%n%Z',
    required: ['address', 'city'],
    optional: ['state', 'postal_code'],
    hasPostcode: true,
    addressLookupSupported: false,
    requiresPostcodeForLookup: false,
    fields: {
      address: {
        label: 'Street Address',
        placeholder: 'Enter street address'
      },
      city: {
        label: 'City',
        placeholder: 'Enter city'
      },
      state: {
        label: 'State/Province/Region',
        placeholder: 'Enter state/province'
      },
      postal_code: {
        label: 'Postal Code',
        placeholder: 'Enter postal code'
      }
    },
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'state', span: 6 }],
      [{ field: 'postal_code', span: 12 }]
    ]
  }
};

/**
 * Country name to ISO code mapping
 */
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
  'Nigeria': 'NG'
};
