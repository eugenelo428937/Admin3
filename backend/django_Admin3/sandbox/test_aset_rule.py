"""
Test script for ASET warning rule execution
"""
import json
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.services.rule_engine import RuleEngine

def test_aset_rule():
    """Test the ASET warning rule with sample context"""
    
    rule_engine = RuleEngine()
    
    # Test case 1: Cart with ASET product (ID 72)
    print("=" * 60)
    print("TEST 1: Cart with ASET product (ID 72)")
    print("=" * 60)
    
    context_with_aset = {
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
    
    result = rule_engine.execute("checkout_start", context_with_aset)
    print(f"\nResult: {json.dumps(result, indent=2)}")
    
    # Test case 2: Cart without ASET product
    print("\n" + "=" * 60)
    print("TEST 2: Cart without ASET product")
    print("=" * 60)
    
    context_without_aset = {
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
        }
    }
    
    result = rule_engine.execute("checkout_start", context_without_aset)
    print(f"\nResult: {json.dumps(result, indent=2)}")
    
    # Test case 3: Cart with ASET product (ID 73)
    print("\n" + "=" * 60)
    print("TEST 3: Cart with ASET product (ID 73)")
    print("=" * 60)
    
    context_with_aset_73 = {
        "cart": {
            "id": 3,
            "items": [
                {
                    "id": 3,
                    "product_id": 73,
                    "subject_code": "CS2",
                    "product_name": "CS2 ASET",
                    "product_type": "Material",
                    "current_product": 73,
                    "quantity": 1,
                    "price_type": "standard",
                    "actual_price": "150.00",
                    "metadata": {"variationId": 3}
                }
            ]
        }
    }
    
    result = rule_engine.execute("checkout_start", context_with_aset_73)
    print(f"\nResult: {json.dumps(result, indent=2)}")

if __name__ == "__main__":
    test_aset_rule()