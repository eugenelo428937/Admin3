"""Verify every Price row has a purchasable_id after Task 8 backfill."""
from django.db.models import F
from django.test import TestCase

from store.models import Price


class PriceBackfillTests(TestCase):
    def test_no_orphan_prices(self):
        orphans = Price.objects.filter(purchasable_id__isnull=True).count()
        self.assertEqual(
            orphans,
            0,
            "Every Price row must have a purchasable_id after Task 8",
        )

    def test_product_backed_prices_match_product_id(self):
        """For rows that came from the legacy product FK, purchasable_id == product_id
        (because Product.id == Purchasable.id under MTI Variant A)."""
        mismatches = Price.objects.filter(
            product_id__isnull=False,
        ).exclude(purchasable_id=F('product_id')).count()
        self.assertEqual(mismatches, 0)
