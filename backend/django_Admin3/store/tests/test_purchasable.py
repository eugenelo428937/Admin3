"""Tests for store.Purchasable — the unified catalog parent."""
from django.db import IntegrityError
from django.test import TestCase
from store.models import Purchasable


class PurchasableModelTests(TestCase):
    def test_create_minimum_fields(self):
        obj = Purchasable.objects.create(
            kind='marking_voucher',
            code='MV-STD-01',
            name='Standard Marking Voucher',
        )
        self.assertEqual(obj.kind, 'marking_voucher')
        self.assertEqual(obj.code, 'MV-STD-01')
        self.assertTrue(obj.is_active)
        self.assertFalse(obj.dynamic_pricing)

    def test_code_is_unique(self):
        Purchasable.objects.create(kind='product', code='DUPE', name='First')
        with self.assertRaises(IntegrityError):
            Purchasable.objects.create(kind='marking_voucher', code='DUPE', name='Second')

    def test_kind_choices_enforced(self):
        obj = Purchasable(kind='banana', code='X', name='X')
        with self.assertRaises(Exception):
            obj.full_clean()

    def test_dynamic_pricing_default_false(self):
        obj = Purchasable.objects.create(kind='document_binder', code='DB-1', name='Binder')
        self.assertFalse(obj.dynamic_pricing)

    def test_str(self):
        obj = Purchasable.objects.create(kind='product', code='ABC', name='Thing')
        self.assertIn('ABC', str(obj))

    def test_db_table_in_acted_schema(self):
        self.assertEqual(Purchasable._meta.db_table, '"acted"."purchasables"')
