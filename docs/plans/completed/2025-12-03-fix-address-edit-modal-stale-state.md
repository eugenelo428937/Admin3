# Implementation Plan: Fix Address Edit Modal Stale State Bug

## Problem Statement

In the checkout process, when the user changes the address type dropdown from HOME to WORK (or vice versa), and then clicks "Edit Address", the AddressEditModal shows stale data:
- The postcode lookup field shows the previous address's postcode
- The address search field shows the previous address's data
- When clicking "Manual Entry", the form fields show the original values from page mount, not the currently selected address

## Root Cause Analysis

### Current Data Flow (Bug)

```
AddressSelectionPanel
├── selectedAddressType = 'WORK' (user selected in dropdown)
├── onClick={handleEditClick} → Opens AddressEditModal
│
AddressEditModal receives:
├── addressType = 'delivery' or 'invoice' (NOT 'HOME'/'WORK')
├── userProfile = full user profile object
│
AddressEditModal.getCurrentAddressData():
├── Uses getAddressTypeFromPreferences()
├── Reads userProfile.profile.send_study_material_to (e.g., 'HOME')
├── Returns userProfile.home_address (WRONG!)
├── Should return userProfile.work_address based on selectedAddressType
```

### Core Issues

1. **AddressEditModal.js** (line 21-28): Does not receive the `selectedAddressType` prop ('HOME'/'WORK')
2. **AddressEditModal.js** (lines 38-58): `getCurrentAddressData()` uses profile preferences instead of the selected dropdown value
3. **SmartAddressInput.js** (lines 35-36): `postcodeValue` and `addressLineValue` are internal state not fully synced with parent
4. **SmartAddressInput.js** (lines 52-66): useEffect only syncs `country` and `postal_code`, not other fields

## Solution Design

### Approach: Pass Selected Address Type to Modal

The fix requires passing the currently selected address type ('HOME'/'WORK') from `AddressSelectionPanel` to `AddressEditModal`, and ensuring all child components reset their state when the address data changes.

## Implementation Tasks

### Task 1: Add selectedAddressType prop to AddressEditModal

**File:** `frontend/react-Admin3/src/components/Address/AddressEditModal.js`

**Changes:**
1. Add `selectedAddressType` to props (lines 21-28)
2. Update `getCurrentAddressData()` to use `selectedAddressType` prop instead of `getAddressTypeFromPreferences()` (lines 50-58)
3. Update PropTypes to include `selectedAddressType`

**Before:**
```javascript
const AddressEditModal = ({
  open = false,
  onClose,
  addressType, // 'delivery' or 'invoice'
  userProfile,
  onAddressUpdate,
  className = ''
}) => {
```

**After:**
```javascript
const AddressEditModal = ({
  open = false,
  onClose,
  addressType, // 'delivery' or 'invoice'
  selectedAddressType, // 'HOME' or 'WORK' - the actual dropdown selection
  userProfile,
  onAddressUpdate,
  className = ''
}) => {
```

### Task 2: Update getCurrentAddressData to use selectedAddressType prop

**File:** `frontend/react-Admin3/src/components/Address/AddressEditModal.js`

**Changes:**
1. Modify `getCurrentAddressData()` to use the `selectedAddressType` prop directly (lines 50-58)

**Before:**
```javascript
const getCurrentAddressData = useCallback(() => {
  if (!userProfile) return {};

  const addressTypeFromPrefs = getAddressTypeFromPreferences();
  return addressTypeFromPrefs === 'HOME'
    ? userProfile.home_address || {}
    : userProfile.work_address || {};
}, [userProfile, getAddressTypeFromPreferences]);
```

**After:**
```javascript
const getCurrentAddressData = useCallback(() => {
  if (!userProfile) return {};

  // Use the explicitly passed selectedAddressType prop
  // This ensures we get the address from the dropdown selection, not profile preferences
  return selectedAddressType === 'HOME'
    ? userProfile.home_address || {}
    : userProfile.work_address || {};
}, [userProfile, selectedAddressType]);
```

### Task 3: Update AddressSelectionPanel to pass selectedAddressType

**File:** `frontend/react-Admin3/src/components/Address/AddressSelectionPanel.js`

**Changes:**
1. Pass `selectedAddressType` prop to `AddressEditModal` component (lines 233-240)

**Before:**
```javascript
<AddressEditModal
  open={showEditModal}
  onClose={handleModalClose}
  addressType={addressType}
  userProfile={userProfile}
  onAddressUpdate={handleAddressUpdateFromModal}
/>
```

**After:**
```javascript
<AddressEditModal
  open={showEditModal}
  onClose={handleModalClose}
  addressType={addressType}
  selectedAddressType={selectedAddressType}
  userProfile={userProfile}
  onAddressUpdate={handleAddressUpdateFromModal}
/>
```

