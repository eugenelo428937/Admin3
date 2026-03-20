import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext.tsx';
import { useTutorialChoice } from '../../contexts/TutorialChoiceContext';
import cartService from '../../services/cartService.ts';
import type { CartItem } from '../../types/cart';
import type { CheckoutPaymentData } from '../../types/checkout';

export interface CheckoutPageVM {
  cartItems: CartItem[];
  loading: boolean;
  success: string;
  error: string;
  checkoutComplete: boolean;
  handleCheckoutComplete: (paymentData?: CheckoutPaymentData) => Promise<void>;
}

const useCheckoutPageVM = (): CheckoutPageVM => {
  const { cartItems, clearCart } = useCart();
  const { removeAllChoices } = useTutorialChoice();
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [checkoutComplete, setCheckoutComplete] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleCheckoutComplete = async (paymentData: CheckoutPaymentData | Record<string, any> = {}) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await cartService.checkout(paymentData);

      const orderInfo = response.data;
      const orderNumber = orderInfo?.id ? `ORD-${String(orderInfo.id).padStart(6, '0')}` : 'your order';

      const successMessage = (paymentData as any)?.is_invoice
        ? `Order placed successfully! An invoice will be sent to your email address. Order Number: ${orderNumber}`
        : `Order placed successfully! Thank you for your purchase. Order confirmation details have been sent to your email address. Order Number: ${orderNumber}`;

      setSuccess(successMessage);
      setCheckoutComplete(true);

      removeAllChoices();
      await clearCart();
    } catch (err: any) {
      console.error('Checkout error:', err);
      const errorMessage = err.response?.data?.detail ||
                          err.response?.data?.message ||
                          'Failed to place order. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    cartItems: cartItems as CartItem[],
    loading,
    success,
    error,
    checkoutComplete,
    handleCheckoutComplete,
  };
};

export default useCheckoutPageVM;
