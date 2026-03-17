// Browse/Customer-facing product type definitions
// These represent the data shapes from the unified search API (distinct from admin CRUD types)

// ─── Product Price ──────────────────────────────────────────────

export type PriceType = 'standard' | 'retaker' | 'additional' | 'reduced';

export interface BrowseProductPrice {
  price_type: PriceType;
  amount: number | string;
}

// ─── Recommended Product ────────────────────────────────────────

export interface RecommendedProduct {
  id: number;
  store_product_id?: number;
  esspv_id?: number;
  product_code: string;
  product_name: string;
  product_short_name: string;
  variation_type?: string;
  prices?: BrowseProductPrice[];
}

// ─── Product Variation ──────────────────────────────────────────

export interface BrowseProductVariation {
  id: number;
  name: string;
  variation_type?: string;
  description?: string;
  description_short?: string;
  prices: BrowseProductPrice[];
  recommended_product?: RecommendedProduct;
  events?: TutorialEvent[];
}

// ─── Tutorial Event ─────────────────────────────────────────────

export interface TutorialEvent {
  id: number;
  title: string;
  code: string;
  location?: string;
  venue?: string;
  start_date: string;
  end_date: string;
}

// ─── Flattened Tutorial Event (for TutorialSelectionDialog) ─────

export interface FlattenedTutorialEvent {
  eventId: number | string;
  eventTitle: string;
  eventCode: string;
  location?: string;
  venue?: string;
  startDate: string;
  endDate: string;
  variation: {
    variationId: number | string;
    variationName: string;
    prices?: BrowseProductPrice[];
  };
  variationId?: number | string;
  variationName?: string;
  prices?: BrowseProductPrice[];
}

// ─── Tutorial Choice (from TutorialChoiceContext) ───────────────

export type ChoiceLevel = '1st' | '2nd' | '3rd';

export interface TutorialChoiceData {
  eventId: number | string;
  eventTitle?: string;
  eventCode?: string;
  location?: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
  variationId?: number | string;
  variationName?: string;
  prices?: BrowseProductPrice[];
  variation?: {
    variationId: number | string;
    variationName: string;
    prices?: BrowseProductPrice[];
  };
  subjectCode?: string;
  subjectName?: string;
  productId?: number | string;
  productName?: string;
  isDraft?: boolean;
}

export type SubjectChoices = Record<ChoiceLevel, TutorialChoiceData>;

// ─── Bundle Component ───────────────────────────────────────────

export interface BundleComponent {
  id?: number;
  name?: string;
  shortname?: string;
  product_name?: string;
  quantity?: number;
  prices?: BrowseProductPrice[];
  product?: {
    fullname?: string;
  };
  product_variation?: {
    name?: string;
    description_short?: string;
  };
}

// ─── Browse Product (from unified search API) ───────────────────

export interface BrowseProduct {
  id: number;
  essp_id?: number;
  store_product_id?: number;
  product_name: string;
  product_short_name?: string;
  product_code?: string;
  subject_code: string;
  exam_session_code?: string;
  session_code?: string;
  exam_session?: string;
  session?: string;
  type: string;
  shortname?: string;
  is_bundle?: boolean;
  item_type?: string;
  buy_both?: boolean;
  vat_status?: string;
  vat_status_display?: string;
  price?: number | string;
  retaker_price?: number | string;
  additional_copy_price?: number | string;
  variations?: BrowseProductVariation[];
  // Bundle-specific
  bundle_name?: string;
  components_count?: number;
  components?: BundleComponent[];
  // Voucher-specific
  name?: string;
  voucher_id?: number;
  is_active?: boolean;
  expiry_date?: string;
}

// ─── Marking Deadline ───────────────────────────────────────────

export interface MarkingDeadline {
  name?: string;
  deadline: string;
  recommended_submit_date: string;
}

export interface ParsedMarkingDeadline extends Omit<MarkingDeadline, 'deadline' | 'recommended_submit_date'> {
  deadline: Date;
  recommended_submit_date: Date;
}

// ─── Deadline Scenario ──────────────────────────────────────────

