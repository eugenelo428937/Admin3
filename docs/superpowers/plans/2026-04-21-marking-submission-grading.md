# Marking Submission, Grading, and Feedback — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four new Django models to the `marking` app (`Marker`, `MarkingPaperSubmission`, `MarkingPaperGrading`, `MarkingPaperFeedback`) with schema-aware migrations, Django admin registration, and read-only DRF endpoints mounted under `/api/markings/admin-*/` behind `IsSuperUser`.

**Architecture:** Four models in the existing `marking` app, using Admin3's established `"acted"."..."` schema convention. The Submission → Grading → Feedback chain uses `PROTECT` on audit-critical FKs (student, marker, staff) and `CASCADE` inside the chain (Grading belongs to Submission; Feedback belongs to Grading). `OneToOneField` enforces "one grading per submission" and "one feedback per grading". Admin panel REST surface mirrors the `students.admin_views` pattern (separate `admin_views.py`, `admin_serializers.py`, `admin_router` inside `marking.urls`).

**Tech Stack:** Django 6.0, Django REST Framework, PostgreSQL, SQLite test DB via `DJANGO_SETTINGS_MODULE=django_Admin3.settings.test`.

**Spec reference:** [docs/superpowers/specs/2026-04-21-marking-submission-grading-design.md](../specs/2026-04-21-marking-submission-grading-design.md)

---

## File Structure

| Path | Create/Modify | Purpose |
|---|---|---|
| `backend/django_Admin3/marking/models/marker.py` | Create | `Marker` model |
| `backend/django_Admin3/marking/models/marking_paper_submission.py` | Create | `MarkingPaperSubmission` model |
| `backend/django_Admin3/marking/models/marking_paper_grading.py` | Create | `MarkingPaperGrading` model |
| `backend/django_Admin3/marking/models/marking_paper_feedback.py` | Create | `MarkingPaperFeedback` model |
| `backend/django_Admin3/marking/models/__init__.py` | Modify | Re-export new models |
| `backend/django_Admin3/marking/migrations/0005_add_submission_grading_feedback.py` | Create | Migration for four new tables |
| `backend/django_Admin3/marking/admin.py` | Modify | Register four new models |
| `backend/django_Admin3/marking/admin_serializers.py` | Create | Admin-panel DRF serializers |
| `backend/django_Admin3/marking/admin_views.py` | Create | Admin-panel ReadOnlyModelViewSets |
| `backend/django_Admin3/marking/urls.py` | Modify | Register admin router |
| `backend/django_Admin3/marking/tests/test_models.py` | Modify | Add ~11 model tests |
| `backend/django_Admin3/marking/tests/test_admin_views.py` | Create | API permission & filtering tests |

**Split rationale:** Separate files per model matches the existing `marking/models/marking_paper.py` pattern. Separate `admin_views.py` / `admin_serializers.py` matches the established `students/admin_views.py` / `students/admin_serializers.py` pattern so admin-panel endpoints can be found at a glance.

---

## Preconditions

Before starting, confirm the working environment:

```bash
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3
# Windows: .\.venv\Scripts\activate
# macOS:
source .venv/bin/activate 2>/dev/null || true

# Verify current test state (baseline — existing marking tests pass)
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest marking/tests/test_models.py -v
```

Expected: existing `MarkingPaper*` tests PASS.

---

## Task 1: `Marker` model

**Files:**
- Create: `backend/django_Admin3/marking/models/marker.py`
- Modify: `backend/django_Admin3/marking/models/__init__.py`
- Modify: `backend/django_Admin3/marking/tests/test_models.py`

- [ ] **Step 1.1: Write the failing tests**

Append to `marking/tests/test_models.py`:

```python
from django.contrib.auth.models import User
from django.db import IntegrityError


class MarkerModelTestCase(TestCase):
    """Tests for Marker model."""

    def setUp(self):
        self.user = User.objects.create_user(
            username='marker1', email='m1@example.com', password='pw'
        )

    def test_marker_creation(self):
        from marking.models import Marker
        marker = Marker.objects.create(user=self.user, initial='ELO')
        self.assertEqual(marker.user, self.user)
        self.assertEqual(marker.initial, 'ELO')
        self.assertIsNotNone(marker.created_at)
        self.assertIsNotNone(marker.updated_at)

    def test_marker_user_is_one_to_one(self):
        from marking.models import Marker
        Marker.objects.create(user=self.user, initial='ELO')
        # Second Marker for same user must fail
        with self.assertRaises(IntegrityError):
            Marker.objects.create(user=self.user, initial='XYZ')

    def test_marker_str(self):
        from marking.models import Marker
        marker = Marker.objects.create(user=self.user, initial='ELO')
        self.assertIn('ELO', str(marker))
```

- [ ] **Step 1.2: Run tests — confirm failure**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/test_models.py::MarkerModelTestCase -v
```

Expected: all three tests FAIL with `ImportError` (or `AttributeError`) on `from marking.models import Marker`.

- [ ] **Step 1.3: Create the Marker model**

Create `marking/models/marker.py`:

```python
"""
Marker model.

Represents a person who marks student submissions. May be internal staff
or an external contractor; `initial` is the marker's short display initial
used on grading records.
"""
from django.conf import settings
from django.db import models


class Marker(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='marker',
    )
    initial = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."markers"'
        verbose_name = 'Marker'
        verbose_name_plural = 'Markers'

    def __str__(self):
        name = self.user.get_full_name() or self.user.username
        return f'{self.initial} ({name})'
