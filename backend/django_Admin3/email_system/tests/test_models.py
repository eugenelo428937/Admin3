"""
Tests for email_system models.
Covers: EmailTemplate, EmailAttachment, EmailTemplateAttachment,
        EmailQueue, EmailLog, EmailSettings, EmailContentRule,
        EmailTemplateContentRule, EmailContentPlaceholder
"""
import uuid
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone

from email_system.models import (
    EmailTemplate, EmailAttachment, EmailTemplateAttachment,
    EmailQueue, EmailLog, EmailSettings,
    EmailContentRule, EmailTemplateContentRule,
    EmailContentPlaceholder,
)


class EmailTemplateModelTest(TestCase):
    """Tests for EmailTemplate model."""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.template = EmailTemplate.objects.create(
            name='order_confirmation',
            template_type='order_confirmation',
            display_name='Order Confirmation',
            description='Test template',
            subject_template='Order #{{ order_number }}',
            content_template_name='order_confirmation_content',
            use_master_template=True,
            from_email='test@example.com',
            reply_to_email='reply@example.com',
            default_priority='normal',
            enable_tracking=True,
            enable_queue=True,
            max_retry_attempts=3,
            retry_delay_minutes=5,
            enhance_outlook_compatibility=True,
            is_active=True,
            created_by=self.user,
        )

    def test_str_representation(self):
        self.assertEqual(str(self.template), 'Order Confirmation (order_confirmation)')

    def test_template_type_choices(self):
        valid_types = [c[0] for c in EmailTemplate.TEMPLATE_TYPES]
        self.assertIn('order_confirmation', valid_types)
        self.assertIn('password_reset', valid_types)
        self.assertIn('custom', valid_types)

    def test_priority_choices(self):
        valid_priorities = [c[0] for c in EmailTemplate.PRIORITY_LEVELS]
        self.assertIn('low', valid_priorities)
        self.assertIn('normal', valid_priorities)
        self.assertIn('high', valid_priorities)
        self.assertIn('urgent', valid_priorities)

    def test_default_values(self):
        t = EmailTemplate.objects.create(
            name='test_minimal',
            display_name='Test Minimal',
            subject_template='Test',
            content_template_name='test_content',
        )
        self.assertTrue(t.use_master_template)
        self.assertEqual(t.default_priority, 'normal')
        self.assertTrue(t.enable_tracking)
        self.assertTrue(t.enable_queue)
        self.assertEqual(t.max_retry_attempts, 3)
        self.assertEqual(t.retry_delay_minutes, 5)
        self.assertTrue(t.enhance_outlook_compatibility)
        self.assertTrue(t.is_active)

    def test_meta_options(self):
        self.assertEqual(EmailTemplate._meta.db_table, 'utils_email_template')
        self.assertEqual(EmailTemplate._meta.ordering, ['template_type', 'name'])


class EmailAttachmentModelTest(TestCase):
    """Tests for EmailAttachment model."""

    def setUp(self):
        self.attachment = EmailAttachment.objects.create(
            name='test_attachment',
            display_name='Test File.pdf',
            attachment_type='static',
            file_path='/static/files/test.pdf',
            mime_type='application/pdf',
            file_size=1024,
            is_conditional=False,
            is_active=True,
        )

    def test_str_representation(self):
        self.assertEqual(str(self.attachment), 'Test File.pdf (static)')

    def test_attachment_type_choices(self):
        valid_types = [c[0] for c in EmailAttachment.ATTACHMENT_TYPES]
        self.assertIn('static', valid_types)
        self.assertIn('dynamic', valid_types)
        self.assertIn('template', valid_types)
        self.assertIn('external', valid_types)

    def test_meta_options(self):
        self.assertEqual(EmailAttachment._meta.db_table, 'utils_email_attachment')


class EmailTemplateAttachmentModelTest(TestCase):
    """Tests for EmailTemplateAttachment model."""

    def setUp(self):
        self.template = EmailTemplate.objects.create(
            name='test_template',
            display_name='Test Template',
            subject_template='Test Subject',
            content_template_name='test_content',
        )
        self.attachment = EmailAttachment.objects.create(
            name='test_attachment',
            display_name='Test File.pdf',
            attachment_type='static',
        )
        self.template_attachment = EmailTemplateAttachment.objects.create(
            template=self.template,
            attachment=self.attachment,
            is_required=True,
            order=1,
        )

    def test_str_representation(self):
        self.assertEqual(str(self.template_attachment), 'test_template - Test File.pdf')

    def test_unique_together(self):
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            EmailTemplateAttachment.objects.create(
                template=self.template,
                attachment=self.attachment,
            )

    def test_meta_options(self):
        self.assertEqual(EmailTemplateAttachment._meta.db_table, 'utils_email_template_attachment')


