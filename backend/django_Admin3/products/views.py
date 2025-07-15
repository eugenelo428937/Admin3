from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import Product 
from .models.product_group import ProductGroup
from .models.product_group_filter import ProductGroupFilter
from .models import ProductVariation
from .serializers import (
    ProductSerializer, ProductGroupSerializer, ProductGroupThreeLevelSerializer, 
    ProductGroupFilterSerializer, ProductGroupWithProductsSerializer, ProductVariationSerializer,
    ProductBundleSerializer, ExamSessionSubjectBundleSerializer, ExamSessionSubjectBundleProductSerializer
)
from rest_framework import status
from django.db.models import Q
from django.contrib.postgres.search import TrigramSimilarity
from subjects.models import Subject
from subjects.serializers import SubjectSerializer
from .models import ProductBundle, ProductBundleProduct
from exam_sessions_subjects_products.models import ExamSessionSubjectBundle, ExamSessionSubjectBundleProduct
from exam_sessions_subjects.models import ExamSessionSubject
from .services.filter_service import get_product_filter_service

class BundleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for managing exam session bundles.
    Provides read-only access to bundles available for specific exam sessions.
    """
    queryset = ExamSessionSubjectBundle.objects.filter(is_active=True)
    serializer_class = ExamSessionSubjectBundleSerializer
    permission_classes = [AllowAny]
    
    def list(self, request):
        """List all active exam session bundles"""
        # Get query parameters for filtering
        exam_session = request.query_params.get('exam_session')
        subject_code = request.query_params.get('subject')
        
        queryset = self.get_queryset().select_related(
            'bundle__subject',
            'exam_session_subject__exam_session',
            'exam_session_subject__subject'
        )
        
        # Filter by exam session if provided
        if exam_session:
            queryset = queryset.filter(exam_session_subject__exam_session__session_code=exam_session)
        
        # Filter by subject if provided
        if subject_code:
            queryset = queryset.filter(exam_session_subject__subject__code=subject_code)
        
        bundles = queryset.order_by('display_order', 'bundle__bundle_name')
        
        bundles_data = []
        for exam_session_bundle in bundles:
            bundle_data = {
                'id': exam_session_bundle.id,
                'bundle_id': exam_session_bundle.bundle.id,
                'bundle_name': exam_session_bundle.bundle.bundle_name,
                'subject_code': exam_session_bundle.exam_session_subject.subject.code,
                'exam_session_code': exam_session_bundle.exam_session_subject.exam_session.session_code,
                'bundle_description': exam_session_bundle.bundle.bundle_description,
                'is_featured': exam_session_bundle.bundle.is_featured,
                'display_order': exam_session_bundle.display_order,
                'created_at': exam_session_bundle.created_at,
            }
            bundles_data.append(bundle_data)
        
        return Response({
            'results': bundles_data,
            'count': len(bundles_data)
        })
    
    def retrieve(self, request, pk=None):
        """Get a specific exam session bundle with its contents"""
        try:
            exam_session_bundle = self.get_queryset().select_related(
                'bundle__subject',
                'exam_session_subject__exam_session',
                'exam_session_subject__subject'
            ).get(pk=pk)
            
            # Get all active bundle components for this exam session
            bundle_components = ExamSessionSubjectBundleProduct.objects.filter(
                bundle=exam_session_bundle,
                is_active=True
            ).select_related(
                'exam_session_subject_product_variation__exam_session_subject_product__product',
                'exam_session_subject_product_variation__product_product_variation__product_variation'
            ).order_by('sort_order', 'exam_session_subject_product_variation__exam_session_subject_product__product__shortname')
            
            # Use the proper serializer for bundle components
            component_serializer = ExamSessionSubjectBundleProductSerializer(
                bundle_components, 
                many=True, 
                context={'request': request}
            )
            components_data = component_serializer.data
            
            # Bundle metadata  
            bundle_metadata = {
                'bundle_description': exam_session_bundle.bundle.bundle_description,
                'is_featured': exam_session_bundle.bundle.is_featured,
                'exam_session_code': exam_session_bundle.exam_session_subject.exam_session.session_code
            }
            
            return Response({
                'bundle_product': {
                    'id': exam_session_bundle.id,
                    'bundle_id': exam_session_bundle.bundle.id,
                    'name': exam_session_bundle.bundle.bundle_name,
                    'subject_code': exam_session_bundle.exam_session_subject.subject.code,
                    'exam_session_code': exam_session_bundle.exam_session_subject.exam_session.session_code,
                    'metadata': bundle_metadata
                },
                'components': components_data,
                'total_components': len(components_data)
            })
            
        except ExamSessionSubjectBundle.DoesNotExist:
            return Response(
                {'error': 'Exam session bundle not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to get bundle contents: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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

    @action(detail=True, methods=['get'], url_path='bundle-contents')
    def get_bundle_contents(self, request, pk=None):
        """
        Get all products included in a bundle by bundle ID.
        Returns the actual product data that should be added to cart when bundle is selected.
        """
        try:
            # For now, we'll look up bundles by subject code (assuming pk is a bundle ID)
            # In the future, this should be moved to a separate BundleViewSet
            try:
                bundle = ProductBundle.objects.get(id=pk)
            except ProductBundle.DoesNotExist:
                return Response(
                    {'error': 'Bundle not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get all active bundle components
            bundle_components = ProductBundleProduct.objects.filter(
                bundle=bundle,
                is_active=True
            ).select_related(
                'product',
                'product_variation'
            ).order_by('sort_order', 'product__shortname')
            
            # Serialize the component products
            components_data = []
            for bundle_component in bundle_components:
                component_product = bundle_component.product
                
                # Get the full product data using the existing serializer
                product_serializer = ProductSerializer(component_product, context={'request': request})
                component_data = product_serializer.data
                
                # Add bundle-specific metadata
                component_data['bundle_info'] = {
                    'default_price_type': bundle_component.default_price_type,
                    'quantity': bundle_component.quantity,
                    'sort_order': bundle_component.sort_order,
                    'variation_id': bundle_component.product_variation.id if bundle_component.product_variation else None,
                    'variation_name': bundle_component.product_variation.name if bundle_component.product_variation else None
                }
                
                components_data.append(component_data)
            
            # Bundle metadata is now part of the ProductBundle model
            bundle_metadata = {
                'estimated_savings_percentage': float(bundle.estimated_savings_percentage) if bundle.estimated_savings_percentage else None,
                'estimated_savings_amount': float(bundle.estimated_savings_amount) if bundle.estimated_savings_amount else None,
                'bundle_description': bundle.bundle_description,
                'marketing_tagline': bundle.marketing_tagline,
                'is_featured': bundle.is_featured
            }
            
            return Response({
                'bundle_product': {
                    'id': bundle.id,
                    'name': bundle.bundle_name,
                    'subject_code': bundle.subject_code,
                    'metadata': bundle_metadata
                },
                'components': components_data,
                'total_components': len(components_data)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to get bundle contents: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], url_path='bundles')
    def get_bundles(self, request):
        """
        Get all available bundles (both master bundles and exam session bundles).
        Supports filtering by subject, exam session, and other parameters.
        """
        try:
            # Get query parameters for filtering
            subject_code = request.query_params.get('subject')
            exam_session = request.query_params.get('exam_session')
            bundle_type = request.query_params.get('type', 'all')  # 'master', 'exam_session', or 'all'
            featured_only = request.query_params.get('featured', 'false').lower() == 'true'
            
            bundles_data = []
            
            # Fetch master bundles if requested
            if bundle_type in ['master', 'all']:
                master_bundles = ProductBundle.objects.filter(is_active=True)
                
                if subject_code:
                    master_bundles = master_bundles.filter(subject__code=subject_code)
                
                if featured_only:
                    master_bundles = master_bundles.filter(is_featured=True)
                
                master_bundles = master_bundles.select_related('subject').prefetch_related(
                    'bundle_products__product_product_variation__product',
                    'bundle_products__product_product_variation__product_variation'
                ).order_by('display_order', 'bundle_name')
                
                for bundle in master_bundles:
                    serializer = ProductBundleSerializer(bundle, context={'request': request})
                    bundle_data = serializer.data
                    bundle_data['bundle_type'] = 'master'
                    bundle_data['exam_session_code'] = None  # Master bundles don't have exam sessions
                    bundles_data.append(bundle_data)
            
            # Fetch exam session bundles if requested
            if bundle_type in ['exam_session', 'all']:
                exam_session_bundles = ExamSessionSubjectBundle.objects.filter(is_active=True)
                
                if subject_code:
                    exam_session_bundles = exam_session_bundles.filter(
                        exam_session_subject__subject__code=subject_code
                    )
                
                if exam_session:
                    exam_session_bundles = exam_session_bundles.filter(
                        exam_session_subject__exam_session__session_code=exam_session
                    )
                
                if featured_only:
                    exam_session_bundles = exam_session_bundles.filter(bundle__is_featured=True)
                
                exam_session_bundles = exam_session_bundles.select_related(
                    'bundle__subject',
                    'exam_session_subject__exam_session',
                    'exam_session_subject__subject'
                ).prefetch_related(
                    'bundle_products__exam_session_subject_product_variation__product_product_variation__product',
                    'bundle_products__exam_session_subject_product_variation__product_product_variation__product_variation'
                ).order_by('display_order', 'bundle__bundle_name')
                
                for bundle in exam_session_bundles:
                    serializer = ExamSessionSubjectBundleSerializer(bundle, context={'request': request})
                    bundle_data = serializer.data
                    bundle_data['bundle_type'] = 'exam_session'
                    bundles_data.append(bundle_data)
            
            return Response({
                'results': bundles_data,
                'count': len(bundles_data),
                'filters_applied': {
                    'subject_code': subject_code,
                    'exam_session': exam_session,
                    'bundle_type': bundle_type,
                    'featured_only': featured_only
                }
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to get bundles: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
def filter_configuration(request):
    """
    Returns dynamic filter configuration and options for the frontend.
    Supports extensible filtering with configurable filter types.
    """
    filter_service = get_product_filter_service()
    
    # Get requested filter types or return all
    filter_types = request.query_params.getlist('types')
    
    # Get filter configuration
    config = filter_service.get_filter_configuration()
    
    # Get filter options
    options = filter_service.get_filter_options(filter_types if filter_types else None)
    
    # Combine configuration and options
    result = {}
    for filter_type, filter_config in config.items():
        if not filter_types or filter_type in filter_types:
            result[filter_type] = {
                **filter_config,
                'options': options.get(filter_type, [])
            }
    
    return Response(result)

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
