# Component Analysis: Profile Wizard Refactor

**Date**: 2025-10-27
**Tasks**: T001-T004 (Phase 1: Setup and Preparation)

## T001: RegistrationWizard Component Structure

### File Location
`frontend/react-Admin3/src/components/User/RegistrationWizard.js` (1152 lines)

### Component Architecture

#### State Management Patterns
```javascript
// Primary form state (lines 93-94)
const [currentStep, setCurrentStep] = useState(1);
const [form, setForm] = useState(initialForm);

// Validation and UI state (lines 95-98)
const [fieldErrors, setFieldErrors] = useState({});
const [isLoading, setIsLoading] = useState(false);
const [showWorkSection, setShowWorkSection] = useState(false);
const [hasUserInteracted, setHasUserInteracted] = useState(false);

// Phone validation state (lines 107-111)
const [phoneValidation, setPhoneValidation] = useState({
  home_phone: { isValid: true, error: null },
  mobile_phone: { isValid: true, error: null },
  work_phone: { isValid: true, error: null },
});

// Country and phone country state (lines 99-102)
const [countryList, setCountryList] = useState([]);
const [homePhoneCountry, setHomePhoneCountry] = useState(null);
const [mobilePhoneCountry, setMobilePhoneCountry] = useState(null);
const [workPhoneCountry, setWorkPhoneCountry] = useState(null);
```

#### Initial Form State Structure (lines 35-77)
```javascript
const initialForm = {
  title: "",
  first_name: "",
  last_name: "",
  email: "",

  // Home address fields (9 fields)
  home_building: "", home_street: "", home_district: "",
  home_town: "", home_county: "", home_postcode: "",
  home_state: "", home_country: "",

  // Work address fields (10 fields)
  work_company: "", work_department: "", work_building: "",
  work_street: "", work_district: "", work_town: "",
  work_county: "", work_postcode: "", work_state: "", work_country: "",

  // Contact info (5 fields)
  home_phone: "", work_phone: "", mobile_phone: "",
  personal_email: "", work_email: "",

  // Preferences (2 fields)
  send_invoices_to: "HOME",
  send_study_material_to: "HOME",

  // Security (2 fields)
  password: "",
  confirmPassword: "",
};
```

### Wizard Step Structure

#### Step Definitions (lines 79-90)
```javascript
const STEPS = [
  { id: 1, title: "Personal", subtitle: "Basic & contact info", icon: Person },
  { id: 2, title: "Home", subtitle: "Home address", icon: Home },
  { id: 3, title: "Work", subtitle: "Work details", icon: Business },
  { id: 4, title: "Preferences", subtitle: "Delivery preferences", icon: Phone },
  { id: 5, title: "Security", subtitle: "Password setup", icon: Lock },
];
```

#### Step Navigation Logic
- **Current Step Tracking**: `currentStep` state (line 93)
- **Progress Calculation**: `getProgressPercentage()` = (currentStep / 5) * 100 (lines 519-521)
- **Next Step Handler**: `handleNextStep()` (lines 362-391)
  - Validates current step
  - Sets field errors
  - Triggers shake animation for invalid fields
  - Focuses first error field
  - Advances to next step or calls `handleSubmit()` on step 5
- **Previous Step Handler**: `handlePrevStep()` (lines 393-397)

### Validation Logic

#### Step-by-Step Validation (lines 258-360)
```javascript
const validateStep = (step) => {
  const errors = {};

  switch (step) {
    case 1: // Personal Information
      - first_name, last_name, email required
      - mobile_phone required + phone validation
      - home_phone phone validation (optional)

    case 2: // Home Address
      - home_country required
      - Dynamic validation based on country (uses addressMetadataService)
      - Required fields vary by country

    case 3: // Work Address (conditional)
      - Only validates if showWorkSection is true
      - work_company required
      - work_country required + dynamic validation

    case 4: // Preferences
      - No validation (has defaults)

    case 5: // Security
      - password required (minimum 8 characters)
      - confirmPassword required
      - passwords must match
  }

  return errors;
};
```

