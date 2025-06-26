#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test script for password reset functionality
"""
import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings')
django.setup()

from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from utils.email_service import email_service

def test_password_reset_flow():
    """Test the complete password reset flow"""
    
    print("🔐 Testing Password Reset Flow")
    print("=" * 50)
    
    # 1. Create or get a test user
    test_email = "test@example.com"
    try:
        user = User.objects.get(email=test_email)
        print(f"✅ Found existing user: {user.username} ({user.email})")
    except User.DoesNotExist:
        user = User.objects.create_user(
            username="test_reset_user",
            email=test_email,
            password="oldpassword123"
        )
        print(f"✅ Created test user: {user.username} ({user.email})")
    
    # Store original password hash for verification
    original_password_hash = user.password
    
    # 2. Generate reset token (simulating password_reset_request)
    print("\n📧 Generating Password Reset Token...")
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    
    print(f"✅ Generated UID: {uid}")
    print(f"✅ Generated Token: {token[:20]}... (truncated)")
    
    # 3. Create reset URL
    frontend_url = "http://127.0.0.1:3000"
    reset_url = f"{frontend_url}/auth/reset-password?uid={uid}&token={token}"
    print(f"✅ Reset URL: {reset_url}")
    
    # 4. Test email sending
    print("\n📧 Testing Password Reset Email...")
    reset_data = {
        'user': user,
        'reset_url': reset_url,
        'expiry_hours': 24
    }
    
    try:
        success = email_service.send_password_reset(
            user_email=user.email,
            reset_data=reset_data,
            use_mjml=True,
            enhance_outlook=True,
            use_queue=False,  # Send immediately for testing
            user=user
        )
        
        if success:
            print("✅ Password reset email sent successfully!")
        else:
            print("❌ Failed to send password reset email")
            
    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")
    
    # 5. Test token validation and password reset
    print("\n🔑 Testing Token Validation and Password Reset...")
    
    # Verify token is valid
    if default_token_generator.check_token(user, token):
        print("✅ Token is valid")
        
        # Reset password (simulating password_reset_confirm)
        new_password = "newpassword456"
        user.set_password(new_password)
        user.save()
        
        # Verify password was changed
        user.refresh_from_db()
        if user.password != original_password_hash:
            print("✅ Password successfully reset!")
            print(f"✅ Original hash: {original_password_hash[:20]}...")
            print(f"✅ New hash: {user.password[:20]}...")
            
            # Test login with new password
            from django.contrib.auth import authenticate
            auth_user = authenticate(username=user.username, password=new_password)
            if auth_user:
                print("✅ Login with new password successful!")
            else:
                print("❌ Login with new password failed")
        else:
            print("❌ Password was not changed")
    else:
        print("❌ Token is invalid")
    
    # 6. Test token expiry (token should be invalid after password reset)
    print("\n⏰ Testing Token Expiry...")
    if not default_token_generator.check_token(user, token):
        print("✅ Token correctly invalidated after password reset")
    else:
        print("❌ Token still valid after password reset (security issue)")
    
    print("\n" + "=" * 50)
    print("🔐 Password Reset Flow Test Complete!")

if __name__ == "__main__":
    test_password_reset_flow() 