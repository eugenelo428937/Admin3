"""
Tests for email_system admin configuration.
Covers: EmailTemplateAdmin, EmailAttachmentAdmin, EmailQueueAdmin,
        EmailLogAdmin, EmailSettingsAdmin, EmailContentRuleAdmin,
        EmailTemplateContentRuleAdmin, EmailContentPlaceholderAdmin
"""
from unittest.mock import MagicMock, patch
from django.test import TestCase, RequestFactory
from django.contrib.admin.sites import AdminSite
from django.contrib.auth.models import User
from django.utils import timezone

from email_system.admin import (
    EmailTemplateAdmin, EmailAttachmentAdmin, EmailQueueAdmin,
    EmailLogAdmin, EmailSettingsAdmin, EmailContentRuleAdmin,
    EmailTemplateContentRuleAdmin, EmailContentPlaceholderAdmin,
    EmailTemplateAttachmentInline, EmailTemplateContentRuleInline,
)
from email_system.models import (
    EmailTemplate, EmailAttachment, EmailTemplateAttachment,
    EmailQueue, EmailLog, EmailSettings,
    EmailContentRule, EmailTemplateContentRule,
    EmailContentPlaceholder,
)


class AdminTestBase(TestCase):
    """Base class for admin tests."""

    def setUp(self):
        self.site = AdminSite()
        self.factory = RequestFactory()
        self.admin_user = User.objects.create_superuser(
            username='admin', password='adminpass', email='admin@test.com'
        )
        self.template = EmailTemplate.objects.create(
            name='test_template',
            display_name='Test Template',
            subject_template='Test Subject',
            content_template_name='test_content',
        )


class EmailTemplateAdminTest(AdminTestBase):
    """Tests for EmailTemplateAdmin."""

    def setUp(self):
        super().setUp()
        self.model_admin = EmailTemplateAdmin(EmailTemplate, self.site)

    def test_list_display(self):
        expected = [
            'name', 'display_name', 'template_type', 'use_master_template',
            'enable_queue', 'is_active', 'created_at'
        ]
        self.assertEqual(self.model_admin.list_display, expected)

    def test_list_filter(self):
        self.assertIn('template_type', self.model_admin.list_filter)
        self.assertIn('use_master_template', self.model_admin.list_filter)
        self.assertIn('is_active', self.model_admin.list_filter)

    def test_search_fields(self):
        self.assertIn('name', self.model_admin.search_fields)
        self.assertIn('display_name', self.model_admin.search_fields)

    def test_readonly_fields(self):
        self.assertIn('created_at', self.model_admin.readonly_fields)
        self.assertIn('updated_at', self.model_admin.readonly_fields)

    def test_fieldsets(self):
        self.assertIsNotNone(self.model_admin.fieldsets)
        # Check that fieldsets contain expected sections
        section_names = [fs[0] for fs in self.model_admin.fieldsets]
        self.assertIn('Basic Information', section_names)
        self.assertIn('Template Configuration', section_names)
        self.assertIn('Email Settings', section_names)
        self.assertIn('Processing Options', section_names)
        self.assertIn('Metadata', section_names)

    def test_get_queryset(self):
        request = self.factory.get('/admin/')
        request.user = self.admin_user
        qs = self.model_admin.get_queryset(request)
        self.assertTrue(qs.exists())


