"""Comprehensive tests for search views to increase coverage to 98%.

Covers all view endpoints and code paths in search/views.py including:
- UnifiedSearchView POST: validation, success, errors, navbar params
- DefaultSearchDataView GET: success, limit param, errors
- FuzzySearchView GET: query validation, success, errors
- AdvancedFuzzySearchView GET: query, subjects, categories, errors
"""
from unittest.mock import patch, MagicMock

from rest_framework.test import APITestCase
from rest_framework import status


class TestUnifiedSearchViewPost(APITestCase):
    """Test POST /api/search/unified/ endpoint thoroughly."""

    @patch('search.views.search_service')
    def test_successful_search(self, mock_service):
        """Successful POST returns 200 with search results."""
        mock_service.unified_search.return_value = {
            'products': [{'id': 1, 'name': 'Test'}],
            'filter_counts': {'subjects': {}},
            'pagination': {
                'page': 1, 'page_size': 20, 'total_count': 1,
                'has_next': False, 'has_previous': False, 'total_pages': 1,
            },
            'performance': {'duration': 0.1, 'cached': False},
        }
        response = self.client.post(
            '/api/search/unified/',
            {
                'searchQuery': 'CM2',
                'filters': {'subjects': ['CM2']},
                'pagination': {'page': 1, 'page_size': 20},
                'options': {'include_bundles': True},
            },
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('products', response.data)

    @patch('search.views.search_service')
    def test_empty_request_body(self, mock_service):
        """Empty request body is valid (all fields optional)."""
        mock_service.unified_search.return_value = {
            'products': [],
            'filter_counts': {},
            'pagination': {
                'page': 1, 'page_size': 20, 'total_count': 0,
                'has_next': False, 'has_previous': False, 'total_pages': 0,
            },
            'performance': {'duration': 0.05, 'cached': False},
        }
        response = self.client.post(
            '/api/search/unified/', {}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_invalid_pagination_page_zero(self):
        """Invalid pagination (page=0) returns 400."""
        response = self.client.post(
            '/api/search/unified/',
            {'pagination': {'page': 0, 'page_size': 20}},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('details', response.data)

    def test_invalid_pagination_page_size_too_large(self):
        """Invalid pagination (page_size > 100) returns 400."""
        response = self.client.post(
            '/api/search/unified/',
            {'pagination': {'page': 1, 'page_size': 200}},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_filter_type(self):
        """Invalid filter type returns 400."""
        response = self.client.post(
            '/api/search/unified/',
            {'filters': {'invalid_key': ['value']}},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_pagination_negative_page(self):
        """Negative page returns 400."""
        response = self.client.post(
            '/api/search/unified/',
            {'pagination': {'page': -1, 'page_size': 20}},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_pagination_non_integer(self):
        """Non-integer page returns 400."""
        response = self.client.post(
            '/api/search/unified/',
            {'pagination': {'page': 'abc', 'page_size': 20}},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('search.views.search_service')
    def test_service_exception_returns_500(self, mock_service):
        """Exception in search service returns 500."""
        mock_service.unified_search.side_effect = Exception('DB error')
        response = self.client.post(
            '/api/search/unified/', {}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'Search failed')

    @patch('search.views.search_service')
    def test_navbar_params_extracted(self, mock_service):
        """Navbar query params are extracted and passed to service."""
        mock_service.unified_search.return_value = {
            'products': [],
            'filter_counts': {},
            'pagination': {
                'page': 1, 'page_size': 20, 'total_count': 0,
                'has_next': False, 'has_previous': False, 'total_pages': 0,
            },
            'performance': {'duration': 0.05, 'cached': False},
        }
        response = self.client.post(
            '/api/search/unified/?tutorial_format=F2F&group=Material&product=5',
            {},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify the navbar_filters were passed
        call_kwargs = mock_service.unified_search.call_args
        navbar = call_kwargs.kwargs.get('navbar_filters') or call_kwargs[1].get('navbar_filters')
        self.assertEqual(navbar['tutorial_format'], 'F2F')
        self.assertEqual(navbar['group'], 'Material')
        self.assertEqual(navbar['product'], '5')

    @patch('search.views.search_service')
    def test_all_navbar_params(self, mock_service):
        """All navbar parameters are extracted."""
        mock_service.unified_search.return_value = {
            'products': [], 'filter_counts': {},
            'pagination': {
                'page': 1, 'page_size': 20, 'total_count': 0,
                'has_next': False, 'has_previous': False, 'total_pages': 0,
            },
            'performance': {'duration': 0.01, 'cached': False},
        }
        url = (
            '/api/search/unified/'
            '?tutorial_format=F2F'
            '&group=Material'
            '&variation=Printed'
            '&distance_learning=true'
            '&tutorial=yes'
            '&product=10'
        )
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        call_kwargs = mock_service.unified_search.call_args
        navbar = call_kwargs.kwargs.get('navbar_filters') or call_kwargs[1].get('navbar_filters')
        self.assertIn('tutorial_format', navbar)
        self.assertIn('group', navbar)
        self.assertIn('variation', navbar)
        self.assertIn('distance_learning', navbar)
        self.assertIn('tutorial', navbar)
        self.assertIn('product', navbar)

    @patch('search.views.search_service')
    def test_empty_navbar_params_excluded(self, mock_service):
        """Empty navbar params are not included in navbar_filters."""
        mock_service.unified_search.return_value = {
            'products': [], 'filter_counts': {},
            'pagination': {
                'page': 1, 'page_size': 20, 'total_count': 0,
                'has_next': False, 'has_previous': False, 'total_pages': 0,
            },
            'performance': {'duration': 0.01, 'cached': False},
        }
        response = self.client.post(
            '/api/search/unified/', {}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        call_kwargs = mock_service.unified_search.call_args
        navbar = call_kwargs.kwargs.get('navbar_filters') or call_kwargs[1].get('navbar_filters')
        self.assertEqual(navbar, {})

    @patch('search.views.search_service')
    def test_search_query_stripped(self, mock_service):
        """searchQuery is stripped of whitespace."""
        mock_service.unified_search.return_value = {
            'products': [], 'filter_counts': {},
            'pagination': {
                'page': 1, 'page_size': 20, 'total_count': 0,
                'has_next': False, 'has_previous': False, 'total_pages': 0,
            },
            'performance': {'duration': 0.01, 'cached': False},
        }
        response = self.client.post(
            '/api/search/unified/',
            {'searchQuery': '  CM2  '},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        call_kwargs = mock_service.unified_search.call_args
        query = call_kwargs.kwargs.get('search_query') or call_kwargs[1].get('search_query')
        self.assertEqual(query, 'CM2')

    @patch('search.views.search_service')
    def test_default_pagination_used(self, mock_service):
        """Default pagination is used when not provided."""
        mock_service.unified_search.return_value = {
            'products': [], 'filter_counts': {},
            'pagination': {
                'page': 1, 'page_size': 20, 'total_count': 0,
                'has_next': False, 'has_previous': False, 'total_pages': 0,
            },
            'performance': {'duration': 0.01, 'cached': False},
        }
        response = self.client.post(
            '/api/search/unified/', {}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        call_kwargs = mock_service.unified_search.call_args
        pagination = call_kwargs.kwargs.get('pagination') or call_kwargs[1].get('pagination')
        self.assertEqual(pagination, {'page': 1, 'page_size': 20})

    @patch('search.views.search_service')
    def test_default_options_used(self, mock_service):
        """Default options are used when not provided."""
        mock_service.unified_search.return_value = {
            'products': [], 'filter_counts': {},
            'pagination': {
                'page': 1, 'page_size': 20, 'total_count': 0,
                'has_next': False, 'has_previous': False, 'total_pages': 0,
            },
            'performance': {'duration': 0.01, 'cached': False},
        }
        response = self.client.post(
            '/api/search/unified/', {}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        call_kwargs = mock_service.unified_search.call_args
        options = call_kwargs.kwargs.get('options') or call_kwargs[1].get('options')
        self.assertEqual(options, {'include_bundles': True})


class TestDefaultSearchDataViewGet(APITestCase):
    """Test GET /api/search/default-data/ endpoint thoroughly."""

    @patch('search.views.search_service')
    def test_successful_response(self, mock_service):
        """Successful GET returns 200 with default data."""
        mock_service.get_default_search_data.return_value = {
            'popular_products': [{'id': 1}],
            'total_count': 1,
            'suggested_filters': {'subjects': [], 'product_groups': []},
            'search_info': {'query': '', 'type': 'default'},
        }
        response = self.client.get('/api/search/default-data/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('popular_products', response.data)

    @patch('search.views.search_service')
    def test_custom_limit_param(self, mock_service):
        """Custom limit parameter is passed to service."""
        mock_service.get_default_search_data.return_value = {
            'popular_products': [],
            'total_count': 0,
            'suggested_filters': {},
            'search_info': {'query': '', 'type': 'default'},
        }
        response = self.client.get('/api/search/default-data/', {'limit': '10'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_service.get_default_search_data.assert_called_once_with(limit=10)

    @patch('search.views.search_service')
    def test_default_limit_is_5(self, mock_service):
        """Default limit is 5 when not specified."""
        mock_service.get_default_search_data.return_value = {
            'popular_products': [],
            'total_count': 0,
            'suggested_filters': {},
            'search_info': {'query': '', 'type': 'default'},
        }
        response = self.client.get('/api/search/default-data/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_service.get_default_search_data.assert_called_once_with(limit=5)

    @patch('search.views.search_service')
    def test_service_exception_returns_500(self, mock_service):
        """Exception in service returns 500."""
        mock_service.get_default_search_data.side_effect = Exception('DB error')
        response = self.client.get('/api/search/default-data/')
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'Failed to get default search data')
        self.assertIn('details', response.data)


class TestFuzzySearchViewGet(APITestCase):
    """Test GET /api/search/fuzzy/ endpoint thoroughly."""

    def test_missing_query_returns_400(self):
        """Missing q parameter returns 400."""
        response = self.client.get('/api/search/fuzzy/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_empty_query_returns_400(self):
        """Empty q parameter returns 400."""
        response = self.client.get('/api/search/fuzzy/', {'q': ''})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_single_char_query_returns_400(self):
        """Single character q returns 400 (minimum 2 chars)."""
        response = self.client.get('/api/search/fuzzy/', {'q': 'x'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('search.views.search_service')
    def test_valid_query_returns_200(self, mock_service):
        """Valid query returns 200 with search results."""
        mock_service.fuzzy_search.return_value = {
            'products': [{'id': 1}],
            'total_count': 1,
            'suggested_filters': {},
            'search_info': {'query': 'CM2', 'algorithm': 'fuzzy_store_product'},
        }
        response = self.client.get('/api/search/fuzzy/', {'q': 'CM2'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('products', response.data)

    @patch('search.views.search_service')
    def test_custom_min_score(self, mock_service):
        """Custom min_score parameter is passed to service."""
        mock_service.fuzzy_search.return_value = {
            'products': [], 'total_count': 0,
        }
        response = self.client.get(
            '/api/search/fuzzy/', {'q': 'CM2', 'min_score': '80'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_service.fuzzy_search.assert_called_once_with('CM2', 80, 50)

    @patch('search.views.search_service')
    def test_custom_limit(self, mock_service):
        """Custom limit parameter is passed to service."""
        mock_service.fuzzy_search.return_value = {
            'products': [], 'total_count': 0,
        }
        response = self.client.get(
            '/api/search/fuzzy/', {'q': 'CM2', 'limit': '10'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_service.fuzzy_search.assert_called_once_with('CM2', 60, 10)

    @patch('search.views.search_service')
    def test_query_stripped(self, mock_service):
        """q parameter is stripped of whitespace."""
        mock_service.fuzzy_search.return_value = {
            'products': [], 'total_count': 0,
        }
        response = self.client.get(
            '/api/search/fuzzy/', {'q': '  CM2  '}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_service.fuzzy_search.assert_called_once_with('CM2', 60, 50)

    @patch('search.views.search_service')
    def test_service_exception_returns_500(self, mock_service):
        """Exception in service returns 500."""
        mock_service.fuzzy_search.side_effect = Exception('Search failed')
        response = self.client.get('/api/search/fuzzy/', {'q': 'CM2'})
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'Search failed')

    @patch('search.views.search_service')
    def test_default_params(self, mock_service):
        """Default min_score=60 and limit=50."""
        mock_service.fuzzy_search.return_value = {
            'products': [], 'total_count': 0,
        }
        self.client.get('/api/search/fuzzy/', {'q': 'test'})
        mock_service.fuzzy_search.assert_called_once_with('test', 60, 50)


class TestAdvancedFuzzySearchViewGet(APITestCase):
    """Test GET /api/search/advanced-fuzzy/ endpoint thoroughly."""

    @patch('search.views.search_service')
    def test_query_only(self, mock_service):
        """Query-only search returns 200."""
        mock_service.advanced_fuzzy_search.return_value = {
            'products': [{'id': 1}],
            'total_count': 1,
            'suggested_filters': {},
            'search_info': {'query': 'CM2', 'algorithm': 'fuzzy_with_filters'},
        }
        response = self.client.get(
            '/api/search/advanced-fuzzy/', {'q': 'CM2'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch('search.views.search_service')
    def test_no_query(self, mock_service):
        """No query parameter returns 200 (query is optional)."""
        mock_service.advanced_fuzzy_search.return_value = {
            'products': [], 'total_count': 0,
            'suggested_filters': {},
            'search_info': {'algorithm': 'filtered_no_query'},
        }
        response = self.client.get('/api/search/advanced-fuzzy/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verify query is None when not provided
        call_kwargs = mock_service.advanced_fuzzy_search.call_args
        self.assertIsNone(call_kwargs.kwargs.get('query') or call_kwargs[1].get('query'))

    @patch('search.views.search_service')
    def test_empty_query_treated_as_none(self, mock_service):
        """Empty query string is treated as None."""
        mock_service.advanced_fuzzy_search.return_value = {
            'products': [], 'total_count': 0,
            'suggested_filters': {},
            'search_info': {},
        }
        response = self.client.get(
            '/api/search/advanced-fuzzy/', {'q': ''}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        call_kwargs = mock_service.advanced_fuzzy_search.call_args
        query = call_kwargs.kwargs.get('query') or call_kwargs[1].get('query')
        self.assertIsNone(query)

    @patch('search.views.search_service')
    def test_subjects_parsed(self, mock_service):
        """Comma-separated subject IDs are parsed to list of ints."""
        mock_service.advanced_fuzzy_search.return_value = {
            'products': [], 'total_count': 0,
            'suggested_filters': {},
            'search_info': {},
        }
        response = self.client.get(
            '/api/search/advanced-fuzzy/',
            {'q': 'CM2', 'subjects': '1,2,3'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        call_kwargs = mock_service.advanced_fuzzy_search.call_args
        subject_ids = call_kwargs.kwargs.get('subject_ids') or call_kwargs[1].get('subject_ids')
        self.assertEqual(subject_ids, [1, 2, 3])

    @patch('search.views.search_service')
    def test_categories_parsed(self, mock_service):
        """Comma-separated category IDs are parsed to list of ints."""
        mock_service.advanced_fuzzy_search.return_value = {
            'products': [], 'total_count': 0,
            'suggested_filters': {},
            'search_info': {},
        }
        response = self.client.get(
            '/api/search/advanced-fuzzy/',
            {'q': 'CM2', 'categories': '10,20'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        call_kwargs = mock_service.advanced_fuzzy_search.call_args
        category_ids = call_kwargs.kwargs.get('category_ids') or call_kwargs[1].get('category_ids')
        self.assertEqual(category_ids, [10, 20])

    def test_invalid_subjects_returns_400(self):
        """Non-integer subject IDs return 400."""
        response = self.client.get(
            '/api/search/advanced-fuzzy/',
            {'subjects': 'abc,def'}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('subject', response.data['error'].lower())

    def test_invalid_categories_returns_400(self):
        """Non-integer category IDs return 400."""
        response = self.client.get(
            '/api/search/advanced-fuzzy/',
            {'categories': 'xyz'}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('category', response.data['error'].lower())

    @patch('search.views.search_service')
    def test_custom_min_score(self, mock_service):
        """Custom min_score is parsed and passed."""
        mock_service.advanced_fuzzy_search.return_value = {
            'products': [], 'total_count': 0,
            'suggested_filters': {},
            'search_info': {},
        }
        response = self.client.get(
            '/api/search/advanced-fuzzy/',
            {'q': 'CM2', 'min_score': '90'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        call_kwargs = mock_service.advanced_fuzzy_search.call_args
        min_score = call_kwargs.kwargs.get('min_score') or call_kwargs[1].get('min_score')
        self.assertEqual(min_score, 90)

    @patch('search.views.search_service')
    def test_custom_limit(self, mock_service):
        """Custom limit is parsed and passed."""
        mock_service.advanced_fuzzy_search.return_value = {
            'products': [], 'total_count': 0,
            'suggested_filters': {},
            'search_info': {},
        }
        response = self.client.get(
            '/api/search/advanced-fuzzy/',
            {'q': 'CM2', 'limit': '25'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        call_kwargs = mock_service.advanced_fuzzy_search.call_args
        limit = call_kwargs.kwargs.get('limit') or call_kwargs[1].get('limit')
        self.assertEqual(limit, 25)

    @patch('search.views.search_service')
    def test_default_params(self, mock_service):
        """Default min_score=65 and limit=50."""
        mock_service.advanced_fuzzy_search.return_value = {
            'products': [], 'total_count': 0,
            'suggested_filters': {},
            'search_info': {},
        }
        self.client.get('/api/search/advanced-fuzzy/')
        call_kwargs = mock_service.advanced_fuzzy_search.call_args
        min_score = call_kwargs.kwargs.get('min_score') or call_kwargs[1].get('min_score')
        limit = call_kwargs.kwargs.get('limit') or call_kwargs[1].get('limit')
        self.assertEqual(min_score, 65)
        self.assertEqual(limit, 50)

    @patch('search.views.search_service')
    def test_service_exception_returns_500(self, mock_service):
        """Exception in service returns 500."""
        mock_service.advanced_fuzzy_search.side_effect = Exception('Search error')
        response = self.client.get(
            '/api/search/advanced-fuzzy/', {'q': 'CM2'}
        )
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], 'Search failed')

    @patch('search.views.search_service')
    def test_no_subjects_no_categories(self, mock_service):
        """No subjects or categories passes None for both."""
        mock_service.advanced_fuzzy_search.return_value = {
            'products': [], 'total_count': 0,
            'suggested_filters': {},
            'search_info': {},
        }
        response = self.client.get('/api/search/advanced-fuzzy/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        call_kwargs = mock_service.advanced_fuzzy_search.call_args
        subject_ids = call_kwargs.kwargs.get('subject_ids') or call_kwargs[1].get('subject_ids')
        category_ids = call_kwargs.kwargs.get('category_ids') or call_kwargs[1].get('category_ids')
        self.assertIsNone(subject_ids)
        self.assertIsNone(category_ids)

    @patch('search.views.search_service')
    def test_subjects_with_whitespace(self, mock_service):
        """Subject IDs with whitespace are properly parsed."""
        mock_service.advanced_fuzzy_search.return_value = {
            'products': [], 'total_count': 0,
            'suggested_filters': {},
            'search_info': {},
        }
        response = self.client.get(
            '/api/search/advanced-fuzzy/',
            {'subjects': ' 1 , 2 , 3 '}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        call_kwargs = mock_service.advanced_fuzzy_search.call_args
        subject_ids = call_kwargs.kwargs.get('subject_ids') or call_kwargs[1].get('subject_ids')
        self.assertEqual(subject_ids, [1, 2, 3])


class TestUnifiedSearchViewExtractNavbarFilters(APITestCase):
    """Test _extract_navbar_filters helper method."""

    @patch('search.views.search_service')
    def test_only_present_params_included(self, mock_service):
        """Only query params that are present are included."""
        mock_service.unified_search.return_value = {
            'products': [], 'filter_counts': {},
            'pagination': {
                'page': 1, 'page_size': 20, 'total_count': 0,
                'has_next': False, 'has_previous': False, 'total_pages': 0,
            },
            'performance': {'duration': 0.01, 'cached': False},
        }
        response = self.client.post(
            '/api/search/unified/?group=Material', {}, format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        call_kwargs = mock_service.unified_search.call_args
        navbar = call_kwargs.kwargs.get('navbar_filters') or call_kwargs[1].get('navbar_filters')
        self.assertEqual(navbar, {'group': 'Material'})
        # Other params should NOT be in the dict
        self.assertNotIn('tutorial_format', navbar)
        self.assertNotIn('variation', navbar)


class TestViewPermissions(APITestCase):
    """Test that all search views allow unauthenticated access."""

    @patch('search.views.search_service')
    def test_unified_search_allows_any(self, mock_service):
        """POST /api/search/unified/ allows unauthenticated access."""
        mock_service.unified_search.return_value = {
            'products': [], 'filter_counts': {},
            'pagination': {
                'page': 1, 'page_size': 20, 'total_count': 0,
                'has_next': False, 'has_previous': False, 'total_pages': 0,
            },
            'performance': {'duration': 0.01, 'cached': False},
        }
        response = self.client.post(
            '/api/search/unified/', {}, format='json',
        )
        self.assertNotEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('search.views.search_service')
    def test_default_data_allows_any(self, mock_service):
        """GET /api/search/default-data/ allows unauthenticated access."""
        mock_service.get_default_search_data.return_value = {
            'popular_products': [], 'total_count': 0,
            'suggested_filters': {}, 'search_info': {},
        }
        response = self.client.get('/api/search/default-data/')
        self.assertNotEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('search.views.search_service')
    def test_fuzzy_search_allows_any(self, mock_service):
        """GET /api/search/fuzzy/ allows unauthenticated access."""
        mock_service.fuzzy_search.return_value = {
            'products': [], 'total_count': 0,
        }
        response = self.client.get('/api/search/fuzzy/', {'q': 'CM2'})
        self.assertNotEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('search.views.search_service')
    def test_advanced_fuzzy_allows_any(self, mock_service):
        """GET /api/search/advanced-fuzzy/ allows unauthenticated access."""
        mock_service.advanced_fuzzy_search.return_value = {
            'products': [], 'total_count': 0,
            'suggested_filters': {}, 'search_info': {},
        }
        response = self.client.get('/api/search/advanced-fuzzy/')
        self.assertNotEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
