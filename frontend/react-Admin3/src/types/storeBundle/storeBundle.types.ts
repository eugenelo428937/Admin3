// StoreBundle entity type definitions
// Fields match Django REST Framework API response (snake_case)

export interface StoreBundle {
  id: number;
  bundle_template: { id: number; name?: string } | number;
  exam_session_subject: { id: number } | number;
  name: string;
  bundle_template_name: string;
  subject_code: string;
  exam_session_code: string;
  override_name: string;
  override_description: string;
  is_active: boolean;
  components_count: number;
  created_at: string;
  updated_at: string;
}

export interface StoreBundleInput {
  bundle_template: number | string;
  exam_session_subject: number | string;
  override_name: string;
  override_description: string;
  is_active: boolean;
}

export interface StoreBundleProduct {
  id: number;
  product_code: string;
  product: { fullname: string } | null;
  product_variation: { name: string; variation_type: string } | null;
  default_price_type: string;
  quantity: number;
  sort_order: number;
}
