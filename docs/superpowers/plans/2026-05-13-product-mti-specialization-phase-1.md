# Product MTI Specialization — Phase 1: Schema Additions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add empty `MaterialProduct`, `TutorialProduct`, `MarkingProduct` MTI subclass tables and the new `marking.MarkingTemplate` table, plus extend `Purchasable.Kind` with new values. No data movement, no consumer changes.

**Architecture:** Three new MTI subclasses below the existing `store.Product` intermediate (which is itself an MTI subclass of `store.Purchasable`). Each subclass owns a small, type-specific set of fields. A new `marking.MarkingTemplate` exam-session-agnostic table replaces the role of `catalog.Product` rows that today hold marking-series templates. `MarkingPaper` gains a nullable FK to the new template (will become NOT NULL in Phase 4c). The existing `'product'` Kind value stays alongside the new `material`/`tutorial`/`marking` values — Phase 2 backfill reassigns rows.

**Tech Stack:** Django 6.0 MTI, PostgreSQL `acted` schema (double-quoted `db_table`), per-app TDD with `python manage.py test`.

**Scope note:** This is Plan 1 of 5. Phases 2 (backfill), 3 (dual-write admin + serializers), 4a–4e (per-app repoints), and 5 (drop legacy) get their own plans authored after each prior phase ships. See [2026-05-13-product-mti-specialization-design.md](../specs/2026-05-13-product-mti-specialization-design.md) §6 for the full phase map.

**Pre-flight (no task — do once before Task 1):**

```bash
cd backend/django_Admin3
.\.venv\Scripts\activate
python manage.py migrate --check        # confirm DB is in sync
python manage.py test store marking     # confirm baseline green
```

---

## File Structure

### Files to create

| Path | Responsibility |
|------|----------------|
| `backend/django_Admin3/marking/models/marking_template.py` | New `MarkingTemplate` model (exam-session-agnostic template for marking series). |
| `backend/django_Admin3/store/models/material_product.py` | MTI subclass of `store.Product` for material products (eBook/Printed/Hub). Holds `product_product_variation` FK. |
| `backend/django_Admin3/store/models/tutorial_product.py` | MTI subclass of `store.Product` for tutorial products. Holds `tutorial_course_template`, `tutorial_location`, and `format` enum. |
| `backend/django_Admin3/store/models/marking_product.py` | MTI subclass of `store.Product` for marking products. Holds `marking_template` FK and `paper_count`. |
| `backend/django_Admin3/marking/tests/test_marking_template_model.py` | TDD tests for `MarkingTemplate`. |
| `backend/django_Admin3/store/tests/test_material_product_model.py` | TDD tests for `MaterialProduct`. |
| `backend/django_Admin3/store/tests/test_tutorial_product_model.py` | TDD tests for `TutorialProduct`. |
| `backend/django_Admin3/store/tests/test_marking_product_model.py` | TDD tests for `MarkingProduct`. |
| `backend/django_Admin3/marking/migrations/0017_add_marking_template_and_paper_fk.py` | Creates `marking_templates` table; adds nullable `MarkingPaper.marking_template` FK. |
| `backend/django_Admin3/store/migrations/0016_add_kind_values_and_subclasses.py` | Extends `Purchasable.Kind`; creates three new MTI subclass tables. |

### Files to modify

| Path | Change |
|------|--------|
| `backend/django_Admin3/marking/models/__init__.py` | Export `MarkingTemplate`. |
| `backend/django_Admin3/store/models/__init__.py` | Export `MaterialProduct`, `TutorialProduct`, `MarkingProduct`. |
| `backend/django_Admin3/store/models/purchasable.py` | Add `MATERIAL`, `TUTORIAL`, `MARKING` to `Kind` enum (keep `PRODUCT`). |

---

## Task 1: Extend `Purchasable.Kind` with new values

**Files:**
- Modify: `backend/django_Admin3/store/models/purchasable.py` lines 117-122
- Test: `backend/django_Admin3/store/tests/test_purchasable.py` (existing — add a new test class)

The existing `Kind.PRODUCT` value stays. We add `MATERIAL`, `TUTORIAL`, `MARKING` alongside so Phase 2 can backfill rows without violating the choices constraint.

- [ ] **Step 1.1: Write the failing test**

Append to the bottom of `backend/django_Admin3/store/tests/test_purchasable.py`:

```python
class KindEnumExtensionTests(TestCase):
    """Kind enum gains specialized product family values in Phase 1.

    Phase 2 backfill reassigns existing `'product'` rows to one of these.
    Phase 4e removes `'product'` from choices.
    """

    def test_kind_has_material_value(self):
        self.assertEqual(Purchasable.Kind.MATERIAL.value, 'material')
        self.assertEqual(Purchasable.Kind.MATERIAL.label, 'Material Product')

    def test_kind_has_tutorial_value(self):
        self.assertEqual(Purchasable.Kind.TUTORIAL.value, 'tutorial')
        self.assertEqual(Purchasable.Kind.TUTORIAL.label, 'Tutorial Product')

    def test_kind_has_marking_value(self):
        self.assertEqual(Purchasable.Kind.MARKING.value, 'marking')
        self.assertEqual(Purchasable.Kind.MARKING.label, 'Marking Product')

    def test_kind_keeps_legacy_product_value(self):
        """Legacy `'product'` must remain valid during Phase 1-4 transition."""
        self.assertEqual(Purchasable.Kind.PRODUCT.value, 'product')

    def test_kind_keeps_existing_generic_values(self):
        self.assertEqual(Purchasable.Kind.MARKING_VOUCHER.value, 'marking_voucher')
        self.assertEqual(Purchasable.Kind.DOCUMENT_BINDER.value, 'document_binder')
        self.assertEqual(Purchasable.Kind.ADDITIONAL_CHARGE.value, 'additional_charge')
```

