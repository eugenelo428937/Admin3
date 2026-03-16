/**
 * Google libaddressinput Dynamic Metadata Fetcher
 *
 * Fetches and caches address metadata from Google's libaddressinput service:
 * https://chromium-i18n.appspot.com/ssl-address/data/
 *
 * This provides address formats, required fields, and validation patterns for all countries.
 */

import type {
  GoogleAddressData,
  AddressMetadata,
  AddressFieldConfig,
  LayoutRow,
} from '../types/address/address.types';

// Google's address metadata API base URL
const GOOGLE_ADDRESS_DATA_URL = 'https://chromium-i18n.appspot.com/ssl-address/data';

// Cache for fetched metadata (in-memory)
const metadataCache: Map<string, GoogleAddressData> = new Map();

// Field type mappings from Google's format to our format
const GOOGLE_FIELD_MAPPINGS: Record<string, string> = {
  'A': 'address',      // Street Address
  'C': 'city',         // City/Locality
  'S': 'state',        // State/Province/Region
  'Z': 'postal_code',  // Postal Code/ZIP
  'X': 'sorting_code', // Sorting Code
  'D': 'dependent_locality', // Dependent locality (UK)
  'O': 'organization', // Organization
  'N': 'name'          // Name
};

/**
 * Fetch address metadata for a country from Google's API
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB')
 * @returns Address metadata or null if fetch fails
 */
export const fetchGoogleAddressMetadata = async (countryCode: string): Promise<GoogleAddressData | null> => {
  if (!countryCode) return null;

  const upperCountryCode = countryCode.toUpperCase();

  // Check cache first
  if (metadataCache.has(upperCountryCode)) {
    return metadataCache.get(upperCountryCode)!;
  }

  try {
    const url = `${GOOGLE_ADDRESS_DATA_URL}/${upperCountryCode}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Failed to fetch address metadata for ${upperCountryCode}: ${response.status}`);
      return null;
    }

    const data: GoogleAddressData = await response.json();

    // Cache the result
    metadataCache.set(upperCountryCode, data);

    return data;
  } catch (error) {
    console.error(`Error fetching address metadata for ${upperCountryCode}:`, error);
    return null;
  }
};

/**
 * Parse Google's format string to extract field order
 *
 * Google format example: "%N%n%O%n%A%n%C %S %Z"
 * %N = Name, %O = Organization, %A = Address, %C = City, %S = State, %Z = Zip
 * %n = Newline
 *
 * @param format - Google's format string
 * @returns Array of field names in display order
 */
export const parseGoogleFormat = (format: string): string[] => {
  if (!format) return [];

  const fields: string[] = [];
  const matches = format.match(/%[A-Z]/g) || [];

  matches.forEach(match => {
    const fieldKey = match.substring(1); // Remove '%'
    const fieldName = GOOGLE_FIELD_MAPPINGS[fieldKey];

    if (fieldName && !fields.includes(fieldName)) {
      fields.push(fieldName);
    }
  });

  return fields;
};

/**
 * Parse Google's "require" string to extract required fields
 *
 * Google format example: "ACZ" means Address, City, Zip are required
 *
 * @param requireString - Google's require string (e.g., "ACZ")
 * @returns Array of required field names
 */
export const parseGoogleRequiredFields = (requireString: string): string[] => {
  if (!requireString) return [];

  const required: string[] = [];

  for (let i = 0; i < requireString.length; i++) {
    const fieldKey = requireString[i];
    const fieldName = GOOGLE_FIELD_MAPPINGS[fieldKey];

    if (fieldName && !required.includes(fieldName)) {
      required.push(fieldName);
    }
  }

  return required;
};

/**
 * Transform Google's address metadata to our internal format
 *
 * @param googleData - Raw data from Google's API
 * @param countryCode - ISO country code
 * @returns Transformed metadata in our format
 */