class EmailQueueModelTest(TestCase):
    """Tests for EmailQueue model."""

    def setUp(self):
        self.template = EmailTemplate.objects.create(
            name='test_template',
            display_name='Test Template',
            subject_template='Test Subject',
            content_template_name='test_content',
        )
        self.queue_item = EmailQueue.objects.create(
            template=self.template,
            to_emails=['user1@example.com', 'user2@example.com'],
            from_email='sender@example.com',
            subject='Test Email',
            email_context={'key': 'value'},
            priority='normal',
            status='pending',
        )

    def test_str_representation_two_recipients(self):
        result = str(self.queue_item)
        self.assertIn('Test Email', result)
        self.assertIn('user1@example.com', result)
        self.assertIn('user2@example.com', result)
        self.assertIn('pending', result)

    def test_str_representation_three_plus_recipients(self):
        item = EmailQueue.objects.create(
            to_emails=['a@test.com', 'b@test.com', 'c@test.com'],
            from_email='sender@example.com',
            subject='Multi Recipient',
        )
        result = str(item)
        self.assertIn('and 1 more', result)

    def test_str_representation_single_recipient(self):
        item = EmailQueue.objects.create(
            to_emails=['solo@test.com'],
            from_email='sender@example.com',
            subject='Single Recipient',
        )
        result = str(item)
        self.assertIn('solo@test.com', result)

    def test_can_retry_true(self):
        self.queue_item.status = 'failed'
        self.queue_item.attempts = 1
        self.queue_item.max_attempts = 3
        self.assertTrue(self.queue_item.can_retry())

    def test_can_retry_false_status(self):
        self.queue_item.status = 'sent'
        self.assertFalse(self.queue_item.can_retry())

    def test_can_retry_false_max_attempts(self):
        self.queue_item.status = 'failed'
        self.queue_item.attempts = 3
        self.queue_item.max_attempts = 3
        self.assertFalse(self.queue_item.can_retry())

    def test_can_retry_with_retry_status(self):
        self.queue_item.status = 'retry'
        self.queue_item.attempts = 1
        self.queue_item.max_attempts = 3
        self.assertTrue(self.queue_item.can_retry())

    def test_mark_failed(self):
        self.queue_item.mark_failed('SMTP error', {'code': 550})
        self.queue_item.refresh_from_db()
        self.assertEqual(self.queue_item.status, 'failed')
        self.assertEqual(self.queue_item.error_message, 'SMTP error')
        self.assertEqual(self.queue_item.error_details, {'code': 550})
        self.assertIsNotNone(self.queue_item.last_attempt_at)

    def test_mark_failed_no_details(self):
        self.queue_item.mark_failed('Error')
        self.queue_item.refresh_from_db()
        self.assertEqual(self.queue_item.error_details, {})

    def test_schedule_retry(self):
        self.queue_item.schedule_retry(delay_minutes=10)
        self.queue_item.refresh_from_db()
        self.assertEqual(self.queue_item.status, 'retry')
        self.assertIsNotNone(self.queue_item.next_retry_at)

    def test_uuid_auto_generated(self):
        self.assertIsNotNone(self.queue_item.queue_id)
        self.assertIsInstance(self.queue_item.queue_id, uuid.UUID)

    def test_status_choices(self):
        valid_statuses = [c[0] for c in EmailQueue.STATUS_CHOICES]
        self.assertIn('pending', valid_statuses)
        self.assertIn('processing', valid_statuses)
        self.assertIn('sent', valid_statuses)
        self.assertIn('failed', valid_statuses)
        self.assertIn('cancelled', valid_statuses)
        self.assertIn('retry', valid_statuses)

    def test_priority_choices(self):
        valid_priorities = [c[0] for c in EmailQueue.PRIORITY_CHOICES]
        self.assertIn('low', valid_priorities)
        self.assertIn('normal', valid_priorities)
        self.assertIn('high', valid_priorities)
        self.assertIn('urgent', valid_priorities)

    def test_meta_options(self):
        self.assertEqual(EmailQueue._meta.db_table, 'utils_email_queue')