If `test_purchasable.py` doesn't already import `TestCase` and `Purchasable`, add them at the top:

```python
from django.test import TestCase
from store.models import Purchasable
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
cd backend/django_Admin3
python manage.py test store.tests.test_purchasable.KindEnumExtensionTests -v 2
```

Expected: FAIL with `AttributeError: type object 'Kind' has no attribute 'MATERIAL'`.

- [ ] **Step 1.3: Add new Kind values**

In `backend/django_Admin3/store/models/purchasable.py`, replace the `Kind` class (currently lines 117-122):

```python
class Kind(models.TextChoices):
    # Specialized product families (Phase 1+) — backfilled from PRODUCT in Phase 2
    MATERIAL = 'material', 'Material Product'
    TUTORIAL = 'tutorial', 'Tutorial Product'
    MARKING = 'marking', 'Marking Product'
    # Generic non-ESS purchasables
    MARKING_VOUCHER = 'marking_voucher', 'Marking Voucher'
    DOCUMENT_BINDER = 'document_binder', 'Document Binder'
    ADDITIONAL_CHARGE = 'additional_charge', 'Additional Charge'
    # Legacy — removed in Phase 4e after backfill completes
    PRODUCT = 'product', 'Legacy Product (pre-split)'
```

- [ ] **Step 1.4: Run test to verify it passes**

```bash
python manage.py test store.tests.test_purchasable.KindEnumExtensionTests -v 2
```

Expected: 5 tests PASS.

- [ ] **Step 1.5: Confirm full purchasable test suite still passes**

```bash
python manage.py test store.tests.test_purchasable -v 2
```

Expected: All tests pass (no regressions).

- [ ] **Step 1.6: Commit**

```bash
git add backend/django_Admin3/store/models/purchasable.py backend/django_Admin3/store/tests/test_purchasable.py
git commit -m "feat(store): add MATERIAL/TUTORIAL/MARKING values to Purchasable.Kind

Phase 1 of Product MTI specialization. Existing 'product' value retained
alongside the new specialized values so Phase 2 backfill can reassign
rows without violating the choices constraint."
```

---

## Task 2: Create `marking.MarkingTemplate` model

**Files:**
- Create: `backend/django_Admin3/marking/models/marking_template.py`
- Modify: `backend/django_Admin3/marking/models/__init__.py`
- Test: `backend/django_Admin3/marking/tests/test_marking_template_model.py`

- [ ] **Step 2.1: Write the failing test**

Create `backend/django_Admin3/marking/tests/test_marking_template_model.py`:

```python
"""Tests for marking.MarkingTemplate (Phase 1 of MTI specialization)."""
from django.db import IntegrityError, transaction
from django.test import TestCase


class MarkingTemplateModelTests(TestCase):
    def test_importable_from_marking_models(self):
        from marking.models import MarkingTemplate
        self.assertTrue(hasattr(MarkingTemplate, '_meta'))

    def test_schema_qualified_db_table(self):
        from marking.models import MarkingTemplate
        self.assertEqual(
            MarkingTemplate._meta.db_table,
            '"acted"."marking_templates"',
        )

    def test_create_minimal(self):
        from marking.models import MarkingTemplate
        t = MarkingTemplate.objects.create(code='X', name='Series X Marking')
        self.assertEqual(t.code, 'X')
        self.assertEqual(t.name, 'Series X Marking')
        self.assertTrue(t.is_active)
        self.assertEqual(t.description, '')
        self.assertIsNotNone(t.created_at)
        self.assertIsNotNone(t.updated_at)

    def test_code_is_unique(self):
        from marking.models import MarkingTemplate
        MarkingTemplate.objects.create(code='MM1', name='Mock Marking 1')
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                MarkingTemplate.objects.create(code='MM1', name='Duplicate')

    def test_str_format(self):
        from marking.models import MarkingTemplate
        t = MarkingTemplate.objects.create(code='X', name='Series X Marking')
        self.assertEqual(str(t), 'X: Series X Marking')

    def test_inactive_by_flag(self):
        from marking.models import MarkingTemplate
        t = MarkingTemplate.objects.create(
            code='OLD', name='Retired Series', is_active=False
        )
        self.assertFalse(t.is_active)
```

- [ ] **Step 2.2: Run test to verify it fails**

```bash
cd backend/django_Admin3
python manage.py test marking.tests.test_marking_template_model -v 2
```

Expected: FAIL with `ImportError: cannot import name 'MarkingTemplate' from 'marking.models'`.

- [ ] **Step 2.3: Create the model**

Create `backend/django_Admin3/marking/models/marking_template.py`:

```python
"""MarkingTemplate — exam-session-agnostic template for a marking series.

Replaces the role of `catalog_products.Product` rows that today hold
marking-series templates (codes like 'X', 'MM1'). The concrete saleable
row is `store.MarkingProduct`, which links a template to an
ExamSessionSubject.

Table: acted.marking_templates
"""
from django.db import models


class MarkingTemplate(models.Model):
    """A reusable marking series template (e.g., 'Series X', 'Mock Marking 1').

    Templates are exam-session-agnostic. A `store.MarkingProduct` row
    pairs a template with an `ExamSessionSubject` to make it saleable.
    """

    code = models.CharField(
        max_length=10,
        unique=True,
        help_text="Series code (e.g., 'X', 'MM1', 'Y').",
    )
    name = models.CharField(
        max_length=255,
        help_text="Display name (e.g., 'Series X Marking').",
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'marking'
        db_table = '"acted"."marking_templates"'
        ordering = ['code']
        verbose_name = 'Marking Template'
        verbose_name_plural = 'Marking Templates'

    def __str__(self):
        return f"{self.code}: {self.name}"
```

- [ ] **Step 2.4: Export from `marking.models`**

Edit `backend/django_Admin3/marking/models/__init__.py`. The existing file is:

