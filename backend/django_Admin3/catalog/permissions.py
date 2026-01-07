"""
Catalog app permission classes.

Provides custom permissions for catalog API endpoints per FR-013:
- Read operations (list, retrieve): AllowAny
- Write operations (create, update, delete): IsSuperUser
"""
from rest_framework.permissions import BasePermission


class IsSuperUser(BasePermission):
    """
    Allows access only to superusers (is_superuser=True).

    Used for write operations on catalog resources to restrict
    modification to administrators only.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_superuser)
