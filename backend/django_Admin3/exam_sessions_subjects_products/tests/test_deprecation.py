"""Tests for deprecation warnings in exam_sessions_subjects_products app.

These tests verify that:
1. Legacy imports still work (backward compatibility)
2. Deprecation warnings are properly configured
3. Models point to the correct database tables

TDD: These tests ensure the deprecation wrapper is working correctly.
"""
import warnings
from django.test import TestCase


class TestESSPDeprecationWrapper(TestCase):
    """Test that ESSP imports work with deprecation notices."""

    def test_import_essp_from_models(self):
        """Verify ExamSessionSubjectProduct can be imported from essp.models."""
        from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
        self.assertIsNotNone(ExamSessionSubjectProduct)
        self.assertEqual(
            ExamSessionSubjectProduct._meta.db_table,
            'acted_exam_session_subject_products'
        )

    def test_import_esspv_from_models(self):
        """Verify ExamSessionSubjectProductVariation can be imported from essp.models."""
        from exam_sessions_subjects_products.models import ExamSessionSubjectProductVariation
        self.assertIsNotNone(ExamSessionSubjectProductVariation)
        self.assertEqual(
            ExamSessionSubjectProductVariation._meta.db_table,
            'acted_exam_session_subject_product_variations'
        )

    def test_import_price_from_models(self):
        """Verify Price can be imported from essp.models."""
        from exam_sessions_subjects_products.models import Price
        self.assertIsNotNone(Price)
        self.assertEqual(
            Price._meta.db_table,
            'acted_exam_session_subject_product_variation_price'
        )

    def test_essp_has_fk_to_catalog_ess(self):
        """Verify ESSP's exam_session_subject FK points to catalog.ExamSessionSubject."""
        from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
        fk_field = ExamSessionSubjectProduct._meta.get_field('exam_session_subject')
        self.assertEqual(fk_field.related_model._meta.app_label, 'catalog')
        self.assertEqual(fk_field.related_model._meta.model_name, 'examsessionsubject')

    def test_essp_has_fk_to_catalog_product(self):
        """Verify ESSP's product FK points to catalog.Product."""
        from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
        fk_field = ExamSessionSubjectProduct._meta.get_field('product')
        self.assertEqual(fk_field.related_model._meta.app_label, 'catalog')
        self.assertEqual(fk_field.related_model._meta.model_name, 'product')

    def test_esspv_has_fk_to_catalog_ppv(self):
        """Verify ESSPV's product_product_variation FK points to catalog.ProductProductVariation."""
        from exam_sessions_subjects_products.models import ExamSessionSubjectProductVariation
        fk_field = ExamSessionSubjectProductVariation._meta.get_field('product_product_variation')
        self.assertEqual(fk_field.related_model._meta.app_label, 'catalog')
        self.assertEqual(fk_field.related_model._meta.model_name, 'productproductvariation')


class TestCatalogImportsWorkCorrectly(TestCase):
    """Test that importing from catalog works correctly (T043)."""

    def test_import_exam_session_subject_from_catalog(self):
        """Verify ExamSessionSubject can be imported from catalog.models."""
        from catalog.models import ExamSessionSubject
        self.assertIsNotNone(ExamSessionSubject)
        self.assertEqual(
            ExamSessionSubject._meta.db_table,
            '"acted"."catalog_exam_session_subjects"'
        )

    def test_import_product_from_catalog(self):
        """Verify Product can be imported from catalog.models."""
        from catalog.models import Product
        self.assertIsNotNone(Product)
        self.assertEqual(
            Product._meta.db_table,
            '"acted"."catalog_products"'
        )

    def test_import_product_variation_from_catalog(self):
        """Verify ProductVariation can be imported from catalog.models."""
        from catalog.models import ProductVariation
        self.assertIsNotNone(ProductVariation)
        self.assertEqual(
            ProductVariation._meta.db_table,
            '"acted"."catalog_product_variations"'
        )

    def test_import_product_product_variation_from_catalog(self):
        """Verify ProductProductVariation can be imported from catalog.models."""
        from catalog.models import ProductProductVariation
        self.assertIsNotNone(ProductProductVariation)
        self.assertEqual(
            ProductProductVariation._meta.db_table,
            '"acted"."catalog_product_product_variations"'
        )

    def test_import_subject_from_catalog(self):
        """Verify Subject can be imported from catalog.models."""
        from catalog.models import Subject
        self.assertIsNotNone(Subject)
        self.assertEqual(
            Subject._meta.db_table,
            '"acted"."catalog_subjects"'
        )

    def test_import_exam_session_from_catalog(self):
        """Verify ExamSession can be imported from catalog.models."""
        from catalog.models import ExamSession
        self.assertIsNotNone(ExamSession)
        self.assertEqual(
            ExamSession._meta.db_table,
            '"acted"."catalog_exam_sessions"'
        )


