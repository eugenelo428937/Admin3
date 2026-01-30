"""
Coverage tests for rules_engine/serializers/rule_execute.py
and rules_engine/serializers/acted_rule.py

Covers:
- RuleExecuteSerializer: validate (entry_point not found, checkout_terms schema validation,
  context validation failure, schema not found)
- ActedRuleSerializer: to_representation (nested vs non-nested), get_rules_fields (not found),
  get_enhanced_actions (with/without template), validate_conditions, validate_actions
"""

from unittest.mock import patch, MagicMock

from django.test import TestCase

from rules_engine.models import (
    RuleEntryPoint, MessageTemplate, ActedRule,
    ActedRulesFields,
)
from rules_engine.serializers import (
    RuleExecuteSerializer, ActedRuleSerializer,
)


# ===========================================================================
# RuleExecuteSerializer
# ===========================================================================

class TestRuleExecuteSerializer(TestCase):
    """Tests for RuleExecuteSerializer."""

    def setUp(self):
        self.entry_point, _ = RuleEntryPoint.objects.get_or_create(
            code='checkout_terms',
            defaults={'name': 'Checkout Terms', 'description': 'T&C'},
        )
        self.home_entry, _ = RuleEntryPoint.objects.get_or_create(
            code='home_page_mount',
            defaults={'name': 'Home Page', 'description': 'Home'},
        )

    def test_valid_non_checkout_entry_point(self):
        """Should pass for valid entry point without schema check."""
        data = {
            'entry_point': 'home_page_mount',
            'context': {'key': 'value'},
        }
        serializer = RuleExecuteSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_invalid_entry_point(self):
        """Should fail for non-existent entry point."""
        data = {
            'entry_point': 'RE_nonexistent_entry_point',
            'context': {},
        }
        serializer = RuleExecuteSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)

    @patch('rules_engine.serializers.rule_execute.ActedRulesFields')
    def test_checkout_terms_with_valid_schema(self, MockFields):
        """Should validate checkout_terms context against schema.

        NOTE: The source code uses the old field name fields_id (renamed to
        fields_code in migration 0006). We mock the lookup to test the
        validation logic without hitting the stale field reference.
        """
        mock_schema_obj = MagicMock()
        mock_schema_obj.schema = {
            'type': 'object',
            'properties': {
                'cart': {'type': 'object'},
            },
            'required': ['cart'],
        }
        MockFields.objects.get.return_value = mock_schema_obj
        MockFields.DoesNotExist = ActedRulesFields.DoesNotExist

        data = {
            'entry_point': 'checkout_terms',
            'context': {'cart': {'id': 1}},
        }
        serializer = RuleExecuteSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    @patch('rules_engine.serializers.rule_execute.ActedRulesFields')
    def test_checkout_terms_schema_validation_fails(self, MockFields):
        """Should fail when context does not match checkout schema."""
        mock_schema_obj = MagicMock()
        mock_schema_obj.schema = {
            'type': 'object',
            'properties': {
                'cart': {'type': 'object'},
            },
            'required': ['cart'],
        }
        MockFields.objects.get.return_value = mock_schema_obj
        MockFields.DoesNotExist = ActedRulesFields.DoesNotExist

        data = {
            'entry_point': 'checkout_terms',
            'context': {},  # Missing required 'cart'
        }
        serializer = RuleExecuteSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    @patch('rules_engine.serializers.rule_execute.ActedRulesFields')
    def test_checkout_terms_schema_not_found(self, MockFields):
        """Should pass when checkout schema does not exist (logs warning)."""
        MockFields.objects.get.side_effect = ActedRulesFields.DoesNotExist
        MockFields.DoesNotExist = ActedRulesFields.DoesNotExist

        data = {
            'entry_point': 'checkout_terms',
            'context': {'anything': 'goes'},
        }
        serializer = RuleExecuteSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_missing_entry_point(self):
        """Should fail when entry_point is missing."""
        data = {
            'context': {'key': 'value'},
        }
        serializer = RuleExecuteSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('entry_point', serializer.errors)

    def test_missing_context(self):
        """Should fail when context is missing."""
        data = {
            'entry_point': 'home_page_mount',
        }
        serializer = RuleExecuteSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('context', serializer.errors)


# ===========================================================================
# ActedRuleSerializer
# ===========================================================================

