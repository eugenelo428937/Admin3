"""
Address Cache Models

This module contains Django ORM models for caching Postcoder.com address lookup results.
Cache entries are stored for 7 days to improve performance and reduce API costs.
"""

from django.db import models
from django.utils import timezone
from datetime import timedelta


class CachedAddress(models.Model):
    """
    Stores Postcoder API responses for 7-day caching.

    Fields:
        postcode: UK postcode (uppercase, no spaces) - indexed for fast lookups
        search_query: Original query string from user
        response_data: Full Postcoder API response (JSON)
        formatted_addresses: Transformed response in getaddress.io format (JSON)
        created_at: Timestamp when cache entry was created
        expires_at: Timestamp when cache entry expires (created_at + 7 days)
        hit_count: Number of times this cached entry has been served

    Indexes:
        - Composite index on (postcode, expires_at) for efficient cache lookups
        - Index on created_at for cleanup queries

    Meta:
        ordering: ['-created_at'] - Most recent entries first
        verbose_name: Cached Address
        verbose_name_plural: Cached Addresses
    """

    postcode = models.CharField(
        max_length=10,
        db_index=True,
        help_text="UK postcode (uppercase, no spaces)"
    )

    search_query = models.CharField(
        max_length=255,
        blank=True,
        help_text="Original search query string"
    )

    response_data = models.JSONField(
        help_text="Full Postcoder API response"
    )

    formatted_addresses = models.JSONField(
        help_text="Transformed response in getaddress.io format"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="Timestamp when cache entry was created"
    )

    expires_at = models.DateTimeField(
        db_index=True,
        help_text="Timestamp when cache entry expires"
    )

    hit_count = models.IntegerField(
        default=0,
        help_text="Number of times served from cache"
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Cached Address'
        verbose_name_plural = 'Cached Addresses'
        indexes = [
            # Composite index for efficient cache lookups
            models.Index(fields=['postcode', 'expires_at'], name='postcode_expires_idx'),
        ]

    def __str__(self):
        return f"{self.postcode} (cached: {self.created_at.strftime('%Y-%m-%d')}, hits: {self.hit_count})"

    def save(self, *args, **kwargs):
        """
        Override save to automatically set expires_at to 7 days from created_at.
        """
        if not self.expires_at:
            # Set expiration to 7 days from now
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    def is_expired(self):
        """
        Check if this cache entry has expired.

        Returns:
            bool: True if expired, False otherwise
        """
        return timezone.now() > self.expires_at

    def increment_hit_count(self):
        """
        Increment the hit count when serving from cache.
        Uses F() expression to avoid race conditions.
        """
        from django.db.models import F
        CachedAddress.objects.filter(pk=self.pk).update(hit_count=F('hit_count') + 1)
        self.refresh_from_db()
