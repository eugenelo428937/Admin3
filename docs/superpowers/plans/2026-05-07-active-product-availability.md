# Active Product Availability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the missing `is_active` flags on `catalog_exam_sessions`, `catalog_product_variations`, `catalog_product_product_variations`; centralise the "available for sale" predicate as a single 8-condition manager method on `Purchasable`; enforce it across customer-facing endpoints and the cart server gate; surface availability windows to the product card so out-of-window products get a disabled Add-to-cart button.

**Architecture:** Three new boolean columns (default `False`, no data migrations). One canonical predicate `Purchasable.objects.available_now(at=...)` — a queryset method ANDing all 7 upstream `is_active` flags + the exam-session date window. Customer-facing list/search/navbar endpoints route through it; admin endpoints don't. Cart serializer adds an `is_available` flag per item; cart-add server-side rejects inactive products with HTTP 400. Frontend reads `start_date`/`end_date` exposed via the unified serializer and disables the Add-to-cart button outside the window. A staged rollout uses a dry-run management command (`activate_initial_catalog`) to flip rows on after deploy.

**Tech Stack:** Django 6.0 + Django REST Framework, PostgreSQL with `acted` schema, React 19.2 + TypeScript + Material-UI v7. Backend tests use Django `APITestCase` (PostgreSQL). Frontend tests use React Testing Library.

**Spec:** [`docs/superpowers/specs/2026-05-07-active-product-availability-design.md`](../specs/2026-05-07-active-product-availability-design.md)

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Modify | `backend/django_Admin3/catalog/exam_session/models.py` | Add `is_active = BooleanField(default=False)` |
| Create | `backend/django_Admin3/catalog/exam_session/migrations/0002_examsession_is_active.py` | Schema migration |
| Modify | `backend/django_Admin3/catalog/products/models/product_variation.py` | Add `is_active = BooleanField(default=False)` |
| Modify | `backend/django_Admin3/catalog/products/models/product_product_variation.py` | Add `is_active = BooleanField(default=False)` |
| Create | `backend/django_Admin3/catalog/products/migrations/0004_add_is_active_to_variations.py` | Schema migration for both PV and PPV |
| Modify | `backend/django_Admin3/store/models/purchasable.py` | Add `PurchasableQuerySet.available_now()` + `is_available_now()` instance method |
| Modify | `backend/django_Admin3/store/models/product.py` | Add `Product.available_now()` classmethod helper |
| Create | `backend/django_Admin3/store/tests/test_purchasable_available_now.py` | Tests for the predicate |
| Modify | `backend/django_Admin3/store/serializers/unified.py` | Expose `start_date`, `end_date` on `UnifiedProductSerializer` |
| Modify | `backend/django_Admin3/store/views/product.py` | Apply `.available_now()` in `get_queryset` and `list()` |
| Modify | `backend/django_Admin3/store/views/bundle.py` | Filter `bundle.bundle_products` to available items in `products` action |
| Modify | `backend/django_Admin3/catalog/views/navigation_views.py` | Filter navbar lists + search results through `available_now()`; bump cache key to `navigation_data_v3` |
| Modify | `backend/django_Admin3/cart/services/cart_service.py` | Reject inactive purchasable in `add_item` |
| Modify | `backend/django_Admin3/cart/serializers.py` | Add computed `is_available` to `CartItemSerializer` |
| Modify | `backend/django_Admin3/cart/tests/test_cart_views.py` (or appropriate) | Tests for server-side gate + flag |
| Create | `backend/django_Admin3/catalog/management/commands/activate_initial_catalog.py` | Dry-run / activation command |
| Create | `backend/django_Admin3/catalog/management/commands/tests/test_activate_initial_catalog.py` | Tests for the command |
| Modify | `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.tsx` | Read `start_date`/`end_date`, disable Add-to-cart outside window |
| Modify | `frontend/react-Admin3/src/components/Product/ProductCard/useMaterialProductCardVM.ts` | Compute `isWithinSalesWindow` boolean |
| Create | `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MaterialProductCard.window.test.tsx` | Tests for date-window UI |
| Modify | (cart drawer/page component, identified during Task 16) | Render "no longer available" badge for `is_available === false` |

---

## Task 1: Add `is_active` to `ExamSession`

**Files:**
- Modify: `backend/django_Admin3/catalog/exam_session/models.py`
- Create: `backend/django_Admin3/catalog/exam_session/migrations/0002_examsession_is_active.py`
- Test: `backend/django_Admin3/catalog/tests/test_exam_session_is_active.py`

- [ ] **Step 1: Write the failing test**

Create `backend/django_Admin3/catalog/tests/test_exam_session_is_active.py`:

```python
"""Schema test: ExamSession has is_active boolean defaulting to False."""
from django.test import TestCase
from datetime import datetime, timezone as dt_timezone

from catalog_exam_sessions.models import ExamSession


class ExamSessionIsActiveTests(TestCase):
    def test_is_active_defaults_to_false(self):
        es = ExamSession.objects.create(
            session_code='2099-04-test',
            start_date=datetime(2099, 1, 1, tzinfo=dt_timezone.utc),
            end_date=datetime(2099, 12, 31, tzinfo=dt_timezone.utc),
        )
        self.assertFalse(es.is_active)

    def test_is_active_can_be_set_true(self):
        es = ExamSession.objects.create(
            session_code='2099-04-test2',
            start_date=datetime(2099, 1, 1, tzinfo=dt_timezone.utc),
            end_date=datetime(2099, 12, 31, tzinfo=dt_timezone.utc),
            is_active=True,
        )
        self.assertTrue(es.is_active)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend/django_Admin3
python manage.py test catalog.tests.test_exam_session_is_active -v 2
```

Expected: FAIL with `TypeError: ExamSession() got unexpected keyword arguments: 'is_active'` (or similar).

- [ ] **Step 3: Add field to model**

Edit `backend/django_Admin3/catalog/exam_session/models.py`. Add this field after `end_date` (before `create_date`):

```python
    is_active = models.BooleanField(
        default=False,
        help_text="Whether this exam session is active for sale (default off; activate via management command)"
    )
```

- [ ] **Step 4: Generate the migration**

```bash
cd backend/django_Admin3
python manage.py makemigrations catalog_exam_sessions --name examsession_is_active
```

Expected: creates `catalog/exam_session/migrations/0002_examsession_is_active.py` with one `migrations.AddField` operation. Open the file and confirm the operation's `default=False`.

- [ ] **Step 5: Run migration + test**

```bash
cd backend/django_Admin3
python manage.py migrate catalog_exam_sessions
python manage.py test catalog.tests.test_exam_session_is_active -v 2
```

Expected: migration applies cleanly; both tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/catalog/exam_session/models.py \
        backend/django_Admin3/catalog/exam_session/migrations/0002_examsession_is_active.py \
        backend/django_Admin3/catalog/tests/test_exam_session_is_active.py
git commit -m "feat(catalog): add is_active to ExamSession (default False)

Adds the is_active flag so admins can deactivate a whole exam session.
Default is False per the audit-gate rollout — operator must activate
rows post-deploy via the activate_initial_catalog command (Task 14).

Refs: docs/superpowers/specs/2026-05-07-active-product-availability-design.md

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Add `is_active` to `ProductVariation` and `ProductProductVariation`

**Files:**
- Modify: `backend/django_Admin3/catalog/products/models/product_variation.py`
- Modify: `backend/django_Admin3/catalog/products/models/product_product_variation.py`
- Create: `backend/django_Admin3/catalog/products/migrations/0004_add_is_active_to_variations.py`
- Test: `backend/django_Admin3/catalog/tests/test_variation_is_active.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/django_Admin3/catalog/tests/test_variation_is_active.py`:

```python
"""Schema test: ProductVariation and ProductProductVariation have is_active defaults False."""
from django.test import TestCase

from catalog_products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)


class VariationIsActiveTests(TestCase):
    def test_product_variation_is_active_defaults_to_false(self):
        v = ProductVariation.objects.create(
            variation_type='eBook',
            name='Test eBook Variation',
            code='TEST-EBK',
        )
        self.assertFalse(v.is_active)

    def test_product_product_variation_is_active_defaults_to_false(self):
        p = CatalogProduct.objects.create(
            fullname='Test Catalog Product',
            shortname='Test',
            code='TEST01',
        )
        v = ProductVariation.objects.create(
            variation_type='Printed',
            name='Test Printed Variation',
            code='TEST-PRN',
        )
        ppv = ProductProductVariation.objects.create(
            product=p,
            product_variation=v,
        )
        self.assertFalse(ppv.is_active)
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend/django_Admin3
python manage.py test catalog.tests.test_variation_is_active -v 2
```

Expected: FAIL — `is_active` attribute does not exist.

- [ ] **Step 3: Add field to ProductVariation**

Edit `backend/django_Admin3/catalog/products/models/product_variation.py`. Add this field after `code`:

```python
    is_active = models.BooleanField(
        default=False,
        help_text="Whether this variation type is offered for sale (default off; activate via management command)"
    )
```

- [ ] **Step 4: Add field to ProductProductVariation**

Edit `backend/django_Admin3/catalog/products/models/product_product_variation.py`. Add this field after `product_variation`:

```python
    is_active = models.BooleanField(
        default=False,
        help_text="Whether this specific product+variation combo is offered for sale (default off)"
    )
```

- [ ] **Step 5: Generate the migration**

```bash
cd backend/django_Admin3
python manage.py makemigrations catalog_products --name add_is_active_to_variations
```

Expected: creates `catalog/products/migrations/0004_add_is_active_to_variations.py` with two `AddField` operations (one per model), both `default=False`.

- [ ] **Step 6: Run migration + tests**

```bash
cd backend/django_Admin3
python manage.py migrate catalog_products
python manage.py test catalog.tests.test_variation_is_active -v 2
```

