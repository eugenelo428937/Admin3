"""Product views for the store app."""
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from store.models import Product, Bundle
from store.serializers import (
    ProductSerializer,
    ProductListSerializer,
    PriceListSerializer,
    UnifiedProductSerializer,
    UnifiedBundleSerializer,
)


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for store products.

    Provides list and retrieve operations with filtering support.
    Public read access (no authentication required).

    The list endpoint returns BOTH products and bundles in a unified format,
    with an `is_bundle` flag to distinguish between them.

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

    def list(self, request, *args, **kwargs):
        """
        List all purchasable items (products and bundles).

        Returns a unified list with both products and bundles, each with
        an `is_bundle` flag for frontend differentiation.

        Query params:
        - page: Page number (default: 1)
        - page_size: Items per page (default: 50, max: 100)

        Response format:
        {
            "results": [...],
            "count": <total>,
            "products_count": <products_only>,
            "bundles_count": <bundles_only>,
            "page": <current_page>,
            "has_next": <bool>,
            "has_previous": <bool>
        }
        """
        # Parse pagination params
        try:
            page = int(request.query_params.get('page', 1))
        except (ValueError, TypeError):
            page = 1
        try:
            page_size = min(int(request.query_params.get('page_size', 50)), 100)
        except (ValueError, TypeError):
            page_size = 50

        # Get active products with related data
        products = Product.objects.select_related(
            'exam_session_subject__exam_session',
            'exam_session_subject__subject',
            'product_product_variation__product',
            'product_product_variation__product_variation',
        ).filter(
            is_active=True,
            product_product_variation__product__is_active=True,
        ).order_by('product_code')

        # Get active bundles with related data
        bundles = Bundle.objects.select_related(
            'bundle_template',
            'exam_session_subject__exam_session',
            'exam_session_subject__subject',
        ).prefetch_related(
            'bundle_products__product'
        ).filter(
            is_active=True,
            bundle_template__is_active=True,  # Hide if template inactive
        ).order_by('display_order', 'created_at')

        # Serialize products and bundles
        products_data = UnifiedProductSerializer(products, many=True).data
        bundles_data = UnifiedBundleSerializer(bundles, many=True).data

        # Combine results (bundles first, then products)
        all_results = bundles_data + products_data

        # Apply pagination
        total_count = len(all_results)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_results = all_results[start_idx:end_idx]

        return Response({
            'results': paginated_results,
            'count': total_count,
            'products_count': len(products_data),
            'bundles_count': len(bundles_data),
            'page': page,
            'has_next': end_idx < total_count,
            'has_previous': page > 1,
        })

    @action(detail=True, methods=['get'])
    def prices(self, request, pk=None):
        """Get all prices for a product."""
        product = self.get_object()
        prices = product.prices.all()
        serializer = PriceListSerializer(prices, many=True)
        return Response(serializer.data)
