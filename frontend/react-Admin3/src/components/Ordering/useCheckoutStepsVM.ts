import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@mui/material';
import { useCart } from '../../contexts/CartContext.tsx';
import { useAuth } from '../../hooks/useAuth.tsx';
import rulesEngineService from '../../services/rulesEngineService';
import userService from '../../services/userService.ts';
import useCheckoutValidation from '../../hooks/useCheckoutValidation.ts';
import config from '../../config.js';
import type { CartItem, CartData, VATCalculations, CartFee } from '../../types/cart';
import type {
  ContactData,
  CheckoutAddress,
  CheckoutStep,
  PaymentMethod,
  PreferencesState,
  RulesMessage,
  AcknowledgmentStates,
  AcknowledgmentInfo,
  CheckoutPaymentData,
} from '../../types/checkout';

// ─── VM Interface ───────────────────────────────────────────────

export interface CheckoutStepsVM {
  // Theme
  theme: any;

  // Auth
  isAuthenticated: boolean;

  // Step management
  currentStep: number;
  steps: CheckoutStep[];
  error: string;
  success: string;
  loading: boolean;

  // Cart data
  cartItems: CartItem[];
  cartData: CartData | null;

  // VAT
  vatCalculations: VATCalculations | null;
  vatLoading: boolean;

  // Profile
  userProfile: any;
  profileLoading: boolean;

  // Terms
  generalTermsAccepted: boolean;
  setGeneralTermsAccepted: React.Dispatch<React.SetStateAction<boolean>>;

  // Preferences
  preferences: PreferencesState;
  setPreferences: React.Dispatch<React.SetStateAction<PreferencesState>>;

  // Contact & Address
  contactData: ContactData;
  deliveryAddress: CheckoutAddress;
  invoiceAddress: CheckoutAddress;
  handleContactDataUpdate: (updateData: any) => void;
  handleDeliveryAddressUpdate: (addressInfo: any) => void;
  handleInvoiceAddressUpdate: (addressInfo: any) => void;

  // Rules
  rulesMessages: RulesMessage[];
  rulesLoading: boolean;
  showRulesModal: boolean;
  setShowRulesModal: React.Dispatch<React.SetStateAction<boolean>>;
  modalMessages: RulesMessage[];

  // Payment
  paymentMethod: PaymentMethod;
  setPaymentMethod: React.Dispatch<React.SetStateAction<PaymentMethod>>;
  employerCode: string;
  setEmployerCode: React.Dispatch<React.SetStateAction<string>>;
  cardNumber: string;
  setCardNumber: React.Dispatch<React.SetStateAction<string>>;
  cardholderName: string;
  setCardholderName: React.Dispatch<React.SetStateAction<string>>;
  expiryMonth: string;
  setExpiryMonth: React.Dispatch<React.SetStateAction<string>>;
  expiryYear: string;
  setExpiryYear: React.Dispatch<React.SetStateAction<string>>;
  cvv: string;
  setCvv: React.Dispatch<React.SetStateAction<string>>;
  isDevelopment: boolean;
  isUAT: boolean;

  // Acknowledgments
  acknowledgmentStates: AcknowledgmentStates;
  setAcknowledgmentStates: React.Dispatch<React.SetStateAction<AcknowledgmentStates>>;
  requiredAcknowledgments: AcknowledgmentInfo[];
  setRequiredAcknowledgments: React.Dispatch<React.SetStateAction<AcknowledgmentInfo[]>>;

  // Validation
  validation: ReturnType<typeof useCheckoutValidation>;
  isStep1Valid: () => boolean;

  // Navigation
  handleNext: () => Promise<void>;
  handleBack: () => void;
  handleComplete: () => Promise<void>;
}

// ─── Hook ───────────────────────────────────────────────────────

interface UseCheckoutStepsVMParams {
  onComplete: (paymentData: CheckoutPaymentData | Record<string, any>) => Promise<void>;
}

