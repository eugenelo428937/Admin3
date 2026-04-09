"""Tests for the legacy product search API endpoint."""
from django.test import TestCase
from rest_framework.test import APIClient

from legacy.models import LegacyProduct


class LegacyProductSearchViewTest(TestCase):
    """Tests for GET /api/legacy/products/."""

    @classmethod
    def setUpTestData(cls):
        """Seed a handful of legacy products for search tests."""
        cls.products = LegacyProduct.objects.bulk_create([
            LegacyProduct(
                subject_code='CM2', delivery_format='P',
                product_template_code='N', session_code='20',
                full_code='CM2/PN/20',
                legacy_product_name='Course Notes',
                short_name='Course Notes',
                normalized_name='Course Notes',
                source_file='test.csv', source_line=1,
            ),
            LegacyProduct(
                subject_code='CM2', delivery_format='C',
                product_template_code='N', session_code='20',
                full_code='CM2/CN/20',
                legacy_product_name='Course Notes eBook',
                short_name='Course Notes eBook',
                normalized_name='Course Notes',
                source_file='test.csv', source_line=2,
            ),
            LegacyProduct(
                subject_code='CB1', delivery_format='P',
                product_template_code='C', session_code='25',
                full_code='CB1/PC/25',
                legacy_product_name='Combined Materials Pack',
                short_name='CMP',
                normalized_name='Combined Materials Pack',
                source_file='test.csv', source_line=3,
            ),
            LegacyProduct(
                subject_code='SA1', delivery_format='M',
                product_template_code='X', session_code='95',
                full_code='SA1/MX/95',
                legacy_product_name='Series X Assignments (Marking)',
                short_name='X Marking',
                normalized_name='Series X Assignments',
                source_file='test.csv', source_line=4,
            ),
            LegacyProduct(
                subject_code='CM2', delivery_format='T',
                product_template_code='D', session_code='20',
                full_code='CM2/TD/20',
                legacy_product_name='Regular Tutorial Course (E1, 6 days)',
                short_name='Tutorial',
                normalized_name='Regular Tutorial Course',
                source_file='test.csv', source_line=5,
            ),
        ])

    def setUp(self):
        self.client = APIClient()
        self.url = '/api/legacy/products/'

    # --- Basic ---

    def test_returns_200(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_returns_all_products_without_filters(self):
        response = self.client.get(self.url)
        self.assertEqual(response.data['count'], 5)

    def test_response_contains_expected_fields(self):
        response = self.client.get(self.url)
        result = response.data['results'][0]
        expected_fields = {
            'id', 'subject_code', 'delivery_format',
            'product_template_code', 'session_code', 'full_code',
            'legacy_product_name', 'short_name', 'normalized_name',
        }
        self.assertEqual(set(result.keys()), expected_fields)

    # --- Text search (q parameter) ---

    def test_search_by_normalized_name(self):
        response = self.client.get(self.url, {'q': 'Course Notes'})
        self.assertEqual(response.data['count'], 2)

    def test_search_by_raw_fullname(self):
        response = self.client.get(self.url, {'q': 'eBook'})
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(
            response.data['results'][0]['legacy_product_name'],
            'Course Notes eBook',
        )

    def test_search_by_full_code(self):
        response = self.client.get(self.url, {'q': 'SA1/MX'})
        self.assertEqual(response.data['count'], 1)

    def test_search_case_insensitive(self):
        response = self.client.get(self.url, {'q': 'course notes'})
        self.assertEqual(response.data['count'], 2)

    def test_search_no_match_returns_empty(self):
        response = self.client.get(self.url, {'q': 'nonexistent'})
        self.assertEqual(response.data['count'], 0)

    # --- Exact filters ---

    def test_filter_by_subject(self):
        response = self.client.get(self.url, {'subject': 'CM2'})
        self.assertEqual(response.data['count'], 3)

    def test_filter_by_session(self):
        response = self.client.get(self.url, {'session': '95'})
        self.assertEqual(response.data['count'], 1)

    def test_filter_by_delivery(self):
        response = self.client.get(self.url, {'delivery': 'M'})
        self.assertEqual(response.data['count'], 1)

    # --- Combined filters ---

    def test_search_with_subject_filter(self):
        response = self.client.get(self.url, {'q': 'Course Notes', 'subject': 'CM2'})
        self.assertEqual(response.data['count'], 2)

    def test_search_with_subject_filter_narrows(self):
        response = self.client.get(self.url, {'q': 'Course Notes', 'subject': 'CB1'})
        self.assertEqual(response.data['count'], 0)

    def test_subject_and_session_combined(self):
        response = self.client.get(self.url, {'subject': 'CM2', 'session': '20'})
        self.assertEqual(response.data['count'], 3)

    # --- Pagination ---

    def test_pagination_default_page_size(self):
        response = self.client.get(self.url)
        self.assertIn('count', response.data)
        self.assertIn('results', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)

    # --- Ordering ---

    def test_results_ordered_by_subject_then_session(self):
        response = self.client.get(self.url)
        results = response.data['results']
        codes = [(r['subject_code'], r['session_code']) for r in results]
        self.assertEqual(codes, sorted(codes))
