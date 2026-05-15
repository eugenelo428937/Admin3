"""
Tutorial views for the tutorials API.

Updated 2026-01-16: Migrated from exam_sessions_subjects_products models
to store.Product as part of T087 legacy app cleanup.
Updated 2026-05-15 (Phase 4d): Refactored four endpoints to filter and
display via TutorialProduct MTI subclass instead of the legacy
PPV→catalog.Product chain.
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
from store.models import Product as StoreProduct, TutorialProduct
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

        # Phase 4d: filter on the TutorialProduct subclass directly (replaces
        # variation-type sniffing via PPV→Product.fullname icontains 'tutorial').
        products = TutorialProduct.objects.filter(
            exam_session_subject__exam_session_id=exam_session,
            exam_session_subject__subject__code=subject_code,
        ).select_related(
            'exam_session_subject__subject',
            'tutorial_location',
        )

        results = []
        for product in products:
            # tutorial_location is nullable for Online Classroom rows.
            location_label = (
                product.tutorial_location.name if product.tutorial_location_id
                else 'Online Classroom'
            )
            results.append({
                'subject_code': product.exam_session_subject.subject.code,
                'subject_name': product.exam_session_subject.subject.description,
                'location': location_label,
                'product_id': product.id,  # TutorialProduct PK (shared with Product via MTI)
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

        # Phase 4d: query TutorialProduct subclass directly (replaces
        # StoreProduct filtered by PPV→Product.fullname icontains 'tutorial').
        products = TutorialProduct.objects.select_related(
            'exam_session_subject__subject',
            'tutorial_location',
        ).all()

        results = []
        for product in products:
            # tutorial_location is nullable for Online Classroom rows.
            location_label = (
                product.tutorial_location.name if product.tutorial_location_id
                else 'Online Classroom'
            )
            results.append({
                'subject_code': product.exam_session_subject.subject.code,
                'subject_name': product.exam_session_subject.subject.description,
                'location': location_label,
                'product_id': product.id,  # TutorialProduct PK (shared with Product via MTI)
            })

        # Cache for 10 minutes
        cache.set(cache_key, results, 600)
        return Response(results)


class TutorialProductVariationListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, product_id):
        """Get variations for a tutorial product"""
        subject_code = request.GET.get('subject_code')

        # TODO(Phase 4d follow-up): the legacy endpoint returned multiple
        # variation rows when one catalog Product had multiple PPVs of type
        # Tutorial. With TutorialProduct as the row-per-variation model, this
        # endpoint now returns exactly one row per `product_id`. If the
        # frontend needs the legacy multi-row shape, the URL semantic must
        # shift (group by subject + tutorial_course_template, perhaps).

        # Phase 4d: TutorialProduct's `format` enum replaces the catalog
        # ProductVariation row for Tutorial rows. The `product_id` URL param
        # is now interpreted as the TutorialProduct PK (or the parent Product
        # PK — same value via MTI). We resolve it as TutorialProduct.objects.
        variations = TutorialProduct.objects.filter(
            pk=product_id  # treat product_id as TutorialProduct PK
        ).select_related(
            'exam_session_subject__subject',
        )

        # Optional subject filter (preserved from old behavior)
        if subject_code:
            variations = variations.filter(
                exam_session_subject__subject__code=subject_code
            )

        results = []
        for tp in variations:
            results.append({
                'id': tp.id,
                'variation_type': 'Tutorial',  # constant for this endpoint
                'name': tp.get_format_display(),
                'description': '',  # TutorialProduct has no description field;
                                    # the format display is the canonical name
                'description_short': tp.format,
                'product_code': tp.product_code,
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

        # Phase 4d: store_product is TutorialProduct (Phase 4b retarget).
        # Read tutorial-specific fields directly.
        tutorial_events = TutorialEvents.objects.select_related(
            'venue',
            'location',
            'store_product__exam_session_subject__subject',
            'store_product__tutorial_location',
            'store_product__tutorial_course_template',
        ).prefetch_related('sessions__instructors').all()

        # Group data by subject and TutorialProduct PK
        results = {}

        for event in tutorial_events:
            store_product = event.store_product  # TutorialProduct
            subject = store_product.exam_session_subject.subject

            # Phase 4d: group by (subject_code, TutorialProduct.id) instead of
            # (subject_code, catalog_product.id). The TutorialProduct PK
            # uniquely identifies the (subject, location, format, session)
            # tuple.
            key = f"{subject.code}_{store_product.id}"

            if key not in results:
                # tutorial_location is nullable for Online Classroom rows.
                location_label = (
                    store_product.tutorial_location.name
                    if store_product.tutorial_location_id
                    else 'Online Classroom'
                )
                results[key] = {
                    'subject_id': subject.id,
                    'subject_code': subject.code,
                    'subject_name': subject.description,
                    'product_id': store_product.id,  # TutorialProduct PK
                    'location': location_label,
                    'variations': {}
                }

            # Group events by TutorialProduct format (replaces catalog variation.id).
            # Each TutorialProduct has exactly one format, so the variation key
            # is the TutorialProduct PK itself.
            variation_key = store_product.id
            if variation_key not in results[key]['variations']:
                results[key]['variations'][variation_key] = {
                    'id': store_product.id,
                    'name': store_product.get_format_display(),
                    'description': '',          # TutorialProduct has no description field
                    'description_short': store_product.format,
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
