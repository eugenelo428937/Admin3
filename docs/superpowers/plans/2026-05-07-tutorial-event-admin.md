# Tutorial Event Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the read-only "Tutorials" admin page at `/admin/tutorial-events` with rich filtering, expandable session rows, and a per-session attendance modal.

**Architecture:** Approach 3 (hybrid eager/lazy). Two backend endpoints (events list with sessions embedded; APIView for attendance GET/POST). Frontend uses two view-model hooks (`useTutorialEventListVM`, `useAttendanceVM`) following the existing `useOrderListVM` pattern, with shadcn/ui components and Tailwind v4 styling.

**Tech Stack:** Django 6.0 + DRF (backend); React 19.2 + TypeScript + shadcn/ui + Tailwind v4 + Vitest (frontend). PostgreSQL with `acted` schema.

**Spec:** [docs/superpowers/specs/2026-05-07-tutorial-event-admin-design.md](../specs/2026-05-07-tutorial-event-admin-design.md)

---

## File Structure

### Backend (NEW unless marked MODIFIED)

| File | Responsibility |
|------|---------------|
| `backend/django_Admin3/tutorials/admin_views.py` | `AdminTutorialEventViewSet` + `AdminTutorialAttendanceView` |
| `backend/django_Admin3/tutorials/admin_serializers.py` | List, session, roster, save serializers |
| `backend/django_Admin3/tutorials/admin_filters.py` | `_apply_event_filters` helper (filter parsing) |
| `backend/django_Admin3/tutorials/urls.py` | **MODIFIED** — register admin router + APIView path |
| `backend/django_Admin3/tutorials/tests/test_admin_event_list.py` | Permission, embedding, annotations, ordering, pagination tests |
| `backend/django_Admin3/tutorials/tests/test_admin_filters.py` | One test per filter param, isolated |
| `backend/django_Admin3/tutorials/tests/test_admin_attendance.py` | GET, POST upsert, validation, 409, recorded_by tests |
| `backend/django_Admin3/tutorials/tests/factories.py` | **MODIFIED** — add `make_instructor`, `make_location`, `make_venue` |

### Frontend (NEW unless marked MODIFIED)

| File | Responsibility |
|------|---------------|
| `frontend/react-Admin3/src/services/admin/tutorialEventsAdminService.ts` | Thin wrapper around `httpService` for the 4 endpoints |
| `frontend/react-Admin3/src/components/admin/tutorial-events/types.ts` | Shared TS types (event, session, roster row) |
| `frontend/react-Admin3/src/components/admin/tutorial-events/useTutorialEventListVM.ts` | List page state + data fetching + debouncing |
| `frontend/react-Admin3/src/components/admin/tutorial-events/useAttendanceVM.ts` | Modal state + dirty tracking + save |
| `frontend/react-Admin3/src/components/admin/tutorial-events/TutorialEventFilterBar.tsx` | Filter form (subjects, code, dates, location, venue, instructor, finalisation, sitting) |
| `frontend/react-Admin3/src/components/admin/tutorial-events/TutorialEventRow.tsx` | One event row + expanded sessions sub-table + `...` menu |
| `frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceRosterRow.tsx` | One student row in modal — Select + conditional reason input |
| `frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceModal.tsx` | Dialog wrapper, header, body, footer |
| `frontend/react-Admin3/src/components/admin/tutorial-events/TutorialEventList.tsx` | Page composition |
| `frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/*.test.tsx` | One test file per component / hook |
| `frontend/react-Admin3/src/App.js` | **MODIFIED** — add lazy route |
| `frontend/react-Admin3/src/components/admin/layout/AppSidebar.tsx` | **MODIFIED** — add "Tutorials" entry |

---

## Phase 0 — Test fixtures (1 task)

### Task 0: Extend factories with instructor / location / venue helpers

**Files:**
- Modify: `backend/django_Admin3/tutorials/tests/factories.py`

- [ ] **Step 1: Add helper functions at the end of factories.py**

```python
# Append at the end of factories.py
from django.contrib.auth.models import User as _User  # alias to avoid clash
from staff.models import Staff
from tutorials.models import (
    TutorialInstructor,
    TutorialLocation,
    TutorialVenue,
)


def make_location(name='London', code='LON'):
    loc, _ = TutorialLocation.objects.get_or_create(
        name=name, defaults={'code': code, 'is_active': True},
    )
    return loc


def make_venue(name='BPP Centre', location=None):
    return TutorialVenue.objects.create(name=name, location=location)


_INSTRUCTOR_COUNTER = {'n': 0}


def make_instructor(first_name='Karen', last_name='Smith'):
    _INSTRUCTOR_COUNTER['n'] += 1
    n = _INSTRUCTOR_COUNTER['n']
    user = _User.objects.create_user(
        username=f'instr{n}',
        first_name=first_name,
        last_name=last_name,
        email=f'instr{n}@test.com',
    )
    staff = Staff.objects.create(user=user)
    return TutorialInstructor.objects.create(staff=staff, is_active=True)
```

- [ ] **Step 2: Verify factories import cleanly**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe -c "from tutorials.tests import factories; factories.make_instructor(); factories.make_venue(); factories.make_location(); print('ok')"`
Expected: `ok` (no traceback).

- [ ] **Step 3: Commit**

```bash
git add backend/django_Admin3/tutorials/tests/factories.py
git commit -m "test(tutorials): add instructor/location/venue factories

Needed for the admin event list / attendance tests in the next phase.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 1 — Backend: events endpoint skeleton (3 tasks)

### Task 1: Skeleton viewset + URL + permission test

**Files:**
- Create: `backend/django_Admin3/tutorials/admin_views.py`
- Create: `backend/django_Admin3/tutorials/admin_serializers.py`
- Modify: `backend/django_Admin3/tutorials/urls.py`
- Create: `backend/django_Admin3/tutorials/tests/test_admin_event_list.py`

- [ ] **Step 1: Write the failing permission test**

Create `backend/django_Admin3/tutorials/tests/test_admin_event_list.py`:

```python
"""Admin event list — permission, basic shape, ordering, pagination."""
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from tutorials.tests import factories


class AdminEventListPermissionTests(APITestCase):
    def setUp(self):
        self.url = '/api/tutorials/admin/events/'

    def test_anonymous_forbidden(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_forbidden(self):
        user = User.objects.create_user(username='regular', password='x')
        self.client.force_authenticate(user=user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_allowed(self):
        admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=admin)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
```

- [ ] **Step 2: Run the test — should fail with 404 (URL not wired)**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_event_list -v 2`
Expected: 3 failures (404 because URL doesn't exist yet).

- [ ] **Step 3: Create skeleton serializer**

Create `backend/django_Admin3/tutorials/admin_serializers.py`:

```python
"""Serializers for the tutorials admin panel.

Convention: API field names mirror raw Django model fields. The only
synthesised value is ``instructor.name`` (composed from staff.user).
"""
from rest_framework import serializers

from tutorials.models import TutorialEvents


class AdminTutorialEventListSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialEvents
        fields = ['id', 'code', 'start_date', 'end_date', 'finalisation_date']
```

- [ ] **Step 4: Create skeleton viewset**

Create `backend/django_Admin3/tutorials/admin_views.py`:

```python
"""Admin views for the Tutorials admin panel.

All endpoints require ``IsSuperUser``. See
``docs/superpowers/specs/2026-05-07-tutorial-event-admin-design.md``.
"""
from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination

from catalog.permissions import IsSuperUser
from tutorials.admin_serializers import AdminTutorialEventListSerializer
from tutorials.models import TutorialEvents


class AdminTutorialEventPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200


class AdminTutorialEventViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/tutorials/admin/events/ — paginated, filtered."""
    permission_classes = [IsSuperUser]
    pagination_class = AdminTutorialEventPagination
    serializer_class = AdminTutorialEventListSerializer

    def get_queryset(self):
        return TutorialEvents.objects.filter(cancelled=False).order_by('start_date')
```

- [ ] **Step 5: Wire the URL**

Modify `backend/django_Admin3/tutorials/urls.py` — add the admin router. Final file:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .admin_views import AdminTutorialEventViewSet
from .views import (
    TutorialEventsViewSet, TutorialEventListView, TutorialProductListView,
    TutorialProductVariationListView, TutorialProductListAllView, TutorialViewSet,
    get_all_tutorial_products, get_tutorial_product_variations, clear_tutorial_cache,
    TutorialComprehensiveDataView,
)

router = DefaultRouter()
router.register(r'events', TutorialEventsViewSet)
router.register(r'events', TutorialViewSet, basename='tutorial-event')

admin_router = DefaultRouter()
admin_router.register(
    r'events', AdminTutorialEventViewSet, basename='admin-tutorial-events',
)

urlpatterns = [
    path('list/', TutorialEventListView.as_view(), name='tutorial-event-list'),
    path('products/', TutorialProductListView.as_view(), name='tutorial-products'),
    path('products/all/', TutorialProductListAllView.as_view(), name='tutorial-products-all'),
    path('products/<int:product_id>/variations/', TutorialProductVariationListView.as_view(), name='tutorial-product-variations'),
    path('data/comprehensive/', TutorialComprehensiveDataView.as_view(), name='tutorial-comprehensive-data'),
    path('cache/clear/', clear_tutorial_cache, name='tutorial-cache-clear'),
    path('admin/', include(admin_router.urls)),
] + router.urls
```

- [ ] **Step 6: Run the tests — should pass**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_event_list -v 2`
Expected: 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/tutorials/admin_views.py backend/django_Admin3/tutorials/admin_serializers.py backend/django_Admin3/tutorials/urls.py backend/django_Admin3/tutorials/tests/test_admin_event_list.py
git commit -m "feat(tutorials): add admin events viewset skeleton

Superuser-gated GET /api/tutorials/admin/events/ returns paginated
TutorialEvents (cancelled=False) ordered by start_date asc.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Embed sessions and full event fields in serializer

**Files:**
- Modify: `backend/django_Admin3/tutorials/admin_serializers.py`
- Modify: `backend/django_Admin3/tutorials/admin_views.py`
- Modify: `backend/django_Admin3/tutorials/tests/test_admin_event_list.py`

- [ ] **Step 1: Write the failing test for embedded sessions**

Append to `test_admin_event_list.py`:

```python
class AdminEventListShapeTests(APITestCase):
    def setUp(self):
        self.url = '/api/tutorials/admin/events/'
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_event_includes_full_field_set(self):
        loc = factories.make_location(name='London')
        venue = factories.make_venue(name='BPP Centre', location=loc)
        instr = factories.make_instructor(first_name='Karen', last_name='Smith')
        event = factories.make_event(code='CP1-01-24A')
        event.location = loc
        event.venue = venue
        event.main_instructor = instr
        event.save()

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        self.assertEqual(len(results), 1)
        ev = results[0]
        self.assertEqual(ev['code'], 'CP1-01-24A')
        self.assertEqual(ev['location']['name'], 'London')
        self.assertEqual(ev['venue']['name'], 'BPP Centre')
        self.assertEqual(ev['main_instructor']['name'], 'Karen Smith')
        self.assertEqual(ev['subject']['code'], 'CM2')  # default factory subject
        self.assertIn('exam_session', ev)
        self.assertIn('sessions', ev)

    def test_sessions_embedded_in_order(self):
        event = factories.make_event(code='EV-MULTI')
        s2 = factories.make_session(event=event, sequence=2, title='EV-MULTI-2')
        s1 = factories.make_session(event=event, sequence=1, title='EV-MULTI-1')

        response = self.client.get(self.url)
        sessions = response.data['results'][0]['sessions']
        self.assertEqual([s['title'] for s in sessions], ['EV-MULTI-1', 'EV-MULTI-2'])
        self.assertEqual(sessions[0]['sequence'], 1)
```

- [ ] **Step 2: Run the failing test**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_event_list.AdminEventListShapeTests -v 2`
Expected: failures (sessions/location/etc. fields missing).

- [ ] **Step 3: Replace `admin_serializers.py` with full version**

```python
"""Serializers for the tutorials admin panel.

