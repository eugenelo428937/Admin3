#!/usr/bin/env python
"""
Test acknowledgment flow fix
"""

import requests
import json

def test_acknowledgment_flow():
    """Test the complete acknowledgment flow"""
    base_url = "http://127.0.0.1:8888"
    session = requests.Session()

    print("="*60)
    print("TESTING ACKNOWLEDGMENT FLOW FIX")
    print("="*60)

    # Step 1: Submit terms acknowledgment
    print("\n[STEP 1] Submitting terms acknowledgment...")
    terms_ack = {
        "ackKey": "terms_conditions_v1",
        "message_id": 11,
        "acknowledged": True,
        "entry_point_location": "checkout_terms"
    }

    terms_response = session.post(f"{base_url}/api/rules/acknowledge/", json=terms_ack)
    print(f"Terms acknowledgment status: {terms_response.status_code}")
    if terms_response.status_code != 200:
        print(f"Terms error: {terms_response.text}")

    # Step 2: Submit tutorial credit card acknowledgment
    print("\n[STEP 2] Submitting tutorial credit card acknowledgment...")
    tutorial_ack = {
        "ackKey": "tutorial_credit_card_v1",
        "message_id": "tutorial_credit_card_acknowledgment_v1",
        "acknowledged": True,
        "entry_point_location": "checkout_payment"
    }

    tutorial_response = session.post(f"{base_url}/api/rules/acknowledge/", json=tutorial_ack)
    print(f"Tutorial acknowledgment status: {tutorial_response.status_code}")
    if tutorial_response.status_code != 200:
        print(f"Tutorial error: {tutorial_response.text}")

    # Step 3: Test comprehensive validation with context
    print("\n[STEP 3] Testing comprehensive validation...")
    validation_data = {
        "context": {
            "cart": {
                "id": 360,
                "has_tutorial": True,
                "has_digital": True,
                "items": [],
                "total": 100.0
            },
            "payment": {
                "method": "credit_card",
                "is_card": True
            }
        }
    }

    validation_response = session.post(
        f"{base_url}/api/rules/validate-comprehensive-checkout/",
        json=validation_data
    )

    print(f"Validation status: {validation_response.status_code}")
    if validation_response.status_code == 200:
        result = validation_response.json()
        print(f"Blocked: {result.get('blocked')}")
        print(f"Can proceed: {result.get('can_proceed')}")
        print(f"Total required: {result.get('summary', {}).get('total_required')}")
        print(f"Total satisfied: {result.get('summary', {}).get('total_satisfied')}")
        print(f"Total missing: {result.get('summary', {}).get('total_missing')}")

        if result.get('blocked'):
            print("❌ STILL BLOCKED - Something is wrong")
            missing = result.get('missing_acknowledgments', [])
            for missing_ack in missing:
                print(f"  Missing: {missing_ack.get('ackKey')} from {missing_ack.get('entry_point')}")
        else:
            print("✅ SUCCESS - Not blocked, acknowledgments working!")

    else:
        print(f"Validation error: {validation_response.text}")

    print("\n" + "="*60)

if __name__ == '__main__':
    test_acknowledgment_flow()