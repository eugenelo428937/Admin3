#!/usr/bin/env python3
"""
Setup script for Tutorial Credit Card Acknowledgment rule
Creates a rule that requires user acknowledgment when paying for tutorials with credit card at checkout_payment entry point
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

def setup_tutorial_credit_card_acknowledgment_rule():
    """Create the Tutorial Credit Card Acknowledgment rule."""

    # Step 1: Create the message template
    message_template_data = {
        "name": "tutorial_credit_card_acknowledgment",
        "title": "Charging credit card for tutorials",
        "content": "I authorise ActEd to charge my credit card the full cost of my tutorial, once my place on my chosen course has been confirmed or I am placed on a suitable alternative. The charge is likely to be made 5-10 days following the relevant finalisation date.",
        "content_format": "json",
        "json_content": {
            "type": "acknowledgment",
            "content": {
                "icon": "credit_card",
                "title": "Charging credit card for tutorials",
                "message": "I authorise ActEd to charge my credit card the full cost of my tutorial, once my place on my chosen course has been confirmed or I am placed on a suitable alternative. The charge is likely to be made 5-10 days following the relevant finalisation date.",
                "checkbox_text": "I understand and agree to the credit card charging terms",
                "dismissible": False
            },
            "variant": "info"
        },
        "message_type": "acknowledgment",
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

    # Step 2: Create the ActedRule for checkout_payment entry point
    rule_data = {
        "rule_code": "tutorial_credit_card_acknowledgment_v1",
        "name": "Tutorial Credit Card Acknowledgment",
        "description": "Require user acknowledgment when paying for tutorials with credit card",
        "entry_point": "checkout_payment",
        "rules_fields_code": "RF_200",  # Use checkout payment context schema
        "priority": 10,  # Medium priority
        "active": True,
        "version": 1,
        "condition": {
            "and": [
                {"==": [{"var": "cart.has_tutorial"}, True]},
                {"==": [{"var": "payment.method"}, "card"]}
            ]
        },
        "actions": [
            {
                "type": "user_acknowledge",
                "templateId": template.id,
                "ackKey": "tutorial_credit_card_v1",
                "required": True,
                "messageType": "acknowledgment",
                "display_type": "inline",  # Inline checkbox as requested
                "blocking": False,
                "conditional_display": True,  # Show/hide based on conditions
                "reset_on_hide": True  # Reset checkbox when hidden
            }
        ],
        "stop_processing": False,  # Allow other rules to execute
        "metadata": {
            "description": "Shows inline checkbox for tutorial credit card authorization",
            "conditional_visibility": "cart.has_tutorial == true AND payment.method == card",
            "reset_behavior": "Checkbox resets when hidden"
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

    print("\n=== Tutorial Credit Card Acknowledgment Rule Setup Complete ===")
    print(f"Template ID: {template.id}")
    print(f"Rule Code: {rule_data['rule_code']}")
    print("Entry Point: checkout_payment")
    print("Condition: cart.has_tutorial == true AND payment.method == card")
    print("Display: Inline checkbox with conditional visibility")
    print("Behavior: Shows/hides based on payment method, resets when hidden")

if __name__ == '__main__':
    setup_tutorial_credit_card_acknowledgment_rule()