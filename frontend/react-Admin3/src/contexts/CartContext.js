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
      const res = await cartService.addToCart(product, 1, priceInfo);

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

  const removeFromCart = async (productId) => {
    // Find the cart item by productId
    const item = cartItems.find((i) => i.product === productId);
    if (!item) return;
    try {
      const res = await cartService.removeItem(item.id);
      setCartData(res.data); // Store full cart object
      setCartItems(res.data.items || []);
    } catch (err) {
      // Optionally handle error
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
    <CartContext.Provider value={{ cartItems, cartData, addToCart, updateCartItem, removeFromCart, clearCart, refreshCart, cartCount, loading }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
