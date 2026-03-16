import React from "react";
import { Container, Alert, Typography, Box } from "@mui/material";
import CheckoutSteps from "./CheckoutSteps.tsx";
import useCheckoutPageVM from './useCheckoutPageVM';

const CheckoutPage: React.FC = () => {
  const vm = useCheckoutPageVM();

  if (vm.checkoutComplete) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="success">
          <Typography variant="h5" component="h4" gutterBottom>
            Order Completed Successfully!
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

  if (vm.cartItems.length === 0) {
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

      {vm.error && <Alert severity="error" sx={{ mb: 2 }}>{vm.error}</Alert>}
      {vm.success && <Alert severity="success" sx={{ mb: 2 }}>{vm.success}</Alert>}

      <CheckoutSteps
        onComplete={vm.handleCheckoutComplete}
      />
    </Container>
  );
};

export default CheckoutPage;
