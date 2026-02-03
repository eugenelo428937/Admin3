# Research: Schema Migration to Acted Schema

**Feature**: 20260126-schema-migration
**Date**: 2026-01-26

## Migration Approach

### Decision: ALTER TABLE SET SCHEMA

**Rationale**: PostgreSQL's `ALTER TABLE ... SET SCHEMA` command is the optimal approach for this migration because:

1. **Atomic operation** - The entire schema change happens in a single transaction
2. **No data movement** - Only updates PostgreSQL's system catalogs, not the actual data
3. **Preserves everything** - Indexes, constraints, sequences, and permissions are maintained
4. **FK integrity** - Foreign key relationships are automatically updated

**Alternatives Considered**:

| Alternative | Rejected Because |
|-------------|------------------|
| CREATE TABLE + INSERT + DROP | Data movement is slow and risky; requires explicit FK handling |
| pg_dump + restore | Requires downtime; complex for partial schema moves |
| Django's built-in migration | Cannot natively handle schema changes; requires raw SQL |

## Index Name Handling

### Decision: Keep existing index names

**Rationale**: PostgreSQL index names are schema-qualified internally. Moving a table to a new schema automatically moves its indexes. Index names remain valid as long as they don't exceed 63 characters.

**Verification needed**: Check that existing index names defined in models (e.g., `acted_rules_entry_active`) don't conflict after migration.

## Sequence Handling

### Decision: Sequences move automatically with tables

**Rationale**: When using `ALTER TABLE ... SET SCHEMA`, associated sequences (for auto-increment fields) are automatically moved to the new schema. The `nextval()` references are updated automatically.

## Django Migration Pattern

### Decision: One migration per app with RunSQL operations

**Rationale**: Each app should have its own migration to maintain modularity and allow independent rollback if needed.

**Pattern**:
```python
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('app_name', 'previous_migration'),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE public.old_table_name SET SCHEMA acted; "
                "ALTER TABLE acted.old_table_name RENAME TO new_table_name;",
            reverse_sql="ALTER TABLE acted.new_table_name RENAME TO old_table_name; "
                       "ALTER TABLE acted.old_table_name SET SCHEMA public;",
        ),
    ]
```

## Table Naming Convention

### Decision: Remove `acted_` prefix when moving to `acted` schema

**Rationale**: The `acted_` prefix was used to namespace tables in the `public` schema. Once tables are in the `acted` schema, the prefix is redundant:

- `public.acted_rules` → `acted.rules`
- `public.acted_user_profile` → `acted.user_profile`

This matches the convention used by catalog and store apps:
- `acted.catalog_subjects` (keeps `catalog_` prefix for domain clarity)
- `acted.products` (no prefix needed)

## Testing Strategy

### Decision: Integration tests for schema verification

**Tests Required**:
1. Verify tables exist in `acted` schema after migration
2. Verify Django ORM queries return expected data
3. Verify FK relationships resolve correctly (JOIN queries)
4. Verify rollback restores tables to `public` schema

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| Migration order matters? | No - tables being migrated don't reference each other |
| Downtime required? | Minimal - SET SCHEMA is near-instant (catalog-only change) |
| Concurrent reads during migration? | Safe - PostgreSQL handles this atomically |
