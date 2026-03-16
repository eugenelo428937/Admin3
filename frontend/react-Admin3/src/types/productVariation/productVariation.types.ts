// ProductVariation entity type definitions
// Fields match Django REST Framework API response (snake_case)

export type VariationType = 'eBook' | 'Hub' | 'Printed' | 'Marking' | 'Tutorial';

export interface ProductVariation {
  id: number;
  variation_type: VariationType;
  name: string;
  description: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export interface ProductVariationInput {
  variation_type: string;
  name: string;
  description: string;
  code: string;
}
