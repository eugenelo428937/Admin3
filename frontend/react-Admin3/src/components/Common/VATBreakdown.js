import React from 'react';
import { Card, CardContent, Typography, Box, Divider } from '@mui/material';
import { formatVatLabel, formatPrice } from '../../utils/vatUtils';
import PropTypes from 'prop-types';

/**
 * VATBreakdown Component
 *
 * Displays a detailed breakdown of VAT calculations from the backend.
 * Can be used in cart, checkout, and order confirmation screens.
 *
 * @param {Object} vatCalculations - VAT calculation data from backend
 * @param {Array} fees - Optional cart fees
 * @param {string} variant - Display variant: 'compact', 'detailed', 'inline'
 * @param {string} className - Additional CSS classes
 */
const VATBreakdown = ({
  vatCalculations,
  fees = [],
  variant = 'detailed',
  className = ''
}) => {
  if (!vatCalculations || !vatCalculations.totals) {
    return null;
  }

  const { totals, country_code, vat_rate } = vatCalculations;
  const {
    subtotal = 0,
    total_vat = 0,
    total_gross = 0,
    effective_vat_rate
  } = totals;

  // Calculate total fees
  const totalFees = fees.reduce((sum, fee) => sum + (parseFloat(fee.amount) || 0), 0);
  const grandTotal = total_gross + totalFees;

  // Compact variant - single line summary
  if (variant === 'compact') {
    return (
      <Box className={`vat-breakdown-compact ${className}`}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
          <Typography component="span">Total (inc. {formatVatLabel(effective_vat_rate)}):</Typography>
          <Typography component="span">{formatPrice(grandTotal)}</Typography>
        </Box>
      </Box>
    );
  }

  // Inline variant - simple list
  if (variant === 'inline') {
    return (
      <Box className={`vat-breakdown-inline ${className}`}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography component="span">Subtotal:</Typography>
          <Typography component="span">{formatPrice(subtotal)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography component="span">{formatVatLabel(effective_vat_rate)}:</Typography>
          <Typography component="span">{formatPrice(total_vat)}</Typography>
        </Box>
        {totalFees > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography component="span">Fees:</Typography>
            <Typography component="span">{formatPrice(totalFees)}</Typography>
          </Box>
        )}
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', pt: 2 }}>
          <Typography component="span">Total:</Typography>
          <Typography component="span">{formatPrice(grandTotal)}</Typography>
        </Box>
      </Box>
    );
  }

  // Detailed variant - full breakdown with card
  return (
    <Card className={`vat-breakdown-detailed ${className}`}>
      <CardContent>
        <Typography variant="h6" component="h6" sx={{ mb: 3 }}>Order Summary</Typography>

        {/* Subtotal */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">Subtotal:</Typography>
          <Typography variant="body2">{formatPrice(subtotal)}</Typography>
        </Box>

        {/* VAT */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {formatVatLabel(effective_vat_rate)}
            {country_code && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                ({country_code})
              </Typography>
            )}:
          </Typography>
          <Typography variant="body2">{formatPrice(total_vat)}</Typography>
        </Box>

        {/* Fees */}
        {fees.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            {fees.map((fee, index) => (
              <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {fee.name}:
                  {!fee.is_refundable && (
                    <Typography component="span" variant="caption" color="error" sx={{ ml: 1 }}>*</Typography>
                  )}
                </Typography>
                <Typography variant="body2">{formatPrice(fee.amount)}</Typography>
              </Box>
            ))}
            {fees.some(f => !f.is_refundable) && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mb: 2 }}>
                * Non-refundable fees
              </Typography>
            )}
          </>
        )}

        {/* Total */}
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2 }}>
          <Typography variant="body1" fontWeight="bold">Total:</Typography>
          <Typography variant="body1" fontWeight="bold">{formatPrice(grandTotal)}</Typography>
        </Box>

        {/* VAT Notice */}
        {vat_rate && parseFloat(vat_rate) > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
            Prices include VAT at {parseFloat(vat_rate).toFixed(0)}%
            ({country_code || 'UK'})
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

VATBreakdown.propTypes = {
  vatCalculations: PropTypes.shape({
    country_code: PropTypes.string,
    vat_rate: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    totals: PropTypes.shape({
      subtotal: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      total_vat: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      total_gross: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      effective_vat_rate: PropTypes.number
    }).isRequired
  }),
  fees: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string,
    amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    is_refundable: PropTypes.bool
  })),
  variant: PropTypes.oneOf(['compact', 'detailed', 'inline']),
  className: PropTypes.string
};

export default VATBreakdown;
