#!/usr/bin/env python
"""
Test script to verify the registration serializer with JSON address functionality
"""
import os
import sys
import json

# Add Django project to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend', 'django_Admin3'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')

import django
django.setup()

from django.contrib.auth.models import User
from users.serializers import UserRegistrationSerializer

def test_registration_with_json_addresses():
    """Test registration with JSON address data"""
    print("Testing registration with JSON address functionality...")
    
    # Clean up any existing test user
    User.objects.filter(username='jsontest@example.com').delete()
    
    # Test data with different country formats
    test_cases = [
        {
            'name': 'UK Address',
            'data': {
                'username': 'jsontest@example.com',
                'email': 'jsontest@example.com',
                'password': 'testpass123',
                'first_name': 'JSON',
                'last_name': 'Test',
                'profile': {
                    'title': 'Mr',
                    'send_invoices_to': 'HOME',
                    'send_study_material_to': 'HOME',
                    'home_address': {
                        'address': '123 Baker Street',
                        'city': 'London',
                        'postal_code': 'NW1 6XE',
                        'country': 'United Kingdom'
                    },
                    'work_address': {
                        'company': 'Test Company Ltd',
                        'department': 'Engineering',
                        'address': '456 Regent Street',
                        'city': 'London',
                        'postal_code': 'W1B 2QD',
                        'country': 'United Kingdom'
                    },
                    'home_phone': '+44 20 7946 0958',
                    'mobile_phone': '+44 7700 900123'
                }
            }
        },
        {
            'name': 'US Address',
            'data': {
                'username': 'ustest@example.com',
                'email': 'ustest@example.com',
                'password': 'testpass123',
                'first_name': 'US',
                'last_name': 'Test',
                'profile': {
                    'title': 'Ms',
                    'send_invoices_to': 'WORK',
                    'send_study_material_to': 'HOME',
                    'home_address': {
                        'address': '123 Main Street',
                        'city': 'New York',
                        'state': 'NY',
                        'postal_code': '10001',
                        'country': 'United States'
                    },
                    'work_address': {
                        'company': 'Tech Corp Inc',
                        'department': 'Software',
                        'address': '789 Broadway',
                        'city': 'New York',
                        'state': 'NY',
                        'postal_code': '10003',
                        'country': 'United States'
                    },
                    'home_phone': '+1 212 555 0123',
                    'mobile_phone': '+1 917 555 0456'
                }
            }
        },
        {
            'name': 'Hong Kong Address',
            'data': {
                'username': 'hktest@example.com',
                'email': 'hktest@example.com',
                'password': 'testpass123',
                'first_name': 'HK',
                'last_name': 'Test',
                'profile': {
                    'title': 'Dr',
                    'send_invoices_to': 'HOME',
                    'send_study_material_to': 'HOME',
                    'home_address': {
                        'address': 'Flat A, 12/F, Happy Building',
                        'city': 'Central',
                        'state': 'Hong Kong Island',
                        'country': 'Hong Kong'
                    },
                    'home_phone': '+852 2123 4567',
                    'mobile_phone': '+852 9876 5432'
                }
            }
        }
    ]
    
    for test_case in test_cases:
        try:
            print(f"\n[TEST] {test_case['name']}:")
            
            # Clean up existing user
            User.objects.filter(username=test_case['data']['username']).delete()
            
            # Test serializer
            serializer = UserRegistrationSerializer(data=test_case['data'])
            
            if serializer.is_valid():
                user = serializer.save()
                print(f"[OK] User created: {user.username}")
                
                # Check profile
                profile = user.userprofile
                print(f"[OK] Profile created: {profile.title}")
                
                # Check addresses
                home_address = profile.addresses.filter(address_type='HOME').first()
                if home_address:
                    print(f"[OK] Home address JSON: {home_address.address_data}")
                    print(f"[OK] Home formatted: {home_address.get_formatted_address()}")
                else:
                    print("[WARNING] No home address found")
                
                work_address = profile.addresses.filter(address_type='WORK').first()
                if work_address:
                    print(f"[OK] Work address JSON: {work_address.address_data}")
                    print(f"[OK] Work formatted: {work_address.get_formatted_address()}")
                else:
                    print("[INFO] No work address (expected for HK test)")
                
                # Check contact numbers
                contacts = profile.contact_numbers.all()
                print(f"[OK] Contact numbers: {[f'{c.contact_type}: {c.number}' for c in contacts]}")
                
                # Clean up
                user.delete()
                print(f"[OK] Cleaned up {user.username}")
                
            else:
                print(f"[ERROR] Serializer validation failed: {serializer.errors}")
                
        except Exception as e:
            print(f"[ERROR] Test failed: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n[OK] All registration tests completed!")

if __name__ == '__main__':
    test_registration_with_json_addresses()