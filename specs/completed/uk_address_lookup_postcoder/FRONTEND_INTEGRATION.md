# Frontend Integration Points - Address Lookup

This document describes how the React frontend integrates with address lookup services and provides migration strategies for switching between getaddress.io and Postcoder.com.

---

## Current Architecture (As-Is)

### Component: `SmartAddressInput.js`

**Location:** `frontend/react-Admin3/src/components/Address/SmartAddressInput.js`

**Current Endpoint:** `/api/utils/address-lookup/` (getaddress.io)

**API Call (Line 196-198):**
```javascript
const res = await fetch(
  config.apiBaseUrl + `/api/utils/address-lookup/?postcode=${encodeURIComponent(postcode)}`
);
```

**Integration Points:**
1. **Country Selection**: `CountryAutocomplete` component determines if address lookup is supported
2. **Address Metadata**: `addressMetadataService` provides country-specific configuration
3. **API Configuration**: `config.apiBaseUrl` from `src/config.js`
4. **Autocomplete Flow**:
   - User enters postcode
   - User types address (minimum 3 characters)
   - Component calls `/api/utils/address-lookup/?postcode=...`
   - Suggestions appear in dropdown
   - User selects address → form auto-populates

---

## Available Endpoints

### 1. GetAddress.io (Current/Default)

**Endpoint:** `/api/utils/address-lookup/`

**Backend Function:** `address_lookup_proxy()` in `backend/django_Admin3/utils/views.py`

**Response Format:**
```json
{
  "addresses": [
    {
      "line_1": "10 Downing Street",
      "line_2": "Westminster",
      "town_or_city": "London",
      "county": "Greater London",
      "postcode": "SW1A 1AA",
      "building_name": "",
      "formatted_address": ["10 Downing Street", "Westminster", "London", "SW1A 1AA"]
    }
  ]
}
```

**Characteristics:**
- ✅ Production-tested and stable
- ✅ Existing SmartAddressInput component fully integrated
- ✅ Used across all forms (registration, checkout, profile)
- ⚠️ Costs: Per-request pricing model
- ⚠️ Rate limits: Based on subscription tier

---

### 2. Postcoder.com (New/Optional)

**Endpoint:** `/api/utils/postcoder-address-lookup/`

**Backend Function:** `postcoder_address_lookup()` in `backend/django_Admin3/utils/views.py`

**Response Format:** (Same as getaddress.io - backward compatible)
```json
{
  "addresses": [
    {
      "line_1": "10 Downing Street",
      "line_2": "Westminster",
      "town_or_city": "London",
      "county": "Greater London",
      "postcode": "SW1A 1AA",
      "building_name": "",
      "formatted_address": ["10 Downing Street", "Westminster", "London", "SW1A 1AA"]
    }
  ],
  "cache_hit": false,
  "response_time_ms": 250
}
```

**Characteristics:**
- ✅ Backward-compatible response format (no frontend changes needed)
- ✅ Built-in 7-day caching (improved performance)
- ✅ Analytics tracking (cache hit rate, response times)
- ✅ Additional metadata: `cache_hit`, `response_time_ms`
- 🆕 Not yet integrated with frontend (requires URL change)
- 💰 Different pricing model than getaddress.io

---

## Migration Strategies

### Strategy 1: Simple URL Swap (Quick Migration)

**Approach:** Change the hardcoded URL in `SmartAddressInput.js`

**Steps:**
1. Open `frontend/react-Admin3/src/components/Address/SmartAddressInput.js`
2. Find line 197: `/api/utils/address-lookup/`
3. Replace with: `/api/utils/postcoder-address-lookup/`
4. Test thoroughly (see `docs/testing/getaddress-io-verification-checklist.md`)
5. Deploy

**Pros:**
- ✅ Simple and fast (5-minute change)
- ✅ No additional code required

**Cons:**
- ❌ No rollback option without redeployment
- ❌ Affects all users immediately
- ❌ Cannot A/B test

**Code Change:**
```diff
// frontend/react-Admin3/src/components/Address/SmartAddressInput.js

  const res = await fetch(
-   config.apiBaseUrl + `/api/utils/address-lookup/?postcode=${encodeURIComponent(postcode)}`
+   config.apiBaseUrl + `/api/utils/postcoder-address-lookup/?postcode=${encodeURIComponent(postcode)}`
  );
```

