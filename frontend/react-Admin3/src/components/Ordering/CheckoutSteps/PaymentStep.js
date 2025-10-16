import React, { useEffect, useState } from 'react';
import { Form, Alert, Button } from 'react-bootstrap';
import { Snackbar, Alert as MuiAlert } from '@mui/material';
import { useCart } from '../../../contexts/CartContext';
import rulesEngineService from '../../../services/rulesEngineService';

const PaymentStep = ({
  paymentMethod,
  setPaymentMethod,
  cardNumber,
  setCardNumber,
  cardholderName,
  setCardholderName,
  expiryMonth,
  setExpiryMonth,
  expiryYear,
  setExpiryYear,
  cvv,
  setCvv,
  employerCode,
  setEmployerCode,
  isDevelopment,
  // New props for acknowledgments
  acknowledgmentStates,
  setAcknowledgmentStates,
  requiredAcknowledgments,
  setRequiredAcknowledgments
}) => {
  const { cartData, cartItems, refreshCart } = useCart();
  const [bookingFeeNotification, setBookingFeeNotification] = useState(null);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [acknowledgmentMessages, setAcknowledgmentMessages] = useState([]);

  // Local state for acknowledgments if props not provided (backward compatibility)
  const [localAcknowledgmentStates, setLocalAcknowledgmentStates] = useState({});
  const actualAcknowledgmentStates = acknowledgmentStates || localAcknowledgmentStates;
  const actualSetAcknowledgmentStates = setAcknowledgmentStates || setLocalAcknowledgmentStates;
  const testCards = [
    { name: 'VISA Test Card', number: '4929 0000 0000 6', cvv: '123' },
    { name: 'VISA Debit', number: '4462 0000 0000 0003', cvv: '123' },
    { name: 'Mastercard', number: '5404 0000 0000 0001', cvv: '123' }
  ];

  // Execute checkout_payment rules when payment method changes
  useEffect(() => {
    const executePaymentRules = async () => {
      if (!cartData || !paymentMethod) return;

      setRulesLoading(true);
      try {
        // Sanitize cart items to ensure actual_price is never null (schema requirement)
        const sanitizedItems = cartItems.map(item => ({
          ...item,
          actual_price: item.actual_price || 0
        }));

        // Calculate cart total
        const total = sanitizedItems.reduce((sum, item) => sum + (parseFloat(item.actual_price) * item.quantity), 0);

        // Build context with cart and payment information
        const context = {
          cart: {
            id: cartData.id,
            items: sanitizedItems,
            total: total,
            user: cartData.user || null,
            session_key: cartData.session_key || null,
            has_marking: cartData.has_marking || false,
            has_material: cartData.has_material || false,
            has_tutorial: cartData.has_tutorial || false,
            created_at: cartData.created_at,
            updated_at: cartData.updated_at
          },
          payment: {
            method: paymentMethod,
            is_card: paymentMethod === 'card'
          }
        };

        const result = await rulesEngineService.executeRules(rulesEngineService.ENTRY_POINTS.CHECKOUT_PAYMENT, context);

        // Handle acknowledgment messages
        if (result.messages) {
          const inlineAcknowledgments = result.messages.filter(msg =>
            msg.type === 'acknowledge' && msg.display_type === 'inline'
          );
          setAcknowledgmentMessages(inlineAcknowledgments);

          // Reset acknowledgment states when rules change
          const newStates = {};
          inlineAcknowledgments.forEach(msg => {
            newStates[msg.ack_key] = false; // Default unchecked as per requirement
          });
          actualSetAcknowledgmentStates(newStates);

          // Pass required acknowledgments to parent
          if (setRequiredAcknowledgments && result.required_acknowledgments) {
            setRequiredAcknowledgments(result.required_acknowledgments);
          }
        } else {
          // Clear acknowledgments if no messages
          setAcknowledgmentMessages([]);
          actualSetAcknowledgmentStates({});
          if (setRequiredAcknowledgments) {
            setRequiredAcknowledgments([]);
          }
        }

        // Check if booking fee was added or removed
        if (result.updates) {
          // Check for added fees
          if (result.updates.cart_fees) {
            const bookingFee = result.updates.cart_fees.find(fee => fee.fee_type === 'tutorial_booking_fee');
            if (bookingFee) {
              setBookingFeeNotification(`£${bookingFee.amount} tutorial booking fee has been added to your cart`);
              // Refresh cart to show updated total
              await refreshCart();

              // Clear notification after 5 seconds
              setTimeout(() => setBookingFeeNotification(null), 5000);
            }
          }

          // Check for removed fees
          if (result.updates.cart_fees_removed) {
            const removedFee = result.updates.cart_fees_removed.find(fee => fee.fee_type === 'tutorial_booking_fee');
            if (removedFee && removedFee.removed) {
              setBookingFeeNotification('Tutorial booking fee has been removed from your cart');
              // Refresh cart to show updated total
              await refreshCart();

              // Clear notification after 5 seconds
              setTimeout(() => setBookingFeeNotification(null), 5000);
            }
          }
        }
      } catch (err) {
        console.error('Error executing payment rules:', err);
      } finally {
        setRulesLoading(false);
      }
    };

    executePaymentRules();
  }, [paymentMethod, cartData?.id]); // Only depend on cartData.id, not cartItems to avoid loop

  const handleCardSelection = (card) => {
    setCardNumber(card.number);
    setCvv(card.cvv);
    setExpiryMonth('12');
    setExpiryYear('25');
    setCardholderName('Test User');
  };

  const handleAcknowledgmentChange = async (ackKey, checked) => {
    // Update local state
    actualSetAcknowledgmentStates(prev => ({
      ...prev,
      [ackKey]: checked
    }));

    // Send acknowledgment to backend session
    try {
      // Find the message associated with this ackKey to get the correct message_id
      const associatedMessage = acknowledgmentMessages.find(msg => msg.ack_key === ackKey);
      const messageId = associatedMessage?.template_id || 'tutorial_credit_card_acknowledgment_v1';

      const acknowledgmentData = {
        ackKey: ackKey,
        message_id: messageId,
        acknowledged: checked,
        entry_point_location: 'checkout_payment'
      };

      const response = await rulesEngineService.acknowledgeRule(acknowledgmentData);

      if (response.success) {

      } else {
        console.error('💳 [PaymentStep] Failed to save acknowledgment:', response);
      }
    } catch (error) {
      console.error('💳 [PaymentStep] Error saving acknowledgment:', error);
      // Don't block the UI - acknowledgment state is still updated locally
    }
  };

  return (
    <div>
      <h4>Step 3: Payment</h4>

      <Form>
        <Form.Group className="mb-3">
          <Form.Label>Payment Method</Form.Label>
          <div>
            <Form.Check
              type="radio"
              id="payment-card"
              name="payment-method"
              label="Credit/Debit Card"
              checked={paymentMethod === 'card'}
              onChange={() => setPaymentMethod('card')}
            />
            <Form.Check
              type="radio"
              id="payment-invoice"
              name="payment-method"
              label="Invoice (Corporate accounts only)"
              checked={paymentMethod === 'invoice'}
              onChange={() => setPaymentMethod('invoice')}
            />
          </div>
        </Form.Group>

        {/* Display acknowledgment messages for this payment step */}
        {acknowledgmentMessages.length > 0 && (
          <div className="mb-4">
            {acknowledgmentMessages.map((message) => (
              <div key={message.ack_key} className="border rounded p-3 mb-3" style={{ backgroundColor: '#f8f9fa' }}>
                <h6 className="mb-2">{message.title}</h6>
                <p className="mb-3 text-muted">
                  {message.content?.content?.message || message.content}
                </p>
                <Form.Check
                  type="checkbox"
                  id={`ack-${message.ack_key}`}
                  label={message.content?.content?.checkbox_text || "I acknowledge and agree"}
                  checked={actualAcknowledgmentStates[message.ack_key] || false}
                  onChange={(e) => handleAcknowledgmentChange(message.ack_key, e.target.checked)}
                  className="fw-bold"
                />
                {message.required && (
                  <small className="text-danger d-block mt-1">
                    * This acknowledgment is required to proceed
                  </small>
                )}
              </div>
            ))}
          </div>
        )}

        {paymentMethod === 'card' && (
          <div>
            {isDevelopment && (
              <Alert variant="info" className="mb-3">
                <strong>Development Mode:</strong> Use test cards below
                <div className="mt-2">
                  {testCards.map((card, index) => (
                    <Button
                      key={index}
                      variant="outline-secondary"
                      size="sm"
                      className="me-2 mb-2"
                      onClick={() => handleCardSelection(card)}
                    >
                      {card.name}
                    </Button>
                  ))}
                </div>
              </Alert>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Card Number</Form.Label>
              <Form.Control
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="1234 5678 9012 3456"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Cardholder Name</Form.Label>
              <Form.Control
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="John Doe"
              />
            </Form.Group>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Expiry Month</Form.Label>
                  <Form.Select
                    value={expiryMonth}
                    onChange={(e) => setExpiryMonth(e.target.value)}
                  >
                    <option value="">Select Month</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                        {String(i + 1).padStart(2, '0')}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Expiry Year</Form.Label>
                  <Form.Select
                    value={expiryYear}
                    onChange={(e) => setExpiryYear(e.target.value)}
                  >
                    <option value="">Select Year</option>
                    {Array.from({ length: 10 }, (_, i) => {
                      const year = String(new Date().getFullYear() + i).slice(-2);
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      );
                    })}
                  </Form.Select>
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>CVV</Form.Label>
              <Form.Control
                type="text"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                placeholder="123"
                style={{ maxWidth: '100px' }}
              />
            </Form.Group>
          </div>
        )}

        {paymentMethod === 'invoice' && (
          <Form.Group className="mb-3">
            <Form.Label>Employer Code</Form.Label>
            <Form.Control
              type="text"
              value={employerCode}
              onChange={(e) => setEmployerCode(e.target.value)}
              placeholder="Enter your employer code"
            />
            <Form.Text className="text-muted">
              Corporate customers only. Please contact us if you don't have an employer code.
            </Form.Text>
          </Form.Group>
        )}
      </Form>

      {/* MUI Snackbar for booking fee notification */}
      <Snackbar
        open={!!bookingFeeNotification}
        autoHideDuration={5000}
        onClose={() => setBookingFeeNotification(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <MuiAlert
          onClose={() => setBookingFeeNotification(null)}
          severity="info"
          sx={{ width: '100%' }}
        >
          {bookingFeeNotification}
        </MuiAlert>
      </Snackbar>
    </div>
  );
};

export default PaymentStep;