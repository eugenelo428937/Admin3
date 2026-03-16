// Navigation data types matching API responses from productService.getNavigationData()

export interface NavigationSubject {
  id: number;
  code: string;
  description: string;
  active: boolean;
}

export interface NavigationProduct {
  id: number | string;
  shortname: string;
  name?: string;
}

export interface NavigationProductGroup {
  id: number | string;
  name: string;
  products: NavigationProduct[];
}

export interface TutorialFormat {
  filter_type: string;
  name: string;
  group_name: string;
}

export interface TutorialLocationData {
  left: NavigationProduct[];
  right: NavigationProduct[];
}

export interface TutorialOnlineClassroom {
  id: number | string;
  name: string;
  description?: string;
}

export interface TutorialData {
  Location?: TutorialLocationData;
  Format?: TutorialFormat[];
  'Online Classroom'?: TutorialOnlineClassroom[];
}

export interface NavigationData {
  subjects: NavigationSubject[];
  navbarProductGroups: NavigationProductGroup[];
  distanceLearningData: NavigationProductGroup[];
  tutorialData: TutorialData | null;
}

// Admin navigation types

export interface AdminNavLink {
  label: string;
  to: string;
  disabled?: boolean;
}

export interface AdminCategory {
  label: string;
  enabled: boolean;
  links: AdminNavLink[];
}

export interface AdminCategories {
  row1: AdminCategory[];
  row2: AdminCategory[];
}

// Mobile navigation panel types

export type MobilePanelType =
  | 'main'
  | 'subjects'
  | 'subjects-core-principles'
  | 'subjects-core-practices'
  | 'subjects-specialist-principles'
  | 'subjects-specialist-advanced'
  | 'products'
  | 'product-group'
  | 'distance-learning'
  | 'distance-learning-group'
  | 'tutorials'
  | 'tutorial-location'
  | 'tutorial-format'
  | 'tutorial-online'
  | 'admin';

export interface MobileNavigationPanel {
  type: MobilePanelType;
  title: string;
  data?: any;
}

// Admin mobile navigation panel types

export type AdminMobilePanelType =
  | 'main'
  | 'email'
  | 'users'
  | 'marking'
  | 'tutorials'
  | 'admin';

export interface AdminMobileNavigationPanel {
  type: AdminMobilePanelType;
  title: string;
  data?: any;
}

// Props interfaces for navigation components

export interface NavigationMenuProps {
  subjects: NavigationSubject[];
  navbarProductGroups: NavigationProductGroup[];
  distanceLearningData: NavigationProductGroup[];
  tutorialData: TutorialData | null;
  loadingProductGroups: boolean;
  loadingDistanceLearning: boolean;
  loadingTutorial: boolean;
  handleSubjectClick: (subjectCode: string) => void;
  handleProductClick: () => void;
  handleProductGroupClick: (groupName: string) => void;
  handleSpecificProductClick: (productId: number | string) => void;
  handleProductVariationClick: (variationId: number | string) => void;
  handleMarkingVouchersClick: (e: React.MouseEvent) => void;
  onCollapseNavbar: () => void;
}

export interface MobileNavigationProps extends NavigationMenuProps {
  open: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
  onOpenCart: () => void;
  onOpenAuth: () => void;
}

export interface AdminNavigationMenuProps {
  onCollapseNavbar: () => void;
}

export interface AdminMobileNavigationProps {
  open: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
}

export interface MegaMenuPopoverProps {
  id: string;
  label: string;
  children: React.ReactNode;
  width?: number | string;
  onOpen?: () => void;
  onClose?: () => void;
  buttonProps?: Record<string, any>;
  popoverProps?: Record<string, any>;
  navbarSelector?: string;
}

export interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export interface TopNavBarProps {
  onOpenSearch: () => void;
}