**Recommended for:** Small projects, low-risk environments, single-tenant deployments

---

### Strategy 2: Environment Variable Toggle (Recommended)

**Approach:** Use environment variable to select endpoint at build time

**Steps:**

**1. Add Environment Variable**

```bash
# .env.development
REACT_APP_ADDRESS_LOOKUP_PROVIDER=getaddress

# .env.production
REACT_APP_ADDRESS_LOOKUP_PROVIDER=postcoder
```

**2. Update `config.js`**

```javascript
// frontend/react-Admin3/src/config.js

const config = {
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8888',

  // Address lookup provider: 'getaddress' or 'postcoder'
  addressLookupProvider: process.env.REACT_APP_ADDRESS_LOOKUP_PROVIDER || 'getaddress',

  // Endpoint mapping
  addressLookupEndpoints: {
    getaddress: '/api/utils/address-lookup/',
    postcoder: '/api/utils/postcoder-address-lookup/'
  }
};

export default config;
```

**3. Update `SmartAddressInput.js`**

```javascript
// frontend/react-Admin3/src/components/Address/SmartAddressInput.js

  // Get endpoint based on configured provider
  const addressLookupEndpoint = config.addressLookupEndpoints[config.addressLookupProvider];

  const res = await fetch(
    config.apiBaseUrl + `${addressLookupEndpoint}?postcode=${encodeURIComponent(postcode)}`
  );
```

**Pros:**
- ✅ Environment-specific configuration
- ✅ Easy rollback (change env var + restart)
- ✅ Different providers per environment (dev vs. prod)
- ✅ No code changes for provider switch

**Cons:**
- ⚠️ Requires app rebuild to change
- ⚠️ All users see same provider (no user-level toggle)

**Recommended for:** Medium to large projects, production deployments

---

### Strategy 3: Feature Flag with Runtime Toggle (Advanced)

**Approach:** Use feature flag service (e.g., LaunchDarkly, custom DB flag) for runtime switching

**Steps:**

**1. Create Feature Flag Model**

```python
# backend/django_Admin3/feature_flags/models.py

class FeatureFlag(models.Model):
    key = models.CharField(max_length=100, unique=True)
    enabled = models.BooleanField(default=False)
    rollout_percentage = models.IntegerField(default=0)  # 0-100

    class Meta:
        verbose_name = 'Feature Flag'
```

**2. Add API Endpoint for Feature Flags**

```python
# backend/django_Admin3/feature_flags/views.py

@csrf_exempt
@require_GET
def get_feature_flags(request):
    flags = FeatureFlag.objects.filter(enabled=True)
    return JsonResponse({
        'flags': {flag.key: flag.rollout_percentage for flag in flags}
    })
```

**3. Create Frontend Feature Flag Hook**

```javascript
// frontend/react-Admin3/src/hooks/useFeatureFlag.js

import { useState, useEffect } from 'react';
import config from '../config';

export const useFeatureFlag = (flagKey) => {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const res = await fetch(config.apiBaseUrl + '/api/feature-flags/');
        const data = await res.json();

        const rolloutPercentage = data.flags[flagKey] || 0;
        const userRandom = Math.random() * 100;

        setIsEnabled(userRandom < rolloutPercentage);
      } catch (error) {
        console.error('Failed to fetch feature flags:', error);
        setIsEnabled(false);  // Default to disabled
      }
    };

    fetchFlags();
  }, [flagKey]);

  return isEnabled;
};
```

**4. Update `SmartAddressInput.js`**

```javascript
// frontend/react-Admin3/src/components/Address/SmartAddressInput.js

import { useFeatureFlag } from '../../hooks/useFeatureFlag';

const SmartAddressInput = ({ ... }) => {
  const usePostcoderAPI = useFeatureFlag('use_postcoder_address_lookup');

  // ...existing code...

  const performAddressLookup = useCallback(async (postcode, addressLine) => {
    const endpoint = usePostcoderAPI
      ? '/api/utils/postcoder-address-lookup/'
      : '/api/utils/address-lookup/';

    const res = await fetch(
      config.apiBaseUrl + `${endpoint}?postcode=${encodeURIComponent(postcode)}`
    );

    // ...rest of logic...
  }, [usePostcoderAPI, addressMetadata, selectedCountry]);
};
```

