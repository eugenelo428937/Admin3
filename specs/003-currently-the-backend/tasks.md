# Tasks: Hong Kong Address Lookup Service Integration

**Feature**: 003-currently-the-backend
**Input**: Design documents from `/Users/work/Documents/Code/Admin3/specs/003-currently-the-backend/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/address-lookup-hk-api.md, quickstart.md

---

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Tech stack: Django 5.2.2 (backend), React 19.1 (frontend)
   → Structure: Web app (backend/ + frontend/)
2. Load optional design documents ✓
   → data-model.md: No new entities (reuses UserProfile)
   → contracts/: 1 API contract (address-lookup-hk-api.md)
   → research.md: HK ALS API integration decisions
   → quickstart.md: 5 test scenarios
3. Generate tasks by category:
   → Setup: Review existing pattern, create test fixtures
   → Tests: Backend contract tests (4), frontend hook tests (2), integration tests (3)
   → Core: Backend endpoint implementation, frontend hook + component
   → Integration: Validation logic, error handling, URL routing
   → Polish: Edge cases, performance, documentation
4. Apply task rules:
   → Contract tests [P] = different test files
   → Backend implementation = sequential (same views.py)
   → Frontend hook + component = parallel [P]
5. Number tasks sequentially (T001-T032)
6. TDD ordering enforced (tests before implementation)
```

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- TDD Stage markers: RED (test fails) → GREEN (test passes) → REFACTOR

---

## Path Conventions
**Backend**: `/Users/work/Documents/Code/Admin3/backend/django_Admin3/`
**Frontend**: `/Users/work/Documents/Code/Admin3/frontend/react-Admin3/`

---

## Phase 3.1: Setup & Preparation

- [ ] **T001** Review existing UK address lookup implementation pattern
  - **File**: `backend/django_Admin3/utils/views.py` (read-only)
  - **TDD Stage**: N/A (research task)
  - **Dependencies**: None
  - **Description**: Study `address_lookup_proxy()` function to understand request/response pattern, error handling, timeout settings (10s), API key management from Django settings, and JSON response format. Document pattern for replication in HK endpoint.
  - **Acceptance**: Summary documented of UK pattern: request parameters, API call structure, error handling, response transformation

- [ ] **T002** [P] Create test fixtures for HK ALS API mocking
  - **File**: `backend/django_Admin3/utils/tests/fixtures/hk_als_responses.py`
  - **TDD Stage**: N/A (test infrastructure)
  - **Dependencies**: None
  - **Description**: Create mock HK ALS API responses (success, error, timeout, no results) as Python constants. Include example 2D address (commercial building) and 3D address (residential estate with flat/floor). Use data from data-model.md examples.
  - **Acceptance**: Fixture file contains: `HK_ALS_SUCCESS_2D`, `HK_ALS_SUCCESS_3D`, `HK_ALS_ERROR_500`, `HK_ALS_NO_RESULTS`, `HK_ALS_TIMEOUT`

---

