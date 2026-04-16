export interface LegacyOrderItem {
  id: number;
  order_no: number;
  full_code: string | null;
  legacy_product_name: string | null;
  quantity: number;
  price: string;
  free_of_charge: boolean;
  is_retaker: boolean;
  is_reduced: boolean;
  is_additional: boolean;
  is_reduced_rate: boolean;
}

export interface LegacyOrder {
  id: number;
  student_ref: number;
  first_name: string;
  last_name: string;
  email: string;
  order_date: string;
  delivery_pref: string;
  items: LegacyOrderItem[];
}
