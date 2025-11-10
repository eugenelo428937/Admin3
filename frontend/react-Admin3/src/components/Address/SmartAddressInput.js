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
  TextField,
  Portal
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import PropTypes from 'prop-types';
import CountryAutocomplete from '../User/CountryAutocomplete';
import DynamicAddressForm from './DynamicAddressForm';
import addressMetadataService, { ADDRESS_METADATA } from '../../services/addressMetadataService';
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

    // Initialize postcode from existing values
    const postcodeFieldName = getFieldName('postal_code');
    const existingPostcode = values[postcodeFieldName];
    if (existingPostcode && existingPostcode !== postcodeValue) {
      setPostcodeValue(existingPostcode);
    }
  }, [values, getFieldName, selectedCountry, postcodeValue]);

  // Update metadata when country changes (async - fetches from Google API)
  useEffect(() => {
    if (selectedCountry) {
      const countryCode = addressMetadataService.getCountryCode(selectedCountry);

      // Fetch metadata asynchronously from Google API
      addressMetadataService.fetchAddressMetadata(countryCode).then(metadata => {
        setAddressMetadata(metadata);
      }).catch(error => {
        console.error('Failed to fetch address metadata, using fallback:', error);
        // Fallback to synchronous method
        const fallbackMetadata = addressMetadataService.getAddressMetadata(countryCode);
        setAddressMetadata(fallbackMetadata);
      });

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

  // Calculate dropdown position (absolute viewport position for Portal)
  const calculateDropdownPosition = useCallback(() => {
    if (addressLineRef.current) {
      const rect = addressLineRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8, // Position below the input
        left: rect.left,
        width: rect.width
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
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission

      if (addressMetadata?.addressLookupSupported) {
        const needsPostcode = addressMetadata.requiresPostcodeForLookup !== false;

        if (!needsPostcode || postcodeValue) {
          calculateDropdownPosition();
          // Trigger API call immediately on Enter
          performAddressLookup(postcodeValue || '', addressLineValue);
        }
      }
    }
  };

  // Perform address lookup
  const performAddressLookup = useCallback(async (postcode, addressLine) => {
    // Don't perform lookup if no search query
    if (!addressLine || !addressLine.trim()) {
      setIsLoadingSuggestions(false);
      return;
    }

    // Only perform lookup for countries in ADDRESS_METADATA
    const countryCode = addressMetadataService.getCountryCode(selectedCountry);
    if (!countryCode || !ADDRESS_METADATA[countryCode.toUpperCase()]) {
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

      const res = await fetch(
        config.apiBaseUrl + `/api/utils/address-lookup/?${queryParams}`
      );

      if (res.status === 200) {
        const data = await res.json();

        const addresses = (data.addresses || []).map(addr => {
          // Helper to clean address components (trim whitespace and trailing punctuation)
          const cleanComponent = (str) => {
            if (!str) return '';
            return str.trim().replace(/[,\s]+$/, ''); // Remove trailing commas and whitespace
          };

          // Build comprehensive address display including flat/floor info
          const addressParts = [
            cleanComponent(addr.sub_building_name),  // Flat/unit/floor (e.g., "Flat A, 16/F")
            cleanComponent(addr.building_name),      // Building name (e.g., "Abbey Court")
            cleanComponent(addr.line_1),             // Street address
            cleanComponent(addr.line_2)              // Additional address line
          ].filter(Boolean);

          const mappedAddr = {
            id: addr.id || "",  // Preserve ID for retrieve endpoint
            line1: cleanComponent(addr.line_1),
            line2: cleanComponent(addr.line_2),
            town: cleanComponent(addr.town_or_city),
            county: cleanComponent(addr.county),
            postcode: cleanComponent(addr.postcode),
            country: selectedCountry,
            state: "",
            district: "",
            sub_building_name: cleanComponent(addr.sub_building_name),  // Flat/unit/floor
            building_name: cleanComponent(addr.building_name),          // Building name
            building_number: cleanComponent(addr.building_number),      // Street number
            fullAddress: addressParts.join(', ')
          };

          return mappedAddr;
        });

        // Don't filter on the frontend - show all results from API
        // The API already filtered based on the query
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

  // Handle address suggestion selection
  const handleSelectSuggestion = async (address) => {
    // If address has an ID, call retrieve endpoint to get full details
    if (address.id) {
      try {
        const countryCode = addressMetadataService.getCountryCode(selectedCountry);

        const res = await fetch(
          config.apiBaseUrl + `/api/utils/address-retrieve/?id=${encodeURIComponent(address.id)}&country=${countryCode}`
        );

        if (res.status === 200) {
          const data = await res.json();

          if (data.addresses && data.addresses.length > 0) {
            // Use the full address details from retrieve endpoint
            address = data.addresses[0];
          }
        }
      } catch (error) {
        console.error('Error retrieving full address details:', error);
        // Fall back to using the autocomplete suggestion (incomplete data)
      }
    }

    const countryCode = addressMetadataService.getCountryCode(selectedCountry);

    // Fetch metadata dynamically from Google API
    let baseMetadata;
    try {
      baseMetadata = await addressMetadataService.fetchAddressMetadata(countryCode);
    } catch (error) {
      console.error('Failed to fetch metadata for address population, using fallback:', error);
      baseMetadata = addressMetadataService.getAddressMetadata(countryCode);
    }

    // Helper to clean address components (trim whitespace and trailing punctuation)
    const cleanComponent = (str) => {
      if (!str) return '';
      return str.trim().replace(/[,\s]+$/, ''); // Remove trailing commas and whitespace
    };

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
          // Include ALL address components: flat/floor, building, street
          const addressParts = [
            cleanComponent(address.sub_building_name),  // Flat/unit/floor (e.g., "Flat A, 16/F")
            cleanComponent(address.building_name),      // Building name (e.g., "Abbey Court")
            cleanComponent(address.line_1),             // Street address
            cleanComponent(address.line_2)              // Additional address line
          ].filter(Boolean);
          updatedFormData[fullFieldName] = addressParts.join(', ') || cleanComponent(address.line_1) || '';
          break;

        case 'city':
          updatedFormData[fullFieldName] = cleanComponent(address.town_or_city || address.town || address.city || '');
          break;

        case 'state':
          updatedFormData[fullFieldName] = cleanComponent(address.state || address.county || '');
          break;

        case 'postal_code':
          updatedFormData[fullFieldName] = cleanComponent(address.postcode || '');
          break;

        case 'county':
          updatedFormData[fullFieldName] = cleanComponent(address.county || '');
          break;

        case 'sub_building_name':
          updatedFormData[fullFieldName] = cleanComponent(address.sub_building_name || '');
          break;

        case 'building_name':
          updatedFormData[fullFieldName] = cleanComponent(address.building_name || '');
          break;

        case 'building_number':
          updatedFormData[fullFieldName] = cleanComponent(address.building_number || '');
          break;

        default:
          if (address[fieldName]) {
            updatedFormData[fullFieldName] = cleanComponent(address[fieldName]);
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

    const handleScrollOrResize = () => {
      if (showSuggestions) {
        calculateDropdownPosition();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true); // Use capture to catch all scroll events
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [showSuggestions, calculateDropdownPosition]);

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
									<Box sx={{ position: "relative", display: "flex", gap: 2, alignItems: "flex-end" }}>
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

										

										{/* Address Suggestions Dropdown - Rendered in Portal to escape overflow */}
										{showSuggestions && (
											<Portal>
												<Paper
													ref={suggestionsRef}
													elevation={8}
													sx={{
														position: "fixed",
														top: `${dropdownPosition.top}px`,
														left: `${dropdownPosition.left}px`,
														width: `${dropdownPosition.width}px`,
														zIndex: 1300, // Above most MUI components
														maxHeight: "300px",
														overflowY: "auto",
														bgcolor: theme.palette.liftkit.light.background,
														border: `1px solid ${theme.palette.divider}`,
													}}>
													<List disablePadding>
													{addressSuggestions.map((addr, idx) => {
														// Build secondary text without trailing commas
														const secondaryParts = [addr.town, addr.postcode].filter(Boolean);
														const secondaryText = secondaryParts.join(', ');

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
																	secondary={secondaryText}
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
											</Portal>
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
                <Grid size={{xs:12}}>
                  {/* Manual Entry Button */}
										<Button
											variant="outlined"
											onClick={() => {
												setShowManualEntry(true);
												setShowSuggestions(false);
											}}
											size="small"
											sx={{ whiteSpace: "nowrap"}}
										>
											Manual Entry
										</Button>
                </Grid>
							</Grid>
						</Box>
					)}

					{/* Manual Entry or Countries without Address Lookup */}
					{(showManualEntry ||
						!addressMetadata.addressLookupSupported) && (
						<Box>
							<DynamicAddressForm
								country={selectedCountry}
								values={values}
								onChange={onChange}
								errors={errors}
								fieldPrefix={fieldPrefix}
								showOptionalFields={true}
								metadata={addressMetadata}
							/>
              {addressMetadata.addressLookupSupported && (
								<Box sx={{ textAlign: "center", mb: 3 }}>
									<Button
										variant="outlined"
										onClick={() => {
											setShowManualEntry(false);
											setAddressLineValue("");
											setPostcodeValue("");
										}}>
										Address Lookup
									</Button>
								</Box>
							)}
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