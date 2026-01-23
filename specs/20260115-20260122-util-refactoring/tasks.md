# Tasks: Utils App Reorganization & Email System Extraction

**Input**: Design documents from `/specs/20260115-20260122-util-refactoring/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Test tasks NOT included (not requested in spec - tests already exist and will have imports updated)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/django_Admin3/`
- **New App**: `backend/django_Admin3/email_system/`
- **Utils App**: `backend/django_Admin3/utils/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create email_system app structure and configure Django

- [ ] T001 Create email_system app directory structure in backend/django_Admin3/email_system/
- [ ] T002 [P] Create email_system/__init__.py with empty init
- [ ] T003 [P] Create email_system/apps.py with EmailSystemConfig class
- [ ] T004 [P] Create email_system/models/ directory with __init__.py
- [ ] T005 [P] Create email_system/services/ directory with __init__.py
- [ ] T006 [P] Create email_system/admin/ directory with __init__.py
- [ ] T007 [P] Create email_system/backends/ directory with __init__.py
- [ ] T008 [P] Create email_system/management/commands/ directory structure
- [ ] T009 [P] Create email_system/migrations/ directory with __init__.py
- [ ] T010 Add 'email_system' to INSTALLED_APPS in backend/django_Admin3/django_Admin3/settings.py

**Checkpoint**: email_system app structure exists and is registered in Django

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: No blocking foundational tasks - this is a refactoring of existing code

**⚠️ SKIP**: All code already exists and works. Proceeding directly to user story phases.

---

## Phase 3: User Story 1 - Developer Imports Email Functionality (Priority: P1) 🎯 MVP

**Goal**: Extract all email system code into standalone email_system app with working imports

**Independent Test**: Import email models from `email_system.models` and verify all 9 models are accessible; send a test email successfully

### Implementation for User Story 1

#### Models (can be done in parallel)

- [ ] T011 [P] [US1] Move EmailTemplate, EmailAttachment, EmailTemplateAttachment models to backend/django_Admin3/email_system/models/template.py (keep db_table='utils_email_*')
- [ ] T012 [P] [US1] Move EmailQueue model to backend/django_Admin3/email_system/models/queue.py (keep db_table='utils_email_queue')
- [ ] T013 [P] [US1] Move EmailLog model to backend/django_Admin3/email_system/models/log.py (keep db_table='utils_email_log')
- [ ] T014 [P] [US1] Move EmailSettings model to backend/django_Admin3/email_system/models/settings.py (keep db_table='utils_email_settings')
- [ ] T015 [P] [US1] Move EmailContentRule, EmailTemplateContentRule models to backend/django_Admin3/email_system/models/content_rule.py (keep db_table='utils_email_content_*')
- [ ] T016 [P] [US1] Move EmailContentPlaceholder model to backend/django_Admin3/email_system/models/placeholder.py (keep db_table='utils_email_content_placeholder')
- [ ] T017 [US1] Update backend/django_Admin3/email_system/models/__init__.py to export all email models

#### Services (after models)

- [ ] T018 [P] [US1] Move EmailService class to backend/django_Admin3/email_system/services/email_service.py (update internal imports)
- [ ] T019 [P] [US1] Move QueueService to backend/django_Admin3/email_system/services/queue_service.py (update internal imports)
- [ ] T020 [P] [US1] Move ContentInsertionService to backend/django_Admin3/email_system/services/content_insertion.py (update internal imports)
- [ ] T021 [US1] Update backend/django_Admin3/email_system/services/__init__.py to export email_service singleton and classes

#### Backends

- [ ] T022 [US1] Move custom email backends to backend/django_Admin3/email_system/backends/custom_backends.py
- [ ] T023 [US1] Update backend/django_Admin3/email_system/backends/__init__.py to export backends

#### Migrations

- [ ] T024 [US1] Generate email_system initial migration: python manage.py makemigrations email_system
- [ ] T025 [US1] Fake-apply email_system migration: python manage.py migrate email_system --fake

**Checkpoint**: Email models importable from `email_system.models`, services from `email_system.services`

---

## Phase 4: User Story 2 - Developer Imports VAT/Address/Other Utilities (Priority: P2)

**Goal**: Reorganize utils into domain-specific packages with clear import paths

**Independent Test**: Import VAT service from `utils.vat`, address service from `utils.address`, verify all functions work

### Implementation for User Story 2

#### VAT Package

- [ ] T026 [P] [US2] Create backend/django_Admin3/utils/vat/__init__.py with model and service exports
- [ ] T027 [P] [US2] Move UtilsRegion, UtilsCountrys, UtilsCountryRegion models to backend/django_Admin3/utils/vat/models.py
- [ ] T028 [P] [US2] Move VATService to backend/django_Admin3/utils/vat/service.py (from utils/services/vat_service.py)
- [ ] T029 [US2] Create backend/django_Admin3/utils/vat/admin.py with VAT model admin classes

#### Address Package

- [ ] T030 [P] [US2] Create backend/django_Admin3/utils/address/__init__.py with service exports
- [ ] T031 [P] [US2] Move PostcoderService to backend/django_Admin3/utils/address/service.py (from utils/services/postcoder_service.py)
- [ ] T032 [P] [US2] Move AddressCacheService to backend/django_Admin3/utils/address/cache.py (from utils/services/address_cache_service.py)
- [ ] T033 [P] [US2] Move AddressLookupLogger to backend/django_Admin3/utils/address/logger.py (from utils/services/address_lookup_logger.py)

#### DBF Export Package

- [ ] T034 [P] [US2] Create backend/django_Admin3/utils/dbf_export/__init__.py with service export
- [ ] T035 [P] [US2] Move DBFExportService to backend/django_Admin3/utils/dbf_export/service.py (from utils/services/dbf_export_service.py)

#### reCAPTCHA Package

- [ ] T036 [P] [US2] Create backend/django_Admin3/utils/recaptcha/__init__.py with function exports
- [ ] T037 [P] [US2] Move recaptcha utilities to backend/django_Admin3/utils/recaptcha/utils.py (from utils/recaptcha_utils.py)

#### Health Package

- [ ] T038 [P] [US2] Create backend/django_Admin3/utils/health/__init__.py with function exports
- [ ] T039 [P] [US2] Move health_check to backend/django_Admin3/utils/health/checks.py (from utils/health_check.py)

#### Geolocation Package

- [ ] T040 [P] [US2] Create backend/django_Admin3/utils/geolocation/__init__.py with service export
- [ ] T041 [P] [US2] Move IP geolocation service to backend/django_Admin3/utils/geolocation/service.py (from utils/services/ip_geolocation.py)

#### Utils Root Updates

- [ ] T042 [US2] Update backend/django_Admin3/utils/models.py to import VAT models from utils/vat/models.py (remove email models)
- [ ] T043 [US2] Update backend/django_Admin3/utils/admin.py to import from utils/vat/admin.py (remove email admin)

**Checkpoint**: All utility packages importable from `utils.{package}` paths

---

## Phase 5: User Story 3 - Admin User Manages Email Templates (Priority: P2)

**Goal**: Django admin works for all email models from the new email_system app

**Independent Test**: Log into Django admin, navigate to email templates, create/edit/delete a template

### Implementation for User Story 3

- [ ] T044 [P] [US3] Create backend/django_Admin3/email_system/admin/template_admin.py with EmailTemplate, EmailAttachment, EmailTemplateAttachment admin classes
- [ ] T045 [P] [US3] Create backend/django_Admin3/email_system/admin/queue_admin.py with EmailQueue admin class
- [ ] T046 [P] [US3] Create backend/django_Admin3/email_system/admin/log_admin.py with EmailLog admin class
- [ ] T047 [P] [US3] Create backend/django_Admin3/email_system/admin/settings_admin.py with EmailSettings admin class
- [ ] T048 [P] [US3] Create backend/django_Admin3/email_system/admin/content_rule_admin.py with EmailContentRule, EmailTemplateContentRule, EmailContentPlaceholder admin classes
- [ ] T049 [US3] Update backend/django_Admin3/email_system/admin/__init__.py to register all admin classes

**Checkpoint**: All email models visible and editable in Django admin under email_system app

---

## Phase 6: User Story 4 - System Processes Email Queue (Priority: P2)

**Goal**: Email queue management command works from the new email_system app

**Independent Test**: Run `python manage.py process_email_queue` and verify queued emails are processed

### Implementation for User Story 4

- [ ] T050 [US4] Move process_email_queue.py to backend/django_Admin3/email_system/management/commands/process_email_queue.py
- [ ] T051 [US4] Update imports in process_email_queue.py to use email_system.models and email_system.services
- [ ] T052 [US4] Verify management command is discoverable: python manage.py help process_email_queue

**Checkpoint**: Email queue processing command works from email_system app

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Update all external dependencies and cleanup

### External Dependency Updates

- [ ] T053 Update backend/django_Admin3/core_auth/views.py: change `from utils.email_service import email_service` to `from email_system.services import email_service`
- [ ] T054 Update backend/django_Admin3/core_auth/views.py: change `from utils.recaptcha_utils import` to `from utils.recaptcha import`
- [ ] T055 [P] Review and update backend/django_Admin3/rules_engine/custom_functions.py for any utils imports
- [ ] T056 [P] Review and update backend/django_Admin3/cart/models.py for any utils imports
- [ ] T057 [P] Review and update backend/django_Admin3/cart/views.py for any utils imports

### Test Import Updates

- [ ] T058 [P] Update imports in backend/django_Admin3/utils/tests/test_models.py to use email_system.models
- [ ] T059 [P] Update imports in backend/django_Admin3/utils/tests/test_admin.py to use email_system.admin
- [ ] T060 [P] Update imports in any other test files referencing old utils email paths

### Cleanup

- [ ] T061 Remove old email files from backend/django_Admin3/utils/email_service.py (after verifying all imports updated)
- [ ] T062 Remove old email files from backend/django_Admin3/utils/email_backends.py (after verifying all imports updated)
- [ ] T063 Remove old email files from backend/django_Admin3/utils/email_testing.py (after verifying all imports updated)
- [ ] T064 Remove old email files from backend/django_Admin3/utils/services/queue_service.py (after verifying all imports updated)
- [ ] T065 Remove old email files from backend/django_Admin3/utils/services/content_insertion_service.py (after verifying all imports updated)
- [ ] T066 Remove old utility files: recaptcha_utils.py, health_check.py (after verifying package imports work)
- [ ] T067 Remove old service files from utils/services/ that were moved to packages

### Verification

- [ ] T068 Run full test suite: python manage.py test
- [ ] T069 Verify Django admin works for all models
- [ ] T070 Test email sending end-to-end (password reset flow)
- [ ] T071 Verify management commands work: process_email_queue, export_to_dbf, export_orders_to_dbf

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: SKIPPED - existing code is already functional
- **User Story 1 (Phase 3)**: Depends on Setup (Phase 1) - Creates email_system app
- **User Story 2 (Phase 4)**: No dependencies on US1 - Can run in parallel
- **User Story 3 (Phase 5)**: Depends on US1 (needs email models in new location)
- **User Story 4 (Phase 6)**: Depends on US1 (needs email services in new location)
- **Polish (Phase 7)**: Depends on US1, US2, US3, US4 completion

### User Story Dependencies

```
Setup (Phase 1)
     │
     ├──────────────────┐
     ▼                  ▼
