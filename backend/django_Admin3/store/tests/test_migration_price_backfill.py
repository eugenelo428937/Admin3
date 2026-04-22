"""Verify every Price row has a purchasable_id after Task 8 backfill."""
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

    # Task 23 (Release B): ``Price.product`` FK column has been dropped.
    # The ``test_product_backed_prices_match_product_id`` test that used
    # to assert ``purchasable_id == product_id`` was removed — the
    # invariant it guarded (Product.id == Purchasable.id under MTI Variant
    # A) is now structurally enforced by the NOT NULL purchasable FK.
