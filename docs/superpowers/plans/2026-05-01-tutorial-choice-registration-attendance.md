# Tutorial Choice, Registration, Attendance & Swap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the backend models, CSV full-sync importer, and API for capturing student tutorial choices at order time, ingesting external enrolment, recording per-session attendance, and processing student-initiated session swaps.

**Architecture:** Five new Django models in the `tutorials` app under the existing `acted` PostgreSQL schema. `TutorialChoice` (intent, captured at checkout) is decoupled from `TutorialRegistration` (state, owned exclusively by a CSV full-sync importer). `TutorialAttendance` is per-registration. `TutorialSessionSwap` records the request lifecycle but never directly mutates registrations — the next CSV sync flips swaps from `APPROVED` to `APPLIED` once the external system reflects the change.

**Tech Stack:** Django 6.0, Django REST Framework, PostgreSQL (`acted` schema), pytest-style `APITestCase`/`TestCase`. All tests must run against PostgreSQL — never SQLite (per `CLAUDE.md`).

**Reference spec:** `docs/superpowers/specs/2026-05-01-tutorial-choice-registration-attendance-design.md`

**Conventions for this plan:**
- All new models live under `backend/django_Admin3/tutorials/models/` and are registered in `backend/django_Admin3/tutorials/models/__init__.py`.
- All `db_table` values use the schema-quoted form `'"acted"."<table>"'` (per `CLAUDE.md`).
- All migrations are in `backend/django_Admin3/tutorials/migrations/` and continue the existing numbering (currently up to `0013_drop_legacy_session_varchar_columns.py`).
- All commands assume cwd `backend/django_Admin3/` with `.\.venv\Scripts\activate` already done on Windows.
- Tests for new models go under `backend/django_Admin3/tutorials/tests/` (existing pattern).

---

## Phase 0 — Precursor: TutorialEvents.course_template FK

The swap validator needs to assert "same course template" between source session and target session. `TutorialEvents` does not currently have a `course_template` FK. Add it as a nullable FK now (back-fill is out of scope for this plan; the importer/validators handle null gracefully — see Task 4.4).

---

## Phase 0' — Tutorial events/sessions importer (added 2026-05-01)

### Why this exists

The orders backfill (Phase 5, planned) needs to resolve `xname + csitting` in `tutorial_orders.csv` to a `TutorialEvents` row. The historical 2024 sittings (24A/24S) currently have **0 events in the DB**. This phase imports them from `docs/misc/tutorial_import.csv` (7,603 rows: one event header + N session rows per event).

### CSV format

Columns: `Code, Title, Start Date, Start Time, End Date, End Time, Venue, Sold Out, Finalisation date, remain_space, Location, main instructor, Instructors, Sequence`

- **Event header row**: `Sequence` is empty; `Finalisation date` and `remain_space` populated; `main instructor` populated.
- **Session row**: `Sequence` is `1..N`; `Finalisation date` and `remain_space` empty; `main instructor` empty.
- **Code**: variation code, e.g. `CB1_LO_6`, `CB2_f2f_4` — matches orders CSV `xcode`.
- **Title**: event code `CB1-01-24A` (event row) or session code `CB1-01-24A-1` (session row). The third `-` segment encodes the sitting (`24A`, `24S`).

### Resolution rules

1. Parse Title → `subject_code = first segment`, `sitting_short = third segment`.
2. `ExamSession.session_code` derivation: `24A → "24"`, `24S → "24S"`. Generally: trailing `A` → strip; trailing `S` → keep.
3. `get_or_create` chain for catalog dependencies:
   - `Subject(code=subject_code)` (description fallback `f"{subject_code} subject"`).
   - `ExamSession(session_code=...)` (start/end dates from event row's Start/End Date, since CSV doesn't carry session boundaries explicitly).
   - `ExamSessionSubject(exam_session, subject)`.
   - `ProductVariation(code=Code, name=Code, variation_type='Tutorial')`.
   - `Product(code=Code, fullname=Code, shortname=Code)` (catalog Product).
   - `ProductProductVariation(product=cat_prod, product_variation=pv)`.
   - `store.Product(exam_session_subject=ess, product_product_variation=ppv, product_code=Code)` — **explicitly setting product_code skips auto-generation** (see `store/models/product.py:55-82`).
4. `get_or_create` chain for tutorial dependencies:
   - `TutorialLocation(name=Location)` (`code` derived: first 3 letters uppercase, e.g. `Lon`, `Edi`, `Liv`).
   - `TutorialVenue(name=Venue, location=loc)`.
   - `TutorialInstructor` per name in `Instructors` (semicolon-separated): create `auth.User` (username = slugified name, no password / unusable password) → `staff.Staff` → `TutorialInstructor`.

### Truncation and import

After all dependencies are resolved (or created), the command truncates `tutorial_session_instructors`, `tutorial_sessions`, `tutorial_events` (in that order to respect FK constraints) and re-inserts from CSV. This is **destructive** so it must be gated behind `--commit` (default `--dry-run` reports counts only).

### Tasks

- **Task 0'.1**: Parser (`tutorials/services/event_csv_parser.py`) — turns CSV stream into `[ParsedEvent(header, sessions=[ParsedSession])]`.
- **Task 0'.2**: Resolver helpers (`tutorials/services/event_csv_resolver.py`) — `get_or_create` for each dependency chain.
- **Task 0'.3**: Orchestrator (`tutorials/services/event_csv_importer.py`) — truncate + bulk insert, returns counts and error list.
- **Task 0'.4**: Management command `import_tutorial_events_csv` with `--dry-run`/`--commit` flags.

Each task follows TDD: failing test → minimal impl → green → commit.

---

### Task 0.1: Add nullable `course_template` FK to TutorialEvents

**Files:**
- Modify: `backend/django_Admin3/tutorials/models/tutorial_events.py`
- Create: `backend/django_Admin3/tutorials/migrations/0014_tutorialevents_course_template.py`
- Create: `backend/django_Admin3/tutorials/tests/test_tutorial_event_course_template.py`

- [ ] **Step 1: Write the failing test**

Create `backend/django_Admin3/tutorials/tests/test_tutorial_event_course_template.py`:

```python
"""Tests for TutorialEvents.course_template FK (Task 0.1)."""
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta

from tutorials.models import TutorialEvents, TutorialCourseTemplate
from store.models import Product as StoreProduct
from catalog.models import (
    ExamSession, ExamSessionSubject, Subject, Product,
    ProductVariation, ProductProductVariation,
)


class TutorialEventCourseTemplateTests(TestCase):
    def setUp(self):
        es = ExamSession.objects.create(
            session_code='APR2026',
            start_date=timezone.now() + timedelta(days=30),
            end_date=timezone.now() + timedelta(days=60),
        )
        subj = Subject.objects.create(code='CM2', description='Financial Eng', active=True)
        ess = ExamSessionSubject.objects.create(exam_session=es, subject=subj)
        prod = Product.objects.create(code='TUT_CT', fullname='Tutorial', shortname='Tut')
        pv = ProductVariation.objects.create(
            code='F2F', name='Face to Face', description='', description_short='F2F',
            variation_type='Tutorial',
        )
        ppv = ProductProductVariation.objects.create(product=prod, product_variation=pv)
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=ess, product_product_variation=ppv,
            product_code='CM2/TF2FTUT_CT/APR2026',
        )

    def test_course_template_is_nullable(self):
        event = TutorialEvents.objects.create(
            code='EV-NULL-CT',
            store_product=self.store_product,
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=2)).date(),
        )
        self.assertIsNone(event.course_template)

    def test_course_template_can_be_set(self):
        ct = TutorialCourseTemplate.objects.create(code='CT-001', title='Weekend Series')
        event = TutorialEvents.objects.create(
            code='EV-WITH-CT',
            store_product=self.store_product,
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timedelta(days=2)).date(),
            course_template=ct,
        )
        self.assertEqual(event.course_template, ct)
        self.assertIn(event, ct.events.all())
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_tutorial_event_course_template -v 2
```
Expected: FAIL with `TypeError: 'course_template' is an invalid keyword argument` or similar.

- [ ] **Step 3: Modify the model**

Edit `backend/django_Admin3/tutorials/models/tutorial_events.py`. Add the FK after `main_instructor` (around line 42):

```python
    main_instructor = models.ForeignKey(
        'tutorials.TutorialInstructor',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tutorial_events',
    )
    course_template = models.ForeignKey(
        'tutorials.TutorialCourseTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='events',
    )
    store_product = models.ForeignKey(
```

- [ ] **Step 4: Generate the migration**

```bash
python manage.py makemigrations tutorials --name tutorialevents_course_template
```
Expected output: creates `0014_tutorialevents_course_template.py` (or similar number — adjust file path references in this plan if Django picks a different number).

- [ ] **Step 5: Run migration and tests**

```bash
python manage.py migrate tutorials
python manage.py test tutorials.tests.test_tutorial_event_course_template -v 2
```
Expected: migration applies cleanly, both tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/tutorials/models/tutorial_events.py \
        backend/django_Admin3/tutorials/migrations/0014_tutorialevents_course_template.py \
        backend/django_Admin3/tutorials/tests/test_tutorial_event_course_template.py
git commit -m "feat(tutorials): add nullable course_template FK to TutorialEvents"
```

---

## Phase 1 — Models

All five new models. Each task is RED → GREEN → REFACTOR → COMMIT.

A shared test helper for fixtures is added in Task 1.0 to keep individual model tests focused.

---

### Task 1.0: Shared test fixtures helper

**Files:**
- Create: `backend/django_Admin3/tutorials/tests/factories.py`

- [ ] **Step 1: Create the helper module**

```python
"""Shared object factories for tutorial-enrolment tests."""
from datetime import timedelta
from django.contrib.auth.models import User
from django.utils import timezone

from catalog.models import (
    ExamSession, ExamSessionSubject, Subject, Product,
    ProductVariation, ProductProductVariation, ProductGroup,
)
from store.models import Product as StoreProduct
from students.models import Student
from tutorials.models import (
    TutorialEvents, TutorialSessions, TutorialCourseTemplate,
)


def make_subject(code='CM2'):
    return Subject.objects.create(code=code, description=f'{code} subject', active=True)


def make_exam_session(code='APR2026'):
    return ExamSession.objects.create(
        session_code=code,
        start_date=timezone.now() + timedelta(days=30),
        end_date=timezone.now() + timedelta(days=60),
    )


def make_store_product(subject=None, variation_type='Tutorial', variation_code='F2F',
                      product_code='CM2/TF2FTUT/APR2026', exam_session=None):
    subject = subject or make_subject()
    exam_session = exam_session or make_exam_session()
    ess = ExamSessionSubject.objects.create(exam_session=exam_session, subject=subject)
    prod = Product.objects.create(code='TUT', fullname='Tutorial', shortname='Tut')
    pv = ProductVariation.objects.create(
        code=variation_code, name=variation_type, description='',
        description_short=variation_code, variation_type=variation_type,
    )
    ppv = ProductProductVariation.objects.create(product=prod, product_variation=pv)
    return StoreProduct.objects.create(
        exam_session_subject=ess, product_product_variation=ppv,
        product_code=product_code,
    )


def make_event(course_template=None, store_product=None, code='EV-001'):
    sp = store_product or make_store_product()
    ct = course_template or TutorialCourseTemplate.objects.create(
        code=f'CT-{code}', title=f'Course Template for {code}',
    )
    return TutorialEvents.objects.create(
        code=code, store_product=sp, course_template=ct,
        start_date=timezone.now().date(),
        end_date=(timezone.now() + timedelta(days=2)).date(),
    )


def make_session(event=None, sequence=1, title=None):
    event = event or make_event()
    title = title or f'{event.code} Day {sequence}'
    return TutorialSessions.objects.create(
        tutorial_event=event,
        title=title,
        sequence=sequence,
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(hours=6),
    )


def make_student(username='alice'):
    user = User.objects.create_user(username=username, email=f'{username}@test.com')
    return Student.objects.create(user=user)
```

- [ ] **Step 2: Sanity check it imports**

```bash
python manage.py shell -c "from tutorials.tests.factories import make_event; print(make_event())"
```
Expected: prints a `TutorialEvents` instance representation, no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/django_Admin3/tutorials/tests/factories.py
git commit -m "test(tutorials): add shared factories for enrolment model tests"
```

---

### Task 1.1: TutorialChoice model

**Files:**
- Create: `backend/django_Admin3/tutorials/models/tutorial_choice.py`
- Create: `backend/django_Admin3/tutorials/services/__init__.py` (if not present)
- Create: `backend/django_Admin3/tutorials/services/online_classroom.py`
- Modify: `backend/django_Admin3/tutorials/models/__init__.py`
- Create: `backend/django_Admin3/tutorials/migrations/0015_tutorial_choice.py` (number may shift)
- Create: `backend/django_Admin3/tutorials/tests/test_tutorial_choice.py`

- [ ] **Step 1: Write the failing test**

