# ADM Schema Migration Fix & Test Infrastructure Hardening

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the broken `adm` schema migration so tables actually reside in the `adm` PostgreSQL schema, standardize `db_table` format project-wide, remove SQLite from testing in favour of PostgreSQL, add post-migration verification and logged conditional operations, and update the `.specify/` task generation templates.

**Architecture:** Rewrite `administrate/migrations/0003` to rename literal-dot tables (`"adm.course_templates"`) into proper schema-qualified tables (`"adm"."course_templates"`). Standardize all `db_table` values to `'"schema"."table"'` quoted format. Replace SQLite test infrastructure with PostgreSQL-only testing. Add a reusable `verify_schema_placement` management command and a `MIGRATION_ASSERT_MODE` setting.

**Tech Stack:** Python 3.14, Django 6.0, PostgreSQL, psycopg2-binary, pytest-django

**Reference:** [Root Cause Analysis](../adm-schema-migration-root-cause-analysis.md)

---

## Inventory of All Changes

| Area | Files | Nature |
|------|-------|--------|
| Migration fix | `administrate/migrations/0003_migrate_to_adm_schema.py` | Rewrite |
| Migration fix | `administrate/migrations/0004_alter_customfield_roles_to_jsonfield.py` | Update SQL identifiers |
| Model standardization | 7 model files in `administrate/models/` | Change `db_table` format |
| Test infrastructure | `django_Admin3/settings/test.py` | Switch to PostgreSQL |
| Test infrastructure | `django_Admin3/test_runner.py` | Remove `SQLiteSchemaTestRunner` |
| Test infrastructure | `conftest.py` | Remove schema-stripping logic |
| Verification | New: `administrate/management/commands/verify_schema_placement.py` | Create |
| Settings | `django_Admin3/settings/base.py` | Add `MIGRATION_ASSERT_MODE` |
| Tests | `administrate/tests/test_migrations.py` | Rewrite to use PostgreSQL assertions |
| Templates | `.specify/templates/tasks-template.md` | Add database-level assertion guidance |
| Docs | `CLAUDE.md` | Add `db_table` convention |

---

## Phase 1: Fix Migration 0003 (The Root Cause)

**Purpose**: Rewrite the broken migration so it correctly moves literal-dot tables into the `adm` schema and renames them.

### Task 1: Write a failing test for the migration fix

**Files:**
- Modify: `backend/django_Admin3/administrate/tests/test_migrations.py`

**Step 1: Write the failing test**

Replace the proxy-based `test_all_six_tables_schema_configuration` with a PostgreSQL-level assertion. This test runs against the real PostgreSQL test database (not SQLite).

```python
from django.test import TestCase
from django.db import connection


class AdministrateSchemaMigrationTest(TestCase):
    """Test administrate models are in the adm PostgreSQL schema."""

    EXPECTED_ADM_TABLES = [
        'course_templates',
        'custom_fields',
        'instructors',
        'locations',
        'pricelevels',
        'venues',
        'course_template_price_levels',
    ]

    def test_all_tables_in_adm_schema(self):
        """Verify all administrate tables physically reside in the adm schema."""
        with connection.cursor() as cursor:
            for table in self.EXPECTED_ADM_TABLES:
                cursor.execute(
                    "SELECT 1 FROM information_schema.tables "
                    "WHERE table_schema = 'adm' AND table_name = %s",
                    [table],
                )
                result = cursor.fetchone()
                self.assertIsNotNone(
                    result,
                    f"Table '{table}' not found in adm schema. "
                    f"Check migration 0003 and db_table format.",
                )

    def test_no_literal_dot_tables_in_public(self):
        """Verify no 'adm.xxx' literal-named tables remain in public schema."""
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_name LIKE 'adm.%%'"
            )
            leftover = [row[0] for row in cursor.fetchall()]
            self.assertEqual(
                leftover, [],
                f"Literal dot-name tables still in public schema: {leftover}",
            )

    def test_venue_location_foreign_key_integrity(self):
        """Verify Venue->Location FK works after schema migration."""
        from administrate.models import Location, Venue

        location = Location.objects.create(
            external_id='LOC-FK-TEST',
            name='FK Test Location',
            code='FKT',
            active=True,
        )
        venue = Venue.objects.create(
            external_id='VEN-FK-TEST',
            name='FK Test Venue',
            location=location,
        )
        self.assertEqual(venue.location.external_id, 'LOC-FK-TEST')
        self.assertIn(venue, location.venues.all())

    def test_crud_operations_all_models(self):
        """Verify CRUD works for all six core tables after migration."""
        from administrate.models import (
            CourseTemplate, CustomField, Instructor,
            Location, PriceLevel, Venue,
        )

        Location.objects.create(external_id='L1', name='London', code='LON')
        Venue.objects.create(
            external_id='V1', name='Room A',
            location=Location.objects.get(external_id='L1'),
        )
        Instructor.objects.create(
            external_id='I1', first_name='Jane', last_name='Doe',
        )
        CourseTemplate.objects.create(
            external_id='CT1', code='CT001', title='Course 1',
        )
        CustomField.objects.create(
            external_id='CF1', label='Field 1',
            field_type='text', entity_type='event',
        )
        PriceLevel.objects.create(external_id='PL1', name='Standard')

        self.assertEqual(Location.objects.count(), 1)
        self.assertEqual(Venue.objects.count(), 1)
        self.assertEqual(Instructor.objects.count(), 1)
        self.assertEqual(CourseTemplate.objects.count(), 1)
        self.assertEqual(CustomField.objects.count(), 1)
        self.assertEqual(PriceLevel.objects.count(), 1)
```

