"""
Integration tests for postcoder_address_lookup endpoint.

These tests verify the full end-to-end flow with real database interactions:
- Request validation
- Cache miss → API call → cache store → log → response
- Cache hit on subsequent requests
- Database entries (CachedAddress, AddressLookupLog) created correctly
- Error handling across the full stack

Unlike unit tests, these tests use real service instances and database operations,
mocking only the external Postcoder API call.

NOTE: As of 2025, the postcoder_address_lookup endpoint uses autocomplete which
intentionally does NOT cache results (autocomplete suggestions are temporary).
Many caching tests have been skipped as they test removed functionality.
"""

from django.test import TestCase, RequestFactory
from django.utils import timezone
from unittest.mock import patch, Mock
from datetime import timedelta
import json
import time
import unittest

from utils.views import postcoder_address_lookup
from address_cache.models import CachedAddress
from address_analytics.models import AddressLookupLog

# Skip reason for caching tests - autocomplete doesn't cache
SKIP_CACHE_REASON = "Autocomplete endpoint intentionally does not cache - see postcoder_address_lookup view"


class PostcoderAddressLookupIntegrationTests(TestCase):
    """Integration tests for postcoder_address_lookup endpoint"""

    def setUp(self):
        """Set up test fixtures"""
        # Clean up test data at START of each test (in case previous test failed)
        CachedAddress.objects.all().delete()
        AddressLookupLog.objects.all().delete()

        self.factory = RequestFactory()
        self.test_postcode = 'SW1A1AA'

        # Sample API response matching Postcoder.com format
        self.mock_api_response = [
            {
                "postcode": "SW1A 1AA",
                "summaryline": "10 Downing Street, Westminster, London SW1A 1AA",
                "number": "10",
                "street": "Downing Street",
                "posttown": "LONDON",
                "county": "Greater London",
                "latitude": 51.503396,
                "longitude": -0.127784
            },
            {
                "postcode": "SW1A 1AA",
                "summaryline": "11 Downing Street, Westminster, London SW1A 1AA",
                "number": "11",
                "street": "Downing Street",
                "posttown": "LONDON",
                "county": "Greater London",
                "latitude": 51.503400,
                "longitude": -0.127800
            }
        ]

    def tearDown(self):
        """Clean up test data"""
        CachedAddress.objects.all().delete()
        AddressLookupLog.objects.all().delete()

    @unittest.skip(SKIP_CACHE_REASON)
    @patch('utils.services.postcoder_service.requests.get')
    def test_full_flow_cache_miss_creates_all_entries(self, mock_get):
        """
        Test complete flow: cache miss → API call → cache store → log → response
        Verifies database entries are created
        """
        # Mock successful API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_get.return_value = mock_response

        # Verify no cached entries exist
        self.assertEqual(CachedAddress.objects.filter(postcode=self.test_postcode).count(), 0)
        self.assertEqual(AddressLookupLog.objects.filter(postcode=self.test_postcode).count(), 0)

        # Make request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')
        response = postcoder_address_lookup(request)

        # Verify response
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertIn('addresses', data)
        self.assertEqual(len(data['addresses']), 2)
        self.assertFalse(data['cache_hit'])
        self.assertGreaterEqual(data['response_time_ms'], 0)

        # Verify address format matches getaddress.io
        first_address = data['addresses'][0]
        self.assertIn('formatted_address', first_address)
        self.assertIn('line_1', first_address)
        # PostcoderService formats postcodes with space (SW1A 1AA or SW1A  1AA)
        self.assertIn('SW1A', first_address['postcode'])

        # Verify CachedAddress entry created
        cached_addresses = CachedAddress.objects.filter(postcode=self.test_postcode)
        self.assertEqual(cached_addresses.count(), 1)
        cached = cached_addresses.first()
        self.assertIsNotNone(cached)
        self.assertEqual(len(cached.formatted_addresses['addresses']), 2)
        self.assertEqual(cached.hit_count, 0)  # First request, not hit yet

        # Verify TTL is ~7 days
        expected_expiration = timezone.now() + timedelta(days=7)
        time_diff = abs((cached.expires_at - expected_expiration).total_seconds())
        self.assertLess(time_diff, 5)  # Allow 5 second tolerance

        # Verify AddressLookupLog entry created
        logs = AddressLookupLog.objects.filter(postcode=self.test_postcode)
        self.assertEqual(logs.count(), 1)
        log = logs.first()
        self.assertIsNotNone(log)
        self.assertFalse(log.cache_hit)
        self.assertTrue(log.success)
        self.assertEqual(log.result_count, 2)
        self.assertGreaterEqual(log.response_time_ms, 0)  # Allow 0ms in test mode
        self.assertEqual(log.api_provider, 'postcoder')

    @unittest.skip(SKIP_CACHE_REASON)
    @patch('utils.services.postcoder_service.requests.get')
    def test_full_flow_cache_hit_on_second_request(self, mock_get):
        """
        Test cache hit behavior: first request populates cache, second request uses cache
        Verifies hit_count is incremented and API is not called on second request
        """
        # Mock successful API response for first request
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_get.return_value = mock_response

        # First request - cache miss
        request1 = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')
        response1 = postcoder_address_lookup(request1)

        data1 = json.loads(response1.content)
        self.assertFalse(data1['cache_hit'])
        self.assertEqual(mock_get.call_count, 1)

        # Verify cache entry created
        cached = CachedAddress.objects.get(postcode=self.test_postcode)
        self.assertEqual(cached.hit_count, 0)

        # Small delay to ensure different timestamps
        time.sleep(0.01)

        # Second request - should hit cache
        request2 = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')
        response2 = postcoder_address_lookup(request2)

        data2 = json.loads(response2.content)
        self.assertTrue(data2['cache_hit'])
        self.assertEqual(data2['addresses'], data1['addresses'])  # Same addresses

        # API should NOT be called again
        self.assertEqual(mock_get.call_count, 1)

        # Verify hit_count incremented
        cached.refresh_from_db()
        self.assertEqual(cached.hit_count, 1)

        # Verify two log entries (one for cache miss, one for cache hit)
        logs = AddressLookupLog.objects.filter(postcode=self.test_postcode).order_by('lookup_timestamp')
        self.assertEqual(logs.count(), 2)

        first_log = logs[0]
        self.assertFalse(first_log.cache_hit)
        self.assertTrue(first_log.success)

        second_log = logs[1]
        self.assertTrue(second_log.cache_hit)
        self.assertTrue(second_log.success)

    @unittest.skip(SKIP_CACHE_REASON)
    @patch('utils.services.postcoder_service.requests.get')
    def test_full_flow_expired_cache_triggers_refresh(self, mock_get):
        """
        Test expired cache is treated as miss and triggers API call
        """
        # Clean up any existing cache entries for this postcode
        CachedAddress.objects.filter(postcode=self.test_postcode).delete()
        AddressLookupLog.objects.filter(postcode=self.test_postcode).delete()

        # Create expired cache entry
        expired_time = timezone.now() - timedelta(days=1)
        CachedAddress.objects.create(
            postcode=self.test_postcode,
            formatted_addresses={"addresses": [{"line_1": "Old Address"}]},
            response_data={},
            expires_at=expired_time
        )

        # Mock fresh API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_get.return_value = mock_response

        # Make request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')
        response = postcoder_address_lookup(request)

        # Verify response shows cache miss (expired cache treated as miss)
        data = json.loads(response.content)
        self.assertFalse(data['cache_hit'])

        # Verify API was called
        self.assertEqual(mock_get.call_count, 1)

        # Verify new cache entry created (should have 2 entries: expired + new)
        all_entries = CachedAddress.objects.filter(postcode=self.test_postcode)
        self.assertEqual(all_entries.count(), 2, "Should have expired entry + new entry")

        # Verify new NON-EXPIRED cache entry has fresh data
        valid_cached = CachedAddress.objects.filter(
            postcode=self.test_postcode,
            expires_at__gt=timezone.now()
        ).order_by('-created_at').first()
        self.assertIsNotNone(valid_cached, "New valid cache entry should exist")
        # New entry should have transformed Postcoder data, not "Old Address"
        self.assertNotEqual(valid_cached.formatted_addresses['addresses'][0].get('line_1'), "Old Address")
        # Verify it has data from mock API response
        self.assertGreater(len(valid_cached.formatted_addresses['addresses']), 0)

    @patch('utils.services.postcoder_service.requests.get')
    def test_full_flow_api_error_logs_failure(self, mock_get):
        """
        Test API error creates failure log entry and returns 500 response
        """
        # Mock API error
        mock_get.side_effect = Exception("API connection error")

        # Make request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')
        response = postcoder_address_lookup(request)

        # Verify error response
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.content)
        self.assertIn('error', data)

        # Verify no cache entry created
        self.assertEqual(CachedAddress.objects.filter(postcode=self.test_postcode).count(), 0)

        # Verify failure log entry created
        logs = AddressLookupLog.objects.filter(postcode=self.test_postcode)
        self.assertEqual(logs.count(), 1)
        log = logs.first()
        self.assertFalse(log.success)
        self.assertEqual(log.result_count, 0)
        self.assertIsNotNone(log.error_message)

    @unittest.skip(SKIP_CACHE_REASON)
    @patch('utils.services.postcoder_service.requests.get')
    def test_full_flow_postcode_cleaning(self, mock_get):
        """
        Test postcode cleaning works end-to-end (lowercase, spaces)
        """
        # Mock API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_get.return_value = mock_response

        # Request with messy postcode
        messy_postcode = 'sw1a 1aa'  # lowercase with space
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={messy_postcode}')
        response = postcoder_address_lookup(request)

        # Verify successful response
        self.assertEqual(response.status_code, 200)

        # Verify cache stored with cleaned postcode
        cached = CachedAddress.objects.filter(postcode='SW1A1AA').first()
        self.assertIsNotNone(cached)

        # Verify log stored with cleaned postcode
        log = AddressLookupLog.objects.filter(postcode='SW1A1AA').first()
        self.assertIsNotNone(log)

    def test_full_flow_validation_errors(self):
        """
        Test validation errors don't create any database entries
        """
        # Request without postcode
        request = self.factory.get('/api/utils/postcoder-address-lookup/')
        response = postcoder_address_lookup(request)

        self.assertEqual(response.status_code, 400)

        # Verify no entries created
        self.assertEqual(CachedAddress.objects.count(), 0)
        self.assertEqual(AddressLookupLog.objects.count(), 0)

    @unittest.skip(SKIP_CACHE_REASON)
    @patch('utils.services.postcoder_service.requests.get')
    def test_full_flow_multiple_postcodes_independent_caching(self, mock_get):
        """
        Test multiple postcodes are cached independently
        """
        # Mock API responses
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_get.return_value = mock_response

        postcodes = ['SW1A1AA', 'EC1A1BB', 'W1A1AA']

        # Make requests for different postcodes
        for postcode in postcodes:
            request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={postcode}')
            response = postcoder_address_lookup(request)
            self.assertEqual(response.status_code, 200)

        # Verify separate cache entries
        self.assertEqual(CachedAddress.objects.count(), 3)
        for postcode in postcodes:
            cached = CachedAddress.objects.filter(postcode=postcode).first()
            self.assertIsNotNone(cached)

        # Verify separate log entries
        self.assertEqual(AddressLookupLog.objects.count(), 3)
        for postcode in postcodes:
            log = AddressLookupLog.objects.filter(postcode=postcode).first()
            self.assertIsNotNone(log)

    @unittest.skip(SKIP_CACHE_REASON)
    @patch('utils.services.postcoder_service.requests.get')
    def test_full_flow_concurrent_requests_same_postcode(self, mock_get):
        """
        Test multiple requests for same postcode create single cache entry
        """
        # Mock API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_get.return_value = mock_response

        # Make three requests for same postcode
        for _ in range(3):
            request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')
            response = postcoder_address_lookup(request)
            self.assertEqual(response.status_code, 200)
            time.sleep(0.01)  # Small delay

        # Verify single cache entry (most recent)
        cached_entries = CachedAddress.objects.filter(postcode=self.test_postcode)
        # Note: Could be multiple entries if requests overlap, but at least one should exist
        self.assertGreaterEqual(cached_entries.count(), 1)

        # Verify hit_count reflects cache hits (first request = miss, subsequent = hits)
        latest_cache = cached_entries.order_by('-created_at').first()
        # First request creates cache (hit_count=0), second increments (hit_count=1), third increments (hit_count=2)
        # But if new cache entries are created, hit_count might be different
        self.assertGreaterEqual(latest_cache.hit_count, 0)

        # Verify three log entries
        logs = AddressLookupLog.objects.filter(postcode=self.test_postcode)
        self.assertEqual(logs.count(), 3)

    @unittest.skip(SKIP_CACHE_REASON)
    @patch('utils.services.postcoder_service.requests.get')
    def test_full_flow_404_creates_empty_cache_entry(self, mock_get):
        """
        Test 404 response (postcode not found) creates cache entry with empty addresses
        """
        # Mock 404 response
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.json.return_value = []
        mock_get.return_value = mock_response

        # Make request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')
        response = postcoder_address_lookup(request)

        # Verify successful response with empty addresses
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertEqual(data['addresses'], [])
        self.assertFalse(data['cache_hit'])

        # Verify cache entry created with empty addresses
        cached = CachedAddress.objects.filter(postcode=self.test_postcode).first()
        self.assertIsNotNone(cached)
        self.assertEqual(cached.formatted_addresses['addresses'], [])

        # Verify successful log entry (404 is not an error, just no results)
        log = AddressLookupLog.objects.filter(postcode=self.test_postcode).first()
        self.assertIsNotNone(log)
        self.assertTrue(log.success)
        self.assertEqual(log.result_count, 0)

    @unittest.skip(SKIP_CACHE_REASON)
    @patch('utils.services.postcoder_service.requests.get')
    @patch('address_analytics.models.AddressLookupLog.objects.create')
    def test_full_flow_logging_failure_doesnt_break_response(self, mock_log_create, mock_get):
        """
        Test logging failure doesn't prevent successful response
        """
        # Mock successful API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_get.return_value = mock_response

        # Mock logging failure
        mock_log_create.side_effect = Exception("Database error")

        # Make request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')
        response = postcoder_address_lookup(request)

        # Verify response is still successful
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)
        self.assertIn('addresses', data)
        self.assertEqual(len(data['addresses']), 2)

        # Verify cache entry still created
        cached = CachedAddress.objects.filter(postcode=self.test_postcode).first()
        self.assertIsNotNone(cached)

    @patch('utils.services.postcoder_service.requests.get')
    def test_full_flow_response_time_tracking(self, mock_get):
        """
        Test response time is tracked accurately in logs
        """
        # Mock API response with delay
        def delayed_response(*args, **kwargs):
            time.sleep(0.1)  # 100ms delay
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = self.mock_api_response
            return mock_response

        mock_get.side_effect = delayed_response

        # Make request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')
        response = postcoder_address_lookup(request)

        # Verify response
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.content)

        # Response time should be >= 100ms (the delay we added)
        self.assertGreaterEqual(data['response_time_ms'], 100)

        # Verify log entry has accurate response time
        log = AddressLookupLog.objects.filter(postcode=self.test_postcode).first()
        self.assertIsNotNone(log)
        self.assertGreaterEqual(log.response_time_ms, 100)

    @unittest.skip(SKIP_CACHE_REASON)
    @patch('utils.services.postcoder_service.requests.get')
    def test_full_flow_case_insensitive_postcode_caching(self, mock_get):
        """
        Test postcodes are stored in uppercase for consistent caching
        """
        # Mock API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_get.return_value = mock_response

        # Request with lowercase postcode
        request1 = self.factory.get('/api/utils/postcoder-address-lookup/?postcode=sw1a1aa')
        response1 = postcoder_address_lookup(request1)
        self.assertEqual(response1.status_code, 200)

        # Request with uppercase postcode
        request2 = self.factory.get('/api/utils/postcoder-address-lookup/?postcode=SW1A1AA')
        response2 = postcoder_address_lookup(request2)
        self.assertEqual(response2.status_code, 200)

        # Both should use same cache entry
        data1 = json.loads(response1.content)
        data2 = json.loads(response2.content)

        # First request is cache miss, second is cache hit
        self.assertFalse(data1['cache_hit'])
        self.assertTrue(data2['cache_hit'])

        # Verify single cache entry (uppercase)
        cached_entries = CachedAddress.objects.filter(postcode='SW1A1AA')
        self.assertEqual(cached_entries.count(), 1)

        # Verify hit_count incremented
        cached = cached_entries.first()
        self.assertEqual(cached.hit_count, 1)

        # API should only be called once
        self.assertEqual(mock_get.call_count, 1)
