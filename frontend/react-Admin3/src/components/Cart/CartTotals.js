/**
 * CartTotals Component (Phase 4, Task T044)
 *
 * Displays cart totals with VAT breakdown:
 * - Total net amount (subtotal)
 * - Total VAT amount
 * - Total gross amount (grand total)
 * - VAT breakdown by region
 * - Item count per region
 *
 * Props:
 * - totals (object): Cart totals with breakdown
 *   - totalNetAmount (number)
 *   - totalVatAmount (number)
 *   - totalGrossAmount (number)
 *   - vatBreakdown (array): Breakdown by region
 * - currency (string): Currency code (GBP, USD, ZAR, etc.)
 * - className (string): Optional custom CSS class
 */
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  Box,
  Chip
} from '@mui/material';
import PropTypes from 'prop-types';

const CartTotals = ({
  totals,
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

  // Handle missing or empty totals
  if (!totals) {
    return null;
  }

  const {
    totalNetAmount = 0,
    totalVatAmount = 0,
    totalGrossAmount = 0,
    vatBreakdown = []
  } = totals;

  // Check if cart is empty
  const isEmpty = totalGrossAmount === 0 && vatBreakdown.length === 0;

  return (
    <Card className={className} sx={{ mt: 2 }}>
      <CardContent>
        {/* Card Title */}
        <Typography variant="h6" gutterBottom>
          Cart Summary
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {isEmpty ? (
          /* Empty State */
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            No items in cart
          </Typography>
        ) : (
          <>
            {/* Subtotal (Net Amount) */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body1">
                Subtotal (excl. VAT)
              </Typography>
              <Typography variant="body1">
                {formatCurrency(totalNetAmount)}
              </Typography>
            </Box>

            {/* VAT Amount */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body1">
                VAT
              </Typography>
              <Typography variant="body1">
                {formatCurrency(totalVatAmount)}
              </Typography>
            </Box>

            {/* VAT Breakdown Section */}
            {vatBreakdown.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  VAT Breakdown:
                </Typography>
                <List dense disablePadding>
                  {vatBreakdown.map((breakdown, index) => (
                    <ListItem
                      key={index}
                      disableGutters
                      sx={{ py: 0.5 }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {breakdown.region} VAT
                            </Typography>
                            <Chip
                              label={breakdown.rate}
                              size="small"
                              sx={{ height: 18, fontSize: '0.7rem' }}
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                              {breakdown.itemCount === 1
                                ? '1 item'
                                : `${breakdown.itemCount} items`}
                            </Typography>
                          </Box>
                        }
                        secondary={formatCurrency(breakdown.amount)}
                        secondaryTypographyProps={{
                          variant: 'body2',
                          sx: { textAlign: 'right' }
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Grand Total (Gross Amount) */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Total (inc. VAT)
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 'bold'
                }}
              >
                {formatCurrency(totalGrossAmount)}
              </Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

CartTotals.propTypes = {
  totals: PropTypes.shape({
    totalNetAmount: PropTypes.number,
    totalVatAmount: PropTypes.number,
    totalGrossAmount: PropTypes.number,
    vatBreakdown: PropTypes.arrayOf(
      PropTypes.shape({
        region: PropTypes.string.isRequired,
        rate: PropTypes.string.isRequired,
        amount: PropTypes.number.isRequired,
        itemCount: PropTypes.number.isRequired
      })
    )
  }),
  currency: PropTypes.string,
  className: PropTypes.string
};

export default CartTotals;
