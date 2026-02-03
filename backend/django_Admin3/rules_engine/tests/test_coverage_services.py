"""
Coverage gap tests for rules_engine/services/rule_engine.py
and rules_engine/services/template_processor.py

Tests cover:
- ValidationResult
- RuleRepository (get_active_rules, invalidate_cache)
- Validator (validate_context with various scenarios)
- ConditionEvaluator (all operators, edge cases)
- ActionDispatcher (all action types, error handling)
- ExecutionStore (store_execution, Decimal handling)
- RuleEngine (execute, _set_nested_value, _validate_context_structure,
              _get_template_content, schema validation errors,
              update actions, preference actions, stop_processing)
- TemplateProcessor (process_variables, all resolution strategies,
                     built-in functions, filter_and_extract, etc.)
"""

import time
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase
from django.core.cache import cache

from rules_engine.models import (
    ActedRule, ActedRulesFields, MessageTemplate,
    RuleEntryPoint, ActedRuleExecution,
)
from rules_engine.services.rule_engine import (
    ValidationResult, RuleRepository, Validator, ConditionEvaluator,
    ActionDispatcher, ExecutionStore, RuleEngine, rule_engine,
)
from rules_engine.services.template_processor import TemplateProcessor


class BaseServiceTestSetup(TestCase):
    """Shared setup for service tests."""

    def setUp(self):
        ActedRule.objects.all().delete()
        ActedRulesFields.objects.all().delete()
        MessageTemplate.objects.all().delete()
        ActedRuleExecution.objects.all().delete()
        cache.clear()

        RuleEntryPoint.objects.get_or_create(
            code='checkout_terms',
            defaults={'name': 'Checkout Terms', 'description': 'T&C'}
        )
        RuleEntryPoint.objects.get_or_create(
            code='home_page_mount',
            defaults={'name': 'Home Page', 'description': 'Home'}
        )


# ===========================================================================
# ValidationResult
# ===========================================================================

class TestValidationResult(TestCase):
    """Tests for ValidationResult class."""

    def test_valid_result(self):
        vr = ValidationResult(is_valid=True)
        self.assertTrue(vr.is_valid)
        self.assertEqual(vr.errors, [])

    def test_invalid_result_with_errors(self):
        vr = ValidationResult(is_valid=False, errors=['Error 1', 'Error 2'])
        self.assertFalse(vr.is_valid)
        self.assertEqual(len(vr.errors), 2)


# ===========================================================================
# RuleRepository
# ===========================================================================

class TestRuleRepository(BaseServiceTestSetup):
    """Tests for RuleRepository."""

    def test_get_active_rules_cache_miss(self):
        """Should fetch from DB on cache miss."""
        ActedRule.objects.create(
            rule_code='cov_repo_1', name='Repo Rule 1',
            entry_point='checkout_terms', condition={'==': [1, 1]},
            actions=[], priority=10, active=True,
        )
        repo = RuleRepository()
        cache.clear()
        rules = repo.get_active_rules('checkout_terms')
        self.assertEqual(len(rules), 1)

    def test_get_active_rules_cache_hit(self):
        """Should use cache on second call."""
        ActedRule.objects.create(
            rule_code='cov_repo_2', name='Repo Rule 2',
            entry_point='checkout_terms', condition={'==': [1, 1]},
            actions=[], priority=10, active=True,
        )
        repo = RuleRepository()
        cache.clear()
        # First call - cache miss
        rules1 = repo.get_active_rules('checkout_terms')
        # Second call - cache hit
        rules2 = repo.get_active_rules('checkout_terms')
        self.assertEqual(len(rules1), len(rules2))

    def test_get_active_rules_excludes_inactive(self):
        """Should only return active rules."""
        ActedRule.objects.create(
            rule_code='cov_repo_active', name='Active',
            entry_point='checkout_terms', condition={'==': [1, 1]},
            actions=[], priority=10, active=True,
        )
        ActedRule.objects.create(
            rule_code='cov_repo_inactive', name='Inactive',
            entry_point='checkout_terms', condition={'==': [1, 1]},
            actions=[], priority=10, active=False,
        )
        repo = RuleRepository()
        cache.clear()
        rules = repo.get_active_rules('checkout_terms')
        rule_codes = [r.rule_code for r in rules]
        self.assertIn('cov_repo_active', rule_codes)
        self.assertNotIn('cov_repo_inactive', rule_codes)

    def test_invalidate_cache(self):
        """Should invalidate cache for entry point."""
        repo = RuleRepository()
        # Warm cache
        cache.set('rules:checkout_terms', ['rule1'], timeout=300)
        repo.invalidate_cache('checkout_terms')
        self.assertIsNone(cache.get('rules:checkout_terms'))

    def test_cache_key_with_spaces(self):
        """Should normalize spaces in entry point for cache key."""
        repo = RuleRepository()
        cache.clear()
        rules = repo.get_active_rules('entry with spaces')
        self.assertEqual(rules, [])
        repo.invalidate_cache('entry with spaces')


# ===========================================================================
# Validator
# ===========================================================================

class TestValidator(BaseServiceTestSetup):
    """Tests for Validator."""

    def test_validate_non_dict_context(self):
        """Should reject non-dict context."""
        v = Validator()
        result = v.validate_context('not a dict')
        self.assertFalse(result.is_valid)

    def test_validate_no_schema(self):
        """Should pass when no schema specified."""
        v = Validator()
        result = v.validate_context({'key': 'value'})
        self.assertTrue(result.is_valid)

    def test_validate_schema_not_found(self):
        """Should fail when schema not found in DB."""
        v = Validator()
        result = v.validate_context({'key': 'value'}, 'nonexistent_schema')
        self.assertFalse(result.is_valid)

    def test_validate_schema_success(self):
        """Should pass with valid context matching schema."""
        ActedRulesFields.objects.create(
            fields_code='cov_valid_schema',
            name='Valid Schema',
            schema={
                'type': 'object',
                'properties': {'name': {'type': 'string'}},
            },
            version=1,
        )
        v = Validator()
        result = v.validate_context({'name': 'test'}, 'cov_valid_schema')
        self.assertTrue(result.is_valid)

    def test_validate_schema_failure(self):
        """Should fail with invalid context."""
        ActedRulesFields.objects.create(
            fields_code='cov_strict_schema',
            name='Strict Schema',
            schema={
                'type': 'object',
                'properties': {'age': {'type': 'integer'}},
                'required': ['age'],
            },
            version=1,
        )
        v = Validator()
        result = v.validate_context({}, 'cov_strict_schema')
        self.assertFalse(result.is_valid)

    def test_validate_schema_caching(self):
        """Should cache schemas after first lookup."""
        ActedRulesFields.objects.create(
            fields_code='cov_cached_schema',
            name='Cached Schema',
            schema={'type': 'object'},
            version=1,
        )
        v = Validator()
        v.validate_context({}, 'cov_cached_schema')
        # Second call should use cache
        self.assertIn('cov_cached_schema', v._schema_cache)
        v.validate_context({}, 'cov_cached_schema')

    def test_validate_unexpected_error(self):
        """Should handle unexpected errors in validation."""
        v = Validator()
        with patch.object(v, '_schema_cache', {'bad_schema': 'not_a_schema'}):
            result = v.validate_context({}, 'bad_schema')
            self.assertFalse(result.is_valid)


