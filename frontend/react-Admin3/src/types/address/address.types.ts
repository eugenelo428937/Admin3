// Address type definitions for the address metadata, validation, and form system.
// The base Address interface lives in ../auth/user.types.ts and is re-exported here.

export type { Address } from '../auth/user.types';

// ─── Address Type Identifiers ───────────────────────────────────

export type AddressLocationType = 'HOME' | 'WORK';
export type AddressPurpose = 'delivery' | 'invoice';

// ─── Address Metadata (country-specific field configuration) ────

export interface FieldOption {
  value: string;
  label: string;
}

export interface AddressFieldConfig {
  label: string;
  placeholder?: string;
  type?: 'text' | 'select';
  options?: FieldOption[];
  pattern?: RegExp;
  error?: string;
  transform?: (value: string) => string;
  helpText?: string;
}

export interface LayoutField {
  field: string;
  span: number;
}

export type LayoutRow = LayoutField[];

export interface AddressMetadata {
  format: string;
  required: string[];
  optional: string[];
  hasPostcode: boolean;
  addressLookupSupported: boolean;
  requiresPostcodeForLookup: boolean;
  fields: Record<string, AddressFieldConfig>;
  layout: LayoutRow[];
}

// ─── Google libaddressinput API types ───────────────────────────

export interface GoogleAddressData {
  fmt?: string;
  require?: string;
  upper?: string;
  zip?: string;
  zip_name_type?: string;
  zipex?: string;
  state_name_type?: string;
  locality_name_type?: string;
  sublocality_name_type?: string;
  [key: string]: any;
}

// ─── Address Validation ─────────────────────────────────────────

export interface AddressValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface AddressLookupValidationResult {
  hasMatch: boolean;
  bestMatch: Record<string, string> | null;
  needsComparison: boolean;
  allMatches?: Record<string, string>[];
  error?: string;
}

export interface AddressDifference {
  user: string;
  suggested: string;
}

// ─── Address Suggestion (from Postcoder API) ────────────────────

export interface AddressSuggestion {
  id: string;
  line1: string;
  line2: string;
  town: string;
  county: string;
  postcode: string;
  country: string;
  state: string;
  district: string;
  sub_building_name: string;
  building_name: string;
  building_number: string;
  fullAddress: string;
}

// ─── Postcoder API response types ───────────────────────────────

export interface PostcoderAddress {
  id?: string;
  line_1?: string;
  line_2?: string;
  line_3?: string;
  town_or_city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  state?: string;
  building_name?: string;
  building_number?: string;
  sub_building_name?: string;
  [key: string]: any;
}

export interface PostcoderResponse {
  addresses: PostcoderAddress[];
}

// ─── Address Change Event (used by form components) ─────────────

export interface AddressChangeEvent {
  target: {
    name: string;
    value: string;
  };
}

export type AddressChangeHandler = (e: AddressChangeEvent) => void;

// ─── Address Selection (used by AddressSelectionPanel) ──────────

export interface AddressSelection {
  addressType: AddressLocationType;
  addressData: Record<string, string>;
  orderOnly?: boolean;
}

// ─── Address Update Result (from AddressEditModal) ──────────────

export interface AddressUpdateResult {
  orderOnly?: boolean;
  addressData?: Record<string, string>;
}

// ─── Dropdown Position (for Portal-based suggestions) ───────────

export interface DropdownPosition {
  top: number;
  left: number;
  width: number;
}
