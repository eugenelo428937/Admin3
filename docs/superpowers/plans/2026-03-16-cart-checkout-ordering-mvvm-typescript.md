# Cart, Checkout & Ordering — MVVM TypeScript Migration Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all cart, checkout, and ordering frontend code from JavaScript to TypeScript with MVVM (Model-ViewModel-View) architecture.

**Architecture:** The cart/checkout/ordering system spans contexts (CartContext), services (cartService, acknowledgmentService), hooks (useCheckoutValidation, useCheckoutRulesEngine, useRulesEngineAcknowledgments), and ~15 UI components across Cart, Ordering, and User directories. OrderHistory is already migrated. The migration converts JS→TS bottom-up: types → services → context → hooks → components.

**Tech Stack:** React 19.2, TypeScript, Material-UI v7, React Router v6, Axios, CartContext (React Context API)

**Already Migrated (skip):**
- `OrderHistory.tsx` + `useOrderHistoryVM.ts` — already MVVM TypeScript
- `user.types.ts` — Order/OrderItem types already exist

---

## Chunk 1: Type Definitions

### Task 1: Create cart type definitions

**Files:**
- Create: `src/types/cart/cart.types.ts`
- Create: `src/types/cart/index.ts`

- [ ] **Step 1: Create cart types file**

```typescript
// src/types/cart/cart.types.ts

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
  // CartItemWithVAT props (from Cart page)
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
```

- [ ] **Step 2: Create barrel export**

```typescript
// src/types/cart/index.ts
export * from './cart.types';
```

- [ ] **Step 3: Verify types compile**

Run: `cd frontend/react-Admin3 && npx tsc --noEmit src/types/cart/cart.types.ts`

---

### Task 2: Create checkout type definitions

**Files:**
- Create: `src/types/checkout/checkout.types.ts`
- Create: `src/types/checkout/index.ts`

- [ ] **Step 1: Create checkout types file**

