# Product MTI Specialization — Phase 3.1: Admin & Commands

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single `store.Product` admin with three per-subclass admins (`MaterialProduct`, `TutorialProduct`, `MarkingProduct`), and update the two row-creating management commands (`create_addon_products`, `import_current_products`) so new rows are instantiated as the correct subclass.

**Architecture:** Phase 3 is "dual-write": after Phase 2's split, every existing `store.Product` row already has exactly one subclass child (`acted.material_products`, `acted.tutorial_products`, or `acted.marking_products`). This phase wires the *creation paths* (admin UI, addon cloner, CSV importer) so they continue to maintain that invariant for new rows. No consumer code changes here. The base `ProductAdmin` is kept but demoted to a read-only "All Products" cross-cut view — subclass admins are now the canonical place to edit.

**Tech Stack:** Django 6.0, Django Admin, Django ORM MTI (`Child.objects.create(...)` auto-populates parent tables via `product_ptr_id`/`purchasable_ptr_id`), psycopg2-binary against PostgreSQL `acted` schema.

---

## Spec reference

Phase 3 in `docs/superpowers/specs/2026-05-13-product-mti-specialization-design.md` §6:

> - **Admin**: replace single `Product` admin with three per-subclass admins. Existing `create_addon_products` and `import_current_products` commands updated to instantiate `MaterialProduct`.

Phase 3 §9 Out of scope:

> - Solution/addon products stay as `MaterialProduct` rows with `Purchasable.is_addon=True` — no fourth subclass.

This plan covers the Admin PR. A separate plan (Phase 3.2) covers the Serializers PR. Both will land independently and Phase 4 begins only after both ship.

## Branch

```bash
git checkout main
git pull origin main
git checkout -b feat/20260514-product-mti-phase-3-1-admin
```

## File Structure

**Modify:**
- `backend/django_Admin3/store/admin.py` — add three per-subclass `ModelAdmin` classes, keep base `Product` admin as a read-only cross-cut. ~+150 lines.
- `backend/django_Admin3/store/management/commands/create_addon_products.py` — swap `Product.objects.create(...)` → `MaterialProduct.objects.create(...)` (two call sites: the main addon loop and `_create_pms_umbrellas`).
- `backend/django_Admin3/catalog/management/commands/import_current_products.py` — branch the `StoreProduct(...)` instantiation by `line['fmt']`: `P`/`C` → `MaterialProduct`, `M` → `MarkingProduct` (with `MarkingTemplate.objects.get_or_create(pk=catalog_product.pk, defaults=...)`).

**Create:**
- `backend/django_Admin3/store/tests/test_admin_subclass.py` — admin registration smoke + list-view 200s for each subclass.
- `backend/django_Admin3/store/tests/test_create_addon_products_subclass.py` — addon rows have a `MaterialProduct` child (no `TutorialProduct` / `MarkingProduct` child).
- `backend/django_Admin3/catalog/tests/test_import_subclass_dispatch.py` — P/C-format imports create `MaterialProduct`; M-format imports create `MarkingProduct` + auto-create `MarkingTemplate` when needed.

## Non-goals for this plan

- No serializer changes (covered by Phase 3.2).
- No filtering/search consumer changes (covered by Phase 4a).
- No data migration for legacy admin URLs.
- No removal of base `ProductAdmin` — kept as read-only cross-cut.
- No changes to `Purchasable.Kind` enum (Phase 4e).

---

## Pre-flight verification

Before starting Task 1, confirm Phase 2's data is intact on the dev DB. If these don't all hold, Phase 2 wasn't merged or the dev DB drifted — STOP and resync.

- [ ] **Step 0.1: Confirm subclass tables are populated**

Run:
```powershell
cd C:\Code\Admin3\backend\django_Admin3
.\.venv\Scripts\activate
python manage.py shell -c "
from store.models import Product, MaterialProduct, TutorialProduct, MarkingProduct
total = Product.objects.count()
m = MaterialProduct.objects.count()
t = TutorialProduct.objects.count()
k = MarkingProduct.objects.count()
print(f'Product={total} MaterialProduct={m} TutorialProduct={t} MarkingProduct={k} sum_subclasses={m+t+k}')
"
```

Expected: `sum_subclasses == total` (Phase 2 invariant). Approximate dev DB counts: ~8173 / ~6847 / ~649 / ~677.

- [ ] **Step 0.2: Confirm no orphan Purchasables remain**

```powershell
python manage.py shell -c "
from store.models import Purchasable, Product
total_p = Purchasable.objects.filter(kind='product').count()
products = Product.objects.count()
print(f'kind=product purchasables={total_p}  store.products={products}  orphans={total_p - products}')
"
```

Expected: `orphans == 0` (Phase 2 cleanup deleted the 75 orphans).

---

## Task 1: Add `MaterialProductAdmin`

