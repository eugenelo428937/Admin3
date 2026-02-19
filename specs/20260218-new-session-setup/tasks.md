# Tasks: New Session Setup Wizard

**Input**: Design documents from `/specs/20260218-new-session-setup/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contracts.md, quickstart.md

**Tests**: Included per project constitution (mandatory TDD).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create folder structure per implementation plan

- [ ] T001 Create project folders: `frontend/react-Admin3/src/components/admin/new-session-setup/`, `backend/django_Admin3/catalog/services/` (if not exists)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared components that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Create `NewSessionSetup.js` parent wizard component with MUI Stepper (4 steps: "Exam Session", "Subjects", "Materials & Marking", "Tutorials") and step navigation state in `frontend/react-Admin3/src/components/admin/new-session-setup/NewSessionSetup.js`
- [ ] T003 [P] Create `sessionSetupService.js` API service skeleton with method stubs for `getPreviousSession()`, `copyProducts()`, `getSessionSubjects()` in `frontend/react-Admin3/src/services/sessionSetupService.js`
- [ ] T004 Add routes `/admin/new-session-setup` and `/admin/new-session-setup/:sessionId` importing `NewSessionSetup` component in `frontend/react-Admin3/src/App.js`

**Checkpoint**: Wizard shell accessible at `/admin/new-session-setup` with empty step placeholders

---

## Phase 3: User Story 5 - Admin Menu Navigation Entry Point (Priority: P1)

**Goal**: Add a "New Session Setup" button to the admin mega menu so superusers can access the wizard

**Independent Test**: Log in as superuser, open the admin mega menu, verify the button appears between row 1 and row 2, and navigates to `/admin/new-session-setup`

### Tests for User Story 5

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T005 [P] [US5] Write test for "New Session Setup" button rendering, click navigation, and `navViewAll` styling in `frontend/react-Admin3/src/components/__tests__/NavigationMenu.test.js`

### Implementation for User Story 5

- [ ] T006 [US5] Add "New Session Setup" button row between row1 and row2 in `MegaMenuPopover` using `navViewAll` variant with `NavigateNextIcon` in `frontend/react-Admin3/src/components/Navigation/NavigationMenu.js`

**Checkpoint**: Superuser can click "New Session Setup" in the mega menu and land on the wizard page

---

## Phase 4: User Story 1 - Create a New Exam Session (Priority: P1) MVP

**Goal**: Step 1 of the wizard allows creating an exam session with session code, start date, and end date

**Independent Test**: Navigate to wizard, fill in Step 1 form, save, verify exam session record exists in database and URL updates with session ID

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T007 [P] [US1] Write test for StepExamSession component: form rendering, validation (end date > start date), save action, and step advancement in `frontend/react-Admin3/src/components/admin/new-session-setup/__tests__/StepExamSession.test.js`

### Implementation for User Story 1

- [ ] T008 [US1] Create `StepExamSession.js` (Step 1) reusing form pattern from `ExamSessionForm.js` with fields: session_code, start_date, end_date, and save handler calling `POST /api/catalog/exam-sessions/` in `frontend/react-Admin3/src/components/admin/new-session-setup/StepExamSession.js`
- [ ] T009 [US1] Integrate StepExamSession into wizard: on save, store created session ID in state, update URL to `/admin/new-session-setup/:sessionId`, and advance to Step 2 in `frontend/react-Admin3/src/components/admin/new-session-setup/NewSessionSetup.js`

**Checkpoint**: Superuser can complete Step 1, exam session is created, URL reflects the new session ID

---

## Phase 5: User Story 2 - Assign Subjects to the New Session (Priority: P1)

**Goal**: Step 2 provides a transfer list for assigning active subjects to the new session, with "Copy from previous session" support

**Independent Test**: Complete Steps 1-2, verify exam_session_subject records are created for each assigned subject

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T010 [P] [US2] Write test for StepSubjects component: transfer list rendering, move operations (all/selected left/right), "Copy from previous" replace behavior, save creating ESS records, and validation (at least one subject required) in `frontend/react-Admin3/src/components/admin/new-session-setup/__tests__/StepSubjects.test.js`

### Implementation for User Story 2

- [ ] T011 [P] [US2] Implement `getPreviousSession(currentSessionId)` and `getSessionSubjects(sessionId)` methods in `frontend/react-Admin3/src/services/sessionSetupService.js`
- [ ] T012 [US2] Create `StepSubjects.js` (Step 2) with custom MUI Transfer List: left panel (active subjects from `GET /api/catalog/admin-subjects/?active=true`), right panel (assigned subjects), five action buttons ("all to right", "selected to right", "Copy from {previous_session_code}", "selected to left", "all to left") in `frontend/react-Admin3/src/components/admin/new-session-setup/StepSubjects.js`
- [ ] T013 [US2] Implement save handler: validate at least one subject assigned, create exam_session_subject records via `POST /api/catalog/exam-session-subjects/` for each assigned subject, advance to Step 3 in `frontend/react-Admin3/src/components/admin/new-session-setup/StepSubjects.js`

**Checkpoint**: Superuser can assign subjects via transfer list (including copy from previous), save creates correct ESS records

---

## Phase 6: User Story 3 - Copy Materials, Marking, Prices, and Create Bundles (Priority: P2)

**Goal**: Step 3 offers an atomic copy/create operation that copies products + prices from the previous session and creates bundles from catalog templates

**Independent Test**: Complete Steps 1-3 with "Proceed", verify store products, prices, bundles, and bundle products exist for the new session with correctly mapped ESS IDs

### Backend

#### Tests for User Story 3 (Backend)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T014 [P] [US3] Write unit tests for `SessionSetupService.copy_products_and_bundles()`: product copy with ESS mapping, price copy, bundle creation from catalog templates, bundle product matching by PPV, tutorial variation exclusion, subject skip logic (FR-012), atomic rollback on failure in `backend/django_Admin3/catalog/tests/test_session_setup.py`

#### Implementation for User Story 3 (Backend)

- [ ] T015 [US3] Create `SessionSetupService` with `copy_products_and_bundles(new_session_id, previous_session_id)` method: transaction-wrapped copy of active non-tutorial products, prices, and bundle creation from catalog templates per R4/R5 algorithms in `backend/django_Admin3/catalog/services/session_setup_service.py`
- [ ] T016 [P] [US3] Create `CopyProductsRequestSerializer` (new_exam_session_id, previous_exam_session_id validation) and `CopyProductsResponseSerializer` (products_created, prices_created, bundles_created, bundle_products_created, skipped_subjects, message) in `backend/django_Admin3/catalog/serializers/session_setup_serializers.py`
- [ ] T017 [US3] Create `SessionSetupViewSet` with `copy_products` action using `IsSuperUser` permission, calling `SessionSetupService` in `backend/django_Admin3/catalog/views/session_setup_views.py`
- [ ] T018 [US3] Register `session-setup` endpoint in router for `POST /api/catalog/session-setup/copy-products/` in `backend/django_Admin3/catalog/urls.py`

### Frontend

#### Tests for User Story 3 (Frontend)

- [ ] T019 [P] [US3] Write test for StepMaterials component: dialog rendering with "Proceed"/"Set up later" options, success summary display, "Set up later" skips copy in `frontend/react-Admin3/src/components/admin/new-session-setup/__tests__/StepMaterials.test.js`

#### Implementation for User Story 3 (Frontend)

- [ ] T020 [P] [US3] Implement `copyProducts(newSessionId, previousSessionId)` method calling `POST /api/catalog/session-setup/copy-products/` in `frontend/react-Admin3/src/services/sessionSetupService.js`
- [ ] T021 [US3] Create `StepMaterials.js` (Step 3) with MUI Dialog: "Copy from {previous_session_code}" heading, "Proceed" button (calls copyProducts, shows success summary with counts), "Set up later" button (skips, advances to Step 4), error handling with retry option in `frontend/react-Admin3/src/components/admin/new-session-setup/StepMaterials.js`

**Checkpoint**: Backend endpoint creates products/prices/bundles atomically; frontend dialog triggers copy or skips to Step 4

---

## Phase 7: User Story 4 - Tutorial Placeholder Step (Priority: P3)

**Goal**: Step 4 displays a placeholder with "Upload" (disabled/Coming Soon) and "Set up later" buttons

**Independent Test**: Navigate to Step 4, verify "Upload" is disabled and "Set up later" completes the wizard with redirect

### Tests for User Story 4

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T022 [P] [US4] Write test for StepTutorials component: "Upload" button disabled with "Coming Soon", "Set up later" triggers wizard completion in `frontend/react-Admin3/src/components/admin/new-session-setup/__tests__/StepTutorials.test.js`

### Implementation for User Story 4

- [ ] T023 [US4] Create `StepTutorials.js` (Step 4) with disabled "Upload" button showing "Coming Soon" tooltip and "Set up later" button in `frontend/react-Admin3/src/components/admin/new-session-setup/StepTutorials.js`
- [ ] T024 [US4] Implement wizard completion: "Set up later" in Step 4 redirects to `/admin/exam-sessions` in `frontend/react-Admin3/src/components/admin/new-session-setup/NewSessionSetup.js`

**Checkpoint**: Wizard flow completes end-to-end; user is redirected to exam sessions list

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Integration testing and final verification across all user stories

- [ ] T025 [P] Write integration test for full 4-step wizard flow (navigation → Step 1 → Step 2 → Step 3 → Step 4 → redirect) in `frontend/react-Admin3/src/components/admin/new-session-setup/__tests__/NewSessionSetup.test.js`
- [ ] T026 Run quickstart.md manual testing checklist and verify all acceptance scenarios from spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **US5 (Phase 3)**: Depends on Foundational (needs route in App.js)
- **US1 (Phase 4)**: Depends on Foundational (needs wizard parent component)
- **US2 (Phase 5)**: Depends on Foundational; wizard flow follows US1 but component is independently buildable
- **US3 (Phase 6)**: Backend can start after Setup (parallel with frontend foundational work); frontend depends on backend endpoint
- **US4 (Phase 7)**: Depends on Foundational; independently buildable
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US5 (P1)**: Can start after Foundational - fully independent
- **US1 (P1)**: Can start after Foundational - fully independent
- **US2 (P1)**: Can start after Foundational - component builds independently, wizard flow logically follows US1
- **US3 (P2)**: Backend tasks (T014-T018) can start after Setup. Frontend tasks depend on backend endpoint. Wizard flow logically follows US2
- **US4 (P3)**: Can start after Foundational - fully independent

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD RED phase)
- Service methods before UI components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 2**: T002 and T003 can run in parallel (different files)
- **Phase 3 + Phase 4**: US5 (T005-T006) and US1 (T007-T009) can run in parallel (different files)
- **Phase 6 Backend**: T014 (tests) and T016 (serializers) can run in parallel
- **Phase 6 Backend + Frontend**: T014-T018 (backend) can run before/parallel with US1/US2 frontend work
- **Phase 6 Frontend**: T019 (test) and T020 (service method) can run in parallel
- **Phase 7**: US4 (T022-T024) can run in parallel with US3 frontend work (different files)

---

## Parallel Example: Phase 3 + Phase 4

```bash
# Launch US5 and US1 tests in parallel (different files):
Task: "Write NavigationMenu test in __tests__/NavigationMenu.test.js"
Task: "Write StepExamSession test in __tests__/StepExamSession.test.js"
```

## Parallel Example: Phase 6

```bash
# Launch backend tests and serializers in parallel:
Task: "Write SessionSetupService tests in catalog/tests/test_session_setup.py"
Task: "Create serializers in catalog/serializers/session_setup_serializers.py"

