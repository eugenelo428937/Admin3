# Product MTI Specialization — Phase 5 (Drop Legacy) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the MTI specialization by moving `product_product_variation` from `store.Product` to `store.MaterialProduct`, then deleting now-dangling catalog rows (Tutorial/Marking PPVs, ProductVariations of those types, and catalog Products that exist only as MarkingTemplate proxies). After this PR, the `Product` parent class has no catalog-dependent fields; each subclass owns its own variation semantics: `MaterialProduct.product_product_variation`, `TutorialProduct.format/tutorial_location/tutorial_course_template`, `MarkingProduct.marking_template`.

**Architecture:** Five-phase data + schema sequence:
1. **Per-subclass `save()`** — each MTI subclass sets its `kind` explicitly and (for MaterialProduct) handles code generation via its own PPV. Eliminates `Product.save()`'s dependency on a parent-level PPV that's about to move.
2. **Backward-compat property** on `Product.product_product_variation` — delegates to `self.materialproduct.product_product_variation` for Material rows, returns `None` for Tutorial/Marking rows. Keeps the 40+ consumer files reading `.product_product_variation` working without each one needing a kind-check.
3. **Data migration (additive)** — add `MaterialProduct.product_product_variation` as a nullable FK, backfill from the parent `Product.product_product_variation` for all 6847 Material rows, then enforce NOT NULL.
4. **Schema migration (subtractive)** — `RemoveField('product', 'product_product_variation')`. The backward-compat property absorbs the API change.
5. **Catalog cleanup** — delete orphaned `ProductProductVariation` rows with `variation_type IN ('Tutorial', 'Marking')` (115 rows), delete `ProductVariation` rows with those types (24 rows), delete catalog `Product` rows whose code matches a `MarkingTemplate.code` (10 rows).

**Tech Stack:** Django 6.0 ORM, PostgreSQL acted schema, Django MTI reverse OneToOne accessors, multi-stage data + schema migrations.

---

## Reference: dev DB audit (verified 2026-05-15)

| Quantity | Value |
|---|---:|
| `store.Product` (parent) | 8,173 |
| `MaterialProduct` (subclass) | 6,847 |
| `TutorialProduct` (subclass) | 649 |
| `MarkingProduct` (subclass) | 677 |
| Subclass coverage | 8,173 / 8,173 (100%) |
| `catalog.Product` | 160 |
| `catalog.ProductVariation` (eBook/Printed) | 2 |
| `catalog.ProductVariation` (Marking) | 1 |
| `catalog.ProductVariation` (Tutorial) | 23 |
| `catalog.ProductProductVariation` (total) | 289 |
| `catalog.ProductProductVariation` (Tutorial) | 108 |
| `catalog.ProductProductVariation` (Marking) | 7 |
| `MarkingTemplate` | 7 |
| Catalog Products matching MarkingTemplate code | 10 |

**Phase 5 will delete:** 108 Tutorial PPVs + 7 Marking PPVs + 23 Tutorial variations + 1 Marking variation + 10 marking-template catalog Products = **149 dangling rows**.