**Step 2: Run the test to verify it fails**

```bash
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development python manage.py test administrate.tests.test_migrations -v 2
```

Expected: `test_all_tables_in_adm_schema` FAILS because tables are literal-dot-named in public schema.

**Step 3: Commit the failing test**

```bash
git add administrate/tests/test_migrations.py
git commit -m "test(administrate): add PostgreSQL schema placement assertions

RED phase — tests fail because tables use literal dot-names
in public schema instead of residing in the adm schema."
```

---

### Task 2: Standardize all administrate model `db_table` values

**Files:**
- Modify: `backend/django_Admin3/administrate/models/course_templates.py`
- Modify: `backend/django_Admin3/administrate/models/custom_fields.py`
- Modify: `backend/django_Admin3/administrate/models/instructors.py`
- Modify: `backend/django_Admin3/administrate/models/locations.py`
- Modify: `backend/django_Admin3/administrate/models/price_levels.py`
- Modify: `backend/django_Admin3/administrate/models/venues.py`
- Modify: `backend/django_Admin3/administrate/models/course_template_price_levels.py`

**Step 1: Change every `db_table` from unquoted to quoted format**

In each model file, change:

```python
# Before (broken — creates literal dot-name in public schema):
db_table = 'adm.course_templates'

# After (correct — creates table in adm schema):
db_table = '"adm"."course_templates"'
```

Complete mapping:

| Model File | Before | After |
|-----------|--------|-------|
| `course_templates.py` | `'adm.course_templates'` | `'"adm"."course_templates"'` |
| `custom_fields.py` | `'adm.custom_fields'` | `'"adm"."custom_fields"'` |
| `instructors.py` | `'adm.instructors'` | `'"adm"."instructors"'` |
| `locations.py` | `'adm.locations'` | `'"adm"."locations"'` |
| `price_levels.py` | `'adm.pricelevels'` | `'"adm"."pricelevels"'` |
| `venues.py` | `'adm.venues'` | `'"adm"."venues"'` |
| `course_template_price_levels.py` | `'adm.course_template_price_levels'` | `'"adm"."course_template_price_levels"'` |

**Step 2: Commit**

```bash
git add administrate/models/
git commit -m "refactor(administrate): standardize db_table to quoted schema format

Change from 'adm.table' (literal dot-name in public schema)
to '\"adm\".\"table\"' (proper PostgreSQL schema qualification).
Matches the pattern used by tutorials, catalog, and store apps."
```

---

### Task 3: Rewrite migration 0003 to fix the actual database

**Files:**
- Modify: `backend/django_Admin3/administrate/migrations/0003_migrate_to_adm_schema.py`

**Step 1: Rewrite the migration**

