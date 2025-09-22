"""
Script to set up Tutorial Booking Fee rule in the database.
This rule adds a £1 booking fee when:
- Cart contains tutorial items only (no materials or marking)
- User selects credit card payment
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from rules_engine.models import ActedRule, ActedRulesFields, MessageTemplate
import json


def create_tutorial_booking_fee_rule():
    """Create or update the Tutorial Booking Fee rule"""

    print("Creating Tutorial Booking Fee rule...")

    # Create RulesFields schema for checkout_payment context
    fields_schema = {
        "type": "object",
        "properties": {
            "cart": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "items": {"type": "array"},
                    "total": {"type": "number"},
                    "has_tutorial": {"type": "boolean"},
                    "has_material": {"type": "boolean"},
                    "has_marking": {"type": "boolean"}
                }
            },
            "payment": {
                "type": "object",
                "properties": {
                    "method": {"type": "string"},
                    "is_card": {"type": "boolean"}
                }
            }
        },
        "required": ["cart", "payment"]
    }

    # Create or update RulesFields
    rules_fields, created = ActedRulesFields.objects.update_or_create(
        id=200,  # Use a specific ID for checkout_payment context
        defaults={
            'name': 'Checkout Payment Context',
            'description': 'Context schema for checkout payment step',
            'schema': fields_schema,
            'fields_code': 'RF_200',
            'is_active': True
        }
    )
    print(f"RulesFields {'created' if created else 'updated'}: ID {rules_fields.id}")

    # Create the Tutorial Booking Fee rule
    rule_data = {
        "name": "Tutorial Only Credit Card Payment Fee",
        "entry_point": "checkout_payment",
        "priority": 100,
        "active": True,
        "version": 1,
        "rules_fields_id": rules_fields.id,
        "condition": {
            "and": [
                # Cart has tutorials
                {"==": [{"var": "cart.has_tutorial"}, True]},
                # Cart does NOT have materials
                {"==": [{"var": "cart.has_material"}, False]},
                # Cart does NOT have marking
                {"==": [{"var": "cart.has_marking"}, False]},
                # Payment method is card
                {"==": [{"var": "payment.method"}, "card"]}
            ]
        },
        "actions": [
            {
                "type": "update",
                "id": "add_tutorial_booking_fee",
                "target": "cart.fees",
                "operation": "add_fee",
                "value": {
                    "fee_type": "tutorial_booking_fee",
                    "amount": 1.00,
                    "name": "Tutorial Booking Fee",
                    "description": "Credit card processing fee for tutorial-only orders",
                    "rule_id": "rule_tutorial_booking_fee_v1"
                },
                "description": "Add £1 booking fee for tutorial-only credit card payments"
            }
        ],
        "stop_processing": False,
        "metadata": {
            "createdBy": "setup_script",
            "purpose": "Add booking fee for tutorial-only credit card orders"
        }
    }

    # Create or update the rule
    rule, created = ActedRule.objects.update_or_create(
        rule_code="rule_tutorial_booking_fee_v1",
        defaults={
            'name': rule_data['name'],
            'entry_point': rule_data['entry_point'],
            'priority': rule_data['priority'],
            'active': rule_data['active'],
            'version': rule_data['version'],
            'rules_fields_code': f"RF_{rules_fields.id}",
            'condition': rule_data['condition'],
            'actions': rule_data['actions'],
            'stop_processing': rule_data['stop_processing'],
            'metadata': rule_data['metadata'],
            'description': 'Adds £1 booking fee for tutorial-only orders paid by credit card'
        }
    )

    action = 'Created' if created else 'Updated'
    print(f"{action} Tutorial Booking Fee rule: {rule.rule_code}")

    # Verify the rule
    print("\nRule configuration:")
    print(f"  - Entry point: {rule_data['entry_point']}")
    print(f"  - Priority: {rule_data['priority']}")
    print(f"  - Active: {rule_data['active']}")
    print(f"  - Condition: Tutorial only + Credit card payment")
    print(f"  - Action: Add £1 booking fee")

    return rule


def test_rule_condition():
    """Test the rule condition logic"""
    from rules_engine.services.rule_engine import ConditionEvaluator

    evaluator = ConditionEvaluator()

    # Test case 1: Tutorial only + card payment (should match)
    context1 = {
        "cart": {
            "has_tutorial": True,
            "has_material": False,
            "has_marking": False
        },
        "payment": {
            "method": "card"
        }
    }

    # Test case 2: Tutorial + Material + card payment (should NOT match)
    context2 = {
        "cart": {
            "has_tutorial": True,
            "has_material": True,
            "has_marking": False
        },
        "payment": {
            "method": "card"
        }
    }

    # Test case 3: Tutorial only + invoice payment (should NOT match)
    context3 = {
        "cart": {
            "has_tutorial": True,
            "has_material": False,
            "has_marking": False
        },
        "payment": {
            "method": "invoice"
        }
    }

    rule = ActedRule.objects.get(rule_code="rule_tutorial_booking_fee_v1")
    condition = rule.condition

    print("\nTesting rule conditions:")

    result1 = evaluator.evaluate(condition, context1)
    print(f"Test 1 (Tutorial only + Card): {'✓ PASS' if result1 else '✗ FAIL'} - Expected: True, Got: {result1}")

    result2 = evaluator.evaluate(condition, context2)
    print(f"Test 2 (Tutorial + Material + Card): {'✓ PASS' if not result2 else '✗ FAIL'} - Expected: False, Got: {result2}")

    result3 = evaluator.evaluate(condition, context3)
    print(f"Test 3 (Tutorial only + Invoice): {'✓ PASS' if not result3 else '✗ FAIL'} - Expected: False, Got: {result3}")


if __name__ == "__main__":
    try:
        rule = create_tutorial_booking_fee_rule()
        print(f"\n✓ Successfully set up Tutorial Booking Fee rule")

        # Test the rule condition
        test_rule_condition()

    except Exception as e:
        print(f"\n✗ Error setting up rule: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)