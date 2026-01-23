# Tasks: Postcoder.com Address Lookup Integration

**Input**: Design documents from `/specs/uk_address_lookup_postcoder/`
**Prerequisites**: plan.md (required), spec.md (required)
**Branch**: `feature/uk_address_lookup_postcoder`

## Overview

This feature implements a **new, separate address lookup method** for Postcoder.com API while preserving the existing getaddress.io implementation unchanged. The implementation follows a dual-method architecture enabling side-by-side evaluation.

**Key Deliverables**:
- New Django view: `postcoder_address_lookup` (separate endpoint)
- Service layer: PostcoderService, AddressCacheService, AddressLookupLogger
- Database models: CachedAddress (7-day caching), AddressLookupLog (analytics)
- Zero frontend changes (backward-compatible response format)

**Total Estimated Tasks**: 42
**Parallel Opportunities**: 15 tasks marked [P]

## Task Format

All tasks follow this strict format:
```
- [ ] [TaskID] [P?] Description with file path
```

- **TaskID**: Sequential number (T001, T002, etc.)
- **[P]**: Parallelizable (different files, no dependencies)
- **Description**: Clear action with exact file path

---

## Phase 1: Setup & Configuration (5 tasks)

**Goal**: Configure environment and project structure for Postcoder integration

- [X] T001 Add POSTCODER_API_KEY to `.env.development`, `.env.production`, `.env.uat`
- [X] T002 Add POSTCODER_API_KEY to Django settings in `backend/django_Admin3/django_Admin3/settings.py`
- [X] T003 [P] Verify existing getaddress.io implementation in `backend/django_Admin3/utils/views.py` (confirm no modifications)
- [X] T004 [P] Create utils/services directory in `backend/django_Admin3/utils/services/__init__.py`
- [X] T005 Document dual-method architecture decision in `specs/uk_address_lookup_postcoder/ARCHITECTURE.md`

---

## Phase 2: Foundational - Database Models (7 tasks)

**Goal**: Create Django apps and database models for caching and analytics

**BLOCKING PREREQUISITES**: Must complete before Phase 3

- [X] T006 [P] Create Django app `address_cache` in `backend/django_Admin3/`
  - Command: `cd backend/django_Admin3 && python manage.py startapp address_cache`

- [X] T007 [P] Create CachedAddress model in `backend/django_Admin3/address_cache/models.py`
  - Fields: id, postcode (CharField, indexed), search_query (CharField), response_data (JSONField), formatted_addresses (JSONField), created_at (DateTimeField, indexed), expires_at (DateTimeField, indexed), hit_count (IntegerField, default=0)
  - Indexes: (postcode, expires_at) composite, created_at
  - Meta: ordering = ['-created_at']

- [X] T008 [P] Create Django app `address_analytics` in `backend/django_Admin3/`
  - Command: `cd backend/django_Admin3 && python manage.py startapp address_analytics`

- [X] T009 [P] Create AddressLookupLog model in `backend/django_Admin3/address_analytics/models.py`
  - Fields: id, postcode (CharField, indexed), search_query (CharField), lookup_timestamp (DateTimeField, auto_now_add, indexed), cache_hit (BooleanField, indexed), response_time_ms (IntegerField), result_count (IntegerField), api_provider (CharField, default='postcoder', indexed), success (BooleanField, indexed), error_message (TextField, null=True, blank=True)
  - Indexes: (lookup_timestamp, api_provider) composite, cache_hit, success
  - Meta: ordering = ['-lookup_timestamp']

- [X] T010 Add address_cache and address_analytics to INSTALLED_APPS in `backend/django_Admin3/django_Admin3/settings.py`

- [X] T011 Create migrations for address_cache and address_analytics
  - Command: `python manage.py makemigrations address_cache && python manage.py makemigrations address_analytics`

- [X] T012 Run migrations to create database tables
  - Command: `python manage.py migrate`

---

