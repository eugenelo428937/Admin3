import { useState, useCallback, useEffect } from 'react';
import acknowledgmentService from '../services/acknowledgmentService';
import { parsePhoneNumber } from 'libphonenumber-js';

/**
 * Hook for checkout validation
 *
 * Manages validation of ALL acknowledgments from ALL entry points
 * as well as address and contact information validation
 * before allowing checkout to proceed.
 */
const useCheckoutValidation = () => {
  const [validationState, setValidationState] = useState({
    isValidating: false,
    canProceed: false,
    blocked: false,
    summary: {
      total_required: 0,
      total_satisfied: 0,
      total_missing: 0
    },
    allRequiredAcknowledgments: [],
    missingAcknowledgments: [],
    satisfiedAcknowledgments: [],
    validationMessage: '',
    lastValidated: null,
    error: null,
    // Address and contact validation state
    addressValidation: {
      deliveryAddress: { isValid: false, error: null },
      invoiceAddress: { isValid: false, error: null }
    },
    contactValidation: {
      mobilePhone: { isValid: false, error: null },
      email: { isValid: false, error: null }
    }
  });

  /**
   * Validate email address
   */
  const validateEmail = useCallback((email) => {
    if (!email || !email.trim()) {
      return { isValid: false, error: 'Email address is required' };
    }

    // RFC 5322 compliant email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    return { isValid: true, error: null };
  }, []);

  /**
   * Validate phone number (synchronous)
   */
  const validatePhone = useCallback((phoneNumber, countryCode = 'GB', isRequired = false) => {
    // Handle empty/null values
    if (!phoneNumber || (typeof phoneNumber === 'string' && !phoneNumber.trim())) {
      if (isRequired) {
        return { isValid: false, error: 'Phone number is required' };
      }
      return { isValid: true, error: null }; // Optional field is valid when empty
    }

    try {
      // Use libphonenumber-js directly for synchronous validation
      const parsedNumber = parsePhoneNumber(phoneNumber, countryCode);

      if (!parsedNumber) {
        return {
          isValid: false,
          error: 'Invalid phone number format'
        };
      }

      const isValid = parsedNumber.isValid();

      if (!isValid) {
        return {
          isValid: false,
          error: 'Please enter a valid phone number'
        };
      }

      return {
        isValid: true,
        error: null,
        formattedNumber: parsedNumber.formatNational()
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid phone number format'
      };
    }
  }, []);

  /**
   * Validate address completeness
   */
  const validateAddress = useCallback((addressData, addressType) => {
    if (!addressData || typeof addressData !== 'object') {
      return { isValid: false, error: `${addressType} address is required` };
    }

    const missingFields = [];

    // Check for primary address line (flexible field names)
    const hasAddressLine = addressData.address_line_1 ||
                          addressData.street ||
                          addressData.address ||
                          addressData.building;
    if (!hasAddressLine || (typeof hasAddressLine === 'string' && !hasAddressLine.trim())) {
      missingFields.push('Address Line 1');
    }

    // Check for city/town (flexible field names)
    const hasCity = addressData.city || addressData.town;
    if (!hasCity || (typeof hasCity === 'string' && !hasCity.trim())) {
      missingFields.push('City');
    }

    // Check for postal code (flexible field names)
    const hasPostalCode = addressData.postal_code || addressData.postcode;
    if (!hasPostalCode || (typeof hasPostalCode === 'string' && !hasPostalCode.trim())) {
      missingFields.push('Postal Code');
    }

    // Check for country
    if (!addressData.country || !addressData.country.trim()) {
      missingFields.push('Country');
    }

    if (missingFields.length > 0) {
      return {
        isValid: false,
        error: `${addressType} address is incomplete. Missing: ${missingFields.join(', ')}`
      };
    }

    return { isValid: true, error: null };
  }, []);

  /**
   * Validate contact information
   */
  const validateContactInfo = useCallback((contactData) => {
    const errors = [];
    const validations = {
      mobilePhone: { isValid: true, error: null },
      email: { isValid: true, error: null }
    };

    // Validate mobile phone (required)
    const phoneValidation = validatePhone(contactData.mobile_phone, 'GB', true);
    validations.mobilePhone = phoneValidation;
    if (!phoneValidation.isValid) {
      errors.push(phoneValidation.error);
    }

    // Validate email (required)
    const emailValidation = validateEmail(contactData.email_address);
    validations.email = emailValidation;
    if (!emailValidation.isValid) {
      errors.push(emailValidation.error);
    }

    // Validate optional phone numbers
    if (contactData.home_phone) {
      const homePhoneValidation = validatePhone(contactData.home_phone, 'GB', false);
      if (!homePhoneValidation.isValid) {
        errors.push(`Home phone: ${homePhoneValidation.error}`);
      }
    }

    if (contactData.work_phone) {
      const workPhoneValidation = validatePhone(contactData.work_phone, 'GB', false);
      if (!workPhoneValidation.isValid) {
        errors.push(`Work phone: ${workPhoneValidation.error}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      validations
    };
  }, [validateEmail, validatePhone]);

  /**
   * Validate addresses (delivery and invoice)
   */
  const validateAddresses = useCallback((deliveryAddress, invoiceAddress) => {
    const errors = [];
    const validations = {
      deliveryAddress: { isValid: true, error: null },
      invoiceAddress: { isValid: true, error: null }
    };

    // Validate delivery address
    const deliveryValidation = validateAddress(deliveryAddress?.addressData, 'Delivery');
    validations.deliveryAddress = deliveryValidation;
    if (!deliveryValidation.isValid) {
      errors.push(deliveryValidation.error);
    }

    // Validate invoice address
    const invoiceValidation = validateAddress(invoiceAddress?.addressData, 'Invoice');
    validations.invoiceAddress = invoiceValidation;
    if (!invoiceValidation.isValid) {
      errors.push(invoiceValidation.error);
    }

    return {
      isValid: errors.length === 0,
      errors,
      validations
    };
  }, [validateAddress]);

  /**
   * Validate checkout comprehensively
   */
  const validateCheckout = useCallback(async (cartData, cartItems, paymentMethod, userProfile = null) => {
    

    setValidationState(prev => ({
      ...prev,
      isValidating: true,
      error: null
    }));

    try {
      const result = await acknowledgmentService.validateCheckoutReadiness(
        cartData,
        cartItems,
        paymentMethod,
        userProfile
      );

      

      setValidationState({
        isValidating: false,
        canProceed: result.canProceed,
        blocked: result.blocked,
        summary: result.summary || {
          total_required: 0,
          total_satisfied: 0,
          total_missing: 0
        },
        allRequiredAcknowledgments: result.allRequiredAcknowledgments || [],
        missingAcknowledgments: result.missingAcknowledgments?.details || [],
        satisfiedAcknowledgments: result.satisfiedAcknowledgments || [],
        validationMessage: result.validationMessage || '',
        lastValidated: new Date(),
        error: null
      });

      return result;
    } catch (error) {
      console.error('❌ [useCheckoutValidation] Error:', error);

      setValidationState(prev => ({
        ...prev,
        isValidating: false,
        canProceed: false,
        blocked: true,
        error: error.message,
        lastValidated: new Date()
      }));

      return {
        canProceed: false,
        blocked: true,
        error: error.message
      };
    }
  }, []);

  /**
   * Quick check if checkout can proceed (without detailed validation)
   */
  const quickCanProceedCheck = useCallback(async (cartData, cartItems, paymentMethod) => {
    try {
      const context = acknowledgmentService.buildValidationContext(
        cartData,
        cartItems,
        paymentMethod
      );

      return await acknowledgmentService.canProceedWithCheckout(context);
    } catch (error) {
      console.error('❌ [quickCanProceedCheck] Error:', error);
      return false;
    }
  }, []);

  /**
   * Get missing acknowledgments details
   */
  const getMissingAcknowledgments = useCallback(async (cartData, cartItems, paymentMethod) => {
    try {
      const context = acknowledgmentService.buildValidationContext(
        cartData,
        cartItems,
        paymentMethod
      );

      return await acknowledgmentService.getMissingAcknowledgments(context);
    } catch (error) {
      console.error('❌ [getMissingAcknowledgments] Error:', error);
      return {
        total: 0,
        byEntryPoint: {},
        details: [],
        message: 'Unable to check missing acknowledgments.'
      };
    }
  }, []);

  /**
   * Collect all required acknowledgments for given context
   */
  const collectAllRequiredAcknowledgments = useCallback(async (cartData, cartItems, paymentMethod) => {
    try {
      const context = acknowledgmentService.buildValidationContext(
        cartData,
        cartItems,
        paymentMethod
      );

      return await acknowledgmentService.collectAllRequiredAcknowledgments(context);
    } catch (error) {
      console.error('❌ [collectAllRequiredAcknowledgments] Error:', error);
      return [];
    }
  }, []);

  /**
   * Validate Step 1 (Cart Review) - addresses and contact info
   */
  const validateStep1 = useCallback((contactData, deliveryAddress, invoiceAddress) => {
    const errors = [];
    let canProceed = true;

    // Validate contact information
    const contactValidation = validateContactInfo(contactData);
    if (!contactValidation.isValid) {
      errors.push(...contactValidation.errors);
      canProceed = false;
    }

    // Validate addresses
    const addressesValidation = validateAddresses(deliveryAddress, invoiceAddress);
    if (!addressesValidation.isValid) {
      errors.push(...addressesValidation.errors);
      canProceed = false;
    }

    // Update validation state
    setValidationState(prev => ({
      ...prev,
      addressValidation: addressesValidation.validations,
      contactValidation: contactValidation.validations,
      canProceed: canProceed && prev.canProceed, // Combine with acknowledgment validation
      validationMessage: errors.length > 0 ? errors.join('. ') : '',
      error: errors.length > 0 ? errors[0] : null
    }));

    return {
      canProceed,
      errors,
      contactValidation: contactValidation.validations,
      addressValidation: addressesValidation.validations
    };
  }, [validateContactInfo, validateAddresses]);

  /**
   * Reset validation state
   */
  const resetValidation = useCallback(() => {
    setValidationState({
      isValidating: false,
      canProceed: false,
      blocked: false,
      summary: {
        total_required: 0,
        total_satisfied: 0,
        total_missing: 0
      },
      allRequiredAcknowledgments: [],
      missingAcknowledgments: [],
      satisfiedAcknowledgments: [],
      validationMessage: '',
      lastValidated: null,
      error: null,
      addressValidation: {
        deliveryAddress: { isValid: false, error: null },
        invoiceAddress: { isValid: false, error: null }
      },
      contactValidation: {
        mobilePhone: { isValid: false, error: null },
        email: { isValid: false, error: null }
      }
    });
  }, []);

  /**
   * Get user-friendly status message
   */
  const getStatusMessage = useCallback(() => {
    if (validationState.isValidating) {
      return 'Validating acknowledgments...';
    }

    if (validationState.error) {
      return `Validation error: ${validationState.error}`;
    }

    if (validationState.blocked) {
      const missingCount = validationState.summary.total_missing;
      return `Checkout blocked: ${missingCount} required acknowledgment${missingCount !== 1 ? 's' : ''} missing`;
    }

    if (validationState.canProceed) {
      const satisfiedCount = validationState.summary.total_satisfied;
      return `Ready to proceed: All ${satisfiedCount} acknowledgment${satisfiedCount !== 1 ? 's' : ''} satisfied`;
    }

    return 'Checkout validation pending';
  }, [validationState]);

  return {
    // State
    ...validationState,
    statusMessage: getStatusMessage(),

    // Actions
    validateCheckout,
    validateStep1,
    validateContactInfo,
    validateAddresses,
    validateEmail,
    validatePhone,
    validateAddress,
    quickCanProceedCheck,
    getMissingAcknowledgments,
    collectAllRequiredAcknowledgments,
    resetValidation
  };
};

export default useCheckoutValidation;