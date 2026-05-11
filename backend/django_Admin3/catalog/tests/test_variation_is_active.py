"""Schema test: ProductVariation and ProductProductVariation have is_active defaults False."""
from django.test import TestCase

from catalog.products.models import (
    Product as CatalogProduct,
    ProductVariation,
    ProductProductVariation,
)


class VariationIsActiveTests(TestCase):
    def test_product_variation_is_active_defaults_to_false(self):
        v = ProductVariation.objects.create(
            variation_type='eBook',
            name='Test eBook Variation',
            code='TEST-EBK',
        )
        self.assertFalse(v.is_active)

    def test_product_product_variation_is_active_defaults_to_false(self):
        p = CatalogProduct.objects.create(
            fullname='Test Catalog Product',
            shortname='Test',
            code='TEST01',
        )
        v = ProductVariation.objects.create(
            variation_type='Printed',
            name='Test Printed Variation',
            code='TEST-PRN',
        )
        ppv = ProductProductVariation.objects.create(
            product=p,
            product_variation=v,
        )
        self.assertFalse(ppv.is_active)

    def test_product_variation_is_active_can_be_set_true(self):
        v = ProductVariation.objects.create(
            variation_type='Hub',
            name='Test Hub Variation',
            code='TEST-HUB',
            is_active=True,
        )
        self.assertTrue(v.is_active)

    def test_product_product_variation_is_active_can_be_set_true(self):
        p = CatalogProduct.objects.create(
            fullname='Test Catalog Product 2',
            shortname='Test2',
            code='TEST02',
        )
        v = ProductVariation.objects.create(
            variation_type='Marking',
            name='Test Marking Variation',
            code='TEST-MRK',
        )
        ppv = ProductProductVariation.objects.create(
            product=p,
            product_variation=v,
            is_active=True,
        )
        self.assertTrue(ppv.is_active)
