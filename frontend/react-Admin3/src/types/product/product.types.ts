// Product (catalog) entity type definitions
// Fields match Django REST Framework API response (snake_case)

export interface Product {
  id: number;
  code: string;
  fullname: string;
  shortname: string;
  description: string;
  active: boolean;
  is_active: boolean;
  buy_both: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  code: string;
  fullname: string;
  shortname: string;
  description: string;
  active: boolean;
}

export interface ProductProductVariation {
  id: number;
  product: number;
  product_variation: number;
  variation_name: string;
  variation_code: string;
  variation_type: string;
  product_code: string;
}

export interface ProductProductVariationInput {
  product: number;
  product_variation: number;
}

export interface BulkImportResponse {
  created: number;
  errors?: string[];
}
