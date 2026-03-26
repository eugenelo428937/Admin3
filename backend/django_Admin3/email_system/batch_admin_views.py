from rest_framework import viewsets, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from catalog.permissions import IsSuperUser
from email_system.models import EmailBatch, EmailQueue
from email_system.batch_admin_serializers import (
    EmailBatchListSerializer,
    EmailBatchEmailSerializer,
)


class EmailBatchAdminViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Read-only ViewSet for email batches in the admin panel."""

    queryset = EmailBatch.objects.select_related('template').all()
    serializer_class = EmailBatchListSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def list(self, request, *args, **kwargs):
        limit = request.query_params.get('limit')
        if limit:
            queryset = self.filter_queryset(self.get_queryset())[:int(limit)]
            serializer = self.get_serializer(queryset, many=True)
            return Response({'results': serializer.data, 'count': len(serializer.data)})
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def emails(self, request, pk=None):
        batch = self.get_object()
        qs = EmailQueue.objects.filter(batch=batch).order_by('-created_at')

        to_email = request.query_params.get('to_email')
        if to_email:
            qs = qs.filter(to_emails__icontains=to_email)

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = EmailBatchEmailSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = EmailBatchEmailSerializer(qs, many=True)
        return Response({'results': serializer.data, 'count': qs.count()})