class EmailAttachmentAdminTest(AdminTestBase):
    """Tests for EmailAttachmentAdmin."""

    def setUp(self):
        super().setUp()
        self.model_admin = EmailAttachmentAdmin(EmailAttachment, self.site)
        self.attachment = EmailAttachment.objects.create(
            name='test_file',
            display_name='Test File.pdf',
            attachment_type='static',
            file_size=0,
        )

    def test_list_display(self):
        self.assertIn('file_size_display', self.model_admin.list_display)

    def test_file_size_display_zero(self):
        result = self.model_admin.file_size_display(self.attachment)
        self.assertEqual(result, '-')

    def test_file_size_display_bytes(self):
        self.attachment.file_size = 512
        result = self.model_admin.file_size_display(self.attachment)
        self.assertEqual(result, '512.0 B')

    def test_file_size_display_kb(self):
        self.attachment.file_size = 2048
        result = self.model_admin.file_size_display(self.attachment)
        self.assertEqual(result, '2.0 KB')

    def test_file_size_display_mb(self):
        self.attachment.file_size = 1024 * 1024 * 3
        result = self.model_admin.file_size_display(self.attachment)
        self.assertIn('MB', result)

    def test_file_size_display_gb(self):
        self.attachment.file_size = 1024 * 1024 * 1024 * 2
        result = self.model_admin.file_size_display(self.attachment)
        self.assertIn('GB', result)

    def test_file_size_display_tb(self):
        self.attachment.file_size = 1024 * 1024 * 1024 * 1024 * 2
        result = self.model_admin.file_size_display(self.attachment)
        self.assertIn('TB', result)

    def test_file_size_display_short_description(self):
        self.assertEqual(
            EmailAttachmentAdmin.file_size_display.short_description, 'File Size'
        )

    def test_inlines(self):
        self.assertIn(EmailTemplateAttachmentInline, self.model_admin.inlines)


class EmailQueueAdminTest(AdminTestBase):
    """Tests for EmailQueueAdmin."""

    def setUp(self):
        super().setUp()
        self.model_admin = EmailQueueAdmin(EmailQueue, self.site)
        self.queue_item = EmailQueue.objects.create(
            template=self.template,
            to_emails=['user@example.com'],
            from_email='sender@example.com',
            subject='Test Subject for the Queue Item Email',
            priority='normal',
            status='pending',
        )

    def test_queue_id_short(self):
        result = self.model_admin.queue_id_short(self.queue_item)
        self.assertTrue(result.endswith('...'))
        self.assertEqual(len(result), 11)  # 8 chars + '...'

    def test_subject_truncated_short(self):
        self.queue_item.subject = 'Short subject'
        result = self.model_admin.subject_truncated(self.queue_item)
        self.assertEqual(result, 'Short subject')

    def test_subject_truncated_long(self):
        self.queue_item.subject = 'A' * 60
        result = self.model_admin.subject_truncated(self.queue_item)
        self.assertEqual(len(result), 53)  # 50 chars + '...'
        self.assertTrue(result.endswith('...'))

    def test_recipients_display_single(self):
        result = self.model_admin.recipients_display(self.queue_item)
        self.assertEqual(result, 'user@example.com')

    def test_recipients_display_two(self):
        self.queue_item.to_emails = ['a@test.com', 'b@test.com']
        result = self.model_admin.recipients_display(self.queue_item)
        self.assertEqual(result, 'a@test.com, b@test.com')

    def test_recipients_display_three(self):
        self.queue_item.to_emails = ['a@test.com', 'b@test.com', 'c@test.com']
        result = self.model_admin.recipients_display(self.queue_item)
        self.assertEqual(result, 'a@test.com, b@test.com, c@test.com')

    def test_recipients_display_many(self):
        self.queue_item.to_emails = ['a@test.com', 'b@test.com', 'c@test.com', 'd@test.com']
        result = self.model_admin.recipients_display(self.queue_item)
        self.assertIn('+2 more', result)

    def test_processing_time_display_with_value(self):
        # EmailQueue doesn't have processing_time_ms, but EmailLog does
        # This admin method on EmailQueueAdmin references it
        obj = MagicMock()
        obj.processing_time_ms = 150
        result = self.model_admin.processing_time_display(obj)
        self.assertEqual(result, '150ms')

    def test_processing_time_display_none(self):
        obj = MagicMock()
        obj.processing_time_ms = None
        result = self.model_admin.processing_time_display(obj)
        self.assertEqual(result, '-')

    def test_actions(self):
        self.assertIn('retry_failed_emails', self.model_admin.actions)
        self.assertIn('cancel_emails', self.model_admin.actions)
        self.assertIn('mark_as_processed', self.model_admin.actions)

    def test_retry_failed_emails_action(self):
        self.queue_item.status = 'failed'
        self.queue_item.attempts = 1
        self.queue_item.max_attempts = 3
        self.queue_item.save()

        request = self.factory.post('/admin/')
        request.user = self.admin_user
        # Mock message_user
        self.model_admin.message_user = MagicMock()

        queryset = EmailQueue.objects.filter(id=self.queue_item.id)
        self.model_admin.retry_failed_emails(request, queryset)
        self.model_admin.message_user.assert_called_once()

    def test_cancel_emails_action(self):
        request = self.factory.post('/admin/')
        request.user = self.admin_user
        self.model_admin.message_user = MagicMock()

        queryset = EmailQueue.objects.filter(id=self.queue_item.id)
        self.model_admin.cancel_emails(request, queryset)
        self.model_admin.message_user.assert_called_once()
        self.queue_item.refresh_from_db()
        self.assertEqual(self.queue_item.status, 'cancelled')

    def test_mark_as_processed_action(self):
        request = self.factory.post('/admin/')
        request.user = self.admin_user
        self.model_admin.message_user = MagicMock()

        queryset = EmailQueue.objects.filter(id=self.queue_item.id)
        self.model_admin.mark_as_processed(request, queryset)
        self.model_admin.message_user.assert_called_once()
        self.queue_item.refresh_from_db()
        self.assertEqual(self.queue_item.status, 'sent')

    def test_short_descriptions(self):
        self.assertEqual(
            EmailQueueAdmin.queue_id_short.short_description, 'Queue ID'
        )
        self.assertEqual(
            EmailQueueAdmin.subject_truncated.short_description, 'Subject'
        )
        self.assertEqual(
            EmailQueueAdmin.recipients_display.short_description, 'Recipients'
        )
        self.assertEqual(
            EmailQueueAdmin.processing_time_display.short_description, 'Processing Time'
        )