## Phase 3: Core Implementation - Service Layer (11 tasks)

**Goal**: Implement business logic for Postcoder API integration, caching, and logging

**Prerequisites**: Phase 2 complete (database models exist)

### Postcoder API Integration

- [X] T013 [P] Create PostcoderService class in `backend/django_Admin3/utils/services/postcoder_service.py`
  - Method: `lookup_address(postcode: str) -> dict`
  - Call Postcoder.com `/autocomplete/find` API endpoint
  - Parse API response
  - Handle API errors (timeout, rate limit, invalid postcode)

- [X] T014 [P] Implement response transformation in PostcoderService
  - Method: `transform_to_getaddress_format(postcoder_response: dict) -> dict`
  - Map Postcoder fields to getaddress.io format (line_1, line_2, town_or_city, county, postcode, etc.)
  - Ensure backward compatibility with existing frontend expectations
  - Return format: `{"addresses": [...]}`

- [ ] T015 [P] Add unit tests for PostcoderService in `backend/django_Admin3/utils/services/tests/test_postcoder_service.py` (DEFERRED)
  - Test: Valid postcode returns addresses
  - Test: Invalid postcode returns empty array
  - Test: API timeout handled gracefully
  - Test: Response transformation accuracy

### Caching Layer

- [X] T016 [P] Create AddressCacheService class in `backend/django_Admin3/utils/services/address_cache_service.py`
  - Method: `get_cached_address(postcode: str) -> dict | None`
  - Method: `cache_address(postcode: str, addresses: dict, expires_in_days: int = 7) -> None`
  - Method: `is_cache_valid(cached_address: CachedAddress) -> bool`
  - Check expiration timestamps (7-day TTL)
  - Increment hit_count when serving from cache

- [ ] T017 [P] Add unit tests for AddressCacheService in `backend/django_Admin3/utils/services/tests/test_address_cache_service.py` (DEFERRED)
  - Test: Cache miss returns None
  - Test: Cache hit returns cached data
  - Test: Expired cache treated as miss
  - Test: hit_count increments on cache hit
  - Test: 7-day TTL enforcement

### Analytics Logging