Convention: API field names mirror raw Django model fields. The only
synthesised value is ``instructor.name`` (composed from staff.user).
"""
from rest_framework import serializers

from catalog.exam_session.models import ExamSession
from catalog.subject.models import Subject
from tutorials.models import (
    TutorialEvents,
    TutorialInstructor,
    TutorialLocation,
    TutorialSessions,
    TutorialVenue,
)


class _SubjectMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['code', 'description']


class _ExamSessionMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSession
        fields = ['id', 'session_code', 'start_date', 'end_date']


class _LocationMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialLocation
        fields = ['id', 'name']


class _VenueMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorialVenue
        fields = ['id', 'name']


class _InstructorMiniSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = TutorialInstructor
        fields = ['id', 'name']

    def get_name(self, obj):
        if obj.staff and obj.staff.user:
            return obj.staff.user.get_full_name() or obj.staff.user.username
        return f'Instructor #{obj.id}'


class AdminTutorialSessionEmbeddedSerializer(serializers.ModelSerializer):
    venue = _VenueMiniSerializer(read_only=True)
    instructors = _InstructorMiniSerializer(many=True, read_only=True)
    enrolled_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = TutorialSessions
        fields = [
            'id', 'title', 'sequence', 'start_date', 'end_date',
            'venue', 'instructors', 'enrolled_count',
        ]


class AdminTutorialEventListSerializer(serializers.ModelSerializer):
    subject = serializers.SerializerMethodField()
    exam_session = serializers.SerializerMethodField()
    location = _LocationMiniSerializer(read_only=True)
    venue = _VenueMiniSerializer(read_only=True)
    main_instructor = _InstructorMiniSerializer(read_only=True)
    all_instructors = serializers.SerializerMethodField()
    sessions = AdminTutorialSessionEmbeddedSerializer(many=True, read_only=True)
    enrolled_distinct = serializers.IntegerField(read_only=True)

    class Meta:
        model = TutorialEvents
        fields = [
            'id', 'code',
            'subject', 'exam_session',
            'start_date', 'end_date',
            'location', 'venue',
            'main_instructor', 'all_instructors',
            'finalisation_date',
            'enrolled_distinct',
            'sessions',
        ]

    def get_subject(self, obj):
        ess = getattr(obj.store_product, 'exam_session_subject', None) if obj.store_product_id else None
        subject = getattr(ess, 'subject', None) if ess else None
        return _SubjectMiniSerializer(subject).data if subject else None

    def get_exam_session(self, obj):
        ess = getattr(obj.store_product, 'exam_session_subject', None) if obj.store_product_id else None
        es = getattr(ess, 'exam_session', None) if ess else None
        return _ExamSessionMiniSerializer(es).data if es else None

    def get_all_instructors(self, obj):
        # Aggregate main + every session instructor, deduplicated by id,
        # preserving deterministic order (main first, then by instructor id).
        seen, out = set(), []
        if obj.main_instructor_id:
            seen.add(obj.main_instructor_id)
            out.append(_InstructorMiniSerializer(obj.main_instructor).data)
        for sess in obj.sessions.all():
            for instr in sess.instructors.all():
                if instr.id not in seen:
                    seen.add(instr.id)
                    out.append(_InstructorMiniSerializer(instr).data)
        return out
```

- [ ] **Step 4: Update viewset get_queryset to prefetch and order sessions**

Modify `admin_views.py` — replace `get_queryset`:

```python
from django.db.models import Prefetch
from tutorials.models import TutorialSessions  # add to imports


class AdminTutorialEventViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsSuperUser]
    pagination_class = AdminTutorialEventPagination
    serializer_class = AdminTutorialEventListSerializer

    def get_queryset(self):
        sessions_qs = (
            TutorialSessions.objects
            .order_by('sequence')
            .select_related('venue')
            .prefetch_related('instructors__staff__user')
        )
        return (
            TutorialEvents.objects
            .filter(cancelled=False)
            .select_related(
                'venue', 'location', 'main_instructor__staff__user',
                'store_product__exam_session_subject__subject',
                'store_product__exam_session_subject__exam_session',
            )
            .prefetch_related(Prefetch('sessions', queryset=sessions_qs))
            .order_by('start_date')
        )
```

- [ ] **Step 5: Run tests — should pass**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_event_list -v 2`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/tutorials/admin_serializers.py backend/django_Admin3/tutorials/admin_views.py backend/django_Admin3/tutorials/tests/test_admin_event_list.py
git commit -m "feat(tutorials): embed sessions and full event fields in admin list

Adds nested serializers for subject, exam_session, location, venue,
main_instructor, all_instructors (UNION across event main + session
instructors, deduplicated), and embedded sessions sub-resource.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Add `enrolled_distinct` (event) and `enrolled_count` (per-session) annotations

**Files:**
- Modify: `backend/django_Admin3/tutorials/admin_views.py`
- Modify: `backend/django_Admin3/tutorials/tests/test_admin_event_list.py`

- [ ] **Step 1: Write the failing test**

Append to `test_admin_event_list.py`:

```python
class AdminEventListEnrolmentCountsTests(APITestCase):
    def setUp(self):
        self.url = '/api/tutorials/admin/events/'
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def _register(self, student, session, oi=None):
        from orders.models import Order, OrderItem
        from tutorials.models import TutorialRegistration
        if oi is None:
            order = Order.objects.create(user=student.user)
            oi = OrderItem.objects.create(order=order)
        return TutorialRegistration.objects.create(
            student=student, tutorial_session=session, order_item=oi,
        )

    def test_event_enrolled_distinct_counts_each_student_once(self):
        event = factories.make_event(code='EV-DIS')
        s1 = factories.make_session(event=event, sequence=1, title='EV-DIS-1')
        s2 = factories.make_session(event=event, sequence=2, title='EV-DIS-2')
        alice = factories.make_student('alice')
        bob = factories.make_student('bob')

        # Alice in s1+s2, Bob in s2 only.
        from orders.models import Order, OrderItem
        a_oi = OrderItem.objects.create(order=Order.objects.create(user=alice.user))
        b_oi = OrderItem.objects.create(order=Order.objects.create(user=bob.user))
        from tutorials.models import TutorialRegistration
        TutorialRegistration.objects.create(student=alice, tutorial_session=s1, order_item=a_oi)
        TutorialRegistration.objects.create(student=alice, tutorial_session=s2, order_item=a_oi)
        TutorialRegistration.objects.create(student=bob,   tutorial_session=s2, order_item=b_oi)

        response = self.client.get(self.url)
        ev = response.data['results'][0]
        self.assertEqual(ev['enrolled_distinct'], 2)
        sessions_by_seq = {s['sequence']: s for s in ev['sessions']}
        self.assertEqual(sessions_by_seq[1]['enrolled_count'], 1)
        self.assertEqual(sessions_by_seq[2]['enrolled_count'], 2)

    def test_inactive_registrations_excluded_from_counts(self):
        event = factories.make_event(code='EV-INACT')
        s1 = factories.make_session(event=event, sequence=1, title='EV-INACT-1')
        alice = factories.make_student('alice2')
        from orders.models import Order, OrderItem
        from tutorials.models import TutorialRegistration
        oi = OrderItem.objects.create(order=Order.objects.create(user=alice.user))
        reg = TutorialRegistration.objects.create(
            student=alice, tutorial_session=s1, order_item=oi,
        )
        reg.is_active = False
        reg.save()

        response = self.client.get(self.url)
        ev = response.data['results'][0]
        self.assertEqual(ev['enrolled_distinct'], 0)
        self.assertEqual(ev['sessions'][0]['enrolled_count'], 0)
```

- [ ] **Step 2: Run tests — should fail**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_event_list.AdminEventListEnrolmentCountsTests -v 2`
Expected: failures (`enrolled_distinct=None` or `enrolled_count` missing).

- [ ] **Step 3: Add annotations**

Modify `admin_views.py` `get_queryset`:

```python
from django.db.models import Count, Prefetch, Q


class AdminTutorialEventViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsSuperUser]
    pagination_class = AdminTutorialEventPagination
    serializer_class = AdminTutorialEventListSerializer

    def get_queryset(self):
        sessions_qs = (
            TutorialSessions.objects
            .order_by('sequence')
            .select_related('venue')
            .prefetch_related('instructors__staff__user')
            .annotate(
                enrolled_count=Count(
                    'registrations',
                    filter=Q(registrations__is_active=True),
                ),
            )
        )
        return (
            TutorialEvents.objects
            .filter(cancelled=False)
            .select_related(
                'venue', 'location', 'main_instructor__staff__user',
                'store_product__exam_session_subject__subject',
                'store_product__exam_session_subject__exam_session',
            )
            .prefetch_related(Prefetch('sessions', queryset=sessions_qs))
            .annotate(
                enrolled_distinct=Count(
                    'sessions__registrations__student',
                    filter=Q(sessions__registrations__is_active=True),
                    distinct=True,
                ),
            )
            .order_by('start_date')
        )
```

- [ ] **Step 4: Run tests — should pass**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_event_list -v 2`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/tutorials/admin_views.py backend/django_Admin3/tutorials/tests/test_admin_event_list.py
git commit -m "feat(tutorials): add enrolled_distinct + enrolled_count annotations

enrolled_distinct counts unique students across the event's sessions;
enrolled_count is per-session. Both filter is_active=True.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — Backend: filters (5 tasks)

### Task 4: Filter helper module + subject_codes / code filters

**Files:**
- Create: `backend/django_Admin3/tutorials/admin_filters.py`
- Modify: `backend/django_Admin3/tutorials/admin_views.py`
- Create: `backend/django_Admin3/tutorials/tests/test_admin_filters.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/django_Admin3/tutorials/tests/test_admin_filters.py`:

```python
"""Per-filter tests for the admin event list endpoint."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from tutorials.tests import factories


class _AuthedAdminCase(APITestCase):
    url = '/api/tutorials/admin/events/'

    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)


class SubjectCodeFilterTests(_AuthedAdminCase):
    def test_filters_by_single_subject(self):
        sp_cm2 = factories.make_store_product(subject=factories.make_subject('CM2'))
        sp_sa1 = factories.make_store_product(subject=factories.make_subject('SA1'))
        factories.make_event(store_product=sp_cm2, code='EV-CM2')
        factories.make_event(store_product=sp_sa1, code='EV-SA1')

        response = self.client.get(self.url, {'subject_codes': 'CM2'})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-CM2'])

    def test_filters_by_multiple_subjects(self):
        sp_cm2 = factories.make_store_product(subject=factories.make_subject('CM2'))
        sp_sa1 = factories.make_store_product(subject=factories.make_subject('SA1'))
        sp_cb1 = factories.make_store_product(subject=factories.make_subject('CB1'))
        factories.make_event(store_product=sp_cm2, code='EV-CM2')
        factories.make_event(store_product=sp_sa1, code='EV-SA1')
        factories.make_event(store_product=sp_cb1, code='EV-CB1')

        response = self.client.get(self.url, {'subject_codes': 'CM2,SA1'})
        codes = sorted(e['code'] for e in response.data['results'])
        self.assertEqual(codes, ['EV-CM2', 'EV-SA1'])


class CodeIcontainsFilterTests(_AuthedAdminCase):
    def test_substring_match(self):
        factories.make_event(code='CP1-01-24A')
        factories.make_event(code='CM2-02-24S')
        response = self.client.get(self.url, {'code': 'CP1'})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['CP1-01-24A'])

    def test_case_insensitive(self):
        factories.make_event(code='CP1-01-24A')
        response = self.client.get(self.url, {'code': 'cp1'})
        self.assertEqual(len(response.data['results']), 1)
```

- [ ] **Step 2: Run failing tests**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_filters -v 2`
Expected: 4 failures (filters not applied).

- [ ] **Step 3: Create filter module**

Create `backend/django_Admin3/tutorials/admin_filters.py`:

```python
"""Query-param filter helpers for the admin event list.

Each helper accepts the running queryset and the request query_params
mapping, returns the filtered queryset (or ``qs.none()`` for invalid
input — fail-closed).
"""
from __future__ import annotations

from typing import Iterable

from django.db.models import Q


def _split_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [v.strip() for v in value.split(',') if v.strip()]


def _split_csv_ints(value: str | None) -> list[int] | None:
    """Returns parsed ints, or None if any token is invalid."""
    tokens = _split_csv(value)
    out: list[int] = []
    for t in tokens:
        try:
            out.append(int(t))
        except (TypeError, ValueError):
            return None
    return out


def apply_subject_codes(qs, params):
    codes = _split_csv(params.get('subject_codes'))
    if not codes:
        return qs
    return qs.filter(
        store_product__exam_session_subject__subject__code__in=codes,
    )


def apply_code_icontains(qs, params):
    code = (params.get('code') or '').strip()
    if not code:
        return qs
    return qs.filter(code__icontains=code)


def apply_event_filters(qs, params):
    qs = apply_subject_codes(qs, params)
    qs = apply_code_icontains(qs, params)
    return qs
```

- [ ] **Step 4: Wire into the viewset**

Modify `admin_views.py` `get_queryset` to call the helper:

```python
from tutorials.admin_filters import apply_event_filters


class AdminTutorialEventViewSet(viewsets.ReadOnlyModelViewSet):
    # ... existing ...

    def get_queryset(self):
        # ... existing prefetch / annotate setup ...
        qs = (
            TutorialEvents.objects
            .filter(cancelled=False)
            # ... select/prefetch/annotate as before ...
            .order_by('start_date')
        )
        return apply_event_filters(qs, self.request.query_params)
```

(Keep the full `get_queryset` body from Task 3 intact; only the final return changes from `return qs.order_by(...)` to `return apply_event_filters(qs, self.request.query_params)`.)

- [ ] **Step 5: Run tests — both new and prior tests should pass**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_filters tutorials.tests.test_admin_event_list -v 2`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/tutorials/admin_filters.py backend/django_Admin3/tutorials/admin_views.py backend/django_Admin3/tutorials/tests/test_admin_filters.py
git commit -m "feat(tutorials): add subject_codes and code filters to admin events

CSV-of-codes for subject (matches via exam_session_subject__subject__code__in);
icontains for tutorial_events.code.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Date range filters (start_from / start_to / finalisation_from / finalisation_to)

**Files:**
- Modify: `backend/django_Admin3/tutorials/admin_filters.py`
- Modify: `backend/django_Admin3/tutorials/tests/test_admin_filters.py`

- [ ] **Step 1: Write failing tests**

Append to `test_admin_filters.py`:

```python
class StartDateRangeFilterTests(_AuthedAdminCase):
    def test_start_from_includes_equal_date(self):
        from datetime import date
        e1 = factories.make_event(code='EV-PAST')
        e1.start_date = date(2026, 1, 1); e1.end_date = date(2026, 1, 2); e1.save()
        e2 = factories.make_event(code='EV-CURR')
        e2.start_date = date(2026, 6, 1); e2.end_date = date(2026, 6, 2); e2.save()

        response = self.client.get(self.url, {'start_from': '2026-06-01'})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-CURR'])

    def test_start_to_includes_equal_date(self):
        from datetime import date
        e1 = factories.make_event(code='EV-PAST')
        e1.start_date = date(2026, 1, 1); e1.end_date = date(2026, 1, 2); e1.save()
        e2 = factories.make_event(code='EV-CURR')
        e2.start_date = date(2026, 6, 1); e2.end_date = date(2026, 6, 2); e2.save()

        response = self.client.get(self.url, {'start_to': '2026-01-31'})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-PAST'])


class FinalisationDateFilterTests(_AuthedAdminCase):
    def test_finalisation_range(self):
        from datetime import date
        e1 = factories.make_event(code='EV-A')
        e1.finalisation_date = date(2026, 5, 10); e1.save()
        e2 = factories.make_event(code='EV-B')
        e2.finalisation_date = date(2026, 5, 20); e2.save()
        e3 = factories.make_event(code='EV-NONE'); e3.save()

        response = self.client.get(
            self.url, {'finalisation_from': '2026-05-15', 'finalisation_to': '2026-05-25'},
        )
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-B'])
```

- [ ] **Step 2: Run failing tests**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_filters.StartDateRangeFilterTests tutorials.tests.test_admin_filters.FinalisationDateFilterTests -v 2`
Expected: failures.

- [ ] **Step 3: Add date filters**

Append to `admin_filters.py`:

```python
def apply_start_date_range(qs, params):
    start_from = params.get('start_from')
    if start_from:
        qs = qs.filter(start_date__gte=start_from)
    start_to = params.get('start_to')
    if start_to:
        qs = qs.filter(start_date__lte=start_to)
    return qs


def apply_finalisation_date_range(qs, params):
    f_from = params.get('finalisation_from')
    if f_from:
        qs = qs.filter(finalisation_date__gte=f_from)
    f_to = params.get('finalisation_to')
    if f_to:
        qs = qs.filter(finalisation_date__lte=f_to)
    return qs
```

Update `apply_event_filters`:

```python
def apply_event_filters(qs, params):
    qs = apply_subject_codes(qs, params)
    qs = apply_code_icontains(qs, params)
    qs = apply_start_date_range(qs, params)
    qs = apply_finalisation_date_range(qs, params)
    return qs
```

- [ ] **Step 4: Run tests — should pass**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_filters -v 2`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/tutorials/admin_filters.py backend/django_Admin3/tutorials/tests/test_admin_filters.py
git commit -m "feat(tutorials): add start_date and finalisation_date range filters

Inclusive bounds via __gte / __lte. Django coerces YYYY-MM-DD strings
to date for these comparisons.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Location / venue / instructor filters

**Files:**
- Modify: `backend/django_Admin3/tutorials/admin_filters.py`
- Modify: `backend/django_Admin3/tutorials/tests/test_admin_filters.py`

- [ ] **Step 1: Write failing tests**

Append to `test_admin_filters.py`:

```python
class LocationVenueFilterTests(_AuthedAdminCase):
    def test_location_ids_csv(self):
        loc1 = factories.make_location('London', 'LON')
        loc2 = factories.make_location('Manchester', 'MAN')
        e1 = factories.make_event(code='E-LON'); e1.location = loc1; e1.save()
        e2 = factories.make_event(code='E-MAN'); e2.location = loc2; e2.save()

        response = self.client.get(self.url, {'location_ids': str(loc1.id)})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['E-LON'])

    def test_venue_ids_csv_multiple(self):
        v1 = factories.make_venue('BPP A')
        v2 = factories.make_venue('BPP B')
        v3 = factories.make_venue('BPP C')
        e1 = factories.make_event(code='E-A'); e1.venue = v1; e1.save()
        e2 = factories.make_event(code='E-B'); e2.venue = v2; e2.save()
        e3 = factories.make_event(code='E-C'); e3.venue = v3; e3.save()

        response = self.client.get(self.url, {'venue_ids': f'{v1.id},{v3.id}'})
        codes = sorted(e['code'] for e in response.data['results'])
        self.assertEqual(codes, ['E-A', 'E-C'])


