import logging
from django.shortcuts import render, get_object_or_404
from django.core.cache import cache
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import ExamSessionSubjectProduct
from .serializers import ExamSessionSubjectProductSerializer, ProductListSerializer
from exam_sessions_subjects.models import ExamSessionSubject
from products.models.products import Product
from subjects.models import Subject
from subjects.serializers import SubjectSerializer

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
        Get list of all products with their subject details.
        Optimized with caching and better query optimization.
        """
        logger.info('--- list_products called ---')
        logger.info(f'Query params: {request.query_params}')
        
        # Create cache key based on query parameters
        cache_key_params = {
            'subject_ids': request.query_params.getlist('subject'),
            'subject_code': request.query_params.get('subject_code'),
            'main_category_ids': request.query_params.getlist('main_category'),
            'delivery_method_ids': request.query_params.getlist('delivery_method')
        }
        cache_key = f"products_list_{hash(str(sorted(cache_key_params.items())))}"
        
        # Try to get from cache first
        cached_data = cache.get(cache_key)
        if cached_data:
            logger.info('Returning cached products data')
            return Response(cached_data)
        
        # Optimize queryset with select_related and prefetch_related
        queryset = ExamSessionSubjectProduct.objects.select_related(
            'exam_session_subject__subject',
            'product'
        ).prefetch_related(
            'variations__product_product_variation__product_variation',
            'variations__prices'
        )

        # Subject filtering - multiple options
        subject_ids = request.query_params.getlist('subject')
        subject_code = request.query_params.get('subject_code', None)
        logger.info(f'Filtering subject_ids: {subject_ids}, subject_code: {subject_code}')
        if subject_ids:
            queryset = queryset.filter(
                exam_session_subject__subject__id__in=subject_ids)
            logger.info(f'After subject_ids filter, queryset count: {queryset.count()}')
        if subject_code:
            queryset = queryset.filter(
                exam_session_subject__subject__code=subject_code)
            logger.info(f'After subject_code filter, queryset count: {queryset.count()}')

        # --- Product group filtering logic ---
        main_category_ids = request.query_params.getlist('main_category')
        delivery_method_ids = request.query_params.getlist('delivery_method')
        logger.info(f'Filtering main_category_ids: {main_category_ids}, delivery_method_ids: {delivery_method_ids}')
        
        # Use more efficient filtering approach
        if main_category_ids or delivery_method_ids:
            product_filters = Q()
            
            if main_category_ids:
                product_filters |= Q(product__groups__id__in=main_category_ids)
            
            if delivery_method_ids:
                if main_category_ids:
                    # Intersection: products must be in both categories
                    product_filters &= Q(product__groups__id__in=delivery_method_ids)
                else:
                    product_filters |= Q(product__groups__id__in=delivery_method_ids)
            
            queryset = queryset.filter(product_filters).distinct()
            
        logger.info(f'After product group filter, queryset count: {queryset.count()}')

        # Get subjects for filters (cache this separately)
        subjects_cache_key = 'all_subjects_ordered'
        subjects_data = cache.get(subjects_cache_key)
        if not subjects_data:
            subjects = Subject.objects.all().order_by('code')
            subject_serializer = SubjectSerializer(subjects, many=True)
            subjects_data = subject_serializer.data
            cache.set(subjects_cache_key, subjects_data, 1800)  # 30 minutes
        
        # Serialize the main data
        serializer = ProductListSerializer(queryset, many=True)
        
        response_data = {
            'products': serializer.data,
            'filters': {
                'subjects': subjects_data
            }
        }
        
        # Cache the result for 10 minutes
        cache.set(cache_key, response_data, 600)
        logger.info(f'Final queryset count: {queryset.count()}, cached with key: {cache_key}')
        
        return Response(response_data)