**5. Configure Feature Flag in Django Admin**

```python
# Create flag in Django admin
FeatureFlag.objects.create(
    key='use_postcoder_address_lookup',
    enabled=True,
    rollout_percentage=50  # 50% of users
)
```

**Pros:**
- ✅ Runtime toggling (no rebuild required)
- ✅ Gradual rollout (0% → 10% → 50% → 100%)
- ✅ A/B testing capability
- ✅ Instant rollback
- ✅ User-segment targeting (if enhanced)

**Cons:**
- ❌ More complex implementation
- ❌ Adds database queries on frontend load
- ❌ Requires feature flag infrastructure

**Recommended for:** Large-scale deployments, SaaS products, enterprise applications

---

### Strategy 4: User Preference (Ultimate Flexibility)

**Approach:** Allow users to choose their preferred address lookup provider

**Steps:**

**1. Add User Preference Model**

```python
# backend/django_Admin3/userprofile/models.py

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    preferred_address_provider = models.CharField(
        max_length=20,
        choices=[('getaddress', 'GetAddress.io'), ('postcoder', 'Postcoder.com')],
        default='getaddress'
    )
```

**2. Add API Endpoint**

```python
# backend/django_Admin3/userprofile/views.py

@csrf_exempt
@require_GET
def get_user_preferences(request):
    if not request.user.is_authenticated:
        return JsonResponse({'preferred_address_provider': 'getaddress'})

    profile = request.user.userprofile
    return JsonResponse({
        'preferred_address_provider': profile.preferred_address_provider
    })
```

**3. Update Frontend to Use User Preference**

```javascript
// frontend/react-Admin3/src/components/Address/SmartAddressInput.js

  const [addressProvider, setAddressProvider] = useState('getaddress');

  useEffect(() => {
    const fetchUserPreferences = async () => {
      try {
        const res = await fetch(config.apiBaseUrl + '/api/user/preferences/');
        const data = await res.json();
        setAddressProvider(data.preferred_address_provider);
      } catch (error) {
        console.error('Failed to fetch preferences:', error);
      }
    };

    fetchUserPreferences();
  }, []);

  const performAddressLookup = useCallback(async (postcode, addressLine) => {
    const endpoint = addressProvider === 'postcoder'
      ? '/api/utils/postcoder-address-lookup/'
      : '/api/utils/address-lookup/';

    const res = await fetch(
      config.apiBaseUrl + `${endpoint}?postcode=${encodeURIComponent(postcode)}`
    );
    // ...
  }, [addressProvider]);
```

**Pros:**
- ✅ User control and flexibility
- ✅ Can gather user feedback on preference
- ✅ Supports provider comparison

**Cons:**
- ❌ Most complex implementation
- ❌ Additional UI for preference selection
- ❌ Requires authentication

**Recommended for:** Power user applications, internal tools

---

## Backward Compatibility

**Critical:** Both endpoints return **identical response formats**, ensuring zero frontend code changes are required beyond the URL change.

### Response Contract

**Required Fields:**
```javascript
{
  "addresses": [
    {
      "line_1": string,
      "line_2": string,
      "town_or_city": string,
      "county": string,
      "postcode": string,
      "building_name": string,
      "formatted_address": string[]
    }
  ]
}
```

**Optional Fields (Postcoder only):**
```javascript
{
  "cache_hit": boolean,         // Only in Postcoder response
  "response_time_ms": number    // Only in Postcoder response
}
```

Frontend components can safely ignore optional fields or use them for analytics/debugging.

---

## Testing Migration

When switching providers, use this test plan:

### 1. Component-Level Tests

```javascript
// src/components/Address/__tests__/SmartAddressInput.test.js

describe('SmartAddressInput with Postcoder', () => {
  beforeEach(() => {
    // Mock Postcoder endpoint
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        addresses: [{ line_1: 'Test Address', postcode: 'SW1A 1AA' }],
        cache_hit: true,
        response_time_ms: 50
      })
    });
  });

  it('should call postcoder endpoint when configured', async () => {
    // Test implementation
  });
});
```

