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
import TopNavBar from '../TopNavBar';
// AuthProvider and CartProvider are mocked above, no need to import

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
  return render(component);
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

// Mock TopNavActions
jest.mock('../TopNavActions', () => {
  return function MockTopNavActions({ onOpenSearch }) {
    return (
      <div data-testid="top-nav-actions">
        <button onClick={onOpenSearch}>Search</button>
        <span>Brochure</span>
      </div>
    );
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

    test('should render ActEd Home link', () => {
      renderWithProviders(<TopNavBar />);

      // Should render ActEd Home link
      const actedHomeText = screen.getByText('ActEd Home');
      expect(actedHomeText).toBeInTheDocument();
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

    test('should render ActEd Home link that navigates to /Home', () => {
      renderWithProviders(<TopNavBar />);

      const homeLink = screen.getByText('ActEd Home').closest('a');
      expect(homeLink).toHaveAttribute('href', '/Home');
    });

    test('should render Help link that navigates to /style-guide', () => {
      renderWithProviders(<TopNavBar />);

      const helpLink = screen.getByText('Help').closest('a');
      expect(helpLink).toHaveAttribute('href', '/style-guide');
    });
  });

  describe('Custom Events', () => {
    test('should listen for show-login-modal custom event', () => {
      renderWithProviders(<TopNavBar />);

      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('show-login-modal'));

      // The event listener is set up - we just verify component doesn't crash
      expect(screen.getByText('ActEd Home')).toBeInTheDocument();
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

  describe('Search Modal', () => {
    test('should open search modal when search button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TopNavBar />);

      // Search modal should not be visible initially
      expect(screen.queryByTestId('search-modal')).not.toBeInTheDocument();

      // Click search button from TopNavActions
      const searchButton = screen.getByText('Search');
      await user.click(searchButton);

      // Search modal should now be visible
      expect(screen.getByTestId('search-modal')).toBeInTheDocument();
    });

    test('should close search modal when close is called', async () => {
      const user = userEvent.setup();
      renderWithProviders(<TopNavBar />);

      // Open search modal
      const searchButton = screen.getByText('Search');
      await user.click(searchButton);

      // Close it
      const closeButton = screen.getByTestId('close-search');
      await user.click(closeButton);

      // Search modal should be closed
      expect(screen.queryByTestId('search-modal')).not.toBeInTheDocument();
    });
  });
});
