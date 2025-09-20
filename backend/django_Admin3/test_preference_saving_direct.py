#!/usr/bin/env python
"""Direct test of preference saving functionality"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from cart.models import ActedOrder, OrderUserPreference
from cart.views import CartViewSet
from rules_engine.models import ActedRule

User = get_user_model()

def test_preference_saving_directly():
    """Test the _save_user_preferences_to_order method directly"""
    print("Testing preference saving directly...")

    # Clean up existing test data
    User.objects.filter(username='test_direct_pref_user').delete()

    # Create test user
    user = User.objects.create_user(
        username='test_direct_pref_user',
        email='testdirect@example.com'
    )
    print(f"[OK] Created test user: {user.username}")

    # Create test order
    order = ActedOrder.objects.create(user=user)
    print(f"[OK] Created test order: {order.id}")

    # Get marketing rule for testing
    marketing_rule = None
    try:
        marketing_rule = ActedRule.objects.get(rule_id='marketing_preference_rule_v1')
        print(f"[OK] Found marketing rule: {marketing_rule.rule_id}")
    except ActedRule.DoesNotExist:
        print("[WARNING] Marketing rule not found, testing without rule reference")

    # Prepare test preferences
    test_preferences = {
        'marketing_emails': {
            'value': 'yes',
            'inputType': 'radio',
            'ruleId': marketing_rule.id if marketing_rule else None
        },
        'newsletter_preference': {
            'value': 'weekly',
            'inputType': 'text',
            'ruleId': None
        }
    }

    # Test the preference saving method
    cart_viewset = CartViewSet()
    try:
        cart_viewset._save_user_preferences_to_order(order, test_preferences)
        print("[OK] Preference saving method executed without errors")

        # Check if preferences were saved
        saved_preferences = OrderUserPreference.objects.filter(order=order)
        print(f"[OK] Found {saved_preferences.count()} saved preferences")

        for pref in saved_preferences:
            print(f"     - {pref.preference_key}: {pref.preference_value}")
            print(f"       Rule: {pref.rule.rule_id if pref.rule else 'None'}")

        if saved_preferences.count() >= 1:  # Expecting at least the marketing preference (non-empty one)
            print("[PASS] Preferences were saved successfully!")

            # Verify specific preference values
            marketing_pref = saved_preferences.filter(preference_key='marketing_emails').first()
            if marketing_pref and marketing_pref.preference_value.get('value') == 'yes':
                print("[PASS] Marketing preference value is correct")
                return True
            else:
                print("[FAIL] Marketing preference value is incorrect")
                return False
        else:
            print("[FAIL] No preferences were saved")
            return False

    except Exception as e:
        print(f"[FAIL] Error saving preferences: {e}")
        import traceback
        traceback.print_exc()
        return False

def cleanup():
    """Clean up test data"""
    try:
        User.objects.filter(username='test_direct_pref_user').delete()
        print("[OK] Cleanup completed")
    except Exception as e:
        print(f"[WARNING] Cleanup error: {e}")

if __name__ == '__main__':
    try:
        success = test_preference_saving_directly()
        cleanup()
        if success:
            print("\n[PASS] Direct preference saving test PASSED!")
        else:
            print("\n[FAIL] Direct preference saving test FAILED!")
            sys.exit(1)
    except Exception as e:
        print(f"\n[FAIL] Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        cleanup()
        sys.exit(1)