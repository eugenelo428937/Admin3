"""
Bundle views for the catalog API.

Location: catalog/views/bundle_views.py
Model: exam_sessions_subjects_products.models.ExamSessionSubjectBundle

Features:
- ReadOnlyModelViewSet (list, retrieve only)
- Filters by exam_session, subject_code
- Permission: AllowAny for all operations (FR-013)
"""
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from catalog.serializers import ExamSessionSubjectBundleSerializer


class BundleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for ExamSessionSubjectBundle (read-only).

    Provides list and retrieve operations for exam session bundles.

    Query Parameters:
        - exam_session: Filter by exam session code
        - subject_code: Filter by subject code

    Permissions:
        - All operations: AllowAny (read-only viewset)
    """
    serializer_class = ExamSessionSubjectBundleSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        """
        Return filtered queryset based on query parameters.

        Only returns active bundles.
        """
        # Import here to avoid circular imports
        from exam_sessions_subjects_products.models import ExamSessionSubjectBundle

        queryset = ExamSessionSubjectBundle.objects.filter(is_active=True)

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
            'bundle__subject',
            'exam_session_subject__exam_session',
            'exam_session_subject__subject'
        ).prefetch_related(
            'bundle_products__exam_session_subject_product_variation__product_product_variation__product',
            'bundle_products__exam_session_subject_product_variation__product_product_variation__product_variation'
        ).order_by('display_order', 'bundle__bundle_name')
