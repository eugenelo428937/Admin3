"""
Tests for email_system queue service.
Covers: EmailQueueService, datetime_serializer, email_queue_service global instance
"""
import json
import hashlib
from datetime import timedelta
from unittest.mock import patch, MagicMock, PropertyMock
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from django.utils import timezone

from email_system.models import (
    EmailTemplate, EmailAttachment, EmailTemplateAttachment,
    EmailQueue, EmailLog, EmailContentPlaceholder,
)
from email_system.services.queue_service import (
    EmailQueueService, datetime_serializer, email_queue_service,
)


class DatetimeSerializerTest(TestCase):
    """Tests for the datetime_serializer helper function."""

    def test_serializes_datetime(self):
        dt = timezone.now()
        result = datetime_serializer(dt)
        self.assertEqual(result, dt.isoformat())

    def test_raises_for_non_datetime(self):
        with self.assertRaises(TypeError) as ctx:
            datetime_serializer({'not': 'datetime'})
        self.assertIn('not JSON serializable', str(ctx.exception))

    def test_serializes_in_json_dumps(self):
        dt = timezone.now()
        data = {'timestamp': dt}
        result = json.loads(json.dumps(data, default=datetime_serializer))
        self.assertEqual(result['timestamp'], dt.isoformat())


class GlobalInstanceTest(TestCase):
    """Tests for the global email_queue_service instance."""

    def test_global_instance_exists(self):
        self.assertIsNotNone(email_queue_service)
        self.assertIsInstance(email_queue_service, EmailQueueService)

    def test_global_instance_has_email_service(self):
        self.assertIsNotNone(email_queue_service.email_service)


class EmailQueueServiceInitTest(TestCase):
    """Tests for EmailQueueService initialization."""

    def test_init_creates_email_service(self):
        service = EmailQueueService()
        self.assertIsNotNone(service.email_service)


class QueueEmailTest(TestCase):
    """Tests for EmailQueueService.queue_email method."""

    def setUp(self):
        self.service = EmailQueueService()
        self.user = User.objects.create_user(
            username='eqs_queue_user', password='testpass123'
        )
        self.template = EmailTemplate.objects.create(
            name='eqs_order_confirm',
            display_name='EQS Order Confirmation',
            template_type='order_confirmation',
            subject_template='Order #{{ order_number }} Confirmed',
            content_template_name='eqs_order_content',
            from_email='eqs_orders@example.com',
            reply_to_email='eqs_reply@example.com',
            default_priority='high',
            max_retry_attempts=5,
            is_active=True,
        )

    def test_queue_email_with_template(self):
        """Test queuing email with an existing template."""
        queue_item = self.service.queue_email(
            template_name='eqs_order_confirm',
            to_emails='customer@example.com',
            context={'order_number': 'EQS-001'},
            user=self.user,
        )
        self.assertIsNotNone(queue_item)
        self.assertEqual(queue_item.template, self.template)
        self.assertEqual(queue_item.to_emails, ['customer@example.com'])
        self.assertEqual(queue_item.from_email, 'eqs_orders@example.com')
        self.assertEqual(queue_item.max_attempts, 5)
        self.assertEqual(queue_item.status, 'pending')

    def test_queue_email_string_to_email_normalized(self):
        """Test that a string email is converted to list."""
        queue_item = self.service.queue_email(
            template_name='eqs_order_confirm',
            to_emails='single@example.com',
            context={},
        )
        self.assertEqual(queue_item.to_emails, ['single@example.com'])

    def test_queue_email_list_to_emails(self):
        """Test that list emails remain as-is."""
        queue_item = self.service.queue_email(
            template_name='eqs_order_confirm',
            to_emails=['a@example.com', 'b@example.com'],
            context={},
        )
        self.assertEqual(len(queue_item.to_emails), 2)

    def test_queue_email_without_template(self):
        """Test queuing email when template doesn't exist."""
        queue_item = self.service.queue_email(
            template_name='nonexistent_eqs_template',
            to_emails='user@example.com',
            context={'key': 'value'},
            reply_to_email='eqs_reply_fallback@example.com',
        )
        self.assertIsNotNone(queue_item)
        self.assertIsNone(queue_item.template)
        self.assertEqual(queue_item.subject, 'Email from nonexistent_eqs_template')

    def test_queue_email_subject_override(self):
        """Test that subject_override takes precedence."""
        queue_item = self.service.queue_email(
            template_name='eqs_order_confirm',
            to_emails='user@example.com',
            context={'order_number': 'EQS-002'},
            subject_override='Custom Subject Override',
        )
        self.assertEqual(queue_item.subject, 'Custom Subject Override')

    def test_queue_email_renders_subject_template(self):
        """Test that template subject is rendered with context."""
        queue_item = self.service.queue_email(
            template_name='eqs_order_confirm',
            to_emails='user@example.com',
            context={'order_number': 'EQS-003'},
        )
        self.assertIn('EQS-003', queue_item.subject)

    def test_queue_email_subject_render_failure_fallback(self):
        """Test fallback when subject template rendering fails."""
        self.template.subject_template = '{% invalid_tag %}'
        self.template.save()

        queue_item = self.service.queue_email(
            template_name='eqs_order_confirm',
            to_emails='user@example.com',
            context={},
        )
        # Should fall back to the raw subject_template string
        self.assertEqual(queue_item.subject, '{% invalid_tag %}')

    def test_queue_email_with_cc_bcc(self):
        """Test queuing with CC and BCC."""
        queue_item = self.service.queue_email(
            template_name='eqs_order_confirm',
            to_emails='user@example.com',
            context={},
            cc_emails=['cc@example.com'],
            bcc_emails=['bcc@example.com'],
        )
        self.assertEqual(queue_item.cc_emails, ['cc@example.com'])
        self.assertEqual(queue_item.bcc_emails, ['bcc@example.com'])

    def test_queue_email_with_scheduling(self):
        """Test queuing with scheduled time and expiry."""
        scheduled = timezone.now() + timedelta(hours=1)
        expires = timezone.now() + timedelta(hours=24)

        queue_item = self.service.queue_email(
            template_name='eqs_order_confirm',
            to_emails='user@example.com',
            context={},
            scheduled_at=scheduled,
            expires_at=expires,
        )
        self.assertEqual(queue_item.scheduled_at, scheduled)
        self.assertEqual(queue_item.expires_at, expires)

    def test_queue_email_with_tags(self):
        """Test queuing with tags."""
        queue_item = self.service.queue_email(
            template_name='eqs_order_confirm',
            to_emails='user@example.com',
            context={},
            tags=['eqs_tag1', 'eqs_tag2'],
        )
        self.assertEqual(queue_item.tags, ['eqs_tag1', 'eqs_tag2'])

    def test_queue_email_with_from_email_override(self):
        """Test queuing with from_email override."""
        queue_item = self.service.queue_email(
            template_name='eqs_order_confirm',
            to_emails='user@example.com',
            context={},
            from_email='override@example.com',
        )
        self.assertEqual(queue_item.from_email, 'override@example.com')

    def test_queue_email_template_defaults_applied(self):
        """Test that template defaults are applied when no overrides given."""
        queue_item = self.service.queue_email(
            template_name='eqs_order_confirm',
            to_emails='user@example.com',
            context={},
        )
        # Template's from_email should be used
        self.assertEqual(queue_item.from_email, 'eqs_orders@example.com')

    def test_queue_email_context_with_datetime(self):
        """Test queuing with datetime in context (should be serialized)."""
        now = timezone.now()
        queue_item = self.service.queue_email(
            template_name='eqs_order_confirm',
            to_emails='user@example.com',
            context={'created_at': now, 'name': 'Test'},
        )
        # Context should be serialized (datetime converted to isoformat)
        self.assertIsNotNone(queue_item.email_context)
        self.assertEqual(queue_item.email_context['name'], 'Test')

    def test_queue_email_no_template_defaults(self):
        """Test queuing without template uses service defaults."""
        queue_item = self.service.queue_email(
            template_name='nonexistent_eqs_template_xyz',
            to_emails='user@example.com',
            context={},
            priority='urgent',
            reply_to_email='eqs_noreply@example.com',
        )
        self.assertEqual(queue_item.priority, 'urgent')
        self.assertEqual(queue_item.max_attempts, 3)  # default


