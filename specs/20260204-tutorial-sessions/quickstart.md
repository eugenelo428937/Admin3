# Quickstart: Tutorial Sessions Implementation

**Feature**: 20260204-tutorial-sessions
**Date**: 2026-02-04

## Prerequisites

- Python 3.14 with Django 6.0
- PostgreSQL database with `acted` and `adm` schemas
- Backend virtual environment activated

## Development Setup

### 1. Checkout Feature Branch

```bash
git checkout 20260204-tutorial-sessions
```

### 2. Activate Environment

```bash
cd backend/django_Admin3
.\.venv\Scripts\activate  # Windows
# or
source .venv/bin/activate  # Linux/Mac
```

### 3. Verify Database Connection

```bash
python manage.py dbshell
# Then verify schemas exist:
# \dn  -- should show 'acted' and 'adm' schemas
# \q
```

## Implementation Order

Follow this sequence for TDD compliance:

### Phase 1: Schema Migration (administrate app)

1. **Write migration test** (RED)
   ```bash
   # Create test file
   touch administrate/tests/test_migrations.py
   ```

2. **Create migration** (GREEN)
   ```bash
   # Create migration file manually (not makemigrations - schema operations)
   touch administrate/migrations/0003_migrate_to_adm_schema.py
   ```

3. **Run migration**
   ```bash
   python manage.py migrate administrate
   ```

### Phase 2: TutorialSessions Model (tutorials app)

1. **Write model tests** (RED)
   ```bash
   # Add to existing test file
   # tutorials/tests/test_models.py
   ```

2. **Create model** (GREEN)
   ```bash
   touch tutorials/models/tutorial_sessions.py
   ```

3. **Update models __init__.py**
   ```python
   # tutorials/models/__init__.py
   from .tutorial_sessions import TutorialSessions
   ```

4. **Generate migration**
   ```bash
   python manage.py makemigrations tutorials
   ```

5. **Run migration**
   ```bash
   python manage.py migrate tutorials
   ```

### Phase 3: Serializer Update (search app)

1. **Write serializer tests** (RED)
   ```bash
   touch tutorials/tests/test_sessions_serializer.py
   ```

2. **Update serializer** (GREEN)
   ```python
   # search/serializers.py
   # Update _serialize_tutorial_events method
   ```

## Running Tests

### All Tutorial Tests
```bash
python manage.py test tutorials
```

### Specific Test Class
```bash
python manage.py test tutorials.tests.test_models.TutorialSessionsModelTest
```

### With Coverage
```bash
coverage run --source='tutorials' manage.py test tutorials
coverage report
```

## Verification Commands

### Check Tables in Correct Schema

```sql
-- In psql or pgAdmin
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name IN (
    'tutorial_sessions',
    'course_templates',
    'custom_fields',
    'instructors',
    'locations',
    'pricelevels',
    'venues'
);
```

### Test API Response

```bash
# Start server
python manage.py runserver 8888

# In another terminal, test unified search
curl -X POST http://127.0.0.1:8888/api/search/unified/ \
  -H "Content-Type: application/json" \
  -d '{"filters": {"product_types": ["Tutorial"]}}'
```

## Common Issues

### Migration Already Applied
If you see "table already exists", the migration may need conditional logic:
```python
# Use IF EXISTS / IF NOT EXISTS in SQL
```

### Schema Not Found
Ensure `acted` and `adm` schemas exist:
```sql
CREATE SCHEMA IF NOT EXISTS acted;
CREATE SCHEMA IF NOT EXISTS adm;
```

### Foreign Key Errors
Ensure TutorialEvents migration ran before TutorialSessions:
```bash
python manage.py showmigrations tutorials
```

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `administrate/migrations/0003_*.py` | CREATE | Schema migration |
| `administrate/tests/test_migrations.py` | CREATE | Migration tests |
| `tutorials/models/tutorial_sessions.py` | CREATE | New model |
| `tutorials/models/__init__.py` | MODIFY | Export model |
| `tutorials/serializers.py` | MODIFY | Add serializer |
| `tutorials/admin.py` | MODIFY | Register model |
| `tutorials/tests/test_models.py` | MODIFY | Model tests |
| `tutorials/tests/test_sessions_serializer.py` | CREATE | Serializer tests |
| `search/serializers.py` | MODIFY | Include sessions |

## Next Steps

After completing implementation:

1. Run full test suite: `python manage.py test`
2. Check coverage: `coverage report`
3. Create PR following commit conventions