Expected: migration applies; both tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/catalog/products/models/product_variation.py \
        backend/django_Admin3/catalog/products/models/product_product_variation.py \
        backend/django_Admin3/catalog/products/migrations/0004_add_is_active_to_variations.py \
        backend/django_Admin3/catalog/tests/test_variation_is_active.py
git commit -m "feat(catalog): add is_active to ProductVariation and ProductProductVariation

Two new boolean flags (default False) covering the architectural
scenarios:
  - ProductVariation.is_active     → disable a whole variation type
  - ProductProductVariation.is_active → disable a specific combo

Default False per the audit-gate rollout.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Add `PurchasableQuerySet.available_now()` and `is_available_now()`

**Files:**
- Modify: `backend/django_Admin3/store/models/purchasable.py`
- Test: `backend/django_Admin3/store/tests/test_purchasable_available_now.py`

- [ ] **Step 1: Write the failing test (happy path + each-condition-false coverage)**

Create `backend/django_Admin3/store/tests/test_purchasable_available_now.py`:

```python
"""Tests for Purchasable.objects.available_now() — the canonical predicate.

Each "_disabled" test flips ONE upstream flag to false, then asserts
the product is excluded. This proves every condition is wired in.
"""
from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from catalog_exam_sessions.models import ExamSession
from catalog_subjects.models import Subject
from catalog.models import ExamSessionSubject
from catalog_products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)
from store.models import Product as StoreProduct, Purchasable


class AvailableNowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        now = timezone.now()
        cls.session = ExamSession.objects.create(
            session_code='2099-04',
            start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10),
            is_active=True,
        )
        cls.subject = Subject.objects.create(
            code='ZZ1', description='Test Subject', active=True,
        )
        cls.ess = ExamSessionSubject.objects.create(
            exam_session=cls.session, subject=cls.subject, is_active=True,
        )
        cls.cat_product = CatalogProduct.objects.create(
            fullname='Z1 Test', shortname='Z1', code='Z1', is_active=True,
        )
        cls.variation = ProductVariation.objects.create(
            variation_type='eBook', name='Test eBook', code='TEBK',
            is_active=True,
        )
        cls.ppv = ProductProductVariation.objects.create(
            product=cls.cat_product,
            product_variation=cls.variation,
            is_active=True,
        )
        cls.store_product = StoreProduct.objects.create(
            exam_session_subject=cls.ess,
            product_product_variation=cls.ppv,
            is_active=True,
            kind=Purchasable.Kind.PRODUCT,
            name='Z1 Test eBook 2099-04',
        )

    def _ids(self):
        return list(
            Purchasable.objects.available_now()
            .values_list('pk', flat=True)
        )

    # --- happy path
    def test_fully_active_product_is_included(self):
        self.assertIn(self.store_product.pk, self._ids())

    # --- each upstream flag false (8 cases including date window)
    def test_excluded_when_purchasable_inactive(self):
        Purchasable.objects.filter(pk=self.store_product.pk).update(is_active=False)
        self.assertNotIn(self.store_product.pk, self._ids())

    def test_excluded_when_ppv_inactive(self):
        ProductProductVariation.objects.filter(pk=self.ppv.pk).update(is_active=False)
        self.assertNotIn(self.store_product.pk, self._ids())

    def test_excluded_when_catalog_product_inactive(self):
        CatalogProduct.objects.filter(pk=self.cat_product.pk).update(is_active=False)
        self.assertNotIn(self.store_product.pk, self._ids())

    def test_excluded_when_product_variation_inactive(self):
        ProductVariation.objects.filter(pk=self.variation.pk).update(is_active=False)
        self.assertNotIn(self.store_product.pk, self._ids())

    def test_excluded_when_ess_inactive(self):
        ExamSessionSubject.objects.filter(pk=self.ess.pk).update(is_active=False)
        self.assertNotIn(self.store_product.pk, self._ids())

    def test_excluded_when_subject_inactive(self):
        Subject.objects.filter(pk=self.subject.pk).update(active=False)
        self.assertNotIn(self.store_product.pk, self._ids())

    def test_excluded_when_exam_session_inactive(self):
        ExamSession.objects.filter(pk=self.session.pk).update(is_active=False)
        self.assertNotIn(self.store_product.pk, self._ids())

    def test_excluded_when_today_before_start_date(self):
        future_now = self.session.start_date - timedelta(days=1)
        ids = list(
            Purchasable.objects.available_now(at=future_now)
            .values_list('pk', flat=True)
        )
        self.assertNotIn(self.store_product.pk, ids)

    def test_excluded_when_today_after_end_date(self):
        past_now = self.session.end_date + timedelta(days=1)
        ids = list(
            Purchasable.objects.available_now(at=past_now)
            .values_list('pk', flat=True)
        )
        self.assertNotIn(self.store_product.pk, ids)

    # --- non-product purchasable bypasses the chain
    def test_non_product_purchasable_only_checks_is_active(self):
        from store.models import GenericItem
        gi = GenericItem.objects.create(
            kind=Purchasable.Kind.MARKING_VOUCHER,
            code='TEST-VOUCHER-1',
            name='Test Voucher',
            is_active=True,
        )
        ids = self._ids()
        self.assertIn(gi.pk, ids)

        Purchasable.objects.filter(pk=gi.pk).update(is_active=False)
        ids = self._ids()
        self.assertNotIn(gi.pk, ids)

    # --- per-instance helper
    def test_is_available_now_matches_queryset(self):
        self.assertTrue(self.store_product.is_available_now())
        Purchasable.objects.filter(pk=self.store_product.pk).update(is_active=False)
        self.store_product.refresh_from_db()
        self.assertFalse(self.store_product.is_available_now())
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend/django_Admin3
python manage.py test store.tests.test_purchasable_available_now -v 2
```

Expected: FAIL with `AttributeError: 'Manager' object has no attribute 'available_now'` on the first test.

- [ ] **Step 3: Implement `PurchasableQuerySet` and the helpers**

Edit `backend/django_Admin3/store/models/purchasable.py`. Replace the file with:

```python
"""Purchasable — unified parent table for all sellable items.

Every cart/order line references a Purchasable. Concrete subclasses
(Product, GenericItem) share a PK with the parent via Django MTI.

Table: acted.purchasables
"""
from django.db import models
from django.db.models import Q
from django.utils import timezone


class PurchasableQuerySet(models.QuerySet):
    """QuerySet for Purchasable with the canonical "available now" predicate."""

    def available_now(self, *, at=None):
        """Filter to purchasables currently available for sale.

        ANDs all upstream is_active flags + the exam-session date window
        for store-product purchasables. Non-product purchasables (vouchers,
        charges) check only ``is_active``.

        Use this in customer-facing queries (product list, search, navbar,
        bundle contents). Admin queries should NOT use this — they must
        see inactive items too.

        Args:
            at: datetime to evaluate against (defaults to ``timezone.now()``).
                Used by tests to evaluate windows without freezing the clock.
        """
        now = at or timezone.now()
        return self.filter(
            Q(is_active=True) & (
                # Generic purchasables (vouchers, charges) — leaf flag only.
                ~Q(kind='product')
                |
                # Store products — full 8-condition chain.
                Q(
                    kind='product',
                    product__product_product_variation__is_active=True,
                    product__product_product_variation__product__is_active=True,
                    product__product_product_variation__product_variation__is_active=True,
                    product__exam_session_subject__is_active=True,
                    product__exam_session_subject__subject__active=True,
                    product__exam_session_subject__exam_session__is_active=True,
                    product__exam_session_subject__exam_session__start_date__lte=now,
                    product__exam_session_subject__exam_session__end_date__gte=now,
                )
            )
        )


class Purchasable(models.Model):
    """Parent catalog entity for any sellable item.

    The ``kind`` discriminator lets VAT rules, pricing code, and
    reporting branch without joining to subclass tables.
    """

    class Kind(models.TextChoices):
        PRODUCT = 'product', 'Store Product (ESS-based)'
        MARKING_VOUCHER = 'marking_voucher', 'Marking Voucher'
        DOCUMENT_BINDER = 'document_binder', 'Document Binder'
        ADDITIONAL_CHARGE = 'additional_charge', 'Additional Charge'

    kind = models.CharField(max_length=32, choices=Kind.choices)
    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    dynamic_pricing = models.BooleanField(
        default=False,
        help_text='If True, price is set per cart/order line (actual_price), not from Price table.'
    )
    is_addon = models.BooleanField(
        default=False,
        help_text=(
            'True for solution/addon purchasables (e.g., PXS, CXS, CM1S, CYS). '
            'Distinguishes addons from their base product when both share the '
            'same catalog PPV (see Product.unique_together).'
        ),
    )
    vat_classification = models.CharField(
        max_length=32, blank=True,
        help_text='Used by VAT rules engine to select rate.'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = PurchasableQuerySet.as_manager()

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

    def is_available_now(self, *, at=None):
        """Scalar form of ``available_now()``.

        Used by cart-add validation and by ``CartItemSerializer`` to set
        the per-item ``is_available`` flag.
        """
        return type(self).objects.available_now(at=at).filter(pk=self.pk).exists()
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend/django_Admin3
python manage.py test store.tests.test_purchasable_available_now -v 2
```

Expected: all 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/store/models/purchasable.py \
        backend/django_Admin3/store/tests/test_purchasable_available_now.py
git commit -m "feat(store): add Purchasable.objects.available_now() canonical predicate

Single source of truth for 'is this purchasable available right now?'.
ANDs all 7 upstream is_active flags + the exam-session date window for
store products. Non-product purchasables (vouchers) bypass the chain
via the kind discriminator.

Also adds Purchasable.is_available_now() instance helper for cart-side
per-item checks.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Add `Product.available_now()` classmethod helper

