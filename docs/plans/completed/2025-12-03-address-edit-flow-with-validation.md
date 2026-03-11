# Address Edit Flow with Postcoder Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Change address editing behavior to show manual edit form first (instead of address lookup), then validate against Postcoder API on save with a comparison modal for discrepancies.

**Architecture:** Create a new `AddressComparisonModal` component that shows when the user's entered address differs from the Postcoder API's best match. Modify the existing address editing flow in `UserFormWizard.js` and `AddressEditModal.js` to: (1) show editable form directly on Edit click, (2) call Postcoder API on save, (3) display comparison modal if addresses differ.

**Tech Stack:** React, Material-UI, Postcoder API (via existing `/api/utils/address-lookup/` endpoint)

---

## Summary of Changes

### Current Behavior:
1. **Profile mode (UserFormWizard)**: Click "Edit Address" → SmartAddressInput (lookup mode) → optional manual entry
2. **Checkout (AddressEditModal)**: Click "Edit Address" → SmartAddressInput (lookup mode) → optional manual entry

### New Behavior:
1. **Profile mode (UserFormWizard)**: Click "Edit Address" → DynamicAddressForm (manual edit) → Save → Postcoder validation → Comparison modal if different
2. **Checkout (AddressEditModal)**: Click "Edit Address" → DynamicAddressForm (manual edit) → Save → Postcoder validation → Comparison modal if different

---

## Task 1: Create AddressComparisonModal Component

**Files:**
- Create: `frontend/react-Admin3/src/components/Address/AddressComparisonModal.js`
- Test: `frontend/react-Admin3/src/components/Address/__tests__/AddressComparisonModal.test.js`

### Step 1: Write the failing test

```javascript
// frontend/react-Admin3/src/components/Address/__tests__/AddressComparisonModal.test.js
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import AddressComparisonModal from '../AddressComparisonModal';

const theme = createTheme();

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

const mockUserAddress = {
  address: '10 Downing Street',
  city: 'London',
  postal_code: 'SW1A 2AA',
  country: 'United Kingdom'
};

const mockSuggestedAddress = {
  address: '10 Downing Street',
  city: 'Westminster',
  postal_code: 'SW1A 2AA',
  county: 'Greater London',
  country: 'United Kingdom'
};

describe('AddressComparisonModal', () => {
  it('renders both addresses when open', () => {
    const onAccept = jest.fn();
    const onKeepOriginal = jest.fn();
    const onClose = jest.fn();

    renderWithTheme(
      <AddressComparisonModal
        open={true}
        userAddress={mockUserAddress}
        suggestedAddress={mockSuggestedAddress}
        onAcceptSuggested={onAccept}
        onKeepOriginal={onKeepOriginal}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/your address/i)).toBeInTheDocument();
    expect(screen.getByText(/suggested address/i)).toBeInTheDocument();
    expect(screen.getByText('10 Downing Street')).toBeInTheDocument();
  });

  it('calls onAcceptSuggested when user clicks accept button', () => {
    const onAccept = jest.fn();
    const onKeepOriginal = jest.fn();
    const onClose = jest.fn();

    renderWithTheme(
      <AddressComparisonModal
        open={true}
        userAddress={mockUserAddress}
        suggestedAddress={mockSuggestedAddress}
        onAcceptSuggested={onAccept}
        onKeepOriginal={onKeepOriginal}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /accept suggested/i }));
    expect(onAccept).toHaveBeenCalledWith(mockSuggestedAddress);
  });

  it('calls onKeepOriginal when user clicks keep my address button', () => {
    const onAccept = jest.fn();
    const onKeepOriginal = jest.fn();
    const onClose = jest.fn();

    renderWithTheme(
      <AddressComparisonModal
        open={true}
        userAddress={mockUserAddress}
        suggestedAddress={mockSuggestedAddress}
        onAcceptSuggested={onAccept}
        onKeepOriginal={onKeepOriginal}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /keep my address/i }));
    expect(onKeepOriginal).toHaveBeenCalledWith(mockUserAddress);
  });

  it('does not render when open is false', () => {
    renderWithTheme(
      <AddressComparisonModal
        open={false}
        userAddress={mockUserAddress}
        suggestedAddress={mockSuggestedAddress}
        onAcceptSuggested={jest.fn()}
        onKeepOriginal={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(screen.queryByText(/your address/i)).not.toBeInTheDocument();
  });

  it('highlights differences between addresses', () => {
    renderWithTheme(
      <AddressComparisonModal
        open={true}
        userAddress={mockUserAddress}
        suggestedAddress={mockSuggestedAddress}
        onAcceptSuggested={jest.fn()}
        onKeepOriginal={jest.fn()}
        onClose={jest.fn()}
      />
    );

    // The city differs: London vs Westminster
    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByText('Westminster')).toBeInTheDocument();
  });
});
```

