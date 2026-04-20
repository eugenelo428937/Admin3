# Purchasable Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a unified `store.Purchasable` parent table so non-ESS catalog items (Marking Vouchers, Document Binders, Additional Charges) coexist with ESS-based `store.Product`. Replace polymorphic nullable FKs on cart/order lines with a single `purchasable` FK. Add `IssuedVoucher` for per-unit voucher tracking.

**Architecture:** Django multi-table inheritance: `Purchasable` is the parent, `Product` and `GenericItem` are subclasses sharing PKs with the parent. `store.Price` FK moves from `Product` to `Purchasable`. `cart.CartItem` / `orders.OrderItem` get a single non-null `purchasable` FK; legacy fields removed in a second release after soak. Voucher instances live in `marking_vouchers.IssuedVoucher` with per-unit expiry.

**Tech Stack:** Python 3.14, Django 6.0, DRF, PostgreSQL (schema `acted`), psycopg2-binary. TDD per project standard (≥80% coverage). All tables double-quoted `"acted"."name"` per schema convention.

**Spec:** `specs/20260420-purchasable-unification/spec.md`

**Release phasing:**
- **Release A** — Tasks 1–21 (additive + backfill + backward-compat shims). Non-destructive; rollback-safe.
- **Release B** — Tasks 22–24 (destructive cleanup). Ships only after Release A soaks on staging with production-shaped data for at least one business day.

---

## File Structure

```
backend/django_Admin3/
├── store/
│   ├── models/
│   │   ├── __init__.py                    [MODIFY — export new models]
│   │   ├── purchasable.py                 [NEW — parent model]
│   │   ├── generic_item.py                [NEW — MTI subclass]
│   │   ├── product.py                     [MODIFY — becomes MTI subclass]
│   │   └── price.py                       [MODIFY — FK to Purchasable]
│   ├── migrations/
│   │   ├── 0004_create_purchasable.py     [NEW — Release A]
│   │   ├── 0005_create_generic_item.py    [NEW — Release A]
│   │   ├── 0006_price_add_purchasable_fk.py  [NEW — Release A]
│   │   ├── 0007_backfill_purchasable_from_products.py  [NEW — Release A, RunPython]
│   │   ├── 0008_backfill_purchasable_from_vouchers.py  [NEW — Release A, RunPython]
│   │   ├── 0009_create_fee_generic_purchasable.py      [NEW — Release A, RunPython]
│   │   ├── 0010_product_to_mti_subclass.py             [NEW — Release A, SeparateDatabaseAndState]
│   │   ├── 0011_price_backfill_purchasable.py          [NEW — Release A, RunPython]
│   │   ├── 0012_price_drop_legacy_product_fk.py        [NEW — Release B]
│   │   └── 0013_price_purchasable_not_null.py          [NEW — Release B]
│   ├── tests/
│   │   ├── test_purchasable.py            [NEW]
│   │   ├── test_generic_item.py           [NEW]
│   │   └── test_product_mti.py            [NEW]
│   └── admin.py                           [MODIFY — register new models]
│
├── cart/
│   ├── models/
│   │   └── cart_item.py                   [MODIFY — add purchasable FK + shims]
│   ├── migrations/
│   │   ├── 0004_cart_item_add_purchasable_fk.py   [NEW — Release A]
│   │   ├── 0005_cart_item_backfill_purchasable.py [NEW — Release A, RunPython]
│   │   ├── 0006_cart_item_purchasable_not_null.py [NEW — Release B]
│   │   └── 0007_cart_item_drop_legacy_fks.py      [NEW — Release B]
│   ├── tests/
│   │   └── test_cart_item.py              [MODIFY]
│   └── serializers.py                     [MODIFY — expose purchasable]
│
├── orders/
│   ├── models/
│   │   └── order_item.py                  [MODIFY — add purchasable FK + shims]
│   ├── migrations/
│   │   ├── 0004_order_item_add_purchasable_fk.py   [NEW — Release A]
│   │   ├── 0005_order_item_backfill_purchasable.py [NEW — Release A, RunPython]
│   │   ├── 0006_order_item_backfill_issued_vouchers.py [NEW — Release A, RunPython]
│   │   ├── 0007_order_item_purchasable_not_null.py [NEW — Release B]
│   │   └── 0008_order_item_drop_legacy_fks.py      [NEW — Release B]
│   ├── tests/
│   │   └── test_order_item.py             [MODIFY]
│   └── serializers.py                     [MODIFY — expose purchasable]
│
└── marking_vouchers/
    ├── models/
    │   ├── __init__.py                    [NEW — package init]
    │   └── issued_voucher.py              [NEW — IssuedVoucher model]
    ├── services/
    │   ├── __init__.py                    [NEW]
    │   └── voucher_service.py             [NEW — issuance, expiry, cancellation]
    ├── migrations/
    │   ├── 0003_create_issued_voucher.py  [NEW — Release A]
    │   └── 0004_drop_marking_voucher.py   [NEW — Release B]
    ├── tests/
    │   ├── test_issued_voucher.py         [NEW]
    │   └── test_voucher_service.py        [NEW]
    └── admin.py                           [MODIFY — register IssuedVoucher]
```

---

# Release A — Additive + Backfill

## Task 1: Create `store.Purchasable` model

**Files:**
- Create: `backend/django_Admin3/store/models/purchasable.py`
- Create: `backend/django_Admin3/store/tests/test_purchasable.py`

- [ ] **Step 1: Write the failing test**

Create `backend/django_Admin3/store/tests/test_purchasable.py`:

```python
"""Tests for store.Purchasable — the unified catalog parent."""
from django.db import IntegrityError
from django.test import TestCase
from store.models import Purchasable


class PurchasableModelTests(TestCase):
    def test_create_minimum_fields(self):
        obj = Purchasable.objects.create(
            kind='marking_voucher',
            code='MV-STD-01',
            name='Standard Marking Voucher',
        )
        self.assertEqual(obj.kind, 'marking_voucher')
        self.assertEqual(obj.code, 'MV-STD-01')
        self.assertTrue(obj.is_active)
        self.assertFalse(obj.dynamic_pricing)

    def test_code_is_unique(self):
        Purchasable.objects.create(kind='product', code='DUPE', name='First')
        with self.assertRaises(IntegrityError):
            Purchasable.objects.create(kind='marking_voucher', code='DUPE', name='Second')

    def test_kind_choices_enforced(self):
        obj = Purchasable(kind='banana', code='X', name='X')
        with self.assertRaises(Exception):
            obj.full_clean()

    def test_dynamic_pricing_default_false(self):
        obj = Purchasable.objects.create(kind='document_binder', code='DB-1', name='Binder')
        self.assertFalse(obj.dynamic_pricing)

    def test_str(self):
        obj = Purchasable.objects.create(kind='product', code='ABC', name='Thing')
        self.assertIn('ABC', str(obj))

    def test_db_table_in_acted_schema(self):
        self.assertEqual(Purchasable._meta.db_table, '"acted"."purchasables"')
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend/django_Admin3
python manage.py test store.tests.test_purchasable -v 2
```

Expected: FAIL — `ImportError: cannot import name 'Purchasable' from 'store.models'`

- [ ] **Step 3: Create the Purchasable model**

Create `backend/django_Admin3/store/models/purchasable.py`:

```python
"""Purchasable — unified parent table for all sellable items.

Every cart/order line references a Purchasable. Concrete subclasses
(Product, GenericItem) share a PK with the parent via Django MTI.

Table: acted.purchasables
"""
from django.db import models


class Purchasable(models.Model):
    """Parent catalog entity for any sellable item.

    The ``kind`` discriminator lets VAT rules, pricing code, and
    reporting branch without joining to subclass tables.
    """

    KIND_CHOICES = [
        ('product', 'Store Product (ESS-based)'),
        ('marking_voucher', 'Marking Voucher'),
        ('document_binder', 'Document Binder'),
        ('additional_charge', 'Additional Charge'),
    ]

    kind = models.CharField(max_length=32, choices=KIND_CHOICES)
    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    dynamic_pricing = models.BooleanField(
        default=False,
        help_text='If True, price is set per cart/order line (actual_price), not from Price table.'
    )
    vat_classification = models.CharField(
        max_length=32, blank=True,
        help_text='Used by VAT rules engine to select rate.'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."purchasables"'
        verbose_name = 'Purchasable'
        verbose_name_plural = 'Purchasables'
        indexes = [
            models.Index(fields=['kind']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.code} ({self.kind})"
```

- [ ] **Step 4: Add Purchasable to `store/models/__init__.py`**

Modify `backend/django_Admin3/store/models/__init__.py`:

```python
"""Store models - Purchasable items available in the online store."""
from store.models.purchasable import Purchasable
from store.models.product import Product
from store.models.price import Price
from store.models.bundle import Bundle
from store.models.bundle_product import BundleProduct

__all__ = [
    'Purchasable',
    'Product',
    'Price',
    'Bundle',
    'BundleProduct',
]
```

- [ ] **Step 5: Generate and inspect migration**

```bash
cd backend/django_Admin3
python manage.py makemigrations store --name create_purchasable
```

Rename the generated file to `0004_create_purchasable.py`. Verify it only creates the `Purchasable` model (no other changes).

- [ ] **Step 6: Run the migration and tests**

```bash
python manage.py migrate store
python manage.py test store.tests.test_purchasable -v 2
```

Expected: all tests PASS.

- [ ] **Step 7: Verify schema placement**

```bash
python manage.py verify_schema_placement
```

Expected: PASS (no warnings for `purchasables`).

- [ ] **Step 8: Commit**

```bash
git add backend/django_Admin3/store/models/purchasable.py \
        backend/django_Admin3/store/models/__init__.py \
        backend/django_Admin3/store/tests/test_purchasable.py \
        backend/django_Admin3/store/migrations/0004_create_purchasable.py
git commit -m "feat(store): add Purchasable parent model for unified catalog"
```

---

## Task 2: Create `store.GenericItem` subclass

**Files:**
- Create: `backend/django_Admin3/store/models/generic_item.py`
- Create: `backend/django_Admin3/store/tests/test_generic_item.py`
- Modify: `backend/django_Admin3/store/models/__init__.py`

- [ ] **Step 1: Write the failing test**

Create `backend/django_Admin3/store/tests/test_generic_item.py`:

