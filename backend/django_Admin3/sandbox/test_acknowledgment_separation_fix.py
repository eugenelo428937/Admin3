#!/usr/bin/env python
"""
Test script to verify the acknowledgment separation fix in cart/views.py

This script simulates the exact scenario that caused Order 179 to have only 1 acknowledgment
record instead of 2 separate records. It tests that the fixed logic now creates separate
database rows for each acknowledgment.

BEFORE FIX: Only 1 record created (terms & conditions)
AFTER FIX: 2 separate records created (terms & conditions + tutorial credit card)
"""

import os
import sys
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

import logging
from decimal import Decimal
from django.test import RequestFactory
from django.contrib.sessions.middleware import SessionMiddleware
from django.contrib.auth import get_user_model
from django.utils import timezone

from cart.models import Cart, CartItem, ActedOrder, OrderUserAcknowledgment
from cart.views import CartViewSet
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
# Import User model properly
User = get_user_model()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_test_data():
    """Create test user, cart, and order"""
    print("=== Setting up test data ===")

    # Create or get test user
    user, created = User.objects.get_or_create(
        email='test.separation@example.com',
        defaults={
            'username': 'test_separation_user',
            'first_name': 'Test',
            'last_name': 'Separation'
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
    print(f"Test user: {user.email}")

    # Create test cart
    cart, created = Cart.objects.get_or_create(
        user=user,
        defaults={
            'has_digital': True,
            'has_tutorial': True,
            'has_material': False,
            'has_marking': False
        }
    )
    print(f"Test cart: {cart.id}")

    # Get a test product for cart item
    try:
        product = ExamSessionSubjectProduct.objects.first()
        if product:
            cart_item, created = CartItem.objects.get_or_create(
                cart=cart,
                product=product,
                defaults={
                    'quantity': 1,
                    'actual_price': Decimal('59.99')
                }
            )
            if created:
                print(f"Added cart item: {cart_item}")
    except Exception as e:
        print(f"Could not add cart item: {e}")

    # Create test order
    order = ActedOrder.objects.create(
        user=user,
        subtotal=Decimal('59.99'),
        vat_amount=Decimal('12.00'),
        total_amount=Decimal('71.99'),
        vat_rate=Decimal('0.2000'),
        vat_country='GB'
    )
    print(f"Test order: {order.id}")

    return user, cart, order

def create_test_session_acknowledgments():
    """Create the exact session acknowledgments from Order 179 scenario"""
    return [
        {
            'ack_key': 'terms_conditions_v1',
            'message_id': 11,
            'entry_point_location': 'checkout_terms',
            'acknowledged_timestamp': timezone.now().isoformat(),
            'acknowledged': True,
            'ip_address': '127.0.0.1',
            'user_agent': 'Test User Agent'
        },
        {
            'ack_key': 'tutorial_credit_card_v1',
            'message_id': 25,
            'entry_point_location': 'checkout_payment',
            'acknowledged_timestamp': timezone.now().isoformat(),
            'acknowledged': True,
            'ip_address': '127.0.0.1',
            'user_agent': 'Test User Agent'
        }
    ]

def test_acknowledgment_transfer(user, cart, order):
    """Test the acknowledgment transfer with the fixed logic"""
    print("\n=== Testing acknowledgment transfer ===")

    # Create Django request with session
    factory = RequestFactory()
    request = factory.post('/api/cart/checkout/')
    request.user = user

    # Add session middleware
    middleware = SessionMiddleware(lambda x: None)
    middleware.process_request(request)
    request.session.save()

    # Add session acknowledgments (simulating Order 179 scenario)
    session_acks = create_test_session_acknowledgments()
    request.session['user_acknowledgments'] = session_acks
    request.session.save()

    print(f"Session contains {len(session_acks)} acknowledgments:")
    for i, ack in enumerate(session_acks):
        print(f"  {i+1}. ack_key='{ack['ack_key']}', message_id={ack['message_id']}, entry_point='{ack['entry_point_location']}'")

    # Clear any existing acknowledgments for this order
    OrderUserAcknowledgment.objects.filter(order=order).delete()
    print(f"\nCleared existing acknowledgments for order {order.id}")

    # Test the fixed transfer method
    cart_viewset = CartViewSet()

    print(f"\n=== EXECUTING FIXED TRANSFER METHOD ===")
    cart_viewset._transfer_session_acknowledgments_to_order(request, order, cart)

    # Verify results
    created_acks = OrderUserAcknowledgment.objects.filter(order=order).order_by('id')
    print(f"\n=== RESULTS ===")
    print(f"Created {created_acks.count()} acknowledgment records (expected: 2)")

    if created_acks.count() == 2:
        print("[SUCCESS] Fixed! Now creating separate records for each acknowledgment")
        for i, ack in enumerate(created_acks):
            print(f"  Record {i+1}: ID={ack.id}, ack_key='{ack.acknowledgment_data.get('ack_key')}', message_id={ack.acknowledgment_data.get('message_id')}, type='{ack.acknowledgment_type}'")
            # Check that rules_engine_context only contains this specific acknowledgment
            if ack.rules_engine_context.get('original_acknowledgment'):
                orig_ack = ack.rules_engine_context['original_acknowledgment']
                print(f"    Original acknowledgment: ack_key='{orig_ack.get('ack_key')}', message_id={orig_ack.get('message_id')}'")
            else:
                print("    [ERROR] Missing original_acknowledgment in rules_engine_context")
    elif created_acks.count() == 1:
        print("[ERROR] STILL BROKEN: Only 1 record created instead of 2")
        ack = created_acks.first()
        print(f"  Only record: ID={ack.id}, ack_key='{ack.acknowledgment_data.get('ack_key')}', message_id={ack.acknowledgment_data.get('message_id')}")
        # Check if it still has combined session data
        if ack.rules_engine_context.get('original_session_data'):
            print(f"  [ERROR] Still storing combined session data with {len(ack.rules_engine_context['original_session_data'])} acknowledgments")
    else:
        print(f"[ERROR] UNEXPECTED: Created {created_acks.count()} records")

    return created_acks.count()

def main():
    print("TESTING ACKNOWLEDGMENT SEPARATION FIX")
    print("=====================================")
    print("This test verifies that the bug causing Order 179 to have only 1 acknowledgment")
    print("record instead of 2 separate records has been fixed.\n")

    try:
        # Setup test data
        user, cart, order = setup_test_data()

        # Test the fixed acknowledgment transfer
        record_count = test_acknowledgment_transfer(user, cart, order)

        print(f"\n=== FINAL VERIFICATION ===")
        if record_count == 2:
            print("[SUCCESS] FIX CONFIRMED: The acknowledgment separation bug has been resolved!")
            print("   Each acknowledgment now creates its own separate database record.")
            print("   The rules_engine_context no longer combines acknowledgments together.")
        else:
            print("[ERROR] FIX FAILED: The bug still exists. Need to investigate further.")

        return record_count == 2

    except Exception as e:
        print(f"[ERROR] TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)