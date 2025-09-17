#!/usr/bin/env python
"""
Test script for UK import tax warning rule execution
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

def test_uk_import_tax_rule():
    """Test UK import tax warning rule with various user contexts"""
    
    print("=" * 80)
    print("UK IMPORT TAX WARNING RULE EXECUTION TEST")
    print("=" * 80)
    
    # Test case 1: Non-UK user (Germany/France) - should trigger warning
    print("\n1. Test Case: Non-UK user (Germany home, France work)")
    print("-" * 60)
    
    context_non_uk = {
        "cart": {
            "id": 1,
            "items": [
                {
                    "id": 1,
                    "product_id": 100,
                    "subject_code": "CS1",
                    "product_name": "CS1 Study Guide",
                    "product_type": "Material",
                    "current_product": 100,
                    "quantity": 1,
                    "price_type": "standard",
                    "actual_price": "75.00",
                    "metadata": {"variationId": 1}
                }
            ]
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
    
    result1 = rule_engine.execute("checkout_start", context_non_uk)
    print(f"Non-UK User: Rules={result1.get('rules_evaluated', 0)}, Messages={len(result1.get('messages', []))}, Success={result1.get('success')}")
    
    if result1.get('messages'):
        for msg in result1['messages']:
            print(f"  Message: {msg.get('content', {}).get('message', 'No message')}")
    
    # Test case 2: UK user - should NOT trigger warning
    print("\n2. Test Case: UK user (United Kingdom addresses)")
    print("-" * 60)
    
    context_uk = {
        "cart": {
            "id": 2,
            "items": [
                {
                    "id": 2,
                    "product_id": 100,
                    "subject_code": "CS1",
                    "product_name": "CS1 Study Guide",
                    "product_type": "Material",
                    "current_product": 100,
                    "quantity": 1,
                    "price_type": "standard",
                    "actual_price": "75.00",
                    "metadata": {"variationId": 2}
                }
            ]
        },
        "user": {
            "id": 2,
            "email": "ukuser@example.com",
            "is_authenticated": True,
            "ip": "192.168.1.2",
            "home_country": "United Kingdom",
            "work_country": "United Kingdom"
        }
    }
    
    result2 = rule_engine.execute("checkout_start", context_uk)
    print(f"UK User: Rules={result2.get('rules_evaluated', 0)}, Messages={len(result2.get('messages', []))}, Success={result2.get('success')}")
    
    if result2.get('messages'):
        for msg in result2['messages']:
            print(f"  Message: {msg.get('content', {}).get('message', 'No message')}")
    
    # Test case 3: Mixed addresses (UK home, non-UK work) - should NOT trigger
    print("\n3. Test Case: Mixed addresses (UK home, Germany work)")
    print("-" * 60)
    
    context_mixed = {
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
        },
        "user": {
            "id": 3,
            "email": "mixeduser@example.com",
            "is_authenticated": True,
            "ip": "192.168.1.3",
            "home_country": "United Kingdom",
            "work_country": "Germany"
        }
    }
    
    result3 = rule_engine.execute("checkout_start", context_mixed)
    print(f"Mixed User: Rules={result3.get('rules_evaluated', 0)}, Messages={len(result3.get('messages', []))}, Success={result3.get('success')}")
    
    if result3.get('messages'):
        for msg in result3['messages']:
            print(f"  Message: {msg.get('content', {}).get('message', 'No message')}")
    
    # Test case 4: Unauthenticated user - should NOT trigger
    print("\n4. Test Case: Unauthenticated user")
    print("-" * 60)
    
    context_unauth = {
        "cart": {
            "id": 4,
            "items": [
                {
                    "id": 4,
                    "product_id": 100,
                    "subject_code": "CS1",
                    "product_name": "CS1 Study Guide",
                    "product_type": "Material",
                    "current_product": 100,
                    "quantity": 1,
                    "price_type": "standard",
                    "actual_price": "75.00",
                    "metadata": {"variationId": 4}
                }
            ]
        },
        "user": {
            "id": 0,
            "email": "",
            "is_authenticated": False,
            "ip": "192.168.1.4",
            "home_country": None,
            "work_country": None
        }
    }
    
    result4 = rule_engine.execute("checkout_start", context_unauth)
    print(f"Unauth User: Rules={result4.get('rules_evaluated', 0)}, Messages={len(result4.get('messages', []))}, Success={result4.get('success')}")
    
    if result4.get('messages'):
        for msg in result4['messages']:
            print(f"  Message: {msg.get('content', {}).get('message', 'No message')}")
    
    print("\n" + "=" * 80)
    print("EXPECTED RESULTS:")
    print("=" * 80)
    print("✓ Non-UK User (Germany/France): Should show import tax warning (Rules=1, Messages=1)")
    print("✓ UK User: Should not show warning (Rules=0, Messages=0)")
    print("✓ Mixed User (UK home): Should not show warning (Rules=0, Messages=0)")
    print("✓ Unauthenticated User: Should not show warning (Rules=0, Messages=0)")
    print("\n✓ Only fully non-UK users should see the import tax warning modal")

if __name__ == "__main__":
    test_uk_import_tax_rule()