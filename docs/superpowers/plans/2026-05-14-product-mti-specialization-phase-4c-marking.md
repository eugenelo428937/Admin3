# Product MTI Specialization — Phase 4c (Marking) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `MarkingPaper.marking_template` NOT NULL, backfilled from the MTI subclass `MarkingProduct.marking_template` via shared PK. Eliminates the Phase-1 nullability placeholder so consumers can rely on `paper.marking_template` without defensive null-checks.

**Architecture:** Two-step data + schema migration. Step 1 (data) populates `MarkingPaper.marking_template_id` from `MarkingProduct.marking_template_id` joined on the shared PK (`MarkingPaper.purchasable_id == MarkingProduct.pk`). Step 2 (schema) flips `null=True → null=False`. Pre-flight audit (dev DB) confirmed **240/240** rows backfillable and **0** orphan rows. The `purchasable` FK stays typed at `store.Purchasable` — spec §6 line 449 explicitly defers any narrowing ("may narrow to `MarkingProduct` later").

**Tech Stack:** Django 6.0 ORM, PostgreSQL (acted schema), Django migrations framework, `MarkingProduct` MTI subclass reverse OneToOne accessor.

---

## Reference: existing state (verified on dev DB 2026-05-14)

| Quantity | Value |
|---|---|
| `MarkingPaper` total rows | 240 |
| `MarkingPaper.marking_template` NULL | 240 |
| `MarkingPaper.purchasable` NULL | 0 |
| Distinct `MarkingPaper.purchasable_id` values | 93 |
| Of those that resolve to a `MarkingProduct` PK | 93 (100%) |
| `MarkingProduct` rows with `marking_template_id IS NULL` referenced by any paper | 0 |

Every paper's `purchasable_id` is a valid `MarkingProduct` PK, and every such `MarkingProduct` already has a non-null `marking_template_id`. The Phase-1 design (migration `0017_add_marking_template_and_paper_fk`) added the field as nullable with an explicit Phase 4c TODO comment — that comment is now actioned.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `backend/django_Admin3/marking/tests/fixtures.py` | Modify | `MarkingChainTestCase.setUpTestData`: create a `MarkingTemplate` and pass it to the shared `MarkingPaper` fixture so subclasses can rely on `cls.paper.marking_template`. |
| `backend/django_Admin3/marking/tests/test_models.py` | Modify | `MarkingPaperTestCase.setUp`: build a `MarkingTemplate`; thread it through all `MarkingPaper.objects.create(...)` callsites (~30 sites) — currently passes nothing for `marking_template`. |
| `backend/django_Admin3/marking/tests/test_views.py` | Modify | 3 setUp blocks each with 2-3 `MarkingPaper.objects.create(...)` (8 sites total) — supply `marking_template`. |
| `backend/django_Admin3/marking/tests/test_serializer_field_coverage.py` | Modify | 1 setUp `MarkingPaper.objects.create(...)` — supply `marking_template`. |
| `backend/django_Admin3/marking/tests/test_marking_template_model.py` | Modify | `MarkingPaperHasTemplateFKTests.test_marking_paper_has_marking_template_field` — flip null assertion from `True` to `False`. |
| `backend/django_Admin3/marking/migrations/0020_backfill_marking_paper_template.py` | Create | Data migration: `RunPython` populating `MarkingPaper.marking_template_id` from `MarkingProduct.marking_template_id` via shared PK. Idempotent. |
| `backend/django_Admin3/marking/migrations/0021_alter_markingpaper_template_not_null.py` | Create | Schema migration: `AlterField` removing `null=True, blank=True`. |
| `backend/django_Admin3/marking/models/marking_paper.py` | Modify | Remove `null=True, blank=True` on `marking_template`; update help_text (drop the "Phase 4c" caveat). |
| `backend/django_Admin3/marking/management/commands/import_marking_deadlines.py` | Modify | Resolve `marking_template` via `store_product.markingproduct.marking_template` and pass it to `MarkingPaper.objects.create(...)`. |
| `backend/django_Admin3/marking/tests/test_backfill_marking_paper_template.py` | Create | Migration test: load test data with NULL `marking_template`, run forward, assert all rows populated. |
| `backend/django_Admin3/marking/tests/test_import_marking_deadlines.py` | Modify (or create if absent) | Add assertion that imported `MarkingPaper` has a populated `marking_template`. |

