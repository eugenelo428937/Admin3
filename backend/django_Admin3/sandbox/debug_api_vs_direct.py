"""
Debug script to compare API vs Direct rule engine execution
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

from rules_engine.services.rule_engine import RuleEngine, rule_engine

def debug_comparison():
    """Compare direct vs API execution"""
    
    # Test context
    context = {
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
    print("DEBUGGING: Direct vs API Rule Engine Execution")
    print("=" * 80)
    
    # Test 1: Direct with class instance
    print("\n1. DIRECT TEST: Using RuleEngine() class instance")
    direct_engine = RuleEngine()
    direct_result = direct_engine.execute("checkout_start", context)
    print(f"Rules evaluated: {direct_result.get('rules_evaluated')}")
    print(f"Messages count: {len(direct_result.get('messages', []))}")
    print(f"Success: {direct_result.get('success')}")
    print(f"Result keys: {list(direct_result.keys())}")
    
    # Test 2: Direct with global instance
    print("\n2. DIRECT TEST: Using global rule_engine instance")
    global_result = rule_engine.execute("checkout_start", context)
    print(f"Rules evaluated: {global_result.get('rules_evaluated')}")
    print(f"Messages count: {len(global_result.get('messages', []))}")
    print(f"Success: {global_result.get('success')}")
    print(f"Result keys: {list(global_result.keys())}")
    
    # Test 3: Import like views.py does
    print("\n3. DIRECT TEST: Using import like views.py")
    from rules_engine.services.rule_engine import rule_engine as new_rule_engine
    views_result = new_rule_engine.execute("checkout_start", context)
    print(f"Rules evaluated: {views_result.get('rules_evaluated')}")
    print(f"Messages count: {len(views_result.get('messages', []))}")
    print(f"Success: {views_result.get('success')}")
    print(f"Result keys: {list(views_result.keys())}")
    
    # Test 4: API call
    print("\n4. API TEST: Using /api/rules/engine/execute/")
    try:
        response = requests.post(
            'http://127.0.0.1:8888/api/rules/engine/execute/',
            json={"entryPoint": "checkout_start", "context": context},
            headers={'Content-Type': 'application/json'}
        )
        if response.status_code == 200:
            api_result = response.json()
            print(f"Rules evaluated: {api_result.get('rules_evaluated')}")
            print(f"Messages count: {len(api_result.get('messages', []))}")
            print(f"Success: {api_result.get('success')}")
            print(f"Result keys: {list(api_result.keys())}")
        else:
            print(f"API Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"API Request failed: {e}")
    
    print("\n" + "=" * 80)
    print("COMPARISON ANALYSIS:")
    print("=" * 80)
    
    # Compare all results
    all_results = [
        ("Direct Class Instance", direct_result),
        ("Global Instance", global_result), 
        ("Views Import", views_result),
    ]
    
    if 'api_result' in locals():
        all_results.append(("API", api_result))
    
    for name, result in all_results:
        print(f"{name:20}: rules_evaluated={result.get('rules_evaluated')}, "
              f"messages={len(result.get('messages', []))}, "
              f"success={result.get('success')}")
    
    # Debug: Check if engines are same instance
    print(f"\nEngine Identity Check:")
    print(f"rule_engine is new_rule_engine: {rule_engine is new_rule_engine}")
    print(f"direct_engine is rule_engine: {direct_engine is rule_engine}")
    print(f"Engine class: {type(rule_engine)}")

if __name__ == "__main__":
    debug_comparison()