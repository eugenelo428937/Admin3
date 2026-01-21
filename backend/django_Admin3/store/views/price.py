"""Price views for the store app."""
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from store.models import Price
from store.serializers import PriceSerializer, PriceListSerializer


class PriceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for store prices.

    Provides list and retrieve operations.
    Public read access (no authentication required).
    """
    permission_classes = [AllowAny]
    queryset = Price.objects.select_related('product')

    def get_serializer_class(self):
        if self.action == 'list':
            return PriceListSerializer
        return PriceSerializer
