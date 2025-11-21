"""
Test suite for address_analytics models.

This module tests the AddressLookupLog model to ensure proper field validations,
index creation, and model behavior.
"""

from django.test import TestCase
from django.db import models
from django.core.exceptions import ValidationError
from address_analytics.models import AddressLookupLog


class AddressLookupLogTestCase(TestCase):
    """Test cases for AddressLookupLog model."""

    def test_model_creation_with_required_fields(self):
        """Test AddressLookupLog creation with all required fields."""
        log = AddressLookupLog.objects.create(
            postcode='SW1A 1AA',
            cache_hit=True,
            response_time_ms=150,
            result_count=5,
            success=True
        )

        self.assertEqual(log.postcode, 'SW1A 1AA')
        self.assertTrue(log.cache_hit)
        self.assertEqual(log.response_time_ms, 150)
        self.assertEqual(log.result_count, 5)
        self.assertTrue(log.success)
        self.assertEqual(log.api_provider, 'postcoder')  # Default value
        self.assertIsNotNone(log.lookup_timestamp)  # Auto-generated

    def test_model_creation_with_all_fields(self):
        """Test AddressLookupLog creation with all fields including optional."""
        log = AddressLookupLog.objects.create(
            postcode='W1A 0AX',
            search_query='10 Downing Street',
            cache_hit=False,
            response_time_ms=250,
            result_count=1,
            api_provider='getaddress',
            success=True,
            error_message=None
        )

        self.assertEqual(log.postcode, 'W1A 0AX')
        self.assertEqual(log.search_query, '10 Downing Street')
        self.assertFalse(log.cache_hit)
        self.assertEqual(log.api_provider, 'getaddress')
        self.assertTrue(log.success)
        self.assertIsNone(log.error_message)

    def test_postcode_max_length_validation(self):
        """Test postcode field respects 10 character maximum."""
        # Create log with exactly 10 characters
        log = AddressLookupLog.objects.create(
            postcode='SW1A 1AA X',  # 10 chars
            cache_hit=True,
            response_time_ms=100,
            result_count=1,
            success=True
        )
        self.assertEqual(len(log.postcode), 10)

        # Attempt to create log with more than 10 characters should truncate
        # Note: Django CharField doesn't raise ValidationError on save,
        # but will truncate on database level
        with self.assertRaises(Exception):
            log_long = AddressLookupLog(
                postcode='SW1A 1AA XX',  # 11 chars - exceeds max_length
                cache_hit=True,
                response_time_ms=100,
                result_count=1,
                success=True
            )
            log_long.full_clean()  # This triggers validation

    def test_search_query_max_length_validation(self):
        """Test search_query field respects 255 character maximum."""
        long_query = 'A' * 255
        log = AddressLookupLog.objects.create(
            postcode='SW1A 1AA',
            search_query=long_query,
            cache_hit=True,
            response_time_ms=100,
            result_count=1,
            success=True
        )
        self.assertEqual(len(log.search_query), 255)

        # Attempt to exceed max_length
        with self.assertRaises(Exception):
            log_long = AddressLookupLog(
                postcode='SW1A 1AA',
                search_query='A' * 256,  # Exceeds max_length
                cache_hit=True,
                response_time_ms=100,
                result_count=1,
                success=True
            )
            log_long.full_clean()

    def test_api_provider_max_length_validation(self):
        """Test api_provider field respects 20 character maximum."""
        log = AddressLookupLog.objects.create(
            postcode='SW1A 1AA',
            api_provider='A' * 20,  # Exactly 20 chars
            cache_hit=True,
            response_time_ms=100,
            result_count=1,
            success=True
        )
        self.assertEqual(len(log.api_provider), 20)

    def test_cache_hit_field_required(self):
        """Test cache_hit boolean field is required (no default)."""
        with self.assertRaises(Exception):
            # Missing cache_hit should raise error
            AddressLookupLog.objects.create(
                postcode='SW1A 1AA',
                response_time_ms=100,
                result_count=1,
                success=True
            )

    def test_success_field_required(self):
        """Test success boolean field is required (no default)."""
        with self.assertRaises(Exception):
            # Missing success should raise error
            AddressLookupLog.objects.create(
                postcode='SW1A 1AA',
                cache_hit=True,
                response_time_ms=100,
                result_count=1
            )

    def test_api_provider_default_value(self):
        """Test api_provider defaults to 'postcoder'."""
        log = AddressLookupLog.objects.create(
            postcode='SW1A 1AA',
            cache_hit=True,
            response_time_ms=100,
            result_count=1,
            success=True
        )
        self.assertEqual(log.api_provider, 'postcoder')

    def test_str_method_formatting_success(self):
        """Test __str__ method formatting for successful lookup."""
        log = AddressLookupLog.objects.create(
            postcode='SW1A 1AA',
            cache_hit=True,
            response_time_ms=150,
            result_count=5,
            api_provider='postcoder',
            success=True
        )

        expected = "✓ SW1A 1AA - postcoder (cached) (150ms)"
        self.assertEqual(str(log), expected)

    def test_str_method_formatting_failed(self):
        """Test __str__ method formatting for failed lookup."""
        log = AddressLookupLog.objects.create(
            postcode='INVALID',
            cache_hit=False,
            response_time_ms=50,
            result_count=0,
            api_provider='postcoder',
            success=False,
            error_message='Invalid postcode format'
        )

        expected = "✗ INVALID - postcoder (50ms)"
        self.assertEqual(str(log), expected)

    def test_str_method_formatting_no_cache(self):
        """Test __str__ method formatting for non-cached lookup."""
        log = AddressLookupLog.objects.create(
            postcode='W1A 0AX',
            cache_hit=False,
            response_time_ms=200,
            result_count=1,
            api_provider='getaddress',
            success=True
        )

        expected = "✓ W1A 0AX - getaddress (200ms)"
        self.assertEqual(str(log), expected)

    def test_auto_timestamp_field(self):
        """Test lookup_timestamp is automatically set on creation."""
        log = AddressLookupLog.objects.create(
            postcode='SW1A 1AA',
            cache_hit=True,
            response_time_ms=100,
            result_count=1,
            success=True
        )

        self.assertIsNotNone(log.lookup_timestamp)
        # Timestamp should be set to approximately now
        from django.utils import timezone
        time_diff = timezone.now() - log.lookup_timestamp
        self.assertLess(time_diff.total_seconds(), 5)  # Within 5 seconds

    def test_ordering_by_timestamp_descending(self):
        """Test default ordering is by lookup_timestamp descending (newest first)."""
        from django.utils import timezone
        import time

        # Create three logs with slight time differences
        log1 = AddressLookupLog.objects.create(
            postcode='SW1A 1AA',
            cache_hit=True,
            response_time_ms=100,
            result_count=1,
            success=True
        )
        time.sleep(0.01)  # Small delay to ensure different timestamps

        log2 = AddressLookupLog.objects.create(
            postcode='W1A 0AX',
            cache_hit=True,
            response_time_ms=100,
            result_count=1,
            success=True
        )
        time.sleep(0.01)

        log3 = AddressLookupLog.objects.create(
            postcode='EC1A 1BB',
            cache_hit=True,
            response_time_ms=100,
            result_count=1,
            success=True
        )

        # Query all logs - should be ordered newest first
        logs = list(AddressLookupLog.objects.all())
        self.assertEqual(logs[0].id, log3.id)  # Newest
        self.assertEqual(logs[1].id, log2.id)
        self.assertEqual(logs[2].id, log1.id)  # Oldest

    def test_composite_index_exists(self):
        """Test composite index on (lookup_timestamp, api_provider) exists."""
        # Get model metadata
        meta = AddressLookupLog._meta

        # Check for composite index named 'timestamp_provider_idx'
        index_names = [index.name for index in meta.indexes]
        self.assertIn('timestamp_provider_idx', index_names)

        # Verify index fields
        for index in meta.indexes:
            if index.name == 'timestamp_provider_idx':
                self.assertEqual(index.fields, ['lookup_timestamp', 'api_provider'])

    def test_individual_field_indexes(self):
        """Test individual field indexes exist."""
        meta = AddressLookupLog._meta

        # Fields with db_index=True
        indexed_fields = [
            'postcode',
            'lookup_timestamp',
            'cache_hit',
            'api_provider',
            'success'
        ]

        for field_name in indexed_fields:
            field = meta.get_field(field_name)
            self.assertTrue(
                field.db_index,
                f"Field '{field_name}' should have db_index=True"
            )

    def test_optional_fields_can_be_blank(self):
        """Test optional fields (search_query, error_message) can be blank/null."""
        log = AddressLookupLog.objects.create(
            postcode='SW1A 1AA',
            cache_hit=True,
            response_time_ms=100,
            result_count=1,
            success=True
            # search_query and error_message omitted
        )

        self.assertEqual(log.search_query, '')  # CharField blank=True defaults to ''
        self.assertIsNone(log.error_message)  # TextField null=True, blank=True

    def test_verbose_name(self):
        """Test model verbose name is set correctly."""
        self.assertEqual(
            AddressLookupLog._meta.verbose_name,
            'Address Lookup Log'
        )

    def test_verbose_name_plural(self):
        """Test model verbose name plural is set correctly."""
        self.assertEqual(
            AddressLookupLog._meta.verbose_name_plural,
            'Address Lookup Logs'
        )

    def test_error_message_stored_on_failure(self):
        """Test error_message field stores error details on failed lookup."""
        error_msg = 'API timeout after 5000ms'
        log = AddressLookupLog.objects.create(
            postcode='INVALID',
            cache_hit=False,
            response_time_ms=5000,
            result_count=0,
            success=False,
            error_message=error_msg
        )

        self.assertEqual(log.error_message, error_msg)
        self.assertFalse(log.success)
