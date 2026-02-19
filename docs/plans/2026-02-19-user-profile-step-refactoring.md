# User Profile Step Component Refactoring — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix table display bugs, extract UserFormWizard steps into reusable components, and rebuild the admin UserProfileForm using those shared step components with MUI Stepper.

**Architecture:** Extract each wizard step into a self-contained component under `User/steps/` with local state management. Each step owns its own form state, validates internally, and reports changes upward via `onDataChange`. Both `UserFormWizard` and `AdminUserProfileForm` consume these steps — UserFormWizard as a 5-step wizard, admin as a 4-step stepper (no SecurityStep).

**Tech Stack:** React 19.2, Material-UI v7, ValidatedPhoneInput, SmartAddressInput, DynamicAddressForm, addressMetadataService

**Design doc:** `docs/plans/2026-02-19-user-profile-step-refactoring-design.md`

---

## Task 1: Fix UserProfileList table display

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/user-profiles/UserProfileList.js:81-85`

**Step 1: Fix nested field access**

The API returns `profile.user.email` (nested object), not `profile.user_email` (flat). Change lines 82-84:

```javascript
// Before:
<TableCell>{profile.user_email}</TableCell>
<TableCell>{profile.user_first_name}</TableCell>
<TableCell>{profile.user_last_name}</TableCell>

// After:
<TableCell>{profile.user?.email}</TableCell>
<TableCell>{profile.user?.first_name}</TableCell>
<TableCell>{profile.user?.last_name}</TableCell>
```

**Step 2: Verify visually**

Run: `npm start` (if running) and navigate to `/admin/user-profiles`. Confirm table shows email, first name, last name columns.

**Step 3: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/user-profiles/UserProfileList.js
git commit -m "fix: use nested user object fields in UserProfileList table"
```

---

## Task 2: Fix StaffList table display

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/staff/StaffList.js:94-97`

**Step 1: Fix nested field access**

The API returns `member.user_detail.email` (nested via `user_detail` key in `StaffAdminSerializer`), not `member.user_email`. Change lines 95-97:

```javascript
// Before:
<TableCell>{member.user_email}</TableCell>
<TableCell>{member.user_first_name}</TableCell>
<TableCell>{member.user_last_name}</TableCell>

// After:
<TableCell>{member.user_detail?.email}</TableCell>
<TableCell>{member.user_detail?.first_name}</TableCell>
<TableCell>{member.user_detail?.last_name}</TableCell>
```

**Step 2: Verify visually**

Navigate to `/admin/staff`. Confirm table shows email, first name, last name columns.

**Step 3: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/staff/StaffList.js
git commit -m "fix: use nested user_detail object fields in StaffList table"
```

---

## Task 3: Create PersonalInfoStep component

**Files:**
- Create: `frontend/react-Admin3/src/components/User/steps/PersonalInfoStep.js`
- Test: `frontend/react-Admin3/src/components/__tests__/PersonalInfoStep.test.js`

**Step 1: Write the failing test**

```javascript
// frontend/react-Admin3/src/components/__tests__/PersonalInfoStep.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PersonalInfoStep from '../User/steps/PersonalInfoStep';

// Mock ValidatedPhoneInput to avoid complex phone validation in tests
jest.mock('../User/ValidatedPhoneInput', () => {
  return function MockValidatedPhoneInput({ name, value, onChange, label }) {
    return (
      <input
        data-testid={`phone-${name}`}
        name={name}
        value={value || ''}
        onChange={onChange}
        aria-label={label}
      />
    );
  };
});

const theme = createTheme();

const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('PersonalInfoStep', () => {
  const defaultProps = {
    initialData: {
      title: '',
      first_name: '',
      last_name: '',
      email: '',
      home_phone: '',
      mobile_phone: '',
    },
    onDataChange: jest.fn(),
    errors: {},
    mode: 'registration',
  };

  test('renders personal info fields', () => {
    renderWithTheme(<PersonalInfoStep {...defaultProps} />);
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  test('calls onDataChange when field changes', () => {
    renderWithTheme(<PersonalInfoStep {...defaultProps} />);
    const firstNameInput = screen.getByLabelText(/first name/i);
    fireEvent.change(firstNameInput, { target: { name: 'first_name', value: 'John' } });
    expect(defaultProps.onDataChange).toHaveBeenCalled();
  });

  test('initializes from initialData', () => {
    renderWithTheme(
      <PersonalInfoStep
        {...defaultProps}
        initialData={{ ...defaultProps.initialData, first_name: 'Jane' }}
      />
    );
    expect(screen.getByLabelText(/first name/i)).toHaveValue('Jane');
  });

  test('displays external errors', () => {
    renderWithTheme(
      <PersonalInfoStep
        {...defaultProps}
        errors={{ first_name: 'First name is required' }}
      />
    );
    expect(screen.getByText('First name is required')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend/react-Admin3 && npx react-scripts test --testPathPattern=PersonalInfoStep --watchAll=false`
