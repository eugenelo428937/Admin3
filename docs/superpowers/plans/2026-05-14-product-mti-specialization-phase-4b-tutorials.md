# Product MTI Specialization — Phase 4b: Tutorials FK retarget

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retarget `TutorialEvents.store_product` FK from `store.Product` to `store.TutorialProduct` so the ORM returns a typed `TutorialProduct` instance (with subclass-specific fields like `format`, `tutorial_location`, `tutorial_course_template` accessible without a downcast).

**Architecture:** Phase 4b per the [MTI design spec](../specs/2026-05-13-product-mti-specialization-design.md) §6. The data is already shape-compatible — Phase 2's invariant means every `store_product_id` in `tutorial_events` references a row that has a `TutorialProduct` child (audit confirms zero exceptions on dev DB across 1,517 events and 551 distinct store products). The change is purely the model-level FK target; the SQL column (`product_id`) and its integer values are unchanged.

**Tech Stack:** Django 6.0 MTI, FK `AlterField` migration. No data migration needed.

---

## Spec reference

`docs/superpowers/specs/2026-05-13-product-mti-specialization-design.md` §6 Phase 4b:

> tutorials — `TutorialEvents.store_product` retargeted at `store.TutorialProduct`.

§7.4 testing strategy:

> Tutorial events: `event.store_product` resolves to `TutorialProduct`; `event.subject_code` via inheritance.

## Branch

Already on `feat/20260514-product-mti-phase-4b-tutorials`.

## Pre-flight audit (already done by controller)

Confirmed on dev DB (output captured before plan-write):

```
TutorialEvents: 1517
Distinct store_product values: 551
Pointing to non-TutorialProduct: 0
```

Phase 2's invariant holds. Safe to retarget.

## File Structure

**Modify:**
- `backend/django_Admin3/tutorials/models/tutorial_events.py` — change the FK target on line 52–57 from `StoreProduct` (which is `store.Product`) to `store.TutorialProduct`. Update the import.

**Create:**
- `backend/django_Admin3/tutorials/migrations/00NN_retarget_store_product_fk_to_tutorial_product.py` — single `AlterField`.
- `backend/django_Admin3/tutorials/tests/test_event_fk_retarget.py` — verifies `event.store_product` is now a `TutorialProduct` instance and subclass-specific fields are accessible.

## Non-goals

