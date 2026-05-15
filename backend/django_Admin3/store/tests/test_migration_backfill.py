"""Smoke test: backfill migration produces Purchasable row per Product, same PK."""
import unittest
from django.test import TestCase
from store.models import Product, Purchasable

_PHASE_4E_SKIP = (
    "Phase 4e removed Purchasable.Kind.PRODUCT. These tests exercise "
    "the legacy 'product' split flow which is no longer reachable from "
    "the ORM (field-validation rejects the value). The split_products_by_kind "
    "command remains for backward-compat with hypothetical legacy DBs, "
    "but the test scaffolding cannot create the required input rows "
    "without using raw SQL bypass. Re-enable if the command needs to be "
    "verified against a real legacy DB import."
)


@unittest.skip(_PHASE_4E_SKIP)
class PurchasableBackfillTests(TestCase):
    """Runs against the post-migration DB; verifies counts and PK preservation."""

    def test_every_product_has_matching_purchasable(self):
        product_ids = set(Product.objects.values_list('id', flat=True))
        purchasable_ids = set(
            Purchasable.objects.filter(kind='product').values_list('id', flat=True)
        )
        self.assertEqual(product_ids, purchasable_ids)

    def test_purchasable_code_matches_product_code(self):
        """Every backfilled purchasable has the product's product_code as its code."""
        for product in Product.objects.all()[:10]:  # sample check
            purchasable = Purchasable.objects.get(pk=product.pk, kind='product')
            self.assertEqual(purchasable.code, product.product_code)
