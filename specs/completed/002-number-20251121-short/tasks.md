# Tasks: Comprehensive Test Suite Coverage for Django Backend Apps

**Input**: Design documents from `specs/002-number-20251121-short/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/test-patterns.md, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Extract: Python 3.14, Django 5.1, Django unittest, PostgreSQL
2. Load optional design documents ✅:
   → data-model.md: 11 models across 11 apps
   → contracts/test-patterns.md: Standard test contracts
   → research.md: Test framework decisions (Django unittest, component-based files)
3. Generate tasks by category:
   → Setup: Test directory creation, __init__.py files
   → Per-App Tests: Model tests → View tests → Coverage verification
   → Documentation: CLAUDE.md updates, quickstart validation
4. Apply task rules:
   → Different apps = mark [P] for parallel
   → Same app = sequential (setup → tests → validation)
   → Tests follow TDD RED-GREEN pattern
5. Number tasks sequentially (T001-T090)
6. Generate dependency graph (apps are mostly independent)
7. Create parallel execution examples
8. SUCCESS - Tasks ready for execution
```

## Format: `- [ ] [ID] [P?] [Story?] Description with file path`
- **[P]**: Can run in parallel (different files/apps, no dependencies)
- **[Story]**: Maps to user story ([US1], [US2], etc.)
- Include exact file paths in descriptions

## Path Conventions
- **Django backend**: `backend/django_Admin3/app_name/tests/`
- Tests organized by component: `test_models.py`, `test_views.py`, `test_authentication.py`

---

## User Stories from Spec

This feature implements a single primary user story with 5 acceptance scenarios:

**Primary User Story**: As a **developer**, I want **all Django backend apps to have comprehensive test suites** so that I can **ensure code quality, prevent regressions, and maintain confidence when making changes**.

**Acceptance Scenarios**:
- **AS1**: All 20 apps have test directories with test files
- **AS2**: All critical components (models, views, serializers) have test coverage
- **AS3**: New developers can validate environment setup by running tests
- **AS4**: Code changes trigger regression detection via test failures
- **AS5**: Test suites support TDD RED-GREEN-REFACTOR cycle

**Implementation Strategy**: Organize tasks by app complexity (model-only → model+view → authentication) for incremental delivery. Each app's test suite is independently testable.

---

## Phase 1: Setup & Preparation

**Goal**: Create test infrastructure for all 11 apps

### Test Directory Creation (Parallel - Independent Apps)

- [ ] T001 [P] Create tests directory and __init__.py for address_analytics app in backend/django_Admin3/address_analytics/tests/__init__.py
- [ ] T002 [P] Create tests directory and __init__.py for address_cache app in backend/django_Admin3/address_cache/tests/__init__.py
- [ ] T003 [P] Create tests directory and __init__.py for core_auth app in backend/django_Admin3/core_auth/tests/__init__.py
- [ ] T004 [P] Create tests directory and __init__.py for exam_sessions app in backend/django_Admin3/exam_sessions/tests/__init__.py
- [ ] T005 [P] Create tests directory and __init__.py for exam_sessions_subjects app in backend/django_Admin3/exam_sessions_subjects/tests/__init__.py
- [ ] T006 [P] Create tests directory and __init__.py for marking app in backend/django_Admin3/marking/tests/__init__.py
- [ ] T007 [P] Create tests directory and __init__.py for marking_vouchers app in backend/django_Admin3/marking_vouchers/tests/__init__.py
- [ ] T008 [P] Create tests directory and __init__.py for students app in backend/django_Admin3/students/tests/__init__.py
- [ ] T009 [P] Create tests directory and __init__.py for tutorials app in backend/django_Admin3/tutorials/tests/__init__.py
- [ ] T010 [P] Create tests directory and __init__.py for userprofile app in backend/django_Admin3/userprofile/tests/__init__.py
- [ ] T011 [P] Create tests directory and __init__.py for users app in backend/django_Admin3/users/tests/__init__.py

### Verification

- [ ] T012 Verify Django test discovery finds all 11 new test directories via python manage.py test --dry-run

---

## Phase 2: Model-Only Apps (Simple - 5 Apps)

**Goal**: Implement test suites for apps with only models (no views)

**Apps**: address_analytics, address_cache, students, exam_sessions_subjects, marking_vouchers

**Test Pattern**: Model validation tests following contracts/test-patterns.md Model Test Contract

### address_analytics App (AddressLookupLog model)

