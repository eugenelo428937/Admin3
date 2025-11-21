"""
Address Analytics Models

This module contains Django ORM models for tracking address lookup analytics.
Logs all lookup attempts for performance monitoring and comparison between API providers.
"""

from django.db import models


class AddressLookupLog(models.Model):
    """
    Tracks address lookup attempts for analytics and monitoring.

    Fields:
        postcode: UK postcode searched
        search_query: Additional search text (if any)
        lookup_timestamp: When the lookup was performed
        cache_hit: Whether result was served from cache
        response_time_ms: Total response time in milliseconds
        result_count: Number of addresses returned
        api_provider: Which API was used ('postcoder' or 'getaddress')
        success: Whether the lookup succeeded
        error_message: Error details if lookup failed

    Indexes:
        - Composite index on (lookup_timestamp, api_provider) for analytics queries
        - Index on cache_hit for cache performance analysis
        - Index on success for error rate monitoring

    Meta:
        ordering: ['-lookup_timestamp'] - Most recent lookups first
        verbose_name: Address Lookup Log
        verbose_name_plural: Address Lookup Logs
    """

    postcode = models.CharField(
        max_length=10,
        db_index=True,
        help_text="UK postcode searched"
    )

    search_query = models.CharField(
        max_length=255,
        blank=True,
        help_text="Additional search text (if any)"
    )

    lookup_timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="When the lookup was performed"
    )

    cache_hit = models.BooleanField(
        db_index=True,
        help_text="Whether result was served from cache"
    )

    response_time_ms = models.IntegerField(
        help_text="Total response time in milliseconds"
    )

    result_count = models.IntegerField(
        help_text="Number of addresses returned"
    )

    api_provider = models.CharField(
        max_length=20,
        default='postcoder',
        db_index=True,
        help_text="Which API was used ('postcoder' or 'getaddress')"
    )

    success = models.BooleanField(
        db_index=True,
        help_text="Whether the lookup succeeded"
    )

    error_message = models.TextField(
        null=True,
        blank=True,
        help_text="Error details if lookup failed"
    )

    class Meta:
        ordering = ['-lookup_timestamp']
        verbose_name = 'Address Lookup Log'
        verbose_name_plural = 'Address Lookup Logs'
        indexes = [
            # Composite index for analytics queries
            models.Index(fields=['lookup_timestamp', 'api_provider'], name='timestamp_provider_idx'),
        ]

    def __str__(self):
        status = "✓" if self.success else "✗"
        cache_status = " (cached)" if self.cache_hit else ""
        return f"{status} {self.postcode} - {self.api_provider}{cache_status} ({self.response_time_ms}ms)"
