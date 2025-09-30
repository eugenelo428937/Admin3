#!/usr/bin/env python
"""Debug the digital acknowledgment transfer issue"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from cart.models import Cart, CartItem, ActedOrder
from cart.views import CartViewSet
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from rules_engine.services.rule_engine import rule_engine

User = get_user_model()

def test_digital_acknowledgment_matching():
    """Test why digital acknowledgment isn't being matched"""
    print("Debugging digital acknowledgment matching...")

    # Clean up
    User.objects.filter(username='test_digital_debug').delete()

    # Create test user
    user = User.objects.create_user(username='test_digital_debug', email='test@example.com')

    # Get a digital product
    test_product = ExamSessionSubjectProduct.objects.first()
    if not test_product:
        print("No test products available")
        return False

    # Create cart with digital flag
    cart = Cart.objects.create(user=user, has_digital=True)
    CartItem.objects.create(
        cart=cart,
        product=test_product,
        quantity=1,
        actual_price=50.00
    )

    order = ActedOrder.objects.create(user=user)
    print(f"Created cart with has_digital={cart.has_digital}")

    # Test the rules engine execution directly
    context = {
        'cart': {
            'id': cart.id,
            'user_id': user.id,
            'has_digital': True,  # Explicitly set for testing
            'total': 50.0,
            'items': [{
                'id': 1,
                'product_id': test_product.product.id,
                'quantity': 1,
                'actual_price': '50.00',
                'is_digital': True
            }]
        },
        'user': {
            'id': user.id,
            'email': user.email,
            'is_authenticated': True
        }
    }

    print(f"Testing with context: cart.has_digital = {context['cart']['has_digital']}")

    # Execute rules directly
    result = rule_engine.execute('checkout_terms', context)
    print(f"\nRules engine result:")
    print(f"  Success: {result.get('success')}")
    print(f"  Rules evaluated: {result.get('rules_evaluated')}")

    matched_rules = set()
    for rule_exec in result.get('rules_executed', []):
        print(f"  Rule: {rule_exec.get('rule_id')} - Condition: {rule_exec.get('condition_result')}")
        if rule_exec.get('condition_result'):
            matched_rules.add(rule_exec.get('rule_id'))

    print(f"\nMatched rules: {matched_rules}")

    # Now test the cart view method
    cart_viewset = CartViewSet()
    matched_from_method = cart_viewset._get_matched_rules_for_current_execution(order, cart)
    print(f"Matched from cart method: {matched_from_method}")

    # Simulate session acknowledgments
    session_acks = [
        {
            'ackKey': 'digital_content_v1',
            'message_id': '12',
            'acknowledged': True,
            'entry_point_location': 'checkout_terms'
        },
        {
            'ackKey': 'terms_conditions_v1',
            'message_id': '11',
            'acknowledged': True,
            'entry_point_location': 'checkout_terms'
        }
    ]

    print(f"\nSimulated session acknowledgments:")
    for ack in session_acks:
        message_id = str(ack.get('message_id', ''))
        ack_key = ack.get('ack_key', '')

        is_valid = (
            message_id in matched_from_method or
            ack_key in matched_from_method or
            any(rule_id for rule_id in matched_from_method if str(rule_id) == message_id)
        )

        print(f"  {ack['ackKey']}: {'VALID' if is_valid else 'INVALID'}")

    # Cleanup
    user.delete()

    return len(matched_from_method) >= 2  # Should have both T&C and digital consent

if __name__ == '__main__':
    try:
        result = test_digital_acknowledgment_matching()
        print(f"\nTest result: {'PASSED' if result else 'FAILED'}")

        if not result:
            print("\nPossible issues:")
            print("1. Digital product detection not working in cart")
            print("2. Context building for rules engine is incorrect")
            print("3. Rule condition evaluation is failing")
            print("4. Acknowledgment matching logic needs improvement")

    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()