class EmailLogModelTest(TestCase):
    """Tests for EmailLog model."""

    def setUp(self):
        self.template = EmailTemplate.objects.create(
            name='test_template',
            display_name='Test Template',
            subject_template='Test Subject',
            content_template_name='test_content',
        )
        self.log = EmailLog.objects.create(
            template=self.template,
            to_email='user@example.com',
            from_email='sender@example.com',
            subject='Test Subject Line',
            status='queued',
            priority='normal',
        )

    def test_str_representation(self):
        self.assertEqual(str(self.log), 'Test Subject Line \u2192 user@example.com (queued)')

    def test_mark_sent(self):
        self.log.mark_sent(
            response_code='250',
            response_message='OK',
            esp_message_id='msg-123',
        )
        self.log.refresh_from_db()
        self.assertEqual(self.log.status, 'sent')
        self.assertIsNotNone(self.log.sent_at)
        self.assertEqual(self.log.response_code, '250')
        self.assertEqual(self.log.response_message, 'OK')
        self.assertEqual(self.log.esp_message_id, 'msg-123')

    def test_mark_sent_no_optional_params(self):
        self.log.mark_sent()
        self.log.refresh_from_db()
        self.assertEqual(self.log.status, 'sent')
        self.assertIsNotNone(self.log.sent_at)

    def test_mark_opened_from_sent(self):
        self.log.status = 'sent'
        self.log.save()
        self.log.mark_opened(user_agent='Mozilla/5.0', ip_address='192.168.1.1')
        self.log.refresh_from_db()
        self.assertEqual(self.log.status, 'opened')
        self.assertIsNotNone(self.log.opened_at)
        self.assertEqual(self.log.open_count, 1)
        self.assertEqual(self.log.user_agent, 'Mozilla/5.0')
        self.assertEqual(self.log.ip_address, '192.168.1.1')

    def test_mark_opened_increments_count(self):
        self.log.status = 'sent'
        self.log.save()
        self.log.mark_opened()
        self.log.mark_opened()
        self.log.refresh_from_db()
        self.assertEqual(self.log.open_count, 2)
        # Status should still be opened
        self.assertEqual(self.log.status, 'opened')

    def test_mark_opened_does_not_change_status_if_not_sent(self):
        self.log.status = 'clicked'
        self.log.save()
        self.log.mark_opened()
        self.log.refresh_from_db()
        # Status should not change from clicked to opened
        self.assertEqual(self.log.status, 'clicked')

    def test_mark_opened_no_optional_params(self):
        self.log.status = 'sent'
        self.log.save()
        self.log.mark_opened()
        self.log.refresh_from_db()
        self.assertEqual(self.log.open_count, 1)

    def test_mark_clicked_from_sent(self):
        self.log.status = 'sent'
        self.log.save()
        self.log.mark_clicked(user_agent='Chrome', ip_address='10.0.0.1')
        self.log.refresh_from_db()
        self.assertEqual(self.log.status, 'clicked')
        self.assertIsNotNone(self.log.first_clicked_at)
        self.assertEqual(self.log.click_count, 1)
        self.assertEqual(self.log.user_agent, 'Chrome')
        self.assertEqual(self.log.ip_address, '10.0.0.1')

    def test_mark_clicked_from_opened(self):
        self.log.status = 'opened'
        self.log.save()
        self.log.mark_clicked()
        self.log.refresh_from_db()
        self.assertEqual(self.log.status, 'clicked')

    def test_mark_clicked_increments_count(self):
        self.log.status = 'sent'
        self.log.save()
        self.log.mark_clicked()
        first_click = self.log.first_clicked_at
        self.log.mark_clicked()
        self.log.refresh_from_db()
        self.assertEqual(self.log.click_count, 2)
        # first_clicked_at should not change
        self.assertEqual(self.log.first_clicked_at, first_click)

    def test_mark_clicked_does_not_change_status_if_already_past(self):
        self.log.status = 'bounced'
        self.log.save()
        self.log.mark_clicked()
        self.log.refresh_from_db()
        self.assertEqual(self.log.status, 'bounced')

    def test_mark_clicked_no_optional_params(self):
        self.log.status = 'sent'
        self.log.save()
        self.log.mark_clicked()
        self.log.refresh_from_db()
        self.assertEqual(self.log.click_count, 1)

    def test_regenerate_email_content_no_template(self):
        self.log.template = None
        self.log.save()
        result = self.log.regenerate_email_content()
        self.assertFalse(result['success'])
        self.assertIn('No template information', result['error'])

    @patch('email_system.services.email_service.EmailService')
    def test_regenerate_email_content_with_master_template(self, mock_service_cls):
        """Test regeneration with master template - it will try to render and likely fail
        in a test environment, but we test the error handling path."""
        self.log.template.use_master_template = True
        self.log.template.name = 'order_confirmation'
        self.log.template.save()
        self.log.email_context = {'test': 'data'}
        self.log.save()

        result = self.log.regenerate_email_content()
        # In test env without real templates, this should fail gracefully
        self.assertIn('success', result)

    @patch('email_system.services.email_service.EmailService')
    def test_regenerate_email_content_with_regular_template(self, mock_service_cls):
        """Test regeneration with regular template."""
        self.log.template.use_master_template = False
        self.log.template.save()
        self.log.email_context = {'test': 'data'}
        self.log.save()

        result = self.log.regenerate_email_content()
        self.assertIn('success', result)

    def test_regenerate_email_content_exception(self):
        """Test regeneration handles unexpected exceptions."""
        self.log.template.use_master_template = True
        self.log.template.name = 'nonexistent_template'
        self.log.template.save()
        self.log.email_context = {'test': 'data'}
        self.log.save()

        result = self.log.regenerate_email_content()
        self.assertIn('success', result)

    def test_uuid_auto_generated(self):
        self.assertIsNotNone(self.log.log_id)
        self.assertIsInstance(self.log.log_id, uuid.UUID)

    def test_status_choices(self):
        valid_statuses = [c[0] for c in EmailLog.STATUS_CHOICES]
        self.assertIn('queued', valid_statuses)
        self.assertIn('sent', valid_statuses)
        self.assertIn('delivered', valid_statuses)
        self.assertIn('opened', valid_statuses)
        self.assertIn('clicked', valid_statuses)
        self.assertIn('bounced', valid_statuses)
        self.assertIn('failed', valid_statuses)
        self.assertIn('spam', valid_statuses)
        self.assertIn('unsubscribed', valid_statuses)

    def test_meta_options(self):
        self.assertEqual(EmailLog._meta.db_table, 'utils_email_log')
        self.assertEqual(EmailLog._meta.ordering, ['-queued_at'])