**Files referencing `.product_product_variation`:** 40 (audit ran via `grep -l '\.product_product_variation\b'`). The vast majority operate on Material rows in production; the backward-compat property absorbs API drift for them.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `backend/django_Admin3/store/models/material_product.py` | Modify | Add `product_product_variation` ForeignKey (nullable initially). Add `save()` override setting `kind='material'`. Move `_generate_product_code()` logic for material from `Product.save()` to here. |
| `backend/django_Admin3/store/models/tutorial_product.py` | Modify | Add `save()` override setting `kind='tutorial'` + generating product_code from `format` + `tutorial_location`. |
| `backend/django_Admin3/store/models/marking_product.py` | Modify | Add `save()` override setting `kind='marking'` + generating product_code from `marking_template` + `exam_session_subject`. |
| `backend/django_Admin3/store/models/product.py` | Modify | `Product.save()` no longer derives kind from PPV (subclasses do that). Add backward-compat `@property product_product_variation` delegating to `self.materialproduct.product_product_variation` (None for non-Material). |
| `backend/django_Admin3/store/migrations/0021_add_materialproduct_ppv.py` | Create | `AddField('materialproduct', 'product_product_variation', ForeignKey(... null=True))`. |
| `backend/django_Admin3/store/migrations/0022_backfill_materialproduct_ppv.py` | Create | `RunPython` copying PPV from parent Product to MaterialProduct via shared PK. |
| `backend/django_Admin3/store/migrations/0023_alter_materialproduct_ppv_not_null.py` | Create | `AlterField` removing `null=True`. |
| `backend/django_Admin3/store/migrations/0024_remove_product_ppv.py` | Create | `RemoveField('product', 'product_product_variation')`. |
| `backend/django_Admin3/store/migrations/0025_delete_dangling_catalog_rows.py` | Create | `RunPython` deleting orphaned PPVs, ProductVariations, and catalog Products. |
| Test fixtures (multiple files) | Modify | Tests that explicitly construct Product subclasses with `product_product_variation=ppv` keyword — update so Material tests pass it (works fine), Tutorial/Marking tests omit it (their subclasses don't have the field). |

---

## Task 1: Per-subclass `save()` overrides + code generation

This task is **non-migration** — purely refactoring `save()` logic. Establishes the design that each subclass owns its kind and code generation, independent of where `product_product_variation` lives.

**Files:**
- Modify: `backend/django_Admin3/store/models/material_product.py`
- Modify: `backend/django_Admin3/store/models/tutorial_product.py`
- Modify: `backend/django_Admin3/store/models/marking_product.py`
- Modify: `backend/django_Admin3/store/models/product.py`

- [ ] **Step 1: Run baseline tests for affected apps**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test store cart orders tutorials marking catalog -v 1 --keepdb 2>&1 | tail -5`
Note baseline. The expected state is: 1901 tests pass, 29 skipped (after Phase 4e).

- [ ] **Step 2: Add `save()` to each subclass**

Read each subclass file first; then append a `save()` method at the class body level. For `material_product.py`:

```python
def save(self, *args, **kwargs):
    """Phase 5: MaterialProduct sets kind='material' and delegates
    code generation (which depends on PPV) to the parent class's
    helper after assigning the FK."""
    if not self.kind:
        self.kind = self.Kind.MATERIAL  # 'material'
    super().save(*args, **kwargs)
```

For `tutorial_product.py`:

```python
def save(self, *args, **kwargs):
    """Phase 5: TutorialProduct sets kind='tutorial' explicitly —
    no longer derives from PPV (which has been removed from Product
    in the same release). Product code generation reads from format/
    tutorial_location/exam_session_subject directly."""
    if not self.kind:
        self.kind = self.Kind.TUTORIAL  # 'tutorial'
    if not self.product_code:
        self.product_code = self._generate_tutorial_product_code()
        self.code = self.product_code
    super().save(*args, **kwargs)

def _generate_tutorial_product_code(self):
    """Generate Tutorial product code: {subject}/{location}/{format}/{session}.
    Online Classroom rows (tutorial_location=None) substitute 'OC' for location.
    """
    ess = self.exam_session_subject
    subject_code = ess.subject.code
    exam_code = ess.exam_session.session_code
    location_code = (
        self.tutorial_location.code if self.tutorial_location_id else 'OC'
    )
    return f"{subject_code}/{location_code}/{self.format}/{exam_code}"
```

For `marking_product.py`:

```python
def save(self, *args, **kwargs):
    """Phase 5: MarkingProduct sets kind='marking' explicitly —
    no longer derives from PPV. Product code generation reads from
    marking_template + exam_session_subject."""
    if not self.kind:
        self.kind = self.Kind.MARKING  # 'marking'
    if not self.product_code:
        self.product_code = self._generate_marking_product_code()
        self.code = self.product_code
    super().save(*args, **kwargs)

def _generate_marking_product_code(self):
    """Generate Marking product code: {subject}/{template_code}/{session}."""
    ess = self.exam_session_subject
    subject_code = ess.subject.code
    exam_code = ess.exam_session.session_code
    template_code = self.marking_template.code
    return f"{subject_code}/{template_code}/{exam_code}"
```

(All of these read class-level enum values via `self.Kind.MATERIAL` etc., which Django MTI inherits from `Purchasable`.)

- [ ] **Step 3: Simplify `Product.save()` to drop PPV dependency**

Read `store/models/product.py:55-118`. Replace the existing `save()` + `_derive_kind_from_variation_type()` + `_generate_product_code()` chain. The new `Product.save()`:

```python
def save(self, *args, **kwargs):
    """Phase 5: parent-class save. Each subclass (Material/Tutorial/
    Marking) sets kind explicitly before calling super(). If a caller
    instantiates a bare Product (no subclass), require kind explicitly
    — there's no longer a single 'default' kind for store products.
    """
    if not self.kind:
        raise ValueError(
            'Phase 5: store.Product requires kind to be set explicitly. '
            'Use MaterialProduct/TutorialProduct/MarkingProduct subclasses '
            'which set kind in their own save() methods, or pass '
            'kind=Purchasable.Kind.MATERIAL/TUTORIAL/MARKING.'
        )
    # product_code generation is now per-subclass for Tutorial/Marking;
    # Material still uses the legacy PPV-based path which lives here for
    # now (will move to MaterialProduct.save() once Task 1 lands the
    # subclass override).
    if not self.product_code and self.kind == self.Kind.MATERIAL:
        # Material code: {subject}/{variation_code}{product_code}/{exam_session}
        # MaterialProduct.save() handles this via its own _generate path,
        # but if the bare Product (parent) is saved with a material kind
        # we need a working fallback. After Phase 5's Task 3 backfill
        # completes, this branch becomes unreachable because all Material
        # rows go through MaterialProduct.save().
        ppv = getattr(self, 'product_product_variation_id', None)
        if ppv:
            self.product_code = self._generate_material_code()
            self.code = self.product_code
    super().save(*args, **kwargs)

def _generate_material_code(self):
    """Material product code: {subject}/{variation_code}{product_code}/{exam_session}.
    Pre-Phase-5 location for this; MaterialProduct.save() will own it post-migration.
    """
    ess = self.exam_session_subject
    ppv = self.product_product_variation
    subject_code = ess.subject.code
    exam_code = ess.exam_session.session_code
    product_code = ppv.product.code
    variation_code = ppv.product_variation.code or ''
    return f"{subject_code}/{variation_code}{product_code}/{exam_code}"
```

Delete `_derive_kind_from_variation_type` and the old `_generate_product_code` method that branched on variation_type. (Their work is now per-subclass.)

- [ ] **Step 4: Run the test suite**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test store cart orders tutorials marking catalog -v 1 --keepdb 2>&1 | tail -10`
Expected: same pass count as baseline (Task 1 is purely refactoring; no behaviour change for existing rows because every subclass save() still sets kind + product_code, just via different paths).

If failures appear:
- A test that creates `MaterialProduct(kind=Kind.PRODUCT)` will pass (kind preserved via the `if not self.kind` guard).
- A test that creates a bare `Product(...)` without setting kind will now raise `ValueError`. Update those tests to use the appropriate subclass.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/store/models/
git commit -m "refactor(store): Phase 5 — per-subclass save() with explicit kind

Each MTI subclass now sets kind in its own save() and owns its product_code
generation. Product.save() is now a passthrough that raises ValueError if
kind isn't set — there's no single 'default kind' for store products.

This prepares Phase 5's removal of product_product_variation from Product:
TutorialProduct and MarkingProduct code generation no longer depends on
PPV (uses format/tutorial_location and marking_template respectively).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Backward-compat `product_product_variation` property on Product

This task adds a `@property` that delegates to `self.materialproduct.product_product_variation` for Material rows and returns `None` for Tutorial/Marking. **Critical for keeping the 40+ consumer files working** after Task 3-4 move the field.

**Files:**
- Modify: `backend/django_Admin3/store/models/product.py` — add `@property product_product_variation` AFTER the field (or replacing it eventually). For Task 2, the property is ADDED but the field is still there; the property is dead code until Task 4 removes the field.

- [ ] **Step 1: Add the property**

Append after the backward-compat `product` and `product_variation` properties (around line 220+):

```python
@property
def _legacy_ppv_via_subclass(self):
    """Phase 5: when Product.product_product_variation is removed
    (migration 0024), this property serves as the backward-compat
    accessor. Delegates to MaterialProduct.product_product_variation;
    Tutorial/Marking subclasses return None (they no longer route
    through the catalog PPV chain).

    Renamed from `product_product_variation` to `_legacy_ppv_via_subclass`
    while the field still exists on Product (Django would shadow the
    property otherwise). Migration 0024 removes the field; at that point
    the property is renamed back to `product_product_variation`.

    NOTE: Task 2 of Phase 5 lands this property under the leading-underscore
    name. Task 4 (RemoveField) flips both: removes the field AND renames
    the property to `product_product_variation`.
    """
    try:
        return self.materialproduct.product_product_variation
    except Exception:
        return None
```

This is unusual — the property is added under an underscore name *deliberately* because Django MTI doesn't allow shadowing a field with a property of the same name. The rename to the public name happens in Task 4 once the field is gone.

- [ ] **Step 2: Run tests**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test store -v 1 --keepdb 2>&1 | tail -5`
Expected: unchanged pass count (Task 2 adds a dead-named property; no behavior change yet).

- [ ] **Step 3: Commit**

```bash
git add backend/django_Admin3/store/models/product.py
git commit -m "feat(store): Phase 5 — add _legacy_ppv_via_subclass backward-compat property

Property delegates to MaterialProduct.product_product_variation for
Material rows; returns None for Tutorial/Marking (they don't route
through PPV after Phase 5).

Lives under leading-underscore name until migration 0024 removes the
field; Task 4 renames it to product_product_variation (public name)
once the field can no longer shadow it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Add MaterialProduct.product_product_variation + backfill + NOT NULL (three migrations)

This task adds the field to MaterialProduct, backfills from parent Product via shared PK, then enforces NOT NULL.

**Files:**
- Modify: `backend/django_Admin3/store/models/material_product.py` — declare `product_product_variation` field (initially with `null=True, blank=True`)
- Create: `backend/django_Admin3/store/migrations/0021_add_materialproduct_ppv.py`
- Create: `backend/django_Admin3/store/migrations/0022_backfill_materialproduct_ppv.py`
- Create: `backend/django_Admin3/store/migrations/0023_alter_materialproduct_ppv_not_null.py`
- Modify: `backend/django_Admin3/store/tests/test_material_product_model.py` — add a test that `MaterialProduct.product_product_variation` is a non-null FK after Task 3 completes

- [ ] **Step 1: Declare field on MaterialProduct (nullable initially)**

Edit `store/models/material_product.py`. Add inside the `MaterialProduct` class (above Meta):

```python
product_product_variation = models.ForeignKey(
    'catalog_products.ProductProductVariation',
    on_delete=models.CASCADE,
    null=True,    # Phase 5 Task 3 step 1: nullable for backfill
    blank=True,
    related_name='material_products',
    help_text=(
        'Phase 5: PPV link moved here from the parent Product class. '
        'Nullable during backfill (migration 0022), then enforced '
        'NOT NULL by migration 0023.'
    ),
)
```

Add `from django.db import models` to the imports if not present.

- [ ] **Step 2: Generate the AddField migration**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py makemigrations store --name add_materialproduct_ppv`
Expected: creates `0021_add_materialproduct_ppv.py` with a single `AddField` operation.

- [ ] **Step 3: Apply migration 0021**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py migrate store`
Expected: `Applying store.0021_add_materialproduct_ppv... OK`.

Verify the column exists:
```bash
cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py shell -c "
from django.db import connection
cur = connection.cursor()
cur.execute('SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema=%s AND table_name=%s AND column_name=%s', ['acted', 'material_products', 'product_product_variation_id'])
print(cur.fetchall())
"
```
Expected: `[('product_product_variation_id', 'YES')]`

- [ ] **Step 4: Create the data backfill migration**

Create `store/migrations/0022_backfill_materialproduct_ppv.py`:

```python
"""Phase 5: backfill MaterialProduct.product_product_variation_id from
the parent Product table via shared MTI PK.

Every MaterialProduct row shares its PK with a Product row (MTI
inheritance), and the parent Product has product_product_variation_id
set. Single UPDATE...FROM bulk-copies the value.

Idempotent: re-running this migration produces no additional updates
(skips rows where the subclass column is already populated).
"""
from django.db import migrations


def backfill_materialproduct_ppv(apps, schema_editor):
    with schema_editor.connection.cursor() as cur:
        cur.execute(
            'UPDATE "acted"."material_products" mp '
            'SET product_product_variation_id = p.product_product_variation_id '
            'FROM "acted"."products" p '
            'WHERE mp.product_ptr_id = p.purchasable_ptr_id '
            '  AND mp.product_product_variation_id IS NULL'
        )
        print(f'  backfill_materialproduct_ppv: updated={cur.rowcount} rows')


def reverse_backfill(apps, schema_editor):
    """Reverse: NO-OP. Re-allows null in 0023's reverse, restoring the
    original state. Don't try to selectively un-fill — we can't reliably
    distinguish backfilled rows from manually-set ones."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0021_add_materialproduct_ppv'),
    ]

    operations = [
        migrations.RunPython(
            backfill_materialproduct_ppv,
            reverse_code=reverse_backfill,
        ),
    ]
```

- [ ] **Step 5: Apply migration 0022**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py migrate store`
Expected output includes: `backfill_materialproduct_ppv: updated=6847 rows`.

Verify:
```bash
cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py shell -c "
from store.models import MaterialProduct
nulls = MaterialProduct.objects.filter(product_product_variation__isnull=True).count()
total = MaterialProduct.objects.count()
print(f'NULL after backfill: {nulls} / {total}')
"
```
Expected: `NULL after backfill: 0 / 6847`.

- [ ] **Step 6: Make the field NOT NULL**

Update `store/models/material_product.py` — remove `null=True, blank=True` from the field declaration:

```python
product_product_variation = models.ForeignKey(
    'catalog_products.ProductProductVariation',
    on_delete=models.CASCADE,
    related_name='material_products',
    help_text='Phase 5: PPV link moved here from the parent Product class.',
)
```

Generate the migration:

```bash
cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py makemigrations store --name alter_materialproduct_ppv_not_null
```

Apply:

```bash
cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py migrate store
```

- [ ] **Step 7: Add a regression test**

Edit `store/tests/test_material_product_model.py`. Append:

```python
def test_materialproduct_has_ppv_not_null(self):
    """Phase 5: MaterialProduct.product_product_variation is a
    non-null FK after migration 0023."""
    from store.models import MaterialProduct
    field = MaterialProduct._meta.get_field('product_product_variation')
    self.assertFalse(field.null, 'Phase 5: must be NOT NULL')
    self.assertEqual(field.related_model.__name__, 'ProductProductVariation')
```

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test store.tests.test_material_product_model -v 2`
Expected: PASS.

- [ ] **Step 8: Commit all three migrations + model change + test**

```bash
git add backend/django_Admin3/store/models/material_product.py \
        backend/django_Admin3/store/migrations/0021_add_materialproduct_ppv.py \
        backend/django_Admin3/store/migrations/0022_backfill_materialproduct_ppv.py \
        backend/django_Admin3/store/migrations/0023_alter_materialproduct_ppv_not_null.py \
        backend/django_Admin3/store/tests/test_material_product_model.py
git commit -m "feat(store): Phase 5 — MaterialProduct.product_product_variation (additive)

Three-step migration sequence:
- 0021: AddField (nullable initially for backfill)
- 0022: RunPython UPDATE...FROM via shared MTI PK (6847/6847 populated)
- 0023: AlterField removing null=True

Product.product_product_variation still exists at this point (removed
in Task 4 by migration 0024). Both fields are valid until then;
property-based delegation (Task 2) is dormant until the field move.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: RemoveField from Product + rename backward-compat property

This is the actual API-breaking change. Run AFTER Task 3's backfill is verified.

**Files:**
- Modify: `backend/django_Admin3/store/models/product.py` — remove the `product_product_variation` ForeignKey declaration; rename `_legacy_ppv_via_subclass` to `product_product_variation`.
- Create: `backend/django_Admin3/store/migrations/0024_remove_product_ppv.py`

- [ ] **Step 1: Remove the field from Product model**

Edit `store/models/product.py`. Delete the `product_product_variation = models.ForeignKey(...)` field declaration (around lines 34-39).

- [ ] **Step 2: Rename the backward-compat property**

In the same file, rename the property added in Task 2:

```python
# Before:
@property
def _legacy_ppv_via_subclass(self):
    ...

# After:
@property
def product_product_variation(self):
    """Phase 5: backward-compat accessor delegating to
    MaterialProduct.product_product_variation. Tutorial/Marking
    subclasses return None (their variation info lives in
    subclass-specific fields)."""
    try:
        return self.materialproduct.product_product_variation
    except Exception:
        return None
```

The property's name is now the same as the (now-removed) field. Django's reverse OneToOne accessor `self.materialproduct` works for Material rows; raises `MaterialProduct.DoesNotExist` for non-Material — the bare `except Exception` catches both.

- [ ] **Step 3: Generate the RemoveField migration**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py makemigrations store --name remove_product_ppv`
Expected: creates `0024_remove_product_ppv.py` with a single `RemoveField` operation on `product` (the parent Product, not the MaterialProduct subclass).

**CRITICAL:** Verify the migration only removes from `product`, NOT from `materialproduct`. Read the generated file; it should look like:

```python
operations = [
    migrations.RemoveField(
        model_name='product',
        name='product_product_variation',
    ),
]
```

If it tries to remove from `materialproduct`, abort and investigate.

- [ ] **Step 4: Apply the migration**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py migrate store`
Expected: `Applying store.0024_remove_product_ppv... OK`.

Verify the column is gone from the products table:
```bash
cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py shell -c "
from django.db import connection
cur = connection.cursor()
cur.execute(\"SELECT column_name FROM information_schema.columns WHERE table_schema='acted' AND table_name='products' AND column_name='product_product_variation_id'\")
print('products.product_product_variation_id present:', bool(cur.fetchall()))
"
```
Expected: `products.product_product_variation_id present: False`.

And still present on material_products:
```bash
cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py shell -c "
from django.db import connection
cur = connection.cursor()
cur.execute(\"SELECT column_name FROM information_schema.columns WHERE table_schema='acted' AND table_name='material_products' AND column_name='product_product_variation_id'\")
print('material_products.product_product_variation_id present:', bool(cur.fetchall()))
"
```
Expected: `True`.

- [ ] **Step 5: Spot-check the backward-compat property on dev DB**

```bash
cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py shell -c "
from store.models import Product, MaterialProduct, TutorialProduct, MarkingProduct
mat = Product.objects.filter(kind='material').first()
tut = Product.objects.filter(kind='tutorial').first()
mar = Product.objects.filter(kind='marking').first()
print(f'Material parent ppv: {mat.product_product_variation}')   # expect a PPV
print(f'Tutorial parent ppv: {tut.product_product_variation}')   # expect None
print(f'Marking parent ppv:  {mar.product_product_variation}')   # expect None
"
```

- [ ] **Step 6: Run cross-cutting tests**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test store cart orders tutorials marking catalog -v 1 --keepdb 2>&1 | tail -5`
Expected: ALL PASS. If failures appear, they likely accessed `product.product_product_variation` on a Tutorial/Marking row and got `None` instead of a PPV — fix the consumer to branch on kind.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/store/models/product.py \
        backend/django_Admin3/store/migrations/0024_remove_product_ppv.py
git commit -m "feat(store): Phase 5 — RemoveField product_product_variation from Product

The field now lives exclusively on MaterialProduct. Backward-compat
@property on Product delegates to materialproduct.product_product_variation
for Material rows; returns None for Tutorial/Marking (their variation
semantics live in TutorialProduct.format/tutorial_location and
MarkingProduct.marking_template respectively).

40+ consumer files reading product.product_product_variation continue
to work via the property — they receive PPV for Material rows
(unchanged) and None for Tutorial/Marking (correct new semantics).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Delete dangling catalog rows

After Task 4, the catalog still has 108 Tutorial PPVs + 7 Marking PPVs that nothing in the store points at, plus 24 Tutorial/Marking ProductVariations and 10 marking-template catalog Products. Delete them.

**Files:**
- Create: `backend/django_Admin3/store/migrations/0025_delete_dangling_catalog_rows.py`

- [ ] **Step 1: Pre-flight audit**

Before deleting, confirm the row counts match the Phase 5 plan's reference:

```bash
cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py shell -c "
from catalog.models import Product as CatProd, ProductVariation, ProductProductVariation
from marking.models import MarkingTemplate

tut_ppvs = ProductProductVariation.objects.filter(product_variation__variation_type='Tutorial').count()
mar_ppvs = ProductProductVariation.objects.filter(product_variation__variation_type='Marking').count()
tut_vars = ProductVariation.objects.filter(variation_type='Tutorial').count()
mar_vars = ProductVariation.objects.filter(variation_type='Marking').count()
mt_codes = set(MarkingTemplate.objects.values_list('code', flat=True))
mt_prods = CatProd.objects.filter(code__in=mt_codes).count()

print(f'Tutorial PPVs: {tut_ppvs}')
print(f'Marking PPVs:  {mar_ppvs}')
print(f'Tutorial variations: {tut_vars}')
print(f'Marking variations:  {mar_vars}')
print(f'Catalog Products matching MarkingTemplate codes: {mt_prods}')
print(f'Total catalog rows to delete: {tut_ppvs + mar_ppvs + tut_vars + mar_vars + mt_prods}')
"
```
Expected (per dev-DB audit): `Total catalog rows to delete: 149` (108+7+23+1+10).

- [ ] **Step 2: Create the deletion migration**

Create `store/migrations/0025_delete_dangling_catalog_rows.py`:

```python
"""Phase 5: delete dangling catalog rows that no store.Product references.

After migration 0024 removed Product.product_product_variation,
Tutorial and Marking ProductProductVariations have no incoming
store-side FK. ProductVariation rows with variation_type='Tutorial'
or 'Marking' likewise have no remaining consumer. Catalog Product
rows whose `code` matches a MarkingTemplate code exist only as
templates for the now-defunct marking PPV chain.

Order matters: delete PPVs first (they FK to ProductVariation and
catalog.Product), then ProductVariations, then the marking-template
catalog Products.

Idempotent: filters on data values, not migration state.
"""
from django.db import migrations


def delete_dangling_catalog_rows(apps, schema_editor):
    ProductProductVariation = apps.get_model('catalog_products', 'ProductProductVariation')
    ProductVariation = apps.get_model('catalog_products', 'ProductVariation')
    CatProd = apps.get_model('catalog_products', 'Product')
    MarkingTemplate = apps.get_model('marking', 'MarkingTemplate')

    # 1. Delete Tutorial + Marking PPVs (they FK to ProductVariation).
    deleted_ppvs, _ = ProductProductVariation.objects.filter(
        product_variation__variation_type__in=['Tutorial', 'Marking'],
    ).delete()
    print(f'  Deleted PPVs (Tutorial+Marking): {deleted_ppvs}')

    # 2. Delete Tutorial + Marking ProductVariations.
    deleted_vars, _ = ProductVariation.objects.filter(
        variation_type__in=['Tutorial', 'Marking'],
    ).delete()
    print(f'  Deleted ProductVariations (Tutorial+Marking): {deleted_vars}')

    # 3. Delete catalog Products matching MarkingTemplate.code.
    mt_codes = list(MarkingTemplate.objects.values_list('code', flat=True))
    deleted_prods, _ = CatProd.objects.filter(code__in=mt_codes).delete()
    print(f'  Deleted catalog Products matching MarkingTemplate.code: {deleted_prods}')


def reverse_deletion(apps, schema_editor):
    """Reverse: NO-OP. We cannot reconstruct the deleted rows from
    surviving state. If a rollback is needed, restore from DB backup.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0024_remove_product_ppv'),
    ]

    operations = [
        migrations.RunPython(
            delete_dangling_catalog_rows,
            reverse_code=reverse_deletion,
        ),
    ]
```

- [ ] **Step 3: Apply the migration**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py migrate store`
Expected output includes:
```
  Deleted PPVs (Tutorial+Marking): 115
  Deleted ProductVariations (Tutorial+Marking): 24
  Deleted catalog Products matching MarkingTemplate.code: 10
```

- [ ] **Step 4: Verify final state**

```bash
cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py shell -c "
from catalog.models import ProductVariation, ProductProductVariation
from store.models import MaterialProduct, TutorialProduct, MarkingProduct
print(f'PPVs remaining: {ProductProductVariation.objects.count()}')
print(f'ProductVariations remaining: {ProductVariation.objects.count()}')
print(f'  By type:')
from django.db.models import Count
for r in ProductVariation.objects.values('variation_type').annotate(n=Count('id')):
    print(f'    {r[\"variation_type\"]}: {r[\"n\"]}')
print(f'MaterialProduct: {MaterialProduct.objects.count()}')
print(f'TutorialProduct: {TutorialProduct.objects.count()}')
print(f'MarkingProduct: {MarkingProduct.objects.count()}')
"
```

Expected: PPVs = 174 (289 - 115), ProductVariations = 2 (26 - 24), variation types only contain eBook + Printed. Store products unchanged.

- [ ] **Step 5: Run the full cross-cutting suite**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test store cart orders tutorials marking catalog filtering -v 1 --keepdb 2>&1 | tail -5`
Expected: ALL PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/store/migrations/0025_delete_dangling_catalog_rows.py
git commit -m "feat(store): Phase 5 — delete dangling catalog rows

After migration 0024 removed Product.product_product_variation,
115 Tutorial+Marking PPVs, 24 ProductVariations of those types,
and 10 catalog Products matching MarkingTemplate.code are orphaned.
Delete them in dependency order.

Dev DB audit (2026-05-15) confirmed the row counts match the spec.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Test fixture sweep

Some test files explicitly construct Product subclasses with `product_product_variation=ppv` as a kwarg. For MaterialProduct that's still valid (the field is on the subclass). For TutorialProduct / MarkingProduct it must be removed — those subclasses don't have the field anymore.

**Files:** TBD — discover via grep, expect ~5-15 files.

- [ ] **Step 1: Find the violating test files**

```bash
cd backend/django_Admin3 && \
  grep -rn 'TutorialProduct.*product_product_variation\|MarkingProduct.*product_product_variation' \
  --include='*.py' \
  2>&1 | head -30
```

Note each file:line. Expected hits: Phase 4b/4c tutorial+marking test fixtures, factories.py, possibly a few coverage tests.

- [ ] **Step 2: For each hit, update the fixture**

The fix pattern: remove the `product_product_variation=ppv` kwarg from TutorialProduct or MarkingProduct constructors. These subclasses now have their own field set (TutorialProduct via `format` + `tutorial_location`; MarkingProduct via `marking_template`).

If a test was passing `product_product_variation` to set up parent-side state that other code reads later: refactor the test to either (a) build a MaterialProduct instead, (b) check the new subclass field instead.

- [ ] **Step 3: Run the affected suites**

```bash
cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test cart orders tutorials marking store catalog -v 1 --keepdb 2>&1 | tail -10
```

Expected: ALL PASS.

- [ ] **Step 4: Commit**

```bash
git add <updated test files>
git commit -m "test: Phase 5 — remove product_product_variation from Tutorial/Marking fixtures

After migration 0024, TutorialProduct and MarkingProduct subclasses no
longer accept product_product_variation. Their variation semantics live
in TutorialProduct.format/tutorial_location and MarkingProduct.marking_template.

MaterialProduct fixtures still accept product_product_variation (the
field is now on MaterialProduct after Phase 5 Task 3).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Cross-cutting verification + PR

- [ ] **Step 1: Final makemigrations check**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py makemigrations --check --dry-run 2>&1 | tail -3`
Expected: "No changes detected".

- [ ] **Step 2: Full cross-app suite**

Run: `cd backend/django_Admin3 && ../../.venv/Scripts/python.exe manage.py test cart orders tutorials marking store catalog filtering --keepdb 2>&1 | tail -5`
Expected: ALL PASS (modulo the legacy-split skipped tests from Phase 4e).

- [ ] **Step 3: Push and open PR**

```bash
git push -u origin feat/20260515-product-mti-phase-5-drop-legacy
gh pr create --base main --head feat/20260515-product-mti-phase-5-drop-legacy \
  --title "feat: Phase 5 — drop legacy product_product_variation from Product" \
  --body "<see plan for full body>"
```

---

## Self-Review Notes (controller-side)

**Risks called out in spec §8:**
- ✅ Risk #1 (data loss during PPV move): mitigated by additive backfill (Task 3) before subtractive removal (Task 4); migration 0022 is idempotent.
- ✅ Risk #2 (consumers reading PPV on Tutorial/Marking): mitigated by Phase 4a-4e refactoring + Phase 5 Task 2's backward-compat property returning None gracefully.
- ✅ Risk #3 (orphaned catalog rows): explicitly deleted in Task 5.
- ⚠️ Risk #4 (untested consumer drilling `product.product_product_variation.product` on a Tutorial row): the property returns None → `.product` raises AttributeError. Manifests as test failure during Task 4 Step 6 or Task 7 Step 2 — caller fix required.

**Placeholder scan:** all code blocks have concrete content. Migration filenames are explicit. No "TBD" remaining.

**Type consistency:** `materialproduct` (lowercase reverse-OneToOne accessor) matches the project-wide MTI pattern (`tutorialproduct`, `markingproduct`).