### Task 4: Reset SmartAddressInput state when address data changes

**File:** `frontend/react-Admin3/src/components/Address/SmartAddressInput.js`

**Changes:**
1. Add a `key` prop approach or useEffect to reset internal state when values change significantly
2. The parent (AddressEditModal) already resets on modal open (line 61-79), but SmartAddressInput needs to respect incoming value changes

**Option A (Preferred): Add addressKey prop for controlled reset**

In AddressEditModal, pass a key to force SmartAddressInput to remount:
```javascript
<SmartAddressInput
  key={`${selectedAddressType}-${open}`}
  values={formValues}
  onChange={handleFieldChange}
  errors={{}}
  fieldPrefix=""
/>
```

**Option B: Add useEffect to sync postcodeValue and addressLineValue with incoming values**

Add a more comprehensive sync useEffect in SmartAddressInput:
```javascript
// Sync internal state with values prop when they change externally
useEffect(() => {
  const postcodeFieldName = getFieldName('postal_code');
  const addressFieldName = getFieldName('address');

  // Only update if values are different (to prevent infinite loops)
  if (values[postcodeFieldName] !== undefined && values[postcodeFieldName] !== postcodeValue) {
    setPostcodeValue(values[postcodeFieldName] || '');
  }
  if (values[addressFieldName] !== undefined && values[addressFieldName] !== addressLineValue) {
    setAddressLineValue(values[addressFieldName] || '');
  }
}, [values, getFieldName]); // postcodeValue/addressLineValue removed to prevent loops
```

### Task 5: Update PropTypes in AddressEditModal

**File:** `frontend/react-Admin3/src/components/Address/AddressEditModal.js`

**Changes:**
1. Add `selectedAddressType` to PropTypes (lines 392-406)

**After:**
```javascript
AddressEditModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  addressType: PropTypes.oneOf(['delivery', 'invoice']).isRequired,
  selectedAddressType: PropTypes.oneOf(['HOME', 'WORK']).isRequired, // ADD THIS
  userProfile: PropTypes.shape({
    profile: PropTypes.shape({
      send_invoices_to: PropTypes.oneOf(['HOME', 'WORK']),
      send_study_material_to: PropTypes.oneOf(['HOME', 'WORK'])
    }),
    home_address: PropTypes.object,
    work_address: PropTypes.object
  }),
  onAddressUpdate: PropTypes.func,
  className: PropTypes.string
};
```

## Testing Plan

### Unit Tests

1. **AddressEditModal.test.js** (create or update)
   - Test that modal shows HOME address when selectedAddressType='HOME'
   - Test that modal shows WORK address when selectedAddressType='WORK'
   - Test that changing selectedAddressType before opening modal shows correct address

2. **AddressSelectionPanel.test.js** (update)
   - Test that selectedAddressType prop is passed to AddressEditModal
   - Test that switching dropdown and clicking edit shows correct address

3. **SmartAddressInput.test.js** (update)
   - Test that postcode field syncs with values prop
   - Test that address line field syncs with values prop

### Manual Testing Checklist

1. [ ] Go to checkout step 1
2. [ ] Verify delivery address shows HOME address by default
3. [ ] Change dropdown to WORK
4. [ ] Click "Edit Address"
5. [ ] Verify postcode field shows WORK address postcode
6. [ ] Verify address search field is empty (or shows WORK address if applicable)
7. [ ] Click "Manual Entry"
8. [ ] Verify all fields show WORK address data
9. [ ] Repeat steps 2-8 for invoice address section
10. [ ] Repeat steps 2-8 switching from WORK back to HOME

## Files to Modify

1. `frontend/react-Admin3/src/components/Address/AddressEditModal.js`
   - Add `selectedAddressType` prop
   - Update `getCurrentAddressData()` to use prop
   - Update PropTypes
   - Add key to SmartAddressInput (optional)

2. `frontend/react-Admin3/src/components/Address/AddressSelectionPanel.js`
   - Pass `selectedAddressType` to AddressEditModal

3. `frontend/react-Admin3/src/components/Address/SmartAddressInput.js` (optional)
   - Add useEffect to sync internal state with values prop

## Risk Assessment

- **Low Risk**: The changes are isolated to address components
- **Backward Compatible**: Adding a new required prop may need default handling
- **No Database Changes**: Frontend-only changes
- **No API Changes**: No backend modifications needed

## Implementation Order

1. Task 1 & 2: Update AddressEditModal to accept and use selectedAddressType
2. Task 3: Update AddressSelectionPanel to pass the prop
3. Task 4: Reset SmartAddressInput state (key prop or useEffect)
4. Task 5: Update PropTypes
5. Manual testing
6. Write/update unit tests
