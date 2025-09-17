#!/usr/bin/env python
"""
Check acknowledgment tables structure
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.db import connection

def check_acknowledgment_tables():
    print("=== ACKNOWLEDGMENT TABLES INVESTIGATION ===\n")

    with connection.cursor() as cursor:
        # Check what tables exist that contain acknowledgment
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema='public'
            AND (table_name LIKE '%acknowledgment%' OR table_name LIKE '%acknowledge%')
        """)
        tables = cursor.fetchall()
        print(f'Tables with acknowledgment/acknowledge: {len(tables)}')
        for table in tables:
            print(f'  {table[0]}')

        # Check the schema of acted_order_user_acknowledgments if it exists
        try:
            cursor.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'acted_order_user_acknowledgments'
                ORDER BY ordinal_position
            """)
            columns = cursor.fetchall()
            print(f'\nColumns in acted_order_user_acknowledgments: {len(columns)}')
            for col in columns:
                print(f'  {col[0]} ({col[1]})')
        except Exception as e:
            print(f'\nError checking acted_order_user_acknowledgments: {e}')

        # Check acted_rules_user_acknowledgments table too
        try:
            cursor.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'acted_rules_user_acknowledgments'
                ORDER BY ordinal_position
            """)
            columns = cursor.fetchall()
            print(f'\nColumns in acted_rules_user_acknowledgments: {len(columns)}')
            for col in columns:
                print(f'  {col[0]} ({col[1]})')
        except Exception as e:
            print(f'\nError checking acted_rules_user_acknowledgments: {e}')

if __name__ == '__main__':
    check_acknowledgment_tables()