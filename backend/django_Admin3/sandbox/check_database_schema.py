"""
Check database schema for acted_rules table
"""
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_Admin3.settings.development")
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'acted_rules'
        ORDER BY ordinal_position;
    """)

    columns = cursor.fetchall()
    print("Current acted_rules table schema:")
    print("=" * 60)
    for col in columns:
        column_name, data_type, is_nullable, column_default = col
        print(f"{column_name:<20} {data_type:<15} NULL: {is_nullable:<3} DEFAULT: {column_default}")