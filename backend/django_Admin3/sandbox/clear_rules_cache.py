#!/usr/bin/env python3
"""
Clear rules engine cache
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

def clear_rules_cache():
    print("=== CLEARING RULES ENGINE CACHE ===\n")

    # Get all entry points and clear their caches
    entry_points = RuleEntryPoint.objects.all()

    cleared_count = 0
    for ep in entry_points:
        cache_key = f"rules:{ep.name}"
        if cache.get(cache_key) is not None:
            cache.delete(cache_key)
            print(f"[OK] Cleared cache for: {ep.name}")
            cleared_count += 1
        else:
            print(f"[--] No cache found for: {ep.name}")

    print(f"\n[++] Cleared {cleared_count} cached entry points")

    # Also clear any general cache keys that might be related
    general_keys = [
        'rules:*',
        'rules_schema:*'
    ]

    print("\n=== CLEARING GENERAL CACHE ===")

    # Clear all cache (safer approach)
    cache.clear()
    print("[OK] Cleared entire Django cache")

    print("\n=== CACHE CLEARED SUCCESSFULLY ===")

if __name__ == '__main__':
    clear_rules_cache()