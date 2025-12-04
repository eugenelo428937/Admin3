// frontend/react-Admin3/src/services/__tests__/addressValidationService.test.js
import addressValidationService from '../addressValidationService';

// Mock fetch
global.fetch = jest.fn();

describe('addressValidationService', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('validateAddress', () => {
    it('returns the best match from Postcoder API', async () => {
      const mockResponse = {
        addresses: [
          {
            line_1: '10 Downing Street',
            town_or_city: 'Westminster',
            postcode: 'SW1A 2AA',
            county: 'Greater London',
            country: 'United Kingdom'
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const userAddress = {
        address: '10 Downing St',
        city: 'London',
        postal_code: 'SW1A 2AA',
        country: 'United Kingdom'
      };

      const result = await addressValidationService.validateAddress(userAddress);

      expect(result.hasMatch).toBe(true);
      expect(result.bestMatch).toBeDefined();
      expect(result.bestMatch.city).toBe('Westminster');
    });

    it('returns no match when API returns empty results', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ addresses: [] })
      });

      const userAddress = {
        address: 'Invalid Address 12345',
        city: 'Nowhere',
        postal_code: 'XX99 9XX',
        country: 'United Kingdom'
      };

      const result = await addressValidationService.validateAddress(userAddress);

      expect(result.hasMatch).toBe(false);
      expect(result.bestMatch).toBeNull();
    });

    it('detects when addresses are similar (no comparison needed)', async () => {
      const mockResponse = {
        addresses: [
          {
            line_1: '10 Downing Street',
            town_or_city: 'London',
            postcode: 'SW1A 2AA',
            country: 'United Kingdom'
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const userAddress = {
        address: '10 Downing Street',
        city: 'London',
        postal_code: 'SW1A 2AA',
        country: 'United Kingdom'
      };

      const result = await addressValidationService.validateAddress(userAddress);

      expect(result.hasMatch).toBe(true);
      expect(result.needsComparison).toBe(false);
    });

    it('detects when addresses differ (comparison needed)', async () => {
      const mockResponse = {
        addresses: [
          {
            line_1: '10 Downing Street',
            town_or_city: 'Westminster',
            postcode: 'SW1A 2AA',
            county: 'Greater London',
            country: 'United Kingdom'
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const userAddress = {
        address: '10 Downing St',
        city: 'London',
        postal_code: 'SW1A 2AA',
        country: 'United Kingdom'
      };

      const result = await addressValidationService.validateAddress(userAddress);

      expect(result.hasMatch).toBe(true);
      expect(result.needsComparison).toBe(true);
    });
  });

  describe('compareAddresses', () => {
    it('returns true when addresses are effectively the same', () => {
      const addr1 = { address: '10 Downing Street', city: 'London', postal_code: 'SW1A 2AA' };
      const addr2 = { address: '10 Downing Street', city: 'London', postal_code: 'SW1A 2AA' };

      expect(addressValidationService.compareAddresses(addr1, addr2)).toBe(true);
    });

    it('returns false when addresses differ', () => {
      const addr1 = { address: '10 Downing Street', city: 'London', postal_code: 'SW1A 2AA' };
      const addr2 = { address: '10 Downing Street', city: 'Westminster', postal_code: 'SW1A 2AA' };

      expect(addressValidationService.compareAddresses(addr1, addr2)).toBe(false);
    });

    it('ignores case and whitespace differences', () => {
      const addr1 = { address: '10 DOWNING STREET', city: 'london', postal_code: 'sw1a 2aa' };
      const addr2 = { address: '10 Downing Street', city: 'London', postal_code: 'SW1A 2AA' };

      expect(addressValidationService.compareAddresses(addr1, addr2)).toBe(true);
    });
  });
});
