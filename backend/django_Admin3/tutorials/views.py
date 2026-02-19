"""
Tutorial views for the tutorials API.

Updated 2026-01-16: Migrated from exam_sessions_subjects_products models
to store.Product as part of T087 legacy app cleanup.
"""
from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, generics, status
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.core.cache import cache
from django.db.models import Prefetch, Q
from .models import TutorialEvents
from .serializers import TutorialEventsSerializer
from store.models import Product as StoreProduct
from catalog.models import Product as CatalogProduct
import logging

logger = logging.getLogger(__name__)


class TutorialEventsViewSet(viewsets.ModelViewSet):
    queryset = TutorialEvents.objects.select_related(
        'store_product__exam_session_subject__subject',
        'store_product__product_product_variation__product'
    ).prefetch_related('sessions__instructors').all()
    serializer_class = TutorialEventsSerializer
    permission_classes = [AllowAny]


class TutorialViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    def list(self, request):
        """List all tutorial events"""
        events = TutorialEvents.objects.all()
        serializer = TutorialEventsSerializer(events, many=True)
        return Response(serializer.data)


class TutorialEventListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """Get tutorial events with basic filtering"""
        queryset = TutorialEvents.objects.select_related(
            'store_product__exam_session_subject__subject'
        ).prefetch_related('sessions__instructors').all()

        # Filter by subject code if provided
        subject_code = request.GET.get('subject_code')
        if subject_code:
            queryset = queryset.filter(
                store_product__exam_session_subject__subject__code=subject_code
            )

        serializer = TutorialEventsSerializer(queryset, many=True)
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

        # Filter tutorial products using store.Product
        products = StoreProduct.objects.filter(
            exam_session_subject__exam_session_id=exam_session,
            exam_session_subject__subject__code=subject_code,
            product_product_variation__product__fullname__icontains='tutorial'
        ).select_related(
            'exam_session_subject__subject',
            'product_product_variation__product'
        )

        # Transform to expected format
        results = []
        for product in products:
            catalog_product = product.product_product_variation.product
            results.append({
                'subject_code': product.exam_session_subject.subject.code,
                'subject_name': product.exam_session_subject.subject.description,
                'location': catalog_product.fullname,
                'product_id': catalog_product.id,
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

        # Get all tutorial products using store.Product
        products = StoreProduct.objects.filter(
            product_product_variation__product__fullname__icontains='tutorial'
        ).select_related(
            'exam_session_subject__subject',
            'product_product_variation__product'
        )

        results = []
        for product in products:
            catalog_product = product.product_product_variation.product
            results.append({
                'subject_code': product.exam_session_subject.subject.code,
                'subject_name': product.exam_session_subject.subject.description,
                'location': catalog_product.fullname,
                'product_id': catalog_product.id,
            })

        # Cache for 10 minutes
        cache.set(cache_key, results, 600)
        return Response(results)


class TutorialProductVariationListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, product_id):
        """Get variations for a tutorial product"""
        subject_code = request.GET.get('subject_code')

        # Use store.Product to find variations
        variations = StoreProduct.objects.filter(
            product_product_variation__product_id=product_id
        ).select_related(
            'product_product_variation__product_variation',
            'exam_session_subject__subject'
        )

        if subject_code:
            variations = variations.filter(
                exam_session_subject__subject__code=subject_code
            )

        results = []
        for store_product in variations:
            ppv = store_product.product_product_variation
            results.append({
                'id': store_product.id,
                'variation_type': ppv.product_variation.variation_type,
                'name': ppv.product_variation.name,
                'description': ppv.product_variation.description,
                'description_short': ppv.product_variation.description_short,
                'product_code': store_product.product_code,
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

        # Get all tutorial events with related data via store.Product
        tutorial_events = TutorialEvents.objects.select_related(
            'venue',
            'location',
            'store_product__exam_session_subject__subject',
            'store_product__product_product_variation__product',
            'store_product__product_product_variation__product_variation'
        ).prefetch_related('sessions__instructors').all()

        # Group data by subject and product
        results = {}

        for event in tutorial_events:
            store_product = event.store_product
            subject = store_product.exam_session_subject.subject
            catalog_product = store_product.product_product_variation.product
            variation = store_product.product_product_variation.product_variation

            # Create unique key for subject-product combination
            key = f"{subject.code}_{catalog_product.id}"

            if key not in results:
                results[key] = {
                    'subject_id': subject.id,
                    'subject_code': subject.code,
                    'subject_name': subject.description,
                    'product_id': catalog_product.id,
                    'location': catalog_product.fullname,
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
                'venue': str(event.venue) if event.venue else None,
                'location': str(event.location) if event.location else None,
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