**Key Pattern**: Uses `addressMetadataService` for dynamic country-specific validation (lines 287-305, 317-336)

### API Integration Points

#### Registration Endpoint (lines 399-484)
```javascript
const handleSubmit = async () => {
  // 1. Final validation across all steps (lines 406-433)
  // 2. Prepare registration data (lines 438-463)
  const payload = {
    username: form.email,
    password: form.password,
    email: form.email,
    first_name: form.first_name,
    last_name: form.last_name,
    profile: {
      title, send_invoices_to, send_study_material_to,
      home_address: formatAddressData("home"),
      work_address: showWorkSection ? formatAddressData("work") : {},
      home_phone, work_phone, mobile_phone, work_email
    }
  };

  // 3. Call authService.register(payload) (line 465)
  const result = await authService.register(payload);

  // 4. Handle success/error via callbacks (lines 467-480)
  if (result.status === "success") {
    if (onSuccess) onSuccess(result);
  } else {
    if (onError) onError(result.message || "Registration failed");
  }
};
```

#### Address Data Formatting (lines 486-517)
Uses `addressMetadataService` to format address data based on country requirements:
- Maps form fields to address JSON structure
- Includes only fields with values
- Adds company/department for work addresses

### Mode-Specific Logic (REGISTRATION-ONLY)

#### Registration-Specific Text (needs to be made dynamic)
| Location | Current Text | Profile Mode Should Be |
|----------|-------------|----------------------|
| Line 1003 | "Create Your ActEd Account" | "Update Your Profile" |
| Line 1009 | "Follow these steps below to register your account" | "Update your profile information" |
| Line 1127 | "Create Account" | "Save Changes" |
| Line 634 | "This will be your login username" | (remove or make conditional) |
| Lines 1142-1145 | "Already have an account? Login" link | (hide in profile mode) |

#### Password Validation (needs to be optional in profile mode)
**Lines 346-352**: Password is REQUIRED in registration mode
```javascript
case 5: // Security
  if (!form.password.trim()) errors.password = "Password is required";
  else if (form.password.length < 8)
    errors.password = "Password must be at least 8 characters";
  if (!form.confirmPassword.trim())
    errors.confirmPassword = "Please confirm your password";
  else if (form.password !== form.confirmPassword)
    errors.confirmPassword = "Passwords do not match";
```

**Profile Mode Requirement**: Password should be OPTIONAL (only validate if provided)

### Component Dependencies

#### Material-UI Components (lines 2-27)
- Layout: Box, Card, CardContent, CardHeader, CardActions, Grid, Paper, Divider
- Input: TextField, Select, MenuItem, FormControl, InputLabel, FormControlLabel, Radio, RadioGroup, FormLabel, Autocomplete
- Feedback: Alert, FormHelperText, LinearProgress, CircularProgress
- Display: Typography, Chip
- Navigation: Button

#### Icons (line 28)
Person, Home, Business, Phone, Lock (from @mui/icons-material)

#### Custom Components
- **ValidatedPhoneInput** (line 31): Phone number input with validation
- **SmartAddressInput** (line 32): Address input with country-specific fields

#### Services
- **authService** (line 29): `register()` method
- **addressMetadataService** (line 33): Country-specific address validation
- **config** (line 30): API base URL and configuration

### Visual Feedback Patterns

#### Shake Animation (lines 179-187, 973-986)
```javascript
// Trigger shake animation for invalid fields
const triggerFieldShake = (fieldNames) => {
  const newShakingFields = new Set(fieldNames);
  setShakingFields(newShakingFields);

  setTimeout(() => {
    setShakingFields(new Set());
  }, 800);
};

// CSS keyframes for shake animation (lines 973-986)
'@keyframes shake': {
  '0%, 100%': { transform: 'translateX(0)' },
  '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-3px)' },
  '20%, 40%, 60%, 80%': { transform: 'translateX(3px)' }
},
'& .field-error-shake': {
  animation: 'shake 0.5s ease-in-out',
  backgroundColor: 'rgba(244, 67, 54, 0.08)',
  borderRadius: '4px',
  padding: '4px',
  margin: '-4px',
  transition: 'background-color 0.3s ease-out'
}
```