The new migration must handle **two scenarios**:
1. **Existing database** (production/dev): Tables exist as `"adm.course_templates"` (literal dot-name) in public schema — rename and move them.
2. **Fresh database** (test/CI): Tables were just created by 0001_initial as `"adm.course_templates"` in public — same operation needed.

```python
"""
Migrate administrate tables from literal dot-names in public schema
to properly schema-qualified tables in the adm schema.

Handles the fact that Django's db_table='adm.course_templates' creates
a table named "adm.course_templates" (with literal dot) in the public
schema, NOT a table named "course_templates" in the "adm" schema.

Steps per table:
  1. CREATE SCHEMA adm IF NOT EXISTS
  2. ALTER TABLE "adm.course_templates" SET SCHEMA adm;
     (moves "adm.course_templates" from public into adm schema)
  3. ALTER TABLE adm."adm.course_templates" RENAME TO course_templates;
     (strips the "adm." prefix from the table name)

After this migration, db_table should be '"adm"."course_templates"'.
"""
from django.db import migrations
from django.conf import settings


TABLES = [
    'course_templates',
    'custom_fields',
    'instructors',
    'locations',
    'pricelevels',
    'venues',
    'course_template_price_levels',
]


def make_forward_sql(table_name):
    """Move literal-dot table from public to adm schema and fix its name.

    The table currently exists as "adm.{table_name}" in the public schema.
    We need to:
      1. Move it to the adm schema
      2. Rename it to strip the 'adm.' prefix
    """
    literal_name = f'adm.{table_name}'  # Current literal table name
    assert_mode = getattr(settings, 'MIGRATION_ASSERT_MODE', False)

    if assert_mode:
        # In assert mode (CI/test), RAISE EXCEPTION if table not found
        else_clause = f"""
                RAISE EXCEPTION 'MIGRATION VERIFICATION FAILED: '
                    'Table "adm.{table_name}" not found in public schema. '
                    'Cannot migrate to adm schema.';
        """
    else:
        # In production mode, log warning and skip
        else_clause = f"""
                RAISE WARNING 'Table "adm.{table_name}" not found in public schema — skipping migration to adm schema';
        """

    return f"""
        -- Ensure adm schema exists
        CREATE SCHEMA IF NOT EXISTS adm;

        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = '{literal_name}'
            ) THEN
                -- Move literal-dot table from public to adm schema
                ALTER TABLE public."{literal_name}" SET SCHEMA adm;
                -- Rename to strip the 'adm.' prefix
                ALTER TABLE adm."{literal_name}" RENAME TO {table_name};
                RAISE NOTICE 'Moved and renamed "adm.{table_name}" -> adm.{table_name}';
            ELSIF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'adm'
                  AND table_name = '{table_name}'
            ) THEN
                -- Already in correct location (idempotent)
                RAISE NOTICE 'Table {table_name} already in adm schema — skipping';
            ELSE
                {else_clause}
            END IF;
        END $$;
    """


def make_reverse_sql(table_name):
    """Move table back from adm schema to public as literal-dot name."""
    literal_name = f'adm.{table_name}'
    return f"""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'adm'
                  AND table_name = '{table_name}'
            ) THEN
                ALTER TABLE adm.{table_name} RENAME TO "{literal_name}";
                ALTER TABLE adm."{literal_name}" SET SCHEMA public;
                RAISE NOTICE 'Reversed: adm.{table_name} -> public."{literal_name}"';
            END IF;
        END $$;
    """


def verify_migration(apps, schema_editor):
    """Post-migration verification: all tables must be in adm schema."""
    if schema_editor.connection.vendor != 'postgresql':
        return  # Skip on non-PostgreSQL backends

    with schema_editor.connection.cursor() as cursor:
        for table in TABLES:
            cursor.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = 'adm' AND table_name = %s",
                [table],
            )
            if not cursor.fetchone():
                raise RuntimeError(
                    f"MIGRATION VERIFICATION FAILED: "
                    f"Table '{table}' not found in adm schema after migration!"
                )


class Migration(migrations.Migration):

    dependencies = [
        ('administrate', '0002_alter_customfield_external_id'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql=make_forward_sql(table),
                    reverse_sql=make_reverse_sql(table),
                )
                for table in TABLES
            ],
            state_operations=[],
        ),
        # Post-migration verification step
        migrations.RunPython(verify_migration, migrations.RunPython.noop),
    ]
```

