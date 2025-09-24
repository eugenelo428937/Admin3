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
import userService from '../../services/userService';

const AddressEditModal = ({
  open = false,
  onClose,
  addressType, // 'delivery' or 'invoice'
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

  // Get current address data based on preferences
  const getCurrentAddressData = useCallback(() => {
    if (!userProfile) return {};

    const addressTypeFromPrefs = getAddressTypeFromPreferences();
    return addressTypeFromPrefs === 'HOME'
      ? userProfile.home_address || {}
      : userProfile.work_address || {};
  }, [userProfile, getAddressTypeFromPreferences]);

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
      setShowManualEntry(false);
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

  // Handle confirmation of address update
  const handleConfirmUpdate = async () => {
    setLoading(true);
    setError('');

    try {
      const addressTypeFromPrefs = getAddressTypeFromPreferences();
      const addressKey = addressTypeFromPrefs === 'HOME' ? 'home_address' : 'work_address';

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
            onClick={handleUpdateAddress}
            disabled={!isFormValid() || loading}
            variant="contained"
            color="primary"
          >
            Update Address
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

AddressEditModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  addressType: PropTypes.oneOf(['delivery', 'invoice']).isRequired,
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