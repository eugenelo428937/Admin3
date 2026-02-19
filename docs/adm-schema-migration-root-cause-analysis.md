# Root Cause Analysis: `adm` Schema Tables Not Created

**Date**: 2026-02-05
**Branch**: `20260204-tutorial-sessions`
**Status**: Tasks T004-T011 (US1) marked complete, but `adm` schema contains zero tables

---

## 1. Symptom

Tasks T004-T011 in `specs/20260204-tutorial-sessions/tasks.md` (US1 — Schema Migration for Administrate Tables) are all marked `[x]` complete. However, inspecting the PostgreSQL database reveals:

```
adm schema exists:        YES
Tables IN adm schema:     0
```

The six administrate tables were never moved into the `adm` schema.

---

## 2. Evidence

### 2.1 Database State (Development DB: ACTEDDBDEV01)

```sql
-- Tables are physically in the PUBLIC schema with literal dot-in-name identifiers
SELECT table_schema, table_name FROM information_schema.tables
WHERE table_name LIKE 'adm.%';

-- Result:
--  schema=public, table=adm.course_templates
--  schema=public, table=adm.custom_fields
--  schema=public, table=adm.instructors
--  schema=public, table=adm.locations
--  schema=public, table=adm.pricelevels
--  schema=public, table=adm.venues
```

### 2.2 Migration History (All Applied Successfully)

```
administrate.0001_initial
administrate.0002_alter_customfield_external_id
administrate.0003_migrate_to_adm_schema          ← silently did nothing
administrate.0004_alter_customfield_roles_to_jsonfield
```

### 2.3 How Django Interprets `db_table`

```python
# In administrate/models — what's defined:
class CourseTemplate(models.Model):
    class Meta:
        db_table = 'adm.course_templates'

# Django generates SQL:
CREATE TABLE "adm.course_templates" ( ... );
# ↑ This is a SINGLE quoted identifier in the PUBLIC schema
# ↑ NOT schema-qualified (that would be "adm"."course_templates")
```

Compare with the `acted` schema pattern used by tutorials/catalog:

```python
# In tutorials/models — correct pattern:
class TutorialEvents(models.Model):
    class Meta:
        db_table = '"acted"."tutorial_events"'
# Django generates: CREATE TABLE "acted"."tutorial_events" ( ... );
# ↑ This IS schema-qualified — table created IN the acted schema
```

---

## 3. Root Cause Chain

### Cause 1: `db_table` Format Mismatch (Primary)

The `administrate` app uses `db_table = 'adm.table_name'` which Django treats as a **literal table name with a dot**. It does NOT place the table in the `adm` schema.

| App | `db_table` Value | Django SQL | Actual Location |
|-----|-----------------|------------|-----------------|
| administrate | `'adm.course_templates'` | `CREATE TABLE "adm.course_templates"` | `public."adm.course_templates"` |
| tutorials | `'"acted"."tutorial_events"'` | `CREATE TABLE "acted"."tutorial_events"` | `acted.tutorial_events` |

### Cause 2: Migration 0003 Checks Wrong Table Name

`administrate/migrations/0003_migrate_to_adm_schema.py` contains:

```python
def make_forward_sql(table_name):
    return f"""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = '{table_name}'
                -- ↑ Checks for 'course_templates' (plain name)
            ) THEN
                ALTER TABLE public.{table_name} SET SCHEMA adm;
            END IF;
        END $$;
    """
```

This checks for `table_name = 'course_templates'` in the public schema, but the actual table name is `'adm.course_templates'`. The `IF EXISTS` returns **FALSE** for all 7 tables, so the migration **silently does nothing**.

### Cause 3: Silent Failure by Design

The `IF EXISTS` / `DO $$ BEGIN ... END $$` pattern was intentionally idempotent — if the table isn't found, it skips silently. There's no `ELSE RAISE NOTICE` or logging to indicate that zero tables were moved.

---

## 4. Why Tests Didn't Catch This

| Test (from tasks.md) | What It Tested | Why It Passed | What It Should Have Tested |
|----------------------|---------------|---------------|---------------------------|
| **T004** (idempotency) | CRUD operations work | Django queries `"adm.course_templates"` in public — works fine | Migration applies without error on fresh DB + tables accessible |
| **T005** (6 tables in adm) | Python source contains `'adm.course_templates'` | Source inspection finds the string | `information_schema.tables WHERE table_schema = 'adm'` on PostgreSQL |
| **T006** (FK integrity) | Venue→Location FK works | Both tables in public schema, FK intact | FK works + both tables in `adm` schema |
| **T007** (RED phase) | Tests fail before implementation | They did fail initially | N/A — correct |
| **T010** (GREEN phase) | Tests pass after implementation | Proxy tests pass | Should include PostgreSQL schema verification |
| **T011** (full suite) | No regressions | All existing tests still pass | Should include schema placement check |

### The Fundamental Gap

**SQLite (pytest) cannot test PostgreSQL schemas.** The `conftest.py` and `SQLiteSchemaTestRunner` strip schema prefixes, making schema-related bugs invisible to the test suite.

