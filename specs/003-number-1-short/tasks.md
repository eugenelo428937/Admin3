# Tasks: Postcoder.com Address Lookup Integration

**Input**: Design documents from `/specs/003-number-1-short/`
**Prerequisites**: spec.md, plan.md, story document

## Summary

Replace getaddress.io with Postcoder.com for UK address lookup. Implement caching (7-day retention) and analytics logging. Maintain existing frontend UI (zero changes). Target: < 500ms response time, 40% cache hit rate.

**User Story**: As a user entering my address, I want fast UK address suggestions as I type my postcode, so I can complete address entry quickly without errors.

## Task Organization

This feature is organized as a **single user story** with the following phases:
- Phase 1: Setup & Configuration
- Phase 2: Foundational (Database Models)
- Phase 3: Core Implementation (Services & Integration)
- Phase 4: Testing & Validation

## Phase 1: Setup & Configuration

- [ ] T001 Add POSTCODER_API_KEY to `.env.development`, `.env.production`, `.env.uat`
- [ ] T002 Add ADDRESS_CACHE_TTL_DAYS=7 to environment files
- [ ] T003 Add ADDRESS_LOOKUP_TIMEOUT_MS=500 to environment files
- [ ] T004 Update `.env.example` with new Postcoder configuration variables
- [ ] T005 Configure Django cache backend in `backend/django_Admin3/settings/base.py`

## Phase 2: Foundational - Database Models

**Independent Test Criteria**: Models can be created, saved, queried, and expire correctly.

- [ ] T006 [P] [US1] Create Django app `cache_models` in `backend/django_Admin3/`
- [ ] T007 [P] [US1] Create CachedAddress model in `backend/django_Admin3/cache_models/models.py`
  - Fields: postcode (CharField, indexed), search_query (TextField), address_data (JSONField), created_at (DateTimeField), expires_at (DateTimeField, indexed)
  - Index: (postcode, expires_at)
- [ ] T008 [P] [US1] Create Django app `analytics` in `backend/django_Admin3/`
- [ ] T009 [P] [US1] Create AddressLookupLog model in `backend/django_Admin3/analytics/models.py`
  - Fields: timestamp (DateTimeField, indexed), postcode_searched (CharField), results_count (IntegerField), cache_hit (BooleanField), response_time_ms (IntegerField), success (BooleanField), error_message (TextField, nullable), user_id (ForeignKey User, nullable)
- [ ] T010 Create database migrations for cache_models app
- [ ] T011 Create database migrations for analytics app
- [ ] T012 Apply migrations to development database

## Phase 3: Core Implementation

### 3.1: Service Layer - Address Lookup (AC: 1-3, 8-9, 11)

**Independent Test Criteria**: Postcoder API integration works, response format matches frontend expectations.

- [ ] T013 [P] [US1] Create services directory in `backend/django_Admin3/utils/services/`
- [ ] T014 [US1] Create AddressLookupService class in `backend/django_Admin3/utils/services/address_lookup_service.py`
  - Method: `lookup_address(postcode: str) -> dict`
  - Implement Postcoder `/autocomplete/find` API call
  - Implement Postcoder `/autocomplete/retrieve` API call
  - Transform Postcoder response to getaddress.io format
  - Handle API timeout (500ms)
  - Handle API errors gracefully
- [ ] T015 [P] [US1] Write unit tests for AddressLookupService in `backend/django_Admin3/utils/tests/test_address_lookup_service.py`
  - Test successful lookup
  - Test response format transformation
  - Test API timeout handling
  - Test API error handling
  - Mock Postcoder API responses

### 3.2: Service Layer - Caching (AC: 12-14)

**Independent Test Criteria**: Cache stores/retrieves addresses, expires after 7 days, tracks hit rates.

- [ ] T016 [P] [US1] Create services directory in `backend/django_Admin3/cache_models/services/`
- [ ] T017 [US1] Create AddressCacheService class in `backend/django_Admin3/cache_models/services/address_cache_service.py`
  - Method: `get_cached_address(postcode: str) -> Optional[dict]`
  - Method: `cache_address(postcode: str, address_data: dict, ttl_days: int = 7)`
  - Method: `get_cache_hit_rate() -> float`
  - Implement cache key normalization (uppercase, no spaces)
  - Implement 7-day expiration logic
  - Implement cache hit rate tracking
