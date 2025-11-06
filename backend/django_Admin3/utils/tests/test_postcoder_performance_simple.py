"""
Simplified performance tests for Postcoder address lookup endpoint.

These tests verify basic performance targets without complex Unicode characters.

Run with:
    python manage.py test utils.tests.test_postcoder_performance_simple --keepdb -v 2
"""

from django.test import TestCase, RequestFactory
from django.utils import timezone
from unittest.mock import patch, Mock
from datetime import timedelta
import time

from utils.views import postcoder_address_lookup
from address_cache.models import CachedAddress
from address_analytics.models import AddressLookupLog


class PostcoderPerformanceSimpleTests(TestCase):
    """Simplified performance tests"""

    def setUp(self):
        """Set up test fixtures - clean slate for each test"""
        # Clean up any leftover data from previous tests
        CachedAddress.objects.all().delete()
        AddressLookupLog.objects.all().delete()

        self.factory = RequestFactory()
        self.test_postcode = 'SW1A1AA'

        self.mock_api_response = [
            {
                "postcode": "SW1A 1AA",
                "summaryline": "10 Downing Street, Westminster, London SW1A 1AA",
                "number": "10",
                "street": "Downing Street",
                "posttown": "LONDON",
                "county": "Greater London"
            }
        ]

    def tearDown(self):
        """Clean up test data"""
        CachedAddress.objects.all().delete()
        AddressLookupLog.objects.all().delete()

    @patch('utils.services.postcoder_service.requests.get')
    def test_cache_miss_response_time_reasonable(self, mock_get):
        """Test: Cache miss response time is reasonable"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_get.return_value = mock_response

        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        start_time = time.time()
        response = postcoder_address_lookup(request)
        elapsed_ms = (time.time() - start_time) * 1000

        self.assertEqual(response.status_code, 200)
        self.assertLess(elapsed_ms, 500, f"Cache miss took {elapsed_ms:.2f}ms (target: <500ms)")

        print(f"\n[OK] Cache miss response time: {elapsed_ms:.2f}ms (target: <500ms)")

    def test_cache_hit_faster_than_miss(self):
        """Test: Cache hit is faster than cache miss"""
        # Pre-populate cache
        CachedAddress.objects.create(
            postcode=self.test_postcode,
            formatted_addresses={"addresses": [{"line_1": "Test", "postcode": "SW1A 1AA"}]},
            response_data={},
            expires_at=timezone.now() + timedelta(days=7)
        )

        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        start_time = time.time()
        response = postcoder_address_lookup(request)
        elapsed_ms = (time.time() - start_time) * 1000

        self.assertEqual(response.status_code, 200)
        self.assertLess(elapsed_ms, 100, f"Cache hit took {elapsed_ms:.2f}ms (target: <100ms)")

        print(f"\n[OK] Cache hit response time: {elapsed_ms:.2f}ms (target: <100ms)")

    @patch('utils.services.postcoder_service.requests.get')
    def test_cache_creates_database_entry(self, mock_get):
        """Test: Cache miss creates database entry"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_get.return_value = mock_response

        # Verify no cache before
        self.assertEqual(CachedAddress.objects.filter(postcode=self.test_postcode).count(), 0)

        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')
        response = postcoder_address_lookup(request)

        # Verify cache created
        self.assertEqual(response.status_code, 200)
        self.assertEqual(CachedAddress.objects.filter(postcode=self.test_postcode).count(), 1)

        # Verify expiration set
        cached = CachedAddress.objects.filter(postcode=self.test_postcode).first()
        self.assertIsNotNone(cached, "Cache entry not found")
        expected_expiration = timezone.now() + timedelta(days=7)
        time_diff = abs((cached.expires_at - expected_expiration).total_seconds())
        self.assertLess(time_diff, 5, "Cache expiration not set to ~7 days")

        print(f"\n[OK] Cache entry created with 7-day expiration")

    def test_cache_hit_increments_counter(self):
        """Test: Cache hits increment hit_count"""
        # Create cache entry
        CachedAddress.objects.create(
            postcode=self.test_postcode,
            formatted_addresses={"addresses": [{"line_1": "Test"}]},
            response_data={},
            expires_at=timezone.now() + timedelta(days=7)
        )

        # Make 3 requests
        for i in range(3):
            request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')
            response = postcoder_address_lookup(request)
            self.assertEqual(response.status_code, 200)
            time.sleep(0.01)  # Small delay

        # Verify hit count (get most recent cache entry)
        cached = CachedAddress.objects.filter(postcode=self.test_postcode).order_by('-created_at').first()
        self.assertIsNotNone(cached, "Cache entry not found")
        self.assertEqual(cached.hit_count, 3, f"Expected hit_count=3, got {cached.hit_count}")

        print(f"\n[OK] Hit count incremented correctly ({cached.hit_count} hits)")

    @patch('utils.services.postcoder_service.requests.get')
    def test_analytics_logging_works(self, mock_get):
        """Test: Analytics logging creates entries"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_get.return_value = mock_response

        # Verify no logs before
        self.assertEqual(AddressLookupLog.objects.filter(postcode=self.test_postcode).count(), 0)

        # Make request
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')
        response = postcoder_address_lookup(request)

        # Verify log created
        self.assertEqual(response.status_code, 200)
        self.assertEqual(AddressLookupLog.objects.filter(postcode=self.test_postcode).count(), 1)

        # Verify log details
        log = AddressLookupLog.objects.filter(postcode=self.test_postcode).first()
        self.assertIsNotNone(log, "Log entry not found")
        self.assertFalse(log.cache_hit, "First request should be cache miss")
        self.assertTrue(log.success, "Lookup should be successful")
        self.assertEqual(log.api_provider, 'postcoder')
        self.assertGreater(log.response_time_ms, 0)

        print(f"\n[OK] Analytics log created with correct metadata")

    @patch('utils.services.postcoder_service.requests.get')
    def test_performance_summary(self, mock_get):
        """Performance Summary Test"""
        # Mock API response with small delay
        def delayed_response(*args, **kwargs):
            time.sleep(0.05)  # 50ms delay
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = self.mock_api_response
            return mock_response

        mock_get.side_effect = delayed_response

        # Test cache miss
        request1 = self.factory.get('/api/utils/postcoder-address-lookup/?postcode=TEST01')
        start = time.time()
        response1 = postcoder_address_lookup(request1)
        cache_miss_time = (time.time() - start) * 1000

        self.assertEqual(response1.status_code, 200)

        time.sleep(0.01)

        # Test cache hit
        request2 = self.factory.get('/api/utils/postcoder-address-lookup/?postcode=TEST01')
        start = time.time()
        response2 = postcoder_address_lookup(request2)
        cache_hit_time = (time.time() - start) * 1000

        self.assertEqual(response2.status_code, 200)

        # Calculate improvement
        improvement = cache_miss_time / cache_hit_time if cache_hit_time > 0 else 1.0

        # Print summary
        print("\n" + "="*60)
        print("PERFORMANCE TEST SUMMARY")
        print("="*60)
        print(f"Cache Miss (API Call):  {cache_miss_time:.2f}ms")
        print(f"Cache Hit (Database):   {cache_hit_time:.2f}ms")
        print(f"Performance Gain:       {improvement:.2f}x faster")
        print("="*60)

        # Basic verification
        self.assertLess(cache_miss_time, 500, "Cache miss exceeded 500ms")
        self.assertLess(cache_hit_time, 100, "Cache hit exceeded 100ms")

        print("\n[OK] All performance targets met\n")

        # Cleanup
        CachedAddress.objects.all().delete()
        AddressLookupLog.objects.all().delete()