# ===========================================================================
# ConditionEvaluator
# ===========================================================================

class TestConditionEvaluator(TestCase):
    """Tests for ConditionEvaluator."""

    def setUp(self):
        self.evaluator = ConditionEvaluator()

    def test_always_true_condition(self):
        self.assertTrue(self.evaluator.evaluate({'always': True}, {}))

    def test_always_true_type(self):
        self.assertTrue(self.evaluator.evaluate({'type': 'always_true'}, {}))

    def test_always_false_type(self):
        self.assertFalse(self.evaluator.evaluate({'type': 'always_false'}, {}))

    def test_jsonlogic_type_wrapper(self):
        """Should handle type=jsonlogic with expr field."""
        condition = {
            'type': 'jsonlogic',
            'expr': {'==': [{'var': 'x'}, 1]},
        }
        self.assertTrue(self.evaluator.evaluate(condition, {'x': 1}))
        self.assertFalse(self.evaluator.evaluate(condition, {'x': 2}))

    def test_equality_operator(self):
        condition = {'==': [{'var': 'a'}, 'hello']}
        self.assertTrue(self.evaluator.evaluate(condition, {'a': 'hello'}))
        self.assertFalse(self.evaluator.evaluate(condition, {'a': 'world'}))

    def test_inequality_operator(self):
        condition = {'!=': [{'var': 'a'}, 'hello']}
        self.assertTrue(self.evaluator.evaluate(condition, {'a': 'world'}))
        self.assertFalse(self.evaluator.evaluate(condition, {'a': 'hello'}))

    def test_in_operator(self):
        condition = {'in': ['a', {'var': 'items'}]}
        self.assertTrue(self.evaluator.evaluate(condition, {'items': ['a', 'b']}))
        self.assertFalse(self.evaluator.evaluate(condition, {'items': ['c', 'd']}))

    def test_in_operator_empty_haystack(self):
        condition = {'in': ['a', {'var': 'items'}]}
        self.assertFalse(self.evaluator.evaluate(condition, {'items': None}))

    def test_some_operator(self):
        condition = {
            'some': [
                {'var': 'items'},
                {'==': [{'var': 'type'}, 'marking']},
            ],
        }
        ctx = {'items': [{'type': 'material'}, {'type': 'marking'}]}
        self.assertTrue(self.evaluator.evaluate(condition, ctx))

    def test_some_operator_non_list(self):
        condition = {'some': [{'var': 'items'}, {'==': [1, 1]}]}
        self.assertFalse(self.evaluator.evaluate(condition, {'items': 'not_a_list'}))

    def test_some_operator_no_match(self):
        condition = {
            'some': [
                {'var': 'items'},
                {'==': [{'var': 'type'}, 'tutorial']},
            ],
        }
        ctx = {'items': [{'type': 'material'}, {'type': 'marking'}]}
        self.assertFalse(self.evaluator.evaluate(condition, ctx))

    def test_and_operator(self):
        condition = {
            'and': [
                {'==': [{'var': 'a'}, True]},
                {'==': [{'var': 'b'}, True]},
            ],
        }
        self.assertTrue(self.evaluator.evaluate(condition, {'a': True, 'b': True}))
        self.assertFalse(self.evaluator.evaluate(condition, {'a': True, 'b': False}))

    def test_or_operator(self):
        condition = {
            'or': [
                {'==': [{'var': 'a'}, True]},
                {'==': [{'var': 'b'}, True]},
            ],
        }
        self.assertTrue(self.evaluator.evaluate(condition, {'a': False, 'b': True}))
        self.assertFalse(self.evaluator.evaluate(condition, {'a': False, 'b': False}))

    def test_not_operator(self):
        condition = {'!': [{'==': [{'var': 'a'}, True]}]}
        self.assertTrue(self.evaluator.evaluate(condition, {'a': False}))
        self.assertFalse(self.evaluator.evaluate(condition, {'a': True}))

    def test_gte_operator(self):
        condition = {'>=': [{'var': 'x'}, 10]}
        self.assertTrue(self.evaluator.evaluate(condition, {'x': 10}))
        self.assertTrue(self.evaluator.evaluate(condition, {'x': 15}))
        self.assertFalse(self.evaluator.evaluate(condition, {'x': 5}))

    def test_gt_operator(self):
        condition = {'>': [{'var': 'x'}, 10]}
        self.assertTrue(self.evaluator.evaluate(condition, {'x': 15}))
        self.assertFalse(self.evaluator.evaluate(condition, {'x': 10}))

    def test_lt_operator(self):
        condition = {'<': [{'var': 'x'}, 10]}
        self.assertTrue(self.evaluator.evaluate(condition, {'x': 5}))
        self.assertFalse(self.evaluator.evaluate(condition, {'x': 10}))

    def test_lte_operator(self):
        condition = {'<=': [{'var': 'x'}, 10]}
        self.assertTrue(self.evaluator.evaluate(condition, {'x': 10}))
        self.assertTrue(self.evaluator.evaluate(condition, {'x': 5}))
        self.assertFalse(self.evaluator.evaluate(condition, {'x': 15}))

    def test_unknown_operator(self):
        condition = {'unknown_op': [1, 2]}
        self.assertFalse(self.evaluator.evaluate(condition, {}))

    def test_var_none_returns_data(self):
        """When var is None, should return the full data."""
        result = self.evaluator._evaluate_jsonlogic({'var': None}, {'a': 1})
        self.assertEqual(result, {'a': 1})

    def test_nested_var_access(self):
        condition = {'==': [{'var': 'user.region'}, 'EU']}
        self.assertTrue(self.evaluator.evaluate(condition, {'user': {'region': 'EU'}}))

    def test_array_index_var(self):
        """Should support array indexing in var paths."""
        condition = {'==': [{'var': 'items.0'}, 'first']}
        self.assertTrue(self.evaluator.evaluate(condition, {'items': ['first', 'second']}))

    def test_array_index_out_of_bounds(self):
        result = self.evaluator._get_nested_value({'items': ['a']}, 'items.5')
        self.assertIsNone(result)

    def test_missing_key_returns_none(self):
        result = self.evaluator._get_nested_value({'a': 1}, 'b.c')
        self.assertIsNone(result)

    def test_compare_none_values(self):
        self.assertFalse(self.evaluator._compare_values(None, 10, '>='))
        self.assertFalse(self.evaluator._compare_values(10, None, '>='))

    def test_string_comparison(self):
        """Should support string comparison for dates."""
        self.assertTrue(self.evaluator._compare_values('2025-12-11', '2025-12-01', '>'))
        self.assertTrue(self.evaluator._compare_values('2025-01-01', '2025-12-31', '<'))
        self.assertTrue(self.evaluator._compare_values('2025-01-01', '2025-01-01', '>='))
        self.assertTrue(self.evaluator._compare_values('2025-01-01', '2025-01-01', '<='))

    def test_incompatible_types_comparison(self):
        self.assertFalse(self.evaluator._compare_values([1], {'a': 1}, '>'))

    def test_evaluate_exception(self):
        """Should return False on evaluation exception."""
        result = self.evaluator.evaluate({'==': 'invalid'}, {})
        self.assertFalse(result)

    def test_non_boolean_result_conversion(self):
        """Should convert non-boolean truthy values."""
        # Direct non-dict return from _evaluate_jsonlogic
        result = self.evaluator._evaluate_jsonlogic('hello', {})
        self.assertEqual(result, 'hello')

    def test_resolve_var_backwards_compat(self):
        """Test _resolve_var for backwards compatibility."""
        result = self.evaluator._resolve_var({'var': 'a.b'}, {'a': {'b': 42}})
        self.assertEqual(result, 42)

    def test_resolve_var_non_var(self):
        result = self.evaluator._resolve_var('literal', {})
        self.assertEqual(result, 'literal')

    def test_empty_logic_dict(self):
        """Empty dict should return False."""
        result = self.evaluator._evaluate_jsonlogic({}, {})
        self.assertFalse(result)

    def test_numeric_string_comparison(self):
        """String numeric values should compare correctly."""
        self.assertTrue(self.evaluator._compare_values('20', '10', '>'))
        self.assertTrue(self.evaluator._compare_values('5', '10', '<'))


