#!/usr/bin/env python
"""
Test the acknowledgment transfer fix to ensure separate storage
"""

import os
import sys
import django
from unittest.mock import Mock
from decimal import Decimal

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from cart.models import Cart, ActedOrder, OrderUserAcknowledgment
from cart.views import CartViewSet
from accounts.models import AppUser

def test_acknowledgment_transfer():
    """Test the acknowledgment transfer functionality"""

    print("="*60)
    print("TESTING ACKNOWLEDGMENT TRANSFER FIX")
    print("="*60)

    # Create test user
    User = get_user_model()
    user = User.objects.create_user(
        username='test_ack_transfer',
        email='test@example.com',
        password='testpass123'
    )

    app_user = AppUser.objects.create(
        user=user,
        first_name='Test',
        last_name='User'
    )

    # Create test cart
    cart = Cart.objects.create(
        user=user,
        payment_method='credit_card'
    )

    print(f"Created test user {user.id} and cart {cart.id}")

    # Create mock request with session acknowledgments
    factory = RequestFactory()
    request = factory.post('/api/cart/checkout/')
    request.user = user

    # Add session with multiple acknowledgments (testing different data types)
    request.session = {
        'user_acknowledgments': [
            {
                'message_id': 11,  # INTEGER - this was causing the original bug
                'ack_key': 'terms_conditions_v1',
                'acknowledged': True,
                'acknowledged_timestamp': '2025-09-24T11:00:00Z',
                'entry_point_location': 'checkout_terms',
                'ip_address': '127.0.0.1',
                'user_agent': 'test'
            },
            {
                'message_id': 'tutorial_credit_card_acknowledgment_v1',  # STRING
                'ack_key': 'tutorial_credit_card_v1',
                'acknowledged': True,
                'acknowledged_timestamp': '2025-09-24T11:00:01Z',
                'entry_point_location': 'checkout_payment',
                'ip_address': '127.0.0.1',
                'user_agent': 'test'
            },
            {
                'message_id': '22',  # STRING NUMERIC
                'ack_key': 'digital_consent_v1',
                'acknowledged': True,
                'acknowledged_timestamp': '2025-09-24T11:00:02Z',
                'entry_point_location': 'checkout_terms',
                'ip_address': '127.0.0.1',
                'user_agent': 'test'
            }
        ]
    }
    request.session.modified = True

    # Create a test order
    order = ActedOrder.objects.create(
        user=user,
        total_amount=Decimal('100.00')
    )

    print(f"Created test order {order.id}")
    print(f"Session has {len(request.session['user_acknowledgments'])} acknowledgments")

    # Test the acknowledgment transfer method
    cart_viewset = CartViewSet()

    print("\n" + "="*60)
    print("TESTING ACKNOWLEDGMENT TRANSFER")
    print("="*60)

    try:
        # Call the _transfer_session_acknowledgments_to_order method directly
        cart_viewset._transfer_session_acknowledgments_to_order(request, order, cart)

        print("Acknowledgment transfer completed successfully!")

        # Check if acknowledgments were saved
        saved_acks = OrderUserAcknowledgment.objects.filter(order=order)
        print(f"\nSaved acknowledgments: {saved_acks.count()}")

        if saved_acks.count() > 0:
            print("\nDETAILS:")
            for i, ack in enumerate(saved_acks, 1):
                print(f"\nAcknowledgment {i}:")
                print(f"  - ID: {ack.id}")
                print(f"  - Type: {ack.acknowledgment_type}")
                print(f"  - Rule ID: {ack.rule_id} (type: {type(ack.rule_id)})")
                print(f"  - Template ID: {ack.template_id} (type: {type(ack.template_id)})")
                print(f"  - Title: {ack.title}")

                if ack.acknowledgment_data:
                    ack_key = ack.acknowledgment_data.get('ack_key', 'N/A')
                    message_id = ack.acknowledgment_data.get('message_id', 'N/A')
                    entry_point = ack.acknowledgment_data.get('entry_point', 'N/A')
                    print(f"  - Ack Key: {ack_key}")
                    print(f"  - Message ID: {message_id}")
                    print(f"  - Entry Point: {entry_point}")

            # Check if we have separate rows for each acknowledgment
            unique_types = set(saved_acks.values_list('acknowledgment_type', flat=True))
            unique_ack_keys = []
            for ack in saved_acks:
                if ack.acknowledgment_data and 'ack_key' in ack.acknowledgment_data:
                    unique_ack_keys.append(ack.acknowledgment_data['ack_key'])

            print(f"\n" + "="*60)
            print("SUMMARY")
            print("="*60)
            print(f"Total acknowledgments saved: {saved_acks.count()}")
            print(f"Unique types: {list(unique_types)}")
            print(f"Unique ack_keys: {unique_ack_keys}")

            if saved_acks.count() == 3:
                print("✅ SUCCESS: All 3 acknowledgments saved as separate rows!")
            else:
                print(f"❌ PARTIAL: Expected 3 acknowledgments, got {saved_acks.count()}")

            # Test integer handling specifically
            integer_acks = [ack for ack in saved_acks if ack.rule_id == 11]
            if integer_acks:
                print("✅ INTEGER MESSAGE_ID: Handled correctly")
            else:
                print("❌ INTEGER MESSAGE_ID: Not handled correctly")

        else:
            print("❌ FAILED: No acknowledgments were saved")

    except Exception as e:
        print(f"❌ ERROR during acknowledgment transfer: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # Cleanup
        try:
            User.objects.filter(username='test_ack_transfer').delete()
            print(f"\n[CLEANUP] Test data cleaned up")
        except:
            pass

if __name__ == '__main__':
    test_acknowledgment_transfer()