### Step 2: Run test to verify it fails

Run: `cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3 && npm test -- --testPathPattern=AddressComparisonModal --watchAll=false`
Expected: FAIL with "Cannot find module '../AddressComparisonModal'"

### Step 3: Write minimal implementation

```javascript
// frontend/react-Admin3/src/components/Address/AddressComparisonModal.js
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Paper,
  Divider,
  IconButton
} from '@mui/material';
import { Close as CloseIcon, Check as CheckIcon, Edit as EditIcon } from '@mui/icons-material';
import PropTypes from 'prop-types';

const AddressComparisonModal = ({
  open = false,
  userAddress = {},
  suggestedAddress = {},
  onAcceptSuggested,
  onKeepOriginal,
  onClose,
  loading = false
}) => {
  // Helper to format address for display
  const formatAddressLines = (address) => {
    if (!address) return [];

    const lines = [];
    if (address.building) lines.push(address.building);
    if (address.address) lines.push(address.address);
    if (address.district) lines.push(address.district);
    if (address.city) lines.push(address.city);
    if (address.county) lines.push(address.county);
    if (address.state) lines.push(address.state);
    if (address.postal_code) lines.push(address.postal_code);
    if (address.country) lines.push(address.country);

    return lines.filter(Boolean);
  };

  // Check if a field differs between addresses
  const fieldDiffers = (field) => {
    const userValue = (userAddress[field] || '').toLowerCase().trim();
    const suggestedValue = (suggestedAddress[field] || '').toLowerCase().trim();
    return userValue !== suggestedValue && (userValue || suggestedValue);
  };

  const userLines = formatAddressLines(userAddress);
  const suggestedLines = formatAddressLines(suggestedAddress);

  const handleAccept = () => {
    if (onAcceptSuggested) {
      onAcceptSuggested(suggestedAddress);
    }
  };

  const handleKeepOriginal = () => {
    if (onKeepOriginal) {
      onKeepOriginal(userAddress);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="address-comparison-modal-title"
    >
      <DialogTitle id="address-comparison-modal-title">
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            Address Verification
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          We found a matching address in our database. Would you like to use the suggested address or keep your original entry?
        </Typography>

        <Grid container spacing={3}>
          {/* User's Address */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                height: '100%',
                border: '2px solid',
                borderColor: 'grey.300'
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                <EditIcon sx={{ mr: 1, fontSize: '1rem', verticalAlign: 'middle' }} />
                Your Address
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {userLines.map((line, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  sx={{ mb: 0.5 }}
                >
                  {line}
                </Typography>
              ))}
            </Paper>
          </Grid>

          {/* Suggested Address */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                height: '100%',
                border: '2px solid',
                borderColor: 'success.main',
                bgcolor: 'success.50'
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="success.dark">
                <CheckIcon sx={{ mr: 1, fontSize: '1rem', verticalAlign: 'middle' }} />
                Suggested Address
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {suggestedLines.map((line, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  sx={{ mb: 0.5 }}
                >
                  {line}
                </Typography>
              ))}
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleKeepOriginal}
          disabled={loading}
          startIcon={<EditIcon />}
        >
          Keep My Address
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleAccept}
          disabled={loading}
          startIcon={<CheckIcon />}
        >
          Accept Suggested
        </Button>
      </DialogActions>
    </Dialog>
  );
};

AddressComparisonModal.propTypes = {
  open: PropTypes.bool.isRequired,
  userAddress: PropTypes.object,
  suggestedAddress: PropTypes.object,
  onAcceptSuggested: PropTypes.func.isRequired,
  onKeepOriginal: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  loading: PropTypes.bool
};

export default AddressComparisonModal;
```

