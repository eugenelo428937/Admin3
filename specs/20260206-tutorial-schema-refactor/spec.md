# Feature Specification: Tutorial Schema Refactor - Acted Owned Tables

**Feature Branch**: `20260206-tutorial-schema-refactor`
**Created**: 2026-02-06
**Status**: Draft
**Input**: User description: "Refactor tutorial app: create acted schema tables for course templates, staff, instructors, locations, venues; add FK references from tutorial_events and tutorial_sessions; add cross-schema FKs from adm to acted; migrate data; remove redundant adm columns"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Acted-Owned Reference Tables (Priority: P1)

As a database architect, I need tutorial-related reference data (course templates, staff, instructors, locations, venues) to be owned by the `acted` schema, so that the tutorial system has its own authoritative data tables independent of the external Administrate sync pipeline.

**Why this priority**: All subsequent changes (FK updates, data migration, column removal) depend on these tables existing first. This is the foundational structural change.

**Independent Test**: Can be tested by verifying all five new tables exist in the `acted` schema with correct column definitions, constraints, and foreign key relationships.

**Acceptance Scenarios**:

1. **Given** the `acted` schema exists, **When** migration runs, **Then** table `tutorial_course_templates` is created with columns: id, code, title, description, is_active, created_at, updated_at
2. **Given** the `acted` schema exists, **When** migration runs, **Then** table `staff` is created with columns: id, user_id (FK to auth_user), created_at, updated_at
3. **Given** the `acted` schema exists, **When** migration runs, **Then** table `tutorial_instructors` is created with columns: id, staff_id (FK to acted.staff), is_active, created_at, updated_at
4. **Given** the `acted` schema exists, **When** migration runs, **Then** table `tutorial_locations` is created with columns: id, name, code, is_active, created_at, updated_at
5. **Given** the `acted` schema exists, **When** migration runs, **Then** table `tutorial_venues` is created with columns: id, name, description, created_at, updated_at, location_id (FK to acted.tutorial_locations)
6. **Given** acted.staff has a FK to auth_user, **When** a staff record is created, **Then** it must reference a valid Django auth_user record
7. **Given** acted.tutorial_instructors has a FK to acted.staff, **When** an instructor record is created, **Then** it must reference a valid staff record

---

### User Story 2 - Add Instructor FK to Events and Sessions (Priority: P1)

As a store administrator, I need tutorial events and sessions to reference an instructor from the acted schema, so that instructor assignments are tracked with proper relational integrity.

**Why this priority**: Adding the instructor FK to events and sessions is core functionality needed to track who teaches what. It depends on the instructor and staff tables from User Story 1.

**Independent Test**: Can be tested by creating a tutorial_instructor record and linking it to a tutorial_event and tutorial_session via the new FK field.

**Acceptance Scenarios**:

1. **Given** a tutorial_instructor exists, **When** I create a tutorial_event with that instructor, **Then** the event is saved with the instructor FK populated
2. **Given** a tutorial_instructor exists, **When** I create a tutorial_session with that instructor, **Then** the session is saved with the instructor FK populated
3. **Given** an event or session exists, **When** I assign no instructor (null), **Then** the record is saved successfully (instructor is optional)
4. **Given** an instructor is referenced by events, **When** the instructor is deactivated, **Then** existing events retain the FK reference (no cascade delete)

---

### User Story 3 - Update Venue and Location FKs on Events and Sessions (Priority: P1)

As a database architect, I need the venue and location fields on tutorial_events and tutorial_sessions to become proper foreign key references to the acted schema tables, replacing the current plain text fields.

**Why this priority**: Converting text fields to FKs establishes referential integrity and eliminates data duplication. Depends on location and venue tables from User Story 1.

**Independent Test**: Can be tested by creating location and venue records in the acted schema, then creating events and sessions that reference them via FK.

**Acceptance Scenarios**:

1. **Given** a tutorial_location and tutorial_venue exist, **When** I create a tutorial_event referencing them, **Then** the event stores FK IDs instead of text values
2. **Given** a tutorial_location and tutorial_venue exist, **When** I create a tutorial_session referencing them, **Then** the session stores FK IDs instead of text values
3. **Given** the venue field on tutorial_events was a CharField, **When** migration runs, **Then** the field becomes a FK to acted.tutorial_venues (nullable, to support existing data)
4. **Given** the location field on tutorial_sessions was a CharField, **When** migration runs, **Then** the field becomes a FK to acted.tutorial_locations (nullable, to support existing data)
5. **Given** existing events have text-based venue values, **When** migration runs, **Then** old text data is handled gracefully (nullable FK allows gradual data linkage)