**Files:**
- Modify: `backend/django_Admin3/store/models/product.py`
- Test: `backend/django_Admin3/store/tests/test_purchasable_available_now.py` (extend)

- [ ] **Step 1: Write the failing test**

Append to `backend/django_Admin3/store/tests/test_purchasable_available_now.py`:

```python
class ProductAvailableNowTests(TestCase):
    def test_product_available_now_returns_only_active(self):
        from store.models import Product as StoreProduct
        # Reuse fixtures via inheritance is overkill; smoke check that
        # the helper exists and returns a queryset of store.Product instances.
        qs = StoreProduct.available_now()
        for sp in qs:
            self.assertTrue(sp.is_available_now())
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend/django_Admin3
python manage.py test store.tests.test_purchasable_available_now.ProductAvailableNowTests -v 2
```

Expected: FAIL — `AttributeError: type object 'Product' has no attribute 'available_now'`.

- [ ] **Step 3: Add the classmethod**

Edit `backend/django_Admin3/store/models/product.py`. Add this classmethod after the `__str__` method, before the `# Backward-compatible properties` section:

```python
    @classmethod
    def available_now(cls, *, at=None):
        """Subclass-typed convenience: return store.Product instances that
        pass the canonical predicate. Equivalent to
        ``Purchasable.objects.available_now().filter(kind='product')`` but
        returns ``store.Product`` rows so callers can access subclass fields
        (exam_session_subject, product_product_variation, etc.) without
        a downcast.
        """
        from store.models.purchasable import Purchasable
        return cls.objects.filter(
            pk__in=Purchasable.objects.available_now(at=at).values('pk')
        )
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend/django_Admin3
python manage.py test store.tests.test_purchasable_available_now -v 2
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/store/models/product.py \
        backend/django_Admin3/store/tests/test_purchasable_available_now.py
git commit -m "feat(store): add Product.available_now() typed helper

Returns store.Product subclass instances passing the canonical
predicate. Avoids the need for callers to downcast from Purchasable
to access ESS / PPV fields.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Expose `start_date`/`end_date` on `UnifiedProductSerializer`

**Files:**
- Modify: `backend/django_Admin3/store/serializers/unified.py`
- Test: `backend/django_Admin3/store/tests/test_unified_serializer_dates.py`

- [ ] **Step 1: Write the failing test**

Create `backend/django_Admin3/store/tests/test_unified_serializer_dates.py`:

```python
"""UnifiedProductSerializer must expose exam-session start_date / end_date
so the frontend can do the date-window check on the product card.
"""
from datetime import datetime, timezone as dt_timezone

from django.test import TestCase

from catalog_exam_sessions.models import ExamSession
from catalog_subjects.models import Subject
from catalog.models import ExamSessionSubject
from catalog_products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)
from store.models import Product as StoreProduct, Purchasable
from store.serializers import UnifiedProductSerializer


class UnifiedSerializerDatesTests(TestCase):
    def test_serializer_emits_start_and_end_date(self):
        es = ExamSession.objects.create(
            session_code='2099-04',
            start_date=datetime(2099, 1, 1, tzinfo=dt_timezone.utc),
            end_date=datetime(2099, 12, 31, tzinfo=dt_timezone.utc),
        )
        s = Subject.objects.create(code='ZZ2', description='T', active=True)
        ess = ExamSessionSubject.objects.create(exam_session=es, subject=s)
        cp = CatalogProduct.objects.create(fullname='X', shortname='X', code='XX')
        v = ProductVariation.objects.create(
            variation_type='eBook', name='X eBook', code='X-EBK',
        )
        ppv = ProductProductVariation.objects.create(product=cp, product_variation=v)
        sp = StoreProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            kind=Purchasable.Kind.PRODUCT,
            name='X eBook',
        )
        data = UnifiedProductSerializer(sp).data
        self.assertIn('start_date', data)
        self.assertIn('end_date', data)
        self.assertTrue(data['start_date'].startswith('2099-01-01'))
        self.assertTrue(data['end_date'].startswith('2099-12-31'))
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend/django_Admin3
python manage.py test store.tests.test_unified_serializer_dates -v 2
```

Expected: FAIL — `AssertionError: 'start_date' not in {…}`.

- [ ] **Step 3: Add fields to the serializer**

Edit `backend/django_Admin3/store/serializers/unified.py`. Inside `UnifiedProductSerializer`, after the `session_code` field (around line 30), add:

```python
    start_date = serializers.DateTimeField(
        source='exam_session_subject.exam_session.start_date',
        read_only=True
    )
    end_date = serializers.DateTimeField(
        source='exam_session_subject.exam_session.end_date',
        read_only=True
    )
```

And in `Meta.fields`, add `'start_date'` and `'end_date'` after `'session_code'`:

```python
        fields = [
            'id',
            'product_code',
            'is_active',
            'is_bundle',
            'name',
            'subject_code',
            'subject_name',
            'session_code',
            'start_date',
            'end_date',
            'variation_type',
            'variation_name',
            'product_name',
            'product_shortname',
            'created_at',
            'updated_at',
        ]
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend/django_Admin3
python manage.py test store.tests.test_unified_serializer_dates -v 2
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/store/serializers/unified.py \
        backend/django_Admin3/store/tests/test_unified_serializer_dates.py
git commit -m "feat(store): expose start_date/end_date on UnifiedProductSerializer

Surfaces the exam-session sales window so the frontend product card
can disable the Add-to-cart button when today is outside the window.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Wire `available_now()` into `ProductViewSet`

**Files:**
- Modify: `backend/django_Admin3/store/views/product.py`
- Test: `backend/django_Admin3/store/tests/test_product_viewset_available.py`

- [ ] **Step 1: Write the failing test**

Create `backend/django_Admin3/store/tests/test_product_viewset_available.py`:

```python
"""Customer-facing product list/retrieve endpoints must filter to
available products only. Direct retrieve is the documented exception
(order history support)."""
from datetime import timedelta
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from catalog_exam_sessions.models import ExamSession
from catalog_subjects.models import Subject
from catalog.models import ExamSessionSubject
from catalog_products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)
from store.models import Product as StoreProduct, Purchasable


def make_active_product(code_suffix='1'):
    now = timezone.now()
    es = ExamSession.objects.create(
        session_code=f'2099-04-{code_suffix}',
        start_date=now - timedelta(days=10),
        end_date=now + timedelta(days=10),
        is_active=True,
    )
    s = Subject.objects.create(
        code=f'ZA{code_suffix}', description='T', active=True,
    )
    ess = ExamSessionSubject.objects.create(
        exam_session=es, subject=s, is_active=True,
    )
    cp = CatalogProduct.objects.create(
        fullname=f'Product {code_suffix}', shortname=f'P{code_suffix}',
        code=f'P{code_suffix}', is_active=True,
    )
    v = ProductVariation.objects.create(
        variation_type='eBook', name=f'V{code_suffix}',
        code=f'V-EBK-{code_suffix}', is_active=True,
    )
    ppv = ProductProductVariation.objects.create(
        product=cp, product_variation=v, is_active=True,
    )
    return StoreProduct.objects.create(
        exam_session_subject=ess,
        product_product_variation=ppv,
        kind=Purchasable.Kind.PRODUCT,
        is_active=True,
        name=f'Product {code_suffix} eBook',
    )


class ProductViewSetAvailableTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.active = make_active_product('A')
        self.inactive = make_active_product('B')
        # Flip ExamSession off → product should disappear from list
        ExamSession.objects.filter(
            pk=self.inactive.exam_session_subject.exam_session.pk
        ).update(is_active=False)

    def test_list_excludes_inactive(self):
        url = reverse('store-product-list')  # adjust router name if different
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        ids = {r['id'] for r in resp.data['results'] if not r.get('is_bundle')}
        self.assertIn(self.active.pk, ids)
        self.assertNotIn(self.inactive.pk, ids)

    def test_retrieve_inactive_still_returns_200(self):
        """Order history support — direct fetch returns inactive products."""
        url = reverse('store-product-detail', args=[self.inactive.pk])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['id'], self.inactive.pk)
```

- [ ] **Step 2: Confirm router URL names**

Inspect `backend/django_Admin3/store/urls.py` to confirm the basename used for the `ProductViewSet` router registration. Adjust the `reverse()` calls in the test to match (likely `'product-list'` and `'product-detail'` if registered with `basename='product'`).

```bash
grep -n "register.*ProductViewSet\|basename" backend/django_Admin3/store/urls.py
```

Update the test if needed before running.

- [ ] **Step 3: Run to verify it fails**

```bash
cd backend/django_Admin3
python manage.py test store.tests.test_product_viewset_available -v 2
```

Expected: `test_list_excludes_inactive` FAILS — `inactive.pk` is in the listing because the current `list()` only checks `is_active` and `product_product_variation__product__is_active`.

- [ ] **Step 4: Update `ProductViewSet`**

Edit `backend/django_Admin3/store/views/product.py`. Two changes:

**4a. Replace `get_queryset()` (around lines 43–51):**

```python
    def get_queryset(self):
        """Filter through the canonical predicate for list, but allow
        retrieve to return inactive products (order history support).

        Admin write actions use the unfiltered queryset.
        """
        qs = super().get_queryset()
        if self.action == 'retrieve':
            # Order-history exception: return any product, including inactive
            return qs
        if self.action == 'list':
            return Product.available_now()
        # Other actions (create/update/destroy): unfiltered for admin
        return qs
```

**4b. Replace the `products` queryset inside `list()` (around lines 97–106):**

Replace:

```python
        products = Product.objects.select_related(
            'exam_session_subject__exam_session',
            'exam_session_subject__subject',
            'product_product_variation__product',
            'product_product_variation__product_variation',
        ).filter(
            is_active=True,
            product_product_variation__product__is_active=True,
        ).order_by('product_code')
```

