#!/usr/bin/env python3
"""
Database migration to add marking_paper_count field to CartItem model
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

def add_marking_paper_count_field():
    """Add marking_paper_count field to acted_cart_items table"""

    with connection.cursor() as cursor:
        try:
            # Check if the column already exists
            cursor.execute("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema='public'
                AND table_name='acted_cart_items'
                AND column_name='marking_paper_count';
            """)

            result = cursor.fetchone()
            if result[0] > 0:
                print("[INFO] marking_paper_count field already exists")
                return

            # Add the column
            print("[INFO] Adding marking_paper_count field to acted_cart_items table...")
            cursor.execute("""
                ALTER TABLE acted_cart_items
                ADD COLUMN marking_paper_count INTEGER NOT NULL DEFAULT 0;
            """)

            print("[INFO] Adding comment to marking_paper_count field...")
            cursor.execute("""
                COMMENT ON COLUMN acted_cart_items.marking_paper_count
                IS 'Total number of marking papers for marking products';
            """)

            print("[SUCCESS] marking_paper_count field added successfully")

        except Exception as e:
            print(f"[ERROR] Failed to add marking_paper_count field: {e}")
            raise

if __name__ == '__main__':
    add_marking_paper_count_field()
    print("[COMPLETE] Database migration completed")