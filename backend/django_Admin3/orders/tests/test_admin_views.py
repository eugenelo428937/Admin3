from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.test.utils import CaptureQueriesContext
from django.db import connection

from orders.models import Order, OrderItem
from students.models import Student
from store.models import Purchasable

User = get_user_model()


class AdminOrderViewSetPermissionTest(APITestCase):
    def setUp(self):
        self.regular = User.objects.create_user(username='reg', email='r@x.com', password='p')
        self.staff_only = User.objects.create_user(
            username='staff', email='s@x.com', password='p',
            is_staff=True, is_superuser=False,
        )
        self.admin = User.objects.create_superuser(
            username='adm', email='a@x.com', password='p',
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

    def test_staff_only_user_gets_403(self):
        # Project standard: admin endpoints require is_superuser, not just is_staff.
        self.client.force_authenticate(user=self.staff_only)
        response = self.client.get('/api/orders/admin/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_admin_user_gets_200(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/orders/admin/')
        assert response.status_code == status.HTTP_200_OK


class AdminOrderViewSetListRetrieveTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='adm', email='a@x.com', password='p',
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


class AdminOrderViewSetFilterTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='adm', email='a@x.com', password='p',
        )
        self.client.force_authenticate(user=self.admin)

        self.alice = User.objects.create_user(
            username='alice', email='alice@example.com',
            first_name='Alice', last_name='Anderson',
        )
        self.bob = User.objects.create_user(
            username='bob', email='bob@other.com',
            first_name='Bob', last_name='Brown',
        )
        self.s_alice = Student.objects.create(user=self.alice)
        self.s_bob = Student.objects.create(user=self.bob)

        self.order_alice = Order.objects.create(user=self.alice, total_amount=Decimal('10'))
        self.order_bob = Order.objects.create(user=self.bob, total_amount=Decimal('20'))

        p1 = Purchasable.objects.create(code='CM1/CC/26', name='CM1', kind='product')
        p2 = Purchasable.objects.create(code='CP2/CPBOR/26', name='CP2', kind='product')
        OrderItem.objects.create(order=self.order_alice, purchasable=p1, quantity=1, gross_amount=Decimal('10'))
        OrderItem.objects.create(order=self.order_alice, purchasable=p2, quantity=1, gross_amount=Decimal('5'))
        OrderItem.objects.create(order=self.order_bob, purchasable=p2, quantity=1, gross_amount=Decimal('20'))

    def _ids(self, response):
        return {r['id'] for r in response.data['results']}

    def test_filter_by_student_ref(self):
        response = self.client.get('/api/orders/admin/', {'student_ref': self.s_alice.student_ref})
        assert self._ids(response) == {self.order_alice.id}

    def test_filter_by_name_matches_first_or_last_case_insensitive(self):
        response = self.client.get('/api/orders/admin/', {'name': 'ali'})
        assert self._ids(response) == {self.order_alice.id}
        response = self.client.get('/api/orders/admin/', {'name': 'BROWN'})
        assert self._ids(response) == {self.order_bob.id}

    def test_filter_by_email_substring(self):
        response = self.client.get('/api/orders/admin/', {'email': 'other.com'})
        assert self._ids(response) == {self.order_bob.id}

    def test_filter_by_order_no_exact(self):
        response = self.client.get('/api/orders/admin/', {'order_no': self.order_alice.id})
        assert self._ids(response) == {self.order_alice.id}

    def test_filter_by_product_code_distinct(self):
        response = self.client.get('/api/orders/admin/', {'product_code': 'CP2/CPBOR/26'})
        assert self._ids(response) == {self.order_alice.id, self.order_bob.id}
        # Ensure no duplicate rows from the join
        assert len(response.data['results']) == 2

    def test_filter_by_date_range(self):
        Order.objects.filter(pk=self.order_alice.pk).update(
            created_at=timezone.now() - timedelta(days=10)
        )
        Order.objects.filter(pk=self.order_bob.pk).update(
            created_at=timezone.now()
        )
        today = timezone.now().date().isoformat()
        response = self.client.get('/api/orders/admin/', {'date_from': today})
        assert self._ids(response) == {self.order_bob.id}

    def test_filters_compose_with_AND(self):
        response = self.client.get('/api/orders/admin/', {
            'name': 'alice', 'product_code': 'CM1/CC/26',
        })
        assert self._ids(response) == {self.order_alice.id}

    def test_invalid_numeric_filter_returns_empty(self):
        response = self.client.get('/api/orders/admin/', {'order_no': 'not-a-number'})
        assert response.status_code == 200
        assert response.data['results'] == []

    def test_ordering_whitelist_accepts_known_fields(self):
        response = self.client.get('/api/orders/admin/', {'ordering': 'created_at'})
        assert response.status_code == 200

    def test_ordering_unknown_field_ignored(self):
        # No 500 error on unknown ordering field
        response = self.client.get('/api/orders/admin/', {'ordering': 'evil__field'})
        assert response.status_code == 200


class AdminOrderViewSetQueryCountTest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='adm', email='a@x.com', password='p',
        )
        self.client.force_authenticate(user=self.admin)
        # Create 5 orders, 2 items each, to expose N+1 issues
        for i in range(5):
            u = User.objects.create_user(
                username=f'u{i}', email=f'u{i}@x.com',
                first_name='F', last_name=f'L{i}',
            )
            Student.objects.create(user=u)
            o = Order.objects.create(user=u, total_amount=Decimal('1'))
            p1 = Purchasable.objects.create(code=f'CODE{i}A', name='A', kind='product')
            p2 = Purchasable.objects.create(code=f'CODE{i}B', name='B', kind='product')
            OrderItem.objects.create(order=o, purchasable=p1, quantity=1, gross_amount=Decimal('1'))
            OrderItem.objects.create(order=o, purchasable=p2, quantity=1, gross_amount=Decimal('1'))

    def test_list_query_count_is_bounded(self):
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get('/api/orders/admin/')
        assert response.status_code == 200
        # Bound: pagination COUNT + main + select_related joined + prefetches.
        # With 6 prefetch relations expect ~10. Cap at 15 as regression guard.
        assert len(ctx.captured_queries) <= 15, f"Query count {len(ctx.captured_queries)} exceeds bound"