```python
"""Tests for store.GenericItem — MTI subclass for voucher/binder/additional-charge."""
from django.test import TestCase
from store.models import GenericItem, Purchasable


class GenericItemModelTests(TestCase):
    def test_create_voucher_generic_item(self):
        gi = GenericItem.objects.create(
            kind='marking_voucher',
            code='MV-STANDARD',
            name='Standard Voucher',
            validity_period_days=1460,
        )
        self.assertEqual(gi.validity_period_days, 1460)
        self.assertEqual(gi.kind, 'marking_voucher')

    def test_generic_item_is_purchasable(self):
        gi = GenericItem.objects.create(
            kind='document_binder', code='DB-A4', name='A4 Binder',
        )
        self.assertIsInstance(gi, Purchasable)
        self.assertEqual(Purchasable.objects.get(code='DB-A4').pk, gi.pk)

    def test_validity_period_optional(self):
        gi = GenericItem.objects.create(
            kind='document_binder', code='DB-A3', name='A3 Binder',
        )
        self.assertIsNone(gi.validity_period_days)

    def test_stock_tracked_defaults_false(self):
        gi = GenericItem.objects.create(
            kind='additional_charge', code='AC-X', name='X', dynamic_pricing=True,
        )
        self.assertFalse(gi.stock_tracked)

    def test_db_table_in_acted_schema(self):
        self.assertEqual(GenericItem._meta.db_table, '"acted"."generic_items"')
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test store.tests.test_generic_item -v 2
```

Expected: FAIL — `ImportError` for `GenericItem`.

- [ ] **Step 3: Create GenericItem model**

Create `backend/django_Admin3/store/models/generic_item.py`:

```python
"""GenericItem — MTI subclass of Purchasable for non-ESS catalog items.

Covers Marking Vouchers, Document Binders, and Additional Charges.
Shares a PK with its parent Purchasable row.

Table: acted.generic_items
"""
from django.db import models

from store.models.purchasable import Purchasable


class GenericItem(Purchasable):
    """A non-ESS purchasable item (voucher, binder, additional charge)."""

    validity_period_days = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='If set, issued instances expire this many days after purchase (e.g., 1460 for 4 years).'
    )
    stock_tracked = models.BooleanField(
        default=False,
        help_text='Whether physical inventory is tracked for this item.'
    )

    class Meta:
        db_table = '"acted"."generic_items"'
        verbose_name = 'Generic Item'
        verbose_name_plural = 'Generic Items'
```

- [ ] **Step 4: Export from models package**

Modify `backend/django_Admin3/store/models/__init__.py`:

```python
from store.models.purchasable import Purchasable
from store.models.generic_item import GenericItem
from store.models.product import Product
from store.models.price import Price
from store.models.bundle import Bundle
from store.models.bundle_product import BundleProduct

__all__ = ['Purchasable', 'GenericItem', 'Product', 'Price', 'Bundle', 'BundleProduct']
```

- [ ] **Step 5: Generate migration**

```bash
python manage.py makemigrations store --name create_generic_item
```

Rename to `0005_create_generic_item.py`. Verify only adds `GenericItem`.

- [ ] **Step 6: Migrate and test**

```bash
python manage.py migrate store
python manage.py test store.tests.test_generic_item -v 2
python manage.py verify_schema_placement
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/store/models/generic_item.py \
        backend/django_Admin3/store/models/__init__.py \
        backend/django_Admin3/store/tests/test_generic_item.py \
        backend/django_Admin3/store/migrations/0005_create_generic_item.py
git commit -m "feat(store): add GenericItem MTI subclass of Purchasable"
```

---

## Task 3: Generalise `store.Price` — add nullable `purchasable` FK

**Files:**
- Modify: `backend/django_Admin3/store/models/price.py`
- Create: `backend/django_Admin3/store/migrations/0006_price_add_purchasable_fk.py`
- Modify: `backend/django_Admin3/store/tests/test_purchasable.py` (add price test)

- [ ] **Step 1: Write failing test**

Append to `backend/django_Admin3/store/tests/test_purchasable.py`:

```python
from decimal import Decimal
from store.models import Price


class PurchasablePricingTests(TestCase):
    def test_price_linked_to_purchasable(self):
        p = Purchasable.objects.create(kind='marking_voucher', code='MV-01', name='V')
        price = Price.objects.create(
            purchasable=p, price_type='standard', amount=Decimal('50.00')
        )
        self.assertEqual(p.prices.count(), 1)
        self.assertEqual(p.prices.first().amount, Decimal('50.00'))
```

- [ ] **Step 2: Run test — fails because `Price.purchasable` doesn't exist**

```bash
python manage.py test store.tests.test_purchasable.PurchasablePricingTests -v 2
```

Expected: FAIL — `TypeError: Price() got unexpected keyword argument 'purchasable'`.

- [ ] **Step 3: Add nullable purchasable FK to Price**

Modify `backend/django_Admin3/store/models/price.py` — add a new field alongside the existing `product` FK (both nullable during transition):

```python
# Inside class Price(models.Model):
    product = models.ForeignKey(
        'store.Product',
        on_delete=models.CASCADE,
        related_name='prices',
        null=True, blank=True,               # CHANGED: was required, now nullable during transition
        help_text='DEPRECATED — use purchasable. Removed in Release B.'
    )
    purchasable = models.ForeignKey(
        'store.Purchasable',
        on_delete=models.CASCADE,
        related_name='prices',
        null=True, blank=True,
        help_text='The purchasable this price applies to.'
    )
```

Also change `unique_together` to include both nullable pairs during transition — or simpler, add a new check in `save()`. **Simpler path**: drop `unique_together` entirely for now and re-add `unique_together = ('purchasable', 'price_type')` in Task 11 after backfill. Update `Meta`:

```python
    class Meta:
        db_table = '"acted"."prices"'
        # unique_together re-added in Release B after purchasable backfill
        verbose_name = 'Price'
        verbose_name_plural = 'Prices'
```

Update `__str__`:

```python
    def __str__(self):
        label = self.purchasable.code if self.purchasable_id else (self.product.product_code if self.product_id else '?')
        return f"{label} - {self.price_type}: {self.amount} {self.currency}"
```

**Reverse-accessor collision warning:** both `Product` and `Purchasable` now expose `.prices`. Because `Product` becomes a subclass of `Purchasable` in Task 10, they will share the same reverse accessor after MTI — no collision at steady state. During Tasks 3–10, only one of the two FKs is populated per row, so both accessors are usable. Suppress the `related_name` clash warning by using `related_query_name='price'` on the Purchasable FK or temporarily set `related_name='+'` on the `product` FK. Simpler: use `related_name='+'` on `product`:

```python
    product = models.ForeignKey(
        'store.Product', on_delete=models.CASCADE,
        related_name='+',                     # disable reverse accessor during transition
        null=True, blank=True,
        help_text='DEPRECATED — use purchasable. Removed in Release B.'
    )
```

- [ ] **Step 4: Generate and inspect migration**

```bash
python manage.py makemigrations store --name price_add_purchasable_fk
```

Rename to `0006_price_add_purchasable_fk.py`. Verify: alters `product` to nullable + `related_name='+'`, drops `unique_together`, adds `purchasable` nullable FK.

- [ ] **Step 5: Migrate and run test**

```bash
python manage.py migrate store
python manage.py test store.tests.test_purchasable -v 2
```

Expected: all PASS (including the new PurchasablePricingTests).

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/store/models/price.py \
        backend/django_Admin3/store/tests/test_purchasable.py \
        backend/django_Admin3/store/migrations/0006_price_add_purchasable_fk.py
git commit -m "feat(store): add nullable Price.purchasable FK (dual-write phase)"
```

---

## Task 4: Backfill Purchasable rows from existing Products (data migration)

**Files:**
- Create: `backend/django_Admin3/store/migrations/0007_backfill_purchasable_from_products.py`

- [ ] **Step 1: Write the data-migration**

Create the migration:

```python
"""Create one Purchasable row per existing store.Product, preserving the PK.

This lets us convert Product to an MTI subclass (Task 6) with Product.id == Purchasable.id,
so cart/order FKs pointing at Product.id still resolve after the flip.
"""
from django.db import migrations


def backfill_purchasables_from_products(apps, schema_editor):
    Product = apps.get_model('store', 'Product')
    Purchasable = apps.get_model('store', 'Purchasable')

    rows = []
    for product in Product.objects.all().iterator(chunk_size=500):
        # product.product_code exists; name comes from the catalog.Product via PPV
        ppv = product.product_product_variation
        catalog_product = ppv.product
        name = catalog_product.fullname or catalog_product.shortname or product.product_code
        rows.append(Purchasable(
            id=product.id,                    # preserve PK for MTI + FK stability
            kind='product',
            code=product.product_code,
            name=name,
            description='',
            is_active=product.is_active,
            dynamic_pricing=False,
            vat_classification='',
            created_at=product.created_at,
            updated_at=product.updated_at,
        ))
    Purchasable.objects.bulk_create(rows, batch_size=500)


def reverse(apps, schema_editor):
    Purchasable = apps.get_model('store', 'Purchasable')
    Purchasable.objects.filter(kind='product').delete()


class Migration(migrations.Migration):
    dependencies = [('store', '0006_price_add_purchasable_fk')]
    operations = [
        migrations.RunPython(backfill_purchasables_from_products, reverse),
    ]
```

**Note on `name` source**: inspect `catalog.Product` to confirm the right name field (`fullname`, `shortname`, or `code`). If neither attribute exists, fall back to `str(catalog_product)`.

- [ ] **Step 2: Write a migration-verification test**

Create `backend/django_Admin3/store/tests/test_migration_backfill.py`:

```python
"""Smoke test: backfill migration produces Purchasable row per Product, same PK."""
from django.test import TransactionTestCase
from django.core.management import call_command
from store.models import Product, Purchasable


class PurchasableBackfillTests(TransactionTestCase):
    """Runs the migration fresh on a test DB; verifies counts and PK preservation."""

    def test_every_product_has_matching_purchasable(self):
        # After all migrations run, every Product.id must have a Purchasable row
        product_ids = set(Product.objects.values_list('id', flat=True))
        purchasable_ids = set(
            Purchasable.objects.filter(kind='product').values_list('id', flat=True)
        )
        self.assertEqual(product_ids, purchasable_ids)
