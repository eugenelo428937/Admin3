"""Tests for backward compatibility re-exports.

These tests verify that models can still be imported from their original
app locations after being moved to the catalog app. This maintains backward
compatibility with existing code that imports from subjects, exam_sessions,
and products apps.

TDD RED Phase: These tests should FAIL until re-exports are implemented in T020-T022.
"""
from django.test import TestCase


class TestSubjectsBackwardCompat(TestCase):
    """Test that Subject can be imported from subjects app."""

    def test_import_subject_from_subjects_models(self):
        """Verify Subject can be imported from subjects.models."""
        from subjects.models import Subject
        self.assertIsNotNone(Subject)
        self.assertEqual(Subject._meta.db_table, '"acted"."catalog_subjects"')

    def test_subject_is_same_class(self):
        """Verify imported Subject is the same class as catalog.Subject."""
        from subjects.models import Subject as SubjectsSubject
        from catalog.models import Subject as CatalogSubject
        self.assertIs(SubjectsSubject, CatalogSubject)


class TestExamSessionsBackwardCompat(TestCase):
    """Test that ExamSession can be imported from exam_sessions app."""

    def test_import_exam_session_from_exam_sessions_models(self):
        """Verify ExamSession can be imported from exam_sessions.models."""
        from exam_sessions.models import ExamSession
        self.assertIsNotNone(ExamSession)
        self.assertEqual(ExamSession._meta.db_table, '"acted"."catalog_exam_sessions"')

    def test_exam_session_is_same_class(self):
        """Verify imported ExamSession is the same class as catalog.ExamSession."""
        from exam_sessions.models import ExamSession as ESExamSession
        from catalog.models import ExamSession as CatalogExamSession
        self.assertIs(ESExamSession, CatalogExamSession)


class TestProductsBackwardCompat(TestCase):
    """Test that product models can be imported from products app."""

    def test_import_product_from_products_models(self):
        """Verify Product can be imported from products.models."""
        from products.models import Product
        self.assertIsNotNone(Product)
        self.assertEqual(Product._meta.db_table, '"acted"."catalog_products"')

    def test_import_product_variation_from_products_models(self):
        """Verify ProductVariation can be imported from products.models."""
        from products.models import ProductVariation
        self.assertIsNotNone(ProductVariation)
        self.assertEqual(ProductVariation._meta.db_table, '"acted"."catalog_product_variations"')

    def test_import_product_product_variation_from_products_models(self):
        """Verify ProductProductVariation can be imported from products.models."""
        from products.models import ProductProductVariation
        self.assertIsNotNone(ProductProductVariation)
        self.assertEqual(ProductProductVariation._meta.db_table, '"acted"."catalog_product_product_variations"')

    def test_import_product_product_group_from_products_models(self):
        """Verify ProductProductGroup can be imported from products.models."""
        from products.models import ProductProductGroup
        self.assertIsNotNone(ProductProductGroup)
        self.assertEqual(ProductProductGroup._meta.db_table, '"acted"."catalog_product_product_groups"')

    def test_import_product_bundle_from_products_models(self):
        """Verify ProductBundle can be imported from products.models."""
        from products.models import ProductBundle
        self.assertIsNotNone(ProductBundle)
        self.assertEqual(ProductBundle._meta.db_table, '"acted"."catalog_product_bundles"')

    def test_import_product_bundle_product_from_products_models(self):
        """Verify ProductBundleProduct can be imported from products.models."""
        from products.models import ProductBundleProduct
        self.assertIsNotNone(ProductBundleProduct)
        self.assertEqual(ProductBundleProduct._meta.db_table, '"acted"."catalog_product_bundle_products"')

    def test_product_is_same_class(self):
        """Verify imported Product is the same class as catalog.Product."""
        from products.models import Product as ProductsProduct
        from catalog.models import Product as CatalogProduct
        self.assertIs(ProductsProduct, CatalogProduct)

    def test_product_variation_is_same_class(self):
        """Verify imported ProductVariation is the same class as catalog.ProductVariation."""
        from products.models import ProductVariation as ProductsProductVariation
        from catalog.models import ProductVariation as CatalogProductVariation
        self.assertIs(ProductsProductVariation, CatalogProductVariation)
