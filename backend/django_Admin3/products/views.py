"""
Products views - PARTIAL DEPRECATION.

This module contains:
1. Re-exports from catalog.views for backward compatibility (DEPRECATED)
2. Filter system views that remain in products app (NOT migrated)

DEPRECATED (use catalog.views instead):
- ProductViewSet, BundleViewSet
- navigation_data, fuzzy_search, advanced_product_search

NOT DEPRECATED (filter system - stays here):
- product_group_tree, product_group_three_level_tree
- products_by_group, product_group_filters, filter_configuration

See: specs/002-catalog-api-consolidation/
"""
import warnings

# ============================================================
# DEPRECATED - Re-exports from catalog (use catalog.views)
# ============================================================
from catalog.views import (
    ProductViewSet,
    BundleViewSet,
    navigation_data,
    fuzzy_search,
    advanced_product_search,
)

# Emit deprecation warning for catalog re-exports
warnings.warn(
    "Importing ProductViewSet, BundleViewSet, navigation_data, fuzzy_search, "
    "advanced_product_search from products.views is deprecated. "
    "Use 'from catalog.views import ...' instead.",
    DeprecationWarning,
    stacklevel=2
)

# ============================================================
# NOT DEPRECATED - Filter system views (stay in products app)
# ============================================================
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

from .models import Product
from filtering.models import FilterGroup
from .models.product_group_filter import ProductGroupFilter
from .serializers import (
    ProductSerializer,
    FilterGroupSerializer,
    FilterGroupThreeLevelSerializer,
    ProductGroupFilterSerializer,
)
from .services.filter_service import get_filter_service


@api_view(['GET'])
@permission_classes([AllowAny])
def product_group_tree(request):
    """
    Returns the full product group tree (with children) for navigation/filtering.
    """
    roots = FilterGroup.objects.filter(parent__isnull=True)
    serializer = FilterGroupSerializer(roots, many=True)
    return Response({'results': serializer.data})


@api_view(['GET'])
@permission_classes([AllowAny])
def product_group_three_level_tree(request):
    """
    Returns the product group tree up to three levels deep.
    """
    roots = FilterGroup.objects.filter(parent__isnull=True)
    serializer = FilterGroupThreeLevelSerializer(roots, many=True)
    return Response({'results': serializer.data})


@api_view(['GET'])
@permission_classes([AllowAny])
def products_by_group(request, group_id):
    """
    Returns all products in the given group and all its descendants.
    """
    def get_descendant_ids(group):
        ids = [group.id]
        for child in group.children.all():
            ids.extend(get_descendant_ids(child))
        return ids

    try:
        group = FilterGroup.objects.get(id=group_id)
    except FilterGroup.DoesNotExist:
        return Response({'error': 'Group not found'}, status=404)

    group_ids = get_descendant_ids(group)
    products = Product.objects.filter(groups__in=group_ids).distinct()
    serializer = ProductSerializer(products, many=True)
    return Response({'results': serializer.data})


@api_view(['GET'])
@permission_classes([AllowAny])
def product_group_filters(request):
    """
    Returns all product group filters with their associated groups.
    """
    filters = ProductGroupFilter.objects.prefetch_related('groups').all()
    serializer = ProductGroupFilterSerializer(filters, many=True)
    return Response({'results': serializer.data})


@api_view(['GET'])
@permission_classes([AllowAny])
def filter_configuration(request):
    """
    Returns dynamic filter configuration and options for the frontend.
    Supports extensible filtering with configurable filter types.
    """
    # Use the configurable filter service
    filter_service = get_filter_service()

    # Get requested filter types or return all
    filter_types = request.query_params.getlist('types')

    # Get complete filter configuration (includes options)
    config = filter_service.get_filter_configuration()

    # Filter by requested types if specified
    if filter_types:
        config = {k: v for k, v in config.items() if k in filter_types}

    return Response(config)


__all__ = [
    # Deprecated re-exports from catalog
    'ProductViewSet',
    'BundleViewSet',
    'navigation_data',
    'fuzzy_search',
    'advanced_product_search',
    # Filter system views (not deprecated)
    'product_group_tree',
    'product_group_three_level_tree',
    'products_by_group',
    'product_group_filters',
    'filter_configuration',
]
