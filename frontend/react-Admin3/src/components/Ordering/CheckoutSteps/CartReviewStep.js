import React from 'react';
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Alert,
  CircularProgress,
  Divider,
  Box,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Info, LocationOn, Receipt } from '@mui/icons-material';
import { generateProductCode } from '../../../utils/productCodeGenerator';

const CartReviewStep = ({
  cartItems,
  rulesLoading,
  rulesMessages,
  vatCalculations
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  const getResponsiveLayout = () => {
    if (isMobile) return 'stacked';
    if (isTablet) return 'stacked';
    return 'side-by-side';
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Step 1: Review Your Cart
      </Typography>

      {/* Enhanced Layout with 1/3 + 2/3 split */}
      <Grid
        container
        spacing={3}
        data-testid="cart-review-layout"
        data-responsive={getResponsiveLayout()}
      >
        {/* Left 1/3: Cart Summary */}
        <Grid item xs={12} lg={4} data-testid="cart-summary-section">
          <Card data-testid="cart-summary-card" sx={{ height: 'fit-content' }}>
            <CardHeader
              title={
                <Typography variant="h6" component="h2">
                  Order Summary
                </Typography>
              }
            />
            <CardContent>
              {/* Cart Items Table */}
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="center">Qty</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cartItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {item.product_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.subject_code} • {item.variation_name}
                        </Typography>
                        <br />
                        <Typography variant="caption" component="code">
                          {generateProductCode(item)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{item.quantity}</TableCell>
                      <TableCell align="right">
                        £{(parseFloat(item.actual_price) * item.quantity).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Order Summary */}
              {vatCalculations && (
                <Box sx={{ mt: 2 }}>
                  <Divider sx={{ my: 1 }} />
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">Subtotal:</Typography>
                    <Typography variant="body2">£{vatCalculations.totals.subtotal.toFixed(2)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">VAT (20%):</Typography>
                    <Typography variant="body2">£{vatCalculations.totals.total_vat.toFixed(2)}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="h6" fontWeight="bold">Total:</Typography>
                    <Typography variant="h6" fontWeight="bold">£{vatCalculations.totals.total_gross.toFixed(2)}</Typography>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right 2/3: Address Sections */}
        <Grid item xs={12} lg={8} data-testid="address-sections-container">
          <Grid container spacing={2}>
            {/* Delivery Address Panel */}
            <Grid item xs={12} md={6}>
              <Card data-testid="delivery-address-card" sx={{ height: '100%' }}>
                <CardHeader
                  avatar={<LocationOn color="primary" />}
                  title={
                    <Typography variant="h6" component="h3">
                      Delivery Address
                    </Typography>
                  }
                  data-testid="delivery-address-panel"
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Select your delivery address from your profile settings.
                  </Typography>
                  {/* Placeholder for address selection dropdown */}
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Address selection will be implemented in Story 2.2
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Invoice Address Panel */}
            <Grid item xs={12} md={6}>
              <Card data-testid="invoice-address-card" sx={{ height: '100%' }}>
                <CardHeader
                  avatar={<Receipt color="secondary" />}
                  title={
                    <Typography variant="h6" component="h3">
                      Invoice Address
                    </Typography>
                  }
                  data-testid="invoice-address-panel"
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    Select your invoice address from your profile settings.
                  </Typography>
                  {/* Placeholder for address selection dropdown */}
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" align="center">
                      Address selection will be implemented in Story 2.2
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Rules Engine Messages */}
      {rulesLoading && (
        <Alert severity="info" icon={<CircularProgress size={20} />} sx={{ mt: 3 }}>
          Checking for important notices...
        </Alert>
      )}

      {!rulesLoading && rulesMessages.map((message, index) => {
        console.log('📋 [CartReviewStep] Rendering alert', index + 1, 'title:', message.content?.title);

        const severity = message.message_type === 'warning' ? 'warning' :
                        message.message_type === 'error' ? 'error' :
                        message.message_type === 'info' ? 'info' : 'info';

        return (
          <Alert
            key={`alert-${message.template_id}-${index}`}
            severity={severity}
            sx={{ mt: 3 }}
            data-testid={`rules-alert-${index}`}
          >
            <Typography variant="h6" component="h4">
              {message.content?.title || 'Notice'}
            </Typography>
            <Typography variant="body2">
              {message.content?.message || message.content}
            </Typography>
          </Alert>
        );
      })}
    </Box>
  );
};

export default CartReviewStep;