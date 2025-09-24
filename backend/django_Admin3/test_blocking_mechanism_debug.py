#!/usr/bin/env python
"""
Test script to debug the blocking mechanism issues

Issues identified:
1. Multiple rules with blocking=True but acknowledgments treated separately
2. Session acknowledgments not properly connected to rules engine context
3. Checkout validation not checking ALL required acknowledgments
4. No central list of required acknowledgments that gets updated when rules are fetched
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from rules_engine.models import ActedRule
from rules_engine.services.rule_engine import rule_engine
from cart.models import Cart, CartItem
import json

User = get_user_model()


def test_blocking_rules_configuration():
    """Test 1: Verify rules configuration"""
    print("=" * 60)
    print("TEST 1: BLOCKING RULES CONFIGURATION")
    print("=" * 60)

    # Find all blocking rules
    blocking_rules = []
    for rule in ActedRule.objects.filter(active=True):
        for action in rule.actions:
            if action.get('type') == 'user_acknowledge' and action.get('blocking', False):
                blocking_rules.append({
                    'rule': rule.name,
                    'code': rule.rule_code,
                    'entry_point': rule.entry_point,
                    'ack_key': action.get('ackKey'),
                    'required': action.get('required', True),
                    'blocking': action.get('blocking', False)
                })

    print(f"Found {len(blocking_rules)} blocking acknowledgment rules:")
    for rule in blocking_rules:
        print(f"  - {rule['rule']} ({rule['entry_point']})")
        print(f"    ackKey: {rule['ack_key']}, blocking: {rule['blocking']}, required: {rule['required']}")

    return blocking_rules


def test_checkout_terms_execution():
    """Test 2: Execute checkout_terms rules"""
    print("\n" + "=" * 60)
    print("TEST 2: CHECKOUT_TERMS EXECUTION")
    print("=" * 60)

    context = {
        'user': {'id': 1, 'is_authenticated': True},
        'cart': {'has_digital': True, 'items': []}
    }

    print("Executing checkout_terms rules...")
    result = rule_engine.execute('checkout_terms', context)

    print(f"Results:")
    print(f"  - Success: {result.get('success')}")
    print(f"  - Blocked: {result.get('blocked')}")
    print(f"  - Required acknowledgments: {len(result.get('required_acknowledgments', []))}")
    print(f"  - Messages: {len(result.get('messages', []))}")

    for req_ack in result.get('required_acknowledgments', []):
        print(f"    Required: {req_ack.get('ackKey')} - Rule: {req_ack.get('ruleId')}")

    return result


def test_checkout_payment_execution():
    """Test 3: Execute checkout_payment rules for tutorial credit card"""
    print("\n" + "=" * 60)
    print("TEST 3: CHECKOUT_PAYMENT EXECUTION (TUTORIAL + CARD)")
    print("=" * 60)

    context = {
        'user': {'id': 1, 'is_authenticated': True},
        'cart': {
            'has_tutorial': True,
            'has_material': False,
            'has_marking': False,
            'items': []
        },
        'payment': {'method': 'card'}
    }

    print("Executing checkout_payment rules...")
    result = rule_engine.execute('checkout_payment', context)

    print(f"Results:")
    print(f"  - Success: {result.get('success')}")
    print(f"  - Blocked: {result.get('blocked')}")
    print(f"  - Required acknowledgments: {len(result.get('required_acknowledgments', []))}")
    print(f"  - Messages: {len(result.get('messages', []))}")

    for req_ack in result.get('required_acknowledgments', []):
        print(f"    Required: {req_ack.get('ackKey')} - Rule: {req_ack.get('ruleId')}")

    return result


def test_session_acknowledgment_flow():
    """Test 4: Test session acknowledgment flow"""
    print("\n" + "=" * 60)
    print("TEST 4: SESSION ACKNOWLEDGMENT FLOW")
    print("=" * 60)

    # Simulate session acknowledgments
    session_acknowledgments = {
        'terms_conditions_v1': {
            'acknowledged': True,
            'timestamp': '2024-01-01T10:00:00Z',
            'entry_point_location': 'checkout_terms'
        },
        'tutorial_credit_card_v1': {
            'acknowledged': False,  # NOT acknowledged yet
            'timestamp': None,
            'entry_point_location': 'checkout_payment'
        }
    }

    # Test checkout_terms with acknowledgment
    print("Testing checkout_terms with terms acknowledged:")
    context_terms = {
        'user': {'id': 1, 'is_authenticated': True},
        'cart': {'has_digital': True, 'items': []},
        'acknowledgments': session_acknowledgments
    }

    result_terms = rule_engine.execute('checkout_terms', context_terms)
    print(f"  - Blocked: {result_terms.get('blocked')}")
    print(f"  - Required acknowledgments: {len(result_terms.get('required_acknowledgments', []))}")

    # Test checkout_payment with tutorial credit card NOT acknowledged
    print("\nTesting checkout_payment with tutorial credit card NOT acknowledged:")
    context_payment = {
        'user': {'id': 1, 'is_authenticated': True},
        'cart': {
            'has_tutorial': True,
            'has_material': False,
            'has_marking': False,
            'items': []
        },
        'payment': {'method': 'card'},
        'acknowledgments': session_acknowledgments
    }

    result_payment = rule_engine.execute('checkout_payment', context_payment)
    print(f"  - Blocked: {result_payment.get('blocked')}")
    print(f"  - Required acknowledgments: {len(result_payment.get('required_acknowledgments', []))}")

    return result_terms, result_payment


def test_multiple_blocking_rules():
    """Test 5: Test scenario where multiple rules are blocking"""
    print("\n" + "=" * 60)
    print("TEST 5: MULTIPLE BLOCKING RULES SCENARIO")
    print("=" * 60)

    # Context where BOTH terms and tutorial credit card are required but not acknowledged
    context = {
        'user': {'id': 1, 'is_authenticated': True},
        'cart': {
            'has_digital': True,  # Triggers digital content acknowledgment
            'has_tutorial': True,  # Triggers tutorial acknowledgment
            'has_material': False,
            'has_marking': False,
            'items': []
        },
        'payment': {'method': 'card'},
        'acknowledgments': {}  # No acknowledgments provided
    }

    print("Testing checkout_terms (should be blocked for digital content)...")
    result_terms = rule_engine.execute('checkout_terms', context)
    print(f"  Terms - Blocked: {result_terms.get('blocked')}")
    print(f"  Terms - Required: {[ack.get('ackKey') for ack in result_terms.get('required_acknowledgments', [])]}")

    print("\nTesting checkout_payment (should be blocked for tutorial credit card)...")
    result_payment = rule_engine.execute('checkout_payment', context)
    print(f"  Payment - Blocked: {result_payment.get('blocked')}")
    print(f"  Payment - Required: {[ack.get('ackKey') for ack in result_payment.get('required_acknowledgments', [])]}")

    # Simulate what happens when only ONE acknowledgment is provided
    context_partial = context.copy()
    context_partial['acknowledgments'] = {
        'terms_conditions_v1': {
            'acknowledged': True,
            'timestamp': '2024-01-01T10:00:00Z',
            'entry_point_location': 'checkout_terms'
        }
        # tutorial_credit_card_v1 still missing
    }

    print("\nTesting with only terms acknowledged (tutorial credit card still missing)...")
    result_terms_ok = rule_engine.execute('checkout_terms', context_partial)
    result_payment_blocked = rule_engine.execute('checkout_payment', context_partial)

    print(f"  Terms now - Blocked: {result_terms_ok.get('blocked')}")
    print(f"  Payment still - Blocked: {result_payment_blocked.get('blocked')}")

    return result_terms, result_payment, result_terms_ok, result_payment_blocked


def main():
    print("DEBUGGING BLOCKING MECHANISM ISSUES")
    print("=" * 60)

    # Run all tests
    blocking_rules = test_blocking_rules_configuration()
    terms_result = test_checkout_terms_execution()
    payment_result = test_checkout_payment_execution()
    session_results = test_session_acknowledgment_flow()
    multiple_results = test_multiple_blocking_rules()

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY OF FINDINGS")
    print("=" * 60)

    print(f"1. Found {len(blocking_rules)} blocking acknowledgment rules")

    print(f"2. checkout_terms execution:")
    print(f"   - Without acknowledgments: blocked={terms_result.get('blocked')}")

    print(f"3. checkout_payment execution:")
    print(f"   - Without acknowledgments: blocked={payment_result.get('blocked')}")

    print(f"4. With session acknowledgments:")
    print(f"   - Terms with ack: blocked={session_results[0].get('blocked')}")
    print(f"   - Payment without tutorial ack: blocked={session_results[1].get('blocked')}")

    print("\nKey Issues Identified:")
    print("- Rules engine correctly identifies blocking requirements")
    print("- Each entry point (checkout_terms, checkout_payment) works independently")
    print("- Frontend needs to:")
    print("  1. Collect acknowledgments from ALL entry points")
    print("  2. Maintain a master list of required acknowledgments")
    print("  3. Block checkout until ALL acknowledgments are satisfied")
    print("  4. Pass acknowledgment context to each rules engine call")


if __name__ == '__main__':
    main()