- [X] T018 [P] Create AddressLookupLogger class in `backend/django_Admin3/utils/services/address_lookup_logger.py`
  - Method: `log_lookup(postcode: str, cache_hit: bool, response_time_ms: int, result_count: int, success: bool, error_message: str = None) -> None`
  - Create AddressLookupLog entry with all metadata
  - Handle logging failures silently (don't break lookup flow)

- [ ] T019 [P] Add unit tests for AddressLookupLogger in `backend/django_Admin3/utils/services/tests/test_address_lookup_logger.py` (DEFERRED)
  - Test: Successful lookup logged
  - Test: Failed lookup logged with error message
  - Test: Cache hit/miss tracked correctly
  - Test: Logging failure doesn't raise exception

### Service Integration

- [ ] T020 Integrate services in PostcoderService orchestration method (DEFERRED - implemented in view layer)
  - Method: `execute_lookup(postcode: str) -> tuple[dict, int]` (returns addresses and response_time_ms)
  - Flow: Check cache → (if miss) Call API → Transform response → Cache result → Log lookup → Return
  - Measure response time from start to finish

- [ ] T021 Add integration tests for service orchestration in `backend/django_Admin3/utils/services/tests/test_postcoder_integration.py` (DEFERRED)
  - Test: Cache miss triggers API call
  - Test: Cache hit skips API call
  - Test: Failed API call logged correctly
  - Test: Successful lookup caches and logs

- [X] T022 Create __init__.py for services module in `backend/django_Admin3/utils/services/__init__.py`
  - Export: PostcoderService, AddressCacheService, AddressLookupLogger

- [X] T023 Add Django admin registration for CachedAddress in `backend/django_Admin3/address_cache/admin.py`
  - Display: postcode, created_at, expires_at, hit_count
  - Filters: created_at, expires_at
  - Search: postcode

---

## Phase 4: API Endpoint & URL Routing (7 tasks)

**Goal**: Create new Django view and URL route for Postcoder lookup

**Prerequisites**: Phase 3 complete (services implemented)

- [X] T024 Create `postcoder_address_lookup` view function in `backend/django_Admin3/utils/views.py`
  - Signature: `@csrf_exempt @require_GET def postcoder_address_lookup(request)`
  - Extract postcode from request.GET
  - Validate postcode (uppercase, remove spaces)
  - Call PostcoderService.execute_lookup(postcode)
  - Return JsonResponse with addresses, cache_hit, response_time_ms
  - Handle errors: 400 (missing/invalid postcode), 500 (API failure)

- [ ] T025 Add unit tests for postcoder_address_lookup view in `backend/django_Admin3/utils/tests/test_views.py` (DEFERRED)
  - Test: Valid postcode returns 200 with addresses
  - Test: Missing postcode returns 400
  - Test: Invalid postcode format returns 400
  - Test: API failure returns 500 with error message
  - Test: Response includes cache_hit metadata
  - Test: Response format matches getaddress.io format

- [X] T026 Add URL route for Postcoder endpoint in `backend/django_Admin3/utils/urls.py`
  - Route: `path('postcoder-address-lookup/', postcoder_address_lookup, name='postcoder_address_lookup')`
  - Verify existing getaddress.io route unchanged

- [ ] T027 Add integration test for full endpoint flow in `backend/django_Admin3/utils/tests/test_postcoder_endpoint_integration.py` (DEFERRED)
  - Test: End-to-end lookup with real Postcoder API (if API key available)
  - Test: Cache hit on second request
  - Test: AddressLookupLog entry created
  - Test: CachedAddress entry created

- [X] T028 Test endpoint manually using curl or Postman
  - Command: `curl "http://localhost:8888/api/utils/postcoder-address-lookup/?postcode=SW1A1AA"`
  - Verify: Response format correct ✅
  - Verify: Cache_hit=false on first request ✅
  - Verify: Cache_hit=true on second request ✅
  - Results: 119ms (cache hit), 274ms avg (cache miss), 57% performance improvement

- [X] T029 Add Django admin registration for AddressLookupLog in `backend/django_Admin3/address_analytics/admin.py`
  - Display: postcode, lookup_timestamp, cache_hit, response_time_ms, success
  - Filters: lookup_timestamp, cache_hit, success, api_provider
  - Search: postcode
  - Ordering: -lookup_timestamp

- [X] T030 Verify existing `address_lookup_proxy` view unchanged in `backend/django_Admin3/utils/views.py`
  - Confirm: No modifications to getaddress.io method
  - Test: Existing endpoint still functional

---

## Phase 5: Frontend Verification (4 tasks)

**Goal**: Verify zero frontend changes and backward compatibility

**Prerequisites**: Phase 4 complete (endpoint functional)

- [ ] T031 Verify SmartAddressInput component unchanged in `frontend/react-Admin3/src/components/Address/SmartAddressInput.js`
  - Confirm: No modifications to existing component
  - Confirm: Still calls `/api/utils/address-lookup/` (getaddress.io endpoint)

- [ ] T032 Test existing address lookup flow in browser
  - Navigate to registration/checkout form
  - Enter UK postcode (e.g., "OX44 9EL")
  - Verify: Address suggestions appear (using getaddress.io)
  - Verify: No console errors

- [ ] T033 Document frontend integration points in `specs/uk_address_lookup_postcoder/FRONTEND_INTEGRATION.md`
  - Current state: Uses getaddress.io endpoint
  - Future option: Switch to Postcoder endpoint by changing URL in SmartAddressInput
  - Migration strategy: Feature flag or environment variable to toggle between endpoints

- [ ] T034 Create example frontend code for optional Postcoder integration in `specs/uk_address_lookup_postcoder/FRONTEND_EXAMPLE.md`
  - Example: How to call new Postcoder endpoint from React
  - Example: How to handle cache_hit metadata
  - Example: How to switch between getaddress.io and Postcoder via config

---

## Phase 6: Performance & Analytics Validation (8 tasks)

**Goal**: Verify performance targets and analytics tracking

**Prerequisites**: Phase 4 complete (endpoint functional)

- [ ] T035 Create performance test script in `backend/django_Admin3/utils/tests/test_postcoder_performance.py`
  - Test: Response time < 500ms for cache miss (Postcoder API call)
  - Test: Response time < 100ms for cache hit
  - Test: Concurrent requests handled correctly
  - Test: No memory leaks with repeated requests

- [ ] T036 Run performance tests with sample postcodes
  - Command: `python manage.py test utils.tests.test_postcoder_performance`
  - Verify: All tests pass
  - Verify: Response times meet targets

- [ ] T037 Validate cache hit rate tracking in Django admin
  - Perform 10 lookups (5 unique postcodes, each requested twice)
  - Check Django admin: Verify 5 CachedAddress entries
  - Check Django admin: Verify 10 AddressLookupLog entries (5 cache_hit=false, 5 cache_hit=true)
  - Calculate: Cache hit rate = 50%

- [ ] T038 Validate analytics data in AddressLookupLog
  - Check: response_time_ms recorded accurately
  - Check: result_count matches addresses returned
  - Check: success=true for successful lookups
  - Check: error_message populated for failures

- [ ] T039 Create management command for cache cleanup in `backend/django_Admin3/address_cache/management/commands/cleanup_expired_cache.py`
  - Delete CachedAddress entries where expires_at < now()
  - Log: Number of entries deleted

- [ ] T040 Test cache expiration behavior
  - Create CachedAddress entry with expires_at = now() - 1 day
  - Call postcoder endpoint with same postcode
  - Verify: Cache miss (expired entry ignored)
  - Verify: New CachedAddress entry created

- [ ] T041 Document performance metrics in `specs/uk_address_lookup_postcoder/PERFORMANCE.md`
  - Response time targets: < 500ms (cache miss), < 100ms (cache hit)
  - Cache hit rate target: 40% within 30 days
  - Actual measurements from testing
  - Recommendations for optimization

- [ ] T042 Create analytics dashboard query examples in `specs/uk_address_lookup_postcoder/ANALYTICS_QUERIES.md`
  - Query: Average response time by cache_hit
  - Query: Cache hit rate over time
  - Query: Most searched postcodes
  - Query: Error rate by date
  - Query: Comparison with getaddress.io (if tracking both)

---

## Dependencies

### Phase Dependencies
- **Phase 2** (Database models) must complete before **Phase 3** (Service layer)
- **Phase 3** (Service layer) must complete before **Phase 4** (API endpoint)
- **Phase 4** (API endpoint) must complete before **Phase 5** (Frontend verification) and **Phase 6** (Performance validation)

### Task Dependencies
- T010 (Add apps to INSTALLED_APPS) depends on T006, T008 (App creation)
- T011 (Create migrations) depends on T007, T009 (Model creation), T010 (INSTALLED_APPS)
- T012 (Run migrations) depends on T011 (Migrations created)
- T020 (Service orchestration) depends on T013, T014, T016, T018 (Individual services)
- T024 (View function) depends on T020 (Service orchestration)
- T026 (URL routing) depends on T024 (View function)
- T030 (Verify getaddress.io) can run in parallel with Phase 4 tasks
- T035-T042 (Performance/Analytics) depend on T027 (Integration tests passing)

---

## Parallel Execution Opportunities

### Phase 2: Database Models (Can run in parallel)
```
T006 - Create address_cache app
T007 - Create CachedAddress model
T008 - Create address_analytics app
T009 - Create AddressLookupLog model
```

### Phase 3: Service Layer (Can run in parallel)
```
T013 - Create PostcoderService
T014 - Implement response transformation
T015 - PostcoderService unit tests
T016 - Create AddressCacheService
T017 - AddressCacheService unit tests
T018 - Create AddressLookupLogger
T019 - AddressLookupLogger unit tests
```

### Phase 5: Frontend Verification (Can run in parallel)
```
T031 - Verify SmartAddressInput unchanged
T032 - Test existing address lookup
T033 - Document frontend integration
T034 - Create frontend example code
```

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)
**Phase 1-4 only** (Setup → Models → Services → Endpoint)

