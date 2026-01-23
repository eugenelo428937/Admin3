# Implementation Plan: Utils App Reorganization & Email System Extraction

**Branch**: `20260115-20260122-util-refactoring` | **Date**: 2026-01-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/20260115-20260122-util-refactoring/spec.md`

## Summary

Extract the email system from the monolithic `utils` app into a standalone `email_system` Django app, and reorganize the remaining utils functionality into domain-specific packages (vat/, address/, dbf_export/, recaptcha/, health/). This improves code discoverability, maintainability, and separation of concerns while preserving all existing functionality and database structures.

## Technical Context

**Language/Version**: Python 3.14, Django 6.0
**Primary Dependencies**: Django REST Framework, psycopg2-binary, mjml (email templates)
**Storage**: PostgreSQL with existing `utils_*` tables (preserved)
**Testing**: Django TestCase / APITestCase with pytest patterns
**Target Platform**: Linux server (Railway deployment)
**Project Type**: Web application (Django backend + React frontend)
**Performance Goals**: No performance changes (pure refactoring)
**Constraints**: Zero data migration, preserve all `db_table` names, maintain backward compatibility
**Scale/Scope**: 9 email models, 3 VAT models, ~1550 lines of model code, 5 utility packages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Test-Driven Development** | ✅ PASS | Existing tests will be preserved; import paths updated. Test coverage maintained. |
| **II. Modular Architecture** | ✅ PASS | This refactoring **improves** modularity - extracting email system and creating domain packages |
| **III. Security First** | ✅ PASS | No security changes; email credentials remain in environment variables |
| **IV. Performance Optimization** | ✅ PASS | No performance impact; database structure unchanged |
| **V. Code Quality & Conventions** | ✅ PASS | Follows Django app patterns; `snake_case` preserved |

**Gate Result**: PASS - All constitution principles satisfied. This refactoring aligns with the modular architecture principle.

## Project Structure

### Documentation (this feature)

```text
specs/20260115-20260122-util-refactoring/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no new APIs)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/django_Admin3/
├── email_system/                    # NEW top-level app
│   ├── __init__.py
│   ├── apps.py                      # EmailSystemConfig
│   ├── models/
│   │   ├── __init__.py              # Export all models
│   │   ├── template.py              # EmailTemplate, EmailAttachment, EmailTemplateAttachment
│   │   ├── queue.py                 # EmailQueue
│   │   ├── log.py                   # EmailLog
│   │   ├── settings.py              # EmailSettings
│   │   ├── content_rule.py          # EmailContentRule, EmailTemplateContentRule
│   │   └── placeholder.py           # EmailContentPlaceholder
│   ├── admin/
│   │   ├── __init__.py
│   │   ├── template_admin.py
│   │   ├── queue_admin.py
│   │   └── log_admin.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── email_service.py         # Main EmailService class
│   │   ├── queue_service.py         # Queue processing
│   │   └── content_insertion.py     # Dynamic content insertion
│   ├── backends/
│   │   ├── __init__.py
│   │   └── custom_backends.py       # Custom email backends
│   ├── management/
│   │   └── commands/
│   │       └── process_email_queue.py
│   ├── migrations/
│   │   └── 0001_initial.py          # Fresh migration (fake-applied)
│   └── tests/
│       └── ...
│
├── utils/                           # REORGANIZED existing app
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                    # Imports from vat/models.py only
│   ├── admin.py                     # Imports from vat/admin.py only
│   ├── migrations/                  # Existing migrations preserved
│   ├── urls.py
│   ├── views.py
│   ├── middleware.py                # Kept at root level
│   │
│   ├── vat/                         # VAT domain package
│   │   ├── __init__.py
│   │   ├── models.py                # UtilsRegion, UtilsCountrys, UtilsCountryRegion
│   │   ├── admin.py
│   │   └── service.py               # VATService
│   │
│   ├── address/                     # Address lookup package
│   │   ├── __init__.py
│   │   ├── service.py               # PostcoderService
│   │   ├── cache.py                 # AddressCacheService
│   │   └── logger.py                # AddressLookupLogger
│   │
│   ├── dbf_export/                  # DBF export package
│   │   ├── __init__.py
│   │   └── service.py               # DBFExportService
│   │
│   ├── recaptcha/                   # reCAPTCHA package
│   │   ├── __init__.py
│   │   └── utils.py
│   │
│   ├── health/                      # Health check package
│   │   ├── __init__.py
│   │   └── checks.py
│   │
│   ├── geolocation/                 # IP geolocation package
│   │   ├── __init__.py
│   │   └── service.py               # IP geolocation service
│   │
│   ├── management/
│   │   └── commands/
│   │       ├── export_to_dbf.py
│   │       └── export_orders_to_dbf.py
│   │
│   └── tests/
│       └── ...                      # Reorganized tests by package
```

**Structure Decision**: Web application with Django backend. The email system becomes a first-class Django app, while utils is reorganized into domain packages following Django's app-within-app pattern for related utilities.

## Complexity Tracking

> No constitution violations - this refactoring reduces complexity by improving modularity.

| Aspect | Before | After | Improvement |
|--------|--------|-------|-------------|
| Files in utils root | 10 | 4 | 60% reduction in root clutter |
| Domain packages | 0 | 6 | Clear domain organization |
| Email system coupling | High (buried in utils) | None (standalone app) | Full decoupling |

## Implementation Phases

### Phase 0: Research (Complete)

See [research.md](./research.md) for:
- Django app extraction best practices
- Migration strategy for existing tables
- Deprecation shim patterns

### Phase 1: Design (Complete)

See:
- [data-model.md](./data-model.md) - Model organization and relationships
- [quickstart.md](./quickstart.md) - Developer onboarding for new structure

### Phase 2: Tasks

Generated by `/speckit.tasks` command - see [tasks.md](./tasks.md)

## Risk Mitigation

| Risk | Mitigation | Rollback |
|------|------------|----------|
| Import path breaks | Deprecation shim for old paths | Revert branch |
| Database migration fails | Use `--fake` migration; no schema changes | Tables unchanged |
| Test failures | Update import paths; no logic changes | Revert test changes |
| Admin breaks | Move admin classes with models | Revert admin.py |

## Dependencies

| Dependency | Type | Impact |
|------------|------|--------|
| core_auth/views.py | Import | Update `from utils.email_service` → `from email_system.services` |
| core_auth/views.py | Import | Update `from utils.recaptcha_utils` → `from utils.recaptcha.utils` |
| rules_engine/custom_functions.py | Import | Update VAT imports if any |
| cart/models.py | Import | Review for utils dependencies |
| settings.py | Config | Add `'email_system'` to INSTALLED_APPS |

## Success Verification

- [ ] All existing tests pass (100% pass rate)
- [ ] Email sending works end-to-end
- [ ] Django admin displays all models correctly
- [ ] Management commands execute successfully
- [ ] No deprecation warnings in main code paths
- [ ] core_auth password reset flows work
