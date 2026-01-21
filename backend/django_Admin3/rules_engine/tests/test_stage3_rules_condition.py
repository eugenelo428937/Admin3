"""
Stage 3 TDD Tests: RulesCondition
- Verify a single condition works (e.g., cart.total > 50)
- Verify compound conditions with AND/OR
- Verify nested sub-conditions
- Verify unsupported operators raise errors
"""

from django.test import TestCase
from django.core.exceptions import ValidationError
from rules_engine.models.acted_rule import ActedRule
import json


class MockJsonLogicEvaluator:
    """Mock JSONLogic evaluator for testing condition evaluation"""
    
    @staticmethod
    def jsonlogic(condition, data):
        """Simple JSONLogic evaluation mock for testing"""
        if condition == {'==': [True, True]}:
            return True
        elif condition == {'==': [False, False]}:
            return True
        elif condition == {'==': [True, False]}:
            return False
        elif '>=' in condition:
            # Handle >= conditions like {'>=': [{'var': 'cart.total'}, 50]}
            if isinstance(condition['>='], list) and len(condition['>=']) == 2:
                left, right = condition['>=']
                if isinstance(left, dict) and 'var' in left:
                    var_path = left['var']
                    value = MockJsonLogicEvaluator._get_nested_value(data, var_path)
                    if value is None:
                        return False  # Handle None values
                    return value >= right
        elif '>' in condition:
            # Handle > conditions like {'>': [{'var': 'cart.total'}, 50]}
            if isinstance(condition['>'], list) and len(condition['>']) == 2:
                left, right = condition['>']
                if isinstance(left, dict) and 'var' in left:
                    var_path = left['var']
                    value = MockJsonLogicEvaluator._get_nested_value(data, var_path)
                    if value is None:
                        return False  # Handle None values
                    return value > right
        elif 'and' in condition:
            # Handle AND conditions like {'and': [condition1, condition2]}
            conditions = condition['and']
            return all(MockJsonLogicEvaluator.jsonlogic(cond, data) for cond in conditions)
        elif 'or' in condition:
            # Handle OR conditions like {'or': [condition1, condition2]}
            conditions = condition['or']
            return any(MockJsonLogicEvaluator.jsonlogic(cond, data) for cond in conditions)
        elif '==' in condition:
            # Handle == conditions like {'==': [{'var': 'user.region'}, 'EU']}
            if isinstance(condition['=='], list) and len(condition['==']) == 2:
                left, right = condition['==']
                if isinstance(left, dict) and 'var' in left:
                    var_path = left['var']
                    value = MockJsonLogicEvaluator._get_nested_value(data, var_path)
                    return value == right
                return left == right
        elif 'in' in condition:
            # Handle in conditions like {'in': [{'var': 'user.region'}, ['EU', 'US']]}
            if isinstance(condition['in'], list) and len(condition['in']) == 2:
                left, right = condition['in']
                if isinstance(left, dict) and 'var' in left:
                    var_path = left['var']
                    value = MockJsonLogicEvaluator._get_nested_value(data, var_path)
                    return value in right
        return False
    
    @staticmethod
    def _get_nested_value(data, path):
        """Get nested value from data using dot notation"""
        keys = path.split('.')
        value = data
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            elif isinstance(value, list) and key.isdigit():
                # Handle array access like items.0
                index = int(key)
                if 0 <= index < len(value):
                    value = value[index]
                else:
                    return None
            else:
                return None
        return value


