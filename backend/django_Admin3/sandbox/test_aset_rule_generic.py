#!/usr/bin/env python3
"""
Test ASET warning rule with new generic template processor
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

def test_aset_rule_generic():
    print("=== TESTING ASET RULE WITH GENERIC TEMPLATE PROCESSOR ===\n")

    engine = RuleEngine()

    # Test context with cart containing ASET product (ID 72)
    context = {
        "cart": {
            "id": 1,
            "items": [
                {
                    "id": 1,
                    "product_id": 72,
                    "subject_code": "CM1",
                    "product_name": "CM1 ASET",
                    "product_type": "Material",
                    "current_product": 72,
                    "quantity": 1,
                    "price_type": "standard",
                    "actual_price": "150.00",
                    "metadata": {"variationId": 1}
                }
            ]
        }
    }

    print(f"Entry Point: checkout_start")
    print(f"Context: {json.dumps(context, indent=2)}")

    try:
        result = engine.execute("checkout_start", context)
        print(f"\nResult:")
        print(f"Success: {result.get('success')}")
        print(f"Messages: {len(result.get('messages', []))}")
        print(f"Rules evaluated: {result.get('rules_evaluated')}")

        if result.get('messages'):
            for i, msg in enumerate(result['messages']):
                print(f"\nMessage {i+1}:")
                print(f"  Type: {msg.get('message_type')}")
                print(f"  Title: {msg.get('content', {}).get('title')}")
                print(f"  Content: {msg.get('content', {}).get('message')}")
                print(f"  Template ID: {msg.get('template_id')}")

        if result.get('rules_executed'):
            for rule_exec in result['rules_executed']:
                print(f"\nRule Executed:")
                print(f"  Rule ID: {rule_exec.get('rule_id')}")
                print(f"  Condition Result: {rule_exec.get('condition_result')}")
                print(f"  Actions Executed: {rule_exec.get('actions_executed')}")

        # Check if subject_code was properly substituted
        if result.get('messages') and len(result['messages']) > 0:
            message_content = result['messages'][0].get('content', {}).get('message', '')
            if 'CM1' in message_content:
                print(f"\n[SUCCESS] subject_code 'CM1' was properly substituted in message!")
                print(f"[OK] Generic filter mechanism is working correctly")
                return True
            else:
                print(f"\n[WARNING] subject_code substitution not found in message content")
                print(f"Message content: {message_content}")
                return False
        else:
            print(f"\n[WARNING] No messages returned")
            return False

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_aset_rule_without_product():
    print("\n=== TESTING ASET RULE WITHOUT ASET PRODUCT ===\n")

    engine = RuleEngine()

    # Test context with cart NOT containing ASET product
    context = {
        "cart": {
            "id": 1,
            "items": [
                {
                    "id": 1,
                    "product_id": 50,  # Not an ASET product
                    "subject_code": "CM1",
                    "product_name": "CM1 Material",
                    "product_type": "Material",
                    "current_product": 50,
                    "quantity": 1,
                    "price_type": "standard",
                    "actual_price": "100.00",
                    "metadata": {"variationId": 1}
                }
            ]
        }
    }

    print(f"Context with non-ASET product (ID 50):")

    try:
        result = engine.execute("checkout_start", context)
        print(f"Messages: {len(result.get('messages', []))}")
        print(f"Rules evaluated: {result.get('rules_evaluated')}")

        if result.get('rules_executed'):
            for rule_exec in result['rules_executed']:
                print(f"Rule ID: {rule_exec.get('rule_id')}")
                print(f"Condition Result: {rule_exec.get('condition_result')}")

        if len(result.get('messages', [])) == 0:
            print(f"[SUCCESS] No ASET warning shown for non-ASET product - condition working correctly")
            return True
        else:
            print(f"[WARNING] ASET warning shown for non-ASET product - condition may be wrong")
            return False

    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == '__main__':
    print("Testing ASET rule with new generic template processor...\n")

    success1 = test_aset_rule_generic()
    success2 = test_aset_rule_without_product()

    if success1 and success2:
        print(f"\n[OVERALL SUCCESS] ASET rule is working correctly with generic template processor!")
    else:
        print(f"\n[OVERALL FAILURE] Some tests failed")