# Marking Tests: setUp Duplication Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate duplicated `setUp` fixture code across four marking test classes by introducing a single shared base class `MarkingChainTestCase` that builds the common fixture chain once per test class via `setUpTestData`.

**Architecture:** One new file `backend/django_Admin3/marking/tests/fixtures.py` containing `MarkingChainTestCase(APITestCase)`. The class uses `setUpTestData` (class-scoped, runs once per class) to build: an auth user + Student, the catalog/store product chain, and a MarkingPaper. Each of the four affected test classes inherits from this base and adds only its own specific fixtures (Marker, Staff, Submission, Grading, Feedback) in its own `setUpTestData`. This is a refactor — no behavior changes and no new tests. All 90 existing tests must stay green through every commit.

**Tech Stack:** Django 6.0 `TestCase.setUpTestData`, DRF `APITestCase`, pytest.

**Reference spec:** [docs/to-dos/marking-tests-setup-duplication.md](../../to-dos/marking-tests-setup-duplication.md)

---

## Scope

**In scope:** Migrate these four classes to the shared fixture:
- `MarkingPaperSubmissionTestCase` (`test_models.py` ~line 493)
- `MarkingPaperGradingTestCase` (`test_models.py` ~line 597)
- `MarkingPaperFeedbackTestCase` (`test_models.py` ~line 748)
- `MarkingAdminViewsTestCase` (`test_admin_views.py` ~line 22)

**Out of scope (do NOT touch):**
- `MarkerModelTestCase` (`test_models.py` line 455) — only uses a plain User, no chain.
- `MarkingPaperTestCase` (`test_models.py` line 21) — pre-existing chain setUp, predates this feature; non-goal per the to-do doc.
- `MarkingPaperBackwardCompatTestCase` (`test_models.py` line 338) — same reason.
- `test_views.py` — unrelated.

---

## File Structure

| Path | Create/Modify | Purpose |
|---|---|---|
| `backend/django_Admin3/marking/tests/fixtures.py` | Create | `MarkingChainTestCase` — shared fixture base class |
| `backend/django_Admin3/marking/tests/test_models.py` | Modify | Migrate 3 test classes to extend `MarkingChainTestCase` |
| `backend/django_Admin3/marking/tests/test_admin_views.py` | Modify | Migrate `MarkingAdminViewsTestCase` to extend `MarkingChainTestCase` |

**Split rationale:** One fixtures module per app is sufficient; four test classes sharing the same base is not complex enough to warrant further decomposition.

---

## Preconditions

```bash
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3
source ../../.venv/bin/activate 2>/dev/null || true

# Sanity check — baseline must be green before we refactor
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest marking/tests/ -v 2>&1 | tail -5
```

Expected: 90 passed.

**Why this matters:** a refactor starts from green. If the baseline is red, fix that first or abort.

---

## The shared-fixture contract

Every subclass gets these class-level attributes via `MarkingChainTestCase.setUpTestData`:

| Attribute | Type | Default |
|---|---|---|
| `cls.student_user` | `auth.User` | username='fixture_student' |
| `cls.student` | `students.Student` | linked to `student_user` |
| `cls.exam_session` | `catalog.ExamSession` | session_code='FIXTURE2026' |
| `cls.subject` | `catalog.Subject` | code='FIX', description='Fixture subject', active=True |
| `cls.ess` | `catalog.ExamSessionSubject` | — |
| `cls.cat_product` | `catalog.Product` | code='FIX01', fullname='Fixture', shortname='Fixture' |
| `cls.variation` | `catalog.ProductVariation` | variation_type='Marking', name='Std' |
| `cls.ppv` | `catalog.ProductProductVariation` | — |
| `cls.store_product` | `store.Product` | — |
| `cls.paper` | `marking.MarkingPaper` | name='FixPaper', deadline +45d, recommended +40d |

Tests access these via `self.paper`, `self.student`, etc. Django 4.0+ automatically deep-copies class-level fixture attributes to instance attributes before each test, so in-memory mutations are isolated.

**Important behavior preserved by the refactor:**
- `MarkingPaperSubmissionTestCase.test_submission_str` — asserts `f'{self.student} \u2014 {self.paper.name}'`. This works with any paper name.
- `MarkingAdminViewsTestCase.test_submissions_list_returns_seeded_row` — currently asserts `marking_paper_name == 'AdminP'`. After refactor, paper name is `'FixPaper'`. **This assertion must be updated.**

---