### Step 4: Run test to verify it passes

Run: `cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3 && npm test -- --testPathPattern=AddressComparisonModal --watchAll=false`
Expected: PASS

### Step 5: Commit

```bash
cd /Users/work/Documents/Code/Admin3
git add frontend/react-Admin3/src/components/Address/AddressComparisonModal.js frontend/react-Admin3/src/components/Address/__tests__/AddressComparisonModal.test.js
git commit -m "feat(address): add AddressComparisonModal for address verification"
```

---

## Task 2: Create addressValidationService for Postcoder Comparison

**Files:**
- Create: `frontend/react-Admin3/src/services/addressValidationService.js`
- Test: `frontend/react-Admin3/src/services/__tests__/addressValidationService.test.js`

### Step 1: Write the failing test

```javascript
// frontend/react-Admin3/src/services/__tests__/addressValidationService.test.js
import addressValidationService from '../addressValidationService';

// Mock fetch
global.fetch = jest.fn();

describe('addressValidationService', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('validateAddress', () => {
    it('returns the best match from Postcoder API', async () => {
      const mockResponse = {
        addresses: [
          {
            line_1: '10 Downing Street',
            town_or_city: 'Westminster',
            postcode: 'SW1A 2AA',
            county: 'Greater London',
            country: 'United Kingdom'
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const userAddress = {
        address: '10 Downing St',
        city: 'London',
        postal_code: 'SW1A 2AA',
        country: 'United Kingdom'
      };

      const result = await addressValidationService.validateAddress(userAddress);

      expect(result.hasMatch).toBe(true);
      expect(result.bestMatch).toBeDefined();
      expect(result.bestMatch.city).toBe('Westminster');
    });

    it('returns no match when API returns empty results', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ addresses: [] })
      });

      const userAddress = {
        address: 'Invalid Address 12345',
        city: 'Nowhere',
        postal_code: 'XX99 9XX',
        country: 'United Kingdom'
      };

      const result = await addressValidationService.validateAddress(userAddress);

      expect(result.hasMatch).toBe(false);
      expect(result.bestMatch).toBeNull();
    });

    it('detects when addresses are similar (no comparison needed)', async () => {
      const mockResponse = {
        addresses: [
          {
            line_1: '10 Downing Street',
            town_or_city: 'London',
            postcode: 'SW1A 2AA',
            country: 'United Kingdom'
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const userAddress = {
        address: '10 Downing Street',
        city: 'London',
        postal_code: 'SW1A 2AA',
        country: 'United Kingdom'
      };

      const result = await addressValidationService.validateAddress(userAddress);

      expect(result.hasMatch).toBe(true);
      expect(result.needsComparison).toBe(false);
    });

    it('detects when addresses differ (comparison needed)', async () => {
      const mockResponse = {
        addresses: [
          {
            line_1: '10 Downing Street',
            town_or_city: 'Westminster',
            postcode: 'SW1A 2AA',
            county: 'Greater London',
            country: 'United Kingdom'
          }
        ]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const userAddress = {
        address: '10 Downing St',
        city: 'London',
        postal_code: 'SW1A 2AA',
        country: 'United Kingdom'
      };

      const result = await addressValidationService.validateAddress(userAddress);

      expect(result.hasMatch).toBe(true);
      expect(result.needsComparison).toBe(true);
    });
  });

  describe('compareAddresses', () => {
    it('returns true when addresses are effectively the same', () => {
      const addr1 = { address: '10 Downing Street', city: 'London', postal_code: 'SW1A 2AA' };
      const addr2 = { address: '10 Downing Street', city: 'London', postal_code: 'SW1A 2AA' };

      expect(addressValidationService.compareAddresses(addr1, addr2)).toBe(true);
    });

    it('returns false when addresses differ', () => {
      const addr1 = { address: '10 Downing Street', city: 'London', postal_code: 'SW1A 2AA' };
      const addr2 = { address: '10 Downing Street', city: 'Westminster', postal_code: 'SW1A 2AA' };

      expect(addressValidationService.compareAddresses(addr1, addr2)).toBe(false);
    });

    it('ignores case and whitespace differences', () => {
      const addr1 = { address: '10 DOWNING STREET', city: 'london', postal_code: 'sw1a 2aa' };
      const addr2 = { address: '10 Downing Street', city: 'London', postal_code: 'SW1A 2AA' };

      expect(addressValidationService.compareAddresses(addr1, addr2)).toBe(true);
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3 && npm test -- --testPathPattern=addressValidationService --watchAll=false`
Expected: FAIL with "Cannot find module '../addressValidationService'"

