# Quickstart: Tutorial Schema Refactor

**Feature**: `20260206-tutorial-schema-refactor`
**Date**: 2026-02-06

## Prerequisites

- Python 3.14 with virtual environment activated
- PostgreSQL database accessible (ACTEDDBDEV01)
- `acted` and `adm` schemas exist in the database
- Django development server NOT running during migrations

## Implementation Order

### Step 1: Create New Models (tutorials app)

Create 5 new model files in `backend/django_Admin3/tutorials/models/`:

1. `tutorial_course_template.py` - TutorialCourseTemplate
2. `staff.py` - Staff
3. `tutorial_instructor.py` - TutorialInstructor (depends on Staff)
4. `tutorial_location.py` - TutorialLocation
5. `tutorial_venue.py` - TutorialVenue (depends on TutorialLocation)

Update `tutorials/models/__init__.py` to export all new models.

### Step 2: Generate and Run Migration for New Tables

```bash
cd backend/django_Admin3
python manage.py makemigrations tutorials
python manage.py migrate tutorials
python manage.py verify_schema_placement
```

### Step 3: Update TutorialEvents and TutorialSessions

Modify existing models to add/change FK fields:
- `tutorial_events.py`: Add instructor FK, replace venue CharField with FK, add location FK
- `tutorial_sessions.py`: Add instructor FK, replace venue/location CharFields with FKs

```bash
python manage.py makemigrations tutorials
python manage.py migrate tutorials
```

### Step 4: Add Cross-Schema FKs to ADM Models

Modify administrate models to add FK pointing to acted tables:
- `course_templates.py`: Add `tutorial_course_template` FK
- `instructors.py`: Add `tutorial_instructor` FK
- `locations.py`: Add `tutorial_location` FK
- `venues.py`: Add `tutorial_venue` FK

```bash
python manage.py makemigrations administrate
python manage.py migrate administrate
```

### Step 5: Data Migration

Create a data migration in tutorials app:

```bash
python manage.py makemigrations tutorials --empty --name data_migration_adm_to_acted
```

Then implement the forward migration function to:
1. Copy locations (adm → acted)
2. Copy venues (adm → acted, mapping location FK)
3. Copy course templates (adm → acted)
4. Create staff + instructors (adm → acted)
5. Set cross-schema FKs on all adm records

```bash
python manage.py migrate tutorials
```

### Step 6: Remove Redundant ADM Columns

Remove fields from administrate models and generate migration:

```bash
python manage.py makemigrations administrate
python manage.py migrate administrate
```

### Step 7: Update verify_schema_placement

Add 5 new table names to the `EXPECTED_SCHEMAS['acted']` list in `verify_schema_placement.py`.

```bash
python manage.py verify_schema_placement
```

### Step 8: Run Tests

```bash
python manage.py test tutorials
python manage.py test administrate
python manage.py test  # Full test suite
```

## Verification Commands

```bash
# Verify all tables in correct schemas
python manage.py verify_schema_placement

# Check migration status
python manage.py showmigrations tutorials
python manage.py showmigrations administrate

# Verify data migration counts (Django shell)
python manage.py shell -c "
from tutorials.models import *
print(f'Course Templates: {TutorialCourseTemplate.objects.count()}')
print(f'Staff: {Staff.objects.count()}')
print(f'Instructors: {TutorialInstructor.objects.count()}')
print(f'Locations: {TutorialLocation.objects.count()}')
print(f'Venues: {TutorialVenue.objects.count()}')
"
```

## Key Patterns to Follow

**db_table format** (double-quoted):
```python
class Meta:
    db_table = '"acted"."tutorial_locations"'
```

**FK with SET_NULL**:
```python
instructor = models.ForeignKey(
    'tutorials.TutorialInstructor',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='events'
)
```

**Cross-schema FK (adm → acted)**:
```python
tutorial_location = models.ForeignKey(
    'tutorials.TutorialLocation',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='adm_locations'
)
```