class CleanContextForSerializationTest(TestCase):
    """Tests for _clean_context_for_serialization."""

    def setUp(self):
        self.service = EmailQueueService()

    def test_clean_simple_context(self):
        """Test that simple serializable context passes through."""
        context = {'name': 'John', 'age': 30, 'active': True}
        result = self.service._clean_context_for_serialization(context)
        self.assertEqual(result, context)

    def test_clean_datetime_value(self):
        """Test that datetime values pass through (serializable via datetime_serializer)."""
        now = timezone.now()
        context = {'timestamp': now}
        result = self.service._clean_context_for_serialization(context)
        # datetime is JSON-serializable with datetime_serializer as default,
        # so it passes through the json.dumps check and is kept as-is
        self.assertEqual(result['timestamp'], now)

    def test_clean_django_model_instance(self):
        """Test that Django model instances are converted to dicts."""
        user = User.objects.create_user(
            username='eqs_clean_ctx_user', password='testpass'
        )
        context = {'user': user}
        result = self.service._clean_context_for_serialization(context)
        self.assertIsInstance(result['user'], dict)
        self.assertEqual(result['user']['username'], 'eqs_clean_ctx_user')

    def test_clean_list_with_non_serializable(self):
        """Test cleaning a list containing non-serializable items."""
        class NonSerializable:
            def __dict__(self):
                return {'key': 'val'}
            def __str__(self):
                return 'NonSerializable'

        obj = NonSerializable()
        context = {'items': [obj, 'normal_string', 42]}
        result = self.service._clean_context_for_serialization(context)
        self.assertIsInstance(result['items'], list)
        self.assertEqual(len(result['items']), 3)

    def test_clean_nested_dict(self):
        """Test cleaning nested dictionaries recursively."""
        context = {
            'nested': {
                'name': 'Test',
                'count': 42,
            }
        }
        result = self.service._clean_context_for_serialization(context)
        self.assertEqual(result['nested']['name'], 'Test')
        self.assertEqual(result['nested']['count'], 42)

    def test_clean_non_serializable_fallback_to_string(self):
        """Test that non-serializable objects are converted to strings."""
        class CustomObj:
            def __str__(self):
                return 'custom_repr'

        context = {'custom': CustomObj()}
        result = self.service._clean_context_for_serialization(context)
        self.assertEqual(result['custom'], 'custom_repr')

    def test_clean_object_with_dict_but_no_meta(self):
        """Test object with __dict__ but not _meta (not a Django model)."""
        class SimpleObj:
            def __init__(self):
                self.x = 1
            def __str__(self):
                return 'SimpleObj'

        context = {'obj': SimpleObj()}
        result = self.service._clean_context_for_serialization(context)
        self.assertEqual(result['obj'], 'SimpleObj')


