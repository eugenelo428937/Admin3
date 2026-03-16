import React from 'react';
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
import CountryAutocomplete from '../User/CountryAutocomplete.tsx';
import DynamicAddressForm from './DynamicAddressForm.tsx';
import useSmartAddressInputVM from './useSmartAddressInputVM';
import { useTheme } from '@mui/material/styles';
import type { AddressChangeEvent } from '../../types/address';

interface SmartAddressInputProps {
  values?: Record<string, string>;
  onChange: (e: AddressChangeEvent) => void;
  errors?: Record<string, string>;
  fieldPrefix?: string;
  className?: string;
}

const SmartAddressInput: React.FC<SmartAddressInputProps> = ({
  values = {},
  onChange,
  errors = {},
  fieldPrefix = '',
  className = ''
}) => {
  const theme = useTheme();
  const vm = useSmartAddressInputVM({ values, onChange, errors, fieldPrefix });

  return (
		<Box className={`smart-address-input ${className}`}>
			{/* Country Selection - Always First */}
			<Grid container spacing={3}>
				<Grid size={{ xs: 12, md: 3 }}>
					<CountryAutocomplete
						name={vm.getFieldName("country")}
						value={vm.selectedCountry}
						onChange={vm.handleCountryChange}
						isInvalid={!!errors[vm.getFieldName("country")]}
						feedback={errors[vm.getFieldName("country")]}
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
			{vm.addressMetadata && (
				<>
					{/* Address Lookup Section (for supported countries) */}
					{vm.addressMetadata.addressLookupSupported && !vm.showManualEntry && (
						<Box sx={{ mb: 4 }}>
							<Grid container spacing={3}>
								{/* Postcode Field */}
								{vm.addressMetadata.hasPostcode && (
									<Grid size={{ xs: 4, md: 3 }}>
										<TextField
											fullWidth
											required
											label={
												vm.addressMetadata.fields.postal_code?.label ||
												"Postcode"
											}
											value={vm.postcodeValue}
											onChange={vm.handlePostcodeChange}
											placeholder={
												vm.addressMetadata.fields.postal_code
													?.placeholder || "Enter postcode"
											}
											slotProps={{
												style: vm.addressMetadata.fields.postal_code
													?.transform
													? { textTransform: "uppercase" }
													: {},
											}}
											variant="standard"
										/>
									</Grid>
								)}

								{/* Address Line with Autocomplete */}
								<Grid size={{ xs: vm.addressMetadata.hasPostcode ? 8 : 12, md: vm.addressMetadata.hasPostcode ? 9 : 12 }}>
									<Box sx={{ position: "relative", display: "flex", gap: 2, alignItems: "flex-end" }}>
										<TextField
											fullWidth
											required
											ref={vm.addressLineRef}
											label="Address"
											value={vm.addressLineValue}
											onChange={vm.handleAddressLineChange}
											onKeyDown={vm.handleAddressLineKeyDown}
											onFocus={vm.handleAddressLineFocus}
											placeholder="Type address and press Enter to search..."
											disabled={
												vm.addressMetadata.requiresPostcodeForLookup === true && !vm.postcodeValue
											}
											inputProps={{
												maxLength: 999,
											}}
											InputProps={{
												endAdornment: vm.isLoadingSuggestions && (
													<CircularProgress size={20} />
												),
											}}
											sx={{
												"& .MuiInputBase-root": {
													width: "16rem",
													"& .MuiInputBase-input": {
														color: "text.primary",
														opacity: 1,
													},
												},
											}}
											variant="standard"
										/>

										{/* Address Suggestions Dropdown - Rendered in Portal to escape overflow */}
										{vm.showSuggestions && (
											<Portal>
												<Paper
													ref={vm.suggestionsRef}
													elevation={8}
													sx={{
														position: "fixed",
														top: `${vm.dropdownPosition.top}px`,
														left: `${vm.dropdownPosition.left}px`,
														width: `${vm.dropdownPosition.width}px`,
														zIndex: 1300,
														maxHeight: "300px",
														overflowY: "auto",
														bgcolor: 'background.paper',
														border: `1px solid ${(theme as any).palette.divider}`,
													}}>
													<List disablePadding>
													{vm.addressSuggestions.map((addr, idx) => {
														const secondaryParts = [addr.town, addr.postcode].filter(Boolean);
														const secondaryText = secondaryParts.join(', ');

														return (
															<ListItem
																key={idx}
																component="div"
																onClick={() =>
																	vm.handleSelectSuggestion(addr)
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
															bgcolor: 'background.paper',
														}}>
														<Button
															variant="outlined"
															startIcon={<Edit />}
															onClick={() =>
																vm.setShowManualEntry(true)
															}
															sx={{
																bgcolor: 'primary.main',
																border: 1,
																borderColor: 'primary.main',
																color: 'primary.contrastText',
																"&:hover": {
																	bgcolor: 'primary.dark',
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

									</Box>
								</Grid>
                <Grid size={{xs:12}}>
                  {/* Manual Entry Button */}
										<Button
											variant="outlined"
											onClick={() => {
												vm.setShowManualEntry(true);
												vm.setShowSuggestions(false);
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
					{(vm.showManualEntry ||
						!vm.addressMetadata.addressLookupSupported) && (
						<Box>
							<DynamicAddressForm
								country={vm.selectedCountry}
								values={values}
								onChange={onChange}
								errors={errors}
								fieldPrefix={fieldPrefix}
								showOptionalFields={true}
								metadata={vm.addressMetadata}
							/>
              {vm.addressMetadata.addressLookupSupported && (
								<Box sx={{ textAlign: "center", mb: 3 }}>
									<Button
										variant="outlined"
										onClick={() => {
											vm.setShowManualEntry(false);
											vm.setAddressLineValue("");
											vm.setPostcodeValue("");
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

export default SmartAddressInput;