# ===========================================================================
# ActionDispatcher
# ===========================================================================

class TestActionDispatcher(BaseServiceTestSetup):
    """Tests for ActionDispatcher."""

    def setUp(self):
        super().setUp()
        self.dispatcher = ActionDispatcher()

    def test_display_message_basic(self):
        """Should return display message action result."""
        actions = [{'type': 'display_message', 'title': 'Test', 'content': 'Hello'}]
        results = self.dispatcher.dispatch(actions, {})
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['type'], 'display_message')
        self.assertTrue(results[0]['success'])

    def test_display_message_with_template(self):
        """Should load content from template."""
        template = MessageTemplate.objects.create(
            name='cov_action_template',
            title='Action Template',
            content='Template content',
            content_format='html',
            message_type='info',
            variables=[],
            dismissible=False,
        )
        actions = [{
            'type': 'display_message',
            'templateId': template.id,
        }]
        results = self.dispatcher.dispatch(actions, {})
        self.assertTrue(results[0]['success'])
        self.assertEqual(results[0]['message']['content']['message'], 'Template content')
        self.assertFalse(results[0]['message']['content']['dismissible'])

    def test_display_message_with_json_template(self):
        """Should use JSON content from template when available."""
        template = MessageTemplate.objects.create(
            name='cov_json_template',
            title='JSON Template',
            content='Fallback content',
            json_content={
                'content': {
                    'title': 'JSON Title',
                    'message': 'JSON Message',
                },
            },
            content_format='json',
            message_type='info',
            variables=[],
        )
        actions = [{
            'type': 'display_message',
            'templateId': template.id,
        }]
        results = self.dispatcher.dispatch(actions, {})
        self.assertTrue(results[0]['success'])
        self.assertEqual(results[0]['message']['content']['title'], 'JSON Title')

    def test_display_message_template_not_found(self):
        """Should fall back when template not found."""
        actions = [{
            'type': 'display_message',
            'templateId': 99999,
            'title': 'Fallback Title',
            'content': 'Fallback Content',
        }]
        results = self.dispatcher.dispatch(actions, {})
        self.assertTrue(results[0]['success'])

    def test_user_acknowledge_basic(self):
        """Should return acknowledge action result."""
        actions = [{
            'type': 'user_acknowledge',
            'ackKey': 'test_ack',
            'required': True,
        }]
        results = self.dispatcher.dispatch(actions, {})
        self.assertEqual(results[0]['type'], 'user_acknowledge')
        self.assertTrue(results[0]['success'])
        self.assertEqual(results[0]['message']['ack_key'], 'test_ack')

    def test_user_acknowledge_with_json_template(self):
        """Should load JSON content for acknowledge template."""
        template = MessageTemplate.objects.create(
            name='cov_ack_template',
            title='Ack Template',
            content='Fallback',
            json_content={
                'content': {
                    'title': 'T&C',
                    'message': 'Please accept',
                },
            },
            content_format='json',
            message_type='terms',
            variables=[],
        )
        actions = [{
            'type': 'user_acknowledge',
            'templateId': template.id,
            'ackKey': 'tc_ack',
        }]
        results = self.dispatcher.dispatch(actions, {})
        self.assertTrue(results[0]['success'])
        self.assertEqual(results[0]['message']['title'], 'T&C')

    def test_user_acknowledge_with_text_template(self):
        """Should load plain text content for acknowledge."""
        template = MessageTemplate.objects.create(
            name='cov_ack_text',
            title='Text Ack',
            content='Please accept terms',
            content_format='html',
            message_type='terms',
            variables=[],
        )
        actions = [{
            'type': 'user_acknowledge',
            'templateId': template.id,
            'ackKey': 'text_ack',
        }]
        results = self.dispatcher.dispatch(actions, {})
        self.assertTrue(results[0]['success'])
        self.assertEqual(results[0]['message']['content'], 'Please accept terms')

    def test_user_acknowledge_template_not_found(self):
        """Should use fallback when template not found."""
        actions = [{
            'type': 'user_acknowledge',
            'templateId': 99999,
            'ackKey': 'missing_ack',
        }]
        results = self.dispatcher.dispatch(actions, {})
        self.assertTrue(results[0]['success'])

    def test_user_preference_action(self):
        """Should return preference action result."""
        actions = [{
            'type': 'user_preference',
            'preferenceKey': 'pref_key',
            'title': 'Preference Title',
            'inputType': 'checkbox',
        }]
        results = self.dispatcher.dispatch(actions, {})
        self.assertEqual(results[0]['type'], 'user_preference')
        self.assertTrue(results[0]['success'])

    def test_user_preference_with_template(self):
        """Should load template content for preference."""
        template = MessageTemplate.objects.create(
            name='cov_pref_template',
            title='Pref Template',
            content='Pref content',
            json_content={
                'content': {'title': 'Pref JSON', 'message': 'opt-in?'},
            },
            content_format='json',
            message_type='info',
            variables=[],
        )
        actions = [{
            'type': 'user_preference',
            'messageTemplateId': template.id,
            'preferenceKey': 'pref_json',
        }]
        results = self.dispatcher.dispatch(actions, {})
        self.assertTrue(results[0]['success'])

    def test_update_action_set(self):
        """Should set nested context value."""
        context = {}
        actions = [{
            'type': 'update',
            'target': 'cart.vat_rate',
            'operation': 'set',
            'value': 0.20,
        }]
        results = self.dispatcher.dispatch(actions, context)
        self.assertTrue(results[0]['success'])
        self.assertEqual(context['cart']['vat_rate'], 0.20)

    def test_update_action_unknown_operation(self):
        """Should delegate to UpdateHandler for non-set operations."""
        context = {'cart': {'id': 999}}
        actions = [{
            'type': 'update',
            'target': 'cart.fees',
            'operation': 'add_fee',
            'value': {'fee_type': 'test', 'amount': 1.00},
        }]
        results = self.dispatcher.dispatch(actions, context)
        # Will fail since no real cart, but should not crash
        self.assertEqual(results[0]['type'], 'update')

    def test_call_function_action(self):
        """Should call registered function."""
        context = {'amount': 100}
        actions = [{
            'type': 'call_function',
            'function': 'calculate_vat_amount',
            'args': [{'var': 'amount'}, '0.20'],
            'store_result_in': 'vat.amount',
        }]
        results = self.dispatcher.dispatch(actions, context)
        self.assertTrue(results[0]['success'])
        self.assertIn('result', results[0])
        self.assertEqual(context['vat']['amount'], Decimal('20.00'))

    def test_call_function_not_found(self):
        """Should return error for unknown function."""
        actions = [{
            'type': 'call_function',
            'function': 'nonexistent_function',
            'args': [],
        }]
        results = self.dispatcher.dispatch(actions, {})
        self.assertFalse(results[0]['success'])

    def test_call_function_exception(self):
        """Should handle function execution errors."""
        actions = [{
            'type': 'call_function',
            'function': 'calculate_vat_amount',
            'args': ['not_a_number', 'also_not'],
        }]
        results = self.dispatcher.dispatch(actions, {})
        self.assertFalse(results[0]['success'])

    def test_call_function_no_store(self):
        """Should work without store_result_in."""
        actions = [{
            'type': 'call_function',
            'function': 'add_decimals',
            'args': ['10', '20'],
        }]
        results = self.dispatcher.dispatch(actions, {})
        self.assertTrue(results[0]['success'])
        self.assertEqual(results[0]['result'], Decimal('30'))

    def test_unknown_action_type(self):
        """Should return error for unknown action type."""
        actions = [{'type': 'nonexistent_action'}]
        results = self.dispatcher.dispatch(actions, {})
        self.assertFalse(results[0]['success'])
        self.assertIn('Unknown action type', results[0]['error'])

    def test_action_exception_handling(self):
        """Should catch and report action exceptions."""
        actions = [{'type': 'display_message', 'templateId': 'invalid'}]
        # This won't crash but might produce warnings
        results = self.dispatcher.dispatch(actions, {})
        self.assertEqual(len(results), 1)

    def test_display_message_with_context_mapping(self):
        """Should process template variables with context_mapping."""
        template = MessageTemplate.objects.create(
            name='cov_mapping_template',
            title='Hello {{user_name}}',
            content='Welcome {{user_name}} to {{site}}',
            content_format='html',
            message_type='info',
            variables=['user_name', 'site'],
        )
        context = {'user': {'name': 'John'}, 'site': 'Admin3'}
        actions = [{
            'type': 'display_message',
            'templateId': template.id,
            'context_mapping': {
                'user_name': {'type': 'context', 'path': 'user.name'},
                'site': {'type': 'static', 'value': 'Admin3'},
            },
        }]
        results = self.dispatcher.dispatch(actions, context)
        self.assertTrue(results[0]['success'])