---

### User Story 4 - Add Cross-Schema FKs from ADM to Acted (Priority: P2)

As a database architect, I need the adm schema tables (course_templates, instructors, locations, venues) to reference their corresponding acted schema counterparts, so that the Administrate sync pipeline can maintain a link to the tutorial system's owned data.

**Why this priority**: Establishing the cross-schema link is necessary before data migration so that the adm records know which acted record they correspond to. Depends on User Story 1.

**Independent Test**: Can be tested by creating an acted record and linking an adm record to it via the new FK column, then verifying the reference resolves correctly.

**Acceptance Scenarios**:

1. **Given** an acted.tutorial_course_templates record exists, **When** I set the FK on adm.course_templates, **Then** the relationship is stored and queryable
2. **Given** an acted.tutorial_instructors record exists, **When** I set the FK on adm.instructors, **Then** the relationship is stored and queryable
3. **Given** an acted.tutorial_locations record exists, **When** I set the FK on adm.locations, **Then** the relationship is stored and queryable
4. **Given** an acted.tutorial_venues record exists, **When** I set the FK on adm.venues, **Then** the relationship is stored and queryable
5. **Given** the FK columns are nullable, **When** an adm record has no acted counterpart yet, **Then** the FK column is null (no constraint violation)

---

### User Story 5 - Migrate Data from ADM to Acted Schema (Priority: P2)

As a system administrator, I need existing reference data (course templates, instructors, locations, venues) to be copied from the adm schema tables to the corresponding acted schema tables, so that the tutorial system has its own complete dataset.

**Why this priority**: Data must be migrated before the redundant adm columns can be removed. Depends on User Stories 1 and 4 (tables and cross-schema FKs must exist).

**Independent Test**: Can be tested by running the data migration, then comparing row counts and field values between adm and acted tables to verify completeness and accuracy.

**Acceptance Scenarios**:

1. **Given** adm.course_templates has records, **When** data migration runs, **Then** acted.tutorial_course_templates contains matching records for fields: code, title (description defaults to empty, is_active from active field)
2. **Given** adm.instructors has records, **When** data migration runs, **Then** acted.staff and acted.tutorial_instructors contain corresponding records with is_active preserved
3. **Given** adm.locations has records, **When** data migration runs, **Then** acted.tutorial_locations contains matching records for fields: name, code, active
4. **Given** adm.venues has records, **When** data migration runs, **Then** acted.tutorial_venues contains matching records for fields: name, description, with location FK mapped to the corresponding acted.tutorial_locations record
5. **Given** data migration completes, **When** I check adm FK columns, **Then** each adm record has a FK pointing to its corresponding acted record
6. **Given** the migration runs, **When** it encounters duplicate or conflicting data, **Then** it logs a warning and continues (no silent data loss)

---

### User Story 6 - Remove Redundant ADM Columns (Priority: P3)

As a database architect, I need redundant columns removed from the adm schema tables after data has been migrated, so that there is a single source of truth for each piece of data and no stale duplicates.

**Why this priority**: This is the final cleanup step. Must only happen after data migration is verified complete and the acted tables are the authoritative source.

**Independent Test**: Can be tested by verifying the specified columns no longer exist on the adm tables while the adm records still retain their external_id and FK to acted.

**Acceptance Scenarios**:

1. **Given** data has been migrated, **When** column removal migration runs on adm.locations, **Then** columns name, code, active are removed
2. **Given** data has been migrated, **When** column removal migration runs on adm.venues, **Then** columns name, description are removed
3. **Given** data has been migrated, **When** column removal migration runs on adm.course_templates, **Then** columns code, title, categories, active are removed
4. **Given** data has been migrated, **When** column removal migration runs on adm.instructors, **Then** columns first_name, last_name, email are removed
5. **Given** columns are removed from adm tables, **When** I query the adm tables, **Then** they still have id, external_id, FK to acted, and any sync-related fields (last_synced, legacy_id)
6. **Given** the adm records now point to acted via FK, **When** I need the name of a location, **Then** I follow the FK to the acted.tutorial_locations table

---

### Edge Cases

