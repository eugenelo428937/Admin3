#!/usr/bin/env python
"""Test script to verify checkout order models are saved properly"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth.models import User
from cart.models import ActedOrder, OrderUserContact, OrderDeliveryDetail
from cart.views import CartViewSet

def test_checkout_order_models():
    """Test that checkout process saves data to new models"""
    print("Testing checkout order models...")

    try:
        # Create test user
        user, created = User.objects.get_or_create(
            username='testuser_checkout',
            defaults={
                'email': 'test_checkout@example.com',
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

        # Create cart viewset instance to test the methods
        cart_viewset = CartViewSet()

        # Test contact data extraction - simulate "For this order only" data
        user_preferences_contact = {
            'contact': {
                'home_phone': '+44 20 7946 0958',
                'mobile_phone': '+44 7700 900123',
                'work_phone': '+44 20 7946 0900',
                'email_address': 'test_order_contact@example.com'
            }
        }

        print("\\nTesting contact data extraction...")
        cart_viewset._extract_and_save_contact_data(order, user_preferences_contact)

        # Verify contact was saved
        contact = OrderUserContact.objects.filter(order=order).first()
        if contact:
            print(f"SUCCESS OrderUserContact created: {contact}")
            print(f"  Mobile: {contact.mobile_phone}")
            print(f"  Email: {contact.email_address}")
        else:
            print("ERROR OrderUserContact NOT created")

        # Test address data extraction - simulate "For this order only" address
        user_preferences_address = {
            'addressData': {
                'country': 'United Kingdom',
                'address': '123 Test Street, Flat 4B',
                'city': 'London',
                'postal_code': 'SW1A 1AA'
            }
        }

        print("\\nTesting address data extraction...")
        cart_viewset._extract_and_save_delivery_preferences(order, user_preferences_address)

        # Verify address was saved
        delivery_pref = OrderDeliveryDetail.objects.filter(order=order).first()
        if delivery_pref:
            print(f"SUCCESS OrderDeliveryDetail created: {delivery_pref}")
            print(f"  Address: {delivery_pref.delivery_address_line1}")
            print(f"  Country: {delivery_pref.delivery_country}")
            print(f"  Type: {delivery_pref.delivery_address_type}")
        else:
            print("ERROR OrderDeliveryDetail NOT created")

        # Test combined preferences (both contact and address)
        combined_preferences = {
            'mobile_phone': {'value': '+44 7700 900999'},
            'email_address': {'value': 'combined@example.com'},
            'delivery_country': {'value': 'France'},
            'delivery_address_line1': {'value': '456 Combined Street'}
        }

        print("\\nTesting combined preferences...")
        order2 = ActedOrder.objects.create(
            user=user,
            subtotal=200.00,
            vat_amount=40.00,
            total_amount=240.00
        )

        cart_viewset._extract_and_save_contact_data(order2, combined_preferences)
        cart_viewset._extract_and_save_delivery_preferences(order2, combined_preferences)

        # Verify both were saved
        contact2 = OrderUserContact.objects.filter(order=order2).first()
        delivery2 = OrderDeliveryDetail.objects.filter(order=order2).first()

        if contact2 and delivery2:
            print(f"SUCCESS Both models created for order2")
            print(f"  Contact: {contact2.mobile_phone}")
            print(f"  Delivery: {delivery2.delivery_country}")
        else:
            print("ERROR Failed to create both models for order2")

        # Cleanup
        order.delete()
        order2.delete()
        print("\\nSUCCESS All tests passed and cleaned up!")

    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_checkout_order_models()