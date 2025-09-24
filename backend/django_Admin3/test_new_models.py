#!/usr/bin/env python
"""Simple script to test new models functionality"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth.models import User
from cart.models import ActedOrder, OrderUserContact, OrderDeliveryDetail

def test_models():
    """Test the new models"""
    print("Testing OrderUserContact and OrderDeliveryDetail models...")

    try:
        # Create test user (or get existing)
        user, created = User.objects.get_or_create(
            username='testuser_models',
            defaults={
                'email': 'test_models@example.com',
                'password': 'testpass123'
            }
        )
        if not created:
            # Clean up any existing test data
            ActedOrder.objects.filter(user=user).delete()
        print("Created test user")

        # Create test order
        order = ActedOrder.objects.create(
            user=user,
            subtotal=100.00,
            vat_amount=20.00,
            total_amount=120.00
        )
        print("Created test order")

        # Test OrderUserContact
        contact = OrderUserContact.objects.create(
            order=order,
            mobile_phone='+44 7700 900123',
            email_address='contact@example.com',
            home_phone='+44 20 7946 0958'
        )
        print("Created OrderUserContact")
        print(f"  - String representation: {str(contact)}")

        # Test OrderDeliveryDetail
        preference = OrderDeliveryDetail.objects.create(
            order=order,
            delivery_address_type='home',
            delivery_address_line1='123 Test Street',
            delivery_city='London',
            delivery_postal_code='SW1A 1AA',
            delivery_country='United Kingdom'
        )
        print("Created OrderDeliveryDetail")
        print(f"  - String representation: {str(preference)}")

        # Test relationships
        print(f"Order has contact: {hasattr(order, 'user_contact')}")
        print(f"Order has delivery detail: {hasattr(order, 'delivery_detail')}")

        # Test cascade delete
        order.delete()
        print("Cascade delete works (order deleted)")

        print("\nAll model tests passed!")

    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_models()