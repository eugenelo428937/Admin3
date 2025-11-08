/**
 * Tests for Address Metadata Service
 * Tests integration of Google dynamic metadata with custom configs
 */

import addressMetadataService, {
  getAddressMetadata,
  fetchAddressMetadata,
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
    it('should fetch from Google API and return transformed data', async () => {
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

      // Check that Google data is returned
      expect(result.format).toBe('%N%n%O%n%A%n%C%n%Z');
      expect(result.required).toEqual(['address', 'city', 'postal_code']);
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
        }
      };

      fetchGoogleAddressMetadata.mockResolvedValue(mockGoogleData);
      transformGoogleMetadata.mockReturnValue(mockTransformed);

      const result = await fetchAddressMetadata('US');

      // Custom US config should override Google's state field
      expect(result.fields.state.type).toBe('select');
      expect(result.fields.state.options).toBeDefined();
      expect(result.fields.state.options.length).toBeGreaterThan(0);
      expect(result.layout).toBeDefined();
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

    it('should return Google data for countries without custom config', async () => {
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

      // Should return pure Google data since DE has no custom config
      expect(result.fields.address.label).toBe('Straße');
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
    });
  });
});
