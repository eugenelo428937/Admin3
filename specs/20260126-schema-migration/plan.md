# Implementation Plan: Migrate Models to Acted Schema

**Branch**: `20260126-schema-migration` | **Date**: 2026-01-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/20260126-schema-migration/spec.md`

## Summary

Migrate 12 database tables across 5 Django apps (marking, tutorials, rules_engine, students, userprofile) from PostgreSQL `public` schema to `acted` schema. This aligns these apps with the existing catalog and store apps that already use the `acted` schema. The migration involves updating Django model `db_table` Meta options and creating Django migrations with raw SQL `ALTER TABLE SET SCHEMA` commands.

## Technical Context

**Language/Version**: Python 3.14, Django 6.0
**Primary Dependencies**: Django ORM, Django migrations framework, psycopg2-binary
**Storage**: PostgreSQL with `acted` schema (existing)
**Testing**: Django TestCase with `python manage.py test`
**Target Platform**: Linux server (production), macOS/Windows (development)
**Project Type**: Web application (backend only for this feature)
**Performance Goals**: Migration completes in single transaction; no runtime performance impact
**Constraints**: Zero data loss; maintain FK integrity; atomic migration
**Scale/Scope**: 12 tables, ~5 apps, single migration per app

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Test-Driven Development | ✅ PASS | Tests will verify: (1) tables exist in acted schema, (2) Django ORM queries work, (3) FK relationships resolve |
| II. Modular Architecture | ✅ PASS | Each app gets its own migration; no cross-app dependencies introduced |
| III. Security First | ✅ PASS | No credentials exposed; migration runs with existing DB permissions |
| IV. Performance Optimization | ✅ PASS | Single transaction migration; no runtime query impact |
| V. Code Quality & Conventions | ✅ PASS | Follows Django migration patterns; uses existing `'"schema"."table"'` convention |

**Gate Status**: ✅ PASSED - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/20260126-schema-migration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (table mapping)
├── quickstart.md        # Phase 1 output (migration guide)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/django_Admin3/
├── marking/
│   ├── models/
│   │   └── marking_paper.py      # Update db_table Meta
│   └── migrations/
│       └── XXXX_migrate_to_acted_schema.py  # New migration
├── tutorials/
│   ├── models/
│   │   └── tutorial_event.py     # Update db_table Meta
│   └── migrations/
│       └── XXXX_migrate_to_acted_schema.py  # New migration
├── rules_engine/
│   ├── models/
│   │   ├── acted_rule.py         # Update db_table Meta
│   │   ├── acted_rules_fields.py # Update db_table Meta
│   │   ├── acted_rule_execution.py # Update db_table Meta
│   │   ├── rule_entry_point.py   # Update db_table Meta
│   │   └── message_template.py   # Update db_table Meta
│   └── migrations/
│       └── XXXX_migrate_to_acted_schema.py  # New migration
├── students/
│   ├── models.py                 # Update db_table Meta
│   └── migrations/
│       └── XXXX_migrate_to_acted_schema.py  # New migration
└── userprofile/
    ├── models/
    │   ├── user_profile.py       # Update db_table Meta
    │   ├── email.py              # Update db_table Meta
    │   ├── address.py            # Update db_table Meta
    │   └── contact_number.py     # Update db_table Meta
    └── migrations/
        └── XXXX_migrate_to_acted_schema.py  # New migration
```

**Structure Decision**: Backend-only changes. Each app receives a single migration file that moves its tables to the `acted` schema using `ALTER TABLE SET SCHEMA`.

## Complexity Tracking

> No violations detected. Migration follows standard Django patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | N/A | N/A |

## Migration Strategy

### Approach: ALTER TABLE SET SCHEMA

PostgreSQL's `ALTER TABLE table_name SET SCHEMA new_schema` is the cleanest approach:
- Atomic operation
- Preserves all data, indexes, constraints, and sequences
- No data movement (just catalog update)
- Maintains FK relationships automatically

### Migration Order

1. **userprofile** - No dependencies on other migrating tables
2. **students** - No dependencies on other migrating tables
3. **rules_engine** - No dependencies on other migrating tables
4. **marking** - Depends on catalog (already migrated)
5. **tutorials** - Depends on store (already migrated)

### Rollback Plan

Each migration includes reverse operation:
```sql
ALTER TABLE acted.table_name SET SCHEMA public;
ALTER TABLE public.table_name RENAME TO acted_table_name;
```
