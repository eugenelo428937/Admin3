export interface StudentSummary {
  student_ref: number | null;
  first_name: string;
  last_name: string;
  email: string;
}

export interface AdminOrderListItem {
  id: number;
  created_at: string;
  total_amount: string;
  student: StudentSummary;
  item_codes: string[];
  item_count: number;
}

export interface AdminOrderItem {
  id: number;
  item_type: string | null;
  item_name: string | null;
  quantity: number;
  price_type: string;
  actual_price: string | null;
  net_amount: string;
  vat_amount: string;
  gross_amount: string;
  vat_rate: string;
  is_vat_exempt: boolean;
  metadata: Record<string, unknown>;
  purchasable: { id: number; code: string; name: string; kind: string } | null;
}

export interface AdminPayment {
  id: number;
  payment_method: string;
  amount: string;
  currency: string;
  transaction_id: string | null;
  status: string;
  is_successful: boolean;
  error_message: string | null;
  error_code: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface AdminOrderContact {
  id: number;
  home_phone: string | null;
  home_phone_country: string;
  mobile_phone: string;
  mobile_phone_country: string;
  work_phone: string | null;
  work_phone_country: string;
  email_address: string;
  created_at: string;
  updated_at: string;
}

export interface AdminOrderPreference {
  id: number;
  preference_type: string;
  preference_key: string;
  preference_value: Record<string, unknown>;
  input_type: string;
  display_mode: string;
  title: string;
  content_summary: string;
  is_submitted: boolean;
  submitted_at: string;
  updated_at: string;
  display_value: string;
}

export interface AdminOrderAcknowledgment {
  id: number;
  acknowledgment_type: string;
  rule_id: number | null;
  template_id: number | null;
  title: string;
  content_summary: string;
  is_accepted: boolean;
  accepted_at: string;
  content_version: string;
  acknowledgment_data: Record<string, unknown>;
}

export interface AdminOrderDetail {
  id: number;
  created_at: string;
  updated_at: string;
  subtotal: string;
  vat_amount: string;
  total_amount: string;
  vat_rate: string | null;
  vat_country: string | null;
  vat_calculation_type: string | null;
  calculations_applied: Record<string, unknown>;
  student: StudentSummary;
  items: AdminOrderItem[];
  payments: AdminPayment[];
  user_contact: AdminOrderContact | null;
  user_preferences: AdminOrderPreference[];
  user_acknowledgments: AdminOrderAcknowledgment[];
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
