import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Grid,
  Button,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  Typography,
  TextField
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import PropTypes from 'prop-types';
import CountryAutocomplete from '../User/CountryAutocomplete';
import DynamicAddressForm from './DynamicAddressForm';
import addressMetadataService from '../../services/addressMetadataService';
import useHKAddressLookup from '../../hooks/useHKAddressLookup';
import config from '../../config';
import { useTheme } from '@mui/material/styles';
const SmartAddressInput = ({
  values = {},
  onChange,
  errors = {},
  fieldPrefix = '',
  className = ''
}) => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [addressMetadata, setAddressMetadata] = useState(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  // Address lookup states
  const [postcodeValue, setPostcodeValue] = useState('');
  const [addressLineValue, setAddressLineValue] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const addressLineRef = useRef(null);
  const suggestionsRef = useRef(null);
  const theme = useTheme();

  // Hong Kong address lookup hook
  const {
    addresses: hkAddresses,
    isLoading: hkLoading,
    searchAddresses: searchHK,
    clearAddresses: clearHK
  } = useHKAddressLookup();

  // Get field name with prefix
  const getFieldName = useCallback((fieldName) => {
    return fieldPrefix ? `${fieldPrefix}_${fieldName}` : fieldName;
  }, [fieldPrefix]);

  // Helper: Map HK region code to area name
  const mapRegionToArea = useCallback((region) => {
    const mapping = {
      'HK': 'Hong Kong Island',
      'KLN': 'Kowloon',
      'NT': 'New Territories'
    };
    return mapping[region] || '';
  }, []);

  // Helper: Map HK address to common format
  const mapHKAddress = useCallback((addr) => ({
    fullAddress: addr.formatted_address,
    building: addr.building,
    line1: addr.street,
    line2: '',
    town: addr.district,
    county: mapRegionToArea(addr.region),
    state: mapRegionToArea(addr.region),
    postcode: '',
    country: selectedCountry,
    // HK-specific fields
    district: addr.district,
    region: addr.region,
    is_3d: addr.is_3d
  }), [selectedCountry, mapRegionToArea]);

  // Initialize from existing values
  useEffect(() => {
    const countryFieldName = getFieldName('country');
    const existingCountry = values[countryFieldName];
    if (existingCountry && existingCountry !== selectedCountry) {
      setSelectedCountry(existingCountry);
    }

    // Initialize postcode from existing values
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
      const metadata = addressMetadataService.getAddressMetadata(countryCode);
      setAddressMetadata(metadata);

      // Only reset address lookup fields if we're not preserving existing values
      // Check if we have existing postal_code in values - if so, don't reset
      const postcodeFieldName = getFieldName('postal_code');
      const existingPostcode = values[postcodeFieldName];

      if (!existingPostcode) {
        // No existing postcode, safe to reset
        setPostcodeValue('');
        setAddressLineValue('');
      }

      setAddressSuggestions([]);
      setShowSuggestions(false);
      setShowManualEntry(false);

      // Clear HK addresses when changing countries
      clearHK();
    } else {
      setAddressMetadata(null);
    }
  }, [selectedCountry, getFieldName, values, clearHK]);

  // Sync HK addresses to suggestions when they change
  useEffect(() => {
    if (addressMetadata && addressMetadataService.getCountryCode(selectedCountry) === 'HK') {
      const mappedAddresses = hkAddresses.map(mapHKAddress);
      setAddressSuggestions(mappedAddresses);
      setIsLoadingSuggestions(hkLoading);
    }
  }, [hkAddresses, hkLoading, selectedCountry, addressMetadata, mapHKAddress]);

  // Handle country selection
  const handleCountryChange = (e) => {
    const country = e.target.value;
    setSelectedCountry(country);
    
    // Update the form with the selected country
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

  // Handle postcode change
  const handlePostcodeChange = (e) => {
    const value = e.target.value;
    setPostcodeValue(value);

    // Update parent form
    const postcodeFieldName = getFieldName('postal_code');
    if (onChange) {
      onChange({
        target: {
          name: postcodeFieldName,
          value: value
        }
      });
    }

    // Clear suggestions when postcode changes
    setAddressSuggestions([]);
    setShowSuggestions(false);
  };

  // Calculate dropdown position
  const calculateDropdownPosition = useCallback(() => {
    if (addressLineRef.current) {
      const rect = addressLineRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.height + 8,
        left: 0,
        width: '100%'
      });
    }
  }, []);

  // Handle address line focus
  const handleAddressLineFocus = () => {
    const countryCode = addressMetadataService.getCountryCode(selectedCountry);
    const isHK = countryCode === 'HK';

    if (addressMetadata?.addressLookupSupported) {
      calculateDropdownPosition();

      // Hong Kong: Show dropdown if we have 3+ characters
      if (isHK && addressLineValue.length >= 3) {
        searchHK(addressLineValue);
        setShowSuggestions(true);
      }
      // UK: Show dropdown if we have postcode and text
      else if (!isHK && postcodeValue && addressLineValue.length >= 3) {
        performAddressLookup(postcodeValue, addressLineValue);
      }
      // Show "Enter manually" option
      else if (postcodeValue || isHK) {
        setAddressSuggestions([]);
        setShowSuggestions(true);
      }
    }
  };

  // Handle address line change with autocomplete
  const handleAddressLineChange = (e) => {
    const value = e.target.value;
    console.log('SmartAddressInput - Address change:', value, 'Country:', selectedCountry);
    setAddressLineValue(value);

    // Update parent form
    const addressFieldName = getFieldName('address');
    if (onChange) {
      onChange({
        target: {
          name: addressFieldName,
          value: value
        }
      });
    }

    const countryCode = addressMetadataService.getCountryCode(selectedCountry);
    const isHK = countryCode === 'HK';
    console.log('SmartAddressInput - Country code:', countryCode, 'Is HK:', isHK);

    // Hong Kong: Trigger lookup on 3+ characters (no postcode required)
    if (isHK && value.length >= 3) {
      calculateDropdownPosition();
      searchHK(value);
      setShowSuggestions(true);
    }
    // UK: Trigger address lookup when we have postcode and at least 3 characters
    else if (addressMetadata?.addressLookupSupported && postcodeValue && value.length >= 3) {
      calculateDropdownPosition();
      performAddressLookup(postcodeValue, value);
    } else if (addressMetadata?.addressLookupSupported && (postcodeValue || isHK)) {
      // Show dropdown with just "Enter address manually" option when focused but no matching addresses
      calculateDropdownPosition();
      setAddressSuggestions([]);
      setShowSuggestions(true);
    } else {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Perform address lookup
  const performAddressLookup = useCallback(async (postcode, addressLine) => {
    if (!addressMetadata?.addressLookupSupported) return;
    
    setIsLoadingSuggestions(true);
    
    try {
      const res = await fetch(
        config.apiBaseUrl + `/api/utils/address-lookup/?postcode=${encodeURIComponent(postcode)}`
      );
      
      if (res.status === 200) {
        const data = await res.json();
        const addresses = (data.addresses || []).map(addr => ({
          line1: addr.line_1 || "",
          line2: addr.line_2 || "",
          town: addr.town_or_city || "",
          county: addr.county || "",
          postcode: addr.postcode || postcode,
          country: selectedCountry,
          state: "",
          district: "",
          building: addr.building_name || "",
          fullAddress: [addr.building_name, addr.line_1, addr.line_2].filter(Boolean).join(', ')
        }));
        
        // Filter addresses that match the typed address line
        const filteredAddresses = addresses.filter(addr => 
          addr.fullAddress.toLowerCase().includes(addressLine.toLowerCase()) ||
          addr.line1.toLowerCase().includes(addressLine.toLowerCase())
        );
        
        setAddressSuggestions(filteredAddresses);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Address lookup failed:', error);
      setAddressSuggestions([]);
      setShowSuggestions(true);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [addressMetadata, selectedCountry]);

  // Handle address suggestion selection
  const handleSelectSuggestion = (address) => {
    const countryCode = addressMetadataService.getCountryCode(selectedCountry);
    const baseMetadata = addressMetadataService.getAddressMetadata(countryCode);
    
    // Create updated form data with the selected address
    const updatedFormData = {};
    
    // Map fields based on what the country's metadata expects (including optional fields)
    const allFields = addressMetadataService.getAllFields(countryCode);
    allFields.forEach(fieldName => {
      // Only process fields that are defined in the metadata
      if (!baseMetadata.fields[fieldName]) return;
      
      const fullFieldName = getFieldName(fieldName);
      
      switch(fieldName) {
        case 'address':
          const addressParts = [];
          if (address.building) addressParts.push(address.building);
          if (address.line1) addressParts.push(address.line1);
          if (address.line2) addressParts.push(address.line2);
          updatedFormData[fullFieldName] = addressParts.join(', ') || address.line1 || '';
          break;
          
        case 'city':
          updatedFormData[fullFieldName] = address.town || address.city || '';
          break;
          
        case 'state':
          updatedFormData[fullFieldName] = address.state || address.county || '';
          break;
          
        case 'postal_code':
          updatedFormData[fullFieldName] = address.postcode || '';
          break;
          
        case 'county':
          updatedFormData[fullFieldName] = address.county || '';
          break;
          
          
        default:
          if (address[fieldName]) {
            updatedFormData[fullFieldName] = address[fieldName];
          }
          break;
      }
    });
    
    // Update form with all the address data
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

    // Clear suggestions and update local state
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setAddressLineValue(updatedFormData[getFieldName('address')] || '');
    setPostcodeValue(updatedFormData[getFieldName('postal_code')] || '');

    // Delay showing manual entry to ensure parent state has updated
    setTimeout(() => {
      setShowManualEntry(true);
    }, 0);
  };

  // Handle click outside to close suggestions and window resize/scroll
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target) &&
          addressLineRef.current && !addressLineRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  return (
		<Box className={`smart-address-input ${className}`}>
			{/* Country Selection - Always First */}
			<Grid container spacing={3}>
				<Grid size={{ xs: 12, md: 3 }}>
					<CountryAutocomplete
						name={getFieldName("country")}
						value={selectedCountry}
						onChange={handleCountryChange}
						isInvalid={!!errors[getFieldName("country")]}
						feedback={errors[getFieldName("country")]}
						placeholder="Select country first"
						label="Country *"
						variant="standard"
					/>
				</Grid>
				<Grid size={{ xs: 12, md: 9 }}>
					<Alert
						severity="info"
						sx={{ textAlign: "left", alignItems: "center" }}>
						<Typography variant="body2">
							{(() => {
								const countryCode = addressMetadataService.getCountryCode(selectedCountry);
								const isHK = countryCode === 'HK';
								return isHK
									? 'Select your country, then enter your address to search'
									: 'Select your country, then enter your postcode and first line of address';
							})()}
						</Typography>
					</Alert>
				</Grid>
			</Grid>

			{/* Country-Specific Address Input */}
			{addressMetadata && (
				<>
					{/* Address Lookup Section (for supported countries) */}
					{addressMetadata.addressLookupSupported && !showManualEntry && (
						<Box sx={{ mb: 4 }}>
							{(() => {
								const countryCode = addressMetadataService.getCountryCode(selectedCountry);
								const isDisabled = countryCode !== 'HK' && addressMetadata.hasPostcode && !postcodeValue;
								console.log('SmartAddressInput - Render:', {
									country: selectedCountry,
									countryCode,
									hasPostcode: addressMetadata.hasPostcode,
									postcodeValue,
									isDisabled,
									addressLookupSupported: addressMetadata.addressLookupSupported,
									showManualEntry
								});
								return null;
							})()}
							<Grid container spacing={3}>
								{/* Postcode Field */}
								{addressMetadata.hasPostcode && (
									<Grid size={{ xs: 4, md: 3 }}>
										<TextField
											fullWidth
											required
											label={
												addressMetadata.fields.postal_code?.label ||
												"Postcode"
											}
											value={postcodeValue}
											onChange={handlePostcodeChange}
											placeholder={
												addressMetadata.fields.postal_code
													?.placeholder || "Enter postcode"
											}
											inputProps={{
												style: addressMetadata.fields.postal_code
													?.transform
													? { textTransform: "uppercase" }
													: {},
											}}
											variant="standard"
										/>
									</Grid>
								)}

								{/* Address Line with Autocomplete */}
								<Grid size={addressMetadata.hasPostcode ? { xs: 8, md: 9 } : { xs: 12 }}>
									<Box sx={{ position: "relative" }}>
										<TextField
											fullWidth
											required
											ref={addressLineRef}
											label="Address"
											value={addressLineValue}
											onChange={handleAddressLineChange}
											onFocus={handleAddressLineFocus}
											placeholder={
												addressMetadataService.getCountryCode(selectedCountry) === 'HK'
													? 'Enter building, street, or district...'
													: 'First line of address...'
											}
											disabled={
												// Only disable for countries that require postcode (not HK)
												addressMetadataService.getCountryCode(selectedCountry) !== 'HK' &&
												addressMetadata.hasPostcode &&
												!postcodeValue
											}
											InputProps={{
												endAdornment: isLoadingSuggestions && (
													<CircularProgress size={20} />
												),
											}}
											variant="standard"
										/>

										{/* Address Suggestions Dropdown */}
										{showSuggestions && (
											<Paper
												ref={suggestionsRef}
												elevation={8}
												sx={{
													position: "absolute",
													top: `${dropdownPosition.top}px`,
													left: `${dropdownPosition.left}px`,
													width: dropdownPosition.width,
													zIndex: 1000,
													maxHeight: "300px",
													overflowY: "auto",
													bgcolor: theme.palette.liftkit.light.background,
													border: `1px solid ${theme.palette.divider}`,
												}}>
												<List disablePadding>
													{addressSuggestions.map((addr, idx) => {
														const countryCode = addressMetadataService.getCountryCode(selectedCountry);
														const isHK = countryCode === 'HK';
														// HK: Show district and region, UK: Show town and postcode
														const secondary = isHK
															? `${addr.town || addr.district}, ${addr.county || addr.state}`
															: `${addr.town}, ${addr.postcode}`;

														return (
															<ListItem
																key={idx}
																component="div"
																onClick={() =>
																	handleSelectSuggestion(addr)
																}
																divider={true}
																sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}>
																<ListItemText
																	primary={addr.fullAddress}
																	secondary={secondary}
																/>
															</ListItem>
														);
													})}

													{/* Manual Entry Option */}
													<Box
														sx={{
															display: "flex",
															justifyContent: "center",
															alignItems: "center",
															p: 2,
															bgcolor:
																theme.palette.liftkit.light
																	.background,
														}}>
														<Button
															variant="outlined"
															startIcon={<Edit />}
															onClick={() =>
																setShowManualEntry(true)
															}
															sx={{
																bgcolor:
																	theme.palette.liftkit.dark
																		.primary,
																border: 1,
																borderColor:
																	theme.palette.liftkit.dark
																		.primary,
																color: theme.palette.liftkit
																	.dark.onPrimary,
																"&:hover": {
																	bgcolor:
																		theme.palette.liftkit.dark
																			.primary,
																},
																mr: 2,
															}}
															size="small">
															Enter address manually
														</Button>
													</Box>
												</List>
											</Paper>
										)}

										{/* Manual Entry Link (when no suggestions) */}
										{/* {addressLineValue.length >= 3 &&
											!showSuggestions &&
											!isLoadingSuggestions && (
												<Box sx={{ textAlign: "center", mt: 2 }}>
													<Button
														variant="text"
														size="small"
														onClick={() =>
															setShowManualEntry(true)
														}
														startIcon={<Edit />}>
														Enter address manually
													</Button>
												</Box>
											)} */}
									</Box>
								</Grid>
							</Grid>
						</Box>
					)}

					{/* Manual Entry or Countries without Address Lookup */}
					{(showManualEntry ||
						!addressMetadata.addressLookupSupported) && (
						<Box>
							{addressMetadata.addressLookupSupported && (
								<Box sx={{ textAlign: "center", mb: 3 }}>
									<Button
										variant="text"
										onClick={() => {
											setShowManualEntry(false);
											setAddressLineValue("");
											setPostcodeValue("");
										}}>
										← Back to address lookup
									</Button>
								</Box>
							)}

							<DynamicAddressForm
								country={selectedCountry}
								values={values}
								onChange={onChange}
								errors={errors}
								fieldPrefix={fieldPrefix}
								showOptionalFields={true}
							/>
						</Box>
					)}
				</>
			)}
		</Box>
  );
};

SmartAddressInput.propTypes = {
  values: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  errors: PropTypes.object,
  fieldPrefix: PropTypes.string,
  className: PropTypes.string
};

export default SmartAddressInput;