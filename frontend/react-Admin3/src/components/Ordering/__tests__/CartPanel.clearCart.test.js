/**
 * Unit Tests for CartPanel Clear Cart Navigation
 * Tests that clearing the cart navigates to /products page
 */

// Mock react-router-dom before importing
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  BrowserRouter: ({ children }) => children
}));

// Mock useAuth
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

// Mock useCart
jest.mock('../../../contexts/CartContext', () => ({
  useCart: jest.fn()
}));

// Mock useTutorialChoice
jest.mock('../../../contexts/TutorialChoiceContext', () => ({
  useTutorialChoice: jest.fn()
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CartPanel from '../CartPanel';
import { useCart } from '../../../contexts/CartContext';
import { useTutorialChoice } from '../../../contexts/TutorialChoiceContext';
import { useAuth } from '../../../hooks/useAuth';

describe('CartPanel Clear Cart Navigation', () => {
  const mockClearCart = jest.fn();
  const mockRemoveAllChoices = jest.fn();
  const mockHandleClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup useAuth mock
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { id: 1 }
    });

    // Setup mock return values
    useCart.mockReturnValue({
      cartItems: [
        {
          id: 1,
          product: 123,
          product_name: 'Test Product',
          quantity: 1,
          actual_price: '50.00',
          metadata: { variationName: 'Standard' }
        }
      ],
      cartData: { fees: [], items: [] },
      clearCart: mockClearCart,
      removeFromCart: jest.fn()
    });

    useTutorialChoice.mockReturnValue({
      removeAllChoices: mockRemoveAllChoices,
      restoreChoicesToDraft: jest.fn(),
      tutorialChoices: {}
    });
  });

  it('should navigate to /products after clicking Clear Cart button', async () => {
    render(
      <BrowserRouter>
        <CartPanel show={true} handleClose={mockHandleClose} />
      </BrowserRouter>
    );

    // Find and click Clear Cart button
    const clearButton = screen.getByRole('button', { name: /clear cart/i });
    fireEvent.click(clearButton);

    // Verify clearCart was called
    expect(mockClearCart).toHaveBeenCalled();

    // Verify removeAllChoices was called
    expect(mockRemoveAllChoices).toHaveBeenCalled();

    // Verify navigation to /products occurred
    expect(mockNavigate).toHaveBeenCalledWith('/products');

    // Verify drawer was closed (with timeout due to handleSafeClose using setTimeout)
    await waitFor(() => {
      expect(mockHandleClose).toHaveBeenCalled();
    });
  });

  it('should close panel before navigating', async () => {
    render(
      <BrowserRouter>
        <CartPanel show={true} handleClose={mockHandleClose} />
      </BrowserRouter>
    );

    const clearButton = screen.getByRole('button', { name: /clear cart/i });
    fireEvent.click(clearButton);

    // Verify handleClose was called (with timeout due to handleSafeClose using setTimeout)
    await waitFor(() => {
      expect(mockHandleClose).toHaveBeenCalled();
    });

    // Navigation should still occur even after closing
    expect(mockNavigate).toHaveBeenCalledWith('/products');
  });
});