```typescript
// src/types/checkout/checkout.types.ts

// ─── Contact Data ───────────────────────────────────────────────
export interface ContactData {
  home_phone: string;
  home_phone_country: string;
  mobile_phone: string;
  mobile_phone_country: string;
  work_phone: string;
  work_phone_country: string;
  email_address: string;
}

// ─── Address Data ───────────────────────────────────────────────
export interface CheckoutAddressData {
  [key: string]: any;
  address_line_1?: string;
  street?: string;
  address?: string;
  building?: string;
  city?: string;
  town?: string;
  postal_code?: string;
  postcode?: string;
  country?: string;
}

export interface CheckoutAddress {
  addressType: 'HOME' | 'WORK';
  addressData: CheckoutAddressData;
  orderOnly: boolean;
}

// ─── Payment Data ───────────────────────────────────────────────
export type PaymentMethod = 'card' | 'invoice';

export interface CardPaymentData {
  card_number: string;
  cardholder_name: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
}

export interface CheckoutPaymentData {
  payment_method: PaymentMethod;
  is_invoice: boolean;
  employer_code?: string;
  card_data?: CardPaymentData;
  general_terms_accepted: boolean;
  user_preferences: Record<string, any>;
}

// ─── Checkout Steps ─────────────────────────────────────────────
export interface CheckoutStep {
  title: string;
  description: string;
}

// ─── Validation ─────────────────────────────────────────────────
export interface FieldValidation {
  isValid: boolean;
  error: string | null;
}

export interface AddressValidationState {
  deliveryAddress: FieldValidation;
  invoiceAddress: FieldValidation;
}

export interface ContactValidationState {
  mobilePhone: FieldValidation;
  email: FieldValidation;
}

export interface ValidationSummary {
  total_required: number;
  total_satisfied: number;
  total_missing: number;
}

export interface CheckoutValidationState {
  isValidating: boolean;
  canProceed: boolean;
  blocked: boolean;
  summary: ValidationSummary;
  allRequiredAcknowledgments: AcknowledgmentInfo[];
  missingAcknowledgments: AcknowledgmentInfo[];
  satisfiedAcknowledgments: AcknowledgmentInfo[];
  validationMessage: string;
  lastValidated: Date | null;
  error: string | null;
  addressValidation: AddressValidationState;
  contactValidation: ContactValidationState;
}

export interface Step1ValidationResult {
  canProceed: boolean;
  errors: string[];
  contactValidation: ContactValidationState;
  addressValidation: AddressValidationState;
}

// ─── Acknowledgments ────────────────────────────────────────────
export interface AcknowledgmentInfo {
  ack_key?: string;
  ackKey?: string;
  entry_point?: string;
  template_id?: string | number;
  required?: boolean;
  [key: string]: any;
}

export interface AcknowledgmentStates {
  [ackKey: string]: boolean;
}

export interface AcknowledgmentMessage {
  ack_key: string;
  template_id?: string | number;
  title?: string;
  content?: any;
  display_type?: string;
  type?: string;
  required?: boolean;
  parsed?: any;
}

export interface AcknowledgmentModalState {
  open: boolean;
  message: AcknowledgmentMessage | null;
  entryPointLocation: string | null;
  onAcknowledge: ((data: any) => void) | null;
  onClose: (() => void) | null;
  required: boolean;
}

// ─── Rules Engine Results ───────────────────────────────────────
export interface RulesMessage {
  template_id?: string | number;
  display_type?: string;  // 'modal', 'inline', 'banner'
  type?: string;          // 'acknowledge', 'display'
  title?: string;
  content?: any;
  variant?: string;
  dismissible?: boolean;
  ack_key?: string;
  required?: boolean;
  parsed?: any;
  [key: string]: any;
}

export interface RulesEngineResult {
  success: boolean;
  blocked?: boolean;
  requires_acknowledgment?: boolean;
  messages?: {
    classified?: {
      acknowledgments?: {
        inline: AcknowledgmentMessage[];
        modal: AcknowledgmentMessage[];
      };
      displays?: {
        all: RulesMessage[];
      };
    };
    [key: string]: any;
  };
  preference_prompts?: PreferencePrompt[];
  preferences?: PreferencePrompt[];
  updates?: {
    cart_fees?: CartFeeUpdate[];
    cart_fees_removed?: CartFeeRemoved[];
  };
  required_acknowledgments?: AcknowledgmentInfo[];
  errors?: string[];
}

interface CartFeeUpdate {
  fee_type: string;
  amount: string | number;
}

interface CartFeeRemoved {
  fee_type: string;
  removed: boolean;
}

// ─── Preferences ────────────────────────────────────────────────
export interface PreferencePrompt {
  preferenceKey: string;
  title: string;
  content?: any;
  inputType: 'radio' | 'checkbox' | 'text' | 'textarea' | 'combined_checkbox_textarea';
  options?: PreferenceOption[];
  default?: string | boolean;
  placeholder?: string;
  checkboxLabel?: string;
  textareaLabel?: string;
  textareaPlaceholder?: string;
  ruleId?: string;
}

export interface PreferenceOption {
  value: string;
  label: string;
}

export interface PreferenceValue {
  value: any;
  inputType: string;
  ruleId?: string;
}

export interface PreferencesState {
  [preferenceKey: string]: PreferenceValue;
}

// ─── Terms Content ──────────────────────────────────────────────
export interface TermsContent {
  title?: string;
  message?: string;
  content?: string;
  checkbox_text?: string;
  template_id?: string | number;
  ack_key?: string;
  required?: boolean;
}

// ─── Test Card ──────────────────────────────────────────────────
export interface TestCard {
  name: string;
  number: string;
  cvv: string;
}

// ─── Comprehensive Validation Result ────────────────────────────
export interface ComprehensiveValidationResult {
  success: boolean;
  blocked: boolean;
  canProceed: boolean;
  error?: string;
  summary: ValidationSummary;
  allRequiredAcknowledgments: AcknowledgmentInfo[];
  missingAcknowledgments: AcknowledgmentInfo[] | { details: AcknowledgmentInfo[]; message?: string };
  satisfiedAcknowledgments: AcknowledgmentInfo[];
  blockingRules?: any[];
  validationMessage?: string;
}

export interface MissingAcknowledgmentsResult {
  total: number;
  byEntryPoint: Record<string, AcknowledgmentInfo[]>;
  details: AcknowledgmentInfo[];
  message: string;
}
```

- [ ] **Step 2: Create barrel export**

```typescript
// src/types/checkout/index.ts
export * from './checkout.types';
```

- [ ] **Step 3: Verify types compile**

Run: `cd frontend/react-Admin3 && npx tsc --noEmit src/types/checkout/checkout.types.ts`

- [ ] **Step 4: Commit types**

