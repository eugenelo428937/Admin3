"""Store bundle admin views for unfiltered CRUD operations.

Unlike BundleViewSet (which filters to active-only for public access),
this ViewSet returns all store bundles and requires IsSuperUser for all
operations.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import ProtectedError

from catalog.permissions import IsSuperUser
from store.views.product_admin import AdminPagination
from store.models import Bundle
from store.serializers.bundle_admin import StoreBundleAdminListSerializer
from store.serializers.bundle import (
    BundleAdminWriteSerializer,
    BundleSerializer,
    BundleComponentSerializer,
)


class StoreBundleAdminViewSet(viewsets.ModelViewSet):
    """Admin CRUD ViewSet for store bundles.

    Returns all store bundles (including inactive) for admin management.
    All operations require IsSuperUser permission — unlike the public
    BundleViewSet, reads are also restricted because this endpoint
    exposes inactive bundles.
    """
    pagination_class = AdminPagination
    queryset = Bundle.objects.select_related(
        'bundle_template',
        'exam_session_subject__exam_session',
        'exam_session_subject__subject',
    ).prefetch_related(
        'bundle_products__product'
    ).all()
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        qs = super().get_queryset()
        exam_session_id = self.request.query_params.get('exam_session_id')
        if exam_session_id:
            qs = qs.filter(
                exam_session_subject__exam_session_id=exam_session_id
            )
        return qs

    def get_serializer_class(self):
        if self.action == 'list':
            return StoreBundleAdminListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return BundleAdminWriteSerializer
        return BundleSerializer

    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        """Get all products in a bundle with full nested data."""
        bundle = self.get_object()
        bundle_products = bundle.bundle_products.select_related(
            'product__product_product_variation__product',
            'product__product_product_variation__product_variation',
        ).prefetch_related(
            'product__prices'
        ).order_by('sort_order')
        return Response(
            BundleComponentSerializer(bundle_products, many=True).data
        )

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