#### Progressive Validation
- **Delayed Validation**: Only shows errors after `hasUserInteracted` is true (lines 171-176)
- **Clear on Change**: Clears field error when user starts typing (lines 249-255)
- **Auto-focus**: Focuses first error field on validation failure (lines 376-382)

### Props Interface
```javascript
RegistrationWizard({
  onSuccess,      // Callback on successful registration
  onError,        // Callback on registration error
  onSwitchToLogin // Callback to switch to login view (optional)
})
```

**Profile Mode Will Need**:
```javascript
UserFormWizard({
  mode,           // 'registration' | 'profile'
  initialData,    // Pre-fill data for profile mode
  onSuccess,      // Callback on success
  onError,        // Callback on error
  onSwitchToLogin // Only for registration mode
})
```

---

## T002: ProfileForm API Integration Patterns

### File Location
`frontend/react-Admin3/src/components/User/ProfileForm.js` (1060 lines)

### Dual-Mode Pattern (Already Implemented!)

ProfileForm already supports both registration and profile modes via `mode` prop:

```javascript
// Lines 67-68
mode = 'registration',  // or 'profile'

// Lines 122-123
const isProfileMode = mode === 'profile';
const isRegistrationMode = mode === 'registration';
```

### Profile Data Pre-filling Pattern (lines 143-211)

```javascript
// Fetch and populate form in profile mode
useEffect(() => {
  if (isProfileMode && initialData) {
    const newForm = {
      // User fields
      first_name: initialData.user?.first_name || "",
      last_name: initialData.user?.last_name || "",
      title: initialData.profile?.title || "",
      email: initialData.user?.email || "",

      // Home address fields
      home_building: initialData.home_address?.building || "",
      home_street: initialData.home_address?.street || "",
      home_district: initialData.home_address?.district || "",
      home_town: initialData.home_address?.town || "",
      home_county: initialData.home_address?.county || "",
      home_postcode: initialData.home_address?.postcode || "",
      home_state: initialData.home_address?.state || "",
      home_country: initialData.home_address?.country || "",

      // Work address fields
      work_company: initialData.work_address?.company || "",
      work_department: initialData.work_address?.department || "",
      work_building: initialData.work_address?.building || "",
      work_street: initialData.work_address?.street || "",
      work_district: initialData.work_address?.district || "",
      work_town: initialData.work_address?.town || "",
      work_county: initialData.work_address?.county || "",
      work_postcode: initialData.work_address?.postcode || "",
      work_state: initialData.work_address?.state || "",
      work_country: initialData.work_address?.country || "",

      // Preferences
      send_invoices_to: initialData.profile?.send_invoices_to || "HOME",
      send_study_material_to: initialData.profile?.send_study_material_to || "HOME",

      // Contact numbers
      home_phone: initialData.contact_numbers?.home_phone || "",
      work_phone: initialData.contact_numbers?.work_phone || "",
      mobile_phone: initialData.contact_numbers?.mobile_phone || "",

      // Password fields empty in profile mode
      password: "",
      confirmPassword: ""
    };

    setForm(newForm);

    // Set work address visibility (lines 193-199)
    const hasWorkAddress = initialData.work_address && (
      initialData.work_address.company ||
      initialData.work_address.street ||
      initialData.work_address.town
    );
    setShowWork(!!hasWorkAddress);

    // Auto-show home address fields if data exists (lines 202-207)
    const hasHomeAddress = initialData.home_address && (
      initialData.home_address.street ||
      initialData.home_address.town
    );
    setShowHomeAddressFields(!!hasHomeAddress);
  }
}, [isProfileMode, initialData]);
```

**Key Pattern**: Uses optional chaining (`?.`) to safely access nested properties

### Password Validation Pattern (lines 245-258)

