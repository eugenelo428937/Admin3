// src/components/Navigation/__tests__/TopNavBar.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TopNavBar from '../TopNavBar';
import { AuthProvider } from '../../../contexts/AuthContext';
import { CartProvider } from '../../../contexts/CartContext';

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
    cartCount: 0,
    refreshCart: jest.fn(),
  }),
  CartProvider: ({ children }) => <div>{children}</div>,
}));

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          {component}
        </CartProvider>
      </AuthProvider>
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
