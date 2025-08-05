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
  
  
  // Get field name with prefix
  const getFieldName = useCallback((fieldName) => {
    return fieldPrefix ? `${fieldPrefix}_${fieldName}` : fieldName;
  }, [fieldPrefix]);

  // Initialize from existing values
  useEffect(() => {
    const countryFieldName = getFieldName('country');
    const existingCountry = values[countryFieldName];
    if (existingCountry && existingCountry !== selectedCountry) {
      setSelectedCountry(existingCountry);
    }
  }, [values, getFieldName, selectedCountry]);

  // Update metadata when country changes
  useEffect(() => {
    if (selectedCountry) {
      const countryCode = addressMetadataService.getCountryCode(selectedCountry);
      const metadata = addressMetadataService.getAddressMetadata(countryCode);
      setAddressMetadata(metadata);
      
      // Reset address lookup fields when country changes
      setPostcodeValue('');
      setAddressLineValue('');
      setAddressSuggestions([]);
      setShowSuggestions(false);
      setShowManualEntry(false);
    } else {
      setAddressMetadata(null);
    }
  }, [selectedCountry]);

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
    if (addressMetadata?.addressLookupSupported && postcodeValue) {
      calculateDropdownPosition();
      if (addressLineValue.length >= 3) {
        // If we have text, perform lookup
        performAddressLookup(postcodeValue, addressLineValue);
      } else {
        // Show dropdown with just "Enter address manually" option
        setAddressSuggestions([]);
        setShowSuggestions(true);
      }
    }
  };

  // Handle address line change with autocomplete
  const handleAddressLineChange = (e) => {
    const value = e.target.value;
    setAddressLineValue(value);
    
    // Trigger address lookup for UK when we have postcode and at least 3 characters
    if (addressMetadata?.addressLookupSupported && postcodeValue && value.length >= 3) {
      calculateDropdownPosition();
      performAddressLookup(postcodeValue, value);
    } else if (addressMetadata?.addressLookupSupported && postcodeValue) {
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
    setShowManualEntry(true);
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
							Select your country, then enter your postcode and first
							line of address
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
											slotProps={{
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
								<Grid size={{ xs: 8, md: 9 }}>
									<Box sx={{ position: "relative" }}>
										<TextField
											fullWidth
											required
											ref={addressLineRef}
											label="Address"
											value={addressLineValue}
											onChange={handleAddressLineChange}
											onFocus={handleAddressLineFocus}
											placeholder="First line of address..."
											disabled={
												addressMetadata.hasPostcode &&
												!postcodeValue
											}
											slotProps={{
												endAdornment: isLoadingSuggestions && (
													<CircularProgress size={20} />
												),
											}}
											sx={{
												"& .MuiInputBase-root": {
													width: "16rem",
													"& .MuiInputBase-input": {},
												},
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
													{addressSuggestions.map((addr, idx) => (
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
																secondary={`${addr.town}, ${addr.postcode}`}
															/>
														</ListItem>
													))}

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