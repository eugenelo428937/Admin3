"""
Comprehensive verification of the ASET rule fix
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

from rules_engine.services.rule_engine import rule_engine

def verify_fix():
    """Verify the ASET rule fix comprehensively"""
    
    print("=" * 80)
    print("ASET WARNING RULE FIX VERIFICATION")
    print("=" * 80)
    
    # Test context with ASET product ID 72
    context_aset_72 = {
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
    
    # Test context with ASET product ID 73
    context_aset_73 = {
        "cart": {
            "id": 2,
            "items": [
                {
                    "id": 2,
                    "product_id": 73,
                    "subject_code": "CS2",
                    "product_name": "CS2 ASET", 
                    "product_type": "Material",
                    "current_product": 73,
                    "quantity": 1,
                    "price_type": "standard",
                    "actual_price": "150.00",
                    "metadata": {"variationId": 2}
                }
            ]
        }
    }
    
    # Test context without ASET products
    context_no_aset = {
        "cart": {
            "id": 3,
            "items": [
                {
                    "id": 3,
                    "product_id": 100,
                    "subject_code": "CS1",
                    "product_name": "CS1 Study Guide",
                    "product_type": "Material", 
                    "current_product": 100,
                    "quantity": 1,
                    "price_type": "standard",
                    "actual_price": "75.00",
                    "metadata": {"variationId": 3}
                }
            ]
        }
    }
    
    print("\n1. DIRECT ENGINE TESTS (Should work):")
    print("-" * 50)
    
    # Test 1: ASET product 72
    result1 = rule_engine.execute("checkout_start", context_aset_72)
    print(f"ASET 72: Rules={result1.get('rules_evaluated')}, Messages={len(result1.get('messages', []))}, Success={result1.get('success')}")
    
    # Test 2: ASET product 73
    result2 = rule_engine.execute("checkout_start", context_aset_73) 
    print(f"ASET 73: Rules={result2.get('rules_evaluated')}, Messages={len(result2.get('messages', []))}, Success={result2.get('success')}")
    
    # Test 3: No ASET
    result3 = rule_engine.execute("checkout_start", context_no_aset)
    print(f"No ASET: Rules={result3.get('rules_evaluated')}, Messages={len(result3.get('messages', []))}, Success={result3.get('success')}")
    
    print("\n2. API CONTEXT SIMULATION (Testing the fix):")
    print("-" * 50)
    
    # Simulate what API does with corrected user.id
    def simulate_api_context(base_context):
        api_context = base_context.copy()
        api_context['user'] = {
            'id': 0,  # Fixed: integer instead of None
            'email': '',
            'is_authenticated': False
        }
        api_context['request'] = {
            'ip_address': '127.0.0.1',
            'user_agent': 'test-client',
            'timestamp': '2025-01-12T12:00:00Z'
        }
        return api_context
    
    # Test with API-simulated contexts
    api_context_72 = simulate_api_context(context_aset_72)
    api_result1 = rule_engine.execute("checkout_start", api_context_72)
    print(f"API ASET 72: Rules={api_result1.get('rules_evaluated')}, Messages={len(api_result1.get('messages', []))}, Success={api_result1.get('success')}")
    
    api_context_73 = simulate_api_context(context_aset_73)
    api_result2 = rule_engine.execute("checkout_start", api_context_73)
    print(f"API ASET 73: Rules={api_result2.get('rules_evaluated')}, Messages={len(api_result2.get('messages', []))}, Success={api_result2.get('success')}")
    
    api_context_no = simulate_api_context(context_no_aset)
    api_result3 = rule_engine.execute("checkout_start", api_context_no)
    print(f"API No ASET: Rules={api_result3.get('rules_evaluated')}, Messages={len(api_result3.get('messages', []))}, Success={api_result3.get('success')}")
    
    print("\n3. ACTUAL API TESTS (After server restart):")
    print("-" * 50)
    
    test_cases = [
        ("ASET 72", context_aset_72),
        ("ASET 73", context_aset_73), 
        ("No ASET", context_no_aset)
    ]
    
    for name, context in test_cases:
        try:
            response = requests.post(
                'http://127.0.0.1:8888/api/rules/engine/execute/',
                json={"entryPoint": "checkout_start", "context": context},
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            if response.status_code == 200:
                api_result = response.json()
                print(f"API {name}: Rules={api_result.get('rules_evaluated')}, Messages={len(api_result.get('messages', []))}, Success={api_result.get('success')}")
            else:
                print(f"API {name}: ERROR {response.status_code} - {response.text}")
        except Exception as e:
            print(f"API {name}: FAILED - {e}")
    
    print("\n" + "=" * 80)
    print("SUMMARY & EXPECTED RESULTS:")
    print("=" * 80)
    print("✓ Direct ASET 72/73: Rules=1, Messages=1 (ASET warning should trigger)")
    print("✓ Direct No ASET: Rules=0, Messages=0 (No warning)")
    print("✓ API should match direct results after server restart")
    print("\nIf API still shows Rules=0, restart the Django server to pick up views.py changes!")
    
    # Show the rule condition for reference
    try:
        from rules_engine.models import ActedRule
        rule = ActedRule.objects.get(rule_id='rule_aset_warning_v1')
        print(f"\nASET Rule Condition: {json.dumps(rule.condition, indent=2)}")
    except Exception as e:
        print(f"Could not fetch rule condition: {e}")

if __name__ == "__main__":
    verify_fix()