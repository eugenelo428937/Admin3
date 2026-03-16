import { useState, useCallback } from 'react';
import acknowledgmentService from '../services/acknowledgmentService.ts';
import { parsePhoneNumber } from 'libphonenumber-js';
import type { CartItem, CartData } from '../types/cart';
import type {
  ContactData,
  CheckoutAddress,
  CheckoutAddressData,
  FieldValidation,
  AddressValidationState,
  ContactValidationState,
  ValidationSummary,
  CheckoutValidationState,
  Step1ValidationResult,
  AcknowledgmentInfo,
  ComprehensiveValidationResult,
  MissingAcknowledgmentsResult,
} from '../types/checkout';

// ─── Return Type ────────────────────────────────────────────────

interface UseCheckoutValidationReturn extends CheckoutValidationState {
  statusMessage: string;
  validateCheckout: (cartData: CartData | null, cartItems: CartItem[], paymentMethod: string, userProfile?: any) => Promise<ComprehensiveValidationResult>;
  validateStep1: (contactData: ContactData, deliveryAddress: CheckoutAddress, invoiceAddress: CheckoutAddress) => Step1ValidationResult;
  validateContactInfo: (contactData: ContactData) => { isValid: boolean; errors: string[]; validations: ContactValidationState };
  validateAddresses: (deliveryAddress: CheckoutAddress, invoiceAddress: CheckoutAddress) => { isValid: boolean; errors: string[]; validations: AddressValidationState };
  validateEmail: (email: string) => FieldValidation;
  validatePhone: (phoneNumber: string, countryCode?: string, isRequired?: boolean) => FieldValidation & { formattedNumber?: string };
  validateAddress: (addressData: CheckoutAddressData | undefined, addressType: string) => FieldValidation;
  quickCanProceedCheck: (cartData: CartData | null, cartItems: CartItem[], paymentMethod: string) => Promise<boolean>;
  getMissingAcknowledgments: (cartData: CartData | null, cartItems: CartItem[], paymentMethod: string) => Promise<MissingAcknowledgmentsResult>;
  collectAllRequiredAcknowledgments: (cartData: CartData | null, cartItems: CartItem[], paymentMethod: string) => Promise<AcknowledgmentInfo[]>;
  resetValidation: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────

const useCheckoutValidation = (): UseCheckoutValidationReturn => {
  const [validationState, setValidationState] = useState<CheckoutValidationState>({
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

  const validateEmail = useCallback((email: string): FieldValidation => {
    if (!email || !email.trim()) {
      return { isValid: false, error: 'Email address is required' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }
    return { isValid: true, error: null };
  }, []);

  const validatePhone = useCallback((phoneNumber: string, countryCode: string = 'GB', isRequired: boolean = false): FieldValidation & { formattedNumber?: string } => {
    if (!phoneNumber || (typeof phoneNumber === 'string' && !phoneNumber.trim())) {
      if (isRequired) {
        return { isValid: false, error: 'Phone number is required' };
      }
      return { isValid: true, error: null };
    }

    try {
      const parsedNumber = parsePhoneNumber(phoneNumber, countryCode as any);
      if (!parsedNumber) {
        return { isValid: false, error: 'Invalid phone number format' };
      }
      const isValid = parsedNumber.isValid();
      if (!isValid) {
        return { isValid: false, error: 'Please enter a valid phone number' };
      }
      return { isValid: true, error: null, formattedNumber: parsedNumber.formatNational() };
    } catch (error) {
      return { isValid: false, error: 'Invalid phone number format' };
    }
  }, []);

  const validateAddress = useCallback((addressData: CheckoutAddressData | undefined, addressType: string): FieldValidation => {
    if (!addressData || typeof addressData !== 'object') {
      return { isValid: false, error: `${addressType} address is required` };
    }

    const missingFields: string[] = [];

    const hasAddressLine = addressData.address_line_1 || addressData.street || addressData.address || addressData.building;
    if (!hasAddressLine || (typeof hasAddressLine === 'string' && !hasAddressLine.trim())) {
      missingFields.push('Address Line 1');
    }

    const hasCity = addressData.city || addressData.town;
    if (!hasCity || (typeof hasCity === 'string' && !hasCity.trim())) {
      missingFields.push('City');
    }

    const hasPostalCode = addressData.postal_code || addressData.postcode;
    if (!hasPostalCode || (typeof hasPostalCode === 'string' && !hasPostalCode.trim())) {
      missingFields.push('Postal Code');
    }

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

  const validateContactInfo = useCallback((contactData: ContactData) => {
    const errors: string[] = [];
    const validations: ContactValidationState = {
      mobilePhone: { isValid: true, error: null },
      email: { isValid: true, error: null }
    };

    const mobileCountry = contactData.mobile_phone_country || 'GB';
    const homeCountry = contactData.home_phone_country || 'GB';
    const workCountry = contactData.work_phone_country || 'GB';

    const phoneValidation = validatePhone(contactData.mobile_phone, mobileCountry, true);
    validations.mobilePhone = phoneValidation;
    if (!phoneValidation.isValid) {
      errors.push(phoneValidation.error!);
    }

    const emailValidation = validateEmail(contactData.email_address);
    validations.email = emailValidation;
    if (!emailValidation.isValid) {
      errors.push(emailValidation.error!);
    }

    if (contactData.home_phone) {
      const homePhoneValidation = validatePhone(contactData.home_phone, homeCountry, false);
      if (!homePhoneValidation.isValid) {
        errors.push(`Home phone: ${homePhoneValidation.error}`);
      }
    }

    if (contactData.work_phone) {
      const workPhoneValidation = validatePhone(contactData.work_phone, workCountry, false);
      if (!workPhoneValidation.isValid) {
        errors.push(`Work phone: ${workPhoneValidation.error}`);
      }
    }

    return { isValid: errors.length === 0, errors, validations };
  }, [validateEmail, validatePhone]);

  const validateAddresses = useCallback((deliveryAddress: CheckoutAddress, invoiceAddress: CheckoutAddress) => {
    const errors: string[] = [];
    const validations: AddressValidationState = {
      deliveryAddress: { isValid: true, error: null },
      invoiceAddress: { isValid: true, error: null }
    };

    const deliveryValidation = validateAddress(deliveryAddress?.addressData, 'Delivery');
    validations.deliveryAddress = deliveryValidation;
    if (!deliveryValidation.isValid) {
      errors.push(deliveryValidation.error!);
    }

    const invoiceValidation = validateAddress(invoiceAddress?.addressData, 'Invoice');
    validations.invoiceAddress = invoiceValidation;
    if (!invoiceValidation.isValid) {
      errors.push(invoiceValidation.error!);
    }

    return { isValid: errors.length === 0, errors, validations };
  }, [validateAddress]);

  const validateCheckout = useCallback(async (cartData: CartData | null, cartItems: CartItem[], paymentMethod: string, userProfile: any = null): Promise<ComprehensiveValidationResult> => {
    setValidationState(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      const result = await acknowledgmentService.validateCheckoutReadiness(
        cartData, cartItems, paymentMethod, userProfile
      );

      setValidationState({
        isValidating: false,
        canProceed: result.canProceed,
        blocked: result.blocked,
        summary: result.summary || { total_required: 0, total_satisfied: 0, total_missing: 0 },
        allRequiredAcknowledgments: result.allRequiredAcknowledgments || [],
        missingAcknowledgments: (result.missingAcknowledgments as any)?.details || [],
        satisfiedAcknowledgments: result.satisfiedAcknowledgments || [],
        validationMessage: result.validationMessage || '',
        lastValidated: new Date(),
        error: null,
        addressValidation: { deliveryAddress: { isValid: false, error: null }, invoiceAddress: { isValid: false, error: null } },
        contactValidation: { mobilePhone: { isValid: false, error: null }, email: { isValid: false, error: null } }
      });

      return result as ComprehensiveValidationResult;
    } catch (error: any) {
      console.error('❌ [useCheckoutValidation] Error:', error);

      setValidationState(prev => ({
        ...prev,
        isValidating: false,
        canProceed: false,
        blocked: true,
        error: error.message,
        lastValidated: new Date()
      }));

      return { canProceed: false, blocked: true, error: error.message, success: false, summary: { total_required: 0, total_satisfied: 0, total_missing: 0 }, allRequiredAcknowledgments: [], missingAcknowledgments: [], satisfiedAcknowledgments: [] };
    }
  }, []);

  const quickCanProceedCheck = useCallback(async (cartData: CartData | null, cartItems: CartItem[], paymentMethod: string): Promise<boolean> => {
    try {
      const context = acknowledgmentService.buildValidationContext(cartData, cartItems, paymentMethod);
      return await acknowledgmentService.canProceedWithCheckout(context);
    } catch (error) {
      console.error('❌ [quickCanProceedCheck] Error:', error);
      return false;
    }
  }, []);

  const getMissingAcknowledgments = useCallback(async (cartData: CartData | null, cartItems: CartItem[], paymentMethod: string): Promise<MissingAcknowledgmentsResult> => {
    try {
      const context = acknowledgmentService.buildValidationContext(cartData, cartItems, paymentMethod);
      return await acknowledgmentService.getMissingAcknowledgments(context);
    } catch (error) {
      console.error('❌ [getMissingAcknowledgments] Error:', error);
      return { total: 0, byEntryPoint: {}, details: [], message: 'Unable to check missing acknowledgments.' };
    }
  }, []);

  const collectAllRequiredAcknowledgments = useCallback(async (cartData: CartData | null, cartItems: CartItem[], paymentMethod: string): Promise<AcknowledgmentInfo[]> => {
    try {
      const context = acknowledgmentService.buildValidationContext(cartData, cartItems, paymentMethod);
      return await acknowledgmentService.collectAllRequiredAcknowledgments(context);
    } catch (error) {
      console.error('❌ [collectAllRequiredAcknowledgments] Error:', error);
      return [];
    }
  }, []);

  const validateStep1 = useCallback((contactData: ContactData, deliveryAddress: CheckoutAddress, invoiceAddress: CheckoutAddress): Step1ValidationResult => {
    const errors: string[] = [];
    let canProceed = true;

    const contactValidation = validateContactInfo(contactData);
    if (!contactValidation.isValid) {
      errors.push(...contactValidation.errors);
      canProceed = false;
    }

    const addressesValidation = validateAddresses(deliveryAddress, invoiceAddress);
    if (!addressesValidation.isValid) {
      errors.push(...addressesValidation.errors);
      canProceed = false;
    }

    setValidationState(prev => ({
      ...prev,
      addressValidation: addressesValidation.validations,
      contactValidation: contactValidation.validations,
      canProceed: canProceed && prev.canProceed,
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

  const resetValidation = useCallback(() => {
    setValidationState({
      isValidating: false,
      canProceed: false,
      blocked: false,
      summary: { total_required: 0, total_satisfied: 0, total_missing: 0 },
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

  const getStatusMessage = useCallback((): string => {
    if (validationState.isValidating) return 'Validating acknowledgments...';
    if (validationState.error) return `Validation error: ${validationState.error}`;
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
    ...validationState,
    statusMessage: getStatusMessage(),
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
