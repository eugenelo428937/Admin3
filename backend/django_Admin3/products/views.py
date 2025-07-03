from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Product 
from .models.product_group import ProductGroup
from .models.product_group_filter import ProductGroupFilter
from .models import ProductVariation
from .serializers import ProductSerializer, ProductGroupSerializer, ProductGroupThreeLevelSerializer, ProductGroupFilterSerializer, ProductGroupWithProductsSerializer, ProductVariationSerializer
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

@api_view(['GET'])
@permission_classes([AllowAny])
def navbar_product_groups(request):
    """
    Returns products grouped by specific product groups for the navbar dropdown.
    """
    # Define the product group names for the navbar (matching actual database)
    navbar_groups = [
        'Core Study Materials',
        'Revision Materials', 
        'Marking',
        'Tutorial' 
    ]
    
    try:
        # Get the product groups and their products
        groups_data = []
        for group_name in navbar_groups:
            try:
                group = ProductGroup.objects.get(name=group_name)
                serializer = ProductGroupWithProductsSerializer(group)
                groups_data.append(serializer.data)
            except ProductGroup.DoesNotExist:
                # If group doesn't exist, add empty group
                groups_data.append({
                    'id': None,
                    'name': group_name,
                    'products': []
                })
        
        return Response({
            'results': groups_data
        })
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def distance_learning_dropdown(request):
    """
    Returns products for Distance Learning dropdown menu.
    Includes products from Core Study Materials, Revision Materials, and Marking groups.
    """
    try:
        distance_learning_groups = [
            'Core Study Materials',
            'Revision Materials', 
            'Marking'
        ]
        
        groups_data = []
        for group_name in distance_learning_groups:
            try:
                group = ProductGroup.objects.get(name=group_name)
                serializer = ProductGroupWithProductsSerializer(group)
                groups_data.append(serializer.data)
            except ProductGroup.DoesNotExist:
                # If group doesn't exist, add empty group
                groups_data.append({
                    'id': None,
                    'name': group_name,
                    'products': []
                })
        
        return Response({
            'results': groups_data
        })
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def tutorial_dropdown(request):
    """
    Returns data for Tutorial dropdown menu with three columns:
    1. Products.shortname excluding Online Classroom
    2. Product variations excluding Online Classroom  
    3. Online classroom product variations
    """
    try:
        # Column 1: Product shortnames excluding Online Classroom
        products_excluding_online = Product.objects.filter(
            is_active=True
        ).exclude(
            shortname__icontains='Online Classroom'
        ).order_by('shortname')
        
        products_data = [
            {
                'id': product.id,
                'shortname': product.shortname,
                'fullname': product.fullname,
                'code': product.code,
            }
            for product in products_excluding_online
        ]
        
        # Column 2: Product variations excluding Online Classroom
        variations_excluding_online = ProductVariation.objects.exclude(
            name__icontains='Online Classroom'
        ).order_by('name')
        
        variations_data = [
            {
                'id': variation.id,
                'name': variation.name,
                'variation_type': variation.variation_type,
                'description': variation.description,
            }
            for variation in variations_excluding_online
        ]
        
        # Column 3: Online Classroom product variations
        online_classroom_variations = ProductVariation.objects.filter(
            name__icontains='Online Classroom'
        ).order_by('name')
        
        online_classroom_data = [
            {
                'id': variation.id,
                'name': variation.name,
                'variation_type': variation.variation_type,
                'description': variation.description,
            }
            for variation in online_classroom_variations
        ]
        
        return Response({
            'results': {
                'products': products_data,
                'variations': variations_data,
                'online_classroom': online_classroom_data
            }
        })
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