class EmailLogAdminTest(AdminTestBase):
    """Tests for EmailLogAdmin."""

    def setUp(self):
        super().setUp()
        self.model_admin = EmailLogAdmin(EmailLog, self.site)
        self.log = EmailLog.objects.create(
            template=self.template,
            to_email='user@example.com',
            from_email='sender@example.com',
            subject='Test Subject for Log',
            status='queued',
        )

    def test_log_id_short(self):
        result = self.model_admin.log_id_short(self.log)
        self.assertTrue(result.endswith('...'))
        self.assertEqual(len(result), 11)

    def test_subject_truncated_short(self):
        self.log.subject = 'Short subject'
        result = self.model_admin.subject_truncated(self.log)
        self.assertEqual(result, 'Short subject')

    def test_subject_truncated_long(self):
        self.log.subject = 'B' * 60
        result = self.model_admin.subject_truncated(self.log)
        self.assertEqual(len(result), 53)
        self.assertTrue(result.endswith('...'))

    def test_total_size_display_zero(self):
        self.log.total_size_bytes = 0
        result = self.model_admin.total_size_display(self.log)
        self.assertEqual(result, '-')

    def test_total_size_display_bytes(self):
        self.log.total_size_bytes = 512
        result = self.model_admin.total_size_display(self.log)
        self.assertEqual(result, '512.0 B')

    def test_total_size_display_kb(self):
        self.log.total_size_bytes = 2048
        result = self.model_admin.total_size_display(self.log)
        self.assertEqual(result, '2.0 KB')

    def test_total_size_display_mb(self):
        self.log.total_size_bytes = 1024 * 1024 * 5
        result = self.model_admin.total_size_display(self.log)
        self.assertIn('MB', result)

    def test_total_size_display_gb(self):
        self.log.total_size_bytes = 1024 * 1024 * 1024 * 2
        result = self.model_admin.total_size_display(self.log)
        self.assertIn('GB', result)

    def test_total_size_display_tb(self):
        self.log.total_size_bytes = 1024 * 1024 * 1024 * 1024 * 2
        result = self.model_admin.total_size_display(self.log)
        self.assertIn('TB', result)

    def test_processing_time_display_with_value(self):
        self.log.processing_time_ms = 250
        result = self.model_admin.processing_time_display(self.log)
        self.assertEqual(result, '250ms')

    def test_processing_time_display_none(self):
        self.log.processing_time_ms = None
        result = self.model_admin.processing_time_display(self.log)
        self.assertEqual(result, '-')

    def test_short_descriptions(self):
        self.assertEqual(EmailLogAdmin.log_id_short.short_description, 'Log ID')
        self.assertEqual(EmailLogAdmin.subject_truncated.short_description, 'Subject')
        self.assertEqual(EmailLogAdmin.total_size_display.short_description, 'Total Size')
        self.assertEqual(EmailLogAdmin.processing_time_display.short_description, 'Processing Time')


