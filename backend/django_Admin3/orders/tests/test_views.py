from django.test import override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from decimal import Decimal
from unittest.mock import patch

from cart.models import Cart, CartItem
from orders.models import Order, OrderItem, Payment

User = get_user_model()


@override_settings(USE_DUMMY_PAYMENT_GATEWAY=True)
class CheckoutViewTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        self.cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(
            cart=self.cart,
            item_type='product',
            quantity=1,
            price_type='standard',
            actual_price=Decimal('100.00'),
        )

    @patch('orders.services.checkout_orchestrator.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_checkout_card_success(self, mock_vat, mock_rules):
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [],
            'region': 'UK',
        }

        response = self.client.post('/api/orders/checkout/', {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])
        self.assertIn('order', response.data)
        self.assertIn('payment', response.data)

    @patch('orders.services.checkout_orchestrator.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_checkout_invoice_success(self, mock_vat, mock_rules):
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '0.00', 'gross': '100.00'},
            'items': [],
            'region': 'ROW',
        }

        response = self.client.post('/api/orders/checkout/', {
            'payment_method': 'invoice',
            'employer_code': 'EMP001',
            'general_terms_accepted': True,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['success'])

    def test_checkout_empty_cart(self):
        self.cart.items.all().delete()

        response = self.client.post('/api/orders/checkout/', {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_checkout_missing_card_data(self):
        response = self.client.post('/api/orders/checkout/', {
            'payment_method': 'card',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_checkout_unauthenticated(self):
        self.client.force_authenticate(user=None)
        response = self.client.post('/api/orders/checkout/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class OrderViewSetTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser', email='other@example.com', password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

        # Create test orders
        self.order1 = Order.objects.create(
            user=self.user,
            subtotal=Decimal('100.00'),
            vat_amount=Decimal('20.00'),
            total_amount=Decimal('120.00'),
        )
        self.order2 = Order.objects.create(
            user=self.user,
            subtotal=Decimal('50.00'),
            vat_amount=Decimal('10.00'),
            total_amount=Decimal('60.00'),
        )
        # Another user's order (should not be visible)
        self.other_order = Order.objects.create(
            user=self.other_user,
            subtotal=Decimal('200.00'),
            vat_amount=Decimal('40.00'),
            total_amount=Decimal('240.00'),
        )

    def test_list_orders(self):
        response = self.client.get('/api/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_only_own_orders(self):
        response = self.client.get('/api/orders/')
        order_ids = [o['id'] for o in response.data]
        self.assertIn(self.order1.id, order_ids)
        self.assertIn(self.order2.id, order_ids)
        self.assertNotIn(self.other_order.id, order_ids)

    def test_retrieve_order_detail(self):
        OrderItem.objects.create(
            order=self.order1,
            item_type='product',
            quantity=2,
            actual_price=Decimal('50.00'),
            net_amount=Decimal('50.00'),
            vat_amount=Decimal('10.00'),
            gross_amount=Decimal('60.00'),
            vat_rate=Decimal('0.2000'),
        )
        Payment.objects.create(
            order=self.order1,
            payment_method='card',
            amount=Decimal('120.00'),
            status='completed',
        )

        response = self.client.get(f'/api/orders/{self.order1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('items', response.data)
        self.assertIn('payments', response.data)
        self.assertEqual(len(response.data['items']), 1)
        self.assertEqual(len(response.data['payments']), 1)

    def test_cannot_access_other_users_order(self):
        response = self.client.get(f'/api/orders/{self.other_order.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauthenticated_access_blocked(self):
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/orders/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