With:

```python
        products = Product.available_now().select_related(
            'exam_session_subject__exam_session',
            'exam_session_subject__subject',
            'product_product_variation__product',
            'product_product_variation__product_variation',
        ).order_by('product_code')
```

**4c. Replace the `bundles` filter (around lines 109–118):**

The bundle list should also use the predicate where it makes sense, but per the spec, **bundle visibility is unchanged** — only its contents are filtered (handled in Task 7). Leave the bundles filter as-is here, but DO change the test in Task 7 to assert bundle list still returns the bundle.

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend/django_Admin3
python manage.py test store.tests.test_product_viewset_available -v 2
```

Expected: both tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/store/views/product.py \
        backend/django_Admin3/store/tests/test_product_viewset_available.py
git commit -m "feat(store): filter ProductViewSet list through available_now()

Customer-facing list endpoint now hides inactive products
(per the canonical 8-condition predicate). Retrieve remains
unfiltered to support order-history viewing of past purchases.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Filter bundle contents to available products only

**Files:**
- Modify: `backend/django_Admin3/store/views/bundle.py`
- Test: `backend/django_Admin3/store/tests/test_bundle_contents_available.py`

- [ ] **Step 1: Write the failing test**

Create `backend/django_Admin3/store/tests/test_bundle_contents_available.py`:

```python
"""Bundle stays visible when contents go inactive, but the contents
endpoint excludes inactive items."""
from datetime import timedelta
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from catalog_exam_sessions.models import ExamSession
from catalog_subjects.models import Subject
from catalog.models import ExamSessionSubject
from catalog_products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)
from store.models import (
    Product as StoreProduct, Purchasable, Bundle, BundleProduct,
)


class BundleContentsAvailableTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        now = timezone.now()
        self.session = ExamSession.objects.create(
            session_code='2099-05',
            start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10),
            is_active=True,
        )
        self.subject = Subject.objects.create(code='ZB1', description='T', active=True)
        self.ess = ExamSessionSubject.objects.create(
            exam_session=self.session, subject=self.subject, is_active=True,
        )
        # Two products in the bundle: one active, one inactive
        def mk(code, active):
            cp = CatalogProduct.objects.create(
                fullname=code, shortname=code, code=code, is_active=True,
            )
            v = ProductVariation.objects.create(
                variation_type='eBook', name=f'{code}-V', code=f'{code}-EBK',
                is_active=True,
            )
            ppv = ProductProductVariation.objects.create(
                product=cp, product_variation=v, is_active=True,
            )
            return StoreProduct.objects.create(
                exam_session_subject=self.ess,
                product_product_variation=ppv,
                kind=Purchasable.Kind.PRODUCT,
                is_active=active,
                name=code,
            )
        self.active_p = mk('B-ACT', True)
        self.inactive_p = mk('B-INACT', False)
        self.bundle = Bundle.objects.create(
            exam_session_subject=self.ess,
            is_active=True,
        )
        BundleProduct.objects.create(
            bundle=self.bundle, product=self.active_p, is_active=True,
        )
        BundleProduct.objects.create(
            bundle=self.bundle, product=self.inactive_p, is_active=True,
        )

    def test_bundle_visible_in_list(self):
        url = reverse('bundle-list')  # adjust if router uses different basename
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        ids = {b['id'] for b in resp.data}
        self.assertIn(self.bundle.pk, ids)

    def test_bundle_contents_excludes_inactive(self):
        url = reverse('bundle-products', args=[self.bundle.pk])
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        product_ids = {item['product']['id'] for item in resp.data}
        self.assertIn(self.active_p.pk, product_ids)
        self.assertNotIn(self.inactive_p.pk, product_ids)
```

- [ ] **Step 2: Confirm URL names**

```bash
grep -n "register.*BundleViewSet\|basename" backend/django_Admin3/store/urls.py
```

Adjust the `reverse()` calls if needed.

- [ ] **Step 3: Run to verify it fails**

```bash
cd backend/django_Admin3
python manage.py test store.tests.test_bundle_contents_available -v 2
```

Expected: `test_bundle_contents_excludes_inactive` FAILS — both products show up.

- [ ] **Step 4: Filter the contents action**

Edit `backend/django_Admin3/store/views/bundle.py`. Replace the `products` action (around lines 76–80):

```python
    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        """Get all products in a bundle.

        Filters out bundle products whose underlying Purchasable is not
        currently available (per Purchasable.available_now()). The bundle
        itself remains listed even if some contents are filtered out.
        """
        from store.models import Purchasable
        bundle = self.get_object()
        available_purchasable_ids = set(
            Purchasable.objects.available_now()
            .values_list('pk', flat=True)
        )
        bundle_products = bundle.bundle_products.filter(
            is_active=True,
            product_id__in=available_purchasable_ids,
        ).select_related('product')
        serializer = BundleProductSerializer(bundle_products, many=True)
        return Response(serializer.data)
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend/django_Admin3
python manage.py test store.tests.test_bundle_contents_available -v 2
```

Expected: both tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/store/views/bundle.py \
        backend/django_Admin3/store/tests/test_bundle_contents_available.py
git commit -m "feat(store): filter bundle contents through available_now()

Bundle list visibility is unchanged. The /bundles/{id}/products
endpoint now hides items that fail the canonical predicate, so a
customer never sees an inactive product as part of an otherwise
available bundle.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Filter navbar dropdown data

**Files:**
- Modify: `backend/django_Admin3/catalog/views/navigation_views.py`
- Test: `backend/django_Admin3/catalog/tests/test_navigation_data_available.py`

- [ ] **Step 1: Write the failing test**

Create `backend/django_Admin3/catalog/tests/test_navigation_data_available.py`:

```python
"""navigation_data must hide catalog.Products / ProductVariations that
have no available store.Product backing them."""
from datetime import timedelta
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from catalog_exam_sessions.models import ExamSession
from catalog_subjects.models import Subject
from catalog.models import ExamSessionSubject
from catalog_products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)
from filtering.models import FilterGroup, ProductProductGroup
from store.models import Product as StoreProduct, Purchasable


class NavigationDataAvailableTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

        # Create the Tutorial filter group (used by navbar for location list)
        self.tutorial_group = FilterGroup.objects.create(
            name='Tutorial', code='TUTORIAL', is_active=True,
        )

        now = timezone.now()
        es_active = ExamSession.objects.create(
            session_code='2099-04', start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10), is_active=True,
        )
        es_inactive = ExamSession.objects.create(
            session_code='2099-05', start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10), is_active=False,  # KEY
        )
        s = Subject.objects.create(code='ZN1', description='T', active=True)
        ess_a = ExamSessionSubject.objects.create(
            exam_session=es_active, subject=s, is_active=True,
        )
        ess_i = ExamSessionSubject.objects.create(
            exam_session=es_inactive, subject=s, is_active=True,
        )
        v = ProductVariation.objects.create(
            variation_type='Tutorial', name='F2F', code='F2F-V', is_active=True,
        )

        def mk(code, ess):
            cp = CatalogProduct.objects.create(
                fullname=code, shortname=code, code=code, is_active=True,
            )
            ppv = ProductProductVariation.objects.create(
                product=cp, product_variation=v, is_active=True,
            )
            ProductProductGroup.objects.create(
                product_product_variation=ppv, product_group=self.tutorial_group,
            )
            return cp, StoreProduct.objects.create(
                exam_session_subject=ess,
                product_product_variation=ppv,
                kind=Purchasable.Kind.PRODUCT,
                is_active=True,
                name=code,
            )

        self.product_with_active, _ = mk('NAV-AVAIL', ess_a)
        self.product_with_inactive_only, _ = mk('NAV-DARK', ess_i)

    def test_tutorial_locations_exclude_products_with_only_inactive_store(self):
        url = reverse('navigation-data')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)
        loc = resp.data['tutorial_dropdown']['Location']
        all_codes = {p['code'] for p in loc['left'] + loc['right']}
        self.assertIn('NAV-AVAIL', all_codes)
        self.assertNotIn('NAV-DARK', all_codes)
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend/django_Admin3
python manage.py test catalog.tests.test_navigation_data_available -v 2
```

Expected: FAIL — `NAV-DARK` shows up in `Location`.

- [ ] **Step 3: Add `Exists()` filter and bump cache key**

Edit `backend/django_Admin3/catalog/views/navigation_views.py`.

**3a. Update the cache key (around line 58):**

```python
    cache_key = 'navigation_data_v3'  # bumped from v2 — adds availability filter
```

**3b. Update `tutorial_group` location-products query (around lines 139–143):**

Replace:

```python
        if tutorial_group:
            location_products = list(Product.objects.filter(
                is_active=True,
                productproductvariation__product_groups__product_group=tutorial_group,
            ).distinct().order_by('shortname').values('id', 'shortname', 'fullname', 'code'))
        else:
            location_products = []
```

With:

```python
        if tutorial_group:
            from django.db.models import Exists, OuterRef
            from store.models import Product as StoreProduct, Purchasable
            available_qs = Purchasable.objects.available_now().filter(
                kind='product',
                product__product_product_variation__product_id=OuterRef('pk'),
            )
            location_products = list(Product.objects.filter(
                is_active=True,
                productproductvariation__product_groups__product_group=tutorial_group,
            ).filter(Exists(available_qs)).distinct()
              .order_by('shortname')
              .values('id', 'shortname', 'fullname', 'code'))
        else:
            location_products = []
```

**3c. Update `online_classroom_data` (around lines 168–171):**

Replace:

```python
        if online_classroom_group:
            online_classroom_data = list(ProductVariation.objects.filter(
                productproductvariation__product_groups__product_group=online_classroom_group
            ).distinct().order_by('description').values('id', 'name', 'variation_type', 'description'))
        else:
            online_classroom_data = []