**Files:**
- Modify: `backend/django_Admin3/store/admin.py:56-79` (existing `ProductAdmin` block)
- Test: `backend/django_Admin3/store/tests/test_admin_subclass.py` (new file)

- [ ] **Step 1.1: Write the failing test**

Create file `backend/django_Admin3/store/tests/test_admin_subclass.py`:

```python
"""Phase 3.1 admin: per-subclass admins are registered and reachable.

These are smoke tests, not behavior tests — Django's admin framework is
trusted. We assert:
  1. Each MTI subclass has a ModelAdmin registered.
  2. The changelist URL resolves and returns 200 for a superuser.
"""
from django.contrib import admin as django_admin
from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from django.urls import reverse


class SubclassAdminRegistrationTests(TestCase):
    def setUp(self):
        from store.models import MaterialProduct, TutorialProduct, MarkingProduct
        self.MaterialProduct = MaterialProduct
        self.TutorialProduct = TutorialProduct
        self.MarkingProduct = MarkingProduct

    def test_material_product_admin_is_registered(self):
        self.assertIn(self.MaterialProduct, django_admin.site._registry)

    def test_tutorial_product_admin_is_registered(self):
        self.assertIn(self.TutorialProduct, django_admin.site._registry)

    def test_marking_product_admin_is_registered(self):
        self.assertIn(self.MarkingProduct, django_admin.site._registry)


class SubclassAdminChangelistTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.staff = User.objects.create_superuser(
            username='phase3admin', email='p3@example.com', password='x',
        )

    def setUp(self):
        self.client = Client()
        self.client.force_login(self.staff)

    def test_material_product_changelist_200(self):
        url = reverse('admin:store_materialproduct_changelist')
        self.assertEqual(self.client.get(url).status_code, 200)

    def test_tutorial_product_changelist_200(self):
        url = reverse('admin:store_tutorialproduct_changelist')
        self.assertEqual(self.client.get(url).status_code, 200)

    def test_marking_product_changelist_200(self):
        url = reverse('admin:store_markingproduct_changelist')
        self.assertEqual(self.client.get(url).status_code, 200)
```

- [ ] **Step 1.2: Run test to verify it fails**

Run:
```powershell
cd C:\Code\Admin3\backend\django_Admin3
.\.venv\Scripts\activate
python manage.py test store.tests.test_admin_subclass -v 2
```

Expected: 3 failures in `SubclassAdminRegistrationTests` with `AssertionError: <class 'store.models.material_product.MaterialProduct'> not found in <...>._registry`. The changelist tests will fail with `NoReverseMatch` for the same reason.

- [ ] **Step 1.3: Implement `MaterialProductAdmin`**

Edit `backend/django_Admin3/store/admin.py`. **Replace the entire file with**:

```python
"""Admin configuration for the store app.

Phase 3.1: the single `ProductAdmin` is now a read-only cross-cut "All
Products" view. The three subclass admins (MaterialProduct,
TutorialProduct, MarkingProduct) are the canonical edit surfaces.
"""
from django.contrib import admin
from store.models import (
    Product,
    MaterialProduct,
    TutorialProduct,
    MarkingProduct,
    Price,
    Bundle,
    BundleProduct,
    Purchasable,
    GenericItem,
)


@admin.register(Purchasable)
class PurchasableAdmin(admin.ModelAdmin):
    """Admin for the unified store.Purchasable catalog parent.

    Product rows also appear here (MTI subclass); edit subclass-specific
    fields via MaterialProductAdmin / TutorialProductAdmin /
    MarkingProductAdmin. GenericItem rows have their own admin.
    """
    list_display = ['code', 'kind', 'name', 'is_active', 'dynamic_pricing', 'updated_at']
    list_filter = ['kind', 'is_active', 'dynamic_pricing']
    search_fields = ['code', 'name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-updated_at']
    list_per_page = 50


@admin.register(GenericItem)
class GenericItemAdmin(admin.ModelAdmin):
    """Admin for non-ESS catalog items (marking vouchers, binders, additional charges)."""
    list_display = [
        'code', 'kind', 'name', 'validity_period_days',
        'stock_tracked', 'dynamic_pricing', 'is_active',
    ]
    list_filter = ['kind', 'is_active', 'stock_tracked', 'dynamic_pricing']
    search_fields = ['code', 'name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['kind', 'code']


class PriceInline(admin.TabularInline):
    """Inline admin for prices within a product.

    Price.purchasable is the FK; Product is an MTI subclass of Purchasable
    so this inline resolves correctly when added to any subclass admin.
    """
    model = Price
    fk_name = 'purchasable'
    extra = 0
    fields = ['price_type', 'amount', 'currency']


class BundleProductInline(admin.TabularInline):
    model = BundleProduct
    extra = 0
    fields = ['product', 'quantity', 'default_price_type', 'sort_order', 'is_active']
    raw_id_fields = ['product']


# ──────────────────────────────────────────────────────────────────────
# Product cross-cut admin — read-only "All Products" list
# ──────────────────────────────────────────────────────────────────────
@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Read-only cross-cut view of every store.Product (any subclass).

    Editing happens via the subclass admins. This view exists so staff
    can scan all products in one place without knowing the subclass.
    """
    list_display = [
        'product_code',
        'get_kind',
        'get_subject_code',
        'get_session_code',
        'is_active',
        'created_at',
    ]
    list_filter = [
        'is_active',
        'exam_session_subject__subject',
        'exam_session_subject__exam_session',
    ]
    search_fields = ['product_code']
    readonly_fields = ['product_code', 'created_at', 'updated_at']
    ordering = ['product_code']

    def has_add_permission(self, request):
        # Adding is done via subclass admins; this view is read-only.
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description='Kind', ordering='purchasable_ptr__kind')
    def get_kind(self, obj):
        # purchasable_ptr is the parent MTI link; kind tells us which subclass.
        return obj.purchasable_ptr.kind if obj.purchasable_ptr_id else '—'

    @admin.display(description='Subject')
    def get_subject_code(self, obj):
        return obj.exam_session_subject.subject.code

    @admin.display(description='Session')
    def get_session_code(self, obj):
        return obj.exam_session_subject.exam_session.session_code


# ──────────────────────────────────────────────────────────────────────
# Per-subclass admins — the canonical edit surfaces
# ──────────────────────────────────────────────────────────────────────
@admin.register(MaterialProduct)
class MaterialProductAdmin(admin.ModelAdmin):
    """Admin for store.MaterialProduct (eBook / Printed / Hub material rows).

    `product_product_variation` still lives on the Product parent through
    Phases 1–4; Phase 5 moves it to MaterialProduct.
    """
    list_display = [
        'product_code',
        'get_subject_code',
        'get_session_code',
        'get_variation_type',
        'is_active',
        'created_at',
    ]
    list_filter = [
        'is_active',
        'exam_session_subject__subject',
        'exam_session_subject__exam_session',
        'product_product_variation__product_variation__variation_type',
    ]
    search_fields = ['product_code']
    raw_id_fields = ['exam_session_subject', 'product_product_variation']
    readonly_fields = ['product_code', 'created_at', 'updated_at']
    inlines = [PriceInline]
    ordering = ['product_code']

    @admin.display(description='Subject')
    def get_subject_code(self, obj):
        return obj.exam_session_subject.subject.code

    @admin.display(description='Session')
    def get_session_code(self, obj):
        return obj.exam_session_subject.exam_session.session_code

    @admin.display(description='Variation')
    def get_variation_type(self, obj):
        ppv = obj.product_product_variation
        return ppv.product_variation.variation_type if ppv else '—'


@admin.register(TutorialProduct)
class TutorialProductAdmin(admin.ModelAdmin):
    """Admin for store.TutorialProduct (Face-to-Face / Live Online / OC)."""
    list_display = [
        'product_code',
        'get_subject_code',
        'get_session_code',
        'format',
        'get_location',
        'is_active',
    ]
    list_filter = [
        'is_active',
        'format',
        'exam_session_subject__subject',
        'exam_session_subject__exam_session',
        'tutorial_location',
    ]
    search_fields = ['product_code']
    raw_id_fields = [
        'exam_session_subject',
        'tutorial_course_template',
        'tutorial_location',
    ]
    readonly_fields = ['product_code', 'created_at', 'updated_at']
    inlines = [PriceInline]
    ordering = ['product_code']

    @admin.display(description='Subject')
    def get_subject_code(self, obj):
        return obj.exam_session_subject.subject.code

    @admin.display(description='Session')
    def get_session_code(self, obj):
        return obj.exam_session_subject.exam_session.session_code

    @admin.display(description='Location')
    def get_location(self, obj):
        loc = obj.tutorial_location
        return loc.code if loc else '—'


@admin.register(MarkingProduct)
class MarkingProductAdmin(admin.ModelAdmin):
    """Admin for store.MarkingProduct (Series X, Mock Marking N, etc.)."""
    list_display = [
        'product_code',
        'get_subject_code',
        'get_session_code',
        'get_template_code',
        'paper_count',
        'is_active',
    ]
    list_filter = [
        'is_active',
        'exam_session_subject__subject',
        'exam_session_subject__exam_session',
        'marking_template',
    ]
    search_fields = ['product_code', 'marking_template__code', 'marking_template__name']
    raw_id_fields = ['exam_session_subject', 'marking_template']
    readonly_fields = ['product_code', 'created_at', 'updated_at']
    inlines = [PriceInline]
    ordering = ['product_code']

    @admin.display(description='Subject')
    def get_subject_code(self, obj):
        return obj.exam_session_subject.subject.code

    @admin.display(description='Session')
    def get_session_code(self, obj):
        return obj.exam_session_subject.exam_session.session_code

    @admin.display(description='Template', ordering='marking_template__code')
    def get_template_code(self, obj):
        mt = obj.marking_template
        return mt.code if mt else '—'


# ──────────────────────────────────────────────────────────────────────
# Price / Bundle admins (unchanged from pre-Phase-3)
# ──────────────────────────────────────────────────────────────────────
@admin.register(Price)
class PriceAdmin(admin.ModelAdmin):
    list_display = ['get_purchasable_code', 'price_type', 'amount', 'currency']
    list_filter = ['price_type', 'currency']
    search_fields = ['purchasable__code']
    raw_id_fields = ['purchasable']

    @admin.display(description='Purchasable')
    def get_purchasable_code(self, obj):
        return obj.purchasable.code if obj.purchasable_id else '—'


@admin.register(Bundle)
class BundleAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'get_subject_code',
        'get_session_code',
        'is_active',
        'display_order',
        'get_product_count',
    ]
    list_filter = ['is_active', 'exam_session_subject__subject', 'exam_session_subject__exam_session']
    search_fields = ['override_name', 'bundle_template__bundle_name']
    raw_id_fields = ['bundle_template', 'exam_session_subject']
    inlines = [BundleProductInline]
    ordering = ['display_order', 'created_at']

    @admin.display(description='Subject')
    def get_subject_code(self, obj):
        return obj.exam_session_subject.subject.code

    @admin.display(description='Session')
    def get_session_code(self, obj):
        return obj.exam_session_subject.exam_session.session_code

    @admin.display(description='Products')
    def get_product_count(self, obj):
        return obj.bundle_products.filter(is_active=True).count()


@admin.register(BundleProduct)
class BundleProductAdmin(admin.ModelAdmin):
    list_display = ['get_bundle_name', 'get_product_code', 'quantity', 'default_price_type', 'is_active']
    list_filter = ['is_active', 'default_price_type']
    search_fields = ['bundle__override_name', 'product__product_code']
    raw_id_fields = ['bundle', 'product']

    @admin.display(description='Bundle')
    def get_bundle_name(self, obj):
        return obj.bundle.name

    @admin.display(description='Product')
    def get_product_code(self, obj):
        return obj.product.product_code
```