```javascript
// Password validation differs by mode
if (isRegistrationMode) {
  // Registration: password required
  if (!form.password) errors.password = "Password is required.";
  if (!form.confirmPassword) errors.confirmPassword = "Please confirm your password.";
  if (form.password && form.confirmPassword && form.password !== form.confirmPassword)
    errors.confirmPassword = "Passwords do not match.";
} else {
  // Profile mode: password optional but if provided, confirmation required
  if (form.password && !form.confirmPassword)
    errors.confirmPassword = "Please confirm your password.";
  if (form.password && form.confirmPassword && form.password !== form.confirmPassword)
    errors.confirmPassword = "Passwords do not match.";
}
```

**Reusable Pattern**: This exact logic should be used in UserFormWizard

### Submit Handler Pattern (lines 287-435)

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setEmailVerificationSent(false);

  // Validation
  const errors = validate();
  setFieldErrors(errors);

  if (Object.keys(errors).length > 0) {
    focusFirstError(errors);
    if (onError) onError("Please fix the validation errors above.");
    return;
  }

  setIsLoading(true);

  try {
    if (isProfileMode && onSubmit) {
      // PROFILE UPDATE MODE (lines 308-353)
      const profileData = {
        user: {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
        },
        profile: {
          title: form.title,
          send_invoices_to: form.send_invoices_to,
          send_study_material_to: form.send_study_material_to,
        },
        home_address: {
          building: form.home_building,
          street: form.home_street,
          district: form.home_district,
          town: form.home_town,
          county: form.home_county,
          postcode: form.home_postcode,
          state: form.home_state,
          country: form.home_country,
        },
        work_address: showWork ? {
          company: form.work_company,
          department: form.work_department,
          building: form.work_building,
          street: form.work_street,
          district: form.work_district,
          town: form.work_town,
          county: form.work_county,
          postcode: form.work_postcode,
          state: form.work_state,
          country: form.work_country,
        } : {},
        contact_numbers: {
          home_phone: form.home_phone,
          work_phone: showWork ? form.work_phone : "",
          mobile_phone: form.mobile_phone
        }
      };

      // Add password if provided (lines 349-351)
      if (form.password) {
        profileData.password = form.password;
      }

      await onSubmit(profileData);

    } else if (isRegistrationMode) {
      // REGISTRATION MODE (lines 356-424)
      // Similar structure but uses authService.register()
    }
  } catch (err) {
    const errorMessage = err.message || (isProfileMode ? "Profile update failed" : "Registration failed");
    setError(errorMessage);
    if (onError) onError(errorMessage);
  } finally {
    setIsLoading(false);
  }
};
```

### API Data Structure Expected

**Profile Data Response** (from initialData prop):
```javascript
{
  user: {
    first_name: string,
    last_name: string,
    email: string
  },
  profile: {
    title: string,
    send_invoices_to: "HOME" | "WORK",
    send_study_material_to: "HOME" | "WORK"
  },
  home_address: {
    building: string,
    street: string,
    district: string,
    town: string,
    county: string,
    postcode: string,
    state: string,
    country: string
  },
  work_address: {
    company: string,
    department: string,
    building: string,
    street: string,
    district: string,
    town: string,
    county: string,
    postcode: string,
    state: string,
    country: string
  },
  contact_numbers: {
    home_phone: string,
    work_phone: string,
    mobile_phone: string
  }
}
```

---

## T003: Email Verification Flow Documentation

### Current Implementation (ProfileForm lines 550-559)

```javascript
{/* Email verification alert in profile mode */}
{isProfileMode && emailVerificationSent && (
  <Alert severity="info" sx={{ mb: 4 }}>
    <AlertTitle sx={{ display: 'flex', alignItems: 'center' }}>
      <MarkEmailReadIcon sx={{ mr: 1 }} />
      Verification Email Sent
    </AlertTitle>
    Email verification sent! Please check your new email address and click the verification link.
  </Alert>
)}
```

### Email Verification Trigger Pattern

**Detection**: Compare old email vs new email during profile save
**Action**: Backend automatically handles email verification when email changes
**Feedback**: Frontend shows alert when `email_verification_sent` flag is returned

### Service Layer Integration

From `userService.js` (lines 38-77):

```javascript
updateUserProfile: async (profileData) => {
  try {
    const response = await httpService.patch(`${API_USER_URL}/update_profile/`, profileData);

    if (response.status === 200 && response.data) {
      logger.info("User profile updated successfully", {
        emailVerificationSent: response.data.email_verification_sent  // Backend flag
      });

      return {
        status: "success",
        message: response.data.message,
        email_verification_sent: response.data.email_verification_sent || false
      };
    }
  } catch (error) {
    // Error handling
  }
}
```

**Backend Responsibility**:
- Detects email change
- Generates verification token
- Sends verification email
- Returns `email_verification_sent: true` flag

**Frontend Responsibility**:
- Displays email verification alert
- Allows user to continue editing other fields
- No blocking UI

### UserFormWizard Integration Strategy

1. **Add email verification state**:
   ```javascript
   const [emailVerificationSent, setEmailVerificationSent] = useState(false);
   ```

2. **Handle response from updateUserProfile**:
   ```javascript
   const result = await userService.updateUserProfile(profileData);
   if (result.email_verification_sent) {
     setEmailVerificationSent(true);
   }
   ```

3. **Display alert** (similar to ProfileForm):
   ```javascript
   {mode === 'profile' && emailVerificationSent && (
     <Alert severity="info" sx={{ mb: 4 }}>
       <AlertTitle sx={{ display: 'flex', alignItems: 'center' }}>
         <MarkEmailReadIcon sx={{ mr: 1 }} />
         Verification Email Sent
       </AlertTitle>
       Email verification sent! Please check your new email address and click the verification link.
     </Alert>
   )}
   ```

---

## T004: Password Reset Email Requirements

### Current State: NO IMPLEMENTATION

**Finding**: authService.js does NOT have a `sendPasswordResetCompletedEmail()` method

### Required Functionality

**User Story**: When user changes password in profile mode, send `password_reset_completed` email notification

**Implementation Requirements**:

#### 1. Backend API Endpoint (NEW)
**Endpoint**: `POST /api/auth/password-reset-completed/`
**Payload**:
```javascript
{
  email: string  // User's email address
}
```
**Response**:
```javascript
{
  status: "success",
  message: "Password reset notification sent"
}
```

#### 2. Frontend Service Method (NEW)
**File**: `frontend/react-Admin3/src/services/authService.js`
**Method to Add**:
```javascript
sendPasswordResetCompletedEmail: async (email) => {
  try {
    logger.debug("Sending password reset completed email", { email });

    const response = await httpService.post(`${API_AUTH_URL}/password-reset-completed/`, {
      email: email
    });

    if (response.status === 200 && response.data) {
      logger.info("Password reset completed email sent successfully");
      return {
        status: "success",
        message: response.data.message || "Password reset notification sent"
      };
    }

    return {
      status: "error",
      message: "Invalid response format from server"
    };
  } catch (error) {
    logger.error("Failed to send password reset completed email", {
      error: error.response?.data || error,
      status: error.response?.status
    });

    return {
      status: "error",
      message: error.response?.data?.message || "Failed to send password reset notification"
    };
  }
}
```

#### 3. UserFormWizard Integration Pattern
**Detection Logic**:
```javascript
// Detect password change
const hasPasswordChanged = (
  mode === 'profile' &&
  form.password.trim() !== "" &&
  form.password !== initialData?.password  // Compare to original
);

