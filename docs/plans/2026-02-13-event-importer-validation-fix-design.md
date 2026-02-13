# Event Importer Validation Fix + API Audit Log

**Date**: 2026-02-13
**Branch**: `20260212-administrate-tutorial-sync`
**Status**: Approved

## Problem

The event importer (`administrate/utils/event_importer.py`) has 4 validation functions that query fields which don't exist on the `adm.*` bridge models after the schema refactoring:

| Function | Broken Query | Missing Field |
|----------|-------------|---------------|
| `validate_course_template()` | `CourseTemplate.objects.filter(code__iexact=...)` | `adm.CourseTemplate` has no `code` |
| `validate_location()` | `Location.objects.filter(name__iexact=...)` | `adm.Location` has no `name` |
| `validate_venue()` | `Venue.objects.filter(name__iexact=...)` | `adm.Venue` has no `name` |
| `validate_instructor()` | `Instructor.objects.filter(first_name__iexact=...)` | `adm.Instructor` has no `first_name`/`last_name` |

These queries silently return empty results, forcing every validation to fall through to the Administrate API (slow, no local caching). Additionally, there is no mechanism to auto-create missing tutorial records when found via API.

## Design Decisions

1. **Fix-in-place** — modify the 4 validation functions in `event_importer.py` (no new validation module)
2. **Keep API fallback** — query local tutorial tables first, fall back to API if not found
3. **Auto-create on API fallback** — when API returns a record not found locally, auto-create both the `acted.tutorial_*` record AND the `adm.*` bridge record with FK link
4. **Add API audit logging** — new `adm.api_audit_log` model to capture all GraphQL interactions

## Validation Function Fix Pattern

Each function follows the same corrected pattern:

```
1. Query tutorial table via adm bridge FK
   (e.g., CourseTemplate.objects.select_related('tutorial_course_template')
          .filter(tutorial_course_template__code__iexact=code))
2. If found locally → return dict with external_id + tutorial fields
3. If NOT found locally → call Administrate API (existing code)
4. If API returns data → auto-create tutorial record + adm bridge record
5. Return dict in same format as before
```

### validate_course_template

- **Local query**: `CourseTemplate.select_related('tutorial_course_template').filter(tutorial_course_template__code__iexact=code)`
- **Auto-create**: `TutorialCourseTemplate(code=, title=, is_active=True)` → set `CourseTemplate.tutorial_course_template` FK

### validate_location

- **Local query**: `Location.select_related('tutorial_location').filter(tutorial_location__name__iexact=name)`
- **Auto-create**: `TutorialLocation(name=, is_active=True)` → set `Location.tutorial_location` FK

### validate_venue

- **Local query**: `Venue.select_related('tutorial_venue').filter(tutorial_venue__name__iexact=name)`
- **Auto-create**: `TutorialVenue(name=, location=resolved_tutorial_location)` → set `Venue.tutorial_venue` FK

### validate_instructor

- **Local query**: `Instructor.select_related('tutorial_instructor__staff__user').filter(tutorial_instructor__staff__user__first_name__iexact=, ...last_name__iexact=)`
- **Auto-create**: `User` + `Staff` + `TutorialInstructor` + set `Instructor.tutorial_instructor` FK

## API Audit Log Model

**Table**: `"adm"."api_audit_log"` in the `administrate` app

```python
class ApiAuditLog(models.Model):
    command = CharField(max_length=100)          # e.g. 'sync_course_templates', 'import_events'
    operation = CharField(max_length=50)         # 'query' or 'mutation'

    graphql_query = TextField()                  # The GraphQL query/mutation string
    variables = JSONField(default=dict)          # JSON variables sent

    response_body = JSONField(null=True)         # Full server response
    status_code = IntegerField(null=True)        # HTTP status code

    success = BooleanField(default=True)
    error_message = TextField(blank=True)        # Error details if failed

    started_at = DateTimeField()
    completed_at = DateTimeField()
    duration_ms = IntegerField(null=True)        # Computed from started/completed

    entity_type = CharField(max_length=50, blank=True)   # e.g. 'CourseTemplate', 'Event'
    entity_id = CharField(max_length=255, blank=True)    # External ID being processed
    records_processed = IntegerField(default=0)          # Batch size for paginated queries

    class Meta:
        db_table = '"adm"."api_audit_log"'
        indexes = [
            models.Index(fields=['command', 'started_at']),
            models.Index(fields=['success', 'started_at']),
        ]
```

### Integration Point

Logging happens in `AdministrateAPIService.execute_query()` — the single central method all commands use. This requires zero changes in individual sync/import commands.

The `command` field is populated via a thread-local or context variable set by each management command at startup (e.g., `ApiAuditLog.set_current_command('sync_course_templates')`).

### Retention

All logs kept indefinitely. Manual cleanup when needed.

## Error Handling

- Each auto-creation wrapped in `transaction.atomic()` — if it fails, log warning and continue
- Validation still returns the API data dict so event creation can proceed via API
- The dual-write step gets `None` for unresolved tutorial FKs (existing graceful behavior)

## Files Changed

| File | Change |
|------|--------|
| `administrate/utils/event_importer.py` | Fix 4 validation functions, add auto-create logic |
| `administrate/models/api_audit_log.py` | New model file |
| `administrate/models/__init__.py` | Export ApiAuditLog |
| `administrate/services/api_service.py` | Add audit logging to execute_query() |
| `administrate/migrations/0008_add_api_audit_log.py` | New migration |

No changes to `event_dual_write.py`, `update_utility.py`, or any existing models.