```python
"""Tests for TutorialChoice (Task 1.1)."""
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from tutorials.models import TutorialChoice
from tutorials.tests import factories


def _make_order_item(student, store_product):
    """Minimal OrderItem creation for tests."""
    from orders.models import Order, OrderItem
    order = Order.objects.create(user=student.user)
    return OrderItem.objects.create(order=order, purchasable=store_product.purchasable_ptr)


class TutorialChoiceTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.subject = factories.make_subject('CM2')
        self.sp = factories.make_store_product(subject=self.subject)
        self.event_a = factories.make_event(store_product=self.sp, code='EV-A')
        self.event_b = factories.make_event(store_product=self.sp, code='EV-B')
        self.order_item = _make_order_item(self.student, self.sp)

    def test_creates_choice_with_valid_rank(self):
        c = TutorialChoice.objects.create(
            order_item=self.order_item, student=self.student,
            tutorial_event=self.event_a, choice_rank=1,
        )
        self.assertEqual(c.choice_rank, 1)

    def test_rejects_rank_outside_1_to_3(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                TutorialChoice.objects.create(
                    order_item=self.order_item, student=self.student,
                    tutorial_event=self.event_a, choice_rank=4,
                )

    def test_unique_rank_per_order_item(self):
        TutorialChoice.objects.create(
            order_item=self.order_item, student=self.student,
            tutorial_event=self.event_a, choice_rank=1,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                TutorialChoice.objects.create(
                    order_item=self.order_item, student=self.student,
                    tutorial_event=self.event_b, choice_rank=1,
                )

    def test_unique_event_per_order_item(self):
        TutorialChoice.objects.create(
            order_item=self.order_item, student=self.student,
            tutorial_event=self.event_a, choice_rank=1,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                TutorialChoice.objects.create(
                    order_item=self.order_item, student=self.student,
                    tutorial_event=self.event_a, choice_rank=2,
                )

    def test_clean_rejects_online_classroom_event(self):
        oc_sp = factories.make_store_product(
            subject=self.subject, variation_type='Online Classroom Recording',
            variation_code='OC', product_code='CM2/OC/APR2026',
        )
        oc_event = factories.make_event(store_product=oc_sp, code='EV-OC')
        choice = TutorialChoice(
            order_item=self.order_item, student=self.student,
            tutorial_event=oc_event, choice_rank=1,
        )
        with self.assertRaises(ValidationError) as ctx:
            choice.full_clean()
        self.assertIn('Online Classroom', str(ctx.exception))

    def test_clean_rejects_event_with_mismatched_subject(self):
        other_subj = factories.make_subject('SA1')
        other_sp = factories.make_store_product(
            subject=other_subj, product_code='SA1/TF2FTUT/APR2026',
        )
        other_event = factories.make_event(store_product=other_sp, code='EV-SA1')
        choice = TutorialChoice(
            order_item=self.order_item, student=self.student,
            tutorial_event=other_event, choice_rank=1,
        )
        with self.assertRaises(ValidationError) as ctx:
            choice.full_clean()
        self.assertIn('subject', str(ctx.exception).lower())
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_tutorial_choice -v 2
```
Expected: FAIL — `TutorialChoice` doesn't exist yet.

- [ ] **Step 3: Create the OC detection helper**

`backend/django_Admin3/tutorials/services/__init__.py` — leave empty if not present, or no-op.

Create `backend/django_Admin3/tutorials/services/online_classroom.py`:

```python
"""Helper: detect whether a TutorialEvents instance is an Online Classroom variant.

Online Classroom is identified by the variation type name 'Online Classroom Recording'
(matches the ProductGroup name used in catalog navigation views).
"""
ONLINE_CLASSROOM_VARIATION_TYPE = 'Online Classroom Recording'


def is_online_classroom_event(event) -> bool:
    """Return True if the event's store_product is an Online Classroom variation."""
    try:
        variation_type = (
            event.store_product
            .product_product_variation
            .product_variation
            .variation_type
        )
    except AttributeError:
        return False
    return variation_type == ONLINE_CLASSROOM_VARIATION_TYPE
```

- [ ] **Step 4: Create the model**

`backend/django_Admin3/tutorials/models/tutorial_choice.py`:

```python
"""TutorialChoice — student preference (1st/2nd/3rd) per order item."""
from django.core.exceptions import ValidationError
from django.db import models

from tutorials.services.online_classroom import is_online_classroom_event


class TutorialChoice(models.Model):
    CHOICE_RANKS = [(1, '1st'), (2, '2nd'), (3, '3rd')]

    order_item = models.ForeignKey(
        'orders.OrderItem', on_delete=models.CASCADE, related_name='tutorial_choices',
    )
    student = models.ForeignKey(
        'students.Student', on_delete=models.PROTECT, related_name='tutorial_choices',
    )
    tutorial_event = models.ForeignKey(
        'tutorials.TutorialEvents', on_delete=models.PROTECT, related_name='chosen_by',
    )
    choice_rank = models.PositiveSmallIntegerField(choices=CHOICE_RANKS)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_choices"'
        constraints = [
            models.UniqueConstraint(
                fields=['order_item', 'choice_rank'],
                name='uniq_choice_rank_per_order_item',
            ),
            models.UniqueConstraint(
                fields=['order_item', 'tutorial_event'],
                name='uniq_event_per_order_item',
            ),
            models.CheckConstraint(
                check=models.Q(choice_rank__in=[1, 2, 3]),
                name='choice_rank_in_1_2_3',
            ),
        ]
        verbose_name = 'Tutorial Choice'
        verbose_name_plural = 'Tutorial Choices'

    def clean(self):
        super().clean()
        if is_online_classroom_event(self.tutorial_event):
            raise ValidationError({
                'tutorial_event': 'Online Classroom events cannot be chosen — '
                                  'students are auto-enrolled in OC products.'
            })
        try:
            event_subject = self.tutorial_event.store_product.exam_session_subject.subject_id
            order_subject = (
                self.order_item.purchasable.product.exam_session_subject.subject_id
            )
        except AttributeError:
            return
        if event_subject != order_subject:
            raise ValidationError({
                'tutorial_event': "Event subject does not match the order item's subject.",
            })

    def __str__(self):
        return f"{self.student} → {self.tutorial_event} (#{self.choice_rank})"
```

- [ ] **Step 5: Register the model in __init__**

Edit `backend/django_Admin3/tutorials/models/__init__.py`:

```python
from django.db import models
from .tutorial_events import TutorialEvents
from .tutorial_sessions import TutorialSessions
from .tutorial_course_template import TutorialCourseTemplate
from .tutorial_instructor import TutorialInstructor
from .tutorial_location import TutorialLocation
from .tutorial_venue import TutorialVenue
from .tutorial_choice import TutorialChoice
```

- [ ] **Step 6: Generate and apply migration**

```bash
python manage.py makemigrations tutorials --name tutorial_choice
python manage.py migrate tutorials
```

- [ ] **Step 7: Run tests**

```bash
python manage.py test tutorials.tests.test_tutorial_choice -v 2
```
Expected: 6 tests PASS.

- [ ] **Step 8: Verify schema placement**

```bash
python manage.py verify_schema_placement
```
Expected: no errors for `tutorial_choices`.

- [ ] **Step 9: Commit**

```bash
git add backend/django_Admin3/tutorials/models/tutorial_choice.py \
        backend/django_Admin3/tutorials/models/__init__.py \
        backend/django_Admin3/tutorials/services/online_classroom.py \
        backend/django_Admin3/tutorials/migrations/0015_tutorial_choice.py \
        backend/django_Admin3/tutorials/tests/test_tutorial_choice.py
git commit -m "feat(tutorials): add TutorialChoice model with OC and subject guards"
```

---

### Task 1.2: TutorialRegistration model + custom manager

**Files:**
- Create: `backend/django_Admin3/tutorials/models/tutorial_registration.py`
- Modify: `backend/django_Admin3/tutorials/models/__init__.py`
- Create: `backend/django_Admin3/tutorials/migrations/0016_tutorial_registration.py`
- Create: `backend/django_Admin3/tutorials/tests/test_tutorial_registration.py`

> **Note on FK ordering:** This task references `TutorialEnrolmentImport` as a string ('tutorials.TutorialEnrolmentImport') for the `import_batch` FK. The actual `TutorialEnrolmentImport` model is created in Task 1.5; until then the FK is a forward string reference and the migration in this task does NOT create that table. Django handles this correctly because the FK target is resolved lazily.

- [ ] **Step 1: Write the failing test**

`backend/django_Admin3/tutorials/tests/test_tutorial_registration.py`:

```python
"""Tests for TutorialRegistration (Task 1.2)."""
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone

from tutorials.models import TutorialRegistration
from tutorials.tests import factories
from tutorials.tests.test_tutorial_choice import _make_order_item


class TutorialRegistrationTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event)
        self.order_item = _make_order_item(self.student, self.sp)

    def test_creates_registration_active_by_default(self):
        reg = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
            order_item=self.order_item,
        )
        self.assertTrue(reg.is_active)
        self.assertIsNone(reg.deactivated_at)

    def test_default_manager_excludes_inactive(self):
        reg = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
            order_item=self.order_item,
        )
        reg.is_active = False
        reg.deactivated_at = timezone.now()
        reg.save()
        self.assertEqual(TutorialRegistration.objects.count(), 0)
        self.assertEqual(TutorialRegistration.objects_all.count(), 1)

    def test_partial_unique_active_per_student_session(self):
        TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
            order_item=self.order_item,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                TutorialRegistration.objects.create(
                    student=self.student, tutorial_session=self.session,
                    order_item=self.order_item,
                )

    def test_inactive_row_does_not_block_new_active_row(self):
        old = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
            order_item=self.order_item,
        )
        old.is_active = False
        old.deactivated_at = timezone.now()
        old.save()
        new = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
            order_item=self.order_item,
        )
        self.assertNotEqual(old.pk, new.pk)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_tutorial_registration -v 2
```
Expected: FAIL — `TutorialRegistration` doesn't exist.

- [ ] **Step 3: Create the model**

`backend/django_Admin3/tutorials/models/tutorial_registration.py`:

```python
"""TutorialRegistration — session-level enrolment owned by CSV sync."""
from django.db import models


class ActiveRegistrationManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_active=True)


class TutorialRegistration(models.Model):
    student = models.ForeignKey(
        'students.Student', on_delete=models.PROTECT, related_name='tutorial_registrations',
    )
    tutorial_session = models.ForeignKey(
        'tutorials.TutorialSessions', on_delete=models.PROTECT, related_name='registrations',
    )
    order_item = models.ForeignKey(
        'orders.OrderItem', on_delete=models.PROTECT, related_name='tutorial_registrations',
    )
    tutorial_choice = models.ForeignKey(
        'tutorials.TutorialChoice', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='registrations',
    )
    is_active = models.BooleanField(default=True)
    import_batch = models.ForeignKey(
        'tutorials.TutorialEnrolmentImport', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='registrations',
    )
    deactivated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = ActiveRegistrationManager()
    objects_all = models.Manager()

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_registrations"'
        default_manager_name = 'objects'
        base_manager_name = 'objects_all'
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'tutorial_session'],
                condition=models.Q(is_active=True),
                name='uniq_active_reg_per_student_session',
            ),
        ]
        verbose_name = 'Tutorial Registration'
        verbose_name_plural = 'Tutorial Registrations'

    def __str__(self):
        return f"{self.student} → {self.tutorial_session} (active={self.is_active})"
```

- [ ] **Step 4: Register in __init__**

Add to `backend/django_Admin3/tutorials/models/__init__.py`:

```python
from .tutorial_registration import TutorialRegistration
```

- [ ] **Step 5: Generate migration**

```bash
python manage.py makemigrations tutorials --name tutorial_registration
```
Expected: creates `0016_tutorial_registration.py`. Django will warn that `tutorials.TutorialEnrolmentImport` doesn't exist yet — that's fine, the FK is created as a stub and resolved when Task 1.5 lands. **Open the generated migration and confirm the `import_batch` field uses `to='tutorials.TutorialEnrolmentImport'` as a string reference**, not a hard import. If Django generated an error instead, temporarily comment out the `import_batch` FK in the model, regenerate, then re-add it after Task 1.5.

- [ ] **Step 6: Apply and test**

```bash
python manage.py migrate tutorials
python manage.py test tutorials.tests.test_tutorial_registration -v 2
```
Expected: 4 tests PASS.

- [ ] **Step 7: Verify schema placement**

```bash
python manage.py verify_schema_placement
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add backend/django_Admin3/tutorials/models/tutorial_registration.py \
        backend/django_Admin3/tutorials/models/__init__.py \
        backend/django_Admin3/tutorials/migrations/0016_tutorial_registration.py \
        backend/django_Admin3/tutorials/tests/test_tutorial_registration.py
git commit -m "feat(tutorials): add TutorialRegistration with soft-delete manager"
```

---

### Task 1.3: TutorialAttendance model

