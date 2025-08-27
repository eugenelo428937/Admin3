import React, { createContext, useContext, useState, useEffect } from "react";
import cartService from "../services/cartService";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch cart from backend on mount
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const res = await cartService.fetchCart();
        
        
        setCartItems(res.data.items || []);
      } catch (err) {
        console.error('🛒 [CartContext] Error fetching cart:', err);
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
        setCartItems(res.data.items);
      } else {
        console.error('🛒 [CartContext] Invalid response structure:', res.data);
      }
    } catch (err) {
      console.error('🛒 [CartContext] Error adding to cart:', err);
    }
  };

  const removeFromCart = async (productId) => {
    // Find the cart item by productId
    const item = cartItems.find((i) => i.product === productId);
    if (!item) return;
    try {
      const res = await cartService.removeItem(item.id);
      setCartItems(res.data.items || []);
    } catch (err) {
      // Optionally handle error
    }
  };

  const clearCart = async () => {
    try {
      const res = await cartService.clearCart();
      setCartItems(res.data.items || []);
    } catch (err) {
      // Optionally handle error
    }
  };

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart, cartCount, loading }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
