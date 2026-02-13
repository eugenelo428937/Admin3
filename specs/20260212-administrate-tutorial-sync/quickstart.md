# Quickstart: Administrate-Tutorial Bidirectional Sync

**Phase**: 1 (Design) | **Date**: 2026-02-12 | **Plan**: [plan.md](plan.md)

## Prerequisites

1. **Database**: PostgreSQL with `acted` and `adm` schemas
2. **Tutorial data**: `acted.tutorial_*` tables populated (from `20260206-tutorial-schema-refactor`)
3. **Administrate API**: Valid API credentials in environment variables
4. **Python environment**: Python 3.14, Django 6.0, virtual environment activated

## Setup

```bash
# Navigate to backend
cd backend/django_Admin3

# Activate virtual environment
source .venv/bin/activate  # macOS/Linux
# .\.venv\Scripts\activate  # Windows

# Run the new migration (adds tutorial_event FK to adm.Event, fixes db_table)
python manage.py makemigrations administrate
python manage.py migrate

# Verify migration
python manage.py verify_schema_placement
```

## Running Sync Commands

### Individual Commands

```bash
# Sync all reference data with interactive prompts
python manage.py sync_custom_fields --debug
python manage.py sync_price_levels --debug
python manage.py sync_locations --debug
python manage.py sync_venues --debug
python manage.py sync_instructors --debug
python manage.py sync_course_templates --debug

# Sync pricing (requires course templates + price levels)
python manage.py sync_course_template_price_levels --debug

# Non-interactive mode (for cron/CI)
python manage.py sync_course_templates --no-prompt
```

### Master Sync Command

```bash
# Run all syncs in correct dependency order
python manage.py sync_all --debug

# Non-interactive (cron-safe)
python manage.py sync_all --no-prompt

# Continue on errors
python manage.py sync_all --no-prompt --skip-errors
```

## Running the Event Importer

```bash
# Interactive import with debug output
python manage.py import_events path/to/EventSessionImportTemplate.xlsx --debug

# Dry run (validate only, no records created)
python manage.py import_events path/to/EventSessionImportTemplate.xlsx --dry-run --debug
```

## Running Tests

```bash
# All administrate tests
python manage.py test apps.administrate --verbosity=2

# Specific test modules
python manage.py test apps.administrate.tests.test_sync_course_templates
python manage.py test apps.administrate.tests.test_sync_all
python manage.py test apps.administrate.tests.test_event_importer
python manage.py test apps.administrate.tests.test_sync_helpers

# With coverage
python manage.py test apps.administrate --coverage
```

## Verification Checklist

After implementation, verify:

- [ ] `python manage.py verify_schema_placement` passes (no unquoted db_table issues)
- [ ] `python manage.py sync_all --debug` runs all 7 commands without errors
- [ ] `adm.course_templates` records have `tutorial_course_template_id` populated for matching records
- [ ] `adm.locations` records have `tutorial_location_id` populated
- [ ] `adm.venues` records have `tutorial_venue_id` populated
- [ ] `adm.instructors` records have `tutorial_instructor_id` populated
- [ ] Unmatched records are reported in discrepancy output
- [ ] `--no-prompt` skips all interactive prompts
- [ ] Event importer creates `acted.tutorial_events` records
- [ ] Event importer creates `acted.tutorial_sessions` records with M2M instructors
- [ ] `adm.events` records have `tutorial_event_id` populated after import
- [ ] API failure leaves tutorial records intact

## Key Files

| File | Purpose |
|------|---------|
| `administrate/models/events.py` | Event model with new `tutorial_event` FK |
| `administrate/utils/sync_helpers.py` | Shared matching/reporting/prompting utilities |
| `administrate/utils/event_importer.py` | Dual-write event importer |
| `administrate/management/commands/sync_all.py` | Master sync orchestrator |
| `administrate/management/commands/sync_*.py` | Individual sync commands (7 total) |
