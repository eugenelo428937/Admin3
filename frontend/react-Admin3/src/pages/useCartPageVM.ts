import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import cartService from '../services/cartService.ts';
import type { CartData } from '../types/cart';

export interface CartPageVM {
  loading: boolean;
  error: string | null;
  cartData: CartData | null;
  fetchCartData: () => Promise<void>;
  handleQuantityChange: (itemId: number, newQuantity: number) => Promise<void>;
  handleRemoveItem: (itemId: number) => Promise<void>;
  handleRetryVAT: () => Promise<void>;
  handleCheckout: () => void;
  handleContinueShopping: () => void;
}

const useCartPageVM = (): CartPageVM => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [cartData, setCartData] = useState<CartData | null>(null);

  const fetchCartData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await cartService.fetchCart();
      setCartData(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load cart data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCartData();
  }, [fetchCartData]);

  const handleQuantityChange = useCallback(async (itemId: number, newQuantity: number) => {
    try {
      const item = cartData?.items.find(i => i.id === itemId);
      if (!item) return;
      await cartService.updateItem(itemId, { quantity: newQuantity }, {});
      await fetchCartData();
    } catch (err) {
      setError('Failed to update item quantity');
    }
  }, [cartData, fetchCartData]);

  const handleRemoveItem = useCallback(async (itemId: number) => {
    try {
      await cartService.removeItem(itemId);
      await fetchCartData();
    } catch (err) {
      setError('Failed to remove item');
    }
  }, [fetchCartData]);

  const handleRetryVAT = useCallback(async () => {
    await fetchCartData();
  }, [fetchCartData]);

  const handleCheckout = useCallback(() => {
    navigate('/checkout');
  }, [navigate]);

  const handleContinueShopping = useCallback(() => {
    navigate('/');
  }, [navigate]);

  return {
    loading,
    error,
    cartData,
    fetchCartData,
    handleQuantityChange,
    handleRemoveItem,
    handleRetryVAT,
    handleCheckout,
    handleContinueShopping,
  };
};

export default useCartPageVM;