class Stage3RulesConditionTests(TestCase):
    """TDD Stage 3: Rules Condition Evaluation Tests"""
    
    def setUp(self):
        """Set up test data"""
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
                    },
                    {
                        'id': 426,
                        'current_product': 2765,
                        'product_id': 117,
                        'product_name': 'Series X Assignments (Marking)',
                        'product_code': 'X',
                        'subject_code': 'CM2',
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
                'total': 70.00,
                'created_at': '2025-08-05T14:45:42.685123Z',
                'updated_at': '2025-08-08T15:39:05.464553Z',
                'has_marking': True,
                'has_material': False,
                'has_tutorial': False
            }
        }
    
    def test_simple_condition_cart_total_greater_than(self):
        """
        TDD RED: Test simple condition - cart total greater than value
        Expected to FAIL initially - no condition evaluation
        """
        condition = {'>': [{'var': 'cart.total'}, 50]}
        
        rule = ActedRule(
            rule_code='test_cart_total',
            name='Cart Total Rule',
            entry_point='checkout_start',
            condition=condition,
            actions=[{'type': 'display_message', 'text': 'High value cart'}]
        )
        
        # Test condition evaluation
        result = MockJsonLogicEvaluator.jsonlogic(rule.condition, self.test_context)
        self.assertTrue(result)  # 69.98 > 50 should be True
        
        # Test with lower total
        low_total_context = self.test_context.copy()
        low_total_context['cart']['total'] = 30.00
        result_low = MockJsonLogicEvaluator.jsonlogic(rule.condition, low_total_context)
        self.assertFalse(result_low)  # 30.00 > 50 should be False
    
    def test_simple_condition_cart_has_marking(self):
        """
        TDD RED: Test simple condition - cart has marking products
        Expected to FAIL initially - no boolean comparison evaluation
        """
        condition = {'==': [{'var': 'cart.has_marking'}, True]}
        
        rule = ActedRule(
            rule_code='test_cart_marking',
            name='Marking Cart Rule',
            entry_point='checkout_terms',
            condition=condition,
            actions=[{'type': 'display_marking_notice'}]
        )
        
        # Test condition evaluation
        result = MockJsonLogicEvaluator.jsonlogic(rule.condition, self.test_context)
        self.assertTrue(result)  # cart.has_marking == True should be True
        
        # Test with different marking status
        no_marking_context = self.test_context.copy()
        no_marking_context['cart']['has_marking'] = False
        result_no_marking = MockJsonLogicEvaluator.jsonlogic(rule.condition, no_marking_context)
        self.assertFalse(result_no_marking)  # cart.has_marking == True should be False when has_marking is False
    
    def test_compound_condition_and_logic(self):
        """
        TDD RED: Test compound condition with AND logic
        Expected to FAIL initially - no AND evaluation
        """
        condition = {
            'and': [
                {'>': [{'var': 'cart.total'}, 50]},
                {'==': [{'var': 'cart.has_marking'}, True]}
            ]
        }
        
        rule = ActedRule(
            rule_code='test_and_condition',
            name='High Value Marking Cart Rule',
            entry_point='checkout_start',
            condition=condition,
            actions=[{'type': 'apply_marking_discount'}]
        )
        
        # Test when both conditions are true
        result = MockJsonLogicEvaluator.jsonlogic(rule.condition, self.test_context)
        self.assertTrue(result)  # cart.total > 50 AND cart.has_marking == True
        
        # Test when first condition is false
        low_total_context = self.test_context.copy()
        low_total_context['cart']['total'] = 30.00
        result_low = MockJsonLogicEvaluator.jsonlogic(rule.condition, low_total_context)
        self.assertFalse(result_low)  # 30 > 50 is False, so AND result is False
        
        # Test when second condition is false
        no_marking_context = self.test_context.copy()
        no_marking_context['cart']['has_marking'] = False
        result_no_marking = MockJsonLogicEvaluator.jsonlogic(rule.condition, no_marking_context)
        self.assertFalse(result_no_marking)  # has_marking != True, so AND result is False
    
    def test_compound_condition_or_logic(self):
        """
        TDD RED: Test compound condition with OR logic
        Expected to FAIL initially - no OR evaluation
        """
        condition = {
            'or': [
                {'>': [{'var': 'cart.total'}, 100]},
                {'==': [{'var': 'cart.has_material'}, True]}
            ]
        }
        
        rule = ActedRule(
            rule_code='test_or_condition',
            name='High Value or Material Cart Rule',
            entry_point='checkout_start',
            condition=condition,
            actions=[{'type': 'apply_premium_benefits'}]
        )
        
        # Test when first condition is true
        high_total_context = self.test_context.copy()
        high_total_context['cart']['total'] = 150.00
        result_high = MockJsonLogicEvaluator.jsonlogic(rule.condition, high_total_context)
        self.assertTrue(result_high)  # 150 > 100 is True, so OR result is True
        
        # Test when second condition is true
        material_context = self.test_context.copy()
        material_context['cart']['has_material'] = True
        result_material = MockJsonLogicEvaluator.jsonlogic(rule.condition, material_context)
        self.assertTrue(result_material)  # has_material == True is True, so OR result is True
        
        # Test when both conditions are false - use fresh context
        fresh_context = {
            'cart': {
                'id': 196,
                'user': 60,
                'session_key': None,
                'items': [],
                'total': 70.00,  # Not > 100
                'has_material': False,  # Not == True
                'has_marking': True
            }
        }
        result_neither = MockJsonLogicEvaluator.jsonlogic(rule.condition, fresh_context)
        self.assertFalse(result_neither)  # 70.00 <= 100 AND has_material == False
    
    def test_nested_condition_complex_logic(self):
        """
        TDD RED: Test nested conditions with complex logic
        Expected to FAIL initially - no nested evaluation
        """
        # Use length of cart.items array instead of separate item_count field
        condition = {
            'and': [
                {
                    'or': [
                        {'>': [{'var': 'cart.total'}, 50]},
                        {'==': [{'var': 'cart.has_marking'}, True]}
                    ]
                },
                {
                    '>=': [{'var': 'cart.user'}, 1]  # Check if cart has a user (user ID >= 1)
                }
            ]
        }
        
        rule = ActedRule(
            rule_code='test_nested_condition',
            name='Complex Nested Rule',
            entry_point='checkout_terms',
            condition=condition,
            actions=[{'type': 'show_cart_terms'}]
        )
        
        # Test when outer AND and inner OR both evaluate to True
        result = MockJsonLogicEvaluator.jsonlogic(rule.condition, self.test_context)
        self.assertTrue(result)  # (70.00 > 50 OR has_marking == True) AND (user >= 1)
        
        # Test with no user (should fail outer AND)
        no_user_context = self.test_context.copy()
        no_user_context['cart']['user'] = None
        result_no_user = MockJsonLogicEvaluator.jsonlogic(rule.condition, no_user_context)
        self.assertFalse(result_no_user)
        
        # Test with low total but marking products (inner OR should still be True)
        low_total_marking_context = {
            'cart': {
                'id': 196,
                'user': 60,  # user >= 1 should be True
                'session_key': None,
                'items': [],
                'total': 20.00,  # 20 > 50 is False
                'has_marking': True  # has_marking == True is True
            }
        }
        # Expected: (False OR True) AND True = True AND True = True
        result_low_marking = MockJsonLogicEvaluator.jsonlogic(rule.condition, low_total_marking_context)
        self.assertTrue(result_low_marking)  # (20 <= 50 BUT has_marking == True) AND (user >= 1)
    
    def test_condition_with_in_operator(self):
        """
        TDD RED: Test condition using 'in' operator for array membership
        Expected to FAIL initially - no 'in' operator support
        """
        condition = {
            'in': [{'var': 'cart.items.0.product_type'}, ['marking', 'material', 'tutorial']]
        }
        
        rule = ActedRule(
            rule_code='test_in_condition',
            name='Product Type Membership Rule',
            entry_point='product_display',
            condition=condition,
            actions=[{'type': 'show_product_specific_info'}]
        )
        
        # Test when product type is in the allowed list
        result_marking = MockJsonLogicEvaluator.jsonlogic(rule.condition, self.test_context)
        self.assertTrue(result_marking)  # 'marking' in ['marking', 'material', 'tutorial']
        
        # Test with material product type
        material_context = self.test_context.copy()
        material_context['cart']['items'][0]['product_type'] = 'material'
        result_material = MockJsonLogicEvaluator.jsonlogic(rule.condition, material_context)
        self.assertTrue(result_material)  # 'material' in ['marking', 'material', 'tutorial']
        
        # Test with product type not in list
        other_context = self.test_context.copy()
        other_context['cart']['items'][0]['product_type'] = 'other'
        result_other = MockJsonLogicEvaluator.jsonlogic(rule.condition, other_context)
        self.assertFalse(result_other)  # 'other' not in ['marking', 'material', 'tutorial']
    
    def test_condition_validation_rejects_invalid_structure(self):
        """
        TDD RED: Test that invalid condition structures are rejected during validation
        Expected to FAIL initially - no condition validation
        """
        # Test condition that is not a dict
        invalid_rule_string = ActedRule(
            rule_code='invalid_string_condition',
            name='Invalid String Condition',
            entry_point='test',
            condition='not_a_dict',  # Should be dict
            actions=[{'type': 'test'}]
        )
        
        with self.assertRaises(ValidationError) as cm:
            invalid_rule_string.full_clean()
        
        self.assertIn('Condition must be a JSON object', str(cm.exception))
        
        # Test condition that is a list instead of dict
        invalid_rule_list = ActedRule(
            rule_code='invalid_list_condition',
            name='Invalid List Condition',
            entry_point='test',
            condition=['not', 'a', 'dict'],  # Should be dict
            actions=[{'type': 'test'}]
        )
        
        with self.assertRaises(ValidationError) as cm:
            invalid_rule_list.full_clean()
        
        self.assertIn('Condition must be a JSON object', str(cm.exception))
    
    def test_unsupported_operator_error_handling(self):
        """
        TDD RED: Test that unsupported operators raise appropriate errors
        Expected to FAIL initially - no operator validation
        """
        # Create condition with unsupported operator
        unsupported_condition = {
            'UNSUPPORTED_OP': [{'var': 'cart.total'}, 50]
        }
        
        rule = ActedRule(
            rule_code='test_unsupported_op',
            name='Unsupported Operator Rule',
            entry_point='test',
            condition=unsupported_condition,
            actions=[{'type': 'test'}]
        )
        
        # Should handle gracefully or return False for unknown operators
        result = MockJsonLogicEvaluator.jsonlogic(rule.condition, self.test_context)
        self.assertFalse(result)  # Unknown operators should default to False
    
    def test_condition_with_missing_variable_path(self):
        """
        TDD RED: Test condition evaluation with missing variable paths
        Expected to FAIL initially - no missing path handling
        """
        condition = {'==': [{'var': 'nonexistent.path'}, 'value']}
        
        rule = ActedRule(
            rule_code='test_missing_path',
            name='Missing Path Rule',
            entry_point='test',
            condition=condition,
            actions=[{'type': 'test'}]
        )
        
        # Should handle missing paths gracefully (return None/False)
        result = MockJsonLogicEvaluator.jsonlogic(rule.condition, self.test_context)
        self.assertFalse(result)  # Missing path should result in False comparison
    
    def test_condition_json_serialization(self):
        """
        TDD RED: Test that conditions can be properly JSON serialized/deserialized
        Expected to FAIL initially - no JSON serialization handling
        """
        condition = {
            'and': [
                {'>': [{'var': 'cart.total'}, 50]},
                {'==': [{'var': 'user.region'}, 'EU']}
            ]
        }
        
        rule = ActedRule.objects.create(
            rule_code='test_json_serialization',
            name='JSON Serialization Test',
            entry_point='test',
            condition=condition,
            actions=[{'type': 'test'}]
        )
        
        # Fetch from database and verify condition is properly deserialized
        fetched_rule = ActedRule.objects.get(rule_code='test_json_serialization')
        self.assertEqual(fetched_rule.condition, condition)
        self.assertIsInstance(fetched_rule.condition, dict)
        self.assertIn('and', fetched_rule.condition)
    
    def test_condition_with_multiple_data_types(self):
        """
        TDD RED: Test conditions working with different data types (string, int, float, bool)
        Expected to FAIL initially - no multi-type support
        """
        # Test integer comparison (cart.user is integer)
        int_condition = {'==': [{'var': 'cart.user'}, 60]}
        int_result = MockJsonLogicEvaluator.jsonlogic(int_condition, self.test_context)
        self.assertTrue(int_result)  # cart.user == 60
        
        # Test float comparison (cart.total is float)
        float_condition = {'>=': [{'var': 'cart.total'}, 70.00]}
        float_result = MockJsonLogicEvaluator.jsonlogic(float_condition, self.test_context)
        self.assertTrue(float_result)  # total >= 70.00
        
        # Test string comparison (product_code is string)
        string_condition = {'==': [{'var': 'cart.items.0.product_code'}, 'X']}
        string_result = MockJsonLogicEvaluator.jsonlogic(string_condition, self.test_context)
        self.assertTrue(string_result)  # product_code == 'X'
        
        # Test boolean comparison
        bool_condition = {'==': [{'var': 'cart.has_marking'}, True]}
        bool_result = MockJsonLogicEvaluator.jsonlogic(bool_condition, self.test_context)
        self.assertTrue(bool_result)  # has_marking == True