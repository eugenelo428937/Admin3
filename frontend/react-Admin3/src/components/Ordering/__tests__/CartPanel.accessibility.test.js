import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CartPanel from '../CartPanel';
import { CartContext } from '../../../contexts/CartContext';
import { VATContext } from '../../../contexts/VATContext';
import { useAuth } from '../../../hooks/useAuth';

// Mock dependencies
jest.mock('../../../hooks/useAuth');
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn()
}));

// Mock cart context values
const mockCartContextValue = {
  cartItems: [],
  cartData: { fees: [] },
  clearCart: jest.fn(),
  removeFromCart: jest.fn()
};

// Mock VAT context values
const mockVATContextValue = {
  getPriceDisplay: jest.fn(() => ({ netPrice: 10, vatAmount: 2, displayPrice: 12, label: 'inc. VAT' })),
  formatPrice: jest.fn((price) => `£${price.toFixed(2)}`),
  isProductVATExempt: jest.fn(() => false),
  showVATInclusive: true
};

const renderCartPanel = (props = {}) => {
  return render(
    <CartContext.Provider value={mockCartContextValue}>
      <VATContext.Provider value={mockVATContextValue}>
        <CartPanel show={true} handleClose={jest.fn()} {...props} />
      </VATContext.Provider>
    </CartContext.Provider>
  );
};

describe('CartPanel Accessibility', () => {
  beforeEach(() => {
    // Mock useAuth to return unauthenticated user
    useAuth.mockReturnValue({
      isAuthenticated: false,
      user: null
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  test('should NOT have aria-hidden=true when login modal is triggered from checkout', async () => {
    // Mock window.dispatchEvent to track custom events
    const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');

    // Render CartPanel
    renderCartPanel();

    // Find and click the checkout button
    const checkoutButton = screen.getByRole('button', { name: /checkout/i });
    fireEvent.click(checkoutButton);

    // Verify that show-login-modal event was dispatched
    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'show-login-modal'
      })
    );

    // Check that the offcanvas does NOT have aria-hidden="true" when it should be accessible
    const offcanvasElement = document.querySelector('.offcanvas');
    expect(offcanvasElement).not.toBeNull();

    // This test should FAIL initially - we expect aria-hidden to be "false" or null when the modal is open
    // but currently it's set to "true" causing the accessibility issue
    expect(offcanvasElement.getAttribute('aria-hidden')).not.toBe('true');

    dispatchEventSpy.mockRestore();
  });

  test('should properly manage focus when login modal is shown from cart panel', async () => {
    // Mock window.dispatchEvent
    const dispatchEventSpy = jest.spyOn(window, 'dispatchEvent');

    renderCartPanel();

    // Click checkout to trigger login modal
    const checkoutButton = screen.getByRole('button', { name: /checkout/i });
    fireEvent.click(checkoutButton);

    // Wait for event to be dispatched
    await waitFor(() => {
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'show-login-modal'
        })
      );
    });

    // Check that when a modal is triggered, the offcanvas should not block assistive technology
    const offcanvasElement = document.querySelector('.offcanvas');

    // The offcanvas should either:
    // 1. Not have aria-hidden="true" when a child modal is open, OR
    // 2. Be properly hidden if the modal takes over completely
    // Currently this fails because Bootstrap sets aria-hidden="true" even when child modals are active
    const ariaHidden = offcanvasElement.getAttribute('aria-hidden');
    expect(ariaHidden).not.toBe('true');

    dispatchEventSpy.mockRestore();
  });
});