- [ ] **Step 1.4: Re-run test to verify it passes**

```powershell
python manage.py test store.tests.test_admin_subclass -v 2
```

Expected: All 6 tests pass.

- [ ] **Step 1.5: Verify migrations are still clean (admin changes never need migrations)**

```powershell
python manage.py makemigrations --check --dry-run
```

Expected: `No changes detected`.

- [ ] **Step 1.6: Commit**

```powershell
git add backend/django_Admin3/store/admin.py backend/django_Admin3/store/tests/test_admin_subclass.py
git commit -m "feat(store): Phase 3.1 — three per-subclass admins (Material/Tutorial/Marking)"
```

---

## Task 2: Update `create_addon_products` to instantiate `MaterialProduct`

All addons are solutions/umbrellas sold as material — per spec §9, no fourth subclass exists for them.

**Files:**
- Modify: `backend/django_Admin3/store/management/commands/create_addon_products.py:151-163` (main loop) and `:260-273` (PMS umbrella loop)
- Test: `backend/django_Admin3/store/tests/test_create_addon_products_subclass.py` (new file)

- [ ] **Step 2.1: Write the failing test**

Create `backend/django_Admin3/store/tests/test_create_addon_products_subclass.py`:

```python
"""Phase 3.1: `create_addon_products` instantiates MaterialProduct.

Per spec §9 (Out of scope), addon/solution products stay as MaterialProduct
rows with Purchasable.is_addon=True — no fourth subclass.
"""
from io import StringIO

from django.core.management import call_command
from django.test import TestCase


class CreateAddonProductsSubclassTests(TestCase):
    def _fixture_base_product(self):
        """Build the minimum fixture for one cloneable base addon row.

        Code 'CB1/PX/2025-04' matches the SEGMENT_MAP key 'PX' so the
        command will plan a single 'PX -> PXS' clone.
        """
        from catalog.exam_session.models import ExamSession
        from catalog.subjects.models import Subject
        from catalog.models.exam_session_subject import ExamSessionSubject
        from catalog.products.models import (
            Product as CatalogProduct,
            ProductVariation,
            ProductProductVariation,
        )
        from store.models import MaterialProduct

        subject, _ = Subject.objects.get_or_create(
            code='CB1', defaults={'description': 'Test'},
        )
        es, _ = ExamSession.objects.get_or_create(
            session_code='2025-04',
            defaults={'start_date': '2025-04-01', 'end_date': '2025-04-30'},
        )
        ess, _ = ExamSessionSubject.objects.get_or_create(
            subject=subject, exam_session=es,
        )
        cp, _ = CatalogProduct.objects.get_or_create(
            code='CB1_TEST',
            fullname='CB1 Test Material',
            defaults={'shortname': 'CB1 Test'},
        )
        pv, _ = ProductVariation.objects.get_or_create(
            variation_type='Printed', name='Printed',
            defaults={'code': 'P', 'is_active': True},
        )
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cp, product_variation=pv,
            defaults={'is_active': True},
        )
        base = MaterialProduct.objects.create(
            exam_session_subject=ess,
            product_product_variation=ppv,
            product_code='CB1/PX/2025-04',
        )
        return base

    def test_addon_clone_creates_material_product(self):
        from store.models import MaterialProduct, Product

        base = self._fixture_base_product()
        out = StringIO()
        call_command('create_addon_products', '--commit', '--no-prices', stdout=out)

        # The cloner should have produced 'CB1/PXS/2025-04'
        addon = Product.objects.get(product_code='CB1/PXS/2025-04')
        # Critically: the row exists as a MaterialProduct subclass row.
        self.assertTrue(
            MaterialProduct.objects.filter(pk=addon.pk).exists(),
            'Addon row should be created as MaterialProduct, not bare Product',
        )
        # And it carries the addon flag from Purchasable.
        self.assertTrue(addon.purchasable_ptr.is_addon)
```

