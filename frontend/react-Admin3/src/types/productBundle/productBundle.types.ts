// ProductBundle (catalog bundle) entity type definitions
// Fields match Django REST Framework API response (snake_case)

export interface ProductBundle {
  id: number;
  bundle_name: string;
  subject: { id: number; code: string } | number;
  description: string;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductBundleInput {
  bundle_name: string;
  subject: number | string;
  description: string;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
}

export interface BundleProduct {
  id: number;
  bundle: number;
  product_product_variation: number;
  product_name: string;
  product_code: string;
  variation_name: string;
  variation_code: string;
  default_price_type: string;
  quantity: number;
  sort_order: number;
}

export interface BundleProductInput {
  bundle: number;
  product_product_variation: number;
  default_price_type: string;
  quantity: number;
  sort_order: number;
}
