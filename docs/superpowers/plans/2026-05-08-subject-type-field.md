# Subject `subject_type` Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `subject_type` enum column to `acted.catalog_subjects` (UK/SA/CAA/PMS, default UK), exposed in the catalog API and Django admin, with TDD coverage at every layer.

**Architecture:** Django `TextChoices` enum on `Subject` model. Two-step migration honoring the project's `SeparateDatabaseAndState` pattern — DB mutation on the `catalog` app, state mirror on the per-app `catalog.subject`. ViewSet's custom cached `list()` is extended in-method (not via DRF `filterset_fields`) because it bypasses DRF's filter pipeline. No frontend work this round.

**Tech Stack:** Django 6.0, Django REST Framework, PostgreSQL (acted schema), Python 3.14.

**Spec:** [docs/superpowers/specs/2026-05-08-subject-type-field-design.md](../specs/2026-05-08-subject-type-field-design.md)

---

## Working assumptions for the engineer

- Repo root: `c:/Code/Admin3`. Django project root: `backend/django_Admin3/`.
- Run all Python commands from `backend/django_Admin3/` after activating the venv: `.\.venv\Scripts\activate`.
- Tests run against PostgreSQL, NOT SQLite — `python manage.py test` honors that.
- `--keepdb` is the team default; fixtures use `get_or_create` to be re-run-safe.
- Branch: `feat/20260501-tutorial-attendance` is the active working branch (already checked out).
- Each task ends with a focused commit. Use the conventional-commit prefix shown in each step.
- Every commit MUST end with the trailer:

  ```
  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```

---

## File map

| File | Action | Responsibility |
|---|---|---|
| [`backend/django_Admin3/catalog/subject/models.py`](../../../backend/django_Admin3/catalog/subject/models.py) | Modify | Add `SubjectType` `TextChoices` + `subject_type` field |
| `backend/django_Admin3/catalog/migrations/0011_add_subject_subject_type.py` | Create | DB-level `AddField` (`database_operations` only) |
| `backend/django_Admin3/catalog/subject/migrations/0002_add_subject_type.py` | Create | State-level mirror (`state_operations` only) |
| [`backend/django_Admin3/catalog/serializers/subject_serializers.py`](../../../backend/django_Admin3/catalog/serializers/subject_serializers.py) | Modify | Expose `subject_type` (writable) + `subject_type_display` (read-only) |
| [`backend/django_Admin3/catalog/views/subject_views.py`](../../../backend/django_Admin3/catalog/views/subject_views.py) | Modify | Extend cached `list()` payload + add `?subject_type=` filter, bump cache key to `v2` |
| [`backend/django_Admin3/catalog/subject/admin.py`](../../../backend/django_Admin3/catalog/subject/admin.py) | Modify | Add `subject_type` to `list_display` and `list_filter` |
| [`backend/django_Admin3/catalog/tests/test_models.py`](../../../backend/django_Admin3/catalog/tests/test_models.py) | Modify | New `TestSubjectSubjectType` test class |
| [`backend/django_Admin3/catalog/tests/test_migrations.py`](../../../backend/django_Admin3/catalog/tests/test_migrations.py) | Modify | Add `subject_type` column to expected columns |
| [`backend/django_Admin3/catalog/tests/test_serializers.py`](../../../backend/django_Admin3/catalog/tests/test_serializers.py) | Modify | New tests for `subject_type` / `subject_type_display` |
| [`backend/django_Admin3/catalog/tests/test_views.py`](../../../backend/django_Admin3/catalog/tests/test_views.py) | Modify | New filter test for `?subject_type=` |

---

## Task 1: RED — Add model-level tests for `subject_type`

**Files:**
- Modify: `backend/django_Admin3/catalog/tests/test_models.py`

- [ ] **Step 1: Append the new test class to `test_models.py`**

Append at the end of the file (after the last existing class). Do NOT touch existing tests.