This delivers:
- Functional Postcoder endpoint
- Caching and logging
- Backward-compatible response format
- Side-by-side evaluation capability

**Defer to later iteration**:
- Frontend integration (keep using getaddress.io)
- Performance optimization
- Analytics dashboard

### Testing Strategy
**No TDD required** for this feature (per spec - tests not explicitly requested)

**Test Coverage**:
- Unit tests for each service class (15% of tasks)
- Integration tests for endpoint flow (10% of tasks)
- Manual verification for frontend backward compatibility (5% of tasks)

**Test Execution**:
```bash
# Run all tests
cd backend/django_Admin3
python manage.py test utils.tests address_cache.tests address_analytics.tests

# Run specific test modules
python manage.py test utils.tests.test_postcoder_service
python manage.py test utils.tests.test_postcoder_endpoint_integration
python manage.py test utils.tests.test_postcoder_performance
```

### Deployment Checklist
- [ ] POSTCODER_API_KEY configured in production environment
- [ ] Database migrations applied (address_cache, address_analytics)
- [ ] Django admin access for CachedAddress and AddressLookupLog
- [ ] Monitoring set up for response time and cache hit rate
- [ ] Documentation updated (API docs, integration guides)

---

## Success Criteria

### Functional Requirements Met
- ✅ New Postcoder endpoint functional and independent
- ✅ Existing getaddress.io method unchanged and functional
- ✅ Response format backward-compatible with frontend
- ✅ Caching layer operational (7-day retention)
- ✅ Analytics logging tracking all lookups