```

- [ ] **Step 1.4: Re-export from package `__init__.py`**

Modify `marking/models/__init__.py` to:

```python
from .marking_paper import MarkingPaper
from .marker import Marker
```

- [ ] **Step 1.5: Run tests — confirm pass**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/test_models.py::MarkerModelTestCase -v
```

Expected: all three tests PASS.

- [ ] **Step 1.6: Commit**

```bash
git add backend/django_Admin3/marking/models/marker.py \
        backend/django_Admin3/marking/models/__init__.py \
        backend/django_Admin3/marking/tests/test_models.py
git commit -m "feat(marking): add Marker model with initial and user OneToOne"
```

---

## Task 2: `MarkingPaperSubmission` model

**Files:**
- Create: `backend/django_Admin3/marking/models/marking_paper_submission.py`
- Modify: `backend/django_Admin3/marking/models/__init__.py`
- Modify: `backend/django_Admin3/marking/tests/test_models.py`

- [ ] **Step 2.1: Write the failing tests**

Append to `marking/tests/test_models.py`:

```python
from django.db.models import ProtectedError
from students.models import Student
from marking_vouchers.models import MarkingVoucher


class MarkingPaperSubmissionTestCase(TestCase):
    """Tests for MarkingPaperSubmission model."""

    def setUp(self):
        # Student + its auth user
        self.student_user = User.objects.create_user(
            username='stu1', email='s1@example.com', password='pw'
        )
        self.student = Student.objects.create(user=self.student_user)

        # Minimal store product chain for MarkingPaper (copied from
        # existing MarkingPaperTestCase setUp)
        self.exam_session = ExamSession.objects.create(
            session_code='JUNE2026',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        self.subject = Subject.objects.create(
            code='CM2', description='Fin Eng', active=True,
        )
        self.ess = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject,
        )
        self.cat_product = CatalogProduct.objects.create(
            code='P001', fullname='Prod', shortname='Prod',
        )
        self.variation = ProductVariation.objects.create(
            variation_type='Marking', name='Std',
        )
        self.ppv = ProductProductVariation.objects.create(
            product=self.cat_product, product_variation=self.variation,
        )
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv,
        )
        self.paper = MarkingPaper.objects.create(
            store_product=self.store_product,
            name='P1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40),
        )

    def test_submission_creation_required_fields_only(self):
        from marking.models import MarkingPaperSubmission
        sub = MarkingPaperSubmission.objects.create(
            student=self.student,
            marking_paper=self.paper,
            submission_date=timezone.now(),
        )
        self.assertEqual(sub.student, self.student)
        self.assertEqual(sub.marking_paper, self.paper)
        self.assertIsNone(sub.marking_voucher)
        self.assertIsNone(sub.order_item)
        self.assertIsNone(sub.hub_download_date)

    def test_submission_with_marking_voucher(self):
        from marking.models import MarkingPaperSubmission
        voucher = MarkingVoucher.objects.create(
            code='V1', name='Voucher 1', price=50,
        )
        sub = MarkingPaperSubmission.objects.create(
            student=self.student,
            marking_paper=self.paper,
            marking_voucher=voucher,
            submission_date=timezone.now(),
        )
        self.assertEqual(sub.marking_voucher, voucher)

    def test_submission_unique_student_paper(self):
        from marking.models import MarkingPaperSubmission
        MarkingPaperSubmission.objects.create(
            student=self.student,
            marking_paper=self.paper,
            submission_date=timezone.now(),
        )
        with self.assertRaises(IntegrityError):
            MarkingPaperSubmission.objects.create(
                student=self.student,
                marking_paper=self.paper,
                submission_date=timezone.now(),
            )

    def test_submission_protect_on_student_delete(self):
        from marking.models import MarkingPaperSubmission
        MarkingPaperSubmission.objects.create(
            student=self.student,
            marking_paper=self.paper,
            submission_date=timezone.now(),
        )
        with self.assertRaises(ProtectedError):
            self.student.delete()

    def test_submission_str(self):
        from marking.models import MarkingPaperSubmission
        sub = MarkingPaperSubmission.objects.create(
            student=self.student,
            marking_paper=self.paper,
            submission_date=timezone.now(),
        )
        self.assertIn('P1', str(sub))
```

- [ ] **Step 2.2: Run tests — confirm failure**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/test_models.py::MarkingPaperSubmissionTestCase -v
```

Expected: all tests FAIL with `ImportError` on `MarkingPaperSubmission`.

- [ ] **Step 2.3: Create the model**

Create `marking/models/marking_paper_submission.py`:

```python
"""
MarkingPaperSubmission model.

One row per (student, marking paper) — represents a student's submission
of an assignment or mock exam for marking. Data is imported from an
external hub system.
"""
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
    marking_voucher = models.ForeignKey(
        'marking_vouchers.MarkingVoucher',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='submissions',
    )
    order_item = models.ForeignKey(
        'orders.OrderItem',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='marking_submissions',
    )
    submission_date = models.DateTimeField()
    hub_download_date = models.DateTimeField(null=True, blank=True)
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

- [ ] **Step 2.4: Re-export from package `__init__.py`**

Update `marking/models/__init__.py`:

```python
from .marking_paper import MarkingPaper
from .marker import Marker
from .marking_paper_submission import MarkingPaperSubmission
```

