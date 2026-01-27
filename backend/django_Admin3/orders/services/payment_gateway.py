import base64
import logging
import requests
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Optional

from django.conf import settings
from django.utils import timezone

from orders.models import Payment

logger = logging.getLogger(__name__)


@dataclass
class PaymentResult:
    success: bool
    payment_id: Optional[int] = None
    transaction_id: Optional[str] = None
    message: str = ''
    error_message: str = ''
    error_code: str = ''
    metadata: dict = field(default_factory=dict)


class PaymentGateway(ABC):
    """Abstract base class for payment gateways (Strategy pattern)."""

    @abstractmethod
    def process(self, order, payment_data: dict, client_ip: str, user_agent: str) -> PaymentResult:
        """Process a payment for the given order."""
        ...


class DummyGateway(PaymentGateway):
    """Development/testing gateway. Card ending '0002' declines, all others approve."""

    def process(self, order, payment_data: dict, client_ip: str, user_agent: str) -> PaymentResult:
        card_number = payment_data.get('card_number', '')

        if card_number.endswith('0002'):
            payment = Payment.objects.create(
                order=order,
                payment_method='card',
                amount=order.total_amount,
                currency='GBP',
                client_ip=client_ip,
                user_agent=user_agent,
                status='failed',
                transaction_id='DUMMYFAIL',
                opayo_response={'dummy': True, 'status': 'failed'},
                error_message='Card declined',
                error_code='DECLINED',
            )
            return PaymentResult(
                success=False,
                payment_id=payment.id,
                error_message='Card declined',
                error_code='DECLINED',
            )

        payment = Payment.objects.create(
            order=order,
            payment_method='card',
            amount=order.total_amount,
            currency='GBP',
            client_ip=client_ip,
            user_agent=user_agent,
            status='completed',
            transaction_id='DUMMY123456',
            opayo_response={'dummy': True, 'status': 'success'},
            processed_at=timezone.now(),
        )
        return PaymentResult(
            success=True,
            payment_id=payment.id,
            transaction_id='DUMMY123456',
            message='Payment processed successfully',
        )


class InvoiceGateway(PaymentGateway):
    """Invoice payment — creates pending payment record (no immediate charge)."""

    def process(self, order, payment_data: dict, client_ip: str, user_agent: str) -> PaymentResult:
        payment = Payment.objects.create(
            order=order,
            payment_method='invoice',
            amount=order.total_amount,
            currency='GBP',
            client_ip=client_ip,
            user_agent=user_agent,
            status='pending',
        )
        return PaymentResult(
            success=True,
            payment_id=payment.id,
            message='Invoice payment request created',
        )


class OpayoGateway(PaymentGateway):
    """Production card payment gateway via Opayo (Elavon)."""

    def __init__(self):
        self.test_mode = getattr(settings, 'OPAYO_TEST_MODE', True)
        self.vendor_name = getattr(settings, 'OPAYO_VENDOR_NAME', 'sandboxEC')
        self.integration_key = getattr(
            settings, 'OPAYO_INTEGRATION_KEY',
            'hJYxsw7HLbj40cB8udES8CDRFLhuJ8G54O6rDpUXvE6hYDrria'
        )
        self.integration_password = getattr(
            settings, 'OPAYO_INTEGRATION_PASSWORD',
            'o2iHSrFybYMZpmWOQMuhsXP52V4fBtpuSDshrKDSWsBY1OiN6hwd9Kb12z4j5Us5u'
        )
        self.base_url = getattr(
            settings, 'OPAYO_BASE_URL',
            'https://sandbox.opayo.eu.elavon.com/hosted-payment-pages/vendor/v1/payment-pages'
        )

    def process(self, order, payment_data: dict, client_ip: str, user_agent: str) -> PaymentResult:
        try:
            payment = Payment.objects.create(
                order=order,
                payment_method='card',
                amount=order.total_amount,
                currency='GBP',
                client_ip=client_ip,
                user_agent=user_agent,
                status='processing',
            )

            opayo_request = self._build_request(order, payment_data)

            credentials = f"{self.integration_key}:{self.integration_password}"
            auth_header = base64.b64encode(credentials.encode()).decode()

            response = requests.post(
                f"{self.base_url}/transactions",
                headers={
                    'Authorization': f'Basic {auth_header}',
                    'Content-Type': 'application/json',
                },
                json=opayo_request,
                timeout=30,
            )

            response_data = response.json()
            payment.opayo_response = response_data
            payment.opayo_status_code = response_data.get('statusCode')
            payment.opayo_status_detail = response_data.get('statusDetail')

            if response.status_code == 200 and response_data.get('statusCode') == '0000':
                payment.status = 'completed'
                payment.transaction_id = response_data.get('transactionId')
                payment.processed_at = timezone.now()
                payment.save()
                return PaymentResult(
                    success=True,
                    payment_id=payment.id,
                    transaction_id=payment.transaction_id,
                    message='Payment processed successfully',
                )

            payment.status = 'failed'
            payment.error_message = response_data.get('statusDetail', 'Payment failed')
            payment.error_code = response_data.get('statusCode', 'UNKNOWN')
            payment.save()

            logger.error(f"Payment failed for order {order.id}: {payment.error_message}")
            return PaymentResult(
                success=False,
                payment_id=payment.id,
                error_message=payment.error_message,
                error_code=payment.error_code,
            )

        except Exception as e:
            logger.error(f"Error processing payment for order {order.id}: {str(e)}")
            if 'payment' in locals():
                payment.status = 'failed'
                payment.error_message = str(e)
                payment.error_code = 'EXCEPTION'
                payment.save()
            return PaymentResult(
                success=False,
                error_message='Payment processing error',
                error_code='EXCEPTION',
            )

    def _build_request(self, order, payment_data: dict) -> dict:
        """Build the Opayo API request payload."""
        return {
            "transactionDetails": {
                "transactionType": "Payment",
                "vendorName": self.vendor_name,
                "vendorTxCode": f"Order-{order.id}-{timezone.now().strftime('%Y%m%d%H%M%S')}",
                "amount": int(order.total_amount * 100),
                "currency": "GBP",
                "description": f"Order #{order.id}",
                "customerEmail": payment_data.get('email', ''),
                "billingAddress": payment_data.get('billing_address', {}),
            },
            "outcomeReport": {
                "redirectUrls": {
                    "successUrl": payment_data.get('success_url', ''),
                    "failureUrl": payment_data.get('failure_url', ''),
                    "cancelUrl": payment_data.get('cancel_url', ''),
                },
            },
        }


def get_payment_gateway(payment_method: str = 'card') -> PaymentGateway:
    """Factory function to get the appropriate payment gateway.

    Uses USE_DUMMY_PAYMENT_GATEWAY setting for development mode.
    Falls back to method-based selection for production.
    """
    if payment_method == 'invoice':
        return InvoiceGateway()

    if getattr(settings, 'USE_DUMMY_PAYMENT_GATEWAY', False):
        return DummyGateway()

    return OpayoGateway()
