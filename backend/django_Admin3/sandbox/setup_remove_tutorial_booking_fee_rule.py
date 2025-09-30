#!/usr/bin/env python
"""
Script to set up a rule that removes tutorial booking fee when payment is not credit card
This ensures the fee is properly managed when users switch payment methods
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
print(f"DJANGO_ENV {os.environ.get('DJANGO_ENV')}")
print(f"DJANGO_SETTINGS_MODULE {os.environ.get('DJANGO_SETTINGS_MODULE')}")
django.setup()

from rules_engine.models import ActedRule, ActedRulesFields
import json

def create_remove_tutorial_booking_fee_rule():
    """Create rule to remove tutorial booking fee when not using credit card"""

    print("Creating Remove Tutorial Booking Fee rule...")

    # Use the same RulesFields as the add rule
    try:
        rules_fields = ActedRulesFields.objects.get(fields_code='RF_200')
        print(f"Using existing RulesFields: ID {rules_fields.id}")
    except ActedRulesFields.DoesNotExist:
        print("ERROR: RulesFields RF_200 not found. Run setup_tutorial_booking_fee_rule.py first")
        return

    # Rule configuration for removing fee when NOT credit card payment
    # This rule should run after the add rule (higher priority number = lower execution priority)
    rule_config = {
        "condition": {
            "type": "jsonlogic",
            "expr": {
                "and": [
                    # Cart has tutorial items
                    {"==": [{"var": "cart.has_tutorial"}, True]},
                    # Cart has no material items
                    {"==": [{"var": "cart.has_material"}, False]},
                    # Payment method is NOT credit card
                    {"!=": [{"var": "payment.method"}, "card"]}
                ]
            },
            "description": "Remove fee when tutorial-only cart but NOT using credit card"
        },
        "actions": [
            {
                "type": "update",
                "id": "remove_tutorial_booking_fee",
                "target": "cart.fees",
                "operation": "remove_fee",
                "value": {
                    "fee_type": "tutorial_booking_fee"
                },
                "description": "Remove tutorial booking fee when not using credit card"
            }
        ],
        "stop_processing": False,
        "metadata": {
            "version": 1,
            "description": "Remove tutorial booking fee when payment method is not credit card",
            "created_by": "setup_script",
            "related_rule": "rule_tutorial_booking_fee_v1"
        }
    }

    # Create or update the rule
    rule, created = ActedRule.objects.update_or_create(
        rule_code='rule_remove_tutorial_booking_fee_v1',
        defaults={
            'name': 'Remove Tutorial Booking Fee - Non-Card Payment',
            'entry_point': 'checkout_payment',
            'priority': 101,  # Run after the add rule (priority 100)
            'active': True,
            'condition': rule_config['condition'],
            'actions': rule_config['actions'],
            'stop_processing': rule_config['stop_processing'],
            'metadata': rule_config['metadata'],
            'rules_fields_code': 'RF_200'
        }
    )

    action = "Created" if created else "Updated"
    print(f"{action} Remove Tutorial Booking Fee rule: {rule.rule_code}")
    print(f"""
Rule configuration:
  - Entry point: {rule.entry_point}
  - Priority: {rule.priority}
  - Active: {rule.active}
  - Condition: Tutorial only + NOT Credit card payment
  - Action: Remove tutorial booking fee
""")

    return rule

def test_rule_conditions():
    """Test the rule conditions to ensure they work correctly"""
    from rules_engine.services.rule_engine import RuleEngine

    print("\nTesting rule conditions:")

    test_cases = [
        {
            "name": "Tutorial only + Invoice",
            "context": {
                "cart": {
                    "has_tutorial": True,
                    "has_material": False,
                    "has_marking": False
                },
                "payment": {
                    "method": "invoice",
                    "is_card": False
                }
            },
            "expected": True
        },
        {
            "name": "Tutorial only + Card",
            "context": {
                "cart": {
                    "has_tutorial": True,
                    "has_material": False,
                    "has_marking": False
                },
                "payment": {
                    "method": "card",
                    "is_card": True
                }
            },
            "expected": False
        },
        {
            "name": "Tutorial + Material + Invoice",
            "context": {
                "cart": {
                    "has_tutorial": True,
                    "has_material": True,
                    "has_marking": False
                },
                "payment": {
                    "method": "invoice",
                    "is_card": False
                }
            },
            "expected": False
        }
    ]

    engine = RuleEngine()
    rule = ActedRule.objects.get(rule_code='rule_remove_tutorial_booking_fee_v1')

    for i, test_case in enumerate(test_cases, 1):
        result = engine._evaluate_condition(rule.condition, test_case['context'])
        status = "✓ PASS" if result == test_case['expected'] else "✗ FAIL"
        print(f"Test {i} ({test_case['name']}): {status} - Expected: {test_case['expected']}, Got: {result}")

if __name__ == '__main__':
    rule = create_remove_tutorial_booking_fee_rule()
    if rule:
        print("\n✓ Successfully set up Remove Tutorial Booking Fee rule")
        test_rule_conditions()