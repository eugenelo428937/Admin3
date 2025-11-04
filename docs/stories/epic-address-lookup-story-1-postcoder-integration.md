# Story: Postcoder.com Address Lookup Integration

## Status

Draft

## Story

**As a** user entering my address during registration or checkout,
**I want** fast and accurate UK address suggestions as I type my postcode,
**so that** I can complete my address entry quickly without manual typing and reduce errors.

## Acceptance Criteria

1. System provides real-time address suggestions as users type their postcode or partial address
2. System displays matching UK addresses in a selectable list format below the search input
3. System automatically populates all relevant address fields when a user selects an address from suggestions
4. System allows users to manually enter their address without using the lookup service
5. System provides a clear option to switch from address lookup to manual entry mode
6. System validates that manually entered addresses include all required fields (address line 1, town/city, postcode)
7. System handles lookup service failures gracefully by displaying appropriate error messages and enabling manual entry
8. System preserves the existing user interface and user experience - no changes to frontend UI appearance or layout
9. System supports address lookup specifically for UK addresses only
10. System logs all address lookup attempts including timestamps, postcodes searched, and results returned for analytics
11. System returns address suggestions within 500 milliseconds of user input
12. System caches all successful address lookups for 7 days to improve performance and reduce API costs
13. System ensures cached address data includes expiration timestamps
14. System tracks cache hit rates and API call frequencies for performance monitoring

## Tasks / Subtasks

- [ ] Research and setup (AC: All)
  - [ ] Research Postcoder.com API endpoints and authentication
  - [ ] Research Django caching framework options (Redis vs in-memory vs database)
  - [ ] Research logging infrastructure for GDPR compliance
  - [ ] Map Postcoder.com response format to existing getaddress.io format
  - [ ] Document research findings in `specs/003-number-1-short/research.md`

- [ ] Database schema design (AC: 10, 12, 13, 14)
  - [ ] Create CachedAddress model with postcode, address_data (JSON), created_at, expires_at
  - [ ] Create AddressLookupLog model with timestamp, postcode_searched, results_count, cache_hit, response_time_ms, success, error_message, user_id
  - [ ] Create database migrations for new models
  - [ ] Document data model in `specs/003-number-1-short/data-model.md`

- [ ] Service layer implementation - Address Lookup (AC: 1, 2, 3, 8, 9, 11)
  - [ ] Create AddressLookupService class in `backend/django_Admin3/utils/services/address_lookup_service.py`
  - [ ] Implement Postcoder.com API integration (autocomplete/find and autocomplete/retrieve endpoints)
  - [ ] Implement response format transformation (Postcoder → getaddress.io format)
  - [ ] Implement error handling and fallback logic
  - [ ] Write unit tests for AddressLookupService

- [ ] Service layer implementation - Caching (AC: 12, 13, 14)
  - [ ] Create AddressCacheService class in `backend/django_Admin3/cache/services/address_cache_service.py`
  - [ ] Implement cache lookup by postcode
  - [ ] Implement cache storage with 7-day expiration
  - [ ] Implement cache hit rate tracking
  - [ ] Write unit tests for AddressCacheService

- [ ] Service layer implementation - Logging (AC: 10, 14)
  - [ ] Create LookupLoggerService class in `backend/django_Admin3/analytics/services/lookup_logger_service.py`
  - [ ] Implement lookup attempt logging with all required fields
  - [ ] Implement performance metrics collection
  - [ ] Write unit tests for LookupLoggerService

- [ ] Backend view updates (AC: 1-11)
  - [ ] Modify `address_lookup_proxy` view in `backend/django_Admin3/utils/views.py`
  - [ ] Integrate AddressLookupService, AddressCacheService, and LookupLoggerService
  - [ ] Maintain backward-compatible response format
  - [ ] Add comprehensive error handling
  - [ ] Write integration tests for address_lookup_proxy endpoint

- [ ] Configuration and environment (AC: All)
  - [ ] Add POSTCODER_API_KEY to environment variables
  - [ ] Add ADDRESS_CACHE_TTL_DAYS configuration (default: 7)
  - [ ] Add ADDRESS_LOOKUP_TIMEOUT_MS configuration (default: 500)
  - [ ] Configure Django cache backend (Redis or in-memory)
  - [ ] Update `.env.example` with new variables

- [ ] Frontend verification (AC: 8)
  - [ ] Verify SmartAddressInput.js works unchanged with new backend
  - [ ] Verify DynamicAddressForm.js works unchanged
  - [ ] Verify manual entry fallback works
  - [ ] Test error scenarios trigger manual entry mode
  - [ ] Write frontend integration tests

- [ ] Performance validation (AC: 11, 12, 14)
  - [ ] Measure API response times (target < 500ms)
  - [ ] Verify cache hit rates are tracked
  - [ ] Test cache expiration after 7 days
  - [ ] Verify logging performance doesn't impact response time
  - [ ] Document performance test results in `specs/003-number-1-short/quickstart.md`

