import React, { useState, useEffect } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import { useCart } from '../../contexts/CartContext';
import httpService from '../../services/httpService';
import config from "../../config";
import rulesEngineService from '../../services/rulesEngineService';
import RulesEngineModal from '../Common/RulesEngineModal';
import './CheckoutSteps/CheckoutSteps.css';

// Import step components
import CartReviewStep from './CheckoutSteps/CartReviewStep';
import TermsConditionsStep from './CheckoutSteps/TermsConditionsStep';
import PreferenceStep from './CheckoutSteps/PreferenceStep';
import PaymentStep from './CheckoutSteps/PaymentStep';
import CartSummaryPanel from './CheckoutSteps/CartSummaryPanel';

const CheckoutSteps = ({ onComplete }) => {
  const { cartItems, cartData } = useCart();
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [vatCalculations, setVatCalculations] = useState(null);
  const [vatLoading, setVatLoading] = useState(false);

  // General terms & conditions state
  const [generalTermsAccepted, setGeneralTermsAccepted] = useState(false);

  // User preferences state
  const [preferences, setPreferences] = useState({});

  // Rules engine state for step 1 (checkout_start)
  const [rulesMessages, setRulesMessages] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  // Modal state for rules engine messages
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [modalMessages, setModalMessages] = useState([]);

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [employerCode, setEmployerCode] = useState('');

  // Card payment state
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [isDevelopment, setIsDevelopment] = useState(false);

  // Cart summary panel state
  const [isCartSummaryCollapsed, setIsCartSummaryCollapsed] = useState(true);

  useEffect(() => {
    // Check if we're in development environment
    setIsDevelopment(process.env.NODE_ENV === 'development' || config.API_BASE_URL?.includes('localhost'));
  }, []);

  // Execute checkout_start rules only on step 1 when component mounts or when returning to step 1
  useEffect(() => {
    const executeRules = async () => {
      // Only execute checkout_start rules on step 1
      if (currentStep !== 1) {
        return;
      }

      if (!cartData || cartItems.length === 0) {
        setRulesMessages([]);
        return;
      }

      setRulesLoading(true);
      setRulesMessages([]);

      try {
        const total = cartItems.reduce((sum, item) => sum + (parseFloat(item.actual_price) * item.quantity), 0);
        const context = {
          cart: {
            id: cartData.id,
            items: cartItems,
            total: total,
            user: cartData.user || null,
            session_key: cartData.session_key || null,
            has_marking: cartData.has_marking || false,
            has_material: cartData.has_material || false,
            has_tutorial: cartData.has_tutorial || false,
            created_at: cartData.created_at,
            updated_at: cartData.updated_at
          }
        };

        console.log('🔍 [CheckoutSteps] Executing checkout_start rules for step 1, context:', JSON.stringify(context, null, 2));

        const result = await rulesEngineService.executeRules(rulesEngineService.ENTRY_POINTS.CHECKOUT_START, context);

        console.log('📋 [CheckoutSteps] Rules engine result:', result);

        if (result.messages && result.messages.length > 0) {
          console.log('📋 [CheckoutSteps] Total messages received:', result.messages.length);
          result.messages.forEach((msg, idx) => {
            console.log(`📋 [CheckoutSteps] Message ${idx+1}:`, {
              title: msg.content?.title,
              type: msg.message_type,
              display_type: msg.display_type,
              template_id: msg.template_id
            });
          });

          // Separate modal messages from regular messages
          const modalMsgs = result.messages.filter(msg => msg.display_type === 'modal');
          const alertMessages = result.messages.filter(msg => msg.display_type !== 'modal');

          console.log('📋 [CheckoutSteps] Alert messages for display:', alertMessages.length);

          // Set regular alert messages
          setRulesMessages(alertMessages);

          // If there are modal messages, show them in the generic modal
          if (modalMsgs.length > 0) {
            setModalMessages(modalMsgs);
            setShowRulesModal(true);
          }
        }
      } catch (err) {
        console.error('Error executing checkout_start rules:', err);

        // Handle schema validation errors specifically
        if (err.name === 'SchemaValidationError') {
          console.error('🚨 Schema validation failed for rules engine:', err.details);
          console.error('🔍 Schema errors:', err.schemaErrors);
          if (process.env.NODE_ENV === 'development') {
            setError(`Development Error: Schema validation failed - ${err.details}`);
          }
        }
      } finally {
        setRulesLoading(false);
      }
    };

    executeRules();
  }, [currentStep, cartItems, cartData]); // Added currentStep to dependencies

  // Calculate VAT when component mounts or cart changes
  useEffect(() => {
    const calculateVAT = async () => {
      if (cartItems.length === 0) return;

      setVatLoading(true);
      try {
        // Calculate subtotal from items
        const subtotal = cartItems.reduce((total, item) =>
          total + (parseFloat(item.actual_price) * item.quantity), 0
        );

        // Calculate VAT on subtotal (20% VAT)
        const vatRate = 0.20;
        const totalVat = subtotal * vatRate;

        // Calculate fees (VAT exempt) from cartData
        const totalFees = cartData?.fees ?
          cartData.fees.reduce((total, fee) =>
            total + parseFloat(fee.amount || 0), 0
          ) : 0;

        // Calculate total: subtotal + VAT + fees
        const totalGross = subtotal + totalVat + totalFees;

        const result = {
          success: true,
          totals: {
            subtotal: subtotal,
            total_vat: totalVat,
            total_fees: totalFees,
            total_gross: totalGross
          },
          fees: cartData?.fees || [],
          user_country: 'UK',
          vat_calculations: []
        };

        setVatCalculations(result);
      } catch (err) {
        console.error('Error calculating VAT:', err);
        setError('Failed to calculate VAT. Please refresh the page.');
      } finally {
        setVatLoading(false);
      }
    };

    calculateVAT();
  }, [cartItems, cartData]);

  const steps = [
    { title: 'Cart Review', description: 'Review your items' },
    { title: 'Terms & Conditions', description: 'Review and accept terms' },
    { title: 'Preferences', description: 'Set your preferences' },
    { title: 'Payment', description: 'Complete payment' },
    { title: 'Confirmation', description: 'Order confirmation' }
  ];

  const handleNext = async () => {
    if (currentStep === 2 && !generalTermsAccepted) {
      setError('Please accept the Terms & Conditions to continue.');
      return;
    }

    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
      setError('');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setError('');
    }
  };

  const handleComplete = async () => {
    if (!generalTermsAccepted) {
      setError('Please accept the Terms & Conditions.');
      return;
    }

    if (paymentMethod === 'card') {
      if (!cardNumber || !cardholderName || !expiryMonth || !expiryYear || !cvv) {
        setError('Please fill in all card details.');
        return;
      }
    } else if (paymentMethod === 'invoice') {
      if (!employerCode.trim()) {
        setError('Please enter your employer code for invoice payment.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const paymentData = {
        payment_method: paymentMethod,
        is_invoice: paymentMethod === 'invoice',
        employer_code: paymentMethod === 'invoice' ? employerCode : undefined,
        card_data: paymentMethod === 'card' ? {
          card_number: cardNumber,
          cardholder_name: cardholderName,
          expiry_month: expiryMonth,
          expiry_year: expiryYear,
          cvv: cvv
        } : undefined,
        general_terms_accepted: generalTermsAccepted,
        user_preferences: preferences
      };

      await onComplete(paymentData);
    } catch (err) {
      console.error('Checkout completion error:', err);
      setError('Failed to complete checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <CartReviewStep
            cartItems={cartItems}
            rulesLoading={rulesLoading}
            rulesMessages={rulesMessages}
            vatCalculations={vatCalculations}
          />
        );

      case 2:
        return (
          <TermsConditionsStep
            cartData={cartData}
            cartItems={cartItems}
            generalTermsAccepted={generalTermsAccepted}
            setGeneralTermsAccepted={setGeneralTermsAccepted}
          />
        );

      case 3:
        return (
          <PreferenceStep
            preferences={preferences}
            setPreferences={setPreferences}
          />
        );

      case 4:
        return (
          <PaymentStep
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            cardNumber={cardNumber}
            setCardNumber={setCardNumber}
            cardholderName={cardholderName}
            setCardholderName={setCardholderName}
            expiryMonth={expiryMonth}
            setExpiryMonth={setExpiryMonth}
            expiryYear={expiryYear}
            setExpiryYear={setExpiryYear}
            cvv={cvv}
            setCvv={setCvv}
            employerCode={employerCode}
            setEmployerCode={setEmployerCode}
            isDevelopment={isDevelopment}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      {vatLoading && <Alert variant="info">Calculating VAT...</Alert>}

      {/* Step Progress */}
      <div className="d-flex justify-content-between mb-4">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex-fill text-center ${
              index + 1 === currentStep ? 'text-primary' :
              index + 1 < currentStep ? 'text-success' : 'text-muted'
            }`}
          >
            <div className={`rounded-circle mx-auto mb-2 d-flex align-items-center justify-content-center ${
              index + 1 === currentStep ? 'bg-primary text-white' :
              index + 1 < currentStep ? 'bg-success text-white' : 'bg-light'
            }`} style={{ width: '40px', height: '40px' }}>
              {index + 1 < currentStep ? '✓' : index + 1}
            </div>
            <h6 className="mb-1">{step.title}</h6>
            <small>{step.description}</small>
          </div>
        ))}
      </div>

      <Card>
        <Card.Body>
          {currentStep === 1 ? (
            // Step 1: Show full cart review
            renderStepContent()
          ) : (
            // Steps 2+: Show cart summary panel + step content layout
            <div className="row g-3">
              <div className={`col-12 col-lg-${isCartSummaryCollapsed ? '10' : '8'} transition-col checkout-step-content-mobile`}>
                <div className="checkout-step-content">
                  {renderStepContent()}
                </div>
              </div>
              <div className={`col-12 col-lg-${isCartSummaryCollapsed ? '2' : '4'} transition-col checkout-cart-summary-mobile`}>
                <div className="cart-summary-panel">
                  <CartSummaryPanel
                    cartItems={cartItems}
                    vatCalculations={vatCalculations}
                    isCollapsed={isCartSummaryCollapsed}
                    onToggleCollapse={setIsCartSummaryCollapsed}
                  />
                </div>
              </div>
            </div>
          )}
        </Card.Body>
        <Card.Footer>
          <div className="d-flex justify-content-between">
            <Button
              variant="outline-secondary"
              onClick={handleBack}
              disabled={currentStep === 1}
            >
              Back
            </Button>

            {currentStep < steps.length - 1 ? (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={currentStep === 2 && !generalTermsAccepted}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="success"
                onClick={handleComplete}
                disabled={loading || !generalTermsAccepted}
              >
                {loading ? 'Processing...' : 'Complete Order'}
              </Button>
            )}
          </div>
        </Card.Footer>
      </Card>

      {/* Rules Engine Modal for displaying modal messages */}
      <RulesEngineModal
        open={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        messages={modalMessages}
        closeButtonText="I Understand"
        backdrop="static"
        disableEscapeKeyDown={true}
      />
    </div>
  );
};

export default CheckoutSteps;