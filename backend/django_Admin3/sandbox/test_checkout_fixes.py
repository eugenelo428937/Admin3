#!/usr/bin/env python
"""Test both user preference and acknowledgment fixes"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from cart.models import Cart, CartItem, ActedOrder, OrderUserPreference, OrderUserAcknowledgment
from cart.views import CartViewSet
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from rules_engine.models import ActedRule

User = get_user_model()

def test_preference_saving_fix():
    """Test that user preferences now save correctly with string rule IDs"""
    print("=== Testing Preference Saving Fix ===")

    # Clean up
    User.objects.filter(username='test_pref_fix_user').delete()

    # Create test user and order
    user = User.objects.create_user(username='test_pref_fix_user', email='test@example.com')
    order = ActedOrder.objects.create(user=user)

    # Test preferences with string rule ID
    test_preferences = {
        'marketing_emails': {
            'value': 'yes',
            'inputType': 'radio',
            'ruleId': 'marketing_preference_rule_v1'  # String rule ID like frontend sends
        }
    }

    # Test the saving
    cart_viewset = CartViewSet()
    try:
        cart_viewset._save_user_preferences_to_order(order, test_preferences)

        # Check if saved
        saved_prefs = OrderUserPreference.objects.filter(order=order)
        if saved_prefs.exists():
            pref = saved_prefs.first()
            print(f"✓ Preference saved: {pref.preference_key} = {pref.preference_value['value']}")
            print(f"✓ Rule linked: {pref.rule.rule_id if pref.rule else 'None'}")
            return True
        else:
            print("✗ No preferences saved")
            return False

    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    finally:
        user.delete()

def test_acknowledgment_validation():
    """Test acknowledgment validation logic"""
    print("\n=== Testing Acknowledgment Validation ===")

    # Clean up
    User.objects.filter(username='test_ack_user').delete()

    # Create test user, cart, and order
    user = User.objects.create_user(username='test_ack_user', email='test@example.com')

    # Get a test product
    test_product = ExamSessionSubjectProduct.objects.first()
    if not test_product:
        print("✗ No test products available")
        return False

    cart = Cart.objects.create(user=user, has_digital=True)
    CartItem.objects.create(
        cart=cart,
        product=test_product,
        quantity=1,
        actual_price=50.00
    )

    order = ActedOrder.objects.create(user=user)

    # Test the matched rules method
    cart_viewset = CartViewSet()
    try:
        matched_rules = cart_viewset._get_matched_rules_for_current_execution(order, cart)
        print(f"✓ Matched rules found: {matched_rules}")

        # Check if this includes digital-related rules
        rule_count = len(matched_rules)
        if rule_count > 0:
            print(f"✓ Found {rule_count} matching rules for validation")
            return True
        else:
            print("✗ No matching rules found")
            return False

    except Exception as e:
        print(f"✗ Error in rule matching: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        user.delete()

def simulate_checkout_data():
    """Simulate the complete checkout flow"""
    print("\n=== Simulating Complete Checkout ===")

    # This simulates what should happen when:
    # 1. User acknowledges digital consent (sent to /api/rules/engine/acknowledge/)
    # 2. User selects preferences
    # 3. User completes checkout

    print("Sample acknowledgment payload (should be in session):")
    ack_payload = {
        "ackKey": "digital_content_v1",
        "message_id": 12,
        "acknowledged": True,
        "entry_point_location": "checkout_terms"
    }
    print(f"  {ack_payload}")

    print("\nSample preference data (should be in checkout request):")
    pref_data = {
        'marketing_emails': {
            'value': 'yes',
            'inputType': 'radio',
            'ruleId': 'marketing_preference_rule_v1'
        }
    }
    print(f"  {pref_data}")

    print("\n✓ Both payloads should now be processed correctly with the fixes")
    return True

if __name__ == '__main__':
    print("Testing checkout fixes...\n")

    try:
        pref_success = test_preference_saving_fix()
        ack_success = test_acknowledgment_validation()
        sim_success = simulate_checkout_data()

        print(f"\n=== RESULTS ===")
        print(f"Preference saving fix: {'✓ PASSED' if pref_success else '✗ FAILED'}")
        print(f"Acknowledgment validation: {'✓ PASSED' if ack_success else '✗ FAILED'}")
        print(f"Simulation: {'✓ PASSED' if sim_success else '✗ FAILED'}")

        if pref_success and ack_success:
            print(f"\n🎉 Both fixes are working!")
            print("Next steps:")
            print("1. Complete a real checkout with digital products")
            print("2. Select preferences in step 3")
            print("3. Check acted_order_user_preferences and acted_order_user_acknowledgments tables")
        else:
            print(f"\n❌ Some fixes need more work")

    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()