class TestStoreImportsWorkCorrectly(TestCase):
    """Test that importing from store works correctly for cart operations."""

    def test_import_store_product(self):
        """Verify Product can be imported from store.models."""
        from store.models import Product
        self.assertIsNotNone(Product)
        self.assertEqual(
            Product._meta.db_table,
            '"acted"."products"'
        )

    def test_store_product_has_fk_to_catalog_ess(self):
        """Verify store.Product's exam_session_subject FK points to catalog.ExamSessionSubject."""
        from store.models import Product
        fk_field = Product._meta.get_field('exam_session_subject')
        self.assertEqual(fk_field.related_model._meta.app_label, 'catalog')
        self.assertEqual(fk_field.related_model._meta.model_name, 'examsessionsubject')

    def test_store_product_has_fk_to_catalog_ppv(self):
        """Verify store.Product's product_product_variation FK points to catalog.ProductProductVariation."""
        from store.models import Product
        fk_field = Product._meta.get_field('product_product_variation')
        self.assertEqual(fk_field.related_model._meta.app_label, 'catalog')
        self.assertEqual(fk_field.related_model._meta.model_name, 'productproductvariation')


class TestLegacyAPIDeprecationHeaders(TestCase):
    """Test that legacy ESSP API responses include deprecation headers (T079).

    The Strangler Fig pattern adds HTTP headers to notify consumers that
    the API is deprecated and will be removed.
    """

    def test_deprecation_mixin_imports(self):
        """Verify deprecation module can be imported."""
        from exam_sessions_subjects_products.deprecation import (
            DeprecatedAPIMixin,
            deprecated_endpoint,
            add_deprecation_notice,
            DEPRECATION_DATE,
            SUNSET_DATE,
        )
        self.assertIsNotNone(DeprecatedAPIMixin)
        self.assertIsNotNone(deprecated_endpoint)
        self.assertIsNotNone(add_deprecation_notice)
        self.assertEqual(DEPRECATION_DATE, "2025-01-01")
        self.assertEqual(SUNSET_DATE, "2025-06-01")

    def test_add_deprecation_notice_to_dict(self):
        """Verify add_deprecation_notice adds notice to dict data."""
        from exam_sessions_subjects_products.deprecation import add_deprecation_notice

        data = {'results': [1, 2, 3]}
        modified = add_deprecation_notice(data, message="Test message", successor_url="/api/new/")

        self.assertIn('_deprecation', modified)
        self.assertTrue(modified['_deprecation']['deprecated'])
        self.assertEqual(modified['_deprecation']['message'], "Test message")
        self.assertEqual(modified['_deprecation']['successor_url'], "/api/new/")

    def test_add_deprecation_notice_to_list(self):
        """Verify add_deprecation_notice wraps list data."""
        from exam_sessions_subjects_products.deprecation import add_deprecation_notice

        data = [1, 2, 3]
        modified = add_deprecation_notice(data)

        self.assertIn('_deprecation', modified)
        self.assertIn('results', modified)
        self.assertEqual(modified['results'], [1, 2, 3])
        self.assertTrue(modified['_deprecation']['deprecated'])

    def test_essp_viewset_has_deprecated_mixin(self):
        """Verify ExamSessionSubjectProductViewSet uses DeprecatedAPIMixin."""
        from exam_sessions_subjects_products.views import ExamSessionSubjectProductViewSet
        from exam_sessions_subjects_products.deprecation import DeprecatedAPIMixin

        self.assertTrue(
            issubclass(ExamSessionSubjectProductViewSet, DeprecatedAPIMixin),
            "ExamSessionSubjectProductViewSet should inherit from DeprecatedAPIMixin"
        )

    def test_essp_viewset_has_deprecation_attributes(self):
        """Verify ESSP ViewSet has deprecation configuration attributes."""
        from exam_sessions_subjects_products.views import ExamSessionSubjectProductViewSet

        self.assertTrue(hasattr(ExamSessionSubjectProductViewSet, 'deprecation_message'))
        self.assertTrue(hasattr(ExamSessionSubjectProductViewSet, 'successor_url'))
        self.assertEqual(ExamSessionSubjectProductViewSet.successor_url, "/api/store/")