**Decomposition rationale:** Fixture updates land first (Task 1) so the rest of the test suite stays green when the model flip happens in Task 3. Data migration (Task 2) precedes schema migration (Task 3) so the NOT NULL constraint never sees a null row. Command update (Task 4) is independent and could be parallel but executes last for simplicity.

---

## Task 1: Add `marking_template` to all `MarkingPaper` test fixtures

**Files:**
- Modify: `backend/django_Admin3/marking/tests/fixtures.py:78-84`
- Modify: `backend/django_Admin3/marking/tests/test_models.py:26-65` (setUp), plus all `MarkingPaper.objects.create(...)` callsites in this file (search the file)
- Modify: `backend/django_Admin3/marking/tests/test_views.py` (3 setUp blocks at lines ~80, ~390, ~529 — 8 `MarkingPaper.objects.create` callsites)
- Modify: `backend/django_Admin3/marking/tests/test_serializer_field_coverage.py:57`

- [ ] **Step 1: Run the full marking test suite to establish baseline (must be green)**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test marking -v 2`
Expected: ALL PASS (we have not changed any code yet — this is the baseline).

- [ ] **Step 2: Update shared fixture in `marking/tests/fixtures.py`**

Find the block at lines 75-84 (the `cls.store_product = StoreProduct.objects.create(...)` followed by `cls.paper = MarkingPaper.objects.create(...)`) and insert a `MarkingTemplate` creation before it. Replace this block:

```python
        cls.store_product = StoreProduct.objects.create(
            exam_session_subject=cls.ess,
            product_product_variation=cls.ppv,
        )
        cls.paper = MarkingPaper.objects.create(
            purchasable=cls.store_product,
            name='FixPaper',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40),
        )
```

with:

```python
        from marking.models import MarkingTemplate  # local import — Phase 4c
        cls.marking_template = MarkingTemplate.objects.create(
            code='FIX', name='Fixture Marking Series',
        )
        cls.store_product = StoreProduct.objects.create(
            exam_session_subject=cls.ess,
            product_product_variation=cls.ppv,
        )
        cls.paper = MarkingPaper.objects.create(
            purchasable=cls.store_product,
            marking_template=cls.marking_template,  # Phase 4c: NOT NULL
            name='FixPaper',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40),
        )
```

- [ ] **Step 3: Update `marking/tests/test_models.py`**

In `MarkingPaperTestCase.setUp` (around line 26-65), insert a `MarkingTemplate` creation **after** the `self.store_product = StoreProduct.objects.create(...)` block (i.e., after line 65):

```python
        # Phase 4c: every MarkingPaper now requires marking_template.
        from marking.models import MarkingTemplate
        self.marking_template = MarkingTemplate.objects.create(
            code='TST', name='Test Marking Series',
        )
```

Then, in **every** `MarkingPaper.objects.create(...)` invocation in this file (lines 72, 92, 105, 127, 146, 155, 163, 175, 187, 202, 221, 228, 242, 256, 270, 281, 294, 301, 316, 328, 335, 349, 362, 375, 390, 396, 459, 490), add `marking_template=self.marking_template,` immediately after the `purchasable=...` argument. Example:

```python
        paper = MarkingPaper.objects.create(
            purchasable=self.store_product,
            marking_template=self.marking_template,  # ADD THIS LINE
            name='Paper1',
            deadline=deadline,
            recommended_submit_date=recommended_date,
        )