```python
from .marking_paper import MarkingPaper
from .marker import Marker
from .marking_paper_submission import MarkingPaperSubmission
from .marking_paper_grading import MarkingPaperGrading
from .marking_paper_feedback import MarkingPaperFeedback
```

Replace with:

```python
from .marking_paper import MarkingPaper
from .marker import Marker
from .marking_paper_submission import MarkingPaperSubmission
from .marking_paper_grading import MarkingPaperGrading
from .marking_paper_feedback import MarkingPaperFeedback
from .marking_template import MarkingTemplate

__all__ = [
    'MarkingPaper',
    'Marker',
    'MarkingPaperSubmission',
    'MarkingPaperGrading',
    'MarkingPaperFeedback',
    'MarkingTemplate',
]
```

- [ ] **Step 2.5: Run `makemigrations` for the new model**

```bash
python manage.py makemigrations marking --name add_marking_template_and_paper_fk --dry-run
```

Expected output: `Migrations for 'marking': marking/migrations/0017_add_marking_template_and_paper_fk.py - Create model MarkingTemplate`

The actual `MarkingPaper.marking_template` FK is added in Task 3; we'll generate one combined migration there. For now, **do not** persist the migration yet. Skip writing the file.

- [ ] **Step 2.6: Run the tests — they should now pass at the Python level (no migration yet)**

```bash
python manage.py test marking.tests.test_marking_template_model -v 2
```

Expected: FAIL with `django.db.utils.ProgrammingError: relation "acted.marking_templates" does not exist` because the migration hasn't run yet. This is correct — Task 3 emits the migration.

If you want a green checkpoint *now*, you can run `makemigrations marking` (no `--dry-run`) and `migrate`. Otherwise commit the model code as-is and proceed to Task 3.

- [ ] **Step 2.7: Commit**

```bash
git add backend/django_Admin3/marking/models/marking_template.py \
       backend/django_Admin3/marking/models/__init__.py \
       backend/django_Admin3/marking/tests/test_marking_template_model.py
git commit -m "feat(marking): MarkingTemplate model (exam-session-agnostic series template)

Phase 1 of Product MTI specialization. The model is wired in but the
migration is created in Task 3 alongside MarkingPaper.marking_template
FK so both changes ship in one migration file."
```

---

## Task 3: Add nullable `MarkingPaper.marking_template` FK + emit the marking migration

**Files:**
- Modify: `backend/django_Admin3/marking/models/marking_paper.py`
- Create: `backend/django_Admin3/marking/migrations/0017_add_marking_template_and_paper_fk.py`
- Test: `backend/django_Admin3/marking/tests/test_marking_template_model.py` (extend existing)

The FK is nullable in Phase 1; Phase 4c backfills it then enforces NOT NULL.

- [ ] **Step 3.1: Write the failing test**

Append to `backend/django_Admin3/marking/tests/test_marking_template_model.py`:

```python
class MarkingPaperHasTemplateFKTests(TestCase):
    """MarkingPaper.marking_template added in Phase 1 (nullable).

    Becomes NOT NULL in Phase 4c after backfill.
    """

    def test_marking_paper_has_marking_template_field(self):
        from marking.models import MarkingPaper
        field = MarkingPaper._meta.get_field('marking_template')
        self.assertTrue(field.null, "Phase 1: marking_template must be nullable")
        # related model resolves to MarkingTemplate
        from marking.models import MarkingTemplate
        self.assertEqual(field.related_model, MarkingTemplate)

    def test_marking_paper_marking_template_on_delete_protect(self):
        from marking.models import MarkingPaper
        from django.db import models as dj_models
        field = MarkingPaper._meta.get_field('marking_template')
        # PROTECT prevents accidental cascade deletion of all papers for a series
        self.assertEqual(field.remote_field.on_delete, dj_models.PROTECT)
```

- [ ] **Step 3.2: Run test to verify it fails**

```bash
python manage.py test marking.tests.test_marking_template_model.MarkingPaperHasTemplateFKTests -v 2
```

Expected: FAIL with `FieldDoesNotExist: MarkingPaper has no field named 'marking_template'`.

- [ ] **Step 3.3: Add the FK to `MarkingPaper`**

Edit `backend/django_Admin3/marking/models/marking_paper.py`. After the `purchasable` field (around line 36), add:

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

- [ ] **Step 3.4: Generate the migration**

```bash
python manage.py makemigrations marking --name add_marking_template_and_paper_fk
```

Expected output:

```
Migrations for 'marking':
  marking/migrations/0017_add_marking_template_and_paper_fk.py
    - Create model MarkingTemplate
    - Add field marking_template to markingpaper
```

Open the generated file and verify it contains:
- `CreateModel` for `MarkingTemplate` with `db_table='"acted"."marking_templates"'`
- `AddField` for `markingpaper.marking_template` with `null=True`

