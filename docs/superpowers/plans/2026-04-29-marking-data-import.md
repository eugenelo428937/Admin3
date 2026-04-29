# Marking Data Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import historical marking data from `markers.csv` and `marks26.csv` into the new marking app, including required schema migrations and a new `RedeemedVoucher` model.

**Architecture:** Three-phase delivery: (A) schema migrations across `staff`, `marking_vouchers`, `marking` apps (renames, FK retargets, new model, `is_active` columns); (B) `import_markers` management command — single-pass strict validation; (C) `import_marks26` management command — two-pass validate-then-atomic-commit with CSV error reports. CSV-import logic is split into focused modules under `marking/services/csv_imports/` so each helper is unit-testable without involving Django command machinery.

**Tech Stack:** Django 6.0 + DRF, PostgreSQL with `acted` schema, `zoneinfo` for Europe/London → UTC, Python `csv` stdlib, `transaction.atomic()` for one-shot commit. Tests use `APITestCase`/`TestCase` against PostgreSQL.

**Spec:** `docs/superpowers/specs/2026-04-29-marking-data-import-design.md`

---

## File Structure

### Migrations (created)
- `backend/django_Admin3/staff/migrations/0004_add_staff_initials.py`
- `backend/django_Admin3/marking_vouchers/migrations/0005_add_redeemed_voucher.py`
- `backend/django_Admin3/marking/migrations/0010_marking_paper_purchasable_fk.py`
- `backend/django_Admin3/marking/migrations/0011_add_marker_legacy_id.py`
- `backend/django_Admin3/marking/migrations/0012_submission_swap_voucher_fk.py`
- `backend/django_Admin3/marking/migrations/0013_grading_field_changes.py`
- `backend/django_Admin3/marking/migrations/0014_feedback_field_changes.py`

### Models (created/modified)
- Modify: `backend/django_Admin3/staff/models/staff.py` — add `initials`
- Create: `backend/django_Admin3/marking_vouchers/models/redeemed_voucher.py`
- Modify: `backend/django_Admin3/marking_vouchers/models/__init__.py` — export `RedeemedVoucher`
- Modify: `backend/django_Admin3/marking/models/marker.py` — add `legacy_id`
- Modify: `backend/django_Admin3/marking/models/marking_paper.py` — rename `store_product` → `purchasable`, add `is_active`
- Modify: `backend/django_Admin3/marking/models/marking_paper_submission.py` — drop `marking_voucher`, add `redeemed_voucher`, `is_active`, `order_item` non-nullable
- Modify: `backend/django_Admin3/marking/models/marking_paper_grading.py` — rename `submission_date` → `graded_date`, drop `hub_download_date`, add `grade`, `is_active`
- Modify: `backend/django_Admin3/marking/models/marking_paper_feedback.py` — rename `grade` → `rating`, rename `submission_date` → `feedback_date`, drop `hub_download_date`, add `is_active`

### Serializer / Admin / View updates (modified — propagate field renames)
- Modify: `backend/django_Admin3/marking/admin.py`
- Modify: `backend/django_Admin3/marking/admin_views.py`
- Modify: `backend/django_Admin3/marking/admin_serializers.py`
- Modify: `backend/django_Admin3/marking/views.py`
- Modify: `backend/django_Admin3/marking/serializers.py`
- Modify: `backend/django_Admin3/marking/management/commands/import_marking_deadlines.py`
- Modify: `backend/django_Admin3/marking/tests/fixtures.py`
- Modify: `backend/django_Admin3/marking/tests/test_models.py`
- Modify: `backend/django_Admin3/marking/tests/test_views.py`
- Modify: `backend/django_Admin3/marking/tests/test_admin_views.py`
- Modify: `backend/django_Admin3/marking/tests/test_serializer_field_coverage.py`

### RedeemedVoucher integration (created)
- Create: `backend/django_Admin3/marking_vouchers/serializers.py` — add `RedeemedVoucherSerializer`
- Modify: `backend/django_Admin3/marking_vouchers/admin.py` — register `RedeemedVoucher`
- Modify: `backend/django_Admin3/marking_vouchers/views.py` — add `RedeemedVoucherViewSet`
- Modify: `backend/django_Admin3/marking_vouchers/urls.py` (or equivalent) — add route

### CSV import services (created)
- Create: `backend/django_Admin3/marking/services/__init__.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/__init__.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/date_parsing.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/markers.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/marks26_parsing.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/marks26_lookups.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/marks26_validators.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/marks26_steps.py`

### Management commands (created)
- Create: `backend/django_Admin3/marking/management/commands/import_markers.py`
- Create: `backend/django_Admin3/marking/management/commands/import_marks26.py`

### Tests (created)
- Create: `backend/django_Admin3/marking/services/csv_imports/tests/__init__.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/tests/test_date_parsing.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/tests/test_markers.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/tests/test_marks26_parsing.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/tests/test_marks26_lookups.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/tests/test_marks26_validators.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/tests/test_marks26_steps.py`
- Create: `backend/django_Admin3/marking/tests/test_import_markers_command.py`
- Create: `backend/django_Admin3/marking/tests/test_import_marks26_command.py`

---

## Phase A — Schema Migrations

### Task A1: Add `Staff.initials` field

**Files:**
- Modify: `backend/django_Admin3/staff/models/staff.py`
- Create: `backend/django_Admin3/staff/migrations/0004_add_staff_initials.py`
- Modify: `backend/django_Admin3/staff/tests/test_models.py`

- [ ] **Step 1: Write failing test for Staff.initials field**

Add this test to `staff/tests/test_models.py`:

```python
def test_staff_has_initials_field(self):
    from django.contrib.auth.models import User
    from staff.models import Staff
    user = User.objects.create_user(username='alice', first_name='Alice', last_name='Allen')
    staff = Staff.objects.create(user=user, initials='AA')
    refreshed = Staff.objects.get(pk=staff.pk)
    self.assertEqual(refreshed.initials, 'AA')

def test_staff_initials_default_blank(self):
    from django.contrib.auth.models import User
    from staff.models import Staff
    user = User.objects.create_user(username='bob')
    staff = Staff.objects.create(user=user)
    self.assertEqual(staff.initials, '')
```

- [ ] **Step 2: Run test (should FAIL — field does not exist)**

```
cd backend/django_Admin3
python manage.py test staff.tests.test_models -v 2
```

Expected: AttributeError or migration not found.

- [ ] **Step 3: Add `initials` field to Staff model**

Modify `staff/models/staff.py` — add this field after `job_title`:

```python
    initials = models.CharField(
        max_length=10,
        blank=True,
        default='',
        db_index=True,
        help_text='Short initials used to identify staff in legacy systems',
    )
```

- [ ] **Step 4: Generate migration**

```
cd backend/django_Admin3
python manage.py makemigrations staff --name add_staff_initials
```

Verify the file is named `staff/migrations/0004_add_staff_initials.py` and contains `AddField('staff', 'initials', ...)`.

- [ ] **Step 5: Apply migration**

```
python manage.py migrate staff
```

- [ ] **Step 6: Run test (should PASS)**

```
python manage.py test staff.tests.test_models -v 2
```

Expected: 2 new tests pass.

- [ ] **Step 7: Commit**

```bash
git add staff/models/staff.py staff/migrations/0004_add_staff_initials.py staff/tests/test_models.py
git commit -m "feat(staff): add initials field to Staff model"
```

---

### Task A2: Create `RedeemedVoucher` model

**Files:**
- Create: `backend/django_Admin3/marking_vouchers/models/redeemed_voucher.py`
- Modify: `backend/django_Admin3/marking_vouchers/models/__init__.py`
- Create: `backend/django_Admin3/marking_vouchers/migrations/0005_add_redeemed_voucher.py`
- Create: `backend/django_Admin3/marking_vouchers/tests/test_redeemed_voucher.py`

- [ ] **Step 1: Write failing test for RedeemedVoucher model**

Create `marking_vouchers/tests/test_redeemed_voucher.py`:

```python
from datetime import timedelta
from django.contrib.auth.models import User
from django.db import IntegrityError
from django.utils import timezone

from marking.tests.fixtures import MarkingChainTestCase
from marking_vouchers.models import IssuedVoucher, RedeemedVoucher
from orders.models import Order
from orders.models.order_item import OrderItem
from store.models import Purchasable


class RedeemedVoucherTests(MarkingChainTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.mv_purchasable = Purchasable.objects.create(
            kind='marking_voucher', code='MV', name='Marking Voucher',
        )
        cls.order = Order.objects.create(
            user=cls.student_user, order_date=timezone.now(),
        )
        cls.order_item = OrderItem.objects.create(
            order=cls.order,
            purchasable=cls.mv_purchasable,
            quantity=1,
            metadata={'orderno': '1490175'},
        )
        cls.iv = IssuedVoucher.objects.create(
            voucher_code='ABC123',
            order_item=cls.order_item,
            purchasable=cls.mv_purchasable,
            expires_at=timezone.now() + timedelta(days=365),
        )

    def test_create_redeemed_voucher(self):
        rv = RedeemedVoucher.objects.create(
            issued_voucher=self.iv,
            marking_paper=self.paper,
            redeemed_at=timezone.now(),
        )
        self.assertIsNotNone(rv.pk)
        self.assertIsNotNone(rv.created_at)
        self.assertIsNotNone(rv.updated_at)

    def test_one_to_one_issued_voucher(self):
        RedeemedVoucher.objects.create(
            issued_voucher=self.iv,
            marking_paper=self.paper,
            redeemed_at=timezone.now(),
        )
        with self.assertRaises(IntegrityError):
            RedeemedVoucher.objects.create(
                issued_voucher=self.iv,
                marking_paper=self.paper,
                redeemed_at=timezone.now(),
            )

    def test_str_representation(self):
        rv = RedeemedVoucher.objects.create(
            issued_voucher=self.iv,
            marking_paper=self.paper,
            redeemed_at=timezone.now(),
        )
        self.assertIn('ABC123', str(rv))
        self.assertIn(self.paper.name, str(rv))
```

- [ ] **Step 2: Run test (should FAIL — RedeemedVoucher does not exist)**

```
python manage.py test marking_vouchers.tests.test_redeemed_voucher -v 2
```

Expected: ImportError "cannot import name 'RedeemedVoucher'".

- [ ] **Step 3: Create the RedeemedVoucher model**

Create `marking_vouchers/models/redeemed_voucher.py`:

```python
"""RedeemedVoucher — one row per voucher redemption against a marking paper.

The OneToOneField on issued_voucher enforces that a voucher can be
redeemed at most once.
"""
from django.db import models


class RedeemedVoucher(models.Model):
    issued_voucher = models.OneToOneField(
        'marking_vouchers.IssuedVoucher',
        on_delete=models.PROTECT,
        related_name='redemption',
    )
    marking_paper = models.ForeignKey(
        'marking.MarkingPaper',
        on_delete=models.PROTECT,
        related_name='redemptions',
    )
    redeemed_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."redeemed_vouchers"'
        verbose_name = 'Redeemed Voucher'
        verbose_name_plural = 'Redeemed Vouchers'

    def __str__(self):
        return f'Redemption({self.issued_voucher.voucher_code} → {self.marking_paper.name})'
```

- [ ] **Step 4: Export RedeemedVoucher in package init**

Modify `marking_vouchers/models/__init__.py`:

```python
from .issued_voucher import IssuedVoucher
from .redeemed_voucher import RedeemedVoucher

__all__ = ['IssuedVoucher', 'RedeemedVoucher']
```

- [ ] **Step 5: Generate and inspect migration**

```
python manage.py makemigrations marking_vouchers --name add_redeemed_voucher
```

Open `marking_vouchers/migrations/0005_add_redeemed_voucher.py` and confirm:
- It creates table `"acted"."redeemed_vouchers"`
- `issued_voucher` is OneToOneField with `unique=True`
- Has `dependencies = [('marking_vouchers', '0004_drop_marking_voucher_table'), ('marking', '0009_switch_marking_voucher_to_generic_item')]` (auto-generated; verify)

- [ ] **Step 6: Apply migration**

```
python manage.py migrate marking_vouchers
```

- [ ] **Step 7: Run test (should PASS)**

```
python manage.py test marking_vouchers.tests.test_redeemed_voucher -v 2
```

Expected: 3 tests pass.

- [ ] **Step 8: Commit**

```bash
git add marking_vouchers/models/redeemed_voucher.py marking_vouchers/models/__init__.py marking_vouchers/migrations/0005_add_redeemed_voucher.py marking_vouchers/tests/test_redeemed_voucher.py
git commit -m "feat(marking_vouchers): add RedeemedVoucher model"
```

---

### Task A3: Add serializer/admin/view for RedeemedVoucher

