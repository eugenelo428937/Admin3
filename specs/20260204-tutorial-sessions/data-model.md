# Data Model: Tutorial Sessions

**Feature**: 20260204-tutorial-sessions
**Date**: 2026-02-04

## Entities

### TutorialSessions (NEW)

Individual session within a tutorial event, representing a single day or occurrence within a multi-day tutorial.

**Schema**: `acted` (consistent with TutorialEvents)
**Table**: `acted.tutorial_sessions`

#### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | BigAutoField | PK, auto-generated | Primary key |
| tutorial_event | ForeignKey | NOT NULL, CASCADE | Reference to TutorialEvents |
| title | CharField(255) | NOT NULL | Session display title |
| location | CharField(255) | NOT NULL | Physical location name |
| venue | CharField(255) | NOT NULL | Venue name |
| start_date | DateTimeField | NOT NULL | Session start datetime |
| end_date | DateTimeField | NOT NULL | Session end datetime |
| sequence | PositiveIntegerField | NOT NULL | Ordering within event |
| url | URLField(500) | NULL, BLANK | Optional video/resource URL |
| created_at | DateTimeField | auto_now_add | Record creation timestamp |
| updated_at | DateTimeField | auto_now | Record update timestamp |

#### Constraints

| Constraint | Type | Fields | Description |
|------------|------|--------|-------------|
| tutorial_sessions_event_seq_unique | UNIQUE TOGETHER | (tutorial_event, sequence) | No duplicate sequences per event |
| tutorial_sessions_date_valid | CHECK | start_date, end_date | start_date <= end_date |

#### Indexes

| Index | Fields | Purpose |
|-------|--------|---------|
| tutorial_sessions_event_idx | tutorial_event_id | FK lookup optimization |
| tutorial_sessions_sequence_idx | tutorial_event_id, sequence | Ordering queries |

### TutorialEvents (EXISTING - Reference)

Existing model, no changes required. Reference for relationship understanding.

**Schema**: `acted`
**Table**: `acted.tutorial_events`

#### Relevant Fields for Relationship

| Field | Type | Description |
|-------|------|-------------|
| id | BigAutoField | Primary key (FK target) |
| code | CharField(100) | Unique event code |
| store_product | ForeignKey | Link to store.Product |

#### New Relationship

```
TutorialEvents 1 ──────< N TutorialSessions
                     (tutorial_event_id)
```

## Entity Relationship Diagram

```text
┌─────────────────────────────────────┐
│           store.Product             │
│  (id, product_code, ...)            │
└─────────────────────────────────────┘
                 │
                 │ 1:N (store_product_id)
                 ▼
┌─────────────────────────────────────┐
│       acted.tutorial_events         │
│  id (PK)                            │
│  code                               │
│  venue                              │
│  start_date, end_date               │
│  store_product_id (FK)              │
└─────────────────────────────────────┘
                 │
                 │ 1:N (tutorial_event_id)
                 ▼
┌─────────────────────────────────────┐
│      acted.tutorial_sessions        │
│  id (PK)                            │
│  tutorial_event_id (FK)             │
│  title                              │
│  location                           │
│  venue                              │
│  start_date, end_date               │
│  sequence                           │
│  url                                │
│  created_at, updated_at             │
└─────────────────────────────────────┘
```

## State Transitions

TutorialSessions has no state machine. Records are created, optionally updated, and deleted (via cascade when parent event is deleted).

**Lifecycle**:
1. **Created** - Session added to event (future feature)
2. **Updated** - Session details modified (future feature)
3. **Deleted** - Cascade when TutorialEvent deleted, or explicit delete

## Validation Rules

### Business Rules

1. **Date Order**: `start_date` must be on or before `end_date`
2. **Sequence Uniqueness**: No two sessions within the same event can have the same sequence number
3. **Required Fields**: title, location, venue, start_date, end_date, sequence are all required

### Model-Level Validation

```python
def clean(self):
    """Validate business rules before save."""
    super().clean()
    if self.start_date and self.end_date:
        if self.start_date > self.end_date:
            raise ValidationError({
                'end_date': 'End date cannot be before start date.'
            })
```

### Database-Level Constraints

```sql
-- Unique constraint (enforced by Django unique_together)
ALTER TABLE acted.tutorial_sessions
ADD CONSTRAINT tutorial_sessions_event_seq_unique
UNIQUE (tutorial_event_id, sequence);

-- Check constraint for date order
ALTER TABLE acted.tutorial_sessions
ADD CONSTRAINT tutorial_sessions_date_valid
CHECK (start_date <= end_date);
```

## Migration Notes

### Tables to Migrate (administrate app)

The following tables may need migration from `public` to `adm` schema if they exist in `public`:

| Current Location | Target Location | Table Name |
|-----------------|-----------------|------------|
| public.course_templates | adm.course_templates | course_templates |
| public.custom_fields | adm.custom_fields | custom_fields |
| public.instructors | adm.instructors | instructors |
| public.locations | adm.locations | locations |
| public.pricelevels | adm.pricelevels | pricelevels |
| public.venues | adm.venues | venues |

**Note**: These tables may already be in `adm` schema if the initial migration ran correctly. Migration should be conditional.

### New Table Creation (tutorials app)

| Schema | Table Name | Action |
|--------|-----------|--------|
| acted | tutorial_sessions | CREATE |

## Query Patterns

### Get Sessions for Event
```python
event.sessions.all().order_by('sequence')
```

### Get Event with Sessions (optimized)
```python
TutorialEvents.objects.prefetch_related('sessions').get(id=event_id)
```

### API Response Construction
```python
# In serializer
sessions_data = [
    {
        'id': s.id,
        'title': s.title,
        'location': s.location,
        'venue': s.venue,
        'start_date': s.start_date.isoformat(),
        'end_date': s.end_date.isoformat(),
        'sequence': s.sequence,
        'url': s.url,
    }
    for s in event.sessions.all().order_by('sequence')
]
```
