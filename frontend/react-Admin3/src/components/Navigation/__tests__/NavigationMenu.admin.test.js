import { vi } from 'vitest';
// src/components/Navigation/__tests__/NavigationMenu.admin.test.js
// T004 [US1] - MegaMenu navigation tests
import React from 'react';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';
import NavigationMenu from '../NavigationMenu.js';
import theme from '../../../theme';

// Mock useAuth
vi.mock('../../../hooks/useAuth.js', () => ({
  __esModule: true,
  useAuth: vi.fn(),
}));

import { useAuth } from '../../../hooks/useAuth.js';

const defaultProps = {
  subjects: [],
  navbarProductGroups: [],
  distanceLearningData: { subjects: [] },
  tutorialData: { subjects: [] },
  loadingProductGroups: false,
  loadingDistanceLearning: false,
  loadingTutorial: false,
  handleSubjectClick: vi.fn(),
  handleProductClick: vi.fn(),
  handleProductGroupClick: vi.fn(),
  handleSpecificProductClick: vi.fn(),
  handleProductVariationClick: vi.fn(),
  handleMarkingVouchersClick: vi.fn(),
  onCollapseNavbar: vi.fn(),
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
    vi.clearAllMocks();
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
      expect(screen.getByText('Current products')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    test('renders all category headings', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Admin'));

      // Scope queries to the admin popover to avoid matching main navbar items
      const popover = document.getElementById('admin-menu-popover');
      const adminMenu = within(popover);

      // Some category names match link names (e.g. "Orders"), so use getAllByText
      const expectedCategories = ['Catalog', 'Current products', 'Filtering', 'Users', 'Tutorials', 'Marking', 'Orders'];
      expectedCategories.forEach(category => {
        const matches = adminMenu.getAllByText(category);
        expect(matches.length).toBeGreaterThanOrEqual(1);
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
      expect(adminMenu.getByText('Product Variations')).toBeInTheDocument();
      expect(adminMenu.getByText('Product Bundles Template')).toBeInTheDocument();
    });

    test('renders enabled Current products links', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Admin'));

      expect(screen.getByText('Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Prices')).toBeInTheDocument();
    });

    test('renders enabled Users links', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Admin'));

      expect(screen.getByText('User List')).toBeInTheDocument();
      expect(screen.getByText('Staff List')).toBeInTheDocument();
    });

    test('renders disabled categories with reduced opacity', () => {
      renderComponent();
      fireEvent.click(screen.getByText('Admin'));

      const popover = document.getElementById('admin-menu-popover');
      const adminMenu = within(popover);

      // Filtering, Tutorials, Marking, Orders should be disabled
      const disabledCategories = ['Filtering', 'Tutorials', 'Marking', 'Orders'];
      disabledCategories.forEach(name => {
        // Some category names match link names, so find the Typography heading specifically
        const matches = adminMenu.getAllByText(name);
        const heading = matches.find(el => el.classList.contains('MuiTypography-mega-nav-heading'));
        expect(heading).toBeTruthy();
        expect(heading.closest('[data-disabled="true"]')).toBeInTheDocument();
      });
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

      const userListLink = adminMenu.getByText('User List').closest('a');
      expect(userListLink).toHaveAttribute('href', '/admin/user-profiles');
    });

    test('menu closes on link click', async () => {
      renderComponent();
      fireEvent.click(screen.getByText('Admin'));

      // Click on an enabled link
      fireEvent.click(screen.getByText('Exam Sessions'));

      // The popover should close (MegaMenuPopover handles this via onClick)
      // After close, the menu content should not be visible
      await waitFor(() => {
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