Expected: FAIL — module not found

**Step 3: Create the component**

Extract the case 1 JSX from `UserFormWizard.renderStepContent()` (lines 1321-1527) into a standalone component. The component owns its local state and reports changes up.

Create `frontend/react-Admin3/src/components/User/steps/PersonalInfoStep.js`:

```javascript
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

  // Initialize from initialData when it changes
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setForm(prev => ({ ...prev, ...initialData }));
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
  }, [form, homePhoneCountry, mobilePhoneCountry, phoneValidation]);

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
        <Typography variant="h5">Personal & Contact Information</Typography>
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
```

**Step 4: Run test to verify it passes**

Run: `cd frontend/react-Admin3 && npx react-scripts test --testPathPattern=PersonalInfoStep --watchAll=false`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/User/steps/PersonalInfoStep.js
git add frontend/react-Admin3/src/components/__tests__/PersonalInfoStep.test.js
git commit -m "feat: extract PersonalInfoStep from UserFormWizard"
```

---

## Task 4: Create HomeAddressStep component

**Files:**
- Create: `frontend/react-Admin3/src/components/User/steps/HomeAddressStep.js`
- Test: `frontend/react-Admin3/src/components/__tests__/HomeAddressStep.test.js`

**Step 1: Write the failing test**

```javascript
// frontend/react-Admin3/src/components/__tests__/HomeAddressStep.test.js
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import HomeAddressStep from '../User/steps/HomeAddressStep';

jest.mock('../Address/SmartAddressInput', () => {
  return function MockSmartAddressInput({ fieldPrefix }) {
    return <div data-testid={`smart-address-${fieldPrefix}`}>SmartAddressInput</div>;
  };
});

jest.mock('../Address/DynamicAddressForm', () => {
  return function MockDynamicAddressForm({ fieldPrefix, readonly }) {
    return <div data-testid={`dynamic-form-${fieldPrefix}`} data-readonly={readonly}>DynamicAddressForm</div>;
  };
});

