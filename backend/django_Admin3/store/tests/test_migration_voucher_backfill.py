"""Smoke test: every MarkingVoucher has a matching GenericItem + Price + map row."""
from django.db import connection
from django.test import TestCase

from marking_vouchers.models import MarkingVoucher
from store.models import GenericItem, Price, Purchasable


class VoucherBackfillTests(TestCase):
    def test_every_voucher_has_generic_item(self):
        voucher_codes = set(MarkingVoucher.objects.values_list('code', flat=True))
        gi_codes = set(
            GenericItem.objects.filter(kind='marking_voucher').values_list('code', flat=True)
        )
        self.assertEqual(voucher_codes, gi_codes)

    def test_every_voucher_has_price(self):
        voucher_count = MarkingVoucher.objects.count()
        voucher_purchasable_ids = Purchasable.objects.filter(
            kind='marking_voucher'
        ).values_list('id', flat=True)
        price_count = Price.objects.filter(
            purchasable_id__in=voucher_purchasable_ids, price_type='standard'
        ).count()
        self.assertEqual(price_count, voucher_count)

    def test_migration_map_table_exists_and_populated(self):
        with connection.cursor() as cur:
            cur.execute('SELECT COUNT(*) FROM acted._voucher_migration_map')
            count = cur.fetchone()[0]
        self.assertEqual(count, MarkingVoucher.objects.count())