- [ ] **Step 2.2: Run test to verify it fails**

```powershell
python manage.py test store.tests.test_create_addon_products_subclass -v 2
```

Expected: `AssertionError: Addon row should be created as MaterialProduct, not bare Product` — the current code calls `Product.objects.create(...)` so no MaterialProduct child row is written.

- [ ] **Step 2.3: Update `create_addon_products.py` — replace `Product` import + call sites**

Edit `backend/django_Admin3/store/management/commands/create_addon_products.py`.

Change the import block at line 30:
```python
from store.models import Price, Product, Purchasable
```
to:
```python
from store.models import MaterialProduct, Price, Product, Purchasable
```

Replace the main-loop creation at lines 151–163 (inside `handle()`):
```python
                addon = Product.objects.create(
                    kind=Purchasable.Kind.PRODUCT,
                    code=new_code,
                    product_code=new_code,
                    name=new_name,
                    description=base.purchasable_ptr.description,
                    is_active=base.purchasable_ptr.is_active,
                    is_addon=True,
                    dynamic_pricing=base.purchasable_ptr.dynamic_pricing,
                    vat_classification=base.purchasable_ptr.vat_classification,
                    exam_session_subject_id=base.exam_session_subject_id,
                    product_product_variation_id=base.product_product_variation_id,
                )
```
with:
```python
                addon = MaterialProduct.objects.create(
                    kind=Purchasable.Kind.PRODUCT,
                    code=new_code,
                    product_code=new_code,
                    name=new_name,
                    description=base.purchasable_ptr.description,
                    is_active=base.purchasable_ptr.is_active,
                    is_addon=True,
                    dynamic_pricing=base.purchasable_ptr.dynamic_pricing,
                    vat_classification=base.purchasable_ptr.vat_classification,
                    exam_session_subject_id=base.exam_session_subject_id,
                    product_product_variation_id=base.product_product_variation_id,
                )
```

Replace the PMS umbrella creation in `_create_pms_umbrellas` at lines 261–273:
```python
            new = Product.objects.create(
                kind=Purchasable.Kind.PRODUCT,
                code=target_code,
                product_code=target_code,
                name=ptr.name,
                description=ptr.description,
                is_active=ptr.is_active,
                is_addon=True,
                dynamic_pricing=ptr.dynamic_pricing,
                vat_classification=ptr.vat_classification,
                exam_session_subject_id=ess_id,
                product_product_variation_id=template.product_product_variation_id,
            )
```
with:
```python
            new = MaterialProduct.objects.create(
                kind=Purchasable.Kind.PRODUCT,
                code=target_code,
                product_code=target_code,
                name=ptr.name,
                description=ptr.description,
                is_active=ptr.is_active,
                is_addon=True,
                dynamic_pricing=ptr.dynamic_pricing,
                vat_classification=ptr.vat_classification,
                exam_session_subject_id=ess_id,
                product_product_variation_id=template.product_product_variation_id,
            )
```