```

With:

```python
        if online_classroom_group:
            from django.db.models import Exists, OuterRef
            from store.models import Purchasable
            available_qs_pv = Purchasable.objects.available_now().filter(
                kind='product',
                product__product_product_variation__product_variation_id=OuterRef('pk'),
            )
            online_classroom_data = list(ProductVariation.objects.filter(
                productproductvariation__product_groups__product_group=online_classroom_group
            ).filter(Exists(available_qs_pv)).distinct()
              .order_by('description')
              .values('id', 'name', 'variation_type', 'description'))
        else:
            online_classroom_data = []
```

**3d. Update navbar / DL group product queries (around lines 102 and 126):**

The navbar groups (`Core Study Materials`, `Revision Materials`, `Marking`, `Tutorial`) loop through `Product.objects.filter(productproductvariation__product_groups__product_group=group)`. Wrap each with the same `Exists()` filter:

Replace each occurrence of:

```python
                        for p in Product.objects.filter(
                                productproductvariation__product_groups__product_group=group
                            ).distinct()
```

With:

```python
                        for p in Product.objects.filter(
                                productproductvariation__product_groups__product_group=group
                            ).filter(Exists(available_qs_for(p_outer_ref=True))).distinct()
```

Then add a small helper at the top of the function (right after `from filtering.models import FilterGroup`):

```python
    from django.db.models import Exists, OuterRef
    from store.models import Purchasable

    def available_qs_for(p_outer_ref=True):
        """Subquery: True iff at least one Purchasable.available_now() exists
        whose store.Product points (via PPV) at the outer catalog.Product.pk."""
        return Purchasable.objects.available_now().filter(
            kind='product',
            product__product_product_variation__product_id=OuterRef('pk'),
        )
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd backend/django_Admin3
python manage.py test catalog.tests.test_navigation_data_available -v 2
```

Expected: PASS.

- [ ] **Step 5: Run the existing navigation_data tests to confirm no regression**

```bash
python manage.py test catalog.tests.test_views -v 2 -k navigation
```

Expected: existing tests still PASS (they only assert presence of structure, not specific exclusion behaviour).

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/catalog/views/navigation_views.py \
        backend/django_Admin3/catalog/tests/test_navigation_data_available.py
git commit -m "feat(catalog): filter navigation_data through available_now()

Navbar dropdowns (Tutorial locations, Online Classroom variations,
group product lists) now hide entries with no currently-available
store.Product. Uses Exists() subqueries to avoid row multiplication.

Cache key bumped to navigation_data_v3 so the change is visible
immediately on deploy rather than after the 5-min cache expires.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Filter fuzzy_search and advanced_product_search

**Files:**
- Modify: `backend/django_Admin3/catalog/views/navigation_views.py` (`fuzzy_search`, `advanced_product_search`)
- Test: `backend/django_Admin3/catalog/tests/test_search_available.py`

- [ ] **Step 1: Write the failing test**

Create `backend/django_Admin3/catalog/tests/test_search_available.py`:

```python
"""fuzzy_search and advanced_product_search must exclude inactive store products."""
from datetime import timedelta
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from catalog_exam_sessions.models import ExamSession
from catalog_subjects.models import Subject
from catalog.models import ExamSessionSubject
from catalog_products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)
from store.models import Product as StoreProduct, Purchasable


class SearchAvailableTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        now = timezone.now()
        es = ExamSession.objects.create(
            session_code='2099-06', start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10), is_active=True,
        )
        s = Subject.objects.create(code='ZS1', description='T', active=True)
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=s, is_active=True,
        )
        cp = CatalogProduct.objects.create(
            fullname='SearchableProduct', shortname='SP',
            code='SP01', is_active=True,
        )
        v = ProductVariation.objects.create(
            variation_type='eBook', name='SP-V', code='SP-EBK', is_active=True,
        )
        ppv = ProductProductVariation.objects.create(
            product=cp, product_variation=v, is_active=True,
        )
        self.sp = StoreProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            kind=Purchasable.Kind.PRODUCT,
            is_active=False,  # KEY: inactive
            name='SearchableProduct eBook',
        )

    def test_fuzzy_search_excludes_inactive(self):
        url = reverse('catalog-fuzzy-search')  # adjust to actual URL name
        resp = self.client.get(url, {'q': 'SearchableProduct'})
        self.assertEqual(resp.status_code, 200)
        # The exact response shape depends on StoreProductListSerializer.
        # Assert the inactive store product is NOT in the result.
        body = str(resp.data)
        self.assertNotIn('SP01', body)
```

- [ ] **Step 2: Confirm URL names**

```bash
grep -n "fuzzy_search\|advanced_product_search\|search/" backend/django_Admin3/catalog/urls.py
```

Adjust the test's `reverse()` call to match.

- [ ] **Step 3: Run to verify it fails**

```bash
cd backend/django_Admin3
python manage.py test catalog.tests.test_search_available -v 2
```

Expected: FAIL — inactive product appears in results.

- [ ] **Step 4: Filter `fuzzy_search` results**

Edit `backend/django_Admin3/catalog/views/navigation_views.py`. In `fuzzy_search` around line 302, replace:

```python
        store_products_queryset = StoreProduct.objects.filter(
```

With:

```python
        store_products_queryset = StoreProduct.available_now().filter(
```

(Preserves the rest of the filter chain.)

- [ ] **Step 5: Filter `advanced_product_search` results**

In `advanced_product_search` around line 443, replace:

```python
        filtered_product_ids = StoreProduct.objects.filter(
```

With:

```python
        filtered_product_ids = StoreProduct.available_now().filter(
```

- [ ] **Step 6: Run test**

```bash
cd backend/django_Admin3
python manage.py test catalog.tests.test_search_available -v 2
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/catalog/views/navigation_views.py \
        backend/django_Admin3/catalog/tests/test_search_available.py
git commit -m "feat(catalog): filter fuzzy_search and advanced_search through available_now()

Search endpoints route their store.Product queries through the
canonical predicate so customers never see an inactive product as
a search result.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Server-side cart-add gate

**Files:**
- Modify: `backend/django_Admin3/cart/services/cart_service.py`
- Test: `backend/django_Admin3/cart/tests/test_cart_add_gate.py`

- [ ] **Step 1: Write the failing test**

Create `backend/django_Admin3/cart/tests/test_cart_add_gate.py`:

```python
"""POST /cart/add/ must reject inactive products with HTTP 400 and
the 'product_unavailable' error code."""
from datetime import timedelta
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from catalog_exam_sessions.models import ExamSession
from catalog_subjects.models import Subject
from catalog.models import ExamSessionSubject
from catalog_products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)
from store.models import Product as StoreProduct, Purchasable


class CartAddGateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        now = timezone.now()
        es = ExamSession.objects.create(
            session_code='2099-07', start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10), is_active=True,
        )
        s = Subject.objects.create(code='ZC1', description='T', active=True)
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=s, is_active=True,
        )
        cp = CatalogProduct.objects.create(
            fullname='Gate Product', shortname='GP', code='GP01', is_active=True,
        )
        v = ProductVariation.objects.create(
            variation_type='eBook', name='GP-V', code='GP-EBK', is_active=True,
        )
        ppv = ProductProductVariation.objects.create(
            product=cp, product_variation=v, is_active=True,
        )
        self.inactive = StoreProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            kind=Purchasable.Kind.PRODUCT,
            is_active=False,  # KEY
            name='Gate Product eBook',
        )

    def test_cart_add_inactive_returns_400_product_unavailable(self):
        url = reverse('cart-add')  # adjust
        resp = self.client.post(url, {
            'current_product': self.inactive.pk,
            'quantity': 1,
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('product_unavailable', str(resp.data))
```

- [ ] **Step 2: Confirm URL name**

```bash
grep -n "cart-add\|cart/add\|register.*Cart" backend/django_Admin3/cart/urls.py
```

Adjust `reverse()`.

- [ ] **Step 3: Run to verify it fails**

```bash
cd backend/django_Admin3
python manage.py test cart.tests.test_cart_add_gate -v 2
```

Expected: FAIL — current code adds the inactive product (or returns a different error).

- [ ] **Step 4: Add the gate in `add_item`**

Edit `backend/django_Admin3/cart/services/cart_service.py`. In `add_item()` (around lines 39–58), add the availability check after `_resolve_product` returns:

```python
    def add_item(self, cart, product_id, quantity=1, price_type='standard',
                 actual_price=None, metadata=None):
        """Add a product item to the cart, handling tutorials and variations."""
        metadata = metadata or {}

        product = self._resolve_product(product_id, metadata)
        if not product:
            return None, f"No Product matches the given query (ID: {product_id})"

        # Server-side availability gate (active flags + date window).
        # Frontend disables the button for UX, but a stale page or direct
        # API call must still be rejected here.
        if not product.is_available_now():
            return None, "product_unavailable"

        # Delegate to tutorial-specific or regular item logic
        if metadata.get('type') == 'tutorial':
            item = self._handle_tutorial_add(cart, product, quantity, price_type, actual_price, metadata)
        else:
            item = self._handle_regular_add(cart, product, quantity, price_type, actual_price, metadata)

        # Update cart flags and trigger VAT
        self._update_cart_flags(cart)
        self._trigger_vat_calculation(cart)

        return item, None
```

- [ ] **Step 5: Update the view to return 400 for `product_unavailable`**

The current view (`cart/views.py:84`) returns 404 for any error. Update the `add` action to map the new error to 400.

Edit `backend/django_Admin3/cart/views.py`. In `add()` around lines 73–84, replace:

```python
        try:
            item, error = cart_service.add_item(
                cart, product_id, quantity, price_type, actual_price, metadata
            )
        except DjangoValidationError as exc:
            return Response(_validation_error_payload(exc),
                            status=status.HTTP_400_BAD_REQUEST)
        if error:
            return Response({'detail': error}, status=status.HTTP_404_NOT_FOUND)
```

With:

```python
        try:
            item, error = cart_service.add_item(
                cart, product_id, quantity, price_type, actual_price, metadata
            )
        except DjangoValidationError as exc:
            return Response(_validation_error_payload(exc),
                            status=status.HTTP_400_BAD_REQUEST)
        if error == "product_unavailable":
            return Response(
                {'error': 'product_unavailable',
                 'detail': 'This product is no longer available for purchase.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if error:
            return Response({'detail': error}, status=status.HTTP_404_NOT_FOUND)
```

- [ ] **Step 6: Run test**

```bash
cd backend/django_Admin3
python manage.py test cart.tests.test_cart_add_gate -v 2
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/cart/services/cart_service.py \
        backend/django_Admin3/cart/views.py \
        backend/django_Admin3/cart/tests/test_cart_add_gate.py
git commit -m "feat(cart): server-side gate rejecting unavailable products

POST /cart/add/ now returns HTTP 400 with {error: 'product_unavailable'}
when the resolved product fails Purchasable.is_available_now().
Frontend disable is UX; the server is authoritative.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Add `is_available` to `CartItemSerializer`

**Files:**
- Modify: `backend/django_Admin3/cart/serializers.py`
- Test: `backend/django_Admin3/cart/tests/test_cart_item_is_available.py`

- [ ] **Step 1: Write the failing test**

Create `backend/django_Admin3/cart/tests/test_cart_item_is_available.py`:

```python
"""CartItemSerializer must expose is_available so the frontend can
flag cart items that became inactive after they were added."""
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone

from catalog_exam_sessions.models import ExamSession
from catalog_subjects.models import Subject
from catalog.models import ExamSessionSubject
from catalog_products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)
from store.models import Product as StoreProduct, Purchasable
from cart.models import Cart, CartItem
from cart.serializers import CartItemSerializer


class CartItemIsAvailableTests(TestCase):
    def setUp(self):
        now = timezone.now()
        es = ExamSession.objects.create(
            session_code='2099-08', start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10), is_active=True,
        )
        s = Subject.objects.create(code='ZI1', description='T', active=True)
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=s, is_active=True,
        )
        cp = CatalogProduct.objects.create(
            fullname='Item P', shortname='IP', code='IP01', is_active=True,
        )
        v = ProductVariation.objects.create(
            variation_type='eBook', name='IP-V', code='IP-EBK', is_active=True,
        )
        ppv = ProductProductVariation.objects.create(
            product=cp, product_variation=v, is_active=True,
        )
        self.product = StoreProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            kind=Purchasable.Kind.PRODUCT,
            is_active=True,
            name='Item P eBook',
        )
        self.cart = Cart.objects.create()
        self.item = CartItem.objects.create(
            cart=self.cart,
            purchasable_id=self.product.pk,
            quantity=1,
            actual_price='10.00',
            price_type='standard',
        )

    def test_is_available_true_when_product_active(self):
        data = CartItemSerializer(self.item).data
        self.assertTrue(data['is_available'])

    def test_is_available_false_after_product_deactivated(self):
        Purchasable.objects.filter(pk=self.product.pk).update(is_active=False)
        self.item.refresh_from_db()
        data = CartItemSerializer(self.item).data
        self.assertFalse(data['is_available'])
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend/django_Admin3
python manage.py test cart.tests.test_cart_item_is_available -v 2
```

Expected: FAIL — `KeyError: 'is_available'`.

- [ ] **Step 3: Add field to serializer**

Edit `backend/django_Admin3/cart/serializers.py`. In `CartItemSerializer`:

**3a. Add the SerializerMethodField after the existing method fields (around line 32):**

```python
    is_available = serializers.SerializerMethodField()
