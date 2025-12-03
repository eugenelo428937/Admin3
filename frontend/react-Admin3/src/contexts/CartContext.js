import React, { createContext, useContext, useState, useEffect } from "react";
import cartService from "../services/cartService";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartData, setCartData] = useState(null); // Store full cart object
  const [loading, setLoading] = useState(true);

  // Fetch cart from backend on mount
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const res = await cartService.fetchCart();

        setCartData(res.data); // Store full cart object
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
  }, []);
  const addToCart = async (product, priceInfo = {}) => {
    try {
      // Extract quantity from priceInfo or metadata, default to 1
      const quantity = priceInfo.quantity || priceInfo.metadata?.quantity || 1;
      const res = await cartService.addToCart(product, quantity, priceInfo);

      // The backend should return the complete updated cart
      if (res.data && res.data.items) {
        setCartData(res.data); // Store full cart object
        setCartItems(res.data.items);
      } else {
        console.error('🛒 [CartContext] Invalid response structure:', res.data);
      }
    } catch (err) {
      console.error('🛒 [CartContext] Error adding to cart:', err);
    }
  };

  /**
   * Add a marking voucher to cart
   * Uses dedicated voucher endpoint that expects voucher_id
   * @param {number} voucherId - The marking voucher ID
   * @param {number} quantity - Number of vouchers to add
   */
  const addVoucherToCart = async (voucherId, quantity = 1) => {
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

  /**
   * Update an existing cart item
   * Used for tutorial cart integration to merge choices into existing item
   * @param {number} itemId - Cart item ID to update
   * @param {Object} product - Updated product data
   * @param {Object} priceInfo - Updated price information with metadata
   */
  const updateCartItem = async (itemId, product, priceInfo = {}) => {
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

  const removeFromCart = async (cartItemId) => {
    // Remove cart item by cart item ID
    try {
      const res = await cartService.removeItem(cartItemId);
      setCartData(res.data); // Store full cart object
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
      setCartData(res.data); // Store full cart object
      setCartItems(res.data.items || []);
    } catch (err) {
      // Optionally handle error
    }
  };

  const refreshCart = async () => {
    try {
      const res = await cartService.fetchCart();

      setCartData(res.data); // Store full cart object
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

export const useCart = () => useContext(CartContext);
