import React, { useState, useEffect, useCallback } from 'react';
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
import PropTypes from 'prop-types';
import SmartAddressInput from './SmartAddressInput';
import DynamicAddressForm from './DynamicAddressForm';
import AddressComparisonModal from './AddressComparisonModal';
import userService from '../../services/userService';
import addressValidationService from '../../services/addressValidationService';
import addressMetadataService from '../../services/addressMetadataService';

const AddressEditModal = ({
  open = false,
  onClose,
  addressType, // 'delivery' or 'invoice'
  selectedAddressType, // 'HOME' or 'WORK' - the actual dropdown selection
  userProfile,
  onAddressUpdate,
  className = ''
}) => {
  const [currentAddress, setCurrentAddress] = useState({});
  const [formValues, setFormValues] = useState({});
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [userEnteredAddress, setUserEnteredAddress] = useState({});
  const [suggestedAddress, setSuggestedAddress] = useState({});
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);

  // Get the appropriate address type based on user preferences
  const getAddressTypeFromPreferences = useCallback(() => {
    if (!userProfile?.profile) return 'HOME';

    if (addressType === 'delivery') {
      return userProfile.profile.send_study_material_to || 'HOME';
    } else if (addressType === 'invoice') {
      return userProfile.profile.send_invoices_to || 'HOME';
    }
    return 'HOME';
  }, [userProfile?.profile, addressType]);

  // Get current address data based on selectedAddressType prop (not preferences)
  const getCurrentAddressData = useCallback(() => {
    if (!userProfile) return {};

    // Use the explicitly passed selectedAddressType prop
    // This ensures we get the address from the dropdown selection, not profile preferences
    return selectedAddressType === 'HOME'
      ? userProfile.home_address || {}
      : userProfile.work_address || {};
  }, [userProfile, selectedAddressType]);

  // Initialize form data when modal opens
  useEffect(() => {
    if (open && userProfile) {
      const addressData = getCurrentAddressData();
      setCurrentAddress(addressData);

      // Initialize form values with current address
      const initialValues = {};
      Object.keys(addressData).forEach(key => {
        initialValues[key] = addressData[key] || '';
      });

      setFormValues(initialValues);
      setSelectedCountry(addressData.country || '');
      setShowManualEntry(true);  // Start in manual entry mode
      setShowConfirmation(false);
      setError('');
      setSuccess('');
    }
  }, [open, userProfile, getCurrentAddressData]);

  // Handle form field changes
  const handleFieldChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));

    // Track country changes for SmartAddressInput
    if (name === 'country') {
      setSelectedCountry(value);
    }
  }, []);

  // Handle manual entry button click
  const handleManualEntry = () => {
    setShowManualEntry(true);

    // Pre-fill form with current address data
    const addressData = getCurrentAddressData();
    const preFilledValues = {};

    // Create a formatted address string for the address field
    const addressParts = [];
    if (addressData.building) addressParts.push(addressData.building);
    if (addressData.street) addressParts.push(addressData.street);
    if (addressData.address) addressParts.push(addressData.address);

    Object.keys(addressData).forEach(key => {
      if (key === 'address' && addressParts.length > 0) {
        preFilledValues[key] = addressParts.join(' ');
      } else {
        preFilledValues[key] = addressData[key] || '';
      }
    });

    setFormValues(preFilledValues);
  };

  // Check if form is valid
  const isFormValid = () => {
    return selectedCountry &&
           formValues.address &&
           formValues.address.trim().length > 0;
  };

  // Handle update address button click
  const handleUpdateAddress = () => {
    if (!isFormValid()) {
      setError('Please fill in all required fields');
      return;
    }

    setShowConfirmation(true);
  };

  // Handle validate and update with address validation
  const handleValidateAndUpdate = async () => {
    if (!isFormValid()) {
      setError('Please fill in all required fields');
      return;
    }

    setError('');
    setIsValidatingAddress(true);

    try {
      const addressToValidate = {
        ...formValues,
        country: selectedCountry
      };

      // Check if country supports address lookup
      const countryCode = addressMetadataService.getCountryCode(selectedCountry);
      let metadata;
      try {
        metadata = await addressMetadataService.fetchAddressMetadata(countryCode);
      } catch {
        metadata = addressMetadataService.getAddressMetadata(countryCode);
      }

      if (!metadata.addressLookupSupported) {
        // Skip validation for countries without lookup support
        setShowConfirmation(true);
        return;
      }

      const validationResult = await addressValidationService.validateAddress(addressToValidate);

      if (!validationResult.hasMatch || !validationResult.needsComparison) {
        // No match or addresses are the same, proceed to confirmation
        setShowConfirmation(true);
        return;
      }

      // Show comparison modal
      setUserEnteredAddress(addressToValidate);
      setSuggestedAddress(validationResult.bestMatch);
      setShowComparisonModal(true);

    } catch (err) {
      console.error('Address validation error:', err);
      // On error, allow user to proceed
      setShowConfirmation(true);
    } finally {
      setIsValidatingAddress(false);
    }
  };

  // Handle accepting suggested address from comparison modal
  const handleAcceptSuggested = () => {
    // Update form values with suggested address
    setFormValues({
      ...formValues,
      ...suggestedAddress
    });

    // Close comparison modal and show confirmation
    setShowComparisonModal(false);
    setShowConfirmation(true);
  };

  // Handle keeping original address from comparison modal
  const handleKeepOriginal = () => {
    // Close comparison modal and show confirmation with original address
    setShowComparisonModal(false);
    setShowConfirmation(true);
  };

  // Handle confirmation of address update
  const handleConfirmUpdate = async () => {
    setLoading(true);
    setError('');

    try {
      // Use selectedAddressType prop to determine which address to update
      const addressKey = selectedAddressType === 'HOME' ? 'home_address' : 'work_address';

      const updateData = {
        [addressKey]: {
          ...formValues,
          country: selectedCountry
        }
      };

      const result = await userService.updateUserProfile(updateData);

      if (result.status === 'success') {
        setSuccess('Address updated successfully');

        // Call the callback to refresh address display
        if (onAddressUpdate) {
          onAddressUpdate();
        }

        // Close modal after brief delay
        setTimeout(() => {
          handleClose();
        }, 1000);
      } else {
        setError(result.message || 'Failed to update address');
      }
    } catch (err) {
      console.error('Error updating address:', err);
      setError(err.response?.data?.message || 'Failed to update address');
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  // Handle order-only address update (don't save to profile)
  const handleOrderOnlyUpdate = () => {
    setLoading(true);

    // Simulate update without actually saving to profile
    setTimeout(() => {
      setLoading(false);
      setShowConfirmation(false);

      // Call the callback with order-only flag
      if (onAddressUpdate) {
        onAddressUpdate({
          orderOnly: true,
          addressData: {
            ...formValues,
            country: selectedCountry
          }
        });
      }

      // Close modal after brief delay
      setTimeout(() => {
        handleClose();
      }, 500);
    }, 1000);
  };

  // Handle modal close
  const handleClose = () => {
    setShowConfirmation(false);
    setError('');
    setSuccess('');
    setLoading(false);
    if (onClose) {
      onClose();
    }
  };

  // Get modal title
  const getModalTitle = () => {
    return `Edit ${addressType === 'delivery' ? 'Delivery' : 'Invoice'} Address`;
  };

  return (
    <Dialog
      open={open}
      onClose={!loading ? handleClose : undefined}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown={loading}
      aria-labelledby="address-edit-modal-title"
      className={`address-edit-modal ${className}`}
    >
      <DialogTitle id="address-edit-modal-title">
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <EditIcon sx={{ mr: 1 }} />
            <Typography variant="h6" component="div">
              {getModalTitle()}
            </Typography>
          </Box>
          {!loading && (
            <IconButton
              aria-label="close"
              onClick={handleClose}
              sx={{ ml: 2 }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {loading && (
          <Box display="flex" justifyContent="center" alignItems="center" py={3}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Updating address...
            </Typography>
          </Box>
        )}

        {/* Confirmation Dialog */}
        {showConfirmation && !loading && (
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
                onClick={() => setShowConfirmation(false)}
                size="small"
                color="secondary"
              >
                Cancel
              </Button>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  onClick={handleOrderOnlyUpdate}
                  size="small"
                  color="info"
                  disabled={loading}
                >
                  For this order only
                </Button>
                <Button
                  variant="contained"
                  onClick={handleConfirmUpdate}
                  size="small"
                  color="primary"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={20} /> : 'Update Profile'}
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        {/* Address Input Section */}
        {!showConfirmation && !loading && !success && (
          <>
            {!showManualEntry ? (
              <Box>
                <SmartAddressInput
                  key={`${selectedAddressType}-${open}`}
                  values={formValues}
                  onChange={handleFieldChange}
                  errors={{}}
                  fieldPrefix=""
                />

                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={handleManualEntry}
                  >
                    Enter address manually
                  </Button>
                </Box>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Editing {selectedCountry || 'selected country'} address manually
                </Typography>

                <DynamicAddressForm
                  country={selectedCountry}
                  values={formValues}
                  onChange={handleFieldChange}
                  errors={{}}
                  fieldPrefix=""
                  showOptionalFields={true}
                />

                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <Button
                    variant="text"
                    onClick={() => setShowManualEntry(false)}
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
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
        >
          Cancel
        </Button>

        {!showConfirmation && !success && (
          <Button
            onClick={handleValidateAndUpdate}
            disabled={!isFormValid() || loading || isValidatingAddress}
            variant="contained"
            color="primary"
          >
            {isValidatingAddress ? 'Validating...' : 'Update Address'}
          </Button>
        )}
      </DialogActions>

      {/* Address Comparison Modal */}
      <AddressComparisonModal
        open={showComparisonModal}
        userAddress={userEnteredAddress}
        suggestedAddress={suggestedAddress}
        onAcceptSuggested={handleAcceptSuggested}
        onKeepOriginal={handleKeepOriginal}
        onClose={() => setShowComparisonModal(false)}
        loading={isValidatingAddress}
      />
    </Dialog>
  );
};

AddressEditModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  addressType: PropTypes.oneOf(['delivery', 'invoice']).isRequired,
  selectedAddressType: PropTypes.oneOf(['HOME', 'WORK']).isRequired,
  userProfile: PropTypes.shape({
    profile: PropTypes.shape({
      send_invoices_to: PropTypes.oneOf(['HOME', 'WORK']),
      send_study_material_to: PropTypes.oneOf(['HOME', 'WORK'])
    }),
    home_address: PropTypes.object,
    work_address: PropTypes.object
  }),
  onAddressUpdate: PropTypes.func,
  className: PropTypes.string
};

export default AddressEditModal;