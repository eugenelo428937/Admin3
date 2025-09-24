#!/usr/bin/env python
"""
Test the blocking validation functionality
"""

import os
import sys
import django
import requests
import json

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings')
django.setup()

def test_blocking_validation():
    """Test that blocking acknowledgments properly prevent checkout"""

    base_url = "http://127.0.0.1:8888"
    session = requests.Session()

    print("=" * 60)
    print("TESTING BLOCKING VALIDATION")
    print("=" * 60)

    # First, let's try to get a cart
    cart_response = session.get(f"{base_url}/api/cart/")
    print(f"Cart fetch response: {cart_response.status_code}")

    if cart_response.status_code != 200:
        print("No cart available, cannot test blocking validation")
        return

    cart_data = cart_response.json()
    if 'id' not in cart_data:
        print("No cart ID available")
        return

    cart_id = cart_data['id']
    print(f"Using cart ID: {cart_id}")

    # Test Case 1: Try checkout WITHOUT any acknowledgments (should be blocked)
    print("\n[TEST 1] Attempting checkout WITHOUT acknowledgments (should be blocked)...")

    checkout_data = {
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
    }

    checkout_response = session.post(f"{base_url}/api/cart/checkout/", json=checkout_data)
    print(f"Checkout response status: {checkout_response.status_code}")
    print(f"Response: {checkout_response.text}")

    if checkout_response.status_code == 400:
        response_data = checkout_response.json()
        if response_data.get('blocked'):
            print("✅ SUCCESS: Checkout was properly BLOCKED due to missing acknowledgments")
        else:
            print("❌ FAILED: Checkout returned 400 but not due to blocking")
    elif checkout_response.status_code == 201:
        print("❌ FAILED: Checkout succeeded when it should have been blocked!")
    else:
        print(f"❌ UNEXPECTED: Unexpected status code {checkout_response.status_code}")

    # Test Case 2: Add acknowledgments and try again (should succeed)
    print("\n[TEST 2] Adding acknowledgments and trying checkout again...")

    # Add terms acknowledgment
    terms_response = session.post(f"{base_url}/api/rules/acknowledge/", json={
        'entry_point_location': 'checkout_terms',
        'ackKey': 'terms_conditions_v1',
        'message_id': '11',
        'acknowledged': True
    })
    print(f"Terms acknowledgment: {terms_response.status_code}")

    # Add tutorial credit card acknowledgment
    tutorial_response = session.post(f"{base_url}/api/rules/acknowledge/", json={
        'entry_point_location': 'checkout_payment',
        'ackKey': 'tutorial_credit_card_v1',
        'message_id': 'tutorial_credit_card_acknowledgment_v1',
        'acknowledged': True
    })
    print(f"Tutorial acknowledgment: {tutorial_response.status_code}")

    # Now try checkout again
    checkout_response_2 = session.post(f"{base_url}/api/cart/checkout/", json=checkout_data)
    print(f"Checkout with acknowledgments status: {checkout_response_2.status_code}")

    if checkout_response_2.status_code == 201:
        print("✅ SUCCESS: Checkout succeeded with acknowledgments provided")
        order_data = checkout_response_2.json()
        order_id = order_data.get('order', {}).get('id')
        print(f"Order created: {order_id}")
    else:
        print(f"❌ FAILED: Checkout failed even with acknowledgments: {checkout_response_2.text}")

if __name__ == '__main__':
    test_blocking_validation()