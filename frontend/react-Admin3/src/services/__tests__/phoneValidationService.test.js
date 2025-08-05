import phoneValidationService from '../phoneValidationService';

describe('PhoneValidationService', () => {
  describe('validatePhoneNumber', () => {
    test('validates UK landline correctly', () => {
      const result = phoneValidationService.validatePhoneNumber('020 7946 0958', 'GB');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.e164Format).toBe('+442079460958');
      expect(result.internationalFormat).toBe('+44 20 7946 0958');
    });

    test('validates UK mobile correctly', () => {
      const result = phoneValidationService.validatePhoneNumber('07911 123456', 'GB');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.e164Format).toBe('+447911123456');
    });

    test('validates Indian mobile correctly', () => {
      const result = phoneValidationService.validatePhoneNumber('9876543210', 'IN');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.e164Format).toBe('+919876543210');
    });

    test('validates US number correctly', () => {
      const result = phoneValidationService.validatePhoneNumber('2125551234', 'US');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.e164Format).toBe('+12125551234');
    });

    test('rejects invalid UK number', () => {
      const result = phoneValidationService.validatePhoneNumber('123', 'GB');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid');
      expect(result.formattedNumber).toBeNull();
    });

    test('rejects empty phone number', () => {
      const result = phoneValidationService.validatePhoneNumber('', 'GB');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });

    test('rejects missing country code', () => {
      const result = phoneValidationService.validatePhoneNumber('020 7946 0958', '');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Country code is required for validation');
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

    test('returns original number if formatting fails', () => {
      const formatted = phoneValidationService.formatPhoneNumber('invalid', 'GB', 'national');
      expect(formatted).toBe('invalid');
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

  describe('getCountryCodeFromName', () => {
    test('maps United Kingdom to GB', () => {
      const code = phoneValidationService.getCountryCodeFromName('United Kingdom');
      expect(code).toBe('GB');
    });

    test('maps United States to US', () => {
      const code = phoneValidationService.getCountryCodeFromName('United States');
      expect(code).toBe('US');
    });

    test('maps India to IN', () => {
      const code = phoneValidationService.getCountryCodeFromName('India');
      expect(code).toBe('IN');
    });

    test('returns null for unknown country', () => {
      const code = phoneValidationService.getCountryCodeFromName('Unknown Country');
      expect(code).toBeNull();
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
  });

  describe('validateInternationalPhoneNumber', () => {
    test('validates international UK number', () => {
      const result = phoneValidationService.validateInternationalPhoneNumber('+44 20 7946 0958');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
      expect(result.country).toBe('GB');
      expect(result.e164Format).toBe('+442079460958');
    });

    test('rejects invalid international format', () => {
      const result = phoneValidationService.validateInternationalPhoneNumber('020 7946 0958');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });
});