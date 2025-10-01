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
import AddressSelectionPanel from '../../Address/AddressSelectionPanel';
import CommunicationDetailsPanel from '../../Communication/CommunicationDetailsPanel';

const CartReviewStep = ({
  cartItems,
  rulesLoading,
  rulesMessages,
  vatCalculations,
  userProfile = null,
  onContactUpdate, // Callback for when contact info is updated
  onDeliveryAddressUpdate, // Callback for delivery address updates
  onInvoiceAddressUpdate, // Callback for invoice address updates
  addressValidation = null, // Validation state for addresses
  contactValidation = null // Validation state for contact info
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
        <Grid size={{ xs: 12, lg: 4 }} data-testid="cart-summary-section">
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
                    <Typography variant="body2">
                      VAT{vatCalculations.totals.effective_vat_rate !== undefined &&
                          vatCalculations.totals.effective_vat_rate !== null
                        ? ` (${(vatCalculations.totals.effective_vat_rate * 100).toFixed(0)}%)`
                        : ''}:
                    </Typography>
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
        <Grid size={{ xs: 12, lg: 8 }} data-testid="address-sections-container">
          <Grid container spacing={2}>
            {/* Delivery Address Panel */}
            <Grid size={{ xs: 12, md: 6 }}>
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
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Select your delivery address from your profile settings.
                  </Typography>
                  <AddressSelectionPanel
                    addressType="delivery"
                    userProfile={userProfile}
                    onAddressChange={onDeliveryAddressUpdate}
                    onAddressUpdate={onContactUpdate}
                    validationState={addressValidation?.deliveryAddress}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Invoice Address Panel */}
            <Grid size={{ xs: 12, md: 6 }}>
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
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Select your invoice address from your profile settings.
                  </Typography>
                  <AddressSelectionPanel
                    addressType="invoice"
                    userProfile={userProfile}
                    onAddressChange={onInvoiceAddressUpdate}
                    onAddressUpdate={onContactUpdate}
                    validationState={addressValidation?.invoiceAddress}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Communication Details Panel - Full Width Below Addresses */}
          <Grid size={{ xs: 12 }} sx={{ mt: 3 }}>
            <CommunicationDetailsPanel
              userProfile={userProfile}
              onProfileUpdate={onContactUpdate}
              validationState={contactValidation}
            />
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