## Phase 3.2: Backend Contract Tests (TDD RED) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [ ] **T003** [P] Contract test: Successful address search returns 200 with addresses
  - **File**: `backend/django_Admin3/utils/tests/test_address_lookup_hk.py`
  - **TDD Stage**: RED (test must fail - endpoint doesn't exist yet)
  - **Dependencies**: T002 (fixtures)
  - **Description**: Create Django APITestCase contract test that verifies `GET /api/utils/address-lookup-hk/?search_text=central` returns HTTP 200 with JSON structure: `{addresses: [...], total: int, search_text: str}`. Mock HK ALS API call to return `HK_ALS_SUCCESS_2D` fixture.
  - **Acceptance**: Test written, runs, and FAILS with 404 or NoReverseMatch (endpoint not implemented yet)

- [ ] **T004** [P] Contract test: Missing search_text parameter returns 400 with allow_manual
  - **File**: `backend/django_Admin3/utils/tests/test_address_lookup_hk.py` (same file as T003)
  - **TDD Stage**: RED
  - **Dependencies**: T002
  - **Description**: Create test that verifies `GET /api/utils/address-lookup-hk/` (no search_text) returns HTTP 400 with `{error: str, allow_manual: true}`. Test parameter validation requirement from contract.
  - **Acceptance**: Test written, runs, and FAILS (endpoint doesn't exist)

- [ ] **T005** [P] Contract test: HK ALS service unavailable returns 500 with allow_manual
  - **File**: `backend/django_Admin3/utils/tests/test_address_lookup_hk.py` (same file as T003-T004)
  - **TDD Stage**: RED
  - **Dependencies**: T002
  - **Description**: Create test that mocks HK ALS API to raise `requests.exceptions.Timeout`. Verify endpoint returns HTTP 500 with `{error: "Address lookup service temporarily unavailable", allow_manual: true, details: ...}`.
  - **Acceptance**: Test written, runs, and FAILS (endpoint doesn't exist)

- [ ] **T006** [P] Contract test: Address object structure validation
  - **File**: `backend/django_Admin3/utils/tests/test_address_lookup_hk.py` (same file as T003-T005)
  - **TDD Stage**: RED
  - **Dependencies**: T002
  - **Description**: Create test that verifies each address object in response contains required fields: `building`, `street`, `district`, `region`, `formatted_address`, `is_3d` (all present, correct types). Use `HK_ALS_SUCCESS_2D` and `HK_ALS_SUCCESS_3D` fixtures to test both address types.
  - **Acceptance**: Test written, runs, and FAILS (endpoint doesn't exist)

- [ ] **T007** Verify all backend contract tests FAIL
  - **File**: N/A (verification step)
  - **TDD Stage**: RED confirmation
  - **Dependencies**: T003, T004, T005, T006
  - **Description**: Run `python manage.py test utils.tests.test_address_lookup_hk -v 2` and verify all 4 contract tests fail with 404/NoReverseMatch or similar error indicating endpoint doesn't exist. Do NOT proceed to Phase 3.3 until all tests fail.
  - **Acceptance**: Command output shows 4 tests run, 4 failures, 0 passes

---

## Phase 3.3: Backend Implementation (TDD GREEN)

**Only proceed after T007 confirms all tests fail**

- [ ] **T008** Add HK ALS API URL to Django settings
  - **File**: `backend/django_Admin3/django_Admin3/settings.py`
  - **TDD Stage**: GREEN (supporting task)
  - **Dependencies**: T007
  - **Description**: Add `HK_ALS_API_URL = 'https://www.als.gov.hk/lookup'` to Django settings. Add optional `HK_ALS_API_KEY` setting (default empty string). Follow existing pattern from `GETADDRESS_API_KEY`.
  - **Acceptance**: Settings added, can be imported via `from django.conf import settings`

- [ ] **T009** Implement HK ALS API integration helper function
  - **File**: `backend/django_Admin3/utils/hk_als_helper.py` (new file)
  - **TDD Stage**: GREEN
  - **Dependencies**: T008
  - **Description**: Create `call_hk_als_api(search_text)` function that calls HK ALS API with 10-second timeout. Create `parse_hk_als_response(api_response)` function that transforms HK ALS JSON structure to contract format (addresses array with building, street, district, region, formatted_address, is_3d fields). Handle 2D vs 3D address detection.
  - **Acceptance**: Helper functions created, can be imported and called (not yet integrated into view)

- [ ] **T010** Implement address_lookup_proxy_hk Django view
  - **File**: `backend/django_Admin3/utils/views.py`
  - **TDD Stage**: GREEN
  - **Dependencies**: T009
  - **Description**: Create `address_lookup_proxy_hk(request)` function decorated with `@csrf_exempt` and `@require_GET`. Validate `search_text` parameter (required, 2-200 chars). Call HK ALS helper functions. Return JSON response matching contract. Handle exceptions (timeout, connection errors) and return 500 with `allow_manual=true`. Mirror UK `address_lookup_proxy` pattern.
  - **Acceptance**: View function implemented in views.py

- [ ] **T011** Configure URL routing for /api/utils/address-lookup-hk/
  - **File**: `backend/django_Admin3/utils/urls.py` (or main urls.py)
  - **TDD Stage**: GREEN
  - **Dependencies**: T010
  - **Description**: Add URL pattern `path('api/utils/address-lookup-hk/', views.address_lookup_proxy_hk, name='address_lookup_hk')` to Django urlpatterns. Verify route resolves correctly.
  - **Acceptance**: URL routing configured, can access endpoint (may return error if not fully implemented)

- [ ] **T012** Run backend contract tests and verify they PASS
  - **File**: N/A (verification step)
  - **TDD Stage**: GREEN confirmation
  - **Dependencies**: T011
  - **Description**: Run `python manage.py test utils.tests.test_address_lookup_hk -v 2 --keepdb`. Verify all 4 contract tests (T003-T006) now PASS. If any fail, debug and fix implementation before proceeding.
  - **Acceptance**: Command output shows 4 tests run, 0 failures, 4 passes

---

## Phase 3.4: Frontend Hook Tests (TDD RED)

- [ ] **T013** [P] Create useHKAddressLookup hook test file
  - **File**: `frontend/react-Admin3/src/hooks/__tests__/useHKAddressLookup.test.js`
  - **TDD Stage**: RED
  - **Dependencies**: None
  - **Description**: Create Jest test suite for `useHKAddressLookup` hook. Mock axios. Test cases: (1) successful API call populates addresses state, (2) error response sets error state and allow_manual flag, (3) loading state toggled correctly. Use `renderHook` from React Testing Library.
  - **Acceptance**: Test file created, tests written, run and FAIL (hook doesn't exist)

- [ ] **T014** [P] Create HK address search component test file
  - **File**: `frontend/react-Admin3/src/components/Address/__tests__/HKAddressSearch.test.js`
  - **TDD Stage**: RED
  - **Dependencies**: None
  - **Description**: Create Jest test for `HKAddressSearch` component (or updated `SmartAddressInput`). Test: (1) renders search input and button, (2) triggers search on button click, (3) displays address results list, (4) handles address selection and calls onSelect callback, (5) shows error message when service unavailable.
  - **Acceptance**: Test file created, tests written, run and FAIL (component doesn't exist or not updated)

- [ ] **T015** Verify frontend tests FAIL
  - **File**: N/A (verification step)
  - **TDD Stage**: RED confirmation
  - **Dependencies**: T013, T014
  - **Description**: Run `npm test -- --testPathPattern=HKAddress` from frontend directory. Verify tests fail (hook/component not implemented). Do NOT proceed until confirmed failing.
  - **Acceptance**: Test output shows failures for missing hook and component

---

## Phase 3.5: Frontend Implementation (TDD GREEN)

- [ ] **T016** [P] Implement useHKAddressLookup React hook
  - **File**: `frontend/react-Admin3/src/hooks/useHKAddressLookup.js`
  - **TDD Stage**: GREEN
  - **Dependencies**: T015
  - **Description**: Create custom hook that manages HK address lookup state (addresses, loading, error, allowManual). Implement `searchAddresses(searchText)` function that calls backend API via axios GET `/api/utils/address-lookup-hk/`. Handle success (populate addresses), error (set error + allowManual flag), loading states. Return hook interface for components.
  - **Acceptance**: Hook created, T013 tests now PASS

- [ ] **T017** Update UserFormWizard to support HK address lookup
  - **File**: `frontend/react-Admin3/src/components/User/UserFormWizard.js`
  - **TDD Stage**: GREEN
  - **Dependencies**: T016
  - **Description**: Import `useHKAddressLookup` hook. Add conditional rendering: when `country === "Hong Kong"` for home or work address, show HK address search UI instead of UK lookup. Add search input field, search button, results dropdown/list. Wire up `handleAddressSelect` to populate form fields (building, address, district, county, city, country). Disable lookup UI if `allowManual` is true (service unavailable).
  - **Acceptance**: Component updated, HK address lookup UI appears when Hong Kong selected

- [ ] **T018** [P] Implement address auto-population on selection
  - **File**: `frontend/react-Admin3/src/components/User/UserFormWizard.js` (same file as T017)
  - **TDD Stage**: GREEN
  - **Dependencies**: T017
  - **Description**: Implement `handleAddressSelect(selectedAddress)` function that maps selected address object to form fields: `building`, `address` (street), `district`, `county` (region), `city` ("Hong Kong"), `country` ("Hong Kong"), `postal_code` (empty), `state` (empty). Set validation mode flag to "strict". Update both home and work address sections.
  - **Acceptance**: Clicking an address result populates all form fields correctly

- [ ] **T019** Run frontend tests and verify they PASS
  - **File**: N/A (verification step)
  - **TDD Stage**: GREEN confirmation
  - **Dependencies**: T016, T017, T018
  - **Description**: Run `npm test -- --testPathPattern=HKAddress --coverage --watchAll=false`. Verify all tests in T013 and T014 now PASS. Check coverage meets 80%+ for new hook and component changes.
  - **Acceptance**: Test output shows all tests passing, coverage ≥80%

---

## Phase 3.6: Validation Logic Implementation

- [ ] **T020** Implement strict validation for lookup-selected addresses (FR-016)
  - **File**: `frontend/react-Admin3/src/components/User/UserFormWizard.js` OR `backend/django_Admin3/users/serializers.py` (backend validation)
  - **TDD Stage**: GREEN
  - **Dependencies**: T018
  - **Description**: Add validation logic that checks if address was selected from lookup (validation mode = "strict"). For strict mode, require ALL address fields to be populated: building, district, country. Reject form submission if any required field is missing. Display error message "All fields required for selected addresses".
  - **Acceptance**: Form validation rejects incomplete lookup-selected addresses

- [ ] **T021** Implement basic validation for manual entry addresses (FR-017)
  - **File**: `frontend/react-Admin3/src/components/User/UserFormWizard.js` OR `backend/django_Admin3/users/serializers.py`
  - **TDD Stage**: GREEN
  - **Dependencies**: T020
  - **Description**: Add validation logic for manual entry (validation mode = "basic" or lookup service unavailable). For basic mode, require only essential fields: building OR address, district, country. Allow submission with optional fields empty (county, city, postal_code, state). Display less restrictive error messages.
  - **Acceptance**: Form accepts manually entered addresses with only essential fields filled

- [ ] **T022** Add validation mode tracking in form state
  - **File**: `frontend/react-Admin3/src/components/User/UserFormWizard.js`
  - **TDD Stage**: GREEN
  - **Dependencies**: T021
  - **Description**: Add `validationMode` state variable (values: "strict", "basic"). Set to "strict" when address selected from lookup. Set to "basic" when user manually types (or service unavailable). Use mode to determine which validation rules to apply on form submission.
  - **Acceptance**: Validation mode tracked correctly, different rules applied based on mode

---

## Phase 3.7: Integration Tests (End-to-End)

- [ ] **T023** [P] Integration test: New user registration with HK address (Scenario 1)
  - **File**: `backend/django_Admin3/users/tests/test_registration_hk.py` OR frontend integration test
  - **TDD Stage**: GREEN (integration validation)
  - **Dependencies**: T012, T019, T022
  - **Description**: Create integration test that simulates full user registration flow with HK home address. Test: (1) Select HK as country, (2) Search for address, (3) Select from results, (4) Verify form auto-populated, (5) Submit registration, (6) Verify user created in DB with HK address saved. Mock HK ALS API. Based on quickstart.md Scenario 1.
  - **Acceptance**: Integration test passes, user registration with HK address works end-to-end

- [ ] **T024** [P] Integration test: Mixed country addresses (UK home + HK work) (Scenario 2)
  - **File**: `backend/django_Admin3/users/tests/test_mixed_country_addresses.py`
  - **TDD Stage**: GREEN
  - **Dependencies**: T012, T019
  - **Description**: Create integration test that verifies user can have UK home address + HK work address simultaneously. Test: (1) Create user with UK home address, (2) Update work address to HK using lookup, (3) Verify both addresses saved independently, (4) Verify no cross-contamination between address types. Based on quickstart.md Scenario 2.
  - **Acceptance**: Integration test passes, mixed country addresses work (FR-003)

- [ ] **T025** [P] Integration test: Manual entry fallback when service unavailable (Scenario 3)
  - **File**: `backend/django_Admin3/users/tests/test_hk_manual_entry.py`
  - **TDD Stage**: GREEN
  - **Dependencies**: T012, T019, T021
  - **Description**: Create integration test that simulates HK ALS API unavailability. Test: (1) Mock API to raise timeout, (2) Verify lookup disabled with error message, (3) User enters address manually, (4) Verify basic validation applied (only essential fields required), (5) Verify form submission succeeds. Based on quickstart.md Scenario 3.
  - **Acceptance**: Integration test passes, manual entry works when service unavailable (FR-015)

---

## Phase 3.8: Edge Cases & Polish

- [ ] **T026** [P] Handle 3D vs 2D address display formatting
  - **File**: `frontend/react-Admin3/src/components/Address/AddressFormatter.js` (new helper) or inline in UserFormWizard
  - **TDD Stage**: REFACTOR
  - **Dependencies**: T018
  - **Description**: Implement logic to differentiate 3D addresses (residential estates with flat/floor) vs 2D addresses (commercial buildings). For 3D addresses (`is_3d: true`), format building field as "Flat X, Floor Y, Block Z, [Estate Name]". For 2D addresses, format as "[Building Number] [Building Name]". Display formatted_address in selection dropdown.
  - **Acceptance**: Both 3D and 2D addresses display correctly in UI (FR-011)

- [ ] **T027** [P] Add loading states and search debouncing (if needed)
  - **File**: `frontend/react-Admin3/src/components/User/UserFormWizard.js`
  - **TDD Stage**: REFACTOR
  - **Dependencies**: T017
  - **Description**: Add loading spinner/indicator during HK address search (while API call in progress). If autocomplete is added in future, implement 300ms debounce on search input using `lodash.debounce` or custom hook. For now, ensure clear loading feedback for button-triggered search.
  - **Acceptance**: Loading indicator shows during search, disappears when results loaded

- [ ] **T028** Test with real HK ALS API (staging environment)
  - **File**: N/A (manual testing task)
  - **TDD Stage**: N/A (validation)
  - **Dependencies**: T012, T019
  - **Description**: Deploy to staging environment. Remove mock fixtures. Test with real HK ALS API endpoint `https://www.als.gov.hk/lookup`. Search for real HK addresses: "central government", "mei foo sun chuen", "tsim sha tsui". Verify: (1) API responds within 2 seconds, (2) Results formatted correctly, (3) Both 2D and 3D addresses work, (4) Error handling works if API times out.
  - **Acceptance**: Real API integration works, addresses returned and selectable

---

## Phase 3.9: Documentation & Deployment

- [ ] **T029** Update API documentation with HK endpoint
  - **File**: `docs/api.md` OR `backend/django_Admin3/README.md`
  - **TDD Stage**: N/A (documentation)
  - **Dependencies**: T012
  - **Description**: Add documentation for `/api/utils/address-lookup-hk/` endpoint. Include: request format (query parameters), response structure, error codes (400, 500), example requests/responses, authentication requirements (none). Link to contract specification in specs/003-currently-the-backend/contracts/.
  - **Acceptance**: API documentation updated with HK endpoint details

- [ ] **T030** Run quickstart.md validation tests
  - **File**: `specs/003-currently-the-backend/quickstart.md`
  - **TDD Stage**: N/A (manual validation)
  - **Dependencies**: T028
  - **Description**: Execute all 5 test scenarios from quickstart.md manually or via automated test suite: (1) New user registration with HK address, (2) Mixed country addresses, (3) Manual entry fallback, (4) 3D vs 2D addresses, (5) Validation modes. Check all acceptance criteria. Mark each scenario as PASS/FAIL in quickstart.md.
  - **Acceptance**: All 5 scenarios pass, acceptance criteria met

- [ ] **T031** Verify UK address lookup not disrupted (FR-002)
  - **File**: N/A (regression testing)
  - **TDD Stage**: N/A (validation)
  - **Dependencies**: T012, T019
  - **Description**: Test existing UK address lookup functionality to ensure no regression. Test: (1) Select UK as country, (2) Enter UK postcode, (3) Verify UK lookup still works, (4) Verify no errors or interference from HK implementation. Run existing UK address lookup tests if available.
  - **Acceptance**: UK address lookup works exactly as before, no disruption

- [ ] **T032** Create deployment checklist and merge to main
  - **File**: `specs/003-currently-the-backend/deployment-checklist.md`
  - **TDD Stage**: N/A (deployment prep)
  - **Dependencies**: T030, T031
  - **Description**: Create deployment checklist: (1) All tests passing (backend + frontend), (2) Quickstart scenarios validated, (3) UK lookup regression test passed, (4) Environment variables set (HK_ALS_API_URL, optional API key), (5) Database migrations (none needed), (6) Frontend build succeeds, (7) Staging deployment tested. Prepare for merge to main branch and production deployment.
  - **Acceptance**: Deployment checklist complete, ready for production deployment

---

## Dependencies Graph

```
Setup Phase:
T001 (Review UK pattern) → [Research completed]
T002 (Create fixtures) → [Parallel, no dependencies]

Backend Contract Tests (RED):
T002 → T003, T004, T005, T006 (all parallel) → T007 (verify FAIL)

Backend Implementation (GREEN):
T007 → T008 (settings) → T009 (helper) → T010 (view) → T011 (URL routing) → T012 (verify PASS)

Frontend Tests (RED):
T013, T014 (parallel) → T015 (verify FAIL)

Frontend Implementation (GREEN):
T015 → T016 (hook, parallel with T017)
T015 → T017 (component update) → T018 (auto-populate) → T019 (verify PASS)

Validation:
T018 → T020 (strict validation) → T021 (basic validation) → T022 (mode tracking)

Integration Tests:
T012 + T019 + T022 → T023, T024, T025 (all parallel)

Polish:
T018 → T026 (3D/2D formatting, parallel)
T017 → T027 (loading states, parallel)
T012 + T019 → T028 (real API test)

Documentation:
T012 → T029 (API docs, parallel)
T028 → T030 (quickstart validation)
T012 + T019 → T031 (UK regression, parallel)
T030 + T031 → T032 (deployment checklist)
```

---

## Parallel Execution Examples

### Backend Contract Tests (T003-T006)
All can run in parallel - different test methods in same file:
```bash
# Run backend contract tests concurrently
python manage.py test utils.tests.test_address_lookup_hk.test_successful_search &
python manage.py test utils.tests.test_address_lookup_hk.test_missing_search_text &
python manage.py test utils.tests.test_address_lookup_hk.test_service_unavailable &
python manage.py test utils.tests.test_address_lookup_hk.test_address_structure &
wait
```

### Frontend Implementation (T016 + T017)
Hook and component update can start in parallel:
```javascript
// Terminal 1: Implement hook
// Edit: frontend/react-Admin3/src/hooks/useHKAddressLookup.js

// Terminal 2: Update component (simultaneously)
// Edit: frontend/react-Admin3/src/components/User/UserFormWizard.js
```

### Integration Tests (T023-T025)
All integration tests are independent:
```bash
# Run integration tests in parallel
python manage.py test users.tests.test_registration_hk &
python manage.py test users.tests.test_mixed_country_addresses &
python manage.py test users.tests.test_hk_manual_entry &
wait
```

### Polish Tasks (T026-T029)
Documentation and edge case handling can run in parallel:
```
T026 (3D/2D formatting)  \
T027 (loading states)     } - All independent tasks
T029 (API docs)          /
```

---

## Task Execution Notes

### TDD Workflow (Strict)
1. **RED Phase** (T003-T006, T013-T014): Write tests, verify they FAIL
2. **GREEN Phase** (T008-T012, T016-T019): Implement code, verify tests PASS
3. **REFACTOR Phase** (T020-T028): Improve code quality, tests stay GREEN

### File Modification Conflicts
**Sequential (No [P])**:
- T010 & T018: Both modify `UserFormWizard.js` - must be sequential
- T020 & T021: Same file (validation logic) - sequential

**Parallel [P]**:
- T003-T006: Same test file, but different test methods - can run parallel
- T013 & T014: Different test files - parallel
- T016 & T017: Different files (hook vs component) - parallel
- T023-T025: Different integration test files - parallel

### Commit Strategy
- Commit after each GREEN task (tests passing)
- Commit message format: `feat(hk-address): [Task ID] [Description]`
- Example: `feat(hk-address): T010 Implement HK address lookup view`

### Performance Targets
- Backend API response: < 2 seconds (including HK ALS API call)
- Frontend debounce: 300ms (if autocomplete added)
- Tests runtime: All backend tests < 10 seconds, all frontend tests < 30 seconds

---

## Validation Checklist
*GATE: Verify before marking feature complete*

- [x] All contracts have corresponding tests (T003-T006 for address-lookup-hk-api.md)
- [x] All entities have model tasks (N/A - reuses existing UserProfile)
- [x] All tests come before implementation (Phase 3.2 before 3.3, Phase 3.4 before 3.5)
- [x] Parallel tasks truly independent (verified via dependencies graph)
- [x] Each task specifies exact file path (all tasks have File: field)
- [x] No task modifies same file as another [P] task (conflicts documented)
- [x] TDD stages marked (RED, GREEN, REFACTOR)
- [x] Integration tests cover all quickstart scenarios (T023-T025)
- [x] Regression test for UK lookup (T031)

---

## Summary

**Total Tasks**: 32
**Parallel Tasks**: 16 (marked with [P])
**Estimated Completion**: 6-8 days (assuming 4-5 tasks per day with testing)

**Phase Breakdown**:
- Setup: 2 tasks
- Backend Tests (RED): 5 tasks (4 tests + 1 verify)
- Backend Implementation (GREEN): 5 tasks
- Frontend Tests (RED): 3 tasks (2 tests + 1 verify)
- Frontend Implementation (GREEN): 4 tasks
- Validation Logic: 3 tasks
- Integration Tests: 3 tasks
- Polish: 3 tasks
- Documentation & Deployment: 4 tasks

**Critical Path**: T001 → T002 → T003-T006 → T007 → T008 → T009 → T010 → T011 → T012 → T016 → T017 → T018 → T019 → T022 → T030 → T032

**Ready for Execution**: ✅ All tasks defined, dependencies mapped, TDD workflow established
