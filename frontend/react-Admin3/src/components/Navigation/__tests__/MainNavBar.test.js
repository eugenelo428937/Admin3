// src/components/Navigation/__tests__/MainNavBar.test.js
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
    cartCount: 0,
    refreshCart: jest.fn(),
  }),
}));

const store = configureStore({
  reducer: {
    filters: filtersReducer,
  },
});

const renderWithProviders = (component) => {
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
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
