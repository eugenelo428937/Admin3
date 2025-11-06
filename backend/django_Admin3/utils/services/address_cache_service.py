"""
Address Cache Service

This service manages caching of Postcoder.com address lookup results.
Implements 7-day TTL (time-to-live) caching to improve performance and reduce API costs.
"""

from django.utils import timezone
from datetime import timedelta
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class AddressCacheService:
    """
    Service for managing address lookup cache.

    Provides methods for:
    - Checking cache for existing address data
    - Storing new address lookup results
    - Validating cache expiration (7-day TTL)
    - Incrementing cache hit counters
    """

    CACHE_TTL_DAYS = 7

    def __init__(self):
        """Initialize the cache service."""
        # Import here to avoid circular imports
        from address_cache.models import CachedAddress
        self.CachedAddress = CachedAddress

    def get_cached_address(self, postcode: str) -> Optional[Dict]:
        """
        Retrieve cached address data for a postcode.

        Args:
            postcode: UK postcode (cleaned, uppercase, no spaces)

        Returns:
            dict: Cached address data in getaddress.io format, or None if not cached/expired
        """
        try:
            # Query for unexpired cache entries
            cached = self.CachedAddress.objects.filter(
                postcode=postcode,
                expires_at__gt=timezone.now()
            ).order_by('-created_at').first()

            if cached:
                # Increment hit count atomically
                cached.increment_hit_count()
                logger.info(f"Cache HIT for postcode {postcode} (hits: {cached.hit_count + 1})")
                return cached.formatted_addresses

            logger.info(f"Cache MISS for postcode {postcode}")
            return None

        except Exception as e:
            logger.error(f"Error retrieving from cache for postcode {postcode}: {str(e)}")
            # Return None on error - fall back to API call
            return None

    def cache_address(
        self,
        postcode: str,
        addresses: Dict,
        expires_in_days: int = CACHE_TTL_DAYS,
        response_data: Optional[Dict] = None,
        search_query: str = ""
    ) -> bool:
        """
        Store address lookup result in cache.

        Args:
            postcode: UK postcode (cleaned, uppercase, no spaces)
            addresses: Transformed address data in getaddress.io format
            expires_in_days: Number of days until cache expires (default: 7)
            response_data: Original Postcoder API response (optional)
            search_query: Original search query string (optional)

        Returns:
            bool: True if caching succeeded, False otherwise
        """
        try:
            # Calculate expiration timestamp
            expires_at = timezone.now() + timedelta(days=expires_in_days)

            # Create cache entry
            cached = self.CachedAddress.objects.create(
                postcode=postcode,
                search_query=search_query,
                response_data=response_data or {},
                formatted_addresses=addresses,
                expires_at=expires_at,
                hit_count=0
            )

            logger.info(f"Cached addresses for postcode {postcode} (expires: {expires_at.date()})")
            return True

        except Exception as e:
            logger.error(f"Error caching addresses for postcode {postcode}: {str(e)}")
            # Don't raise - caching failure should not break the lookup flow
            return False

    def is_cache_valid(self, postcode: str) -> bool:
        """
        Check if a valid (unexpired) cache entry exists for a postcode.

        Args:
            postcode: UK postcode (cleaned, uppercase, no spaces)

        Returns:
            bool: True if valid cache exists, False otherwise
        """
        try:
            return self.CachedAddress.objects.filter(
                postcode=postcode,
                expires_at__gt=timezone.now()
            ).exists()

        except Exception as e:
            logger.error(f"Error checking cache validity for postcode {postcode}: {str(e)}")
            return False

    def invalidate_cache(self, postcode: str) -> int:
        """
        Manually invalidate (delete) cache entries for a postcode.

        Useful for:
        - Testing cache expiration behavior
        - Forcing cache refresh
        - Data quality corrections

        Args:
            postcode: UK postcode (cleaned, uppercase, no spaces)

        Returns:
            int: Number of cache entries deleted
        """
        try:
            count, _ = self.CachedAddress.objects.filter(postcode=postcode).delete()
            logger.info(f"Invalidated {count} cache entries for postcode {postcode}")
            return count

        except Exception as e:
            logger.error(f"Error invalidating cache for postcode {postcode}: {str(e)}")
            return 0

    def cleanup_expired_cache(self) -> int:
        """
        Remove expired cache entries from the database.

        This method should be called periodically (e.g., daily cron job)
        to prevent unbounded cache table growth.

        Returns:
            int: Number of expired entries deleted
        """
        try:
            count, _ = self.CachedAddress.objects.filter(
                expires_at__lte=timezone.now()
            ).delete()

            logger.info(f"Cleaned up {count} expired cache entries")
            return count

        except Exception as e:
            logger.error(f"Error cleaning up expired cache: {str(e)}")
            return 0

    def get_cache_stats(self) -> Dict:
        """
        Get cache statistics for monitoring.

        Returns:
            dict: Cache statistics including total entries, hit rates, etc.
        """
        try:
            total_entries = self.CachedAddress.objects.count()
            valid_entries = self.CachedAddress.objects.filter(
                expires_at__gt=timezone.now()
            ).count()
            expired_entries = total_entries - valid_entries

            # Calculate total cache hits
            from django.db.models import Sum
            total_hits = self.CachedAddress.objects.aggregate(
                total=Sum('hit_count')
            )['total'] or 0

            return {
                'total_entries': total_entries,
                'valid_entries': valid_entries,
                'expired_entries': expired_entries,
                'total_hits': total_hits,
                'cache_size_mb': 0  # Placeholder - could calculate actual size
            }

        except Exception as e:
            logger.error(f"Error getting cache stats: {str(e)}")
            return {
                'total_entries': 0,
                'valid_entries': 0,
                'expired_entries': 0,
                'total_hits': 0,
                'cache_size_mb': 0
            }