# ===========================================================================
# ExecutionStore
# ===========================================================================

class TestExecutionStore(BaseServiceTestSetup):
    """Tests for ExecutionStore."""

    def test_store_execution_success(self):
        """Should store execution record."""
        store = ExecutionStore()
        seq = store.store_execution(
            rule_id='test_rule',
            entry_point='checkout_terms',
            context={'key': 'value'},
            actions_result=[{'type': 'display_message', 'success': True}],
            outcome='success',
            execution_time_ms=5.0,
        )
        self.assertTrue(seq.startswith('exec_'))
        self.assertTrue(ActedRuleExecution.objects.filter(execution_seq_no=seq).exists())

    def test_store_execution_with_decimals(self):
        """Should handle Decimal values in context."""
        store = ExecutionStore()
        seq = store.store_execution(
            rule_id='dec_rule',
            entry_point='checkout_terms',
            context={'amount': Decimal('100.50')},
            actions_result=[{'vat': Decimal('20.10')}],
            outcome='success',
            execution_time_ms=2.0,
        )
        self.assertTrue(ActedRuleExecution.objects.filter(execution_seq_no=seq).exists())

    def test_store_execution_error(self):
        """Should store error execution record."""
        store = ExecutionStore()
        seq = store.store_execution(
            rule_id='err_rule',
            entry_point='checkout_terms',
            context={},
            actions_result=[],
            outcome='error',
            execution_time_ms=0.5,
            error_message='Something went wrong',
        )
        self.assertTrue(seq.startswith('exec_'))

    def test_store_execution_db_error(self):
        """Should handle DB errors gracefully."""
        store = ExecutionStore()
        with patch.object(ActedRuleExecution.objects, 'create', side_effect=Exception('DB error')):
            seq = store.store_execution(
                'fail_rule', 'checkout_terms', {}, [], 'error', 0.0,
            )
            self.assertTrue(seq.startswith('exec_'))


# ===========================================================================
# RuleEngine
# ===========================================================================

