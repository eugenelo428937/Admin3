"""Tests for store.TutorialProduct (MTI specialization, Phases 1–2)."""
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

    def test_format_is_textchoices_with_23_real_codes(self):
        """Phase 2 expanded the enum to match the 23 real codes in
        catalog_product_variations (variation_type='Tutorial'). The
        Phase 1 placeholders LIVE and REC were dropped — no data uses them.
        """
        from store.models import TutorialProduct
        field = TutorialProduct._meta.get_field('format')
        format_values = {value for value, _label in field.choices}
        expected = {
            # Face-to-face (9)
            'F2F_1F', 'F2F_1PD', 'F2F_2F', 'F2F_3F', 'F2F_4F',
            'F2F_5B', 'F2F_5F', 'F2F_6B', 'F2F_6H',
            # Live online (13)
            'LO_10H', 'LO_1F', 'LO_1PD', 'LO_2F', 'LO_2H',
            'LO_3F', 'LO_4F', 'LO_4H', 'LO_5B', 'LO_5F',
            'LO_6B', 'LO_6H', 'LO_8H',
            # Online classroom (1)
            'OC',
        }
        self.assertEqual(format_values, expected,
                         f"Expected 23 codes; got {format_values}")
        # Dropped placeholders must NOT appear
        self.assertNotIn('LIVE', format_values)
        self.assertNotIn('REC', format_values)

    def test_tutorial_location_is_nullable(self):
        """OC (Online Classroom) products have no physical venue.
        Phase 2 made tutorial_location nullable to express that.
        """
        from store.models import TutorialProduct
        field = TutorialProduct._meta.get_field('tutorial_location')
        self.assertTrue(field.null, "Phase 2: tutorial_location must be nullable for OC products")
        self.assertTrue(field.blank)

    def test_tutorial_course_template_is_nullable(self):
        """Some OC products have no matching TutorialCourseTemplate at
        backfill time. Nullable lets the backfill proceed; operators
        can fix the data later.
        """
        from store.models import TutorialProduct
        field = TutorialProduct._meta.get_field('tutorial_course_template')
        self.assertTrue(field.null,
            "Phase 2: tutorial_course_template must be nullable for backfill rows")
        self.assertTrue(field.blank)


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