class ProcessQueueItemTest(TestCase):
    """Tests for EmailQueueService.process_queue_item."""

    def setUp(self):
        self.service = EmailQueueService()
        self.template = EmailTemplate.objects.create(
            name='eqs_process_tpl',
            display_name='EQS Process Template',
            subject_template='EQS Process Test',
            content_template_name='eqs_process_content',
            max_retry_attempts=3,
            retry_delay_minutes=5,
            is_active=True,
        )
        self.queue_item = EmailQueue.objects.create(
            template=self.template,
            to_emails=['eqs_recipient@example.com'],
            from_email='eqs_sender@example.com',
            subject='EQS Process Test Email',
            email_context={'test': 'data'},
            priority='normal',
            status='pending',
        )

    @patch.object(EmailQueueService, '_send_single_email', return_value=True)
    def test_process_successful(self, mock_send):
        """Test successful processing of a queue item."""
        result = self.service.process_queue_item(self.queue_item)
        self.assertTrue(result)
        self.queue_item.refresh_from_db()
        self.assertEqual(self.queue_item.status, 'sent')
        self.assertIsNotNone(self.queue_item.sent_at)

    @patch.object(EmailQueueService, '_send_single_email', return_value=False)
    def test_process_failure_with_retry(self, mock_send):
        """Test failed processing when can_retry is False (status is 'processing')."""
        self.queue_item.attempts = 0
        self.queue_item.max_attempts = 3
        self.queue_item.save()

        result = self.service.process_queue_item(self.queue_item)
        self.assertFalse(result)
        self.queue_item.refresh_from_db()
        # After process_queue_item, status is 'processing' when can_retry is called.
        # can_retry checks status in ['failed', 'retry'] -- 'processing' is not in that list,
        # so can_retry returns False and the item is marked 'failed'.
        self.assertEqual(self.queue_item.status, 'failed')

    @patch.object(EmailQueueService, '_send_single_email', return_value=False)
    def test_process_failure_max_attempts_reached(self, mock_send):
        """Test failed processing when max attempts reached."""
        self.queue_item.attempts = 2
        self.queue_item.max_attempts = 3
        self.queue_item.save()

        result = self.service.process_queue_item(self.queue_item)
        self.assertFalse(result)
        self.queue_item.refresh_from_db()
        self.assertEqual(self.queue_item.status, 'failed')
        self.assertIn('Maximum retry attempts', self.queue_item.error_message)

    @patch.object(EmailQueueService, '_send_single_email', side_effect=Exception('Unexpected error'))
    def test_process_exception_marks_failed(self, mock_send):
        """Test that unhandled exceptions mark item as failed."""
        result = self.service.process_queue_item(self.queue_item)
        self.assertFalse(result)
        self.queue_item.refresh_from_db()
        self.assertEqual(self.queue_item.status, 'failed')

    @patch.object(EmailQueueService, '_can_process_queue_item', return_value=False)
    def test_cannot_process(self, mock_can):
        """Test returning False when item can't be processed."""
        result = self.service.process_queue_item(self.queue_item)
        self.assertFalse(result)

    @patch.object(EmailQueueService, '_send_single_email', return_value=True)
    def test_process_multiple_recipients(self, mock_send):
        """Test processing with multiple recipients."""
        self.queue_item.to_emails = ['eqs_r1@example.com', 'eqs_r2@example.com']
        self.queue_item.save()

        result = self.service.process_queue_item(self.queue_item)
        self.assertTrue(result)
        self.assertEqual(mock_send.call_count, 2)

    @patch.object(EmailQueueService, '_send_single_email')
    def test_process_partial_failure(self, mock_send):
        """Test processing with one success and one failure."""
        mock_send.side_effect = [True, False]
        self.queue_item.to_emails = ['eqs_ok@example.com', 'eqs_fail@example.com']
        self.queue_item.max_attempts = 5
        self.queue_item.save()

        result = self.service.process_queue_item(self.queue_item)
        self.assertFalse(result)

    @patch.object(EmailQueueService, '_send_single_email', return_value=False)
    def test_process_failure_without_template_retry_delay(self, mock_send):
        """Test failure without template - can_retry returns False since status is 'processing'."""
        self.queue_item.template = None
        self.queue_item.attempts = 0
        self.queue_item.max_attempts = 3
        self.queue_item.save()

        result = self.service.process_queue_item(self.queue_item)
        self.assertFalse(result)
        self.queue_item.refresh_from_db()
        # Status is 'processing' when can_retry is checked, so it returns False
        # and item is marked as 'failed'
        self.assertEqual(self.queue_item.status, 'failed')


