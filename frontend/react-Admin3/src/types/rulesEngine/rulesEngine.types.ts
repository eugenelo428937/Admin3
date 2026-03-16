// Rules Engine type definitions — fields match Django REST Framework API responses (snake_case)

// Re-export shared types from checkout that are rules-engine related
export type {
  RulesMessage,
  RulesEngineResult,
  AcknowledgmentInfo,
  AcknowledgmentMessage,
  AcknowledgmentModalState,
  AcknowledgmentStates,
  ValidationSummary,
  ComprehensiveValidationResult,
  TermsContent,
  PreferencePrompt,
  PreferenceOption,
  PreferenceValue,
  PreferencesState,
} from '../checkout/checkout.types';

// ─── Entry Points ──────────────────────────────────────────────

export type EntryPoint =
  | 'checkout_start'
  | 'checkout_terms'
  | 'checkout_preference'
  | 'checkout_payment'
  | 'product_card_mount'
  | 'product_list_mount'
  | 'home_page_mount'
  | 'user_registration';

export interface EntryPoints {
  CHECKOUT_START: 'checkout_start';
  CHECKOUT_TERMS: 'checkout_terms';
  CHECKOUT_PREFERENCE: 'checkout_preference';
  CHECKOUT_PAYMENT: 'checkout_payment';
  PRODUCT_CARD_MOUNT: 'product_card_mount';
  PRODUCT_LIST_MOUNT: 'product_list_mount';
  HOME_PAGE_MOUNT: 'home_page_mount';
  USER_REGISTRATION: 'user_registration';
}

// ─── Message Types ─────────────────────────────────────────────

export type MessageType =
  | 'acknowledge'
  | 'user_acknowledge'
  | 'display'
  | 'modal'
  | 'inline'
  | 'acknowledgment';

export interface MessageTypes {
  ACKNOWLEDGE: 'acknowledge';
  USER_ACKNOWLEDGE: 'user_acknowledge';
  DISPLAY: 'display';
  MODAL: 'modal';
  INLINE: 'inline';
  ACKNOWLEDGMENT: 'acknowledgment';
}

export type MessageVariant = 'info' | 'warning' | 'error' | 'success';
export type MessageDisplayType = 'inline' | 'modal';

// ─── Schema Validation Error ───────────────────────────────────

export interface SchemaValidationError extends Error {
  name: 'SchemaValidationError';
  schemaErrors: any[];
  entryPoint: string;
  context: Record<string, any>;
  details: string;
}

// ─── Acknowledgment Data ───────────────────────────────────────

export interface AcknowledgmentData {
  ackKey: string;
  message_id: string;
  acknowledged: boolean;
  entry_point_location: string;
}

// ─── Execute Rules Response ────────────────────────────────────

export interface ExecuteRulesResponse {
  success: boolean;
  blocked?: boolean;
  requires_acknowledgment?: boolean;
  messages?: RawRulesMessage[];
  preference_prompts?: any[];
  preferences?: any[];
  updates?: {
    cart_fees?: Array<{ fee_type: string; amount: string | number }>;
    cart_fees_removed?: Array<{ fee_type: string; removed: boolean }>;
  };
  required_acknowledgments?: any[];
  errors?: string[];
}

// ─── Raw Rules Message (from API) ──────────────────────────────

export interface RawRulesMessage {
  template_id?: string | number;
  display_type?: MessageDisplayType;
  type?: string;
  action_type?: string;
  title?: string;
  content?: any;
  variant?: string;
  message_type?: string;
  dismissible?: boolean;
  ack_key?: string;
  required?: boolean;
  blocking?: boolean;
  priority?: number;
  scope?: string;
  persistTo?: string;
  [key: string]: any;
}

// ─── Processed Message ─────────────────────────────────────────

export interface ProcessedMessage extends RawRulesMessage {
  index: number;
  parsed: ParsedMessageContent;
  priority: number;
  variant: MessageVariant;
  needsAction: boolean;
  isAcknowledgment: boolean;
  acknowledgmentConfig?: AcknowledgmentConfig;
  processing: {
    timestamp: string;
    entryPoint: string | null;
    processedBy: string;
  };
  error?: string;
}

// ─── Parsed Message Content ────────────────────────────────────

