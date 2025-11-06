"""
Script to check Postcoder database entries (cache and logs).

Run this after testing to verify entries were created correctly.
"""

import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from address_cache.models import CachedAddress
from address_analytics.models import AddressLookupLog
from django.utils import timezone


def check_cached_addresses():
    """Display all cached addresses"""
    print("\n" + "="*60)
    print("CACHED ADDRESSES")
    print("="*60)

    cached = CachedAddress.objects.all().order_by('-created_at')

    if not cached:
        print("No cached addresses found.")
        return

    print(f"\nTotal Cached Entries: {cached.count()}\n")

    for entry in cached:
        print(f"Postcode: {entry.postcode}")
        print(f"  Created: {entry.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  Expires: {entry.expires_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  Hit Count: {entry.hit_count}")
        print(f"  Expired: {'Yes' if entry.is_expired() else 'No'}")
        print(f"  Addresses Stored: {len(entry.formatted_addresses.get('addresses', []))}")
        print()


def check_lookup_logs():
    """Display recent lookup logs"""
    print("\n" + "="*60)
    print("ADDRESS LOOKUP LOGS (Last 20)")
    print("="*60)

    logs = AddressLookupLog.objects.all().order_by('-lookup_timestamp')[:20]

    if not logs:
        print("No lookup logs found.")
        return

    print(f"\nTotal Logs: {AddressLookupLog.objects.count()}")
    print(f"Showing: {logs.count()} most recent\n")

    for log in logs:
        status = "✓" if log.success else "✗"
        cache = "CACHED" if log.cache_hit else "API"
        provider = log.api_provider.upper()

        print(f"{status} {log.postcode:10} | {provider:10} | {cache:6} | "
              f"{log.result_count:2} addresses | {log.response_time_ms:4}ms | "
              f"{log.lookup_timestamp.strftime('%H:%M:%S')}")

        if not log.success and log.error_message:
            print(f"   Error: {log.error_message[:60]}")


def check_statistics():
    """Display statistics"""
    print("\n" + "="*60)
    print("STATISTICS")
    print("="*60)

    # Total lookups
    total_lookups = AddressLookupLog.objects.count()
    print(f"\nTotal Lookups: {total_lookups}")

    if total_lookups == 0:
        return

    # Cache hit rate
    cache_hits = AddressLookupLog.objects.filter(cache_hit=True).count()
    cache_hit_rate = (cache_hits / total_lookups * 100) if total_lookups > 0 else 0
    print(f"Cache Hits: {cache_hits} ({cache_hit_rate:.1f}%)")
    print(f"Cache Misses: {total_lookups - cache_hits} ({100-cache_hit_rate:.1f}%)")

    # Success rate
    successful = AddressLookupLog.objects.filter(success=True).count()
    success_rate = (successful / total_lookups * 100) if total_lookups > 0 else 0
    print(f"\nSuccessful: {successful} ({success_rate:.1f}%)")
    print(f"Failed: {total_lookups - successful} ({100-success_rate:.1f}%)")

    # API provider breakdown
    postcoder_logs = AddressLookupLog.objects.filter(api_provider='postcoder').count()
    getaddress_logs = AddressLookupLog.objects.filter(api_provider='getaddress').count()
    print(f"\nPostcoder API: {postcoder_logs}")
    print(f"GetAddress API: {getaddress_logs}")

    # Average response time
    from django.db.models import Avg, Min, Max
    stats = AddressLookupLog.objects.aggregate(
        avg_time=Avg('response_time_ms'),
        min_time=Min('response_time_ms'),
        max_time=Max('response_time_ms')
    )
    print(f"\nResponse Times:")
    print(f"  Average: {stats['avg_time']:.1f}ms")
    print(f"  Min: {stats['min_time']}ms")
    print(f"  Max: {stats['max_time']}ms")


def main():
    """Run all checks"""
    print("\n" + "="*60)
    print("POSTCODER DATA VERIFICATION")
    print("="*60)

    check_cached_addresses()
    check_lookup_logs()
    check_statistics()

    print("\n" + "="*60)
    print("VERIFICATION COMPLETE")
    print("="*60)


if __name__ == "__main__":
    main()
