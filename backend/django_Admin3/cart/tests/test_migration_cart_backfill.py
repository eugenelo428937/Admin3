"""Verify every CartItem has a purchasable_id after Task 11 backfill.

Task 23 (Release B): the legacy ``product_id`` / ``marking_voucher_id`` /
``item_type`` columns on cart_items have been dropped. The backfill-
correctness tests that queried those columns (``test_product_backed_
items_copied_correctly`` and ``test_fee_items_point_at_fee_generic``)
were removed — the invariant they guarded is now structurally enforced
by the NOT NULL ``purchasable`` FK (there are no product/marking/fee
columns left to mis-copy from).
"""
from django.test import TestCase

from cart.models import CartItem


class CartItemBackfillTests(TestCase):
    def test_no_orphan_cart_items(self):
        """Every CartItem row should have a purchasable_id after backfill."""
        orphans = CartItem.objects.filter(purchasable_id__isnull=True).count()
        self.assertEqual(orphans, 0)
