# Contracts: Sync Command Interfaces

**Phase**: 1 (Design) | **Date**: 2026-02-12 | **Plan**: [../plan.md](../plan.md)

## Management Command Interfaces

### Common Arguments (All Sync Commands)

```
--debug         Enable debug logging (existing)
--page-size N   Pagination page size (existing, default: 100)
--no-prompt     Skip interactive prompts; unmatched records are logged only (NEW)
```

### Common Output Format

```
Sync completed: {created} created, {updated} updated, {unchanged} unchanged,
                {deleted} deleted, {skipped} skipped, {errors} errors

[If unmatched tutorial records exist AND --no-prompt NOT set:]
⚠ {N} tutorial records had no match in Administrate:
  - {ModelName}: {identifier} ({description})
  ...

⚠ {M} Administrate records had no match in tutorial tables:
  - {ModelName}: {identifier} ({description})
  ...

Create unmatched tutorial records in Administrate? [y/N]:
```

---

### sync_course_templates

**Purpose**: Match Administrate course templates against `acted.tutorial_course_templates` by code.

**Input**: Administrate GraphQL API (`get_all_course_templates.graphql`)
**Output**: `adm.course_templates` records with `external_id` + `tutorial_course_template` FK

**Matching**: `api.code` ↔ `TutorialCourseTemplate.code` (case-insensitive)

**Dependencies**: `CustomField` records for entity_type='Event' must exist (for event_learning_mode resolution)

**Behavior**:
1. Fetch all course templates from Administrate API (paginated)
2. Load all `TutorialCourseTemplate` records (keyed by lowercase code)
3. For each API record:
   - Match by code → set `tutorial_course_template` FK
   - Create/update `adm.course_templates` with `external_id`, metadata, custom_fields
4. Detect deletions (API records no longer present)
5. Report unmatched in both directions
6. Prompt to create unmatched tutorial records in Administrate (unless `--no-prompt`)

---

### sync_locations

**Purpose**: Match Administrate locations against `acted.tutorial_locations` by name.

**Input**: Administrate GraphQL API (`get_all_locations.graphql`)
**Output**: `adm.locations` records with `external_id` + `tutorial_location` FK

**Matching**: `api.name` ↔ `TutorialLocation.name` (case-insensitive)

**Dependencies**: None

**Behavior**: Same pattern as sync_course_templates with name-based matching.

---

### sync_venues

**Purpose**: Match Administrate venues against `acted.tutorial_venues` by name and parent location.

**Input**: Administrate GraphQL API (`get_all_venues.graphql`)
**Output**: `adm.venues` records with `external_id` + `tutorial_venue` FK

**Matching**: `(api.name, api.location.id)` ↔ `(TutorialVenue.name, TutorialVenue.location.tutorial_location)` (case-insensitive name)

**Dependencies**: Locations must be synced (`adm.locations` records must exist to resolve location FK chain)

**Behavior**: Same pattern. Venue matching requires resolving through the location bridge: API location.id → `adm.locations.external_id` → `adm.locations.tutorial_location` → `TutorialVenue.location`.

---

### sync_instructors

**Purpose**: Match Administrate instructor contacts against `acted.tutorial_instructors` by name.

**Input**: Administrate GraphQL API (`get_all_instructors.graphql`)
**Output**: `adm.instructors` records with `external_id` + `tutorial_instructor` FK

**Matching**: `(api.firstName, api.lastName)` ↔ `(TutorialInstructor.staff.user.first_name, .last_name)` (case-insensitive)

**Dependencies**: None

**Behavior**: Same pattern. Instructor name resolution requires traversing `TutorialInstructor → Staff → User` chain.

---

### sync_custom_fields

**Purpose**: Sync custom field definitions from Administrate (Administrate-owned data).

**Input**: Administrate GraphQL API (inline query per entity type)
**Output**: `adm.custom_fields` records

**Matching**: N/A — custom fields are Administrate-owned, not matched against tutorial tables.

**Dependencies**: None

**Changes**: Add `--no-prompt` flag for consistency (no behavioral change since no tutorial matching).

---

### sync_price_levels

**Purpose**: Sync price level definitions from Administrate (Administrate-owned data).

**Input**: Administrate GraphQL API (inline query)
**Output**: `adm.pricelevels` records

**Matching**: N/A — price levels are Administrate-owned.

**Dependencies**: None

**Changes**: Add `--no-prompt` flag for consistency.

---

### sync_course_template_price_levels

**Purpose**: Sync pricing data linking course templates to price levels.

**Input**: Administrate GraphQL API (`get_course_template_price_levels.graphql`)
**Output**: `adm.course_template_price_levels` records

**Matching**: Resolves `course_template` and `price_level` FKs through `adm.*` bridge tables.

**Dependencies**: Course templates AND price levels must be synced.

**Changes**: Add `--no-prompt` flag, add dependency validation.

---

