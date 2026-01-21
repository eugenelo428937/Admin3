"""
Unit Tests for postcoder_address_lookup View

Tests the Postcoder.com address lookup endpoint including:
- Request validation (missing/invalid postcode)
- API integration with autocomplete
- API error handling
- Response format validation
- Analytics logging
- Error responses (400, 500)
"""

import json
from unittest.mock import patch, Mock, MagicMock
from django.test import TestCase, RequestFactory
from django.http import JsonResponse

from utils.views import postcoder_address_lookup


class PostcoderAddressLookupViewTestCase(TestCase):
    """Test cases for postcoder_address_lookup view function"""

    def setUp(self):
        """Set up test fixtures"""
        self.factory = RequestFactory()
        self.test_postcode = "SW1A1AA"
        self.test_addresses = {
            "addresses": [
                {
                    "id": "123",
                    "summaryline": "10 Downing Street",
                    "locationsummary": "Westminster, London, SW1A 1AA"
                }
            ]
        }
        # Mock autocomplete API response format
        self.autocomplete_response = [
            {
                "id": "123",
                "type": "ADD",
                "summaryline": "10 Downing Street",
                "locationsummary": "Westminster, London, SW1A 1AA",
                "count": 1
            }
        ]

    # ==================== Request Validation Tests ====================

    def test_missing_postcode_returns_400(self):
        """Test missing postcode parameter returns 400 error"""
        # Create request without postcode
        request = self.factory.get('/api/utils/postcoder-address-lookup/')

        response = postcoder_address_lookup(request)

        # Verify 400 response
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertEqual(data['error'], 'Missing postcode')
        self.assertEqual(data['code'], 'MISSING_POSTCODE')

    def test_empty_postcode_returns_400(self):
        """Test empty postcode string returns 400 error"""
        request = self.factory.get('/api/utils/postcoder-address-lookup/?postcode=')

        response = postcoder_address_lookup(request)

        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertEqual(data['error'], 'Missing postcode')

    def test_whitespace_only_postcode_returns_400(self):
        """Test whitespace-only postcode returns 400 error"""
        request = self.factory.get('/api/utils/postcoder-address-lookup/?postcode=   ')

        response = postcoder_address_lookup(request)

        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertEqual(data['error'], 'Missing postcode')

    def test_short_postcode_returns_400(self):
        """Test postcode shorter than 5 chars returns 400 error"""
        request = self.factory.get('/api/utils/postcoder-address-lookup/?postcode=AB1')

        response = postcoder_address_lookup(request)

        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertEqual(data['error'], 'Invalid postcode format')
        self.assertEqual(data['code'], 'INVALID_POSTCODE')

    def test_long_postcode_returns_400(self):
        """Test postcode longer than 8 chars returns 400 error"""
        request = self.factory.get('/api/utils/postcoder-address-lookup/?postcode=TOOLONG123')

        response = postcoder_address_lookup(request)

        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertEqual(data['error'], 'Invalid postcode format')

    # ==================== Successful API Call Tests ====================

    @patch('utils.views.transform_autocomplete_suggestions')
    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_successful_lookup_returns_addresses(self, mock_cache_service, mock_postcoder_service, mock_logger_service, mock_transform):
        """Test successful lookup returns addresses from API"""
        # Mock postcoder service
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.autocomplete_address.return_value = self.autocomplete_response

        # Mock transform function
        mock_transform.return_value = self.test_addresses

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.return_value = True

        # Create request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        response = postcoder_address_lookup(request)

        # Verify response
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertIn('addresses', data)
        self.assertEqual(data['addresses'], self.test_addresses['addresses'])
        self.assertFalse(data['cache_hit'])  # Autocomplete doesn't cache
        self.assertIn('response_time_ms', data)

        # Verify API was called
        mock_postcoder_instance.autocomplete_address.assert_called_once()

    @patch('utils.views.transform_autocomplete_suggestions')
    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_lookup_logs_analytics(self, mock_cache_service, mock_postcoder_service, mock_logger_service, mock_transform):
        """Test lookup logs analytics"""
        # Mock postcoder service
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.autocomplete_address.return_value = self.autocomplete_response

        # Mock transform function
        mock_transform.return_value = self.test_addresses

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.return_value = True

        # Create request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        response = postcoder_address_lookup(request)

        # Verify logging was called
        mock_logger_instance.log_lookup.assert_called_once()
        call_kwargs = mock_logger_instance.log_lookup.call_args[1]
        self.assertFalse(call_kwargs['cache_hit'])  # Autocomplete doesn't cache
        self.assertTrue(call_kwargs['success'])
        self.assertEqual(call_kwargs['result_count'], 1)

    # ==================== Query Parameter Tests ====================

    @patch('utils.views.transform_autocomplete_suggestions')
    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_query_parameter_takes_precedence(self, mock_cache_service, mock_postcoder_service, mock_logger_service, mock_transform):
        """Test query parameter is used for search text"""
        # Mock postcoder service
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.autocomplete_address.return_value = self.autocomplete_response

        # Mock transform function
        mock_transform.return_value = self.test_addresses

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.return_value = True

        # Create request with query parameter
        request = self.factory.get('/api/utils/postcoder-address-lookup/?query=10 Downing Street')

        response = postcoder_address_lookup(request)

        # Verify response
        self.assertEqual(response.status_code, 200)

        # Verify API was called with query
        mock_postcoder_instance.autocomplete_address.assert_called_once()
        call_kwargs = mock_postcoder_instance.autocomplete_address.call_args[1]
        self.assertEqual(call_kwargs['search_query'], '10 Downing Street')

    # ==================== API Error Handling Tests ====================

    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_api_value_error_returns_500(self, mock_cache_service, mock_postcoder_service, mock_logger_service):
        """Test ValueError from API returns 500 error"""
        # Mock API error
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.autocomplete_address.side_effect = ValueError("Invalid postcode")

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.return_value = True

        # Create request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        response = postcoder_address_lookup(request)

        # Verify 500 response
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.content)
        self.assertIn('error', data)
        self.assertIn('Invalid postcode', data['error'])
        self.assertEqual(data['code'], 'API_ERROR')
        self.assertEqual(data['addresses'], [])

    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_api_timeout_returns_500(self, mock_cache_service, mock_postcoder_service, mock_logger_service):
        """Test TimeoutError from API returns 500 error"""
        # Mock API timeout
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.autocomplete_address.side_effect = TimeoutError("Request timed out")

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.return_value = True

        # Create request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        response = postcoder_address_lookup(request)

        # Verify 500 response with timeout error
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.content)
        self.assertIn('API timeout', data['error'])

    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_api_generic_error_returns_500(self, mock_cache_service, mock_postcoder_service, mock_logger_service):
        """Test generic Exception from API returns 500 error"""
        # Mock API error
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.autocomplete_address.side_effect = Exception("Unexpected error")

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.return_value = True

        # Create request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        response = postcoder_address_lookup(request)

        # Verify 500 response
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.content)
        self.assertIn('API error', data['error'])

    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_api_error_logs_failure(self, mock_cache_service, mock_postcoder_service, mock_logger_service):
        """Test API error logs failure with success=False"""
        # Mock API error
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.autocomplete_address.side_effect = ValueError("Invalid postcode")

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.return_value = True

        # Create request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        response = postcoder_address_lookup(request)

        # Verify logging was called with success=False
        mock_logger_instance.log_lookup.assert_called_once()
        call_kwargs = mock_logger_instance.log_lookup.call_args[1]
        self.assertFalse(call_kwargs['success'])
        self.assertIsNotNone(call_kwargs['error_message'])

    # ==================== Response Format Tests ====================

    @patch('utils.views.transform_autocomplete_suggestions')
    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_response_format_includes_metadata(self, mock_cache_service, mock_postcoder_service, mock_logger_service, mock_transform):
        """Test response format includes required metadata"""
        # Mock postcoder service
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.autocomplete_address.return_value = self.autocomplete_response

        # Mock transform function
        mock_transform.return_value = self.test_addresses

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.return_value = True

        # Create request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        response = postcoder_address_lookup(request)

        # Verify response structure
        data = json.loads(response.content)
        self.assertIn('addresses', data)
        self.assertIsInstance(data['addresses'], list)
        self.assertIn('cache_hit', data)
        self.assertIn('response_time_ms', data)

    @patch('utils.views.transform_autocomplete_suggestions')
    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_response_includes_timing_metadata(self, mock_cache_service, mock_postcoder_service, mock_logger_service, mock_transform):
        """Test response includes response_time_ms metadata"""
        # Mock postcoder service
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.autocomplete_address.return_value = self.autocomplete_response

        # Mock transform function
        mock_transform.return_value = self.test_addresses

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.return_value = True

        # Create request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        response = postcoder_address_lookup(request)

        # Verify timing metadata
        data = json.loads(response.content)
        self.assertIn('response_time_ms', data)
        self.assertIsInstance(data['response_time_ms'], int)
        self.assertGreaterEqual(data['response_time_ms'], 0)

    # ==================== Logging Tests ====================

    @patch('utils.views.transform_autocomplete_suggestions')
    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_logging_failure_does_not_break_response(self, mock_cache_service, mock_postcoder_service, mock_logger_service, mock_transform):
        """Test logging failure doesn't break the lookup response"""
        # Mock postcoder service
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.autocomplete_address.return_value = self.autocomplete_response

        # Mock transform function
        mock_transform.return_value = self.test_addresses

        # Mock logger failure
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.side_effect = Exception("Logging failed")

        # Create request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        # Should not raise exception
        response = postcoder_address_lookup(request)

        # Response should still be successful
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertIn('addresses', data)

    # ==================== Integration & Edge Cases ====================

    @patch('utils.views.transform_autocomplete_suggestions')
    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_empty_addresses_handled_correctly(self, mock_cache_service, mock_postcoder_service, mock_logger_service, mock_transform):
        """Test empty addresses list handled correctly"""
        # Mock API returns empty addresses
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.autocomplete_address.return_value = []

        # Mock transform function
        mock_transform.return_value = {"addresses": []}

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.return_value = True

        # Create request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        response = postcoder_address_lookup(request)

        # Verify successful response with empty addresses
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['addresses'], [])

        # Verify logging with result_count=0
        call_kwargs = mock_logger_instance.log_lookup.call_args[1]
        self.assertEqual(call_kwargs['result_count'], 0)

    @patch('utils.views.transform_autocomplete_suggestions')
    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_multiple_addresses_counted_correctly(self, mock_cache_service, mock_postcoder_service, mock_logger_service, mock_transform):
        """Test multiple addresses counted correctly in logging"""
        # Mock API returns multiple addresses
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.autocomplete_address.return_value = []

        # Mock transform function with multiple addresses
        multi_addresses = {
            "addresses": [
                {"id": "1", "summaryline": "Address 1"},
                {"id": "2", "summaryline": "Address 2"},
                {"id": "3", "summaryline": "Address 3"}
            ]
        }
        mock_transform.return_value = multi_addresses

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.return_value = True

        # Create request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        response = postcoder_address_lookup(request)

        # Verify logging with result_count=3
        call_kwargs = mock_logger_instance.log_lookup.call_args[1]
        self.assertEqual(call_kwargs['result_count'], 3)

    @patch('utils.views.transform_autocomplete_suggestions')
    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_country_parameter_passed_to_service(self, mock_cache_service, mock_postcoder_service, mock_logger_service, mock_transform):
        """Test country parameter is passed to postcoder service"""
        # Mock postcoder service
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.autocomplete_address.return_value = self.autocomplete_response

        # Mock transform function
        mock_transform.return_value = self.test_addresses

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.return_value = True

        # Create request with country parameter
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}&country=US')

        response = postcoder_address_lookup(request)

        # Verify country code was passed to service
        call_kwargs = mock_postcoder_instance.autocomplete_address.call_args[1]
        self.assertEqual(call_kwargs['country_code'], 'US')


