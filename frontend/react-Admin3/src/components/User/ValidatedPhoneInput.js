import React, { useState, useEffect, useRef } from "react";
import {
	TextField,
	Autocomplete,
	Box,
	Typography,
	Chip,
	InputAdornment,
	FormHelperText,
} from "@mui/material";
import { Check, Error } from "@mui/icons-material";
import PropTypes from "prop-types";
import phoneValidationService from "../../services/phoneValidationService";
import { useTheme } from "@mui/material/styles";
const ValidatedPhoneInput = ({
	name,
	value,
	onChange,
	onValidationChange,
	countries,
	selectedCountry,
	onCountryChange,
	isInvalid,
	error,
	placeholder = "Enter phone number",
	required = false,
	label = "Phone Number",
	className = "",
	disabled = false,
}) => {
	const [phoneInput, setPhoneInput] = useState(value || "");
	const [validationResult, setValidationResult] = useState({
		isValid: true,
		error: null,
	});
	const [showCountryDropdown, setShowCountryDropdown] = useState(false);
	const [countrySearchTerm, setCountrySearchTerm] = useState("");
	const phoneInputRef = useRef();
	const theme = useTheme();

	// Filter countries based on search term
	const filteredCountries = countries.filter(
		(country) =>
			country.name.toLowerCase().includes(countrySearchTerm.toLowerCase()) ||
			(country.phone_code && country.phone_code.includes(countrySearchTerm))
	);

	// Get frequent countries
	const frequentCountries = [
		"United Kingdom",
		"India",
		"South Africa",
		"United States",
	];
	const frequent = frequentCountries
		.map((name) => countries.find((c) => c.name === name))
		.filter(Boolean);

	// Update phone input when value prop changes
	useEffect(() => {
		setPhoneInput(value || "");
	}, [value]);

	// Use a ref to store the latest onValidationChange to avoid dependency issues
	const onValidationChangeRef = useRef(onValidationChange);
	useEffect(() => {
		onValidationChangeRef.current = onValidationChange;
	}, [onValidationChange]);

	// Validate phone number when input or country changes
	useEffect(() => {
		let result;

		// Check if phone input contains only valid characters (digits, spaces, hyphens, parentheses, plus)
		const validPhoneRegex = /^[0-9\s\-\(\)\+]*$/;

		if (phoneInput && !selectedCountry) {
			result = {
				isValid: false,
				error: "Please select a country code first",
			};
		} else if (phoneInput && !validPhoneRegex.test(phoneInput)) {
			result = {
				isValid: false,
				error: "Phone number contains invalid characters",
			};
		} else if (phoneInput && selectedCountry) {
			const countryCode = phoneValidationService.getCountryCodeFromName(
				selectedCountry.name
			);
			if (countryCode) {
				result = phoneValidationService.validatePhoneNumber(
					phoneInput,
					countryCode
				);
			} else {
				result = { isValid: false, error: "Invalid country selected" };
			}
		} else if (!phoneInput && required) {
			result = { isValid: false, error: "Phone number is required" };
		} else {
			result = { isValid: true, error: null };
		}

		setValidationResult(result);

		// Notify parent component using the ref
		if (onValidationChangeRef.current) {
			onValidationChangeRef.current(result);
		}
	}, [phoneInput, selectedCountry, required]);

	const handlePhoneInputChange = (e) => {
		const newValue = e.target.value;
		setPhoneInput(newValue);

		// Call parent onChange
		if (onChange) {
			onChange({
				target: {
					name,
					value: newValue,
				},
			});
		}
	};

	const handleCountrySelect = (country) => {
		setShowCountryDropdown(false);
		setCountrySearchTerm("");

		if (onCountryChange) {
			onCountryChange(country);
		}
	};

	const formatPhoneOnBlur = () => {
		if (phoneInput && selectedCountry && validationResult.isValid) {
			const countryCode = phoneValidationService.getCountryCodeFromName(
				selectedCountry.name
			);
			if (countryCode) {
				const formattedNumber = phoneValidationService.formatPhoneNumber(
					phoneInput,
					countryCode,
					"national"
				);
				if (formattedNumber !== phoneInput) {
					setPhoneInput(formattedNumber);
					if (onChange) {
						onChange({
							target: {
								name,
								value: formattedNumber,
							},
						});
					}
				}
			}
		}
	};

	const getDisplayError = () => {
		// Prioritize external error over internal validation
		return error || validationResult.error;
	};

	const getIsInvalid = () => {
		return isInvalid || !validationResult.isValid;
	};

	// Prepare country options for autocomplete
	const countryOptions = [
		...frequent.map((country) => ({ ...country, isFrequent: true })),
		...countries.filter(
			(country) => !frequent.some((f) => f.iso_code === country.iso_code)
		),
	].filter(
		(country) =>
			country.name.toLowerCase().includes(countrySearchTerm.toLowerCase()) ||
			(country.phone_code && country.phone_code.includes(countrySearchTerm))
	);

	return (
		<Box className={className}>
			<Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
				{/* Country Code Autocomplete */}
				<Autocomplete
					options={countryOptions}
					value={selectedCountry}
					onChange={(event, newValue) => handleCountrySelect(newValue)}
					getOptionLabel={(option) =>
						option ? `${option.iso_code} ${option.phone_code}` : ""
					}
					slotProps={{
						paper: {
							sx: {
								minWidth: "400px",
								mb: 0,
								"& .MuiAutocomplete-listbox": {
									"& .MuiAutocomplete-option": {
										whiteSpace: "nowrap",
									},
								},
							},
						},
					}}
					renderOption={(props, option) => {
						const { key, ...otherProps } = props;
						return (
							<Box component="li" key={key} {...otherProps}>
								<Box
									sx={{
										display: "flex",
										justifyContent: "space-between",
										width: "100%",
										alignItems: "center",
									}}>
									<Typography variant="body2" sx={{ flexShrink: 0 }}>
										{option.name}
									</Typography>
									<Typography
										variant="body2"
										sx={{ fontWeight: 500, ml: 1, flexShrink: 0 }}>
										{option.iso_code} {option.phone_code}
									</Typography>
								</Box>
							</Box>
						);
					}}
					renderInput={(params) => (
						<TextField
							{...params}
							label="Code"
							placeholder="Country code"
							size="medium"
							sx={{
								minWidth: "7.6rem",
								mb: 0,
							}}
							disabled={disabled}
							variant="standard"
						/>
					)}
					isOptionEqualToValue={(option, value) =>
						option?.iso_code === value?.iso_code
					}
					disabled={disabled}
					filterOptions={(options, { inputValue }) => {
						if (!inputValue) return options; // Show all options when no input
						return options.filter(
							(option) =>
								option.name
									.toLowerCase()
									.includes(inputValue.toLowerCase()) ||
								(option.phone_code &&
									option.phone_code.includes(inputValue))
						);
					}}
				/>

				{/* Phone Number Input */}
				<TextField
					fullWidth
					ref={phoneInputRef}
					type="tel"
					name={name}
					label={label + (required ? " *" : "")}
					value={phoneInput}
					onChange={handlePhoneInputChange}
					onBlur={formatPhoneOnBlur}
					placeholder={placeholder}
					error={getIsInvalid()}
					disabled={disabled}
					variant="standard"
					sx={{
						mb: 0,
						maxWidth: "14rem",
					}}
					slotProps={{						
						endAdornment: (
							<InputAdornment position="end">
								{!getDisplayError() &&
								validationResult.isValid &&
								phoneInput ? (
									<Check color="success" />
								) : getDisplayError() ? (
									<Error color="error" />
								) : null}
							</InputAdornment>
						),
					}}
				/>
			</Box>

			{/* Helper Text / Error Message */}
			<FormHelperText error={getIsInvalid()}>
				{getDisplayError()}
			</FormHelperText>
		</Box>
	);
};

ValidatedPhoneInput.propTypes = {
	name: PropTypes.string.isRequired,
	value: PropTypes.string,
	onChange: PropTypes.func.isRequired,
	onValidationChange: PropTypes.func,
	countries: PropTypes.array.isRequired,
	selectedCountry: PropTypes.object,
	onCountryChange: PropTypes.func.isRequired,
	isInvalid: PropTypes.bool,
	error: PropTypes.string,
	placeholder: PropTypes.string,
	required: PropTypes.bool,
	label: PropTypes.string,
	className: PropTypes.string,
	disabled: PropTypes.bool,
};

export default ValidatedPhoneInput;
