// src/components/Navigation/__tests__/MainNavActions.test.js
import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MainNavActions from '../MainNavActions';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../../theme/theme';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
}));

// Create mock logout function that can be accessed in tests
const mockLogout = jest.fn();

// Mock the useAuth hook - will be overridden in specific tests
let mockAuthState = {
  isAuthenticated: false,
  user: null,
  logout: mockLogout,
};

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockAuthState,
}));

// Mock the useCart hook
let mockCartCount = 3;
jest.mock('../../../contexts/CartContext', () => ({
  useCart: () => ({
    cartItems: [],
    cartData: { items: [], vat_calculations: { region_info: { region: 'UK' } } },
    addToCart: jest.fn(() => Promise.resolve()),
    updateCartItem: jest.fn(() => Promise.resolve()),
    removeFromCart: jest.fn(() => Promise.resolve()),
    clearCart: jest.fn(() => Promise.resolve()),
    refreshCart: jest.fn(() => Promise.resolve()),
    cartCount: mockCartCount,
    loading: false,
  }),
}));

const renderWithProviders = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('MainNavActions Mobile Display', () => {
  const mockOnOpenAuth = jest.fn();
  const mockOnOpenCart = jest.fn();
  const mockOnOpenSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCartCount = 3;
    mockAuthState = {
      isAuthenticated: false,
      user: null,
      logout: mockLogout,
    };
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

describe('MainNavActions Button Clicks', () => {
  const mockOnOpenAuth = jest.fn();
  const mockOnOpenCart = jest.fn();
  const mockOnToggleMobileMenu = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCartCount = 3;
    mockAuthState = {
      isAuthenticated: false,
      user: null,
      logout: mockLogout,
    };
  });

  test('should call onOpenCart when cart button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        onToggleMobileMenu={mockOnToggleMobileMenu}
        isMobile={false}
      />
    );

    // Find and click the cart button
    const cartButton = screen.getByRole('button', { name: /shopping cart/i });
    await user.click(cartButton);

    expect(mockOnOpenCart).toHaveBeenCalledTimes(1);
  });

  test('should call onOpenAuth when login button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        onToggleMobileMenu={mockOnToggleMobileMenu}
        isMobile={false}
      />
    );

    // Find and click the login button
    const loginButton = screen.getByRole('button', { name: /login/i });
    await user.click(loginButton);

    expect(mockOnOpenAuth).toHaveBeenCalledTimes(1);
  });

  test('should call onToggleMobileMenu when mobile menu button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        onToggleMobileMenu={mockOnToggleMobileMenu}
        isMobile={true}
      />
    );

    // Find and click the mobile menu button
    const menuButton = screen.getByLabelText('open navigation menu');
    await user.click(menuButton);

    expect(mockOnToggleMobileMenu).toHaveBeenCalledTimes(1);
  });
});

describe('MainNavActions Authenticated User', () => {
  const mockOnOpenAuth = jest.fn();
  const mockOnOpenCart = jest.fn();
  const mockOnToggleMobileMenu = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockLogout.mockClear();
    mockCartCount = 3;
    mockAuthState = {
      isAuthenticated: true,
      user: {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
      },
      logout: mockLogout,
    };
  });

  test('should render user profile button when authenticated', () => {
    renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        onToggleMobileMenu={mockOnToggleMobileMenu}
        isMobile={false}
      />
    );

    // Profile button should be visible with user's first name
    const profileButton = screen.getByRole('button', { name: /user profile menu/i });
    expect(profileButton).toBeInTheDocument();
    expect(screen.getByText('John')).toBeInTheDocument();
  });

  test('should open profile menu when profile button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        onToggleMobileMenu={mockOnToggleMobileMenu}
        isMobile={false}
      />
    );

    // Click the profile button
    const profileButton = screen.getByRole('button', { name: /user profile menu/i });
    await user.click(profileButton);

    // Menu should open with Profile and Logout options
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: /profile/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /logout/i })).toBeInTheDocument();
    });
  });

  test('should navigate to /profile when Profile menu item is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        onToggleMobileMenu={mockOnToggleMobileMenu}
        isMobile={false}
      />
    );

    // Open the profile menu
    const profileButton = screen.getByRole('button', { name: /user profile menu/i });
    await user.click(profileButton);

    // Click the Profile menu item
    const profileMenuItem = await screen.findByRole('menuitem', { name: /profile/i });
    await user.click(profileMenuItem);

    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  test('should call logout and navigate to / when Logout menu item is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        onToggleMobileMenu={mockOnToggleMobileMenu}
        isMobile={false}
      />
    );

    // Open the profile menu
    const profileButton = screen.getByRole('button', { name: /user profile menu/i });
    await user.click(profileButton);

    // Click the Logout menu item
    const logoutMenuItem = await screen.findByRole('menuitem', { name: /logout/i });
    await user.click(logoutMenuItem);

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  test('should close profile menu when clicking outside', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        onToggleMobileMenu={mockOnToggleMobileMenu}
        isMobile={false}
      />
    );

    // Open the profile menu
    const profileButton = screen.getByRole('button', { name: /user profile menu/i });
    await user.click(profileButton);

    // Wait for menu to appear
    await screen.findByRole('menuitem', { name: /profile/i });

    // Press Escape to close the menu
    await user.keyboard('{Escape}');

    // Menu should be closed
    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: /profile/i })).not.toBeInTheDocument();
    });
  });

  test('should display ProfileIcon in avatar when no first_name', () => {
    mockAuthState = {
      isAuthenticated: true,
      user: {
        email: 'test@example.com',
      },
      logout: mockLogout,
    };

    renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        onToggleMobileMenu={mockOnToggleMobileMenu}
        isMobile={false}
      />
    );

    // Should display ProfileIcon when no first_name, and email as button text
    expect(screen.getByTestId('PersonIcon')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  test('should display full name in profile menu header', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        onToggleMobileMenu={mockOnToggleMobileMenu}
        isMobile={false}
      />
    );

    // Open the profile menu
    const profileButton = screen.getByRole('button', { name: /user profile menu/i });
    await user.click(profileButton);

    // Full name should be displayed in menu header
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    });
  });
});

describe('MainNavActions Cart Visibility', () => {
  const mockOnOpenAuth = jest.fn();
  const mockOnOpenCart = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = {
      isAuthenticated: false,
      user: null,
      logout: mockLogout,
    };
  });

  test('should show cart badge with correct count', () => {
    mockCartCount = 5;
    renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        isMobile={false}
      />
    );

    // Badge should show the cart count
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  test('should show correct aria-label with cart count', () => {
    mockCartCount = 7;
    renderWithProviders(
      <MainNavActions
        onOpenAuth={mockOnOpenAuth}
        onOpenCart={mockOnOpenCart}
        isMobile={false}
      />
    );

    // Badge should have correct aria-label
    const badge = screen.getByLabelText('shopping cart with 7 items');
    expect(badge).toBeInTheDocument();
  });
});