export interface DeadlineScenario {
  type: 'info' | 'warning' | 'error';
  icon: React.ElementType;
  message: string;
  submessage?: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

// ─── Search Pagination ──────────────────────────────────────────

export interface SearchPagination {
  page: number;
  page_size: number;
  total_count: number;
  has_next: boolean;
  has_previous: boolean;
}

// ─── Filter State (mirrors Redux store shape) ───────────────────

export interface FilterCountData {
  count: number;
  name?: string;
  display_name?: string;
  label?: string;
}

export type FilterCountsMap = Record<string, Record<string, FilterCountData | number>>;

export type FilterType =
  | 'subjects'
  | 'categories'
  | 'product_types'
  | 'products'
  | 'modes_of_delivery';

export interface FilterState {
  subjects: string[];
  categories: string[];
  product_types: string[];
  products: string[];
  modes_of_delivery: string[];
  searchQuery: string;
  currentPage: number;
  pageSize: number;
  isLoading: boolean;
  error: string | null;
  filterCounts: FilterCountsMap;
  validationErrors: ValidationError[];
  tutorial?: boolean;
  tutorial_format?: string;
  distance_learning?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  suggestion?: string;
  severity: 'error' | 'warning' | 'info';
}

// ─── Rules Message (for ProductList inline alerts) ──────────────

export interface InlineRulesMessage {
  title: string;
  message: string;
  variant: string;
  dismissible: boolean;
  display_type?: string;
  content?: any;
  message_type?: string;
  [key: string]: any;
}

// ─── Bundle Contents (from bundleService.getBundleContents) ─────

export interface BundleContents {
  total_components: number;
  components: BundleComponent[];
}

// ─── Product Card Common Props ──────────────────────────────────

export interface ProductCardProps {
  product: BrowseProduct;
  onAddToCart?: (product: BrowseProduct, priceInfo: any) => void;
  allEsspIds?: number[];
  bulkDeadlines?: Record<number | string, MarkingDeadline[]>;
}

export interface BundleCardProps {
  bundle: BrowseProduct;
  onAddToCart?: (product: BrowseProduct, priceInfo: any) => void;
}

export interface VoucherCardProps {
  voucher: BrowseProduct;
}

// ─── Tutorial Product Card Props ────────────────────────────────

export interface TutorialProductCardProps {
  subjectCode: string;
  subjectName: string;
  location: string;
  productId: number | string;
  product: BrowseProduct;
  variations?: BrowseProductVariation[] | null;
  onAddToCart?: ((product: any, priceInfo: any) => void) | null;
  dialogOpen?: boolean | null;
  onDialogClose?: (() => void) | null;
}

// ─── Tutorial Selection Dialog Props ────────────────────────────

export interface TutorialSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  product: {
    subjectCode: string;
    location: string;
    productId: number | string;
  };
  events: FlattenedTutorialEvent[];
}

// ─── Tutorial Detail Card Props ─────────────────────────────────

export interface TutorialDetailCardProps {
  event: FlattenedTutorialEvent;
  variation: {
    variationId: number | string;
    variationName: string;
    prices?: BrowseProductPrice[];
  };
  selectedChoiceLevel: ChoiceLevel | null;
  onSelectChoice: (choiceLevel: ChoiceLevel, eventData: any) => void;
  onResetChoice?: (choiceLevel: ChoiceLevel, eventId: number | string) => void;
  subjectCode: string;
}

// ─── Tutorial Summary Bar Props ─────────────────────────────────

export interface TutorialSummaryBarProps {
  subjectCode: string;
  onEdit: () => void;
  onAddToCart: () => void;
  onRemove: () => void;
}

// ─── Product Grid Props ─────────────────────────────────────────

export interface ProductGridProps {
  products: BrowseProduct[];
  loading?: boolean;
  error?: string | null;
  pagination?: SearchPagination;
  onLoadMore?: (() => void) | null;
  onAddToCart?: ((product: BrowseProduct, priceInfo?: any) => void) | null;
  allEsspIds?: number[];
  bulkDeadlines?: Record<number | string, MarkingDeadline[]>;
  vatCalculations?: any;
  showProductCount?: boolean;
  showLoadMoreButton?: boolean;
  gridSpacing?: number;
  minCardWidth?: number;
  emptyStateMessage?: string;
}

// ─── Filter Panel Props ─────────────────────────────────────────

export interface FilterPanelProps {
  isSearchMode?: boolean;
  showMobile?: boolean;
}

// ─── Active Filters Props ───────────────────────────────────────

export type ActiveFiltersVariant = 'default' | 'compact' | 'minimal';

export interface ActiveFiltersProps {
  showCount?: boolean;
  showClearAll?: boolean;
  maxChipsToShow?: number;
  variant?: ActiveFiltersVariant;
}

// ─── Active Filter Chip ─────────────────────────────────────────

export interface ActiveFilterChip {
  key: string;
  filterType: string;
  value: string;
  label: string;
  typeLabel: string;
  color: string;
  fullLabel: string;
  isSearchQuery?: boolean;
}

// ─── Filter Debugger Props ──────────────────────────────────────

export interface FilterDebuggerProps {
  urlFilters?: Record<string, string>;
  panelFilters?: Record<string, string[]>;
  navbarFilters?: Record<string, string>;
  finalParams?: string;
}
