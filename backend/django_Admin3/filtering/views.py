"""
Filtering views.

Filter system views for product group trees and dynamic filter configuration.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from catalog.models import Product
from .models import FilterGroup
from .serializers import (
    FilterGroupSerializer,
    FilterGroupThreeLevelSerializer,
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
    from catalog.serializers import ProductSerializer
    serializer = ProductSerializer(products, many=True)
    return Response({'results': serializer.data})


@api_view(['GET'])
@permission_classes([AllowAny])
def filter_configuration(request):
    """
    Returns dynamic filter configuration and options for the frontend.
    Supports extensible filtering with configurable filter types.
    """
    filter_service = get_filter_service()

    # Get requested filter types or return all
    filter_types = request.query_params.getlist('types')

    # Get complete filter configuration (includes options)
    config = filter_service.get_filter_configuration()

    # Filter by requested types if specified
    if filter_types:
        config = {k: v for k, v in config.items() if k in filter_types}

    return Response(config)
