import React, { useState, useEffect } from "react";
import { useCart } from "../../contexts/CartContext";
import { useNavigate } from "react-router-dom";
import cartService from "../../services/cartService";
import { Container, Alert } from "react-bootstrap";
import rulesEngineService from "../../services/rulesEngineService";
import CheckoutSteps from "./CheckoutSteps";

const CheckoutPage = () => {
  const { cartItems, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [rulesMessages, setRulesMessages] = useState([]);
  const navigate = useNavigate();

  // Evaluate checkout rules when component mounts
  useEffect(() => {
    const evaluateCheckoutRules = async () => {
      if (cartItems.length > 0) {
        try {
          const result = await rulesEngineService.validateCheckout();
          if (result.success) {
            // Convert acknowledgments to messages if there are any
            const messages = result.messages || [];
            if (result.acknowledgments && result.acknowledgments.length > 0) {
              // Add acknowledgment messages to the messages array
              result.acknowledgments.forEach(ack => {
                messages.push({
                  type: 'acknowledgment',
                  message_type: 'terms',
                  title: 'Terms and Conditions',
                  content: 'Please review and acknowledge the terms and conditions to proceed with your order.',
                  requires_acknowledgment: true,
                  rule_id: ack.rule_id,
                  template_id: ack.template_id
                });
              });
            }
            setRulesMessages(messages);
          }
        } catch (err) {
          console.error("Error evaluating checkout rules:", err);
        }
      }
    };

    evaluateCheckoutRules();
  }, [cartItems]);

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
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      
      <CheckoutSteps 
        onComplete={handleCheckoutComplete}
        rulesMessages={rulesMessages}
      />
    </Container>
  );
};

export default CheckoutPage;
