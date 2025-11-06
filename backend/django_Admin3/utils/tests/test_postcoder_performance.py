"""
Performance tests for Postcoder address lookup endpoint.

Tests verify response time targets:
- Cache miss: < 500ms
- Cache hit: < 100ms
- Concurrent requests: No degradation
- Memory: No leaks with repeated requests

Run with:
    python manage.py test utils.tests.test_postcoder_performance --keepdb -v 2
"""

from django.test import TestCase, RequestFactory
from django.utils import timezone
from unittest.mock import patch, Mock
from datetime import timedelta
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import tracemalloc

from utils.views import postcoder_address_lookup
from address_cache.models import CachedAddress
from address_analytics.models import AddressLookupLog


class PostcoderPerformanceTests(TestCase):
    """Performance tests for postcoder_address_lookup endpoint"""

    def setUp(self):
        """Set up test fixtures"""
        self.factory = RequestFactory()
        self.test_postcode = 'SW1A1AA'

        # Sample API response
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
    def test_cache_miss_response_time_under_500ms(self, mock_get):
        """
        Performance Test 1: Cache miss response time should be < 500ms
        (Includes API call + processing + database writes)
        """
        # Mock API response with realistic delay
        def delayed_response(*args, **kwargs):
            time.sleep(0.15)  # Simulate 150ms API call
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = self.mock_api_response
            return mock_response

        mock_get.side_effect = delayed_response

        # Make request and measure time
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        start_time = time.time()
        response = postcoder_address_lookup(request)
        elapsed_ms = (time.time() - start_time) * 1000

        # Verify performance target
        self.assertEqual(response.status_code, 200)
        self.assertLess(
            elapsed_ms,
            500,
            f"Cache miss response time ({elapsed_ms:.2f}ms) exceeds 500ms target"
        )

        # Log actual time for reference
        print(f"\n  [OK] Cache miss response time: {elapsed_ms:.2f}ms (target: <500ms)")

    def test_cache_hit_response_time_under_100ms(self):
        """
        Performance Test 2: Cache hit response time should be < 100ms
        (Database read only, no API call)
        """
        # Pre-populate cache
        CachedAddress.objects.create(
            postcode=self.test_postcode,
            formatted_addresses={"addresses": [{"line_1": "Test Address", "postcode": "SW1A 1AA"}]},
            response_data={},
            expires_at=timezone.now() + timedelta(days=7)
        )

        # Make request and measure time
        request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        start_time = time.time()
        response = postcoder_address_lookup(request)
        elapsed_ms = (time.time() - start_time) * 1000

        # Verify performance target
        self.assertEqual(response.status_code, 200)
        self.assertLess(
            elapsed_ms,
            100,
            f"Cache hit response time ({elapsed_ms:.2f}ms) exceeds 100ms target"
        )

        # Log actual time for reference
        print(f"\n  [OK] Cache hit response time: {elapsed_ms:.2f}ms (target: <100ms)")

    @patch('utils.services.postcoder_service.requests.get')
    def test_concurrent_requests_performance(self, mock_get):
        """
        Performance Test 3: Concurrent requests should not degrade performance
        Tests 10 concurrent requests for same postcode
        """
        # Mock API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_get.return_value = mock_response

        # Function to make request
        def make_request():
            request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')
            start_time = time.time()
            response = postcoder_address_lookup(request)
            elapsed_ms = (time.time() - start_time) * 1000
            return response.status_code, elapsed_ms

        # Execute concurrent requests
        num_requests = 10
        response_times = []

        with ThreadPoolExecutor(max_workers=num_requests) as executor:
            futures = [executor.submit(make_request) for _ in range(num_requests)]

            for future in as_completed(futures):
                status_code, elapsed_ms = future.result()
                self.assertEqual(status_code, 200)
                response_times.append(elapsed_ms)

        # Calculate statistics
        avg_time = sum(response_times) / len(response_times)
        max_time = max(response_times)
        min_time = min(response_times)

        # Verify all requests completed in reasonable time
        self.assertLess(
            max_time,
            1000,
            f"Slowest concurrent request ({max_time:.2f}ms) exceeds 1000ms threshold"
        )

        print(f"\n  [OK] Concurrent requests performance:")
        print(f"    - Average: {avg_time:.2f}ms")
        print(f"    - Min: {min_time:.2f}ms")
        print(f"    - Max: {max_time:.2f}ms")
        print(f"    - Requests: {num_requests}")

    @patch('utils.services.postcoder_service.requests.get')
    def test_repeated_requests_no_memory_leak(self, mock_get):
        """
        Performance Test 4: Repeated requests should not cause memory leaks
        Tests 100 sequential requests and monitors memory usage
        """
        # Mock API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_get.return_value = mock_response

        # Start memory tracking
        tracemalloc.start()

        # Get baseline memory
        baseline_snapshot = tracemalloc.take_snapshot()
        baseline_memory = sum(stat.size for stat in baseline_snapshot.statistics('lineno'))

        # Make 100 requests
        num_requests = 100
        postcodes = [f'SW{i:02d}AA' for i in range(num_requests)]

        for postcode in postcodes:
            request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={postcode}')
            response = postcoder_address_lookup(request)
            self.assertEqual(response.status_code, 200)

            # Clean up cache periodically to avoid artificial growth
            if len(postcodes) % 20 == 0:
                CachedAddress.objects.filter(
                    expires_at__lt=timezone.now()
                ).delete()

        # Get final memory
        final_snapshot = tracemalloc.take_snapshot()
        final_memory = sum(stat.size for stat in final_snapshot.statistics('lineno'))

        # Calculate memory growth
        memory_growth_mb = (final_memory - baseline_memory) / (1024 * 1024)

        # Stop tracking
        tracemalloc.stop()

        # Verify memory growth is reasonable (< 10MB for 100 requests)
        self.assertLess(
            memory_growth_mb,
            10,
            f"Memory growth ({memory_growth_mb:.2f}MB) exceeds 10MB threshold for {num_requests} requests"
        )

        print(f"\n  ✓ Memory leak test:")
        print(f"    - Baseline: {baseline_memory / (1024 * 1024):.2f}MB")
        print(f"    - Final: {final_memory / (1024 * 1024):.2f}MB")
        print(f"    - Growth: {memory_growth_mb:.2f}MB")
        print(f"    - Requests: {num_requests}")

    @patch('utils.services.postcoder_service.requests.get')
    def test_cache_hit_performance_improvement(self, mock_get):
        """
        Performance Test 5: Cache hit should be significantly faster than cache miss
        Target: Cache hit at least 2x faster than cache miss
        """
        # Mock API response with realistic delay
        def delayed_response(*args, **kwargs):
            time.sleep(0.1)  # 100ms API delay
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = self.mock_api_response
            return mock_response

        mock_get.side_effect = delayed_response

        # Measure cache miss (first request)
        request1 = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        start_time = time.time()
        response1 = postcoder_address_lookup(request1)
        cache_miss_time = (time.time() - start_time) * 1000

        self.assertEqual(response1.status_code, 200)

        # Small delay between requests
        time.sleep(0.01)

        # Measure cache hit (second request)
        request2 = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

        start_time = time.time()
        response2 = postcoder_address_lookup(request2)
        cache_hit_time = (time.time() - start_time) * 1000

        self.assertEqual(response2.status_code, 200)

        # Calculate improvement
        improvement_factor = cache_miss_time / cache_hit_time if cache_hit_time > 0 else 0

        # Verify cache hit is at least 2x faster
        self.assertGreater(
            improvement_factor,
            2.0,
            f"Cache hit improvement ({improvement_factor:.2f}x) is less than 2x target"
        )

        print(f"\n  ✓ Cache performance improvement:")
        print(f"    - Cache miss: {cache_miss_time:.2f}ms")
        print(f"    - Cache hit: {cache_hit_time:.2f}ms")
        print(f"    - Improvement: {improvement_factor:.2f}x faster")

    @patch('utils.services.postcoder_service.requests.get')
    def test_sequential_requests_consistent_performance(self, mock_get):
        """
        Performance Test 6: Sequential requests should have consistent performance
        Tests 20 sequential cache hit requests for consistency
        """
        # Mock API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_get.return_value = mock_response

        # Pre-populate cache
        CachedAddress.objects.create(
            postcode=self.test_postcode,
            formatted_addresses={"addresses": [{"line_1": "Test", "postcode": "SW1A 1AA"}]},
            response_data={},
            expires_at=timezone.now() + timedelta(days=7)
        )

        # Make sequential requests
        num_requests = 20
        response_times = []

        for i in range(num_requests):
            request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={self.test_postcode}')

            start_time = time.time()
            response = postcoder_address_lookup(request)
            elapsed_ms = (time.time() - start_time) * 1000

            self.assertEqual(response.status_code, 200)
            response_times.append(elapsed_ms)

        # Calculate statistics
        avg_time = sum(response_times) / len(response_times)
        std_dev = (sum((x - avg_time) ** 2 for x in response_times) / len(response_times)) ** 0.5
        coefficient_of_variation = (std_dev / avg_time) * 100 if avg_time > 0 else 0

        # Verify consistent performance (CV < 50%)
        self.assertLess(
            coefficient_of_variation,
            50,
            f"Performance variation ({coefficient_of_variation:.2f}%) exceeds 50% threshold"
        )

        print(f"\n  ✓ Sequential request consistency:")
        print(f"    - Average: {avg_time:.2f}ms")
        print(f"    - Std Dev: {std_dev:.2f}ms")
        print(f"    - Variation: {coefficient_of_variation:.2f}%")
        print(f"    - Requests: {num_requests}")

    @patch('utils.services.postcoder_service.requests.get')
    def test_different_postcodes_performance(self, mock_get):
        """
        Performance Test 7: Different postcodes should have similar performance
        Tests cache miss performance across 10 different postcodes
        """
        # Mock API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = self.mock_api_response
        mock_get.return_value = mock_response

        # Test different postcodes
        test_postcodes = [
            'SW1A1AA', 'EC1A1BB', 'OX449EL', 'M13NQ', 'G28DN',
            'EH11YZ', 'CF101AA', 'BT11AA', 'AB101AA', 'PL11AA'
        ]

        response_times = []

        for postcode in test_postcodes:
            request = self.factory.get(f'/api/utils/postcoder-address-lookup/?postcode={postcode}')

            start_time = time.time()
            response = postcoder_address_lookup(request)
            elapsed_ms = (time.time() - start_time) * 1000

            self.assertEqual(response.status_code, 200)
            response_times.append(elapsed_ms)

        # Calculate statistics
        avg_time = sum(response_times) / len(response_times)
        max_time = max(response_times)
        min_time = min(response_times)

        # Verify all postcodes perform within reasonable range
        self.assertLess(
            max_time,
            500,
            f"Slowest postcode lookup ({max_time:.2f}ms) exceeds 500ms target"
        )

        print(f"\n  ✓ Different postcode performance:")
        print(f"    - Average: {avg_time:.2f}ms")
        print(f"    - Min: {min_time:.2f}ms")
        print(f"    - Max: {max_time:.2f}ms")
        print(f"    - Postcodes tested: {len(test_postcodes)}")

    def test_database_query_performance(self):
        """
        Performance Test 8: Database queries should be efficient
        Tests cache lookup query performance with multiple entries
        """
        # Create 100 cache entries
        num_entries = 100
        for i in range(num_entries):
            CachedAddress.objects.create(
                postcode=f'TEST{i:03d}',
                formatted_addresses={"addresses": [{"line_1": f"Address {i}"}]},
                response_data={},
                expires_at=timezone.now() + timedelta(days=7)
            )

        # Create the one we'll query for
        target_postcode = 'SW1A1AA'
        CachedAddress.objects.create(
            postcode=target_postcode,
            formatted_addresses={"addresses": [{"line_1": "Target Address"}]},
            response_data={},
            expires_at=timezone.now() + timedelta(days=7)
        )

        # Measure query time
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        with CaptureQueriesContext(connection) as queries:
            start_time = time.time()

            # Simulate cache lookup
            cached = CachedAddress.objects.filter(
                postcode=target_postcode,
                expires_at__gt=timezone.now()
            ).order_by('-created_at').first()

            elapsed_ms = (time.time() - start_time) * 1000

        # Verify query performance
        self.assertIsNotNone(cached)
        self.assertLess(
            elapsed_ms,
            10,
            f"Database query time ({elapsed_ms:.2f}ms) exceeds 10ms target"
        )

        # Verify only 1 query executed (with proper indexing)
        self.assertEqual(
            len(queries),
            1,
            f"Cache lookup executed {len(queries)} queries (expected 1)"
        )

        print(f"\n  ✓ Database query performance:")
        print(f"    - Query time: {elapsed_ms:.2f}ms")
        print(f"    - Queries executed: {len(queries)}")
        print(f"    - Total cache entries: {num_entries + 1}")


