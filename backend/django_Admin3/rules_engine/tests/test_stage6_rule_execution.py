"""
Stage 6 TDD Tests: ActedRuleExecution
- Test execution logging and persistence
- Test context snapshot storage
- Test multiple execution logging
- Test execution audit trail functionality
"""

from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from rules_engine.models.acted_rule import ActedRule
from rules_engine.models.acted_rules_fields import ActedRulesFields
from rules_engine.models.rule_entry_point import RuleEntryPoint
from rules_engine.models.message_template import MessageTemplate
import json
from datetime import datetime, timedelta


class Stage6ActedRuleExecutionTests(TestCase):
    """TDD Stage 6: ActedRuleExecution Logging Tests"""
    
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
        
        # Create schema (standardized from Stage 2)
        self.schema = ActedRulesFields.objects.create(
            fields_code='execution_test_schema',
            name='Execution Test Schema',
            description='Schema for execution test context validation',
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
            version=1,
            is_active=True
        )
        
        # Create message template
        self.template = MessageTemplate.objects.create(
            name='execution_test_template',
            title='Execution Test Template',
            content='Cart total: ${cart.total}',
            json_content={
                'title': 'Test Message',
                'message': 'Cart total: ${cart.total}',
                'type': 'banner_message'
            },
            content_format='json',
            message_type='info',
            variables=['cart.total'],
            is_active=True
        )
        
        # Test contexts (standardized from Stage 2)
        self.basic_context = {
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
                        'actual_price': '50.00',
                        'metadata': {
                            'variationId': 6,
                            'variationName': 'Marking Product'
                        },
                        'is_marking': True,
                        'has_expired_deadline': False
                    }
                ],
                'total': 50.00,
                'created_at': '2025-08-05T14:45:42.685123Z',
                'updated_at': '2025-08-08T15:39:05.464553Z',
                'has_marking': True,
                'has_material': False,
                'has_tutorial': False
            }
        }
        
        # Create test rules
        self.test_rule = ActedRule.objects.create(
            rule_code='execution_test_rule',
            name='Execution Test Rule',
            entry_point='checkout_terms',
            rules_fields_code='execution_test_schema',
            condition={'>=': [{'var': 'cart.total'}, 25]},
            actions=[
                {
                    'type': 'display_message',
                    'templateName': 'execution_test_template',
                    'placement': 'top'
                }
            ],
            priority=10,
            active=True
        )
    
    def test_log_execution(self):
        """
        TDD RED: Test that rule execution is persisted to database
        Expected to FAIL initially - no ActedRuleExecution model or logging
        """
        rule = self.test_rule
        context = self.basic_context
        entry_point = 'checkout_terms'
        
        # Expected execution record structure (when ActedRuleExecution model exists)
        expected_execution_fields = {
            'rule_id': 'execution_test_rule',
            'entry_point': 'checkout_terms',
            'context_snapshot': context,
            'condition_result': True,  # Should match condition
            'actions_executed': [
                {
                    'type': 'display_message',
                    'templateName': 'execution_test_template',
                    'status': 'completed',
                    'timestamp': timezone.now().isoformat()
                }
            ],
            'execution_duration_ms': 50,  # Example duration
            'success': True,
            'error_message': None
        }
        
        # This will fail until ActedRuleExecution model is created
        try:
            from rules_engine.models.acted_rule_execution import ActedRuleExecution
            
            # Create execution record (when implemented)
            execution = ActedRuleExecution.objects.create(
                rule_code=rule.rule_code,
                entry_point=entry_point,
                context_snapshot=context,
                condition_result=True,
                actions_executed=[],
                success=True
            )
            
            # Verify execution was logged
            self.assertEqual(execution.rule_code, 'execution_test_rule')
            self.assertEqual(execution.entry_point, 'checkout_terms')
            self.assertEqual(execution.context_snapshot, context)
            self.assertTrue(execution.success)
            
        except ImportError:
            # Expected to fail initially - ActedRuleExecution model doesn't exist yet
            self.fail("ActedRuleExecution model not implemented yet - this test should fail in RED phase")
    
    def test_log_stores_context_snapshot(self):
        """
        TDD RED: Test that full context is stored in execution log
        Expected to FAIL initially - no context snapshot storage
        """
        rule = self.test_rule
        context_with_sensitive_data = {
            'cart': {
                'id': 196,
                'user': 60,
                'session_key': 'sess_12345',
                'items': [
                    {
                        'id': 426,
                        'current_product': 2764,
                        'product_id': 118,
                        'product_name': 'Advanced Course',
                        'product_code': 'ADV',
                        'subject_code': 'CS2',
                        'exam_session_code': '25A',
                        'product_type': 'material',
                        'quantity': 1,
                        'price_type': 'premium',
                        'actual_price': '75.00',
                        'metadata': {
                            'variationId': 7,
                            'variationName': 'Premium Material',
                            'session_id': 'sess_12345'
                        },
                        'is_marking': False,
                        'has_expired_deadline': False
                    }
                ],
                'total': 75.00,
                'created_at': '2025-08-05T14:45:42.685123Z',
                'updated_at': '2025-08-08T15:39:05.464553Z',
                'has_marking': False,
                'has_material': True,
                'has_tutorial': False
            },
            'request_metadata': {
                'timestamp': timezone.now().isoformat(),
                'source': 'web_checkout',
                'version': '1.2.3'
            }
        }
        
        # This will fail until context snapshot logging is implemented
        try:
            from rules_engine.models.acted_rule_execution import ActedRuleExecution
            
            # Create execution with full context snapshot
            execution = ActedRuleExecution.objects.create(
                rule_code=rule.rule_code,
                entry_point='checkout_terms',
                context_snapshot=context_with_sensitive_data,
                condition_result=True,
                success=True
            )
            
            # Verify complete context is stored
            stored_context = execution.context_snapshot
            self.assertEqual(stored_context['cart']['total'], 75.00)
            # User data is stored in cart.user (as integer ID), not as separate object
            self.assertEqual(stored_context['cart']['user'], 60)
            self.assertEqual(stored_context['request_metadata']['source'], 'web_checkout')
            
            # Verify context can be queried
            # Query by cart user ID instead
            executions_with_user_60 = ActedRuleExecution.objects.filter(
                context_snapshot__cart__user=60
            )
            self.assertEqual(executions_with_user_60.count(), 1)
            
        except ImportError:
            # Expected to fail initially
            self.fail("ActedRuleExecution model not implemented - context snapshot storage missing")
    
    def test_log_multiple_rules(self):
        """
        TDD RED: Test that multiple rule executions are stored separately
        Expected to FAIL initially - no multiple execution handling
        """
        # Create additional rules
        rule2 = ActedRule.objects.create(
            rule_code='second_execution_rule',
            name='Second Execution Rule',
            entry_point='checkout_terms',
            rules_fields_code='execution_test_schema',
            condition={'<=': [{'var': 'cart.total'}, 100]},  # Different condition
            actions=[
                {
                    'type': 'user_acknowledge',
                    'templateName': 'execution_test_template',
                    'ackKey': 'second_rule_ack',
                    'required': True
                }
            ],
            priority=20,
            active=True
        )
        
        rule3 = ActedRule.objects.create(
            rule_code='third_execution_rule',
            name='Third Execution Rule',
            entry_point='checkout_terms',
            rules_fields_code='execution_test_schema',
            condition={'==': [{'var': 'user.tier'}, 'standard']},
            actions=[
                {
                    'type': 'update',
                    'target': 'cart.discount',
                    'operation': 'set',
                    'value': 5
                }
            ],
            priority=30,
            active=True
        )
        
        context = self.basic_context
        
        # This will fail until multiple execution logging is implemented
        try:
            from rules_engine.models.acted_rule_execution import ActedRuleExecution
            
            # Simulate executing all 3 rules
            executions = []
            for rule in [self.test_rule, rule2, rule3]:
                execution = ActedRuleExecution.objects.create(
                    rule_code=rule.rule_code,
                    entry_point='checkout_terms',
                    context_snapshot=context,
                    condition_result=True,
                    actions_executed=[rule.actions[0]],
                    success=True
                )
                executions.append(execution)
            
            # Verify all 3 executions logged
            all_executions = ActedRuleExecution.objects.filter(entry_point='checkout_terms')
            self.assertEqual(all_executions.count(), 3)
            
            # Verify distinct rule IDs
            rule_ids = set(exec.rule_code for exec in all_executions)
            expected_rule_ids = {
                'execution_test_rule',
                'second_execution_rule', 
                'third_execution_rule'
            }
            self.assertEqual(rule_ids, expected_rule_ids)
            
            # Verify different action types recorded
            action_types = set()
            for exec in all_executions:
                if exec.actions_executed:
                    action_types.add(exec.actions_executed[0]['type'])
            
            expected_action_types = {'display_message', 'user_acknowledge', 'update'}
            self.assertEqual(action_types, expected_action_types)
            
        except ImportError:
            self.fail("Multiple execution logging not implemented")
    
    def test_execution_audit_trail(self):
        """
        TDD RED: Test comprehensive audit trail with timestamps and metadata
        Expected to FAIL initially - no audit trail implementation
        """
        rule = self.test_rule
        context = self.basic_context
        
        start_time = timezone.now()
        
        # This will fail until audit trail is implemented
        try:
            from rules_engine.models.acted_rule_execution import ActedRuleExecution
            
            # Create execution with full audit data
            execution = ActedRuleExecution.objects.create(
                rule_code=rule.rule_code,
                entry_point='checkout_terms',
                context_snapshot=context,
                condition_result=True,
                condition_evaluation_time_ms=15,
                actions_executed=[
                    {
                        'type': 'display_message',
                        'templateName': 'execution_test_template',
                        'status': 'completed',
                        'start_time': start_time.isoformat(),
                        'end_time': (start_time + timedelta(milliseconds=25)).isoformat(),
                        'duration_ms': 25
                    }
                ],
                total_execution_time_ms=40,
                success=True,
                created_at=start_time,
                metadata={
                    'rule_version': 1,
                    'engine_version': '1.0.0',
                    'request_id': 'req_abc123',
                    'user_id': context['cart']['user']
                }
            )
            
            # Verify audit trail completeness
            self.assertEqual(execution.rule_code, 'execution_test_rule')
            self.assertTrue(execution.condition_result)
            self.assertEqual(execution.condition_evaluation_time_ms, 15)
            self.assertEqual(execution.total_execution_time_ms, 40)
            self.assertEqual(execution.metadata['rule_version'], 1)
            self.assertEqual(execution.metadata['user_id'], 60)
            
            # Verify timestamps are reasonable
            self.assertIsNotNone(execution.created_at)
            self.assertAlmostEqual(
                execution.created_at.timestamp(),
                start_time.timestamp(),
                delta=1  # Within 1 second
            )
            
        except ImportError:
            self.fail("ActedRuleExecution audit trail not implemented")
    
    def test_execution_error_logging(self):
        """
        TDD RED: Test that execution errors are properly logged
        Expected to FAIL initially - no error logging implementation
        """
        # Create rule with invalid action to trigger error
        error_rule = ActedRule.objects.create(
            rule_code='error_execution_rule',
            name='Error Execution Rule',
            entry_point='checkout_terms',
            rules_fields_code='execution_test_schema',
            condition={'==': [True, True]},  # Always true
            actions=[
                {
                    'type': 'invalid_action_type',  # Should cause error
                    'templateName': 'nonexistent_template'
                }
            ],
            priority=5,
            active=True
        )
        
        context = self.basic_context
        
        # This will fail until error logging is implemented
        try:
            from rules_engine.models.acted_rule_execution import ActedRuleExecution
            
            # Simulate execution that encounters error
            execution = ActedRuleExecution.objects.create(
                rule_code=error_rule.rule_code,
                entry_point='checkout_terms',
                context_snapshot=context,
                condition_result=True,
                actions_executed=[],  # No actions completed due to error
                success=False,
                error_message='Unknown action type: invalid_action_type',
                error_details={
                    'action_index': 0,
                    'action_type': 'invalid_action_type',
                    'error_code': 'UNKNOWN_ACTION_TYPE',
                    'stack_trace': 'ActionDispatcher.execute() line 45...'
                }
            )
            
            # Verify error details are logged
            self.assertFalse(execution.success)
            self.assertEqual(execution.error_message, 'Unknown action type: invalid_action_type')
            self.assertEqual(execution.error_details['error_code'], 'UNKNOWN_ACTION_TYPE')
            self.assertEqual(execution.error_details['action_index'], 0)
            
            # Verify failed executions can be queried
            failed_executions = ActedRuleExecution.objects.filter(success=False)
            self.assertEqual(failed_executions.count(), 1)
            self.assertEqual(failed_executions.first().rule_code, 'error_execution_rule')
            
        except ImportError:
            self.fail("Error logging in ActedRuleExecution not implemented")
    
    def test_execution_performance_metrics(self):
        """
        TDD RED: Test that execution performance metrics are tracked
        Expected to FAIL initially - no performance tracking
        """
        rule = self.test_rule
        context = self.basic_context
        
        # This will fail until performance tracking is implemented
        try:
            from rules_engine.models.acted_rule_execution import ActedRuleExecution
            
            # Create execution with performance metrics
            execution = ActedRuleExecution.objects.create(
                rule_code=rule.rule_code,
                entry_point='checkout_terms',
                context_snapshot=context,
                condition_result=True,
                condition_evaluation_time_ms=12,
                template_render_time_ms=8,
                action_execution_time_ms=15,
                total_execution_time_ms=35,
                memory_usage_kb=256,
                context_size_bytes=len(json.dumps(context).encode('utf-8')),
                success=True
            )
            
            # Verify performance metrics
            self.assertEqual(execution.condition_evaluation_time_ms, 12)
            self.assertEqual(execution.template_render_time_ms, 8)
            self.assertEqual(execution.action_execution_time_ms, 15)
            self.assertEqual(execution.total_execution_time_ms, 35)
            self.assertEqual(execution.memory_usage_kb, 256)
            self.assertGreater(execution.context_size_bytes, 0)
            
            # Test performance queries
            slow_executions = ActedRuleExecution.objects.filter(total_execution_time_ms__gte=30)
            self.assertEqual(slow_executions.count(), 1)
            
            large_contexts = ActedRuleExecution.objects.filter(context_size_bytes__gte=500)
            # Should depend on actual context size
            
        except ImportError:
            self.fail("Performance metrics tracking not implemented")
    
    def test_execution_pagination_and_cleanup(self):
        """
        TDD RED: Test execution log pagination and cleanup functionality
        Expected to FAIL initially - no pagination/cleanup implementation
        """
        rule = self.test_rule
        context = self.basic_context
        
        # This will fail until cleanup functionality is implemented
        try:
            from rules_engine.models.acted_rule_execution import ActedRuleExecution
            
            # Create many execution records
            executions = []
            for i in range(25):
                execution = ActedRuleExecution.objects.create(
                    rule_code=rule.rule_code,
                    entry_point='checkout_terms',
                    context_snapshot=context,
                    condition_result=True,
                    success=True,
                    created_at=timezone.now() - timedelta(days=i)
                )
                executions.append(execution)
            
            # Test pagination
            page1 = ActedRuleExecution.objects.order_by('-created_at')[:10]
            self.assertEqual(len(page1), 10)
            
            page2 = ActedRuleExecution.objects.order_by('-created_at')[10:20]
            self.assertEqual(len(page2), 10)
            
            # Test cleanup of old records (older than 30 days)
            cutoff_date = timezone.now() - timedelta(days=30)
            old_executions = ActedRuleExecution.objects.filter(created_at__lt=cutoff_date)
            old_count = old_executions.count()
            
            # Simulate cleanup
            old_executions.delete()
            
            # Verify cleanup worked
            remaining_executions = ActedRuleExecution.objects.all()
            self.assertEqual(remaining_executions.count(), 25 - old_count)
            
        except ImportError:
            self.fail("Execution pagination and cleanup not implemented")