- [ ] T013 [P] [AS2] Write AddressLookupLog model tests (TDD RED) in backend/django_Admin3/address_analytics/tests/test_models.py
  - Test field validations (postcode max_length, api_provider choices)
  - Test boolean field defaults (cache_hit, success)
  - Test __str__ method formatting
  - Test index creation on lookup_timestamp + api_provider
- [ ] T014 [AS2] Run address_analytics tests and verify failures (TDD RED confirmation)
- [ ] T015 [AS2] Fix any AddressLookupLog model issues discovered by tests (TDD GREEN)
- [ ] T016 [AS3] Verify address_analytics tests pass via python manage.py test address_analytics

### students App (Student model)

- [ ] T017 [P] [AS2] Write Student model tests (TDD RED) in backend/django_Admin3/students/tests/test_models.py
  - Test OneToOne relationship with User (uniqueness constraint)
  - Test choice field validation (student_type: S/Q/I, apprentice_type: none/L4/L7)
  - Test auto timestamp fields (create_date, modified_date)
  - Test __str__ method with user full name
- [ ] T018 [AS2] Run students tests and verify failures (TDD RED confirmation)
- [ ] T019 [AS2] Fix any Student model issues discovered by tests (TDD GREEN)
- [ ] T020 [AS3] Verify students tests pass via python manage.py test students

### address_cache App (Cache models - requires exploration)

- [ ] T021 [P] [AS2] Explore address_cache models in backend/django_Admin3/address_cache/models.py
- [ ] T022 [AS2] Write address_cache model tests (TDD RED) in backend/django_Admin3/address_cache/tests/test_models.py
  - Test cache field validations
  - Test cache expiry logic (if applicable)
  - Test JSONField validation (if applicable)
- [ ] T023 [AS2] Run address_cache tests and verify failures (TDD RED confirmation)
- [ ] T024 [AS2] Fix any address_cache model issues discovered by tests (TDD GREEN)
- [ ] T025 [AS3] Verify address_cache tests pass via python manage.py test address_cache

### exam_sessions_subjects App (Relationship model)

- [ ] T026 [P] [AS2] Explore exam_sessions_subjects models in backend/django_Admin3/exam_sessions_subjects/models.py
- [ ] T027 [AS2] Write exam_sessions_subjects model tests (TDD RED) in backend/django_Admin3/exam_sessions_subjects/tests/test_models.py
  - Test ForeignKey relationships to ExamSession and Subject
  - Test unique_together constraint
  - Test registration logic fields
- [ ] T028 [AS2] Run exam_sessions_subjects tests and verify failures (TDD RED confirmation)
- [ ] T029 [AS2] Fix any exam_sessions_subjects model issues discovered by tests (TDD GREEN)
- [ ] T030 [AS3] Verify exam_sessions_subjects tests pass via python manage.py test exam_sessions_subjects

### marking_vouchers App (Voucher management)

- [ ] T031 [P] [AS2] Explore marking_vouchers models in backend/django_Admin3/marking_vouchers/models.py
- [ ] T032 [AS2] Write marking_vouchers model tests (TDD RED) in backend/django_Admin3/marking_vouchers/tests/test_models.py
  - Test voucher code uniqueness
  - Test date validations (valid_from, valid_until)
  - Test redemption logic (used flag, used_date)
- [ ] T033 [AS2] Run marking_vouchers tests and verify failures (TDD RED confirmation)
- [ ] T034 [AS2] Fix any marking_vouchers model issues discovered by tests (TDD GREEN)
- [ ] T035 [AS3] Verify marking_vouchers tests pass via python manage.py test marking_vouchers

---

## Phase 3: Model + View Apps (Medium - 5 Apps)

**Goal**: Implement test suites for apps with models AND views/APIs

**Apps**: exam_sessions, marking, tutorials, userprofile, users

**Test Pattern**: Model tests + API endpoint tests following contracts/test-patterns.md

### exam_sessions App (Exam session management)

- [ ] T036 [P] [AS2] Explore exam_sessions models and views in backend/django_Admin3/exam_sessions/
- [ ] T037 [AS2] Write ExamSession model tests (TDD RED) in backend/django_Admin3/exam_sessions/tests/test_models.py
  - Test date validations (exam_date, registration_deadline)
  - Test capacity constraints
  - Test session status transitions
  - Test relationships (ManyToMany with Subjects if applicable)
- [ ] T038 [AS2] Write ExamSession API tests (TDD RED) in backend/django_Admin3/exam_sessions/tests/test_views.py
  - Test GET /api/exam-sessions/ (list endpoint, authentication required)
  - Test GET /api/exam-sessions/{id}/ (retrieve endpoint)
  - Test POST /api/exam-sessions/ (create endpoint, authorization)
  - Test PUT/PATCH /api/exam-sessions/{id}/ (update endpoint)
  - Test DELETE /api/exam-sessions/{id}/ (delete endpoint)
