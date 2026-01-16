# Implementation Plan: Postcoder.com Address Lookup Integration

**Branch**: `feature/uk_address_lookup_postcoder` | **Date**: 2025-11-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/uk_address_lookup_postcoder/spec.md`

## Execution Flow (/plan command scope)
```
1. ✅ Load feature spec from Input path
2. ✅ Fill Technical Context
3. ✅ Evaluate Constitution Check section
4. ⏳ Execute Phase 0 → research.md
5. ⏳ Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md update
6. ⏳ Re-evaluate Constitution Check section
7. ⏳ Plan Phase 2 → Describe task generation approach
```

## Summary

This feature creates a **new, separate address lookup method** for Postcoder.com API integration while preserving the existing `address_lookup_proxy` method that uses getaddress.io. The dual-method architecture enables side-by-side evaluation of both API providers without any risk to existing functionality.

**Key Components**:
- New Django view function: `postcoder_address_lookup` (separate from existing `address_lookup_proxy`)
- Service layer for Postcoder API integration with response transformation
- Caching layer (7-day retention) for Postcoder lookups
- Analytics logging for Postcoder method performance monitoring
- Zero frontend changes required (existing UI remains unchanged)

## Technical Context

**Language/Version**: Python 3.14, React 18
**Primary Dependencies**: Django 5.1, Django REST Framework, requests library, Django cache framework
**Storage**: PostgreSQL (Django ORM models for cache and analytics)
**Testing**: pytest (backend), Jest + React Testing Library (frontend verification)
**Target Platform**: Web application (Django backend + React frontend)
**Project Type**: web (frontend + backend structure)
**Performance Goals**: <500ms response time, 40% cache hit rate within 30 days
**Constraints**: Zero frontend UI changes, preserve existing getaddress.io implementation unchanged
**Scale/Scope**: UK address lookups only, dual-method coexistence for evaluation

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Architectural Principles
- ✅ **Separation of Concerns**: New Postcoder method isolated from legacy getaddress.io method
- ✅ **Service Layer Pattern**: Business logic encapsulated in dedicated service classes
- ✅ **Single Responsibility**: Each service handles one concern (API, cache, logging)
- ✅ **Open/Closed Principle**: Adding new method without modifying existing one

### Complexity Gates
- ✅ **No new projects**: Working within existing Django backend structure
- ✅ **No abstract patterns**: Direct, straightforward service implementations
- ✅ **Minimal dependencies**: Using existing Django cache framework and ORM

**Status**: ✅ PASS - Architecture follows constitutional principles

## Project Structure

### Documentation (this feature)
```
specs/uk_address_lookup_postcoder/
├── plan.md              # This file (/plan command output)
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   └── postcoder-address-lookup.json
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root)
```
# Web application structure (Option 2)
backend/django_Admin3/
├── utils/
│   ├── views.py                              # ADD new postcoder_address_lookup view
│   ├── urls.py                               # ADD new URL route
│   └── services/
│       ├── __init__.py                       # NEW
│       ├── postcoder_service.py              # NEW - Postcoder API integration
│       ├── address_cache_service.py          # NEW - Caching layer
│       └── address_lookup_logger.py          # NEW - Analytics logging
├── address_cache/                            # NEW Django app
│   ├── __init__.py
│   ├── models.py                             # NEW - CachedAddress model
│   ├── admin.py                              # NEW - Django admin integration
│   ├── migrations/
│   └── tests/
│       └── test_models.py
└── address_analytics/                        # NEW Django app
    ├── __init__.py
    ├── models.py                             # NEW - AddressLookupLog model
    ├── admin.py                              # NEW - Django admin integration
    ├── migrations/
    └── tests/
        └── test_models.py

tests/
├── contract/
│   └── test_postcoder_address_lookup_contract.py
├── integration/
│   └── test_postcoder_address_lookup.py
└── unit/
    ├── test_postcoder_service.py
    ├── test_address_cache_service.py
    └── test_address_lookup_logger.py

frontend/react-Admin3/
└── src/
    └── components/Address/
        └── SmartAddressInput.js             # NO CHANGES (verification only)
```

**Structure Decision**: Option 2 (Web application) - Django backend + React frontend

## Phase 0: Outline & Research

### Research Tasks

1. **Postcoder.com API Documentation**
   - Endpoint URLs and authentication methods
   - Request/response formats for `/autocomplete/find` and `/autocomplete/retrieve`
   - Rate limits and pricing tiers
   - Error codes and handling patterns
   - **Output**: `research.md` section "Postcoder API Integration"

2. **Response Format Transformation**
   - Map Postcoder response fields to getaddress.io format
   - Ensure backward compatibility with existing frontend expectations
   - Document field mappings and transformations
   - **Output**: `research.md` section "Response Format Mapping"

