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

describe('TopNavBar', () => {
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
});