- [ ] T039 [AS2] Run exam_sessions tests and verify failures (TDD RED confirmation)
- [ ] T040 [AS2] Fix any exam_sessions model/view issues discovered by tests (TDD GREEN)
- [ ] T041 [AS3] Verify exam_sessions tests pass via python manage.py test exam_sessions

### marking App (Marking/grading workflow)

- [ ] T042 [P] [AS2] Explore marking models and views in backend/django_Admin3/marking/
- [ ] T043 [AS2] Write Marking model tests (TDD RED) in backend/django_Admin3/marking/tests/test_models.py
  - Test ForeignKey relationships (Student, ExamSession, User as marker)
  - Test marks validation (range constraints)
  - Test status transitions (submitted, graded, etc.)
  - Test submission workflow
- [ ] T044 [AS2] Write Marking API tests (TDD RED) in backend/django_Admin3/marking/tests/test_views.py
  - Test marking workflow endpoints (submit, grade, review)
  - Test authentication and authorization (students vs markers)
  - Test marks validation via API
- [ ] T045 [AS2] Run marking tests and verify failures (TDD RED confirmation)
- [ ] T046 [AS2] Fix any marking model/view issues discovered by tests (TDD GREEN)
- [ ] T047 [AS3] Verify marking tests pass via python manage.py test marking

### tutorials App (Tutorial scheduling + external API integration)

- [ ] T048 [P] [AS2] Explore tutorials models and views in backend/django_Admin3/tutorials/
- [ ] T049 [AS2] Write TutorialEvent model tests (TDD RED) in backend/django_Admin3/tutorials/tests/test_models.py
  - Test event date validations
  - Test capacity constraints
  - Test instructor and subject relationships
  - Test student registration (ManyToMany)
- [ ] T050 [AS2] Write Tutorial API tests with Administrate GraphQL mocking (TDD RED) in backend/django_Admin3/tutorials/tests/test_views.py
  - Mock Administrate GraphQL API calls using unittest.mock.patch
  - Test event data sync from external API
  - Test registration endpoints
  - Test capacity enforcement
- [ ] T051 [AS2] Run tutorials tests and verify failures (TDD RED confirmation)
- [ ] T052 [AS2] Fix any tutorials model/view issues discovered by tests (TDD GREEN)
- [ ] T053 [AS3] Verify tutorials tests pass via python manage.py test tutorials

### userprofile App (User profile management)

- [ ] T054 [P] [AS2] Explore userprofile models and views in backend/django_Admin3/userprofile/
- [ ] T055 [AS2] Write UserProfile model tests (TDD RED) in backend/django_Admin3/userprofile/tests/test_models.py
  - Test OneToOne relationship with User (uniqueness)
  - Test optional field handling (phone, address, organization)
  - Test professional status fields
- [ ] T056 [AS2] Write UserProfile API tests (TDD RED) in backend/django_Admin3/userprofile/tests/test_views.py
  - Test profile retrieval (GET /api/profile/)
  - Test profile update (PUT/PATCH /api/profile/)
  - Test authorization (users can only access own profile)
- [ ] T057 [AS2] Run userprofile tests and verify failures (TDD RED confirmation)
- [ ] T058 [AS2] Fix any userprofile model/view issues discovered by tests (TDD GREEN)
- [ ] T059 [AS3] Verify userprofile tests pass via python manage.py test userprofile

### users App (User account management)

- [ ] T060 [P] [AS2] Explore users models and views in backend/django_Admin3/users/
- [ ] T061 [AS2] Write User model tests (TDD RED) in backend/django_Admin3/users/tests/test_models.py
  - Test custom user model methods (if any)
  - Test user permissions and groups
  - Test user creation workflow
- [ ] T062 [AS2] Write User API tests (TDD RED) in backend/django_Admin3/users/tests/test_views.py
  - Test user registration endpoint
  - Test user account management endpoints
  - Test permission-based authorization
- [ ] T063 [AS2] Run users tests and verify failures (TDD RED confirmation)
- [ ] T064 [AS2] Fix any users model/view issues discovered by tests (TDD GREEN)
- [ ] T065 [AS3] Verify users tests pass via python manage.py test users

---

## Phase 4: Authentication App (High Complexity)

**Goal**: Implement JWT authentication test suite

**App**: core_auth (views-only, no models)

**Test Pattern**: Authentication workflow tests + JWT token tests

### core_auth App (JWT authentication)

