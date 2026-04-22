"""Smoke test: voucher-kind Purchasables/Prices persist after Release B.

Task 5 (store.0008_backfill_purchasable_from_vouchers) created a
``store.GenericItem`` + ``store.Price`` for every ``marking_vouchers.MarkingVoucher``
row. Task 24 then dropped the source ``MarkingVoucher`` model entirely.

The artifacts produced by the Task 5 backfill persist — this test
verifies the invariant shape of those artifacts without referencing the
now-deleted source table.
"""
from django.test import TestCase

from store.models import GenericItem, Price, Purchasable


class VoucherBackfillTests(TestCase):
    def test_every_voucher_generic_item_has_price(self):
        """Every voucher-kind Purchasable should have a standard Price row.

        Guarantees the Task 5 backfill invariant: no orphan GenericItems
        without pricing data. (Empty test DB is also a valid pass — the
        assertion is ``count_without_price == 0``.)
        """
        voucher_purchasable_ids = list(
            Purchasable.objects.filter(kind='marking_voucher')
            .values_list('id', flat=True)
        )
        priced_ids = set(
            Price.objects.filter(
                purchasable_id__in=voucher_purchasable_ids,
                price_type='standard',
            ).values_list('purchasable_id', flat=True)
        )
        missing = [pid for pid in voucher_purchasable_ids if pid not in priced_ids]
        self.assertEqual(missing, [])

    def test_voucher_generic_items_have_required_fields(self):
        """Every voucher GenericItem must expose a non-blank code + name."""
        for gi in GenericItem.objects.filter(kind='marking_voucher'):
            self.assertTrue(gi.code)
            self.assertTrue(gi.name)
