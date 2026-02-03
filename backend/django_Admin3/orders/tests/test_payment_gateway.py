from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from decimal import Decimal
from unittest.mock import patch, MagicMock

from orders.models import Order, Payment
from orders.services.payment_gateway import (
    PaymentGateway, PaymentResult,
    DummyGateway, InvoiceGateway, OpayoGateway,
    get_payment_gateway,
)

User = get_user_model()


class PaymentResultTest(TestCase):
    def test_success_result(self):
        result = PaymentResult(success=True, payment_id=1, transaction_id='TX123', message='OK')
        self.assertTrue(result.success)
        self.assertEqual(result.payment_id, 1)
        self.assertEqual(result.transaction_id, 'TX123')

    def test_failure_result(self):
        result = PaymentResult(success=False, error_message='Declined', error_code='DECLINED')
        self.assertFalse(result.success)
        self.assertEqual(result.error_message, 'Declined')
        self.assertEqual(result.error_code, 'DECLINED')


class DummyGatewayTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )
        self.order = Order.objects.create(
            user=self.user,
            subtotal=Decimal('100.00'),
            vat_amount=Decimal('20.00'),
            total_amount=Decimal('120.00'),
        )
        self.gateway = DummyGateway()

    def test_approve_valid_card(self):
        result = self.gateway.process(
            self.order,
            {'card_number': '4111111111111111'},
            '127.0.0.1',
            'test-agent'
        )
        self.assertTrue(result.success)
        self.assertEqual(result.transaction_id, 'DUMMY123456')
        self.assertIsNotNone(result.payment_id)

        payment = Payment.objects.get(id=result.payment_id)
        self.assertEqual(payment.status, 'completed')
        self.assertEqual(payment.payment_method, 'card')
        self.assertEqual(payment.amount, Decimal('120.00'))

    def test_decline_card_ending_0002(self):
        result = self.gateway.process(
            self.order,
            {'card_number': '4111111111110002'},
            '127.0.0.1',
            'test-agent'
        )
        self.assertFalse(result.success)
        self.assertEqual(result.error_code, 'DECLINED')
        self.assertIsNotNone(result.payment_id)

        payment = Payment.objects.get(id=result.payment_id)
        self.assertEqual(payment.status, 'failed')

    def test_stores_client_ip_and_user_agent(self):
        result = self.gateway.process(
            self.order,
            {'card_number': '4111111111111111'},
            '192.168.1.1',
            'Mozilla/5.0'
        )
        payment = Payment.objects.get(id=result.payment_id)
        self.assertEqual(payment.client_ip, '192.168.1.1')
        self.assertEqual(payment.user_agent, 'Mozilla/5.0')


class InvoiceGatewayTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )
        self.order = Order.objects.create(
            user=self.user,
            subtotal=Decimal('100.00'),
            vat_amount=Decimal('20.00'),
            total_amount=Decimal('120.00'),
        )
        self.gateway = InvoiceGateway()

    def test_creates_pending_payment(self):
        result = self.gateway.process(
            self.order, {}, '127.0.0.1', 'test-agent'
        )
        self.assertTrue(result.success)
        self.assertIsNotNone(result.payment_id)

        payment = Payment.objects.get(id=result.payment_id)
        self.assertEqual(payment.status, 'pending')
        self.assertEqual(payment.payment_method, 'invoice')
        self.assertEqual(payment.amount, Decimal('120.00'))

    def test_always_succeeds(self):
        # Invoice payment always succeeds (no immediate charge)
        for _ in range(3):
            result = self.gateway.process(
                self.order, {}, '127.0.0.1', 'test-agent'
            )
            self.assertTrue(result.success)


class OpayoGatewayTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )
        self.order = Order.objects.create(
            user=self.user,
            subtotal=Decimal('100.00'),
            vat_amount=Decimal('20.00'),
            total_amount=Decimal('120.00'),
        )
        self.gateway = OpayoGateway()

    @patch('orders.services.payment_gateway.requests.post')
    def test_successful_payment(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'statusCode': '0000',
            'statusDetail': 'OK',
            'transactionId': 'OPAYO-TX-123',
        }
        mock_post.return_value = mock_response

        result = self.gateway.process(
            self.order,
            {'email': 'test@example.com', 'billing_address': {}},
            '127.0.0.1',
            'test-agent'
        )
        self.assertTrue(result.success)
        self.assertEqual(result.transaction_id, 'OPAYO-TX-123')

    @patch('orders.services.payment_gateway.requests.post')
    def test_failed_payment(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'statusCode': '2000',
            'statusDetail': 'Card authentication failed',
        }
        mock_post.return_value = mock_response

        result = self.gateway.process(
            self.order,
            {'email': 'test@example.com'},
            '127.0.0.1',
            'test-agent'
        )
        self.assertFalse(result.success)
        self.assertEqual(result.error_code, '2000')

    @patch('orders.services.payment_gateway.requests.post')
    def test_network_exception(self, mock_post):
        mock_post.side_effect = Exception("Connection timeout")

        result = self.gateway.process(
            self.order,
            {'email': 'test@example.com'},
            '127.0.0.1',
            'test-agent'
        )
        self.assertFalse(result.success)
        self.assertEqual(result.error_code, 'EXCEPTION')


class GetPaymentGatewayTest(TestCase):
    def test_invoice_returns_invoice_gateway(self):
        gateway = get_payment_gateway('invoice')
        self.assertIsInstance(gateway, InvoiceGateway)

    @override_settings(USE_DUMMY_PAYMENT_GATEWAY=True)
    def test_dummy_mode_returns_dummy_gateway(self):
        gateway = get_payment_gateway('card')
        self.assertIsInstance(gateway, DummyGateway)

    @override_settings(USE_DUMMY_PAYMENT_GATEWAY=False)
    def test_production_returns_opayo_gateway(self):
        gateway = get_payment_gateway('card')
        self.assertIsInstance(gateway, OpayoGateway)