- [ ] **Step 2.5: Run tests — confirm pass**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/test_models.py::MarkingPaperSubmissionTestCase -v
```

Expected: all five tests PASS.

- [ ] **Step 2.6: Commit**

```bash
git add backend/django_Admin3/marking/models/marking_paper_submission.py \
        backend/django_Admin3/marking/models/__init__.py \
        backend/django_Admin3/marking/tests/test_models.py
git commit -m "feat(marking): add MarkingPaperSubmission with unique student+paper"
```

---

## Task 3: `MarkingPaperGrading` model

**Files:**
- Create: `backend/django_Admin3/marking/models/marking_paper_grading.py`
- Modify: `backend/django_Admin3/marking/models/__init__.py`
- Modify: `backend/django_Admin3/marking/tests/test_models.py`

- [ ] **Step 3.1: Write the failing tests**

Append to `marking/tests/test_models.py`:

```python
from staff.models import Staff


class MarkingPaperGradingTestCase(TestCase):
    """Tests for MarkingPaperGrading model."""

    def setUp(self):
        # Reuse same setup structure as submission test
        self.student_user = User.objects.create_user(
            username='stuG', email='sg@example.com', password='pw',
        )
        self.student = Student.objects.create(user=self.student_user)

        self.marker_user = User.objects.create_user(
            username='mkrG', email='mg@example.com', password='pw',
        )
        from marking.models import Marker
        self.marker = Marker.objects.create(user=self.marker_user, initial='MKR')

        self.staff_user = User.objects.create_user(
            username='stfG', email='sfg@example.com', password='pw',
            is_staff=True,
        )
        self.staff = Staff.objects.create(user=self.staff_user)

        self.exam_session = ExamSession.objects.create(
            session_code='SEPT2026',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        self.subject = Subject.objects.create(
            code='CS2', description='Risk', active=True,
        )
        self.ess = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject,
        )
        self.cat_product = CatalogProduct.objects.create(
            code='P002', fullname='Prod2', shortname='P2',
        )
        self.variation = ProductVariation.objects.create(
            variation_type='Marking', name='Std2',
        )
        self.ppv = ProductProductVariation.objects.create(
            product=self.cat_product, product_variation=self.variation,
        )
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv,
        )
        self.paper = MarkingPaper.objects.create(
            store_product=self.store_product, name='G1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40),
        )
        from marking.models import MarkingPaperSubmission
        self.submission = MarkingPaperSubmission.objects.create(
            student=self.student,
            marking_paper=self.paper,
            submission_date=timezone.now(),
        )

    def test_grading_creation(self):
        from marking.models import MarkingPaperGrading
        grading = MarkingPaperGrading.objects.create(
            submission=self.submission,
            marker=self.marker,
            allocate_date=timezone.now(),
            allocate_by=self.staff,
        )
        self.assertEqual(grading.submission, self.submission)
        self.assertEqual(grading.marker, self.marker)
        self.assertEqual(grading.allocate_by, self.staff)
        self.assertIsNone(grading.score)
        self.assertIsNone(grading.hub_download_date)

    def test_grading_submission_is_one_to_one(self):
        from marking.models import MarkingPaperGrading
        MarkingPaperGrading.objects.create(
            submission=self.submission,
            marker=self.marker,
            allocate_date=timezone.now(),
            allocate_by=self.staff,
        )
        with self.assertRaises(IntegrityError):
            MarkingPaperGrading.objects.create(
                submission=self.submission,
                marker=self.marker,
                allocate_date=timezone.now(),
                allocate_by=self.staff,
            )

    def test_grading_cascades_when_submission_deleted(self):
        from marking.models import MarkingPaperGrading
        grading = MarkingPaperGrading.objects.create(
            submission=self.submission,
            marker=self.marker,
            allocate_date=timezone.now(),
            allocate_by=self.staff,
        )
        grading_id = grading.id
        self.submission.delete()
        self.assertFalse(
            MarkingPaperGrading.objects.filter(id=grading_id).exists()
        )

    def test_grading_protect_on_marker_delete(self):
        from marking.models import MarkingPaperGrading
        MarkingPaperGrading.objects.create(
            submission=self.submission,
            marker=self.marker,
            allocate_date=timezone.now(),
            allocate_by=self.staff,
        )
        with self.assertRaises(ProtectedError):
            self.marker.delete()

    def test_grading_score_nullable(self):
        from marking.models import MarkingPaperGrading
        grading = MarkingPaperGrading.objects.create(
            submission=self.submission,
            marker=self.marker,
            allocate_date=timezone.now(),
            allocate_by=self.staff,
            score=85,
        )
        self.assertEqual(grading.score, 85)
```

- [ ] **Step 3.2: Run tests — confirm failure**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/test_models.py::MarkingPaperGradingTestCase -v
```

Expected: all tests FAIL with `ImportError` on `MarkingPaperGrading`.

- [ ] **Step 3.3: Create the model**

Create `marking/models/marking_paper_grading.py`:

```python
"""
MarkingPaperGrading model.

One grading per submission. Represents a marker's work on a submitted paper,
including allocation metadata (who assigned it and when) and scoring outcome.
"""
from django.db import models


class MarkingPaperGrading(models.Model):
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
    submission_date = models.DateTimeField(null=True, blank=True)
    hub_download_date = models.DateTimeField(null=True, blank=True)
    hub_upload_date = models.DateTimeField(null=True, blank=True)
    score = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."marking_paper_gradings"'
        verbose_name = 'Marking Paper Grading'
        verbose_name_plural = 'Marking Paper Gradings'

    def __str__(self):
        return f'Grading({self.submission_id}) by {self.marker.initial}'
```

