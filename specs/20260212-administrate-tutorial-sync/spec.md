# Feature Specification: Administrate-Tutorial Bidirectional Sync

**Feature Branch**: `20260212-administrate-tutorial-sync`
**Created**: 2026-02-12
**Status**: Draft
**Input**: User description: "Update administrate sync commands to work with tutorial app tables and update event importer to create records in both tutorial tables and Administrate"

## Clarifications

### Session 2026-02-12

- Q: Where should Administrate event/session external_ids be stored after successful event creation? → A: Add `tutorial_event` FK to the existing `adm.events` model, consistent with the bridge pattern used by other `adm.*` tables (course_templates, locations, venues, instructors).
- Q: In non-interactive mode, what should happen to tutorial records with no Administrate match? → A: Two-phase approach: first skip all unmatched records and log them during sync, then present a summary at the end asking the user if they want to create those records in Administrate. In non-interactive mode (--no-prompt), only skip+log occurs (no end-of-sync prompt).
- Q: Must sync commands run in a specific dependency order? → A: Both — each individual command validates its dependencies and reports errors if prerequisites aren't met, plus a master `sync_all` command runs all syncs in the correct dependency order.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sync Course Templates Between Tutorial and Administrate (Priority: P1)

As an administrator, I want the `sync_course_templates` command to match Administrate API course templates against the `acted.tutorial_course_templates` table by code, so that the `adm.course_templates` records are correctly linked to both systems and I am alerted to any discrepancies.

**Why this priority**: Course templates are the foundational entity. All other sync operations (price levels, events, sessions) depend on course templates being correctly linked between the tutorial system and Administrate. Without this, no downstream sync can function.

**Independent Test**: Can be fully tested by running `python manage.py sync_course_templates` with tutorial_course_templates and Administrate API data present, and verifying that `adm.course_templates` records have correct `external_id` and `tutorial_course_template` FK values.

**Acceptance Scenarios**:

1. **Given** a tutorial_course_template with code "CM2" exists and the Administrate API returns a course template with code "CM2", **When** the sync command runs, **Then** the `adm.course_templates` record is created/updated with the Administrate `external_id` and linked to the tutorial_course_template via FK.
2. **Given** a tutorial_course_template with code "SA1" exists but Administrate API returns no matching course template, **When** the sync command runs, **Then** the user is prompted whether to create the course template in Administrate.
3. **Given** the Administrate API returns a course template with code "CB3" but no matching tutorial_course_template exists, **When** the sync command runs, **Then** the user is shown a discrepancy report listing the unmatched Administrate record.
4. **Given** a previously synced course template has updated custom fields in Administrate, **When** the sync command runs, **Then** the `adm.course_templates.custom_fields` JSON is updated with the latest values.

---

### User Story 2 - Sync Reference Data (Locations, Venues, Instructors, Price Levels, Custom Fields) (Priority: P1)

As an administrator, I want the sync commands for locations, venues, instructors, price levels, and custom fields to match Administrate API data against corresponding `acted.tutorial_*` tables, so that the `adm.*` bridge records are correctly linked and discrepancies are reported.

**Why this priority**: Equal to course templates - these are reference data entities required before events/sessions can be created. Locations and venues are needed for event creation; instructors are needed for session assignment; price levels are needed for pricing; custom fields are needed for custom data.

**Independent Test**: Can be fully tested by running each sync command (e.g., `python manage.py sync_locations`) and verifying that `adm.locations` records are linked to `tutorial_locations` via FK and that discrepancies are reported.

**Acceptance Scenarios**:

1. **Given** a tutorial_location named "London" exists and the Administrate API returns a location named "London", **When** `sync_locations` runs, **Then** the `adm.locations` record links the Administrate `external_id` to the tutorial_location FK.
2. **Given** a tutorial_venue "Conference Room A" exists at location "London" and Administrate has a matching venue, **When** `sync_venues` runs, **Then** the `adm.venues` record is linked to both the Administrate external_id and the tutorial_venue FK.
3. **Given** a tutorial_instructor linked to Staff "Jane Smith" exists and Administrate has a matching contact, **When** `sync_instructors` runs, **Then** the `adm.instructors` record links the Administrate external_id to the tutorial_instructor FK.
4. **Given** the Administrate API returns a location "Manchester" with no matching tutorial_location, **When** `sync_locations` runs, **Then** the user is shown a discrepancy report.
5. **Given** a tutorial_location "Edinburgh" exists with no matching Administrate location, **When** `sync_locations` runs, **Then** the user is prompted whether to create the location in Administrate.
6. **Given** Administrate returns price levels and custom fields, **When** `sync_price_levels` and `sync_custom_fields` run, **Then** the `adm.pricelevels` and `adm.custom_fields` tables are updated from the Administrate API response.
7. **Given** course templates are synced, **When** `sync_course_template_price_levels` runs, **Then** the `adm.course_template_price_levels` records correctly link the price level amounts to the course template via the `adm.course_templates` FK.

---

### User Story 3 - Excel Import Creates Tutorial Records and Administrate Events (Priority: P2)