```bash
git add src/types/cart/ src/types/checkout/
git commit -m "feat: add cart and checkout TypeScript type definitions for MVVM migration"
```

---

## Chunk 2: Services

### Task 3: Convert cartService to TypeScript

**Files:**
- Create: `src/services/cartService.ts`
- Delete: `src/services/cartService.js`

- [ ] **Step 1: Create typed cartService.ts**

Convert `cartService.js` to TypeScript preserving all functions (isDigitalProduct, isMarkingProduct, isMaterialProduct, isTutorialProduct, buildCartMetadata) and all service methods (fetchCart, addToCart, updateItem, removeItem, clearCart, checkout, fetchOrders, addVoucherToCart).

Key changes:
- Add `import type` for all cart types
- Type all function parameters and return values
- Type `buildCartMetadata` params with `ProductDetectionParams`
- Service methods return `Promise<AxiosResponse<CartData>>` etc.
- Use `(config as any).cartUrl` since config is untyped

- [ ] **Step 2: Delete old JS file**

```bash
rm src/services/cartService.js
```

- [ ] **Step 3: Verify no import errors**

Run: `cd frontend/react-Admin3 && npx tsc --noEmit src/services/cartService.ts 2>&1 | head -20`

---

### Task 4: Convert acknowledgmentService to TypeScript

**Files:**
- Create: `src/services/acknowledgmentService.ts`
- Delete: `src/services/acknowledgmentService.js`

- [ ] **Step 1: Create typed acknowledgmentService.ts**

Convert class-based `AcknowledgmentService` to TypeScript. Type all methods:
- `validateComprehensiveCheckout(context): Promise<ComprehensiveValidationResult>`
- `collectAllRequiredAcknowledgments(context): Promise<AcknowledgmentInfo[]>`
- `canProceedWithCheckout(context): Promise<boolean>`
- `getMissingAcknowledgments(context): Promise<MissingAcknowledgmentsResult>`
- `buildValidationContext(cartData, cartItems, paymentMethod, userProfile?): ValidationContext`
- `validateCheckoutReadiness(cartData, cartItems, paymentMethod, userProfile?): Promise<...>`

- [ ] **Step 2: Delete old JS file and verify**

```bash
rm src/services/acknowledgmentService.js
```

- [ ] **Step 3: Commit services**

```bash
git add src/services/cartService.ts src/services/acknowledgmentService.ts
git commit -m "feat: convert cartService and acknowledgmentService to TypeScript"
```

---

## Chunk 3: Context

### Task 5: Convert CartContext to TypeScript

**Files:**
- Create: `src/contexts/CartContext.tsx`
- Delete: `src/contexts/CartContext.js`

- [ ] **Step 1: Create typed CartContext.tsx**

Key changes:
- Define `CartContextValue` interface with all exported values/methods
- Type `createContext<CartContextValue | undefined>(undefined)`
- Type all parameters: `addToCart(product: any, priceInfo?: PriceInfo)`
- Type state: `useState<CartItem[]>([])`, `useState<CartData | null>(null)`
- Export `useCart()` with proper return type
- Import from `cartService.ts` (not .js)

- [ ] **Step 2: Delete old JS file**

```bash
rm src/contexts/CartContext.js
```

- [ ] **Step 3: Update all imports referencing CartContext.js**

Search for `CartContext.js` across the codebase and update to `CartContext.tsx`.

Files to update (from codebase exploration):
- `src/App.js` — `import { CartProvider } from "./contexts/CartContext.js"` → `.tsx`
- `src/components/Ordering/CheckoutSteps.js` (will be migrated later)
- `src/components/Ordering/CheckoutSteps/PreferenceStep.js` (will be migrated later)
- `src/components/Ordering/CheckoutSteps/PaymentStep.js` (will be migrated later)
- `src/components/Ordering/CartPanel.js` (will be migrated later)
- Other consumers

- [ ] **Step 4: Commit context**

```bash
git add src/contexts/CartContext.tsx src/App.js
git commit -m "feat: convert CartContext to TypeScript with typed context value"
```

---

## Chunk 4: Hooks

### Task 6: Convert useCheckoutValidation to TypeScript

**Files:**
- Create: `src/hooks/useCheckoutValidation.ts`
- Delete: `src/hooks/useCheckoutValidation.js`

- [ ] **Step 1: Create typed useCheckoutValidation.ts**