export interface ParsedMessageContent {
  title: string;
  message: string;
  checkboxText: string;
  icon: string;
  variant: MessageVariant;
  dismissible: boolean;
  link: ParsedLink | null;
  details: string[];
  buttons: ParsedButton[];
  templateId?: string | number;
  ackKey?: string;
  required: boolean;
  blocking: boolean;
  displayType: MessageDisplayType;
}

export interface ParsedLink {
  url: string;
  text: string;
  target: string;
}

export interface ParsedButton {
  label: string;
  action: string;
  variant: string;
  disabled: boolean;
}

// ─── Acknowledgment Config ─────────────────────────────────────

export interface AcknowledgmentConfig {
  ackKey?: string;
  templateId?: string | number;
  required: boolean;
  checkboxText: string;
  scope: string;
  persistTo: string;
  displayType: MessageDisplayType;
  blocking: boolean;
}

// ─── Classified Messages ───────────────────────────────────────

export interface ClassifiedMessages {
  acknowledgments: {
    inline: RawRulesMessage[];
    modal: RawRulesMessage[];
    all: RawRulesMessage[];
  };
  displays: {
    inline: RawRulesMessage[];
    modal: RawRulesMessage[];
    all: RawRulesMessage[];
  };
  summary: ClassifiedSummary;
}

export interface ClassifiedSummary {
  totalMessages: number;
  totalAcknowledgments: number;
  totalDisplays: number;
  hasInlineAcknowledgments: boolean;
  hasModalAcknowledgments: boolean;
  hasInlineDisplays: boolean;
  hasModalDisplays: boolean;
}

// ─── Process Rules Response Result ─────────────────────────────

export interface ProcessRulesResult {
  success: boolean;
  blocked: boolean;
  requires_acknowledgment: boolean;
  messages: {
    raw: RawRulesMessage[];
    processed: ProcessedMessage[];
    classified: ClassifiedMessages;
    filtered?: ProcessedMessage[];
    summary: ProcessRulesSummary;
  };
  acknowledgments: ExtractedAcknowledgment[];
  errors: string[];
  warnings: string[];
}

export interface ProcessRulesSummary {
  totalMessages: number;
  filteredMessages?: number;
  hasAcknowledgments: boolean;
  hasDisplays: boolean;
  hasInlineAcknowledgments?: boolean;
  hasModalAcknowledgments?: boolean;
  hasInlineDisplays?: boolean;
  hasModalDisplays?: boolean;
  hasErrors: boolean;
  hasWarnings?: boolean;
  highestPriority: number;
  requiresAction?: boolean;
  blockingMessages?: number;
}

export interface ExtractedAcknowledgment {
  ackKey?: string;
  templateId?: string | number;
  required: boolean;
  displayType: MessageDisplayType;
  config?: AcknowledgmentConfig;
  message: ProcessedMessage;
}

// ─── Process For UI Result ─────────────────────────────────────

export interface ProcessForUIResult {
  messages: RawRulesMessage[];
  acknowledgments: {
    inline: RawRulesMessage[];
    modal: RawRulesMessage[];
  };
  processed: ProcessedMessage[];
  summary: ProcessRulesSummary;
  errors: string[];
  warnings: string[];
  success: boolean;
  blocked: boolean;
  requiresAcknowledgment: boolean;
}

// ─── Process Options ───────────────────────────────────────────

export interface ProcessRulesOptions {
  filterModal?: boolean;
  filterInline?: boolean;
  processAcknowledgments?: boolean;
  sortByPriority?: boolean;
  validateContent?: boolean;
  entryPoint?: string | null;
  strictValidation?: boolean;
  originalContext?: Record<string, any>;
}

// ─── Context Validation ────────────────────────────────────────

export interface ContextValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Context Builder Types ─────────────────────────────────────

export interface CheckoutContext {
  cart: CartContext | null;
  user: UserContext | null;
  session: SessionContext;
  acknowledgments: Record<string, any>;
}

export interface CartContext {
  id: number;
  user_id: number | null;
  items: CartItemContext[];
  total: number;
  discount: number;
  created_at: string;
  updated_at: string;
  has_marking: boolean;
  has_digital: boolean;
  session_key: string | null;
  has_material: boolean;
  has_tutorial: boolean;
}