- [ ] T018 [P] [US1] Write unit tests for AddressCacheService in `backend/django_Admin3/cache_models/tests/test_address_cache_service.py`
  - Test cache miss scenario
  - Test cache hit scenario
  - Test cache expiration
  - Test hit rate calculation

### 3.3: Service Layer - Logging (AC: 10, 14)

**Independent Test Criteria**: Lookup attempts are logged with all required fields, performance metrics collected.

- [ ] T019 [P] [US1] Create services directory in `backend/django_Admin3/analytics/services/`
- [ ] T020 [US1] Create LookupLoggerService class in `backend/django_Admin3/analytics/services/lookup_logger_service.py`
  - Method: `log_lookup(postcode: str, results_count: int, cache_hit: bool, response_time_ms: int, success: bool, error_message: str = None, user_id: int = None)`
  - Method: `get_performance_metrics() -> dict`
  - Implement async logging to avoid blocking
  - Track average response times
  - Track cache hit percentages
- [ ] T021 [P] [US1] Write unit tests for LookupLoggerService in `backend/django_Admin3/analytics/tests/test_lookup_logger_service.py`
  - Test successful lookup logging
  - Test error logging
  - Test performance metrics calculation

### 3.4: View Integration (AC: 1-11)

**Independent Test Criteria**: Endpoint returns addresses in correct format, handles errors, logs attempts, uses cache.

- [ ] T022 [US1] Modify `address_lookup_proxy` view in `backend/django_Admin3/utils/views.py`
  - Import AddressLookupService, AddressCacheService, LookupLoggerService
  - Check cache first (AddressCacheService.get_cached_address)
  - If cache miss: Call AddressLookupService.lookup_address
  - Store result in cache (AddressCacheService.cache_address)
  - Log lookup attempt (LookupLoggerService.log_lookup)
  - Maintain backward-compatible response format: `{"addresses": [...]}`
  - Handle all errors gracefully
  - Return appropriate HTTP status codes
- [ ] T023 [P] [US1] Write integration tests for address_lookup_proxy in `backend/django_Admin3/utils/tests/integration/test_address_lookup_integration.py`
  - Test cache miss → API call → success
  - Test cache hit → fast response
  - Test API failure → error response
  - Test invalid postcode → empty results
  - Test response format matches frontend expectations
  - Test logging is performed
  - Test response time < 500ms

## Phase 4: Testing & Validation

### 4.1: Frontend Verification (AC: 8)

**Independent Test Criteria**: Existing frontend components work unchanged with new backend.

- [ ] T024 [P] [US1] Write frontend integration test in `frontend/react-Admin3/src/components/Address/__tests__/SmartAddressInput.integration.test.js`
  - Test postcode input triggers API call
  - Test suggestions display correctly
  - Test address selection populates fields
  - Test manual entry fallback works
  - Test error scenarios enable manual entry
  - Mock backend API responses

### 4.2: End-to-End Validation (AC: All)

**Independent Test Criteria**: All acceptance criteria are met in realistic scenarios.

- [ ] T025 [US1] Manual test: User types postcode → suggestions appear < 500ms
- [ ] T026 [US1] Manual test: User selects address → fields auto-populate correctly
- [ ] T027 [US1] Manual test: User switches to manual entry → can type freely
- [ ] T028 [US1] Manual test: Simulate API failure → error message + manual entry enabled
- [ ] T029 [US1] Manual test: Invalid postcode → no results message + manual entry
- [ ] T030 [US1] Manual test: Second lookup same postcode → cache hit (< 100ms response)
- [ ] T031 [US1] Verify cache hit rate tracking in database
- [ ] T032 [US1] Verify lookup logging in database with all required fields

### 4.3: Performance & Metrics (AC: 11, 12, 14)