- [ ] T066 [AS2] Explore core_auth views in backend/django_Admin3/core_auth/views.py
- [ ] T067 [AS2] Write JWT authentication tests (TDD RED) in backend/django_Admin3/core_auth/tests/test_authentication.py
  - Test login endpoint returns access and refresh tokens
  - Test invalid credentials return 401
  - Test protected endpoint requires authentication
  - Test valid token allows access to protected endpoints
  - Test token refresh workflow
  - Test invalid refresh token returns 401
- [ ] T068 [AS2] Write core_auth view tests (TDD RED) in backend/django_Admin3/core_auth/tests/test_views.py
  - Test authentication endpoints (login, logout, token refresh)
  - Test password reset workflow (if applicable)
  - Test user registration integration with auth
- [ ] T069 [AS2] Run core_auth tests and verify failures (TDD RED confirmation)
- [ ] T070 [AS2] Fix any core_auth authentication issues discovered by tests (TDD GREEN)
- [ ] T071 [AS3] Verify core_auth tests pass via python manage.py test core_auth

---

## Phase 5: Coverage Verification & Quality Assurance

**Goal**: Verify all apps meet 80% minimum coverage and quality standards

**Acceptance Scenario**: AS1 (all apps have test directories), AS3 (environment validation), AS4 (regression detection)

### Individual App Coverage (Parallel - Run After Each App's Tests Pass)

- [ ] T072 [P] [AS1] Generate coverage report for address_analytics via coverage run --source='address_analytics' manage.py test address_analytics && coverage report
- [ ] T073 [P] [AS1] Generate coverage report for address_cache
- [ ] T074 [P] [AS1] Generate coverage report for students
- [ ] T075 [P] [AS1] Generate coverage report for exam_sessions_subjects
- [ ] T076 [P] [AS1] Generate coverage report for marking_vouchers
- [ ] T077 [P] [AS1] Generate coverage report for exam_sessions
- [ ] T078 [P] [AS1] Generate coverage report for marking
- [ ] T079 [P] [AS1] Generate coverage report for tutorials
- [ ] T080 [P] [AS1] Generate coverage report for userprofile
- [ ] T081 [P] [AS1] Generate coverage report for users
- [ ] T082 [P] [AS1] Generate coverage report for core_auth

### Coverage Threshold Validation

- [ ] T083 [AS1] Verify all 11 apps achieve ≥80% code coverage (review coverage reports from T072-T082)
- [ ] T084 [AS4] Identify critical business logic paths with <100% coverage and add targeted tests

### Full Test Suite Validation

- [ ] T085 [AS3] Run complete test suite for all 11 apps via python manage.py test address_analytics address_cache core_auth exam_sessions exam_sessions_subjects marking marking_vouchers students tutorials userprofile users
- [ ] T086 [AS3] Verify total test execution time is <5 minutes (use --parallel flag if needed)
- [ ] T087 [AS3] Run tests on clean database (without --keepdb) to verify migration compatibility

---

## Phase 6: Documentation & Final Validation

**Goal**: Update documentation and verify complete feature delivery

**Acceptance Scenario**: AS5 (TDD workflow support)

### Documentation Updates

- [ ] T088 [AS5] Update CLAUDE.md with test coverage status for all 11 apps in backend/django_Admin3/CLAUDE.md
  - Add test suite coverage summary
  - Document test execution commands
  - Add test patterns reference
- [ ] T089 [AS5] Verify quickstart.md instructions work for new developer setup via specs/002-number-20251121-short/quickstart.md

### Final Validation

- [ ] T090 [AS1] Generate final coverage HTML report via coverage html and verify all apps listed in htmlcov/index.html

---

## Dependencies

### Phase Dependencies
- **Phase 1** (T001-T012) → Blocks all test creation tasks
- **Phase 2** (T013-T035) → Independent (can run in parallel after Phase 1)
- **Phase 3** (T036-T065) → Independent (can run in parallel after Phase 1)
- **Phase 4** (T066-T071) → Independent (can run in parallel after Phase 1)
- **Phase 5** (T072-T087) → Requires respective app tests to pass first
- **Phase 6** (T088-T090) → Requires all app tests to pass (Phase 2-4 complete)

### App-Level Dependencies (Sequential within each app)
Each app follows this pattern (using address_analytics as example):
- T001 (create directory) → T013 (write tests) → T014 (verify RED) → T015 (fix GREEN) → T016 (verify pass) → T072 (coverage)

### Cross-App Dependencies
- **None** - All 11 apps are independent and can be tested in parallel

---

## Parallel Execution Examples

