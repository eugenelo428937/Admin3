"""ProductBundle and ProductBundleProduct views for the catalog admin API."""
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import ProtectedError

from catalog.models import ProductBundle, ProductBundleProduct
from catalog.permissions import IsSuperUser
from catalog.serializers import (
    ProductBundleAdminSerializer,
    ProductBundleProductAdminSerializer,
    ProductBundleProductDetailSerializer,
)


class ProductBundleAdminViewSet(viewsets.ModelViewSet):
    """CRUD ViewSet for ProductBundle.

    Read operations: AllowAny
    Write operations: IsSuperUser
    """
    queryset = ProductBundle.objects.select_related('subject').all()
    serializer_class = ProductBundleAdminSerializer
    pagination_class = None

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


class ProductBundleProductViewSet(viewsets.ModelViewSet):
    """CRUD ViewSet for ProductBundleProduct.

    Read operations: AllowAny
    Write operations: IsSuperUser

    Query params:
        bundle (int): Filter by bundle ID
    """
    pagination_class = None

    def get_queryset(self):
        qs = ProductBundleProduct.objects.select_related(
            'bundle',
            'product_product_variation__product',
            'product_product_variation__product_variation',
        ).all()
        bundle_id = self.request.query_params.get('bundle')
        if bundle_id:
            qs = qs.filter(bundle_id=bundle_id)
        return qs.order_by('sort_order', 'id')

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return ProductBundleProductDetailSerializer
        return ProductBundleProductAdminSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsSuperUser]
        return [permission() for permission in permission_classes]
