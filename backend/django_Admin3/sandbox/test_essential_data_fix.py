#!/usr/bin/env python
"""
Test the essential data extraction fix
"""
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from cart.models import ActedOrder, OrderUserContact, OrderDeliveryDetail
from cart.views import CartViewSet
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

User = get_user_model()

def test_essential_data_extraction():
    """Test that essential data extraction works"""

    print("=== Testing Essential Data Extraction Fix ===")

    # Get a test user
    try:
        user = User.objects.filter(email='eugene.lo1115@gmail.com').first()
        if not user:
            print("ERROR: Test user eugene.lo1115@gmail.com not found")
            return False

        print(f"Test user: {user.email}")

        # Create a test order
        test_order = ActedOrder.objects.create(
            user=user,
            total_amount=999.99
        )

        print(f"Created test order: {test_order.id}")

        # Test the essential data extraction method
        cart_viewset = CartViewSet()

        # Test with no user_preferences (should fallback to user profile)
        print("\n--- Testing with no user_preferences (fallback mode) ---")
        cart_viewset._extract_and_save_essential_order_data(test_order, user, None)

        # Check results
        contact_records = OrderUserContact.objects.filter(order=test_order)
        delivery_records = OrderDeliveryDetail.objects.filter(order=test_order)

        print(f"Contact records created: {contact_records.count()}")
        for contact in contact_records:
            print(f"  Email: {contact.email_address}")
            print(f"  Phone: {contact.mobile_phone}")

        print(f"Delivery records created: {delivery_records.count()}")
        for delivery in delivery_records:
            print(f"  Address: {delivery.delivery_address_line1}")

        # Test with user_preferences
        print("\n--- Testing with user_preferences ---")
        user_preferences = {
            'email': {'value': 'test@example.com'},
            'phone': {'value': '+44123456789'},
            'address_line1': {'value': '123 Test Street'},
            'address_city': {'value': 'Test City'},
            'address_postcode': {'value': 'TEST123'}
        }

        # Create another test order
        test_order2 = ActedOrder.objects.create(
            user=user,
            total_amount=888.88
        )

        print(f"Created test order 2: {test_order2.id}")
        cart_viewset._extract_and_save_essential_order_data(test_order2, user, user_preferences)

        # Check results
        contact_records2 = OrderUserContact.objects.filter(order=test_order2)
        delivery_records2 = OrderDeliveryDetail.objects.filter(order=test_order2)

        print(f"Contact records created: {contact_records2.count()}")
        for contact in contact_records2:
            print(f"  Email: {contact.email_address}")
            print(f"  Phone: {contact.mobile_phone}")

        print(f"Delivery records created: {delivery_records2.count()}")
        for delivery in delivery_records2:
            print(f"  Address: {delivery.delivery_address_line1}")
            print(f"  City: {delivery.delivery_city}")
            print(f"  Postcode: {delivery.delivery_postal_code}")

        # Clean up test orders
        test_order.delete()
        test_order2.delete()
        print("\nSUCCESS: Test orders cleaned up")

        return True

    except Exception as e:
        logger.error(f"Test failed: {str(e)}")
        return False

if __name__ == "__main__":
    if test_essential_data_extraction():
        print("\nSUCCESS: Essential data extraction fix is working correctly!")
    else:
        print("\nERROR: Essential data extraction fix failed")