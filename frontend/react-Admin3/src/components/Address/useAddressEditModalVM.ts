import { useState, useEffect, useCallback } from 'react';
import userService from '../../services/userService.ts';
import addressValidationService from '../../services/addressValidationService.ts';
import addressMetadataService from '../../services/addressMetadataService.ts';
import type { AddressLocationType, AddressPurpose, AddressUpdateResult, AddressChangeEvent } from '../../types/address';
import type { UserProfile } from '../../types/auth/user.types';

export interface AddressEditModalVM {
  // Form state
  formValues: Record<string, string>;
  selectedCountry: string;
  showManualEntry: boolean;
  showConfirmation: boolean;
  loading: boolean;
  error: string;
  success: string;

  // Validation state
  showComparisonModal: boolean;
  userEnteredAddress: Record<string, string>;
  suggestedAddress: Record<string, string>;
  isValidatingAddress: boolean;

  // Computed
  modalTitle: string;
  isFormValid: boolean;

  // Actions
  handleFieldChange: (e: AddressChangeEvent) => void;
  handleManualEntry: () => void;
  handleUpdateAddress: () => void;
  handleValidateAndUpdate: () => Promise<void>;
  handleAcceptSuggested: () => void;
  handleKeepOriginal: () => void;
  handleConfirmUpdate: () => Promise<void>;
  handleOrderOnlyUpdate: () => void;
  handleClose: () => void;
  setShowManualEntry: (show: boolean) => void;
  setShowConfirmation: (show: boolean) => void;
  setShowComparisonModal: (show: boolean) => void;
}

interface UseAddressEditModalVMParams {
  open: boolean;
  onClose?: () => void;
  addressType: AddressPurpose;
  selectedAddressType: AddressLocationType;
  userProfile?: UserProfile | null;
  onAddressUpdate?: (result?: AddressUpdateResult) => void;
}

const useAddressEditModalVM = ({
  open,
  onClose,
  addressType,
  selectedAddressType,
  userProfile,
  onAddressUpdate,
}: UseAddressEditModalVMParams): AddressEditModalVM => {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [userEnteredAddress, setUserEnteredAddress] = useState<Record<string, string>>({});
  const [suggestedAddress, setSuggestedAddress] = useState<Record<string, string>>({});
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);

  const getCurrentAddressData = useCallback((): Record<string, string> => {
    if (!userProfile) return {};
    return selectedAddressType === 'HOME'
      ? (userProfile.home_address as Record<string, string>) || {}
      : (userProfile.work_address as Record<string, string>) || {};
  }, [userProfile, selectedAddressType]);

  // Initialize form data when modal opens
  useEffect(() => {
    if (open && userProfile) {
      const addressData = getCurrentAddressData();

      const initialValues: Record<string, string> = {};
      Object.keys(addressData).forEach(key => {
        initialValues[key] = addressData[key] || '';
      });

      setFormValues(initialValues);
      setSelectedCountry(addressData.country || '');
      setShowManualEntry(true);
      setShowConfirmation(false);
      setError('');
      setSuccess('');
    }
  }, [open, userProfile, getCurrentAddressData]);

  const handleFieldChange = useCallback((e: AddressChangeEvent) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'country') {
      setSelectedCountry(value);
    }
  }, []);

  const handleManualEntry = () => {
    setShowManualEntry(true);

    const addressData = getCurrentAddressData();
    const preFilledValues: Record<string, string> = {};

    const addressParts: string[] = [];
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

  const isFormValid = !!(selectedCountry &&
    formValues.address &&
    formValues.address.trim().length > 0);

  const handleUpdateAddress = () => {
    if (!isFormValid) {
      setError('Please fill in all required fields');
      return;
    }
    setShowConfirmation(true);
  };

  const handleValidateAndUpdate = async () => {
    if (!isFormValid) {
      setError('Please fill in all required fields');
      return;
    }

    setError('');
    setIsValidatingAddress(true);

    try {
      const addressToValidate: Record<string, string> = {
        ...formValues,
        country: selectedCountry
      };

      const countryCode = addressMetadataService.getCountryCode(selectedCountry);
      let metadata;
      try {
        metadata = await addressMetadataService.fetchAddressMetadata(countryCode);
      } catch {
        metadata = addressMetadataService.getAddressMetadata(countryCode);
      }

      if (!metadata.addressLookupSupported) {
        setShowConfirmation(true);
        return;
      }

      const validationResult = await addressValidationService.validateAddress(addressToValidate);

      if (!validationResult.hasMatch || !validationResult.needsComparison) {
        setShowConfirmation(true);
        return;
      }

      setUserEnteredAddress(addressToValidate);
      setSuggestedAddress(validationResult.bestMatch || {});
      setShowComparisonModal(true);

    } catch (err) {
      console.error('Address validation error:', err);
      setShowConfirmation(true);
    } finally {
      setIsValidatingAddress(false);
    }
  };

  const handleAcceptSuggested = () => {
    setFormValues({
      ...formValues,
      ...suggestedAddress
    });
    setShowComparisonModal(false);
    setShowConfirmation(true);
  };

  const handleKeepOriginal = () => {
    setShowComparisonModal(false);
    setShowConfirmation(true);
  };

  const handleConfirmUpdate = async () => {
    setLoading(true);
    setError('');

    try {
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

        if (onAddressUpdate) {
          onAddressUpdate();
        }

        setTimeout(() => {
          handleClose();
        }, 1000);
      } else {
        setError(result.message || 'Failed to update address');
      }
    } catch (err: any) {
      console.error('Error updating address:', err);
      setError(err.response?.data?.message || 'Failed to update address');
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  const handleOrderOnlyUpdate = () => {
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setShowConfirmation(false);

      if (onAddressUpdate) {
        onAddressUpdate({
          orderOnly: true,
          addressData: {
            ...formValues,
            country: selectedCountry
          }
        });
      }

      setTimeout(() => {
        handleClose();
      }, 500);
    }, 1000);
  };

  const handleClose = () => {
    setShowConfirmation(false);
    setError('');
    setSuccess('');
    setLoading(false);
    if (onClose) {
      onClose();
    }
  };

  const modalTitle = `Edit ${addressType === 'delivery' ? 'Delivery' : 'Invoice'} Address`;

  return {
    formValues,
    selectedCountry,
    showManualEntry,
    showConfirmation,
    loading,
    error,
    success,
    showComparisonModal,
    userEnteredAddress,
    suggestedAddress,
    isValidatingAddress,
    modalTitle,
    isFormValid,
    handleFieldChange,
    handleManualEntry,
    handleUpdateAddress,
    handleValidateAndUpdate,
    handleAcceptSuggested,
    handleKeepOriginal,
    handleConfirmUpdate,
    handleOrderOnlyUpdate,
    handleClose,
    setShowManualEntry,
    setShowConfirmation,
    setShowComparisonModal,
  };
};

export default useAddressEditModalVM;