**Files:**
- Create: `backend/django_Admin3/tutorials/models/tutorial_attendance.py`
- Modify: `backend/django_Admin3/tutorials/models/__init__.py`
- Create: `backend/django_Admin3/tutorials/migrations/0017_tutorial_attendance.py`
- Create: `backend/django_Admin3/tutorials/tests/test_tutorial_attendance.py`

- [ ] **Step 1: Write the failing test**

```python
"""Tests for TutorialAttendance (Task 1.3)."""
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from tutorials.models import TutorialAttendance, TutorialRegistration
from tutorials.tests import factories
from tutorials.tests.test_tutorial_choice import _make_order_item


class TutorialAttendanceTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.staff = User.objects.create_user(username='staff', email='s@t.com')
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event)
        self.order_item = _make_order_item(self.student, self.sp)
        self.reg = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
            order_item=self.order_item,
        )

    def test_creates_attendance_with_attended_status(self):
        a = TutorialAttendance.objects.create(
            registration=self.reg, status='ATTENDED',
            recorded_by=self.staff, recorded_at=timezone.now(),
        )
        self.assertEqual(a.status, 'ATTENDED')

    def test_other_status_requires_reason(self):
        a = TutorialAttendance(
            registration=self.reg, status='OTHER', reason='',
            recorded_by=self.staff, recorded_at=timezone.now(),
        )
        with self.assertRaises(ValidationError) as ctx:
            a.full_clean()
        self.assertIn('reason', str(ctx.exception).lower())

    def test_other_status_with_reason_validates(self):
        a = TutorialAttendance(
            registration=self.reg, status='OTHER', reason='Family emergency',
            recorded_by=self.staff, recorded_at=timezone.now(),
        )
        a.full_clean()  # should not raise

    def test_one_attendance_per_registration(self):
        from django.db import IntegrityError, transaction
        TutorialAttendance.objects.create(
            registration=self.reg, status='ATTENDED',
            recorded_by=self.staff, recorded_at=timezone.now(),
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                TutorialAttendance.objects.create(
                    registration=self.reg, status='ABSENT',
                    recorded_by=self.staff, recorded_at=timezone.now(),
                )
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_tutorial_attendance -v 2
```
Expected: FAIL.

- [ ] **Step 3: Create the model**

`backend/django_Admin3/tutorials/models/tutorial_attendance.py`:

```python
"""TutorialAttendance — per-registration attendance record."""
from django.core.exceptions import ValidationError
from django.db import models


class TutorialAttendance(models.Model):
    STATUS_CHOICES = [
        ('ATTENDED', 'Attended'),
        ('ABSENT', 'Absent'),
        ('LATE', 'Late'),
        ('OTHER', 'Other'),
    ]

    registration = models.OneToOneField(
        'tutorials.TutorialRegistration', on_delete=models.CASCADE,
        related_name='attendance',
    )
    status = models.CharField(max_length=16, choices=STATUS_CHOICES)
    reason = models.TextField(blank=True, default='')
    recorded_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='recorded_tutorial_attendance',
    )
    recorded_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_attendance"'
        verbose_name = 'Tutorial Attendance'
        verbose_name_plural = 'Tutorial Attendance'

    def clean(self):
        super().clean()
        if self.status == 'OTHER' and not (self.reason or '').strip():
            raise ValidationError({
                'reason': "Reason is required when status is OTHER.",
            })

    def __str__(self):
        return f"{self.registration} : {self.status}"
```

- [ ] **Step 4: Register in __init__**

```python
from .tutorial_attendance import TutorialAttendance
```

- [ ] **Step 5: Migrate and test**

```bash
python manage.py makemigrations tutorials --name tutorial_attendance
python manage.py migrate tutorials
python manage.py test tutorials.tests.test_tutorial_attendance -v 2
python manage.py verify_schema_placement
```
Expected: 4 tests PASS, schema OK.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/tutorials/models/tutorial_attendance.py \
        backend/django_Admin3/tutorials/models/__init__.py \
        backend/django_Admin3/tutorials/migrations/0017_tutorial_attendance.py \
        backend/django_Admin3/tutorials/tests/test_tutorial_attendance.py
git commit -m "feat(tutorials): add TutorialAttendance model"
```

---

### Task 1.4: TutorialSessionSwap model

**Files:**
- Create: `backend/django_Admin3/tutorials/models/tutorial_session_swap.py`
- Modify: `backend/django_Admin3/tutorials/models/__init__.py`
- Create: `backend/django_Admin3/tutorials/migrations/0018_tutorial_session_swap.py`
- Create: `backend/django_Admin3/tutorials/tests/test_tutorial_session_swap.py`

- [ ] **Step 1: Write the failing test**

```python
"""Tests for TutorialSessionSwap (Task 1.4)."""
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from tutorials.models import (
    TutorialSessionSwap, TutorialRegistration, TutorialCourseTemplate,
)
from tutorials.tests import factories
from tutorials.tests.test_tutorial_choice import _make_order_item


class TutorialSessionSwapTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.subject = factories.make_subject('CM2')
        self.ct = TutorialCourseTemplate.objects.create(code='CT-CM2-WK', title='Weekend')
        self.sp = factories.make_store_product(subject=self.subject)
        self.event_a = factories.make_event(
            store_product=self.sp, course_template=self.ct, code='EV-A',
        )
        self.event_b = factories.make_event(
            store_product=self.sp, course_template=self.ct, code='EV-B',
        )
        self.session_a1 = factories.make_session(event=self.event_a, sequence=1, title='A1')
        self.session_b1 = factories.make_session(event=self.event_b, sequence=1, title='B1')
        self.order_item = _make_order_item(self.student, self.sp)
        self.reg_a1 = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session_a1,
            order_item=self.order_item,
        )

    def test_creates_pending_swap(self):
        s = TutorialSessionSwap.objects.create(
            student=self.student, from_registration=self.reg_a1,
            to_session=self.session_b1, reason='clash with work',
        )
        self.assertEqual(s.status, 'PENDING')

    def test_clean_rejects_same_session(self):
        s = TutorialSessionSwap(
            student=self.student, from_registration=self.reg_a1,
            to_session=self.session_a1, reason='x',
        )
        with self.assertRaises(ValidationError):
            s.full_clean()

    def test_clean_rejects_different_subject(self):
        other_subj = factories.make_subject('SA1')
        other_sp = factories.make_store_product(
            subject=other_subj, product_code='SA1/TF2FTUT/APR2026',
        )
        other_event = factories.make_event(
            store_product=other_sp, course_template=self.ct, code='EV-OTHER-SUBJ',
        )
        other_session = factories.make_session(event=other_event, sequence=1, title='OTHER1')
        s = TutorialSessionSwap(
            student=self.student, from_registration=self.reg_a1,
            to_session=other_session, reason='x',
        )
        with self.assertRaises(ValidationError) as ctx:
            s.full_clean()
        self.assertIn('subject', str(ctx.exception).lower())

    def test_clean_rejects_different_course_template(self):
        other_ct = TutorialCourseTemplate.objects.create(code='CT-CM2-WD', title='Weekday')
        other_event = factories.make_event(
            store_product=self.sp, course_template=other_ct, code='EV-OTHER-CT',
        )
        other_session = factories.make_session(event=other_event, sequence=1, title='OCT1')
        s = TutorialSessionSwap(
            student=self.student, from_registration=self.reg_a1,
            to_session=other_session, reason='x',
        )
        with self.assertRaises(ValidationError) as ctx:
            s.full_clean()
        self.assertIn('course template', str(ctx.exception).lower())

    def test_clean_rejects_inactive_from_registration(self):
        from django.utils import timezone
        self.reg_a1.is_active = False
        self.reg_a1.deactivated_at = timezone.now()
        self.reg_a1.save()
        s = TutorialSessionSwap(
            student=self.student, from_registration=self.reg_a1,
            to_session=self.session_b1, reason='x',
        )
        with self.assertRaises(ValidationError):
            s.full_clean()

    def test_only_one_pending_swap_per_from_registration(self):
        TutorialSessionSwap.objects.create(
            student=self.student, from_registration=self.reg_a1,
            to_session=self.session_b1, reason='x',
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                TutorialSessionSwap.objects.create(
                    student=self.student, from_registration=self.reg_a1,
                    to_session=self.session_b1, reason='another',
                )
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_tutorial_session_swap -v 2
```
Expected: FAIL.

- [ ] **Step 3: Create the model**

`backend/django_Admin3/tutorials/models/tutorial_session_swap.py`:

```python
"""TutorialSessionSwap — request lifecycle for session swaps."""
from django.core.exceptions import ValidationError
from django.db import models


class TutorialSessionSwap(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
        ('APPLIED', 'Applied'),
    ]

    student = models.ForeignKey(
        'students.Student', on_delete=models.PROTECT, related_name='session_swaps',
    )
    from_registration = models.ForeignKey(
        'tutorials.TutorialRegistration', on_delete=models.PROTECT,
        related_name='swap_requests_from',
    )
    to_session = models.ForeignKey(
        'tutorials.TutorialSessions', on_delete=models.PROTECT,
        related_name='swap_requests_to',
    )
    reason = models.TextField()
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='PENDING')
    requested_at = models.DateTimeField(auto_now_add=True)
    decided_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='decided_tutorial_swaps',
    )
    decided_at = models.DateTimeField(null=True, blank=True)
    decision_note = models.TextField(blank=True, default='')
    applied_at = models.DateTimeField(null=True, blank=True)
    resulting_registration = models.ForeignKey(
        'tutorials.TutorialRegistration', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='swap_requests_resulting',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_session_swaps"'
        constraints = [
            models.UniqueConstraint(
                fields=['from_registration'],
                condition=models.Q(status='PENDING'),
                name='uniq_pending_swap_per_from_reg',
            ),
        ]
        verbose_name = 'Tutorial Session Swap'
        verbose_name_plural = 'Tutorial Session Swaps'

    def clean(self):
        super().clean()
        from_session = self.from_registration.tutorial_session if self.from_registration_id else None
        if from_session and self.to_session_id == from_session.id:
            raise ValidationError({
                'to_session': 'Target session must differ from the current session.',
            })
        if from_session and self.to_session_id:
            from_event = from_session.tutorial_event
            to_event = self.to_session.tutorial_event
            from_subject = from_event.store_product.exam_session_subject.subject_id
            to_subject = to_event.store_product.exam_session_subject.subject_id
            if from_subject != to_subject:
                raise ValidationError({
                    'to_session': 'Target session must belong to an event of the same subject.',
                })
            if from_event.course_template_id != to_event.course_template_id:
                raise ValidationError({
                    'to_session': 'Target session must belong to an event with the same course template.',
                })
        if self.from_registration_id and not self.from_registration.is_active:
            raise ValidationError({
                'from_registration': 'Cannot swap from an inactive registration.',
            })

    def __str__(self):
        return f"Swap {self.from_registration} → {self.to_session} [{self.status}]"
```

- [ ] **Step 4: Register in __init__**

```python
from .tutorial_session_swap import TutorialSessionSwap
```

- [ ] **Step 5: Migrate and test**

```bash
python manage.py makemigrations tutorials --name tutorial_session_swap
python manage.py migrate tutorials
python manage.py test tutorials.tests.test_tutorial_session_swap -v 2
python manage.py verify_schema_placement
```
Expected: 6 tests PASS, schema OK.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/tutorials/models/tutorial_session_swap.py \
        backend/django_Admin3/tutorials/models/__init__.py \
        backend/django_Admin3/tutorials/migrations/0018_tutorial_session_swap.py \
        backend/django_Admin3/tutorials/tests/test_tutorial_session_swap.py
git commit -m "feat(tutorials): add TutorialSessionSwap with subject and template validation"
```

---

### Task 1.5: TutorialEnrolmentImport model

**Files:**
- Create: `backend/django_Admin3/tutorials/models/tutorial_enrolment_import.py`
- Modify: `backend/django_Admin3/tutorials/models/__init__.py`
- Create: `backend/django_Admin3/tutorials/migrations/0019_tutorial_enrolment_import.py`
- Create: `backend/django_Admin3/tutorials/tests/test_tutorial_enrolment_import.py`

- [ ] **Step 1: Write the failing test**

```python
"""Tests for TutorialEnrolmentImport (Task 1.5)."""
from django.contrib.auth.models import User
from django.test import TestCase

from tutorials.models import TutorialEnrolmentImport


class TutorialEnrolmentImportTests(TestCase):
    def test_creates_with_pending_status(self):
        u = User.objects.create_user(username='staff', email='s@t.com')
        imp = TutorialEnrolmentImport.objects.create(
            filename='enrolments.csv', uploaded_by=u,
        )
        self.assertEqual(imp.status, 'PENDING')
        self.assertEqual(imp.report, {})
        self.assertEqual(imp.total_rows, 0)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_tutorial_enrolment_import -v 2
```

- [ ] **Step 3: Create the model**

`backend/django_Admin3/tutorials/models/tutorial_enrolment_import.py`:

```python
"""TutorialEnrolmentImport — audit record per CSV import batch."""
from django.db import models


class TutorialEnrolmentImport(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('DRY_RUN', 'Dry run'),
        ('COMMITTED', 'Committed'),
        ('FAILED', 'Failed'),
    ]

    filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        'auth.User', on_delete=models.PROTECT, related_name='tutorial_imports',
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='PENDING')
    total_rows = models.IntegerField(default=0)
    created_count = models.IntegerField(default=0)
    reactivated_count = models.IntegerField(default=0)
    deactivated_count = models.IntegerField(default=0)
    unmatched_count = models.IntegerField(default=0)
    report = models.JSONField(default=dict, blank=True)
    committed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        app_label = 'tutorials'
        db_table = '"acted"."tutorial_enrolment_imports"'
        ordering = ['-uploaded_at']
        verbose_name = 'Tutorial Enrolment Import'
        verbose_name_plural = 'Tutorial Enrolment Imports'

    def __str__(self):
        return f"{self.filename} [{self.status}]"
```

- [ ] **Step 4: Register in __init__**

```python
from .tutorial_enrolment_import import TutorialEnrolmentImport
```

- [ ] **Step 5: Migrate and test**

```bash
python manage.py makemigrations tutorials --name tutorial_enrolment_import
python manage.py migrate tutorials
python manage.py test tutorials.tests.test_tutorial_enrolment_import -v 2
python manage.py verify_schema_placement
```

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/tutorials/models/tutorial_enrolment_import.py \
        backend/django_Admin3/tutorials/models/__init__.py \
        backend/django_Admin3/tutorials/migrations/0019_tutorial_enrolment_import.py \
        backend/django_Admin3/tutorials/tests/test_tutorial_enrolment_import.py
git commit -m "feat(tutorials): add TutorialEnrolmentImport audit model"
```

---

## Phase 2 — CSV Importer Service

The importer is broken into three focused units (parser, choice resolver, sync engine) plus the management command.

---

### Task 2.1: CSV parser

Parses the CSV format `session_title, student_refs` (semicolon-delimited refs). Resolves session titles to `TutorialSessions` and student_refs to `Student`. Returns structured rows + a list of unmatched issues without raising.

**Files:**
- Create: `backend/django_Admin3/tutorials/services/import_parser.py`
- Create: `backend/django_Admin3/tutorials/tests/test_import_parser.py`

- [ ] **Step 1: Write the failing test**

```python
"""Tests for import_parser (Task 2.1)."""
import io
from django.test import TestCase

from tutorials.services.import_parser import parse_csv
from tutorials.tests import factories


class ParseCsvTests(TestCase):
    def setUp(self):
        self.event = factories.make_event(code='EV-PARSE')
        self.session_1 = factories.make_session(event=self.event, sequence=1, title='Day 1')
        self.session_2 = factories.make_session(event=self.event, sequence=2, title='Day 2')
        self.alice = factories.make_student('alice')
        self.bob = factories.make_student('bob')

    def _csv(self, body):
        return io.StringIO('session_title,student_refs\n' + body)

    def test_parses_single_row(self):
        f = self._csv(f'Day 1,{self.alice.student_ref};{self.bob.student_ref}\n')
        result = parse_csv(f)
        self.assertEqual(len(result.rows), 1)
        row = result.rows[0]
        self.assertEqual(row.session_id, self.session_1.id)
        self.assertEqual(set(row.student_ids), {self.alice.student_ref, self.bob.student_ref})
        self.assertEqual(result.unmatched, [])
        self.assertEqual(result.total_rows, 1)

    def test_unknown_session_goes_to_unmatched(self):
        f = self._csv(f'Unknown Day,{self.alice.student_ref}\n')
        result = parse_csv(f)
        self.assertEqual(result.rows, [])
        self.assertEqual(len(result.unmatched), 1)
        self.assertIn('session_title', result.unmatched[0]['reason'])

    def test_unknown_student_ref_filtered_with_warning(self):
        f = self._csv(f'Day 1,{self.alice.student_ref};99999\n')
        result = parse_csv(f)
        self.assertEqual(len(result.rows), 1)
        self.assertEqual(result.rows[0].student_ids, [self.alice.student_ref])
        self.assertEqual(len(result.unmatched), 1)
        self.assertIn('99999', result.unmatched[0]['reason'])

    def test_strips_whitespace_in_refs(self):
        f = self._csv(f'Day 1, {self.alice.student_ref} ; {self.bob.student_ref} \n')
        result = parse_csv(f)
        self.assertEqual(set(result.rows[0].student_ids), {self.alice.student_ref, self.bob.student_ref})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_import_parser -v 2
```

- [ ] **Step 3: Implement the parser**

`backend/django_Admin3/tutorials/services/import_parser.py`:

```python
"""CSV parser for tutorial enrolment imports.

Format:
    session_title,student_refs
    "Day 1","12345;67890"
"""
import csv
from dataclasses import dataclass, field
from typing import List, Iterable

from students.models import Student
from tutorials.models import TutorialSessions


@dataclass
class ParsedRow:
    session_id: int
    student_ids: List[int]


@dataclass
class ParseResult:
    rows: List[ParsedRow] = field(default_factory=list)
    unmatched: List[dict] = field(default_factory=list)
    total_rows: int = 0


def parse_csv(file_obj) -> ParseResult:
    """Parse the CSV stream, resolving titles and student refs to PKs.

    Unknown session titles produce an unmatched entry and skip the row.
    Unknown student_refs are dropped from the row but produce per-ref warnings.
    """
    reader = csv.DictReader(file_obj)
    result = ParseResult()
    for raw in reader:
        result.total_rows += 1
        title = (raw.get('session_title') or '').strip()
        refs_field = (raw.get('student_refs') or '').strip()
        session = TutorialSessions.objects.filter(title=title).first()
        if not session:
            result.unmatched.append({
                'row': result.total_rows,
                'session_title': title,
                'reason': f"unknown session_title: {title!r}",
            })
            continue
        ref_strs = [s.strip() for s in refs_field.split(';') if s.strip()]
        try:
            ref_ints = [int(s) for s in ref_strs]
        except ValueError:
            result.unmatched.append({
                'row': result.total_rows,
                'session_title': title,
                'reason': f"non-integer student_ref in: {refs_field!r}",
            })
            continue
        existing = set(
            Student.objects.filter(student_ref__in=ref_ints).values_list('student_ref', flat=True)
        )
        missing = [r for r in ref_ints if r not in existing]
        for r in missing:
            result.unmatched.append({
                'row': result.total_rows,
                'session_title': title,
                'reason': f"unknown student_ref: {r}",
            })
        valid = [r for r in ref_ints if r in existing]
        if valid:
            result.rows.append(ParsedRow(session_id=session.id, student_ids=valid))
    return result
```

- [ ] **Step 4: Run tests**

```bash
python manage.py test tutorials.tests.test_import_parser -v 2
```
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/tutorials/services/import_parser.py \
        backend/django_Admin3/tutorials/tests/test_import_parser.py
git commit -m "feat(tutorials): add CSV parser for enrolment import"
```

---

### Task 2.2: Choice/order_item resolver

Given `(student_id, session)`, find the matching `(order_item, tutorial_choice)` pair using the rules from spec section 4.3.

**Files:**
- Create: `backend/django_Admin3/tutorials/services/choice_resolver.py`
- Create: `backend/django_Admin3/tutorials/tests/test_choice_resolver.py`

- [ ] **Step 1: Write the failing test**

```python
"""Tests for choice_resolver (Task 2.2)."""
from django.test import TestCase

from tutorials.models import TutorialChoice
from tutorials.services.choice_resolver import resolve_choice_for_registration
from tutorials.tests import factories
from tutorials.tests.test_tutorial_choice import _make_order_item


class ResolveChoiceTests(TestCase):
    def setUp(self):
        self.student = factories.make_student()
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event)

    def test_returns_none_when_no_choice_exists(self):
        result = resolve_choice_for_registration(self.student, self.session)
        self.assertIsNone(result.choice)
        self.assertIsNone(result.order_item)
        self.assertEqual(result.warning, '')

    def test_returns_single_match(self):
        oi = _make_order_item(self.student, self.sp)
        choice = TutorialChoice.objects.create(
            order_item=oi, student=self.student, tutorial_event=self.event, choice_rank=1,
        )
        result = resolve_choice_for_registration(self.student, self.session)
        self.assertEqual(result.choice, choice)
        self.assertEqual(result.order_item, oi)
        self.assertEqual(result.warning, '')

    def test_picks_lowest_rank_when_multiple_matches_and_warns(self):
        oi1 = _make_order_item(self.student, self.sp)
        oi2 = _make_order_item(self.student, self.sp)
        TutorialChoice.objects.create(
            order_item=oi1, student=self.student, tutorial_event=self.event, choice_rank=2,
        )
        first_choice = TutorialChoice.objects.create(
            order_item=oi2, student=self.student, tutorial_event=self.event, choice_rank=1,
        )
        result = resolve_choice_for_registration(self.student, self.session)
        self.assertEqual(result.choice, first_choice)
        self.assertEqual(result.order_item, oi2)
        self.assertIn('multiple', result.warning.lower())

    def test_skips_cancelled_order_items(self):
        oi = _make_order_item(self.student, self.sp)
        oi.is_cancelled = True
        oi.save()
        TutorialChoice.objects.create(
            order_item=oi, student=self.student, tutorial_event=self.event, choice_rank=1,
        )
        result = resolve_choice_for_registration(self.student, self.session)
        self.assertIsNone(result.choice)
        self.assertIsNone(result.order_item)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_choice_resolver -v 2
```

- [ ] **Step 3: Implement the resolver**

`backend/django_Admin3/tutorials/services/choice_resolver.py`:

```python
"""Resolve which TutorialChoice + OrderItem fulfilled a CSV-imported registration."""
from dataclasses import dataclass
from typing import Optional

from tutorials.models import TutorialChoice


@dataclass
class ChoiceResolution:
    choice: Optional[object] = None
    order_item: Optional[object] = None
    warning: str = ''


def resolve_choice_for_registration(student, session) -> ChoiceResolution:
    """Find the (choice, order_item) pair fulfilling a (student, session) row.

    Rules (spec section 4.3):
    - exactly one match → return it.
    - multiple matches → return the one with lowest choice_rank, set a warning.
    - zero matches → return empty ChoiceResolution.
    Cancelled order items are excluded.
    """
    qs = (
        TutorialChoice.objects
        .filter(
            student=student,
            tutorial_event=session.tutorial_event,
            order_item__is_cancelled=False,
        )
        .select_related('order_item')
        .order_by('choice_rank', 'created_at')
    )
    matches = list(qs)
    if not matches:
        return ChoiceResolution()
    chosen = matches[0]
    warning = ''
    if len(matches) > 1:
        warning = (
            f"multiple matching choices for student={student.student_ref} "
            f"event={session.tutorial_event.code}; picked rank {chosen.choice_rank}"
        )
    return ChoiceResolution(
        choice=chosen, order_item=chosen.order_item, warning=warning,
    )
```

- [ ] **Step 4: Run tests**

```bash
python manage.py test tutorials.tests.test_choice_resolver -v 2
```
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/tutorials/services/choice_resolver.py \
        backend/django_Admin3/tutorials/tests/test_choice_resolver.py
git commit -m "feat(tutorials): add choice resolver for CSV import"
```

---

### Task 2.3: Sync engine (diff + apply + swap reconciliation)

The core of the importer. Takes a `ParseResult` and an open `TutorialEnrolmentImport`, applies the diff transactionally, reconciles swaps. Supports dry-run.

**Files:**
- Create: `backend/django_Admin3/tutorials/services/import_sync.py`
- Create: `backend/django_Admin3/tutorials/tests/test_import_sync.py`

- [ ] **Step 1: Write the failing test**

```python
"""Tests for import_sync (Task 2.3)."""
import io
from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from tutorials.models import (
    TutorialChoice, TutorialRegistration, TutorialEnrolmentImport,
    TutorialSessionSwap,
)
from tutorials.services.import_parser import parse_csv
from tutorials.services.import_sync import run_sync
from tutorials.tests import factories
from tutorials.tests.test_tutorial_choice import _make_order_item


class RunSyncTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user(username='staff', email='s@t.com')
        self.student = factories.make_student('alice')
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp, code='EV-SYNC')
        self.session_1 = factories.make_session(event=self.event, sequence=1, title='Sync Day 1')
        self.session_2 = factories.make_session(event=self.event, sequence=2, title='Sync Day 2')
        self.order_item = _make_order_item(self.student, self.sp)
        self.choice = TutorialChoice.objects.create(
            order_item=self.order_item, student=self.student,
            tutorial_event=self.event, choice_rank=1,
        )

    def _make_import(self):
        return TutorialEnrolmentImport.objects.create(
            filename='t.csv', uploaded_by=self.staff,
        )

    def _csv_for(self, refs_per_session):
        body = 'session_title,student_refs\n'
        for title, refs in refs_per_session:
            body += f'{title},{";".join(str(r) for r in refs)}\n'
        return io.StringIO(body)

    def test_dry_run_does_not_create_registrations(self):
        f = self._csv_for([('Sync Day 1', [self.student.student_ref])])
        parsed = parse_csv(f)
        imp = self._make_import()
        run_sync(parsed, imp, commit=False)
        self.assertEqual(TutorialRegistration.objects.count(), 0)
        imp.refresh_from_db()
        self.assertEqual(imp.status, 'DRY_RUN')
        self.assertEqual(imp.created_count, 1)

    def test_commit_creates_registration_with_choice_and_import_batch(self):
        f = self._csv_for([('Sync Day 1', [self.student.student_ref])])
        parsed = parse_csv(f)
        imp = self._make_import()
        run_sync(parsed, imp, commit=True)
        reg = TutorialRegistration.objects.get()
        self.assertEqual(reg.tutorial_session, self.session_1)
        self.assertEqual(reg.tutorial_choice, self.choice)
        self.assertEqual(reg.order_item, self.order_item)
        self.assertEqual(reg.import_batch, imp)
        imp.refresh_from_db()
        self.assertEqual(imp.status, 'COMMITTED')
        self.assertIsNotNone(imp.committed_at)

    def test_missing_in_new_csv_deactivates_registration(self):
        # First import: student in session 1
        run_sync(parse_csv(self._csv_for([('Sync Day 1', [self.student.student_ref])])),
                 self._make_import(), commit=True)
        # Second import: same event but student no longer present
        imp2 = self._make_import()
        run_sync(parse_csv(self._csv_for([('Sync Day 1', [])])), imp2, commit=True)
        reg = TutorialRegistration.objects_all.get()
        self.assertFalse(reg.is_active)
        self.assertIsNotNone(reg.deactivated_at)
        imp2.refresh_from_db()
        self.assertEqual(imp2.deactivated_count, 1)

    def test_reactivates_previously_deactivated_row(self):
        run_sync(parse_csv(self._csv_for([('Sync Day 1', [self.student.student_ref])])),
                 self._make_import(), commit=True)
        run_sync(parse_csv(self._csv_for([('Sync Day 1', [])])),
                 self._make_import(), commit=True)
        imp3 = self._make_import()
        run_sync(parse_csv(self._csv_for([('Sync Day 1', [self.student.student_ref])])),
                 imp3, commit=True)
        regs = list(TutorialRegistration.objects_all.all())
        self.assertEqual(len(regs), 1)
        self.assertTrue(regs[0].is_active)
        imp3.refresh_from_db()
        self.assertEqual(imp3.reactivated_count, 1)

    def test_unmatched_when_no_choice_exists(self):
        bob = factories.make_student('bob')
        f = self._csv_for([('Sync Day 1', [bob.student_ref])])
        imp = self._make_import()
        run_sync(parse_csv(f), imp, commit=True)
        self.assertEqual(TutorialRegistration.objects.count(), 0)
        imp.refresh_from_db()
        self.assertEqual(imp.unmatched_count, 1)
        self.assertTrue(any('no matching order' in u['reason']
                            for u in imp.report['unmatched']))

    def test_only_touches_events_in_csv(self):
        other_event = factories.make_event(store_product=self.sp, code='EV-OTHER')
        other_session = factories.make_session(event=other_event, sequence=1, title='Other 1')
        # Pre-existing registration on a different event
        TutorialRegistration.objects.create(
            student=self.student, tutorial_session=other_session,
            order_item=self.order_item,
        )
        run_sync(parse_csv(self._csv_for([('Sync Day 1', [self.student.student_ref])])),
                 self._make_import(), commit=True)
        # Other registration must remain active — its event wasn't in CSV
        other_reg = TutorialRegistration.objects.get(tutorial_session=other_session)
        self.assertTrue(other_reg.is_active)

    def test_swap_reconciliation_marks_applied(self):
        # initial: registered to session_1
        run_sync(parse_csv(self._csv_for([('Sync Day 1', [self.student.student_ref])])),
                 self._make_import(), commit=True)
        reg_1 = TutorialRegistration.objects.get(tutorial_session=self.session_1)
        # student requests swap to session_2; staff approves
        swap = TutorialSessionSwap.objects.create(
            student=self.student, from_registration=reg_1,
            to_session=self.session_2, reason='swap', status='APPROVED',
            decided_by=self.staff, decided_at=timezone.now(),
        )
        # next CSV: student now in session_2
        run_sync(parse_csv(self._csv_for([
            ('Sync Day 1', []),
            ('Sync Day 2', [self.student.student_ref]),
        ])), self._make_import(), commit=True)
        swap.refresh_from_db()
        self.assertEqual(swap.status, 'APPLIED')
        self.assertIsNotNone(swap.applied_at)
        self.assertEqual(swap.resulting_registration.tutorial_session, self.session_2)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_import_sync -v 2
