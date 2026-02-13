# Research: Administrate-Tutorial Bidirectional Sync

**Phase**: 0 (Research) | **Date**: 2026-02-12 | **Plan**: [plan.md](plan.md)

## Research Questions & Findings

### R1: Event Model Missing `tutorial_event` FK

**Decision**: Add `tutorial_event` FK to `adm.Event` model, following the established pattern from migration `0005_add_cross_schema_fks_to_acted.py`.

**Rationale**: The spec clarification (Q1) explicitly chose this approach. The 4 existing cross-schema FKs (CourseTemplate, Instructor, Location, Venue) all use the same pattern: nullable, `SET_NULL`, with `adm_*` related names. The Event FK will follow identically.

**Alternatives considered**:
- New bridge table for events: Rejected — inconsistent with existing pattern, adds unnecessary complexity.
- Store external_id directly on TutorialEvents: Rejected — keeps acted schema clean of Administrate concerns.

### R2: `db_table` Format Inconsistency on Event/Session Models

**Decision**: Fix `adm.events` → `'"adm"."events"'` and `adm.sessions` → `'"adm"."sessions"'` in the same migration that adds the `tutorial_event` FK.

**Rationale**: Per CLAUDE.md database schema conventions, unquoted format creates literal table names in the public schema instead of the `adm` schema. All other adm models use the double-quoted format. Since we're already creating a migration for Event, bundle the fix.

**Current state**:
- `adm.events` (unquoted) — WRONG
- `adm.sessions` (unquoted) — WRONG
- All other adm models: `'"adm"."model_name"'` (correct)

**Risk**: If the tables already exist as `adm.events` in the public schema (literal name), the migration needs to handle the rename. Need to verify actual table placement at implementation time.

**Alternatives considered**:
- Separate migration: Rejected — unnecessary migration proliferation when we're already touching the model.
- Leave as-is: Rejected — violates CLAUDE.md conventions and could cause issues if tables are queried from different schemas.

### R3: Missing Create Mutations for Administrate

**Decision**: Investigate Administrate GraphQL API for create capabilities for course templates, locations, venues, and instructors. Write mutation files if supported. If not supported, the "create in Administrate" prompt (FR-003) will log a "not supported" message.

**Rationale**: FR-003 requires prompting users to create unmatched tutorial records in Administrate. The spec assumption says "The Administrate GraphQL API queries and mutations already exist and function correctly." However, our codebase only has create mutations for events/sessions — no create mutations for master data entities.

**Current create mutations in codebase**:
- `create_blended_event.graphql` ✅
- `create_lms_event.graphql` ✅
- `update_session.graphql` ✅
- `add_event_staff.graphql` ✅
- `add_session_staff.graphql` ✅

**Missing create mutations**:
- Course template creation — UNKNOWN if API supports
- Location creation — UNKNOWN if API supports
- Venue creation — UNKNOWN if API supports
- Instructor/contact creation — UNKNOWN if API supports

**Implementation approach**:
1. Phase 1: Implement the skip+log+prompt flow framework
2. During implementation: Test Administrate API schema for create mutations
3. If API supports create: Write mutation files and implement creation logic
4. If API doesn't support create: Prompt displays "Creation not available — please create manually in Administrate" with record details

**Alternatives considered**:
- Block on API discovery before planning: Rejected — the skip+log+prompt architecture is the same regardless.
- Skip the create prompt entirely: Rejected — spec explicitly requires FR-003 two-phase approach.

### R4: Sync Command Patterns (No Shared Base Class)

**Decision**: Create a shared `sync_helpers.py` utility module for common matching, reporting, and prompt logic. Do NOT create a base command class.

**Rationale**: All 7 sync commands currently inherit directly from `BaseCommand` with no shared base. They have consistent patterns but slightly different pagination and processing strategies. Extracting a base class would require significant refactoring of working code. Instead, extract the NEW shared logic (tutorial matching, discrepancy reporting, two-phase prompting, dependency validation) into utility functions.

**Shared functionality to extract**:
- `match_by_field(tutorial_records, api_records, match_field)` — Generic matching logic
- `report_discrepancies(matched, unmatched_tutorial, unmatched_api)` — Formatted output
- `prompt_create_unmatched(unmatched_records, no_prompt)` — Two-phase prompt handler
- `validate_dependencies(required_models, required_counts)` — Pre-flight dependency check
- `SyncStats` dataclass — Track created/updated/unchanged/deleted/error/skipped counts

**Alternatives considered**:
- Abstract base command class: Rejected — too much refactoring of working sync commands, each has unique pagination/processing patterns.
- No shared code (duplicate in each command): Rejected — the matching/reporting/prompting logic is identical across commands.

### R5: Event Importer Tutorial Record Creation Order

**Decision**: Create tutorial records FIRST (in a database transaction), then call Administrate API. If API fails, tutorial records remain (per FR-015). Store Administrate external_id in `adm.events` bridge record after successful API response.

**Rationale**: The spec explicitly requires local-first creation (FR-010, FR-015). The current importer validates → creates in API only. The new flow will be: validate → create tutorial records (DB transaction) → create in Administrate API → store bridge record.

