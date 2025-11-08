/**
 * Address Metadata Configuration
 *
 * Minimal fallback configurations for countries.
 * Most metadata is fetched dynamically from Google's libaddressinput API.
 *
 * Custom configs are only needed for:
 * - Countries with dropdown options (US states, Canadian provinces)
 * - Fallback when Google API is unavailable
 */

// Country-specific address metadata (minimal fallback configs)
export const ADDRESS_METADATA = {
  'US': {
    // Custom config: US state dropdown
    format: '%N%n%O%n%A%n%C, %S %Z',
    required: ['address', 'city', 'state', 'postal_code'],
    optional: [],
    hasPostcode: true,
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode combined with query
    fields: {
      address: { label: 'Street Address', placeholder: '123 Main St' },
      city: { label: 'City', placeholder: 'New York' },
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

  'CA': {
    // Custom config: Canadian province dropdown
    format: '%N%n%O%n%A%n%C %S %Z',
    required: ['address', 'city', 'state', 'postal_code'],
    optional: [],
    hasPostcode: true,
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode combined with query
    fields: {
      address: { label: 'Street Address', placeholder: '123 Main Street' },
      city: { label: 'City', placeholder: 'Toronto' },
      state: {
        label: 'Province',
        type: 'select',
        options: [
          { value: 'ON', label: 'Ontario' },
          { value: 'QC', label: 'Quebec' },
          { value: 'BC', label: 'British Columbia' },
          { value: 'AB', label: 'Alberta' },
          { value: 'MB', label: 'Manitoba' },
          { value: 'SK', label: 'Saskatchewan' },
          { value: 'NS', label: 'Nova Scotia' },
          { value: 'NB', label: 'New Brunswick' },
          { value: 'NL', label: 'Newfoundland and Labrador' },
          { value: 'PE', label: 'Prince Edward Island' },
          { value: 'NT', label: 'Northwest Territories' },
          { value: 'NU', label: 'Nunavut' },
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

  'HK': {
    // Custom config: Hong Kong area dropdown
    format: '%N%n%O%n%A%n%C%n%S',
    required: ['address', 'city', 'state'],
    optional: [],
    hasPostcode: false,
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // No postcode in HK
    fields: {
      address: { label: 'Street Address', placeholder: 'Flat A, 12/F, ABC Building, Street Name' },
      city: { label: 'District', placeholder: 'Central' },
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

  // Minimal configs for other supported countries (Google API provides full metadata)
  // Note: These minimal configs are fallbacks. Google API provides detailed metadata at runtime.
  'GB': {
    hasPostcode: true,
    required: ['address', 'city', 'postal_code'],
    optional: [],
    addressLookupSupported: true,
    requiresPostcodeForLookup: true,  // UK uses separate postcode parameter
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },
  'ZA': {  // South Africa
    hasPostcode: true,
    required: ['address', 'city', 'postal_code'],
    optional: [],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode combined with query
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },
  'IN': {  // India
    hasPostcode: true,
    required: ['address', 'city', 'postal_code'],
    optional: [],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode combined with query
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },
  'IE': {  // Ireland
    hasPostcode: true,
    required: ['address', 'city'],
    optional: ['postal_code'],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode optional
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },
  'AU': {  // Australia
    hasPostcode: true,
    required: ['address', 'city', 'state', 'postal_code'],
    optional: [],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode combined with query
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 4 }, { field: 'state', span: 4 }, { field: 'postal_code', span: 4 }]
    ]
  },
  'MY': {  // Malaysia
    hasPostcode: true,
    required: ['address', 'city', 'postal_code'],
    optional: [],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode combined with query
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },
  'SG': {  // Singapore
    hasPostcode: true,
    required: ['address', 'postal_code'],
    optional: [],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode combined with query
    fields: {},
    layout: [
      [{ field: 'address', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },
  'NZ': {  // New Zealand
    hasPostcode: true,
    required: ['address', 'city', 'postal_code'],
    optional: [],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode combined with query
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },
  'MU': {  // Mauritius
    hasPostcode: true,
    required: ['address', 'city'],
    optional: ['postal_code'],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode optional
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },
  'CN': {  // China
    hasPostcode: true,
    required: ['address', 'city', 'postal_code'],
    optional: [],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode combined with query
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },
  'KE': {  // Kenya
    hasPostcode: true,
    required: ['address', 'city'],
    optional: ['postal_code'],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode optional
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },
  'ZW': {  // Zimbabwe
    hasPostcode: true,
    required: ['address', 'city'],
    optional: ['postal_code'],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode optional
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },
  'JP': {  // Japan
    hasPostcode: true,
    required: ['address', 'city', 'postal_code'],
    optional: [],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode combined with query
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },
  'CY': {  // Cyprus
    hasPostcode: true,
    required: ['address', 'city', 'postal_code'],
    optional: [],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode combined with query
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },
  'DE': {  // Germany
    hasPostcode: true,
    required: ['address', 'city', 'postal_code'],
    optional: [],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode combined with query
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },
  'BM': {  // Bermuda
    hasPostcode: true,
    required: ['address', 'city'],
    optional: ['postal_code'],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode optional
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },
  'PL': {  // Poland
    hasPostcode: true,
    required: ['address', 'city', 'postal_code'],
    optional: [],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode combined with query
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },
  'MT': {  // Malta
    hasPostcode: true,
    required: ['address', 'city', 'postal_code'],
    optional: [],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode combined with query
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },
  'TW': {  // Taiwan
    hasPostcode: true,
    required: ['address', 'city', 'postal_code'],
    optional: [],
    addressLookupSupported: true,
    requiresPostcodeForLookup: false,  // Postcode combined with query
    fields: {},
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
    ]
  },

  // Default/fallback format for countries not specifically defined
  'DEFAULT': {
    format: '%N%n%O%n%A%n%C%n%S%n%Z',
    required: ['address', 'city'],
    optional: ['state', 'postal_code'],
    hasPostcode: true,
    fields: {
      address: { label: 'Street Address', placeholder: 'Enter street address' },
      city: { label: 'City', placeholder: 'Enter city' },
      state: { label: 'State/Province/Region', placeholder: 'Enter state/province' },
      postal_code: { label: 'Postal Code', placeholder: 'Enter postal code' }
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
  'Malta': 'MT'
};
