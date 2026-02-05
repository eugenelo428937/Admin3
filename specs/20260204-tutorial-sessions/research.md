# Research: Tutorial Sessions and Schema Migration

**Feature**: 20260204-tutorial-sessions
**Date**: 2026-02-04

## 1. Schema Migration Approach

### Decision
Use Django's `SeparateDatabaseAndState` with `ALTER TABLE SET SCHEMA` for any tables requiring migration.

### Rationale
- Established pattern already exists in `tutorials/migrations/0002_migrate_to_acted_schema.py`
- `ALTER TABLE SET SCHEMA` is the PostgreSQL-native approach for moving tables between schemas
- `SeparateDatabaseAndState` allows database operations to be independent of Django's model state tracking
- Idempotent behavior achieved by checking if table exists in target schema first

### Alternatives Considered
1. **Recreate tables with data copy**: Rejected - slower, risk of data loss, unnecessary complexity
2. **Direct SQL outside Django**: Rejected - loses migration tracking and reversibility

### Important Finding
The administrate models' initial migration (`0001_initial.py`) already specifies `db_table` with `adm.` prefix. Tables may already exist in the correct schema. The migration should:
- Check if tables exist in `public` schema before attempting migration
- Skip migration gracefully if tables already in `adm` schema
- Use conditional SQL to ensure idempotency

### Migration Template
```python
migrations.SeparateDatabaseAndState(
    database_operations=[
        migrations.RunSQL(
            sql='''
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables
                               WHERE table_schema = 'public' AND table_name = '{table}') THEN
                        ALTER TABLE public.{table} SET SCHEMA adm;
                    END IF;
                END $$;
            ''',
            reverse_sql='ALTER TABLE adm.{table} SET SCHEMA public;',
        ),
    ],
    state_operations=[]  # No state change needed - models already reference adm schema
)
```

## 2. TutorialSessions Model Design

### Decision
Create TutorialSessions model in `acted` schema with BigAutoField primary key and foreign key to TutorialEvents using `on_delete=CASCADE`.

### Rationale
- `acted` schema is consistent with existing TutorialEvents model
- BigAutoField matches existing model patterns and handles large datasets
- CASCADE delete ensures referential integrity (sessions belong to events)
- Unique constraint on (tutorial_event, sequence) enforces ordering uniqueness

### Field Type Decisions

| Field | Type | Max Length | Rationale |
|-------|------|------------|-----------|
| title | CharField | 255 | Standard for display names |
| location | CharField | 255 | Match Location.name pattern |
| venue | CharField | 255 | Match Venue.name pattern |
| url | URLField | 500 | Accommodate long URLs for video conferencing |
| sequence | PositiveIntegerField | - | Ensures positive ordering values |
| start_date | DateTimeField | - | Precise scheduling |
| end_date | DateTimeField | - | Precise scheduling |

### Model Validation
```python
def clean(self):
    if self.start_date and self.end_date and self.start_date > self.end_date:
        raise ValidationError("Start date cannot be after end date")
```

## 3. Serializer Integration Pattern

### Decision
Add nested sessions serialization to existing `_serialize_tutorial_events` method in `search/serializers.py`.

### Rationale
- Keeps tutorial event serialization logic centralized
- Follows existing pattern of nested data within events
- Requires only adding prefetch_related for performance

### Implementation Pattern
```python
# In StoreProductListSerializer._serialize_tutorial_events
for event in store_product.tutorial_events.all():
    events.append({
        'id': event.id,
        # ... existing fields ...
        'sessions': [
            {
                'id': session.id,
                'title': session.title,
                'location': session.location,
                'venue': session.venue,
                'start_date': session.start_date.isoformat(),
                'end_date': session.end_date.isoformat(),
                'sequence': session.sequence,
                'url': session.url,
            }
            for session in event.sessions.all().order_by('sequence')
        ]
    })
```

### Performance Optimization
Add prefetch_related for sessions when querying store products with tutorial events:
```python
store_products.prefetch_related(
    'tutorial_events__sessions'  # Prefetch sessions to avoid N+1
)
```

## 4. Testing Strategy

### Decision
Follow TDD with tests for: model validation, cascade deletion, serializer output, migration idempotency.

### Test Categories

1. **Model Tests** (`tutorials/tests/test_models.py`)
   - TutorialSessions CRUD operations
   - Date validation (start_date < end_date)
   - Unique constraint on (tutorial_event, sequence)
   - Cascade delete behavior

2. **Serializer Tests** (`tutorials/tests/test_sessions_serializer.py`)
   - Sessions included in API response
   - Sessions ordered by sequence
   - Empty sessions array for events without sessions
   - All required fields present in output

3. **Migration Tests** (`administrate/tests/test_migrations.py`)
   - Idempotent migration (safe to run twice)
   - Data preservation verification
   - Foreign key constraints preserved

## 5. Dependencies and Ordering

### Execution Order
1. Schema migration (administrate tables) - can run independently
2. TutorialSessions model creation - can run after #1 or independently
3. Serializer update - requires #2 to be complete

### No External Dependencies
- All changes are within Django ORM
- No new packages required
- No external API integrations

## Summary

All NEEDS CLARIFICATION items resolved. Technical approach validated against existing codebase patterns:

| Item | Resolution |
|------|------------|
| Schema migration approach | Use SeparateDatabaseAndState with conditional SQL |
| TutorialSessions schema | `acted` schema, consistent with TutorialEvents |
| String field lengths | 255 chars (standard), 500 for URL |
| Serializer integration | Extend existing `_serialize_tutorial_events` |
| Performance | prefetch_related for sessions |
