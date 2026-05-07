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
        self._enforce_tutorial_auth_gate()
        with transaction.atomic():
            order = self._create_order()
            self._transfer_items(order)
            self._transfer_fees(order)
            return order

    def _enforce_tutorial_auth_gate(self):
        """A cart with tutorial choices may only be built into an order
        when an authenticated user is checking out. The Student row is
        NOT required here — a logged-in user with no student profile may
        still check out, and TutorialChoice.student will be NULL.

        Defense-in-depth: the frontend already gates the checkout
        button. This catches programmatic / forged-session bypasses
        before any rows are written.
        """
        from django.core.exceptions import ValidationError
        # Only check carts that actually carry tutorial choices.
        from tutorials.models import CartTutorialChoice
        if not CartTutorialChoice.objects.filter(
            cart_item__cart=self.cart,
        ).exists():
            return
        user = self.user
        if user is None or not getattr(user, 'is_authenticated', False):
            raise ValidationError(
                "Tutorial purchases require a logged-in user. "
                "Please sign in before checking out.")

    def _create_order(self) -> Order:
        totals = self.vat_result.get('totals', {})
        region = self.vat_result.get('region', 'UNKNOWN')

        return Order.objects.create(
            user=self.user,
            subtotal=Decimal(str(totals.get('net', '0.00'))),
            vat_amount=Decimal(str(totals.get('vat', '0.00'))),
            total_amount=Decimal(str(totals.get('gross', '0.00'))),
            vat_rate=Decimal('0.0000'),
            vat_country=region if region not in ('UNKNOWN', 'ROW') and len(region) <= 2 else None,
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

            # Task 23 (Release B): legacy product/marking_voucher/item_type
            # columns are gone. Carry the unified `purchasable` FK across
            # cart → order instead.
            order_item = OrderItem.objects.create(
                order=order,
                purchasable_id=item.purchasable_id,
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
            self._transfer_tutorial_choices(item, order_item)

    def _transfer_tutorial_choices(self, cart_item, order_item):
        """If the cart line has CartTutorialChoice rows, copy them into
        TutorialChoice rows on the new order_item. Validation already
        ran at add-to-cart time; rely on DB constraints here."""
        from tutorials.models import TutorialChoice

        cart_choices = list(cart_item.tutorial_choices.select_related(
            'student', 'tutorial_event'))
        if not cart_choices:
            return
        TutorialChoice.objects.bulk_create([
            TutorialChoice(
                order_item=order_item,
                student=c.student,
                tutorial_event=c.tutorial_event,
                choice_rank=c.choice_rank,
            )
            for c in cart_choices
        ])

    def _transfer_fees(self, order: Order):
        # Task 23: fee lines point at the singleton FEE_GENERIC Purchasable
        # (created in store.0009 + ensured by store.0015). Resolve once.
        if not self.cart.fees.exists():
            return
        from store.models import Purchasable
        fee_purchasable = Purchasable.objects.filter(code='FEE_GENERIC').first()
        if fee_purchasable is None:
            raise RuntimeError(
                "Missing FEE_GENERIC Purchasable row — run "
                "`manage.py migrate store` to create it."
            )
        for fee in self.cart.fees.all():
            OrderItem.objects.create(
                order=order,
                purchasable=fee_purchasable,
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
