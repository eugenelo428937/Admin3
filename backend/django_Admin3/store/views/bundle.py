"""Bundle views for the store app."""
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from store.models import Bundle
from store.serializers import BundleSerializer, BundleListSerializer, BundleProductSerializer


class BundleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for store bundles.

    Provides list and retrieve operations with nested products.
    Public read access (no authentication required).
    """
    permission_classes = [AllowAny]
    queryset = Bundle.objects.select_related(
        'bundle_template',
        'exam_session_subject__exam_session',
        'exam_session_subject__subject',
    ).prefetch_related(
        'bundle_products__product'
    ).filter(is_active=True)

    ordering = ['display_order', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return BundleListSerializer
        return BundleSerializer

    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        """Get all products in a bundle."""
        bundle = self.get_object()
        bundle_products = bundle.bundle_products.filter(is_active=True).select_related('product')
        serializer = BundleProductSerializer(bundle_products, many=True)
        return Response(serializer.data)
