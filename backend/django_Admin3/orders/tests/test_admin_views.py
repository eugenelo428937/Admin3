from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from decimal import Decimal

from orders.models import Order

User = get_user_model()


class AdminOrderViewSetPermissionTest(APITestCase):
    def setUp(self):
        self.regular = User.objects.create_user(username='reg', email='r@x.com', password='p')
        self.admin = User.objects.create_user(
            username='adm', email='a@x.com', password='p', is_staff=True,
        )

    def test_anonymous_user_gets_401_or_403(self):
        response = self.client.get('/api/orders/admin/')
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN,
        )

    def test_regular_user_gets_403(self):
        self.client.force_authenticate(user=self.regular)
        response = self.client.get('/api/orders/admin/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_user_gets_200(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/orders/admin/')
        assert response.status_code == status.HTTP_200_OK


from students.models import Student
from store.models import Purchasable
from orders.models import OrderItem


class AdminOrderViewSetListRetrieveTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='adm', email='a@x.com', password='p', is_staff=True,
        )
        self.client.force_authenticate(user=self.admin)
        self.user_a = User.objects.create_user(
            username='ua', email='ua@x.com', first_name='Alice', last_name='A',
        )
        self.user_b = User.objects.create_user(
            username='ub', email='ub@x.com', first_name='Bob', last_name='B',
        )
        Student.objects.create(user=self.user_a)
        Student.objects.create(user=self.user_b)
        self.order_a = Order.objects.create(user=self.user_a, total_amount=Decimal('10'))
        self.order_b = Order.objects.create(user=self.user_b, total_amount=Decimal('20'))
        p = Purchasable.objects.create(code='CM1/CC/26', name='CM1', kind='product')
        OrderItem.objects.create(order=self.order_a, purchasable=p, quantity=1, gross_amount=Decimal('10'))

    def test_list_returns_orders_across_users(self):
        response = self.client.get('/api/orders/admin/')
        assert response.status_code == 200
        ids = [r['id'] for r in response.data['results']]
        assert self.order_a.id in ids
        assert self.order_b.id in ids

    def test_list_payload_shape(self):
        response = self.client.get('/api/orders/admin/')
        first = response.data['results'][0]
        assert {'id', 'created_at', 'total_amount', 'student', 'item_codes', 'item_count'} <= set(first.keys())

    def test_retrieve_returns_full_detail_payload(self):
        response = self.client.get(f'/api/orders/admin/{self.order_a.id}/')
        assert response.status_code == 200
        keys = set(response.data.keys())
        for required in ('items', 'payments', 'user_contact',
                         'user_preferences', 'user_acknowledgments', 'student'):
            assert required in keys, f"missing {required}"