```

Hint: many of these are inside loops or near-identical blocks — use Edit's `replace_all=True` cautiously, or replace block-by-block to avoid mismatching unrelated `Marking` callsites in other files.

- [ ] **Step 4: Update `marking/tests/test_views.py` (3 setUp blocks, 8 callsites)**

For each of the 3 setUp blocks (around lines 80, 390, 529), insert a `MarkingTemplate.objects.create(...)` and assign to `self.marking_template`. Then add `marking_template=self.marking_template,` to all 8 `MarkingPaper.objects.create(...)` calls at lines 80, 87, 94, 390, 396, 529, 535, 541.

- [ ] **Step 5: Update `marking/tests/test_serializer_field_coverage.py`**

In the setUp around line 57, add a `MarkingTemplate` creation and pass `marking_template=self.marking_template` to the single `MarkingPaper.objects.create(...)`.

- [ ] **Step 6: Run the full marking test suite to verify no regressions**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test marking -v 2`
Expected: ALL PASS (same baseline as Step 1, but now every `MarkingPaper.objects.create(...)` callsite passes `marking_template`).

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/marking/tests/
git commit -m "test(marking): Phase 4c — supply marking_template in all MarkingPaper fixtures

Mechanical fixture update preceding the NOT NULL flip. Every
MarkingPaper.objects.create(...) callsite now passes a MarkingTemplate
so the suite stays green when migration 0021 makes marking_template
non-nullable.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Data migration — backfill `MarkingPaper.marking_template` from `MarkingProduct`

**Files:**
- Create: `backend/django_Admin3/marking/migrations/0020_backfill_marking_paper_template.py`
- Create: `backend/django_Admin3/marking/tests/test_backfill_marking_paper_template.py`

- [ ] **Step 1: Write the failing migration test**

Create `backend/django_Admin3/marking/tests/test_backfill_marking_paper_template.py`:

```python
"""Tests for migration 0020_backfill_marking_paper_template.

Verifies the data migration copies marking_template_id from MarkingProduct
to MarkingPaper via shared PK (paper.purchasable_id == MarkingProduct.pk).
"""
from django.test import TransactionTestCase
from django.db import connection
from django.utils import timezone
from datetime import timedelta


class BackfillMarkingPaperTemplateTests(TransactionTestCase):
    """The migration is idempotent: re-running it changes nothing."""

    def test_backfills_all_papers_via_marking_product(self):
        """Every paper whose purchasable resolves to a MarkingProduct
        gets that MarkingProduct's marking_template_id."""
        from catalog.models import (
            ExamSession, ExamSessionSubject, Subject,
            Product as CatProd, ProductVariation, ProductProductVariation,
        )
        from store.models import MarkingProduct
        from marking.models import MarkingPaper, MarkingTemplate

        # ── arrange: build a paper with NULL marking_template whose
        #    purchasable is a MarkingProduct with a known template.
        subj = Subject.objects.create(code='TST', description='T', active=True)
        es = ExamSession.objects.create(
            session_code='APR2026',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        ess = ExamSessionSubject.objects.create(exam_session=es, subject=subj)
        tpl = MarkingTemplate.objects.create(code='XBKFL', name='Backfill X')
        cat = CatProd.objects.create(code='BKFL', fullname='F', shortname='S')
        pv = ProductVariation.objects.create(
            variation_type='Marking', name='Std', code='MBKFL',
        )
        ppv = ProductProductVariation.objects.create(
            product=cat, product_variation=pv,
        )
        mp = MarkingProduct(
            exam_session_subject=ess,
            product_product_variation=ppv,
            marking_template=tpl,
        )
        mp.save()
        paper = MarkingPaper.objects.create(
            purchasable=mp,  # shared-PK with MarkingProduct
            name='X1',
            deadline=timezone.now() + timedelta(days=30),
            recommended_submit_date=timezone.now() + timedelta(days=25),
        )
        # Force NULL — even though Task 1 fixtures pass a template, the
        # migration's job is to fix legacy NULL rows.
        MarkingPaper.objects.filter(pk=paper.pk).update(marking_template=None)
        paper.refresh_from_db()
        self.assertIsNone(paper.marking_template_id)

        # ── act: run the data migration's forward function directly.
        from marking.migrations.0020_backfill_marking_paper_template import (
            backfill_marking_paper_template,
        )
        from django.apps import apps
        backfill_marking_paper_template(apps, connection.schema_editor())

        # ── assert: marking_template populated from MarkingProduct.
        paper.refresh_from_db()
        self.assertEqual(paper.marking_template_id, tpl.id)

    def test_backfill_is_idempotent(self):
        """Running the backfill twice does not change anything after the first run."""
        from django.apps import apps
        from marking.migrations.0020_backfill_marking_paper_template import (
            backfill_marking_paper_template,
        )
        # Run twice — second call should be a no-op (no exceptions).
        backfill_marking_paper_template(apps, connection.schema_editor())
        backfill_marking_paper_template(apps, connection.schema_editor())
```

