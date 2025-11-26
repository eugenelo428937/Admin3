/**
 * Tests for CartContext
 *
 * Tests cart async operations including error handling scenarios.
 * Uses jest.unmock to test the real CartContext implementation
 * while keeping cartService mocked.
 */

// Unmock CartContext to test the real implementation
// This must be before any imports
jest.unmock('../CartContext');

// Mock cartService - this will override the setupTests.js mock for this file
jest.mock('../../services/cartService', () => ({
  __esModule: true,
  default: {
    fetchCart: jest.fn(() => Promise.resolve({
      data: {
        items: [],
        vat_calculations: { region_info: { region: 'UK' } }
      }
    })),
    addToCart: jest.fn(() => Promise.resolve({
      data: { items: [{ id: 1, quantity: 1 }] }
    })),
    updateItem: jest.fn(() => Promise.resolve({
      data: { items: [{ id: 1, quantity: 3 }] }
    })),
    removeItem: jest.fn(() => Promise.resolve({
      data: { items: [] }
    })),
    clearCart: jest.fn(() => Promise.resolve({
      data: { items: [] }
    })),
  },
}));

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { CartProvider, useCart } from '../CartContext';
import cartService from '../../services/cartService';

// Ref to store cart context for tests
let cartRef = null;

// Test component to access cart context
const TestConsumer = () => {
  const cart = useCart();
  cartRef = cart;

  return (
    <div>
      <span data-testid="loading">{cart.loading.toString()}</span>
      <span data-testid="cart-count">{cart.cartCount}</span>
      <span data-testid="items-count">{cart.cartItems.length}</span>
      {cart.cartData && (
        <span data-testid="cart-data">{JSON.stringify(cart.cartData)}</span>
      )}
    </div>
  );
};

describe('CartContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cartRef = null;

    // Reset default mock implementations
    cartService.fetchCart.mockResolvedValue({
      data: {
        items: [],
        vat_calculations: { region_info: { region: 'UK' } }
      }
    });
    cartService.addToCart.mockResolvedValue({
      data: { items: [{ id: 1, quantity: 1 }] }
    });
    cartService.updateItem.mockResolvedValue({
      data: { items: [{ id: 1, quantity: 3 }] }
    });
    cartService.removeItem.mockResolvedValue({
      data: { items: [] }
    });
    cartService.clearCart.mockResolvedValue({
      data: { items: [] }
    });
  });

  describe('Initial Cart Fetch', () => {
    it('should fetch cart on mount', async () => {
      render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      // Wait for fetch to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      // Verify fetchCart was called
      expect(cartService.fetchCart).toHaveBeenCalledTimes(1);
    });

    it('should handle cart fetch error gracefully', async () => {
      cartService.fetchCart.mockRejectedValueOnce(new Error('Network error'));

      render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      // Cart should be empty on error
      expect(screen.getByTestId('items-count').textContent).toBe('0');
      expect(screen.getByTestId('cart-count').textContent).toBe('0');
    });

    it('should handle empty cart response', async () => {
      render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('items-count').textContent).toBe('0');
      expect(screen.getByTestId('cart-count').textContent).toBe('0');
    });
  });

  describe('Add to Cart', () => {
    it('should handle add to cart error', async () => {
      cartService.addToCart.mockRejectedValueOnce(new Error('Server error'));

      render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      // Attempt to add to cart (should not throw, just log error)
      await act(async () => {
        await cartRef.addToCart({ id: 'PROD1' }, {});
      });

      // Cart should remain unchanged
      expect(screen.getByTestId('items-count').textContent).toBe('0');
    });

    it('should handle invalid response structure', async () => {
      cartService.addToCart.mockResolvedValueOnce({ data: {} }); // Missing items

      render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        await cartRef.addToCart({ id: 'PROD1' }, {});
      });

      // Cart should remain unchanged due to invalid response
      expect(screen.getByTestId('items-count').textContent).toBe('0');
    });

    it('should call addToCart service with correct parameters', async () => {
      render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        await cartRef.addToCart(
          { id: 'PROD1', essp_id: 'ESSP001' },
          { priceType: 'standard', actualPrice: 49.99 }
        );
      });

      expect(cartService.addToCart).toHaveBeenCalledWith(
        { id: 'PROD1', essp_id: 'ESSP001' },
        1,
        { priceType: 'standard', actualPrice: 49.99 }
      );
    });
  });

  describe('Update Cart Item', () => {
    it('should call updateItem service with correct parameters', async () => {
      render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        await cartRef.updateCartItem(
          1,
          { quantity: 3 },
          { priceType: 'standard', actualPrice: 49.99 }
        );
      });

      expect(cartService.updateItem).toHaveBeenCalledWith(
        1,
        { quantity: 3 },
        { priceType: 'standard', actualPrice: 49.99 }
      );
    });

    it('should throw error on update failure', async () => {
      cartService.updateItem.mockRejectedValueOnce(new Error('Update failed'));

      render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await expect(
        cartRef.updateCartItem(1, { quantity: 3 }, {})
      ).rejects.toThrow('Update failed');
    });
  });

  describe('Remove from Cart', () => {
    it('should call removeItem service with correct itemId', async () => {
      render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        await cartRef.removeFromCart(1);
      });

      expect(cartService.removeItem).toHaveBeenCalledWith(1);
    });

    it('should throw error on remove failure', async () => {
      cartService.removeItem.mockRejectedValueOnce(new Error('Remove failed'));

      render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await expect(
        cartRef.removeFromCart(1)
      ).rejects.toThrow('Remove failed');
    });
  });

  describe('Clear Cart', () => {
    it('should call clearCart service', async () => {
      render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      await act(async () => {
        await cartRef.clearCart();
      });

      expect(cartService.clearCart).toHaveBeenCalled();
    });

    it('should handle clear cart error silently', async () => {
      cartService.clearCart.mockRejectedValueOnce(new Error('Clear failed'));

      render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      // Should not throw
      await act(async () => {
        await cartRef.clearCart();
      });

      // Test passes if no error thrown
      expect(cartService.clearCart).toHaveBeenCalled();
    });
  });

  describe('Refresh Cart', () => {
    it('should call fetchCart on refresh', async () => {
      render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      // Clear mock to test refresh call specifically
      cartService.fetchCart.mockClear();

      await act(async () => {
        await cartRef.refreshCart();
      });

      expect(cartService.fetchCart).toHaveBeenCalledTimes(1);
    });

    it('should throw error on refresh failure', async () => {
      render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      cartService.fetchCart.mockRejectedValueOnce(new Error('Refresh failed'));

      await expect(
        cartRef.refreshCart()
      ).rejects.toThrow('Refresh failed');
    });
  });

  describe('Context Provider', () => {
    it('should expose all cart methods', async () => {
      render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      // Verify all methods are available
      expect(typeof cartRef.addToCart).toBe('function');
      expect(typeof cartRef.updateCartItem).toBe('function');
      expect(typeof cartRef.removeFromCart).toBe('function');
      expect(typeof cartRef.clearCart).toBe('function');
      expect(typeof cartRef.refreshCart).toBe('function');
    });

    it('should expose cart state', async () => {
      render(
        <CartProvider>
          <TestConsumer />
        </CartProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      // Verify state properties are available
      expect(Array.isArray(cartRef.cartItems)).toBe(true);
      expect(typeof cartRef.cartCount).toBe('number');
      expect(typeof cartRef.loading).toBe('boolean');
    });
  });
});
