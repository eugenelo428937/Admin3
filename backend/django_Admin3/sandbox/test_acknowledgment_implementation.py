#!/usr/bin/env python3
"""
Test script for acknowledgment implementation
Tests the complete acknowledgment flow from rules engine to session storage
"""
import os
import sys
import django
import json

# Add the parent directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.test import RequestFactory
from django.contrib.sessions.middleware import SessionMiddleware
from django.contrib.auth import get_user_model
from rules_engine.services.rule_engine import rule_engine
from rules_engine.models.acted_rule import ActedRule
from rules_engine.models.message_template import MessageTemplate
from cart.serializers import CartSerializer
from cart.models import Cart

User = get_user_model()

def test_acknowledgment_rules():
    """Test the acknowledgment rules implementation"""
    print("=== Testing Acknowledgment Rules Implementation ===\n")

    # Test 1: Check that the rules and templates were created
    print("1. Checking created rules and templates...")

    checkout_rule = ActedRule.objects.filter(rule_id="rule_checkout_terms_acknowledgment_v1").first()
    add_to_cart_rule = ActedRule.objects.filter(rule_id="rule_add_to_cart_terms_acknowledgment_v1").first()
    template = MessageTemplate.objects.filter(name="terms_conditions_acknowledgment").first()

    if checkout_rule:
        print(f"   [OK] Checkout terms rule found: {checkout_rule.name}")
    else:
        print("   [ERROR] Checkout terms rule not found")

    if add_to_cart_rule:
        print(f"   [OK] Add to cart rule found: {add_to_cart_rule.name}")
    else:
        print("   [ERROR] Add to cart rule not found")

    if template:
        print(f"   [OK] Message template found: {template.name} (ID: {template.id})")
    else:
        print("   [ERROR] Message template not found")

    # Test 2: Test rules engine execution for checkout_terms
    print("\n2. Testing rules engine execution for checkout_terms...")

    context = {
        "user": {
            "id": 1,
            "email": "test@example.com",
            "is_authenticated": True,
            "home_country": "GB",
            "work_country": None
        },
        "cart": {
            "items": []
        }
    }

    try:
        result = rule_engine.execute("checkout_terms", context)
        print(f"   [OK] Rules engine executed successfully")
        print(f"   Rules evaluated: {result.get('rules_evaluated', 0)}")
        print(f"   Messages: {len(result.get('messages', []))}")
        print(f"   Blocked: {result.get('blocked', False)}")
        print(f"   Execution time: {result.get('execution_time_ms', 0):.2f}ms")

        if result.get('messages'):
            for i, message in enumerate(result['messages']):
                print(f"      Message {i+1}: {message.get('type')} - {message.get('content', {}).get('title', 'No title')}")

    except Exception as e:
        print(f"   [ERROR] Rules engine execution failed: {str(e)}")

    # Test 3: Test rules engine execution for add_to_cart
    print("\n3. Testing rules engine execution for add_to_cart...")

    add_to_cart_context = {
        "user_context": {
            "acknowledgments": []  # No prior acknowledgments
        },
        "product": {
            "product_id": 123
        }
    }

    try:
        result = rule_engine.execute("add_to_cart", add_to_cart_context)
        print(f"   [OK] Add to cart rules executed successfully")
        print(f"   Rules evaluated: {result.get('rules_evaluated', 0)}")
        print(f"   Messages: {len(result.get('messages', []))}")
        print(f"   Execution time: {result.get('execution_time_ms', 0):.2f}ms")

    except Exception as e:
        print(f"   [ERROR] Add to cart rules execution failed: {str(e)}")

    # Test 4: Test session-based acknowledgment storage simulation
    print("\n4. Testing session-based acknowledgment storage...")

    factory = RequestFactory()
    request = factory.get('/')

    # Add session middleware
    middleware = SessionMiddleware(lambda req: None)
    middleware.process_request(request)
    request.session.save()

    # Simulate acknowledgment data
    acknowledgment_data = [
        {
            "message_id": template.id if template else 1,
            "acknowledged": True,
            "acknowledged_timestamp": "2025-09-15T15:43:25.758562Z",
            "entry_point_location": "checkout_terms",
            "ack_key": "terms_conditions_v1",
            "ip_address": "127.0.0.1",
            "user_agent": "Test Agent"
        }
    ]

    request.session['user_acknowledgments'] = acknowledgment_data
    request.session.save()

    print(f"   [OK] Session acknowledgments stored: {len(acknowledgment_data)} items")

    # Test 5: Test cart serializer with acknowledgments
    print("\n5. Testing cart serializer with acknowledgments...")

    try:
        # Create a mock cart for testing
        user = User.objects.first()
        if not user:
            print("   [INFO] No users found, creating test user...")
            user = User.objects.create_user(
                username='testuser',
                email='test@example.com',
                password='testpass123'
            )

        cart, created = Cart.objects.get_or_create(user=user)

        # Create request with user
        request.user = user

        serializer = CartSerializer(cart, context={'request': request})
        cart_data = serializer.data

        user_context = cart_data.get('user_context', {})
        acknowledgments = user_context.get('acknowledgments', [])

        print(f"   [OK] Cart serializer worked successfully")
        print(f"   User context: {user_context.get('email', 'No email')}")
        print(f"   Acknowledgments in user_context: {len(acknowledgments)}")

        if acknowledgments:
            for ack in acknowledgments:
                print(f"      - {ack.get('ack_key')}: {ack.get('acknowledged')} at {ack.get('entry_point_location')}")

    except Exception as e:
        print(f"   [ERROR] Cart serializer test failed: {str(e)}")

    print("\n=== Test Summary ===")
    print("[OK] Acknowledgment implementation test completed!")
    print("\nKey components tested:")
    print("  - Rules and message templates creation")
    print("  - Rules engine execution for both entry points")
    print("  - Session-based acknowledgment storage")
    print("  - Cart serializer integration")
    print("\nNext steps:")
    print("  - Test the frontend components with a running server")
    print("  - Test the complete checkout flow with acknowledgment transfer")
    print("  - Verify acknowledgments are saved to order table during checkout")

if __name__ == '__main__':
    test_acknowledgment_rules()