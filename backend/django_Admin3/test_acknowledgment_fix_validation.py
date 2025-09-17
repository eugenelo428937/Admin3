#!/usr/bin/env python
"""
Test the fixed acknowledgment transfer logic to ensure it properly uses cart.has_digital
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from cart.models import Cart, CartItem
from cart.views import CartViewSet
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from django.contrib.auth import get_user_model
from rules_engine.services.rule_engine import rule_engine
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

def test_acknowledgment_validation_with_fixed_logic():
    print("=== TESTING FIXED ACKNOWLEDGMENT VALIDATION LOGIC ===\n")

    try:
        # Get a user for testing
        user = User.objects.first()
        if not user:
            print("No users found for testing")
            return

        print(f"Testing with user: {user.email}")

        # Test Case 1: Cart with digital items (OC product)
        print("\n--- TEST CASE 1: Cart with digital items ---")

        # Find an OC product
        oc_products = list(ExamSessionSubjectProduct.objects.filter(
            product__code='OC'
        ).select_related('product')[:1])

        if not oc_products:
            print("No OC products found for testing")
            return

        oc_product = oc_products[0]
        print(f"Using OC product: {oc_product.id} - {oc_product.product.fullname}")

        # Create cart with digital item
        cart_with_digital = Cart.objects.create(user=user)
        cart_item = CartItem.objects.create(
            cart=cart_with_digital,
            product=oc_product,
            quantity=1,
            item_type='product'
        )

        # Update cart flags using the proper method
        cart_view = CartViewSet()
        cart_view._update_cart_flags(cart_with_digital)
        cart_with_digital.refresh_from_db()

        print(f"Cart {cart_with_digital.id} has_digital: {cart_with_digital.has_digital}")

        # Test the fixed context building method
        from cart.models import ActedOrder

        # Create a test order
        order_with_digital = ActedOrder.objects.create(
            user=user,
            subtotal=50.00,
            total_amount=50.00
        )

        # Test the _get_matched_rules_for_current_execution method
        matched_rules = cart_view._get_matched_rules_for_current_execution(order_with_digital)
        print(f"Matched rules for cart with digital items: {matched_rules}")

        # Test Case 2: Cart without digital items (non-OC product)
        print("\n--- TEST CASE 2: Cart without digital items ---")

        # Find a non-OC product
        non_oc_products = list(ExamSessionSubjectProduct.objects.exclude(
            product__code='OC'
        ).select_related('product')[:1])

        if not non_oc_products:
            print("No non-OC products found for testing")
            # Clean up and return
            cart_with_digital.delete()
            order_with_digital.delete()
            return

        non_oc_product = non_oc_products[0]
        print(f"Using non-OC product: {non_oc_product.id} - {non_oc_product.product.fullname} (code: {non_oc_product.product.code})")

        # Create cart without digital items
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

        # Create test order for non-digital cart
        order_without_digital = ActedOrder.objects.create(
            user=user,
            subtotal=30.00,
            total_amount=30.00
        )

        # Test the acknowledgment validation
        matched_rules_non_digital = cart_view._get_matched_rules_for_current_execution(order_without_digital)
        print(f"Matched rules for cart without digital items: {matched_rules_non_digital}")

        # Test Case 3: Simulate acknowledgment validation scenario
        print("\n--- TEST CASE 3: Acknowledgment validation scenario ---")

        # Simulate session acknowledgments like the ones from the bug report
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

        print(f"Session acknowledgments to validate: {len(session_acknowledgments)}")
        for ack in session_acknowledgments:
            print(f"  - message_id: {ack['message_id']}, ack_key: {ack['ack_key']}")

        # Validate against cart with digital items
        print(f"\nValidating against cart WITH digital items (matched rules: {matched_rules}):")
        valid_acks_digital = []
        stale_acks_digital = []

        for ack in session_acknowledgments:
            message_id = str(ack.get('message_id', ''))
            ack_key = ack.get('ack_key', '')

            is_valid = (
                message_id in matched_rules or
                ack_key in matched_rules or
                any(rule_id for rule_id in matched_rules if str(rule_id) == message_id)
            )

            if is_valid:
                valid_acks_digital.append(ack)
            else:
                stale_acks_digital.append(ack)

        print(f"  Valid acknowledgments: {len(valid_acks_digital)}")
        for ack in valid_acks_digital:
            print(f"    ✓ message_id: {ack['message_id']}, ack_key: {ack['ack_key']}")

        print(f"  Stale acknowledgments: {len(stale_acks_digital)}")
        for ack in stale_acks_digital:
            print(f"    ✗ message_id: {ack['message_id']}, ack_key: {ack['ack_key']} (DISCARDED)")

        # Validate against cart without digital items
        print(f"\nValidating against cart WITHOUT digital items (matched rules: {matched_rules_non_digital}):")
        valid_acks_non_digital = []
        stale_acks_non_digital = []

        for ack in session_acknowledgments:
            message_id = str(ack.get('message_id', ''))
            ack_key = ack.get('ack_key', '')

            is_valid = (
                message_id in matched_rules_non_digital or
                ack_key in matched_rules_non_digital or
                any(rule_id for rule_id in matched_rules_non_digital if str(rule_id) == message_id)
            )

            if is_valid:
                valid_acks_non_digital.append(ack)
            else:
                stale_acks_non_digital.append(ack)

        print(f"  Valid acknowledgments: {len(valid_acks_non_digital)}")
        for ack in valid_acks_non_digital:
            print(f"    ✓ message_id: {ack['message_id']}, ack_key: {ack['ack_key']}")

        print(f"  Stale acknowledgments: {len(stale_acks_non_digital)}")
        for ack in stale_acks_non_digital:
            print(f"    ✗ message_id: {ack['message_id']}, ack_key: {ack['ack_key']} (DISCARDED)")

        # Expected result: For non-digital cart, digital consent should be stale
        print(f"\n=== VALIDATION RESULTS ===")
        print(f"Cart with digital items - Valid acknowledgments: {len(valid_acks_digital)}, Stale: {len(stale_acks_digital)}")
        print(f"Cart without digital items - Valid acknowledgments: {len(valid_acks_non_digital)}, Stale: {len(stale_acks_non_digital)}")

        if len(stale_acks_non_digital) > 0:
            print("✅ SUCCESS: Digital consent acknowledgment correctly identified as stale for non-digital cart")
        else:
            print("❌ FAILURE: Digital consent acknowledgment was not identified as stale for non-digital cart")

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
    test_acknowledgment_validation_with_fixed_logic()