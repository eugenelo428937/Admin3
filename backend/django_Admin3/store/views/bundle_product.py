"""BundleProduct views for the store app."""
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db.models import ProtectedError

from catalog.permissions import IsSuperUser
from store.models import BundleProduct
from store.serializers import BundleProductSerializer


class BundleProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for store bundle products.

    Read operations: AllowAny (public access)
    Write operations: IsSuperUser
    """
    queryset = BundleProduct.objects.select_related(
        'bundle', 'product'
    ).all()
    serializer_class = BundleProductSerializer

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
