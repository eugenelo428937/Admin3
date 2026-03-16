import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';
import SmartAddressInput from './SmartAddressInput.tsx';
import DynamicAddressForm from './DynamicAddressForm.tsx';
import AddressComparisonModal from './AddressComparisonModal.tsx';
import useAddressEditModalVM from './useAddressEditModalVM';
import type { AddressLocationType, AddressPurpose, AddressUpdateResult } from '../../types/address';
import type { UserProfile } from '../../types/auth/user.types';

interface AddressEditModalProps {
  open?: boolean;
  onClose: () => void;
  addressType: AddressPurpose;
  selectedAddressType: AddressLocationType;
  userProfile?: UserProfile | null;
  onAddressUpdate?: (result?: AddressUpdateResult) => void;
  className?: string;
}

const AddressEditModal: React.FC<AddressEditModalProps> = ({
  open = false,
  onClose,
  addressType,
  selectedAddressType,
  userProfile,
  onAddressUpdate,
  className = ''
}) => {
  const vm = useAddressEditModalVM({
    open,
    onClose,
    addressType,
    selectedAddressType,
    userProfile: userProfile || null,
    onAddressUpdate,
  });

  return (
    <Dialog
      open={open}
      onClose={!vm.loading ? vm.handleClose : undefined}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={vm.loading}
      aria-labelledby="address-edit-modal-title"
      className={`address-edit-modal ${className}`}
    >
      <DialogTitle id="address-edit-modal-title">
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <EditIcon sx={{ mr: 1 }} />
            <Typography variant="h6" component="div">
              {vm.modalTitle}
            </Typography>
          </Box>
          {!vm.loading && (
            <IconButton
              aria-label="close"
              onClick={vm.handleClose}
              sx={{ ml: 2 }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {vm.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {vm.error}
          </Alert>
        )}

        {vm.success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {vm.success}
          </Alert>
        )}

        {vm.loading && (
          <Box display="flex" justifyContent="center" alignItems="center" py={3}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Updating address...
            </Typography>
          </Box>
        )}

        {/* Confirmation Dialog */}
        {vm.showConfirmation && !vm.loading && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Confirm Address Update
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              This will update your {addressType} address.
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => vm.setShowConfirmation(false)}
                size="small"
                color="secondary"
              >
                Cancel
              </Button>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  onClick={vm.handleOrderOnlyUpdate}
                  size="small"
                  color="info"
                  disabled={vm.loading}
                >
                  For this order only
                </Button>
                <Button
                  variant="contained"
                  onClick={vm.handleConfirmUpdate}
                  size="small"
                  color="primary"
                  disabled={vm.loading}
                >
                  {vm.loading ? <CircularProgress size={20} /> : 'Update Profile'}
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        {/* Address Input Section */}
        {!vm.showConfirmation && !vm.loading && !vm.success && (
          <>
            {!vm.showManualEntry ? (
              <Box>
                <SmartAddressInput
                  key={`${selectedAddressType}-${open}`}
                  values={vm.formValues}
                  onChange={vm.handleFieldChange}
                  errors={{}}
                  fieldPrefix=""
                />

                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={vm.handleManualEntry}
                  >
                    Enter address manually
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Editing {vm.selectedCountry || 'selected country'} address manually
                </Typography>

                <DynamicAddressForm
                  country={vm.selectedCountry}
                  values={vm.formValues}
                  onChange={vm.handleFieldChange}
                  errors={{}}
                  fieldPrefix=""
                  showOptionalFields={true}
                />

                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Button
                    variant="text"
                    onClick={() => vm.setShowManualEntry(false)}
                    size="small"
                  >
                    ← Back to smart input
                  </Button>
                </Box>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={vm.handleClose}
          disabled={vm.loading}
          variant="outlined"
        >
          Cancel
        </Button>

        {!vm.showConfirmation && !vm.success && (
          <Button
            onClick={vm.handleValidateAndUpdate}
            disabled={!vm.isFormValid || vm.loading || vm.isValidatingAddress}
            variant="contained"
            color="primary"
          >
            {vm.isValidatingAddress ? 'Validating...' : 'Update Address'}
          </Button>
        )}
      </DialogActions>

      {/* Address Comparison Modal */}
      <AddressComparisonModal
        open={vm.showComparisonModal}
        userAddress={vm.userEnteredAddress}
        suggestedAddress={vm.suggestedAddress}
        onAcceptSuggested={vm.handleAcceptSuggested}
        onKeepOriginal={vm.handleKeepOriginal}
        onClose={() => vm.setShowComparisonModal(false)}
        loading={vm.isValidatingAddress}
      />
    </Dialog>
  );
};

export default AddressEditModal;
