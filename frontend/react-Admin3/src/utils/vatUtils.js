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

/**
 * Format VAT label with percentage.
 *
 * @param {number|null} effectiveVatRate - VAT rate as decimal from API (e.g., 0.20 for 20%)
 * @returns {string} Formatted VAT label (e.g., "VAT (20%)")
 *
 * @example
 * formatVatLabel(0.20)  // "VAT (20%)"
 * formatVatLabel(0.00)  // "VAT (0%)"
 * formatVatLabel(null)  // "VAT"
 */
export const formatVatLabel = (effectiveVatRate) => {
  if (effectiveVatRate !== undefined && effectiveVatRate !== null) {
    const percentage = (effectiveVatRate * 100).toFixed(0);
    return `VAT (${percentage}%)`;
  }
  return 'VAT';
};

/**
 * Get VAT status display text based on status code from API.
 *
 * @param {string} vatStatus - VAT status code from backend
 * @returns {string} Human-readable VAT status text
 *
 * @example
 * getVatStatusDisplay('included')       // "Price includes VAT"
 * getVatStatusDisplay('exempt')         // "VAT exempt"
 * getVatStatusDisplay('reverse_charge') // "Reverse charge applies"
 */
export const getVatStatusDisplay = (vatStatus) => {
  const statusMap = {
    'included': 'Price includes VAT',
    'standard': 'Price includes VAT',
    'exempt': 'VAT exempt',
    'zero': 'VAT exempt',
    'zero_rated': 'Zero-rated for VAT',
    'reverse_charge': 'Reverse charge applies',
    'not_applicable': ''
  };
  return statusMap[vatStatus] || 'Price includes VAT';
};

/**
 * Format price with currency symbol.
 *
 * @param {number} price - Price value
 * @param {string} currency - Currency code (default: 'GBP')
 * @returns {string} Formatted price string
 *
 * @example
 * formatPrice(100.00)           // "£100.00"
 * formatPrice(100.00, 'GBP')    // "£100.00"
 * formatPrice(100.00, 'USD')    // "$100.00"
 * formatPrice(100.00, 'EUR')    // "€100.00"
 */
export const formatPrice = (price, currency = 'GBP') => {
  if (price === undefined || price === null) {
    return getCurrencySymbol(currency) + '0.00';
  }
  return getCurrencySymbol(currency) + parseFloat(price).toFixed(2);
};

/**
 * Get currency symbol for currency code.
 *
 * @param {string} currency - Currency code (GBP, USD, EUR, ZAR)
 * @returns {string} Currency symbol
 *
 * @example
 * getCurrencySymbol('GBP')  // "£"
 * getCurrencySymbol('USD')  // "$"
 * getCurrencySymbol('EUR')  // "€"
 * getCurrencySymbol('ZAR')  // "R"
 */
export const getCurrencySymbol = (currency) => {
  const symbols = {
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
 * @param {number} vatAmount - VAT amount from API
 * @param {string} currency - Currency code (default: 'GBP')
 * @returns {string} Formatted currency string
 *
 * @example
 * formatVatAmount(20.00)       // "£20.00"
 * formatVatAmount(0.00)        // "£0.00"
 * formatVatAmount(20.00, 'EUR')  // "€20.00"
 */
export const formatVatAmount = (vatAmount, currency = 'GBP') => {
  return formatPrice(vatAmount, currency);
};

/**
 * Get VAT breakdown for display from API vatCalculations.
 *
 * @param {object} vatCalculations - VAT calculations from API
 * @param {string} currency - Currency code (default: 'GBP')
 * @returns {object} VAT breakdown with formatted values
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
export const getVatBreakdown = (vatCalculations, currency = 'GBP') => {
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
    region: region_info?.region || region || 'Unknown'
  };
};
