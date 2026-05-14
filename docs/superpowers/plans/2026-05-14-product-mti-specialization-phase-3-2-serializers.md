# Product MTI Specialization — Phase 3.2: Subclass-Aware Serializers

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `store/serializers/product.py` with three subclass-specific serializers (`MaterialProductSerializer`, `TutorialProductSerializer`, `MarkingProductSerializer`) and a `serializer_for(product)` factory that returns the right class for a given `store.Product` row. The existing `ProductSerializer` and `ProductListSerializer` stay untouched and continue to work via Django MTI parent-table semantics.

**Architecture:** Phase 3 dual-write part 2. The factory is purely additive — no consumer code switches over to it in this phase. Consumers (admin views, cart/checkout, search) keep calling the existing serializers. Subclass-aware callers can opt in to the factory and read subclass fields (e.g., `TutorialProduct.format`, `MarkingProduct.marking_template`).

**Tech Stack:** Django 6.0 + DRF 3.15 ModelSerializer, MTI reverse accessors (`product.materialproduct` etc. via the auto-generated OneToOneRel).

---

## Spec reference

`docs/superpowers/specs/2026-05-13-product-mti-specialization-design.md` §6:

> **Serializers**: add subclass-aware factory in `store/serializers/product.py`. Old serializers remain functional via reverse accessors (`product.materialproduct`, etc.).

## Branch

Already on `feat/20260514-product-mti-phase-3-2-serializers`.

## File Structure

**Modify:**
- `backend/django_Admin3/store/serializers/product.py` — append subclass serializers + factory (~+150 lines). Keep `ProductSerializer` and `ProductListSerializer` exactly as today.
- `backend/django_Admin3/store/serializers/__init__.py` — export new symbols.

**Create:**
- `backend/django_Admin3/store/tests/test_product_serializer_factory.py` — factory + per-subclass field tests.

## Non-goals

- No consumer view changes (`views/`, `viewsets/`, `urls.py` untouched).
- No serializer changes to `product_admin.py`, `unified.py`, `purchasable.py`, `bundle*.py`, `search.py`.
- No changes to `ProductSerializer.validate()` logic.
- No data migrations, no Django migrations.

---

## Pre-flight

- [ ] **Step 0.1: Confirm Phase 3.1 merged and clean state**

```powershell
cd C:\Code\Admin3
git log --oneline main -1
```

Expected: the most recent main commit references Phase 3.1 (e.g., `feat(store): Phase 3.1 — per-subclass admins…`).

```powershell
git status
```

Expected: branch `feat/20260514-product-mti-phase-3-2-serializers`, clean working tree.

---

## Task 1: Add subclass serializers + factory

**Files:**
- Modify: `backend/django_Admin3/store/serializers/product.py`
- Test: `backend/django_Admin3/store/tests/test_product_serializer_factory.py`

TDD: failing test → RED → implement → GREEN → commit.

- [ ] **Step 1.1: Write the failing test**

Create `backend/django_Admin3/store/tests/test_product_serializer_factory.py`:

