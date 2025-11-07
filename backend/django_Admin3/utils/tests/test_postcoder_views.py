"""
Unit Tests for postcoder_address_lookup View

Tests the Postcoder.com address lookup endpoint including:
- Request validation (missing/invalid postcode)
- Cache hit/miss flows
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
                    "postcode": "SW1A 1AA",
                    "line_1": "10 Downing Street",
                    "town_or_city": "London",
                    "county": "Greater London",
                    "country": "England"
                }
            ]
        }

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

    # ==================== Cache Hit Flow Tests ====================

    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_cache_hit_returns_cached_addresses(self, mock_cache_service, mock_postcoder_service, mock_logger_service):
        """Test cache hit returns addresses from cache"""
        # Mock cache hit
        mock_cache_instance = mock_cache_service.return_value
        mock_cache_instance.get_cached_address.return_value = self.test_addresses

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
        self.assertTrue(data['cache_hit'])
        self.assertIn('response_time_ms', data)

        # Verify cache was checked
        mock_cache_instance.get_cached_address.assert_called_once_with(self.test_postcode)

        # Verify API was NOT called
        mock_postcoder_service.return_value.lookup_address.assert_not_called()

    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_cache_hit_logs_analytics(self, mock_cache_service, mock_postcoder_service, mock_logger_service):
        """Test cache hit logs analytics with cache_hit=True"""
        # Mock cache hit
        mock_cache_instance = mock_cache_service.return_value
        mock_cache_instance.get_cached_address.return_value = self.test_addresses

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.return_value = True

        # Create request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        response = postcoder_address_lookup(request)

        # Verify logging was called with cache_hit=True
        mock_logger_instance.log_lookup.assert_called_once()
        call_kwargs = mock_logger_instance.log_lookup.call_args[1]
        self.assertTrue(call_kwargs['cache_hit'])
        self.assertTrue(call_kwargs['success'])
        self.assertEqual(call_kwargs['result_count'], 1)

    # ==================== Cache Miss Flow Tests ====================

    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_cache_miss_calls_api(self, mock_cache_service, mock_postcoder_service, mock_logger_service):
        """Test cache miss calls Postcoder API"""
        # Mock cache miss
        mock_cache_instance = mock_cache_service.return_value
        mock_cache_instance.get_cached_address.return_value = None

        # Mock API call
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.lookup_address.return_value = [{"postcode": "SW1A1AA"}]
        mock_postcoder_instance.transform_to_getaddress_format.return_value = self.test_addresses

        # Mock caching
        mock_cache_instance.cache_address.return_value = True

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.return_value = True

        # Create request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        response = postcoder_address_lookup(request)

        # Verify response
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertFalse(data['cache_hit'])

        # Verify API was called
        mock_postcoder_instance.lookup_address.assert_called_once_with(self.test_postcode)
        mock_postcoder_instance.transform_to_getaddress_format.assert_called_once()

    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_cache_miss_caches_result(self, mock_cache_service, mock_postcoder_service, mock_logger_service):
        """Test cache miss caches the API result"""
        # Mock cache miss
        mock_cache_instance = mock_cache_service.return_value
        mock_cache_instance.get_cached_address.return_value = None

        # Mock API call
        mock_postcoder_instance = mock_postcoder_service.return_value
        api_response = [{"postcode": "SW1A1AA", "street": "Downing Street"}]
        mock_postcoder_instance.lookup_address.return_value = api_response
        mock_postcoder_instance.transform_to_getaddress_format.return_value = self.test_addresses

        # Mock caching
        mock_cache_instance.cache_address.return_value = True

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.return_value = True

        # Create request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode=SW1A 1AA')

        response = postcoder_address_lookup(request)

        # Verify caching was called with correct parameters
        mock_cache_instance.cache_address.assert_called_once()
        call_kwargs = mock_cache_instance.cache_address.call_args[1]
        self.assertEqual(call_kwargs['postcode'], 'SW1A1AA')
        self.assertEqual(call_kwargs['addresses'], self.test_addresses)
        self.assertEqual(call_kwargs['response_data'], api_response)
        self.assertEqual(call_kwargs['search_query'], 'SW1A 1AA')

    # ==================== API Error Handling Tests ====================

    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_api_value_error_returns_500(self, mock_cache_service, mock_postcoder_service, mock_logger_service):
        """Test ValueError from API returns 500 error"""
        # Mock cache miss
        mock_cache_instance = mock_cache_service.return_value
        mock_cache_instance.get_cached_address.return_value = None

        # Mock API error
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.lookup_address.side_effect = ValueError("Invalid postcode")

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
        # Mock cache miss
        mock_cache_instance = mock_cache_service.return_value
        mock_cache_instance.get_cached_address.return_value = None

        # Mock API timeout
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.lookup_address.side_effect = TimeoutError("Request timed out")

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
        # Mock cache miss
        mock_cache_instance = mock_cache_service.return_value
        mock_cache_instance.get_cached_address.return_value = None

        # Mock API error
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.lookup_address.side_effect = Exception("Unexpected error")

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
        # Mock cache miss
        mock_cache_instance = mock_cache_service.return_value
        mock_cache_instance.get_cached_address.return_value = None

        # Mock API error
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.lookup_address.side_effect = ValueError("Invalid postcode")

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

    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_response_format_matches_getaddress(self, mock_cache_service, mock_postcoder_service, mock_logger_service):
        """Test response format matches getaddress.io structure"""
        # Mock cache hit
        mock_cache_instance = mock_cache_service.return_value
        mock_cache_instance.get_cached_address.return_value = self.test_addresses

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

    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_response_includes_timing_metadata(self, mock_cache_service, mock_postcoder_service, mock_logger_service):
        """Test response includes response_time_ms metadata"""
        # Mock cache hit
        mock_cache_instance = mock_cache_service.return_value
        mock_cache_instance.get_cached_address.return_value = self.test_addresses

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

    # ==================== Postcode Cleaning Tests ====================

    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_postcode_cleaned_before_cache_check(self, mock_cache_service, mock_postcoder_service, mock_logger_service):
        """Test postcode is cleaned (uppercase, no spaces) before cache check"""
        # Mock cache hit
        mock_cache_instance = mock_cache_service.return_value
        mock_cache_instance.get_cached_address.return_value = self.test_addresses

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.return_value = True

        # Create request with lowercase and spaces
        request = self.factory.get('/api/utils/postcoder-address-lookup/?postcode=sw1a 1aa')

        response = postcoder_address_lookup(request)

        # Verify cleaned postcode used for cache lookup
        mock_cache_instance.get_cached_address.assert_called_once_with('SW1A1AA')

    # ==================== Logging Tests ====================

    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_logging_failure_does_not_break_response(self, mock_cache_service, mock_postcoder_service, mock_logger_service):
        """Test logging failure doesn't break the lookup response"""
        # Mock cache hit
        mock_cache_instance = mock_cache_service.return_value
        mock_cache_instance.get_cached_address.return_value = self.test_addresses

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

    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_catch_all_exception_logs_failure(self, mock_cache_service, mock_postcoder_service, mock_logger_service):
        """Test catch-all exception handler logs failure"""
        # Mock cache service to raise unexpected exception
        mock_cache_instance = mock_cache_service.return_value
        mock_cache_instance.get_cached_address.side_effect = RuntimeError("Unexpected database error")

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_failed_lookup.return_value = True

        # Create request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        response = postcoder_address_lookup(request)

        # Verify failure was logged
        mock_logger_instance.log_failed_lookup.assert_called_once()

        # Verify 500 response
        self.assertEqual(response.status_code, 500)

    # ==================== Integration & Edge Cases ====================

    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_empty_addresses_handled_correctly(self, mock_cache_service, mock_postcoder_service, mock_logger_service):
        """Test empty addresses list handled correctly"""
        # Mock cache miss
        mock_cache_instance = mock_cache_service.return_value
        mock_cache_instance.get_cached_address.return_value = None

        # Mock API returns empty addresses
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.lookup_address.return_value = []
        mock_postcoder_instance.transform_to_getaddress_format.return_value = {"addresses": []}

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

    @patch('utils.services.AddressLookupLogger')
    @patch('utils.services.PostcoderService')
    @patch('utils.services.AddressCacheService')
    def test_multiple_addresses_counted_correctly(self, mock_cache_service, mock_postcoder_service, mock_logger_service):
        """Test multiple addresses counted correctly in logging"""
        # Mock cache miss
        mock_cache_instance = mock_cache_service.return_value
        mock_cache_instance.get_cached_address.return_value = None

        # Mock API returns multiple addresses
        multi_addresses = {
            "addresses": [
                {"line_1": "Address 1"},
                {"line_1": "Address 2"},
                {"line_1": "Address 3"}
            ]
        }
        mock_postcoder_instance = mock_postcoder_service.return_value
        mock_postcoder_instance.lookup_address.return_value = []
        mock_postcoder_instance.transform_to_getaddress_format.return_value = multi_addresses

        # Mock logger
        mock_logger_instance = mock_logger_service.return_value
        mock_logger_instance.log_lookup.return_value = True

        # Create request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        response = postcoder_address_lookup(request)

        # Verify logging with result_count=3
        call_kwargs = mock_logger_instance.log_lookup.call_args[1]
        self.assertEqual(call_kwargs['result_count'], 3)


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
