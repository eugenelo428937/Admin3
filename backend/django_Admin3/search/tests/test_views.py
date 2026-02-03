"""Tests for search API view endpoints."""
from unittest.mock import patch
from rest_framework.test import APITestCase
from rest_framework import status


class TestUnifiedSearchEndpoint(APITestCase):
    """Test the POST /api/search/unified/ endpoint."""

    @patch('search.views.search_service')
    def test_unified_search(self, mock_service):
        """POST /api/search/unified/ returns search results."""
        mock_service.unified_search.return_value = {
            'products': [],
            'filter_counts': {},
            'pagination': {'page': 1, 'page_size': 20, 'total_count': 0,
                           'has_next': False, 'has_previous': False},
        }
        response = self.client.post(
            '/api/search/unified/',
            {'searchQuery': 'CM2', 'filters': {}, 'pagination': {'page': 1, 'page_size': 20}},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TestDefaultSearchDataEndpoint(APITestCase):
    """Test the GET /api/search/default-data/ endpoint."""

    @patch('search.views.search_service')
    def test_default_search_data(self, mock_service):
        """GET /api/search/default-data/ returns default data."""
        mock_service.get_default_search_data.return_value = {
            'popular_products': [],
            'total_count': 0,
            'suggested_filters': {},
        }
        response = self.client.get('/api/search/default-data/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TestFuzzySearchEndpoint(APITestCase):
    """Test the GET /api/search/fuzzy/ endpoint."""

    @patch('search.views.search_service')
    def test_fuzzy_search(self, mock_service):
        """GET /api/search/fuzzy/?q=actuarial returns results."""
        mock_service.fuzzy_search.return_value = {
            'products': [],
            'total_count': 0,
        }
        response = self.client.get('/api/search/fuzzy/', {'q': 'actuarial'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_fuzzy_search_missing_query(self):
        """GET /api/search/fuzzy/ without q returns 400."""
        response = self.client.get('/api/search/fuzzy/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TestAdvancedFuzzySearchEndpoint(APITestCase):
    """Test the GET /api/search/advanced-fuzzy/ endpoint."""

    @patch('search.views.search_service')
    def test_advanced_fuzzy_search(self, mock_service):
        """GET /api/search/advanced-fuzzy/?q=CM2 returns results."""
        mock_service.advanced_fuzzy_search.return_value = {
            'products': [],
            'total_count': 0,
        }
        response = self.client.get('/api/search/advanced-fuzzy/', {'q': 'CM2'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