**Files:**
- Modify: `backend/django_Admin3/marking_vouchers/serializers.py`
- Modify: `backend/django_Admin3/marking_vouchers/admin.py`
- Modify: `backend/django_Admin3/marking_vouchers/views.py`
- Modify: `backend/django_Admin3/marking_vouchers/urls.py`

- [ ] **Step 1: Inspect existing IssuedVoucher patterns**

Open the four files above and read the existing `IssuedVoucher` patterns. Mirror them for `RedeemedVoucher`:

- [ ] **Step 2: Add RedeemedVoucherSerializer**

Append to `marking_vouchers/serializers.py`:

```python
from rest_framework import serializers
from .models import RedeemedVoucher


class RedeemedVoucherSerializer(serializers.ModelSerializer):
    issued_voucher_code = serializers.CharField(
        source='issued_voucher.voucher_code', read_only=True,
    )
    marking_paper_name = serializers.CharField(
        source='marking_paper.name', read_only=True,
    )

    class Meta:
        model = RedeemedVoucher
        fields = [
            'id',
            'issued_voucher',
            'issued_voucher_code',
            'marking_paper',
            'marking_paper_name',
            'redeemed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
```

- [ ] **Step 3: Register RedeemedVoucher in admin**

Append to `marking_vouchers/admin.py`:

```python
from .models import RedeemedVoucher


@admin.register(RedeemedVoucher)
class RedeemedVoucherAdmin(admin.ModelAdmin):
    list_display = ('id', 'issued_voucher', 'marking_paper', 'redeemed_at')
    search_fields = ('issued_voucher__voucher_code', 'marking_paper__name')
    list_select_related = ('issued_voucher', 'marking_paper')
    readonly_fields = ('created_at', 'updated_at')
```

- [ ] **Step 4: Add RedeemedVoucherViewSet**

Append to `marking_vouchers/views.py`:

```python
from rest_framework import viewsets
from .models import RedeemedVoucher
from .serializers import RedeemedVoucherSerializer


class RedeemedVoucherViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RedeemedVoucher.objects.select_related(
        'issued_voucher', 'marking_paper',
    ).all()
    serializer_class = RedeemedVoucherSerializer
```

- [ ] **Step 5: Register URL route**

Modify `marking_vouchers/urls.py` to register the viewset using the existing router pattern. If a `DefaultRouter` already exists:

```python
from .views import RedeemedVoucherViewSet
router.register(r'redeemed-vouchers', RedeemedVoucherViewSet, basename='redeemed-voucher')
```

- [ ] **Step 6: Smoke-test imports**

```
python manage.py check
```

Expected: 0 issues.

- [ ] **Step 7: Commit**

```bash
git add marking_vouchers/serializers.py marking_vouchers/admin.py marking_vouchers/views.py marking_vouchers/urls.py
git commit -m "feat(marking_vouchers): add serializer/admin/viewset for RedeemedVoucher"
```

---

### Task A4: Add `Marker.legacy_id` field

**Files:**
- Modify: `backend/django_Admin3/marking/models/marker.py`
- Create: `backend/django_Admin3/marking/migrations/0010_add_marker_legacy_id.py`
- Modify: `backend/django_Admin3/marking/tests/test_models.py`

- [ ] **Step 1: Write failing test**

Add to `marking/tests/test_models.py`:

```python
def test_marker_has_legacy_id(self):
    from django.contrib.auth.models import User
    from marking.models import Marker
    user = User.objects.create_user(username='m1', first_name='Mary', last_name='Marker')
    marker = Marker.objects.create(user=user, initial='MM', legacy_id=42)
    refreshed = Marker.objects.get(pk=marker.pk)
    self.assertEqual(refreshed.legacy_id, 42)

def test_marker_legacy_id_unique(self):
    from django.contrib.auth.models import User
    from django.db import IntegrityError
    from marking.models import Marker
    u1 = User.objects.create_user(username='m_a', first_name='A', last_name='A')
    u2 = User.objects.create_user(username='m_b', first_name='B', last_name='B')
    Marker.objects.create(user=u1, initial='AA', legacy_id=99)
    with self.assertRaises(IntegrityError):
        Marker.objects.create(user=u2, initial='BB', legacy_id=99)
```

- [ ] **Step 2: Run test (should FAIL)**

```
python manage.py test marking.tests.test_models -v 2
```

Expected: FAIL — `legacy_id` not a field.

- [ ] **Step 3: Add legacy_id to Marker model**

Modify `marking/models/marker.py` — add this field after `initial`:

```python
    legacy_id = models.PositiveIntegerField(
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text='mkref from legacy system (markers.csv)',
    )
```

- [ ] **Step 4: Generate migration**

```
python manage.py makemigrations marking --name add_marker_legacy_id
```

Verify file is `marking/migrations/0010_add_marker_legacy_id.py`.

- [ ] **Step 5: Apply migration**

```
python manage.py migrate marking
```

- [ ] **Step 6: Run test (should PASS)**

```
python manage.py test marking.tests.test_models -v 2
```

- [ ] **Step 7: Commit**

```bash
git add marking/models/marker.py marking/migrations/0010_add_marker_legacy_id.py marking/tests/test_models.py
git commit -m "feat(marking): add legacy_id to Marker model"
```

---

### Task A5: Rename `MarkingPaper.store_product` → `purchasable`, retarget FK, add `is_active`

This task is wider because the rename affects fixtures, tests, admin, views, and the existing `import_marking_deadlines` command.

**Files:**
- Modify: `backend/django_Admin3/marking/models/marking_paper.py`
- Create: `backend/django_Admin3/marking/migrations/0011_marking_paper_purchasable_fk.py`
- Modify: `backend/django_Admin3/marking/admin.py`
- Modify: `backend/django_Admin3/marking/views.py`
- Modify: `backend/django_Admin3/marking/serializers.py`
- Modify: `backend/django_Admin3/marking/management/commands/import_marking_deadlines.py`
- Modify: `backend/django_Admin3/marking/tests/fixtures.py`
- Modify: `backend/django_Admin3/marking/tests/test_models.py`
- Modify: `backend/django_Admin3/marking/tests/test_views.py`
- Modify: `backend/django_Admin3/marking/tests/test_serializer_field_coverage.py`

- [ ] **Step 1: Update MarkingPaper model**

Modify `marking/models/marking_paper.py` — replace the `store_product` field block with:

```python
    purchasable = models.ForeignKey(
        'store.Purchasable',
        on_delete=models.PROTECT,
        related_name='marking_papers',
        null=True,
        blank=True,
        help_text='The purchasable this marking paper belongs to',
    )
    is_active = models.BooleanField(default=True, db_index=True)
```

Update the docstring at the top to reflect the new FK target. Update the `exam_session_subject_product` property to access the product via `Purchasable` MTI:

```python
    @property
    def exam_session_subject_product(self):
        """Backward-compatible accessor — only meaningful when purchasable is a Product."""
        from catalog.models import ExamSessionSubjectProduct
        from store.models import Product as StoreProduct
        if not self.purchasable_id:
            return None
        try:
            store_product = StoreProduct.objects.get(pk=self.purchasable_id)
        except StoreProduct.DoesNotExist:
            return None
        return ExamSessionSubjectProduct.objects.filter(
            exam_session_subject=store_product.exam_session_subject,
            product=store_product.product_product_variation.product,
        ).first()

    def __str__(self):
        return f"{self.name} ({self.purchasable_id})"
```

- [ ] **Step 2: Generate migration**

```
python manage.py makemigrations marking --name marking_paper_purchasable_fk
```