const theme = createTheme();
const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('HomeAddressStep', () => {
  const defaultProps = {
    initialData: { home_country: '', home_address: '', home_city: '', home_postal_code: '' },
    onDataChange: jest.fn(),
    errors: {},
    mode: 'registration',
  };

  test('renders home address heading', () => {
    renderWithTheme(<HomeAddressStep {...defaultProps} />);
    expect(screen.getByText(/home address/i)).toBeInTheDocument();
  });

  test('renders SmartAddressInput in registration mode', () => {
    renderWithTheme(<HomeAddressStep {...defaultProps} />);
    expect(screen.getByTestId('smart-address-home')).toBeInTheDocument();
  });

  test('renders readonly DynamicAddressForm when readOnly=true', () => {
    renderWithTheme(
      <HomeAddressStep
        {...defaultProps}
        initialData={{ ...defaultProps.initialData, home_country: 'United Kingdom' }}
        readOnly={true}
      />
    );
    const form = screen.getByTestId('dynamic-form-home');
    expect(form).toHaveAttribute('data-readonly', 'true');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend/react-Admin3 && npx react-scripts test --testPathPattern=HomeAddressStep --watchAll=false`
Expected: FAIL — module not found

**Step 3: Create the component**

Extract case 2 JSX from `UserFormWizard.renderStepContent()` (lines 1529-1661). The step manages its own editing state (readonly vs smart input vs manual).

Create `frontend/react-Admin3/src/components/User/steps/HomeAddressStep.js`:

```javascript
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Button, Alert, Divider,
} from "@mui/material";
import { Home, Edit as EditIcon } from "@mui/icons-material";
import SmartAddressInput from "../../Address/SmartAddressInput";
import DynamicAddressForm from "../../Address/DynamicAddressForm";
import { useTheme } from "@mui/material/styles";

const HomeAddressStep = ({
  initialData = {},
  onDataChange,
  errors = {},
  mode = "registration",
  readOnly = false,
}) => {
  const theme = useTheme();
  const isProfileMode = mode === "profile" || mode === "admin";

  const [form, setForm] = useState({
    home_building: "",
    home_address: "",
    home_district: "",
    home_city: "",
    home_county: "",
    home_postal_code: "",
    home_state: "",
    home_country: "",
    ...initialData,
  });

  const [useSmartInput, setUseSmartInput] = useState(!isProfileMode);
  const [isEditing, setIsEditing] = useState(!isProfileMode);

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setForm(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  useEffect(() => {
    onDataChange?.(form);
  }, [form]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  if (readOnly) {
    return (
      <Box>
        <Box sx={{ textAlign: "center", mb: theme.spacingTokens?.sm || 2, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
          <Home sx={{ fontSize: "3rem", color: theme.palette.scales?.granite?.[30] || "grey" }} />
          <Typography variant="h5">Home Address</Typography>
        </Box>
        <Divider sx={{ mb: theme.spacingTokens?.lg || 3 }} />
        {form.home_country ? (
          <DynamicAddressForm
            country={form.home_country}
            values={form}
            onChange={handleChange}
            errors={{}}
            fieldPrefix="home"
            showOptionalFields={true}
            readonly={true}
          />
        ) : (
          <Alert severity="info">No home address on file.</Alert>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ textAlign: "center", mb: theme.spacingTokens?.sm || 2, display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
        <Home sx={{ fontSize: "3rem", color: theme.palette.scales?.granite?.[30] || "grey" }} />
        <Typography variant="h5">Home Address</Typography>
      </Box>
      <Divider sx={{ mb: theme.spacingTokens?.lg || 3 }} />

      {!isEditing ? (
        <Box>
          {form.home_country ? (
            <DynamicAddressForm
              country={form.home_country}
              values={form}
              onChange={handleChange}
              errors={{}}
              fieldPrefix="home"
              showOptionalFields={true}
              readonly={true}
            />
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              No home address on file. Click "Edit Address" to add your address.
            </Alert>
          )}
          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => {
                setIsEditing(true);
                setUseSmartInput(!form.home_country);
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
                country={form.home_country}
                values={form}
                onChange={handleChange}
                errors={errors}
                fieldPrefix="home"
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
                fieldPrefix="home"
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
  );
};

export default HomeAddressStep;
```

**Step 4: Run test to verify it passes**

Run: `cd frontend/react-Admin3 && npx react-scripts test --testPathPattern=HomeAddressStep --watchAll=false`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/User/steps/HomeAddressStep.js
git add frontend/react-Admin3/src/components/__tests__/HomeAddressStep.test.js
git commit -m "feat: extract HomeAddressStep from UserFormWizard"
```

---

## Task 5: Create WorkAddressStep component

**Files:**
- Create: `frontend/react-Admin3/src/components/User/steps/WorkAddressStep.js`
- Test: `frontend/react-Admin3/src/components/__tests__/WorkAddressStep.test.js`

**Step 1: Write the failing test**

```javascript
// frontend/react-Admin3/src/components/__tests__/WorkAddressStep.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import WorkAddressStep from '../User/steps/WorkAddressStep';

jest.mock('../Address/SmartAddressInput', () => {
  return function MockSmartAddressInput({ fieldPrefix }) {
    return <div data-testid={`smart-address-${fieldPrefix}`}>SmartAddressInput</div>;
  };
});

jest.mock('../Address/DynamicAddressForm', () => {
  return function MockDynamicAddressForm({ fieldPrefix }) {
    return <div data-testid={`dynamic-form-${fieldPrefix}`}>DynamicAddressForm</div>;
  };
});

jest.mock('../User/ValidatedPhoneInput', () => {
  return function MockValidatedPhoneInput({ name, label }) {
    return <input data-testid={`phone-${name}`} aria-label={label} />;
  };
});

const theme = createTheme();
const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('WorkAddressStep', () => {
  const defaultProps = {
    initialData: { showWorkSection: false },
    onDataChange: jest.fn(),
    errors: {},
    mode: 'registration',
  };

  test('renders Add Work Address button', () => {
    renderWithTheme(<WorkAddressStep {...defaultProps} />);
    expect(screen.getByText(/add work address/i)).toBeInTheDocument();
  });

  test('shows work fields after clicking Add Work Address', () => {
    renderWithTheme(<WorkAddressStep {...defaultProps} />);
    fireEvent.click(screen.getByText(/add work address/i));
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
  });

  test('renders work address fields when initialData has showWorkSection=true', () => {
    renderWithTheme(
      <WorkAddressStep
        {...defaultProps}
        initialData={{ showWorkSection: true, work_company: 'Acme Corp' }}
      />
    );
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend/react-Admin3 && npx react-scripts test --testPathPattern=WorkAddressStep --watchAll=false`
Expected: FAIL

**Step 3: Create the component**

Extract case 3 JSX from `UserFormWizard.renderStepContent()` (lines 1663-1920). This step includes work address + work phone + work email.

Create `frontend/react-Admin3/src/components/User/steps/WorkAddressStep.js` — mirrors the existing case 3 logic from UserFormWizard with local state for `showWorkSection`, `isEditing`, `useSmartInput`, work phone country, and work phone validation. Reports all data via `onDataChange`. Include the toggle button for adding/removing work address, company/department fields, DynamicAddressForm/SmartAddressInput toggle, ValidatedPhoneInput for work phone, and work email TextField.

The component should follow the same pattern as `HomeAddressStep` but additionally include:
- `showWorkSection` toggle (Add/Remove Work Address button)
- Company and Department TextFields
- Work phone (ValidatedPhoneInput) and work email (TextField) below the address form
- Report `showWorkSection` flag in `onDataChange` so parent knows if work address is active

**Step 4: Run test to verify it passes**

Run: `cd frontend/react-Admin3 && npx react-scripts test --testPathPattern=WorkAddressStep --watchAll=false`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/User/steps/WorkAddressStep.js
git add frontend/react-Admin3/src/components/__tests__/WorkAddressStep.test.js
git commit -m "feat: extract WorkAddressStep from UserFormWizard"
```

---

## Task 6: Create PreferencesStep component

**Files:**
- Create: `frontend/react-Admin3/src/components/User/steps/PreferencesStep.js`
- Test: `frontend/react-Admin3/src/components/__tests__/PreferencesStep.test.js`

**Step 1: Write the failing test**

```javascript
// frontend/react-Admin3/src/components/__tests__/PreferencesStep.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import PreferencesStep from '../User/steps/PreferencesStep';

const theme = createTheme();
const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('PreferencesStep', () => {
  const defaultProps = {
    initialData: { send_invoices_to: 'HOME', send_study_material_to: 'HOME' },
    onDataChange: jest.fn(),
    errors: {},
    mode: 'registration',
    hasWorkAddress: false,
  };

  test('renders delivery preferences', () => {
    renderWithTheme(<PreferencesStep {...defaultProps} />);
    expect(screen.getByText(/send invoices to/i)).toBeInTheDocument();
    expect(screen.getByText(/send study materials to/i)).toBeInTheDocument();
  });

  test('disables WORK option when no work address', () => {
    renderWithTheme(<PreferencesStep {...defaultProps} />);
    const workRadios = screen.getAllByLabelText(/work address/i);
    workRadios.forEach(radio => {
      expect(radio).toBeDisabled();
    });
  });

  test('enables WORK option when hasWorkAddress is true', () => {
    renderWithTheme(<PreferencesStep {...defaultProps} hasWorkAddress={true} />);
    const workRadios = screen.getAllByLabelText(/work address/i);
    workRadios.forEach(radio => {
      expect(radio).not.toBeDisabled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend/react-Admin3 && npx react-scripts test --testPathPattern=PreferencesStep --watchAll=false`
Expected: FAIL

**Step 3: Create the component**

Extract case 4 JSX from `UserFormWizard.renderStepContent()` (lines 1922-1994).

Create `frontend/react-Admin3/src/components/User/steps/PreferencesStep.js`:

```javascript
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, Grid, FormControl, FormLabel,
  FormControlLabel, Radio, RadioGroup,
} from "@mui/material";
import { Phone } from "@mui/icons-material";

const PreferencesStep = ({
  initialData = {},
  onDataChange,
  errors = {},
  mode = "registration",
  hasWorkAddress = false,
  readOnly = false,
}) => {
  const [form, setForm] = useState({
    send_invoices_to: "HOME",
    send_study_material_to: "HOME",
    ...initialData,
  });

  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setForm(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  useEffect(() => {
    onDataChange?.(form);
  }, [form]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  return (
    <Box sx={{ minHeight: "400px" }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Phone sx={{ fontSize: "3rem", color: "primary.main", mb: 2 }} />
        <Typography variant="h4" gutterBottom>Delivery Preferences</Typography>
        <Typography variant="body2" color="text.secondary">
          Choose where to send your materials
        </Typography>
      </Box>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend" required>
              <Typography variant="h6">Send invoices to</Typography>
            </FormLabel>
            <RadioGroup
              name="send_invoices_to"
              value={form.send_invoices_to}
              onChange={handleChange}
              sx={{ mt: 1 }}
            >
              <FormControlLabel value="HOME" control={<Radio />} label="Home Address" disabled={readOnly} />
              <FormControlLabel value="WORK" control={<Radio />} label="Work Address" disabled={!hasWorkAddress || readOnly} />
            </RadioGroup>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend" required>
              <Typography variant="h6">Send study materials to</Typography>
            </FormLabel>
            <RadioGroup
              name="send_study_material_to"
              value={form.send_study_material_to}
              onChange={handleChange}
              sx={{ mt: 1 }}
            >
              <FormControlLabel value="HOME" control={<Radio />} label="Home Address" disabled={readOnly} />
              <FormControlLabel value="WORK" control={<Radio />} label="Work Address" disabled={!hasWorkAddress || readOnly} />
            </RadioGroup>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PreferencesStep;
```

**Step 4: Run test to verify it passes**

Run: `cd frontend/react-Admin3 && npx react-scripts test --testPathPattern=PreferencesStep --watchAll=false`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/User/steps/PreferencesStep.js
git add frontend/react-Admin3/src/components/__tests__/PreferencesStep.test.js
git commit -m "feat: extract PreferencesStep from UserFormWizard"
```

---

## Task 7: Create SecurityStep component

**Files:**
- Create: `frontend/react-Admin3/src/components/User/steps/SecurityStep.js`
- Test: `frontend/react-Admin3/src/components/__tests__/SecurityStep.test.js`

**Step 1: Write the failing test**

```javascript
// frontend/react-Admin3/src/components/__tests__/SecurityStep.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import SecurityStep from '../User/steps/SecurityStep';

const theme = createTheme();
const renderWithTheme = (ui) =>
  render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('SecurityStep', () => {
  const defaultProps = {
    initialData: { password: '', confirmPassword: '' },
    onDataChange: jest.fn(),
    errors: {},
    mode: 'registration',
  };

  test('renders password fields in registration mode', () => {
    renderWithTheme(<SecurityStep {...defaultProps} />);
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  test('shows Change Password button in profile mode', () => {
    renderWithTheme(<SecurityStep {...defaultProps} mode="profile" />);
    expect(screen.getByText(/change password/i)).toBeInTheDocument();
  });

  test('does not render in admin mode', () => {
    renderWithTheme(<SecurityStep {...defaultProps} mode="admin" />);
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/not available/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend/react-Admin3 && npx react-scripts test --testPathPattern=SecurityStep --watchAll=false`
Expected: FAIL

**Step 3: Create the component**

Extract case 5 JSX from `UserFormWizard.renderStepContent()` (lines 1996-2126).

Create `frontend/react-Admin3/src/components/User/steps/SecurityStep.js` — mirrors the existing case 5 logic with local state for `isChangingPassword`. In `admin` mode, render a message that password management is not available here.

**Step 4: Run test to verify it passes**

Run: `cd frontend/react-Admin3 && npx react-scripts test --testPathPattern=SecurityStep --watchAll=false`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/User/steps/SecurityStep.js
git add frontend/react-Admin3/src/components/__tests__/SecurityStep.test.js
git commit -m "feat: extract SecurityStep from UserFormWizard"
```

---

## Task 8: Create barrel export

**Files:**
- Create: `frontend/react-Admin3/src/components/User/steps/index.js`

**Step 1: Create the barrel file**

```javascript
// frontend/react-Admin3/src/components/User/steps/index.js
export { default as PersonalInfoStep } from './PersonalInfoStep';
export { default as HomeAddressStep } from './HomeAddressStep';
export { default as WorkAddressStep } from './WorkAddressStep';
export { default as PreferencesStep } from './PreferencesStep';
export { default as SecurityStep } from './SecurityStep';
```

**Step 2: Commit**

```bash
git add frontend/react-Admin3/src/components/User/steps/index.js
git commit -m "feat: add barrel export for step components"
```

---

## Task 9: Refactor UserFormWizard to use step components

**Files:**
- Modify: `frontend/react-Admin3/src/components/User/UserFormWizard.js`

**Step 1: Run existing tests to baseline**

Run: `cd frontend/react-Admin3 && npx react-scripts test --testPathPattern=UserFormWizard --watchAll=false`
Expected: Note current pass/fail status

**Step 2: Refactor renderStepContent()**

In `UserFormWizard.js`:

1. Add import at top:
```javascript
import { PersonalInfoStep, HomeAddressStep, WorkAddressStep, PreferencesStep, SecurityStep } from './steps';
```

2. Add state to accumulate step data:
```javascript
const [stepData, setStepData] = useState({});

const handleStepDataChange = useCallback((stepKey, data) => {
  setStepData(prev => ({ ...prev, [stepKey]: data }));
  // Also merge into the flat form object for backward compatibility with existing submit logic
  setForm(prev => {
    const newForm = { ...prev };
    Object.keys(data).forEach(key => {
      if (!key.startsWith('_')) { // Skip metadata keys like _phoneCountries
        newForm[key] = data[key];
      }
    });
    return newForm;
  });
}, []);
```

3. Replace `renderStepContent()` cases with step component instances:
```javascript
const renderStepContent = () => {
  switch (currentStep) {
    case 1:
      return (
        <PersonalInfoStep
          initialData={{
            title: form.title,
            first_name: form.first_name,
            last_name: form.last_name,
            email: form.email,
            home_phone: form.home_phone,
            mobile_phone: form.mobile_phone,
          }}
          onDataChange={(data) => handleStepDataChange('personal', data)}
          errors={hasUserInteracted ? fieldErrors : {}}
          mode={mode}
        />
      );
    case 2:
      return (
        <HomeAddressStep
          initialData={Object.fromEntries(
            Object.entries(form).filter(([k]) => k.startsWith('home_'))
          )}
          onDataChange={(data) => handleStepDataChange('homeAddress', data)}
          errors={hasUserInteracted ? fieldErrors : {}}
          mode={mode}
        />
      );
    case 3:
      return (
        <WorkAddressStep
          initialData={{
            showWorkSection,
            ...Object.fromEntries(
              Object.entries(form).filter(([k]) => k.startsWith('work_'))
            ),
          }}
          onDataChange={(data) => {
            const { showWorkSection: showWork, ...rest } = data;
            if (showWork !== undefined) setShowWorkSection(showWork);
            handleStepDataChange('workAddress', rest);
          }}
          errors={hasUserInteracted ? fieldErrors : {}}
          mode={mode}
        />
      );
    case 4:
      return (
        <PreferencesStep
          initialData={{
            send_invoices_to: form.send_invoices_to,
            send_study_material_to: form.send_study_material_to,
          }}
          onDataChange={(data) => handleStepDataChange('preferences', data)}
          errors={hasUserInteracted ? fieldErrors : {}}
          mode={mode}
          hasWorkAddress={showWorkSection}
        />
      );
    case 5:
      return (
        <SecurityStep
          initialData={{
            password: form.password,
            confirmPassword: form.confirmPassword,
          }}
          onDataChange={(data) => handleStepDataChange('security', data)}
          errors={hasUserInteracted ? fieldErrors : {}}
          mode={mode}
        />
      );
    default:
      return null;
  }
};
```

4. Remove the ~1200 lines of inline step JSX that was replaced.

**Step 3: Run tests to verify no regressions**

Run: `cd frontend/react-Admin3 && npx react-scripts test --testPathPattern=UserFormWizard --watchAll=false`
Expected: All existing tests still pass. Some tests may need minor updates to account for the new component structure (mocking step components instead of querying inline fields).

**Step 4: Verify visually**

Navigate to registration page and profile page. Walk through all 5 steps, verify each step renders correctly.

**Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/User/UserFormWizard.js
git commit -m "refactor: UserFormWizard uses extracted step components"
```

---

## Task 10: Rebuild AdminUserProfileForm with MUI Stepper

**Files:**
- Modify: `frontend/react-Admin3/src/components/admin/user-profiles/UserProfileForm.js`
- Test: `frontend/react-Admin3/src/components/__tests__/AdminUserProfileForm.test.js`

**Step 1: Write the failing test**

```javascript
// frontend/react-Admin3/src/components/__tests__/AdminUserProfileForm.test.js
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminUserProfileForm from '../admin/user-profiles/UserProfileForm';

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ isSuperuser: true }),
}));

jest.mock('../../services/userProfileService', () => ({
  __esModule: true,
  default: {
    getById: jest.fn().mockResolvedValue({
      id: 1,
      title: 'Mr',
      user: { id: 5, email: 'test@test.com', first_name: 'John', last_name: 'Doe' },
      send_invoices_to: 'HOME',
      send_study_material_to: 'HOME',
    }),
    getAddresses: jest.fn().mockResolvedValue([]),
    getContacts: jest.fn().mockResolvedValue([]),
    getEmails: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ id: 1 }),
  },
}));

// Mock all step components
jest.mock('../User/steps', () => ({
  PersonalInfoStep: ({ mode }) => <div data-testid="personal-step" data-mode={mode}>PersonalInfoStep</div>,
  HomeAddressStep: ({ mode }) => <div data-testid="home-step" data-mode={mode}>HomeAddressStep</div>,
  WorkAddressStep: ({ mode }) => <div data-testid="work-step" data-mode={mode}>WorkAddressStep</div>,
  PreferencesStep: ({ mode }) => <div data-testid="preferences-step" data-mode={mode}>PreferencesStep</div>,
}));

const theme = createTheme();
const renderWithProviders = (ui, { route = '/admin/user-profiles/1/edit' } = {}) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/admin/user-profiles/:id/edit" element={ui} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );

describe('AdminUserProfileForm', () => {
  test('renders MUI Stepper with 4 steps', async () => {
    renderWithProviders(<AdminUserProfileForm />);
    await waitFor(() => {
      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Preferences')).toBeInTheDocument();
    });
  });

  test('renders step components with mode=admin', async () => {
    renderWithProviders(<AdminUserProfileForm />);
    await waitFor(() => {
      const step = screen.getByTestId('personal-step');
      expect(step).toHaveAttribute('data-mode', 'admin');
    });
  });

  test('does not include SecurityStep', async () => {
    renderWithProviders(<AdminUserProfileForm />);
    await waitFor(() => {
      expect(screen.queryByText('Security')).not.toBeInTheDocument();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd frontend/react-Admin3 && npx react-scripts test --testPathPattern=AdminUserProfileForm --watchAll=false`
Expected: FAIL (current component doesn't have Stepper)

**Step 3: Rebuild the component**

Rewrite `frontend/react-Admin3/src/components/admin/user-profiles/UserProfileForm.js` to use MUI Stepper with the shared step components:

```javascript
import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Stepper, Step, StepLabel, Button, Alert,
  Box, Typography, CircularProgress, Paper, Snackbar,
} from '@mui/material';
import { Person, Home, Business, Phone } from '@mui/icons-material';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import userProfileService from '../../../services/userProfileService';
import { PersonalInfoStep, HomeAddressStep, WorkAddressStep, PreferencesStep } from '../../User/steps';

const ADMIN_STEPS = [
  { title: 'Personal', icon: Person },
  { title: 'Home', icon: Home },
  { title: 'Work', icon: Business },
  { title: 'Preferences', icon: Phone },
];

const AdminUserProfileForm = () => {
  const { isSuperuser } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [stepData, setStepData] = useState({});
  const [hasWorkAddress, setHasWorkAddress] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const [profile, addresses, contacts] = await Promise.all([
        userProfileService.getById(id),
        userProfileService.getAddresses(id),
        userProfileService.getContacts(id),
      ]);
      setProfileData({ ...profile, addresses, contacts });
    } catch (err) {
      setError('Failed to fetch user profile details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleStepDataChange = useCallback((stepKey, data) => {
    setStepData(prev => ({ ...prev, [stepKey]: data }));
    if (stepKey === 'workAddress' && data.showWorkSection !== undefined) {
      setHasWorkAddress(data.showWorkSection);
    }
  }, []);

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {};
      // Flatten step data into update payload
      Object.values(stepData).forEach(data => {
        Object.entries(data).forEach(([key, value]) => {
          if (!key.startsWith('_') && key !== 'showWorkSection') {
            payload[key] = value;
          }
        });
      });
      await userProfileService.update(id, payload);
      setSnackbar({ open: true, message: 'Profile updated successfully', severity: 'success' });
    } catch (err) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isSuperuser) return <Navigate to="/" replace />;
  if (loading) return <Box sx={{ textAlign: 'center', mt: 5 }}><CircularProgress /></Box>;

  // Transform profile data into step-compatible slices
  const personalData = profileData ? {
    title: profileData.title || '',
    first_name: profileData.user?.first_name || '',
    last_name: profileData.user?.last_name || '',
    email: profileData.user?.email || '',
    home_phone: '', // From contacts
    mobile_phone: '',
  } : {};

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <PersonalInfoStep
            initialData={personalData}
            onDataChange={(data) => handleStepDataChange('personal', data)}
            errors={{}}
            mode="admin"
          />
        );
      case 1:
        return (
          <HomeAddressStep
            initialData={{}}
            onDataChange={(data) => handleStepDataChange('homeAddress', data)}
            errors={{}}
            mode="admin"
          />
        );
      case 2:
        return (
          <WorkAddressStep
            initialData={{}}
            onDataChange={(data) => handleStepDataChange('workAddress', data)}
            errors={{}}
            mode="admin"
          />
        );
      case 3:
        return (
          <PreferencesStep
            initialData={{
              send_invoices_to: profileData?.send_invoices_to || 'HOME',
              send_study_material_to: profileData?.send_study_material_to || 'HOME',
            }}
            onDataChange={(data) => handleStepDataChange('preferences', data)}
            errors={{}}
            mode="admin"
            hasWorkAddress={hasWorkAddress}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h2" sx={{ mb: 3 }}>
        Edit User Profile
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {ADMIN_STEPS.map((step, index) => (
            <Step
              key={step.title}
              completed={activeStep > index}
              sx={{ cursor: 'pointer' }}
              onClick={() => setActiveStep(index)}
            >
              <StepLabel icon={<step.icon />}>{step.title}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Box>
            {activeStep > 0 && (
              <Button onClick={() => setActiveStep(prev => prev - 1)} disabled={isSubmitting}>
                Back
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="outlined" onClick={() => navigate('/admin/user-profiles')} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
            {activeStep < ADMIN_STEPS.length - 1 && (
              <Button variant="contained" onClick={() => setActiveStep(prev => prev + 1)} disabled={isSubmitting}>
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminUserProfileForm;
```

**Step 4: Run tests to verify they pass**

Run: `cd frontend/react-Admin3 && npx react-scripts test --testPathPattern=AdminUserProfileForm --watchAll=false`
Expected: PASS (3 tests)

**Step 5: Verify visually**

Navigate to `/admin/user-profiles/{id}/edit`. Verify:
- MUI Stepper shows 4 steps
- Each step renders the shared component
- Navigation works (Back, Next, click on step)
- Save button works

**Step 6: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/user-profiles/UserProfileForm.js
git add frontend/react-Admin3/src/components/__tests__/AdminUserProfileForm.test.js
git commit -m "feat: rebuild AdminUserProfileForm with MUI Stepper and shared step components"
```

---

## Task 11: Final integration test and cleanup

**Step 1: Run full test suite**

Run: `cd frontend/react-Admin3 && npx react-scripts test --watchAll=false`
Expected: All tests pass

**Step 2: Fix any test failures from the refactoring**

The existing `UserFormWizard.test.js` may need updates since step content is now in separate components. Update mocks as needed.

**Step 3: Final commit**

```bash
git add -A
git commit -m "test: update tests for step component refactoring"
```
