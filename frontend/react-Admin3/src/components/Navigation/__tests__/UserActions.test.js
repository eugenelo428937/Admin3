/**
 * Tests for UserActions Component
 * T026: Test auth state display, logout with AuthContext
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import UserActions from '../UserActions';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
}));

// Mock useAuth hook with configurable values
let mockAuthState = {
  isAuthenticated: false,
  user: null,
  logout: jest.fn(),
};

jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockAuthState,
}));

// Mock useCart context
jest.mock('../../../contexts/CartContext', () => ({
  useCart: () => ({
    cartCount: 5,
  }),
}));

const theme = createTheme({
  palette: {
    liftkit: {
      light: {
        background: '#ffffff',
        onSurface: '#000000',
      },
    },
  },
});

describe('UserActions', () => {
  const mockOnOpenSearch = jest.fn();
  const mockOnOpenAuth = jest.fn();
  const mockOnOpenCart = jest.fn();
  const mockOnToggleMobileMenu = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = {
      isAuthenticated: false,
      user: null,
      logout: jest.fn(),
    };
  });

  const renderUserActions = (props = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <UserActions
          onOpenSearch={mockOnOpenSearch}
          onOpenAuth={mockOnOpenAuth}
          onOpenCart={mockOnOpenCart}
          onToggleMobileMenu={mockOnToggleMobileMenu}
          isMobile={false}
          {...props}
        />
      </ThemeProvider>
    );
  };

  describe('unauthenticated user', () => {
    test('renders Login button', () => {
      renderUserActions();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    test('calls onOpenAuth when Login clicked', () => {
      renderUserActions();

      fireEvent.click(screen.getByRole('button', { name: /login/i }));

      expect(mockOnOpenAuth).toHaveBeenCalled();
    });

    test('does not render user avatar', () => {
      renderUserActions();
      expect(screen.queryByLabelText('user profile menu')).not.toBeInTheDocument();
    });
  });

  describe('authenticated user', () => {
    beforeEach(() => {
      mockAuthState = {
        isAuthenticated: true,
        user: {
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
        },
        logout: jest.fn(),
      };
    });

    test('renders user avatar button', () => {
      renderUserActions();
      expect(screen.getByLabelText('user profile menu')).toBeInTheDocument();
    });

    test('displays user initial in avatar', () => {
      renderUserActions();
      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of email
    });

    test('opens profile menu on click', async () => {
      renderUserActions();

      fireEvent.click(screen.getByLabelText('user profile menu'));

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });
    });

    test('renders Profile menu item', async () => {
      renderUserActions();

      fireEvent.click(screen.getByLabelText('user profile menu'));

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });
    });

    test('renders Logout menu item', async () => {
      renderUserActions();

      fireEvent.click(screen.getByLabelText('user profile menu'));

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });
    });

    test('navigates to profile on Profile click', async () => {
      renderUserActions();

      fireEvent.click(screen.getByLabelText('user profile menu'));

      await waitFor(() => {
        expect(screen.getByText('Profile')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Profile'));

      expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });

    test('calls logout and navigates home on Logout click', async () => {
      renderUserActions();

      fireEvent.click(screen.getByLabelText('user profile menu'));

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Logout'));

      expect(mockAuthState.logout).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('search button', () => {
    test('renders search button', () => {
      renderUserActions();
      expect(screen.getByLabelText('search products')).toBeInTheDocument();
    });

    test('calls onOpenSearch when clicked', () => {
      renderUserActions();

      fireEvent.click(screen.getByLabelText('search products'));

      expect(mockOnOpenSearch).toHaveBeenCalled();
    });

    test('displays Search text', () => {
      renderUserActions();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
  });

  describe('cart button', () => {
    test('renders cart button', () => {
      renderUserActions();
      expect(screen.getByLabelText(/shopping cart/i)).toBeInTheDocument();
    });

    test('displays cart count badge', () => {
      renderUserActions();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    test('calls onOpenCart when clicked', () => {
      renderUserActions();

      fireEvent.click(screen.getByLabelText(/shopping cart/i));

      expect(mockOnOpenCart).toHaveBeenCalled();
    });

    test('displays Cart text', () => {
      renderUserActions();
      expect(screen.getByText('Cart')).toBeInTheDocument();
    });
  });

  describe('brochure button', () => {
    test('renders Brochure button on desktop', () => {
      renderUserActions({ isMobile: false });
      expect(screen.getByText('Brochure')).toBeInTheDocument();
    });

    test('does not render Brochure button on mobile', () => {
      renderUserActions({ isMobile: true });
      expect(screen.queryByText('Brochure')).not.toBeInTheDocument();
    });

    test('brochure link points to /brochure', () => {
      renderUserActions({ isMobile: false });

      const brochureLink = screen.getByText('Brochure').closest('a');
      expect(brochureLink).toHaveAttribute('href', '/brochure');
      expect(brochureLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('mobile menu button', () => {
    test('renders menu button on mobile', () => {
      renderUserActions({ isMobile: true });
      expect(screen.getByLabelText('open navigation menu')).toBeInTheDocument();
    });

    test('does not render menu button on desktop', () => {
      renderUserActions({ isMobile: false });
      expect(screen.queryByLabelText('open navigation menu')).not.toBeInTheDocument();
    });

    test('calls onToggleMobileMenu when clicked', () => {
      renderUserActions({ isMobile: true });

      fireEvent.click(screen.getByLabelText('open navigation menu'));

      expect(mockOnToggleMobileMenu).toHaveBeenCalled();
    });
  });

  describe('user display name', () => {
    test('displays full name when available', async () => {
      mockAuthState = {
        isAuthenticated: true,
        user: {
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
        },
        logout: jest.fn(),
      };

      renderUserActions();
      fireEvent.click(screen.getByLabelText('user profile menu'));

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    test('displays email when name not available', async () => {
      mockAuthState = {
        isAuthenticated: true,
        user: {
          email: 'test@example.com',
        },
        logout: jest.fn(),
      };

      renderUserActions();
      fireEvent.click(screen.getByLabelText('user profile menu'));

      await waitFor(() => {
        // Email should be shown in place of name
        const emailElements = screen.getAllByText('test@example.com');
        expect(emailElements.length).toBeGreaterThan(0);
      });
    });
  });
});