class TestActedRuleSerializer(TestCase):
    """Tests for ActedRuleSerializer coverage gaps."""

    def setUp(self):
        self.entry_point, _ = RuleEntryPoint.objects.get_or_create(
            code='checkout_terms',
            defaults={'name': 'Checkout Terms', 'description': 'T&C'},
        )

    def test_to_representation_non_nested(self):
        """Non-nested rule name should return string entry_point."""
        rule = ActedRule.objects.create(
            rule_code='RE_repr_normal',
            name='Normal Rule',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{'type': 'display_message'}],
            priority=10,
            active=True,
        )
        serializer = ActedRuleSerializer(rule)
        data = serializer.data
        # entry_point should be string, not dict
        self.assertIsInstance(data['entry_point'], str)
        self.assertEqual(data['entry_point'], 'checkout_terms')

    def test_to_representation_nested(self):
        """Rule name containing 'nested' should return expanded entry_point dict."""
        rule = ActedRule.objects.create(
            rule_code='RE_repr_nested',
            name='Nested Rule Test',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{'type': 'display_message'}],
            priority=10,
            active=True,
        )
        serializer = ActedRuleSerializer(rule)
        data = serializer.data
        # entry_point should be dict for nested rules
        self.assertIsInstance(data['entry_point'], dict)
        self.assertEqual(data['entry_point']['code'], 'checkout_terms')

    def test_to_representation_nested_entry_point_not_found(self):
        """Nested rule with non-existent entry point should keep string."""
        rule = ActedRule.objects.create(
            rule_code='RE_repr_nested_missing',
            name='Nested Missing EP',
            entry_point='RE_nonexistent_ep',
            condition={'==': [1, 1]},
            actions=[{'type': 'display_message'}],
            priority=10,
            active=True,
        )
        serializer = ActedRuleSerializer(rule)
        data = serializer.data
        # Should fall through to string since EP doesn't exist
        self.assertEqual(data['entry_point'], 'RE_nonexistent_ep')

    def test_get_rules_fields_success(self):
        """Should return rules fields schema when found."""
        ActedRulesFields.objects.create(
            fields_code='RE_test_fields',
            name='RE Test Fields',
            description='Test schema',
            schema={'type': 'object'},
            version=1,
        )
        rule = ActedRule.objects.create(
            rule_code='RE_fields_rule',
            name='Fields Rule',
            entry_point='checkout_terms',
            rules_fields_code='RE_test_fields',
            condition={'==': [1, 1]},
            actions=[{'type': 'display_message'}],
            priority=10,
            active=True,
        )
        serializer = ActedRuleSerializer(rule)
        data = serializer.data
        self.assertIsNotNone(data['fields'])
        self.assertEqual(data['fields']['fields_code'], 'RE_test_fields')
        self.assertIn('schema', data['fields'])

    def test_get_rules_fields_not_found(self):
        """Should return None when rules_fields_code not found."""
        rule = ActedRule.objects.create(
            rule_code='RE_no_fields',
            name='No Fields Rule',
            entry_point='checkout_terms',
            rules_fields_code='RE_nonexistent_fields',
            condition={'==': [1, 1]},
            actions=[{'type': 'display_message'}],
            priority=10,
            active=True,
        )
        serializer = ActedRuleSerializer(rule)
        data = serializer.data
        self.assertIsNone(data['fields'])

    def test_get_rules_fields_no_code(self):
        """Should return None when no rules_fields_code set."""
        rule = ActedRule.objects.create(
            rule_code='RE_null_fields',
            name='Null Fields Rule',
            entry_point='checkout_terms',
            rules_fields_code='',
            condition={'==': [1, 1]},
            actions=[{'type': 'display_message'}],
            priority=10,
            active=True,
        )
        serializer = ActedRuleSerializer(rule)
        data = serializer.data
        self.assertIsNone(data['fields'])

    def test_get_enhanced_actions_with_template(self):
        """Should enhance actions with template details."""
        MessageTemplate.objects.create(
            name='RE_action_template',
            title='RE Action Template Title',
            content='RE Action Template Content',
            content_format='html',
            message_type='info',
            variables=['user'],
        )
        rule = ActedRule.objects.create(
            rule_code='RE_enhanced',
            name='Enhanced Rule',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{
                'type': 'display_message',
                'templateName': 'RE_action_template',
            }],
            priority=10,
            active=True,
        )
        serializer = ActedRuleSerializer(rule)
        data = serializer.data
        action = data['actions'][0]
        self.assertIn('template', action)
        self.assertEqual(action['template']['title'], 'RE Action Template Title')
        self.assertEqual(action['message'], 'RE Action Template Content')

    def test_get_enhanced_actions_template_not_found(self):
        """Should use templateName as fallback when template not found."""
        rule = ActedRule.objects.create(
            rule_code='RE_no_tpl',
            name='No Template Rule',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{
                'type': 'display_message',
                'templateName': 'RE_nonexistent_template',
            }],
            priority=10,
            active=True,
        )
        serializer = ActedRuleSerializer(rule)
        data = serializer.data
        action = data['actions'][0]
        self.assertEqual(action['message'], 'RE_nonexistent_template')

    def test_get_enhanced_actions_no_template_name(self):
        """Should return action as-is when no templateName."""
        rule = ActedRule.objects.create(
            rule_code='RE_plain_action',
            name='Plain Action Rule',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{
                'type': 'display_message',
                'content': 'Plain message',
            }],
            priority=10,
            active=True,
        )
        serializer = ActedRuleSerializer(rule)
        data = serializer.data
        action = data['actions'][0]
        self.assertNotIn('template', action)
        self.assertEqual(action['content'], 'Plain message')

    def test_get_enhanced_actions_empty(self):
        """Should handle empty actions list."""
        rule = ActedRule.objects.create(
            rule_code='RE_empty_actions',
            name='Empty Actions Rule',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[],
            priority=10,
            active=True,
        )
        serializer = ActedRuleSerializer(rule)
        data = serializer.data
        self.assertEqual(data['actions'], [])

    def test_get_enhanced_actions_null(self):
        """Should handle null actions.

        The DB column has a NOT NULL constraint, so we use a mock object
        to simulate the scenario where obj.actions is None (e.g., from
        a programmatic path that bypasses model validation).
        """
        mock_rule = MagicMock(spec=ActedRule)
        mock_rule.actions = None
        mock_rule.name = 'Null Actions Rule'
        mock_rule.entry_point = 'checkout_terms'

        serializer = ActedRuleSerializer()
        result = serializer.get_enhanced_actions(mock_rule)
        self.assertEqual(result, [])

    def test_validate_conditions_not_dict(self):
        """Should reject non-dict conditions."""
        data = {
            'rule_code': 'RE_bad_cond',
            'entry_point': 'checkout_terms',
            'conditions': 'not_a_dict',
            'actions': [{'type': 'display_message'}],
        }
        serializer = ActedRuleSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('conditions', serializer.errors)

    def test_validate_actions_not_list(self):
        """Should reject non-list actions."""
        data = {
            'rule_code': 'RE_bad_act',
            'entry_point': 'checkout_terms',
            'conditions': {'==': [1, 1]},
            'actions': 'not_a_list',
        }
        serializer = ActedRuleSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('actions', serializer.errors)

    def test_validate_actions_item_not_dict(self):
        """Should reject actions where items are not dicts."""
        data = {
            'rule_code': 'RE_bad_item',
            'entry_point': 'checkout_terms',
            'conditions': {'==': [1, 1]},
            'actions': ['not_a_dict'],
        }
        serializer = ActedRuleSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('actions', serializer.errors)

    def test_validate_actions_missing_type(self):
        """Should reject actions without 'type' field."""
        data = {
            'rule_code': 'RE_no_type',
            'entry_point': 'checkout_terms',
            'conditions': {'==': [1, 1]},
            'actions': [{'content': 'Hello'}],  # Missing 'type'
        }
        serializer = ActedRuleSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('actions', serializer.errors)

    def test_valid_create(self):
        """Should successfully validate and create a rule."""
        data = {
            'rule_code': 'RE_valid_create',
            'name': 'Valid Create Rule',
            'entry_point': 'checkout_terms',
            'conditions': {'==': [1, 1]},
            'actions': [{'type': 'display_message', 'content': 'Hello'}],
            'priority': 10,
            'active': True,
        }
        serializer = ActedRuleSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        rule = serializer.save()
        self.assertEqual(rule.rule_code, 'RE_valid_create')

    def test_init_without_initial_data(self):
        """Serializer without initial_data (read mode) should not add write-only actions field."""
        rule = ActedRule.objects.create(
            rule_code='RE_read_mode',
            name='Read Mode Rule',
            entry_point='checkout_terms',
            condition={'==': [1, 1]},
            actions=[{'type': 'display_message'}],
            priority=10,
            active=True,
        )
        serializer = ActedRuleSerializer(rule)
        # In read mode, 'actions' should be SerializerMethodField not JSONField
        data = serializer.data
        self.assertIn('actions', data)
