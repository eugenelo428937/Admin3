#!/usr/bin/env python
"""
Debug cart API user_context issue
"""
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework.test import APIClient

User = get_user_model()

def test_cart_api():
    """Test cart API with authenticated user"""
    print("=" * 60)
    print("CART API DEBUG TEST")
    print("=" * 60)
    
    # Create API client
    client = APIClient()

    # Try to get an existing user
    user = User.objects.filter(email='testcart_user@example.com').first()
    if not user:
        print("Test user not found")
        return
    
    print(f"Using test user: {user.email}")
    
    # Test authenticated request
    client.force_authenticate(user=user)
    response = client.get('/api/cart/')
    
    print(f"\nResponse status: {response.status_code}")
    print(f"Response data keys: {list(response.json().keys())}")
    
    response_data = response.json()
    
    print(f"\nHas user_context: {'user_context' in response_data}")
    
    if 'user_context' in response_data:
        user_ctx = response_data['user_context']
        print(f"User context keys: {list(user_ctx.keys())}")
        print(f"is_authenticated: {user_ctx.get('is_authenticated')}")
        print(f"home_country: {user_ctx.get('home_country')}")
        print(f"work_country: {user_ctx.get('work_country')}")
        print(f"ip: {user_ctx.get('ip')}")
    else:
        print("No user_context in response")
        print(f"Full response: {response_data}")

if __name__ == "__main__":
    test_cart_api()