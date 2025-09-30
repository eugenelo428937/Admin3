#!/usr/bin/env python
"""
Test that each acknowledgment is stored as a separate row in the database.
This tests the fix to ensure tutorial_credit_card acknowledgments are stored
independently from terms & conditions and other acknowledgments.
"""

import os
import sys
import django
import json
from datetime import datetime
from decimal import Decimal

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from django.contrib.sessions.middleware import SessionMiddleware
from django.utils import timezone
from cart.models import Cart, CartItem
from orders.models import Order, OrderUserAcknowledgment
from tutorials.models import TutorialEvent
from products.models import Product, ProductVariation
from accounts.models import AppUser

def setup_test_data():
    """Create test user, cart and tutorial products"""
    # Create test user
    User = get_user_model()
    user = User.objects.create_user(
        username='test_ack_user',
        email='test_ack@example.com',
        password='testpass123'
    )

    # Create app user profile
    app_user = AppUser.objects.create(
        user=user,
        first_name='Test',
        last_name='User'
    )

    # Create a tutorial product with credit card payment
    product = Product.objects.create(
        product_name='Test Tutorial Product',
        product_type='TUTORIALS',
        price=Decimal('100.00'),
        active=True
    )

    variation = ProductVariation.objects.create(
        product=product,
        variation_name='Standard',
        variation_type='tutorial_type',
        price=Decimal('100.00'),
        active=True
    )

    # Create tutorial event
    tutorial_event = TutorialEvent.objects.create(
        title='Test Tutorial',
        payment_methods='credit_card',
        price=Decimal('100.00'),
        start_date=timezone.now(),
        end_date=timezone.now()
    )

    # Create cart with tutorial item
    cart = Cart.objects.create(
        user=user,
        payment_method='credit_card'
    )

    cart_item = CartItem.objects.create(
        cart=cart,
        product=product,
        product_variation=variation,
        quantity=1,
        price=Decimal('100.00')
    )

    return user, cart

def simulate_acknowledgments(client, cart):
    """Simulate multiple acknowledgments during checkout"""
    print("\n[TEST] Simulating multiple acknowledgments during checkout...")

    # 1. Acknowledge terms and conditions at checkout_terms
    print("[STEP 1] Acknowledging terms and conditions...")
    response = client.post('/api/rules/engine/acknowledge/', {
        'entryPoint': 'checkout_terms',
        'ackKey': 'terms_v3_eu',
        'messageId': 'terms_conditions_v3',
        'acknowledged': True
    }, content_type='application/json')
    print(f"  Terms acknowledgment response: {response.status_code}")

    # 2. Acknowledge digital consent at checkout_terms
    print("[STEP 2] Acknowledging digital consent...")
    response = client.post('/api/rules/engine/acknowledge/', {
        'entryPoint': 'checkout_terms',
        'ackKey': 'digital_consent_v1',
        'messageId': 'digital_consent_message_v1',
        'acknowledged': True
    }, content_type='application/json')
    print(f"  Digital consent acknowledgment response: {response.status_code}")

    # 3. Acknowledge tutorial credit card at checkout_payment
    print("[STEP 3] Acknowledging tutorial credit card payment...")
    response = client.post('/api/rules/engine/acknowledge/', {
        'entryPoint': 'checkout_payment',
        'ackKey': 'tutorial_credit_card_v1',
        'messageId': 'tutorial_credit_card_acknowledgment_v1',
        'acknowledged': True
    }, content_type='application/json')
    print(f"  Tutorial credit card acknowledgment response: {response.status_code}")

    # Check session acknowledgments
    session = client.session
    session_acks = session.get('user_acknowledgments', [])
    print(f"\n[CHECK] Session has {len(session_acks)} acknowledgments:")
    for ack in session_acks:
        print(f"  - {ack.get('ack_key')} at {ack.get('entry_point_location')}")