**Independent Test Criteria**: Performance targets met, metrics tracked correctly.

- [ ] T033 [US1] Measure API response times (10 different postcodes, record min/max/avg)
- [ ] T034 [US1] Verify response times < 500ms for cache miss
- [ ] T035 [US1] Verify response times < 100ms for cache hit
- [ ] T036 [US1] Test cache expiration after 7 days (use mock time)
- [ ] T037 [US1] Query cache hit rate from database (should increase over time)
- [ ] T038 [US1] Verify logging overhead < 10ms (measure with/without logging)

### 4.4: Documentation (AC: All)

- [ ] T039 [US1] Document Postcoder API integration in `specs/003-number-1-short/research.md`
- [ ] T040 [US1] Document data models in `specs/003-number-1-short/data-model.md`
- [ ] T041 [US1] Create quickstart validation test in `specs/003-number-1-short/quickstart.md`
- [ ] T042 Update CLAUDE.md with Postcoder integration context

## Dependencies

**Phase Dependencies**:
- Phase 2 (Models) must complete before Phase 3 (Services)
- Phase 3 (Services) must complete before Phase 4 (Testing)

**Task Dependencies**:
- T010-T012 (migrations) depend on T006-T009 (models)
- T014 (AddressLookupService) blocks T015 (tests), T022 (view integration)
- T017 (AddressCacheService) blocks T018 (tests), T022 (view integration)
- T020 (LookupLoggerService) blocks T021 (tests), T022 (view integration)
- T022 (view integration) depends on T014, T017, T020 being complete
- T023 (integration tests) depends on T022 (view integration)
- Phase 4 (all testing tasks) depends on Phase 3 completion

## Parallel Execution Opportunities

**Phase 2 (Models)** - Can run in parallel:
```
- T006: Create cache_models app
- T007: Create CachedAddress model
- T008: Create analytics app
- T009: Create AddressLookupLog model
```

**Phase 3.1-3.3 (Services)** - Can run in parallel:
```
- T013: Create utils/services/ directory
- T016: Create cache_models/services/ directory
- T019: Create analytics/services/ directory
- T015: Write AddressLookupService tests
- T018: Write AddressCacheService tests
- T021: Write LookupLoggerService tests
```

**Phase 4.1 (Frontend Tests)** - Can run in parallel with backend validation:
```
- T024: Frontend integration tests
- T031-T032: Database verification tasks
```

## Implementation Strategy

**MVP Scope** (Minimum Viable Product):
- Phase 1: Setup & Configuration (T001-T005)
- Phase 2: Database Models (T006-T012)
- Phase 3.1-3.4: All service layers + view integration (T013-T023)
- Phase 4.2: Basic end-to-end validation (T025-T030)

**Total Tasks**: 42 tasks
- Setup: 5 tasks
- Models: 7 tasks
- Services: 16 tasks
- Testing: 14 tasks

**Estimated Timeline**:
- Setup: 1 hour
- Models + Migrations: 2 hours
- Service Layer: 6-8 hours
- Testing & Validation: 4-6 hours
**Total: 13-17 hours**

## Format Validation

✅ All tasks follow checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
✅ Task IDs sequential (T001-T042)
✅ [P] markers for parallelizable tasks
✅ [US1] labels for user story tasks
✅ File paths included where applicable
✅ Dependencies documented
✅ Parallel opportunities identified

## Notes

- **No frontend UI changes**: SmartAddressInput.js and DynamicAddressForm.js remain unchanged
- **Backward compatibility**: Response format must match getaddress.io exactly
- **TDD approach**: Write tests before implementation (recommended but not strictly enforced)
- **Incremental delivery**: Can deploy after Phase 3.4 with basic validation
- **Performance monitoring**: Track metrics from day 1 for optimization insights

## Success Metrics

After implementation, verify:
- ✅ Response time < 500ms (cache miss)
- ✅ Response time < 100ms (cache hit)
- ✅ Cache hit rate > 40% within 30 days
- ✅ All 14 acceptance criteria met
- ✅ Zero frontend UI changes required
- ✅ All logging data captured correctly
