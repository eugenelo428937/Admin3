import React, { useState, useEffect, useRef } from "react";
import {
	TextField,
	Autocomplete,
	Box,
	Typography,
	InputAdornment,
	FormHelperText,
} from "@mui/material";
import { Check, Error } from "@mui/icons-material";
import phoneValidationService from "../../services/phoneValidationService";
import { useTheme } from "@mui/material/styles";
import type { Country } from "../../types/auth";

interface CountryWithIso extends Country {
	iso_code: string;
}

interface CountryOption extends CountryWithIso {
	isFrequent?: boolean;
}

interface ValidationResult {
	isValid: boolean;
	error?: string | null;
}

interface ValidatedPhoneInputProps {
	name: string;
	value?: string;
	onChange: (e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: string } }) => void;
	onValidationChange?: (result: ValidationResult) => void;
	countries: CountryWithIso[];
	selectedCountry?: CountryWithIso | null;
	onCountryChange: (country: CountryWithIso | null) => void;
	isInvalid?: boolean;
	error?: string;
	placeholder?: string;
	required?: boolean;
	label?: string;
	className?: string;
	disabled?: boolean;
}

const ValidatedPhoneInput: React.FC<ValidatedPhoneInputProps> = ({
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
	const [phoneInput, setPhoneInput] = useState<string>(value || "");
	const [validationResult, setValidationResult] = useState<ValidationResult>({
		isValid: true,
		error: null,
	});
	const [showCountryDropdown, setShowCountryDropdown] = useState<boolean>(false);
	const [countrySearchTerm, setCountrySearchTerm] = useState<string>("");
	const phoneInputRef = useRef<HTMLDivElement>(null);
	const theme = useTheme();

	// Filter countries based on search term
	const filteredCountries = countries.filter(
		(country) =>
			country.name.toLowerCase().includes(countrySearchTerm.toLowerCase()) ||
			(country.phone_code && country.phone_code.includes(countrySearchTerm))
	);

	// Get frequent countries
	const frequentCountries: string[] = [
		"United Kingdom",
		"India",
		"South Africa",
		"United States",
	];
	const frequent: CountryWithIso[] = frequentCountries
		.map((name) => countries.find((c) => c.name === name))
		.filter((c): c is CountryWithIso => Boolean(c));

	// Update phone input when value prop changes
	useEffect(() => {
		setPhoneInput(value || "");
	}, [value]);

	// Use a ref to store the latest onValidationChange to avoid dependency issues
	const onValidationChangeRef = useRef<((result: ValidationResult) => void) | undefined>(onValidationChange);
	useEffect(() => {
		onValidationChangeRef.current = onValidationChange;
	}, [onValidationChange]);

	// Validate phone number when input or country changes
	useEffect(() => {
		let isCancelled = false;

		const validatePhone = async () => {
			let result: ValidationResult;

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
				const countryCode = await (phoneValidationService as any).getCountryCodeFromName(
					selectedCountry.name
				);
				if (countryCode) {
					result = await (phoneValidationService as any).validatePhoneNumber(
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

			// Only update state if the effect hasn't been cancelled
			if (!isCancelled) {
				setValidationResult(result);

				// Notify parent component using the ref
				if (onValidationChangeRef.current) {
					onValidationChangeRef.current(result);
				}
			}
		};

		validatePhone();

		// Cleanup function to prevent state updates on unmounted component
		return () => {
			isCancelled = true;
		};
	}, [phoneInput, selectedCountry, required]);

	const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

	const handleCountrySelect = (country: CountryWithIso | null) => {
		setShowCountryDropdown(false);
		setCountrySearchTerm("");

		if (onCountryChange) {
			onCountryChange(country);
		}
	};

	const formatPhoneOnBlur = async () => {
		if (phoneInput && selectedCountry && validationResult.isValid) {
			const countryCode = await (phoneValidationService as any).getCountryCodeFromName(
				selectedCountry.name
			);
			if (countryCode) {
				const formattedNumber = (phoneValidationService as any).formatPhoneNumber(
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

	const getDisplayError = (): string | null | undefined => {
		// Prioritize external error over internal validation
		return error || validationResult.error;
	};

	const getIsInvalid = (): boolean => {
		return !!(isInvalid || !validationResult.isValid);
	};

	// Prepare country options for autocomplete
	const countryOptions: CountryOption[] = [
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
				<Autocomplete<CountryOption>
					options={countryOptions}
					value={selectedCountry as CountryOption | null ?? null}
					onChange={(_event: React.SyntheticEvent, newValue: CountryOption | null) => handleCountrySelect(newValue)}
					getOptionLabel={(option: CountryOption) =>
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
					renderOption={(props, option: CountryOption) => {
						const { key, ...otherProps } = props as React.HTMLAttributes<HTMLLIElement> & { key: React.Key };
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
					isOptionEqualToValue={(option: CountryOption, value: CountryOption) =>
						option?.iso_code === value?.iso_code
					}
					disabled={disabled}
					filterOptions={(options: CountryOption[], { inputValue }: { inputValue: string }) => {
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
					} as any}
				/>
			</Box>

			{/* Helper Text / Error Message */}
			<FormHelperText error={getIsInvalid()}>
				{getDisplayError()}
			</FormHelperText>
		</Box>
	);
};

export default ValidatedPhoneInput;