As an administrator, I want to import events and sessions from the Excel template so that records are created in both the tutorial tables (`acted.tutorial_events`, `acted.tutorial_sessions`, `acted.tutorial_session_instructors`) and in Administrate (via the existing API mutations), ensuring the two systems stay in sync from the point of creation.

**Why this priority**: This is the main workflow enhancement - changing the event importer from directly creating Administrate events to first creating local tutorial records and then syncing them to Administrate. Depends on User Stories 1 and 2 being complete so that reference data (course templates, locations, venues, instructors) is linked.

**Independent Test**: Can be fully tested by running the event importer with a sample Excel file and verifying that records appear in both `acted.tutorial_events`/`acted.tutorial_sessions` and in Administrate (via API response).

**Acceptance Scenarios**:

1. **Given** a valid Excel row with course template, location, venue, instructor, and date/time data, **When** the event importer processes the row, **Then** a `tutorial_event` record is created with proper FK links (store_product, location, venue) AND a corresponding event is created in Administrate via the API.
2. **Given** a valid Excel row representing a session (no course template code, linked to a parent event), **When** the event importer processes the row, **Then** a `tutorial_session` record is created linked to the parent `tutorial_event` with proper instructor M2M links AND the corresponding session is updated in Administrate.
3. **Given** the Administrate API event creation succeeds and returns an event ID, **When** the result is processed, **Then** the `adm.events` record stores the Administrate `external_id` and links to the `tutorial_event` via FK for future reference and cross-referencing.
4. **Given** the Administrate API event creation fails, **When** the error is handled, **Then** the tutorial_event record still exists locally (it was created first), and the error is reported to the user with the option to retry the Administrate creation.
5. **Given** a blended event with both classroom and LMS sessions, **When** imported, **Then** the tutorial_event has the correct start/end dates and each session has classroom or LMS-specific date/time values.
6. **Given** an LMS-only event (code contains "OC" or "WAITLIST"), **When** imported, **Then** the tutorial_event is created with LMS dates only and the Administrate LMS event mutation is used.

---

### User Story 4 - Sync Course Template Price Levels Through Bridge Tables (Priority: P3)

As an administrator, I want the `sync_course_template_price_levels` command to link pricing data between course templates and price levels so that pricing information from Administrate is accessible through the bridge tables.

**Why this priority**: Pricing is needed for the store but is less critical than the foundational sync and event creation workflows.

**Independent Test**: Can be tested by running `python manage.py sync_course_template_price_levels` after course templates and price levels are synced, and verifying price amounts in `adm.course_template_price_levels`.

**Acceptance Scenarios**:

1. **Given** a synced course template with external_id "CT123" and a synced price level with external_id "PL456", **When** the Administrate API returns a price of 500.00 linking them, **Then** a `course_template_price_level` record is created with amount 500.00.
2. **Given** the price amount has changed in Administrate, **When** the sync runs, **Then** the existing record is updated with the new amount.

---

### Edge Cases

- What happens when the Administrate API is unreachable during sync? The sync should fail gracefully, report the error, and not modify local tutorial records.
- What happens when a tutorial_course_template.code matches multiple Administrate course templates? The sync should report the ambiguity and skip the record, requesting manual resolution.
- What happens when the Excel import has a course template code not found in either tutorial_course_templates or Administrate? Validation should fail the row and include it in the error report.
- What happens when an instructor in the Excel file has no matching tutorial_instructor? The validation should report the missing instructor.
- What happens when the Administrate event creation succeeds but the session update fails? The event ID should still be stored; the session error should be reported separately.
- What happens when the Excel file contains duplicate event rows? The importer should detect duplicates (same course template + title + start date) and skip or warn.
- What happens when running sync commands in non-interactive mode (e.g., cron)? Prompts should be skippable via a `--no-prompt` or `--auto` flag that either skips unmatched records or applies a default action.

## Requirements *(mandatory)*

### Functional Requirements

#### Sync Command Updates

- **FR-001**: Each sync command MUST match Administrate API records against corresponding `acted.tutorial_*` table records using appropriate matching fields (code for course templates, name for locations/venues/instructors).
- **FR-002**: Each sync command MUST create/update `adm.*` bridge table records with the Administrate `external_id` and FK link to the corresponding `tutorial_*` record.
- **FR-003**: When a tutorial record has no matching Administrate record, the sync command MUST skip the record during the main sync phase (logging it), then present a summary of all skipped records at the end and prompt the user whether to create them in Administrate.
- **FR-004**: When an Administrate record has no matching tutorial record, the sync command MUST display a discrepancy report listing the unmatched records.
- **FR-005**: Sync commands MUST support a `--no-prompt` flag for non-interactive execution (suitable for automated/cron jobs). In non-interactive mode, unmatched records are skipped and logged only — no end-of-sync creation prompt is shown.
- **FR-006**: Sync commands MUST update custom fields, event learning mode, and other metadata in the `adm.*` tables from the Administrate API response.
- **FR-007**: The `sync_custom_fields` command MUST continue to sync all entity types from the Administrate API since custom fields are Administrate-owned definitions (not tutorial-owned).
- **FR-008**: The `sync_price_levels` command MUST sync price level definitions from Administrate since pricing is Administrate-owned data.
- **FR-009**: The `sync_course_template_price_levels` command MUST resolve course template and price level FKs through the `adm.*` bridge tables.
- **FR-021**: Each sync command MUST validate that its prerequisite data is present before running (e.g., `sync_venues` checks that locations are synced, `sync_course_template_price_levels` checks that course templates and price levels are synced) and report a clear error if dependencies are not met.
- **FR-022**: A master `sync_all` command MUST be provided that runs all sync commands in the correct dependency order: custom_fields → price_levels → locations → venues → instructors → course_templates → course_template_price_levels. It MUST support the same `--no-prompt` and `--debug` flags, passing them through to each sub-command.

