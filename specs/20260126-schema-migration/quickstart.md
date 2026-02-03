# Quickstart: Schema Migration to Acted Schema

**Feature**: 20260126-schema-migration
**Date**: 2026-01-26

## Prerequisites

1. PostgreSQL database with `acted` schema already created
2. Django virtual environment activated
3. Database backup completed (recommended)

## Migration Steps

### 1. Pre-Migration Verification

```bash
# Navigate to backend directory
cd backend/django_Admin3

# Activate virtual environment
.\.venv\Scripts\activate  # Windows
source .venv/bin/activate  # macOS/Linux

# Verify current table locations
python manage.py dbshell
```

```sql
-- Check tables in public schema
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'acted_%';

-- Check acted schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'acted';
```

### 2. Run Migrations

```bash
# Apply all migrations (in dependency order)
python manage.py migrate userprofile
python manage.py migrate students
python manage.py migrate rules_engine
python manage.py migrate marking
python manage.py migrate tutorials
```

### 3. Post-Migration Verification

```bash
python manage.py dbshell
```

```sql
-- Verify tables moved to acted schema
SELECT tablename FROM pg_tables WHERE schemaname = 'acted';

-- Verify no acted_* tables remain in public schema
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'acted_%';
```

### 4. Django Verification

```bash
# Run Django system checks
python manage.py check

# Verify ORM queries work
python manage.py shell
```

```python
# Test queries for each model
from marking.models import MarkingPaper
from tutorials.models import TutorialEvent
from rules_engine.models import ActedRule, ActedRulesFields, ActedRuleExecution
from students.models import Student
from userprofile.models import UserProfile

# Should return counts without error
print(f"MarkingPaper: {MarkingPaper.objects.count()}")
print(f"TutorialEvent: {TutorialEvent.objects.count()}")
print(f"ActedRule: {ActedRule.objects.count()}")
print(f"Student: {Student.objects.count()}")
print(f"UserProfile: {UserProfile.objects.count()}")
```

### 5. Run Tests

```bash
# Run full test suite
python manage.py test

# Run specific app tests
python manage.py test marking
python manage.py test tutorials
python manage.py test rules_engine
python manage.py test students
python manage.py test userprofile
```

## Rollback Procedure

If migration fails or needs to be reverted:

```bash
# Rollback each app (reverse order)
python manage.py migrate tutorials <previous_migration_name>
python manage.py migrate marking <previous_migration_name>
python manage.py migrate rules_engine <previous_migration_name>
python manage.py migrate students <previous_migration_name>
python manage.py migrate userprofile <previous_migration_name>
```

## Troubleshooting

### Error: Table already exists in acted schema

```sql
-- Check for conflicts
SELECT tablename FROM pg_tables WHERE schemaname = 'acted' AND tablename IN (
    'marking_paper', 'tutorial_events', 'rules', 'rules_fields',
    'rule_executions', 'rule_entry_points', 'rules_message_templates',
    'students', 'user_profile', 'user_profile_email',
    'user_profile_address', 'user_profile_contact_number'
);
```

### Error: Foreign key constraint violation

Ensure migrations run in correct order (userprofile and students first, then apps with external dependencies).

### Error: Permission denied

Ensure the database user has `ALTER` privileges on the tables and `USAGE` on the `acted` schema:

```sql
GRANT USAGE ON SCHEMA acted TO your_db_user;
GRANT ALL ON ALL TABLES IN SCHEMA acted TO your_db_user;
```
