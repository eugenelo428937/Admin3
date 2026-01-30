"""
Comprehensive service tests to increase orders app coverage from 89% to 98%.

Covers missed lines in:
- orders/services/checkout_orchestrator.py (79% -> target ~98%)
- orders/services/order_notification.py (79% -> target ~98%)
- orders/views.py (83% -> target ~98%)
"""
from django.test import TestCase, RequestFactory, override_settings
from django.contrib.auth import get_user_model
from django.contrib.sessions.backends.db import SessionStore
from django.utils import timezone
from decimal import Decimal
from unittest.mock import patch, MagicMock, PropertyMock

from cart.models import Cart, CartItem, CartFee
from orders.models import (
    Order, OrderItem, Payment,
    OrderAcknowledgment, OrderPreference, OrderContact, OrderDelivery,
)
from catalog.models import (
    Subject, ExamSession, ExamSessionSubject,
    Product as CatalogProduct, ProductVariation, ProductProductVariation,
)
from store.models import Product as StoreProduct
from orders.services.checkout_orchestrator import (
    CheckoutOrchestrator,
    CheckoutValidationError,
    CheckoutBlockedError,
    PaymentFailedError,
)

User = get_user_model()


class ORDServiceTestMixin:
    """Shared setup for service coverage tests."""

    def _create_user(self, username='ord_svc_user'):
        return User.objects.create_user(
            username=username,
            email=f'{username}@example.com',
            password='ord_testpass123',
            first_name='ORD_First',
            last_name='ORD_Last',
        )

    def _create_store_product(self, subject_code='ORD_SVC', session_code='ORD-SVC-2025'):
        subject = Subject.objects.create(code=subject_code)
        exam_session = ExamSession.objects.create(
            session_code=session_code,
            start_date=timezone.now(),
            end_date=timezone.now(),
        )
        ess = ExamSessionSubject.objects.create(
            exam_session=exam_session, subject=subject
        )
        cat_product = CatalogProduct.objects.create(
            fullname='ORD SVC Product', shortname='OSVP', code='OSVP01'
        )
        variation = ProductVariation.objects.create(
            variation_type='eBook', name='ORD SVC eBook'
        )
        ppv = ProductProductVariation.objects.create(
            product=cat_product, product_variation=variation
        )
        return StoreProduct.objects.create(
            exam_session_subject=ess, product_product_variation=ppv
        )

    def _create_cart_with_item(self, user, store_product, price=Decimal('100.00')):
        cart = Cart.objects.create(user=user)
        CartItem.objects.create(
            cart=cart,
            product=store_product,
            item_type='product',
            quantity=1,
            price_type='standard',
            actual_price=price,
        )
        return cart

    def _make_request(self, user, data=None):
        factory = RequestFactory()
        request = factory.post('/api/orders/checkout/', data or {})
        request.user = user
        request.session = SessionStore()
        request.META['REMOTE_ADDR'] = '127.0.0.1'
        request.META['HTTP_USER_AGENT'] = 'ord-test-agent'
        return request


