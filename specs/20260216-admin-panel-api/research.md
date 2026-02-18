# Research: Admin Panel Backend API

**Branch**: `20260216-admin-panel-api` | **Date**: 2026-02-16

No NEEDS CLARIFICATION items existed in the Technical Context. This research documents the existing codebase patterns that will be replicated for the new admin endpoints.

## R1: ViewSet Permission Pattern

**Decision**: Use `get_permissions()` method with `AllowAny` for read actions, `IsSuperUser` for write actions.

**Rationale**: This is the established pattern in `catalog/views/subject_views.py` (lines 42-53) and `catalog/views/exam_session_views.py`. It provides fine-grained per-action permissions within a single ViewSet.

**Alternatives considered**:
- Class-level `permission_classes`: Rejected — doesn't allow read/write split.
- DRF `DjangoModelPermissions`: Rejected — project uses custom `IsSuperUser`, not Django's model permission system.

**Reference implementation**:
```python
def get_permissions(self):
    if self.action in ['list', 'retrieve']:
        permission_classes = [AllowAny]
    else:
        permission_classes = [IsSuperUser]
    return [permission() for permission in permission_classes]
```

## R2: Store ViewSet Upgrade Strategy

**Decision**: Change base class from `ReadOnlyModelViewSet` to `ModelViewSet`, add `get_permissions()`, preserve custom `list()` and `get_serializer_class()` methods.

**Rationale**: `ModelViewSet` extends `ReadOnlyModelViewSet` with `CreateModelMixin`, `UpdateModelMixin`, `DestroyModelMixin`. The existing custom `list()` method in `store/views/product.py` (unified product+bundle response) must be preserved unchanged for backward compatibility.

**Alternatives considered**:
- Separate admin ViewSets alongside read-only ones: Rejected — doubles the code, adds URL routing complexity.
- Mixin approach (add mixins to existing ReadOnly): Functionally equivalent to switching to ModelViewSet, but less clear.

**Key risk**: The store `ProductViewSet.list()` returns a unified response merging products AND bundles. The standard `ModelViewSet.create()` must NOT interfere with this custom list. Since DRF dispatches `list()` and `create()` to different methods, there is no conflict.

## R3: Test Infrastructure

**Decision**: Extend `CatalogAPITestCase` for catalog admin tests. Create similar `StoreAdminAPITestCase` and `UsersAdminAPITestCase` base classes.

**Rationale**: `CatalogAPITestCase` (in `catalog/tests/base.py`) provides `authenticate_superuser()`, `authenticate_regular_user()`, `unauthenticate()`, and helper assertions. This pattern should be replicated for store and users tests.

**Key helpers to reuse**:
- `authenticate_superuser()`: JWT auth via `RefreshToken.for_user()`
- `authenticate_regular_user()`: Non-superuser JWT auth
- `get_api_url()`: URL builder
- `assertResponseContainsFields()`: Field presence assertion

## R4: Serializer Strategy

**Decision**: Reuse existing serializers where field coverage matches frontend contracts. Create new admin-specific serializers only when existing ones lack required write fields or include heavy computed fields unsuitable for write operations.

**Rationale**: Many catalog serializers already exist (`ExamSessionSubjectSerializer`, `ProductVariationSerializer`, `ProductBundleSerializer`). However, some are read-heavy with computed nested fields (e.g., `ProductBundleSerializer.components`) that should not be required on write operations. Admin serializers may need separate read/write serializers or `read_only_fields` configuration.

**Serializer reuse assessment**:

| Entity | Existing Serializer | Reusable for Admin? |
| --- | --- | --- |
| ExamSessionSubject | `ExamSessionSubjectSerializer` | Yes — fields match (id, exam_session, subject, is_active) |
| ProductVariation | `ProductVariationSerializer` | Partial — needs `description_short` and `code` fields added |
| ProductProductVariation | None dedicated | New serializer needed |
| ProductBundle | `ProductBundleSerializer` | Partial — read serializer has computed components; need write serializer |
| ProductBundleProduct | `ProductBundleProductSerializer` | Partial — has computed dicts; need write serializer |
| Recommendation | None | New serializer needed |
| Store Product | `ProductSerializer` (store) | Yes for read; need write serializer accepting FK IDs |
| Store Price | `PriceSerializer` | Yes — fields match |
| Store Bundle | `BundleSerializer` (store) | Partial — read has computed fields; need write serializer |
| Store BundleProduct | `BundleProductSerializer` | Yes — fields match |
| UserProfile | None | New serializer needed |
| Staff | None | New serializer needed |

## R5: Protected Delete Pattern

**Decision**: Override `destroy()` to catch `ProtectedError` and return 400 with dependent record details.

**Rationale**: Django's default foreign key `on_delete=CASCADE` or `on_delete=PROTECT` behavior can lead to either cascading deletes (dangerous) or 500 errors (poor UX). The admin panel needs informative 400 responses listing what depends on the record.

**Implementation pattern**:
```python
from django.db.models import ProtectedError

def destroy(self, request, *args, **kwargs):
    instance = self.get_object()
    try:
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)
    except ProtectedError as e:
        dependent_objects = [str(obj) for obj in e.protected_objects]
        return Response(
            {"error": "Cannot delete: record has dependent records",
             "dependents": dependent_objects},
            status=status.HTTP_400_BAD_REQUEST
        )
```

## R6: User Profile Nested Endpoints

**Decision**: Use DRF `@action` decorators on the `UserProfileViewSet` for nested sub-resources (addresses, contacts, emails) rather than nested routers.

**Rationale**: DRF nested routers (e.g., `drf-nested-routers` package) add a dependency. The `@action` pattern is already used in the codebase (e.g., `store.ProductViewSet.prices`, `store.BundleViewSet.products`). It keeps URL routing simple and requires no new packages.

**URL mapping**:
- `GET /api/users/profiles/{id}/addresses/` → `@action(detail=True, methods=['get'])`
- `PUT /api/users/profiles/{pid}/addresses/{aid}/` → Custom URL pattern in urls.py

**Note**: The `PUT` for specific sub-resource items (e.g., `/profiles/1/addresses/5/`) requires a custom URL pattern since `@action` only provides the collection endpoint. This will use explicit `path()` entries in `users/urls.py`.
