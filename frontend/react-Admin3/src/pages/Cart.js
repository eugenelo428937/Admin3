/**
 * Cart Page Component (Phase 4, Task T047)
 *
 * Displays shopping cart with VAT calculations:
 * - Fetches cart data from API
 * - Renders cart items with VAT display
 * - Shows cart totals with VAT breakdown
 * - Displays VAT calculation errors with retry
 * - Handles quantity changes and item removal
 */
import React, { useState, useEffect } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { ShoppingCart as CartIcon } from '@mui/icons-material';
import CartItemWithVAT from '../components/Cart/CartItemWithVAT';
import CartTotals from '../components/Cart/CartTotals';
import CartVATError from '../components/Cart/CartVATError';
import cartService from '../services/cartService';

const Cart = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cartData, setCartData] = useState(null);

  /**
   * Fetch cart data from API
   */
  const fetchCartData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await cartService.fetchCart();
      setCartData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load cart data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load cart data on mount
   */
  useEffect(() => {
    fetchCartData();
  }, []);

  /**
   * Handle quantity change for cart item
   */
  const handleQuantityChange = async (itemId, newQuantity) => {
    try {
      // Find the item to get product details
      const item = cartData.items.find(i => i.id === itemId);
      if (!item) return;

      await cartService.updateItem(itemId, { quantity: newQuantity }, {});

      // Refresh cart data
      await fetchCartData();
    } catch (err) {
      setError('Failed to update item quantity');
    }
  };

  /**
   * Handle item removal from cart
   */
  const handleRemoveItem = async (itemId) => {
    try {
      await cartService.removeItem(itemId);

      // Refresh cart data
      await fetchCartData();
    } catch (err) {
      setError('Failed to remove item');
    }
  };

  /**
   * Handle VAT recalculation retry
   */
  const handleRetryVAT = async () => {
    // For now, just refresh cart data
    // In full implementation, would call specific recalculate endpoint
    await fetchCartData();
  };

  /**
   * Handle checkout navigation
   */
  const handleCheckout = () => {
    navigate('/checkout');
  };

  // Loading state
  if (loading) {
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
  if (error && !cartData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={fetchCartData}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Container>
    );
  }

  // Empty cart state
  if (!cartData || !cartData.items || cartData.items.length === 0) {
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
          onClick={() => navigate('/')}
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
          {cartData.items.length} {cartData.items.length === 1 ? 'item' : 'items'} in cart
        </Typography>
      </Box>

      {/* VAT Calculation Error */}
      {cartData.vatCalculationError && (
        <CartVATError
          error={cartData.vatCalculationError}
          errorMessage={cartData.vatCalculationErrorMessage}
          onRetry={handleRetryVAT}
        />
      )}

      {/* Cart Items List */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <List disablePadding>
          {cartData.items.map((item) => (
            <CartItemWithVAT
              key={item.id}
              item={item}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemoveItem}
            />
          ))}
        </List>
      </Paper>

      {/* Cart Totals */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Spacer for layout */}
        <Box sx={{ flex: 1 }} />

        {/* Totals Section */}
        <Box sx={{ flex: { xs: 1, md: 0.4 } }}>
          <CartTotals totals={cartData.totals} />

          {/* Checkout Button */}
          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            onClick={handleCheckout}
            sx={{ mt: 2 }}
          >
            Proceed to Checkout
          </Button>

          {/* Continue Shopping */}
          <Button
            variant="outlined"
            size="medium"
            fullWidth
            onClick={() => navigate('/')}
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
