#!/usr/bin/env python
"""
Test cart user context functionality
"""
import os
import sys
import django
import json
import requests

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from userprofile.models import UserProfile
from userprofile.models.address import UserProfileAddress
from cart.models import Cart

User = get_user_model()

def create_test_user_with_cart():
    """Create test user with addresses and cart"""
    print("Setting up test user with cart and addresses...")
    
    # Create user
    user, created = User.objects.get_or_create(
        username='testcart_user@example.com',
        email='testcart_user@example.com',
        defaults={
            'first_name': 'Cart',
            'last_name': 'Test',
            'is_active': True
        }
    )
    
    if created:
        user.set_password('testpass123')
        user.save()
        print(f"Created user: {user.email}")
    else:
        print(f"Using existing user: {user.email}")
    
    # Create user profile
    profile, profile_created = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            'title': 'Ms',
            'send_invoices_to': 'HOME',
            'send_study_material_to': 'HOME'
        }
    )
    
    # Create home address in Germany
    home_address, home_created = UserProfileAddress.objects.get_or_create(
        user_profile=profile,
        address_type='HOME',
        defaults={
            'country': 'Germany',
            'address_data': {
                'street': 'Hauptstrasse 123',
                'city': 'Berlin',
                'postal_code': '10115'
            }
        }
    )
    
    # Create work address in France
    work_address, work_created = UserProfileAddress.objects.get_or_create(
        user_profile=profile,
        address_type='WORK',
        defaults={
            'country': 'France',
            'address_data': {
                'street': '123 Rue de Paris',
                'city': 'Lyon',
                'postal_code': '69000'
            },
            'company': 'Test Company France'
        }
    )
    
    print(f"Home address: {home_address.country}")
    print(f"Work address: {work_address.country}")
    
    # Create user cart
    cart, cart_created = Cart.objects.get_or_create(user=user)
    print(f"Cart {'created' if cart_created else 'exists'}: ID {cart.id}")
    
    return user, cart

def test_cart_user_context():
    """Test that cart API includes user context"""
    print("="*60)
    print("CART USER CONTEXT TEST")
    print("="*60)
    
    # Create test user
    user, cart = create_test_user_with_cart()
    
    # Test the cart API endpoint directly
    print("\n1. Testing cart API endpoint:")
    print("-" * 40)
    
    try:
        # Test unauthenticated request
        response = requests.get('http://127.0.0.1:8888/api/cart/', timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"Unauthenticated cart response:")
            print(f"  Has user_context: {'user_context' in data}")
            if 'user_context' in data:
                user_ctx = data['user_context']
                print(f"  is_authenticated: {user_ctx.get('is_authenticated', 'N/A')}")
                print(f"  home_country: {user_ctx.get('home_country', 'N/A')}")
                print(f"  work_country: {user_ctx.get('work_country', 'N/A')}")
                print(f"  ip: {user_ctx.get('ip', 'N/A')[:15]}...")
        else:
            print(f"Error: {response.status_code} - {response.text}")
    
    except Exception as e:
        print(f"Error testing cart API: {e}")
    
    print("\n2. Testing with Django ORM (simulating authenticated request):")
    print("-" * 40)
    
    # Test the cart list method directly
    from cart.views import CartViewSet
    from django.http import HttpRequest
    from django.contrib.auth.models import AnonymousUser
    
    # Create mock request
    request = HttpRequest()
    request.user = user
    request.META = {'REMOTE_ADDR': '192.168.1.100'}
    
    # Call the cart view
    cart_view = CartViewSet()
    response = cart_view.list(request)
    
    if response.status_code == 200:
        data = response.data
        print(f"Authenticated cart response:")
        print(f"  Cart ID: {data.get('id')}")
        print(f"  Has user_context: {'user_context' in data}")
        
        if 'user_context' in data:
            user_ctx = data['user_context']
            print(f"  User ID: {user_ctx.get('id')}")
            print(f"  Email: {user_ctx.get('email')}")
            print(f"  is_authenticated: {user_ctx.get('is_authenticated')}")
            print(f"  home_country: {user_ctx.get('home_country')}")
            print(f"  work_country: {user_ctx.get('work_country')}")
            print(f"  ip: {user_ctx.get('ip')}")
            
            # Check if context is correct
            context_valid = (
                user_ctx.get('is_authenticated') == True and
                user_ctx.get('home_country') == 'Germany' and
                user_ctx.get('work_country') == 'France' and
                user_ctx.get('id') == user.id
            )
            
            print(f"\n  Context validation: {'PASS' if context_valid else 'FAIL'}")
            
            if context_valid:
                print("\n3. Testing rules engine with cart context:")
                print("-" * 40)
                
                # Test context that would be sent to rules engine
                test_context = {
                    "cart": {
                        "id": data['id'],
                        "items": data.get('items', [])
                    },
                    "user": user_ctx
                }
                
                # Test with rules engine
                from rules_engine.services.rule_engine import rule_engine
                rules_result = rule_engine.execute("checkout_start", test_context)
                
                print(f"  Rules evaluated: {rules_result.get('rules_evaluated', 0)}")
                print(f"  Messages: {len(rules_result.get('messages', []))}")
                print(f"  Success: {rules_result.get('success', False)}")
                
                if rules_result.get('messages'):
                    for i, msg in enumerate(rules_result['messages']):
                        display_type = msg.get('display_type', 'alert')
                        has_import_tax = 'import tax' in msg.get('content', {}).get('message', '').lower()
                        print(f"  Message {i+1}: {display_type}, import_tax={has_import_tax}")
                
                # Check expected result
                expected_result = (
                    rules_result.get('rules_evaluated', 0) == 1 and
                    len(rules_result.get('messages', [])) == 1 and
                    'import tax' in rules_result['messages'][0].get('content', {}).get('message', '').lower()
                )
                
                print(f"\n  Rules test: {'PASS' if expected_result else 'FAIL'}")
                
                overall_success = context_valid and expected_result
                print(f"\nOVERALL RESULT: {'SUCCESS' if overall_success else 'FAILED'}")
                return overall_success
            else:
                print(f"\nOVERALL RESULT: FAILED (Invalid context)")
                return False
        else:
            print(f"\nOVERALL RESULT: FAILED (No user_context in response)")
            return False
    else:
        print(f"Error: {response.status_code}")
        return False

if __name__ == "__main__":
    test_cart_user_context()