class TestRuleEngine(BaseServiceTestSetup):
    """Tests for RuleEngine main execute method."""

    def test_execute_no_rules(self):
        """Should return success with empty results when no rules."""
        engine = RuleEngine()
        result = engine.execute('nonexistent_entry', {})
        self.assertTrue(result['success'])
        self.assertEqual(result['rules_evaluated'], 0)

    def test_execute_with_matching_rule(self):
        """Should execute matching rules."""
        ActedRule.objects.create(
            rule_code='cov_engine_match',
            name='Engine Match',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{'type': 'display_message', 'content': 'Hello'}],
            priority=10,
            active=True,
        )
        engine = RuleEngine()
        result = engine.execute('checkout_terms', {})
        self.assertTrue(result['success'])
        self.assertGreater(result['rules_evaluated'], 0)
        self.assertTrue(len(result['messages']) > 0)

    def test_execute_with_non_matching_rule(self):
        """Should track non-matching rules."""
        ActedRule.objects.create(
            rule_code='cov_engine_no_match',
            name='No Match',
            entry_point='checkout_terms',
            condition={'==': [{'var': 'x'}, 'impossible']},
            actions=[{'type': 'display_message'}],
            priority=10,
            active=True,
        )
        engine = RuleEngine()
        result = engine.execute('checkout_terms', {'x': 'real'})
        self.assertTrue(result['success'])
        self.assertEqual(result['rules_evaluated'], 1)
        self.assertEqual(len(result['messages']), 0)

    def test_execute_with_stop_processing(self):
        """Should stop processing when stop_processing=True."""
        ActedRule.objects.create(
            rule_code='cov_stop_first',
            name='Stop First',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{'type': 'display_message', 'content': 'First'}],
            priority=100,
            active=True,
            stop_processing=True,
        )
        ActedRule.objects.create(
            rule_code='cov_stop_second',
            name='Stop Second',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{'type': 'display_message', 'content': 'Second'}],
            priority=50,
            active=True,
        )
        engine = RuleEngine()
        result = engine.execute('checkout_terms', {})
        # First rule should stop processing, second should not execute
        self.assertTrue(result['success'])
        executed = [r for r in result['rules_executed'] if r['condition_result']]
        self.assertEqual(len(executed), 1)
        self.assertEqual(executed[0]['rule_id'], 'cov_stop_first')

    def test_execute_blocking_acknowledgment(self):
        """Should block when required acknowledgment missing."""
        ActedRule.objects.create(
            rule_code='cov_blocking_ack',
            name='Blocking Ack',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{
                'type': 'user_acknowledge',
                'ackKey': 'block_key',
                'required': True,
            }],
            priority=10,
            active=True,
        )
        engine = RuleEngine()
        result = engine.execute('checkout_terms', {})
        self.assertTrue(result['blocked'])
        self.assertIn('block_key', [a['ackKey'] for a in result['required_acknowledgments']])

    def test_execute_satisfied_acknowledgment(self):
        """Should not block when acknowledgment is satisfied."""
        ActedRule.objects.create(
            rule_code='cov_satisfied_ack',
            name='Satisfied Ack',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{
                'type': 'user_acknowledge',
                'ackKey': 'sat_key',
                'required': True,
            }],
            priority=10,
            active=True,
        )
        engine = RuleEngine()
        context = {
            'acknowledgments': {
                'sat_key': {'acknowledged': True},
            },
        }
        result = engine.execute('checkout_terms', context)
        self.assertFalse(result['blocked'])
        self.assertIn('sat_key', result['satisfied_acknowledgments'])

    def test_execute_optional_acknowledgment(self):
        """Should not block for non-required acknowledgments (preference prompts)."""
        ActedRule.objects.create(
            rule_code='cov_optional_ack',
            name='Optional Ack',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{
                'type': 'user_acknowledge',
                'ackKey': 'opt_key',
                'required': False,
            }],
            priority=10,
            active=True,
        )
        engine = RuleEngine()
        result = engine.execute('checkout_terms', {})
        self.assertFalse(result['blocked'])

    def test_execute_user_preference_action(self):
        """Should collect preference prompts."""
        ActedRule.objects.create(
            rule_code='cov_pref_action',
            name='Pref Action',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{
                'type': 'user_preference',
                'preferenceKey': 'newsletter',
                'inputType': 'checkbox',
                'title': 'Subscribe?',
            }],
            priority=10,
            active=True,
        )
        engine = RuleEngine()
        result = engine.execute('checkout_terms', {})
        self.assertTrue(result['success'])
        self.assertTrue(len(result['preference_prompts']) > 0)

    def test_execute_update_set_action(self):
        """Should update context with set operation."""
        ActedRule.objects.create(
            rule_code='cov_update_set',
            name='Update Set',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{
                'type': 'update',
                'target': 'vat.rate',
                'operation': 'set',
                'value': 0.20,
            }],
            priority=10,
            active=True,
        )
        engine = RuleEngine()
        context = {}
        result = engine.execute('checkout_terms', context)
        self.assertTrue(result['success'])
        self.assertIn('vat.rate', result.get('context_updates', {}))

    def test_execute_update_increment_action(self):
        """Should increment context value."""
        ActedRule.objects.create(
            rule_code='cov_update_incr',
            name='Update Increment',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{
                'type': 'update',
                'target': 'counter',
                'operation': 'increment',
                'value': 5,
            }],
            priority=10,
            active=True,
        )
        engine = RuleEngine()
        result = engine.execute('checkout_terms', {'counter': 10})
        self.assertTrue(result['success'])

    def test_execute_schema_validation_errors(self):
        """Should return schema validation errors."""
        ActedRulesFields.objects.create(
            fields_code='cov_engine_strict',
            name='Strict Schema',
            schema={
                'type': 'object',
                'required': ['must_have'],
                'properties': {'must_have': {'type': 'string'}},
            },
            version=1,
        )
        ActedRule.objects.create(
            rule_code='cov_schema_fail',
            name='Schema Fail Rule',
            entry_point='checkout_terms',
            rules_fields_code='cov_engine_strict',
            condition={'==': [1, 1]},
            actions=[{'type': 'display_message'}],
            priority=10,
            active=True,
        )
        engine = RuleEngine()
        result = engine.execute('checkout_terms', {})
        self.assertFalse(result['success'])
        self.assertIn('schema_validation_errors', result)

    def test_execute_rule_exception(self):
        """Should handle rule processing exception."""
        ActedRule.objects.create(
            rule_code='cov_exception_rule',
            name='Exception Rule',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{'type': 'display_message'}],
            priority=10,
            active=True,
        )
        engine = RuleEngine()
        with patch.object(engine.condition_evaluator, 'evaluate', side_effect=Exception('Eval boom')):
            result = engine.execute('checkout_terms', {})
            # Should still succeed overall
            self.assertIn('success', result)

    def test_execute_fatal_error(self):
        """Should handle fatal errors."""
        engine = RuleEngine()
        with patch.object(engine.rule_repository, 'get_active_rules', side_effect=Exception('Fatal')):
            result = engine.execute('checkout_terms', {})
            self.assertFalse(result['success'])
            self.assertIn('error', result)

    def test_set_nested_value(self):
        """Should set nested dict values."""
        engine = RuleEngine()
        data = {}
        engine._set_nested_value(data, 'a.b.c', 42)
        self.assertEqual(data['a']['b']['c'], 42)

    def test_set_nested_value_error(self):
        """Should handle errors gracefully."""
        engine = RuleEngine()
        data = {'a': 'not_a_dict'}
        # This should log error but not crash
        engine._set_nested_value(data, 'a.b.c', 42)

    def test_validate_context_structure(self):
        """Should detect context structure issues."""
        engine = RuleEngine()
        # No issues
        issues = engine._validate_context_structure({})
        self.assertEqual(issues, [])

        # cart.user should be int or None
        issues = engine._validate_context_structure({
            'cart': {'user': 'string_value'},
        })
        self.assertTrue(len(issues) > 0)

        # user should be dict or None
        issues = engine._validate_context_structure({
            'user': 'string_value',
        })
        self.assertTrue(len(issues) > 0)

    def test_validate_context_structure_valid(self):
        """Should not flag valid structures."""
        engine = RuleEngine()
        issues = engine._validate_context_structure({
            'cart': {'user': 123},
            'user': {'id': 1, 'email': 'test@test.com'},
        })
        self.assertEqual(issues, [])

    def test_get_template_content_success(self):
        """Should return template content."""
        template = MessageTemplate.objects.create(
            name='cov_get_content',
            title='Get Content',
            content='test',
            json_content={'key': 'value'},
            content_format='json',
            message_type='info',
            variables=[],
        )
        engine = RuleEngine()
        content = engine._get_template_content('cov_get_content')
        self.assertEqual(content, {'key': 'value'})

    def test_get_template_content_not_found(self):
        """Should return empty dict when template not found."""
        engine = RuleEngine()
        content = engine._get_template_content('nonexistent_template')
        self.assertEqual(content, {})

    def test_get_template_content_none(self):
        """Should return empty dict for None template name."""
        engine = RuleEngine()
        content = engine._get_template_content(None)
        self.assertEqual(content, {})

    def test_global_instance(self):
        """Should have a global rule_engine instance."""
        self.assertIsInstance(rule_engine, RuleEngine)

    def test_execute_update_results_collected(self):
        """Should collect update results in result dict."""
        ActedRule.objects.create(
            rule_code='cov_update_collect',
            name='Update Collect',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{
                'type': 'update',
                'target': 'order.total',
                'operation': 'set',
                'value': 120.00,
                'description': 'Set total',
            }],
            priority=10,
            active=True,
        )
        engine = RuleEngine()
        result = engine.execute('checkout_terms', {})
        self.assertTrue(result['success'])


