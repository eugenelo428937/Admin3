# Data Model: Administrate-Tutorial Bidirectional Sync

**Phase**: 1 (Design) | **Date**: 2026-02-12 | **Plan**: [plan.md](plan.md)

## Overview

This feature modifies **1 existing model** (adding a FK field) and fixes **2 existing models** (db_table format). No new models are created — all tutorial and bridge models already exist from the `20260206-tutorial-schema-refactor` work.

## Model Changes

### 1. `administrate.Event` — Add `tutorial_event` FK

**File**: `backend/django_Admin3/administrate/models/events.py`
**Table**: `"adm"."events"` (currently `adm.events` — will be fixed)

#### New Field

```python
tutorial_event = models.ForeignKey(
    'tutorials.TutorialEvents',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='adm_events',
)
```

**Pattern**: Identical to the 4 existing cross-schema FKs added in migration `0005`:
- Nullable (existing Event records won't have a tutorial_event initially)
- `SET_NULL` on delete (if tutorial event is deleted, bridge record survives)
- Related name: `adm_events` (consistent with `adm_course_templates`, `adm_locations`, etc.)

#### db_table Fix

```python
# BEFORE (incorrect — creates literal "adm.events" in public schema)
db_table = 'adm.events'

# AFTER (correct — creates "events" in "adm" schema)
db_table = '"adm"."events"'
```

### 2. `administrate.Session` — db_table Fix Only

**File**: `backend/django_Admin3/administrate/models/events.py`
**Table**: `"adm"."sessions"` (currently `adm.sessions` — will be fixed)

#### db_table Fix

```python
# BEFORE
db_table = 'adm.sessions'

# AFTER
db_table = '"adm"."sessions"'
```

No new fields needed on Session — the spec bridges events (not individual sessions) via `adm.events.tutorial_event`.

## Migration

### `0007_add_event_tutorial_fk.py`

**Dependencies**: `("administrate", "0006_remove_redundant_adm_columns")`, `("tutorials", "0010_move_instructors_to_sessions")`

**Operations**:
1. `AlterModelTable` for Event: `'adm.events'` → `'"adm"."events"'`
2. `AlterModelTable` for Session: `'adm.sessions'` → `'"adm"."sessions"'`
3. `AddField` for Event.tutorial_event FK

**Note**: The `AlterModelTable` operations need careful handling. If the tables already exist with the literal name `adm.events` in the public schema (rather than `events` in the `adm` schema), we'll need a `RunSQL` operation to rename/move them. This will be verified at implementation time by checking actual table placement.

## Existing Models (Reference — No Changes)

### acted Schema (Tutorial Models)

| Model | Table | Key Fields | Used By |
|-------|-------|------------|---------|
| `TutorialCourseTemplate` | `"acted"."tutorial_course_templates"` | `code` (unique), `title`, `is_active` | sync_course_templates matching |
| `TutorialLocation` | `"acted"."tutorial_locations"` | `name`, `code`, `is_active` | sync_locations matching |
| `TutorialVenue` | `"acted"."tutorial_venues"` | `name`, `location` FK, `description` | sync_venues matching |
| `TutorialInstructor` | `"acted"."tutorial_instructors"` | `staff` OneToOne, `is_active` | sync_instructors matching |
| `Staff` | `"acted"."staff"` | `user` OneToOne (→ auth.User) | Instructor name resolution |
| `TutorialEvents` | `"acted"."tutorial_events"` | `code`, `store_product` FK, `venue` FK, `location` FK, `start_date`, `end_date` | Event importer writes |
| `TutorialSessions` | `"acted"."tutorial_sessions"` | `tutorial_event` FK, `title`, `instructors` M2M, `venue` FK, `location` FK, `sequence` | Event importer writes |

### adm Schema (Bridge Models)

| Model | Table | Tutorial FK | Key Fields |
|-------|-------|-------------|------------|
| `CourseTemplate` | `"adm"."course_templates"` | `tutorial_course_template` ✅ | `external_id`, `code`, `title`, `custom_fields` JSON |
| `Location` | `"adm"."locations"` | `tutorial_location` ✅ | `external_id`, `name`, `code` |
| `Venue` | `"adm"."venues"` | `tutorial_venue` ✅ | `external_id`, `name`, `location` FK (to_field=external_id) |
| `Instructor` | `"adm"."instructors"` | `tutorial_instructor` ✅ | `external_id`, `first_name`, `last_name` |
| `Event` | `"adm"."events"` | `tutorial_event` ❌ **TO ADD** | `external_id`, `course_template` FK, `title`, 30+ metadata fields |
| `Session` | `"adm"."sessions"` | N/A | `event` FK, `title`, `day_number`, datetime fields |
| `PriceLevel` | `"adm"."pricelevels"` | N/A (Administrate-owned) | `external_id`, `name`, `description` |
| `CourseTemplatePriceLevel` | `"adm"."course_template_price_levels"` | N/A | `course_template` FK, `price_level` FK, `amount` |
| `CustomField` | `"adm"."custom_fields"` | N/A (Administrate-owned) | `external_id`, `label`, `entity_type`, `type` |

## Entity Relationship Diagram

```
acted schema                           adm schema
─────────────                          ──────────

TutorialCourseTemplate ◄──FK── CourseTemplate
  code (unique)                  external_id
  title                          code, title
  is_active                      custom_fields (JSON)

TutorialLocation ◄─────FK── Location
  name                           external_id
  code                           name, code
  is_active

TutorialVenue ◄────────FK── Venue
  name                           external_id
  location FK                    name
                                 location FK (to_field=external_id)

TutorialInstructor ◄───FK── Instructor
  staff (→User)                  external_id
  is_active                      first_name, last_name

TutorialEvents ◄───────FK── Event  ← NEW FK
  code (unique)                  external_id
  store_product FK               course_template FK
  venue FK                       title, learning_mode
  location FK                    30+ metadata fields
  start_date, end_date

TutorialSessions                 Session
  tutorial_event FK              event FK
  title, sequence                title, day_number
  instructors M2M                session_instructor FK
  venue FK, location FK          datetime fields

                                 PriceLevel (no tutorial FK)
                                 CourseTemplatePriceLevel (no tutorial FK)
                                 CustomField (no tutorial FK)
```

## Matching Logic (Data Flow)

### Sync Commands: API → Bridge Table → Tutorial FK

```
Administrate API Response
    │
    ▼
Parse API record (extract external_id, code/name fields)
    │
    ▼
Look up tutorial record by matching field:
  - CourseTemplate: code (case-insensitive)
  - Location: name (case-insensitive)
  - Venue: name + location (case-insensitive)
  - Instructor: first_name + last_name (case-insensitive)
    │
    ├── MATCH FOUND → Create/update adm.* record with external_id + tutorial FK
    │
    ├── NO TUTORIAL MATCH → Create/update adm.* record with external_id only (tutorial FK = NULL)
    │                        Log as "unmatched API record"
    │
    └── TUTORIAL RECORD WITH NO API MATCH → Skip during sync, add to unmatched list
                                             Prompt at end (or skip if --no-prompt)
```

### Event Importer: Excel → Tutorial Tables → API → Bridge Table

```
Excel Row (Event)
    │
    ▼
Validate reference data against tutorial tables + adm bridge tables
    │
    ▼
Create TutorialEvent (acted.tutorial_events)
  - Resolve: store_product, location, venue FKs from tutorial tables
    │
    ▼
Call Administrate API mutation (create_blended_event / create_lms_event)
  - Resolve: external_ids for course_template, location, venue from adm bridge tables
    │
    ▼
Create/Update adm.Event bridge record
  - external_id = API response event ID
  - tutorial_event FK = TutorialEvent created above
```