## Task 1: Create the shared fixture base class

**Files:**
- Create: `backend/django_Admin3/marking/tests/fixtures.py`

- [ ] **Step 1.1: Create the fixtures module**

Create `backend/django_Admin3/marking/tests/fixtures.py`:

```python
"""
Shared test fixtures for the marking app.

`MarkingChainTestCase` seeds the common fixture chain once per test class
via `setUpTestData`. Test classes inherit from this base to avoid
re-building the 10-step `ExamSession → ... → MarkingPaper` chain in every
`setUp`.

Class-level attributes created by `setUpTestData`:
    student_user, student
    exam_session, subject, ess
    cat_product, variation, ppv, store_product
    paper

Each test accesses these via `self.xxx`. Django automatically deep-copies
class-level fixture attributes per test, so in-memory mutations don't leak
between tests.
"""
from datetime import timedelta

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from catalog.models import (
    ExamSession,
    ExamSessionSubject,
    Subject,
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)
from marking.models import MarkingPaper
from store.models import Product as StoreProduct
from students.models import Student


class MarkingChainTestCase(APITestCase):
    """Base class that seeds the MarkingPaper chain once per test class.

    Subclass and override `setUpTestData` (calling `super().setUpTestData()`)
    to add class-specific fixtures like Marker, Staff, Submission, etc.
    """

    @classmethod
    def setUpTestData(cls):
        cls.student_user = User.objects.create_user(
            username='fixture_student',
            email='fixture_student@example.com',
            password='pw',
        )
        cls.student = Student.objects.create(user=cls.student_user)

        cls.exam_session = ExamSession.objects.create(
            session_code='FIXTURE2026',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        cls.subject = Subject.objects.create(
            code='FIX', description='Fixture subject', active=True,
        )
        cls.ess = ExamSessionSubject.objects.create(
            exam_session=cls.exam_session, subject=cls.subject,
        )
        cls.cat_product = CatalogProduct.objects.create(
            code='FIX01', fullname='Fixture', shortname='Fixture',
        )
        cls.variation = ProductVariation.objects.create(
            variation_type='Marking', name='Std',
        )
        cls.ppv = ProductProductVariation.objects.create(
            product=cls.cat_product, product_variation=cls.variation,
        )
        cls.store_product = StoreProduct.objects.create(
            exam_session_subject=cls.ess,
            product_product_variation=cls.ppv,
        )
        cls.paper = MarkingPaper.objects.create(
            store_product=cls.store_product,
            name='FixPaper',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40),
        )
```

- [ ] **Step 1.2: Smoke test — import resolves without error**

```bash
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -c "from marking.tests.fixtures import MarkingChainTestCase; print('ok')"
```

Expected: `ok`

- [ ] **Step 1.3: Run full marking suite — still 90 passing**

No test class uses the new base yet, so this is a no-op safety check.

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest marking/tests/ -v 2>&1 | tail -5
```

Expected: `90 passed`

- [ ] **Step 1.4: Commit**

```bash
cd /Users/work/Documents/Code/Admin3
git add backend/django_Admin3/marking/tests/fixtures.py
git commit -m "$(cat <<'EOF'
test(marking): add MarkingChainTestCase shared fixture base

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Migrate `MarkingPaperSubmissionTestCase`

**Files:**
- Modify: `backend/django_Admin3/marking/tests/test_models.py`

- [ ] **Step 2.1: Replace the class declaration and setUp**

In `backend/django_Admin3/marking/tests/test_models.py`, find:

```python
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
```

Replace the entire class declaration + setUp block (up to but NOT including the first `def test_submission_creation_required_fields_only`) with:

```python
class MarkingPaperSubmissionTestCase(MarkingChainTestCase):
    """Tests for MarkingPaperSubmission model."""
```

Leave every `def test_*` method inside this class unchanged.

- [ ] **Step 2.2: Add import of `MarkingChainTestCase` to the file**

Near the top of `backend/django_Admin3/marking/tests/test_models.py`, under the existing `from marking.models import MarkingPaper` line (around line 13), add:

```python
from marking.tests.fixtures import MarkingChainTestCase
```

Do not remove any existing imports — other tests still use them.

- [ ] **Step 2.3: Run the submission tests**

```bash
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/test_models.py::MarkingPaperSubmissionTestCase -v
```

Expected: 5 passed.

