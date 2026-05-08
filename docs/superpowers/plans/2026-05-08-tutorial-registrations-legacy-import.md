# Tutorial Registrations Legacy Import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bulk-import `docs/misc/tutorial_registrations.csv` into `acted.tutorial_registrations`, while simplifying the schema by dropping the redundant `order_item` FK from `TutorialRegistration` and accepting unmatched legacy rows with `tutorial_choice = NULL`.

**Architecture:** Drop `tutorial_registrations.order_item` (its data is reachable via `tutorial_choice.order_item`). Add a Python `order_item` property fallback. Simplify `choice_resolver` to return `None` on both "no match" and "multi-match" cases (warning only on multi-match). Build a one-shot importer service plus a management command; abort if the table is non-empty.

**Tech Stack:** Django 6.0, PostgreSQL (acted schema), Django REST Framework, pytest-style `django.test.TestCase`. All code in `backend/django_Admin3/tutorials/`.

**Spec reference:** `docs/superpowers/specs/2026-05-08-tutorial-registrations-legacy-import-design.md`

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `tutorials/services/choice_resolver.py` | Modify | Simplified resolver: return `Optional[TutorialChoice]`, None on 0 / >=2 matches |
| `tutorials/models/tutorial_registration.py` | Modify | Remove `order_item` FK, add `order_item` property |
| `tutorials/migrations/0017_tutorial_registration_drop_order_item.py` | Create | RemoveField migration |
| `tutorials/services/registrations_importer.py` | Create | One-shot bulk-import service (`ImportResult` + `import_registrations_csv`) |
| `tutorials/management/commands/import_tutorial_registrations.py` | Create | CLI wrapper around the importer service |
| `tutorials/tests/test_choice_resolver.py` | Modify | Drop `result.order_item` assertions; replace multi-match test |
| `tutorials/tests/test_tutorial_registration.py` | Modify | Drop `order_item=` kwarg in factory calls; add property fallback test |
| `tutorials/tests/test_tutorial_attendance.py` | Modify | Drop `order_item=` kwarg in registration setup |
| `tutorials/tests/test_registrations_importer.py` | Create | 10 tests covering importer behavior |
| `tutorials/tests/test_import_tutorial_registrations_command.py` | Create | CLI smoke test via `call_command` |
| `tutorials/tests/test_migration_0017.py` | Create | Migration introspection test |

The parser (`tutorials/services/registrations_csv_parser.py`) is **unchanged** — it already returns `(session_id, student_refs)` rows and reports skip counters that map cleanly into `ImportResult`.

The admin layer (`admin_serializers.py`, `admin_views.py`) only filters `TutorialRegistration` querysets and reads `student`, `attendance` — it does **not** touch `order_item`. No changes.

---

## Task 1: Simplify `choice_resolver` (TDD)

**Files:**
- Modify: `backend/django_Admin3/tutorials/tests/test_choice_resolver.py`
- Modify: `backend/django_Admin3/tutorials/services/choice_resolver.py`

- [ ] **Step 1.1: RED — Update existing tests for new resolver contract**

Replace the file `backend/django_Admin3/tutorials/tests/test_choice_resolver.py` with:

```python
"""Tests for choice_resolver.

After 2026-05-08 simplification:
- Return None on zero matches (no warning).
- Return single match on exactly one match.
- Return None on multi-match WITH a warning (operator decides linkage later).

ChoiceResolution no longer carries `order_item` — callers use
`result.choice.order_item` if `result.choice` is not None.
"""
from django.test import TestCase

from tutorials.models import TutorialChoice
from tutorials.services.choice_resolver import resolve_choice_for_registration
from tutorials.tests import factories
from tutorials.tests.test_tutorial_choice import _make_order_item


class ResolveChoiceTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event)

    def test_returns_none_when_no_choice_exists(self):
        result = resolve_choice_for_registration(self.student, self.session)
        self.assertIsNone(result.choice)
        self.assertEqual(result.warning, '')

    def test_returns_single_match(self):
        oi = _make_order_item(self.student, self.sp)
        choice = TutorialChoice.objects.create(
            order_item=oi, student=self.student, tutorial_event=self.event, choice_rank=1,
        )
        result = resolve_choice_for_registration(self.student, self.session)
        self.assertEqual(result.choice, choice)
        self.assertEqual(result.warning, '')

    def test_returns_none_when_multiple_matches_and_warns(self):
        oi1 = _make_order_item(self.student, self.sp)
        oi2 = _make_order_item(self.student, self.sp)
        TutorialChoice.objects.create(
            order_item=oi1, student=self.student, tutorial_event=self.event, choice_rank=2,
        )
        TutorialChoice.objects.create(
            order_item=oi2, student=self.student, tutorial_event=self.event, choice_rank=1,
        )
        result = resolve_choice_for_registration(self.student, self.session)
        self.assertIsNone(result.choice)
        self.assertIn('multiple', result.warning.lower())

    def test_skips_cancelled_order_items(self):
        oi = _make_order_item(self.student, self.sp)
        oi.is_cancelled = True
        oi.save()
        TutorialChoice.objects.create(
            order_item=oi, student=self.student, tutorial_event=self.event, choice_rank=1,
        )
        result = resolve_choice_for_registration(self.student, self.session)
        self.assertIsNone(result.choice)

    def test_ignores_choices_for_other_events(self):
        other_event = factories.make_event(store_product=self.sp, code='OTHER-EV')
        oi = _make_order_item(self.student, self.sp)
        TutorialChoice.objects.create(
            order_item=oi, student=self.student, tutorial_event=other_event, choice_rank=1,
        )
        result = resolve_choice_for_registration(self.student, self.session)
        self.assertIsNone(result.choice)
```

- [ ] **Step 1.2: Run tests to verify failures**

```powershell
cd backend\django_Admin3
.\.venv\Scripts\activate
python manage.py test tutorials.tests.test_choice_resolver -v 2
```

Expected: `test_returns_none_when_multiple_matches_and_warns` **fails** because the current resolver returns the lowest-rank choice instead of None. Other tests may also fail because they no longer reference `result.order_item` (no failure expected from removal — they just stop asserting on it). The **multi-match** failure is the meaningful RED.

- [ ] **Step 1.3: GREEN — Rewrite the resolver**

Replace the file `backend/django_Admin3/tutorials/services/choice_resolver.py` with:

```python
"""Resolve which TutorialChoice fulfilled a CSV-imported registration.

Strategy (2026-05-08 simplification):
- Zero matches → ChoiceResolution(choice=None, warning='').
- Exactly one match → ChoiceResolution(choice=match, warning='').
- Multiple matches → ChoiceResolution(choice=None, warning=<message>).
  We intentionally do NOT auto-pick a winner — the operator can patch the
  link from the warnings list emitted by the importer.

`order_item` is reachable via `result.choice.order_item` when
`result.choice is not None`.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from tutorials.models import TutorialChoice


@dataclass
class ChoiceResolution:
    choice: Optional[TutorialChoice] = None
    warning: str = ''


def resolve_choice_for_registration(student, session) -> ChoiceResolution:
    """Find the TutorialChoice fulfilling a (student, session) CSV row.

    Cancelled order items (``is_cancelled=True``) are excluded — they
    represent refunded/withdrawn purchases.
    """
    matches = list(
        TutorialChoice.objects
        .filter(
            student=student,
            tutorial_event=session.tutorial_event,
            order_item__is_cancelled=False,
        )
        .order_by('choice_rank', 'created_at')[:2]
    )

    if not matches:
        return ChoiceResolution()
    if len(matches) >= 2:
        return ChoiceResolution(
            choice=None,
            warning=(
                f"multiple matching choices for student={student.student_ref} "
                f"event={session.tutorial_event.code}; left unlinked"
            ),
        )
    return ChoiceResolution(choice=matches[0])
```

- [ ] **Step 1.4: Run resolver tests to verify they pass**

```powershell
python manage.py test tutorials.tests.test_choice_resolver -v 2
```

Expected: 5 tests pass.

- [ ] **Step 1.5: Commit**

```powershell
git add backend/django_Admin3/tutorials/services/choice_resolver.py backend/django_Admin3/tutorials/tests/test_choice_resolver.py
git commit -m "refactor(tutorials): simplify choice_resolver to return None on multi-match"
```

---

## Task 2: Update existing registration / attendance tests to drop `order_item=` kwarg

**Files:**
- Modify: `backend/django_Admin3/tutorials/tests/test_tutorial_registration.py`
- Modify: `backend/django_Admin3/tutorials/tests/test_tutorial_attendance.py`

These tests will start failing in Task 3 once the FK is removed from the model. Updating them now (before the model change) keeps each commit green.

But the field still exists right now — passing `order_item=` is currently *required*. So we must do this **together with Task 3**, in the same commit. Steps 2.x are interleaved with Steps 3.x; treat Tasks 2 and 3 as a single unit and commit at the end of Task 3.

- [ ] **Step 2.1: Prepare the new content for `test_tutorial_registration.py` (do not save yet)**

Once Task 3's model change lands, the file `backend/django_Admin3/tutorials/tests/test_tutorial_registration.py` should be:

```python
"""Tests for TutorialRegistration.

The session-level enrolment record. Owned exclusively by the CSV sync
importer; never written by checkout. Soft-deleted via ``is_active=False``.
A partial unique index allows multiple inactive history rows but only one
active row per (student, session).

`order_item` is a derived property — see `test_order_item_property_*`.
"""
from django.contrib.auth.models import User
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from tutorials.models import (
    TutorialChoice, TutorialEnrolmentImport, TutorialRegistration,
)
from tutorials.tests import factories
from tutorials.tests.test_tutorial_choice import _make_order_item


class TutorialRegistrationTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event)

    def test_creates_registration_active_by_default(self):
        reg = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
        )
        self.assertTrue(reg.is_active)
        self.assertIsNone(reg.deactivated_at)

    def test_default_manager_excludes_inactive(self):
        reg = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
        )
        reg.is_active = False
        reg.deactivated_at = timezone.now()
        reg.save()
        self.assertEqual(TutorialRegistration.objects.count(), 0)
        self.assertEqual(TutorialRegistration.objects_all.count(), 1)

    def test_partial_unique_active_per_student_session(self):
        TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                TutorialRegistration.objects.create(
                    student=self.student, tutorial_session=self.session,
                )

    def test_import_batch_set_null_on_batch_delete(self):
        u = User.objects.create_user(username='importer', email='i@t.com')
        batch = TutorialEnrolmentImport.objects.create(filename='x.csv', uploaded_by=u)
        reg = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
            import_batch=batch,
        )
        batch.delete()
        reg.refresh_from_db()
        self.assertIsNone(reg.import_batch)

    def test_inactive_row_does_not_block_new_active_row(self):
        old = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
        )
        old.is_active = False
        old.deactivated_at = timezone.now()
        old.save()
        new = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
        )
        self.assertNotEqual(old.pk, new.pk)


class TutorialRegistrationOrderItemPropertyTests(TestCase):
    """The `order_item` property derives from `tutorial_choice.order_item`.

    Returns None when `tutorial_choice` is None (legacy unmatched rows).
    """
    def setUp(self):
        self.student = factories.make_student()
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event)

    def test_property_returns_none_when_no_choice(self):
        reg = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
        )
        self.assertIsNone(reg.order_item)

    def test_property_returns_choice_order_item_when_present(self):
        oi = _make_order_item(self.student, self.sp)
        choice = TutorialChoice.objects.create(
            order_item=oi, student=self.student,
            tutorial_event=self.event, choice_rank=1,
        )
        reg = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
            tutorial_choice=choice,
        )
        self.assertEqual(reg.order_item, oi)
```

- [ ] **Step 2.2: Prepare the patch for `test_tutorial_attendance.py` (do not save yet)**

The setUp block of `TutorialAttendanceTests` (lines 18–29 of the current file) becomes:

```python
class TutorialAttendanceTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.staff = User.objects.create_user(username='staff_user', email='s@t.com')
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event)
        self.reg = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
        )
```

The `_make_order_item` import on line 15 becomes unused — remove it.

The rest of `test_tutorial_attendance.py` is unchanged (it uses `self.reg`, never `self.order_item`).

(Steps 2.1 and 2.2 are reference content. The actual file edits happen in Step 3.4 below.)

---

## Task 3: Drop `order_item` FK from `TutorialRegistration`, add property fallback, write migration

**Files:**
- Modify: `backend/django_Admin3/tutorials/models/tutorial_registration.py`
- Create: `backend/django_Admin3/tutorials/migrations/0017_tutorial_registration_drop_order_item.py`
- Modify: `backend/django_Admin3/tutorials/tests/test_tutorial_registration.py` (apply Step 2.1 content)
- Modify: `backend/django_Admin3/tutorials/tests/test_tutorial_attendance.py` (apply Step 2.2 patch)

- [ ] **Step 3.1: Update the model**

Replace `backend/django_Admin3/tutorials/models/tutorial_registration.py` with:

```python
"""TutorialRegistration — session-level enrolment owned by CSV sync.

Written exclusively by the registrations CSV importer (full-sync model).
Soft-deleted via ``is_active=False`` so historical state is preserved for
audit / swap reconciliation. The default manager hides inactive rows; use
``objects_all`` to see everything.

`order_item` is exposed as a derived property — the canonical link is
``tutorial_choice.order_item``. Legacy rows imported in 2026-05-08 may
have ``tutorial_choice=None``; for those rows ``registration.order_item``
returns ``None``.
"""
from django.db import models


class ActiveRegistrationManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)


class TutorialRegistration(models.Model):
    student = models.ForeignKey(
        'students.Student', on_delete=models.PROTECT,
        related_name='tutorial_registrations',
    )
    tutorial_session = models.ForeignKey(
        'tutorials.TutorialSessions', on_delete=models.PROTECT,
        related_name='registrations',
    )
    tutorial_choice = models.ForeignKey(
        'tutorials.TutorialChoice', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='registrations',
    )
    is_active = models.BooleanField(default=True)
    import_batch = models.ForeignKey(
        'tutorials.TutorialEnrolmentImport', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='registrations',
    )
    deactivated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Default `objects` hides inactive rows; `objects_all` exposes history.
    objects = ActiveRegistrationManager()
    objects_all = models.Manager()

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_registrations"'
        base_manager_name = 'objects_all'
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'tutorial_session'],
                condition=models.Q(is_active=True),
                name='uniq_active_reg_per_student_session',
            ),
        ]
        verbose_name = 'Tutorial Registration'
        verbose_name_plural = 'Tutorial Registrations'

    @property
    def order_item(self):
        """Derived from ``tutorial_choice.order_item``.

        Returns None when ``tutorial_choice`` is null (legacy unmatched
        registration). Read-only; callers that need to write must
        traverse through ``tutorial_choice`` directly.
        """
        return self.tutorial_choice.order_item if self.tutorial_choice_id else None

    def __str__(self):
        return f"{self.student} → {self.tutorial_session} (active={self.is_active})"
```

- [ ] **Step 3.2: Generate the migration**

```powershell
cd backend\django_Admin3
.\.venv\Scripts\activate
python manage.py makemigrations tutorials --name tutorial_registration_drop_order_item
```

Expected output: `Migrations for 'tutorials': … 0017_tutorial_registration_drop_order_item.py - Remove field order_item from tutorialregistration`.

- [ ] **Step 3.3: Verify the migration content**

Open `backend/django_Admin3/tutorials/migrations/0017_tutorial_registration_drop_order_item.py`. It should contain a single `RemoveField` operation:

```python
class Migration(migrations.Migration):
    dependencies = [
        ("tutorials", "0016_tutorial_registration"),
    ]
    operations = [
        migrations.RemoveField(
            model_name="tutorialregistration",
            name="order_item",
        ),
    ]
```

If `makemigrations` produced a more complex diff (e.g. unrelated index churn), discard the file and inspect what's drifted before regenerating. The expected diff is exactly one `RemoveField`.

- [ ] **Step 3.4: Apply the test updates from Task 2 (now safe — model no longer has the field)**

Save the content from Step 2.1 to `backend/django_Admin3/tutorials/tests/test_tutorial_registration.py`.

Apply the Step 2.2 patch to `backend/django_Admin3/tutorials/tests/test_tutorial_attendance.py`:

- Remove line `from tutorials.tests.test_tutorial_choice import _make_order_item`
- Replace the `setUp` method (lines 18–29 of the current file) with the version shown in Step 2.2.

- [ ] **Step 3.5: Apply the migration to the dev database**

```powershell
python manage.py migrate tutorials
```

Expected: `Applying tutorials.0017_tutorial_registration_drop_order_item... OK`.

- [ ] **Step 3.6: Audit for stale `order_item` references on registration querysets**

```powershell
cd c:\Code\Admin3
git grep -nE "tutorial_registration[s]?\.order_item|registration\.order_item_id|registrations\.filter\([^)]*order_item"
```

Expected: zero hits in `backend/django_Admin3/**/*.py` (excluding `tests/` files we already updated, this plan, and the spec docs). If a hit appears in production code (`admin_views.py`, `admin_serializers.py`, a serializer, a view, a service), update the caller to use the property fallback (`registration.order_item`) for reads, or rewrite querysets to traverse `tutorial_choice__order_item`. Any change here goes into the same commit at Step 3.8.

- [ ] **Step 3.7: Run the affected test modules**

```powershell
cd backend\django_Admin3
python manage.py test tutorials.tests.test_tutorial_registration tutorials.tests.test_tutorial_attendance tutorials.tests.test_choice_resolver -v 2
```

Expected: all green. The new property tests in `TutorialRegistrationOrderItemPropertyTests` confirm the fallback works.

- [ ] **Step 3.8: Commit**

```powershell
git add backend/django_Admin3/tutorials/models/tutorial_registration.py `
        backend/django_Admin3/tutorials/migrations/0017_tutorial_registration_drop_order_item.py `
        backend/django_Admin3/tutorials/tests/test_tutorial_registration.py `
        backend/django_Admin3/tutorials/tests/test_tutorial_attendance.py
# Plus any extra files modified in Step 3.6.
git commit -m "refactor(tutorials): drop order_item FK from TutorialRegistration; expose as property"
```

---

## Task 4: Migration introspection test

**Files:**
- Create: `backend/django_Admin3/tutorials/tests/test_migration_0017.py`

A defensive test that the migration produces the exact schema we expect — the `order_item_id` column is gone but the partial unique index survives.

- [ ] **Step 4.1: Write the migration test**

Create `backend/django_Admin3/tutorials/tests/test_migration_0017.py`:

```python
"""Schema introspection test for migration 0017.

Verifies that after migrate:
- `acted.tutorial_registrations` has no `order_item_id` column.
- The partial unique index `uniq_active_reg_per_student_session` exists.
- The `tutorial_choice_id` column exists and is nullable.
"""
from django.db import connection
from django.test import TestCase


