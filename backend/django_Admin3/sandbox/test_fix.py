"""
Test the fix for user.id validation
"""
import json
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from rules_engine.services.rule_engine import rule_engine

def test_fix():
    """Test direct execution with corrected context"""
    
    # Original working context
    original_context = {
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
    
    # Fixed context with correct user.id
    fixed_context = original_context.copy()
    fixed_context['user'] = {
        'id': 0,  # Integer instead of None
        'email': '',
        'is_authenticated': False
    }
    fixed_context['request'] = {
        'ip_address': '127.0.0.1',
        'user_agent': 'curl/7.68.0',
        'timestamp': '2025-01-12T12:00:00Z'
    }
    
    print("=" * 80)
    print("TESTING FIX: user.id as integer instead of null")
    print("=" * 80)
    
    print("\n1. ORIGINAL CONTEXT (working):")
    result1 = rule_engine.execute("checkout_start", original_context)
    print(f"Rules evaluated: {result1.get('rules_evaluated')}")
    print(f"Messages count: {len(result1.get('messages', []))}")
    print(f"Success: {result1.get('success')}")
    
    print("\n2. FIXED CONTEXT (user.id = 0):")
    result2 = rule_engine.execute("checkout_start", fixed_context)
    print(f"Rules evaluated: {result2.get('rules_evaluated')}")
    print(f"Messages count: {len(result2.get('messages', []))}")
    print(f"Success: {result2.get('success')}")
    
    if result2.get('rules_evaluated') == 1:
        print("✅ FIX SUCCESSFUL!")
    else:
        print("❌ FIX FAILED!")
        print(f"Full result: {json.dumps(result2, indent=2)}")

if __name__ == "__main__":
    test_fix()