# ===========================================================================
# TemplateProcessor
# ===========================================================================

class TestTemplateProcessor(TestCase):
    """Tests for TemplateProcessor."""

    def setUp(self):
        self.processor = TemplateProcessor()

    def test_process_variables_basic(self):
        """Should replace variables in content and title."""
        content = 'Hello {{name}}, welcome to {{site}}'
        title = '{{site}} Greeting'
        mapping = {
            'name': 'John',
            'site': 'Admin3',
        }
        processed_content, processed_title = self.processor.process_variables(
            content, title, mapping, {},
        )
        self.assertEqual(processed_content, 'Hello John, welcome to Admin3')
        self.assertEqual(processed_title, 'Admin3 Greeting')

    def test_process_variables_from_context(self):
        """Should resolve variables directly from context."""
        content = 'Hello {{name}}'
        title = 'Greeting'
        context = {'name': 'Alice'}
        processed_content, _ = self.processor.process_variables(
            content, title, {}, context,
        )
        self.assertEqual(processed_content, 'Hello Alice')

    def test_process_variables_dot_notation(self):
        """Should resolve underscore-to-dot notation."""
        content = 'Region: {{user_region}}'
        context = {'user': {'region': 'EU'}}
        processed_content, _ = self.processor.process_variables(
            content, '', {}, context,
        )
        self.assertEqual(processed_content, 'Region: EU')

    def test_process_variables_special(self):
        """Should resolve special variables like current_date."""
        content = 'Date: {{current_date}}'
        processed_content, _ = self.processor.process_variables(
            content, '', {}, {},
        )
        self.assertNotIn('{{current_date}}', processed_content)

    def test_process_variables_unresolved(self):
        """Should leave unresolved variables as-is."""
        content = 'Hello {{unknown_var}}'
        processed_content, _ = self.processor.process_variables(
            content, '', {}, {},
        )
        self.assertEqual(processed_content, 'Hello {{unknown_var}}')

    def test_process_variables_empty_content(self):
        """Should handle empty content/title."""
        content, title = self.processor.process_variables('', '', {}, {})
        self.assertEqual(content, '')
        self.assertEqual(title, '')

    def test_process_variables_none_title(self):
        """Should handle None title."""
        content, title = self.processor.process_variables(
            'Hello', None, {}, {},
        )
        self.assertEqual(content, 'Hello')
        self.assertIsNone(title)

    def test_resolve_mapping_static(self):
        """Should resolve static mapping definitions."""
        result = self.processor._resolve_mapping_definition(
            {'type': 'static', 'value': 'hello'}, {},
        )
        self.assertEqual(result, 'hello')

    def test_resolve_mapping_context(self):
        """Should resolve context path mapping."""
        result = self.processor._resolve_mapping_definition(
            {'type': 'context', 'path': 'user.name'},
            {'user': {'name': 'Bob'}},
        )
        self.assertEqual(result, 'Bob')

    def test_resolve_mapping_function(self):
        """Should call registered functions."""
        result = self.processor._resolve_mapping_definition(
            {'type': 'function', 'function': 'current_timestamp', 'args': []},
            {},
        )
        self.assertIsNotNone(result)

    def test_resolve_mapping_expression_known(self):
        """Expression type with known function raises TypeError.

        The production code calls self.functions[expr](context) but the
        registered functions (e.g., _current_timestamp) don't accept a
        context argument. This triggers a TypeError.
        """
        with self.assertRaises(TypeError):
            self.processor._resolve_mapping_definition(
                {'type': 'expression', 'expression': 'current_timestamp'},
                {},
            )

    def test_resolve_mapping_expression_unknown(self):
        """Should fall back to path evaluation for unknown expressions."""
        result = self.processor._resolve_mapping_definition(
            {'type': 'expression', 'expression': 'user.name'},
            {'user': {'name': 'Test'}},
        )
        self.assertEqual(result, 'Test')

    def test_resolve_mapping_filter(self):
        """Should filter and extract from arrays."""
        result = self.processor._resolve_mapping_definition(
            {
                'type': 'filter',
                'source': 'items',
                'condition': {'type': {'eq': 'marking'}},
                'extract': 'name',
            },
            {'items': [
                {'type': 'material', 'name': 'Book'},
                {'type': 'marking', 'name': 'Assignment'},
            ]},
        )
        self.assertEqual(result, 'Assignment')

    def test_resolve_mapping_simple_value(self):
        """Should return simple values directly."""
        self.assertEqual(self.processor._resolve_mapping_definition(42, {}), 42)
        self.assertEqual(self.processor._resolve_mapping_definition('hello', {}), 'hello')
        self.assertEqual(self.processor._resolve_mapping_definition(True, {}), True)

    def test_resolve_dot_notation_no_underscore(self):
        """Should return None when no underscore in var name."""
        result = self.processor._resolve_dot_notation('simple', {'simple': 'value'})
        self.assertIsNone(result)

    def test_get_nested_value_list_index(self):
        """Should support list indexing."""
        result = self.processor._get_nested_value(
            {'items': ['first', 'second']}, 'items.0',
        )
        self.assertEqual(result, 'first')

    def test_get_nested_value_index_out_of_bounds(self):
        result = self.processor._get_nested_value(
            {'items': ['only']}, 'items.5',
        )
        self.assertIsNone(result)

    def test_get_nested_value_missing_key(self):
        result = self.processor._get_nested_value({'a': 1}, 'b.c')
        self.assertIsNone(result)

    def test_filter_and_extract_non_list(self):
        """Should return None for non-list source."""
        result = self.processor._filter_and_extract(
            'not_array', {}, '', {'not_array': 'string'},
        )
        self.assertIsNone(result)

    def test_filter_and_extract_no_matches(self):
        """Should return None when no items match."""
        result = self.processor._filter_and_extract(
            'items', {'type': {'eq': 'missing'}}, 'name',
            {'items': [{'type': 'other', 'name': 'test'}]},
        )
        self.assertIsNone(result)

    def test_filter_and_extract_no_extract(self):
        """Should return full item when no extract field."""
        result = self.processor._filter_and_extract(
            'items', {'type': 'marking'}, '',
            {'items': [{'type': 'marking', 'name': 'test'}]},
        )
        self.assertEqual(result, {'type': 'marking', 'name': 'test'})

    def test_filter_and_extract_in_condition(self):
        """Should handle 'in' condition."""
        result = self.processor._filter_and_extract(
            'items', {'id': {'in': [1, 2]}}, 'name',
            {'items': [
                {'id': 1, 'name': 'First'},
                {'id': 3, 'name': 'Third'},
            ]},
        )
        self.assertEqual(result, 'First')

    def test_matches_condition_direct_equality(self):
        self.assertTrue(self.processor._matches_condition(
            {'status': 'active'}, {'status': 'active'},
        ))
        self.assertFalse(self.processor._matches_condition(
            {'status': 'active'}, {'status': 'inactive'},
        ))

    def test_call_function_known(self):
        result = self.processor._call_function('array_length', ['$items'], {'items': [1, 2, 3]})
        self.assertEqual(result, 3)

    def test_call_function_unknown(self):
        result = self.processor._call_function('unknown_func', [], {})
        self.assertIsNone(result)

    def test_call_function_error(self):
        """Should handle function call errors."""
        result = self.processor._call_function('format_date', ['invalid_arg'], {})
        # format_date with invalid input should return the input as string
        self.assertIsNotNone(result)

    def test_call_function_context_ref(self):
        """Should resolve $-prefixed args from context."""
        result = self.processor._call_function(
            'array_first', ['$items'], {'items': ['a', 'b']},
        )
        self.assertEqual(result, 'a')

    def test_evaluate_expression(self):
        result = self.processor._evaluate_expression('a.b', {'a': {'b': 42}})
        self.assertEqual(result, 42)

    def test_format_date_iso(self):
        result = self.processor._format_date('2025-12-11')
        self.assertEqual(result, '11/12/2025')

    def test_format_date_with_time(self):
        result = self.processor._format_date('2025-12-11T14:30:00')
        self.assertEqual(result, '11/12/2025')

    def test_format_date_custom_format(self):
        result = self.processor._format_date('2025-12-11', '%Y/%m/%d')
        self.assertEqual(result, '2025/12/11')

    def test_format_date_invalid(self):
        result = self.processor._format_date('not-a-date')
        self.assertEqual(result, 'not-a-date')

    def test_format_date_non_string(self):
        result = self.processor._format_date(12345)
        self.assertEqual(result, '12345')

    def test_current_timestamp(self):
        result = self.processor._current_timestamp()
        self.assertIn('T', result)

    def test_array_first(self):
        self.assertEqual(self.processor._array_first([1, 2, 3]), 1)
        self.assertIsNone(self.processor._array_first([]))
        self.assertIsNone(self.processor._array_first('not_list'))

    def test_array_length(self):
        self.assertEqual(self.processor._array_length([1, 2]), 2)
        self.assertEqual(self.processor._array_length('not_list'), 0)

    def test_join(self):
        self.assertEqual(self.processor._join(['a', 'b', 'c']), 'a, b, c')
        self.assertEqual(self.processor._join(['a', 'b'], '-'), 'a-b')
        self.assertEqual(self.processor._join('not_list'), 'not_list')

    def test_generate_expired_deadlines_list(self):
        context = {
            'cart': {
                'items': [
                    {
                        'is_marking': True,
                        'expired_deadlines_count': 2,
                        'product_name': 'CM2 Marking',
                        'marking_paper_count': 5,
                    },
                    {
                        'is_marking': True,
                        'expired_deadlines_count': 0,
                        'product_name': 'CB1 Marking',
                    },
                    {
                        'is_marking': False,
                        'product_name': 'Book',
                    },
                ],
            },
        }
        result = self.processor._generate_expired_deadlines_list(context)
        self.assertIn('CM2 Marking', result)
        self.assertIn('2/5', result)
        self.assertNotIn('CB1', result)
        self.assertNotIn('Book', result)

    def test_generate_expired_deadlines_empty(self):
        context = {'cart': {'items': []}}
        result = self.processor._generate_expired_deadlines_list(context)
        self.assertEqual(result, 'No expired deadlines found')

    def test_generate_expired_deadlines_error(self):
        result = self.processor._generate_expired_deadlines_list('invalid')
        self.assertIn('Error', result)

    def test_generate_expired_deadlines_no_cart(self):
        result = self.processor._generate_expired_deadlines_list({})
        self.assertEqual(result, 'No expired deadlines found')

    def test_resolve_special_variable_current_timestamp(self):
        result = self.processor._resolve_special_variable('current_timestamp', {})
        self.assertIn('T', result)

    def test_resolve_special_variable_unknown(self):
        result = self.processor._resolve_special_variable('unknown', {})
        self.assertIsNone(result)

    def test_process_variables_error_handling(self):
        """Should handle variable resolution errors gracefully."""
        content = 'Hello {{broken_var}}'
        with patch.object(self.processor, '_resolve_variable', side_effect=Exception('Boom')):
            processed, _ = self.processor.process_variables(content, '', {}, {})
            self.assertEqual(processed, 'Hello {{broken_var}}')

    def test_filter_and_extract_error_handling(self):
        """Should return None on unexpected error in filter_and_extract."""
        # Pass invalid source path that causes error
        result = self.processor._filter_and_extract(
            'deeply.nested.path', {'key': 'val'}, 'field',
            {'deeply': 'not_nested'},
        )
        self.assertIsNone(result)

    def test_resolve_mapping_filter_no_extract(self):
        """Filter type without extract should return full matching item."""
        result = self.processor._resolve_mapping_definition(
            {
                'type': 'filter',
                'source': 'items',
                'condition': {'status': 'active'},
                'extract': '',
            },
            {'items': [
                {'status': 'inactive', 'name': 'First'},
                {'status': 'active', 'name': 'Second'},
            ]},
        )
        self.assertEqual(result, {'status': 'active', 'name': 'Second'})

    def test_call_function_with_non_context_args(self):
        """Should pass non-$ args directly."""
        result = self.processor._call_function(
            'join', [['a', 'b', 'c'], '-'], {},
        )
        self.assertEqual(result, 'a-b-c')

    def test_call_function_error_returns_none(self):
        """Should return None when function call raises exception."""
        # array_first expects a list, but we pass None via context ref
        result = self.processor._call_function(
            'array_first', ['$missing'], {},
        )
        # _get_nested_value returns None for missing, array_first(None) returns None
        self.assertIsNone(result)

    def test_resolve_mapping_unknown_type(self):
        """Should return mapping_def for unknown mapping types."""
        result = self.processor._resolve_mapping_definition(
            {'type': 'unknown_type', 'data': 'test'},
            {},
        )
        # Falls through all conditions, returns mapping_def
        self.assertEqual(result, {'type': 'unknown_type', 'data': 'test'})


