#!/usr/bin/env python
"""
End-to-end test for UK import tax warning
Tests the complete flow: user profile with non-UK address -> rules engine -> modal display
"""
import os
import sys
import django
import json

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from userprofile.models import UserProfile
from userprofile.models.address import UserProfileAddress
from cart.models import Cart
from rules_engine.services.rule_engine import RuleEngine

User = get_user_model()

def test_import_tax_warning():
    """Test the complete UK import tax warning flow"""
    print("=" * 60)
    print("UK IMPORT TAX WARNING - END TO END TEST")
    print("=" * 60)
    
    # 1. Setup test user with non-UK address
    print("\n1. Setting up test user with non-UK address...")
    user = User.objects.filter(email='testcart_user@example.com').first()
    if not user:
        print("  ERROR: Test user not found")
        return False
        
    print(f"  User: {user.email}")
    
    # Get user profile and addresses
    try:
        profile = UserProfile.objects.get(user=user)
        home_address = UserProfileAddress.objects.filter(
            user_profile=profile, 
            address_type='HOME'
        ).first()
        work_address = UserProfileAddress.objects.filter(
            user_profile=profile,
            address_type='WORK'
        ).first()
        
        print(f"  Home country: {home_address.country if home_address else 'Not set'}")
        print(f"  Work country: {work_address.country if work_address else 'Not set'}")
        
        # Check if addresses are non-UK
        home_is_uk = home_address and home_address.country in ['United Kingdom', 'UK', 'GB']
        work_is_uk = work_address and work_address.country in ['United Kingdom', 'UK', 'GB']
        
        if home_is_uk and work_is_uk:
            print("  WARNING: Both addresses are UK - rule won't trigger")
        
    except UserProfile.DoesNotExist:
        print("  ERROR: User profile not found")
        return False
    
    # 2. Create user context as frontend would
    print("\n2. Creating user context (as frontend would)...")
    user_context = {
        'id': user.id,
        'email': user.email,
        'is_authenticated': True,
        'ip': '192.168.1.100',  # Non-UK IP
        'home_country': home_address.country if home_address else None,
        'work_country': work_address.country if work_address else None
    }
    print(f"  User context: {json.dumps(user_context, indent=2)}")
    
    # 3. Create cart context
    print("\n3. Creating cart context...")
    cart = Cart.objects.filter(user=user).first()
    if not cart:
        cart = Cart.objects.create(user=user)
        print(f"  Created new cart: {cart.id}")
    else:
        print(f"  Using existing cart: {cart.id}")
    
    cart_context = {
        'id': cart.id,
        'items': [],
        'total': 100.00,
        'user': user.id
    }
    
    # 4. Execute rules engine
    print("\n4. Executing rules engine...")
    context = {
        'cart': cart_context,
        'user': user_context
    }
    
    rule_engine = RuleEngine()
    result = rule_engine.execute('checkout_start', context)
    
    print(f"  Success: {result['success']}")
    print(f"  Rules evaluated: {result['rules_evaluated']}")
    print(f"  Messages: {len(result.get('messages', []))}")
    
    # 5. Check for import tax warning
    print("\n5. Checking for import tax warning...")
    messages = result.get('messages', [])
    import_tax_message = None
    
    for msg in messages:
        if 'import_tax' in str(msg).lower() or 'import tax' in str(msg).lower():
            import_tax_message = msg
            break
    
    if import_tax_message:
        print("  Import tax warning found!")
        print(f"  Display type: {import_tax_message.get('display_type', 'unknown')}")
        print(f"  Title: {import_tax_message.get('content', {}).get('title', 'N/A')}")
        
        # Check if it's a modal
        if import_tax_message.get('display_type') == 'modal':
            print("  Displayed as modal (correct)")
        else:
            print("  Not displayed as modal (incorrect)")
    else:
        print("  No import tax warning found")
        print(f"  Messages received: {json.dumps(messages, indent=2)}")
    
    # 6. Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    success = import_tax_message is not None and import_tax_message.get('display_type') == 'modal'
    
    if success:
        print("Test PASSED: UK import tax warning working correctly")
        print("  - User has non-UK address")
        print("  - Rules engine triggers correctly")
        print("  - Warning displayed as modal")
    else:
        print("Test FAILED: Issues found")
        if not import_tax_message:
            print("  - Import tax warning not triggered")
        elif import_tax_message.get('display_type') != 'modal':
            print("  - Warning not displayed as modal")
    
    return success

if __name__ == "__main__":
    success = test_import_tax_warning()
    sys.exit(0 if success else 1)
