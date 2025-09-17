"""
Debug script to trace API context processing
"""
import json
import os
import sys
import django
import requests

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

def debug_api_context():
    """Debug what context the API actually receives"""
    
    # Test context - exact same as working direct test
    test_context = {
        "cart": {
            "id": 1,
            "items": [
                {
                    "id": 1,
                    "product_id": 72,
                    "subject_code": "CM1",
                    "product_name": "CM1 ASET",
                    "product_type": "Material",
                    "current_product": 72,
                    "quantity": 1,
                    "price_type": "standard",
                    "actual_price": "150.00",
                    "metadata": {"variationId": 1}
                }
            ]
        }
    }
    
    print("=" * 80)
    print("DEBUGGING: API Context Processing")
    print("=" * 80)
    
    print("\n1. ORIGINAL CONTEXT:")
    print(json.dumps(test_context, indent=2))
    
    # Simulate what views.py does to the context
    print("\n2. SIMULATING API PROCESSING:")
    
    # Simulate authenticated user (from lines 99-104 in views.py)
    context_data = test_context.copy()
    context_data['user'] = {
        'id': None,
        'email': None,
        'is_authenticated': False
    }
    
    # Simulate request metadata (from lines 112-117 in views.py)
    context_data['request'] = {
        'ip_address': '127.0.0.1',
        'user_agent': 'curl/7.68.0',
        'timestamp': '2025-01-12T12:00:00Z'
    }
    
    print("MODIFIED CONTEXT:")
    print(json.dumps(context_data, indent=2))
    
    # Test direct execution with modified context
    print("\n3. DIRECT TEST WITH API-MODIFIED CONTEXT:")
    from rules_engine.services.rule_engine import rule_engine
    result = rule_engine.execute("checkout_start", context_data)
    print(f"Rules evaluated: {result.get('rules_evaluated')}")
    print(f"Messages count: {len(result.get('messages', []))}")
    print(f"Success: {result.get('success')}")
    
    # Now make actual API call to compare
    print("\n4. ACTUAL API CALL:")
    try:
        response = requests.post(
            'http://127.0.0.1:8888/api/rules/engine/execute/',
            json={"entryPoint": "checkout_start", "context": test_context},
            headers={'Content-Type': 'application/json'}
        )
        if response.status_code == 200:
            api_result = response.json()
            print(f"API Rules evaluated: {api_result.get('rules_evaluated')}")
            print(f"API Messages count: {len(api_result.get('messages', []))}")
            print(f"API Success: {api_result.get('success')}")
        else:
            print(f"API Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"API Request failed: {e}")

if __name__ == "__main__":
    debug_api_context()