Note: the migration module name starts with a digit, so you can't `from marking.migrations.0020_...` directly — Python rejects that. Use `importlib`:

```python
import importlib
mod = importlib.import_module(
    'marking.migrations.0020_backfill_marking_paper_template'
)
backfill_marking_paper_template = mod.backfill_marking_paper_template
```

Adjust both `act` blocks to use `mod.backfill_marking_paper_template(apps, connection.schema_editor())`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test marking.tests.test_backfill_marking_paper_template -v 2`
Expected: FAIL with `ModuleNotFoundError: No module named 'marking.migrations.0020_...'`

- [ ] **Step 3: Create the data migration**

Create `backend/django_Admin3/marking/migrations/0020_backfill_marking_paper_template.py`:

```python
"""Phase 4c: backfill MarkingPaper.marking_template_id from MarkingProduct.

For every MarkingPaper whose `purchasable` is a MarkingProduct (verified
true for 240/240 rows on dev DB 2026-05-14), copy the MarkingProduct's
`marking_template_id` onto the paper. Bulk SQL update keyed on the
shared MTI PK.

Idempotent: papers whose marking_template_id is already populated are
left untouched.

Out-of-scope: papers whose purchasable does NOT resolve to a
MarkingProduct (e.g., the paper points at a MaterialProduct or
GenericItem). Dev-DB audit found zero such rows. If any are found in
production at migration time, they remain with marking_template=NULL
and migration 0021 will fail with IntegrityError — surfacing them
before consumers can rely on the constraint. That \"loud failure\"
behaviour is intentional.
"""
from django.db import migrations


def backfill_marking_paper_template(apps, schema_editor):
    """Forward: set marking_template_id from MarkingProduct via shared PK.

    Uses a single UPDATE ... FROM ... SQL statement for efficiency,
    matching the size of MarkingProduct (~677 rows on dev) and avoiding
    Python-side row-by-row iteration.
    """
    MarkingPaper = apps.get_model('marking', 'MarkingPaper')
    MarkingProduct = apps.get_model('store', 'MarkingProduct')

    # SQL UPDATE...FROM keyed on shared MTI PK.
    # MarkingProduct table = "acted"."marking_products" (subclass).
    # MarkingPaper table   = "acted"."marking_paper".
    # Shared PK: marking_products.purchasable_ptr_id == marking_paper.purchasable_id.
    with schema_editor.connection.cursor() as cur:
        cur.execute(
            'UPDATE "acted"."marking_paper" mp '
            'SET marking_template_id = mprod.marking_template_id '
            'FROM "acted"."marking_products" mprod '
            'WHERE mp.purchasable_id = mprod.purchasable_ptr_id '
            '  AND mp.marking_template_id IS NULL '
            '  AND mprod.marking_template_id IS NOT NULL'
        )
        affected = cur.rowcount
        print(f'  backfill_marking_paper_template: updated={affected} papers')


