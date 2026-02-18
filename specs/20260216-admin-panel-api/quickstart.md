# Quickstart: Admin Panel Backend API

**Branch**: `20260216-admin-panel-api` | **Date**: 2026-02-16

## Implementation Pattern

Every new or upgraded endpoint follows this exact pattern from `catalog/views/subject_views.py`:

### 1. ViewSet (new endpoint)

```python
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import ProtectedError

from catalog.permissions import IsSuperUser


class ExampleViewSet(viewsets.ModelViewSet):
    queryset = ExampleModel.objects.select_related('fk_field').all()
    serializer_class = ExampleSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsSuperUser]
        return [permission() for permission in permission_classes]

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

### 2. ViewSet (upgrade existing read-only)

```python
# BEFORE:
class PriceViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    queryset = Price.objects.select_related('product')
    ...

# AFTER:
class PriceViewSet(viewsets.ModelViewSet):
    queryset = Price.objects.select_related('product')
    ...

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsSuperUser]
        return [permission() for permission in permission_classes]

    # Preserve existing get_serializer_class(), list(), and @action methods unchanged
```

### 3. URL Registration

```python
# In catalog/urls.py - add to existing router:
from .views import ExamSessionSubjectViewSet

router.register(r'exam-session-subjects', ExamSessionSubjectViewSet, basename='exam-session-subject')
```

### 4. Test Pattern

```python
from catalog.tests.base import CatalogAPITestCase

class TestExamSessionSubjectAdminViewSet(CatalogAPITestCase):

    def test_list_returns_200(self):
        response = self.client.get('/api/catalog/exam-session-subjects/')
        self.assertEqual(response.status_code, 200)

    def test_create_requires_superuser(self):
        self.authenticate_regular_user()
        response = self.client.post('/api/catalog/exam-session-subjects/', {
            'exam_session': self.exam_session.id,
            'subject': self.subject.id,
        })
        self.assertEqual(response.status_code, 403)

    def test_create_as_superuser_succeeds(self):
        self.authenticate_superuser()
        response = self.client.post('/api/catalog/exam-session-subjects/', {
            'exam_session': self.exam_session.id,
            'subject': self.subject.id,
        })
        self.assertEqual(response.status_code, 201)

    def test_create_duplicate_returns_400(self):
        self.authenticate_superuser()
        # Create first
        self.client.post('/api/catalog/exam-session-subjects/', {
            'exam_session': self.exam_session.id,
            'subject': self.subject.id,
        })
        # Create duplicate
        response = self.client.post('/api/catalog/exam-session-subjects/', {
            'exam_session': self.exam_session.id,
            'subject': self.subject.id,
        })
        self.assertEqual(response.status_code, 400)

    def test_delete_as_superuser_succeeds(self):
        self.authenticate_superuser()
        ess = ExamSessionSubject.objects.create(
            exam_session=self.exam_session, subject=self.subject
        )
        response = self.client.delete(f'/api/catalog/exam-session-subjects/{ess.id}/')
        self.assertEqual(response.status_code, 204)
```

## Files to Create/Modify

### New files (8)

| File | Purpose |
| --- | --- |
| `catalog/views/exam_session_subject_views.py` | ESS ViewSet |
| `catalog/views/product_variation_views.py` | ProductVariation + PPV ViewSets |
| `catalog/views/product_bundle_views.py` | ProductBundle + BundleProduct ViewSets |
| `catalog/views/recommendation_views.py` | Recommendation ViewSet |
| `store/views/bundle_product.py` | Store BundleProduct ViewSet |
| `catalog/tests/test_admin_views.py` | Catalog admin endpoint tests |
| `store/tests/test_admin_views.py` | Store admin endpoint tests |
| `users/tests/test_admin_views.py` | User admin endpoint tests |

### Modified files (8)

| File | Change |
| --- | --- |
| `catalog/serializers/product_serializers.py` | Add admin serializers for PPV, bundle write |
| `catalog/views/__init__.py` | Export new ViewSets |
| `catalog/urls.py` | Register 6 new ViewSets |
| `store/views/product.py` | ReadOnlyModelViewSet → ModelViewSet + permissions |
| `store/views/price.py` | ReadOnlyModelViewSet → ModelViewSet + permissions |
| `store/views/bundle.py` | ReadOnlyModelViewSet → ModelViewSet + permissions |
| `store/urls.py` | Register BundleProduct ViewSet |
| `users/urls.py` | Register profiles + staff ViewSets |

## Test Commands

```bash
# Run all admin tests
cd backend/django_Admin3
python manage.py test catalog.tests.test_admin_views store.tests.test_admin_views users.tests.test_admin_views

# Run with coverage
python manage.py test catalog.tests.test_admin_views --verbosity=2

# Run specific test class
python manage.py test catalog.tests.test_admin_views.TestExamSessionSubjectViewSet
```

## Verification Checklist

For each endpoint, verify:
- [ ] GET list returns 200 (AllowAny for catalog/store, IsSuperUser for users)
- [ ] GET detail returns 200
- [ ] POST returns 201 for superuser
- [ ] POST returns 403 for regular user
- [ ] POST returns 400 for duplicate unique constraint
- [ ] PUT returns 200 for superuser
- [ ] DELETE returns 204 for superuser
- [ ] DELETE returns 400 if record has dependents
- [ ] Existing GET response format unchanged (store endpoints)