**PostgreSQL tests (`manage.py test`) run migrations on a fresh DB.** In a fresh DB, `0001_initial` creates tables as `"adm.table_name"` in public — migration 0003 then looks for plain `table_name` which doesn't exist. The migration was designed for a **production database** where tables might already exist with plain names in public.

---

## 5. Contributing Factors

### 5.1 Two Incompatible Schema Patterns in Codebase

```
acted schema: db_table = '"acted"."table_name"'    ← Correct PostgreSQL schema qualification
adm schema:   db_table = 'adm.table_name'          ← Literal dot-in-name (NOT schema-qualified)
```

These patterns look similar but behave completely differently. Without explicit documentation of the difference, it's easy to assume both work the same way.

### 5.2 No PostgreSQL-Specific CI Validation

The CI pipeline runs SQLite tests (fast, no DB setup) but doesn't validate schema placement against a real PostgreSQL instance. Schema-level bugs are structurally invisible to the test infrastructure.

### 5.3 TDD Tests Targeted Proxy Assertions

The TDD RED/GREEN cycle was satisfied by tests that checked CRUD operations and source code strings — valid proxy assertions for "model works" but not for "table is in the correct schema."

---

## 6. Immediate Fix Required

### Option A: Change `db_table` to Match `acted` Pattern (Recommended)

Standardize all administrate models to use proper schema-qualified `db_table`:

```python
# Before (broken):
db_table = 'adm.course_templates'

# After (correct):
db_table = '"adm"."course_templates"'
```

Then rewrite migration 0003 to rename the literal-dot tables:

```sql
-- Move literal-named table to adm schema and fix the name
ALTER TABLE "adm.course_templates" SET SCHEMA adm;
ALTER TABLE adm."adm.course_templates" RENAME TO course_templates;
```

### Option B: Keep Literal Names, Skip Schema Migration

Accept that `adm` tables live in public schema with `"adm."` prefix names. Remove migration 0003 (or make it a no-op) and document this as intentional. This avoids breaking existing data but diverges from the spec.

---

## 7. Systematic Prevention Recommendations

### 7.1 Standardize `db_table` Format

Create a project convention documented in `CLAUDE.md`:

```
Schema-qualified tables MUST use: db_table = '"schema"."table_name"'
NEVER use: db_table = 'schema.table_name' (creates literal dot-in-name)
```

### 7.2 Add PostgreSQL Schema Verification to CI

Add a CI step (or management command) that:
1. Runs `python manage.py migrate` on a fresh PostgreSQL DB
2. Queries `information_schema.tables` to verify expected schema placements
3. Fails the build if any table is in the wrong schema

```python
# Example: verify_schema_placement management command
EXPECTED_SCHEMAS = {
    'adm': ['course_templates', 'custom_fields', 'instructors', ...],
    'acted': ['tutorial_events', 'tutorial_sessions', 'products', ...],
}
for schema, tables in EXPECTED_SCHEMAS.items():
    for table in tables:
        cursor.execute(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = %s AND table_name = %s",
            [schema, table]
        )
        assert cursor.fetchone(), f"Table {table} not found in {schema} schema!"
```

### 7.3 Add Verification Assertions to Schema Migrations

Every schema migration should end with a `RunPython` verification step:

```python
def verify_migration(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        return  # Skip on SQLite
    with schema_editor.connection.cursor() as c:
        for table in TABLES:
            c.execute(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_schema = 'adm' AND table_name = %s", [table]
            )
            if not c.fetchone():
                raise RuntimeError(
                    f"MIGRATION VERIFICATION FAILED: "
                    f"Table '{table}' not found in adm schema!"
                )
```

### 7.4 Log Conditional Migration Operations

Replace silent `IF EXISTS` skips with logged operations:

```sql
DO $$
BEGIN
    IF EXISTS (...) THEN
        ALTER TABLE ...;
        RAISE NOTICE 'Moved table % to adm schema', table_name;
    ELSE
        RAISE WARNING 'Table % not found in public schema — skipping', table_name;
    END IF;
END $$;
```

### 7.5 Task Specifications Should Require Database-Level Assertions

For schema-related tasks, the task spec should explicitly require querying `information_schema` against a real PostgreSQL database, not just proxy assertions (CRUD, source inspection).

Example improved task:
```
T005 [US1] Write migration data preservation test:
  - On PostgreSQL: query information_schema.tables to verify all six
    tables exist in 'adm' schema (not just in any schema)
  - On SQLite: verify CRUD operations work (schema not applicable)
```

---

## 8. Summary

| Aspect | Detail |
|--------|--------|
| **Root Cause** | `db_table = 'adm.table_name'` creates literal dot-name in public schema, not in `adm` schema |
| **Why Silent** | `IF EXISTS` in migration 0003 checked wrong table name, skipped silently |
| **Why Tests Passed** | Tested CRUD (works regardless of schema) and source code (not actual DB state) |
| **Fix** | Standardize to `'"adm"."table_name"'` format + rewrite migration 0003 |
| **Prevention** | PostgreSQL schema verification in CI + standardized `db_table` convention + logged migrations |
