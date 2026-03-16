// Checkout type definitions — fields match Django REST Framework API responses (snake_case)

import type { CartItem, CartData, CartFee } from '../cart';

// ─── Contact Data ───────────────────────────────────────────────

export interface ContactData {
  home_phone: string;
  home_phone_country: string;
  mobile_phone: string;
  mobile_phone_country: string;
  work_phone: string;
  work_phone_country: string;
  email_address: string;
}

// ─── Address Data ───────────────────────────────────────────────

export interface CheckoutAddressData {
  address_line_1?: string;
  street?: string;
  address?: string;
  building?: string;
  city?: string;
  town?: string;
  postal_code?: string;
  postcode?: string;
  country?: string;
  [key: string]: any;
}

export interface CheckoutAddress {
  addressType: 'HOME' | 'WORK';
  addressData: CheckoutAddressData;
  orderOnly: boolean;
}

// ─── Payment Data ───────────────────────────────────────────────

export type PaymentMethod = 'card' | 'invoice';

export interface CardPaymentData {
  card_number: string;
  cardholder_name: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
}

export interface CheckoutPaymentData {
  payment_method: PaymentMethod;
  is_invoice: boolean;
  employer_code?: string;
  card_data?: CardPaymentData;
  general_terms_accepted: boolean;
  user_preferences: Record<string, any>;
}

// ─── Checkout Steps ─────────────────────────────────────────────

export interface CheckoutStep {
  title: string;
  description: string;
}

// ─── Validation ─────────────────────────────────────────────────

export interface FieldValidation {
  isValid: boolean;
  error: string | null;
}

export interface AddressValidationState {
  deliveryAddress: FieldValidation;
  invoiceAddress: FieldValidation;
}

export interface ContactValidationState {
  mobilePhone: FieldValidation;
  email: FieldValidation;
}

export interface ValidationSummary {
  total_required: number;
  total_satisfied: number;
  total_missing: number;
}

export interface CheckoutValidationState {
  isValidating: boolean;
  canProceed: boolean;
  blocked: boolean;
  summary: ValidationSummary;
  allRequiredAcknowledgments: AcknowledgmentInfo[];
  missingAcknowledgments: AcknowledgmentInfo[];
  satisfiedAcknowledgments: AcknowledgmentInfo[];
  validationMessage: string;
  lastValidated: Date | null;
  error: string | null;
  addressValidation: AddressValidationState;
  contactValidation: ContactValidationState;
}

export interface Step1ValidationResult {
  canProceed: boolean;
  errors: string[];
  contactValidation: ContactValidationState;
  addressValidation: AddressValidationState;
}

// ─── Acknowledgments ────────────────────────────────────────────

export interface AcknowledgmentInfo {
  ack_key?: string;
  ackKey?: string;
  entry_point?: string;
  template_id?: string | number;
  required?: boolean;
  [key: string]: any;
}

export interface AcknowledgmentStates {
  [ackKey: string]: boolean;
}

export interface AcknowledgmentMessage {
  ack_key: string;
  template_id?: string | number;
  title?: string;
  content?: any;
  display_type?: string;
  type?: string;
  required?: boolean;
  parsed?: any;
}

export interface AcknowledgmentModalState {
  open: boolean;
  message: AcknowledgmentMessage | null;
  entryPointLocation: string | null;
  onAcknowledge: ((data: any) => void) | null;
  onClose: (() => void) | null;
  required: boolean;
}

// ─── Rules Engine Results ───────────────────────────────────────

export interface RulesMessage {
  template_id?: string | number;
  display_type?: string;
  type?: string;
  title?: string;
  content?: any;
  variant?: string;
  dismissible?: boolean;
  ack_key?: string;
  required?: boolean;
  parsed?: any;
  [key: string]: any;
}

export interface RulesEngineResult {
  success: boolean;
  blocked?: boolean;
  requires_acknowledgment?: boolean;
  messages?: {
    classified?: {
      acknowledgments?: {
        inline: AcknowledgmentMessage[];
        modal: AcknowledgmentMessage[];
      };
      displays?: {
        all: RulesMessage[];
      };
    };
    [key: string]: any;
  };
  preference_prompts?: PreferencePrompt[];
  preferences?: PreferencePrompt[];
  updates?: {
    cart_fees?: CartFeeUpdate[];
    cart_fees_removed?: CartFeeRemoved[];
  };
  required_acknowledgments?: AcknowledgmentInfo[];
  errors?: string[];
}

interface CartFeeUpdate {
  fee_type: string;
  amount: string | number;
}

interface CartFeeRemoved {
  fee_type: string;
  removed: boolean;
}

// ─── Preferences ────────────────────────────────────────────────

export interface PreferencePrompt {
  preferenceKey: string;
  title: string;
  content?: any;
  inputType: 'radio' | 'checkbox' | 'text' | 'textarea' | 'combined_checkbox_textarea';
  options?: PreferenceOption[];
  default?: string | boolean;
  placeholder?: string;
  checkboxLabel?: string;
  textareaLabel?: string;
  textareaPlaceholder?: string;
  ruleId?: string;
}

export interface PreferenceOption {
  value: string;
  label: string;
}

export interface PreferenceValue {
  value: any;
  inputType: string;
  ruleId?: string;
}

export interface PreferencesState {
  [preferenceKey: string]: PreferenceValue;
}

// ─── Terms Content ──────────────────────────────────────────────

export interface TermsContent {
  title?: string;
  message?: string;
  content?: string;
  checkbox_text?: string;
  template_id?: string | number;
  ack_key?: string;
  required?: boolean;
}

// ─── Test Card ──────────────────────────────────────────────────

export interface TestCard {
  name: string;
  number: string;
  cvv: string;
}

// ─── Comprehensive Validation Result ────────────────────────────

export interface ComprehensiveValidationResult {
  success: boolean;
  blocked: boolean;
  canProceed: boolean;
  error?: string;
  summary: ValidationSummary;
  allRequiredAcknowledgments: AcknowledgmentInfo[];
  missingAcknowledgments: AcknowledgmentInfo[] | { details: AcknowledgmentInfo[]; message?: string };
  satisfiedAcknowledgments: AcknowledgmentInfo[];
  blockingRules?: any[];
  validationMessage?: string;
}

export interface MissingAcknowledgmentsResult {
  total: number;
  byEntryPoint: Record<string, AcknowledgmentInfo[]>;
  details: AcknowledgmentInfo[];
  message: string;
}

// ─── Validation Context (for acknowledgment service) ────────────

export interface ValidationContext {
  cart: {
    id?: number;
    items: CartItem[];
    total: number;
    has_digital?: boolean;
    has_material?: boolean;
    has_tutorial?: boolean;
    has_marking?: boolean;
  };
  payment: {
    method: string;
    is_card: boolean;
  };
  user?: {
    id?: number;
    email?: string;
    is_authenticated: boolean;
    home_country?: string;
    work_country?: string;
  };
}
