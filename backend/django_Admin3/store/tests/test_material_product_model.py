"""Tests for store.MaterialProduct (Phase 1 of MTI specialization).

MaterialProduct is the MTI subclass of store.Product for eBook/Printed/Hub
items — the products that fit the catalog template + variation pattern.

Phase 1: empty marker subclass (just a parent_link to Product). The
product_product_variation FK stays on Product through Phases 1-4; it
moves to MaterialProduct as a local field in Phase 5.
"""
from django.test import TestCase


class MaterialProductImportTests(TestCase):
    def test_importable_from_store_models(self):
        from store.models import MaterialProduct
        self.assertTrue(hasattr(MaterialProduct, '_meta'))

    def test_schema_qualified_db_table(self):
        from store.models import MaterialProduct
        self.assertEqual(
            MaterialProduct._meta.db_table,
            '"acted"."material_products"',
        )


class MaterialProductMTITests(TestCase):
    """MaterialProduct is an MTI subclass of store.Product."""

    def test_is_subclass_of_product(self):
        from store.models import MaterialProduct, Product
        self.assertTrue(issubclass(MaterialProduct, Product))

    def test_is_subclass_of_purchasable_transitively(self):
        from store.models import MaterialProduct, Purchasable
        self.assertTrue(issubclass(MaterialProduct, Purchasable))

    def test_has_product_ptr_parent_link(self):
        from store.models import MaterialProduct, Product
        parent_link = MaterialProduct._meta.parents.get(Product)
        self.assertIsNotNone(
            parent_link,
            "No MTI parent_link found from MaterialProduct to Product",
        )

    def test_inherits_exam_session_subject_from_product(self):
        """ESS FK is inherited from the intermediate Product parent."""
        from store.models import MaterialProduct, Product
        field = MaterialProduct._meta.get_field('exam_session_subject')
        self.assertEqual(field.model, Product)

    def test_inherits_product_product_variation_from_product(self):
        """PPV FK stays on Product through Phases 1-4; MaterialProduct
        inherits it via MTI. The 'move PPV to MaterialProduct' rewrite
        happens in Phase 5 (see design doc §6 Phase 5).
        """
        from store.models import MaterialProduct, Product
        field = MaterialProduct._meta.get_field('product_product_variation')
        self.assertEqual(
            field.model, Product,
            "Phase 1: PPV remains on Product; MaterialProduct inherits it",
        )
        self.assertEqual(
            field.related_model._meta.label,
            'catalog_products.ProductProductVariation',
        )

    def test_no_local_fields_beyond_parent_link(self):
        """Phase 1: MaterialProduct ships empty (just product_ptr).

        Phase 5 adds `product_product_variation` locally after moving it
        off Product. Until then, the only local field is the MTI parent_link.
        """
        from store.models import MaterialProduct
        local_field_names = {
            f.name for f in MaterialProduct._meta.local_fields
        }
        # `product_ptr` is the auto-generated MTI parent_link OneToOneField
        self.assertEqual(local_field_names, {'product_ptr'})
