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
} from './googleAddressMetadata.ts';

import {
  ADDRESS_METADATA,
  COUNTRY_CODE_MAPPINGS
} from './addressMetadataConfig.ts';

import type { AddressMetadata, AddressValidationResult } from '../types/address';

// Re-export ADDRESS_METADATA for backward compatibility
export { ADDRESS_METADATA };

/**
 * Get address metadata for a country (synchronous - uses fallback data)
 */
export const getAddressMetadata = (countryCode: string | null): AddressMetadata => {
  if (!countryCode) return ADDRESS_METADATA.DEFAULT;

  const metadata = ADDRESS_METADATA[countryCode.toUpperCase()];
  return metadata || ADDRESS_METADATA.DEFAULT;
};

/**
 * Fetch address metadata dynamically from Google libaddressinput API
 * Falls back to hardcoded metadata if Google API fails
 */
export const fetchAddressMetadata = async (countryCode: string | null): Promise<AddressMetadata> => {
  if (!countryCode) return ADDRESS_METADATA.DEFAULT;

  const upperCountryCode = countryCode.toUpperCase();

  try {
    const googleData = await fetchGoogleAddressMetadata(upperCountryCode);

    if (googleData) {
      const transformed = transformGoogleMetadata(googleData, upperCountryCode);

      const customConfig = ADDRESS_METADATA[upperCountryCode];
      if (customConfig) {
        const mergedFields = {
          ...transformed.fields,
          ...customConfig.fields
        };

        const useLayout = customConfig.layout || transformed.layout;

        const { fields: _fields, layout: _layout, ...customConfigRest } = customConfig;

        return {
          ...transformed,
          ...customConfigRest,
          fields: mergedFields,
          layout: useLayout
        };
      }

      return transformed;
    }
  } catch (error) {
    console.warn(`Failed to fetch Google metadata for ${upperCountryCode}, falling back to hardcoded data:`, error);
  }

  return ADDRESS_METADATA[upperCountryCode] || ADDRESS_METADATA.DEFAULT;
};

/**
 * Validate address field based on country rules
 */
export const validateAddressField = (countryCode: string, fieldName: string, value: string): AddressValidationResult => {
  const metadata = getAddressMetadata(countryCode);
  const fieldConfig = metadata.fields[fieldName];

  if (!fieldConfig) {
    return { isValid: true, error: null };
  }

  if (metadata.required.includes(fieldName) && (!value || value.trim() === '')) {
    return { isValid: false, error: `${fieldConfig.label} is required` };
  }

  if (value && fieldConfig.pattern && !fieldConfig.pattern.test(value)) {
    return { isValid: false, error: fieldConfig.error || `Invalid ${fieldConfig.label}` };
  }

  return { isValid: true, error: null };
};

/**
 * Transform field value according to country rules
 */
export const transformFieldValue = (countryCode: string, fieldName: string, value: string): string => {
  const metadata = getAddressMetadata(countryCode);
  const fieldConfig = metadata.fields[fieldName];

  if (fieldConfig && fieldConfig.transform && typeof fieldConfig.transform === 'function') {
    return fieldConfig.transform(value);
  }

  return value;
};

/**
 * Get optional fields for a country
 */
export const getOptionalFields = (countryCode: string): string[] => {
  const metadata = getAddressMetadata(countryCode);
  return metadata.optional || [];
};

/**
 * Get all fields (required + optional) for a country
 */
export const getAllFields = (countryCode: string): string[] => {
  const metadata = getAddressMetadata(countryCode);
  const required = metadata.required || [];
  const optional = metadata.optional || [];
  return [...required, ...optional];
};

/**
 * Check if a field is optional for a country
 */
export const isOptionalField = (countryCode: string, fieldName: string): boolean => {
  const optional = getOptionalFields(countryCode);
  return optional.includes(fieldName);
};

/**
 * Check if a field is required for a country
 */
export const isRequiredField = (countryCode: string, fieldName: string): boolean => {
  const metadata = getAddressMetadata(countryCode);
  return metadata.required.includes(fieldName);
};

/**
 * Get country code from country name
 */
export const getCountryCode = (countryName: string): string | null => {
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
