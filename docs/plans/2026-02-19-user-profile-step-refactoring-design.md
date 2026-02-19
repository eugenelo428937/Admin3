# User Profile Step Component Refactoring Design

**Date**: 2026-02-19
**Status**: Approved

## Problem Statement

Three related issues need to be addressed:

1. **Table display bug**: `UserProfileList` and `StaffList` reference flat field names (`profile.user_email`) but the API returns nested objects (`profile.user.email` for profiles, `member.user_detail.email` for staff).

2. **UserFormWizard monolith**: The 5-step wizard (2370 lines) has all step rendering inline in `renderStepContent()`, making the steps non-reusable.

3. **Admin UserProfileForm**: Currently a basic form with limited editing. Needs to reuse the same step components for rich profile editing (addresses with SmartAddressInput, phone validation, etc.).

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Bug fix location | Frontend | Minimal change, no API contract change |
| Step state ownership | Local per step | Each step manages own state, reports changes up via `onDataChange` |
| Step file location | `src/components/User/steps/` with barrel export | Follows existing `User/` convention where shared components already live |
| Admin navigation | MUI Stepper (same as UserFormWizard) | Consistent UX, no tabs — both admin and registration use stepper |
| Admin steps | Steps 1-4 (no Security step) | Admin shouldn't set user passwords |
| Mode support | `'registration' | 'profile' | 'admin'` | Controls field visibility, required fields, and behavior per context |

## Architecture

### Step Component Contract

Every step component follows this interface:

```javascript
const SomeStep = ({
  initialData,       // Initial values for the step (from parent or API)
  onDataChange,      // (stepData) => void — called on every change
  errors,            // External errors (from parent/API)
  mode,              // 'registration' | 'profile' | 'admin'
  readOnly,          // boolean — for view-only scenarios
}) => {
  const [localForm, setLocalForm] = useState({});
  // Initialize from initialData, report changes via onDataChange
};
```

### File Structure

```
src/components/User/steps/
  PersonalInfoStep.js    — name, email, phones (uses ValidatedPhoneInput)
  HomeAddressStep.js     — home address (uses SmartAddressInput + DynamicAddressForm)
  WorkAddressStep.js     — work address (uses SmartAddressInput + DynamicAddressForm)
  PreferencesStep.js     — delivery preferences (radio groups)
  SecurityStep.js        — password setup (registration/profile only, NOT admin)
  index.js               — barrel export
```

### Data Flow

```
UserFormWizard / AdminUserProfileForm
  ├── stepData = {}                         (accumulated step data)
  ├── PersonalInfoStep
  │     ├── owns localForm: {first_name, last_name, email, phones...}
  │     ├── calls onDataChange(personalData) on every change
  │     └── uses: ValidatedPhoneInput, CountryAutocomplete
  ├── HomeAddressStep
  │     ├── owns localForm: {home_address, home_city, home_postal_code...}
  │     ├── calls onDataChange(homeAddressData) on every change
  │     └── uses: SmartAddressInput, DynamicAddressForm
  ├── WorkAddressStep
  │     ├── owns localForm: {work_company, work_address, work_city...}
  │     ├── calls onDataChange(workAddressData) on every change
  │     └── uses: SmartAddressInput, DynamicAddressForm, ValidatedPhoneInput
  ├── PreferencesStep
  │     ├── owns localForm: {send_invoices_to, send_study_material_to}
  │     └── calls onDataChange(preferencesData) on every change
  └── SecurityStep (UserFormWizard only)
        ├── owns localForm: {password, confirmPassword}
        └── calls onDataChange(securityData) on every change
```

### UserFormWizard Changes

The existing `UserFormWizard` will be refactored to:
- Import step components from `User/steps/`
- Replace inline `renderStepContent()` cases with step component instances
- Accumulate step data via `onDataChange` callbacks
- Keep wizard navigation (stepper, progress bar, next/prev buttons)
- Keep mode support (`registration` / `profile`)
- Keep existing features: address validation modal, snackbar notifications

### Admin UserProfileForm Changes

The existing `AdminUserProfileForm` will be rebuilt to:
- Use MUI Stepper with 4 steps (Personal, Home, Work, Preferences)
- Import step components from `User/steps/`
- Fetch full profile data on mount and transform into step-compatible slices
- Pass `mode="admin"` to each step
- Allow non-linear navigation (clicking any step in stepper)
- Save changes via `userProfileService.update()`

## Bug Fix Details

### UserProfileList.js
```
profile.user_email      → profile.user.email
profile.user_first_name → profile.user.first_name
profile.user_last_name  → profile.user.last_name
```

### StaffList.js
```
member.user_email      → member.user_detail.email
member.user_first_name → member.user_detail.first_name
member.user_last_name  → member.user_detail.last_name
```
