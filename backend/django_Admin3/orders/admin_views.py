from django.db.models import Prefetch, Q
from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination

from catalog.permissions import IsSuperUser
from orders.models import Order, OrderItem
from orders.serializers.admin_order_serializer import (
    AdminOrderListSerializer,
    AdminOrderDetailSerializer,
)


ALLOWED_ORDERING = {
    'created_at', '-created_at',
    'id', '-id',
    'user__last_name', '-user__last_name',
}


class AdminOrderPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200


class AdminOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/orders/admin/ and GET /api/orders/admin/{id}/.

    Superuser-only browsing of all orders, with related items, payments,
    contact, preferences, and acknowledgments.
    """
    permission_classes = [IsSuperUser]
    pagination_class = AdminOrderPagination

    def get_queryset(self):
        qs = (
            Order.objects
            .select_related('user', 'user__student')
            .prefetch_related(
                Prefetch(
                    'items',
                    queryset=OrderItem.objects.select_related('purchasable'),
                ),
                'payments',
                'user_contact',
                'user_preferences',
                'user_acknowledgments',
            )
            .order_by('-created_at')
        )
        return self._apply_filters(qs)

    def _apply_filters(self, qs):
        params = self.request.query_params

        student_ref = params.get('student_ref')
        if student_ref:
            try:
                qs = qs.filter(user__student__student_ref=int(student_ref))
            except (TypeError, ValueError):
                return qs.none()

        name = params.get('name')
        if name:
            qs = qs.filter(
                Q(user__first_name__icontains=name)
                | Q(user__last_name__icontains=name)
            )

        email = params.get('email')
        if email:
            qs = qs.filter(user__email__icontains=email)

        order_no = params.get('order_no')
        if order_no:
            try:
                qs = qs.filter(id=int(order_no))
            except (TypeError, ValueError):
                return qs.none()

        product_code = params.get('product_code')
        if product_code:
            qs = qs.filter(items__purchasable__code=product_code).distinct()

        date_from = params.get('date_from')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = params.get('date_to')
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        ordering = params.get('ordering')
        if ordering and ordering in ALLOWED_ORDERING:
            qs = qs.order_by(ordering)

        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AdminOrderDetailSerializer
        return AdminOrderListSerializer