```

- [ ] **Step 3: Implement the sync engine**

`backend/django_Admin3/tutorials/services/import_sync.py`:

```python
"""Sync engine for tutorial enrolment CSV imports.

Spec: docs/superpowers/specs/2026-05-01-tutorial-choice-registration-attendance-design.md
section 4.2.
"""
from collections import defaultdict
from django.db import transaction
from django.utils import timezone

from tutorials.models import (
    TutorialRegistration, TutorialSessionSwap, TutorialSessions,
)
from tutorials.services.choice_resolver import resolve_choice_for_registration


def run_sync(parsed, import_batch, commit: bool):
    """Apply the diff between parsed CSV and current active registrations.

    Args:
        parsed: ParseResult from import_parser.parse_csv
        import_batch: TutorialEnrolmentImport instance to record stats against
        commit: True → apply changes; False → dry run (report only)

    Returns: the same import_batch (with counts and report populated, status updated).
    """
    # Snapshot stats; only persist via final save.
    created = reactivated = deactivated = 0
    unmatched_extra = []  # extra entries appended during sync (e.g. no-matching-choice)
    warnings = []

    # Build target set: {(student_id, session_id)}
    target = set()
    target_by_session = defaultdict(set)
    for row in parsed.rows:
        for sid in row.student_ids:
            target.add((sid, row.session_id))
            target_by_session[row.session_id].add(sid)

    # Limit "current set" to events touched by this CSV.
    touched_session_ids = list(target_by_session.keys())
    touched_event_ids = list(
        TutorialSessions.objects
        .filter(id__in=touched_session_ids)
        .values_list('tutorial_event_id', flat=True)
        .distinct()
    )

    sid = transaction.savepoint() if not commit else None
    try:
        with transaction.atomic():
            # Existing active registrations across the touched events.
            current_qs = TutorialRegistration.objects.filter(
                tutorial_session__tutorial_event_id__in=touched_event_ids,
            ).select_related('tutorial_session', 'student')
            current_set = {(r.student_id, r.tutorial_session_id): r for r in current_qs}

            # 1. INSERTs / REACTIVATEs.
            for (student_id, session_id) in target:
                if (student_id, session_id) in current_set:
                    continue
                # Try to reactivate inactive row.
                inactive = (
                    TutorialRegistration.objects_all
                    .filter(
                        student_id=student_id,
                        tutorial_session_id=session_id,
                        is_active=False,
                    )
                    .order_by('-deactivated_at')
                    .first()
                )
                session = TutorialSessions.objects.get(id=session_id)
                from students.models import Student
                student = Student.objects.get(student_ref=student_id)
                resolution = resolve_choice_for_registration(student, session)
                if not resolution.order_item:
                    unmatched_extra.append({
                        'student_ref': student_id,
                        'session_title': session.title,
                        'reason': 'no matching order/choice',
                    })
                    continue
                if resolution.warning:
                    warnings.append(resolution.warning)
                if inactive:
                    inactive.is_active = True
                    inactive.deactivated_at = None
                    inactive.import_batch = import_batch
                    inactive.tutorial_choice = resolution.choice
                    inactive.order_item = resolution.order_item
                    inactive.save()
                    reactivated += 1
                else:
                    TutorialRegistration.objects.create(
                        student=student,
                        tutorial_session=session,
                        order_item=resolution.order_item,
                        tutorial_choice=resolution.choice,
                        import_batch=import_batch,
                    )
                    created += 1

            # 2. DEACTIVATEs.
            for (key, reg) in current_set.items():
                if key not in target:
                    reg.is_active = False
                    reg.deactivated_at = timezone.now()
                    reg.save()
                    deactivated += 1

            # 3. Swap reconciliation post-pass.
            applied_swap_count = _reconcile_swaps(touched_event_ids)

            # Record stats on the import batch.
            import_batch.total_rows = parsed.total_rows
            import_batch.created_count = created
            import_batch.reactivated_count = reactivated
            import_batch.deactivated_count = deactivated
            import_batch.unmatched_count = len(parsed.unmatched) + len(unmatched_extra)
            import_batch.report = {
                'unmatched': parsed.unmatched + unmatched_extra,
                'warnings': warnings,
                'applied_swaps': applied_swap_count,
            }
            if commit:
                import_batch.status = 'COMMITTED'
                import_batch.committed_at = timezone.now()
            else:
                import_batch.status = 'DRY_RUN'
            import_batch.save()

            if not commit:
                # Roll back all DB writes done inside this atomic block, but keep
                # the report in memory by re-saving the import_batch fields after
                # rollback — we need a new transaction for that.
                transaction.set_rollback(True)
    except Exception:
        import_batch.status = 'FAILED'
        import_batch.save()
        raise

    if not commit:
        # Re-save the import_batch in a fresh transaction so the dry-run report persists.
        TutorialEnrolmentImport_save_after_rollback(import_batch)

    return import_batch


def TutorialEnrolmentImport_save_after_rollback(import_batch):
    """Persist the dry-run import_batch fields after the transactional rollback.

    Re-fetched and re-set so it survives the rollback.
    """
    from tutorials.models import TutorialEnrolmentImport
    pk = import_batch.pk
    with transaction.atomic():
        # The import_batch row was created BEFORE run_sync, so it survives rollback
        # only if it was committed before the atomic block. We refetch to confirm.
        try:
            persisted = TutorialEnrolmentImport.objects.get(pk=pk)
        except TutorialEnrolmentImport.DoesNotExist:
            # Re-create with the same pk attributes from the in-memory object.
            import_batch.pk = None
            import_batch.save()
            return
        persisted.total_rows = import_batch.total_rows
        persisted.created_count = import_batch.created_count
        persisted.reactivated_count = import_batch.reactivated_count
        persisted.deactivated_count = import_batch.deactivated_count
        persisted.unmatched_count = import_batch.unmatched_count
        persisted.report = import_batch.report
        persisted.status = import_batch.status
        persisted.save()


def _reconcile_swaps(touched_event_ids) -> int:
    """For APPROVED swaps where from_reg is now inactive AND a new active reg
    exists for to_session, mark APPLIED + link resulting_registration.
    """
    applied = 0
    candidates = TutorialSessionSwap.objects.filter(
        status='APPROVED',
        from_registration__tutorial_session__tutorial_event_id__in=touched_event_ids,
    ).select_related('from_registration', 'to_session')
    for swap in candidates:
        if swap.from_registration.is_active:
            continue
        new_reg = (
            TutorialRegistration.objects
            .filter(student=swap.student, tutorial_session=swap.to_session)
            .first()
        )
        if not new_reg:
            continue
        swap.status = 'APPLIED'
        swap.applied_at = timezone.now()
        swap.resulting_registration = new_reg
        swap.save()
        applied += 1
    return applied
```

> **Note on dry-run persistence:** the `transaction.set_rollback(True)` pattern rolls back model writes inside the atomic block, including `import_batch.save()`. We persist the import_batch _before_ entering `run_sync` (the management command/API creates it), so the row itself survives; the post-rollback helper re-applies the stat fields.

- [ ] **Step 4: Run tests**

```bash
python manage.py test tutorials.tests.test_import_sync -v 2
```
Expected: 7 tests PASS. If the dry-run test fails because the import_batch row is rolled back, adjust the management command in Task 2.4 to commit the import_batch creation in a separate transaction before calling `run_sync` — the test's `_make_import` already does this since it's outside any wrapping atomic.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/tutorials/services/import_sync.py \
        backend/django_Admin3/tutorials/tests/test_import_sync.py
git commit -m "feat(tutorials): add CSV sync engine with swap reconciliation"
```

---

### Task 2.4: Management command

**Files:**
- Create: `backend/django_Admin3/tutorials/management/commands/import_tutorial_enrolments.py`
- Create: `backend/django_Admin3/tutorials/tests/test_import_tutorial_enrolments_command.py`

- [ ] **Step 1: Write the failing test**

