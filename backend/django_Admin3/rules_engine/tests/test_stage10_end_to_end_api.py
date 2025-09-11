"""
Stage 10: End-to-End API Flow Tests
TDD RED Phase - Tests designed to fail initially until complete API implementation

Tests cover:
- Complete checkout flow with terms acknowledgment
- User preference collection flow
- Context update via rules
- Rule chaining through API
"""

import json
from django.test import TestCase, TransactionTestCase
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
    from rules_engine.models import RuleExecution, UserAcknowledgment
except ImportError:
    RuleExecution = None
    UserAcknowledgment = None

User = get_user_model()


class TestEndToEndAPIFlows(TransactionTestCase):
    """Test complete end-to-end flows through the API"""
    
    def setUp(self):
        """Set up test data and client"""
        self.client = APIClient()
        
        # Create test users
        self.eu_user = User.objects.create_user(
            username='eu_user',
            email='eu@example.com',
            password='testpass123'
        )
        
        self.us_user = User.objects.create_user(
            username='us_user',
            email='us@example.com',
            password='testpass123'
        )
        
        # Create entry points
        RuleEntryPoint.objects.create(
            name='checkout_terms',
            code='checkout_terms',
            description='Checkout terms and conditions'
        )
        
        RuleEntryPoint.objects.create(
            name='home_page_mount',
            code='home_page_mount',
            description='Home page initialization'
        )
        
        RuleEntryPoint.objects.create(
            name='cart_update',
            code='cart_update',
            description='Cart update hooks'
        )
        
        # Create comprehensive schema (standardized from Stage 2)
        self.full_schema = ActedRulesFields.objects.create(
            fields_id='full_context_v1',
            name='Full Context Schema',
            description='Comprehensive schema for all context validation',
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
                            'discount': {'type': 'number', 'default': 0},
                            'created_at': {'type': 'string'},
                            'updated_at': {'type': 'string'},
                            'has_marking': {'type': 'boolean'},
                            'has_material': {'type': 'boolean'},
                            'has_tutorial': {'type': 'boolean'},
                        },
                        'required': ['id','user','session_key','items']
                    },
                    'user': {
                        'type': 'object',
                        'properties': {
                            'id': {'type': 'string'},
                            'region': {'type': 'string'},
                            'preferences': {
                                'type': 'object',
                                'properties': {
                                    'newsletter': {'type': 'boolean'},
                                    'promotions': {'type': 'boolean'}
                                }
                            }
                        }
                    },
                    'acknowledgments': {
                        'type': 'object',
                        'additionalProperties': {'type': 'boolean'}
                    }
                },
                'required': ['cart']
            },
            version=1
        )
        
        # Create message templates
        self.eu_terms_template = MessageTemplate.objects.create(
            name='eu_checkout_terms',
            title='EU Checkout Terms',
            content='GDPR compliant terms for EU region',
            json_content={
                'title': 'EU Terms & Conditions',
                'message': 'GDPR compliant terms for EU region',
                'details': [
                    'Data protection rights',
                    'Cookie policy',
                    'Right to erasure'
                ],
                'buttons': [
                    {'label': 'Accept', 'action': 'acknowledge', 'value': True},
                    {'label': 'Decline', 'action': 'acknowledge', 'value': False}
                ]
            },
            content_format='json',
            message_type='terms',
            variables=[]
        )
        
        self.us_terms_template = MessageTemplate.objects.create(
            name='us_checkout_terms',
            title='US Checkout Terms',
            content='Standard terms for US region',
            json_content={
                'title': 'US Terms & Conditions',
                'message': 'Standard terms for US region',
                'buttons': [
                    {'label': 'Accept', 'action': 'acknowledge', 'value': True}
                ]
            },
            content_format='json',
            message_type='terms',
            variables=[]
        )
        
        self.prefs_template = MessageTemplate.objects.create(
            name='user_preferences',
            title='User Preferences',
            content='Customize Your Experience',
            json_content={
                'title': 'Customize Your Experience',
                'options': [
                    {'key': 'newsletter', 'label': 'Subscribe to newsletter'},
                    {'key': 'promotions', 'label': 'Receive promotional offers'}
                ]
            },
            content_format='json',
            message_type='info',
            variables=[]
        )

    def test_checkout_terms_api_flow(self):
        """
        TDD RED: Test complete checkout flow with terms acknowledgment
        Expected to FAIL initially - no complete flow implementation
        
        Flow:
        1. Create rules via API
        2. Execute checkout_terms without acknowledgment (blocked)
        3. Submit acknowledgment
        4. Execute checkout_terms with acknowledgment (allowed)
        """
        self.client.force_authenticate(user=self.eu_user)
        
        # Step 1: Create EU terms rule via API
        eu_rule_data = {
            'rule_id': 'eu_terms_rule',
            'name': 'EU Terms Rule',
            'entry_point': 'checkout_terms',
            'rules_fields_id': 'full_context_v1',
            'conditions': {
                '==': [{'var': 'user.region'}, 'EU']
            },
            'actions': [
                {
                    'type': 'user_acknowledge',
                    'templateName': 'eu_checkout_terms',
                    'ackKey': 'eu_terms_v1',
                    'required': True,
                    'blocking': True,
                    'scope': 'per_user'
                }
            ],
            'priority': 10,
            'active': True
        }
        
        create_url = reverse('rules-create')
        create_response = self.client.post(create_url, eu_rule_data, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        
        # Create US terms rule (different requirements)
        us_rule_data = {
            'rule_id': 'us_terms_rule',
            'name': 'US Terms Rule',
            'entry_point': 'checkout_terms',
            'rules_fields_id': 'full_context_v1',
            'conditions': {
                '==': [{'var': 'user.region'}, 'US']
            },
            'actions': [
                {
                    'type': 'user_acknowledge',
                    'templateName': 'us_checkout_terms',
                    'ackKey': 'us_terms_v1',
                    'required': True,
                    'blocking': True,
                    'scope': 'per_order'
                }
            ],
            'priority': 10,
            'active': True
        }
        
        create_response = self.client.post(create_url, us_rule_data, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        
        # Step 2: Execute checkout_terms for EU user WITHOUT acknowledgment
        execute_url = reverse('rules-execute')
        eu_context = {
            'entry_point': 'checkout_terms',
            'context': {
                'user': {
                    'id': str(self.eu_user.id),
                    'region': 'EU'
                },
                'cart': {
                    'id': 196,
                    'user': self.eu_user.id,
                    'session_key': None,
                    'items': [
                        {
                            'id': 429,
                            'current_product': 2767,
                            'product_id': 121,
                            'product_name': 'Premium Product 1',
                            'product_code': 'PREM1',
                            'subject_code': 'CS5',
                            'exam_session_code': '25A',
                            'product_type': 'tutorial',
                            'quantity': 1,
                            'price_type': 'premium',
                            'actual_price': '199.99',
                            'metadata': {
                                'variationId': 11,
                                'variationName': 'Premium Tutorial'
                            },
                            'is_marking': False,
                            'has_expired_deadline': False
                        }
                    ],
                    'total': 199.99,
                    'created_at': '2025-08-05T14:45:42.685123Z',
                    'updated_at': '2025-08-08T15:39:05.464553Z',
                    'has_marking': False,
                    'has_material': False,
                    'has_tutorial': True
                }
            }
        }
        
        blocked_response = self.client.post(execute_url, eu_context, format='json')
        self.assertEqual(blocked_response.status_code, status.HTTP_200_OK)
        
        blocked_data = blocked_response.json()
        self.assertTrue(blocked_data['blocked'])
        self.assertIn('required_acknowledgments', blocked_data)
        self.assertEqual(len(blocked_data['required_acknowledgments']), 1)
        self.assertEqual(blocked_data['required_acknowledgments'][0]['ackKey'], 'eu_terms_v1')
        self.assertIn('actions', blocked_data)
        
        # Verify EU-specific terms content
        eu_action = blocked_data['actions'][0]
        self.assertEqual(eu_action['type'], 'user_acknowledge')
        self.assertIn('template', eu_action)
        self.assertIn('GDPR', eu_action['template']['message'])
        
        # Step 3: Submit acknowledgment
        ack_url = reverse('rules-acknowledge')
        ack_data = {
            'ackKey': 'eu_terms_v1',
            'accepted': True,
            'context': {
                'user_id': str(self.eu_user.id),
                'order_id': None  # per_user scope
            }
        }
        
        ack_response = self.client.post(ack_url, ack_data, format='json')
        self.assertEqual(ack_response.status_code, status.HTTP_200_OK)
        
        # Step 4: Execute checkout_terms WITH acknowledgment
        eu_context['context']['acknowledgments'] = {
            'eu_terms_v1': True
        }
        
        allowed_response = self.client.post(execute_url, eu_context, format='json')
        self.assertEqual(allowed_response.status_code, status.HTTP_200_OK)
        
        allowed_data = allowed_response.json()
        self.assertFalse(allowed_data['blocked'])
        self.assertEqual(len(allowed_data['required_acknowledgments']), 0)
        
        # Test US user sees different terms
        self.client.force_authenticate(user=self.us_user)
        
        us_context = {
            'entry_point': 'checkout_terms',
            'context': {
                'user': {
                    'id': str(self.us_user.id),
                    'region': 'US'
                },
                'cart': {
                    'id': 197,
                    'user': self.us_user.id,
                    'session_key': None,
                    'items': [],
                    'total': 99.99,
                    'created_at': '2025-08-05T14:45:42.685123Z',
                    'updated_at': '2025-08-08T15:39:05.464553Z',
                    'has_marking': False,
                    'has_material': False,
                    'has_tutorial': False
                }
            }
        }
        
        us_response = self.client.post(execute_url, us_context, format='json')
        us_data = us_response.json()
        
        # Should see US-specific terms
        self.assertTrue(us_data['blocked'])
        us_action = us_data['actions'][0]
        self.assertIn('Standard terms for US', us_action['template']['message'])
        self.assertNotIn('GDPR', us_action['template']['message'])

    def test_user_preference_api_flow(self):
        """
        TDD RED: Test home page preferences flow
        Expected to FAIL initially - no preference handling
        
        Flow:
        1. Create preference rules
        2. Load home page (get preferences)
        3. Save preferences
        4. Verify checkout not affected by optional preferences
        """
        self.client.force_authenticate(user=self.eu_user)
        
        # Create preference rule
        pref_rule_data = {
            'rule_id': 'home_preferences',
            'name': 'Home Page Preferences',
            'entry_point': 'home_page_mount',
            'rules_fields_id': 'full_context_v1',
            'conditions': {
                '==': [1, 1]  # Always show
            },
            'actions': [
                {
                    'type': 'user_preference',
                    'templateName': 'user_preferences',
                    'prefKeys': ['newsletter', 'promotions'],
                    'required': False,
                    'scope': 'per_user'
                }
            ],
            'priority': 10,
            'active': True
        }
        
        create_url = reverse('rules-create')
        create_response = self.client.post(create_url, pref_rule_data, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        
        # Load home page - should get preference options
        execute_url = reverse('rules-execute')
        home_context = {
            'entry_point': 'home_page_mount',
            'context': {
                'user': {
                    'id': str(self.eu_user.id),
                    'region': 'EU',
                    'preferences': {}
                },
                'cart': {
                    'id': 198,
                    'user': self.eu_user.id,
                    'session_key': None,
                    'items': [],
                    'total': 0,
                    'created_at': '2025-08-05T14:45:42.685123Z',
                    'updated_at': '2025-08-08T15:39:05.464553Z',
                    'has_marking': False,
                    'has_material': False,
                    'has_tutorial': False
                }
            }
        }
        
        home_response = self.client.post(execute_url, home_context, format='json')
        self.assertEqual(home_response.status_code, status.HTTP_200_OK)
        
        home_data = home_response.json()
        self.assertFalse(home_data.get('blocked', False))  # Not blocking
        self.assertIn('actions', home_data)
        
        pref_action = home_data['actions'][0]
        self.assertEqual(pref_action['type'], 'user_preference')
        self.assertIn('template', pref_action)
        self.assertIn('newsletter', str(pref_action['template']))
        
        # Save preferences
        pref_url = reverse('rules-preferences')
        pref_save_data = {
            'preferences': {
                'newsletter': True,
                'promotions': False
            },
            'user_id': str(self.eu_user.id)
        }
        
        pref_response = self.client.post(pref_url, pref_save_data, format='json')
        self.assertEqual(pref_response.status_code, status.HTTP_200_OK)
        
        # Verify preferences saved
        if UserAcknowledgment:
            prefs = UserAcknowledgment.objects.filter(
                user_id=str(self.eu_user.id),
                acknowledgment_type='preference'
            )
            self.assertEqual(prefs.count(), 2)
        
        # Test checkout not affected by preferences
        checkout_context = {
            'entry_point': 'checkout_terms',
            'context': {
                'user': {
                    'id': str(self.eu_user.id),
                    'region': 'EU',
                    'preferences': {
                        'newsletter': True,
                        'promotions': False
                    }
                },
                'cart': {
                    'id': 199,
                    'user': self.eu_user.id,
                    'session_key': None,
                    'items': [],
                    'total': 50.00,
                    'created_at': '2025-08-05T14:45:42.685123Z',
                    'updated_at': '2025-08-08T15:39:05.464553Z',
                    'has_marking': False,
                    'has_material': False,
                    'has_tutorial': False
                }
            }
        }
        
        checkout_response = self.client.post(execute_url, checkout_context, format='json')
        # Preferences are optional, shouldn't block checkout
        # (though EU terms from previous test might still apply)

    def test_update_action_api_flow(self):
        """
        TDD RED: Test context update via rules (e.g., apply discount)
        Expected to FAIL initially - no update action implementation
        
        Flow:
        1. Create discount rule
        2. Execute with qualifying cart
        3. Verify discount applied to context
        """
        self.client.force_authenticate(user=self.eu_user)
        
        # Create discount rule
        discount_rule_data = {
            'rule_id': 'bulk_discount',
            'name': 'Bulk Purchase Discount',
            'entry_point': 'cart_update',
            'rules_fields_id': 'full_context_v1',
            'conditions': {
                '>=': [{'var': 'cart.total'}, 500]
            },
            'actions': [
                {
                    'type': 'update',
                    'target': 'cart.discount',
                    'operation': 'set',
                    'value': 50.00
                },
                {
                    'type': 'display_message',
                    'templateName': 'discount_applied',
                    'message': 'Congratulations! $50 discount applied for orders over $500'
                }
            ],
            'priority': 10,
            'active': True
        }
        
        create_url = reverse('rules-create')
        create_response = self.client.post(create_url, discount_rule_data, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        
        # Execute with qualifying cart
        execute_url = reverse('rules-execute')
        cart_context = {
            'entry_point': 'cart_update',
            'context': {
                'user': {
                    'id': str(self.eu_user.id),
                    'region': 'EU'
                },
                'cart': {
                    'id': 200,
                    'user': self.eu_user.id,
                    'session_key': None,
                    'items': [
                        {
                            'id': 430,
                            'current_product': 2768,
                            'product_id': 122,
                            'product_name': 'High Value Product 1',
                            'product_code': 'HV1',
                            'subject_code': 'CS6',
                            'exam_session_code': '25A',
                            'product_type': 'material',
                            'quantity': 1,
                            'price_type': 'premium',
                            'actual_price': '300.00',
                            'metadata': {
                                'variationId': 12,
                                'variationName': 'Premium Material 1'
                            },
                            'is_marking': False,
                            'has_expired_deadline': False
                        },
                        {
                            'id': 431,
                            'current_product': 2769,
                            'product_id': 123,
                            'product_name': 'High Value Product 2',
                            'product_code': 'HV2',
                            'subject_code': 'CS7',
                            'exam_session_code': '25A',
                            'product_type': 'material',
                            'quantity': 1,
                            'price_type': 'premium',
                            'actual_price': '250.00',
                            'metadata': {
                                'variationId': 13,
                                'variationName': 'Premium Material 2'
                            },
                            'is_marking': False,
                            'has_expired_deadline': False
                        }
                    ],
                    'total': 550.00,
                    'discount': 0,
                    'created_at': '2025-08-05T14:45:42.685123Z',
                    'updated_at': '2025-08-08T15:39:05.464553Z',
                    'has_marking': False,
                    'has_material': True,
                    'has_tutorial': False
                }
            }
        }
        
        response = self.client.post(execute_url, cart_context, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        
        # Verify discount was applied
        self.assertIn('updated_context', data)
        self.assertEqual(data['updated_context']['cart']['discount'], 50.00)
        
        # Verify message about discount
        self.assertIn('actions', data)
        messages = [a for a in data['actions'] if a['type'] == 'display_message']
        self.assertTrue(len(messages) > 0)
        self.assertIn('$50 discount', messages[0].get('message', ''))
        
        # Test with non-qualifying cart
        small_cart_context = {
            'entry_point': 'cart_update',
            'context': {
                'user': {
                    'id': str(self.eu_user.id),
                    'region': 'EU'
                },
                'cart': {
                    'id': 201,
                    'user': self.eu_user.id,
                    'session_key': None,
                    'items': [],
                    'total': 100.00,
                    'discount': 0,
                    'created_at': '2025-08-05T14:45:42.685123Z',
                    'updated_at': '2025-08-08T15:39:05.464553Z',
                    'has_marking': False,
                    'has_material': False,
                    'has_tutorial': False
                }
            }
        }
        
        small_response = self.client.post(execute_url, small_cart_context, format='json')
        small_data = small_response.json()
        
        # No discount should be applied
        if 'updated_context' in small_data:
            self.assertEqual(small_data['updated_context']['cart']['discount'], 0)

    def test_chain_rules_api_flow(self):
        """
        TDD RED: Test multiple rules executing in sequence
        Expected to FAIL initially - no rule chaining implementation
        
        Flow:
        1. Create multiple chained rules with priorities
        2. Execute entry point
        3. Verify rules executed in correct order
        4. Verify stopOnMatch behavior
        """
        self.client.force_authenticate(user=self.eu_user)
        
        # Create chain of rules for cart_update
        # Rule 1: Premium customer check (priority 1)
        premium_rule_data = {
            'rule_id': 'premium_customer_check',
            'name': 'Premium Customer Check',
            'entry_point': 'cart_update',
            'rules_fields_id': 'full_context_v1',
            'conditions': {
                '==': [{'var': 'user.premium'}, True]
            },
            'actions': [
                {
                    'type': 'update',
                    'target': 'cart.discount_multiplier',
                    'operation': 'set',
                    'value': 1.5
                }
            ],
            'priority': 1,
            'active': True,
            'stop_processing': False  # Continue to next rule
        }
        
        # Rule 2: Base discount (priority 10)
        base_discount_data = {
            'rule_id': 'base_discount',
            'name': 'Base Discount',
            'entry_point': 'cart_update',
            'rules_fields_id': 'full_context_v1',
            'conditions': {
                '>=': [{'var': 'cart.total'}, 100]
            },
            'actions': [
                {
                    'type': 'update',
                    'target': 'cart.base_discount',
                    'operation': 'set',
                    'value': 10
                }
            ],
            'priority': 10,
            'active': True,
            'stop_processing': False
        }
        
        # Rule 3: Apply final discount (priority 20)
        final_discount_data = {
            'rule_id': 'apply_final_discount',
            'name': 'Apply Final Discount',
            'entry_point': 'cart_update',
            'rules_fields_id': 'full_context_v1',
            'conditions': {
                'and': [
                    {'>': [{'var': 'cart.base_discount'}, 0]},
                    {'!=': [{'var': 'cart.discount_multiplier'}, None]}
                ]
            },
            'actions': [
                {
                    'type': 'update',
                    'target': 'cart.final_discount',
                    'operation': 'calculate',
                    'function': 'multiply_discount'  # base_discount * multiplier
                }
            ],
            'priority': 20,
            'active': True,
            'stop_processing': True  # Stop after this
        }
        
        # Rule 4: Should not execute due to stopOnMatch (priority 30)
        never_rule_data = {
            'rule_id': 'should_not_execute',
            'name': 'Should Not Execute',
            'entry_point': 'cart_update',
            'rules_fields_id': 'full_context_v1',
            'conditions': {
                '==': [1, 1]  # Always true
            },
            'actions': [
                {
                    'type': 'update',
                    'target': 'cart.never_field',
                    'operation': 'set',
                    'value': 'should_not_see_this'
                }
            ],
            'priority': 30,
            'active': True
        }
        
        # Create all rules
        create_url = reverse('rules-create')
        for rule_data in [premium_rule_data, base_discount_data, 
                         final_discount_data, never_rule_data]:
            response = self.client.post(create_url, rule_data, format='json')
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Execute chain with premium user
        execute_url = reverse('rules-execute')
        chain_context = {
            'entry_point': 'cart_update',
            'context': {
                'user': {
                    'id': str(self.eu_user.id),
                    'region': 'EU',
                    'premium': True
                },
                'cart': {
                    'id': 202,
                    'user': self.eu_user.id,
                    'session_key': None,
                    'items': [],
                    'total': 200.00,
                    'created_at': '2025-08-05T14:45:42.685123Z',
                    'updated_at': '2025-08-08T15:39:05.464553Z',
                    'has_marking': False,
                    'has_material': False,
                    'has_tutorial': False
                }
            }
        }
        
        response = self.client.post(execute_url, chain_context, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        
        # Verify rules executed in order
        self.assertIn('rules_executed', data)
        executed_ids = [r['rule_id'] for r in data['rules_executed']]
        
        # Should execute first 3 rules in priority order
        self.assertEqual(len(executed_ids), 3)
        self.assertEqual(executed_ids[0], 'premium_customer_check')
        self.assertEqual(executed_ids[1], 'base_discount')
        self.assertEqual(executed_ids[2], 'apply_final_discount')
        
        # Should NOT execute the 4th rule due to stopOnMatch
        self.assertNotIn('should_not_execute', executed_ids)
        
        # Verify context updates applied in sequence
        updated = data.get('updated_context', {})
        self.assertEqual(updated['cart'].get('discount_multiplier'), 1.5)
        self.assertEqual(updated['cart'].get('base_discount'), 10)
        # Final discount should be base * multiplier = 10 * 1.5 = 15
        self.assertEqual(updated['cart'].get('final_discount'), 15)
        # Never field should not exist
        self.assertNotIn('never_field', updated['cart'])
        
        # Test with non-premium user (different execution path)
        non_premium_context = {
            'entry_point': 'cart_update',
            'context': {
                'user': {
                    'id': 'user456',
                    'region': 'US',
                    'premium': False
                },
                'cart': {
                    'id': 203,
                    'user': 456,
                    'session_key': None,
                    'items': [],
                    'total': 200.00,
                    'created_at': '2025-08-05T14:45:42.685123Z',
                    'updated_at': '2025-08-08T15:39:05.464553Z',
                    'has_marking': False,
                    'has_material': False,
                    'has_tutorial': False
                }
            }
        }
        
        non_premium_response = self.client.post(execute_url, non_premium_context, format='json')
        non_premium_data = non_premium_response.json()
        
        # Premium rule should not match
        executed_ids = [r['rule_id'] for r in non_premium_data.get('rules_executed', [])]
        self.assertNotIn('premium_customer_check', executed_ids)
        self.assertIn('base_discount', executed_ids)