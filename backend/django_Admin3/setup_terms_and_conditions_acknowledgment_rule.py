#!/usr/bin/env python3
"""
Setup script for Terms & Conditions acknowledgment rule
Creates a rule that requires user acknowledgment of T&C at checkout_terms and add_to_cart entry points
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

def setup_terms_conditions_acknowledgment_rule():
    """Create the Terms & Conditions acknowledgment rule."""

    # Step 1: Create the message template
    message_template_data = {
        "name": "terms_conditions_acknowledgment",
        "title": "Terms & Conditions",
        "content": "ActEd's full Terms & Conditions, which include ActEd's policy on cancellation and refunds, will apply to your order. These Terms & Conditions can be viewed at https://www.acted.co.uk/dw/further-info.html#terms-and-conditions and a copy will be emailed to you once your order has been checked.\n\nPlease click this Terms & Conditions checkbox to confirm",
        "content_format": "json",
        "json_content": {
            "type": "acknowledgment",
            "content": {
                "icon": "policy",
                "title": "Terms & Conditions",
                "message": "ActEd's full Terms & Conditions, which include ActEd's policy on cancellation and refunds, will apply to your order. These Terms & Conditions can be viewed at https://www.acted.co.uk/dw/further-info.html#terms-and-conditions and a copy will be emailed to you once your order has been checked.",
                "checkbox_text": "Please click this Terms & Conditions checkbox to confirm",
                "link": {
                    "url": "https://www.acted.co.uk/dw/further-info.html#terms-and-conditions",
                    "text": "View Terms & Conditions"
                },
                "dismissible": False
            },
            "variant": "terms"
        },
        "message_type": "terms",
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

    # Step 2: Create the ActedRule for checkout_terms entry point
    checkout_terms_rule_data = {
        "rule_id": "rule_checkout_terms_acknowledgment_v1",
        "name": "Checkout Terms & Conditions Acknowledgment",
        "description": "Require user acknowledgment of Terms & Conditions at checkout start",
        "entry_point": "checkout_terms",
        "rules_fields_id": "7",  # Use existing checkout context schema
        "priority": 1,  # Highest priority - must be acknowledged first
        "active": True,
        "version": 1,
        "condition": {
            "always": True  # Always trigger for all users at checkout
        },
        "actions": [
            {
                "type": "user_acknowledge",
                "templateId": template.id,
                "ackKey": "terms_conditions_v1",
                "required": True,
                "messageType": "terms",
                "display_type": "modal",  # Can be 'inline' or 'modal'
                "blocking": True
            }
        ],
        "stop_processing": False  # Allow other rules to execute after acknowledgment
    }

    # Check if checkout terms rule already exists
    existing_checkout_rule = ActedRule.objects.filter(rule_id=checkout_terms_rule_data["rule_id"]).first()

    if existing_checkout_rule:
        # Update existing rule
        for key, value in checkout_terms_rule_data.items():
            setattr(existing_checkout_rule, key, value)
        existing_checkout_rule.save()
        print(f"[OK] Updated existing checkout terms rule: {checkout_terms_rule_data['rule_id']}")
    else:
        # Create new rule
        new_checkout_rule = ActedRule(**checkout_terms_rule_data)
        new_checkout_rule.save()
        print(f"[OK] Created new checkout terms rule: {checkout_terms_rule_data['rule_id']}")

    # Step 3: Create the ActedRule for add_to_cart entry point
    add_to_cart_rule_data = {
        "rule_id": "rule_add_to_cart_terms_acknowledgment_v1",
        "name": "Add to Cart Terms & Conditions Acknowledgment",
        "description": "Require user acknowledgment of Terms & Conditions when adding items to cart",
        "entry_point": "add_to_cart",
        "rules_fields_id": "add_to_cart_context_v1",  # Use add to cart context schema
        "priority": 5,  # Medium priority
        "active": True,
        "version": 1,
        "condition": {
            "and": [
                # Only trigger if user hasn't already acknowledged in this session
                {"!": [{"var": "user_context.acknowledgments.terms_conditions_v1.acknowledged"}]}
            ]
        },
        "actions": [
            {
                "type": "user_acknowledge",
                "templateId": template.id,
                "ackKey": "terms_conditions_v1",
                "required": True,
                "messageType": "terms",
                "display_type": "inline",  # Show inline for add to cart
                "blocking": False  # Don't block add to cart, just show message
            }
        ],
        "stop_processing": False
    }

    # Check if add to cart rule already exists
    existing_cart_rule = ActedRule.objects.filter(rule_id=add_to_cart_rule_data["rule_id"]).first()

    if existing_cart_rule:
        # Update existing rule
        for key, value in add_to_cart_rule_data.items():
            setattr(existing_cart_rule, key, value)
        existing_cart_rule.save()
        print(f"[OK] Updated existing add to cart rule: {add_to_cart_rule_data['rule_id']}")
    else:
        # Create new rule
        new_cart_rule = ActedRule(**add_to_cart_rule_data)
        new_cart_rule.save()
        print(f"[OK] Created new add to cart rule: {add_to_cart_rule_data['rule_id']}")

    # Clear Django cache to ensure rules are refreshed
    from django.core.cache import cache
    cache.clear()
    print("[OK] Django cache cleared")

    print("\n=== Terms & Conditions Acknowledgment Rules Setup Complete ===")
    print(f"Template ID: {template.id}")
    print(f"Checkout Terms Rule: {checkout_terms_rule_data['rule_id']}")
    print(f"Add to Cart Rule: {add_to_cart_rule_data['rule_id']}")
    print("Rules will trigger at checkout_terms and add_to_cart entry points")

if __name__ == '__main__':
    setup_terms_conditions_acknowledgment_rule()