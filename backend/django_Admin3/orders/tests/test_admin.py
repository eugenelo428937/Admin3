from django.test import TestCase, RequestFactory
from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from decimal import Decimal

from orders.admin import OrderAcknowledgmentAdmin
from orders.models import Order, OrderAcknowledgment

User = get_user_model()


class OrderAcknowledgmentAdminTest(TestCase):
    def setUp(self):
        self.site = AdminSite()
        self.admin = OrderAcknowledgmentAdmin(OrderAcknowledgment, self.site)
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )
        self.staff_user = User.objects.create_superuser(
            username='admin', email='admin@example.com', password='adminpass123'
        )
        self.order = Order.objects.create(
            user=self.user, total_amount=Decimal('120.00')
        )
        self.ack = OrderAcknowledgment.objects.create(
            order=self.order,
            acknowledgment_type='terms_conditions',
            title='Terms & Conditions',
            content_summary='Accept T&Cs',
            is_accepted=True,
        )

    def test_order_user_display_returns_username(self):
        """Test that the order_user admin method returns the order's user username."""
        result = self.admin.order_user(self.ack)
        self.assertEqual(result, 'testuser')

    def test_get_queryset_uses_select_related(self):
        """Test that get_queryset includes select_related for order__user."""
        request = self.factory.get('/admin/orders/orderacknowledgment/')
        request.user = self.staff_user
        qs = self.admin.get_queryset(request)
        # Verify the queryset returns correct results
        self.assertIn(self.ack, qs)
        # Verify select_related is applied (order__user should be in select_related lookups)
        select_related_lookups = qs.query.select_related
        self.assertIsNotNone(select_related_lookups)
        self.assertIn('order', select_related_lookups)
        self.assertIn('user', select_related_lookups['order'])
