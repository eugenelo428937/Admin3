"""
Stage 9: Rules Engine Views Tests
TDD RED Phase - Tests designed to fail initially until views are implemented

Tests cover:
- GET rules by entrypoint
- POST rule creation
- Rule execution endpoint
- Acknowledgment handling
- Validation and error responses
"""

import json
from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from rules_engine.models import (
    RuleEntryPoint,
    MessageTemplate,
    ActedRule,
    ActedRulesFields
)

# Import expected models that don't exist yet
try:
    from rules_engine.models import ActedRuleExecution
except ImportError:
    ActedRuleExecution = None

User = get_user_model()


class TestRuleViews(TestCase):
    """Test rules engine API views"""
    
    def setUp(self):
        """Set up test data and client"""
        self.client = APIClient()
        
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create entry points
        self.checkout_entry = RuleEntryPoint.objects.create(
            name='checkout_terms',
            code='checkout_terms',
            description='Checkout terms and conditions'
        )
        
        self.home_entry = RuleEntryPoint.objects.create(
            name='home_page_mount',
            code='home_page_mount',
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
        self.terms_template = MessageTemplate.objects.create(
            name='checkout_terms_modal',
            title='Checkout Terms Modal',
            content='Please accept our terms to continue',
            json_content={
                'title': 'Terms & Conditions',
                'message': 'Please accept our terms to continue',
                'buttons': [
                    {'label': 'Accept', 'action': 'acknowledge'}
                ]
            },
            content_format='json',
            message_type='terms',
            variables=[]
        )
        
        self.deadline_template = MessageTemplate.objects.create(
            name='deadline_warning',
            title='Deadline Warning',
            content='Deadline expired for {{cart.items.item.subject_code}}',
            content_format='text',
            message_type='warning',
            variables=['cart.items.item.subject_code']
        )

    def test_get_rules_for_entrypoint(self):
        """
        TDD RED: Test API returns rules for specific entrypoint
        Expected to FAIL initially - no view implementation
        """
        # Create test rules
        rule1 = ActedRule.objects.create(
            rule_code='checkout_rule_1',
            name='Checkout Rule 1',
            entry_point='checkout_terms',
            rules_fields_id='checkout_context_v1',
            condition={'==': [{'var': 'user.region'}, 'EU']},
            actions=[
                {
                    'type': 'display_message',
                    'templateName': 'checkout_terms_modal'
                }
            ],
            priority=10,
            active=True
        )
        
        rule2 = ActedRule.objects.create(
            rule_code='checkout_rule_2',
            name='Checkout Rule 2',
            entry_point='checkout_terms',
            rules_fields_id='checkout_context_v1',
            condition={'==': [{'var': 'user.region'}, 'US']},
            actions=[],
            priority=20,
            active=True
        )
        
        # Different entry point rule (should not be returned)
        rule3 = ActedRule.objects.create(
            rule_code='home_rule_1',
            name='Home Rule 1',
            entry_point='home_page_mount',
            rules_fields_id='checkout_context_v1',
            condition={'==': [1, 1]},
            actions=[],
            priority=10,
            active=True
        )
        
        # Test GET request
        url = reverse('rules-by-entrypoint', args=['checkout_terms'])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Should return only checkout_terms rules
        self.assertEqual(len(data), 2)
        rule_ids = [rule['rule_id'] for rule in data]
        self.assertIn('checkout_rule_1', rule_ids)
        self.assertIn('checkout_rule_2', rule_ids)
        self.assertNotIn('home_rule_1', rule_ids)
        
        # Should be ordered by priority
        self.assertEqual(data[0]['priority'], 10)
        self.assertEqual(data[1]['priority'], 20)

    def test_post_rule_creates_rule(self):
        """
        TDD RED: Test API allows rule creation
        Expected to FAIL initially - no POST view implementation
        """
        self.client.force_authenticate(user=self.user)
        
        rule_data = {
            'rule_id': 'new_checkout_rule',
            'name': 'New Checkout Rule',
            'entry_point': 'checkout_terms',
            'rules_fields_id': 'checkout_context_v1',
            'conditions': {  # Note: 'conditions' in API, 'condition' in model
                '==': [{'var': 'cart.total'}, 100]
            },
            'actions': [
                {
                    'type': 'display_message',
                    'templateName': 'deadline_warning',
                    'placement': 'top'
                }
            ],
            'priority': 15,
            'active': True
        }
        
        url = reverse('rules-create')
        response = self.client.post(url, rule_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify rule was created in database
        rule = ActedRule.objects.get(rule_code='new_checkout_rule')
        self.assertEqual(rule.name, 'New Checkout Rule')
        self.assertEqual(rule.entry_point, 'checkout_terms')
        self.assertEqual(rule.priority, 15)
        self.assertTrue(rule.active)
        
        # Verify response contains created rule
        response_data = response.json()
        self.assertEqual(response_data['rule_id'], 'new_checkout_rule')
        self.assertIn('id', response_data)  # Should include DB ID

    def test_post_rule_invalid_schema(self):
        """
        TDD RED: Test API rejects invalid rule input
        Expected to FAIL initially - no validation implementation
        """
        self.client.force_authenticate(user=self.user)
        
        # Missing required condition field
        invalid_data = {
            'rule_id': 'invalid_rule',
            'name': 'Invalid Rule',
            'entry_point': 'checkout_terms',
            # Missing: conditions
            'actions': []
        }
        
        url = reverse('rules-create')
        response = self.client.post(url, invalid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        errors = response.json()
        self.assertIn('conditions', errors)
        
        # Invalid condition structure
        invalid_condition_data = {
            'rule_id': 'invalid_condition_rule',
            'name': 'Invalid Condition Rule',
            'entry_point': 'checkout_terms',
            'conditions': 'not a valid condition',  # Should be dict
            'actions': []
        }
        
        response = self.client.post(url, invalid_condition_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_execute_rule_endpoint(self):
        """
        TDD RED: Test execute rules for given context
        Expected to FAIL initially - no execute endpoint implementation
        """
        # Create rule with marking deadline condition
        rule = ActedRule.objects.create(
            rule_code='marking_deadline_rule',
            name='Marking Deadline Rule',
            entry_point='checkout_terms',
            rules_fields_id='checkout_context_v1',
            condition={
                'and': [
                    {'==': [{'var': 'cart.items.0.item.is_marking'}, True]},
                    {'==': [{'var': 'cart.items.0.item.has_expired_deadline'}, True]}
                ]
            },
            actions=[
                {
                    'type': 'display_message',
                    'templateName': 'deadline_warning',
                    'placement': 'banner',
                    'priority': 'high'
                }
            ],
            priority=10,
            active=True
        )
        
        # Execute with matching context (standardized)
        execute_data = {
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
                            'has_expired_deadline': True
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
        
        url = reverse('rules-execute')
        response = self.client.post(url, execute_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Should return actions to execute
        self.assertIn('actions', data)
        self.assertEqual(len(data['actions']), 1)
        
        action = data['actions'][0]
        self.assertEqual(action['type'], 'display_message')
        self.assertEqual(action['templateId'], 'deadline_warning')
        
        # Should include rendered message
        self.assertIn('message', action)
        self.assertIn('CS101', action['message'])

    def test_acknowledge_rule_blocks_checkout(self):
        """
        TDD RED: Test checkout blocked when acknowledgment not given
        Expected to FAIL initially - no acknowledgment handling
        """
        # Create rule requiring acknowledgment
        rule = ActedRule.objects.create(
            rule_code='terms_ack_required',
            name='Terms Acknowledgment Required',
            entry_point='checkout_terms',
            rules_fields_id='checkout_context_v1',
            condition={'==': [1, 1]},  # Always true
            actions=[
                {
                    'type': 'user_acknowledge',
                    'templateName': 'checkout_terms_modal',
                    'ackKey': 'checkout_terms_v1',
                    'required': True,
                    'blocking': True
                }
            ],
            priority=1,
            active=True
        )
        
        # Execute without acknowledgment (standardized)
        execute_data = {
            'entry_point': 'checkout_terms',
            'context': {
                'cart': {
                    'id': 196,
                    'user': 123,
                    'session_key': None,
                    'items': [],
                    'total': 100.00,
                    'created_at': '2025-08-05T14:45:42.685123Z',
                    'updated_at': '2025-08-08T15:39:05.464553Z',
                    'has_marking': False,
                    'has_material': False,
                    'has_tutorial': False
                }
                # No acknowledgments provided
            }
        }
        
        url = reverse('rules-execute')
        response = self.client.post(url, execute_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Should indicate checkout is blocked
        self.assertIn('blocked', data)
        self.assertTrue(data['blocked'])
        
        # Should include required acknowledgments
        self.assertIn('required_acknowledgments', data)
        self.assertEqual(len(data['required_acknowledgments']), 1)
        self.assertEqual(data['required_acknowledgments'][0]['ackKey'], 'checkout_terms_v1')

    def test_acknowledge_rule_allows_checkout(self):
        """
        TDD RED: Test checkout allowed when acknowledgment is given
        Expected to FAIL initially - no acknowledgment processing
        """
        # Create rule requiring acknowledgment
        rule = ActedRule.objects.create(
            rule_code='terms_ack_required',
            name='Terms Acknowledgment Required',
            entry_point='checkout_terms',
            rules_fields_id='checkout_context_v1',
            condition={'==': [1, 1]},  # Always true
            actions=[
                {
                    'type': 'user_acknowledge',
                    'templateName': 'checkout_terms_modal',
                    'ackKey': 'checkout_terms_v1',
                    'required': True,
                    'blocking': True
                }
            ],
            priority=1,
            active=True
        )
        
        # First, submit acknowledgment
        ack_data = {
            'ackKey': 'checkout_terms_v1',
            'accepted': True,
            'user_id': 'user123'
        }
        
        ack_url = reverse('rules-acknowledge')
        ack_response = self.client.post(ack_url, ack_data, format='json')
        self.assertEqual(ack_response.status_code, status.HTTP_200_OK)
        
        # Now execute with acknowledgment in context (standardized)
        execute_data = {
            'entry_point': 'checkout_terms',
            'context': {
                'cart': {
                    'id': 196,
                    'user': 123,
                    'session_key': None,
                    'items': [],
                    'total': 100.00,
                    'created_at': '2025-08-05T14:45:42.685123Z',
                    'updated_at': '2025-08-08T15:39:05.464553Z',
                    'has_marking': False,
                    'has_material': False,
                    'has_tutorial': False
                },
                'acknowledgments': {
                    'checkout_terms_v1': True
                }
            }
        }
        
        url = reverse('rules-execute')
        response = self.client.post(url, execute_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Should indicate checkout is NOT blocked
        self.assertIn('blocked', data)
        self.assertFalse(data['blocked'])
        
        # Should not have required acknowledgments
        self.assertIn('required_acknowledgments', data)
        self.assertEqual(len(data['required_acknowledgments']), 0)

    def test_rule_execution_logged(self):
        """
        TDD RED: Test that rule executions are logged to database
        Expected to FAIL initially - no execution logging
        """
        if not ActedRuleExecution:
            self.fail("ActedRuleExecution model not implemented yet")
        
        # Create rule
        rule = ActedRule.objects.create(
            rule_code='logged_rule',
            name='Logged Rule',
            entry_point='checkout_terms',
            rules_fields_id='checkout_context_v1',
            condition={'==': [{'var': 'user.region'}, 'EU']},
            actions=[
                {
                    'type': 'display_message',
                    'templateName': 'deadline_warning'
                }
            ],
            priority=10,
            active=True
        )
        
        # Execute rule (standardized)
        execute_data = {
            'entry_point': 'checkout_terms',
            'context': {
                'cart': {
                    'id': 196,
                    'user': 123,
                    'session_key': None,
                    'items': [],
                    'total': 100.00,
                    'created_at': '2025-08-05T14:45:42.685123Z',
                    'updated_at': '2025-08-08T15:39:05.464553Z',
                    'has_marking': False,
                    'has_material': False,
                    'has_tutorial': False
                }
            }
        }
        
        # Count executions before
        initial_count = ActedRuleExecution.objects.count()
        
        url = reverse('rules-execute')
        response = self.client.post(url, execute_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify execution was logged
        new_count = ActedRuleExecution.objects.count()
        self.assertEqual(new_count, initial_count + 1)
        
        # Get the logged execution
        execution = ActedRuleExecution.objects.latest('created_at')
        self.assertEqual(execution.rule_id, 'logged_rule')
        self.assertEqual(execution.entry_point, 'checkout_terms')
        self.assertEqual(execution.context_snapshot['user']['region'], 'EU')
        self.assertTrue(execution.condition_result)
        self.assertTrue(execution.success)

    def test_get_rules_pagination(self):
        """
        TDD RED: Test pagination for rules list endpoint
        Expected to FAIL initially - no pagination implementation
        """
        # Create many rules
        for i in range(25):
            ActedRule.objects.create(
                rule_code=f'pagination_rule_{i}',
                name=f'Pagination Rule {i}',
                entry_point='checkout_terms',
                rules_fields_id='checkout_context_v1',
                condition={'==': [1, 1]},
                actions=[],
                priority=i,
                active=True
            )
        
        # Test first page
        url = reverse('rules-by-entrypoint', args=['checkout_terms'])
        response = self.client.get(url, {'page': 1, 'page_size': 10})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        
        # Should have pagination metadata
        self.assertIn('results', data)
        self.assertIn('count', data)
        self.assertIn('next', data)
        self.assertIn('previous', data)
        
        self.assertEqual(len(data['results']), 10)
        self.assertEqual(data['count'], 25)
        self.assertIsNotNone(data['next'])
        self.assertIsNone(data['previous'])
        
        # Test second page
        response = self.client.get(url, {'page': 2, 'page_size': 10})
        data = response.json()
        
        self.assertEqual(len(data['results']), 10)
        self.assertIsNotNone(data['previous'])

    def test_update_rule_endpoint(self):
        """
        TDD RED: Test updating existing rule via API
        Expected to FAIL initially - no update endpoint
        """
        self.client.force_authenticate(user=self.user)
        
        # Create initial rule
        rule = ActedRule.objects.create(
            rule_code='update_test_rule',
            name='Original Name',
            entry_point='checkout_terms',
            rules_fields_id='checkout_context_v1',
            condition={'==': [1, 1]},
            actions=[],
            priority=10,
            active=True
        )
        
        # Update data
        update_data = {
            'name': 'Updated Name',
            'priority': 20,
            'active': False,
            'conditions': {'==': [2, 2]}
        }
        
        url = reverse('rules-detail', args=[rule.rule_id])
        response = self.client.patch(url, update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify updates in database
        rule.refresh_from_db()
        self.assertEqual(rule.name, 'Updated Name')
        self.assertEqual(rule.priority, 20)
        self.assertFalse(rule.active)
        self.assertEqual(rule.condition, {'==': [2, 2]})

    def test_delete_rule_endpoint(self):
        """
        TDD RED: Test soft-delete of rule via API
        Expected to FAIL initially - no delete endpoint
        """
        self.client.force_authenticate(user=self.user)
        
        # Create rule to delete
        rule = ActedRule.objects.create(
            rule_code='delete_test_rule',
            name='Rule to Delete',
            entry_point='checkout_terms',
            rules_fields_id='checkout_context_v1',
            condition={'==': [1, 1]},
            actions=[],
            priority=10,
            active=True
        )
        
        url = reverse('rules-detail', args=[rule.rule_id])
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify soft delete (rule still exists but inactive)
        rule.refresh_from_db()
        self.assertFalse(rule.active)
        
        # Should not appear in list endpoint
        list_url = reverse('rules-by-entrypoint', args=['checkout_terms'])
        list_response = self.client.get(list_url)
        data = list_response.json()
        
        rule_ids = [r['rule_id'] for r in data]
        self.assertNotIn('delete_test_rule', rule_ids)