import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext.tsx';
import { useTutorialChoice } from '../../contexts/TutorialChoiceContext.js';
import { useAuth } from '../../hooks/useAuth.tsx';
import type { CartItem, CartData } from '../../types/cart';

export interface CartPanelVM {
  cartItems: CartItem[];
  cartData: CartData | null;
  isAuthenticated: boolean;
  handleSafeClose: () => void;
  handleRemoveItem: (item: CartItem) => void;
  handleClearCart: () => void;
  handleCheckout: () => void;
  getItemPriceDisplay: (item: CartItem) => string;
  formatPrice: (amount: number) => string;
}

const useCartPanelVM = (handleClose?: () => void): CartPanelVM => {
  const { cartItems, cartData, clearCart, removeFromCart } = useCart();
  const { removeAllChoices, restoreChoicesToDraft } = useTutorialChoice();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const formatPrice = useCallback((amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }, []);

  const handleSafeClose = useCallback(() => {
    if (document.activeElement && (document.activeElement as HTMLElement).closest('.offcanvas')) {
      (document.activeElement as HTMLElement).blur();
    }
    setTimeout(() => {
      handleClose && handleClose();
    }, 0);
  }, [handleClose]);

  const handleRemoveItem = useCallback((item: CartItem) => {
    const subjectCode = item.subject_code || item.metadata?.subjectCode;
    if (item.product_type === 'tutorial' && subjectCode) {
      restoreChoicesToDraft(subjectCode);
    }
    removeFromCart(item.id);
  }, [removeFromCart, restoreChoicesToDraft]);

  const handleClearCart = useCallback(() => {
    removeAllChoices();
    clearCart();
    handleSafeClose();
    navigate('/products');
  }, [removeAllChoices, clearCart, handleSafeClose, navigate]);

  const handleCheckout = useCallback(() => {
    if (!isAuthenticated) {
      localStorage.setItem("postLoginRedirect", "/checkout");
      handleSafeClose();
      window.dispatchEvent(new CustomEvent("show-login-modal"));
    } else {
      handleSafeClose();
      navigate("/checkout");
    }
  }, [isAuthenticated, handleSafeClose, navigate]);

  const getItemPriceDisplay = useMemo(() => {
    return (item: CartItem): string => {
      const itemPrice = parseFloat(String(item.actual_price)) || 0;
      return formatPrice(itemPrice);
    };
  }, [formatPrice]);

  return {
    cartItems: cartItems as CartItem[],
    cartData,
    isAuthenticated,
    handleSafeClose,
    handleRemoveItem,
    handleClearCart,
    handleCheckout,
    getItemPriceDisplay,
    formatPrice,
  };
};

export default useCartPanelVM;
