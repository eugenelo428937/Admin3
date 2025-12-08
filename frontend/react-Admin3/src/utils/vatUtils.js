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
 * Base VAT rates by region.
 * These are the standard VAT rates for each region, used for display purposes.
 * Actual VAT calculations are done by the backend Rules Engine.
 */
export const BASE_VAT_RATES = {
  'UK': 0.20,    // 20% UK VAT
  'IE': 0.23,    // 23% Ireland VAT
  'SA': 0.15,    // 15% South Africa VAT
  'ROW': 0.00,   // 0% Rest of World (no VAT)
  'CH': 0.00,    // 0% Switzerland (no VAT)
  'GG': 0.00,    // 0% Guernsey (no VAT)
  'JE': 0.00,    // 0% Jersey (no VAT)
  'EU': 0.00,    // 0% EU (reverse charge for B2B)
  'UNKNOWN': 0.00
};

/**
 * Get base VAT rate for a region.
 *
 * @param {string} region - VAT region code (UK, IE, SA, ROW, etc.)
 * @returns {number} Base VAT rate as decimal (e.g., 0.20 for 20%)
 *
 * @example
 * getBaseVatRate('UK')  // 0.20
 * getBaseVatRate('IE')  // 0.23
 * getBaseVatRate('ROW') // 0.00
 */
export const getBaseVatRate = (region) => {
  return BASE_VAT_RATES[region] || BASE_VAT_RATES['UNKNOWN'];
};

/**
 * Get region display name.
 *
 * @param {string} region - VAT region code
 * @returns {string} Human-readable region name
 */
export const getRegionDisplayName = (region) => {
  const regionNames = {
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
  return regionNames[region] || region || 'Unknown';
};

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
    region: region_info?.region || 'Unknown'
  };
};
