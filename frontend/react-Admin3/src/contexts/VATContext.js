import React, { createContext, useContext, useState, useEffect } from 'react';

const VATContext = createContext();

export const useVAT = () => {
  const context = useContext(VATContext);
  if (!context) {
    throw new Error('useVAT must be used within a VATProvider');
  }
  return context;
};

export const VATProvider = ({ children }) => {
  // Default to showing prices including VAT (true = with VAT, false = without VAT)
  const [showVATInclusive, setShowVATInclusive] = useState(() => {
    const saved = localStorage.getItem('showVATInclusive');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Save preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('showVATInclusive', JSON.stringify(showVATInclusive));
  }, [showVATInclusive]);

  // Standard UK VAT rate (20%)
  const DEFAULT_VAT_RATE = 0.20;

  // Calculate price with or without VAT
  const calculatePrice = (basePrice, vatRate = DEFAULT_VAT_RATE, isVATExempt = false) => {
    const price = parseFloat(basePrice);
    if (isNaN(price)) return 0;

    if (isVATExempt) {
      // VAT exempt products show the same price regardless of toggle
      return price;
    }

    if (showVATInclusive) {
      // Showing VAT inclusive prices
      return price * (1 + vatRate);
    } else {
      // Showing VAT exclusive prices (net)
      return price;
    }
  };

  // Calculate VAT amount
  const calculateVATAmount = (basePrice, vatRate = DEFAULT_VAT_RATE, isVATExempt = false) => {
    const price = parseFloat(basePrice);
    if (isNaN(price) || isVATExempt) return 0;
    return price * vatRate;
  };

  // Get price display info
  const getPriceDisplay = (basePrice, vatRate = DEFAULT_VAT_RATE, isVATExempt = false) => {
    const price = parseFloat(basePrice);
    if (isNaN(price)) return { displayPrice: 0, label: '', vatAmount: 0, netPrice: price };

    const netPrice = price;
    const vatAmount = isVATExempt ? 0 : price * vatRate;
    const grossPrice = netPrice + vatAmount;

    if (isVATExempt) {
      return {
        displayPrice: price,
        label: '(VAT exempt)',
        vatAmount: 0,
        netPrice: price,
        grossPrice: price
      };
    }

    if (showVATInclusive) {
      return {
        displayPrice: grossPrice,
        label: '(inc. VAT)',
        vatAmount,
        netPrice,
        grossPrice
      };
    } else {
      return {
        displayPrice: netPrice,
        label: '(ex. VAT)',
        vatAmount,
        netPrice,
        grossPrice
      };
    }
  };

  // Format price for display
  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Get VAT exempt product types
  const VAT_EXEMPT_TYPES = ['book', 'educational_material'];

  // Check if a product is VAT exempt
  const isProductVATExempt = (productType) => {
    return VAT_EXEMPT_TYPES.includes(productType?.toLowerCase());
  };

  const toggleVATDisplay = () => {
    setShowVATInclusive(prev => !prev);
  };

  const value = {
    showVATInclusive,
    setShowVATInclusive,
    toggleVATDisplay,
    calculatePrice,
    calculateVATAmount,
    getPriceDisplay,
    formatPrice,
    isProductVATExempt,
    DEFAULT_VAT_RATE,
    VAT_EXEMPT_TYPES
  };

  return (
    <VATContext.Provider value={value}>
      {children}
    </VATContext.Provider>
  );
};

export default VATContext; 