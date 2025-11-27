/**
 * Tests for addressMetadataConfig
 *
 * @module services/__tests__/addressMetadataConfig.test
 *
 * Tests address metadata configuration including:
 * - ADDRESS_METADATA: Country-specific address configurations
 * - COUNTRY_CODE_MAPPINGS: Country name to ISO code mappings
 */

import { ADDRESS_METADATA, COUNTRY_CODE_MAPPINGS } from '../addressMetadataConfig';

describe('addressMetadataConfig', () => {
  describe('ADDRESS_METADATA', () => {
    describe('structure validation', () => {
      test('should export ADDRESS_METADATA object', () => {
        expect(ADDRESS_METADATA).toBeDefined();
        expect(typeof ADDRESS_METADATA).toBe('object');
      });

      test('should have DEFAULT configuration', () => {
        expect(ADDRESS_METADATA.DEFAULT).toBeDefined();
        expect(ADDRESS_METADATA.DEFAULT.required).toContain('address');
        expect(ADDRESS_METADATA.DEFAULT.required).toContain('city');
      });
    });

    describe('US configuration', () => {
      test('should have US configuration with state dropdown', () => {
        expect(ADDRESS_METADATA.US).toBeDefined();
        expect(ADDRESS_METADATA.US.fields.state.type).toBe('select');
        expect(ADDRESS_METADATA.US.fields.state.options.length).toBe(51); // 50 states + DC
      });

      test('should have required fields for US', () => {
        expect(ADDRESS_METADATA.US.required).toEqual(['address', 'city', 'state', 'postal_code']);
      });

      test('should have ZIP code validation pattern', () => {
        const pattern = ADDRESS_METADATA.US.fields.postal_code.pattern;
        expect(pattern.test('12345')).toBe(true);
        expect(pattern.test('12345-6789')).toBe(true);
        expect(pattern.test('1234')).toBe(false);
      });

      test('should have all 50 US states plus DC', () => {
        const stateOptions = ADDRESS_METADATA.US.fields.state.options;
        const stateCodes = stateOptions.map(s => s.value);

        expect(stateCodes).toContain('CA');
        expect(stateCodes).toContain('NY');
        expect(stateCodes).toContain('TX');
        expect(stateCodes).toContain('DC');
      });
    });

    describe('CA (Canada) configuration', () => {
      test('should have CA configuration with province dropdown', () => {
        expect(ADDRESS_METADATA.CA).toBeDefined();
        expect(ADDRESS_METADATA.CA.fields.state.type).toBe('select');
        expect(ADDRESS_METADATA.CA.fields.state.label).toBe('Province');
      });

      test('should have Canadian postal code validation', () => {
        const pattern = ADDRESS_METADATA.CA.fields.postal_code.pattern;
        expect(pattern.test('K1A 0A6')).toBe(true);
        expect(pattern.test('K1A0A6')).toBe(true);
        expect(pattern.test('k1a 0a6')).toBe(true); // Case insensitive
        expect(pattern.test('12345')).toBe(false);
      });

      test('should have postal code transform function', () => {
        const transform = ADDRESS_METADATA.CA.fields.postal_code.transform;
        expect(transform('k1a 0a6')).toBe('K1A 0A6');
      });

      test('should have all Canadian provinces and territories', () => {
        const provinces = ADDRESS_METADATA.CA.fields.state.options;
        expect(provinces.length).toBe(13);
        const codes = provinces.map(p => p.value);
        expect(codes).toContain('ON');
        expect(codes).toContain('QC');
        expect(codes).toContain('BC');
      });
    });

    describe('HK (Hong Kong) configuration', () => {
      test('should not require postal code', () => {
        expect(ADDRESS_METADATA.HK.hasPostcode).toBe(false);
        expect(ADDRESS_METADATA.HK.required).not.toContain('postal_code');
      });

      test('should have area dropdown', () => {
        expect(ADDRESS_METADATA.HK.fields.state.type).toBe('select');
        expect(ADDRESS_METADATA.HK.fields.state.label).toBe('Area');
        expect(ADDRESS_METADATA.HK.fields.state.options.length).toBe(3);
      });
    });

    describe('GB (United Kingdom) configuration', () => {
      test('should require postcode for lookup', () => {
        expect(ADDRESS_METADATA.GB.requiresPostcodeForLookup).toBe(true);
        expect(ADDRESS_METADATA.GB.hasPostcode).toBe(true);
      });

      test('should have address lookup supported', () => {
        expect(ADDRESS_METADATA.GB.addressLookupSupported).toBe(true);
      });
    });

    describe('other country configurations', () => {
      const countriesWithPostcode = ['ZA', 'IN', 'AU', 'MY', 'SG', 'NZ', 'CN', 'JP', 'CY', 'DE', 'PL', 'MT', 'TW'];
      const countriesWithOptionalPostcode = ['IE', 'MU', 'KE', 'ZW', 'BM'];

      test.each(countriesWithPostcode)('%s should have hasPostcode true', (countryCode) => {
        expect(ADDRESS_METADATA[countryCode]).toBeDefined();
        expect(ADDRESS_METADATA[countryCode].hasPostcode).toBe(true);
      });

      test.each(countriesWithOptionalPostcode)('%s should have optional postal_code', (countryCode) => {
        expect(ADDRESS_METADATA[countryCode]).toBeDefined();
        expect(ADDRESS_METADATA[countryCode].optional).toContain('postal_code');
      });
    });

    describe('layout configurations', () => {
      test('should have layout array for each country', () => {
        const countryCodes = Object.keys(ADDRESS_METADATA);

        countryCodes.forEach(code => {
          expect(ADDRESS_METADATA[code].layout).toBeDefined();
          expect(Array.isArray(ADDRESS_METADATA[code].layout)).toBe(true);
        });
      });

      test('should have valid span values in layouts', () => {
        const countryCodes = Object.keys(ADDRESS_METADATA);

        countryCodes.forEach(code => {
          ADDRESS_METADATA[code].layout.forEach(row => {
            const totalSpan = row.reduce((sum, item) => sum + item.span, 0);
            expect(totalSpan).toBe(12);
          });
        });
      });
    });
  });

  describe('COUNTRY_CODE_MAPPINGS', () => {
    test('should export COUNTRY_CODE_MAPPINGS object', () => {
      expect(COUNTRY_CODE_MAPPINGS).toBeDefined();
      expect(typeof COUNTRY_CODE_MAPPINGS).toBe('object');
    });

    test('should map common country names to ISO codes', () => {
      expect(COUNTRY_CODE_MAPPINGS['United States']).toBe('US');
      expect(COUNTRY_CODE_MAPPINGS['United Kingdom']).toBe('GB');
      expect(COUNTRY_CODE_MAPPINGS['Canada']).toBe('CA');
      expect(COUNTRY_CODE_MAPPINGS['Hong Kong']).toBe('HK');
      expect(COUNTRY_CODE_MAPPINGS['Australia']).toBe('AU');
    });

    test('should have all expected country mappings', () => {
      const expectedMappings = [
        'United States',
        'United Kingdom',
        'Hong Kong',
        'Canada',
        'Taiwan',
        'Australia',
        'Germany',
        'France',
        'Japan',
        'South Korea',
        'Singapore',
        'India',
        'China',
        'South Africa',
        'Ireland',
        'Malaysia',
        'New Zealand',
        'Mauritius',
        'Kenya',
        'Zimbabwe',
        'Cyprus',
        'Bermuda',
        'Poland',
        'Malta',
      ];

      expectedMappings.forEach(country => {
        expect(COUNTRY_CODE_MAPPINGS[country]).toBeDefined();
      });
    });

    test('should have valid 2-letter ISO codes', () => {
      Object.values(COUNTRY_CODE_MAPPINGS).forEach(code => {
        expect(code).toMatch(/^[A-Z]{2}$/);
      });
    });
  });
});
