import { useState, useEffect, useCallback, useRef } from 'react';
import addressMetadataService, { ADDRESS_METADATA } from '../../services/address/addressMetadataService.ts';
import config from '../../config';
import type { AddressMetadata, AddressSuggestion, AddressChangeEvent, DropdownPosition } from '../../types/address';

export interface SmartAddressInputVM {
  // State
  selectedCountry: string;
  addressMetadata: AddressMetadata | null;
  showManualEntry: boolean;
  postcodeValue: string;
  addressLineValue: string;
  addressSuggestions: AddressSuggestion[];
  isLoadingSuggestions: boolean;
  showSuggestions: boolean;
  dropdownPosition: DropdownPosition;

  // Refs
  addressLineRef: React.RefObject<HTMLDivElement | null>;
  suggestionsRef: React.RefObject<HTMLDivElement | null>;

  // Actions
  getFieldName: (fieldName: string) => string;
  handleCountryChange: (e: AddressChangeEvent) => void;
  handlePostcodeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAddressLineFocus: () => void;
  handleAddressLineChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAddressLineKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleSelectSuggestion: (address: AddressSuggestion) => Promise<void>;
  setShowManualEntry: (show: boolean) => void;
  setShowSuggestions: (show: boolean) => void;
  setAddressLineValue: (value: string) => void;
  setPostcodeValue: (value: string) => void;
}

interface UseSmartAddressInputVMParams {
  values?: Record<string, string>;
  onChange: (e: AddressChangeEvent) => void;
  errors?: Record<string, string>;
  fieldPrefix?: string;
}

