import React from 'react';
import { Card } from 'react-bootstrap';
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
      <div className={`vat-breakdown-compact ${className}`}>
        <div className="d-flex justify-content-between fw-bold">
          <span>Total (inc. {formatVatLabel(effective_vat_rate)}):</span>
          <span>{formatPrice(grandTotal)}</span>
        </div>
      </div>
    );
  }

  // Inline variant - simple list
  if (variant === 'inline') {
    return (
      <div className={`vat-breakdown-inline ${className}`}>
        <div className="d-flex justify-content-between">
          <span>Subtotal:</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="d-flex justify-content-between">
          <span>{formatVatLabel(effective_vat_rate)}:</span>
          <span>{formatPrice(total_vat)}</span>
        </div>
        {totalFees > 0 && (
          <div className="d-flex justify-content-between">
            <span>Fees:</span>
            <span>{formatPrice(totalFees)}</span>
          </div>
        )}
        <div className="d-flex justify-content-between fw-bold border-top pt-2 mt-2">
          <span>Total:</span>
          <span>{formatPrice(grandTotal)}</span>
        </div>
      </div>
    );
  }

  // Detailed variant - full breakdown with card
  return (
    <Card className={`vat-breakdown-detailed ${className}`}>
      <Card.Body>
        <h6 className="mb-3">Order Summary</h6>

        {/* Subtotal */}
        <div className="d-flex justify-content-between mb-2">
          <span className="text-muted">Subtotal:</span>
          <span>{formatPrice(subtotal)}</span>
        </div>

        {/* VAT */}
        <div className="d-flex justify-content-between mb-2">
          <span className="text-muted">
            {formatVatLabel(effective_vat_rate)}
            {country_code && (
              <small className="ms-1 text-muted">({country_code})</small>
            )}:
          </span>
          <span>{formatPrice(total_vat)}</span>
        </div>

        {/* Fees */}
        {fees.length > 0 && (
          <>
            <div className="border-top my-2"></div>
            {fees.map((fee, index) => (
              <div key={index} className="d-flex justify-content-between mb-2">
                <span className="text-muted">
                  {fee.name}:
                  {!fee.is_refundable && (
                    <small className="ms-1 text-danger">*</small>
                  )}
                </span>
                <span>{formatPrice(fee.amount)}</span>
              </div>
            ))}
            {fees.some(f => !f.is_refundable) && (
              <small className="text-danger d-block mb-2">
                * Non-refundable fees
              </small>
            )}
          </>
        )}

        {/* Total */}
        <div className="border-top pt-2 mt-2">
          <div className="d-flex justify-content-between">
            <strong>Total:</strong>
            <strong>{formatPrice(grandTotal)}</strong>
          </div>
        </div>

        {/* VAT Notice */}
        {vat_rate && parseFloat(vat_rate) > 0 && (
          <small className="text-muted d-block mt-2">
            Prices include VAT at {parseFloat(vat_rate).toFixed(0)}%
            ({country_code || 'UK'})
          </small>
        )}
      </Card.Body>
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