Key changes:
- Type `validationState` with `CheckoutValidationState`
- Type all validation functions with proper params/returns
- `validateStep1(contactData: ContactData, deliveryAddress: CheckoutAddress, invoiceAddress: CheckoutAddress): Step1ValidationResult`
- `validateCheckout(cartData, cartItems, paymentMethod, userProfile?): Promise<ComprehensiveValidationResult>`
- `validateEmail(email: string): FieldValidation`
- `validatePhone(phoneNumber: string, countryCode?: string, isRequired?: boolean): FieldValidation & { formattedNumber?: string }`
- Import `parsePhoneNumber` from 'libphonenumber-js'
- Import types from `../types/checkout`

- [ ] **Step 2: Delete old JS file**

```bash
rm src/hooks/useCheckoutValidation.js
```

---

### Task 7: Convert useCheckoutRulesEngine to TypeScript

**Files:**
- Create: `src/hooks/useCheckoutRulesEngine.ts`
- Delete: `src/hooks/useCheckoutRulesEngine.js`

- [ ] **Step 1: Create typed useCheckoutRulesEngine.ts**

Type the hook:
- Parameters: `(cartData: CartData | null, cartItems: CartItem[])`
- Return type with `rulesResult`, `loading`, `error`, and helper functions
- Helper return types: `getInlineAcknowledgments(): AcknowledgmentMessage[]`, etc.

- [ ] **Step 2: Delete old JS file**

---

### Task 8: Convert useRulesEngineAcknowledgments to TypeScript

**Files:**
- Create: `src/hooks/useRulesEngineAcknowledgments.ts`
- Delete: `src/hooks/useRulesEngineAcknowledgments.js`

- [ ] **Step 1: Create typed useRulesEngineAcknowledgments.ts**

Type all state and callbacks:
- `acknowledgmentModal: AcknowledgmentModalState`
- `showAcknowledgmentModal(params): void`
- `submitAcknowledgment(data): Promise<any>`
- `executeRulesWithAcknowledgments(entryPoint, context, rulesEngineService): Promise<boolean>`

- [ ] **Step 2: Delete old JS file**

- [ ] **Step 3: Commit hooks**

```bash
git add src/hooks/useCheckoutValidation.ts src/hooks/useCheckoutRulesEngine.ts src/hooks/useRulesEngineAcknowledgments.ts
git commit -m "feat: convert checkout hooks to TypeScript"
```

---

## Chunk 5: Cart Components (MVVM)

### Task 9: Create Cart page ViewModel and View

**Files:**
- Create: `src/pages/useCartPageVM.ts`
- Create: `src/pages/Cart.tsx`
- Delete: `src/pages/Cart.js`

- [ ] **Step 1: Create useCartPageVM.ts**

Extract all state and logic from Cart.js into the ViewModel:
- State: `loading`, `error`, `cartData`
- Actions: `fetchCartData`, `handleQuantityChange`, `handleRemoveItem`, `handleRetryVAT`, `handleCheckout`
- Import `cartService` from TypeScript service

```typescript
export interface CartPageVM {
  loading: boolean;
  error: string | null;
  cartData: CartData | null;
  fetchCartData: () => Promise<void>;
  handleQuantityChange: (itemId: number, newQuantity: number) => Promise<void>;
  handleRemoveItem: (itemId: number) => Promise<void>;
  handleRetryVAT: () => Promise<void>;
  handleCheckout: () => void;
}
```

- [ ] **Step 2: Create Cart.tsx View**

Pure presentational component:
```typescript
const Cart: React.FC = () => {
  const vm = useCartPageVM();
  // ... render using vm.*
};
```

- [ ] **Step 3: Delete old Cart.js**

---

### Task 10: Convert CartPanel to MVVM TypeScript

**Files:**
- Create: `src/components/Ordering/useCartPanelVM.ts`
- Create: `src/components/Ordering/CartPanel.tsx`
- Delete: `src/components/Ordering/CartPanel.js`

- [ ] **Step 1: Create useCartPanelVM.ts**

Extract logic from CartPanel.js:
- Consumes `useCart()`, `useTutorialChoice()`, `useAuth()`
- State: none (all from context)
- Actions: `handleSafeClose`, `handleRemoveItem`, `handleClearCart`, `handleCheckout`, `getItemPriceDisplay`

