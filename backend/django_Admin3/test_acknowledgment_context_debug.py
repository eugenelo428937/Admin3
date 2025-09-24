#!/usr/bin/env python
"""
Debug why session acknowledgments aren't working in rules engine context
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.services.rule_engine import rule_engine
import json


def test_acknowledgment_context_processing():
    """Debug acknowledgment context processing"""
    print("=" * 60)
    print("DEBUGGING ACKNOWLEDGMENT CONTEXT PROCESSING")
    print("=" * 60)

    # Test case 1: Exact acknowledgment format
    context_with_acks = {
        'user': {'id': 1, 'is_authenticated': True},
        'cart': {'has_digital': True, 'items': []},
        'acknowledgments': {
            'terms_conditions_v1': {
                'acknowledged': True,
                'timestamp': '2024-01-01T10:00:00Z',
                'entry_point_location': 'checkout_terms'
            },
            'digital_content_v1': {
                'acknowledged': True,
                'timestamp': '2024-01-01T10:00:00Z',
                'entry_point_location': 'checkout_terms'
            }
        }
    }

    print("Testing checkout_terms with acknowledgments properly formatted...")
    print(f"Acknowledgments in context: {json.dumps(context_with_acks['acknowledgments'], indent=2)}")

    result = rule_engine.execute('checkout_terms', context_with_acks)

    print(f"\nResult:")
    print(f"  - Success: {result.get('success')}")
    print(f"  - Blocked: {result.get('blocked')}")
    print(f"  - Required acknowledgments: {len(result.get('required_acknowledgments', []))}")
    print(f"  - Satisfied acknowledgments: {result.get('satisfied_acknowledgments', [])}")

    # If still blocked, check what acknowledgments are actually required
    for req_ack in result.get('required_acknowledgments', []):
        print(f"    Still Required: {req_ack.get('ackKey')} - {req_ack.get('ruleId')}")

    return result


def test_partial_acknowledgments():
    """Test partial acknowledgment scenarios"""
    print("\n" + "=" * 60)
    print("TESTING PARTIAL ACKNOWLEDGMENT SCENARIOS")
    print("=" * 60)

    # Test with only terms acknowledged, digital content missing
    context_partial = {
        'user': {'id': 1, 'is_authenticated': True},
        'cart': {'has_digital': True, 'items': []},
        'acknowledgments': {
            'terms_conditions_v1': {
                'acknowledged': True,
                'timestamp': '2024-01-01T10:00:00Z',
                'entry_point_location': 'checkout_terms'
            }
            # digital_content_v1 missing
        }
    }

    print("Testing checkout_terms with only general terms acknowledged...")
    result = rule_engine.execute('checkout_terms', context_partial)

    print(f"Result:")
    print(f"  - Blocked: {result.get('blocked')}")
    print(f"  - Required acknowledgments: {len(result.get('required_acknowledgments', []))}")
    print(f"  - Satisfied acknowledgments: {result.get('satisfied_acknowledgments', [])}")

    for req_ack in result.get('required_acknowledgments', []):
        print(f"    Still Required: {req_ack.get('ackKey')}")

    return result


def test_tutorial_credit_card_acknowledgment():
    """Test tutorial credit card acknowledgment"""
    print("\n" + "=" * 60)
    print("TESTING TUTORIAL CREDIT CARD ACKNOWLEDGMENT")
    print("=" * 60)

    # Test without acknowledgment
    context_no_ack = {
        'user': {'id': 1, 'is_authenticated': True},
        'cart': {
            'has_tutorial': True,
            'has_material': False,
            'has_marking': False,
            'items': []
        },
        'payment': {'method': 'card'},
        'acknowledgments': {}
    }

    print("Testing checkout_payment WITHOUT tutorial acknowledgment...")
    result_no_ack = rule_engine.execute('checkout_payment', context_no_ack)
    print(f"  - Blocked: {result_no_ack.get('blocked')}")
    print(f"  - Required: {[ack.get('ackKey') for ack in result_no_ack.get('required_acknowledgments', [])]}")

    # Test with acknowledgment
    context_with_ack = {
        'user': {'id': 1, 'is_authenticated': True},
        'cart': {
            'has_tutorial': True,
            'has_material': False,
            'has_marking': False,
            'items': []
        },
        'payment': {'method': 'card'},
        'acknowledgments': {
            'tutorial_credit_card_v1': {
                'acknowledged': True,
                'timestamp': '2024-01-01T10:00:00Z',
                'entry_point_location': 'checkout_payment'
            }
        }
    }

    print("\nTesting checkout_payment WITH tutorial acknowledgment...")
    result_with_ack = rule_engine.execute('checkout_payment', context_with_ack)
    print(f"  - Blocked: {result_with_ack.get('blocked')}")
    print(f"  - Required: {[ack.get('ackKey') for ack in result_with_ack.get('required_acknowledgments', [])]}")
    print(f"  - Satisfied: {result_with_ack.get('satisfied_acknowledgments', [])}")

    return result_no_ack, result_with_ack


def main():
    print("DEBUGGING ACKNOWLEDGMENT CONTEXT PROCESSING")

    # Run tests
    full_acks_result = test_acknowledgment_context_processing()
    partial_acks_result = test_partial_acknowledgments()
    tutorial_results = test_tutorial_credit_card_acknowledgment()

    print("\n" + "=" * 60)
    print("DIAGNOSIS")
    print("=" * 60)

    print("1. Full acknowledgments test:")
    print(f"   - All acknowledgments provided, still blocked: {full_acks_result.get('blocked')}")
    if full_acks_result.get('blocked'):
        print("   ❌ ISSUE: Acknowledgments not being recognized correctly")
    else:
        print("   ✅ Acknowledgments working correctly")

    print("2. Partial acknowledgments test:")
    print(f"   - Only terms provided, blocked: {partial_acks_result.get('blocked')}")
    print(f"   - Satisfied acknowledgments: {len(partial_acks_result.get('satisfied_acknowledgments', []))}")

    print("3. Tutorial credit card test:")
    print(f"   - Without ack blocked: {tutorial_results[0].get('blocked')}")
    print(f"   - With ack blocked: {tutorial_results[1].get('blocked')}")
    if tutorial_results[1].get('blocked'):
        print("   ❌ ISSUE: Tutorial acknowledgment not being recognized")
    else:
        print("   ✅ Tutorial acknowledgment working correctly")


if __name__ == '__main__':
    main()