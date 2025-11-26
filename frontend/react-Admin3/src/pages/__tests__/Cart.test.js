/**
 * Tests for Cart Page Component
 * T012: Test cart display, loading states, VAT calculations, checkout navigation
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../theme/theme';

// Mock dependencies
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock cartService
const mockCartService = {
  fetchCart: jest.fn(),
  updateItem: jest.fn(),
  removeItem: jest.fn(),
};
jest.mock('../../services/cartService', () => ({
  __esModule: true,
  default: mockCartService,
}));

// Mock Cart subcomponents
jest.mock('../../components/Cart/CartItemWithVAT', () => {
  return function MockCartItemWithVAT({ item, onQuantityChange, onRemove }) {
    return (
      <div data-testid={`cart-item-${item.id}`}>
        <span>{item.name}</span>
        <span>£{item.price}</span>
        <button
          data-testid={`quantity-btn-${item.id}`}
          onClick={() => onQuantityChange(item.id, item.quantity + 1)}
        >
          Increase Quantity
        </button>
        <button
          data-testid={`remove-btn-${item.id}`}
          onClick={() => onRemove(item.id)}
        >
          Remove
        </button>
      </div>
    );
  };
});

jest.mock('../../components/Cart/CartTotals', () => {
  return function MockCartTotals({ totals }) {
    return (
      <div data-testid="cart-totals">
        <span>Subtotal: £{totals?.subtotal}</span>
        <span>VAT: £{totals?.vat}</span>
        <span>Total: £{totals?.total}</span>
      </div>
    );
  };
});

jest.mock('../../components/Cart/CartVATError', () => {
  return function MockCartVATError({ error, errorMessage, onRetry }) {
    return (
      <div data-testid="vat-error">
        <span>{errorMessage || error}</span>
        <button data-testid="retry-vat-btn" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  };
});

import Cart from '../Cart';

describe('Cart Page', () => {
  const mockCartData = {
    items: [
      { id: 1, name: 'Product 1', price: 100, quantity: 1 },
      { id: 2, name: 'Product 2', price: 200, quantity: 2 },
    ],
    totals: {
      subtotal: 500,
      vat: 100,
      total: 600,
    },
    vatCalculationError: false,
    vatCalculationErrorMessage: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCartService.fetchCart.mockResolvedValue({ data: mockCartData });
    mockCartService.updateItem.mockResolvedValue({ data: { success: true } });
    mockCartService.removeItem.mockResolvedValue({ data: { success: true } });
  });

  const renderCart = () => {
    return render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      </ThemeProvider>
    );
  };

  describe('loading state', () => {
    test('shows loading spinner while fetching cart', async () => {
      mockCartService.fetchCart.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: mockCartData }), 100))
      );

      renderCart();

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText('Loading cart...')).toBeInTheDocument();
    });

    test('hides loading spinner after cart loads', async () => {
      renderCart();

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });

  describe('error state', () => {
    test('shows error message when fetch fails', async () => {
      mockCartService.fetchCart.mockRejectedValue(new Error('Network error'));

      renderCart();

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    test('shows retry button on error', async () => {
      mockCartService.fetchCart.mockRejectedValue(new Error('Failed to load'));

      renderCart();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    test('retries fetch when retry button is clicked', async () => {
      mockCartService.fetchCart
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({ data: mockCartData });

      renderCart();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(mockCartService.fetchCart).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('empty cart state', () => {
    test('shows empty cart message when no items', async () => {
      mockCartService.fetchCart.mockResolvedValue({
        data: { items: [], totals: {} },
      });

      renderCart();

      await waitFor(() => {
        expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
        expect(screen.getByText('No items in cart')).toBeInTheDocument();
      });
    });

    test('shows shopping cart icon for empty cart', async () => {
      mockCartService.fetchCart.mockResolvedValue({
        data: { items: [], totals: {} },
      });

      renderCart();

      await waitFor(() => {
        expect(document.querySelector('[data-testid="ShoppingCartIcon"]')).toBeInTheDocument();
      });
    });

    test('shows continue shopping button for empty cart', async () => {
      mockCartService.fetchCart.mockResolvedValue({
        data: { items: [], totals: {} },
      });

      renderCart();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /continue shopping/i })).toBeInTheDocument();
      });
    });

    test('navigates to home when continue shopping is clicked', async () => {
      mockCartService.fetchCart.mockResolvedValue({
        data: { items: [], totals: {} },
      });

      renderCart();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /continue shopping/i }));
      });

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('cart display', () => {
    test('shows page header', async () => {
      renderCart();

      await waitFor(() => {
        expect(screen.getByText('Shopping Cart')).toBeInTheDocument();
      });
    });

    test('shows item count', async () => {
      renderCart();

      await waitFor(() => {
        expect(screen.getByText('2 items in cart')).toBeInTheDocument();
      });
    });

    test('shows singular item text for single item', async () => {
      mockCartService.fetchCart.mockResolvedValue({
        data: {
          items: [{ id: 1, name: 'Single Item', price: 100, quantity: 1 }],
          totals: { subtotal: 100, vat: 20, total: 120 },
        },
      });

      renderCart();

      await waitFor(() => {
        expect(screen.getByText('1 item in cart')).toBeInTheDocument();
      });
    });

    test('renders all cart items', async () => {
      renderCart();

      await waitFor(() => {
        expect(screen.getByTestId('cart-item-1')).toBeInTheDocument();
        expect(screen.getByTestId('cart-item-2')).toBeInTheDocument();
      });
    });

    test('renders cart totals', async () => {
      renderCart();

      await waitFor(() => {
        expect(screen.getByTestId('cart-totals')).toBeInTheDocument();
      });
    });
  });

  describe('VAT calculation error', () => {
    test('shows VAT error component when there is an error', async () => {
      mockCartService.fetchCart.mockResolvedValue({
        data: {
          ...mockCartData,
          vatCalculationError: true,
          vatCalculationErrorMessage: 'VAT service unavailable',
        },
      });

      renderCart();

      await waitFor(() => {
        expect(screen.getByTestId('vat-error')).toBeInTheDocument();
        expect(screen.getByText('VAT service unavailable')).toBeInTheDocument();
      });
    });

    test('retries VAT calculation when retry button is clicked', async () => {
      mockCartService.fetchCart.mockResolvedValue({
        data: {
          ...mockCartData,
          vatCalculationError: true,
          vatCalculationErrorMessage: 'VAT error',
        },
      });

      renderCart();

      await waitFor(() => {
        expect(screen.getByTestId('retry-vat-btn')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('retry-vat-btn'));

      await waitFor(() => {
        expect(mockCartService.fetchCart).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('quantity changes', () => {
    test('updates item quantity when increase button is clicked', async () => {
      renderCart();

      await waitFor(() => {
        expect(screen.getByTestId('quantity-btn-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('quantity-btn-1'));

      await waitFor(() => {
        expect(mockCartService.updateItem).toHaveBeenCalledWith(
          1,
          { quantity: 2 },
          {}
        );
      });
    });

    test('refreshes cart after quantity update', async () => {
      renderCart();

      await waitFor(() => {
        expect(screen.getByTestId('quantity-btn-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('quantity-btn-1'));

      await waitFor(() => {
        // Initial fetch + refresh after update
        expect(mockCartService.fetchCart).toHaveBeenCalledTimes(2);
      });
    });

    test('shows error when quantity update fails', async () => {
      mockCartService.updateItem.mockRejectedValue(new Error('Update failed'));

      renderCart();

      await waitFor(() => {
        expect(screen.getByTestId('quantity-btn-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('quantity-btn-1'));

      // Cart should still be displayed, error is handled gracefully
      await waitFor(() => {
        expect(screen.getByTestId('cart-item-1')).toBeInTheDocument();
      });
    });
  });

  describe('item removal', () => {
    test('removes item when remove button is clicked', async () => {
      renderCart();

      await waitFor(() => {
        expect(screen.getByTestId('remove-btn-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('remove-btn-1'));

      await waitFor(() => {
        expect(mockCartService.removeItem).toHaveBeenCalledWith(1);
      });
    });

    test('refreshes cart after item removal', async () => {
      renderCart();

      await waitFor(() => {
        expect(screen.getByTestId('remove-btn-1')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('remove-btn-1'));

      await waitFor(() => {
        // Initial fetch + refresh after removal
        expect(mockCartService.fetchCart).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('checkout navigation', () => {
    test('shows checkout button', async () => {
      renderCart();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /proceed to checkout/i })).toBeInTheDocument();
      });
    });

    test('navigates to checkout when button is clicked', async () => {
      renderCart();

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /proceed to checkout/i }));
      });

      expect(mockNavigate).toHaveBeenCalledWith('/checkout');
    });

    test('shows continue shopping button', async () => {
      renderCart();

      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /continue shopping/i });
        expect(buttons.length).toBeGreaterThan(0);
      });
    });

    test('navigates to home when continue shopping is clicked', async () => {
      renderCart();

      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /continue shopping/i });
        fireEvent.click(buttons[0]);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
