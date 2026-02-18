"""ExamSessionSubject views for the catalog admin API."""
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import ProtectedError

from catalog.models import ExamSessionSubject
from catalog.permissions import IsSuperUser
from catalog.serializers import ExamSessionSubjectSerializer


class ExamSessionSubjectViewSet(viewsets.ModelViewSet):
    """CRUD ViewSet for ExamSessionSubject.

    Read operations: AllowAny
    Write operations: IsSuperUser

    Query parameters:
        exam_session: Filter by exam session ID
    """
    serializer_class = ExamSessionSubjectSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = ExamSessionSubject.objects.select_related(
            'exam_session', 'subject'
        ).all()
        exam_session_id = self.request.query_params.get('exam_session')
        if exam_session_id:
            queryset = queryset.filter(exam_session_id=exam_session_id)
        return queryset

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