User Story 1      User Story 2
(email_system)    (utils packages)
     │                  │
     ├──────────────────┤
     ▼                  │
User Story 3            │
(admin interface)       │
     │                  │
     ▼                  │
User Story 4            │
(management cmd)        │
     │                  │
     └──────────────────┘
             │
             ▼
    Polish (Phase 7)
```

### Within Each User Story

- Models before services
- Services before admin
- Admin before management commands
- All [P] tasks within a phase can run in parallel

### Parallel Opportunities

**Phase 1 (Setup)**: T002-T009 can all run in parallel

**Phase 3 (US1)**: T011-T016 models in parallel, then T018-T020 services in parallel

**Phase 4 (US2)**: All package creation tasks (T026-T041) can run in parallel - different directories

**Phase 5 (US3)**: T044-T048 admin files can run in parallel - different files

---

## Parallel Example: User Story 1 Models

```bash
# Launch all model files in parallel:
Task: "T011 [P] [US1] Move EmailTemplate models to email_system/models/template.py"
Task: "T012 [P] [US1] Move EmailQueue model to email_system/models/queue.py"
Task: "T013 [P] [US1] Move EmailLog model to email_system/models/log.py"
Task: "T014 [P] [US1] Move EmailSettings model to email_system/models/settings.py"
Task: "T015 [P] [US1] Move EmailContentRule models to email_system/models/content_rule.py"
Task: "T016 [P] [US1] Move EmailContentPlaceholder model to email_system/models/placeholder.py"
```

## Parallel Example: User Story 2 Packages

```bash
# Launch all package creation in parallel (different directories):
Task: "T026-T029 [P] [US2] Create utils/vat/ package"
Task: "T030-T033 [P] [US2] Create utils/address/ package"
Task: "T034-T035 [P] [US2] Create utils/dbf_export/ package"
Task: "T036-T037 [P] [US2] Create utils/recaptcha/ package"
Task: "T038-T039 [P] [US2] Create utils/health/ package"
Task: "T040-T041 [P] [US2] Create utils/geolocation/ package"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T010)
2. Complete Phase 3: User Story 1 (T011-T025)
3. **STOP and VALIDATE**: Import email models from `email_system.models`
4. Update critical dependency (core_auth/views.py T053)
5. Run tests to verify email functionality works

### Incremental Delivery

1. Setup (Phase 1) → App structure ready
2. User Story 1 (Phase 3) → Email system extracted (MVP!)
3. User Story 2 (Phase 4) → Utils reorganized (can run parallel with US1)
4. User Story 3 (Phase 5) → Admin works
5. User Story 4 (Phase 6) → Commands work
6. Polish (Phase 7) → Full cleanup and verification

### Parallel Team Strategy

With 2 developers:

1. Both complete Setup (Phase 1) together
2. Once Setup is done:
   - Developer A: User Story 1 (email_system app)
   - Developer B: User Story 2 (utils packages)
3. Once US1 complete:
   - Developer A: User Story 3 + User Story 4
   - Developer B: Continue US2, start Polish
4. Final verification together

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All tasks preserve existing `db_table` names - NO data migration needed
- Fake-apply migrations (T025) since tables already exist
- Always verify imports work before deleting old files
- Run tests frequently to catch import errors early
- Commit after each logical group of tasks
