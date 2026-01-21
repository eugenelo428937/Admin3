# Quickstart: Catalog API Consolidation

**Branch**: `002-catalog-api-consolidation` | **Date**: 2026-01-06
**Phase**: 1 - Design | **Status**: Complete

## Prerequisites

1. **001-catalog-consolidation merged to main** - All 8 catalog models exist in `catalog/models/`
2. **Development environment running**:
   - Backend: `python manage.py runserver 8888`
   - Virtual environment activated: `.\.venv\Scripts\activate`

## Quick Verification Commands

```bash
# Verify catalog models exist
cd backend/django_Admin3
python manage.py shell -c "from catalog.models import Subject, ExamSession, Product; print('Models OK')"

# Verify existing tests pass
python manage.py test catalog.tests --keepdb -v 2

# Check current URL configuration
python manage.py show_urls | grep -E "(subjects|exam-sessions|products|catalog)"
```

## Implementation Sequence

### Phase 1: Serializers (Foundation)

```
catalog/serializers/
├── __init__.py                    # Re-exports all serializers
├── subject_serializers.py         # SubjectSerializer
├── exam_session_serializers.py    # ExamSessionSerializer
├── product_serializers.py         # ProductSerializer, ProductVariationSerializer
└── bundle_serializers.py          # ProductBundleSerializer, ProductBundleProductSerializer
```

**Start with**: `SubjectSerializer` (simplest, no nested relations)

### Phase 2: Permission Classes

```python
# catalog/permissions.py
from rest_framework.permissions import BasePermission

class IsSuperUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)
```

### Phase 3: ViewSets (Order of Implementation)

1. **SubjectViewSet** - Simplest, establishes pattern
2. **ExamSessionViewSet** - Similar simplicity
3. **ProductViewSet** - Complex, has actions
4. **BundleViewSet** - ReadOnly, external model dependency

### Phase 4: Function-Based Views

1. **navigation_data** - Cached, critical path
2. **fuzzy_search** - Uses trigram similarity
3. **advanced_product_search** - Pagination support

### Phase 5: URL Configuration

```python
# catalog/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SubjectViewSet, ExamSessionViewSet, ProductViewSet, BundleViewSet
from .views import navigation_data, fuzzy_search, advanced_product_search

router = DefaultRouter()
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'exam-sessions', ExamSessionViewSet, basename='exam-session')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'bundles', BundleViewSet, basename='bundle')

urlpatterns = [
    path('navigation-data/', navigation_data, name='catalog-navigation-data'),
    path('search/', fuzzy_search, name='catalog-fuzzy-search'),
    path('advanced-search/', advanced_product_search, name='catalog-advanced-search'),
    path('', include(router.urls)),
]
```

### Phase 6: Main URL Registration

```python
# django_Admin3/urls.py - Add this line
path('api/catalog/', include('catalog.urls')),
```

### Phase 7: Legacy Wrapper Updates

```python
# subjects/views.py - Replace with re-export
"""
DEPRECATED: Use catalog.views instead.
This module re-exports from catalog for backward compatibility.
"""
import warnings
warnings.warn(
    "subjects.views is deprecated. Use catalog.views instead.",
    DeprecationWarning,
    stacklevel=2
)
from catalog.views import SubjectViewSet

__all__ = ['SubjectViewSet']
```

### Phase 8: Management Command Migration

```python
# catalog/management/commands/import_subjects.py
# Copy from subjects/management/commands/import_subjects.py
# Update: from subjects.models import Subject → from catalog.models import Subject
```

```python
# subjects/management/commands/import_subjects.py - Replace with re-export
"""DEPRECATED: Use catalog.management.commands.import_subjects"""
from catalog.management.commands.import_subjects import Command

__all__ = ['Command']
```

## TDD Workflow

### For Each Component

```bash
# 1. RED - Create failing test
python manage.py test catalog.tests.test_views.TestSubjectViewSet -v 2

# 2. GREEN - Implement minimal code
# Edit catalog/views/subject_views.py

# 3. REFACTOR - Clean up
# Run full test suite
python manage.py test catalog.tests -v 2
```

