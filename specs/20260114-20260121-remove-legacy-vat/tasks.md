# Tasks: Remove Legacy VAT App

**Input**: Design documents from `/specs/20260114-20260121-remove-legacy-vat/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Integration with existing VAT test suite. No new tests needed - existing tests must continue passing.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/django_Admin3/` (Django project root)
- **Apps**: `backend/django_Admin3/{app}/` for Django apps
- **Settings**: `backend/django_Admin3/Admin3/settings/base.py`

---

## Phase 1: Setup (Preparation)

**Purpose**: Establish baseline and verify current functionality before any changes

- [ ] T001 Run existing VAT tests to establish baseline in `backend/django_Admin3/`
- [ ] T002 [P] Document current vat app imports via grep analysis
- [ ] T003 [P] Create git checkpoint for rollback capability

**Test Command**:
```bash
cd backend/django_Admin3
python manage.py test cart.tests.test_vat_orchestrator
python manage.py test rules_engine.tests.test_vat_integration
```

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Relocate shared utilities that all user stories depend on

**⚠️ CRITICAL**: IP geolocation must be relocated before removing vat app dependencies

- [ ] T004 Create utils services directory at `backend/django_Admin3/utils/services/`
- [ ] T005 [P] Create `__init__.py` in `backend/django_Admin3/utils/services/__init__.py`
- [ ] T006 Copy ip_geolocation.py from `backend/django_Admin3/vat/ip_geolocation.py` to `backend/django_Admin3/utils/services/ip_geolocation.py`
- [ ] T007 Update imports in `backend/django_Admin3/utils/services/__init__.py` to export geolocation functions
- [ ] T008 Verify ip_geolocation works independently by running utility tests

**Checkpoint**: IP geolocation relocated - user story implementation can now begin

---

## Phase 3: User Story 1 - VAT Calculation Continues Working (Priority: P1) 🎯 MVP

**Goal**: Refactor VATOrchestrator to remove vat app dependencies while maintaining identical VAT calculation behavior

**Independent Test**: Add items to cart for UK, EU, SA, IE, and ROW customers - verify VAT amounts match expected rates

### Implementation for User Story 1

- [ ] T009 [US1] Read current `_build_user_context()` method in `backend/django_Admin3/cart/services/vat_orchestrator.py` (lines 145-177)
- [ ] T010 [US1] Remove `from vat.context_builder import build_vat_context` import from `backend/django_Admin3/cart/services/vat_orchestrator.py` (line 155)
- [ ] T011 [US1] Replace `_build_user_context()` method with direct UserProfile address lookup in `backend/django_Admin3/cart/services/vat_orchestrator.py`
- [ ] T012 [US1] Update ip_geolocation import to use `utils.services.ip_geolocation` in `backend/django_Admin3/cart/services/vat_orchestrator.py`
- [ ] T013 [US1] Run VAT orchestrator tests to verify no regression: `python manage.py test cart.tests.test_vat_orchestrator -v 2`
- [ ] T014 [US1] Run VAT integration tests: `python manage.py test rules_engine.tests.test_vat_integration -v 2`
- [ ] T015 [US1] Verify VAT calculation for all regions (UK 20%, IE rate, EU rates, SA 15%, ROW 0%)

**Checkpoint**: VAT calculation works without vat.context_builder dependency

---

## Phase 4: User Story 2 - Developers Access Clean Codebase (Priority: P2)

**Goal**: Remove all vat app dependencies and delete the legacy code

**Independent Test**: Search for `from vat.` imports - verify no production code references exist

### Implementation for User Story 2

- [ ] T016 [US2] Remove `from vat.models import VATAudit` import from `backend/django_Admin3/cart/services/vat_orchestrator.py` (line 14)
- [ ] T017 [US2] Update `_create_audit_record()` method to be a no-op in `backend/django_Admin3/cart/services/vat_orchestrator.py` (lines 407-454)
- [ ] T018 [US2] Run cart tests to verify no regression: `python manage.py test cart -v 2`
- [ ] T019 [US2] Create migration to drop VATAudit table: `python manage.py makemigrations vat --empty --name drop_vat_audit`
- [ ] T020 [US2] Edit migration in `backend/django_Admin3/vat/migrations/` to add DeleteModel operation for VATAudit
- [ ] T021 [US2] Run migration on development database: `python manage.py migrate vat`
- [ ] T022 [US2] Remove `vat` from INSTALLED_APPS in `backend/django_Admin3/Admin3/settings/base.py`
- [ ] T023 [US2] Verify no `from vat.` imports remain via grep: `grep -r "from vat\." --include="*.py" . | grep -v "__pycache__"`
- [ ] T024 [US2] Delete vat app directory `backend/django_Admin3/vat/`
- [ ] T025 [US2] Run full test suite: `python manage.py test`