class AddressRetrieveViewTestCase(TestCase):
    """Test cases for address_retrieve view function"""

    def setUp(self):
        """Set up test fixtures"""
        self.factory = RequestFactory()
        self.test_id = "test_id_123"
        self.test_full_address = {
            "id": self.test_id,
            "postcode": "SW1A1AA",
            "summaryline": "10 Downing Street, Westminster, London",
            "number": "10",
            "street": "Downing Street",
            "posttown": "LONDON",
            "county": "Greater London",
            "latitude": 51.503396,
            "longitude": -0.127784
        }

    # ==================== Request Validation Tests ====================

    def test_missing_id_returns_400(self):
        """Test missing ID parameter returns 400 error"""
        from utils.views import address_retrieve
        request = self.factory.get('/api/utils/address-retrieve/')

        response = address_retrieve(request)

        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertEqual(data['error'], 'Missing ID parameter')
        self.assertEqual(data['code'], 'MISSING_ID')

    def test_empty_id_returns_400(self):
        """Test empty ID string returns 400 error"""
        from utils.views import address_retrieve
        request = self.factory.get('/api/utils/address-retrieve/?id=')

        response = address_retrieve(request)

        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertEqual(data['error'], 'Missing ID parameter')

    # ==================== Success Flow Tests ====================

    @patch('utils.services.PostcoderService')
    def test_successful_retrieve_returns_full_address(self, mock_postcoder_service):
        """Test successful retrieve returns full address details"""
        from utils.views import address_retrieve

        # Mock successful API response
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.retrieve_address.return_value = self.test_full_address
        mock_postcoder_instance.transform_to_getaddress_format.return_value = {
            "addresses": [{
                "postcode": "SW1A 1AA",
                "line_1": "10 Downing Street",
                "town_or_city": "London",
                "county": "Greater London",
                "country": "England"
            }]
        }

        request = self.factory.get(f'/api/utils/address-retrieve/?id={self.test_id}')

        response = address_retrieve(request)

        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertIn('addresses', data)
        self.assertEqual(len(data['addresses']), 1)
        self.assertEqual(data['addresses'][0]['postcode'], 'SW1A 1AA')

    @patch('utils.services.PostcoderService')
    def test_retrieve_includes_country_parameter(self, mock_postcoder_service):
        """Test retrieve passes country code to service"""
        from utils.views import address_retrieve

        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.retrieve_address.return_value = self.test_full_address
        mock_postcoder_instance.transform_to_getaddress_format.return_value = {"addresses": []}

        request = self.factory.get(f'/api/utils/address-retrieve/?id={self.test_id}&country=US')

        response = address_retrieve(request)

        # Verify retrieve_address was called with country=US
        mock_postcoder_instance.retrieve_address.assert_called_once_with(self.test_id, country_code='US')

    # ==================== Error Handling Tests ====================

    @patch('utils.services.PostcoderService')
    def test_api_error_returns_500(self, mock_postcoder_service):
        """Test API error returns 500 response"""
        from utils.views import address_retrieve

        # Mock API error
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.retrieve_address.side_effect = ValueError("Invalid ID")

        request = self.factory.get(f'/api/utils/address-retrieve/?id=invalid')

        response = address_retrieve(request)

        self.assertEqual(response.status_code, 500)
        data = json.loads(response.content)
        self.assertIn('error', data)


if __name__ == '__main__':
    import unittest
    unittest.main()