class CanProcessQueueItemTest(TestCase):
    """Tests for _can_process_queue_item."""

    def setUp(self):
        self.service = EmailQueueService()
        self.queue_item = EmailQueue.objects.create(
            to_emails=['eqs_can_proc@example.com'],
            from_email='eqs_sender@example.com',
            subject='EQS Can Process Test',
            status='pending',
        )

    def test_can_process_pending_item(self):
        """Test that a pending item can be processed."""
        result = self.service._can_process_queue_item(self.queue_item)
        self.assertTrue(result)

    def test_can_process_retry_item(self):
        """Test that a retry item can be processed."""
        self.queue_item.status = 'retry'
        self.queue_item.save()
        result = self.service._can_process_queue_item(self.queue_item)
        self.assertTrue(result)

    def test_cannot_process_sent_item(self):
        """Test that a sent item cannot be processed."""
        self.queue_item.status = 'sent'
        self.queue_item.save()
        result = self.service._can_process_queue_item(self.queue_item)
        self.assertFalse(result)

    def test_cannot_process_cancelled_item(self):
        """Test that a cancelled item cannot be processed."""
        self.queue_item.status = 'cancelled'
        self.queue_item.save()
        result = self.service._can_process_queue_item(self.queue_item)
        self.assertFalse(result)

    def test_cannot_process_processing_item(self):
        """Test that a processing item cannot be processed."""
        self.queue_item.status = 'processing'
        self.queue_item.save()
        result = self.service._can_process_queue_item(self.queue_item)
        self.assertFalse(result)

    def test_cannot_process_expired_item(self):
        """Test that an expired item cannot be processed."""
        self.queue_item.expires_at = timezone.now() - timedelta(hours=1)
        self.queue_item.save()
        result = self.service._can_process_queue_item(self.queue_item)
        self.assertFalse(result)
        self.queue_item.refresh_from_db()
        self.assertEqual(self.queue_item.status, 'cancelled')
        self.assertEqual(self.queue_item.error_message, 'Email expired')

    def test_cannot_process_before_process_after(self):
        """Test that item before process_after time cannot be processed."""
        self.queue_item.process_after = timezone.now() + timedelta(hours=1)
        self.queue_item.save()
        result = self.service._can_process_queue_item(self.queue_item)
        self.assertFalse(result)

    def test_cannot_process_retry_before_next_retry(self):
        """Test that retry item before next_retry_at cannot be processed."""
        self.queue_item.status = 'retry'
        self.queue_item.next_retry_at = timezone.now() + timedelta(hours=1)
        self.queue_item.save()
        result = self.service._can_process_queue_item(self.queue_item)
        self.assertFalse(result)

    def test_can_process_retry_after_next_retry(self):
        """Test that retry item past next_retry_at can be processed."""
        self.queue_item.status = 'retry'
        self.queue_item.next_retry_at = timezone.now() - timedelta(minutes=1)
        self.queue_item.save()
        result = self.service._can_process_queue_item(self.queue_item)
        self.assertTrue(result)


class SendSingleEmailTest(TestCase):
    """Tests for _send_single_email."""

    def setUp(self):
        self.service = EmailQueueService()
        self.template = EmailTemplate.objects.create(
            name='eqs_send_single_tpl',
            display_name='EQS Send Single Template',
            subject_template='EQS Send Single Test',
            content_template_name='eqs_send_single_content',
            use_master_template=True,
            enhance_outlook_compatibility=True,
            is_active=True,
        )
        self.queue_item = EmailQueue.objects.create(
            template=self.template,
            to_emails=['eqs_single@example.com'],
            from_email='eqs_sender@example.com',
            subject='EQS Send Single Test Email',
            email_context={'test': 'data'},
            priority='normal',
            status='processing',
        )

    @patch.object(EmailQueueService, '_get_template_attachments', return_value=[])
    @patch.object(EmailQueueService, '_send_with_master_template', return_value={
        'success': True, 'response_code': '250', 'response_message': 'OK',
        'esp_response': {}, 'esp_message_id': 'msg-eqs-001'
    })
    def test_send_single_email_success_master_template(self, mock_send_master, mock_attach):
        """Test successful send with master template."""
        start_time = timezone.now()
        result = self.service._send_single_email(
            self.queue_item, 'eqs_single@example.com', start_time
        )
        self.assertTrue(result)
        # Verify log was created
        log = EmailLog.objects.filter(to_email='eqs_single@example.com').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, 'sent')

    @patch.object(EmailQueueService, '_get_template_attachments', return_value=[])
    @patch.object(EmailQueueService, '_send_with_master_template', return_value={
        'success': False, 'response_code': '550', 'response_message': 'Rejected',
        'esp_response': {}, 'esp_message_id': None
    })
    def test_send_single_email_failure(self, mock_send_master, mock_attach):
        """Test failed send creates failed log entry."""
        start_time = timezone.now()
        result = self.service._send_single_email(
            self.queue_item, 'eqs_fail@example.com', start_time
        )
        self.assertFalse(result)
        log = EmailLog.objects.filter(to_email='eqs_fail@example.com').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, 'failed')

    @patch.object(EmailQueueService, '_get_template_attachments', return_value=[])
    @patch.object(EmailQueueService, '_send_with_master_template', side_effect=Exception('Send error'))
    def test_send_single_email_exception(self, mock_send_master, mock_attach):
        """Test exception during send creates failed log entry."""
        start_time = timezone.now()
        result = self.service._send_single_email(
            self.queue_item, 'eqs_exception@example.com', start_time
        )
        self.assertFalse(result)
        log = EmailLog.objects.filter(to_email='eqs_exception@example.com').first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, 'failed')

    @patch.object(EmailQueueService, '_get_template_attachments', return_value=[])
    def test_send_single_email_non_master_template(self, mock_attach):
        """Test send with non-master template."""
        self.template.use_master_template = False
        self.template.save()

        mock_response = {
            'success': True, 'response_code': '250',
            'response_message': 'Sent', 'esp_response': {},
            'esp_message_id': None
        }
        with patch.object(
            self.service.email_service, '_send_mjml_email',
            return_value=mock_response
        ):
            start_time = timezone.now()
            result = self.service._send_single_email(
                self.queue_item, 'eqs_nonmaster@example.com', start_time
            )
            self.assertTrue(result)

    @patch.object(EmailQueueService, '_get_template_attachments', return_value=[])
    def test_send_single_email_no_template(self, mock_attach):
        """Test send without a template."""
        self.queue_item.template = None
        self.queue_item.save()

        mock_response = {
            'success': True, 'response_code': '250',
            'response_message': 'Sent', 'esp_response': {},
            'esp_message_id': None
        }
        with patch.object(
            self.service.email_service, '_send_mjml_email',
            return_value=mock_response
        ):
            start_time = timezone.now()
            result = self.service._send_single_email(
                self.queue_item, 'eqs_notpl@example.com', start_time
            )
            self.assertTrue(result)

    @patch.object(EmailQueueService, '_create_email_log', side_effect=Exception('Log creation failed'))
    def test_send_single_email_log_creation_failure(self, mock_log):
        """Test that log creation failure returns False."""
        start_time = timezone.now()
        result = self.service._send_single_email(
            self.queue_item, 'eqs_logfail@example.com', start_time
        )
        self.assertFalse(result)

    @patch.object(EmailQueueService, '_get_template_attachments', return_value=[])
    @patch.object(EmailQueueService, '_send_with_master_template', return_value={
        'success': True, 'response_code': '250', 'response_message': 'OK',
        'esp_response': {}, 'esp_message_id': None
    })
    def test_send_single_email_sets_reply_to(self, mock_send, mock_attach):
        """Test that reply_to is set from queue item."""
        self.queue_item.reply_to_email = 'eqs_replyto@example.com'
        self.queue_item.save()

        start_time = timezone.now()
        result = self.service._send_single_email(
            self.queue_item, 'eqs_replyto_test@example.com', start_time
        )
        self.assertTrue(result)