```typescript
export interface CartPanelVM {
  cartItems: CartItem[];
  cartData: CartData | null;
  isAuthenticated: boolean;
  handleSafeClose: () => void;
  handleRemoveItem: (item: CartItem) => void;
  handleClearCart: () => void;
  handleCheckout: () => void;
  getItemPriceDisplay: (item: CartItem) => string;
}

const useCartPanelVM = (handleClose?: () => void): CartPanelVM => { ... };
```

- [ ] **Step 2: Create CartPanel.tsx View**

- [ ] **Step 3: Delete old CartPanel.js**

---

### Task 11: Convert Cart sub-components to TypeScript

**Files:**
- Create: `src/components/Cart/CartItemWithVAT.tsx` (from `.js`)
- Create: `src/components/Cart/CartTotals.tsx` (from `.js`)
- Create: `src/components/Cart/CartVATDisplay.tsx` (from `.js`)
- Create: `src/components/Cart/CartVATError.tsx` (from `.js`)
- Delete all `.js` counterparts

These are pure presentational components — no ViewModel needed (they receive everything via props). Just convert to typed React.FC with proper prop interfaces.

- [ ] **Step 1: Convert CartVATDisplay.tsx**

Replace PropTypes with TypeScript interface:
```typescript
interface CartVATDisplayProps {
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  vatRate: number;
  vatRegion?: string;
  currency?: CurrencyCode;
  className?: string;
}
const CartVATDisplay: React.FC<CartVATDisplayProps> = ({ ... }) => { ... };
```

- [ ] **Step 2: Convert CartVATError.tsx**

```typescript
interface CartVATErrorProps {
  error?: boolean;
  errorMessage?: string;
  onRetry: () => Promise<void>;
  onDismiss?: () => void;
  className?: string;
}
```

- [ ] **Step 3: Convert CartTotals.tsx**

```typescript
interface CartTotalsProps {
  totals?: CartTotalsData;
  currency?: CurrencyCode;
  className?: string;
}
```

- [ ] **Step 4: Convert CartItemWithVAT.tsx**

```typescript
interface CartItemWithVATProps {
  item: CartItem;
  onQuantityChange: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
  className?: string;
}
```

- [ ] **Step 5: Delete all old .js files and commit**

```bash
rm src/components/Cart/CartItemWithVAT.js src/components/Cart/CartTotals.js
rm src/components/Cart/CartVATDisplay.js src/components/Cart/CartVATError.js
rm src/pages/Cart.js src/components/Ordering/CartPanel.js
git add -A src/components/Cart/ src/pages/Cart.tsx src/pages/useCartPageVM.ts
git add src/components/Ordering/CartPanel.tsx src/components/Ordering/useCartPanelVM.ts
git commit -m "feat: migrate cart components to MVVM TypeScript"
```

---

## Chunk 6: Checkout Components (MVVM)

### Task 12: Create CheckoutPage ViewModel and View

**Files:**
- Create: `src/components/Ordering/useCheckoutPageVM.ts`
- Create: `src/components/Ordering/CheckoutPage.tsx`
- Delete: `src/components/Ordering/CheckoutPage.js`

- [ ] **Step 1: Create useCheckoutPageVM.ts**

```typescript
export interface CheckoutPageVM {
  cartItems: CartItem[];
  loading: boolean;
  success: string;
  error: string;
  checkoutComplete: boolean;
  handleCheckoutComplete: (paymentData?: CheckoutPaymentData) => Promise<void>;
}
```

- [ ] **Step 2: Create CheckoutPage.tsx View**

- [ ] **Step 3: Delete old CheckoutPage.js**

---

### Task 13: Create CheckoutSteps ViewModel and View

This is the most complex component — ~710 lines with extensive state management.

**Files:**
- Create: `src/components/Ordering/useCheckoutStepsVM.ts`
- Create: `src/components/Ordering/CheckoutSteps.tsx`
- Delete: `src/components/Ordering/CheckoutSteps.js`

- [ ] **Step 1: Create useCheckoutStepsVM.ts**

Extract ALL state and logic from CheckoutSteps.js:

```typescript
export interface CheckoutStepsVM {
  // Auth
  isAuthenticated: boolean;

  // Step management
  currentStep: number;
  steps: CheckoutStep[];
  error: string;
  success: string;
  loading: boolean;

  // Cart data (from context)
  cartItems: CartItem[];
  cartData: CartData | null;

  // VAT
  vatCalculations: VATCalculations | null;
  vatLoading: boolean;

  // Profile
  userProfile: any;
  profileLoading: boolean;

  // Terms
  generalTermsAccepted: boolean;
  setGeneralTermsAccepted: React.Dispatch<React.SetStateAction<boolean>>;

  // Preferences
  preferences: PreferencesState;
  setPreferences: React.Dispatch<React.SetStateAction<PreferencesState>>;

  // Contact & Address
  contactData: ContactData;
  deliveryAddress: CheckoutAddress;
  invoiceAddress: CheckoutAddress;
  handleContactDataUpdate: (updateData: any) => void;
  handleDeliveryAddressUpdate: (addressInfo: any) => void;
  handleInvoiceAddressUpdate: (addressInfo: any) => void;

  // Rules
  rulesMessages: RulesMessage[];
  rulesLoading: boolean;
  showRulesModal: boolean;
  setShowRulesModal: React.Dispatch<React.SetStateAction<boolean>>;
  modalMessages: RulesMessage[];

  // Payment
  paymentMethod: PaymentMethod;
  setPaymentMethod: React.Dispatch<React.SetStateAction<PaymentMethod>>;
  employerCode: string;
  setEmployerCode: React.Dispatch<React.SetStateAction<string>>;
  cardNumber: string;
  setCardNumber: React.Dispatch<React.SetStateAction<string>>;
  cardholderName: string;
  setCardholderName: React.Dispatch<React.SetStateAction<string>>;
  expiryMonth: string;
  setExpiryMonth: React.Dispatch<React.SetStateAction<string>>;
  expiryYear: string;
  setExpiryYear: React.Dispatch<React.SetStateAction<string>>;
  cvv: string;
  setCvv: React.Dispatch<React.SetStateAction<string>>;
  isDevelopment: boolean;
  isUAT: boolean;

  // Acknowledgments
  acknowledgmentStates: AcknowledgmentStates;
  setAcknowledgmentStates: React.Dispatch<React.SetStateAction<AcknowledgmentStates>>;
  requiredAcknowledgments: AcknowledgmentInfo[];
  setRequiredAcknowledgments: React.Dispatch<React.SetStateAction<AcknowledgmentInfo[]>>;

  // Validation
  validation: any; // useCheckoutValidation return type
  isStep1Valid: () => boolean;

  // Navigation
  handleNext: () => Promise<void>;
  handleBack: () => void;
  handleComplete: () => Promise<void>;
}
```

- [ ] **Step 2: Create CheckoutSteps.tsx View**

The View simply calls `const vm = useCheckoutStepsVM({ onComplete })` and renders the stepper + step content using `vm.*`.

- [ ] **Step 3: Delete old CheckoutSteps.js**

---

### Task 14: Convert CartReviewStep to TypeScript

**Files:**
- Create: `src/components/Ordering/CheckoutSteps/CartReviewStep.tsx`
- Delete: `src/components/Ordering/CheckoutSteps/CartReviewStep.js`

- [ ] **Step 1: Create typed CartReviewStep.tsx**

This is a pure presentational component — no ViewModel needed. Just add prop types:

```typescript
interface CartReviewStepProps {
  cartItems: CartItem[];
  rulesLoading: boolean;
  rulesMessages: RulesMessage[];
  vatCalculations: VATCalculations | null;
  userProfile: any;
  onContactUpdate: (updateData: any) => void;
  onDeliveryAddressUpdate: (addressInfo: any) => void;
  onInvoiceAddressUpdate: (addressInfo: any) => void;
  addressValidation?: AddressValidationState | null;
  contactValidation?: ContactValidationState | null;
}
```

- [ ] **Step 2: Delete old .js file**

---

### Task 15: Convert TermsConditionsStep to TypeScript

**Files:**
- Create: `src/components/Ordering/CheckoutSteps/TermsConditionsStep.tsx`
- Delete: `src/components/Ordering/CheckoutSteps/TermsConditionsStep.js`

- [ ] **Step 1: Create typed TermsConditionsStep.tsx**

This component has internal state (rulesLoading, termsContent, modal) — it can either remain self-contained with types or get a ViewModel. Since the state is step-specific and not reused, convert as typed component:

```typescript
interface TermsConditionsStepProps {
  cartData: CartData | null;
  cartItems: CartItem[];
  generalTermsAccepted: boolean;
  setGeneralTermsAccepted: React.Dispatch<React.SetStateAction<boolean>>;
}
```

