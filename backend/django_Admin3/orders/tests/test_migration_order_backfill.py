"""Verify every OrderItem has a purchasable_id after Task 12 backfill.

Task 23 (Release B): the legacy ``product_id`` / ``marking_voucher_id`` /
``item_type`` columns on order_items have been dropped. The backfill-
correctness tests that queried those columns (``test_product_backed_
items_copied_correctly`` and ``test_fee_items_point_at_fee_generic``)
were removed — the invariant they guarded is now structurally enforced
by the NOT NULL ``purchasable`` FK.
"""
from django.test import TestCase

from orders.models import OrderItem


class OrderItemBackfillTests(TestCase):
    def test_no_orphan_order_items(self):
        orphans = OrderItem.objects.filter(purchasable_id__isnull=True).count()
        self.assertEqual(orphans, 0)
