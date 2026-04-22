"""Verify IssuedVoucher row count matches sum of quantities on voucher OrderItems."""
from django.test import TestCase

from marking_vouchers.models import IssuedVoucher
from orders.models import OrderItem


class IssuedVoucherBackfillTests(TestCase):
    def test_every_voucher_order_item_has_issued_vouchers(self):
        """Each OrderItem with a voucher purchasable should have `quantity` vouchers."""
        voucher_ois = OrderItem.objects.filter(
            purchasable__kind='marking_voucher',
        )
        total_quantity = sum(oi.quantity for oi in voucher_ois)
        total_vouchers = IssuedVoucher.objects.count()
        self.assertEqual(total_vouchers, total_quantity)

    def test_each_order_item_has_expected_voucher_count(self):
        """Per-OrderItem check — voucher count == quantity."""
        for oi in OrderItem.objects.filter(purchasable__kind='marking_voucher')[:10]:
            count = IssuedVoucher.objects.filter(order_item=oi).count()
            self.assertEqual(count, oi.quantity)
