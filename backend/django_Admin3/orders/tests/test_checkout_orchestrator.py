from django.test import TestCase, RequestFactory, override_settings
from django.contrib.auth import get_user_model
from django.contrib.sessions.backends.db import SessionStore
from django.utils import timezone
from decimal import Decimal
from unittest.mock import patch, MagicMock

from cart.models import Cart, CartItem
from orders.models import Order, Payment, OrderAcknowledgment
from catalog.models import (
    Subject, ExamSession, ExamSessionSubject,
    Product as CatalogProduct, ProductVariation, ProductProductVariation
)
from store.models import Product as StoreProduct
from orders.services.checkout_orchestrator import (
    CheckoutOrchestrator,
    CheckoutValidationError,
    CheckoutBlockedError,
    PaymentFailedError,
)

User = get_user_model()


@override_settings(USE_DUMMY_PAYMENT_GATEWAY=True)
class CheckoutOrchestratorTest(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='testpass123'
        )
        # Create store product fixture for check constraint
        subject = Subject.objects.create(code='CM2')
        exam_session = ExamSession.objects.create(
            session_code='2025-04',
            start_date=timezone.now(), end_date=timezone.now()
        )
        ess = ExamSessionSubject.objects.create(exam_session=exam_session, subject=subject)
        cat_product = CatalogProduct.objects.create(fullname='Test Product', shortname='TP', code='TP01')
        variation = ProductVariation.objects.create(variation_type='eBook', name='Standard eBook')
        ppv = ProductProductVariation.objects.create(product=cat_product, product_variation=variation)
        self.store_product = StoreProduct.objects.create(
            exam_session_subject=ess, product_product_variation=ppv
        )
        self.cart = Cart.objects.create(user=self.user)
        self.cart_item = CartItem.objects.create(
            cart=self.cart,
            product=self.store_product,
            item_type='product',
            quantity=1,
            price_type='standard',
            actual_price=Decimal('100.00'),
        )

    def _make_request(self, data=None):
        request = self.factory.post('/api/orders/checkout/', data or {})
        request.user = self.user
        request.session = SessionStore()
        request.META['REMOTE_ADDR'] = '127.0.0.1'
        request.META['HTTP_USER_AGENT'] = 'test-agent'
        return request

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_successful_card_checkout(self, mock_vat, mock_rules):
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [{'id': str(self.cart_item.id), 'vat_amount': '20.00'}],
            'region': 'UK',
        }

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
        }
        request = self._make_request(request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()

        self.assertTrue(result['success'])
        self.assertIn('order', result)
        self.assertEqual(result['order'].total_amount, Decimal('120.00'))
        self.assertTrue(result['payment_result'].success)

        # Cart should be cleared
        self.assertEqual(self.cart.items.count(), 0)

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_successful_invoice_checkout(self, mock_vat, mock_rules):
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [],
            'region': 'UK',
        }

        request_data = {
            'payment_method': 'invoice',
            'employer_code': 'EMP001',
            'general_terms_accepted': True,
        }
        request = self._make_request(request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()

        self.assertTrue(result['success'])
        payment = Payment.objects.get(order=result['order'])
        self.assertEqual(payment.status, 'pending')
        self.assertEqual(payment.payment_method, 'invoice')

    def test_empty_cart_raises_validation_error(self):
        self.cart.items.all().delete()

        request_data = {'payment_method': 'card', 'card_data': {'card_number': '4111'}}
        request = self._make_request(request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        with self.assertRaises(CheckoutValidationError):
            orchestrator.execute()

    def test_card_without_card_data_raises_validation_error(self):
        request_data = {'payment_method': 'card'}
        request = self._make_request(request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        with self.assertRaises(CheckoutValidationError):
            orchestrator.execute()

    def test_invoice_without_employer_code_raises_validation_error(self):
        request_data = {'payment_method': 'invoice'}
        request = self._make_request(request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        with self.assertRaises(CheckoutValidationError):
            orchestrator.execute()

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_payment_failure_deletes_order(self, mock_vat, mock_rules):
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [],
            'region': 'UK',
        }

        # Card ending 0002 triggers decline in DummyGateway
        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111110002'},
            'general_terms_accepted': True,
        }
        request = self._make_request(request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        with self.assertRaises(PaymentFailedError):
            orchestrator.execute()

        # Order should not exist after payment failure
        self.assertEqual(Order.objects.filter(user=self.user).count(), 0)

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_saves_acknowledgments(self, mock_vat, mock_rules):
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '0.00', 'gross': '100.00'},
            'items': [],
            'region': 'ROW',
        }

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
        }
        request = self._make_request(request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()

        acks = OrderAcknowledgment.objects.filter(order=result['order'])
        self.assertEqual(acks.count(), 1)
        self.assertTrue(acks.first().is_accepted)

    @patch('rules_engine.services.rule_engine.rule_engine')
    def test_blocked_rules_raise_error(self, mock_rules):
        mock_rules.execute.return_value = {
            'blocked': True,
            'required_acknowledgments': [{'ack_key': 'terms_v1', 'title': 'T&Cs'}],
        }

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
        }
        request = self._make_request(request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        with self.assertRaises(CheckoutBlockedError) as ctx:
            orchestrator.execute()

        self.assertEqual(len(ctx.exception.required_acknowledgments), 1)
