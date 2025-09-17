#!/usr/bin/env python
"""
Script to create the email_verification template in the database.
"""
import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from utils.models import EmailTemplate
from django.contrib.auth.models import User

def create_email_verification_template():
    """Create the email_verification template in the database."""
    
    # Get admin user
    admin_user = User.objects.filter(is_superuser=True).first()
    
    # Create email_verification template
    template, created = EmailTemplate.objects.get_or_create(
        name='email_verification',
        defaults={
            'template_type': 'email_verification',
            'display_name': 'Email Verification', 
            'description': 'Email sent to verify new email addresses when users update their profile',
            'subject_template': 'Verify Your New Email Address - ActEd',
            'content_template_name': 'email_verification_content',
            'use_master_template': True,
            'default_priority': 'high',
            'enable_tracking': True,
            'enable_queue': True,
            'max_retry_attempts': 3,
            'retry_delay_minutes': 5,
            'enhance_outlook_compatibility': True,
            'is_active': True,
            'created_by': admin_user
        }
    )
    
    print(f'Email verification template: {"Created" if created else "Already exists"} - {template.display_name}')
    return template

if __name__ == '__main__':
    create_email_verification_template() 