class Migration0017SchemaTests(TestCase):
    def test_order_item_id_column_does_not_exist(self):
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'acted'
                  AND table_name = 'tutorial_registrations'
                """
            )
            cols = {row[0] for row in cur.fetchall()}
        self.assertNotIn('order_item_id', cols)
        # Sanity: tutorial_choice_id still there.
        self.assertIn('tutorial_choice_id', cols)
        self.assertIn('student_id', cols)
        self.assertIn('tutorial_session_id', cols)

    def test_tutorial_choice_id_is_nullable(self):
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'acted'
                  AND table_name = 'tutorial_registrations'
                  AND column_name = 'tutorial_choice_id'
                """
            )
            row = cur.fetchone()
        self.assertIsNotNone(row, 'tutorial_choice_id column missing')
        self.assertEqual(row[0], 'YES')

    def test_partial_unique_index_still_exists(self):
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT indexname
                FROM pg_indexes
                WHERE schemaname = 'acted'
                  AND tablename = 'tutorial_registrations'
                  AND indexname = 'uniq_active_reg_per_student_session'
                """
            )
            row = cur.fetchone()
        self.assertIsNotNone(
            row, 'partial unique index uniq_active_reg_per_student_session missing',
        )
```

- [ ] **Step 4.2: Run the migration test**

```powershell
python manage.py test tutorials.tests.test_migration_0017 -v 2
```

Expected: 3 tests pass.

- [ ] **Step 4.3: Commit**

```powershell
git add backend/django_Admin3/tutorials/tests/test_migration_0017.py
git commit -m "test(tutorials): introspect schema after 0017 migration"
```

---

## Task 5: Importer service — pre-flight abort (TDD)

**Files:**
- Create: `backend/django_Admin3/tutorials/tests/test_registrations_importer.py`
- Create: `backend/django_Admin3/tutorials/services/registrations_importer.py`

- [ ] **Step 5.1: RED — Write the pre-flight test**

Create `backend/django_Admin3/tutorials/tests/test_registrations_importer.py`:

```python
"""Tests for tutorials.services.registrations_importer.

This is the one-shot legacy bulk-import service. It refuses to run if
any TutorialRegistration row already exists (active or inactive).
"""
import io

from django.contrib.auth.models import User
from django.test import TestCase

from tutorials.models import TutorialRegistration
from tutorials.services.registrations_importer import import_registrations_csv
from tutorials.tests import factories


def _csv_with_one_row(session_title, student_refs):
    """Build a one-row CSV string matching the real header layout."""
    refs = ', '.join(str(r) for r in student_refs)
    return (
        '"Title","Subject","Is Cancelled","Sitting","Enrolled",'
        '"ActEd Student Numbers","Swaps In ActEd Student Numbers",'
        '"Swaps out","Custom: Swaps out ActEd Student Numbers (Event)"\n'
        f'"{session_title}","CM2",False,"2024A",0,'
        f'"{refs}","","",""\n'
    )


class PreflightTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='importer', email='i@t.com')
        self.student = factories.make_student()
        self.session = factories.make_session()

    def test_aborts_when_table_not_empty(self):
        TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
        )
        csv = _csv_with_one_row(self.session.title, [self.student.student_ref])

        with self.assertRaises(RuntimeError) as ctx:
            import_registrations_csv(
                io.StringIO(csv), uploaded_by=self.user, filename='x.csv',
            )
        self.assertIn('non-empty', str(ctx.exception).lower())
```

- [ ] **Step 5.2: Run, see import error**

```powershell
python manage.py test tutorials.tests.test_registrations_importer.PreflightTests -v 2
```

Expected: `ImportError: cannot import name 'import_registrations_csv' from 'tutorials.services.registrations_importer'`.

- [ ] **Step 5.3: GREEN — Create the service skeleton with pre-flight check**

Create `backend/django_Admin3/tutorials/services/registrations_importer.py`:

```python
"""One-shot legacy bulk importer for tutorial_registrations.csv.

Reads ``docs/misc/tutorial_registrations.csv`` (full schema in
``tutorials.services.registrations_csv_parser``) and creates one
``TutorialRegistration`` row per (session, student) pair, linking
``tutorial_choice`` when a single live ``TutorialChoice`` exists for
that pair (see ``tutorials.services.choice_resolver``).

Multi-match and no-match cases create a registration with
``tutorial_choice=NULL``; multi-match additionally records a warning
on the ``TutorialEnrolmentImport.report['warnings']`` list.

This importer is **one-shot** — it refuses to run if the
``tutorial_registrations`` table is non-empty. Future incremental
sync (soft-deactivate / reactivate) is out of scope.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from tutorials.models import TutorialRegistration


@dataclass
class ImportResult:
    batch_id: Optional[int]
    total_csv_rows: int = 0
    created: int = 0
    linked_to_choice: int = 0
    unlinked: int = 0
    multi_match_warnings: int = 0
    skipped_cancelled: int = 0
    skipped_unknown_session: int = 0
    skipped_unknown_student: int = 0
    skipped_paren_suffix: int = 0
    skipped_empty: int = 0
    skipped_duplicate_in_db: int = 0
    warnings: List[str] = field(default_factory=list)


def import_registrations_csv(
    file_obj, *, uploaded_by, filename: str,
    dry_run: bool = False, strict: bool = False,
) -> ImportResult:
    """Import the legacy registrations CSV into ``tutorial_registrations``.

    Raises:
        RuntimeError: if the table already contains any rows (one-shot
            guard).
    """
    if TutorialRegistration.objects_all.exists():
        raise RuntimeError(
            'tutorial_registrations is non-empty; this importer is one-shot only',
        )
    # Subsequent tasks fill in: parse, batch creation, row insertion,
    # commit/rollback. For now, return an empty result so callers can
    # exercise the pre-flight branch without a TypeError.
    return ImportResult(batch_id=None)
```

- [ ] **Step 5.4: Run pre-flight test, see it pass**

```powershell
python manage.py test tutorials.tests.test_registrations_importer.PreflightTests -v 2
```

Expected: 1 test passes.

- [ ] **Step 5.5: Commit**

```powershell
git add backend/django_Admin3/tutorials/services/registrations_importer.py backend/django_Admin3/tutorials/tests/test_registrations_importer.py
git commit -m "feat(tutorials): registrations_importer pre-flight (one-shot guard)"
```

---

## Task 6: Importer — happy path with matched choice (TDD)

**Files:**
- Modify: `backend/django_Admin3/tutorials/tests/test_registrations_importer.py`
- Modify: `backend/django_Admin3/tutorials/services/registrations_importer.py`

- [ ] **Step 6.1: RED — Add the happy-path test**

Append to `backend/django_Admin3/tutorials/tests/test_registrations_importer.py`:

```python
from tutorials.models import (
    TutorialChoice, TutorialEnrolmentImport, TutorialRegistration,
)
from tutorials.tests.test_tutorial_choice import _make_order_item


class HappyPathTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='importer', email='i@t.com')
        self.student = factories.make_student()
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event)

    def test_creates_registration_with_matched_choice(self):
        oi = _make_order_item(self.student, self.sp)
        choice = TutorialChoice.objects.create(
            order_item=oi, student=self.student,
            tutorial_event=self.event, choice_rank=1,
        )
        csv = _csv_with_one_row(self.session.title, [self.student.student_ref])

        result = import_registrations_csv(
            io.StringIO(csv), uploaded_by=self.user, filename='legacy.csv',
        )

        self.assertEqual(result.total_csv_rows, 1)
        self.assertEqual(result.created, 1)
        self.assertEqual(result.linked_to_choice, 1)
        self.assertEqual(result.unlinked, 0)

        reg = TutorialRegistration.objects.get(
            student=self.student, tutorial_session=self.session,
        )
        self.assertEqual(reg.tutorial_choice, choice)
        self.assertEqual(reg.import_batch_id, result.batch_id)

        batch = TutorialEnrolmentImport.objects.get(pk=result.batch_id)
        self.assertEqual(batch.status, TutorialEnrolmentImport.STATUS_COMMITTED)
        self.assertEqual(batch.filename, 'legacy.csv')
        self.assertEqual(batch.total_rows, 1)
        self.assertEqual(batch.created_count, 1)
```

- [ ] **Step 6.2: Run, see fail**

```powershell
python manage.py test tutorials.tests.test_registrations_importer.HappyPathTests -v 2
```

Expected: `AssertionError: 0 != 1` on `result.created` (the stub returns an empty result).

- [ ] **Step 6.3: GREEN — Wire up parse + batch + row insertion**

Replace the body of `import_registrations_csv` in `backend/django_Admin3/tutorials/services/registrations_importer.py` with:

```python
def import_registrations_csv(
    file_obj, *, uploaded_by, filename: str,
    dry_run: bool = False, strict: bool = False,
) -> ImportResult:
    """Import the legacy registrations CSV into ``tutorial_registrations``."""
    from django.db import transaction
    from django.utils import timezone
    from students.models import Student
    from tutorials.models import (
        TutorialEnrolmentImport, TutorialRegistration, TutorialSessions,
    )
    from tutorials.services.choice_resolver import (
        resolve_choice_for_registration,
    )
    from tutorials.services.registrations_csv_parser import (
        parse_registrations_csv,
    )

    if TutorialRegistration.objects_all.exists():
        raise RuntimeError(
            'tutorial_registrations is non-empty; this importer is one-shot only',
        )

    parsed = parse_registrations_csv(file_obj)

    result = ImportResult(
        batch_id=None,
        total_csv_rows=parsed.total_rows,
        skipped_cancelled=parsed.skipped_cancelled,
        skipped_unknown_session=parsed.skipped_unknown_session,
        skipped_unknown_student=parsed.skipped_unknown_student,
        skipped_paren_suffix=parsed.skipped_paren_suffix,
        skipped_empty=parsed.skipped_empty,
    )

    with transaction.atomic():
        batch = TutorialEnrolmentImport.objects.create(
            filename=filename,
            uploaded_by=uploaded_by,
            status=TutorialEnrolmentImport.STATUS_PENDING,
        )
        result.batch_id = batch.pk

        for row in parsed.rows:
            session = TutorialSessions.objects.get(pk=row.session_id)
            students_by_ref = {
                s.student_ref: s for s in Student.objects.filter(
                    student_ref__in=row.student_refs,
                )
            }
            for ref in row.student_refs:
                student = students_by_ref.get(ref)
                if student is None:
                    # Already counted by parser as skipped_unknown_student.
                    continue
                resolution = resolve_choice_for_registration(student, session)
                if resolution.warning:
                    result.warnings.append(resolution.warning)
                    result.multi_match_warnings += 1

                TutorialRegistration.objects.create(
                    student=student,
                    tutorial_session=session,
                    tutorial_choice=resolution.choice,
                    import_batch=batch,
                )
                result.created += 1
                if resolution.choice is not None:
                    result.linked_to_choice += 1
                else:
                    result.unlinked += 1

        # Finalise the batch row.
        batch.total_rows = result.total_csv_rows
        batch.created_count = result.created
        batch.unmatched_count = (
            result.skipped_unknown_session
            + result.skipped_unknown_student
            + result.skipped_paren_suffix
            + result.skipped_empty
            + result.skipped_duplicate_in_db
        )
        batch.report = {
            'created': result.created,
            'linked_to_choice': result.linked_to_choice,
            'unlinked': result.unlinked,
            'multi_match_warnings': result.multi_match_warnings,
            'skipped_cancelled': result.skipped_cancelled,
            'skipped_unknown_session': result.skipped_unknown_session,
            'skipped_unknown_student': result.skipped_unknown_student,
            'skipped_paren_suffix': result.skipped_paren_suffix,
            'skipped_empty': result.skipped_empty,
            'skipped_duplicate_in_db': result.skipped_duplicate_in_db,
            'warnings': list(result.warnings),
            'unmatched': list(parsed.unmatched),
        }
        if dry_run:
            batch.status = TutorialEnrolmentImport.STATUS_DRY_RUN
        else:
            batch.status = TutorialEnrolmentImport.STATUS_COMMITTED
            batch.committed_at = timezone.now()
        batch.save()

        if dry_run:
            transaction.set_rollback(True)
            result.batch_id = None  # Row is rolled back.

    return result
```

- [ ] **Step 6.4: Run happy-path test, expect pass**

```powershell
python manage.py test tutorials.tests.test_registrations_importer.HappyPathTests -v 2
```

Expected: 1 test passes. Pre-flight test still passes.

- [ ] **Step 6.5: Commit**

```powershell
git add backend/django_Admin3/tutorials/services/registrations_importer.py backend/django_Admin3/tutorials/tests/test_registrations_importer.py
git commit -m "feat(tutorials): registrations_importer happy path with matched choice"
```

---

## Task 7: Importer — null-choice cases (no match, multi-match)

**Files:**
- Modify: `backend/django_Admin3/tutorials/tests/test_registrations_importer.py`

The implementation already handles these — the test additions are coverage to lock in the contract.

- [ ] **Step 7.1: Write tests for null-choice paths**

Append to `backend/django_Admin3/tutorials/tests/test_registrations_importer.py`:

```python
class NullChoiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='importer', email='i@t.com')
        self.student = factories.make_student()
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event)

    def test_creates_registration_with_null_choice_when_no_match(self):
        # No TutorialChoice exists for this student/event.
        csv = _csv_with_one_row(self.session.title, [self.student.student_ref])

        result = import_registrations_csv(
            io.StringIO(csv), uploaded_by=self.user, filename='legacy.csv',
        )

        self.assertEqual(result.created, 1)
        self.assertEqual(result.unlinked, 1)
        self.assertEqual(result.linked_to_choice, 0)
        self.assertEqual(result.multi_match_warnings, 0)
        self.assertEqual(result.warnings, [])

        reg = TutorialRegistration.objects.get(
            student=self.student, tutorial_session=self.session,
        )
        self.assertIsNone(reg.tutorial_choice)

    def test_creates_registration_with_null_choice_on_multi_match_and_warns(self):
        oi1 = _make_order_item(self.student, self.sp)
        oi2 = _make_order_item(self.student, self.sp)
        TutorialChoice.objects.create(
            order_item=oi1, student=self.student,
            tutorial_event=self.event, choice_rank=2,
        )
        TutorialChoice.objects.create(
            order_item=oi2, student=self.student,
            tutorial_event=self.event, choice_rank=1,
        )
        csv = _csv_with_one_row(self.session.title, [self.student.student_ref])

        result = import_registrations_csv(
            io.StringIO(csv), uploaded_by=self.user, filename='legacy.csv',
        )

        self.assertEqual(result.created, 1)
        self.assertEqual(result.unlinked, 1)
        self.assertEqual(result.multi_match_warnings, 1)
        self.assertEqual(len(result.warnings), 1)
        self.assertIn('multiple', result.warnings[0].lower())

        reg = TutorialRegistration.objects.get(
            student=self.student, tutorial_session=self.session,
        )
        self.assertIsNone(reg.tutorial_choice)

        batch = TutorialEnrolmentImport.objects.get(pk=result.batch_id)
        self.assertEqual(len(batch.report['warnings']), 1)