### sync_all (NEW)

**Purpose**: Run all sync commands in correct dependency order.

**Arguments**:
```
--debug         Pass through to all sub-commands
--no-prompt     Pass through to all sub-commands
--skip-errors   Continue to next command on sub-command failure (default: stop on first error)
```

**Execution Order**:
```
1. sync_custom_fields
2. sync_price_levels
3. sync_locations
4. sync_venues          (depends on: locations)
5. sync_instructors
6. sync_course_templates (depends on: custom_fields)
7. sync_course_template_price_levels (depends on: course_templates, price_levels)
```

**Output**:
```
=== Administrate Full Sync ===

[1/7] Syncing custom fields...
  ✓ Custom fields: 45 created, 2 updated, 0 errors

[2/7] Syncing price levels...
  ✓ Price levels: 3 created, 0 updated, 0 errors

[3/7] Syncing locations...
  ✓ Locations: 5 created, 1 updated, 0 errors
  ⚠ 1 unmatched tutorial location (logged)

[4/7] Syncing venues...
  ✓ Venues: 12 created, 0 updated, 0 errors

[5/7] Syncing instructors...
  ✓ Instructors: 8 created, 2 updated, 0 errors

[6/7] Syncing course templates...
  ✓ Course templates: 20 created, 5 updated, 0 errors
  ⚠ 2 unmatched tutorial course templates (logged)

[7/7] Syncing course template price levels...
  ✓ Course template price levels: 60 created, 3 updated, 0 errors

=== Sync Complete ===
Total: 153 created, 13 updated, 0 errors
3 unmatched tutorial records logged (use individual commands without --no-prompt to review)
```

---

## Shared Utilities Interface (`sync_helpers.py`)

### SyncStats

```python
@dataclass
class SyncStats:
    created: int = 0
    updated: int = 0
    unchanged: int = 0
    deleted: int = 0
    skipped: int = 0
    errors: int = 0
    unmatched_tutorial: list = field(default_factory=list)
    unmatched_api: list = field(default_factory=list)
```

### match_records()

```python
def match_records(
    tutorial_records: dict,    # {match_key: model_instance}
    api_records: list,         # [{'id': ..., match_field: ...}]
    match_field: str,          # API field name to match on
    case_insensitive: bool = True
) -> tuple[dict, list, list]:
    """
    Returns:
        matched: {api_id: (api_record, tutorial_instance)}
        unmatched_tutorial: [tutorial_instance, ...]
        unmatched_api: [api_record, ...]
    """
```

### report_discrepancies()

```python
def report_discrepancies(
    stdout,                    # Command stdout writer
    style,                     # Command style object
    unmatched_tutorial: list,
    unmatched_api: list,
    entity_name: str           # e.g., "course template"
) -> None:
```

### prompt_create_unmatched()

```python
def prompt_create_unmatched(
    stdout,
    style,
    unmatched_tutorial: list,
    entity_name: str,
    no_prompt: bool,
    create_fn: callable = None  # Optional: function to call if user says yes
) -> bool:
    """
    Returns True if user chose to create, False otherwise.
    If no_prompt=True, always returns False (skip).
    If create_fn is None, displays "creation not yet supported" message.
    """
```

### validate_dependencies()

```python
def validate_dependencies(
    stdout,
    style,
    dependencies: dict         # {'Location': Location.objects.exists, ...}
) -> bool:
    """
    Returns True if all dependencies met, False otherwise.
    Prints error messages for unmet dependencies.
    """
```

---

## Event Importer Interface Changes

### Current Interface (unchanged)

```python
def bulk_upload_events_from_excel(file_path, debug=False, dry_run=False):
    """Entry point — no signature changes."""
```

### Internal Flow Changes

**Current flow**:
```
validate_and_process_event_excel() → create_administrate_events()
```

**New flow**:
```
validate_and_process_event_excel()
    → create_tutorial_records()       # NEW: Create acted.tutorial_* records
    → create_administrate_events()    # EXISTING: Modified to also create adm.events bridge records
```

### New Internal Functions

```python
def create_tutorial_event(row_data, debug=False):
    """
    Create a TutorialEvent record from validated Excel row data.

    Returns: TutorialEvents instance

    Resolves FKs:
    - store_product: from course_template_code → subject → exam_session → product
    - location: from TutorialLocation.name
    - venue: from TutorialVenue.name + location
    """

def create_tutorial_session(row_data, tutorial_event, debug=False):
    """
    Create a TutorialSession record linked to the parent TutorialEvent.

    Returns: TutorialSessions instance

    Also creates TutorialSessionInstructors M2M records.
    """

def create_event_bridge_record(tutorial_event, api_event_id, row_data, debug=False):
    """
    Create/update adm.Event bridge record after successful API creation.

    Sets:
    - external_id = api_event_id
    - tutorial_event FK = tutorial_event instance
    - All metadata fields from row_data
    """
```