```python


class TestSubjectSubjectType(TestCase):
    """TDD RED: Subject.subject_type field with TextChoices enum."""

    def test_subject_has_subject_type_field(self):
        """Subject model has a `subject_type` CharField with max_length=4."""
        from catalog.models import Subject
        field = Subject._meta.get_field('subject_type')
        from django.db import models as djmodels
        self.assertIsInstance(field, djmodels.CharField)
        self.assertEqual(field.max_length, 4)

    def test_subject_type_default_is_uk(self):
        """A newly-created Subject defaults `subject_type` to 'UK'."""
        from catalog.models import Subject
        s = Subject.objects.create(code='ZZ1', description='Test default')
        self.assertEqual(s.subject_type, 'UK')

    def test_subject_type_choices_are_complete(self):
        """SubjectType.choices contains exactly the four required pairs."""
        from catalog.models import Subject
        expected = {
            ('UK', 'UK Exam'),
            ('SA', 'South Africa Exam'),
            ('CAA', 'Actuarial Analyst Courses'),
            ('PMS', 'Pure Maths and Statistics for Actuarial Studies'),
        }
        self.assertEqual(set(Subject.SubjectType.choices), expected)

    def test_subject_type_invalid_value_raises_validation_error(self):
        """full_clean() rejects values outside the enum."""
        from django.core.exceptions import ValidationError
        from catalog.models import Subject
        s = Subject(code='ZZ2', description='bad type', subject_type='XX')
        with self.assertRaises(ValidationError):
            s.full_clean()

    def test_get_subject_type_display_returns_human_label(self):
        """get_subject_type_display() returns the configured label."""
        from catalog.models import Subject
        s = Subject.objects.create(code='ZZ3', description='pms', subject_type='PMS')
        self.assertEqual(
            s.get_subject_type_display(),
            'Pure Maths and Statistics for Actuarial Studies',
        )
```

- [ ] **Step 2: Run the new tests to verify they fail**

```bash
cd backend/django_Admin3
python manage.py test catalog.tests.test_models.TestSubjectSubjectType --keepdb -v 2
```

Expected: 5 failures/errors. The first failing assertion will be `Subject._meta.get_field('subject_type')` raising `FieldDoesNotExist` (or, depending on order, `Subject.SubjectType` raising `AttributeError`). All five tests must fail or error.

- [ ] **Step 3: Commit the failing tests**

```bash
git add backend/django_Admin3/catalog/tests/test_models.py
git commit -m "test(catalog): RED add Subject.subject_type model tests

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: GREEN — Add `SubjectType` enum and `subject_type` field

**Files:**
- Modify: `backend/django_Admin3/catalog/subject/models.py`

- [ ] **Step 1: Replace the `Subject` class body with the new version**

Open `backend/django_Admin3/catalog/subject/models.py` and replace the entire `Subject` class (keep the module docstring + imports at the top untouched) with:

```python
class Subject(models.Model):
    """
    Stores an academic subject for actuarial exams and courses.

    Subjects represent the core academic units (e.g., CB1, CM2, SA1) that
    students study and take exams for. Related to :model:`catalog.ExamSessionSubject`
    for exam session availability.

    **Usage Example**::

        subject = Subject.objects.get(code='CM2')
        sessions = subject.exam_session_subjects.all()
    """

    class SubjectType(models.TextChoices):
        UK = 'UK', 'UK Exam'
        SA = 'SA', 'South Africa Exam'
        CAA = 'CAA', 'Actuarial Analyst Courses'
        PMS = 'PMS', 'Pure Maths and Statistics for Actuarial Studies'

    code = models.CharField(
        max_length=10,
        unique=True,
        help_text="Unique subject code (e.g., CB1, CM2, SA1)"
    )
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Full description of the subject"
    )
    subject_type = models.CharField(
        max_length=4,
        choices=SubjectType.choices,
        default=SubjectType.UK,
        help_text="Programme classification (UK/SA/CAA/PMS)",
    )
    active = models.BooleanField(
        default=True,
        help_text="Whether this subject is currently active"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.code}: {self.description}"

    class Meta:
        db_table = '"acted"."catalog_subjects"'
        app_label = 'catalog_subjects'
        verbose_name = 'Subject'
        verbose_name_plural = 'Subjects'
        ordering = ['code']
