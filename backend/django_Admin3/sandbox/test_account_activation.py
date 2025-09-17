#!/usr/bin/env python
"""
Test script for account activation functionality
"""
import os
import sys
import django
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.models import User

# Add the project root directory to the Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings')
django.setup()

def test_account_activation():
    """Test account activation token generation and verification"""
    
    print("=== Account Activation Test ===")
    
    # Create a test user (inactive)
    test_email = "test_activation@example.com"
    
    # Check if user already exists and delete if necessary
    try:
        existing_user = User.objects.get(email=test_email)
        existing_user.delete()
        print(f"Deleted existing test user: {test_email}")
    except User.DoesNotExist:
        pass
    
    # Create new inactive user
    user = User.objects.create(
        username=test_email,
        email=test_email,
        first_name="Test",
        last_name="User",
        is_active=False  # Important: User starts inactive
    )
    user.set_password("testpassword123")
    user.save()
    
    print(f"✓ Created inactive user: {user.email} (ID: {user.id}, is_active: {user.is_active})")
    
    # Generate activation token
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    
    print(f"✓ Generated activation token: {token}")
    print(f"✓ Generated UID: {uid}")
    
    # Create activation URL (like in the email)
    activation_url = f"http://127.0.0.1:3000/auth/activate?uid={uid}&token={token}"
    print(f"✓ Activation URL: {activation_url}")
    
    # Test token verification (simulates what happens when user clicks link)
    try:
        # Decode user ID
        user_id = force_str(urlsafe_base64_decode(uid))
        retrieved_user = User.objects.get(pk=user_id)
        
        print(f"✓ Successfully decoded UID to user ID: {user_id}")
        print(f"✓ Retrieved user: {retrieved_user.email}")
        
        # Verify token
        if default_token_generator.check_token(retrieved_user, token):
            print("✓ Token verification: VALID")
            
            # Simulate activation
            if not retrieved_user.is_active:
                retrieved_user.is_active = True
                retrieved_user.save()
                print("✓ Account activated successfully!")
                print(f"✓ User is_active status: {retrieved_user.is_active}")
            else:
                print("ℹ Account was already active")
                
        else:
            print("✗ Token verification: INVALID")
            
    except Exception as e:
        print(f"✗ Token verification failed: {str(e)}")
    
    # Test API endpoint format
    print("\n=== API Test Data ===")
    print("POST /api/auth/activate/")
    print("Request body:")
    print(f"{{")
    print(f'  "uid": "{uid}",')
    print(f'  "token": "{token}"')
    print(f"}}")
    
    # Clean up
    user.delete()
    print(f"\n✓ Cleaned up test user: {test_email}")
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    test_account_activation() 