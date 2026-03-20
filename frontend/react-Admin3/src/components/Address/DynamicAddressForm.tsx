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
import addressMetadataService from "../../services/address/addressMetadataService.ts";
import { useTheme } from "@mui/material/styles";
import type { AddressMetadata, AddressFieldConfig, AddressChangeEvent, AddressValidationResult } from "../../types/address";

interface DynamicAddressFormProps {
	country: string;
	values?: Record<string, string>;
	onChange: (e: AddressChangeEvent) => void;
	errors?: Record<string, string>;
	fieldPrefix?: string;
	showOptionalFields?: boolean;
	className?: string;
	metadata?: AddressMetadata | null;
	readonly?: boolean;
}

const DynamicAddressForm: React.FC<DynamicAddressFormProps> = ({
	country,
	values = {},
	onChange,
	errors = {},
	fieldPrefix = "",
	showOptionalFields = true,
	className = "",
	metadata = null,
	readonly = false,
}) => {
	const [addressMetadata, setAddressMetadata] = useState<AddressMetadata | null>(null);
	const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});
	const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
	const theme = useTheme();

	const getFieldName = useCallback(
		(fieldName: string): string => {
			return fieldPrefix ? `${fieldPrefix}_${fieldName}` : fieldName;
		},
		[fieldPrefix]
	);

	useEffect(() => {
		const loadMetadata = async () => {
			if (metadata) {
				setAddressMetadata(metadata);
			} else {
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

	const handleFieldChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string } }) => {
			const { name, value } = e.target;
			const fieldName = name.replace(`${fieldPrefix}_`, "");
			const countryCode = addressMetadataService.getCountryCode(country);

			const transformedValue = addressMetadataService.transformFieldValue(
				countryCode || '',
				fieldName,
				value
			);

			const validation: AddressValidationResult = addressMetadataService.validateAddressField(
				countryCode || '',
				fieldName,
				transformedValue
			);

			setFieldErrors((prev) => ({
				...prev,
				[name]: validation.error,
			}));

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

	const validateAll = useCallback((): Record<string, string> => {
		if (!addressMetadata) return {};

		const countryCode = addressMetadataService.getCountryCode(country);
		const newErrors: Record<string, string> = {};

		Object.keys(addressMetadata.fields).forEach((fieldName) => {
			const fullFieldName = getFieldName(fieldName);
			const value = values[fullFieldName] || "";

			const validation = addressMetadataService.validateAddressField(
				countryCode || '',
				fieldName,
				value
			);

			if (!validation.isValid && validation.error) {
				newErrors[fullFieldName] = validation.error;
			}
		});

		setFieldErrors(newErrors);
		return newErrors;
	}, [addressMetadata, country, values, getFieldName]);

	useEffect(() => {
		if (onChange && (onChange as any).validateAll) {
			(onChange as any).validateAll = validateAll;
		}
	}, [validateAll, onChange]);

	const renderField = (fieldName: string, fieldConfig: AddressFieldConfig, layoutSpan: number = 12) => {
		const fullFieldName = getFieldName(fieldName);
		const value = values[fullFieldName] || "";
		const hasError = !!(errors[fullFieldName] || fieldErrors[fullFieldName]);
		const errorMessage = errors[fullFieldName] || fieldErrors[fullFieldName];
		const isRequired = addressMetadata!.required.includes(fieldName);

		const isAddressField = fieldName === 'address';
		const gridSize = isAddressField ? 8 : (layoutSpan === 12 ? 12 : 6);

		if (fieldConfig.type === "select") {
			return (
				<Grid
					size={{
						xs: 12,
						md: gridSize,
					}}
					key={fieldName}
					sx={{ mr: (theme as any).spacingTokens?.md }}>
					<FormControl fullWidth error={hasError}>
						<InputLabel>
							{fieldConfig.label}
							{isRequired && " *"}
						</InputLabel>
						<Select
							name={fullFieldName}
							value={value}
							onChange={handleFieldChange as any}
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
				sx={{ mr: (theme as any).spacingTokens?.md }}>
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

	return (
		<Box className={`dynamic-address-form ${className}`}>
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

			{addressMetadata.layout.map((row, rowIndex) => (
				<Grid container spacing={1} key={rowIndex} sx={{ mb: (theme as any).spacingTokens?.sm }}>
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

			{!showOptionalFields &&
				Object.keys(addressMetadata.fields).length >
					addressMetadata.required.length && (
					<Box sx={{ textAlign: "center", mt: (theme as any).spacingTokens?.md }}>
						<Typography variant="body2" color="text.secondary">
							Some optional fields are hidden.
						</Typography>
					</Box>
				)}
		</Box>
	);
};

export default DynamicAddressForm;
