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
    All operations require IsSuperUser permission — unlike other admin
    ViewSets, reads are also restricted because this endpoint exposes
    inactive subjects that should not be visible to unauthenticated users.
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