class InstructorUnionFilterTests(_AuthedAdminCase):
    def test_matches_when_main_instructor(self):
        karen = factories.make_instructor('Karen', 'Smith')
        mark = factories.make_instructor('Mark', 'Davis')
        e_karen = factories.make_event(code='E-K')
        e_karen.main_instructor = karen; e_karen.save()
        e_mark = factories.make_event(code='E-M')
        e_mark.main_instructor = mark; e_mark.save()

        response = self.client.get(self.url, {'instructor_id': str(karen.id)})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['E-K'])

    def test_matches_when_session_instructor_only(self):
        karen = factories.make_instructor('Karen', 'Smith')
        e = factories.make_event(code='E-SESS')
        s = factories.make_session(event=e, sequence=1, title='E-SESS-1')
        s.instructors.add(karen)

        response = self.client.get(self.url, {'instructor_id': str(karen.id)})
        codes = [r['code'] for r in response.data['results']]
        self.assertEqual(codes, ['E-SESS'])

    def test_no_duplicate_when_main_and_session(self):
        karen = factories.make_instructor('Karen', 'Smith')
        e = factories.make_event(code='E-BOTH')
        e.main_instructor = karen; e.save()
        s = factories.make_session(event=e, sequence=1, title='E-BOTH-1')
        s.instructors.add(karen)

        response = self.client.get(self.url, {'instructor_id': str(karen.id)})
        self.assertEqual(len(response.data['results']), 1)
```

- [ ] **Step 2: Run failing tests**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_filters.LocationVenueFilterTests tutorials.tests.test_admin_filters.InstructorUnionFilterTests -v 2`
Expected: failures.

- [ ] **Step 3: Add filters**

Append to `admin_filters.py`:

```python
def apply_location_ids(qs, params):
    ids = _split_csv_ints(params.get('location_ids'))
    if ids is None:
        return qs.none()
    if not ids:
        return qs
    return qs.filter(location_id__in=ids)


def apply_venue_ids(qs, params):
    ids = _split_csv_ints(params.get('venue_ids'))
    if ids is None:
        return qs.none()
    if not ids:
        return qs
    return qs.filter(venue_id__in=ids)


def apply_instructor(qs, params):
    raw = params.get('instructor_id')
    if not raw:
        return qs
    try:
        instr_id = int(raw)
    except (TypeError, ValueError):
        return qs.none()
    return qs.filter(
        Q(main_instructor_id=instr_id) | Q(sessions__instructors__id=instr_id),
    ).distinct()
```

Update `apply_event_filters`:

```python
def apply_event_filters(qs, params):
    qs = apply_subject_codes(qs, params)
    qs = apply_code_icontains(qs, params)
    qs = apply_start_date_range(qs, params)
    qs = apply_finalisation_date_range(qs, params)
    qs = apply_location_ids(qs, params)
    qs = apply_venue_ids(qs, params)
    qs = apply_instructor(qs, params)
    return qs
```

- [ ] **Step 4: Run tests — should pass**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_filters -v 2`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/tutorials/admin_filters.py backend/django_Admin3/tutorials/tests/test_admin_filters.py
git commit -m "feat(tutorials): add location, venue, instructor (UNION) filters

instructor_id matches via OR across event.main_instructor and any
session's instructors; .distinct() prevents duplicate rows when both
match.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Sitting filter with current-sitting default and `all` sentinel

**Files:**
- Modify: `backend/django_Admin3/tutorials/admin_filters.py`
- Modify: `backend/django_Admin3/tutorials/tests/test_admin_filters.py`

- [ ] **Step 1: Write failing tests**

Append to `test_admin_filters.py`:

```python
class SittingFilterTests(_AuthedAdminCase):
    def test_default_picks_latest_sitting(self):
        from datetime import datetime, timezone as tz
        old = factories.make_exam_session(code='OLD')
        old.start_date = datetime(2024, 1, 1, tzinfo=tz.utc); old.save()
        new = factories.make_exam_session(code='NEW')
        new.start_date = datetime(2026, 4, 1, tzinfo=tz.utc); new.save()

        sp_old = factories.make_store_product(exam_session=old)
        sp_new = factories.make_store_product(exam_session=new)
        factories.make_event(store_product=sp_old, code='EV-OLD')
        factories.make_event(store_product=sp_new, code='EV-NEW')

        response = self.client.get(self.url)  # no sitting_id
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-NEW'])

    def test_explicit_sitting_id_overrides(self):
        from datetime import datetime, timezone as tz
        old = factories.make_exam_session(code='OLD')
        old.start_date = datetime(2024, 1, 1, tzinfo=tz.utc); old.save()
        new = factories.make_exam_session(code='NEW')
        new.start_date = datetime(2026, 4, 1, tzinfo=tz.utc); new.save()
        sp_old = factories.make_store_product(exam_session=old)
        sp_new = factories.make_store_product(exam_session=new)
        factories.make_event(store_product=sp_old, code='EV-OLD')
        factories.make_event(store_product=sp_new, code='EV-NEW')

        response = self.client.get(self.url, {'sitting_id': str(old.id)})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-OLD'])

    def test_all_sentinel_disables_filter(self):
        from datetime import datetime, timezone as tz
        old = factories.make_exam_session(code='OLD')
        old.start_date = datetime(2024, 1, 1, tzinfo=tz.utc); old.save()
        new = factories.make_exam_session(code='NEW')
        new.start_date = datetime(2026, 4, 1, tzinfo=tz.utc); new.save()
        sp_old = factories.make_store_product(exam_session=old)
        sp_new = factories.make_store_product(exam_session=new)
        factories.make_event(store_product=sp_old, code='EV-OLD')
        factories.make_event(store_product=sp_new, code='EV-NEW')

        response = self.client.get(self.url, {'sitting_id': 'all'})
        codes = sorted(e['code'] for e in response.data['results'])
        self.assertEqual(codes, ['EV-NEW', 'EV-OLD'])
```

- [ ] **Step 2: Run failing tests**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_filters.SittingFilterTests -v 2`
Expected: failures (default returns both).

- [ ] **Step 3: Add sitting filter**

Append to `admin_filters.py`:

```python
def apply_sitting(qs, params):
    raw = params.get('sitting_id')
    if raw == 'all':
        return qs

    if raw:
        try:
            sitting_id = int(raw)
        except (TypeError, ValueError):
            return qs.none()
        return qs.filter(
            store_product__exam_session_subject__exam_session_id=sitting_id,
        )

    # No param → default to latest sitting by start_date desc.
    from catalog.exam_session.models import ExamSession
    latest = ExamSession.objects.order_by('-start_date').first()
    if latest is None:
        return qs
    return qs.filter(
        store_product__exam_session_subject__exam_session_id=latest.id,
    )
```

Update `apply_event_filters`:

```python
def apply_event_filters(qs, params):
    qs = apply_subject_codes(qs, params)
    qs = apply_code_icontains(qs, params)
    qs = apply_start_date_range(qs, params)
    qs = apply_finalisation_date_range(qs, params)
    qs = apply_location_ids(qs, params)
    qs = apply_venue_ids(qs, params)
    qs = apply_instructor(qs, params)
    qs = apply_sitting(qs, params)
    return qs
```

- [ ] **Step 4: Run tests — should pass**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_filters -v 2`
Expected: all pass.

- [ ] **Step 5: Re-run prior tests to make sure nothing else regressed**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_event_list -v 2`
Expected: pass. **Note:** earlier list-shape tests don't rely on a specific sitting; the default factory creates one `APR2026` session and uses it for all subsequent events, so they all share the latest.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/tutorials/admin_filters.py backend/django_Admin3/tutorials/tests/test_admin_filters.py
git commit -m "feat(tutorials): add sitting_id filter with current-sitting default

When sitting_id is absent, defaults to ExamSession ordered by
start_date desc (the latest known sitting). 'all' sentinel disables
the filter.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Ordering whitelist + pagination param

**Files:**
- Modify: `backend/django_Admin3/tutorials/admin_views.py`
- Modify: `backend/django_Admin3/tutorials/tests/test_admin_event_list.py`

- [ ] **Step 1: Write failing tests**

Append to `test_admin_event_list.py`:

```python
class AdminEventListOrderingTests(APITestCase):
    def setUp(self):
        self.url = '/api/tutorials/admin/events/'
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_default_ordering_start_date_asc(self):
        from datetime import date
        e1 = factories.make_event(code='EV-LATE')
        e1.start_date = date(2026, 8, 1); e1.save()
        e2 = factories.make_event(code='EV-EARLY')
        e2.start_date = date(2026, 6, 1); e2.save()

        response = self.client.get(self.url)
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-EARLY', 'EV-LATE'])

    def test_ordering_param_respected_when_whitelisted(self):
        from datetime import date
        e1 = factories.make_event(code='EV-LATE')
        e1.start_date = date(2026, 8, 1); e1.save()
        e2 = factories.make_event(code='EV-EARLY')
        e2.start_date = date(2026, 6, 1); e2.save()

        response = self.client.get(self.url, {'ordering': '-start_date'})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-LATE', 'EV-EARLY'])

    def test_ordering_param_ignored_when_not_whitelisted(self):
        from datetime import date
        e1 = factories.make_event(code='EV-A')
        e1.start_date = date(2026, 6, 1); e1.save()
        e2 = factories.make_event(code='EV-B')
        e2.start_date = date(2026, 8, 1); e2.save()

        # Reject 'unsafe_field' — fall back to default (start_date asc).
        response = self.client.get(self.url, {'ordering': 'unsafe_field'})
        codes = [e['code'] for e in response.data['results']]
        self.assertEqual(codes, ['EV-A', 'EV-B'])


class AdminEventListPaginationTests(APITestCase):
    def setUp(self):
        self.url = '/api/tutorials/admin/events/'
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_page_size_param_respected(self):
        for i in range(25):
            factories.make_event(code=f'EV-{i:03d}')
        response = self.client.get(self.url, {'page_size': '10'})
        self.assertEqual(len(response.data['results']), 10)
        self.assertEqual(response.data['count'], 25)

    def test_page_size_capped_at_max(self):
        for i in range(5):
            factories.make_event(code=f'EV-{i:03d}')
        response = self.client.get(self.url, {'page_size': '999'})
        # max_page_size=200; we only have 5 events, all returned.
        self.assertEqual(len(response.data['results']), 5)
```

- [ ] **Step 2: Run failing tests**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_event_list.AdminEventListOrderingTests tutorials.tests.test_admin_event_list.AdminEventListPaginationTests -v 2`
Expected: ordering whitelist test fails (no whitelist enforced).

- [ ] **Step 3: Add ordering whitelist**

Modify `admin_views.py`:

```python
ALLOWED_ORDERING = {
    'start_date', '-start_date',
    'end_date', '-end_date',
    'code', '-code',
}


class AdminTutorialEventViewSet(viewsets.ReadOnlyModelViewSet):
    # ...

    def get_queryset(self):
        # ... existing queryset construction ...
        qs = (
            TutorialEvents.objects
            .filter(cancelled=False)
            # ... select_related / prefetch / annotate ...
        )
        qs = apply_event_filters(qs, self.request.query_params)
        ordering = self.request.query_params.get('ordering')
        if ordering and ordering in ALLOWED_ORDERING:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by('start_date')
        return qs
```

- [ ] **Step 4: Run tests — should pass**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_event_list -v 2`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/django_Admin3/tutorials/admin_views.py backend/django_Admin3/tutorials/tests/test_admin_event_list.py
git commit -m "feat(tutorials): add ordering whitelist and pagination tests

ALLOWED_ORDERING = {start_date, end_date, code} with descending
variants. Unsafe values silently fall back to default start_date asc.
PageNumberPagination with page_size=20 default, 200 max.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3 — Backend: filter-options endpoint (1 task)

### Task 9: Filter-options endpoint

**Files:**
- Modify: `backend/django_Admin3/tutorials/admin_views.py`
- Modify: `backend/django_Admin3/tutorials/admin_serializers.py`
- Create: `backend/django_Admin3/tutorials/tests/test_admin_filter_options.py`

- [ ] **Step 1: Write failing tests**

Create `backend/django_Admin3/tutorials/tests/test_admin_filter_options.py`:

```python
"""Filter-options endpoint — populates the dropdown sources."""
from django.contrib.auth.models import User
from rest_framework.test import APITestCase

from tutorials.tests import factories


class FilterOptionsTests(APITestCase):
    url = '/api/tutorials/admin/events/filter-options/'

    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_anonymous_forbidden(self):
        self.client.logout()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 403)

    def test_returns_expected_keys(self):
        # seed minimal data
        factories.make_event()
        factories.make_location()
        factories.make_venue()
        factories.make_instructor()

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        for key in ('subjects', 'locations', 'venues', 'instructors', 'sittings'):
            self.assertIn(key, response.data)

    def test_subject_shape(self):
        factories.make_event()
        response = self.client.get(self.url)
        self.assertEqual(set(response.data['subjects'][0].keys()),
                         {'code', 'description'})

    def test_instructor_uses_full_name(self):
        factories.make_instructor(first_name='Karen', last_name='Smith')
        factories.make_event()
        response = self.client.get(self.url)
        names = {i['name'] for i in response.data['instructors']}
        self.assertIn('Karen Smith', names)

    def test_instructors_skipped_when_staff_null(self):
        from tutorials.models import TutorialInstructor
        TutorialInstructor.objects.create(staff=None, is_active=True)
        factories.make_event()
        response = self.client.get(self.url)
        # No name composable -> not included.
        self.assertNotIn(
            None, [i.get('name') for i in response.data['instructors']],
        )

    def test_venue_no_is_active_filter_returns_all(self):
        factories.make_venue('A')
        factories.make_venue('B')
        factories.make_event()
        response = self.client.get(self.url)
        names = {v['name'] for v in response.data['venues']}
        self.assertEqual(names, {'A', 'B'})
```

- [ ] **Step 2: Run failing tests**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_filter_options -v 2`
Expected: all fail (URL doesn't exist).

- [ ] **Step 3: Add @action to viewset**

Append to `admin_views.py`:

```python
from rest_framework.decorators import action
from rest_framework.response import Response

from catalog.exam_session.models import ExamSession
from catalog.subject.models import Subject
from tutorials.admin_serializers import (
    FilterOptionsSerializer,
)
from tutorials.models import TutorialInstructor, TutorialLocation, TutorialVenue


