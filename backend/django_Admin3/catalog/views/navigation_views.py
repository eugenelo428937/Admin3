"""
Navigation and search views for the catalog API.

Location: catalog/views/navigation_views.py

Features:
- navigation_data: Combined endpoint returning all navigation menu data (5-min cache)
- fuzzy_search: Trigram similarity search for filter suggestions
- advanced_product_search: Multi-filter search with pagination
- All views use AllowAny permission (FR-013)
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from django.db.models import Q
from django.db.models.functions import Coalesce
from django.db.models import Prefetch

from catalog.models import Subject, Product, ProductVariation
from catalog.serializers import (
    SubjectSerializer,
    ProductSerializer,
    ProductVariationSerializer,
)


@api_view(['GET'])
@permission_classes([AllowAny])
def navigation_data(request):
    """
    OPTIMIZED: Combined endpoint returning all navigation menu data in one API call.

    Replaces 4 separate API calls:
    - /api/subjects/
    - /api/products/navbar-product-groups/
    - /api/products/distance-learning-dropdown/
    - /api/products/tutorial-dropdown/

    Returns all navigation data with 5-minute cache.

    Cache:
        - Key: navigation_data_v2
        - TTL: 300 seconds (5 minutes)

    Returns:
        {
            "subjects": [...],
            "navbar_product_groups": {"results": [...]},
            "distance_learning_dropdown": {"results": [...]},
            "tutorial_dropdown": {"results": {...}}
        }
    """
    # Import FilterGroup from products (stays in products app)
    from filtering.models import FilterGroup

    cache_key = 'navigation_data_v2'
    cached_data = cache.get(cache_key)
    if cached_data:
        return Response(cached_data)

    try:
        # === SUBJECTS (only active subjects) ===
        subjects = list(Subject.objects.filter(active=True).order_by('code').values(
            'id', 'code', 'description', 'active'
        ))
        subjects_data = [
            {
                'id': s['id'],
                'code': s['code'],
                'description': s['description'],
                'name': s['description'],  # Frontend compatibility alias
                'active': s['active']
            }
            for s in subjects
        ]

        # === PRODUCT GROUPS (batch load all needed groups in ONE query) ===
        all_group_names = [
            'Core Study Materials', 'Revision Materials', 'Marking', 'Tutorial', 'Online Classroom Recording'
        ]
        groups = FilterGroup.objects.filter(name__in=all_group_names).prefetch_related(
            Prefetch('catalog_products', queryset=Product.objects.filter(is_active=True).order_by('shortname'))
        )
        groups_dict = {g.name: g for g in groups}

        # === NAVBAR PRODUCT GROUPS ===
        navbar_groups = ['Core Study Materials', 'Revision Materials', 'Marking', 'Tutorial']
        navbar_data = []
        for group_name in navbar_groups:
            if group_name in groups_dict:
                group = groups_dict[group_name]
                navbar_data.append({
                    'id': group.id,
                    'name': group.name,
                    'products': [
                        {
                            'id': p.id,
                            'shortname': p.shortname,
                            'fullname': p.fullname,
                            'code': p.code
                        }
                        for p in group.catalog_products.all()
                    ]
                })
            else:
                navbar_data.append({'id': None, 'name': group_name, 'products': []})

        # === DISTANCE LEARNING DROPDOWN ===
        dl_groups = ['Core Study Materials', 'Revision Materials', 'Marking']
        distance_learning_data = []
        for group_name in dl_groups:
            if group_name in groups_dict:
                group = groups_dict[group_name]
                distance_learning_data.append({
                    'id': group.id,
                    'name': group.name,
                    'products': [
                        {
                            'id': p.id,
                            'shortname': p.shortname,
                            'fullname': p.fullname,
                            'code': p.code
                        }
                        for p in group.catalog_products.all()
                    ]
                })
            else:
                distance_learning_data.append({'id': None, 'name': group_name, 'products': []})

        # === TUTORIAL DROPDOWN ===
        tutorial_group = groups_dict.get('Tutorial')
        online_classroom_group = groups_dict.get('Online Classroom Recording')

        # Location products
        if tutorial_group:
            location_products = list(Product.objects.filter(
                is_active=True, groups=tutorial_group
            ).order_by('shortname').values('id', 'shortname', 'fullname', 'code'))
        else:
            location_products = []
        mid_point = (len(location_products) + 1) // 2

        # Format groups (children of Tutorial)
        if tutorial_group:
            format_groups = list(FilterGroup.objects.filter(
                parent=tutorial_group
            ).order_by('name').values('name', 'code'))
            format_data = [
                {
                    'name': g['name'],
                    'filter_type': g['code'],
                    'group_name': g['name']
                }
                for g in format_groups
            ]
        else:
            format_data = [
                {'name': 'Face-to-face Tutorial', 'filter_type': 'face_to_face', 'group_name': 'Face-to-face Tutorial'},
                {'name': 'Live Online Tutorial', 'filter_type': 'live_online', 'group_name': 'Live Online Tutorial'}
            ]

        # Online Classroom variations
        if online_classroom_group:
            online_classroom_data = list(ProductVariation.objects.filter(
                products__groups=online_classroom_group
            ).distinct().order_by('description').values('id', 'name', 'variation_type', 'description'))
        else:
            online_classroom_data = []

        tutorial_data = {
            'Location': {
                'left': location_products[:mid_point],
                'right': location_products[mid_point:]
            },
            'Format': format_data,
            'Online Classroom': online_classroom_data
        }

        result = {
            'subjects': subjects_data,
            'navbar_product_groups': {'results': navbar_data},
            'distance_learning_dropdown': {'results': distance_learning_data},
            'tutorial_dropdown': {'results': tutorial_data}
        }

        cache.set(cache_key, result, 300)  # 5 minute cache
        return Response(result)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def fuzzy_search(request):
    """
    Fuzzy search endpoint that returns suggested filters and products.

    Uses FuzzyWuzzy for typo-tolerant search (same algorithm as /api/search/unified/).
    Joins catalog.Product matches with store.Product to return purchasable
    items with prices for MaterialProductCard rendering.

    Query Parameters:
        - q: Search query string
        - limit: Maximum number of suggested products (default: 5)
        - min_score: Minimum fuzzy match score 0-100 (default: 60)

    Returns:
        {
            "suggested_filters": {
                "subjects": [...],
                "product_groups": [...],
                "variations": [],
                "products": [...]
            },
            "suggested_products": [...],  # Purchasable products with prices
            "query": "...",
            "total_count": N,
            "total_matches": {...}
        }

    Note: suggested_filters is for filter dropdown suggestions (subjects, groups).
          suggested_products is for product card display (store products with prices).
          The formats are intentionally different as they serve different purposes.
    """
    from fuzzywuzzy import fuzz
    from filtering.models import FilterGroup
    from filtering.serializers import FilterGroupSerializer
    from store.models import Product as StoreProduct
    from search.serializers import StoreProductListSerializer
    from catalog.models import ProductVariationRecommendation

    search_query = request.query_params.get('q', '').strip()
    limit = int(request.query_params.get('limit', 5))
    min_score = int(request.query_params.get('min_score', 45))

    if not search_query:
        return Response({
            'suggested_filters': {
                'subjects': [],
                'product_groups': [],
                'variations': [],
                'products': []
            },
            'suggested_products': [],
            'query': search_query,
            'total_count': 0
        })

    try:
        query_lower = search_query.lower()

        # Helper function to calculate fuzzy score using multiple algorithms
        def calculate_fuzzy_score(query, text):
            """Calculate fuzzy match score using multiple algorithms (same as search_service)."""
            text_lower = text.lower()
            scores = [
                fuzz.token_sort_ratio(query, text_lower),
                fuzz.partial_ratio(query, text_lower),
                fuzz.token_set_ratio(query, text_lower),
            ]
            return max(scores)

        # Search for similar subjects using fuzzy matching
        all_subjects = Subject.objects.filter(active=True)
        subjects_with_scores = []
        for subj in all_subjects:
            searchable = f"{subj.code} {subj.description}".lower()
            score = calculate_fuzzy_score(query_lower, searchable)
            if score >= min_score:
                subjects_with_scores.append((subj, score))
        subjects_with_scores.sort(key=lambda x: x[1], reverse=True)
        matched_subjects = [s for s, _ in subjects_with_scores[:5]]

        # Search for similar product groups using fuzzy matching
        all_groups = FilterGroup.objects.filter(is_active=True)
        groups_with_scores = []
        for group in all_groups:
            score = calculate_fuzzy_score(query_lower, group.name)
            if score >= min_score:
                groups_with_scores.append((group, score))
        groups_with_scores.sort(key=lambda x: x[1], reverse=True)
        matched_groups = [g for g, _ in groups_with_scores[:5]]

        # Search for similar catalog products using fuzzy matching
        all_catalog_products = Product.objects.filter(is_active=True)
        catalog_products_with_scores = []
        for prod in all_catalog_products:
            searchable = f"{prod.code} {prod.fullname} {prod.shortname}".lower()
            score = calculate_fuzzy_score(query_lower, searchable)
            if score >= min_score:
                catalog_products_with_scores.append((prod, score))
        catalog_products_with_scores.sort(key=lambda x: x[1], reverse=True)
        matched_catalog_products = [p for p, _ in catalog_products_with_scores[:5]]

        # Get all active store products with prefetched data
        store_products_queryset = StoreProduct.objects.filter(
            is_active=True
        ).select_related(
            'exam_session_subject__subject',
            'exam_session_subject__exam_session',
            'product_product_variation__product',
            'product_product_variation__product_variation',
        ).prefetch_related(
            'prices',
            'product_product_variation__product__groups',
            Prefetch(
                'product_product_variation__recommendation',
                queryset=ProductVariationRecommendation.objects.select_related(
                    'recommended_product_product_variation__product',
                    'recommended_product_product_variation__product_variation'
                )
            )
        )

        # Apply fuzzy search to store products using SearchService scoring
        from search.services.search_service import SearchService
        search_service = SearchService()

        products_with_scores = []
        for sp in store_products_queryset:
            searchable_text = search_service._build_searchable_text(sp)
            score = search_service._calculate_fuzzy_score(
                query_lower, searchable_text, sp
            )

            if score >= min_score:
                products_with_scores.append((sp, score))

        # Sort by score descending
        products_with_scores.sort(key=lambda x: x[1], reverse=True)

        # Get matched store products
        matched_store_products = [sp for sp, _ in products_with_scores]

        # Use StoreProductListSerializer for consistent format with unified search
        # This groups by (exam_session_subject_id, catalog_product_id) correctly
        all_products_data = StoreProductListSerializer.serialize_grouped_products(
            matched_store_products
        )
        total_count = len(all_products_data)

        # Limit for suggested products preview
        suggested_products_data = all_products_data[:limit]

        # Serialize filter suggestions
        suggested_filters = {
            'subjects': SubjectSerializer(matched_subjects, many=True).data,
            'product_groups': FilterGroupSerializer(matched_groups, many=True).data,
            'variations': [],  # Variations are included in product data, not as separate filter
            'products': ProductSerializer(matched_catalog_products, many=True).data,
        }

        return Response({
            'suggested_filters': suggested_filters,
            'suggested_products': suggested_products_data,
            'query': search_query,
            'total_count': total_count,
            'total_matches': {
                'subjects': len(matched_subjects),
                'product_groups': len(matched_groups),
                'products': total_count
            }
        })

    except Exception as e:
        return Response({
            'error': str(e),
            'suggested_filters': {
                'subjects': [],
                'product_groups': [],
                'variations': [],
                'products': []
            },
            'suggested_products': [],
            'query': search_query,
            'total_count': 0
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([AllowAny])
def advanced_product_search(request):
    """
    Advanced product search with multiple filters and pagination.

    Query Parameters:
        - q: Text search query
        - subjects: List of subject codes to filter by
        - groups: List of product group IDs to filter by
        - variations: List of variation IDs to filter by
        - products: List of specific product IDs to filter by
        - page: Page number (default: 1)
        - page_size: Items per page (default: 20)

    Returns:
        {
            "results": [...],
            "count": 42,
            "page": 1,
            "page_size": 20,
            "has_next": true,
            "has_previous": false,
            "query": "...",
            "applied_filters": {...}
        }
    """
    from django.contrib.postgres.search import TrigramSimilarity
    from store.models import Product as StoreProduct

    # Get search parameters
    search_query = request.query_params.get('q', '').strip()
    subject_codes = request.query_params.getlist('subjects')
    group_ids = request.query_params.getlist('groups')
    variation_ids = request.query_params.getlist('variations')
    product_ids = request.query_params.getlist('products')

    # Start with all active products
    queryset = Product.objects.filter(is_active=True)

    # Apply text search if provided
    if search_query:
        queryset = queryset.filter(
            Q(fullname__icontains=search_query) |
            Q(shortname__icontains=search_query) |
            Q(description__icontains=search_query) |
            Q(code__icontains=search_query)
        ).annotate(
            similarity=TrigramSimilarity('fullname', search_query) +
                      TrigramSimilarity('shortname', search_query) +
                      TrigramSimilarity('description', search_query)
        ).order_by('-similarity')

    # Apply subject filter (use store.Product to find catalog.Product IDs for subjects)
    if subject_codes:
        subjects = Subject.objects.filter(code__in=subject_codes)
        # Get catalog.Product IDs through store.Product's product_product_variation FK
        filtered_product_ids = StoreProduct.objects.filter(
            exam_session_subject__subject__in=subjects
        ).values_list('product_product_variation__product_id', flat=True).distinct()

        queryset = queryset.filter(id__in=filtered_product_ids)

    # Apply group filter
    if group_ids:
        try:
            group_ids_int = [int(gid) for gid in group_ids]
            queryset = queryset.filter(groups__id__in=group_ids_int).distinct()
        except (ValueError, TypeError):
            pass

    # Apply variation filter
    if variation_ids:
        try:
            variation_ids_int = [int(vid) for vid in variation_ids]
            queryset = queryset.filter(product_variations__id__in=variation_ids_int).distinct()
        except (ValueError, TypeError):
            pass

    # Apply specific product filter
    if product_ids:
        try:
            product_ids_int = [int(pid) for pid in product_ids]
            queryset = queryset.filter(id__in=product_ids_int)
        except (ValueError, TypeError):
            pass

    # Pagination
    page_size = int(request.query_params.get('page_size', 20))
    page = int(request.query_params.get('page', 1))
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size

    total_count = queryset.count()
    products = queryset[start_idx:end_idx]

    return Response({
        'results': ProductSerializer(products, many=True).data,
        'count': total_count,
        'page': page,
        'page_size': page_size,
        'has_next': end_idx < total_count,
        'has_previous': page > 1,
        'query': search_query,
        'applied_filters': {
            'subjects': subject_codes,
            'groups': group_ids,
            'variations': variation_ids,
            'products': product_ids
        }
    })
