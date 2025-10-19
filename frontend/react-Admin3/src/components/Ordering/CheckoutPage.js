import React, { useState, useEffect, useMemo } from "react";
import { useCart } from "../../contexts/CartContext";
import { useTutorialChoice } from "../../contexts/TutorialChoiceContext";
import { useNavigate } from "react-router-dom";
import cartService from "../../services/cartService";
import { Container, Alert, Typography, Box } from "@mui/material";
import CheckoutSteps from "./CheckoutSteps";

const CheckoutPage = () => {
  const { cartItems, clearCart } = useCart();
  const { removeAllChoices } = useTutorialChoice();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const navigate = useNavigate();


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

      // Clear cart and remove all tutorial choices after successful checkout
      removeAllChoices();
      await clearCart();

      // Redirect to orders page after a delay to show the order
      //setTimeout(() => navigate("/orders"), 3000);
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
      <Container sx={{ mt: 4 }}>
        <Alert severity="success">
          <Typography variant="h5" component="h4" gutterBottom>
            Order Completed Successfully! 🎉
          </Typography>
          <Typography variant="body1" paragraph>
            Thank you for your purchase. Your order has been processed and you should receive a confirmation email shortly.
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" component="strong" sx={{ fontWeight: 'bold' }}>
              What's next?
            </Typography>
            <Typography variant="body2" component="div" sx={{ mt: 1 }}>
              • Check your email for order confirmation details<br />
              • You can view your order history in the Orders section<br />
              • If you have any questions, please contact our support team
            </Typography>
          </Box>
          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Typography variant="body2">
              You will be redirected to your order history in a few seconds...
            </Typography>
          </Box>
        </Alert>
      </Container>
    );
  }

  if (cartItems.length === 0) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="info">Your cart is empty.</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" component="h2" gutterBottom>
        Checkout
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <CheckoutSteps
        onComplete={handleCheckoutComplete}
      />
    </Container>
  );
};

export default CheckoutPage;
