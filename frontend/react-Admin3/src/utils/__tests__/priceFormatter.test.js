/**
 * Tests for priceFormatter utility
 *
 * @module utils/__tests__/priceFormatter.test
 */

import { formatPrice } from '../priceFormatter';
import defaultExport from '../priceFormatter';

describe('priceFormatter', () => {
  describe('formatPrice', () => {
    describe('basic formatting', () => {
      test('should format positive integer amount', () => {
        expect(formatPrice(100)).toBe('£100.00');
      });

      test('should format positive decimal amount', () => {
        expect(formatPrice(99.99)).toBe('£99.99');
      });

      test('should format zero amount', () => {
        expect(formatPrice(0)).toBe('£0.00');
      });

      test('should format small decimal amount', () => {
        expect(formatPrice(0.01)).toBe('£0.01');
      });

      test('should format single decimal place amount', () => {
        expect(formatPrice(49.5)).toBe('£49.50');
      });
    });

    describe('large numbers', () => {
      test('should format thousands with comma separator', () => {
        expect(formatPrice(1000)).toBe('£1,000.00');
      });

      test('should format tens of thousands', () => {
        expect(formatPrice(12345.67)).toBe('£12,345.67');
      });

      test('should format hundreds of thousands', () => {
        expect(formatPrice(123456.78)).toBe('£123,456.78');
      });

      test('should format millions', () => {
        expect(formatPrice(1234567.89)).toBe('£1,234,567.89');
      });
    });

    describe('decimal precision', () => {
      test('should round down extra decimal places', () => {
        expect(formatPrice(10.994)).toBe('£10.99');
      });

      test('should round up extra decimal places', () => {
        expect(formatPrice(10.995)).toBe('£11.00');
      });

      test('should handle many decimal places', () => {
        expect(formatPrice(10.123456789)).toBe('£10.12');
      });
    });

    describe('negative numbers', () => {
      test('should format negative amount', () => {
        expect(formatPrice(-50)).toBe('-£50.00');
      });

      test('should format negative decimal amount', () => {
        expect(formatPrice(-99.99)).toBe('-£99.99');
      });

      test('should format large negative amount', () => {
        expect(formatPrice(-1000)).toBe('-£1,000.00');
      });
    });

    describe('null and undefined handling', () => {
      test('should default null to £0.00', () => {
        expect(formatPrice(null)).toBe('£0.00');
      });

      test('should default undefined to £0.00', () => {
        expect(formatPrice(undefined)).toBe('£0.00');
      });

      test('should default empty string to £0.00', () => {
        expect(formatPrice('')).toBe('£0.00');
      });
    });

    describe('edge cases', () => {
      test('should handle string number input', () => {
        expect(formatPrice('100')).toBe('£100.00');
      });

      test('should handle string decimal input', () => {
        expect(formatPrice('99.99')).toBe('£99.99');
      });

      test('should handle NaN input (defaults to 0)', () => {
        // NaN is falsy, so amount || 0 converts to 0
        expect(formatPrice(NaN)).toBe('£0.00');
      });

      test('should handle Infinity', () => {
        expect(formatPrice(Infinity)).toBe('£∞');
      });

      test('should handle negative Infinity', () => {
        expect(formatPrice(-Infinity)).toBe('-£∞');
      });
    });
  });

  describe('default export', () => {
    test('should export formatPrice as default', () => {
      expect(defaultExport).toBe(formatPrice);
    });

    test('should work with default export', () => {
      expect(defaultExport(50)).toBe('£50.00');
    });
  });
});