def check_order_acknowledgments(order_id):
    """Check that acknowledgments are stored as separate rows"""
    print(f"\n[TEST] Checking order acknowledgments for order {order_id}...")

    acknowledgments = OrderUserAcknowledgment.objects.filter(order_id=order_id)
    print(f"  Found {acknowledgments.count()} acknowledgment rows")

    # Check each acknowledgment
    for ack in acknowledgments:
        print(f"\n  Row {ack.id}:")
        print(f"    - Type: {ack.acknowledgment_type}")
        print(f"    - Rule ID: {ack.rule_id}")
        print(f"    - Title: {ack.title}")
        print(f"    - Template: {ack.template_id}")
        print(f"    - Summary: {ack.content_summary}")

        # Check acknowledgment data
        if ack.acknowledgment_data:
            ack_key = ack.acknowledgment_data.get('ack_key')
            entry_point = ack.acknowledgment_data.get('entry_point')
            print(f"    - Ack Key: {ack_key}")
            print(f"    - Entry Point: {entry_point}")

    # Verify we have separate rows for each acknowledgment type
    ack_types = acknowledgments.values_list('acknowledgment_type', flat=True)
    unique_types = set(ack_types)

    print(f"\n[VALIDATION] Acknowledgment types found: {list(unique_types)}")

    # Check for specific acknowledgments
    has_terms = acknowledgments.filter(acknowledgment_type='terms_conditions').exists()
    has_digital = acknowledgments.filter(acknowledgment_type='digital_consent').exists()
    has_tutorial = acknowledgments.filter(acknowledgment_type='product_specific').exists()

    print("\n[RESULTS]")
    print(f"  Terms & Conditions row exists: {'[PASS]' if has_terms else '[FAIL]'}")
    print(f"  Digital Consent row exists: {'[PASS]' if has_digital else '[FAIL]'}")
    print(f"  Tutorial Credit Card row exists: {'[PASS]' if has_tutorial else '[FAIL]'}")

    # Check that each has a unique rule_id
    rule_ids = acknowledgments.values_list('rule_id', flat=True)
    print(f"\n  Unique rule IDs: {len(set(rule_ids))} (should be {acknowledgments.count()})")
    if len(set(rule_ids)) == acknowledgments.count():
        print("  [PASS] Each acknowledgment has a unique rule_id")
    else:
        print("  [FAIL] Some acknowledgments share the same rule_id")

    return acknowledgments.count() >= 3  # We expect at least 3 separate rows

def test_complete_checkout(client, cart):
    """Complete the checkout process"""
    print("\n[TEST] Completing checkout to transfer acknowledgments...")

    # Complete checkout
    response = client.post(f'/api/cart/{cart.id}/checkout/', {
        'payment_method': 'credit_card',
        'billing_address': {
            'first_name': 'Test',
            'last_name': 'User',
            'email': 'test@example.com',
            'phone': '1234567890',
            'address_line_1': '123 Test St',
            'city': 'Test City',
            'postal_code': '12345',
            'country': 'US'
        }
    }, content_type='application/json')

    if response.status_code == 201:
        order_data = response.json()
        order_id = order_data.get('order', {}).get('id')
        print(f"  [SUCCESS] Order created with ID: {order_id}")
        return order_id
    else:
        print(f"  [ERROR] Checkout failed: {response.status_code}")
        if response.content:
            print(f"  Response: {response.json()}")
        return None

def main():
    print("="*60)
    print("Testing Separate Acknowledgment Storage")
    print("="*60)

    try:
        # Clean up previous test data
        User = get_user_model()
        User.objects.filter(username='test_ack_user').delete()

        # Setup test data
        user, cart = setup_test_data()
        print(f"[SETUP] Created test user and cart {cart.id}")

        # Create client and login
        client = Client()
        client.login(username='test_ack_user', password='testpass123')

        # Initialize session
        middleware = SessionMiddleware(lambda x: None)
        request = type('Request', (), {'META': {}})()
        middleware.process_request(request)
        request.session.save()
        client.session = request.session

        # Simulate acknowledgments
        simulate_acknowledgments(client, cart)

        # Complete checkout
        order_id = test_complete_checkout(client, cart)

        if order_id:
            # Check that acknowledgments are stored separately
            success = check_order_acknowledgments(order_id)

            print("\n" + "="*60)
            if success:
                print("[FINAL RESULT] [PASS] Each acknowledgment stored as separate row")
            else:
                print("[FINAL RESULT] [FAIL] Acknowledgments not properly separated")
            print("="*60)
        else:
            print("\n[FINAL RESULT] [FAIL] Could not complete checkout")

    except Exception as e:
        print(f"\n[ERROR] Test failed with exception: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        # Cleanup
        try:
            User.objects.filter(username='test_ack_user').delete()
            print("\n[CLEANUP] Test data cleaned up")
        except:
            pass

if __name__ == '__main__':
    main()