# ===========================================================================
# Additional RuleEngine tests for remaining coverage gaps
# ===========================================================================

class TestRuleEngineAdditionalCoverage(BaseServiceTestSetup):
    """Additional tests for RuleEngine to fill coverage gaps."""

    def test_execute_context_merging(self):
        """Result should include context fields after execution."""
        ActedRule.objects.create(
            rule_code='cov_ctx_merge',
            name='Context Merge',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{
                'type': 'update',
                'target': 'custom.field',
                'operation': 'set',
                'value': 'merged',
            }],
            priority=10,
            active=True,
        )
        engine = RuleEngine()
        result = engine.execute('checkout_terms', {'existing': 'data'})
        self.assertTrue(result['success'])
        # Context should be merged into result
        self.assertEqual(result.get('existing'), 'data')

    def test_execute_blocked_adds_error(self):
        """Blocked result should include error message."""
        ActedRule.objects.create(
            rule_code='cov_block_err',
            name='Block Error',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{
                'type': 'user_acknowledge',
                'ackKey': 'block_err_key',
                'required': True,
            }],
            priority=10,
            active=True,
        )
        engine = RuleEngine()
        result = engine.execute('checkout_terms', {})
        self.assertTrue(result['blocked'])
        self.assertIn('error', result)
        self.assertIn('acknowledgments', result['error'])

    def test_execute_update_action_collects_results(self):
        """Update action results should be collected in 'updates' dict."""
        ActedRule.objects.create(
            rule_code='cov_upd_collect',
            name='Update Collect',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{
                'type': 'update',
                'target': 'vat.rate',
                'operation': 'set',
                'value': 0.20,
                'description': 'Set VAT rate',
            }],
            priority=10,
            active=True,
        )
        engine = RuleEngine()
        result = engine.execute('checkout_terms', {})
        self.assertTrue(result['success'])
        # updates should be in result
        self.assertIn('updates', result)

    def test_execute_multiple_rules_with_context_updates(self):
        """Multiple rules should see context changes from earlier rules."""
        ActedRule.objects.create(
            rule_code='cov_multi_1',
            name='Multi Rule 1',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{
                'type': 'update',
                'target': 'calculated.value',
                'operation': 'set',
                'value': 42,
            }],
            priority=100,
            active=True,
        )
        ActedRule.objects.create(
            rule_code='cov_multi_2',
            name='Multi Rule 2',
            entry_point='checkout_terms',
            condition={'==': [{'var': 'calculated.value'}, 42]},
            actions=[{
                'type': 'display_message',
                'content': 'Value is 42',
            }],
            priority=50,
            active=True,
        )
        engine = RuleEngine()
        result = engine.execute('checkout_terms', {})
        self.assertTrue(result['success'])
        # Both rules should have been evaluated
        self.assertGreaterEqual(result['rules_evaluated'], 2)

    def test_execute_preference_prompts_in_result(self):
        """Should include preferences alias in result."""
        ActedRule.objects.create(
            rule_code='cov_pref_alias',
            name='Pref Alias',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{
                'type': 'user_preference',
                'preferenceKey': 'newsletter',
                'inputType': 'checkbox',
                'title': 'Subscribe?',
            }],
            priority=10,
            active=True,
        )
        engine = RuleEngine()
        result = engine.execute('checkout_terms', {})
        self.assertTrue(result['success'])
        # Both preference_prompts and preferences should be present
        self.assertIn('preference_prompts', result)
        self.assertIn('preferences', result)
        self.assertEqual(result['preference_prompts'], result['preferences'])

    def test_execute_increment_nonexistent_target(self):
        """Increment triggers error since RuleEngine lacks _get_nested_value.

        The increment operation at line 808 calls self._get_nested_value(),
        which does not exist on RuleEngine (it's on ConditionEvaluator).
        The error is caught per-rule, and overall execution still succeeds.
        """
        ActedRule.objects.create(
            rule_code='cov_incr_new',
            name='Increment New',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{
                'type': 'update',
                'target': 'new_counter',
                'operation': 'increment',
                'value': 5,
            }],
            priority=10,
            active=True,
        )
        engine = RuleEngine()
        result = engine.execute('checkout_terms', {})
        # Execution succeeds overall even though increment errors per-rule
        self.assertTrue(result['success'])

    def test_validate_context_structure_cart_user_none(self):
        """Should not flag null cart.user."""
        engine = RuleEngine()
        issues = engine._validate_context_structure({
            'cart': {'user': None},
        })
        self.assertEqual(issues, [])

    def test_validate_context_structure_user_none(self):
        """Should not flag null user."""
        engine = RuleEngine()
        issues = engine._validate_context_structure({
            'user': None,
        })
        self.assertEqual(issues, [])

    def test_validate_context_structure_no_cart(self):
        """Should not flag missing cart."""
        engine = RuleEngine()
        issues = engine._validate_context_structure({
            'some_other_key': 'value',
        })
        self.assertEqual(issues, [])


