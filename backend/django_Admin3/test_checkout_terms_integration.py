#!/usr/bin/env python
import os
import sys
import django

# Setup Django environment
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from django.contrib.sessions.middleware import SessionMiddleware
from rules_engine.services.rule_engine import RuleEngine
from rules_engine.models import ActedRule, MessageTemplate
from cart.models import Cart, CartItem
import json
from datetime import datetime

User = get_user_model()

def add_session_to_request(request):
    """Add session to request for testing"""
    middleware = SessionMiddleware(lambda r: None)
    middleware.process_request(request)
    request.session.save()

def test_checkout_terms_integration():
    """Test the complete checkout_terms integration"""

    print("[TEST] Starting Checkout Terms Integration Test")
    print("=" * 60)

    try:
        # 1. Check if Terms & Conditions rule exists
        print("\n[STEP 1] Checking for Terms & Conditions rule...")

        # Check for the message template
        try:
            template = MessageTemplate.objects.get(id=11)
            print(f"[OK] Found MessageTemplate ID 11: {template.name}")
            print(f"    Title: {template.title}")
            print(f"    Content preview: {template.content[:100]}...")

            if template.json_content:
                print(f"    JSON Content: {json.dumps(template.json_content, indent=2)[:200]}...")
        except MessageTemplate.DoesNotExist:
            print("[WARNING] MessageTemplate ID 11 not found - run setup_terms_and_conditions_acknowledgment_rule.py first")
            return False

        # Check for the rules
        checkout_terms_rules = ActedRule.objects.filter(
            entry_point='checkout_terms',
            active=True
        )
        print(f"\n[OK] Found {checkout_terms_rules.count()} active checkout_terms rules")

        for rule in checkout_terms_rules:
            print(f"    - Rule: {rule.name}")
            print(f"      Priority: {rule.priority}")
            if rule.actions:
                action_types = [a.get('type') for a in rule.actions] if isinstance(rule.actions, list) else []
                print(f"      Actions: {action_types}")

        # 2. Test rule execution with mock context
        print("\n[STEP 2] Testing rule execution with mock cart context...")

        # Create mock request
        factory = RequestFactory()
        request = factory.post('/api/rules/engine/execute/')
        add_session_to_request(request)

        # Mock cart context
        context = {
            "cart": {
                "id": "test-cart-123",
                "items": [
                    {
                        "product_id": 1,
                        "product_name": "Test Product",
                        "quantity": 1,
                        "actual_price": "100.00"
                    }
                ],
                "total": 100.00,
                "has_marking": False,
                "has_material": True,
                "has_tutorial": False
            },
            "user": {
                "id": "test-user-1",
                "email": "test@example.com"
            }
        }

        # Execute rules through the engine
        rule_engine = RuleEngine()
        result = rule_engine.execute('checkout_terms', context)

        print(f"\n[OK] Rule execution completed")
        print(f"    Messages: {len(result.get('messages', []))} messages returned")
        print(f"    Blocked: {result.get('blocked', False)}")
        print(f"    Requires Acknowledgment: {result.get('requires_acknowledgment', False)}")

        # Check for acknowledgment messages
        for idx, message in enumerate(result.get('messages', [])):
            print(f"\n    Message {idx + 1}:")
            print(f"      Template ID: {message.get('template_id')}")
            print(f"      Action Type: {message.get('action_type')}")
            print(f"      Display Type: {message.get('display_type')}")

            if message.get('content'):
                content = message['content']
                if isinstance(content, dict):
                    print(f"      Title: {content.get('title', 'N/A')}")
                    print(f"      Type: {content.get('type', 'N/A')}")
                    if content.get('checkbox_text'):
                        print(f"      Checkbox Text: {content['checkbox_text']}")
                    if content.get('message'):
                        print(f"      Message preview: {content['message'][:100]}...")

        # 3. Test session acknowledgment storage
        print("\n[STEP 3] Testing acknowledgment session storage...")

        # Simulate acknowledgment
        request.session['user_acknowledgments'] = [{
            'message_id': 11,
            'acknowledged': True,
            'acknowledged_timestamp': datetime.now().isoformat(),
            'entry_point_location': 'checkout_terms',
            'ack_key': 'terms_conditions_acknowledgment'
        }]

        # Check session storage
        acks = request.session.get('user_acknowledgments', [])
        print(f"[OK] Session acknowledgments stored: {len(acks)} acknowledgment(s)")

        for ack in acks:
            print(f"    - Message ID: {ack['message_id']}")
            print(f"      Acknowledged: {ack['acknowledged']}")
            print(f"      Entry Point: {ack['entry_point_location']}")

        # 4. Verify frontend integration points
        print("\n[STEP 4] Checking frontend integration...")

        frontend_files = [
            'frontend/react-Admin3/src/components/Ordering/CheckoutSteps/TermsConditionsStep.js',
            'frontend/react-Admin3/src/components/Common/RulesEngineAcknowledgmentModal.js',
            'frontend/react-Admin3/src/services/acknowledgmentService.js'
        ]

        for file_path in frontend_files:
            if os.path.exists(file_path):
                print(f"[OK] {file_path} exists")
            else:
                print(f"[WARNING] {file_path} not found")

        print("\n" + "=" * 60)
        print("[SUCCESS] Checkout Terms Integration Test Completed!")
        print("\nNext Steps for Manual Testing:")
        print("1. Navigate to http://localhost:3000")
        print("2. Add products to cart")
        print("3. Proceed to checkout")
        print("4. On step 2 (Terms & Conditions), verify:")
        print("   - Terms content loads from rules engine")
        print("   - Checkbox appears with correct text")
        print("   - Cannot proceed without accepting terms")
        print("   - Acknowledgment is tracked in session")

        return True

    except Exception as e:
        print(f"\n[ERROR] Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_checkout_terms_integration()
    sys.exit(0 if success else 1)