```

- [ ] **Step 2: Confirm Django sees a pending migration**

```bash
cd backend/django_Admin3
python manage.py makemigrations --dry-run --check
```

Expected: exits with code 1 and prints something like `Migrations for 'catalog_subjects':` indicating an unapplied change. Do NOT run `makemigrations` for real — we're writing both migrations by hand to honor `SeparateDatabaseAndState`.

- [ ] **Step 3: Re-run the model tests — they should still mostly fail (no DB column yet)**

```bash
python manage.py test catalog.tests.test_models.TestSubjectSubjectType --keepdb -v 2
```

Expected: `test_subject_type_choices_are_complete` now passes. Tests that hit the DB (`test_subject_type_default_is_uk`, `test_get_subject_type_display_returns_human_label`) will fail with `column "subject_type" does not exist` because migrations haven't run. `test_subject_has_subject_type_field` and `test_subject_type_invalid_value_raises_validation_error` should pass.

- [ ] **Step 4: Commit the model change**

```bash
git add backend/django_Admin3/catalog/subject/models.py
git commit -m "feat(catalog): add Subject.SubjectType enum and subject_type field

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: GREEN — Write the DB migration (`catalog/0011`)

**Files:**
- Create: `backend/django_Admin3/catalog/migrations/0011_add_subject_subject_type.py`

- [ ] **Step 1: Create the migration file with this exact content**