- [ ] **Step 3.4: Re-export from package `__init__.py`**

Update `marking/models/__init__.py`:

```python
from .marking_paper import MarkingPaper
from .marker import Marker
from .marking_paper_submission import MarkingPaperSubmission
from .marking_paper_grading import MarkingPaperGrading
```

- [ ] **Step 3.5: Run tests — confirm pass**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/test_models.py::MarkingPaperGradingTestCase -v
```

Expected: all five tests PASS.

- [ ] **Step 3.6: Commit**

```bash
git add backend/django_Admin3/marking/models/marking_paper_grading.py \
        backend/django_Admin3/marking/models/__init__.py \
        backend/django_Admin3/marking/tests/test_models.py
git commit -m "feat(marking): add MarkingPaperGrading with one-to-one submission"
```

---

## Task 4: `MarkingPaperFeedback` model

**Files:**
- Create: `backend/django_Admin3/marking/models/marking_paper_feedback.py`
- Modify: `backend/django_Admin3/marking/models/__init__.py`
- Modify: `backend/django_Admin3/marking/tests/test_models.py`

- [ ] **Step 4.1: Write the failing tests**

Append to `marking/tests/test_models.py`:

```python
from django.core.exceptions import ValidationError


class MarkingPaperFeedbackTestCase(TestCase):
    """Tests for MarkingPaperFeedback model."""

    def setUp(self):
        # Build minimum chain: Student → Submission → Grading → Feedback
        self.student_user = User.objects.create_user(
            username='stuF', email='sf@example.com', password='pw',
        )
        self.student = Student.objects.create(user=self.student_user)

        self.marker_user = User.objects.create_user(
            username='mkrF', email='mf@example.com', password='pw',
        )
        from marking.models import Marker
        self.marker = Marker.objects.create(user=self.marker_user, initial='F')

        self.staff_user = User.objects.create_user(
            username='stfF', email='stf@example.com', password='pw',
            is_staff=True,
        )
        self.staff = Staff.objects.create(user=self.staff_user)

        self.exam_session = ExamSession.objects.create(
            session_code='APR2026',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        self.subject = Subject.objects.create(
            code='CB1', description='Actuarial', active=True,
        )
        self.ess = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject,
        )
        self.cat_product = CatalogProduct.objects.create(
            code='P003', fullname='Prod3', shortname='P3',
        )
        self.variation = ProductVariation.objects.create(
            variation_type='Marking', name='Std3',
        )
        self.ppv = ProductProductVariation.objects.create(
            product=self.cat_product, product_variation=self.variation,
        )
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv,
        )
        self.paper = MarkingPaper.objects.create(
            store_product=self.store_product, name='F1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40),
        )

        from marking.models import MarkingPaperSubmission, MarkingPaperGrading
        self.submission = MarkingPaperSubmission.objects.create(
            student=self.student,
            marking_paper=self.paper,
            submission_date=timezone.now(),
        )
        self.grading = MarkingPaperGrading.objects.create(
            submission=self.submission,
            marker=self.marker,
            allocate_date=timezone.now(),
            allocate_by=self.staff,
        )

    def test_feedback_creation(self):
        from marking.models import MarkingPaperFeedback
        fb = MarkingPaperFeedback.objects.create(
            grading=self.grading,
            submission_date=timezone.now(),
        )
        self.assertEqual(fb.grading, self.grading)
        self.assertIsNone(fb.grade)
        self.assertEqual(fb.comments, '')

    def test_feedback_grade_choices_valid(self):
        from marking.models import MarkingPaperFeedback
        for g in ['E', 'G', 'A', 'P']:
            MarkingPaperFeedback.objects.filter(grading=self.grading).delete()
            fb = MarkingPaperFeedback(
                grading=self.grading,
                grade=g,
                submission_date=timezone.now(),
            )
            fb.full_clean()  # should not raise
            fb.save()

    def test_feedback_grade_choices_invalid(self):
        from marking.models import MarkingPaperFeedback
        fb = MarkingPaperFeedback(
            grading=self.grading,
            grade='X',
            submission_date=timezone.now(),
        )
        with self.assertRaises(ValidationError):
            fb.full_clean()

    def test_feedback_cascades_when_grading_deleted(self):
        from marking.models import MarkingPaperFeedback
        fb = MarkingPaperFeedback.objects.create(
            grading=self.grading,
            submission_date=timezone.now(),
        )
        fb_id = fb.id
        self.grading.delete()
        self.assertFalse(
            MarkingPaperFeedback.objects.filter(id=fb_id).exists()
        )

    def test_feedback_grading_is_one_to_one(self):
        from marking.models import MarkingPaperFeedback
        MarkingPaperFeedback.objects.create(
            grading=self.grading,
            submission_date=timezone.now(),
        )
        with self.assertRaises(IntegrityError):
            MarkingPaperFeedback.objects.create(
                grading=self.grading,
                submission_date=timezone.now(),
            )

    def test_feedback_derives_student_via_chain(self):
        from marking.models import MarkingPaperFeedback
        fb = MarkingPaperFeedback.objects.create(
            grading=self.grading,
            submission_date=timezone.now(),
        )
        self.assertEqual(fb.grading.submission.student, self.student)
