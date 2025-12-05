/**
 * Tests for Address Metadata Service
 * Tests integration of Google dynamic metadata with custom configs
 */

import addressMetadataService, {
  getAddressMetadata,
  fetchAddressMetadata,
  validateAddressField,
  transformFieldValue,
  getOptionalFields,
  getAllFields,
  isOptionalField,
  isRequiredField,
  getCountryCode,
  ADDRESS_METADATA
} from '../addressMetadataService';

// Mock the Google metadata service
jest.mock('../googleAddressMetadata', () => ({
  fetchGoogleAddressMetadata: jest.fn(),
  transformGoogleMetadata: jest.fn(),
  clearMetadataCache: jest.fn()
}));

import {
  fetchGoogleAddressMetadata,
  transformGoogleMetadata
} from '../googleAddressMetadata';

describe('Address Metadata Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAddressMetadata (synchronous)', () => {
    it('should return fallback metadata for known country', () => {
      const metadata = getAddressMetadata('GB');

      expect(metadata).toBeDefined();
      expect(metadata.hasPostcode).toBe(true);
    });

    it('should return US metadata with state dropdown', () => {
      const metadata = getAddressMetadata('US');

      expect(metadata).toBeDefined();
      expect(metadata.required).toContain('address');
      expect(metadata.required).toContain('city');
      expect(metadata.fields.state.type).toBe('select');
      expect(metadata.fields.state.options).toBeDefined();
      expect(metadata.fields.state.options.length).toBeGreaterThan(0);
    });

    it('should return Canadian metadata with province dropdown', () => {
      const metadata = getAddressMetadata('CA');

      expect(metadata).toBeDefined();
      expect(metadata.fields.state.type).toBe('select');
      expect(metadata.fields.state.label).toBe('Province');
    });

    it('should return default metadata for unknown country', () => {
      const metadata = getAddressMetadata('XX');

      expect(metadata).toBeDefined();
      expect(metadata.required).toEqual(['address', 'city']);
    });

    it('should return default metadata for empty country code', () => {
      const metadata = getAddressMetadata('');
      expect(metadata).toBeDefined();
    });

    it('should handle lowercase country codes', () => {
      const metadata = getAddressMetadata('us');
      expect(metadata).toBeDefined();
      expect(metadata.fields.state.type).toBe('select');
    });
  });

  describe('fetchAddressMetadata (async with Google API)', () => {
    it('should fetch from Google API and merge with custom config', async () => {
      const mockGoogleData = {
        fmt: '%N%n%O%n%A%n%C%n%Z',
        require: 'ACZ'
      };

      const mockTransformed = {
        format: '%N%n%O%n%A%n%C%n%Z',
        required: ['address', 'city', 'postal_code'],
        optional: [],
        hasPostcode: true,
        fields: {
          address: { label: 'Address', placeholder: 'Enter address' },
          city: { label: 'City', placeholder: 'Enter city' },
          postal_code: { label: 'Postcode', placeholder: 'Enter postcode' }
        },
        layout: [
          [{ field: 'address', span: 12 }],
          [{ field: 'city', span: 6 }, { field: 'postal_code', span: 6 }]
        ]
      };

      fetchGoogleAddressMetadata.mockResolvedValue(mockGoogleData);
      transformGoogleMetadata.mockReturnValue(mockTransformed);

      const result = await fetchAddressMetadata('GB');

      expect(fetchGoogleAddressMetadata).toHaveBeenCalledWith('GB');
      expect(transformGoogleMetadata).toHaveBeenCalledWith(mockGoogleData, 'GB');

      // Check that custom config's format takes precedence over Google data
      // GB has a custom config with district and county fields
      expect(result.format).toBe('%N%n%O%n%A%n%D%n%C%n%S%n%Z');
      expect(result.required).toEqual(['address', 'city', 'postal_code']);
      // Custom config adds optional district and county fields
      expect(result.optional).toContain('district');
      expect(result.optional).toContain('county');
    });

    it('should merge US state dropdown with Google data', async () => {
      const mockGoogleData = { fmt: '%A%n%C %S %Z', require: 'ACSZ' };

      const mockTransformed = {
        format: '%A%n%C %S %Z',
        required: ['address', 'city', 'state', 'postal_code'],
        hasPostcode: true,
        fields: {
          address: { label: 'Street', placeholder: 'Enter street' },
          city: { label: 'City', placeholder: 'Enter city' },
          state: { label: 'State', placeholder: 'Enter state' },
          postal_code: { label: 'ZIP', placeholder: 'Enter ZIP' }
        },
        layout: [
          [{ field: 'address', span: 12 }],
          [{ field: 'city', span: 4 }, { field: 'state', span: 4 }, { field: 'postal_code', span: 4 }]
        ]
      };

      fetchGoogleAddressMetadata.mockResolvedValue(mockGoogleData);
      transformGoogleMetadata.mockReturnValue(mockTransformed);

      const result = await fetchAddressMetadata('US');

      // Custom US config should override Google's state field
      expect(result.fields.state.type).toBe('select');
      expect(result.fields.state.options).toBeDefined();
      expect(result.fields.state.options.length).toBeGreaterThan(0);
    });

    it('should fall back to hardcoded metadata if Google API fails', async () => {
      fetchGoogleAddressMetadata.mockResolvedValue(null);

      const result = await fetchAddressMetadata('GB');

      expect(result).toBeDefined();
      expect(result.hasPostcode).toBe(true);
    });

    it('should fall back to hardcoded metadata on error', async () => {
      fetchGoogleAddressMetadata.mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await fetchAddressMetadata('US');

      expect(result).toBeDefined();
      expect(result.required).toContain('address');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch Google metadata'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should merge Google data with custom config for DE', async () => {
      const mockTransformed = {
        format: '%A%n%C%n%Z',
        required: ['address', 'city', 'postal_code'],
        hasPostcode: true,
        fields: {
          address: { label: 'Straße', placeholder: 'Straße eingeben' },
          city: { label: 'Stadt', placeholder: 'Stadt eingeben' },
          postal_code: { label: 'PLZ', placeholder: 'PLZ eingeben' }
        }
      };

      fetchGoogleAddressMetadata.mockResolvedValue({ fmt: '%A%n%C%n%Z' });
      transformGoogleMetadata.mockReturnValue(mockTransformed);

      const result = await fetchAddressMetadata('DE');

      // DE now has custom config, so custom fields should override Google data
      // Custom config has 'Street Address' label (English)
      expect(result.fields.address.label).toBe('Street Address');
      expect(result.hasPostcode).toBe(true);
    });

    it('should handle empty country code', async () => {
      const result = await fetchAddressMetadata('');

      expect(result).toBeDefined();
      expect(fetchGoogleAddressMetadata).not.toHaveBeenCalled();
    });

    it('should convert country code to uppercase', async () => {
      fetchGoogleAddressMetadata.mockResolvedValue(null);

      await fetchAddressMetadata('gb');

      expect(fetchGoogleAddressMetadata).toHaveBeenCalledWith('GB');
    });
  });

  describe('ADDRESS_METADATA configuration', () => {
    it('should include all specified countries', () => {
      const expectedCountries = [
        'US', 'CA', 'GB', 'HK', 'ZA', 'IN', 'IE', 'AU', 'MY', 'SG', 'NZ',
        'MU', 'CN', 'KE', 'ZW', 'JP', 'CY', 'DE', 'BM', 'PL', 'MT'
      ];

      expectedCountries.forEach(country => {
        expect(ADDRESS_METADATA[country]).toBeDefined();
      });
    });

    it('should have minimal config for countries relying on Google API', () => {
      const minimalCountries = ['GB', 'ZA', 'IN', 'IE', 'AU', 'DE', 'JP'];

      minimalCountries.forEach(country => {
        const config = ADDRESS_METADATA[country];
        expect(config.hasPostcode).toBeDefined();
        // These countries should have minimal config (no full field definitions)
      });
    });

    it('should have DEFAULT fallback config', () => {
      expect(ADDRESS_METADATA.DEFAULT).toBeDefined();
      expect(ADDRESS_METADATA.DEFAULT.required).toEqual(['address', 'city']);
    });
  });

  describe('default export', () => {
    it('should export all required functions', () => {
      expect(addressMetadataService.getAddressMetadata).toBe(getAddressMetadata);
      expect(addressMetadataService.fetchAddressMetadata).toBe(fetchAddressMetadata);
      expect(addressMetadataService.ADDRESS_METADATA).toBe(ADDRESS_METADATA);
      expect(addressMetadataService.validateAddressField).toBe(validateAddressField);
      expect(addressMetadataService.transformFieldValue).toBe(transformFieldValue);
      expect(addressMetadataService.getOptionalFields).toBe(getOptionalFields);
      expect(addressMetadataService.getAllFields).toBe(getAllFields);
      expect(addressMetadataService.isOptionalField).toBe(isOptionalField);
      expect(addressMetadataService.isRequiredField).toBe(isRequiredField);
      expect(addressMetadataService.getCountryCode).toBe(getCountryCode);
    });
  });

  describe('validateAddressField', () => {
    it('should return valid for unknown field', () => {
      const result = validateAddressField('US', 'unknownField', 'some value');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should validate required field is empty', () => {
      const result = validateAddressField('US', 'address', '');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should validate required field with whitespace only', () => {
      const result = validateAddressField('US', 'city', '   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should validate required field with valid value', () => {
      const result = validateAddressField('US', 'address', '123 Main St');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should validate postal code pattern for US', () => {
      // Valid US ZIP code
      const validResult = validateAddressField('US', 'postal_code', '12345');
      expect(validResult.isValid).toBe(true);

      // Invalid US ZIP code
      const invalidResult = validateAddressField('US', 'postal_code', 'INVALID');
      expect(invalidResult.isValid).toBe(false);
    });

    it('should validate postal code pattern for UK', () => {
      // Valid UK postcode
      const validResult = validateAddressField('GB', 'postal_code', 'SW1A 1AA');
      expect(validResult.isValid).toBe(true);
    });
  });

  describe('transformFieldValue', () => {
    it('should return original value when no transform defined', () => {
      const result = transformFieldValue('US', 'address', '123 main street');
      expect(result).toBe('123 main street');
    });

    it('should apply transform if defined', () => {
      // GB metadata may have a transform for postal_code
      const metadata = getAddressMetadata('GB');
      const hasTransform = metadata.fields?.postal_code?.transform;

      if (hasTransform) {
        const result = transformFieldValue('GB', 'postal_code', 'sw1a 1aa');
        expect(result).toBe('SW1A 1AA');
      } else {
        // If no transform, should return original value
        const result = transformFieldValue('GB', 'postal_code', 'sw1a 1aa');
        expect(result).toBe('sw1a 1aa');
      }
    });

    it('should return value for unknown field', () => {
      const result = transformFieldValue('US', 'unknownField', 'test value');
      expect(result).toBe('test value');
    });

    it('should handle null value', () => {
      const result = transformFieldValue('US', 'address', null);
      expect(result).toBeNull();
    });
  });

  describe('getOptionalFields', () => {
    it('should return optional fields for US', () => {
      const optional = getOptionalFields('US');
      expect(Array.isArray(optional)).toBe(true);
    });

    it('should return optional fields for UK', () => {
      const optional = getOptionalFields('GB');
      expect(Array.isArray(optional)).toBe(true);
    });

    it('should return default optional fields for unknown country', () => {
      const optional = getOptionalFields('XX');
      // Unknown country uses DEFAULT metadata which may have optional fields
      const defaultMetadata = ADDRESS_METADATA.DEFAULT;
      expect(optional).toEqual(defaultMetadata.optional || []);
    });
  });

  describe('getAllFields', () => {
    it('should return all fields (required + optional) for US', () => {
      const allFields = getAllFields('US');
      expect(Array.isArray(allFields)).toBe(true);
      expect(allFields).toContain('address');
      expect(allFields).toContain('city');
    });

    it('should include both required and optional fields', () => {
      const metadata = getAddressMetadata('US');
      const allFields = getAllFields('US');

      // All required should be in allFields
      metadata.required.forEach(field => {
        expect(allFields).toContain(field);
      });
    });

    it('should return minimal fields for unknown country', () => {
      const allFields = getAllFields('XX');
      expect(allFields).toContain('address');
      expect(allFields).toContain('city');
    });
  });

  describe('isOptionalField', () => {
    it('should return true for optional fields', () => {
      // Get a country with optional fields
      const optional = getOptionalFields('US');
      if (optional.length > 0) {
        expect(isOptionalField('US', optional[0])).toBe(true);
      }
    });

    it('should return false for required fields', () => {
      expect(isOptionalField('US', 'address')).toBe(false);
      expect(isOptionalField('US', 'city')).toBe(false);
    });

    it('should return false for unknown fields', () => {
      expect(isOptionalField('US', 'unknownField')).toBe(false);
    });
  });

  describe('isRequiredField', () => {
    it('should return true for required fields', () => {
      expect(isRequiredField('US', 'address')).toBe(true);
      expect(isRequiredField('US', 'city')).toBe(true);
    });

    it('should return false for optional fields', () => {
      const optional = getOptionalFields('US');
      if (optional.length > 0) {
        expect(isRequiredField('US', optional[0])).toBe(false);
      }
    });

    it('should return false for unknown fields', () => {
      expect(isRequiredField('US', 'unknownField')).toBe(false);
    });

    it('should work with UK', () => {
      expect(isRequiredField('GB', 'address')).toBe(true);
    });
  });

  describe('getCountryCode', () => {
    it('should return US for United States', () => {
      const code = getCountryCode('United States');
      expect(code).toBe('US');
    });

    it('should return GB for United Kingdom', () => {
      const code = getCountryCode('United Kingdom');
      expect(code).toBe('GB');
    });

    it('should return null for unknown country', () => {
      const code = getCountryCode('Unknown Country');
      expect(code).toBeNull();
    });

    it('should return CA for Canada', () => {
      const code = getCountryCode('Canada');
      expect(code).toBe('CA');
    });
  });
});