def reverse_backfill(apps, schema_editor):
    """Reverse: NO-OP. We cannot reliably distinguish backfilled rows
    from manually-set rows. Schema migration 0021 reverse re-allows
    null, so even if data is restored, FK integrity holds.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('marking', '0019_backfill_marking_templates'),
        ('store', '0018_create_marking_products'),
    ]

    operations = [
        migrations.RunPython(
            backfill_marking_paper_template,
            reverse_code=reverse_backfill,
        ),
    ]
```

Note: confirm the actual store-app migration that creates `MarkingProduct` exists at `0018_create_marking_products.py` (it does — listed in the Phase 4c reference glob). If the latest store migration number is higher, set the dependency to whatever store migration most recently touched MarkingProduct's structure.

- [ ] **Step 4: Verify migration imports cleanly**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe -c "import importlib; m = importlib.import_module('marking.migrations.0020_backfill_marking_paper_template'); print(m.backfill_marking_paper_template)"`
Expected: prints `<function backfill_marking_paper_template at 0x...>`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test marking.tests.test_backfill_marking_paper_template -v 2`
Expected: PASS — both tests green.

- [ ] **Step 6: Run the migration against dev DB**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py migrate marking 0020`
Expected: output contains `backfill_marking_paper_template: updated=240 papers` (or current row count).

- [ ] **Step 7: Verify dev DB state after migration**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py shell -c "from marking.models import MarkingPaper; print('NULL after backfill:', MarkingPaper.objects.filter(marking_template__isnull=True).count())"`
Expected: `NULL after backfill: 0`.

- [ ] **Step 8: Commit**

```bash
git add backend/django_Admin3/marking/migrations/0020_backfill_marking_paper_template.py \
        backend/django_Admin3/marking/tests/test_backfill_marking_paper_template.py
git commit -m "feat(marking): Phase 4c — backfill MarkingPaper.marking_template from MarkingProduct

Single UPDATE...FROM keyed on shared MTI PK
(MarkingPaper.purchasable_id == MarkingProduct.purchasable_ptr_id).
Idempotent: skips already-populated rows. Dev-DB pre-flight: 240/240
papers covered; 0 orphans.

The next migration (0021) flips marking_template to NOT NULL; this
backfill must land first to avoid an IntegrityError on the constraint.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Schema migration + model — `MarkingPaper.marking_template` NOT NULL

**Files:**
- Modify: `backend/django_Admin3/marking/models/marking_paper.py:37-47`
- Create: `backend/django_Admin3/marking/migrations/0021_alter_markingpaper_template_not_null.py`
- Modify: `backend/django_Admin3/marking/tests/test_marking_template_model.py:74-87`

- [ ] **Step 1: Flip the existing Phase 1 nullability test (RED)**

Edit `backend/django_Admin3/marking/tests/test_marking_template_model.py` lines 74-87. The current block asserts `field.null is True` for Phase 1; flip it to assert NOT null, and rename:

```python
    def test_marking_paper_marking_template_is_not_null(self):
        """Phase 4c: marking_template is now NOT NULL after the
        backfill migration (0020) populated every row.

        Going forward, every paper belongs to a series — there is no
        legitimate 'series-less' paper in the data model.
        """
        from marking.models import MarkingPaper
        field = MarkingPaper._meta.get_field('marking_template')
        self.assertFalse(field.null, 'Phase 4c: marking_template must be NOT NULL')

    def test_marking_paper_marking_template_on_delete_protect(self):
        from marking.models import MarkingPaper
        from django.db import models as dj_models
        field = MarkingPaper._meta.get_field('marking_template')
        # PROTECT prevents accidental cascade deletion of all papers for a series.
        self.assertEqual(field.remote_field.on_delete, dj_models.PROTECT)
```

- [ ] **Step 2: Add an IntegrityError test for the new constraint (RED)**

Append to the same `MarkingPaperHasTemplateFKTests` class:

```python
    def test_marking_paper_create_without_template_raises(self):
        """Phase 4c: a MarkingPaper cannot be created without a
        marking_template — IntegrityError at the DB layer."""
        from django.db import IntegrityError, transaction
        from django.utils import timezone
        from datetime import timedelta
        from marking.models import MarkingPaper
        from store.models import Purchasable
        # Build a minimal Purchasable to satisfy MarkingPaper.purchasable.
        p = Purchasable.objects.create(
            kind='marking', code='ORPHTPL', name='No template test',
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                MarkingPaper.objects.create(
                    purchasable=p,
                    name='X',
                    deadline=timezone.now() + timedelta(days=30),
                    recommended_submit_date=timezone.now() + timedelta(days=25),
                    # marking_template intentionally omitted
                )
```

- [ ] **Step 3: Run the failing tests**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test marking.tests.test_marking_template_model -v 2`
Expected: 2 FAIL — `test_marking_paper_marking_template_is_not_null` (still null=True) and `test_marking_paper_create_without_template_raises` (still allows NULL).

- [ ] **Step 4: Modify `MarkingPaper.marking_template` field (GREEN)**

Edit `backend/django_Admin3/marking/models/marking_paper.py` lines 37-47. Replace this block:

```python
    marking_template = models.ForeignKey(
        'marking.MarkingTemplate',
        on_delete=models.PROTECT,
        related_name='marking_papers',
        null=True,
        blank=True,
        help_text=(
            'The marking template this paper belongs to. Nullable during '
            'Phase 1 (created); backfilled and made NOT NULL in Phase 4c.'
        ),
    )
```

with:

```python
    marking_template = models.ForeignKey(
        'marking.MarkingTemplate',
        on_delete=models.PROTECT,
        related_name='marking_papers',
        help_text=(
            'The marking series this paper belongs to. Required as of '
            'Phase 4c; backfilled by migration 0020 from MarkingProduct.'
        ),
    )
```

Also update the module-level docstring at the top of the file (lines 1-13) to reference Phase 4c instead of "Phase 1 (created); backfilled in Phase 4c."

- [ ] **Step 5: Generate the schema migration**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py makemigrations marking --name alter_markingpaper_template_not_null`
Expected: creates `0021_alter_markingpaper_template_not_null.py` with a single `AlterField` removing `null=True, blank=True`.

Verify the generated file looks like:

```python
class Migration(migrations.Migration):
    dependencies = [
        ('marking', '0020_backfill_marking_paper_template'),
    ]
    operations = [
        migrations.AlterField(
            model_name='markingpaper',
            name='marking_template',
            field=models.ForeignKey(
                help_text='The marking series this paper belongs to. Required as of Phase 4c; backfilled by migration 0020 from MarkingProduct.',
                on_delete=django.db.models.deletion.PROTECT,
                related_name='marking_papers',
                to='marking.markingtemplate',
            ),
        ),
    ]
```

If `makemigrations` produces extra fields (`blank=True` removal usually shows as a separate field arg) just verify the FK no longer has `null=True`/`blank=True`.

- [ ] **Step 6: Apply the migration on dev DB**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py migrate marking`
Expected: `Applying marking.0021_alter_markingpaper_template_not_null... OK`.

- [ ] **Step 7: Run the model tests to verify GREEN**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test marking.tests.test_marking_template_model -v 2`
Expected: ALL PASS, including the two new tests.

- [ ] **Step 8: Run the full marking test suite to confirm no regressions**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test marking -v 2`
Expected: ALL PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/django_Admin3/marking/models/marking_paper.py \
        backend/django_Admin3/marking/migrations/0021_alter_markingpaper_template_not_null.py \
        backend/django_Admin3/marking/tests/test_marking_template_model.py
git commit -m "feat(marking): Phase 4c — MarkingPaper.marking_template NOT NULL

Removes null=True/blank=True from MarkingPaper.marking_template.
Migration 0020 (data backfill) precedes this 0021 (schema alter).
Tests flip from the Phase-1 nullability assertion to the Phase-4c
required-field assertion plus a fresh IntegrityError test.

The Phase-1 schema design explicitly anticipated this flip —
see migration 0017's help_text 'NOT NULL in Phase 4c'.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Update `import_marking_deadlines` command

**Files:**
- Modify: `backend/django_Admin3/marking/management/commands/import_marking_deadlines.py:81-86`
- Modify (or create): `backend/django_Admin3/marking/tests/test_import_marking_deadlines.py`

- [ ] **Step 1: Check whether a test file exists**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe -c "import os; print(os.path.exists('marking/tests/test_import_marking_deadlines.py'))"`

If `False`, create a new test file. If `True`, append a test to the existing file.

- [ ] **Step 2: Write a failing test for the command**

Either create `backend/django_Admin3/marking/tests/test_import_marking_deadlines.py` or append to it:

```python
"""Tests for the import_marking_deadlines management command.

