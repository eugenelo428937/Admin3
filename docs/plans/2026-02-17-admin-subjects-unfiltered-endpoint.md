# Admin Subjects Unfiltered Endpoint — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a separate admin-only subjects endpoint that returns all subjects (including inactive) for admin CRUD operations.

**Architecture:** New `SubjectAdminViewSet` at `/api/catalog/admin-subjects/` following existing admin ViewSet pattern. Frontend `subjectService` updated to use the new endpoint. Existing cached public endpoint unchanged.

**Tech Stack:** Django REST Framework ViewSets, DRF Routers, `IsSuperUser` permission, React Axios service

---

### Task 1: Backend — Write failing tests for SubjectAdminViewSet

**Files:**
- Modify: `backend/django_Admin3/catalog/tests/test_admin_views.py`

**Step 1: Write failing tests**

Add to the end of `test_admin_views.py`:

```python
class TestSubjectAdminViewSet(CatalogAdminTestCase):
    """Tests for SubjectAdminViewSet — unfiltered admin CRUD."""

    def test_list_returns_all_subjects_including_inactive(self):
        """Admin list must include inactive subjects (unlike public endpoint)."""
        from catalog.models import Subject
        Subject.objects.filter(code='CM2').update(active=False)

        self.authenticate_superuser()
        response = self.client.get('/api/catalog/admin-subjects/')
        self.assertEqual(response.status_code, 200)

        codes = [s['code'] for s in response.json()]
        self.assertIn('CM2', codes)  # inactive subject must appear

    def test_list_includes_active_field(self):
        """Response must include the active boolean field."""
        self.authenticate_superuser()
        response = self.client.get('/api/catalog/admin-subjects/')
        self.assertEqual(response.status_code, 200)
        self.assertResponseContainsFields(response, ['id', 'code', 'description', 'name', 'active'])

    def test_list_requires_superuser(self):
        """Non-superusers must get 403 on list."""
        self.authenticate_regular_user()
        response = self.client.get('/api/catalog/admin-subjects/')
        self.assertEqual(response.status_code, 403)

    def test_list_rejects_anonymous(self):
        """Anonymous users must get 401."""
        self.unauthenticate()
        response = self.client.get('/api/catalog/admin-subjects/')
        self.assertEqual(response.status_code, 401)

    def test_retrieve_single_subject(self):
        self.authenticate_superuser()
        response = self.client.get(f'/api/catalog/admin-subjects/{self.subject_cm2.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['code'], 'CM2')

    def test_create_subject(self):
        self.authenticate_superuser()
        response = self.client.post('/api/catalog/admin-subjects/', {
            'code': 'SP3',
            'description': 'Test Subject SP3',
            'active': True,
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['code'], 'SP3')

    def test_update_subject(self):
        self.authenticate_superuser()
        response = self.client.put(f'/api/catalog/admin-subjects/{self.subject_cm2.id}/', {
            'code': 'CM2',
            'description': 'Updated Description',
            'active': False,
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['description'], 'Updated Description')
        self.assertFalse(response.json()['active'])

    def test_delete_subject(self):
        from catalog.models import Subject
        subj = Subject.objects.create(code='DEL1', description='To Delete', active=True)
        self.authenticate_superuser()
        response = self.client.delete(f'/api/catalog/admin-subjects/{subj.id}/')
        self.assertEqual(response.status_code, 204)
```

**Step 2: Run tests to verify they fail**

Run: `cd backend/django_Admin3 && python manage.py test catalog.tests.test_admin_views.TestSubjectAdminViewSet -v 2`
Expected: FAIL — `SubjectAdminViewSet` does not exist / URL not found (404)

**Step 3: Commit failing tests**

```bash
git add backend/django_Admin3/catalog/tests/test_admin_views.py
git commit -m "test(catalog): add failing tests for SubjectAdminViewSet"
```

---

### Task 2: Backend — Implement SubjectAdminViewSet