**Step 2: Run the test to verify it passes**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development python manage.py test administrate.tests.test_migrations -v 2
```

Expected: `test_all_tables_in_adm_schema` PASSES. `test_no_literal_dot_tables_in_public` PASSES.

**Step 3: Commit**

```bash
git add administrate/migrations/0003_migrate_to_adm_schema.py
git commit -m "fix(administrate): rewrite migration 0003 to properly move tables to adm schema

Root cause: literal dot-name tables ('adm.X') in public schema were never
moved because IF EXISTS checked for plain name ('X') which didn't exist.

New migration:
- Finds literal 'adm.X' tables in public schema
- Moves to adm schema via ALTER TABLE SET SCHEMA
- Renames to strip 'adm.' prefix
- Adds RAISE NOTICE/WARNING logging
- Adds post-migration RunPython verification
- Supports MIGRATION_ASSERT_MODE for CI/test"
```

---

### Task 4: Update migration 0004 to use schema-qualified identifiers

**Files:**
- Modify: `backend/django_Admin3/administrate/migrations/0004_alter_customfield_roles_to_jsonfield.py`

**Step 1: Update the SQL to reference the table in adm schema**

```python
# Before (references literal dot-name in public):
sql=(
    'ALTER TABLE "adm.custom_fields" '
    'ALTER COLUMN "roles" TYPE jsonb '
    'USING array_to_json("roles")::jsonb'
),
reverse_sql=(
    'ALTER TABLE "adm.custom_fields" '
    'ALTER COLUMN "roles" TYPE varchar[] '
    "USING ARRAY(SELECT jsonb_array_elements_text(\"roles\"))"
),

# After (references table in adm schema):
sql=(
    'ALTER TABLE "adm"."custom_fields" '
    'ALTER COLUMN "roles" TYPE jsonb '
    'USING array_to_json("roles")::jsonb'
),
reverse_sql=(
    'ALTER TABLE "adm"."custom_fields" '
    'ALTER COLUMN "roles" TYPE varchar[] '
    "USING ARRAY(SELECT jsonb_array_elements_text(\"roles\"))"
),
```

Also update the comment in the file from:
```python
# Use "adm.custom_fields" (single identifier) to match
# how Django quotes db_table='adm.custom_fields'.
# NOT "adm"."custom_fields" which would be schema-qualified.
```
To:
```python
# Use "adm"."custom_fields" (schema-qualified) to match
# the corrected db_table='"adm"."custom_fields"' format.
```

**Step 2: Run tests**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development python manage.py test administrate.tests.test_migrations -v 2
```

**Step 3: Commit**

```bash
git add administrate/migrations/0004_alter_customfield_roles_to_jsonfield.py
git commit -m "fix(administrate): update migration 0004 SQL to use schema-qualified identifiers

Now that migration 0003 properly moves tables to adm schema,
0004 must reference 'adm'.'custom_fields' instead of 'adm.custom_fields'."
```

---

## Phase 2: Remove SQLite Test Infrastructure

**Purpose**: All tests must run against PostgreSQL. Remove SQLite-specific workarounds that masked the schema bug.

### Task 5: Update `settings/test.py` to use PostgreSQL

**Files:**
- Modify: `backend/django_Admin3/django_Admin3/settings/test.py`

**Step 1: Rewrite test settings**