```python
"""Phase 3.2: subclass-aware serializer factory for store.Product.

Verifies:
  1. `serializer_for(product)` returns the right serializer class for
     each MTI subclass instance.
  2. Subclass serializers expose subclass-specific fields
     (format, marking_template, etc.) in addition to the base fields.
  3. The existing `ProductSerializer` continues to serialize any
     subclass row without raising (backward compatibility).
"""
from django.test import TestCase


class _Fixtures:
    """Shared fixture builders. Mixin-style so each TestCase can pull
    just what it needs without inherited setUp side effects."""

    def _ess(self, subject_code='CB1', session_code='2026-04'):
        from catalog.exam_session.models import ExamSession
        from catalog.subject.models import Subject
        from catalog.models import ExamSessionSubject
        subject, _ = Subject.objects.get_or_create(
            code=subject_code, defaults={'description': subject_code},
        )
        es, _ = ExamSession.objects.get_or_create(
            session_code=session_code,
            defaults={'start_date': '2026-04-01', 'end_date': '2026-04-30'},
        )
        ess, _ = ExamSessionSubject.objects.get_or_create(
            subject=subject, exam_session=es,
        )
        return ess

    def _ppv(self, variation_type='Printed', code='P'):
        from catalog.products.models import (
            Product as CatalogProduct,
            ProductVariation,
            ProductProductVariation,
        )
        cp, _ = CatalogProduct.objects.get_or_create(
            code=f'P32T_{variation_type[:5]}',
            fullname=f'Phase 3.2 Test {variation_type}',
            defaults={'shortname': 'P32 Test'},
        )
        pv, _ = ProductVariation.objects.get_or_create(
            variation_type=variation_type, name=variation_type,
            defaults={'code': code, 'is_active': True},
        )
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cp, product_variation=pv,
            defaults={'is_active': True},
        )
        return ppv, cp

    def _material(self):
        from store.models import MaterialProduct
        ess = self._ess()
        ppv, _ = self._ppv('Printed', 'P')
        return MaterialProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code='CB1/PP32M/2026-04',
        )

    def _tutorial(self):
        from store.models import TutorialProduct
        ess = self._ess(subject_code='CM2', session_code='2026-04')
        ppv, _ = self._ppv('Tutorial', 'F2F_3F')
        tp = TutorialProduct(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code='CM2/P32T2/2026-04',
            format='F2F_3F',
        )
        # save_base bypasses the parent Product.save() tutorial-code path
        # which needs a TutorialEvent. The plan deliberately pre-sets
        # product_code, so .save() goes through the simple parent branch.
        tp.save()
        return tp

    def _marking(self):
        from marking.models import MarkingTemplate
        from store.models import MarkingProduct
        ess = self._ess(subject_code='CS1', session_code='2026-04')
        ppv, cp = self._ppv('Marking', 'M')
        mt, _ = MarkingTemplate.objects.get_or_create(
            pk=cp.pk,
            defaults={'code': cp.code, 'name': cp.fullname,
                      'description': '', 'is_active': True},
        )
        return MarkingProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code='CS1/MP32T/2026-04',
            marking_template=mt,
            paper_count=4,
        )


class SerializerForFactoryTests(_Fixtures, TestCase):
    def test_factory_returns_material_serializer_for_material_row(self):
        from store.serializers.product import (
            MaterialProductSerializer, serializer_for,
        )
        m = self._material()
        self.assertIs(serializer_for(m), MaterialProductSerializer)

    def test_factory_returns_tutorial_serializer_for_tutorial_row(self):
        from store.serializers.product import (
            TutorialProductSerializer, serializer_for,
        )
        t = self._tutorial()
        self.assertIs(serializer_for(t), TutorialProductSerializer)

    def test_factory_returns_marking_serializer_for_marking_row(self):
        from store.serializers.product import (
            MarkingProductSerializer, serializer_for,
        )
        k = self._marking()
        self.assertIs(serializer_for(k), MarkingProductSerializer)

    def test_factory_falls_back_to_base_for_bare_product(self):
        """If a Product row has no subclass row (shouldn't happen post-
        Phase-2 but is the safety contract), the factory returns the
        base ProductSerializer rather than raising."""
        from store.serializers.product import ProductSerializer, serializer_for
        from store.models import Product
        # Build a bare Product directly. Use save_base to skip the
        # subclass linking that .save() does for higher-level managers.
        ess = self._ess(subject_code='CT1')
        ppv, _ = self._ppv('Printed', 'P')
        p = Product(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code='CT1/BARE32/2026-04',
        )
        p.save()
        # Verify the row really has no subclass child (would fail the
        # Phase-2 invariant, but that's the contract this test exercises).
        from store.models import MaterialProduct, TutorialProduct, MarkingProduct
        self.assertFalse(MaterialProduct.objects.filter(pk=p.pk).exists())
        self.assertFalse(TutorialProduct.objects.filter(pk=p.pk).exists())
        self.assertFalse(MarkingProduct.objects.filter(pk=p.pk).exists())
        self.assertIs(serializer_for(p), ProductSerializer)


class SubclassSerializerFieldsTests(_Fixtures, TestCase):
    def test_material_serializer_exposes_base_fields(self):
        from store.serializers.product import MaterialProductSerializer
        m = self._material()
        data = MaterialProductSerializer(m).data
        self.assertEqual(data['product_code'], 'CB1/PP32M/2026-04')
        self.assertEqual(data['subject_code'], 'CB1')
        self.assertEqual(data['session_code'], '2026-04')
        self.assertEqual(data['variation_type'], 'Printed')
        self.assertEqual(data['kind'], 'material')

    def test_tutorial_serializer_exposes_format_field(self):
        from store.serializers.product import TutorialProductSerializer
        t = self._tutorial()
        data = TutorialProductSerializer(t).data
        self.assertEqual(data['format'], 'F2F_3F')
        self.assertEqual(data['kind'], 'tutorial')
        # tutorial_location may be null for OC-style rows; here it's null
        # because the fixture didn't seed one.
        self.assertIsNone(data['tutorial_location'])
        self.assertIsNone(data['tutorial_course_template'])

    def test_marking_serializer_exposes_template_and_paper_count(self):
        from store.serializers.product import MarkingProductSerializer
        k = self._marking()
        data = MarkingProductSerializer(k).data
        self.assertEqual(data['paper_count'], 4)
        self.assertEqual(data['kind'], 'marking')
        # Template should serialize as its PK; downstream consumers can
        # join if they need the full row.
        self.assertEqual(data['marking_template'], k.marking_template_id)
        # And the template code is surfaced for display.
        self.assertEqual(data['marking_template_code'], k.marking_template.code)


class BackwardCompatibilityTests(_Fixtures, TestCase):
    """The existing ProductSerializer must continue to work on any
    subclass row without raising — that's the dual-write guarantee."""

    def test_product_serializer_on_material_row_still_works(self):
        from store.serializers.product import ProductSerializer
        m = self._material()
        data = ProductSerializer(m).data
        self.assertEqual(data['product_code'], 'CB1/PP32M/2026-04')

    def test_product_serializer_on_tutorial_row_still_works(self):
        from store.serializers.product import ProductSerializer
        t = self._tutorial()
        data = ProductSerializer(t).data
        self.assertEqual(data['product_code'], 'CM2/P32T2/2026-04')

    def test_product_serializer_on_marking_row_still_works(self):
        from store.serializers.product import ProductSerializer
        k = self._marking()
        data = ProductSerializer(k).data
        self.assertEqual(data['product_code'], 'CS1/MP32T/2026-04')
```

