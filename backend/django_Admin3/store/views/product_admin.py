"""Store product admin views for unfiltered CRUD operations.

Unlike ProductViewSet (which returns a unified product+bundle list filtered
to active-only for the public store), this ViewSet returns all store products
and requires IsSuperUser for all operations.

Supports ?catalog_product_id=X query parameter to filter store products
by their linked catalog product — used by the frontend expandable panel.
"""
from rest_framework import viewsets, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.db.models import ProtectedError

from catalog.permissions import IsSuperUser
from store.models import Product
from store.serializers.product_admin import StoreProductAdminSerializer


class AdminPagination(PageNumberPagination):
    page_size_query_param = 'page_size'
    max_page_size = 500


class StoreProductAdminViewSet(viewsets.ModelViewSet):
    """Admin CRUD ViewSet for store products.

    Returns all store products (including inactive) for admin management.
    All operations require IsSuperUser permission — unlike the public
    ProductViewSet, reads are also restricted because this endpoint
    exposes inactive products.
    """
    pagination_class = AdminPagination
    queryset = Product.objects.select_related(
        'exam_session_subject__exam_session',
        'exam_session_subject__subject',
        'product_product_variation__product',
        'product_product_variation__product_variation',
    ).all()
    serializer_class = StoreProductAdminSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        qs = super().get_queryset()
        catalog_product_id = self.request.query_params.get('catalog_product_id')
        if catalog_product_id:
            qs = qs.filter(
                product_product_variation__product_id=catalog_product_id
            )
        exam_session_id = self.request.query_params.get('exam_session_id')
        if exam_session_id:
            qs = qs.filter(
                exam_session_subject__exam_session_id=exam_session_id
            )
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        # Filter by subject code
        subject_code = self.request.query_params.get('subject_code')
        if subject_code:
            qs = qs.filter(
                exam_session_subject__subject__code=subject_code
            )
        # Filter by session code
        session_code = self.request.query_params.get('session_code')
        if session_code:
            qs = qs.filter(
                exam_session_subject__exam_session__session_code=session_code
            )
        # Filter by product group(s) — comma-separated IDs, AND logic
        group_param = self.request.query_params.get('group')
        if group_param:
            for gid in group_param.split(','):
                gid = gid.strip()
                if gid:
                    qs = qs.filter(
                        product_product_variation__product__groups__id=gid
                    )
        # Order: active first, then by product_code
        return qs.order_by('-is_active', 'product_code')

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError as e:
            return Response(
                {"error": "Cannot delete: record has dependent records",
                 "dependents": [str(obj) for obj in e.protected_objects]},
                status=status.HTTP_400_BAD_REQUEST
            )