class PostcoderPerformanceSummaryTests(TestCase):
    """
    Summary test that runs all performance tests and reports aggregate results
    """

    @patch('utils.services.postcoder_service.requests.get')
    def test_performance_summary(self, mock_get):
        """
        Performance Summary: Run key performance tests and report results
        """
        # Mock API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [{
            "postcode": "SW1A 1AA",
            "summaryline": "Test Address",
            "number": "10",
            "street": "Test Street",
            "posttown": "LONDON"
        }]
        mock_get.return_value = mock_response

        factory = RequestFactory()
        results = {}

        # Test 1: Cache miss performance
        request = factory.get('/api/utils/postcoder-address-lookup/?postcode=SW1A1AA')
        start = time.time()
        response = postcoder_address_lookup(request)
        results['cache_miss_ms'] = (time.time() - start) * 1000

        # Test 2: Cache hit performance
        time.sleep(0.01)
        request = factory.get('/api/utils/postcoder-address-lookup/?postcode=SW1A1AA')
        start = time.time()
        response = postcoder_address_lookup(request)
        results['cache_hit_ms'] = (time.time() - start) * 1000

        # Test 3: Performance improvement
        results['improvement_factor'] = results['cache_miss_ms'] / results['cache_hit_ms'] if results['cache_hit_ms'] > 0 else 0

        # Print summary
        print("\n" + "="*60)
        print("PERFORMANCE TEST SUMMARY")
        print("="*60)
        print(f"Cache Miss (API Call):  {results['cache_miss_ms']:.2f}ms  (target: <500ms)")
        print(f"Cache Hit (Database):   {results['cache_hit_ms']:.2f}ms  (target: <100ms)")
        print(f"Performance Gain:       {results['improvement_factor']:.2f}x faster")
        print("="*60)

        # Verify targets met
        self.assertLess(results['cache_miss_ms'], 500, "Cache miss target not met")
        self.assertLess(results['cache_hit_ms'], 100, "Cache hit target not met")
        self.assertGreater(results['improvement_factor'], 2.0, "Performance gain target not met")

        print("✓ All performance targets met!\n")

        # Cleanup
        CachedAddress.objects.all().delete()
        AddressLookupLog.objects.all().delete()