class AdminTutorialEventViewSet(viewsets.ReadOnlyModelViewSet):
    # ... existing ...

    @action(detail=False, methods=['get'], url_path='filter-options')
    def filter_options(self, request):
        subjects = (
            Subject.objects
            .filter(active=True)
            .order_by('code')
        )
        locations = TutorialLocation.objects.filter(is_active=True).order_by('name')
        venues = TutorialVenue.objects.all().order_by('name')
        instructors = (
            TutorialInstructor.objects
            .filter(is_active=True, staff__isnull=False)
            .select_related('staff__user')
        )
        sittings = ExamSession.objects.order_by('-start_date')

        data = FilterOptionsSerializer({
            'subjects': subjects,
            'locations': locations,
            'venues': venues,
            'instructors': instructors,
            'sittings': sittings,
        }).data
        return Response(data)
```

- [ ] **Step 4: Add `FilterOptionsSerializer`**

Append to `admin_serializers.py`:

```python
class _SittingMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamSession
        fields = ['id', 'session_code', 'start_date', 'end_date']


class FilterOptionsSerializer(serializers.Serializer):
    subjects = _SubjectMiniSerializer(many=True, read_only=True)
    locations = _LocationMiniSerializer(many=True, read_only=True)
    venues = _VenueMiniSerializer(many=True, read_only=True)
    instructors = _InstructorMiniSerializer(many=True, read_only=True)
    sittings = _SittingMiniSerializer(many=True, read_only=True)
```

- [ ] **Step 5: Run tests — should pass**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_filter_options -v 2`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/tutorials/admin_views.py backend/django_Admin3/tutorials/admin_serializers.py backend/django_Admin3/tutorials/tests/test_admin_filter_options.py
git commit -m "feat(tutorials): add filter-options endpoint for admin events list

GET /api/tutorials/admin/events/filter-options/ returns subjects,
locations, venues, instructors (staff-bound only), sittings — drives
the frontend filter dropdowns.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4 — Backend: attendance endpoint (3 tasks)

### Task 10: Attendance APIView GET — session meta + roster + attendance_enabled

**Files:**
- Modify: `backend/django_Admin3/tutorials/admin_views.py`
- Modify: `backend/django_Admin3/tutorials/admin_serializers.py`
- Modify: `backend/django_Admin3/tutorials/urls.py`
- Create: `backend/django_Admin3/tutorials/tests/test_admin_attendance.py`

- [ ] **Step 1: Write failing tests**

Create `backend/django_Admin3/tutorials/tests/test_admin_attendance.py`:

```python
"""Admin attendance APIView — GET (roster + meta + enabled flag)."""
from datetime import datetime, timedelta, timezone as tz

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APITestCase

from orders.models import Order, OrderItem
from tutorials.models import TutorialAttendance, TutorialRegistration
from tutorials.tests import factories


def _url(session_id):
    return f'/api/tutorials/admin/sessions/{session_id}/attendance/'


def _register(student, session):
    oi = OrderItem.objects.create(order=Order.objects.create(user=student.user))
    return TutorialRegistration.objects.create(
        student=student, tutorial_session=session, order_item=oi,
    )


class AdminAttendanceGetTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)

    def test_anonymous_forbidden(self):
        session = factories.make_session()
        self.client.logout()
        response = self.client.get(_url(session.id))
        self.assertEqual(response.status_code, 403)

    def test_unknown_session_returns_404(self):
        response = self.client.get(_url(999_999))
        self.assertEqual(response.status_code, 404)

    def test_session_in_cancelled_event_returns_404(self):
        event = factories.make_event(code='EV-X')
        session = factories.make_session(event=event)
        event.cancelled = True; event.save()
        response = self.client.get(_url(session.id))
        self.assertEqual(response.status_code, 404)

    def test_returns_session_meta(self):
        event = factories.make_event(code='EV-META')
        session = factories.make_session(event=event, sequence=1, title='EV-META-1')
        response = self.client.get(_url(session.id))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['session']['title'], 'EV-META-1')
        self.assertEqual(response.data['session']['tutorial_event']['code'], 'EV-META')

    def test_attendance_enabled_true_when_started(self):
        session = factories.make_session()
        session.start_date = timezone.now() - timedelta(hours=1); session.save()
        response = self.client.get(_url(session.id))
        self.assertTrue(response.data['attendance_enabled'])

    def test_attendance_enabled_false_when_not_started(self):
        session = factories.make_session()
        session.start_date = timezone.now() + timedelta(days=2); session.save()
        response = self.client.get(_url(session.id))
        self.assertFalse(response.data['attendance_enabled'])

    def test_roster_includes_existing_status(self):
        session = factories.make_session()
        alice = factories.make_student('alice')
        reg = _register(alice, session)
        TutorialAttendance.objects.create(
            registration=reg, status='ATTENDED', recorded_by=self.admin,
        )
        response = self.client.get(_url(session.id))
        rows = response.data['registrations']
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]['current_status'], 'ATTENDED')

    def test_roster_excludes_inactive(self):
        session = factories.make_session()
        alice = factories.make_student('alice')
        reg = _register(alice, session)
        reg.is_active = False; reg.save()
        response = self.client.get(_url(session.id))
        self.assertEqual(response.data['registrations'], [])

    def test_roster_ordered_by_last_then_first_name(self):
        session = factories.make_session()
        # Build students with last/first names.
        bob = factories.make_student('bob')
        bob.user.last_name = 'Lee'; bob.user.first_name = 'Bob'; bob.user.save()
        alice = factories.make_student('alice')
        alice.user.last_name = 'Adams'; alice.user.first_name = 'Alice'; alice.user.save()
        _register(bob, session); _register(alice, session)

        response = self.client.get(_url(session.id))
        names = [(r['student']['last_name'], r['student']['first_name'])
                 for r in response.data['registrations']]
        self.assertEqual(names, [('Adams', 'Alice'), ('Lee', 'Bob')])
```

- [ ] **Step 2: Run failing tests**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_attendance -v 2`
Expected: all fail (URL/View not yet implemented).

- [ ] **Step 3: Add roster + view serializers**

Append to `admin_serializers.py`:

```python
from tutorials.models import TutorialRegistration


class _StudentMiniSerializer(serializers.Serializer):
    student_ref = serializers.IntegerField(read_only=True)
    first_name = serializers.SerializerMethodField()
    last_name = serializers.SerializerMethodField()

    def get_first_name(self, obj):
        return obj.user.first_name if obj.user_id else ''

    def get_last_name(self, obj):
        return obj.user.last_name if obj.user_id else ''


class _SessionDetailSerializer(serializers.ModelSerializer):
    venue = _VenueMiniSerializer(read_only=True)
    tutorial_event = serializers.SerializerMethodField()

    class Meta:
        model = TutorialSessions
        fields = ['id', 'title', 'start_date', 'end_date', 'venue', 'tutorial_event']

    def get_tutorial_event(self, obj):
        return {'id': obj.tutorial_event_id, 'code': obj.tutorial_event.code}


class AdminRosterRowSerializer(serializers.Serializer):
    registration_id = serializers.IntegerField(read_only=True)
    student = serializers.SerializerMethodField()
    current_status = serializers.SerializerMethodField()
    current_reason = serializers.SerializerMethodField()

    def get_student(self, reg):
        return _StudentMiniSerializer(reg.student).data

    def get_current_status(self, reg):
        att = getattr(reg, 'attendance', None)
        return att.status if att else None

    def get_current_reason(self, reg):
        att = getattr(reg, 'attendance', None)
        return att.reason if att else ''


class AdminAttendanceGetSerializer(serializers.Serializer):
    session = _SessionDetailSerializer(read_only=True)
    attendance_enabled = serializers.BooleanField(read_only=True)
    registrations = AdminRosterRowSerializer(many=True, read_only=True)
```

- [ ] **Step 4: Add the APIView**

Append to `admin_views.py`:

```python
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.views import APIView

from tutorials.admin_serializers import AdminAttendanceGetSerializer
from tutorials.models import TutorialRegistration, TutorialSessions


class AdminTutorialAttendanceView(APIView):
    """GET / POST /api/tutorials/admin/sessions/<id>/attendance/."""

    permission_classes = [IsSuperUser]

    def _get_session(self, session_id):
        return get_object_or_404(
            TutorialSessions.objects
            .select_related('venue', 'tutorial_event')
            .filter(tutorial_event__cancelled=False),
            id=session_id,
        )

    def _attendance_enabled(self, session):
        today = timezone.now().date()
        start = session.start_date
        if hasattr(start, 'date'):
            start = start.date()
        return today >= start

    def _build_payload(self, session):
        registrations = (
            TutorialRegistration.objects
            .filter(tutorial_session=session)  # default manager filters is_active
            .select_related('student__user', 'attendance')
            .order_by('student__user__last_name', 'student__user__first_name')
        )
        data = AdminAttendanceGetSerializer({
            'session': session,
            'attendance_enabled': self._attendance_enabled(session),
            'registrations': registrations,
        }).data
        return data

    def get(self, request, session_id: int):
        session = self._get_session(session_id)
        return Response(self._build_payload(session))
```

- [ ] **Step 5: Wire URL**

Modify `tutorials/urls.py` — add the path inside `urlpatterns`:

```python
from .admin_views import AdminTutorialEventViewSet, AdminTutorialAttendanceView

# inside urlpatterns list:
    path(
        'admin/sessions/<int:session_id>/attendance/',
        AdminTutorialAttendanceView.as_view(),
        name='admin-tutorial-attendance',
    ),
```

- [ ] **Step 6: Run tests — should pass**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_attendance -v 2`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add backend/django_Admin3/tutorials/admin_views.py backend/django_Admin3/tutorials/admin_serializers.py backend/django_Admin3/tutorials/urls.py backend/django_Admin3/tutorials/tests/test_admin_attendance.py
git commit -m "feat(tutorials): add admin attendance GET endpoint

Returns session meta, attendance_enabled (today >= start_date), and
roster of active registrations with their current attendance status.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Attendance POST — happy-path upsert + validation

**Files:**
- Modify: `backend/django_Admin3/tutorials/admin_views.py`
- Modify: `backend/django_Admin3/tutorials/admin_serializers.py`
- Modify: `backend/django_Admin3/tutorials/tests/test_admin_attendance.py`

- [ ] **Step 1: Write failing tests**

Append to `test_admin_attendance.py`:

```python
class AdminAttendancePostTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)
        self.session = factories.make_session()
        self.session.start_date = timezone.now() - timedelta(hours=2)
        self.session.save()
        self.alice = factories.make_student('alice')
        self.bob = factories.make_student('bob')
        self.alice_reg = _register(self.alice, self.session)
        self.bob_reg = _register(self.bob, self.session)

    def test_creates_attendance_rows(self):
        body = {'items': [
            {'registration_id': self.alice_reg.id, 'status': 'ATTENDED', 'reason': ''},
            {'registration_id': self.bob_reg.id,   'status': 'ABSENT',   'reason': ''},
        ]}
        response = self.client.post(_url(self.session.id), body, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(TutorialAttendance.objects.count(), 2)
        a = TutorialAttendance.objects.get(registration=self.alice_reg)
        self.assertEqual(a.status, 'ATTENDED')

    def test_updates_existing_attendance(self):
        TutorialAttendance.objects.create(
            registration=self.alice_reg, status='ABSENT', recorded_by=self.admin,
        )
        body = {'items': [
            {'registration_id': self.alice_reg.id, 'status': 'ATTENDED', 'reason': ''},
        ]}
        response = self.client.post(_url(self.session.id), body, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(TutorialAttendance.objects.count(), 1)
        a = TutorialAttendance.objects.get(registration=self.alice_reg)
        self.assertEqual(a.status, 'ATTENDED')

    def test_rejects_other_with_blank_reason(self):
        body = {'items': [
            {'registration_id': self.alice_reg.id, 'status': 'OTHER', 'reason': ''},
        ]}
        response = self.client.post(_url(self.session.id), body, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('reason', str(response.data).lower())
        self.assertEqual(TutorialAttendance.objects.count(), 0)

    def test_rejects_invalid_status(self):
        body = {'items': [
            {'registration_id': self.alice_reg.id, 'status': 'BOGUS', 'reason': ''},
        ]}
        response = self.client.post(_url(self.session.id), body, format='json')
        self.assertEqual(response.status_code, 400)

    def test_rejects_registration_from_other_session(self):
        other_session = factories.make_session(sequence=99)
        body = {'items': [
            # alice_reg belongs to self.session, not other_session
            {'registration_id': self.alice_reg.id, 'status': 'ATTENDED', 'reason': ''},
        ]}
        response = self.client.post(_url(other_session.id), body, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('does not belong', str(response.data).lower())

    def test_returns_refreshed_get_shape(self):
        body = {'items': [
            {'registration_id': self.alice_reg.id, 'status': 'ATTENDED', 'reason': ''},
        ]}
        response = self.client.post(_url(self.session.id), body, format='json')
        self.assertIn('session', response.data)
        self.assertIn('registrations', response.data)
        self.assertIn('attendance_enabled', response.data)
```

- [ ] **Step 2: Run failing tests**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_attendance.AdminAttendancePostTests -v 2`
Expected: all fail (no POST handler).

- [ ] **Step 3: Add save serializer**

Append to `admin_serializers.py`:

```python
class _AdminAttendanceItemSerializer(serializers.Serializer):
    registration_id = serializers.IntegerField()
    status = serializers.ChoiceField(
        choices=['ATTENDED', 'ABSENT', 'LATE', 'OTHER'],
    )
    reason = serializers.CharField(allow_blank=True, default='')

    def validate(self, attrs):
        if attrs['status'] == 'OTHER' and not attrs.get('reason', '').strip():
            raise serializers.ValidationError({
                'reason': 'Required when status is OTHER.',
            })
        return attrs


class AdminAttendanceSaveSerializer(serializers.Serializer):
    """Save body for POST attendance. ``session`` injected by the view."""
    items = _AdminAttendanceItemSerializer(many=True)

    def __init__(self, *args, session=None, **kwargs):
        self._session = session
        super().__init__(*args, **kwargs)

    def validate_items(self, items):
        if self._session is None:
            return items
        # Ensure every registration_id in items belongs to this session.
        ids = [item['registration_id'] for item in items]
        valid_ids = set(
            TutorialRegistration.objects
            .filter(tutorial_session=self._session, id__in=ids)
            .values_list('id', flat=True)
        )
        bad = [i for i in ids if i not in valid_ids]
        if bad:
            raise serializers.ValidationError(
                f'registration(s) {bad} do not belong to this session',
            )
        return items
```

- [ ] **Step 4: Add `post` method on the view**

Modify `admin_views.py` `AdminTutorialAttendanceView`:

```python
from django.db import transaction

from tutorials.admin_serializers import (
    AdminAttendanceGetSerializer,
    AdminAttendanceSaveSerializer,
)
from tutorials.models import TutorialAttendance


