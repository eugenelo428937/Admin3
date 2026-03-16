import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box, Typography, TextField, Grid, Divider, Autocomplete,
} from "@mui/material";
import { Person } from "@mui/icons-material";
import ValidatedPhoneInput from "../ValidatedPhoneInput.tsx";
import config from "../../../config.js";
import { useTheme } from "@mui/material/styles";
import type { WizardMode, WizardStepData, WizardValidationErrors } from "../../../types/auth";
import type { Country, PhoneValidationResult } from "../../../types/auth";

interface TitleOption {
  label: string;
  value: string;
}

const TITLE_OPTIONS: TitleOption[] = [
  { label: "Mr", value: "Mr" },
  { label: "Miss", value: "Miss" },
  { label: "Mrs", value: "Mrs" },
  { label: "Ms", value: "Ms" },
  { label: "Dr", value: "Dr" },
];

interface StepProps {
  initialData?: Record<string, any>;
  onDataChange?: (data: WizardStepData) => void;
  errors?: WizardValidationErrors;
  mode?: WizardMode;
  readOnly?: boolean;
}

interface PersonalInfoForm {
  title: string;
  first_name: string;
  last_name: string;
  email: string;
  home_phone: string;
  mobile_phone: string;
  [key: string]: any;
}

interface PhoneCountries {
  homePhoneCountry: Country | null;
  mobilePhoneCountry: Country | null;
}

interface PhoneValidationState {
  home_phone: PhoneValidationResult;
  mobile_phone: PhoneValidationResult;
  [key: string]: PhoneValidationResult;
}

