#!/usr/bin/env python3
"""
Simple Django cache clear
"""
import os
import sys
import django

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.core.cache import cache

def clear_cache():
    cache.clear()
    print("[OK] Django cache cleared")

if __name__ == '__main__':
    clear_cache()