- [ ] **Step 2: Delete old .js file**

---

### Task 16: Convert PreferenceStep to TypeScript

**Files:**
- Create: `src/components/Ordering/CheckoutSteps/PreferenceStep.tsx`
- Delete: `src/components/Ordering/CheckoutSteps/PreferenceStep.js`

- [ ] **Step 1: Create typed PreferenceStep.tsx**

```typescript
interface PreferenceStepProps {
  preferences: PreferencesState;
  setPreferences: React.Dispatch<React.SetStateAction<PreferencesState>>;
  onPreferencesSubmit?: () => void;
}
```

- [ ] **Step 2: Delete old .js file**

---

### Task 17: Convert PaymentStep to TypeScript

**Files:**
- Create: `src/components/Ordering/CheckoutSteps/PaymentStep.tsx`
- Delete: `src/components/Ordering/CheckoutSteps/PaymentStep.js`

- [ ] **Step 1: Create typed PaymentStep.tsx**

```typescript
interface PaymentStepProps {
  paymentMethod: PaymentMethod;
  setPaymentMethod: React.Dispatch<React.SetStateAction<PaymentMethod>>;
  cardNumber: string;
  setCardNumber: React.Dispatch<React.SetStateAction<string>>;
  cardholderName: string;
  setCardholderName: React.Dispatch<React.SetStateAction<string>>;
  expiryMonth: string;
  setExpiryMonth: React.Dispatch<React.SetStateAction<string>>;
  expiryYear: string;
  setExpiryYear: React.Dispatch<React.SetStateAction<string>>;
  cvv: string;
  setCvv: React.Dispatch<React.SetStateAction<string>>;
  employerCode: string;
  setEmployerCode: React.Dispatch<React.SetStateAction<string>>;
  isDevelopment: boolean;
  isUAT: boolean;
  acknowledgmentStates: AcknowledgmentStates;
  setAcknowledgmentStates: React.Dispatch<React.SetStateAction<AcknowledgmentStates>>;
  requiredAcknowledgments: AcknowledgmentInfo[];
  setRequiredAcknowledgments: React.Dispatch<React.SetStateAction<AcknowledgmentInfo[]>>;
}
```

- [ ] **Step 2: Delete old .js file**

---

### Task 18: Convert CartSummaryPanel to TypeScript

**Files:**
- Create: `src/components/Ordering/CheckoutSteps/CartSummaryPanel.tsx`
- Delete: `src/components/Ordering/CheckoutSteps/CartSummaryPanel.js`

- [ ] **Step 1: Create typed CartSummaryPanel.tsx**

```typescript
interface CartSummaryPanelProps {
  cartItems?: CartItem[];
  vatCalculations?: VATCalculations | null;
  paymentMethod?: PaymentMethod;
}
```

- [ ] **Step 2: Delete old .js file**

- [ ] **Step 3: Commit all checkout components**

```bash
git add src/components/Ordering/ src/pages/
git commit -m "feat: migrate checkout components to MVVM TypeScript"
```

---

## Chunk 7: Integration & Verification

### Task 19: Update App.js imports

**Files:**
- Modify: `src/App.js`

- [ ] **Step 1: Update lazy imports**

```javascript
// Update these imports:
import { CartProvider } from "./contexts/CartContext.tsx";
const CheckoutPage = React.lazy(() => import("./components/Ordering/CheckoutPage.tsx"));
// OrderHistory already imports .tsx
```

- [ ] **Step 2: Update any remaining .js imports across the codebase**

Search for any remaining imports of the old .js files and update them. Key files that import cart/checkout code:
- Product cards that call `useCart()`
- Navigation components
- Any other consumers of cartService or CartContext

Run: `grep -r "CartContext.js\|cartService.js\|acknowledgmentService.js\|CheckoutPage.js\|CartPanel.js\|useCheckoutValidation.js\|useCheckoutRulesEngine.js\|useRulesEngineAcknowledgments.js" src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" -l`

Update each file's import to point to the new `.ts`/`.tsx` extension.

- [ ] **Step 3: Commit import updates**

```bash
git commit -am "chore: update all imports to TypeScript cart/checkout files"
```

---

### Task 20: Run tests and fix issues

- [ ] **Step 1: Run frontend tests**

```bash
cd frontend/react-Admin3 && npm test -- --watchAll=false 2>&1 | tail -30
```

- [ ] **Step 2: Fix any TypeScript compilation errors**

