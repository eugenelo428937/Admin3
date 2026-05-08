# Subject `subject_type` Field — Design

**Date:** 2026-05-08
**Author:** Eugene Lo (with Claude)
**Status:** Approved (pending user spec review)
**Scope:** Single feature, single PR.

## Goal

Add a classification column `subject_type` to `acted.catalog_subjects` so each
subject can be tagged as a UK Exam, South Africa Exam, Actuarial Analyst Course,
or Pure Maths and Statistics for Actuarial Studies subject. Default every
existing and new row to `UK` until staff (or the user, manually in DB) sets
otherwise.

## Non-goals

- No frontend UI work this round. The new field flows out via the API and is
  ignored by React until a feature consumes it.
- No data migration to retro-classify existing non-UK subjects. The user will
  fix those rows directly in the DB after this ships.
- No filter-bar wiring in the Redux filter slice. Filtering is exposed at the
  API level only (`?subject_type=…`).

## Values

| Code  | Label                                              |
|-------|----------------------------------------------------|
| `UK`  | UK Exam                                            |
| `SA`  | South Africa Exam                                  |
| `CAA` | Actuarial Analyst Courses                          |
| `PMS` | Pure Maths and Statistics for Actuarial Studies    |

Default: `UK`.

## Approach

Use Django `TextChoices` (modern, idiomatic, gives label access for free) on
the existing `Subject` model. The list is "mostly stable, rarely extended" —
adding a fifth type later is a code change + tiny migration, accepted as the
trade-off for simplicity now.

Rejected alternative: a separate `SubjectType` lookup table with FK. More
moving parts (model, FK, admin, serializer, fixtures) for no concrete value
given the stability assumption.

## Data model

`backend/django_Admin3/catalog/subject/models.py`

```python
class Subject(models.Model):
    class SubjectType(models.TextChoices):
        UK  = 'UK',  'UK Exam'
        SA  = 'SA',  'South Africa Exam'
        CAA = 'CAA', 'Actuarial Analyst Courses'
        PMS = 'PMS', 'Pure Maths and Statistics for Actuarial Studies'

    # ...existing fields...
    subject_type = models.CharField(
        max_length=4,
        choices=SubjectType.choices,
        default=SubjectType.UK,
        help_text="Programme classification (UK/SA/CAA/PMS)",
    )
```

`max_length=4` accommodates the longest current code (`CAA`, `PMS` = 3) with
headroom for one future 4-char addition without another `AlterField`.

## Migrations

The catalog app uses `SeparateDatabaseAndState`: physical tables are created in
`catalog.migrations.0002_create_models`, while the per-app
`catalog/subject/migrations/` only registers Django state. The new column
mirrors that split.

### 1. `catalog/migrations/0011_add_subject_subject_type.py` — DB only

```python
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog", "0010_alter_examsessionsubject_exam_session_and_more"),
    ]
    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[],
            database_operations=[
                migrations.AddField(
                    model_name="subject",
                    name="subject_type",
                    field=models.CharField(
                        max_length=4,
                        default="UK",
                        choices=[
                            ("UK", "UK Exam"),
                            ("SA", "South Africa Exam"),
                            ("CAA", "Actuarial Analyst Courses"),
                            ("PMS", "Pure Maths and Statistics for Actuarial Studies"),
                        ],
                        help_text="Programme classification (UK/SA/CAA/PMS)",
                    ),
                ),
            ],
        ),
    ]
```

PostgreSQL `AddField` with `default='UK'` emits a column-level `DEFAULT 'UK'`,
so every existing row backfills automatically and any future raw-SQL `INSERT`
that omits the column also gets `'UK'`.

### 2. `catalog/subject/migrations/0002_add_subject_type.py` — state only

```python
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalog_subjects", "0001_initial"),
        ("catalog", "0011_add_subject_subject_type"),
    ]
    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddField(
                    model_name="subject",
                    name="subject_type",
                    field=models.CharField(
                        max_length=4,
                        default="UK",
                        choices=[
                            ("UK", "UK Exam"),
                            ("SA", "South Africa Exam"),
                            ("CAA", "Actuarial Analyst Courses"),
                            ("PMS", "Pure Maths and Statistics for Actuarial Studies"),
                        ],
                        help_text="Programme classification (UK/SA/CAA/PMS)",
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
```

The `app_label` for the per-app subject model is `catalog_subjects` (see
`Subject.Meta.app_label`), so the dependency line uses that name.

## API surface

### Serializer
`backend/django_Admin3/catalog/serializers/subject_serializers.py`

- Add `subject_type` (writable, validated by DRF against `choices`).
- Add `subject_type_display` (read-only, sourced from
  `get_subject_type_display`) so the frontend never has to hard-code labels.

