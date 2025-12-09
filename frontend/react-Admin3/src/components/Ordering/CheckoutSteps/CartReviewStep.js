import React from 'react';
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Box
} from '@mui/material';
import { LocationOn, Receipt } from '@mui/icons-material';
import AddressSelectionPanel from '../../Address/AddressSelectionPanel';
import CommunicationDetailsPanel from '../../Common/CommunicationDetailsPanel';
import RulesEngineInlineAlert from '../../Common/RulesEngineInlineAlert';

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

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Step 1: Review Your Cart
      </Typography>
      <RulesEngineInlineAlert
        messages={rulesMessages}
        loading={rulesLoading}
        loadingMessage="Checking for important notices..."
      />
      {/* Address Sections Layout */}
      <Grid container spacing={3} data-testid="cart-review-layout">
        {/* Address Sections Container - Full Width */}
        <Grid size={{ xs: 12 }} data-testid="address-sections-container">
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
                    Select your delivery address
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
                    Select your invoice address
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
    </Box>
  );
};

export default CartReviewStep;