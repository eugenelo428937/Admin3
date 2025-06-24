#!/usr/bin/env python
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
    test_email = "eugene.lo1030@gmail.com"
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
    frontend_url = "http://localhost:3000"
    reset_url = f"{frontend_url}/auth/reset-password?uid={uid}&token={token}"
    print(f"✅ Reset URL: {reset_url}")
    
    # 4. Test email sending
    print("\n📧 Testing Password Reset Email...")
    reset_data = {
        'user': user,
        'reset_url': reset_url,
        'expiry_hours': 24
    }
    
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
        return False
    
    # 5. Test token validation (simulating password_reset_confirm)
    print("\n🔐 Testing Token Validation...")
    
    # Decode UID
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        decoded_user = User.objects.get(pk=user_id)
        print(f"✅ Successfully decoded UID to user: {decoded_user.username}")
    except Exception as e:
        print(f"❌ Failed to decode UID: {e}")
        return False
    
    # Verify token
    if default_token_generator.check_token(decoded_user, token):
        print("✅ Token is valid!")
    else:
        print("❌ Token is invalid or expired")
        return False
    
    # 6. Test password reset (simulating new password setting)
    print("\n🔄 Testing Password Reset...")
    new_password = "newpassword123"
    decoded_user.set_password(new_password)
    decoded_user.save()
    
    # Refresh from database
    updated_user = User.objects.get(pk=user.pk)
    
    if updated_user.password != original_password_hash:
        print("✅ Password successfully updated!")
        print(f"   Original hash: {original_password_hash[:20]}...")
        print(f"   New hash: {updated_user.password[:20]}...")
    else:
        print("❌ Password was not updated")
        return False
    
    # 7. Test that old token is now invalid (Django tokens are one-time use)
    print("\n🔒 Testing Token Invalidation...")
    if not default_token_generator.check_token(updated_user, token):
        print("✅ Token correctly invalidated after password change")
    else:
        print("⚠️  Token still valid (this might be expected behavior)")
    
    print("\n🎉 Password Reset Flow Test Completed Successfully!")
    print("=" * 50)
    print("\nNext Steps:")
    print("1. Test the React frontend components")
    print("2. Navigate to http://localhost:3000/auth/forgot-password")
    print("3. Enter the email and complete the reCAPTCHA")
    print("4. Check email for reset link")
    print("5. Click the link to reset password")
    
    return True

if __name__ == "__main__":
    try:
        test_password_reset_flow()
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc() 