```python
# test.py - Test-specific settings using PostgreSQL
from .base import *

DEBUG = True
SECRET_KEY = 'test-secret-key-not-for-production'

# Use PostgreSQL for tests — same engine as production.
# Django creates a test_<NAME> database automatically.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'ACTEDDBDEV01'),
        'USER': os.environ.get('DB_USER', 'actedadmin'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'Act3d@dm1n0EEoo'),
        'HOST': os.environ.get('DB_HOST', '127.0.0.1'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# Use PostgreSQLTestRunner to handle test DB cleanup
TEST_RUNNER = 'django_Admin3.test_runner.PostgreSQLTestRunner'

# Enable assertion mode for migrations in test
MIGRATION_ASSERT_MODE = True

# Disable password hashers for faster tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Administrate API Settings (dummy for tests)
ADMINISTRATE_INSTANCE_URL = 'test.example.com'
ADMINISTRATE_API_URL = 'https://api.example.com/graphql'
ADMINISTRATE_API_KEY = 'test-key'
ADMINISTRATE_API_SECRET = 'test-secret'
ADMINISTRATE_REST_API_URL = 'https://test.example.com'
GETADDRESS_API_KEY = 'test-key'
GETADDRESS_ADMIN_KEY = 'test-key'

# Postcoder.com API Settings
POSTCODER_API_KEY = 'test-key'

# Opayo Payment Gateway Settings
OPAYO_TEST_MODE = True
OPAYO_VENDOR_NAME = 'testvendor'
OPAYO_INTEGRATION_KEY = 'test_key'
OPAYO_INTEGRATION_PASSWORD = 'test_password'

# Use dummy payment gateway
USE_DUMMY_PAYMENT_GATEWAY = True

# Fuzzy Search Configuration
FUZZY_SEARCH_MIN_SCORE = 45

# Email settings
USE_SENDGRID = False
USE_INTERNAL_SMTP = False
EMAIL_FROM_NAME = 'Test'
DEFAULT_REPLY_TO_EMAIL = 'test@example.com'
DEV_EMAIL_OVERRIDE = False
DEV_EMAIL_RECIPIENTS = []
EMAIL_BCC_MONITORING = False
EMAIL_BCC_RECIPIENTS = []
```

**Step 2: Commit**

```bash
git add django_Admin3/settings/test.py
git commit -m "refactor(settings): switch test.py from SQLite to PostgreSQL

SQLite masked schema placement bugs by stripping prefixes.
All tests now run against PostgreSQL to catch schema issues.
Enables MIGRATION_ASSERT_MODE for strict migration verification."
```

---

### Task 6: Remove `SQLiteSchemaTestRunner` and schema-stripping from conftest

**Files:**
- Modify: `backend/django_Admin3/django_Admin3/test_runner.py` (remove `SQLiteSchemaTestRunner` class)
- Modify: `backend/django_Admin3/conftest.py` (remove schema-stripping logic)

**Step 1: Remove `SQLiteSchemaTestRunner` from test_runner.py**

Keep `PostgreSQLTestRunner` intact. Remove the entire `SQLiteSchemaTestRunner` class (lines ~100-151).

**Step 2: Simplify conftest.py**

Replace the schema-stripping `pytest_configure` with a minimal version:

```python
"""Root conftest.py for pytest-django."""
import django
from django.conf import settings


def pytest_configure(config):
    """Verify PostgreSQL is being used for tests."""
    db_engine = settings.DATABASES.get('default', {}).get('ENGINE', '')
    if 'sqlite' in db_engine:
        raise RuntimeError(
            "SQLite is no longer supported for testing. "
            "Use DJANGO_SETTINGS_MODULE=django_Admin3.settings.test "
            "which configures PostgreSQL."
        )
```

**Step 3: Run full backend test suite**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest backend/django_Admin3/ -v --tb=short 2>&1 | head -100
```

Expected: Tests run against PostgreSQL. Schema-related tests now validate real DB state.

**Step 4: Commit**

```bash
git add django_Admin3/test_runner.py conftest.py
git commit -m "refactor(tests): remove SQLite test infrastructure

- Remove SQLiteSchemaTestRunner (no longer needed)
- Remove schema-stripping from conftest.py
- Add guard that rejects SQLite backend for tests
- All tests now run against PostgreSQL exclusively"
```

---

### Task 7: Update CI settings

**Files:**
- Modify: `backend/django_Admin3/django_Admin3/settings/ci.py`

**Step 1: Add `MIGRATION_ASSERT_MODE` and test runner**

Add to `ci.py`:

```python
# Enable assertion mode — migrations raise exceptions instead of skipping
MIGRATION_ASSERT_MODE = True

# Use PostgreSQLTestRunner for reliable test DB management
TEST_RUNNER = 'django_Admin3.test_runner.PostgreSQLTestRunner'
```

**Step 2: Commit**

```bash
git add django_Admin3/settings/ci.py
git commit -m "feat(ci): enable MIGRATION_ASSERT_MODE and PostgreSQLTestRunner

