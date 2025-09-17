#!/usr/bin/env python3
"""
Setup script for expired marking deadlines warning rule
Creates a rule that displays warning messages for cart items with expired marking deadlines
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

def setup_expired_marking_deadlines_rule():
    """Create the expired marking deadlines warning rule."""

    # Step 1: Create the message template
    message_template_data = {
        "name": "expired_marking_deadlines_warning",
        "title": "Expired Marking Deadlines",
        "content": "Some of the marking deadlines contain expired deadlines. Please consider purchasing Marking Voucher instead: {{expired_deadlines_list}}",
        "content_format": "json",
        "json_content": {
            "type": "banner",
            "content": {
                "icon": "warning",
                "title": "Expired Marking Deadlines",
                "message": "Some of the marking deadlines contain expired deadlines. Please consider purchasing Marking Voucher instead:\n\n{{expired_deadlines_list}}",
                "dismissible": True
            },
            "variant": "warning"
        },
        "message_type": "warning",
        "variables": ["expired_deadlines_list"],
        "dismissible": True
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

    # Step 2: Create the ActedRule
    rule_data = {
        "rule_id": "rule_expired_marking_deadlines_v1",
        "name": "Expired Marking Deadlines Warning",
        "description": "Display warning for products with expired marking deadlines",
        "entry_point": "checkout_start",
        "rules_fields_id": "checkout_context_v1",  # Use existing checkout context schema
        "priority": 90,  # Higher priority than ASET rule (100) so it shows first
        "active": True,
        "version": 1,
        "condition": {
            "and": [
                # Check if cart has marking products
                {"==": [{"var": "cart.has_marking"}, True]},
                # Check if any items have expired deadlines
                {
                    "some": [
                        {"var": "cart.items"},
                        {
                            "and": [
                                {"==": [{"var": "is_marking"}, True]},
                                {"==": [{"var": "has_expired_deadline"}, True]}
                            ]
                        }
                    ]
                }
            ]
        },
        "actions": [
            {
                "type": "display_message",
                "placement": "top",
                "templateId": template.id,
                "dismissible": True,
                "messageType": "warning",
                "context_mapping": {
                    "expired_deadlines_list": {
                        "type": "expression",
                        "expression": "generate_expired_deadlines_list",
                        "params": {
                            "source": "cart.items",
                            "filter": {
                                "and": [
                                    {"is_marking": True},
                                    {"has_expired_deadline": True}
                                ]
                            },
                            "group_by": "product_name",
                            "aggregate": {
                                "total_count": {"count": True},
                                "expired_count": {"count": {"has_expired_deadline": True}}
                            }
                        }
                    }
                }
            }
        ],
        "stop_processing": False
    }

    # Check if rule already exists
    existing_rule = ActedRule.objects.filter(rule_id=rule_data["rule_id"]).first()

    if existing_rule:
        # Update existing rule
        for key, value in rule_data.items():
            setattr(existing_rule, key, value)
        existing_rule.save()
        print(f"[OK] Updated existing rule: {rule_data['rule_id']}")
    else:
        # Create new rule
        new_rule = ActedRule(**rule_data)
        new_rule.save()
        print(f"[OK] Created new rule: {rule_data['rule_id']}")

    # Clear Django cache to ensure rules are refreshed
    from django.core.cache import cache
    cache.clear()
    print("[OK] Django cache cleared")

    print("\n=== Expired Marking Deadlines Rule Setup Complete ===")
    print(f"Entry Point: {rule_data['entry_point']}")
    print(f"Template ID: {template.id}")
    print("Rule will trigger when cart has marking products with expired deadlines")

if __name__ == '__main__':
    setup_expired_marking_deadlines_rule()