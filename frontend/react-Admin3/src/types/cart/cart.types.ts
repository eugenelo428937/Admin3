// Cart type definitions — fields match Django REST Framework API responses (snake_case)

// ─── Cart Item Metadata ─────────────────────────────────────────

export interface CartItemMetadata {
  type?: string;              // 'tutorial', 'material', 'marking', etc.
  title?: string;
  subjectCode?: string;
  location?: string;
  eventCode?: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
  choice?: string;            // '1st', '2nd', '3rd'
  choiceCount?: number;
  totalChoiceCount?: number;
  variationId?: number;
  variationName?: string;
  variationType?: string;
  producttype?: string;
  productName?: string;
  is_digital?: boolean;
  is_marking?: boolean;
  is_material?: boolean;
  is_tutorial?: boolean;
  choices?: TutorialChoiceMetadata[];
  locations?: TutorialLocationMetadata[];
  addedViaBundle?: {
    bundleName: string;
    bundleId?: number;
  };
  [key: string]: any;
}

export interface TutorialChoiceMetadata {
  eventTitle?: string;
  eventCode?: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
  choice: string;
}

export interface TutorialLocationMetadata {
  location: string;
  choices: TutorialChoiceMetadata[];
}

// ─── Cart Item ──────────────────────────────────────────────────

export interface CartItem {
  id: number;
  product_name: string;
  product_code?: string;
  subject_code?: string;
  quantity: number;
  actual_price: string | number;
  price_type?: string;         // 'standard', 'retaker', 'additional', 'reduced'
  product_type?: string;       // 'tutorial', 'marking_voucher', etc.
  variation_name?: string;
  metadata?: CartItemMetadata;
  // CartItemWithVAT component props
  product?: {
    id?: number;
    name: string;
    image?: string;
  };
  actualPrice?: number;
  vat?: CartItemVAT;
  vatCalculating?: boolean;
}

export interface CartItemVAT {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  vatRate: number;
  vatRegion?: string;
  currency?: string;
}

// ─── Cart Fee ───────────────────────────────────────────────────

export interface CartFee {
  id: number;
  name: string;
  description?: string;
  amount: string | number;
  fee_type?: string;
}

// ─── VAT Calculations ───────────────────────────────────────────

export interface VATItemCalculation {
  id: number | string;
  product_type?: string;
  net_amount: number | string;
  vat_amount: number | string;
  vat_rate: number | string;
  applied_rule?: string;
}

export interface VATTotals {
  subtotal: number;
  total_vat: number;
  total_fees: number;
  total_gross: number;
  effective_vat_rate: number;
}

export interface VATCalculations {
  success: boolean;
  totals: VATTotals;
  fees: CartFee[];
  region_info: { region?: string };
  vat_calculations: VATItemCalculation[];
}

// ─── Cart Data (full API response) ──────────────────────────────

export interface CartData {
  id: number;
  user?: number | null;
  session_key?: string | null;
  items: CartItem[];
  fees?: CartFee[];
  total?: number;
  has_digital?: boolean;
  has_marking?: boolean;
  has_material?: boolean;
  has_tutorial?: boolean;
  created_at?: string;
  updated_at?: string;
  vat_calculations?: {
    totals?: { net: number; vat: number; gross: number };
    region?: string;
    items?: VATItemCalculation[];
  };
  vatCalculationError?: boolean;
  vatCalculationErrorMessage?: string;
}

// ─── Cart Totals (for CartTotals component) ─────────────────────

export interface CartTotalsData {
  totalNetAmount?: number;
  totalVatAmount?: number;
  totalGrossAmount?: number;
  vatBreakdown?: VATBreakdownItem[];
}

export interface VATBreakdownItem {
  region: string;
  rate: string;
  amount: number;
  itemCount: number;
}

// ─── Cart Service Payloads ──────────────────────────────────────

export interface AddToCartPayload {
  current_product: number;
  quantity: number;
  price_type: string;
  actual_price?: number | string;
  metadata: CartItemMetadata;
}

export interface UpdateCartItemPayload {
  item_id: number;
  quantity: number;
  price_type: string;
  actual_price?: number | string;
  metadata: CartItemMetadata;
}

export interface RemoveCartItemPayload {
  item_id: number;
}

// ─── Price Info (from product cards) ────────────────────────────

export interface PriceInfo {
  priceType?: string;
  actualPrice?: number | string;
  quantity?: number;
  variationId?: number;
  variationName?: string;
  variationType?: string;
  metadata?: CartItemMetadata;
  [key: string]: any;
}

// ─── Product Detection Params ───────────────────────────────────

export interface ProductDetectionParams {
  variationType?: string;
  variationName?: string;
  metadataType?: string;
  productType?: string;
  productName?: string;
}

// ─── Currency Type ──────────────────────────────────────────────

export type CurrencyCode = 'GBP' | 'USD' | 'ZAR' | 'EUR';