### Step 3: Write minimal implementation

```javascript
// frontend/react-Admin3/src/services/addressValidationService.js
import config from '../config';
import addressMetadataService from './addressMetadataService';

/**
 * Service for validating addresses against Postcoder API
 * and comparing user-entered addresses with API suggestions.
 */
const addressValidationService = {
  /**
   * Validate an address by looking it up in the Postcoder API
   * @param {Object} address - User-entered address
   * @param {string} address.address - Street address
   * @param {string} address.city - City/town
   * @param {string} address.postal_code - Postal code
   * @param {string} address.country - Country name
   * @returns {Promise<Object>} Validation result
   */
  async validateAddress(address) {
    if (!address || !address.country) {
      return { hasMatch: false, bestMatch: null, needsComparison: false, error: 'Invalid address' };
    }

    const countryCode = addressMetadataService.getCountryCode(address.country);

    // Build search query from address components
    const searchQuery = this.buildSearchQuery(address);

    if (!searchQuery) {
      return { hasMatch: false, bestMatch: null, needsComparison: false, error: 'No search query' };
    }

    try {
      // Build query parameters
      let queryParams = `query=${encodeURIComponent(searchQuery)}&country=${countryCode}`;

      // Add postcode if available (for UK addresses)
      if (address.postal_code && countryCode === 'GB') {
        queryParams += `&postcode=${encodeURIComponent(address.postal_code)}`;
      }

      const response = await fetch(
        `${config.apiBaseUrl}/api/utils/address-lookup/?${queryParams}`
      );

      if (!response.ok) {
        return { hasMatch: false, bestMatch: null, needsComparison: false, error: 'API error' };
      }

      const data = await response.json();
      const addresses = data.addresses || [];

      if (addresses.length === 0) {
        return { hasMatch: false, bestMatch: null, needsComparison: false };
      }

      // Get the best match (first result)
      const bestMatch = this.transformApiAddress(addresses[0], address.country);

      // Check if comparison is needed
      const needsComparison = !this.compareAddresses(address, bestMatch);

      return {
        hasMatch: true,
        bestMatch,
        needsComparison,
        allMatches: addresses.map(addr => this.transformApiAddress(addr, address.country))
      };
    } catch (error) {
      console.error('Address validation error:', error);
      return { hasMatch: false, bestMatch: null, needsComparison: false, error: error.message };
    }
  },

  /**
   * Build a search query from address components
   * @param {Object} address - Address object
   * @returns {string} Search query
   */
  buildSearchQuery(address) {
    const parts = [];

    if (address.address) parts.push(address.address);
    if (address.city) parts.push(address.city);

    return parts.join(' ').trim();
  },

  /**
   * Transform API response address to standard format
   * @param {Object} apiAddress - Address from API
   * @param {string} country - Country name
   * @returns {Object} Standardized address
   */
  transformApiAddress(apiAddress, country) {
    return {
      building: apiAddress.building_name || '',
      address: apiAddress.line_1 || '',
      district: apiAddress.line_3 || '',
      city: apiAddress.town_or_city || '',
      county: apiAddress.county || '',
      state: apiAddress.state || '',
      postal_code: apiAddress.postcode || '',
      country: apiAddress.country || country || ''
    };
  },

  /**
   * Compare two addresses to determine if they are effectively the same
   * @param {Object} addr1 - First address
   * @param {Object} addr2 - Second address
   * @returns {boolean} True if addresses are effectively the same
   */
  compareAddresses(addr1, addr2) {
    if (!addr1 || !addr2) return false;

    // Normalize a value for comparison
    const normalize = (val) => (val || '').toLowerCase().replace(/\s+/g, ' ').trim();

    // Key fields to compare
    const fieldsToCompare = ['address', 'city', 'postal_code'];

    for (const field of fieldsToCompare) {
      const val1 = normalize(addr1[field]);
      const val2 = normalize(addr2[field]);

      // If both are empty, continue
      if (!val1 && !val2) continue;

      // If one is empty but not the other, or values differ
      if (val1 !== val2) {
        return false;
      }
    }

    return true;
  },

  /**
   * Get differences between two addresses
   * @param {Object} addr1 - First address (user's)
   * @param {Object} addr2 - Second address (suggested)
   * @returns {Object} Object with differing fields
   */
  getDifferences(addr1, addr2) {
    const normalize = (val) => (val || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const differences = {};

    const allFields = ['building', 'address', 'district', 'city', 'county', 'state', 'postal_code', 'country'];

    for (const field of allFields) {
      const val1 = normalize(addr1[field]);
      const val2 = normalize(addr2[field]);

      if (val1 !== val2) {
        differences[field] = {
          user: addr1[field] || '',
          suggested: addr2[field] || ''
        };
      }
    }

    return differences;
  }
};

export default addressValidationService;
```

