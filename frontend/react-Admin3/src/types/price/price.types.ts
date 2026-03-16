// Price entity type definitions
// Fields match Django REST Framework API response (snake_case)

export type PriceType = 'standard' | 'retaker' | 'reduced' | 'additional';

export interface Price {
  id: number;
  product: number;
  product_code: string;
  price_type: PriceType;
  amount: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface PriceInput {
  product: number | string;
  price_type: string;
  amount: string;
  currency: string;
}

export interface GroupedProductPrices {
  product_id: number;
  product_code: string;
  prices: Record<string, string>;
  price_ids: number[];
}
