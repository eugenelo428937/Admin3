/**
 * Simple price formatting utility to replace VAT context functionality
 */

export const formatPrice = (amount) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
};

export default formatPrice;