(The `Product` import stays — it's still used to scan existing bases via `Product.objects.select_related(...)` and `Product.objects.filter(...)` queries.)

- [ ] **Step 2.4: Re-run test to verify it passes**

```powershell
python manage.py test store.tests.test_create_addon_products_subclass -v 2
```

Expected: 1 test, PASS.

- [ ] **Step 2.5: Verify the command's existing tests still pass**

```powershell
python manage.py test store.management.commands.tests.test_create_addon_products store.tests.test_create_addon_products_subclass -v 2 2>&1 | tail -40
```

(If the existing test path differs, run `python manage.py test store -v 2 -k addon` to discover the right path. The Phase 2 split tests are not relevant here.)

Expected: all addon-command tests pass.

- [ ] **Step 2.6: Commit**

```powershell
git add backend/django_Admin3/store/management/commands/create_addon_products.py backend/django_Admin3/store/tests/test_create_addon_products_subclass.py
git commit -m "feat(store): Phase 3.1 — create_addon_products writes MaterialProduct rows"
```

---

## Task 3: Update `import_current_products` to branch by format

Phase 2's split data has `M`-format rows as `MarkingProduct` and `P`/`C`-format rows as `MaterialProduct`. The importer must maintain that invariant for new imports. `M`-format imports also need an associated `MarkingTemplate` — we get-or-create one keyed by the catalog `Product.pk` (the same 1:1 mapping Phase 2's data migration used in `marking/migrations/0019_backfill_marking_templates.py`).

**Files:**
- Modify: `backend/django_Admin3/catalog/management/commands/import_current_products.py:59-60` (imports) and `:490-495` (the `StoreProduct(...)` instantiation block)
- Test: `backend/django_Admin3/catalog/tests/test_import_subclass_dispatch.py` (new file)

- [ ] **Step 3.1: Write the failing test**

Create `backend/django_Admin3/catalog/tests/test_import_subclass_dispatch.py`:

```python
"""Phase 3.1: `import_current_products` branches by format to the right
store subclass. P/C -> MaterialProduct, M -> MarkingProduct + MarkingTemplate.
"""
import io
import tempfile
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase


class ImportSubclassDispatchTests(TestCase):
    @staticmethod
    def _write_csv(rows):
        """Write rows to a temp CSV file and return its absolute path."""
        # Headered format; matches HEADER_ALIASES in import_current_products.py
        header = 'subject,type,item,version,code,fullname,shortname\n'
        tmp = tempfile.NamedTemporaryFile(
            mode='w', delete=False, suffix='.csv', encoding='utf-8',
        )
        tmp.write(header)
        for r in rows:
            tmp.write(','.join(r) + '\n')
        tmp.close()
        return tmp.name

    def _seed_ess(self, subject_code, session_code):
        from catalog.exam_session.models import ExamSession
        from catalog.subjects.models import Subject
        from catalog.models.exam_session_subject import ExamSessionSubject
        subject, _ = Subject.objects.get_or_create(
            code=subject_code, defaults={'description': subject_code},
        )
        es, _ = ExamSession.objects.get_or_create(
            session_code=session_code,
            defaults={'start_date': '2025-04-01', 'end_date': '2025-04-30'},
        )
        ess, _ = ExamSessionSubject.objects.get_or_create(
            subject=subject, exam_session=es,
        )
        return ess

    def test_printed_import_creates_material_product(self):
        from store.models import MaterialProduct, Product
        self._seed_ess('CB1', '2025-04')

        path = self._write_csv([
            ('CB1', 'P', 'CB1_TEST_P', '2025-04', 'CB1/P/2025-04',
             'CB1 Test Printed', 'CB1 Test'),
        ])
        try:
            call_command('import_current_products', path, stdout=io.StringIO())
            sp = Product.objects.get(product_code='CB1/P/2025-04')
            self.assertTrue(
                MaterialProduct.objects.filter(pk=sp.pk).exists(),
                'P-format import should produce MaterialProduct',
            )
        finally:
            Path(path).unlink(missing_ok=True)

    def test_ebook_import_creates_material_product(self):
        from store.models import MaterialProduct, Product
        self._seed_ess('CB1', '2025-04')

        path = self._write_csv([
            ('CB1', 'C', 'CB1_TEST_C', '2025-04', 'CB1/C/2025-04',
             'CB1 Test eBook', 'CB1 Test'),
        ])
        try:
            call_command('import_current_products', path, stdout=io.StringIO())
            sp = Product.objects.get(product_code='CB1/C/2025-04')
            self.assertTrue(
                MaterialProduct.objects.filter(pk=sp.pk).exists(),
                'C-format import should produce MaterialProduct',
            )
        finally:
            Path(path).unlink(missing_ok=True)

    def test_marking_import_creates_marking_product_and_template(self):
        from marking.models import MarkingTemplate
        from store.models import MarkingProduct, Product
        from catalog.products.models import Product as CatalogProduct
        self._seed_ess('CB1', '2025-04')

        path = self._write_csv([
            ('CB1', 'M', 'CB1_TEST_M_PHASE3', '2025-04', 'CB1/M/2025-04',
             'CB1 Test Marking Phase3', 'CB1 Test Marking'),
        ])
        try:
            call_command('import_current_products', path, stdout=io.StringIO())

            sp = Product.objects.get(product_code='CB1/M/2025-04')
            self.assertTrue(
                MarkingProduct.objects.filter(pk=sp.pk).exists(),
                'M-format import should produce MarkingProduct',
            )

            # The MarkingTemplate's PK must equal the catalog.Product.pk
            # this M-format row was deduped onto.
            cp = CatalogProduct.objects.get(code='CB1_TEST_M_PHASE3')
            mt = MarkingTemplate.objects.get(pk=cp.pk)
            self.assertEqual(mt.code, 'CB1_TEST_M_PHASE3')

            mp = MarkingProduct.objects.get(pk=sp.pk)
            self.assertEqual(mp.marking_template_id, mt.pk)
        finally:
            Path(path).unlink(missing_ok=True)
```