CI migrations will now raise exceptions instead of silently
skipping conditional operations that don't find expected tables."
```

---

## Phase 3: Post-Migration Verification Command

**Purpose**: Create a reusable management command that verifies all tables are in their expected schemas.

### Task 8: Create `verify_schema_placement` management command

**Files:**
- Create: `backend/django_Admin3/administrate/management/commands/verify_schema_placement.py`

**Step 1: Write a failing test**

Create test at `backend/django_Admin3/administrate/tests/test_verify_schema_command.py`:

```python
from io import StringIO

from django.core.management import call_command
from django.test import TestCase


class VerifySchemaPlacementTest(TestCase):
    """Test the verify_schema_placement management command."""

    def test_command_succeeds_when_tables_in_correct_schema(self):
        """Command exits 0 when all tables are correctly placed."""
        out = StringIO()
        call_command('verify_schema_placement', stdout=out)
        output = out.getvalue()
        self.assertIn('All tables verified', output)

    def test_command_json_output(self):
        """Command supports --json output format."""
        out = StringIO()
        call_command('verify_schema_placement', '--json', stdout=out)
        import json
        result = json.loads(out.getvalue())
        self.assertTrue(result['ok'])
        self.assertEqual(len(result['errors']), 0)
```

**Step 2: Run test to verify it fails**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/test_verify_schema_command.py -v
```

Expected: FAIL — command doesn't exist yet.

**Step 3: Implement the management command**

```python
"""
Management command to verify all tables are in their expected PostgreSQL schemas.

Usage:
    python manage.py verify_schema_placement          # Human-readable output
    python manage.py verify_schema_placement --json    # JSON output (for CI)
    python manage.py verify_schema_placement --fix     # Show fix commands for misplaced tables
"""
import json
import sys

from django.core.management.base import BaseCommand
from django.db import connection


# Expected schema placements — add new tables here as they're created
EXPECTED_SCHEMAS = {
    'adm': [
        'course_templates',
        'custom_fields',
        'instructors',
        'locations',
        'pricelevels',
        'venues',
        'course_template_price_levels',
    ],
    'acted': [
        'tutorial_events',
        'tutorial_sessions',
        'catalog_exam_sessions',
        'catalog_subjects',
        'catalog_products',
        'catalog_product_variations',
        'catalog_product_product_variations',
        'catalog_product_product_groups',
        'catalog_product_bundles',
        'catalog_product_bundle_products',
        'catalog_exam_session_subjects',
        'products',
        'prices',
        'bundles',
        'bundle_products',
    ],
}


class Command(BaseCommand):
    help = 'Verify all tables are in their expected PostgreSQL schemas.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--json', action='store_true',
            help='Output results as JSON',
        )
        parser.add_argument(
            '--fix', action='store_true',
            help='Show SQL commands to fix misplaced tables',
        )

    def handle(self, *args, **options):
        if connection.vendor != 'postgresql':
            self.stderr.write(
                'This command requires PostgreSQL. '
                f'Current backend: {connection.vendor}'
            )
            sys.exit(1)

        errors = []
        verified = []

        with connection.cursor() as cursor:
            for schema, tables in EXPECTED_SCHEMAS.items():
                for table in tables:
                    cursor.execute(
                        "SELECT 1 FROM information_schema.tables "
                        "WHERE table_schema = %s AND table_name = %s",
                        [schema, table],
                    )
                    if cursor.fetchone():
                        verified.append(f'{schema}.{table}')
                    else:
                        errors.append({
                            'table': table,
                            'expected_schema': schema,
                            'fix_sql': (
                                f'ALTER TABLE public."{table}" '
                                f'SET SCHEMA {schema};'
                            ),
                        })

        if options['json']:
            self.stdout.write(json.dumps({
                'ok': len(errors) == 0,
                'verified': len(verified),
                'errors': errors,
            }))
        else:
            for v in verified:
                self.stdout.write(self.style.SUCCESS(f'  OK: {v}'))
            for e in errors:
                self.stdout.write(self.style.ERROR(
                    f'  MISSING: {e["expected_schema"]}.{e["table"]}'
                ))
                if options['fix']:
                    self.stdout.write(f'    FIX: {e["fix_sql"]}')

            if errors:
                self.stdout.write(self.style.ERROR(
                    f'\n{len(errors)} table(s) in wrong schema!'
                ))
                sys.exit(1)
            else:
                self.stdout.write(self.style.SUCCESS(
                    f'\nAll tables verified ({len(verified)} tables in correct schemas).'
                ))

```

