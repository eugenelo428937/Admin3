#!/usr/bin/env python3
"""
Test script for API-level acknowledgment blocking
Tests the complete flow: rules execution → acknowledgment → rules execution with blocking
"""
import os
import sys
import django
import json

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.test import Client
from django.contrib.auth.models import AnonymousUser

def test_api_blocking_flow():
    """Test the complete API flow for acknowledgment blocking."""

    print("=== Testing API Acknowledgment Blocking Flow ===\n")

    # Create test client
    client = Client()

    # Step 1: Execute rules without acknowledgment (should block)
    print("Step 1: Execute checkout_payment rules (NO acknowledgment) - SHOULD BLOCK")

    request_data = {
        "entry_point": "checkout_payment",
        "context": {
            "cart": {
                "has_tutorial": True,
                "has_material": False,
                "has_marking": False,
                "items": [{"product_type": "tutorial"}]
            },
            "payment": {
                "method": "card",
                "is_card": True
            }
        }
    }

    # Execute rules
    response = client.post('/api/rules/engine/execute/', request_data, content_type='application/json')
    result1 = response.json()

    print(f"[OK] Status Code: {response.status_code}")
    print(f"[OK] Blocked: {result1.get('blocked', False)}")
    print(f"[OK] Required acknowledgments: {len(result1.get('required_acknowledgments', []))}")
    print(f"[OK] Messages: {len(result1.get('messages', []))}")

    # Find acknowledgment message
    ack_message = None
    for msg in result1.get('messages', []):
        if msg.get('type') == 'acknowledge':
            ack_message = msg
            break

    if ack_message:
        ack_key = ack_message.get('ack_key')
        template_id = ack_message.get('template_id')
        print(f"[OK] Found acknowledgment: ack_key={ack_key}, template_id={template_id}")
    else:
        print("[ERROR] No acknowledgment message found!")
        return

    print()

    # Step 2: Send acknowledgment via API
    print("Step 2: Send acknowledgment via API")

    ack_data = {
        "ackKey": ack_key,
        "message_id": template_id,
        "acknowledged": True,
        "entry_point_location": "checkout_payment"
    }

    ack_response = client.post('/api/rules/acknowledge/', ack_data, content_type='application/json')
    ack_result = ack_response.json()

    print(f"[OK] Acknowledgment Status: {ack_response.status_code}")
    print(f"[OK] Acknowledgment Success: {ack_result.get('success', False)}")
    print(f"[OK] Total session acknowledgments: {ack_result.get('total_acknowledgments', 0)}")
    print()

    # Step 3: Execute rules again with acknowledgment (should NOT block)
    print("Step 3: Execute checkout_payment rules (WITH acknowledgment) - SHOULD NOT BLOCK")

    response2 = client.post('/api/rules/engine/execute/', request_data, content_type='application/json')
    result2 = response2.json()

    print(f"[OK] Status Code: {response2.status_code}")
    print(f"[OK] Blocked: {result2.get('blocked', False)}")
    print(f"[OK] Required acknowledgments: {len(result2.get('required_acknowledgments', []))}")
    print(f"[OK] Satisfied acknowledgments: {result2.get('satisfied_acknowledgments', [])}")
    print(f"[OK] Messages: {len(result2.get('messages', []))}")
    print()

    # Test Summary
    print("=== Test Summary ===")
    print("Step 1: Execute without acknowledgment")
    print(f"  Result: {'[PASS]' if result1.get('blocked') else '[FAIL]'} - Should block")

    print("Step 2: Send acknowledgment")
    print(f"  Result: {'[PASS]' if ack_result.get('success') else '[FAIL]'} - Should succeed")

    print("Step 3: Execute with acknowledgment")
    print(f"  Result: {'[PASS]' if not result2.get('blocked') else '[FAIL]'} - Should NOT block")

    # Overall result
    all_passed = (
        result1.get('blocked') and
        ack_result.get('success') and
        not result2.get('blocked')
    )
    print(f"\nOverall: {'[PASS]' if all_passed else '[FAIL]'} - Complete flow working")

if __name__ == '__main__':
    test_api_blocking_flow()