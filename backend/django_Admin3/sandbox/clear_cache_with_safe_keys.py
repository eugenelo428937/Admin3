#!/usr/bin/env python3
"""
Clear rules engine cache using safe cache keys
"""

import os
import sys
import django
from django.conf import settings

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.core.cache import cache
from rules_engine.models.rule_entry_point import RuleEntryPoint

def clear_cache_with_safe_keys():
    print("=== CLEARING RULES CACHE WITH SAFE KEYS ===\n")

    # Get all entry points and clear their caches using safe keys
    entry_points = RuleEntryPoint.objects.all()

    cleared_count = 0
    for ep in entry_points:
        # Old unsafe cache key (with spaces)
        old_cache_key = f"rules:{ep.name}"

        # New safe cache key (spaces replaced with underscores, lowercase)
        safe_entry_point = ep.name.replace(' ', '_').lower()
        safe_cache_key = f"rules:{safe_entry_point}"

        # Clear both old and new cache keys to be thorough
        old_deleted = cache.delete(old_cache_key) > 0
        new_deleted = cache.delete(safe_cache_key) > 0

        if old_deleted or new_deleted:
            print(f"[OK] Cleared cache for: {ep.name}")
            print(f"     Old key: {old_cache_key} {'(deleted)' if old_deleted else '(not found)'}")
            print(f"     New key: {safe_cache_key} {'(deleted)' if new_deleted else '(not found)'}")
            cleared_count += 1
        else:
            print(f"[--] No cache found for: {ep.name}")

    print(f"\n[++] Cleared {cleared_count} cached entry points")

    # Also clear entire cache as final step
    print("\n=== CLEARING ENTIRE CACHE ===")
    cache.clear()
    print("[OK] Cleared entire Django cache")

    print("\n=== CACHE CLEARED SUCCESSFULLY ===")

if __name__ == '__main__':
    clear_cache_with_safe_keys()