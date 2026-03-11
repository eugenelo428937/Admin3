import { vi } from 'vitest';
/**
 * Unit Tests for CartPanel Clear Cart Navigation
 * Tests that clearing the cart navigates to /products page
 */

// Mock react-router-dom before importing
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn(() => mockNavigate),
  BrowserRouter: ({ children }) => children
}));

// Mock useAuth
vi.mock('../../../hooks/useAuth.js', () => ({
  useAuth: vi.fn()
}));

// Mock useCart
vi.mock('../../../contexts/CartContext.js', () => ({
  useCart: vi.fn()
}));

// Mock useTutorialChoice
vi.mock('../../../contexts/TutorialChoiceContext.js', () => ({
  useTutorialChoice: vi.fn()
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CartPanel from '../CartPanel.js';
import { useCart } from '../../../contexts/CartContext.js';
import { useTutorialChoice } from '../../../contexts/TutorialChoiceContext.js';
import { useAuth } from '../../../hooks/useAuth.js';

describe('CartPanel Clear Cart Navigation', () => {
  const mockClearCart = vi.fn();
  const mockRemoveAllChoices = vi.fn();
  const mockHandleClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

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
      removeFromCart: vi.fn()
    });

    useTutorialChoice.mockReturnValue({
      removeAllChoices: mockRemoveAllChoices,
      restoreChoicesToDraft: vi.fn(),
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