- [ ] **Step 1.2: Run test (RED)**

```powershell
cd C:\Code\Admin3\backend\django_Admin3
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py test store.tests.test_product_serializer_factory -v 2
```

Expected: `ImportError: cannot import name 'serializer_for'`. All tests in the factory test classes fail; the backward-compatibility tests also fail because they import the new module via the same path.

(The venv is at `C:\Code\Admin3\.venv`, not under `backend/`. The Phase 3.1 plan's path was wrong.)

- [ ] **Step 1.3: Append subclass serializers + factory to `store/serializers/product.py`**

Open `backend/django_Admin3/store/serializers/product.py` and append (after the existing `ProductListSerializer` class — do NOT touch the existing `ProductSerializer` or `ProductListSerializer`):

```python


# ──────────────────────────────────────────────────────────────────────
# Phase 3.2: subclass-aware serializers
#
# Each subclass serializer extends the base ProductSerializer to inherit
# all common fields (subject_code, session_code, variation_type,
# product_name, plus the FK ids), and adds the subclass-specific fields
# that live on the corresponding MTI child table.
#
# The factory `serializer_for(product)` picks the right serializer class
# for an instance, falling back to ProductSerializer for any Product row
# that has no subclass child (a Phase-2 invariant violation, but the
# contract is "don't raise on weird data").
# ──────────────────────────────────────────────────────────────────────
from store.models import (
    MaterialProduct,
    TutorialProduct,
    MarkingProduct,
)


class _ProductKindMixin(serializers.Serializer):
    """Adds a read-only `kind` field that returns the subclass label
    rather than the raw Purchasable.kind value (which is still 'product'
    pre-Phase-4e). Subclasses override `_subclass_kind`.
    """

    _subclass_kind: str = ''  # set by each subclass below
    kind = serializers.SerializerMethodField()

    def get_kind(self, obj):
        return self._subclass_kind


class MaterialProductSerializer(_ProductKindMixin, ProductSerializer):
    """Serializer for store.MaterialProduct.

    Inherits every field from ProductSerializer. `product_product_variation`
    still lives on the Product parent through Phases 1–4, so no new
    local fields are needed; the value of `kind` ('material') is the
    only differentiator until Phase 5 moves PPV to MaterialProduct.
    """
    _subclass_kind = 'material'

    class Meta(ProductSerializer.Meta):
        model = MaterialProduct
        fields = ProductSerializer.Meta.fields + ['kind']


class TutorialProductSerializer(_ProductKindMixin, ProductSerializer):
    """Serializer for store.TutorialProduct.

    Adds the subclass-local fields: `format`, `tutorial_location`,
    `tutorial_course_template`. Nullable FK fields serialize as their
    PK or null.
    """
    _subclass_kind = 'tutorial'

    class Meta(ProductSerializer.Meta):
        model = TutorialProduct
        fields = ProductSerializer.Meta.fields + [
            'kind',
            'format',
            'tutorial_location',
            'tutorial_course_template',
        ]


class MarkingProductSerializer(_ProductKindMixin, ProductSerializer):
    """Serializer for store.MarkingProduct.

    Adds `marking_template` (PK), `marking_template_code` (display),
    and `paper_count` (optional count of papers in the series).
    """
    _subclass_kind = 'marking'

    marking_template_code = serializers.CharField(
        source='marking_template.code',
        read_only=True,
    )

    class Meta(ProductSerializer.Meta):
        model = MarkingProduct
        fields = ProductSerializer.Meta.fields + [
            'kind',
            'marking_template',
            'marking_template_code',
            'paper_count',
        ]


# Reverse-accessor name → (subclass serializer, DoesNotExist).
# The accessor names are what Django MTI auto-generates: lowercase
# model class name with no separator. The DoesNotExist class is needed
# because accessing a missing OneToOne reverse relation raises the
# *child model's* DoesNotExist, not a generic ObjectDoesNotExist.
_SUBCLASS_DISPATCH = (
    ('materialproduct', MaterialProductSerializer, MaterialProduct.DoesNotExist),
    ('tutorialproduct', TutorialProductSerializer, TutorialProduct.DoesNotExist),
    ('markingproduct',  MarkingProductSerializer,  MarkingProduct.DoesNotExist),
)


def serializer_for(product):
    """Return the serializer class for a store.Product instance.

    Dispatches by MTI subclass:
      - store.MaterialProduct → MaterialProductSerializer
      - store.TutorialProduct → TutorialProductSerializer
      - store.MarkingProduct  → MarkingProductSerializer
      - bare store.Product    → ProductSerializer (fallback)

    After Phase 2's backfill every Product row has exactly one subclass
    child, so the fallback should be unreachable in normal data — it
    exists only as the no-raise contract.
    """
    # Short-circuit if the caller already passed a downcast subclass
    # instance (saves one attribute access per call).
    for _attr, cls, _exc in _SUBCLASS_DISPATCH:
        if isinstance(product, cls.Meta.model):
            return cls

    # Otherwise the caller passed a base Product — probe each subclass.
    for attr, cls, exc in _SUBCLASS_DISPATCH:
        try:
            getattr(product, attr)
        except exc:
            continue
        return cls
    return ProductSerializer
```

- [ ] **Step 1.4: Export the new symbols from the package**

Open `backend/django_Admin3/store/serializers/__init__.py` and change the existing import line:

```python
from store.serializers.product import ProductSerializer, ProductListSerializer
```

to:

```python
from store.serializers.product import (
    ProductSerializer,
    ProductListSerializer,
    MaterialProductSerializer,
    TutorialProductSerializer,
    MarkingProductSerializer,
    serializer_for,
)
```

Then extend `__all__` by adding the four new names after `'ProductListSerializer'`:

```python
__all__ = [
    'ProductSerializer',
    'ProductListSerializer',
    'MaterialProductSerializer',
    'TutorialProductSerializer',
    'MarkingProductSerializer',
    'serializer_for',
    'PriceSerializer',
    # ... rest unchanged ...
]
```

- [ ] **Step 1.5: Re-run test (GREEN)**

```powershell
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py test store.tests.test_product_serializer_factory -v 2
```

Expected: 11/11 pass (4 factory + 4 subclass-field + 3 backward-compat).

- [ ] **Step 1.6: Verify no migration drift**

```powershell
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py makemigrations --check --dry-run
```

Expected: `No changes detected`.

- [ ] **Step 1.7: Verify existing serializer tests still pass**

```powershell
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py test store.serializers store.tests -v 1 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 1.8: Commit**

```powershell
git add backend/django_Admin3/store/serializers/product.py backend/django_Admin3/store/serializers/__init__.py backend/django_Admin3/store/tests/test_product_serializer_factory.py
git commit -m "feat(store): Phase 3.2 — subclass-aware serializer factory

Adds MaterialProductSerializer / TutorialProductSerializer /
MarkingProductSerializer (each extending ProductSerializer with
subclass-specific fields) and serializer_for(product), a factory
that dispatches by MTI subclass.

Falls back to ProductSerializer for bare Product rows (a Phase-2
invariant violation, but the contract is no-raise).

No consumer code changes — old serializers stay functional through
Django MTI parent-table semantics. Phase 4 PRs will switch consumers
over one app at a time.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Sanity sweep (subset of backend tests)

We changed serializer code only — no models, no migrations, no views. Most of the backend doesn't depend on these new symbols. We just need to confirm we didn't break the existing `ProductSerializer` consumers.

- [ ] **Step 2.1: Run a focused backend sweep**

```powershell
cd C:\Code\Admin3\backend\django_Admin3
& C:/Code/Admin3/.venv/Scripts/python.exe manage.py test store cart orders catalog -v 1 2>&1 | tail -15
```

Expected: all pass. (Skipping the unrelated apps shortens iteration; the full suite runs on CI.)

- [ ] **Step 2.2: No commit; Task 2 only verifies.**

---

## Task 3: Push, open PR, merge

- [ ] **Step 3.1: Push**

```powershell
git push -u origin feat/20260514-product-mti-phase-3-2-serializers
```

- [ ] **Step 3.2: Open PR**

```powershell
gh pr create --base main --head feat/20260514-product-mti-phase-3-2-serializers --title "feat(store): Phase 3.2 — subclass-aware serializer factory" --body-file - <<EOF
## Summary

Phase 3.2 of the [Product MTI specialization](../docs/superpowers/specs/2026-05-13-product-mti-specialization-design.md). Adds subclass-specific serializers and a \`serializer_for(product)\` factory so future consumers can opt in to subclass-aware output without changing the existing \`ProductSerializer\` surface.

Companion to PR #110 (Phase 3.1 — admin + commands). With this PR, Phase 3 is complete and Phase 4a (filtering/search consumer repoint) can begin.

## What changed

- \`store/serializers/product.py\`: three new serializers (\`MaterialProductSerializer\`, \`TutorialProductSerializer\`, \`MarkingProductSerializer\`), all extending the existing \`ProductSerializer\`. A \`_ProductKindMixin\` adds a read-only \`kind\` field returning the subclass label ('material' / 'tutorial' / 'marking') — rather than the raw \`Purchasable.kind\` which is still \`'product'\` until Phase 4e.
- \`serializer_for(product)\`: factory that dispatches on the MTI subclass via the auto-generated reverse OneToOne accessor (\`materialproduct\` / \`tutorialproduct\` / \`markingproduct\`). Falls back to \`ProductSerializer\` for bare Product rows (Phase-2 invariant violation, but no-raise contract).
- \`store/serializers/__init__.py\`: exports the four new symbols.

## Why a factory rather than swapping ProductSerializer's class

The spec is explicit: "Old serializers remain functional via reverse accessors". Every existing consumer keeps working because \`ProductSerializer\` is unchanged. Subclass-aware consumers (e.g., a future tutorial-specific list view) can call \`serializer_for(p)(p).data\` to get the right fields. Phase 4 will switch consumers over one at a time.

## What's NOT in this PR

- No consumer code changes (views, viewsets, urls untouched).
- No changes to \`product_admin.py\`, \`unified.py\`, \`purchasable.py\`, \`bundle*.py\`, \`search.py\`.
- No \`ProductSerializer.validate()\` changes.
- No data migrations or Django migrations.

## Tests

11 new tests in \`store/tests/test_product_serializer_factory.py\`, all passing:
- 4 factory dispatch tests (material / tutorial / marking / bare-Product fallback)
- 4 subclass-field tests (verify base fields + subclass-specific fields)
- 3 backward-compatibility tests (existing ProductSerializer on each subclass row)

Subset sweep (\`store cart orders catalog\`): all pass. Full suite runs on CI.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

- [ ] **Step 3.3: Watch CI**

```powershell
gh pr checks --watch
```

If the same pact / vitest flake from PR #110 appears, rerun the failed shard with `gh run rerun <run-id> --failed`.

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

After all tasks:

- [ ] `ProductSerializer` and `ProductListSerializer` are byte-for-byte unchanged in `product.py`.
- [ ] All three new serializers extend `ProductSerializer` (not `serializers.ModelSerializer` directly) so they pick up `validate()` and the source-mapped read-only fields for free.
- [ ] `serializer_for(product)` is the only new public surface besides the three serializer classes.
- [ ] The `kind` field on each subclass serializer returns the new subclass label, not the raw `Purchasable.kind` (which is still `'product'`).
- [ ] `makemigrations --check --dry-run` → no changes detected.
- [ ] The four new symbols are exported from `store.serializers`.