- No data migration (FK column values are PK-stable across the MTI parent/child).
- No consumer code changes (all `.store_product.subject_code`, `.product_code`, etc. continue to work — they're inherited from the Product parent).
- No `db_column` change (still `product_id` — preserves cart/order historical references).
- No `cart`, `orders`, `marking`, `administrate`, or `filtering` changes.

---

## Task 1: Retarget the FK + migration + test

**Files:**
- Modify: `backend/django_Admin3/tutorials/models/tutorial_events.py`
- Create test: `backend/django_Admin3/tutorials/tests/test_event_fk_retarget.py`
- Create migration: `backend/django_Admin3/tutorials/migrations/00NN_retarget_store_product_fk_to_tutorial_product.py` (Django generates the NN)

TDD: failing test → RED → implement → GREEN → commit.

- [ ] **Step 1.1: Write the failing test**

Create `backend/django_Admin3/tutorials/tests/test_event_fk_retarget.py`:

```python
"""Phase 4b: TutorialEvents.store_product is typed as TutorialProduct.

After retarget, `event.store_product` returns a store.TutorialProduct
instance directly — not a bare Product that needs a downcast. The
subclass-specific fields (format, tutorial_location,
tutorial_course_template) must be readable without a query for the
subclass row.
"""
from django.test import TestCase


class _Fixtures:
    def _ess(self):
        from catalog.exam_session.models import ExamSession
        from catalog.subject.models import Subject
        from catalog.models import ExamSessionSubject
        subject, _ = Subject.objects.get_or_create(
            code='CB1', defaults={'description': 'CB1'},
        )
        es, _ = ExamSession.objects.get_or_create(
            session_code='2026-04',
            defaults={'start_date': '2026-04-01', 'end_date': '2026-04-30'},
        )
        ess, _ = ExamSessionSubject.objects.get_or_create(
            subject=subject, exam_session=es,
        )
        return ess

    def _ppv(self):
        from catalog.products.models import (
            Product as CatalogProduct,
            ProductVariation,
            ProductProductVariation,
        )
        cp, _ = CatalogProduct.objects.get_or_create(
            code='P4B_T', fullname='Phase 4b Tutorial',
            defaults={'shortname': 'P4B'},
        )
        pv, _ = ProductVariation.objects.get_or_create(
            variation_type='Tutorial', name='Tutorial',
            defaults={'code': 'F2F_3F', 'is_active': True},
        )
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cp, product_variation=pv,
            defaults={'is_active': True},
        )
        return ppv

    def _tutorial_product(self):
        from store.models import TutorialProduct
        ess = self._ess()
        ppv = self._ppv()
        tp = TutorialProduct(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code='CB1/F2F_3F/2026-04',
            format='F2F_3F',
        )
        tp.save()
        return tp


class TutorialEventStoreProductTypeTests(_Fixtures, TestCase):
    def test_event_store_product_returns_tutorial_product_instance(self):
        """After Phase 4b, the FK descriptor returns a TutorialProduct,
        not a bare Product. The isinstance check is the contract."""
        from tutorials.models import TutorialEvents, TutorialLocation
        from store.models import TutorialProduct

        tp = self._tutorial_product()
        loc, _ = TutorialLocation.objects.get_or_create(
            code='LDN', defaults={'name': 'London', 'is_active': True},
        )
        event = TutorialEvents.objects.create(
            code='P4B_TEST_EVT',
            store_product=tp,
            start_date='2026-05-01',
            end_date='2026-05-03',
            location=loc,
        )
        # Re-fetch so we get whatever Django's FK descriptor resolves
        # the related row to (not the in-memory instance we passed).
        event = TutorialEvents.objects.get(pk=event.pk)
        self.assertIsInstance(event.store_product, TutorialProduct)

    def test_event_can_access_subclass_fields_without_downcast(self):
        from tutorials.models import TutorialEvents
        tp = self._tutorial_product()
        event = TutorialEvents.objects.create(
            code='P4B_TEST_EVT2',
            store_product=tp,
            start_date='2026-05-01',
            end_date='2026-05-03',
        )
        event = TutorialEvents.objects.get(pk=event.pk)
        # Subclass-local field — accessible because store_product is now
        # typed as TutorialProduct.
        self.assertEqual(event.store_product.format, 'F2F_3F')

    def test_event_subject_code_property_still_works(self):
        """Spec §7.4: 'event.subject_code via inheritance'."""
        from tutorials.models import TutorialEvents
        tp = self._tutorial_product()
        event = TutorialEvents.objects.create(
            code='P4B_TEST_EVT3',
            store_product=tp,
            start_date='2026-05-01',
            end_date='2026-05-03',
        )
        event = TutorialEvents.objects.get(pk=event.pk)
        self.assertEqual(event.subject_code, 'CB1')

    def test_reverse_accessor_returns_events_for_tutorial_product(self):
        """The related_name='tutorial_events' must still resolve from
        a TutorialProduct instance."""
        from tutorials.models import TutorialEvents
        tp = self._tutorial_product()
        event = TutorialEvents.objects.create(
            code='P4B_TEST_EVT4',
            store_product=tp,
            start_date='2026-05-01',
            end_date='2026-05-03',
        )
        related = list(tp.tutorial_events.all())
        self.assertEqual(len(related), 1)
        self.assertEqual(related[0].pk, event.pk)
```

- [ ] **Step 1.2: Run test (RED)**

```powershell
cd C:\Code\Admin3\backend\django_Admin3
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_event_fk_retarget -v 2
```

Expected: `test_event_store_product_returns_tutorial_product_instance` FAILS with `AssertionError: <store.models.product.Product object> is not an instance of <class 'store.models.tutorial_product.TutorialProduct'>`. The other tests may PASS coincidentally because they read inherited fields.

If `test_event_can_access_subclass_fields_without_downcast` passes, that's because Django's MTI auto-downcasts a Product fetched by PK if a TutorialProduct row exists with that PK — but the type returned is still `Product`. The `isinstance` test exposes it.

- [ ] **Step 1.3: Update the FK target in the model**

Edit `backend/django_Admin3/tutorials/models/tutorial_events.py`.

Change the import block at line 8:

```python
from store.models import Product as StoreProduct
```

to:

```python
from store.models import TutorialProduct
```

Change the FK definition at lines 52–57:

```python
    store_product = models.ForeignKey(
        StoreProduct,
        on_delete=models.CASCADE,
        related_name='tutorial_events',
        db_column='product_id'
    )
```

to:

```python
    store_product = models.ForeignKey(
        TutorialProduct,
        on_delete=models.CASCADE,
        related_name='tutorial_events',
        db_column='product_id',
        help_text=(
            'Phase 4b retarget: was store.Product, now store.TutorialProduct. '
            'The PK column (product_id) is unchanged — MTI shared PK means '
            'every TutorialProduct.pk equals its parent Product.pk, so all '
            'existing FK values still resolve.'
        ),
    )
```

- [ ] **Step 1.4: Generate migration**

```powershell
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py makemigrations tutorials --name retarget_store_product_fk_to_tutorial_product
```

Expected: a new migration file at `tutorials/migrations/00NN_retarget_store_product_fk_to_tutorial_product.py` with a single `AlterField` on `TutorialEvents.store_product`.

Inspect the generated file — it should contain ONLY the `AlterField`. If Django creates anything else (a new table, an index drop, a `RunPython`), STOP and report.

- [ ] **Step 1.5: Apply migration**

```powershell
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py migrate tutorials
```

Expected: `Applying tutorials.00NN_retarget_store_product_fk_to_tutorial_product... OK`.

- [ ] **Step 1.6: Confirm no migration drift**

```powershell
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py makemigrations --check --dry-run
```

Expected: `No changes detected`.

- [ ] **Step 1.7: Re-run test (GREEN)**

```powershell
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_event_fk_retarget -v 2
```

Expected: 4/4 PASS.

- [ ] **Step 1.8: Run the full tutorials test suite**

```powershell
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials -v 1 2>&1 | tail -10
```

Expected: all pass. If any test fails because it expected a `Product` instance and now gets a `TutorialProduct`, the test was wrong — the new behavior is correct. Fix the test (don't revert the model).

If a non-test consumer breaks (e.g., a serializer that does `isinstance(p, Product) and not isinstance(p, TutorialProduct)`), STOP and report.

- [ ] **Step 1.9: Commit**

```powershell
git add backend/django_Admin3/tutorials/models/tutorial_events.py `
        backend/django_Admin3/tutorials/migrations/*_retarget_store_product_fk_to_tutorial_product.py `
        backend/django_Admin3/tutorials/tests/test_event_fk_retarget.py
git commit -m "feat(tutorials): Phase 4b — retarget TutorialEvents.store_product FK to store.TutorialProduct

Phase 4b of the Product MTI specialization. The PK column (product_id)
and its integer values are unchanged — every TutorialEvents.store_product_id
already points at a row that has a TutorialProduct child (verified via
audit on dev DB: 1517 events, 551 distinct store products, 0 pointing
at non-TutorialProduct rows).

After this migration, event.store_product returns a TutorialProduct
instance directly. Consumers that read inherited Product fields
(product_code, exam_session_subject, etc.) continue to work via MTI.
Consumers that want subclass fields (format, tutorial_location,
tutorial_course_template) now read them without an extra query.

No data migration. No consumer code changes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Sanity sweep

- [ ] **Step 2.1: Run the broader sweep**

```powershell
cd C:\Code\Admin3\backend\django_Admin3
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials store cart orders -v 1 2>&1 | tail -15
```

Expected: all pass. (Tutorials is the directly-affected app; cart/orders are checked because they reference `tutorial_events.store_product` indirectly through cart-add and tutorial-choice flows.)

If the cart or orders suite raises a `TypeError` or `AttributeError`, the model change leaked an unexpected type difference. Investigate and report.

No commit; verification only.

---

## Task 3: Push, open PR, merge

- [ ] **Step 3.1: Push**

```powershell
git push -u origin feat/20260514-product-mti-phase-4b-tutorials
```

- [ ] **Step 3.2: Open PR**

```powershell
gh pr create --base main --head feat/20260514-product-mti-phase-4b-tutorials --title "feat(tutorials): Phase 4b — TutorialEvents.store_product → store.TutorialProduct" --body-file - <<'EOF'
## Summary

Phase 4b of the [Product MTI specialization](../docs/superpowers/specs/2026-05-13-product-mti-specialization-design.md). Retargets `TutorialEvents.store_product` FK from `store.Product` to `store.TutorialProduct`. The SQL column (`product_id`) and its integer values are unchanged — MTI shared-PK means every existing FK value still resolves.

## What changed

- `tutorials/models/tutorial_events.py`: FK target swapped (`StoreProduct` → `TutorialProduct`), import updated, help_text added.
- `tutorials/migrations/00NN_retarget_store_product_fk_to_tutorial_product.py`: single `AlterField`.
- `tutorials/tests/test_event_fk_retarget.py`: 4 tests confirming the new typed FK behavior + that inherited fields and reverse accessor still work.

## Pre-flight audit

```
TutorialEvents: 1517
Distinct store_product values: 551
Pointing to non-TutorialProduct: 0
```

Phase 2's invariant holds — safe to retarget.

## What's NOT in this PR

- No data migration (FK column values are PK-stable across the MTI parent/child).
- No consumer code changes (cart, orders, marking, administrate, filtering all untouched).
- No `db_column` change (still `product_id`).
- No Purchasable.Kind cleanup (Phase 4e).
- No PPV movement (Phase 5).

## Tests

- 4 new tests in `test_event_fk_retarget.py`, all passing.
- Full tutorials app sweep: passes.
- Broader sweep (tutorials + store + cart + orders): passes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

- [ ] **Step 3.3: Watch CI**

```powershell
gh pr checks --watch
```

If the same Vitest/Pact flake from earlier PRs appears, rerun the failed shard via `gh run rerun <run-id> --failed`.

- [ ] **Step 3.4: Merge**

```powershell
gh pr merge --squash --delete-branch
```

- [ ] **Step 3.5: Sync local main**

```powershell
git checkout main
git pull origin main
```

---

## Self-review checklist

- [ ] `TutorialEvents.store_product` model field uses `TutorialProduct` (not `Product`/`StoreProduct`).
- [ ] `db_column='product_id'` preserved.
- [ ] `related_name='tutorial_events'` preserved.
- [ ] `on_delete=models.CASCADE` preserved.
- [ ] Migration is a single `AlterField` — no data migration, no extra ops.
- [ ] `event.store_product` returns a `TutorialProduct` instance (test asserts `isinstance`).
- [ ] `event.store_product.format` accessible (test asserts the field reads).
- [ ] `event.subject_code` still works via inheritance.
- [ ] `tp.tutorial_events.all()` reverse accessor still works.
- [ ] `makemigrations --check --dry-run` → no changes detected.
