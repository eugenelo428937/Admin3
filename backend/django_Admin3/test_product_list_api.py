#!/usr/bin/env python
"""
Test the product_list_mount rule via the rules engine API
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.services.rule_engine import rule_engine
import json

def test_product_list_api():
    """Test the product_list_mount rule execution via API"""
    print("Testing product_list_mount rule execution via rules engine service...")

    # Create a simple context that matches the schema
    context = {
        "page": {
            "name": "product_list",
            "path": "/products"
        },
        "products": {
            "count": 0
        }
    }

    print(f"Context: {json.dumps(context, indent=2)}")

    # Execute the rules
    result = rule_engine.execute('product_list_mount', context)

    print(f"\nRules Engine Result:")
    print(f"  Success: {result.get('success', False)}")
    print(f"  Blocked: {result.get('blocked', False)}")
    print(f"  Rules Evaluated: {result.get('rules_evaluated', 0)}")
    print(f"  Execution Time: {result.get('execution_time_ms', 0):.2f}ms")

    if result.get('messages'):
        print(f"  Messages: {len(result['messages'])}")
        for i, message in enumerate(result['messages']):
            print(f"\n    Message {i + 1}:")
            print(f"      Type: {message.get('type', 'unknown')}")
            print(f"      Title: {message.get('title', message.get('content', {}).get('title', 'No title'))}")
            print(f"      Content: {message.get('content', {}).get('message', 'No content')[:100]}...")

    # Check if we got the expected delivery message
    if result.get('success') and result.get('messages'):
        delivery_message = None
        for msg in result['messages']:
            if 'delivery' in str(msg).lower():
                delivery_message = msg
                break

        if delivery_message:
            print(f"\nSUCCESS: Found delivery message!")
            print(f"Title: {delivery_message.get('title', delivery_message.get('content', {}).get('title', 'N/A'))}")
            return True
        else:
            print(f"\nERROR: No delivery message found in response")
            return False
    else:
        print(f"\nERROR: API call failed or no messages returned")
        if 'error' in result:
            print(f"Error: {result['error']}")
        return False

if __name__ == '__main__':
    try:
        success = test_product_list_api()
        if success:
            print(f"\nTDD GREEN Phase: API test passed!")
        else:
            print(f"\nTDD RED Phase: API test failed - implementation needs work")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()