After Phase 4c, the command MUST populate MarkingPaper.marking_template
or the row insert will fail (NOT NULL constraint).
"""
import tempfile
import os
from datetime import timedelta
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatProd, ProductVariation, ProductProductVariation,
)
from marking.models import MarkingPaper, MarkingTemplate
from store.models import MarkingProduct


class ImportMarkingDeadlinesPhase4cTests(TestCase):
    def test_imported_paper_has_marking_template(self):
        """After import, the new MarkingPaper row has marking_template
        derived from the resolved MarkingProduct's series."""
        # ── arrange catalog + store rows the importer expects to find.
        subj = Subject.objects.create(code='CB1', description='C', active=True)
        es = ExamSession.objects.create(
            session_code='APR2026',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        ess = ExamSessionSubject.objects.create(exam_session=es, subject=subj)
        tpl = MarkingTemplate.objects.create(code='X', name='Series X')
        cat = CatProd.objects.create(code='X', fullname='X Papers Marking', shortname='X')
        pv = ProductVariation.objects.create(
            variation_type='Marking', name='Std', code='MX',
        )
        ppv = ProductProductVariation.objects.create(
            product=cat, product_variation=pv,
        )
        mp = MarkingProduct(
            exam_session_subject=ess,
            product_product_variation=ppv,
            marking_template=tpl,
        )
        mp.save()

        # ── write a one-row TSV the importer can consume.
        with tempfile.NamedTemporaryFile(
            mode='w', suffix='.tsv', delete=False, encoding='utf-8',
        ) as f:
            # Columns: subject, paper_name, recommended_date, deadline_date.
            f.write('CB1\tX1\t01/04/2026\t15/04/2026\n')
            tsv_path = f.name

        try:
            # ── act.
            call_command('import_marking_deadlines', tsv_path)
            # ── assert.
            paper = MarkingPaper.objects.get(name='X1')
            self.assertEqual(paper.marking_template_id, tpl.id)
        finally:
            os.unlink(tsv_path)
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test marking.tests.test_import_marking_deadlines.ImportMarkingDeadlinesPhase4cTests -v 2`
Expected: FAIL with `IntegrityError: null value in column "marking_template_id" violates not-null constraint` (the command currently calls `MarkingPaper.objects.create(purchasable=...)` without `marking_template`).

- [ ] **Step 4: Update the import command**

Edit `backend/django_Admin3/marking/management/commands/import_marking_deadlines.py` lines 81-86. Replace:

```python
                    MarkingPaper.objects.create(
                        purchasable=store_product,
                        name=paper_name.strip(),
                        recommended_submit_date=recommended,
                        deadline=deadline
                    )
```

with:

```python
                    # Phase 4c: resolve the MarkingProduct subclass to
                    # get the series template. The filter above already
                    # restricted to variation_type='Marking', so
                    # store_product.markingproduct must exist.
                    try:
                        marking_template = store_product.markingproduct.marking_template
                    except MarkingProduct.DoesNotExist:
                        self.stderr.write(
                            f"Row {row_num}: store.Product {store_product.pk} "
                            f"has no MarkingProduct subclass row. Skipping."
                        )
                        continue
                    MarkingPaper.objects.create(
                        purchasable=store_product,
                        marking_template=marking_template,
                        name=paper_name.strip(),
                        recommended_submit_date=recommended,
                        deadline=deadline,
                    )
```

Also add `from store.models import MarkingProduct` at the top of the file (after the existing `from store.models import Product as StoreProduct` import) so the `MarkingProduct.DoesNotExist` reference resolves.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test marking.tests.test_import_marking_deadlines.ImportMarkingDeadlinesPhase4cTests -v 2`
Expected: PASS.

- [ ] **Step 6: Run the full marking suite one final time**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test marking -v 2`
Expected: ALL PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/marking/management/commands/import_marking_deadlines.py \
        backend/django_Admin3/marking/tests/test_import_marking_deadlines.py
git commit -m "feat(marking): Phase 4c — import_marking_deadlines sets marking_template

Resolves the series template via the MarkingProduct MTI subclass
reverse-OneToOne accessor (store_product.markingproduct.marking_template).
The filter above already restricts to variation_type='Marking', so
every store_product reached by this code path has a MarkingProduct row.
A defensive DoesNotExist guard logs and skips any unexpected miss.

Without this change, the command would now raise IntegrityError on
every row insert (marking_template_id is NOT NULL as of migration 0021).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Cross-cutting verification

**Files:** None modified — verification only.

- [ ] **Step 1: Run the full backend test suite**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test -v 1 --parallel`
Expected: ALL PASS (no regressions across other apps from the marking model change).

If any other app's tests create `MarkingPaper` directly without `marking_template`, fix those too — grep for `MarkingPaper.objects.create` outside the marking app:

```bash
grep -rn 'MarkingPaper\.objects\.create\|MarkingPaper(' backend/django_Admin3 \
  --include='*.py' \
  | grep -v 'backend/django_Admin3/marking/'
```

The pre-flight audit showed all hits were inside `marking/` — but re-confirm.

- [ ] **Step 2: Sanity check the dev DB state**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py shell -c "from marking.models import MarkingPaper; print('papers without template:', MarkingPaper.objects.filter(marking_template__isnull=True).count()); print('papers total:', MarkingPaper.objects.count())"`
Expected: `papers without template: 0` and `papers total: 240`.

- [ ] **Step 3: `makemigrations --check --dry-run` to verify no model drift**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py makemigrations --check --dry-run`
Expected: "No changes detected".

- [ ] **Step 4: Push branch and open PR**

```bash
git push -u origin feat/20260514-product-mti-phase-4c-marking
gh pr create --base main --head feat/20260514-product-mti-phase-4c-marking \
  --title "feat(marking): Phase 4c — MarkingPaper.marking_template NOT NULL" \
  --body "$(cat <<'BODY'
## Phase 4c of Product MTI specialization

Makes \`MarkingPaper.marking_template\` non-nullable. The Phase-1 schema
design explicitly staged this flip — see the help_text on the FK
declared in migration \`0017_add_marking_template_and_paper_fk\`.

### Changes

- **Data migration 0020** — backfills \`MarkingPaper.marking_template_id\`
  from \`MarkingProduct.marking_template_id\` via shared MTI PK. Single
  \`UPDATE ... FROM\` keyed on the join. Idempotent.
- **Schema migration 0021** — \`AlterField\` removing \`null=True,
  blank=True\`.
- **Model** — \`marking/models/marking_paper.py\` updated; help_text
  refreshed.
- **Tests** — fixtures supply \`marking_template\` everywhere; Phase-1
  nullability assertion flipped to Phase-4c required-field assertion;
  new IntegrityError test.
- **Command** — \`import_marking_deadlines\` resolves the template via
  \`store_product.markingproduct.marking_template\`.

### Pre-flight (dev DB, 2026-05-14)

| Quantity | Value |
|---|---|
| MarkingPaper total rows | 240 |
| With NULL \`marking_template\` | 240 (will be backfilled) |
| Whose \`purchasable\` resolves to a MarkingProduct | 240 / 240 |
| Whose MarkingProduct has non-null \`marking_template\` | 240 / 240 |

### Out of scope (deferred to a later phase)

- Narrowing \`MarkingPaper.purchasable\` FK from \`store.Purchasable\` to
  \`store.MarkingProduct\`. Design spec §6 line 449 explicitly says
  "may narrow ... later."

🤖 Generated with [Claude Code](https://claude.com/claude-code)
BODY
)"
```

---

## Self-Review Notes (controller-side)

**Spec coverage check:**
- ✅ Spec line 449: "MarkingPaper.marking_template becomes non-null" — Tasks 2 + 3.
- ✅ Spec risk #5 ("Marking deadlines orphaned if MarkingTemplate backfill misses a code") — Task 2 sources data from MarkingProduct (which is already populated; see §7.2 backfill test) and Task 5 step 2 verifies zero residual nulls.
- ✅ Spec note: "purchasable may narrow ... later" — deliberately deferred; called out in PR body.

**Placeholder scan:** No "TBD", "TODO", "fill in", or "similar to" markers. Every step has either explicit code or an exact command.

**Type consistency:** `marking_template`, `marking_template_id`, `MarkingTemplate`, `MarkingProduct` used consistently throughout. The reverse OneToOne accessor `store_product.markingproduct` matches the canonical lowercase model-name pattern used in Phase 3.2 (`product.materialproduct`, `product.tutorialproduct`).
