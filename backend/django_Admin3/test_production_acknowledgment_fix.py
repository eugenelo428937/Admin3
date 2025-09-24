#!/usr/bin/env python3
"""
Production validation test for the acknowledgment transfer fix.
This simulates a real checkout scenario with different message_id types.
"""

import os
import sys
import django
from django.test import RequestFactory
from django.contrib.sessions.backends.db import SessionStore
from django.utils import timezone

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from cart.models import ActedOrder, Cart, OrderUserAcknowledgment
from cart.views import CartViewSet
from django.contrib.auth import get_user_model

User = get_user_model()

def test_production_acknowledgment_fix():
    """Comprehensive test with various message_id types"""

    print("=== PRODUCTION ACKNOWLEDGMENT FIX VALIDATION ===")
    print()

    # Get a test user
    try:
        user = User.objects.first()
        if not user:
            print("ERROR: No users found in database")
            return False
        print(f"Using test user: {user.email}")
    except Exception as e:
        print(f"ERROR getting user: {e}")
        return False

    test_cases = [
        {
            'name': 'Integer message_id (original bug)',
            'message_id': 11,
            'expected_rule_id': 11,
            'expected_template_id': 11
        },
        {
            'name': 'String numeric message_id',
            'message_id': '25',
            'expected_rule_id': 25,
            'expected_template_id': 25
        },
        {
            'name': 'String non-numeric message_id',
            'message_id': 'abc123',
            'expected_rule_id': None,
            'expected_template_id': None
        },
        {
            'name': 'None message_id',
            'message_id': None,
            'expected_rule_id': None,
            'expected_template_id': None
        }
    ]

    success_count = 0

    for i, test_case in enumerate(test_cases):
        print(f"Test {i+1}: {test_case['name']}")

        # Create fresh cart and order for each test
        try:
            cart = Cart.objects.create(user=user)
            order = ActedOrder.objects.create(
                user=user,
                subtotal=100.00,
                vat_amount=20.00,
                total_amount=120.00
            )
            print(f"  Created order {order.id}")

            # Create mock request with session data
            factory = RequestFactory()
            request = factory.post('/checkout/')
            request.user = user

            session = SessionStore()
            session.create()
            session['user_acknowledgments'] = [
                {
                    'message_id': test_case['message_id'],
                    'ack_key': 'terms_conditions_v1',
                    'entry_point_location': 'checkout_terms',
                    'acknowledged': True,
                    'acknowledged_timestamp': timezone.now().isoformat(),
                    'ip_address': '127.0.0.1',
                    'user_agent': 'Production Test Agent'
                }
            ]
            session.save()
            request.session = session

            # Test the transfer method
            cart_view = CartViewSet()
            cart_view._transfer_session_acknowledgments_to_order(request, order, cart)

            # Verify results
            acknowledgments = OrderUserAcknowledgment.objects.filter(order=order)

            if acknowledgments.count() > 0:
                ack = acknowledgments.first()
                print(f"  SUCCESS: Acknowledgment created")
                print(f"    rule_id: {ack.rule_id} (expected: {test_case['expected_rule_id']})")
                print(f"    template_id: {ack.template_id} (expected: {test_case['expected_template_id']})")

                # Verify the IDs match expectations
                if (ack.rule_id == test_case['expected_rule_id'] and
                    ack.template_id == test_case['expected_template_id']):
                    print("  VALIDATION: PASSED")
                    success_count += 1
                else:
                    print("  VALIDATION: FAILED - IDs don't match expected values")
            else:
                print("  ERROR: No acknowledgments created")

        except Exception as e:
            print(f"  ERROR: {e}")

        finally:
            # Cleanup
            try:
                OrderUserAcknowledgment.objects.filter(order=order).delete()
                order.delete()
                cart.delete()
            except:
                pass

        print()

    print(f"FINAL RESULTS: {success_count}/{len(test_cases)} tests passed")

    if success_count == len(test_cases):
        print("SUCCESS: All acknowledgment transfer tests passed!")
        print("The bug has been successfully fixed.")
        return True
    else:
        print("FAILURE: Some tests failed. The fix needs more work.")
        return False

if __name__ == "__main__":
    success = test_production_acknowledgment_fix()
    sys.exit(0 if success else 1)