```

- [ ] **Step 3: Run the migration + test**

```bash
python manage.py migrate store
python manage.py test store.tests.test_migration_backfill -v 2
```

Expected: PASS. If there are no Product rows in dev DB, test trivially passes — verify on staging later.

- [ ] **Step 4: Commit**

```bash
git add backend/django_Admin3/store/migrations/0007_backfill_purchasable_from_products.py \
        backend/django_Admin3/store/tests/test_migration_backfill.py
git commit -m "feat(store): backfill Purchasable rows from existing Products"
```

---

## Task 5: Backfill Purchasable + GenericItem from MarkingVouchers

**Files:**
- Create: `backend/django_Admin3/store/migrations/0008_backfill_purchasable_from_vouchers.py`

- [ ] **Step 1: Write the data-migration**

```python
"""Create Purchasable + GenericItem rows from existing MarkingVoucher rows.

Also backfills a Price row per voucher (standard, amount = MarkingVoucher.price)
and records a (MarkingVoucher.id -> Purchasable.id) mapping in a temp table so
Task 7 can repoint cart/order FKs.
"""
from decimal import Decimal
from django.db import migrations


def backfill_purchasables_from_vouchers(apps, schema_editor):
    MarkingVoucher = apps.get_model('marking_vouchers', 'MarkingVoucher')
    Purchasable = apps.get_model('store', 'Purchasable')
    GenericItem = apps.get_model('store', 'GenericItem')
    Price = apps.get_model('store', 'Price')

    # Create a temp mapping table for Task 7 to reference.
    with schema_editor.connection.cursor() as cur:
        cur.execute('''
            CREATE TABLE IF NOT EXISTS acted._voucher_migration_map (
                marking_voucher_id INT PRIMARY KEY,
                purchasable_id INT NOT NULL
            )
        ''')

    for mv in MarkingVoucher.objects.all().iterator(chunk_size=200):
        gi = GenericItem.objects.create(
            kind='marking_voucher',
            code=mv.code,
            name=mv.name,
            description=mv.description or '',
            is_active=mv.is_active,
            dynamic_pricing=False,
            vat_classification='',
            validity_period_days=1460,        # 4 years
            stock_tracked=False,
        )
        Price.objects.create(
            purchasable_id=gi.purchasable_ptr_id,
            price_type='standard',
            amount=mv.price,
            currency='GBP',
        )
        with schema_editor.connection.cursor() as cur:
            cur.execute(
                'INSERT INTO acted._voucher_migration_map VALUES (%s, %s)',
                [mv.id, gi.purchasable_ptr_id],
            )


def reverse(apps, schema_editor):
    Purchasable = apps.get_model('store', 'Purchasable')
    Purchasable.objects.filter(kind='marking_voucher').delete()
    with schema_editor.connection.cursor() as cur:
        cur.execute('DROP TABLE IF EXISTS acted._voucher_migration_map')


class Migration(migrations.Migration):
    dependencies = [
        ('store', '0007_backfill_purchasable_from_products'),
        ('marking_vouchers', '0002_migrate_to_acted_schema'),
    ]
    operations = [
        migrations.RunPython(backfill_purchasables_from_vouchers, reverse),
    ]
```

- [ ] **Step 2: Migrate**

```bash
python manage.py migrate store
```

Expected: runs cleanly. Inspect DB: `SELECT kind, COUNT(*) FROM acted.purchasables GROUP BY kind;` shows a row for `marking_voucher` matching the number of existing `marking_vouchers` rows.

- [ ] **Step 3: Commit**

```bash
git add backend/django_Admin3/store/migrations/0008_backfill_purchasable_from_vouchers.py
git commit -m "feat(store): backfill Purchasable+GenericItem from MarkingVouchers"
```

---

## Task 6: Create well-known `FEE_GENERIC` Purchasable

**Files:**
- Create: `backend/django_Admin3/store/migrations/0009_create_fee_generic_purchasable.py`

- [ ] **Step 1: Write the data-migration**

```python
"""Create the FEE_GENERIC Purchasable used for cart/order fee lines
that previously had item_type='fee' with no FK.
"""
from django.db import migrations

FEE_GENERIC_CODE = 'FEE_GENERIC'


def create_fee_generic(apps, schema_editor):
    Purchasable = apps.get_model('store', 'Purchasable')
    Purchasable.objects.get_or_create(
        code=FEE_GENERIC_CODE,
        defaults={
            'kind': 'additional_charge',
            'name': 'Generic Fee',
            'description': 'Catch-all purchasable for legacy fee lines. Amount comes from actual_price.',
            'is_active': True,
            'dynamic_pricing': True,
            'vat_classification': '',
        },
    )


def reverse(apps, schema_editor):
    Purchasable = apps.get_model('store', 'Purchasable')
    Purchasable.objects.filter(code=FEE_GENERIC_CODE).delete()


class Migration(migrations.Migration):
    dependencies = [('store', '0008_backfill_purchasable_from_vouchers')]
    operations = [migrations.RunPython(create_fee_generic, reverse)]
```

- [ ] **Step 2: Migrate and commit**

```bash
python manage.py migrate store
git add backend/django_Admin3/store/migrations/0009_create_fee_generic_purchasable.py
git commit -m "feat(store): create FEE_GENERIC purchasable for legacy fee lines"
```

---

## Task 7: Convert `store.Product` to MTI subclass of Purchasable

**Files:**
- Modify: `backend/django_Admin3/store/models/product.py`
- Create: `backend/django_Admin3/store/migrations/0010_product_to_mti_subclass.py`
- Create: `backend/django_Admin3/store/tests/test_product_mti.py`

**Complexity note:** converting an existing model to a Django MTI subclass requires renaming the PK column (`id` → `purchasable_ptr_id`) and dropping columns that now live on the parent (`created_at`, `updated_at`). Use `SeparateDatabaseAndState` so we can run raw SQL for the rename while Django's model state still matches.

- [ ] **Step 1: Write failing test**

Create `backend/django_Admin3/store/tests/test_product_mti.py`:

```python
"""Verify Product is an MTI subclass of Purchasable after migration."""
from django.test import TestCase
from store.models import Product, Purchasable


class ProductMTITests(TestCase):
    def test_product_is_purchasable(self):
        # Existing Product rows in the DB (seeded via fixtures / backfill) must
        # be reachable via Purchasable with kind='product'.
        for product in Product.objects.all()[:5]:
            parent = Purchasable.objects.get(pk=product.pk)
            self.assertEqual(parent.kind, 'product')
            self.assertEqual(parent.code, product.product_code)

    def test_product_inherits_purchasable_fields(self):
        product = Product.objects.first()
        if product is None:
            self.skipTest("No products in DB")
        self.assertTrue(hasattr(product, 'code'))
        self.assertTrue(hasattr(product, 'name'))
        self.assertTrue(hasattr(product, 'kind'))
```

- [ ] **Step 2: Run test — fails because Product is not yet a subclass**

```bash
python manage.py test store.tests.test_product_mti -v 2
```

Expected: FAIL — either `Product has no attribute 'kind'` or MTI relation missing.

- [ ] **Step 3: Modify Product model to subclass Purchasable**

Rewrite `backend/django_Admin3/store/models/product.py`:

```python
"""Product — MTI subclass of Purchasable for ESS-based store items.

A purchasable linking an exam session subject to a product variation.
Shares a PK with its parent Purchasable row.

Table: acted.products
"""
from django.db import models

from store.models.purchasable import Purchasable


class Product(Purchasable):
    """ESS-based store product (existing structure, now an MTI subclass)."""

    exam_session_subject = models.ForeignKey(
        'catalog.ExamSessionSubject',
        on_delete=models.CASCADE,
        related_name='store_products',
    )
    product_product_variation = models.ForeignKey(
        'catalog_products.ProductProductVariation',
        on_delete=models.CASCADE,
        related_name='store_products',
    )
    product_code = models.CharField(max_length=64, unique=True)

    class Meta:
        db_table = '"acted"."products"'
        unique_together = ('exam_session_subject', 'product_product_variation')
        verbose_name = 'Store Product'
        verbose_name_plural = 'Store Products'

    def save(self, *args, **kwargs):
        # Ensure Purchasable.kind and .code are populated for MTI parent.
        if not self.kind:
            self.kind = Purchasable.KIND_PRODUCT
        if not self.product_code:
            variation_type = self.product_product_variation.product_variation.variation_type
            if variation_type in ('eBook', 'Printed', 'Marking'):
                self.product_code = self._generate_product_code()
                self.code = self.product_code
                super().save(*args, **kwargs)
            else:
                # Tutorial/other codes include PK; save first, then regenerate.
                self.code = self.product_code or 'pending'
                super().save(*args, **kwargs)
                self.product_code = self._generate_product_code()
                self.code = self.product_code
                super().save(update_fields=['product_code', 'code'])
        else:
            self.code = self.product_code
            super().save(*args, **kwargs)

    def _generate_product_code(self):
        # (unchanged from current implementation — preserve existing code)
        ess = self.exam_session_subject
        ppv = self.product_product_variation
        subject_code = ess.subject.code
        exam_code = ess.exam_session.session_code
        product_code = ppv.product.code
        variation = ppv.product_variation
        variation_code = variation.code if variation.code else ''
        if variation.variation_type in ('eBook', 'Printed', 'Marking'):
            return f"{subject_code}/{variation_code}{product_code}/{exam_code}"
        prefix = variation.variation_type[0].upper() if variation.variation_type else ''
        return f"{subject_code}/{prefix}{product_code}{variation_code}/{exam_code}-{self.pk}"

    def __str__(self):
        return self.product_code

    # Backward-compat properties (unchanged) ---------------------------------
    @property
    def product(self):
        return self.product_product_variation.product

    @property
    def product_variation(self):
        return self.product_product_variation.product_variation

    @property
    def variations(self):
        return Product.objects.filter(pk=self.pk)
