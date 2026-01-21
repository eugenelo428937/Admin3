"""
Exam session views for the catalog API.

Location: catalog/views/exam_session_views.py
Model: catalog.models.ExamSession

Features:
- Standard ModelViewSet CRUD operations
- Permission: AllowAny for reads, IsSuperUser for writes (FR-013)
"""
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from catalog.models import ExamSession
from catalog.serializers import ExamSessionSerializer
from catalog.permissions import IsSuperUser


class ExamSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ExamSession model CRUD operations.

    Provides standard list, retrieve, create, update, destroy actions.

    Permissions:
        - list, retrieve: AllowAny
        - create, update, destroy: IsSuperUser
    """
    queryset = ExamSession.objects.all().order_by('-start_date')
    serializer_class = ExamSessionSerializer

    def get_permissions(self):
        """
        Return permissions based on action.

        Read operations (list, retrieve) use AllowAny.
        Write operations (create, update, delete) require IsSuperUser.
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsSuperUser]
        return [permission() for permission in permission_classes]
