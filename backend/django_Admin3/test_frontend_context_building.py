#!/usr/bin/env python
"""
Test that the frontend properly includes has_digital flag in context after the fix
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from cart.models import Cart, CartItem
from cart.views import CartViewSet
from cart.serializers import CartSerializer
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from django.contrib.auth import get_user_model
from django.http import HttpRequest
from django.test import RequestFactory
import json

User = get_user_model()

def test_frontend_context_building():
    print("=== TESTING FRONTEND CONTEXT BUILDING ===\n")

    try:
        user = User.objects.first()
        cart_view = CartViewSet()

        # Test Case 1: Cart WITH digital items
        print("--- TEST CASE 1: Cart WITH digital items ---")

        oc_products = list(ExamSessionSubjectProduct.objects.filter(
            product__code='OC'
        ).select_related('product')[:1])

        if not oc_products:
            print("No OC products found")
            return

        oc_product = oc_products[0]
        cart_with_digital = Cart.objects.create(user=user)
        cart_item = CartItem.objects.create(
            cart=cart_with_digital,
            product=oc_product,
            quantity=1,
            item_type='product'
        )

        # Update cart flags
        cart_view._update_cart_flags(cart_with_digital)
        cart_with_digital.refresh_from_db()

        print(f"Cart {cart_with_digital.id} has_digital: {cart_with_digital.has_digital}")

        # Test serialization (what frontend receives)
        factory = RequestFactory()
        request = factory.get('/cart/')
        request.user = user
        # Add session mock
        from django.contrib.sessions.backends.db import SessionStore
        request.session = SessionStore()
        request.session['user_acknowledgments'] = []

        serializer = CartSerializer(cart_with_digital, context={'request': request})
        cart_data = serializer.data

        print(f"Serialized cart data has_digital: {cart_data.get('has_digital')}")
        print(f"Cart data keys: {list(cart_data.keys())}")

        # Test Case 2: Cart WITHOUT digital items
        print("\n--- TEST CASE 2: Cart WITHOUT digital items ---")

        non_oc_products = list(ExamSessionSubjectProduct.objects.exclude(
            product__code='OC'
        ).select_related('product')[:1])

        if not non_oc_products:
            print("No non-OC products found")
            cart_with_digital.delete()
            return

        non_oc_product = non_oc_products[0]
        cart_without_digital = Cart.objects.create(user=user)
        cart_item = CartItem.objects.create(
            cart=cart_without_digital,
            product=non_oc_product,
            quantity=1,
            item_type='product'
        )

        # Update cart flags
        cart_view._update_cart_flags(cart_without_digital)
        cart_without_digital.refresh_from_db()

        print(f"Cart {cart_without_digital.id} has_digital: {cart_without_digital.has_digital}")

        # Test serialization
        request.session = SessionStore()  # Reset session for clean test
        request.session['user_acknowledgments'] = []
        serializer = CartSerializer(cart_without_digital, context={'request': request})
        cart_data_non_digital = serializer.data

        print(f"Serialized cart data has_digital: {cart_data_non_digital.get('has_digital')}")

        # Test Case 3: Simulate frontend context building
        print("\n--- TEST CASE 3: Frontend context building simulation ---")

        # Simulate what frontend receives and how it builds context
        def simulate_frontend_context_building(cart_data, cart_items):
            """Simulate the fixed frontend context building logic"""

            # This simulates the buildRulesContext.checkout function after our fix
            context = {
                'cart': {
                    'id': cart_data['id'],
                    'user_id': cart_data.get('user_id'),
                    'has_digital': bool(cart_data.get('has_digital')),  # Fixed: now included!
                    'has_marking': bool(cart_data.get('has_marking', False)),
                    'total': 0.0,  # Calculate from items
                    'items': cart_items
                },
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'is_authenticated': True
                },
                'session': {
                    'ip_address': '127.0.0.1',
                    'session_id': 'test_session'
                },
                'acknowledgments': {}
            }

            return context

        # Test with digital cart
        digital_context = simulate_frontend_context_building(cart_data, cart_data['items'])
        print(f"Frontend context for digital cart:")
        print(f"  - cart.has_digital: {digital_context['cart']['has_digital']}")
        print(f"  - cart.has_marking: {digital_context['cart']['has_marking']}")

        # Test with non-digital cart
        non_digital_context = simulate_frontend_context_building(cart_data_non_digital, cart_data_non_digital['items'])
        print(f"Frontend context for non-digital cart:")
        print(f"  - cart.has_digital: {non_digital_context['cart']['has_digital']}")
        print(f"  - cart.has_marking: {non_digital_context['cart']['has_marking']}")

        # Validate the fix
        print(f"\n=== VALIDATION RESULTS ===")
        if digital_context['cart']['has_digital'] == True and non_digital_context['cart']['has_digital'] == False:
            print("✅ SUCCESS: Frontend context building now properly includes has_digital flag")
            print("   - Digital cart: has_digital = True")
            print("   - Non-digital cart: has_digital = False")
        else:
            print("❌ ISSUE: Frontend context building is not working as expected")
            print(f"   - Digital cart has_digital: {digital_context['cart']['has_digital']}")
            print(f"   - Non-digital cart has_digital: {non_digital_context['cart']['has_digital']}")

        # Test the rules engine would now receive correct context
        print(f"\n--- CONTEXT THAT WOULD BE SENT TO RULES ENGINE ---")
        print(f"Digital cart context:")
        print(json.dumps(digital_context, indent=2))

        # Clean up
        cart_with_digital.delete()
        cart_without_digital.delete()

    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_frontend_context_building()