class SendWithMasterTemplateTest(TestCase):
    """Tests for _send_with_master_template."""

    def setUp(self):
        self.service = EmailQueueService()
        self.template = EmailTemplate.objects.create(
            name='order_confirmation',
            display_name='EQS OC Master',
            subject_template='Order Confirmed',
            content_template_name='eqs_oc_content',
            use_master_template=True,
            enhance_outlook_compatibility=True,
            is_active=True,
        )
        self.queue_item = EmailQueue.objects.create(
            template=self.template,
            to_emails=['eqs_master@example.com'],
            from_email='eqs_sender@example.com',
            subject='EQS Master Template Test',
            email_context={'test': 'data'},
            priority='normal',
            status='processing',
        )

    @patch.object(EmailQueueService, '_get_template_attachments', return_value=[])
    def test_send_with_known_master_template(self, mock_attach):
        """Test sending with a known master template name (order_confirmation)."""
        mock_response = {
            'success': True, 'response_code': '250',
            'response_message': 'OK', 'esp_response': {},
            'esp_message_id': 'msg-eqs-master-001'
        }
        with patch.object(
            self.service.email_service, '_render_email_with_master_template',
            return_value='<mjml>rendered</mjml>'
        ), patch.object(
            self.service.email_service, '_send_mjml_email_from_content',
            return_value=mock_response
        ):
            result = self.service._send_with_master_template(
                self.queue_item, 'eqs_master@example.com', []
            )
            self.assertTrue(result['success'])

    @patch.object(EmailQueueService, '_get_template_attachments', return_value=[])
    def test_send_with_unknown_master_template(self, mock_attach):
        """Test sending with an unknown template name falls back to regular."""
        self.template.name = 'eqs_custom_unknown_tpl'
        self.template.save()

        mock_response = {
            'success': True, 'response_code': '250',
            'response_message': 'OK', 'esp_response': {},
            'esp_message_id': None
        }
        with patch.object(
            self.service.email_service, '_send_mjml_email',
            return_value=mock_response
        ):
            result = self.service._send_with_master_template(
                self.queue_item, 'eqs_unknown@example.com', []
            )
            self.assertTrue(result['success'])

    def test_send_with_master_template_exception(self):
        """Test exception in master template processing."""
        with patch.object(
            self.service.email_service, '_render_email_with_master_template',
            side_effect=Exception('Render failed')
        ):
            result = self.service._send_with_master_template(
                self.queue_item, 'eqs_except@example.com', []
            )
            self.assertFalse(result['success'])
            self.assertIn('Master template processing failed', result['response_message'])
            self.assertEqual(result['response_code'], '500')

    def test_send_with_master_template_maps_all_types(self):
        """Test all mapped template names in template_map."""
        template_names = [
            'order_confirmation', 'password_reset',
            'password_reset_completed', 'account_activation',
            'email_verification',
        ]
        for tpl_name in template_names:
            self.template.name = tpl_name
            self.template.save()
            self.queue_item.template = self.template
            self.queue_item.save()

            mock_response = {
                'success': True, 'response_code': '250',
                'response_message': 'OK', 'esp_response': {},
                'esp_message_id': None
            }
            with patch.object(
                self.service.email_service, '_render_email_with_master_template',
                return_value='<mjml>content</mjml>'
            ), patch.object(
                self.service.email_service, '_send_mjml_email_from_content',
                return_value=mock_response
            ):
                result = self.service._send_with_master_template(
                    self.queue_item, f'eqs_{tpl_name}@example.com', []
                )
                self.assertTrue(result['success'], f"Failed for template: {tpl_name}")


class CreateEmailLogTest(TestCase):
    """Tests for _create_email_log."""

    def setUp(self):
        self.service = EmailQueueService()
        self.template = EmailTemplate.objects.create(
            name='eqs_log_tpl',
            display_name='EQS Log Template',
            subject_template='EQS Log Test',
            content_template_name='eqs_log_content',
            is_active=True,
        )
        self.queue_item = EmailQueue.objects.create(
            template=self.template,
            to_emails=['eqs_log@example.com'],
            from_email='eqs_sender@example.com',
            subject='EQS Log Test Email',
            email_context={'key': 'value'},
            priority='high',
            tags=['eqs_test'],
            status='processing',
        )

    def test_creates_log_entry(self):
        """Test that a log entry is created correctly."""
        log = self.service._create_email_log(self.queue_item, 'eqs_log@example.com')
        self.assertIsNotNone(log)
        self.assertEqual(log.to_email, 'eqs_log@example.com')
        self.assertEqual(log.from_email, 'eqs_sender@example.com')
        self.assertEqual(log.subject, 'EQS Log Test Email')
        self.assertEqual(log.status, 'queued')
        self.assertEqual(log.priority, 'high')
        self.assertEqual(log.tags, ['eqs_test'])

    def test_creates_content_hash(self):
        """Test content hash is generated."""
        log = self.service._create_email_log(self.queue_item, 'eqs_hash@example.com')
        expected_content = f"{self.queue_item.subject}{self.queue_item.html_content or ''}eqs_hash@example.com"
        expected_hash = hashlib.md5(expected_content.encode()).hexdigest()
        self.assertEqual(log.content_hash, expected_hash)

    def test_creates_metadata_with_queue_id(self):
        """Test metadata includes queue_id."""
        log = self.service._create_email_log(self.queue_item, 'eqs_meta@example.com')
        self.assertIn('queue_id', log.metadata)
        self.assertEqual(log.metadata['queue_id'], str(self.queue_item.queue_id))