const useCheckoutStepsVM = ({ onComplete }: UseCheckoutStepsVMParams): CheckoutStepsVM => {
  const theme = useTheme();
  const { cartItems, cartData } = useCart();
  const { isAuthenticated } = useAuth();
  const validation = useCheckoutValidation();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [vatCalculations, setVatCalculations] = useState<VATCalculations | null>(null);
  const [vatLoading, setVatLoading] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  const [generalTermsAccepted, setGeneralTermsAccepted] = useState<boolean>(false);
  const [preferences, setPreferences] = useState<PreferencesState>({});

  const [contactData, setContactData] = useState<ContactData>({
    home_phone: '',
    home_phone_country: '',
    mobile_phone: '',
    mobile_phone_country: '',
    work_phone: '',
    work_phone_country: '',
    email_address: ''
  });

  const [deliveryAddress, setDeliveryAddress] = useState<CheckoutAddress>({
    addressType: 'HOME',
    addressData: {},
    orderOnly: false
  });

  const [invoiceAddress, setInvoiceAddress] = useState<CheckoutAddress>({
    addressType: 'HOME',
    addressData: {},
    orderOnly: false
  });

  const deliveryAddressRef = useRef(deliveryAddress);
  const invoiceAddressRef = useRef(invoiceAddress);
  const contactDataRef = useRef(contactData);

  useEffect(() => { deliveryAddressRef.current = deliveryAddress; }, [deliveryAddress]);
  useEffect(() => { invoiceAddressRef.current = invoiceAddress; }, [invoiceAddress]);
  useEffect(() => { contactDataRef.current = contactData; }, [contactData]);

  const [rulesMessages, setRulesMessages] = useState<RulesMessage[]>([]);
  const [rulesLoading, setRulesLoading] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [modalMessages, setModalMessages] = useState<RulesMessage[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [employerCode, setEmployerCode] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardholderName, setCardholderName] = useState<string>('');
  const [expiryMonth, setExpiryMonth] = useState<string>('');
  const [expiryYear, setExpiryYear] = useState<string>('');
  const [cvv, setCvv] = useState<string>('');
  const [isDevelopment, setIsDevelopment] = useState<boolean>(false);
  const [isUAT, setIsUAT] = useState<boolean>(false);

  const [acknowledgmentStates, setAcknowledgmentStates] = useState<AcknowledgmentStates>({});
  const [requiredAcknowledgments, setRequiredAcknowledgments] = useState<AcknowledgmentInfo[]>([]);

  useEffect(() => {
    setIsDevelopment((import.meta as any).env?.DEV || (config as any).API_BASE_URL?.includes('localhost'));
    setIsUAT((config as any).isUAT || (import.meta as any).env?.VITE_ENV === 'uat' || (import.meta as any).env?.VITE_ENVIRONMENT === 'uat');
  }, []);

  // Fetch user profile
  const fetchUserProfile = useCallback(async () => {
    if (isAuthenticated) {
      setProfileLoading(true);
      try {
        const result = await userService.getUserProfile();
        if (result.status === "success") {
          setUserProfile(result.data);

          const profile = result.data;
          const getPhoneNumber = (type: string): string => {
            if (profile.contact_numbers && profile.contact_numbers[type]) return profile.contact_numbers[type];
            if (profile.profile && profile.profile[type]) return profile.profile[type];
            return '';
          };
          const getPhoneCountry = (type: string): string => {
            if (profile.contact_numbers && profile.contact_numbers[type]) return profile.contact_numbers[type];
            return '';
          };

          const newContactData: ContactData = {
            home_phone: getPhoneNumber('home_phone'),
            home_phone_country: getPhoneCountry('home_phone_country'),
            mobile_phone: getPhoneNumber('mobile_phone'),
            mobile_phone_country: getPhoneCountry('mobile_phone_country'),
            work_phone: getPhoneNumber('work_phone'),
            work_phone_country: getPhoneCountry('work_phone_country'),
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

  const handleContactDataUpdate = (updateData: any) => {
    if (updateData && updateData.contact) {
      const newContactData: ContactData = {
        home_phone: updateData.contact.home_phone || '',
        home_phone_country: updateData.contact.home_phone_country || '',
        mobile_phone: updateData.contact.mobile_phone || '',
        mobile_phone_country: updateData.contact.mobile_phone_country || '',
        work_phone: updateData.contact.work_phone || '',
        work_phone_country: updateData.contact.work_phone_country || '',
        email_address: updateData.contact.email_address || updateData.contact.email || ''
      };
      setContactData(newContactData);

      const hasDeliveryData = deliveryAddressRef.current?.addressData && Object.keys(deliveryAddressRef.current.addressData).length > 0;
      const hasInvoiceData = invoiceAddressRef.current?.addressData && Object.keys(invoiceAddressRef.current.addressData).length > 0;

      if (currentStep === 1 && hasDeliveryData && hasInvoiceData) {
        setTimeout(() => {
          validation.validateStep1(newContactData, deliveryAddressRef.current, invoiceAddressRef.current);
        }, 100);
      }
    }

    if (!updateData || !updateData.orderOnly) {
      fetchUserProfile();
    }
  };

  const handleDeliveryAddressUpdate = useCallback((addressInfo: any) => {
    if (addressInfo) {
      const newDeliveryAddress: CheckoutAddress = {
        addressType: addressInfo.addressType || 'HOME',
        addressData: addressInfo.addressData || {},
        orderOnly: addressInfo.orderOnly || false
      };
      setDeliveryAddress(newDeliveryAddress);

      const hasDeliveryData = newDeliveryAddress.addressData && Object.keys(newDeliveryAddress.addressData).length > 0;
      const hasInvoiceData = invoiceAddressRef.current?.addressData && Object.keys(invoiceAddressRef.current.addressData).length > 0;

      if (currentStep === 1 && hasDeliveryData && hasInvoiceData) {
        setTimeout(() => {
          validation.validateStep1(contactDataRef.current, newDeliveryAddress, invoiceAddressRef.current);
        }, 100);
      }
    }
  }, [currentStep, validation]);

  const handleInvoiceAddressUpdate = useCallback((addressInfo: any) => {
    if (addressInfo) {
      const newInvoiceAddress: CheckoutAddress = {
        addressType: addressInfo.addressType || 'HOME',
        addressData: addressInfo.addressData || {},
        orderOnly: addressInfo.orderOnly || false
      };
      setInvoiceAddress(newInvoiceAddress);

      const hasDeliveryData = deliveryAddressRef.current?.addressData && Object.keys(deliveryAddressRef.current.addressData).length > 0;
      const hasInvoiceData = newInvoiceAddress.addressData && Object.keys(newInvoiceAddress.addressData).length > 0;

      if (currentStep === 1 && hasDeliveryData && hasInvoiceData) {
        setTimeout(() => {
          validation.validateStep1(contactDataRef.current, deliveryAddressRef.current, newInvoiceAddress);
        }, 100);
      }
    }
  }, [currentStep, validation]);

  useEffect(() => {
    fetchUserProfile();
  }, [isAuthenticated, fetchUserProfile]);

  // Execute checkout_start rules
  useEffect(() => {
    const executeRules = async () => {
      if (currentStep !== 1) { setRulesMessages([]); return; }
      if (!cartData || cartItems.length === 0) { setRulesMessages([]); return; }

      setRulesLoading(true);
      setRulesMessages([]);

      try {
        const sanitizedItems = cartItems.map(item => ({
          ...item,
          actual_price: String(item.actual_price || 0)
        }));

        const total = sanitizedItems.reduce((sum, item) => {
          const price = parseFloat(String(item.actual_price));
          return sum + (price * item.quantity);
        }, 0);

        const context = {
          cart: {
            id: (cartData as CartData).id,
            items: sanitizedItems,
            total,
            user: (cartData as CartData).user || null,
            session_key: (cartData as CartData).session_key || null,
            has_marking: (cartData as CartData).has_marking || false,
            has_digital: (cartData as CartData).has_digital || false,
            has_material: (cartData as CartData).has_material || false,
            has_tutorial: (cartData as CartData).has_tutorial || false,
            created_at: (cartData as CartData).created_at,
            updated_at: (cartData as CartData).updated_at
          }
        };

        const result = await rulesEngineService.executeRules(rulesEngineService.ENTRY_POINTS.CHECKOUT_START, context);

        if (result.messages && result.messages.length > 0) {
          const modalMsgs = result.messages.filter((msg: any) => msg.display_type === 'modal');
          const alertMessages = result.messages.filter((msg: any) => msg.display_type !== 'modal');
          setRulesMessages(alertMessages);
          if (modalMsgs.length > 0) {
            setModalMessages(modalMsgs);
            setShowRulesModal(true);
          }
        }
      } catch (err: any) {
        console.error('Error executing checkout_start rules:', err);
        if (err.name === 'SchemaValidationError') {
          console.error('Schema validation failed:', err.details);
          if ((import.meta as any).env?.DEV) {
            setError(`Development Error: Schema validation failed - ${err.details}`);
          }
        }
      } finally {
        setRulesLoading(false);
      }
    };

    executeRules();
  }, [cartItems, cartData, currentStep]);

  // VAT calculations
  useEffect(() => {
    if (cartItems.length === 0) { setVatCalculations(null); return; }

    setVatLoading(true);
    try {
      if ((cartData as any)?.vat_calculations) {
        const backendVatCalcs = (cartData as any).vat_calculations;
        const totalFees = (cartData as any)?.fees
          ? (cartData as any).fees.reduce((total: number, fee: CartFee) => total + parseFloat(String(fee.amount || 0)), 0)
          : 0;

        const net = parseFloat(backendVatCalcs.totals?.net || 0);
        const vat = parseFloat(backendVatCalcs.totals?.vat || 0);
        const gross = parseFloat(backendVatCalcs.totals?.gross || 0);
        const effectiveVatRate = net > 0 ? (vat / net) : 0;

        setVatCalculations({
          success: true,
          totals: { subtotal: net, total_vat: vat, total_fees: totalFees, total_gross: gross + totalFees, effective_vat_rate: effectiveVatRate },
          fees: (cartData as any)?.fees || [],
          region_info: { region: backendVatCalcs.region || 'UNKNOWN' },
          vat_calculations: backendVatCalcs.items || []
        });
      } else {
        const subtotal = cartItems.reduce((total, item) => {
          const price = parseFloat(String(item.actual_price || 0));
          return total + (price * item.quantity);
        }, 0);

        const totalFees = (cartData as any)?.fees
          ? (cartData as any).fees.reduce((total: number, fee: CartFee) => total + parseFloat(String(fee.amount || 0)), 0)
          : 0;

        setVatCalculations({
          success: true,
          totals: { subtotal, total_vat: 0, total_fees: totalFees, total_gross: subtotal + totalFees, effective_vat_rate: 0 },
          fees: (cartData as any)?.fees || [],
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

  const steps: CheckoutStep[] = [
    { title: 'Cart Review', description: 'Review your items' },
    { title: 'Terms & Conditions', description: 'Review and accept terms' },
    { title: 'Preferences', description: 'Set your preferences' },
    { title: 'Payment', description: 'Complete payment' },
    { title: 'Confirmation', description: 'Order confirmation' }
  ];

  const isStep1Valid = (): boolean => {
    const hasContactData = !!contactData.mobile_phone && !!contactData.email_address;
    const hasDeliveryAddress = !!deliveryAddress?.addressData && Object.keys(deliveryAddress.addressData).length > 0;
    const hasInvoiceAddress = !!invoiceAddress?.addressData && Object.keys(invoiceAddress.addressData).length > 0;
    return hasContactData && hasDeliveryAddress && hasInvoiceAddress;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const step1Validation = validation.validateStep1(contactData, deliveryAddress, invoiceAddress);
      if (!step1Validation.canProceed) {
        setError(step1Validation.errors.join('. '));
        return;
      }
    }

    if (currentStep === 2 && !generalTermsAccepted) {
      setError('Please accept the Terms & Conditions to continue.');
      return;
    }

    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
      setError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleComplete = async () => {
    if (!generalTermsAccepted) {
      setError('Please accept the Terms & Conditions.');
      return;
    }

    const validationResult = await validation.validateCheckout(cartData, cartItems as CartItem[], paymentMethod, userProfile);
    if (validationResult.blocked) {
      setError(validationResult.validationMessage || 'Please complete all required acknowledgments before proceeding.');
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
      const paymentData: CheckoutPaymentData = {
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
          home_phone: { value: contactData.home_phone, inputType: 'text' },
          home_phone_country: { value: contactData.home_phone_country, inputType: 'text' },
          mobile_phone: { value: contactData.mobile_phone, inputType: 'text' },
          mobile_phone_country: { value: contactData.mobile_phone_country, inputType: 'text' },
          work_phone: { value: contactData.work_phone, inputType: 'text' },
          work_phone_country: { value: contactData.work_phone_country, inputType: 'text' },
          email_address: { value: contactData.email_address, inputType: 'text' },
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

  return {
    theme,
    isAuthenticated,
    currentStep,
    steps,
    error,
    success,
    loading,
    cartItems: cartItems as CartItem[],
    cartData,
    vatCalculations,
    vatLoading,
    userProfile,
    profileLoading,
    generalTermsAccepted,
    setGeneralTermsAccepted,
    preferences,
    setPreferences,
    contactData,
    deliveryAddress,
    invoiceAddress,
    handleContactDataUpdate,
    handleDeliveryAddressUpdate,
    handleInvoiceAddressUpdate,
    rulesMessages,
    rulesLoading,
    showRulesModal,
    setShowRulesModal,
    modalMessages,
    paymentMethod,
    setPaymentMethod,
    employerCode,
    setEmployerCode,
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
    isDevelopment,
    isUAT,
    acknowledgmentStates,
    setAcknowledgmentStates,
    requiredAcknowledgments,
    setRequiredAcknowledgments,
    validation,
    isStep1Valid,
    handleNext,
    handleBack,
    handleComplete,
  };
};

export default useCheckoutStepsVM;
