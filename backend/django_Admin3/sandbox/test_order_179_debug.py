"""
Debug script to understand what really happened with Order 179

This script simulates the conditions that led to Order 179 having only 1 acknowledgment
instead of 2, and validates that our fix resolves the issue.
"""

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings')
django.setup()

def simulate_order_179_bug():
    """
    Simulate the exact conditions that led to the Order 179 bug
    """
    from rules_engine.services.rule_engine import rule_engine

    print("🔍 SIMULATING ORDER 179 BUG")
    print("=" * 50)

    # Context that would trigger both terms and tutorial credit card rules
    context = {
        'cart': {
            'id': 123,
            'user_id': 1,
            'has_digital': False,
            'has_tutorial': True,  # This should trigger tutorial rule
            'total': 100.0,
            'items': []
        },
        'user': {
            'id': 1,
            'email': 'test@example.com',
            'is_authenticated': True
        },
        'session': {
            'ip_address': '127.0.0.1',
            'session_id': 'test_session'
        },
        'acknowledgments': {}
    }

    print("📋 Test Context:")
    print(f"   - has_tutorial: {context['cart']['has_tutorial']}")
    print(f"   - has_digital: {context['cart']['has_digital']}")
    print()

    # Test 1: Execute rules at checkout_terms (what the old code did)
    print("1️⃣  TESTING OLD APPROACH - Only checkout_terms:")
    try:
        result_terms = rule_engine.execute('checkout_terms', context)
        terms_rules = set()

        # Extract matched rule IDs
        for rule_exec in result_terms.get('rules_executed', []):
            if rule_exec.get('condition_result'):
                terms_rules.add(rule_exec.get('rule_id'))

        for message in result_terms.get('messages', []):
            template_id = message.get('template_id')
            if template_id:
                terms_rules.add(str(template_id))

        print(f"   ✓ Rules matched at checkout_terms: {terms_rules}")

    except Exception as e:
        print(f"   ❌ Error: {e}")

    # Test 2: Execute rules at checkout_payment (where tutorial rule lives)
    print("\n2️⃣  TESTING checkout_payment entry point:")
    try:
        result_payment = rule_engine.execute('checkout_payment', context)
        payment_rules = set()

        # Extract matched rule IDs
        for rule_exec in result_payment.get('rules_executed', []):
            if rule_exec.get('condition_result'):
                payment_rules.add(rule_exec.get('rule_id'))

        for message in result_payment.get('messages', []):
            template_id = message.get('template_id')
            if template_id:
                payment_rules.add(str(template_id))

        print(f"   ✓ Rules matched at checkout_payment: {payment_rules}")

    except Exception as e:
        print(f"   ❌ Error: {e}")

    # Test 3: Combined approach (what the new code does)
    print("\n3️⃣  TESTING NEW APPROACH - Both entry points:")
    all_matched_rules = set()

    for entry_point in ['checkout_terms', 'checkout_payment']:
        try:
            result = rule_engine.execute(entry_point, context)

            for rule_exec in result.get('rules_executed', []):
                if rule_exec.get('condition_result'):
                    all_matched_rules.add(rule_exec.get('rule_id'))

            for message in result.get('messages', []):
                template_id = message.get('template_id')
                if template_id:
                    all_matched_rules.add(str(template_id))

        except Exception as e:
            print(f"   ❌ Error at {entry_point}: {e}")

    print(f"   ✓ All rules matched across entry points: {all_matched_rules}")

    # Analysis
    print("\n📊 ANALYSIS:")
    print("=" * 50)

    if len(terms_rules) == 1 and len(all_matched_rules) > 1:
        print("✅ BUG CONFIRMED AND FIXED!")
        print("   - Old approach (checkout_terms only): found", len(terms_rules), "rule(s)")
        print("   - New approach (both entry points): found", len(all_matched_rules), "rule(s)")
        print("   - The tutorial credit card acknowledgment was being lost!")
    elif len(all_matched_rules) <= 1:
        print("ℹ️  Only 1 rule matched - this might be expected based on current conditions")
        print("   - Check if tutorial items are properly configured")
        print("   - Check if tutorial credit card rule conditions are met")
    else:
        print("🤔 Unexpected results - please review the output above")

if __name__ == '__main__':
    simulate_order_179_bug()