# =============================================================================
# CheckoutOrchestrator - Additional coverage tests
# =============================================================================
@override_settings(USE_DUMMY_PAYMENT_GATEWAY=True)
class CheckoutOrchestratorCoverageTest(ORDServiceTestMixin, TestCase):
    """Additional tests for CheckoutOrchestrator missed lines."""

    def setUp(self):
        self.user = self._create_user('ord_orch_user')
        self.store_product = self._create_store_product(
            subject_code='ORD_OCH', session_code='ORD-OCH-2025'
        )
        self.cart = self._create_cart_with_item(self.user, self.store_product)

    # ---- _save_preferences tests ----

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_save_preferences_dict_value(self, mock_vat, mock_rules):
        """Preferences with dict values are saved directly (not wrapped)."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
            'user_preferences': {
                'ord_delivery_pref': {'option': 'express', 'notes': 'urgent'},
            },
        }
        request = self._make_request(self.user, request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()

        prefs = OrderPreference.objects.filter(order=result['order'])
        self.assertEqual(prefs.count(), 1)
        pref = prefs.first()
        self.assertEqual(pref.preference_key, 'ord_delivery_pref')
        self.assertEqual(pref.preference_value, {'option': 'express', 'notes': 'urgent'})

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_save_preferences_non_dict_value(self, mock_vat, mock_rules):
        """Preferences with non-dict values are wrapped in {'value': ...}."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
            'user_preferences': {
                'ord_simple_pref': 'yes_please',
            },
        }
        request = self._make_request(self.user, request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()

        prefs = OrderPreference.objects.filter(order=result['order'])
        self.assertEqual(prefs.count(), 1)
        pref = prefs.first()
        self.assertEqual(pref.preference_value, {'value': 'yes_please'})

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_save_preferences_empty_skipped(self, mock_vat, mock_rules):
        """Empty user_preferences dict causes early return (no prefs saved)."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
            'user_preferences': {},
        }
        request = self._make_request(self.user, request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()

        prefs = OrderPreference.objects.filter(order=result['order'])
        self.assertEqual(prefs.count(), 0)

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_save_preferences_no_key_in_request(self, mock_vat, mock_rules):
        """No user_preferences key in request_data causes early return."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
        }
        request = self._make_request(self.user, request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()

        prefs = OrderPreference.objects.filter(order=result['order'])
        self.assertEqual(prefs.count(), 0)

    # ---- _save_contact_and_delivery tests ----

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_save_contact_info(self, mock_vat, mock_rules):
        """Contact data is saved as OrderContact."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
            'contact': {
                'mobile_phone': '+447999888777',
                'mobile_phone_country': 'GB',
                'home_phone': '+441111222333',
                'home_phone_country': 'GB',
                'work_phone': '+441444555666',
                'work_phone_country': 'GB',
                'email': 'ord_contact@example.com',
            },
        }
        request = self._make_request(self.user, request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()

        contacts = OrderContact.objects.filter(order=result['order'])
        self.assertEqual(contacts.count(), 1)
        contact = contacts.first()
        self.assertEqual(contact.mobile_phone, '+447999888777')
        self.assertEqual(contact.email_address, 'ord_contact@example.com')

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_save_contact_uses_user_email_as_default(self, mock_vat, mock_rules):
        """When contact email is not provided, uses user.email as fallback."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
            'contact': {
                'mobile_phone': '+447000000000',
            },
        }
        request = self._make_request(self.user, request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()

        contact = OrderContact.objects.get(order=result['order'])
        self.assertEqual(contact.email_address, self.user.email)

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_save_delivery_info(self, mock_vat, mock_rules):
        """Delivery data is saved as OrderDelivery."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
            'delivery': {
                'delivery_address_type': 'home',
                'invoice_address_type': 'work',
                'delivery_address_data': {
                    'line1': '123 ORD Test Street',
                    'city': 'London',
                    'postcode': 'SW1A 1AA',
                },
                'invoice_address_data': {
                    'line1': '456 ORD Invoice Road',
                    'city': 'Manchester',
                },
            },
        }
        request = self._make_request(self.user, request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()

        deliveries = OrderDelivery.objects.filter(order=result['order'])
        self.assertEqual(deliveries.count(), 1)
        delivery = deliveries.first()
        self.assertEqual(delivery.delivery_address_type, 'home')
        self.assertEqual(delivery.invoice_address_type, 'work')
        self.assertEqual(delivery.delivery_address_data['city'], 'London')

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_no_contact_or_delivery_skips_creation(self, mock_vat, mock_rules):
        """When neither contact nor delivery data provided, no records created."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
        }
        request = self._make_request(self.user, request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()

        self.assertEqual(OrderContact.objects.filter(order=result['order']).count(), 0)
        self.assertEqual(OrderDelivery.objects.filter(order=result['order']).count(), 0)

    # ---- _get_client_ip tests ----

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_get_client_ip_from_x_forwarded_for(self, mock_vat, mock_rules):
        """_get_client_ip returns first IP from X-Forwarded-For header."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
        }
        request = self._make_request(self.user, request_data)
        request.META['HTTP_X_FORWARDED_FOR'] = '203.0.113.50, 70.41.3.18, 150.172.238.178'

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()

        # Verify the acknowledgment IP is from X-Forwarded-For
        ack = OrderAcknowledgment.objects.filter(order=result['order']).first()
        self.assertEqual(ack.ip_address, '203.0.113.50')

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_get_client_ip_fallback_to_remote_addr(self, mock_vat, mock_rules):
        """_get_client_ip falls back to REMOTE_ADDR when no X-Forwarded-For."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
        }
        request = self._make_request(self.user, request_data)
        # REMOTE_ADDR is already set to 127.0.0.1 in _make_request

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()

        ack = OrderAcknowledgment.objects.filter(order=result['order']).first()
        self.assertEqual(ack.ip_address, '127.0.0.1')

    # ---- _get_session_acknowledgments tests ----

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_get_session_acknowledgments_with_data(self, mock_vat, mock_rules):
        """Session acknowledgments are parsed and passed to rule engine."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
        }
        request = self._make_request(self.user, request_data)
        request.session['user_acknowledgments'] = [
            {
                'ack_key': 'ord_terms_v1',
                'acknowledged': True,
                'message_id': 'msg_1',
                'acknowledged_timestamp': '2025-01-01T00:00:00Z',
            },
            {
                'ack_key': 'ord_privacy_v1',
                'acknowledged': False,
                'message_id': 'msg_2',
                'acknowledged_timestamp': None,
            },
            {
                # Missing ack_key should be skipped
                'acknowledged': True,
            },
        ]

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()

        # Verify the rules engine was called with acknowledgments
        mock_rules.execute.assert_called_once()
        call_context = mock_rules.execute.call_args[0][1]
        self.assertIn('acknowledgments', call_context)
        acks = call_context['acknowledgments']
        self.assertIn('ord_terms_v1', acks)
        self.assertTrue(acks['ord_terms_v1']['acknowledged'])
        self.assertIn('ord_privacy_v1', acks)
        self.assertFalse(acks['ord_privacy_v1']['acknowledged'])
        # The entry without ack_key should not be included
        self.assertEqual(len(acks), 2)

    # ---- _calculate_vat fallback test ----

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_vat_calculation_failure_uses_fallback(self, mock_vat, mock_rules):
        """When VAT calculation fails, fallback values are used."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.side_effect = Exception("ORD VAT service unavailable")

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
        }
        request = self._make_request(self.user, request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()

        # Order should be created with fallback values
        order = result['order']
        self.assertEqual(order.subtotal, Decimal('0.00'))
        self.assertEqual(order.vat_amount, Decimal('0.00'))

    # ---- _save_acknowledgments with nested terms_acceptance ----

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_save_acknowledgments_nested_terms_acceptance(self, mock_vat, mock_rules):
        """Acknowledgments fall back to nested terms_acceptance dict."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'terms_acceptance': {
                'general_terms_accepted': True,
            },
        }
        request = self._make_request(self.user, request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()

        acks = OrderAcknowledgment.objects.filter(order=result['order'])
        self.assertEqual(acks.count(), 1)
        self.assertTrue(acks.first().is_accepted)

    # ---- _send_notification exception handling ----

    @patch('orders.services.order_notification.send_order_confirmation')
    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_notification_failure_does_not_break_checkout(self, mock_vat, mock_rules, mock_notify):
        """Notification failure is logged but doesn't break checkout."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }
        mock_notify.side_effect = Exception("ORD Email service down")

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
        }
        request = self._make_request(self.user, request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()
        self.assertTrue(result['success'])

    # ---- _save_acknowledgments exception handling ----

    @patch('orders.models.OrderAcknowledgment.objects')
    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_save_acknowledgments_exception_logged(self, mock_vat, mock_rules, mock_ack_objects):
        """Acknowledgment save failure is logged but doesn't break checkout."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }
        mock_ack_objects.create.side_effect = Exception("ORD DB error")

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
        }
        request = self._make_request(self.user, request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()
        self.assertTrue(result['success'])

    # ---- _save_preferences exception handling ----

    @patch('orders.models.OrderPreference.objects')
    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_save_preferences_exception_logged(self, mock_vat, mock_rules, mock_pref_objects):
        """Preference save failure is logged but doesn't break checkout."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }
        mock_pref_objects.create.side_effect = Exception("ORD Preference DB error")

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
            'user_preferences': {'ord_some_pref': 'value'},
        }
        request = self._make_request(self.user, request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()
        self.assertTrue(result['success'])

    # ---- _save_contact_and_delivery exception handling ----

    @patch('orders.models.OrderContact.objects')
    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_save_contact_exception_logged(self, mock_vat, mock_rules, mock_contact_objects):
        """Contact save failure is logged but doesn't break checkout."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }
        mock_contact_objects.create.side_effect = Exception("ORD Contact DB error")

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
            'contact': {'mobile_phone': '+447000000000'},
        }
        request = self._make_request(self.user, request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()
        self.assertTrue(result['success'])

    @patch('orders.models.OrderDelivery.objects')
    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_save_delivery_exception_logged(self, mock_vat, mock_rules, mock_delivery_objects):
        """Delivery save failure is logged but doesn't break checkout."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }
        mock_delivery_objects.create.side_effect = Exception("ORD Delivery DB error")

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
            'delivery': {
                'delivery_address_type': 'home',
                'delivery_address_data': {'city': 'London'},
            },
        }
        request = self._make_request(self.user, request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()
        self.assertTrue(result['success'])

    # ---- _check_blocking_rules exception handling (non-blocked) ----

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_blocking_rules_general_exception_proceeds(self, mock_vat, mock_rules):
        """General exceptions in _check_blocking_rules are logged but proceed."""
        mock_rules.execute.side_effect = Exception("ORD Rule engine unavailable")
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
        }
        request = self._make_request(self.user, request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        # Should not raise, should proceed
        result = orchestrator.execute()
        self.assertTrue(result['success'])

    # ---- _clear_cart with fees ----

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_clear_cart_removes_items_and_fees(self, mock_vat, mock_rules):
        """_clear_cart deletes all cart items and fees."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }

        CartFee.objects.create(
            cart=self.cart, fee_type='booking', name='ORD Booking Fee',
            amount=Decimal('10.00'), currency='GBP',
        )

        request_data = {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
            'general_terms_accepted': True,
        }
        request = self._make_request(self.user, request_data)

        orchestrator = CheckoutOrchestrator(
            cart=self.cart, user=self.user,
            request_data=request_data, request=request,
        )
        result = orchestrator.execute()

        self.assertEqual(self.cart.items.count(), 0)
        self.assertEqual(self.cart.fees.count(), 0)


# =============================================================================
# Exception classes tests
# =============================================================================
class CheckoutExceptionClassesTest(TestCase):
    """Test exception classes for full coverage."""

    def test_checkout_validation_error(self):
        error = CheckoutValidationError("ORD Cart is empty")
        self.assertEqual(str(error), "ORD Cart is empty")

    def test_checkout_blocked_error_with_acknowledgments(self):
        acks = [{'ack_key': 'ord_terms', 'title': 'ORD T&Cs'}]
        error = CheckoutBlockedError("ORD Blocked", required_acknowledgments=acks)
        self.assertEqual(str(error), "ORD Blocked")
        self.assertEqual(error.required_acknowledgments, acks)

    def test_checkout_blocked_error_without_acknowledgments(self):
        error = CheckoutBlockedError("ORD Blocked no acks")
        self.assertEqual(error.required_acknowledgments, [])

    def test_payment_failed_error_with_code(self):
        error = PaymentFailedError("ORD Card declined", error_code='DECLINED')
        self.assertEqual(str(error), "ORD Card declined")
        self.assertEqual(error.error_code, 'DECLINED')

    def test_payment_failed_error_default_code(self):
        error = PaymentFailedError("ORD Payment failed")
        self.assertEqual(error.error_code, 'PAYMENT_FAILED')


# =============================================================================
# Order Notification tests
# =============================================================================
class OrderNotificationCoverageTest(ORDServiceTestMixin, TestCase):
    """Tests for orders/services/order_notification.py missed lines."""

    def setUp(self):
        self.user = self._create_user('ord_notify_user')
        self.store_product = self._create_store_product(
            subject_code='ORD_NOT', session_code='ORD-NOT-2025'
        )
        self.order = Order.objects.create(
            user=self.user,
            subtotal=Decimal('100.00'),
            vat_amount=Decimal('20.00'),
            total_amount=Decimal('120.00'),
        )

    def test_send_order_confirmation_success(self):
        """Successful email sending."""
        from orders.services.order_notification import send_order_confirmation

        # Create order item with a product
        OrderItem.objects.create(
            order=self.order,
            product=self.store_product,
            item_type='product',
            quantity=2,
            actual_price=Decimal('50.00'),
            price_type='standard',
            metadata={},
        )

        mock_email_svc = MagicMock()
        with patch('email_system.services.email_service.email_service', mock_email_svc):
            send_order_confirmation(self.order, self.user)

        mock_email_svc.send_order_confirmation.assert_called_once()
        call_kwargs = mock_email_svc.send_order_confirmation.call_args
        self.assertEqual(call_kwargs.kwargs['to_email'], self.user.email)

    @patch('orders.services.order_notification._get_user_country')
    @patch('orders.services.order_notification._build_order_email_data')
    def test_send_order_confirmation_exception_swallowed(self, mock_build, mock_country):
        """Email failure is swallowed (logged but not re-raised)."""
        from orders.services.order_notification import send_order_confirmation

        mock_country.return_value = 'GB'
        mock_build.side_effect = Exception("ORD Email build failed")

        # Should not raise
        send_order_confirmation(self.order, self.user)

    def test_get_user_country_with_profile(self):
        """_get_user_country returns country from user profile home address."""
        from orders.services.order_notification import _get_user_country
        from userprofile.models import UserProfile, UserProfileAddress

        profile = UserProfile.objects.create(user=self.user)
        UserProfileAddress.objects.create(
            user_profile=profile,
            address_type='HOME',
            country='Ireland',
            address_data={'city': 'Dublin'},
        )

        result = _get_user_country(self.user)
        self.assertEqual(result, 'Ireland')

    def test_get_user_country_no_home_address(self):
        """_get_user_country returns UK default when no home address."""
        from orders.services.order_notification import _get_user_country
        from userprofile.models import UserProfile, UserProfileAddress

        user2 = User.objects.create_user(
            username='ord_nohome_user', email='ord_nohome@example.com',
            password='testpass',
        )
        profile = UserProfile.objects.create(user=user2)
        # Create a WORK address but no HOME address
        UserProfileAddress.objects.create(
            user_profile=profile,
            address_type='WORK',
            country='France',
            address_data={'city': 'Paris'},
        )

        result = _get_user_country(user2)
        self.assertEqual(result, 'United Kingdom')

    def test_get_user_country_no_profile(self):
        """_get_user_country returns UK default when user has no profile."""
        from orders.services.order_notification import _get_user_country

        # No userprofile attribute - use a MagicMock that doesn't have userprofile
        user_without_profile = MagicMock(spec=[])
        result = _get_user_country(user_without_profile)
        self.assertEqual(result, 'United Kingdom')

    def test_get_user_country_exception(self):
        """_get_user_country returns UK default on exception."""
        from orders.services.order_notification import _get_user_country

        # Create a mock user where accessing userprofile.addresses.filter raises
        mock_user = MagicMock()
        mock_user.userprofile.addresses.filter.side_effect = Exception("ORD DB error")

        result = _get_user_country(mock_user)
        self.assertEqual(result, 'United Kingdom')

    def test_build_order_email_data_with_product_items(self):
        """_build_order_email_data builds correct structure for product items."""
        from orders.services.order_notification import _build_order_email_data

        OrderItem.objects.create(
            order=self.order,
            product=self.store_product,
            item_type='product',
            quantity=2,
            actual_price=Decimal('50.00'),
            price_type='standard',
            metadata={'note': 'ord_test'},
        )

        data = _build_order_email_data(self.order, self.user, 'GB')

        self.assertEqual(data['customer_name'], 'ORD_First ORD_Last')
        self.assertEqual(data['first_name'], 'ORD_First')
        self.assertEqual(data['total_amount'], 120.00)
        self.assertEqual(data['subtotal'], 100.00)
        self.assertEqual(data['vat_amount'], 20.00)
        self.assertEqual(len(data['items']), 1)
        self.assertEqual(data['items'][0]['quantity'], 2)
        self.assertEqual(data['items'][0]['actual_price'], 50.00)
        self.assertEqual(data['items'][0]['line_total'], 100.00)
        self.assertEqual(data['item_count'], 1)
        self.assertEqual(data['total_items'], 2)

    def test_build_order_email_data_fee_item(self):
        """_build_order_email_data handles fee items."""
        from orders.services.order_notification import _build_order_email_data

        OrderItem.objects.create(
            order=self.order,
            item_type='fee',
            quantity=1,
            actual_price=Decimal('25.00'),
            price_type='standard',
            metadata={'fee_name': 'ORD Booking Fee'},
        )

        data = _build_order_email_data(self.order, self.user, 'GB')

        self.assertEqual(len(data['items']), 1)
        self.assertEqual(data['items'][0]['name'], 'ORD Booking Fee')

    def test_build_order_email_data_generic_item(self):
        """_build_order_email_data handles items without product or fee type."""
        from orders.services.order_notification import _build_order_email_data

        # The DB check constraint prevents creating a product-type item without
        # a product FK. We mock an item that has product=None, item_type='marking_voucher'
        # to trigger the else branch (product is None and item_type != 'fee').
        mock_item = MagicMock()
        mock_item.product = None
        mock_item.item_type = 'marking_voucher'
        mock_item.quantity = 1
        mock_item.actual_price = None
        mock_item.price_type = 'standard'
        mock_item.metadata = {}

        with patch.object(self.order.items, 'all', return_value=[mock_item]):
            data = _build_order_email_data(self.order, self.user, 'GB')

        self.assertEqual(len(data['items']), 1)
        # No product and not fee: name should be 'Item'
        self.assertEqual(data['items'][0]['name'], 'Item')
        self.assertEqual(data['items'][0]['actual_price'], 0)
        self.assertEqual(data['items'][0]['line_total'], 0)

    def test_build_order_email_data_user_without_full_name(self):
        """_build_order_email_data falls back to username when no full name."""
        from orders.services.order_notification import _build_order_email_data

        user_no_name = User.objects.create_user(
            username='ord_noname_user',
            email='ord_noname@example.com',
            password='testpass',
        )
        order = Order.objects.create(
            user=user_no_name, subtotal=Decimal('50.00'),
            vat_amount=Decimal('10.00'), total_amount=Decimal('60.00'),
        )

        data = _build_order_email_data(order, user_no_name, 'GB')

        self.assertEqual(data['customer_name'], 'ord_noname_user')
        self.assertEqual(data['first_name'], 'ord_noname_user')


# =============================================================================
# Views coverage tests
# =============================================================================
from rest_framework.test import APITestCase
from rest_framework import status


@override_settings(USE_DUMMY_PAYMENT_GATEWAY=True)
class CheckoutViewCoverageTest(ORDServiceTestMixin, APITestCase):
    """Additional CheckoutView tests for missed branches."""

    def setUp(self):
        self.user = self._create_user('ord_view_user')
        self.client.force_authenticate(user=self.user)
        self.store_product = self._create_store_product(
            subject_code='ORD_VW', session_code='ORD-VW-2025'
        )
        self.cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(
            cart=self.cart,
            product=self.store_product,
            item_type='product',
            quantity=1,
            price_type='standard',
            actual_price=Decimal('100.00'),
        )

    def test_checkout_no_cart(self):
        """Checkout returns 400 when user has no cart."""
        self.cart.delete()
        response = self.client.post('/api/orders/checkout/', {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['detail'], 'No cart found.')

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_checkout_blocked_error_response(self, mock_vat, mock_rules):
        """Checkout returns 400 with blocked info when rules block checkout."""
        mock_rules.execute.return_value = {
            'blocked': True,
            'required_acknowledgments': [
                {'ack_key': 'ord_terms_v1', 'title': 'ORD T&Cs'}
            ],
        }

        response = self.client.post('/api/orders/checkout/', {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111111111'},
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(response.data['blocked'])
        self.assertFalse(response.data['success'])
        self.assertEqual(len(response.data['required_acknowledgments']), 1)

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_checkout_payment_failed_response(self, mock_vat, mock_rules):
        """Checkout returns 400 with payment error details."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
        }

        response = self.client.post('/api/orders/checkout/', {
            'payment_method': 'card',
            'card_data': {'card_number': '4111111111110002'},  # Decline card
            'general_terms_accepted': True,
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(response.data['success'])
        self.assertIn('Payment failed', response.data['detail'])
        self.assertIn('error_code', response.data)

    @patch('rules_engine.services.rule_engine.rule_engine')
    @patch('cart.services.cart_service.cart_service.calculate_vat')
    def test_checkout_success_response_structure(self, mock_vat, mock_rules):
        """Successful checkout returns correct response structure."""
        mock_rules.execute.return_value = {'blocked': False}
        mock_vat.return_value = {
            'totals': {'net': '100.00', 'vat': '20.00', 'gross': '120.00'},
            'items': [], 'region': 'UK',
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
        self.assertIn('payment_id', response.data['payment'])
        self.assertIn('transaction_id', response.data['payment'])
        self.assertIn('message', response.data['payment'])

    def test_checkout_missing_employer_code_for_invoice(self):
        """Invoice payment without employer_code returns 400."""
        response = self.client.post('/api/orders/checkout/', {
            'payment_method': 'invoice',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class OrderViewSetCoverageTest(ORDServiceTestMixin, APITestCase):
    """Additional OrderViewSet tests for missed branches."""

    def setUp(self):
        self.user = self._create_user('ord_vs_user')
        self.other_user = self._create_user('ord_vs_other')
        self.client.force_authenticate(user=self.user)

        self.store_product = self._create_store_product(
            subject_code='ORD_VS', session_code='ORD-VS-2025'
        )

        self.order = Order.objects.create(
            user=self.user,
            subtotal=Decimal('100.00'),
            vat_amount=Decimal('20.00'),
            total_amount=Decimal('120.00'),
        )

    def test_list_uses_order_serializer(self):
        """List endpoint returns OrderSerializer fields."""
        response = self.client.get('/api/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        if response.data['results']:
            first_order = response.data['results'][0]
            self.assertIn('id', first_order)
            self.assertIn('subtotal', first_order)
            self.assertIn('total_amount', first_order)
            # Detail fields should NOT be present in list
            self.assertNotIn('items', first_order)

    def test_retrieve_uses_detail_serializer(self):
        """Retrieve endpoint returns OrderDetailSerializer with items and payments."""
        OrderItem.objects.create(
            order=self.order,
            product=self.store_product,
            item_type='product',
            quantity=1,
            actual_price=Decimal('100.00'),
            net_amount=Decimal('100.00'),
            vat_amount=Decimal('20.00'),
            gross_amount=Decimal('120.00'),
        )
        Payment.objects.create(
            order=self.order,
            payment_method='card',
            amount=Decimal('120.00'),
            status='completed',
        )

        response = self.client.get(f'/api/orders/{self.order.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('items', response.data)
        self.assertIn('payments', response.data)
        self.assertIn('vat_calculation_type', response.data)

    def test_orders_ordered_by_created_at_desc(self):
        """Orders are returned newest first."""
        order2 = Order.objects.create(
            user=self.user,
            subtotal=Decimal('50.00'),
            vat_amount=Decimal('10.00'),
            total_amount=Decimal('60.00'),
        )

        response = self.client.get('/api/orders/')
        results = response.data['results']
        self.assertEqual(len(results), 2)
        # Newest first
        self.assertEqual(results[0]['id'], order2.id)
        self.assertEqual(results[1]['id'], self.order.id)
