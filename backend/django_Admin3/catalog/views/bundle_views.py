"""
Bundle views for the catalog API.

Location: catalog/views/bundle_views.py
Model: store.models.Bundle

Features:
- ReadOnlyModelViewSet (list, retrieve only)
- Filters by exam_session, subject_code
- Permission: AllowAny for all operations (FR-013)

Updated 2026-01-16: Migrated from exam_sessions_subjects_products.ExamSessionSubjectBundle
to store.Bundle as part of T087 legacy app cleanup.
"""
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from store.models import Bundle
from store.serializers import BundleSerializer


class BundleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for store.Bundle (read-only).

    Provides list and retrieve operations for exam session bundles.

    Query Parameters:
        - exam_session: Filter by exam session code
        - subject_code: Filter by subject code

    Permissions:
        - All operations: AllowAny (read-only viewset)
    """
    serializer_class = BundleSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """
        Return filtered queryset based on query parameters.

        Only returns active bundles.
        """
        queryset = Bundle.objects.filter(is_active=True)

        # Filter by exam session code
        exam_session = self.request.query_params.get('exam_session')
        if exam_session:
            queryset = queryset.filter(
                exam_session_subject__exam_session__session_code=exam_session
            )

        # Filter by subject code
        subject_code = self.request.query_params.get('subject_code')
        if subject_code:
            queryset = queryset.filter(
                exam_session_subject__subject__code=subject_code
            )

        return queryset.select_related(
            'bundle_template__subject',
            'exam_session_subject__exam_session',
            'exam_session_subject__subject'
        ).prefetch_related(
            'bundle_products__product__product_product_variation__product',
            'bundle_products__product__product_product_variation__product_variation'
        ).order_by('display_order', 'bundle_template__bundle_name')