```

- [ ] **Step 4.2: Run tests — confirm failure**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/test_models.py::MarkingPaperFeedbackTestCase -v
```

Expected: all tests FAIL with `ImportError` on `MarkingPaperFeedback`.

- [ ] **Step 4.3: Create the model**

Create `marking/models/marking_paper_feedback.py`:

```python
"""
MarkingPaperFeedback model.

Student feedback on the marking they received. One feedback per grading.
The student is derivable via `feedback.grading.submission.student` — no
separate student FK needed because Submission → Grading → Feedback is 1:1:1.
"""
from django.db import models


class MarkingPaperFeedback(models.Model):
    GRADE_CHOICES = [
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
    grade = models.CharField(
        max_length=1,
        choices=GRADE_CHOICES,
        null=True,
        blank=True,
    )
    comments = models.TextField(blank=True, default='')
    submission_date = models.DateTimeField()
    hub_download_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = '"acted"."marking_paper_feedbacks"'
        verbose_name = 'Marking Paper Feedback'
        verbose_name_plural = 'Marking Paper Feedbacks'

    def __str__(self):
        return f'Feedback({self.grading_id}) grade={self.grade or "—"}'
```

- [ ] **Step 4.4: Re-export from package `__init__.py`**

Update `marking/models/__init__.py`:

```python
from .marking_paper import MarkingPaper
from .marker import Marker
from .marking_paper_submission import MarkingPaperSubmission
from .marking_paper_grading import MarkingPaperGrading
from .marking_paper_feedback import MarkingPaperFeedback
```

- [ ] **Step 4.5: Run tests — confirm pass**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/test_models.py::MarkingPaperFeedbackTestCase -v
```

Expected: all six tests PASS.

- [ ] **Step 4.6: Run the full model test file to catch regressions**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/test_models.py -v
```

Expected: all tests (existing + new) PASS.

- [ ] **Step 4.7: Commit**

```bash
git add backend/django_Admin3/marking/models/marking_paper_feedback.py \
        backend/django_Admin3/marking/models/__init__.py \
        backend/django_Admin3/marking/tests/test_models.py
git commit -m "feat(marking): add MarkingPaperFeedback with grade choices"
```

---

## Task 5: Generate and verify migration

**Files:**
- Create: `backend/django_Admin3/marking/migrations/0005_add_submission_grading_feedback.py`

- [ ] **Step 5.1: Generate the migration**

```bash
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3
python manage.py makemigrations marking --name add_submission_grading_feedback
```

Expected output: reports creating migration `marking/migrations/0005_add_submission_grading_feedback.py` with four `CreateModel` operations and one `AddConstraint`.

- [ ] **Step 5.2: Inspect the generated file**

Open `marking/migrations/0005_add_submission_grading_feedback.py` and verify:

- Four `migrations.CreateModel` ops (Marker, MarkingPaperSubmission, MarkingPaperGrading, MarkingPaperFeedback).
- `db_table` values use the double-quoted schema format: `'"acted"."markers"'`, `'"acted"."marking_paper_submissions"'`, etc.
- Dependencies include `('students', ...)`, `('marking_vouchers', ...)`, `('orders', ...)`, `('staff', ...)`, and `('marking', '0004_alter_markingpaper_store_product')`.
- `UniqueConstraint(fields=('student', 'marking_paper'), name='uq_submission_student_paper')` on `MarkingPaperSubmission`.

If `db_table` values come out unquoted (e.g. `acted.markers`), manually correct them to the double-quoted form. (The `Meta.db_table` in the model is the source of truth; Django generally preserves it, but double-check.)

- [ ] **Step 5.3: Dry-run SQL to sanity-check**

```bash
python manage.py sqlmigrate marking 0005_add_submission_grading_feedback
```

Expected: SQL creates tables `"acted"."markers"`, `"acted"."marking_paper_submissions"`, `"acted"."marking_paper_gradings"`, `"acted"."marking_paper_feedbacks"` with the expected columns and constraints.

- [ ] **Step 5.4: Run full marking test suite against the migration**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/ -v
```

Expected: all marking tests still PASS.

- [ ] **Step 5.5: Commit**

```bash
git add backend/django_Admin3/marking/migrations/0005_add_submission_grading_feedback.py
git commit -m "feat(marking): migrate new submission, grading, feedback tables"
```

---

## Task 6: Register models in Django admin

**Files:**
- Modify: `backend/django_Admin3/marking/admin.py`

- [ ] **Step 6.1: Update admin registrations**

Replace the contents of `marking/admin.py`:

```python
from django.contrib import admin

from marking.models import (
    MarkingPaper,
    Marker,
    MarkingPaperSubmission,
    MarkingPaperGrading,
    MarkingPaperFeedback,
)


@admin.register(MarkingPaper)
class MarkingPaperAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'store_product', 'deadline',
                    'recommended_submit_date')
    list_filter = ('deadline',)
    search_fields = ('name',)
    raw_id_fields = ('store_product',)


@admin.register(Marker)
class MarkerAdmin(admin.ModelAdmin):
    list_display = ('id', 'initial', 'user', 'created_at')
    search_fields = ('initial', 'user__username', 'user__email',
                     'user__first_name', 'user__last_name')
    raw_id_fields = ('user',)
    readonly_fields = ('created_at', 'updated_at')


