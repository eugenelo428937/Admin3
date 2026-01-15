from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db.utils import IntegrityError
from catalog.models import Product, ProductVariation, ProductProductVariation, ProductVariationRecommendation


class ProductVariationRecommendationTestCase(TestCase):
    """Test suite for ProductVariationRecommendation model."""

    def setUp(self):
        """Set up test data."""
        # Create products
        self.mock_exam_product = Product.objects.create(
            code='M1',
            fullname='Mock Exam',
            shortname='Mock Exam'
        )
        self.marking_product = Product.objects.create(
            code='M1MRK',
            fullname='Mock Exam Marking',
            shortname='Marking'
        )
        self.study_material_product = Product.objects.create(
            code='SM1',
            fullname='Study Material',
            shortname='Study Material'
        )

        # Create product variations (generic types)
        self.ebook_variation = ProductVariation.objects.create(
            variation_type='eBook',
            name='eBook'
        )
        self.marking_variation = ProductVariation.objects.create(
            variation_type='Marking',
            name='Marking'
        )
        self.printed_variation = ProductVariation.objects.create(
            variation_type='Printed',
            name='Printed'
        )

        # Create product-variation combinations (actual offerings)
        self.ppv1 = ProductProductVariation.objects.create(
            product=self.mock_exam_product,
            product_variation=self.ebook_variation
        )
        self.ppv2 = ProductProductVariation.objects.create(
            product=self.marking_product,
            product_variation=self.marking_variation
        )
        self.ppv3 = ProductProductVariation.objects.create(
            product=self.study_material_product,
            product_variation=self.printed_variation
        )

    def test_create_recommendation(self):
        """Test creating a valid recommendation."""
        rec = ProductVariationRecommendation.objects.create(
            product_product_variation=self.ppv1,
            recommended_product_product_variation=self.ppv2
        )
        self.assertEqual(rec.product_product_variation, self.ppv1)
        self.assertEqual(rec.recommended_product_product_variation, self.ppv2)
        self.assertIsNotNone(rec.created_at)
        self.assertIsNotNone(rec.updated_at)

    def test_one_to_one_constraint(self):
        """Test that OneToOneField prevents duplicate source variations."""
        ProductVariationRecommendation.objects.create(
            product_product_variation=self.ppv1,
            recommended_product_product_variation=self.ppv2
        )

        # Attempting to create another recommendation with same source should fail
        with self.assertRaises(IntegrityError):
            ProductVariationRecommendation.objects.create(
                product_product_variation=self.ppv1,
                recommended_product_product_variation=self.ppv3
            )

    def test_prevent_self_reference(self):
        """Test that a product-variation combination cannot recommend itself."""
        rec = ProductVariationRecommendation(
            product_product_variation=self.ppv1,
            recommended_product_product_variation=self.ppv1
        )
        with self.assertRaises(ValidationError) as context:
            rec.clean()

        self.assertIn('cannot recommend itself', str(context.exception))

    def test_prevent_circular_recommendations(self):
        """Test that circular recommendations are prevented."""
        # Create recommendation A → B
        ProductVariationRecommendation.objects.create(
            product_product_variation=self.ppv1,
            recommended_product_product_variation=self.ppv2
        )

        # Attempting to create B → A should fail validation
        rec = ProductVariationRecommendation(
            product_product_variation=self.ppv2,
            recommended_product_product_variation=self.ppv1
        )
        with self.assertRaises(ValidationError) as context:
            rec.clean()

        self.assertIn('Circular recommendation detected', str(context.exception))

    def test_cascade_deletion_source(self):
        """Test that deleting source variation cascades to recommendation."""
        rec = ProductVariationRecommendation.objects.create(
            product_product_variation=self.ppv1,
            recommended_product_product_variation=self.ppv2
        )
        rec_id = rec.id

        # Delete source product-variation combination
        self.ppv1.delete()

        # Recommendation should be deleted
        self.assertFalse(
            ProductVariationRecommendation.objects.filter(id=rec_id).exists()
        )

    def test_cascade_deletion_target(self):
        """Test that deleting target variation cascades to recommendation."""
        rec = ProductVariationRecommendation.objects.create(
            product_product_variation=self.ppv1,
            recommended_product_product_variation=self.ppv2
        )
        rec_id = rec.id

        # Delete target product-variation combination
        self.ppv2.delete()

        # Recommendation should be deleted
        self.assertFalse(
            ProductVariationRecommendation.objects.filter(id=rec_id).exists()
        )

    def test_multiple_variations_can_recommend_same_target(self):
        """Test that multiple product-variation combinations can recommend the same target."""
        # ppv1 → ppv3
        rec1 = ProductVariationRecommendation.objects.create(
            product_product_variation=self.ppv1,
            recommended_product_product_variation=self.ppv3
        )

        # ppv2 → ppv3 (same target)
        rec2 = ProductVariationRecommendation.objects.create(
            product_product_variation=self.ppv2,
            recommended_product_product_variation=self.ppv3
        )

        self.assertEqual(rec1.recommended_product_product_variation, rec2.recommended_product_product_variation)
        self.assertEqual(
            ProductVariationRecommendation.objects.filter(
                recommended_product_product_variation=self.ppv3
            ).count(),
            2
        )

    def test_string_representation(self):
        """Test __str__ method."""
        rec = ProductVariationRecommendation.objects.create(
            product_product_variation=self.ppv1,
            recommended_product_product_variation=self.ppv2
        )
        str_rep = str(rec)
        # Should contain product names and variation types
        self.assertIn('Mock Exam', str_rep)
        self.assertIn('eBook', str_rep)
        self.assertIn('Marking', str_rep)