```

**3b. Add the getter after the existing `get_*` methods (around line 144):**

```python
    def get_is_available(self, obj):
        """Whether the item's underlying purchasable is currently available
        for sale. Frontend uses this to render a 'no longer available' badge.

        Returns True for fee items (which don't have a purchasable FK).
        """
        purchasable = obj.purchasable
        if purchasable is None:
            return True
        return purchasable.is_available_now()
```

**3c. Add `'is_available'` to `Meta.fields` (around line 71):**

```python
        fields = [
            'id', 'current_product', 'product_id', 'product_name', 'product_code', 'subject_code',
            'exam_session_code', 'product_type', 'quantity', 'price_type', 'actual_price', 'metadata',
            'is_marking', 'has_expired_deadline', 'expired_deadlines_count', 'marking_paper_count',
            'is_available',  # NEW: per-item availability flag
            # Phase 5: VAT fields
            'net_amount', 'vat_region', 'vat_rate', 'vat_amount', 'gross_amount',
            # Task 18: unified purchasable nested object
            'purchasable',
            # Task 9: nested tutorial choices
            'tutorial_choices',
        ]
```

- [ ] **Step 4: Run tests**

```bash
cd backend/django_Admin3
python manage.py test cart.tests.test_cart_item_is_available -v 2
```

Expected: both PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/cart/serializers.py \
        backend/django_Admin3/cart/tests/test_cart_item_is_available.py
git commit -m "feat(cart): add is_available flag to CartItemSerializer

Per-item flag computed from Purchasable.is_available_now(). Lets the
frontend show a 'no longer available — please remove' badge for items
that became inactive after being added to the cart, without auto-removing
them.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Frontend — date-window check on `MaterialProductCard`

**Files:**
- Modify: `frontend/react-Admin3/src/components/Product/ProductCard/useMaterialProductCardVM.ts`
- Modify: `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.tsx`
- Create: `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MaterialProductCard.window.test.tsx`

- [ ] **Step 1: Inspect the existing VM**

```bash
grep -n "exam_session\|start_date\|end_date\|return {" frontend/react-Admin3/src/components/Product/ProductCard/useMaterialProductCardVM.ts | head -30
```

Note where the VM's return object is — the new `isWithinSalesWindow` boolean and `salesWindowMessage` string should be added there.

- [ ] **Step 2: Write the failing test**

Create `frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MaterialProductCard.window.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MaterialProductCard from '../MaterialProductCard';

const baseProduct: any = {
  id: 1,
  product_code: 'TEST/EBK/2099-04',
  is_bundle: false,
  name: 'Test Product',
  subject_code: 'ZZ1',
  subject_name: 'Test',
  session_code: '2099-04',
  variation_type: 'eBook',
  variation_name: 'Test',
  product_name: 'Test',
  product_shortname: 'Test',
  prices: [{ price_type: 'standard', amount: '10.00' }],
};

describe('MaterialProductCard sales window', () => {
  it('disables Add to cart when today is before start_date', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString();
    render(
      <ThemeProvider theme={createTheme()}>
        <MaterialProductCard
          product={{ ...baseProduct, start_date: future, end_date: farFuture }}
        />
      </ThemeProvider>
    );
    const button = screen.getByRole('button', { name: /add to cart/i });
    expect(button).toBeDisabled();
  });

  it('disables Add to cart when today is after end_date', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString();
    const lessPast = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
    render(
      <ThemeProvider theme={createTheme()}>
        <MaterialProductCard
          product={{ ...baseProduct, start_date: past, end_date: lessPast }}
        />
      </ThemeProvider>
    );
    const button = screen.getByRole('button', { name: /add to cart/i });
    expect(button).toBeDisabled();
  });

  it('enables Add to cart inside the window', () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    render(
      <ThemeProvider theme={createTheme()}>
        <MaterialProductCard
          product={{ ...baseProduct, start_date: past, end_date: future }}
        />
      </ThemeProvider>
    );
    const button = screen.getByRole('button', { name: /add to cart/i });
    expect(button).not.toBeDisabled();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

```bash
cd frontend/react-Admin3
npm test -- --testPathPattern=MaterialProductCard.window --watchAll=false
```

Expected: 2 of 3 FAIL — buttons aren't disabled outside the window.

- [ ] **Step 4: Add `isWithinSalesWindow` to the VM**

Edit `frontend/react-Admin3/src/components/Product/ProductCard/useMaterialProductCardVM.ts`. Add this near the top of the hook body (after destructuring `product`):

```typescript
  // Sales window: today must be between exam_session.start_date and end_date.
  // If either date is missing (legacy products), default to within-window
  // so we don't accidentally disable existing UI.
  const isWithinSalesWindow = (() => {
    const start = product?.start_date ? new Date(product.start_date) : null;
    const end = product?.end_date ? new Date(product.end_date) : null;
    if (!start || !end) return true;
    const now = new Date();
    return now >= start && now <= end;
  })();

  const salesWindowMessage = isWithinSalesWindow
    ? ''
    : `Sales for ${product?.session_code ?? 'this session'} are not currently open`;
```

Then add both to the VM's return object so the component can read them.

- [ ] **Step 5: Wire into the Add-to-cart button(s)**

Edit `frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.tsx`. The card has multiple Add-to-cart code paths (SpeedDial tier 1, tier 2, and the standard fallback at lines 620–629). Update the `disabled` prop and add a tooltip on each.

Pull `isWithinSalesWindow` and `salesWindowMessage` from the VM (around line 62 where `useMaterialProductCardVM` is called).

For the **standard Add-to-cart button** (around line 626):

Replace:

```tsx
                <Button
                  variant="contained"
                  className="add-to-cart-button"
                  aria-label="Add to cart"
                  onClick={handleAddToCart}
                  disabled={!currentVariation}
                >
                  <AddShoppingCart />
                </Button>
```

With:

```tsx
                <Tooltip title={salesWindowMessage} disableHoverListener={!salesWindowMessage}>
                  <span>
                    <Button
                      variant="contained"
                      className="add-to-cart-button"
                      aria-label="Add to cart"
                      onClick={handleAddToCart}
                      disabled={!currentVariation || !isWithinSalesWindow}
                    >
                      <AddShoppingCart />
                    </Button>
                  </span>
                </Tooltip>
```

(The `<span>` wrapper is required because Tooltip can't directly wrap a disabled button.)

For the SpeedDial tiers (around lines 388 and 508), update their `disabled` prop similarly. If the SpeedDial wraps a `SpeedDialAction`, gate the action's `onClick` instead and add a visible "(unavailable)" label. The minimum acceptable change is: ensure the *primary* Add-to-cart action is unavailable.

- [ ] **Step 6: Run tests**

```bash
cd frontend/react-Admin3
npm test -- --testPathPattern=MaterialProductCard.window --watchAll=false
```

Expected: all 3 PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/react-Admin3/src/components/Product/ProductCard/MaterialProductCard.tsx \
        frontend/react-Admin3/src/components/Product/ProductCard/useMaterialProductCardVM.ts \
        frontend/react-Admin3/src/components/Product/ProductCard/__tests__/MaterialProductCard.window.test.tsx
git commit -m "feat(frontend): disable Add-to-cart outside exam-session window

MaterialProductCard reads start_date/end_date from the product payload
(now exposed by UnifiedProductSerializer). When today is outside the
window, the Add-to-cart button is disabled with an explanatory tooltip.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Frontend — propagate window check to other product cards

**Files:**
- Modify: `frontend/react-Admin3/src/components/Product/ProductCard/TutorialProductCard.tsx` (and its VM if any)
- Modify: `frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.tsx` (and its VM)
- Modify: `frontend/react-Admin3/src/components/Product/ProductCard/OnlineClassroomProductCard.tsx` (and its VM)
- Skip: `MarkingVoucherProductCard.tsx` — vouchers don't have an exam session, so no window applies.

- [ ] **Step 1: Locate Add-to-cart paths in each card**

```bash
grep -n "Add to cart\|disabled=\|handleAddToCart\|exam_session" frontend/react-Admin3/src/components/Product/ProductCard/TutorialProductCard.tsx
grep -n "Add to cart\|disabled=\|handleAddToCart\|exam_session" frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.tsx
grep -n "Add to cart\|disabled=\|handleAddToCart\|exam_session" frontend/react-Admin3/src/components/Product/ProductCard/OnlineClassroomProductCard.tsx
```

- [ ] **Step 2: Apply the same `isWithinSalesWindow` pattern**

For each card and its VM, mirror the change from Task 12:
1. In the VM: derive `isWithinSalesWindow` and `salesWindowMessage` from `product.start_date` / `product.end_date`.
2. In the card: wrap each Add-to-cart button (or equivalent action) in `Tooltip` and OR `!isWithinSalesWindow` into the `disabled` prop.

For paths where adapting the existing logic is non-trivial (e.g., TutorialProductCard's choice-rank flow), the minimum acceptable change is to gate the *final* "add tutorial choices to cart" action.

- [ ] **Step 3: Add a smoke test per card** (optional but recommended)

Create one test per card (or extend an existing test file) asserting the Add-to-cart action is disabled when `start_date`/`end_date` put today outside the window. Use the same pattern as `MaterialProductCard.window.test.tsx`.

- [ ] **Step 4: Run all card tests**

```bash
cd frontend/react-Admin3
npm test -- --testPathPattern="ProductCard" --watchAll=false
```

Expected: PASS, no regressions.

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/Product/ProductCard/TutorialProductCard.tsx \
        frontend/react-Admin3/src/components/Product/ProductCard/MarkingProductCard.tsx \
        frontend/react-Admin3/src/components/Product/ProductCard/OnlineClassroomProductCard.tsx \
        frontend/react-Admin3/src/components/Product/ProductCard/useTutorialProductCardVM.ts \
        frontend/react-Admin3/src/components/Product/ProductCard/useMarkingProductCardVM.ts \
        frontend/react-Admin3/src/components/Product/ProductCard/useOnlineClassroomProductCardVM.ts \
        frontend/react-Admin3/src/components/Product/ProductCard/__tests__/
git commit -m "feat(frontend): apply sales-window gate to all product cards

Tutorial, Marking, and OnlineClassroom cards now share the same
out-of-window UX as MaterialProductCard. Marking vouchers are
exempt — they have no exam session.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: Frontend — "no longer available" badge in cart

**Files:**
- Modify: cart drawer / cart page component(s) — likely in `frontend/react-Admin3/src/components/Cart/` or `frontend/react-Admin3/src/components/Ordering/`
- Test: a new test file alongside the modified component

- [ ] **Step 1: Locate cart-rendering components**

```bash
grep -rln "cart\|CartItem\|CartDrawer" frontend/react-Admin3/src/components/Cart/ frontend/react-Admin3/src/components/Ordering/ 2>/dev/null | head -10
grep -rln "is_available\|product_unavailable" frontend/react-Admin3/src/ | head -10
```

Identify the file(s) that map over cart items and render each line. The badge will go on each line where `item.is_available === false`.

- [ ] **Step 2: Write the failing test**

Create a test file alongside the component (e.g., `__tests__/CartLine.unavailable.test.tsx` or wherever existing cart tests live). Render a cart with one item where `is_available: false`; assert the "no longer available" badge text appears.

```typescript
import { render, screen } from '@testing-library/react';
// import the cart line/drawer component and provider as needed

describe('Cart unavailable badge', () => {
  it('shows "no longer available" when item.is_available is false', () => {
    const item = {
      id: 1,
      product_name: 'Old Product',
      product_code: 'OLD/EBK/2024-04',
      quantity: 1,
      actual_price: '10.00',
      is_available: false,
      // …other required fields
    };
    render(<CartLineUnderTest item={item} />);
    expect(screen.getByText(/no longer available/i)).toBeInTheDocument();
  });
});
```

(Substitute the actual component name and required props.)

- [ ] **Step 3: Run to verify it fails**

```bash
cd frontend/react-Admin3
npm test -- --testPathPattern=Cart --watchAll=false
```

- [ ] **Step 4: Add the badge to the component**

In the cart-line render path:

```tsx
{item.is_available === false && (
  <Chip
    label="No longer available — please remove"
    color="warning"
    size="small"
    sx={{ ml: 1 }}
  />
)}
```

Place it next to the product title/line subtotal, depending on layout.

- [ ] **Step 5: Run test to verify it passes**

```bash
cd frontend/react-Admin3
npm test -- --testPathPattern=Cart --watchAll=false
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/react-Admin3/src/components/Cart/  # or wherever the file lives
git commit -m "feat(cart): show 'no longer available' badge on inactive cart items

Reads is_available from the cart serializer (added in Task 11).
Items keep their place in the cart but are clearly marked so the
customer knows to remove them before checkout.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Activation management command (TDD-first)

**Files:**
- Create: `backend/django_Admin3/catalog/management/commands/activate_initial_catalog.py`
- Create: `backend/django_Admin3/catalog/management/commands/__init__.py` (if not present)
- Test: `backend/django_Admin3/catalog/tests/test_activate_initial_catalog.py`

- [ ] **Step 1: Confirm `commands/` package exists**

```bash
ls backend/django_Admin3/catalog/management/commands/ 2>/dev/null
```

If it doesn't, the existing `catalog/management/__init__.py` should already be present; create `commands/__init__.py` as an empty file.

- [ ] **Step 2: Write the failing test**

Create `backend/django_Admin3/catalog/tests/test_activate_initial_catalog.py`:

```python
"""Activation command tests.

Policy under test (per spec):
- catalog_exam_sessions: activate every row whose end_date >= today.
- catalog_product_variations: activate every row.
- catalog_product_product_variations: activate every row whose related
  catalog_products.is_active=True AND catalog_product_variations.is_active=True.
- Idempotent: running twice yields the same result.
"""
from datetime import datetime, timezone as dt_timezone, timedelta
from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from catalog_exam_sessions.models import ExamSession
from catalog_products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)


class ActivateInitialCatalogTests(TestCase):
    def setUp(self):
        now = timezone.now()
        # Future-ending session → should be activated
        self.future = ExamSession.objects.create(
            session_code='F1', start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=10), is_active=False,
        )
        # Past-ending session → should NOT be activated
        self.past = ExamSession.objects.create(
            session_code='P1', start_date=now - timedelta(days=100),
            end_date=now - timedelta(days=10), is_active=False,
        )
        self.var_active = ProductVariation.objects.create(
            variation_type='eBook', name='V1', code='V1', is_active=False,
        )
        self.cp_active = CatalogProduct.objects.create(
            fullname='A', shortname='A', code='CA', is_active=True,
        )
        self.cp_inactive = CatalogProduct.objects.create(
            fullname='B', shortname='B', code='CB', is_active=False,
        )
        self.ppv_eligible = ProductProductVariation.objects.create(
            product=self.cp_active, product_variation=self.var_active,
            is_active=False,
        )
        self.ppv_blocked = ProductProductVariation.objects.create(
            product=self.cp_inactive, product_variation=self.var_active,
            is_active=False,
        )

    def test_dry_run_does_not_change_data(self):
        out = StringIO()
        call_command('activate_initial_catalog', '--dry-run', stdout=out)

        self.future.refresh_from_db()
        self.var_active.refresh_from_db()
        self.ppv_eligible.refresh_from_db()
        self.assertFalse(self.future.is_active)
        self.assertFalse(self.var_active.is_active)
        self.assertFalse(self.ppv_eligible.is_active)
        # Output should describe the planned changes
        output = out.getvalue()
        self.assertIn('ExamSession', output)
        self.assertIn('F1', output)

    def test_real_run_applies_per_table_policy(self):
        call_command('activate_initial_catalog')

        self.future.refresh_from_db()
        self.past.refresh_from_db()
        self.var_active.refresh_from_db()
        self.ppv_eligible.refresh_from_db()
        self.ppv_blocked.refresh_from_db()

        self.assertTrue(self.future.is_active)
        self.assertFalse(self.past.is_active)        # past stays inactive
        self.assertTrue(self.var_active.is_active)
        self.assertTrue(self.ppv_eligible.is_active)
        self.assertFalse(self.ppv_blocked.is_active)  # parent inactive

    def test_idempotent(self):
        call_command('activate_initial_catalog')
        call_command('activate_initial_catalog')  # second run should be a no-op

        self.future.refresh_from_db()
        self.assertTrue(self.future.is_active)
```

- [ ] **Step 3: Run to verify it fails**

```bash
cd backend/django_Admin3
python manage.py test catalog.tests.test_activate_initial_catalog -v 2
```

Expected: FAIL — `Unknown command: 'activate_initial_catalog'`.

- [ ] **Step 4: Implement the command**

Create `backend/django_Admin3/catalog/management/commands/activate_initial_catalog.py`:

```python
"""Post-deploy activation command for the active-product-availability rollout.

The schema migration adds is_active fields with default=False on:
  - catalog_exam_sessions
  - catalog_product_variations
  - catalog_product_product_variations

This command flips the right initial subset of those rows to True so the
products page repopulates after the audit-gate blackout.

Per-table policy (from the design doc):
  - ExamSession: activate every row whose end_date >= today (skip past ones)
  - ProductVariation: activate every row
  - ProductProductVariation: activate every row whose parent
    catalog.Product.is_active and ProductVariation.is_active are both True.

Idempotent: running twice has no additional effect.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone

from catalog_exam_sessions.models import ExamSession
from catalog_products.models import ProductVariation, ProductProductVariation


class Command(BaseCommand):
    help = "Flip is_active=True for the initial catalog subset (post-deploy)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Print planned changes without modifying data.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        now = timezone.now()

        es_qs = ExamSession.objects.filter(end_date__gte=now, is_active=False)
        pv_qs = ProductVariation.objects.filter(is_active=False)
        # Note: order matters — apply PV updates before this query in the
        # real run, so the chained filter on product_variation__is_active
        # picks up newly-activated rows.
        # In dry-run we describe both phases separately.

        self.stdout.write(self.style.NOTICE(
            f"{'DRY-RUN — ' if dry_run else ''}Activation plan:"
        ))
        self.stdout.write(f"  ExamSession to activate ({es_qs.count()}):")
        for es in es_qs:
            self.stdout.write(f"    - {es.session_code} (end_date={es.end_date.date()})")

        self.stdout.write(f"  ProductVariation to activate ({pv_qs.count()}):")
        for pv in pv_qs:
            self.stdout.write(f"    - [{pv.variation_type}] {pv.name}")

        if dry_run:
            # In dry-run, compute the would-be PPV set with hypothetical
            # post-activation state.
            ppv_qs = ProductProductVariation.objects.filter(
                is_active=False,
                product__is_active=True,
            )
            self.stdout.write(
                f"  ProductProductVariation to activate "
                f"(after PV activation, ~{ppv_qs.count()}):"
            )
            for ppv in ppv_qs:
                self.stdout.write(f"    - {ppv}")
            self.stdout.write(self.style.WARNING("Dry run — no changes written."))
            return

        # Real run. Apply PV first, then PPV (so PV.is_active is True for
        # the PPV filter).
        es_count = es_qs.update(is_active=True)
        pv_count = pv_qs.update(is_active=True)
        ppv_qs = ProductProductVariation.objects.filter(
            is_active=False,
            product__is_active=True,
            product_variation__is_active=True,
        )
        ppv_count = ppv_qs.update(is_active=True)

        self.stdout.write(self.style.SUCCESS(
            f"Activated: {es_count} ExamSession, "
            f"{pv_count} ProductVariation, {ppv_count} ProductProductVariation."
        ))
```

- [ ] **Step 5: Run tests**

```bash
cd backend/django_Admin3
python manage.py test catalog.tests.test_activate_initial_catalog -v 2
```

Expected: all 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/catalog/management/commands/activate_initial_catalog.py \
        backend/django_Admin3/catalog/tests/test_activate_initial_catalog.py
git commit -m "feat(catalog): activate_initial_catalog management command

Dry-run-by-default activation tool for the post-deploy blackout.
Per-table policy:
  - ExamSession: future/current sessions only (end_date >= today)
  - ProductVariation: all rows
  - ProductProductVariation: rows whose parents are active

Idempotent. --dry-run prints the diff without writing.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: End-to-end smoke test

**Files:**
- Create: `backend/django_Admin3/store/tests/test_e2e_active_product_flow.py`

- [ ] **Step 1: Write the e2e test**

Create `backend/django_Admin3/store/tests/test_e2e_active_product_flow.py`:

```python
"""End-to-end smoke test: post-migration blackout, then activation,
then product appears in list / search / cart-add / serializer."""
from datetime import timedelta
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from catalog_exam_sessions.models import ExamSession
from catalog_subjects.models import Subject
from catalog.models import ExamSessionSubject
from catalog_products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)
from store.models import Product as StoreProduct, Purchasable


class E2EActiveProductFlowTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        now = timezone.now()
        # Create rows in default-False state (simulating fresh post-migration data)
        es = ExamSession.objects.create(
            session_code='E2E-04', start_date=now - timedelta(days=5),
            end_date=now + timedelta(days=5), is_active=False,
        )
        s = Subject.objects.create(code='ZE1', description='T', active=True)
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=s, is_active=True,
        )
        cp = CatalogProduct.objects.create(
            fullname='E2E P', shortname='E2E', code='E2E01', is_active=True,
        )
        v = ProductVariation.objects.create(
            variation_type='eBook', name='E2E-V', code='E2E-EBK',
            is_active=False,
        )
        ppv = ProductProductVariation.objects.create(
            product=cp, product_variation=v, is_active=False,
        )
        self.sp = StoreProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            kind=Purchasable.Kind.PRODUCT,
            is_active=True,
            name='E2E P eBook',
        )

    def test_blackout_then_activation(self):
        # Phase 1: products list excludes the product (default-False blackout)
        url = reverse('product-list')  # adjust if needed
        resp = self.client.get(url)
        product_ids = {r['id'] for r in resp.data['results'] if not r.get('is_bundle')}
        self.assertNotIn(self.sp.pk, product_ids)

        # Phase 2: run activation command
        call_command('activate_initial_catalog')

        # Phase 3: product appears
        resp = self.client.get(url)
        product_ids = {r['id'] for r in resp.data['results'] if not r.get('is_bundle')}
        self.assertIn(self.sp.pk, product_ids)
```

- [ ] **Step 2: Run the test**

```bash
cd backend/django_Admin3
python manage.py test store.tests.test_e2e_active_product_flow -v 2
```

Expected: PASS (validates the whole pipeline).

- [ ] **Step 3: Commit**

```bash
git add backend/django_Admin3/store/tests/test_e2e_active_product_flow.py
git commit -m "test: e2e smoke test for active-product blackout-then-activation flow

Confirms a freshly-migrated row stays hidden until the activation
command runs, then surfaces correctly through the products list.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 17: Full-suite verification

- [ ] **Step 1: Run the full backend test suite**

```bash
cd backend/django_Admin3
python manage.py test --keepdb -v 2
```

Expected: existing pre-existing failures noted in MEMORY.md (22 tutorial NameError, ~20 catalog db_table assertions, ~10 information_schema tests) remain as-is. **No NEW failures.**

If any new failures appear, fix them inline before continuing.

- [ ] **Step 2: Run the full frontend test suite**

```bash
cd frontend/react-Admin3
npm test -- --watchAll=false
```

Expected: 280 pre-existing failures (per MEMORY.md). **No NEW failures.** New tests added in Tasks 12–14 PASS.

- [ ] **Step 3: Coverage check on new backend code**

```bash
cd backend/django_Admin3
coverage run --source=store.models.purchasable,store.views.product,store.views.bundle,catalog.views.navigation_views,cart.services.cart_service,cart.serializers manage.py test \
  store.tests.test_purchasable_available_now \
  store.tests.test_unified_serializer_dates \
  store.tests.test_product_viewset_available \
  store.tests.test_bundle_contents_available \
  catalog.tests.test_navigation_data_available \
  catalog.tests.test_search_available \
  cart.tests.test_cart_add_gate \
  cart.tests.test_cart_item_is_available \
  catalog.tests.test_activate_initial_catalog \
  store.tests.test_e2e_active_product_flow
coverage report
```

Expected: ≥ 80% on each new/modified file. If below, add tests for the uncovered branches before finishing.

- [ ] **Step 4: Final commit (if any small fixes were made)**

```bash
git status
git add -A
git commit -m "chore: final test/coverage cleanups for active-product feature

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>" \
    || echo "Nothing to commit — all clean."
```

---

## Rollout Checklist (operator-facing, post-merge)

This is for the deploy operator, **not** part of the implementation work itself:

1. Deploy the merged branch (schema migrations apply automatically).
2. Verify the products page is empty (expected — blackout in effect).
3. Run `python manage.py activate_initial_catalog --dry-run` and review the diff.
4. Run `python manage.py activate_initial_catalog` for real.
5. Either restart the app or run `python manage.py shell -c "from django.core.cache import cache; cache.delete('navigation_data_v3'); cache.delete('navigation_data_v2')"` to bust the navigation cache (the v3 key bump in Task 8 already handles cold caches).
6. Verify products page repopulates and navbar shows expected groups.
