# Frontend Code Examples - Postcoder.com Integration

This document provides ready-to-use code examples for integrating the Postcoder.com address lookup API into React components.

---

## Table of Contents

1. [Simple Fetch Example](#1-simple-fetch-example)
2. [React Hook for Address Lookup](#2-react-hook-for-address-lookup)
3. [SmartAddressInput with Postcoder](#3-smartaddressinput-with-postcoder)
4. [Environment Variable Configuration](#4-environment-variable-configuration)
5. [Feature Flag Toggle](#5-feature-flag-toggle)
6. [Cache Hit Metadata Display](#6-cache-hit-metadata-display)
7. [Error Handling Patterns](#7-error-handling-patterns)
8. [Testing Examples](#8-testing-examples)

---

## 1. Simple Fetch Example

### Basic API Call

```javascript
/**
 * Simple example: Call Postcoder API directly
 */
async function lookupAddress(postcode) {
  try {
    const response = await fetch(
      `http://localhost:8888/api/utils/postcoder-address-lookup/?postcode=${encodeURIComponent(postcode)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log('Addresses:', data.addresses);
    console.log('Cache hit:', data.cache_hit);
    console.log('Response time:', data.response_time_ms, 'ms');

    return data;
  } catch (error) {
    console.error('Address lookup failed:', error);
    return { addresses: [], cache_hit: false, response_time_ms: 0 };
  }
}

// Usage
lookupAddress('SW1A1AA').then(result => {
  console.log('Found', result.addresses.length, 'addresses');
});
```

---

## 2. React Hook for Address Lookup

### Custom Hook: `useAddressLookup`

**File:** `src/hooks/useAddressLookup.js`

```javascript
import { useState, useCallback } from 'react';
import config from '../config';

/**
 * React hook for address lookup with Postcoder.com API
 *
 * @returns {Object} Hook state and functions
 * @returns {Array} addresses - List of found addresses
 * @returns {boolean} loading - Loading state
 * @returns {string|null} error - Error message if lookup failed
 * @returns {boolean} cacheHit - Whether result was from cache
 * @returns {number} responseTime - Response time in milliseconds
 * @returns {Function} lookupAddress - Function to trigger lookup
 * @returns {Function} reset - Function to reset state
 */
export const useAddressLookup = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cacheHit, setCacheHit] = useState(false);
  const [responseTime, setResponseTime] = useState(0);

  const lookupAddress = useCallback(async (postcode) => {
    if (!postcode || postcode.trim().length < 5) {
      setError('Please enter a valid postcode');
      return;
    }

    setLoading(true);
    setError(null);
    setAddresses([]);

    const startTime = performance.now();

    try {
      const response = await fetch(
        `${config.apiBaseUrl}/api/utils/postcoder-address-lookup/?postcode=${encodeURIComponent(postcode)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Address lookup failed');
      }

      const data = await response.json();

      setAddresses(data.addresses || []);
      setCacheHit(data.cache_hit || false);
      setResponseTime(data.response_time_ms || Math.round(performance.now() - startTime));
    } catch (err) {
      setError(err.message);
      setAddresses([]);
      setCacheHit(false);
      setResponseTime(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setAddresses([]);
    setError(null);
    setCacheHit(false);
    setResponseTime(0);
  }, []);

  return {
    addresses,
    loading,
    error,
    cacheHit,
    responseTime,
    lookupAddress,
    reset
  };
};
```

### Usage Example

```javascript
import React, { useState } from 'react';
import { useAddressLookup } from '../hooks/useAddressLookup';
import { TextField, Button, List, ListItem, Typography, Chip } from '@mui/material';

const AddressLookupExample = () => {
  const [postcode, setPostcode] = useState('');
  const { addresses, loading, error, cacheHit, responseTime, lookupAddress } = useAddressLookup();

  const handleSubmit = (e) => {
    e.preventDefault();
    lookupAddress(postcode);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Postcode"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value.toUpperCase())}
          disabled={loading}
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Looking up...' : 'Lookup'}
        </Button>
      </form>

      {error && <Typography color="error">{error}</Typography>}

      {addresses.length > 0 && (
        <>
          <Chip
            label={cacheHit ? `Cache Hit (${responseTime}ms)` : `API Call (${responseTime}ms)`}
            color={cacheHit ? 'success' : 'primary'}
          />
          <List>
            {addresses.map((addr, idx) => (
              <ListItem key={idx}>
                {addr.line_1}, {addr.town_or_city}, {addr.postcode}
              </ListItem>
            ))}
          </List>
        </>
      )}
    </div>
  );
};

export default AddressLookupExample;
```

---

## 3. SmartAddressInput with Postcoder

### Modified SmartAddressInput Component

**Changes to:** `src/components/Address/SmartAddressInput.js`

**Option A: Simple URL Change**

```diff
  // Line 196-198
  const res = await fetch(
-   config.apiBaseUrl + `/api/utils/address-lookup/?postcode=${encodeURIComponent(postcode)}`
+   config.apiBaseUrl + `/api/utils/postcoder-address-lookup/?postcode=${encodeURIComponent(postcode)}`
  );
```

**Option B: Configurable Provider**

```javascript
// Add to top of component
const SmartAddressInput = ({ values, onChange, errors, fieldPrefix, className }) => {
  // ... existing state ...

  // Get endpoint based on config
  const addressLookupEndpoint = config.addressLookupEndpoints?.[config.addressLookupProvider] || '/api/utils/address-lookup/';

  // ... existing code ...

  const performAddressLookup = useCallback(async (postcode, addressLine) => {
    if (!addressMetadata?.addressLookupSupported) return;

    setIsLoadingSuggestions(true);

    try {
      const res = await fetch(
        config.apiBaseUrl + `${addressLookupEndpoint}?postcode=${encodeURIComponent(postcode)}`
      );

      if (res.status === 200) {
        const data = await res.json();

        // Optional: Log cache hit info for debugging
        if (data.cache_hit !== undefined) {
          console.debug(`Address lookup: ${data.cache_hit ? 'CACHE HIT' : 'API CALL'} (${data.response_time_ms}ms)`);
        }

        const addresses = (data.addresses || []).map(addr => ({
          line1: addr.line_1 || "",
          line2: addr.line_2 || "",
          town: addr.town_or_city || "",
          county: addr.county || "",
          postcode: addr.postcode || postcode,
          country: selectedCountry,
          state: "",
          district: "",
          building: addr.building_name || "",
          fullAddress: [addr.building_name, addr.line_1, addr.line_2].filter(Boolean).join(', ')
        }));

        // ... rest of logic unchanged ...
      }
    } catch (error) {
      console.error('Address lookup failed:', error);
      setAddressSuggestions([]);
      setShowSuggestions(true);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [addressMetadata, selectedCountry, addressLookupEndpoint]);

  // ... rest of component unchanged ...
};
```

---

## 4. Environment Variable Configuration

### Config File Setup

**File:** `src/config.js`

```javascript
/**
 * Application configuration
 * Supports environment-specific settings via .env files
 */

const config = {
  // API base URL
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8888',

  // Address lookup provider: 'getaddress' or 'postcoder'
  addressLookupProvider: process.env.REACT_APP_ADDRESS_LOOKUP_PROVIDER || 'getaddress',

  // Endpoint mapping for address lookup providers
  addressLookupEndpoints: {
    getaddress: '/api/utils/address-lookup/',
    postcoder: '/api/utils/postcoder-address-lookup/'
  },

  // Feature flags (optional)
  features: {
    showAddressLookupMetadata: process.env.REACT_APP_SHOW_ADDRESS_METADATA === 'true',
    enableAddressLookupAnalytics: process.env.REACT_APP_ENABLE_ADDRESS_ANALYTICS === 'true'
  }
};

// Validate configuration
if (!config.addressLookupEndpoints[config.addressLookupProvider]) {
  console.warn(
    `Invalid address lookup provider: ${config.addressLookupProvider}. Falling back to 'getaddress'.`
  );
  config.addressLookupProvider = 'getaddress';
}

export default config;
```

### Environment Files

**File:** `.env.development`

```bash
REACT_APP_API_BASE_URL=http://localhost:8888
REACT_APP_ADDRESS_LOOKUP_PROVIDER=getaddress
REACT_APP_SHOW_ADDRESS_METADATA=true
REACT_APP_ENABLE_ADDRESS_ANALYTICS=false
```

**File:** `.env.production`

```bash
REACT_APP_API_BASE_URL=https://api.production.com
REACT_APP_ADDRESS_LOOKUP_PROVIDER=postcoder
REACT_APP_SHOW_ADDRESS_METADATA=false
REACT_APP_ENABLE_ADDRESS_ANALYTICS=true
```

**File:** `.env.staging`

```bash
REACT_APP_API_BASE_URL=https://api.staging.com
REACT_APP_ADDRESS_LOOKUP_PROVIDER=postcoder
REACT_APP_SHOW_ADDRESS_METADATA=true
REACT_APP_ENABLE_ADDRESS_ANALYTICS=true
```

---

## 5. Feature Flag Toggle

### Feature Flag Hook

**File:** `src/hooks/useFeatureFlag.js`

```javascript
import { useState, useEffect } from 'react';
import config from '../config';

/**
 * Hook to check if a feature flag is enabled
 * Fetches flags from backend and determines if user is in rollout percentage
 *
 * @param {string} flagKey - Feature flag key
 * @returns {boolean} Whether feature is enabled for current user
 */
export const useFeatureFlag = (flagKey) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const res = await fetch(`${config.apiBaseUrl}/api/feature-flags/`);
        const data = await res.json();

        const rolloutPercentage = data.flags?.[flagKey] || 0;

        // Generate consistent random number based on session
        const userRandom = Math.random() * 100;

        setIsEnabled(userRandom < rolloutPercentage);
      } catch (error) {
        console.error('Failed to fetch feature flags:', error);
        setIsEnabled(false);  // Fail closed
      } finally {
        setLoading(false);
      }
    };

    fetchFlags();
  }, [flagKey]);

  return { isEnabled, loading };
};
```

### Usage with Address Lookup

```javascript
import { useFeatureFlag } from '../../hooks/useFeatureFlag';

const SmartAddressInput = ({ ... }) => {
  const { isEnabled: usePostcoderAPI, loading: flagLoading } = useFeatureFlag('use_postcoder_address_lookup');

  const performAddressLookup = useCallback(async (postcode, addressLine) => {
    if (flagLoading) return;  // Wait for flag to load

    const endpoint = usePostcoderAPI
      ? '/api/utils/postcoder-address-lookup/'
      : '/api/utils/address-lookup/';

    const res = await fetch(
      config.apiBaseUrl + `${endpoint}?postcode=${encodeURIComponent(postcode)}`
    );

    // ... rest of logic ...
  }, [usePostcoderAPI, flagLoading]);

  // ... rest of component ...
};
```

---

## 6. Cache Hit Metadata Display

### Display Cache Performance Info

**Component Example:**

```javascript
import React, { useState } from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import { Speed as SpeedIcon, Cached as CachedIcon } from '@mui/icons-material';

const AddressLookupWithMetadata = () => {
  const [metadata, setMetadata] = useState(null);

  const handleLookup = async (postcode) => {
    const response = await fetch(
      `http://localhost:8888/api/utils/postcoder-address-lookup/?postcode=${postcode}`
    );
    const data = await response.json();

    setMetadata({
      cacheHit: data.cache_hit,
      responseTime: data.response_time_ms
    });

    // ... rest of logic ...
  };

  return (
    <Box>
      {/* Your address lookup UI */}

      {/* Metadata display */}
      {metadata && (
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Tooltip title={metadata.cacheHit ? 'Served from cache' : 'Called Postcoder API'}>
            <Chip
              icon={metadata.cacheHit ? <CachedIcon /> : <SpeedIcon />}
              label={metadata.cacheHit ? 'Cache Hit' : 'API Call'}
              color={metadata.cacheHit ? 'success' : 'primary'}
              size="small"
            />
          </Tooltip>

          <Chip
            label={`${metadata.responseTime}ms`}
            color={metadata.responseTime < 100 ? 'success' : 'default'}
            size="small"
          />
        </Box>
      )}
    </Box>
  );
};
```

### Analytics Tracking

```javascript
/**
 * Track address lookup performance metrics
 */
const trackAddressLookup = (postcode, cacheHit, responseTime) => {
  // Send to analytics service (e.g., Google Analytics, Mixpanel)
  if (window.gtag) {
    window.gtag('event', 'address_lookup', {
      event_category: 'Address',
      event_label: cacheHit ? 'cache_hit' : 'cache_miss',
      value: responseTime,
      postcode_prefix: postcode.substring(0, 4)  // Anonymize
    });
  }

  // Or send to custom analytics endpoint
  fetch('/api/analytics/address-lookup/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cache_hit: cacheHit,
      response_time_ms: responseTime,
      timestamp: new Date().toISOString()
    })
  });
};

// Usage in performAddressLookup
const data = await response.json();
trackAddressLookup(postcode, data.cache_hit, data.response_time_ms);
```

---

## 7. Error Handling Patterns

### Comprehensive Error Handling

```javascript
const performAddressLookup = async (postcode) => {
  try {
    const response = await fetch(
      `${config.apiBaseUrl}/api/utils/postcoder-address-lookup/?postcode=${encodeURIComponent(postcode)}`,
      { timeout: 5000 }  // 5-second timeout
    );

    // Handle HTTP errors
    if (response.status === 400) {
      const error = await response.json();
      throw new Error(`Invalid postcode: ${error.error}`);
    }

    if (response.status === 500) {
      const error = await response.json();
      throw new Error(`Server error: ${error.error}`);
    }

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();

    // Handle empty results
    if (!data.addresses || data.addresses.length === 0) {
      return {
        success: false,
        message: 'No addresses found for this postcode. Please enter address manually.',
        addresses: []
      };
    }

    return {
      success: true,
      addresses: data.addresses,
      cacheHit: data.cache_hit,
      responseTime: data.response_time_ms
    };

  } catch (error) {
    // Network errors
    if (error.name === 'AbortError') {
      return { success: false, message: 'Request timed out. Please try again.' };
    }

    // API errors
    if (error.message.includes('Failed to fetch')) {
      return { success: false, message: 'Network error. Please check your connection.' };
    }

    // Generic errors
    console.error('Address lookup failed:', error);
    return {
      success: false,
      message: error.message || 'Address lookup failed. Please try again.',
      addresses: []
    };
  }
};
```

### Fallback to Manual Entry

```javascript
const SmartAddressLookup = () => {
  const [lookupFailed, setLookupFailed] = useState(false);

  const handleLookup = async (postcode) => {
    const result = await performAddressLookup(postcode);

    if (!result.success) {
      setLookupFailed(true);
      // Show manual entry form
      setShowManualEntry(true);
    }
  };

  return (
    <>
      {!lookupFailed && (
        <AutocompleteLookup onLookup={handleLookup} />
      )}

      {lookupFailed && (
        <>
          <Alert severity="warning">
            Address lookup is currently unavailable. Please enter your address manually.
          </Alert>
          <ManualAddressForm />
        </>
      )}
    </>
  );
};
```

---

## 8. Testing Examples

### Unit Test: useAddressLookup Hook

**File:** `src/hooks/__tests__/useAddressLookup.test.js`

```javascript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAddressLookup } from '../useAddressLookup';

// Mock fetch
global.fetch = jest.fn();

describe('useAddressLookup', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should fetch addresses successfully', async () => {
    const mockAddresses = [
      { line_1: '10 Downing Street', town_or_city: 'London', postcode: 'SW1A 1AA' }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        addresses: mockAddresses,
        cache_hit: false,
        response_time_ms: 250
      })
    });

    const { result } = renderHook(() => useAddressLookup());

    await act(async () => {
      await result.current.lookupAddress('SW1A1AA');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.addresses).toEqual(mockAddresses);
      expect(result.current.cacheHit).toBe(false);
      expect(result.current.responseTime).toBe(250);
      expect(result.current.error).toBeNull();
    });
  });

  it('should handle errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAddressLookup());

    await act(async () => {
      await result.current.lookupAddress('SW1A1AA');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.addresses).toEqual([]);
      expect(result.current.error).toBe('Network error');
    });
  });

  it('should validate postcode before lookup', async () => {
    const { result } = renderHook(() => useAddressLookup());

    await act(async () => {
      await result.current.lookupAddress('');
    });

    expect(result.current.error).toBe('Please enter a valid postcode');
    expect(fetch).not.toHaveBeenCalled();
  });
});
```

### Integration Test: SmartAddressInput

```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SmartAddressInput from '../SmartAddressInput';

