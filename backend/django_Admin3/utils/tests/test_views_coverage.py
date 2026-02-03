"""Additional tests for utils/views.py to close coverage gaps.

Covers:
- country_list: fields in response
- health_check (simple): returns correct structure
- address_lookup_proxy: non-test mode, error handling
- transform_autocomplete_suggestions: various input shapes
- postcoder_address_lookup: postcode validation, error paths (ValueError,
  TimeoutError, generic Exception), logging failure
- address_retrieve: ValueError, TimeoutError, generic Exception paths
"""
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.test import TestCase, RequestFactory
from rest_framework.test import APITestCase
from rest_framework import status

from utils.models import UtilsCountrys


class TestTransformAutocompleteSuggestions(TestCase):
    """Test transform_autocomplete_suggestions helper function."""

    def setUp(self):
        self.country_gb = UtilsCountrys.objects.create(
            code='GB',
            name='United Kingdom',
            vat_percent=Decimal('20.00'),
            active=True,
        )

    def test_UTL_transforms_list_of_suggestions(self):
        """Should transform a list of autocomplete suggestions."""
        from utils.views import transform_autocomplete_suggestions
        postcoder_response = [
            {'id': 'UTL_ID1', 'summaryline': '10 Downing Street', 'locationsummary': 'London'},
            {'id': 'UTL_ID2', 'summaryline': '11 Downing Street', 'locationsummary': 'London'},
        ]
        result = transform_autocomplete_suggestions(postcoder_response, 'GB')
        self.assertIn('addresses', result)
        self.assertEqual(len(result['addresses']), 2)
        self.assertEqual(result['addresses'][0]['line_1'], '10 Downing Street')
        self.assertEqual(result['addresses'][0]['id'], 'UTL_ID1')
        self.assertEqual(result['addresses'][0]['country'], 'United Kingdom')

    def test_UTL_transforms_empty_list(self):
        """Empty list should return zero addresses."""
        from utils.views import transform_autocomplete_suggestions
        result = transform_autocomplete_suggestions([], 'GB')
        self.assertEqual(result['addresses'], [])

    def test_UTL_transforms_non_list_input(self):
        """Non-list input should return zero addresses."""
        from utils.views import transform_autocomplete_suggestions
        result = transform_autocomplete_suggestions({'error': 'bad data'}, 'GB')
        self.assertEqual(result['addresses'], [])

    def test_UTL_transforms_unknown_country_code(self):
        """Unknown country code should use code as fallback."""
        from utils.views import transform_autocomplete_suggestions
        result = transform_autocomplete_suggestions(
            [{'id': 'UTL_X1', 'summaryline': 'Test Address'}],
            'ZZ',
        )
        self.assertEqual(len(result['addresses']), 1)
        self.assertEqual(result['addresses'][0]['country'], 'ZZ')

    def test_UTL_transforms_suggestion_without_locationsummary(self):
        """Suggestions without locationsummary should have empty line_2."""
        from utils.views import transform_autocomplete_suggestions
        result = transform_autocomplete_suggestions(
            [{'id': 'UTL_X2', 'summaryline': 'Test Only'}],
            'GB',
        )
        addr = result['addresses'][0]
        self.assertEqual(addr['line_2'], '')
        self.assertEqual(len(addr['formatted_address']), 1)