- [ ] **Step 2.4: Run the full marking suite — confirm no regressions**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest marking/tests/ -v 2>&1 | tail -5
```

Expected: `90 passed`

- [ ] **Step 2.5: Commit**

```bash
cd /Users/work/Documents/Code/Admin3
git add backend/django_Admin3/marking/tests/test_models.py
git commit -m "$(cat <<'EOF'
test(marking): migrate submission tests to shared fixture base

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Migrate `MarkingPaperGradingTestCase`

**Files:**
- Modify: `backend/django_Admin3/marking/tests/test_models.py`

- [ ] **Step 3.1: Replace the class declaration and setUp**

In `backend/django_Admin3/marking/tests/test_models.py`, find:

```python
class MarkingPaperGradingTestCase(TestCase):
    """Tests for MarkingPaperGrading model."""

    def setUp(self):
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
```

Replace the entire class header + setUp (up to but NOT including `def test_grading_creation`) with:

```python
class MarkingPaperGradingTestCase(MarkingChainTestCase):
    """Tests for MarkingPaperGrading model."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        from marking.models import Marker, MarkingPaperSubmission

        cls.marker_user = User.objects.create_user(
            username='fixture_marker_grading',
            email='fixture_marker_grading@example.com',
            password='pw',
        )
        cls.marker = Marker.objects.create(user=cls.marker_user, initial='MKR')

        cls.staff_user = User.objects.create_user(
            username='fixture_staff_grading',
            email='fixture_staff_grading@example.com',
            password='pw',
            is_staff=True,
        )
        cls.staff = Staff.objects.create(user=cls.staff_user)

        cls.submission = MarkingPaperSubmission.objects.create(
            student=cls.student,
            marking_paper=cls.paper,
            submission_date=timezone.now(),
        )
```

Leave every `def test_*` method unchanged.

- [ ] **Step 3.2: Run the grading tests**

```bash
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/test_models.py::MarkingPaperGradingTestCase -v
```

Expected: 7 passed.

- [ ] **Step 3.3: Run the full marking suite**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest marking/tests/ -v 2>&1 | tail -5
```

Expected: `90 passed`

- [ ] **Step 3.4: Commit**

```bash
cd /Users/work/Documents/Code/Admin3
git add backend/django_Admin3/marking/tests/test_models.py
git commit -m "$(cat <<'EOF'
test(marking): migrate grading tests to shared fixture base

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Migrate `MarkingPaperFeedbackTestCase`

**Files:**
- Modify: `backend/django_Admin3/marking/tests/test_models.py`

- [ ] **Step 4.1: Replace the class declaration and setUp**

Find the `class MarkingPaperFeedbackTestCase(TestCase):` block (around line 748). It contains an ~80-line `setUp` that builds the chain + Marker + Staff + Submission + Grading.

Replace the entire class header + setUp (up to but NOT including `def test_feedback_creation`) with:

```python
class MarkingPaperFeedbackTestCase(MarkingChainTestCase):
    """Tests for MarkingPaperFeedback model."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        from marking.models import (
            Marker,
            MarkingPaperSubmission,
            MarkingPaperGrading,
        )

        cls.marker_user = User.objects.create_user(
            username='fixture_marker_feedback',
            email='fixture_marker_feedback@example.com',
            password='pw',
        )
        cls.marker = Marker.objects.create(user=cls.marker_user, initial='F')

        cls.staff_user = User.objects.create_user(
            username='fixture_staff_feedback',
            email='fixture_staff_feedback@example.com',
            password='pw',
            is_staff=True,
        )
        cls.staff = Staff.objects.create(user=cls.staff_user)

        cls.submission = MarkingPaperSubmission.objects.create(
            student=cls.student,
            marking_paper=cls.paper,
            submission_date=timezone.now(),
        )
        cls.grading = MarkingPaperGrading.objects.create(
            submission=cls.submission,
            marker=cls.marker,
            allocate_date=timezone.now(),
            allocate_by=cls.staff,
        )
```

Leave every `def test_*` method unchanged.

- [ ] **Step 4.2: Run the feedback tests**

```bash
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/test_models.py::MarkingPaperFeedbackTestCase -v
```

Expected: 7 passed.

- [ ] **Step 4.3: Run the full marking suite**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest marking/tests/ -v 2>&1 | tail -5
```

Expected: `90 passed`

- [ ] **Step 4.4: Commit**

```bash
cd /Users/work/Documents/Code/Admin3
git add backend/django_Admin3/marking/tests/test_models.py
git commit -m "$(cat <<'EOF'
test(marking): migrate feedback tests to shared fixture base

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Migrate `MarkingAdminViewsTestCase`