@admin.register(MarkingPaperSubmission)
class MarkingPaperSubmissionAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'marking_paper', 'submission_date',
                    'hub_download_date')
    list_filter = ('submission_date', 'hub_download_date')
    search_fields = ('student__user__email', 'marking_paper__name')
    raw_id_fields = ('student', 'marking_paper', 'marking_voucher',
                     'order_item')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(MarkingPaperGrading)
class MarkingPaperGradingAdmin(admin.ModelAdmin):
    list_display = ('id', 'submission', 'marker', 'allocate_date',
                    'score', 'hub_upload_date')
    list_filter = ('allocate_date', 'hub_upload_date')
    search_fields = ('marker__initial', 'marker__user__email')
    raw_id_fields = ('submission', 'marker', 'allocate_by')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(MarkingPaperFeedback)
class MarkingPaperFeedbackAdmin(admin.ModelAdmin):
    list_display = ('id', 'grading', 'grade', 'submission_date')
    list_filter = ('grade', 'submission_date')
    raw_id_fields = ('grading',)
    readonly_fields = ('created_at', 'updated_at')
```

- [ ] **Step 6.2: Smoke test — admin loads**

```bash
python manage.py check
```

Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 6.3: Commit**

```bash
git add backend/django_Admin3/marking/admin.py
git commit -m "feat(marking): register new models in Django admin"
```

---

## Task 7: Admin-panel serializers

**Files:**
- Create: `backend/django_Admin3/marking/admin_serializers.py`

- [ ] **Step 7.1: Create serializers**

Create `marking/admin_serializers.py`:

```python
"""
Admin-panel serializers for marking models.

Returns nested shallow fields (student_ref, names, paper name) so the
frontend doesn't need separate requests to resolve FK labels.
"""
from rest_framework import serializers

from marking.models import (
    Marker,
    MarkingPaperSubmission,
    MarkingPaperGrading,
    MarkingPaperFeedback,
)


class MarkerAdminSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_full_name = serializers.SerializerMethodField()

    class Meta:
        model = Marker
        fields = ('id', 'initial', 'user', 'user_email', 'user_full_name',
                  'created_at', 'updated_at')

    def get_user_full_name(self, obj):
        name = obj.user.get_full_name()
        return name or obj.user.username


class MarkingPaperSubmissionAdminSerializer(serializers.ModelSerializer):
    student_ref = serializers.IntegerField(
        source='student.student_ref', read_only=True,
    )
    marking_paper_name = serializers.CharField(
        source='marking_paper.name', read_only=True,
    )

    class Meta:
        model = MarkingPaperSubmission
        fields = ('id', 'student', 'student_ref', 'marking_paper',
                  'marking_paper_name', 'marking_voucher', 'order_item',
                  'submission_date', 'hub_download_date',
                  'created_at', 'updated_at')


class MarkingPaperGradingAdminSerializer(serializers.ModelSerializer):
    marker_initial = serializers.CharField(
        source='marker.initial', read_only=True,
    )
    allocate_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MarkingPaperGrading
        fields = ('id', 'submission', 'marker', 'marker_initial',
                  'allocate_date', 'allocate_by', 'allocate_by_name',
                  'submission_date', 'hub_download_date', 'hub_upload_date',
                  'score', 'created_at', 'updated_at')

    def get_allocate_by_name(self, obj):
        return str(obj.allocate_by)


class MarkingPaperFeedbackAdminSerializer(serializers.ModelSerializer):
    grade_display = serializers.CharField(
        source='get_grade_display', read_only=True,
    )

    class Meta:
        model = MarkingPaperFeedback
        fields = ('id', 'grading', 'grade', 'grade_display', 'comments',
                  'submission_date', 'hub_download_date',
                  'created_at', 'updated_at')
```

- [ ] **Step 7.2: Smoke test — import works**

```bash
python -c "from marking.admin_serializers import MarkerAdminSerializer; print('ok')"
```

Expected: `ok`

- [ ] **Step 7.3: Commit**

```bash
git add backend/django_Admin3/marking/admin_serializers.py
git commit -m "feat(marking): add admin-panel serializers with nested labels"
```

---

## Task 8: Admin-panel ViewSets + URL routing

**Files:**
- Create: `backend/django_Admin3/marking/admin_views.py`
- Modify: `backend/django_Admin3/marking/urls.py`
- Create: `backend/django_Admin3/marking/tests/test_admin_views.py`

- [ ] **Step 8.1: Write the failing tests**

Create `marking/tests/test_admin_views.py`:

```python
"""Tests for marking admin-panel API endpoints."""
from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatalogProduct,
    ProductVariation, ProductProductVariation,
)
from marking.models import (
    Marker, MarkingPaper, MarkingPaperFeedback,
    MarkingPaperGrading, MarkingPaperSubmission,
)
from staff.models import Staff
from store.models import Product as StoreProduct
from students.models import Student