```bash
cd frontend/react-Admin3 && npx tsc --noEmit 2>&1 | head -50
```

- [ ] **Step 3: Fix any failing tests due to import changes**

Update test files that mock or import the old .js paths.

- [ ] **Step 4: Verify app starts without errors**

```bash
cd frontend/react-Admin3 && npm start
```

- [ ] **Step 5: Final commit**

```bash
git commit -am "fix: resolve TypeScript and test issues from cart/checkout migration"
```

---

## File Inventory

### Files to CREATE (new TypeScript):
| File | Purpose |
|------|---------|
| `src/types/cart/cart.types.ts` | Cart type definitions |
| `src/types/cart/index.ts` | Barrel export |
| `src/types/checkout/checkout.types.ts` | Checkout type definitions |
| `src/types/checkout/index.ts` | Barrel export |
| `src/services/cartService.ts` | Typed cart service |
| `src/services/acknowledgmentService.ts` | Typed acknowledgment service |
| `src/contexts/CartContext.tsx` | Typed cart context |
| `src/hooks/useCheckoutValidation.ts` | Typed checkout validation hook |
| `src/hooks/useCheckoutRulesEngine.ts` | Typed rules engine hook |
| `src/hooks/useRulesEngineAcknowledgments.ts` | Typed acknowledgments hook |
| `src/pages/useCartPageVM.ts` | Cart page ViewModel |
| `src/pages/Cart.tsx` | Cart page View |
| `src/components/Ordering/useCartPanelVM.ts` | Cart panel ViewModel |
| `src/components/Ordering/CartPanel.tsx` | Cart panel View |
| `src/components/Cart/CartItemWithVAT.tsx` | Typed cart item component |
| `src/components/Cart/CartTotals.tsx` | Typed cart totals component |
| `src/components/Cart/CartVATDisplay.tsx` | Typed VAT display component |
| `src/components/Cart/CartVATError.tsx` | Typed VAT error component |
| `src/components/Ordering/useCheckoutPageVM.ts` | Checkout page ViewModel |
| `src/components/Ordering/CheckoutPage.tsx` | Checkout page View |
| `src/components/Ordering/useCheckoutStepsVM.ts` | Checkout steps ViewModel |
| `src/components/Ordering/CheckoutSteps.tsx` | Checkout steps View |
| `src/components/Ordering/CheckoutSteps/CartReviewStep.tsx` | Typed review step |
| `src/components/Ordering/CheckoutSteps/TermsConditionsStep.tsx` | Typed terms step |
| `src/components/Ordering/CheckoutSteps/PreferenceStep.tsx` | Typed preference step |
| `src/components/Ordering/CheckoutSteps/PaymentStep.tsx` | Typed payment step |
| `src/components/Ordering/CheckoutSteps/CartSummaryPanel.tsx` | Typed summary panel |

### Files to DELETE (old JavaScript):
| File |
|------|
| `src/services/cartService.js` |
| `src/services/acknowledgmentService.js` |
| `src/contexts/CartContext.js` |
| `src/hooks/useCheckoutValidation.js` |
| `src/hooks/useCheckoutRulesEngine.js` |
| `src/hooks/useRulesEngineAcknowledgments.js` |
| `src/pages/Cart.js` |
| `src/components/Ordering/CartPanel.js` |
| `src/components/Ordering/CheckoutPage.js` |
| `src/components/Ordering/CheckoutSteps.js` |
| `src/components/Cart/CartItemWithVAT.js` |
| `src/components/Cart/CartTotals.js` |
| `src/components/Cart/CartVATDisplay.js` |
| `src/components/Cart/CartVATError.js` |
| `src/components/Ordering/CheckoutSteps/CartReviewStep.js` |
| `src/components/Ordering/CheckoutSteps/TermsConditionsStep.js` |
| `src/components/Ordering/CheckoutSteps/PreferenceStep.js` |
| `src/components/Ordering/CheckoutSteps/PaymentStep.js` |
| `src/components/Ordering/CheckoutSteps/CartSummaryPanel.js` |

### Files already migrated (NO CHANGES):
| File | Status |
|------|--------|
| `src/components/User/OrderHistory.tsx` | Already MVVM TypeScript |
| `src/components/User/useOrderHistoryVM.ts` | Already MVVM TypeScript |
| `src/types/auth/user.types.ts` | Order types already exist |
