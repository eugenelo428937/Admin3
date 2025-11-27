/**
 * Tests for phoneValidationService
 *
 * Comprehensive tests for phone validation including:
 * - validatePhoneNumber: Validate phone with country code
 * - validateInternationalPhoneNumber: Validate international format
 * - formatPhoneNumber: Format phone in various formats
 * - getCountryCallingCode: Get country calling code
 * - getCountryCodeFromName: Get ISO code from country name (async)
 * - getCountryName: Get country name from ISO code (async)
 * - detectCountryFromPhoneNumber: Detect country from phone
 * - fetchCountries: Fetch countries list (async)
 * - getValidationErrorMessage: Get validation error (async)
 */

import phoneValidationService from '../phoneValidationService';

// Mock global fetch
global.fetch = jest.fn();

describe('PhoneValidationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache between tests
    phoneValidationService.countriesCache = null;
    phoneValidationService.countriesFetchPromise = null;
  });

  describe('validatePhoneNumber', () => {
    test('validates UK landline correctly', async () => {
      const result = await phoneValidationService.validatePhoneNumber('020 7946 0958', 'GB');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.e164Format).toBe('+442079460958');
      expect(result.internationalFormat).toBe('+44 20 7946 0958');
    });

    test('validates UK mobile correctly', async () => {
      const result = await phoneValidationService.validatePhoneNumber('07911 123456', 'GB');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.e164Format).toBe('+447911123456');
    });

    test('validates Indian mobile correctly', async () => {
      const result = await phoneValidationService.validatePhoneNumber('9876543210', 'IN');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.e164Format).toBe('+919876543210');
    });

    test('validates US number correctly', async () => {
      const result = await phoneValidationService.validatePhoneNumber('2125551234', 'US');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.e164Format).toBe('+12125551234');
    });

    test('rejects invalid UK number', async () => {
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve([{ iso_code: 'GB', name: 'United Kingdom' }])
      });

      const result = await phoneValidationService.validatePhoneNumber('123', 'GB');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid');
      expect(result.formattedNumber).toBeNull();
    });

    test('rejects empty phone number', async () => {
      const result = await phoneValidationService.validatePhoneNumber('', 'GB');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });

    test('rejects whitespace-only phone number', async () => {
      const result = await phoneValidationService.validatePhoneNumber('   ', 'GB');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });

    test('rejects missing country code', async () => {
      const result = await phoneValidationService.validatePhoneNumber('020 7946 0958', '');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Country code is required for validation');
    });

    test('rejects null country code', async () => {
      const result = await phoneValidationService.validatePhoneNumber('020 7946 0958', null);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Country code is required for validation');
    });

    test('handles parsing errors gracefully', async () => {
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve([{ iso_code: 'ZZ', name: 'Unknown' }])
      });

      // Use a malformed number that causes parsePhoneNumber to throw
      const result = await phoneValidationService.validatePhoneNumber('+++invalid', 'ZZ');

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('formatPhoneNumber', () => {
    test('formats UK number in national format', () => {
      const formatted = phoneValidationService.formatPhoneNumber('2079460958', 'GB', 'national');
      expect(formatted).toBe('020 7946 0958');
    });

    test('formats UK number in international format', () => {
      const formatted = phoneValidationService.formatPhoneNumber('2079460958', 'GB', 'international');
      expect(formatted).toBe('+44 20 7946 0958');
    });

    test('formats UK number in E164 format', () => {
      const formatted = phoneValidationService.formatPhoneNumber('2079460958', 'GB', 'e164');
      expect(formatted).toBe('+442079460958');
    });

    test('formats with default national format', () => {
      const formatted = phoneValidationService.formatPhoneNumber('2079460958', 'GB');
      expect(formatted).toBe('020 7946 0958');
    });

    test('returns original number if invalid', () => {
      const formatted = phoneValidationService.formatPhoneNumber('invalid', 'GB', 'national');
      expect(formatted).toBe('invalid');
    });

    test('returns original number if parsing throws', () => {
      const formatted = phoneValidationService.formatPhoneNumber('+++bad', 'XX', 'national');
      expect(formatted).toBe('+++bad');
    });

    test('handles INTERNATIONAL format case-insensitively', () => {
      const formatted = phoneValidationService.formatPhoneNumber('2079460958', 'GB', 'INTERNATIONAL');
      expect(formatted).toBe('+44 20 7946 0958');
    });

    test('handles E164 format case-insensitively', () => {
      const formatted = phoneValidationService.formatPhoneNumber('2079460958', 'GB', 'E164');
      expect(formatted).toBe('+442079460958');
    });
  });

  describe('getCountryCallingCode', () => {
    test('returns UK calling code', () => {
      const code = phoneValidationService.getCountryCallingCode('GB');
      expect(code).toBe('+44');
    });

    test('returns US calling code', () => {
      const code = phoneValidationService.getCountryCallingCode('US');
      expect(code).toBe('+1');
    });

    test('returns India calling code', () => {
      const code = phoneValidationService.getCountryCallingCode('IN');
      expect(code).toBe('+91');
    });

    test('returns empty string for invalid country', () => {
      const code = phoneValidationService.getCountryCallingCode('XX');
      expect(code).toBe('');
    });
  });

  describe('fetchCountries', () => {
    test('fetches countries from API', async () => {
      const mockCountries = [
        { iso_code: 'GB', name: 'United Kingdom' },
        { iso_code: 'US', name: 'United States' }
      ];
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockCountries)
      });

      const result = await phoneValidationService.fetchCountries();

      expect(result).toEqual(mockCountries);
      expect(phoneValidationService.countriesCache).toEqual(mockCountries);
    });

    test('returns cached countries on subsequent calls', async () => {
      const mockCountries = [{ iso_code: 'GB', name: 'United Kingdom' }];
      phoneValidationService.countriesCache = mockCountries;

      const result = await phoneValidationService.fetchCountries();

      expect(result).toEqual(mockCountries);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('returns existing promise if fetch in progress', async () => {
      const mockCountries = [{ iso_code: 'GB', name: 'United Kingdom' }];
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockCountries)
      });

      // Start two fetches simultaneously
      const promise1 = phoneValidationService.fetchCountries();
      const promise2 = phoneValidationService.fetchCountries();

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual(mockCountries);
      expect(result2).toEqual(mockCountries);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('handles API response with results array', async () => {
      const mockData = { results: [{ iso_code: 'GB', name: 'United Kingdom' }] };
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockData)
      });

      const result = await phoneValidationService.fetchCountries();

      expect(result).toEqual(mockData.results);
    });

    test('returns empty array on fetch error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await phoneValidationService.fetchCountries();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
      console.error.mockRestore();
    });
  });

  describe('getCountryCodeFromName', () => {
    test('maps United Kingdom to GB', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve([{ iso_code: 'GB', name: 'United Kingdom' }])
      });

      const code = await phoneValidationService.getCountryCodeFromName('United Kingdom');
      expect(code).toBe('GB');
    });

    test('maps United States to US', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve([{ iso_code: 'US', name: 'United States' }])
      });

      const code = await phoneValidationService.getCountryCodeFromName('United States');
      expect(code).toBe('US');
    });

    test('returns null for unknown country', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve([{ iso_code: 'GB', name: 'United Kingdom' }])
      });

      const code = await phoneValidationService.getCountryCodeFromName('Unknown Country');
      expect(code).toBeNull();
    });

    test('returns null on fetch error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const code = await phoneValidationService.getCountryCodeFromName('United Kingdom');

      expect(code).toBeNull();
      expect(console.error).toHaveBeenCalled();
      console.error.mockRestore();
    });
  });

  describe('getCountryName', () => {
    test('returns country name for valid ISO code', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve([{ iso_code: 'GB', name: 'United Kingdom' }])
      });

      const name = await phoneValidationService.getCountryName('GB');
      expect(name).toBe('United Kingdom');
    });

    test('returns ISO code if country not found', async () => {
      global.fetch.mockResolvedValueOnce({
        json: () => Promise.resolve([{ iso_code: 'US', name: 'United States' }])
      });

      const name = await phoneValidationService.getCountryName('XX');
      expect(name).toBe('XX');
    });

    test('returns ISO code on error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const name = await phoneValidationService.getCountryName('GB');

      expect(name).toBe('GB');
      expect(console.error).toHaveBeenCalled();
      console.error.mockRestore();
    });
  });

  describe('getValidationErrorMessage', () => {
    beforeEach(() => {
      global.fetch.mockResolvedValue({
        json: () => Promise.resolve([{ iso_code: 'GB', name: 'United Kingdom' }])
      });
    });

    test('returns required message for empty phone', async () => {
      const msg = await phoneValidationService.getValidationErrorMessage('', 'GB');
      expect(msg).toBe('Phone number is required');
    });

    test('returns required message for whitespace phone', async () => {
      const msg = await phoneValidationService.getValidationErrorMessage('   ', 'GB');
      expect(msg).toBe('Phone number is required');
    });

    test('returns country required message for empty country', async () => {
      const msg = await phoneValidationService.getValidationErrorMessage('1234', '');
      expect(msg).toBe('Please select a country first');
    });

    test('returns country required message for null country', async () => {
      const msg = await phoneValidationService.getValidationErrorMessage('1234', null);
      expect(msg).toBe('Please select a country first');
    });

    test('returns too short message', async () => {
      const msg = await phoneValidationService.getValidationErrorMessage('12', 'GB');
      expect(msg).toBe('Phone number is too short');
    });

    test('returns too long message', async () => {
      const msg = await phoneValidationService.getValidationErrorMessage('123456789012345678901', 'GB');
      expect(msg).toBe('Phone number is too long');
    });

    test('returns invalid characters message', async () => {
      const msg = await phoneValidationService.getValidationErrorMessage('123abc', 'GB');
      expect(msg).toBe('Phone number contains invalid characters');
    });

    test('returns country-specific message for valid format', async () => {
      const msg = await phoneValidationService.getValidationErrorMessage('123456789', 'GB');
      expect(msg).toContain('United Kingdom');
    });
  });

  describe('detectCountryFromPhoneNumber', () => {
    test('detects UK from international number', () => {
      const country = phoneValidationService.detectCountryFromPhoneNumber('+44 20 7946 0958');
      expect(country).toBe('GB');
    });

    test('detects US from international number', () => {
      const country = phoneValidationService.detectCountryFromPhoneNumber('+12125551234');
      expect(country).toBe('US');
    });

    test('returns null for invalid number', () => {
      const country = phoneValidationService.detectCountryFromPhoneNumber('invalid');
      expect(country).toBeNull();
    });

    test('returns null for local number without country code', () => {
      const country = phoneValidationService.detectCountryFromPhoneNumber('020 7946 0958');
      expect(country).toBeNull();
    });
  });

  describe('validateInternationalPhoneNumber', () => {
    test('validates international UK number', () => {
      const result = phoneValidationService.validateInternationalPhoneNumber('+44 20 7946 0958');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.country).toBe('GB');
      expect(result.e164Format).toBe('+442079460958');
    });

    test('validates international US number', () => {
      const result = phoneValidationService.validateInternationalPhoneNumber('+1 212 555 1234');

      expect(result.isValid).toBe(true);
      expect(result.country).toBe('US');
    });

    test('rejects empty phone number', () => {
      const result = phoneValidationService.validateInternationalPhoneNumber('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });

    test('rejects whitespace-only phone number', () => {
      const result = phoneValidationService.validateInternationalPhoneNumber('   ');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });

    test('rejects invalid international format', () => {
      const result = phoneValidationService.validateInternationalPhoneNumber('020 7946 0958');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid');
    });

    test('handles parsing errors gracefully', () => {
      const result = phoneValidationService.validateInternationalPhoneNumber('+++invalid');

      expect(result.isValid).toBe(false);
      // Error can be either from catch block or validation
      expect(result.error).toMatch(/Invalid.*phone/i);
    });
  });
});
