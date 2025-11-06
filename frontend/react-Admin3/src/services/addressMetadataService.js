/**
 * Address Metadata Service
 * Based on Google libaddressinput Address Validation Metadata
 * https://github.com/google/libaddressinput/wiki/AddressValidationMetadata
 */

// Address format field mappings
export const FIELD_MAPPINGS = {
  '%A': 'address',        // Street Address
  '%C': 'city',          // City/Locality
  '%S': 'state',         // State/Province/Region
  '%Z': 'postal_code',   // Postal Code/ZIP
  '%X': 'sorting_code'   // Sorting Code (rarely used)
};

// Reverse mapping for display
export const DISPLAY_NAMES = {
  address: 'Address',
  city: 'City',
  state: 'State/Province',
  postal_code: 'Postal Code',
  sorting_code: 'Sorting Code'
};

// Country-specific address metadata
export const ADDRESS_METADATA = {
  'US': {
    format: '%N%n%O%n%A%n%C, %S %Z',
    required: ['address', 'city', 'state', 'postal_code'],
    optional: [],
    hasPostcode: true,
    addressLookupSupported: false,
    requiresPostcodeForLookup: true,  // US requires postcode for lookup
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

  'GB': {
    format: '%N%n%O%n%A%n%C%n%Z',
    required: ['address', 'city', 'postal_code'],
    optional: ['county'],
    hasPostcode: true,
    addressLookupSupported: true,
    requiresPostcodeForLookup: true,  // UK requires postcode for lookup
    fields: {
      address: { label: 'Flat/Building/Street Address', placeholder: '123 High Street' },
      city: { label: 'Town/City', placeholder: 'London' },
      postal_code: { 
        label: 'Postcode', 
        placeholder: 'SW1A 1AA',
        pattern: /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$|^GIR\s?0AA$/i,
        error: 'Enter a valid UK postcode (e.g., SW1A 1AA)',
        transform: (value) => value.toUpperCase()
      },
      county: { label: 'County', placeholder: 'Greater London' }
    },
    layout: [
      [{ field: 'address', span: 12 }],
      [{ field: 'city', span: 2 }, { field: 'postal_code', span: 2 }],
      [{ field: 'county', span: 6 }]
    ]
  },

  'HK': {
    format: '%N%n%O%n%A%n%C%n%S',
    required: ['address', 'city', 'state'],
    optional: [],
    hasPostcode: false,  // Hong Kong doesn't use postal codes
    addressLookupSupported: true,  // Postcoder supports lookup by street/building name
    requiresPostcodeForLookup: false,  // Can search without postcode
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

  'CA': {
    format: '%N%n%O%n%A%n%C %S %Z',
    required: ['address', 'city', 'state', 'postal_code'],
    optional: [],
    hasPostcode: true,
    addressLookupSupported: false,
    requiresPostcodeForLookup: true,  // Canada requires postcode for lookup
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

  // Default/fallback format for countries not specifically defined
  'DEFAULT': {
    format: '%N%n%O%n%A%n%C%n%S%n%Z',
    required: ['address', 'city'],
    optional: ['state', 'postal_code'],
    hasPostcode: true,
    addressLookupSupported: false,
    requiresPostcodeForLookup: true,  // Default: require postcode for lookup
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
 * Get address metadata for a country
 * @param {string} countryCode - ISO country code (e.g., 'US', 'GB')
 * @returns {object} Address metadata including format, fields, and validation
 */
export const getAddressMetadata = (countryCode) => {
  if (!countryCode) return ADDRESS_METADATA.DEFAULT;
  
  const metadata = ADDRESS_METADATA[countryCode.toUpperCase()];
  return metadata || ADDRESS_METADATA.DEFAULT;
};

/**
 * Parse format string to get field order
 * @param {string} format - Address format string (e.g., '%N%n%O%n%A%n%C, %S %Z')
 * @returns {array} Array of field names in display order
 */
export const parseFormatFields = (format) => {
  const fields = [];
  const matches = format.match(/%[A-Z]/g) || [];
  
  matches.forEach(match => {
    const fieldName = FIELD_MAPPINGS[match];
    if (fieldName && !fields.includes(fieldName)) {
      fields.push(fieldName);
    }
  });
  
  return fields;
};

/**
 * Validate address field based on country rules
 * @param {string} countryCode - ISO country code
 * @param {string} fieldName - Field to validate
 * @param {string} value - Field value
 * @returns {object} Validation result { isValid, error }
 */
export const validateAddressField = (countryCode, fieldName, value) => {
  const metadata = getAddressMetadata(countryCode);
  const fieldConfig = metadata.fields[fieldName];
  
  if (!fieldConfig) {
    return { isValid: true, error: null };
  }
  
  // Check if field is required
  if (metadata.required.includes(fieldName) && (!value || value.trim() === '')) {
    return { isValid: false, error: `${fieldConfig.label} is required` };
  }
  
  // Pattern validation
  if (value && fieldConfig.pattern && !fieldConfig.pattern.test(value)) {
    return { isValid: false, error: fieldConfig.error || `Invalid ${fieldConfig.label}` };
  }
  
  return { isValid: true, error: null };
};

/**
 * Transform field value according to country rules
 * @param {string} countryCode - ISO country code
 * @param {string} fieldName - Field name
 * @param {string} value - Field value
 * @returns {string} Transformed value
 */
export const transformFieldValue = (countryCode, fieldName, value) => {
  const metadata = getAddressMetadata(countryCode);
  const fieldConfig = metadata.fields[fieldName];
  
  if (fieldConfig && fieldConfig.transform && typeof fieldConfig.transform === 'function') {
    return fieldConfig.transform(value);
  }
  
  return value;
};

/**
 * Get optional fields for a country
 * @param {string} countryCode - ISO country code
 * @returns {array} Array of optional field names
 */
export const getOptionalFields = (countryCode) => {
  const metadata = getAddressMetadata(countryCode);
  return metadata.optional || [];
};

/**
 * Get all fields (required + optional) for a country
 * @param {string} countryCode - ISO country code
 * @returns {array} Array of all field names
 */
export const getAllFields = (countryCode) => {
  const metadata = getAddressMetadata(countryCode);
  const required = metadata.required || [];
  const optional = metadata.optional || [];
  return [...required, ...optional];
};

/**
 * Check if a field is optional for a country
 * @param {string} countryCode - ISO country code
 * @param {string} fieldName - Field name to check
 * @returns {boolean} True if field is optional
 */
export const isOptionalField = (countryCode, fieldName) => {
  const optional = getOptionalFields(countryCode);
  return optional.includes(fieldName);
};

/**
 * Check if a field is required for a country
 * @param {string} countryCode - ISO country code
 * @param {string} fieldName - Field name to check
 * @returns {boolean} True if field is required
 */
export const isRequiredField = (countryCode, fieldName) => {
  const metadata = getAddressMetadata(countryCode);
  return metadata.required.includes(fieldName);
};

/**
 * Get country code from country name
 * @param {string} countryName - Full country name
 * @returns {string} ISO country code
 */
export const getCountryCode = (countryName) => {
  const countryMappings = {
    'United States': 'US',
    'United Kingdom': 'GB',
    'Hong Kong': 'HK',
    'Canada': 'CA',
    'Australia': 'AU',
    'Germany': 'DE',
    'France': 'FR',
    'Japan': 'JP',
    'South Korea': 'KR',
    'Singapore': 'SG',
    'India': 'IN',
    'China': 'CN',
    'South Africa': 'ZA'
  };
  
  return countryMappings[countryName] || null;
};

export default {
  getAddressMetadata,
  parseFormatFields,
  validateAddressField,
  transformFieldValue,
  getCountryCode,
  getOptionalFields,
  getAllFields,
  isOptionalField,
  isRequiredField,
  ADDRESS_METADATA,
  FIELD_MAPPINGS,
  DISPLAY_NAMES
};