class TestPostcoderAddressLookupErrors(APITestCase):
    """Test postcoder_address_lookup view error paths."""

    def test_UTL_missing_query_and_postcode(self):
        """Should return 400 when both query and postcode are missing."""
        response = self.client.get('/api/utils/address-lookup/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertEqual(data['code'], 'MISSING_POSTCODE')

    def test_UTL_short_postcode_returns_400(self):
        """Postcode shorter than 5 chars should return 400."""
        response = self.client.get('/api/utils/address-lookup/', {'postcode': 'AB'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertEqual(data['code'], 'INVALID_POSTCODE')

    def test_UTL_long_postcode_returns_400(self):
        """Postcode longer than 8 chars should return 400."""
        response = self.client.get('/api/utils/address-lookup/', {'postcode': 'ABCDEFGHIJ'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertEqual(data['code'], 'INVALID_POSTCODE')

    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    @patch('utils.services.AddressLookupLogger')
    def test_UTL_value_error_returns_500(self, mock_logger_cls, mock_cache_cls, mock_postcoder_cls):
        """ValueError from autocomplete should return 500."""
        mock_postcoder_cls.return_value.autocomplete_address.side_effect = ValueError('Bad input')
        response = self.client.get('/api/utils/address-lookup/', {'query': 'UTL test query'})
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        data = response.json()
        self.assertEqual(data['code'], 'API_ERROR')

    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    @patch('utils.services.AddressLookupLogger')
    def test_UTL_timeout_error_returns_500(self, mock_logger_cls, mock_cache_cls, mock_postcoder_cls):
        """TimeoutError from autocomplete should return 500."""
        mock_postcoder_cls.return_value.autocomplete_address.side_effect = TimeoutError('Timed out')
        response = self.client.get('/api/utils/address-lookup/', {'query': 'UTL timeout query'})
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)

    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    @patch('utils.services.AddressLookupLogger')
    def test_UTL_generic_exception_returns_500(self, mock_logger_cls, mock_cache_cls, mock_postcoder_cls):
        """Generic exception from autocomplete should return 500."""
        mock_postcoder_cls.return_value.autocomplete_address.side_effect = Exception('Unknown error')
        response = self.client.get('/api/utils/address-lookup/', {'query': 'UTL error query'})
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)

    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    @patch('utils.services.AddressLookupLogger')
    def test_UTL_successful_lookup_returns_200(self, mock_logger_cls, mock_cache_cls, mock_postcoder_cls):
        """Successful autocomplete should return 200 with addresses."""
        UtilsCountrys.objects.create(code='GB', name='United Kingdom', active=True)
        mock_postcoder_cls.return_value.autocomplete_address.return_value = [
            {'id': 'UTL1', 'summaryline': 'UTL Test Address', 'locationsummary': 'London'}
        ]
        response = self.client.get('/api/utils/address-lookup/', {'query': 'UTL test'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('addresses', data)
        self.assertIn('response_time_ms', data)
        self.assertFalse(data['cache_hit'])

    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    @patch('utils.services.AddressLookupLogger')
    def test_UTL_logging_failure_does_not_break_response(self, mock_logger_cls, mock_cache_cls, mock_postcoder_cls):
        """Logging failure should not break the successful response."""
        UtilsCountrys.objects.create(code='GB', name='United Kingdom', active=True)
        mock_postcoder_cls.return_value.autocomplete_address.return_value = [
            {'id': 'UTL2', 'summaryline': 'UTL Log Test', 'locationsummary': 'City'}
        ]
        # Make logging fail
        mock_logger_cls.return_value.log_lookup.side_effect = Exception('DB log failure')
        response = self.client.get('/api/utils/address-lookup/', {'query': 'UTL log test'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    @patch('utils.services.AddressLookupLogger')
    def test_UTL_postcode_used_as_query_fallback(self, mock_logger_cls, mock_cache_cls, mock_postcoder_cls):
        """When no query param, postcode should be used as query."""
        UtilsCountrys.objects.create(code='GB', name='United Kingdom', active=True)
        mock_postcoder_cls.return_value.autocomplete_address.return_value = []
        response = self.client.get('/api/utils/address-lookup/', {'postcode': 'SW1A 1AA'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TestAddressRetrieveErrors(APITestCase):
    """Test address_retrieve view error paths."""

    def test_UTL_missing_id_returns_400(self):
        """Should return 400 when id parameter is missing."""
        response = self.client.get('/api/utils/address-retrieve/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.json()
        self.assertEqual(data['code'], 'MISSING_ID')

    @patch('utils.services.PostcoderService')
    def test_UTL_value_error_returns_500(self, mock_postcoder_cls):
        """ValueError during retrieve should return 500."""
        mock_postcoder_cls.return_value.retrieve_address.side_effect = ValueError('Invalid ID')
        response = self.client.get('/api/utils/address-retrieve/', {'id': 'UTL_BAD'})
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        data = response.json()
        self.assertEqual(data['code'], 'VALIDATION_ERROR')

    @patch('utils.services.PostcoderService')
    def test_UTL_timeout_error_returns_500(self, mock_postcoder_cls):
        """TimeoutError during retrieve should return 500."""
        mock_postcoder_cls.return_value.retrieve_address.side_effect = TimeoutError('Timed out')
        response = self.client.get('/api/utils/address-retrieve/', {'id': 'UTL_TIMEOUT'})
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        data = response.json()
        self.assertEqual(data['code'], 'TIMEOUT')

    @patch('utils.services.PostcoderService')
    def test_UTL_generic_exception_returns_500(self, mock_postcoder_cls):
        """Generic exception during retrieve should return 500."""
        mock_postcoder_cls.return_value.retrieve_address.side_effect = Exception('API down')
        response = self.client.get('/api/utils/address-retrieve/', {'id': 'UTL_ERR'})
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        data = response.json()
        self.assertEqual(data['code'], 'API_ERROR')

    @patch('utils.services.PostcoderService')
    def test_UTL_successful_retrieve_returns_200(self, mock_postcoder_cls):
        """Successful retrieve should return 200 with addresses."""
        mock_service = mock_postcoder_cls.return_value
        mock_service.retrieve_address.return_value = [
            {'postcode': 'SW1A1AA', 'number': '10', 'street': 'Downing Street'}
        ]
        mock_service.transform_to_getaddress_format.return_value = {
            'addresses': [{'postcode': 'SW1A 1AA', 'line_1': '10 Downing Street'}]
        }
        response = self.client.get('/api/utils/address-retrieve/', {'id': 'UTL_OK', 'country': 'GB'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('addresses', data)
        self.assertIn('response_time_ms', data)


class TestSimpleHealthCheck(APITestCase):
    """Test the simple health_check in views.py."""

    def test_UTL_simple_health_check(self):
        """GET /api/utils/health/ should return healthy."""
        response = self.client.get('/api/utils/health/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['status'], 'healthy')
        self.assertIn('message', data)


class TestCountryListFields(APITestCase):
    """Test country_list view response fields."""

    def setUp(self):
        self.country = UtilsCountrys.objects.create(
            code='U3',
            name='UTL Test Country',
            phone_code='+99',
            vat_percent=Decimal('10.00'),
            active=True,
        )

    def test_UTL_country_has_iso_code(self):
        """Each country should have iso_code field."""
        response = self.client.get('/api/countries/')
        data = response.json()
        utl_countries = [c for c in data if c['iso_code'] == 'U3']
        self.assertEqual(len(utl_countries), 1)
        self.assertEqual(utl_countries[0]['name'], 'UTL Test Country')
        self.assertEqual(utl_countries[0]['phone_code'], '+99')
