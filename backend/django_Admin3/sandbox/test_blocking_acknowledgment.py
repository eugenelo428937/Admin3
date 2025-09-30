#!/usr/bin/env python3
"""
Test script for tutorial credit card acknowledgment blocking
Tests that the blocking mechanism works correctly with session acknowledgments
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

def test_blocking_acknowledgment():
    """Test that tutorial credit card acknowledgment blocks when not provided."""

    rule_engine = RuleEngine()

    print("=== Testing Tutorial Credit Card Acknowledgment Blocking ===\n")

    # Test Case 1: No acknowledgment provided (should block)
    print("Test Case 1: Tutorial cart + card payment, NO acknowledgment (SHOULD BLOCK)")
    context1 = {
        "cart": {
            "has_tutorial": True,
            "has_material": False,
            "has_marking": False,
            "items": [{"product_type": "tutorial"}]
        },
        "payment": {
            "method": "card",
            "is_card": True
        }
        # Note: No 'acknowledgments' key - simulating no acknowledgment provided
    }

    result1 = rule_engine.execute("checkout_payment", context1)
    print(f"[OK] Blocked: {result1.get('blocked', False)}")
    print(f"[OK] Required acknowledgments: {len(result1.get('required_acknowledgments', []))}")
    print(f"[OK] Messages: {len(result1.get('messages', []))}")
    if result1.get('blocking_rules'):
        print(f"[OK] Blocking rules: {result1['blocking_rules']}")
    print()

    # Test Case 2: Acknowledgment provided (should NOT block)
    print("Test Case 2: Tutorial cart + card payment, WITH acknowledgment (SHOULD NOT BLOCK)")
    context2 = {
        "cart": {
            "has_tutorial": True,
            "has_material": False,
            "has_marking": False,
            "items": [{"product_type": "tutorial"}]
        },
        "payment": {
            "method": "card",
            "is_card": True
        },
        "acknowledgments": {
            "tutorial_credit_card_v1": {
                "acknowledged": True,
                "message_id": "tutorial_credit_card_acknowledgment_v1",
                "timestamp": "2025-01-23T10:00:00Z",
                "entry_point_location": "checkout_payment"
            }
        }
    }

    result2 = rule_engine.execute("checkout_payment", context2)
    print(f"[OK] Blocked: {result2.get('blocked', False)}")
    print(f"[OK] Required acknowledgments: {len(result2.get('required_acknowledgments', []))}")
    print(f"[OK] Satisfied acknowledgments: {result2.get('satisfied_acknowledgments', [])}")
    print(f"[OK] Messages: {len(result2.get('messages', []))}")
    print()

    # Test Case 3: Invoice payment (should NOT trigger rule)
    print("Test Case 3: Tutorial cart + invoice payment (SHOULD NOT TRIGGER)")
    context3 = {
        "cart": {
            "has_tutorial": True,
            "has_material": False,
            "has_marking": False,
            "items": [{"product_type": "tutorial"}]
        },
        "payment": {
            "method": "invoice",
            "is_card": False
        }
    }

    result3 = rule_engine.execute("checkout_payment", context3)
    print(f"[OK] Blocked: {result3.get('blocked', False)}")
    print(f"[OK] Required acknowledgments: {len(result3.get('required_acknowledgments', []))}")
    print(f"[OK] Messages: {len(result3.get('messages', []))}")
    print()

    print("=== Test Summary ===")
    print("Test Case 1: Should block (no acknowledgment provided)")
    print(f"  Result: {'[PASS]' if result1.get('blocked') else '[FAIL]'}")
    print("Test Case 2: Should NOT block (acknowledgment provided)")
    print(f"  Result: {'[PASS]' if not result2.get('blocked') else '[FAIL]'}")
    print("Test Case 3: Should NOT trigger (invoice payment)")
    print(f"  Result: {'[PASS]' if not result3.get('blocked') and len(result3.get('messages', [])) == 0 else '[FAIL]'}")

if __name__ == '__main__':
    test_blocking_acknowledgment()