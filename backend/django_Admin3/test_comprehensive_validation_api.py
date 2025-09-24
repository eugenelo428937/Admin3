#!/usr/bin/env python
"""
Test the comprehensive validation API endpoint to ensure it works correctly
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.test.client import RequestFactory
from django.contrib.auth import get_user_model
from django.contrib.sessions.backends.db import SessionStore
from rules_engine.views import validate_comprehensive_checkout
import json

User = get_user_model()


def test_comprehensive_validation_api():
    """Test the comprehensive validation API endpoint"""
    print("=" * 60)
    print("TESTING COMPREHENSIVE VALIDATION API ENDPOINT")
    print("=" * 60)

    # Create a test user
    user, created = User.objects.get_or_create(
        email='test@example.com',
        defaults={'is_active': True}
    )

    # Create request factory
    factory = RequestFactory()

    # Test 1: No acknowledgments - should be blocked
    print("\n1. Testing with NO acknowledgments (should be BLOCKED):")

    request_data = {
        'context': {
            'cart': {
                'has_digital': True,
                'has_tutorial': True,
                'has_material': False,
                'has_marking': False,
                'items': []
            },
            'payment': {
                'method': 'card'
            }
        }
    }

    request = factory.post('/api/rules/validate-comprehensive-checkout/',
                          data=json.dumps(request_data),
                          content_type='application/json')
    request.user = user

    # Create session
    session = SessionStore()
    session.create()
    request.session = session

    response = validate_comprehensive_checkout(request)

    print(f"   Status: {response.status_code}")
    print(f"   Blocked: {response.data.get('blocked')}")
    print(f"   Missing acknowledgments: {len(response.data.get('missing_acknowledgments', []))}")
    print(f"   Required acknowledgments: {len(response.data.get('all_required_acknowledgments', []))}")

    for missing in response.data.get('missing_acknowledgments', []):
        print(f"     - {missing.get('ackKey')} (from {missing.get('entry_point')})")

    # Test 2: With all acknowledgments - should NOT be blocked
    print("\n2. Testing with ALL acknowledgments (should NOT be BLOCKED):")

    # Add acknowledgments to session
    session['user_acknowledgments'] = [
        {
            'ack_key': 'terms_conditions_v1',
            'acknowledged': True,
            'acknowledged_timestamp': '2024-01-01T10:00:00Z',
            'entry_point_location': 'checkout_terms',
            'message_id': 11
        },
        {
            'ack_key': 'digital_content_v1',
            'acknowledged': True,
            'acknowledged_timestamp': '2024-01-01T10:00:00Z',
            'entry_point_location': 'checkout_terms',
            'message_id': 12
        },
        {
            'ack_key': 'tutorial_credit_card_v1',
            'acknowledged': True,
            'acknowledged_timestamp': '2024-01-01T10:00:00Z',
            'entry_point_location': 'checkout_payment',
            'message_id': 25
        }
    ]
    session.save()

    request2 = factory.post('/api/rules/validate-comprehensive-checkout/',
                           data=json.dumps(request_data),
                           content_type='application/json')
    request2.user = user
    request2.session = session

    response2 = validate_comprehensive_checkout(request2)

    print(f"   Status: {response2.status_code}")
    print(f"   Blocked: {response2.data.get('blocked')}")
    print(f"   Missing acknowledgments: {len(response2.data.get('missing_acknowledgments', []))}")
    print(f"   Satisfied acknowledgments: {len(response2.data.get('satisfied_acknowledgments', []))}")

    for satisfied in response2.data.get('satisfied_acknowledgments', []):
        print(f"     - {satisfied}")

    # Test 3: Partial acknowledgments - should be blocked
    print("\n3. Testing with PARTIAL acknowledgments (should be BLOCKED):")

    # Remove one acknowledgment
    partial_acks = session['user_acknowledgments'][:-1]  # Remove tutorial acknowledgment
    session['user_acknowledgments'] = partial_acks
    session.save()

    request3 = factory.post('/api/rules/validate-comprehensive-checkout/',
                           data=json.dumps(request_data),
                           content_type='application/json')
    request3.user = user
    request3.session = session

    response3 = validate_comprehensive_checkout(request3)

    print(f"   Status: {response3.status_code}")
    print(f"   Blocked: {response3.data.get('blocked')}")
    print(f"   Missing acknowledgments: {len(response3.data.get('missing_acknowledgments', []))}")
    print(f"   Satisfied acknowledgments: {len(response3.data.get('satisfied_acknowledgments', []))}")

    for missing in response3.data.get('missing_acknowledgments', []):
        print(f"     Missing: {missing.get('ackKey')} (from {missing.get('entry_point')})")

    return response.data, response2.data, response3.data


def main():
    results = test_comprehensive_validation_api()

    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"1. No acknowledgments: blocked={results[0].get('blocked')}")
    print(f"2. All acknowledgments: blocked={results[1].get('blocked')}")
    print(f"3. Partial acknowledgments: blocked={results[2].get('blocked')}")

    # Verify expected behavior
    if (results[0].get('blocked') and
        not results[1].get('blocked') and
        results[2].get('blocked')):
        print("\n✅ COMPREHENSIVE VALIDATION API IS WORKING CORRECTLY!")
        print("\nThe API correctly:")
        print("- Blocks when no acknowledgments are provided")
        print("- Allows when all acknowledgments are provided")
        print("- Blocks when some acknowledgments are missing")
    else:
        print("\n❌ ISSUE: Comprehensive validation API is not working as expected")


if __name__ == '__main__':
    main()