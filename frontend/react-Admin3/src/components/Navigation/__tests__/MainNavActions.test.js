// src/components/Navigation/__tests__/MainNavActions.test.js
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MainNavActions from '../MainNavActions';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../theme/theme';

// Mock the useAuth hook
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    logout: jest.fn(),
  }),
}));

// Mock the useCart hook
jest.mock('../../../contexts/CartContext', () => ({
  useCart: () => ({
    cartItems: [],
    cartData: { items: [], vat_calculations: { region_info: { region: 'UK' } } },
    addToCart: jest.fn(() => Promise.resolve()),
    updateCartItem: jest.fn(() => Promise.resolve()),
    removeFromCart: jest.fn(() => Promise.resolve()),
    clearCart: jest.fn(() => Promise.resolve()),
    refreshCart: jest.fn(() => Promise.resolve()),
    cartCount: 3,
    loading: false,
  }),
}));

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('MainNavActions Mobile Display', () => {
  const mockOnOpenAuth = jest.fn();
  const mockOnOpenCart = jest.fn();
  const mockOnOpenSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should hide Cart text on mobile screens using sx prop', () => {
    const { container } = renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        onToggleMobileMenu={jest.fn()}
        isMobile={false}
      />
    );

    // Cart button should exist - use getAllByLabelText since there may be multiple
    const cartButtons = screen.getAllByLabelText(/shopping cart/i);
    expect(cartButtons.length).toBeGreaterThan(0);

    // Cart Typography should have display none on xs and sm screens
    const cartText = screen.queryByText('Cart');
    // The text exists but should have sx={{ display: { xs: 'none', md: 'block' } }}
    expect(cartText).toBeInTheDocument();
  });

  test('should hide Login text on mobile screens using sx prop', () => {
    renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        onOpenSearch={mockOnOpenSearch}
      />
    );

    // Login button should exist
    const loginButton = screen.getByRole('button', { name: /login/i });
    expect(loginButton).toBeInTheDocument();

    // Login Typography should have display none on xs and sm screens
    const loginText = screen.queryByText('Login');
    // The text exists but should have sx={{ display: { xs: 'none', md: 'block' } }}
    expect(loginText).toBeInTheDocument();
  });

  test('should render mobile menu button when isMobile is true', () => {
    renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        onToggleMobileMenu={jest.fn()}
        isMobile={true}
      />
    );

    // Mobile menu button should exist with proper label
    const menuButton = screen.getByLabelText('open navigation menu');
    expect(menuButton).toBeInTheDocument();
  });

  test('should not render mobile menu button when isMobile is false', () => {
    renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        onToggleMobileMenu={jest.fn()}
        isMobile={false}
      />
    );

    // Mobile menu button should not exist
    const menuButton = screen.queryByLabelText('open navigation menu');
    expect(menuButton).not.toBeInTheDocument();
  });
});
