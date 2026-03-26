from rest_framework import viewsets, mixins, status
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

    @action(detail=True, methods=['post'], url_path='retry-failed')
    def retry_failed(self, request, pk=None):
        """Reset all failed queue items in this batch to pending."""
        batch = self.get_object()
        failed_items = EmailQueue.objects.filter(batch=batch, status='failed')
        count = failed_items.count()
        if count == 0:
            return Response({'detail': 'No failed emails to retry.'}, status=status.HTTP_400_BAD_REQUEST)

        from django.utils import timezone
        failed_items.update(
            status='pending',
            scheduled_at=timezone.now(),
            attempts=0,
            last_attempt_at=None,
            next_retry_at=None,
            error_message='',
            error_details={},
        )

        # Update batch status back to processing
        batch.status = 'processing'
        batch.save(update_fields=['status'])

        serializer = self.get_serializer(batch)
        return Response({'detail': f'{count} failed emails queued for retry.', 'batch': serializer.data})
