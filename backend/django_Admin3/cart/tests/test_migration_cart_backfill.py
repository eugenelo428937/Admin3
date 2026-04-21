"""Verify every CartItem has a purchasable_id after Task 11 backfill."""
from django.db.models import F
from django.test import TestCase

from cart.models import CartItem


class CartItemBackfillTests(TestCase):
    def test_no_orphan_cart_items(self):
        """Every CartItem row should have a purchasable_id after backfill."""
        orphans = CartItem.objects.filter(purchasable_id__isnull=True).count()
        self.assertEqual(orphans, 0)

    def test_product_backed_items_copied_correctly(self):
        """product-backed items: purchasable_id == product_id (MTI Variant A invariant)."""
        mismatches = CartItem.objects.filter(
            product_id__isnull=False,
        ).exclude(purchasable_id=F('product_id')).count()
        self.assertEqual(mismatches, 0)

    def test_fee_items_point_at_fee_generic(self):
        """fee-only items should point at the FEE_GENERIC purchasable."""
        from store.models import Purchasable
        try:
            fee_generic = Purchasable.objects.get(code='FEE_GENERIC')
        except Purchasable.DoesNotExist:
            self.skipTest('FEE_GENERIC not seeded')
        non_fee_generic_fees = CartItem.objects.filter(
            item_type='fee',
        ).exclude(purchasable_id=fee_generic.id).count()
        self.assertEqual(non_fee_generic_fees, 0)