**Files:**
- Create: `backend/django_Admin3/catalog/views/subject_admin_views.py`
- Modify: `backend/django_Admin3/catalog/views/__init__.py`
- Modify: `backend/django_Admin3/catalog/urls.py`

**Step 1: Create the ViewSet**

Create `backend/django_Admin3/catalog/views/subject_admin_views.py`:

```python
"""Subject admin views for unfiltered CRUD operations.

Unlike SubjectViewSet (which caches and filters to active-only for the
public navigation menu), this ViewSet returns all subjects and requires
IsSuperUser for all operations.
"""
from rest_framework import viewsets, status
from rest_framework.response import Response
from django.db.models import ProtectedError

from catalog.models import Subject
from catalog.permissions import IsSuperUser
from catalog.serializers import SubjectSerializer


class SubjectAdminViewSet(viewsets.ModelViewSet):
    """Admin CRUD ViewSet for Subject model.

    Returns all subjects (including inactive) for admin management.
    All operations require IsSuperUser permission.
    """
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsSuperUser]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError as e:
            return Response(
                {"error": "Cannot delete: record has dependent records",
                 "dependents": [str(obj) for obj in e.protected_objects]},
                status=status.HTTP_400_BAD_REQUEST
            )
```

**Step 2: Add export to `__init__.py`**

In `backend/django_Admin3/catalog/views/__init__.py`, add:
- Import: `from .subject_admin_views import SubjectAdminViewSet`
- Export: Add `'SubjectAdminViewSet'` to `__all__`

**Step 3: Register route in `urls.py`**

In `backend/django_Admin3/catalog/urls.py`, add:
- Import: `SubjectAdminViewSet` to the import list from `.views`
- Router: `router.register(r'admin-subjects', SubjectAdminViewSet, basename='admin-subject')`

**Step 4: Run tests to verify they pass**

Run: `cd backend/django_Admin3 && python manage.py test catalog.tests.test_admin_views.TestSubjectAdminViewSet -v 2`
Expected: All 8 tests PASS

**Step 5: Commit**

```bash
git add backend/django_Admin3/catalog/views/subject_admin_views.py backend/django_Admin3/catalog/views/__init__.py backend/django_Admin3/catalog/urls.py
git commit -m "feat(catalog): add SubjectAdminViewSet for unfiltered admin CRUD"
```

---

### Task 3: Frontend — Update subjectService to use admin endpoint

**Files:**
- Modify: `frontend/react-Admin3/src/services/subjectService.js`

**Step 1: Update the API_URL**

In `subjectService.js`, change line 5:
```javascript
// Before:
const API_URL = `${config.catalogUrl}/subjects`;

// After:
const API_URL = `${config.catalogUrl}/admin-subjects`;
```

**Step 2: Run frontend tests to verify**

Run: `cd frontend/react-Admin3 && npx react-scripts test --watchAll=false --testPathPattern="subjects"`
Expected: All existing SubjectList tests still PASS (they mock `subjectService` so the URL change doesn't affect them)

**Step 3: Commit**

```bash
git add frontend/react-Admin3/src/services/subjectService.js
git commit -m "feat(frontend): point subjectService at admin-subjects endpoint"
```

---

### Task 4: Verify end-to-end

**Step 1: Run full backend test suite for catalog**

Run: `cd backend/django_Admin3 && python manage.py test catalog -v 2`
Expected: All tests PASS (including new admin tests and existing subject tests)

**Step 2: Run full frontend subject tests**

Run: `cd frontend/react-Admin3 && npx react-scripts test --watchAll=false --testPathPattern="subject|Subject"`
Expected: All tests PASS

**Step 3: Manual verification**

1. Start backend: `cd backend/django_Admin3 && python manage.py runserver 8888`
2. Hit `http://127.0.0.1:8888/api/catalog/admin-subjects/` with superuser auth
3. Verify response includes all subjects with `active` field
4. Verify inactive subjects appear in the list

**Step 4: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore: admin subjects endpoint verification complete"
```