class EmailSettingsAdminTest(AdminTestBase):
    """Tests for EmailSettingsAdmin."""

    def setUp(self):
        super().setUp()
        self.model_admin = EmailSettingsAdmin(EmailSettings, self.site)
        self.setting = EmailSettings.objects.create(
            key='test_setting',
            setting_type='queue',
            display_name='Test Setting',
            value='test_value',
        )

    def test_value_preview_normal(self):
        result = self.model_admin.value_preview(self.setting)
        self.assertEqual(result, 'test_value')

    def test_value_preview_sensitive(self):
        self.setting.is_sensitive = True
        result = self.model_admin.value_preview(self.setting)
        self.assertEqual(result, '*** (sensitive) ***')

    def test_value_preview_long(self):
        self.setting.value = 'x' * 60
        result = self.model_admin.value_preview(self.setting)
        self.assertEqual(len(result), 53)
        self.assertTrue(result.endswith('...'))

    def test_save_model_sets_updated_by(self):
        request = self.factory.post('/admin/')
        request.user = self.admin_user
        form = MagicMock()
        self.model_admin.save_model(request, self.setting, form, change=True)
        self.setting.refresh_from_db()
        self.assertEqual(self.setting.updated_by, self.admin_user)

    def test_value_preview_short_description(self):
        self.assertEqual(
            EmailSettingsAdmin.value_preview.short_description, 'Value'
        )