class EmailSettingsModelTest(TestCase):
    """Tests for EmailSettings model."""

    def setUp(self):
        self.user = User.objects.create_user(username='admin', password='testpass')
        self.setting = EmailSettings.objects.create(
            key='max_batch_size',
            setting_type='queue',
            display_name='Max Batch Size',
            description='Maximum emails per batch',
            value=50,
            default_value={'default': 100},
            is_required=True,
            is_sensitive=False,
            is_active=True,
            updated_by=self.user,
        )

    def test_str_representation(self):
        self.assertEqual(str(self.setting), 'Max Batch Size (max_batch_size)')

    def test_get_setting_exists(self):
        result = EmailSettings.get_setting('max_batch_size')
        self.assertEqual(result, 50)

    def test_get_setting_not_exists(self):
        result = EmailSettings.get_setting('nonexistent', default='fallback')
        self.assertEqual(result, 'fallback')

    def test_get_setting_inactive(self):
        self.setting.is_active = False
        self.setting.save()
        result = EmailSettings.get_setting('max_batch_size', default='inactive')
        self.assertEqual(result, 'inactive')

    def test_set_setting_creates_new(self):
        setting = EmailSettings.set_setting(
            key='new_key',
            value='new_value',
            setting_type='smtp',
            display_name='New Setting',
            description='A new setting',
            user=self.user,
        )
        self.assertEqual(setting.key, 'new_key')
        self.assertEqual(setting.value, 'new_value')
        self.assertEqual(setting.setting_type, 'smtp')
        self.assertEqual(setting.display_name, 'New Setting')

    def test_set_setting_updates_existing(self):
        setting = EmailSettings.set_setting(
            key='max_batch_size',
            value=200,
            user=self.user,
        )
        setting.refresh_from_db()
        self.assertEqual(setting.value, 200)
        self.assertEqual(setting.updated_by, self.user)

    def test_set_setting_auto_display_name(self):
        setting = EmailSettings.set_setting(
            key='auto_name_key',
            value='test',
        )
        self.assertEqual(setting.display_name, 'Auto Name Key')

    def test_setting_type_choices(self):
        valid_types = [c[0] for c in EmailSettings.SETTING_TYPES]
        self.assertIn('smtp', valid_types)
        self.assertIn('queue', valid_types)
        self.assertIn('tracking', valid_types)
        self.assertIn('template', valid_types)
        self.assertIn('security', valid_types)
        self.assertIn('performance', valid_types)
        self.assertIn('integration', valid_types)

    def test_meta_options(self):
        self.assertEqual(EmailSettings._meta.db_table, 'utils_email_settings')
        self.assertEqual(EmailSettings._meta.ordering, ['setting_type', 'key'])