- What happens when the auth_user referenced by acted.staff is deleted? (FK should use PROTECT to prevent orphaned instructor records)
- What happens when adm.venues has a location FK via external_id but the corresponding acted.tutorial_locations record doesn't exist yet? (Migration must handle the mapping correctly using the adm.locations cross-schema FK)
- How should the system handle adm.instructors that have no associated Django auth_user? (Staff record creation is skipped; tutorial_instructor records get null staff_id)
- What happens when duplicate codes exist in adm.course_templates during migration? (The unique constraint on acted.tutorial_course_templates.code must be respected; duplicates should be logged and skipped)
- What happens when a referenced instructor, venue, or location record is deleted? (All FKs on tutorial_events and tutorial_sessions use SET_NULL - the FK is set to null, preserving the event/session record)
- What happens when an existing tutorial_event has a text-based venue that doesn't match any acted.tutorial_venues record? (The new FK field is nullable so existing records aren't broken; text field is dropped and old text values are not automatically mapped)

## Requirements *(mandatory)*

### Functional Requirements

**New Acted Schema Tables**:
- **FR-001**: System MUST create table `acted.tutorial_course_templates` with fields: id (PK, auto), code (string, unique), title (string), description (text, optional), is_active (boolean, default true), created_at, updated_at
- **FR-002**: System MUST create table `acted.staff` with fields: id (PK, auto), user_id (FK to auth_user, unique), created_at, updated_at
- **FR-003**: System MUST create table `acted.tutorial_instructors` with fields: id (PK, auto), staff_id (OneToOneField to acted.staff, nullable, on_delete=SET_NULL), is_active (boolean, default true), created_at, updated_at
- **FR-004**: System MUST create table `acted.tutorial_locations` with fields: id (PK, auto), name (string), code (string), is_active (boolean, default true), created_at, updated_at
- **FR-005**: System MUST create table `acted.tutorial_venues` with fields: id (PK, auto), name (string), description (text, optional), location_id (FK to acted.tutorial_locations, nullable), created_at, updated_at
- **FR-006**: All new tables MUST reside in the `acted` schema following the project's double-quoted `db_table` convention

**Instructor FK on Events and Sessions**:
- **FR-007**: System MUST add an `instructor` FK field on `acted.tutorial_events` referencing `acted.tutorial_instructors.id` (nullable, SET_NULL on delete)
- **FR-008**: System MUST add an `instructor` FK field on `acted.tutorial_sessions` referencing `acted.tutorial_instructors.id` (nullable, SET_NULL on delete)

**Venue and Location FK Updates**:
- **FR-009**: System MUST replace `venue` CharField on `acted.tutorial_events` with a FK referencing `acted.tutorial_venues.id` (nullable, SET_NULL on delete)
- **FR-010**: System MUST replace `venue` CharField on `acted.tutorial_sessions` with a FK referencing `acted.tutorial_venues.id` (nullable, SET_NULL on delete)
- **FR-011**: System MUST replace `location` CharField on `acted.tutorial_sessions` with a FK referencing `acted.tutorial_locations.id` (nullable, SET_NULL on delete)
- **FR-012**: System MUST add a `location` FK field on `acted.tutorial_events` referencing `acted.tutorial_locations.id` (nullable, SET_NULL on delete)

**Cross-Schema FKs (ADM to Acted)**:
- **FR-013**: System MUST add a nullable FK column on `adm.course_templates` referencing `acted.tutorial_course_templates.id`
- **FR-014**: System MUST add a nullable FK column on `adm.instructors` referencing `acted.tutorial_instructors.id`
- **FR-015**: System MUST add a nullable FK column on `adm.locations` referencing `acted.tutorial_locations.id`
- **FR-016**: System MUST add a nullable FK column on `adm.venues` referencing `acted.tutorial_venues.id`

**Data Migration**:
- **FR-017**: System MUST copy code, title from `adm.course_templates` to `acted.tutorial_course_templates` (description defaults to empty string, is_active mapped from active field)
- **FR-018**: System MUST create `acted.staff` records for instructors that have associated Django auth_user accounts; instructors without auth_user get instructor records with null staff_id. The full instructor matching chain is: `adm.instructors` → `acted.tutorial_instructors` → `acted.staff` → `public.auth_user`
- **FR-019**: System MUST copy is_active from `adm.instructors` to `acted.tutorial_instructors`
- **FR-020**: System MUST copy name, code, active from `adm.locations` to `acted.tutorial_locations`
- **FR-021**: System MUST copy name, description from `adm.venues` to `acted.tutorial_venues`, mapping location FK from adm.locations to the corresponding acted.tutorial_locations record
- **FR-022**: System MUST set the cross-schema FK on each adm record to point to the newly created acted record after copying
- **FR-023**: Data migration MUST be idempotent (safe to run multiple times without creating duplicates)

