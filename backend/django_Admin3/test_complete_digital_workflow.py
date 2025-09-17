#!/usr/bin/env python
"""
Complete End-to-End Test for Digital Consent Acknowledgment Workflow
Tests the entire flow from cart addition to order completion
"""
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from django.test import RequestFactory
from django.contrib.sessions.backends.db import SessionStore
from cart.models import Cart, CartItem, ActedOrder, OrderUserAcknowledgment
from exam_sessions_subjects_products.models import ExamSessionSubjectProduct
from cart.views import CartViewSet
from rules_engine.services.rule_engine import rule_engine
from rules_engine.models import ActedRule, MessageTemplate
import json

User = get_user_model()

class DigitalWorkflowTester:
    def __init__(self):
        self.factory = RequestFactory()
        self.cart_view = CartViewSet()
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }

    def log_result(self, test_name, passed, message=""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"    {message}")

        if passed:
            self.test_results['passed'] += 1
        else:
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"{test_name}: {message}")

    def test_cart_digital_detection(self):
        """Test 1: Cart digital product detection"""
        print("\n" + "="*60)
        print("TEST 1: Cart Digital Product Detection")
        print("="*60)

        # Get or create test user
        user, created = User.objects.get_or_create(
            username='workflow_test_user',
            defaults={'email': 'workflow@test.com', 'first_name': 'Workflow', 'last_name': 'Test'}
        )

        # Clear existing cart
        cart, _ = Cart.objects.get_or_create(user=user)
        cart.items.all().delete()
        cart.has_digital = False
        cart.save()

        # Test 1a: Add Online Classroom product
        oc_product = ExamSessionSubjectProduct.objects.filter(product__code='OC').first()
        if oc_product:
            cart_item_oc = CartItem.objects.create(
                cart=cart,
                product=oc_product,
                quantity=1,
                actual_price=100.00,
                metadata={'type': 'online_classroom'}
            )

            is_digital = self.cart_view._is_digital_product(cart_item_oc)
            self.log_result("OC Product Digital Detection", is_digital,
                          f"Product code 'OC' should be detected as digital")

            self.cart_view._update_cart_flags(cart)
            cart.refresh_from_db()
            self.log_result("Cart has_digital Flag Update", cart.has_digital,
                          f"Cart should have has_digital=True after adding OC product")

            cart_item_oc.delete()

        # Test 1b: Add eBook product
        any_product = ExamSessionSubjectProduct.objects.first()
        if any_product:
            cart_item_ebook = CartItem.objects.create(
                cart=cart,
                product=any_product,
                quantity=1,
                actual_price=50.00,
                metadata={'variationName': 'Vitalsource eBook', 'variationId': 123}
            )

            is_digital = self.cart_view._is_digital_product(cart_item_ebook)
            self.log_result("eBook Product Digital Detection", is_digital,
                          f"Variation 'Vitalsource eBook' should be detected as digital")

            self.cart_view._update_cart_flags(cart)
            cart.refresh_from_db()
            self.log_result("Cart has_digital Flag Update (eBook)", cart.has_digital,
                          f"Cart should have has_digital=True after adding eBook product")

        return cart, user

    def test_rules_execution(self, cart, user):
        """Test 2: Rules engine execution for checkout_terms"""
        print("\n" + "="*60)
        print("TEST 2: Rules Engine Execution")
        print("="*60)

        # Build context
        context = {
            'cart': {
                'id': cart.id,
                'user_id': user.id,
                'has_digital': cart.has_digital,
                'total': 50.00,
                'items': [
                    {
                        'id': cart.items.first().id if cart.items.exists() else 1,
                        'product_id': cart.items.first().product.product.id if cart.items.exists() else 1,
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
                'session_id': 'workflow_test_session'
            },
            'acknowledgments': {}
        }

        # Execute rules
        try:
            result = rule_engine.execute('checkout_terms', context)
            self.log_result("Rules Engine Execution Success", result.get('success', False),
                          f"Error: {result.get('error', 'None')}")

            # Check if digital consent rule triggered
            digital_rule_triggered = False
            tc_rule_triggered = False

            for rule_exec in result.get('rules_executed', []):
                if 'digital' in rule_exec.get('rule_id', '').lower():
                    digital_rule_triggered = rule_exec.get('condition_result', False)
                if 'terms' in rule_exec.get('rule_id', '').lower():
                    tc_rule_triggered = rule_exec.get('condition_result', False)

            self.log_result("Digital Consent Rule Triggered", digital_rule_triggered,
                          f"Digital consent rule should trigger when cart.has_digital=True")
            self.log_result("T&C Rule Triggered", tc_rule_triggered,
                          f"Terms & conditions rule should trigger")

            # Check messages
            messages = result.get('messages', [])
            digital_message = any('digital' in msg.get('ack_key', '').lower() for msg in messages)
            tc_message = any('terms' in msg.get('ack_key', '').lower() for msg in messages)

            self.log_result("Digital Consent Message Generated", digital_message,
                          f"Should generate message with digital ack_key")
            self.log_result("T&C Message Generated", tc_message,
                          f"Should generate message with terms ack_key")

            return result

        except Exception as e:
            self.log_result("Rules Engine Execution", False, f"Exception: {str(e)}")
            return None

    def test_acknowledgment_storage(self, cart, user, rules_result):
        """Test 3: Session acknowledgment storage and order transfer"""
        print("\n" + "="*60)
        print("TEST 3: Acknowledgment Storage and Transfer")
        print("="*60)

        # Create mock request with session
        request = self.factory.post('/cart/checkout/')
        session = SessionStore()
        session.create()
        request.session = session

        # Simulate user acknowledgments in session
        if rules_result:
            session_acks = []
            for message in rules_result.get('messages', []):
                if message.get('ack_key'):
                    session_acks.append({
                        'message_id': str(message.get('template_id', 'unknown')),
                        'ack_key': message.get('ack_key'),
                        'acknowledged': True,
                        'acknowledged_timestamp': '2025-01-01T10:00:00Z',
                        'entry_point_location': 'checkout_terms',
                        'ip_address': '127.0.0.1',
                        'user_agent': 'test-browser'
                    })

            request.session['user_acknowledgments'] = session_acks
            request.session.save()

            self.log_result("Session Acknowledgments Setup", len(session_acks) > 0,
                          f"Created {len(session_acks)} session acknowledgments")

            # Create test order
            order = ActedOrder.objects.create(user=user, total_amount=50.00)

            # Test acknowledgment transfer
            try:
                self.cart_view._transfer_session_acknowledgments_to_order(request, order, cart)

                # Check if acknowledgments were transferred
                order_acks = OrderUserAcknowledgment.objects.filter(order=order)
                self.log_result("Order Acknowledgments Created", order_acks.count() > 0,
                              f"Created {order_acks.count()} order acknowledgments")

                # Check if each acknowledgment was properly categorized
                digital_ack = order_acks.filter(rule_id__in=['12', 'digital_content_v1']).first()
                tc_ack = order_acks.filter(rule_id__in=['11', 'terms_conditions_v1']).first()

                self.log_result("Digital Content Acknowledgment Stored", digital_ack is not None,
                              f"Digital acknowledgment should be stored separately")
                self.log_result("T&C Acknowledgment Stored", tc_ack is not None,
                              f"T&C acknowledgment should be stored separately")

                if digital_ack:
                    self.log_result("Digital Acknowledgment Accepted", digital_ack.is_accepted,
                                  f"Digital acknowledgment should be marked as accepted")

                return order

            except Exception as e:
                self.log_result("Acknowledgment Transfer", False, f"Exception: {str(e)}")
                return order

    def test_rules_configuration(self):
        """Test 4: Rules and templates configuration"""
        print("\n" + "="*60)
        print("TEST 4: Rules and Templates Configuration")
        print("="*60)

        # Check digital consent rule
        digital_rule = ActedRule.objects.filter(name__icontains='Digital').first()
        if digital_rule:
            self.log_result("Digital Rule Exists", True, f"Found rule: {digital_rule.name}")
            self.log_result("Digital Rule Active", digital_rule.active,
                          f"Digital rule should be active")
            self.log_result("Digital Rule Entry Point", digital_rule.entry_point == 'checkout_terms',
                          f"Should use checkout_terms entry point")
            self.log_result("Digital Rule Fields ID", digital_rule.rules_fields_id == 'simple_checkout_v1',
                          f"Should use correct schema ID: {digital_rule.rules_fields_id}")

            # Check condition
            expected_condition = {'==': [{'var': 'cart.has_digital'}, True]}
            condition_correct = digital_rule.condition == expected_condition
            self.log_result("Digital Rule Condition", condition_correct,
                          f"Condition: {digital_rule.condition}")

            # Check template
            template_id = None
            for action in digital_rule.actions:
                if action.get('templateId'):
                    template_id = action['templateId']
                    break

            if template_id:
                template = MessageTemplate.objects.filter(id=template_id).first()
                self.log_result("Digital Template Exists", template is not None,
                              f"Template {template_id}: {template.title if template else 'Not found'}")
        else:
            self.log_result("Digital Rule Exists", False, "Digital consent rule not found")

        # Check T&C rule
        tc_rule = ActedRule.objects.filter(name__icontains='Terms').first()
        if tc_rule:
            self.log_result("T&C Rule Exists", True, f"Found rule: {tc_rule.name}")
            self.log_result("T&C Rule Active", tc_rule.active,
                          f"T&C rule should be active")
            self.log_result("T&C Rule Fields ID", tc_rule.rules_fields_id == 'simple_checkout_v1',
                          f"Should use correct schema ID: {tc_rule.rules_fields_id}")
        else:
            self.log_result("T&C Rule Exists", False, "T&C rule not found")

    def run_complete_workflow_test(self):
        """Run complete end-to-end workflow test"""
        print("DIGITAL CONSENT WORKFLOW - COMPLETE END-TO-END TEST")
        print("=" * 80)

        try:
            # Test 1: Cart digital detection
            cart, user = self.test_cart_digital_detection()

            # Test 2: Rules execution
            rules_result = self.test_rules_execution(cart, user)

            # Test 3: Acknowledgment storage
            if rules_result:
                order = self.test_acknowledgment_storage(cart, user, rules_result)
                if order:
                    order.delete()  # Clean up

            # Test 4: Configuration check
            self.test_rules_configuration()

            # Clean up
            cart.items.all().delete()
            cart.delete()
            user.delete()

            # Print summary
            print("\n" + "="*60)
            print("TEST SUMMARY")
            print("="*60)
            print(f"✅ Tests Passed: {self.test_results['passed']}")
            print(f"❌ Tests Failed: {self.test_results['failed']}")

            if self.test_results['errors']:
                print("\nERRORS:")
                for error in self.test_results['errors']:
                    print(f"  - {error}")

            success_rate = (self.test_results['passed'] / (self.test_results['passed'] + self.test_results['failed']) * 100) if (self.test_results['passed'] + self.test_results['failed']) > 0 else 0
            print(f"\nSuccess Rate: {success_rate:.1f}%")

            if success_rate >= 90:
                print("🎉 WORKFLOW IS WORKING CORRECTLY!")
            elif success_rate >= 70:
                print("⚠️ WORKFLOW HAS MINOR ISSUES")
            else:
                print("❌ WORKFLOW HAS MAJOR ISSUES")

        except Exception as e:
            print(f"❌ CRITICAL ERROR: {str(e)}")
            import traceback
            traceback.print_exc()

def main():
    """Run the complete workflow test"""
    tester = DigitalWorkflowTester()
    tester.run_complete_workflow_test()

if __name__ == '__main__':
    main()