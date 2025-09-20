"""
Test user_preference action type in rules engine
Following strict TDD - RED phase: Writing failing tests first
"""
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from rules_engine.services.rule_engine import RuleEngine
from rules_engine.models import ActedRule, MessageTemplate, UserPreference
from rules_engine.services.action_handlers.user_preference_handler import UserPreferenceHandler  # Will fail initially

User = get_user_model()


class UserPreferenceActionTest(TestCase):
    """Test user_preference action type in rules engine"""

    def setUp(self):
        """Set up test data"""
        self.factory = RequestFactory()
        self.user = User.objects.create_user(
            username='testuser_pref_action',
            email='test@example.com'
        )
        self.rule_engine = RuleEngine()

        # Create a message template for preference
        self.template = MessageTemplate.objects.create(
            name='marketing_pref_template',
            title='Marketing Preferences',
            content='Choose your marketing preferences',
            content_format='json',
            json_content={
                'title': 'Marketing and other emails',
                'content': 'You can choose to receive marketing...',
                'input': {
                    'type': 'radio',
                    'options': [
                        {'value': 'yes', 'label': 'I am happy to receive marketing'},
                        {'value': 'no', 'label': "I don't want to receive marketing"}
                    ],
                    'default': 'yes'
                }
            },
            message_type='info'
        )

        # Create a preference rule
        self.pref_rule = ActedRule.objects.create(
            rule_id='marketing_preference_rule',
            name='Marketing Preference Rule',
            entry_point='checkout_preference',
            priority=10,
            active=True,
            condition={'type': 'always_true'},
            actions=[{
                'type': 'user_preference',
                'id': 'pref_marketing',
                'messageTemplateId': self.template.id,
                'preferenceKey': 'marketing_emails',
                'title': 'Marketing and other emails',
                'content': 'You can choose to receive marketing...',
                'inputType': 'radio',
                'options': [
                    {'value': 'yes', 'label': 'I am happy to receive marketing'},
                    {'value': 'no', 'label': "I don't want to receive marketing"}
                ],
                'default': 'yes',
                'required': False,
                'displayMode': 'inline',
                'blocking': False
            }]
        )

    def test_user_preference_handler_exists(self):
        """Test that UserPreferenceHandler exists"""
        handler = UserPreferenceHandler()
        self.assertIsNotNone(handler)

    def test_execute_preference_action_inline(self):
        """Test executing user_preference action with inline display"""
        context = {
            'user': {'id': self.user.id},
            'entryPoint': 'checkout_preference'
        }

        # Execute rules
        results = self.rule_engine.execute('checkout_preference', context)

        # Check that preference action was returned
        self.assertIn('preferences', results)
        self.assertEqual(len(results['preferences']), 1)

        preference = results['preferences'][0]
        self.assertEqual(preference['type'], 'user_preference')
        self.assertEqual(preference['displayMode'], 'inline')
        self.assertEqual(preference['preferenceKey'], 'marketing_emails')
        self.assertEqual(preference['inputType'], 'radio')
        self.assertFalse(preference['blocking'])
        self.assertFalse(preference['required'])

    def test_execute_preference_action_modal(self):
        """Test executing user_preference action with modal display"""
        # Create a modal preference rule
        modal_rule = ActedRule.objects.create(
            rule_id='modal_preference_rule',
            name='Modal Preference Rule',
            entry_point='checkout_preference',
            priority=20,
            active=True,
            condition={'type': 'always_true'},
            actions=[{
                'type': 'user_preference',
                'id': 'pref_communication',
                'preferenceKey': 'communication_channels',
                'title': 'Communication Preferences',
                'content': 'Select how you want us to contact you',
                'inputType': 'checkbox',
                'options': [
                    {'value': 'email', 'label': 'Email'},
                    {'value': 'sms', 'label': 'SMS'},
                    {'value': 'phone', 'label': 'Phone'},
                    {'value': 'post', 'label': 'Post'}
                ],
                'displayMode': 'modal',
                'blocking': True,
                'required': True
            }]
        )

        context = {
            'user': {'id': self.user.id},
            'entryPoint': 'checkout_preference'
        }

        # Execute rules
        results = self.rule_engine.execute('checkout_preference', context)

        # Find the modal preference
        modal_prefs = [p for p in results.get('preferences', []) if p['displayMode'] == 'modal']
        self.assertEqual(len(modal_prefs), 1)

        modal_pref = modal_prefs[0]
        self.assertEqual(modal_pref['preferenceKey'], 'communication_channels')
        self.assertEqual(modal_pref['inputType'], 'checkbox')
        self.assertTrue(modal_pref['blocking'])
        self.assertTrue(modal_pref['required'])

    def test_save_user_preference(self):
        """Test saving user preference through action handler"""
        handler = UserPreferenceHandler()

        # Prepare action data
        action = {
            'type': 'user_preference',
            'preferenceKey': 'test_preference',
            'value': {'choice': 'yes'},
            'inputType': 'radio'
        }

        context = {
            'user': {'id': self.user.id},
            'rule': self.pref_rule,
            'messageTemplate': self.template
        }

        # Save preference
        result = handler.save_preference(action, context)

        # Check that preference was saved
        self.assertTrue(result['success'])

        # Verify in database
        preference = UserPreference.objects.get(
            user=self.user,
            rule=self.pref_rule,
            preference_key='test_preference'
        )
        self.assertEqual(preference.preference_value['choice'], 'yes')
        self.assertEqual(preference.input_type, 'radio')

    def test_preference_with_text_input(self):
        """Test preference with text input type"""
        text_rule = ActedRule.objects.create(
            rule_id='text_preference_rule',
            name='Text Preference Rule',
            entry_point='checkout_preference',
            priority=30,
            active=True,
            condition={'type': 'always_true'},
            actions=[{
                'type': 'user_preference',
                'id': 'pref_special_instructions',
                'preferenceKey': 'special_instructions',
                'title': 'Special Instructions',
                'content': 'Any special requirements for your order?',
                'inputType': 'textarea',
                'placeholder': 'Enter your special instructions here...',
                'displayMode': 'inline',
                'required': False
            }]
        )

        context = {
            'user': {'id': self.user.id},
            'entryPoint': 'checkout_preference'
        }

        results = self.rule_engine.execute('checkout_preference', context)

        # Find text preference
        text_prefs = [p for p in results.get('preferences', [])
                     if p['inputType'] in ['text', 'textarea']]
        self.assertEqual(len(text_prefs), 1)

        text_pref = text_prefs[0]
        self.assertEqual(text_pref['preferenceKey'], 'special_instructions')
        self.assertEqual(text_pref['inputType'], 'textarea')
        self.assertIn('placeholder', text_pref)