```

- [ ] **Step 7.2: Run the new tests**

```powershell
python manage.py test tutorials.tests.test_registrations_importer.NullChoiceTests -v 2
```

Expected: 2 tests pass (no implementation change needed — the importer already handles these).

- [ ] **Step 7.3: Commit**

```powershell
git add backend/django_Admin3/tutorials/tests/test_registrations_importer.py
git commit -m "test(tutorials): registrations_importer null-choice and multi-match"
```

---

## Task 8: Importer — skip categories and import_batch linkage

**Files:**
- Modify: `backend/django_Admin3/tutorials/tests/test_registrations_importer.py`

- [ ] **Step 8.1: Write coverage tests**

Append to `backend/django_Admin3/tutorials/tests/test_registrations_importer.py`:

```python
class SkipCategoryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='importer', email='i@t.com')
        self.student = factories.make_student()
        self.session = factories.make_session()

    def test_skips_cancelled_csv_rows(self):
        # Build a CSV row with Is Cancelled=True directly (helper assumes False).
        csv = (
            '"Title","Subject","Is Cancelled","Sitting","Enrolled",'
            '"ActEd Student Numbers","Swaps In ActEd Student Numbers",'
            '"Swaps out","Custom: Swaps out ActEd Student Numbers (Event)"\n'
            f'"{self.session.title}","CM2",True,"2024A",0,'
            f'"{self.student.student_ref}","","",""\n'
        )
        result = import_registrations_csv(
            io.StringIO(csv), uploaded_by=self.user, filename='legacy.csv',
        )
        self.assertEqual(result.created, 0)
        self.assertEqual(result.skipped_cancelled, 1)
        self.assertEqual(TutorialRegistration.objects.count(), 0)

    def test_skips_unknown_students_and_records_unmatched(self):
        # Refs include one valid + one nonexistent.
        csv = _csv_with_one_row(
            self.session.title,
            [self.student.student_ref, 999999],
        )
        result = import_registrations_csv(
            io.StringIO(csv), uploaded_by=self.user, filename='legacy.csv',
        )
        self.assertEqual(result.created, 1)  # The valid ref imported.
        self.assertEqual(result.skipped_unknown_student, 1)

    def test_links_import_batch_on_every_created_row(self):
        s2 = factories.make_student()
        csv = _csv_with_one_row(
            self.session.title,
            [self.student.student_ref, s2.student_ref],
        )
        result = import_registrations_csv(
            io.StringIO(csv), uploaded_by=self.user, filename='legacy.csv',
        )
        self.assertEqual(result.created, 2)
        regs = TutorialRegistration.objects.filter(
            tutorial_session=self.session,
        )
        for reg in regs:
            self.assertEqual(reg.import_batch_id, result.batch_id)
```

- [ ] **Step 8.2: Run**

```powershell
python manage.py test tutorials.tests.test_registrations_importer.SkipCategoryTests -v 2
```

Expected: 3 tests pass.

- [ ] **Step 8.3: Commit**

```powershell
git add backend/django_Admin3/tutorials/tests/test_registrations_importer.py
git commit -m "test(tutorials): registrations_importer skip categories and batch linkage"
```

---

## Task 9: Importer — duplicate handling (`--strict` vs default)

**Files:**
- Modify: `backend/django_Admin3/tutorials/services/registrations_importer.py`
- Modify: `backend/django_Admin3/tutorials/tests/test_registrations_importer.py`

- [ ] **Step 9.1: RED — Add duplicate handling tests**

Append to `backend/django_Admin3/tutorials/tests/test_registrations_importer.py`:

```python
class DuplicateHandlingTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='importer', email='i@t.com')
        self.student = factories.make_student()
        self.session = factories.make_session()

    def _two_row_csv(self, ref):
        # Two CSV rows pointing at the same session+student → duplicate
        # would violate uniq_active_reg_per_student_session.
        return (
            '"Title","Subject","Is Cancelled","Sitting","Enrolled",'
            '"ActEd Student Numbers","Swaps In ActEd Student Numbers",'
            '"Swaps out","Custom: Swaps out ActEd Student Numbers (Event)"\n'
            f'"{self.session.title}","CM2",False,"2024A",0,'
            f'"{ref}","","",""\n'
            f'"{self.session.title}","CM2",False,"2024A",0,'
            f'"{ref}","","",""\n'
        )

    def test_non_strict_skips_duplicate_and_continues(self):
        csv = self._two_row_csv(self.student.student_ref)
        result = import_registrations_csv(
            io.StringIO(csv), uploaded_by=self.user, filename='legacy.csv',
        )
        self.assertEqual(result.created, 1)
        self.assertEqual(result.skipped_duplicate_in_db, 1)
        self.assertEqual(TutorialRegistration.objects.count(), 1)

    def test_strict_aborts_on_duplicate_in_csv(self):
        csv = self._two_row_csv(self.student.student_ref)
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            import_registrations_csv(
                io.StringIO(csv), uploaded_by=self.user, filename='legacy.csv',
                strict=True,
            )
        # Whole transaction rolled back on strict failure.
        self.assertEqual(TutorialRegistration.objects.count(), 0)
        from tutorials.models import TutorialEnrolmentImport
        self.assertEqual(TutorialEnrolmentImport.objects.count(), 0)
