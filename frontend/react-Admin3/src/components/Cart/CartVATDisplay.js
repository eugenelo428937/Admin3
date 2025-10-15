/**
 * CartVATDisplay Component (Phase 4, Task T041)
 *
 * Displays VAT calculation details for a cart or cart item:
 * - Net amount (VAT-exclusive price)
 * - VAT amount (calculated VAT)
 * - Gross amount (total including VAT)
 * - VAT rate badge (percentage)
 * - Regional label (UK VAT, SA VAT, etc.)
 *
 * Props:
 * - netAmount (number): Net price excluding VAT
 * - vatAmount (number): VAT amount
 * - grossAmount (number): Total price including VAT
 * - vatRate (number): VAT rate as decimal (e.g., 0.2000 for 20%)
 * - vatRegion (string): VAT region code (UK, SA, IE, ROW, etc.)
 * - currency (string): Currency code (GBP, USD, ZAR, etc.)
 * - className (string): Optional custom CSS class
 */
import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import PropTypes from 'prop-types';

const CartVATDisplay = ({
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
  const formatCurrency = (amount) => {
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
  const formatRate = () => {
    if (vatRate == null) return '0%';
    const percentage = Math.round(vatRate * 100);
    return `${percentage}%`;
  };

  /**
   * Get regional VAT label
   */
  const getRegionalLabel = () => {
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

CartVATDisplay.propTypes = {
  netAmount: PropTypes.number.isRequired,
  vatAmount: PropTypes.number.isRequired,
  grossAmount: PropTypes.number.isRequired,
  vatRate: PropTypes.number.isRequired,
  vatRegion: PropTypes.string,
  currency: PropTypes.string,
  className: PropTypes.string
};

export default CartVATDisplay;