The auto-generator will produce the migration. Open the generated file and verify it contains `RenameField('marking_paper', 'store_product', 'purchasable')` (or `RemoveField` + `AddField` — that's fine too) plus `AlterField` to change FK target and `AddField` for `is_active`. If Django chose `RemoveField`+`AddField` instead of `RenameField`, **manually edit the file** to replace those operations with `RenameField` to preserve data:

```python
operations = [
    migrations.RenameField(
        model_name='markingpaper',
        old_name='store_product',
        new_name='purchasable',
    ),
    migrations.AlterField(
        model_name='markingpaper',
        name='purchasable',
        field=models.ForeignKey(
            blank=True,
            help_text='The purchasable this marking paper belongs to',
            null=True,
            on_delete=django.db.models.deletion.PROTECT,
            related_name='marking_papers',
            to='store.purchasable',
        ),
    ),
    migrations.AddField(
        model_name='markingpaper',
        name='is_active',
        field=models.BooleanField(db_index=True, default=True),
    ),
]
```

- [ ] **Step 3: Update fixtures**

Modify `marking/tests/fixtures.py` line 78-83 — change `store_product=cls.store_product` to `purchasable=cls.store_product` (works because `StoreProduct` inherits from `Purchasable`):

```python
        cls.paper = MarkingPaper.objects.create(
            purchasable=cls.store_product,
            name='FixPaper',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40),
        )
```

- [ ] **Step 4: Update import_marking_deadlines**

Modify `marking/management/commands/import_marking_deadlines.py` line 78-83 — change `store_product=store_product` to `purchasable=store_product`. Update line 60 (the comment) accordingly.

- [ ] **Step 5: Update admin/views/serializers — global rename of `store_product` → `purchasable`**

For each of `marking/admin.py`, `marking/views.py`, `marking/serializers.py`, replace every reference to:
- `store_product` → `purchasable`
- `store_product_id` → `purchasable_id`
- `store_product__` → `purchasable__`

In `marking/views.py`, the API query parameters `store_product_id` and `store_product_ids` should be renamed to `purchasable_id` and `purchasable_ids`. Update the docstrings accordingly. Also change `StoreProduct` import to `Purchasable`:

```python
from store.models import Purchasable

# inside the view:
store_product_id = request.query_params.get('purchasable_id')
# ...
purchasable = Purchasable.objects.get(id=store_product_id)
papers = MarkingPaper.objects.filter(purchasable=purchasable)
```

- [ ] **Step 6: Update tests — rename references in test_models.py, test_views.py, test_serializer_field_coverage.py**

In each test file, replace `store_product` with `purchasable` (and update any `StoreProduct` imports to `Purchasable` if test logic now goes through the parent).

- [ ] **Step 7: Apply migration**

```
python manage.py migrate marking
```

- [ ] **Step 8: Run all marking tests**

```
python manage.py test marking -v 2
```

Expected: all tests pass. If a test fails, fix the rename it missed.

- [ ] **Step 9: Commit**

```bash
git add marking/
git commit -m "refactor(marking): rename MarkingPaper.store_product to purchasable, add is_active"
```

---

### Task A6: Swap `MarkingPaperSubmission.marking_voucher` for `redeemed_voucher`, add `is_active`, make `order_item` non-nullable

**Files:**
- Modify: `backend/django_Admin3/marking/models/marking_paper_submission.py`
- Create: `backend/django_Admin3/marking/migrations/0012_submission_swap_voucher_fk.py`
- Modify: `backend/django_Admin3/marking/admin.py`
- Modify: `backend/django_Admin3/marking/admin_views.py`
- Modify: `backend/django_Admin3/marking/admin_serializers.py`
- Modify: `backend/django_Admin3/marking/tests/test_models.py`

- [ ] **Step 1: Update MarkingPaperSubmission model**

Replace the contents of `marking/models/marking_paper_submission.py` with:

```python
"""MarkingPaperSubmission model — one row per (student, marking_paper)."""
from django.db import models


class MarkingPaperSubmission(models.Model):
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.PROTECT,
        related_name='marking_submissions',
    )
    marking_paper = models.ForeignKey(
        'marking.MarkingPaper',
        on_delete=models.PROTECT,
        related_name='submissions',
    )
    redeemed_voucher = models.ForeignKey(
        'marking_vouchers.RedeemedVoucher',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='submissions',
    )
    order_item = models.ForeignKey(
        'orders.OrderItem',
        on_delete=models.PROTECT,
        related_name='marking_submissions',
    )
    submission_date = models.DateTimeField()
    hub_download_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."marking_paper_submissions"'
        verbose_name = 'Marking Paper Submission'
        verbose_name_plural = 'Marking Paper Submissions'
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'marking_paper'],
                name='uq_submission_student_paper',
            ),
        ]

    def __str__(self):
        return f'{self.student} — {self.marking_paper.name}'
```

- [ ] **Step 2: Generate migration**

```
python manage.py makemigrations marking --name submission_swap_voucher_fk
```

Verify migration contains:
- `RemoveField('markingpapersubmission', 'marking_voucher')`
- `AddField('markingpapersubmission', 'redeemed_voucher', ForeignKey to marking_vouchers.RedeemedVoucher, null=True)`
- `AddField('markingpapersubmission', 'is_active', ...)`
- `AlterField('markingpapersubmission', 'order_item', ForeignKey, null=False)`

- [ ] **Step 3: Update admin/admin_views/admin_serializers**

In each of `marking/admin.py`, `marking/admin_views.py`, `marking/admin_serializers.py`, replace `marking_voucher` with `redeemed_voucher` everywhere it appears (field listings, serializer fields, list_display). Add `'is_active'` to relevant `list_display`/serializer `fields` lists.

- [ ] **Step 4: Apply migration**

```
python manage.py migrate marking
```

- [ ] **Step 5: Update existing tests in test_models.py**

In `marking/tests/test_models.py`, find every `MarkingPaperSubmission.objects.create(... marking_voucher=...)` call and rename to `redeemed_voucher=...`. Where `order_item=None` is passed, replace with a fixture order_item (use `MarkingChainTestCase` infrastructure to add an OrderItem).

- [ ] **Step 6: Run all marking tests**

```
python manage.py test marking -v 2
```

- [ ] **Step 7: Commit**

```bash
git add marking/
git commit -m "refactor(marking): swap MarkingPaperSubmission FK to RedeemedVoucher, add is_active"
```

---

### Task A7: `MarkingPaperGrading` — rename, drop, add fields

**Files:**
- Modify: `backend/django_Admin3/marking/models/marking_paper_grading.py`
- Create: `backend/django_Admin3/marking/migrations/0013_grading_field_changes.py`
- Modify: `backend/django_Admin3/marking/admin.py`
- Modify: `backend/django_Admin3/marking/admin_views.py`
- Modify: `backend/django_Admin3/marking/admin_serializers.py`
- Modify: `backend/django_Admin3/marking/tests/test_models.py`
- Modify: `backend/django_Admin3/marking/tests/test_admin_views.py`

- [ ] **Step 1: Update MarkingPaperGrading model**

Replace the contents of `marking/models/marking_paper_grading.py` with:

```python
"""MarkingPaperGrading model — one grading per submission."""
from django.db import models


class MarkingPaperGrading(models.Model):
    GRADE_CHOICES = [
        ('A', 'A'),
        ('B', 'B'),
        ('C', 'C'),
        ('D', 'D'),
    ]

    submission = models.OneToOneField(
        'marking.MarkingPaperSubmission',
        on_delete=models.CASCADE,
        related_name='grading',
    )
    marker = models.ForeignKey(
        'marking.Marker',
        on_delete=models.PROTECT,
        related_name='gradings',
    )
    allocate_date = models.DateTimeField()
    allocate_by = models.ForeignKey(
        'staff.Staff',
        on_delete=models.PROTECT,
        related_name='allocated_gradings',
    )
    graded_date = models.DateTimeField(null=True, blank=True)
    hub_upload_date = models.DateTimeField(null=True, blank=True)
    score = models.IntegerField(null=True, blank=True)
    grade = models.CharField(
        max_length=1,
        choices=GRADE_CHOICES,
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."marking_paper_gradings"'
        verbose_name = 'Marking Paper Grading'
        verbose_name_plural = 'Marking Paper Gradings'

    def __str__(self):
        return f'Grading({self.submission_id}) by {self.marker.initial}'
```

- [ ] **Step 2: Generate migration**

```
python manage.py makemigrations marking --name grading_field_changes
```

Open the generated migration. Confirm it contains:
- `RenameField('markingpapergrading', 'submission_date', 'graded_date')`
- `RemoveField('markingpapergrading', 'hub_download_date')`
- `AddField('markingpapergrading', 'grade', ...)`
- `AddField('markingpapergrading', 'is_active', ...)`

If Django generated `RemoveField('submission_date')` + `AddField('graded_date')` instead of `RenameField`, manually edit to use `RenameField`. Since the table is empty, both work, but RenameField is cleaner.

- [ ] **Step 3: Update admin/admin_views/admin_serializers**

Search for `submission_date` (in grading context) → `graded_date`. Search for `hub_download_date` (in grading context) → remove. Add `'grade'` and `'is_active'` to `list_display`/serializer `fields`.

The grading-specific code is in:
- `marking/admin.py` — `MarkingPaperGradingAdmin`
- `marking/admin_views.py` — grading endpoints
- `marking/admin_serializers.py` — `MarkingPaperGradingSerializer`

- [ ] **Step 4: Apply migration**

```
python manage.py migrate marking
```

- [ ] **Step 5: Update tests**

In `marking/tests/test_models.py` and `marking/tests/test_admin_views.py`, rename `submission_date` references on grading objects to `graded_date`. Remove `hub_download_date` arguments on grading creation.

- [ ] **Step 6: Run all marking tests**

```
python manage.py test marking -v 2
```

- [ ] **Step 7: Commit**

```bash
git add marking/
git commit -m "refactor(marking): rename graded_date, add grade and is_active to MarkingPaperGrading"
```

---

### Task A8: `MarkingPaperFeedback` — rename, drop, add fields

**Files:**
- Modify: `backend/django_Admin3/marking/models/marking_paper_feedback.py`
- Create: `backend/django_Admin3/marking/migrations/0014_feedback_field_changes.py`
- Modify: `backend/django_Admin3/marking/admin.py`
- Modify: `backend/django_Admin3/marking/admin_views.py`
- Modify: `backend/django_Admin3/marking/admin_serializers.py`
- Modify: `backend/django_Admin3/marking/tests/test_models.py`
- Modify: `backend/django_Admin3/marking/tests/test_admin_views.py`

- [ ] **Step 1: Update MarkingPaperFeedback model**

Replace the contents of `marking/models/marking_paper_feedback.py` with:

```python
"""MarkingPaperFeedback model — one feedback per grading."""
from django.db import models


class MarkingPaperFeedback(models.Model):
    RATING_CHOICES = [
        ('E', 'Excellent'),
        ('G', 'Good'),
        ('A', 'Average'),
        ('P', 'Poor'),
    ]

    grading = models.OneToOneField(
        'marking.MarkingPaperGrading',
        on_delete=models.CASCADE,
        related_name='feedback',
    )
    rating = models.CharField(
        max_length=1,
        choices=RATING_CHOICES,
        null=True,
        blank=True,
    )
    comments = models.TextField(blank=True, default='')
    feedback_date = models.DateTimeField()
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."marking_paper_feedbacks"'
        verbose_name = 'Marking Paper Feedback'
        verbose_name_plural = 'Marking Paper Feedbacks'

    def __str__(self):
        return f'Feedback({self.grading_id}) rating={self.rating or "—"}'
```

- [ ] **Step 2: Generate migration**

```
python manage.py makemigrations marking --name feedback_field_changes
```

Confirm migration contains:
- `RenameField('markingpaperfeedback', 'grade', 'rating')`
- `RenameField('markingpaperfeedback', 'submission_date', 'feedback_date')`
- `RemoveField('markingpaperfeedback', 'hub_download_date')`
- `AddField('markingpaperfeedback', 'is_active', ...)`

If Django emits `RemoveField`+`AddField` instead of `RenameField`, edit manually.

- [ ] **Step 3: Update admin/admin_views/admin_serializers**

Search for `grade` (feedback context) → `rating`. Search for `submission_date` (feedback context) → `feedback_date`. Search for `hub_download_date` (feedback context) → remove. Add `'is_active'`.

- [ ] **Step 4: Apply migration**

```
python manage.py migrate marking
```

- [ ] **Step 5: Update tests**

In `marking/tests/test_models.py` and `marking/tests/test_admin_views.py`, rename feedback-context `grade` → `rating`, `submission_date` → `feedback_date`. Remove `hub_download_date` arguments.

- [ ] **Step 6: Run all marking tests**

```
python manage.py test marking -v 2
```

- [ ] **Step 7: Commit**

```bash
git add marking/
git commit -m "refactor(marking): rename rating/feedback_date, add is_active to MarkingPaperFeedback"
```

---

## Phase B — `import_markers` Management Command

### Task B1: Date and CSV parsing helpers

**Files:**
- Create: `backend/django_Admin3/marking/services/__init__.py` (empty)
- Create: `backend/django_Admin3/marking/services/csv_imports/__init__.py` (empty)
- Create: `backend/django_Admin3/marking/services/csv_imports/date_parsing.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/tests/__init__.py` (empty)
- Create: `backend/django_Admin3/marking/services/csv_imports/tests/test_date_parsing.py`

- [ ] **Step 1: Write failing test**

Create `marking/services/csv_imports/tests/test_date_parsing.py`:

```python
from datetime import datetime
from zoneinfo import ZoneInfo
from django.test import TestCase

from marking.services.csv_imports.date_parsing import parse_date


class ParseDateTests(TestCase):
    def test_parse_valid_date(self):
        result = parse_date('10/04/2026')
        self.assertEqual(result, datetime(2026, 4, 10, tzinfo=ZoneInfo('Europe/London')))

    def test_parse_empty_returns_none(self):
        for empty in ['', ' ', '/  /', '   ']:
            self.assertIsNone(parse_date(empty), f'expected None for {empty!r}')

    def test_parse_none_input(self):
        self.assertIsNone(parse_date(None))

    def test_parse_invalid_format_raises(self):
        with self.assertRaises(ValueError):
            parse_date('2026-04-10')

    def test_dst_summer(self):
        # July is BST (UTC+1)
        result = parse_date('15/07/2026')
        self.assertEqual(result.tzinfo, ZoneInfo('Europe/London'))
        self.assertEqual(result.hour, 0)  # midnight local
```

- [ ] **Step 2: Run test (FAIL — module does not exist)**

```
python manage.py test marking.services.csv_imports.tests.test_date_parsing -v 2
```

- [ ] **Step 3: Create date_parsing.py**

Create `marking/services/csv_imports/date_parsing.py`:

```python
"""Date parsing helpers for legacy marking CSVs.

CSV dates use the DD/MM/YYYY format. Empty markers like '/  /' are
treated as None. Parsed datetimes are midnight Europe/London (per spec).
"""
from datetime import datetime
from zoneinfo import ZoneInfo


UK = ZoneInfo('Europe/London')
EMPTY_DATE_MARKER = '/  /'


def parse_date(value):
    """Parse DD/MM/YYYY to midnight Europe/London datetime, or None."""
    if value is None:
        return None
    stripped = value.strip()
    if stripped in ('', EMPTY_DATE_MARKER):
        return None
    naive = datetime.strptime(stripped, '%d/%m/%Y')
    return naive.replace(tzinfo=UK)
```

- [ ] **Step 4: Create empty package files**

Create empty files:
- `marking/services/__init__.py`
- `marking/services/csv_imports/__init__.py`
- `marking/services/csv_imports/tests/__init__.py`

- [ ] **Step 5: Run test (PASS)**

```
python manage.py test marking.services.csv_imports.tests.test_date_parsing -v 2
```

Expected: 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add marking/services/
git commit -m "feat(marking): add date parsing helper for CSV imports"
```

---

### Task B2: Markers CSV parsing and validation

**Files:**
- Create: `backend/django_Admin3/marking/services/csv_imports/markers.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/tests/test_markers.py`

- [ ] **Step 1: Write failing test for parse_markers_csv**

Create `marking/services/csv_imports/tests/test_markers.py`:

```python
import io
from django.contrib.auth.models import User
from django.test import TestCase

from marking.services.csv_imports.markers import (
    MarkerCsvRow,
    parse_markers_csv,
    validate_markers_rows,
)


class ParseMarkersCsvTests(TestCase):
    def test_parses_header_and_rows(self):
        content = (
            'mkref,firstname,lastname,initials\n'
            '38,David,Wilmot,DCW\n'
            '62,"Philip","Webb","PDW"\n'
        )
        rows = parse_markers_csv(io.StringIO(content))
        self.assertEqual(len(rows), 2)
        self.assertEqual(rows[0], MarkerCsvRow(
            row_num=2, mkref='38', firstname='David', lastname='Wilmot', initials='DCW',
        ))
        self.assertEqual(rows[1].firstname, 'Philip')

    def test_skips_blank_lines(self):
        content = (
            'mkref,firstname,lastname,initials\n'
            '\n'
            '1,A,B,AB\n'
        )
        rows = parse_markers_csv(io.StringIO(content))
        self.assertEqual(len(rows), 1)


class ValidateMarkersRowsTests(TestCase):
    def setUp(self):
        self.user_alice = User.objects.create_user(
            username='alice', first_name='Alice', last_name='Allen',
        )

    def test_valid_row_no_errors(self):
        row = MarkerCsvRow(row_num=2, mkref='10', firstname='Alice', lastname='Allen', initials='AA')
        errors, resolved = validate_markers_rows([row])
        self.assertEqual(errors, [])
        self.assertEqual(resolved[0].user_id, self.user_alice.id)
        self.assertEqual(resolved[0].mkref_int, 10)

    def test_zero_match_is_error(self):
        row = MarkerCsvRow(row_num=2, mkref='10', firstname='Bob', lastname='Brown', initials='BB')
        errors, resolved = validate_markers_rows([row])
        self.assertEqual(len(errors), 1)
        self.assertIn("No auth_user matches", errors[0].error_message)

    def test_ambiguous_match_is_error(self):
        User.objects.create_user(username='alice2', first_name='Alice', last_name='Allen')
        row = MarkerCsvRow(row_num=2, mkref='10', firstname='Alice', lastname='Allen', initials='AA')
        errors, resolved = validate_markers_rows([row])
        self.assertEqual(len(errors), 1)
        self.assertIn("Ambiguous match", errors[0].error_message)

    def test_non_integer_mkref_is_error(self):
        row = MarkerCsvRow(row_num=2, mkref='not-a-number', firstname='Alice', lastname='Allen', initials='AA')
        errors, resolved = validate_markers_rows([row])
        self.assertTrue(any('mkref' in e.error_message for e in errors))

    def test_initials_too_long_is_error(self):
        row = MarkerCsvRow(
            row_num=2, mkref='10', firstname='Alice', lastname='Allen',
            initials='X' * 11,
        )
        errors, resolved = validate_markers_rows([row])
        self.assertTrue(any('initials' in e.error_message for e in errors))
```

- [ ] **Step 2: Run test (FAIL — module does not exist)**

```
python manage.py test marking.services.csv_imports.tests.test_markers -v 2
```

- [ ] **Step 3: Implement parse_markers_csv and validate_markers_rows**

Create `marking/services/csv_imports/markers.py`:

```python
"""markers.csv parsing and validation."""
import csv
from dataclasses import dataclass
from typing import IO, List, Tuple

from django.contrib.auth.models import User


@dataclass
class MarkerCsvRow:
    row_num: int
    mkref: str
    firstname: str
    lastname: str
    initials: str


@dataclass
class MarkerError:
    row: MarkerCsvRow
    error_message: str


@dataclass
class ResolvedMarker:
    row: MarkerCsvRow
    user_id: int
    mkref_int: int
    initials: str


def parse_markers_csv(file_obj: IO) -> List[MarkerCsvRow]:
    """Parse markers.csv into a list of MarkerCsvRow."""
    reader = csv.DictReader(file_obj)
    rows: List[MarkerCsvRow] = []
    for index, raw in enumerate(reader, start=2):  # 2 because header is row 1
        if not any(raw.values()):
            continue
        rows.append(MarkerCsvRow(
            row_num=index,
            mkref=(raw.get('mkref') or '').strip(),
            firstname=(raw.get('firstname') or '').strip(),
            lastname=(raw.get('lastname') or '').strip(),
            initials=(raw.get('initials') or '').strip(),
        ))
    return rows


def validate_markers_rows(
    rows: List[MarkerCsvRow],
) -> Tuple[List[MarkerError], List[ResolvedMarker]]:
    """Validate every row; return (errors, resolved). Never stops on first error."""
    errors: List[MarkerError] = []
    resolved: List[ResolvedMarker] = []
    for row in rows:
        row_errors: List[str] = []

        try:
            mkref_int = int(row.mkref)
            if mkref_int <= 0:
                row_errors.append(f"mkref={row.mkref!r} must be a positive integer")
        except ValueError:
            row_errors.append(f"mkref={row.mkref!r} is not an integer")
            mkref_int = -1

        if not row.initials:
            row_errors.append('initials is empty')
        elif len(row.initials) > 10:
            row_errors.append(f"initials={row.initials!r} exceeds 10 characters")

        matches = User.objects.filter(
            first_name=row.firstname,
            last_name=row.lastname,
        )
        match_count = matches.count()
        user_id = None
        if match_count == 0:
            row_errors.append(
                f"No auth_user matches firstname={row.firstname!r} lastname={row.lastname!r}"
            )
        elif match_count > 1:
            row_errors.append(
                f"Ambiguous match: {match_count} auth_user rows have "
                f"firstname={row.firstname!r} lastname={row.lastname!r}"
            )
        else:
            user_id = matches.first().id

        if row_errors:
            errors.append(MarkerError(row=row, error_message='; '.join(row_errors)))
        else:
            resolved.append(ResolvedMarker(
                row=row, user_id=user_id, mkref_int=mkref_int, initials=row.initials,
            ))
    return errors, resolved
```

- [ ] **Step 4: Run test (PASS)**

```
python manage.py test marking.services.csv_imports.tests.test_markers -v 2
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add marking/services/csv_imports/markers.py marking/services/csv_imports/tests/test_markers.py
git commit -m "feat(marking): add markers.csv parser and validator"
```

---

### Task B3: Error CSV writer + import_markers command

**Files:**
- Create: `backend/django_Admin3/marking/services/csv_imports/error_report.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/tests/test_error_report.py`
- Create: `backend/django_Admin3/marking/management/commands/import_markers.py`
- Create: `backend/django_Admin3/marking/tests/test_import_markers_command.py`

- [ ] **Step 1: Write failing test for error CSV writer**

Create `marking/services/csv_imports/tests/test_error_report.py`:

```python
import io
from django.test import TestCase

from marking.services.csv_imports.error_report import write_markers_errors_csv
from marking.services.csv_imports.markers import MarkerCsvRow, MarkerError


class WriteMarkersErrorsCsvTests(TestCase):
    def test_writes_header_and_rows(self):
        row = MarkerCsvRow(row_num=5, mkref='38', firstname='David', lastname='Wilmot', initials='DCW')
        errors = [MarkerError(row=row, error_message='No auth_user matches')]
        out = io.StringIO()
        write_markers_errors_csv(errors, out)
        text = out.getvalue()
        self.assertIn('row_num,mkref,firstname,lastname,initials,error_message', text)
        self.assertIn('5,38,David,Wilmot,DCW,No auth_user matches', text)
```

- [ ] **Step 2: Run test (FAIL)**

```
python manage.py test marking.services.csv_imports.tests.test_error_report -v 2
```

- [ ] **Step 3: Implement error_report.py**

Create `marking/services/csv_imports/error_report.py`:

```python
"""CSV error report writers for marking imports."""
import csv
from typing import IO, List

from .markers import MarkerError


def write_markers_errors_csv(errors: List[MarkerError], file_obj: IO) -> None:
    writer = csv.writer(file_obj)
    writer.writerow(['row_num', 'mkref', 'firstname', 'lastname', 'initials', 'error_message'])
    for err in errors:
        writer.writerow([
            err.row.row_num,
            err.row.mkref,
            err.row.firstname,
            err.row.lastname,
            err.row.initials,
            err.error_message,
        ])
```

- [ ] **Step 4: Run test (PASS)**

```
python manage.py test marking.services.csv_imports.tests.test_error_report -v 2
```

- [ ] **Step 5: Write failing integration test for the import_markers command**

Create `marking/tests/test_import_markers_command.py`:

```python
import os
import tempfile
from io import StringIO

from django.contrib.auth.models import User
from django.core.management import CommandError, call_command
from django.test import TestCase

from marking.models import Marker


class ImportMarkersCommandTests(TestCase):
    def setUp(self):
        self.user_alice = User.objects.create_user(
            username='alice', first_name='Alice', last_name='Allen',
        )
        self.user_bob = User.objects.create_user(
            username='bob', first_name='Bob', last_name='Brown',
        )

    def _write_csv(self, content):
        f = tempfile.NamedTemporaryFile(
            mode='w', suffix='.csv', delete=False, newline='',
        )
        f.write(content)
        f.close()
        self.addCleanup(os.unlink, f.name)
        return f.name

    def test_imports_valid_rows(self):
        path = self._write_csv(
            'mkref,firstname,lastname,initials\n'
            '38,Alice,Allen,AA\n'
            '62,Bob,Brown,BB\n'
        )
        out = StringIO()
        call_command('import_markers', '--csv-path', path, stdout=out)
        self.assertEqual(Marker.objects.count(), 2)
        self.assertEqual(
            Marker.objects.get(legacy_id=38).user_id,
            self.user_alice.id,
        )

    def test_aborts_when_marker_table_non_empty(self):
        Marker.objects.create(user=self.user_alice, initial='AA', legacy_id=1)
        path = self._write_csv('mkref,firstname,lastname,initials\n38,Bob,Brown,BB\n')
        with self.assertRaises(CommandError) as ctx:
            call_command('import_markers', '--csv-path', path, stderr=StringIO())
        self.assertIn('not empty', str(ctx.exception).lower())

    def test_writes_error_report_and_does_not_import(self):
        path = self._write_csv(
            'mkref,firstname,lastname,initials\n'
            '1,Nobody,Here,XX\n'
        )
        errors_path = path + '.errors.csv'
        with self.assertRaises(CommandError):
            call_command(
                'import_markers',
                '--csv-path', path,
                '--errors-path', errors_path,
                stderr=StringIO(),
            )
        self.assertEqual(Marker.objects.count(), 0)
        with open(errors_path) as f:
            text = f.read()
        self.assertIn('No auth_user matches', text)
        os.unlink(errors_path)

    def test_dry_run_does_not_import(self):
        path = self._write_csv(
            'mkref,firstname,lastname,initials\n'
            '38,Alice,Allen,AA\n'
        )
        out = StringIO()
        call_command('import_markers', '--csv-path', path, '--dry-run', stdout=out)
        self.assertEqual(Marker.objects.count(), 0)
```

- [ ] **Step 6: Run test (FAIL — command does not exist)**

```
python manage.py test marking.tests.test_import_markers_command -v 2
```

- [ ] **Step 7: Implement the command**

Create `marking/management/commands/import_markers.py`:

```python
"""Management command — import markers from legacy CSV.

Workflow:
  1. Pre-check: target Marker table must be empty.
  2. Parse markers.csv.
  3. Validate every row (collect all errors).
  4. If errors → write error CSV, abort.
  5. Else (and not --dry-run) → atomic create.
"""
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from marking.models import Marker
from marking.services.csv_imports.error_report import write_markers_errors_csv
from marking.services.csv_imports.markers import (
    parse_markers_csv,
    validate_markers_rows,
)


class Command(BaseCommand):
    help = 'Import markers from legacy markers.csv.'

    def add_arguments(self, parser):
        parser.add_argument('--csv-path', required=True, help='Path to markers.csv')
        parser.add_argument(
            '--errors-path',
            default='markers_errors.csv',
            help='Where to write the error report (default: markers_errors.csv)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Validate only; never write to DB.',
        )

    def handle(self, *args, **options):
        if Marker.objects.exists():
            raise CommandError(
                'Aborting: marking.markers table is not empty. '
                'Truncate before re-running.'
            )

        with open(options['csv_path'], encoding='utf-8') as f:
            rows = parse_markers_csv(f)

        if not rows:
            self.stdout.write(self.style.WARNING('No data rows found in CSV.'))
            return

        errors, resolved = validate_markers_rows(rows)

        if errors:
            with open(options['errors_path'], 'w', encoding='utf-8', newline='') as f:
                write_markers_errors_csv(errors, f)
            self.stderr.write(self.style.ERROR(
                f'{len(errors)} validation error(s) — see {options["errors_path"]}'
            ))
            raise CommandError('Validation failed.')

        if options['dry_run']:
            self.stdout.write(self.style.SUCCESS(
                f'Dry-run OK: {len(resolved)} markers would be imported.'
            ))
            return

        with transaction.atomic():
            for r in resolved:
                Marker.objects.create(
                    user_id=r.user_id,
                    initial=r.initials,
                    legacy_id=r.mkref_int,
                )

        self.stdout.write(self.style.SUCCESS(
            f'Imported {len(resolved)} markers.'
        ))
```

- [ ] **Step 8: Run all import_markers tests (PASS)**

```
python manage.py test marking.tests.test_import_markers_command marking.services.csv_imports.tests.test_error_report -v 2
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add marking/management/commands/import_markers.py marking/services/csv_imports/error_report.py marking/services/csv_imports/tests/test_error_report.py marking/tests/test_import_markers_command.py
git commit -m "feat(marking): add import_markers management command"
```

---

## Phase C — `import_marks26` Management Command

### Task C1: marks26 row dataclass and CSV parser

**Files:**
- Create: `backend/django_Admin3/marking/services/csv_imports/marks26_parsing.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/tests/test_marks26_parsing.py`

- [ ] **Step 1: Write failing test**

Create `marking/services/csv_imports/tests/test_marks26_parsing.py`:

```python
import io
from django.test import TestCase

from marking.services.csv_imports.marks26_parsing import (
    Marks26Row,
    parse_marks26_csv,
)


class ParseMarks26CsvTests(TestCase):
    HEADER = (
        'ref,subject,assign,abbrev,sequence,datelogged,datein,dateout,'
        'adjust,adjustrec,turnround,turnround2,score,grade,marker,rating,'
        'fee,voucher,warnings,status,order,xsolutions,realdatein,expiry,'
        'c_code,tmprated,rated,recvtype,stafflogin,staffalloc,staffret,'
        'fee_cat,hubdownld,hubout,hubfeedbk,hubonhold,hubhide,comments\n'
    )

    def test_parses_voucher_row(self):
        content = self.HEADER + (
            '71546,*,*/MV/22,*,0,/  /,/  /,/  /,0,0,0,0,0, ,, ,0,'
            '7329562,,,1490175,,/  /,08/10/2025,GB,F,F, ,,,,0,/  /,'
            '/  /,/  /,/  /,/  /,\n'
        )
        rows = parse_marks26_csv(io.StringIO(content))
        self.assertEqual(len(rows), 1)
        r = rows[0]
        self.assertEqual(r.row_num, 2)
        self.assertEqual(r.ref, '71546')
        self.assertEqual(r.subject, '*')
        self.assertEqual(r.assign, '*/MV/22')
        self.assertTrue(r.is_voucher_row())
        self.assertFalse(r.is_voucher_row_redeemed())

    def test_parses_redeemed_voucher_row(self):
        content = self.HEADER + (
            '79244,CP1,*/MV/22S,M2,1,10/04/2026,10/04/2026,13/04/2026,0,0,1,1,'
            '73,A,LAR, ,58,7401908,,,1903896,,10/04/2026,28/04/2026,GB,F,F, ,,'
            'CSX,,0,10/04/2026,14/04/2026,/  /,/  /,/  /,\n'
        )
        rows = parse_marks26_csv(io.StringIO(content))
        r = rows[0]
        self.assertEqual(r.subject, 'CP1')
        self.assertTrue(r.is_voucher_row())
        self.assertTrue(r.is_voucher_row_redeemed())

    def test_parses_non_voucher_row(self):
        content = self.HEADER + (
            '82730,CP1,CP1/MX/26,X,1,/  /,/  /,/  /,0,0,0,0,0, ,, ,0,0,,,'
            '1848940,,/  /,16/09/2029,GB,T,F, ,,,,0,/  /,/  /,/  /,/  /,/  /,\n'
        )
        rows = parse_marks26_csv(io.StringIO(content))
        r = rows[0]
        self.assertEqual(r.assign, 'CP1/MX/26')
        self.assertFalse(r.is_voucher_row())

    def test_skips_blank_lines(self):
        content = self.HEADER + '\n'
        rows = parse_marks26_csv(io.StringIO(content))
        self.assertEqual(rows, [])
```

- [ ] **Step 2: Run test (FAIL)**

```
python manage.py test marking.services.csv_imports.tests.test_marks26_parsing -v 2
```

- [ ] **Step 3: Implement Marks26Row and parser**

Create `marking/services/csv_imports/marks26_parsing.py`:

```python
"""marks26.csv parsing — produces typed row objects."""
import csv
from dataclasses import dataclass
from typing import IO, List

from .date_parsing import EMPTY_DATE_MARKER


VOUCHER_ASSIGN_PREFIX = '*/MV/'


@dataclass
class Marks26Row:
    row_num: int
    ref: str
    subject: str
    assign: str
    abbrev: str
    sequence: str
    datelogged: str
    dateout: str
    score: str
    grade: str
    marker: str
    rating: str
    voucher: str
    order: str
    realdatein: str
    expiry: str
    staffalloc: str
    hubdownld: str
    hubout: str
    hubfeedbk: str
    comments: str

    def is_voucher_row(self) -> bool:
        return self.assign.startswith(VOUCHER_ASSIGN_PREFIX)

    def is_voucher_row_redeemed(self) -> bool:
        return self.is_voucher_row() and self.has_valid_datelogged()

    def has_valid_datelogged(self) -> bool:
        return self.datelogged.strip() not in ('', EMPTY_DATE_MARKER)

    def has_valid_dateout(self) -> bool:
        return self.dateout.strip() not in ('', EMPTY_DATE_MARKER)

    def has_valid_hubfeedbk(self) -> bool:
        return self.hubfeedbk.strip() not in ('', EMPTY_DATE_MARKER)

    def paper_name(self) -> str:
        """Construct MarkingPaper.name lookup key from abbrev + sequence."""
        return f"{self.abbrev}-{self.sequence}"


def parse_marks26_csv(file_obj: IO) -> List[Marks26Row]:
    reader = csv.DictReader(file_obj)
    rows: List[Marks26Row] = []
    for index, raw in enumerate(reader, start=2):
        if not any((v or '').strip() for v in raw.values()):
            continue
        rows.append(Marks26Row(
            row_num=index,
            ref=(raw.get('ref') or '').strip(),
            subject=(raw.get('subject') or '').strip(),
            assign=(raw.get('assign') or '').strip(),
            abbrev=(raw.get('abbrev') or '').strip(),
            sequence=(raw.get('sequence') or '').strip(),
            datelogged=raw.get('datelogged') or '',
            dateout=raw.get('dateout') or '',
            score=(raw.get('score') or '').strip(),
            grade=(raw.get('grade') or '').strip(),
            marker=(raw.get('marker') or '').strip(),
            rating=(raw.get('rating') or '').strip(),
            voucher=(raw.get('voucher') or '').strip(),
            order=(raw.get('order') or '').strip(),
            realdatein=raw.get('realdatein') or '',
            expiry=(raw.get('expiry') or '').strip(),
            staffalloc=(raw.get('staffalloc') or '').strip(),
            hubdownld=raw.get('hubdownld') or '',
            hubout=raw.get('hubout') or '',
            hubfeedbk=raw.get('hubfeedbk') or '',
            comments=(raw.get('comments') or '').strip(),
        ))
    return rows
```

- [ ] **Step 4: Run test (PASS)**

```
python manage.py test marking.services.csv_imports.tests.test_marks26_parsing -v 2
```

- [ ] **Step 5: Commit**

```bash
git add marking/services/csv_imports/marks26_parsing.py marking/services/csv_imports/tests/test_marks26_parsing.py
git commit -m "feat(marking): add marks26.csv row parser"
```

---

### Task C2: marks26 lookup-dict builders

**Files:**
- Create: `backend/django_Admin3/marking/services/csv_imports/marks26_lookups.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/tests/test_marks26_lookups.py`

- [ ] **Step 1: Write failing test**

Create `marking/services/csv_imports/tests/test_marks26_lookups.py`:

```python
from datetime import timedelta
from django.contrib.auth.models import User
from django.utils import timezone

from marking.tests.fixtures import MarkingChainTestCase
from marking.models import Marker
from marking.services.csv_imports.marks26_lookups import build_lookups
from marking_vouchers.models import IssuedVoucher
from orders.models import Order
from orders.models.order_item import OrderItem
from staff.models import Staff
from store.models import Purchasable


class BuildLookupsTests(MarkingChainTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.mv_purchasable = Purchasable.objects.create(
            kind='marking_voucher', code='MV', name='Marking Voucher',
        )

        # Marker
        marker_user = User.objects.create_user(
            username='marker_a', first_name='M', last_name='A',
        )
        cls.marker = Marker.objects.create(user=marker_user, initial='LAR')

        # Staff
        staff_user = User.objects.create_user(
            username='staff_a', first_name='S', last_name='A',
        )
        cls.staff = Staff.objects.create(user=staff_user, initials='SXC')

        # Order + OrderItem (for voucher)
        cls.order = Order.objects.create(user=cls.student_user, order_date=timezone.now())
        cls.voucher_oi = OrderItem.objects.create(
            order=cls.order,
            purchasable=cls.mv_purchasable,
            quantity=1,
            metadata={'orderno': '1903896'},
        )
        # OrderItem for direct (non-voucher) row
        cls.direct_oi = OrderItem.objects.create(
            order=cls.order,
            purchasable=cls.store_product,  # store.Product
            quantity=1,
            metadata={'orderno': '1848940'},
        )

        cls.iv = IssuedVoucher.objects.create(
            voucher_code='7401908',
            order_item=cls.voucher_oi,
            purchasable=cls.mv_purchasable,
            expires_at=timezone.now() + timedelta(days=30),
        )

    def test_lookups_keyed_correctly(self):
        lookups = build_lookups()
        self.assertIn(self.student.student_ref, lookups.students)
        self.assertEqual(lookups.markers['LAR'].pk, self.marker.pk)
        self.assertEqual(lookups.staff['SXC'].pk, self.staff.pk)
        self.assertEqual(lookups.products[self.store_product.product_code].pk, self.store_product.pk)
        self.assertEqual(
            lookups.papers[(self.subject.code, self.paper.name)].pk,
            self.paper.pk,
        )
        self.assertEqual(lookups.issued_vouchers['7401908'].pk, self.iv.pk)
        self.assertEqual(lookups.mv_purchasable.pk, self.mv_purchasable.pk)

    def test_order_items_keyed_by_orderno_and_purchasable(self):
        lookups = build_lookups()
        # Voucher row: lookup by (orderno, 'MV')
        oi = lookups.order_items[('1903896', 'MV')]
        self.assertEqual(oi.pk, self.voucher_oi.pk)

        # Direct row: lookup by (orderno, product_code)
        oi = lookups.order_items[('1848940', self.store_product.product_code)]
        self.assertEqual(oi.pk, self.direct_oi.pk)
```

- [ ] **Step 2: Run test (FAIL)**

```
python manage.py test marking.services.csv_imports.tests.test_marks26_lookups -v 2
```

- [ ] **Step 3: Implement build_lookups**

Create `marking/services/csv_imports/marks26_lookups.py`:

```python
"""Pre-load lookup dicts for the marks26 import.

Eager-loads every Student, Marker, Staff, Product, MarkingPaper,
IssuedVoucher, and OrderItem we will reference. This avoids per-row
queries during the (~19,800 row) import pass.
"""
from dataclasses import dataclass, field
from typing import Dict, Tuple

from django.db.models import Prefetch

from marking.models import Marker, MarkingPaper
from marking_vouchers.models import IssuedVoucher
from orders.models.order_item import OrderItem
from staff.models import Staff
from store.models import Product as StoreProduct, Purchasable
from students.models import Student


@dataclass
class Marks26Lookups:
    students: Dict[int, Student] = field(default_factory=dict)
    markers: Dict[str, Marker] = field(default_factory=dict)
    staff: Dict[str, Staff] = field(default_factory=dict)
    products: Dict[str, StoreProduct] = field(default_factory=dict)
    papers: Dict[Tuple[str, str], MarkingPaper] = field(default_factory=dict)
    issued_vouchers: Dict[str, IssuedVoucher] = field(default_factory=dict)
    order_items: Dict[Tuple[str, str], OrderItem] = field(default_factory=dict)
    mv_purchasable: Purchasable = None


def build_lookups() -> Marks26Lookups:
    lookups = Marks26Lookups()

    lookups.students = {
        s.student_ref: s for s in Student.objects.all().select_related('user')
    }
    lookups.markers = {
        m.initial: m for m in Marker.objects.all() if m.initial
    }
    lookups.staff = {
        s.initials: s for s in Staff.objects.all() if s.initials
    }
    lookups.products = {
        p.product_code: p
        for p in StoreProduct.objects.all().select_related(
            'exam_session_subject__subject'
        )
        if p.product_code
    }
    lookups.papers = {
        (p.purchasable.product.exam_session_subject.subject.code, p.name): p
        for p in MarkingPaper.objects.filter(is_active=True).select_related(
            'purchasable__product__exam_session_subject__subject'
        )
        if hasattr(p.purchasable, 'product')
    }
    lookups.issued_vouchers = {
        iv.voucher_code: iv for iv in IssuedVoucher.objects.all()
    }
    lookups.order_items = {
        (str(oi.metadata.get('orderno', '')), oi.purchasable.code): oi
        for oi in OrderItem.objects.all().select_related('order', 'purchasable')
        if oi.metadata and oi.metadata.get('orderno')
    }
    lookups.mv_purchasable = Purchasable.objects.filter(code='MV').first()

    return lookups
```

- [ ] **Step 4: Run test (PASS)**

```
python manage.py test marking.services.csv_imports.tests.test_marks26_lookups -v 2
```

- [ ] **Step 5: Commit**

```bash
git add marking/services/csv_imports/marks26_lookups.py marking/services/csv_imports/tests/test_marks26_lookups.py
git commit -m "feat(marking): add lookup-dict builder for marks26 import"
```

---

### Task C3: marks26 row validators + pre-flight checks

**Files:**
- Create: `backend/django_Admin3/marking/services/csv_imports/marks26_validators.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/tests/test_marks26_validators.py`

- [ ] **Step 1: Write failing test**

Create `marking/services/csv_imports/tests/test_marks26_validators.py`:

```python
from marking.tests.fixtures import MarkingChainTestCase
from marking.services.csv_imports.marks26_lookups import build_lookups
from marking.services.csv_imports.marks26_parsing import Marks26Row
from marking.services.csv_imports.marks26_validators import (
    PreflightError,
    preflight_checks,
    validate_marks26_row,
)


def make_row(**overrides) -> Marks26Row:
    base = dict(
        row_num=2, ref='', subject='*', assign='', abbrev='*', sequence='0',
        datelogged='/  /', dateout='/  /', score='', grade='', marker='',
        rating='', voucher='0', order='', realdatein='/  /', expiry='/  /',
        staffalloc='', hubdownld='/  /', hubout='/  /', hubfeedbk='/  /',
        comments='',
    )
    base.update(overrides)
    return Marks26Row(**base)


class PreflightChecksTests(MarkingChainTestCase):
    def test_missing_mv_purchasable_is_error(self):
        # No 'MV' Purchasable created → preflight fails
        lookups = build_lookups()
        row = make_row(assign='*/MV/22', voucher='1', order='42', expiry='01/01/2030')
        errors = preflight_checks([row], lookups)
        self.assertTrue(any('MV' in e for e in errors))

    def test_missing_staff_initials_is_error(self):
        from store.models import Purchasable
        Purchasable.objects.create(kind='marking_voucher', code='MV', name='MV')
        lookups = build_lookups()
        row = make_row(
            ref=str(self.student.student_ref),
            subject='FIX', assign='FIX01/MX/26', abbrev='FixPaper',
            sequence='1', datelogged='10/04/2026', dateout='13/04/2026',
            staffalloc='ZZZ', marker='AAA', order='99',
        )
        errors = preflight_checks([row], lookups)
        self.assertTrue(any("Staff.initials missing: 'ZZZ'" in e for e in errors))


class ValidateMarks26RowTests(MarkingChainTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        from store.models import Purchasable
        cls.mv = Purchasable.objects.create(
            kind='marking_voucher', code='MV', name='MV',
        )

    def test_voucher_row_valid_no_redemption(self):
        from orders.models import Order
        from orders.models.order_item import OrderItem
        from django.utils import timezone
        order = Order.objects.create(user=self.student_user, order_date=timezone.now())
        OrderItem.objects.create(
            order=order, purchasable=self.mv, quantity=1,
            metadata={'orderno': '1490175'},
        )
        lookups = build_lookups()
        row = make_row(
            ref=str(self.student.student_ref),
            assign='*/MV/22', voucher='123', order='1490175',
            expiry='08/10/2025',
        )
        errors = validate_marks26_row(row, lookups)
        self.assertEqual(errors, [])

    def test_unknown_student_ref_is_error(self):
        lookups = build_lookups()
        row = make_row(ref='99999', assign='*/MV/22', voucher='1', order='1', expiry='01/01/2030')
        errors = validate_marks26_row(row, lookups)
        self.assertTrue(any('student_ref' in e.error_message for e in errors))

    def test_orphan_grading_is_error(self):
        lookups = build_lookups()
        row = make_row(
            ref=str(self.student.student_ref),
            subject='FIX', assign='FIX01/MX/26', abbrev='FixPaper', sequence='1',
            datelogged='/  /',  # invalid
            dateout='10/04/2026',  # but dateout is valid → orphan grading
            staffalloc='AA', marker='MM', order='1',
        )
        errors = validate_marks26_row(row, lookups)
        self.assertTrue(any('orphan grading' in e.error_message.lower() for e in errors))

    def test_orphan_feedback_is_error(self):
        lookups = build_lookups()
        row = make_row(
            ref=str(self.student.student_ref),
            subject='FIX', assign='FIX01/MX/26', abbrev='FixPaper', sequence='1',
            datelogged='10/04/2026', dateout='/  /',
            hubfeedbk='15/04/2026',  # feedback without grading
            order='1',
        )
        errors = validate_marks26_row(row, lookups)
        self.assertTrue(any('orphan feedback' in e.error_message.lower() for e in errors))

    def test_invalid_grade_is_error(self):
        lookups = build_lookups()
        row = make_row(
            ref=str(self.student.student_ref),
            subject='FIX', assign='FIX01/MX/26', abbrev='FixPaper', sequence='1',
            datelogged='10/04/2026', dateout='13/04/2026',
            staffalloc='AA', marker='MM', grade='Z',  # invalid
            order='1',
        )
        errors = validate_marks26_row(row, lookups)
        self.assertTrue(any('grade' in e.error_message for e in errors))

    def test_invalid_rating_is_error(self):
        lookups = build_lookups()
        row = make_row(
            ref=str(self.student.student_ref),
            subject='FIX', assign='FIX01/MX/26', abbrev='FixPaper', sequence='1',
            datelogged='10/04/2026', dateout='13/04/2026',
            staffalloc='AA', marker='MM',
            hubfeedbk='15/04/2026', rating='Z',  # invalid
            order='1',
        )
        errors = validate_marks26_row(row, lookups)
        self.assertTrue(any('rating' in e.error_message for e in errors))
```

- [ ] **Step 2: Run test (FAIL)**

```
python manage.py test marking.services.csv_imports.tests.test_marks26_validators -v 2
```

- [ ] **Step 3: Implement validators**

Create `marking/services/csv_imports/marks26_validators.py`:

```python
"""Pre-flight and per-row validators for the marks26 import."""
from dataclasses import dataclass
from typing import List

from .date_parsing import parse_date
from .marks26_lookups import Marks26Lookups
from .marks26_parsing import Marks26Row


VALID_GRADES = {'A', 'B', 'C', 'D'}
VALID_RATINGS = {'E', 'G', 'A', 'P'}


class PreflightError(Exception):
    pass


@dataclass
class Marks26Error:
    row: Marks26Row
    error_field: str
    error_message: str


def preflight_checks(
    rows: List[Marks26Row],
    lookups: Marks26Lookups,
) -> List[str]:
    """Return a list of error messages; empty list = OK."""
    errors: List[str] = []

    if lookups.mv_purchasable is None:
        errors.append("Required Purchasable with code='MV' does not exist.")

    needed_staff_initials = {
        r.staffalloc for r in rows if r.has_valid_dateout() and r.staffalloc
    }
    missing_staff = needed_staff_initials - set(lookups.staff.keys())
    for ini in sorted(missing_staff):
        errors.append(f"Staff.initials missing: {ini!r}")

    needed_marker_initials = {
        r.marker for r in rows if r.has_valid_dateout() and r.marker
    }
    missing_markers = needed_marker_initials - set(lookups.markers.keys())
    for ini in sorted(missing_markers):
        errors.append(f"Marker.initial missing: {ini!r}")

    return errors


def validate_marks26_row(
    row: Marks26Row,
    lookups: Marks26Lookups,
) -> List[Marks26Error]:
    """Validate a single row; return error list (possibly empty)."""
    errors: List[Marks26Error] = []

    def err(field: str, msg: str) -> None:
        errors.append(Marks26Error(row=row, error_field=field, error_message=msg))

    # ref → Student.student_ref
    try:
        ref_int = int(row.ref)
        if ref_int not in lookups.students:
            err('ref', f"student_ref={ref_int} not found")
    except ValueError:
        err('ref', f"ref={row.ref!r} is not an integer")

    if row.is_voucher_row():
        # voucher_code, order, expiry required
        if not row.voucher or row.voucher == '0':
            err('voucher', f"voucher row must have a voucher code; got {row.voucher!r}")
        try:
            parse_date(row.expiry)
        except ValueError as e:
            err('expiry', f"expiry not parseable: {e}")
        oi = lookups.order_items.get((row.order, 'MV'))
        if oi is None:
            err('order', f"no OrderItem with orderno={row.order!r} and purchasable.code='MV'")

        if row.has_valid_datelogged():
            paper = lookups.papers.get((row.subject, row.paper_name()))
            if paper is None:
                err(
                    'marking_paper',
                    f"no MarkingPaper for subject={row.subject!r} name={row.paper_name()!r}",
                )
    else:
        # Non-voucher row — assign should match a Product code
        product = lookups.products.get(row.assign)
        if product is None:
            err('assign', f"assign={row.assign!r} not found in products.product_code")
        else:
            paper = lookups.papers.get((row.subject, row.paper_name()))
            if paper is None:
                err(
                    'marking_paper',
                    f"no MarkingPaper for subject={row.subject!r} name={row.paper_name()!r}",
                )
            oi = lookups.order_items.get((row.order, row.assign))
            if oi is None:
                err(
                    'order',
                    f"no OrderItem with orderno={row.order!r} and purchasable.code={row.assign!r}",
                )

    if row.has_valid_datelogged():
        try:
            parse_date(row.realdatein)
        except ValueError as e:
            err('realdatein', f"realdatein not parseable: {e}")

    if row.has_valid_dateout():
        if not row.has_valid_datelogged():
            err('datelogged', 'orphan grading: dateout is valid but datelogged is not')
        if not row.staffalloc:
            err('staffalloc', 'staffalloc is empty but dateout is valid')
        elif row.staffalloc not in lookups.staff:
            err('staffalloc', f"staffalloc={row.staffalloc!r} not in Staff.initials")
        if not row.marker:
            err('marker', 'marker is empty but dateout is valid')
        elif row.marker not in lookups.markers:
            err('marker', f"marker={row.marker!r} not in Marker.initial")
        if row.score:
            try:
                int(row.score)
            except ValueError:
                err('score', f"score={row.score!r} is not an integer")
        if row.grade and row.grade not in VALID_GRADES:
            err('grade', f"grade={row.grade!r} not in {{A,B,C,D}}")

    if row.has_valid_hubfeedbk():
        if not row.has_valid_dateout():
            err('hubfeedbk', 'orphan feedback: hubfeedbk is valid but dateout is not')
        if row.rating and row.rating not in VALID_RATINGS:
            err('rating', f"rating={row.rating!r} not in {{E,G,A,P}}")

    return errors
```

- [ ] **Step 4: Run test (PASS)**

```
python manage.py test marking.services.csv_imports.tests.test_marks26_validators -v 2
```

Expected: all tests pass. (Note: some tests reference `FixPaper` as the paper name, matching what `MarkingChainTestCase` creates. Run-and-fix any drift.)

- [ ] **Step 5: Commit**

```bash
git add marking/services/csv_imports/marks26_validators.py marking/services/csv_imports/tests/test_marks26_validators.py
git commit -m "feat(marking): add row validators and preflight checks for marks26"
```

---

### Task C4: Error CSV writer for marks26

**Files:**
- Modify: `backend/django_Admin3/marking/services/csv_imports/error_report.py`
- Modify: `backend/django_Admin3/marking/services/csv_imports/tests/test_error_report.py`

- [ ] **Step 1: Add failing test for marks26 error CSV**

Append to `marking/services/csv_imports/tests/test_error_report.py`:

```python
from marking.services.csv_imports.error_report import write_marks26_errors_csv
from marking.services.csv_imports.marks26_parsing import Marks26Row
from marking.services.csv_imports.marks26_validators import Marks26Error


class WriteMarks26ErrorsCsvTests(TestCase):
    def test_writes_header_and_rows(self):
        row = Marks26Row(
            row_num=57, ref='76138', subject='CP3', assign='*/MV/22', abbrev='M2',
            sequence='1', datelogged='', dateout='', score='', grade='',
            marker='', rating='', voucher='', order='', realdatein='', expiry='',
            staffalloc='', hubdownld='', hubout='', hubfeedbk='', comments='',
        )
        errors = [Marks26Error(row=row, error_field='marker', error_message='not found')]
        out = io.StringIO()
        write_marks26_errors_csv(errors, out)
        text = out.getvalue()
        self.assertIn(
            'row_num,ref,subject,assign,abbrev,sequence,error_field,error_message',
            text,
        )
        self.assertIn('57,76138,CP3,*/MV/22,M2,1,marker,not found', text)
```

- [ ] **Step 2: Run test (FAIL)**

```
python manage.py test marking.services.csv_imports.tests.test_error_report -v 2
```

- [ ] **Step 3: Add write_marks26_errors_csv**

Append to `marking/services/csv_imports/error_report.py`:

```python
from .marks26_validators import Marks26Error


def write_marks26_errors_csv(errors: List[Marks26Error], file_obj: IO) -> None:
    writer = csv.writer(file_obj)
    writer.writerow([
        'row_num', 'ref', 'subject', 'assign', 'abbrev', 'sequence',
        'error_field', 'error_message',
    ])
    for err in errors:
        writer.writerow([
            err.row.row_num,
            err.row.ref,
            err.row.subject,
            err.row.assign,
            err.row.abbrev,
            err.row.sequence,
            err.error_field,
            err.error_message,
        ])
```

- [ ] **Step 4: Run test (PASS)**

```
python manage.py test marking.services.csv_imports.tests.test_error_report -v 2
```

- [ ] **Step 5: Commit**

```bash
git add marking/services/csv_imports/error_report.py marking/services/csv_imports/tests/test_error_report.py
git commit -m "feat(marking): add error CSV writer for marks26"
```

---

### Task C5: marks26 import steps a-d

**Files:**
- Create: `backend/django_Admin3/marking/services/csv_imports/marks26_steps.py`
- Create: `backend/django_Admin3/marking/services/csv_imports/tests/test_marks26_steps.py`

- [ ] **Step 1: Write failing test**

Create `marking/services/csv_imports/tests/test_marks26_steps.py`:

```python
from datetime import timedelta
from django.contrib.auth.models import User
from django.utils import timezone

from marking.tests.fixtures import MarkingChainTestCase
from marking.models import (
    Marker, MarkingPaperFeedback, MarkingPaperGrading, MarkingPaperSubmission,
)
from marking.services.csv_imports.marks26_lookups import build_lookups
from marking.services.csv_imports.marks26_parsing import Marks26Row
from marking.services.csv_imports.marks26_steps import run_import_steps
from marking_vouchers.models import IssuedVoucher, RedeemedVoucher
from orders.models import Order
from orders.models.order_item import OrderItem
from staff.models import Staff
from store.models import Purchasable


def make_row(**kw):
    base = dict(
        row_num=2, ref='', subject='*', assign='', abbrev='*', sequence='0',
        datelogged='/  /', dateout='/  /', score='', grade='', marker='',
        rating='', voucher='0', order='', realdatein='/  /', expiry='/  /',
        staffalloc='', hubdownld='/  /', hubout='/  /', hubfeedbk='/  /',
        comments='',
    )
    base.update(kw)
    return Marks26Row(**base)


class RunImportStepsTests(MarkingChainTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        cls.mv = Purchasable.objects.create(
            kind='marking_voucher', code='MV', name='Marking Voucher',
        )

        marker_user = User.objects.create_user(
            username='m1', first_name='Marker', last_name='One',
        )
        cls.marker = Marker.objects.create(user=marker_user, initial='LAR')

        staff_user = User.objects.create_user(
            username='s1', first_name='Staff', last_name='One',
        )
        cls.staff = Staff.objects.create(user=staff_user, initials='SXC')

        cls.order = Order.objects.create(user=cls.student_user, order_date=timezone.now())
        cls.voucher_oi = OrderItem.objects.create(
            order=cls.order, purchasable=cls.mv, quantity=1,
            metadata={'orderno': '1903896'},
        )
        cls.direct_oi = OrderItem.objects.create(
            order=cls.order, purchasable=cls.store_product, quantity=1,
            metadata={'orderno': '1848940'},
        )
        # Update fixture paper.name to match abbrev-sequence convention
        cls.paper.name = 'X-1'
        cls.paper.save()

    def test_voucher_unredeemed_creates_only_iv(self):
        rows = [make_row(
            ref=str(self.student.student_ref),
            assign='*/MV/22', voucher='V1', order='1903896',
            expiry='08/10/2030',
        )]
        run_import_steps(rows, build_lookups())
        self.assertEqual(IssuedVoucher.objects.count(), 1)
        self.assertEqual(RedeemedVoucher.objects.count(), 0)
        self.assertEqual(MarkingPaperSubmission.objects.count(), 0)

    def test_voucher_redeemed_creates_iv_rv_submission(self):
        rows = [make_row(
            ref=str(self.student.student_ref),
            subject=self.subject.code,
            assign='*/MV/22S', abbrev='X', sequence='1',
            voucher='V2', order='1903896',
            expiry='08/10/2030',
            datelogged='10/04/2026', realdatein='10/04/2026',
        )]
        run_import_steps(rows, build_lookups())
        self.assertEqual(IssuedVoucher.objects.count(), 1)
        iv = IssuedVoucher.objects.get()
        self.assertEqual(iv.status, 'redeemed')
        self.assertIsNotNone(iv.redeemed_at)
        self.assertEqual(RedeemedVoucher.objects.count(), 1)
        sub = MarkingPaperSubmission.objects.get()
        self.assertEqual(sub.student_id, self.student.student_ref)
        self.assertIsNotNone(sub.redeemed_voucher)

    def test_full_chain_iv_rv_sub_grading_feedback(self):
        rows = [make_row(
            ref=str(self.student.student_ref),
            subject=self.subject.code,
            assign='*/MV/22S', abbrev='X', sequence='1',
            voucher='V3', order='1903896', expiry='08/10/2030',
            datelogged='10/04/2026', realdatein='10/04/2026',
            dateout='13/04/2026', staffalloc='SXC', marker='LAR',
            score='73', grade='A', hubout='14/04/2026',
            hubfeedbk='15/04/2026', rating='E', comments='Good work',
        )]
        run_import_steps(rows, build_lookups())
        self.assertEqual(MarkingPaperGrading.objects.count(), 1)
        g = MarkingPaperGrading.objects.get()
        self.assertEqual(g.score, 73)
        self.assertEqual(g.grade, 'A')
        self.assertEqual(g.marker, self.marker)
        self.assertEqual(g.allocate_by, self.staff)
        self.assertEqual(MarkingPaperFeedback.objects.count(), 1)
        f = MarkingPaperFeedback.objects.get()
        self.assertEqual(f.rating, 'E')
        self.assertEqual(f.comments, 'Good work')

    def test_iv_issued_at_overridden_to_order_date(self):
        rows = [make_row(
            ref=str(self.student.student_ref),
            assign='*/MV/22', voucher='V4', order='1903896',
            expiry='08/10/2030',
        )]
        run_import_steps(rows, build_lookups())
        iv = IssuedVoucher.objects.get()
        self.assertEqual(iv.issued_at, self.order.order_date)

    def test_direct_paid_row_creates_submission_only(self):
        rows = [make_row(
            ref=str(self.student.student_ref),
            subject=self.subject.code,
            assign=self.store_product.product_code,
            abbrev='X', sequence='1',
            voucher='0', order='1848940',
            datelogged='10/04/2026', realdatein='10/04/2026',
        )]
        run_import_steps(rows, build_lookups())
        self.assertEqual(IssuedVoucher.objects.count(), 0)
        self.assertEqual(MarkingPaperSubmission.objects.count(), 1)
        sub = MarkingPaperSubmission.objects.get()
        self.assertIsNone(sub.redeemed_voucher)
        self.assertEqual(sub.order_item, self.direct_oi)
```

- [ ] **Step 2: Run test (FAIL)**

```
python manage.py test marking.services.csv_imports.tests.test_marks26_steps -v 2
```

- [ ] **Step 3: Implement run_import_steps**

Create `marking/services/csv_imports/marks26_steps.py`:

```python
"""Sequential import steps a-d for marks26.

Each step iterates the parsed rows in input order. Per-row state is
tracked in dicts keyed by row_num so subsequent steps can resolve their
FK targets.

This module assumes:
  - Pre-flight + row validation already passed.
  - Caller wraps run_import_steps in transaction.atomic().
"""
from typing import Dict, List, Tuple

from .date_parsing import parse_date
from .marks26_lookups import Marks26Lookups
from .marks26_parsing import Marks26Row

from marking.models import (
    MarkingPaperFeedback,
    MarkingPaperGrading,
    MarkingPaperSubmission,
)
from marking_vouchers.models import IssuedVoucher, RedeemedVoucher


def run_import_steps(rows: List[Marks26Row], lookups: Marks26Lookups) -> Dict[str, int]:
    """Execute steps a–d. Return counts dict for caller to log."""
    iv_by_voucher_code: Dict[str, IssuedVoucher] = {}
    rv_by_row_num: Dict[int, RedeemedVoucher] = {}
    submission_by_row_num: Dict[int, MarkingPaperSubmission] = {}
    grading_by_row_num: Dict[int, MarkingPaperGrading] = {}

    counts = {'iv': 0, 'rv': 0, 'sub': 0, 'grading': 0, 'feedback': 0}

    # --- Step a: IssuedVouchers ---
    for row in rows:
        if not row.is_voucher_row():
            continue
        oi = lookups.order_items[(row.order, 'MV')]
        iv = IssuedVoucher.objects.create(
            voucher_code=row.voucher,
            order_item=oi,
            purchasable=lookups.mv_purchasable,
            expires_at=parse_date(row.expiry),
            status='active',
        )
        # Override auto_now_add issued_at with the order's purchase date.
        IssuedVoucher.objects.filter(pk=iv.pk).update(issued_at=oi.order.order_date)
        iv.refresh_from_db()
        iv_by_voucher_code[row.voucher] = iv
        counts['iv'] += 1

    # --- Step a (continued): RedeemedVouchers + cascade IV update ---
    for row in rows:
        if not row.is_voucher_row_redeemed():
            continue
        iv = iv_by_voucher_code[row.voucher]
        paper = lookups.papers[(row.subject, row.paper_name())]
        redeemed_at = parse_date(row.datelogged)
        rv = RedeemedVoucher.objects.create(
            issued_voucher=iv,
            marking_paper=paper,
            redeemed_at=redeemed_at,
        )
        iv.status = 'redeemed'
        iv.redeemed_at = redeemed_at
        iv.save(update_fields=['status', 'redeemed_at'])
        rv_by_row_num[row.row_num] = rv
        counts['rv'] += 1

    # --- Step b: Submissions ---
    for row in rows:
        if not row.has_valid_datelogged():
            continue
        student = lookups.students[int(row.ref)]
        paper = lookups.papers[(row.subject, row.paper_name())]
        if row.is_voucher_row():
            order_item = lookups.order_items[(row.order, 'MV')]
        else:
            order_item = lookups.order_items[(row.order, row.assign)]
        rv = rv_by_row_num.get(row.row_num)
        sub = MarkingPaperSubmission.objects.create(
            student=student,
            marking_paper=paper,
            redeemed_voucher=rv,
            order_item=order_item,
            submission_date=parse_date(row.realdatein),
            hub_download_date=parse_date(row.hubdownld),
        )
        submission_by_row_num[row.row_num] = sub
        counts['sub'] += 1

    # --- Step c: Gradings ---
    for row in rows:
        if not row.has_valid_dateout():
            continue
        sub = submission_by_row_num[row.row_num]
        grading = MarkingPaperGrading.objects.create(
            submission=sub,
            marker=lookups.markers[row.marker],
            allocate_date=parse_date(row.dateout),
            allocate_by=lookups.staff[row.staffalloc],
            graded_date=parse_date(row.hubout),
            hub_upload_date=parse_date(row.hubout),
            score=int(row.score) if row.score else None,
            grade=row.grade if row.grade else None,
        )
        grading_by_row_num[row.row_num] = grading
        counts['grading'] += 1

    # --- Step d: Feedbacks ---
    for row in rows:
        if not row.has_valid_hubfeedbk():
            continue
        grading = grading_by_row_num[row.row_num]
        MarkingPaperFeedback.objects.create(
            grading=grading,
            rating=row.rating if row.rating else None,
            comments=row.comments or '',
            feedback_date=parse_date(row.hubfeedbk),
        )
        counts['feedback'] += 1

    return counts
```

- [ ] **Step 4: Run test (PASS)**

```
python manage.py test marking.services.csv_imports.tests.test_marks26_steps -v 2
```

- [ ] **Step 5: Commit**

```bash
git add marking/services/csv_imports/marks26_steps.py marking/services/csv_imports/tests/test_marks26_steps.py
git commit -m "feat(marking): add steps a-d for marks26 import"
```

---

### Task C6: import_marks26 management command

**Files:**
- Create: `backend/django_Admin3/marking/management/commands/import_marks26.py`
- Create: `backend/django_Admin3/marking/tests/test_import_marks26_command.py`

- [ ] **Step 1: Write failing integration test**

Create `marking/tests/test_import_marks26_command.py`:

```python
import os
import tempfile
from io import StringIO

from django.contrib.auth.models import User
from django.core.management import CommandError, call_command
from django.utils import timezone

from marking.tests.fixtures import MarkingChainTestCase
from marking.models import (
    Marker, MarkingPaperGrading, MarkingPaperSubmission,
)
from marking_vouchers.models import IssuedVoucher, RedeemedVoucher
from orders.models import Order
from orders.models.order_item import OrderItem
from staff.models import Staff
from store.models import Purchasable


HEADER = (
    'ref,subject,assign,abbrev,sequence,datelogged,datein,dateout,'
    'adjust,adjustrec,turnround,turnround2,score,grade,marker,rating,'
    'fee,voucher,warnings,status,order,xsolutions,realdatein,expiry,'
    'c_code,tmprated,rated,recvtype,stafflogin,staffalloc,staffret,'
    'fee_cat,hubdownld,hubout,hubfeedbk,hubonhold,hubhide,comments\n'
)


class ImportMarks26CommandTests(MarkingChainTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.mv = Purchasable.objects.create(
            kind='marking_voucher', code='MV', name='Marking Voucher',
        )
        marker_user = User.objects.create_user(
            username='m1', first_name='Marker', last_name='One',
        )
        cls.marker = Marker.objects.create(user=marker_user, initial='LAR')
        staff_user = User.objects.create_user(
            username='s1', first_name='Staff', last_name='One',
        )
        cls.staff = Staff.objects.create(user=staff_user, initials='SXC')
        cls.order = Order.objects.create(user=cls.student_user, order_date=timezone.now())
        cls.voucher_oi = OrderItem.objects.create(
            order=cls.order, purchasable=cls.mv, quantity=1,
            metadata={'orderno': '9001'},
        )
        cls.paper.name = 'X-1'
        cls.paper.save()

    def _write(self, body):
        f = tempfile.NamedTemporaryFile(
            mode='w', suffix='.csv', delete=False, newline='',
        )
        f.write(HEADER + body)
        f.close()
        self.addCleanup(os.unlink, f.name)
        return f.name

    def test_imports_redeemed_voucher_full_chain(self):
        body = (
            f'{self.student.student_ref},{self.subject.code},*/MV/22S,X,1,'
            f'10/04/2026,10/04/2026,13/04/2026,0,0,0,0,73,A,LAR,E,0,V100,,,'
            f'9001,,10/04/2026,28/04/2030,GB,F,F, ,,SXC,,0,10/04/2026,'
            f'14/04/2026,15/04/2026,/  /,/  /,Good work\n'
        )
        path = self._write(body)
        out = StringIO()
        call_command('import_marks26', '--csv-path', path, stdout=out)
        self.assertEqual(IssuedVoucher.objects.count(), 1)
        self.assertEqual(RedeemedVoucher.objects.count(), 1)
        self.assertEqual(MarkingPaperSubmission.objects.count(), 1)
        self.assertEqual(MarkingPaperGrading.objects.count(), 1)

    def test_aborts_when_target_table_non_empty(self):
        IssuedVoucher.objects.create(
            voucher_code='X', order_item=self.voucher_oi,
            purchasable=self.mv, expires_at=timezone.now(),
        )
        path = self._write('')
        with self.assertRaises(CommandError) as ctx:
            call_command('import_marks26', '--csv-path', path, stderr=StringIO())
        self.assertIn('not empty', str(ctx.exception).lower())

    def test_validation_failure_writes_error_csv(self):
        body = (
            f'99999,*,*/MV/22,*,0,/  /,/  /,/  /,0,0,0,0,0, ,, ,0,V1,,,'
            f'9001,,/  /,08/10/2030,GB,F,F, ,,,,0,/  /,/  /,/  /,/  /,/  /,\n'
        )
        path = self._write(body)
        errors_path = path + '.errors.csv'
        with self.assertRaises(CommandError):
            call_command(
                'import_marks26', '--csv-path', path,
                '--errors-path', errors_path, stderr=StringIO(),
            )
        self.assertEqual(IssuedVoucher.objects.count(), 0)
        with open(errors_path) as f:
            self.assertIn('student_ref=99999', f.read())
        os.unlink(errors_path)

    def test_dry_run_validates_but_does_not_import(self):
        body = (
            f'{self.student.student_ref},*,*/MV/22,*,0,/  /,/  /,/  /,0,0,0,0,'
            f'0, ,, ,0,V1,,,9001,,/  /,08/10/2030,GB,F,F, ,,,,0,/  /,/  /,'
            f'/  /,/  /,/  /,\n'
        )
        path = self._write(body)
        out = StringIO()
        call_command('import_marks26', '--csv-path', path, '--dry-run', stdout=out)
        self.assertEqual(IssuedVoucher.objects.count(), 0)
        self.assertIn('Dry-run', out.getvalue())
```

- [ ] **Step 2: Run test (FAIL)**

```
python manage.py test marking.tests.test_import_marks26_command -v 2
```

- [ ] **Step 3: Implement the command**

Create `marking/management/commands/import_marks26.py`:

```python
"""Management command — import marks26.csv into marking + voucher tables."""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from marking.models import (
    MarkingPaperFeedback, MarkingPaperGrading, MarkingPaperSubmission,
)
from marking_vouchers.models import IssuedVoucher, RedeemedVoucher

from marking.services.csv_imports.error_report import write_marks26_errors_csv
from marking.services.csv_imports.marks26_lookups import build_lookups
from marking.services.csv_imports.marks26_parsing import parse_marks26_csv
from marking.services.csv_imports.marks26_steps import run_import_steps
from marking.services.csv_imports.marks26_validators import (
    preflight_checks, validate_marks26_row,
)


TARGET_TABLES = [
    ('issued_vouchers', IssuedVoucher),
    ('redeemed_vouchers', RedeemedVoucher),
    ('marking_paper_submissions', MarkingPaperSubmission),
    ('marking_paper_gradings', MarkingPaperGrading),
    ('marking_paper_feedbacks', MarkingPaperFeedback),
]


class Command(BaseCommand):
    help = 'Import marks26.csv (vouchers + submissions + gradings + feedbacks).'

    def add_arguments(self, parser):
        parser.add_argument('--csv-path', required=True)
        parser.add_argument('--errors-path', default='marks26_errors.csv')
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        # 1. Pre-check — target tables must be empty
        for label, model in TARGET_TABLES:
            if model.objects.exists():
                raise CommandError(
                    f'Aborting: {label} table is not empty. '
                    'Truncate target tables before re-running.'
                )

        # 2. Parse
        with open(options['csv_path'], encoding='utf-8') as f:
            rows = parse_marks26_csv(f)

        if not rows:
            self.stdout.write(self.style.WARNING('No data rows found in CSV.'))
            return

        # 3. Build lookups + pre-flight
        lookups = build_lookups()
        preflight_errors = preflight_checks(rows, lookups)
        if preflight_errors:
            self.stderr.write(self.style.ERROR('Pre-flight failed:'))
            for msg in preflight_errors:
                self.stderr.write(f'  {msg}')
            raise CommandError('Pre-flight checks failed.')

        # 4. Per-row validation
        all_errors = []
        for row in rows:
            all_errors.extend(validate_marks26_row(row, lookups))
        if all_errors:
            with open(options['errors_path'], 'w', encoding='utf-8', newline='') as f:
                write_marks26_errors_csv(all_errors, f)
            self.stderr.write(self.style.ERROR(
                f'{len(all_errors)} validation error(s) — see {options["errors_path"]}'
            ))
            raise CommandError('Validation failed.')

        # 5. Dry-run short-circuit
        if options['dry_run']:
            self.stdout.write(self.style.SUCCESS(
                f'Dry-run OK: {len(rows)} row(s) validated, no DB writes.'
            ))
            return

        # 6. Atomic import
        with transaction.atomic():
            counts = run_import_steps(rows, lookups)

        self.stdout.write(self.style.SUCCESS(
            'Import complete. '
            f'IssuedVouchers={counts["iv"]} '
            f'RedeemedVouchers={counts["rv"]} '
            f'Submissions={counts["sub"]} '
            f'Gradings={counts["grading"]} '
            f'Feedbacks={counts["feedback"]}'
        ))
```

- [ ] **Step 4: Run test (PASS)**

```
python manage.py test marking.tests.test_import_marks26_command -v 2
```

- [ ] **Step 5: Run full marking + marking_vouchers + staff test suites for regression**

```
python manage.py test marking marking_vouchers staff -v 2
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add marking/management/commands/import_marks26.py marking/tests/test_import_marks26_command.py
git commit -m "feat(marking): add import_marks26 management command"
```

---

## Phase D — Final verification

### Task D1: End-to-end smoke test against the real CSVs (optional manual)

This is a manual verification — not a unit test.

- [ ] **Step 1: Truncate target tables in dev database**

```sql
-- Connect via psql or your preferred client (dev DB only)
TRUNCATE
    "acted"."marking_paper_feedbacks",
    "acted"."marking_paper_gradings",
    "acted"."marking_paper_submissions",
    "acted"."redeemed_vouchers",
    "acted"."issued_vouchers",
    "acted"."markers"
RESTART IDENTITY CASCADE;
```

- [ ] **Step 2: Confirm schema migrations applied**

```
python manage.py migrate
python manage.py showmigrations | grep -E 'marking|staff|voucher'
```

Confirm migrations 0010-0014 (marking), 0004 (staff), 0005 (marking_vouchers) are all applied.

- [ ] **Step 3: Confirm prerequisites**

```
python manage.py shell -c "
from store.models import Purchasable
assert Purchasable.objects.filter(code='MV').exists(), 'Need Purchasable code=MV'
print('OK: Purchasable code=MV exists')
"
```

If missing, the operator must create it first. Also verify `MarkingPaper.name` values follow `{abbrev}-{sequence}` format and `Staff.initials` is populated for any staff referenced in the CSV.

- [ ] **Step 4: Dry-run markers**

```
python manage.py import_markers --csv-path docs/misc/markers.csv --dry-run
```

- [ ] **Step 5: Run markers import**

```
python manage.py import_markers --csv-path docs/misc/markers.csv
```

If errors, inspect `markers_errors.csv`, fix the source data or auth_user records, truncate `markers`, re-run.

- [ ] **Step 6: Dry-run marks26**

```
python manage.py import_marks26 --csv-path docs/misc/marks26.csv --dry-run
```

If errors, inspect `marks26_errors.csv`, fix data, re-run dry-run.

- [ ] **Step 7: Run marks26 import**

```
python manage.py import_marks26 --csv-path docs/misc/marks26.csv
```

- [ ] **Step 8: Spot-check the imported data**

```
python manage.py shell -c "
from marking.models import Marker, MarkingPaperSubmission, MarkingPaperGrading, MarkingPaperFeedback
from marking_vouchers.models import IssuedVoucher, RedeemedVoucher
print('Markers:', Marker.objects.count())
print('IssuedVouchers:', IssuedVoucher.objects.count())
print('Redeemed:', RedeemedVoucher.objects.count())
print('Submissions:', MarkingPaperSubmission.objects.count())
print('Gradings:', MarkingPaperGrading.objects.count())
print('Feedbacks:', MarkingPaperFeedback.objects.count())
"
```

---

## Self-Review (against spec)

| Spec section | Plan task |
|--------------|-----------|
| §2.1 Migration order — staff | Task A1 |
| §2.1 Migration order — marking_vouchers RedeemedVoucher | Task A2 |
| §2.1 Migration order — marking purchasable_fk | Task A5 |
| §2.1 Migration order — marker legacy_id | Task A4 |
| §2.1 Migration order — submission swap voucher fk | Task A6 |
| §2.1 Migration order — grading field changes | Task A7 |
| §2.1 Migration order — feedback field changes | Task A8 |
| §3 RedeemedVoucher model + cascade IV update | Task A2 (model), Task A3 (serializer/admin/view), Task C5 (cascade in run_import_steps) |
| §4 import_markers — pre-check, parse, validate, error CSV, atomic | Tasks B1-B3 |
| §5.1 Pass 1: pre-check (target tables empty) | Task C6 |
| §5.1 Pass 1: pre-flight (MV purchasable + Staff + Marker) | Task C3 |
| §5.1 Pass 1: row validation rules | Task C3 |
| §5.1 Pass 2 step a — IssuedVouchers + issued_at override | Task C5 |
| §5.1 Pass 2 step a continued — RedeemedVouchers + cascade | Task C5 |
| §5.1 Pass 2 step b — Submissions | Task C5 |
| §5.1 Pass 2 step c — Gradings | Task C5 |
| §5.1 Pass 2 step d — Feedbacks | Task C5 |
| §5.2 Error CSV format (marks26) | Task C4 |
| §5.3 Date parsing (DD/MM/YYYY, midnight UK) | Task B1 |
| §5.4 Marking paper lookup formula | Task C2 (lookups), Task C3 (validators) |
| §5.5 Performance (pre-loaded dicts, atomic) | Task C2, Task C5, Task C6 |
| §6 Operational sequence | Task D1 |

All spec sections have corresponding tasks. No gaps detected.

---

## Plan complete

Plan saved to `docs/superpowers/plans/2026-04-29-marking-data-import.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
