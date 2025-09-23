import React from 'react';
import { Alert, Table, Card } from 'react-bootstrap';
import { generateProductCode } from '../../../utils/productCodeGenerator';

const CartReviewStep = ({
  cartItems,
  rulesLoading,
  rulesMessages,
  vatCalculations
}) => {
  return (
    <div>
      <h4>Step 1: Review Your Cart</h4>

      <Table striped bordered hover responsive className="mt-3">
        <thead>
          <tr>
            <th>Product</th>
            <th>Code</th>
            <th>Price</th>
            <th>Qty</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {cartItems.map((item, index) => (
            <tr key={index}>
              <td>
                <strong>{item.product_name}</strong>
                <br />
                <small className="text-muted">
                  {item.subject_code} • {item.variation_name}
                </small>
              </td>
              <td>
                <code>{generateProductCode(item)}</code>
              </td>
              <td>£{parseFloat(item.actual_price).toFixed(2)}</td>
              <td>{item.quantity}</td>
              <td>£{(parseFloat(item.actual_price) * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Display rules engine messages (e.g., ASET warning) */}
      {rulesLoading && (
        <Alert variant="info" className="mt-3">
          <i className="bi bi-hourglass-split me-2"></i>
          Checking for important notices...
        </Alert>
      )}

      {!rulesLoading && rulesMessages.map((message, index) => {
        console.log('📋 [CartReviewStep] Rendering alert', index + 1, 'title:', message.content?.title);

        const variant = message.message_type === 'warning' ? 'warning' :
                      message.message_type === 'error' ? 'danger' :
                      message.message_type === 'info' ? 'info' : 'primary';

        return (
          <Alert
            key={`alert-${message.template_id}-${index}`}
            variant={variant}
            className="mt-3"
            data-testid={`rules-alert-${index}`}
            dismissible={message.content?.dismissible || false}
          >
            <Alert.Heading>
              {message.content?.icon && <i className={`bi bi-${message.content.icon} me-2`}></i>}
              {message.content?.title || 'Notice'}
            </Alert.Heading>
            <p className="mb-0">{message.content?.message || message.content}</p>
          </Alert>
        );
      })}

      {vatCalculations && (
        <Card className="mt-3">
          <Card.Header><strong>Order Summary</strong></Card.Header>
          <Card.Body>
            <div className="d-flex justify-content-between">
              <span>Subtotal:</span>
              <span>£{vatCalculations.totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span>VAT (20%):</span>
              <span>£{vatCalculations.totals.total_vat.toFixed(2)}</span>
            </div>
            {/* Display fees if present */}
            {vatCalculations.totals.total_fees > 0 && (
              <>
                <hr />
                {vatCalculations.fees?.map((fee, index) => (
                  <div key={index} className="d-flex justify-content-between">
                    <span className="text-muted">
                      {fee.description || 'Additional Fee'}:
                    </span>
                    <span>£{parseFloat(fee.amount).toFixed(2)}</span>
                  </div>
                ))}
              </>
            )}
            <hr />
            <div className="d-flex justify-content-between">
              <strong>Total:</strong>
              <strong>£{vatCalculations.totals.total_gross.toFixed(2)}</strong>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default CartReviewStep;