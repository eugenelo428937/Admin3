"""Smoke test: FEE_GENERIC Purchasable exists with expected attributes."""
from django.test import TestCase

from store.models import Purchasable


class FeeGenericSeedTests(TestCase):
    def test_fee_generic_exists(self):
        p = Purchasable.objects.get(code='FEE_GENERIC')
        self.assertEqual(p.kind, 'additional_charge')
        self.assertTrue(p.dynamic_pricing)
        self.assertTrue(p.is_active)
        self.assertEqual(p.name, 'Generic Fee')


class FeeGenericIdempotenceTests(TestCase):
    def test_running_ensure_migration_twice_keeps_one_row(self):
        """Re-running the ensure_fee_generic forward function must
        not duplicate the row, regardless of starting state."""
        from importlib import import_module
        from django.apps import apps
        from store.models import Purchasable

        # Drop, then run the forward function twice; expect exactly
        # one row with the canonical attribute values.
        Purchasable.objects.filter(code='FEE_GENERIC').delete()
        mod = import_module(
            'store.migrations.0015_ensure_fee_generic_exists'
        )
        mod.ensure_fee_generic(apps, None)
        mod.ensure_fee_generic(apps, None)

        rows = Purchasable.objects.filter(code='FEE_GENERIC')
        self.assertEqual(rows.count(), 1)
        row = rows.first()
        self.assertEqual(row.kind, 'additional_charge')
        self.assertTrue(row.dynamic_pricing)
        self.assertTrue(row.is_active)
        self.assertEqual(row.name, 'Generic Fee')