class EmailContentRuleAdminTest(AdminTestBase):
    """Tests for EmailContentRuleAdmin."""

    def setUp(self):
        super().setUp()
        self.model_admin = EmailContentRuleAdmin(EmailContentRule, self.site)
        self.placeholder = EmailContentPlaceholder.objects.create(
            name='TEST_PH',
            display_name='Test PH',
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

    def test_save_model_new(self):
        """Test that created_by is set on new rule creation."""
        request = self.factory.post('/admin/')
        request.user = self.admin_user
        form = MagicMock()

        new_rule = EmailContentRule(
            name='New Rule',
            rule_type='product_based',
            placeholder=self.placeholder,
            condition_field='items.product_type',
            condition_operator='equals',
            condition_value='test',
        )
        self.model_admin.save_model(request, new_rule, form, change=False)
        self.assertEqual(new_rule.created_by, self.admin_user)

    def test_save_model_existing(self):
        """Test that created_by is NOT changed on existing rule update."""
        request = self.factory.post('/admin/')
        request.user = self.admin_user
        form = MagicMock()

        self.model_admin.save_model(request, self.rule, form, change=True)
        self.assertIsNone(self.rule.created_by)

    def test_list_display(self):
        self.assertIn('name', self.model_admin.list_display)
        self.assertIn('rule_type', self.model_admin.list_display)
        self.assertIn('placeholder', self.model_admin.list_display)

    def test_fieldsets(self):
        section_names = [fs[0] for fs in self.model_admin.fieldsets]
        self.assertIn('Basic Information', section_names)
        self.assertIn('Condition Configuration', section_names)
        self.assertIn('Priority and Behavior', section_names)


class EmailTemplateContentRuleAdminTest(AdminTestBase):
    """Tests for EmailTemplateContentRuleAdmin."""

    def setUp(self):
        super().setUp()
        self.model_admin = EmailTemplateContentRuleAdmin(EmailTemplateContentRule, self.site)
        self.placeholder = EmailContentPlaceholder.objects.create(
            name='TEST_PH',
            display_name='Test PH',
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
            priority_override=20,
        )

    def test_effective_priority_display(self):
        result = self.model_admin.effective_priority(self.tcr)
        self.assertEqual(result, 20)

    def test_effective_priority_short_description(self):
        self.assertEqual(
            EmailTemplateContentRuleAdmin.effective_priority.short_description,
            'Effective Priority'
        )

    def test_list_display(self):
        self.assertIn('template', self.model_admin.list_display)
        self.assertIn('content_rule', self.model_admin.list_display)
        self.assertIn('effective_priority', self.model_admin.list_display)


class EmailContentPlaceholderAdminTest(AdminTestBase):
    """Tests for EmailContentPlaceholderAdmin."""

    def setUp(self):
        super().setUp()
        self.model_admin = EmailContentPlaceholderAdmin(EmailContentPlaceholder, self.site)

    def test_list_display(self):
        self.assertIn('name', self.model_admin.list_display)
        self.assertIn('display_name', self.model_admin.list_display)
        self.assertIn('is_required', self.model_admin.list_display)

    def test_fieldsets(self):
        section_names = [fs[0] for fs in self.model_admin.fieldsets]
        self.assertIn('Basic Information', section_names)
        self.assertIn('Content Template Configuration', section_names)
        self.assertIn('Placeholder Configuration', section_names)


class EmailAttachmentAdminFieldsetsTest(AdminTestBase):
    """Additional tests for EmailAttachmentAdmin fieldsets and configuration."""

    def setUp(self):
        super().setUp()
        self.model_admin = EmailAttachmentAdmin(EmailAttachment, self.site)

    def test_fieldsets_sections(self):
        section_names = [fs[0] for fs in self.model_admin.fieldsets]
        self.assertIn('Basic Information', section_names)
        self.assertIn('File Information', section_names)
        self.assertIn('Configuration', section_names)
        self.assertIn('Metadata', section_names)

    def test_list_filter(self):
        self.assertIn('attachment_type', self.model_admin.list_filter)
        self.assertIn('is_conditional', self.model_admin.list_filter)
        self.assertIn('is_active', self.model_admin.list_filter)

    def test_search_fields(self):
        self.assertIn('name', self.model_admin.search_fields)
        self.assertIn('display_name', self.model_admin.search_fields)
        self.assertIn('file_path', self.model_admin.search_fields)

    def test_readonly_fields(self):
        self.assertIn('created_at', self.model_admin.readonly_fields)
        self.assertIn('updated_at', self.model_admin.readonly_fields)
        self.assertIn('file_size_display', self.model_admin.readonly_fields)


class EmailQueueAdminFieldsetsTest(AdminTestBase):
    """Additional tests for EmailQueueAdmin fieldsets and configuration."""

    def setUp(self):
        super().setUp()
        self.model_admin = EmailQueueAdmin(EmailQueue, self.site)

    def test_fieldsets_sections(self):
        section_names = [fs[0] for fs in self.model_admin.fieldsets]
        self.assertIn('Queue Information', section_names)
        self.assertIn('Email Details', section_names)
        self.assertIn('Content', section_names)
        self.assertIn('Scheduling', section_names)
        self.assertIn('Processing', section_names)
        self.assertIn('Results', section_names)
        self.assertIn('Metadata', section_names)

    def test_list_filter(self):
        self.assertIn('status', self.model_admin.list_filter)
        self.assertIn('priority', self.model_admin.list_filter)

    def test_search_fields(self):
        self.assertIn('queue_id', self.model_admin.search_fields)
        self.assertIn('subject', self.model_admin.search_fields)
        self.assertIn('to_emails', self.model_admin.search_fields)

    def test_readonly_fields(self):
        self.assertIn('queue_id', self.model_admin.readonly_fields)
        self.assertIn('created_at', self.model_admin.readonly_fields)
        self.assertIn('processing_time_display', self.model_admin.readonly_fields)

    def test_retry_failed_emails_no_retryable(self):
        """Test retry action with no retryable emails."""
        # Create a sent item (cannot retry)
        queue_item = EmailQueue.objects.create(
            to_emails=['admin_retry@example.com'],
            from_email='sender@example.com',
            subject='Admin Retry Test',
            status='sent',
        )
        request = self.factory.post('/admin/')
        request.user = self.admin_user
        self.model_admin.message_user = MagicMock()
        queryset = EmailQueue.objects.filter(id=queue_item.id)
        self.model_admin.retry_failed_emails(request, queryset)
        self.model_admin.message_user.assert_called_once_with(
            request, "Scheduled 0 emails for retry."
        )

    def test_retry_action_short_description(self):
        self.assertEqual(
            EmailQueueAdmin.retry_failed_emails.short_description,
            "Retry failed emails"
        )

    def test_cancel_action_short_description(self):
        self.assertEqual(
            EmailQueueAdmin.cancel_emails.short_description,
            "Cancel pending emails"
        )

    def test_mark_processed_action_short_description(self):
        self.assertEqual(
            EmailQueueAdmin.mark_as_processed.short_description,
            "Mark as sent (testing)"
        )


class EmailLogAdminFieldsetsTest(AdminTestBase):
    """Additional tests for EmailLogAdmin fieldsets and configuration."""

    def setUp(self):
        super().setUp()
        self.model_admin = EmailLogAdmin(EmailLog, self.site)

    def test_fieldsets_sections(self):
        section_names = [fs[0] for fs in self.model_admin.fieldsets]
        self.assertIn('Log Information', section_names)
        self.assertIn('Email Details', section_names)
        self.assertIn('Content', section_names)
        self.assertIn('Timing', section_names)
        self.assertIn('Response Tracking', section_names)
        self.assertIn('Analytics', section_names)
        self.assertIn('Metadata', section_names)

    def test_list_filter(self):
        self.assertIn('status', self.model_admin.list_filter)

    def test_search_fields(self):
        self.assertIn('log_id', self.model_admin.search_fields)
        self.assertIn('to_email', self.model_admin.search_fields)
        self.assertIn('subject', self.model_admin.search_fields)

    def test_readonly_fields(self):
        self.assertIn('log_id', self.model_admin.readonly_fields)
        self.assertIn('content_hash', self.model_admin.readonly_fields)
        self.assertIn('total_size_display', self.model_admin.readonly_fields)
        self.assertIn('processing_time_display', self.model_admin.readonly_fields)


class EmailSettingsAdminFieldsetsTest(AdminTestBase):
    """Additional tests for EmailSettingsAdmin fieldsets and configuration."""

    def setUp(self):
        super().setUp()
        self.model_admin = EmailSettingsAdmin(EmailSettings, self.site)

    def test_fieldsets_sections(self):
        section_names = [fs[0] for fs in self.model_admin.fieldsets]
        self.assertIn('Setting Information', section_names)
        self.assertIn('Value', section_names)
        self.assertIn('Configuration', section_names)
        self.assertIn('Metadata', section_names)

    def test_list_filter(self):
        self.assertIn('setting_type', self.model_admin.list_filter)
        self.assertIn('is_required', self.model_admin.list_filter)
        self.assertIn('is_sensitive', self.model_admin.list_filter)
        self.assertIn('is_active', self.model_admin.list_filter)

    def test_search_fields(self):
        self.assertIn('key', self.model_admin.search_fields)
        self.assertIn('display_name', self.model_admin.search_fields)

    def test_readonly_fields(self):
        self.assertIn('created_at', self.model_admin.readonly_fields)
        self.assertIn('updated_at', self.model_admin.readonly_fields)


class EmailContentRuleAdminFieldsetsTest(AdminTestBase):
    """Additional tests for EmailContentRuleAdmin fieldsets and configuration."""

    def setUp(self):
        super().setUp()
        self.model_admin = EmailContentRuleAdmin(EmailContentRule, self.site)

    def test_list_filter(self):
        self.assertIn('rule_type', self.model_admin.list_filter)
        self.assertIn('condition_operator', self.model_admin.list_filter)
        self.assertIn('is_active', self.model_admin.list_filter)
        self.assertIn('is_exclusive', self.model_admin.list_filter)

    def test_search_fields(self):
        self.assertIn('name', self.model_admin.search_fields)
        self.assertIn('description', self.model_admin.search_fields)
        self.assertIn('condition_field', self.model_admin.search_fields)

    def test_readonly_fields(self):
        self.assertIn('created_at', self.model_admin.readonly_fields)
        self.assertIn('updated_at', self.model_admin.readonly_fields)


class EmailTemplateContentRuleAdminFieldsetsTest(AdminTestBase):
    """Additional tests for EmailTemplateContentRuleAdmin fieldsets."""

    def setUp(self):
        super().setUp()
        self.model_admin = EmailTemplateContentRuleAdmin(EmailTemplateContentRule, self.site)

    def test_fieldsets_sections(self):
        section_names = [fs[0] for fs in self.model_admin.fieldsets]
        self.assertIn('Association', section_names)
        self.assertIn('Rule Overrides', section_names)
        self.assertIn('Metadata', section_names)

    def test_list_filter(self):
        self.assertIn('is_enabled', self.model_admin.list_filter)

    def test_search_fields(self):
        self.assertIn('template__name', self.model_admin.search_fields)
        self.assertIn('content_rule__name', self.model_admin.search_fields)

    def test_readonly_fields(self):
        self.assertIn('created_at', self.model_admin.readonly_fields)
        self.assertIn('effective_priority', self.model_admin.readonly_fields)


class EmailContentPlaceholderAdminFieldsetsTest(AdminTestBase):
    """Additional tests for EmailContentPlaceholderAdmin."""

    def setUp(self):
        super().setUp()
        self.model_admin = EmailContentPlaceholderAdmin(EmailContentPlaceholder, self.site)

    def test_list_filter(self):
        self.assertIn('is_required', self.model_admin.list_filter)
        self.assertIn('allow_multiple_rules', self.model_admin.list_filter)
        self.assertIn('is_active', self.model_admin.list_filter)

    def test_search_fields(self):
        self.assertIn('name', self.model_admin.search_fields)
        self.assertIn('display_name', self.model_admin.search_fields)

    def test_readonly_fields(self):
        self.assertIn('created_at', self.model_admin.readonly_fields)
        self.assertIn('updated_at', self.model_admin.readonly_fields)

    def test_fieldsets_metadata(self):
        section_names = [fs[0] for fs in self.model_admin.fieldsets]
        self.assertIn('Metadata', section_names)


class InlineAdminTest(AdminTestBase):
    """Tests for inline admin classes."""

    def test_email_template_attachment_inline(self):
        inline = EmailTemplateAttachmentInline(EmailTemplate, self.site)
        self.assertEqual(inline.model, EmailTemplateAttachment)
        self.assertEqual(inline.extra, 1)

    def test_email_template_attachment_inline_fields(self):
        inline = EmailTemplateAttachmentInline(EmailTemplate, self.site)
        self.assertIn('attachment', inline.fields)
        self.assertIn('is_required', inline.fields)
        self.assertIn('order', inline.fields)

    def test_email_template_content_rule_inline(self):
        inline = EmailTemplateContentRuleInline(EmailTemplate, self.site)
        self.assertEqual(inline.model, EmailTemplateContentRule)
        self.assertEqual(inline.extra, 1)

    def test_email_template_content_rule_inline_fields(self):
        inline = EmailTemplateContentRuleInline(EmailTemplate, self.site)
        self.assertIn('content_rule', inline.fields)
        self.assertIn('is_enabled', inline.fields)
