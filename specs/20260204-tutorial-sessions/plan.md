# Implementation Plan: Tutorial Sessions and Schema Migration

**Branch**: `20260204-tutorial-sessions` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/20260204-tutorial-sessions/spec.md`

## Summary

This feature implements three related changes to the tutorials system:

1. **Schema Migration**: Move six administrate tables (course_templates, custom_fields, instructors, locations, pricelevels, venues) from `public` to `adm` schema to align with the established schema separation pattern
2. **New Model**: Create TutorialSessions model in the `acted` schema with foreign key to TutorialEvents, supporting individual session details within multi-day tutorial events
3. **API Enhancement**: Update the unified search API serializer to include sessions data nested within tutorial events

## Technical Context

**Language/Version**: Python 3.14, Django 6.0, Django REST Framework
**Primary Dependencies**: Django ORM, PostgreSQL psycopg2-binary, DRF serializers
**Storage**: PostgreSQL with `acted` schema (TutorialSessions) and `adm` schema (administrate tables)
**Testing**: Django APITestCase, pytest patterns (minimum 80% coverage)
**Target Platform**: Linux server (backend API)
**Project Type**: Web application (backend only for this feature)
**Performance Goals**: API response time < 500ms for unified search (no regression)
**Constraints**: Zero data loss during migration, idempotent migrations
**Scale/Scope**: Existing tutorial events (~100s), sessions per event (1-10 typical)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-Driven Development | PASS | Tests will be written for: migration validation, model CRUD, serializer output |
| II. Modular Architecture | PASS | Changes contained within tutorials app and search serializers |
| III. Security First | PASS | No new auth required; inherits existing API security |
| IV. Performance Optimization | PASS | Will use prefetch_related for sessions; 500ms target specified |
| V. Code Quality & Conventions | PASS | Following Django patterns, snake_case, proper model structure |

**Gate Status**: ALL PASS - Proceeding to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/20260204-tutorial-sessions/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── api-response.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/django_Admin3/
├── tutorials/
│   ├── models/
│   │   ├── __init__.py           # Export TutorialSessions
│   │   ├── tutorial_events.py    # Existing model
│   │   └── tutorial_sessions.py  # NEW: TutorialSessions model
│   ├── migrations/
│   │   └── 0003_tutorial_sessions.py  # NEW: Create table migration
│   ├── serializers.py            # Update: Add TutorialSessionsSerializer
│   ├── admin.py                  # Update: Register TutorialSessions
│   └── tests/
│       ├── test_models.py        # Update: TutorialSessions tests
│       └── test_sessions_serializer.py  # NEW: Serializer tests
├── administrate/
│   └── migrations/
│       └── 0003_migrate_to_adm_schema.py  # NEW: Schema migration
└── search/
    └── serializers.py            # Update: Include sessions in events
```

**Structure Decision**: Web application backend structure, changes isolated to tutorials app (new model), administrate app (schema migration), and search app (serializer update).

## Complexity Tracking

> No Constitution violations requiring justification. Implementation follows established patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |
