# Tutorial Choice Cart/Order Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `CartTutorialChoice` and `TutorialChoice` into the cart→order pipeline so tutorial preferences are stored as relational rows; fix the live 500 caused by a missing `FEE_GENERIC` `Purchasable` seed.

**Architecture:** New `CartTutorialChoice` model mirroring the existing `TutorialChoice`. `CartService._handle_tutorial_add` writes relational rows (in addition to the existing display-only `metadata`). `OrderBuilder._transfer_items` copies `CartTutorialChoice → TutorialChoice` 1:1 inside the existing atomic transaction. Validation is shared via a helper extracted from `TutorialChoice.clean()`. The FEE_GENERIC fix is a small idempotent data migration plus a defensive hard-fail in `_transfer_fees`.

**Tech Stack:** Django 6.0, Django REST Framework, PostgreSQL (acted schema), pytest/Django TestCase, JSONLogic-validated `acted_rules_engine` (untouched).

**Reference docs:**
- Design spec: [docs/superpowers/specs/2026-05-05-tutorial-choice-cart-order-design.md](../specs/2026-05-05-tutorial-choice-cart-order-design.md)
- Existing model: [backend/django_Admin3/tutorials/models/tutorial_choice.py](../../../backend/django_Admin3/tutorials/models/tutorial_choice.py)
- Existing service: [backend/django_Admin3/cart/services/cart_service.py](../../../backend/django_Admin3/cart/services/cart_service.py)
- Existing builder: [backend/django_Admin3/orders/services/order_builder.py](../../../backend/django_Admin3/orders/services/order_builder.py)

**Branch:** `feat/20260505-tutorial-choice-cart-order` (already created from `feat/20260430-refine-ui-styles`).

**Test command (default):** From `backend/django_Admin3/`:
```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest <path> -v
```
The project test settings disable migrations and use SQLite per [MEMORY.md](../../../.claude/projects/-Users-work-Documents-Code-Admin3/memory/MEMORY.md). For migration tests that need real PostgreSQL, use `DJANGO_SETTINGS_MODULE=django_Admin3.settings.development python manage.py test <path>`.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `backend/django_Admin3/store/migrations/0015_ensure_fee_generic_exists.py` | Create | Idempotent data migration ensuring the FEE_GENERIC row exists. |
| `backend/django_Admin3/orders/services/order_builder.py` | Modify | Add `_transfer_tutorial_choices`; defensive hard-fail in `_transfer_fees`. |
| `backend/django_Admin3/orders/tests/test_order_builder.py` | Modify | Add cases for hard-fail and tutorial choice copy. |
| `backend/django_Admin3/tutorials/services/online_classroom.py` | Modify | Add `validate_tutorial_choice_event` helper. |
| `backend/django_Admin3/tutorials/models/tutorial_choice.py` | Modify | Use shared validator in `clean()`. |
| `backend/django_Admin3/tutorials/models/cart_tutorial_choice.py` | Create | New `CartTutorialChoice` model. |
| `backend/django_Admin3/tutorials/models/__init__.py` | Modify | Export `CartTutorialChoice`. |
| `backend/django_Admin3/tutorials/migrations/0016_cart_tutorial_choice.py` | Create | Migration for the new model. |
| `backend/django_Admin3/tutorials/tests/test_cart_tutorial_choice.py` | Create | Mirrors `test_tutorial_choice.py` for the cart-side model. |
| `backend/django_Admin3/cart/services/cart_service.py` | Modify | Rewrite `_handle_tutorial_add` and supporting helpers; relational-first. |
| `backend/django_Admin3/cart/tests/test_cart_service_tutorial.py` | Create | Behavioral tests for tutorial cart flows. |
| `backend/django_Admin3/cart/serializers.py` | Modify | Add `tutorial_choices` nested field on `CartItemSerializer`. |
| `backend/django_Admin3/cart/views.py` | Modify | Add `prefetch_related` for tutorial choices on cart endpoints. |
| `backend/django_Admin3/cart/tests/test_serializers.py` | Modify | Assert serializer emits `tutorial_choices`. |
| `backend/django_Admin3/orders/serializers/order_serializer.py` | Modify | Add `tutorial_choices` nested field on order item serializer. |
| `backend/django_Admin3/orders/views.py` | Modify | Add `prefetch_related` for tutorial choices on order endpoints. |

---

## Task 1: FEE_GENERIC seed migration

**Goal:** Re-create the missing `Purchasable(code='FEE_GENERIC')` row idempotently. Unblocks current checkout 500.

**Files:**
- Create: `backend/django_Admin3/store/migrations/0015_ensure_fee_generic_exists.py`
- Test: `backend/django_Admin3/store/tests/test_migration_fee_generic.py` (extend existing)

- [ ] **Step 1: Read existing migration and test for context**

```
Read: backend/django_Admin3/store/migrations/0009_create_fee_generic_purchasable.py
Read: backend/django_Admin3/store/tests/test_migration_fee_generic.py
```

- [ ] **Step 2: Add an idempotency test that exercises the new migration**

Append to `backend/django_Admin3/store/tests/test_migration_fee_generic.py`:

```python
class FeeGenericIdempotenceTests(TestCase):
    def test_running_ensure_migration_twice_keeps_one_row(self):
        """Re-running the ensure_fee_generic forward function must
        not duplicate the row, regardless of starting state."""
        from importlib import import_module
        from django.apps import apps
        from store.models import Purchasable

        # Drop, then run the forward function twice; expect exactly
        # one row with the canonical attribute values.
        Purchasable.objects.filter(code='FEE_GENERIC').delete()
        mod = import_module(
            'store.migrations.0015_ensure_fee_generic_exists'
        )
        mod.ensure_fee_generic(apps, None)
        mod.ensure_fee_generic(apps, None)

        rows = Purchasable.objects.filter(code='FEE_GENERIC')
        self.assertEqual(rows.count(), 1)
        row = rows.first()
        self.assertEqual(row.kind, 'additional_charge')
        self.assertTrue(row.dynamic_pricing)
        self.assertTrue(row.is_active)
        self.assertEqual(row.name, 'Generic Fee')
```

- [ ] **Step 3: Run the test and verify it fails**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  store/tests/test_migration_fee_generic.py::FeeGenericIdempotenceTests -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'store.migrations.0015_ensure_fee_generic_exists'`.

- [ ] **Step 4: Create the new migration**

`backend/django_Admin3/store/migrations/0015_ensure_fee_generic_exists.py`:

```python
"""Idempotent ensure-row migration for FEE_GENERIC Purchasable.

The original 0009_create_fee_generic_purchasable.py used get_or_create
with a delete-on-reverse. Some environments ended up missing the row
(reversed migration, fresh DB without re-applying, etc.), which made
OrderBuilder._transfer_fees fail with a NOT NULL violation on
order_items.purchasable_id. This migration is idempotent and
intentionally non-destructive on reverse — historical OrderItem rows
PROTECT-FK this row.
"""
from django.db import migrations

FEE_GENERIC_CODE = 'FEE_GENERIC'


def ensure_fee_generic(apps, schema_editor):
    Purchasable = apps.get_model('store', 'Purchasable')
    Purchasable.objects.update_or_create(
        code=FEE_GENERIC_CODE,
        defaults={
            'kind': 'additional_charge',
            'name': 'Generic Fee',
            'description': (
                'Catch-all purchasable for fee lines. Amount comes '
                'from actual_price.'
            ),
            'is_active': True,
            'dynamic_pricing': True,
            'vat_classification': '',
        },
    )


def reverse(apps, schema_editor):
    """No-op: never auto-delete this row. OrderItem.purchasable is
    PROTECT, so deletion would fail mid-reverse on any DB with
    historical fee rows."""
    pass


class Migration(migrations.Migration):
    dependencies = [('store', '0014_add_is_addon_and_drop_product_unique')]
    operations = [migrations.RunPython(ensure_fee_generic, reverse)]
```

- [ ] **Step 5: Run the idempotence test and the existing seed test**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  store/tests/test_migration_fee_generic.py -v
```

Expected: both classes PASS.

- [ ] **Step 6: Apply the migration to the dev DB and verify**

```
cd backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development python manage.py migrate store
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development python -c \
  "import django; django.setup(); from store.models import Purchasable; \
   p = Purchasable.objects.get(code='FEE_GENERIC'); print('OK', p.kind, p.name)"
```

Expected: `OK additional_charge Generic Fee`.

- [ ] **Step 7: Commit**

```
git add backend/django_Admin3/store/migrations/0015_ensure_fee_generic_exists.py \
        backend/django_Admin3/store/tests/test_migration_fee_generic.py
git commit -m "fix(store): ensure FEE_GENERIC purchasable row exists

Idempotent ensure-row migration. Original 0009 used get_or_create with
delete-on-reverse; the row went missing in dev, causing checkout 500s
on order fee transfer (purchasable_id NOT NULL violation)."
```

---

## Task 2: Defensive hard-fail in `_transfer_fees`

**Goal:** Convert the silent NULL → opaque IntegrityError path into a clear application error.

**Files:**
- Modify: `backend/django_Admin3/orders/services/order_builder.py:81-104`
- Modify: `backend/django_Admin3/orders/tests/test_order_builder.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/django_Admin3/orders/tests/test_order_builder.py`:

```python
class TransferFeesHardFailTests(TestCase):
    """`_transfer_fees` raises a clear app error when FEE_GENERIC is
    missing AND the cart actually has fees. No fees → no error."""

    def setUp(self):
        # Minimal user + cart wired through factory helpers used elsewhere
        # in this file. Keep imports local to avoid accidental drift.
        from django.contrib.auth.models import User
        from cart.models import Cart, CartFee
        from store.models import Purchasable
        from orders.services.order_builder import OrderBuilder

        self.user = User.objects.create_user(username='hardfail',
                                             email='hf@t.com')
        self.cart = Cart.objects.create(user=self.user)
        # Remove FEE_GENERIC if present
        Purchasable.objects.filter(code='FEE_GENERIC').delete()
        self.builder = OrderBuilder(
            cart=self.cart, user=self.user,
            vat_result={'totals': {'net': '0.00', 'vat': '0.00',
                                   'gross': '0.00'},
                        'items': [], 'region': 'GB'},
        )
        self.CartFee = CartFee

    def test_no_fees_no_error_even_if_fee_generic_missing(self):
        order = self.builder._create_order()
        self.builder._transfer_fees(order)  # should not raise

    def test_with_fees_missing_fee_generic_raises_runtime_error(self):
        from decimal import Decimal
        order = self.builder._create_order()
        self.CartFee.objects.create(
            cart=self.cart, fee_type='tutorial_booking_fee',
            name='Tutorial Booking Fee', amount=Decimal('1.00'),
        )
        with self.assertRaises(RuntimeError) as ctx:
            self.builder._transfer_fees(order)
        self.assertIn('FEE_GENERIC', str(ctx.exception))
        self.assertIn('migrate store', str(ctx.exception))
```

- [ ] **Step 2: Run the test and verify it fails**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  orders/tests/test_order_builder.py::TransferFeesHardFailTests -v
```

Expected: `test_no_fees_no_error_even_if_fee_generic_missing` may pass coincidentally; `test_with_fees_missing_fee_generic_raises_runtime_error` FAILS — current code raises `IntegrityError` (or `AssertionError`) not `RuntimeError`.

- [ ] **Step 3: Modify `_transfer_fees` for the hard-fail and early-out**

Edit `backend/django_Admin3/orders/services/order_builder.py`. Replace the body of `_transfer_fees`:

```python
def _transfer_fees(self, order: Order):
    # Task 23: fee lines point at the singleton FEE_GENERIC Purchasable
    # (created in store.0009 + ensured by store.0015). Resolve once.
    if not self.cart.fees.exists():
        return
    from store.models import Purchasable
    fee_purchasable = Purchasable.objects.filter(code='FEE_GENERIC').first()
    if fee_purchasable is None:
        raise RuntimeError(
            "Missing FEE_GENERIC Purchasable row — run "
            "`manage.py migrate store` to create it."
        )
    for fee in self.cart.fees.all():
        OrderItem.objects.create(
            order=order,
            purchasable=fee_purchasable,
            quantity=1,
            actual_price=fee.amount,
            net_amount=fee.amount,
            vat_amount=Decimal('0.00'),
            gross_amount=fee.amount,
            vat_rate=Decimal('0.0000'),
            is_vat_exempt=True,
            metadata={
                'fee_type': fee.fee_type,
                'fee_name': fee.name,
                'fee_description': fee.description,
                'fee_currency': fee.currency,
                'fee_id': fee.id,
            },
        )
```

- [ ] **Step 4: Run the tests**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  orders/tests/test_order_builder.py -v
```

Expected: full file PASSES (both new tests + existing).

- [ ] **Step 5: Commit**

```
git add backend/django_Admin3/orders/services/order_builder.py \
        backend/django_Admin3/orders/tests/test_order_builder.py
git commit -m "fix(orders): hard-fail clearly when FEE_GENERIC missing

Instead of letting OrderItem.create eat a None purchasable_id and
explode at the database with a NOT NULL violation, raise a RuntimeError
that points the operator at \`manage.py migrate store\`."
```

---

## Task 3: Extract shared `validate_tutorial_choice_event` helper

**Goal:** Move the OC-reject + subject-match rules out of `TutorialChoice.clean()` into a shared helper. Behavior unchanged.

**Files:**
- Modify: `backend/django_Admin3/tutorials/services/online_classroom.py`
- Modify: `backend/django_Admin3/tutorials/models/tutorial_choice.py`
- Modify: `backend/django_Admin3/tutorials/tests/test_tutorial_choice.py` (existing tests still pass)

- [ ] **Step 1: Add the helper function (no test yet — exercised by existing model tests)**

Append to `backend/django_Admin3/tutorials/services/online_classroom.py`:

```python
def validate_tutorial_choice_event(tutorial_event, line_purchasable):
    """Shared validation rule for cart/order tutorial choice rows.

    Rejects Online Classroom events (auto-enrolment lives elsewhere)
    and rejects subject mismatches between the chosen event and the
    line's purchasable. Raises ``django.core.exceptions.ValidationError``
    on either failure.

    ``line_purchasable`` is whichever ``store.Purchasable`` is on the
    line — for cart it's ``cart_item.purchasable``, for orders it's
    ``order_item.purchasable``. Both reach a ``store.Product`` via
    ``.product`` on the MTI subclass.
    """
    from django.core.exceptions import ValidationError

    if is_online_classroom_event(tutorial_event):
        raise ValidationError({
            'tutorial_event': (
                'Online Classroom events cannot be chosen — '
                'students are auto-enrolled in OC products.'
            )
        })
    try:
        event_subject = (
            tutorial_event.store_product
            .exam_session_subject.subject_id
        )
        line_subject = (
            line_purchasable.product
            .exam_session_subject.subject_id
        )
    except AttributeError:
        return
    if event_subject != line_subject:
        raise ValidationError({
            'tutorial_event': (
                "Event subject does not match the order item's subject."
            ),
        })
```

- [ ] **Step 2: Refactor `TutorialChoice.clean()` to call the helper**

Edit `backend/django_Admin3/tutorials/models/tutorial_choice.py`. Replace the existing `clean` method body:

```python
from tutorials.services.online_classroom import (
    is_online_classroom_event,  # kept for backward import compat
    validate_tutorial_choice_event,
)


class TutorialChoice(models.Model):
    # ... (fields unchanged) ...

    def clean(self):
        super().clean()
        # Cart-side passes cart_item.purchasable; order-side passes
        # order_item.purchasable. Both reach a store.Product via the
        # MTI .product attribute.
        validate_tutorial_choice_event(
            self.tutorial_event, self.order_item.purchasable,
        )
```

Remove the inline `is_online_classroom_event` check and subject lookup
that the helper now owns. Keep `from tutorials.services.online_classroom
import is_online_classroom_event` import only if any other code in the
file still uses it (it doesn't — drop it).

- [ ] **Step 3: Run the existing model tests**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  tutorials/tests/test_tutorial_choice.py -v
```

Expected: all 6 existing tests PASS unchanged. The OC-reject and
subject-mismatch tests cover the helper's two raise paths.

- [ ] **Step 4: Commit**

```
git add backend/django_Admin3/tutorials/services/online_classroom.py \
        backend/django_Admin3/tutorials/models/tutorial_choice.py
git commit -m "refactor(tutorials): extract validate_tutorial_choice_event helper

Pull OC-reject + subject-match rules out of TutorialChoice.clean into a
free function, so the upcoming CartTutorialChoice can share them
without duplicating logic."
```

---

## Task 4: `CartTutorialChoice` model — failing test

**Goal:** Test-first: define the cart-side model's required behavior.

**Files:**
- Create: `backend/django_Admin3/tutorials/tests/test_cart_tutorial_choice.py`

- [ ] **Step 1: Write the test file**

`backend/django_Admin3/tutorials/tests/test_cart_tutorial_choice.py`:

```python
"""Tests for CartTutorialChoice model.

Mirrors test_tutorial_choice.py — same constraints and validation,
but the parent FK is cart_item (CASCADE) instead of order_item, and
the relationship lifecycle is short-lived.
"""
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from datetime import date, timedelta

from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatProduct, ProductVariation, ProductProductVariation,
)
from store.models import Product as StoreProduct
from students.models import Student
from cart.models import Cart, CartItem
from tutorials.models import CartTutorialChoice, TutorialEvents


def _seed_tutorial_event(subject_code='CB1', sitting_code='24',
                         variation_type='Tutorial',
                         variation_code='LO_6H'):
    es = ExamSession.objects.create(
        session_code=sitting_code,
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(days=60),
    )
    subj, _ = Subject.objects.get_or_create(
        code=subject_code,
        defaults={'description': f'{subject_code} subject', 'active': True},
    )
    ess = ExamSessionSubject.objects.create(exam_session=es, subject=subj)
    cat_prod, _ = CatProduct.objects.get_or_create(
        code='Live',
        defaults={'fullname': 'Tutorial - Live Online', 'shortname': 'Live'},
    )
    pv, _ = ProductVariation.objects.get_or_create(
        code=variation_code,
        defaults={'name': variation_code, 'description': '',
                  'description_short': variation_code,
                  'variation_type': variation_type},
    )
    ppv, _ = ProductProductVariation.objects.get_or_create(
        product=cat_prod, product_variation=pv,
    )
    sp = StoreProduct(
        exam_session_subject=ess, product_product_variation=ppv,
        product_code=f'{subject_code}/Live/{variation_code}/{sitting_code}',
    )
    sp.save()
    event = TutorialEvents.objects.create(
        code=f'{subject_code}-01-{sitting_code}A',
        store_product=sp,
        start_date=date(2024, 1, 1),
        end_date=date(2024, 2, 1),
    )
    return event, sp, subj


def _make_student(username='alice'):
    user = User.objects.create_user(username=username,
                                    email=f'{username}@t.com')
    return Student.objects.create(user=user)


def _make_cart_item(student, store_product):
    cart = Cart.objects.create(user=student.user)
    return CartItem.objects.create(
        cart=cart, purchasable=store_product.purchasable_ptr,
    )


class CartTutorialChoiceTests(TestCase):
    def setUp(self):
        self.student = _make_student()
        self.event_a, self.sp, self.subj = _seed_tutorial_event()
        self.event_b = TutorialEvents.objects.create(
            code='CB1-02-24A', store_product=self.sp,
            start_date=date(2024, 1, 8), end_date=date(2024, 2, 8),
        )
        self.cart_item = _make_cart_item(self.student, self.sp)

    def test_create_with_valid_rank(self):
        c = CartTutorialChoice.objects.create(
            cart_item=self.cart_item, student=self.student,
            tutorial_event=self.event_a, choice_rank=1,
        )
        self.assertEqual(c.choice_rank, 1)

    def test_rejects_rank_outside_1_to_3(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CartTutorialChoice.objects.create(
                    cart_item=self.cart_item, student=self.student,
                    tutorial_event=self.event_a, choice_rank=4,
                )

    def test_unique_rank_per_cart_item(self):
        CartTutorialChoice.objects.create(
            cart_item=self.cart_item, student=self.student,
            tutorial_event=self.event_a, choice_rank=1,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CartTutorialChoice.objects.create(
                    cart_item=self.cart_item, student=self.student,
                    tutorial_event=self.event_b, choice_rank=1,
                )

    def test_unique_event_per_cart_item(self):
        CartTutorialChoice.objects.create(
            cart_item=self.cart_item, student=self.student,
            tutorial_event=self.event_a, choice_rank=1,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                CartTutorialChoice.objects.create(
                    cart_item=self.cart_item, student=self.student,
                    tutorial_event=self.event_a, choice_rank=2,
                )

    def test_clean_rejects_online_classroom_event(self):
        oc_pv, _ = ProductVariation.objects.get_or_create(
            code='OC',
            defaults={'name': 'OC', 'description': '',
                      'description_short': 'OC',
                      'variation_type': 'Online Classroom Recording'},
        )
        oc_cat, _ = CatProduct.objects.get_or_create(
            code='OC',
            defaults={'fullname': 'Online Classroom', 'shortname': 'OC'},
        )
        oc_ppv, _ = ProductProductVariation.objects.get_or_create(
            product=oc_cat, product_variation=oc_pv,
        )
        oc_sp = StoreProduct(
            exam_session_subject=self.sp.exam_session_subject,
            product_product_variation=oc_ppv,
            product_code='CB1/OC/OC/24',
        )
        oc_sp.save()
        oc_event = TutorialEvents.objects.create(
            code='CB1-OC-24A', store_product=oc_sp,
            start_date=date(2024, 1, 1), end_date=date(2024, 2, 1),
        )
        choice = CartTutorialChoice(
            cart_item=self.cart_item, student=self.student,
            tutorial_event=oc_event, choice_rank=1,
        )
        with self.assertRaises(ValidationError) as ctx:
            choice.full_clean()
        self.assertIn('Online Classroom', str(ctx.exception))

    def test_clean_rejects_event_with_mismatched_subject(self):
        other_event, _, _ = _seed_tutorial_event(subject_code='SA1')
        choice = CartTutorialChoice(
            cart_item=self.cart_item, student=self.student,
            tutorial_event=other_event, choice_rank=1,
        )
        with self.assertRaises(ValidationError) as ctx:
            choice.full_clean()
        self.assertIn('subject', str(ctx.exception).lower())

    def test_cascade_deletes_choices_with_cart_item(self):
        CartTutorialChoice.objects.create(
            cart_item=self.cart_item, student=self.student,
            tutorial_event=self.event_a, choice_rank=1,
        )
        self.cart_item.delete()
        self.assertEqual(CartTutorialChoice.objects.count(), 0)
```

- [ ] **Step 2: Run the test and verify it fails**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  tutorials/tests/test_cart_tutorial_choice.py -v
```

Expected: FAIL — `ImportError: cannot import name 'CartTutorialChoice'`.

- [ ] **Step 3: Commit the failing test**

```
git add backend/django_Admin3/tutorials/tests/test_cart_tutorial_choice.py
git commit -m "test(tutorials): add failing tests for CartTutorialChoice model"
```

---

## Task 5: Implement `CartTutorialChoice` model

**Files:**
- Create: `backend/django_Admin3/tutorials/models/cart_tutorial_choice.py`
- Modify: `backend/django_Admin3/tutorials/models/__init__.py`
- Create: `backend/django_Admin3/tutorials/migrations/0016_cart_tutorial_choice.py`

- [ ] **Step 1: Create the model file**

`backend/django_Admin3/tutorials/models/cart_tutorial_choice.py`:

```python
"""CartTutorialChoice — the student's preference (1st/2nd/3rd) of a
tutorial event captured per cart_item.

Mirrors TutorialChoice (orders side). Difference: parent FK is
cart_item (CASCADE — short-lived) instead of order_item (PROTECT —
audit-historical). Same validation rules, enforced via a shared
helper.
"""
from django.db import models

from tutorials.services.online_classroom import (
    validate_tutorial_choice_event,
)


class CartTutorialChoice(models.Model):
    CHOICE_RANKS = [(1, '1st'), (2, '2nd'), (3, '3rd')]

    cart_item = models.ForeignKey(
        'cart.CartItem', on_delete=models.CASCADE,
        related_name='tutorial_choices',
    )
    student = models.ForeignKey(
        'students.Student', on_delete=models.PROTECT,
        related_name='cart_tutorial_choices',
    )
    tutorial_event = models.ForeignKey(
        'tutorials.TutorialEvents', on_delete=models.PROTECT,
        related_name='in_cart_choices',
    )
    choice_rank = models.PositiveSmallIntegerField(choices=CHOICE_RANKS)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."cart_tutorial_choices"'
        constraints = [
            models.UniqueConstraint(
                fields=['cart_item', 'choice_rank'],
                name='uniq_cart_choice_rank_per_cart_item',
            ),
            models.UniqueConstraint(
                fields=['cart_item', 'tutorial_event'],
                name='uniq_cart_event_per_cart_item',
            ),
            models.CheckConstraint(
                condition=models.Q(choice_rank__in=[1, 2, 3]),
                name='cart_choice_rank_in_1_2_3',
            ),
        ]
        verbose_name = 'Cart Tutorial Choice'
        verbose_name_plural = 'Cart Tutorial Choices'

    def clean(self):
        super().clean()
        validate_tutorial_choice_event(
            self.tutorial_event, self.cart_item.purchasable,
        )

    def __str__(self):
        return (
            f"{self.student} → {self.tutorial_event} "
            f"(#{self.choice_rank}) [cart]"
        )
```

- [ ] **Step 2: Export from the package init**

Edit `backend/django_Admin3/tutorials/models/__init__.py` — append:

```python
from .cart_tutorial_choice import CartTutorialChoice
```

- [ ] **Step 3: Generate the migration**

```
cd backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development \
  python manage.py makemigrations tutorials \
    --name cart_tutorial_choice
```

Expected: a new file `tutorials/migrations/0016_cart_tutorial_choice.py` is created. Inspect it. The auto-generated `db_table` will likely be `acted.cart_tutorial_choices` rather than `"acted"."cart_tutorial_choices"`; that's fine because the model `Meta.db_table` is the source of truth at runtime — the migration `db_table` only affects raw `manage.py sqlmigrate` output, not the runtime ORM. If the auto-generated migration omits the schema-qualified `Meta.options`, manually edit the `CreateModel` operation to include `'db_table': '"acted"."cart_tutorial_choices"'`.

- [ ] **Step 4: Apply the migration to dev DB**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development \
  python manage.py migrate tutorials
```

Expected: `Applying tutorials.0016_cart_tutorial_choice... OK`. Verify the table exists:

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development python -c \
  "import django; django.setup(); from tutorials.models import CartTutorialChoice; \
   print('OK', CartTutorialChoice._meta.db_table)"
```

Expected: `OK "acted"."cart_tutorial_choices"`.

- [ ] **Step 5: Run the model tests**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  tutorials/tests/test_cart_tutorial_choice.py -v
```

Expected: all 7 tests PASS.

- [ ] **Step 6: Run the existing tutorial_choice tests to confirm no regressions**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  tutorials/tests/test_tutorial_choice.py -v
```

Expected: all 6 existing tests still PASS.

- [ ] **Step 7: Commit**

```
git add backend/django_Admin3/tutorials/models/cart_tutorial_choice.py \
        backend/django_Admin3/tutorials/models/__init__.py \
        backend/django_Admin3/tutorials/migrations/0016_cart_tutorial_choice.py
git commit -m "feat(tutorials): add CartTutorialChoice model

Mirrors TutorialChoice on the cart side. Same constraints and
validation (via shared helper). Parent FK uses CASCADE because cart
items are short-lived; the order-side equivalent uses PROTECT for
audit reasons."
```

---

## Task 6: CartService rewrite — failing tests

**Goal:** Test-first: lock in the new tutorial cart behavior before changing the service.

**Files:**
- Create: `backend/django_Admin3/cart/tests/test_cart_service_tutorial.py`

- [ ] **Step 1: Write the failing test file**

`backend/django_Admin3/cart/tests/test_cart_service_tutorial.py`:

```python
"""Behavioral tests for CartService tutorial flow.

Verifies that adding a tutorial product creates relational
CartTutorialChoice rows (and rebuilds the legacy metadata view).
Authentication and student-linkage are required.
"""
from datetime import date, timedelta

from django.contrib.auth.models import AnonymousUser, User
from django.core.exceptions import ValidationError
from django.test import RequestFactory, TestCase
from django.utils import timezone

from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatProduct, ProductVariation, ProductProductVariation,
)
from cart.services.cart_service import cart_service
from cart.models import Cart, CartItem
from store.models import Product as StoreProduct
from students.models import Student
from tutorials.models import CartTutorialChoice, TutorialEvents


def _seed_tutorial_product(subject_code='CB1', sitting='24'):
    es = ExamSession.objects.create(
        session_code=sitting,
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(days=60),
    )
    subj, _ = Subject.objects.get_or_create(
        code=subject_code,
        defaults={'description': f'{subject_code} subject', 'active': True},
    )
    ess = ExamSessionSubject.objects.create(exam_session=es, subject=subj)
    cat, _ = CatProduct.objects.get_or_create(
        code='Live',
        defaults={'fullname': 'Tutorial - Live Online', 'shortname': 'Live'},
    )
    pv, _ = ProductVariation.objects.get_or_create(
        code='LO_6H',
        defaults={'name': 'LO_6H', 'description': '',
                  'description_short': 'LO_6H',
                  'variation_type': 'Tutorial'},
    )
    ppv, _ = ProductProductVariation.objects.get_or_create(
        product=cat, product_variation=pv,
    )
    sp = StoreProduct(
        exam_session_subject=ess, product_product_variation=ppv,
        product_code=f'{subject_code}/Live/LO_6H/{sitting}',
    )
    sp.save()
    event_a = TutorialEvents.objects.create(
        code=f'{subject_code}-01-{sitting}A',
        store_product=sp,
        start_date=date(2024, 1, 1), end_date=date(2024, 2, 1),
    )
    event_b = TutorialEvents.objects.create(
        code=f'{subject_code}-02-{sitting}A',
        store_product=sp,
        start_date=date(2024, 1, 8), end_date=date(2024, 2, 8),
    )
    return sp, event_a, event_b, subj


def _payload(subject_code, choices):
    """Build a metadata payload in the same shape the frontend sends."""
    return {
        'type': 'tutorial',
        'subjectCode': subject_code,
        'newLocation': {
            'location': 'London',
            'choices': choices,
            'choiceCount': len(choices),
        },
    }


class TutorialAddRequiresAuthTests(TestCase):
    def setUp(self):
        self.sp, self.event_a, _, _ = _seed_tutorial_product()
        self.cart = Cart.objects.create(session_key='guest-session')

    def test_guest_cart_rejects_tutorial_add(self):
        with self.assertRaises(ValidationError) as ctx:
            cart_service.add_item(
                self.cart, self.sp.id, quantity=1,
                actual_price='10.00',
                metadata=_payload('CB1', [
                    {'choice': '1st', 'eventId': self.event_a.id,
                     'variationId': 1},
                ]),
            )
        self.assertIn('logged-in', str(ctx.exception).lower())

    def test_user_without_student_rejects_tutorial_add(self):
        user = User.objects.create_user(username='nostudent',
                                        email='ns@t.com')
        cart = Cart.objects.create(user=user)
        with self.assertRaises(ValidationError) as ctx:
            cart_service.add_item(
                cart, self.sp.id, quantity=1, actual_price='10.00',
                metadata=_payload('CB1', [
                    {'choice': '1st', 'eventId': self.event_a.id,
                     'variationId': 1},
                ]),
            )
        self.assertIn('student', str(ctx.exception).lower())


class TutorialAddCreatesChoicesTests(TestCase):
    def setUp(self):
        self.sp, self.event_a, self.event_b, self.subj = (
            _seed_tutorial_product()
        )
        self.user = User.objects.create_user(username='alice',
                                             email='a@t.com')
        self.student = Student.objects.create(user=self.user)
        self.cart = Cart.objects.create(user=self.user)

    def test_add_creates_one_cart_item_and_choice_rows(self):
        item, err = cart_service.add_item(
            self.cart, self.sp.id, quantity=1, actual_price='10.00',
            metadata=_payload('CB1', [
                {'choice': '1st', 'eventId': self.event_a.id,
                 'variationId': 1},
                {'choice': '2nd', 'eventId': self.event_b.id,
                 'variationId': 2},
            ]),
        )
        self.assertIsNone(err)
        self.assertEqual(CartItem.objects.filter(cart=self.cart).count(),
                         1)
        choices = list(item.tutorial_choices.order_by('choice_rank'))
        self.assertEqual([c.choice_rank for c in choices], [1, 2])
        self.assertEqual(
            [c.tutorial_event_id for c in choices],
            [self.event_a.id, self.event_b.id],
        )
        self.assertEqual(set(c.student_id for c in choices),
                         {self.student.id})

    def test_subsequent_add_for_same_subject_merges_into_same_cart_item(self):
        cart_service.add_item(
            self.cart, self.sp.id, quantity=1, actual_price='10.00',
            metadata=_payload('CB1', [
                {'choice': '1st', 'eventId': self.event_a.id,
                 'variationId': 1},
            ]),
        )
        item, _ = cart_service.add_item(
            self.cart, self.sp.id, quantity=1, actual_price='10.00',
            metadata=_payload('CB1', [
                {'choice': '2nd', 'eventId': self.event_b.id,
                 'variationId': 2},
            ]),
        )
        self.assertEqual(CartItem.objects.filter(cart=self.cart).count(),
                         1)
        self.assertEqual(item.tutorial_choices.count(), 2)

    def test_resending_same_rank_replaces_event(self):
        cart_service.add_item(
            self.cart, self.sp.id, quantity=1, actual_price='10.00',
            metadata=_payload('CB1', [
                {'choice': '1st', 'eventId': self.event_a.id,
                 'variationId': 1},
            ]),
        )
        item, _ = cart_service.add_item(
            self.cart, self.sp.id, quantity=1, actual_price='10.00',
            metadata=_payload('CB1', [
                {'choice': '1st', 'eventId': self.event_b.id,
                 'variationId': 2},
            ]),
        )
        ranks = list(item.tutorial_choices.values_list(
            'choice_rank', 'tutorial_event_id'))
        self.assertEqual(ranks, [(1, self.event_b.id)])

    def test_invalid_rank_label_raises(self):
        with self.assertRaises(ValidationError):
            cart_service.add_item(
                self.cart, self.sp.id, quantity=1, actual_price='10.00',
                metadata=_payload('CB1', [
                    {'choice': '4th', 'eventId': self.event_a.id,
                     'variationId': 1},
                ]),
            )

    def test_metadata_view_is_rebuilt_after_upsert(self):
        item, _ = cart_service.add_item(
            self.cart, self.sp.id, quantity=1, actual_price='10.00',
            metadata=_payload('CB1', [
                {'choice': '1st', 'eventId': self.event_a.id,
                 'variationId': 1},
                {'choice': '2nd', 'eventId': self.event_b.id,
                 'variationId': 2},
            ]),
        )
        item.refresh_from_db()
        meta = item.metadata or {}
        self.assertEqual(meta.get('type'), 'tutorial')
        self.assertEqual(meta.get('subjectCode'), 'CB1')
        # locations[].choices[] reflects the relational rows
        choices_in_meta = sum(
            len(loc.get('choices', [])) for loc in meta.get('locations', [])
        )
        self.assertEqual(choices_in_meta, 2)
        self.assertEqual(meta.get('totalChoiceCount'), 2)
```

- [ ] **Step 2: Run the tests and verify they fail**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  cart/tests/test_cart_service_tutorial.py -v
```

Expected: most tests FAIL — `_handle_tutorial_add` currently writes only metadata, never relational rows; auth gate not enforced.

- [ ] **Step 3: Commit the failing tests**

```
git add backend/django_Admin3/cart/tests/test_cart_service_tutorial.py
git commit -m "test(cart): add failing tests for relational tutorial cart flow"
```

---

## Task 7: CartService rewrite — implementation

**Goal:** Make Task 6's tests pass. Rewrite `_handle_tutorial_add` and the supporting helpers.

**Files:**
- Modify: `backend/django_Admin3/cart/services/cart_service.py`

- [ ] **Step 1: Add module-level constants and `_require_student`**

Edit the top of `cart/services/cart_service.py`. Below the existing `CART_ITEM_VAT_FIELDS` constant, add:

```python
# Tutorial choice rank label → integer (matches frontend
# `tutorialMetadataBuilder.ts`).
TUTORIAL_RANK_MAP = {'1st': 1, '2nd': 2, '3rd': 3}
TUTORIAL_RANK_LABEL = {v: k for k, v in TUTORIAL_RANK_MAP.items()}
MAX_TUTORIAL_RANKS_PER_SUBJECT = 3
```

Inside the `CartService` class, add the auth helper. Place it near the
other private helpers (anywhere after `__init__`/the public API):

```python
def _require_student(self, cart):
    from django.core.exceptions import ValidationError
    from students.models import Student

    user = getattr(cart, 'user', None)
    if user is None or not user.is_authenticated:
        raise ValidationError(
            "Tutorial purchases require a logged-in user.")
    student = Student.objects.filter(user=user).first()
    if student is None:
        raise ValidationError(
            "User has no linked student record. "
            "Tutorial purchases require a student profile.")
    return student
```

- [ ] **Step 2: Rewrite `_handle_tutorial_add`**

Replace the existing method body in `cart/services/cart_service.py`:

```python
def _handle_tutorial_add(self, cart, product, quantity, price_type,
                        actual_price, metadata):
    """Add a tutorial product line: one CartItem per (cart, product),
    plus up to 3 CartTutorialChoice rows (rank 1/2/3) per cart_item.

    Auth-gated: requires a logged-in user with a linked Student row.
    """
    student = self._require_student(cart)

    subject_code = metadata.get('subjectCode')
    new_location = metadata.get('newLocation') or {}
    incoming_choices = new_location.get('choices', [])

    # Defensive fallback: if frontend sends a non-conforming payload
    # (no subject + no choices), treat it as a regular add — preserves
    # the old permissive behavior for non-tutorial-shape requests
    # that happen to be tagged type='tutorial'.
    if not (subject_code and incoming_choices):
        return self._create_item(
            cart, product, quantity, price_type, actual_price, metadata,
        )

    # Find or create the cart_item for (cart, product). Uses the
    # purchasable FK as the merge key — NOT metadata.subjectCode.
    item = CartItem.objects.filter(
        cart=cart, purchasable_id=product.pk, price_type=price_type,
    ).first()
    if item is None:
        # Strip choice data from initial metadata so it doesn't go
        # stale. _refresh_tutorial_metadata will rebuild it from rows.
        seed_metadata = {
            'type': 'tutorial',
            'subjectCode': subject_code,
            'title': metadata.get('title', f"{subject_code} Tutorial"),
            'locations': [],
            'totalChoiceCount': 0,
        }
        item = self._create_item(
            cart, product, quantity, price_type, actual_price,
            seed_metadata,
        )

    self._upsert_tutorial_choices(item, student, incoming_choices)
    self._refresh_tutorial_metadata(item)

    # Lower the line price if the new add brought a cheaper option,
    # mirroring the prior _merge_tutorial_locations behavior.
    if actual_price is not None:
        from decimal import Decimal
        new_price = Decimal(str(actual_price))
        if item.actual_price is None or new_price < item.actual_price:
            item.actual_price = new_price
            item.save(update_fields=['actual_price'])

    return item
```

- [ ] **Step 3: Add `_upsert_tutorial_choices`**

Add this private method to `CartService` (anywhere after
`_handle_tutorial_add`):

```python
def _upsert_tutorial_choices(self, item, student, incoming):
    """Reconcile incoming `[{choice, eventId, ...}]` payload against
    the cart_item's CartTutorialChoice rows.

    For each incoming row:
      - resolve label → rank (1/2/3); reject unknown labels
      - delete any existing row for this rank OR this event_id
        on this cart_item (so a re-submit replaces cleanly)
      - create the new row, full_clean()-validated (OC + subject)

    Caps at 3 rows; raises ValidationError if exceeded.
    """
    from django.core.exceptions import ValidationError
    from tutorials.models import CartTutorialChoice

    for c in incoming:
        rank = TUTORIAL_RANK_MAP.get(c.get('choice'))
        event_id = c.get('eventId')
        if rank is None:
            raise ValidationError(
                f"Invalid choice rank label: {c.get('choice')!r}. "
                f"Expected one of {sorted(TUTORIAL_RANK_MAP)}.")
        if event_id is None:
            raise ValidationError(
                f"Tutorial choice payload missing eventId: {c!r}")

        # Replace conflicts: existing rank, or existing event for this
        # cart_item.
        CartTutorialChoice.objects.filter(
            cart_item=item, choice_rank=rank,
        ).delete()
        CartTutorialChoice.objects.filter(
            cart_item=item, tutorial_event_id=event_id,
        ).delete()

        choice = CartTutorialChoice(
            cart_item=item, student=student,
            tutorial_event_id=event_id, choice_rank=rank,
        )
        choice.full_clean()  # raises on OC / subject mismatch
        choice.save()

    if item.tutorial_choices.count() > MAX_TUTORIAL_RANKS_PER_SUBJECT:
        raise ValidationError(
            f"At most {MAX_TUTORIAL_RANKS_PER_SUBJECT} tutorial "
            f"choices per subject.")
```

- [ ] **Step 4: Add `_refresh_tutorial_metadata`**

Add this private method to `CartService`:

```python
def _refresh_tutorial_metadata(self, item):
    """Rebuild `item.metadata.locations[].choices[]` from the
    relational rows so legacy readers (admin views, email templates,
    older frontend code) stay consistent during the transition.

    Output shape matches `frontend/.../tutorialMetadataBuilder.ts`:
      {type, subjectCode, title, locations: [
        {location, choices: [{choice, eventId, eventCode, eventTitle,
          venue, location, startDate, endDate, variationId,
          variationName}], choiceCount}
      ], totalChoiceCount}
    Choices grouped by event location, ordered by rank within each.
    """
    rows = list(item.tutorial_choices.select_related(
        'tutorial_event__store_product__product_product_variation'
        '__product_variation',
        'tutorial_event__store_product__exam_session_subject__subject',
    ).order_by('choice_rank'))

    metadata = item.metadata or {}
    subject_code = metadata.get('subjectCode')
    if subject_code is None and rows:
        subject_code = (
            rows[0].tutorial_event.store_product
            .exam_session_subject.subject.code
        )

    title = metadata.get('title') or f"{subject_code} Tutorial"

    # Group by location label
    by_location = {}
    for row in rows:
        ev = row.tutorial_event
        sp = ev.store_product
        ppv = sp.product_product_variation
        # ev.location_label is preferred; fall back to a plain string
        # built from whatever attributes exist. TutorialEvents has a
        # `location` attribute via store_product → ESS → ... so the
        # safest fallback is the event code's prefix.
        loc_label = (
            getattr(ev, 'location_label', None)
            or getattr(ev, 'location', None)
            or 'TBD'
        )
        venue = getattr(ev, 'venue', None) or ''
        choice_dict = {
            'choice': TUTORIAL_RANK_LABEL[row.choice_rank],
            'eventId': ev.id,
            'eventCode': ev.code,
            'eventTitle': str(ev),
            'venue': venue,
            'location': loc_label,
            'startDate': ev.start_date.isoformat() if ev.start_date else None,
            'endDate': ev.end_date.isoformat() if ev.end_date else None,
            'variationId': ppv.id if ppv else None,
            'variationName': (
                ppv.product_variation.name if ppv else None
            ),
        }
        by_location.setdefault(loc_label, []).append(choice_dict)

    locations_list = []
    for loc_label, choices in by_location.items():
        locations_list.append({
            'location': loc_label,
            'choices': choices,
            'choiceCount': len(choices),
        })

    item.metadata = {
        'type': 'tutorial',
        'subjectCode': subject_code,
        'title': title,
        'locations': locations_list,
        'totalChoiceCount': sum(len(loc['choices'])
                                for loc in locations_list),
    }
    item.save(update_fields=['metadata'])
```

- [ ] **Step 5: Update `_is_tutorial_product` to prefer relational check**

Edit the existing method in `cart/services/cart_service.py`:

```python
def _is_tutorial_product(self, cart_item):
    """Check if cart item is a tutorial product. Prefers the relational
    CartTutorialChoice rows; falls back to legacy metadata for old rows
    that pre-date the relational migration."""
    try:
        if cart_item.tutorial_choices.exists():
            return True
        metadata = cart_item.metadata or {}
        if metadata.get('type') == 'tutorial':
            return True
        if cart_item.product:
            product = cart_item.product.product
            if product and hasattr(product, 'code'):
                if (product.code in ['T', 'TUT']
                        or 'tutorial' in product.fullname.lower()):
                    return True
        return False
    except Exception:
        return False
```

- [ ] **Step 6: Remove the now-dead `_merge_tutorial_locations` method**

The old metadata-only `_merge_tutorial_locations` is unreferenced after
the rewrite. Delete it from `cart/services/cart_service.py`.

- [ ] **Step 7: Run the cart service tests**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  cart/tests/test_cart_service_tutorial.py -v
```

Expected: all tests PASS.

- [ ] **Step 8: Run the broader cart test suite to check regressions**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  cart/tests -v
```

Expected: PASS (or only pre-existing unrelated failures per
[MEMORY.md](../../../.claude/projects/-Users-work-Documents-Code-Admin3/memory/MEMORY.md)). Investigate any new failure.

- [ ] **Step 9: Commit**

```
git add backend/django_Admin3/cart/services/cart_service.py \
        backend/django_Admin3/cart/tests/test_cart_service_tutorial.py
git commit -m "feat(cart): write tutorial choices as relational rows

Rewrite _handle_tutorial_add to upsert CartTutorialChoice rows from
the incoming metadata payload. Metadata is rebuilt from rows for
display continuity; relational rows are now the source of truth."
```

---

## Task 8: OrderBuilder copies cart choices to order choices

**Files:**
- Modify: `backend/django_Admin3/orders/services/order_builder.py:46-79`
- Modify: `backend/django_Admin3/orders/tests/test_order_builder.py`

- [ ] **Step 1: Write the failing test**

Append to `backend/django_Admin3/orders/tests/test_order_builder.py`:

```python
class TransferTutorialChoicesTests(TestCase):
    """OrderBuilder copies CartTutorialChoice rows into TutorialChoice
    rows on the new OrderItem, 1-to-1, inside the existing atomic
    transaction."""

    def setUp(self):
        from datetime import date, timedelta
        from django.contrib.auth.models import User
        from django.utils import timezone
        from cart.models import Cart, CartItem
        from catalog.models import (
            ExamSession, ExamSessionSubject, Subject,
            Product as CatProduct, ProductVariation,
            ProductProductVariation,
        )
        from store.models import Product as StoreProduct
        from students.models import Student
        from tutorials.models import CartTutorialChoice, TutorialEvents

        self.user = User.objects.create_user(username='c', email='c@t.com')
        self.student = Student.objects.create(user=self.user)
        self.cart = Cart.objects.create(user=self.user)

        es = ExamSession.objects.create(
            session_code='25',
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=60))
        subj, _ = Subject.objects.get_or_create(
            code='CM2',
            defaults={'description': 'CM2', 'active': True})
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=subj)
        cat, _ = CatProduct.objects.get_or_create(
            code='Live',
            defaults={'fullname': 'Tutorial - Live',
                      'shortname': 'Live'})
        pv, _ = ProductVariation.objects.get_or_create(
            code='LO_6H',
            defaults={'name': 'LO_6H', 'description': '',
                      'description_short': 'LO_6H',
                      'variation_type': 'Tutorial'})
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cat, product_variation=pv)
        sp = StoreProduct(
            exam_session_subject=ess, product_product_variation=ppv,
            product_code='CM2/Live/LO_6H/25')
        sp.save()
        self.event_a = TutorialEvents.objects.create(
            code='CM2-01-25A', store_product=sp,
            start_date=date(2025, 1, 1), end_date=date(2025, 2, 1))
        self.event_b = TutorialEvents.objects.create(
            code='CM2-02-25A', store_product=sp,
            start_date=date(2025, 1, 8), end_date=date(2025, 2, 8))
        self.cart_item = CartItem.objects.create(
            cart=self.cart, purchasable=sp.purchasable_ptr,
            actual_price='10.00', quantity=1)
        CartTutorialChoice.objects.create(
            cart_item=self.cart_item, student=self.student,
            tutorial_event=self.event_a, choice_rank=1)
        CartTutorialChoice.objects.create(
            cart_item=self.cart_item, student=self.student,
            tutorial_event=self.event_b, choice_rank=2)

    def test_choices_copied_to_order_item(self):
        from orders.services.order_builder import OrderBuilder
        from tutorials.models import TutorialChoice
        builder = OrderBuilder(
            cart=self.cart, user=self.user,
            vat_result={'totals': {'net': '10.00', 'vat': '0.00',
                                   'gross': '10.00'},
                        'items': [], 'region': 'GB'})
        order = builder.build()
        order_item = order.items.first()
        choices = TutorialChoice.objects.filter(order_item=order_item)
        self.assertEqual(choices.count(), 2)
        self.assertEqual(
            sorted(choices.values_list('choice_rank',
                                       'tutorial_event_id')),
            sorted([(1, self.event_a.id), (2, self.event_b.id)]))

    def test_no_choices_no_op(self):
        from orders.services.order_builder import OrderBuilder
        from tutorials.models import TutorialChoice
        # Wipe existing cart choices and re-test that build is a no-op
        # for tutorial choices on a non-tutorial cart_item.
        from tutorials.models import CartTutorialChoice
        CartTutorialChoice.objects.filter(
            cart_item=self.cart_item).delete()
        builder = OrderBuilder(
            cart=self.cart, user=self.user,
            vat_result={'totals': {'net': '10.00', 'vat': '0.00',
                                   'gross': '10.00'},
                        'items': [], 'region': 'GB'})
        order = builder.build()
        self.assertEqual(
            TutorialChoice.objects.filter(
                order_item__order=order).count(), 0)
```

- [ ] **Step 2: Run the test and verify it fails**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  orders/tests/test_order_builder.py::TransferTutorialChoicesTests -v
```

Expected: `test_choices_copied_to_order_item` FAILS — no copy logic
yet, count is 0.

- [ ] **Step 3: Add `_transfer_tutorial_choices` and call it from `_transfer_items`**

Edit `backend/django_Admin3/orders/services/order_builder.py`. Add the
new method below `_transfer_items` (or above `_transfer_fees`, your
choice):

```python
def _transfer_tutorial_choices(self, cart_item, order_item):
    """If the cart line has CartTutorialChoice rows, copy them into
    TutorialChoice rows on the new order_item. Validation already
    ran at add-to-cart time; rely on DB constraints here."""
    from tutorials.models import TutorialChoice

    cart_choices = list(cart_item.tutorial_choices.select_related(
        'student', 'tutorial_event'))
    if not cart_choices:
        return
    TutorialChoice.objects.bulk_create([
        TutorialChoice(
            order_item=order_item,
            student=c.student,
            tutorial_event=c.tutorial_event,
            choice_rank=c.choice_rank,
        )
        for c in cart_choices
    ])
```

In `_transfer_items`, after `OrderItem.objects.create(...)`, add:

```python
            self._transfer_tutorial_choices(item, order_item)
```

The full updated end of `_transfer_items` should read:

```python
            order_item = OrderItem.objects.create(
                order=order,
                purchasable_id=item.purchasable_id,
                quantity=item.quantity,
                price_type=item.price_type,
                actual_price=item.actual_price,
                net_amount=net_amount,
                vat_amount=vat_amount,
                gross_amount=gross_amount,
                vat_rate=vat_rate,
                is_vat_exempt=(vat_rate == Decimal('0.0000')),
                metadata=item.metadata,
            )
            self._transfer_tutorial_choices(item, order_item)
```

(`OrderItem.objects.create` originally returned the new instance to a
local; if it didn't, capture it now into `order_item =`.)

- [ ] **Step 4: Run the order_builder tests**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  orders/tests/test_order_builder.py -v
```

Expected: all tests PASS, including the two new `TransferTutorialChoicesTests`.

- [ ] **Step 5: Commit**

```
git add backend/django_Admin3/orders/services/order_builder.py \
        backend/django_Admin3/orders/tests/test_order_builder.py
git commit -m "feat(orders): copy CartTutorialChoice → TutorialChoice on build

OrderBuilder._transfer_tutorial_choices runs inside the existing
atomic transaction; partial failures roll back the whole order. No
re-validation at checkout — relies on at-add-time validation plus
DB constraints (intentional, see spec)."
```

---

## Task 9: Cart serializer dual-emit

**Goal:** Surface the new relational data in cart-read responses without breaking the existing metadata-based clients.

**Files:**
- Modify: `backend/django_Admin3/cart/serializers.py`
- Modify: `backend/django_Admin3/cart/views.py` (prefetch)
- Modify: `backend/django_Admin3/cart/tests/test_serializers.py`

- [ ] **Step 1: Write the failing serializer test**

Append to `backend/django_Admin3/cart/tests/test_serializers.py`:

```python
class CartItemTutorialChoicesSerializerTests(TestCase):
    def test_serializer_emits_tutorial_choices_array(self):
        from datetime import date, timedelta
        from django.contrib.auth.models import User
        from django.utils import timezone
        from cart.models import Cart, CartItem
        from cart.serializers import CartItemSerializer
        from catalog.models import (
            ExamSession, ExamSessionSubject, Subject,
            Product as CatProduct, ProductVariation,
            ProductProductVariation,
        )
        from store.models import Product as StoreProduct
        from students.models import Student
        from tutorials.models import (
            CartTutorialChoice, TutorialEvents,
        )

        user = User.objects.create_user(username='s', email='s@t.com')
        student = Student.objects.create(user=user)
        cart = Cart.objects.create(user=user)
        es = ExamSession.objects.create(
            session_code='25',
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=60))
        subj, _ = Subject.objects.get_or_create(
            code='CB1',
            defaults={'description': 'CB1', 'active': True})
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=subj)
        cat, _ = CatProduct.objects.get_or_create(
            code='Live',
            defaults={'fullname': 'T - Live', 'shortname': 'Live'})
        pv, _ = ProductVariation.objects.get_or_create(
            code='LO_6H',
            defaults={'name': 'LO_6H', 'description': '',
                      'description_short': 'LO_6H',
                      'variation_type': 'Tutorial'})
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cat, product_variation=pv)
        sp = StoreProduct(
            exam_session_subject=ess, product_product_variation=ppv,
            product_code='CB1/Live/LO_6H/25')
        sp.save()
        event = TutorialEvents.objects.create(
            code='CB1-01-25A', store_product=sp,
            start_date=date(2025, 1, 1), end_date=date(2025, 2, 1))
        item = CartItem.objects.create(
            cart=cart, purchasable=sp.purchasable_ptr,
            actual_price='10.00', quantity=1)
        CartTutorialChoice.objects.create(
            cart_item=item, student=student,
            tutorial_event=event, choice_rank=1)

        data = CartItemSerializer(item).data
        self.assertIn('tutorial_choices', data)
        self.assertEqual(len(data['tutorial_choices']), 1)
        choice = data['tutorial_choices'][0]
        self.assertEqual(choice['choice_rank'], 1)
        self.assertEqual(choice['tutorial_event_id'], event.id)
        self.assertEqual(choice['student_id'], student.id)
        self.assertEqual(choice['event_code'], 'CB1-01-25A')
        self.assertEqual(choice['event_subject_code'], 'CB1')
```

- [ ] **Step 2: Run the test and verify it fails**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  cart/tests/test_serializers.py::CartItemTutorialChoicesSerializerTests -v
```

Expected: FAIL — `'tutorial_choices'` not in serialized data.

- [ ] **Step 3: Add the nested serializer and field**

Edit `backend/django_Admin3/cart/serializers.py`. After the existing
imports, add:

```python
class CartTutorialChoiceSerializer(serializers.Serializer):
    """Read-only nested serializer for cart-side tutorial choices."""
    id = serializers.IntegerField(read_only=True)
    choice_rank = serializers.IntegerField(read_only=True)
    student_id = serializers.IntegerField(read_only=True)
    tutorial_event_id = serializers.IntegerField(read_only=True)
    event_code = serializers.CharField(
        source='tutorial_event.code', read_only=True)
    event_subject_code = serializers.CharField(
        source=(
            'tutorial_event.store_product'
            '.exam_session_subject.subject.code'),
        read_only=True)
```

Inside `CartItemSerializer`, after the `purchasable = ...` line, add:

```python
    tutorial_choices = CartTutorialChoiceSerializer(
        many=True, read_only=True)
```

In the same class's `Meta.fields`, append `'tutorial_choices'`:

```python
        fields = [
            'id', 'current_product', 'product_id', 'product_name',
            'product_code', 'subject_code', 'exam_session_code',
            'product_type', 'quantity', 'price_type', 'actual_price',
            'metadata', 'is_marking', 'has_expired_deadline',
            'expired_deadlines_count', 'marking_paper_count',
            'net_amount', 'vat_region', 'vat_rate', 'vat_amount',
            'gross_amount', 'purchasable', 'tutorial_choices',
        ]
```

- [ ] **Step 4: Run the serializer test**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  cart/tests/test_serializers.py::CartItemTutorialChoicesSerializerTests -v
```

Expected: PASS.

- [ ] **Step 5: Add prefetch on cart views**

Open `backend/django_Admin3/cart/views.py`. Locate the cart retrieve / list
querysets (look for `.items.all()` / `prefetch_related` on cart endpoints).
For every queryset that loads cart items for read endpoints, append the
new prefetch path:

```
'items__tutorial_choices__tutorial_event__store_product__exam_session_subject__subject',
'items__tutorial_choices__student',
```

If the file currently uses `Cart.objects.get(...)` without prefetch, add:

```python
Cart.objects.prefetch_related(
    'items__tutorial_choices__tutorial_event__store_product'
    '__exam_session_subject__subject',
    'items__tutorial_choices__student',
).get(...)
```

(Only on read paths. Don't touch the add/remove flows.)

- [ ] **Step 6: Run the cart test suite**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  cart/tests -v
```

Expected: PASS (or only pre-existing unrelated failures).

- [ ] **Step 7: Commit**

```
git add backend/django_Admin3/cart/serializers.py \
        backend/django_Admin3/cart/views.py \
        backend/django_Admin3/cart/tests/test_serializers.py
git commit -m "feat(cart): emit tutorial_choices on CartItemSerializer

Dual-emit alongside the legacy metadata.locations[].choices[]. Adds
prefetch_related on cart read endpoints to avoid N+1."
```

---

## Task 10: Order serializer dual-emit + prefetch

**Files:**
- Modify: `backend/django_Admin3/orders/serializers/order_serializer.py`
- Modify: `backend/django_Admin3/orders/views.py`
- Modify: `backend/django_Admin3/orders/tests/test_serializer_purchasable.py` (or `test_views.py`)

- [ ] **Step 1: Write the failing serializer test**

Append to `backend/django_Admin3/orders/tests/test_serializer_purchasable.py`:

```python
class OrderItemTutorialChoicesSerializerTests(TestCase):
    def test_serializer_emits_tutorial_choices_array(self):
        from datetime import date, timedelta
        from django.contrib.auth.models import User
        from django.utils import timezone
        from catalog.models import (
            ExamSession, ExamSessionSubject, Subject,
            Product as CatProduct, ProductVariation,
            ProductProductVariation,
        )
        from store.models import Product as StoreProduct
        from students.models import Student
        from orders.models import Order, OrderItem
        from orders.serializers.order_serializer import (
            OrderItemSerializer,
        )
        from tutorials.models import TutorialChoice, TutorialEvents

        user = User.objects.create_user(username='os', email='os@t.com')
        student = Student.objects.create(user=user)
        es = ExamSession.objects.create(
            session_code='25',
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=60))
        subj, _ = Subject.objects.get_or_create(
            code='SP1',
            defaults={'description': 'SP1', 'active': True})
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=subj)
        cat, _ = CatProduct.objects.get_or_create(
            code='Live',
            defaults={'fullname': 'T - Live', 'shortname': 'Live'})
        pv, _ = ProductVariation.objects.get_or_create(
            code='LO_6H',
            defaults={'name': 'LO_6H', 'description': '',
                      'description_short': 'LO_6H',
                      'variation_type': 'Tutorial'})
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cat, product_variation=pv)
        sp = StoreProduct(
            exam_session_subject=ess, product_product_variation=ppv,
            product_code='SP1/Live/LO_6H/25')
        sp.save()
        event = TutorialEvents.objects.create(
            code='SP1-01-25A', store_product=sp,
            start_date=date(2025, 1, 1), end_date=date(2025, 2, 1))
        order = Order.objects.create(user=user)
        item = OrderItem.objects.create(
            order=order, purchasable=sp.purchasable_ptr)
        TutorialChoice.objects.create(
            order_item=item, student=student,
            tutorial_event=event, choice_rank=1)

        data = OrderItemSerializer(item).data
        self.assertIn('tutorial_choices', data)
        self.assertEqual(len(data['tutorial_choices']), 1)
        self.assertEqual(data['tutorial_choices'][0]['choice_rank'], 1)
        self.assertEqual(
            data['tutorial_choices'][0]['tutorial_event_id'], event.id)
```

- [ ] **Step 2: Run and verify it fails**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  orders/tests/test_serializer_purchasable.py::OrderItemTutorialChoicesSerializerTests -v
```

Expected: FAIL.

- [ ] **Step 3: Add the nested serializer + field**

Edit `backend/django_Admin3/orders/serializers/order_serializer.py`.
Above the `OrderItemSerializer` class, add:

```python
class OrderTutorialChoiceSerializer(serializers.Serializer):
    """Read-only nested serializer for order-side tutorial choices."""
    id = serializers.IntegerField(read_only=True)
    choice_rank = serializers.IntegerField(read_only=True)
    student_id = serializers.IntegerField(read_only=True)
    tutorial_event_id = serializers.IntegerField(read_only=True)
    event_code = serializers.CharField(
        source='tutorial_event.code', read_only=True)
    event_subject_code = serializers.CharField(
        source=(
            'tutorial_event.store_product'
            '.exam_session_subject.subject.code'),
        read_only=True)
```

In `OrderItemSerializer`, add the field declaration alongside the
existing `purchasable = ...`:

```python
    tutorial_choices = OrderTutorialChoiceSerializer(
        many=True, read_only=True)
```

…and append `'tutorial_choices'` to `Meta.fields`.

- [ ] **Step 4: Run the test**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  orders/tests/test_serializer_purchasable.py::OrderItemTutorialChoicesSerializerTests -v
```

Expected: PASS.

- [ ] **Step 5: Add prefetch on order views**

Open `backend/django_Admin3/orders/views.py`. For all read endpoints
(list, retrieve, history, etc.) that load `Order` rows with `items`,
append the prefetch path:

```python
'items__tutorial_choices__tutorial_event__store_product__exam_session_subject__subject',
'items__tutorial_choices__student',
```

- [ ] **Step 6: Run the orders test suite**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  orders/tests -v
```

Expected: PASS.

- [ ] **Step 7: Commit**

```
git add backend/django_Admin3/orders/serializers/order_serializer.py \
        backend/django_Admin3/orders/views.py \
        backend/django_Admin3/orders/tests/test_serializer_purchasable.py
git commit -m "feat(orders): emit tutorial_choices on OrderItemSerializer

Dual-emit alongside the legacy metadata. Adds prefetch_related on
order read endpoints to avoid N+1 on cart→order tutorial choices."
```

---

## Task 11: End-to-end checkout integration test

**Goal:** Lock in that POST cart-add (tutorial) → POST checkout produces an `Order` with both fee `OrderItem` rows AND `TutorialChoice` rows, with no 500.

**Files:**
- Modify: `backend/django_Admin3/orders/tests/test_checkout_orchestrator.py`

- [ ] **Step 1: Write the failing test**

Append:

```python
class CheckoutWithTutorialAndFeeTests(TestCase):
    """Reproduces the original 500: tutorial cart + tutorial booking
    fee → checkout creates Order with TutorialChoice rows and a fee
    OrderItem pointing at FEE_GENERIC."""

    def test_checkout_persists_tutorial_choices_and_fee_line(self):
        from datetime import date, timedelta
        from decimal import Decimal
        from django.contrib.auth.models import User
        from django.test import RequestFactory
        from django.utils import timezone
        from cart.models import Cart, CartFee
        from cart.services.cart_service import cart_service
        from catalog.models import (
            ExamSession, ExamSessionSubject, Subject,
            Product as CatProduct, ProductVariation,
            ProductProductVariation,
        )
        from store.models import Product as StoreProduct, Purchasable
        from students.models import Student
        from orders.services.checkout_orchestrator import (
            CheckoutOrchestrator,
        )
        from tutorials.models import TutorialEvents, TutorialChoice

        # Ensure FEE_GENERIC seed exists (Task 1 migration).
        Purchasable.objects.update_or_create(
            code='FEE_GENERIC',
            defaults={'kind': 'additional_charge',
                      'name': 'Generic Fee',
                      'description': 'Catch-all',
                      'is_active': True,
                      'dynamic_pricing': True,
                      'vat_classification': ''})

        user = User.objects.create_user(username='e2e', email='e@t.com')
        Student.objects.create(user=user)
        cart = Cart.objects.create(user=user)

        es = ExamSession.objects.create(
            session_code='25',
            start_date=timezone.now(),
            end_date=timezone.now() + timedelta(days=60))
        subj, _ = Subject.objects.get_or_create(
            code='CP1',
            defaults={'description': 'CP1', 'active': True})
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=subj)
        cat, _ = CatProduct.objects.get_or_create(
            code='Live',
            defaults={'fullname': 'T - Live', 'shortname': 'Live'})
        pv, _ = ProductVariation.objects.get_or_create(
            code='LO_6H',
            defaults={'name': 'LO_6H', 'description': '',
                      'description_short': 'LO_6H',
                      'variation_type': 'Tutorial'})
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cat, product_variation=pv)
        sp = StoreProduct(
            exam_session_subject=ess, product_product_variation=ppv,
            product_code='CP1/Live/LO_6H/25')
        sp.save()
        event = TutorialEvents.objects.create(
            code='CP1-01-25A', store_product=sp,
            start_date=date(2025, 1, 1), end_date=date(2025, 2, 1))

        # Add tutorial via the cart service (relational path).
        item, err = cart_service.add_item(
            cart, sp.id, quantity=1, actual_price='10.00',
            metadata={'type': 'tutorial', 'subjectCode': 'CP1',
                      'newLocation': {'location': 'London',
                                      'choices': [{'choice': '1st',
                                                   'eventId': event.id,
                                                   'variationId':
                                                   ppv.id}],
                                      'choiceCount': 1}})
        self.assertIsNone(err)

        CartFee.objects.create(
            cart=cart, fee_type='tutorial_booking_fee',
            name='Tutorial Booking Fee', amount=Decimal('1.00'))

        # Run the orchestrator's build step directly (skip payment).
        from orders.services.order_builder import OrderBuilder
        builder = OrderBuilder(
            cart=cart, user=user,
            vat_result={'totals': {'net': '11.00', 'vat': '0.00',
                                   'gross': '11.00'},
                        'items': [], 'region': 'GB'})
        order = builder.build()

        # Order has 2 items: the tutorial product line + the fee line.
        self.assertEqual(order.items.count(), 2)
        self.assertEqual(
            TutorialChoice.objects.filter(
                order_item__order=order).count(), 1)
        # Fee row is non-null on purchasable now
        fee_item = order.items.filter(
            purchasable__code='FEE_GENERIC').first()
        self.assertIsNotNone(fee_item)
```

- [ ] **Step 2: Run, verify it now passes (this is more a regression-lock test)**

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  orders/tests/test_checkout_orchestrator.py::CheckoutWithTutorialAndFeeTests -v
```

Expected: PASS — Tasks 1–10 should already make this work.

- [ ] **Step 3: Commit**

```
git add backend/django_Admin3/orders/tests/test_checkout_orchestrator.py
git commit -m "test(orders): e2e test for tutorial cart + fee checkout"
```

---

## Task 12: Final regression sweep

**Goal:** Ensure nothing else regressed; verify the live 500 is gone.

- [ ] **Step 1: Run the full backend test suite**

```
cd backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  cart orders tutorials store -v --tb=short
```

Expected: all new tests PASS; pre-existing failures (per [MEMORY.md](../../../.claude/projects/-Users-work-Documents-Code-Admin3/memory/MEMORY.md)) unchanged. Investigate any *new* failure introduced by this branch.

- [ ] **Step 2: Manual smoke test of the live 500**

Start the dev server (or use the running one):

```
cd backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development python manage.py runserver 8888
```

In the frontend, log in as a user who has a `Student` row. Add a
tutorial product, proceed to checkout. Expected: 200 response, order
created. Verify in shell:

```
DJANGO_SETTINGS_MODULE=django_Admin3.settings.development python manage.py shell -c "\
from orders.models import Order, OrderItem
from tutorials.models import TutorialChoice
o = Order.objects.last()
print('order', o.id, 'items', o.items.count())
print('tutorial_choices for this order:',
      TutorialChoice.objects.filter(order_item__order=o).count())"
```

Expected: an order with 2+ items, ≥1 TutorialChoice.

- [ ] **Step 3: Commit any final touch-ups; push the branch**

```
git push -u origin feat/20260505-tutorial-choice-cart-order
```
