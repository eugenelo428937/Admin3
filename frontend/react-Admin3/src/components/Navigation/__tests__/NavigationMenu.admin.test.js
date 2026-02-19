// src/components/Navigation/__tests__/NavigationMenu.admin.test.js
// T004 [US1] - MegaMenu navigation tests
import React from 'react';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import NavigationMenu from '../NavigationMenu';

// Mock useAuth
jest.mock('../../../hooks/useAuth', () => ({
  __esModule: true,
  useAuth: jest.fn(),
}));

import { useAuth } from '../../../hooks/useAuth';

// Create a custom theme with all properties needed by NavigationMenu and MegaMenuPopover
const theme = createTheme({
  palette: {
    semantic: {
      navigation: {
        button: { color: '#333333', hoverBg: '#f5f5f5' },
        menuItem: { color: '#333333', hoverBg: '#f5f5f5' }
      }
    },
    navigation: {
      background: { active: '#ffffff' }
    },
    offwhite: { '000': '#fdfdfd', '001': '#f0edf1' },
    bpp: {
      granite: {
        '000': '#ffffff', '010': '#f1f1f1', '020': '#d9d9d9',
        '030': '#bababa', '040': '#9e9e9e', '050': '#848484',
        '060': '#6a6a6a', '070': '#525252', '080': '#3b3b3a',
        '090': '#272524', '100': '#111110'
      }
    },
  },
});
// Add custom liftkit namespace (not a standard MUI property)
theme.liftkit = {
  spacing: {
    xs3: '0.3rem', xs2: '0.38rem', xs: '0.49rem',
    sm: '0.62rem', md: '1rem', lg: '1.62rem',
    xl: '2.62rem', xl15: '3.33rem', xl2: '4.24rem', xl3: '6.85rem'
  },
  typography: {
    body: { fontSize: '1em', fontWeight: 400 }
  }
};

const defaultProps = {
  subjects: [],
  navbarProductGroups: [],
  distanceLearningData: { subjects: [] },
  tutorialData: { subjects: [] },
  loadingProductGroups: false,
  loadingDistanceLearning: false,
  loadingTutorial: false,
  handleSubjectClick: jest.fn(),
  handleProductClick: jest.fn(),
  handleProductGroupClick: jest.fn(),
  handleSpecificProductClick: jest.fn(),
  handleProductVariationClick: jest.fn(),
  handleMarkingVouchersClick: jest.fn(),
  onCollapseNavbar: jest.fn(),
};

const renderComponent = (props = {}) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <NavigationMenu {...defaultProps} {...props} />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Admin MegaMenu Navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('superuser access', () => {
    beforeEach(() => {
      useAuth.mockReturnValue({
        isSuperuser: true,
        isApprentice: false,
        isStudyPlus: false,
      });
    });

    test('renders Admin button for superuser', () => {
      renderComponent();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    test('opens MegaMenuPopover when Admin button clicked', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Admin'));

      // Check category headings appear
      expect(screen.getByText('Catalog')).toBeInTheDocument();
      expect(screen.getByText('Store')).toBeInTheDocument();
      expect(screen.getByText('User')).toBeInTheDocument();
    });

    test('renders all category headings', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Admin'));

      // Scope queries to the admin popover to avoid matching main navbar items
      const popover = document.getElementById('admin-menu-popover');
      const adminMenu = within(popover);

      // Use heading role to distinguish category headings from same-named links
      const expectedCategories = ['Catalog', 'Store', 'Filtering', 'User', 'Tutorials', 'Marking', 'Orders'];
      expectedCategories.forEach(category => {
        expect(adminMenu.getByRole('heading', { name: category })).toBeInTheDocument();
      });
    });

    test('renders enabled Catalog links', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Admin'));

      const popover = document.getElementById('admin-menu-popover');
      const adminMenu = within(popover);

      expect(adminMenu.getByText('Exam Sessions')).toBeInTheDocument();
      expect(adminMenu.getByText('Subjects')).toBeInTheDocument();
      expect(adminMenu.getByText('Exam Session Subjects')).toBeInTheDocument();
      expect(adminMenu.getByText('Products')).toBeInTheDocument();
      expect(adminMenu.getByText('Product Variations')).toBeInTheDocument();
      expect(adminMenu.getByText('Product Bundles')).toBeInTheDocument();
    });

    test('renders enabled Store links', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Admin'));

      expect(screen.getByText('Store Products')).toBeInTheDocument();
      expect(screen.getByText('Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Prices')).toBeInTheDocument();
      expect(screen.getByText('Store Bundles')).toBeInTheDocument();
    });

    test('renders enabled User links', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Admin'));

      expect(screen.getByText('User Profiles')).toBeInTheDocument();
      expect(screen.getByText('Staff')).toBeInTheDocument();
    });

    test('renders disabled categories with reduced opacity', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Admin'));

      const popover = document.getElementById('admin-menu-popover');
      const adminMenu = within(popover);

      // Filtering, Tutorials, Marking, Orders should be disabled
      const filteringHeading = adminMenu.getByRole('heading', { name: 'Filtering' });
      const tutorialsHeading = adminMenu.getByRole('heading', { name: 'Tutorials' });
      const markingHeading = adminMenu.getByRole('heading', { name: 'Marking' });
      const ordersHeading = adminMenu.getByRole('heading', { name: 'Orders' });

      // Check that parent containers have disabled styling
      expect(filteringHeading.closest('[data-disabled="true"]')).toBeInTheDocument();
      expect(tutorialsHeading.closest('[data-disabled="true"]')).toBeInTheDocument();
      expect(markingHeading.closest('[data-disabled="true"]')).toBeInTheDocument();
      expect(ordersHeading.closest('[data-disabled="true"]')).toBeInTheDocument();
    });

    test('enabled links have correct navigation targets', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Admin'));

      const popover = document.getElementById('admin-menu-popover');
      const adminMenu = within(popover);

      // Check a few key navigation links
      const examSessionsLink = adminMenu.getByText('Exam Sessions').closest('a');
      expect(examSessionsLink).toHaveAttribute('href', '/admin/exam-sessions');

      const subjectsLink = adminMenu.getByText('Subjects').closest('a');
      expect(subjectsLink).toHaveAttribute('href', '/admin/subjects');

      const productsLink = adminMenu.getByText('Products').closest('a');
      expect(productsLink).toHaveAttribute('href', '/admin/products');
    });

    test('menu closes on link click', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Admin'));

      // Click on an enabled link
      fireEvent.click(screen.getByText('Exam Sessions'));

      // The popover should close (MegaMenuPopover handles this via onClick)
      // After close, the menu content should not be visible
      waitFor(() => {
        expect(screen.queryByText('Catalog')).not.toBeVisible();
      });
    });
  });

  describe('non-superuser access', () => {
    test('does not render Admin button for non-superuser', () => {
      useAuth.mockReturnValue({
        isSuperuser: false,
        isApprentice: false,
        isStudyPlus: false,
      });

      renderComponent();
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });
  });
});