### Test File Structure

```
catalog/tests/
├── __init__.py
├── test_models.py           # Existing
├── test_backward_compat.py  # Existing (extend for API)
├── test_serializers.py      # NEW
├── test_views.py            # NEW
└── test_permissions.py      # NEW
```

## Verification Checklist

### After Each ViewSet Migration

- [ ] ViewSet tests pass: `python manage.py test catalog.tests.test_views.Test{Model}ViewSet`
- [ ] Legacy endpoint still works: `curl http://127.0.0.1:8888/api/{legacy-path}/`
- [ ] Catalog endpoint works: `curl http://127.0.0.1:8888/api/catalog/{path}/`
- [ ] Response formats identical (use diff)

### Final Verification

```bash
# Run all catalog tests
python manage.py test catalog.tests --keepdb -v 2

# Run legacy app tests (should still pass)
python manage.py test subjects.tests exam_sessions.tests products.tests --keepdb -v 2

# Manual API verification
curl -X GET http://127.0.0.1:8888/api/catalog/subjects/ | python -m json.tool
curl -X GET http://127.0.0.1:8888/api/catalog/exam-sessions/ | python -m json.tool
curl -X GET http://127.0.0.1:8888/api/catalog/products/ | python -m json.tool
curl -X GET http://127.0.0.1:8888/api/catalog/navigation-data/ | python -m json.tool
```

## Common Issues and Solutions

### Issue: Import Error on Circular Dependencies

```python
# Solution: Use lazy imports in serializers
def get_variations(self, obj):
    from catalog.serializers import ProductVariationSerializer
    return ProductVariationSerializer(obj.product_variations.all(), many=True).data
```

### Issue: Cache Key Conflicts

```python
# Solution: Use same cache keys as legacy
cache_key = 'subjects_list_v1'  # Don't change
```

### Issue: Permission Denied on Write Operations

```python
# Verify superuser status
python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); print(User.objects.filter(is_superuser=True).values_list('username', flat=True))"
```

### Issue: FilterGroup Import Error

```python
# FilterGroup stays in products app - import from there
from products.models.filter_system import FilterGroup
# NOT from catalog.models
```

## Files to Create (Summary)

| File | Purpose |
|------|---------|
| `catalog/permissions.py` | IsSuperUser permission class |
| `catalog/serializers/subject_serializers.py` | SubjectSerializer |
| `catalog/serializers/exam_session_serializers.py` | ExamSessionSerializer |
| `catalog/serializers/product_serializers.py` | ProductSerializer, ProductVariationSerializer |
| `catalog/serializers/bundle_serializers.py` | Bundle serializers |
| `catalog/views/subject_views.py` | SubjectViewSet |
| `catalog/views/exam_session_views.py` | ExamSessionViewSet |
| `catalog/views/product_views.py` | ProductViewSet |
| `catalog/views/bundle_views.py` | BundleViewSet |
| `catalog/views/navigation_views.py` | navigation_data, fuzzy_search, advanced_search |
| `catalog/urls.py` | Update with router and views |
| `catalog/tests/test_serializers.py` | Serializer tests |
| `catalog/tests/test_views.py` | ViewSet tests |
| `catalog/tests/test_permissions.py` | Permission tests |
| `catalog/management/commands/import_subjects.py` | Migrated command |

## Success Criteria Verification

| Criteria | Verification Command |
|----------|---------------------|
| SC-001: All ViewSets exist | `python -c "from catalog.views import *"` |
| SC-002: Legacy tests pass | `python manage.py test subjects exam_sessions products` |
| SC-003: Imports work | `python -c "from catalog.views import SubjectViewSet"` |
| SC-004: Legacy is thin wrapper | Manual code review |
| SC-005: Response times OK | `time curl http://127.0.0.1:8888/api/catalog/subjects/` |
| SC-006: No format changes | Response diff comparison |
| SC-007: Both endpoints work | Test both /api/catalog/ and legacy paths |
| SC-008: Coverage met | `python manage.py test --coverage catalog` |
