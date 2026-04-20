"""Tests for store.GenericItem — MTI subclass for voucher/binder/additional-charge."""
from django.test import TestCase
from store.models import GenericItem, Purchasable


class GenericItemModelTests(TestCase):
    def test_create_voucher_generic_item(self):
        gi = GenericItem.objects.create(
            kind='marking_voucher',
            code='MV-STANDARD',
            name='Standard Voucher',
            validity_period_days=1460,
        )
        self.assertEqual(gi.validity_period_days, 1460)
        self.assertEqual(gi.kind, 'marking_voucher')

    def test_generic_item_is_purchasable(self):
        gi = GenericItem.objects.create(
            kind='document_binder', code='DB-A4', name='A4 Binder',
        )
        self.assertIsInstance(gi, Purchasable)
        self.assertEqual(Purchasable.objects.get(code='DB-A4').pk, gi.pk)

    def test_validity_period_optional(self):
        gi = GenericItem.objects.create(
            kind='document_binder', code='DB-A3', name='A3 Binder',
        )
        self.assertIsNone(gi.validity_period_days)

    def test_stock_tracked_defaults_false(self):
        gi = GenericItem.objects.create(
            kind='additional_charge', code='AC-X', name='X', dynamic_pricing=True,
        )
        self.assertFalse(gi.stock_tracked)

    def test_db_table_in_acted_schema(self):
        self.assertEqual(GenericItem._meta.db_table, '"acted"."generic_items"')
