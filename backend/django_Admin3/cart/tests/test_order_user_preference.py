"""
Test OrderUserPreference Model
Following strict TDD - RED phase: Writing failing tests first
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from cart.models import ActedOrder, OrderUserPreference  # This will fail initially
from rules_engine.models import ActedRule, MessageTemplate

User = get_user_model()


class OrderUserPreferenceModelTest(TestCase):
    """Test OrderUserPreference model for storing user preferences with orders"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser_order_pref',
            email='test@example.com'
        )

        # Create a test order
        self.order = ActedOrder.objects.create(
            user=self.user,
            total_amount=100.00
        )

        # Create a test rule
        self.rule = ActedRule.objects.create(
            rule_code='test_order_pref_rule',
            name='Test Order Preference Rule',
            entry_point='checkout_preference',
            priority=10,
            active=True,
            condition={'type': 'always_true'},
            actions=[{
                'type': 'user_preference',
                'id': 'pref_order_marketing',
                'title': 'Marketing Preferences',
                'content': 'Choose your preferences for this order',
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
            name='tmpl_order_marketing_pref',
            title='Marketing Preferences',
            content='Choose your marketing preferences for this order',
            content_format='json',
            message_type='info',
            json_content={
                'title': 'Marketing Preferences',
                'content': 'Choose your marketing preferences for this order'
            }
        )

    def test_create_order_user_preference(self):
        """Test creating a basic order user preference"""
        preference = OrderUserPreference.objects.create(
            order=self.order,
            rule=self.rule,
            template=self.template,
            preference_type='marketing',
            preference_key='marketing_emails',
            preference_value={'choice': 'yes', 'timestamp': '2025-01-18T10:00:00Z'},
            input_type='radio',
            title='Marketing Preferences',
            content_summary='User chose to receive marketing emails'
        )

        self.assertEqual(preference.order, self.order)
        self.assertEqual(preference.rule, self.rule)
        self.assertEqual(preference.preference_key, 'marketing_emails')
        self.assertEqual(preference.preference_value['choice'], 'yes')
        self.assertEqual(preference.input_type, 'radio')
        self.assertEqual(preference.preference_type, 'marketing')

    def test_preference_types(self):
        """Test different preference types for orders"""
        # Marketing preference
        pref_marketing = OrderUserPreference.objects.create(
            order=self.order,
            rule=self.rule,
            preference_type='marketing',
            preference_key='pref_marketing',
            preference_value={'choice': 'yes'},
            input_type='radio',
            title='Marketing Preferences'
        )
        self.assertEqual(pref_marketing.preference_type, 'marketing')

        # Communication preference
        pref_comm = OrderUserPreference.objects.create(
            order=self.order,
            rule=ActedRule.objects.create(
                rule_code='test_comm_rule',
                name='Communication Rule',
                entry_point='checkout_preference',
                priority=20,
                active=True,
                condition={'==': [True, True]},
                actions=[{'type': 'user_preference'}]
            ),
            preference_type='communication',
            preference_key='pref_comm',
            preference_value={'channel': 'email'},
            input_type='select',
            title='Communication Preferences'
        )
        self.assertEqual(pref_comm.preference_type, 'communication')

        # Delivery preference
        pref_delivery = OrderUserPreference.objects.create(
            order=self.order,
            rule=ActedRule.objects.create(
                rule_code='test_delivery_rule',
                name='Delivery Rule',
                entry_point='checkout_preference',
                priority=30,
                active=True,
                condition={'==': [True, True]},
                actions=[{'type': 'user_preference'}]
            ),
            preference_type='delivery',
            preference_key='pref_delivery',
            preference_value={'method': 'express'},
            input_type='radio',
            title='Delivery Preferences'
        )
        self.assertEqual(pref_delivery.preference_type, 'delivery')

        # Custom preference
        pref_custom = OrderUserPreference.objects.create(
            order=self.order,
            rule=ActedRule.objects.create(
                rule_code='test_custom_rule',
                name='Custom Rule',
                entry_point='checkout_preference',
                priority=40,
                active=True,
                condition={'==': [True, True]},
                actions=[{'type': 'user_preference'}]
            ),
            preference_type='custom',
            preference_key='pref_custom',
            preference_value={'data': 'custom_value'},
            input_type='text',
            title='Custom Preferences'
        )
        self.assertEqual(pref_custom.preference_type, 'custom')

    def test_preference_display_modes(self):
        """Test inline vs modal display modes for order preferences"""
        # Test inline display
        pref_inline = OrderUserPreference.objects.create(
            order=self.order,
            rule=self.rule,
            preference_key='inline_order_pref',
            preference_value={'choice': 'yes'},
            input_type='radio',
            display_mode='inline',
            title='Inline Preference'
        )
        self.assertEqual(pref_inline.display_mode, 'inline')

        # Test modal display
        pref_modal = OrderUserPreference.objects.create(
            order=self.order,
            rule=ActedRule.objects.create(
                rule_code='test_modal_order_rule',
                name='Modal Order Rule',
                entry_point='checkout_preference',
                priority=50,
                active=True,
                condition={'==': [True, True]},
                actions=[{'type': 'user_preference'}]
            ),
            preference_key='modal_order_pref',
            preference_value={'choice': 'no'},
            input_type='radio',
            display_mode='modal',
            title='Modal Preference'
        )
        self.assertEqual(pref_modal.display_mode, 'modal')

    def test_preference_is_submitted_status(self):
        """Test preference submission status"""
        # Submitted preference (default)
        pref_submitted = OrderUserPreference.objects.create(
            order=self.order,
            rule=self.rule,
            preference_key='submitted_pref',
            preference_value={'choice': 'yes'},
            input_type='radio',
            title='Submitted Preference',
            is_submitted=True
        )
        self.assertTrue(pref_submitted.is_submitted)

        # Not yet submitted preference
        pref_not_submitted = OrderUserPreference.objects.create(
            order=self.order,
            rule=ActedRule.objects.create(
                rule_code='test_not_submitted_rule',
                name='Not Submitted Rule',
                entry_point='checkout_preference',
                priority=60,
                active=True,
                condition={'==': [True, True]},
                actions=[{'type': 'user_preference'}]
            ),
            preference_key='not_submitted_pref',
            preference_value={},
            input_type='radio',
            title='Not Submitted Preference',
            is_submitted=False
        )
        self.assertFalse(pref_not_submitted.is_submitted)

    def test_preference_with_session_data(self):
        """Test storing session data with order preference"""
        preference = OrderUserPreference.objects.create(
            order=self.order,
            rule=self.rule,
            preference_key='session_order_pref',
            preference_value={'choice': 'yes'},
            input_type='radio',
            title='Session Preference',
            ip_address='192.168.1.1',
            user_agent='Mozilla/5.0 Test Browser',
            rules_engine_context={
                'user_id': self.user.id,
                'checkout_step': 'preferences',
                'timestamp': '2025-01-18T10:00:00Z'
            }
        )

        self.assertEqual(preference.ip_address, '192.168.1.1')
        self.assertEqual(preference.user_agent, 'Mozilla/5.0 Test Browser')
        self.assertEqual(preference.rules_engine_context['user_id'], self.user.id)

    def test_preference_unique_constraint(self):
        """Test that each order can have one preference per rule and key"""
        # Create first preference
        OrderUserPreference.objects.create(
            order=self.order,
            rule=self.rule,
            preference_key='unique_order_test',
            preference_value={'choice': 'first'},
            input_type='radio',
            title='Unique Test'
        )

        # Try to create duplicate - should raise IntegrityError
        with self.assertRaises(IntegrityError):
            OrderUserPreference.objects.create(
                order=self.order,
                rule=self.rule,
                preference_key='unique_order_test',
                preference_value={'choice': 'second'},
                input_type='radio',
                title='Unique Test Duplicate'
            )

    def test_preference_str_representation(self):
        """Test string representation of order preference"""
        preference = OrderUserPreference.objects.create(
            order=self.order,
            rule=self.rule,
            preference_key='marketing_emails',
            preference_value={'choice': 'yes'},
            input_type='radio',
            title='Marketing Preferences'
        )

        expected = f"Order #{self.order.id} preference: marketing_emails"
        self.assertEqual(str(preference), expected)

    def test_get_display_value_method(self):
        """Test get_display_value method for different input types"""
        # Radio input
        pref_radio = OrderUserPreference.objects.create(
            order=self.order,
            rule=self.rule,
            preference_key='radio_pref',
            preference_value={'choice': 'option1'},
            input_type='radio',
            title='Radio Preference'
        )
        self.assertEqual(pref_radio.get_display_value(), 'option1')

        # Checkbox input
        pref_checkbox = OrderUserPreference.objects.create(
            order=self.order,
            rule=ActedRule.objects.create(
                rule_code='test_checkbox_order_rule',
                name='Checkbox Order Rule',
                entry_point='checkout_preference',
                priority=70,
                active=True,
                condition={'==': [True, True]},
                actions=[{'type': 'user_preference'}]
            ),
            preference_key='checkbox_pref',
            preference_value={'selections': ['opt1', 'opt2', 'opt3']},
            input_type='checkbox',
            title='Checkbox Preference'
        )
        self.assertEqual(pref_checkbox.get_display_value(), 'opt1, opt2, opt3')

        # Text input
        pref_text = OrderUserPreference.objects.create(
            order=self.order,
            rule=ActedRule.objects.create(
                rule_code='test_text_order_rule',
                name='Text Order Rule',
                entry_point='checkout_preference',
                priority=80,
                active=True,
                condition={'==': [True, True]},
                actions=[{'type': 'user_preference'}]
            ),
            preference_key='text_pref',
            preference_value={'text': 'User entered text'},
            input_type='text',
            title='Text Preference'
        )
        self.assertEqual(pref_text.get_display_value(), 'User entered text')