const useSmartAddressInputVM = ({
  values = {},
  onChange,
  fieldPrefix = '',
}: UseSmartAddressInputVMParams): SmartAddressInputVM => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [addressMetadata, setAddressMetadata] = useState<AddressMetadata | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const [postcodeValue, setPostcodeValue] = useState('');
  const [addressLineValue, setAddressLineValue] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition>({ top: 0, left: 0, width: 0 });

  const addressLineRef = useRef<HTMLDivElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);

  const getFieldName = useCallback((fieldName: string): string => {
    return fieldPrefix ? `${fieldPrefix}_${fieldName}` : fieldName;
  }, [fieldPrefix]);

  // Initialize from existing values
  useEffect(() => {
    const countryFieldName = getFieldName('country');
    const existingCountry = values[countryFieldName];
    if (existingCountry && existingCountry !== selectedCountry) {
      setSelectedCountry(existingCountry);
    }

    const postcodeFieldName = getFieldName('postal_code');
    const existingPostcode = values[postcodeFieldName];
    if (existingPostcode && existingPostcode !== postcodeValue) {
      setPostcodeValue(existingPostcode);
    }
  }, [values, getFieldName, selectedCountry, postcodeValue]);

  // Update metadata when country changes
  useEffect(() => {
    if (selectedCountry) {
      const countryCode = addressMetadataService.getCountryCode(selectedCountry);

      addressMetadataService.fetchAddressMetadata(countryCode).then(metadata => {
        setAddressMetadata(metadata);
      }).catch(error => {
        console.error('Failed to fetch address metadata, using fallback:', error);
        const fallbackMetadata = addressMetadataService.getAddressMetadata(countryCode);
        setAddressMetadata(fallbackMetadata);
      });

      setPostcodeValue('');
      setAddressSuggestions([]);
      setShowSuggestions(false);
      setShowManualEntry(false);
    } else {
      setAddressMetadata(null);
    }
  }, [selectedCountry]);

  const handleCountryChange = (e: AddressChangeEvent) => {
    const country = e.target.value;
    setSelectedCountry(country);

    const countryFieldName = getFieldName('country');
    if (onChange) {
      onChange({
        target: {
          name: countryFieldName,
          value: country
        }
      });
    }
  };

  const handlePostcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPostcodeValue(value);

    const postcodeFieldName = getFieldName('postal_code');
    if (onChange) {
      onChange({
        target: {
          name: postcodeFieldName,
          value: value
        }
      });
    }

    setAddressSuggestions([]);
    setShowSuggestions(false);
  };

  const calculateDropdownPosition = useCallback(() => {
    if (addressLineRef.current) {
      const rect = addressLineRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width
      });
    }
  }, []);

  const handleAddressLineFocus = () => {
    if (addressMetadata?.addressLookupSupported) {
      calculateDropdownPosition();
    }
  };

  const handleAddressLineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddressLineValue(value);

    const addressFieldName = getFieldName('address');
    if (onChange) {
      onChange({
        target: {
          name: addressFieldName,
          value: value
        }
      });
    }
  };

  const handleAddressLineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      if (addressMetadata?.addressLookupSupported) {
        const needsPostcode = addressMetadata.requiresPostcodeForLookup !== false;

        if (!needsPostcode || postcodeValue) {
          calculateDropdownPosition();
          performAddressLookup(postcodeValue || '', addressLineValue);
        }
      }
    }
  };

  const performAddressLookup = useCallback(async (postcode: string, addressLine: string) => {
    if (!addressLine || !addressLine.trim()) {
      setIsLoadingSuggestions(false);
      return;
    }

    const countryCode = addressMetadataService.getCountryCode(selectedCountry);
    if (!countryCode || !ADDRESS_METADATA[countryCode.toUpperCase()]) {
      setIsLoadingSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      const lookupCountryCode = addressMetadataService.getCountryCode(selectedCountry) || 'GB';
      const hasPostcode = addressMetadata?.hasPostcode;

      let queryParams = `query=${encodeURIComponent(addressLine)}&country=${lookupCountryCode}`;

      if (lookupCountryCode === 'GB' && hasPostcode && postcode && postcode.trim()) {
        queryParams += `&postcode=${encodeURIComponent(postcode)}`;
      } else if (hasPostcode && postcode && postcode.trim()) {
        queryParams = `query=${encodeURIComponent(postcode + ' ' + addressLine)}&country=${lookupCountryCode}`;
      }

      const res = await fetch(
        (config as any).apiBaseUrl + `/api/utils/address-lookup/?${queryParams}`
      );

      if (res.status === 200) {
        const data = await res.json();

        const addresses: AddressSuggestion[] = (data.addresses || []).map((addr: any) => {
          const cleanComponent = (str: string | undefined): string => {
            if (!str) return '';
            return str.trim().replace(/[,\s]+$/, '');
          };

          const addressParts = [
            cleanComponent(addr.sub_building_name),
            cleanComponent(addr.building_name),
            cleanComponent(addr.line_1),
            cleanComponent(addr.line_2)
          ].filter(Boolean);

          return {
            id: addr.id || "",
            line1: cleanComponent(addr.line_1),
            line2: cleanComponent(addr.line_2),
            town: cleanComponent(addr.town_or_city),
            county: cleanComponent(addr.county),
            postcode: cleanComponent(addr.postcode),
            country: selectedCountry,
            state: "",
            district: "",
            sub_building_name: cleanComponent(addr.sub_building_name),
            building_name: cleanComponent(addr.building_name),
            building_number: cleanComponent(addr.building_number),
            fullAddress: addressParts.join(', ')
          };
        });

        setAddressSuggestions(addresses);
        setShowSuggestions(addresses.length > 0);
      }
    } catch (error) {
      console.error('Address lookup failed:', error);
      setAddressSuggestions([]);
      setShowSuggestions(true);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [addressMetadata, selectedCountry]);

  const handleSelectSuggestion = async (address: AddressSuggestion) => {
    let resolvedAddress: any = address;

    if (address.id) {
      try {
        const countryCode = addressMetadataService.getCountryCode(selectedCountry);

        const res = await fetch(
          (config as any).apiBaseUrl + `/api/utils/address-retrieve/?id=${encodeURIComponent(address.id)}&country=${countryCode}`
        );

        if (res.status === 200) {
          const data = await res.json();

          if (data.addresses && data.addresses.length > 0) {
            resolvedAddress = data.addresses[0];
          }
        }
      } catch (error) {
        console.error('Error retrieving full address details:', error);
      }
    }

    const countryCode = addressMetadataService.getCountryCode(selectedCountry);

    let baseMetadata: AddressMetadata;
    try {
      baseMetadata = await addressMetadataService.fetchAddressMetadata(countryCode);
    } catch (error) {
      console.error('Failed to fetch metadata for address population, using fallback:', error);
      baseMetadata = addressMetadataService.getAddressMetadata(countryCode);
    }

    const cleanComponent = (str: string | undefined): string => {
      if (!str) return '';
      return str.trim().replace(/[,\s]+$/, '');
    };

    const updatedFormData: Record<string, string> = {};

    const allFields = addressMetadataService.getAllFields(countryCode || '');
    allFields.forEach(fieldName => {
      if (!baseMetadata.fields[fieldName]) return;

      const fullFieldName = getFieldName(fieldName);

      switch(fieldName) {
        case 'address': {
          const addressParts = [
            cleanComponent(resolvedAddress.sub_building_name),
            cleanComponent(resolvedAddress.building_name),
            cleanComponent(resolvedAddress.line_1),
            cleanComponent(resolvedAddress.line_2)
          ].filter(Boolean);
          updatedFormData[fullFieldName] = addressParts.join(', ') || cleanComponent(resolvedAddress.line_1) || '';
          break;
        }
        case 'city':
          updatedFormData[fullFieldName] = cleanComponent(resolvedAddress.town_or_city || resolvedAddress.town || resolvedAddress.city || '');
          break;
        case 'state':
          updatedFormData[fullFieldName] = cleanComponent(resolvedAddress.state || resolvedAddress.county || '');
          break;
        case 'postal_code':
          updatedFormData[fullFieldName] = cleanComponent(resolvedAddress.postcode || '');
          break;
        case 'county':
          updatedFormData[fullFieldName] = cleanComponent(resolvedAddress.county || '');
          break;
        case 'sub_building_name':
          updatedFormData[fullFieldName] = cleanComponent(resolvedAddress.sub_building_name || '');
          break;
        case 'building_name':
          updatedFormData[fullFieldName] = cleanComponent(resolvedAddress.building_name || '');
          break;
        case 'building_number':
          updatedFormData[fullFieldName] = cleanComponent(resolvedAddress.building_number || '');
          break;
        default:
          if (resolvedAddress[fieldName]) {
            updatedFormData[fullFieldName] = cleanComponent(resolvedAddress[fieldName]);
          }
          break;
      }
    });

    Object.keys(updatedFormData).forEach(fieldName => {
      if (onChange) {
        onChange({
          target: {
            name: fieldName,
            value: updatedFormData[fieldName]
          }
        });
      }
    });

    setAddressSuggestions([]);
    setShowSuggestions(false);
    setAddressLineValue(updatedFormData[getFieldName('address')] || '');
    setPostcodeValue(updatedFormData[getFieldName('postal_code')] || '');

    setTimeout(() => {
      setShowManualEntry(true);
    }, 0);
  };

  // Handle click outside to close suggestions and window resize/scroll
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          addressLineRef.current && !addressLineRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    const handleScrollOrResize = () => {
      if (showSuggestions) {
        calculateDropdownPosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [showSuggestions, calculateDropdownPosition]);

  return {
    selectedCountry,
    addressMetadata,
    showManualEntry,
    postcodeValue,
    addressLineValue,
    addressSuggestions,
    isLoadingSuggestions,
    showSuggestions,
    dropdownPosition,
    addressLineRef,
    suggestionsRef,
    getFieldName,
    handleCountryChange,
    handlePostcodeChange,
    handleAddressLineFocus,
    handleAddressLineChange,
    handleAddressLineKeyDown,
    handleSelectSuggestion,
    setShowManualEntry,
    setShowSuggestions,
    setAddressLineValue,
    setPostcodeValue,
  };
};

export default useSmartAddressInputVM;
