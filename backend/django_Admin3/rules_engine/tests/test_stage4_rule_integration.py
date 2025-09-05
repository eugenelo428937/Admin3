"""
Stage 4 TDD Tests: Rule Integration
- Verify a rule ties together entry point + fields + condition
- Verify inactive rules are ignored
- Verify multiple rules at same entry point are processed
"""

from django.test import TestCase
from django.core.exceptions import ValidationError
from rules_engine.models.acted_rule import ActedRule
from rules_engine.models.acted_rules_fields import ActedRulesFields
from rules_engine.models.rule_entry_point import RuleEntryPoint
import jsonschema
from jsonschema import ValidationError as JsonSchemaValidationError


class Stage4RuleIntegrationTests(TestCase):
    """TDD Stage 4: Rule Integration Tests"""
    
    def setUp(self):
        """Set up test data"""
        # Create entry point
        self.entry_point = RuleEntryPoint.objects.create(
            code='checkout_terms',
            name='Checkout Terms Display',
            description='Entry point for checkout terms',
            is_active=True
        )
        
        # Create schema for validation
        self.schema = ActedRulesFields.objects.create(
            fields_id='checkout_context_v1',
            name='Checkout Context Schema',
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
                                'items': {
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
                        'required': ['id', 'user', 'session_key', 'items']
                    }
                },
                'required': ['cart']
            },
            is_active=True
        )
        
        # Valid test context
        self.valid_context = {            
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
                        'metadata': {'variationId': 6, 'variationName': 'Marking Product'},
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
        
        # Base rule data
        self.base_rule_data = {
            'name': 'Contains Marking Product with expired deadlines Checkout Terms Rule',
            'entry_point': 'checkout_terms',
            'rules_fields_id': 'checkout_context_v1',
            'condition': {
                            "and": [
                                {'==': [{'var': 'cart.items.item.is_marking'}, True]}, 
                                {'==': [{'var': 'cart.items.item.has_expired_deadline'}, True]}
                            ]
                        },
            'actions': [
                {
                    'type': 'user_acknowledge',
                    'templateId': 'eu_terms_template',
                    'ackKey': 'eu_terms_accepted'
                }
            ],
            'priority': 10,
            'active': True
        }
    
    def test_rule_ties_together_entry_point_fields_condition(self):
        """
        TDD RED: Test that rule integrates entry point, schema, and condition
        Expected to FAIL initially - no integration validation
        """
        rule = ActedRule.objects.create(
            rule_id='integration_test_rule',
            **self.base_rule_data
        )
        
        # Verify rule references correct entry point
        self.assertEqual(rule.entry_point, 'checkout_terms')
        
        # Verify rule references correct schema
        self.assertEqual(rule.rules_fields_id, 'checkout_context_v1')
        
        # Verify condition is properly stored
        expected_condition = {
            "and": [
                {'==': [{'var': 'cart.items.item.is_marking'}, True]}, 
                {'==': [{'var': 'cart.items.item.has_expired_deadline'}, True]}
            ]
        }
        self.assertEqual(rule.condition, expected_condition)
        
        # Verify actions are properly stored
        self.assertEqual(len(rule.actions), 1)
        self.assertEqual(rule.actions[0]['type'], 'user_acknowledge')
        
        # Verify rule can be fetched by entry point
        entry_point_rules = ActedRule.objects.filter(entry_point='checkout_terms')
        self.assertEqual(entry_point_rules.count(), 1)
        self.assertEqual(entry_point_rules.first().rule_id, 'integration_test_rule')
    
    def test_rule_context_validation_with_schema(self):
        """
        TDD RED: Test that rule context is validated against referenced schema
        Expected to FAIL initially - no context validation integration
        """
        rule = ActedRule.objects.create(
            rule_id='context_validation_rule',
            **self.base_rule_data
        )
        
        # Get the referenced schema
        referenced_schema = ActedRulesFields.objects.get(fields_id=rule.rules_fields_id)
        
        # Valid context should pass validation
        try:
            jsonschema.validate(self.valid_context, referenced_schema.schema)
        except JsonSchemaValidationError:
            self.fail("Valid context should pass schema validation")
        
        # Invalid context should fail validation
        invalid_context = {
            'cart': {
                'id': 196,
                'session_key': None,
                'items': []
                # Missing required 'user' field
            }
        }
        
        with self.assertRaises(JsonSchemaValidationError) as cm:
            jsonschema.validate(invalid_context, referenced_schema.schema)
        
        self.assertIn("'user' is a required property", str(cm.exception))
    
    def test_inactive_rules_are_ignored_in_queries(self):
        """
        TDD RED: Test that inactive rules are filtered out during queries
        Expected to FAIL initially - no active filtering
        """
        # Create active rule
        active_rule_data = self.base_rule_data.copy()
        active_rule = ActedRule.objects.create(
            rule_id='active_rule',
            **active_rule_data
        )
        
        # Create inactive rule
        inactive_rule_data = self.base_rule_data.copy()
        inactive_rule_data['name'] = 'Inactive Rule'
        inactive_rule_data['active'] = False
        inactive_rule = ActedRule.objects.create(
            rule_id='inactive_rule',
            **inactive_rule_data
        )
        
        # Query for active rules only
        active_rules = ActedRule.objects.filter(
            entry_point='checkout_terms',
            active=True
        )
        
        # Should return only active rule
        self.assertEqual(active_rules.count(), 1)
        self.assertEqual(active_rules.first().rule_id, 'active_rule')
        
        # Verify inactive rule exists but is not in active query
        all_rules = ActedRule.objects.filter(entry_point='checkout_terms')
        self.assertEqual(all_rules.count(), 2)
    
    def test_multiple_rules_same_entry_point_processing_order(self):
        """
        TDD RED: Test that multiple rules at same entry point are processed in priority order
        Expected to FAIL initially - no priority ordering
        """
        # Create multiple rules with different priorities
        rule1 = ActedRule.objects.create(
            rule_id='high_priority_rule',
            name='High Priority Rule',
            priority=1,  # Highest priority
            entry_point='checkout_terms',
            condition={'==': [True, True]},
            actions=[{'type': 'display_urgent', 'message': 'Urgent message'}]
        )
        
        rule2 = ActedRule.objects.create(
            rule_id='medium_priority_rule', 
            name='Medium Priority Rule',
            priority=50,  # Medium priority
            entry_point='checkout_terms',
            condition={'==': [True, True]},
            actions=[{'type': 'display_info', 'message': 'Info message'}]
        )
        
        rule3 = ActedRule.objects.create(
            rule_id='low_priority_rule',
            name='Low Priority Rule',
            priority=100,  # Lowest priority
            entry_point='checkout_terms',
            condition={'==': [True, True]},
            actions=[{'type': 'display_notice', 'message': 'Notice message'}]
        )
        
        # Query rules ordered by priority
        ordered_rules = ActedRule.objects.filter(
            entry_point='checkout_terms',
            active=True
        ).order_by('priority')
        
        # Verify correct ordering
        self.assertEqual(ordered_rules.count(), 3)
        self.assertEqual(ordered_rules[0].rule_id, 'high_priority_rule')
        self.assertEqual(ordered_rules[1].rule_id, 'medium_priority_rule')
        self.assertEqual(ordered_rules[2].rule_id, 'low_priority_rule')
        
        # Verify priorities
        self.assertEqual(ordered_rules[0].priority, 1)
        self.assertEqual(ordered_rules[1].priority, 50)
        self.assertEqual(ordered_rules[2].priority, 100)
    
    def test_rule_stop_processing_flag_functionality(self):
        """
        TDD RED: Test that stop_processing flag controls rule execution flow
        Expected to FAIL initially - no stop_processing logic
        """
        # Create rule with stop_processing=True
        stop_rule = ActedRule.objects.create(
            rule_id='stop_processing_rule',
            name='Stop Processing Rule',
            priority=10,
            entry_point='checkout_terms',
            stop_processing=True,  # Should stop further processing
            condition={'==': [True, True]},
            actions=[{'type': 'critical_alert', 'message': 'Critical alert'}]
        )
        
        # Create rule that should not be processed if stop_processing works
        later_rule = ActedRule.objects.create(
            rule_id='later_rule',
            name='Later Rule',
            priority=20,  # Lower priority (processed after)
            entry_point='checkout_terms',
            stop_processing=False,
            condition={'==': [True, True]},
            actions=[{'type': 'normal_message', 'message': 'Normal message'}]
        )
        
        # Query rules in processing order
        processing_order = ActedRule.objects.filter(
            entry_point='checkout_terms',
            active=True
        ).order_by('priority')
        
        # Verify stop_processing rule comes first
        self.assertEqual(processing_order[0].rule_id, 'stop_processing_rule')
        self.assertTrue(processing_order[0].stop_processing)
        
        # Verify later rule exists but would be skipped in processing
        self.assertEqual(processing_order[1].rule_id, 'later_rule')
        self.assertFalse(processing_order[1].stop_processing)
    
    def test_rule_actions_array_validation(self):
        """
        TDD RED: Test that rule actions array is properly validated
        Expected to FAIL initially - no actions validation
        """
        # Test valid actions array
        valid_rule = ActedRule(
            rule_id='valid_actions_rule',
            name='Valid Actions Rule',
            entry_point='checkout_terms',
            condition={'==': [True, True]},
            actions=[
                {'type': 'display_message', 'templateId': 'msg1'},
                {'type': 'user_acknowledge', 'ackKey': 'terms_accepted'}
            ]
        )
        
        # Should not raise validation error
        try:
            valid_rule.full_clean()
        except ValidationError:
            self.fail("Valid actions array should pass validation")
        
        # Test invalid actions (not an array)
        invalid_rule_not_array = ActedRule(
            rule_id='invalid_actions_not_array',
            name='Invalid Actions Not Array',
            entry_point='checkout_terms',
            condition={'==': [True, True]},
            actions={'type': 'not_an_array'}  # Should be array
        )
        
        with self.assertRaises(ValidationError) as cm:
            invalid_rule_not_array.full_clean()
        
        self.assertIn('Actions must be a JSON array', str(cm.exception))
        
        # Test invalid action (missing type field)
        invalid_rule_missing_type = ActedRule(
            rule_id='invalid_action_missing_type',
            name='Invalid Action Missing Type',
            entry_point='checkout_terms',
            condition={'==': [True, True]},
            actions=[{'templateId': 'msg1'}]  # Missing 'type' field
        )
        
        with self.assertRaises(ValidationError) as cm:
            invalid_rule_missing_type.full_clean()
        
        self.assertIn('must have a "type" field', str(cm.exception))
    
    def test_rule_version_and_metadata_tracking(self):
        """
        TDD RED: Test that rule version and metadata are properly tracked
        Expected to FAIL initially - no version/metadata handling
        """
        metadata = {
            'created_by': 'admin_user',
            'created_at': '2025-08-29T10:00:00Z',
            'purpose': 'EU GDPR compliance'
        }
        
        versioned_rule_data = self.base_rule_data.copy()
        versioned_rule_data['name'] = 'Versioned Rule'
        versioned_rule_data['version'] = 1
        versioned_rule_data['metadata'] = metadata
        
        rule = ActedRule.objects.create(
            rule_id='versioned_rule',
            **versioned_rule_data
        )
        
        # Verify version tracking
        self.assertEqual(rule.version, 1)
        
        # Verify metadata storage
        self.assertEqual(rule.metadata, metadata)
        self.assertEqual(rule.metadata['created_by'], 'admin_user')
        self.assertEqual(rule.metadata['purpose'], 'EU GDPR compliance')
        
        # Create updated version
        updated_metadata = metadata.copy()
        updated_metadata['updated_by'] = 'admin_user'
        updated_metadata['updated_at'] = '2025-08-30T10:00:00Z'
        
        updated_rule_data = self.base_rule_data.copy()
        updated_rule_data['name'] = 'Versioned Rule v2'
        updated_rule_data['version'] = 2
        updated_rule_data['metadata'] = updated_metadata
        
        updated_rule = ActedRule.objects.create(
            rule_id='versioned_rule_v2',
            **updated_rule_data
        )
        
        self.assertEqual(updated_rule.version, 2)
        self.assertEqual(updated_rule.metadata['updated_by'], 'admin_user')
    
    def test_rule_active_date_range_filtering(self):
        """
        TDD RED: Test that rules can be filtered by active date ranges
        Expected to FAIL initially - no date range filtering
        """
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        now = timezone.now()
        yesterday = now - timedelta(days=1)
        tomorrow = now + timedelta(days=1)
        
        # Create rule that becomes active tomorrow
        future_rule = ActedRule.objects.create(
            rule_id='future_rule',
            name='Future Rule',
            active_from=tomorrow,
            entry_point='checkout_terms',
            condition={'==': [True, True]},
            actions=[{'type': 'future_message'}]
        )
        
        # Create rule that expired yesterday
        expired_rule = ActedRule.objects.create(
            rule_id='expired_rule',
            name='Expired Rule',
            active_from=yesterday - timedelta(days=2),
            active_until=yesterday,
            entry_point='checkout_terms',
            condition={'==': [True, True]},
            actions=[{'type': 'expired_message'}]
        )
        
        # Create currently active rule
        current_rule = ActedRule.objects.create(
            rule_id='current_rule',
            name='Current Rule',
            active_from=yesterday,
            active_until=tomorrow,
            entry_point='checkout_terms',
            condition={'==': [True, True]},
            actions=[{'type': 'current_message'}]
        )
        
        # Query for currently active rules
        currently_active = ActedRule.objects.filter(
            entry_point='checkout_terms',
            active=True,
            active_from__lte=now,
            active_until__gte=now
        )
        
        # Should return only the current rule
        self.assertEqual(currently_active.count(), 1)
        self.assertEqual(currently_active.first().rule_id, 'current_rule')
    
    def test_rule_database_indexes_performance(self):
        """
        TDD RED: Test that database indexes are properly configured for performance
        Expected to FAIL initially - no index configuration
        """
        from django.db import connection
        
        # Create multiple rules to test index usage
        for i in range(10):
            ActedRule.objects.create(
                rule_id=f'performance_rule_{i}',
                name=f'Performance Rule {i}',
                entry_point='checkout_terms',
                priority=i * 10,
                condition={'==': [True, True]},
                actions=[{'type': 'test_message'}]
            )
        
        # Verify indexes exist in model meta
        indexes = ActedRule._meta.indexes
        index_names = [idx.name for idx in indexes]
        
        # Should have indexes for common query patterns
        self.assertIn('acted_rules_entry_active', index_names)
        self.assertIn('acted_rules_rule_id', index_names)
        self.assertIn('acted_rules_active_ent', index_names)
        
        # Test query performance with indexes
        with connection.cursor() as cursor:
            # Query that should use entry_point + active index
            cursor.execute("""
                SELECT rule_id FROM acted_rules_engine 
                WHERE entry_point = %s AND active = %s 
                ORDER BY priority
            """, ['checkout_terms', True])
            
            results = cursor.fetchall()
            self.assertEqual(len(results), 10)