import React from 'react';
import { Form, Alert, Button } from 'react-bootstrap';

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
  isDevelopment
}) => {
  const testCards = [
    { name: 'VISA Test Card', number: '4929 0000 0000 6', cvv: '123' },
    { name: 'VISA Debit', number: '4462 0000 0000 0003', cvv: '123' },
    { name: 'Mastercard', number: '5404 0000 0000 0001', cvv: '123' }
  ];

  const handleCardSelection = (card) => {
    setCardNumber(card.number);
    setCvv(card.cvv);
    setExpiryMonth('12');
    setExpiryYear('25');
    setCardholderName('Test User');
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
    </div>
  );
};

export default PaymentStep;