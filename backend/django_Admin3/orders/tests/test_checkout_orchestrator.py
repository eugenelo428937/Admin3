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
from store.models import Product as StoreProduct, MaterialProduct as StoreMaterialProduct
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
        self.store_product = StoreMaterialProduct.objects.create(
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


class CheckoutWithTutorialAndFeeTests(TestCase):
    """Reproduces the original 500: tutorial cart + tutorial booking
    fee → checkout creates Order with TutorialChoice rows and a fee
    OrderItem pointing at FEE_GENERIC."""

    def test_checkout_persists_tutorial_choices_and_fee_line(self):
        from datetime import date, timedelta
        from decimal import Decimal
        from django.contrib.auth.models import User
        from django.utils import timezone
        from cart.models import Cart, CartFee
        from cart.services.cart_service import cart_service
        from catalog.models import (
            ExamSession, ExamSessionSubject, Subject,
            Product as CatProduct, ProductVariation,
            ProductProductVariation,
        )
        from store.models import Product as StoreProduct, Purchasable, TutorialProduct
        from students.models import Student
        from tutorials.models import TutorialEvents, TutorialChoice

        # Ensure FEE_GENERIC seed exists (Task 1 migration normally
        # ensures this — defensive for SQLite test DB which skips
        # migrations).
        Purchasable.objects.update_or_create(
            code='FEE_GENERIC',
            defaults={'kind': 'additional_charge',
                      'name': 'Generic Fee',
                      'description': 'Catch-all',
                      'is_active': True,
                      'dynamic_pricing': True,
                      'vat_classification': ''})

        user = User.objects.create_user(username='e2e', email='e@t.com')
        Student.objects.create(user=user)
        cart = Cart.objects.create(user=user)

        # All upstream is_active flags must be True and the exam-session
        # window must include "now" for the cart-add availability gate to
        # accept the product (see Purchasable.objects.available_now()).
        now = timezone.now()
        es = ExamSession.objects.create(
            session_code='25',
            start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=60),
            is_active=True)
        subj, _ = Subject.objects.get_or_create(
            code='CP1',
            defaults={'description': 'CP1', 'active': True})
        ess = ExamSessionSubject.objects.create(
            exam_session=es, subject=subj, is_active=True)
        cat, _ = CatProduct.objects.get_or_create(
            code='Live',
            defaults={'fullname': 'T - Live', 'shortname': 'Live',
                      'is_active': True})
        pv, _ = ProductVariation.objects.get_or_create(
            code='LO_6H',
            defaults={'name': 'LO_6H', 'description': '',
                      'description_short': 'LO_6H',
                      'variation_type': 'Tutorial',
                      'is_active': True})
        ppv, _ = ProductProductVariation.objects.get_or_create(
            product=cat, product_variation=pv,
            defaults={'is_active': True})
        sp = TutorialProduct(
            exam_session_subject=ess,
            product_code='CP1/Live/LO_6H/25',
            format='LO_6H')
        sp.save()
        event = TutorialEvents.objects.create(
            code='CP1-01-25A', store_product=sp,
            lms_start_date=date(2025, 1, 1), lms_end_date=date(2025, 2, 1))

        # Add tutorial via the cart service (relational path).
        item, err = cart_service.add_item(
            cart, sp.id, quantity=1, actual_price='10.00',
            metadata={'type': 'tutorial', 'subjectCode': 'CP1',
                      'newLocation': {'location': 'London',
                                      'choices': [{'choice': '1st',
                                                   'eventId': event.id,
                                                   'variationId':
                                                   ppv.id}],
                                      'choiceCount': 1}})
        self.assertIsNone(err)

        CartFee.objects.create(
            cart=cart, fee_type='tutorial_booking_fee',
            name='Tutorial Booking Fee', amount=Decimal('1.00'))

        # Run the orchestrator's build step directly (skip payment).
        from orders.services.order_builder import OrderBuilder
        builder = OrderBuilder(
            cart=cart, user=user,
            vat_result={'totals': {'net': '11.00', 'vat': '0.00',
                                   'gross': '11.00'},
                        'items': [], 'region': 'GB'})
        order = builder.build()

        # Order has 2 items: the tutorial product line + the fee line.
        self.assertEqual(order.items.count(), 2)
        self.assertEqual(
            TutorialChoice.objects.filter(
                order_item__order=order).count(), 1)
        # Fee row is non-null on purchasable now
        fee_item = order.items.filter(
            purchasable__code='FEE_GENERIC').first()
        self.assertIsNotNone(fee_item)