```

- [ ] **Step 9.2: Run, see failures**

```powershell
python manage.py test tutorials.tests.test_registrations_importer.DuplicateHandlingTests -v 2
```

Expected: both fail. The non-strict test fails with an `IntegrityError` (no try/except yet); the strict test may fail because the importer raises but does not also tear down the batch row.

- [ ] **Step 9.3: GREEN — Add IntegrityError handling**

In `backend/django_Admin3/tutorials/services/registrations_importer.py`, replace the inner row-creation block of `import_registrations_csv` (the `for ref in row.student_refs:` body) with:

```python
            for ref in row.student_refs:
                student = students_by_ref.get(ref)
                if student is None:
                    continue
                resolution = resolve_choice_for_registration(student, session)
                if resolution.warning:
                    result.warnings.append(resolution.warning)
                    result.multi_match_warnings += 1

                try:
                    with transaction.atomic():
                        TutorialRegistration.objects.create(
                            student=student,
                            tutorial_session=session,
                            tutorial_choice=resolution.choice,
                            import_batch=batch,
                        )
                except IntegrityError:
                    if strict:
                        raise
                    result.skipped_duplicate_in_db += 1
                    continue

                result.created += 1
                if resolution.choice is not None:
                    result.linked_to_choice += 1
                else:
                    result.unlinked += 1
```

Add `IntegrityError` to the existing import line:

```python
    from django.db import IntegrityError, transaction
```

(replacing the previous `from django.db import transaction`).

- [ ] **Step 9.4: Run duplicate-handling tests, expect pass**

```powershell
python manage.py test tutorials.tests.test_registrations_importer.DuplicateHandlingTests -v 2
```

Expected: 2 tests pass.

- [ ] **Step 9.5: Run the full importer suite to confirm no regressions**

```powershell
python manage.py test tutorials.tests.test_registrations_importer -v 2
```

Expected: all importer tests pass.

- [ ] **Step 9.6: Commit**

```powershell
git add backend/django_Admin3/tutorials/services/registrations_importer.py backend/django_Admin3/tutorials/tests/test_registrations_importer.py
git commit -m "feat(tutorials): registrations_importer per-row IntegrityError handling and --strict"
```

---

## Task 10: Importer — dry-run rollback

**Files:**
- Modify: `backend/django_Admin3/tutorials/tests/test_registrations_importer.py`

The implementation already handles dry-run; this task only adds the contract test.

- [ ] **Step 10.1: Write the dry-run test**

Append to `backend/django_Admin3/tutorials/tests/test_registrations_importer.py`:

```python
class DryRunTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='importer', email='i@t.com')
        self.student = factories.make_student()
        self.session = factories.make_session()

    def test_dry_run_rolls_back_everything(self):
        csv = _csv_with_one_row(self.session.title, [self.student.student_ref])

        result = import_registrations_csv(
            io.StringIO(csv), uploaded_by=self.user, filename='legacy.csv',
            dry_run=True,
        )

        # Counters reflect what *would* have been written.
        self.assertEqual(result.total_csv_rows, 1)
        self.assertEqual(result.created, 1)
        self.assertEqual(result.unlinked, 1)
        # But nothing persisted.
        self.assertIsNone(result.batch_id)
        self.assertEqual(TutorialRegistration.objects.count(), 0)
        self.assertEqual(TutorialEnrolmentImport.objects.count(), 0)
```

- [ ] **Step 10.2: Run**

```powershell
python manage.py test tutorials.tests.test_registrations_importer.DryRunTests -v 2
```

Expected: 1 test passes (existing implementation handles dry-run already).

- [ ] **Step 10.3: Commit**

```powershell
git add backend/django_Admin3/tutorials/tests/test_registrations_importer.py
git commit -m "test(tutorials): registrations_importer dry-run rolls back everything"
```

---

## Task 11: Management command `import_tutorial_registrations`

**Files:**
- Create: `backend/django_Admin3/tutorials/management/commands/import_tutorial_registrations.py`
- Create: `backend/django_Admin3/tutorials/tests/test_import_tutorial_registrations_command.py`

- [ ] **Step 11.1: RED — Write a CLI smoke test**

Create `backend/django_Admin3/tutorials/tests/test_import_tutorial_registrations_command.py`:

```python
"""Smoke tests for the import_tutorial_registrations management command."""
import os
import tempfile

from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from tutorials.models import (
    TutorialEnrolmentImport, TutorialRegistration,
)
from tutorials.tests import factories


def _write_csv(session_title, refs):
    refs_field = ', '.join(str(r) for r in refs)
    text = (
        '"Title","Subject","Is Cancelled","Sitting","Enrolled",'
        '"ActEd Student Numbers","Swaps In ActEd Student Numbers",'
        '"Swaps out","Custom: Swaps out ActEd Student Numbers (Event)"\n'
        f'"{session_title}","CM2",False,"2024A",0,'
        f'"{refs_field}","","",""\n'
    )
    fd, path = tempfile.mkstemp(suffix='.csv')
    with os.fdopen(fd, 'w', encoding='utf-8') as fh:
        fh.write(text)
    return path


class ImportCommandTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='importer', email='i@t.com')
        self.student = factories.make_student()
        self.session = factories.make_session()

    def test_command_imports_csv(self):
        path = _write_csv(self.session.title, [self.student.student_ref])
        try:
            call_command(
                'import_tutorial_registrations',
                f'--file={path}',
                f'--user={self.user.username}',
            )
        finally:
            os.remove(path)

        self.assertEqual(TutorialRegistration.objects.count(), 1)
        self.assertEqual(TutorialEnrolmentImport.objects.count(), 1)

    def test_command_dry_run_persists_nothing(self):
        path = _write_csv(self.session.title, [self.student.student_ref])
        try:
            call_command(
                'import_tutorial_registrations',
                f'--file={path}',
                f'--user={self.user.username}',
                '--dry-run',
            )
        finally:
            os.remove(path)

        self.assertEqual(TutorialRegistration.objects.count(), 0)
        self.assertEqual(TutorialEnrolmentImport.objects.count(), 0)

    def test_command_errors_on_unknown_user(self):
        path = _write_csv(self.session.title, [self.student.student_ref])
        try:
            with self.assertRaises(CommandError):
                call_command(
                    'import_tutorial_registrations',
                    f'--file={path}',
                    '--user=does_not_exist',
                )
        finally:
            os.remove(path)