class AdminTutorialAttendanceView(APIView):
    permission_classes = [IsSuperUser]

    def _get_session(self, session_id):
        return get_object_or_404(
            TutorialSessions.objects
            .select_related('venue', 'tutorial_event')
            .filter(tutorial_event__cancelled=False),
            id=session_id,
        )

    def _attendance_enabled(self, session):
        today = timezone.now().date()
        start = session.start_date
        if hasattr(start, 'date'):
            start = start.date()
        return today >= start

    def _build_payload(self, session):
        # ... unchanged from Task 10 ...

    def get(self, request, session_id: int):
        session = self._get_session(session_id)
        return Response(self._build_payload(session))

    def post(self, request, session_id: int):
        session = self._get_session(session_id)
        ser = AdminAttendanceSaveSerializer(data=request.data, session=session)
        ser.is_valid(raise_exception=True)
        with transaction.atomic():
            for item in ser.validated_data['items']:
                TutorialAttendance.objects.update_or_create(
                    registration_id=item['registration_id'],
                    defaults={
                        'status': item['status'],
                        'reason': item['reason'],
                        'recorded_by': request.user,
                        'recorded_at': timezone.now(),
                    },
                )
        # Re-read so caller gets the canonical post-save state.
        session.refresh_from_db()
        return Response(self._build_payload(session))
```

- [ ] **Step 5: Run tests — should pass**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_attendance -v 2`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/tutorials/admin_views.py backend/django_Admin3/tutorials/admin_serializers.py backend/django_Admin3/tutorials/tests/test_admin_attendance.py
git commit -m "feat(tutorials): add admin attendance POST upsert with validation

Validates registration belongs to session, status is in choices,
reason is non-blank when status=OTHER. Wraps update_or_create in
transaction.atomic. Returns refreshed GET shape so client can sync.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Attendance POST — 409 not_yet_open, atomic rollback, recorded_by from request

**Files:**
- Modify: `backend/django_Admin3/tutorials/admin_views.py`
- Modify: `backend/django_Admin3/tutorials/tests/test_admin_attendance.py`

- [ ] **Step 1: Write failing tests**

Append to `test_admin_attendance.py`:

```python
class AdminAttendancePostExtraTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', password='x', is_superuser=True, is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)
        self.session = factories.make_session()
        self.alice = factories.make_student('alice')
        self.alice_reg = _register(self.alice, self.session)

    def test_returns_409_when_attendance_not_enabled(self):
        # Session in the future
        self.session.start_date = timezone.now() + timedelta(days=2)
        self.session.save()
        body = {'items': [
            {'registration_id': self.alice_reg.id, 'status': 'ATTENDED', 'reason': ''},
        ]}
        response = self.client.post(_url(self.session.id), body, format='json')
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data.get('code'), 'not_yet_open')
        self.assertEqual(TutorialAttendance.objects.count(), 0)

    def test_recorded_by_from_request_user_not_body(self):
        self.session.start_date = timezone.now() - timedelta(hours=1)
        self.session.save()
        other = User.objects.create_user(username='other', is_superuser=True)
        body = {'items': [
            {'registration_id': self.alice_reg.id, 'status': 'ATTENDED',
             'reason': '', 'recorded_by': other.id},  # spoof attempt
        ]}
        response = self.client.post(_url(self.session.id), body, format='json')
        self.assertEqual(response.status_code, 200)
        a = TutorialAttendance.objects.get(registration=self.alice_reg)
        self.assertEqual(a.recorded_by, self.admin)

    def test_atomic_rollback_on_partial_failure(self):
        self.session.start_date = timezone.now() - timedelta(hours=1)
        self.session.save()
        body = {'items': [
            {'registration_id': self.alice_reg.id, 'status': 'ATTENDED', 'reason': ''},
            {'registration_id': self.alice_reg.id, 'status': 'OTHER', 'reason': ''},
        ]}
        response = self.client.post(_url(self.session.id), body, format='json')
        self.assertEqual(response.status_code, 400)
        # First item must NOT have been written.
        self.assertEqual(TutorialAttendance.objects.count(), 0)
```

- [ ] **Step 2: Run failing tests**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_attendance.AdminAttendancePostExtraTests -v 2`
Expected: 409 test fails (currently 200 or 400). recorded_by test passes already (we set from request). Atomic test passes already (validation runs before save).

- [ ] **Step 3: Add 409 short-circuit in `post()`**

Modify `admin_views.py` — add the pre-flight check at the top of `post()`:

```python
    def post(self, request, session_id: int):
        session = self._get_session(session_id)
        if not self._attendance_enabled(session):
            return Response(
                {
                    'detail': 'Session has not started.',
                    'code': 'not_yet_open',
                },
                status=409,
            )
        ser = AdminAttendanceSaveSerializer(data=request.data, session=session)
        ser.is_valid(raise_exception=True)
        with transaction.atomic():
            for item in ser.validated_data['items']:
                TutorialAttendance.objects.update_or_create(
                    registration_id=item['registration_id'],
                    defaults={
                        'status': item['status'],
                        'reason': item['reason'],
                        'recorded_by': request.user,
                        'recorded_at': timezone.now(),
                    },
                )
        session.refresh_from_db()
        return Response(self._build_payload(session))
```

- [ ] **Step 4: Run all attendance tests**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials.tests.test_admin_attendance -v 2`
Expected: all pass.

- [ ] **Step 5: Run the full backend tutorials test suite as a regression check**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test tutorials -v 2`
Expected: no regressions.

- [ ] **Step 6: Commit**

```bash
git add backend/django_Admin3/tutorials/admin_views.py backend/django_Admin3/tutorials/tests/test_admin_attendance.py
git commit -m "feat(tutorials): return 409 not_yet_open before validating attendance

Short-circuit POST when today < session.start_date. Also covers
recorded_by spoofing protection and atomic rollback explicitly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 5 — Frontend: service + types (1 task)

### Task 13: Service wrapper and shared types

**Files:**
- Create: `frontend/react-Admin3/src/services/admin/tutorialEventsAdminService.ts`
- Create: `frontend/react-Admin3/src/components/admin/tutorial-events/types.ts`

- [ ] **Step 1: Create types module**

Create `frontend/react-Admin3/src/components/admin/tutorial-events/types.ts`:

```ts
// Types mirror the backend admin event/attendance contract.

export interface SubjectMini { code: string; description: string; }
export interface SittingMini { id: number; session_code: string; start_date: string; end_date: string; }
export interface LocationMini { id: number; name: string; }
export interface VenueMini { id: number; name: string; }
export interface InstructorMini { id: number; name: string; }

export interface SessionEmbedded {
  id: number;
  title: string;
  sequence: number;
  start_date: string;
  end_date: string;
  venue: VenueMini | null;
  instructors: InstructorMini[];
  enrolled_count: number;
}

export interface EventDTO {
  id: number;
  code: string;
  subject: SubjectMini | null;
  exam_session: SittingMini | null;
  start_date: string;
  end_date: string;
  location: LocationMini | null;
  venue: VenueMini | null;
  main_instructor: InstructorMini | null;
  all_instructors: InstructorMini[];
  finalisation_date: string | null;
  enrolled_distinct: number;
  sessions: SessionEmbedded[];
}

export interface PaginatedEvents {
  count: number;
  next: string | null;
  previous: string | null;
  results: EventDTO[];
}

export interface FilterOptions {
  subjects: SubjectMini[];
  locations: LocationMini[];
  venues: VenueMini[];
  instructors: InstructorMini[];
  sittings: SittingMini[];
}

export type AttendanceStatus = 'ATTENDED' | 'ABSENT' | 'LATE' | 'OTHER';

export interface RosterRowDTO {
  registration_id: number;
  student: { student_ref: number; first_name: string; last_name: string };
  current_status: AttendanceStatus | null;
  current_reason: string;
}

export interface AttendancePayload {
  session: {
    id: number;
    title: string;
    start_date: string;
    end_date: string;
    venue: VenueMini | null;
    tutorial_event: { id: number; code: string };
  };
  attendance_enabled: boolean;
  registrations: RosterRowDTO[];
}

export interface AttendanceSaveItem {
  registration_id: number;
  status: AttendanceStatus;
  reason: string;
}

export interface EventFilters {
  subject_codes: string[];
  code: string;
  start_from: string | null;   // 'YYYY-MM-DD'
  start_to: string | null;
  location_ids: number[];
  venue_ids: number[];
  instructor_id: number | null;
  finalisation_from: string | null;
  finalisation_to: string | null;
  sitting_id: number | 'all' | null;  // null => default (current sitting)
}
```

- [ ] **Step 2: Create service wrapper**

Create `frontend/react-Admin3/src/services/admin/tutorialEventsAdminService.ts`:

```ts
import httpService from '../httpService';
import type {
  AttendancePayload,
  AttendanceSaveItem,
  EventFilters,
  FilterOptions,
  PaginatedEvents,
} from '../../components/admin/tutorial-events/types';

function buildEventParams(
  filters: EventFilters,
  ordering: string,
  page: number,
  pageSize: number,
) {
  const out: Record<string, string> = {
    page: String(page),
    page_size: String(pageSize),
  };
  if (ordering) out.ordering = ordering;
  if (filters.subject_codes.length) out.subject_codes = filters.subject_codes.join(',');
  if (filters.code) out.code = filters.code;
  if (filters.start_from) out.start_from = filters.start_from;
  if (filters.start_to) out.start_to = filters.start_to;
  if (filters.location_ids.length) out.location_ids = filters.location_ids.join(',');
  if (filters.venue_ids.length) out.venue_ids = filters.venue_ids.join(',');
  if (filters.instructor_id != null) out.instructor_id = String(filters.instructor_id);
  if (filters.finalisation_from) out.finalisation_from = filters.finalisation_from;
  if (filters.finalisation_to) out.finalisation_to = filters.finalisation_to;
  if (filters.sitting_id !== null) out.sitting_id = String(filters.sitting_id);
  return out;
}

const tutorialEventsAdminService = {
  listEvents(
    filters: EventFilters,
    ordering: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedEvents> {
    const params = buildEventParams(filters, ordering, page, pageSize);
    return httpService.get('/api/tutorials/admin/events/', { params }).then(r => r.data);
  },

  filterOptions(): Promise<FilterOptions> {
    return httpService
      .get('/api/tutorials/admin/events/filter-options/')
      .then(r => r.data);
  },

  getAttendance(sessionId: number): Promise<AttendancePayload> {
    return httpService
      .get(`/api/tutorials/admin/sessions/${sessionId}/attendance/`)
      .then(r => r.data);
  },

  saveAttendance(
    sessionId: number,
    items: AttendanceSaveItem[],
  ): Promise<AttendancePayload> {
    return httpService
      .post(`/api/tutorials/admin/sessions/${sessionId}/attendance/`, { items })
      .then(r => r.data);
  },
};

export default tutorialEventsAdminService;
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /c/Code/Admin3/frontend/react-Admin3 && npx tsc --noEmit src/services/admin/tutorialEventsAdminService.ts`
Expected: no errors. (If `tsc` complains about missing module references, instead run the project's lint: `npm run lint` and check for errors only in the new files.)

- [ ] **Step 4: Commit**

```bash
git add frontend/react-Admin3/src/services/admin/tutorialEventsAdminService.ts frontend/react-Admin3/src/components/admin/tutorial-events/types.ts
git commit -m "feat(frontend): add tutorial-events admin service and types

Service wraps the four admin endpoints; types module mirrors the
backend contract.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 6 — Frontend: hooks (2 tasks)

### Task 14: useTutorialEventListVM hook

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/tutorial-events/useTutorialEventListVM.ts`
- Create: `frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/useTutorialEventListVM.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/useTutorialEventListVM.test.ts`:

```ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import useTutorialEventListVM from '../useTutorialEventListVM';
import service from '../../../../services/admin/tutorialEventsAdminService';

vi.mock('../../../../services/admin/tutorialEventsAdminService', () => ({
  default: {
    listEvents: vi.fn(),
    filterOptions: vi.fn(),
    getAttendance: vi.fn(),
    saveAttendance: vi.fn(),
  },
}));

const mock = vi.mocked(service);

beforeEach(() => {
  vi.useFakeTimers();
  mock.listEvents.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
  mock.filterOptions.mockResolvedValue({
    subjects: [], locations: [], venues: [], instructors: [], sittings: [],
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useTutorialEventListVM', () => {
  it('fetches filter-options and events on mount', async () => {
    renderHook(() => useTutorialEventListVM());
    await act(async () => { vi.runAllTimers(); await Promise.resolve(); });
    expect(mock.filterOptions).toHaveBeenCalled();
    expect(mock.listEvents).toHaveBeenCalled();
  });

  it('debounces text filter changes by 300ms', async () => {
    const { result } = renderHook(() => useTutorialEventListVM());
    await act(async () => { vi.runAllTimers(); await Promise.resolve(); });
    mock.listEvents.mockClear();

    act(() => result.current.setFilter('code', 'CP1'));
    expect(mock.listEvents).not.toHaveBeenCalled();

    await act(async () => { vi.advanceTimersByTime(300); await Promise.resolve(); });
    expect(mock.listEvents).toHaveBeenCalledTimes(1);
  });

  it('non-text filters fire immediately', async () => {
    const { result } = renderHook(() => useTutorialEventListVM());
    await act(async () => { vi.runAllTimers(); await Promise.resolve(); });
    mock.listEvents.mockClear();

    act(() => result.current.setFilter('subject_codes', ['CM2']));
    await act(async () => { await Promise.resolve(); });
    expect(mock.listEvents).toHaveBeenCalledTimes(1);
  });

  it('resets pagination to 1 when a filter changes', async () => {
    const { result } = renderHook(() => useTutorialEventListVM());
    await act(async () => { vi.runAllTimers(); await Promise.resolve(); });
    act(() => result.current.setPagination({ page: 5, pageSize: 20 }));
    expect(result.current.pagination.page).toBe(5);

    act(() => result.current.setFilter('subject_codes', ['CM2']));
    expect(result.current.pagination.page).toBe(1);
  });

  it('toggleExpanded adds and removes ids', async () => {
    const { result } = renderHook(() => useTutorialEventListVM());
    await act(async () => { vi.runAllTimers(); await Promise.resolve(); });
    act(() => result.current.toggleExpanded(42));
    expect(result.current.isExpanded(42)).toBe(true);
    act(() => result.current.toggleExpanded(42));
    expect(result.current.isExpanded(42)).toBe(false);
  });

  it('openAttendance / closeAttendance set and clear target', async () => {
    const { result } = renderHook(() => useTutorialEventListVM());
    await act(async () => { vi.runAllTimers(); await Promise.resolve(); });
    const session = { id: 99, title: 'S', start_date: '', end_date: '', venue: null,
                      tutorial_event: { id: 1, code: 'EV' } } as any;
    act(() => result.current.openAttendance(session));
    expect(result.current.attendanceTarget?.id).toBe(99);
    act(() => result.current.closeAttendance());
    expect(result.current.attendanceTarget).toBeNull();
  });
});
```

- [ ] **Step 2: Run failing tests**

Run: `cd /c/Code/Admin3/frontend/react-Admin3 && npx vitest run src/components/admin/tutorial-events/__tests__/useTutorialEventListVM.test.ts`
Expected: failures (hook doesn't exist).

- [ ] **Step 3: Implement the hook**

Create `frontend/react-Admin3/src/components/admin/tutorial-events/useTutorialEventListVM.ts`:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import service from '../../../services/admin/tutorialEventsAdminService';
import type {
  EventDTO, EventFilters, FilterOptions, SessionEmbedded,
} from './types';

interface ModalSession {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  venue: SessionEmbedded['venue'];
  tutorial_event: { id: number; code: string };
}

const DEFAULT_FILTERS: EventFilters = {
  subject_codes: [],
  code: '',
  start_from: null,
  start_to: null,
  location_ids: [],
  venue_ids: [],
  instructor_id: null,
  finalisation_from: null,
  finalisation_to: null,
  sitting_id: null, // null -> backend default (current sitting)
};

const DEBOUNCE_MS = 300;

// Returns true iff the only field that differs between `next` and
// `prev` is the text-debounced field `code`. We use a separate
// "applied filters" state so non-text filters fire immediately while
// `code` is debounced.
function onlyCodeChanged(next: EventFilters, prev: EventFilters): boolean {
  const keys = Object.keys(next) as (keyof EventFilters)[];
  for (const k of keys) {
    if (k === 'code') continue;
    if (JSON.stringify((next as any)[k]) !== JSON.stringify((prev as any)[k])) {
      return false;
    }
  }
  return next.code !== prev.code;
}

export default function useTutorialEventListVM() {
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [ordering, setOrdering] = useState('start_date');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [meta, setMeta] = useState({ count: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [attendanceTarget, setAttendanceTarget] = useState<ModalSession | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [refetchToken, setRefetchToken] = useState(0);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial fetch of filter options.
  useEffect(() => {
    let cancelled = false;
    service.filterOptions().then(opts => {
      if (!cancelled) setFilterOptions(opts);
    }).catch(() => { /* filter bar will fall back to no dropdown options */ });
    return () => { cancelled = true; };
  }, []);

  // Sync filters -> appliedFilters with text-field debouncing.
  useEffect(() => {
    if (filters === appliedFilters) return;
    if (onlyCodeChanged(filters, appliedFilters)) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => setAppliedFilters(filters), DEBOUNCE_MS);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setAppliedFilters(filters);
  }, [filters, appliedFilters]);

  // Fetch events whenever appliedFilters / ordering / pagination /
  // refetchToken change.
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    service.listEvents(
      appliedFilters, ordering, pagination.page, pagination.pageSize,
    ).then(res => {
      if (!cancelled) {
        setEvents(res.results);
        setMeta({ count: res.count });
      }
    }).catch((e: any) => {
      if (!cancelled) setError(e?.response?.data?.detail || 'Failed to load events.');
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [appliedFilters, ordering, pagination.page, pagination.pageSize, refetchToken]);

  const setFilter = useCallback(
    <K extends keyof EventFilters>(name: K, value: EventFilters[K]) => {
      setFilters(prev => ({ ...prev, [name]: value }));
      setPagination(p => ({ ...p, page: 1 }));
    }, [],
  );

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPagination(p => ({ page: 1, pageSize: p.pageSize }));
  }, []);

  const toggleExpanded = useCallback((id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isExpanded = useCallback(
    (id: number) => expandedIds.has(id),
    [expandedIds],
  );

  const openAttendance = useCallback((session: ModalSession) => {
    setAttendanceTarget(session);
  }, []);

  const closeAttendance = useCallback(() => setAttendanceTarget(null), []);

  const handleAttendanceSaved = useCallback(() => {
    // No list refresh in v1 — attendance counts aren't shown.
    closeAttendance();
  }, [closeAttendance]);

  const retry = useCallback(() => setRefetchToken(t => t + 1), []);

  return useMemo(() => ({
    filters,
    ordering,
    pagination,
    events,
    count: meta.count,
    isLoading,
    error,
    filterOptions,
    attendanceTarget,
    setFilter,
    clearFilters,
    setOrdering,
    setPagination,
    toggleExpanded,
    isExpanded,
    openAttendance,
    closeAttendance,
    handleAttendanceSaved,
    retry,
  }), [filters, ordering, pagination, events, meta.count, isLoading, error,
    filterOptions, attendanceTarget, setFilter, clearFilters, toggleExpanded,
    isExpanded, openAttendance, closeAttendance, handleAttendanceSaved, retry]);
}
```

- [ ] **Step 4: Run tests — should pass**

Run: `cd /c/Code/Admin3/frontend/react-Admin3 && npx vitest run src/components/admin/tutorial-events/__tests__/useTutorialEventListVM.test.ts`
Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/tutorial-events/useTutorialEventListVM.ts frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/useTutorialEventListVM.test.ts
git commit -m "feat(frontend): add useTutorialEventListVM hook

State + data fetching for the admin events list. Debounces text
filters by 300ms, resets pagination on filter change, manages
expanded rows and attendance modal target.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: useAttendanceVM hook

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/tutorial-events/useAttendanceVM.ts`
- Create: `frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/useAttendanceVM.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/useAttendanceVM.test.ts`:

```ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import useAttendanceVM from '../useAttendanceVM';
import service from '../../../../services/admin/tutorialEventsAdminService';

vi.mock('../../../../services/admin/tutorialEventsAdminService', () => ({
  default: {
    listEvents: vi.fn(),
    filterOptions: vi.fn(),
    getAttendance: vi.fn(),
    saveAttendance: vi.fn(),
  },
}));

const mock = vi.mocked(service);

const PAYLOAD = {
  session: {
    id: 1, title: 'S1', start_date: '', end_date: '', venue: null,
    tutorial_event: { id: 10, code: 'EV' },
  },
  attendance_enabled: true,
  registrations: [
    {
      registration_id: 100,
      student: { student_ref: 5001, first_name: 'Alice', last_name: 'Smith' },
      current_status: null, current_reason: '',
    },
    {
      registration_id: 101,
      student: { student_ref: 5002, first_name: 'Bob', last_name: 'Lee' },
      current_status: 'ATTENDED' as const, current_reason: '',
    },
  ],
};

beforeEach(() => {
  mock.getAttendance.mockResolvedValue(PAYLOAD);
  mock.saveAttendance.mockResolvedValue(PAYLOAD);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useAttendanceVM', () => {
  it('fetches on mount and populates roster', async () => {
    const { result } = renderHook(() => useAttendanceVM(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.roster).toHaveLength(2);
    expect(result.current.attendanceEnabled).toBe(true);
  });

  it('setStatus marks row dirty when changed', async () => {
    const { result } = renderHook(() => useAttendanceVM(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Bob already ATTENDED — setting same value is not dirty
    act(() => result.current.setStatus(101, 'ATTENDED'));
    expect(result.current.roster.find(r => r.registration_id === 101)!.dirty).toBe(false);

    act(() => result.current.setStatus(101, 'ABSENT'));
    expect(result.current.roster.find(r => r.registration_id === 101)!.dirty).toBe(true);
  });

  it('save() POSTs all items and refreshes state', async () => {
    const { result } = renderHook(() => useAttendanceVM(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setStatus(100, 'ATTENDED'));
    await act(async () => { await result.current.save(); });
    expect(mock.saveAttendance).toHaveBeenCalledWith(1, expect.arrayContaining([
      expect.objectContaining({ registration_id: 100, status: 'ATTENDED' }),
      expect.objectContaining({ registration_id: 101, status: 'ATTENDED' }),
    ]));
  });

  it('save() does not clear local state on failure', async () => {
    mock.saveAttendance.mockRejectedValueOnce({ response: { status: 500 } });
    const { result } = renderHook(() => useAttendanceVM(1));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setStatus(100, 'ATTENDED'));
    await act(async () => { try { await result.current.save(); } catch {} });
    expect(result.current.roster.find(r => r.registration_id === 100)!.status).toBe('ATTENDED');
    expect(result.current.error).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run failing tests**

Run: `cd /c/Code/Admin3/frontend/react-Admin3 && npx vitest run src/components/admin/tutorial-events/__tests__/useAttendanceVM.test.ts`
Expected: failures (hook doesn't exist).

- [ ] **Step 3: Implement the hook**

Create `frontend/react-Admin3/src/components/admin/tutorial-events/useAttendanceVM.ts`:

```ts
import { useCallback, useEffect, useMemo, useState } from 'react';
import service from '../../../services/admin/tutorialEventsAdminService';
import type {
  AttendancePayload, AttendanceStatus, RosterRowDTO,
} from './types';

export interface RosterRow {
  registration_id: number;
  student: RosterRowDTO['student'];
  status: AttendanceStatus | '';   // '' = unset
  reason: string;
  current_status: AttendanceStatus | null;
  current_reason: string;
  dirty: boolean;
}

function rowFromDTO(dto: RosterRowDTO): RosterRow {
  return {
    registration_id: dto.registration_id,
    student: dto.student,
    status: dto.current_status ?? '',
    reason: dto.current_reason ?? '',
    current_status: dto.current_status,
    current_reason: dto.current_reason ?? '',
    dirty: false,
  };
}

function isDirty(row: RosterRow): boolean {
  if (row.status !== (row.current_status ?? '')) return true;
  if (row.status === 'OTHER' && row.reason !== row.current_reason) return true;
  return false;
}

export default function useAttendanceVM(sessionId: number) {
  const [session, setSession] = useState<AttendancePayload['session'] | null>(null);
  const [attendanceEnabled, setAttendanceEnabled] = useState(false);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyPayload = useCallback((p: AttendancePayload) => {
    setSession(p.session);
    setAttendanceEnabled(p.attendance_enabled);
    setRoster(p.registrations.map(rowFromDTO));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    service.getAttendance(sessionId).then(p => {
      if (!cancelled) applyPayload(p);
    }).catch((e: any) => {
      if (!cancelled) setError(e?.response?.data?.detail || 'Failed to load roster.');
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [sessionId, applyPayload]);

  const setStatus = useCallback((regId: number, status: AttendanceStatus) => {
    setRoster(prev => prev.map(r => {
      if (r.registration_id !== regId) return r;
      const next: RosterRow = { ...r, status };
      next.dirty = isDirty(next);
      return next;
    }));
  }, []);

  const setReason = useCallback((regId: number, reason: string) => {
    setRoster(prev => prev.map(r => {
      if (r.registration_id !== regId) return r;
      const next: RosterRow = { ...r, reason };
      next.dirty = isDirty(next);
      return next;
    }));
  }, []);

  const save = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    try {
      const items = roster
        .filter(r => r.status !== '')
        .map(r => ({
          registration_id: r.registration_id,
          status: r.status as AttendanceStatus,
          reason: r.status === 'OTHER' ? r.reason : '',
        }));
      const updated = await service.saveAttendance(sessionId, items);
      applyPayload(updated);
    } catch (e: any) {
      const code = e?.response?.data?.code;
      if (code === 'not_yet_open') {
        setError('Session has not started yet.');
      } else {
        setError(e?.response?.data?.detail || 'Save failed — please try again.');
      }
      throw e;
    } finally {
      setIsSaving(false);
    }
  }, [roster, sessionId, applyPayload]);

  const reset = useCallback(() => {
    setRoster(prev => prev.map(rowFromDTO_fromCurrent));
    function rowFromDTO_fromCurrent(r: RosterRow): RosterRow {
      return {
        ...r,
        status: r.current_status ?? '',
        reason: r.current_reason ?? '',
        dirty: false,
      };
    }
  }, []);

  const hasInvalidOther = useMemo(
    () => roster.some(r => r.status === 'OTHER' && !r.reason.trim()),
    [roster],
  );

  const hasDirty = useMemo(() => roster.some(r => r.dirty), [roster]);

  return {
    session,
    attendanceEnabled,
    roster,
    isLoading,
    isSaving,
    error,
    hasDirty,
    hasInvalidOther,
    setStatus,
    setReason,
    save,
    reset,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd /c/Code/Admin3/frontend/react-Admin3 && npx vitest run src/components/admin/tutorial-events/__tests__/useAttendanceVM.test.ts`
Expected: all 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/tutorial-events/useAttendanceVM.ts frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/useAttendanceVM.test.ts
git commit -m "feat(frontend): add useAttendanceVM hook

Manages modal roster state (status + reason per row), dirty tracking,
save/reset. Maps not_yet_open 409 to a friendly error message.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 7 — Frontend: components (4 tasks)

### Task 16: TutorialEventFilterBar component

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/tutorial-events/TutorialEventFilterBar.tsx`
- Create: `frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/TutorialEventFilterBar.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/TutorialEventFilterBar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import TutorialEventFilterBar from '../TutorialEventFilterBar';
import type { FilterOptions } from '../types';

const FILTER_OPTIONS: FilterOptions = {
  subjects: [{ code: 'CM2', description: 'Actuarial Practice' }],
  locations: [{ id: 1, name: 'London' }],
  venues: [{ id: 5, name: 'BPP Centre' }],
  instructors: [{ id: 7, name: 'Karen Smith' }],
  sittings: [{ id: 17, session_code: '2024S', start_date: '', end_date: '' }],
};

const baseVm = {
  filters: {
    subject_codes: [], code: '', start_from: null, start_to: null,
    location_ids: [], venue_ids: [], instructor_id: null,
    finalisation_from: null, finalisation_to: null, sitting_id: null,
  },
  filterOptions: FILTER_OPTIONS,
  setFilter: vi.fn(),
  clearFilters: vi.fn(),
};

describe('TutorialEventFilterBar', () => {
  it('renders code text input that calls setFilter("code")', async () => {
    const setFilter = vi.fn();
    render(<TutorialEventFilterBar vm={{ ...baseVm, setFilter } as any} />);
    const input = screen.getByLabelText(/code/i);
    await userEvent.type(input, 'CP1');
    // Last call should be setFilter('code', 'CP1') — we test the latest argument.
    expect(setFilter).toHaveBeenCalled();
    const lastCall = setFilter.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('code');
  });

  it('renders Clear filters button that calls clearFilters', async () => {
    const clearFilters = vi.fn();
    render(<TutorialEventFilterBar vm={{ ...baseVm, clearFilters } as any} />);
    await userEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(clearFilters).toHaveBeenCalled();
  });

  it('renders nothing for the dropdowns while filterOptions is null', () => {
    render(<TutorialEventFilterBar vm={{ ...baseVm, filterOptions: null } as any} />);
    expect(screen.queryByRole('combobox', { name: /subject/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run failing tests**

Run: `cd /c/Code/Admin3/frontend/react-Admin3 && npx vitest run src/components/admin/tutorial-events/__tests__/TutorialEventFilterBar.test.tsx`
Expected: failures (component doesn't exist).

- [ ] **Step 3: Implement the component (minimal — text + clear)**

Create `frontend/react-Admin3/src/components/admin/tutorial-events/TutorialEventFilterBar.tsx`:

```tsx
import { Card, CardContent } from '@/components/admin/ui/card';
import { Input } from '@/components/admin/ui/input';
import { Label } from '@/components/admin/ui/label';
import { Button } from '@/components/admin/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/admin/ui/select';
import type { EventFilters, FilterOptions } from './types';

interface VM {
  filters: EventFilters;
  filterOptions: FilterOptions | null;
  setFilter: <K extends keyof EventFilters>(name: K, value: EventFilters[K]) => void;
  clearFilters: () => void;
}

export default function TutorialEventFilterBar({ vm }: { vm: VM }) {
  const { filters, filterOptions, setFilter, clearFilters } = vm;

  return (
    <Card className="mb-4">
      <CardContent className="grid gap-4 p-4 md:grid-cols-3 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="filter-code">Code</Label>
          <Input
            id="filter-code"
            placeholder="e.g. CP1"
            value={filters.code}
            onChange={e => setFilter('code', e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="filter-start-from">Start from</Label>
          <Input
            id="filter-start-from"
            type="date"
            value={filters.start_from ?? ''}
            onChange={e => setFilter('start_from', e.target.value || null)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="filter-start-to">Start to</Label>
          <Input
            id="filter-start-to"
            type="date"
            value={filters.start_to ?? ''}
            onChange={e => setFilter('start_to', e.target.value || null)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="filter-finalisation-from">Finalisation from</Label>
          <Input
            id="filter-finalisation-from"
            type="date"
            value={filters.finalisation_from ?? ''}
            onChange={e => setFilter('finalisation_from', e.target.value || null)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="filter-finalisation-to">Finalisation to</Label>
          <Input
            id="filter-finalisation-to"
            type="date"
            value={filters.finalisation_to ?? ''}
            onChange={e => setFilter('finalisation_to', e.target.value || null)}
          />
        </div>

        {filterOptions && (
          <>
            <div className="space-y-1">
              <Label htmlFor="filter-subject">Subject</Label>
              <Select
                value={filters.subject_codes[0] ?? ''}
                onValueChange={v => setFilter('subject_codes', v ? [v] : [])}
              >
                <SelectTrigger id="filter-subject" aria-label="Subject">
                  <SelectValue placeholder="Any subject" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.subjects.map(s => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.code} — {s.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="filter-location">Location</Label>
              <Select
                value={filters.location_ids[0] != null ? String(filters.location_ids[0]) : ''}
                onValueChange={v => setFilter('location_ids', v ? [Number(v)] : [])}
              >
                <SelectTrigger id="filter-location" aria-label="Location">
                  <SelectValue placeholder="Any location" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.locations.map(l => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="filter-venue">Venue</Label>
              <Select
                value={filters.venue_ids[0] != null ? String(filters.venue_ids[0]) : ''}
                onValueChange={v => setFilter('venue_ids', v ? [Number(v)] : [])}
              >
                <SelectTrigger id="filter-venue" aria-label="Venue">
                  <SelectValue placeholder="Any venue" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.venues.map(vn => (
                    <SelectItem key={vn.id} value={String(vn.id)}>{vn.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="filter-instructor">Instructor</Label>
              <Select
                value={filters.instructor_id != null ? String(filters.instructor_id) : ''}
                onValueChange={v => setFilter('instructor_id', v ? Number(v) : null)}
              >
                <SelectTrigger id="filter-instructor" aria-label="Instructor">
                  <SelectValue placeholder="Any instructor" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.instructors.map(i => (
                    <SelectItem key={i.id} value={String(i.id)}>{i.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="filter-sitting">Sitting</Label>
              <Select
                value={
                  filters.sitting_id === null
                    ? ''
                    : filters.sitting_id === 'all'
                      ? 'all'
                      : String(filters.sitting_id)
                }
                onValueChange={v => {
                  if (v === '') return setFilter('sitting_id', null);
                  if (v === 'all') return setFilter('sitting_id', 'all');
                  setFilter('sitting_id', Number(v));
                }}
              >
                <SelectTrigger id="filter-sitting" aria-label="Sitting">
                  <SelectValue placeholder="Current sitting (default)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sittings</SelectItem>
                  {filterOptions.sittings.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.session_code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="md:col-span-3 lg:col-span-4">
          <Button variant="outline" onClick={clearFilters}>Clear filters</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run tests — should pass**

Run: `cd /c/Code/Admin3/frontend/react-Admin3 && npx vitest run src/components/admin/tutorial-events/__tests__/TutorialEventFilterBar.test.tsx`
Expected: all 3 pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/tutorial-events/TutorialEventFilterBar.tsx frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/TutorialEventFilterBar.test.tsx
git commit -m "feat(frontend): add TutorialEventFilterBar

Wires the filter form to vm.setFilter and vm.clearFilters; renders
dropdowns lazily once filterOptions arrives. Single-select on subject/
location/venue/instructor for v1 (multi-select can be added later).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: TutorialEventRow component

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/tutorial-events/TutorialEventRow.tsx`
- Create: `frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/TutorialEventRow.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/TutorialEventRow.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import TutorialEventRow from '../TutorialEventRow';
import type { EventDTO } from '../types';

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

const EVENT: EventDTO = {
  id: 42, code: 'CP1-01-24A',
  subject: { code: 'CP1', description: 'Actuarial Practice' },
  exam_session: null,
  start_date: '2026-06-01', end_date: '2026-06-15',
  location: { id: 1, name: 'London' },
  venue: { id: 5, name: 'BPP Centre' },
  main_instructor: { id: 7, name: 'Karen Smith' },
  all_instructors: [{ id: 7, name: 'Karen Smith' }, { id: 9, name: 'Mark Davis' }],
  finalisation_date: '2026-05-15',
  enrolled_distinct: 28,
  sessions: [
    {
      id: 101, title: 'CP1-01-24A-1', sequence: 1,
      start_date: PAST, end_date: PAST, venue: { id: 5, name: 'BPP Centre' },
      instructors: [], enrolled_count: 28,
    },
    {
      id: 102, title: 'CP1-01-24A-2', sequence: 2,
      start_date: FUTURE, end_date: FUTURE, venue: { id: 5, name: 'BPP Centre' },
      instructors: [], enrolled_count: 28,
    },
  ],
};

function renderRow(overrides: Partial<{
  expanded: boolean; onToggle: () => void; onOpenAttendance: (s: any) => void;
}> = {}) {
  const onToggle = overrides.onToggle ?? vi.fn();
  const onOpenAttendance = overrides.onOpenAttendance ?? vi.fn();
  return render(
    <table><tbody>
      <TutorialEventRow
        event={EVENT}
        expanded={overrides.expanded ?? false}
        onToggle={onToggle}
        onOpenAttendance={onOpenAttendance}
      />
    </tbody></table>,
  );
}

describe('TutorialEventRow', () => {
  it('renders event main row', () => {
    renderRow();
    expect(screen.getByText('CP1-01-24A')).toBeInTheDocument();
    expect(screen.getByText(/Karen Smith.*\+1/)).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
  });

  it('does not render sessions when collapsed', () => {
    renderRow({ expanded: false });
    expect(screen.queryByText('CP1-01-24A-1')).not.toBeInTheDocument();
  });

  it('renders sessions when expanded', () => {
    renderRow({ expanded: true });
    expect(screen.getByText('CP1-01-24A-1')).toBeInTheDocument();
    expect(screen.getByText('CP1-01-24A-2')).toBeInTheDocument();
  });

  it('chevron click triggers onToggle', async () => {
    const onToggle = vi.fn();
    renderRow({ onToggle });
    await userEvent.click(screen.getByRole('button', { name: /expand/i }));
    expect(onToggle).toHaveBeenCalled();
  });

  it('Attendance menu enabled for past session, disabled for future', async () => {
    renderRow({ expanded: true });
    // Two "..." menus — open the past session's first
    const menuButtons = screen.getAllByRole('button', { name: /more/i });
    expect(menuButtons).toHaveLength(2);

    await userEvent.click(menuButtons[0]); // past session
    const enabledItem = await screen.findByRole('menuitem', { name: /attendance/i });
    expect(enabledItem).not.toHaveAttribute('aria-disabled', 'true');
    await userEvent.keyboard('{Escape}');

    await userEvent.click(menuButtons[1]); // future session
    const disabledItem = await screen.findByRole('menuitem', { name: /attendance/i });
    expect(disabledItem).toHaveAttribute('aria-disabled', 'true');
  });

  it('clicking enabled Attendance calls onOpenAttendance with the right session', async () => {
    const onOpenAttendance = vi.fn();
    renderRow({ expanded: true, onOpenAttendance });
    const menuButtons = screen.getAllByRole('button', { name: /more/i });
    await userEvent.click(menuButtons[0]);
    await userEvent.click(await screen.findByRole('menuitem', { name: /attendance/i }));
    expect(onOpenAttendance).toHaveBeenCalledWith(expect.objectContaining({ id: 101 }));
  });
});
```

- [ ] **Step 2: Run failing tests**

Run: `cd /c/Code/Admin3/frontend/react-Admin3 && npx vitest run src/components/admin/tutorial-events/__tests__/TutorialEventRow.test.tsx`
Expected: failures (component doesn't exist).

- [ ] **Step 3: Implement the component**

Create `frontend/react-Admin3/src/components/admin/tutorial-events/TutorialEventRow.tsx`:

```tsx
import { ChevronRight, ChevronDown, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/admin/ui/button';
import { TableRow, TableCell } from '@/components/admin/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/admin/ui/dropdown-menu';
import type { EventDTO, SessionEmbedded } from './types';

const COL_COUNT = 7;

function formatInstructorList(event: EventDTO): string {
  const all = event.all_instructors;
  if (!all.length) return '—';
  const head = all[0].name;
  return all.length > 1 ? `${head} +${all.length - 1}` : head;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

interface ModalSession {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  venue: SessionEmbedded['venue'];
  tutorial_event: { id: number; code: string };
}

interface Props {
  event: EventDTO;
  expanded: boolean;
  onToggle: () => void;
  onOpenAttendance: (session: ModalSession) => void;
}

export default function TutorialEventRow({ event, expanded, onToggle, onOpenAttendance }: Props) {
  const Chev = expanded ? ChevronDown : ChevronRight;
  return (
    <>
      <TableRow>
        <TableCell className="w-8">
          <Button
            variant="ghost"
            size="icon"
            aria-label={expanded ? 'Collapse' : 'Expand'}
            onClick={onToggle}
          >
            <Chev className="h-4 w-4" />
          </Button>
        </TableCell>
        <TableCell className="font-mono">{event.code}</TableCell>
        <TableCell>{formatDate(event.start_date)}</TableCell>
        <TableCell>{formatDate(event.end_date)}</TableCell>
        <TableCell>{event.venue?.name ?? '—'}</TableCell>
        <TableCell>{formatInstructorList(event)}</TableCell>
        <TableCell className="text-right">{event.enrolled_distinct}</TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={COL_COUNT} className="bg-muted/40">
            {event.sessions.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No sessions scheduled.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-2 py-1">Title</th>
                    <th className="px-2 py-1">Start</th>
                    <th className="px-2 py-1">End</th>
                    <th className="px-2 py-1">Venue</th>
                    <th className="px-2 py-1 text-right">Enrolled</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {event.sessions.map(s => {
                    const start = new Date(s.start_date);
                    const enabled = !Number.isNaN(start.getTime()) && start.getTime() <= Date.now();
                    return (
                      <tr key={s.id}>
                        <td className="px-2 py-1">{s.title}</td>
                        <td className="px-2 py-1">{formatDate(s.start_date)}</td>
                        <td className="px-2 py-1">{formatDate(s.end_date)}</td>
                        <td className="px-2 py-1">{s.venue?.name ?? '—'}</td>
                        <td className="px-2 py-1 text-right">{s.enrolled_count}</td>
                        <td>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="More actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={!enabled}
                                onSelect={() =>
                                  enabled &&
                                  onOpenAttendance({
                                    id: s.id,
                                    title: s.title,
                                    start_date: s.start_date,
                                    end_date: s.end_date,
                                    venue: s.venue,
                                    tutorial_event: { id: event.id, code: event.code },
                                  })
                                }
                                title={
                                  enabled
                                    ? undefined
                                    : `Available from ${new Date(s.start_date).toLocaleString()}`
                                }
                              >
                                Attendance
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `cd /c/Code/Admin3/frontend/react-Admin3 && npx vitest run src/components/admin/tutorial-events/__tests__/TutorialEventRow.test.tsx`
Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/tutorial-events/TutorialEventRow.tsx frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/TutorialEventRow.test.tsx
git commit -m "feat(frontend): add TutorialEventRow with expand and attendance menu

Main row + conditional expanded sub-table of sessions. The '...'
DropdownMenu's Attendance item is disabled when session.start_date is
in the future, with a tooltip indicating availability time.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 18: AttendanceRosterRow + AttendanceModal

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceRosterRow.tsx`
- Create: `frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceModal.tsx`
- Create: `frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/AttendanceModal.test.tsx`

- [ ] **Step 1: Write failing tests for the modal**

Create `frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/AttendanceModal.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AttendanceModal from '../AttendanceModal';
import service from '../../../../services/admin/tutorialEventsAdminService';

vi.mock('../../../../services/admin/tutorialEventsAdminService', () => ({
  default: {
    listEvents: vi.fn(),
    filterOptions: vi.fn(),
    getAttendance: vi.fn(),
    saveAttendance: vi.fn(),
  },
}));

const mock = vi.mocked(service);

const PAYLOAD = {
  session: {
    id: 1, title: 'S1',
    start_date: new Date(Date.now() - 60_000).toISOString(),
    end_date: new Date().toISOString(),
    venue: { id: 5, name: 'BPP' },
    tutorial_event: { id: 10, code: 'EV' },
  },
  attendance_enabled: true,
  registrations: [{
    registration_id: 100,
    student: { student_ref: 5001, first_name: 'Alice', last_name: 'Smith' },
    current_status: null, current_reason: '',
  }],
};

beforeEach(() => {
  mock.getAttendance.mockResolvedValue(PAYLOAD);
  mock.saveAttendance.mockResolvedValue(PAYLOAD);
});
afterEach(() => vi.clearAllMocks());

const SESSION = {
  id: 1, title: 'S1', start_date: '', end_date: '', venue: null,
  tutorial_event: { id: 10, code: 'EV' },
} as any;

describe('AttendanceModal', () => {
  it('shows skeleton while loading', () => {
    mock.getAttendance.mockReturnValue(new Promise(() => { /* never */ }));
    render(<AttendanceModal session={SESSION} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByTestId('attendance-skeleton')).toBeInTheDocument();
  });

  it('renders empty message when roster is empty', async () => {
    mock.getAttendance.mockResolvedValue({ ...PAYLOAD, registrations: [] });
    render(<AttendanceModal session={SESSION} onClose={vi.fn()} onSaved={vi.fn()} />);
    await screen.findByText(/no students enrolled/i);
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });

  it('Save disabled when nothing dirty', async () => {
    render(<AttendanceModal session={SESSION} onClose={vi.fn()} onSaved={vi.fn()} />);
    const save = await screen.findByRole('button', { name: /save/i });
    expect(save).toBeDisabled();
  });

  it('Selecting OTHER reveals reason input and disables Save until filled', async () => {
    render(<AttendanceModal session={SESSION} onClose={vi.fn()} onSaved={vi.fn()} />);
    await screen.findByText('Smith, Alice (5001)');
    const select = screen.getAllByRole('combobox')[0];
    await userEvent.click(select);
    await userEvent.click(await screen.findByRole('option', { name: /other/i }));
    const reason = await screen.findByPlaceholderText(/reason/i);
    expect(reason).toBeInTheDocument();

    const save = screen.getByRole('button', { name: /save/i });
    expect(save).toBeDisabled();
    await userEvent.type(reason, 'sick');
    expect(save).not.toBeDisabled();
  });

  it('clicking Save calls service.saveAttendance and onSaved on success', async () => {
    const onSaved = vi.fn();
    render(<AttendanceModal session={SESSION} onClose={vi.fn()} onSaved={onSaved} />);
    await screen.findByText('Smith, Alice (5001)');
    const select = screen.getAllByRole('combobox')[0];
    await userEvent.click(select);
    await userEvent.click(await screen.findByRole('option', { name: /attended/i }));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(mock.saveAttendance).toHaveBeenCalled());
    expect(onSaved).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run failing tests**

Run: `cd /c/Code/Admin3/frontend/react-Admin3 && npx vitest run src/components/admin/tutorial-events/__tests__/AttendanceModal.test.tsx`
Expected: failures.

- [ ] **Step 3: Implement `AttendanceRosterRow`**

Create `frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceRosterRow.tsx`:

```tsx
import { Input } from '@/components/admin/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/admin/ui/select';
import type { AttendanceStatus } from './types';
import type { RosterRow } from './useAttendanceVM';

interface Props {
  row: RosterRow;
  onStatusChange: (status: AttendanceStatus) => void;
  onReasonChange: (reason: string) => void;
  disabled?: boolean;
}

export default function AttendanceRosterRow({
  row, onStatusChange, onReasonChange, disabled,
}: Props) {
  const showReason = row.status === 'OTHER';
  const invalidReason = showReason && !row.reason.trim();
  return (
    <div className="grid grid-cols-12 items-center gap-2 border-b py-2">
      <div className="col-span-5 text-sm">
        {row.student.last_name}, {row.student.first_name} ({row.student.student_ref})
      </div>
      <div className="col-span-3">
        <Select
          value={row.status}
          onValueChange={v => onStatusChange(v as AttendanceStatus)}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Set status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ATTENDED">Attended</SelectItem>
            <SelectItem value="ABSENT">Absent</SelectItem>
            <SelectItem value="LATE">Late</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-4">
        {showReason && (
          <Input
            placeholder="Reason (required)"
            value={row.reason}
            disabled={disabled}
            aria-invalid={invalidReason || undefined}
            className={invalidReason ? 'border-destructive' : undefined}
            onChange={e => onReasonChange(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement `AttendanceModal`**

Create `frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceModal.tsx`:

```tsx
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/admin/ui/dialog';
import { Button } from '@/components/admin/ui/button';
import { toast } from 'sonner';
import useAttendanceVM from './useAttendanceVM';
import AttendanceRosterRow from './AttendanceRosterRow';

interface SessionLite {
  id: number;
  title: string;
  start_date: string;
  end_date: string;
  venue: { id: number; name: string } | null;
  tutorial_event: { id: number; code: string };
}

interface Props {
  session: SessionLite;
  onClose: () => void;
  onSaved: () => void;
}

function formatDateRange(start: string, end: string): string {
  if (!start) return '—';
  const s = new Date(start).toLocaleString();
  const e = end ? new Date(end).toLocaleString() : '';
  return e ? `${s} – ${e}` : s;
}

export default function AttendanceModal({ session, onClose, onSaved }: Props) {
  const vm = useAttendanceVM(session.id);

  const canSave = vm.attendanceEnabled && vm.hasDirty && !vm.hasInvalidOther && !vm.isSaving;

  async function handleSave() {
    try {
      await vm.save();
      toast.success('Attendance saved');
      onSaved();
    } catch {
      // Error already surfaced via vm.error / toast below; no re-throw.
      if (vm.error) toast.error(vm.error);
      else toast.error('Save failed — please try again.');
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{session.title}</DialogTitle>
          <DialogDescription>
            {formatDateRange(session.start_date, session.end_date)}
            {session.venue ? ` • ${session.venue.name}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          {vm.isLoading && (
            <div data-testid="attendance-skeleton" className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-muted" />
              ))}
            </div>
          )}

          {!vm.isLoading && vm.error && (
            <div className="p-4 text-sm text-destructive">{vm.error}</div>
          )}

          {!vm.isLoading && !vm.error && vm.roster.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No students enrolled in this session.
            </div>
          )}

          {!vm.isLoading && !vm.error && vm.roster.length > 0 && (
            <div className="px-2">
              {vm.roster.map(row => (
                <AttendanceRosterRow
                  key={row.registration_id}
                  row={row}
                  disabled={!vm.attendanceEnabled || vm.isSaving}
                  onStatusChange={s => vm.setStatus(row.registration_id, s)}
                  onReasonChange={r => vm.setReason(row.registration_id, r)}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {vm.roster.length > 0 && (
            <Button disabled={!canSave} onClick={handleSave}>
              {vm.isSaving ? 'Saving…' : 'Save'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `cd /c/Code/Admin3/frontend/react-Admin3 && npx vitest run src/components/admin/tutorial-events/__tests__/AttendanceModal.test.tsx`
Expected: all 5 pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceRosterRow.tsx frontend/react-Admin3/src/components/admin/tutorial-events/AttendanceModal.tsx frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/AttendanceModal.test.tsx
git commit -m "feat(frontend): add AttendanceRosterRow and AttendanceModal

Modal owns the useAttendanceVM hook, renders skeleton/empty/error
states, status select with conditional reason input. Save is gated on
attendance_enabled, hasDirty, and no invalid OTHER rows. Sonner
toasts on success/error.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 19: TutorialEventList page composition

**Files:**
- Create: `frontend/react-Admin3/src/components/admin/tutorial-events/TutorialEventList.tsx`
- Create: `frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/TutorialEventList.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/TutorialEventList.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import TutorialEventList from '../TutorialEventList';
import service from '../../../../services/admin/tutorialEventsAdminService';

vi.mock('../../../../services/admin/tutorialEventsAdminService', () => ({
  default: {
    listEvents: vi.fn(),
    filterOptions: vi.fn(),
    getAttendance: vi.fn(),
    saveAttendance: vi.fn(),
  },
}));
const mock = vi.mocked(service);

let isSuper = true;
vi.mock('../../../../hooks/useAuth', () => ({
  useAuth: () => ({ isSuperuser: isSuper }),
}));

beforeEach(() => {
  isSuper = true;
  mock.listEvents.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
  mock.filterOptions.mockResolvedValue({
    subjects: [], locations: [], venues: [], instructors: [], sittings: [],
  });
});
afterEach(() => vi.clearAllMocks());

describe('TutorialEventList', () => {
  it('redirects when not superuser', () => {
    isSuper = false;
    render(<MemoryRouter><TutorialEventList /></MemoryRouter>);
    // Component returns Navigate, so its content does not render.
    expect(screen.queryByText(/Tutorials/i)).not.toBeInTheDocument();
  });

  it('renders header and filter bar for superusers', async () => {
    render(<MemoryRouter><TutorialEventList /></MemoryRouter>);
    await waitFor(() => expect(mock.listEvents).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: /tutorials/i })).toBeInTheDocument();
  });

  it('renders empty state when there are zero events', async () => {
    render(<MemoryRouter><TutorialEventList /></MemoryRouter>);
    await waitFor(() => expect(mock.listEvents).toHaveBeenCalled());
    expect(await screen.findByText(/no events/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run failing tests**

Run: `cd /c/Code/Admin3/frontend/react-Admin3 && npx vitest run src/components/admin/tutorial-events/__tests__/TutorialEventList.test.tsx`
Expected: failures (component doesn't exist).

- [ ] **Step 3: Implement the page**

Create `frontend/react-Admin3/src/components/admin/tutorial-events/TutorialEventList.tsx`:

```tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import {
  AdminPage, AdminPageHeader, AdminPagination,
} from '../composed';
import {
  Table, TableBody, TableHead, TableHeader, TableRow,
} from '@/components/admin/ui/table';
import useTutorialEventListVM from './useTutorialEventListVM';
import TutorialEventFilterBar from './TutorialEventFilterBar';
import TutorialEventRow from './TutorialEventRow';
import AttendanceModal from './AttendanceModal';

export default function TutorialEventList() {
  const { isSuperuser } = useAuth();
  const vm = useTutorialEventListVM();

  if (!isSuperuser) return <Navigate to="/" replace />;

  return (
    <AdminPage>
      <AdminPageHeader title="Tutorials" />
      <TutorialEventFilterBar vm={vm} />

      {vm.error && (
        <div className="my-4 rounded border border-destructive p-3 text-sm text-destructive">
          {vm.error}
          <button className="ml-2 underline" onClick={vm.retry}>Retry</button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Venue</TableHead>
            <TableHead>Instructor</TableHead>
            <TableHead className="text-right">Enrolled</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vm.events.length === 0 && !vm.isLoading && (
            <TableRow>
              <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                No events match the current filters.
              </td>
            </TableRow>
          )}
          {vm.events.map(ev => (
            <TutorialEventRow
              key={ev.id}
              event={ev}
              expanded={vm.isExpanded(ev.id)}
              onToggle={() => vm.toggleExpanded(ev.id)}
              onOpenAttendance={vm.openAttendance}
            />
          ))}
        </TableBody>
      </Table>

      <AdminPagination
        page={vm.pagination.page}
        pageSize={vm.pagination.pageSize}
        count={vm.count}
        onChange={p => vm.setPagination({ ...vm.pagination, page: p })}
      />

      {vm.attendanceTarget && (
        <AttendanceModal
          session={vm.attendanceTarget}
          onClose={vm.closeAttendance}
          onSaved={vm.handleAttendanceSaved}
        />
      )}
    </AdminPage>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `cd /c/Code/Admin3/frontend/react-Admin3 && npx vitest run src/components/admin/tutorial-events/__tests__/TutorialEventList.test.tsx`
Expected: all 3 pass. (If `AdminPagination`'s prop interface differs from `{page, pageSize, count, onChange}`, adjust to match the existing component — read its signature in `components/admin/composed/AdminPagination.tsx`.)

- [ ] **Step 5: Commit**

```bash
git add frontend/react-Admin3/src/components/admin/tutorial-events/TutorialEventList.tsx frontend/react-Admin3/src/components/admin/tutorial-events/__tests__/TutorialEventList.test.tsx
git commit -m "feat(frontend): add TutorialEventList page composition

Wires VM hook, filter bar, table with expandable rows, pagination,
and attendance modal. isSuperuser guard via useAuth.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 8 — Frontend: routing + nav (1 task)

### Task 20: Add route and sidebar entry

**Files:**
- Modify: `frontend/react-Admin3/src/App.js`
- Modify: `frontend/react-Admin3/src/components/admin/layout/AppSidebar.tsx`

- [ ] **Step 1: Find the sidebar entry pattern**

Run: `cd /c/Code/Admin3 && grep -n "to=\"/admin" frontend/react-Admin3/src/components/admin/layout/AppSidebar.tsx | head -5`
Note one or two existing entries (e.g., orders) so the new entry mirrors their structure.

- [ ] **Step 2: Add lazy route in App.js**

Find the existing admin lazy imports block and add:

```js
const TutorialEventList = lazy(() =>
  import('./components/admin/tutorial-events/TutorialEventList'),
);
```

In the admin route section (under `<AdminLayout>`), add:

```jsx
<Route path="tutorial-events" element={<TutorialEventList />} />
```

- [ ] **Step 3: Add sidebar entry**

In `AppSidebar.tsx`, alongside the other admin nav entries, add a "Tutorials" link:

```tsx
import { GraduationCap } from 'lucide-react';
// ...inside the nav items list:
{
  title: 'Tutorials',
  url: '/admin/tutorial-events',
  icon: GraduationCap,
}
```

(Match the existing data shape — read the file before editing.)

- [ ] **Step 4: Manual smoke test**

Run: `cd /c/Code/Admin3/frontend/react-Admin3 && npm start` (in a separate terminal; backend already running on 8888 per CLAUDE.md).
- Log in as a superuser at http://127.0.0.1:3000.
- Navigate to /admin and click "Tutorials" in the sidebar.
- Verify the page loads, the filter bar renders, and a table (possibly empty) appears.
- Click a chevron to expand a row; click `...` → Attendance for a started session; verify the modal opens.

- [ ] **Step 5: Run full frontend test suite as a regression check**

Run: `cd /c/Code/Admin3/frontend/react-Admin3 && npx vitest run`
Expected: existing tests still pass; new ones too.

- [ ] **Step 6: Commit**

```bash
git add frontend/react-Admin3/src/App.js frontend/react-Admin3/src/components/admin/layout/AppSidebar.tsx
git commit -m "feat(frontend): wire Tutorials sidebar entry and route

Lazy-loaded TutorialEventList at /admin/tutorial-events with a new
sidebar entry under the existing admin nav.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 9 — Final regression (1 task)

### Task 21: Full backend + frontend regression sweep

**Files:** none (verification only)

- [ ] **Step 1: Run backend tests**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py test -v 2`
Expected: all pre-existing tests still pass; new ones too.

- [ ] **Step 2: Run schema-placement check**

Run: `cd /c/Code/Admin3/backend/django_Admin3 && /c/Code/Admin3/.venv/Scripts/python.exe manage.py verify_schema_placement`
Expected: pass — we added no new models so this is a sanity check.

- [ ] **Step 3: Run frontend tests**

Run: `cd /c/Code/Admin3/frontend/react-Admin3 && npx vitest run`
Expected: all tests pass.

- [ ] **Step 4: Manual end-to-end smoke test**

With the backend (`python manage.py runserver 8888`) and frontend (`npm start`) running:

1. Log in as a superuser.
2. Open `/admin/tutorial-events`.
3. Verify default-sitting filter is applied (look at the URL or DevTools network call — `sitting_id` should NOT be sent, but the events list should be limited to the latest sitting).
4. Type in the Code filter; verify a fetch happens after ~300ms.
5. Pick a Subject; verify a fetch happens immediately.
6. Expand an event row; verify sessions appear.
7. Click `...` → Attendance for a session whose start_date is in the past; verify modal opens with roster.
8. Toggle a status and Save; verify a green toast and modal closes.
9. Try an OTHER status without reason — Save stays disabled.
10. Try a session whose start_date is in the future — Attendance menu item is disabled.

- [ ] **Step 5: Final commit (if anything was tweaked) — otherwise nothing to commit**

```bash
# only if there were small fixes:
git status
# review any changes; commit if real fixes are needed.
```

---

## Acceptance checklist (mirrors spec §9)

- [ ] Backend: both endpoints implemented with `IsSuperUser`.
- [ ] Backend: all filter parameters honoured; default sitting works; `sitting_id=all` sentinel works.
- [ ] Backend: `enrolled_distinct` matches expected aggregation in tests.
- [ ] Backend: attendance upsert atomic; `recorded_by` set from request.
- [ ] Backend: 409 returned when `attendance_enabled=false`.
- [ ] Backend: 80%+ coverage on new code.
- [ ] Frontend: page renders at `/admin/tutorial-events`, gated by `isSuperuser`.
- [ ] Frontend: sidebar/topbar entry "Tutorials" added.
- [ ] Frontend: all filters working with debounced text input.
- [ ] Frontend: expand-row shows sessions; "..." menu disabled until session starts.
- [ ] Frontend: attendance modal with status select + conditional reason input.
- [ ] Frontend: empty / loading / error states match spec.
- [ ] All existing tests still pass.
- [ ] Conventional-commit history.
