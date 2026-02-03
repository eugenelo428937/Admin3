"""
Tests for email_system content insertion service.
Covers: EmailContentInsertionService
"""
from unittest.mock import patch, MagicMock
from django.test import TestCase

from email_system.models import (
    EmailTemplate, EmailContentRule, EmailTemplateContentRule,
    EmailContentPlaceholder,
)
from email_system.services.content_insertion import EmailContentInsertionService


class EmailContentInsertionServiceTest(TestCase):
    """Tests for EmailContentInsertionService."""

    def setUp(self):
        self.service = EmailContentInsertionService()
        self.template = EmailTemplate.objects.create(
            name='order_confirmation',
            display_name='Order Confirmation',
            subject_template='Order Confirmation',
            content_template_name='order_confirmation_content',
            is_active=True,
        )
        self.placeholder = EmailContentPlaceholder.objects.create(
            name='TUTORIAL_CONTENT',
            display_name='Tutorial Content',
            default_content_template='<p>Tutorial: {{ tutorial_type }}</p>',
            content_variables={'tutorial_type': 'online'},
            insert_position='replace',
            is_required=False,
            allow_multiple_rules=False,
            content_separator='\n',
            is_active=True,
        )
        self.placeholder.templates.add(self.template)

        self.rule = EmailContentRule.objects.create(
            name='Tutorial Rule',
            rule_type='product_based',
            placeholder=self.placeholder,
            condition_field='items.product_type',
            condition_operator='equals',
            condition_value='tutorial',
            priority=10,
            is_exclusive=False,
            is_active=True,
        )
        self.tcr = EmailTemplateContentRule.objects.create(
            template=self.template,
            content_rule=self.rule,
            is_enabled=True,
        )

    def test_find_placeholders(self):
        content = 'Hello {{ TUTORIAL_CONTENT }} and {{ REGIONAL_CONTENT }}'
        result = self.service._find_placeholders(content)
        self.assertIn('TUTORIAL_CONTENT', result)
        self.assertIn('REGIONAL_CONTENT', result)

    def test_find_placeholders_no_matches(self):
        content = 'Hello World, no placeholders here'
        result = self.service._find_placeholders(content)
        self.assertEqual(result, [])

    def test_find_placeholders_duplicates(self):
        content = '{{ TUTORIAL_CONTENT }} and {{ TUTORIAL_CONTENT }}'
        result = self.service._find_placeholders(content)
        self.assertEqual(len(result), 1)

    def test_process_template_content_no_placeholders(self):
        content = '<p>Simple content with no placeholders</p>'
        result = self.service.process_template_content('order_confirmation', content, {})
        self.assertEqual(result, content)

    def test_process_template_content_with_matching_rule(self):
        content = '<div>{{TUTORIAL_CONTENT}}</div>'
        context = {
            'items': [
                {'product_type': 'tutorial'}
            ]
        }
        result = self.service.process_template_content('order_confirmation', content, context)
        self.assertIn('Tutorial:', result)

    def test_process_template_content_no_matching_rule(self):
        content = '<div>{{TUTORIAL_CONTENT}}</div>'
        context = {
            'items': [
                {'product_type': 'material'}
            ]
        }
        result = self.service.process_template_content('order_confirmation', content, context)
        # No rule matches, so placeholder should be replaced with empty string
        self.assertNotIn('TUTORIAL_CONTENT', result)

    def test_process_template_content_exception(self):
        """Test that process_template_content handles exceptions gracefully."""
        content = '{{TUTORIAL_CONTENT}}'
        with patch.object(self.service, '_find_placeholders', side_effect=Exception('Test error')):
            result = self.service.process_template_content('order_confirmation', content, {})
        self.assertEqual(result, content)

    def test_get_template_content_rules(self):
        rules = self.service._get_template_content_rules('order_confirmation')
        self.assertTrue(len(rules) > 0)

    def test_get_template_content_rules_no_template(self):
        rules = self.service._get_template_content_rules('nonexistent_template')
        self.assertEqual(len(list(rules)), 0)

    @patch('email_system.services.content_insertion.EmailTemplateContentRule.objects')
    def test_get_template_content_rules_exception(self, mock_objects):
        mock_objects.filter.side_effect = Exception('DB error')
        rules = self.service._get_template_content_rules('order_confirmation')
        self.assertEqual(rules, [])

    def test_generate_dynamic_content_no_placeholder(self):
        """Test when placeholder config doesn't exist."""
        result = self.service._generate_dynamic_content(
            'NONEXISTENT_PLACEHOLDER', [], {}
        )
        self.assertEqual(result, '')

    def test_generate_dynamic_content_exclusive_rule(self):
        """Test that exclusive rules stop processing."""
        self.rule.is_exclusive = True
        self.rule.save()

        # Create second rule
        rule2 = EmailContentRule.objects.create(
            name='Second Rule',
            rule_type='product_based',
            placeholder=self.placeholder,
            condition_field='items.product_type',
            condition_operator='equals',
            condition_value='tutorial',
            priority=5,
            is_exclusive=False,
            is_active=True,
        )
        EmailTemplateContentRule.objects.create(
            template=self.template,
            content_rule=rule2,
            is_enabled=True,
        )

        rules = list(self.service._get_template_content_rules('order_confirmation'))
        context = {'items': [{'product_type': 'tutorial'}]}
        result = self.service._generate_dynamic_content('TUTORIAL_CONTENT', rules, context)
        # Only first rule's content should be generated (exclusive)
        self.assertIn('Tutorial:', result)

    def test_generate_dynamic_content_multiple_rules_not_allowed(self):
        """Test that only first content is used when allow_multiple_rules is False."""
        self.placeholder.allow_multiple_rules = False
        self.placeholder.save()

        # Create second non-exclusive rule
        rule2 = EmailContentRule.objects.create(
            name='Second Rule',
            rule_type='product_based',
            placeholder=self.placeholder,
            condition_field='items.product_type',
            condition_operator='equals',
            condition_value='tutorial',
            priority=5,
            is_exclusive=False,
            is_active=True,
        )
        EmailTemplateContentRule.objects.create(
            template=self.template,
            content_rule=rule2,
            is_enabled=True,
        )

        rules = list(self.service._get_template_content_rules('order_confirmation'))
        context = {'items': [{'product_type': 'tutorial'}]}
        result = self.service._generate_dynamic_content('TUTORIAL_CONTENT', rules, context)
        self.assertIn('Tutorial:', result)

    def test_generate_dynamic_content_multiple_rules_allowed(self):
        """Test multiple content combined with separator when allowed."""
        self.placeholder.allow_multiple_rules = True
        self.placeholder.content_separator = '<hr>'
        self.placeholder.save()

        rule2 = EmailContentRule.objects.create(
            name='Second Rule',
            rule_type='product_based',
            placeholder=self.placeholder,
            condition_field='items.product_type',
            condition_operator='equals',
            condition_value='tutorial',
            priority=5,
            is_exclusive=False,
            is_active=True,
        )
        EmailTemplateContentRule.objects.create(
            template=self.template,
            content_rule=rule2,
            is_enabled=True,
        )

        rules = list(self.service._get_template_content_rules('order_confirmation'))
        context = {'items': [{'product_type': 'tutorial'}]}
        result = self.service._generate_dynamic_content('TUTORIAL_CONTENT', rules, context)
        # Both contents should be combined with separator
        self.assertIn('<hr>', result)

    @patch.object(EmailContentInsertionService, '_get_placeholder_config')
    def test_generate_dynamic_content_exception(self, mock_config):
        mock_config.side_effect = Exception('Test error')
        result = self.service._generate_dynamic_content('TUTORIAL_CONTENT', [], {})
        self.assertEqual(result, '')

    def test_get_placeholder_config_exists(self):
        config = self.service._get_placeholder_config('TUTORIAL_CONTENT')
        self.assertIsNotNone(config)
        self.assertEqual(config.name, 'TUTORIAL_CONTENT')

    def test_get_placeholder_config_not_exists(self):
        config = self.service._get_placeholder_config('NONEXISTENT')
        self.assertIsNone(config)

    def test_get_placeholder_config_inactive(self):
        self.placeholder.is_active = False
        self.placeholder.save()
        config = self.service._get_placeholder_config('TUTORIAL_CONTENT')
        self.assertIsNone(config)

    @patch('email_system.services.content_insertion.EmailContentPlaceholder.objects')
    def test_get_placeholder_config_exception(self, mock_objects):
        mock_objects.get.side_effect = Exception('DB error')
        config = self.service._get_placeholder_config('TUTORIAL_CONTENT')
        self.assertIsNone(config)

    def test_render_content_template(self):
        template_content = '<p>Hello {{ name }}, welcome to {{ site }}</p>'
        context = {'name': 'John'}
        variables = {'site': 'ActEd'}
        result = self.service._render_content_template(template_content, context, variables)
        self.assertIn('John', result)
        self.assertIn('ActEd', result)

    def test_render_content_template_exception(self):
        template_content = '{% invalid_tag %}'
        result = self.service._render_content_template(template_content, {}, {})
        self.assertIn('Error rendering content', result)

    def test_validate_template_placeholders_valid(self):
        content = '<div>{{TUTORIAL_CONTENT}}</div>'
        result = self.service.validate_template_placeholders('order_confirmation', content)
        self.assertTrue(result['valid'])
        self.assertIn('TUTORIAL_CONTENT', result['placeholders_found'])

    def test_validate_template_placeholders_no_config(self):
        content = '<div>{{UNKNOWN_PLACEHOLDER}}</div>'
        result = self.service.validate_template_placeholders('order_confirmation', content)
        self.assertFalse(result['valid'])
        self.assertTrue(len(result['issues']) > 0)

    def test_validate_template_placeholders_required_no_rules(self):
        self.placeholder.is_required = True
        self.placeholder.save()
        # Remove the content rule association
        EmailTemplateContentRule.objects.filter(
            template=self.template,
            content_rule=self.rule,
        ).delete()

        content = '<div>{{TUTORIAL_CONTENT}}</div>'
        result = self.service.validate_template_placeholders('order_confirmation', content)
        self.assertTrue(len(result['warnings']) > 0)

    def test_validate_template_placeholders_no_placeholders(self):
        content = '<div>No placeholders</div>'
        result = self.service.validate_template_placeholders('order_confirmation', content)
        self.assertTrue(result['valid'])
        self.assertEqual(result['placeholders_found'], [])

    @patch.object(EmailContentInsertionService, '_find_placeholders')
    def test_validate_template_placeholders_exception(self, mock_find):
        mock_find.side_effect = Exception('Test error')
        result = self.service.validate_template_placeholders('test', 'content')
        self.assertFalse(result['valid'])
        self.assertIn('Validation error', result['issues'][0])

    def test_has_content_rules_true(self):
        result = self.service._has_content_rules('order_confirmation', 'TUTORIAL_CONTENT')
        self.assertTrue(result)

    def test_has_content_rules_false(self):
        result = self.service._has_content_rules('nonexistent', 'TUTORIAL_CONTENT')
        self.assertFalse(result)

    @patch('email_system.services.content_insertion.EmailTemplateContentRule.objects')
    def test_has_content_rules_exception(self, mock_objects):
        mock_objects.filter.side_effect = Exception('DB error')
        result = self.service._has_content_rules('order_confirmation', 'TUTORIAL_CONTENT')
        self.assertFalse(result)

    def test_get_available_placeholders_all(self):
        result = self.service.get_available_placeholders()
        self.assertTrue(len(result) > 0)
        self.assertEqual(result[0]['name'], 'TUTORIAL_CONTENT')

    def test_get_available_placeholders_by_template(self):
        result = self.service.get_available_placeholders('order_confirmation')
        self.assertTrue(len(result) > 0)

    def test_get_available_placeholders_no_match(self):
        result = self.service.get_available_placeholders('nonexistent_template')
        self.assertEqual(len(result), 0)

    @patch('email_system.services.content_insertion.EmailContentPlaceholder.objects')
    def test_get_available_placeholders_exception(self, mock_objects):
        mock_objects.filter.side_effect = Exception('DB error')
        result = self.service.get_available_placeholders()
        self.assertEqual(result, [])

    def test_preview_dynamic_content(self):
        context = {'items': [{'product_type': 'tutorial'}]}
        result = self.service.preview_dynamic_content('order_confirmation', context)
        self.assertEqual(result['template_name'], 'order_confirmation')
        self.assertIn('placeholders', result)
        self.assertIn('context_summary', result)

    def test_preview_dynamic_content_no_match(self):
        context = {'items': [{'product_type': 'material'}]}
        result = self.service.preview_dynamic_content('order_confirmation', context)
        self.assertIn('placeholders', result)

    @patch.object(EmailContentInsertionService, '_get_template_content_rules')
    def test_preview_dynamic_content_exception(self, mock_rules):
        mock_rules.side_effect = Exception('Test error')
        result = self.service.preview_dynamic_content('order_confirmation', {})
        self.assertIn('error', result)

    def test_summarize_context_full(self):
        context = {
            'items': [
                {'product_id': 'P001', 'product_name': 'Study Text'},
            ],
            'user': {
                'country': 'UK',
                'user_type': 'student',
            },
            'order': {
                'total_amount': 99.99,
                'created_at': '2025-01-01',
            },
            'customer_name': 'John Doe',
            'student_number': '12345',
            'order_number': 'ORD-001',
            'total_amount': 99.99,
        }
        result = self.service._summarize_context(context)
        self.assertEqual(result['items_count'], 1)
        self.assertEqual(result['user_country'], 'UK')
        self.assertIn('customer_name', result)
        self.assertIn('student_number', result)
        self.assertIn('order_number', result)
        self.assertIn('total_amount', result)

    def test_summarize_context_empty(self):
        result = self.service._summarize_context({})
        self.assertEqual(result, {})

    def test_summarize_context_exception(self):
        # Pass something that will cause an error in the summarize
        with patch.dict('os.environ', {}, clear=False):
            result = self.service._summarize_context(None)
            self.assertIn('error', result)

    def test_global_instance_exists(self):
        from email_system.services.content_insertion import content_insertion_service
        self.assertIsNotNone(content_insertion_service)
        self.assertIsInstance(content_insertion_service, EmailContentInsertionService)
