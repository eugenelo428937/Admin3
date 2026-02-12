import React, { useState, useEffect, useCallback } from "react";
import {
	TextField,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	FormHelperText,
	Grid,
	Alert,
	Typography,
	Box,
	CircularProgress,
} from "@mui/material";
import { Info } from "@mui/icons-material";
import PropTypes from "prop-types";
import addressMetadataService from "../../services/addressMetadataService";
import { useTheme } from "@mui/material/styles";
const DynamicAddressForm = ({
	country,
	values = {},
	onChange,
	errors = {},
	fieldPrefix = "",
	showOptionalFields = true,
	className = "",
	metadata = null, // Allow passing pre-filtered metadata
	readonly = false, // New: Make fields readonly
}) => {
	const [addressMetadata, setAddressMetadata] = useState(null);
	const [fieldErrors, setFieldErrors] = useState({});
	const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
	const theme = useTheme();
	// Get field name with prefix
	const getFieldName = useCallback(
		(fieldName) => {
			return fieldPrefix ? `${fieldPrefix}_${fieldName}` : fieldName;
		},
		[fieldPrefix]
	);

	// Update metadata when country changes (async fetch for full Google metadata)
	useEffect(() => {
		const loadMetadata = async () => {
			if (metadata) {
				// Use passed metadata (pre-filtered)
				setAddressMetadata(metadata);
			} else {
				// Fetch metadata asynchronously to get full Google API data
				const countryCode = addressMetadataService.getCountryCode(country);
				setIsLoadingMetadata(true);
				try {
					const fetchedMetadata = await addressMetadataService.fetchAddressMetadata(countryCode);
					setAddressMetadata(fetchedMetadata);
				} catch (error) {
					console.warn('Failed to fetch address metadata, using fallback:', error);
					const fallbackMetadata = addressMetadataService.getAddressMetadata(countryCode);
					setAddressMetadata(fallbackMetadata);
				} finally {
					setIsLoadingMetadata(false);
				}
			}
		};

		if (country) {
			loadMetadata();
		}
	}, [country, metadata]);

	// Handle field change with validation and transformation
	const handleFieldChange = useCallback(
		(e) => {
			const { name, value } = e.target;
			const fieldName = name.replace(`${fieldPrefix}_`, "");
			const countryCode = addressMetadataService.getCountryCode(country);

			// Transform value according to country rules
			const transformedValue = addressMetadataService.transformFieldValue(
				countryCode,
				fieldName,
				value
			);

			// Validate field
			const validation = addressMetadataService.validateAddressField(
				countryCode,
				fieldName,
				transformedValue
			);

			// Update field errors
			setFieldErrors((prev) => ({
				...prev,
				[name]: validation.error,
			}));

			// Call parent onChange with transformed value
			if (onChange) {
				onChange({
					target: {
						name,
						value: transformedValue,
					},
				});
			}
		},
		[country, fieldPrefix, onChange]
	);

	// Validate all fields
	const validateAll = useCallback(() => {
		if (!addressMetadata) return {};

		const countryCode = addressMetadataService.getCountryCode(country);
		const newErrors = {};

		Object.keys(addressMetadata.fields).forEach((fieldName) => {
			const fullFieldName = getFieldName(fieldName);
			const value = values[fullFieldName] || "";

			const validation = addressMetadataService.validateAddressField(
				countryCode,
				fieldName,
				value
			);

			if (!validation.isValid) {
				newErrors[fullFieldName] = validation.error;
			}
		});

		setFieldErrors(newErrors);
		return newErrors;
	}, [addressMetadata, country, values, getFieldName]);

	// Expose validation function
	useEffect(() => {
		if (onChange && onChange.validateAll) {
			onChange.validateAll = validateAll;
		}
	}, [validateAll, onChange]);

	// Render form field based on field configuration
	const renderField = (fieldName, fieldConfig, layoutSpan = 12) => {
		const fullFieldName = getFieldName(fieldName);
		const value = values[fullFieldName] || "";
		const hasError = !!(errors[fullFieldName] || fieldErrors[fullFieldName]);
		const errorMessage = errors[fullFieldName] || fieldErrors[fullFieldName];
		const isRequired = addressMetadata.required.includes(fieldName);

		// Special handling for address field - always full width and multiline on mobile
		const isAddressField = fieldName === 'address';
		// For non-address fields, default to size 6 unless specified as 12
		const gridSize = isAddressField ? 8 : (layoutSpan === 12 ? 12 : 6);

		if (fieldConfig.type === "select") {
			return (
				<Grid
					size={{
						xs: 12,
						md: gridSize,
					}}
					key={fieldName}
					sx={{ mr: theme.spacingTokens.md }}>
					<FormControl fullWidth error={hasError}>
						<InputLabel>
							{fieldConfig.label}
							{isRequired && " *"}
						</InputLabel>
						<Select
							name={fullFieldName}
							value={value}
							onChange={handleFieldChange}
						disabled={readonly}
							label={fieldConfig.label + (isRequired ? " *" : "")}>
							<MenuItem value="">Select {fieldConfig.label}</MenuItem>
							{fieldConfig.options?.map((option) => (
								<MenuItem key={option.value} value={option.value}>
									{option.label}
								</MenuItem>
							))}
						</Select>
						{hasError && <FormHelperText>{errorMessage}</FormHelperText>}
					</FormControl>
				</Grid>
			);
		}

		return (
			<Grid
				size={{
					xs: 12,
					md: gridSize,
				}}
				key={fieldName}
				sx={{ mr: theme.spacingTokens.md }}>
				<TextField
					fullWidth
					required={isRequired}
					label={fieldConfig.label}
					name={fullFieldName}
					value={value}
					onChange={handleFieldChange}
					placeholder={fieldConfig.placeholder}
					error={hasError}
					helperText={hasError ? errorMessage : ""}
					multiline={isAddressField}
					rows={isAddressField ? 3 : 1}
					sx={{
						style: {
							textTransform: fieldConfig.transform
								? "uppercase"
								: "none",
						},
					}}
					variant="standard"
				InputProps={{ readOnly: readonly }}
				/>
			</Grid>
		);
	};

	if (isLoadingMetadata) {
		return (
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
				<CircularProgress size={20} />
				<Typography variant="body2" color="text.secondary">
					Loading address format for {country}...
				</Typography>
			</Box>
		);
	}

	if (!addressMetadata) {
		return (
			<Alert severity="info">
				<Info sx={{ mr: 1 }} />
				Please select a country to configure address fields.
			</Alert>
		);
	}

	// Filter fields based on showOptionalFields (keep this for potential future use)
	// const fieldsToShow = showOptionalFields
	//   ? Object.keys(addressMetadata.fields)
	//   : addressMetadata.required;

	return (
		<Box className={`dynamic-address-form ${className}`}>
			{/* Country-specific address format info */}
			<Box sx={{ mb: 3 }}>
				<Typography variant="body2" color="text.secondary">
					<Info
						sx={{ mr: 1, fontSize: "inherit", verticalAlign: "middle" }}
					/>
					Address format for {country}
					{addressMetadata.required.length > 0 && (
						<Typography component="span" sx={{ ml: 2 }}>
							Required:{" "}
							{addressMetadata.required
								.map((field) => addressMetadata.fields[field]?.label)
								.filter(Boolean)
								.join(", ")}
						</Typography>
					)}
				</Typography>
			</Box>

			{/* Render fields according to layout */}
			{addressMetadata.layout.map((row, rowIndex) => (
				<Grid container spacing={1} key={rowIndex} sx={{ mb: theme.spacingTokens.sm }}>
					{row.map(({ field, span }) => {
						const fieldConfig = addressMetadata.fields[field];
						if (
							!fieldConfig ||
							(!showOptionalFields &&
								!addressMetadata.required.includes(field))
						) {
							return null;
						}
						return renderField(field, fieldConfig, span);
					})}
				</Grid>
			))}

			{/* Show optional fields toggle if there are optional fields */}

			{!showOptionalFields &&
				Object.keys(addressMetadata.fields).length >
					addressMetadata.required.length && (
					<Box sx={{ textAlign: "center", mt: theme.spacingTokens.md }}>
						<Typography variant="body2" color="text.secondary">
							Some optional fields are hidden.
						</Typography>
					</Box>
				)}
		</Box>
	);
};

DynamicAddressForm.propTypes = {
	country: PropTypes.string.isRequired,
	values: PropTypes.object,
	onChange: PropTypes.func.isRequired,
	errors: PropTypes.object,
	fieldPrefix: PropTypes.string,
	showOptionalFields: PropTypes.bool,
	className: PropTypes.string,
	metadata: PropTypes.object,
	readonly: PropTypes.bool,
};

export default DynamicAddressForm;
