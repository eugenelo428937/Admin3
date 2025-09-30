#!/usr/bin/env python
"""
Test script for digital consent acknowledgment workflow
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from cart.models import Cart, CartItem
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from products.models import Product
from rules_engine.services.rule_engine import rule_engine
import json

User = get_user_model()

def test_digital_product_detection():
    """Test if digital products are correctly detected and cart.has_digital is set"""
    print("=" * 60)
    print("TEST 1: Digital Product Detection")
    print("=" * 60)

    # Get or create a test user
    user, created = User.objects.get_or_create(
        username='test_digital_user',
        defaults={'email': 'test@digital.com', 'first_name': 'Test', 'last_name': 'User'}
    )
    print(f"Using test user: {user.username} (Created: {created})")

    # Get or create cart
    cart, created = Cart.objects.get_or_create(user=user)
    print(f"Using cart: {cart.id} (Created: {created})")

    # Clear existing cart items
    cart.items.all().delete()
    cart.has_digital = False
    cart.save()
    print("Cleared cart items")

    # Test 1: Add an Online Classroom product (product code = "OC")
    oc_product = ExamSessionSubjectProduct.objects.filter(
        product__code='OC'
    ).first()

    if oc_product:
        print(f"Found OC product: {oc_product.product.fullname}")

        # Create cart item for OC product
        cart_item = CartItem.objects.create(
            cart=cart,
            product=oc_product,
            quantity=1,
            actual_price=100.00,
            metadata={'type': 'online_classroom'}
        )

        # Import the cart view method to test digital detection
        from cart.views import CartViewSet
        cart_view = CartViewSet()

        # Test digital detection
        is_digital = cart_view._is_digital_product(cart_item)
        print(f"OC product detected as digital: {is_digital}")

        # Update cart flags
        cart_view._update_cart_flags(cart)
        cart.refresh_from_db()
        print(f"Cart has_digital after OC product: {cart.has_digital}")

        # Remove OC product for next test
        cart_item.delete()
        cart.has_digital = False
        cart.save()
    else:
        print("No OC (Online Classroom) product found")

    # Test 2: Add an eBook product (variationName = "Vitalsource eBook")
    ebook_product = ExamSessionSubjectProduct.objects.first()  # Any product will do for testing
    if ebook_product:
        print(f"Testing with product: {ebook_product.product.fullname}")

        # Create cart item with eBook variation
        cart_item = CartItem.objects.create(
            cart=cart,
            product=ebook_product,
            quantity=1,
            actual_price=50.00,
            metadata={'variationName': 'Vitalsource eBook', 'variationId': 123}
        )

        # Test digital detection
        is_digital = cart_view._is_digital_product(cart_item)
        print(f"eBook product detected as digital: {is_digital}")

        # Update cart flags
        cart_view._update_cart_flags(cart)
        cart.refresh_from_db()
        print(f"Cart has_digital after eBook product: {cart.has_digital}")

        cart_item.delete()

    print()

def test_checkout_terms_rules_execution():
    """Test rules engine execution for checkout_terms entry point"""
    print("=" * 60)
    print("TEST 2: Checkout Terms Rules Execution")
    print("=" * 60)

    # Get test user and cart with digital product
    user = User.objects.get(username='test_digital_user')
    cart = Cart.objects.get(user=user)

    # Add a digital product to cart
    ebook_product = ExamSessionSubjectProduct.objects.first()
    if ebook_product:
        CartItem.objects.create(
            cart=cart,
            product=ebook_product,
            quantity=1,
            actual_price=50.00,
            metadata={'variationName': 'Vitalsource eBook', 'variationId': 123}
        )

        # Update cart flags
        from cart.views import CartViewSet
        cart_view = CartViewSet()
        cart_view._update_cart_flags(cart)
        cart.refresh_from_db()

        print(f"Cart {cart.id} has_digital: {cart.has_digital}")

        # Build context for rules execution
        context = {
            'cart': {
                'id': cart.id,
                'user_id': user.id,
                'has_digital': cart.has_digital,
                'total': 50.00,
                'items': [
                    {
                        'id': cart.items.first().id,
                        'product_id': ebook_product.product.id,
                        'quantity': 1,
                        'actual_price': '50.00',
                        'metadata': {'variationName': 'Vitalsource eBook', 'variationId': 123}
                    }
                ]
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

        print(f"Context: {json.dumps(context, indent=2)}")

        # Execute rules engine
        try:
            result = rule_engine.execute('checkout_terms', context)
            print(f"Rules execution result:")
            print(f"  Success: {result.get('success')}")
            print(f"  Error: {result.get('error')}")
            print(f"  Messages: {len(result.get('messages', []))}")

            for i, message in enumerate(result.get('messages', [])):
                print(f"    Message {i+1}: {message.get('type')} - {message.get('title', 'No title')}")
                print(f"      Template ID: {message.get('template_id')}")
                print(f"      Requires Ack: {message.get('requires_acknowledgment')}")
                if message.get('ack_key'):
                    print(f"      Ack Key: {message.get('ack_key')}")

            print(f"  Rules Executed: {len(result.get('rules_executed', []))}")
            for rule in result.get('rules_executed', []):
                print(f"    Rule {rule.get('rule_id')}: condition={rule.get('condition_result')}")

        except Exception as e:
            print(f"Rules execution failed: {str(e)}")
            import traceback
            traceback.print_exc()

        # Clean up
        cart.items.all().delete()

    print()

def test_acknowledgment_process():
    """Test the acknowledgment process"""
    print("=" * 60)
    print("TEST 3: Acknowledgment Process")
    print("=" * 60)

    from rules_engine.models import ActedRule, MessageTemplate

    # Check if digital consent rule exists and is active
    digital_rule = ActedRule.objects.filter(name__icontains='Digital').first()
    if digital_rule:
        print(f"Digital rule: {digital_rule.name}")
        print(f"  Entry point: {digital_rule.entry_point}")
        print(f"  Active: {digital_rule.active}")
        print(f"  Priority: {digital_rule.priority}")
        print(f"  Rules fields ID: {digital_rule.rules_fields_id}")
        print(f"  Condition: {digital_rule.condition}")
        print(f"  Actions: {digital_rule.actions}")

        # Check if template exists
        for action in digital_rule.actions:
            if action.get('templateId'):
                template = MessageTemplate.objects.filter(id=action['templateId']).first()
                if template:
                    print(f"  Template {action['templateId']}: {template.title}")
                else:
                    print(f"  Template {action['templateId']}: NOT FOUND")
    else:
        print("No digital content rule found")

    # Check T&C rule too
    tc_rule = ActedRule.objects.filter(name__icontains='Terms').first()
    if tc_rule:
        print(f"\nT&C rule: {tc_rule.name}")
        print(f"  Entry point: {tc_rule.entry_point}")
        print(f"  Active: {tc_rule.active}")
        print(f"  Rules fields ID: {tc_rule.rules_fields_id}")

    print()

def test_order_acknowledgment_transfer():
    """Test the order acknowledgment transfer process"""
    print("=" * 60)
    print("TEST 4: Order Acknowledgment Transfer")
    print("=" * 60)

    from cart.models import ActedOrder, OrderUserAcknowledgment
    from django.test import RequestFactory
    from django.contrib.sessions.backends.db import SessionStore

    # Create a mock request with session acknowledgments
    factory = RequestFactory()
    request = factory.post('/cart/checkout/')

    # Create session
    session = SessionStore()
    session.create()
    request.session = session

    # Add mock acknowledgments to session
    request.session['user_acknowledgments'] = [
        {
            'message_id': '12',  # Template ID from digital rule
            'ack_key': 'digital_content_v1',
            'acknowledged': True,
            'acknowledged_timestamp': '2025-01-01T10:00:00Z',
            'entry_point_location': 'checkout_terms',
            'ip_address': '127.0.0.1',
            'user_agent': 'test-browser'
        }
    ]
    request.session.save()

    # Get test user and create order
    user = User.objects.get(username='test_digital_user')
    cart = Cart.objects.get(user=user)

    # Create test order
    order = ActedOrder.objects.create(user=user, total_amount=50.00)

    # Test acknowledgment transfer
    from cart.views import CartViewSet
    cart_view = CartViewSet()

    try:
        cart_view._transfer_session_acknowledgments_to_order(request, order, cart)

        # Check if acknowledgments were transferred
        acknowledgments = OrderUserAcknowledgment.objects.filter(order=order)
        print(f"Order acknowledgments created: {acknowledgments.count()}")

        for ack in acknowledgments:
            print(f"  Acknowledgment: {ack.acknowledgment_type} - {ack.title}")
            print(f"    Rule ID: {ack.rule_id}")
            print(f"    Accepted: {ack.is_accepted}")

    except Exception as e:
        print(f"Acknowledgment transfer failed: {str(e)}")
        import traceback
        traceback.print_exc()

    # Clean up
    order.delete()

    print()

def main():
    """Run all tests"""
    print("DIGITAL CONSENT WORKFLOW TESTS")
    print("=" * 60)
    print()

    try:
        test_digital_product_detection()
        test_checkout_terms_rules_execution()
        test_acknowledgment_process()
        test_order_acknowledgment_transfer()

        print("=" * 60)
        print("ALL TESTS COMPLETED")
        print("=" * 60)

    except Exception as e:
        print(f"Test failed with error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()