// After successful profile update
if (hasPasswordChanged) {
  const emailResult = await authService.sendPasswordResetCompletedEmail(form.email);

  if (emailResult.status === "success") {
    // Show success notification
    setSuccessMessage("Password changed successfully. Notification email sent.");
  } else {
    // Log error but don't block user
    logger.error("Failed to send password reset email", emailResult);
  }
}
```

**UI Feedback**:
```javascript
// Success notification after password change
{passwordChangeSuccess && (
  <Alert severity="success" sx={{ mb: 4 }}>
    <AlertTitle>Password Changed</AlertTitle>
    Your password has been updated successfully. A confirmation email has been sent to your email address.
  </Alert>
)}
```

### Backend Requirements (Django)

**Email Template**: `password_reset_completed`
**Template Variables**:
- `user_name`: User's full name
- `email`: User's email address
- `timestamp`: When password was changed
- `support_email`: Support contact

**Email Content**:
```
Subject: Your ActEd Password Has Been Changed

Hi [User Name],

Your password for your ActEd account ([email]) was successfully changed on [timestamp].

If you did not make this change, please contact us immediately at [support_email].

Best regards,
ActEd Team
```

---

## Summary and Key Findings

### Tasks Completed ✅

- ✅ **T001**: RegistrationWizard component structure fully analyzed
- ✅ **T002**: ProfileForm API integration patterns documented
- ✅ **T003**: Email verification flow documented
- ✅ **T004**: Password reset email requirements defined

### Critical Discoveries

1. **Service Layer Status**:
   - ✅ `userService.getUserProfile()` - Already exists
   - ✅ `userService.updateUserProfile()` - Already exists
   - ✅ Email verification - Already handled in `updateUserProfile` response
   - ❌ `authService.sendPasswordResetCompletedEmail()` - **NEEDS TO BE CREATED**

2. **ProfileForm Dual-Mode Pattern**:
   - ProfileForm already implements `mode` prop pattern
   - Can use as reference for UserFormWizard implementation
   - Password validation pattern is PERFECT for reuse

3. **RegistrationWizard Mode-Specific Changes Needed**:
   - 5 text strings need to be dynamic (title, subtitle, button text)
   - Password validation needs to be optional in profile mode
   - Email helper text needs to be conditional
   - Login link needs to be hidden in profile mode

4. **Email Verification**:
   - Backend already fully functional
   - Just need to display alert when `email_verification_sent` flag is true
   - No frontend logic needed beyond UI feedback

5. **Password Reset Email**:
   - **BLOCKER**: Requires new backend endpoint
   - Need to implement `authService.sendPasswordResetCompletedEmail()`
   - Email template needs to be created in Django

### Next Phase: Service Layer Enhancement (T005-T007)

**Status**:
- T005: `getUserProfile()` - ✅ Already exists (skip or verify)
- T006: `updateUserProfile()` - ✅ Already exists (skip or verify)
- T007: `sendPasswordResetCompletedEmail()` - ❌ **MUST IMPLEMENT**

**Recommendation**: Skip T005 and T006 (already implemented), focus on T007

### Architecture Decisions for UserFormWizard

1. **Use SmartAddressInput**: Already integrated in RegistrationWizard (lines 707-713, 788-794)
2. **Use ValidatedPhoneInput**: Already integrated in RegistrationWizard (lines 643-677, 799-813)
3. **Use addressMetadataService**: For dynamic country-specific validation
4. **Copy Validation Logic**: From RegistrationWizard (lines 258-360)
5. **Copy Shake Animation**: From RegistrationWizard (lines 179-187, 973-986)
6. **Add Mode Prop**: Follow ProfileForm pattern (lines 67-68, 122-123)
7. **Add InitialData Prop**: Follow ProfileForm pattern (lines 70, 143-211)

### Refactoring Strategy

**Phase 3 (Rename)** should happen BEFORE any dual-mode logic to avoid breaking existing registration flow.

**MVP Scope** (US1-US3):
1. Rename RegistrationWizard → UserFormWizard
2. Add mode prop ('registration' | 'profile')
3. Add initialData prop for pre-filling
4. Make password optional in profile mode
5. Add profile data fetching in useEffect

**After MVP**:
- Incremental save (T023-T028)
- Email verification UI (T029-T033)
- Password change notification (T034-T037)
- Navigation integration (T038-T041)

---

## Files Referenced

1. `frontend/react-Admin3/src/components/User/RegistrationWizard.js` (1152 lines)
2. `frontend/react-Admin3/src/components/User/ProfileForm.js` (1060 lines)
3. `frontend/react-Admin3/src/services/userService.js` (144 lines)
4. `frontend/react-Admin3/src/services/authService.js` (371 lines)

**Total Lines Analyzed**: 2727 lines across 4 files
