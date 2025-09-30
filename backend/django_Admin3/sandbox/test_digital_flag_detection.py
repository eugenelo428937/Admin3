#!/usr/bin/env python
"""
Test script to verify has_digital flag detection in cart
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from cart.models import Cart, CartItem
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

def test_digital_product_detection():
    print("=== TESTING DIGITAL PRODUCT DETECTION ===\n")

    # Find some products to test with
    try:
        # Look for Online Classroom products (product_code = "OC")
        oc_products_list = list(ExamSessionSubjectProduct.objects.filter(
            product__code='OC'
        ).select_related('product')[:3])

        print(f"Found {len(oc_products_list)} Online Classroom products (OC code)")
        for product in oc_products_list:
            print(f"  - {product.id}: {product.product.fullname} (code: {product.product.code})")

        # Look for products that might be eBooks based on name
        ebook_products_list = list(ExamSessionSubjectProduct.objects.filter(
            product__fullname__icontains='ebook'
        ).select_related('product')[:3])

        print(f"\nFound {len(ebook_products_list)} potential eBook products (name contains 'ebook')")
        for product in ebook_products_list:
            print(f"  - {product.id}: {product.product.fullname}")

        # Test cart creation and digital flag setting
        user = User.objects.first()
        if not user:
            print("No users found for testing")
            return

        print(f"\nTesting with user: {user.email}")

        # Create test cart
        cart = Cart.objects.create(user=user)
        print(f"Created cart {cart.id}, initial has_digital: {cart.has_digital}")

        # Test 1: Add an OC product if available
        if oc_products_list:
            oc_product = oc_products_list[0]
            cart_item = CartItem.objects.create(
                cart=cart,
                product=oc_product,
                quantity=1,
                item_type='product'
            )
            print(f"\nAdded OC product {oc_product.id} to cart")

            # Manually trigger the digital detection logic like the view does
            from cart.views import CartViewSet
            cart_view = CartViewSet()
            is_digital = cart_view._is_digital_product(cart_item)
            print(f"_is_digital_product result for OC product: {is_digital}")

            # Update cart flags
            cart_view._update_cart_flags(cart)
            cart.refresh_from_db()
            print(f"Cart has_digital after adding OC product: {cart.has_digital}")

        # Test 2: Add an eBook product with metadata
        if ebook_products_list:
            ebook_product = ebook_products_list[0]
            cart_item = CartItem.objects.create(
                cart=cart,
                product=ebook_product,
                quantity=1,
                item_type='product',
                metadata={'variationName': 'Vitalsource eBook'}
            )
            print(f"\nAdded eBook product {ebook_product.id} with Vitalsource metadata to cart")

            # Test digital detection
            from cart.views import CartViewSet
            cart_view = CartViewSet()
            is_digital = cart_view._is_digital_product(cart_item)
            print(f"_is_digital_product result for eBook product: {is_digital}")

            # Update cart flags
            cart_view._update_cart_flags(cart)
            cart.refresh_from_db()
            print(f"Cart has_digital after adding eBook product: {cart.has_digital}")

        # Test 3: Test the rules engine context building
        print("\n=== TESTING RULES ENGINE CONTEXT ===")
        from cart.views import CartViewSet
        cart_view = CartViewSet()

        # Build context like the acknowledgment transfer method does
        cart_items = cart.items.all().select_related('product__product', 'product__exam_session_subject__subject')

        has_digital_context = False
        for item in cart_items:
            product = item.product.product
            if (hasattr(product, 'is_digital') and product.is_digital) or \
               ('ebook' in product.fullname.lower() or 'online' in product.fullname.lower()):
                has_digital_context = True
                break

        # Calculate total from cart items since Cart doesn't have subtotal
        total = sum(item.actual_price or 0 for item in cart_items)

        context = {
            'cart': {
                'id': cart.id,
                'user_id': cart.user.id if cart.user else None,
                'has_digital': has_digital_context,  # Context building logic
                'total': float(total),
                'items': []
            }
        }

        print(f"Rules engine context has_digital (using name detection): {has_digital_context}")
        print(f"Cart model has_digital (using proper detection): {cart.has_digital}")

        # Test rules engine execution
        from rules_engine.services.rule_engine import rule_engine
        try:
            result = rule_engine.execute('checkout_terms', context)
            print(f"\nRules engine execution result: {result.get('success')}")
            print(f"Messages generated: {len(result.get('messages', []))}")
            for message in result.get('messages', []):
                print(f"  - Template ID: {message.get('template_id')}, Content: {message.get('content', {}).get('title', 'No title')}")
        except Exception as e:
            print(f"Rules engine execution error: {e}")

        # Clean up test cart
        cart.delete()
        print(f"\nCleaned up test cart {cart.id}")

    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_digital_product_detection()