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

  // Debug: Log state changes
  useEffect(() => {
    console.log('🔍 addressLineValue changed:', addressLineValue);
  }, [addressLineValue]);

  useEffect(() => {
    console.log('🔍 showSuggestions changed:', showSuggestions);
    console.log('🔍 addressSuggestions.length:', addressSuggestions.length);
  }, [showSuggestions, addressSuggestions]);
  
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

      // Reset lookup fields when country changes (but NOT on every value change)
      setPostcodeValue('');
      // DON'T reset addressLineValue - it's managed by user input for search
      // setAddressLineValue('');

      setAddressSuggestions([]);
      setShowSuggestions(false);
      setShowManualEntry(false);
    } else {
      setAddressMetadata(null);
    }
  }, [selectedCountry]); // ONLY trigger when country changes, NOT on every value change

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
    // Just calculate dropdown position, don't trigger API call
    // API call only happens on Enter key press
    if (addressMetadata?.addressLookupSupported) {
      calculateDropdownPosition();
    }
  };

  // Handle address line change (no automatic API call)
  const handleAddressLineChange = (e) => {
    const value = e.target.value;
    console.log('🔍 handleAddressLineChange called with value:', value);
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

    // No automatic API calls - user must press Enter
  };

  // Handle Enter key press to trigger address lookup
  const handleAddressLineKeyDown = (e) => {
    console.log('🔍 handleAddressLineKeyDown called, key:', e.key);

    if (e.key === 'Enter') {
      console.log('🔍 Enter key pressed!');
      console.log('🔍 addressLineValue:', addressLineValue);
      console.log('🔍 postcodeValue:', postcodeValue);
      console.log('🔍 addressMetadata:', addressMetadata);

      e.preventDefault(); // Prevent form submission

      if (addressMetadata?.addressLookupSupported) {
        const needsPostcode = addressMetadata.requiresPostcodeForLookup !== false;
        console.log('🔍 needsPostcode:', needsPostcode);

        if (!needsPostcode || postcodeValue) {
          console.log('🔍 Calling performAddressLookup...');
          calculateDropdownPosition();
          // Trigger API call immediately on Enter
          performAddressLookup(postcodeValue || '', addressLineValue);
        } else {
          console.log('❌ Blocked: needsPostcode but no postcodeValue');
        }
      } else {
        console.log('❌ addressLookupSupported is false or addressMetadata is null');
      }
    }
  };

  // Perform address lookup
  const performAddressLookup = useCallback(async (postcode, addressLine) => {
    if (!addressMetadata?.addressLookupSupported) return;

    // Don't perform lookup if no search query
    if (!addressLine || !addressLine.trim()) {
      setIsLoadingSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);

    try {
      // Get country code for API call
      const countryCode = addressMetadataService.getCountryCode(selectedCountry) || 'GB';

      // Check if country uses postcode from metadata
      const hasPostcode = addressMetadata.hasPostcode;

      // Build query parameters based on country and postcode availability
      let queryParams = `query=${encodeURIComponent(addressLine)}&country=${countryCode}`;

      // Postcoder API postcode handling:
      // 1. UK (GB): Use separate 'postcode' parameter (Postcoder only supports this for UK)
      // 2. Countries without postcode (HK): Don't include postcode at all
      // 3. Other countries with postcode (TW, etc.): Combine postcode + address in 'query' parameter
      if (countryCode === 'GB' && hasPostcode && postcode && postcode.trim()) {
        // UK: Use separate postcode parameter
        queryParams += `&postcode=${encodeURIComponent(postcode)}`;
      } else if (hasPostcode && postcode && postcode.trim()) {
        // Other countries with postcode: Combine postcode + address in query
        queryParams = `query=${encodeURIComponent(postcode + ' ' + addressLine)}&country=${countryCode}`;
      }
      // If no postcode or hasPostcode is false: query is already set to just addressLine

      console.log('🔍 API Call:', config.apiBaseUrl + `/api/utils/address-lookup/?${queryParams}`);

      const res = await fetch(
        config.apiBaseUrl + `/api/utils/address-lookup/?${queryParams}`
      );

      if (res.status === 200) {
        const data = await res.json();
        console.log('🔍 API Response:', data);

        const addresses = (data.addresses || []).map(addr => {
          console.log('🔍 Processing address:', addr);

          const mappedAddr = {
            id: addr.id || "",  // Preserve ID for retrieve endpoint
            line1: addr.line_1 || "",
            line2: addr.line_2 || "",
            town: addr.town_or_city || "",
            county: addr.county || "",
            postcode: addr.postcode || "",
            country: selectedCountry,
            state: "",
            district: "",
            building: addr.building_name || "",
            fullAddress: [addr.building_name, addr.line_1, addr.line_2].filter(Boolean).join(', ')
          };

          console.log('🔍 Mapped address:', mappedAddr);
          return mappedAddr;
        });

        console.log('🔍 All mapped addresses:', addresses);

        // Don't filter on the frontend - show all results from API
        // The API already filtered based on the query
        setAddressSuggestions(addresses);
        setShowSuggestions(addresses.length > 0);

        console.log('🔍 Setting suggestions, count:', addresses.length);
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
  const handleSelectSuggestion = async (address) => {
    console.log('🔍 Selected address suggestion:', address);
    console.log('🔍 Address ID:', address.id);

    // If address has an ID, call retrieve endpoint to get full details
    if (address.id) {
      try {
        console.log('🔍 Calling retrieve endpoint with ID:', address.id);
        const countryCode = addressMetadataService.getCountryCode(selectedCountry);

        const res = await fetch(
          config.apiBaseUrl + `/api/utils/address-retrieve/?id=${encodeURIComponent(address.id)}&country=${countryCode}`
        );

        if (res.status === 200) {
          const data = await res.json();
          console.log('🔍 Retrieve endpoint response:', data);

          if (data.addresses && data.addresses.length > 0) {
            // Use the full address details from retrieve endpoint
            address = data.addresses[0];
            console.log('🔍 Using full address from retrieve:', address);
          }
        } else {
          console.error('❌ Retrieve endpoint failed:', res.status);
          // Fall back to using the autocomplete suggestion (incomplete data)
        }
      } catch (error) {
        console.error('❌ Error calling retrieve endpoint:', error);
        // Fall back to using the autocomplete suggestion (incomplete data)
      }
    }

    const countryCode = addressMetadataService.getCountryCode(selectedCountry);
    const baseMetadata = addressMetadataService.getAddressMetadata(countryCode);

    // Create updated form data with the selected address (now with full details!)
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
          if (address.building_name) addressParts.push(address.building_name);
          if (address.line_1) addressParts.push(address.line_1);
          if (address.line_2) addressParts.push(address.line_2);
          updatedFormData[fullFieldName] = addressParts.join(', ') || address.line_1 || '';
          break;

        case 'city':
          updatedFormData[fullFieldName] = address.town_or_city || address.town || address.city || '';
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
								<Grid size={{ xs: addressMetadata.hasPostcode ? 8 : 12, md: addressMetadata.hasPostcode ? 9 : 12 }}>
									<Box sx={{ position: "relative" }}>
										<TextField
											fullWidth
											required
											ref={addressLineRef}
											label="Address"
											value={addressLineValue}
											onChange={handleAddressLineChange}
											onKeyDown={handleAddressLineKeyDown}
											onFocus={handleAddressLineFocus}
											placeholder="Type address and press Enter to search..."
											disabled={
												// Only disable if country requires postcode for lookup AND no postcode entered
												// Hong Kong (requiresPostcodeForLookup: false) will always be enabled
												addressMetadata.requiresPostcodeForLookup === true && !postcodeValue
											}
											inputProps={{
												maxLength: 999,  // Set high limit instead of undefined
											}}
											InputProps={{
												endAdornment: isLoadingSuggestions && (
													<CircularProgress size={20} />
												),
											}}
											sx={{
												"& .MuiInputBase-root": {
													width: "16rem",
													"& .MuiInputBase-input": {
														color: "text.primary",  // Ensure text is visible
														opacity: 1,  // Ensure opacity is full
													},
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