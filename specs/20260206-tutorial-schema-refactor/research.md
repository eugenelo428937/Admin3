# Research: Tutorial Schema Refactor

**Feature**: `20260206-tutorial-schema-refactor`
**Date**: 2026-02-06

## R1: Cross-Schema Foreign Keys in Django with PostgreSQL

**Decision**: Use standard Django `ForeignKey` with string app-label references. PostgreSQL supports FK constraints across schemas natively.

**Rationale**: The codebase already uses cross-schema FKs successfully (e.g., `store.Product` in `acted` schema references `catalog.ExamSessionSubject` also in `acted`). Django doesn't differentiate between schemas at the ORM level - it relies on `db_table` metadata. Cross-schema FKs from `adm` to `acted` (e.g., `adm.instructors` → `acted.tutorial_instructors`) work the same way: Django generates standard FK SQL, and PostgreSQL resolves the schema-qualified table names.

**Alternatives considered**:
- Manual SQL FKs via RunSQL: Rejected - Django ORM handles this automatically
- Database views: Rejected - unnecessary complexity for simple FK relationships

## R2: CharField to ForeignKey Migration Strategy

**Decision**: Use a two-step migration approach: (1) remove old CharField, (2) add new FK field in the same migration. Django's `makemigrations` handles this as RemoveField + AddField operations within `SeparateDatabaseAndState`.

**Rationale**: The current `venue` CharField on `tutorial_events` and `venue`/`location` CharFields on `tutorial_sessions` contain plain text values (not IDs). Since the spec states these won't be auto-mapped to FK values (Assumption #6), the approach is:
1. Drop the old CharField columns
2. Add new nullable FK columns (initially null for all existing rows)
3. Data linkage between text values and FK IDs is deferred to a future feature

**Alternatives considered**:
- Rename field + alter type: Rejected - CharField text values can't be cast to integer FK IDs
- Keep both fields temporarily: Rejected - creates data duplication and confusion about source of truth

## R3: Data Migration Idempotency Pattern

**Decision**: Use `get_or_create` pattern in Django data migrations to ensure idempotency. Match on unique fields (code for course_templates, external_id mapping for others).

**Rationale**: FR-023 requires idempotent data migration. The `get_or_create` pattern is standard in Django data migrations. For each adm record:
1. Check if a corresponding acted record already exists (match on code/name)
2. If exists, update the adm cross-schema FK to point to it
3. If not, create the acted record and set the FK

**Alternatives considered**:
- Truncate + re-insert: Rejected - not safe for production with FK references
- Raw SQL INSERT ... ON CONFLICT: Viable but less readable than Django ORM approach

## R4: SeparateDatabaseAndState Pattern for New Tables

**Decision**: New models (5 tables) can use standard `CreateModel` migrations since they're being created fresh in the `acted` schema. The `db_table` attribute with double-quoted format handles schema placement. `SeparateDatabaseAndState` is NOT needed for new table creation.

**Rationale**: `SeparateDatabaseAndState` is required when the database state diverges from Django's migration state (e.g., moving existing tables between schemas). For brand-new tables, Django's `CreateModel` operation with `db_table = '"acted"."tutorial_locations"'` directly creates the table in the correct schema.

**Alternatives considered**:
- SeparateDatabaseAndState for all operations: Rejected - adds unnecessary complexity for new tables
- Raw SQL CREATE TABLE: Rejected - loses Django migration state tracking

## R5: Instructor-Staff-AuthUser Relationship Chain

**Decision**: `acted.tutorial_instructors.staff_id` is nullable FK to `acted.staff`. `acted.staff.user_id` is a unique, non-nullable FK to `auth_user` with `on_delete=PROTECT`.

**Rationale**: Not all adm.instructors have Django auth_user accounts (Assumption #3). The staff table bridges auth_user to the tutorial system. Instructors without auth_user get a tutorial_instructor record with `staff_id=NULL`. The PROTECT on staff→auth_user prevents accidental deletion of user accounts that are linked to staff records (Edge Case #1 in spec).

**Alternatives considered**:
- Direct FK from instructor to auth_user: Rejected - not all instructors have auth_user accounts
- CASCADE on staff→auth_user: Rejected - deleting a user shouldn't silently cascade through instructor to events

## R6: Venue-Location FK Mapping During Data Migration

**Decision**: Map adm.venues → acted.tutorial_venues using a two-pass approach: (1) migrate locations first, (2) migrate venues and resolve location FK through the adm.locations cross-schema FK.

**Rationale**: adm.venues has a FK to adm.locations using `to_field='external_id'` (not PK). During migration:
1. Create acted.tutorial_locations from adm.locations → set adm.locations.tutorial_location_id FK
2. For each adm.venue: find its adm.location (via external_id FK), get that location's tutorial_location_id, use it as the acted.tutorial_venues.location_id

**Alternatives considered**:
- Migrate venues without location mapping: Rejected - loses the location relationship
- Direct external_id matching: Rejected - acted tables use PK-based FKs, not external_id

## R7: Column Removal Migration Safety

**Decision**: Column removal happens in a separate migration file that depends on the data migration. Uses Django `RemoveField` operations. The adm model classes are updated to remove the field definitions.

**Rationale**: Separating column removal into its own migration ensures:
1. Data migration can be verified before columns are dropped
2. Rollback is possible (Django generates AddField reverse operations)
3. The migration dependency chain enforces correct ordering

**Alternatives considered**:
- Combined data migration + column removal: Rejected - can't verify data before dropping columns
- Manual ALTER TABLE DROP COLUMN: Rejected - loses Django state tracking