# Launch frontend test and service method in parallel:
Task: "Write StepMaterials test in __tests__/StepMaterials.test.js"
Task: "Implement copyProducts() in services/sessionSetupService.js"
```

---

## Implementation Strategy

### MVP First (US5 + US1)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (wizard shell + routing)
3. Complete Phase 3: US5 (navigation entry point)
4. Complete Phase 4: US1 (create exam session)
5. **STOP and VALIDATE**: Superuser can navigate to wizard and create an exam session

### Incremental Delivery

1. Complete Setup + Foundational → wizard shell accessible
2. Add US5 (navigation) + US1 (Step 1) → Test independently → **MVP!**
3. Add US2 (Step 2: subjects) → Test independently → Demo
4. Add US3 (Step 3: copy operation) → Test independently → Demo
5. Add US4 (Step 4: placeholder) → Test independently → Feature complete
6. Each story adds value without breaking previous stories

### Recommended Execution (Single Developer)

1. Phase 1 → Phase 2 → Phase 3 (US5) → Phase 4 (US1) → Phase 5 (US2)
2. Phase 6 (US3): Backend first (T014-T018), then frontend (T019-T021)
3. Phase 7 (US4) → Phase 8 (Polish)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All database tables already exist - **no migration tasks needed**
- TDD is mandatory per project constitution (RED/GREEN/REFACTOR)
- All admin endpoints require `IsSuperUser` permission
- Step 3 backend uses `transaction.atomic()` for all-or-nothing rollback (FR-017)
- Product codes auto-generate on `save()` - no manual code construction needed
- Bundles are created from catalog templates, not copied from previous store bundles (R5)
- "Copy from previous" in Step 2 uses replace behavior - clears right panel first (FR-008)
- Previous session determined by `ExamSession.objects.exclude(id=new_id).order_by('-id').first()` (R3)
- Tutorial variation types excluded from Step 3 copy operation
