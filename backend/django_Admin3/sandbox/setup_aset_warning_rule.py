"""
Script to setup ASET warning rule at checkout_start
This creates all necessary components: RulesFields, MessageTemplate, and ActedRule
"""
import json
import os
import sys
import django

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

def setup_aset_warning_rule():
    """Setup complete ASET warning rule"""
    
    with transaction.atomic():
        print("=" * 60)
        print("Setting up ASET Warning Rule")
        print("=" * 60)
        
        # Step 1: Create ActedRulesFields with checkout schema
        print("\n1. Creating ActedRulesFields entry...")
        
        checkout_schema = {
            "type": "object",
            "properties": {
                "cart": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "user": {"type": ["integer", "null"]},
                        "session_key": {"type": ["string", "null"]},
                        "items": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "integer"},
                                    "current_product": {"type": "integer"},
                                    "product_id": {"type": "integer"},
                                    "product_name": {"type": "string"},
                                    "product_code": {"type": "string"},
                                    "subject_code": {"type": "string"},
                                    "exam_session_code": {"type": "string"},
                                    "product_type": {"type": "string"},
                                    "quantity": {"type": "integer", "minimum": 1},
                                    "price_type": {"type": "string"},
                                    "actual_price": {"type": "string"},
                                    "metadata": {
                                        "type": "object",
                                        "properties": {
                                            "variationId": {"type": "integer"},
                                            "variationName": {"type": "string"}
                                        },
                                        "required": ["variationId"]
                                    },
                                    "is_marking": {"type": "boolean"},
                                    "has_expired_deadline": {"type": "boolean"}
                                },
                                "required": ["id", "current_product", "product_type", "quantity", "price_type", "actual_price", "metadata"]
                            }
                        },
                        "total": {"type": "number", "minimum": 0},
                        "discount": {"type": "number", "default": 0},
                        "created_at": {"type": "string"},
                        "updated_at": {"type": "string"},
                        "has_marking": {"type": "boolean"},
                        "has_material": {"type": "boolean"},
                        "has_tutorial": {"type": "boolean"}
                    },
                    "required": ["id", "items"]
                },
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
                "acknowledgments": {
                    "type": "object",
                    "additionalProperties": {
                        "type": "object",
                        "properties": {
                            "acknowledged": {"type": "boolean"},
                            "timestamp": {"type": "string"},
                            "user_id": {"type": "integer"}
                        }
                    }
                }
            },
            "required": ["cart"]
        }
        
        rules_fields, created = ActedRulesFields.objects.update_or_create(
            fields_id="checkout_context_v1",
            defaults={
                "name": "Checkout Context Schema",
                "description": "JSON Schema for validating checkout context data including cart items and user information",
                "schema": checkout_schema,
                "version": 1,
                "is_active": True
            }
        )
        
        if created:
            print(f"   [CREATED] ActedRulesFields: {rules_fields.name} (fields_id: {rules_fields.fields_id})")
        else:
            print(f"   [UPDATED] ActedRulesFields: {rules_fields.name} (fields_id: {rules_fields.fields_id})")
        
        # Step 2: Create MessageTemplate for ASET warning
        print("\n2. Creating MessageTemplate...")
        
        message_content = {
            "type": "banner",
            "variant": "warning",
            "content": {
                "title": "Important Notice about ASET Purchase",
                "message": "BE AWARE: The {{subject_code}} Vault contains an eBook with very similar content to the {{subject_code}} ASET. If you have access to the {{subject_code}} Vault, we recommend you review the eBook available within The Vault before deciding whether to purchase this ASET.",
                "dismissible": True,
                "icon": "info"
            }
        }
        
        message_template, created = MessageTemplate.objects.update_or_create(
            name="ASET Warning Banner",
            defaults={
                "title": "ASET Purchase Warning",
                "content": "BE AWARE: The {{subject_code}} Vault contains an eBook with very similar content to the {{subject_code}} ASET.",
                "content_format": "json",
                "json_content": message_content,
                "message_type": "warning",
                "variables": ["subject_code"],
                "is_active": True
            }
        )
        
        if created:
            print(f"   [SUCCESS] Created MessageTemplate: {message_template.name} (ID: {message_template.id})")
        else:
            print(f"   [SUCCESS] Updated MessageTemplate: {message_template.name} (ID: {message_template.id})")
        
        # Step 3: Create ActedRule with JSONLogic condition
        print("\n3. Creating ActedRule...")
        
        # JSONLogic to check if cart contains product_id 72 or 73
        rule_condition = {
            "some": [
                {"var": "cart.items"},
                {
                    "in": [
                        {"var": "product_id"},
                        [72, 73]
                    ]
                }
            ]
        }
        
        # Get the checkout_start entry point
        try:
            checkout_start_ep = RuleEntryPoint.objects.get(code="checkout_start")
        except RuleEntryPoint.DoesNotExist:
            print("   [ERROR] checkout_start entry point not found. Please run populate_entry_points first.")
            return
        
        rule_config = {
            "name": "ASET Warning Rule",
            "description": "Display warning when ASET products (ID 72 or 73) are in cart",
            "entry_point": checkout_start_ep,
            "priority": 100,
            "condition_type": "jsonlogic",
            "condition": rule_condition,
            "actions": [
                {
                    "type": "display_message",
                    "templateId": message_template.id,
                    "messageType": "warning",
                    "placement": "top",
                    "dismissible": True,
                    "context_mapping": {
                        "subject_code": "{{cart.items[?(@.product_id==72 || @.product_id==73)].subject_code | [0]}}"
                    }
                }
            ],
            "stop_processing": False,
            "metadata": {
                "created_by": "setup_script",
                "business_rule": "ASET_WARNING",
                "affected_products": [72, 73]
            }
        }
        
        acted_rule, created = ActedRule.objects.update_or_create(
            rule_id="rule_aset_warning_v1",
            defaults={
                "name": "ASET Warning Rule",
                "description": rule_config["description"],
                "entry_point": checkout_start_ep.code,  # Use the code string, not the object
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
        print(f"  • Entry Point: checkout_start")
        print(f"  • Condition: Check if cart contains product_id 72 or 73")
        print(f"  • Action: Display warning banner about ASET/Vault content")
        print(f"  • Rules Fields ID: {rules_fields.fields_id}")
        print(f"  • Message Template ID: {message_template.id}")
        print(f"  • ActedRule ID: {acted_rule.id}")
        
        print("\n[TESTING] Instructions:")
        print("1. Navigate to Django Admin: /admin/rules_engine/actedrule/")
        print("2. View the 'ASET Warning Rule' entry")
        print("3. Test with API endpoint: POST /api/rules/engine/execute/")
        print("   Body: {")
        print('     "entryPoint": "checkout_start",')
        print('     "context": {')
        print('       "cart": {')
        print('         "id": 1,')
        print('         "items": [')
        print('           {')
        print('             "id": 1,')
        print('             "product_id": 72,')
        print('             "subject_code": "CM1",')
        print('             "product_name": "CM1 ASET",')
        print('             "product_type": "Material",')
        print('             "current_product": 72,')
        print('             "quantity": 1,')
        print('             "price_type": "standard",')
        print('             "actual_price": "150.00",')
        print('             "metadata": {"variationId": 1}')
        print('           }')
        print('         ]')
        print('       }')
        print('     }')
        print('   }')
        
        return acted_rule

if __name__ == "__main__":
    rule = setup_aset_warning_rule()
    if rule:
        print(f"\n[SUCCESS] Successfully created ASET Warning Rule!")