class GetTemplateAttachmentsTest(TestCase):
    """Tests for _get_template_attachments."""

    def setUp(self):
        self.service = EmailQueueService()
        self.template = EmailTemplate.objects.create(
            name='eqs_attach_tpl',
            display_name='EQS Attach Template',
            subject_template='EQS Attach Test',
            content_template_name='eqs_attach_content',
            is_active=True,
        )
        self.attachment = EmailAttachment.objects.create(
            name='eqs_test_file',
            display_name='EQS Test File.pdf',
            attachment_type='static',
            file_path='/static/files/eqs_test.pdf',
            file_url='http://example.com/eqs_test.pdf',
            mime_type='application/pdf',
            file_size=1024,
            is_active=True,
        )

    def test_get_attachments_no_template(self):
        """Test returns empty list when no template."""
        result = self.service._get_template_attachments(None, {})
        self.assertEqual(result, [])

    def test_get_attachments_no_attachments(self):
        """Test returns empty list when template has no attachments."""
        result = self.service._get_template_attachments(self.template, {})
        self.assertEqual(result, [])

    @patch.object(EmailQueueService, '_should_include_attachment', return_value=True)
    def test_get_attachments_with_attachment(self, mock_include):
        """Test returns attachment info when attachment exists."""
        EmailTemplateAttachment.objects.create(
            template=self.template,
            attachment=self.attachment,
            is_required=True,
            order=1,
        )
        result = self.service._get_template_attachments(self.template, {})
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['name'], 'eqs_test_file')
        self.assertEqual(result[0]['display_name'], 'EQS Test File.pdf')
        self.assertEqual(result[0]['mime_type'], 'application/pdf')
        self.assertTrue(result[0]['is_required'])

    @patch.object(EmailQueueService, '_should_include_attachment', return_value=False)
    def test_get_attachments_excluded_by_condition(self, mock_include):
        """Test attachment excluded when condition returns False."""
        EmailTemplateAttachment.objects.create(
            template=self.template,
            attachment=self.attachment,
            is_required=False,
            order=1,
        )
        result = self.service._get_template_attachments(self.template, {})
        self.assertEqual(result, [])

    @patch('email_system.services.queue_service.EmailTemplateAttachment.objects')
    def test_get_attachments_exception(self, mock_objects):
        """Test returns empty list on exception."""
        mock_objects.filter.side_effect = Exception('DB error')
        result = self.service._get_template_attachments(self.template, {})
        self.assertEqual(result, [])


