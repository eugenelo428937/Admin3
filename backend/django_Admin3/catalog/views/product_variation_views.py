"""ProductVariation and ProductProductVariation views for the catalog admin API."""
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import ProtectedError

from catalog.models import ProductVariation, ProductProductVariation
from catalog.permissions import IsSuperUser
from catalog.serializers import (
    ProductVariationSerializer,
    ProductProductVariationAdminSerializer,
    ProductProductVariationDetailSerializer,
)


class ProductVariationViewSet(viewsets.ModelViewSet):
    """CRUD ViewSet for ProductVariation.

    Read operations: AllowAny
    Write operations: IsSuperUser
    """
    queryset = ProductVariation.objects.all().order_by('id')
    serializer_class = ProductVariationSerializer
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


class ProductProductVariationViewSet(viewsets.ModelViewSet):
    """CRUD ViewSet for ProductProductVariation.

    Read operations: AllowAny
    Write operations: IsSuperUser

    Query params:
        product (int): Filter by product ID
    """
    pagination_class = None

    def get_queryset(self):
        qs = ProductProductVariation.objects.select_related(
            'product', 'product_variation'
        ).all()
        product_id = self.request.query_params.get('product')
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs.order_by('id')

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return ProductProductVariationDetailSerializer
        return ProductProductVariationAdminSerializer

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
