/**
 * CartVATDisplay Component (Phase 4, Task T041)
 *
 * Displays VAT calculation details for a cart or cart item:
 * - Net amount (VAT-exclusive price)
 * - VAT amount (calculated VAT)
 * - Gross amount (total including VAT)
 * - VAT rate badge (percentage)
 * - Regional label (UK VAT, SA VAT, etc.)
 */
import React from 'react';
import { Box, Typography, Chip } from '@mui/material';

interface CartVATDisplayProps {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  vatRate: number;
  vatRegion?: string;
  currency?: string;
  className?: string;
}

const CartVATDisplay: React.FC<CartVATDisplayProps> = ({
  netAmount,
  vatAmount,
  grossAmount,
  vatRate,
  vatRegion,
  currency = 'GBP',
  className = ''
}) => {
  /**
   * Format currency based on currency code
   */
  const formatCurrency = (amount: number | null | undefined): string => {
    // Handle null/undefined
    if (amount == null) return '-';

    // Round to 2 decimal places
    const rounded = Math.round(amount * 100) / 100;

    // Format with thousand separators
    const formatted = rounded.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    // Add currency symbol
    switch (currency) {
      case 'USD':
        return `$${formatted}`;
      case 'ZAR':
        return `R${formatted}`;
      case 'EUR':
        return `€${formatted}`;
      case 'GBP':
      default:
        return `£${formatted}`;
    }
  };

  /**
   * Format VAT rate as percentage
   */
  const formatRate = (): string => {
    if (vatRate == null) return '0%';
    const percentage = Math.round(vatRate * 100);
    return `${percentage}%`;
  };

  /**
   * Get regional VAT label
   */
  const getRegionalLabel = (): string => {
    if (!vatRegion) return 'VAT';
    return `${vatRegion} VAT`;
  };

  return (
    <Box
      className={className}
      sx={{
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}
    >
      {/* Net Amount (VAT-exclusive) */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          Net Price
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          {formatCurrency(netAmount)}
        </Typography>
      </Box>

      {/* VAT Amount with Rate Badge */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {getRegionalLabel()}
          </Typography>
          <Chip
            label={formatRate()}
            size="small"
            color="default"
            sx={{ height: 20, fontSize: '0.75rem' }}
          />
        </Box>
        <Typography variant="body2" color="text.secondary">
          {formatCurrency(vatAmount)}
        </Typography>
      </Box>

      {/* Divider */}
      <Box sx={{ borderTop: '1px solid', borderColor: 'divider', my: 0.5 }} />

      {/* Gross Total */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          Total (inc. VAT)
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {formatCurrency(grossAmount)}
        </Typography>
      </Box>
    </Box>
  );
};

export default CartVATDisplay;
