"""
Search API Views.

Public endpoints for product search functionality.
These endpoints query store.Product directly for search results.

Endpoints:
- POST /api/search/unified/ - Main search with filters and pagination
- GET /api/search/default-data/ - Default data for initial page load
- GET /api/search/fuzzy/ - Simple fuzzy search
- GET /api/search/advanced-fuzzy/ - Fuzzy search with pre-filters
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

from .services.search_service import search_service
from .serializers import ProductSearchRequestSerializer

logger = logging.getLogger(__name__)


class UnifiedSearchView(APIView):
    """
    Unified product search endpoint.

    POST /api/search/unified/

    This is the primary search endpoint used by the frontend ProductList component.
    Supports filters, pagination, fuzzy search, and navbar dropdown navigation.

    Request Body:
    {
        "searchQuery": "CM2",
        "filters": {"subjects": ["CM2"], "categories": []},
        "pagination": {"page": 1, "page_size": 20},
        "options": {"include_bundles": true}
    }

    Query Parameters (for navbar compatibility):
    - tutorial_format: Filter by tutorial format
    - group: Filter by product group
    - variation: Filter by variation ID
    - distance_learning: Filter distance learning products
    - tutorial: Tutorial-specific filter
    - product: Specific product ID

    Response:
    {
        "products": [...],
        "filter_counts": {...},
        "pagination": {...}
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """Execute unified search with filters and pagination."""
        try:
            # Validate request data
            serializer = ProductSearchRequestSerializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f'[SEARCH] Invalid request: {serializer.errors}')
                return Response({
                    'error': 'Invalid request format',
                    'details': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)

            validated_data = serializer.validated_data

            # Extract parameters
            search_query = validated_data.get('searchQuery', '').strip()
            filters = validated_data.get('filters', {})
            pagination = validated_data.get('pagination', {'page': 1, 'page_size': 20})
            options = validated_data.get('options', {'include_bundles': True})

            # Extract navbar filters from query parameters
            navbar_filters = self._extract_navbar_filters(request)

            # Execute search
            result = search_service.unified_search(
                search_query=search_query,
                filters=filters,
                pagination=pagination,
                options=options,
                navbar_filters=navbar_filters
            )

            return Response(result)

        except Exception as e:
            logger.error(f'[SEARCH] Unified search error: {e}', exc_info=True)
            return Response({
                'error': 'Search failed',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _extract_navbar_filters(self, request):
        """Extract navbar dropdown filters from query parameters."""
        navbar_filters = {}
        navbar_params = [
            'tutorial_format', 'group', 'variation',
            'distance_learning', 'tutorial', 'product'
        ]

        for key in navbar_params:
            value = request.query_params.get(key)
            if value:
                navbar_filters[key] = value

        return navbar_filters


class DefaultSearchDataView(APIView):
    """
    Default search data endpoint.

    GET /api/search/default-data/

    Returns popular products and suggested filters for initial page load
    when no search query is provided.

    Query Parameters:
    - limit: Maximum items per category (default: 5)

    Response:
    {
        "popular_products": [...],
        "total_count": 5,
        "suggested_filters": {
            "subjects": [...],
            "product_groups": [...]
        },
        "search_info": {
            "query": "",
            "type": "default"
        }
    }
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """Get default search data."""
        try:
            limit = int(request.query_params.get('limit', 5))
            result = search_service.get_default_search_data(limit=limit)
            return Response(result)

        except Exception as e:
            logger.error(f'[SEARCH] Default search data error: {e}', exc_info=True)
            return Response({
                'error': 'Failed to get default search data',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FuzzySearchView(APIView):
    """
    Fuzzy search endpoint.

    GET /api/search/fuzzy/

    Performs typo-tolerant search using FuzzyWuzzy library.

    Query Parameters:
    - q: Search query (required, min 2 chars)
    - min_score: Minimum match score 0-100 (default: 60)
    - limit: Maximum results (default: 50)

    Response:
    {
        "products": [...],
        "total_count": 10,
        "suggested_filters": {...},
        "search_info": {...}
    }
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """Execute fuzzy search."""
        query = request.query_params.get('q', '').strip()
        min_score = int(request.query_params.get('min_score', 60))
        limit = int(request.query_params.get('limit', 50))

        if not query or len(query) < 2:
            return Response({
                'error': 'Query parameter "q" is required and must be at least 2 characters'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Service returns pre-serialized data
            result = search_service.fuzzy_search(query, min_score, limit)
            return Response(result)

        except Exception as e:
            logger.error(f'[SEARCH] Fuzzy search error: {e}', exc_info=True)
            return Response({
                'error': 'Search failed',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdvancedFuzzySearchView(APIView):
    """
    Advanced fuzzy search endpoint.

    GET /api/search/advanced-fuzzy/

    Performs fuzzy search with subject and category pre-filtering.

    Query Parameters:
    - q: Search query (optional)
    - subjects: Subject IDs, comma-separated
    - categories: Category IDs, comma-separated
    - min_score: Minimum match score (default: 65)
    - limit: Maximum results (default: 50)

    Response:
    {
        "products": [...],
        "total_count": 10,
        "suggested_filters": {...},
        "search_info": {...}
    }
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """Execute advanced fuzzy search with filters."""
        query = request.query_params.get('q', '').strip() or None
        subject_ids_param = request.query_params.get('subjects', '')
        category_ids_param = request.query_params.get('categories', '')
        min_score = int(request.query_params.get('min_score', 65))
        limit = int(request.query_params.get('limit', 50))

        # Parse subject IDs
        subject_ids = None
        if subject_ids_param:
            try:
                subject_ids = [int(id.strip()) for id in subject_ids_param.split(',') if id.strip()]
            except ValueError:
                return Response({
                    'error': 'Invalid subject IDs format. Use comma-separated integers.'
                }, status=status.HTTP_400_BAD_REQUEST)

        # Parse category IDs
        category_ids = None
        if category_ids_param:
            try:
                category_ids = [int(id.strip()) for id in category_ids_param.split(',') if id.strip()]
            except ValueError:
                return Response({
                    'error': 'Invalid category IDs format. Use comma-separated integers.'
                }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Service returns pre-serialized data
            result = search_service.advanced_fuzzy_search(
                query=query,
                subject_ids=subject_ids,
                category_ids=category_ids,
                min_score=min_score,
                limit=limit
            )
            return Response(result)

        except Exception as e:
            logger.error(f'[SEARCH] Advanced fuzzy search error: {e}', exc_info=True)
            return Response({
                'error': 'Search failed',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
