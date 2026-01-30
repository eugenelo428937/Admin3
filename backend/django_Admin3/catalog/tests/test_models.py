"""Tests for catalog model imports and structure.

TDD RED Phase: These tests MUST FAIL initially until models are implemented.
"""
from django.test import TestCase


class TestCatalogModelImports(TestCase):
    """Test that all catalog models can be imported from catalog.models."""

    def test_import_subject(self):
        """Test Subject model can be imported from catalog.models."""
        from catalog.models import Subject
        self.assertTrue(hasattr(Subject, '_meta'))
        self.assertEqual(Subject._meta.db_table, '"acted"."catalog_subjects"')

    def test_import_exam_session(self):
        """Test ExamSession model can be imported from catalog.models."""
        from catalog.models import ExamSession
        self.assertTrue(hasattr(ExamSession, '_meta'))
        self.assertEqual(ExamSession._meta.db_table, '"acted"."catalog_exam_sessions"')

    def test_import_product(self):
        """Test Product model can be imported from catalog.models."""
        from catalog.models import Product
        self.assertTrue(hasattr(Product, '_meta'))
        self.assertEqual(Product._meta.db_table, '"acted"."catalog_products"')

    def test_import_product_variation(self):
        """Test ProductVariation model can be imported from catalog.models."""
        from catalog.models import ProductVariation
        self.assertTrue(hasattr(ProductVariation, '_meta'))
        self.assertEqual(ProductVariation._meta.db_table, '"acted"."catalog_product_variations"')

    def test_import_product_bundle(self):
        """Test ProductBundle model can be imported from catalog.models."""
        from catalog.models import ProductBundle
        self.assertTrue(hasattr(ProductBundle, '_meta'))
        self.assertEqual(ProductBundle._meta.db_table, '"acted"."catalog_product_bundles"')

    def test_import_product_product_variation(self):
        """Test ProductProductVariation junction can be imported from catalog.models."""
        from catalog.models import ProductProductVariation
        self.assertTrue(hasattr(ProductProductVariation, '_meta'))
        self.assertEqual(ProductProductVariation._meta.db_table, '"acted"."catalog_product_product_variations"')

    def test_import_product_product_group(self):
        """Test ProductProductGroup junction can be imported from catalog.models."""
        from catalog.models import ProductProductGroup
        self.assertTrue(hasattr(ProductProductGroup, '_meta'))
        self.assertEqual(ProductProductGroup._meta.db_table, '"acted"."filter_product_product_groups"')

    def test_import_product_bundle_product(self):
        """Test ProductBundleProduct junction can be imported from catalog.models."""
        from catalog.models import ProductBundleProduct
        self.assertTrue(hasattr(ProductBundleProduct, '_meta'))
        self.assertEqual(ProductBundleProduct._meta.db_table, '"acted"."catalog_product_bundle_products"')

    def test_single_import_all_models(self):
        """Test all 8 models can be imported in a single statement."""
        from catalog.models import (
            Subject,
            ExamSession,
            Product,
            ProductVariation,
            ProductBundle,
            ProductProductVariation,
            ProductProductGroup,
            ProductBundleProduct,
        )
        # Verify all models are Django models
        self.assertEqual(len([Subject, ExamSession, Product, ProductVariation,
                              ProductBundle, ProductProductVariation,
                              ProductProductGroup, ProductBundleProduct]), 8)


class TestSubjectModel(TestCase):
    """Test Subject model fields and constraints."""

    def test_subject_fields(self):
        """Test Subject model has required fields."""
        from catalog.models import Subject
        field_names = [f.name for f in Subject._meta.get_fields()]
        self.assertIn('code', field_names)
        self.assertIn('description', field_names)
        self.assertIn('active', field_names)
        self.assertIn('created_at', field_names)
        self.assertIn('updated_at', field_names)

    def test_subject_code_unique(self):
        """Test Subject code field has unique constraint."""
        from catalog.models import Subject
        code_field = Subject._meta.get_field('code')
        self.assertTrue(code_field.unique)

    def test_subject_ordering(self):
        """Test Subject default ordering is by code."""
        from catalog.models import Subject
        self.assertEqual(Subject._meta.ordering, ['code'])


class TestExamSessionModel(TestCase):
    """Test ExamSession model fields and constraints."""

    def test_exam_session_fields(self):
        """Test ExamSession model has required fields."""
        from catalog.models import ExamSession
        field_names = [f.name for f in ExamSession._meta.get_fields()]
        self.assertIn('session_code', field_names)
        self.assertIn('start_date', field_names)
        self.assertIn('end_date', field_names)
        self.assertIn('create_date', field_names)
        self.assertIn('modified_date', field_names)