```python
class SubjectSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='description', read_only=True)
    subject_type_display = serializers.CharField(
        source='get_subject_type_display', read_only=True
    )

    class Meta:
        model = Subject
        fields = [
            'id', 'code', 'description', 'name', 'active',
            'subject_type', 'subject_type_display',
        ]
```

### ViewSet
`backend/django_Admin3/catalog/views/subject_views.py` — `SubjectViewSet`.

Important: `SubjectViewSet.list()` is a **custom override** that bypasses DRF's
serializer + filter pipeline. It returns a hand-crafted `.values()` payload
cached under the key `subjects_list_v1` (5-minute TTL). Therefore standard
`filterset_fields = ['subject_type']` would be silently ignored.

Two coordinated changes are required:

1. **Extend the cached list payload.** Include `subject_type` and
   `subject_type_display` in both the `.values(...)` query and the dict
   comprehension that shapes the response. Use
   `dict(Subject.SubjectType.choices).get(s['subject_type'])` (or build a
   single mapping above the loop) for the display label without re-querying.

2. **Add a manual `subject_type` querystring filter inside `list()`** before
   the cache lookup, e.g.:

   ```python
   subject_type = request.query_params.get('subject_type')
   cache_key = f'subjects_list_v1:type={subject_type or "all"}'
   ```

   so different filter values get distinct cache entries.

3. **Bump the cache key prefix** to `subjects_list_v2` (or include the new
   field name in the key) so an in-flight cached `v1` payload — which lacks
   `subject_type` — does not survive deploy. The bump is the simplest invalidation.

For `retrieve`, `create`, and `update`, no extra wiring is needed: those
actions go through the serializer normally, so `subject_type` reads/writes
work via the serializer change alone.

`GET /api/catalog/subjects/?subject_type=SA` is the resulting public contract.
No new ordering/search behavior.

## Admin

`backend/django_Admin3/catalog/subject/admin.py`

- Add `subject_type` to `list_display` after `description`.
- Add `'subject_type'` to `list_filter` so staff can scope the changelist.

## Backfill

None. The migration default takes care of all existing rows. The user will
update non-UK subjects directly in the DB when needed.

## Test plan (TDD)

All tests are written **RED first** per project policy.

### Model — `catalog/tests/test_models.py`

| Test | Assertion |
|------|-----------|
| `test_subject_has_subject_type_field` | Field exists, is `CharField`, `max_length == 4`. |
| `test_subject_type_default_is_uk` | New `Subject` defaults to `'UK'`. |
| `test_subject_type_choices_are_complete` | Values `{UK, SA, CAA, PMS}` with the exact specified labels. |
| `test_subject_type_invalid_value_raises_validation_error` | `full_clean()` rejects `'XX'`. |
| `test_get_subject_type_display_returns_human_label` | `'PMS'` → `'Pure Maths and Statistics for Actuarial Studies'`. |

### Migration — `catalog/tests/test_migrations.py`

One `MigrationTestCase`:
1. Migrate to `catalog.0010_*`.
2. Insert a Subject row using the historical model.
3. Migrate forward to `catalog.0011_add_subject_subject_type`.
4. Assert the existing row's `subject_type == 'UK'`.
5. Assert `python manage.py verify_schema_placement` still passes.

### Serializer — `catalog/tests/test_serializers.py`

| Test | Assertion |
|------|-----------|
| `test_serializer_includes_subject_type` | Output contains `subject_type` and `subject_type_display`. |
| `test_serializer_writable_subject_type` | `{'code':'X1','subject_type':'SA',...}` saves correctly. |
| `test_serializer_rejects_invalid_subject_type` | `is_valid()` is False, error references `subject_type`. |

### API filter — `catalog/tests/test_views.py`

| Test | Assertion |
|------|-----------|
| `test_subject_list_filtered_by_subject_type` | `?subject_type=SA` returns only SA fixtures; `?subject_type=UK` returns the rest. |

### Admin — `catalog/tests/test_admin_views.py`

A single smoke test: changelist responds 200 and the page contains the
`subject_type` filter widget. No HTML pinning.

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Migration default backfills SA/CAA/PMS rows incorrectly. | Accepted by user — they will fix in DB after deploy. |
| Future fifth subject type forces a code change. | Accepted — `TextChoices` change + one `AlterField` migration is cheap. |
| `app_label` mismatch causes migration dependency error. | Spec uses `'catalog_subjects'` (matches `Subject.Meta.app_label`). Verified during exploration. |
| `subject_type_display` confuses API consumers expecting only `subject_type`. | It's an additive read-only field; existing consumers ignore unknown keys. |

## Out of scope (follow-ups, not this PR)

- Redux filter slice integration (`subjects` → `subject_types` filter on the
  products page).
- Reporting/analytics segmenting by subject type.
- Migrating existing non-UK subjects via a data migration.
- Bulk-import (`Subjects.bulk_import` action) accepting a `subject_type` column
  in CSVs.
