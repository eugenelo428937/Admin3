import React from 'react';
import { Button, Alert, Card, CardActions, CardContent, Grid, Box, Stepper, Step, StepLabel, Typography } from '@mui/material';
import RulesEngineModal from '../Common/RulesEngineModal.js';
import './CheckoutSteps/CheckoutSteps.css';

// Import step components
import CartReviewStep from './CheckoutSteps/CartReviewStep.tsx';
import TermsConditionsStep from './CheckoutSteps/TermsConditionsStep.tsx';
import PreferenceStep from './CheckoutSteps/PreferenceStep.tsx';
import PaymentStep from './CheckoutSteps/PaymentStep.tsx';
import CartSummaryPanel from './CheckoutSteps/CartSummaryPanel.tsx';

import useCheckoutStepsVM from './useCheckoutStepsVM';
import type { CheckoutPaymentData } from '../../types/checkout';

interface CheckoutStepsProps {
  onComplete: (paymentData: CheckoutPaymentData | Record<string, any>) => Promise<void>;
}

const CheckoutSteps: React.FC<CheckoutStepsProps> = ({ onComplete }) => {
  const vm = useCheckoutStepsVM({ onComplete });

  const renderStepContent = () => {
    switch (vm.currentStep) {
      case 1:
        return (
          <CartReviewStep
            cartItems={vm.cartItems}
            rulesLoading={vm.rulesLoading}
            rulesMessages={vm.rulesMessages}
            vatCalculations={vm.vatCalculations}
            userProfile={vm.userProfile}
            onContactUpdate={vm.handleContactDataUpdate}
            onDeliveryAddressUpdate={vm.handleDeliveryAddressUpdate}
            onInvoiceAddressUpdate={vm.handleInvoiceAddressUpdate}
            addressValidation={vm.validation.addressValidation}
            contactValidation={vm.validation.contactValidation}
          />
        );

      case 2:
        return (
          <TermsConditionsStep
            cartData={vm.cartData}
            cartItems={vm.cartItems}
            generalTermsAccepted={vm.generalTermsAccepted}
            setGeneralTermsAccepted={vm.setGeneralTermsAccepted}
          />
        );

      case 3:
        return (
          <PreferenceStep
            preferences={vm.preferences}
            setPreferences={vm.setPreferences}
          />
        );

      case 4:
        return (
          <PaymentStep
            paymentMethod={vm.paymentMethod}
            setPaymentMethod={vm.setPaymentMethod}
            cardNumber={vm.cardNumber}
            setCardNumber={vm.setCardNumber}
            cardholderName={vm.cardholderName}
            setCardholderName={vm.setCardholderName}
            expiryMonth={vm.expiryMonth}
            setExpiryMonth={vm.setExpiryMonth}
            expiryYear={vm.expiryYear}
            setExpiryYear={vm.setExpiryYear}
            cvv={vm.cvv}
            setCvv={vm.setCvv}
            employerCode={vm.employerCode}
            setEmployerCode={vm.setEmployerCode}
            isDevelopment={vm.isDevelopment}
            isUAT={vm.isUAT}
            acknowledgmentStates={vm.acknowledgmentStates}
            setAcknowledgmentStates={vm.setAcknowledgmentStates}
            requiredAcknowledgments={vm.requiredAcknowledgments}
            setRequiredAcknowledgments={vm.setRequiredAcknowledgments}
          />
        );

      default:
        return null;
    }
  };

  return (
     <Box sx={{ width: '100%' }}>
        {vm.error && <Alert severity="error" sx={{ mb: 2 }}>{vm.error}</Alert>}
        {vm.success && <Alert severity="success" sx={{ mb: 2 }}>{vm.success}</Alert>}
        {vm.vatLoading && <Alert severity="info" sx={{ mb: 2 }}>Calculating VAT...</Alert>}
        {vm.validation.validationMessage && !vm.error && (
           <Alert severity="warning" sx={{ mb: 2 }}>{vm.validation.validationMessage}</Alert>
        )}

        {/* Step Progress */}
        <Stepper activeStep={vm.currentStep - 1} sx={{ mb: 2 }}>
           {vm.steps.map((step, index) => (
              <Step key={index} completed={index + 1 < vm.currentStep}>
                 <StepLabel>
                    <Typography variant="subtitle2">{step.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{step.description}</Typography>
                 </StepLabel>
              </Step>
           ))}
        </Stepper>

        <Card>
           <CardContent sx={{ px: 0 }}>
              {/* Rules Engine Modal */}
              <RulesEngineModal
                open={vm.showRulesModal}
                onClose={() => vm.setShowRulesModal(false)}
                messages={vm.modalMessages}
                closeButtonText="I Understand"
                backdrop="static"
                disableEscapeKeyDown={true}
              />
              <Box sx={{ px: { xs: (vm.theme as any).spacingTokens?.sm, md: (vm.theme as any).spacingTokens?.md, lg: (vm.theme as any).spacingTokens?.md } }}>
                 <Grid container spacing={1} sx={{ justifyContent: 'center' }}>
                    <Grid size={{ xs: 12, md: 8 }}>{renderStepContent()}</Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                       <CartSummaryPanel
                          cartItems={vm.cartItems}
                          vatCalculations={vm.vatCalculations}
                          paymentMethod={vm.paymentMethod}
                       />
                    </Grid>
                 </Grid>
              </Box>
           </CardContent>
           <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
              <Button
                 variant="outlined"
                 onClick={vm.handleBack}
                 disabled={vm.currentStep === 1}
              >
                 Back
              </Button>

              {vm.currentStep < vm.steps.length - 1 ? (
                 <Button
                    variant="contained"
                    onClick={vm.handleNext}
                    disabled={
                       (vm.currentStep === 1 && !vm.isStep1Valid()) ||
                       (vm.currentStep === 2 && !vm.generalTermsAccepted)
                    }
                 >
                    {vm.currentStep === 1 ? "Continue to Terms" : "Next"}
                 </Button>
              ) : (
                 <Button
                    variant="contained"
                    color="success"
                    onClick={vm.handleComplete}
                    disabled={
                       vm.loading ||
                       !vm.generalTermsAccepted ||
                       vm.validation.isValidating
                    }
                 >
                    {vm.loading
                       ? "Processing..."
                       : vm.validation.isValidating
                       ? "Validating..."
                       : "Complete Order"}
                 </Button>
              )}
           </CardActions>
        </Card>
     </Box>
  );
};

export default CheckoutSteps;
