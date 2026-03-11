import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box, Typography, TextField, Grid, Button, Alert, Divider,
} from "@mui/material";
import { Business, Add, Remove, Edit as EditIcon } from "@mui/icons-material";
import SmartAddressInput from "../../Address/SmartAddressInput.js";
import DynamicAddressForm from "../../Address/DynamicAddressForm.js";
import ValidatedPhoneInput from "../ValidatedPhoneInput.js";
import config from "../../../config.js";
import { useTheme } from "@mui/material/styles";

const WorkAddressStep = ({
  initialData = {},
  onDataChange,
  errors = {},
  mode = "registration",
  readOnly = false,
}) => {
  const theme = useTheme();
  const isProfileMode = mode === "profile" || mode === "admin";

  const [showWorkSection, setShowWorkSection] = useState(
    initialData.showWorkSection || false
  );

  const [form, setForm] = useState({
    work_company: "",
    work_department: "",
    work_building: "",
    work_address: "",
    work_district: "",
    work_city: "",
    work_county: "",
    work_postal_code: "",
    work_state: "",
    work_country: "",
    work_phone: "",
    work_email: "",
    ...initialData,
  });

  const [useSmartInput, setUseSmartInput] = useState(!isProfileMode);
  const [isEditing, setIsEditing] = useState(!isProfileMode);

  // Phone country state
  const [countryList, setCountryList] = useState([]);
  const [workPhoneCountry, setWorkPhoneCountry] = useState(null);
  const [phoneValidation, setPhoneValidation] = useState({
    work_phone: { isValid: true, error: null },
  });

  // Refs for direct callback pattern (avoids effect cascade)
  const formRef = useRef(form);
  const onDataChangeRef = useRef(onDataChange);
  const phoneCountriesRef = useRef({ workPhoneCountry: null });
  const phoneValidationRef = useRef(phoneValidation);
  const showWorkSectionRef = useRef(showWorkSection);

  useEffect(() => { onDataChangeRef.current = onDataChange; }, [onDataChange]);
  useEffect(() => { phoneCountriesRef.current = { workPhoneCountry }; }, [workPhoneCountry]);
  useEffect(() => { phoneValidationRef.current = phoneValidation; }, [phoneValidation]);
  useEffect(() => { showWorkSectionRef.current = showWorkSection; }, [showWorkSection]);

  const notifyParent = useCallback((nextForm, extras = {}) => {
    onDataChangeRef.current?.({
      ...nextForm,
      showWorkSection: extras.showWorkSection !== undefined ? extras.showWorkSection : showWorkSectionRef.current,
      _phoneCountries: phoneCountriesRef.current,
      _phoneValidation: extras.phoneValidation || phoneValidationRef.current,
    });
  }, []);

  // Initialize from initialData only on subsequent changes (not initial mount)
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
      if (initialData.showWorkSection !== undefined) {
        setShowWorkSection(initialData.showWorkSection);
        showWorkSectionRef.current = initialData.showWorkSection;
      }
      if (changed) notifyParent(formRef.current);
    }
  }, [initialData, notifyParent]);

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

  // Initial report to parent on mount (once only)
  const hasSentInitial = useRef(false);
  useEffect(() => {
    if (!hasSentInitial.current) {
      hasSentInitial.current = true;
      notifyParent(form);
    }
  }, [form, notifyParent]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      formRef.current = next;
      return next;
    });
    notifyParent(formRef.current);
  }, [notifyParent]);

  const handlePhoneValidationChange = useCallback((fieldName, result) => {
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

  const header = (
    <>
      <Box sx={{ textAlign: "center", mb: theme.spacingTokens?.sm || 2, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        <Business sx={{ fontSize: "3rem", color: theme.palette.scales?.granite?.[30] || "grey" }} />
        <Typography variant="h5">Work Address</Typography>
      </Box>
      <Divider sx={{ mb: theme.spacingTokens?.lg || 3 }} />
    </>
  );

  if (!showWorkSection) {
    return (
      <Box>
        {header}
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            If you'd like to add a work address for deliveries, click the button below.
          </Typography>
          {!readOnly && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                setShowWorkSection(true);
                showWorkSectionRef.current = true;
                notifyParent(formRef.current, { showWorkSection: true });
              }}
            >
              Add Work Address
            </Button>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {header}

      {!readOnly && (
        <Box sx={{ textAlign: "right", mb: 2 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Remove />}
            onClick={() => {
              setShowWorkSection(false);
              showWorkSectionRef.current = false;
              notifyParent(formRef.current, { showWorkSection: false });
            }}
            size="small"
          >
            Remove Work Address
          </Button>
        </Box>
      )}

      <Grid container spacing={theme.spacingTokens?.sm || 2}>
        <Grid size={6}>
          <TextField
            fullWidth
            label="Company"
            name="work_company"
            value={form.work_company}
            onChange={handleChange}
            error={!!errors.work_company}
            helperText={errors.work_company || ""}
            variant="standard"
            InputProps={{ readOnly }}
          />
        </Grid>
        <Grid size={6}>
          <TextField
            fullWidth
            label="Department"
            name="work_department"
            value={form.work_department}
            onChange={handleChange}
            error={!!errors.work_department}
            helperText={errors.work_department || ""}
            variant="standard"
            InputProps={{ readOnly }}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 3 }}>
        {readOnly ? (
          form.work_country ? (
            <DynamicAddressForm
              country={form.work_country}
              values={form}
              onChange={handleChange}
              errors={{}}
              fieldPrefix="work"
              showOptionalFields={true}
              readonly={true}
            />
          ) : (
            <Alert severity="info">No work address details on file.</Alert>
          )
        ) : !isEditing ? (
          <Box>
            {form.work_country ? (
              <DynamicAddressForm
                country={form.work_country}
                values={form}
                onChange={handleChange}
                errors={{}}
                fieldPrefix="work"
                showOptionalFields={true}
                readonly={true}
              />
            ) : (
              <Alert severity="info" sx={{ mb: 2 }}>
                No work address on file. Click "Edit Address" to add.
              </Alert>
            )}
            <Box sx={{ textAlign: "center", mt: 3 }}>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => {
                  setIsEditing(true);
                  setUseSmartInput(!form.work_country);
                }}
              >
                Edit Address
              </Button>
            </Box>
          </Box>
        ) : (
          <Box>
            {!useSmartInput ? (
              <Box>
                <DynamicAddressForm
                  country={form.work_country}
                  values={form}
                  onChange={handleChange}
                  errors={errors}
                  fieldPrefix="work"
                  showOptionalFields={true}
                />
                <Box sx={{ textAlign: "center", mt: 3, display: "flex", gap: 2, justifyContent: "center" }}>
                  <Button variant="outlined" onClick={() => setUseSmartInput(true)}>
                    Use address lookup
                  </Button>
                  {isProfileMode && (
                    <Button variant="text" onClick={() => { setIsEditing(false); setUseSmartInput(false); }}>
                      Cancel
                    </Button>
                  )}
                </Box>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Using smart address lookup
                </Typography>
                <SmartAddressInput
                  values={form}
                  onChange={handleChange}
                  errors={errors}
                  fieldPrefix="work"
                />
                <Box sx={{ textAlign: "center", mt: 2, display: "flex", gap: 2, justifyContent: "center" }}>
                  {isProfileMode && (
                    <Button variant="text" onClick={() => { setIsEditing(false); setUseSmartInput(false); }}>
                      Cancel
                    </Button>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>

      <Grid container spacing={theme.spacingTokens?.sm || 2} sx={{ mt: 3 }}>
        <Grid size={12}>
          <ValidatedPhoneInput
            name="work_phone"
            value={form.work_phone}
            onChange={handleChange}
            onValidationChange={(result) => handlePhoneValidationChange("work_phone", result)}
            countries={countryList}
            selectedCountry={workPhoneCountry}
            onCountryChange={setWorkPhoneCountry}
            isInvalid={!!errors.work_phone}
            error={errors.work_phone || ""}
            placeholder="Enter work phone number"
            label="Work Phone"
            variant="standard"
            sx={{ maxWidth: "24rem" }}
            disabled={readOnly}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            fullWidth
            type="email"
            label="Work Email"
            name="work_email"
            value={form.work_email}
            onChange={handleChange}
            error={!!errors.work_email}
            helperText={errors.work_email || ""}
            variant="standard"
            sx={{ maxWidth: "24rem" }}
            InputProps={{ readOnly }}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default WorkAddressStep;
