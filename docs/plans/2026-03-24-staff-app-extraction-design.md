# Staff App Extraction & Salutation Redesign

**Date**: 2026-03-24
**Status**: Approved

## Overview

Extract the `Staff` model from `tutorials` app into a dedicated `staff` app. Introduce `Team` and `TeamStaff` models. Redesign `ClosingSalutation` to reference proper Team/Staff models instead of string fields.

## New `staff` App Models

All tables in `acted` schema.

### acted.staff (moved from tutorials)

| Column | Type | Notes |
|--------|------|-------|
| id | AutoField | PK (preserved from existing table) |
| user | OneToOneField → auth_user | PROTECT, unchanged |
| job_title | CharField(200) | blank=True, e.g., "Senior Tutor" |
| name_format | CharField(20) | choices: full_name, first_name. Default: full_name |
| show_job_title | BooleanField | default=False. Whether to display job_title in salutations |
| created_at | DateTimeField | auto_now_add |
| updated_at | DateTimeField | auto_now |

### acted.team (new)

| Column | Type | Notes |
|--------|------|-------|
| id | AutoField | PK |
| name | CharField(100) | unique, identifier slug e.g., "acted_main" |
| display_name | CharField(200) | External-facing e.g., "THE ACTUARIAL EDUCATION COMPANY (ActEd)" |
| default_sign_off_text | CharField(200) | e.g., "Kind Regards". Inherited by salutations |
| is_active | BooleanField | default=True |
| created_at | DateTimeField | auto_now_add |
| updated_at | DateTimeField | auto_now |

### acted.team_staff (new)

| Column | Type | Notes |
|--------|------|-------|
| id | AutoField | PK |
| team | FK → staff.Team | CASCADE |
| staff | FK → staff.Staff | CASCADE |
| is_active | BooleanField | default=True |
| created_at | DateTimeField | auto_now_add |
| updated_at | DateTimeField | auto_now |
| **unique_together** | (team, staff) | |

## Revised ClosingSalutation Models (email_system)

### ClosingSalutation (revised)

| Column | Type | Notes |
|--------|------|-------|
| id | AutoField | PK (preserved) |
| name | CharField(100) | unique identifier |
| display_name | CharField(200) | human-readable label |
| sign_off_text | CharField(200) | blank=True. Falls back to team.default_sign_off_text if blank and signature_type='team' |
| signature_type | CharField(10) | choices: team, staff. Exclusive toggle |
| team | FK → staff.Team | nullable. Used when signature_type='team' |
| is_active | BooleanField | default=True |
| created_at | DateTimeField | auto_now_add |
| updated_at | DateTimeField | auto_now |

**Removed fields**: `team_signature` (replaced by team FK), `staff_name_format` (moved to Staff model)

### ClosingSalutationStaff (revised)

| Column | Type | Notes |
|--------|------|-------|
| id | AutoField | PK |
| closing_salutation | FK → ClosingSalutation | CASCADE |
| staff | FK → staff.Staff | CASCADE. Was tutorials.Staff |
| display_order | PositiveIntegerField | default=0 |
| **unique_together** | (closing_salutation, staff) | |

### Rendering Logic

```python
def get_sign_off_text(self):
    if self.sign_off_text:
        return self.sign_off_text
    if self.signature_type == 'team' and self.team:
        return self.team.default_sign_off_text
    return 'Kind Regards'  # fallback

def render_mjml(self):
    sign_off = self.get_sign_off_text()

    if self.signature_type == 'team':
        name_lines = f'<b>{escape(self.team.display_name)}</b><br/>'
    else:
        staff_entries = self.staff_members.select_related('staff__user').order_by('display_order')
        lines = []
        for entry in staff_entries:
            staff = entry.staff
            user = staff.user
            if staff.name_format == 'first_name':
                name = escape(user.first_name)
            else:
                name = escape(user.get_full_name() or user.username)
            line = f'<b>{name}</b><br/>'
            if staff.show_job_title and staff.job_title:
                line += f'{escape(staff.job_title)}<br/>'
            lines.append(line)
        name_lines = '\n      '.join(lines)

    # ... MJML template wrapping
```

### EmailTemplate

FK to `ClosingSalutation` remains unchanged.

## Migration Strategy

### Phase 1: Create staff app, move Staff model (no DB changes for staff table)

**staff/migrations/0001_initial.py**:
- `SeparateDatabaseAndState`:
  - state_operations: CreateModel Staff (with new fields job_title, name_format, show_job_title)
  - database_operations: AddField job_title, AddField name_format, AddField show_job_title (actual column additions only)

**tutorials/migrations/XXXX_remove_staff.py**:
- `SeparateDatabaseAndState`:
  - state_operations: DeleteModel Staff
  - database_operations: no-op (table stays)
- Dependencies: staff.0001_initial

### Phase 2: Create Team and TeamStaff tables

**staff/migrations/0002_team_teamstaff.py**:
- Normal CreateModel for Team → `acted.team`
- Normal CreateModel for TeamStaff → `acted.team_staff`

### Phase 3: Revise ClosingSalutation

**email_system/migrations/XXXX_revise_closing_salutation.py**:
- AddField: `team` FK (nullable)
- Data migration: Create Team records from existing `team_signature` values, link salutations
- RemoveField: `team_signature`
- RemoveField: `staff_name_format`
- AlterField: `ClosingSalutationStaff.staff` FK → `staff.Staff`

### Phase 4: Update all FK references

**tutorials/migrations/XXXX_update_instructor_fk.py**:
- AlterField: `TutorialInstructor.staff` FK → `staff.Staff`

## Files Requiring Changes

### FK/Import Updates

| File | Change |
|------|--------|
| tutorials/models/tutorial_instructor.py | FK 'tutorials.Staff' → 'staff.Staff' |
| email_system/models/closing_salutation.py | FK update, drop team_signature/staff_name_format, add team FK |
| users/serializers.py | Import Staff from staff.models |
| users/views.py | Import Staff from staff.models |
| tutorials/admin.py | Remove Staff admin registration |
| administrate/utils/event_importer.py | Import Staff from staff.models |
| administrate/tests/ | Update Staff imports |
| tutorials/tests/ | Update Staff imports |
| email_system/serializers.py | Update imports, add Team serializer support |
| pact_tests/state_handlers.py | Update Staff imports |

### New Files

| File | Purpose |
|------|---------|
| staff/__init__.py | App package |
| staff/apps.py | AppConfig |
| staff/models/__init__.py | Model exports |
| staff/models/staff.py | Staff model (with job_title, name_format, show_job_title) |
| staff/models/team.py | Team model |
| staff/models/team_staff.py | TeamStaff join model |
| staff/admin.py | Admin for Staff, Team, TeamStaff |
| staff/migrations/0001_initial.py | Move Staff + add new columns |
| staff/migrations/0002_team_teamstaff.py | Create Team, TeamStaff |

### No API Endpoint Changes

StaffViewSet stays in users app, just changes import source.