#### Event Importer Updates

- **FR-010**: The event importer MUST create `tutorial_event` records in `acted.tutorial_events` before creating events in Administrate.
- **FR-011**: The event importer MUST create `tutorial_session` records in `acted.tutorial_sessions` for each session row, linked to the parent tutorial_event.
- **FR-012**: The event importer MUST create `tutorial_session_instructors` M2M records linking sessions to instructors.
- **FR-013**: The event importer MUST use the `adm.*` bridge tables to resolve Administrate external_ids for course templates, locations, venues, and instructors when calling Administrate API mutations.
- **FR-014**: The event importer MUST store the Administrate event/session external_ids in the `adm.events` bridge table (linked to `tutorial_events` via FK) after successful API creation for future reference and cross-referencing.
- **FR-015**: If Administrate API creation fails, the local tutorial records MUST remain intact and the error MUST be reported with enough detail to retry.
- **FR-016**: The event importer MUST validate all reference data (course template, location, venue, instructors) against the tutorial tables first, then against Administrate via the bridge tables.

#### Matching Logic

- **FR-017**: Course templates MUST be matched by `code` field (case-insensitive).
- **FR-018**: Locations MUST be matched by `name` field (case-insensitive).
- **FR-019**: Venues MUST be matched by `name` field and parent location (case-insensitive name, location FK).
- **FR-020**: Instructors MUST be matched by first name and last name parsed from the Administrate contact record, matched against `tutorial_instructor.staff.user` (first_name, last_name).

### Key Entities

- **TutorialCourseTemplate** (acted schema): Acted-owned course definition with `code`, `title`. Authoritative source of truth for courses.
- **CourseTemplate** (adm schema): Bridge record linking Administrate `external_id` to a `TutorialCourseTemplate` FK. Stores custom fields and event learning mode from Administrate.
- **TutorialLocation / Location**: Tutorial-owned location name <==> Administrate external_id bridge.
- **TutorialVenue / Venue**: Tutorial-owned venue name <==> Administrate external_id bridge, linked to a location.
- **TutorialInstructor / Instructor**: Tutorial-owned instructor (linked to Staff/User) <==> Administrate external_id bridge.
- **TutorialEvents**: Individual tutorial event records with dates, venue, location, and store product FK. Authoritative source of truth for events.
- **Event** (adm schema): Bridge record linking Administrate event `external_id` to a `TutorialEvents` FK. Stores rich Administrate event metadata (learning mode, lifecycle state, max places, etc.).
- **TutorialSessions**: Sessions within an event, with sequence, dates, venue, location, and M2M instructors.
- **PriceLevel / CourseTemplatePriceLevel**: Administrate-owned pricing data synced to bridge tables.
- **CustomField**: Administrate-owned custom field definitions per entity type.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 7 sync commands successfully match and link records between tutorial tables and Administrate, with 100% of matching records linked via FK in the bridge tables.
- **SC-002**: Discrepancy reports correctly identify 100% of unmatched records in both directions (tutorial records without Administrate matches and vice versa).
- **SC-003**: The event importer creates records in both tutorial tables and Administrate for every valid Excel row, with zero data loss between the two systems.
- **SC-004**: When the Administrate API is unavailable, local tutorial records are preserved and can be re-synced when the API recovers.
- **SC-005**: Non-interactive mode (--no-prompt) runs all sync commands without user intervention, suitable for automated scheduling.
- **SC-006**: Event import processing time remains comparable to the current implementation (no more than 20% increase due to dual-write).

### Assumptions

- The `acted.tutorial_*` tables already exist with the schema documented in the recent `20260206-tutorial-schema-refactor` work.
- The Administrate GraphQL API queries and mutations already exist and function correctly (only the sync command logic and event importer workflow are changing).
- The `adm.*` bridge tables already have FK columns pointing to the corresponding `tutorial_*` tables (added in the recent schema refactor).
- The Excel import template format remains unchanged; only the processing logic changes to dual-write.
- Custom fields and price levels are Administrate-owned and do not require matching against tutorial tables (they are synced directly from the API).
- The `store.Product` FK relationship on `TutorialEvents` is already established and products are pre-populated before event import.
