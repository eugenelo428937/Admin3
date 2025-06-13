import React, { useState, useEffect } from "react";
import { useCart } from "../contexts/CartContext";
import { useNavigate } from "react-router-dom";
import cartService from "../services/cartService";
import { Container, Alert } from "react-bootstrap";
import rulesEngineService from "../services/rulesEngineService";
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

  const handleCheckoutComplete = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await cartService.checkout();
      setSuccess("Order placed successfully! Thank you for your purchase.");
      setCheckoutComplete(true);
      await clearCart();
      setTimeout(() => navigate("/products"), 2000);
    } catch (err) {
      setError("Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkoutComplete) {
    return (
      <Container className="mt-4">
        <Alert variant="success">Order placed successfully! Thank you for your purchase.</Alert>
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