### Step 4: Run test to verify it passes

Run: `cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3 && npm test -- --testPathPattern=addressValidationService --watchAll=false`
Expected: PASS

### Step 5: Commit

```bash
cd /Users/work/Documents/Code/Admin3
git add frontend/react-Admin3/src/services/addressValidationService.js frontend/react-Admin3/src/services/__tests__/addressValidationService.test.js
git commit -m "feat(address): add addressValidationService for Postcoder validation"
```

---

## Task 3: Update UserFormWizard - Change Edit Button to Show Manual Form

**Files:**
- Modify: `frontend/react-Admin3/src/components/User/UserFormWizard.js:1176-1261` (home address section)
- Modify: `frontend/react-Admin3/src/components/User/UserFormWizard.js:1350-1435` (work address section)

### Step 1: Understand current behavior

Current behavior (lines 1192-1194):
```javascript
onClick={() => {
  setIsEditingHomeAddress(true);
  setUseSmartInputHome(true);  // <-- Goes to SmartAddressInput (lookup)
}}
```

### Step 2: Modify home address Edit button (line ~1192)

Change from:
```javascript
onClick={() => {
  setIsEditingHomeAddress(true);
  setUseSmartInputHome(true);
}}
```

To:
```javascript
onClick={() => {
  setIsEditingHomeAddress(true);
  setUseSmartInputHome(false);  // Show DynamicAddressForm (manual edit) first
}}
```

### Step 3: Modify work address Edit button (line ~1365)

Change from:
```javascript
onClick={() => {
  setIsEditingWorkAddress(true);
  setUseSmartInputWork(true);
}}
```

To:
```javascript
onClick={() => {
  setIsEditingWorkAddress(true);
  setUseSmartInputWork(false);  // Show DynamicAddressForm (manual edit) first
}}
```

### Step 4: Run existing tests

Run: `cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3 && npm test -- --testPathPattern=UserFormWizard --watchAll=false`
Expected: PASS (no behavior change in tests yet)

### Step 5: Commit

```bash
cd /Users/work/Documents/Code/Admin3
git add frontend/react-Admin3/src/components/User/UserFormWizard.js
git commit -m "feat(address): change Edit button to show manual form first in UserFormWizard"
```

---

## Task 4: Add Address Validation on Save in UserFormWizard

**Files:**
- Modify: `frontend/react-Admin3/src/components/User/UserFormWizard.js`

### Step 1: Add imports at the top of the file

Add after existing imports (around line 35):
```javascript
import AddressComparisonModal from '../Address/AddressComparisonModal';
import addressValidationService from '../../services/addressValidationService';
```

### Step 2: Add state for comparison modal

