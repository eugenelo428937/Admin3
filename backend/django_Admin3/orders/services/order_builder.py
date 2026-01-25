import logging
from decimal import Decimal

from django.db import transaction

from orders.models import Order, OrderItem

logger = logging.getLogger(__name__)


class OrderBuilder:
    """Builds an Order from a Cart within an atomic transaction.

    Transfers cart items and fees into order items, applying VAT from the
    calculation result.
    """

    def __init__(self, cart, user, vat_result: dict):
        self.cart = cart
        self.user = user
        self.vat_result = vat_result

    def build(self) -> Order:
        """Create order with items and fees within a transaction."""
        with transaction.atomic():
            order = self._create_order()
            self._transfer_items(order)
            self._transfer_fees(order)
            return order

    def _create_order(self) -> Order:
        totals = self.vat_result.get('totals', {})
        region = self.vat_result.get('region', 'UNKNOWN')

        return Order.objects.create(
            user=self.user,
            subtotal=Decimal(str(totals.get('net', '0.00'))),
            vat_amount=Decimal(str(totals.get('vat', '0.00'))),
            total_amount=Decimal(str(totals.get('gross', '0.00'))),
            vat_rate=Decimal('0.0000'),
            vat_country=region if region != 'UNKNOWN' else None,
            vat_calculation_type='rules_engine_vat_v1',
            calculations_applied={'vat_result': self.vat_result},
        )

    def _transfer_items(self, order: Order):
        vat_items = self.vat_result.get('items', [])
        vat_by_item_id = {str(item.get('id')): item for item in vat_items}

        for item in self.cart.items.all():
            vat_info = vat_by_item_id.get(str(item.id), {})
            item_net = (item.actual_price or Decimal('0.00')) * item.quantity
            vat_amount = Decimal(str(vat_info.get('vat_amount', '0.00')))

            if item_net > 0:
                vat_rate = (vat_amount / item_net).quantize(Decimal('0.0001'))
            else:
                vat_rate = Decimal('0.0000')

            net_amount = item.actual_price or Decimal('0.00')
            vat_per_unit = vat_amount / item.quantity if item.quantity > 0 else Decimal('0.00')
            gross_amount = net_amount + vat_per_unit

            OrderItem.objects.create(
                order=order,
                product=item.product,
                marking_voucher=item.marking_voucher,
                item_type=item.item_type,
                quantity=item.quantity,
                price_type=item.price_type,
                actual_price=item.actual_price,
                net_amount=net_amount,
                vat_amount=vat_amount,
                gross_amount=gross_amount,
                vat_rate=vat_rate,
                is_vat_exempt=(vat_rate == Decimal('0.0000')),
                metadata=item.metadata,
            )

    def _transfer_fees(self, order: Order):
        for fee in self.cart.fees.all():
            OrderItem.objects.create(
                order=order,
                item_type='fee',
                quantity=1,
                actual_price=fee.amount,
                net_amount=fee.amount,
                vat_amount=Decimal('0.00'),
                gross_amount=fee.amount,
                vat_rate=Decimal('0.0000'),
                is_vat_exempt=True,
                metadata={
                    'fee_type': fee.fee_type,
                    'fee_name': fee.name,
                    'fee_description': fee.description,
                    'fee_currency': fee.currency,
                    'fee_id': fee.id,
                },
            )
