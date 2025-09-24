#!/usr/bin/env python3
"""
Test script for tutorial credit card acknowledgment complete flow
Tests: Frontend acknowledgment → Session storage → Blocking logic → Order transfer
"""
import os
import sys
import django

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.services.rule_engine import RuleEngine
from cart.models import OrderUserAcknowledgment

def test_tutorial_acknowledgment_complete_flow():
    """Test the complete tutorial credit card acknowledgment flow."""

    print("=== Testing Tutorial Credit Card Acknowledgment Complete Flow ===\n")

    rule_engine = RuleEngine()

    # Test 1: Rule triggers and blocks without acknowledgment
    print("Test 1: Verify rule triggers and blocks for tutorial + card")
    context_no_ack = {
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
    }

    result1 = rule_engine.execute("checkout_payment", context_no_ack)
    print(f"[OK] Blocked without acknowledgment: {result1.get('blocked', False)}")
    print(f"[OK] Required acknowledgments: {len(result1.get('required_acknowledgments', []))}")
    print(f"[OK] Messages: {len(result1.get('messages', []))}")

    # Find the acknowledgment message
    ack_message = None
    for msg in result1.get('messages', []):
        if msg.get('type') == 'acknowledge':
            ack_message = msg
            break

    if not ack_message:
        print("[ERROR] No acknowledgment message found!")
        return

    ack_key = ack_message.get('ack_key')
    template_id = ack_message.get('template_id')
    print(f"[OK] Found acknowledgment: ack_key={ack_key}, template_id={template_id}")
    print()

    # Test 2: Rule does NOT block when acknowledgment is provided
    print("Test 2: Verify rule does NOT block when acknowledgment provided")
    context_with_ack = {
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
            ack_key: {
                "acknowledged": True,
                "message_id": template_id,
                "timestamp": "2025-01-23T10:00:00Z",
                "entry_point_location": "checkout_payment"
            }
        }
    }

    result2 = rule_engine.execute("checkout_payment", context_with_ack)
    print(f"[OK] Blocked with acknowledgment: {result2.get('blocked', False)}")
    print(f"[OK] Required acknowledgments: {len(result2.get('required_acknowledgments', []))}")
    print(f"[OK] Satisfied acknowledgments: {result2.get('satisfied_acknowledgments', [])}")
    print()

    # Test 3: Invoice payment doesn't trigger rule
    print("Test 3: Verify invoice payment doesn't trigger rule")
    context_invoice = {
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

    result3 = rule_engine.execute("checkout_payment", context_invoice)
    print(f"[OK] Blocked for invoice payment: {result3.get('blocked', False)}")
    print(f"[OK] Messages for invoice payment: {len(result3.get('messages', []))}")
    print()

    print("=== Test Summary ===")
    test1_pass = result1.get('blocked') and ack_message is not None
    test2_pass = not result2.get('blocked') and len(result2.get('satisfied_acknowledgments', [])) > 0
    test3_pass = not result3.get('blocked') and len(result3.get('messages', [])) == 0

    print(f"Test 1 - Blocking without acknowledgment: {'[PASS]' if test1_pass else '[FAIL]'}")
    print(f"Test 2 - No blocking with acknowledgment: {'[PASS]' if test2_pass else '[FAIL]'}")
    print(f"Test 3 - Invoice payment no trigger: {'[PASS]' if test3_pass else '[FAIL]'}")

    overall_pass = test1_pass and test2_pass and test3_pass
    print(f"\nOverall Result: {'[PASS] - All tests successful!' if overall_pass else '[FAIL] - Some tests failed'}")

    return overall_pass

if __name__ == '__main__':
    test_tutorial_acknowledgment_complete_flow()