Add after the snackbar state (around line 143):
```javascript
// Address comparison modal state
const [showComparisonModal, setShowComparisonModal] = useState(false);
const [pendingAddressType, setPendingAddressType] = useState(null); // 'home' or 'work'
const [userEnteredAddress, setUserEnteredAddress] = useState({});
const [suggestedAddress, setSuggestedAddress] = useState({});
const [isValidatingAddress, setIsValidatingAddress] = useState(false);
```

### Step 3: Add validateAndSaveAddress function

Add after the handleStepSave function (around line 798):
```javascript
// Validate address against Postcoder API before saving
const validateAndSaveAddress = async (addressType) => {
  setIsValidatingAddress(true);

  try {
    const addressData = formatAddressData(addressType);

    // Only validate for countries with address lookup support
    const countryCode = addressMetadataService.getCountryCode(addressData.country);
    const metadata = await addressMetadataService.fetchAddressMetadata(countryCode);

    if (!metadata.addressLookupSupported) {
      // No validation needed, proceed with save
      return { validated: true, proceed: true };
    }

    const result = await addressValidationService.validateAddress(addressData);

    if (!result.hasMatch) {
      // No match found, proceed with user's address
      return { validated: true, proceed: true };
    }

    if (result.needsComparison) {
      // Show comparison modal
      setPendingAddressType(addressType);
      setUserEnteredAddress(addressData);
      setSuggestedAddress(result.bestMatch);
      setShowComparisonModal(true);
      return { validated: true, proceed: false }; // Wait for user decision
    }

    // Addresses match, proceed with save
    return { validated: true, proceed: true };
  } catch (error) {
    console.error('Address validation error:', error);
    // On error, allow save to proceed
    return { validated: true, proceed: true };
  } finally {
    setIsValidatingAddress(false);
  }
};

// Handle accepting suggested address
const handleAcceptSuggestedAddress = (suggestedAddr) => {
  const prefix = pendingAddressType;

  // Update form with suggested address
  const updates = {};
  if (suggestedAddr.building) updates[`${prefix}_building`] = suggestedAddr.building;
  if (suggestedAddr.address) updates[`${prefix}_address`] = suggestedAddr.address;
  if (suggestedAddr.district) updates[`${prefix}_district`] = suggestedAddr.district;
  if (suggestedAddr.city) updates[`${prefix}_city`] = suggestedAddr.city;
  if (suggestedAddr.county) updates[`${prefix}_county`] = suggestedAddr.county;
  if (suggestedAddr.state) updates[`${prefix}_state`] = suggestedAddr.state;
  if (suggestedAddr.postal_code) updates[`${prefix}_postal_code`] = suggestedAddr.postal_code;

  setForm(prev => ({ ...prev, ...updates }));

  // Mark fields as changed
  Object.keys(updates).forEach(field => {
    setChangedFields(prev => new Set([...prev, field]));
  });

  // Close modal and exit edit mode
  setShowComparisonModal(false);
  if (prefix === 'home') {
    setIsEditingHomeAddress(false);
  } else {
    setIsEditingWorkAddress(false);
  }

  // Trigger save
  handleStepSave();
};

// Handle keeping original address
const handleKeepOriginalAddress = () => {
  setShowComparisonModal(false);

  // Exit edit mode
  if (pendingAddressType === 'home') {
    setIsEditingHomeAddress(false);
  } else {
    setIsEditingWorkAddress(false);
  }

  // Trigger save with original address
  handleStepSave();
};
```

### Step 4: Add "Save Address" button in the editing section

Modify the home address editing section (around line 1213) to add a Save button:

Find:
```javascript
<Box sx={{ textAlign: 'center', mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
  <Button
    variant="outlined"
    onClick={() => setUseSmartInputHome(true)}
  >
    Use address lookup
  </Button>
```

Add before the "Use address lookup" button:
```javascript
<Button
  variant="contained"
  color="primary"
  onClick={async () => {
    const result = await validateAndSaveAddress('home');
    if (result.proceed) {
      setIsEditingHomeAddress(false);
      handleStepSave();
    }
  }}
  disabled={isValidatingAddress}
>
  {isValidatingAddress ? 'Validating...' : 'Save Address'}
</Button>
```

