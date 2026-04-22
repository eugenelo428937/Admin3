"""When an order is confirmed, IssuedVoucher rows are created for voucher items."""
from django.test import TestCase
from django.contrib.auth import get_user_model

from marking_vouchers.models import IssuedVoucher
from orders.models import Order, OrderItem
from store.models import GenericItem


User = get_user_model()


class OrderConfirmationIssuesVouchersTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='u17', password='p', email='u17@x.com',
        )
        self.gi = GenericItem.objects.create(
            kind='marking_voucher', code='MV-CONF-T17', name='V',
            validity_period_days=1460,
        )

    def test_confirming_an_order_creates_issued_vouchers(self):
        order = Order.objects.create(user=self.user)
        OrderItem.objects.create(order=order, purchasable_id=self.gi.pk, quantity=2)

        from orders.services.confirmation import confirm_order
        confirm_order(order)

        self.assertEqual(
            IssuedVoucher.objects.filter(order_item__order=order).count(),
            2,
        )

    def test_confirming_twice_is_idempotent(self):
        """Re-confirming an order must NOT double-issue vouchers."""
        order = Order.objects.create(user=self.user)
        OrderItem.objects.create(order=order, purchasable_id=self.gi.pk, quantity=3)

        from orders.services.confirmation import confirm_order
        confirm_order(order)
        confirm_order(order)  # second call

        self.assertEqual(
            IssuedVoucher.objects.filter(order_item__order=order).count(),
            3,  # not 6
        )

    def test_confirming_order_without_vouchers_is_no_op(self):
        """Orders with only non-voucher items don't create any IssuedVouchers."""
        from store.models import Purchasable
        binder = Purchasable.objects.create(
            kind='document_binder', code='DB-T17', name='B',
        )
        order = Order.objects.create(user=self.user)
        OrderItem.objects.create(order=order, purchasable_id=binder.pk, quantity=1)

        from orders.services.confirmation import confirm_order
        confirm_order(order)

        self.assertEqual(
            IssuedVoucher.objects.filter(order_item__order=order).count(), 0,
        )