```

The `save()` override above sets `self.kind = Purchasable.KIND_PRODUCT` automatically on insert so callers never have to pass `kind='product'` when creating a `Product`. For `GenericItem`, callers already pass `kind` explicitly (per Task 2's tests), so no equivalent override is needed there.

- [ ] **Step 4: Write the SeparateDatabaseAndState migration**

Create `backend/django_Admin3/store/migrations/0010_product_to_mti_subclass.py`:

```python
"""Convert store.Product into an MTI subclass of store.Purchasable.

DB-side: rename products.id -> products.purchasable_ptr_id, add FK to
purchasables.id, drop created_at/updated_at (now on parent).
State-side: Django model graph updated to MTI.

Existing Purchasable rows from 0007 already have matching IDs, so the
FK is immediately valid.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('store', '0009_create_fee_generic_purchasable'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                # Rename PK column and add FK constraint via raw SQL.
                migrations.RunSQL(
                    sql=[
                        'ALTER TABLE acted.products RENAME COLUMN id TO purchasable_ptr_id;',
                        'ALTER TABLE acted.products ADD CONSTRAINT products_purchasable_ptr_fk '
                        'FOREIGN KEY (purchasable_ptr_id) REFERENCES acted.purchasables(id) '
                        'ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;',
                        'ALTER TABLE acted.products DROP COLUMN created_at;',
                        'ALTER TABLE acted.products DROP COLUMN updated_at;',
                        'ALTER TABLE acted.products DROP COLUMN is_active;',
                    ],
                    reverse_sql=[
                        'ALTER TABLE acted.products ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;',
                        'ALTER TABLE acted.products ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();',
                        'ALTER TABLE acted.products ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();',
                        'ALTER TABLE acted.products DROP CONSTRAINT products_purchasable_ptr_fk;',
                        'ALTER TABLE acted.products RENAME COLUMN purchasable_ptr_id TO id;',
                    ],
                ),
            ],
            state_operations=[
                # Drop fields that move to parent.
                migrations.RemoveField(model_name='product', name='created_at'),
                migrations.RemoveField(model_name='product', name='updated_at'),
                migrations.RemoveField(model_name='product', name='is_active'),
                migrations.RemoveField(model_name='product', name='id'),
                # Redeclare Product as subclass (Django reads bases from the model file).
                migrations.AlterField(
                    model_name='product',
                    name='purchasable_ptr',
                    field=models.OneToOneField(
                        auto_created=True, on_delete=models.deletion.CASCADE,
                        parent_link=True, primary_key=True, serialize=False,
                        to='store.purchasable',
                    ),
                ),
            ],
        ),
    ]
```

**Review note:** this is the most invasive migration. Test it carefully against a copy of production data on staging. If the `SeparateDatabaseAndState` approach surfaces issues, fall back to:
(a) rename column manually,
(b) add new `purchasable_ptr_id` column with FK,
(c) populate from `id`,
(d) drop old `id`,
(e) rename `purchasable_ptr_id` → PK.

- [ ] **Step 5: Migrate**

```bash
python manage.py migrate store
```

Expected: success. If it fails, do **not** proceed — investigate.

- [ ] **Step 6: Run tests**

```bash
python manage.py test store.tests.test_product_mti store.tests.test_purchasable store.tests.test_generic_item -v 2
python manage.py verify_schema_placement
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/store/models/product.py \
        backend/django_Admin3/store/tests/test_product_mti.py \
        backend/django_Admin3/store/migrations/0010_product_to_mti_subclass.py
git commit -m "feat(store): convert Product to MTI subclass of Purchasable"
```

---

## Task 8: Backfill `Price.purchasable_id` from `Price.product_id`

**Files:**
- Create: `backend/django_Admin3/store/migrations/0011_price_backfill_purchasable.py`

- [ ] **Step 1: Write data-migration**

```python
"""Backfill Price.purchasable_id = Price.product_id.

Under Variant A, Product.id == Purchasable.id, so the copy is direct.
"""
from django.db import migrations


def backfill(apps, schema_editor):
    Price = apps.get_model('store', 'Price')
    Price.objects.filter(product_id__isnull=False, purchasable_id__isnull=True) \
                 .update(purchasable_id=models_F := __import__('django.db.models', fromlist=['F']).F('product_id'))


def reverse(apps, schema_editor):
    Price = apps.get_model('store', 'Price')
    Price.objects.update(purchasable_id=None)


class Migration(migrations.Migration):
    dependencies = [('store', '0010_product_to_mti_subclass')]
    operations = [migrations.RunPython(backfill, reverse)]
```

Cleaner form (same effect, avoids the one-liner trick):

```python
from django.db import migrations
from django.db.models import F


def backfill(apps, schema_editor):
    Price = apps.get_model('store', 'Price')
    Price.objects.filter(product_id__isnull=False, purchasable_id__isnull=True) \
                 .update(purchasable_id=F('product_id'))


def reverse(apps, schema_editor):
    Price = apps.get_model('store', 'Price')
    Price.objects.update(purchasable_id=None)


class Migration(migrations.Migration):
    dependencies = [('store', '0010_product_to_mti_subclass')]
    operations = [migrations.RunPython(backfill, reverse)]
```

- [ ] **Step 2: Migrate**

```bash
python manage.py migrate store
```

Check DB: `SELECT COUNT(*) FROM acted.prices WHERE purchasable_id IS NULL;` should be 0.

- [ ] **Step 3: Commit**

```bash
git add backend/django_Admin3/store/migrations/0011_price_backfill_purchasable.py
git commit -m "feat(store): backfill Price.purchasable_id from legacy product_id"
```

---

## Task 9: Add nullable `purchasable` FK to `cart.CartItem`

**Files:**
- Modify: `backend/django_Admin3/cart/models/cart_item.py`
- Create: `backend/django_Admin3/cart/migrations/0004_cart_item_add_purchasable_fk.py`
- Modify: `backend/django_Admin3/cart/tests/test_cart_item.py` (or create if missing)

- [ ] **Step 1: Write failing test**

Append to `backend/django_Admin3/cart/tests/test_cart_item.py`:

```python
def test_cart_item_accepts_purchasable(self):
    """CartItem.purchasable can be set instead of product/marking_voucher."""
    from store.models import Purchasable
    from cart.models import Cart, CartItem

    cart = Cart.objects.create(user=self.user)
    p = Purchasable.objects.create(kind='marking_voucher', code='V-TEST', name='V')
    item = CartItem.objects.create(cart=cart, purchasable=p, quantity=1)
    self.assertEqual(item.purchasable_id, p.id)
```

- [ ] **Step 2: Run — expect FAIL** (`purchasable` field doesn't exist yet)

```bash
python manage.py test cart.tests.test_cart_item -v 2
```

- [ ] **Step 3: Add nullable FK and relax check constraint**

Modify `cart/models/cart_item.py`:

```python
    # NEW — single polymorphic FK to Purchasable.
    purchasable = models.ForeignKey(
        'store.Purchasable',
        on_delete=models.PROTECT,
        null=True, blank=True,              # nullable during transition; NOT NULL in Release B
        related_name='cart_items',
        help_text='The catalog entity being purchased.'
    )
```

Also relax the existing check constraint to include the new column as an alternative:

```python
    class Meta:
        # ...
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(product__isnull=False) |
                    models.Q(marking_voucher__isnull=False) |
                    models.Q(purchasable__isnull=False) |      # NEW
                    models.Q(item_type='fee')
                ),
                name='cart_item_has_product_or_voucher_or_purchasable_or_is_fee'
            ),
            # remove/rename the old "not both product and voucher" constraint — it's
            # still valid but the check name stays unique.
            models.CheckConstraint(
                condition=~(models.Q(product__isnull=False) & models.Q(marking_voucher__isnull=False)),
                name='cart_item_not_both_product_and_voucher'
            ),
            # unchanged VAT constraints...
        ]
```

- [ ] **Step 4: Generate and run migration**

```bash
python manage.py makemigrations cart --name cart_item_add_purchasable_fk
# rename to 0004_...
python manage.py migrate cart
python manage.py test cart.tests.test_cart_item -v 2
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/cart/models/cart_item.py \
        backend/django_Admin3/cart/migrations/0004_cart_item_add_purchasable_fk.py \
        backend/django_Admin3/cart/tests/test_cart_item.py
git commit -m "feat(cart): add nullable CartItem.purchasable FK (dual-write phase)"
```

---

## Task 10: Add nullable `purchasable` FK to `orders.OrderItem`

Mirror of Task 9 applied to `orders.OrderItem`.

**Files:**
- Modify: `backend/django_Admin3/orders/models/order_item.py`
- Create: `backend/django_Admin3/orders/migrations/0004_order_item_add_purchasable_fk.py`
- Modify: `backend/django_Admin3/orders/tests/test_order_item.py`

- [ ] **Step 1: Write failing test**

```python
def test_order_item_accepts_purchasable(self):
    from store.models import Purchasable
    from orders.models import Order, OrderItem

    order = Order.objects.create(user=self.user)
    p = Purchasable.objects.create(kind='marking_voucher', code='V-ORD', name='V')
    item = OrderItem.objects.create(order=order, purchasable=p, quantity=1)
    self.assertEqual(item.purchasable_id, p.id)
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Modify `order_item.py`** — add the same `purchasable` FK (PROTECT, nullable) and relax the same check constraint. Code identical to Task 9 (replace `cart_item`→`order_item`, `cart_items`→`order_items`).

- [ ] **Step 4: Generate + migrate + test**

```bash
python manage.py makemigrations orders --name order_item_add_purchasable_fk
# rename to 0004_...
python manage.py migrate orders
python manage.py test orders.tests.test_order_item -v 2
```

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/orders/models/order_item.py \
        backend/django_Admin3/orders/migrations/0004_order_item_add_purchasable_fk.py \
        backend/django_Admin3/orders/tests/test_order_item.py
git commit -m "feat(orders): add nullable OrderItem.purchasable FK (dual-write phase)"
```

---

## Task 11: Backfill `CartItem.purchasable_id`

**Files:**
- Create: `backend/django_Admin3/cart/migrations/0005_cart_item_backfill_purchasable.py`

- [ ] **Step 1: Write data-migration**

```python
"""Backfill CartItem.purchasable_id from legacy FKs.

