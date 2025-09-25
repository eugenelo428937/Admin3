import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  Button
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import PropTypes from 'prop-types';
import DynamicAddressForm from './DynamicAddressForm';
import AddressEditModal from './AddressEditModal';

const AddressSelectionPanel = ({
  addressType, // 'delivery' or 'invoice'
  userProfile,
  selectedAddress,
  onAddressChange,
  onAddressUpdate, // Callback for when address is updated
  className = ''
}) => {
  const [selectedAddressType, setSelectedAddressType] = useState('HOME');
  const [currentAddressData, setCurrentAddressData] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [isOrderOnlyAddress, setIsOrderOnlyAddress] = useState(false);

  // Get the appropriate preference setting based on address type
  const getPreferenceSetting = useCallback(() => {
    if (!userProfile?.profile) return 'HOME';

    if (addressType === 'delivery') {
      return userProfile.profile.send_study_material_to || 'HOME';
    } else if (addressType === 'invoice') {
      return userProfile.profile.send_invoices_to || 'HOME';
    }
    return 'HOME';
  }, [userProfile?.profile, addressType]);

  // Initialize selected address type based on user preferences
  useEffect(() => {
    const defaultSelection = getPreferenceSetting();
    setSelectedAddressType(defaultSelection);
  }, [getPreferenceSetting]);

  // Update current address data when selection changes
  useEffect(() => {
    if (!userProfile) return;

    const addressData = selectedAddressType === 'HOME'
      ? userProfile.home_address || {}
      : userProfile.work_address || {};

    setCurrentAddressData(addressData);
    setIsOrderOnlyAddress(false); // Reset order-only flag when switching between HOME/WORK

    // Notify parent component of address change
    if (onAddressChange) {
      onAddressChange({
        addressType: selectedAddressType,
        addressData: addressData
      });
    }
  }, [selectedAddressType, userProfile?.home_address, userProfile?.work_address]);

  // Handle dropdown selection change
  const handleAddressTypeChange = (event) => {
    setSelectedAddressType(event.target.value);
  };

  // Handle edit button click
  const handleEditClick = () => {
    setShowEditModal(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setShowEditModal(false);
  };

  // Handle address update from modal
  const handleAddressUpdateFromModal = (updateResult) => {
    if (updateResult && updateResult.orderOnly) {
      // "For this order only" - update local state with temporary address
      const tempAddressData = updateResult.addressData;
      setCurrentAddressData(tempAddressData);
      setIsOrderOnlyAddress(true);

      // Notify parent component of the temporary address change
      if (onAddressChange) {
        onAddressChange({
          addressType: selectedAddressType,
          addressData: tempAddressData,
          orderOnly: true
        });
      }
    } else {
      // Profile update - refresh data from user profile
      setIsOrderOnlyAddress(false);
      if (onAddressUpdate) {
        onAddressUpdate();
      }
    }
    setShowEditModal(false);
  };

  // Handle case where no user profile is provided
  if (!userProfile) {
    return (
      <Box className={`address-selection-panel ${className}`}>
        <Alert severity="info">
          Please log in to select addresses from your profile.
        </Alert>
      </Box>
    );
  }

  const dropdownTestId = `${addressType}-address-dropdown`;
  const displayTestId = `${addressType}-address-display`;

  return (
    <Box className={`address-selection-panel ${className}`}>
      {/* Address Type Selection Dropdown */}
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id={`${addressType}-address-select-label`}>
          Select Address
        </InputLabel>
        <Select
          labelId={`${addressType}-address-select-label`}
          value={selectedAddressType}
          label="Select Address"
          onChange={handleAddressTypeChange}
          data-testid={dropdownTestId}
          inputProps={{ 'data-testid': `${dropdownTestId}-input` }}
        >
          <MenuItem value="HOME">Home</MenuItem>
          <MenuItem value="WORK">Work</MenuItem>
        </Select>
      </FormControl>

      {/* Order Only Address Indicator */}
      {isOrderOnlyAddress && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This address is for this order only and won't be saved to your profile.
        </Alert>
      )}

      {/* Address Display using DynamicAddressForm for consistent formatting */}
      <Box
        data-testid={displayTestId}
        sx={{
          p: 2,
          bgcolor: isOrderOnlyAddress ? 'info.50' : 'grey.50',
          borderRadius: 1,
          border: '1px solid',
          borderColor: isOrderOnlyAddress ? 'info.300' : 'grey.300'
        }}
      >
        {currentAddressData && Object.keys(currentAddressData).length > 0 ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {selectedAddressType === 'HOME' ? 'Home Address' : 'Work Address'}:
            </Typography>
            <Box sx={{ mt: 1 }}>
              {/* Use consistent address formatting like DynamicAddressForm */}
              {currentAddressData.company && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {currentAddressData.company}
                </Typography>
              )}
              {currentAddressData.department && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {currentAddressData.department}
                </Typography>
              )}
              {(currentAddressData.building || currentAddressData.street || currentAddressData.address) && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {[currentAddressData.building, currentAddressData.street, currentAddressData.address]
                    .filter(Boolean).join(' ')}
                </Typography>
              )}
              {currentAddressData.district && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {currentAddressData.district}
                </Typography>
              )}
              {(currentAddressData.city || currentAddressData.town) && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {currentAddressData.city || currentAddressData.town}
                </Typography>
              )}
              {(currentAddressData.county || currentAddressData.state) && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {currentAddressData.county || currentAddressData.state}
                </Typography>
              )}
              {(currentAddressData.postcode || currentAddressData.postal_code) && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {currentAddressData.postcode || currentAddressData.postal_code}
                </Typography>
              )}
              {currentAddressData.country && (
                <Typography variant="body2">
                  {currentAddressData.country}
                </Typography>
              )}
            </Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" align="center">
            No {selectedAddressType.toLowerCase()} address found in your profile.
            <br />
            Please update your profile to add this address.
          </Typography>
        )}
      </Box>

      {/* Edit Button */}
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={handleEditClick}
          size="small"
          data-testid={`${addressType}-edit-button`}
        >
          Edit Address
        </Button>
      </Box>

      {/* Address Edit Modal */}
      <AddressEditModal
        open={showEditModal}
        onClose={handleModalClose}
        addressType={addressType}
        userProfile={userProfile}
        onAddressUpdate={handleAddressUpdateFromModal}
      />
    </Box>
  );
};


AddressSelectionPanel.propTypes = {
  addressType: PropTypes.oneOf(['delivery', 'invoice']).isRequired,
  userProfile: PropTypes.shape({
    profile: PropTypes.shape({
      send_invoices_to: PropTypes.oneOf(['HOME', 'WORK']),
      send_study_material_to: PropTypes.oneOf(['HOME', 'WORK'])
    }),
    home_address: PropTypes.object,
    work_address: PropTypes.object
  }),
  selectedAddress: PropTypes.object,
  onAddressChange: PropTypes.func,
  onAddressUpdate: PropTypes.func,
  className: PropTypes.string
};

export default AddressSelectionPanel;