**Column Removal**:
- **FR-024**: System MUST remove columns `name`, `code`, `active` from `adm.locations` after data migration
- **FR-025**: System MUST remove columns `name`, `description` from `adm.venues` after data migration
- **FR-026**: System MUST remove columns `code`, `title`, `categories`, `active` from `adm.course_templates` after data migration
- **FR-027**: System MUST remove columns `first_name`, `last_name`, `email` from `adm.instructors` after data migration
- **FR-028**: After column removal, adm tables MUST retain: id, external_id, FK to acted, and sync-related fields (last_synced, legacy_id where applicable)

### Key Entities

- **TutorialCourseTemplate**: An acted-owned course template record containing code, title, and description. Represents the tutorial system's authoritative course definition.
  - Relates to: adm.CourseTemplate (one-to-one via cross-schema FK from adm)

- **Staff**: A link between the Django auth_user and the tutorial system. Represents an internal staff member who may serve various roles.
  - Relates to: auth_user (one-to-one), TutorialInstructor (one-to-one)

- **TutorialInstructor**: A staff member authorized to lead tutorial sessions. Has an active/inactive status for scheduling purposes.
  - Relates to: Staff (one-to-one), TutorialEvents (one-to-many), TutorialSessions (one-to-many)
  - Relates to: adm.Instructor (one-to-one via cross-schema FK from adm)

- **TutorialLocation**: A geographic location where tutorials can be held (e.g., London, Edinburgh). Contains name and code.
  - Relates to: TutorialVenue (one-to-many), TutorialEvents (one-to-many), TutorialSessions (one-to-many)
  - Relates to: adm.Location (one-to-one via cross-schema FK from adm)

- **TutorialVenue**: A specific venue within a location (e.g., "Conference Room A" within "London"). Contains name and description.
  - Relates to: TutorialLocation (many-to-one), TutorialEvents (one-to-many), TutorialSessions (one-to-many)
  - Relates to: adm.Venue (one-to-one via cross-schema FK from adm)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All five new tables exist in the `acted` schema with correct column definitions and constraints
- **SC-002**: 100% of eligible data from adm tables is copied to corresponding acted tables with field-level accuracy verified
- **SC-003**: All adm records have a valid FK pointing to their corresponding acted record after data migration
- **SC-004**: Tutorial events and sessions can be created with instructor, venue, and location FK references
- **SC-005**: After column removal, no application errors occur when accessing adm tables through existing code paths
- **SC-006**: All existing tests continue to pass after implementation with zero regressions
- **SC-007**: Data migration can be executed multiple times without creating duplicate records in acted tables

## Clarifications

### Session 2026-02-06

- Q: What on_delete behavior should the instructor, venue, and location FKs use on tutorial_events and tutorial_sessions? → A: SET_NULL for all (instructor, venue, location FKs on events and sessions)
- Q: Is updating the Administrate sync pipeline in scope after column removal from adm tables? → A: Deferred - sync pipeline updates are a separate future feature; this feature only handles schema creation, data copy, and column removal

## Assumptions

1. The `acted` schema already exists (created by earlier migrations for tutorial_events and tutorial_sessions)
2. Django auth_user table is available for the Staff FK reference
3. Not all adm.instructors will have a corresponding Django auth_user - the staff_id on tutorial_instructors is nullable to handle this
4. The adm.venues model currently has no `active` field - the user's mention of removing `active` from venues is noted but will be skipped if the column doesn't exist
5. The adm.venues FK to adm.locations uses `external_id` as the target field - the data migration must map this to the acted.tutorial_locations record using the corresponding adm.locations cross-schema FK
6. Existing text-based venue/location values on tutorial_events and tutorial_sessions will NOT be automatically mapped to FK values during this migration - the FK fields are added as nullable, and data linkage can happen separately
7. The instructor reference in the user's step 6 ("adm. first_name, last_name, email") refers to `adm.instructors`
8. The `categories` field being removed from adm.course_templates is not migrated to acted (tutorial_course_templates has no categories field)
9. Tutorial events currently have a `venue` CharField but no `location` field - a new `location` FK will be added
10. Cross-schema FKs from adm to acted tables are managed at the Django model level; database-level FK constraints across schemas are supported by PostgreSQL
11. Updating the Administrate sync pipeline (management commands that write to adm table columns being removed) is OUT OF SCOPE for this feature and will be handled in a follow-up feature following the Strangler Fig pattern
