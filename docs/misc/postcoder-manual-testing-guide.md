# Postcoder.com Address Lookup - Manual Testing Guide

Complete guide for manually testing the Postcoder.com address lookup integration.

## Prerequisites

1. Django development server running on port 8888
2. Postcoder API key configured in environment variables (`POSTCODER_API_KEY`)
3. Database migrations applied
4. Python requests library installed (`pip install requests`)

## Quick Start

### 1. Start Django Server

```bash
cd backend/django_Admin3
.\.venv\Scripts\activate
python manage.py runserver 8888
```

### 2. Run Automated Test Script

```bash
# In a new terminal
cd backend/django_Admin3
.\.venv\Scripts\activate
python test_postcoder_manual.py
```

This will test:
- Cache miss behavior (first request)
- Cache hit behavior (second request)
- Multiple different postcodes
- Postcode cleaning (lowercase → uppercase)
- Invalid postcode handling
- Validation errors

### 3. Verify Database Entries

```bash
python check_postcoder_data.py
```

This displays:
- Cached addresses with expiration times
- Recent lookup logs
- Statistics (cache hit rate, success rate, average response time)

## Manual Testing with cURL

### Test Cache Miss (First Request)

```powershell
curl "http://localhost:8888/api/utils/postcoder-address-lookup/?postcode=SW1A1AA"
```

**Expected Response:**
```json
{
  "addresses": [
    {
      "formatted_address": ["10 Downing Street", "Westminster", "London", "SW1A 1AA"],
      "line_1": "10 Downing Street",
      "line_2": "Westminster",
      "town_or_city": "London",
      "county": "Greater London",
      "postcode": "SW1A 1AA"
    }
  ],
  "cache_hit": false,
  "response_time_ms": 250
}
```

**What to Check:**
- ✅ `cache_hit: false` (first request)
- ✅ Response time ~100-500ms (API call)
- ✅ Addresses returned in getaddress.io format

### Test Cache Hit (Second Request)

```powershell
curl "http://localhost:8888/api/utils/postcoder-address-lookup/?postcode=SW1A1AA"
```

**Expected Response:**
```json
{
  "addresses": [...same addresses...],
  "cache_hit": true,
  "response_time_ms": 5
}
```

**What to Check:**
- ✅ `cache_hit: true` (cached)
- ✅ Response time < 10ms (from database)
- ✅ Same addresses as first request
- ✅ API was NOT called (check Django logs)

### Test Invalid Postcode

```powershell
curl "http://localhost:8888/api/utils/postcoder-address-lookup/?postcode=INVALID"
```

**Expected Response:**
```json
{
  "error": "Address lookup failed: <error message>"
}
```

**Status Code:** 500

### Test Validation Error

```powershell
# Missing postcode
curl "http://localhost:8888/api/utils/postcoder-address-lookup/"

# Too short
curl "http://localhost:8888/api/utils/postcoder-address-lookup/?postcode=SW1"
```

**Expected Response:**
```json
{
  "error": "Postcode is required"
}
```

**Status Code:** 400

## Frontend Testing (React Component)

### 1. Add Test Route

In your React app routing (`src/App.js` or similar):

```javascript
import PostcoderTestComponent from './components/Testing/PostcoderTestComponent';

// Add route:
<Route path="/test/postcoder" element={<PostcoderTestComponent />} />
```

### 2. Navigate to Test Page

```
http://localhost:3000/test/postcoder
```

### 3. Test Workflow

1. **Enter postcode** (e.g., SW1A1AA) and click "Lookup"
   - Should see "Cache Miss" badge
   - Response time ~100-500ms
   - Addresses displayed

2. **Click "Lookup" again** (same postcode)
   - Should see "Cache Hit" badge
   - Response time < 10ms
   - Same addresses displayed

3. **Try different postcodes:**
   - EC1A1BB (Bank of England)
   - OX49EL (Oxford)
   - M13NQ (Manchester)

4. **Test error handling:**
   - Enter "INVALID" → should show error message
   - Enter "" (empty) → should show validation error

## Database Verification

### Check Cached Addresses

```sql
-- Via Django shell
python manage.py shell

from address_cache.models import CachedAddress
CachedAddress.objects.all().values('postcode', 'created_at', 'expires_at', 'hit_count')
```

**What to Check:**
- ✅ Postcode stored in uppercase without spaces
- ✅ `expires_at` is ~7 days after `created_at`
- ✅ `hit_count` increments on each cache hit
- ✅ `formatted_addresses` contains getaddress.io format