**Files:**
- Modify: `backend/django_Admin3/marking/tests/test_admin_views.py`

This migration has one subtlety: the current test uses `marking_paper.name='AdminP'` and a test asserts `results[0]['marking_paper_name'] == 'AdminP'`. The shared fixture uses `name='FixPaper'`. The assertion needs to update to `'FixPaper'`.

- [ ] **Step 5.1: Update imports**

In `backend/django_Admin3/marking/tests/test_admin_views.py`, find the import block near the top. Add:

```python
from marking.tests.fixtures import MarkingChainTestCase
```

Leave all other imports as-is.

- [ ] **Step 5.2: Replace class declaration + setUp**

Replace:

```python
class MarkingAdminViewsTestCase(APITestCase):
    """Permission + listing + filter smoke tests for admin endpoints."""

    def setUp(self):
        self.superuser = User.objects.create_superuser(
            username='root', email='root@example.com', password='pw',
        )
        self.staff_only = User.objects.create_user(
            username='staff', email='staff@example.com', password='pw',
            is_staff=True,
        )

        self.student_user = User.objects.create_user(
            username='stu', email='s@example.com', password='pw',
        )
        self.student = Student.objects.create(user=self.student_user)

        self.marker_user = User.objects.create_user(
            username='mkr', email='m@example.com', password='pw',
        )
        self.marker = Marker.objects.create(
            user=self.marker_user, initial='MKR',
        )

        self.staff_user = User.objects.create_user(
            username='stf', email='stf@example.com', password='pw',
            is_staff=True,
        )
        self.staff = Staff.objects.create(user=self.staff_user)

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
```

With:

```python
class MarkingAdminViewsTestCase(MarkingChainTestCase):
    """Permission + listing + filter smoke tests for admin endpoints."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        cls.superuser = User.objects.create_superuser(
            username='fixture_root',
            email='fixture_root@example.com',
            password='pw',
        )
        cls.staff_only = User.objects.create_user(
            username='fixture_staff_only',
            email='fixture_staff_only@example.com',
            password='pw',
            is_staff=True,
        )

        cls.marker_user = User.objects.create_user(
            username='fixture_marker_admin',
            email='fixture_marker_admin@example.com',
            password='pw',
        )
        cls.marker = Marker.objects.create(
            user=cls.marker_user, initial='MKR',
        )

        cls.staff_user = User.objects.create_user(
            username='fixture_staff_admin',
            email='fixture_staff_admin@example.com',
            password='pw',
            is_staff=True,
        )
        cls.staff = Staff.objects.create(user=cls.staff_user)

        cls.submission = MarkingPaperSubmission.objects.create(
            student=cls.student,
            marking_paper=cls.paper,
            submission_date=timezone.now(),
        )
        cls.grading = MarkingPaperGrading.objects.create(
            submission=cls.submission,
            marker=cls.marker,
            allocate_date=timezone.now(),
            allocate_by=cls.staff,
            score=75,
        )
        cls.feedback = MarkingPaperFeedback.objects.create(
            grading=cls.grading,
            grade='G',
            submission_date=timezone.now(),
        )
```

Leave every `def test_*` method unchanged **except** the one noted in Step 5.3 below.

- [ ] **Step 5.3: Update paper-name assertion in `test_submissions_list_returns_seeded_row`**

Find the method `test_submissions_list_returns_seeded_row` in `test_admin_views.py`. It contains:

```python
        self.assertEqual(first['marking_paper_name'], 'AdminP')
```

Replace with:

```python
        self.assertEqual(first['marking_paper_name'], 'FixPaper')
```

- [ ] **Step 5.4: Run the admin views tests**

```bash
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/test_admin_views.py -v
```

Expected: 8 passed (was 7 + 1 extra feedback filter test that was added in the feature branch = 8).

If your count differs, run with `--collect-only` to see what's actually there:
```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest \
  marking/tests/test_admin_views.py --collect-only
```

- [ ] **Step 5.5: Run the full marking suite**

```bash
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest marking/tests/ -v 2>&1 | tail -5
```

Expected: `90 passed`

- [ ] **Step 5.6: Commit**

