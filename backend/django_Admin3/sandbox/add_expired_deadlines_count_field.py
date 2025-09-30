#!/usr/bin/env python3
"""
Add expired_deadlines_count field to CartItem model
"""
import os
import sys
import django

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.db import connection

def add_expired_deadlines_count_field():
    """Add expired_deadlines_count field to CartItem table"""

    with connection.cursor() as cursor:
        # Check if field already exists (PostgreSQL syntax)
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_name='acted_cart_items'
            AND column_name='expired_deadlines_count'
            AND table_schema='public'
        """)

        if cursor.fetchone()[0] == 0:
            # Add the field (PostgreSQL syntax)
            cursor.execute("""
                ALTER TABLE acted_cart_items
                ADD COLUMN expired_deadlines_count INTEGER NOT NULL DEFAULT 0
            """)

            # Add comment separately for PostgreSQL
            cursor.execute("""
                COMMENT ON COLUMN acted_cart_items.expired_deadlines_count IS
                'Number of expired deadlines for marking products'
            """)
            print("[OK] Added expired_deadlines_count field to acted_cart_items table")
        else:
            print("[INFO] expired_deadlines_count field already exists")

if __name__ == '__main__':
    add_expired_deadlines_count_field()