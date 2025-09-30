#!/usr/bin/env python
"""
Test the final acknowledgment transfer fix with proper cart context
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from cart.models import Cart, CartItem, ActedOrder
from cart.views import CartViewSet
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

def test_final_acknowledgment_fix():
    print("=== TESTING FINAL ACKNOWLEDGMENT TRANSFER FIX ===\n")

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

        cart_view._update_cart_flags(cart_with_digital)
        cart_with_digital.refresh_from_db()

        print(f"Cart {cart_with_digital.id} has_digital: {cart_with_digital.has_digital}")

        # Create order
        order_with_digital = ActedOrder.objects.create(
            user=user,
            subtotal=50.00,
            total_amount=50.00
        )

        # Test the fixed method with proper cart parameter
        matched_rules_digital = cart_view._get_matched_rules_for_current_execution(order_with_digital, cart_with_digital)
        print(f"Matched rules for cart WITH digital items: {matched_rules_digital}")

        # Test Case 2: Cart WITHOUT digital items
        print("\n--- TEST CASE 2: Cart WITHOUT digital items ---")

        non_oc_products = list(ExamSessionSubjectProduct.objects.exclude(
            product__code='OC'
        ).select_related('product')[:1])

        if not non_oc_products:
            print("No non-OC products found")
            cart_with_digital.delete()
            order_with_digital.delete()
            return

        non_oc_product = non_oc_products[0]
        cart_without_digital = Cart.objects.create(user=user)
        cart_item = CartItem.objects.create(
            cart=cart_without_digital,
            product=non_oc_product,
            quantity=1,
            item_type='product'
        )

        cart_view._update_cart_flags(cart_without_digital)
        cart_without_digital.refresh_from_db()

        print(f"Cart {cart_without_digital.id} has_digital: {cart_without_digital.has_digital}")

        order_without_digital = ActedOrder.objects.create(
            user=user,
            subtotal=30.00,
            total_amount=30.00
        )

        matched_rules_non_digital = cart_view._get_matched_rules_for_current_execution(order_without_digital, cart_without_digital)
        print(f"Matched rules for cart WITHOUT digital items: {matched_rules_non_digital}")

        # Test Case 3: Acknowledgment validation
        print("\n--- TEST CASE 3: Acknowledgment validation ---")

        session_acknowledgments = [
            {
                'message_id': 11,  # Terms & conditions
                'ack_key': 'terms_conditions_v1',
                'acknowledged': True,
                'acknowledged_timestamp': '2025-09-17T13:23:57.733728+00:00',
                'entry_point_location': 'checkout_terms'
            },
            {
                'message_id': 12,  # Digital consent
                'ack_key': 'digital_content_v1',
                'acknowledged': True,
                'acknowledged_timestamp': '2025-09-17T08:52:43.607178+00:00',
                'entry_point_location': 'checkout_terms'
            }
        ]

        def validate_acknowledgments(matched_rules, cart_type):
            valid_acks = []
            stale_acks = []

            for ack in session_acknowledgments:
                message_id = str(ack.get('message_id', ''))
                ack_key = ack.get('ack_key', '')

                is_valid = (
                    message_id in matched_rules or
                    ack_key in matched_rules or
                    any(rule_id for rule_id in matched_rules if str(rule_id) == message_id)
                )

                if is_valid:
                    valid_acks.append(ack)
                else:
                    stale_acks.append(ack)

            print(f"\n{cart_type} - Matched rules: {matched_rules}")
            print(f"  Valid acknowledgments: {len(valid_acks)}")
            for ack in valid_acks:
                print(f"    + message_id: {ack['message_id']}, ack_key: {ack['ack_key']}")

            print(f"  Stale acknowledgments: {len(stale_acks)}")
            for ack in stale_acks:
                print(f"    - message_id: {ack['message_id']}, ack_key: {ack['ack_key']} (DISCARDED)")

            return len(valid_acks), len(stale_acks)

        # Validate for digital cart
        valid_digital, stale_digital = validate_acknowledgments(matched_rules_digital, "Cart WITH digital items")

        # Validate for non-digital cart
        valid_non_digital, stale_non_digital = validate_acknowledgments(matched_rules_non_digital, "Cart WITHOUT digital items")

        # Results
        print(f"\n=== FINAL RESULTS ===")
        print(f"Digital cart - Valid: {valid_digital}, Stale: {stale_digital}")
        print(f"Non-digital cart - Valid: {valid_non_digital}, Stale: {stale_non_digital}")

        if stale_non_digital > stale_digital:
            print("✅ SUCCESS: Fix works! Digital consent acknowledgment is correctly discarded for non-digital cart")
        elif '12' in matched_rules_digital and '12' not in matched_rules_non_digital:
            print("✅ SUCCESS: Fix works! Template ID 12 (digital consent) matches for digital cart but not non-digital cart")
        else:
            print("❌ ISSUE: Digital consent acknowledgment behavior is not as expected")

        # Clean up
        cart_with_digital.delete()
        cart_without_digital.delete()
        order_with_digital.delete()
        order_without_digital.delete()
        print(f"\nCleaned up test data")

    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_final_acknowledgment_fix()