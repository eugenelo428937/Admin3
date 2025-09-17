#!/usr/bin/env python
"""
Debug exactly what the rules engine returns to understand the matched rules issue
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
import json

User = get_user_model()

def debug_rules_engine_response():
    print("=== DEBUGGING RULES ENGINE RESPONSE ===\n")

    try:
        user = User.objects.first()

        # Create cart with digital item
        oc_products = list(ExamSessionSubjectProduct.objects.filter(
            product__code='OC'
        ).select_related('product')[:1])

        oc_product = oc_products[0]
        cart = Cart.objects.create(user=user)
        cart_item = CartItem.objects.create(
            cart=cart,
            product=oc_product,
            quantity=1,
            item_type='product'
        )

        cart_view = CartViewSet()
        cart_view._update_cart_flags(cart)
        cart.refresh_from_db()

        print(f"Cart {cart.id} has_digital: {cart.has_digital}")

        # Build context like _get_matched_rules_for_current_execution does
        cart_items = cart.items.all().select_related('product__product', 'product__exam_session_subject__subject')
        total = sum(item.actual_price or 0 for item in cart_items)

        context = {
            'cart': {
                'id': cart.id,
                'user_id': cart.user.id if cart.user else None,
                'has_digital': cart.has_digital,
                'total': float(total),
                'items': []
            },
            'user': {
                'id': user.id,
                'email': user.email,
                'is_authenticated': True
            },
            'session': {
                'ip_address': '127.0.0.1',
                'session_id': 'checkout_validation'
            },
            'acknowledgments': {}
        }

        # Add cart items to context (this was missing!)
        for item in cart_items:
            context['cart']['items'].append({
                'id': item.id,
                'product_id': item.product.product.id,
                'quantity': item.quantity,
                'actual_price': str(item.actual_price or 0),
                'is_digital': cart.has_digital
            })

        print(f"Context with {len(context['cart']['items'])} items:")
        print(json.dumps(context, indent=2))

        # Execute rules engine
        result = rule_engine.execute('checkout_terms', context)

        print(f"\n=== RULES ENGINE FULL RESPONSE ===")
        print(f"Result keys: {list(result.keys())}")
        print(f"Success: {result.get('success')}")
        print(f"Error: {result.get('error')}")

        print(f"\nRules executed ({len(result.get('rules_executed', []))}):")
        for i, rule_exec in enumerate(result.get('rules_executed', [])):
            print(f"  {i+1}. Rule ID: {rule_exec.get('rule_id')}")
            print(f"     Condition result: {rule_exec.get('condition_result')}")
            print(f"     Error: {rule_exec.get('error')}")

        print(f"\nMessages ({len(result.get('messages', []))}):")
        for i, message in enumerate(result.get('messages', [])):
            print(f"  {i+1}. Template ID: {message.get('template_id')}")
            print(f"     Type: {message.get('type')}")
            print(f"     Message keys: {list(message.keys())}")

        # Now test the _get_matched_rules_for_current_execution method directly
        print(f"\n=== TESTING _get_matched_rules_for_current_execution ===")

        from cart.models import ActedOrder
        test_order = ActedOrder.objects.create(
            user=user,
            subtotal=50.00,
            total_amount=50.00
        )

        # This should use the cart we just created
        matched_rules = cart_view._get_matched_rules_for_current_execution(test_order)
        print(f"Matched rules returned: {matched_rules}")

        # Clean up
        cart.delete()
        test_order.delete()

    except Exception as e:
        print(f"Debug failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    debug_rules_engine_response()