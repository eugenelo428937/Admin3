import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, Badge, Form, Table, Modal } from 'react-bootstrap';
import { useCart } from '../contexts/CartContext';
import { generateProductCode } from '../utils/productCodeGenerator';
import RulesEngineDisplay from './RulesEngineDisplay';
import rulesEngineService from '../services/rulesEngineService';
import httpService from '../services/httpService';
import config from "../config";
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
  
  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' or 'invoice'
  const [employerCode, setEmployerCode] = useState('');
  
  // Card payment state
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [showTestCards, setShowTestCards] = useState(false);
  const [isDevelopment, setIsDevelopment] = useState(false);

  // Test card data from Opayo documentation
  const testCards = [
    {
      name: 'VISA (3D Secure)',
      number: '4929 0000 0000 6',
      cvv: '123',
      description: 'VISA card with 3D Secure authentication'
    },
    {
      name: 'VISA (No 3D Secure)',
      number: '4929 0000 0555 9',
      cvv: '123',
      description: 'VISA card without 3D Secure'
    },
    {
      name: 'VISA (3D Secure Unavailable)',
      number: '4929 0000 0001 4',
      cvv: '123',
      description: 'VISA card with 3D Secure unavailable'
    },
    {
      name: 'VISA (3D Secure Error)',
      number: '4929 0000 0002 2',
      cvv: '123',
      description: 'VISA card with 3D Secure error'
    },
    {
      name: 'VISA Corporate',
      number: '4484 0000 0000 2',
      cvv: '123',
      description: 'VISA Corporate card'
    },
    {
      name: 'VISA Debit',
      number: '4462 0000 0000 0003',
      cvv: '123',
      description: 'VISA Debit card'
    },
    {
      name: 'MasterCard (3D Secure)',
      number: '5186 1506 6000 0009',
      cvv: '123',
      description: 'MasterCard with 3D Secure authentication'
    },
    {
      name: 'MasterCard (No 3D Secure)',
      number: '5186 1506 6000 0025',
      cvv: '123',
      description: 'MasterCard without 3D Secure'
    },
    {
      name: 'Maestro (UK)',
      number: '6759 0000 0000 5',
      cvv: '123',
      description: 'Maestro card (UK issued)'
    }
  ];

  // Separate optional and mandatory rules
  const optionalRules = rulesMessages.filter(msg => !msg.requires_acknowledgment);
  const mandatoryRules = rulesMessages.filter(msg => msg.requires_acknowledgment);

  // Update rulesMessages when initialRulesMessages changes
  useEffect(() => {
    setRulesMessages(initialRulesMessages || []);
  }, [initialRulesMessages]);

  // Check if we're in production environment
  useEffect(() => {
    const checkEnvironment = () => {
      const hostname = window.location.hostname;
      const isDevelopment = config.isDevelopment;
      setIsDevelopment(isDevelopment);
    };
    
    checkEnvironment();
  }, []);

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

  const applyTestCard = (card) => {
    setCardNumber(card.number.replace(/\s/g, ''));
    setCvv(card.cvv);
    setCardholderName('Test User');
    setExpiryMonth('12');
    setExpiryYear('25');
    setShowTestCards(false);
  };

  const validateCardForm = () => {
    if (!cardNumber || cardNumber.length < 13) {
      setError('Please enter a valid card number');
      return false;
    }
    if (!cardholderName.trim()) {
      setError('Please enter the cardholder name');
      return false;
    }
    if (!expiryMonth || !expiryYear) {
      setError('Please enter the expiry date');
      return false;
    }
    if (!cvv || cvv.length < 3) {
      setError('Please enter a valid CVV');
      return false;
    }
    return true;
  };

  const handleCheckoutComplete = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let paymentData; // Declare paymentData at function scope
      
      if (paymentMethod === 'card') {
        // Validate card form for card payments
        if (!validateCardForm()) {
          setLoading(false);
          return;
        }

        // Prepare card data
        const cardData = {
          card_number: cardNumber.replace(/\s/g, ''),
          cardholder_name: cardholderName,
          expiry_month: expiryMonth,
          expiry_year: expiryYear,
          cvv: cvv
        };

        // Prepare payment data
        paymentData = {
          employer_code: employerCode.trim() || null,
          is_invoice: false,
          payment_method: 'card',
          card_data: cardData
        };
      } else {
        // Invoice payment - no card validation needed
        paymentData = {
          employer_code: employerCode.trim() || null,
          is_invoice: true,
          payment_method: 'invoice'
        };
      }

      // Call the parent's onComplete function with payment data
      onComplete(paymentData);
      
    } catch (err) {
      console.error('Error during checkout:', err);
      setError('An error occurred during checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if any items are digital (Tutorial products)
  const hasDigitalItems = () => {
    return cartItems.some(item => 
      item.product_type === 'Tutorial' || 
      item.metadata?.type === 'tutorial'
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="cart-review">
            <h4>Review Your Order</h4>
                       
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
					<h4>Payment Options</h4>

					{/* Development Mode Warning */}
					{isDevelopment && (
						<Alert variant="warning" className="mb-4">
							<div className="d-flex align-items-center">
								<i
									className="fas fa-exclamation-triangle text-danger me-2"
									style={{ fontSize: "1.2rem" }}></i>
								<div>
									<strong>Development Mode</strong>
									<p className="mb-0">
										You are in development mode. Test card details are
										available below for testing purposes.
									</p>
								</div>
							</div>
						</Alert>
					)}

					{/* Responsive Row for Payment Method and Order Summary */}
					<div className="row">
						{/* Payment Method Panel */}
						<div className="col-12 col-lg-8 mb-4 mb-lg-0">
							<Card className="mb-4">
								<Card.Header>
									<h6 className="mb-0">Select Payment Method</h6>
								</Card.Header>
								<Card.Body>
									<Form>
										{/* Employer Code Field */}
										<Form.Group className="mb-3">
											<Form.Label>
												Employer Code (Optional)
											</Form.Label>
											<Form.Control
												type="text"
												placeholder="Enter your employer code if your employer will pay"
												value={employerCode}
												onChange={(e) =>
													setEmployerCode(e.target.value)
												}
											/>
											<Form.Text className="text-muted">
												Enter this if your employer is paying for
												this order
											</Form.Text>
										</Form.Group>

										{/* Payment Method Options */}
										<Form.Group className="mb-3">
											<Form.Label>Payment Method</Form.Label>

											<div className="mb-2">
												<Form.Check
													type="radio"
													id="payment-card"
													name="paymentMethod"
													label="Pay by Card/Bank Transfer"
													checked={paymentMethod === "card"}
													onChange={() => setPaymentMethod("card")}
												/>
											</div>

											<div className="mb-2">
												<Form.Check
													type="radio"
													id="payment-invoice"
													name="paymentMethod"
													label="Pay by Invoice"
													checked={paymentMethod === "invoice"}
													onChange={() =>
														setPaymentMethod("invoice")
													}
												/>
											</div>
										</Form.Group>

										{/* Payment Method Information */}
										{paymentMethod === "card" && (
											<Alert variant="info">
												<strong>Card/Bank Transfer Payment</strong>
												<p className="mb-0 mt-2">
													Your order will be processed immediately
													and payment will be collected via card or
													bank transfer.
												</p>
											</Alert>
										)}

										{paymentMethod === "invoice" && (
											<Alert variant="info">
												<strong>Invoice Payment</strong>
												<p className="mb-0 mt-2">
													An invoice will be sent to you for
													payment. Your order will be processed
													once payment is received.
												</p>
											</Alert>
										)}
									</Form>
								</Card.Body>
							</Card>

							{/* Card Payment Form */}
							{paymentMethod === "card" && (
								<Card className="mb-4">
									<Card.Header>
										<h6 className="mb-0">Card Details</h6>
									</Card.Header>
									<Card.Body>
										<Form>
											<Form.Group className="mb-3">
												<Form.Label>Card Number</Form.Label>
												<Form.Control
													type="text"
													placeholder="1234 5678 9012 3456"
													value={cardNumber}
													onChange={(e) =>
														setCardNumber(e.target.value)
													}
													maxLength="19"
												/>
											</Form.Group>

											<Form.Group className="mb-3">
												<Form.Label>Cardholder Name</Form.Label>
												<Form.Control
													type="text"
													placeholder="John Doe"
													value={cardholderName}
													onChange={(e) =>
														setCardholderName(e.target.value)
													}
												/>
											</Form.Group>

											<div className="row">
												<div className="col-md-6">
													<Form.Group className="mb-3">
														<Form.Label>Expiry Date</Form.Label>
														<div className="d-flex">
															<Form.Select
																value={expiryMonth}
																onChange={(e) =>
																	setExpiryMonth(
																		e.target.value
																	)
																}
																className="me-2">
																<option value="">MM</option>
																{Array.from(
																	{ length: 12 },
																	(_, i) => i + 1
																).map((month) => (
																	<option
																		key={month}
																		value={month
																			.toString()
																			.padStart(2, "0")}>
																		{month
																			.toString()
																			.padStart(2, "0")}
																	</option>
																))}
															</Form.Select>
															<Form.Select
																value={expiryYear}
																onChange={(e) =>
																	setExpiryYear(e.target.value)
																}>
																<option value="">YY</option>
																{Array.from(
																	{ length: 10 },
																	(_, i) =>
																		new Date().getFullYear() +
																		i
																).map((year) => (
																	<option
																		key={year}
																		value={year
																			.toString()
																			.slice(-2)}>
																		{year
																			.toString()
																			.slice(-2)}
																	</option>
																))}
															</Form.Select>
														</div>
													</Form.Group>
												</div>
												<div className="col-md-6">
													<Form.Group className="mb-3">
														<Form.Label>CVV</Form.Label>
														<Form.Control
															type="text"
															placeholder="123"
															value={cvv}
															onChange={(e) =>
																setCvv(e.target.value)
															}
															maxLength="4"
														/>
													</Form.Group>
												</div>
											</div>

											{/* Test Cards Button (Development Mode Only) */}
											{isDevelopment && (
												<div className="mb-3 text-danger">
													<Button
														variant="outline-danger"
														onClick={() => setShowTestCards(true)}
														size="sm">
														<i className="fas fa-credit-card me-1 "></i>
														Show Test Cards
													</Button>
												</div>
											)}
										</Form>
									</Card.Body>
								</Card>
							)}

							{/* Test Cards Modal */}
							<Modal
								show={showTestCards}
								onHide={() => setShowTestCards(false)}
								size="lg">
								<Modal.Header closeButton>
									<Modal.Title>Opayo Test Cards</Modal.Title>
								</Modal.Header>
								<Modal.Body>
									<p className="text-muted mb-3">
										Use these test card details for testing your Opayo
										integration. These cards will not charge real
										money.
									</p>
									<Table striped bordered hover>
										<thead>
											<tr>
												<th>Card Type</th>
												<th>Card Number</th>
												<th>CVV</th>
												<th>Description</th>
												<th>Action</th>
											</tr>
										</thead>
										<tbody>
											{testCards.map((card, index) => (
												<tr key={index}>
													<td>{card.name}</td>
													<td>
														<code>{card.number}</code>
													</td>
													<td>
														<code>{card.cvv}</code>
													</td>
													<td>{card.description}</td>
													<td>
														<Button
															variant="outline-primary"
															size="sm"
															onClick={() =>
																applyTestCard(card)
															}>
															Apply
														</Button>
													</td>
												</tr>
											))}
										</tbody>
									</Table>
								</Modal.Body>
								<Modal.Footer>
									<Button
										variant="secondary"
										onClick={() => setShowTestCards(false)}>
										Close
									</Button>
								</Modal.Footer>
							</Modal>
						</div>

						{/* Order Summary Panel */}
						<div className="col-12 col-lg-4">
							{vatCalculations && (
								<Card className="mb-4">
									<Card.Header>
										<h6 className="mb-0">Order Summary</h6>
									</Card.Header>
									<Card.Body>
										<div className="d-flex justify-content-between">
											<span>Subtotal:</span>
											<span>
												£
												{vatCalculations.totals?.subtotal?.toFixed(
													2
												) || "0.00"}
											</span>
										</div>
										<div className="d-flex justify-content-between">
											<span>
												VAT ({vatCalculations.user_country || "UK"}
												):
											</span>
											<span>
												£
												{vatCalculations.totals?.total_vat?.toFixed(
													2
												) || "0.00"}
											</span>
										</div>
										<hr />
										<div className="d-flex justify-content-between fw-bold fs-5">
											<span>Total:</span>
											<span>
												£
												{vatCalculations.totals?.total_gross?.toFixed(
													2
												) || "0.00"}
											</span>
										</div>
									</Card.Body>
								</Card>
							)}
						</div>
					</div>
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
									isCompleted
										? "bg-success text-light opacity-50"
										: isCurrent
										? "bg-primary text-dark border border-1 border-black-50 "
										: "bg-light text-muted"
								}`}
								style={{
									width: "40px",
									height: "40px",
									borderRadius: "50%",
								}}>
								{isCompleted ? "✓" : stepNumber}
							</div>
							<h6
								className={`step-title mb-1 ${
									isCurrent ? "text-primary" : isCompleted ? "text-muted" : ""
								}`}>
								{step.title}
							</h6>
							<small className="text-muted">{step.description}</small>
						</div>

						{index < steps.length - 1 && (
							<div
								className={`step-connector flex-grow-1 mx-3 ${
									isCompleted ? "bg-success" : "bg-light"
								}`}
								style={{ height: "2px", marginTop: "20px" }}
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
            onClick={currentStep === 4 ? handleCheckoutComplete : handleNext}
            disabled={
              loading || 
              (currentStep === 3 && !canProceedToPayment())
            }
          >
            {loading ? 'Processing...' : currentStep === 4 ? (paymentMethod === 'invoice' ? 'Send me an Invoice' : 'Complete Order') : 'Next'}
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