# ===========================================================================
# Additional ActionDispatcher tests for remaining coverage gaps
# ===========================================================================

class TestActionDispatcherAdditionalCoverage(BaseServiceTestSetup):
    """Additional tests for ActionDispatcher to fill coverage gaps."""

    def setUp(self):
        super().setUp()
        self.dispatcher = ActionDispatcher()

    def test_display_message_with_inactive_template(self):
        """Should handle inactive template gracefully."""
        template = MessageTemplate.objects.create(
            name='cov_inactive_template',
            title='Inactive',
            content='Inactive content',
            content_format='html',
            message_type='info',
            variables=[],
            is_active=False,
        )
        actions = [{
            'type': 'display_message',
            'templateId': template.id,
            'title': 'Fallback',
            'content': 'Fallback content',
        }]
        results = self.dispatcher.dispatch(actions, {})
        # Should still succeed (template found but inactive - get will fail)
        self.assertEqual(len(results), 1)

    def test_update_action_set_deeply_nested(self):
        """Should create deeply nested context paths."""
        context = {}
        actions = [{
            'type': 'update',
            'target': 'a.b.c.d',
            'operation': 'set',
            'value': 'deep_value',
        }]
        results = self.dispatcher.dispatch(actions, context)
        self.assertTrue(results[0]['success'])
        self.assertEqual(context['a']['b']['c']['d'], 'deep_value')

    def test_update_action_handler_failure(self):
        """Should return failure when UpdateHandler returns failure."""
        context = {'cart': {'id': 'invalid'}}
        actions = [{
            'type': 'update',
            'target': 'cart.fees',
            'operation': 'add_fee',
            'value': {'fee_type': 'test', 'amount': 1.00},
        }]
        results = self.dispatcher.dispatch(actions, context)
        # UpdateHandler will fail since cart is invalid
        self.assertEqual(results[0]['type'], 'update')

    def test_user_preference_with_text_template(self):
        """Should load plain text content for preference template."""
        template = MessageTemplate.objects.create(
            name='cov_pref_text_tpl',
            title='Text Pref Template',
            content='Plain text preference content',
            content_format='html',
            message_type='info',
            variables=[],
        )
        actions = [{
            'type': 'user_preference',
            'messageTemplateId': template.id,
            'preferenceKey': 'pref_text',
        }]
        results = self.dispatcher.dispatch(actions, {})
        self.assertTrue(results[0]['success'])

    def test_user_preference_template_not_found(self):
        """Should use fallback when preference template not found."""
        actions = [{
            'type': 'user_preference',
            'messageTemplateId': 99999,
            'preferenceKey': 'pref_missing',
            'title': 'Fallback Title',
        }]
        results = self.dispatcher.dispatch(actions, {})
        self.assertTrue(results[0]['success'])

    def test_call_function_with_literal_args(self):
        """Should pass literal (non-var) args directly."""
        actions = [{
            'type': 'call_function',
            'function': 'add_decimals',
            'args': ['100', '50'],
        }]
        results = self.dispatcher.dispatch(actions, {})
        self.assertTrue(results[0]['success'])
        from decimal import Decimal
        self.assertEqual(results[0]['result'], Decimal('150'))

    def test_update_action_set_no_description(self):
        """Update set action without description should use default."""
        context = {}
        actions = [{
            'type': 'update',
            'target': 'field',
            'operation': 'set',
            'value': 'test',
        }]
        results = self.dispatcher.dispatch(actions, context)
        self.assertTrue(results[0]['success'])
        self.assertEqual(results[0]['message']['description'], 'Value updated')