describe('SmartAddressInput with Postcoder', () => {
  it('should display cache hit indicator', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        addresses: [{ line_1: 'Test', postcode: 'SW1A 1AA' }],
        cache_hit: true,
        response_time_ms: 5
      })
    });

    render(<SmartAddressInput values={{}} onChange={jest.fn()} />);

    // Select country
    fireEvent.change(screen.getByLabelText(/country/i), {
      target: { value: 'United Kingdom' }
    });

    // Enter postcode
    fireEvent.change(screen.getByLabelText(/postcode/i), {
      target: { value: 'SW1A1AA' }
    });

    // Type address
    fireEvent.change(screen.getByLabelText(/address/i), {
      target: { value: 'Test' }
    });

    // Wait for suggestions
    await waitFor(() => {
      expect(screen.getByText(/cache hit/i)).toBeInTheDocument();
    });
  });
});
```

---

## Complete Working Example

### Standalone Address Lookup Component

**File:** `src/components/PostcoderAddressLookup.jsx`

```javascript
import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  Alert,
  Chip,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Speed as SpeedIcon,
  Cached as CachedIcon
} from '@mui/icons-material';
import config from '../config';

const PostcoderAddressLookup = ({ onSelectAddress }) => {
  const [postcode, setPostcode] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);

  const handleLookup = async () => {
    if (!postcode.trim()) {
      setError('Please enter a postcode');
      return;
    }

    setLoading(true);
    setError(null);
    setAddresses([]);
    setMetadata(null);

    try {
      const response = await fetch(
        `${config.apiBaseUrl}/api/utils/postcoder-address-lookup/?postcode=${encodeURIComponent(postcode)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lookup failed');
      }

      const data = await response.json();

      setAddresses(data.addresses || []);
      setMetadata({
        cacheHit: data.cache_hit,
        responseTime: data.response_time_ms
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLookup();
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Postcoder Address Lookup
      </Typography>

      {/* Input Section */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          fullWidth
          label="UK Postcode"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value.toUpperCase())}
          onKeyPress={handleKeyPress}
          disabled={loading}
          placeholder="e.g., SW1A 1AA"
        />
        <Button
          variant="contained"
          onClick={handleLookup}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
        >
          {loading ? 'Looking up...' : 'Lookup'}
        </Button>
      </Box>

      {/* Metadata */}
      {metadata && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip
            icon={metadata.cacheHit ? <CachedIcon /> : <CheckCircleIcon />}
            label={metadata.cacheHit ? 'Cache Hit' : 'API Call'}
            color={metadata.cacheHit ? 'success' : 'primary'}
            size="small"
          />
          <Chip
            icon={<SpeedIcon />}
            label={`${metadata.responseTime}ms`}
            color={metadata.responseTime < 100 ? 'success' : 'default'}
            size="small"
          />
        </Box>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Results */}
      {addresses.length > 0 && (
        <>
          <Typography variant="subtitle2" gutterBottom>
            Found {addresses.length} address{addresses.length !== 1 ? 'es' : ''}:
          </Typography>
          <List>
            {addresses.map((address, idx) => (
              <ListItem
                key={idx}
                button
                onClick={() => onSelectAddress?.(address)}
                sx={{ bgcolor: 'background.default', mb: 1, borderRadius: 1 }}
              >
                <ListItemText
                  primary={`${address.line_1}${address.line_2 ? `, ${address.line_2}` : ''}`}
                  secondary={`${address.town_or_city}, ${address.postcode}`}
                />
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Paper>
  );
};

export default PostcoderAddressLookup;
```

---

## Summary

These examples provide ready-to-use code for:

✅ Simple fetch calls to Postcoder API
✅ React hooks for address lookup
✅ SmartAddressInput integration
✅ Environment variable configuration
✅ Feature flag implementation
✅ Cache hit metadata display
✅ Comprehensive error handling
✅ Unit and integration tests

**Next Steps:**
1. Choose migration strategy from `FRONTEND_INTEGRATION.md`
2. Copy relevant code examples from this file
3. Adapt to your specific use case
4. Test thoroughly using `docs/testing/getaddress-io-verification-checklist.md`

---

**Last Updated:** 2025-11-05
**Status:** Ready for implementation
**Compatibility:** React 18+, Material-UI 5+
