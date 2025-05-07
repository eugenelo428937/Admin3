from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Product 
from .models.product_group import ProductGroup
from .models.product_group_filter import ProductGroupFilter
from .serializers import ProductSerializer, ProductGroupSerializer, ProductGroupThreeLevelSerializer, ProductGroupFilterSerializer
from rest_framework import status

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        group_ids = self.request.query_params.getlist('group')
        if group_ids:
            queryset = queryset.filter(groups__id__in=group_ids).distinct()
        return queryset
    
    @action(detail=False, methods=['post'], url_path='bulk-import')
    def bulk_import_products(self, request):
        products_data = request.data.get('products', [])
        created = []
        errors = []

        for product_data in products_data:
            serializer = self.get_serializer(data=product_data)
            if serializer.is_valid():
                serializer.save()
                created.append(serializer.data)
            else:
                errors.append({
                    'data': product_data,
                    'errors': serializer.errors
                })

        return Response({
            'created': created,
            'errors': errors
        }, status=status.HTTP_400_BAD_REQUEST if errors else status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([AllowAny])
def product_group_tree(request):
    """
    Returns the full product group tree (with children) for navigation/filtering.
    """
    roots = ProductGroup.objects.filter(parent__isnull=True)
    serializer = ProductGroupSerializer(roots, many=True)
    return Response({'results': serializer.data})

@api_view(['GET'])
@permission_classes([AllowAny])
def product_group_three_level_tree(request):
    """
    Returns the product group tree up to three levels deep.
    """
    roots = ProductGroup.objects.filter(parent__isnull=True)
    serializer = ProductGroupThreeLevelSerializer(roots, many=True)
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
        group = ProductGroup.objects.get(id=group_id)
    except ProductGroup.DoesNotExist:
        return Response({'error': 'Group not found'}, status=404)
    group_ids = get_descendant_ids(group)
    products = Product.objects.filter(groups__in=group_ids).distinct()
    serializer = ProductSerializer(products, many=True)
    return Response({'results': serializer.data})

@api_view(['GET'])
@permission_classes([AllowAny])
def product_group_filters(request):
    filters = ProductGroupFilter.objects.prefetch_related('groups').all()
    serializer = ProductGroupFilterSerializer(filters, many=True)
    return Response({'results': serializer.data})