### Phase 1: Setup (All 11 Apps in Parallel)
```bash
# Launch T001-T011 together - create all test directories
parallel python -c "import os; os.makedirs('backend/django_Admin3/{}/tests', exist_ok=True); open('backend/django_Admin3/{}/tests/__init__.py', 'a').close()" ::: address_analytics address_cache core_auth exam_sessions exam_sessions_subjects marking marking_vouchers students tutorials userprofile users
```

### Phase 2-4: Test Creation (Apps in Parallel)
```bash
# Model-only apps (Phase 2) - write all model tests in parallel
Task T013: Write address_analytics model tests
Task T017: Write students model tests
Task T022: Write address_cache model tests
Task T027: Write exam_sessions_subjects model tests
Task T032: Write marking_vouchers model tests

# Model+View apps (Phase 3) - write all model+view tests in parallel
Task T037-T038: Write exam_sessions model and view tests
Task T043-T044: Write marking model and view tests
Task T049-T050: Write tutorials model and view tests
Task T055-T056: Write userprofile model and view tests
Task T061-T062: Write users model and view tests

# Authentication app (Phase 4)
Task T067-T068: Write core_auth authentication and view tests
```

### Phase 5: Coverage (All 11 Apps in Parallel)
```bash
# Generate coverage reports for all apps simultaneously
parallel coverage run --source='{}' manage.py test {} '&&' coverage report ::: address_analytics address_cache students exam_sessions_subjects marking_vouchers exam_sessions marking tutorials userprofile users core_auth
```

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)
**Phase 1 + Phase 2** = Test infrastructure + 5 model-only apps
- **Deliverable**: 5 apps with model test coverage (address_analytics, address_cache, students, exam_sessions_subjects, marking_vouchers)
- **Value**: Establishes test patterns, achieves 45% of apps covered (5/11)
- **Timeline**: ~1-2 days for experienced developer

### Incremental Delivery Phases
1. **MVP** (Phase 1-2): Model-only apps → Validate test patterns work
2. **Phase 3**: Add model+view apps → Prove API testing works
3. **Phase 4**: Add authentication app → Complete high-complexity testing
4. **Phase 5-6**: Coverage verification + documentation → Production ready

### Success Criteria Validation
- ✅ **AS1**: All 11 apps have test directories (verified by T012, T090)
- ✅ **AS2**: All components tested (models: Phase 2-4, views: Phase 3-4)
- ✅ **AS3**: Environment validation (T085-T087 full test suite runs)
- ✅ **AS4**: Regression detection (TDD RED-GREEN phases T014-T071)
- ✅ **AS5**: TDD support (RED-GREEN pattern in all test tasks)

---

## Notes

### Task Format Compliance
- ✅ All tasks follow `- [ ] [ID] [P?] [Story?] Description with file path` format
- ✅ [P] marker used for parallelizable tasks (different files/apps)
- ✅ [Story] markers map to Acceptance Scenarios (AS1-AS5)
- ✅ File paths included in all implementation tasks

### TDD Workflow
- **RED Phase**: Write tests (T013, T017, T022, etc.) → Run tests to verify failure (T014, T018, T023, etc.)
- **GREEN Phase**: Fix code issues (T015, T019, T024, etc.) → Verify tests pass (T016, T020, T025, etc.)
- **REFACTOR Phase**: Implicit in GREEN phase - refactor while keeping tests green

### External Dependencies
- **Administrate GraphQL API**: Mocked in tutorials app tests (T050)
- **JWT Authentication**: Tested in core_auth app (T067-T068)

### Performance Targets
- Total test execution: <5 minutes (verified in T086)
- Per-app coverage: ≥80% (verified in T083)
- Critical paths: 100% coverage (verified in T084)

---

## Total Task Count: 90 Tasks

**Breakdown by Phase**:
- Phase 1 (Setup): 12 tasks
- Phase 2 (Model-only apps): 23 tasks (5 apps × ~4-5 tasks each)
- Phase 3 (Model+View apps): 30 tasks (5 apps × 6 tasks each)
- Phase 4 (Authentication): 6 tasks
- Phase 5 (Coverage): 16 tasks
- Phase 6 (Documentation): 3 tasks

**Breakdown by Acceptance Scenario**:
- AS1 (Test directories): 15 tasks
- AS2 (Component coverage): 55 tasks
- AS3 (Environment validation): 13 tasks
- AS4 (Regression detection): 2 tasks
- AS5 (TDD support): 5 tasks

**Parallelization Opportunities**: 42 tasks marked [P] (47% of total)

**Independent Test Criteria**: Each app can be tested independently via `python manage.py test app_name`
