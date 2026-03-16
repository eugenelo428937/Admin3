// StoreProduct entity type definitions
// Fields match Django REST Framework API response (snake_case)

export interface StoreProduct {
  id: number;
  exam_session_subject: { id: number } | number;
  product_product_variation: { id: number } | number;
  product_code: string;
  is_active: boolean;
  session_code: string;
  subject_code: string;
  catalog_product_id: number;
  catalog_product_code: string;
  product_name: string;
  variation_name: string;
  variation_type: string;
  created_at: string;
  updated_at: string;
}

export interface StoreProductInput {
  exam_session_subject: number | string;
  product_product_variation: number | string;
  is_active: boolean;
  product_code?: string;
}

export interface GroupedStoreProduct {
  catalog_product_id: number;
  catalog_product_code: string;
  product_name: string;
  variations: StoreProduct[];
}

export interface GroupedStoreData {
  [sessionCode: string]: {
    [subjectCode: string]: {
      [cpId: string]: GroupedStoreProduct;
    };
  };
}