**Step 4: Run test to verify it passes**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/test_verify_schema_command.py -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add administrate/management/commands/verify_schema_placement.py administrate/tests/test_verify_schema_command.py
git commit -m "feat(administrate): add verify_schema_placement management command

Checks information_schema.tables to verify all tables are in
their expected PostgreSQL schemas (adm, acted).
Supports --json for CI and --fix for remediation SQL."
```

---

## Phase 4: Add `MIGRATION_ASSERT_MODE` Setting

**Purpose**: Make conditional migration operations configurable between "skip silently" (production) and "raise error" (test/CI).

### Task 9: Add `MIGRATION_ASSERT_MODE` to base settings

**Files:**
- Modify: `backend/django_Admin3/django_Admin3/settings/base.py`

**Step 1: Add the setting**

Add near the bottom of `base.py`, before the commented Administrate settings:

```python
# Migration behavior for conditional operations (IF EXISTS checks).
# When True (CI/test): raise exceptions if expected tables not found.
# When False (production): log warnings and skip gracefully.
MIGRATION_ASSERT_MODE = os.environ.get('MIGRATION_ASSERT_MODE', 'false').lower() == 'true'
```

**Step 2: Commit**

```bash
git add django_Admin3/settings/base.py
git commit -m "feat(settings): add MIGRATION_ASSERT_MODE for migration verification

Defaults to False (production-safe). Set to True in test/CI settings
to make conditional migration operations raise exceptions instead
of silently skipping."
```

---

## Phase 5: Update `.specify/` Task Template

**Purpose**: Ensure future task generation includes guidance for database-level assertions.

### Task 10: Update tasks-template.md

**Files:**
- Modify: `/Users/work/Documents/Code/Admin3/.specify/templates/tasks-template.md`

**Step 1: Add schema assertion guidance**

Add a new section after the "Phase 2: Foundational" section:

```markdown
## Database Schema Assertions

**When tasks involve schema migrations or table placement:**

Tasks that create, move, or rename database tables MUST include a verification step that queries `information_schema.tables` to confirm the table is in the expected schema. Proxy assertions (CRUD operations, source code inspection) are NOT sufficient for schema-level tasks.

**Required test pattern for schema tasks:**

```python
def test_table_in_expected_schema(self):
    """Verify table physically resides in the correct PostgreSQL schema."""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = %s AND table_name = %s",
            ['expected_schema', 'table_name'],
        )
        self.assertIsNotNone(cursor.fetchone())
```

**Convention:** `db_table` values MUST use quoted format: `'"schema"."table_name"'`
- Correct: `db_table = '"adm"."course_templates"'`
- Wrong: `db_table = 'adm.course_templates'` (creates literal dot-name in public schema)
```

**Step 2: Commit**

```bash
git add .specify/templates/tasks-template.md
git commit -m "docs(specify): add schema assertion guidance to tasks template

Future task generation will include guidance for database-level
assertions when tasks involve schema migrations. Documents the
required db_table quoted format convention."
```

---

## Phase 6: Update CLAUDE.md Convention

**Purpose**: Document the `db_table` convention project-wide.

### Task 11: Add `db_table` convention to CLAUDE.md

**Files:**
- Modify: `/Users/work/Documents/Code/Admin3/CLAUDE.md`

**Step 1: Add convention section**

Add under the "## Architecture" section, after "### Backend Structure":

```markdown
### Database Schema Conventions

**Schema-qualified table names** — All models that belong to a custom PostgreSQL schema MUST use the double-quoted format:

```python
# CORRECT — creates table in the adm schema:
db_table = '"adm"."course_templates"'

# WRONG — creates literal "adm.course_templates" in public schema:
db_table = 'adm.course_templates'
```

