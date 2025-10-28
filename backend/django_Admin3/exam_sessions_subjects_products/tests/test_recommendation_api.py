from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from products.models import Product, ProductVariation, ProductVariationRecommendation, ProductProductVariation
from exam_sessions.models import ExamSession
from subjects.models import Subject
from exam_sessions_subjects.models import ExamSessionSubject
from exam_sessions_subjects_products.models import (
    ExamSessionSubjectProduct,
    ExamSessionSubjectProductVariation,
    Price
)

User = get_user_model()


class RecommendationAPITestCase(APITestCase):
    """Test suite for product recommendation API functionality."""

    def setUp(self):
        """Set up test data."""
        # Clear cache to prevent test pollution
        from django.core.cache import cache
        cache.clear()

        # Create user for authentication
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

        # Create exam session
        from django.utils import timezone
        self.exam_session = ExamSession.objects.create(
            session_code='2025S1',
            start_date=timezone.make_aware(timezone.datetime(2025, 1, 1)),
            end_date=timezone.make_aware(timezone.datetime(2025, 6, 30))
        )

        # Create subject
        self.subject = Subject.objects.create(
            code='CB1',
            description='Business Finance'
        )

        # Create exam session subject
        self.exam_session_subject = ExamSessionSubject.objects.create(
            exam_session=self.exam_session,
            subject=self.subject
        )

        # Create products
        self.mock_exam_product = Product.objects.create(
            code='M1',
            fullname='Mock Exam',
            shortname='Mock Exam',
            buy_both=False
        )

        self.marking_product = Product.objects.create(
            code='M1MRK',
            fullname='Mock Exam Marking',
            shortname='Marking',
            buy_both=False
        )

        # Create product variations
        self.mock_exam_variation = ProductVariation.objects.create(
            variation_type='eBook',
            name='Mock Exam eBook'
        )

        self.marking_variation = ProductVariation.objects.create(
            variation_type='Marking',
            name='Mock Exam Marking Service'
        )

        # Create ExamSessionSubjectProducts
        self.essp_mock = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product=self.mock_exam_product
        )

        self.essp_marking = ExamSessionSubjectProduct.objects.create(
            exam_session_subject=self.exam_session_subject,
            product=self.marking_product
        )

        # Create ProductProductVariations
        self.ppv_mock = ProductProductVariation.objects.create(
            product=self.mock_exam_product,
            product_variation=self.mock_exam_variation
        )

        self.ppv_marking = ProductProductVariation.objects.create(
            product=self.marking_product,
            product_variation=self.marking_variation
        )

        # Create ExamSessionSubjectProductVariations
        self.esspv_mock = ExamSessionSubjectProductVariation.objects.create(
            exam_session_subject_product=self.essp_mock,
            product_product_variation=self.ppv_mock
        )

        self.esspv_marking = ExamSessionSubjectProductVariation.objects.create(
            exam_session_subject_product=self.essp_marking,
            product_product_variation=self.ppv_marking
        )

        # Create prices
        Price.objects.create(
            variation=self.esspv_mock,
            price_type='standard',
            amount=16.00,
            currency='GBP'
        )

        Price.objects.create(
            variation=self.esspv_marking,
            price_type='standard',
            amount=73.00,
            currency='GBP'
        )

    def test_search_api_includes_recommended_product_when_exists(self):
        """Test that API includes recommended_product field when recommendation exists."""
        # Create recommendation: mock exam ppv → marking ppv
        ProductVariationRecommendation.objects.create(
            product_product_variation=self.ppv_mock,
            recommended_product_product_variation=self.ppv_marking
        )

        response = self.client.get(
            '/api/exam-sessions-subjects-products/list/',
            {'subject': [self.subject.code]}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Find the mock exam product in response (list endpoint returns 'results')
        mock_product = None
        for product in data.get('results', []):
            if product['product_code'] == 'M1':
                mock_product = product
                break

        self.assertIsNotNone(mock_product, "Mock exam product not found in response")

        # Check variation has recommended_product
        variation = mock_product['variations'][0] if mock_product['variations'] else None
        self.assertIsNotNone(variation, "No variations found")
        self.assertIn('recommended_product', variation, "recommended_product field missing")

        recommended = variation['recommended_product']
        self.assertIsNotNone(recommended, "recommended_product should not be None")
        self.assertEqual(recommended['product_code'], 'M1MRK')
        self.assertEqual(recommended['variation_type'], 'Marking')
        self.assertIn('prices', recommended)
        self.assertEqual(len(recommended['prices']), 1)
        self.assertEqual(recommended['prices'][0]['amount'], 73.00)

    def test_search_api_omits_recommended_product_when_none(self):
        """Test backward compatibility - API works without recommendations."""
        # No recommendation created

        response = self.client.get(
            '/api/exam-sessions-subjects-products/list/',
            {'subject': [self.subject.code]}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # API should work normally
        self.assertIn('results', data)
        self.assertGreater(len(data['results']), 0)

        # Variations should either omit recommended_product or have it as null
        for product in data['results']:
            for variation in product.get('variations', []):
                recommended = variation.get('recommended_product')
                # Either field doesn't exist or is None (both are backward compatible)
                if recommended is not None:
                    self.fail("recommended_product should be None when no recommendation exists")

    def test_search_api_response_schema(self):
        """Test that recommended_product follows correct schema structure."""
        # Create recommendation
        ProductVariationRecommendation.objects.create(
            product_product_variation=self.ppv_mock,
            recommended_product_product_variation=self.ppv_marking
        )

        response = self.client.get(
            '/api/exam-sessions-subjects-products/list/',
            {'subject': [self.subject.code]}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Find product with recommendation
        for product in data.get('results', []):
            if product['product_code'] == 'M1':
                variation = product['variations'][0]
                recommended = variation.get('recommended_product')

                if recommended:
                    # Validate schema
                    required_fields = [
                        'essp_id', 'esspv_id', 'product_code',
                        'product_name', 'product_short_name',
                        'variation_type', 'prices'
                    ]
                    for field in required_fields:
                        self.assertIn(
                            field, recommended,
                            f"Required field '{field}' missing from recommended_product"
                        )

                    # Validate prices structure
                    self.assertIsInstance(recommended['prices'], list)
                    if recommended['prices']:
                        price = recommended['prices'][0]
                        price_fields = ['price_type', 'amount', 'currency']
                        for field in price_fields:
                            self.assertIn(
                                field, price,
                                f"Required field '{field}' missing from price"
                            )
                break

    def test_multiple_products_without_breaking_api(self):
        """Test that API handles multiple products with mixed recommendation states."""
        # Only create recommendation for mock exam, not marking
        ProductVariationRecommendation.objects.create(
            product_product_variation=self.ppv_mock,
            recommended_product_product_variation=self.ppv_marking
        )

        response = self.client.get(
            '/api/exam-sessions-subjects-products/list/',
            {'subject': [self.subject.code]}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()

        # Should return both products
        self.assertGreaterEqual(len(data.get('results', [])), 2)

        # One should have recommendation, one should not
        has_recommendation = False
        no_recommendation = False

        for product in data['results']:
            for variation in product.get('variations', []):
                recommended = variation.get('recommended_product')
                if recommended:
                    has_recommendation = True
                else:
                    no_recommendation = True

        self.assertTrue(has_recommendation, "At least one product should have recommendation")
        self.assertTrue(no_recommendation, "At least one product should not have recommendation")
