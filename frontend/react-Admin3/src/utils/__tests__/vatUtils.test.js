/**
 * Tests for vatUtils
 *
 * @module utils/__tests__/vatUtils.test
 *
 * Tests VAT utility functions including:
 * - formatVatLabel: Format VAT rate as label
 * - getVatStatusDisplay: Get human-readable VAT status
 * - formatPrice: Format price with currency symbol
 * - getCurrencySymbol: Get currency symbol for code
 * - formatVatAmount: Format VAT amount as currency
 * - getVatBreakdown: Get full VAT breakdown for display
 */

import {
  formatVatLabel,
  getVatStatusDisplay,
  formatPrice,
  getCurrencySymbol,
  formatVatAmount,
  getVatBreakdown,
} from '../vatUtils';

describe('vatUtils', () => {
  describe('formatVatLabel', () => {
    test('should format 20% VAT rate', () => {
      expect(formatVatLabel(0.20)).toBe('VAT (20%)');
    });

    test('should format 0% VAT rate', () => {
      expect(formatVatLabel(0.00)).toBe('VAT (0%)');
    });

    test('should format 5% VAT rate', () => {
      expect(formatVatLabel(0.05)).toBe('VAT (5%)');
    });

    test('should format 15% VAT rate', () => {
      expect(formatVatLabel(0.15)).toBe('VAT (15%)');
    });

    test('should format 23% VAT rate', () => {
      expect(formatVatLabel(0.23)).toBe('VAT (23%)');
    });

    test('should return "VAT" for null rate', () => {
      expect(formatVatLabel(null)).toBe('VAT');
    });

    test('should return "VAT" for undefined rate', () => {
      expect(formatVatLabel(undefined)).toBe('VAT');
    });

    test('should handle decimal precision in formatting', () => {
      // 0.175 * 100 = 17.5, toFixed(0) = "18" (rounded)
      expect(formatVatLabel(0.175)).toBe('VAT (18%)');
    });

    test('should handle very small rates', () => {
      expect(formatVatLabel(0.001)).toBe('VAT (0%)');
    });
  });

  describe('getVatStatusDisplay', () => {
    test('should return "Price includes VAT" for included status', () => {
      expect(getVatStatusDisplay('included')).toBe('Price includes VAT');
    });

    test('should return "Price includes VAT" for standard status', () => {
      expect(getVatStatusDisplay('standard')).toBe('Price includes VAT');
    });

    test('should return "VAT exempt" for exempt status', () => {
      expect(getVatStatusDisplay('exempt')).toBe('VAT exempt');
    });

    test('should return "VAT exempt" for zero status', () => {
      expect(getVatStatusDisplay('zero')).toBe('VAT exempt');
    });

    test('should return "Zero-rated for VAT" for zero_rated status', () => {
      expect(getVatStatusDisplay('zero_rated')).toBe('Zero-rated for VAT');
    });

    test('should return "Reverse charge applies" for reverse_charge status', () => {
      expect(getVatStatusDisplay('reverse_charge')).toBe('Reverse charge applies');
    });

    test('should return default for not_applicable status (empty string is falsy)', () => {
      // Note: 'not_applicable' maps to '' in statusMap, but '' || 'default' returns default
      expect(getVatStatusDisplay('not_applicable')).toBe('Price includes VAT');
    });

    test('should return default "Price includes VAT" for unknown status', () => {
      expect(getVatStatusDisplay('unknown_status')).toBe('Price includes VAT');
    });

    test('should return default for null status', () => {
      expect(getVatStatusDisplay(null)).toBe('Price includes VAT');
    });

    test('should return default for undefined status', () => {
      expect(getVatStatusDisplay(undefined)).toBe('Price includes VAT');
    });

    test('should return default for empty string status', () => {
      expect(getVatStatusDisplay('')).toBe('Price includes VAT');
    });
  });

  describe('getCurrencySymbol', () => {
    test('should return £ for GBP', () => {
      expect(getCurrencySymbol('GBP')).toBe('£');
    });

    test('should return $ for USD', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
    });

    test('should return € for EUR', () => {
      expect(getCurrencySymbol('EUR')).toBe('€');
    });

    test('should return R for ZAR', () => {
      expect(getCurrencySymbol('ZAR')).toBe('R');
    });

    test('should return default £ for unknown currency', () => {
      expect(getCurrencySymbol('JPY')).toBe('£');
    });

    test('should return default £ for null currency', () => {
      expect(getCurrencySymbol(null)).toBe('£');
    });

    test('should return default £ for undefined currency', () => {
      expect(getCurrencySymbol(undefined)).toBe('£');
    });

    test('should be case-sensitive', () => {
      expect(getCurrencySymbol('gbp')).toBe('£'); // Returns default
    });
  });

  describe('formatPrice', () => {
    test('should format price with GBP as default currency', () => {
      expect(formatPrice(100.00)).toBe('£100.00');
    });

    test('should format price with explicit GBP', () => {
      expect(formatPrice(100.00, 'GBP')).toBe('£100.00');
    });

    test('should format price with USD', () => {
      expect(formatPrice(100.00, 'USD')).toBe('$100.00');
    });

    test('should format price with EUR', () => {
      expect(formatPrice(100.00, 'EUR')).toBe('€100.00');
    });

    test('should format price with ZAR', () => {
      expect(formatPrice(100.00, 'ZAR')).toBe('R100.00');
    });

    test('should format price with decimal precision', () => {
      expect(formatPrice(99.99)).toBe('£99.99');
    });

    test('should handle integer prices', () => {
      expect(formatPrice(50)).toBe('£50.00');
    });

    test('should handle zero price', () => {
      expect(formatPrice(0)).toBe('£0.00');
    });

    test('should return £0.00 for null price', () => {
      expect(formatPrice(null)).toBe('£0.00');
    });

    test('should return £0.00 for undefined price', () => {
      expect(formatPrice(undefined)).toBe('£0.00');
    });

    test('should return currency symbol + 0.00 for null price with specific currency', () => {
      expect(formatPrice(null, 'USD')).toBe('$0.00');
    });

    test('should handle string numbers', () => {
      expect(formatPrice('150.50')).toBe('£150.50');
    });

    test('should handle large prices', () => {
      expect(formatPrice(10000.00)).toBe('£10000.00');
    });

    test('should round to 2 decimal places', () => {
      expect(formatPrice(99.999)).toBe('£100.00');
    });

    test('should handle negative prices', () => {
      expect(formatPrice(-50.00)).toBe('£-50.00');
    });
  });

  describe('formatVatAmount', () => {
    test('should format VAT amount with default currency', () => {
      expect(formatVatAmount(20.00)).toBe('£20.00');
    });

    test('should format VAT amount with explicit GBP', () => {
      expect(formatVatAmount(20.00, 'GBP')).toBe('£20.00');
    });

    test('should format VAT amount with EUR', () => {
      expect(formatVatAmount(20.00, 'EUR')).toBe('€20.00');
    });

    test('should format zero VAT amount', () => {
      expect(formatVatAmount(0.00)).toBe('£0.00');
    });

    test('should format null VAT amount', () => {
      expect(formatVatAmount(null)).toBe('£0.00');
    });

    test('should format undefined VAT amount', () => {
      expect(formatVatAmount(undefined)).toBe('£0.00');
    });

    test('should handle decimal VAT amounts', () => {
      expect(formatVatAmount(15.75)).toBe('£15.75');
    });
  });

  describe('getVatBreakdown', () => {
    test('should return full VAT breakdown for valid calculations', () => {
      const vatCalculations = {
        totals: {
          total_net: 100.00,
          total_vat: 20.00,
          total_gross: 120.00,
          effective_vat_rate: 0.20,
        },
        region_info: {
          region: 'UK',
        },
      };

      const result = getVatBreakdown(vatCalculations);

      expect(result).toEqual({
        netAmount: '£100.00',
        vatAmount: '£20.00',
        grossAmount: '£120.00',
        vatLabel: 'VAT (20%)',
        vatRate: 0.20,
        region: 'UK',
      });
    });

    test('should use alternate field names (net, vat, gross)', () => {
      const vatCalculations = {
        totals: {
          net: 80.00,
          vat: 16.00,
          gross: 96.00,
          effective_vat_rate: 0.20,
        },
        region_info: {
          region: 'EU',
        },
      };

      const result = getVatBreakdown(vatCalculations);

      expect(result).toEqual({
        netAmount: '£80.00',
        vatAmount: '£16.00',
        grossAmount: '£96.00',
        vatLabel: 'VAT (20%)',
        vatRate: 0.20,
        region: 'EU',
      });
    });

    test('should prioritize total_net over net', () => {
      const vatCalculations = {
        totals: {
          total_net: 100.00,
          net: 50.00, // Should be ignored
          total_vat: 20.00,
          total_gross: 120.00,
          effective_vat_rate: 0.20,
        },
        region_info: { region: 'UK' },
      };

      const result = getVatBreakdown(vatCalculations);

      expect(result.netAmount).toBe('£100.00');
    });

    test('should return default breakdown for null vatCalculations', () => {
      const result = getVatBreakdown(null);

      expect(result).toEqual({
        netAmount: '£0.00',
        vatAmount: '£0.00',
        grossAmount: '£0.00',
        vatLabel: 'VAT',
        vatRate: 0,
        region: 'Unknown',
      });
    });

    test('should return default breakdown for undefined vatCalculations', () => {
      const result = getVatBreakdown(undefined);

      expect(result).toEqual({
        netAmount: '£0.00',
        vatAmount: '£0.00',
        grossAmount: '£0.00',
        vatLabel: 'VAT',
        vatRate: 0,
        region: 'Unknown',
      });
    });

    test('should return default breakdown when totals is missing', () => {
      const vatCalculations = {
        region_info: { region: 'UK' },
      };

      const result = getVatBreakdown(vatCalculations);

      expect(result).toEqual({
        netAmount: '£0.00',
        vatAmount: '£0.00',
        grossAmount: '£0.00',
        vatLabel: 'VAT',
        vatRate: 0,
        region: 'Unknown',
      });
    });

    test('should handle missing region_info', () => {
      const vatCalculations = {
        totals: {
          total_net: 100.00,
          total_vat: 20.00,
          total_gross: 120.00,
          effective_vat_rate: 0.20,
        },
      };

      const result = getVatBreakdown(vatCalculations);

      expect(result.region).toBe('Unknown');
    });

    test('should handle missing region in region_info', () => {
      const vatCalculations = {
        totals: {
          total_net: 100.00,
          total_vat: 20.00,
          total_gross: 120.00,
          effective_vat_rate: 0.20,
        },
        region_info: {},
      };

      const result = getVatBreakdown(vatCalculations);

      expect(result.region).toBe('Unknown');
    });

    test('should default effective_vat_rate to 0 when missing', () => {
      const vatCalculations = {
        totals: {
          total_net: 100.00,
          total_vat: 0.00,
          total_gross: 100.00,
        },
        region_info: { region: 'Non-EU' },
      };

      const result = getVatBreakdown(vatCalculations);

      expect(result.vatRate).toBe(0);
      expect(result.vatLabel).toBe('VAT (0%)');
    });

    test('should use specified currency for formatting', () => {
      const vatCalculations = {
        totals: {
          total_net: 100.00,
          total_vat: 20.00,
          total_gross: 120.00,
          effective_vat_rate: 0.20,
        },
        region_info: { region: 'USA' },
      };

      const result = getVatBreakdown(vatCalculations, 'USD');

      expect(result.netAmount).toBe('$100.00');
      expect(result.vatAmount).toBe('$20.00');
      expect(result.grossAmount).toBe('$120.00');
    });

    test('should use default currency for null/undefined vatCalculations', () => {
      const result = getVatBreakdown(null, 'EUR');

      expect(result.netAmount).toBe('€0.00');
      expect(result.vatAmount).toBe('€0.00');
      expect(result.grossAmount).toBe('€0.00');
    });

    test('should handle 0% VAT rate correctly', () => {
      const vatCalculations = {
        totals: {
          total_net: 100.00,
          total_vat: 0.00,
          total_gross: 100.00,
          effective_vat_rate: 0.00,
        },
        region_info: { region: 'Non-EU' },
      };

      const result = getVatBreakdown(vatCalculations);

      expect(result.vatLabel).toBe('VAT (0%)');
      expect(result.vatRate).toBe(0);
    });

    test('should handle empty totals object', () => {
      const vatCalculations = {
        totals: {},
        region_info: { region: 'UK' },
      };

      const result = getVatBreakdown(vatCalculations);

      // Should use formatPrice(undefined) which returns £0.00
      expect(result.netAmount).toBe('£0.00');
      expect(result.vatAmount).toBe('£0.00');
      expect(result.grossAmount).toBe('£0.00');
      expect(result.vatRate).toBe(0);
    });
  });
});
