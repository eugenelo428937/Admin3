"""
Address Lookup Logger Service

This service handles logging of address lookup analytics for performance monitoring
and comparison between API providers (Postcoder.com vs getaddress.io).
"""

from typing import Optional
import logging

logger = logging.getLogger(__name__)


class AddressLookupLogger:
    """
    Service for logging address lookup analytics.

    Provides methods for:
    - Logging successful and failed lookup attempts
    - Tracking cache hit/miss rates
    - Recording response times
    - Monitoring API provider performance
    """

    def __init__(self):
        """Initialize the logger service."""
        # Import here to avoid circular imports
        from address_analytics.models import AddressLookupLog
        self.AddressLookupLog = AddressLookupLog

    def log_lookup(
        self,
        postcode: str,
        cache_hit: bool,
        response_time_ms: int,
        result_count: int,
        success: bool,
        api_provider: str = 'postcoder',
        error_message: Optional[str] = None,
        search_query: str = ""
    ) -> bool:
        """
        Log an address lookup attempt with all metadata.

        Args:
            postcode: UK postcode searched
            cache_hit: Whether result was served from cache
            response_time_ms: Total response time in milliseconds
            result_count: Number of addresses returned
            success: Whether the lookup succeeded
            api_provider: Which API was used ('postcoder' or 'getaddress')
            error_message: Error details if lookup failed (optional)
            search_query: Additional search text (optional)

        Returns:
            bool: True if logging succeeded, False otherwise
        """
        try:
            log_entry = self.AddressLookupLog.objects.create(
                postcode=postcode,
                search_query=search_query,
                cache_hit=cache_hit,
                response_time_ms=response_time_ms,
                result_count=result_count,
                api_provider=api_provider,
                success=success,
                error_message=error_message
            )

            # Log to application logger as well
            status = "SUCCESS" if success else "FAILED"
            cache_status = "(cached)" if cache_hit else "(API)"
            logger.info(
                f"[{api_provider.upper()}] {status} {cache_status} {postcode}: "
                f"{result_count} addresses in {response_time_ms}ms"
            )

            return True

        except Exception as e:
            # CRITICAL: Logging failures should NOT break the lookup flow
            # Log the error but don't raise an exception
            logger.error(f"Failed to log address lookup for {postcode}: {str(e)}")
            return False

    def log_successful_lookup(
        self,
        postcode: str,
        cache_hit: bool,
        response_time_ms: int,
        result_count: int,
        api_provider: str = 'postcoder',
        search_query: str = ""
    ) -> bool:
        """
        Convenience method for logging successful lookups.

        Args:
            postcode: UK postcode searched
            cache_hit: Whether result was served from cache
            response_time_ms: Total response time in milliseconds
            result_count: Number of addresses returned
            api_provider: Which API was used ('postcoder' or 'getaddress')
            search_query: Additional search text (optional)

        Returns:
            bool: True if logging succeeded, False otherwise
        """
        return self.log_lookup(
            postcode=postcode,
            cache_hit=cache_hit,
            response_time_ms=response_time_ms,
            result_count=result_count,
            success=True,
            api_provider=api_provider,
            error_message=None,
            search_query=search_query
        )

    def log_failed_lookup(
        self,
        postcode: str,
        response_time_ms: int,
        error_message: str,
        api_provider: str = 'postcoder',
        search_query: str = ""
    ) -> bool:
        """
        Convenience method for logging failed lookups.

        Args:
            postcode: UK postcode searched
            response_time_ms: Total response time in milliseconds
            error_message: Error details
            api_provider: Which API was used ('postcoder' or 'getaddress')
            search_query: Additional search text (optional)

        Returns:
            bool: True if logging succeeded, False otherwise
        """
        return self.log_lookup(
            postcode=postcode,
            cache_hit=False,  # Failed lookups are never cache hits
            response_time_ms=response_time_ms,
            result_count=0,  # Failed lookups return zero results
            success=False,
            api_provider=api_provider,
            error_message=error_message,
            search_query=search_query
        )

    def get_lookup_stats(
        self,
        api_provider: Optional[str] = None,
        hours: int = 24
    ) -> dict:
        """
        Get lookup statistics for monitoring.

        Args:
            api_provider: Filter by API provider (optional)
            hours: Number of hours to look back (default: 24)

        Returns:
            dict: Statistics including total lookups, success rate, cache hit rate, avg response time
        """
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Avg, Count, Q

        try:
            # Query logs from last N hours
            since = timezone.now() - timedelta(hours=hours)
            queryset = self.AddressLookupLog.objects.filter(
                lookup_timestamp__gte=since
            )

            if api_provider:
                queryset = queryset.filter(api_provider=api_provider)

            # Calculate statistics
            total_lookups = queryset.count()

            if total_lookups == 0:
                return {
                    'total_lookups': 0,
                    'success_count': 0,
                    'failure_count': 0,
                    'success_rate': 0.0,
                    'cache_hits': 0,
                    'cache_misses': 0,
                    'cache_hit_rate': 0.0,
                    'avg_response_time_ms': 0,
                    'avg_cache_hit_time_ms': 0,
                    'avg_cache_miss_time_ms': 0,
                }

            success_count = queryset.filter(success=True).count()
            failure_count = total_lookups - success_count
            success_rate = (success_count / total_lookups) * 100

            cache_hits = queryset.filter(cache_hit=True).count()
            cache_misses = total_lookups - cache_hits
            cache_hit_rate = (cache_hits / total_lookups) * 100 if total_lookups > 0 else 0

            avg_response_time = queryset.aggregate(
                avg=Avg('response_time_ms')
            )['avg'] or 0

            avg_cache_hit_time = queryset.filter(cache_hit=True).aggregate(
                avg=Avg('response_time_ms')
            )['avg'] or 0

            avg_cache_miss_time = queryset.filter(cache_hit=False).aggregate(
                avg=Avg('response_time_ms')
            )['avg'] or 0

            return {
                'total_lookups': total_lookups,
                'success_count': success_count,
                'failure_count': failure_count,
                'success_rate': round(success_rate, 2),
                'cache_hits': cache_hits,
                'cache_misses': cache_misses,
                'cache_hit_rate': round(cache_hit_rate, 2),
                'avg_response_time_ms': round(avg_response_time, 2),
                'avg_cache_hit_time_ms': round(avg_cache_hit_time, 2),
                'avg_cache_miss_time_ms': round(avg_cache_miss_time, 2),
            }

        except Exception as e:
            logger.error(f"Error getting lookup stats: {str(e)}")
            return {
                'total_lookups': 0,
                'success_count': 0,
                'failure_count': 0,
                'success_rate': 0.0,
                'cache_hits': 0,
                'cache_misses': 0,
                'cache_hit_rate': 0.0,
                'avg_response_time_ms': 0,
                'avg_cache_hit_time_ms': 0,
                'avg_cache_miss_time_ms': 0,
            }
