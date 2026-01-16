"""Product views for the store app."""
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from store.models import Product
from store.serializers import ProductSerializer, ProductListSerializer, PriceListSerializer


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for store products.

    Provides list and retrieve operations with filtering support.
    Public read access (no authentication required).

    FR-012: Hides products when their catalog template is inactive.
    """
    permission_classes = [AllowAny]
    queryset = Product.objects.select_related(
        'exam_session_subject__exam_session',
        'exam_session_subject__subject',
        'product_product_variation__product',
        'product_product_variation__product_variation',
    ).filter(
        is_active=True,
        product_product_variation__product__is_active=True,  # FR-012: Hide if catalog template inactive
    )

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['product_code']
    ordering_fields = ['product_code', 'created_at']
    ordering = ['product_code']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        return ProductSerializer

    @action(detail=True, methods=['get'])
    def prices(self, request, pk=None):
        """Get all prices for a product."""
        product = self.get_object()
        prices = product.prices.all()
        serializer = PriceListSerializer(prices, many=True)
        return Response(serializer.data)