const PersonalInfoStep: React.FC<StepProps> = ({
  initialData = {},
  onDataChange,
  errors = {},
  mode = "registration",
  readOnly = false,
}) => {
  const theme = useTheme();
  const [form, setForm] = useState<PersonalInfoForm>({
    title: "",
    first_name: "",
    last_name: "",
    email: "",
    home_phone: "",
    mobile_phone: "",
    ...initialData,
  });

  // Phone country state
  const [countryList, setCountryList] = useState<Country[]>([]);
  const [homePhoneCountry, setHomePhoneCountry] = useState<Country | null>(null);
  const [mobilePhoneCountry, setMobilePhoneCountry] = useState<Country | null>(null);
  const [phoneValidation, setPhoneValidation] = useState<PhoneValidationState>({
    home_phone: { isValid: true, error: undefined },
    mobile_phone: { isValid: true, error: undefined },
  });

  // Refs to hold latest values for direct callback (avoids effect cascade)
  const formRef = useRef<PersonalInfoForm>(form);
  const onDataChangeRef = useRef(onDataChange);
  const phoneCountriesRef = useRef<PhoneCountries>({ homePhoneCountry: null, mobilePhoneCountry: null });
  const phoneValidationRef = useRef<PhoneValidationState>(phoneValidation);

  useEffect(() => { onDataChangeRef.current = onDataChange; }, [onDataChange]);
  useEffect(() => { phoneCountriesRef.current = { homePhoneCountry, mobilePhoneCountry }; }, [homePhoneCountry, mobilePhoneCountry]);
  useEffect(() => { phoneValidationRef.current = phoneValidation; }, [phoneValidation]);

  // Notify parent with current state — called directly from handlers, not from a useEffect
  const notifyParent = useCallback((nextForm: PersonalInfoForm, nextPhoneValidation?: PhoneValidationState) => {
    onDataChangeRef.current?.({
      ...nextForm,
      _phoneCountries: phoneCountriesRef.current,
      _phoneValidation: nextPhoneValidation || phoneValidationRef.current,
    });
  }, []);

  // Sync from parent's initialData (profile mode: when profile data loads)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (initialData && Object.keys(initialData).length > 0) {
      let changed = false;
      setForm(prev => {
        const hasChanges = Object.keys(initialData).some(key => prev[key] !== initialData[key]);
        if (!hasChanges) return prev;
        const next = { ...prev, ...initialData };
        formRef.current = next;
        changed = true;
        return next;
      });
      if (changed) notifyParent(formRef.current);
    }
  }, [initialData, notifyParent]);

  // Load countries on mount
  useEffect(() => {
    fetch(config.apiBaseUrl + "/api/countries/")
      .then((res) => res.json())
      .then((data) => {
        let countries: Country[] = Array.isArray(data) ? data : data.results || [];
        const frequentCountries = ["United Kingdom", "India", "South Africa"];
        const frequent = frequentCountries
          .map((f) => countries.find((c) => c.name === f))
          .filter((c): c is Country => Boolean(c));
        const rest = countries
          .filter((c) => !frequentCountries.includes(c.name))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountryList([...frequent, ...rest]);
      })
      .catch((err) => console.error("Failed to load countries:", err));
  }, []);

  // Initial report to parent on mount (once only)
  const hasSentInitial = useRef(false);
  useEffect(() => {
    if (!hasSentInitial.current) {
      hasSentInitial.current = true;
      notifyParent(form);
    }
  }, [form, notifyParent]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string } }) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      formRef.current = next;
      return next;
    });
    // Notify parent after setForm — updater runs synchronously so formRef is current
    notifyParent(formRef.current);
  }, [notifyParent]);

  const handlePhoneValidationChange = useCallback((fieldName: string, result: PhoneValidationResult) => {
    setPhoneValidation((prev) => {
      const existing = prev[fieldName];
      if (existing && existing.isValid === result.isValid && existing.error === result.error) {
        return prev;
      }
      const next = { ...prev, [fieldName]: result };
      phoneValidationRef.current = next;
      return next;
    });
  }, []);

  // Notify parent when phone country changes
  const handleHomePhoneCountryChange = useCallback((country: Country | null) => {
    setHomePhoneCountry(country);
    phoneCountriesRef.current = { ...phoneCountriesRef.current, homePhoneCountry: country };
  }, []);

  const handleMobilePhoneCountryChange = useCallback((country: Country | null) => {
    setMobilePhoneCountry(country);
    phoneCountriesRef.current = { ...phoneCountriesRef.current, mobilePhoneCountry: country };
  }, []);

  return (
    <Box>
      <Box
        sx={{
          textAlign: "center",
          mb: (theme as any).spacingTokens?.sm || 2,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Person sx={{ fontSize: "3rem", color: (theme as any).palette.scales?.granite?.[30] || "grey" }} />
        <Typography variant="h5">Personal &amp; Contact Information</Typography>
      </Box>
      <Divider sx={{ mb: (theme as any).spacingTokens?.lg || 3 }} />

      <Grid container spacing={(theme as any).spacingTokens?.sm || 2} sx={{ flexGrow: 1 }}>
        <Grid size={2} sx={{ mr: (theme as any).spacingTokens?.sm || 2 }}>
          <Autocomplete
            options={TITLE_OPTIONS}
            getOptionLabel={(option) => option.label || ""}
            value={form.title ? { label: form.title, value: form.title } : null}
            onChange={(_event: any, newValue: TitleOption | null) => {
              handleChange({ target: { name: "title", value: newValue ? newValue.value : "" } });
            }}
            renderInput={(params) => (
              <TextField {...params} label="Title" placeholder="Select title" variant="standard" />
            )}
            isOptionEqualToValue={(option, value) => option.value === value.value}
            disabled={readOnly}
          />
        </Grid>
        <Grid size={4}>
          <TextField
            fullWidth
            required
            label="First Name"
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            error={!!errors.first_name}
            helperText={errors.first_name || ""}
            variant="standard"
            InputProps={{ readOnly }}
          />
        </Grid>
        <Grid size={4}>
          <TextField
            fullWidth
            required
            label="Last Name"
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            error={!!errors.last_name}
            helperText={errors.last_name || ""}
            variant="standard"
            InputProps={{ readOnly }}
          />
        </Grid>
        <Grid size={12} sx={{ textAlign: "left" }}>
          <TextField
            fullWidth
            required
            type="email"
            label="Email Address"
            name="email"
            value={form.email}
            onChange={handleChange}
            error={!!errors.email}
            helperText={errors.email || (mode === "registration" ? "This will be your login username" : "")}
            variant="standard"
            sx={{ maxWidth: "24rem" }}
            InputProps={{ readOnly }}
          />
        </Grid>
        <Grid size={12}>
          <ValidatedPhoneInput
            name="home_phone"
            value={form.home_phone}
            onChange={handleChange}
            onValidationChange={(result: PhoneValidationResult) => handlePhoneValidationChange("home_phone", result)}
            countries={countryList}
            selectedCountry={homePhoneCountry}
            onCountryChange={handleHomePhoneCountryChange}
            isInvalid={!!errors.home_phone}
            error={errors.home_phone || ""}
            placeholder="Enter home phone number"
            label="Home Phone"
            variant="standard"
            sx={{ maxWidth: "24rem" }}
            disabled={readOnly}
          />
        </Grid>
        <Grid size={12}>
          <ValidatedPhoneInput
            name="mobile_phone"
            value={form.mobile_phone}
            onChange={handleChange}
            onValidationChange={(result: PhoneValidationResult) => handlePhoneValidationChange("mobile_phone", result)}
            countries={countryList}
            selectedCountry={mobilePhoneCountry}
            onCountryChange={handleMobilePhoneCountryChange}
            isInvalid={!!errors.mobile_phone}
            error={errors.mobile_phone || ""}
            placeholder="Enter mobile phone number"
            required={true}
            label="Mobile Phone"
            variant="standard"
            sx={{ maxWidth: "24rem" }}
            disabled={readOnly}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default PersonalInfoStep;
