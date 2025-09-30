#!/usr/bin/env python
"""
Complete checkout test with multiple acknowledgments
"""

import requests
import json

def complete_checkout_test():
    """Test complete checkout with multiple acknowledgments"""
    base_url = "http://127.0.0.1:8888"
    session = requests.Session()

    print("="*60)
    print("Complete Checkout Test with Multiple Acknowledgments")
    print("="*60)

    # Step 1: Create multiple acknowledgments
    print("\n[STEP 1] Creating acknowledgments...")

    # Terms acknowledgment
    terms_response = session.post(f"{base_url}/api/rules/acknowledge/", json={
        'entry_point_location': 'checkout_terms',
        'ackKey': 'terms_conditions_v1',
        'message_id': '11',
        'acknowledged': True
    })
    print(f"Terms acknowledgment: {terms_response.status_code}")

    # Tutorial credit card acknowledgment
    tutorial_response = session.post(f"{base_url}/api/rules/acknowledge/", json={
        'entry_point_location': 'checkout_payment',
        'ackKey': 'tutorial_credit_card_v1',
        'message_id': 'tutorial_credit_card_acknowledgment_v1',
        'acknowledged': True
    })
    print(f"Tutorial credit card acknowledgment: {tutorial_response.status_code}")

    # Digital consent acknowledgment
    digital_response = session.post(f"{base_url}/api/rules/acknowledge/", json={
        'entry_point_location': 'checkout_terms',
        'ackKey': 'digital_consent_v1',
        'message_id': 'digital_consent_message_v1',
        'acknowledged': True
    })
    print(f"Digital consent acknowledgment: {digital_response.status_code}")

    # Step 2: Try to create a cart and checkout
    print("\n[STEP 2] Creating cart and attempting checkout...")

    # We need to find an existing cart or create one
    # Let's try to get the cart endpoint to see what's available
    cart_response = session.get(f"{base_url}/api/cart/")
    print(f"Cart fetch response: {cart_response.status_code}")

    if cart_response.status_code == 200:
        cart_data = cart_response.json()
        print(f"Cart data: {json.dumps(cart_data, indent=2)}")

        if 'id' in cart_data:
            cart_id = cart_data['id']
            print(f"Found cart ID: {cart_id}")

            # Try checkout
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

            print(f"Attempting checkout for cart {cart_id}...")
            checkout_response = session.post(f"{base_url}/api/cart/checkout/",
                                           json=checkout_data)
            print(f"Checkout response: {checkout_response.status_code}")

            if checkout_response.status_code == 201:
                order_data = checkout_response.json()
                order_id = order_data.get('order', {}).get('id')
                print(f"Order created successfully! Order ID: {order_id}")
                return order_id
            else:
                print(f"Checkout failed: {checkout_response.text}")
        else:
            print("No cart ID found in response")
    else:
        print(f"Failed to fetch cart: {cart_response.text}")

    return None

if __name__ == '__main__':
    order_id = complete_checkout_test()
    if order_id:
        print(f"\n[SUCCESS] Created order {order_id} with multiple acknowledgments")
        print("Check the database for separate acknowledgment rows")
    else:
        print("\n[FAILED] Could not complete checkout")