3. **Django Cache Framework Best Practices**
   - Cache backend options (Redis, Memcached, database)
   - TTL (time-to-live) configuration for 7-day retention
   - Cache key strategies for address lookups
   - Atomic cache operations for thread safety
   - **Output**: `research.md` section "Caching Strategy"

4. **Performance Monitoring Patterns**
   - Metrics to track (response time, cache hit rate, API call frequency)
   - Django middleware for request timing
   - Logging best practices for analytics
   - **Output**: `research.md` section "Performance Monitoring"

5. **Django ORM Models for Time-Series Data**
   - Indexing strategies for timestamp queries
   - Partitioning considerations for large datasets
   - Query optimization for analytics aggregations
   - **Output**: `research.md` section "Data Storage Patterns"

### Unknowns to Resolve
- ✅ Django cache backend configuration (assumption: Redis or database cache)
- ✅ Postcoder API key environment variable naming convention
- ✅ Cache invalidation strategy (assumption: time-based expiration only)
- ✅ Analytics data retention policy (assumption: indefinite retention for evaluation period)

**Output**: `specs/uk_address_lookup_postcoder/research.md` with all technical decisions documented

## Phase 1: Design & Contracts

### Data Model Design (`data-model.md`)

#### Entity: CachedAddress
**Purpose**: Store Postcoder API responses for 7-day caching

**Fields**:
- `id` (AutoField, primary key)
- `postcode` (CharField, max_length=10, indexed)
- `search_query` (CharField, max_length=255) - Original query string
- `response_data` (JSONField) - Full Postcoder API response
- `formatted_addresses` (JSONField) - Transformed response in getaddress.io format
- `created_at` (DateTimeField, auto_now_add, indexed)
- `expires_at` (DateTimeField, indexed) - created_at + 7 days
- `hit_count` (IntegerField, default=0) - Number of times served from cache

**Indexes**:
- Composite index: (postcode, expires_at) for efficient cache lookups
- Index: created_at for cleanup queries

**Validation Rules**:
- postcode must be uppercase alphanumeric
- expires_at must be exactly 7 days after created_at
- response_data and formatted_addresses must be valid JSON

#### Entity: AddressLookupLog
**Purpose**: Track Postcoder API usage for analytics

**Fields**:
- `id` (AutoField, primary key)
- `postcode` (CharField, max_length=10, indexed)
- `search_query` (CharField, max_length=255)
- `lookup_timestamp` (DateTimeField, auto_now_add, indexed)
- `cache_hit` (BooleanField, indexed) - True if served from cache
- `response_time_ms` (IntegerField) - Total response time in milliseconds
- `result_count` (IntegerField) - Number of addresses returned
- `api_provider` (CharField, max_length=20, default='postcoder', indexed)
- `success` (BooleanField, indexed) - True if lookup succeeded
- `error_message` (TextField, null=True, blank=True)

**Indexes**:
- Composite index: (lookup_timestamp, api_provider) for analytics queries
- Index: cache_hit for cache performance analysis
- Index: success for error rate monitoring

**State Transitions**: N/A (append-only log)

### API Contracts (`contracts/postcoder-address-lookup.json`)

#### New Endpoint: POST /api/utils/postcoder-address-lookup/

**Request**:
```json
{
  "postcode": "string (required, UK postcode format)",
  "search_query": "string (optional, additional address search text)"
}
```

**Response (Success - 200 OK)**:
```json
{
  "addresses": [
    {
      "postcode": "string",
      "latitude": "number",
      "longitude": "number",
      "formatted_address": ["string"],
      "line_1": "string",
      "line_2": "string",
      "line_3": "string",
      "line_4": "string",
      "town_or_city": "string",
      "county": "string",
      "country": "string"
    }
  ],
  "cache_hit": "boolean",
  "response_time_ms": "number"
}
```

**Response (Error - 400 Bad Request)**:
```json
{
  "error": "string (error description)",
  "code": "MISSING_POSTCODE | INVALID_POSTCODE"
}
```

**Response (Error - 500 Internal Server Error)**:
```json
{
  "error": "string (error description)",
  "code": "API_ERROR | CACHE_ERROR"
}
```

**Response Format Notes**:
- Response format matches existing getaddress.io format for backward compatibility
- Additional metadata (cache_hit, response_time_ms) included for debugging (can be ignored by frontend)

### Contract Tests

**File**: `tests/contract/test_postcoder_address_lookup_contract.py`

**Test Cases** (TDD - tests written first, expected to fail):
1. `test_postcoder_endpoint_accepts_valid_postcode` - Assert 200 status
2. `test_postcoder_endpoint_returns_addresses_array` - Assert response schema
3. `test_postcoder_endpoint_rejects_missing_postcode` - Assert 400 status
4. `test_postcoder_endpoint_returns_cache_metadata` - Assert cache_hit field present
5. `test_postcoder_endpoint_handles_api_failure_gracefully` - Assert 500 with error message

### Integration Test Scenarios

