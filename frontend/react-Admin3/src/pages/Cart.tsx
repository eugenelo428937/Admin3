import React from 'react';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  List,
  Paper
} from '@mui/material';
import { ShoppingCart as CartIcon } from '@mui/icons-material';
import CartItemWithVAT from '../components/Cart/CartItemWithVAT.tsx';
import CartTotals from '../components/Cart/CartTotals.tsx';
import CartVATError from '../components/Cart/CartVATError.tsx';
import useCartPageVM from './useCartPageVM';

const Cart: React.FC = () => {
  const vm = useCartPageVM();

  // Loading state
  if (vm.loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Loading cart...
        </Typography>
      </Container>
    );
  }

  // Error state
  if (vm.error && !vm.cartData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {vm.error}
        </Alert>
        <Button
          variant="contained"
          onClick={vm.fetchCartData}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Container>
    );
  }

  // Empty cart state
  if (!vm.cartData || !vm.cartData.items || vm.cartData.items.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CartIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Your cart is empty
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          No items in cart
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={vm.handleContinueShopping}
        >
          Continue Shopping
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Shopping Cart
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {vm.cartData.items.length} {vm.cartData.items.length === 1 ? 'item' : 'items'} in cart
        </Typography>
      </Box>

      {/* VAT Calculation Error */}
      {vm.cartData.vatCalculationError && (
        <CartVATError
          error={vm.cartData.vatCalculationError}
          errorMessage={vm.cartData.vatCalculationErrorMessage}
          onRetry={vm.handleRetryVAT}
        />
      )}

      {/* Cart Items List */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <List disablePadding>
          {vm.cartData.items.map((item) => (
            <CartItemWithVAT
              key={item.id}
              item={item}
              onQuantityChange={vm.handleQuantityChange}
              onRemove={vm.handleRemoveItem}
            />
          ))}
        </List>
      </Paper>

      {/* Cart Totals */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ flex: { xs: 1, md: 0.4 } }}>
          <CartTotals totals={(vm.cartData as any).totals} />
          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            onClick={vm.handleCheckout}
            sx={{ mt: 2 }}
          >
            Proceed to Checkout
          </Button>
          <Button
            variant="outlined"
            size="medium"
            fullWidth
            onClick={vm.handleContinueShopping}
            sx={{ mt: 1 }}
          >
            Continue Shopping
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Cart;
