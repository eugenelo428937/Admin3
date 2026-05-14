"""Tests for store.TutorialProduct (Phase 1 of MTI specialization)."""
from django.test import TestCase


class TutorialProductImportTests(TestCase):
    def test_importable_from_store_models(self):
        from store.models import TutorialProduct
        self.assertTrue(hasattr(TutorialProduct, '_meta'))

    def test_schema_qualified_db_table(self):
        from store.models import TutorialProduct
        self.assertEqual(
            TutorialProduct._meta.db_table,
            '"acted"."tutorial_products"',
        )


class TutorialProductMTITests(TestCase):
    def test_is_subclass_of_product(self):
        from store.models import TutorialProduct, Product
        self.assertTrue(issubclass(TutorialProduct, Product))

    def test_has_product_ptr_parent_link(self):
        from store.models import TutorialProduct, Product
        self.assertIsNotNone(TutorialProduct._meta.parents.get(Product))


class TutorialProductFieldsTests(TestCase):
    def test_owns_tutorial_course_template_fk(self):
        from store.models import TutorialProduct
        field = TutorialProduct._meta.get_field('tutorial_course_template')
        self.assertEqual(field.model, TutorialProduct)
        self.assertEqual(
            field.related_model._meta.label,
            'tutorials.TutorialCourseTemplate',
        )

    def test_owns_tutorial_location_fk(self):
        from store.models import TutorialProduct
        field = TutorialProduct._meta.get_field('tutorial_location')
        self.assertEqual(field.model, TutorialProduct)
        self.assertEqual(
            field.related_model._meta.label,
            'tutorials.TutorialLocation',
        )

    def test_format_is_textchoices(self):
        from store.models import TutorialProduct
        field = TutorialProduct._meta.get_field('format')
        self.assertIsNotNone(field.choices)
        # Verify a baseline value the design committed to
        format_values = {value for value, _label in field.choices}
        for required in ('F2F_1F', 'F2F_3F', 'F2F_5F', 'LIVE', 'REC'):
            self.assertIn(
                required, format_values,
                f"Tutorial Format must include {required}",
            )


class TutorialProductUniquenessTests(TestCase):
    """Phase 1: cross-table uniqueness across (template, location, format,
    ESS) is enforced via Purchasable.code UNIQUE, not via a local
    UniqueConstraint.

    Django MTI raises models.E016 if a subclass UniqueConstraint
    references a parent-table field (`exam_session_subject` lives on
    Product). A proper RunSQL partial unique index spanning the parent
    join can be added in a later phase.
    """

    def test_no_local_unique_constraint(self):
        """Phase 1: no UniqueConstraint declared on TutorialProduct.

        Confirms the implementation does not try to express cross-table
        uniqueness as a UniqueConstraint (would raise E016) or as a
        broken 3-field constraint (would reject same-tutorial-different-
        session, the normal case).
        """
        from store.models import TutorialProduct
        self.assertEqual(
            list(TutorialProduct._meta.constraints), [],
            "TutorialProduct.Meta.constraints must be empty in Phase 1 — "
            "see model docstring",
        )

    def test_purchasable_code_provides_uniqueness(self):
        """The uniqueness story: Purchasable.code is UNIQUE, and
        TutorialProduct._generate_product_code() (added later in the
        rollout) composes all four dimensional values into a single
        code. So two rows with the same (template, location, format,
        ESS) tuple cannot share a code.
        """
        from store.models import Purchasable
        field = Purchasable._meta.get_field('code')
        self.assertTrue(field.unique, "Purchasable.code must be UNIQUE")
