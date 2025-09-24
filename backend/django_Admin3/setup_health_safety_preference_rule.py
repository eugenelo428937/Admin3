#!/usr/bin/env python3
"""
Setup script for Health and Safety Preference rule
Creates a rule that shows health and safety checkbox for tutorials at checkout_preference entry point
"""
import os
import sys
import django
import json

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.models.acted_rule import ActedRule
from rules_engine.models.message_template import MessageTemplate

def setup_health_safety_preference_rule():
    """Create the Health and Safety Preference rule."""

    # Step 1: Create the message template
    message_template_data = {
        "name": "health_safety_preference",
        "title": "Health and safety",
        "content": "Please click this notification checkbox if you have any special needs/disability that may affect you in the event of a building evacuation whilst you are attending a course.",
        "content_format": "json",
        "json_content": {
            "type": "preference",
            "content": {
                "icon": "health_and_safety",
                "title": "Health and safety",
                "message": "Please click this notification checkbox if you have any special needs/disability that may affect you in the event of a building evacuation whilst you are attending a course.",
                "checkbox_text": "I have special needs/disability that may affect building evacuation",
                "dismissible": False
            },
            "variant": "info"
        },
        "message_type": "preference",
        "variables": [],
        "dismissible": False,
        "is_active": True
    }

    # Check if template already exists
    template = MessageTemplate.objects.filter(
        name=message_template_data["name"]
    ).first()

    if not template:
        template = MessageTemplate.objects.create(**message_template_data)
        print(f"[OK] Created message template with ID: {template.id}")
    else:
        # Update existing template
        for key, value in message_template_data.items():
            setattr(template, key, value)
        template.save()
        print(f"[OK] Updated existing message template with ID: {template.id}")

    # Step 2: Create the ActedRule for checkout_preference entry point
    rule_data = {
        "rule_code": "health_safety_preference_rule_v1",
        "name": "Health and Safety Preference",
        "description": "Show health and safety preference checkbox for tutorial courses",
        "entry_point": "checkout_preference",
        "rules_fields_code": "simple_checkout_v1",  # Use simple checkout schema for cart validation
        "priority": 85,  # Higher priority than existing preference rules
        "active": True,
        "version": 1,
        "condition": {
            "==": [{"var": "cart.has_tutorial"}, True]
        },
        "actions": [
            {
                "id": "health_safety_preference",
                "type": "user_preference",
                "title": "Health and safety",
                "content": "Please click this notification checkbox if you have any special needs/disability that may affect you in the event of a building evacuation whilst you are attending a course.",
                "default": {
                    "health_safety_notification": False
                },
                "blocking": False,
                "required": False,
                "inputType": "checkbox",
                "displayMode": "inline",
                "checkboxLabel": "I have special needs/disability that may affect building evacuation",
                "preferenceKey": "health_safety_notification",
                "messageTemplateId": template.id,
                "options": [
                    {
                        "label": "I have special needs/disability that may affect building evacuation",
                        "value": True
                    }
                ]
            }
        ],
        "stop_processing": False,  # Allow other preference rules to execute
        "metadata": {
            "description": "Shows health and safety checkbox for tutorials only",
            "condition": "cart.has_tutorial == true",
            "default_state": "unchecked"
        }
    }

    # Check if rule already exists
    existing_rule = ActedRule.objects.filter(rule_code=rule_data["rule_code"]).first()

    if existing_rule:
        # Update existing rule
        for key, value in rule_data.items():
            setattr(existing_rule, key, value)
        existing_rule.save()
        print(f"[OK] Updated existing rule: {rule_data['rule_code']}")
    else:
        # Create new rule
        new_rule = ActedRule(**rule_data)
        new_rule.save()
        print(f"[OK] Created new rule: {rule_data['rule_code']}")

    # Clear Django cache to ensure rules are refreshed
    from django.core.cache import cache
    cache.clear()
    print("[OK] Django cache cleared")

    print("\n=== Health and Safety Preference Rule Setup Complete ===")
    print(f"Template ID: {template.id}")
    print(f"Rule Code: {rule_data['rule_code']}")
    print("Entry Point: checkout_preference")
    print("Condition: cart.has_tutorial == true")
    print("Control: Checkbox (default unchecked)")
    print("Display: Inline preference with health and safety notification")

if __name__ == '__main__':
    setup_health_safety_preference_rule()