Do the same for work address section (around line 1387).

### Step 5: Add the comparison modal at the end of the component

Add before the closing `</Box>` of the main component (around line 1927):
```javascript
{/* Address Comparison Modal */}
<AddressComparisonModal
  open={showComparisonModal}
  userAddress={userEnteredAddress}
  suggestedAddress={suggestedAddress}
  onAcceptSuggested={handleAcceptSuggestedAddress}
  onKeepOriginal={handleKeepOriginalAddress}
  onClose={() => setShowComparisonModal(false)}
  loading={isValidatingAddress}
/>
```

### Step 6: Run tests

Run: `cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3 && npm test -- --testPathPattern=UserFormWizard --watchAll=false`
Expected: PASS

### Step 7: Commit

```bash
cd /Users/work/Documents/Code/Admin3
git add frontend/react-Admin3/src/components/User/UserFormWizard.js
git commit -m "feat(address): add Postcoder validation on address save in UserFormWizard"
```

---

## Task 5: Update AddressEditModal - Change Default to Manual Form

**Files:**
- Modify: `frontend/react-Admin3/src/components/Address/AddressEditModal.js`

### Step 1: Add imports

Add after existing imports (around line 17):
```javascript
import AddressComparisonModal from './AddressComparisonModal';
import addressValidationService from '../../services/addressValidationService';
import addressMetadataService from '../../services/addressMetadataService';
```

### Step 2: Add state for comparison modal

Add after the existing state declarations (around line 37):
```javascript
const [showComparisonModal, setShowComparisonModal] = useState(false);
const [userEnteredAddress, setUserEnteredAddress] = useState({});
const [suggestedAddress, setSuggestedAddress] = useState({});
const [isValidatingAddress, setIsValidatingAddress] = useState(false);
```

### Step 3: Change initial mode to manual entry

Modify line 76:
```javascript
// Change from: setShowManualEntry(false);
setShowManualEntry(true);  // Start in manual entry mode
```

### Step 4: Add validation logic

Add after handleUpdateAddress function (around line 137):
```javascript
// Validate address and show comparison if needed
const handleValidateAndUpdate = async () => {
  if (!isFormValid()) {
    setError('Please fill in all required fields');
    return;
  }

  setIsValidatingAddress(true);
  setError('');

  try {
    const addressData = {
      ...formValues,
      country: selectedCountry
    };

    // Check if country supports address lookup
    const countryCode = addressMetadataService.getCountryCode(selectedCountry);
    let metadata;
    try {
      metadata = await addressMetadataService.fetchAddressMetadata(countryCode);
    } catch {
      metadata = addressMetadataService.getAddressMetadata(countryCode);
    }

    if (!metadata.addressLookupSupported) {
      // No validation available, proceed directly
      setShowConfirmation(true);
      return;
    }

    const result = await addressValidationService.validateAddress(addressData);

    if (!result.hasMatch || !result.needsComparison) {
      // No match or addresses are the same, proceed to confirmation
      setShowConfirmation(true);
      return;
    }

    // Show comparison modal
    setUserEnteredAddress(addressData);
    setSuggestedAddress(result.bestMatch);
    setShowComparisonModal(true);

  } catch (err) {
    console.error('Address validation error:', err);
    // On error, proceed to confirmation
    setShowConfirmation(true);
  } finally {
    setIsValidatingAddress(false);
  }
};

// Handle accepting suggested address
const handleAcceptSuggested = (suggested) => {
  setFormValues({
    ...formValues,
    building: suggested.building || '',
    address: suggested.address || '',
    district: suggested.district || '',
    city: suggested.city || '',
    county: suggested.county || '',
    state: suggested.state || '',
    postal_code: suggested.postal_code || ''
  });
  setShowComparisonModal(false);
  setShowConfirmation(true);
};

// Handle keeping original address
const handleKeepOriginal = () => {
  setShowComparisonModal(false);
  setShowConfirmation(true);
};
```

### Step 5: Update the Update Address button

Change the onClick handler in DialogActions (around line 382):
```javascript
// Change from: onClick={handleUpdateAddress}
onClick={handleValidateAndUpdate}
```

