/**
 * VAT Utility Functions
 *
 * Centralized utility functions for VAT-related formatting and display logic.
 * Used across product cards, cart components, and checkout flows.
 */

/**
 * Format VAT label with percentage
 * @param {number} effectiveVatRate - VAT rate as decimal (e.g., 0.20 for 20%)
 * @returns {string} Formatted VAT label (e.g., "VAT (20%)")
 */
export const formatVatLabel = (effectiveVatRate) => {
  if (effectiveVatRate !== undefined && effectiveVatRate !== null) {
    const percentage = (effectiveVatRate * 100).toFixed(0);
    return `VAT (${percentage}%)`;
  }
  return 'VAT';
};

/**
 * Get VAT status display text based on status code
 * @param {string} vatStatus - VAT status code from backend
 * @returns {string} Human-readable VAT status text
 */
export const getVatStatusDisplay = (vatStatus) => {
  const statusMap = {
    'standard': 'Price includes VAT',
    'zero': 'VAT exempt',
    'reverse_charge': 'Reverse charge applies'
  };
  return statusMap[vatStatus] || 'Price includes VAT';
};

/**
 * Format price with currency symbol
 * @param {number} price - Price value
 * @param {string} currency - Currency symbol (default: '£')
 * @returns {string} Formatted price string
 */
export const formatPrice = (price, currency = '£') => {
  if (price === undefined || price === null) {
    return `${currency}0.00`;
  }
  return `${currency}${parseFloat(price).toFixed(2)}`;
};

/**
 * Determine VAT rate based on region and product code
 * Simplified frontend logic based on backend product_classifier.py
 * @param {string} region - User's VAT region (UK, EU, ROW, SA, etc.)
 * @param {string} productCode - Product code (e.g., EBOOK, DOWNLOAD, etc.)
 * @returns {number} VAT rate as decimal (e.g., 0.20 for 20%)
 */
export const getVatRate = (region, productCode = '') => {
  const code = productCode ? productCode.toUpperCase() : '';

  // UK eBooks are zero-rated
  if (region === 'UK' && code.includes('EBOOK')) {
    return 0.00;
  }

  // ROW digital products are zero-rated
  if (region === 'ROW' && (code.includes('DOWNLOAD') || code.includes('PDF') || code.includes('ONLINE'))) {
    return 0.00;
  }

  // Standard rates by region
  const standardRates = {
    'UK': 0.20,    // 20%
    'SA': 0.15,    // 15%
    'EU': 0.00,    // Zero-rated for EU customers
    'ROW': 0.00    // Zero-rated for ROW customers
  };

  return standardRates[region] || 0.00;
};

/**
 * Calculate VAT amount and gross total
 * @param {number} netAmount - Net price (excluding VAT)
 * @param {number} vatRate - VAT rate as decimal (e.g., 0.20 for 20%)
 * @returns {object} { vatAmount, grossAmount, vatRate }
 */
export const calculateVat = (netAmount, vatRate) => {
  const net = parseFloat(netAmount) || 0;
  const rate = parseFloat(vatRate) || 0;
  const vatAmount = net * rate;
  const grossAmount = net + vatAmount;

  return {
    netAmount: net,
    vatAmount: parseFloat(vatAmount.toFixed(2)),
    grossAmount: parseFloat(grossAmount.toFixed(2)),
    vatRate: rate
  };
};