**File**: `tests/integration/test_postcoder_address_lookup.py`

**Scenarios from User Stories**:
1. **Given** a valid UK postcode, **When** user calls Postcoder endpoint, **Then** matching addresses are returned
2. **Given** a cached postcode, **When** user calls Postcoder endpoint again, **Then** response is served from cache with cache_hit=true
3. **Given** an invalid postcode, **When** user calls Postcoder endpoint, **Then** 400 error is returned
4. **Given** Postcoder API is unavailable, **When** user calls Postcoder endpoint, **Then** 500 error is returned with fallback message

### Quickstart Test (`quickstart.md`)

**Purpose**: Validate feature end-to-end from user perspective

**Steps**:
1. Start Django development server
2. Ensure Postcoder API key is configured in environment
3. Call POST /api/utils/postcoder-address-lookup/ with valid postcode (e.g., "SW1A 1AA")
4. Verify response contains addresses array with expected format
5. Call same endpoint again with same postcode
6. Verify cache_hit=true in response
7. Check Django admin for CachedAddress and AddressLookupLog entries
8. Verify frontend SmartAddressInput still works with existing getaddress.io endpoint (no changes)

### Update CLAUDE.md

**Action**: Run `.specify/scripts/bash/update-agent-context.sh claude`

**Updates**:
- Add Postcoder.com integration to "Address Lookup System" section
- Document dual-method architecture (getaddress.io + Postcoder)
- Add new service layer components (postcoder_service, address_cache_service, address_lookup_logger)
- Add new Django apps (address_cache, address_analytics)
- Update "Common Development Commands" with cache/analytics management commands

**IMPORTANT**: Execute script exactly as specified above with no additional arguments

**Output**: `CLAUDE.md` updated with new technical context (keep under 150 lines)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base
2. Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
3. Order tasks in TDD sequence:
   - Phase 1: Environment setup (API keys, cache configuration)
   - Phase 2: Database models (CachedAddress, AddressLookupLog) [P]
   - Phase 3: Contract tests (write tests first) [P]
   - Phase 4: Service layer implementation (PostcoderService, CacheService, LoggerService) [P]
   - Phase 5: Django view and URL routing
   - Phase 6: Integration tests
   - Phase 7: Frontend verification (ensure no breakage)
   - Phase 8: Performance validation (response time, cache hit rate)

**Ordering Strategy**:
- TDD order: Tests before implementation (contracts → models → services → views)
- Dependency order: Models before services before views
- Mark [P] for parallel execution:
  - Contract tests (independent test files)
  - Database models (independent Django apps)
  - Service layer classes (independent business logic)
- Sequential execution:
  - Views depend on services
  - Integration tests depend on full stack
  - Performance validation depends on deployment

**Estimated Output**: 35-40 numbered, ordered tasks in tasks.md

**Task Format**:
```
- [ ] T001 Add POSTCODER_API_KEY to environment variables (.env files)
- [ ] T002 [P] Create CachedAddress Django model in address_cache/models.py
- [ ] T003 [P] Create AddressLookupLog Django model in address_analytics/models.py
- [ ] T004 [P] Write contract test for Postcoder endpoint (tests/contract/)
- [ ] T005 [P] Implement PostcoderService class (utils/services/postcoder_service.py)
  - Method: lookup_address(postcode: str) -> dict
  - Integrate with Postcoder.com API
  - Transform response to getaddress.io format
- [ ] T006 [P] Implement AddressCacheService class (utils/services/address_cache_service.py)
  - Method: get_cached_address(postcode: str) -> dict | None
  - Method: cache_address(postcode: str, response: dict) -> None
  - 7-day TTL enforcement
```

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md with 35-40 numbered tasks)
**Phase 4**: Implementation (execute tasks.md following TDD and constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, verify performance targets)

**Validation Criteria**:
- All contract tests pass (5 tests)
- All integration tests pass (4 scenarios)
- Quickstart test completes successfully
- Response time < 500ms (cache miss)
- Response time < 100ms (cache hit)
- Zero frontend UI changes verified
- Existing getaddress.io method still functional (regression test)

## Complexity Tracking
*No violations - architecture follows constitutional principles*

## Progress Tracking

**Phase Status**:
- [ ] Phase 0: Research complete (/plan command)
- [ ] Phase 1: Design complete (/plan command)
- [ ] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [ ] Post-Design Constitution Check: PASS (after Phase 1)
- [x] All NEEDS CLARIFICATION resolved (from spec clarifications)
- [x] Complexity deviations documented (none - no violations)

---

**Next Steps**:
1. Execute Phase 0: Research Postcoder API, caching, and performance monitoring patterns
2. Execute Phase 1: Create data-model.md, contracts/, quickstart.md, update CLAUDE.md
3. Re-evaluate Constitution Check after Phase 1 design
4. Ready for `/tasks` command to generate implementation tasks

*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
