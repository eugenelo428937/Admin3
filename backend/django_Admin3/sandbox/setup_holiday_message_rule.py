"""
Script to setup Holiday Message rule for home page mount
This creates all necessary components: RulesFields, MessageTemplate, and ActedRule
"""
import json
import os
import sys
import django
from datetime import datetime

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.db import transaction
from rules_engine.models import (
    ActedRulesFields,
    MessageTemplate,
    ActedRule,
    RuleEntryPoint
)

def setup_holiday_message_rule():
    """Setup complete Holiday Message rule"""

    with transaction.atomic():
        print("=" * 60)
        print("Setting up Holiday Message Rule")
        print("=" * 60)

        # Step 1: Create ActedRulesFields with minimal home page schema
        print("\n1. Creating ActedRulesFields entry...")

        home_page_schema = {
            "type": "object",
            "properties": {
                "user": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "email": {"type": "string"},
                        "region": {"type": "string"},
                        "tier": {"type": "string"},
                        "preferences": {"type": "object"}
                    }
                },
                "session": {
                    "type": "object",
                    "properties": {
                        "session_id": {"type": "string"},
                        "ip_address": {"type": "string"}
                    }
                },
                "current_date": {"type": "string"},
                "page": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "path": {"type": "string"}
                    }
                }
            }
        }

        rules_fields, created = ActedRulesFields.objects.update_or_create(
            fields_id="home_page_context_v1",
            defaults={
                "name": "Home Page Context Schema",
                "description": "JSON Schema for validating home page context data including user and session information",
                "schema": home_page_schema,
                "version": 1,
                "is_active": True
            }
        )

        if created:
            print(f"   [CREATED] ActedRulesFields: {rules_fields.name} (fields_id: {rules_fields.fields_id})")
        else:
            print(f"   [UPDATED] ActedRulesFields: {rules_fields.name} (fields_id: {rules_fields.fields_id})")

        # Step 2: Create MessageTemplate for Holiday Message
        print("\n2. Creating MessageTemplate...")

        message_content = {
            "type": "banner",
            "variant": "info",
            "content": {
                "title": "BPP ActEd Summer Holiday",
                "message": "Please note BPP ActEd annual summer holiday is scheduled on {{date1}} to {{date2}}. Please note orders placed within this period will take slightly longer.",
                "dismissible": True,
                "icon": "info"
            }
        }

        message_template, created = MessageTemplate.objects.update_or_create(
            name="Holiday Message Banner",
            defaults={
                "title": "BPP ActEd Summer Holiday",
                "content": "Please note BPP ActEd annual summer holiday is scheduled on {{date1}} to {{date2}}. Please note orders placed within this period will take slightly longer.",
                "content_format": "json",
                "json_content": message_content,
                "message_type": "info",
                "variables": ["date1", "date2"],
                "is_active": True
            }
        )

        if created:
            print(f"   [SUCCESS] Created MessageTemplate: {message_template.name} (ID: {message_template.id})")
        else:
            print(f"   [SUCCESS] Updated MessageTemplate: {message_template.name} (ID: {message_template.id})")

        # Step 3: Create ActedRule with JSONLogic date condition
        print("\n3. Creating ActedRule...")

        # JSONLogic to check if current date is between 14/09/2025 and 20/09/2025
        rule_condition = {
            "and": [
                {
                    ">=": [
                        {"var": "current_date"},
                        "2025-09-14"
                    ]
                },
                {
                    "<=": [
                        {"var": "current_date"},
                        "2025-09-20"
                    ]
                }
            ]
        }

        # Get the home_page_mount entry point
        try:
            home_page_mount_ep = RuleEntryPoint.objects.get(code="home_page_mount")
        except RuleEntryPoint.DoesNotExist:
            print("   [ERROR] home_page_mount entry point not found. Please run populate_entry_points first.")
            return

        rule_config = {
            "name": "Holiday Message Rule",
            "description": "Display holiday message on home page during summer holiday period (14-20 Sept 2025)",
            "entry_point": home_page_mount_ep,
            "priority": 50,
            "condition_type": "jsonlogic",
            "condition": rule_condition,
            "actions": [
                {
                    "type": "display_message",
                    "templateId": message_template.id,
                    "messageType": "info",
                    "placement": "hero_section",
                    "dismissible": True,
                    "context_mapping": {
                        "date1": "14/09/2025",
                        "date2": "20/09/2025"
                    }
                }
            ],
            "stop_processing": False,
            "metadata": {
                "created_by": "setup_script",
                "business_rule": "HOLIDAY_MESSAGE",
                "display_period": "2025-09-14 to 2025-09-20"
            }
        }

        acted_rule, created = ActedRule.objects.update_or_create(
            rule_id="rule_holiday_message_v1",
            defaults={
                "name": "Holiday Message Rule",
                "description": rule_config["description"],
                "entry_point": home_page_mount_ep.code,  # Use the code string, not the object
                "priority": rule_config["priority"],
                "active": True,
                "version": 1,
                "rules_fields_id": rules_fields.fields_id,  # Store the fields_id string
                "condition": rule_config["condition"],
                "actions": rule_config["actions"],
                "stop_processing": rule_config["stop_processing"],
                "metadata": rule_config["metadata"]
            }
        )

        if created:
            print(f"   [SUCCESS] Created ActedRule: {acted_rule.name} (ID: {acted_rule.id})")
        else:
            print(f"   [SUCCESS] Updated ActedRule: {acted_rule.name} (ID: {acted_rule.id})")

        # Step 4: Display summary
        print("\n" + "=" * 60)
        print("SETUP COMPLETE!")
        print("=" * 60)
        print("\nRule Configuration Summary:")
        print(f"  • Entry Point: home_page_mount")
        print(f"  • Condition: Check if current date is between 2025-09-14 and 2025-09-20")
        print(f"  • Action: Display info banner about summer holiday")
        print(f"  • Rules Fields ID: {rules_fields.fields_id}")
        print(f"  • Message Template ID: {message_template.id}")
        print(f"  • ActedRule ID: {acted_rule.id}")

        print("\n[TESTING] Instructions:")
        print("1. Navigate to Django Admin: /admin/rules_engine/actedrule/")
        print("2. View the 'Holiday Message Rule' entry")
        print("3. Test with API endpoint: POST /api/rules/engine/execute/")
        print("   Body: {")
        print('     "entryPoint": "home_page_mount",')
        print('     "context": {')
        print('       "current_date": "2025-09-15",')
        print('       "user": {"id": 1},')
        print('       "session": {"session_id": "test123"},')
        print('       "page": {"name": "home", "path": "/"}')
        print('     }')
        print('   }')

        return acted_rule

if __name__ == "__main__":
    rule = setup_holiday_message_rule()
    if rule:
        print(f"\n[SUCCESS] Successfully created Holiday Message Rule!")