- product-backed rows: purchasable_id = product_id  (same PK under Variant A)
- voucher-backed rows: lookup via acted._voucher_migration_map
- fee-only rows: point at the FEE_GENERIC Purchasable
"""
from django.db import migrations
from django.db.models import F

FEE_GENERIC_CODE = 'FEE_GENERIC'


def backfill(apps, schema_editor):
    CartItem = apps.get_model('cart', 'CartItem')
    Purchasable = apps.get_model('store', 'Purchasable')

    # Product-backed
    CartItem.objects.filter(
        product_id__isnull=False, purchasable_id__isnull=True
    ).update(purchasable_id=F('product_id'))

    # Voucher-backed — join via _voucher_migration_map
    with schema_editor.connection.cursor() as cur:
        cur.execute('''
            UPDATE acted.cart_items ci
            SET    purchasable_id = m.purchasable_id
            FROM   acted._voucher_migration_map m
            WHERE  ci.marking_voucher_id = m.marking_voucher_id
              AND  ci.purchasable_id IS NULL
        ''')

    # Fee-only
    fee_generic = Purchasable.objects.get(code=FEE_GENERIC_CODE)
    CartItem.objects.filter(
        item_type='fee', purchasable_id__isnull=True
    ).update(purchasable_id=fee_generic.id)


def reverse(apps, schema_editor):
    CartItem = apps.get_model('cart', 'CartItem')
    CartItem.objects.update(purchasable_id=None)


class Migration(migrations.Migration):
    dependencies = [
        ('cart', '0004_cart_item_add_purchasable_fk'),
        ('store', '0009_create_fee_generic_purchasable'),
    ]
    operations = [migrations.RunPython(backfill, reverse)]
```

- [ ] **Step 2: Migrate and verify**

```bash
python manage.py migrate cart
```

Verify via SQL:

```sql
SELECT COUNT(*) FROM acted.cart_items WHERE purchasable_id IS NULL;
-- expected: 0
```

- [ ] **Step 3: Commit**

```bash
git add backend/django_Admin3/cart/migrations/0005_cart_item_backfill_purchasable.py
git commit -m "feat(cart): backfill CartItem.purchasable_id from legacy FKs"
```

---

## Task 12: Backfill `OrderItem.purchasable_id`

Mirror of Task 11.

**Files:**
- Create: `backend/django_Admin3/orders/migrations/0005_order_item_backfill_purchasable.py`

- [ ] **Step 1: Write data-migration** — identical to Task 11 with `cart_items` → `order_items`, `CartItem` → `OrderItem`. Dependency: `('orders', '0004_order_item_add_purchasable_fk')` and `('store', '0009_create_fee_generic_purchasable')`.

- [ ] **Step 2: Migrate + verify**

```bash
python manage.py migrate orders
```

SQL: `SELECT COUNT(*) FROM acted.order_items WHERE purchasable_id IS NULL;` → 0.

- [ ] **Step 3: Commit**

```bash
git add backend/django_Admin3/orders/migrations/0005_order_item_backfill_purchasable.py
git commit -m "feat(orders): backfill OrderItem.purchasable_id from legacy FKs"
```

---

## Task 13: Create `IssuedVoucher` model + package layout

**Files:**
- Create: `backend/django_Admin3/marking_vouchers/models/__init__.py`
- Create: `backend/django_Admin3/marking_vouchers/models/issued_voucher.py`
- Create: `backend/django_Admin3/marking_vouchers/tests/test_issued_voucher.py`
- Create: `backend/django_Admin3/marking_vouchers/migrations/0003_create_issued_voucher.py`

**Note:** The app currently has `models.py` (a flat file with `MarkingVoucher`). Convert to a `models/` package so `IssuedVoucher` has a dedicated module while `MarkingVoucher` still exists (it's dropped in Task 24).

- [ ] **Step 1: Convert `models.py` to `models/` package**

Create `backend/django_Admin3/marking_vouchers/models/__init__.py`:

```python
from marking_vouchers.models.marking_voucher import MarkingVoucher
from marking_vouchers.models.issued_voucher import IssuedVoucher

__all__ = ['MarkingVoucher', 'IssuedVoucher']
```

Move `marking_vouchers/models.py` → `marking_vouchers/models/marking_voucher.py` (unchanged content). Delete the old `models.py`.

Verify imports still work:

```bash
python manage.py check
```

- [ ] **Step 2: Write failing test**

Create `backend/django_Admin3/marking_vouchers/tests/test_issued_voucher.py`:

```python
"""Tests for IssuedVoucher — per-unit issued voucher instances."""
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from marking_vouchers.models import IssuedVoucher


class IssuedVoucherModelTests(TestCase):
    def test_status_choices(self):
        self.assertIn(('active', 'Active'), IssuedVoucher.STATUS_CHOICES)
        self.assertIn(('redeemed', 'Redeemed'), IssuedVoucher.STATUS_CHOICES)
        self.assertIn(('expired', 'Expired'), IssuedVoucher.STATUS_CHOICES)
        self.assertIn(('cancelled', 'Cancelled'), IssuedVoucher.STATUS_CHOICES)

    def test_voucher_code_unique(self):
        # (exercised via the service in later tests)
        self.assertTrue(IssuedVoucher._meta.get_field('voucher_code').unique)

    def test_db_table_in_acted_schema(self):
        self.assertEqual(IssuedVoucher._meta.db_table, '"acted"."issued_vouchers"')

    def test_expires_at_required(self):
        self.assertFalse(IssuedVoucher._meta.get_field('expires_at').null)
```

- [ ] **Step 3: Run — expect FAIL (`IssuedVoucher` missing)**

```bash
python manage.py test marking_vouchers.tests.test_issued_voucher -v 2
```

- [ ] **Step 4: Create the model**

Create `backend/django_Admin3/marking_vouchers/models/issued_voucher.py`:

```python
"""IssuedVoucher — one row per issued voucher unit.

