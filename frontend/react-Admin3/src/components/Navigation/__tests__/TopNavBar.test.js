// src/components/Navigation/__tests__/TopNavBar.test.js

// Mock services BEFORE any imports to prevent axios import errors
jest.mock('../../../services/httpService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../../services/cartService', () => ({
  __esModule: true,
  default: {
    getCart: jest.fn(() => Promise.resolve({
      data: {
        items: [],
        vat_calculations: {
          region_info: { region: 'UK' }
        }
      }
    })),
    addToCart: jest.fn(),
    updateCartItem: jest.fn(),
    removeFromCart: jest.fn(),
  },
}));

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import TopNavBar from '../TopNavBar';

// Create a theme with liftkit spacing and semantic navigation colors for tests
const theme = createTheme({
  liftkit: {
    spacing: {
      xs: 4,
      xs2: 8,
      xs3: 12,
      sm: 16,
      md: 24,
      lg: 32,
      xl: 48,
      xxl: 64,
    },
  },
  palette: {
    liftkit: {
      light: {
        background: '#ffffff',
      },
    },
    offwhite: {
      '000': '#ffffff',
      '001': '#f0edf1',
    },
    semantic: {
      navigation: {
        text: {
          primary: '#ffffff',
          secondary: '#f0edf1',
        },
      },
    },
  },
});

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
    cartCount: 0,
    loading: false,
  }),
  CartProvider: ({ children }) => children,
}));

const renderWithProviders = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

// Mock react-router-dom for navigation tests
const mockNavigate = jest.fn();
let mockLocation = { pathname: '/', state: null };

jest.mock('react-router-dom', () => {
  const React = require('react');
  return {
    __esModule: true,
    Link: ({ children, to }) => React.createElement('a', { href: to }, children),
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

// Mock SearchModal
jest.mock('../SearchModal', () => {
  return function MockSearchModal({ open, onClose }) {
    return open ? (
      <div data-testid="search-modal">
        <button data-testid="close-search" onClick={onClose}>Close</button>
      </div>
    ) : null;
  };
});

// Mock AuthModal
jest.mock('../AuthModal', () => {
  return function MockAuthModal({ open, onClose }) {
    return open ? (
      <div data-testid="auth-modal">
        <button data-testid="close-auth" onClick={onClose}>Close</button>
      </div>
    ) : null;
  };
});

// Mock CartPanel
jest.mock('../../Ordering/CartPanel', () => {
  return function MockCartPanel({ show, handleClose }) {
    return show ? (
      <div data-testid="cart-panel">
        <button data-testid="close-cart" onClick={handleClose}>Close</button>
      </div>
    ) : null;
  };
});

describe('TopNavBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockLocation = { pathname: '/', state: null };
  });

  describe('Basic Rendering', () => {
    test('should render navbar-top wrapper element', () => {
      const { container } = renderWithProviders(<TopNavBar />);

      // TopNavBar should have a wrapper div with navbar-top class
      const topNavWrapper = container.querySelector('.navbar-top');
      expect(topNavWrapper).toBeInTheDocument();
    });

    test('should render ActEd link', () => {
      renderWithProviders(<TopNavBar />);

      // Should render ActEd link
      const actedText = screen.getByText('ActEd');
      expect(actedText).toBeInTheDocument();
    });

    test('should render Help link', () => {
      renderWithProviders(<TopNavBar />);

      // Should render Help link
      const helpText = screen.getByText('Help');
      expect(helpText).toBeInTheDocument();
    });

    test('should render Brochure button via TopNavActions', () => {
      renderWithProviders(<TopNavBar />);

      // Brochure button should be rendered
      expect(screen.getByText('Brochure')).toBeInTheDocument();
    });

    test('should render Search button via TopNavActions', () => {
      renderWithProviders(<TopNavBar />);

      // Search button should be rendered
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    test('should render ActEd link that navigates to /Home', () => {
      renderWithProviders(<TopNavBar />);

      const homeLink = screen.getByText('ActEd').closest('a');
      expect(homeLink).toHaveAttribute('href', '/Home');
    });

    test('should render Help link that navigates to /styleguide', () => {
      renderWithProviders(<TopNavBar />);

      const helpLink = screen.getByText('Help').closest('a');
      expect(helpLink).toHaveAttribute('href', '/styleguide');
    });
  });

  describe('Custom Events', () => {
    test('should listen for show-login-modal custom event', () => {
      renderWithProviders(<TopNavBar />);

      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('show-login-modal'));

      // The event listener is set up - we just verify component doesn't crash
      expect(screen.getByText('ActEd')).toBeInTheDocument();
    });

    test('should clean up event listener on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const { unmount } = renderWithProviders(<TopNavBar />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'show-login-modal',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Search Button', () => {
    test('should call onOpenSearch callback when search button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnOpenSearch = jest.fn();
      renderWithProviders(<TopNavBar onOpenSearch={mockOnOpenSearch} />);

      // Click search button
      const searchButton = screen.getByLabelText('search products');
      await user.click(searchButton);

      // onOpenSearch callback should be called
      expect(mockOnOpenSearch).toHaveBeenCalledTimes(1);
    });

    test('search button should have correct aria-label for accessibility', () => {
      renderWithProviders(<TopNavBar />);

      const searchButton = screen.getByLabelText('search products');
      expect(searchButton).toBeInTheDocument();
    });

    test('should render Search text', () => {
      renderWithProviders(<TopNavBar />);

      expect(screen.getByText('Search')).toBeInTheDocument();
    });
  });

  describe('Brochure Button', () => {
    test('should render Brochure button', () => {
      renderWithProviders(<TopNavBar />);

      expect(screen.getByText('Brochure')).toBeInTheDocument();
    });

    test('brochure link should point to /brochure', () => {
      renderWithProviders(<TopNavBar />);

      const brochureButton = screen.getByText('Brochure').closest('a');
      expect(brochureButton).toHaveAttribute('href', '/brochure');
    });

    test('brochure link should open in new tab', () => {
      renderWithProviders(<TopNavBar />);

      const brochureButton = screen.getByText('Brochure').closest('a');
      expect(brochureButton).toHaveAttribute('target', '_blank');
    });
  });
});