**Data flow**:
```
Excel Row (event)
  → Validate (existing validation logic)
  → Create TutorialEvent (acted.tutorial_events)
  → Create in Administrate API (existing mutation)
  → Create/Update adm.Event bridge record with external_id + tutorial_event FK

Excel Row (session)
  → Validate (existing validation logic)
  → Create TutorialSession (acted.tutorial_sessions) + M2M instructors
  → Update session in Administrate API (existing mutation)
```

**Key implementation details**:
- Tutorial records use FKs to `TutorialLocation`, `TutorialVenue`, `TutorialInstructor` (resolved via adm bridge tables)
- `store_product` FK on TutorialEvents needs resolution from course template → subject → exam session → product
- The `adm.Event` bridge record links `external_id` (from API response) to `tutorial_event` FK

**Alternatives considered**:
- API-first, then local: Rejected — spec requires local records survive API failures.
- Parallel creation: Rejected — need API response (external_id) before bridge record creation.

### R6: Matching Logic Specifics

**Decision**: Follow spec matching rules exactly. Build lookup dictionaries from tutorial tables at sync start.

**Matching rules per entity**:

| Entity | Tutorial Field | API Field | Match Type |
|--------|---------------|-----------|------------|
| Course Template | `code` | `code` | Case-insensitive exact |
| Location | `name` | `name` | Case-insensitive exact |
| Venue | `name` + `location` FK | `name` + `location.id` | Case-insensitive name + location match |
| Instructor | `staff.user.first_name` + `staff.user.last_name` | `firstName` + `lastName` | Case-insensitive first+last name |

**Lookup dictionary pattern**:
```python
# Course templates: key by lowercase code
tutorial_templates = {t.code.lower(): t for t in TutorialCourseTemplate.objects.filter(is_active=True)}

# Locations: key by lowercase name
tutorial_locations = {l.name.lower(): l for l in TutorialLocation.objects.filter(is_active=True)}

# Venues: key by (lowercase name, location_id) tuple
tutorial_venues = {(v.name.lower(), v.location_id): v for v in TutorialVenue.objects.select_related('location')}

# Instructors: key by (lowercase first, lowercase last) tuple
tutorial_instructors = {
    (i.staff.user.first_name.lower(), i.staff.user.last_name.lower()): i
    for i in TutorialInstructor.objects.filter(is_active=True).select_related('staff__user')
}
```

**Alternatives considered**:
- Fuzzy matching: Rejected — spec requires exact matching by defined fields.
- Database-level matching (JOIN): Rejected — API records are in-memory, tutorial records are in DB; dictionary lookup is simpler and O(1).

### R7: Dependency Validation Order

**Decision**: Follow the dependency chain specified in FR-022.

**Dependency graph**:
```
custom_fields  ─┐
                 ├─→ course_templates ─→ course_template_price_levels
price_levels   ─┘
locations ─────→ venues
(none) ─────────→ instructors
```

**`sync_all` order**: custom_fields → price_levels → locations → venues → instructors → course_templates → course_template_price_levels

**Per-command dependency validation**:

| Command | Prerequisites |
|---------|---------------|
| `sync_custom_fields` | None |
| `sync_price_levels` | None |
| `sync_locations` | None |
| `sync_venues` | Locations synced (Location.objects.exists()) |
| `sync_instructors` | None |
| `sync_course_templates` | Custom fields synced (CustomField.objects.filter(entity_type='Event').exists()) |
| `sync_course_template_price_levels` | Course templates synced + Price levels synced |

**Alternatives considered**:
- No individual validation (only sync_all): Rejected — spec requires both (FR-021 + FR-022).
- Strict chain (everything depends on everything): Rejected — over-constraining; many commands are independent.

### R8: Two-Phase Prompt UX

**Decision**: Implement a consistent prompt pattern across all sync commands that support tutorial matching.

**Phase 1 (during sync)**: For each unmatched tutorial record, log it and add to an `unmatched_tutorial` list. No interruption.

**Phase 2 (after sync)**: If `unmatched_tutorial` list is non-empty AND `--no-prompt` is NOT set:
1. Display summary table of all unmatched tutorial records
2. Prompt: "Would you like to create these X records in Administrate? [y/N]"
3. If yes: attempt creation via API mutations (if available)
4. If no or `--no-prompt`: skip, already logged

**Console output format**:
```
Sync completed: 15 created, 3 updated, 42 unchanged, 0 deleted, 0 errors

⚠ 2 tutorial records had no match in Administrate:
  - TutorialCourseTemplate: SA1 (Active Actuarial Mathematics)
  - TutorialCourseTemplate: CB4 (Advanced Business Analytics)

⚠ 1 Administrate record had no match in tutorial tables:
  - CourseTemplate: XY9 (Legacy Course - Withdrawn)

Create unmatched tutorial records in Administrate? [y/N]:
```

**Alternatives considered**:
- Per-record prompting during sync: Rejected — spec explicitly chose skip+log then batch prompt.
- Always create without prompting: Rejected — spec requires user confirmation.