export interface CartItemContext {
  id: number;
  quantity: number;
  actual_price: string;
  metadata: Record<string, any>;
  is_marking: boolean;
  price_type: string;
  product_id: number;
  product_code: string;
  product_name: string;
  product_type: string;
  subject_code: string;
  current_product: any;
  exam_session_code: string;
  has_expired_deadline: boolean;
}

export interface UserContext {
  id: number;
  ip: string | null;
  tier: string;
  email: string;
  region: string;
  preferences: Record<string, any>;
  home_country: string | null;
  work_country: string | null;
  is_authenticated: boolean;
}

export interface SessionContext {
  ip_address: string;
  session_id: string;
}

export interface HomePageContext {
  current_date: string;
  current_time: string;
  timezone: string;
  page: {
    name: string;
    path: string;
    referrer: string | null;
  };
  user: {
    id?: number;
    email?: string;
    region?: string | null;
    is_authenticated: boolean;
  };
}

export interface ProductCardContext {
  product: {
    id: number;
    name: string;
    code: string;
    type: string;
    category: string | null;
    price: number | string;
    variations: any[];
    selected_variation: any;
    exam_session: string | null;
    subject: string | null;
    location: string | null;
    in_stock: boolean;
    available: boolean;
    has_expired_deadline: boolean;
    requires_shipping: boolean;
    is_digital: boolean;
  } | null;
  page: {
    name: string;
    path: string;
  };
}

export interface ProductListContext {
  products: {
    count: number;
    items: any[];
    types: string[];
    subjects: string[];
    filters: {
      subjects: string[];
      product_groups: string[];
      variations: string[];
      search_query: string | null;
    };
  };
  page: {
    name: string;
    path: string;
    page_number: number;
  };
}

export interface UserRegistrationContext {
  registration: {
    email: string | null;
    country: string | null;
    region: string | null;
    has_accepted_terms: boolean;
    has_accepted_marketing: boolean;
    registration_source: string;
    referrer: string | null;
  };
  page: {
    name: string;
    path: string;
  };
}

// ─── JSON Content Types ────────────────────────────────────────

export type JsonContentElement =
  | 'container'
  | 'box'
  | 'p'
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'ul' | 'ol'
  | 'li';

export interface JsonContentItem {
  element: JsonContentElement | string;
  text?: string | string[];
  seq?: number;
  class?: string;
  text_align?: string;
  title?: string;
  content?: JsonContentItem[];
}

export interface JsonContent {
  message_container?: JsonContentItem;
  content?: JsonContentItem[];
}

// ─── Component Props ───────────────────────────────────────────

export interface RulesEngineModalProps {
  open: boolean;
  onClose: () => void;
  messages: RawRulesMessage | RawRulesMessage[];
  closeButtonText?: string;
  backdrop?: 'static' | boolean;
  disableEscapeKeyDown?: boolean;
  onPageChange?: ((page: number) => void) | null;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

export interface RulesEngineAcknowledgmentModalProps {
  open: boolean;
  onClose: () => void;
  onAcknowledge: (acknowledged: boolean, templateId?: string | number, ackKey?: string) => Promise<void>;
  message?: RawRulesMessage | null;
  messages?: RawRulesMessage[] | null;
  entryPointLocation?: string;
  required?: boolean;
  blocking?: boolean;
}

export interface RulesEngineInlineAlertProps {
  messages: RawRulesMessage[];
  loading?: boolean;
  loadingMessage?: string;
  onDismiss?: (index: number) => void;
  fullWidth?: boolean;
  width?: string | null;
  float?: boolean;
  floatPosition?: 'left' | 'right' | 'center';
  showMoreLess?: boolean;
}

export interface JsonContentRendererProps {
  content: JsonContent | null;
  className?: string;
}

// ─── Normalized Message (for InlineAlert) ──────────────────────

export interface NormalizedMessage {
  title: string;
  message: string;
  variant: MessageVariant | string;
  template_id: string | number | null;
  dismissible: boolean;
}

// ─── Rules Engine Service ──────────────────────────────────────

export interface RulesEngineService {
  ENTRY_POINTS: EntryPoints;
  executeRules: (entryPoint: string, context?: Record<string, any>) => Promise<ExecuteRulesResponse>;
  acknowledgeRule: (acknowledgmentData: AcknowledgmentData) => Promise<any>;
}
