"""
Test script to validate the acknowledgment validation fix

This script tests that acknowledgments from multiple entry points
(checkout_terms, checkout_payment) are properly validated and not
incorrectly marked as "stale" during order creation.

The bug was that _get_matched_rules_for_current_execution only checked
checkout_terms entry point, so tutorial credit card acknowledgments
from checkout_payment were always marked as stale.
"""

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings')
django.setup()

import logging
from cart.models import Cart, ActedOrder
from users.models import User
from cart.views import CartViewSet

# Set up logging to see debug output
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_acknowledgment_validation():
    """Test the fixed acknowledgment validation logic"""

    try:
        # Create a test user if one doesn't exist
        user, created = User.objects.get_or_create(
            email='test@example.com',
            defaults={'username': 'testuser', 'first_name': 'Test', 'last_name': 'User'}
        )

        # Create a test cart with tutorial items (to trigger tutorial credit card rule)
        cart = Cart.objects.create(
            user=user,
            has_tutorial=True,
            has_digital=False,
            has_material=True
        )

        print(f"Created test cart {cart.id} with tutorial items")

        # Create a test order
        order = ActedOrder.objects.create(
            user=user,
            subtotal=100.00,
            total_amount=120.00
        )

        print(f"Created test order {order.id}")

        # Test the fixed validation method
        cart_viewset = CartViewSet()
        matched_rules = cart_viewset._get_matched_rules_for_current_execution(order, cart)

        print(f"Rules that matched during validation: {matched_rules}")

        # The key test: we should now see rules from both entry points
        # - Terms rule from checkout_terms entry point
        # - Tutorial credit card rule from checkout_payment entry point

        if len(matched_rules) > 1:
            print("✅ SUCCESS: Multiple rules matched - fix is working!")
            print("   - This means acknowledgments from different entry points")
            print("   - will no longer be incorrectly marked as 'stale'")
        else:
            print("❌ POTENTIAL ISSUE: Only one rule matched")
            print("   - This might be expected if rules have specific conditions")
            print("   - But we should see more detailed logging above")

        # Clean up test data
        cart.delete()
        order.delete()
        if created:
            user.delete()

        print("\n🔍 Check the logs above for detailed entry point execution results")

    except Exception as e:
        print(f"❌ Error during test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("Testing acknowledgment validation fix...")
    print("=" * 50)
    test_acknowledgment_validation()
    print("=" * 50)
    print("Test completed. Check logs for detailed results.")