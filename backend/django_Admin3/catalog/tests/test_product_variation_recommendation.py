"""Tests for ProductVariationRecommendation model in catalog app."""
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from catalog.models import (
    Subject, ExamSession, ExamSessionSubject,
    Product, ProductVariation, ProductProductVariation,
)


class ProductVariationRecommendationImportTest(TestCase):
    """Test ProductVariationRecommendation can be imported."""

    def test_recommendation_can_be_imported_from_catalog(self):
        """Verify ProductVariationRecommendation is importable from catalog.models."""
        from catalog.models import ProductVariationRecommendation
        self.assertIsNotNone(ProductVariationRecommendation)

    def test_recommendation_table_name(self):
        """Verify model uses correct acted schema table."""
        from catalog.models import ProductVariationRecommendation
        self.assertEqual(
            ProductVariationRecommendation._meta.db_table,
            '"acted"."product_productvariation_recommendations"'
        )


class ProductVariationRecommendationModelTest(TestCase):
    """Test ProductVariationRecommendation model functionality."""

    @classmethod
    def setUpTestData(cls):
        """Set up test data for all tests."""
        cls.subject = Subject.objects.create(code='CM1', description='CM1 Subject')
        cls.exam_session = ExamSession.objects.create(
            session_code='2025-04',
            start_date=timezone.now(),
            end_date=timezone.now()
        )
        cls.ess = ExamSessionSubject.objects.create(
            exam_session=cls.exam_session,
            subject=cls.subject,
            is_active=True
        )

        # Create products
        cls.product1 = Product.objects.create(
            code='MOCK',
            shortname='Mock Exam',
            fullname='Mock Exam',
            is_active=True
        )
        cls.product2 = Product.objects.create(
            code='MARK',
            shortname='Marking Service',
            fullname='Marking Service',
            is_active=True
        )

        # Create variations - use short codes
        cls.ebook_variation = ProductVariation.objects.create(
            code='EBOO',
            name='eBook',
            variation_type='format'
        )
        cls.service_variation = ProductVariation.objects.create(
            code='SERV',
            name='Service',
            variation_type='service'
        )

        # Create product-variations
        cls.ppv_source = ProductProductVariation.objects.create(
            product=cls.product1,
            product_variation=cls.ebook_variation
        )
        cls.ppv_target = ProductProductVariation.objects.create(
            product=cls.product2,
            product_variation=cls.service_variation
        )

    def test_create_recommendation(self):
        """Test creating a valid recommendation."""
        from catalog.models import ProductVariationRecommendation
        rec = ProductVariationRecommendation.objects.create(
            product_product_variation=self.ppv_source,
            recommended_product_product_variation=self.ppv_target
        )
        self.assertEqual(rec.product_product_variation, self.ppv_source)
        self.assertEqual(rec.recommended_product_product_variation, self.ppv_target)

    def test_self_reference_validation(self):
        """Test that self-referencing recommendations are rejected."""
        from catalog.models import ProductVariationRecommendation
        with self.assertRaises(ValidationError):
            ProductVariationRecommendation.objects.create(
                product_product_variation=self.ppv_source,
                recommended_product_product_variation=self.ppv_source
            )


class ProductVariationRecommendationAdminTest(TestCase):
    """Test ProductVariationRecommendation admin registration."""

    def test_recommendation_registered_in_admin(self):
        """Verify model is registered in Django admin."""
        from django.contrib import admin
        from catalog.models import ProductVariationRecommendation
        self.assertIn(ProductVariationRecommendation, admin.site._registry)
