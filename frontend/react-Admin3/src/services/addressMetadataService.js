/**
 * Address Metadata Service
 * Based on Google libaddressinput Address Validation Metadata
 * https://github.com/google/libaddressinput/wiki/AddressValidationMetadata
 *
 * ARCHITECTURE:
 * - Synchronous getAddressMetadata(): Returns minimal fallback metadata
 * - Async fetchAddressMetadata(): Fetches from Google API dynamically
 * - Postcoder API supports all countries in ADDRESS_METADATA config
 *
 * POSTCODE HANDLING RULES:
 * - UK (GB): Use separate 'postcode' parameter in API call
 * - All other countries with postcode: Append to 'query' parameter
 * - Countries without postcode: Use search text in 'query' parameter only
 */

import {
  fetchGoogleAddressMetadata,
  transformGoogleMetadata
} from './googleAddressMetadata';

import {
  ADDRESS_METADATA,
  COUNTRY_CODE_MAPPINGS
} from './addressMetadataConfig';

// Re-export ADDRESS_METADATA for backward compatibility
export { ADDRESS_METADATA };

/**
 * Get address metadata for a country (synchronous - uses fallback data)
 * @param {string} countryCode - ISO country code (e.g., 'US', 'GB')
 * @returns {object} Address metadata including format, fields, and validation
 * @note For dynamic Google API data, use fetchAddressMetadata() instead
 */
export const getAddressMetadata = (countryCode) => {
  if (!countryCode) return ADDRESS_METADATA.DEFAULT;

  const metadata = ADDRESS_METADATA[countryCode.toUpperCase()];
  return metadata || ADDRESS_METADATA.DEFAULT;
};

/**
 * Fetch address metadata dynamically from Google libaddressinput API
 * Falls back to hardcoded metadata if Google API fails
 *
 * @param {string} countryCode - ISO country code (e.g., 'US', 'GB')
 * @returns {Promise<object>} Address metadata including format, fields, and validation
 */
export const fetchAddressMetadata = async (countryCode) => {
  if (!countryCode) return ADDRESS_METADATA.DEFAULT;

  const upperCountryCode = countryCode.toUpperCase();

  try {
    // Try to fetch from Google API first
    const googleData = await fetchGoogleAddressMetadata(upperCountryCode);

    if (googleData) {
      // Transform Google data to our format
      const transformed = transformGoogleMetadata(googleData, upperCountryCode);

      // If we have a custom config, merge it with Google data
      const customConfig = ADDRESS_METADATA[upperCountryCode];
      if (customConfig) {
        // Merge ALL custom config properties (addressLookupSupported, etc.) with Google data
        return {
          ...transformed,           // Google data as base
          ...customConfig,          // ALL custom config properties override Google data
          fields: {
            ...transformed.fields,  // Google field configs
            ...customConfig.fields  // Custom field configs override (e.g., US state dropdown)
          },
          layout: customConfig.layout || transformed.layout
        };
      }

      return transformed;
    }
  } catch (error) {
    console.warn(`Failed to fetch Google metadata for ${upperCountryCode}, falling back to hardcoded data:`, error);
  }

  // Fallback to hardcoded metadata
  return ADDRESS_METADATA[upperCountryCode] || ADDRESS_METADATA.DEFAULT;
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
  return COUNTRY_CODE_MAPPINGS[countryName] || null;
};

export default {
  getAddressMetadata,
  fetchAddressMetadata,
  validateAddressField,
  transformFieldValue,
  getCountryCode,
  getOptionalFields,
  getAllFields,
  isOptionalField,
  isRequiredField,
  ADDRESS_METADATA
};
