"""
Test script for product_list_mount delivery message rule
TDD RED Phase - Create failing test first
"""
import json
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rules_engine.models import ActedRule, MessageTemplate

User = get_user_model()


class ProductListDeliveryRuleTest(TestCase):
    """Test the product_list_mount delivery message rule"""

    def setUp(self):
        """Set up test data"""
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_product_list_delivery_rule_exists(self):
        """Test that the delivery rule exists for product_list_mount entry point"""
        # This should fail initially (RED phase)
        delivery_rule = ActedRule.objects.filter(
            entry_point='product_list_mount',
            name__icontains='delivery',
            active=True
        ).first()

        self.assertIsNotNone(delivery_rule, "Delivery rule for product_list_mount should exist")
        self.assertEqual(delivery_rule.entry_point, 'product_list_mount')
        self.assertTrue(delivery_rule.active)

    def test_product_list_delivery_rule_has_correct_condition(self):
        """Test that the delivery rule has an always-true condition"""
        delivery_rule = ActedRule.objects.filter(
            entry_point='product_list_mount',
            name__icontains='delivery',
            active=True
        ).first()

        self.assertIsNotNone(delivery_rule)
        # The condition should always evaluate to true
        self.assertEqual(delivery_rule.condition, {"always": True})

    def test_product_list_delivery_rule_has_correct_action(self):
        """Test that the delivery rule has the correct display_message action"""
        delivery_rule = ActedRule.objects.filter(
            entry_point='product_list_mount',
            name__icontains='delivery',
            active=True
        ).first()

        self.assertIsNotNone(delivery_rule)

        # Check actions
        self.assertIsNotNone(delivery_rule.actions)
        self.assertIsInstance(delivery_rule.actions, list)
        self.assertEqual(len(delivery_rule.actions), 1)

        action = delivery_rule.actions[0]
        self.assertEqual(action['type'], 'display_message')
        self.assertIn('title', action)
        self.assertIn('content', action)
        self.assertEqual(action['title'], 'Delivery of study materials')

        expected_content = ("Please order your study materials well in advance of when you would like to use them. "
                          "Our materials are printed to order and even material despatched to the UK may take 2 weeks "
                          "or longer to be delivered. All of our printed products are also available as eBooks and so "
                          "you may wish to consider these to avoid delivery delays and any despatch costs. Orders for "
                          "eBooks are usually processed in 2-3 working days.")

        self.assertEqual(action['content'], expected_content)
        self.assertEqual(action.get('messageType', 'info'), 'info')
        self.assertEqual(action.get('display_type', 'alert'), 'alert')

    def test_product_list_delivery_rule_api_execution(self):
        """Test that the delivery rule executes correctly via API"""
        # First ensure the rule exists (will fail in RED phase)
        self.test_product_list_delivery_rule_exists()

        # Execute rules API call
        response = self.client.post('/api/rules/engine/execute/', {
            'entryPoint': 'product_list_mount',
            'context': {}  # No context required for always-true condition
        }, content_type='application/json')

        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertTrue(data['success'])
        self.assertGreater(data['rules_evaluated'], 0)
        self.assertIn('messages', data)
        self.assertIsInstance(data['messages'], list)
        self.assertGreater(len(data['messages']), 0)

        # Check the message content
        message = data['messages'][0]
        self.assertEqual(message['type'], 'display')
        self.assertIn('content', message)
        self.assertEqual(message['content']['title'], 'Delivery of study materials')
        self.assertIn('Please order your study materials well in advance', message['content']['message'])


if __name__ == '__main__':
    import os
    import sys
    import django

    # Add project root to path
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    # Setup Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_Admin3.settings.development')
    django.setup()

    # Run the test
    from django.test.utils import get_runner
    from django.conf import settings

    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(['__main__'])

    if failures:
        print(f"❌ Tests failed: {failures} failures")
        sys.exit(1)
    else:
        print("✅ All tests passed!")