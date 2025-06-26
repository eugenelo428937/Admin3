#!/usr/bin/env python
"""
Test script to verify password reset completion email functionality.
"""
import os
import sys
import django
from django.conf import settings

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.utils import timezone
from utils.email_service import email_service
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_password_reset_completion():
    """Test the complete password reset completion email functionality."""
    
    print("🧪 Testing Password Reset Completion Email Functionality")
    print("=" * 60)
    
    try:
        # Create or get a test user
        test_email = "test.user@example.com"
        
        # Try to get existing user or create new one
        try:
            user = User.objects.get(email=test_email)
            print(f"✅ Using existing test user: {user.username}")
        except User.DoesNotExist:
            user = User.objects.create_user(
                username=test_email,
                email=test_email,
                password='oldpassword123',
                first_name='Test',
                last_name='User'
            )
            print(f"✅ Created new test user: {user.username}")
        
        # Test 1: Send password reset completion email directly
        print("\n🔹 Test 1: Direct email service call")
        
        completion_data = {
            'user': user,
            'reset_timestamp': timezone.now()
        }
        
        # Test immediate send (not queued)
        success = email_service.send_password_reset_completed(
            user_email=user.email,
            completion_data=completion_data,
            use_mjml=True,
            enhance_outlook=True,
            use_queue=False,  # Send immediately for testing
            user=user
        )
        
        if success:
            print("✅ Password reset completion email sent successfully (immediate)")
        else:
            print("❌ Failed to send password reset completion email (immediate)")
        
        # Test 2: Test queued email
        print("\n🔹 Test 2: Queued email service call")
        
        success_queued = email_service.send_password_reset_completed(
            user_email=user.email,
            completion_data=completion_data,
            use_mjml=True,
            enhance_outlook=True,
            use_queue=True,  # Queue for processing
            user=user
        )
        
        if success_queued:
            print("✅ Password reset completion email queued successfully")
        else:
            print("❌ Failed to queue password reset completion email")
        
        # Test 3: Check template configuration
        print("\n🔹 Test 3: Template configuration check")
        
        from utils.models import EmailTemplate
        
        try:
            template = EmailTemplate.objects.get(name='password_reset_completed', is_active=True)
            print(f"✅ Template found: {template.display_name}")
            print(f"   - Use master template: {template.use_master_template}")
            print(f"   - Enable queue: {template.enable_queue}")
            print(f"   - Content template: {template.content_template_name}")
            print(f"   - Priority: {template.default_priority}")
        except EmailTemplate.DoesNotExist:
            print("❌ Password reset completion template not found in database")
            return False
        
        # Test 4: Template file existence
        print("\n🔹 Test 4: Template file existence")
        
        import os
        from django.conf import settings
        
        content_template_path = os.path.join(
            settings.BASE_DIR, 
            'utils', 
            'templates', 
            'emails', 
            'mjml', 
            'password_reset_completed_content.mjml'
        )
        
        if os.path.exists(content_template_path):
            print(f"✅ Content template file exists: password_reset_completed_content.mjml")
        else:
            print(f"❌ Content template file missing: {content_template_path}")
            return False
        
        master_template_path = os.path.join(
            settings.BASE_DIR, 
            'utils', 
            'templates', 
            'emails', 
            'mjml', 
            'master_template.mjml'
        )
        
        if os.path.exists(master_template_path):
            print(f"✅ Master template file exists: master_template.mjml")
        else:
            print(f"❌ Master template file missing: {master_template_path}")
            return False
        
        # Test 5: Process any queued emails
        print("\n🔹 Test 5: Processing email queue")
        
        from utils.services.queue_service import EmailQueueService
        queue_service = EmailQueueService()
        
        results = queue_service.process_pending_queue(limit=10)
        print(f"✅ Queue processing results:")
        print(f"   - Processed: {results['processed']}")
        print(f"   - Successful: {results['successful']}")
        print(f"   - Failed: {results['failed']}")
        
        if results['errors']:
            print(f"   - Errors: {results['errors']}")
        
        print("\n" + "=" * 60)
        print("🎉 Password Reset Completion Email Test Complete!")
        
        overall_success = success and success_queued and results['failed'] == 0
        
        if overall_success:
            print("✅ All tests passed - Password reset completion email is working correctly!")
        else:
            print("⚠️  Some tests had issues - Please check the logs above")
        
        return overall_success
        
    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")
        logger.exception("Test failed")
        return False

if __name__ == "__main__":
    test_password_reset_completion() 