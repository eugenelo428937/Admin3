// src/components/Navigation/__tests__/MainNavBar.test.js

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
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MainNavBar from '../MainNavBar';
import filtersReducer from '../../../store/slices/filtersSlice';

// Mock the services
jest.mock('../../../services/productService', () => ({
  getNavbarProductGroups: jest.fn(() => Promise.resolve([])),
  getDistanceLearningDropdown: jest.fn(() => Promise.resolve([])),
  getTutorialDropdown: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('../../../services/subjectService', () => ({
  getSubjects: jest.fn(() => Promise.resolve([])),
}));

// Mock the useAuth hook
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    logout: jest.fn(),
    isSuperuser: false,
    isApprentice: false,
    isStudyPlus: false,
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
}));

// Mock TutorialChoiceContext
jest.mock('../../../contexts/TutorialChoiceContext', () => ({
  useTutorialChoice: () => ({
    getTutorialChoice: jest.fn(),
    addTutorialChoice: jest.fn(),
    removeTutorialChoice: jest.fn(),
    clearTutorialChoices: jest.fn(),
    getSubjectChoices: jest.fn(() => ({})),
    getAllChoices: jest.fn(() => ({})),
    getDraftChoices: jest.fn(() => ({})),
    hasDraftChoices: jest.fn(() => false),
    markChoicesAsAdded: jest.fn(),
    hasCartedChoices: jest.fn(() => false),
  }),
  TutorialChoiceProvider: ({ children }) => children,
}));

const store = configureStore({
  reducer: {
    filters: filtersReducer,
  },
});

// Import the actual application theme
import theme from '../../../theme/theme';
import { ThemeProvider } from '@mui/material/styles';

const renderWithProviders = (component) => {
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
};

describe('MainNavBar Mobile Layout Structure', () => {
  test('should have left box with logo (left-aligned)', () => {
    const { container } = renderWithProviders(<MainNavBar />);

    // NavbarBrand should be in a container with specific alignment classes
    const navbarBrand = container.querySelector('.navbar-brand');
    expect(navbarBrand).toBeInTheDocument();

    // Check if it's in the left section (order-1 on mobile)
    expect(navbarBrand).toHaveClass('order-1');
  });

  test('should have right box with search, cart, login, and hamburger icons (right-aligned)', () => {
    renderWithProviders(<MainNavBar />);

    // Right section should contain MainNavActions
    // Check for cart icon
    const cartButton = screen.getByLabelText(/shopping cart/i);
    expect(cartButton).toBeInTheDocument();

    // Check for login button
    const loginButton = screen.getByRole('button', { name: /login/i });
    expect(loginButton).toBeInTheDocument();

    // Check for search icon
    const searchButton = screen.getByLabelText(/search/i);
    expect(searchButton).toBeInTheDocument();

    // Check for hamburger menu toggle
    const menuToggle = screen.getByLabelText(/toggle navigation/i);
    expect(menuToggle).toBeInTheDocument();
  });

  test('should have correct order classes for mobile layout', () => {
    const { container } = renderWithProviders(<MainNavBar />);

    // Logo should be order-1
    const navbarBrand = container.querySelector('.navbar-brand');
    expect(navbarBrand).toHaveClass('order-1');

    // Hamburger should be order-3
    const menuToggle = container.querySelector('#navbar-menu-toggle');
    expect(menuToggle).toHaveClass('order-3');

    // MainNavActions should be in order-0 (appearing first on mobile)
    const mainNavActions = container.querySelector('.order-0');
    expect(mainNavActions).toBeInTheDocument();
  });
});
