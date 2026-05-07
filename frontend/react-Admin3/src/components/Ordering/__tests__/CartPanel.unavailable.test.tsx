import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CartPanel from '../CartPanel';
import type { CartItem } from '../../../types/cart';

/**
 * Task 14: 'No longer available' badge in the cart drawer/panel
 *
 * Backend Task 11 added is_available: bool to CartItemSerializer. When false,
 * the cart UI must surface a clearly-visible warning so the customer knows to
 * remove the item before checkout.
 */

// Mock react-router-dom (required transitively by useCartPanelVM)
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock useCartPanelVM directly so we don't need to wire up CartProvider,
// TutorialChoiceProvider, ConfigProvider, AuthProvider, etc.
vi.mock('../useCartPanelVM', () => ({
  __esModule: true,
  default: (_handleClose?: () => void) => ({
    cartItems: [
      {
        id: 1,
        product_name: 'Inactive Material',
        product_code: 'CB1/PC/2025-04',
        quantity: 1,
        actual_price: '10.00',
        is_available: false,
        metadata: {},
      } as CartItem,
      {
        id: 2,
        product_name: 'Active Material',
        product_code: 'CB1/PE/2025-04',
        quantity: 1,
        actual_price: '12.00',
        is_available: true,
        metadata: {},
      } as CartItem,
    ],
    cartData: { fees: [] },
    isAuthenticated: false,
    handleSafeClose: vi.fn(),
    handleRemoveItem: vi.fn(),
    handleClearCart: vi.fn(),
    handleCheckout: vi.fn(),
    getItemPriceDisplay: () => '£10.00',
    formatPrice: (n: number) => `£${n.toFixed(2)}`,
  }),
}));

describe('CartPanel — unavailable item badge', () => {
  it('renders "No longer available" badge for items with is_available=false', () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <CartPanel show={true} handleClose={() => {}} />
      </ThemeProvider>
    );

    // Badge appears for the inactive item
    expect(screen.getByText(/no longer available/i)).toBeInTheDocument();
  });

  it('renders both items but only one badge (one inactive, one active)', () => {
    render(
      <ThemeProvider theme={createTheme()}>
        <CartPanel show={true} handleClose={() => {}} />
      </ThemeProvider>
    );

    expect(screen.getByText('Inactive Material')).toBeInTheDocument();
    expect(screen.getByText('Active Material')).toBeInTheDocument();

    // Exactly one "No longer available" chip rendered
    const badges = screen.getAllByText(/no longer available/i);
    expect(badges).toHaveLength(1);
  });
});
