import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Badge, Form } from 'react-bootstrap';
import { useCart } from '../contexts/CartContext';
import { generateProductCode } from '../utils/productCodeGenerator';
import RulesEngineDisplay from './RulesEngineDisplay';
import rulesEngineService from '../services/rulesEngineService';
import httpService from '../services/httpService';

const CheckoutSteps = ({ onComplete, rulesMessages: initialRulesMessages }) => {
  const { cartItems } = useCart();
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [rulesMessages, setRulesMessages] = useState(initialRulesMessages || []);
  const [optionalSelections, setOptionalSelections] = useState({});
  const [userSelections, setUserSelections] = useState({});
  const [vatCalculations, setVatCalculations] = useState(null);
  const [vatLoading, setVatLoading] = useState(false);

  // Separate optional and mandatory rules
  const optionalRules = rulesMessages.filter(msg => !msg.requires_acknowledgment);
  const mandatoryRules = rulesMessages.filter(msg => msg.requires_acknowledgment);

  // Update rulesMessages when initialRulesMessages changes
  useEffect(() => {
    setRulesMessages(initialRulesMessages || []);
  }, [initialRulesMessages]);

  // Load VAT calculations when component mounts or cart changes
  useEffect(() => {
    const calculateVAT = async () => {
      if (cartItems.length === 0) return;
      
      setVatLoading(true);
      try {
        const result = await rulesEngineService.calculateVAT(cartItems);
        if (result.success) {
          setVatCalculations(result);
        }
      } catch (err) {
        console.error('Error calculating VAT:', err);
        setError('Failed to calculate VAT. Please refresh the page.');
      } finally {
        setVatLoading(false);
      }
    };

    calculateVAT();
  }, [cartItems]);

  // Load user's previous selections
  useEffect(() => {
    const loadUserSelections = async () => {
      try {
        const result = await rulesEngineService.getUserSelections('checkout_start');
        if (result.success) {
          setUserSelections(result.selections);
          // Set initial optional selections based on previous choices
          const initialSelections = {};
          Object.values(result.selections).forEach(selection => {
            if (selection.acknowledgment_type === 'optional') {
              initialSelections[selection.rule_id] = selection.is_selected;
            }
          });
          setOptionalSelections(initialSelections);
        }
      } catch (err) {
        console.error('Error loading user selections:', err);
      }
    };

    loadUserSelections();
  }, []);

  // Test email functionality
  const handleTestEmail = async () => {
    try {
      setLoading(true);
      const response = await httpService.post('/auth/test-email/', {
        email: 'eugenelo1030@gmail.com'
      });
      
      if (response.data.success) {
        setSuccess('Test email sent successfully! Check your email.');
      } else {
        setError('Failed to send test email.');
      }
    } catch (err) {
      setError('Error sending test email: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { title: 'Cart Review', description: 'Review your items' },
    { title: 'Important Notes & Options', description: 'Review optional preferences' },
    { title: 'Terms & Conditions', description: 'Review and accept terms' },
    { title: 'Payment', description: 'Complete payment' },
    { title: 'Confirmation', description: 'Order confirmation' }
  ];

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleOptionalRuleChange = async (ruleId, isSelected) => {
    try {
      setOptionalSelections(prev => ({
        ...prev,
        [ruleId]: isSelected
      }));

      // Save selection to backend
      await rulesEngineService.selectOptionalRule(ruleId, null, isSelected);
    } catch (err) {
      console.error('Error saving optional rule selection:', err);
      setError('Failed to save your selection. Please try again.');
    }
  };

  const handleMandatoryRulesComplete = () => {
    handleNext();
  };

  const canProceedToPayment = () => {
    // Check if all mandatory rules have been acknowledged
    return mandatoryRules.length === 0 || 
           mandatoryRules.every(rule => userSelections[rule.rule_id]?.acknowledgment_type === 'required');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="cart-review">
            <h4>Review Your Order</h4>
            
            {/* Test Email Button - for development/testing */}
            <div className="mb-3 p-3 border rounded bg-light">
              <h6>Email Test (Development)</h6>
              <p className="text-muted small">Test the email functionality before completing your order</p>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={handleTestEmail}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Test Email'}
              </Button>
            </div>
            
            {cartItems.length === 0 ? (
              <Alert variant="info">Your cart is empty.</Alert>
            ) : (
              <div className="cart-items">
                {cartItems.map((item, index) => (
                  <Card key={index} className="mb-3">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">{item.product_name}</h6>
                          <p className="text-muted mb-1">
                            Code: {generateProductCode(item)}
                          </p>
                          <p className="text-muted mb-1">
                            Subject: {item.subject_code} | Session: {item.exam_session_code}
                          </p>
                          <Badge variant="secondary" className="me-2">
                            {item.product_type}
                          </Badge>
                          <Badge variant="info">
                            {item.metadata?.variationName || 'Standard'}
                          </Badge>
                        </div>
                        <div className="text-end">
                          <p className="mb-0 fw-bold">£{item.actual_price}</p>
                          <small className="text-muted">Qty: {item.quantity}</small>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
                
                {/* Order Totals Card */}
                <Card className="mt-3">
                  <Card.Header>
                    <h6 className="mb-0">Order Summary</h6>
                  </Card.Header>
                  <Card.Body>
                    {vatLoading ? (
                      <div className="text-center py-3">
                        <div className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        Calculating VAT...
                      </div>
                    ) : vatCalculations ? (
                      <div>
                        <div className="d-flex justify-content-between">
                          <span>Subtotal:</span>
                          <span>£{vatCalculations.totals?.subtotal?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>VAT ({vatCalculations.user_country || 'UK'}):</span>
                          <span>£{vatCalculations.totals?.total_vat?.toFixed(2) || '0.00'}</span>
                        </div>
                        <hr />
                        <div className="d-flex justify-content-between fw-bold">
                          <span>Total:</span>
                          <span>£{vatCalculations.totals?.total_gross?.toFixed(2) || '0.00'}</span>
                        </div>
                        
                        {/* VAT Calculation Details */}
                        {vatCalculations.vat_calculations && vatCalculations.vat_calculations.length > 0 && (
                          <div className="mt-3">
                            <small className="text-muted">
                              <details>
                                <summary style={{ cursor: 'pointer' }}>VAT Calculation Details</summary>
                                <div className="mt-2">
                                  {vatCalculations.vat_calculations.map((calc, index) => (
                                    <div key={index} className="mb-2">
                                      <strong>{calc.rule_name}</strong>
                                      <br />
                                      <small>
                                        Type: {calc.result?.calculation_type}<br />
                                        Rate: {((calc.result?.vat_rate || 0) * 100).toFixed(1)}%<br />
                                        Applied: {new Date(calc.applied_at).toLocaleString()}
                                      </small>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </small>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-end">
                        <h5>
                          Total: £{cartItems.reduce((total, item) => 
                            total + (parseFloat(item.actual_price) * item.quantity), 0
                          ).toFixed(2)}
                        </h5>
                        <small className="text-muted">VAT calculation pending...</small>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="optional-rules">
            <h4>Important Notes & Options</h4>
            {optionalRules.length > 0 ? (
              <>
                <p className="text-muted mb-4">
                  Based on your cart items, we have some optional recommendations and preferences. 
                  Please review and select any that apply to you.
                </p>
                {optionalRules.map((rule, index) => (
                  <Card key={`${rule.rule_id}-${index}`} className="mb-3">
                    <Card.Header className="bg-info">
                      <h6 className="mb-0 text-white">
                        {rule.title || `Optional Preference ${index + 1}`}
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      <div 
                        dangerouslySetInnerHTML={{ __html: rule.content || rule.message }} 
                      />
                      
                      <div className="mt-3">
                        <Form.Check
                          type="checkbox"
                          id={`optional-rule-${rule.rule_id}`}
                          label="Yes, I would like this option"
                          checked={optionalSelections[rule.rule_id] || false}
                          onChange={(e) => handleOptionalRuleChange(rule.rule_id, e.target.checked)}
                        />
                      </div>
                      
                      {userSelections[rule.rule_id] && (
                        <div className="mt-2">
                          <Alert variant="success" className="mb-0 py-2">
                            <small>
                              ✓ Saved (Last updated: {new Date(userSelections[rule.rule_id].acknowledged_at).toLocaleString()})
                            </small>
                          </Alert>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                ))}
              </>
            ) : (
              <Alert variant="info">
                No optional preferences available for your current selection.
              </Alert>
            )}
          </div>
        );

      case 3:
        return (
          <div className="mandatory-rules">
            <h4>Terms & Conditions</h4>
            {mandatoryRules.length > 0 ? (
              <RulesEngineDisplay
                messages={mandatoryRules}
                onComplete={handleMandatoryRulesComplete}
                displayMode="inline"
              />
            ) : (
              <Alert variant="info">
                No terms and conditions to display. You may proceed to the next step.
              </Alert>
            )}
          </div>
        );

      case 4:
        return (
          <div className="payment">
            <h4>Payment</h4>
            {/* Add your payment form/component here */}
            <p>Payment integration will go here</p>
          </div>
        );

      case 5:
        return (
          <div className="confirmation">
            <h4>Order Confirmation</h4>
            <Alert variant="success">
              Your order has been placed successfully! Thank you for your purchase.
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  const renderProgressIndicator = () => (
    <div className="checkout-progress mb-4">
      <div className="progress-container d-flex justify-content-between align-items-center">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <React.Fragment key={stepNumber}>
              <div className="step-item text-center">
                <div 
                  className={`step-circle mx-auto mb-2 d-flex align-items-center justify-content-center ${
                    isCompleted ? 'bg-success text-white' : 
                    isCurrent ? 'bg-primary text-white' : 
                    'bg-light text-muted'
                  }`}
                  style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                >
                  {isCompleted ? '✓' : stepNumber}
                </div>
                <h6 className={`step-title mb-1 ${isCurrent ? 'text-primary' : ''}`}>
                  {step.title}
                </h6>
                <small className="text-muted">{step.description}</small>
              </div>
              
              {index < steps.length - 1 && (
                <div 
                  className={`step-connector flex-grow-1 mx-3 ${
                    isCompleted ? 'bg-success' : 'bg-light'
                  }`}
                  style={{ height: '2px', marginTop: '20px' }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  const renderNavigationButtons = () => (
    <div className="d-flex justify-content-between mt-4">
      <Button 
        variant="outline-secondary" 
        onClick={handleBack}
        disabled={currentStep === 1 || loading}
      >
        Back
      </Button>
      
      <div>
        {error && <Alert variant="danger" className="mb-2">{error}</Alert>}
        {success && <Alert variant="success" className="mb-2">{success}</Alert>}
        
        {currentStep < steps.length ? (
          <Button 
            variant="primary" 
            onClick={currentStep === 4 ? onComplete : handleNext}
            disabled={
              loading || 
              (currentStep === 3 && !canProceedToPayment())
            }
          >
            {loading ? 'Processing...' : currentStep === 4 ? 'Complete Order' : 'Next'}
          </Button>
        ) : (
          <Button variant="success" onClick={() => window.location.href = '/products'}>
            Continue Shopping
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Card className="checkout-steps">
      <Card.Header>
        <h5 className="mb-0">Checkout Process</h5>
      </Card.Header>
      <Card.Body>
        {renderProgressIndicator()}
        
        <div className="step-content">
          {renderStepContent()}
        </div>
        
        {renderNavigationButtons()}
      </Card.Body>
    </Card>
  );
};

export default CheckoutSteps; 