"""
Test UserAcknowledgment model refactoring to use ActedRule
TDD RED Phase - Test should fail initially
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rules_engine.models import (
    ActedRule,
    MessageTemplate,
    UserAcknowledgment,
    RuleEntryPoint
)

User = get_user_model()


class TestUserAcknowledgmentRefactor(TestCase):
    """Test UserAcknowledgment works with ActedRule instead of obsolete Rule model"""
    
    def setUp(self):
        """Set up test data"""
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create entry point
        self.entry_point = RuleEntryPoint.objects.create(
            code='checkout_terms',  # Use valid entry point code
            name='Test Acknowledgment Entry Point',
            description='Test acknowledgment entry point',
            is_active=True
        )
        
        # Create message template
        self.template = MessageTemplate.objects.create(
            name='test_terms',
            title='Test Terms',
            content_format='json',
            content='Test terms and conditions',
            json_content={'message': 'Test terms and conditions'},
            message_type='terms'
        )
        
        # Create ActedRule
        self.acted_rule = ActedRule.objects.create(
            rule_id='test_rule_ack',
            name='Test Acknowledgment Rule',
            entry_point='checkout_terms',  # String reference to entry point code
            priority=10,
            active=True,
            condition={'type': 'always'},
            actions=[{
                'type': 'user_acknowledge',
                'template_id': 'test_terms'
            }]
        )
    
    def test_user_acknowledgment_with_acted_rule(self):
        """Test creating UserAcknowledgment with ActedRule"""
        # Create acknowledgment
        ack = UserAcknowledgment.objects.create(
            user=self.user,
            rule=self.acted_rule,
            message_template=self.template,
            acknowledgment_type='required',
            is_selected=True,
            ip_address='127.0.0.1',
            user_agent='Test Agent'
        )
        
        # Verify creation
        self.assertIsNotNone(ack.id)
        self.assertEqual(ack.user, self.user)
        self.assertEqual(ack.rule, self.acted_rule)
        self.assertEqual(ack.message_template, self.template)
        self.assertEqual(ack.acknowledgment_type, 'required')
        self.assertTrue(ack.is_selected)