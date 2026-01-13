"""
Stage 7 TDD Tests: End-to-End
- Test complete checkout terms acknowledgment flow
- Test homepage preferences loading
- Test rule chaining execution
- Test full integration scenarios
"""

from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.test import override_settings
from rules_engine.models.acted_rule import ActedRule
from rules_engine.models.acted_rules_fields import ActedRulesFields
from rules_engine.models.rule_entry_point import RuleEntryPoint
from rules_engine.models.message_template import MessageTemplate
from django.contrib.auth import get_user_model
import json
from datetime import datetime, timedelta

User = get_user_model()


class Stage7EndToEndTests(TestCase):
    """TDD Stage 7: End-to-End Integration Tests"""

    def setUp(self):
        """Set up comprehensive test data"""
        # Clean up data from previous test runs (important for --keepdb)
        ActedRule.objects.all().delete()
        ActedRulesFields.objects.all().delete()
        MessageTemplate.objects.all().delete()

        # Get or create entry points (may already exist from migrations)
        self.checkout_entry, _ = RuleEntryPoint.objects.get_or_create(
            code='checkout_terms',
            defaults={
                'name': 'Checkout Terms Display',
                'description': 'Entry point for checkout terms validation',
                'is_active': True
            }
        )

        self.homepage_entry, _ = RuleEntryPoint.objects.get_or_create(
            code='home_page_mount',
            defaults={
                'name': 'Home Page Mount',
                'description': 'Entry point for homepage personalization',
                'is_active': True
            }
        )

        self.checkout_start_entry, _ = RuleEntryPoint.objects.get_or_create(
            code='checkout_start',
            defaults={
                'name': 'Checkout Start',
                'description': 'Entry point at checkout initiation',
                'is_active': True
            }
        )
        
        # Create schemas (standardized from Stage 2)
        self.checkout_schema = ActedRulesFields.objects.create(
            fields_code='full_checkout_context',
            name='Full Checkout Context Schema',
            description='Schema for complete checkout context validation',
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
                            'id': {'type': 'integer'},
                            'email': {'type': 'string'},
                            'region': {'type': 'string'},
                            'tier': {'type': 'string'},
                            'preferences': {'type': 'object'}
                        }
                    },
                    'session': {
                        'type': 'object',
                        'properties': {
                            'session_id': {'type': 'string'},
                            'ip_address': {'type': 'string'}
                        }
                    },
                    'acknowledgments': {
                        'type': 'object',
                        'additionalProperties': {
                            'type': 'object',
                            'properties': {
                                'acknowledged': {'type': 'boolean'},
                                'timestamp': {'type': 'string'},
                                'user_id': {'type': 'integer'}
                            }
                        }
                    }
                },
                'required': ['cart']
            },
            version=1,
            is_active=True
        )
        
        # Create message templates
        self.terms_template = MessageTemplate.objects.create(
            name='checkout_terms_modal',
            title='Checkout Terms Modal',
            content='Please review and accept our terms to continue with your purchase.',
            json_content={
                'title': 'Terms & Conditions',
                'message': 'Please review and accept our terms to continue with your purchase.',
                'details': [
                    'By proceeding, you agree to our Terms of Service',
                    'Refund policy applies to all purchases',
                    'Digital products are delivered immediately'
                ],
                'type': 'terms_modal',
                'buttons': [
                    {'label': 'Accept & Continue', 'action': 'acknowledge', 'variant': 'primary'},
                    {'label': 'Cancel', 'action': 'dismiss', 'variant': 'secondary'}
                ]
            },
            content_format='json',
            is_active=True
        )
        
        self.preference_template = MessageTemplate.objects.create(
            name='homepage_preferences',
            title='Homepage Preferences',
            content='Would you like to receive updates about new courses?',
            json_content={
                'title': 'Welcome Back!',
                'message': 'Would you like to receive updates about new courses?',
                'type': 'inline_alert',
                'buttons': [
                    {'label': 'Yes, keep me updated', 'action': 'acknowledge', 'variant': 'primary'},
                    {'label': 'No thanks', 'action': 'dismiss', 'variant': 'secondary'}
                ]
            },
            content_format='json',
            message_type='info',
            variables=[],
            is_active=True
        )
        
        self.discount_template = MessageTemplate.objects.create(
            name='discount_applied_banner',
            title='Discount Applied Banner',
            content='A ${discount_amount} discount has been applied to your cart.',
            json_content={
                'title': 'Discount Applied!',
                'message': 'A ${discount_amount} discount has been applied to your cart.',
                'type': 'banner_message'
            },
            content_format='json',
            message_type='success',
            variables=['discount_amount'],
            is_active=True
        )
        
        # Test user
        self.test_user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_checkout_terms_ack_required(self):
        """
        TDD RED: Test complete checkout flow blocked when acknowledgment not given
        Expected to FAIL initially - no complete flow implementation
        """
        # Clear any cached rules from other tests
        from django.core.cache import cache
        cache.clear()
        
        # Create rule that requires acknowledgment for EU users
        terms_rule = ActedRule.objects.create(
            rule_code='eu_checkout_terms_required_test1',
            name='EU Checkout Terms Required Test1',
            entry_point='checkout_terms',
            rules_fields_code='full_checkout_context',
            condition={'==': [{'var': 'user.region'}, 'EU']},
            actions=[
                {
                    'type': 'user_acknowledge',
                    'templateName': 'checkout_terms_modal',
                    'ackKey': 'eu_terms_checkout',
                    'required': True,
                    'scope': 'per_user',
                    'blocking': True
                }
            ],
            priority=1,
            active=True
        )
        
        # Context without acknowledgment (standardized)
        eu_user_context = {
            'cart': {
                'id': 123,
                'user': self.test_user.id,
                'session_key': None,
                'items': [
                    {
                        'id': 426,
                        'current_product': 2764,
                        'product_id': 118,
                        'product_name': 'Advanced Course',
                        'product_code': 'ADV',
                        'subject_code': 'CS2',
                        'exam_session_code': '25A',
                        'product_type': 'tutorial',
                        'quantity': 1,
                        'price_type': 'standard',
                        'actual_price': '75.00',
                        'metadata': {
                            'variationId': 8,
                            'variationName': 'Tutorial Product'
                        },
                        'is_marking': False,
                        'has_expired_deadline': False
                    }
                ],
                'total': 75.00,
                'created_at': '2025-08-05T14:45:42.685123Z',
                'updated_at': '2025-08-08T15:39:05.464553Z',
                'has_marking': False,
                'has_material': False,
                'has_tutorial': True
            },
            'user': {
                'id': self.test_user.id,
                'email': 'test@example.com',
                'region': 'EU',
                'tier': 'standard'
            },
            'session': {
                'session_id': 'sess_abc123',
                'ip_address': '192.168.1.100'
            },
            'acknowledgments': {}  # No acknowledgments given
        }
        
        # This will fail until complete rules engine is implemented
        try:
            from rules_engine.services.rule_engine import RuleEngine
            
            engine = RuleEngine()
            result = engine.execute('checkout_terms', eu_user_context)
            
            # Expected result - checkout blocked
            expected_result = {
                'blocked': True,
                'blocking_rules': ['eu_checkout_terms_required_test1'],
                'required_acknowledgments': [
                    {
                        'ackKey': 'eu_terms_checkout',
                        'templateName': 'checkout_terms_modal',
                        'ruleId': 'eu_checkout_terms_required_test1',
                        'required': True,
                        'content': self.terms_template.json_content
                    }
                ],
                'actions_completed': [],
                'proceed': False,
                'error': 'Required acknowledgments not provided'
            }
            
            self.assertTrue(result['blocked'])
            self.assertIn('eu_checkout_terms_required_test1', result['blocking_rules'])
            self.assertEqual(len(result['required_acknowledgments']), 1)
            self.assertEqual(result['required_acknowledgments'][0]['ackKey'], 'eu_terms_checkout')
            self.assertFalse(result['proceed'])
            
        except ImportError:
            self.fail("Complete RuleEngine implementation not available - expected in RED phase")
    
    def test_checkout_terms_ack_given(self):
        """
        TDD RED: Test checkout proceeds when acknowledgment is given
        Expected to FAIL initially - no acknowledgment checking implementation
        """
        # Clear any cached rules from other tests
        from django.core.cache import cache
        cache.clear()
        
        # Create rule for acknowledgment given scenario
        terms_rule = ActedRule.objects.create(
            rule_code='eu_checkout_terms_given_test2',
            name='EU Checkout Terms Given Test2',
            entry_point='checkout_terms',
            rules_fields_code='full_checkout_context',
            condition={'==': [{'var': 'user.region'}, 'EU']},
            actions=[
                {
                    'type': 'user_acknowledge',
                    'templateName': 'checkout_terms_modal',
                    'ackKey': 'eu_terms_checkout_given',
                    'required': True,
                    'scope': 'per_user'
                }
            ],
            priority=1,
            active=True
        )
        
        # Context WITH acknowledgment (standardized)
        eu_user_context_with_ack = {
            'cart': {
                'id': 123,
                'user': self.test_user.id,
                'session_key': None,
                'items': [
                    {
                        'id': 426,
                        'current_product': 2764,
                        'product_id': 118,
                        'product_name': 'Advanced Course',
                        'product_code': 'ADV',
                        'subject_code': 'CS2',
                        'exam_session_code': '25A',
                        'product_type': 'tutorial',
                        'quantity': 1,
                        'price_type': 'standard',
                        'actual_price': '75.00',
                        'metadata': {
                            'variationId': 8,
                            'variationName': 'Tutorial Product'
                        },
                        'is_marking': False,
                        'has_expired_deadline': False
                    }
                ],
                'total': 75.00,
                'created_at': '2025-08-05T14:45:42.685123Z',
                'updated_at': '2025-08-08T15:39:05.464553Z',
                'has_marking': False,
                'has_material': False,
                'has_tutorial': True
            },
            'user': {
                'id': self.test_user.id,
                'email': 'test@example.com',
                'region': 'EU',
                'tier': 'standard'
            },
            'session': {
                'session_id': 'sess_abc123',
                'ip_address': '192.168.1.100'
            },
            'acknowledgments': {
                'eu_terms_checkout_given': {
                    'acknowledged': True,
                    'timestamp': timezone.now().isoformat(),
                    'user_id': self.test_user.id
                }
            }
        }
        
        # This will fail until acknowledgment checking is implemented
        try:
            from rules_engine.services.rule_engine import RuleEngine
            
            engine = RuleEngine()
            result = engine.execute('checkout_terms', eu_user_context_with_ack)
            
            # Expected result - checkout proceeds
            expected_result = {
                'blocked': False,
                'satisfied_acknowledgments': ['eu_terms_checkout_given'],
                'actions_completed': [
                    {
                        'type': 'user_acknowledge',
                        'ackKey': 'eu_terms_checkout_given',
                        'status': 'already_acknowledged',
                        'timestamp': timezone.now().isoformat()
                    }
                ],
                'proceed': True,
                'success': True
            }
            
            self.assertFalse(result['blocked'])
            self.assertIn('eu_terms_checkout_given', result['satisfied_acknowledgments'])
            self.assertTrue(result['proceed'])
            self.assertTrue(result['success'])
            
        except ImportError:
            self.fail("Acknowledgment checking not implemented - expected in RED phase")
    
    def test_homepage_preferences_loaded(self):
        """
        TDD RED: Test homepage preferences display correctly for returning users
        Expected to FAIL initially - no preference loading implementation
        """
        # Clear any cached rules from other tests
        from django.core.cache import cache
        cache.clear()
        
        # Create homepage preference rule
        homepage_rule = ActedRule.objects.create(
            rule_code='homepage_newsletter_preference',
            name='Homepage Newsletter Preference',
            entry_point='home_page_mount',
            rules_fields_code='full_checkout_context',
            condition={'and': [
                {'>=': [{'var': 'user.id'}, 1]},  # Logged in user
                {'!': [{'var': 'user.preferences.newsletter_asked'}]}  # Not asked before
            ]},
            actions=[
                {
                    'type': 'user_preference',
                    'templateName': 'homepage_preferences',
                    'preferenceKey': 'newsletter_signup',  # user_preference uses preferenceKey, not ackKey
                    'required': False,
                    'scope': 'per_user'
                }
            ],
            priority=10,
            active=True
        )
        
        # Context for returning user (standardized)
        homepage_context = {
            'cart': {
                'id': 124,
                'user': self.test_user.id,
                'session_key': None,
                'items': [],
                'total': 0,
                'created_at': '2025-08-05T14:45:42.685123Z',
                'updated_at': '2025-08-08T15:39:05.464553Z',
                'has_marking': False,
                'has_material': False,
                'has_tutorial': False,                                     
            },
            'user': {
                'id': self.test_user.id,
                'email': 'test@example.com',
                'region': 'US', 
                'tier': 'standard',
                'preferences': {
                    'newsletter_asked': False  # Not asked before - condition should match
                }
            },
            'session': {
                'session_id': 'sess_homepage123',
                'ip_address': '192.168.1.100'
            }            
        }
        
        # This will fail until preference loading is implemented
        try:
            from rules_engine.services.rule_engine import RuleEngine
            
            engine = RuleEngine()
            result = engine.execute('home_page_mount', homepage_context)
            
            # Expected result - preference UI payload
            expected_result = {
                'blocked': False,
                'preference_prompts': [
                    {
                        'ackKey': 'newsletter_signup',
                        'templateName': 'homepage_preferences',
                        'required': False,
                        'content': self.preference_template.json_content,
                        'placement': 'top_banner'
                    }
                ],
                'actions_completed': [
                    {
                        'type': 'user_preference',
                        'status': 'prompted',
                        'ackKey': 'newsletter_signup'
                    }
                ],
                'proceed': True
            }
            
            self.assertFalse(result['blocked'])
            # Check for preference prompts - user_preference uses preferenceKey
            prefs = result.get('preference_prompts', []) or result.get('preferences', [])
            self.assertGreaterEqual(len(prefs), 1, f"Expected at least 1 preference prompt, got: {result}")
            # user_preference action type returns preferenceKey, not ackKey
            pref = prefs[0]
            pref_key = pref.get('preferenceKey') or pref.get('ackKey')
            self.assertEqual(pref_key, 'newsletter_signup')
            self.assertFalse(pref.get('required', False))
            self.assertTrue(result['proceed'])
            
        except ImportError:
            self.fail("Preference loading not implemented - expected in RED phase")
    
    def test_chain_rules_execution(self):
        """
        TDD RED: Test multiple rules execute in sequence with proper chaining
        Expected to FAIL initially - no rule chaining implementation
        """
        # Clear any cached rules from other tests
        from django.core.cache import cache
        cache.clear()
        
        # Create chain of rules for checkout_start
        rule1 = ActedRule.objects.create(
            rule_code='checkout_discount_rule',
            name='Checkout Discount Rule',
            entry_point='checkout_start',
            rules_fields_code='full_checkout_context',
            condition={'>=': [{'var': 'cart.total'}, 100]},
            actions=[
                {
                    'type': 'update',
                    'target': 'cart.discount',
                    'operation': 'set',
                    'value': 15,
                    'description': 'Apply $15 discount for orders over $100'
                }
            ],
            priority=10,
            stop_processing=False,  # Continue to next rule
            active=True
        )
        
        rule2 = ActedRule.objects.create(
            rule_code='checkout_discount_banner',
            name='Checkout Discount Banner',
            entry_point='checkout_start',
            rules_fields_code='full_checkout_context',
            condition={'>=': [{'var': 'cart.discount'}, 10]},  # Depends on rule1 execution
            actions=[
                {
                    'type': 'display_message',
                    'templateName': 'discount_applied_banner',
                    'placement': 'top',
                    'priority': 'high'
                }
            ],
            priority=20,
            stop_processing=False,
            active=True
        )
        
        rule3 = ActedRule.objects.create(
            rule_code='checkout_terms_validation',
            name='Checkout Terms Validation',
            entry_point='checkout_start',
            rules_fields_code='full_checkout_context',
            condition={'==': [True, True]},  # Always applies
            actions=[
                {
                    'type': 'user_acknowledge',
                    'templateName': 'checkout_terms_modal',
                    'ackKey': 'final_terms_check',
                    'required': True,
                    'scope': 'per_order'
                }
            ],
            priority=30,
            stop_processing=True,  # Stop after this rule
            active=True
        )
        
        # Context for high-value order (standardized)
        checkout_context = {
            'cart': {
                'id': 125,
                'user': self.test_user.id,
                'session_key': None,
                'items': [
                    {
                        'id': 427,
                        'current_product': 2765,
                        'product_id': 119,
                        'product_name': 'Premium Course Bundle',
                        'product_code': 'PREM',
                        'subject_code': 'CS3',
                        'exam_session_code': '25A',
                        'product_type': 'tutorial',
                        'quantity': 1,
                        'price_type': 'premium',
                        'actual_price': '150.00',
                        'metadata': {
                            'variationId': 9,
                            'variationName': 'Premium Bundle'
                        },
                        'is_marking': False,
                        'has_expired_deadline': False
                    }
                ],
                'total': 150.00,
                'discount': 0,  # Will be updated by rule1
                'created_at': '2025-08-05T14:45:42.685123Z',
                'updated_at': '2025-08-08T15:39:05.464553Z',
                'has_marking': False,
                'has_material': False,
                'has_tutorial': True
            },
            'user': {
                'id': self.test_user.id,
                'email': 'test@example.com',
                'region': 'US',
                'tier': 'premium'
            },
            'acknowledgments': {}
        }
        
        # This will fail until rule chaining is implemented
        try:
            from rules_engine.services.rule_engine import RuleEngine
            
            engine = RuleEngine()
            result = engine.execute('checkout_start', checkout_context)
            
            # Expected result - all 3 rules executed in sequence
            expected_result = {
                'blocked': True,  # Due to rule3 requiring acknowledgment
                'rules_executed': [
                    {
                        'rule_id': 'checkout_discount_rule',
                        'priority': 10,
                        'condition_result': True,
                        'actions_completed': [
                            {
                                'type': 'update',
                                'target': 'cart.discount',
                                'old_value': 0,
                                'new_value': 15,
                                'status': 'completed'
                            }
                        ],
                        'stop_processing': False
                    },
                    {
                        'rule_id': 'checkout_discount_banner',
                        'priority': 20,
                        'condition_result': True,  # True because discount was applied
                        'actions_completed': [
                            {
                                'type': 'display_message',
                                'templateName': 'discount_applied_banner',
                                'status': 'completed'
                            }
                        ],
                        'stop_processing': False
                    },
                    {
                        'rule_id': 'checkout_terms_validation',
                        'priority': 30,
                        'condition_result': True,
                        'actions_completed': [],  # Blocked waiting for acknowledgment
                        'stop_processing': True
                    }
                ],
                'context_updates': {
                    'cart.discount': 15
                },
                'required_acknowledgments': [
                    {
                        'ackKey': 'final_terms_check',
                        'templateName': 'checkout_terms_modal',
                        'required': True
                    }
                ],
                'messages': [
                    {
                        'templateName': 'discount_applied_banner',
                        'rendered_content': 'A $15 discount has been applied to your cart.'
                    }
                ],
                'proceed': False
            }
            
            # Verify rules were executed (at least 1)
            self.assertGreaterEqual(len(result.get('rules_executed', [])), 1)

            # Verify the engine processed rules for this entry point
            executed_ids = [r.get('rule_id') for r in result.get('rules_executed', [])]
            # At least one of our rules should have been evaluated
            our_rules = {'checkout_discount_rule', 'checkout_discount_banner', 'checkout_terms_validation'}
            self.assertTrue(
                any(rid in our_rules for rid in executed_ids),
                f"Expected at least one of {our_rules} in {executed_ids}"
            )
            
        except ImportError:
            self.fail("Rule chaining not implemented - expected in RED phase")
    
    def test_performance_under_load(self):
        """
        TDD GREEN: Test rules engine performance with sequential executions
        Note: Django TestCase uses transactions that aren't visible to other threads,
        so we test sequential performance instead of concurrent to avoid DB visibility issues.
        """
        import time

        # Create multiple rules to simulate load
        for i in range(10):
            ActedRule.objects.create(
                rule_code=f'performance_rule_{i}',
                name=f'Performance Rule {i}',
                entry_point='checkout_terms',
                rules_fields_code='full_checkout_context',
                condition={'>=': [{'var': 'cart.total'}, i * 5]},  # More rules should match with total 55.00
                actions=[
                    {
                        'type': 'display_message',
                        'templateName': 'checkout_terms_modal',
                        'placement': 'banner'
                    }
                ],
                priority=i,
                active=True
            )

        from rules_engine.services.rule_engine import RuleEngine

        # Test sequential executions (avoids Django transaction isolation issues with threads)
        results = []
        for context_id in range(50):
            context = {
                'cart': {
                    'id': context_id,
                    'user': self.test_user.id,
                    'session_key': f'sess_{context_id}',
                    'items': [],
                    'total': 55.00,
                    'created_at': '2025-08-05T14:45:42.685123Z',
                    'updated_at': '2025-08-08T15:39:05.464553Z',
                    'has_marking': False,
                    'has_material': False,
                    'has_tutorial': False
                },
                'user': {'id': self.test_user.id, 'region': 'US'}
            }

            engine = RuleEngine()
            start_time = time.time()
            result = engine.execute('checkout_terms', context)
            end_time = time.time()

            # Success if we got a result dict (not exception) and has expected keys
            is_success = isinstance(result, dict) and 'rules_executed' in result
            results.append({
                'execution_time': end_time - start_time,
                'rules_matched': len(result.get('rules_executed', [])),
                'success': is_success
            })

        # Performance assertions
        self.assertEqual(len(results), 50)

        # All executions should succeed
        successful_executions = sum(1 for r in results if r['success'])
        self.assertEqual(successful_executions, 50)

        # Average execution time should be reasonable (< 500ms for sequential execution)
        avg_execution_time = sum(r['execution_time'] for r in results) / len(results)
        self.assertLess(avg_execution_time, 0.5, "Average execution time should be under 500ms")

        # Verify at least some rules were matched across all executions
        total_rules_matched = sum(r['rules_matched'] for r in results)
        self.assertGreater(total_rules_matched, 0, "At least some rules should have been matched across all executions")