- [ ] **Step 3.2: Run test to verify it fails**

```powershell
python manage.py test catalog.tests.test_import_subclass_dispatch -v 2
```

Expected: 3 failures. The first two fail with `AssertionError: P-format import should produce MaterialProduct` (existing code writes `StoreProduct`, not `MaterialProduct`). The marking test fails earlier with `DoesNotExist` (no `MarkingProduct` row created — or with `IntegrityError` if it tries to create one without a `marking_template`).

- [ ] **Step 3.3: Update `import_current_products.py`**

Edit `backend/django_Admin3/catalog/management/commands/import_current_products.py`.

Change the import block at lines 59–60:
```python
from store.models.price import Price
from store.models.product import Product as StoreProduct
```
to:
```python
from marking.models import MarkingTemplate
from store.models.price import Price
from store.models.product import Product as StoreProduct
from store.models.material_product import MaterialProduct
from store.models.marking_product import MarkingProduct
```

Replace the `else:` branch in the `# Step 4` loop at lines 477–497 (the block starting with `else:` and ending at `stats['store_created'] += 1`):

Current code:
```python
                else:
                    code = line['csv_code'] or self._auto_code(
                        ess, ppv, item, used_codes,
                    )
                    if code in used_codes:
                        # The CSV explicitly gave us a colliding code —
                        # likely a duplicate row. Report and skip.
                        stats['skipped_bad_format'] += 1
                        report_rows.append({
                            **line,
                            'reason': f'duplicate_code:{code}',
                        })
                        continue
                    sp = StoreProduct(
                        exam_session_subject=ess,
                        product_product_variation=ppv,
                        product_code=code,
                    )
                    sp.save()
                    used_codes.add(code)
                    stats['store_created'] += 1
```

Replace with:
```python
                else:
                    code = line['csv_code'] or self._auto_code(
                        ess, ppv, item, used_codes,
                    )
                    if code in used_codes:
                        # The CSV explicitly gave us a colliding code —
                        # likely a duplicate row. Report and skip.
                        stats['skipped_bad_format'] += 1
                        report_rows.append({
                            **line,
                            'reason': f'duplicate_code:{code}',
                        })
                        continue
                    # Phase 3.1: dispatch to the correct MTI subclass based
                    # on the CSV format. P/C -> Material; M -> Marking +
                    # auto-created MarkingTemplate keyed by catalog.Product.pk.
                    fmt = line['fmt']
                    if fmt == 'M':
                        mt, mt_created = MarkingTemplate.objects.get_or_create(
                            pk=product.pk,
                            defaults={
                                'code': product.code,
                                'name': product.shortname or product.fullname,
                                'description': '',
                                'is_active': True,
                            },
                        )
                        if mt_created:
                            stats['marking_templates_created'] = (
                                stats.get('marking_templates_created', 0) + 1
                            )
                        sp = MarkingProduct(
                            exam_session_subject=ess,
                            product_product_variation=ppv,
                            product_code=code,
                            marking_template=mt,
                        )
                    else:  # 'P', 'C' (and any future material-family code)
                        sp = MaterialProduct(
                            exam_session_subject=ess,
                            product_product_variation=ppv,
                            product_code=code,
                        )
                    sp.save()
                    used_codes.add(code)
                    stats['store_created'] += 1
```

- [ ] **Step 3.4: Re-run test to verify it passes**

```powershell
python manage.py test catalog.tests.test_import_subclass_dispatch -v 2
```

Expected: 3 tests, all PASS.

- [ ] **Step 3.5: Verify the broader importer tests still pass**

```powershell
python manage.py test catalog -v 2 -k import 2>&1 | tail -50
```

Expected: all import-related tests pass.

- [ ] **Step 3.6: Commit**

```powershell
git add backend/django_Admin3/catalog/management/commands/import_current_products.py backend/django_Admin3/catalog/tests/test_import_subclass_dispatch.py
git commit -m "feat(catalog): Phase 3.1 — import_current_products dispatches to MTI subclass"
```

---

## Task 4: Whole-test-suite sanity sweep

We've touched admin (read-only), one store command, and one catalog command. The Phase 2 split tests and the unchanged consumer code should still be green.

- [ ] **Step 4.1: Run the full backend test suite**

```powershell
cd C:\Code\Admin3\backend\django_Admin3
python manage.py test -v 1 2>&1 | tee phase-3-1-fullrun.log | tail -30
```

