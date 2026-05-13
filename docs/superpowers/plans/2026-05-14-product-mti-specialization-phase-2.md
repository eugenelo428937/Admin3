# Product MTI Specialization — Phase 2: Foundations + Backfill

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adjust Phase 1's subclass schemas to match real catalog data (23 tutorial formats, composite-unique marking templates, nullable tutorial location), backfill `MarkingTemplate` rows from `catalog_products.Product`, then run a `split_products_by_kind` management command that creates one `MaterialProduct` / `TutorialProduct` / `MarkingProduct` row per existing `store.Product` and reassigns `Purchasable.kind` away from `'product'`.

**Architecture:** Two-stage rollout in a single PR. Stage 2A: three `AlterField`-only migrations to reshape the Phase 1 schemas (Format enum expansion, MarkingTemplate composite uniqueness, TutorialProduct nullable FKs). Stage 2B: one `RunPython` data migration to seed `MarkingTemplate` rows, then a `split_products_by_kind` management command that walks every `store.Product`, classifies by `product_product_variation.product_variation.variation_type`, and creates the matching MTI subclass row via PK-preserving insert. Idempotent — re-runs are no-ops on already-split rows.

**Tech Stack:** Django 6.0 ORM/migrations, PostgreSQL with `acted` schema, per-app TDD with `python manage.py test`. Branch: `feat/20260514-product-mti-phase-2`, stacked on `feat/20260513-product-mti-specialization` (PR #107).

**Scope note:** This is Plan 2 of 5. Plan 1 (Phase 1 schema additions) is at PR #107. Plans 3 (dual-write), 4 (per-app consumer repoint), and 5 (drop legacy) follow in subsequent PRs.

**Pre-flight (no task — operator does once before Task 8):**

The 75 orphan `Purchasable` rows with `kind='product'` and no `Product` MTI child must be deleted via manual SQL before the split command runs:

```sql
DELETE FROM "acted"."purchasables"
WHERE kind = 'product'
  AND id NOT IN (SELECT purchasable_ptr_id FROM "acted"."products");
-- Should delete exactly 75 rows. Re-run as no-op to confirm.
```

Task 8 verifies the count is zero before doing the split.

---

## File Structure

### Files to create

| Path | Responsibility |
|------|----------------|
| `backend/django_Admin3/store/migrations/0019_reshape_tutorial_product.py` | AlterField: expand `Format` enum, make `tutorial_location` and `tutorial_course_template` nullable. |
| `backend/django_Admin3/marking/migrations/0018_marking_template_composite_uc.py` | AlterField + AddConstraint: drop `unique=True` on `MarkingTemplate.code`; add `UniqueConstraint(code, name)`. |
| `backend/django_Admin3/marking/migrations/0019_backfill_marking_templates.py` | RunPython: create one `MarkingTemplate` row per distinct catalog `Product` referenced by a Marking PPV. Idempotent. |
| `backend/django_Admin3/store/management/commands/split_products_by_kind.py` | The split command with `--dry-run`, `--check`, `--commit` modes. |
| `backend/django_Admin3/store/management/commands/__init__.py` | (exists; no change) |
| `backend/django_Admin3/store/tests/test_split_products_by_kind.py` | TDD tests for the management command. |
| `backend/django_Admin3/marking/tests/test_backfill_marking_templates.py` | TDD tests for the marking template backfill data migration. |

### Files to modify

| Path | Change |
|------|--------|
| `backend/django_Admin3/store/models/tutorial_product.py` | Expand `Format` TextChoices to 23 codes; drop `LIVE`/`REC`; make `tutorial_location` + `tutorial_course_template` nullable. |
| `backend/django_Admin3/marking/models/marking_template.py` | Drop `unique=True` on `code`; add composite `UniqueConstraint(code, name)`. |
| `backend/django_Admin3/store/tests/test_tutorial_product_model.py` | Update `test_format_is_textchoices` to assert the new 23-value enum; add tests for nullable FKs. |
| `backend/django_Admin3/marking/tests/test_marking_template_model.py` | Replace `test_code_is_unique` with `test_code_alone_is_not_unique` and `test_code_name_pair_is_unique`. |

---

## Task 1: Expand `TutorialProduct.Format` enum + make tutorial FKs nullable

**Files:**
- Modify: `backend/django_Admin3/store/models/tutorial_product.py`
- Modify: `backend/django_Admin3/store/tests/test_tutorial_product_model.py`
- Create: `backend/django_Admin3/store/migrations/0019_reshape_tutorial_product.py` (generated)

Combines three model-level changes for `TutorialProduct` into one migration: Format enum expansion, location nullability, and course-template nullability.

- [ ] **Step 1.1: Write the failing tests**

In `backend/django_Admin3/store/tests/test_tutorial_product_model.py`, REPLACE the existing `test_format_is_textchoices` test with this expanded version, and ADD the two new field-nullability tests to `TutorialProductFieldsTests`:

```python
    def test_format_is_textchoices_with_23_real_codes(self):
        """Phase 2 expanded the enum to match the 23 real codes in
        catalog_product_variations (variation_type='Tutorial'). The
        Phase 1 placeholders LIVE and REC were dropped — no data uses them.
        """
        from store.models import TutorialProduct
        field = TutorialProduct._meta.get_field('format')
        format_values = {value for value, _label in field.choices}
        expected = {
            # Face-to-face (9)
            'F2F_1F', 'F2F_1PD', 'F2F_2F', 'F2F_3F', 'F2F_4F',
            'F2F_5B', 'F2F_5F', 'F2F_6B', 'F2F_6H',
            # Live online (13)
            'LO_10H', 'LO_1F', 'LO_1PD', 'LO_2F', 'LO_2H',
            'LO_3F', 'LO_4F', 'LO_4H', 'LO_5B', 'LO_5F',
            'LO_6B', 'LO_6H', 'LO_8H',
            # Online classroom (1)
            'OC',
        }
        self.assertEqual(format_values, expected,
                         f"Expected 23 codes; got {format_values}")
        # Dropped placeholders must NOT appear
        self.assertNotIn('LIVE', format_values)
        self.assertNotIn('REC', format_values)

    def test_tutorial_location_is_nullable(self):
        """OC (Online Classroom) products have no physical venue.
        Phase 2 made tutorial_location nullable to express that.
        """
        from store.models import TutorialProduct
        field = TutorialProduct._meta.get_field('tutorial_location')
        self.assertTrue(field.null, "Phase 2: tutorial_location must be nullable for OC products")
        self.assertTrue(field.blank)

    def test_tutorial_course_template_is_nullable(self):
        """Some OC products have no matching TutorialCourseTemplate at
        backfill time. Nullable lets the backfill proceed; operators
        can fix the data later.
        """
        from store.models import TutorialProduct
        field = TutorialProduct._meta.get_field('tutorial_course_template')
        self.assertTrue(field.null)
        self.assertTrue(field.blank)
```

Remove the now-stale `test_format_is_textchoices` method (the one that only asserted 5 codes).

- [ ] **Step 1.2: Run tests to verify RED**

```bash
cd backend/django_Admin3
python manage.py test store.tests.test_tutorial_product_model.TutorialProductFieldsTests -v 2
```

Expected: 3 tests fail. `test_format_is_textchoices_with_23_real_codes` fails because the enum has 5 codes not 23. `test_tutorial_location_is_nullable` and `test_tutorial_course_template_is_nullable` fail because `field.null` is False.

- [ ] **Step 1.3: Expand the `Format` enum**

In `backend/django_Admin3/store/models/tutorial_product.py`, REPLACE the `class Format(models.TextChoices):` block with the 23-code expanded version:

```python
    class Format(models.TextChoices):
        # Phase 2 expanded to match the 23 real codes in
        # catalog_product_variations (variation_type='Tutorial').
        # LIVE/REC dropped — no data uses them.

        # Face-to-face
        F2F_1F  = 'F2F_1F',  'Face-to-Face 1 full day'
        F2F_1PD = 'F2F_1PD', 'Face-to-Face Paper B Preparation Day'
        F2F_2F  = 'F2F_2F',  'Face-to-Face 2 full days'
        F2F_3F  = 'F2F_3F',  'Face-to-Face 3 full days'
        F2F_4F  = 'F2F_4F',  'Face-to-Face 4 full days'
        F2F_5B  = 'F2F_5B',  'Face-to-Face 5-day bundle'
        F2F_5F  = 'F2F_5F',  'Face-to-Face 5 full days'
        F2F_6B  = 'F2F_6B',  'Face-to-Face 6-day bundle'
        F2F_6H  = 'F2F_6H',  'Face-to-Face 6 half days'

        # Live online
        LO_10H  = 'LO_10H',  'Live Online 10 half days'
        LO_1F   = 'LO_1F',   'Live Online 1 full day'
        LO_1PD  = 'LO_1PD',  'Live Online Paper B Preparation Day'
        LO_2F   = 'LO_2F',   'Live Online 2 full days'
        LO_2H   = 'LO_2H',   'Live Online 2 half days'
        LO_3F   = 'LO_3F',   'Live Online 3 full days'
        LO_4F   = 'LO_4F',   'Live Online 4 full days'
        LO_4H   = 'LO_4H',   'Live Online 4 half days'
        LO_5B   = 'LO_5B',   'Live Online 5-day bundle'
        LO_5F   = 'LO_5F',   'Live Online 5 full days'
        LO_6B   = 'LO_6B',   'Live Online 6-day bundle'
        LO_6H   = 'LO_6H',   'Live Online 6 half days'
        LO_8H   = 'LO_8H',   'Live Online 8 half days'

        # Online classroom (no physical location — see tutorial_location)
        OC      = 'OC',      'Online Classroom'
```

- [ ] **Step 1.4: Make `tutorial_location` and `tutorial_course_template` nullable**

In the same file, MODIFY both FK fields to add `null=True, blank=True` and a help_text explaining when NULL is used. The class body should now read:

```python
class TutorialProduct(Product):
    """ESS-based tutorial product. Phase 2 backfilled from existing
    Product rows whose PPV variation_type is 'Tutorial'.

    Nullability notes (Phase 2):
      - tutorial_location is NULL for OC (Online Classroom) rows —
        no physical venue.
      - tutorial_course_template is NULL for rows where
        `{subject}_{format}` doesn't match an existing
        TutorialCourseTemplate; operators can backfill later.
    """

    class Format(models.TextChoices):
        # (see Step 1.3 — 23 codes)
        ...

    tutorial_course_template = models.ForeignKey(
        'tutorials.TutorialCourseTemplate',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='store_tutorial_products',
        help_text=(
            'NULL if no matching `{subject}_{format}` template '
            'existed at Phase 2 backfill time. Operators can link '
            'a real template later.'
        ),
    )
    tutorial_location = models.ForeignKey(
        'tutorials.TutorialLocation',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='store_tutorial_products',
        help_text='NULL for OC (Online Classroom) rows — no physical venue.',
    )
    format = models.CharField(max_length=16, choices=Format.choices)

    class Meta:
        db_table = '"acted"."tutorial_products"'
        verbose_name = 'Tutorial Product'
        verbose_name_plural = 'Tutorial Products'
        # See sibling model marking_product.py and the design doc §4.5 — Django MTI
        # raises models.E016 if a child UniqueConstraint references a parent-table
        # field (exam_session_subject lives on Product). Uniqueness is enforced
        # via Purchasable.code UNIQUE (auto-generated product_code includes all
        # four dimensions: subject, location, format, session).
```

- [ ] **Step 1.5: Generate and apply the migration**

```bash
python manage.py makemigrations store --name reshape_tutorial_product
```

Expected output: `Migrations for 'store': store/migrations/0019_reshape_tutorial_product.py - Alter field format on tutorialproduct - Alter field tutorial_course_template on tutorialproduct - Alter field tutorial_location on tutorialproduct`

Open the generated migration and verify:
1. Exactly 3 `AlterField` operations on `tutorialproduct`: `format` (new choices), `tutorial_course_template` (null=True), `tutorial_location` (null=True).
2. NO other operations.

Apply:

```bash
python manage.py migrate store
```

Expected: `Applying store.0019_reshape_tutorial_product... OK`

- [ ] **Step 1.6: Run tests — all 3 should pass**

```bash
python manage.py test store.tests.test_tutorial_product_model -v 2
```

Expected: 9 of 9 tests pass (the 3 new/updated + the 6 unchanged).

Run the full store suite for regressions:

```bash
python manage.py test store -v 1
```

Expected: All pass.

- [ ] **Step 1.7: Commit**

```bash
git add backend/django_Admin3/store/models/tutorial_product.py \
       backend/django_Admin3/store/migrations/0019_reshape_tutorial_product.py \
       backend/django_Admin3/store/tests/test_tutorial_product_model.py
git commit -m "feat(store): Phase 2A — expand TutorialProduct.Format to 23 real codes; nullable FKs

Phase 1 shipped a 5-value placeholder Format enum (F2F_1F, F2F_3F,
F2F_5F, LIVE, REC). The actual catalog_product_variations table has
23 distinct codes for variation_type='Tutorial'. Drop the placeholder
LIVE/REC (no data uses them) and add the 18 missing codes.

Also make tutorial_location and tutorial_course_template nullable:
  - 98 OC (Online Classroom) products have no physical venue.
  - Some products lack a matching {subject}_{format} TutorialCourseTemplate
    row; backfill must be able to leave them NULL until operators link
    a real template.

All three field changes ship in one AlterField-only migration
(0019_reshape_tutorial_product.py)."
```

---

## Task 2: Relax `MarkingTemplate.code` uniqueness; add composite UC

**Files:**
- Modify: `backend/django_Admin3/marking/models/marking_template.py`
- Modify: `backend/django_Admin3/marking/tests/test_marking_template_model.py`
- Create: `backend/django_Admin3/marking/migrations/0018_marking_template_composite_uc.py` (generated)

The Phase 1 model had `code = CharField(unique=True)`. Real catalog data has rows like `(code='M', shortname='Mock Exam Marking')` and `(code='M', shortname='Practice Exam Marking')` — same code, distinct names. We preserve both via a composite UC over `(code, name)`.

- [ ] **Step 2.1: Update the test class**

In `backend/django_Admin3/marking/tests/test_marking_template_model.py`, REPLACE the existing `test_code_is_unique` test inside `MarkingTemplateModelTests` with these two tests:

```python
    def test_code_alone_is_not_unique(self):
        """Phase 2: catalog has duplicate codes with distinct shortnames
        (e.g., 'M' appears as both 'Mock Exam Marking' and 'Practice
        Exam Marking'). We preserve both. Uniqueness is over the
        composite (code, name).
        """
        from marking.models import MarkingTemplate
        MarkingTemplate.objects.create(code='M', name='Mock Exam Marking')
        # Same code, different name — must succeed
        t2 = MarkingTemplate.objects.create(code='M', name='Practice Exam Marking')
        self.assertEqual(t2.code, 'M')
        self.assertEqual(MarkingTemplate.objects.filter(code='M').count(), 2)

    def test_code_name_pair_is_unique(self):
        """Same code AND same name => IntegrityError via composite UC."""
        from marking.models import MarkingTemplate
        MarkingTemplate.objects.create(code='X', name='X Marking')
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                MarkingTemplate.objects.create(code='X', name='X Marking')

    def test_has_composite_unique_constraint(self):
        from marking.models import MarkingTemplate
        constraint_names = {c.name for c in MarkingTemplate._meta.constraints}
        self.assertIn('uq_marking_template_code_name', constraint_names)
```

- [ ] **Step 2.2: Run tests to verify RED**

```bash
cd backend/django_Admin3
python manage.py test marking.tests.test_marking_template_model -v 2
```

Expected: The new tests fail. `test_code_alone_is_not_unique` fails with IntegrityError on the second insert (still unique). `test_code_name_pair_is_unique` may pass (since code-alone constraint is stricter). `test_has_composite_unique_constraint` fails (constraint doesn't exist yet).

- [ ] **Step 2.3: Update the model**

In `backend/django_Admin3/marking/models/marking_template.py`, MODIFY the `code` field declaration and the `Meta` class:

```python
    code = models.CharField(
        max_length=10,
        help_text=(
            "Series code (e.g., 'X', 'MM1', 'Y'). NOT unique by itself — "
            "catalog has duplicates with distinct names. Uniqueness "
            "enforced over composite (code, name)."
        ),
    )
    name = models.CharField(
        max_length=255,
        help_text="Display name (e.g., 'Series X Marking', 'Practice Exam Marking').",
    )
    # ... description / is_active / created_at / updated_at unchanged ...

    class Meta:
        app_label = 'marking'
        db_table = '"acted"."marking_templates"'
        ordering = ['code', 'name']
        verbose_name = 'Marking Template'
        verbose_name_plural = 'Marking Templates'
        constraints = [
            models.UniqueConstraint(
                fields=['code', 'name'],
                name='uq_marking_template_code_name',
            ),
        ]
```

- [ ] **Step 2.4: Generate and apply the migration**

```bash
python manage.py makemigrations marking --name marking_template_composite_uc
```

Expected output:

```
Migrations for 'marking':
  marking/migrations/0018_marking_template_composite_uc.py
    - Alter field code on markingtemplate
    - Alter Meta options on markingtemplate
    - Create constraint uq_marking_template_code_name on model markingtemplate
```

Open the migration and verify:
1. `AlterField` on `markingtemplate.code` removes `unique=True`.
2. `AddConstraint` for `UniqueConstraint(fields=['code', 'name'], name='uq_marking_template_code_name')`.
3. `AlterModelOptions` updating `ordering` to `['code', 'name']`.
4. NO other operations.

Apply:

```bash
python manage.py migrate marking
```

Expected: `Applying marking.0018_marking_template_composite_uc... OK`

- [ ] **Step 2.5: Run tests — all should pass**

```bash
python manage.py test marking.tests.test_marking_template_model -v 2
```

Expected: All tests (the 2 retained from Task 2 + the 3 updated/new) pass.

Run the marking suite for regressions:

```bash
python manage.py test marking -v 1
```

Expected: All pass.

- [ ] **Step 2.6: Commit**

```bash
git add backend/django_Admin3/marking/models/marking_template.py \
       backend/django_Admin3/marking/migrations/0018_marking_template_composite_uc.py \
       backend/django_Admin3/marking/tests/test_marking_template_model.py
git commit -m "feat(marking): Phase 2A — composite (code, name) uniqueness on MarkingTemplate

Phase 1 shipped MarkingTemplate.code as a UNIQUE CharField. The
catalog_products table has rows sharing 'M' as a code with distinct
shortnames ('Mock Exam Marking', 'Practice Exam Marking'); collapsing
them would lose real business distinction.

Drop unique=True on code; add UniqueConstraint(code, name) to allow
duplicates of one dimension but reject exact-row duplicates. Phase 2
backfill (Task 4) creates one MarkingTemplate per catalog Product row
referenced by a Marking PPV, preserving the (code, name) distinctions."
```

---

## Task 3: Backfill `MarkingTemplate` from catalog (data migration)

**Files:**
- Create: `backend/django_Admin3/marking/migrations/0019_backfill_marking_templates.py`
- Create: `backend/django_Admin3/marking/tests/test_backfill_marking_templates.py`

This is a `RunPython` data migration. For every distinct `catalog_products.Product` row referenced by any `ProductProductVariation` with `variation_type='Marking'`, create a `MarkingTemplate` with `id = catalog_product.id` (1:1 PK mapping). Idempotent: re-runs are no-ops because the composite UC rejects duplicates.

- [ ] **Step 3.1: Write the failing test**

Create `backend/django_Admin3/marking/tests/test_backfill_marking_templates.py`:

```python
"""Tests for the Phase 2 marking-template backfill data migration.

Verifies the migration creates one MarkingTemplate per distinct
catalog.Product referenced by a Marking PPV, preserving (code, name)
distinctions and using catalog_product.id as the MarkingTemplate PK.

Strategy: we call the migration's forward function directly against
the live DB rather than reversing/reapplying the migration. This
means the test DB already has MarkingTemplate rows from the real
migration run during test-DB setup. The tests are written to be
robust against that: they check DELTAS, not absolute counts.
"""
import importlib

from django.apps import apps as django_apps
from django.test import TransactionTestCase


def _load_backfill_module():
    """Migration modules start with a digit, so plain `from ... import`
    doesn't work — use importlib."""
    return importlib.import_module(
        'marking.migrations.0019_backfill_marking_templates'
    )


class BackfillMarkingTemplatesTests(TransactionTestCase):
    # TransactionTestCase because we manipulate real-DB rows; the
    # default TestCase's outer transaction would conflict with the
    # migration helper's own create() calls.

    def _fixture_catalog_marking_rows(self):
        """Create three distinct catalog rows + PPVs referencing them.

        Returns the three catalog Product instances. Two share
        code='M' with distinct shortnames — the case that motivates
        the composite (code, name) UC.
        """
        from catalog.products.models import (
            Product as CatalogProduct,
            ProductVariation,
            ProductProductVariation,
        )
        # Use sentinel codes that won't collide with the dev DB's
        # real marking templates (M, M1, M2, M3, X, Y).
        cp_mock = CatalogProduct.objects.create(
            code='ZTEST_M', shortname='Mock Exam Marking',
            fullname='Mock Exam Marking',
        )
        cp_practice = CatalogProduct.objects.create(
            code='ZTEST_M', shortname='Practice Exam Marking',
            fullname='Practice Exam Marking',
        )
        cp_x = CatalogProduct.objects.create(
            code='ZTEST_X', shortname='X Marking', fullname='X Marking',
        )
        # Find or create a Marking-type variation so the PPVs are
        # discoverable by the migration's filter.
        pv, _ = ProductVariation.objects.get_or_create(
            variation_type='Marking',
            name='Marking',
            defaults={'code': 'M', 'is_active': True},
        )
        for cp in (cp_mock, cp_practice, cp_x):
            ProductProductVariation.objects.create(
                product=cp, product_variation=pv, is_active=True,
            )
        return cp_mock, cp_practice, cp_x

    def test_backfill_creates_one_template_per_new_catalog_row(self):
        """Adding 3 distinct catalog rows produces 3 new MarkingTemplate
        rows (delta, not absolute count — the DB already has rows
        from the migration run at test-DB setup time)."""
        from marking.models import MarkingTemplate

        before = MarkingTemplate.objects.count()
        cp_mock, cp_practice, cp_x = self._fixture_catalog_marking_rows()

        backfill = _load_backfill_module()
        backfill.create_marking_templates(apps=django_apps, schema_editor=None)

        after = MarkingTemplate.objects.count()
        self.assertEqual(after - before, 3,
                         f'Expected 3 new rows, got {after - before}')

        # PK mapping is 1:1 with catalog.Product.id
        mt_mock = MarkingTemplate.objects.get(pk=cp_mock.pk)
        self.assertEqual(mt_mock.code, 'ZTEST_M')
        self.assertEqual(mt_mock.name, 'Mock Exam Marking')

        mt_practice = MarkingTemplate.objects.get(pk=cp_practice.pk)
        self.assertEqual(mt_practice.code, 'ZTEST_M')
        self.assertEqual(mt_practice.name, 'Practice Exam Marking')

        # Both rows preserved despite same code (composite UC)
        self.assertEqual(
            MarkingTemplate.objects.filter(code='ZTEST_M').count(), 2
        )

    def test_backfill_is_idempotent(self):
        """Re-running the migration produces no additional rows."""
        from marking.models import MarkingTemplate

        self._fixture_catalog_marking_rows()
        backfill = _load_backfill_module()

        backfill.create_marking_templates(apps=django_apps, schema_editor=None)
        count_after_first = MarkingTemplate.objects.count()

        backfill.create_marking_templates(apps=django_apps, schema_editor=None)
        count_after_second = MarkingTemplate.objects.count()

        self.assertEqual(count_after_first, count_after_second,
                         'Backfill must be idempotent')
```

Note: `_load_backfill_module()` uses `importlib.import_module` because Python doesn't allow `from marking.migrations import 0019_...` (module names can't start with a digit). The test correctly RED-fails before Step 3.3 creates the migration file (ModuleNotFoundError).

- [ ] **Step 3.2: Run test to verify RED**

```bash
cd backend/django_Admin3
python manage.py test marking.tests.test_backfill_marking_templates -v 2
```

Expected: ModuleNotFoundError or ImportError — the migration module doesn't exist yet.

- [ ] **Step 3.3: Create the data migration**

Create `backend/django_Admin3/marking/migrations/0019_backfill_marking_templates.py`:

```python
"""Backfill MarkingTemplate rows from catalog_products.

For every distinct catalog.Product row referenced by any
ProductProductVariation with variation_type='Marking', create a
MarkingTemplate with id = catalog.Product.id (1:1 PK mapping). This
makes the Phase 2 split command's MarkingTemplate lookup a simple
`MarkingTemplate.objects.get(pk=ppv.product_id)`.

Idempotent — re-running this migration produces no new rows because
the composite (code, name) UC rejects duplicate inserts.
"""
from django.db import migrations


def create_marking_templates(apps, schema_editor):
    """Forward: scan catalog Marking PPVs and create one
    MarkingTemplate per distinct catalog.Product row.
    """
    ProductProductVariation = apps.get_model(
        'catalog_products', 'ProductProductVariation'
    )
    MarkingTemplate = apps.get_model('marking', 'MarkingTemplate')

    # Walk distinct catalog.Product rows referenced by Marking PPVs.
    catalog_product_ids = (
        ProductProductVariation.objects
        .filter(product_variation__variation_type='Marking')
        .values_list('product_id', flat=True)
        .distinct()
    )

    created = 0
    skipped = 0
    for cp_id in catalog_product_ids:
        # Look up the catalog row via apps.get_model to stay in the
        # migration's frozen model graph.
        CatalogProduct = apps.get_model('catalog_products', 'Product')
        cp = CatalogProduct.objects.get(pk=cp_id)

        # Skip if a MarkingTemplate with this PK already exists
        # (idempotency).
        if MarkingTemplate.objects.filter(pk=cp.pk).exists():
            skipped += 1
            continue

        # The composite UC enforces (code, name) uniqueness — if the
        # catalog itself has two rows with identical (code, name)
        # somehow, the second create would IntegrityError. That
        # shouldn't happen but is the right safety net.
        MarkingTemplate.objects.create(
            pk=cp.pk,
            code=cp.code,
            name=cp.shortname or cp.fullname or cp.code,
            description=cp.description or '',
            is_active=cp.is_active,
        )
        created += 1

    print(f'  backfill_marking_templates: created={created} skipped={skipped}')


def reverse_marking_templates(apps, schema_editor):
    """Reverse: delete only the MarkingTemplate rows we created in
    forward (those whose PK matches a catalog.Product referenced by a
    Marking PPV).

    This is conservative: it does NOT delete MarkingTemplate rows that
    might have been created manually post-migration with the same PK.
    Verifying that the catalog row still exists is the strongest
    signal we can use.
    """
    ProductProductVariation = apps.get_model(
        'catalog_products', 'ProductProductVariation'
    )
    MarkingTemplate = apps.get_model('marking', 'MarkingTemplate')

    catalog_product_ids = list(
        ProductProductVariation.objects
        .filter(product_variation__variation_type='Marking')
        .values_list('product_id', flat=True)
        .distinct()
    )
    MarkingTemplate.objects.filter(pk__in=catalog_product_ids).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('marking', '0018_marking_template_composite_uc'),
        ('catalog_products', '0001_initial'),  # adjust if first
                                                # catalog_products
                                                # migration has a
                                                # different name
    ]

    operations = [
        migrations.RunPython(
            create_marking_templates,
            reverse_code=reverse_marking_templates,
        ),
    ]
```

**Important — verify the `catalog_products` dependency name.** Run:

```bash
ls backend/django_Admin3/catalog/products/migrations/ | head -5
```

The earliest migration file there is the dependency. If it's `0001_initial.py`, the line above is correct. If a different name appears first, update the `dependencies` list to use the latest applied catalog_products migration (the safe bet is whatever shows as applied via `python manage.py showmigrations catalog_products | tail -3`).

- [ ] **Step 3.4: Apply the migration**

```bash
python manage.py migrate marking
```

Expected: `Applying marking.0019_backfill_marking_templates... OK`. The stdout includes `backfill_marking_templates: created=N skipped=0` where N is the distinct count from the catalog (expected to be 6 in the current dev DB: M ×2 with different names, M1, M2, M3, X, Y — but check the actual count printed).

- [ ] **Step 3.5: Run tests — all should pass**

```bash
python manage.py test marking.tests.test_backfill_marking_templates -v 2
```

Expected: 2 of 2 pass.

- [ ] **Step 3.6: Spot-check the result**

```bash
python manage.py shell -c "
from marking.models import MarkingTemplate
from catalog.products.models import Product as CatalogProduct, ProductProductVariation
# Verify count
print(f'MarkingTemplate count: {MarkingTemplate.objects.count()}')
# Verify (code, name) preservation
for t in MarkingTemplate.objects.order_by('code', 'name'):
    print(f'  pk={t.pk}, code={t.code!r}, name={t.name!r}')
# Verify PK matches catalog
sample = MarkingTemplate.objects.first()
print(f'Sample PK match: MarkingTemplate.{sample.pk} ⟷ catalog.Product.{CatalogProduct.objects.get(pk=sample.pk).code}')
"
```

Expected: Counts match what the migration printed; (code, name) pairs all show distinct values; PK match prints the same catalog product code.

- [ ] **Step 3.7: Commit**

```bash
git add backend/django_Admin3/marking/migrations/0019_backfill_marking_templates.py \
       backend/django_Admin3/marking/tests/test_backfill_marking_templates.py
git commit -m "feat(marking): Phase 2B — backfill MarkingTemplate from catalog

Creates one MarkingTemplate row per distinct catalog.Product
referenced by a Marking PPV. PK preserved (MarkingTemplate.id =
catalog.Product.id) so the split command can lookup the template
via a simple by-id query instead of by-code (avoiding the duplicate
code ambiguity).

Idempotent — re-running produces no new rows (the composite (code,
name) UC rejects duplicates and the explicit pk check skips already-
backfilled rows). Reverse function deletes only what forward created."
```

---

## Task 4: `split_products_by_kind` command — skeleton + `--dry-run` mode

**Files:**
- Create: `backend/django_Admin3/store/management/commands/split_products_by_kind.py`
- Create: `backend/django_Admin3/store/tests/test_split_products_by_kind.py`

A Django management command. `--dry-run` (default) walks every `store.Product`, classifies by `variation_type`, and prints a per-kind tally without writing anything.

- [ ] **Step 4.1: Write the failing test**

Create `backend/django_Admin3/store/tests/test_split_products_by_kind.py`:

```python
"""Tests for the split_products_by_kind management command.

Phase 2 of the Product MTI specialization. The command walks every
store.Product and creates one MaterialProduct / TutorialProduct /
MarkingProduct row per existing Product, reassigning Purchasable.kind
away from 'product'.
"""
from io import StringIO
from django.core.management import call_command
from django.test import TestCase


class SplitProductsDryRunTests(TestCase):
    """--dry-run mode walks the data but writes nothing."""

    def test_command_is_registered(self):
        from django.core.management import get_commands
        self.assertIn('split_products_by_kind', get_commands())

    def test_dry_run_writes_nothing(self):
        """No new MaterialProduct/TutorialProduct/MarkingProduct rows
        are created; no Purchasable.kind is changed."""
        from store.models import (
            Product, MaterialProduct, TutorialProduct, MarkingProduct, Purchasable,
        )

        material_before = MaterialProduct.objects.count()
        tutorial_before = TutorialProduct.objects.count()
        marking_before = MarkingProduct.objects.count()
        legacy_before = Purchasable.objects.filter(kind='product').count()

        out = StringIO()
        call_command('split_products_by_kind', '--dry-run', stdout=out)

        self.assertEqual(MaterialProduct.objects.count(), material_before)
        self.assertEqual(TutorialProduct.objects.count(), tutorial_before)
        self.assertEqual(MarkingProduct.objects.count(), marking_before)
        self.assertEqual(
            Purchasable.objects.filter(kind='product').count(),
            legacy_before,
        )

    def test_dry_run_prints_per_kind_tally(self):
        """The stdout includes a count per resolved kind."""
        out = StringIO()
        call_command('split_products_by_kind', '--dry-run', stdout=out)
        output = out.getvalue()
        # The tally lines use the kind names directly
        for kind in ('material', 'tutorial', 'marking'):
            self.assertIn(kind, output.lower())
        # The summary includes a total
        self.assertIn('total', output.lower())
```

- [ ] **Step 4.2: Run tests to verify RED**

```bash
cd backend/django_Admin3
python manage.py test store.tests.test_split_products_by_kind -v 2
```

Expected: All 3 tests fail with `CommandError: Unknown command: 'split_products_by_kind'`.

- [ ] **Step 4.3: Create the command skeleton**

Create `backend/django_Admin3/store/management/commands/split_products_by_kind.py`:

```python
"""Split existing store.Product rows into MTI subclasses.

For every store.Product row whose Purchasable.kind == 'product',
classify by `product_product_variation.product_variation.variation_type`
and create the matching subclass row (MaterialProduct / TutorialProduct
/ MarkingProduct) sharing the parent PK (MTI shared PK), then update
Purchasable.kind to the specialized value.

Modes:
  --dry-run (default): walk and report. Write nothing.
  --check: walk and report unmappable rows (unknown formats, missing
           tutorial templates, missing TutorialEvent). Write nothing.
  --commit: walk and split. Idempotent — re-runs skip already-split
            rows.

Usage:
  python manage.py split_products_by_kind --dry-run
  python manage.py split_products_by_kind --check
  python manage.py split_products_by_kind --commit
"""
from collections import Counter
from django.core.management.base import BaseCommand


# Mapping from catalog ProductVariation.variation_type to the
# specialized Purchasable.kind value and the MTI subclass model.
KIND_BY_VARIATION_TYPE = {
    'eBook':    'material',
    'Printed':  'material',
    'Hub':      'material',
    'Tutorial': 'tutorial',
    'Marking':  'marking',
}


class Command(BaseCommand):
    help = 'Split existing store.Product rows into MTI subclasses.'

    def add_arguments(self, parser):
        mode = parser.add_mutually_exclusive_group()
        mode.add_argument(
            '--dry-run',
            action='store_true',
            default=True,
            help='Walk and report; write nothing. Default.',
        )
        mode.add_argument(
            '--check',
            action='store_true',
            help='Walk and report unmappable rows. Write nothing.',
        )
        mode.add_argument(
            '--commit',
            action='store_true',
            help='Walk and split. Idempotent.',
        )

    def handle(self, *args, **options):
        if options['commit']:
            # Will be implemented in Task 6
            raise NotImplementedError(
                '--commit mode is implemented in Phase 2 Task 6'
            )
        if options['check']:
            # Will be implemented in Task 5
            raise NotImplementedError(
                '--check mode is implemented in Phase 2 Task 5'
            )

        # --dry-run (default)
        self._walk_and_report()

    def _walk_and_report(self):
        from store.models import Product, Purchasable

        tally = Counter()
        unresolved = 0
        # Walk Purchasable.kind='product' rows that still have a Product
        # child (i.e., not orphans — see pre-flight in plan).
        legacy = Purchasable.objects.filter(
            kind='product',
            pk__in=Product.objects.values('pk'),
        )

        for purchasable in legacy.iterator():
            product = Product.objects.select_related(
                'product_product_variation__product_variation'
            ).get(pk=purchasable.pk)
            vt = product.product_product_variation.product_variation.variation_type
            kind = KIND_BY_VARIATION_TYPE.get(vt)
            if kind is None:
                unresolved += 1
                continue
            tally[kind] += 1

        self.stdout.write(self.style.NOTICE(
            f'split_products_by_kind --dry-run summary:'
        ))
        for kind in ('material', 'tutorial', 'marking'):
            self.stdout.write(f'  {kind:10s} {tally[kind]:6d}')
        self.stdout.write(f'  {"unresolved":10s} {unresolved:6d}')
        self.stdout.write(
            f'  {"total":10s} {sum(tally.values()) + unresolved:6d}'
        )
```

- [ ] **Step 4.4: Run tests — all 3 should pass**

```bash
python manage.py test store.tests.test_split_products_by_kind -v 2
```

Expected: 3 of 3 pass.

- [ ] **Step 4.5: Run the dry-run on dev DB and capture the tally**

```bash
python manage.py split_products_by_kind --dry-run
```

Expected output (numbers from real dev data per earlier inspection):

```
split_products_by_kind --dry-run summary:
  material      6847
  tutorial       649
  marking        677
  unresolved       0
  total         8173
```

If `unresolved` is non-zero, that means new catalog data has variation types we haven't handled. Stop and update `KIND_BY_VARIATION_TYPE` plus add a test before proceeding.

- [ ] **Step 4.6: Commit**

```bash
git add backend/django_Admin3/store/management/commands/split_products_by_kind.py \
       backend/django_Admin3/store/tests/test_split_products_by_kind.py
git commit -m "feat(store): Phase 2B — split_products_by_kind --dry-run

Skeleton of the management command. --dry-run walks every
store.Product whose Purchasable.kind='product' and reports a tally
grouped by resolved kind (material/tutorial/marking/unresolved).

Writes nothing. --check and --commit modes will be added in Tasks
5 and 6 respectively (currently raise NotImplementedError).

Idempotency, invariant preservation, and the actual subclass-row
creation logic land with --commit."
```

---

## Task 5: `split_products_by_kind` — `--check` mode

**Files:**
- Modify: `backend/django_Admin3/store/management/commands/split_products_by_kind.py`
- Modify: `backend/django_Admin3/store/tests/test_split_products_by_kind.py`

`--check` walks the same rows as `--dry-run` but also runs the dimension resolvers (format mapping, tutorial template lookup, tutorial location resolution, marking template lookup) and reports rows where any dimension can't be resolved.

- [ ] **Step 5.1: Write the failing tests**

Append to `backend/django_Admin3/store/tests/test_split_products_by_kind.py`:

```python
class SplitProductsCheckModeTests(TestCase):
    """--check mode reports unmappable rows. Writes nothing."""

    def test_check_writes_nothing(self):
        from store.models import (
            MaterialProduct, TutorialProduct, MarkingProduct, Purchasable,
        )
        material_before = MaterialProduct.objects.count()
        tutorial_before = TutorialProduct.objects.count()
        marking_before = MarkingProduct.objects.count()
        legacy_before = Purchasable.objects.filter(kind='product').count()

        out = StringIO()
        call_command('split_products_by_kind', '--check', stdout=out)

        self.assertEqual(MaterialProduct.objects.count(), material_before)
        self.assertEqual(TutorialProduct.objects.count(), tutorial_before)
        self.assertEqual(MarkingProduct.objects.count(), marking_before)
        self.assertEqual(
            Purchasable.objects.filter(kind='product').count(),
            legacy_before,
        )

    def test_check_reports_tutorial_format_mapping_status(self):
        """Output names tutorial-format coverage and any unmapped codes."""
        out = StringIO()
        call_command('split_products_by_kind', '--check', stdout=out)
        output = out.getvalue()
        # The check report mentions tutorial format mapping
        self.assertIn('format', output.lower())

    def test_check_reports_marking_template_coverage(self):
        """Output reports whether every Marking PPV product_id has a
        matching MarkingTemplate row."""
        out = StringIO()
        call_command('split_products_by_kind', '--check', stdout=out)
        output = out.getvalue()
        self.assertIn('marking_template', output.lower())
```

- [ ] **Step 5.2: Run tests to verify RED**

```bash
python manage.py test store.tests.test_split_products_by_kind.SplitProductsCheckModeTests -v 2
```

Expected: All 3 fail. The first 2 hit `NotImplementedError` for `--check`. The third also fails because the report doesn't mention `marking_template`.

- [ ] **Step 5.3: Implement `--check`**

In `backend/django_Admin3/store/management/commands/split_products_by_kind.py`, REPLACE the `handle()` method and ADD a `_walk_and_check()` method:

```python
    def handle(self, *args, **options):
        if options['commit']:
            raise NotImplementedError(
                '--commit mode is implemented in Phase 2 Task 6'
            )
        if options['check']:
            self._walk_and_check()
            return

        self._walk_and_report()

    def _walk_and_check(self):
        """Audit every legacy Product row for resolvable dimensions.

        Reports:
          - Tutorial format codes seen in the data that aren't in
            TutorialProduct.Format.values.
          - Tutorial products that lack a (subject, format) ->
            TutorialCourseTemplate match.
          - Tutorial products with no linked TutorialEvent AND format
            != 'OC' (these would have NULL location which is only
            semantically correct for OC).
          - Marking products whose ppv.product_id is missing from
            MarkingTemplate (would mean the Task 3 backfill missed
            something).
        """
        from store.models import Product, Purchasable, TutorialProduct
        from tutorials.models import TutorialCourseTemplate, TutorialEvents
        from marking.models import MarkingTemplate

        valid_formats = set(TutorialProduct.Format.values)
        existing_template_codes = set(
            TutorialCourseTemplate.objects.values_list('code', flat=True)
        )
        marking_template_pks = set(
            MarkingTemplate.objects.values_list('pk', flat=True)
        )

        unmapped_formats = Counter()
        missing_templates = []  # list of (subject_code, format_code)
        non_oc_no_location = []  # list of product pks
        missing_marking_templates = []  # list of (product pk, catalog product id)

        legacy = Purchasable.objects.filter(
            kind='product',
            pk__in=Product.objects.values('pk'),
        )
        for purchasable in legacy.iterator():
            product = Product.objects.select_related(
                'exam_session_subject__subject',
                'product_product_variation__product_variation',
                'product_product_variation__product',
            ).get(pk=purchasable.pk)
            ppv = product.product_product_variation
            vt = ppv.product_variation.variation_type
            kind = KIND_BY_VARIATION_TYPE.get(vt)

            if kind == 'tutorial':
                fmt_code = ppv.product_variation.code
                if fmt_code not in valid_formats:
                    unmapped_formats[fmt_code] += 1
                    continue

                subject_code = product.exam_session_subject.subject.code
                # Expected template code: '{subject}_{format}'. The
                # catalog uses lowercase prefix (f2f / lo) and the
                # enum uses uppercase (F2F_ / LO_); normalize.
                template_code = self._build_template_code(
                    subject_code, fmt_code,
                )
                if template_code and template_code not in existing_template_codes:
                    missing_templates.append((subject_code, fmt_code))

                # OC has no location by design; everything else needs
                # a linked TutorialEvent.
                if fmt_code != 'OC':
                    has_event = TutorialEvents.objects.filter(
                        store_product=product
                    ).exists()
                    if not has_event:
                        non_oc_no_location.append(product.pk)

            elif kind == 'marking':
                if ppv.product_id not in marking_template_pks:
                    missing_marking_templates.append((product.pk, ppv.product_id))

        self.stdout.write(self.style.NOTICE(
            'split_products_by_kind --check report:'
        ))
        self.stdout.write(f'  unmapped tutorial formats: {sum(unmapped_formats.values())}')
        for fmt, count in unmapped_formats.most_common():
            self.stdout.write(f'    {fmt}: {count}')
        self.stdout.write(f'  missing tutorial templates: {len(missing_templates)}')
        for subj, fmt in missing_templates[:20]:
            self.stdout.write(f'    {subj}_{fmt}')
        if len(missing_templates) > 20:
            self.stdout.write(f'    ... +{len(missing_templates) - 20} more')
        self.stdout.write(f'  non-OC tutorials with no TutorialEvent: {len(non_oc_no_location)}')
        self.stdout.write(f'  missing marking_template rows: {len(missing_marking_templates)}')
        for pk, cp_id in missing_marking_templates[:10]:
            self.stdout.write(f'    Product.pk={pk}, catalog_product.id={cp_id}')

    @staticmethod
    def _build_template_code(subject_code, fmt_code):
        """Map (subject, format) to expected TutorialCourseTemplate.code.

        Catalog conventions:
          - subject prefix: 'CB1', 'CM2', 'SP6' (uppercase)
          - format suffix: 'f2f_3' (lowercase prefix + duration code)

        Existing template codes look like:
          - 'CB1_f2f_3'      (subject + f2f + numdays)
          - 'CB1_LO_3'       (subject + LO + numdays, uppercase LO)
          - no OC variants exist in pre-Phase-2 data — return None
        """
        if fmt_code == 'OC':
            return None
        if fmt_code.startswith('F2F_'):
            return f'{subject_code}_f2f_{fmt_code[4:]}'
        if fmt_code.startswith('LO_'):
            return f'{subject_code}_LO_{fmt_code[3:]}'
        return None
```

- [ ] **Step 5.4: Run tests — all 3 should pass**

```bash
python manage.py test store.tests.test_split_products_by_kind -v 2
```

Expected: 6 of 6 pass (3 from Task 4 + 3 new).

- [ ] **Step 5.5: Run `--check` on dev DB**

```bash
python manage.py split_products_by_kind --check
```

Expected output (numbers will vary; absolute zeros where we expect them):

```
split_products_by_kind --check report:
  unmapped tutorial formats: 0
  missing tutorial templates: N        # likely > 0 for OC and edge cases
  non-OC tutorials with no TutorialEvent: M  # likely 0 in healthy data
  missing marking_template rows: 0
```

Note any non-zero counts in the next step. `missing tutorial templates` may be non-zero — those rows will end up with `tutorial_course_template = NULL` after the split, which is the intended behavior (operators backfill later).

- [ ] **Step 5.6: Commit**

```bash
git add backend/django_Admin3/store/management/commands/split_products_by_kind.py \
       backend/django_Admin3/store/tests/test_split_products_by_kind.py
git commit -m "feat(store): Phase 2B — split_products_by_kind --check

Audit mode: walks every legacy Product row and reports unmappable
dimensions before any writes happen.

Checks:
  - tutorial format codes outside the enum
  - missing TutorialCourseTemplate rows for (subject, format) combos
  - non-OC tutorials with no linked TutorialEvent
  - missing MarkingTemplate rows (catches Task 3 backfill misses)

Output is informational only; --commit handles each case gracefully
(NULL FKs for missing templates/locations, blocking error for unmapped
formats since those literally can't be inserted)."
```

---

## Task 6: `split_products_by_kind` — `--commit` mode

**Files:**
- Modify: `backend/django_Admin3/store/management/commands/split_products_by_kind.py`
- Modify: `backend/django_Admin3/store/tests/test_split_products_by_kind.py`

The actual split. Creates one subclass row per `Product`, sharing the parent PK; updates `Purchasable.kind`. Idempotent — already-split rows are skipped. Transactional — the whole walk runs in one `atomic()` block.

- [ ] **Step 6.1: Write the failing tests**

Append to `backend/django_Admin3/store/tests/test_split_products_by_kind.py`:

```python
class SplitProductsCommitTests(TransactionTestCase):
    """--commit mode actually creates subclass rows.

    Uses TransactionTestCase so the command's outer transaction
    interacts realistically with test setup/teardown.
    """

    def _make_minimal_legacy_product(self, code, variation_type='eBook'):
        """Create one legacy-shape Product (kind='product')."""
        from store.models import Product, Purchasable
        from catalog.products.models import (
            Product as CatalogProduct, ProductVariation, ProductProductVariation,
        )
        from catalog.models import Subject, ExamSession, ExamSessionSubject
        subj, _ = Subject.objects.get_or_create(
            code='TST', defaults={'description': 'Test subject', 'active': True}
        )
        sess, _ = ExamSession.objects.get_or_create(
            session_code='TST25', defaults={'start_date': '2025-01-01', 'end_date': '2025-12-31'}
        )
        ess, _ = ExamSessionSubject.objects.get_or_create(
            exam_session=sess, subject=subj
        )
        cp, _ = CatalogProduct.objects.get_or_create(
            code='TST1', defaults={'fullname': 'Test', 'shortname': 'Test'}
        )
        pv, _ = ProductVariation.objects.get_or_create(
            variation_type=variation_type,
            name=variation_type,
            code='X',
            defaults={'is_active': True},
        )
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cp, product_variation=pv, defaults={'is_active': True}
        )
        product = Product.objects.create(
            code=code,
            name=code,
            exam_session_subject=ess,
            product_product_variation=ppv,
        )
        # Reset to legacy kind for the test
        Purchasable.objects.filter(pk=product.pk).update(kind='product')
        return product

    def test_commit_creates_material_subclass(self):
        from store.models import MaterialProduct, Purchasable
        p = self._make_minimal_legacy_product(code='MAT/X/25', variation_type='eBook')

        call_command('split_products_by_kind', '--commit')

        self.assertTrue(
            MaterialProduct.objects.filter(pk=p.pk).exists(),
            'MaterialProduct row should be created with shared PK'
        )
        self.assertEqual(
            Purchasable.objects.get(pk=p.pk).kind, 'material'
        )

    def test_commit_is_idempotent(self):
        from store.models import MaterialProduct, Purchasable
        p = self._make_minimal_legacy_product(code='MAT/Y/25', variation_type='eBook')

        call_command('split_products_by_kind', '--commit')
        first_count = MaterialProduct.objects.count()
        # Reset kind to 'product' so the second run sees an already-
        # subclassed row with mismatched kind — should still be idempotent.
        Purchasable.objects.filter(pk=p.pk).update(kind='product')
        call_command('split_products_by_kind', '--commit')
        second_count = MaterialProduct.objects.count()

        self.assertEqual(
            first_count, second_count,
            'Second --commit must not create a duplicate subclass row'
        )
        # And it should correct the kind back to 'material'
        self.assertEqual(
            Purchasable.objects.get(pk=p.pk).kind, 'material'
        )

    def test_commit_preserves_product_code(self):
        from store.models import Product
        p = self._make_minimal_legacy_product(code='MAT/Z/25')

        original_code = Product.objects.get(pk=p.pk).code
        call_command('split_products_by_kind', '--commit')
        after_code = Product.objects.get(pk=p.pk).code

        self.assertEqual(original_code, after_code,
                         'Product.code is identity; never mutated by the split')

    def test_commit_invariant_after_run(self):
        """After --commit, no Purchasable.kind='product' rows remain
        (assuming all variation_types are mapped and the test DB is
        clean of orphans).
        """
        from store.models import Purchasable
        self._make_minimal_legacy_product(code='MAT/A/25', variation_type='eBook')
        self._make_minimal_legacy_product(code='MARK/A/25', variation_type='Marking')
        # Tutorial requires a MarkingTemplate but we're creating material/marking
        # only; should still leave 0 'product' rows.

        call_command('split_products_by_kind', '--commit')

        self.assertEqual(
            Purchasable.objects.filter(kind='product').count(),
            0,
            'All legacy rows must be reclassified',
        )
```

- [ ] **Step 6.2: Run tests to verify RED**

```bash
python manage.py test store.tests.test_split_products_by_kind.SplitProductsCommitTests -v 2
```

Expected: All 4 tests fail with `NotImplementedError` for `--commit`.

- [ ] **Step 6.3: Implement `--commit`**

In `backend/django_Admin3/store/management/commands/split_products_by_kind.py`, REPLACE the `handle()` body and ADD the commit helpers:

```python
    def handle(self, *args, **options):
        if options['commit']:
            self._walk_and_commit()
            return
        if options['check']:
            self._walk_and_check()
            return
        self._walk_and_report()

    def _walk_and_commit(self):
        """Create subclass rows + reassign Purchasable.kind.

        Idempotent: rows with an existing subclass child are skipped
        for the subclass-create step but still have their
        Purchasable.kind corrected if it's stale.

        Transactional: one outer atomic() block.
        """
        from django.db import transaction
        from store.models import (
            Product, Purchasable,
            MaterialProduct, TutorialProduct, MarkingProduct,
        )
        from marking.models import MarkingTemplate
        from tutorials.models import (
            TutorialCourseTemplate, TutorialEvents, TutorialLocation,
        )

        valid_formats = set(TutorialProduct.Format.values)
        template_by_code = {
            t.code: t for t in TutorialCourseTemplate.objects.all()
        }

        tally = Counter()
        with transaction.atomic():
            legacy = Purchasable.objects.filter(
                kind='product',
                pk__in=Product.objects.values('pk'),
            )
            for purchasable in legacy.iterator():
                product = Product.objects.select_related(
                    'exam_session_subject__subject',
                    'product_product_variation__product_variation',
                    'product_product_variation__product',
                ).get(pk=purchasable.pk)
                ppv = product.product_product_variation
                vt = ppv.product_variation.variation_type
                kind = KIND_BY_VARIATION_TYPE.get(vt)
                if kind is None:
                    # Unmapped variation type — surface as error
                    raise ValueError(
                        f'Cannot map variation_type={vt!r} '
                        f'(Product.pk={product.pk}). '
                        f'Update KIND_BY_VARIATION_TYPE in '
                        f'split_products_by_kind.py.'
                    )

                if kind == 'material':
                    if not MaterialProduct.objects.filter(pk=product.pk).exists():
                        MaterialProduct.objects.create(product_ptr_id=product.pk)
                        tally['material_created'] += 1
                    else:
                        tally['material_already_split'] += 1

                elif kind == 'tutorial':
                    fmt_code = ppv.product_variation.code
                    if fmt_code not in valid_formats:
                        raise ValueError(
                            f'Tutorial format {fmt_code!r} not in '
                            f'TutorialProduct.Format. Update the enum '
                            f'before re-running.'
                        )
                    subject_code = product.exam_session_subject.subject.code
                    template_code = self._build_template_code(subject_code, fmt_code)
                    template = template_by_code.get(template_code) if template_code else None
                    # Location: from first linked TutorialEvent; NULL for OC
                    location = None
                    if fmt_code != 'OC':
                        evt = TutorialEvents.objects.filter(
                            store_product=product
                        ).select_related('location').first()
                        if evt is not None:
                            location = evt.location

                    if not TutorialProduct.objects.filter(pk=product.pk).exists():
                        TutorialProduct.objects.create(
                            product_ptr_id=product.pk,
                            tutorial_course_template=template,
                            tutorial_location=location,
                            format=fmt_code,
                        )
                        tally['tutorial_created'] += 1
                    else:
                        tally['tutorial_already_split'] += 1

                elif kind == 'marking':
                    template = MarkingTemplate.objects.filter(
                        pk=ppv.product_id
                    ).first()
                    if template is None:
                        raise ValueError(
                            f'No MarkingTemplate with pk={ppv.product_id} '
                            f'(needed by Product.pk={product.pk}). '
                            f'Re-run marking migration 0019_backfill.'
                        )
                    if not MarkingProduct.objects.filter(pk=product.pk).exists():
                        MarkingProduct.objects.create(
                            product_ptr_id=product.pk,
                            marking_template=template,
                        )
                        tally['marking_created'] += 1
                    else:
                        tally['marking_already_split'] += 1

                # Update Purchasable.kind regardless of whether we
                # created or skipped (idempotency: fix stale kind).
                Purchasable.objects.filter(pk=purchasable.pk).update(kind=kind)

        self.stdout.write(self.style.SUCCESS('split_products_by_kind --commit done'))
        for key in (
            'material_created', 'material_already_split',
            'tutorial_created', 'tutorial_already_split',
            'marking_created', 'marking_already_split',
        ):
            self.stdout.write(f'  {key:30s} {tally[key]:6d}')
```

- [ ] **Step 6.4: Run tests — all 4 commit tests should pass**

```bash
python manage.py test store.tests.test_split_products_by_kind.SplitProductsCommitTests -v 2
```

Expected: 4 of 4 pass.

Run the full split_products test suite:

```bash
python manage.py test store.tests.test_split_products_by_kind -v 2
```

Expected: 10 of 10 pass (3 dry-run + 3 check + 4 commit).

- [ ] **Step 6.5: Confirm no store regressions**

```bash
python manage.py test store -v 1
```

Expected: All store tests pass.

- [ ] **Step 6.6: Commit**

```bash
git add backend/django_Admin3/store/management/commands/split_products_by_kind.py \
       backend/django_Admin3/store/tests/test_split_products_by_kind.py
git commit -m "feat(store): Phase 2B — split_products_by_kind --commit (idempotent split)

Walks every legacy Product, creates the matching MTI subclass row
sharing the parent PK, and reassigns Purchasable.kind to material/
tutorial/marking.

Idempotency: rows with an existing subclass child are skipped at
create time but their Purchasable.kind is still corrected if stale.

Transactional: one outer atomic() block. Failures (unmapped variation
type, missing MarkingTemplate, unknown tutorial Format) abort the
entire run with a clear error message naming the offending Product.

Tutorial dimension resolution:
  - format: from ppv.product_variation.code (1:1 enum match)
  - tutorial_course_template: lookup by '{subject}_{format}' pattern
    (lowercase f2f, uppercase LO). NULL if no template exists.
  - tutorial_location: from first linked TutorialEvent.location;
    NULL for OC products.

Marking dimension resolution:
  - marking_template: lookup by ppv.product_id (1:1 PK mapping from
    the Task 3 backfill)."
```

---

## Task 7: Run the split on dev DB; verify Phase 2 invariants

**Files:** (operational + verification, no new files)

This task runs the split for real on the dev DB and confirms Phase 2's outcome.

- [ ] **Step 7.1: Pre-flight — orphan check**

```bash
python manage.py shell -c "
from store.models import Product, Purchasable
orphans = Purchasable.objects.filter(kind='product').exclude(
    pk__in=Product.objects.values('pk')
)
count = orphans.count()
print(f'Orphan Purchasable rows (kind=product, no Product child): {count}')
if count > 0:
    print('  Run the SQL DELETE from the plan pre-flight before proceeding.')
"
```

Expected: `Orphan Purchasable rows (kind=product, no Product child): 0`.

If the count is non-zero, run the pre-flight SQL DELETE from the top of this plan, then re-check.

- [ ] **Step 7.2: Run `--check` and review output**

```bash
python manage.py split_products_by_kind --check
```

Expected: `unmapped tutorial formats: 0` and `missing marking_template rows: 0`. `missing tutorial templates` and `non-OC tutorials with no TutorialEvent` may be non-zero — those are tolerated (NULL FKs).

If `unmapped tutorial formats > 0`, STOP — Task 5 surfaced an enum gap. Add the missing values to `TutorialProduct.Format` in a follow-up migration before continuing.

- [ ] **Step 7.3: Run `--dry-run` and capture expected tally**

```bash
python manage.py split_products_by_kind --dry-run
```

Expected (from current dev data):
```
  material      6847
  tutorial       649
  marking        677
  unresolved       0
  total         8173
```

If `unresolved > 0`, STOP — investigate before proceeding.

- [ ] **Step 7.4: Run `--commit`**

```bash
python manage.py split_products_by_kind --commit
```

Expected output: one of each `*_created` line summing to ~8173; all `*_already_split` lines at 0.

- [ ] **Step 7.5: Verify Phase 2 invariants**

```bash
python manage.py shell -c "
from store.models import (
    Purchasable, Product, MaterialProduct, TutorialProduct, MarkingProduct,
)
m = MaterialProduct.objects.count()
t = TutorialProduct.objects.count()
mk = MarkingProduct.objects.count()
p = Product.objects.count()
legacy = Purchasable.objects.filter(kind='product').count()

print(f'MaterialProduct: {m}')
print(f'TutorialProduct: {t}')
print(f'MarkingProduct:  {mk}')
print(f'Product total:   {p}')
print(f'Sum of subclasses: {m + t + mk}')
print(f'Purchasable.kind=product remaining: {legacy}')

assert m + t + mk == p, f'{m + t + mk} subclass rows vs {p} Products'
assert legacy == 0, f'{legacy} legacy kind rows remain'
print('Phase 2 invariants: OK')
"
```

Expected: `Phase 2 invariants: OK`.

- [ ] **Step 7.6: Idempotency check — re-run `--commit`**

```bash
python manage.py split_products_by_kind --commit
```

Expected: all `*_created` lines are 0; all `*_already_split` lines hold the expected totals (`material_already_split = 6847`, `tutorial_already_split = 649`, `marking_already_split = 677`).

- [ ] **Step 7.7: Run the broader regression suite**

```bash
python manage.py test store marking cart orders catalog tutorials -v 1 2>&1 | tail -15
```

Expected: All pass. The cart/orders tests in particular validate that FK relationships through the parent Purchasable still resolve to the correct subclass row.

If a previously-passing test now fails, capture the failure and either:
  - Fix the test if its assumption was Phase-1-shaped (e.g., it assumed `Purchasable.kind == 'product'`).
  - Rollback the migration and split if the failure is a real regression.

- [ ] **Step 7.8: Commit the run-record** (optional — only if you want a marker commit)

Phase 2's runtime work doesn't add files, but a no-op commit creates a clean rollback boundary:

```bash
git commit --allow-empty -m "ops(store): Phase 2B run-record marker

Phase 2 split executed on dev DB. Verification matrix:
  - 8173 Product rows split into MaterialProduct (6847), TutorialProduct
    (649), MarkingProduct (677).
  - 0 Purchasable rows with kind='product' remain.
  - Idempotency confirmed: re-run --commit reported 0 new creates.
  - Full regression suite green.

No code changes — purely a marker for the operational milestone."
```

Skip this commit if you prefer a cleaner history.

---

## Task 8: Push the branch and open the PR

**Files:** (no changes; just git + gh)

- [ ] **Step 8.1: Push**

```bash
git push -u origin feat/20260514-product-mti-phase-2
```

- [ ] **Step 8.2: Open the PR**

```bash
gh pr create --base feat/20260513-product-mti-specialization --head feat/20260514-product-mti-phase-2 \
  --title "feat(store): Phase 2 — Product MTI specialization foundations + backfill" \
  --body "Implements Phase 2 of [Product MTI specialization design](docs/superpowers/specs/2026-05-13-product-mti-specialization-design.md). Stacked on top of PR #107 (Phase 1).

## What changes

### Stage 2A — Schema refinements (3 AlterField migrations)

After inspecting real dev DB data, three Phase-1 schemas didn't fit:

- **\`store.0019_reshape_tutorial_product\`** — expand \`TutorialProduct.Format\` enum from 5 placeholder codes to 23 real codes; make \`tutorial_location\` and \`tutorial_course_template\` nullable.
- **\`marking.0018_marking_template_composite_uc\`** — drop \`unique=True\` on \`MarkingTemplate.code\`; add composite \`UniqueConstraint(code, name)\` because catalog has rows like \`(M, Mock Exam Marking)\` and \`(M, Practice Exam Marking)\`.

### Stage 2B — Data backfill (1 RunPython migration + 1 management command)

- **\`marking.0019_backfill_marking_templates\`** — create one MarkingTemplate per distinct catalog.Product referenced by a Marking PPV. PK preserved (\`MarkingTemplate.id = catalog.Product.id\`).
- **\`store/management/commands/split_products_by_kind.py\`** — walk every \`store.Product\` and create the matching MTI subclass row. Idempotent. Modes: \`--dry-run\` (default), \`--check\`, \`--commit\`.

## Verification

- ✅ Pre-flight: 0 orphan Purchasable rows
- ✅ \`--check\` reports 0 unmapped formats and 0 missing marking_template rows
- ✅ \`--dry-run\` tally: 6847 material / 649 tutorial / 677 marking = 8173 total = \`Product.objects.count()\`
- ✅ Post-commit: \`Purchasable.objects.filter(kind='product').count() == 0\`
- ✅ Idempotency: second \`--commit\` creates 0 new rows
- ✅ Full \`store marking cart orders catalog tutorials\` regression suite green

## Pre-flight requirement (operational)

Before \`--commit\` runs, the 75 orphan \`Purchasable.kind='product'\` rows (mostly CAA0-CAA5 prefixes, surfaced in Phase 1 verification) must be deleted via:

\`\`\`sql
DELETE FROM \"acted\".\"purchasables\"
WHERE kind = 'product'
  AND id NOT IN (SELECT purchasable_ptr_id FROM \"acted\".\"products\");
\`\`\`

This was approved by the user on 2026-05-14 and verified to delete exactly 75 rows.

## Rollback

\`\`\`bash
# Reverse the split: drop all subclass rows + reset Kind enum
python manage.py shell -c \"
from store.models import MaterialProduct, TutorialProduct, MarkingProduct, Purchasable
MaterialProduct.objects.all().delete()
TutorialProduct.objects.all().delete()
MarkingProduct.objects.all().delete()
Purchasable.objects.exclude(kind__in=['marking_voucher','document_binder','additional_charge']).update(kind='product')
\"
python manage.py migrate marking 0017_add_marking_template_and_paper_fk
python manage.py migrate store 0018_create_marking_products
\`\`\`

## Plan / Spec

- Design: \`docs/superpowers/specs/2026-05-13-product-mti-specialization-design.md\` (Phase 2 section, updated 2026-05-14)
- Plan: \`docs/superpowers/plans/2026-05-14-product-mti-specialization-phase-2.md\`

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

Capture the PR URL.

- [ ] **Step 8.3: Confirm CI**

```bash
gh pr checks <PR_NUMBER>
```

Expected: All required checks pass (or the known pre-existing Pact flake fails on shard 2/3 — that's not a regression introduced by this PR).

---

## Notes for the implementer

### Tutorial template code convention reminder

The catalog `TutorialCourseTemplate.code` mixes case:
- `CB1_f2f_3` (lowercase `f2f`)
- `CB1_LO_3` (uppercase `LO`)

The split command's `_build_template_code()` helper reproduces this convention exactly. If you see new template codes added with a different convention (e.g., a new `CB1_OC_1` someday), update the helper rather than guessing.

### Why MarkingTemplate.id = catalog.Product.id

The backfill explicitly sets `MarkingTemplate.pk = catalog_product.pk`. This is a deliberate choice that the split command relies on:

```python
template = MarkingTemplate.objects.filter(pk=ppv.product_id).first()
```

If you change the backfill to auto-generate IDs, you must replace the by-pk lookup with a by-(code, name) lookup. Don't break this invariant casually.

### What's NOT in Phase 2

- **No consumer code is changed.** All existing reads/writes of `Product.product_product_variation` still work because the field stays on `Product` through Phase 4. Phase 3 (dual-write) and Phase 4 (consumer repoint) ship in subsequent plans.
- **No data is dropped.** Phase 5 will drop the catalog rows for Tutorial/Marking that are now redundant; Phase 2 leaves them in place.
- **`Purchasable.Kind.PRODUCT` enum value stays defined** until Phase 4e. The split clears all rows referring to it but the choice remains valid until consumer code is migrated.

### TDD reminder

Every task has a RED step. **Confirm RED before implementing.** Subagents in Phase 1 caught two real plan defects by trusting that RED meant something — don't skip it.