**Checkpoint**: vat app completely removed, all tests passing

---

## Phase 5: User Story 3 - System Administrators Monitor VAT (Priority: P3)

**Goal**: Verify audit trail works via ActedRuleExecution and ActedOrder.calculations_applied

**Independent Test**: Execute VAT calculation, confirm audit trail exists in ActedRuleExecution with cart/order context

### Implementation for User Story 3

- [ ] T026 [US3] Verify ActedRuleExecution captures VAT rule executions by querying database
- [ ] T027 [US3] Verify ActedOrder.calculations_applied stores VAT result at order level
- [ ] T028 [US3] Document audit trail access patterns in `specs/20260114-20260121-remove-legacy-vat/` for admin reference
- [ ] T029 [US3] Verify cart.vat_result JSONB stores cart-level VAT calculation

**Checkpoint**: Audit capability confirmed via existing models

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Update tests and documentation that referenced vat app

- [ ] T030 [P] Update test imports in `backend/django_Admin3/cart/tests/test_vat_orchestrator.py` - remove VATAudit assertions
- [ ] T031 [P] Update test imports in `backend/django_Admin3/cart/tests/test_vat_removal.py` - update import checks
- [ ] T032 [P] Update test imports in `backend/django_Admin3/cart/tests/test_e2e_vat_integration.py` - remove VATAudit imports
- [ ] T033 Remove any orphaned test fixtures that depend on vat app models
- [ ] T034 Run full test suite to verify all tests pass: `python manage.py test`
- [ ] T035 Verify VAT calculation performance remains under 100ms per cart
- [ ] T036 Run quickstart.md validation to verify all success criteria met

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - establishes baseline
- **Foundational (Phase 2)**: Depends on Setup - relocates shared utilities
- **User Story 1 (Phase 3)**: Depends on Foundational - refactors VATOrchestrator
- **User Story 2 (Phase 4)**: Depends on User Story 1 - removes vat app
- **User Story 3 (Phase 5)**: Depends on User Story 2 - verifies audit trail
- **Polish (Phase 6)**: Depends on User Story 2 - updates tests

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - Core refactoring
- **User Story 2 (P2)**: Must start after US1 - Requires refactored VATOrchestrator before removing app
- **User Story 3 (P3)**: Can start after US2 - Verifies audit works after removal

### Within Each User Story

- Read existing code before modifications
- Make incremental changes with test verification
- Run tests after each significant change
- Verify no regression before moving to next task

### Parallel Opportunities

- **Phase 1**: T002 and T003 can run in parallel
- **Phase 2**: T005 can run in parallel with T006
- **Phase 6**: T030, T031, T032 can all run in parallel (different test files)

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch parallel tasks:
Task: "Create __init__.py in backend/django_Admin3/utils/services/__init__.py"
Task: "Copy ip_geolocation.py from backend/django_Admin3/vat/ip_geolocation.py"
```

---

## Parallel Example: Phase 6 (Polish)

```bash
# Launch all test updates together:
Task: "Update test imports in cart/tests/test_vat_orchestrator.py"
Task: "Update test imports in cart/tests/test_vat_removal.py"
Task: "Update test imports in cart/tests/test_e2e_vat_integration.py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (establish baseline)
2. Complete Phase 2: Foundational (relocate IP geolocation)
3. Complete Phase 3: User Story 1 (refactor VATOrchestrator)
4. **STOP and VALIDATE**: Test VAT calculation for all regions
5. Verify no regression in cart/order functionality

### Incremental Delivery

1. Complete Setup + Foundational → IP geolocation relocated
2. Add User Story 1 → VAT calculation works without vat.context_builder
3. Add User Story 2 → vat app completely removed
4. Add User Story 3 → Audit capability verified
5. Each story builds on previous without breaking functionality

### Risk Mitigation

1. **Rollback**: Git checkpoint at T003 allows reverting to pre-change state
2. **Incremental testing**: Run tests after each significant change
3. **Performance monitoring**: Verify <100ms VAT calculation at T035
4. **Import verification**: Grep for vat imports at T023 before deletion

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks in same phase
- [Story] label maps task to specific user story for traceability
- This is a REMOVAL feature - focus on maintaining existing behavior
- Run tests frequently - any failure should block further changes
- Keep the vat app intact until T024 as rollback safety
- Verify database migration works on dev before production deployment
