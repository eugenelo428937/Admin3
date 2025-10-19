// src/components/Navigation/__tests__/MainNavActions.test.js
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MainNavActions from '../MainNavActions';
import { ThemeProvider, createTheme } from '@mui/material/styles';

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
    cartCount: 3,
  }),
}));

const theme = createTheme();

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
        onOpenSearch={mockOnOpenSearch}
      />
    );

    // Cart button should exist
    const cartButton = screen.getByLabelText(/shopping cart/i);
    expect(cartButton).toBeInTheDocument();

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

  test('should render search icon button for mobile', () => {
    renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        onOpenSearch={mockOnOpenSearch}
      />
    );

    // Search button should exist with proper label
    const searchButton = screen.getByLabelText(/search/i);
    expect(searchButton).toBeInTheDocument();
  });

  test('should show search icon only on mobile (hidden on desktop)', () => {
    const { container } = renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        onOpenSearch={mockOnOpenSearch}
      />
    );

    // Search button should have sx={{ display: { xs: 'flex', md: 'none' } }}
    const searchButton = screen.getByLabelText(/search/i);
    expect(searchButton).toBeInTheDocument();
  });
});