- [ ] End-to-end testing (AC: All)
  - [ ] Test user types postcode → suggestions appear
  - [ ] Test user selects address → fields auto-populate
  - [ ] Test manual entry fallback
  - [ ] Test API failure scenarios
  - [ ] Test invalid postcode handling
  - [ ] Test cache hit scenario (second lookup)
  - [ ] Verify all acceptance criteria are met

## Dev Notes

### Relevant Source Tree

**Backend**:
```
backend/django_Admin3/
├── utils/
│   ├── views.py                        # MODIFY: address_lookup_proxy function
│   ├── urls.py                         # EXISTING: URL routing unchanged
│   └── services/
│       └── address_lookup_service.py   # NEW: Postcoder API integration
├── cache_models/
│   └── models.py                       # NEW: CachedAddress model
├── analytics/
│   └── models.py                       # NEW: AddressLookupLog model
└── settings/
    └── base.py                         # MODIFY: Add cache configuration
```

**Frontend** (no changes):
```
frontend/react-Admin3/src/
├── components/Address/
│   ├── SmartAddressInput.js            # EXISTING: No changes
│   └── DynamicAddressForm.js           # EXISTING: No changes
└── services/
    └── addressMetadataService.js       # EXISTING: No changes
```

### Current Implementation Details

**Existing Address Lookup**:
- Location: `backend/django_Admin3/utils/views.py`
- Function: `address_lookup_proxy(request, is_test=True)`
- Current API: getaddress.io
- Response format: `{"addresses": [...]}`
- Frontend components: `SmartAddressInput.js`, `DynamicAddressForm.js`

**Key Requirement**: Maintain exact response format for frontend compatibility.

### Postcoder.com API Integration

**API Endpoints**:
1. `/autocomplete/find?api-key={key}&query={postcode}` - Returns suggestions
2. `/autocomplete/retrieve?api-key={key}&id={id}` - Returns full address

**Response Mapping**:
```python
# Postcoder format → getaddress.io format
{
  "line_1": postcoder["line_1"],
  "line_2": postcoder["line_2"],
  "town_or_city": postcoder["posttown"],
  "county": postcoder["county"],
  "postcode": postcoder["postcode"],
  "country": "United Kingdom"
}
```

### Caching Strategy

**Requirements**:
- Cache successful lookups for 7 days
- Store in Django cache framework (Redis preferred, in-memory fallback)
- Track expiration timestamps
- Monitor cache hit rates

**Implementation**:
```python
# Cache key format: f"address_lookup:{postcode_normalized}"
# TTL: 7 days (604800 seconds)
# Data: JSON response from Postcoder
```

### Logging Requirements

**Privacy Compliance**:
- Log postcodes (non-PII in UK)
- Do NOT log full addresses in logs
- Do NOT log personally identifiable information
- Store logs in database for analytics queries

**Required Fields**:
- timestamp (indexed for time-range queries)
- postcode_searched
- results_count
- cache_hit (boolean)
- response_time_ms
- success (boolean)
- error_message (if failed)
- user_id (nullable ForeignKey)

### Performance Targets

- **Response time**: < 500ms (including cache lookup, API call, logging)
- **Cache hit rate**: 40% within 30 days
- **API timeout**: 500ms maximum
- **Logging overhead**: < 10ms

### Testing

**Testing Standards**:

**Test File Locations**:
- Backend unit tests: `backend/django_Admin3/*/tests/test_*.py`
- Backend integration tests: `backend/django_Admin3/*/tests/integration/test_*.py`
- Frontend tests: `frontend/react-Admin3/src/**/__tests__/*.test.js`

**Testing Frameworks**:
- Backend: pytest, Django TestCase
- Frontend: Jest, React Testing Library

**Test Coverage Requirements**:
- Unit tests: All service methods
- Integration tests: Full address lookup flow
- Contract tests: API response format validation
- Performance tests: Response time validation

**Specific Tests Required**:
1. **AddressLookupService**:
   - Test Postcoder API integration
   - Test response transformation
   - Test error handling
   - Test timeout behavior

2. **AddressCacheService**:
   - Test cache hit/miss scenarios
   - Test expiration logic
   - Test cache key normalization

3. **LookupLoggerService**:
   - Test log entry creation
   - Test performance metrics collection
   - Test error logging

4. **address_lookup_proxy view**:
   - Test happy path (cache miss → API call → success)
   - Test cache hit scenario
   - Test API failure → graceful error
   - Test invalid postcode
   - Test response format matches frontend expectations

5. **Frontend integration**:
   - Test SmartAddressInput with new backend
   - Test address selection flow
   - Test manual entry fallback
   - Test error scenarios

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-11-04 | 1.0 | Initial story creation from specification | Claude Code |

## Dev Agent Record

*This section will be populated during implementation*

### Agent Model Used

*TBD*

### Debug Log References

*TBD*

### Completion Notes List

*TBD*

### File List

*TBD*

## QA Results

*This section will be populated after QA review*
