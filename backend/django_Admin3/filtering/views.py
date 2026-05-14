"""
Filtering views.

Filter system views for product group trees and dynamic filter configuration.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from catalog.models import ProductProductVariation
from .models import FilterGroup
from .serializers import (
    FilterGroupSerializer,
    ProductGroupFilterSerializer,
)
from .services.filter_service import get_filter_service


@api_view(['GET'])
@permission_classes([AllowAny])
def product_group_tree(request):
    """
    Returns active filter groups as a flat list for navigation/filtering.
    (Hierarchy was removed in migration 0012 — parent field no longer exists.)
    """
    groups = FilterGroup.objects.filter(is_active=True).order_by('display_order', 'name')
    serializer = FilterGroupSerializer(groups, many=True)
    return Response({'results': serializer.data})


@api_view(['GET'])
@permission_classes([AllowAny])
def product_group_three_level_tree(request):
    """
    Returns active filter groups as a flat list.
    (Three-level hierarchy was removed in migration 0012 — parent field no longer exists.)
    """
    groups = FilterGroup.objects.filter(is_active=True).order_by('display_order', 'name')
    serializer = FilterGroupSerializer(groups, many=True)
    return Response({'results': serializer.data})


@api_view(['GET'])
@permission_classes([AllowAny])
def products_by_group(request, group_id):
    """
    Returns all product-variations in the given group.
    (Descendant traversal was removed in migration 0012 — parent field no longer exists.)
    """
    try:
        group = FilterGroup.objects.get(id=group_id)
    except FilterGroup.DoesNotExist:
        return Response({'error': 'Group not found'}, status=404)

    group_ids = [group.id]
    ppvs = ProductProductVariation.objects.filter(
        product_groups__product_group__id__in=group_ids
    ).select_related('product', 'product_variation').distinct()
    results = [
        {
            'id': ppv.id,
            'product_shortname': ppv.product.shortname,
            'product_fullname': ppv.product.fullname,
            'product_code': ppv.product.code,
            'variation_name': ppv.product_variation.name,
            'variation_type': ppv.product_variation.variation_type,
        }
        for ppv in ppvs
    ]
    return Response({'results': results})


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


@api_view(['GET'])
@permission_classes([AllowAny])
def product_group_filters(request):
    """
    Returns active filter groups as a flat list for filtering.
    (Parent/children hierarchy was removed in migration 0012 — parent field no longer exists.)

    Response format:
    {
        "results": [
            {
                "id": 1,
                "name": "Study Materials",
                "groups": []
            }
        ]
    }
    """
    groups = FilterGroup.objects.filter(is_active=True).order_by('display_order', 'name')
    serializer = ProductGroupFilterSerializer(groups, many=True)
    return Response({'results': serializer.data})
