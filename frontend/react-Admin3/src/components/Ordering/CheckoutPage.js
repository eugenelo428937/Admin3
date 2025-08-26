import React, { useState, useEffect, useMemo } from "react";
import { useCart } from "../../contexts/CartContext";
import { useNavigate } from "react-router-dom";
import cartService from "../../services/cartService";
import { Container, Alert } from "react-bootstrap";
import { useCheckoutStartRules, useCheckoutTermsRules, useCheckoutPreferenceRules, useCheckoutPaymentRules } from "../../hooks/useRulesEngine";
import CheckoutSteps from "./CheckoutSteps";

const CheckoutPage = () => {
  const { cartItems, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const navigate = useNavigate();

  // Rules Engine Integration for all checkout entry points - memoize context to prevent infinite loops
  const checkoutContext = useMemo(() => ({
    cart_items: cartItems,
    cart_total: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
    cart_count: cartItems.length,
    user_location: 'checkout_page'
  }), [cartItems]);
  
  const { 
    rulesResult: checkoutStartResult, 
    rulesCount: checkoutStartCount 
  } = useCheckoutStartRules(checkoutContext);
  
  const { 
    rulesResult: checkoutTermsResult, 
    rulesCount: checkoutTermsCount 
  } = useCheckoutTermsRules(checkoutContext);
  
  const { 
    rulesResult: checkoutPreferenceResult, 
    rulesCount: checkoutPreferenceCount 
  } = useCheckoutPreferenceRules(checkoutContext);
  
  const { 
    rulesResult: checkoutPaymentResult, 
    rulesCount: checkoutPaymentCount 
  } = useCheckoutPaymentRules(checkoutContext);

  const handleCheckoutComplete = async (paymentData = {}) => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await cartService.checkout(paymentData);
      
      // Check if the response includes order information
      const orderInfo = response.data;
      const orderNumber = orderInfo?.id ? `ORD-${String(orderInfo.id).padStart(6, '0')}` : 'your order';
      
      const successMessage = paymentData?.is_invoice 
        ? `Order placed successfully! An invoice will be sent to your email address. Order Number: ${orderNumber}`
        : `Order placed successfully! Thank you for your purchase. Order confirmation details have been sent to your email address. Order Number: ${orderNumber}`;
      
      setSuccess(successMessage);
      setCheckoutComplete(true);
      await clearCart();
      
      // Redirect to orders page after a delay to show the order
      setTimeout(() => navigate("/orders"), 3000);
    } catch (err) {
      console.error('Checkout error:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          'Failed to place order. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (checkoutComplete) {
    return (
      <Container className="mt-4">
        <Alert variant="success">
          <h4>Order Completed Successfully! 🎉</h4>
          <p>Thank you for your purchase. Your order has been processed and you should receive a confirmation email shortly.</p>
          <p>
            <strong>What's next?</strong>
            <br />
            • Check your email for order confirmation details
            <br />
            • You can view your order history in the Orders section
            <br />
            • If you have any questions, please contact our support team
          </p>
          <hr />
          <p className="mb-0">You will be redirected to your order history in a few seconds...</p>
        </Alert>
      </Container>
    );
  }

  if (cartItems.length === 0) {
    return <Container className="mt-4"><Alert variant="info">Your cart is empty.</Alert></Container>;
  }

  return (
    <Container className="mt-4">
      <h2>Checkout</h2>
      
      {/* Rules Engine Debug Panel */}
      <div style={{ 
        padding: '10px', 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6', 
        borderRadius: '4px',
        fontSize: '12px',
        color: '#495057',
        marginBottom: '15px'
      }}>
        <strong>🔧 Rules Engine Debug:</strong><br/>
        • checkout_start: {checkoutStartCount || 0} rules<br/>
        • checkout_terms: {checkoutTermsCount || 0} rules<br/>
        • checkout_preference: {checkoutPreferenceCount || 0} rules<br/>
        • checkout_payment: {checkoutPaymentCount || 0} rules<br/>
        Cart Items: {cartItems.length} | Total: ${checkoutContext.cart_total.toFixed(2)}
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <CheckoutSteps 
        onComplete={handleCheckoutComplete}
        rulesResults={{
          checkoutStart: checkoutStartResult,
          checkoutTerms: checkoutTermsResult,
          checkoutPreference: checkoutPreferenceResult,
          checkoutPayment: checkoutPaymentResult
        }}
      />
    </Container>
  );
};

export default CheckoutPage;
