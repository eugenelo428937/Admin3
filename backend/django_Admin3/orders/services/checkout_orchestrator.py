import logging
from decimal import Decimal

from orders.models import OrderAcknowledgment, OrderPreference, OrderContact, OrderDelivery
from orders.services.order_builder import OrderBuilder
from orders.services.order_notification import send_order_confirmation
from orders.services.payment_gateway import get_payment_gateway, PaymentResult

logger = logging.getLogger(__name__)


class CheckoutOrchestrator:
    """Orchestrates the checkout pipeline: validate → VAT → build → acks → payment → notify → clear.

    This replaces the monolithic checkout() method in CartViewSet.
    """

    def __init__(self, cart, user, request_data: dict, request):
        self.cart = cart
        self.user = user
        self.request_data = request_data
        self.request = request

    def execute(self) -> dict:
        """Execute the full checkout pipeline.

        Returns:
            dict with 'order', 'payment_result', and 'success' keys.

        Raises:
            CheckoutValidationError: If validation fails.
            CheckoutBlockedError: If blocking rules prevent checkout.
            PaymentFailedError: If payment processing fails.
        """
        # Step 1: Validate cart and payment data
        self._validate()

        # Step 2: Check blocking rules
        self._check_blocking_rules()

        # Step 3: Calculate VAT
        vat_result = self._calculate_vat()

        # Step 4: Build order (atomic)
        order = self._build_order(vat_result)

        # Step 5: Save acknowledgments
        self._save_acknowledgments(order)

        # Step 6: Save preferences
        self._save_preferences(order)

        # Step 7: Save contact and delivery info
        self._save_contact_and_delivery(order)

        # Step 8: Process payment
        payment_result = self._process_payment(order)

        if not payment_result.success:
            order.delete()
            raise PaymentFailedError(
                payment_result.error_message,
                payment_result.error_code,
            )

        # Step 9: Send notification
        self._send_notification(order)

        # Step 10: Clear cart
        self._clear_cart()

        return {
            'order': order,
            'payment_result': payment_result,
            'success': True,
        }

    def _validate(self):
        if not self.cart.items.exists():
            raise CheckoutValidationError("Cart is empty.")

        payment_method = self.request_data.get('payment_method', 'card')
        card_data = self.request_data.get('card_data')
        employer_code = self.request_data.get('employer_code')

        if payment_method == 'card' and not card_data:
            raise CheckoutValidationError("Card data is required for card payments.")

        if payment_method == 'invoice' and not employer_code:
            raise CheckoutValidationError("Employer code is required for invoice payments.")

    def _check_blocking_rules(self):
        try:
            from rules_engine.services.rule_engine import rule_engine

            cart_total = sum(
                float(item.actual_price or 0) * item.quantity
                for item in self.cart.items.all()
            )

            context = {
                'cart': {
                    'id': self.cart.id,
                    'total': cart_total,
                    'has_tutorial': self.cart.has_tutorial,
                    'has_material': self.cart.has_material,
                    'has_marking': self.cart.has_marking,
                    'has_digital': self.cart.has_digital,
                },
                'payment': {
                    'method': self.request_data.get('payment_method', 'card'),
                },
                'user': {
                    'id': self.user.id,
                    'email': self.user.email,
                    'is_authenticated': True,
                },
                'acknowledgments': self._get_session_acknowledgments(),
            }

            result = rule_engine.execute('checkout_payment', context)

            if result.get('blocked'):
                required = result.get('required_acknowledgments', [])
                raise CheckoutBlockedError(
                    "Checkout blocked. Missing required acknowledgments.",
                    required_acknowledgments=required,
                )

        except (CheckoutBlockedError,):
            raise
        except Exception as e:
            logger.warning(f"Blocking rule check failed, proceeding: {str(e)}")

    def _calculate_vat(self) -> dict:
        try:
            from cart.services.cart_service import cart_service
            return cart_service.calculate_vat(self.cart)
        except Exception as e:
            logger.error(f"VAT calculation failed for cart {self.cart.id}: {str(e)}")
            return {
                'totals': {'net': '0.00', 'vat': '0.00', 'gross': '0.00'},
                'items': [],
                'region': 'UNKNOWN',
                'error': str(e),
                'fallback': True,
            }

    def _build_order(self, vat_result: dict):
        builder = OrderBuilder(cart=self.cart, user=self.user, vat_result=vat_result)
        return builder.build()

    def _save_acknowledgments(self, order):
        try:
            client_ip = self._get_client_ip()
            user_agent = self.request.META.get('HTTP_USER_AGENT', '')

            general_terms = self.request_data.get(
                'general_terms_accepted',
                self.request_data.get('terms_acceptance', {}).get('general_terms_accepted', False)
            )

            OrderAcknowledgment.objects.create(
                order=order,
                acknowledgment_type='terms_conditions',
                title='Terms & Conditions',
                content_summary='General terms accepted at checkout',
                is_accepted=general_terms,
                ip_address=client_ip,
                user_agent=user_agent,
            )
        except Exception as e:
            logger.warning(f"Failed to save acknowledgments for order {order.id}: {str(e)}")

    def _save_preferences(self, order):
        user_preferences = self.request_data.get('user_preferences', {})
        if not user_preferences:
            return

        try:
            client_ip = self._get_client_ip()
            user_agent = self.request.META.get('HTTP_USER_AGENT', '')

            for key, value in user_preferences.items():
                OrderPreference.objects.create(
                    order=order,
                    preference_type='custom',
                    preference_key=key,
                    preference_value=value if isinstance(value, dict) else {'value': value},
                    title=key.replace('_', ' ').title(),
                    is_submitted=True,
                    ip_address=client_ip,
                    user_agent=user_agent,
                )
        except Exception as e:
            logger.warning(f"Failed to save preferences for order {order.id}: {str(e)}")

    def _save_contact_and_delivery(self, order):
        contact_data = self.request_data.get('contact', {})
        delivery_data = self.request_data.get('delivery', {})

        if contact_data:
            try:
                OrderContact.objects.create(
                    order=order,
                    mobile_phone=contact_data.get('mobile_phone', ''),
                    mobile_phone_country=contact_data.get('mobile_phone_country', ''),
                    home_phone=contact_data.get('home_phone'),
                    home_phone_country=contact_data.get('home_phone_country', ''),
                    work_phone=contact_data.get('work_phone'),
                    work_phone_country=contact_data.get('work_phone_country', ''),
                    email_address=contact_data.get('email', self.user.email),
                )
            except Exception as e:
                logger.warning(f"Failed to save contact for order {order.id}: {str(e)}")

        if delivery_data:
            try:
                OrderDelivery.objects.create(
                    order=order,
                    delivery_address_type=delivery_data.get('delivery_address_type'),
                    invoice_address_type=delivery_data.get('invoice_address_type'),
                    delivery_address_data=delivery_data.get('delivery_address_data', {}),
                    invoice_address_data=delivery_data.get('invoice_address_data', {}),
                )
            except Exception as e:
                logger.warning(f"Failed to save delivery for order {order.id}: {str(e)}")

    def _process_payment(self, order) -> PaymentResult:
        payment_method = self.request_data.get('payment_method', 'card')
        gateway = get_payment_gateway(payment_method)

        client_ip = self._get_client_ip()
        user_agent = self.request.META.get('HTTP_USER_AGENT', '')
        payment_data = self.request_data.get('card_data', {})

        return gateway.process(order, payment_data, client_ip, user_agent)

    def _send_notification(self, order):
        try:
            send_order_confirmation(order, self.user)
        except Exception as e:
            logger.warning(f"Failed to send notification for order {order.id}: {str(e)}")

    def _clear_cart(self):
        self.cart.items.all().delete()
        self.cart.fees.all().delete()

    def _get_client_ip(self) -> str:
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return self.request.META.get('REMOTE_ADDR', '127.0.0.1')

    def _get_session_acknowledgments(self) -> dict:
        acknowledgments = {}
        session_acks = self.request.session.get('user_acknowledgments', [])
        for ack in session_acks:
            ack_key = ack.get('ack_key')
            if ack_key:
                acknowledgments[ack_key] = {
                    'acknowledged': ack.get('acknowledged', False),
                    'message_id': ack.get('message_id'),
                    'timestamp': ack.get('acknowledged_timestamp'),
                }
        return acknowledgments


class CheckoutValidationError(Exception):
    """Raised when checkout validation fails."""
    pass


class CheckoutBlockedError(Exception):
    """Raised when blocking rules prevent checkout."""

    def __init__(self, message, required_acknowledgments=None):
        super().__init__(message)
        self.required_acknowledgments = required_acknowledgments or []


class PaymentFailedError(Exception):
    """Raised when payment processing fails."""

    def __init__(self, message, error_code='PAYMENT_FAILED'):
        super().__init__(message)
        self.error_code = error_code
