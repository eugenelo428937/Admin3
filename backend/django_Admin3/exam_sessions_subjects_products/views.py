import logging
from django.shortcuts import render, get_object_or_404
from django.core.cache import cache
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import ExamSessionSubjectProduct
from .serializers import ExamSessionSubjectProductSerializer, ProductListSerializer
from .services import FuzzySearchService
from exam_sessions_subjects.models import ExamSessionSubject
from products.models.products import Product
from products.models.product_group import ProductGroup
from subjects.models import Subject
from subjects.serializers import SubjectSerializer
from products.services.filter_service import get_product_filter_service

# Import exam session bundle models and serializers
from .models import ExamSessionSubjectBundle
from products.serializers import ExamSessionSubjectBundleSerializer

logger = logging.getLogger(__name__)

class ExamSessionSubjectProductViewSet(viewsets.ModelViewSet):    
    queryset = ExamSessionSubjectProduct.objects.all()
    serializer_class = ExamSessionSubjectProductSerializer
     
    @action(detail=False, methods=['post'], url_path='bulk-create')
    @permission_classes([IsAuthenticated])
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
    @permission_classes([IsAuthenticated])
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
        logger.info('--- list_products called ---')
        logger.info(f'Query params: {request.query_params}')
        
        # Get pagination parameters
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))
        logger.info(f'Pagination: page={page}, page_size={page_size}')
        
        # Create cache key based on query parameters (including pagination)
        cache_key_params = {
            'subject_ids': request.query_params.getlist('subject'),
            'subject_code': request.query_params.get('subject_code'),
            'main_category_ids': request.query_params.getlist('main_category'),
            'delivery_method_ids': request.query_params.getlist('delivery_method'),
            'group': request.query_params.get('group'),
            'product': request.query_params.get('product'),
            'tutorial_format': request.query_params.get('tutorial_format'),
            'variation': request.query_params.get('variation'),
            'distance_learning': request.query_params.get('distance_learning'),
            'tutorial': request.query_params.get('tutorial'),
            'page': page,
            'page_size': page_size
        }
        cache_key = f"products_bundles_list_{hash(str(sorted(cache_key_params.items())))}"
        
        # Try to get from cache first
        cached_data = cache.get(cache_key)
        if cached_data:
            logger.info('Returning cached products and bundles data')
            return Response(cached_data)
        
        # ===== FETCH PRODUCTS =====
        products_queryset = ExamSessionSubjectProduct.objects.select_related(
            'exam_session_subject__subject',
            'product'
        ).prefetch_related(
            'variations__product_product_variation__product_variation',
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

        # ===== APPLY FILTERING USING NEW FILTER SERVICE =====
        filter_service = get_product_filter_service()
        
        # Extract filters from request parameters
        filters = {
            'subject': request.query_params.getlist('subject'),
            'main_category': request.query_params.getlist('main_category'), 
            'delivery_method': request.query_params.getlist('delivery_method'),
            'tutorial_format': request.query_params.getlist('tutorial_format'),
            'variation': request.query_params.getlist('variation')
        }
        
        # Add single subject code if provided
        if request.query_params.get('subject_code'):
            filters['subject'].append(request.query_params.get('subject_code'))
        
        logger.info(f'Applying filters using filter service: {filters}')
        
        # Apply filters to products
        products_queryset = filter_service.apply_filters(products_queryset, filters)
        
        # Apply subject filtering to bundles (bundles don't have other filter types)
        if filters['subject']:
            subject_filter = Q()
            ids = [v for v in filters['subject'] if isinstance(v, int) or (isinstance(v, str) and v.isdigit())]
            codes = [v for v in filters['subject'] if isinstance(v, str) and not v.isdigit()]
            
            if ids:
                subject_filter |= Q(exam_session_subject__subject__id__in=ids)
            if codes:
                subject_filter |= Q(exam_session_subject__subject__code__in=codes)
            
            if subject_filter:
                bundles_queryset = bundles_queryset.filter(subject_filter)
        
        logger.info(f'After filter service - products: {products_queryset.count()}, bundles: {bundles_queryset.count()}')

        # ===== APPLY NAVBAR FILTERING =====
        group_filter = request.query_params.get('group')
        product_filter = request.query_params.get('product')
        logger.info(f'Navbar filtering: group={group_filter}, product={product_filter}')
        
        if group_filter:
            try:
                group = ProductGroup.objects.get(name=group_filter)
                products_queryset = products_queryset.filter(product__groups=group)
                logger.info(f'After group filter "{group_filter}" - products: {products_queryset.count()}')
            except ProductGroup.DoesNotExist:
                logger.warning(f'Product group "{group_filter}" not found')
                products_queryset = products_queryset.none()
        
        if product_filter:
            try:
                product_id = int(product_filter)
                products_queryset = products_queryset.filter(product__id=product_id)
                logger.info(f'After product filter ID {product_id} - products: {products_queryset.count()}')
            except (ValueError, TypeError):
                logger.warning(f'Invalid product ID: {product_filter}')
                products_queryset = products_queryset.none()

        # ===== APPLY NEW NAVBAR DROPDOWN FILTERING =====
        tutorial_format_filter = request.query_params.get('tutorial_format')
        variation_filter = request.query_params.get('variation')
        distance_learning_filter = request.query_params.get('distance_learning')
        tutorial_filter = request.query_params.get('tutorial')
        
        logger.info(f'New navbar filtering: tutorial_format={tutorial_format_filter}, variation={variation_filter}, distance_learning={distance_learning_filter}, tutorial={tutorial_filter}')
        
        if tutorial_format_filter:
            try:
                format_group = ProductGroup.objects.get(name=tutorial_format_filter)
                products_queryset = products_queryset.filter(product__groups=format_group)
                logger.info(f'After tutorial_format filter "{tutorial_format_filter}" - products: {products_queryset.count()}')
            except ProductGroup.DoesNotExist:
                logger.warning(f'Tutorial format group "{tutorial_format_filter}" not found')
                products_queryset = products_queryset.none()
        
        if variation_filter:
            try:
                variation_id = int(variation_filter)
                products_queryset = products_queryset.filter(product__product_variations__id=variation_id)
                logger.info(f'After variation filter ID {variation_id} - products: {products_queryset.count()}')
            except (ValueError, TypeError):
                logger.warning(f'Invalid variation ID: {variation_filter}')
                products_queryset = products_queryset.none()
        
        if distance_learning_filter:
            distance_learning_groups = ['Core Study Materials', 'Revision Materials', 'Marking']
            try:
                dl_groups = ProductGroup.objects.filter(name__in=distance_learning_groups)
                products_queryset = products_queryset.filter(product__groups__in=dl_groups).distinct()
                logger.info(f'After distance_learning filter - products: {products_queryset.count()}')
            except Exception as e:
                logger.warning(f'Error applying distance learning filter: {e}')
                products_queryset = products_queryset.none()
        
        if tutorial_filter:
            try:
                tutorial_group = ProductGroup.objects.get(name='Tutorial')
                online_classroom_group = ProductGroup.objects.get(name='Online Classroom')
                products_queryset = products_queryset.filter(product__groups=tutorial_group).exclude(product__groups=online_classroom_group).distinct()
                logger.info(f'After tutorial filter - products: {products_queryset.count()}')
            except ProductGroup.DoesNotExist as e:
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

        # ===== COMBINE AND PAGINATE =====
        all_items = transformed_bundles + transformed_products
        total_count = len(all_items)
        
        # Apply pagination to combined results
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        paginated_items = all_items[start_index:end_index]
        
        logger.info(f'Combined totals - products: {len(transformed_products)}, bundles: {len(transformed_bundles)}, total: {total_count}')
        logger.info(f'Pagination: total={total_count}, start={start_index}, end={end_index}, page_size={page_size}')
        
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
        logger.info(f'Paginated items count: {len(paginated_items)}, total: {total_count}, cached with key: {cache_key}')
        
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
        logger.info('🔍 [API] Fuzzy search endpoint called')
        
        # Get search parameters
        query = request.query_params.get('q', '').strip()
        min_score = int(request.query_params.get('min_score', 60))
        limit = int(request.query_params.get('limit', 50))
        
        logger.info(f'🔍 [API] Search params - query: "{query}", min_score: {min_score}, limit: {limit}')
        
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
            
            logger.info(f'🔍 [API] Fuzzy search completed - {len(serializer.data)} products returned')
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
        logger.info('🔍 [API] Advanced fuzzy search endpoint called')
        
        # Get search parameters
        query = request.query_params.get('q', '').strip()
        subject_ids_param = request.query_params.get('subjects', '')
        category_ids_param = request.query_params.get('categories', '')
        min_score = int(request.query_params.get('min_score', 99))
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
        
        logger.info(f'🔍 [API] Advanced search params - query: "{query}", subjects: {subject_ids}, categories: {category_ids}')
        
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
            
            logger.info(f'🔍 [API] Advanced fuzzy search completed - {len(serializer.data)} products returned')
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
        logger.info('🏠 [API] Default search data endpoint called')
        
        try:
            limit = int(request.query_params.get('limit', 5))
            logger.info(f'🏠 [API] Limit: {limit}')
            
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
                logger.info(f'🏠 [API] Found {len(subjects_serializer.data)} subjects')
            except Exception as e:
                logger.warning(f'🏠 [API] Error getting subjects: {str(e)}')
            
            try:
                # Get some product groups
                product_groups = ProductGroup.objects.all()[:limit]
                product_groups_data = [
                    {
                        'id': group.id,
                        'name': group.name,
                        'description': group.description or group.name
                    }
                    for group in product_groups
                ]
                response_data['suggested_filters']['product_groups'] = product_groups_data
                logger.info(f'🏠 [API] Found {len(product_groups_data)} product groups')
            except Exception as e:
                logger.warning(f'🏠 [API] Error getting product groups: {str(e)}')
            
            try:
                # Get some popular products
                popular_products_queryset = ExamSessionSubjectProduct.objects.select_related(
                    'exam_session_subject__subject',
                    'product'
                )[:limit]
                
                popular_products_serializer = ProductListSerializer(popular_products_queryset, many=True)
                response_data['popular_products'] = popular_products_serializer.data
                response_data['total_count'] = len(popular_products_serializer.data)
                logger.info(f'🏠 [API] Found {len(popular_products_serializer.data)} popular products')
            except Exception as e:
                logger.warning(f'🏠 [API] Error getting popular products: {str(e)}')
            
            logger.info('🏠 [API] Default search data completed successfully')
            return Response(response_data)
            
        except Exception as e:
            logger.error(f'🏠 [API] Default search data error: {str(e)}')
            import traceback
            logger.error(f'🏠 [API] Traceback: {traceback.format_exc()}')
            return Response({
                'error': 'Failed to get default search data',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
