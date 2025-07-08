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
from django.db.models import Q
from django.contrib.postgres.search import TrigramSimilarity
from subjects.models import Subject
from subjects.serializers import SubjectSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by group IDs
        group_ids = self.request.query_params.getlist('group')
        if group_ids:
            queryset = queryset.filter(groups__id__in=group_ids).distinct()
        
        # Filter by tutorial format (product group name)
        tutorial_format = self.request.query_params.get('tutorial_format')
        if tutorial_format:
            try:
                format_group = ProductGroup.objects.get(name=tutorial_format)
                queryset = queryset.filter(groups=format_group).distinct()
            except ProductGroup.DoesNotExist:
                queryset = queryset.none()
        
        # Filter by product variation ID
        variation_id = self.request.query_params.get('variation')
        if variation_id:
            try:
                queryset = queryset.filter(product_variations__id=variation_id).distinct()
            except ValueError:
                queryset = queryset.none()
        
        # Filter by distance learning
        distance_learning = self.request.query_params.get('distance_learning')
        if distance_learning:
            distance_learning_groups = ['Core Study Materials', 'Revision Materials', 'Marking']
            try:
                dl_groups = ProductGroup.objects.filter(name__in=distance_learning_groups)
                queryset = queryset.filter(groups__in=dl_groups).distinct()
            except ProductGroup.DoesNotExist:
                queryset = queryset.none()
        
        # Filter by tutorial
        tutorial = self.request.query_params.get('tutorial')
        if tutorial:
            try:
                tutorial_group = ProductGroup.objects.get(name='Tutorial')
                online_classroom_group = ProductGroup.objects.get(name='Online Classroom')
                queryset = queryset.filter(groups=tutorial_group).exclude(groups=online_classroom_group).distinct()
            except ProductGroup.DoesNotExist:
                queryset = queryset.none()
        
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
    1. Location: Products where product_group = "Tutorial" and exclude product_group = "Online Classroom" (split into 2 sub-columns)
    2. Format: Simple filter links for tutorial formats
       - "Face to Face" (filters products where product_group = "Face-to-face")
       - "Live Online" (filters products where product_group = "Live Online")
    3. Online Classroom: Product variations of products in "Online Classroom" group
    """
    try:
        # Get product group IDs
        try:
            tutorial_group = ProductGroup.objects.get(name='Tutorial')
            online_classroom_group = ProductGroup.objects.get(name='Online Classroom')
        except ProductGroup.DoesNotExist:
            tutorial_group = None
            online_classroom_group = None
        
        # Column 1: Location - Products in Tutorial group, excluding Online Classroom group
        location_products = Product.objects.filter(
            is_active=True,
            groups=tutorial_group
        ).exclude(
            groups=online_classroom_group
        ).order_by('shortname') if tutorial_group and online_classroom_group else Product.objects.none()
        
        # Split into 2 sub-columns
        location_count = location_products.count()
        mid_point = (location_count + 1) // 2
        
        location_data_left = [
            {
                'id': product.id,
                'shortname': product.shortname,
                'fullname': product.fullname,
                'code': product.code,
            }
            for product in location_products[:mid_point]
        ]
        
        location_data_right = [
            {
                'id': product.id,
                'shortname': product.shortname,
                'fullname': product.fullname,
                'code': product.code,
            }
            for product in location_products[mid_point:]
        ]
        
        # Column 2: Format - Simple links for filtering
        format_data = [
            {
                'name': 'Face to Face',
                'filter_type': 'face_to_face',
                'group_name': 'Face-to-face'
            },
            {
                'name': 'Live Online', 
                'filter_type': 'live_online',
                'group_name': 'Live Online'
            }
        ]
        
        # Column 3: Online Classroom - Product variations of products in Online Classroom group
        if online_classroom_group:
            # Get products that are in Online Classroom group
            online_classroom_product_ids = Product.objects.filter(
                groups=online_classroom_group
            ).values_list('id', flat=True)
            
            # Get variations that are linked to Online Classroom products
            online_classroom_variations = ProductVariation.objects.filter(
                products__id__in=online_classroom_product_ids
            ).distinct().order_by('description')
            
            online_classroom_data = [
                {
                    'id': variation.id,
                    'name': variation.name,
                    'variation_type': variation.variation_type,
                    'description': variation.description,
                }
                for variation in online_classroom_variations
            ]
        else:
            online_classroom_data = []
        
        return Response({
            'results': {
                'Location': {
                    'left': location_data_left,
                    'right': location_data_right
                },
                'Format': format_data,
                'Online Classroom': online_classroom_data
            }
        })
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def fuzzy_search(request):
    """
    Fuzzy search endpoint that returns suggested filters and products.
    Supports semantic and similarity-based matching.
    """
    search_query = request.query_params.get('q', '').strip()
    
    if not search_query:
        return Response({
            'suggested_filters': {
                'subjects': [],
                'product_groups': [],
                'variations': [],
                'products': []
            },
            'suggested_products': [],
            'query': search_query
        })
    
    try:
        # Define similarity threshold
        similarity_threshold = 0.2
        
        # Search for similar subjects
        subjects = Subject.objects.filter(
            Q(code__icontains=search_query) |
            Q(description__icontains=search_query)
        ).annotate(
            similarity=TrigramSimilarity('description', search_query) + 
                      TrigramSimilarity('code', search_query)
        ).filter(similarity__gt=similarity_threshold).order_by('-similarity')[:5]
        
        # Search for similar product groups
        product_groups = ProductGroup.objects.filter(
            name__icontains=search_query
        ).annotate(
            similarity=TrigramSimilarity('name', search_query)
        ).filter(similarity__gt=similarity_threshold).order_by('-similarity')[:5]
        
        # Search for similar product variations
        variations = ProductVariation.objects.filter(
            Q(name__icontains=search_query) |
            Q(variation_type__icontains=search_query) |
            Q(description__icontains=search_query)
        ).annotate(
            similarity=TrigramSimilarity('name', search_query) + 
                      TrigramSimilarity('variation_type', search_query)
        ).filter(similarity__gt=similarity_threshold).order_by('-similarity')[:5]
        
        # Search for similar products (for filter suggestions)
        similar_products = Product.objects.filter(
            Q(fullname__icontains=search_query) |
            Q(shortname__icontains=search_query) |
            Q(description__icontains=search_query) |
            Q(code__icontains=search_query)
        ).annotate(
            similarity=TrigramSimilarity('fullname', search_query) + 
                      TrigramSimilarity('shortname', search_query) + 
                      TrigramSimilarity('description', search_query)
        ).filter(similarity__gt=similarity_threshold).order_by('-similarity')[:10]
        
        # Get suggested products for preview (limited to 5)
        suggested_products = similar_products[:5]
        
        # Serialize results
        suggested_filters = {
            'subjects': SubjectSerializer(subjects, many=True).data,
            'product_groups': ProductGroupSerializer(product_groups, many=True).data,
            'variations': ProductVariationSerializer(variations, many=True).data,
            'products': ProductSerializer(similar_products, many=True).data
        }
        
        return Response({
            'suggested_filters': suggested_filters,
            'suggested_products': ProductSerializer(suggested_products, many=True).data,
            'query': search_query,
            'total_matches': {
                'subjects': subjects.count(),
                'product_groups': product_groups.count(),
                'variations': variations.count(),
                'products': similar_products.count()
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
            'query': search_query
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([AllowAny])
def advanced_product_search(request):
    """
    Advanced product search with multiple filters from search results.
    """
    from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
    from subjects.models import Subject
    
    # Get search parameters
    search_query = request.query_params.get('q', '').strip()
    subject_codes = request.query_params.getlist('subjects')
    group_ids = request.query_params.getlist('groups')
    variation_ids = request.query_params.getlist('variations')
    product_ids = request.query_params.getlist('products')
    
    # Start with all products
    queryset = Product.objects.all()
    
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
    
    # Apply subject filter
    if subject_codes:
        # Get products that are associated with the specified subject codes
        subjects = Subject.objects.filter(code__in=subject_codes)
        product_ids = ExamSessionSubjectProduct.objects.filter(
            exam_session_subject__subject__in=subjects
        ).values_list('product_id', flat=True).distinct()
        
        queryset = queryset.filter(id__in=product_ids)
    
    # Apply group filter
    if group_ids:
        try:
            group_ids = [int(gid) for gid in group_ids]
            queryset = queryset.filter(groups__id__in=group_ids).distinct()
        except (ValueError, TypeError):
            pass
    
    # Apply variation filter
    if variation_ids:
        try:
            variation_ids = [int(vid) for vid in variation_ids]
            queryset = queryset.filter(product_variations__id__in=variation_ids).distinct()
        except (ValueError, TypeError):
            pass
    
    # Apply specific product filter
    if product_ids:
        try:
            product_ids = [int(pid) for pid in product_ids]
            queryset = queryset.filter(id__in=product_ids)
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
