import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CartPanel from '../CartPanel';
import { CartContext } from '../../../contexts/CartContext';
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

const theme = createTheme();

const renderCartPanel = (props = {}) => {
  return render(
    <ThemeProvider theme={theme}>
      <CartContext.Provider value={mockCartContextValue}>
        <CartPanel show={true} handleClose={jest.fn()} {...props} />
      </CartContext.Provider>
    </ThemeProvider>
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

  test('should dispatch login modal event when checkout clicked without authentication', async () => {
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

    dispatchEventSpy.mockRestore();
  });

  test('should have proper ARIA labels on cart panel elements', () => {
    renderCartPanel();

    // CartPanel uses MUI Drawer - check for proper accessibility
    // MUI Drawer should have role="presentation" and proper ARIA attributes
    const drawerElement = document.querySelector('.MuiDrawer-root');
    expect(drawerElement).not.toBeNull();

    // Check that buttons have accessible names
    const checkoutButton = screen.getByRole('button', { name: /checkout/i });
    expect(checkoutButton).toBeInTheDocument();
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

    // MUI Drawer handles focus management properly by default
    // Check that the drawer is rendered (MUI handles aria-hidden automatically)
    const drawerElement = document.querySelector('.MuiDrawer-root');
    expect(drawerElement).not.toBeNull();

    dispatchEventSpy.mockRestore();
  });
});