class ShouldIncludeAttachmentTest(TestCase):
    """Tests for _should_include_attachment."""

    def setUp(self):
        self.service = EmailQueueService()
        self.template = EmailTemplate.objects.create(
            name='eqs_incl_tpl',
            display_name='EQS Include Template',
            subject_template='EQS Include Test',
            content_template_name='eqs_include_content',
            is_active=True,
        )
        self.attachment = EmailAttachment.objects.create(
            name='eqs_incl_attach',
            display_name='EQS Include File.pdf',
            attachment_type='static',
            is_active=True,
        )

    def _make_template_attachment(self, include_condition=None, is_required=False):
        # Delete existing ones to avoid unique constraint
        EmailTemplateAttachment.objects.filter(
            template=self.template,
            attachment=self.attachment,
        ).delete()
        return EmailTemplateAttachment.objects.create(
            template=self.template,
            attachment=self.attachment,
            include_condition=include_condition or {},
            is_required=is_required,
            order=1,
        )

    def test_no_condition_always_include(self):
        """Test that no condition means always include."""
        ta = self._make_template_attachment(include_condition={})
        result = self.service._should_include_attachment(ta, {})
        self.assertTrue(result)

    def test_always_include_condition(self):
        """Test always_include condition type."""
        ta = self._make_template_attachment(
            include_condition={'type': 'always_include'}
        )
        result = self.service._should_include_attachment(ta, {})
        self.assertTrue(result)

    def test_product_type_based_any_match(self):
        """Test product_type_based condition with 'any' logic."""
        ta = self._make_template_attachment(
            include_condition={
                'type': 'product_type_based',
                'product_types': ['tutorial'],
                'logic': 'any',
            }
        )
        context = {'items': [{'product_type': 'tutorial'}]}
        result = self.service._should_include_attachment(ta, context)
        self.assertTrue(result)

    def test_product_type_based_any_no_match(self):
        """Test product_type_based with 'any' logic, no match."""
        ta = self._make_template_attachment(
            include_condition={
                'type': 'product_type_based',
                'product_types': ['tutorial'],
                'logic': 'any',
            }
        )
        context = {'items': [{'product_type': 'material'}]}
        result = self.service._should_include_attachment(ta, context)
        self.assertFalse(result)

    def test_product_type_based_all_match(self):
        """Test product_type_based with 'all' logic."""
        ta = self._make_template_attachment(
            include_condition={
                'type': 'product_type_based',
                'product_types': ['tutorial', 'material'],
                'logic': 'all',
            }
        )
        context = {'items': [
            {'product_type': 'tutorial'},
            {'product_type': 'material'},
        ]}
        result = self.service._should_include_attachment(ta, context)
        self.assertTrue(result)

    def test_product_type_based_all_partial(self):
        """Test product_type_based with 'all' logic, partial match."""
        ta = self._make_template_attachment(
            include_condition={
                'type': 'product_type_based',
                'product_types': ['tutorial', 'material'],
                'logic': 'all',
            }
        )
        context = {'items': [{'product_type': 'tutorial'}]}
        result = self.service._should_include_attachment(ta, context)
        self.assertFalse(result)

    def test_product_type_based_empty_items(self):
        """Test product_type_based with empty items."""
        ta = self._make_template_attachment(
            include_condition={
                'type': 'product_type_based',
                'product_types': ['tutorial'],
                'logic': 'any',
            }
        )
        result = self.service._should_include_attachment(ta, {'items': []})
        self.assertFalse(result)

    def test_product_type_based_no_items(self):
        """Test product_type_based with missing items key."""
        ta = self._make_template_attachment(
            include_condition={
                'type': 'product_type_based',
                'product_types': ['tutorial'],
                'logic': 'any',
            }
        )
        result = self.service._should_include_attachment(ta, {})
        self.assertFalse(result)

    def test_product_type_based_is_tutorial_flag(self):
        """Test product_type_based with is_tutorial flag on items."""
        ta = self._make_template_attachment(
            include_condition={
                'type': 'product_type_based',
                'product_types': ['tutorial'],
                'logic': 'any',
            }
        )
        context = {'items': [{'is_tutorial': True}]}
        result = self.service._should_include_attachment(ta, context)
        self.assertTrue(result)

    def test_product_type_based_is_marking_flag(self):
        """Test product_type_based with is_marking flag on items."""
        ta = self._make_template_attachment(
            include_condition={
                'type': 'product_type_based',
                'product_types': ['marking'],
                'logic': 'any',
            }
        )
        context = {'items': [{'is_marking': True}]}
        result = self.service._should_include_attachment(ta, context)
        self.assertTrue(result)

    def test_product_type_based_default_material(self):
        """Test product_type_based with item that defaults to material."""
        ta = self._make_template_attachment(
            include_condition={
                'type': 'product_type_based',
                'product_types': ['material'],
                'logic': 'any',
            }
        )
        # Item with no product_type, is_tutorial, or is_marking -> defaults to 'material'
        context = {'items': [{'name': 'Some product'}]}
        result = self.service._should_include_attachment(ta, context)
        self.assertTrue(result)

    def test_simple_key_value_condition_match(self):
        """Test backward compatible key-value condition."""
        ta = self._make_template_attachment(
            include_condition={'region': 'EU'}
        )
        context = {'region': 'EU'}
        result = self.service._should_include_attachment(ta, context)
        self.assertTrue(result)

    def test_simple_key_value_condition_no_match(self):
        """Test backward compatible key-value condition no match."""
        ta = self._make_template_attachment(
            include_condition={'region': 'EU'}
        )
        context = {'region': 'US'}
        result = self.service._should_include_attachment(ta, context)
        self.assertFalse(result)

    def test_simple_key_value_condition_missing_key(self):
        """Test backward compatible key-value condition with missing key."""
        ta = self._make_template_attachment(
            include_condition={'region': 'EU'}
        )
        result = self.service._should_include_attachment(ta, {})
        self.assertFalse(result)

    def test_condition_evaluation_exception_required(self):
        """Test exception during condition evaluation with required attachment."""
        ta = self._make_template_attachment(
            include_condition={'type': 'product_type_based', 'product_types': ['tutorial']},
            is_required=True,
        )
        # Pass items as an integer to cause TypeError when iterating
        result = self.service._should_include_attachment(ta, {'items': 12345})
        # When exception occurs with required attachment, return True
        self.assertTrue(result)

    def test_condition_evaluation_exception_optional(self):
        """Test exception during condition evaluation with optional attachment."""
        ta = self._make_template_attachment(
            include_condition={'type': 'product_type_based', 'product_types': ['tutorial']},
            is_required=False,
        )
        # Pass items as an integer to cause TypeError when iterating
        result = self.service._should_include_attachment(ta, {'items': 12345})
        # When exception occurs with optional attachment, return False
        self.assertFalse(result)


