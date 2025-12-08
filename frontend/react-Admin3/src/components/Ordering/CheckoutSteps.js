import React, { useState, useEffect, useCallback } from 'react';
import { Button, Alert, Card, CardActions, CardContent, Grid, Box, useTheme, Stepper, Step, StepLabel, Typography } from '@mui/material';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../hooks/useAuth';
import httpService from '../../services/httpService';
import config from "../../config";
import rulesEngineService from '../../services/rulesEngineService';
import RulesEngineModal from '../Common/RulesEngineModal';
import userService from '../../services/userService';
import useCheckoutValidation from '../../hooks/useCheckoutValidation';
import './CheckoutSteps/CheckoutSteps.css';

// Import step components
import CartReviewStep from './CheckoutSteps/CartReviewStep';
import TermsConditionsStep from './CheckoutSteps/TermsConditionsStep';
import PreferenceStep from './CheckoutSteps/PreferenceStep';
import PaymentStep from './CheckoutSteps/PaymentStep';
import CartSummaryPanel from './CheckoutSteps/CartSummaryPanel';

const CheckoutSteps = ({ onComplete }) => {
  const theme = useTheme();
  const { cartItems, cartData } = useCart();
  const { isAuthenticated } = useAuth();
  const validation = useCheckoutValidation();
  const [currentStep, setCurrentStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [vatCalculations, setVatCalculations] = useState(null);
  const [vatLoading, setVatLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // General terms & conditions state
  const [generalTermsAccepted, setGeneralTermsAccepted] = useState(false);

  // User preferences state
  const [preferences, setPreferences] = useState({});

  // Contact data state from CommunicationDetailsPanel
  const [contactData, setContactData] = useState({
    home_phone: '',
    mobile_phone: '',
    work_phone: '',
    email_address: ''
  });

  // Address data state from AddressSelectionPanel
  const [deliveryAddress, setDeliveryAddress] = useState({
    addressType: 'HOME', // HOME or WORK
    addressData: {},
    orderOnly: false
  });

  const [invoiceAddress, setInvoiceAddress] = useState({
    addressType: 'HOME', // HOME or WORK
    addressData: {},
    orderOnly: false
  });

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
  const [isUAT, setIsUAT] = useState(false);

  // Acknowledgment state for blocking validation
  const [acknowledgmentStates, setAcknowledgmentStates] = useState({});
  const [requiredAcknowledgments, setRequiredAcknowledgments] = useState([]);

  useEffect(() => {
    // Check if we're in development environment
    setIsDevelopment(process.env.NODE_ENV === 'development' || config.API_BASE_URL?.includes('localhost'));
    // Check if we're in UAT environment
    setIsUAT(config.isUAT || process.env.REACT_APP_ENV === 'uat');
  }, []);

  // Fetch user profile function (extracted for reuse)
  const fetchUserProfile = useCallback(async () => {
    if (isAuthenticated) {
      setProfileLoading(true);
      try {
        const result = await userService.getUserProfile();

        if (result.status === "success") {
          setUserProfile(result.data);

          // Initialize contact data from user profile
          const profile = result.data;
          const getPhoneNumber = (type) => {
            // First try the new backend format (contact_numbers)
            if (profile.contact_numbers && profile.contact_numbers[type]) {
              return profile.contact_numbers[type];
            }
            // Fallback to old format (profile)
            if (profile.profile && profile.profile[type]) {
              return profile.profile[type];
            }
            return '';
          };

          const newContactData = {
            home_phone: getPhoneNumber('home_phone'),
            mobile_phone: getPhoneNumber('mobile_phone'),
            work_phone: getPhoneNumber('work_phone'),
            email_address: profile.email || profile.user?.email || ''
          };

          setContactData(newContactData);
        } else {
          console.error('Failed to fetch user profile:', result.message);
        }
      } catch (err) {
        console.error('Error fetching user profile:', err);
      } finally {
        setProfileLoading(false);
      }
    }
  }, [isAuthenticated]);

  // Handle contact data updates from CommunicationDetailsPanel
  const handleContactDataUpdate = (updateData) => {
    if (updateData && updateData.contact) {
      // Extract contact data from the update
      const newContactData = {
        home_phone: updateData.contact.home_phone || '',
        mobile_phone: updateData.contact.mobile_phone || '',
        work_phone: updateData.contact.work_phone || '',
        email_address: updateData.contact.email_address || updateData.contact.email || ''
      };

      setContactData(newContactData);

      // Trigger real-time validation for Step 1
      if (currentStep === 1) {
        setTimeout(() => {
          validation.validateStep1(newContactData, deliveryAddress, invoiceAddress);
        }, 100); // Small delay to ensure state updates
      }
    }

    // Also call the original fetchUserProfile if it's not an order-only update
    if (!updateData || !updateData.orderOnly) {
      fetchUserProfile();
    }
  };

  // Handle delivery address updates from AddressSelectionPanel
  const handleDeliveryAddressUpdate = useCallback((addressInfo) => {
    if (addressInfo) {
      const newDeliveryAddress = {
        addressType: addressInfo.addressType || 'HOME',
        addressData: addressInfo.addressData || {},
        orderOnly: addressInfo.orderOnly || false
      };

      setDeliveryAddress(newDeliveryAddress);

      // Only trigger validation if we have actual address data (not empty object)
      // This prevents validation errors on initial page load before addresses are populated
      if (currentStep === 1 && newDeliveryAddress.addressData && Object.keys(newDeliveryAddress.addressData).length > 0) {
        setTimeout(() => {
          validation.validateStep1(contactData, newDeliveryAddress, invoiceAddress);
        }, 100); // Small delay to ensure state updates
      }
    }
  }, [currentStep, validation, contactData, invoiceAddress]);

  // Handle invoice address updates from AddressSelectionPanel
  const handleInvoiceAddressUpdate = useCallback((addressInfo) => {
    if (addressInfo) {
      const newInvoiceAddress = {
        addressType: addressInfo.addressType || 'HOME',
        addressData: addressInfo.addressData || {},
        orderOnly: addressInfo.orderOnly || false
      };

      setInvoiceAddress(newInvoiceAddress);

      // Only trigger validation if we have actual address data (not empty object)
      // This prevents validation errors on initial page load before addresses are populated
      if (currentStep === 1 && newInvoiceAddress.addressData && Object.keys(newInvoiceAddress.addressData).length > 0) {
        setTimeout(() => {
          validation.validateStep1(contactData, deliveryAddress, newInvoiceAddress);
        }, 100); // Small delay to ensure state updates
      }
    }
  }, [currentStep, validation, contactData, deliveryAddress]);

  // Fetch user profile if authenticated
  useEffect(() => {
    fetchUserProfile();
  }, [isAuthenticated, fetchUserProfile]);

  // Execute checkout_start rules only when on step 1 (cart review)
  // IMPORTANT: This prevents duplicate API calls when user is on other steps (like PaymentStep)
  useEffect(() => {
    const executeRules = async () => {
      // Only execute checkout_start rules when on step 1 to avoid conflicts with PaymentStep
      if (currentStep !== 1) {
        setRulesMessages([]);
        return;
      }

      if (!cartData || cartItems.length === 0) {
        setRulesMessages([]);
        return;
      }

      setRulesLoading(true);
      setRulesMessages([]);

      try {
        // Sanitize cart items to ensure actual_price is a string (schema requirement)
        const sanitizedItems = cartItems.map(item => ({
          ...item,
          actual_price: String(item.actual_price || 0)
        }));

        // Calculate total, treating null/undefined prices as 0
        const total = sanitizedItems.reduce((sum, item) => {
          const price = parseFloat(item.actual_price);
          return sum + (price * item.quantity);
        }, 0);

        const context = {
          cart: {
            id: cartData.id,
            items: sanitizedItems,
            total: total,
            user: cartData.user || null,
            session_key: cartData.session_key || null,
            has_marking: cartData.has_marking || false,
            has_digital: cartData.has_digital || false,
            has_material: cartData.has_material || false,
            has_tutorial: cartData.has_tutorial || false,
            created_at: cartData.created_at,
            updated_at: cartData.updated_at
          }
        };

        const result = await rulesEngineService.executeRules(rulesEngineService.ENTRY_POINTS.CHECKOUT_START, context);

        if (result.messages && result.messages.length > 0) {
          // Separate modal messages from regular messages
          const modalMsgs = result.messages.filter(msg => msg.display_type === 'modal');
          const alertMessages = result.messages.filter(msg => msg.display_type !== 'modal');

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
  }, [cartItems, cartData, currentStep]);

  // Use VAT calculations from backend (cartData)
  useEffect(() => {
    if (cartItems.length === 0) {
      setVatCalculations(null);
      return;
    }

    setVatLoading(true);
    try {
      // Use backend VAT calculations from cartData
      if (cartData?.vat_calculations) {
        const backendVatCalcs = cartData.vat_calculations;

        // Calculate fees from cartData
        const totalFees = cartData?.fees ?
          cartData.fees.reduce((total, fee) =>
            total + parseFloat(fee.amount || 0), 0
          ) : 0;

        // Phase 5: Backend returns {totals: {net, vat, gross}, region, items}
        // Map to frontend expected field names for compatibility
        const net = parseFloat(backendVatCalcs.totals?.net || 0);
        const vat = parseFloat(backendVatCalcs.totals?.vat || 0);
        const gross = parseFloat(backendVatCalcs.totals?.gross || 0);

        // Calculate effective VAT rate (vat / net * 100)
        const effectiveVatRate = net > 0 ? (vat / net) : 0;

        // Use backend VAT totals and add fees to gross total
        const result = {
          success: true,
          totals: {
            subtotal: net,              // Map: net -> subtotal
            total_vat: vat,             // Map: vat -> total_vat
            total_fees: totalFees,
            total_gross: gross + totalFees,  // Map: gross -> total_gross (+ fees)
            effective_vat_rate: effectiveVatRate
          },
          fees: cartData?.fees || [],
          region_info: { region: backendVatCalcs.region || 'UNKNOWN' },
          vat_calculations: backendVatCalcs.items || []
        };

        setVatCalculations(result);
      } else {

        // Fallback if backend doesn't provide VAT calculations
        // Treat null/undefined prices as 0
        const subtotal = cartItems.reduce((total, item) => {
          const price = parseFloat(item.actual_price || 0);
          return total + (price * item.quantity);
        }, 0);

        const totalFees = cartData?.fees ?
          cartData.fees.reduce((total, fee) =>
            total + parseFloat(fee.amount || 0), 0
          ) : 0;

        setVatCalculations({
          success: true,
          totals: {
            subtotal: subtotal,
            total_vat: 0,
            total_fees: totalFees,
            total_gross: subtotal + totalFees,
            effective_vat_rate: 0
          },
          fees: cartData?.fees || [],
          region_info: {},
          vat_calculations: []
        });
      }
    } catch (err) {
      console.error('Error processing VAT calculations:', err);
      setError('Failed to load VAT information. Please refresh the page.');
    } finally {
      setVatLoading(false);
    }
  }, [cartItems, cartData]);

  const steps = [
    { title: 'Cart Review', description: 'Review your items' },
    { title: 'Terms & Conditions', description: 'Review and accept terms' },
    { title: 'Preferences', description: 'Set your preferences' },
    { title: 'Payment', description: 'Complete payment' },
    { title: 'Confirmation', description: 'Order confirmation' }
  ];

  // Check if Step 1 is valid (for button enable/disable)
  const isStep1Valid = () => {
    // Check if all required fields have values
    const hasContactData = contactData.mobile_phone && contactData.email_address;
    const hasDeliveryAddress = deliveryAddress?.addressData && Object.keys(deliveryAddress.addressData).length > 0;
    const hasInvoiceAddress = invoiceAddress?.addressData && Object.keys(invoiceAddress.addressData).length > 0;

    return hasContactData && hasDeliveryAddress && hasInvoiceAddress;
  };

  const handleNext = async () => {
    // Step 1 validation - Cart Review (addresses and contact info)
    if (currentStep === 1) {
      const step1Validation = validation.validateStep1(contactData, deliveryAddress, invoiceAddress);

      if (!step1Validation.canProceed) {
        setError(step1Validation.errors.join('. '));
        return;
      }
    }

    // Step 2 validation - Terms & Conditions
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

    // COMPREHENSIVE VALIDATION: Validate ALL acknowledgments from ALL entry points
    const validationResult = await validation.validateCheckout(cartData, cartItems, paymentMethod, userProfile);

    if (validationResult.blocked) {
      // Show user exactly what acknowledgments are missing
      if (validationResult.validationMessage) {
        setError(validationResult.validationMessage);
      } else {
        setError('Please complete all required acknowledgments before proceeding.');
      }
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
        user_preferences: {
          ...preferences,
          // Include contact data from CommunicationDetailsPanel
          home_phone: { value: contactData.home_phone, inputType: 'text' },
          mobile_phone: { value: contactData.mobile_phone, inputType: 'text' },
          work_phone: { value: contactData.work_phone, inputType: 'text' },
          email_address: { value: contactData.email_address, inputType: 'text' },

          // Include address data from AddressSelectionPanels
          delivery_address_type: { value: deliveryAddress.addressType, inputType: 'select' },
          delivery_address_data: { value: JSON.stringify(deliveryAddress.addressData), inputType: 'json' },
          delivery_address_order_only: { value: deliveryAddress.orderOnly, inputType: 'boolean' },

          invoice_address_type: { value: invoiceAddress.addressType, inputType: 'select' },
          invoice_address_data: { value: JSON.stringify(invoiceAddress.addressData), inputType: 'json' },
          invoice_address_order_only: { value: invoiceAddress.orderOnly, inputType: 'boolean' }
        }
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
            userProfile={userProfile}
            onContactUpdate={handleContactDataUpdate}
            onDeliveryAddressUpdate={handleDeliveryAddressUpdate}
            onInvoiceAddressUpdate={handleInvoiceAddressUpdate}
            // Pass validation state for visual indicators
            addressValidation={validation.addressValidation}
            contactValidation={validation.contactValidation}
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
            isUAT={isUAT}
            // Pass acknowledgment state for blocking validation
            acknowledgmentStates={acknowledgmentStates}
            setAcknowledgmentStates={setAcknowledgmentStates}
            requiredAcknowledgments={requiredAcknowledgments}
            setRequiredAcknowledgments={setRequiredAcknowledgments}
          />
        );

      default:
        return null;
    }
  };

  return (
     <Box sx={{ width: '100%' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {vatLoading && <Alert severity="info" sx={{ mb: 2 }}>Calculating VAT...</Alert>}
        {validation.validationMessage && !error && (
           <Alert severity="warning" sx={{ mb: 2 }}>{validation.validationMessage}</Alert>
        )}

        {/* Step Progress */}
        <Stepper activeStep={currentStep - 1} sx={{ mb: 4 }}>
           {steps.map((step, index) => (
              <Step key={index} completed={index + 1 < currentStep}>
                 <StepLabel>
                    <Typography variant="subtitle2">{step.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{step.description}</Typography>
                 </StepLabel>
              </Step>
           ))}
        </Stepper>

        <Card>
           <CardContent sx={{ px: 0 }}>
              {/* Rules Engine Modal for displaying modal messages */}
              <RulesEngineModal
                open={showRulesModal}
                onClose={() => setShowRulesModal(false)}
                messages={modalMessages}
                closeButtonText="I Understand"
                backdrop="static"
                disableEscapeKeyDown={true}
              />
              <Box sx={{ px: { xs: theme.liftkit.spacing.sm, md: theme.liftkit.spacing.md, lg: theme.liftkit.spacing.md } }}>
                 {/* Two-column grid layout for all steps */}
                 <Grid container spacing={3} className="justify-content-center">
                    {/* Left column: Step content (lg:8, md:12) */}
                    <Grid size={{ md: 12, lg: 8 }}>{renderStepContent()}</Grid>

                    {/* Right column: Cart Summary Panel (lg:4, md:12) */}
                    <Grid size={{ md: 12, lg: 4 }}>
                       <CartSummaryPanel
                          cartItems={cartItems}
                          vatCalculations={vatCalculations}
                          paymentMethod={paymentMethod}
                       />
                    </Grid>
                 </Grid>
              </Box>
           </CardContent>
           <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
              <Button
                 variant="outlined"
                 onClick={handleBack}
                 disabled={currentStep === 1}
              >
                 Back
              </Button>

              {currentStep < steps.length - 1 ? (
                 <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={
                       (currentStep === 1 && !isStep1Valid()) ||
                       (currentStep === 2 && !generalTermsAccepted)
                    }
                 >
                    {currentStep === 1 ? "Continue to Terms" : "Next"}
                 </Button>
              ) : (
                 <Button
                    variant="contained"
                    color="success"
                    onClick={handleComplete}
                    disabled={
                       loading ||
                       !generalTermsAccepted ||
                       validation.isValidating
                    }
                 >
                    {loading
                       ? "Processing..."
                       : validation.isValidating
                       ? "Validating..."
                       : "Complete Order"}
                 </Button>
              )}
           </CardActions>
        </Card>
     </Box>
  );
};

export default CheckoutSteps;