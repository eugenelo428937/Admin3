"""
Unit Tests for AddressLookupLogger

Tests the address lookup logging service including:
- Successful and failed lookup logging
- Cache hit/miss tracking
- Analytics statistics calculation
- API provider comparison
- Error handling (non-blocking)
"""

import unittest
from unittest.mock import patch, Mock
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta

from utils.services.address_lookup_logger import AddressLookupLogger
from address_analytics.models import AddressLookupLog


class AddressLookupLoggerTestCase(TestCase):
    """Test cases for AddressLookupLogger class"""

    def setUp(self):
        """Set up test fixtures"""
        self.logger = AddressLookupLogger()
        self.test_postcode = "SW1A1AA"

    def tearDown(self):
        """Clean up test data"""
        AddressLookupLog.objects.all().delete()

    # ==================== log_lookup Tests ====================

    def test_log_lookup_success(self):
        """Test successful lookup logging creates entry"""
        result = self.logger.log_lookup(
            postcode=self.test_postcode,
            cache_hit=False,
            response_time_ms=250,
            result_count=5,
            success=True,
            api_provider='postcoder',
            search_query="SW1A 1AA"
        )

        # Verify result
        self.assertTrue(result)

        # Verify entry created
        log_entry = AddressLookupLog.objects.get(postcode=self.test_postcode)
        self.assertEqual(log_entry.postcode, self.test_postcode)
        self.assertEqual(log_entry.cache_hit, False)
        self.assertEqual(log_entry.response_time_ms, 250)
        self.assertEqual(log_entry.result_count, 5)
        self.assertEqual(log_entry.success, True)
        self.assertEqual(log_entry.api_provider, 'postcoder')
        self.assertEqual(log_entry.search_query, "SW1A 1AA")
        self.assertIsNone(log_entry.error_message)

    def test_log_lookup_with_error_message(self):
        """Test failed lookup with error message"""
        error_msg = "API timeout"

        result = self.logger.log_lookup(
            postcode=self.test_postcode,
            cache_hit=False,
            response_time_ms=5000,
            result_count=0,
            success=False,
            error_message=error_msg
        )

        # Verify result
        self.assertTrue(result)

        # Verify error message stored
        log_entry = AddressLookupLog.objects.get(postcode=self.test_postcode)
        self.assertEqual(log_entry.error_message, error_msg)
        self.assertEqual(log_entry.success, False)

    def test_log_lookup_cache_hit(self):
        """Test cache hit logging"""
        result = self.logger.log_lookup(
            postcode=self.test_postcode,
            cache_hit=True,  # Cache hit
            response_time_ms=50,
            result_count=3,
            success=True
        )

        # Verify cache_hit flag
        log_entry = AddressLookupLog.objects.get(postcode=self.test_postcode)
        self.assertTrue(log_entry.cache_hit)

    def test_log_lookup_cache_miss(self):
        """Test cache miss logging"""
        result = self.logger.log_lookup(
            postcode=self.test_postcode,
            cache_hit=False,  # Cache miss
            response_time_ms=300,
            result_count=3,
            success=True
        )

        # Verify cache_hit flag
        log_entry = AddressLookupLog.objects.get(postcode=self.test_postcode)
        self.assertFalse(log_entry.cache_hit)

    def test_log_lookup_default_api_provider(self):
        """Test default api_provider is 'postcoder'"""
        self.logger.log_lookup(
            postcode=self.test_postcode,
            cache_hit=False,
            response_time_ms=250,
            result_count=5,
            success=True
            # api_provider not provided
        )

        log_entry = AddressLookupLog.objects.get(postcode=self.test_postcode)
        self.assertEqual(log_entry.api_provider, 'postcoder')

    def test_log_lookup_custom_api_provider(self):
        """Test custom api_provider (e.g., getaddress)"""
        self.logger.log_lookup(
            postcode=self.test_postcode,
            cache_hit=False,
            response_time_ms=250,
            result_count=5,
            success=True,
            api_provider='getaddress'
        )

        log_entry = AddressLookupLog.objects.get(postcode=self.test_postcode)
        self.assertEqual(log_entry.api_provider, 'getaddress')

    def test_log_lookup_default_search_query(self):
        """Test default search_query is empty string"""
        self.logger.log_lookup(
            postcode=self.test_postcode,
            cache_hit=False,
            response_time_ms=250,
            result_count=5,
            success=True
            # search_query not provided
        )

        log_entry = AddressLookupLog.objects.get(postcode=self.test_postcode)
        self.assertEqual(log_entry.search_query, "")

    def test_log_lookup_handles_errors_gracefully(self):
        """Test error handling returns False without raising"""
        # Mock AddressLookupLog.objects.create to raise exception
        with patch.object(AddressLookupLog.objects, 'create') as mock_create:
            mock_create.side_effect = Exception("Database error")

            # Should return False, not raise
            result = self.logger.log_lookup(
                postcode=self.test_postcode,
                cache_hit=False,
                response_time_ms=250,
                result_count=5,
                success=True
            )
            self.assertFalse(result)

    @patch('utils.services.address_lookup_logger.logger')
    def test_log_lookup_logs_to_application_logger(self, mock_logger):
        """Test application logger receives info message"""
        self.logger.log_lookup(
            postcode=self.test_postcode,
            cache_hit=False,
            response_time_ms=250,
            result_count=5,
            success=True,
            api_provider='postcoder'
        )

        # Verify logger.info was called
        mock_logger.info.assert_called_once()
        call_args = mock_logger.info.call_args[0][0]
        self.assertIn("SUCCESS", call_args)
        self.assertIn("POSTCODER", call_args)
        self.assertIn(self.test_postcode, call_args)
        self.assertIn("5 addresses", call_args)
        self.assertIn("250ms", call_args)

    # ==================== log_successful_lookup Tests ====================

    def test_log_successful_lookup_creates_entry(self):
        """Test log_successful_lookup creates success entry"""
        result = self.logger.log_successful_lookup(
            postcode=self.test_postcode,
            cache_hit=True,
            response_time_ms=100,
            result_count=3,
            api_provider='postcoder',
            search_query="SW1A 1AA"
        )

        # Verify result
        self.assertTrue(result)

        # Verify entry
        log_entry = AddressLookupLog.objects.get(postcode=self.test_postcode)
        self.assertTrue(log_entry.success)
        self.assertTrue(log_entry.cache_hit)
        self.assertEqual(log_entry.result_count, 3)
        self.assertIsNone(log_entry.error_message)

    def test_log_successful_lookup_sets_success_true(self):
        """Test success flag always set to True"""
        self.logger.log_successful_lookup(
            postcode=self.test_postcode,
            cache_hit=False,
            response_time_ms=250,
            result_count=5
        )

        log_entry = AddressLookupLog.objects.get(postcode=self.test_postcode)
        self.assertTrue(log_entry.success)

    def test_log_successful_lookup_error_message_none(self):
        """Test error_message is None for successful lookups"""
        self.logger.log_successful_lookup(
            postcode=self.test_postcode,
            cache_hit=False,
            response_time_ms=250,
            result_count=5
        )

        log_entry = AddressLookupLog.objects.get(postcode=self.test_postcode)
        self.assertIsNone(log_entry.error_message)

    # ==================== log_failed_lookup Tests ====================

    def test_log_failed_lookup_creates_entry(self):
        """Test log_failed_lookup creates failure entry"""
        error_msg = "Postcoder API timeout"

        result = self.logger.log_failed_lookup(
            postcode=self.test_postcode,
            response_time_ms=5000,
            error_message=error_msg,
            api_provider='postcoder',
            search_query="SW1A 1AA"
        )

        # Verify result
        self.assertTrue(result)

        # Verify entry
        log_entry = AddressLookupLog.objects.get(postcode=self.test_postcode)
        self.assertFalse(log_entry.success)
        self.assertFalse(log_entry.cache_hit)
        self.assertEqual(log_entry.result_count, 0)
        self.assertEqual(log_entry.error_message, error_msg)

    def test_log_failed_lookup_sets_success_false(self):
        """Test success flag always set to False"""
        self.logger.log_failed_lookup(
            postcode=self.test_postcode,
            response_time_ms=5000,
            error_message="Error"
        )

        log_entry = AddressLookupLog.objects.get(postcode=self.test_postcode)
        self.assertFalse(log_entry.success)

    def test_log_failed_lookup_sets_cache_hit_false(self):
        """Test cache_hit always False for failed lookups"""
        self.logger.log_failed_lookup(
            postcode=self.test_postcode,
            response_time_ms=5000,
            error_message="Error"
        )

        log_entry = AddressLookupLog.objects.get(postcode=self.test_postcode)
        self.assertFalse(log_entry.cache_hit)

    def test_log_failed_lookup_sets_result_count_zero(self):
        """Test result_count always 0 for failed lookups"""
        self.logger.log_failed_lookup(
            postcode=self.test_postcode,
            response_time_ms=5000,
            error_message="Error"
        )

        log_entry = AddressLookupLog.objects.get(postcode=self.test_postcode)
        self.assertEqual(log_entry.result_count, 0)

    # ==================== get_lookup_stats Tests ====================

    def test_get_lookup_stats_empty_database(self):
        """Test stats with no log entries"""
        stats = self.logger.get_lookup_stats()

        # Verify all zeros
        self.assertEqual(stats['total_lookups'], 0)
        self.assertEqual(stats['success_count'], 0)
        self.assertEqual(stats['failure_count'], 0)
        self.assertEqual(stats['success_rate'], 0.0)
        self.assertEqual(stats['cache_hits'], 0)
        self.assertEqual(stats['cache_misses'], 0)
        self.assertEqual(stats['cache_hit_rate'], 0.0)
        self.assertEqual(stats['avg_response_time_ms'], 0)

    def test_get_lookup_stats_all_successful(self):
        """Test stats with all successful lookups"""
        # Create 5 successful lookups
        for i in range(5):
            AddressLookupLog.objects.create(
                postcode=f"PC{i}",
                cache_hit=(i % 2 == 0),  # Alternating cache hit/miss
                response_time_ms=100 + (i * 10),
                result_count=3,
                success=True,
                api_provider='postcoder'
            )

        stats = self.logger.get_lookup_stats()

        # Verify counts
        self.assertEqual(stats['total_lookups'], 5)
        self.assertEqual(stats['success_count'], 5)
        self.assertEqual(stats['failure_count'], 0)
        self.assertEqual(stats['success_rate'], 100.0)

    def test_get_lookup_stats_mixed_success_failure(self):
        """Test stats with mixed success/failure"""
        # 3 successful, 2 failed
        for i in range(3):
            AddressLookupLog.objects.create(
                postcode=f"SUC{i}",
                cache_hit=False,
                response_time_ms=250,
                result_count=5,
                success=True,
                api_provider='postcoder'
            )

        for i in range(2):
            AddressLookupLog.objects.create(
                postcode=f"FL{i}",
                cache_hit=False,
                response_time_ms=5000,
                result_count=0,
                success=False,
                api_provider='postcoder'
            )

        stats = self.logger.get_lookup_stats()

        # Verify calculations
        self.assertEqual(stats['total_lookups'], 5)
        self.assertEqual(stats['success_count'], 3)
        self.assertEqual(stats['failure_count'], 2)
        self.assertEqual(stats['success_rate'], 60.0)

    def test_get_lookup_stats_cache_hit_rate(self):
        """Test cache hit rate calculation"""
        # 3 cache hits, 2 cache misses
        for i in range(3):
            AddressLookupLog.objects.create(
                postcode=f"CH{i}",
                cache_hit=True,
                response_time_ms=50,
                result_count=3,
                success=True
            )

        for i in range(2):
            AddressLookupLog.objects.create(
                postcode=f"NC{i}",
                cache_hit=False,
                response_time_ms=300,
                result_count=3,
                success=True
            )

        stats = self.logger.get_lookup_stats()

        # Verify cache hit rate
        self.assertEqual(stats['total_lookups'], 5)
        self.assertEqual(stats['cache_hits'], 3)
        self.assertEqual(stats['cache_misses'], 2)
        self.assertEqual(stats['cache_hit_rate'], 60.0)

    def test_get_lookup_stats_average_response_times(self):
        """Test average response time calculations"""
        # 2 cache hits (50ms, 100ms) -> avg 75ms
        for time_ms in [50, 100]:
            AddressLookupLog.objects.create(
                postcode=f"CH{time_ms}",
                cache_hit=True,
                response_time_ms=time_ms,
                result_count=3,
                success=True
            )

        # 2 cache misses (300ms, 400ms) -> avg 350ms
        for time_ms in [300, 400]:
            AddressLookupLog.objects.create(
                postcode=f"NC{time_ms}",
                cache_hit=False,
                response_time_ms=time_ms,
                result_count=3,
                success=True
            )

        stats = self.logger.get_lookup_stats()

        # Verify averages
        self.assertEqual(stats['avg_response_time_ms'], 212.5)  # (50+100+300+400)/4
        self.assertEqual(stats['avg_cache_hit_time_ms'], 75.0)  # (50+100)/2
        self.assertEqual(stats['avg_cache_miss_time_ms'], 350.0)  # (300+400)/2

    def test_get_lookup_stats_filters_by_api_provider(self):
        """Test filtering by API provider"""
        # Create postcoder lookups
        for i in range(3):
            AddressLookupLog.objects.create(
                postcode=f"PC{i}",
                cache_hit=False,
                response_time_ms=250,
                result_count=5,
                success=True,
                api_provider='postcoder'
            )

        # Create getaddress lookups
        for i in range(2):
            AddressLookupLog.objects.create(
                postcode=f"GA{i}",
                cache_hit=False,
                response_time_ms=350,
                result_count=4,
                success=True,
                api_provider='getaddress'
            )

        # Get postcoder stats
        postcoder_stats = self.logger.get_lookup_stats(api_provider='postcoder')
        self.assertEqual(postcoder_stats['total_lookups'], 3)

        # Get getaddress stats
        getaddress_stats = self.logger.get_lookup_stats(api_provider='getaddress')
        self.assertEqual(getaddress_stats['total_lookups'], 2)

    def test_get_lookup_stats_filters_by_time_range(self):
        """Test filtering by time range (hours parameter)"""
        # Create old lookup (2 days ago)
        old_time = timezone.now() - timedelta(days=2)
        old_log = AddressLookupLog.objects.create(
            postcode="OLD",
            cache_hit=False,
            response_time_ms=250,
            result_count=5,
            success=True
        )
        # Manually set old timestamp
        AddressLookupLog.objects.filter(pk=old_log.pk).update(lookup_timestamp=old_time)

        # Create recent lookup (1 hour ago)
        recent_time = timezone.now() - timedelta(hours=1)
        recent_log = AddressLookupLog.objects.create(
            postcode="RECENT",
            cache_hit=False,
            response_time_ms=250,
            result_count=5,
            success=True
        )

        # Get stats for last 24 hours (should include only recent)
        stats_24h = self.logger.get_lookup_stats(hours=24)
        self.assertEqual(stats_24h['total_lookups'], 1)

        # Get stats for last 72 hours (should include both)
        stats_72h = self.logger.get_lookup_stats(hours=72)
        self.assertEqual(stats_72h['total_lookups'], 2)

    def test_get_lookup_stats_handles_errors_gracefully(self):
        """Test error handling returns default dict without raising"""
        with patch.object(AddressLookupLog.objects, 'filter') as mock_filter:
            mock_filter.side_effect = Exception("Database error")

            stats = self.logger.get_lookup_stats()

            # Should return default values
            self.assertEqual(stats['total_lookups'], 0)
            self.assertEqual(stats['success_count'], 0)
            self.assertEqual(stats['failure_count'], 0)

    # ==================== Integration & Edge Cases ====================

    def test_full_logging_lifecycle(self):
        """Test complete logging lifecycle"""
        # Log cache miss (API call)
        self.logger.log_successful_lookup(
            postcode=self.test_postcode,
            cache_hit=False,
            response_time_ms=300,
            result_count=5
        )

        # Log cache hit
        self.logger.log_successful_lookup(
            postcode=self.test_postcode,
            cache_hit=True,
            response_time_ms=50,
            result_count=5
        )

        # Log failure
        self.logger.log_failed_lookup(
            postcode="INVALID",
            response_time_ms=5000,
            error_message="Invalid postcode"
        )

        # Verify all logged
        self.assertEqual(AddressLookupLog.objects.count(), 3)

        # Get stats
        stats = self.logger.get_lookup_stats()
        self.assertEqual(stats['total_lookups'], 3)
        self.assertEqual(stats['success_count'], 2)
        self.assertEqual(stats['failure_count'], 1)
        self.assertEqual(stats['cache_hits'], 1)

    def test_multiple_api_providers_independent(self):
        """Test logging for multiple API providers works independently"""
        # Log postcoder lookup
        self.logger.log_successful_lookup(
            postcode="POST1",
            cache_hit=False,
            response_time_ms=250,
            result_count=5,
            api_provider='postcoder'
        )

        # Log getaddress lookup
        self.logger.log_successful_lookup(
            postcode="GET1",
            cache_hit=False,
            response_time_ms=350,
            result_count=4,
            api_provider='getaddress'
        )

        # Verify both logged
        self.assertEqual(AddressLookupLog.objects.count(), 2)
        self.assertEqual(
            AddressLookupLog.objects.filter(api_provider='postcoder').count(),
            1
        )
        self.assertEqual(
            AddressLookupLog.objects.filter(api_provider='getaddress').count(),
            1
        )


if __name__ == '__main__':
    unittest.main()
