#!/usr/bin/env python
"""
Script to clean up rules engine models:
1. Rename ActedRule.rule_id to rule_code to avoid confusion
2. Update table names for UserAcknowledgment and UserPreference
3. Ensure all foreign keys use integer IDs
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.db import connection

def check_current_state():
    """Check current database state"""
    print("=== Current Database State ===")

    with connection.cursor() as cursor:
        # Check tables
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema='public'
            AND (table_name LIKE '%acted_rules%' OR table_name LIKE '%rules_engine%')
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        print("\nExisting tables:")
        for table in tables:
            print(f"  - {table[0]}")

        # Check ActedRule columns
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'acted_rules'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        print("\nActedRule columns:")
        for col in columns[:10]:  # Show first 10 columns
            print(f"  - {col[0]}: {col[1]}")

def create_migration_plan():
    """Create migration plan"""
    print("\n=== Migration Plan ===")

    plan = """
1. PHASE 1: Update ActedRule model
   - Rename field 'rule_id' to 'rule_code' (CharField)
   - Keep 'id' as primary key (integer)
   - Update all code references

2. PHASE 2: Update UserAcknowledgment and UserPreference models
   - Change table name from 'acted_rules_user_acknowledgments' to 'rules_engine_user_acknowledgments'
   - Change table name from 'acted_rules_user_preferences' to 'rules_engine_user_preferences'
   - Ensure foreign keys use integer IDs

3. PHASE 3: Update all references in code
   - Update views.py to use rule.rule_code instead of rule.rule_id
   - Update serializers to use correct field names
   - Update frontend to send rule_code instead of ruleId for string values

4. PHASE 4: Create and run migrations
   - Create migration to rename field
   - Create migration to rename tables
   - Run migrations with data preservation
    """

    print(plan)
    return plan

def generate_model_updates():
    """Generate the actual model file updates needed"""
    print("\n=== Model Updates Needed ===")

    updates = {
        'rules_engine/models/acted_rule.py': [
            "- Change: rule_id = models.CharField(...) ",
            "  To: rule_code = models.CharField(max_length=100, unique=True, help_text='Unique code identifier for the rule')",
            "- Update Meta indexes to use 'rule_code' instead of 'rule_id'"
        ],
        'rules_engine/models/user_acknowledgment.py': [
            "- Change: db_table = 'acted_rules_user_acknowledgments'",
            "  To: db_table = 'rules_engine_user_acknowledgments'"
        ],
        'rules_engine/models/user_preference.py': [
            "- Change: db_table = 'acted_rules_user_preferences'",
            "  To: db_table = 'rules_engine_user_preferences'"
        ]
    }

    for file, changes in updates.items():
        print(f"\n{file}:")
        for change in changes:
            print(f"  {change}")

    return updates

def list_code_references():
    """List code that needs updating"""
    print("\n=== Code References to Update ===")

    references = [
        "cart/views.py - Update _save_user_preferences_to_order to use rule_code",
        "rules_engine/views.py - Update rules_preferences to use rule_code",
        "rules_engine/serializers/acted_rule.py - Update serializer fields",
        "rules_engine/services/rule_engine.py - Update to use rule_code",
        "All test files - Update to use rule_code instead of rule_id"
    ]

    for ref in references:
        print(f"  - {ref}")

    return references

if __name__ == '__main__':
    print("Rules Engine Model Cleanup Plan\n")
    print("=" * 50)

    try:
        # Check current state
        check_current_state()

        # Create migration plan
        plan = create_migration_plan()

        # Generate model updates
        updates = generate_model_updates()

        # List code references
        references = list_code_references()

        print("\n" + "=" * 50)
        print("SUMMARY")
        print("=" * 50)
        print("\nThis cleanup will:")
        print("1. Make field names clearer (rule_id -> rule_code)")
        print("2. Update table names to be consistent")
        print("3. Ensure all foreign keys use integer IDs properly")
        print("4. Prevent future confusion between string codes and integer IDs")

        print("\nNOTE: This is a significant refactoring that requires:")
        print("- Careful migration planning")
        print("- Database backup before migration")
        print("- Testing after migration")
        print("- Frontend updates to use new field names")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()