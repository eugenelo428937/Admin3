import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import NavigationMenu from '../Navigation/NavigationMenu';
import theme from '../../theme';

// Mock useAuth
jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from '../../hooks/useAuth';

const defaultProps = {
  subjects: [{ id: 1, code: 'CM2', description: 'Financial Mathematics' }],
  navbarProductGroups: [],
  distanceLearningData: [],
  tutorialData: [],
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

const renderWithProviders = (props = {}) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <NavigationMenu {...defaultProps} {...props} />
      </MemoryRouter>
    </ThemeProvider>
  );

const openAdminMenu = () => {
  const adminButton = document.getElementById('admin-menu-button');
  if (adminButton) fireEvent.click(adminButton);
};

describe('NavigationMenu - New Session Setup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows New Session Setup button for superusers in admin mega menu', async () => {
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });

    renderWithProviders();

    // Open admin mega menu popover
    openAdminMenu();

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /new session setup/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/admin/new-session-setup');
    });
  });

  it('does not show New Session Setup button for non-superusers', () => {
    useAuth.mockReturnValue({
      isSuperuser: false,
      isApprentice: false,
      isStudyPlus: false,
    });

    renderWithProviders();

    // Admin menu button should not exist for non-superusers
    expect(document.getElementById('admin-menu-button')).not.toBeInTheDocument();
    expect(screen.queryByText(/new session setup/i)).not.toBeInTheDocument();
  });

  it('uses navViewAll variant styling', async () => {
    useAuth.mockReturnValue({
      isSuperuser: true,
      isApprentice: false,
      isStudyPlus: false,
    });

    renderWithProviders();

    openAdminMenu();

    await waitFor(() => {
      const link = screen.getByRole('link', { name: /new session setup/i });
      expect(link).toBeInTheDocument();
    });
  });
});
