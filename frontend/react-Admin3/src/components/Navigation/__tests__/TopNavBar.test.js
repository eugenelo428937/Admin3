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
import { BrowserRouter } from 'react-router-dom';
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
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('TopNavBar Mobile Visibility', () => {
  test('should have d-none d-sm-block class to hide on mobile screens', () => {
    const { container } = renderWithProviders(<TopNavBar />);

    // TopNavBar should have a wrapper div with d-none d-sm-block classes
    const topNavWrapper = container.querySelector('.navbar-top');
    const parentDiv = topNavWrapper?.parentElement;

    expect(parentDiv).toHaveClass('d-none');
    expect(parentDiv).toHaveClass('d-sm-block');
  });

  test('should render TopNavBar content when on desktop', () => {
    renderWithProviders(<TopNavBar />);

    // Should render ActEd Home and Help links (desktop behavior)
    const actedHomeText = screen.queryByText('ActEd Home');

    // These elements exist in the DOM but may be hidden on mobile via CSS
    expect(actedHomeText).toBeInTheDocument();
  });
});
