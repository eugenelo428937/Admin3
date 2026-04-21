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
