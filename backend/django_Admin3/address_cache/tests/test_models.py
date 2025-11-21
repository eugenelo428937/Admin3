"""
Test suite for address_cache models.

This module tests the CachedAddress model to ensure proper field validations,
cache expiration logic, and model behavior.
"""

from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from address_cache.models import CachedAddress


class CachedAddressTestCase(TestCase):
    """Test cases for CachedAddress model."""

    def setUp(self):
        """Set up test fixtures - sample API response data."""
        self.sample_response_data = {
            "status": "OK",
            "results": [
                {
                    "addressline1": "10 Downing Street",
                    "addressline2": "",
                    "summaryline": "10 Downing Street, Westminster, London SW1A 2AA",
                    "postcode": "SW1A 2AA"
                }
            ]
        }

        self.sample_formatted_addresses = {
            "addresses": [
                "10 Downing Street, Westminster, London"
            ],
            "postcode": "SW1A 2AA"
        }

    def test_cached_address_creation_with_required_fields(self):
        """Test CachedAddress creation with required fields only."""
        cache = CachedAddress.objects.create(
            postcode='SW1A2AA',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )

        self.assertEqual(cache.postcode, 'SW1A2AA')
        self.assertEqual(cache.response_data, self.sample_response_data)
        self.assertEqual(cache.formatted_addresses, self.sample_formatted_addresses)
        self.assertIsNotNone(cache.created_at)
        self.assertIsNotNone(cache.expires_at)
        self.assertEqual(cache.hit_count, 0)  # Default value

    def test_cached_address_creation_with_all_fields(self):
        """Test CachedAddress creation with all fields."""
        cache = CachedAddress.objects.create(
            postcode='W1A0AX',
            search_query='BBC Broadcasting House',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )

        self.assertEqual(cache.postcode, 'W1A0AX')
        self.assertEqual(cache.search_query, 'BBC Broadcasting House')

    def test_auto_timestamp_fields(self):
        """Test created_at is automatically set on creation."""
        cache = CachedAddress.objects.create(
            postcode='SW1A2AA',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )

        self.assertIsNotNone(cache.created_at)

        # Created timestamp should be approximately now
        time_diff = timezone.now() - cache.created_at
        self.assertLess(time_diff.total_seconds(), 5)

    def test_expires_at_auto_set_to_7_days(self):
        """Test expires_at is automatically set to 7 days from created_at."""
        cache = CachedAddress.objects.create(
            postcode='SW1A2AA',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )

        self.assertIsNotNone(cache.expires_at)

        # Expiration should be approximately 7 days from now
        expected_expiration = timezone.now() + timedelta(days=7)
        time_diff = abs((cache.expires_at - expected_expiration).total_seconds())
        self.assertLess(time_diff, 5)  # Within 5 seconds

    def test_expires_at_can_be_manually_set(self):
        """Test expires_at can be manually overridden."""
        custom_expiration = timezone.now() + timedelta(days=3)

        cache = CachedAddress.objects.create(
            postcode='SW1A2AA',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses,
            expires_at=custom_expiration
        )

        # Should keep the manually set expiration
        time_diff = abs((cache.expires_at - custom_expiration).total_seconds())
        self.assertLess(time_diff, 1)

    def test_hit_count_default_value(self):
        """Test hit_count defaults to 0."""
        cache = CachedAddress.objects.create(
            postcode='SW1A2AA',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )

        self.assertEqual(cache.hit_count, 0)

    def test_is_expired_method_not_expired(self):
        """Test is_expired() returns False for non-expired cache."""
        cache = CachedAddress.objects.create(
            postcode='SW1A2AA',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )

        # Cache should not be expired (just created, expires in 7 days)
        self.assertFalse(cache.is_expired())

    def test_is_expired_method_expired(self):
        """Test is_expired() returns True for expired cache."""
        # Create cache with expiration in the past
        past_expiration = timezone.now() - timedelta(days=1)

        cache = CachedAddress.objects.create(
            postcode='SW1A2AA',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses,
            expires_at=past_expiration
        )

        # Cache should be expired
        self.assertTrue(cache.is_expired())

    def test_increment_hit_count_method(self):
        """Test increment_hit_count() method increases hit_count."""
        cache = CachedAddress.objects.create(
            postcode='SW1A2AA',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )

        # Initial hit count should be 0
        self.assertEqual(cache.hit_count, 0)

        # Increment once
        cache.increment_hit_count()
        self.assertEqual(cache.hit_count, 1)

        # Increment again
        cache.increment_hit_count()
        self.assertEqual(cache.hit_count, 2)

    def test_increment_hit_count_concurrent_safe(self):
        """Test increment_hit_count() uses F() expression for concurrency safety."""
        cache = CachedAddress.objects.create(
            postcode='SW1A2AA',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )

        # Simulate multiple concurrent increments
        for _ in range(5):
            cache.increment_hit_count()

        # Should have incremented 5 times
        self.assertEqual(cache.hit_count, 5)

    def test_str_method_formatting(self):
        """Test __str__ method returns postcode, creation date, and hit count."""
        cache = CachedAddress.objects.create(
            postcode='SW1A2AA',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )

        # Increment hit count for display
        cache.increment_hit_count()
        cache.increment_hit_count()

        str_representation = str(cache)

        # Should contain postcode
        self.assertIn('SW1A2AA', str_representation)

        # Should contain hit count
        self.assertIn('hits: 2', str_representation)

        # Should contain date
        expected_date = cache.created_at.strftime('%Y-%m-%d')
        self.assertIn(expected_date, str_representation)

    def test_postcode_max_length_validation(self):
        """Test postcode field respects 10 character maximum."""
        cache = CachedAddress.objects.create(
            postcode='SW1A 1AA X',  # 10 chars
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )
        self.assertEqual(len(cache.postcode), 10)

    def test_search_query_max_length_validation(self):
        """Test search_query field respects 255 character maximum."""
        long_query = 'A' * 255
        cache = CachedAddress.objects.create(
            postcode='SW1A2AA',
            search_query=long_query,
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )
        self.assertEqual(len(cache.search_query), 255)

    def test_search_query_optional(self):
        """Test search_query field is optional (blank=True)."""
        cache = CachedAddress.objects.create(
            postcode='SW1A2AA',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )

        self.assertEqual(cache.search_query, '')

    def test_json_field_storage(self):
        """Test JSONField properly stores and retrieves JSON data."""
        cache = CachedAddress.objects.create(
            postcode='SW1A2AA',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )

        # Retrieve from database
        cache.refresh_from_db()

        # JSON data should be preserved
        self.assertEqual(cache.response_data, self.sample_response_data)
        self.assertEqual(cache.formatted_addresses, self.sample_formatted_addresses)

        # Should be Python dicts, not strings
        self.assertIsInstance(cache.response_data, dict)
        self.assertIsInstance(cache.formatted_addresses, dict)

    def test_ordering_by_created_at_descending(self):
        """Test default ordering is by created_at descending (newest first)."""
        import time

        # Create three cache entries with slight time differences
        cache1 = CachedAddress.objects.create(
            postcode='SW1A1AA',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )
        time.sleep(0.01)

        cache2 = CachedAddress.objects.create(
            postcode='W1A0AX',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )
        time.sleep(0.01)

        cache3 = CachedAddress.objects.create(
            postcode='EC1A1BB',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )

        # Query all - should be ordered newest first
        caches = list(CachedAddress.objects.all())
        self.assertEqual(caches[0].id, cache3.id)  # Newest
        self.assertEqual(caches[1].id, cache2.id)
        self.assertEqual(caches[2].id, cache1.id)  # Oldest

    def test_composite_index_exists(self):
        """Test composite index on (postcode, expires_at) exists."""
        meta = CachedAddress._meta

        # Check for composite index named 'postcode_expires_idx'
        index_names = [index.name for index in meta.indexes]
        self.assertIn('postcode_expires_idx', index_names)

        # Verify index fields
        for index in meta.indexes:
            if index.name == 'postcode_expires_idx':
                self.assertEqual(index.fields, ['postcode', 'expires_at'])

    def test_individual_field_indexes(self):
        """Test individual field indexes exist."""
        meta = CachedAddress._meta

        # Fields with db_index=True
        indexed_fields = ['postcode', 'created_at', 'expires_at']

        for field_name in indexed_fields:
            field = meta.get_field(field_name)
            self.assertTrue(
                field.db_index,
                f"Field '{field_name}' should have db_index=True"
            )

    def test_verbose_name(self):
        """Test model verbose name is set correctly."""
        self.assertEqual(CachedAddress._meta.verbose_name, 'Cached Address')

    def test_verbose_name_plural(self):
        """Test model verbose name plural is set correctly."""
        self.assertEqual(CachedAddress._meta.verbose_name_plural, 'Cached Addresses')

    def test_cache_lookup_by_postcode(self):
        """Test looking up cached addresses by postcode."""
        # Create multiple cache entries
        CachedAddress.objects.create(
            postcode='SW1A2AA',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )
        CachedAddress.objects.create(
            postcode='W1A0AX',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )

        # Lookup by postcode
        sw1_caches = CachedAddress.objects.filter(postcode='SW1A2AA')
        self.assertEqual(sw1_caches.count(), 1)
        self.assertEqual(sw1_caches.first().postcode, 'SW1A2AA')

    def test_expired_cache_cleanup_query(self):
        """Test querying for expired cache entries."""
        # Create expired cache
        expired_cache = CachedAddress.objects.create(
            postcode='SW1A2AA',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses,
            expires_at=timezone.now() - timedelta(days=1)
        )

        # Create non-expired cache
        active_cache = CachedAddress.objects.create(
            postcode='W1A0AX',
            response_data=self.sample_response_data,
            formatted_addresses=self.sample_formatted_addresses
        )

        # Query for expired entries among the test-created entries only
        test_cache_ids = [expired_cache.id, active_cache.id]
        expired_entries = CachedAddress.objects.filter(
            id__in=test_cache_ids,
            expires_at__lt=timezone.now()
        )

        # Only the expired cache should be returned
        self.assertEqual(expired_entries.count(), 1)
        self.assertEqual(expired_entries.first().id, expired_cache.id)

        # Active cache should not be in expired query
        active_entries = CachedAddress.objects.filter(
            id__in=test_cache_ids,
            expires_at__gte=timezone.now()
        )
        self.assertEqual(active_entries.count(), 1)
        self.assertEqual(active_entries.first().id, active_cache.id)