Created at order confirmation. Each unit has its own code and expiry.
"""
from django.db import models


class IssuedVoucher(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('redeemed', 'Redeemed'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]

    voucher_code = models.CharField(max_length=32, unique=True, db_index=True)
    order_item = models.ForeignKey(
        'orders.OrderItem', on_delete=models.CASCADE,
        related_name='issued_vouchers',
    )
    purchasable = models.ForeignKey(
        'store.Purchasable', on_delete=models.PROTECT,
        related_name='issued_vouchers',
        help_text='Which catalog SKU this voucher was issued from (denormalised for reporting).'
    )
    issued_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='active')
    redeemed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True)

    class Meta:
        db_table = '"acted"."issued_vouchers"'
        verbose_name = 'Issued Voucher'
        verbose_name_plural = 'Issued Vouchers'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['expires_at']),
            models.Index(fields=['order_item']),
        ]

    def __str__(self):
        return f"{self.voucher_code} ({self.status})"
```

- [ ] **Step 5: Generate migration**

```bash
python manage.py makemigrations marking_vouchers --name create_issued_voucher
# rename to 0003_create_issued_voucher.py
python manage.py migrate marking_vouchers
python manage.py test marking_vouchers.tests.test_issued_voucher -v 2
python manage.py verify_schema_placement
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/marking_vouchers/models/ \
        backend/django_Admin3/marking_vouchers/tests/test_issued_voucher.py \
        backend/django_Admin3/marking_vouchers/migrations/0003_create_issued_voucher.py
# also include the removed models.py if git tracks it as a rename
git commit -m "feat(marking_vouchers): add IssuedVoucher model for per-unit tracking"
```

---

## Task 14: Implement `IssuedVoucherService.issue()`

**Files:**
- Create: `backend/django_Admin3/marking_vouchers/services/__init__.py`
- Create: `backend/django_Admin3/marking_vouchers/services/voucher_service.py`
- Create: `backend/django_Admin3/marking_vouchers/tests/test_voucher_service.py`

- [ ] **Step 1: Write failing test**

Create `backend/django_Admin3/marking_vouchers/tests/test_voucher_service.py`:

```python
"""Tests for IssuedVoucherService — issuance, expiry, cancellation."""
import re
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from marking_vouchers.models import IssuedVoucher
from marking_vouchers.services.voucher_service import IssuedVoucherService


class IssuedVoucherServiceIssueTests(TestCase):
    def setUp(self):
        # Fixture helpers — create a minimal OrderItem backed by a voucher Purchasable.
        from store.models import Purchasable, GenericItem
        from orders.models import Order, OrderItem
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(username='u', password='p', email='u@x')
        self.gi = GenericItem.objects.create(
            kind='marking_voucher', code='MV-TEST', name='Test',
            validity_period_days=1460,
        )
        self.order = Order.objects.create(user=self.user)
        self.order_item = OrderItem.objects.create(
            order=self.order, purchasable_id=self.gi.pk, quantity=3,
        )

    def test_issue_creates_quantity_rows(self):
        vouchers = IssuedVoucherService.issue(self.order_item)
        self.assertEqual(len(vouchers), 3)
        self.assertEqual(IssuedVoucher.objects.filter(order_item=self.order_item).count(), 3)

    def test_issued_codes_are_unique(self):
        vouchers = IssuedVoucherService.issue(self.order_item)
        codes = {v.voucher_code for v in vouchers}
        self.assertEqual(len(codes), 3)

    def test_code_format(self):
        v = IssuedVoucherService.issue(self.order_item)[0]
        # MV-<yyyymm>-<8 base32 chars>
        self.assertRegex(v.voucher_code, r'^MV-\d{6}-[A-Z2-7]{8}$')

    def test_expiry_set_to_validity_period(self):
        v = IssuedVoucherService.issue(self.order_item)[0]
        expected = v.issued_at + timedelta(days=1460)
        self.assertLess(abs((v.expires_at - expected).total_seconds()), 2)

    def test_status_active(self):
        v = IssuedVoucherService.issue(self.order_item)[0]
        self.assertEqual(v.status, 'active')

    def test_issue_refuses_non_voucher_purchasable(self):
        from store.models import Purchasable
        other = Purchasable.objects.create(kind='document_binder', code='B1', name='B')
        oi = OrderItem.objects.create(order=self.order, purchasable_id=other.pk, quantity=1)
        with self.assertRaises(ValueError):
            IssuedVoucherService.issue(oi)
```

- [ ] **Step 2: Run — expect FAIL (service doesn't exist)**

```bash
python manage.py test marking_vouchers.tests.test_voucher_service -v 2
```

- [ ] **Step 3: Implement the service**

Create `backend/django_Admin3/marking_vouchers/services/__init__.py` (empty).

Create `backend/django_Admin3/marking_vouchers/services/voucher_service.py`:

```python
"""IssuedVoucherService — issuance, expiry, cancellation of marking vouchers."""
import base64
import secrets
from datetime import timedelta
from django.db import transaction
from django.utils import timezone

from marking_vouchers.models import IssuedVoucher


class IssuedVoucherService:

    CODE_PREFIX = 'MV'
    CODE_RANDOM_BYTES = 5        # 5 bytes -> 8 base32 chars
    DEFAULT_VALIDITY_DAYS = 1460  # 4 years fallback if catalog row is missing

    @classmethod
    def issue(cls, order_item):
        """Create one IssuedVoucher per unit of order_item.quantity.

        Raises ValueError if the order_item's purchasable is not a marking_voucher.
        """
        purchasable = order_item.purchasable
        if purchasable is None or purchasable.kind != 'marking_voucher':
            raise ValueError(
                f'Cannot issue vouchers for purchasable kind={getattr(purchasable, "kind", None)}'
            )

        # Resolve validity from GenericItem subclass.
        generic = getattr(purchasable, 'genericitem', None)
        validity_days = (
            generic.validity_period_days if generic and generic.validity_period_days
            else cls.DEFAULT_VALIDITY_DAYS
        )

        now = timezone.now()
        expires_at = now + timedelta(days=validity_days)

        created = []
        with transaction.atomic():
            for _ in range(order_item.quantity):
                code = cls._generate_code(now)
                v = IssuedVoucher.objects.create(
                    voucher_code=code,
                    order_item=order_item,
                    purchasable=purchasable,
                    expires_at=expires_at,
                    status='active',
                )
                created.append(v)
        return created

    @classmethod
    def _generate_code(cls, now):
        """MV-<yyyymm>-<8 base32 chars>."""
        yyyymm = now.strftime('%Y%m')
        random = base64.b32encode(secrets.token_bytes(cls.CODE_RANDOM_BYTES)) \
                     .decode('ascii').rstrip('=')
        return f"{cls.CODE_PREFIX}-{yyyymm}-{random}"
```

- [ ] **Step 4: Run tests**

```bash
python manage.py test marking_vouchers.tests.test_voucher_service -v 2
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/marking_vouchers/services/ \
        backend/django_Admin3/marking_vouchers/tests/test_voucher_service.py
git commit -m "feat(marking_vouchers): add IssuedVoucherService.issue()"
```

---

## Task 15: Add `expire_batch()` and `cancel_for_order_item()` to the service

**Files:**
- Modify: `backend/django_Admin3/marking_vouchers/services/voucher_service.py`
- Modify: `backend/django_Admin3/marking_vouchers/tests/test_voucher_service.py`

- [ ] **Step 1: Add failing tests**

Append to `test_voucher_service.py`:

```python
class IssuedVoucherServiceExpireTests(TestCase):
    def setUp(self):
        # reuse a minimal setup
        from store.models import GenericItem
        from orders.models import Order, OrderItem
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(username='u', password='p', email='u@x')
        self.gi = GenericItem.objects.create(
            kind='marking_voucher', code='MV-EXP', name='E', validity_period_days=1460,
        )
        self.order = Order.objects.create(user=self.user)
        self.oi = OrderItem.objects.create(order=self.order, purchasable_id=self.gi.pk, quantity=2)

    def test_expire_batch_transitions_active_past_expiry(self):
        vouchers = IssuedVoucherService.issue(self.oi)
        past = timezone.now() - timedelta(days=1)
        IssuedVoucher.objects.filter(pk=vouchers[0].pk).update(expires_at=past)

        count = IssuedVoucherService.expire_batch()

        self.assertEqual(count, 1)
        vouchers[0].refresh_from_db()
        self.assertEqual(vouchers[0].status, 'expired')
        vouchers[1].refresh_from_db()
        self.assertEqual(vouchers[1].status, 'active')

    def test_cancel_for_order_item(self):
        vouchers = IssuedVoucherService.issue(self.oi)

        count = IssuedVoucherService.cancel_for_order_item(self.oi, reason='refund')

        self.assertEqual(count, 2)
        for v in IssuedVoucher.objects.filter(order_item=self.oi):
            self.assertEqual(v.status, 'cancelled')
            self.assertEqual(v.cancellation_reason, 'refund')
            self.assertIsNotNone(v.cancelled_at)

    def test_cancel_does_not_touch_already_redeemed(self):
        vouchers = IssuedVoucherService.issue(self.oi)
        IssuedVoucher.objects.filter(pk=vouchers[0].pk).update(
            status='redeemed', redeemed_at=timezone.now()
        )

        IssuedVoucherService.cancel_for_order_item(self.oi, reason='refund')

        vouchers[0].refresh_from_db()
        self.assertEqual(vouchers[0].status, 'redeemed')
```

- [ ] **Step 2: Run — expect FAIL** (methods not implemented)

- [ ] **Step 3: Add methods to the service**

Append to `voucher_service.py` (inside `IssuedVoucherService`):

```python
    @classmethod
    def expire_batch(cls, now=None):
        """Transition active vouchers past expiry to status='expired'. Returns count."""
        now = now or timezone.now()
        return IssuedVoucher.objects.filter(
            status='active', expires_at__lt=now
        ).update(status='expired')

    @classmethod
    def cancel_for_order_item(cls, order_item, reason=''):
        """Cancel all active vouchers belonging to the given order_item. Returns count."""
        now = timezone.now()
        return IssuedVoucher.objects.filter(
            order_item=order_item, status='active'
        ).update(status='cancelled', cancelled_at=now, cancellation_reason=reason)
```

- [ ] **Step 4: Run tests + commit**

```bash
python manage.py test marking_vouchers.tests.test_voucher_service -v 2
```

Expected: all PASS.

```bash
git add backend/django_Admin3/marking_vouchers/services/voucher_service.py \
        backend/django_Admin3/marking_vouchers/tests/test_voucher_service.py
git commit -m "feat(marking_vouchers): add expire_batch + cancel_for_order_item to service"
```

---

## Task 16: Backfill `IssuedVoucher` rows for historical order items

**Files:**
- Create: `backend/django_Admin3/orders/migrations/0006_order_item_backfill_issued_vouchers.py`

- [ ] **Step 1: Write data-migration**

```python
"""For every historical OrderItem whose purchasable.kind='marking_voucher',
create quantity IssuedVoucher rows, dated from the order's created_at.
"""
from datetime import timedelta
from django.db import migrations


def backfill(apps, schema_editor):
    OrderItem = apps.get_model('orders', 'OrderItem')
    IssuedVoucher = apps.get_model('marking_vouchers', 'IssuedVoucher')
    GenericItem = apps.get_model('store', 'GenericItem')

    # We can't import service here (apps frozen) — inline the minimum logic.
    import base64, secrets
    from django.utils import timezone

    for oi in OrderItem.objects.select_related('order', 'purchasable').filter(
        purchasable__kind='marking_voucher'
    ).iterator(chunk_size=200):
        # Skip if already issued (idempotent)
        if IssuedVoucher.objects.filter(order_item_id=oi.id).exists():
            continue

        try:
            gi = GenericItem.objects.get(purchasable_ptr_id=oi.purchasable_id)
            validity = gi.validity_period_days or 1460
        except GenericItem.DoesNotExist:
            validity = 1460

        issued_at = oi.order.created_at if hasattr(oi.order, 'created_at') else timezone.now()
        expires_at = issued_at + timedelta(days=validity)
        is_expired = expires_at < timezone.now()

        rows = []
        for _ in range(oi.quantity):
            random = base64.b32encode(secrets.token_bytes(5)).decode('ascii').rstrip('=')
            code = f"MV-{issued_at.strftime('%Y%m')}-{random}"
            rows.append(IssuedVoucher(
                voucher_code=code,
                order_item_id=oi.id,
                purchasable_id=oi.purchasable_id,
                issued_at=issued_at,
                expires_at=expires_at,
                status='expired' if is_expired else 'active',
            ))
        IssuedVoucher.objects.bulk_create(rows, batch_size=500)


def reverse(apps, schema_editor):
    IssuedVoucher = apps.get_model('marking_vouchers', 'IssuedVoucher')
    IssuedVoucher.objects.all().delete()


class Migration(migrations.Migration):
    dependencies = [
        ('orders', '0005_order_item_backfill_purchasable'),
        ('marking_vouchers', '0003_create_issued_voucher'),
    ]
    operations = [migrations.RunPython(backfill, reverse)]
```

- [ ] **Step 2: Migrate + verify**

```bash
python manage.py migrate orders
```

SQL verification:

```sql
SELECT COUNT(*) FROM acted.issued_vouchers;
SELECT COUNT(*) FROM acted.order_items oi
  JOIN acted.purchasables p ON p.id = oi.purchasable_id
  WHERE p.kind = 'marking_voucher';
-- second count * avg_quantity should roughly match first count
```

- [ ] **Step 3: Commit**

```bash
git add backend/django_Admin3/orders/migrations/0006_order_item_backfill_issued_vouchers.py
git commit -m "feat(marking_vouchers): backfill IssuedVoucher for historical orders"
```

---

## Task 17: Wire `IssuedVoucherService.issue()` into order-confirmation flow

**Files:**
- Modify: the existing order-confirmation entry point (typically a signal or a view/service in `orders/` or `cart/`)

**Investigation first:** locate where orders transition to "confirmed" — grep for `order.save` / `order.status =` / payment-webhook handlers.

```bash
grep -rn "order.*status.*confirm\|PAID\|payment_success" backend/django_Admin3/orders/ backend/django_Admin3/cart/ backend/django_Admin3/tyl_payment_methods/
```

**Likely location:** checkout/payment webhook handler (probably in a cart view or a `tyl_payment_methods` callback). The codebase may not have a single `confirm_order` service today — if so, **create one** as part of this task: a thin function `orders.services.confirmation.confirm_order(order)` that the existing webhook/handler calls. Every subsequent task (and Task 21's E2E test) references this function by name, so extracting it is load-bearing.

- [ ] **Step 1: Identify the confirmation hook** (or decide to create a new `orders.services.confirmation.confirm_order` wrapper that the existing hook calls). Record the file/function and the decision in the commit message.

- [ ] **Step 2: Write a failing integration test**

Create (or extend) a test in the orders app, e.g. `orders/tests/test_confirmation_hook.py`:

```python
"""When an order is confirmed, IssuedVoucher rows are created for voucher items."""
from django.test import TestCase
from django.contrib.auth import get_user_model
from store.models import GenericItem
from orders.models import Order, OrderItem
from marking_vouchers.models import IssuedVoucher


class OrderConfirmationIssuesVouchersTests(TestCase):
    def test_confirming_an_order_creates_issued_vouchers(self):
        User = get_user_model()
        user = User.objects.create_user(username='u', password='p', email='u@x')
        gi = GenericItem.objects.create(
            kind='marking_voucher', code='MV-CONF', name='V', validity_period_days=1460,
        )
        order = Order.objects.create(user=user)
        OrderItem.objects.create(order=order, purchasable_id=gi.pk, quantity=2)

        from orders.services.confirmation import confirm_order
        confirm_order(order)

        self.assertEqual(IssuedVoucher.objects.filter(order_item__order=order).count(), 2)
```

- [ ] **Step 3: Run — expect FAIL**

- [ ] **Step 4: Wire the service call into the confirmation function/signal**

Inside the confirmation function (exact path to be located in Step 1), add:

```python
from marking_vouchers.services.voucher_service import IssuedVoucherService

def confirm_order(order):
    # ... existing logic ...
    for item in order.items.select_related('purchasable').filter(purchasable__kind='marking_voucher'):
        IssuedVoucherService.issue(item)
```

Make the call **idempotent** — check `item.issued_vouchers.exists()` before issuing, so retried confirmations don't double-issue.

- [ ] **Step 5: Run test + commit**

```bash
python manage.py test orders.tests.test_confirmation_hook -v 2
git add <touched files>
git commit -m "feat(orders): issue IssuedVouchers on order confirmation"
```

---

## Task 18: Update cart/order serializers to expose `purchasable`

**Files:**
- Modify: `backend/django_Admin3/cart/serializers.py`
- Modify: `backend/django_Admin3/orders/serializers.py`
- Modify: respective test files

- [ ] **Step 1: Inspect current serializers**

```bash
grep -n "product\|marking_voucher\|item_type" backend/django_Admin3/cart/serializers.py backend/django_Admin3/orders/serializers.py
```

- [ ] **Step 2: Write failing test**

Append to cart/orders serializer test files, e.g.:

```python
def test_cart_item_serializer_exposes_purchasable(self):
    from store.models import Purchasable
    p = Purchasable.objects.create(kind='marking_voucher', code='MV-S', name='S')
    cart = Cart.objects.create(user=self.user)
    item = CartItem.objects.create(cart=cart, purchasable=p, quantity=1)
    data = CartItemSerializer(item).data
    self.assertIn('purchasable', data)
    self.assertEqual(data['purchasable']['code'], 'MV-S')
    # Legacy fields still present for frontend compatibility.
    self.assertIn('item_type', data)
```

- [ ] **Step 3: Modify serializer**

Add a nested `PurchasableSerializer` and include it. Keep legacy fields emitted (read-only) for one release via `@property` on the model:

```python
# In serializers.py (cart or orders)
from store.models import Purchasable

class PurchasableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Purchasable
        fields = ['id', 'kind', 'code', 'name', 'description', 'dynamic_pricing']


class CartItemSerializer(serializers.ModelSerializer):
    purchasable = PurchasableSerializer(read_only=True)

    class Meta:
        model = CartItem
        fields = [
            'id', 'purchasable',
            # legacy (derived via backward-compat properties on the model):
            'product', 'marking_voucher', 'item_type',
            'quantity', 'price_type', 'actual_price',
            'net_amount', 'vat_amount', 'gross_amount', 'vat_rate',
            'metadata',
        ]
```

The legacy `product` / `marking_voucher` / `item_type` rely on backward-compat properties (added in Task 19).

- [ ] **Step 4: Run test + commit**

```bash
python manage.py test cart orders -v 2
git add backend/django_Admin3/cart/serializers.py backend/django_Admin3/orders/serializers.py <tests>
git commit -m "feat(api): expose Purchasable on cart/order serializers"
```

---

## Task 19: Add backward-compat shim properties to CartItem / OrderItem

**Files:**
- Modify: `backend/django_Admin3/cart/models/cart_item.py`
- Modify: `backend/django_Admin3/orders/models/order_item.py`
- Modify: respective test files

- [ ] **Step 1: Write failing test**

```python
def test_backward_compat_product_property(self):
    from store.models import Product
    cart = Cart.objects.create(user=self.user)
    product = Product.objects.first()
    if product is None:
        self.skipTest("no seeded Product")
    item = CartItem.objects.create(cart=cart, purchasable=product.purchasable_ptr, quantity=1)
    self.assertEqual(item.product, product)

def test_backward_compat_marking_voucher_property(self):
    from store.models import GenericItem
    gi = GenericItem.objects.create(kind='marking_voucher', code='X', name='X')
    cart = Cart.objects.create(user=self.user)
    item = CartItem.objects.create(cart=cart, purchasable=gi.purchasable_ptr, quantity=1)
    self.assertEqual(item.marking_voucher, gi)

def test_backward_compat_item_type_property(self):
    from store.models import GenericItem
    gi = GenericItem.objects.create(kind='marking_voucher', code='Y', name='Y')
    cart = Cart.objects.create(user=self.user)
    item = CartItem.objects.create(cart=cart, purchasable=gi.purchasable_ptr, quantity=1)
    self.assertEqual(item.item_type, 'marking_voucher')
```

- [ ] **Step 2: Run — expect FAIL (old `product` / `marking_voucher` are DB FKs, not shims yet; `item_type` still a DB field)**

- [ ] **Step 3: Add shim properties**

Add to `CartItem` (and identically to `OrderItem`):

```python
    # Backward-compat: these replace the old FK fields for new code paths.
    # Remove in Release B (Task 23) after callers migrate to .purchasable.*
    @property
    def product_shim(self):
        """Returns the Product subclass instance if purchasable.kind == 'product'."""
        if self.purchasable_id is None:
            return None
        try:
            return self.purchasable.product
        except Exception:
            return None

    @property
    def marking_voucher_shim(self):
        """Returns the GenericItem with kind='marking_voucher' or None."""
        if self.purchasable_id is None or self.purchasable.kind != 'marking_voucher':
            return None
        try:
            return self.purchasable.genericitem
        except Exception:
            return None
```

**Naming note**: the DB fields `product` and `marking_voucher` still exist until Release B. We can't shadow them with properties while they remain columns. So in Release A we expose `product_shim` / `marking_voucher_shim`. Serializer (Task 18) wires the serializer field `product` to `product_shim` when the DB column is nullable/empty:

```python
class CartItemSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()
    marking_voucher = serializers.SerializerMethodField()
    item_type = serializers.SerializerMethodField()

    def get_product(self, obj):
        p = obj.product_id and obj.product or obj.product_shim
        return ProductSerializer(p).data if p else None

    def get_marking_voucher(self, obj):
        v = obj.marking_voucher_id and obj.marking_voucher or obj.marking_voucher_shim
        return MarkingVoucherSerializer(v).data if v else None

    def get_item_type(self, obj):
        if obj.item_type:          # legacy column still populated
            return obj.item_type
        return obj.purchasable.kind if obj.purchasable_id else None
```

In Release B, after dropping legacy columns, rename `product_shim` → `product` and `marking_voucher_shim` → `marking_voucher` (Task 23).

- [ ] **Step 4: Run tests + commit**

```bash
python manage.py test cart orders -v 2
git add backend/django_Admin3/cart/models/cart_item.py \
        backend/django_Admin3/orders/models/order_item.py \
        <test files>
git commit -m "feat(cart,orders): add backward-compat shims for purchasable transition"
```

---

## Task 20: Register new models in Django admin

**Files:**
- Modify: `backend/django_Admin3/store/admin.py`
- Modify: `backend/django_Admin3/marking_vouchers/admin.py`

- [ ] **Step 1: Register `Purchasable`, `GenericItem`, `IssuedVoucher`**

Append to `store/admin.py`:

```python
from store.models import Purchasable, GenericItem

@admin.register(Purchasable)
class PurchasableAdmin(admin.ModelAdmin):
    list_display = ('code', 'kind', 'name', 'is_active', 'dynamic_pricing')
    list_filter = ('kind', 'is_active', 'dynamic_pricing')
    search_fields = ('code', 'name')

@admin.register(GenericItem)
class GenericItemAdmin(admin.ModelAdmin):
    list_display = ('code', 'kind', 'name', 'validity_period_days', 'is_active')
    list_filter = ('kind', 'is_active')
    search_fields = ('code', 'name')
```

Append to `marking_vouchers/admin.py`:

```python
from marking_vouchers.models import IssuedVoucher

@admin.register(IssuedVoucher)
class IssuedVoucherAdmin(admin.ModelAdmin):
    list_display = ('voucher_code', 'status', 'issued_at', 'expires_at', 'order_item')
    list_filter = ('status',)
    search_fields = ('voucher_code',)
    readonly_fields = ('voucher_code', 'issued_at', 'order_item', 'purchasable')
```

- [ ] **Step 2: Smoke-test admin**

Run dev server, open `/admin/`, verify the three changelists load and allow creation of `Purchasable` and `GenericItem`.

- [ ] **Step 3: Commit**

```bash
git add backend/django_Admin3/store/admin.py backend/django_Admin3/marking_vouchers/admin.py
git commit -m "feat(admin): register Purchasable, GenericItem, IssuedVoucher"
```

---

## Task 21: End-to-end smoke test + soak branch

**Files:**
- Create: `backend/django_Admin3/tests/integration/test_purchasable_e2e.py`

- [ ] **Step 1: Write an end-to-end test**

```python
"""End-to-end: add voucher to cart, checkout, confirm, vouchers issued."""
from django.test import TestCase
from django.contrib.auth import get_user_model
from store.models import GenericItem, Price
from cart.models import Cart, CartItem
from orders.models import Order, OrderItem
from orders.services.confirmation import confirm_order
from marking_vouchers.models import IssuedVoucher
from decimal import Decimal


class PurchasableEndToEndTests(TestCase):
    def test_voucher_purchase_flow(self):
        User = get_user_model()
        user = User.objects.create_user(username='e2e', password='p', email='e2e@x')
        gi = GenericItem.objects.create(
            kind='marking_voucher', code='MV-E2E', name='E2E Voucher',
            validity_period_days=1460,
        )
        Price.objects.create(purchasable_id=gi.pk, price_type='standard', amount=Decimal('50.00'))

        cart = Cart.objects.create(user=user)
        CartItem.objects.create(cart=cart, purchasable_id=gi.pk, quantity=2)

        # simulate checkout → order creation (depends on existing checkout service)
        order = Order.objects.create(user=user)
        OrderItem.objects.create(order=order, purchasable_id=gi.pk, quantity=2)

        confirm_order(order)

        vouchers = IssuedVoucher.objects.filter(order_item__order=order)
        self.assertEqual(vouchers.count(), 2)
        self.assertTrue(all(v.status == 'active' for v in vouchers))
        self.assertTrue(all(v.voucher_code.startswith('MV-') for v in vouchers))
```

- [ ] **Step 2: Run full test suite**

```bash
python manage.py test -v 2
python manage.py test --tag integration -v 2 || true   # if tags used
```

Expected: all pre-existing tests PASS + new test PASSES. If any pre-existing test fails, investigate — Release A is meant to be backward-compatible.

- [ ] **Step 3: Cut a soak branch / PR**

```bash
git checkout -b release/purchasable-unification-a
git push origin release/purchasable-unification-a
```

Open a PR titled `Release A: Purchasable unification (additive + backfill)`.

- [ ] **Step 4: Soak on staging for ≥ 1 business day**

- Deploy to staging.
- Run the full test suite.
- Verify `verify_schema_placement` passes.
- Spot-check dev DB: every `cart_items` / `order_items` / `prices` row has `purchasable_id` populated.
- Verify cart/order API responses unchanged for a sample set of existing flows.
- Monitor logs for `RelatedObjectDoesNotExist` or serializer errors.

**Only after soak passes, proceed to Release B.**

---

# Release B — Destructive cleanup

**Pre-flight:** take a full DB snapshot of production immediately before running Release B migrations.

## Task 22: Make `purchasable` NOT NULL everywhere

**Files:**
- Create: `backend/django_Admin3/store/migrations/0012_price_drop_legacy_product_fk.py`
- Create: `backend/django_Admin3/store/migrations/0013_price_purchasable_not_null.py`
- Create: `backend/django_Admin3/cart/migrations/0006_cart_item_purchasable_not_null.py`
- Create: `backend/django_Admin3/orders/migrations/0007_order_item_purchasable_not_null.py`

- [ ] **Step 1: Verify pre-condition**

Before writing any migration, confirm on staging:

```sql
SELECT COUNT(*) FROM acted.cart_items    WHERE purchasable_id IS NULL;  -- 0
SELECT COUNT(*) FROM acted.order_items   WHERE purchasable_id IS NULL;  -- 0
SELECT COUNT(*) FROM acted.prices        WHERE purchasable_id IS NULL;  -- 0
```

If any count > 0, **stop**. Investigate and patch before proceeding.

- [ ] **Step 2: Modify model files — remove `null=True, blank=True` from `purchasable` FKs**

In `cart/models/cart_item.py`:

```python
    purchasable = models.ForeignKey(
        'store.Purchasable',
        on_delete=models.PROTECT,
        related_name='cart_items',
    )
```

Same for `orders/models/order_item.py` and `store/models/price.py`. For `Price`, restore `unique_together`:

```python
    class Meta:
        db_table = '"acted"."prices"'
        unique_together = ('purchasable', 'price_type')
```

- [ ] **Step 3: Generate migrations**

```bash
python manage.py makemigrations cart  --name cart_item_purchasable_not_null
python manage.py makemigrations orders --name order_item_purchasable_not_null
python manage.py makemigrations store  --name price_purchasable_not_null
```

Rename to the numbered files above.

- [ ] **Step 4: Run migrations + tests**

```bash
python manage.py migrate
python manage.py test cart orders store -v 2
```

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/cart/models/cart_item.py \
        backend/django_Admin3/orders/models/order_item.py \
        backend/django_Admin3/store/models/price.py \
        backend/django_Admin3/cart/migrations/0006_cart_item_purchasable_not_null.py \
        backend/django_Admin3/orders/migrations/0007_order_item_purchasable_not_null.py \
        backend/django_Admin3/store/migrations/0013_price_purchasable_not_null.py
git commit -m "feat: make purchasable FK NOT NULL on cart/order/price (Release B)"
```

---

## Task 23: Drop legacy FK columns + check constraints + item_type

**Files:**
- Modify: `backend/django_Admin3/cart/models/cart_item.py`
- Modify: `backend/django_Admin3/orders/models/order_item.py`
- Modify: `backend/django_Admin3/store/models/price.py`
- Modify: `backend/django_Admin3/cart/serializers.py`, `orders/serializers.py`
- Create: `backend/django_Admin3/cart/migrations/0007_cart_item_drop_legacy_fks.py`
- Create: `backend/django_Admin3/orders/migrations/0008_order_item_drop_legacy_fks.py`
- Create: `backend/django_Admin3/store/migrations/0012_price_drop_legacy_product_fk.py`

- [ ] **Step 1: Remove legacy fields from models**

From `CartItem`, delete:
- `product = models.ForeignKey(...)`
- `marking_voucher = models.ForeignKey(...)`
- `item_type = models.CharField(...)`
- `ITEM_TYPE_CHOICES`
- both check constraints named `cart_item_has_*` and `cart_item_not_both_*`

Rename backward-compat properties: `product_shim` → `product`, `marking_voucher_shim` → `marking_voucher`.

Do the same for `OrderItem`.

For `Price`, delete:
- `product = models.ForeignKey(...)`

- [ ] **Step 2: Update serializers**

Remove the `get_product` / `get_marking_voucher` / `get_item_type` SerializerMethodFields in `cart/serializers.py` and `orders/serializers.py`. The serializers now use the renamed properties directly, e.g.:

```python
class CartItemSerializer(serializers.ModelSerializer):
    purchasable = PurchasableSerializer(read_only=True)
    item_type = serializers.CharField(source='purchasable.kind', read_only=True)
    class Meta:
        model = CartItem
        fields = ['id', 'purchasable', 'item_type', 'quantity', 'price_type', 'actual_price',
                  'net_amount', 'vat_amount', 'gross_amount', 'vat_rate', 'metadata']
```

Update any consuming views that referenced `item.product_id` / `item.marking_voucher_id` directly — grep:

```bash
grep -rn "product_id\|marking_voucher_id" backend/django_Admin3/cart backend/django_Admin3/orders
```

Replace with `item.purchasable_id` or `item.purchasable.product` as appropriate.

- [ ] **Step 3: Generate migrations**

```bash
python manage.py makemigrations cart orders store
```

- [ ] **Step 4: Migrate + full test suite**

```bash
python manage.py migrate
python manage.py test -v 2
```

Expected: all PASS. Frontend contract unchanged because `purchasable.kind` is exposed as `item_type`.

- [ ] **Step 5: Commit**

```bash
git add <all modified files>
git commit -m "feat: drop legacy product/marking_voucher FKs and item_type (Release B)"
```

---

## Task 24: Drop `MarkingVoucher` model and table

**Files:**
- Delete: `backend/django_Admin3/marking_vouchers/models/marking_voucher.py`
- Modify: `backend/django_Admin3/marking_vouchers/models/__init__.py` (remove import)
- Modify: `backend/django_Admin3/marking_vouchers/admin.py` (remove MarkingVoucher registration)
- Create: `backend/django_Admin3/marking_vouchers/migrations/0004_drop_marking_voucher.py`
- Modify: any remaining references in views/serializers/tests

- [ ] **Step 1: Grep for remaining usages**

```bash
grep -rn "MarkingVoucher" backend/django_Admin3/ --include='*.py'
```

Remove or update every reference. Common locations: `marking_vouchers/views.py`, `marking_vouchers/serializers.py`, `marking_vouchers/urls.py`, admin.

- [ ] **Step 2: Update `__init__.py` + delete file**

```python
# marking_vouchers/models/__init__.py
from marking_vouchers.models.issued_voucher import IssuedVoucher

__all__ = ['IssuedVoucher']
```

Delete `marking_vouchers/models/marking_voucher.py`.

- [ ] **Step 3: Generate migration**

```bash
python manage.py makemigrations marking_vouchers --name drop_marking_voucher
```

Add a final `RunSQL` to drop the mapping table:

```python
class Migration(migrations.Migration):
    dependencies = [
        ('marking_vouchers', '0003_create_issued_voucher'),
        ('orders', '0006_order_item_backfill_issued_vouchers'),
    ]
    operations = [
        migrations.DeleteModel(name='MarkingVoucher'),
        migrations.RunSQL(
            sql='DROP TABLE IF EXISTS acted._voucher_migration_map;',
            reverse_sql='CREATE TABLE IF NOT EXISTS acted._voucher_migration_map '
                        '(marking_voucher_id INT PRIMARY KEY, purchasable_id INT NOT NULL);',
        ),
    ]
```

- [ ] **Step 4: Migrate + test + verify**

```bash
python manage.py migrate
python manage.py test -v 2
python manage.py verify_schema_placement
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add <all changes>
git commit -m "feat(marking_vouchers): drop MarkingVoucher model and table (Release B)"
```

---

# Validation checklist (end of Release B)

- [ ] All tests pass locally and in CI (`python manage.py test`).
- [ ] Coverage ≥ 80% on changed modules.
- [ ] `python manage.py verify_schema_placement` exits clean.
- [ ] `python manage.py makemigrations --dry-run` shows no pending changes.
- [ ] Frontend cart and order pages render unchanged for a sample user.
- [ ] VAT calculation parity — snapshot a sample of historical orders' VAT totals before Release A; after Release B, re-compute and diff. Diff must be 0.
- [ ] No occurrences of `MarkingVoucher`, `item.product_id` (direct), `item.marking_voucher_id` in backend code.
- [ ] Admin can create new Purchasable + GenericItem rows for each kind (voucher, binder, additional_charge) and they show up in a test cart.

---

# Appendix: Out-of-scope follow-ups

Tracked in spec §7 — created as separate tickets after Release B:

1. Voucher redemption endpoint + `redeemed_by_user` / `redeemed_for` fields.
2. Frontend admin UI for creating generic items without Django admin.
3. Bundle support for generic items (if required).
4. Remove backward-compat shims once confirmed unused for one full release.
5. Scheduled expiry job wiring (celery beat entry for `IssuedVoucherService.expire_batch`).
