#!/usr/bin/env python3
"""
Test script for Tutorial Credit Card Acknowledgment rule
Tests the rule execution with different scenarios
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

from rules_engine.services.rule_engine import RuleEngine

def test_tutorial_credit_card_rule():
    """Test the tutorial credit card acknowledgment rule with various scenarios."""

    rule_engine = RuleEngine()

    print("=== Testing Tutorial Credit Card Acknowledgment Rule ===\n")

    # Test Case 1: Tutorial + Card payment (should trigger rule)
    print("Test Case 1: Tutorial products + Card payment (SHOULD TRIGGER)")
    context1 = {
        "cart": {
            "id": 123,
            "has_tutorial": True,
            "has_material": False,
            "has_marking": False,
            "items": [{"product_type": "tutorial"}],
            "total": 50.00
        },
        "payment": {
            "method": "card",
            "is_card": True
        }
    }

    result1 = rule_engine.execute("checkout_payment", context1)
    print(f"Result: {json.dumps(result1, indent=2)}")
    print(f"Rule triggered: {'Yes' if result1.get('effects') else 'No'}\n")

    # Test Case 2: Tutorial + Invoice payment (should NOT trigger rule)
    print("Test Case 2: Tutorial products + Invoice payment (SHOULD NOT TRIGGER)")
    context2 = {
        "cart": {
            "id": 124,
            "has_tutorial": True,
            "has_material": False,
            "has_marking": False,
            "items": [{"product_type": "tutorial"}],
            "total": 50.00
        },
        "payment": {
            "method": "invoice",
            "is_card": False
        }
    }

    result2 = rule_engine.execute("checkout_payment", context2)
    print(f"Result: {json.dumps(result2, indent=2)}")
    print(f"Rule triggered: {'Yes' if result2.get('effects') else 'No'}\n")

    # Test Case 3: Material only + Card payment (should NOT trigger rule)
    print("Test Case 3: Material only + Card payment (SHOULD NOT TRIGGER)")
    context3 = {
        "cart": {
            "id": 125,
            "has_tutorial": False,
            "has_material": True,
            "has_marking": False,
            "items": [{"product_type": "material"}],
            "total": 30.00
        },
        "payment": {
            "method": "card",
            "is_card": True
        }
    }

    result3 = rule_engine.execute("checkout_payment", context3)
    print(f"Result: {json.dumps(result3, indent=2)}")
    print(f"Rule triggered: {'Yes' if result3.get('effects') else 'No'}\n")

    # Test Case 4: Tutorial + Material + Card payment (should NOT trigger rule)
    print("Test Case 4: Tutorial + Material + Card payment (SHOULD NOT TRIGGER)")
    context4 = {
        "cart": {
            "id": 126,
            "has_tutorial": True,
            "has_material": True,
            "has_marking": False,
            "items": [{"product_type": "tutorial"}, {"product_type": "material"}],
            "total": 80.00
        },
        "payment": {
            "method": "card",
            "is_card": True
        }
    }

    result4 = rule_engine.execute("checkout_payment", context4)
    print(f"Result: {json.dumps(result4, indent=2)}")
    print(f"Rule triggered: {'Yes' if result4.get('effects') else 'No'}\n")

    print("=== Test Summary ===")
    print("Test Case 1: Tutorial + Card → Should trigger (rule should show)")
    print("Test Case 2: Tutorial + Invoice → Should not trigger (rule should hide)")
    print("Test Case 3: Material + Card → Should not trigger (no tutorials)")
    print("Test Case 4: Tutorial + Material + Card → Should not trigger (mixed cart)")

if __name__ == '__main__':
    test_tutorial_credit_card_rule()