class TestProductModel(TestCase):
    """Test Product model fields and relationships."""

    def test_product_fields(self):
        """Test Product model has required fields."""
        from catalog.models import Product
        field_names = [f.name for f in Product._meta.get_fields()]
        self.assertIn('fullname', field_names)
        self.assertIn('shortname', field_names)
        self.assertIn('description', field_names)
        self.assertIn('code', field_names)
        self.assertIn('is_active', field_names)
        self.assertIn('buy_both', field_names)
        self.assertIn('created_at', field_names)
        self.assertIn('updated_at', field_names)

    def test_product_ordering(self):
        """Test Product default ordering is by shortname."""
        from catalog.models import Product
        self.assertEqual(Product._meta.ordering, ['shortname'])


class TestProductVariationModel(TestCase):
    """Test ProductVariation model fields and constraints."""

    def test_product_variation_fields(self):
        """Test ProductVariation model has required fields."""
        from catalog.models import ProductVariation
        field_names = [f.name for f in ProductVariation._meta.get_fields()]
        self.assertIn('variation_type', field_names)
        self.assertIn('name', field_names)
        self.assertIn('description', field_names)
        self.assertIn('description_short', field_names)
        self.assertIn('code', field_names)

    def test_product_variation_type_choices(self):
        """Test ProductVariation variation_type has correct choices."""
        from catalog.models import ProductVariation
        variation_type_field = ProductVariation._meta.get_field('variation_type')
        choices = [c[0] for c in variation_type_field.choices]
        self.assertIn('eBook', choices)
        self.assertIn('Hub', choices)
        self.assertIn('Printed', choices)
        self.assertIn('Marking', choices)
        self.assertIn('Tutorial', choices)

    def test_product_variation_unique_together(self):
        """Test ProductVariation has unique_together constraint."""
        from catalog.models import ProductVariation
        # Check unique_together or UniqueConstraint
        constraints = ProductVariation._meta.unique_together
        self.assertIn(('variation_type', 'name'), constraints)


class TestProductBundleModel(TestCase):
    """Test ProductBundle model fields and relationships."""

    def test_product_bundle_fields(self):
        """Test ProductBundle model has required fields."""
        from catalog.models import ProductBundle
        field_names = [f.name for f in ProductBundle._meta.get_fields()]
        self.assertIn('bundle_name', field_names)
        self.assertIn('subject', field_names)
        self.assertIn('bundle_description', field_names)
        self.assertIn('is_featured', field_names)
        self.assertIn('is_active', field_names)
        self.assertIn('display_order', field_names)
        self.assertIn('created_at', field_names)
        self.assertIn('updated_at', field_names)

    def test_product_bundle_subject_fk(self):
        """Test ProductBundle has foreign key to Subject."""
        from catalog.models import ProductBundle, Subject
        subject_field = ProductBundle._meta.get_field('subject')
        self.assertEqual(subject_field.related_model, Subject)


class TestJunctionModels(TestCase):
    """Test junction table models."""

    def test_product_product_variation_unique_together(self):
        """Test ProductProductVariation has unique_together constraint."""
        from catalog.models import ProductProductVariation
        constraints = ProductProductVariation._meta.unique_together
        self.assertIn(('product', 'product_variation'), constraints)

    def test_product_product_group_unique_together(self):
        """Test ProductProductGroup has unique_together constraint."""
        from catalog.models import ProductProductGroup
        constraints = ProductProductGroup._meta.unique_together
        self.assertIn(('product', 'product_group'), constraints)

    def test_product_bundle_product_unique_together(self):
        """Test ProductBundleProduct has unique_together constraint."""
        from catalog.models import ProductBundleProduct
        constraints = ProductBundleProduct._meta.unique_together
        self.assertIn(('bundle', 'product_product_variation'), constraints)

    def test_product_bundle_product_fields(self):
        """Test ProductBundleProduct has all required fields."""
        from catalog.models import ProductBundleProduct
        field_names = [f.name for f in ProductBundleProduct._meta.get_fields()]
        self.assertIn('bundle', field_names)
        self.assertIn('product_product_variation', field_names)
        self.assertIn('default_price_type', field_names)
        self.assertIn('quantity', field_names)
        self.assertIn('sort_order', field_names)
        self.assertIn('is_active', field_names)
        self.assertIn('created_at', field_names)
        self.assertIn('updated_at', field_names)
