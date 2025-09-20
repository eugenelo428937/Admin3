#!/usr/bin/env python
"""Test that user preferences are saved during checkout"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.test import RequestFactory, Client
from django.urls import reverse
from cart.models import Cart, CartItem, ActedOrder, OrderUserPreference
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from rules_engine.models import ActedRule
import json

User = get_user_model()

def test_checkout_preference_saving():
    """Test that user preferences are saved during checkout"""
    print("Testing checkout preference saving...")

    # Clean up existing test data
    User.objects.filter(username='test_checkout_pref_user').delete()
    ActedOrder.objects.filter(user__username='test_checkout_pref_user').delete()

    # Create test user
    user = User.objects.create_user(
        username='test_checkout_pref_user',
        email='testcheckout@example.com',
        password='testpass123'
    )
    print(f"[OK] Created test user: {user.username}")

    # Get a test product for the cart
    test_product = ExamSessionSubjectProduct.objects.first()
    if not test_product:
        print("[FAIL] No test products available")
        return False

    # Create cart with an item
    cart = Cart.objects.create(user=user)
    cart_item = CartItem.objects.create(
        cart=cart,
        product=test_product,
        quantity=1,
        actual_price=50.00,
        price_type='standard'
    )
    print(f"[OK] Created cart with item: {test_product.product.fullname}")

    # Simulate checkout with preferences
    client = Client()
    client.force_login(user)

    # Prepare checkout data with preferences
    checkout_data = {
        'payment_method': 'card',
        'is_invoice': False,
        'card_data': {
            'card_number': '4111111111111111',
            'cardholder_name': 'Test User',
            'expiry_month': '12',
            'expiry_year': '2025',
            'cvv': '123'
        },
        'general_terms_accepted': True,
        'user_preferences': {
            'marketing_emails': {
                'value': 'yes',
                'inputType': 'radio',
                'ruleId': None  # Will be set to actual rule ID
            }
        }
    }

    # Get the marketing preference rule ID
    try:
        marketing_rule = ActedRule.objects.get(rule_id='marketing_preference_rule_v1')
        checkout_data['user_preferences']['marketing_emails']['ruleId'] = marketing_rule.id
        print(f"[OK] Found marketing rule: {marketing_rule.rule_id}")
    except ActedRule.DoesNotExist:
        print("[WARNING] Marketing rule not found, continuing without rule reference")

    # Make checkout request
    response = client.post('/api/cart/checkout/',
                          data=json.dumps(checkout_data),
                          content_type='application/json')

    if response.status_code == 201:
        print("[OK] Checkout completed successfully")
        response_data = response.json()
        order_id = response_data['order']['id']
        print(f"[OK] Order created with ID: {order_id}")

        # Check if preferences were saved
        order_preferences = OrderUserPreference.objects.filter(order_id=order_id)
        print(f"[OK] Found {order_preferences.count()} order preferences")

        if order_preferences.exists():
            for pref in order_preferences:
                print(f"     Preference: {pref.preference_key} = {pref.preference_value}")
            print("[PASS] User preferences were saved successfully!")
            return True
        else:
            print("[FAIL] No user preferences were saved")
            return False
    else:
        print(f"[FAIL] Checkout failed with status {response.status_code}")
        print(f"       Response: {response.content.decode()}")
        return False

def cleanup():
    """Clean up test data"""
    try:
        User.objects.filter(username='test_checkout_pref_user').delete()
        print("[OK] Cleanup completed")
    except Exception as e:
        print(f"[WARNING] Cleanup error: {e}")

if __name__ == '__main__':
    try:
        success = test_checkout_preference_saving()
        cleanup()
        if success:
            print("\n[PASS] Checkout preference saving test PASSED!")
        else:
            print("\n[FAIL] Checkout preference saving test FAILED!")
            sys.exit(1)
    except Exception as e:
        print(f"\n[FAIL] Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        cleanup()
        sys.exit(1)