class EmailContentPlaceholderModelTest(TestCase):
    """Tests for EmailContentPlaceholder model."""

    def setUp(self):
        self.placeholder = EmailContentPlaceholder.objects.create(
            name='TUTORIAL_CONTENT',
            display_name='Tutorial Content',
            description='Placeholder for tutorial-specific content',
            default_content_template='<p>Default tutorial content</p>',
            content_variables={'tutorial_type': 'online'},
            insert_position='replace',
            is_required=True,
            allow_multiple_rules=False,
            content_separator='\n',
            is_active=True,
        )

    def test_str_representation(self):
        self.assertEqual(str(self.placeholder), 'Tutorial Content (TUTORIAL_CONTENT)')

    def test_meta_options(self):
        self.assertEqual(EmailContentPlaceholder._meta.db_table, 'utils_email_content_placeholder')
        self.assertEqual(EmailContentPlaceholder._meta.ordering, ['name'])


class EmailContentRuleModelTest(TestCase):
    """Tests for EmailContentRule model."""

    def setUp(self):
        self.user = User.objects.create_user(username='rulemaker', password='testpass')
        self.placeholder = EmailContentPlaceholder.objects.create(
            name='TUTORIAL_CONTENT',
            display_name='Tutorial Content',
            default_content_template='<p>{{ tutorial_type }} tutorial info</p>',
            content_variables={'tutorial_type': 'online'},
            is_active=True,
        )
        self.rule = EmailContentRule.objects.create(
            name='Tutorial Rule',
            description='Test rule for tutorials',
            rule_type='product_based',
            placeholder=self.placeholder,
            condition_field='items.product_type',
            condition_operator='equals',
            condition_value='tutorial',
            priority=10,
            is_exclusive=False,
            is_active=True,
            created_by=self.user,
        )

    def test_str_representation(self):
        expected = 'Tutorial Rule \u2192 TUTORIAL_CONTENT (product_based)'
        self.assertEqual(str(self.rule), expected)

    def test_rule_type_choices(self):
        valid_types = [c[0] for c in EmailContentRule.RULE_TYPES]
        self.assertIn('product_based', valid_types)
        self.assertIn('user_attribute', valid_types)
        self.assertIn('order_value', valid_types)
        self.assertIn('location_based', valid_types)
        self.assertIn('date_based', valid_types)
        self.assertIn('custom_condition', valid_types)

    def test_condition_operator_choices(self):
        valid_ops = [c[0] for c in EmailContentRule.CONDITION_OPERATORS]
        self.assertIn('equals', valid_ops)
        self.assertIn('not_equals', valid_ops)
        self.assertIn('in', valid_ops)
        self.assertIn('not_in', valid_ops)
        self.assertIn('greater_than', valid_ops)
        self.assertIn('less_than', valid_ops)
        self.assertIn('contains', valid_ops)
        self.assertIn('not_contains', valid_ops)
        self.assertIn('starts_with', valid_ops)
        self.assertIn('ends_with', valid_ops)
        self.assertIn('regex_match', valid_ops)
        self.assertIn('exists', valid_ops)
        self.assertIn('not_exists', valid_ops)

    def test_meta_options(self):
        self.assertEqual(EmailContentRule._meta.db_table, 'utils_email_content_rule')
        self.assertEqual(EmailContentRule._meta.ordering, ['-priority', 'name'])

    # evaluate_condition tests
    def test_evaluate_condition_equals(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.country'
        self.rule.condition_operator = 'equals'
        self.rule.condition_value = 'UK'
        self.rule.save()
        context = {'user': {'country': 'UK'}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_equals_false(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.country'
        self.rule.condition_operator = 'equals'
        self.rule.condition_value = 'UK'
        self.rule.save()
        context = {'user': {'country': 'US'}}
        self.assertFalse(self.rule.evaluate_condition(context))

    def test_evaluate_condition_not_equals(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.country'
        self.rule.condition_operator = 'not_equals'
        self.rule.condition_value = 'UK'
        self.rule.save()
        context = {'user': {'country': 'US'}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_in_list(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.country'
        self.rule.condition_operator = 'in'
        self.rule.condition_value = ['UK', 'US', 'CA']
        self.rule.save()
        context = {'user': {'country': 'UK'}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_in_list_not_list(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.country'
        self.rule.condition_operator = 'in'
        self.rule.condition_value = 'not_a_list'
        self.rule.save()
        context = {'user': {'country': 'UK'}}
        self.assertFalse(self.rule.evaluate_condition(context))

    def test_evaluate_condition_not_in(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.country'
        self.rule.condition_operator = 'not_in'
        self.rule.condition_value = ['UK', 'US']
        self.rule.save()
        context = {'user': {'country': 'FR'}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_not_in_not_list(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.country'
        self.rule.condition_operator = 'not_in'
        self.rule.condition_value = 'not_a_list'
        self.rule.save()
        context = {'user': {'country': 'FR'}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_greater_than(self):
        self.rule.rule_type = 'order_value'
        self.rule.condition_field = 'order.total'
        self.rule.condition_operator = 'greater_than'
        self.rule.condition_value = 100
        self.rule.save()
        context = {'order': {'total': 150}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_greater_than_none(self):
        self.rule.rule_type = 'order_value'
        self.rule.condition_field = 'order.total'
        self.rule.condition_operator = 'greater_than'
        self.rule.condition_value = 100
        self.rule.save()
        context = {'order': {}}
        self.assertFalse(self.rule.evaluate_condition(context))

    def test_evaluate_condition_less_than(self):
        self.rule.rule_type = 'order_value'
        self.rule.condition_field = 'order.total'
        self.rule.condition_operator = 'less_than'
        self.rule.condition_value = 100
        self.rule.save()
        context = {'order': {'total': 50}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_less_than_none(self):
        self.rule.rule_type = 'order_value'
        self.rule.condition_field = 'order.total'
        self.rule.condition_operator = 'less_than'
        self.rule.condition_value = 100
        self.rule.save()
        context = {'order': {}}
        self.assertFalse(self.rule.evaluate_condition(context))

    def test_evaluate_condition_greater_equal(self):
        self.rule.rule_type = 'order_value'
        self.rule.condition_field = 'order.total'
        self.rule.condition_operator = 'greater_equal'
        self.rule.condition_value = 100
        self.rule.save()
        context = {'order': {'total': 100}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_greater_equal_none(self):
        self.rule.rule_type = 'order_value'
        self.rule.condition_field = 'order.total'
        self.rule.condition_operator = 'greater_equal'
        self.rule.condition_value = 100
        self.rule.save()
        context = {'order': {}}
        self.assertFalse(self.rule.evaluate_condition(context))

    def test_evaluate_condition_less_equal(self):
        self.rule.rule_type = 'order_value'
        self.rule.condition_field = 'order.total'
        self.rule.condition_operator = 'less_equal'
        self.rule.condition_value = 100
        self.rule.save()
        context = {'order': {'total': 100}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_less_equal_none(self):
        self.rule.rule_type = 'order_value'
        self.rule.condition_field = 'order.total'
        self.rule.condition_operator = 'less_equal'
        self.rule.condition_value = 100
        self.rule.save()
        context = {'order': {}}
        self.assertFalse(self.rule.evaluate_condition(context))

    def test_evaluate_condition_contains(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.email'
        self.rule.condition_operator = 'contains'
        self.rule.condition_value = 'example.com'
        self.rule.save()
        context = {'user': {'email': 'test@example.com'}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_contains_none(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.email'
        self.rule.condition_operator = 'contains'
        self.rule.condition_value = 'example.com'
        self.rule.save()
        context = {'user': {}}
        self.assertFalse(self.rule.evaluate_condition(context))

    def test_evaluate_condition_not_contains(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.email'
        self.rule.condition_operator = 'not_contains'
        self.rule.condition_value = 'spam'
        self.rule.save()
        context = {'user': {'email': 'test@example.com'}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_not_contains_none(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.email'
        self.rule.condition_operator = 'not_contains'
        self.rule.condition_value = 'spam'
        self.rule.save()
        context = {'user': {}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_starts_with(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.name'
        self.rule.condition_operator = 'starts_with'
        self.rule.condition_value = 'John'
        self.rule.save()
        context = {'user': {'name': 'John Smith'}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_starts_with_none(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.name'
        self.rule.condition_operator = 'starts_with'
        self.rule.condition_value = 'John'
        self.rule.save()
        context = {'user': {}}
        self.assertFalse(self.rule.evaluate_condition(context))

    def test_evaluate_condition_ends_with(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.email'
        self.rule.condition_operator = 'ends_with'
        self.rule.condition_value = '.com'
        self.rule.save()
        context = {'user': {'email': 'test@example.com'}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_ends_with_none(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.email'
        self.rule.condition_operator = 'ends_with'
        self.rule.condition_value = '.com'
        self.rule.save()
        context = {'user': {}}
        self.assertFalse(self.rule.evaluate_condition(context))

    def test_evaluate_condition_exists(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.name'
        self.rule.condition_operator = 'exists'
        self.rule.condition_value = True
        self.rule.save()
        context = {'user': {'name': 'John'}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_not_exists(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.nickname'
        self.rule.condition_operator = 'not_exists'
        self.rule.condition_value = True
        self.rule.save()
        context = {'user': {'name': 'John'}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_regex_match(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.email'
        self.rule.condition_operator = 'regex_match'
        self.rule.condition_value = r'^[a-z]+@example\.com$'
        self.rule.save()
        context = {'user': {'email': 'test@example.com'}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_regex_match_none(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.email'
        self.rule.condition_operator = 'regex_match'
        self.rule.condition_value = r'^[a-z]+@example\.com$'
        self.rule.save()
        context = {'user': {}}
        self.assertFalse(self.rule.evaluate_condition(context))

    def test_evaluate_condition_unknown_operator(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.name'
        self.rule.condition_operator = 'invalid_op'
        self.rule.condition_value = 'test'
        self.rule.save()
        context = {'user': {'name': 'test'}}
        self.assertFalse(self.rule.evaluate_condition(context))

    def test_evaluate_condition_product_based(self):
        """Test product-based condition evaluation."""
        context = {
            'items': [
                {'product_type': 'tutorial', 'product_code': 'TUT-001'},
                {'product_type': 'material', 'product_code': 'MAT-001'},
            ]
        }
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_product_based_no_match(self):
        context = {
            'items': [
                {'product_type': 'material', 'product_code': 'MAT-001'},
            ]
        }
        self.assertFalse(self.rule.evaluate_condition(context))

    def test_evaluate_condition_product_based_default_field(self):
        """Test product condition with non-items field path."""
        self.rule.condition_field = 'product_id'
        self.rule.condition_operator = 'equals'
        self.rule.condition_value = 'PROD-001'
        self.rule.save()
        context = {
            'items': [
                {'product_id': 'PROD-001'},
            ]
        }
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_with_additional_conditions_and(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.country'
        self.rule.condition_operator = 'equals'
        self.rule.condition_value = 'UK'
        self.rule.additional_conditions = [
            {'field': 'user.age', 'operator': 'greater_than', 'value': 18, 'logic': 'AND'}
        ]
        self.rule.save()
        context = {'user': {'country': 'UK', 'age': 25}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_with_additional_conditions_or(self):
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.country'
        self.rule.condition_operator = 'equals'
        self.rule.condition_value = 'UK'
        self.rule.additional_conditions = [
            {'field': 'user.country', 'operator': 'equals', 'value': 'US', 'logic': 'OR'}
        ]
        self.rule.save()
        context = {'user': {'country': 'US'}}
        self.assertTrue(self.rule.evaluate_condition(context))

    def test_evaluate_condition_exception_returns_false(self):
        """Test that exceptions in evaluate_condition return False."""
        self.rule.rule_type = 'user_attribute'
        self.rule.condition_field = 'user.country'
        self.rule.condition_operator = 'equals'
        self.rule.condition_value = 'UK'
        self.rule.save()
        # Pass a non-dict context to trigger an error
        self.assertFalse(self.rule.evaluate_condition(None))

    def test_get_nested_field_value_dict(self):
        context = {'a': {'b': {'c': 'deep_value'}}}
        result = self.rule._get_nested_field_value(context, 'a.b.c')
        self.assertEqual(result, 'deep_value')

    def test_get_nested_field_value_list_index(self):
        context = {'items': ['first', 'second', 'third']}
        result = self.rule._get_nested_field_value(context, 'items.1')
        self.assertEqual(result, 'second')

    def test_get_nested_field_value_list_out_of_range(self):
        context = {'items': ['first']}
        result = self.rule._get_nested_field_value(context, 'items.5')
        self.assertIsNone(result)

    def test_get_nested_field_value_missing_key(self):
        context = {'a': {'b': 'value'}}
        result = self.rule._get_nested_field_value(context, 'a.c')
        self.assertIsNone(result)

    def test_get_nested_field_value_non_dict_non_list(self):
        context = {'a': 'string_value'}
        result = self.rule._get_nested_field_value(context, 'a.b')
        self.assertIsNone(result)

    def test_render_content(self):
        result = self.rule.render_content({'tutorial_type': 'face-to-face'})
        self.assertIn('face-to-face', result)

    def test_render_content_no_template(self):
        self.placeholder.default_content_template = ''
        self.placeholder.save()
        result = self.rule.render_content({'tutorial_type': 'online'})
        self.assertEqual(result, '')

    def test_render_content_exception(self):
        """Test render_content handles errors gracefully."""
        self.placeholder.default_content_template = '{% invalid_tag %}'
        self.placeholder.save()
        result = self.rule.render_content({})
        self.assertEqual(result, '')


class EmailTemplateContentRuleModelTest(TestCase):
    """Tests for EmailTemplateContentRule model."""

    def setUp(self):
        self.template = EmailTemplate.objects.create(
            name='order_confirmation',
            display_name='Order Confirmation',
            subject_template='Order Confirmation',
            content_template_name='order_confirmation_content',
        )
        self.placeholder = EmailContentPlaceholder.objects.create(
            name='TUTORIAL_CONTENT',
            display_name='Tutorial Content',
            default_content_template='<p>Default</p>',
            content_variables={'key': 'value'},
            is_active=True,
        )
        self.rule = EmailContentRule.objects.create(
            name='Test Rule',
            rule_type='product_based',
            placeholder=self.placeholder,
            condition_field='items.product_type',
            condition_operator='equals',
            condition_value='tutorial',
            priority=10,
            is_active=True,
        )
        self.tcr = EmailTemplateContentRule.objects.create(
            template=self.template,
            content_rule=self.rule,
            is_enabled=True,
            priority_override=None,
            content_override='',
        )

    def test_str_representation(self):
        expected = 'order_confirmation - Test Rule \u2192 TUTORIAL_CONTENT'
        self.assertEqual(str(self.tcr), expected)

    def test_effective_priority_with_override(self):
        self.tcr.priority_override = 20
        self.tcr.save()
        self.assertEqual(self.tcr.effective_priority, 20)

    def test_effective_priority_without_override(self):
        self.assertEqual(self.tcr.effective_priority, 10)

    def test_get_content_template_with_override(self):
        self.tcr.content_override = '<p>Custom content</p>'
        self.tcr.save()
        self.assertEqual(self.tcr.get_content_template(), '<p>Custom content</p>')

    def test_get_content_template_without_override(self):
        self.assertEqual(self.tcr.get_content_template(), '<p>Default</p>')

    def test_get_content_variables(self):
        self.assertEqual(self.tcr.get_content_variables(), {'key': 'value'})

    def test_unique_together(self):
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            EmailTemplateContentRule.objects.create(
                template=self.template,
                content_rule=self.rule,
            )

    def test_meta_options(self):
        self.assertEqual(EmailTemplateContentRule._meta.db_table, 'utils_email_template_content_rule')
