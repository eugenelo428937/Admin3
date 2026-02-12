# Feature Specification: Tutorial Sessions and Schema Migration

**Feature Branch**: `20260204-tutorial-sessions`
**Created**: 2026-02-04
**Status**: Draft
**Input**: User description: "Update tutorial Django app: move tables to adm schema, add TutorialSessions model, update API serializer to include sessions in unified search response"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Schema Migration for Administrate Tables (Priority: P1)

As a database administrator, I need the administrate tables (course_templates, customfields, instructors, locations, pricelevels, venues) to be physically located in the `adm` schema instead of `public` schema, so that database organization follows the established schema separation pattern.

**Why this priority**: Database schema organization is a foundational change that must be completed before dependent features can be built. The Django models are already configured to reference `adm` schema, but the physical tables may still reside in `public` schema.

**Independent Test**: Can be tested by querying the database to verify all six tables exist in `adm` schema with their data intact.

**Acceptance Scenarios**:

1. **Given** tables exist in `public` schema, **When** migration runs, **Then** tables are moved to `adm` schema with all data preserved
2. **Given** tables already exist in `adm` schema, **When** migration runs, **Then** migration completes successfully without errors (idempotent)
3. **Given** foreign key constraints exist on these tables, **When** migration runs, **Then** all constraints remain valid and functional

---

### User Story 2 - Tutorial Sessions Model Creation (Priority: P1)

As a store administrator, I need a TutorialSessions model that links to TutorialEvents, so that individual session details (dates, locations, venues) can be stored and retrieved for each tutorial event.

**Why this priority**: The new model is required for the API response changes. This is independent work that can be developed alongside the schema migration.

**Independent Test**: Can be tested by creating a TutorialEvent and adding multiple TutorialSessions to it, then verifying CRUD operations work correctly.

**Acceptance Scenarios**:

1. **Given** a TutorialEvent exists, **When** I create a TutorialSession linked to it, **Then** the session is saved with all required fields
2. **Given** a TutorialEvent exists with multiple sessions, **When** I query the event's sessions, **Then** all sessions are returned ordered by sequence
3. **Given** a TutorialSession exists, **When** the parent TutorialEvent is deleted, **Then** the session is also deleted (cascade)
4. **Given** I create a TutorialSession, **When** I omit optional fields (url), **Then** the session is created successfully

---

### User Story 3 - API Response Enhancement with Sessions (Priority: P2)

As a frontend developer, I need the unified search API (`/api/search/unified/`) to include session data nested within tutorial events, so that the product listing can display individual session details without additional API calls.

**Why this priority**: Depends on User Story 2 (model must exist first). Provides immediate frontend value once sessions exist.

**Independent Test**: Can be tested by calling the unified search API for tutorial products and verifying the response structure includes the sessions array within events.

**Acceptance Scenarios**:

1. **Given** a tutorial product with events that have sessions, **When** I call `/api/search/unified/`, **Then** the response includes sessions array nested within each event
2. **Given** a tutorial event with no sessions, **When** I call `/api/search/unified/`, **Then** the event's sessions array is empty `[]`
3. **Given** sessions exist for an event, **When** I call the API, **Then** session fields include: id, title, location, venue, start_date, end_date, sequence, url

---

### Edge Cases

- What happens when a session's start_date is after its end_date? (Validation should prevent this)
- How does the system handle sessions with null/empty optional fields?
- What happens when migrating tables that already exist in the target schema?
- How should sessions be ordered in the API response? (By sequence field)

## Requirements *(mandatory)*

### Functional Requirements

**Schema Migration**:
- **FR-001**: System MUST migrate table `course_templates` from `public` to `adm` schema preserving all data
- **FR-002**: System MUST migrate table `custom_fields` from `public` to `adm` schema preserving all data
- **FR-003**: System MUST migrate table `instructors` from `public` to `adm` schema preserving all data
- **FR-004**: System MUST migrate table `locations` from `public` to `adm` schema preserving all data
- **FR-005**: System MUST migrate table `pricelevels` from `public` to `adm` schema preserving all data
- **FR-006**: System MUST migrate table `venues` from `public` to `adm` schema preserving all data
- **FR-007**: System MUST preserve all foreign key relationships during migration
- **FR-008**: Migration MUST be idempotent (safe to run multiple times)

**TutorialSessions Model**:
- **FR-009**: System MUST create a TutorialSessions model with a foreign key to TutorialEvents
- **FR-010**: TutorialSessions MUST include field: `id` (bigint, primary key, auto-generated)
- **FR-011**: TutorialSessions MUST include field: `title` (string, required)
- **FR-012**: TutorialSessions MUST include field: `location` (string, required)
- **FR-013**: TutorialSessions MUST include field: `venue` (string, required)
- **FR-014**: TutorialSessions MUST include field: `start_date` (datetime, required)
- **FR-015**: TutorialSessions MUST include field: `end_date` (datetime, required)
- **FR-016**: TutorialSessions MUST include field: `sequence` (integer, required) for ordering
- **FR-017**: TutorialSessions MUST include field: `url` (string, optional)
- **FR-018**: TutorialSessions MUST include field: `created_at` (datetime, auto-set on creation)
- **FR-019**: TutorialSessions MUST include field: `updated_at` (datetime, auto-updated on save)
- **FR-020**: TutorialSessions MUST be stored in the `acted` schema (consistent with TutorialEvents)
- **FR-021**: Deleting a TutorialEvent MUST cascade delete all related TutorialSessions
- **FR-022**: TutorialSessions MUST enforce a unique constraint on (tutorial_event, sequence) at the database level

**API Response**:
- **FR-023**: The `/api/search/unified/` endpoint MUST include a `sessions` array within each tutorial event object
- **FR-024**: Each session in the response MUST include: id, title, location, venue, start_date, end_date, sequence, url
- **FR-025**: Sessions MUST be ordered by the `sequence` field in ascending order
- **FR-026**: Events with no sessions MUST return an empty sessions array `[]`

### Key Entities

- **TutorialSessions**: Individual session within a tutorial event, containing specific scheduling and location details. Each session represents a single occurrence/day within a multi-day tutorial event.
  - Relates to: TutorialEvents (many-to-one)
  - Key attributes: title, location, venue, start_date, end_date, sequence, url

- **TutorialEvents** (existing): A tutorial offering linked to a store product, representing a scheduled tutorial with venue and capacity information.
  - Relates to: TutorialSessions (one-to-many), store.Product (many-to-one)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All six administrate tables exist in `adm` schema with 100% data integrity verified
- **SC-002**: TutorialSessions model supports full CRUD operations with validation
- **SC-003**: API response includes sessions data for 100% of tutorial products with events
- **SC-004**: API response time for unified search remains under 500ms for typical queries (no regression)
- **SC-005**: Zero data loss during schema migration
- **SC-006**: All existing tests continue to pass after implementation

## Clarifications

### Session 2026-02-04

- Q: Should sequence be enforced as unique within a TutorialEvent at the database level? → A: Yes, enforce unique constraint on (tutorial_event, sequence) at database level

## Assumptions

1. The Django models already have `db_table` configured for `adm` schema (verified in codebase)
2. The actual database tables may still reside in `public` schema requiring migration
3. The `acted` schema exists and is used for tutorial-related tables
4. Session creation/upload mechanism will be implemented in a future feature (not in scope)
5. Sessions are read-only for the unified search API (no create/update endpoints needed yet)
6. The `url` field on TutorialSessions will be used for video conferencing or additional resources
7. Sequence numbers are manually assigned and enforced as unique within a single TutorialEvent (see FR-022)
