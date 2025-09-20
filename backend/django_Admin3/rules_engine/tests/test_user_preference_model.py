"""
Test UserPreference Model
Following strict TDD - RED phase: Writing failing tests first
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rules_engine.models import ActedRule, MessageTemplate
from rules_engine.models.user_preference import UserPreference  # This will fail initially

User = get_user_model()


class UserPreferenceModelTest(TestCase):
    """Test UserPreference model for storing user preferences with rules"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com'
        )

        # Create a test rule
        self.rule = ActedRule.objects.create(
            rule_id='test_preference_rule',
            name='Test Preference Rule',
            entry_point='checkout_preference',
            priority=10,
            active=True,
            condition={'type': 'always_true'},
            actions=[{
                'type': 'user_preference',
                'id': 'pref_marketing',
                'title': 'Marketing Preferences',
                'content': 'Choose your preferences',
                'input_type': 'radio',
                'options': [
                    {'value': 'yes', 'label': 'Yes, send me marketing'},
                    {'value': 'no', 'label': 'No marketing please'}
                ],
                'required': False,
                'display_mode': 'inline'
            }]
        )

        # Create a test message template
        self.template = MessageTemplate.objects.create(
            template_id='tmpl_marketing_pref',
            name='Marketing Preference Template',
            content_format='json',
            content={
                'title': 'Marketing Preferences',
                'content': 'Choose your marketing preferences'
            }
        )

    def test_create_user_preference(self):
        """Test creating a basic user preference"""
        preference = UserPreference.objects.create(
            user=self.user,
            rule=self.rule,
            message_template=self.template,
            preference_key='marketing_emails',
            preference_value={'choice': 'yes', 'timestamp': '2025-01-18T10:00:00Z'},
            input_type='radio'
        )

        self.assertEqual(preference.user, self.user)
        self.assertEqual(preference.rule, self.rule)
        self.assertEqual(preference.preference_key, 'marketing_emails')
        self.assertEqual(preference.preference_value['choice'], 'yes')
        self.assertEqual(preference.input_type, 'radio')

    def test_preference_input_types(self):
        """Test different input types for preferences"""
        # Test radio input
        pref_radio = UserPreference.objects.create(
            user=self.user,
            rule=self.rule,
            preference_key='pref_radio',
            preference_value={'choice': 'option1'},
            input_type='radio'
        )
        self.assertEqual(pref_radio.input_type, 'radio')

        # Test checkbox input
        pref_checkbox = UserPreference.objects.create(
            user=self.user,
            rule=ActedRule.objects.create(
                rule_id='test_checkbox_rule',
                name='Checkbox Rule',
                entry_point='checkout_preference',
                priority=20,
                active=True
            ),
            preference_key='pref_checkbox',
            preference_value={'selections': ['option1', 'option2']},
            input_type='checkbox'
        )
        self.assertEqual(pref_checkbox.input_type, 'checkbox')

        # Test text input
        pref_text = UserPreference.objects.create(
            user=self.user,
            rule=ActedRule.objects.create(
                rule_id='test_text_rule',
                name='Text Rule',
                entry_point='checkout_preference',
                priority=30,
                active=True
            ),
            preference_key='pref_text',
            preference_value={'text': 'User entered text'},
            input_type='text'
        )
        self.assertEqual(pref_text.input_type, 'text')

        # Test textarea input
        pref_textarea = UserPreference.objects.create(
            user=self.user,
            rule=ActedRule.objects.create(
                rule_id='test_textarea_rule',
                name='Textarea Rule',
                entry_point='checkout_preference',
                priority=40,
                active=True
            ),
            preference_key='pref_textarea',
            preference_value={'text': 'Multi\nline\ntext'},
            input_type='textarea'
        )
        self.assertEqual(pref_textarea.input_type, 'textarea')

    def test_preference_display_modes(self):
        """Test inline vs modal display modes"""
        # Test inline display
        pref_inline = UserPreference.objects.create(
            user=self.user,
            rule=self.rule,
            preference_key='inline_pref',
            preference_value={'choice': 'yes'},
            input_type='radio',
            display_mode='inline'
        )
        self.assertEqual(pref_inline.display_mode, 'inline')

        # Test modal display
        pref_modal = UserPreference.objects.create(
            user=self.user,
            rule=ActedRule.objects.create(
                rule_id='test_modal_rule',
                name='Modal Rule',
                entry_point='checkout_preference',
                priority=50,
                active=True
            ),
            preference_key='modal_pref',
            preference_value={'choice': 'no'},
            input_type='radio',
            display_mode='modal'
        )
        self.assertEqual(pref_modal.display_mode, 'modal')

    def test_preference_blocking_status(self):
        """Test blocking vs non-blocking preferences"""
        # Non-blocking preference (default)
        pref_non_blocking = UserPreference.objects.create(
            user=self.user,
            rule=self.rule,
            preference_key='non_blocking',
            preference_value={'choice': 'yes'},
            input_type='radio',
            is_blocking=False
        )
        self.assertFalse(pref_non_blocking.is_blocking)

        # Blocking preference
        pref_blocking = UserPreference.objects.create(
            user=self.user,
            rule=ActedRule.objects.create(
                rule_id='test_blocking_rule',
                name='Blocking Rule',
                entry_point='checkout_preference',
                priority=60,
                active=True
            ),
            preference_key='blocking_pref',
            preference_value={'choice': 'must_select'},
            input_type='radio',
            is_blocking=True
        )
        self.assertTrue(pref_blocking.is_blocking)

    def test_preference_with_session_data(self):
        """Test storing session data with preference"""
        preference = UserPreference.objects.create(
            user=self.user,
            rule=self.rule,
            preference_key='session_pref',
            preference_value={'choice': 'yes'},
            input_type='radio',
            ip_address='192.168.1.1',
            user_agent='Mozilla/5.0 Test Browser',
            session_data={
                'cart_id': 123,
                'checkout_step': 'preferences',
                'timestamp': '2025-01-18T10:00:00Z'
            }
        )

        self.assertEqual(preference.ip_address, '192.168.1.1')
        self.assertEqual(preference.user_agent, 'Mozilla/5.0 Test Browser')
        self.assertEqual(preference.session_data['cart_id'], 123)

    def test_preference_unique_constraint(self):
        """Test that each user can have one preference per rule and key"""
        # Create first preference
        UserPreference.objects.create(
            user=self.user,
            rule=self.rule,
            preference_key='unique_test',
            preference_value={'choice': 'first'},
            input_type='radio'
        )

        # Try to create duplicate - should raise IntegrityError
        with self.assertRaises(IntegrityError):
            UserPreference.objects.create(
                user=self.user,
                rule=self.rule,
                preference_key='unique_test',
                preference_value={'choice': 'second'},
                input_type='radio'
            )

    def test_preference_str_representation(self):
        """Test string representation of preference"""
        preference = UserPreference.objects.create(
            user=self.user,
            rule=self.rule,
            preference_key='marketing_emails',
            preference_value={'choice': 'yes'},
            input_type='radio'
        )

        expected = f"{self.user.username} preference for {self.rule.name}: marketing_emails"
        self.assertEqual(str(preference), expected)