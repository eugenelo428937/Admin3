// User profile type definitions — fields match Django REST Framework API responses (snake_case)

// ─── User Profile ────────────────────────────────────────────────

export interface UserProfile {
  id: number;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
  };
  title?: string;
  home_phone?: string;
  mobile_phone?: string;
  home_address?: Address;
  work_address?: Address;
  send_invoices_to: 'HOME' | 'WORK';
  send_study_material_to: 'HOME' | 'WORK';
  [key: string]: any;
}

// ─── Address ─────────────────────────────────────────────────────

export interface Address {
  id?: number;
  building?: string;
  address?: string;
  district?: string;
  city?: string;
  county?: string;
  postal_code?: string;
  state?: string;
  country?: string;
}

// ─── Contact Number ──────────────────────────────────────────────

export interface ContactNumber {
  id?: number;
  number: string;
  type: string;
  country_code?: string;
}

// ─── Profile Update ──────────────────────────────────────────────

export interface ProfileUpdateData {
  user?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  profile?: {
    title?: string;
    send_invoices_to?: 'HOME' | 'WORK';
    send_study_material_to?: 'HOME' | 'WORK';
  };
  home_address?: Partial<Address>;
  work_address?: Partial<Address> | null;
  contact_numbers?: ContactNumber[];
  [key: string]: any;
}

export interface ProfileUpdateResult {
  status: 'success' | 'error';
  message: string;
  email_verification_sent?: boolean;
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ChangePasswordResult {
  status: 'success' | 'error';
  message: string;
}

export interface EmailVerificationRequestResult {
  status: 'success' | 'error';
  message: string;
}

// ─── Service Response Wrapper ────────────────────────────────────

export interface ServiceResponse<T = any> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  code?: number;
}

// ─── Order History ───────────────────────────────────────────────

export interface OrderItem {
  id: number;
  product_name?: string;
  product?: string;
  quantity: number;
  actual_price?: string;
  price_type?: string;
  metadata?: OrderItemMetadata;
}

export interface OrderItemMetadata {
  type?: string;
  title?: string;
  subjectCode?: string;
  location?: string;
  eventCode?: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
  choice?: string;
  choiceCount?: number;
  totalChoiceCount?: number;
  variationName?: string;
  choices?: TutorialChoice[];
  locations?: TutorialLocation[];
}

export interface TutorialChoice {
  eventTitle?: string;
  eventCode?: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
  choice: string;
}

export interface TutorialLocation {
  location: string;
  choices: TutorialChoice[];
}

export interface Order {
  id: number;
  created_at: string;
  items: OrderItem[];
  [key: string]: any;
}

// ─── Country / Phone ─────────────────────────────────────────────

export interface Country {
  code: string;
  name: string;
  phone_code: string;
  flag?: string;
}

export interface PhoneValidationResult {
  isValid: boolean;
  error?: string;
  formatted?: string;
}

// ─── Form Wizard ─────────────────────────────────────────────────

export type WizardMode = 'registration' | 'profile' | 'admin';

export interface WizardStepData {
  [key: string]: any;
  _phoneCountries?: Record<string, Country>;
  _phoneValidation?: Record<string, PhoneValidationResult>;
}

export interface WizardValidationErrors {
  [field: string]: string;
}
