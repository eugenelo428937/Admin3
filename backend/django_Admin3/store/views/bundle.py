"""Bundle views for the store app."""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import ProtectedError

from catalog.permissions import IsSuperUser
from store.models import Bundle
from store.serializers import (
    BundleSerializer,
    BundleListSerializer,
    BundleProductSerializer,
    BundleAdminWriteSerializer,
)


class BundleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for store bundles.

    Read operations: AllowAny (public access)
    Write operations: IsSuperUser

    Provides list, retrieve, create, update, delete operations
    with nested products via @action endpoint.
    """
    queryset = Bundle.objects.select_related(
        'bundle_template',
        'exam_session_subject__exam_session',
        'exam_session_subject__subject',
    ).prefetch_related(
        'bundle_products__product'
    ).all()

    ordering = ['display_order', 'created_at']
    pagination_class = None

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'products']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsSuperUser]
        return [permission() for permission in permission_classes]

    def get_serializer_class(self):
        if self.action == 'list':
            return BundleListSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return BundleAdminWriteSerializer
        return BundleSerializer

    def get_queryset(self):
        """Filter to active-only for public reads, all for admin writes."""
        qs = super().get_queryset()
        if self.action in ['list', 'retrieve', 'products']:
            return qs.filter(is_active=True)
        return qs

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

    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        """Get all products in a bundle."""
        bundle = self.get_object()
        bundle_products = bundle.bundle_products.filter(is_active=True).select_related('product')
        serializer = BundleProductSerializer(bundle_products, many=True)
        return Response(serializer.data)
