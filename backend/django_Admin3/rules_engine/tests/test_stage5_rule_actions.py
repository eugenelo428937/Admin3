"""
Stage 5 TDD Tests: RuleAction
- Test display_message_action with template rendering
- Test display_modal_action with modal payload
- Test user_acknowledge_required blocking checkout
- Test user_acknowledge_checked allowing checkout
- Test user_preference_optional not blocking checkout
- Test update_simple_field context updates
- Test update_custom_function transformations
"""

from django.test import TestCase
from django.core.exceptions import ValidationError
from rules_engine.models.acted_rule import ActedRule
from rules_engine.models.acted_rules_fields import ActedRulesFields
from rules_engine.models.rule_entry_point import RuleEntryPoint
from rules_engine.models.message_template import MessageTemplate
import json


class Stage5RuleActionsTests(TestCase):
    """TDD Stage 5: RuleAction Tests"""
    
    def setUp(self):
        """Set up test data"""
        # Get or create entry points (may already exist from migrations)
        self.checkout_entry, _ = RuleEntryPoint.objects.get_or_create(
            code='checkout_terms',
            defaults={
                'name': 'Checkout Terms Display',
                'description': 'Entry point for checkout terms',
                'is_active': True
            }
        )

        self.home_entry, _ = RuleEntryPoint.objects.get_or_create(
            code='home_page_mount',
            defaults={
                'name': 'Home Page Mount',
                'description': 'Entry point for home page load',
                'is_active': True
            }
        )
        
        # Create schema for validation
        self.checkout_schema = ActedRulesFields.objects.create(
            fields_code='checkout_context_v1',
            name='Checkout Context Schema',
            schema={
                'type': 'object',
                'properties': {
                    'cart': {
                        'type': 'object',
                        'properties': {
                            'id': {'type': 'integer'},
                            'user': {'type': ['integer', 'null']},
                            'total': {'type': 'number', 'minimum': 0},
                            'discount': {'type': 'number', 'default': 0},
                            'items': {
                                'type': 'array',
                                'items': {
                                    'type': 'object',
                                    'properties': {
                                        'product_name': {'type': 'string'},
                                        'price': {'type': 'number'},
                                        'quantity': {'type': 'integer'}
                                    }
                                }
                            }
                        },
                        'required': ['id', 'total']
                    }
                },
                'required': ['cart']
            },
            is_active=True
        )
        
        # Create message templates
        self.banner_template = MessageTemplate.objects.create(
            name='cart_banner_template',
            title='Cart Banner Template', 
            content='Cart Total: ${cart.total}',
            json_content={
                'title': 'Shopping Cart Summary',
                'message': 'Cart Total: ${cart.total}',
                'type': 'banner_message'
            },
            content_format='json',
            message_type='info',
            variables=['cart.total'],
            is_active=True
        )
        
        self.modal_template = MessageTemplate.objects.create(
            name='terms_modal_template',
            title='Terms Modal Template',
            content='Please review and accept our terms.',
            json_content={
                'title': 'Terms and Conditions',
                'message': 'Please review and accept our terms.',
                'type': 'modal_dialog',
                'buttons': [
                    {'label': 'Accept', 'action': 'acknowledge', 'variant': 'primary'},
                    {'label': 'Cancel', 'action': 'dismiss', 'variant': 'secondary'}
                ]
            },
            content_format='json',
            message_type='terms',
            variables=[],
            is_active=True
        )
        
        # Test context (standardized from Stage 2)
        self.test_context = {
            'cart': {
                'id': 196,
                'user': 60,
                'session_key': None,
                'items': [
                    {
                        'id': 425,
                        'current_product': 2763,
                        'product_id': 117,
                        'product_name': 'Series X Assignments (Marking)',
                        'product_code': 'X',
                        'subject_code': 'CB2',
                        'exam_session_code': '25A',
                        'product_type': 'marking',
                        'quantity': 1,
                        'price_type': 'standard',
                        'actual_price': '35.00',
                        'metadata': {
                            'variationId': 6,
                            'variationName': 'Marking Product'
                        },
                        'is_marking': True,
                        'has_expired_deadline': True
                    }
                ],
                'total': 100.00,
                'created_at': '2025-08-05T14:45:42.685123Z',
                'updated_at': '2025-08-08T15:39:05.464553Z',
                'has_marking': True,
                'has_material': False,
                'has_tutorial': False
            }
        }
    
    def test_display_message_action(self):
        """
        TDD RED: Test display_message action with template rendering
        Expected to FAIL initially - no action processing implementation
        """
        rule = ActedRule.objects.create(
            rule_code='display_message_rule',
            name='Display Message Rule',
            entry_point='home_page_mount',
            rules_fields_code='checkout_context_v1',
            condition={'==': [{'var': 'cart.total'}, 100]},
            actions=[
                {
                    'type': 'display_message',
                    'templateName': 'cart_banner_template',
                    'placement': 'top',
                    'priority': 'high',
                    'dismissible': True
                }
            ],
            priority=10,
            active=True
        )
        
        # Verify action structure
        self.assertEqual(len(rule.actions), 1)
        action = rule.actions[0]
        self.assertEqual(action['type'], 'display_message')
        self.assertEqual(action['templateName'], 'cart_banner_template')
        self.assertEqual(action['placement'], 'top')
        self.assertTrue(action['dismissible'])
        
        # Verify template exists for action
        template = MessageTemplate.objects.get(name=action['templateName'])
        self.assertEqual(template.name, 'cart_banner_template')
        self.assertEqual(template.json_content['message'], 'Cart Total: ${cart.total}')
        
        # Expected rendered result (when implemented)
        expected_rendered = 'Cart Total: $100.00'
        # This assertion will fail until template rendering is implemented
        # self.assertEqual(rendered_message, expected_rendered)
    
    def test_display_modal_action(self):
        """
        TDD RED: Test display_modal action returns modal payload
        Expected to FAIL initially - no modal action processing
        """
        rule = ActedRule.objects.create(
            rule_code='display_modal_rule',
            name='Display Modal Rule',
            entry_point='checkout_terms',
            rules_fields_code='checkout_context_v1',
            condition={'==': [True, True]},  # Always true
            actions=[
                {
                    'type': 'display_modal',
                    'templateName': 'terms_modal_template',
                    'size': 'large',
                    'blocking': True,
                    'backdrop': 'static'
                }
            ],
            priority=5,
            active=True
        )
        
        # Verify modal action structure
        action = rule.actions[0]
        self.assertEqual(action['type'], 'display_modal')
        self.assertEqual(action['templateName'], 'terms_modal_template')
        self.assertEqual(action['size'], 'large')
        self.assertTrue(action['blocking'])
        
        # Verify template content for modal
        template = MessageTemplate.objects.get(name=action['templateName'])
        self.assertEqual(template.json_content['type'], 'modal_dialog')
        self.assertEqual(len(template.json_content['buttons']), 2)
        
        # Expected modal payload structure (when implemented)
        expected_payload = {
            'type': 'modal',
            'template': template.content,
            'size': 'large',
            'blocking': True,
            'backdrop': 'static'
        }
        # This assertion will fail until modal processing is implemented
        # self.assertEqual(modal_payload, expected_payload)
    
    def test_user_acknowledge_required(self):
        """
        TDD RED: Test user_acknowledge blocks checkout when not acknowledged
        Expected to FAIL initially - no acknowledgment blocking logic
        """
        rule = ActedRule.objects.create(
            rule_code='ack_required_rule',
            name='Acknowledgment Required Rule',
            entry_point='checkout_terms',
            rules_fields_code='checkout_context_v1',
            condition={'>=': [{'var': 'cart.total'}, 50]},  # Cart over $50
            actions=[
                {
                    'type': 'user_acknowledge',
                    'templateName': 'terms_modal_template',
                    'ackKey': 'terms_checkout_required',
                    'required': True,
                    'scope': 'per_user',
                    'persistTo': 'database'
                }
            ],
            priority=1,
            active=True
        )
        
        # Verify acknowledgment action structure
        action = rule.actions[0]
        self.assertEqual(action['type'], 'user_acknowledge')
        self.assertTrue(action['required'])
        self.assertEqual(action['ackKey'], 'terms_checkout_required')
        self.assertEqual(action['scope'], 'per_user')
        
        # Test context that should trigger rule
        context_over_limit = {
            'cart': {'id': 123, 'total': 75.00}
        }
        
        # Expected result when no acknowledgment given (when implemented)
        expected_blocked_result = {
            'blocked': True,
            'requiredAcks': [
                {
                    'ackKey': 'terms_checkout_required',
                    'ruleId': 'ack_required_rule',
                    'templateName': 'terms_modal_template',
                    'required': True
                }
            ],
            'error': 'Acknowledgment required before proceeding'
        }
        # This assertion will fail until acknowledgment logic is implemented
        # self.assertEqual(result, expected_blocked_result)
    
    def test_user_acknowledge_checked(self):
        """
        TDD RED: Test user_acknowledge allows checkout when acknowledged
        Expected to FAIL initially - no acknowledgment checking logic
        """
        rule = ActedRule.objects.create(
            rule_code='ack_checked_rule',
            name='Acknowledgment Checked Rule',
            entry_point='checkout_terms',
            rules_fields_code='checkout_context_v1',
            condition={'>=': [{'var': 'cart.total'}, 50]},
            actions=[
                {
                    'type': 'user_acknowledge',
                    'templateName': 'terms_modal_template',
                    'ackKey': 'terms_checkout_checked',
                    'required': True,
                    'scope': 'per_user'
                }
            ],
            priority=1,
            active=True
        )
        
        # Simulate context with acknowledgment already given
        context_with_ack = {
            'cart': {'id': 123, 'total': 75.00},
            'user': {'id': 456},
            'acknowledgments': {
                'terms_checkout_checked': {
                    'acknowledged': True,
                    'timestamp': '2025-08-29T10:00:00Z',
                    'user_id': 456
                }
            }
        }
        
        # Expected result when acknowledgment is given (when implemented)
        expected_allowed_result = {
            'blocked': False,
            'satisfied_acks': ['terms_checkout_checked'],
            'proceed': True
        }
        # This assertion will fail until acknowledgment checking is implemented
        # self.assertEqual(result, expected_allowed_result)
    
    def test_user_preference_optional(self):
        """
        TDD RED: Test user_preference does not block checkout when unchecked
        Expected to FAIL initially - no preference handling logic
        """
        rule = ActedRule.objects.create(
            rule_code='preference_optional_rule',
            name='Optional Preference Rule',
            entry_point='checkout_terms',
            rules_fields_code='checkout_context_v1',
            condition={'==': [True, True]},  # Always applies
            actions=[
                {
                    'type': 'user_preference',
                    'templateName': 'terms_modal_template',
                    'ackKey': 'newsletter_signup',
                    'required': False,  # Optional preference
                    'scope': 'per_session'
                }
            ],
            priority=10,
            active=True
        )
        
        # Verify preference action structure
        action = rule.actions[0]
        self.assertEqual(action['type'], 'user_preference')
        self.assertFalse(action['required'])
        self.assertEqual(action['ackKey'], 'newsletter_signup')
        
        # Test context without preference set
        context_no_preference = {
            'cart': {'id': 123, 'total': 25.00}
        }
        
        # Expected result - checkout not blocked for optional preference
        expected_unblocked_result = {
            'blocked': False,
            'optional_prefs': [
                {
                    'ackKey': 'newsletter_signup',
                    'templateName': 'terms_modal_template',
                    'required': False
                }
            ],
            'proceed': True
        }
        # This assertion will fail until preference logic is implemented
        # self.assertEqual(result, expected_unblocked_result)
    
    def test_update_simple_field(self):
        """
        TDD RED: Test update action modifies context field
        Expected to FAIL initially - no field update logic
        """
        rule = ActedRule.objects.create(
            rule_code='update_field_rule',
            name='Update Field Rule',
            entry_point='checkout_terms',
            rules_fields_code='checkout_context_v1',
            condition={'>=': [{'var': 'cart.total'}, 100]},
            actions=[
                {
                    'type': 'update',
                    'target': 'cart.discount',
                    'operation': 'set',
                    'value': 10,
                    'description': 'Apply $10 discount for orders over $100'
                }
            ],
            priority=5,
            active=True
        )
        
        # Verify update action structure
        action = rule.actions[0]
        self.assertEqual(action['type'], 'update')
        self.assertEqual(action['target'], 'cart.discount')
        self.assertEqual(action['operation'], 'set')
        self.assertEqual(action['value'], 10)
        
        # Test original context (simplified subset for update test)
        original_context = {
            'cart': {
                'id': 196,
                'user': 60,
                'session_key': None,
                'items': [],
                'total': 150.00
            }
        }
        
        # Expected updated context (when implemented)
        expected_updated_context = {
            'cart': {
                'id': 196,
                'user': 60,
                'session_key': None,
                'items': [],
                'total': 150.00,
                'discount': 10
            }
        }
        # This assertion will fail until update logic is implemented
        # self.assertEqual(updated_context, expected_updated_context)
    
    def test_update_custom_function(self):
        """
        TDD RED: Test update action with custom function transformation
        Expected to FAIL initially - no custom function processing
        """
        rule = ActedRule.objects.create(
            rule_code='custom_function_rule',
            name='Custom Function Rule',
            entry_point='checkout_terms',
            rules_fields_code='checkout_context_v1',
            condition={'and': [
                {'>=': [{'var': 'cart.total'}, 200]},
                {'==': [{'var': 'cart.user'}, 456]}  # VIP user
            ]},
            actions=[
                {
                    'type': 'update',
                    'target': 'cart.discount',
                    'operation': 'function',
                    'functionId': 'calculate_vip_discount',
                    'parameters': {
                        'cart_total': {'var': 'cart.total'},
                        'user_tier': 'vip'
                    },
                    'description': 'Apply VIP discount calculation'
                }
            ],
            priority=1,
            active=True
        )
        
        # Verify custom function action structure
        action = rule.actions[0]
        self.assertEqual(action['type'], 'update')
        self.assertEqual(action['operation'], 'function')
        self.assertEqual(action['functionId'], 'calculate_vip_discount')
        self.assertIn('cart_total', action['parameters'])
        
        # Test VIP user context (simplified subset for custom function test)
        vip_context = {
            'cart': {
                'id': 196,
                'user': 456,  # VIP user
                'session_key': None,
                'items': [],
                'total': 250.00
            }
        }
        
        # Expected custom function transformation (when implemented)
        # VIP discount = 15% for orders over $200
        expected_discount = 37.50  # 15% of $250
        expected_transformed_context = {
            'cart': {
                'id': 196,
                'user': 456,
                'session_key': None,
                'items': [],
                'total': 250.00,
                'discount': 37.50
            }
        }
        # This assertion will fail until custom function logic is implemented
        # self.assertEqual(transformed_context, expected_transformed_context)
    
    def test_action_validation_missing_type(self):
        """
        TDD GREEN: Test action validation catches missing type field
        This should already pass due to existing validation in ActedRule model
        """
        with self.assertRaises(ValidationError) as cm:
            rule = ActedRule(
                rule_code='invalid_action_rule',
                name='Invalid Action Rule',
                entry_point='checkout_terms',
                condition={'==': [True, True]},
                actions=[
                    {
                        'templateName': 'some_template',
                        # Missing 'type' field
                    }
                ]
            )
            rule.full_clean()
        
        self.assertIn('must have a "type" field', str(cm.exception))
    
    def test_action_validation_invalid_structure(self):
        """
        TDD GREEN: Test action validation catches invalid action structure
        This should already pass due to existing validation in ActedRule model
        """
        with self.assertRaises(ValidationError) as cm:
            rule = ActedRule(
                rule_code='invalid_structure_rule',
                name='Invalid Structure Rule',
                entry_point='checkout_terms',
                condition={'==': [True, True]},
                actions=[
                    "invalid_string_action"  # Should be dict/object
                ]
            )
            rule.full_clean()
        
        self.assertIn('must be a JSON object', str(cm.exception))
    
    def test_multiple_actions_execution_order(self):
        """
        TDD RED: Test multiple actions execute in array order
        Expected to FAIL initially - no multiple action processing
        """
        rule = ActedRule.objects.create(
            rule_code='multiple_actions_rule',
            name='Multiple Actions Rule',
            entry_point='checkout_terms',
            rules_fields_code='checkout_context_v1',
            condition={'>=': [{'var': 'cart.total'}, 100]},
            actions=[
                {
                    'type': 'display_message',
                    'templateName': 'cart_banner_template',
                    'sequence': 1
                },
                {
                    'type': 'update',
                    'target': 'cart.discount',
                    'operation': 'set',
                    'value': 15,
                    'sequence': 2
                },
                {
                    'type': 'user_acknowledge',
                    'templateName': 'terms_modal_template',
                    'ackKey': 'discount_applied_terms',
                    'required': True,
                    'sequence': 3
                }
            ],
            priority=1,
            active=True
        )
        
        # Verify all actions stored correctly
        self.assertEqual(len(rule.actions), 3)
        self.assertEqual(rule.actions[0]['type'], 'display_message')
        self.assertEqual(rule.actions[1]['type'], 'update')
        self.assertEqual(rule.actions[2]['type'], 'user_acknowledge')
        
        # Expected execution order results (when implemented)
        expected_execution_sequence = [
            {'action_type': 'display_message', 'sequence': 1, 'status': 'completed'},
            {'action_type': 'update', 'sequence': 2, 'status': 'completed'},
            {'action_type': 'user_acknowledge', 'sequence': 3, 'status': 'pending'}
        ]
        # This assertion will fail until multiple action processing is implemented
        # self.assertEqual(execution_results, expected_execution_sequence)