```bash
cd /Users/work/Documents/Code/Admin3
git add backend/django_Admin3/marking/tests/test_admin_views.py
git commit -m "$(cat <<'EOF'
test(marking): migrate admin view tests to shared fixture base

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Final verification and cleanup

**Files:**
- Possibly Modify: `backend/django_Admin3/marking/tests/test_models.py` (cleanup only)

- [ ] **Step 6.1: Full marking test suite**

```bash
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest marking/tests/ -v 2>&1 | tail -10
```

Expected: `90 passed`. No `Skipped`, no `Error`, no `Failed`.

- [ ] **Step 6.2: Check for unused imports that can be removed**

Open `backend/django_Admin3/marking/tests/test_models.py`. Check if the file still uses every name in its mid-file import block (around line 446):

```python
from django.contrib.auth.models import User
from django.db import IntegrityError
from django.db.models import ProtectedError
from students.models import Student
from marking_vouchers.models import MarkingVoucher
from staff.models import Staff
```

Specifically:
- `User` — still used by `MarkerModelTestCase.setUp` → **keep**
- `IntegrityError` — still used in grading/feedback/marker unique tests → **keep**
- `ProtectedError` — still used in `test_submission_protect_on_student_delete` → **keep**
- `Student` — used by `MarkerModelTestCase`? No. Used anywhere else? Grep the file.
- `MarkingVoucher` — used by `test_submission_with_marking_voucher` → **keep**
- `Staff` — used by grading and feedback setUpTestData? YES via `cls.staff = Staff.objects.create(...)` → **keep**

Run:
```bash
grep -n "Student(" /Users/work/Documents/Code/Admin3/backend/django_Admin3/marking/tests/test_models.py
grep -n "Staff(" /Users/work/Documents/Code/Admin3/backend/django_Admin3/marking/tests/test_models.py
```

If `Student` is only referenced by the import line (no other hits), remove it from the import block. Otherwise keep it.

Same sanity check for `test_admin_views.py` imports.

- [ ] **Step 6.3: If cleanup applied, re-run the suite and commit**

If you removed any unused imports:

```bash
cd /Users/work/Documents/Code/Admin3/backend/django_Admin3
DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest marking/tests/ -v 2>&1 | tail -5
```

Expected: `90 passed`.

```bash
cd /Users/work/Documents/Code/Admin3
git add backend/django_Admin3/marking/tests/test_models.py \
        backend/django_Admin3/marking/tests/test_admin_views.py
git commit -m "$(cat <<'EOF'
test(marking): drop unused imports after fixture migration

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If no imports were unused, skip this commit and proceed to 6.4.

- [ ] **Step 6.4: Confirm net line reduction**

```bash
cd /Users/work/Documents/Code/Admin3
git diff feat/20260421-marking-submission-grading..HEAD --stat \
  backend/django_Admin3/marking/tests/
```

Expected: net negative line count on the test directory (lines removed from `test_models.py` and `test_admin_views.py` should exceed lines added to `fixtures.py`).

- [ ] **Step 6.5: Mark the to-do doc as done**

Edit `docs/to-dos/marking-tests-setup-duplication.md` — change the `Status:` line from `Deferred` to `Done (PR #<n>)`.

```bash
cd /Users/work/Documents/Code/Admin3
git add docs/to-dos/marking-tests-setup-duplication.md
git commit -m "$(cat <<'EOF'
docs: mark marking tests setUp duplication as done

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Acceptance criteria (from the to-do spec)

- [x] New file `marking/tests/fixtures.py` with `MarkingChainTestCase` base class.
- [x] Four existing test classes migrate to the shared fixture.
- [x] Each migrated class loses its `setUp` body (or trims to class-specific additions only via `setUpTestData`).
- [x] All 90 marking tests continue to pass.
- [ ] Optional: measurable speed-up in test file runtime (validated ad-hoc during Step 6.1).

---

## Risks and mitigations

- **Subject / session / product code clashes with other test classes running in the same DB.** `setUpTestData` runs once per class and the DB is rolled back between classes in Django's TestCase, so `subject.code='FIX'` in this file won't collide with `'CS2'` in other files. No action needed.
- **Per-test mutations leaking.** Django 4.0+ automatically deep-copies class-level fixture attributes per test when accessed via `self.` rather than `cls.`. As long as tests use `self.student` (the existing pattern), they're isolated. Verified by running the full suite after each migration.
- **The existing `test_submission_str` test computes the expected string from the fixture (`f'{self.student} \u2014 {self.paper.name}'`), so paper-name changes don't break it.** No update needed there. Only the admin-view hard-coded `'AdminP'` needs updating (Step 5.3).
