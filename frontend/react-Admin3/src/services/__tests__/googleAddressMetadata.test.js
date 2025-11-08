/**
 * Tests for Google Address Metadata Service
 * Tests dynamic fetching from Google's libaddressinput API
 */

import {
  fetchGoogleAddressMetadata,
  parseGoogleFormat,
  parseGoogleRequiredFields,
  transformGoogleMetadata,
  clearMetadataCache
} from '../googleAddressMetadata';

// Mock fetch globally
global.fetch = jest.fn();

describe('Google Address Metadata Service', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearMetadataCache();
    // Reset fetch mock
    fetch.mockReset();
  });

  describe('fetchGoogleAddressMetadata', () => {
    it('should fetch metadata from Google API', async () => {
      const mockResponse = {
        fmt: '%N%n%O%n%A%n%C %S %Z',
        require: 'ACZ',
        upper: 'CS',
        zip: '^\\d{5}$',
        zip_name_type: 'zip',
        state_name_type: 'state',
        locality_name_type: 'city'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await fetchGoogleAddressMetadata('US');

      expect(fetch).toHaveBeenCalledWith('https://chromium-i18n.appspot.com/ssl-address/data/US');
      expect(result).toEqual(mockResponse);
    });

    it('should cache fetched metadata', async () => {
      const mockResponse = { fmt: '%N%n%A%n%C' };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      // First call
      await fetchGoogleAddressMetadata('GB');
      // Second call (should use cache)
      await fetchGoogleAddressMetadata('GB');

      // Fetch should only be called once
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should return null if country code is missing', async () => {
      const result = await fetchGoogleAddressMetadata('');
      expect(result).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should return null on API error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const result = await fetchGoogleAddressMetadata('XX');
      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchGoogleAddressMetadata('US');
      expect(result).toBeNull();
    });

    it('should convert country code to uppercase', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ fmt: '%A' })
      });

      await fetchGoogleAddressMetadata('gb');

      expect(fetch).toHaveBeenCalledWith('https://chromium-i18n.appspot.com/ssl-address/data/GB');
    });
  });

  describe('parseGoogleFormat', () => {
    it('should parse standard US format', () => {
      const format = '%N%n%O%n%A%n%C, %S %Z';
      const result = parseGoogleFormat(format);

      expect(result).toEqual(['name', 'organization', 'address', 'city', 'state', 'postal_code']);
    });

    it('should parse UK format with dependent locality', () => {
      const format = '%N%n%O%n%A%n%D%n%C%n%Z';
      const result = parseGoogleFormat(format);

      expect(result).toEqual(['name', 'organization', 'address', 'dependent_locality', 'city', 'postal_code']);
    });

    it('should remove duplicate fields', () => {
      const format = '%A%n%A%n%C';
      const result = parseGoogleFormat(format);

      expect(result).toEqual(['address', 'city']);
    });

    it('should handle empty format', () => {
      expect(parseGoogleFormat('')).toEqual([]);
      expect(parseGoogleFormat(null)).toEqual([]);
    });

    it('should ignore newline markers (%n)', () => {
      const format = '%A%n%C';
      const result = parseGoogleFormat(format);

      expect(result).toEqual(['address', 'city']);
    });
  });

  describe('parseGoogleRequiredFields', () => {
    it('should parse US required fields', () => {
      const result = parseGoogleRequiredFields('ACZ');
      expect(result).toEqual(['address', 'city', 'postal_code']);
    });

    it('should parse UK required fields', () => {
      const result = parseGoogleRequiredFields('ACD');
      expect(result).toEqual(['address', 'city', 'dependent_locality']);
    });

    it('should handle empty require string', () => {
      expect(parseGoogleRequiredFields('')).toEqual([]);
      expect(parseGoogleRequiredFields(null)).toEqual([]);
    });

    it('should remove duplicates', () => {
      const result = parseGoogleRequiredFields('AAC');
      expect(result).toEqual(['address', 'city']);
    });

    it('should ignore unknown field codes', () => {
      const result = parseGoogleRequiredFields('ACXY');
      expect(result).toEqual(['address', 'city', 'sorting_code']);
    });
  });

  describe('transformGoogleMetadata', () => {
    it('should transform US metadata correctly', () => {
      const googleData = {
        fmt: '%N%n%O%n%A%n%C, %S %Z',
        require: 'ACSZ',
        upper: 'CS',
        zip: '^\\d{5}([-\\s]?\\d{4})?$',
        zip_name_type: 'zip',
        state_name_type: 'state',
        locality_name_type: 'city'
      };

      const result = transformGoogleMetadata(googleData, 'US');

      expect(result).toMatchObject({
        format: '%N%n%O%n%A%n%C, %S %Z',
        required: ['address', 'city', 'state', 'postal_code'],
        hasPostcode: true
      });

      expect(result.fields.postal_code).toMatchObject({
        label: 'zip',
        error: 'Enter a valid zip'
      });

      expect(result.fields.postal_code.pattern).toBeInstanceOf(RegExp);
    });

    it('should transform UK metadata correctly', () => {
      const googleData = {
        fmt: '%N%n%O%n%A%n%C%n%Z',
        require: 'ACZ',
        zip: '^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$',
        zip_name_type: 'postcode',
        locality_name_type: 'town'
      };

      const result = transformGoogleMetadata(googleData, 'GB');

      expect(result.required).toEqual(['address', 'city', 'postal_code']);
      expect(result.fields.postal_code.label).toBe('postcode');
      expect(result.fields.city.label).toBe('town');
    });

    it('should handle country without postcode (HK)', () => {
      const googleData = {
        fmt: '%N%n%O%n%A%n%C%n%S',
        require: 'ACS',
        state_name_type: 'area'
      };

      const result = transformGoogleMetadata(googleData, 'HK');

      expect(result.hasPostcode).toBe(false);
      expect(result.required).toEqual(['address', 'city', 'state']);
    });

    it('should return null for null input', () => {
      expect(transformGoogleMetadata(null, 'US')).toBeNull();
    });

    it('should generate layout with correct structure', () => {
      const googleData = {
        fmt: '%A%n%C %S %Z',
        require: 'ACSZ'
      };

      const result = transformGoogleMetadata(googleData, 'US');

      expect(result.layout).toEqual([
        [{ field: 'address', span: 12 }],
        [
          { field: 'city', span: 6 },
          { field: 'state', span: 3 },
          { field: 'postal_code', span: 3 }
        ]
      ]);
    });

    it('should mark optional fields correctly', () => {
      const googleData = {
        fmt: '%A%n%C%n%S%n%Z',
        require: 'AZ'  // Only address and postal_code required
      };

      const result = transformGoogleMetadata(googleData, 'US');

      expect(result.required).toEqual(['address', 'postal_code']);
      expect(result.optional).toEqual(['city', 'state']);
    });
  });

  describe('clearMetadataCache', () => {
    it('should clear the cache', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ fmt: '%A' })
      });

      // Fetch to populate cache
      await fetchGoogleAddressMetadata('US');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Clear cache
      clearMetadataCache();

      // Fetch again should call API
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ fmt: '%A' })
      });

      await fetchGoogleAddressMetadata('US');
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });
});