```

- [ ] **Step 11.2: Run, see failures**

```powershell
python manage.py test tutorials.tests.test_import_tutorial_registrations_command -v 2
```

Expected: `CommandError: Unknown command: 'import_tutorial_registrations'`.

- [ ] **Step 11.3: GREEN — Write the command**

Create `backend/django_Admin3/tutorials/management/commands/import_tutorial_registrations.py`:

```python
"""``python manage.py import_tutorial_registrations``.

One-shot legacy bulk import of ``docs/misc/tutorial_registrations.csv``
into ``acted.tutorial_registrations``. See
``docs/superpowers/specs/2026-05-08-tutorial-registrations-legacy-import-design.md``.

Examples
--------
Dry run (rolls back, prints summary)::

    python manage.py import_tutorial_registrations \\
        --file docs/misc/tutorial_registrations.csv \\
        --user admin --dry-run

Live import::

    python manage.py import_tutorial_registrations \\
        --file docs/misc/tutorial_registrations.csv \\
        --user admin
"""
from __future__ import annotations

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from tutorials.services.registrations_importer import import_registrations_csv


class Command(BaseCommand):
    help = (
        'One-shot bulk import of the legacy registrations CSV into '
        'tutorial_registrations. Refuses to run if the table is non-empty.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--file', required=True,
            help='Path to the registrations CSV (e.g. docs/misc/tutorial_registrations.csv).',
        )
        parser.add_argument(
            '--user', required=True,
            help='Username for TutorialEnrolmentImport.uploaded_by audit field.',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Run inside a transaction and roll back. Prints summary; persists nothing.',
        )
        parser.add_argument(
            '--strict', action='store_true',
            help='On per-row IntegrityError, abort the whole import (default: skip + count).',
        )

    def handle(self, *args, **opts):
        try:
            user = User.objects.get(username=opts['user'])
        except User.DoesNotExist as exc:
            raise CommandError(f"user not found: {opts['user']!r}") from exc

        try:
            fh = open(opts['file'], 'r', encoding='utf-8-sig', newline='')
        except OSError as exc:
            raise CommandError(f"cannot open file: {exc}") from exc

        try:
            try:
                result = import_registrations_csv(
                    fh,
                    uploaded_by=user,
                    filename=opts['file'],
                    dry_run=opts['dry_run'],
                    strict=opts['strict'],
                )
            except RuntimeError as exc:
                raise CommandError(str(exc)) from exc
        finally:
            fh.close()

        self._print_summary(result, dry_run=opts['dry_run'])

    def _print_summary(self, result, *, dry_run: bool):
        mode = 'DRY RUN' if dry_run else 'COMMITTED'
        self.stdout.write(self.style.SUCCESS(f'Tutorial registrations import — {mode}'))
        self.stdout.write(f'  batch_id:                {result.batch_id}')
        self.stdout.write(f'  total_csv_rows:          {result.total_csv_rows}')
        self.stdout.write(f'  created:                 {result.created}')
        self.stdout.write(f'    linked_to_choice:      {result.linked_to_choice}')
        self.stdout.write(f'    unlinked:              {result.unlinked}')
        self.stdout.write(f'  multi_match_warnings:    {result.multi_match_warnings}')
        self.stdout.write(f'  skipped_cancelled:       {result.skipped_cancelled}')
        self.stdout.write(f'  skipped_unknown_session: {result.skipped_unknown_session}')
        self.stdout.write(f'  skipped_unknown_student: {result.skipped_unknown_student}')
        self.stdout.write(f'  skipped_paren_suffix:    {result.skipped_paren_suffix}')
        self.stdout.write(f'  skipped_empty:           {result.skipped_empty}')
        self.stdout.write(f'  skipped_duplicate_in_db: {result.skipped_duplicate_in_db}')

        if result.warnings:
            self.stdout.write('')
            self.stdout.write(self.style.WARNING(f'{len(result.warnings)} warnings:'))
            for w in result.warnings:
                self.stdout.write(f'  - {w}')
```

- [ ] **Step 11.4: Run command tests**

```powershell
python manage.py test tutorials.tests.test_import_tutorial_registrations_command -v 2
```

Expected: 3 tests pass.

- [ ] **Step 11.5: Commit**

```powershell
git add backend/django_Admin3/tutorials/management/commands/import_tutorial_registrations.py backend/django_Admin3/tutorials/tests/test_import_tutorial_registrations_command.py
git commit -m "feat(tutorials): import_tutorial_registrations management command"
```

---

## Task 12: Final verification on the real CSV (manual)

This task does **not** produce a commit — it produces evidence that the importer works end-to-end on real legacy data, plus a decision point on whether to commit the bulk load to the dev database.

- [ ] **Step 12.1: Run the entire tutorials test suite**

```powershell
cd backend\django_Admin3
.\.venv\Scripts\activate
python manage.py test tutorials -v 2
```

Expected: all green. If anything fails, fix and re-commit before proceeding.

- [ ] **Step 12.2: Verify schema placement**

```powershell
python manage.py verify_schema_placement
```

Expected: no errors. `tutorial_registrations` reported in `acted` schema.

- [ ] **Step 12.3: Dry-run on the real CSV**

(Replace `<admin>` with an existing superuser username on the dev DB.)

```powershell
python manage.py import_tutorial_registrations `
    --file ..\..\docs\misc\tutorial_registrations.csv `
    --user <admin> `
    --dry-run
```

Expected output: `Tutorial registrations import — DRY RUN`, followed by counters. `batch_id: None`. The `created` count should be much larger than `unlinked` if our `TutorialChoice` table is populated; on a fresh dev DB with no checkout history, expect `unlinked == created`.

Capture the full stdout and paste it into the PR description. If `multi_match_warnings > 0`, also paste the warnings list — those are the rows the operator will need to patch up after the live load.

- [ ] **Step 12.4: Live load (only if Step 12.3 looks healthy)**

```powershell
python manage.py import_tutorial_registrations `
    --file ..\..\docs\misc\tutorial_registrations.csv `
    --user <admin>
```

Expected: `Tutorial registrations import — COMMITTED`, with a numeric `batch_id`. Verify in psql / Django shell:

```python
from tutorials.models import TutorialRegistration, TutorialEnrolmentImport
TutorialRegistration.objects.count()  # > 0
TutorialEnrolmentImport.objects.latest('uploaded_at').status  # 'COMMITTED'
```

- [ ] **Step 12.5: Confirm one-shot guard**

Run the same live-load command a second time. Expected: `CommandError: tutorial_registrations is non-empty; this importer is one-shot only`. Exit code non-zero.

- [ ] **Step 12.6: Update the PR description / changelog**

Note in the PR body:
- Migration `0017` applied to dev/staging/prod (in that order for rollout).
- Actual counter values from Step 12.3 / 12.4.
- Any operator follow-up implied by `multi_match_warnings`.
