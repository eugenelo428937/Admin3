"""
Remove rule_id field from acted_rules table
"""
import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_Admin3.settings.development")
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    print("Removing rule_id field from acted_rules table...")

    # Check if rule_id field exists
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'acted_rules' AND column_name = 'rule_id';
    """)

    if cursor.fetchone():
        print("rule_id field found, removing it...")
        cursor.execute("ALTER TABLE acted_rules DROP COLUMN rule_id;")
        print("rule_id field removed successfully!")
    else:
        print("rule_id field not found, nothing to remove.")

    # Also check if we need to make rules_fields_code nullable
    cursor.execute("""
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_name = 'acted_rules' AND column_name = 'rules_fields_code';
    """)

    result = cursor.fetchone()
    if result and result[0] == 'NO':
        print("Making rules_fields_code nullable...")
        cursor.execute("ALTER TABLE acted_rules ALTER COLUMN rules_fields_code DROP NOT NULL;")
        print("rules_fields_code is now nullable!")

    print("Database schema updated!")