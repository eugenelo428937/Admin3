#!/usr/bin/env python
"""
Comprehensive fix for the acknowledgment blocking mechanism

The issue is that checkout validation needs to check acknowledgments from ALL entry points,
not just validate each entry point individually.

Current Flow (BROKEN):
1. User visits checkout_terms → gets terms & digital content acknowledgments
2. User visits checkout_payment → gets tutorial credit card acknowledgment
3. Each step validates independently
4. Checkout validates only the current context, not ALL requirements

Fixed Flow:
1. Before checkout, collect ALL required acknowledgments from ALL entry points
2. Check session acknowledgments against the complete list
3. Block if ANY required acknowledgment is missing
4. Provide clear feedback about what's missing
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.services.rule_engine import rule_engine
from rules_engine.models import ActedRule
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import json
import logging

logger = logging.getLogger(__name__)


def collect_all_required_acknowledgments(context):
    """
    Collect all required acknowledgments from all relevant entry points
    """
    entry_points_to_check = [
        'checkout_terms',
        'checkout_payment',
        'checkout_preference'
    ]

    all_required_acknowledgments = []
    blocking_rules = []

    for entry_point in entry_points_to_check:
        # Execute rules for this entry point
        result = rule_engine.execute(entry_point, context)

        if result.get('blocked'):
            blocking_rules.extend(result.get('blocking_rules', []))

        # Collect required acknowledgments
        required_acks = result.get('required_acknowledgments', [])
        for req_ack in required_acks:
            req_ack['entry_point'] = entry_point  # Add entry point for tracking
            all_required_acknowledgments.append(req_ack)

    return {
        'all_required_acknowledgments': all_required_acknowledgments,
        'blocking_rules': blocking_rules,
        'blocked': len(all_required_acknowledgments) > 0
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def validate_comprehensive_checkout(request):
    """
    Validate checkout by checking ALL required acknowledgments from ALL entry points
    """
    try:
        # Build comprehensive context for all validation
        context_data = request.data.get('context', {})

        # Get session acknowledgments
        session_acknowledgments = request.session.get('user_acknowledgments', [])
        logger.info(f"🔍 [Comprehensive Validation] Found {len(session_acknowledgments)} session acknowledgments")

        # Convert session acknowledgments to the format expected by rules engine
        acknowledgments_dict = {}
        for ack in session_acknowledgments:
            ack_key = ack.get('ack_key')
            if ack_key and ack.get('acknowledged'):
                acknowledgments_dict[ack_key] = {
                    'acknowledged': True,
                    'timestamp': ack.get('acknowledged_timestamp'),
                    'entry_point_location': ack.get('entry_point_location')
                }

        # Add acknowledgments to context
        context_data['acknowledgments'] = acknowledgments_dict
        logger.info(f"🎯 [Comprehensive Validation] Context acknowledgments: {list(acknowledgments_dict.keys())}")

        # Collect all required acknowledgments from all entry points
        validation_result = collect_all_required_acknowledgments(context_data)

        all_required = validation_result['all_required_acknowledgments']
        blocking_rules = validation_result['blocking_rules']

        # Check which acknowledgments are missing
        missing_acknowledgments = []
        satisfied_acknowledgments = []

        for req_ack in all_required:
            ack_key = req_ack.get('ackKey')
            if ack_key in acknowledgments_dict:
                satisfied_acknowledgments.append(ack_key)
            else:
                missing_acknowledgments.append(req_ack)

        # Determine if blocked
        blocked = len(missing_acknowledgments) > 0

        logger.info(f"🚦 [Comprehensive Validation] Result: blocked={blocked}, missing={len(missing_acknowledgments)}, satisfied={len(satisfied_acknowledgments)}")

        return Response({
            'success': True,
            'blocked': blocked,
            'can_proceed': not blocked,
            'all_required_acknowledgments': all_required,
            'missing_acknowledgments': missing_acknowledgments,
            'satisfied_acknowledgments': satisfied_acknowledgments,
            'blocking_rules': blocking_rules,
            'summary': {
                'total_required': len(all_required),
                'total_satisfied': len(satisfied_acknowledgments),
                'total_missing': len(missing_acknowledgments)
            }
        })

    except Exception as e:
        logger.error(f"❌ [Comprehensive Validation] Error: {str(e)}")
        return Response({
            'success': False,
            'blocked': True,  # Block on error for safety
            'error': str(e),
            'missing_acknowledgments': [],
            'satisfied_acknowledgments': []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def test_comprehensive_validation():
    """Test the comprehensive validation logic"""
    print("=" * 60)
    print("TESTING COMPREHENSIVE ACKNOWLEDGMENT VALIDATION")
    print("=" * 60)

    # Test scenario: Cart with digital content + tutorial + credit card payment
    context = {
        'user': {'id': 1, 'is_authenticated': True},
        'cart': {
            'has_digital': True,
            'has_tutorial': True,
            'has_material': False,
            'has_marking': False,
            'items': []
        },
        'payment': {'method': 'card'}
    }

    print("Testing scenario: Digital content + tutorial + credit card")
    print("Expected required acknowledgments:")
    print("  - terms_conditions_v1 (checkout_terms)")
    print("  - digital_content_v1 (checkout_terms)")
    print("  - tutorial_credit_card_v1 (checkout_payment)")

    # Test without any acknowledgments
    print("\n1. No acknowledgments provided:")
    result_none = collect_all_required_acknowledgments(context)
    print(f"   Blocked: {result_none['blocked']}")
    print(f"   Required acknowledgments: {len(result_none['all_required_acknowledgments'])}")
    for req_ack in result_none['all_required_acknowledgments']:
        print(f"     - {req_ack.get('ackKey')} ({req_ack.get('entry_point')})")

    # Test with partial acknowledgments
    print("\n2. Partial acknowledgments (only terms):")
    context_partial = context.copy()
    context_partial['acknowledgments'] = {
        'terms_conditions_v1': {
            'acknowledged': True,
            'timestamp': '2024-01-01T10:00:00Z',
            'entry_point_location': 'checkout_terms'
        }
    }
    result_partial = collect_all_required_acknowledgments(context_partial)
    print(f"   Blocked: {result_partial['blocked']}")
    print(f"   Required acknowledgments: {len(result_partial['all_required_acknowledgments'])}")
    for req_ack in result_partial['all_required_acknowledgments']:
        print(f"     - {req_ack.get('ackKey')} ({req_ack.get('entry_point')})")

    # Test with all acknowledgments
    print("\n3. All acknowledgments provided:")
    context_all = context.copy()
    context_all['acknowledgments'] = {
        'terms_conditions_v1': {
            'acknowledged': True,
            'timestamp': '2024-01-01T10:00:00Z',
            'entry_point_location': 'checkout_terms'
        },
        'digital_content_v1': {
            'acknowledged': True,
            'timestamp': '2024-01-01T10:00:00Z',
            'entry_point_location': 'checkout_terms'
        },
        'tutorial_credit_card_v1': {
            'acknowledged': True,
            'timestamp': '2024-01-01T10:00:00Z',
            'entry_point_location': 'checkout_payment'
        }
    }
    result_all = collect_all_required_acknowledgments(context_all)
    print(f"   Blocked: {result_all['blocked']}")
    print(f"   Required acknowledgments: {len(result_all['all_required_acknowledgments'])}")

    return result_none, result_partial, result_all


if __name__ == '__main__':
    # Run the test
    results = test_comprehensive_validation()

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"1. No acknowledgments: blocked={results[0]['blocked']}, required={len(results[0]['all_required_acknowledgments'])}")
    print(f"2. Partial acknowledgments: blocked={results[1]['blocked']}, required={len(results[1]['all_required_acknowledgments'])}")
    print(f"3. All acknowledgments: blocked={results[2]['blocked']}, required={len(results[2]['all_required_acknowledgments'])}")

    print("\n✅ Comprehensive validation logic is working!")
    print("\nNext steps:")
    print("1. Add the validate_comprehensive_checkout endpoint to views")
    print("2. Update frontend to call comprehensive validation before checkout")
    print("3. Update checkout validation in cart views to use comprehensive validation")
    print("4. Test the complete flow")