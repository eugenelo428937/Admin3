#!/usr/bin/env python
"""
Simple test for UK import tax warning functionality
"""
import os
import sys
import django
import json

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.services.rule_engine import rule_engine

def test_import_tax_rule():
    """Test import tax rule with different contexts"""
    
    print("="*50)
    print("UK IMPORT TAX RULE TEST")
    print("="*50)
    
    # Test 1: Non-UK user (should trigger warning)
    context_non_uk = {
        "cart": {
            "id": 1,
            "items": [{
                "id": 1, 
                "product_id": 100, 
                "current_product": 100,
                "product_type": "Material",
                "quantity": 1, 
                "price_type": "standard",
                "actual_price": "75.00", 
                "metadata": {"variationId": 1}
            }]
        },
        "user": {
            "id": 1,
            "email": "test@example.com",
            "is_authenticated": True,
            "ip": "192.168.1.1",
            "home_country": "Germany",
            "work_country": "France"
        }
    }
    
    print("Test 1: Non-UK user (Germany home, France work)")
    result1 = rule_engine.execute("checkout_start", context_non_uk)
    print(f"Rules: {result1.get('rules_evaluated', 0)}")
    print(f"Messages: {len(result1.get('messages', []))}")
    print(f"Success: {result1.get('success')}")
    if result1.get('messages'):
        msg = result1['messages'][0]
        print(f"Message type: {msg.get('display_type', 'alert')}")
        print(f"Contains import tax: {'import tax' in msg.get('content', {}).get('message', '').lower()}")
        print(f"Full message: {json.dumps(msg, indent=2)}")
    
    print()
    
    # Test 2: UK user (should NOT trigger warning)
    context_uk = {
        "cart": {
            "id": 2,
            "items": [{
                "id": 2, 
                "product_id": 100, 
                "current_product": 100,
                "product_type": "Material",
                "quantity": 1, 
                "price_type": "standard",
                "actual_price": "75.00", 
                "metadata": {"variationId": 2}
            }]
        },
        "user": {
            "id": 2,
            "email": "uk@example.com",
            "is_authenticated": True,
            "ip": "192.168.1.2",
            "home_country": "United Kingdom",
            "work_country": "United Kingdom"
        }
    }
    
    print("Test 2: UK user (United Kingdom addresses)")
    result2 = rule_engine.execute("checkout_start", context_uk)
    print(f"Rules: {result2.get('rules_evaluated', 0)}")
    print(f"Messages: {len(result2.get('messages', []))}")
    print(f"Success: {result2.get('success')}")
    
    print()
    
    # Test 3: Unauthenticated (should NOT trigger)
    context_unauth = {
        "cart": {
            "id": 3,
            "items": [{
                "id": 3, 
                "product_id": 100, 
                "current_product": 100,
                "product_type": "Material",
                "quantity": 1, 
                "price_type": "standard",
                "actual_price": "75.00", 
                "metadata": {"variationId": 3}
            }]
        },
        "user": {
            "id": 0,
            "email": "",
            "is_authenticated": False,
            "ip": "192.168.1.3",
            "home_country": None,
            "work_country": None
        }
    }
    
    print("Test 3: Unauthenticated user")
    result3 = rule_engine.execute("checkout_start", context_unauth)
    print(f"Rules: {result3.get('rules_evaluated', 0)}")
    print(f"Messages: {len(result3.get('messages', []))}")
    print(f"Success: {result3.get('success')}")
    
    print()
    print("="*50)
    print("EXPECTED RESULTS:")
    print("Non-UK user: 1 rule, 1 message (modal with import tax)")
    print("UK user: 0 rules, 0 messages")
    print("Unauthenticated: 0 rules, 0 messages")
    
    # Check if results match expectations
    success = (
        result1.get('rules_evaluated', 0) == 1 and
        len(result1.get('messages', [])) == 1 and
        'import tax' in result1['messages'][0].get('content', {}).get('message', '').lower() and
        result1['messages'][0].get('display_type') == 'modal' and
        result2.get('rules_evaluated', 0) == 0 and
        len(result2.get('messages', [])) == 0 and
        result3.get('rules_evaluated', 0) == 0 and
        len(result3.get('messages', [])) == 0
    )
    
    print("\nOVERALL RESULT:", "SUCCESS" if success else "FAILED")
    return success

if __name__ == "__main__":
    test_import_tax_rule()