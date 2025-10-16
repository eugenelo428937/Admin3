import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { generateProductCode } from '../../../utils/productCodeGenerator';
// TODO Phase 8: import VATBreakdown from '../../Common/VATBreakdown';

const CartSummaryPanel = ({
  cartItems = [],
  vatCalculations,
  isCollapsed = false,
  onToggleCollapse = () => {},
  paymentMethod = 'card'
}) => {
  const containerStyle = {
    transition: 'all 0.3s ease-in-out',
    overflow: 'hidden'
  };

  const renderCollapsedView = () => (
    <Card className="h-100" style={containerStyle}>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Cart Summary</h6>
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => onToggleCollapse(false)}
          aria-label="expand cart summary"
        >
          <i className="bi bi-chevron-right"></i> Expand
        </Button>
      </Card.Header>
      <Card.Body className="text-center">
        <div className="mb-2">
          <small className="text-muted">{cartItems.length} items</small>
        </div>
        {vatCalculations && (
          <div>
            <strong>Total: £{(
              paymentMethod === 'card'
                ? vatCalculations.totals.total_gross
                : vatCalculations.totals.total_gross - vatCalculations.totals.total_fees
            ).toFixed(2)}</strong>
          </div>
        )}
      </Card.Body>
    </Card>
  );

  const renderExpandedView = () => (
    <Card className="h-100" style={containerStyle}>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h6 className="mb-0">Cart Summary</h6>
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => onToggleCollapse(true)}
          aria-label="collapse cart summary"
        >
          <i className="bi bi-chevron-left"></i> Collapse
        </Button>
      </Card.Header>
      <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {/* Cart Items */}
        {cartItems.map((item, index) => (
          <div key={index} className="border-bottom pb-2 mb-2">
            <div className="d-flex justify-content-between align-items-start">
              <div className="flex-grow-1">
                <small className="fw-bold">{item.product_name}</small>
                <br />
                <small className="text-muted">
                  {item.subject_code} • {item.variation_name}
                </small>
                <br />
                <small className="text-muted">
                  Code: {generateProductCode(item)}
                </small>
              </div>
              <div className="text-end">
                <small>Qty: {item.quantity}</small>
                <br />
                <small className="fw-bold">
                  £{(parseFloat(item.actual_price) * item.quantity).toFixed(2)}
                </small>
              </div>
            </div>
          </div>
        ))}

        {/* Order Summary */}
        {vatCalculations && (
          <div className="border-top pt-2">
            {/* TODO Phase 8: VATBreakdown component
            <VATBreakdown
              vatCalculations={vatCalculations}
              fees={vatCalculations.fees}
              variant="inline"
              className=""
            />
            */}
          </div>
        )}
      </Card.Body>
    </Card>
  );

  return isCollapsed ? renderCollapsedView() : renderExpandedView();
};

export default CartSummaryPanel;