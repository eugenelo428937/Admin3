"""
Stage 8: Rules Engine Serializers Tests
TDD RED Phase - Tests designed to fail initially until serializers are implemented

Tests cover:
- RuleEntryPoint serialization
- ActedRule serialization with conditions and actions
- MessageTemplate serialization with placeholders
- Validation and error handling
"""

import json
from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta

from rules_engine.models import (
    RuleEntryPoint,
    MessageTemplate,
    ActedRule,
    ActedRulesFields
)

# Import expected serializers (will fail initially - TDD RED)
try:
    from rules_engine.serializers import (
        RuleEntryPointSerializer,
        ActedRuleSerializer,
        MessageTemplateSerializer,
        RuleActionSerializer,
        RuleExecuteSerializer
    )
except ImportError:
    # Expected to fail in RED phase
    RuleEntryPointSerializer = None
    ActedRuleSerializer = None
    MessageTemplateSerializer = None
    RuleActionSerializer = None
    RuleExecuteSerializer = None


class TestRuleSerializers(TestCase):
    """Test serialization of rule engine models"""
    
    def setUp(self):
        """Set up test data"""
        # Create entry points
        self.checkout_entry = RuleEntryPoint.objects.create(
            name='checkout_terms',
            description='Checkout terms and conditions'
        )
        
        self.home_entry = RuleEntryPoint.objects.create(
            name='home_page_mount',
            description='Home page initialization'
        )
        
        # Create rules fields schema (standardized from Stage 2)
        self.checkout_fields = ActedRulesFields.objects.create(
            fields_id='checkout_context_v1',
            name='Checkout Context Schema',
            description='Schema for checkout process context validation',
            schema={
                'type': 'object',
                'properties': {                    
                    'cart': {
                        'type': 'object',
                        'properties': {
                            'id': {'type': 'integer'},
                            'user': {'type': ['integer', 'null']},
                            'session_key': {'type': ['string', 'null']},
                            'items': {
                                'type': 'array',
                                'item': {
                                    'type': 'object',
                                    'properties': {
                                        'id': {'type': 'integer'},
                                        'current_product': {'type': 'integer'},
                                        'product_id': {'type': 'integer'},
                                        'product_name': {'type': 'string'},
                                        'product_code': {'type': 'string'},
                                        'subject_code': {'type': 'string'},
                                        'exam_session_code': {'type': 'string'},
                                        'product_type': {'type': 'string'},
                                        'quantity': {'type': 'integer', 'minimum': 1},
                                        'price_type': {'type': 'string'},
                                        'actual_price': {'type': 'string'},
                                        'metadata': {
                                            'type': 'object',
                                            'properties': {
                                                'variationId': {'type': 'integer'},
                                                'variationName': {'type': 'string'}
                                            },
                                            'required': ['variationId']
                                        },
                                        'is_marking': {'type': 'boolean'},
                                        'has_expired_deadline': {'type': 'boolean'}
                                    },
                                    'required': ['id', 'current_product', 'product_type', 'quantity', 'price_type', 'actual_price', 'metadata']
                                }
                            },
                            'total': {'type': 'number', 'minimum': 0},
                            'created_at': {'type': 'string'},
                            'updated_at': {'type': 'string'},
                            'has_marking': {'type': 'boolean'},
                            'has_material': {'type': 'boolean'},
                            'has_tutorial': {'type': 'boolean'},
                        },
                        'required': ['id','user','session_key','items']
                    }
                },
                'required': ['cart']
            },
            version=1
        )
        
        # Create message templates
        self.deadline_template = MessageTemplate.objects.create(
            name='deadline_warning',
            title='Deadline Warning',
            content='Some deadlines has expired for {{cart.items.item.subject_code}}',
            content_format='text',
            message_type='warning',
            variables=['cart.items.item.subject_code']
        )
        
        self.terms_template = MessageTemplate.objects.create(
            name='checkout_terms',
            title='Checkout Terms',
            content='Please accept our terms for region {{user.region}}',
            json_content={
                'title': 'Terms & Conditions',
                'message': 'Please accept our terms for region {{user.region}}',
                'details': [
                    'Terms apply to all purchases',
                    'Region-specific regulations: {{user.region}}'
                ]
            },
            content_format='json',
            message_type='terms',
            variables=['user.region']
        )

    def test_entrypoint_serializer_output(self):
        """
        TDD RED: Test that RuleEntryPoint serializes correctly
        Expected to FAIL initially - no serializer implementation
        """
        if not RuleEntryPointSerializer:
            self.fail("RuleEntryPointSerializer not implemented yet")
        
        serializer = RuleEntryPointSerializer(self.checkout_entry)
        data = serializer.data
        
        # Verify serialized structure
        self.assertIn('id', data)
        self.assertIn('name', data)
        self.assertEqual(data['name'], 'checkout_terms')
        self.assertEqual(data['description'], 'Checkout terms and conditions')
        
        # Test serialization of multiple entry points
        serializer = RuleEntryPointSerializer([self.checkout_entry, self.home_entry], many=True)
        data = serializer.data
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['name'], 'checkout_terms')
        self.assertEqual(data[1]['name'], 'home_page_mount')

    def test_rule_serializer_includes_fields_conditions_actions(self):
        """
        TDD RED: Test that full rule is serialized with all components
        Expected to FAIL initially - no ActedRuleSerializer implementation
        """
        if not ActedRuleSerializer:
            self.fail("ActedRuleSerializer not implemented yet")
        
        # Create a comprehensive rule
        rule = ActedRule.objects.create(
            rule_id='test_full_rule',
            name='Full Test Rule',
            entry_point='checkout_terms',
            rules_fields_id='checkout_context_v1',
            condition={
                'and': [
                    {'==': [{'var': 'user.region'}, 'EU']},
                    {'>': [{'var': 'cart.total'}, 100]}
                ]
            },
            actions=[
                {
                    'type': 'display_message',
                    'templateName': 'deadline_warning',
                    'placement': 'top'
                },
                {
                    'type': 'user_acknowledge',
                    'templateName': 'checkout_terms',
                    'ackKey': 'eu_terms_v1',
                    'required': True
                }
            ],
            priority=10,
            active=True
        )
        
        serializer = ActedRuleSerializer(rule)
        data = serializer.data
        
        # Verify all fields are included
        self.assertIn('rule_id', data)
        self.assertIn('name', data)
        self.assertIn('entry_point', data)
        self.assertIn('fields', data)  # Should include the schema
        self.assertIn('conditions', data)  # Should rename 'condition' to 'conditions'
        self.assertIn('actions', data)
        self.assertIn('priority', data)
        self.assertIn('active', data)
        
        # Verify nested data
        self.assertEqual(data['rule_id'], 'test_full_rule')
        self.assertEqual(data['entry_point'], 'checkout_terms')
        self.assertIsInstance(data['conditions'], dict)
        self.assertIn('and', data['conditions'])
        self.assertEqual(len(data['actions']), 2)
        self.assertEqual(data['actions'][0]['type'], 'display_message')
        self.assertEqual(data['actions'][1]['type'], 'user_acknowledge')

    def test_action_serializer_message_template(self):
        """
        TDD RED: Test that action with template serializes placeholders correctly
        Expected to FAIL initially - no RuleActionSerializer implementation
        """
        if not RuleActionSerializer:
            self.fail("RuleActionSerializer not implemented yet")
        
        # Create action data with template reference
        action_data = {
            'type': 'display_message',
            'templateName': 'deadline_warning',
            'placement': 'banner',
            'priority': 'high',
            'dismissible': True
        }
        
        # Mock context for template rendering (standardized)
        context = {
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
                        'subject_code': 'CS101',
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
                'total': 35.00,
                'created_at': '2025-08-05T14:45:42.685123Z',
                'updated_at': '2025-08-08T15:39:05.464553Z',
                'has_marking': True,
                'has_material': False,
                'has_tutorial': False
            }
        }
        
        serializer = RuleActionSerializer(data=action_data, context={'template_context': context})
        
        # Validate and serialize
        self.assertTrue(serializer.is_valid(), f"Validation errors: {serializer.errors}")
        data = serializer.data
        
        # Verify template is included with placeholders
        self.assertIn('message', data)
        self.assertEqual(
            data['message'], 
            'Some deadlines has expired for {{cart.items.item.subject_code}}'
        )
        
        # Test with rendered template (if render_template option is passed)
        serializer = RuleActionSerializer(
            data=action_data, 
            context={'template_context': context, 'render_template': True}
        )
        self.assertTrue(serializer.is_valid())
        data = serializer.data
        
        # Should have rendered the placeholder
        self.assertIn('message', data)
        self.assertIn('CS101', data.get('rendered_message', ''))

    def test_invalid_serializer_rejects_missing_fields(self):
        """
        TDD RED: Test that serializer rejects invalid rule input
        Expected to FAIL initially - no validation implementation
        """
        if not ActedRuleSerializer:
            self.fail("ActedRuleSerializer not implemented yet")
        
        # Test missing required fields
        invalid_data = {
            'name': 'Invalid Rule'
            # Missing: rule_id, entry_point, condition, actions
        }
        
        serializer = ActedRuleSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        
        errors = serializer.errors
        self.assertIn('rule_id', errors)
        self.assertIn('entry_point', errors)
        self.assertIn('conditions', errors)
        self.assertIn('actions', errors)
        
        # Test invalid condition structure
        invalid_condition_data = {
            'rule_id': 'test_invalid',
            'name': 'Invalid Condition Rule',
            'entry_point': 'checkout_terms',
            'conditions': 'not a valid condition',  # Should be dict
            'actions': []
        }
        
        serializer = ActedRuleSerializer(data=invalid_condition_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('conditions', serializer.errors)
        
        # Test invalid action structure
        invalid_action_data = {
            'rule_id': 'test_invalid_action',
            'name': 'Invalid Action Rule',
            'entry_point': 'checkout_terms',
            'conditions': {'==': [1, 1]},
            'actions': [
                {
                    # Missing 'type' field
                    'templateName': 'some_template'
                }
            ]
        }
        
        serializer = ActedRuleSerializer(data=invalid_action_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('actions', serializer.errors)

    def test_rule_execute_serializer_validates_context(self):
        """
        TDD RED: Test that execute serializer validates context against schema
        Expected to FAIL initially - no RuleExecuteSerializer implementation
        """
        if not RuleExecuteSerializer:
            self.fail("RuleExecuteSerializer not implemented yet")
        
        # Valid execution request (standardized)
        valid_data = {
            'entry_point': 'checkout_terms',
            'context': {
                'cart': {
                    'id': 196,
                    'user': 123,
                    'session_key': None,
                    'items': [
                        {
                            'id': 425,
                            'current_product': 2763,
                            'product_id': 117,
                            'product_name': 'Series X Assignments (Marking)',
                            'product_code': 'X',
                            'subject_code': 'CS101',
                            'exam_session_code': '25A',
                            'product_type': 'marking',
                            'quantity': 1,
                            'price_type': 'standard',
                            'actual_price': '150.00',
                            'metadata': {
                                'variationId': 6,
                                'variationName': 'Marking Product'
                            },
                            'is_marking': True,
                            'has_expired_deadline': False
                        }
                    ],
                    'total': 150.00,
                    'created_at': '2025-08-05T14:45:42.685123Z',
                    'updated_at': '2025-08-08T15:39:05.464553Z',
                    'has_marking': True,
                    'has_material': False,
                    'has_tutorial': False
                }
            }
        }
        
        serializer = RuleExecuteSerializer(data=valid_data)
        self.assertTrue(serializer.is_valid(), f"Validation errors: {serializer.errors}")
        
        # Invalid context (missing required fields)
        invalid_data = {
            'entry_point': 'checkout_terms',
            'context': {
                # Missing 'cart' entirely which is required
            }
        }
        
        serializer = RuleExecuteSerializer(data=invalid_data)
        # Should validate against the schema
        self.assertFalse(serializer.is_valid())

    def test_message_template_serializer_formats(self):
        """
        TDD RED: Test MessageTemplate serialization for different formats
        Expected to FAIL initially - no MessageTemplateSerializer implementation
        """
        if not MessageTemplateSerializer:
            self.fail("MessageTemplateSerializer not implemented yet")
        
        # Test text format template
        text_serializer = MessageTemplateSerializer(self.deadline_template)
        text_data = text_serializer.data
        
        self.assertEqual(text_data['template_id'], 'deadline_warning')
        self.assertEqual(text_data['format'], 'text')
        self.assertIn('content', text_data)
        self.assertIn('{{cart.items.item.subject_code}}', text_data['content'])
        
        # Test JSON format template
        json_serializer = MessageTemplateSerializer(self.terms_template)
        json_data = json_serializer.data
        
        self.assertEqual(json_data['template_id'], 'checkout_terms')
        self.assertEqual(json_data['format'], 'json')
        self.assertIn('content_json', json_data)
        self.assertIsInstance(json_data['content_json'], dict)
        self.assertEqual(json_data['content_json']['title'], 'Terms & Conditions')

    def test_nested_rule_serialization(self):
        """
        TDD RED: Test complete nested serialization of rule with all relationships
        Expected to FAIL initially - no nested serialization implementation
        """
        if not ActedRuleSerializer:
            self.fail("ActedRuleSerializer not implemented yet")
        
        # Create rule with relationships
        rule = ActedRule.objects.create(
            rule_id='nested_test_rule',
            name='Nested Test Rule',
            entry_point='checkout_terms',
            rules_fields_id='checkout_context_v1',
            condition={'==': [{'var': 'user.region'}, 'EU']},
            actions=[
                {
                    'type': 'display_message',
                    'templateName': 'deadline_warning'
                }
            ],
            priority=5,
            active=True
        )
        
        serializer = ActedRuleSerializer(rule)
        data = serializer.data
        
        # Should include nested entry point data
        self.assertIsInstance(data['entry_point'], dict)
        self.assertEqual(data['entry_point']['name'], 'checkout_terms')
        
        # Should include nested fields schema
        self.assertIsInstance(data['fields'], dict)
        self.assertIn('schema', data['fields'])
        
        # Should include expanded action data with template info
        self.assertEqual(len(data['actions']), 1)
        action = data['actions'][0]
        self.assertIn('template', action)
        self.assertEqual(action['template']['template_id'], 'deadline_warning')

    def test_bulk_serialization_performance(self):
        """
        TDD RED: Test that serializer handles bulk operations efficiently
        Expected to FAIL initially - no bulk optimization
        """
        if not ActedRuleSerializer:
            self.fail("ActedRuleSerializer not implemented yet")
        
        # Create multiple rules
        rules = []
        for i in range(10):
            rule = ActedRule.objects.create(
                rule_id=f'bulk_rule_{i}',
                name=f'Bulk Rule {i}',
                entry_point='home_page_mount',
                rules_fields_id='checkout_context_v1',
                condition={'==': [1, 1]},
                actions=[],
                priority=i,
                active=True
            )
            rules.append(rule)
        
        # Test bulk serialization
        import time
        start_time = time.time()
        serializer = ActedRuleSerializer(rules, many=True)
        data = serializer.data
        duration = time.time() - start_time
        
        self.assertEqual(len(data), 10)
        # Should complete in reasonable time (< 100ms for 10 rules)
        self.assertLess(duration, 0.1, f"Bulk serialization took {duration}s")
        
        # Verify each rule is properly serialized
        for i, rule_data in enumerate(data):
            self.assertEqual(rule_data['rule_id'], f'bulk_rule_{i}')
            self.assertEqual(rule_data['priority'], i)