```python
"""Add subject_type column to acted.catalog_subjects.

Uses SeparateDatabaseAndState: this migration owns the DB-level AddField,
while catalog/subject/migrations/0002_add_subject_type.py owns the state mirror.
"""
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

- [ ] **Step 2: Apply the migration**

```bash
cd backend/django_Admin3
python manage.py migrate catalog
```

Expected: `Applying catalog.0011_add_subject_subject_type... OK`. No errors.

- [ ] **Step 3: Verify the column exists in PostgreSQL**

```bash
python manage.py dbshell -- -c "\d \"acted\".\"catalog_subjects\""
```

Expected output contains a row like `subject_type | character varying(4) | ... default 'UK'`.

If `dbshell` is awkward, this Python one-liner works too:

```bash
python manage.py shell -c "from django.db import connection; c=connection.cursor(); c.execute(\"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_schema='acted' AND table_name='catalog_subjects' AND column_name='subject_type'\"); print(c.fetchall())"
```

Expected: a single row, e.g. `[('subject_type', 'character varying', \"'UK'::character varying\")]`.

- [ ] **Step 4: Commit the migration**

```bash
git add backend/django_Admin3/catalog/migrations/0011_add_subject_subject_type.py
git commit -m "feat(catalog): migration 0011 add subject_type column

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: GREEN — Write the state-mirror migration (`catalog.subject/0002`)

**Files:**
- Create: `backend/django_Admin3/catalog/subject/migrations/0002_add_subject_type.py`

- [ ] **Step 1: Create the migration file with this exact content**

```python
"""State-only mirror of catalog.0011_add_subject_subject_type.

The actual DB column was added by the catalog app migration. This migration
keeps the per-app `catalog_subjects` model state aligned with the DB.
"""
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

- [ ] **Step 2: Apply the state-mirror migration**

```bash
cd backend/django_Admin3
python manage.py migrate catalog_subjects
```

Expected: `Applying catalog_subjects.0002_add_subject_type... OK`.

- [ ] **Step 3: Confirm Django no longer detects pending changes**

```bash
python manage.py makemigrations --dry-run --check
```

Expected: exits 0 with `No changes detected`.

- [ ] **Step 4: Run the model test class — all 5 tests must now pass**

```bash
python manage.py test catalog.tests.test_models.TestSubjectSubjectType --keepdb -v 2
```

Expected: `Ran 5 tests ... OK`.

- [ ] **Step 5: Commit the state migration**

```bash
git add backend/django_Admin3/catalog/subject/migrations/0002_add_subject_type.py
git commit -m "feat(catalog): state migration mirror for subject_type

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: REFACTOR — Update `test_migrations.py` expected columns

**Files:**
- Modify: `backend/django_Admin3/catalog/tests/test_migrations.py`

- [ ] **Step 1: Edit the `expected_columns` list in `test_catalog_subjects_table`**

Locate (around line 70):

```python
        expected_columns = ['id', 'code', 'description', 'active', 'created_at', 'updated_at']
```

Replace with:

```python
        expected_columns = ['id', 'code', 'description', 'subject_type', 'active', 'created_at', 'updated_at']
```

No other change in this file.

- [ ] **Step 2: Run the migration test**

```bash
cd backend/django_Admin3
python manage.py test catalog.tests.test_migrations.TestCatalogTablesExist.test_catalog_subjects_table --keepdb -v 2
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add backend/django_Admin3/catalog/tests/test_migrations.py
git commit -m "test(catalog): assert subject_type column in catalog_subjects schema

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: RED — Add serializer tests

**Files:**
- Modify: `backend/django_Admin3/catalog/tests/test_serializers.py`

- [ ] **Step 1: Append a new test class at the bottom of the file**

```python


class TestSubjectSerializerSubjectType(CatalogTestDataMixin, TestCase):
    """TDD RED: SubjectSerializer exposes subject_type and subject_type_display."""

    def setUp(self):
        super().setUp()
        self.setup_catalog_test_data()

    def test_serializer_includes_subject_type(self):
        """Serialized output contains subject_type and subject_type_display."""
        from catalog.serializers import SubjectSerializer
        data = SubjectSerializer(self.subject_cm2).data
        self.assertIn('subject_type', data)
        self.assertIn('subject_type_display', data)

    def test_serializer_default_subject_type_is_uk(self):
        """A subject created without subject_type serializes as 'UK' / 'UK Exam'."""
        from catalog.serializers import SubjectSerializer
        data = SubjectSerializer(self.subject_cm2).data
        self.assertEqual(data['subject_type'], 'UK')
        self.assertEqual(data['subject_type_display'], 'UK Exam')

    def test_serializer_writable_subject_type(self):
        """Deserializing valid input persists subject_type."""
        from catalog.serializers import SubjectSerializer
        serializer = SubjectSerializer(data={
            'code': 'ZZ9',
            'description': 'serializer write test',
            'subject_type': 'SA',
            'active': True,
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        instance = serializer.save()
        self.assertEqual(instance.subject_type, 'SA')

    def test_serializer_rejects_invalid_subject_type(self):
        """Deserializing invalid subject_type fails validation on that field."""
        from catalog.serializers import SubjectSerializer
        serializer = SubjectSerializer(data={
            'code': 'ZZ8',
            'description': 'invalid type',
            'subject_type': 'XX',
            'active': True,
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('subject_type', serializer.errors)
```

- [ ] **Step 2: Run the new tests — they must fail**

```bash
cd backend/django_Admin3
python manage.py test catalog.tests.test_serializers.TestSubjectSerializerSubjectType --keepdb -v 2
```

Expected: 4 failures. `test_serializer_includes_subject_type` fails first because the serializer doesn't expose those fields yet.

- [ ] **Step 3: Commit the failing tests**

```bash
git add backend/django_Admin3/catalog/tests/test_serializers.py
git commit -m "test(catalog): RED add SubjectSerializer subject_type tests

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: GREEN — Update `SubjectSerializer`

**Files:**
- Modify: `backend/django_Admin3/catalog/serializers/subject_serializers.py`

- [ ] **Step 1: Replace the `SubjectSerializer` class with the updated version**

```python
"""
Subject serializers for the catalog API.

Location: catalog/serializers/subject_serializers.py
Model: catalog.models.Subject

Contract (from contracts/serializers.md):
- Fields: id, code, description, name, active, subject_type, subject_type_display
- name is a read-only alias for description (frontend compatibility)
- subject_type_display is a read-only label sourced from get_subject_type_display
"""
from rest_framework import serializers

from catalog.models import Subject


class SubjectSerializer(serializers.ModelSerializer):
    """
    Serializer for Subject model.

    Provides a `name` field that aliases `description` for frontend compatibility.
    Provides a `subject_type_display` field that returns the human-readable
    label for the `subject_type` enum (e.g. 'UK Exam').

    Fields:
        id (int): Primary key
        code (str): Subject code (e.g., "CM2"), max 10 chars
        description (str): Full subject name
        name (str): Read-only alias for description
        active (bool): Whether the subject is currently active
        subject_type (str): One of 'UK', 'SA', 'CAA', 'PMS'
        subject_type_display (str): Read-only human label
    """
    name = serializers.CharField(source='description', read_only=True)
    subject_type_display = serializers.CharField(
        source='get_subject_type_display', read_only=True
    )

    class Meta:
        model = Subject
        fields = [
            'id',
            'code',
            'description',
            'name',
            'active',
            'subject_type',
            'subject_type_display',
        ]
```

- [ ] **Step 2: Run the serializer tests — all 4 must pass**

```bash
cd backend/django_Admin3
python manage.py test catalog.tests.test_serializers.TestSubjectSerializerSubjectType --keepdb -v 2
```

Expected: `Ran 4 tests ... OK`.

- [ ] **Step 3: Run the full serializer test module to confirm no regressions**

```bash
python manage.py test catalog.tests.test_serializers --keepdb -v 2
```

Expected: all tests pass (existing `name` alias and field tests must still pass).

- [ ] **Step 4: Commit**

```bash
git add backend/django_Admin3/catalog/serializers/subject_serializers.py
git commit -m "feat(catalog): expose subject_type and subject_type_display in SubjectSerializer

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: RED — Add API filter test

**Files:**
- Modify: `backend/django_Admin3/catalog/tests/test_views.py`

- [ ] **Step 1: Locate the `TestSubjectViewSet` class and add this method**

Add the method inside `TestSubjectViewSet` (after the existing `test_list_subjects_returns_active_only` method is fine — order doesn't matter to the test runner):

```python
    def test_list_subjects_filtered_by_subject_type(self):
        """GET /api/catalog/subjects/?subject_type=SA returns only SA subjects."""
        from catalog.models import Subject

        # Promote one fixture subject to SA, leave the rest as default UK
        sa_subject = Subject.objects.filter(active=True).order_by('code').first()
        sa_subject.subject_type = 'SA'
        sa_subject.save()

        # Bust the cache so the filtered request goes through the live query
        cache.clear()

        # Filter to SA: should return exactly the one SA subject
        response = self.client.get('/api/catalog/subjects/?subject_type=SA')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        codes = [s['code'] for s in data]
        self.assertEqual(codes, [sa_subject.code])

        # Filter to UK: should NOT include the SA subject we just promoted
        cache.clear()
        response = self.client.get('/api/catalog/subjects/?subject_type=UK')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        uk_codes = [s['code'] for s in response.json()]
        self.assertNotIn(sa_subject.code, uk_codes)
        # And every returned row should carry the new fields
        for s in response.json():
            self.assertIn('subject_type', s)
            self.assertIn('subject_type_display', s)
            self.assertEqual(s['subject_type'], 'UK')
            self.assertEqual(s['subject_type_display'], 'UK Exam')
```

- [ ] **Step 2: Run the test — it must fail**

```bash
cd backend/django_Admin3
python manage.py test catalog.tests.test_views.TestSubjectViewSet.test_list_subjects_filtered_by_subject_type --keepdb -v 2
```

Expected: failure. The cached `list()` payload does not include `subject_type` and ignores the querystring.

- [ ] **Step 3: Commit the failing test**

```bash
git add backend/django_Admin3/catalog/tests/test_views.py
git commit -m "test(catalog): RED add subject_type filter test for SubjectViewSet

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: GREEN — Extend `SubjectViewSet.list` with filter + new fields + cache-key bump

**Files:**
- Modify: `backend/django_Admin3/catalog/views/subject_views.py`

- [ ] **Step 1: Replace the `list` method body**

Open `backend/django_Admin3/catalog/views/subject_views.py`. Replace the entire `list` method (the current `def list(self, request, *args, **kwargs):` block — lines ~55 to ~88) with:

```python
    def list(self, request, *args, **kwargs):
        """
        List active subjects with caching, optionally filtered by subject_type.

        OPTIMIZED: Cache subjects list for 5 minutes per filter value.
        Subjects rarely change and are fetched on every navigation menu load.

        Query params:
            subject_type (optional): One of 'UK', 'SA', 'CAA', 'PMS'.

        Returns:
            List of subjects with id, code, description, name, active,
            subject_type, subject_type_display.
        """
        subject_type = request.query_params.get('subject_type')
        cache_key = f'subjects_list_v2:type={subject_type or "all"}'
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        qs = Subject.objects.filter(active=True)
        if subject_type:
            qs = qs.filter(subject_type=subject_type)

        subjects = qs.order_by('code').values(
            'id', 'code', 'description', 'active', 'subject_type'
        )

        # Build a code->label lookup once per request
        type_label_map = dict(Subject.SubjectType.choices)

        result = [
            {
                'id': s['id'],
                'code': s['code'],
                'description': s['description'],
                'name': s['description'],  # Frontend compatibility alias
                'active': s['active'],
                'subject_type': s['subject_type'],
                'subject_type_display': type_label_map.get(s['subject_type'], ''),
            }
            for s in subjects
        ]

        cache.set(cache_key, result, 300)  # Cache for 5 minutes
        return Response(result)
```

- [ ] **Step 2: Update cache invalidation in `bulk_import_subjects`**

In the same file, locate the `cache.delete('subjects_list_v1')` call inside `bulk_import_subjects` (around line 119). The old `v1` key no longer exists, and we now have multiple `v2` keys (one per filter value). Replace that single line with a pattern delete using Django's `cache.delete_pattern` if Redis is configured, otherwise fall back to clearing all known keys.

Replace:

```python
                    # Invalidate cache when new subjects are created
                    cache.delete('subjects_list_v1')
```

with:

```python
                    # Invalidate cache when new subjects are created.
                    # Multiple entries exist (one per subject_type filter), so
                    # use delete_pattern when available, else delete known keys.
                    if hasattr(cache, 'delete_pattern'):
                        cache.delete_pattern('subjects_list_v2:*')
                    else:
                        cache.delete('subjects_list_v2:type=all')
                        for code, _ in Subject.SubjectType.choices:
                            cache.delete(f'subjects_list_v2:type={code}')
```

- [ ] **Step 3: Run the new filter test — it must pass**

```bash
cd backend/django_Admin3
python manage.py test catalog.tests.test_views.TestSubjectViewSet.test_list_subjects_filtered_by_subject_type --keepdb -v 2
```

Expected: PASS.

- [ ] **Step 4: Run the full `TestSubjectViewSet` class to check for regressions**

```bash
python manage.py test catalog.tests.test_views.TestSubjectViewSet --keepdb -v 2
```

Expected: all tests pass. The list endpoint should still return active-only by default and still be cached.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/catalog/views/subject_views.py
git commit -m "feat(catalog): filter subjects by subject_type, expose new fields, bump cache key

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: REFACTOR — Surface `subject_type` in Django admin

**Files:**
- Modify: `backend/django_Admin3/catalog/subject/admin.py`

- [ ] **Step 1: Replace the file content**

```python
"""Django admin configuration for catalog.subject."""
from django.contrib import admin
from .models import Subject


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    """Admin interface for Subject model."""
    list_display = (
        'code',
        'description',
        'subject_type',
        'active',
        'created_at',
        'updated_at',
    )
    list_filter = ('active', 'subject_type', 'created_at')
    search_fields = ('code', 'description')
    ordering = ('code',)
```

- [ ] **Step 2: Smoke-check that admin loads via Django's check framework**

```bash
cd backend/django_Admin3
python manage.py check
```

Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 3: Commit**

```bash
git add backend/django_Admin3/catalog/subject/admin.py
git commit -m "feat(catalog): show subject_type in Subject admin list and filter

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Final verification — run the full impacted test surface

**Files:**
- None (verification only)

- [ ] **Step 1: Run every test module touched by this change**

```bash
cd backend/django_Admin3
python manage.py test catalog.tests.test_models catalog.tests.test_serializers catalog.tests.test_views.TestSubjectViewSet catalog.tests.test_migrations --keepdb -v 2
```

Expected: zero failures, zero errors. If anything fails, STOP and surface the failure — do not patch over it.

- [ ] **Step 2: Run the schema placement guard**

```bash
python manage.py verify_schema_placement
```

Expected: clean exit with no schema misplacements (the new column lives in `acted.catalog_subjects`, not `public`).

- [ ] **Step 3: Confirm the working tree is clean**

```bash
git status
```

Expected: `nothing to commit, working tree clean` (only the unrelated pre-existing modified files from the session-start `git status` should remain — the new column work itself should be fully committed across Tasks 1–10).

- [ ] **Step 4: List the commits added by this plan**

```bash
git log --oneline -n 10
```

Expected: 10 new commits (one per Task 1–10), each with a single focused message and the `Co-Authored-By` trailer.

---

## Rollback notes (for the engineer's awareness)

If the migrations need to be reverted on a developer machine:

```bash
cd backend/django_Admin3
python manage.py migrate catalog_subjects 0001_initial
python manage.py migrate catalog 0010_alter_examsessionsubject_exam_session_and_more
```

Reverting drops the column. Any `catalog_subjects` rows with non-UK `subject_type` values lose that data. Acceptable per the spec (no production rows are non-UK at the time this ships).
