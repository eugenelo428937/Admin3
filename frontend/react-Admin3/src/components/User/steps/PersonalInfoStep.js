import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box, Typography, TextField, Grid, Divider, Autocomplete,
} from "@mui/material";
import { Person } from "@mui/icons-material";
import ValidatedPhoneInput from "../ValidatedPhoneInput";
import config from "../../../config";
import { useTheme } from "@mui/material/styles";

const TITLE_OPTIONS = [
  { label: "Mr", value: "Mr" },
  { label: "Miss", value: "Miss" },
  { label: "Mrs", value: "Mrs" },
  { label: "Ms", value: "Ms" },
  { label: "Dr", value: "Dr" },
];

const PersonalInfoStep = ({
  initialData = {},
  onDataChange,
  errors = {},
  mode = "registration",
  readOnly = false,
}) => {
  const theme = useTheme();
  const [form, setForm] = useState({
    title: "",
    first_name: "",
    last_name: "",
    email: "",
    home_phone: "",
    mobile_phone: "",
    ...initialData,
  });

  // Phone country state
  const [countryList, setCountryList] = useState([]);
  const [homePhoneCountry, setHomePhoneCountry] = useState(null);
  const [mobilePhoneCountry, setMobilePhoneCountry] = useState(null);
  const [phoneValidation, setPhoneValidation] = useState({
    home_phone: { isValid: true, error: null },
    mobile_phone: { isValid: true, error: null },
  });

  // Initialize from initialData only on subsequent changes (not initial mount,
  // since useState already applies initialData via spread)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (initialData && Object.keys(initialData).length > 0) {
      setForm(prev => {
        const hasChanges = Object.keys(initialData).some(key => prev[key] !== initialData[key]);
        return hasChanges ? { ...prev, ...initialData } : prev;
      });
    }
  }, [initialData]);

  // Load countries on mount
  useEffect(() => {
    fetch(config.apiBaseUrl + "/api/countries/")
      .then((res) => res.json())
      .then((data) => {
        let countries = Array.isArray(data) ? data : data.results || [];
        const frequentCountries = ["United Kingdom", "India", "South Africa"];
        const frequent = frequentCountries
          .map((f) => countries.find((c) => c.name === f))
          .filter(Boolean);
        const rest = countries
          .filter((c) => !frequentCountries.includes(c.name))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCountryList([...frequent, ...rest]);
      })
      .catch((err) => console.error("Failed to load countries:", err));
  }, []);

  // Report data changes to parent
  useEffect(() => {
    onDataChange?.({
      ...form,
      _phoneCountries: {
        homePhoneCountry,
        mobilePhoneCountry,
      },
      _phoneValidation: phoneValidation,
    });
  }, [form, homePhoneCountry, mobilePhoneCountry, phoneValidation, onDataChange]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handlePhoneValidationChange = useCallback((fieldName, result) => {
    setPhoneValidation((prev) => ({ ...prev, [fieldName]: result }));
  }, []);

  return (
    <Box>
      <Box
        sx={{
          textAlign: "center",
          mb: theme.spacingTokens?.sm || 2,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Person sx={{ fontSize: "3rem", color: theme.palette.scales?.granite?.[30] || "grey" }} />
        <Typography variant="h5">Personal &amp; Contact Information</Typography>
      </Box>
      <Divider sx={{ mb: theme.spacingTokens?.lg || 3 }} />

      <Grid container spacing={theme.spacingTokens?.sm || 2} sx={{ flexGrow: 1 }}>
        <Grid size={2} sx={{ mr: theme.spacingTokens?.sm || 2 }}>
          <Autocomplete
            options={TITLE_OPTIONS}
            getOptionLabel={(option) => option.label || ""}
            value={form.title ? { label: form.title, value: form.title } : null}
            onChange={(event, newValue) => {
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
            onValidationChange={(result) => handlePhoneValidationChange("home_phone", result)}
            countries={countryList}
            selectedCountry={homePhoneCountry}
            onCountryChange={setHomePhoneCountry}
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
            onValidationChange={(result) => handlePhoneValidationChange("mobile_phone", result)}
            countries={countryList}
            selectedCountry={mobilePhoneCountry}
            onCountryChange={setMobilePhoneCountry}
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
