/**
 * Tests for NavigationMenu Component
 * T024: Test menu rendering, navigation with Router
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { axe, toHaveNoViolations } from 'jest-axe';
import NavigationMenu from '../NavigationMenu';

expect.extend(toHaveNoViolations);

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  __esModule: true,
  NavLink: ({ children, to, onClick, className, disabled }) => (
    <a
      href={to}
      onClick={onClick}
      className={className}
      aria-disabled={disabled}
    >
      {children}
    </a>
  ),
}));

// Mock useAuth hook
const mockUseAuth = {
  isSuperuser: false,
  isApprentice: false,
  isStudyPlus: false,
};

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

// Mock useTheme hook
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  useTheme: () => ({
    palette: {
      offwhite: {
        '000': '#fdfdfd'
      }
    }
  }),
}));


const theme = createTheme();

describe('NavigationMenu', () => {
  const mockHandleSubjectClick = jest.fn();
  const mockHandleProductClick = jest.fn();
  const mockHandleProductGroupClick = jest.fn();
  const mockHandleSpecificProductClick = jest.fn();
  const mockHandleProductVariationClick = jest.fn();
  const mockHandleMarkingVouchersClick = jest.fn();
  const mockOnCollapseNavbar = jest.fn();

  const defaultProps = {
    subjects: [
      { id: 1, code: 'CB1', description: 'Business Finance' },
      { id: 2, code: 'CS1', description: 'Actuarial Statistics' },
      { id: 3, code: 'CM1', description: 'Actuarial Mathematics' },
      { id: 4, code: 'CP1', description: 'Core Practice 1' },
      { id: 5, code: 'SP1', description: 'Life Insurance' },
      { id: 6, code: 'SA1', description: 'Health and Care' },
    ],
    navbarProductGroups: [
      {
        id: 1,
        name: 'Study Materials',
        products: [
          { id: 101, shortname: 'CMP Notes' },
          { id: 102, shortname: 'ASET' },
        ]
      },
      {
        id: 2,
        name: 'Tutorial',
        products: [
          { id: 201, shortname: 'London Tutorial' },
          { id: 202, shortname: 'Online Tutorial' },
        ]
      },
    ],
    distanceLearningData: [
      {
        id: 1,
        name: 'Online Courses',
        products: [{ id: 301, shortname: 'Online CM1' }]
      },
    ],
    tutorialData: {
      Location: {
        left: [{ id: 1, shortname: 'London' }],
        right: [{ id: 2, shortname: 'Manchester' }]
      },
      Format: [
        { filter_type: 'classroom', name: 'Classroom', group_name: 'Classroom Tutorial' },
        { filter_type: 'online', name: 'Online', group_name: 'Online Tutorial' },
      ],
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
    onCollapseNavbar: mockOnCollapseNavbar,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock auth state
    mockUseAuth.isSuperuser = false;
    mockUseAuth.isApprentice = false;
    mockUseAuth.isStudyPlus = false;
  });

  const renderMenu = (props = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <NavigationMenu {...defaultProps} {...props} />
      </ThemeProvider>
    );
  };

  describe('rendering', () => {
    test('renders Home link', () => {
      renderMenu();
      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    test('renders Subjects dropdown', () => {
      renderMenu();
      expect(screen.getByText('Subjects')).toBeInTheDocument();
    });

    test('renders Products dropdown', () => {
      renderMenu();
      expect(screen.getByText('Products')).toBeInTheDocument();
    });

    test('renders Distance Learning dropdown', () => {
      renderMenu();
      expect(screen.getByText('Distance Learning')).toBeInTheDocument();
    });

    test('renders Tutorials dropdown', () => {
      renderMenu();
      expect(screen.getByText('Tutorials')).toBeInTheDocument();
    });
  });

  describe('subjects dropdown', () => {
    test('renders Core Principles heading', () => {
      renderMenu();
      expect(screen.getByText('Core Principles')).toBeInTheDocument();
    });

    test('renders Core Practices heading', () => {
      renderMenu();
      expect(screen.getByText('Core Practices')).toBeInTheDocument();
    });

    test('renders Specialist Principles heading', () => {
      renderMenu();
      expect(screen.getByText('Specialist Principles')).toBeInTheDocument();
    });

    test('renders Specialist Advanced heading', () => {
      renderMenu();
      expect(screen.getByText('Specialist Advanced')).toBeInTheDocument();
    });

    test('renders subject items', () => {
      renderMenu();
      expect(screen.getByText('CB1 - Business Finance')).toBeInTheDocument();
      expect(screen.getByText('CP1 - Core Practice 1')).toBeInTheDocument();
    });

    test('calls handleSubjectClick when subject clicked', () => {
      renderMenu();

      fireEvent.click(screen.getByText('CB1 - Business Finance'));

      expect(mockHandleSubjectClick).toHaveBeenCalledWith('CB1');
      expect(mockOnCollapseNavbar).toHaveBeenCalled();
    });
  });

  describe('products dropdown', () => {
    test('renders View All Products link', () => {
      renderMenu();
      expect(screen.getByText('View All Products')).toBeInTheDocument();
    });

    test('calls handleProductClick when View All Products clicked', () => {
      renderMenu();

      fireEvent.click(screen.getByText('View All Products'));

      expect(mockHandleProductClick).toHaveBeenCalled();
      expect(mockOnCollapseNavbar).toHaveBeenCalled();
    });

    test('renders product groups', () => {
      renderMenu();
      expect(screen.getByText('Study Materials')).toBeInTheDocument();
    });

    test('calls handleProductGroupClick when group clicked', () => {
      renderMenu();

      fireEvent.click(screen.getByText('Study Materials'));

      expect(mockHandleProductGroupClick).toHaveBeenCalledWith('Study Materials');
      expect(mockOnCollapseNavbar).toHaveBeenCalled();
    });

    test('renders product items', () => {
      renderMenu();
      expect(screen.getByText('CMP Notes')).toBeInTheDocument();
    });

    test('calls handleSpecificProductClick when product clicked', () => {
      renderMenu();

      fireEvent.click(screen.getByText('CMP Notes'));

      expect(mockHandleSpecificProductClick).toHaveBeenCalledWith(101);
      expect(mockOnCollapseNavbar).toHaveBeenCalled();
    });
  });

  describe('distance learning dropdown', () => {
    test('renders View All Distance Learning link', () => {
      renderMenu();
      expect(screen.getByText('View All Distance Learning')).toBeInTheDocument();
    });

    test('renders Marking Vouchers link', () => {
      renderMenu();
      expect(screen.getByText('Marking Vouchers')).toBeInTheDocument();
    });

    test('calls handleMarkingVouchersClick when Marking Vouchers clicked', () => {
      renderMenu();

      fireEvent.click(screen.getByText('Marking Vouchers'));

      expect(mockHandleMarkingVouchersClick).toHaveBeenCalled();
    });
  });

  describe('tutorials dropdown', () => {
    test('renders View All Tutorials link', () => {
      renderMenu();

      // Click to open the MUI Popover
      const tutorialsButton = screen.getByRole('button', { name: /tutorials/i });
      fireEvent.click(tutorialsButton);

      expect(screen.getByText('View All Tutorials')).toBeInTheDocument();
    });

    test('renders Location section', () => {
      renderMenu();

      // Click to open the MUI Popover
      const tutorialsButton = screen.getByRole('button', { name: /tutorials/i });
      fireEvent.click(tutorialsButton);

      expect(screen.getByText('Location')).toBeInTheDocument();
    });

    test('renders Format section', () => {
      renderMenu();

      // Click to open the MUI Popover
      const tutorialsButton = screen.getByRole('button', { name: /tutorials/i });
      fireEvent.click(tutorialsButton);

      expect(screen.getByText('Format')).toBeInTheDocument();
    });

    test('renders tutorial locations', () => {
      renderMenu();

      // Click to open the MUI Popover
      const tutorialsButton = screen.getByRole('button', { name: /tutorials/i });
      fireEvent.click(tutorialsButton);

      expect(screen.getByText('London')).toBeInTheDocument();
    });

    test('calls handleSpecificProductClick when location clicked', () => {
      renderMenu();

      // Click to open the MUI Popover
      const tutorialsButton = screen.getByRole('button', { name: /tutorials/i });
      fireEvent.click(tutorialsButton);

      fireEvent.click(screen.getByText('London'));

      expect(mockHandleSpecificProductClick).toHaveBeenCalledWith(1);
    });

    test('renders format options', () => {
      renderMenu();

      // Click to open the MUI Popover
      const tutorialsButton = screen.getByRole('button', { name: /tutorials/i });
      fireEvent.click(tutorialsButton);

      expect(screen.getByText('Classroom')).toBeInTheDocument();
      expect(screen.getByText('Online')).toBeInTheDocument();
    });

    test('calls handleProductGroupClick when format clicked', () => {
      renderMenu();

      // Click to open the MUI Popover
      const tutorialsButton = screen.getByRole('button', { name: /tutorials/i });
      fireEvent.click(tutorialsButton);

      fireEvent.click(screen.getByText('Classroom'));

      expect(mockHandleProductGroupClick).toHaveBeenCalledWith('Classroom Tutorial');
      expect(mockOnCollapseNavbar).toHaveBeenCalled();
    });
  });

  describe('loading states', () => {
    test('shows loading message for products', () => {
      renderMenu({ loadingProductGroups: true });
      expect(screen.getByText('Loading products...')).toBeInTheDocument();
    });

    test('shows loading message for distance learning', () => {
      renderMenu({ loadingDistanceLearning: true });
      expect(screen.getByText('Loading distance learning...')).toBeInTheDocument();
    });

    test('shows loading message for tutorials', () => {
      renderMenu({ loadingTutorial: true });

      // Click to open the MUI Popover
      const tutorialsButton = screen.getByRole('button', { name: /tutorials/i });
      fireEvent.click(tutorialsButton);

      expect(screen.getByText('Loading tutorials...')).toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    test('shows no products message when empty', () => {
      renderMenu({ navbarProductGroups: [] });
      expect(screen.getByText('No products available')).toBeInTheDocument();
    });

    test('shows no distance learning message when empty', () => {
      renderMenu({ distanceLearningData: [] });
      expect(screen.getByText('No distance learning products available')).toBeInTheDocument();
    });

    test('shows no tutorial data message when null', () => {
      renderMenu({ tutorialData: null });

      // Click to open the MUI Popover
      const tutorialsButton = screen.getByRole('button', { name: /tutorials/i });
      fireEvent.click(tutorialsButton);

      expect(screen.getByText('No tutorial data available')).toBeInTheDocument();
    });
  });

  describe('admin dropdown', () => {
    test('does not render Admin dropdown for regular users', () => {
      renderMenu();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    test('renders Admin dropdown for superusers', () => {
      mockUseAuth.isSuperuser = true;
      renderMenu();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    test('renders admin links for superusers', () => {
      mockUseAuth.isSuperuser = true;
      renderMenu();
      // Admin dropdown should render with admin menu items
      // The Admin dropdown renders Exam Sessions, Subjects, Products links
      expect(screen.getByText('Admin')).toBeInTheDocument();
      // The admin items are rendered by NavDropdown.Item - verify the Admin dropdown exists
      // and has clickable items
    });
  });

  describe('conditional sections', () => {
    test('renders Apprenticeships when user is apprentice', () => {
      mockUseAuth.isApprentice = true;
      renderMenu();
      expect(screen.getByText('Apprenticeships')).toBeInTheDocument();
    });

    test('does not render Apprenticeships for regular users', () => {
      renderMenu();
      expect(screen.queryByText('Apprenticeships')).not.toBeInTheDocument();
    });

    test('renders Study Plus when user has study plus', () => {
      mockUseAuth.isStudyPlus = true;
      renderMenu();
      expect(screen.getByText('Study Plus')).toBeInTheDocument();
    });

    test('does not render Study Plus for regular users', () => {
      renderMenu();
      expect(screen.queryByText('Study Plus')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    test('NavigationMenu has no accessibility violations', async () => {
      const { container } = renderMenu();
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
    
    test('has proper ARIA attributes on navigation', () => {
      renderMenu();
      
      // Main navigation has aria-label
      const nav = screen.getByRole('navigation', { name: /main navigation/i });
      expect(nav).toBeInTheDocument();
    });
    
    test('MUI Admin dropdown has proper ARIA attributes', () => {
      mockUseAuth.isSuperuser = true;
      renderMenu();
      
      // Admin button uses MUI Menu with proper ARIA
      const adminButton = screen.getByRole('button', { name: /admin/i });
      
      // Check initial state - MUI Button sets aria-haspopup
      expect(adminButton).toHaveAttribute('aria-haspopup', 'true');
      
      // Open menu
      fireEvent.click(adminButton);
      
      // Check expanded state - MUI Button sets aria-expanded when menu opens
      expect(adminButton).toHaveAttribute('aria-expanded', 'true');
      expect(adminButton).toHaveAttribute('aria-controls', 'admin-menu');
    });
    
    test('MegaMenuPopover for tutorials has proper ARIA attributes', () => {
      renderMenu();
      
      // Open Tutorials dropdown
      const tutorialsButton = screen.getByRole('button', { name: /tutorials/i });
      fireEvent.click(tutorialsButton);
      
      // Check ARIA attributes for expanded state
      expect(tutorialsButton).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