### 2. Integration Tests

- Test postcode lookup flow end-to-end
- Verify form submission with Postcoder addresses
- Test error handling (invalid postcodes, API failures)
- Verify manual entry fallback still works

### 3. Performance Testing

- Compare response times: GetAddress.io vs. Postcoder (cache miss)
- Measure Postcoder cache hit performance
- Test concurrent requests

### 4. User Acceptance Testing

- Provide checklist to QA team
- Test across multiple browsers
- Verify address suggestions match expectations
- Check form submission and data persistence

---

## Rollback Plan

If issues arise after switching to Postcoder:

### Immediate Rollback (Environment Variable Strategy)

```bash
# Update .env.production
REACT_APP_ADDRESS_LOOKUP_PROVIDER=getaddress

# Rebuild and redeploy
npm run build
# Deploy to production
```

### Emergency Rollback (Simple URL Swap)

```bash
# Revert Git commit
git revert HEAD

# Rebuild and redeploy
npm run build
# Deploy to production
```

### Feature Flag Rollback

```python
# Django admin or management command
FeatureFlag.objects.filter(key='use_postcoder_address_lookup').update(rollout_percentage=0)
```

---

## Performance Considerations

### GetAddress.io
- **Average response time:** 150-300ms
- **Cache:** None (every request hits API)
- **Cost:** Per-request pricing

### Postcoder.com (with caching)
- **Cache miss:** 150-300ms (similar to GetAddress.io)
- **Cache hit:** < 10ms (from database)
- **Cache duration:** 7 days
- **Expected cache hit rate:** 40-60% after 30 days
- **Cost savings:** Reduced API calls due to caching

---

## Monitoring & Analytics

### Metrics to Track

**GetAddress.io:**
- Request count
- Error rate
- Response times
- API costs

**Postcoder.com:**
- Request count (total, cache hit, cache miss)
- Cache hit rate (target: >40%)
- Average response time (cache hit vs. miss)
- Error rate
- API costs (reduced due to caching)

### Implementation

Use `AddressLookupLog` model in `backend/django_Admin3/address_analytics/models.py` for analytics:

```python
# Query cache hit rate
cache_hits = AddressLookupLog.objects.filter(cache_hit=True, api_provider='postcoder').count()
total = AddressLookupLog.objects.filter(api_provider='postcoder').count()
cache_hit_rate = (cache_hits / total * 100) if total > 0 else 0
```

---

## Recommendations

**For immediate production use:**
→ **Strategy 2 (Environment Variable Toggle)** - Safest, simple, environment-specific

**For gradual rollout:**
→ **Strategy 3 (Feature Flag)** - Controlled rollout, instant rollback, A/B testing

**For internal tools:**
→ **Strategy 4 (User Preference)** - User control, feedback collection

**For quick testing:**
→ **Strategy 1 (Simple URL Swap)** - Fast, dev/staging environments only

---

## Future Enhancements

1. **Multi-Provider Support**: Allow fallback to GetAddress.io if Postcoder fails
2. **Provider Comparison Dashboard**: Display performance metrics side-by-side
3. **Automatic Provider Selection**: Choose provider based on response time/availability
4. **Custom Caching Policies**: Configure TTL per environment
5. **Address Validation**: Compare results from both providers for accuracy

---

## Support & Troubleshooting

**Questions or issues?**
- Check `docs/testing/postcoder-manual-testing-guide.md` for testing procedures
- Review `specs/uk_address_lookup_postcoder/spec.md` for full specification
- See `CLAUDE.md` for project-wide integration points

**Common Issues:**
- Wrong endpoint being called → Check config and environment variables
- Addresses not appearing → Verify backend endpoint is functional (test with cURL)
- Console errors → Check browser DevTools, verify API response format

---

**Last Updated:** 2025-11-05
**Status:** Production-ready (both endpoints functional)
**Current State:** Using GetAddress.io (default)
**Migration Status:** Ready for Postcoder.com migration (backward-compatible)