class MarkingAdminViewsTestCase(APITestCase):
    """Common fixture + permission/listing coverage for admin endpoints."""

    def setUp(self):
        # Superuser for authorised requests
        self.superuser = User.objects.create_superuser(
            username='root', email='root@example.com', password='pw',
        )
        # Non-super staff — should be rejected by IsSuperUser
        self.staff_only = User.objects.create_user(
            username='staff', email='staff@example.com', password='pw',
            is_staff=True,
        )

        # Student and its user
        self.student_user = User.objects.create_user(
            username='stu', email='s@example.com', password='pw',
        )
        self.student = Student.objects.create(user=self.student_user)

        # Marker
        self.marker_user = User.objects.create_user(
            username='mkr', email='m@example.com', password='pw',
        )
        self.marker = Marker.objects.create(
            user=self.marker_user, initial='MKR',
        )

        # Staff entity
        self.staff_user = User.objects.create_user(
            username='stf', email='stf@example.com', password='pw',
            is_staff=True,
        )
        self.staff = Staff.objects.create(user=self.staff_user)

        # MarkingPaper chain
        self.exam_session = ExamSession.objects.create(
            session_code='JAN2026',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        self.subject = Subject.objects.create(
            code='CP1', description='Actuarial Practice', active=True,
        )
        self.ess = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject,
        )
        self.cat_product = CatalogProduct.objects.create(
            code='PA01', fullname='A', shortname='A',
        )
        self.variation = ProductVariation.objects.create(
            variation_type='Marking', name='Std',
        )
        self.ppv = ProductProductVariation.objects.create(
            product=self.cat_product, product_variation=self.variation,
        )
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=self.ess,
            product_product_variation=self.ppv,
        )
        self.paper = MarkingPaper.objects.create(
            store_product=self.store_product, name='AdminP',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40),
        )
        self.submission = MarkingPaperSubmission.objects.create(
            student=self.student, marking_paper=self.paper,
            submission_date=timezone.now(),
        )
        self.grading = MarkingPaperGrading.objects.create(
            submission=self.submission, marker=self.marker,
            allocate_date=timezone.now(), allocate_by=self.staff,
            score=75,
        )
        self.feedback = MarkingPaperFeedback.objects.create(
            grading=self.grading, grade='G',
            submission_date=timezone.now(),
        )

    # Permissions

    def test_markers_list_requires_superuser(self):
        url = '/api/markings/admin-markers/'
        # Unauthenticated — 401 or 403
        resp = self.client.get(url)
        self.assertIn(resp.status_code, (401, 403))
        # Staff-only — 403
        self.client.force_authenticate(user=self.staff_only)
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 403)
        # Superuser — 200
        self.client.force_authenticate(user=self.superuser)
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, 200)

    # Listing

    def test_submissions_list_returns_seeded_row(self):
        self.client.force_authenticate(user=self.superuser)
        resp = self.client.get('/api/markings/admin-submissions/')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        results = data.get('results', data)
        self.assertGreaterEqual(len(results), 1)
        first = results[0]
        self.assertEqual(first['student'], self.student.pk)
        self.assertEqual(first['marking_paper_name'], 'AdminP')

    def test_gradings_list_returns_seeded_row(self):
        self.client.force_authenticate(user=self.superuser)
        resp = self.client.get('/api/markings/admin-gradings/')
        self.assertEqual(resp.status_code, 200)
        results = resp.json().get('results', resp.json())
        self.assertGreaterEqual(len(results), 1)
        self.assertEqual(results[0]['marker_initial'], 'MKR')
        self.assertEqual(results[0]['score'], 75)

    def test_feedback_list_returns_seeded_row(self):
        self.client.force_authenticate(user=self.superuser)
        resp = self.client.get('/api/markings/admin-feedback/')
        self.assertEqual(resp.status_code, 200)
        results = resp.json().get('results', resp.json())
        self.assertGreaterEqual(len(results), 1)
        self.assertEqual(results[0]['grade'], 'G')
        self.assertEqual(results[0]['grade_display'], 'Good')

    def test_markers_detail_works(self):
        self.client.force_authenticate(user=self.superuser)
        resp = self.client.get(f'/api/markings/admin-markers/{self.marker.id}/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['initial'], 'MKR')

    # Filtering (smoke)

    def test_gradings_filter_by_marker(self):
        self.client.force_authenticate(user=self.superuser)
        resp = self.client.get(
            f'/api/markings/admin-gradings/?marker={self.marker.id}'
        )
        self.assertEqual(resp.status_code, 200)
        results = resp.json().get('results', resp.json())
        for r in results:
            self.assertEqual(r['marker'], self.marker.id)

    def test_submissions_filter_by_student(self):
        self.client.force_authenticate(user=self.superuser)
        resp = self.client.get(
            f'/api/markings/admin-submissions/?student={self.student.pk}'
        )
        self.assertEqual(resp.status_code, 200)
        results = resp.json().get('results', resp.json())
        for r in results:
            self.assertEqual(r['student'], self.student.pk)
```

- [ ] **Step 8.2: Run tests — confirm failure**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/test_admin_views.py -v
```

Expected: all tests FAIL (404 on URLs that don't exist yet, or ImportError).

- [ ] **Step 8.3: Create the admin viewsets**

Create `marking/admin_views.py`:

```python
"""Admin-panel ViewSets for the marking app.

Read-only endpoints surfaced at `/api/markings/admin-*/` and guarded by
`IsSuperUser`. Matches the pattern established in `students/admin_views.py`.
"""
from rest_framework import viewsets

from catalog.permissions import IsSuperUser
from marking.admin_serializers import (
    MarkerAdminSerializer,
    MarkingPaperFeedbackAdminSerializer,
    MarkingPaperGradingAdminSerializer,
    MarkingPaperSubmissionAdminSerializer,
)
from marking.models import (
    Marker,
    MarkingPaperFeedback,
    MarkingPaperGrading,
    MarkingPaperSubmission,
)


class MarkerAdminViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MarkerAdminSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        qs = Marker.objects.select_related('user').order_by('initial')
        params = self.request.query_params
        user_id = params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
        initial = params.get('initial')
        if initial:
            qs = qs.filter(initial__icontains=initial)
        return qs


class MarkingPaperSubmissionAdminViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MarkingPaperSubmissionAdminSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        qs = (
            MarkingPaperSubmission.objects
            .select_related('student__user', 'marking_paper',
                            'marking_voucher', 'order_item')
            .order_by('-submission_date')
        )
        params = self.request.query_params
        student = params.get('student')
        if student:
            qs = qs.filter(student_id=student)
        paper = params.get('marking_paper')
        if paper:
            qs = qs.filter(marking_paper_id=paper)
        gte = params.get('submission_date__gte')
        if gte:
            qs = qs.filter(submission_date__gte=gte)
        lte = params.get('submission_date__lte')
        if lte:
            qs = qs.filter(submission_date__lte=lte)
        return qs


class MarkingPaperGradingAdminViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MarkingPaperGradingAdminSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        qs = (
            MarkingPaperGrading.objects
            .select_related('submission__student__user', 'marker__user',
                            'allocate_by__user')
            .order_by('-allocate_date')
        )
        params = self.request.query_params
        marker = params.get('marker')
        if marker:
            qs = qs.filter(marker_id=marker)
        submission = params.get('submission')
        if submission:
            qs = qs.filter(submission_id=submission)
        score_gte = params.get('score__gte')
        if score_gte:
            qs = qs.filter(score__gte=score_gte)
        score_lte = params.get('score__lte')
        if score_lte:
            qs = qs.filter(score__lte=score_lte)
        alloc_gte = params.get('allocate_date__gte')
        if alloc_gte:
            qs = qs.filter(allocate_date__gte=alloc_gte)
        alloc_lte = params.get('allocate_date__lte')
        if alloc_lte:
            qs = qs.filter(allocate_date__lte=alloc_lte)
        return qs


class MarkingPaperFeedbackAdminViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MarkingPaperFeedbackAdminSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        qs = (
            MarkingPaperFeedback.objects
            .select_related('grading__submission__student__user')
            .order_by('-submission_date')
        )
        params = self.request.query_params
        grade = params.get('grade')
        if grade:
            qs = qs.filter(grade=grade)
        grading = params.get('grading')
        if grading:
            qs = qs.filter(grading_id=grading)
        student = params.get('grading__submission__student')
        if student:
            qs = qs.filter(grading__submission__student_id=student)
        return qs
```

- [ ] **Step 8.4: Register admin router in `marking/urls.py`**

Replace `marking/urls.py`:

```python
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .admin_views import (
    MarkerAdminViewSet,
    MarkingPaperFeedbackAdminViewSet,
    MarkingPaperGradingAdminViewSet,
    MarkingPaperSubmissionAdminViewSet,
)
from .views import MarkingPaperViewSet

router = DefaultRouter()
router.register(r'papers', MarkingPaperViewSet, basename='markingpaper')

admin_router = DefaultRouter()
admin_router.register(
    r'admin-markers', MarkerAdminViewSet, basename='marker-admin',
)
admin_router.register(
    r'admin-submissions', MarkingPaperSubmissionAdminViewSet,
    basename='marking-submission-admin',
)
admin_router.register(
    r'admin-gradings', MarkingPaperGradingAdminViewSet,
    basename='marking-grading-admin',
)
admin_router.register(
    r'admin-feedback', MarkingPaperFeedbackAdminViewSet,
    basename='marking-feedback-admin',
)

urlpatterns = [
    path('', include(admin_router.urls)),
    path('', include(router.urls)),
]
```

- [ ] **Step 8.5: Run tests — confirm pass**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/test_admin_views.py -v
```

Expected: all seven tests PASS.

- [ ] **Step 8.6: Run full marking suite**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/ -v
```

Expected: all tests PASS.

- [ ] **Step 8.7: Commit**

```bash
git add backend/django_Admin3/marking/admin_views.py \
        backend/django_Admin3/marking/urls.py \
        backend/django_Admin3/marking/tests/test_admin_views.py
git commit -m "feat(marking): add admin-panel ReadOnly ViewSets and routes"
```

---

## Task 9: Final verification

- [ ] **Step 9.1: Full marking test suite**

```bash
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/ -v
```

Expected: every test passes.

- [ ] **Step 9.2: Django system check**

```bash
python manage.py check
```

Expected: `System check identified no issues`.

- [ ] **Step 9.3: Makemigrations should be idempotent**

```bash
python manage.py makemigrations --dry-run
```

Expected: `No changes detected`. If it lists new migrations for `marking`, something drifted — investigate before continuing.

- [ ] **Step 9.4: Commit any stragglers (none expected)**

```bash
git status
```

Expected: working tree clean.

---

## Out-of-scope / follow-on work (do not do in this plan)

- React admin-panel pages consuming the new endpoints (follows spec `20260216-admin-panel` pattern).
- Data import tooling from the external hub system.
- Write endpoints (`POST`/`PATCH`/`DELETE`) — intentionally omitted because the external hub is authoritative.
- Any change to `MarkingPaper` — out of scope; the existing model is reused as-is.