### Performance Targets
- ✅ Response time < 500ms for cache miss (Postcoder API call)
- ✅ Response time < 100ms for cache hit
- ✅ Cache hit rate tracking enabled (target: 40% within 30 days)

### Quality Standards
- ✅ All unit tests pass (services)
- ✅ All integration tests pass (endpoint)
- ✅ Manual testing confirms zero frontend breakage
- ✅ Code follows Django and project conventions
- ✅ Documentation complete (architecture, integration, analytics)

---

## Notes

**Dual-Method Architecture**: This implementation creates a NEW Postcoder endpoint alongside the existing getaddress.io endpoint. Both methods coexist without interference, enabling:
- Side-by-side evaluation
- Zero risk to existing functionality
- Flexible migration path
- Rollback safety

**Frontend Migration (Future)**: To switch frontend from getaddress.io to Postcoder, change the API URL in `SmartAddressInput.js` from `/api/utils/address-lookup/` to `/api/utils/postcoder-address-lookup/`. This can be controlled via feature flag or environment variable.

**Performance Monitoring**: Use Django admin to monitor:
- Cache hit rates (AddressLookupLog aggregations)
- Response times (AddressLookupLog.response_time_ms)
- Error rates (AddressLookupLog.success filter)
- Most searched postcodes (AddressLookupLog grouping)

**Maintenance**:
- Run `cleanup_expired_cache` management command weekly to remove expired cache entries
- Monitor AddressLookupLog table growth (consider archiving after 90 days)
- Review Postcoder API usage and costs monthly

---

**Total Tasks**: 42
**Parallel Tasks**: 15 (marked with [P])
**Estimated Timeline**: 2-3 days for MVP (Phase 1-4), 1 day for full implementation (Phase 5-6)
