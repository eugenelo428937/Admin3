#!/usr/bin/env python
"""
Test multiple acknowledgments being created and stored
"""

import os
import django
import requests
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings')
django.setup()

def simulate_multiple_acknowledgments():
    """
    Simulate a user going through checkout with multiple acknowledgments:
    1. Terms & Conditions acknowledgment
    2. Tutorial Credit Card acknowledgment
    """

    base_url = "http://127.0.0.1:8888"

    # Create a session
    session = requests.Session()

    print("="*60)
    print("Testing Multiple Acknowledgments During Checkout")
    print("="*60)

    # Step 1: Acknowledge terms & conditions
    print("\n[STEP 1] Acknowledging Terms & Conditions...")
    terms_response = session.post(f"{base_url}/api/rules/acknowledge/",
        json={
            'entry_point_location': 'checkout_terms',
            'ackKey': 'terms_conditions_v1',
            'message_id': '11',  # Use the message template ID from database
            'acknowledged': True
        }
    )
    print(f"Terms acknowledgment response: {terms_response.status_code}")
    if terms_response.status_code != 200:
        print(f"Error: {terms_response.text}")
        return

    # Step 2: Acknowledge tutorial credit card
    print("\n[STEP 2] Acknowledging Tutorial Credit Card...")
    tutorial_response = session.post(f"{base_url}/api/rules/acknowledge/",
        json={
            'entry_point_location': 'checkout_payment',
            'ackKey': 'tutorial_credit_card_v1',
            'message_id': 'tutorial_credit_card_acknowledgment_v1',
            'acknowledged': True
        }
    )
    print(f"Tutorial credit card acknowledgment response: {tutorial_response.status_code}")
    if tutorial_response.status_code != 200:
        print(f"Error: {tutorial_response.text}")

    # Step 3: Check what's in the session
    print("\n[STEP 3] Checking session acknowledgments...")

    # We need to check this via the Django shell since we can't directly access the session
    # Let's check by attempting a rules engine execution to see what acknowledgments are available

    rules_response = session.post(f"{base_url}/api/rules/engine/execute/",
        json={
            'entryPoint': 'checkout_payment',
            'context': {
                'user': {'id': 'test_user', 'region': 'US'},
                'cart': {'payment_method': 'credit_card', 'total': 100.0}
            }
        }
    )

    print(f"Rules execution response: {rules_response.status_code}")
    if rules_response.status_code == 200:
        rules_data = rules_response.json()
        print(f"Rules execution results: {json.dumps(rules_data, indent=2)}")
    else:
        print(f"Rules execution error: {rules_response.text}")

    print("\n[SUMMARY]")
    print("- Created terms & conditions acknowledgment")
    print("- Created tutorial credit card acknowledgment")
    print("- Both should be stored in session and transferred to order during checkout")
    print("\nNext: Try to complete a real checkout to see if separate rows are created")

if __name__ == '__main__':
    simulate_multiple_acknowledgments()