### Check Lookup Logs

```sql
-- Via Django shell
python manage.py shell

from address_analytics.models import AddressLookupLog
AddressLookupLog.objects.all().order_by('-lookup_timestamp')[:10]
```

**What to Check:**
- ✅ First request has `cache_hit=False`
- ✅ Subsequent requests have `cache_hit=True`
- ✅ `api_provider='postcoder'`
- ✅ `success=True` for valid postcodes
- ✅ `response_time_ms` is accurate
- ✅ `result_count` matches number of addresses

## Testing Checklist

### Functional Tests
- [ ] Cache miss on first request
- [ ] Cache hit on second request
- [ ] Multiple postcodes cached independently
- [ ] Postcode cleaning (lowercase → uppercase)
- [ ] Postcode cleaning (spaces removed)
- [ ] Invalid postcode returns 500 error
- [ ] Missing postcode returns 400 error
- [ ] Short postcode returns 400 error

### Database Tests
- [ ] CachedAddress entry created on first request
- [ ] 7-day expiration set correctly
- [ ] Hit count increments on cache hits
- [ ] AddressLookupLog entry created for each request
- [ ] Cache hit/miss tracked correctly
- [ ] Response times logged accurately

### Performance Tests
- [ ] Cache miss response time: 100-500ms
- [ ] Cache hit response time: < 10ms
- [ ] No API call on cache hit
- [ ] Concurrent requests handled correctly

### Edge Cases
- [ ] Expired cache entries trigger API refresh
- [ ] Logging failures don't break responses
- [ ] API errors logged but don't crash
- [ ] Empty address lists handled gracefully
- [ ] Special characters in postcodes handled

## Monitoring Django Logs

When testing, watch the Django console for log messages:

```
INFO Cache MISS for postcode SW1A1AA
INFO Calling Postcoder API for postcode: SW1A1AA
INFO Successfully retrieved 5 addresses
INFO Cached addresses for postcode SW1A1AA (expires: 2025-11-12)
INFO [POSTCODER] SUCCESS (API) SW1A1AA: 5 addresses in 250ms

INFO Cache HIT for postcode SW1A1AA (hits: 2)
INFO [POSTCODER] SUCCESS (cached) SW1A1AA: 5 addresses in 3ms
```

## Common Issues

### Issue: "POSTCODER_API_KEY not configured"

**Solution:** Set environment variable in `.env.development`:
```bash
POSTCODER_API_KEY=your_api_key_here
```

### Issue: "Address lookup failed: Timeout"

**Solution:**
- Check internet connection
- Verify API key is valid
- Check Postcoder API status

### Issue: Cache not working (always cache miss)

**Solution:**
- Verify database migrations applied
- Check `CachedAddress` table exists
- Verify postcodes match exactly (uppercase, no spaces)
- Check cache expiration (7 days)

### Issue: Slow responses on cache hits

**Solution:**
- Check database indexes on `postcode` and `expires_at`
- Verify Django database connection pooling
- Run `python manage.py migrate` to ensure indexes applied

## Test Data Cleanup

After testing, clean up test data:

```python
# Django shell
python manage.py shell

from address_cache.models import CachedAddress
from address_analytics.models import AddressLookupLog

# Delete all test data
CachedAddress.objects.all().delete()
AddressLookupLog.objects.all().delete()
```

## Automated Test Suite

To run the full automated test suite:

```bash
cd backend/django_Admin3

# Run all postcoder tests (117 tests)
python manage.py test utils.services.tests utils.tests.test_postcoder_views utils.tests.test_postcoder_integration --keepdb

# Run only integration tests (12 tests)
python manage.py test utils.tests.test_postcoder_integration --keepdb

# Run with verbose output
python manage.py test utils.tests.test_postcoder_integration --keepdb -v 2
```

## Success Criteria

The feature is working correctly when:

✅ First request shows cache miss and calls API
✅ Second request shows cache hit and doesn't call API
✅ Cache hit is ~50x faster than cache miss
✅ Database entries created correctly
✅ Hit count increments on cache hits
✅ Cache expires after 7 days
✅ Invalid postcodes return proper errors
✅ Response format matches getaddress.io
✅ All 117 automated tests pass

## Next Steps

After successful manual testing:

1. Test on staging environment with production API key
2. Monitor cache hit rates in production
3. Set up alerts for API errors
4. Review performance metrics
5. Consider cache warming for popular postcodes

---

**Questions or Issues?**
Check the Django logs for detailed error messages and consult the automated test suite for expected behavior.
