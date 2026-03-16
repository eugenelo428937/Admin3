import React, { createContext, useContext, useState, useEffect } from "react";
import cartService from "../services/cartService.ts";
import { useConfig } from "./ConfigContext.js";
import type { CartItem, CartData, PriceInfo } from "../types/cart";

// ─── Context Value Interface ────────────────────────────────────

interface CartContextValue {
  cartItems: CartItem[];
  cartData: CartData | null;
  addToCart: (product: any, priceInfo?: PriceInfo) => Promise<void>;
  addVoucherToCart: (voucherId: number, quantity?: number) => Promise<any>;
  updateCartItem: (itemId: number, product: any, priceInfo?: PriceInfo) => Promise<any>;
  removeFromCart: (cartItemId: number) => Promise<any>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<any>;
  cartCount: number;
  loading: boolean;
}

// ─── Context ────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | undefined>(undefined);

// ─── Provider ───────────────────────────────────────────────────

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartData, setCartData] = useState<CartData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { isInternal, configLoaded } = useConfig();

  // Fetch cart from backend on mount (skip in internal mode)
  useEffect(() => {
    if (!configLoaded) return;

    if (isInternal) {
      setLoading(false);
      return;
    }

    const fetchCart = async () => {
      try {
        const res = await cartService.fetchCart();
        setCartData(res.data);
        setCartItems(res.data.items || []);
      } catch (err) {
        console.error('🛒 [CartContext] Error fetching cart:', err);
        setCartData(null);
        setCartItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCart();
  }, [configLoaded, isInternal]);

  const addToCart = async (product: any, priceInfo: PriceInfo = {}) => {
    try {
      // Extract quantity from priceInfo or metadata, default to 1
      const quantity = priceInfo.quantity || (priceInfo.metadata as any)?.quantity || 1;
      const res = await cartService.addToCart(product, quantity, priceInfo);

      // The backend should return the complete updated cart
      if (res.data && res.data.items) {
        setCartData(res.data);
        setCartItems(res.data.items);
      } else {
        console.error('🛒 [CartContext] Invalid response structure:', res.data);
      }
    } catch (err) {
      console.error('🛒 [CartContext] Error adding to cart:', err);
    }
  };

  const addVoucherToCart = async (voucherId: number, quantity: number = 1) => {
    try {
      const res = await cartService.addVoucherToCart(voucherId, quantity);

      // Refresh cart to get updated state
      await refreshCart();

      return res.data;
    } catch (err) {
      console.error('🛒 [CartContext] Error adding voucher to cart:', err);
      throw err;
    }
  };

  const updateCartItem = async (itemId: number, product: any, priceInfo: PriceInfo = {}) => {
    try {
      const res = await cartService.updateItem(itemId, product, priceInfo);

      if (res.data && res.data.items) {
        setCartData(res.data);
        setCartItems(res.data.items);
        return res.data;
      } else {
        console.error('🛒 [CartContext] Invalid response structure:', res.data);
      }
    } catch (err) {
      console.error('🛒 [CartContext] Error updating cart item:', err);
      throw err;
    }
  };

  const removeFromCart = async (cartItemId: number) => {
    try {
      const res = await cartService.removeItem(cartItemId);
      setCartData(res.data);
      setCartItems(res.data.items || []);
      return res.data;
    } catch (err) {
      console.error('Error removing cart item:', err);
      throw err;
    }
  };

  const clearCart = async () => {
    try {
      const res = await cartService.clearCart();
      setCartData(res.data);
      setCartItems(res.data.items || []);
    } catch (err) {
      // Optionally handle error
    }
  };

  const refreshCart = async () => {
    try {
      const res = await cartService.fetchCart();
      setCartData(res.data);
      setCartItems(res.data.items || []);
      return res.data;
    } catch (err) {
      console.error('🛒 [CartContext] Error refreshing cart:', err);
      throw err;
    }
  };

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <CartContext.Provider value={{ cartItems, cartData, addToCart, addVoucherToCart, updateCartItem, removeFromCart, clearCart, refreshCart, cartCount, loading }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