export const transformGoogleMetadata = (googleData: GoogleAddressData, countryCode: string): AddressMetadata | null => {
  if (!googleData) return null;

  const format = googleData.fmt || '';
  const requireString = googleData.require || '';
  const upperString = googleData.upper || '';

  // Parse fields
  const fields = parseGoogleFormat(format);
  const required = parseGoogleRequiredFields(requireString);
  const optional = fields.filter(f => !required.includes(f));

  // Determine if country has postcode
  const hasPostcode = fields.includes('postal_code');

  // Build field configurations
  const fieldConfigs: Record<string, AddressFieldConfig> = {};

  fields.forEach(fieldName => {
    const fieldConfig: AddressFieldConfig = {
      label: getFieldLabel(fieldName, googleData),
      placeholder: getFieldPlaceholder(fieldName, googleData)
    };

    // Add uppercase transform if specified by Google
    if (upperString.includes(getGoogleFieldKey(fieldName))) {
      fieldConfig.transform = (value: string): string => value.toUpperCase();
    }

    // Add postcode pattern if available
    if (fieldName === 'postal_code' && googleData.zip) {
      fieldConfig.pattern = new RegExp(googleData.zip);
      fieldConfig.error = `Enter a valid ${googleData.zip_name_type || 'postal code'}`;
    }

    fieldConfigs[fieldName] = fieldConfig;
  });

  // Generate layout (simple 2-column layout)
  const layout = generateLayout(fields, hasPostcode);

  return {
    format: format,
    required: required,
    optional: optional,
    hasPostcode: hasPostcode,
    fields: fieldConfigs,
    layout: layout,
    // These will be merged from our custom metadata:
    addressLookupSupported: false,
    requiresPostcodeForLookup: true
  };
};

/**
 * Get field label from Google's data
 */
const getFieldLabel = (fieldName: string, googleData: GoogleAddressData): string => {
  const labelMap: Record<string, string> = {
    'address': googleData.locality_name_type === 'district' ? 'Street Address' : 'Address',
    'city': googleData.locality_name_type || 'City',
    'state': googleData.state_name_type || 'State',
    'postal_code': googleData.zip_name_type || 'Postal Code',
    'sorting_code': 'Sorting Code',
    'dependent_locality': googleData.sublocality_name_type || 'Suburb',
    'organization': 'Organization',
    'name': 'Name'
  };

  return labelMap[fieldName] || fieldName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Get field placeholder from Google's data
 */
const getFieldPlaceholder = (fieldName: string, googleData: GoogleAddressData): string => {
  // Use example data if available
  if (googleData.zipex) {
    if (fieldName === 'postal_code') {
      return googleData.zipex.split(',')[0]; // First example
    }
  }

  // Default placeholders
  const placeholderMap: Record<string, string> = {
    'address': 'Enter street address',
    'city': 'Enter city',
    'state': 'Enter state/province',
    'postal_code': 'Enter postal code',
    'sorting_code': 'Enter sorting code',
    'dependent_locality': 'Enter suburb/district',
    'organization': 'Enter organization',
    'name': 'Enter name'
  };

  return placeholderMap[fieldName] || '';
};

/**
 * Get Google field key from our field name
 */
const getGoogleFieldKey = (fieldName: string): string => {
  for (const [key, value] of Object.entries(GOOGLE_FIELD_MAPPINGS)) {
    if (value === fieldName) return key;
  }
  return '';
};

/**
 * Generate simple layout from fields
 */
const generateLayout = (fields: string[], hasPostcode: boolean): LayoutRow[] => {
  const layout: LayoutRow[] = [];

  // Address always full width
  if (fields.includes('address')) {
    layout.push([{ field: 'address', span: 12 }]);
  }

  // City, State, Postal Code on same row if all present
  const row2: LayoutRow = [];
  if (fields.includes('city')) row2.push({ field: 'city', span: 6 });
  if (fields.includes('state')) row2.push({ field: 'state', span: 3 });
  if (fields.includes('postal_code')) row2.push({ field: 'postal_code', span: 3 });
  if (row2.length > 0) layout.push(row2);

  // Additional fields
  if (fields.includes('dependent_locality')) {
    layout.push([{ field: 'dependent_locality', span: 12 }]);
  }

  return layout;
};

/**
 * Clear metadata cache
 */
export const clearMetadataCache = (): void => {
  metadataCache.clear();
};

export default {
  fetchGoogleAddressMetadata,
  parseGoogleFormat,
  parseGoogleRequiredFields,
  transformGoogleMetadata,
  clearMetadataCache
};
