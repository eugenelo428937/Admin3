"""
Product views for the catalog API.

Location: catalog/views/product_views.py
Model: catalog.models.Product, ProductBundle, ExamSessionSubjectBundle

Features:
- ProductViewSet with custom get_queryset for filtering
- Custom actions: bulk_import_products, get_bundle_contents, get_bundles
- Permission: AllowAny for reads, IsSuperUser for writes (FR-013)
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from catalog.models import (
    Product,
    ProductVariation,
    ProductBundle,
    ProductBundleProduct,
)
from catalog.serializers import (
    ProductSerializer,
    ProductBundleSerializer,
    ExamSessionSubjectBundleSerializer,
)
from catalog.permissions import IsSuperUser


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product model with filtering and bundle actions.

    Supports query parameters for filtering:
        - group: Filter by product group ID
        - variation: Filter by variation type
        - tutorial_format: Filter by tutorial format
        - distance_learning: Filter distance learning products (true/false)

    Custom Actions:
        - bulk_import_products: Batch create products
        - get_bundle_contents: Get components of a ProductBundle
        - get_bundles: List available bundles (master and exam session)

    Permissions:
        - list, retrieve, get_bundle_contents, get_bundles: AllowAny
        - create, update, destroy, bulk_import_products: IsSuperUser
    """
    serializer_class = ProductSerializer

    def get_queryset(self):
        """
        Return filtered queryset based on query parameters.

        Only returns active products by default.
        """
        queryset = Product.objects.filter(is_active=True)

        # Filter by product group
        group_id = self.request.query_params.get('group')
        if group_id:
            queryset = queryset.filter(groups__id=group_id)

        # Filter by variation type
        variation = self.request.query_params.get('variation')
        if variation:
            queryset = queryset.filter(
                product_variations__product_variation__variation_type=variation
            )

        # Filter by tutorial format
        tutorial_format = self.request.query_params.get('tutorial_format')
        if tutorial_format:
            queryset = queryset.filter(tutorial_format=tutorial_format)

        # Filter distance learning products
        distance_learning = self.request.query_params.get('distance_learning')
        if distance_learning:
            if distance_learning.lower() == 'true':
                queryset = queryset.filter(is_distance_learning=True)
            elif distance_learning.lower() == 'false':
                queryset = queryset.filter(is_distance_learning=False)

        return queryset.distinct().order_by('shortname')

    def get_permissions(self):
        """
        Return permissions based on action.

        Read operations use AllowAny.
        Write operations require IsSuperUser.
        """
        read_actions = ['list', 'retrieve', 'get_bundle_contents', 'get_bundles']
        if self.action in read_actions:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsSuperUser]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['POST'], url_path='bulk-import')
    def bulk_import_products(self, request):
        """
        Bulk import products from a list.

        Request body:
            {
                "products": [
                    {"fullname": "...", "shortname": "...", "code": "...", "description": "..."},
                    ...
                ]
            }

        Returns:
            - 201 if any products were created
            - 400 if no products were created
        """
        try:
            products_data = request.data.get('products', [])
            created_products = []
            errors = []

            for product_data in products_data:
                serializer = ProductSerializer(data=product_data)
                if serializer.is_valid():
                    serializer.save()
                    created_products.append(serializer.data)
                else:
                    errors.append({
                        'code': product_data.get('code'),
                        'errors': serializer.errors
                    })

            return Response({
                'message': f'Successfully imported {len(created_products)} products',
                'created': created_products,
                'errors': errors
            }, status=status.HTTP_201_CREATED if created_products else status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            return Response({
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['GET'], url_path='bundle-contents')
    def get_bundle_contents(self, request):
        """
        Get the contents of a ProductBundle.

        Query Parameters:
            - bundle_id: ID of the ProductBundle to retrieve

        Returns:
            - bundle_product: Bundle metadata
            - components: List of component products with variations
            - total_components: Count of components
        """
        bundle_id = request.query_params.get('bundle_id')

        if not bundle_id:
            return Response(
                {'error': 'bundle_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            bundle = ProductBundle.objects.select_related('subject').prefetch_related(
                'bundle_products__product_product_variation__product',
                'bundle_products__product_product_variation__product_variation'
            ).get(id=bundle_id)

            components_data = []
            for bundle_component in bundle.bundle_products.filter(is_active=True).order_by('sort_order'):
                ppv = bundle_component.product_product_variation
                product = ppv.product
                variation = ppv.product_variation

                component_data = {
                    'product': {
                        'id': product.id,
                        'code': product.code,
                        'fullname': product.fullname,
                        'shortname': product.shortname,
                    },
                    'variation': {
                        'id': variation.id,
                        'name': variation.name,
                        'variation_type': variation.variation_type,
                    } if variation else None,
                    'bundle_info': {
                        'default_price_type': bundle_component.default_price_type,
                        'quantity': bundle_component.quantity,
                        'sort_order': bundle_component.sort_order,
                        'variation_id': variation.id if variation else None,
                        'variation_name': variation.name if variation else None
                    }
                }
                components_data.append(component_data)

            bundle_metadata = {
                # These fields may not exist yet - use getattr for forward compatibility
                'estimated_savings_percentage': float(getattr(bundle, 'estimated_savings_percentage', 0)) if getattr(bundle, 'estimated_savings_percentage', None) else None,
                'estimated_savings_amount': float(getattr(bundle, 'estimated_savings_amount', 0)) if getattr(bundle, 'estimated_savings_amount', None) else None,
                'bundle_description': bundle.bundle_description,
                'marketing_tagline': getattr(bundle, 'marketing_tagline', None),
                'is_featured': bundle.is_featured
            }

            return Response({
                'bundle_product': {
                    'id': bundle.id,
                    'name': bundle.bundle_name,
                    'subject_code': bundle.subject.code if bundle.subject else None,
                    'metadata': bundle_metadata
                },
                'components': components_data,
                'total_components': len(components_data)
            })

        except ProductBundle.DoesNotExist:
            return Response(
                {'error': f'Bundle with id {bundle_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to get bundle contents: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['GET'], url_path='bundles')
    def get_bundles(self, request):
        """
        Get all available bundles (both master bundles and exam session bundles).

        Query Parameters:
            - subject: Filter by subject code
            - exam_session: Filter by exam session code
            - type: 'master', 'exam_session', or 'all' (default: 'all')
            - featured: 'true' to show only featured bundles

        Returns:
            - results: List of bundles
            - count: Total count
            - filters_applied: Applied filter parameters
        """
        try:
            from exam_sessions_subjects_products.models import ExamSessionSubjectBundle

            # Get query parameters
            subject_code = request.query_params.get('subject')
            exam_session = request.query_params.get('exam_session')
            bundle_type = request.query_params.get('type', 'all')
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
                    bundle_data['exam_session_code'] = None
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
