/**
 * VAT Utility Functions - Phase 8 Updated
 *
 * Frontend utilities for VAT formatting and display.
 *
 * IMPORTANT: This file contains ONLY formatting utilities.
 * All VAT calculations are performed by the backend API via Rules Engine.
 * Do NOT add VAT calculation logic here.
 *
 * Used across product cards, cart components, and checkout flows.
 */

interface VatTotals {
  effective_vat_rate?: number;
  total_net?: number;
  net?: number;
  total_vat?: number;
  vat?: number;
  total_gross?: number;
  gross?: number;
}

interface RegionInfo {
  region?: string;
}

interface VatCalculations {
  totals?: VatTotals;
  region_info?: RegionInfo;
}

export interface VatBreakdown {
  netAmount: string;
  vatAmount: string;
  grossAmount: string;
  vatLabel: string;
  vatRate: number;
  region: string;
}

/**
 * Get effective VAT rate from API-provided VAT calculations.
 *
 * @example
 * getEffectiveVatRate(vatCalculations)  // 0.20
 * getEffectiveVatRate(null)             // 0
 */
export const getEffectiveVatRate = (vatCalculations: VatCalculations | null | undefined): number => {
  return vatCalculations?.totals?.effective_vat_rate || 0;
};

/**
 * Get region display name.
 */
export const getRegionDisplayName = (region: string | null | undefined): string => {
  const regionNames: Record<string, string> = {
    'UK': 'United Kingdom',
    'IE': 'Ireland',
    'SA': 'South Africa',
    'ROW': 'Rest of World',
    'CH': 'Switzerland',
    'GG': 'Guernsey',
    'JE': 'Jersey',
    'EU': 'European Union',
    'UNKNOWN': 'Unknown'
  };
  return regionNames[region || ''] || region || 'Unknown';
};

/**
 * Format VAT label with percentage.
 *
 * @example
 * formatVatLabel(0.20)  // "VAT (20%)"
 * formatVatLabel(0.00)  // "VAT (0%)"
 * formatVatLabel(null)  // "VAT"
 */
export const formatVatLabel = (effectiveVatRate: number | null | undefined): string => {
  if (effectiveVatRate !== undefined && effectiveVatRate !== null) {
    const percentage = (effectiveVatRate * 100).toFixed(0);
    return `VAT (${percentage}%)`;
  }
  return 'VAT';
};

/**
 * Get VAT status display text based on status code from API.
 *
 * @example
 * getVatStatusDisplay('included')       // "Price includes VAT"
 * getVatStatusDisplay('exempt')         // "VAT exempt"
 * getVatStatusDisplay('reverse_charge') // "Reverse charge applies"
 */
export const getVatStatusDisplay = (vatStatus: string | null | undefined): string => {
  const statusMap: Record<string, string> = {
    'included': 'Price includes VAT',
    'standard': 'Price includes VAT',
    'exempt': 'VAT exempt',
    'zero': 'VAT exempt',
    'zero_rated': 'Zero-rated for VAT',
    'reverse_charge': 'Reverse charge applies',
    'not_applicable': ''
  };
  return statusMap[vatStatus || ''] || 'Price includes VAT';
};

/**
 * Format price with currency symbol.
 *
 * @example
 * formatPrice(100.00)           // "£100.00"
 * formatPrice(100.00, 'USD')    // "$100.00"
 * formatPrice(100.00, 'EUR')    // "€100.00"
 */
export const formatPrice = (price: number | null | undefined, currency: string = 'GBP'): string => {
  if (price === undefined || price === null) {
    return getCurrencySymbol(currency) + '0.00';
  }
  return getCurrencySymbol(currency) + parseFloat(String(price)).toFixed(2);
};

/**
 * Get currency symbol for currency code.
 *
 * @example
 * getCurrencySymbol('GBP')  // "£"
 * getCurrencySymbol('USD')  // "$"
 * getCurrencySymbol('EUR')  // "€"
 * getCurrencySymbol('ZAR')  // "R"
 */
export const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<string, string> = {
    'GBP': '£',
    'USD': '$',
    'EUR': '€',
    'ZAR': 'R'
  };
  return symbols[currency] || '£';
};

/**
 * Format VAT amount as currency.
 *
 * @example
 * formatVatAmount(20.00)       // "£20.00"
 * formatVatAmount(0.00)        // "£0.00"
 * formatVatAmount(20.00, 'EUR')  // "€20.00"
 */
export const formatVatAmount = (vatAmount: number | null | undefined, currency: string = 'GBP'): string => {
  return formatPrice(vatAmount, currency);
};

/**
 * Get VAT breakdown for display from API vatCalculations.
 *
 * @example
 * const breakdown = getVatBreakdown(cart.vatCalculations);
 * // {
 * //   netAmount: "£100.00",
 * //   vatAmount: "£20.00",
 * //   grossAmount: "£120.00",
 * //   vatLabel: "VAT (20%)",
 * //   vatRate: 0.20,
 * //   region: "UK"
 * // }
 */
export const getVatBreakdown = (vatCalculations: VatCalculations | null | undefined, currency: string = 'GBP'): VatBreakdown => {
  if (!vatCalculations || !vatCalculations.totals) {
    return {
      netAmount: formatPrice(0, currency),
      vatAmount: formatPrice(0, currency),
      grossAmount: formatPrice(0, currency),
      vatLabel: 'VAT',
      vatRate: 0,
      region: 'Unknown'
    };
  }

  const { totals, region_info } = vatCalculations;
  const effectiveVatRate = totals.effective_vat_rate || 0;

  return {
    netAmount: formatPrice(totals.total_net || totals.net, currency),
    vatAmount: formatPrice(totals.total_vat || totals.vat, currency),
    grossAmount: formatPrice(totals.total_gross || totals.gross, currency),
    vatLabel: formatVatLabel(effectiveVatRate),
    vatRate: effectiveVatRate,
    region: region_info?.region || 'Unknown'
  };
};
