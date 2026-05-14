"""Tests for store.MarkingProduct (Phase 1 of MTI specialization)."""
from django.test import TestCase


class MarkingProductImportTests(TestCase):
    def test_importable_from_store_models(self):
        from store.models import MarkingProduct
        self.assertTrue(hasattr(MarkingProduct, '_meta'))

    def test_schema_qualified_db_table(self):
        from store.models import MarkingProduct
        self.assertEqual(
            MarkingProduct._meta.db_table,
            '"acted"."marking_products"',
        )


class MarkingProductMTITests(TestCase):
    def test_is_subclass_of_product(self):
        from store.models import MarkingProduct, Product
        self.assertTrue(issubclass(MarkingProduct, Product))

    def test_has_product_ptr_parent_link(self):
        from store.models import MarkingProduct, Product
        self.assertIsNotNone(MarkingProduct._meta.parents.get(Product))


class MarkingProductFieldsTests(TestCase):
    def test_owns_marking_template_fk(self):
        from store.models import MarkingProduct
        field = MarkingProduct._meta.get_field('marking_template')
        self.assertEqual(field.model, MarkingProduct)
        self.assertEqual(
            field.related_model._meta.label,
            'marking.MarkingTemplate',
        )

    def test_marking_template_on_delete_protect(self):
        from store.models import MarkingProduct
        from django.db import models as dj_models
        field = MarkingProduct._meta.get_field('marking_template')
        self.assertEqual(field.remote_field.on_delete, dj_models.PROTECT)

    def test_paper_count_is_optional(self):
        from store.models import MarkingProduct
        field = MarkingProduct._meta.get_field('paper_count')
        self.assertTrue(field.null)
        self.assertTrue(field.blank)


class MarkingProductUniquenessTests(TestCase):
    """Phase 1: cross-table uniqueness across (marking_template, ESS) is
    enforced via Purchasable.code UNIQUE, not via a local UniqueConstraint.

    Django MTI raises models.E016 if a subclass UniqueConstraint
    references a parent-table field (`exam_session_subject` lives on
    Product). A proper RunSQL partial unique index spanning the parent
    join can be added in a later phase. Same pattern as TutorialProduct.
    """

    def test_no_local_unique_constraint(self):
        from store.models import MarkingProduct
        self.assertEqual(
            list(MarkingProduct._meta.constraints), [],
            "MarkingProduct.Meta.constraints must be empty in Phase 1 — "
            "see model docstring",
        )

    def test_purchasable_code_provides_uniqueness(self):
        from store.models import Purchasable
        field = Purchasable._meta.get_field('code')
        self.assertTrue(field.unique, "Purchasable.code must be UNIQUE")