### Step 6: Add the comparison modal

Add before the closing `</Dialog>` (around line 391):
```javascript
{/* Address Comparison Modal */}
<AddressComparisonModal
  open={showComparisonModal}
  userAddress={userEnteredAddress}
  suggestedAddress={suggestedAddress}
  onAcceptSuggested={handleAcceptSuggested}
  onKeepOriginal={handleKeepOriginal}
  onClose={() => setShowComparisonModal(false)}
  loading={isValidatingAddress}
/>
```

### Step 7: Run tests

Run: `cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3 && npm test -- --testPathPattern=AddressEditModal --watchAll=false`
Expected: PASS

### Step 8: Commit

```bash
cd /Users/work/Documents/Code/Admin3
git add frontend/react-Admin3/src/components/Address/AddressEditModal.js
git commit -m "feat(address): add Postcoder validation on save in AddressEditModal"
```

---

## Task 6: Update Tests for New Behavior

**Files:**
- Modify: `frontend/react-Admin3/src/components/Address/__tests__/AddressEditModal.test.js`
- Modify: `frontend/react-Admin3/src/components/Address/__tests__/AddressSelectionPanel.test.js`

### Step 1: Update AddressEditModal tests

Add a test to verify manual entry is shown by default:
```javascript
it('shows DynamicAddressForm by default when modal opens', async () => {
  renderWithTheme(
    <AddressEditModal
      open={true}
      onClose={mockOnClose}
      addressType="delivery"
      selectedAddressType="HOME"
      userProfile={mockUserProfile}
      onAddressUpdate={mockOnAddressUpdate}
    />
  );

  // Should show the address format info (from DynamicAddressForm)
  await waitFor(() => {
    expect(screen.getByText(/address format for/i)).toBeInTheDocument();
  });
});
```

### Step 2: Run all address-related tests

Run: `cd /Users/work/Documents/Code/Admin3/frontend/react-Admin3 && npm test -- --testPathPattern=Address --watchAll=false`
Expected: PASS

### Step 3: Commit

```bash
cd /Users/work/Documents/Code/Admin3
git add frontend/react-Admin3/src/components/Address/__tests__/
git commit -m "test(address): update tests for new address edit flow"
```

---

## Task 7: Manual Integration Testing

**Files:** None (manual testing)

### Step 1: Test UserFormWizard in profile mode

1. Log in and navigate to profile page
2. Go to Step 2 (Home Address)
3. Verify address is shown in readonly mode
4. Click "Edit Address"
5. Verify DynamicAddressForm (manual edit) is shown, NOT SmartAddressInput
6. Modify an address field (e.g., change city)
7. Click "Save Address"
8. Verify comparison modal appears showing your changes vs suggested
9. Test both "Accept Suggested" and "Keep My Address" buttons

### Step 2: Test UserFormWizard work address

1. Go to Step 3 (Work Address)
2. Enable work address section
3. Repeat the same tests as Step 1

### Step 3: Test AddressEditModal in checkout

1. Add items to cart and proceed to checkout
2. At Step 1 (Cart Review), click "Edit Address" on delivery or invoice address
3. Verify DynamicAddressForm is shown by default
4. Modify address and click "Update Address"
5. Verify comparison modal appears if address differs from Postcoder suggestion

### Step 4: Test edge cases

1. Test with a country that doesn't have Postcoder support (e.g., random country)
2. Test with invalid/non-existent address
3. Test with address that exactly matches Postcoder suggestion (no modal should appear)

---

## Summary

This plan implements:

1. **AddressComparisonModal** - New component to show side-by-side comparison
2. **addressValidationService** - Service to validate addresses against Postcoder API
3. **UserFormWizard changes** - Edit button shows manual form first, Save validates against Postcoder
4. **AddressEditModal changes** - Same behavior for checkout address editing
5. **Updated tests** - Ensure new behavior is properly tested

Key architectural decisions:
- The validation happens on Save, not on Edit
- If Postcoder returns no match, the user's address is accepted without modal
- If addresses are effectively the same, no modal is shown
- The comparison modal gives users clear choice between their input and the suggestion
- Countries without Postcoder support skip validation entirely
