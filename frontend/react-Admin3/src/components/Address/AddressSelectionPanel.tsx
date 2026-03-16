import React from 'react';
import {
  Box,
  FormControl,
  Select,
  MenuItem,
  Typography,
  Alert,
  Button
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import AddressEditModal from './AddressEditModal.tsx';
import useAddressSelectionPanelVM from './useAddressSelectionPanelVM';
import type { AddressPurpose, AddressSelection, AddressUpdateResult } from '../../types/address';
import type { UserProfile } from '../../types/auth/user.types';

interface AddressSelectionPanelProps {
  addressType: AddressPurpose;
  userProfile?: UserProfile | null;
  selectedAddress?: Record<string, string>;
  onAddressChange?: (selection: AddressSelection) => void;
  onAddressUpdate?: () => void;
  className?: string;
}

const AddressSelectionPanel: React.FC<AddressSelectionPanelProps> = ({
  addressType,
  userProfile,
  onAddressChange,
  onAddressUpdate,
  className = ''
}) => {
  const vm = useAddressSelectionPanelVM({
    addressType,
    userProfile: userProfile || null,
    onAddressChange,
    onAddressUpdate,
  });

  if (!userProfile) {
    return (
      <Box className={`address-selection-panel ${className}`}>
        <Alert severity="info">
          Please log in to select addresses from your profile.
        </Alert>
      </Box>
    );
  }

  return (
    <Box className={`address-selection-panel ${className}`}>
      {/* Address Type Selection Dropdown */}
      <FormControl fullWidth sx={{ mb: 1 }}>
        <Select
          labelId={`${addressType}-address-select-label`}
          value={vm.selectedAddressType}
          label="Select Address"
          onChange={vm.handleAddressTypeChange as any}
          data-testid={vm.dropdownTestId}
          inputProps={{ 'data-testid': `${vm.dropdownTestId}-input` }}
          variant="standard"
        >
          <MenuItem value="HOME">Home</MenuItem>
          <MenuItem value="WORK">Work</MenuItem>
        </Select>
      </FormControl>

      {/* Order Only Address Indicator */}
      {vm.isOrderOnlyAddress && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This address is for this order only and won't be saved to your profile.
        </Alert>
      )}

      {/* Address Display */}
      <Box
        data-testid={vm.displayTestId}
        sx={{
          p: 2,
          bgcolor: vm.isOrderOnlyAddress ? 'info.50' : 'grey.50',
          borderRadius: 1,
          border: '1px solid',
          borderColor: vm.isOrderOnlyAddress ? 'info.300' : 'grey.300'
        }}
      >
        {vm.currentAddressData && Object.keys(vm.currentAddressData).length > 0 ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {vm.selectedAddressType === 'HOME' ? 'Home Address' : 'Work Address'}:
            </Typography>
            <Box sx={{ mt: 1 }}>
              {vm.currentAddressData.company && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {vm.currentAddressData.company}
                </Typography>
              )}
              {vm.currentAddressData.department && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {vm.currentAddressData.department}
                </Typography>
              )}
              {(vm.currentAddressData.building || vm.currentAddressData.street || vm.currentAddressData.address) && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {[vm.currentAddressData.building, vm.currentAddressData.street, vm.currentAddressData.address]
                    .filter(Boolean).join(' ')}
                </Typography>
              )}
              {vm.currentAddressData.district && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {vm.currentAddressData.district}
                </Typography>
              )}
              {(vm.currentAddressData.city || vm.currentAddressData.town) && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {vm.currentAddressData.city || vm.currentAddressData.town}
                </Typography>
              )}
              {(vm.currentAddressData.county || vm.currentAddressData.state) && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {vm.currentAddressData.county || vm.currentAddressData.state}
                </Typography>
              )}
              {(vm.currentAddressData.postcode || vm.currentAddressData.postal_code) && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {vm.currentAddressData.postcode || vm.currentAddressData.postal_code}
                </Typography>
              )}
              {vm.currentAddressData.country && (
                <Typography variant="body2">
                  {vm.currentAddressData.country}
                </Typography>
              )}
            </Box>
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" align="center">
            No {vm.selectedAddressType.toLowerCase()} address found in your profile.
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
          onClick={vm.handleEditClick}
          size="small"
          data-testid={`${addressType}-edit-button`}
        >
          Edit Address
        </Button>
      </Box>

      {/* Address Edit Modal */}
      <AddressEditModal
        open={vm.showEditModal}
        onClose={vm.handleModalClose}
        addressType={addressType}
        selectedAddressType={vm.selectedAddressType}
        userProfile={userProfile}
        onAddressUpdate={vm.handleAddressUpdateFromModal}
      />
    </Box>
  );
};

export default AddressSelectionPanel;