```python
"""Tests for import_tutorial_enrolments management command (Task 2.4)."""
import io
import tempfile
from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase

from tutorials.models import TutorialRegistration, TutorialEnrolmentImport, TutorialChoice
from tutorials.tests import factories
from tutorials.tests.test_tutorial_choice import _make_order_item


class ImportCommandTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user(username='staff', email='s@t.com')
        self.student = factories.make_student()
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event, title='Cmd Day 1')
        self.order_item = _make_order_item(self.student, self.sp)
        TutorialChoice.objects.create(
            order_item=self.order_item, student=self.student,
            tutorial_event=self.event, choice_rank=1,
        )

    def _write(self, contents):
        f = tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False, encoding='utf-8')
        f.write(contents)
        f.close()
        return f.name

    def test_dry_run_default_does_not_commit(self):
        path = self._write(f'session_title,student_refs\nCmd Day 1,{self.student.student_ref}\n')
        out = io.StringIO()
        call_command('import_tutorial_enrolments', path,
                     '--username', 'staff', stdout=out)
        self.assertEqual(TutorialRegistration.objects.count(), 0)
        imp = TutorialEnrolmentImport.objects.latest('uploaded_at')
        self.assertEqual(imp.status, 'DRY_RUN')

    def test_commit_creates_registrations(self):
        path = self._write(f'session_title,student_refs\nCmd Day 1,{self.student.student_ref}\n')
        out = io.StringIO()
        call_command('import_tutorial_enrolments', path,
                     '--username', 'staff', '--commit', stdout=out)
        self.assertEqual(TutorialRegistration.objects.count(), 1)
        imp = TutorialEnrolmentImport.objects.latest('uploaded_at')
        self.assertEqual(imp.status, 'COMMITTED')
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_import_tutorial_enrolments_command -v 2
```

- [ ] **Step 3: Implement the command**

`backend/django_Admin3/tutorials/management/commands/import_tutorial_enrolments.py`:

```python
"""Management command: import tutorial enrolment CSV (full sync)."""
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError

from tutorials.models import TutorialEnrolmentImport
from tutorials.services.import_parser import parse_csv
from tutorials.services.import_sync import run_sync


class Command(BaseCommand):
    help = 'Import tutorial enrolments from a CSV file (full sync).'

    def add_arguments(self, parser):
        parser.add_argument('csv_path')
        parser.add_argument('--username', required=True,
                            help='Username of staff performing the import.')
        parser.add_argument('--commit', action='store_true',
                            help='Apply changes (default: dry run).')

    def handle(self, *args, **opts):
        try:
            user = User.objects.get(username=opts['username'])
        except User.DoesNotExist:
            raise CommandError(f"User not found: {opts['username']}")

        path = opts['csv_path']
        with open(path, encoding='utf-8') as f:
            parsed = parse_csv(f)

        # Persist import_batch BEFORE run_sync so dry-run rollback doesn't drop it.
        imp = TutorialEnrolmentImport.objects.create(
            filename=path.split('/')[-1].split('\\')[-1],
            uploaded_by=user,
        )
        run_sync(parsed, imp, commit=opts['commit'])
        imp.refresh_from_db()

        self.stdout.write(self.style.SUCCESS(
            f"Status={imp.status} total={imp.total_rows} created={imp.created_count} "
            f"reactivated={imp.reactivated_count} deactivated={imp.deactivated_count} "
            f"unmatched={imp.unmatched_count}"
        ))
```

- [ ] **Step 4: Run tests**

```bash
python manage.py test tutorials.tests.test_import_tutorial_enrolments_command -v 2
```
Expected: 2 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/tutorials/management/commands/import_tutorial_enrolments.py \
        backend/django_Admin3/tutorials/tests/test_import_tutorial_enrolments_command.py
git commit -m "feat(tutorials): add import_tutorial_enrolments management command"
```

---

## Phase 3 — REST API

Five endpoints, mounted under `/api/tutorials/`. Each task adds the serializer + view + URL + tests in one go.

> **URL conf prerequisite:** the existing `tutorials/urls.py` already mounts the app under `/api/tutorials/`. New ViewSets are added to a new `tutorials/api/` package to keep the legacy `views.py` untouched.

---

### Task 3.1: Setup tutorials/api/ package + URL routing

**Files:**
- Create: `backend/django_Admin3/tutorials/api/__init__.py` (empty)
- Create: `backend/django_Admin3/tutorials/api/urls.py`
- Modify: `backend/django_Admin3/tutorials/urls.py`

- [ ] **Step 1: Create the api package**

```bash
mkdir -p backend/django_Admin3/tutorials/api
```

Create empty `backend/django_Admin3/tutorials/api/__init__.py`.

- [ ] **Step 2: Create the api urls module**

`backend/django_Admin3/tutorials/api/urls.py`:

```python
"""Routes for the tutorial enrolment / attendance / swap API."""
from rest_framework.routers import DefaultRouter

router = DefaultRouter()

# ViewSets registered by Tasks 3.2–3.6.
urlpatterns = router.urls
```

- [ ] **Step 3: Mount in tutorials/urls.py**

Read the current `backend/django_Admin3/tutorials/urls.py` first. Then add an `include` of the new api routes. The expected diff is:

```python
from django.urls import include, path
from . import views
from .api.urls import urlpatterns as api_urlpatterns

urlpatterns = [
    # ... existing routes ...
    path('', include((api_urlpatterns, 'tutorials_api'))),
]
```

- [ ] **Step 4: Sanity check**

```bash
python manage.py check
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/tutorials/api/ backend/django_Admin3/tutorials/urls.py
git commit -m "chore(tutorials): scaffold tutorials/api/ package and router"
```

---

### Task 3.2: TutorialChoice API (POST create choices)

Endpoint: `POST /api/tutorials/choices/` — body: `{order_item, choices: [{tutorial_event, choice_rank}, ...]}`. Creates 1–3 choices atomically for that order item. Idempotent: repeating with the same payload replaces the existing choices.

**Files:**
- Create: `backend/django_Admin3/tutorials/api/serializers/__init__.py` (empty)
- Create: `backend/django_Admin3/tutorials/api/serializers/choice.py`
- Create: `backend/django_Admin3/tutorials/api/views/__init__.py` (empty)
- Create: `backend/django_Admin3/tutorials/api/views/choice.py`
- Modify: `backend/django_Admin3/tutorials/api/urls.py`
- Create: `backend/django_Admin3/tutorials/tests/test_api_choice.py`

- [ ] **Step 1: Write the failing test**

```python
"""API tests for tutorial choices (Task 3.2)."""
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase

from tutorials.models import TutorialChoice
from tutorials.tests import factories
from tutorials.tests.test_tutorial_choice import _make_order_item


class ChoiceApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='alice', email='a@t.com')
        self.student = factories.make_student('alice2')
        self.student.user = self.user
        self.student.save()
        self.client.force_authenticate(self.user)
        self.sp = factories.make_store_product()
        self.event_a = factories.make_event(store_product=self.sp, code='EV-A')
        self.event_b = factories.make_event(store_product=self.sp, code='EV-B')
        self.order_item = _make_order_item(self.student, self.sp)

    def test_creates_three_choices(self):
        url = reverse('tutorials_api:tutorialchoice-list')
        payload = {
            'order_item': self.order_item.id,
            'choices': [
                {'tutorial_event': self.event_a.id, 'choice_rank': 1},
                {'tutorial_event': self.event_b.id, 'choice_rank': 2},
            ],
        }
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(TutorialChoice.objects.count(), 2)

    def test_replaces_existing_choices_on_repost(self):
        TutorialChoice.objects.create(
            order_item=self.order_item, student=self.student,
            tutorial_event=self.event_a, choice_rank=1,
        )
        url = reverse('tutorials_api:tutorialchoice-list')
        payload = {
            'order_item': self.order_item.id,
            'choices': [
                {'tutorial_event': self.event_b.id, 'choice_rank': 1},
            ],
        }
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(TutorialChoice.objects.count(), 1)
        self.assertEqual(TutorialChoice.objects.get().tutorial_event, self.event_b)

    def test_rejects_more_than_three_choices(self):
        url = reverse('tutorials_api:tutorialchoice-list')
        event_c = factories.make_event(store_product=self.sp, code='EV-C')
        event_d = factories.make_event(store_product=self.sp, code='EV-D')
        payload = {
            'order_item': self.order_item.id,
            'choices': [
                {'tutorial_event': self.event_a.id, 'choice_rank': 1},
                {'tutorial_event': self.event_b.id, 'choice_rank': 2},
                {'tutorial_event': event_c.id, 'choice_rank': 3},
                {'tutorial_event': event_d.id, 'choice_rank': 4},
            ],
        }
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_rejects_online_classroom_event(self):
        oc_sp = factories.make_store_product(
            variation_type='Online Classroom Recording', variation_code='OC',
            product_code='CM2/OC/APR2026',
        )
        oc_event = factories.make_event(store_product=oc_sp, code='EV-OC')
        url = reverse('tutorials_api:tutorialchoice-list')
        payload = {
            'order_item': self.order_item.id,
            'choices': [{'tutorial_event': oc_event.id, 'choice_rank': 1}],
        }
        resp = self.client.post(url, payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('Online Classroom', str(resp.content))
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_api_choice -v 2
```
Expected: FAIL — view doesn't exist.

- [ ] **Step 3: Create serializer**

`backend/django_Admin3/tutorials/api/serializers/__init__.py` — empty.

`backend/django_Admin3/tutorials/api/serializers/choice.py`:

```python
"""Serializers for TutorialChoice."""
from rest_framework import serializers

from tutorials.models import TutorialChoice


class ChoiceItemSerializer(serializers.Serializer):
    tutorial_event = serializers.IntegerField()
    choice_rank = serializers.IntegerField(min_value=1, max_value=3)


class ChoiceCreateSerializer(serializers.Serializer):
    order_item = serializers.IntegerField()
    choices = ChoiceItemSerializer(many=True)

    def validate_choices(self, value):
        if not 1 <= len(value) <= 3:
            raise serializers.ValidationError("Provide between 1 and 3 choices.")
        ranks = [c['choice_rank'] for c in value]
        if len(set(ranks)) != len(ranks):
            raise serializers.ValidationError("Duplicate choice_rank values.")
        events = [c['tutorial_event'] for c in value]
        if len(set(events)) != len(events):
            raise serializers.ValidationError("Duplicate tutorial_event values.")
        return value


class TutorialChoiceReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialChoice
        fields = ['id', 'order_item', 'student', 'tutorial_event', 'choice_rank',
                  'created_at', 'updated_at']
        read_only_fields = fields
```

- [ ] **Step 4: Create view**

`backend/django_Admin3/tutorials/api/views/__init__.py` — empty.

`backend/django_Admin3/tutorials/api/views/choice.py`:

```python
"""ViewSet for TutorialChoice — POST creates/replaces choices for an order item."""
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from orders.models import OrderItem
from tutorials.models import TutorialChoice, TutorialEvents
from tutorials.api.serializers.choice import (
    ChoiceCreateSerializer, TutorialChoiceReadSerializer,
)


class TutorialChoiceViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def create(self, request):
        ser = ChoiceCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        try:
            order_item = OrderItem.objects.select_related('order__user__student').get(
                id=data['order_item']
            )
        except OrderItem.DoesNotExist:
            return Response({'order_item': 'not found'}, status=status.HTTP_400_BAD_REQUEST)

        # Authorization: order must belong to the requesting user.
        if order_item.order.user_id != request.user.id and not request.user.is_staff:
            return Response({'detail': 'forbidden'}, status=status.HTTP_403_FORBIDDEN)

        student = order_item.order.user.student

        with transaction.atomic():
            # Replace any existing choices for this order_item (idempotent POST).
            TutorialChoice.objects.filter(order_item=order_item).delete()
            created = []
            for c in data['choices']:
                try:
                    event = TutorialEvents.objects.get(id=c['tutorial_event'])
                except TutorialEvents.DoesNotExist:
                    return Response(
                        {'tutorial_event': f"event {c['tutorial_event']} not found"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                choice = TutorialChoice(
                    order_item=order_item, student=student,
                    tutorial_event=event, choice_rank=c['choice_rank'],
                )
                try:
                    choice.full_clean()
                except DjangoValidationError as e:
                    return Response(e.message_dict, status=status.HTTP_400_BAD_REQUEST)
                choice.save()
                created.append(choice)

        return Response(
            TutorialChoiceReadSerializer(created, many=True).data,
            status=status.HTTP_201_CREATED,
        )
```

- [ ] **Step 5: Register the route**

Edit `backend/django_Admin3/tutorials/api/urls.py`:

```python
from rest_framework.routers import DefaultRouter
from tutorials.api.views.choice import TutorialChoiceViewSet

router = DefaultRouter()
router.register(r'choices', TutorialChoiceViewSet, basename='tutorialchoice')

urlpatterns = router.urls
```

- [ ] **Step 6: Run tests**

```bash
python manage.py test tutorials.tests.test_api_choice -v 2
```
Expected: 4 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/tutorials/api/ backend/django_Admin3/tutorials/tests/test_api_choice.py
git commit -m "feat(tutorials): add POST /api/tutorials/choices/ endpoint"
```

---

### Task 3.3: TutorialRegistration API (read-only list)

Endpoint: `GET /api/tutorials/registrations/` — lists the requesting user's active registrations. Staff sees all (filterable by `?student=`).

**Files:**
- Create: `backend/django_Admin3/tutorials/api/serializers/registration.py`
- Create: `backend/django_Admin3/tutorials/api/views/registration.py`
- Modify: `backend/django_Admin3/tutorials/api/urls.py`
- Create: `backend/django_Admin3/tutorials/tests/test_api_registration.py`

- [ ] **Step 1: Write the failing test**

```python
"""API tests for registrations (Task 3.3)."""
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase

from tutorials.models import TutorialRegistration
from tutorials.tests import factories
from tutorials.tests.test_tutorial_choice import _make_order_item


class RegistrationApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='alice')
        self.student = factories.make_student('alice2')
        self.student.user = self.user
        self.student.save()
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event)
        self.order_item = _make_order_item(self.student, self.sp)
        self.reg = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
            order_item=self.order_item,
        )

    def test_authenticated_user_sees_own_registrations(self):
        self.client.force_authenticate(self.user)
        resp = self.client.get(reverse('tutorials_api:tutorialregistration-list'))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['id'], self.reg.id)

    def test_unauthenticated_rejected(self):
        resp = self.client.get(reverse('tutorials_api:tutorialregistration-list'))
        self.assertEqual(resp.status_code, 401)

    def test_staff_can_filter_by_student(self):
        bob_user = User.objects.create_user(username='bob', is_staff=True)
        self.client.force_authenticate(bob_user)
        resp = self.client.get(
            reverse('tutorials_api:tutorialregistration-list')
            + f'?student={self.student.student_ref}'
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_api_registration -v 2
```

- [ ] **Step 3: Create serializer**

`backend/django_Admin3/tutorials/api/serializers/registration.py`:

```python
from rest_framework import serializers

from tutorials.models import TutorialRegistration


class TutorialRegistrationSerializer(serializers.ModelSerializer):
    session_title = serializers.CharField(source='tutorial_session.title', read_only=True)
    event_code = serializers.CharField(
        source='tutorial_session.tutorial_event.code', read_only=True,
    )

    class Meta:
        model = TutorialRegistration
        fields = ['id', 'student', 'tutorial_session', 'session_title',
                  'event_code', 'order_item', 'tutorial_choice', 'is_active',
                  'created_at', 'updated_at']
        read_only_fields = fields
```

- [ ] **Step 4: Create view**

`backend/django_Admin3/tutorials/api/views/registration.py`:

```python
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from tutorials.models import TutorialRegistration
from tutorials.api.serializers.registration import TutorialRegistrationSerializer


class TutorialRegistrationViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TutorialRegistrationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = TutorialRegistration.objects.select_related(
            'tutorial_session__tutorial_event', 'order_item', 'tutorial_choice',
        )
        user = self.request.user
        if user.is_staff:
            student_ref = self.request.query_params.get('student')
            if student_ref:
                qs = qs.filter(student__student_ref=student_ref)
            return qs
        return qs.filter(student__user=user)
```

- [ ] **Step 5: Register the route**

Edit `backend/django_Admin3/tutorials/api/urls.py` — add:

```python
from tutorials.api.views.registration import TutorialRegistrationViewSet
router.register(r'registrations', TutorialRegistrationViewSet, basename='tutorialregistration')
```

- [ ] **Step 6: Run tests**

```bash
python manage.py test tutorials.tests.test_api_registration -v 2
```
Expected: 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/tutorials/api/ backend/django_Admin3/tutorials/tests/test_api_registration.py
git commit -m "feat(tutorials): add GET /api/tutorials/registrations/ endpoint"
```

---

### Task 3.4: TutorialSessionSwap API (request, approve, reject, cancel)

Endpoints:
- `POST /api/tutorials/swaps/` — student creates a swap request (status defaults to PENDING).
- `POST /api/tutorials/swaps/<id>/approve/` — staff approves (sets status APPROVED, decided_*).
- `POST /api/tutorials/swaps/<id>/reject/` — staff rejects.
- `POST /api/tutorials/swaps/<id>/cancel/` — student cancels their own pending swap.
- `GET /api/tutorials/swaps/` — list (own for students, all for staff).

**Files:**
- Create: `backend/django_Admin3/tutorials/api/serializers/swap.py`
- Create: `backend/django_Admin3/tutorials/api/views/swap.py`
- Modify: `backend/django_Admin3/tutorials/api/urls.py`
- Create: `backend/django_Admin3/tutorials/tests/test_api_swap.py`

- [ ] **Step 1: Write the failing test**

```python
"""API tests for swaps (Task 3.4)."""
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase

from tutorials.models import (
    TutorialSessionSwap, TutorialRegistration, TutorialCourseTemplate,
)
from tutorials.tests import factories
from tutorials.tests.test_tutorial_choice import _make_order_item


class SwapApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='alice')
        self.staff = User.objects.create_user(username='staff', is_staff=True)
        self.student = factories.make_student('alice2')
        self.student.user = self.user
        self.student.save()
        ct = TutorialCourseTemplate.objects.create(code='CT-CM2-WK', title='Weekend')
        self.sp = factories.make_store_product()
        self.event_a = factories.make_event(store_product=self.sp, course_template=ct, code='EV-A')
        self.event_b = factories.make_event(store_product=self.sp, course_template=ct, code='EV-B')
        self.session_a1 = factories.make_session(event=self.event_a, sequence=1, title='A1')
        self.session_b1 = factories.make_session(event=self.event_b, sequence=1, title='B1')
        self.order_item = _make_order_item(self.student, self.sp)
        self.reg = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session_a1,
            order_item=self.order_item,
        )

    def test_student_creates_swap(self):
        self.client.force_authenticate(self.user)
        resp = self.client.post(reverse('tutorials_api:tutorialsessionswap-list'), {
            'from_registration': self.reg.id,
            'to_session': self.session_b1.id,
            'reason': 'work clash',
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        s = TutorialSessionSwap.objects.get()
        self.assertEqual(s.status, 'PENDING')
        self.assertEqual(s.student, self.student)

    def test_student_cannot_swap_someone_elses_registration(self):
        bob_user = User.objects.create_user(username='bob')
        bob = factories.make_student('bob2')
        bob.user = bob_user
        bob.save()
        self.client.force_authenticate(bob_user)
        resp = self.client.post(reverse('tutorials_api:tutorialsessionswap-list'), {
            'from_registration': self.reg.id,
            'to_session': self.session_b1.id,
            'reason': 'x',
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_staff_approves(self):
        s = TutorialSessionSwap.objects.create(
            student=self.student, from_registration=self.reg,
            to_session=self.session_b1, reason='x',
        )
        self.client.force_authenticate(self.staff)
        resp = self.client.post(
            reverse('tutorials_api:tutorialsessionswap-approve', args=[s.id]),
            {'decision_note': 'OK'}, format='json',
        )
        self.assertEqual(resp.status_code, 200)
        s.refresh_from_db()
        self.assertEqual(s.status, 'APPROVED')
        self.assertEqual(s.decided_by, self.staff)
        # Crucially: registration is NOT mutated by approval.
        self.assertTrue(TutorialRegistration.objects.get(pk=self.reg.id).is_active)

    def test_staff_rejects(self):
        s = TutorialSessionSwap.objects.create(
            student=self.student, from_registration=self.reg,
            to_session=self.session_b1, reason='x',
        )
        self.client.force_authenticate(self.staff)
        resp = self.client.post(
            reverse('tutorials_api:tutorialsessionswap-reject', args=[s.id]),
            {'decision_note': 'no capacity'}, format='json',
        )
        self.assertEqual(resp.status_code, 200)
        s.refresh_from_db()
        self.assertEqual(s.status, 'REJECTED')

    def test_student_cancels_own_pending(self):
        s = TutorialSessionSwap.objects.create(
            student=self.student, from_registration=self.reg,
            to_session=self.session_b1, reason='x',
        )
        self.client.force_authenticate(self.user)
        resp = self.client.post(
            reverse('tutorials_api:tutorialsessionswap-cancel', args=[s.id]),
            {}, format='json',
        )
        self.assertEqual(resp.status_code, 200)
        s.refresh_from_db()
        self.assertEqual(s.status, 'CANCELLED')

    def test_cannot_approve_non_pending(self):
        s = TutorialSessionSwap.objects.create(
            student=self.student, from_registration=self.reg,
            to_session=self.session_b1, reason='x', status='REJECTED',
        )
        self.client.force_authenticate(self.staff)
        resp = self.client.post(
            reverse('tutorials_api:tutorialsessionswap-approve', args=[s.id]),
            {}, format='json',
        )
        self.assertEqual(resp.status_code, 400)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_api_swap -v 2
```

- [ ] **Step 3: Create serializer**

`backend/django_Admin3/tutorials/api/serializers/swap.py`:

```python
from rest_framework import serializers

from tutorials.models import TutorialSessionSwap


class TutorialSessionSwapSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialSessionSwap
        fields = ['id', 'student', 'from_registration', 'to_session', 'reason',
                  'status', 'requested_at', 'decided_by', 'decided_at',
                  'decision_note', 'applied_at', 'resulting_registration',
                  'created_at', 'updated_at']
        read_only_fields = ['id', 'student', 'status', 'requested_at',
                            'decided_by', 'decided_at', 'applied_at',
                            'resulting_registration', 'created_at', 'updated_at']
```

- [ ] **Step 4: Create view**

`backend/django_Admin3/tutorials/api/views/swap.py`:

```python
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from tutorials.models import TutorialSessionSwap, TutorialRegistration
from tutorials.api.serializers.swap import TutorialSessionSwapSerializer


class TutorialSessionSwapViewSet(viewsets.ModelViewSet):
    serializer_class = TutorialSessionSwapSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']
    pagination_class = None

    def get_queryset(self):
        qs = TutorialSessionSwap.objects.select_related(
            'from_registration__tutorial_session', 'to_session',
        )
        user = self.request.user
        if user.is_staff:
            return qs
        return qs.filter(student__user=user)

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            from_reg = TutorialRegistration.objects.select_related(
                'student__user',
            ).get(id=ser.validated_data['from_registration'].id)
        except TutorialRegistration.DoesNotExist:
            return Response({'from_registration': 'not found'}, status=400)
        if from_reg.student.user_id != request.user.id and not request.user.is_staff:
            return Response({'detail': 'forbidden'}, status=403)
        instance = TutorialSessionSwap(
            student=from_reg.student,
            from_registration=from_reg,
            to_session=ser.validated_data['to_session'],
            reason=ser.validated_data['reason'],
        )
        try:
            instance.full_clean()
        except DjangoValidationError as e:
            return Response(e.message_dict, status=400)
        instance.save()
        return Response(self.get_serializer(instance).data, status=201)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        return self._decide(request, pk, 'APPROVED', staff_only=True)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        return self._decide(request, pk, 'REJECTED', staff_only=True)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        return self._decide(request, pk, 'CANCELLED', staff_only=False)

    def _decide(self, request, pk, target_status, staff_only):
        try:
            swap = self.get_queryset().get(pk=pk)
        except TutorialSessionSwap.DoesNotExist:
            return Response({'detail': 'not found'}, status=404)
        if staff_only and not request.user.is_staff:
            return Response({'detail': 'forbidden'}, status=403)
        if not staff_only and swap.student.user_id != request.user.id:
            return Response({'detail': 'forbidden'}, status=403)
        if swap.status != 'PENDING':
            return Response(
                {'status': f'cannot transition from {swap.status} to {target_status}'},
                status=400,
            )
        swap.status = target_status
        swap.decision_note = request.data.get('decision_note', '')
        if staff_only:
            swap.decided_by = request.user
            swap.decided_at = timezone.now()
        swap.save()
        return Response(self.get_serializer(swap).data)
```

- [ ] **Step 5: Register the route**

Edit `backend/django_Admin3/tutorials/api/urls.py` — add:

```python
from tutorials.api.views.swap import TutorialSessionSwapViewSet
router.register(r'swaps', TutorialSessionSwapViewSet, basename='tutorialsessionswap')
```

- [ ] **Step 6: Run tests**

```bash
python manage.py test tutorials.tests.test_api_swap -v 2
```
Expected: 6 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/tutorials/api/ backend/django_Admin3/tutorials/tests/test_api_swap.py
git commit -m "feat(tutorials): add swap request/approve/reject/cancel API"
```

---

### Task 3.5: TutorialAttendance API (record / update)

Endpoint: `POST /api/tutorials/attendance/` — staff records attendance against a registration. `PATCH /api/tutorials/attendance/<id>/` — update.

**Files:**
- Create: `backend/django_Admin3/tutorials/api/serializers/attendance.py`
- Create: `backend/django_Admin3/tutorials/api/views/attendance.py`
- Modify: `backend/django_Admin3/tutorials/api/urls.py`
- Create: `backend/django_Admin3/tutorials/tests/test_api_attendance.py`

- [ ] **Step 1: Write the failing test**

```python
"""API tests for attendance (Task 3.5)."""
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APITestCase

from tutorials.models import TutorialAttendance, TutorialRegistration
from tutorials.tests import factories
from tutorials.tests.test_tutorial_choice import _make_order_item


class AttendanceApiTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(username='staff', is_staff=True)
        self.student = factories.make_student()
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event)
        self.order_item = _make_order_item(self.student, self.sp)
        self.reg = TutorialRegistration.objects.create(
            student=self.student, tutorial_session=self.session,
            order_item=self.order_item,
        )

    def test_staff_records_attendance(self):
        self.client.force_authenticate(self.staff)
        resp = self.client.post(reverse('tutorials_api:tutorialattendance-list'), {
            'registration': self.reg.id, 'status': 'ATTENDED',
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.content)
        a = TutorialAttendance.objects.get()
        self.assertEqual(a.recorded_by, self.staff)

    def test_other_status_requires_reason(self):
        self.client.force_authenticate(self.staff)
        resp = self.client.post(reverse('tutorials_api:tutorialattendance-list'), {
            'registration': self.reg.id, 'status': 'OTHER',
        }, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('reason', str(resp.content).lower())

    def test_non_staff_rejected(self):
        student_user = User.objects.create_user(username='student')
        self.client.force_authenticate(student_user)
        resp = self.client.post(reverse('tutorials_api:tutorialattendance-list'), {
            'registration': self.reg.id, 'status': 'ATTENDED',
        }, format='json')
        self.assertEqual(resp.status_code, 403)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_api_attendance -v 2
```

- [ ] **Step 3: Create serializer**

`backend/django_Admin3/tutorials/api/serializers/attendance.py`:

```python
from rest_framework import serializers

from tutorials.models import TutorialAttendance


class TutorialAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialAttendance
        fields = ['id', 'registration', 'status', 'reason',
                  'recorded_by', 'recorded_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'recorded_by', 'recorded_at', 'created_at', 'updated_at']

    def validate(self, data):
        status = data.get('status')
        reason = (data.get('reason') or '').strip()
        if status == 'OTHER' and not reason:
            raise serializers.ValidationError({'reason': 'Reason required when status is OTHER.'})
        return data
```

- [ ] **Step 4: Create view**

`backend/django_Admin3/tutorials/api/views/attendance.py`:

```python
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, IsAdminUser

from tutorials.models import TutorialAttendance
from tutorials.api.serializers.attendance import TutorialAttendanceSerializer


class TutorialAttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = TutorialAttendanceSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = TutorialAttendance.objects.select_related('registration')
    pagination_class = None

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user, recorded_at=timezone.now())

    def perform_update(self, serializer):
        serializer.save(recorded_by=self.request.user, recorded_at=timezone.now())
```

- [ ] **Step 5: Register the route**

Edit `backend/django_Admin3/tutorials/api/urls.py` — add:

```python
from tutorials.api.views.attendance import TutorialAttendanceViewSet
router.register(r'attendance', TutorialAttendanceViewSet, basename='tutorialattendance')
```

- [ ] **Step 6: Run tests**

```bash
python manage.py test tutorials.tests.test_api_attendance -v 2
```
Expected: 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/tutorials/api/ backend/django_Admin3/tutorials/tests/test_api_attendance.py
git commit -m "feat(tutorials): add attendance recording API"
```

---

### Task 3.6: Import API (upload + commit)

Endpoints (staff-only):
- `POST /api/tutorials/imports/` — multipart upload of CSV file → runs dry-run → returns the `TutorialEnrolmentImport` with report.
- `POST /api/tutorials/imports/<id>/commit/` — re-runs the sync against the original file (which we persist as bytes on the import row) in commit mode.

To keep the spec simple and avoid storing CSV blobs server-side, the commit endpoint instead requires the same file to be re-uploaded. This makes the contract: dry-run preview → if happy, re-upload with `--commit`. Cleaner than a hidden file store.

**Files:**
- Create: `backend/django_Admin3/tutorials/api/serializers/import_.py`
- Create: `backend/django_Admin3/tutorials/api/views/import_.py`
- Modify: `backend/django_Admin3/tutorials/api/urls.py`
- Create: `backend/django_Admin3/tutorials/tests/test_api_import.py`

- [ ] **Step 1: Write the failing test**

```python
"""API tests for the CSV import endpoint (Task 3.6)."""
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APITestCase

from tutorials.models import (
    TutorialChoice, TutorialEnrolmentImport, TutorialRegistration,
)
from tutorials.tests import factories
from tutorials.tests.test_tutorial_choice import _make_order_item


class ImportApiTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(username='staff', is_staff=True)
        self.student = factories.make_student()
        self.sp = factories.make_store_product()
        self.event = factories.make_event(store_product=self.sp)
        self.session = factories.make_session(event=self.event, title='Imp Day 1')
        self.order_item = _make_order_item(self.student, self.sp)
        TutorialChoice.objects.create(
            order_item=self.order_item, student=self.student,
            tutorial_event=self.event, choice_rank=1,
        )

    def _csv_bytes(self):
        return f'session_title,student_refs\nImp Day 1,{self.student.student_ref}\n'.encode()

    def test_dry_run_upload(self):
        self.client.force_authenticate(self.staff)
        f = SimpleUploadedFile('e.csv', self._csv_bytes(), content_type='text/csv')
        resp = self.client.post(
            reverse('tutorials_api:tutorialenrolmentimport-list'),
            {'file': f, 'commit': 'false'}, format='multipart',
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.data['status'], 'DRY_RUN')
        self.assertEqual(TutorialRegistration.objects.count(), 0)

    def test_commit_upload_creates_registrations(self):
        self.client.force_authenticate(self.staff)
        f = SimpleUploadedFile('e.csv', self._csv_bytes(), content_type='text/csv')
        resp = self.client.post(
            reverse('tutorials_api:tutorialenrolmentimport-list'),
            {'file': f, 'commit': 'true'}, format='multipart',
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.data['status'], 'COMMITTED')
        self.assertEqual(TutorialRegistration.objects.count(), 1)

    def test_non_staff_forbidden(self):
        non_staff = User.objects.create_user(username='alice')
        self.client.force_authenticate(non_staff)
        f = SimpleUploadedFile('e.csv', self._csv_bytes(), content_type='text/csv')
        resp = self.client.post(
            reverse('tutorials_api:tutorialenrolmentimport-list'),
            {'file': f, 'commit': 'false'}, format='multipart',
        )
        self.assertEqual(resp.status_code, 403)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
python manage.py test tutorials.tests.test_api_import -v 2
```

- [ ] **Step 3: Create serializer**

`backend/django_Admin3/tutorials/api/serializers/import_.py`:

```python
from rest_framework import serializers

from tutorials.models import TutorialEnrolmentImport


class TutorialEnrolmentImportSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialEnrolmentImport
        fields = ['id', 'filename', 'uploaded_by', 'uploaded_at', 'status',
                  'total_rows', 'created_count', 'reactivated_count',
                  'deactivated_count', 'unmatched_count', 'report', 'committed_at']
        read_only_fields = fields
```

- [ ] **Step 4: Create view**

`backend/django_Admin3/tutorials/api/views/import_.py`:

```python
import io
from rest_framework import status, viewsets
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from tutorials.models import TutorialEnrolmentImport
from tutorials.api.serializers.import_ import TutorialEnrolmentImportSerializer
from tutorials.services.import_parser import parse_csv
from tutorials.services.import_sync import run_sync


class TutorialEnrolmentImportViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TutorialEnrolmentImportSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = TutorialEnrolmentImport.objects.all()
    parser_classes = [MultiPartParser, FormParser]
    pagination_class = None

    def create(self, request, *args, **kwargs):
        upload = request.FILES.get('file')
        if not upload:
            return Response({'file': 'required'}, status=status.HTTP_400_BAD_REQUEST)
        commit = (request.data.get('commit', 'false').lower() == 'true')

        text = upload.read().decode('utf-8')
        parsed = parse_csv(io.StringIO(text))

        imp = TutorialEnrolmentImport.objects.create(
            filename=upload.name, uploaded_by=request.user,
        )
        run_sync(parsed, imp, commit=commit)
        imp.refresh_from_db()
        return Response(self.get_serializer(imp).data, status=status.HTTP_201_CREATED)

    # Override to allow POST despite ReadOnlyModelViewSet base.
    http_method_names = ['get', 'post', 'head', 'options']
```

- [ ] **Step 5: Register the route**

Edit `backend/django_Admin3/tutorials/api/urls.py` — add:

```python
from tutorials.api.views.import_ import TutorialEnrolmentImportViewSet
router.register(r'imports', TutorialEnrolmentImportViewSet, basename='tutorialenrolmentimport')
```

- [ ] **Step 6: Run tests**

```bash
python manage.py test tutorials.tests.test_api_import -v 2
```
Expected: 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/tutorials/api/ backend/django_Admin3/tutorials/tests/test_api_import.py
git commit -m "feat(tutorials): add CSV import API (upload + commit modes)"
```

---

## Phase 4 — Final integration check

### Task 4.1: Full app test sweep + admin registration

**Files:**
- Modify: `backend/django_Admin3/tutorials/admin.py`

- [ ] **Step 1: Run the full tutorials test suite**

```bash
python manage.py test tutorials -v 2
```
Expected: ALL tests PASS.

- [ ] **Step 2: Verify schema placement across the app**

```bash
python manage.py verify_schema_placement
```
Expected: no errors for any of the new tables.

- [ ] **Step 3: Register new models in admin**

Read the existing `backend/django_Admin3/tutorials/admin.py` and append minimal registrations:

```python
from django.contrib import admin
from tutorials.models import (
    TutorialChoice, TutorialRegistration, TutorialAttendance,
    TutorialSessionSwap, TutorialEnrolmentImport,
)


@admin.register(TutorialChoice)
class TutorialChoiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'tutorial_event', 'choice_rank', 'created_at')
    list_filter = ('choice_rank',)
    search_fields = ('student__student_ref', 'tutorial_event__code')


@admin.register(TutorialRegistration)
class TutorialRegistrationAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'tutorial_session', 'is_active', 'import_batch', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('student__student_ref', 'tutorial_session__title')


@admin.register(TutorialAttendance)
class TutorialAttendanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'registration', 'status', 'recorded_at')
    list_filter = ('status',)


@admin.register(TutorialSessionSwap)
class TutorialSessionSwapAdmin(admin.ModelAdmin):
    list_display = ('id', 'student', 'from_registration', 'to_session', 'status', 'requested_at')
    list_filter = ('status',)


@admin.register(TutorialEnrolmentImport)
class TutorialEnrolmentImportAdmin(admin.ModelAdmin):
    list_display = ('id', 'filename', 'status', 'uploaded_by', 'uploaded_at',
                    'total_rows', 'created_count', 'deactivated_count', 'unmatched_count')
    list_filter = ('status',)
    readonly_fields = ('report',)
```

> **Important:** Do NOT remove existing admin registrations in the file. Only append.

- [ ] **Step 4: Commit**

```bash
git add backend/django_Admin3/tutorials/admin.py
git commit -m "feat(tutorials): register enrolment models in admin"
```

- [ ] **Step 5: Final smoke test**

```bash
python manage.py test tutorials -v 1
python manage.py runserver 8888
```
In a browser: visit `http://127.0.0.1:8888/admin/` and confirm the five new models appear under "Tutorials".

---

## Done

At this point all five models, the CSV importer, and the REST API are implemented with TDD coverage. UI work is intentionally out of scope (per spec §7).

---

## Plan self-review (run before handing off)

- **Spec coverage:** Every section of `docs/superpowers/specs/2026-05-01-tutorial-choice-registration-attendance-design.md` maps to a task — §3.1 → Task 1.1; §3.2 → Task 1.2; §3.3 → Task 1.3; §3.4 → Task 1.4; §3.5 → Task 1.5; §4.1 (swap state machine) → Tasks 1.4 + 3.4 + 2.3 (reconciliation); §4.2 (CSV sync algorithm) → Tasks 2.1 + 2.3; §4.3 (choice resolution) → Task 2.2; §4.4 (management command) → Task 2.4; §5 (API surface) → Tasks 3.1–3.6.
- **Type/method consistency:** All cross-task references use the names introduced in their defining task (`run_sync`, `parse_csv`, `resolve_choice_for_registration`, `is_online_classroom_event`, `ChoiceResolution`, `ParseResult`, `ParsedRow`).
- **No placeholders.** Migration filenames may shift by ±1 if Django numbers differently — the engineer should adjust commit paths accordingly; this is an unavoidable Django interaction.
- **Open dependency:** Task 1.2's migration declares an FK to `TutorialEnrolmentImport` which doesn't exist until Task 1.5. Resolution: the FK uses string reference `'tutorials.TutorialEnrolmentImport'`, so the migration succeeds and the FK constraint is created in Task 1.5's migration. If the engineer's Django version forbids the forward reference, Task 1.2 step 5 instructs them to comment out `import_batch`, regenerate, then add it back after Task 1.5. This is documented inline.