class ProcessPendingQueueTest(TestCase):
    """Tests for process_pending_queue."""

    def setUp(self):
        self.service = EmailQueueService()
        self.template = EmailTemplate.objects.create(
            name='eqs_pending_tpl',
            display_name='EQS Pending Template',
            subject_template='EQS Pending Test',
            content_template_name='eqs_pending_content',
            is_active=True,
        )

    @patch.object(EmailQueueService, 'process_queue_item', return_value=True)
    def test_process_pending_success(self, mock_process):
        """Test processing pending items successfully."""
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['eqs_pending1@example.com'],
            from_email='eqs_sender@example.com',
            subject='EQS Pending 1',
            status='pending',
        )
        results = self.service.process_pending_queue(limit=10)
        self.assertEqual(results['processed'], 1)
        self.assertEqual(results['successful'], 1)
        self.assertEqual(results['failed'], 0)

    @patch.object(EmailQueueService, 'process_queue_item', return_value=False)
    def test_process_pending_failure(self, mock_process):
        """Test processing pending items with failure."""
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['eqs_pending2@example.com'],
            from_email='eqs_sender@example.com',
            subject='EQS Pending 2',
            status='pending',
        )
        results = self.service.process_pending_queue(limit=10)
        self.assertEqual(results['processed'], 1)
        self.assertEqual(results['failed'], 1)

    @patch.object(EmailQueueService, 'process_queue_item', side_effect=Exception('Process error'))
    def test_process_pending_exception(self, mock_process):
        """Test processing pending items with exception."""
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['eqs_pending3@example.com'],
            from_email='eqs_sender@example.com',
            subject='EQS Pending 3',
            status='pending',
        )
        results = self.service.process_pending_queue(limit=10)
        self.assertEqual(results['failed'], 1)
        self.assertTrue(len(results['errors']) > 0)

    def test_process_pending_excludes_expired(self):
        """Test that expired items are excluded."""
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['eqs_expired@example.com'],
            from_email='eqs_sender@example.com',
            subject='EQS Expired',
            status='pending',
            expires_at=timezone.now() - timedelta(hours=1),
        )
        with patch.object(EmailQueueService, 'process_queue_item') as mock_process:
            results = self.service.process_pending_queue(limit=10)
            mock_process.assert_not_called()

    def test_process_pending_empty_queue(self):
        """Test processing when queue is empty."""
        results = self.service.process_pending_queue(limit=10)
        self.assertEqual(results['processed'], 0)
        self.assertEqual(results['successful'], 0)
        self.assertEqual(results['failed'], 0)

    @patch.object(EmailQueueService, 'process_queue_item', return_value=True)
    def test_process_pending_respects_limit(self, mock_process):
        """Test that limit parameter is respected."""
        for i in range(5):
            EmailQueue.objects.create(
                template=self.template,
                to_emails=[f'eqs_limit{i}@example.com'],
                from_email='eqs_sender@example.com',
                subject=f'EQS Limit {i}',
                status='pending',
            )
        results = self.service.process_pending_queue(limit=2)
        self.assertEqual(results['processed'], 2)

    @patch.object(EmailQueueService, 'process_queue_item', return_value=True)
    def test_process_pending_includes_retry(self, mock_process):
        """Test that retry items are included."""
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['eqs_retry@example.com'],
            from_email='eqs_sender@example.com',
            subject='EQS Retry',
            status='retry',
        )
        results = self.service.process_pending_queue(limit=10)
        self.assertEqual(results['processed'], 1)


class GetQueueStatsTest(TestCase):
    """Tests for get_queue_stats."""

    def setUp(self):
        self.service = EmailQueueService()
        self.template = EmailTemplate.objects.create(
            name='eqs_stats_tpl',
            display_name='EQS Stats Template',
            subject_template='EQS Stats Test',
            content_template_name='eqs_stats_content',
            is_active=True,
        )

    def test_stats_empty_queue(self):
        """Test stats with empty queue."""
        stats = self.service.get_queue_stats()
        self.assertEqual(stats['total'], 0)
        self.assertEqual(stats['pending'], 0)
        self.assertEqual(stats['sent'], 0)
        self.assertEqual(stats['failed'], 0)
        self.assertEqual(stats['total_logs'], 0)

    def test_stats_with_items(self):
        """Test stats with various queue items."""
        EmailQueue.objects.create(
            to_emails=['eqs_s1@example.com'],
            from_email='eqs_sender@example.com',
            subject='EQS Stats Pending',
            status='pending',
        )
        EmailQueue.objects.create(
            to_emails=['eqs_s2@example.com'],
            from_email='eqs_sender@example.com',
            subject='EQS Stats Sent',
            status='sent',
        )
        EmailQueue.objects.create(
            to_emails=['eqs_s3@example.com'],
            from_email='eqs_sender@example.com',
            subject='EQS Stats Failed',
            status='failed',
        )
        EmailQueue.objects.create(
            to_emails=['eqs_s4@example.com'],
            from_email='eqs_sender@example.com',
            subject='EQS Stats Cancelled',
            status='cancelled',
        )
        EmailQueue.objects.create(
            to_emails=['eqs_s5@example.com'],
            from_email='eqs_sender@example.com',
            subject='EQS Stats Processing',
            status='processing',
        )
        EmailQueue.objects.create(
            to_emails=['eqs_s6@example.com'],
            from_email='eqs_sender@example.com',
            subject='EQS Stats Retry',
            status='retry',
        )

        stats = self.service.get_queue_stats()
        self.assertGreaterEqual(stats['total'], 6)
        self.assertGreaterEqual(stats['pending'], 1)
        self.assertGreaterEqual(stats['sent'], 1)
        self.assertGreaterEqual(stats['failed'], 1)
        self.assertGreaterEqual(stats['cancelled'], 1)
        self.assertGreaterEqual(stats['processing'], 1)
        self.assertGreaterEqual(stats['retry'], 1)

    def test_stats_include_log_stats(self):
        """Test that stats include log statistics."""
        queue_item = EmailQueue.objects.create(
            to_emails=['eqs_log_stat@example.com'],
            from_email='eqs_sender@example.com',
            subject='EQS Log Stat',
            status='sent',
        )
        EmailLog.objects.create(
            queue_item=queue_item,
            to_email='eqs_log_stat@example.com',
            from_email='eqs_sender@example.com',
            subject='EQS Log Stat',
            status='sent',
        )
        EmailLog.objects.create(
            to_email='eqs_log_stat2@example.com',
            from_email='eqs_sender@example.com',
            subject='EQS Log Stat Failed',
            status='failed',
        )

        stats = self.service.get_queue_stats()
        self.assertIn('total_logs', stats)
        self.assertIn('sent_logs', stats)
        self.assertIn('failed_logs', stats)
        self.assertGreaterEqual(stats['total_logs'], 2)
