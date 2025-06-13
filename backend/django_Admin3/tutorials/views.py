from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.core.cache import cache
from django.db.models import Prefetch, Q
from .models import TutorialEvent
from .serializers import TutorialEventSerializer
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct, ExamSessionSubjectProductVariation
from products.models import Product
import logging

logger = logging.getLogger(__name__)

# Create your views here.

class TutorialEventViewSet(viewsets.ModelViewSet):
    queryset = TutorialEvent.objects.select_related(
        'exam_session_subject_product_variation__exam_session_subject_product__exam_session_subject__subject',
        'exam_session_subject_product_variation__exam_session_subject_product__product'
    ).all()
    serializer_class = TutorialEventSerializer
    permission_classes = [AllowAny]

class TutorialViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    def list(self, request):
        """List all tutorial events"""
        events = TutorialEvent.objects.all()
        serializer = TutorialEventSerializer(events, many=True)
        return Response(serializer.data)

class TutorialEventListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """Get tutorial events with basic filtering"""
        queryset = TutorialEvent.objects.select_related(
            'exam_session_subject_product_variation__exam_session_subject_product__exam_session_subject__subject'
        ).all()
        
        # Filter by subject code if provided
        subject_code = request.GET.get('subject_code')
        if subject_code:
            queryset = queryset.filter(
                exam_session_subject_product_variation__exam_session_subject_product__exam_session_subject__subject__code=subject_code
            )
        
        serializer = TutorialEventSerializer(queryset, many=True)
        return Response(serializer.data)

class TutorialProductListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """Get tutorial products with filtering"""
        exam_session = request.GET.get('exam_session')
        subject_code = request.GET.get('subject_code')
        
        if not exam_session or not subject_code:
            return Response({
                'error': 'exam_session and subject_code parameters are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Filter tutorial products
        products = ExamSessionSubjectProduct.objects.filter(
            exam_session_subject__exam_session_id=exam_session,
            exam_session_subject__subject__code=subject_code,
            product__fullname__icontains='tutorial'
        ).select_related(
            'exam_session_subject__subject',
            'product'
        )
        
        # Transform to expected format
        results = []
        for product in products:
            results.append({
                'subject_code': product.exam_session_subject.subject.code,
                'subject_name': product.exam_session_subject.subject.description,
                'location': product.product.fullname,
                'product_id': product.product.id,
            })
        
        return Response(results)

class TutorialProductListAllView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """Get all tutorial products"""
        cache_key = 'tutorial_products_all'
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        # Get all tutorial products using proper field lookups
        products = ExamSessionSubjectProduct.objects.filter(
            product__fullname__icontains='tutorial'
        ).select_related(
            'exam_session_subject__subject',
            'product'
        )
        
        results = []
        for product in products:
            results.append({
                'subject_code': product.exam_session_subject.subject.code,
                'subject_name': product.exam_session_subject.subject.description,  # Changed from 'name' to 'description'
                'location': product.product.fullname,
                'product_id': product.product.id,
            })
        
        # Cache for 10 minutes
        cache.set(cache_key, results, 600)
        return Response(results)

class TutorialProductVariationListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, product_id):
        """Get variations for a tutorial product"""
        subject_code = request.GET.get('subject_code')
        
        variations = ExamSessionSubjectProductVariation.objects.filter(
            exam_session_subject_product__product_id=product_id
        ).select_related(
            'product_product_variation__product_variation',
            'exam_session_subject_product__exam_session_subject__subject'
        )
        
        if subject_code:
            variations = variations.filter(
                exam_session_subject_product__exam_session_subject__subject__code=subject_code
            )
        
        results = []
        for variation in variations:
            results.append({
                'id': variation.id,
                'variation_type': variation.product_product_variation.product_variation.variation_type,
                'name': variation.product_product_variation.product_variation.name,
                'description': variation.product_product_variation.product_variation.description,
                'description_short': variation.product_product_variation.product_variation.description_short,
                'product_code': variation.product_code,
            })
        
        return Response(results)

class TutorialComprehensiveDataView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """Get all tutorial data including events, variations, and product details in one call"""
        cache_key = 'tutorial_comprehensive_data'
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return Response(cached_data)
        
        # Get all tutorial events with related data
        tutorial_events = TutorialEvent.objects.select_related(
            'exam_session_subject_product_variation__exam_session_subject_product__exam_session_subject__subject',
            'exam_session_subject_product_variation__exam_session_subject_product__product',
            'exam_session_subject_product_variation__product_product_variation__product_variation'
        ).all()
        
        # Group data by subject and product
        results = {}
        
        for event in tutorial_events:
            essp = event.exam_session_subject_product_variation.exam_session_subject_product
            subject = essp.exam_session_subject.subject
            product = essp.product
            variation = event.exam_session_subject_product_variation.product_product_variation.product_variation
            
            # Create unique key for subject-product combination
            key = f"{subject.code}_{product.id}"
            
            if key not in results:
                results[key] = {
                    'subject_id': subject.id,
                    'subject_code': subject.code,
                    'subject_name': subject.description,
                    'product_id': product.id,
                    'location': product.fullname,
                    'variations': {}
                }
            
            # Group events by variation
            variation_key = variation.id
            if variation_key not in results[key]['variations']:
                results[key]['variations'][variation_key] = {
                    'id': variation.id,
                    'name': variation.name,
                    'description': variation.description,
                    'description_short': variation.description_short,
                    'events': []
                }
            
            # Add event data
            results[key]['variations'][variation_key]['events'].append({
                'id': event.id,
                'code': event.code,
                'venue': event.venue,
                'is_soldout': event.is_soldout,
                'finalisation_date': event.finalisation_date,
                'remain_space': event.remain_space,
                'start_date': event.start_date,
                'end_date': event.end_date,
                'title': f"{event.code}",
                'price': None  # Add price logic if available
            })
        
        # Convert to list format
        final_results = []
        for data in results.values():
            # Convert variations dict to list
            data['variations'] = list(data['variations'].values())
            final_results.append(data)
        
        # Cache for 10 minutes
        cache.set(cache_key, final_results, 600)
        return Response(final_results)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_tutorial_products(request):
    """Function-based view for tutorial products"""
    return TutorialProductListAllView().get(request)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_tutorial_product_variations(request, product_id):
    """Function-based view for tutorial product variations"""
    return TutorialProductVariationListView().get(request, product_id)

@api_view(['POST'])
@permission_classes([AllowAny])
def clear_tutorial_cache(request):
    """Clear tutorial-related cache"""
    cache.delete('tutorial_products_all')
    return Response({'message': 'Cache cleared successfully'})
