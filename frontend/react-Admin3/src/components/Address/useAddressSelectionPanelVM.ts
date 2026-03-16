import { useState, useEffect, useCallback } from 'react';
import type { AddressLocationType, AddressPurpose, AddressSelection, AddressUpdateResult } from '../../types/address';
import type { UserProfile } from '../../types/auth/user.types';

export interface AddressSelectionPanelVM {
  selectedAddressType: AddressLocationType;
  currentAddressData: Record<string, string>;
  showEditModal: boolean;
  isOrderOnlyAddress: boolean;
  dropdownTestId: string;
  displayTestId: string;

  handleAddressTypeChange: (event: { target: { value: string } }) => void;
  handleEditClick: () => void;
  handleModalClose: () => void;
  handleAddressUpdateFromModal: (updateResult?: AddressUpdateResult) => void;
}

interface UseAddressSelectionPanelVMParams {
  addressType: AddressPurpose;
  userProfile?: UserProfile | null;
  onAddressChange?: (selection: AddressSelection) => void;
  onAddressUpdate?: () => void;
}

const useAddressSelectionPanelVM = ({
  addressType,
  userProfile,
  onAddressChange,
  onAddressUpdate,
}: UseAddressSelectionPanelVMParams): AddressSelectionPanelVM => {
  const [selectedAddressType, setSelectedAddressType] = useState<AddressLocationType>('HOME');
  const [currentAddressData, setCurrentAddressData] = useState<Record<string, string>>({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [isOrderOnlyAddress, setIsOrderOnlyAddress] = useState(false);

  const getPreferenceSetting = useCallback((): AddressLocationType => {
    if (!userProfile?.profile) return 'HOME';

    if (addressType === 'delivery') {
      return (userProfile as any).profile.send_study_material_to || 'HOME';
    } else if (addressType === 'invoice') {
      return (userProfile as any).profile.send_invoices_to || 'HOME';
    }
    return 'HOME';
  }, [userProfile, addressType]);

  useEffect(() => {
    const defaultSelection = getPreferenceSetting();
    setSelectedAddressType(defaultSelection);
  }, [getPreferenceSetting]);

  useEffect(() => {
    if (!userProfile) return;

    const addressData = selectedAddressType === 'HOME'
      ? (userProfile.home_address as Record<string, string>) || {}
      : (userProfile.work_address as Record<string, string>) || {};

    setCurrentAddressData(addressData);
    setIsOrderOnlyAddress(false);

    if (onAddressChange) {
      onAddressChange({
        addressType: selectedAddressType,
        addressData: addressData
      });
    }
  }, [selectedAddressType, userProfile?.home_address, userProfile?.work_address]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddressTypeChange = (event: { target: { value: string } }) => {
    setSelectedAddressType(event.target.value as AddressLocationType);
  };

  const handleEditClick = () => {
    setShowEditModal(true);
  };

  const handleModalClose = () => {
    setShowEditModal(false);
  };

  const handleAddressUpdateFromModal = (updateResult?: AddressUpdateResult) => {
    if (updateResult && updateResult.orderOnly) {
      const tempAddressData = updateResult.addressData || {};
      setCurrentAddressData(tempAddressData);
      setIsOrderOnlyAddress(true);

      if (onAddressChange) {
        onAddressChange({
          addressType: selectedAddressType,
          addressData: tempAddressData,
          orderOnly: true
        });
      }
    } else {
      setIsOrderOnlyAddress(false);
      if (onAddressUpdate) {
        onAddressUpdate();
      }
    }
    setShowEditModal(false);
  };

  const dropdownTestId = `${addressType}-address-dropdown`;
  const displayTestId = `${addressType}-address-display`;

  return {
    selectedAddressType,
    currentAddressData,
    showEditModal,
    isOrderOnlyAddress,
    dropdownTestId,
    displayTestId,
    handleAddressTypeChange,
    handleEditClick,
    handleModalClose,
    handleAddressUpdateFromModal,
  };
};

export default useAddressSelectionPanelVM;
