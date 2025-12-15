/**
 * Tests for MobileNavigation Component
 * T021: Test drawer open/close, menu items with Router
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MobileNavigation from '../MobileNavigation';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }),
  NavLink: ({ children, to, onClick, className }) => (
    <a href={to} onClick={onClick} className={className}>{children}</a>
  ),
}));

// Mock useAuth hook
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    isSuperuser: false,
    isApprentice: false,
    isStudyPlus: false,
    isAuthenticated: false,
    user: null,
  }),
}));

// Mock useCart context
jest.mock('../../../contexts/CartContext', () => ({
  useCart: () => ({
    cartCount: 3,
  }),
}));

const theme = createTheme();

describe('MobileNavigation', () => {
  const mockOnClose = jest.fn();
  const mockHandleSubjectClick = jest.fn();
  const mockHandleProductClick = jest.fn();
  const mockHandleProductGroupClick = jest.fn();
  const mockHandleSpecificProductClick = jest.fn();
  const mockHandleProductVariationClick = jest.fn();
  const mockHandleMarkingVouchersClick = jest.fn();
  const mockOnOpenSearch = jest.fn();
  const mockOnOpenCart = jest.fn();
  const mockOnOpenAuth = jest.fn();

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    subjects: [
      { id: 1, code: 'CB1', description: 'Business Finance' },
      { id: 2, code: 'CS1', description: 'Actuarial Statistics' },
      { id: 3, code: 'SP1', description: 'Life Insurance' },
      { id: 4, code: 'SA1', description: 'Advanced Finance' },
    ],
    navbarProductGroups: [
      { id: 1, name: 'Study Materials', products: [{ id: 101, shortname: 'CMP Notes' }] },
      { id: 2, name: 'Tutorials', products: [{ id: 102, shortname: 'Online Tutorial' }] },
    ],
    distanceLearningData: [
      { id: 1, name: 'Online Courses', products: [] },
    ],
    tutorialData: {
      Location: { left: [{ id: 1, shortname: 'London' }], right: [] },
      Format: [{ filter_type: 'online', name: 'Online', group_name: 'Online Tutorial' }],
      'Online Classroom': [{ id: 1, description: 'Live Online' }],
    },
    loadingProductGroups: false,
    loadingDistanceLearning: false,
    loadingTutorial: false,
    handleSubjectClick: mockHandleSubjectClick,
    handleProductClick: mockHandleProductClick,
    handleProductGroupClick: mockHandleProductGroupClick,
    handleSpecificProductClick: mockHandleSpecificProductClick,
    handleProductVariationClick: mockHandleProductVariationClick,
    handleMarkingVouchersClick: mockHandleMarkingVouchersClick,
    onOpenSearch: mockOnOpenSearch,
    onOpenCart: mockOnOpenCart,
    onOpenAuth: mockOnOpenAuth,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderNavigation = (props = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <MobileNavigation {...defaultProps} {...props} />
      </ThemeProvider>
    );
  };

  describe('rendering', () => {
    test('renders navigation when open is true', () => {
      renderNavigation();
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    test('does not render when open is false', () => {
      renderNavigation({ open: false });
      // MUI Drawer keeps content in DOM but hidden when closed
      // Verify the drawer is not visible by checking aria-hidden
      const drawer = document.querySelector('.MuiDrawer-root');
      expect(drawer).toBeInTheDocument();
      expect(drawer).toHaveAttribute('aria-hidden', 'true');
    });

    test('renders main menu items', () => {
      renderNavigation();

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Subjects')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Distance Learning')).toBeInTheDocument();
      expect(screen.getByText('Tutorials')).toBeInTheDocument();
      expect(screen.getByText('Marking Vouchers')).toBeInTheDocument();
    });

    test('renders header action icons', () => {
      renderNavigation();

      expect(screen.getByLabelText('search')).toBeInTheDocument();
      expect(screen.getByLabelText('shopping cart')).toBeInTheDocument();
      expect(screen.getByLabelText('login')).toBeInTheDocument();
    });

    test('displays cart count badge', () => {
      renderNavigation();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('header actions', () => {
    test('opens search when search icon clicked', () => {
      renderNavigation();

      fireEvent.click(screen.getByLabelText('search'));

      expect(mockOnOpenSearch).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('opens cart when cart icon clicked', () => {
      renderNavigation();

      fireEvent.click(screen.getByLabelText('shopping cart'));

      expect(mockOnOpenCart).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('opens auth when login icon clicked', () => {
      renderNavigation();

      fireEvent.click(screen.getByLabelText('login'));

      expect(mockOnOpenAuth).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('navigation panels', () => {
    test('navigates to Subjects panel', () => {
      renderNavigation();

      fireEvent.click(screen.getByText('Subjects'));

      expect(screen.getByText('Core Principles')).toBeInTheDocument();
      expect(screen.getByText('Core Practices')).toBeInTheDocument();
      expect(screen.getByText('Specialist Principles')).toBeInTheDocument();
      expect(screen.getByText('Specialist Advanced')).toBeInTheDocument();
    });

    test('navigates to Products panel', () => {
      renderNavigation();

      fireEvent.click(screen.getByText('Products'));

      expect(screen.getByText('View All Products')).toBeInTheDocument();
      expect(screen.getByText('Study Materials')).toBeInTheDocument();
      expect(screen.getByText('Tutorials')).toBeInTheDocument();
    });

    test('navigates to Distance Learning panel', () => {
      renderNavigation();

      fireEvent.click(screen.getByText('Distance Learning'));

      expect(screen.getByText('View All Distance Learning')).toBeInTheDocument();
      expect(screen.getByText('Online Courses')).toBeInTheDocument();
    });

    test('navigates to Tutorials panel', () => {
      renderNavigation();

      fireEvent.click(screen.getByText('Tutorials'));

      expect(screen.getByText('View All Tutorials')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Format')).toBeInTheDocument();
    });
  });

  describe('back navigation', () => {
    test('shows back button on sub-panels', () => {
      renderNavigation();

      fireEvent.click(screen.getByText('Subjects'));

      expect(screen.getByLabelText('go back')).toBeInTheDocument();
    });

    test('navigates back to main panel', () => {
      renderNavigation();

      fireEvent.click(screen.getByText('Subjects'));
      expect(screen.getByText('Core Principles')).toBeInTheDocument();

      fireEvent.click(screen.getByLabelText('go back'));

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.queryByText('Core Principles')).not.toBeInTheDocument();
    });
  });

  describe('subject selection', () => {
    test('navigates to subject category panel', () => {
      renderNavigation();

      fireEvent.click(screen.getByText('Subjects'));
      fireEvent.click(screen.getByText('Core Principles'));

      expect(screen.getByText('CB1 - Business Finance')).toBeInTheDocument();
    });

    test('calls handleSubjectClick when subject clicked', () => {
      renderNavigation();

      fireEvent.click(screen.getByText('Subjects'));
      fireEvent.click(screen.getByText('Core Principles'));
      fireEvent.click(screen.getByText('CB1 - Business Finance'));

      expect(mockHandleSubjectClick).toHaveBeenCalledWith('CB1');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('product selection', () => {
    test('calls handleProductClick when View All Products clicked', () => {
      renderNavigation();

      fireEvent.click(screen.getByText('Products'));
      fireEvent.click(screen.getByText('View All Products'));

      expect(mockHandleProductClick).toHaveBeenCalled();
    });

    test('navigates to product group panel', () => {
      renderNavigation();

      fireEvent.click(screen.getByText('Products'));
      fireEvent.click(screen.getByText('Study Materials'));

      expect(screen.getByText('View All Study Materials')).toBeInTheDocument();
      expect(screen.getByText('CMP Notes')).toBeInTheDocument();
    });

    test('calls handleSpecificProductClick when product clicked', () => {
      renderNavigation();

      fireEvent.click(screen.getByText('Products'));
      fireEvent.click(screen.getByText('Study Materials'));
      fireEvent.click(screen.getByText('CMP Notes'));

      expect(mockHandleSpecificProductClick).toHaveBeenCalledWith(101);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('marking vouchers', () => {
    test('calls handleMarkingVouchersClick when clicked', () => {
      renderNavigation();

      fireEvent.click(screen.getByText('Marking Vouchers'));

      expect(mockHandleMarkingVouchersClick).toHaveBeenCalled();
    });
  });

  describe('loading states', () => {
    test('shows loading message for products', () => {
      renderNavigation({ loadingProductGroups: true });

      fireEvent.click(screen.getByText('Products'));

      expect(screen.getByText('Loading products...')).toBeInTheDocument();
    });

    test('shows loading message for distance learning', () => {
      renderNavigation({ loadingDistanceLearning: true });

      fireEvent.click(screen.getByText('Distance Learning'));

      expect(screen.getByText('Loading distance learning...')).toBeInTheDocument();
    });

    test('shows loading message for tutorials', () => {
      renderNavigation({ loadingTutorial: true });

      fireEvent.click(screen.getByText('Tutorials'));

      expect(screen.getByText('Loading tutorials...')).toBeInTheDocument();
    });
  });

  describe('admin section', () => {
    test('does not show Admin for regular users', () => {
      renderNavigation();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });
  });

  describe('backdrop close', () => {
    test('closes navigation when backdrop clicked', () => {
      renderNavigation();

      // MUI Drawer uses .MuiBackdrop-root for its backdrop
      const backdrop = document.querySelector('.MuiBackdrop-root');
      expect(backdrop).toBeInTheDocument();
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
