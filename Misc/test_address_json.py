#!/usr/bin/env python
"""
Test script to verify the JSON address functionality
"""
import os
import sys

# Add Django project to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend', 'django_Admin3'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')

import django
django.setup()

from django.contrib.auth.models import User
from userprofile.models import UserProfile, UserProfileAddress

def test_address_json():
    """Test creating address with JSON data"""
    print("Testing JSON address functionality...")
    
    # Clean up any existing test user
    User.objects.filter(username='testuser@example.com').delete()
    
    # Create test user
    try:
        user = User.objects.create_user(
            username='testuser@example.com',
            email='testuser@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        print(f"[OK] Created test user: {user.username}")
        
        # Get the automatically created user profile
        profile = user.userprofile
        profile.title = 'Mr'
        profile.send_invoices_to = 'HOME'
        profile.send_study_material_to = 'HOME'
        profile.save()
        print(f"[OK] Updated user profile for: {user.username}")
        
        # Test different country address formats
        test_addresses = [
            {
                'country': 'United Kingdom',
                'address_data': {
                    'address': '123 High Street',
                    'city': 'London',
                    'postal_code': 'SW1A 1AA',
                    'country': 'United Kingdom'
                }
            },
            {
                'country': 'United States',
                'address_data': {
                    'address': '456 Main Street',
                    'city': 'New York',
                    'state': 'NY',
                    'postal_code': '10001',
                    'country': 'United States'
                }
            },
            {
                'country': 'Hong Kong',
                'address_data': {
                    'address': 'Flat A, 12/F, ABC Building',
                    'city': 'Central',
                    'state': 'Hong Kong Island',
                    'country': 'Hong Kong'
                }
            }
        ]
        
        for i, addr_test in enumerate(test_addresses):
            address = UserProfileAddress.objects.create(
                user_profile=profile,
                address_type='HOME' if i == 0 else 'WORK',
                address_data=addr_test['address_data'],
                country=addr_test['country']
            )
            print(f"[OK] Created {addr_test['country']} address:")
            print(f"  JSON data: {address.address_data}")
            print(f"  Formatted: {address.get_formatted_address()}")
            print(f"  Postal code: {address.postal_code}")
            print(f"  City: {address.city}")
            print()
        
        print("[OK] All address tests passed!")
        
        # Clean up
        user.delete()
        print("[OK] Cleaned up test data")
        
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_address_json()