"""Tests for the legacy product search API endpoint."""
from django.test import TestCase
from rest_framework.test import APIClient

from legacy.models import LegacyProduct


def _create_product(**overrides):
    defaults = dict(
        subject_code='CM2',
        delivery_format='P',
        product_template_code='N',
        session_code='20',
        full_code='CM2/PN/20',
        legacy_product_name='Course Notes',
        short_name='Course Notes',
        normalized_name='Course Notes',
        source_file='test.csv',
        source_line=1,
    )
    defaults.update(overrides)
    return LegacyProduct.objects.create(**defaults)


class LegacySearchTestBase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = '/api/legacy/products/'


class TestLegacySearchBasic(LegacySearchTestBase):

    def test_returns_200_with_no_data(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)

    def test_returns_all_products_with_no_filters(self):
        _create_product(full_code='CM2/PN/20', source_line=1)
        _create_product(full_code='CB1/PN/20', subject_code='CB1', source_line=2)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data['results']), 2)

    def test_no_auth_required(self):
        """Legacy search is public (AllowAny)."""
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)


class TestLegacySearchTextQuery(LegacySearchTestBase):

    def setUp(self):
        super().setUp()
        _create_product(
            full_code='CM2/PN/20',
            legacy_product_name='Course Notes',
            normalized_name='Course Notes',
            source_line=1,
        )
        _create_product(
            full_code='CM2/PC/20',
            legacy_product_name='Combined Materials Pack eBook',
            normalized_name='Combined Materials Pack',
            product_template_code='C',
            source_line=2,
        )
        _create_product(
            full_code='CB1/PEX/20',
            subject_code='CB1',
            legacy_product_name='ASET (2014-2017 Papers)',
            normalized_name='ASET',
            product_template_code='EX',
            source_line=3,
        )

    def test_search_by_normalized_name(self):
        resp = self.client.get(self.url, {'q': 'Course Notes'})
        self.assertEqual(len(resp.data['results']), 1)
        self.assertEqual(resp.data['results'][0]['full_code'], 'CM2/PN/20')

    def test_search_by_raw_fullname(self):
        """Search matches the raw fullname too (case-insensitive)."""
        resp = self.client.get(self.url, {'q': 'ebook'})
        self.assertEqual(len(resp.data['results']), 1)
        self.assertEqual(resp.data['results'][0]['full_code'], 'CM2/PC/20')

    def test_search_by_full_code(self):
        resp = self.client.get(self.url, {'q': 'CB1/PEX'})
        self.assertEqual(len(resp.data['results']), 1)

    def test_search_case_insensitive(self):
        resp = self.client.get(self.url, {'q': 'course notes'})
        self.assertEqual(len(resp.data['results']), 1)

    def test_search_no_match_returns_empty(self):
        resp = self.client.get(self.url, {'q': 'nonexistent'})
        self.assertEqual(len(resp.data['results']), 0)


class TestLegacySearchFilters(LegacySearchTestBase):

    def setUp(self):
        super().setUp()
        _create_product(
            full_code='CM2/PN/20', subject_code='CM2',
            session_code='20', delivery_format='P',
            legacy_product_name='Course Notes',
            normalized_name='Course Notes',
            source_line=1,
        )
        _create_product(
            full_code='CM2/CN/20', subject_code='CM2',
            session_code='20', delivery_format='C',
            legacy_product_name='Combined Materials Pack eBook',
            normalized_name='Combined Materials Pack',
            product_template_code='C',
            source_line=2,
        )
        _create_product(
            full_code='CB1/PN/25', subject_code='CB1',
            session_code='25', delivery_format='P',
            legacy_product_name='Course Notes',
            normalized_name='Course Notes',
            source_line=3,
        )

    def test_filter_by_subject(self):
        resp = self.client.get(self.url, {'subject': 'CM2'})
        self.assertEqual(len(resp.data['results']), 2)

    def test_filter_by_session(self):
        resp = self.client.get(self.url, {'session': '25'})
        self.assertEqual(len(resp.data['results']), 1)
        self.assertEqual(resp.data['results'][0]['subject_code'], 'CB1')

    def test_filter_by_format(self):
        resp = self.client.get(self.url, {'delivery': 'C'})
        self.assertEqual(len(resp.data['results']), 1)
        self.assertEqual(resp.data['results'][0]['delivery_format'], 'C')

    def test_combine_filters(self):
        resp = self.client.get(self.url, {'subject': 'CM2', 'delivery': 'P'})
        self.assertEqual(len(resp.data['results']), 1)
        self.assertEqual(resp.data['results'][0]['full_code'], 'CM2/PN/20')

    def test_combine_text_and_filter(self):
        resp = self.client.get(self.url, {'q': 'Course Notes', 'subject': 'CM2'})
        self.assertEqual(len(resp.data['results']), 1)
        self.assertEqual(resp.data['results'][0]['full_code'], 'CM2/PN/20')


class TestLegacySearchPagination(LegacySearchTestBase):

    def setUp(self):
        super().setUp()
        for i in range(25):
            _create_product(
                full_code=f'CM2/PN/{i:02d}',
                session_code=f'{i:02d}',
                source_line=i + 1,
            )

    def test_default_pagination(self):
        """DRF default pagination returns a page of results."""
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        # Should have pagination keys
        self.assertIn('results', resp.data)
        self.assertIn('count', resp.data)
        self.assertEqual(resp.data['count'], 25)

    def test_page_param(self):
        """With default PAGE_SIZE=50 and 25 items, page 1 has all 25."""
        resp = self.client.get(self.url, {'page': 1})
        self.assertEqual(len(resp.data['results']), 25)