Expected: All tests pass. The summary line should read `OK` and the FAILED line should not appear.

If any pre-existing test breaks, STOP. Read the failure, determine whether it's a regression from this PR (the fix lives here) or a pre-existing flake (note it in the PR body and skip after confirming with the operator).

- [ ] **Step 4.2: Smoke-test the admin pages on the dev server**

In one terminal:
```powershell
cd C:\Code\Admin3\backend\django_Admin3
python manage.py runserver 8888
```

In a browser, visit each URL (logged in as superuser):
- http://127.0.0.1:8888/admin/store/materialproduct/
- http://127.0.0.1:8888/admin/store/tutorialproduct/
- http://127.0.0.1:8888/admin/store/markingproduct/
- http://127.0.0.1:8888/admin/store/product/  (cross-cut, read-only — Add button should be absent)

Each page should load, show rows from the dev DB, and the search/filter widgets should be present. The Product cross-cut should have no "Add product" button and the row-edit links should be absent or 404 on attempt.

Stop the dev server with Ctrl-C.

- [ ] **Step 4.3: Delete the test log**

```powershell
Remove-Item phase-3-1-fullrun.log
```

- [ ] **Step 4.4: (No commit — Task 4 only verifies)**

---

## Task 5: Push branch and open PR

- [ ] **Step 5.1: Push**

```powershell
git push -u origin feat/20260514-product-mti-phase-3-1-admin
```

- [ ] **Step 5.2: Open PR**

```powershell
gh pr create --base main --head feat/20260514-product-mti-phase-3-1-admin `
    --title "feat(store): Phase 3.1 — per-subclass admins + dispatching commands" `
    --body @-
```

Then paste the PR body (substitute the actual stats from Task 4.1):

```markdown
## Summary

Phase 3.1 of the [Product MTI specialization](../docs/superpowers/specs/2026-05-13-product-mti-specialization-design.md). Dual-write: makes sure every NEW product row goes into the right MTI subclass table (`acted.material_products`, `acted.tutorial_products`, or `acted.marking_products`).

No consumer code changes. No data migrations. No model changes.

## What changed

- `store/admin.py`: three new `ModelAdmin` classes — `MaterialProductAdmin`, `TutorialProductAdmin`, `MarkingProductAdmin`. The legacy `ProductAdmin` is kept as a read-only "All Products" cross-cut.
- `store/management/commands/create_addon_products.py`: addon clones (PXS/CXS/CM1S/CYS) and PMS umbrellas now instantiate `MaterialProduct` (per spec §9, all addons are material).
- `catalog/management/commands/import_current_products.py`: branches on CSV `type` — `P`/`C` → `MaterialProduct`, `M` → `MarkingProduct` (auto-creates a `MarkingTemplate` keyed by `catalog.Product.pk` if one doesn't yet exist).

## What's NOT in this PR

- Serializer changes — coming in Phase 3.2.
- Filtering / search / cart / orders changes — coming in Phase 4a–d.
- `Purchasable.Kind` cleanup — Phase 4e.
- Moving `product_product_variation` to `MaterialProduct` — Phase 5.

## Tests

- New: `store/tests/test_admin_subclass.py` (6 tests — registration + changelist 200).
- New: `store/tests/test_create_addon_products_subclass.py` (1 test — addon is MaterialProduct).
- New: `catalog/tests/test_import_subclass_dispatch.py` (3 tests — P/C → Material, M → Marking + template).
- Full suite: `python manage.py test -v 1` → OK (replace with actual count).

## Manual verification

- All four admin changelists load (Material/Tutorial/Marking + read-only Product cross-cut).
- Dev DB has untouched Phase 2 counts: Product ≈ 8173 / Material ≈ 6847 / Tutorial ≈ 649 / Marking ≈ 677.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

End the heredoc with EOF (or run the command without `--body @-` and supply `--body "..."` with the markdown inlined).

- [ ] **Step 5.3: Wait for CI**

```powershell
gh pr checks --watch
```

Expected: all checks green.

- [ ] **Step 5.4: Merge**

```powershell
gh pr merge --squash --delete-branch
```

- [ ] **Step 5.5: Sync local main**

```powershell
git checkout main
git pull origin main
```

---

## Self-review checklist

After all tasks complete, before declaring done:

- [ ] No `Product.objects.create(...)` remains in `store/management/commands/create_addon_products.py`.
- [ ] No `StoreProduct(...)` instantiation remains in `catalog/management/commands/import_current_products.py`.
- [ ] All three subclass models appear in `django_admin.site._registry`.
- [ ] The base `Product` admin is read-only (`has_add_permission` / `has_change_permission` / `has_delete_permission` all return `False`).
- [ ] Phase 2 invariants intact: `MaterialProduct.count() + TutorialProduct.count() + MarkingProduct.count() == Product.count()`.
- [ ] `python manage.py makemigrations --check --dry-run` → no changes detected.