| Schema | Apps | Example |
|--------|------|---------|
| `adm` | administrate | `'"adm"."course_templates"'` |
| `acted` | tutorials, catalog, store, marking, rules_engine, students, userprofile | `'"acted"."tutorial_events"'` |

**Testing:** All tests run against PostgreSQL (not SQLite). Schema placement is verified by `python manage.py verify_schema_placement`.

**Migration assertions:** Set `MIGRATION_ASSERT_MODE = True` in test/CI settings to make conditional migration operations raise exceptions instead of silently skipping.
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add db_table schema convention and migration assertion mode

Documents the required quoted format for schema-qualified db_table
values and the MIGRATION_ASSERT_MODE setting."
```

---

## Phase 7: Verification & Full Test Run

### Task 12: Run full backend test suite and verify

**Step 1: Run migrations on fresh test DB**

```bash
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development python manage.py test --verbosity=2 2>&1 | tail -30
```

**Step 2: Run verify_schema_placement command**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development python manage.py verify_schema_placement
```

Expected: All tables verified in correct schemas.

**Step 3: Run pytest suite**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest administrate/tests/ -v
```

Expected: All administrate tests pass.

**Step 4: Run full backend suite to check for regressions**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest -x --tb=short 2>&1 | tail -50
```

**Step 5: Commit verification results**

```bash
git commit --allow-empty -m "chore: verify full test suite passes after adm schema fix

All administrate tables confirmed in adm schema.
verify_schema_placement command reports no errors.
Full test suite passes with PostgreSQL backend."
```

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Tasks 1-4): Fix root cause — MUST be first
  ├── Task 1: Write failing test (RED)
  ├── Task 2: Standardize model db_table values
  ├── Task 3: Rewrite migration 0003 (GREEN)
  └── Task 4: Update migration 0004

Phase 2 (Tasks 5-7): Remove SQLite — depends on Phase 1
  ├── Task 5: Update settings/test.py
  ├── Task 6: Remove SQLiteSchemaTestRunner + conftest stripping
  └── Task 7: Update CI settings

Phase 3 (Task 8): Verification command — depends on Phase 1
  └── Task 8: Create verify_schema_placement command

Phase 4 (Task 9): Assert mode setting — independent
  └── Task 9: Add MIGRATION_ASSERT_MODE to base settings

Phase 5 (Task 10): Template update — independent
  └── Task 10: Update tasks-template.md

Phase 6 (Task 11): Documentation — depends on Phase 1-4
  └── Task 11: Update CLAUDE.md

Phase 7 (Task 12): Final verification — depends on ALL phases
  └── Task 12: Full test suite run
```

### Parallel Opportunities

- Tasks 2 + 9 + 10 can run in parallel (different files, no dependencies)
- Tasks 5 + 6 can run in parallel within Phase 2
- Task 8 can run in parallel with Phase 2

### Critical Ordering

1. Task 1 MUST come first (RED phase test)
2. Tasks 2 + 3 MUST complete before Task 4 (migration depends on model changes)
3. Task 3 MUST complete before Phase 2 (tests need working migration)
4. Task 12 MUST be last (verifies everything)

---

## Risk Considerations

| Risk | Mitigation |
|------|-----------|
| Existing data in production DB has literal dot-name tables | Migration 0003 handles this case explicitly with RENAME |
| Other apps reference administrate tables via FK | Django FKs use internal model references, not raw table names |
| `conftest.py` removal breaks pytest discovery | New conftest.py still exists, just validates PostgreSQL is used |
| CI pipeline breaks | CI already uses PostgreSQL (settings.ci), just adding MIGRATION_ASSERT_MODE |
| Test suite slows down (PostgreSQL vs SQLite) | Acceptable tradeoff — catches real schema bugs |

---

## Notes

- The `events.py` file in `administrate/models/` contains deprecated Event and Session classes. These are NOT imported and NOT included in this migration fix. They should be cleaned up in a separate task.
- The `ExamSessionSubjectProduct` model in catalog uses `db_table = 'acted_exam_session_subject_products'` (unquoted, no schema). This is a separate inconsistency that should be addressed in a follow-up task.
- After this plan is implemented, running `python manage.py makemigrations` should NOT generate new migrations — all changes are in existing migration files and model `db_table` values that Django doesn't track in migration state.
