import logging
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from django.db.models import Q
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import ExamSessionSubjectProduct
from .serializers import (
    ExamSessionSubjectProductSerializer,
    ProductListSerializer,
    ProductSearchRequestSerializer,
)
from .services import FuzzySearchService
from .deprecation import DeprecatedAPIMixin
from .services.optimized_search_service import optimized_search_service
from .middleware.query_performance import monitor_query_performance
from catalog.models import ExamSessionSubject
from products.models.products import Product
from subjects.models import Subject
from subjects.serializers import SubjectSerializer
from products.services.filter_service import get_filter_service

# Import exam session bundle models and serializers
from .models import ExamSessionSubjectBundle
from products.serializers import ExamSessionSubjectBundleSerializer

logger = logging.getLogger(__name__)

class ExamSessionSubjectProductViewSet(DeprecatedAPIMixin, viewsets.ModelViewSet):
    """
    DEPRECATED: This ViewSet is deprecated as part of the Store App Consolidation.

    Please migrate to the new Store API:
    - Products: /api/store/products/
    - Prices: /api/store/prices/
    - Bundles: /api/store/bundles/

    This endpoint will be removed after 2025-06-01.
    """
    queryset = ExamSessionSubjectProduct.objects.all()
    serializer_class = ExamSessionSubjectProductSerializer
    permission_classes = [AllowAny]  # Allow public access by default, override with IsAuthenticated where needed

    # Deprecation configuration
    deprecation_message = "This endpoint is deprecated. Please migrate to /api/store/ endpoints."
    successor_url = "/api/store/"

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        Public actions (navigation, search) allow anyone.
        Admin actions (create, update, delete) require authentication.
        """
        # Public read-only actions
        public_actions = ['list_products', 'default_search_data', 'fuzzy_search', 'advanced_fuzzy_search', 'unified_search']
        # Protected write actions
        protected_actions = ['create', 'update', 'partial_update', 'destroy', 'bulk_create', 'add_products_to_session_subject']

        if self.action in public_actions:
            permission_classes = [AllowAny]
        elif self.action in protected_actions:
            permission_classes = [IsAuthenticated]
        else:
            # Default to the class-level permission (AllowAny)
            permission_classes = self.permission_classes

        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        """
        Bulk create exam session subject products.
        Expected format:
        {
            "products": [
                {
                    "exam_session_subject": 1,
                    "product": 1
                },
                ...
            ]
        }
        """
        data = request.data.get('products', [])
        created = []
        errors = []

        for item in data:
            serializer = self.get_serializer(data=item)
            if serializer.is_valid():
                serializer.save()
                created.append(serializer.data)
            else:
                errors.append({
                    'data': item,
                    'errors': serializer.errors
                })

        return Response({
            'created': created,
            'errors': errors
        }, status=status.HTTP_400_BAD_REQUEST if errors else status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='add-products')
    def add_products_to_session_subject(self, request):
        """
        Add products to an exam session subject.
        Expected format:
        {
            "exam_session_subject_id": 1,
            "product_codes": ["PROD1", "PROD2", ...]
        }
        """
        exam_session_subject_id = request.data.get('exam_session_subject_id')
        product_codes = request.data.get('product_codes', [])

        if not exam_session_subject_id or not product_codes:
            return Response({
                'error': 'Both exam_session_subject_id and product_codes are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            exam_session_subject = get_object_or_404(
                ExamSessionSubject, id=exam_session_subject_id)
            
            created = []
            errors = []

            for product_code in product_codes:
                try:
                    product = Product.objects.get(code=product_code)
                    
                    # Create association if it doesn't exist
                    obj, created_status = ExamSessionSubjectProduct.objects.get_or_create(
                        exam_session_subject=exam_session_subject,
                        product=product
                    )
                    
                    if created_status:
                        created.append({
                            'exam_session_subject': exam_session_subject.id,
                            'product_code': product_code,
                            'status': 'created'
                        })
                    else:
                        created.append({
                            'exam_session_subject': exam_session_subject.id,
                            'product_code': product_code,
                            'status': 'already exists'
                        })
                        
                except Product.DoesNotExist:
                    errors.append({
                        'product_code': product_code,
                        'error': 'Product not found'
                    })
                except Exception as e:
                    errors.append({
                        'product_code': product_code,
                        'error': str(e)
                    })

            return Response({
                'message': f'Processed {len(created)} products for exam session subject {exam_session_subject_id}',
                'created': created,
                'errors': errors
            }, status=status.HTTP_400_BAD_REQUEST if errors and not created else status.HTTP_201_CREATED)

        except ExamSessionSubject.DoesNotExist:
            return Response({
                'error': f'Exam session subject with id {exam_session_subject_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='list', permission_classes=[AllowAny])
    def list_products(self, request):
        """
        Get list of all products and exam session bundles with their subject details.
        Optimized with caching and pagination support.
        """
        # Get pagination parameters
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))
        
        # ===== DYNAMIC FILTER CONFIGURATION =====
        from filtering.models import FilterConfiguration
        
        # Get all active filter configurations
        filter_configs = FilterConfiguration.objects.filter(is_active=True).select_related()
        
        # Create dynamic cache key based on all possible query parameters
        cache_key_params = {
            'page': page,
            'page_size': page_size
        }
        
        # Add all dynamic filter parameters to cache key
        for config in filter_configs:
            # Use the filter name directly as the parameter name
            param_values = request.query_params.getlist(config.name)
            if param_values:
                cache_key_params[config.name] = param_values
        
        # Add navbar filters to cache key
        navbar_filters = ['group', 'product', 'tutorial_format', 'variation', 'distance_learning', 'tutorial']
        for navbar_filter in navbar_filters:
            value = request.query_params.get(navbar_filter)
            if value:
                cache_key_params[navbar_filter] = value
        
        # Add subject_code for backward compatibility
        if request.query_params.get('subject_code'):
            cache_key_params['subject_code'] = request.query_params.get('subject_code')
        
        # Add subject parameter to cache key
        if request.query_params.getlist('subject'):
            cache_key_params['subject'] = request.query_params.getlist('subject')
        
        cache_key = f"products_bundles_list_{hash(str(sorted(cache_key_params.items())))}"
        
        # Try to get from cache first
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)
        
        # ===== FETCH PRODUCTS =====
        products_queryset = ExamSessionSubjectProduct.objects.select_related(
            'exam_session_subject__subject',
            'product'
        ).prefetch_related(
            'variations__product_product_variation__product_variation',
            'variations__product_product_variation__recommendation',
            'variations__product_product_variation__recommendation__recommended_product_product_variation',
            'variations__prices'
        )

        # ===== FETCH EXAM SESSION BUNDLES =====
        bundles_queryset = ExamSessionSubjectBundle.objects.filter(is_active=True).select_related(
            'bundle__subject',
            'exam_session_subject__exam_session',
            'exam_session_subject__subject'
        ).prefetch_related(
            'bundle_products__exam_session_subject_product_variation__product_product_variation__product',
            'bundle_products__exam_session_subject_product_variation__product_product_variation__product_variation'
        )

        # ===== APPLY DYNAMIC FILTERING USING FILTER SERVICE =====
        filter_service = get_filter_service()
        
        # Build dynamic filters dictionary based on active filter configurations
        filters = {}
        bundle_filter_active = False
        
        # Process each filter configuration dynamically
        for config in filter_configs:
            # Check if this filter has values in the request using the filter name directly
            filter_values = request.query_params.getlist(config.name)
            if filter_values:
                # Convert string values to integers if needed
                processed_values = []
                for value in filter_values:
                    try:
                        # Try to convert to int if it's a numeric string
                        if value.isdigit():
                            processed_values.append(int(value))
                        else:
                            processed_values.append(value)
                    except (ValueError, AttributeError):
                        processed_values.append(value)

                filters[config.name] = processed_values

                # Check if bundle filter is active
                if config.filter_type == 'bundle' and 'bundle' in processed_values:
                    bundle_filter_active = True
        
        # Handle subject code for backward compatibility
        if request.query_params.get('subject_code'):
            if 'SUBJECT_FILTER' not in filters:
                filters['SUBJECT_FILTER'] = []
            filters['SUBJECT_FILTER'].append(request.query_params.get('subject_code'))
        
        # Handle direct subject parameter
        if request.query_params.getlist('subject'):
            if 'SUBJECT_FILTER' not in filters:
                filters['SUBJECT_FILTER'] = []
            filters['SUBJECT_FILTER'].extend(request.query_params.getlist('subject'))

        # ===== HANDLE BUNDLE FILTER LOGIC =====
        if bundle_filter_active:
            # If bundle filter is active, only return bundles
            products_queryset = products_queryset.none()  # No products when bundle filter is active
            
            # Apply other filters to bundles (except bundle filter)
            bundle_filters = {k: v for k, v in filters.items() if k != 'bundle'}
            
            # Apply subject filtering to bundles
            if bundle_filters.get('subject') or bundle_filters.get('SUBJECT_FILTER'):
                subject_filter = Q()
                subject_values = bundle_filters.get('subject', []) + bundle_filters.get('SUBJECT_FILTER', [])
                
                if subject_values:
                    ids = [v for v in subject_values if isinstance(v, int) or (isinstance(v, str) and v.isdigit())]
                    codes = [v for v in subject_values if isinstance(v, str) and not v.isdigit()]
                    
                    if ids:
                        subject_filter |= Q(exam_session_subject__subject__id__in=ids)
                    if codes:
                        subject_filter |= Q(exam_session_subject__subject__code__in=codes)

                    if subject_filter:
                        bundles_queryset = bundles_queryset.filter(subject_filter)
        else:
            # Normal filtering - apply filters to products and find related bundles
            original_filters = filters.copy()
            
            # Apply filters to products using the filter service
            if filters:
                products_queryset = filter_service.apply_filters(products_queryset, filters)
            
            # Apply subject filtering to bundles (bundles don't have other filter types)
            if filters.get('subject') or filters.get('SUBJECT_FILTER'):
                subject_filter = Q()
                
                # Get subject values from either key
                subject_values = filters.get('subject', []) + filters.get('SUBJECT_FILTER', [])
                
                if subject_values:
                    ids = [v for v in subject_values if isinstance(v, int) or (isinstance(v, str) and v.isdigit())]
                    codes = [v for v in subject_values if isinstance(v, str) and not v.isdigit()]
                    
                    if ids:
                        subject_filter |= Q(exam_session_subject__subject__id__in=ids)
                    if codes:
                        subject_filter |= Q(exam_session_subject__subject__code__in=codes)

                    if subject_filter:
                        bundles_queryset = bundles_queryset.filter(subject_filter)

            # ===== FIND BUNDLES CONTAINING FILTERED PRODUCTS =====
            # If we have any filters applied, find bundles that contain products matching those filters
            if original_filters:
                try:
                    # Get the products that match the current filters
                    filtered_product_ids = list(products_queryset.values_list('product_id', flat=True))
                    
                    if filtered_product_ids:
                        # Find bundles that contain any of these products
                        # We need to check if any products in the bundle match our filter criteria
                        from exam_sessions_subjects_products.models import ExamSessionSubjectBundleProduct
                        
                        # Get bundle products that match our filtered products
                        bundle_products_with_matching_items = ExamSessionSubjectBundleProduct.objects.filter(
                            exam_session_subject_product_variation__product_id__in=filtered_product_ids
                        ).values_list('bundle_id', flat=True).distinct()
                        
                        # Add these bundles to our bundles queryset
                        if bundle_products_with_matching_items:
                            # Get existing bundle IDs to avoid duplicates
                            existing_bundle_ids = set(bundles_queryset.values_list('id', flat=True))
                            new_bundle_ids = set(bundle_products_with_matching_items) - existing_bundle_ids
                            
                            if new_bundle_ids:
                                # Add new bundles that contain filtered products
                                additional_bundles = ExamSessionSubjectBundle.objects.filter(
                                    id__in=new_bundle_ids,
                                    is_active=True
                                ).select_related(
                                    'bundle__subject',
                                    'exam_session_subject__exam_session',
                                    'exam_session_subject__subject'
                                ).prefetch_related(
                                    'bundle_products__exam_session_subject_product_variation__product_product_variation__product',
                                    'bundle_products__exam_session_subject_product_variation__product_product_variation__product_variation'
                                )

                                # Combine the querysets
                                bundles_queryset = bundles_queryset.union(additional_bundles)

                except Exception as e:
                    logger.error(f'Error finding bundles containing filtered products: {e}')

        # ===== APPLY NAVBAR FILTERING =====
        group_filter = request.query_params.get('group')
        product_filter = request.query_params.get('product')
        
        if group_filter:
            try:
                group = FilterGroup.objects.get(name=group_filter)
                products_queryset = products_queryset.filter(product__groups=group)
            except FilterGroup.DoesNotExist:
                logger.warning(f'Filter group "{group_filter}" not found')
                products_queryset = products_queryset.none()
        
        if product_filter:
            try:
                product_id = int(product_filter)
                products_queryset = products_queryset.filter(product__id=product_id)
            except (ValueError, TypeError):
                logger.warning(f'Invalid product ID: {product_filter}')
                products_queryset = products_queryset.none()

        # ===== APPLY NEW NAVBAR DROPDOWN FILTERING =====
        tutorial_format_filter = request.query_params.get('tutorial_format')
        variation_filter = request.query_params.get('variation')
        distance_learning_filter = request.query_params.get('distance_learning')
        tutorial_filter = request.query_params.get('tutorial')

        if tutorial_format_filter:
            try:
                format_group = FilterGroup.objects.get(name=tutorial_format_filter)
                products_queryset = products_queryset.filter(product__groups=format_group)
            except FilterGroup.DoesNotExist:
                logger.warning(f'Tutorial format group "{tutorial_format_filter}" not found')
                products_queryset = products_queryset.none()
        
        if variation_filter:
            try:
                variation_id = int(variation_filter)
                products_queryset = products_queryset.filter(product__product_variations__id=variation_id)
            except (ValueError, TypeError):
                logger.warning(f'Invalid variation ID: {variation_filter}')
                products_queryset = products_queryset.none()
        
        if distance_learning_filter:
            distance_learning_groups = ['Core Study Materials', 'Revision Materials', 'Marking']
            try:
                dl_groups = FilterGroup.objects.filter(name__in=distance_learning_groups)
                products_queryset = products_queryset.filter(product__groups__in=dl_groups).distinct()
            except Exception as e:
                logger.warning(f'Error applying distance learning filter: {e}')
                products_queryset = products_queryset.none()
        
        if tutorial_filter:
            try:
                tutorial_group = FilterGroup.objects.get(name='Tutorial')
                online_classroom_group = FilterGroup.objects.get(name='Online Classroom')
                products_queryset = products_queryset.filter(product__groups=tutorial_group).exclude(product__groups=online_classroom_group).distinct()
            except FilterGroup.DoesNotExist as e:
                logger.warning(f'Tutorial group not found: {e}')
                products_queryset = products_queryset.none()

        # ===== SERIALIZE BOTH PRODUCTS AND BUNDLES =====
        products_serializer = ProductListSerializer(products_queryset, many=True)
        bundles_serializer = ExamSessionSubjectBundleSerializer(bundles_queryset, many=True, context={'request': request})

        # ===== TRANSFORM BUNDLES TO HAVE CONSISTENT STRUCTURE =====
        transformed_bundles = []
        for bundle_data in bundles_serializer.data:
            transformed_bundle = {
                **bundle_data,
                'item_type': 'bundle',
                'is_bundle': True,
                'type': 'bundle',
                'bundle_type': 'exam_session',
                'product_name': bundle_data.get('bundle_name'),
                'shortname': bundle_data.get('bundle_name'),
                'fullname': bundle_data.get('bundle_description', bundle_data.get('bundle_name')),
                'description': bundle_data.get('bundle_description'),
                'code': bundle_data.get('subject_code'),
            }
            transformed_bundles.append(transformed_bundle)

        # ===== TRANSFORM PRODUCTS TO HAVE CONSISTENT STRUCTURE =====
        transformed_products = []
        for product_data in products_serializer.data:
            transformed_product = {
                **product_data,
                'item_type': 'product',
                'is_bundle': False,
                'type': product_data.get('type', 'product')
            }
            transformed_products.append(transformed_product)

        # ===== COMBINE, SORT, AND PAGINATE =====
        all_items = transformed_bundles + transformed_products

        # Sort by subject code (default for product listing)
        # Both bundles have 'code' and products have 'subject_code'
        all_items.sort(key=lambda x: x.get('code') or x.get('subject_code', ''))

        total_count = len(all_items)

        # Apply pagination to combined results
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        paginated_items = all_items[start_index:end_index]

        # ===== GET SUBJECTS FOR FILTERS =====
        subjects_data = []
        if page == 1:
            subjects_cache_key = 'all_subjects_ordered'
            subjects_data = cache.get(subjects_cache_key)
            if not subjects_data:
                subjects = Subject.objects.all().order_by('code')
                subject_serializer = SubjectSerializer(subjects, many=True)
                subjects_data = subject_serializer.data
                cache.set(subjects_cache_key, subjects_data, 1800)  # 30 minutes
        
        # ===== PREPARE RESPONSE =====
        has_next = end_index < total_count
        has_previous = page > 1
        
        response_data = {
            'results': paginated_items,  # Changed from 'products' to 'results' for consistency
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'has_next': has_next,
            'has_previous': has_previous,
            'total_pages': (total_count + page_size - 1) // page_size,
            'products_count': len(transformed_products),
            'bundles_count': len(transformed_bundles),
            'filters': {
                'subjects': subjects_data
            } if page == 1 else {}
        }

        # Cache the result for 5 minutes
        cache.set(cache_key, response_data, 300)

        return Response(response_data)

    @action(detail=False, methods=['get'], url_path='fuzzy-search', permission_classes=[AllowAny])
    def fuzzy_search(self, request):
        """
        Perform fuzzy search using FuzzyWuzzy library.
        Query parameters:
        - q: Search query string
        - min_score: Minimum fuzzy match score (default: 60)
        - limit: Maximum number of results (default: 50)
        """
        # Get search parameters
        query = request.query_params.get('q', '').strip()
        # min_score = int(request.query_params.get('min_score', settings.FUZZY_SEARCH_MIN_SCORE))
        min_score = int(request.query_params.get('min_score', 60))
        limit = int(request.query_params.get('limit', 50))
        
        if not query or len(query) < 2:
            return Response({
                'error': 'Query parameter "q" is required and must be at least 2 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Initialize search service
            search_service = FuzzySearchService(min_score=min_score)
            
            # Perform search
            search_results = search_service.search_products(query, limit=limit)
            
            # Serialize the products
            serializer = ProductListSerializer(search_results['products'], many=True)
            
            # Prepare response
            response_data = {
                'products': serializer.data,
                'total_count': search_results['total_count'],
                'suggested_filters': search_results['suggested_filters'],
                'search_info': search_results['search_info']
            }

            return Response(response_data)
            
        except Exception as e:
            logger.error(f'🔍 [API] Fuzzy search error: {str(e)}')
            return Response({
                'error': 'Search failed',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='advanced-fuzzy-search', permission_classes=[AllowAny])
    def advanced_fuzzy_search(self, request):
        """
        Perform advanced fuzzy search with filters.
        Query parameters:
        - q: Search query string (optional)
        - subjects: Subject IDs to filter by (comma-separated)
        - categories: Category IDs to filter by (comma-separated)  
        - min_score: Minimum fuzzy match score (default: 60)
        - limit: Maximum number of results (default: 50)
        """
        # Get search parameters
        query = request.query_params.get('q', '').strip()
        subject_ids_param = request.query_params.get('subjects', '')
        category_ids_param = request.query_params.get('categories', '')
        # min_score = int(request.query_params.get('min_score', settings.FUZZY_SEARCH_MIN_SCORE))
        min_score = int(request.query_params.get('min_score', 65))
        limit = int(request.query_params.get('limit', 50))
        
        # Parse subject and category IDs
        subject_ids = []
        if subject_ids_param:
            try:
                subject_ids = [int(id.strip()) for id in subject_ids_param.split(',') if id.strip()]
            except ValueError:
                return Response({
                    'error': 'Invalid subject IDs format. Use comma-separated integers.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        category_ids = []
        if category_ids_param:
            try:
                category_ids = [int(id.strip()) for id in category_ids_param.split(',') if id.strip()]
            except ValueError:
                return Response({
                    'error': 'Invalid category IDs format. Use comma-separated integers.'
                }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Initialize search service
            search_service = FuzzySearchService(min_score=min_score)
            
            # Perform advanced search
            search_results = search_service.advanced_search(
                query=query or None,
                subject_ids=subject_ids if subject_ids else None,
                category_ids=category_ids if category_ids else None,
                limit=limit
            )
            
            # Serialize the products
            serializer = ProductListSerializer(search_results['products'], many=True)
            
            # Prepare response
            response_data = {
                'products': serializer.data,
                'total_count': search_results['total_count'],
                'suggested_filters': search_results['suggested_filters'],
                'search_info': search_results['search_info']
            }

            return Response(response_data)
            
        except Exception as e:
            logger.error(f'🔍 [API] Advanced fuzzy search error: {str(e)}')
            return Response({
                'error': 'Advanced search failed',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='default-search-data', permission_classes=[AllowAny])
    def default_search_data(self, request):
        """
        Get default search data including popular products and top filters.
        Used when no search query is provided to show featured content.
        
        Query parameters:
        - limit: Maximum number of items per category (default: 5)
        """
        try:
            limit = int(request.query_params.get('limit', 5))
            
            # Start with a basic response to test the endpoint
            response_data = {
                'popular_products': [],
                'total_count': 0,
                'suggested_filters': {
                    'subjects': [],
                    'product_groups': [],
                    'variations': [],
                    'products': []
                },
                'search_info': {
                    'query': '',
                    'type': 'default'
                }
            }
            
            # Try to get some basic data
            try:
                # Get some subjects
                subjects = Subject.objects.all()[:limit]
                subjects_serializer = SubjectSerializer(subjects, many=True)
                response_data['suggested_filters']['subjects'] = subjects_serializer.data
            except Exception as e:
                logger.warning(f' [API] Error getting subjects: {str(e)}')
            
            try:
                # Get some product groups
                product_groups = FilterGroup.objects.all()[:limit]
                product_groups_data = [
                    {
                        'id': group.id,
                        'name': group.name,
                        'description': group.description or group.name
                    }
                    for group in product_groups
                ]
                response_data['suggested_filters']['product_groups'] = product_groups_data
            except Exception as e:
                logger.warning(f' [API] Error getting product groups: {str(e)}')
            
            try:
                # Get some popular products
                popular_products_queryset = ExamSessionSubjectProduct.objects.select_related(
                    'exam_session_subject__subject',
                    'product'
                ).prefetch_related(
                    'variations__product_product_variation__product_variation',
                    'variations__product_product_variation__recommendation',
                    'variations__product_product_variation__recommendation__recommended_product_product_variation',
                    'variations__prices'
                )[:limit]
                
                popular_products_serializer = ProductListSerializer(popular_products_queryset, many=True)
                response_data['popular_products'] = popular_products_serializer.data
                response_data['total_count'] = len(popular_products_serializer.data)
            except Exception as e:
                logger.warning(f' [API] Error getting popular products: {str(e)}')

            return Response(response_data)
            
        except Exception as e:
            logger.error(f' [API] Default search data error: {str(e)}')
            import traceback
            logger.error(f' [API] Traceback: {traceback.format_exc()}')
            return Response({
                'error': 'Failed to get default search data',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], url_path='unified-search', permission_classes=[AllowAny])
    @monitor_query_performance('Unified Product Search')
    def unified_search(self, request):
        """
        Unified product search endpoint with disjunctive facet counting.
        Phase 3 Optimized version with database performance improvements.
        
        POST /api/products/search/
        
        Request format:
        {
            "filters": {
                "subjects": ["CM2", "SA1"],
                "categories": ["Bundle"],
                "product_types": ["Core Study Material"],
                "products": ["Additional Mock Pack"],
                "modes_of_delivery": ["Ebook"]
            },
            "pagination": {
                "page": 1,
                "page_size": 20
            },
            "options": {
                "include_bundles": true,
                "include_analytics": false
            }
        }
        """
        try:
            # Validate request data
            request_serializer = ProductSearchRequestSerializer(data=request.data)
            if not request_serializer.is_valid():
                logger.error(f'🔍 [UNIFIED-SEARCH-V3] Invalid request: {request_serializer.errors}')
                return Response({
                    'error': 'Invalid request format',
                    'details': request_serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
            
            validated_data = request_serializer.validated_data

            # Extract parameters with defaults
            search_query = validated_data.get('searchQuery', '').strip()
            filters = validated_data.get('filters', {})
            pagination = validated_data.get('pagination', {'page': 1, 'page_size': 20})
            options = validated_data.get('options', {'include_bundles': True})
            
            # Add navbar-style filters from query parameters (for dropdown navigation compatibility)
            tutorial_format_filter = request.query_params.get('tutorial_format')
            group_filter = request.query_params.get('group')
            variation_filter = request.query_params.get('variation')
            distance_learning_filter = request.query_params.get('distance_learning')
            tutorial_filter = request.query_params.get('tutorial')
            product_filter = request.query_params.get('product')
            
            navbar_filters = {}
            if tutorial_format_filter:
                navbar_filters['tutorial_format'] = tutorial_format_filter
            if group_filter:
                navbar_filters['group'] = group_filter
            if variation_filter:
                navbar_filters['variation'] = variation_filter
            if distance_learning_filter:
                navbar_filters['distance_learning'] = distance_learning_filter
            if tutorial_filter:
                navbar_filters['tutorial'] = tutorial_filter
            if product_filter:
                navbar_filters['product'] = product_filter
            
            # Use the optimized search service
            result = optimized_search_service.search_products(
                search_query=search_query,
                filters=filters,
                navbar_filters=navbar_filters,
                pagination=pagination,
                options=options
            )

            return Response(result)
            
        except Exception as e:
            logger.error(f'🔍 [UNIFIED-SEARCH] Error: {str(e)}')
            import traceback
            logger.error(f'🔍 [UNIFIED-SEARCH] Traceback: {traceback.format_exc()}')
            return Response({
                'error': 'Search failed',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _generate_filter_counts(self, applied_filters, base_products_queryset, base_bundles_queryset):
        """
        Generate disjunctive facet counts using proper database relationships.
        Uses acted_filter_group hierarchy with parent_id to generate dynamic filters.
        This replaces hardcoded filter generation with database-driven approach.
        """
        filter_counts = {
            'subjects': {},
            'categories': {},
            'product_types': {},
            'products': {},
            'modes_of_delivery': {}
        }
        
        try:
            filter_service = get_filter_service()

            # 1. Subjects - Get from acted_subjects (correct approach)
            subjects = base_products_queryset.values_list(
                'exam_session_subject__subject__code',
                'exam_session_subject__subject__description'
            ).distinct()
            
            for code, name in subjects:
                if code:
                    # Test applying this subject filter
                    test_filters = applied_filters.copy()
                    test_filters['subjects'] = [code]
                    legacy_test_filters = {'SUBJECT_FILTER': [code]}
                    
                    count = filter_service.apply_filters(base_products_queryset, legacy_test_filters).count()
                    filter_counts['subjects'][code] = {
                        'count': count,
                        'name': name or code  # Use description if available, otherwise code
                    }

            # 2. Categories - Get from acted_filter_group where parent_id IS NULL AND has PRODUCT_CATEGORY config
            root_categories = FilterGroup.objects.filter(
                parent_id__isnull=True, 
                is_active=True,
                filterconfigurationgroup__filter_configuration__name='PRODUCT_CATEGORY'
            ).distinct().order_by('name')
            
            for category in root_categories:
                # Count products associated with this category group
                count = base_products_queryset.filter(
                    product__groups__id=category.id
                ).distinct().count()
                
                # Include bundle count for Bundle category
                if category.name == 'Bundle' and base_bundles_queryset:
                    bundle_count = base_bundles_queryset.count()
                    count += bundle_count
                
                if count > 0:
                    filter_counts['categories'][category.name] = {
                        'count': count,
                        'name': category.name
                    }

            # 3. Product Types - Get child groups with PRODUCT_TYPE configuration
            # Get all child groups that have PRODUCT_TYPE configuration
            child_groups = FilterGroup.objects.filter(
                parent_id__isnull=False, 
                is_active=True,
                filterconfigurationgroup__filter_configuration__name='PRODUCT_TYPE'
            ).distinct().select_related('parent').order_by('parent__name', 'name')
            
            for group in child_groups:
                # Count products associated with this group
                count = base_products_queryset.filter(
                    product__groups__id=group.id
                ).distinct().count()
                
                if count > 0:
                    filter_counts['product_types'][group.name] = {
                        'count': count,
                        'name': group.name,
                        'display_name': group.name  # Just use the child name, no parent prefix
                    }

            # 4. Products - Individual products (keep existing logic)
            distinct_products = base_products_queryset.values_list(
                'product__id',
                'product__shortname'
            ).distinct()[:50]  # Limit to prevent UI overload
            
            for product_id, product_name in distinct_products:
                if product_name:
                    count = base_products_queryset.filter(
                        product__id=product_id
                    ).count()
                    if count > 0:
                        filter_counts['products'][str(product_id)] = {
                            'count': count,
                            'name': product_name,
                            'id': product_id
                        }

            # 5. Modes of Delivery - Get from product variations but also check for filter groups
            # First get from product variations (existing approach)
            modes = base_products_queryset.values_list(
                'variations__product_product_variation__product_variation__name',
                flat=True
            ).distinct()
            
            for mode in modes:
                if mode:
                    count = base_products_queryset.filter(
                        variations__product_product_variation__product_variation__name=mode
                    ).distinct().count()
                    if count > 0:
                        filter_counts['modes_of_delivery'][mode] = {
                            'count': count,
                            'name': mode
                        }
            
            # Also check for delivery mode filter groups (like Tutorial formats)
            delivery_groups = FilterGroup.objects.filter(
                name__in=['Face-to-face', 'Online Classroom', 'Live Online', 'eBook', 'Printed'],
                is_active=True
            )
            
            for group in delivery_groups:
                count = base_products_queryset.filter(
                    product__groups__id=group.id
                ).distinct().count()
                if count > 0:
                    filter_counts['modes_of_delivery'][group.name] = {
                        'count': count,
                        'name': group.name
                    }

        except Exception as e:
            logger.error(f'🔢 [FILTER-COUNTS] Error generating database-driven counts: {str(e)}')
            import traceback
            logger.error(f'🔢 [FILTER-COUNTS] Traceback: {traceback.format_exc()}')
            # Return empty counts on error
            pass
        
        return filter_counts