If the migration includes any unrelated changes (e.g., stale state from another developer's branch), stop and reconcile.

- [ ] **Step 3.5: Apply the migration**

```bash
python manage.py migrate marking
```

Expected output: `Applying marking.0017_add_marking_template_and_paper_fk... OK`

- [ ] **Step 3.6: Run the tests — all should pass now**

```bash
python manage.py test marking.tests.test_marking_template_model -v 2
```

Expected: All 8 tests (6 from Task 2 + 2 from Task 3) PASS.

- [ ] **Step 3.7: Run full marking test suite — no regressions**

```bash
python manage.py test marking -v 2
```

Expected: All marking tests pass (no regressions).

- [ ] **Step 3.8: Commit**

```bash
git add backend/django_Admin3/marking/models/marking_paper.py \
       backend/django_Admin3/marking/migrations/0017_add_marking_template_and_paper_fk.py \
       backend/django_Admin3/marking/tests/test_marking_template_model.py
git commit -m "feat(marking): nullable MarkingPaper.marking_template FK + migration

Phase 1 of Product MTI specialization. FK is nullable now; Phase 4c
backfills it from the purchasable chain and enforces NOT NULL."
```

---

## Task 4: Create `store.MaterialProduct` MTI subclass

**Files:**
- Create: `backend/django_Admin3/store/models/material_product.py`
- Modify: `backend/django_Admin3/store/models/__init__.py`
- Test: `backend/django_Admin3/store/tests/test_material_product_model.py`

`MaterialProduct` is the simplest of the three subclasses — it keeps the `product_product_variation` FK that currently lives on `store.Product`. (`store.Product` will keep this column too during Phase 1–4; it's removed in Phase 5.)

- [ ] **Step 4.1: Write the failing test**

Create `backend/django_Admin3/store/tests/test_material_product_model.py`:

```python
"""Tests for store.MaterialProduct (Phase 1 of MTI specialization).

MaterialProduct is the MTI subclass of store.Product for eBook/Printed/Hub
items — the products that fit the catalog template + variation pattern.
"""
from django.test import TestCase


class MaterialProductImportTests(TestCase):
    def test_importable_from_store_models(self):
        from store.models import MaterialProduct
        self.assertTrue(hasattr(MaterialProduct, '_meta'))

    def test_schema_qualified_db_table(self):
        from store.models import MaterialProduct
        self.assertEqual(
            MaterialProduct._meta.db_table,
            '"acted"."material_products"',
        )


class MaterialProductMTITests(TestCase):
    """MaterialProduct is an MTI subclass of store.Product."""

    def test_is_subclass_of_product(self):
        from store.models import MaterialProduct, Product
        self.assertTrue(issubclass(MaterialProduct, Product))

    def test_is_subclass_of_purchasable_transitively(self):
        from store.models import MaterialProduct, Purchasable
        self.assertTrue(issubclass(MaterialProduct, Purchasable))

    def test_has_product_ptr_parent_link(self):
        from store.models import MaterialProduct, Product
        parent_link = MaterialProduct._meta.parents.get(Product)
        self.assertIsNotNone(
            parent_link,
            "No MTI parent_link found from MaterialProduct to Product",
        )

    def test_owns_product_product_variation_fk(self):
        """PPV FK lives on MaterialProduct (not redeclared elsewhere)."""
        from store.models import MaterialProduct
        field = MaterialProduct._meta.get_field('product_product_variation')
        self.assertEqual(field.model, MaterialProduct)
        self.assertEqual(
            field.related_model._meta.label,
            'catalog_products.ProductProductVariation',
        )

    def test_inherits_exam_session_subject_from_product(self):
        """ESS FK is inherited from the intermediate Product parent."""
        from store.models import MaterialProduct, Product
        field = MaterialProduct._meta.get_field('exam_session_subject')
        self.assertEqual(field.model, Product)
```

- [ ] **Step 4.2: Run test to verify it fails**

```bash
cd backend/django_Admin3
python manage.py test store.tests.test_material_product_model -v 2
```

Expected: FAIL with `ImportError: cannot import name 'MaterialProduct' from 'store.models'`.

- [ ] **Step 4.3: Create the model**

Create `backend/django_Admin3/store/models/material_product.py`:

```python
"""MaterialProduct — MTI subclass of store.Product for material items.

Materials (eBook, Printed, Hub) are the only product family that uses
the `catalog_products` template + variation structure. Tutorial and
Marking products have their own subclasses that bypass the catalog.

Table: acted.material_products
"""
from django.db import models

from store.models.product import Product


class MaterialProduct(Product):
    """ESS-based material product (eBook/Printed/Hub).

    Phase 1: empty table. Phase 2 backfills rows from existing
    `store.Product` rows whose PPV.variation.variation_type is
    one of {'eBook', 'Printed', 'Hub'}. Each backfilled row shares
    its PK with the parent Product row (MTI shared PK).
    """

    product_product_variation = models.ForeignKey(
        'catalog_products.ProductProductVariation',
        on_delete=models.PROTECT,
        related_name='store_material_products',
        help_text='The catalog template + variation combination.',
    )

    class Meta:
        db_table = '"acted"."material_products"'
        verbose_name = 'Material Product'
        verbose_name_plural = 'Material Products'
        # Uniqueness enforced by Purchasable.code UNIQUE.
        # Addons share PPV with their base (distinguished via
        # Purchasable.is_addon), so we don't unique on (ess, ppv).
```

- [ ] **Step 4.4: Export `MaterialProduct` from `store.models`**

Edit `backend/django_Admin3/store/models/__init__.py`. The existing file is:

```python
"""Store models - Purchasable items available in the online store."""
from store.models.purchasable import Purchasable
from store.models.generic_item import GenericItem
from store.models.product import Product
from store.models.price import Price
from store.models.bundle import Bundle
from store.models.bundle_product import BundleProduct

__all__ = ['Purchasable', 'GenericItem', 'Product', 'Price', 'Bundle', 'BundleProduct']
```

Replace with (adds only `MaterialProduct` for now — Tasks 5 and 6 add the other two):

```python
"""Store models - Purchasable items available in the online store."""
from store.models.purchasable import Purchasable
from store.models.generic_item import GenericItem
from store.models.product import Product
from store.models.material_product import MaterialProduct
from store.models.price import Price
from store.models.bundle import Bundle
from store.models.bundle_product import BundleProduct

__all__ = [
    'Purchasable',
    'GenericItem',
    'Product',
    'MaterialProduct',
    'Price',
    'Bundle',
    'BundleProduct',
]
```

**Why staged:** importing a non-existent module from `__init__.py` would break Django startup. Tasks 5 and 6 each add their own import line at the matching location.

- [ ] **Step 4.5: Generate the migration**

(We bundle all three subclasses + Kind enum into one store migration in Task 6. For now, skip generating.)

The `MaterialProduct` model will be ready for migration generation once `TutorialProduct` and `MarkingProduct` exist. Proceed to Task 5.

- [ ] **Step 4.6: Commit**

```bash
git add backend/django_Admin3/store/models/material_product.py \
       backend/django_Admin3/store/models/__init__.py \
       backend/django_Admin3/store/tests/test_material_product_model.py
git commit -m "feat(store): MaterialProduct MTI subclass model (no migration yet)

Phase 1 of Product MTI specialization. MaterialProduct holds the
catalog product_product_variation FK that currently lives on
store.Product. Migration is emitted in Task 6 alongside the other
two subclasses."
```

---

## Task 5: Create `store.TutorialProduct` MTI subclass + Format enum

**Files:**
- Create: `backend/django_Admin3/store/models/tutorial_product.py`
- Test: `backend/django_Admin3/store/tests/test_tutorial_product_model.py`

`TutorialProduct` owns three type-specific fields: `tutorial_course_template`, `tutorial_location`, and a `format` enum that replaces the role of `ProductVariation(variation_type='Tutorial')` rows.

**Format enum values:** The values listed below are a starting set. Phase 2 backfill includes a `--check` mode that surfaces any legacy `ProductVariation.code` for tutorials that don't map cleanly — we expand this enum at that time if needed. Do NOT block Phase 1 on enumerating every legacy value.

- [ ] **Step 5.1: Write the failing test**

Create `backend/django_Admin3/store/tests/test_tutorial_product_model.py`:

```python
"""Tests for store.TutorialProduct (Phase 1 of MTI specialization)."""
from django.test import TestCase


class TutorialProductImportTests(TestCase):
    def test_importable_from_store_models(self):
        from store.models import TutorialProduct
        self.assertTrue(hasattr(TutorialProduct, '_meta'))

    def test_schema_qualified_db_table(self):
        from store.models import TutorialProduct
        self.assertEqual(
            TutorialProduct._meta.db_table,
            '"acted"."tutorial_products"',
        )


class TutorialProductMTITests(TestCase):
    def test_is_subclass_of_product(self):
        from store.models import TutorialProduct, Product
        self.assertTrue(issubclass(TutorialProduct, Product))

    def test_has_product_ptr_parent_link(self):
        from store.models import TutorialProduct, Product
        self.assertIsNotNone(TutorialProduct._meta.parents.get(Product))


class TutorialProductFieldsTests(TestCase):
    def test_owns_tutorial_course_template_fk(self):
        from store.models import TutorialProduct
        field = TutorialProduct._meta.get_field('tutorial_course_template')
        self.assertEqual(field.model, TutorialProduct)
        self.assertEqual(
            field.related_model._meta.label,
            'tutorials.TutorialCourseTemplate',
        )

    def test_owns_tutorial_location_fk(self):
        from store.models import TutorialProduct
        field = TutorialProduct._meta.get_field('tutorial_location')
        self.assertEqual(field.model, TutorialProduct)
        self.assertEqual(
            field.related_model._meta.label,
            'tutorials.TutorialLocation',
        )

    def test_format_is_textchoices(self):
        from store.models import TutorialProduct
        field = TutorialProduct._meta.get_field('format')
        self.assertIsNotNone(field.choices)
        # Verify a baseline value the design committed to
        format_values = {value for value, _label in field.choices}
        for required in ('F2F_1F', 'F2F_3F', 'F2F_5F', 'LIVE', 'REC'):
            self.assertIn(
                required, format_values,
                f"Tutorial Format must include {required}",
            )


class TutorialProductConstraintsTests(TestCase):
    def test_has_unique_dimensions_constraint(self):
        """Uniqueness over (course_template, location, format, ESS)."""
        from store.models import TutorialProduct
        constraint_names = {
            c.name for c in TutorialProduct._meta.constraints
        }
        self.assertIn('uq_tutorial_product_dimensions', constraint_names)
```

- [ ] **Step 5.2: Run test to verify it fails**

```bash
python manage.py test store.tests.test_tutorial_product_model -v 2
```

Expected: FAIL with `ImportError: cannot import name 'TutorialProduct' from 'store.models'`.

- [ ] **Step 5.3: Create the model**

Create `backend/django_Admin3/store/models/tutorial_product.py`:

```python
"""TutorialProduct — MTI subclass of store.Product for tutorial events.

Tutorial products bypass the catalog (catalog_products /
catalog_product_variations). Instead, each TutorialProduct owns:
  - `tutorial_course_template` FK → tutorials.TutorialCourseTemplate
  - `tutorial_location`        FK → tutorials.TutorialLocation
  - `format` enum (F2F 1-day / 3-day / 5-day, Live Online, Recorded)

The enum replaces the role of catalog `ProductVariation` rows with
`variation_type='Tutorial'`.

Table: acted.tutorial_products
"""
from django.db import models

from store.models.product import Product


class TutorialProduct(Product):
    """ESS-based tutorial product.

    Phase 1: empty table. Phase 2 backfills rows from existing
    `store.Product` rows whose PPV.variation.variation_type is
    'Tutorial' or any tutorial-format equivalent. Each backfilled row
    shares its PK with the parent Product row (MTI shared PK).
    """

    class Format(models.TextChoices):
        # Initial set — Phase 2 backfill expands if it finds legacy values
        # that don't map cleanly. The Phase 2 plan's `--check` mode will
        # surface those.
        F2F_1DAY    = 'F2F_1F', 'Face-to-Face 1-day'
        F2F_3DAY    = 'F2F_3F', 'Face-to-Face 3-day'
        F2F_5DAY    = 'F2F_5F', 'Face-to-Face 5-day'
        LIVE_ONLINE = 'LIVE',   'Live Online'
        RECORDED    = 'REC',    'Recorded'

    tutorial_course_template = models.ForeignKey(
        'tutorials.TutorialCourseTemplate',
        on_delete=models.PROTECT,
        related_name='store_tutorial_products',
    )
    tutorial_location = models.ForeignKey(
        'tutorials.TutorialLocation',
        on_delete=models.PROTECT,
        related_name='store_tutorial_products',
    )
    format = models.CharField(max_length=16, choices=Format.choices)

    class Meta:
        db_table = '"acted"."tutorial_products"'
        verbose_name = 'Tutorial Product'
        verbose_name_plural = 'Tutorial Products'
        constraints = [
            models.UniqueConstraint(
                fields=[
                    'tutorial_course_template',
                    'tutorial_location',
                    'format',
                    'exam_session_subject',
                ],
                name='uq_tutorial_product_dimensions',
            ),
        ]
```

- [ ] **Step 5.4: Add `TutorialProduct` export to `store.models.__init__`**

Edit `backend/django_Admin3/store/models/__init__.py`. After the `MaterialProduct` import line added in Task 4.4, add:

```python
from store.models.tutorial_product import TutorialProduct
```

And append `'TutorialProduct'` to the `__all__` list (after `'MaterialProduct'`). The file should now read:

```python
"""Store models - Purchasable items available in the online store."""
from store.models.purchasable import Purchasable
from store.models.generic_item import GenericItem
from store.models.product import Product
from store.models.material_product import MaterialProduct
from store.models.tutorial_product import TutorialProduct
from store.models.price import Price
from store.models.bundle import Bundle
from store.models.bundle_product import BundleProduct

__all__ = [
    'Purchasable',
    'GenericItem',
    'Product',
    'MaterialProduct',
    'TutorialProduct',
    'Price',
    'Bundle',
    'BundleProduct',
]
```

- [ ] **Step 5.5: Run tests (still no migration; expect import-time green, DB-time fail)**

```bash
python manage.py test store.tests.test_tutorial_product_model.TutorialProductImportTests \
                       store.tests.test_tutorial_product_model.TutorialProductMTITests \
                       store.tests.test_tutorial_product_model.TutorialProductFieldsTests \
                       store.tests.test_tutorial_product_model.TutorialProductConstraintsTests -v 2
```

Expected: All 7 tests PASS (these test model metadata only, no DB).

- [ ] **Step 5.6: Commit**

```bash
git add backend/django_Admin3/store/models/tutorial_product.py \
       backend/django_Admin3/store/tests/test_tutorial_product_model.py
git commit -m "feat(store): TutorialProduct MTI subclass + Format enum

Phase 1 of Product MTI specialization. TutorialProduct owns tutorial
course template, location, and format directly — bypassing
catalog_product_variations. The Format enum replaces the legacy
ProductVariation(variation_type='Tutorial') rows. Migration emitted
in Task 6."
```

---

## Task 6: Create `store.MarkingProduct` MTI subclass + emit the store migration

**Files:**
- Create: `backend/django_Admin3/store/models/marking_product.py`
- Create: `backend/django_Admin3/store/migrations/0016_add_kind_values_and_subclasses.py` (generated)
- Test: `backend/django_Admin3/store/tests/test_marking_product_model.py`

This is the final subclass model, and it triggers emission of the combined `store` migration that creates all three subclass tables.

- [ ] **Step 6.1: Write the failing test**

Create `backend/django_Admin3/store/tests/test_marking_product_model.py`:

```python
"""Tests for store.MarkingProduct (Phase 1 of MTI specialization)."""
from django.test import TestCase


class MarkingProductImportTests(TestCase):
    def test_importable_from_store_models(self):
        from store.models import MarkingProduct
        self.assertTrue(hasattr(MarkingProduct, '_meta'))

    def test_schema_qualified_db_table(self):
        from store.models import MarkingProduct
        self.assertEqual(
            MarkingProduct._meta.db_table,
            '"acted"."marking_products"',
        )


class MarkingProductMTITests(TestCase):
    def test_is_subclass_of_product(self):
        from store.models import MarkingProduct, Product
        self.assertTrue(issubclass(MarkingProduct, Product))

    def test_has_product_ptr_parent_link(self):
        from store.models import MarkingProduct, Product
        self.assertIsNotNone(MarkingProduct._meta.parents.get(Product))


class MarkingProductFieldsTests(TestCase):
    def test_owns_marking_template_fk(self):
        from store.models import MarkingProduct
        field = MarkingProduct._meta.get_field('marking_template')
        self.assertEqual(field.model, MarkingProduct)
        self.assertEqual(
            field.related_model._meta.label,
            'marking.MarkingTemplate',
        )

    def test_paper_count_is_optional(self):
        from store.models import MarkingProduct
        field = MarkingProduct._meta.get_field('paper_count')
        self.assertTrue(field.null)
        self.assertTrue(field.blank)


class MarkingProductConstraintsTests(TestCase):
    def test_has_unique_template_ess_constraint(self):
        from store.models import MarkingProduct
        constraint_names = {c.name for c in MarkingProduct._meta.constraints}
        self.assertIn('uq_marking_product_per_template_ess', constraint_names)
```

- [ ] **Step 6.2: Run test to verify it fails**

```bash
python manage.py test store.tests.test_marking_product_model -v 2
```

Expected: FAIL with `ImportError: cannot import name 'MarkingProduct' from 'store.models'`.

- [ ] **Step 6.3: Create the model**

Create `backend/django_Admin3/store/models/marking_product.py`:

```python
"""MarkingProduct — MTI subclass of store.Product for marking series.

Marking products are always delivered electronically — there is no
'printed marking' variation. The variation choice that exists in
`catalog_product_variations` for marking is structurally pointless.
MarkingProduct bypasses the catalog and links directly to a
`marking.MarkingTemplate` (the series-level concept).

Table: acted.marking_products
"""
from django.db import models

from store.models.product import Product


class MarkingProduct(Product):
    """ESS-based marking product.

    Phase 1: empty table. Phase 2 backfills rows from existing
    `store.Product` rows whose PPV.variation.variation_type is
    'Marking'. Each backfilled row shares its PK with the parent
    Product row (MTI shared PK).
    """

    marking_template = models.ForeignKey(
        'marking.MarkingTemplate',
        on_delete=models.PROTECT,
        related_name='store_marking_products',
        help_text='The marking series template this product realizes.',
    )
    paper_count = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text=(
            'Number of papers in this series. Optional — can be derived '
            'from MarkingPaper rows attached to this template.'
        ),
    )

    class Meta:
        db_table = '"acted"."marking_products"'
        verbose_name = 'Marking Product'
        verbose_name_plural = 'Marking Products'
        constraints = [
            models.UniqueConstraint(
                fields=['marking_template', 'exam_session_subject'],
                name='uq_marking_product_per_template_ess',
            ),
        ]
```

- [ ] **Step 6.4: Add `MarkingProduct` export to `store.models.__init__`**

Edit `backend/django_Admin3/store/models/__init__.py`. After the `TutorialProduct` import line added in Task 5.4, add:

```python
from store.models.marking_product import MarkingProduct
```

And append `'MarkingProduct'` to the `__all__` list (after `'TutorialProduct'`). The final file should read:

```python
"""Store models - Purchasable items available in the online store."""
from store.models.purchasable import Purchasable
from store.models.generic_item import GenericItem
from store.models.product import Product
from store.models.material_product import MaterialProduct
from store.models.tutorial_product import TutorialProduct
from store.models.marking_product import MarkingProduct
from store.models.price import Price
from store.models.bundle import Bundle
from store.models.bundle_product import BundleProduct

__all__ = [
    'Purchasable',
    'GenericItem',
    'Product',
    'MaterialProduct',
    'TutorialProduct',
    'MarkingProduct',
    'Price',
    'Bundle',
    'BundleProduct',
]
```

- [ ] **Step 6.5: Generate the combined store migration**

```bash
python manage.py makemigrations store --name add_kind_values_and_subclasses
```

Expected output:

```
Migrations for 'store':
  store/migrations/0016_add_kind_values_and_subclasses.py
    - Alter field kind on purchasable
    - Create model MaterialProduct
    - Create model TutorialProduct
    - Create model MarkingProduct
```

Open `backend/django_Admin3/store/migrations/0016_add_kind_values_and_subclasses.py` and verify:

1. `AlterField` on `purchasable.kind` lists all seven choices (MATERIAL, TUTORIAL, MARKING, MARKING_VOUCHER, DOCUMENT_BINDER, ADDITIONAL_CHARGE, PRODUCT).
2. Three `CreateModel` operations with `bases=('store.product',)` (MTI bases).
3. Each new model's `db_table` is `'"acted"."material_products"'`, `'"acted"."tutorial_products"'`, `'"acted"."marking_products"'` respectively.
4. Each model has a `product_ptr` OneToOneField as `parent_link=True, primary_key=True`.
5. `TutorialProduct` has the `uq_tutorial_product_dimensions` constraint.
6. `MarkingProduct` has the `uq_marking_product_per_template_ess` constraint.

If any of these are missing, stop and investigate — do not commit a malformed migration.

- [ ] **Step 6.6: Confirm migration dependency graph**

```bash
python manage.py showmigrations store marking | tail -10
```

Expected: store's `0016_add_kind_values_and_subclasses` is unapplied; marking's `0017_add_marking_template_and_paper_fk` is applied. `MarkingProduct.marking_template` references `marking.MarkingTemplate`, so the auto-generated migration should list `('marking', '0017_add_marking_template_and_paper_fk')` in its `dependencies`. Verify by reading the dependencies list at the top of the new migration file.

If missing, add manually:

```python
dependencies = [
    ('store', '0015_ensure_fee_generic_exists'),
    ('marking', '0017_add_marking_template_and_paper_fk'),
]
```

- [ ] **Step 6.7: Apply the migration**

```bash
python manage.py migrate store
```

Expected: `Applying store.0016_add_kind_values_and_subclasses... OK`

- [ ] **Step 6.8: Run all Phase 1 model tests**

```bash
python manage.py test store.tests.test_purchasable.KindEnumExtensionTests \
                       store.tests.test_material_product_model \
                       store.tests.test_tutorial_product_model \
                       store.tests.test_marking_product_model \
                       marking.tests.test_marking_template_model -v 2
```

Expected: All tests PASS.

- [ ] **Step 6.9: Commit**

```bash
git add backend/django_Admin3/store/models/marking_product.py \
       backend/django_Admin3/store/migrations/0016_add_kind_values_and_subclasses.py \
       backend/django_Admin3/store/tests/test_marking_product_model.py
git commit -m "feat(store): MarkingProduct MTI subclass + combined Phase 1 migration

Phase 1 of Product MTI specialization. The migration:
  - Extends Purchasable.Kind choices with MATERIAL/TUTORIAL/MARKING
  - Creates acted.material_products, acted.tutorial_products,
    acted.marking_products as MTI subclasses of store.Product
  - Each subclass shares its PK with the parent Product row

Empty tables — Phase 2 backfills from existing Product rows."
```

---

## Task 7: Phase 1 integration verification

**Files:** (read-only verification)

This task runs the full Phase 1 verification matrix from the design doc (§7.1) before declaring Phase 1 complete.

- [ ] **Step 7.1: Schema placement audit**

Confirm the four new tables live in the `acted` schema:

```bash
python manage.py dbshell -- -c "\dt acted.material_products acted.tutorial_products acted.marking_products acted.marking_templates"
```

Expected: All four tables listed.

If you get `Did not find any relation named...`, the migration didn't apply correctly. Run `python manage.py migrate` and re-check.

- [ ] **Step 7.2: No drift in `makemigrations`**

```bash
python manage.py makemigrations --check --dry-run
```

Expected output: `No changes detected`. If migrations would be generated, you've left model code inconsistent with migrations.

- [ ] **Step 7.3: Existing tests have no regressions**

```bash
python manage.py test store marking cart orders catalog catalog_products tutorials -v 1 2>&1 | tail -40
```

Expected: Full suite passes (or matches the pre-Phase-1 baseline you captured during the pre-flight). Any new failure is a regression and must be investigated before merging Phase 1.

If you see unrelated pre-existing flakes (e.g., from concurrent dev work), document them in the PR description but don't block on fixes.

- [ ] **Step 7.4: MTI shape sanity check via Django shell**

```bash
python manage.py shell <<'PYEOF'
from store.models import (
    Purchasable, Product, MaterialProduct, TutorialProduct, MarkingProduct,
)
from marking.models import MarkingTemplate

# 1. Subclass chain
assert issubclass(MaterialProduct, Product)
assert issubclass(TutorialProduct, Product)
assert issubclass(MarkingProduct, Product)
assert issubclass(Product, Purchasable)

# 2. Empty tables
assert MaterialProduct.objects.count() == 0, "Phase 1 must leave subclass tables empty"
assert TutorialProduct.objects.count() == 0
assert MarkingProduct.objects.count() == 0
assert MarkingTemplate.objects.count() == 0

# 3. Kind enum has the new values alongside the legacy one
kinds = {k.value for k in Purchasable.Kind}
assert {'material', 'tutorial', 'marking', 'product'} <= kinds, kinds

# 4. Existing Purchasable rows still have kind='product' (no Phase 2 yet)
legacy_count = Purchasable.objects.filter(kind='product').count()
total_count = Product.objects.count()
assert legacy_count == total_count, f"{legacy_count} vs {total_count}"

print("Phase 1 sanity check: OK")
PYEOF
```

Expected: `Phase 1 sanity check: OK` and exit code 0. Any `AssertionError` means a Phase 1 invariant was violated.

- [ ] **Step 7.5: Open a PR**

The branch should be `feat/20260513-product-mti-specialization` (already created during brainstorming, per CLAUDE.md branch naming).

```bash
git push -u origin feat/20260513-product-mti-specialization
gh pr create --base main --head feat/20260513-product-mti-specialization \
  --title "feat(store): Phase 1 — Product MTI specialization schema additions" \
  --body "Implements Phase 1 of [Product MTI specialization design](docs/superpowers/specs/2026-05-13-product-mti-specialization-design.md).

## What changes

- Adds three new MTI subclass tables: \`acted.material_products\`, \`acted.tutorial_products\`, \`acted.marking_products\`.
- Adds \`acted.marking_templates\` (exam-session-agnostic marking series).
- Adds nullable \`MarkingPaper.marking_template\` FK.
- Extends \`Purchasable.Kind\` with \`MATERIAL\`, \`TUTORIAL\`, \`MARKING\` (legacy \`PRODUCT\` retained).

## What does NOT change

- No data movement (subclass tables ship empty).
- No consumer code changes (filtering, cart, orders, tutorials, marking app reads remain on \`store.Product\`).
- No removal of \`'product'\` Kind value (happens in Phase 4e).

## Rollback

Reverse the two migrations:
\`\`\`bash
python manage.py migrate store 0015_ensure_fee_generic_exists
python manage.py migrate marking 0016_submission_unique_with_voucher
\`\`\`

## Verification matrix

- ✅ Tables in \`acted\` schema
- ✅ \`makemigrations --check\` clean
- ✅ Full \`store marking cart orders catalog tutorials\` suite passes
- ✅ MTI sanity check (Task 7.4) green

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```

- [ ] **Step 7.6: Announce next phase**

After PR merge, the next deliverable is **Phase 2: Backfill** — a new plan to be authored at that point. The Phase 2 plan covers:

1. `MarkingTemplate` seeding from `catalog_products.Product` rows referenced by marking PPVs.
2. The `split_products_by_kind` management command with `--dry-run` / `--check` / `--commit` modes.
3. Tutorial format mapping audit (see design §8 Risk #1).
4. Phase 2 verification (idempotency, invariant, code preservation tests).

Do not start Phase 2 implementation in this PR.

---

## Notes for the implementer

### Why Phase 1 is small on purpose

Every prior MTI migration in this codebase (Phases A, the existing `store.Product → Purchasable` conversion in [store/migrations/0010_product_to_mti_subclass.py](backend/django_Admin3/store/migrations/0010_product_to_mti_subclass.py)) followed the same shape: schema-first, no data, no consumer changes. This makes Phase 1 trivially reversible and lets reviewers focus on schema correctness only.

### MTI shared PK is non-negotiable

If any of the auto-generated `CreateModel` operations in Task 6.5 are missing `bases=('store.product',)` or the `product_ptr` parent_link OneToOneField, the migration is malformed — stop and regenerate. Without shared PK, Phase 2 cannot preserve cart/order FK integrity.

### `verify_schema_placement` referenced in CLAUDE.md

CLAUDE.md mentions `python manage.py verify_schema_placement`. A grep of the codebase finds no such management command actually defined — only a stale reference in `test_report_20260223.txt`. We use the equivalent `_meta.db_table` assertions inside tests (per the existing pattern in [backend/django_Admin3/store/tests/test_models.py](backend/django_Admin3/store/tests/test_models.py)) and the direct `\dt` query in Step 7.1. If a future task adds the command, it can replace these checks.

### TDD discipline

Each task's `Step .1` writes the test, `Step .2` confirms RED, then implementation steps drive GREEN. Don't skip the RED confirmation — it's how you know the test actually exercises the code path.
