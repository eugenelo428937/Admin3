"""
Unit Tests for AddressCacheService

Tests the address caching service including:
- Cache hit/miss logic
- Cache expiration (7-day TTL)
- Cache invalidation
- Hit count tracking
- Cache statistics
- Error handling
"""

import unittest
from unittest.mock import patch, Mock
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta

from utils.services.address_cache_service import AddressCacheService
from address_cache.models import CachedAddress


class AddressCacheServiceTestCase(TestCase):
    """Test cases for AddressCacheService class"""

    def setUp(self):
        """Set up test fixtures"""
        self.service = AddressCacheService()
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
        self.test_response_data = [
            {
                "postcode": "SW1A1AA",
                "number": "10",
                "street": "Downing Street",
                "posttown": "LONDON",
                "county": "Greater London"
            }
        ]

    def tearDown(self):
        """Clean up test data"""
        CachedAddress.objects.all().delete()

    # ==================== get_cached_address Tests ====================

    def test_get_cached_address_miss(self):
        """Test cache miss returns None"""
        result = self.service.get_cached_address(self.test_postcode)
        self.assertIsNone(result)

    def test_get_cached_address_hit(self):
        """Test cache hit returns cached data"""
        # Create cache entry
        CachedAddress.objects.create(
            postcode=self.test_postcode,
            formatted_addresses=self.test_addresses,
            response_data={},
            expires_at=timezone.now() + timedelta(days=7)
        )

        # Retrieve from cache
        result = self.service.get_cached_address(self.test_postcode)

        # Verify
        self.assertIsNotNone(result)
        self.assertEqual(result, self.test_addresses)

    def test_get_cached_address_expired_treated_as_miss(self):
        """Test expired cache entry treated as miss"""
        # Create expired cache entry
        CachedAddress.objects.create(
            postcode=self.test_postcode,
            formatted_addresses=self.test_addresses,
            response_data={},
            expires_at=timezone.now() - timedelta(days=1)  # Expired yesterday
        )

        # Attempt to retrieve
        result = self.service.get_cached_address(self.test_postcode)

        # Should be None (cache miss)
        self.assertIsNone(result)

    def test_get_cached_address_increments_hit_count(self):
        """Test hit_count increments on cache hit"""
        # Create cache entry
        cached = CachedAddress.objects.create(
            postcode=self.test_postcode,
            formatted_addresses=self.test_addresses,
            response_data={},
            expires_at=timezone.now() + timedelta(days=7),
            hit_count=0
        )
        initial_hit_count = cached.hit_count

        # Retrieve from cache
        self.service.get_cached_address(self.test_postcode)

        # Verify hit count incremented
        cached.refresh_from_db()
        self.assertEqual(cached.hit_count, initial_hit_count + 1)

    def test_get_cached_address_multiple_hits_increment(self):
        """Test multiple cache hits increment hit_count correctly"""
        # Create cache entry
        CachedAddress.objects.create(
            postcode=self.test_postcode,
            formatted_addresses=self.test_addresses,
            response_data={},
            expires_at=timezone.now() + timedelta(days=7),
            hit_count=0
        )

        # Hit cache 3 times
        for _ in range(3):
            self.service.get_cached_address(self.test_postcode)

        # Verify hit count = 3
        cached = CachedAddress.objects.get(postcode=self.test_postcode)
        self.assertEqual(cached.hit_count, 3)

    def test_get_cached_address_returns_most_recent(self):
        """Test returns most recent cache entry when multiple exist"""
        import time

        # Create old entry
        old_entry = CachedAddress.objects.create(
            postcode=self.test_postcode,
            formatted_addresses={"addresses": [{"line_1": "Old Address"}]},
            response_data={},
            expires_at=timezone.now() + timedelta(days=7)
        )

        # Small delay to ensure different timestamps
        time.sleep(0.01)

        # Create newer entry
        newer_addresses = {"addresses": [{"line_1": "Newer Address"}]}
        newer_entry = CachedAddress.objects.create(
            postcode=self.test_postcode,
            formatted_addresses=newer_addresses,
            response_data={},
            expires_at=timezone.now() + timedelta(days=7)
        )

        # Retrieve should return newer entry
        result = self.service.get_cached_address(self.test_postcode)
        self.assertEqual(result["addresses"][0]["line_1"], "Newer Address")

    def test_get_cached_address_handles_errors_gracefully(self):
        """Test error handling returns None without raising"""
        # Mock CachedAddress.objects.filter to raise exception
        with patch.object(CachedAddress.objects, 'filter') as mock_filter:
            mock_filter.side_effect = Exception("Database error")

            # Should return None, not raise
            result = self.service.get_cached_address(self.test_postcode)
            self.assertIsNone(result)

    # ==================== cache_address Tests ====================

    def test_cache_address_success(self):
        """Test successful address caching returns True"""
        result = self.service.cache_address(
            postcode=self.test_postcode,
            addresses=self.test_addresses,
            response_data=self.test_response_data,
            search_query="SW1A 1AA"
        )

        # Verify success
        self.assertTrue(result)

        # Verify entry created
        cached = CachedAddress.objects.get(postcode=self.test_postcode)
        self.assertEqual(cached.formatted_addresses, self.test_addresses)
        self.assertEqual(cached.response_data, self.test_response_data)
        self.assertEqual(cached.search_query, "SW1A 1AA")

    def test_cache_address_sets_7_day_expiration(self):
        """Test cache entry expires in 7 days by default"""
        before_cache = timezone.now()

        self.service.cache_address(
            postcode=self.test_postcode,
            addresses=self.test_addresses
        )

        after_cache = timezone.now()

        # Verify expiration is ~7 days from now
        cached = CachedAddress.objects.get(postcode=self.test_postcode)
        expected_expiration = before_cache + timedelta(days=7)

        # Allow 1 second tolerance for test execution time
        time_diff = abs((cached.expires_at - expected_expiration).total_seconds())
        self.assertLess(time_diff, 1)

    def test_cache_address_custom_expiration(self):
        """Test custom expiration days work correctly"""
        before_cache = timezone.now()

        self.service.cache_address(
            postcode=self.test_postcode,
            addresses=self.test_addresses,
            expires_in_days=14  # Custom 14 days
        )

        after_cache = timezone.now()

        # Verify expiration is ~14 days from now
        cached = CachedAddress.objects.get(postcode=self.test_postcode)
        expected_expiration = before_cache + timedelta(days=14)

        time_diff = abs((cached.expires_at - expected_expiration).total_seconds())
        self.assertLess(time_diff, 1)

    def test_cache_address_initializes_hit_count_zero(self):
        """Test new cache entry has hit_count = 0"""
        self.service.cache_address(
            postcode=self.test_postcode,
            addresses=self.test_addresses
        )

        cached = CachedAddress.objects.get(postcode=self.test_postcode)
        self.assertEqual(cached.hit_count, 0)

    def test_cache_address_optional_response_data_default(self):
        """Test response_data defaults to empty dict if not provided"""
        self.service.cache_address(
            postcode=self.test_postcode,
            addresses=self.test_addresses
            # response_data not provided
        )

        cached = CachedAddress.objects.get(postcode=self.test_postcode)
        self.assertEqual(cached.response_data, {})

    def test_cache_address_optional_search_query_default(self):
        """Test search_query defaults to empty string if not provided"""
        self.service.cache_address(
            postcode=self.test_postcode,
            addresses=self.test_addresses
            # search_query not provided
        )

        cached = CachedAddress.objects.get(postcode=self.test_postcode)
        self.assertEqual(cached.search_query, "")

    def test_cache_address_handles_errors_gracefully(self):
        """Test error handling returns False without raising"""
        # Mock CachedAddress.objects.create to raise exception
        with patch.object(CachedAddress.objects, 'create') as mock_create:
            mock_create.side_effect = Exception("Database error")

            # Should return False, not raise
            result = self.service.cache_address(
                postcode=self.test_postcode,
                addresses=self.test_addresses
            )
            self.assertFalse(result)

    # ==================== is_cache_valid Tests ====================

    def test_is_cache_valid_returns_true_for_valid_cache(self):
        """Test returns True when valid cache exists"""
        # Create valid cache entry
        CachedAddress.objects.create(
            postcode=self.test_postcode,
            formatted_addresses=self.test_addresses,
            response_data={},
            expires_at=timezone.now() + timedelta(days=7)
        )

        result = self.service.is_cache_valid(self.test_postcode)
        self.assertTrue(result)

    def test_is_cache_valid_returns_false_for_missing_cache(self):
        """Test returns False when no cache exists"""
        result = self.service.is_cache_valid(self.test_postcode)
        self.assertFalse(result)

    def test_is_cache_valid_returns_false_for_expired_cache(self):
        """Test returns False when cache is expired"""
        # Create expired cache entry
        CachedAddress.objects.create(
            postcode=self.test_postcode,
            formatted_addresses=self.test_addresses,
            response_data={},
            expires_at=timezone.now() - timedelta(days=1)  # Expired
        )

        result = self.service.is_cache_valid(self.test_postcode)
        self.assertFalse(result)

    def test_is_cache_valid_handles_errors_gracefully(self):
        """Test error handling returns False without raising"""
        with patch.object(CachedAddress.objects, 'filter') as mock_filter:
            mock_filter.side_effect = Exception("Database error")

            result = self.service.is_cache_valid(self.test_postcode)
            self.assertFalse(result)

    # ==================== invalidate_cache Tests ====================

    def test_invalidate_cache_deletes_entries(self):
        """Test invalidate_cache deletes cache entries"""
        # Create cache entry
        CachedAddress.objects.create(
            postcode=self.test_postcode,
            formatted_addresses=self.test_addresses,
            response_data={},
            expires_at=timezone.now() + timedelta(days=7)
        )

        # Invalidate
        count = self.service.invalidate_cache(self.test_postcode)

        # Verify deletion
        self.assertEqual(count, 1)
        self.assertEqual(CachedAddress.objects.filter(postcode=self.test_postcode).count(), 0)

    def test_invalidate_cache_deletes_multiple_entries(self):
        """Test invalidates all entries for a postcode"""
        # Create multiple entries for same postcode
        for i in range(3):
            CachedAddress.objects.create(
                postcode=self.test_postcode,
                formatted_addresses=self.test_addresses,
                response_data={},
                expires_at=timezone.now() + timedelta(days=7)
            )

        # Invalidate
        count = self.service.invalidate_cache(self.test_postcode)

        # Verify all deleted
        self.assertEqual(count, 3)
        self.assertEqual(CachedAddress.objects.filter(postcode=self.test_postcode).count(), 0)

    def test_invalidate_cache_returns_zero_for_missing_postcode(self):
        """Test returns 0 when no cache exists for postcode"""
        count = self.service.invalidate_cache("NONEXISTENT")
        self.assertEqual(count, 0)

    def test_invalidate_cache_handles_errors_gracefully(self):
        """Test error handling returns 0 without raising"""
        with patch.object(CachedAddress.objects, 'filter') as mock_filter:
            mock_filter.side_effect = Exception("Database error")

            count = self.service.invalidate_cache(self.test_postcode)
            self.assertEqual(count, 0)

    # ==================== cleanup_expired_cache Tests ====================

    def test_cleanup_expired_cache_deletes_only_expired(self):
        """Test cleanup deletes only expired entries"""
        # Create 2 expired entries
        for i in range(2):
            CachedAddress.objects.create(
                postcode=f"EXPIRED{i}",
                formatted_addresses=self.test_addresses,
                response_data={},
                expires_at=timezone.now() - timedelta(days=1)
            )

        # Create 2 valid entries
        for i in range(2):
            CachedAddress.objects.create(
                postcode=f"VALID{i}",
                formatted_addresses=self.test_addresses,
                response_data={},
                expires_at=timezone.now() + timedelta(days=7)
            )

        # Cleanup
        count = self.service.cleanup_expired_cache()

        # Verify only expired deleted
        self.assertEqual(count, 2)
        self.assertEqual(CachedAddress.objects.count(), 2)

    def test_cleanup_expired_cache_returns_zero_for_no_expired(self):
        """Test returns 0 when no expired entries exist"""
        # Create only valid entries
        CachedAddress.objects.create(
            postcode=self.test_postcode,
            formatted_addresses=self.test_addresses,
            response_data={},
            expires_at=timezone.now() + timedelta(days=7)
        )

        count = self.service.cleanup_expired_cache()
        self.assertEqual(count, 0)

    def test_cleanup_expired_cache_handles_empty_table(self):
        """Test cleanup works with empty cache table"""
        count = self.service.cleanup_expired_cache()
        self.assertEqual(count, 0)

    def test_cleanup_expired_cache_handles_errors_gracefully(self):
        """Test error handling returns 0 without raising"""
        with patch.object(CachedAddress.objects, 'filter') as mock_filter:
            mock_filter.side_effect = Exception("Database error")

            count = self.service.cleanup_expired_cache()
            self.assertEqual(count, 0)

    # ==================== get_cache_stats Tests ====================

    def test_get_cache_stats_returns_correct_counts(self):
        """Test cache stats returns correct entry counts"""
        # Create 3 valid entries
        for i in range(3):
            CachedAddress.objects.create(
                postcode=f"VALID{i}",
                formatted_addresses=self.test_addresses,
                response_data={},
                expires_at=timezone.now() + timedelta(days=7),
                hit_count=5
            )

        # Create 2 expired entries
        for i in range(2):
            CachedAddress.objects.create(
                postcode=f"EXPIRED{i}",
                formatted_addresses=self.test_addresses,
                response_data={},
                expires_at=timezone.now() - timedelta(days=1),
                hit_count=10
            )

        stats = self.service.get_cache_stats()

        # Verify counts
        self.assertEqual(stats['total_entries'], 5)
        self.assertEqual(stats['valid_entries'], 3)
        self.assertEqual(stats['expired_entries'], 2)
        self.assertEqual(stats['total_hits'], 3*5 + 2*10)  # 15 + 20 = 35

    def test_get_cache_stats_empty_cache(self):
        """Test stats work with empty cache"""
        stats = self.service.get_cache_stats()

        self.assertEqual(stats['total_entries'], 0)
        self.assertEqual(stats['valid_entries'], 0)
        self.assertEqual(stats['expired_entries'], 0)
        self.assertEqual(stats['total_hits'], 0)

    def test_get_cache_stats_handles_errors_gracefully(self):
        """Test error handling returns default dict without raising"""
        with patch.object(CachedAddress.objects, 'count') as mock_count:
            mock_count.side_effect = Exception("Database error")

            stats = self.service.get_cache_stats()

            # Should return default values
            self.assertEqual(stats['total_entries'], 0)
            self.assertEqual(stats['valid_entries'], 0)
            self.assertEqual(stats['expired_entries'], 0)
            self.assertEqual(stats['total_hits'], 0)

    # ==================== Integration & Edge Cases ====================

    def test_cache_lifecycle_full_flow(self):
        """Test complete cache lifecycle: cache -> hit -> expire -> miss"""
        # Step 1: Cache miss
        result = self.service.get_cached_address(self.test_postcode)
        self.assertIsNone(result)

        # Step 2: Cache the address
        success = self.service.cache_address(
            postcode=self.test_postcode,
            addresses=self.test_addresses
        )
        self.assertTrue(success)

        # Step 3: Cache hit
        result = self.service.get_cached_address(self.test_postcode)
        self.assertIsNotNone(result)

        # Step 4: Manually expire the cache
        cached = CachedAddress.objects.get(postcode=self.test_postcode)
        cached.expires_at = timezone.now() - timedelta(days=1)
        cached.save()

        # Step 5: Cache miss (expired)
        result = self.service.get_cached_address(self.test_postcode)
        self.assertIsNone(result)

    def test_multiple_postcodes_independent_caching(self):
        """Test caching multiple postcodes works independently"""
        postcodes = ["SW1A1AA", "OX449EL", "M13NQ"]

        # Cache all postcodes
        for postcode in postcodes:
            self.service.cache_address(
                postcode=postcode,
                addresses={"addresses": [{"postcode": postcode}]}
            )

        # Verify all cached independently
        for postcode in postcodes:
            result = self.service.get_cached_address(postcode)
            self.assertIsNotNone(result)
            self.assertEqual(result["addresses"][0]["postcode"], postcode)

    def test_cache_ttl_constant(self):
        """Test CACHE_TTL_DAYS constant is 7"""
        self.assertEqual(AddressCacheService.CACHE_TTL_DAYS, 7)


if __name__ == '__main__':
    unittest.main()
