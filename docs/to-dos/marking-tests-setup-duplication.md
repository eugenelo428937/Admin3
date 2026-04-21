# Marking Tests: setUp Duplication

**Date logged:** 2026-04-21
**Source branch:** `feat/20260421-marking-submission-grading`
**Severity:** Low (maintenance)
**Effort estimate:** 1–2 hours
**Status:** Deferred — not blocking the marking-submission-grading feature

## Problem

Four test classes in `backend/django_Admin3/marking/tests/` each build the same
12-step fixture chain in `setUp()`:

```
ExamSession
  → Subject
    → ExamSessionSubject
      → catalog.Product
        → ProductVariation
          → ProductProductVariation
            → store.Product
              → MarkingPaper
                → [+ Student, Marker, Staff as needed]
                  → MarkingPaperSubmission
                    → MarkingPaperGrading
                      → MarkingPaperFeedback
```

The four classes with this duplication:

| File | Class | setUp line | ~lines |
|---|---|---|---|
| `marking/tests/test_models.py` | `MarkingPaperSubmissionTestCase` | L496 | ~30 |
| `marking/tests/test_models.py` | `MarkingPaperGradingTestCase` | L600 | ~55 |
| `marking/tests/test_models.py` | `MarkingPaperFeedbackTestCase` | L751 | ~65 |
| `marking/tests/test_admin_views.py` | `MarkingAdminViewsTestCase` | L25 | ~65 |

Differences between the four `setUp`s are cosmetic:

- `session_code`: `JUNE2026`, `SEPT2026`, `APR2026`, `JAN2026`
- `Subject.code`: `CM2`, `CS2`, `CB1`, `CP1`
- `CatalogProduct.code`: `P001`, `P002`, `P003`, `PA01`
- Usernames: `stu1`, `stuG`, `stuF`, `stu`

The *structure* of the fixture chain is byte-for-byte identical.

## Why it's real tech debt

1. **Maintenance amplification.** Any required-field addition to
   `ExamSession`, `Subject`, `catalog.Product`, `ProductVariation`, `StoreProduct`,
   or `MarkingPaper` means editing four call sites. Silent drift is likely.
2. **Rule-of-three crossed.** The duplication was acceptable at Task 2
   (second occurrence is a convention); by Task 3 it had crossed the rule-of-three
   threshold; by Task 4 the review explicitly flagged it as "getting material".
3. **Signal dilution.** Large setup blocks obscure what each test class is
   actually testing — the distinctive assertions get buried under 60 lines
   of boilerplate.
4. **Slower test runs.** Each of the ~18 tests across the four classes
   rebuilds the full chain even when a simpler fixture would do. Moving
   to `setUpTestData` (class-scoped fixture cached by the test runner)
   would noticeably speed up the file.

## Why it was deferred

The duplication emerged during a model-addition feature where the priority
was landing four new models + migrations + API with reviewer-approved tests.
Refactoring the fixture mid-feature would have:

- Expanded the scope of a feature PR into a refactor PR
- Required re-running the full task-by-task review cycle for non-feature changes
- Delayed the feature by a day without blocking any user-facing behavior

A focused follow-on PR can fix this cleanly in isolation.

## Proposed fix

Introduce a shared fixture helper in a new module
`backend/django_Admin3/marking/tests/fixtures.py`.

### Option A (preferred): `setUpTestData` on a base class

```python
# marking/tests/fixtures.py
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from catalog.models import (
    ExamSession, ExamSessionSubject, Subject,
    Product as CatalogProduct,
    ProductVariation, ProductProductVariation,
)
from marking.models import MarkingPaper
from store.models import Product as StoreProduct
from students.models import Student


class MarkingChainTestCase(TestCase):
    """Base class that seeds the MarkingPaper chain once per test class.

    Uses `setUpTestData` (cached at the class level) rather than `setUp`
    (run per test) so the 12-step chain is built only once.
    """

    @classmethod
    def setUpTestData(cls):
        cls.student_user = User.objects.create_user(
            username='student_fixture',
            email='student_fixture@example.com',
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
            name='P1',
            deadline=timezone.now() + timedelta(days=45),
            recommended_submit_date=timezone.now() + timedelta(days=40),
        )
```

Test classes then inherit:

```python
class MarkingPaperSubmissionTestCase(MarkingChainTestCase):
    def test_submission_creation_required_fields_only(self):
        sub = MarkingPaperSubmission.objects.create(
            student=self.student,
            marking_paper=self.paper,
            submission_date=timezone.now(),
        )
        ...
```

### Option B: factory helpers (if `setUpTestData` caching is undesirable)

```python
# marking/tests/fixtures.py
def create_marking_chain(username_prefix='test'):
    """Returns a dict of the fully wired fixture objects."""
    # ... same body, returns dict
```

`setUpTestData` is preferred — it's idiomatic Django and cheaper.

## Acceptance criteria

- [ ] New file `marking/tests/fixtures.py` with `MarkingChainTestCase` or
      `create_marking_chain()` helper.
- [ ] Four existing test classes migrate to the shared fixture.
- [ ] Each migrated class loses its `setUp` body (or trims to class-specific
      additions only).
- [ ] All 90 marking tests continue to pass:
      `DJANGO_SETTINGS_MODULE=django_Admin3.settings.test python -m pytest marking/tests/ -v`
- [ ] Run time for the marking test file measurably decreases (optional
      validation — `setUpTestData` should make the file noticeably faster
      since the chain is built once per class, not once per test).

## Risks

- **Subject/ExamSession uniqueness.** Per-class shared data means
  all tests in a class share the same `Subject.code='FIX'`, `session_code='FIXTURE2026'`,
  `CatalogProduct.code='FIX01'`. If any test needs a *second* instance
  with different codes, it can still create one — shared fixtures don't
  block ad-hoc additions.
- **Per-test mutation.** If a test mutates a shared fixture (e.g., deletes
  the student), downstream tests in the same class may see the mutation.
  Django's `TestCase` wraps each test in a transaction rolled back at
  teardown, so DB-level changes are reverted. But Python-side in-memory
  mutations to the cached instance (e.g., `cls.student.name = 'X'`) do
  persist across tests in the class. Low risk in practice — just a thing
  to watch.

## Non-goals

- Do not also touch `test_views.py` (the existing `MarkingPaperTestCase`
  has its own separate duplication that predates this branch — fix that
  in the same PR if trivial, otherwise leave alone).
- Do not generalize the fixture helper for other apps. Scope is strictly
  `marking/tests/`.
