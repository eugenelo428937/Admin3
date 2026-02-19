# Implementation Plan: Tutorial Schema Refactor - Acted Owned Tables

**Branch**: `20260206-tutorial-schema-refactor` | **Date**: 2026-02-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/20260206-tutorial-schema-refactor/spec.md`

## Summary

Create five new acted-schema tables (tutorial_course_templates, staff, tutorial_instructors, tutorial_locations, tutorial_venues) that establish the tutorial app's ownership of reference data currently stored in adm schema. Update tutorial_events and tutorial_sessions to use proper FK references for instructor, venue, and location instead of text fields. Add cross-schema FKs from adm to acted, migrate existing data, then remove redundant adm columns. This follows the Strangler Fig pattern already established in the project.

## Technical Context

**Language/Version**: Python 3.14, Django 6.0 + Django REST Framework
**Primary Dependencies**: Django ORM, Django migrations framework, psycopg2-binary
**Storage**: PostgreSQL with `acted` schema (tutorial models) and `adm` schema (administrate models)
**Testing**: Django `APITestCase` with PostgreSQL (not SQLite), `MIGRATION_ASSERT_MODE = True` in test/CI
**Target Platform**: Linux server (Django backend)
**Project Type**: Web application (backend-only for this feature)
**Performance Goals**: N/A (schema refactor, no API latency targets)
**Constraints**: All migrations must be idempotent; cross-schema FKs supported by PostgreSQL; existing tests must continue passing
**Scale/Scope**: ~4 adm tables with data to migrate, ~2 acted tables to modify, 5 new models to create

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-Driven Development | PASS | TDD will be followed for all new models and migrations; model tests written before implementation |
| II. Modular Architecture | PASS | New models stay in tutorials app (acted schema); adm app gets FK extensions only |
| III. Security First | PASS | No user-facing endpoints changed; FK constraints maintain data integrity |
| IV. Performance Optimization | PASS | Proper FK indexes auto-created by Django; no N+1 query changes |
| V. Code Quality & Conventions | PASS | snake_case naming, `__str__` methods, `active`/`is_active` boolean fields, double-quoted `db_table` convention |

**Deployment Gate**: Database migrations tested on development data first; rollback plan is migration reverse operations.

## Project Structure

### Documentation (this feature)

```text
specs/20260206-tutorial-schema-refactor/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (no API contracts - backend schema only)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/django_Admin3/
├── tutorials/
│   ├── models/
│   │   ├── __init__.py                    # ADD: export new models
│   │   ├── tutorial_events.py             # MODIFY: add instructor, venue FK, location FK
│   │   ├── tutorial_sessions.py           # MODIFY: add instructor FK, change venue/location to FKs
│   │   ├── tutorial_course_template.py    # NEW: TutorialCourseTemplate model
│   │   ├── staff.py                       # NEW: Staff model
│   │   ├── tutorial_instructor.py         # NEW: TutorialInstructor model
│   │   ├── tutorial_location.py           # NEW: TutorialLocation model
│   │   └── tutorial_venue.py              # NEW: TutorialVenue model
│   ├── migrations/
│   │   ├── 0004_new_reference_tables.py   # NEW: create 5 acted tables
│   │   ├── 0005_update_event_session_fks.py # NEW: add/change FK fields
│   │   └── 0006_data_migration.py         # NEW: copy adm → acted data
│   ├── serializers.py                     # MODIFY: update for FK fields
│   ├── admin.py                           # MODIFY: register new models
│   └── tests/
│       ├── test_models.py                 # NEW: model CRUD and constraint tests
│       ├── test_migrations.py             # NEW: migration verification tests
│       └── test_data_migration.py         # NEW: data migration accuracy tests
├── administrate/
│   ├── models/
│   │   ├── course_templates.py            # MODIFY: add FK to acted, then remove columns
│   │   ├── instructors.py                 # MODIFY: add FK to acted, then remove columns
│   │   ├── locations.py                   # MODIFY: add FK to acted, then remove columns
│   │   └── venues.py                      # MODIFY: add FK to acted, then remove columns
│   ├── migrations/
│   │   ├── 0005_add_acted_fks.py          # NEW: add cross-schema FK columns
│   │   └── 0006_remove_redundant_cols.py  # NEW: remove migrated columns
│   └── management/
│       └── commands/
│           └── verify_schema_placement.py # MODIFY: add 5 new acted tables to expected list
```

**Structure Decision**: Backend-only changes across two existing Django apps (tutorials, administrate). New models in tutorials app, FK extensions and column removal in administrate app. No frontend changes.

## Complexity Tracking

No constitution violations. All changes follow established patterns (SeparateDatabaseAndState migrations, double-quoted db_table, modular app architecture).
