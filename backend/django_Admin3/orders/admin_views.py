from django.db.models import Prefetch
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from rest_framework.pagination import PageNumberPagination

from orders.models import Order, OrderItem
from orders.serializers.admin_order_serializer import (
    AdminOrderListSerializer,
    AdminOrderDetailSerializer,
)


class AdminOrderPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 200


class AdminOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/orders/admin/ and GET /api/orders/admin/{id}/.

    Superuser-only browsing of all orders, with related items, payments,
    contact, preferences, and acknowledgments.
    """
    permission_classes = [IsAdminUser]
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
        # Filters added in Task 5.
        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AdminOrderDetailSerializer
        return AdminOrderListSerializer
