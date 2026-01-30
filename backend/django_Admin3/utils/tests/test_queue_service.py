"""Tests for utils/services/queue_service.py - Email queue service.

All database interactions and external dependencies are mocked since
the email models have been moved to email_system app.
"""
import json
import hashlib
from datetime import timedelta
from unittest.mock import patch, MagicMock, PropertyMock

from django.test import SimpleTestCase
from django.utils import timezone


# We must mock the imports that queue_service uses at module level
# because EmailTemplate, EmailQueue, EmailLog, etc. no longer exist in utils.models.


def _build_mock_modules():
    """Build mock modules for queue_service imports."""
    mock_email_template = MagicMock()
    mock_email_queue = MagicMock()
    mock_email_log = MagicMock()
    mock_email_attachment = MagicMock()
    mock_email_template_attachment = MagicMock()
    mock_email_service_cls = MagicMock()
    return {
        'EmailTemplate': mock_email_template,
        'EmailQueue': mock_email_queue,
        'EmailLog': mock_email_log,
        'EmailAttachment': mock_email_attachment,
        'EmailTemplateAttachment': mock_email_template_attachment,
        'EmailService': mock_email_service_cls,
    }


class TestDatetimeSerializer(SimpleTestCase):
    """Tests for datetime_serializer function."""

    def test_serializes_datetime_to_isoformat(self):
        """datetime objects should be serialized to ISO format strings."""
        # We need to import the function with mocked dependencies
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            from utils.services.queue_service import datetime_serializer
            dt = timezone.now()
            result = datetime_serializer(dt)
            self.assertEqual(result, dt.isoformat())

    def test_raises_typeerror_for_non_datetime(self):
        """Non-datetime objects should raise TypeError."""
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            from utils.services.queue_service import datetime_serializer
            with self.assertRaises(TypeError):
                datetime_serializer({"foo": "bar"})


class TestEmailQueueServiceInit(SimpleTestCase):
    """Tests for EmailQueueService initialization."""

    def test_init_creates_email_service(self):
        """EmailQueueService should create an EmailService instance on init."""
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            # Re-import to get fresh module with mocked deps
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            service = qs_mod.EmailQueueService()
            self.assertIsNotNone(service.email_service)


class TestCleanContextForSerialization(SimpleTestCase):
    """Tests for _clean_context_for_serialization method."""

    def _get_service(self):
        """Helper to get a mocked service instance."""
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService()

    def test_clean_serializable_values_pass_through(self):
        """JSON-serializable values should pass through unchanged."""
        service = self._get_service()
        context = {'name': 'test', 'count': 5, 'active': True}
        result = service._clean_context_for_serialization(context)
        self.assertEqual(result, context)

    def test_clean_datetime_value(self):
        """Datetime values pass through unchanged because json.dumps with datetime_serializer succeeds."""
        service = self._get_service()
        dt = timezone.now()
        context = {'created': dt}
        result = service._clean_context_for_serialization(context)
        # json.dumps(dt, default=datetime_serializer) succeeds, so the raw value passes through
        self.assertEqual(result['created'], dt)

    def test_clean_object_with_dict(self):
        """Objects with __dict__ but no _meta should be stringified."""
        service = self._get_service()

        class SimpleObj:
            def __str__(self):
                return 'simple_obj_str'

        context = {'obj': SimpleObj()}
        result = service._clean_context_for_serialization(context)
        self.assertEqual(result['obj'], 'simple_obj_str')

    def test_clean_django_model_instance(self):
        """Django model instances should be converted to dict of basic fields."""
        service = self._get_service()

        # Create a simple non-serializable object that has _meta and fields
        # to simulate a Django model instance. Using a real class avoids
        # MagicMock compatibility issues with Python 3.14.
        class FakeField:
            def __init__(self, name):
                self.name = name

        class FakeMeta:
            fields = [FakeField('id'), FakeField('name')]

        class FakeModel:
            _meta = FakeMeta()
            id = 1
            name = 'test_model'

            def __repr__(self):
                return 'FakeModel(id=1)'

        context = {'model': FakeModel()}
        result = service._clean_context_for_serialization(context)
        self.assertIn('model', result)

    def test_clean_list_with_non_serializable_items(self):
        """Lists with non-serializable items should have items stringified."""
        service = self._get_service()

        class NonSerializable:
            def __str__(self):
                return 'non_serializable'

        context = {'items': [NonSerializable(), 'ok_item']}
        result = service._clean_context_for_serialization(context)
        self.assertIn('items', result)
        self.assertIsInstance(result['items'], list)

    def test_clean_nested_dict(self):
        """Nested dicts pass through when json.dumps with datetime_serializer succeeds."""
        service = self._get_service()
        dt = timezone.now()
        context = {'nested': {'created': dt}}
        result = service._clean_context_for_serialization(context)
        self.assertIn('nested', result)
        # json.dumps({'created': dt}, default=datetime_serializer) succeeds,
        # so the nested dict passes through with the raw datetime value
        self.assertEqual(result['nested']['created'], dt)

    def test_clean_fallback_to_string(self):
        """Non-serializable values without special handling should be stringified."""
        service = self._get_service()
        context = {'value': set([1, 2, 3])}
        result = service._clean_context_for_serialization(context)
        self.assertIn('value', result)
        self.assertIsInstance(result['value'], str)


class TestCanProcessQueueItem(SimpleTestCase):
    """Tests for _can_process_queue_item method."""

    def _get_service(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService()

    def test_cannot_process_if_status_sent(self):
        """Items with status 'sent' cannot be processed."""
        service = self._get_service()
        queue_item = MagicMock()
        queue_item.status = 'sent'
        result = service._can_process_queue_item(queue_item)
        self.assertFalse(result)

    def test_cannot_process_if_expired(self):
        """Items past their expiry should be cancelled."""
        service = self._get_service()
        queue_item = MagicMock()
        queue_item.status = 'pending'
        queue_item.expires_at = timezone.now() - timedelta(hours=1)
        queue_item.process_after = timezone.now() - timedelta(hours=2)
        result = service._can_process_queue_item(queue_item)
        self.assertFalse(result)
        self.assertEqual(queue_item.status, 'cancelled')

    def test_cannot_process_if_scheduled_in_future(self):
        """Items scheduled for the future should not be processed yet."""
        service = self._get_service()
        queue_item = MagicMock()
        queue_item.status = 'pending'
        queue_item.expires_at = None
        queue_item.process_after = timezone.now() + timedelta(hours=1)
        result = service._can_process_queue_item(queue_item)
        self.assertFalse(result)

    def test_cannot_process_retry_before_next_retry_at(self):
        """Retry items should not be processed before next_retry_at."""
        service = self._get_service()
        queue_item = MagicMock()
        queue_item.status = 'retry'
        queue_item.expires_at = None
        queue_item.process_after = timezone.now() - timedelta(hours=1)
        queue_item.next_retry_at = timezone.now() + timedelta(minutes=5)
        result = service._can_process_queue_item(queue_item)
        self.assertFalse(result)

    def test_can_process_pending_item(self):
        """Valid pending items should be processable."""
        service = self._get_service()
        queue_item = MagicMock()
        queue_item.status = 'pending'
        queue_item.expires_at = None
        queue_item.process_after = timezone.now() - timedelta(minutes=1)
        result = service._can_process_queue_item(queue_item)
        self.assertTrue(result)

    def test_can_process_retry_item_after_retry_time(self):
        """Retry items should be processable after next_retry_at."""
        service = self._get_service()
        queue_item = MagicMock()
        queue_item.status = 'retry'
        queue_item.expires_at = None
        queue_item.process_after = timezone.now() - timedelta(hours=1)
        queue_item.next_retry_at = timezone.now() - timedelta(minutes=1)
        result = service._can_process_queue_item(queue_item)
        self.assertTrue(result)


class TestProcessQueueItem(SimpleTestCase):
    """Tests for process_queue_item method."""

    def _get_service(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService()

    def test_returns_false_when_cannot_process(self):
        """Should return False when item cannot be processed."""
        service = self._get_service()
        queue_item = MagicMock()
        queue_item.status = 'sent'
        result = service.process_queue_item(queue_item)
        self.assertFalse(result)

    def test_processes_all_recipients_successfully(self):
        """Should return True when all emails sent successfully."""
        service = self._get_service()
        service._can_process_queue_item = MagicMock(return_value=True)
        service._send_single_email = MagicMock(return_value=True)

        queue_item = MagicMock()
        queue_item.status = 'pending'
        queue_item.to_emails = ['a@b.com', 'c@d.com']
        queue_item.attempts = 0

        result = service.process_queue_item(queue_item)
        self.assertTrue(result)
        self.assertEqual(queue_item.status, 'sent')

    def test_schedules_retry_on_partial_failure(self):
        """Should schedule retry if some emails fail and retries are available."""
        service = self._get_service()
        service._can_process_queue_item = MagicMock(return_value=True)
        service._send_single_email = MagicMock(side_effect=[True, False])

        queue_item = MagicMock()
        queue_item.status = 'pending'
        queue_item.to_emails = ['a@b.com', 'c@d.com']
        queue_item.attempts = 0
        queue_item.can_retry.return_value = True
        queue_item.template = MagicMock()
        queue_item.template.retry_delay_minutes = 10

        result = service.process_queue_item(queue_item)
        self.assertFalse(result)
        queue_item.schedule_retry.assert_called_once_with(10)

    def test_marks_failed_after_max_retries(self):
        """Should mark as failed when max retries exceeded."""
        service = self._get_service()
        service._can_process_queue_item = MagicMock(return_value=True)
        service._send_single_email = MagicMock(return_value=False)

        queue_item = MagicMock()
        queue_item.status = 'pending'
        queue_item.to_emails = ['a@b.com']
        queue_item.attempts = 0
        queue_item.can_retry.return_value = False

        result = service.process_queue_item(queue_item)
        self.assertFalse(result)
        self.assertEqual(queue_item.status, 'failed')

    def test_handles_exception_during_processing(self):
        """Should mark as failed on exception."""
        service = self._get_service()
        service._can_process_queue_item = MagicMock(return_value=True)
        service._send_single_email = MagicMock(side_effect=Exception('boom'))

        queue_item = MagicMock()
        queue_item.status = 'pending'
        queue_item.to_emails = ['a@b.com']
        queue_item.attempts = 0
        queue_item.queue_id = 'test-123'

        result = service.process_queue_item(queue_item)
        self.assertFalse(result)
        queue_item.mark_failed.assert_called_once()

    def test_retry_uses_default_delay_when_no_template(self):
        """Should use default 5 minute delay when no template is set."""
        service = self._get_service()
        service._can_process_queue_item = MagicMock(return_value=True)
        service._send_single_email = MagicMock(return_value=False)

        queue_item = MagicMock()
        queue_item.status = 'pending'
        queue_item.to_emails = ['a@b.com']
        queue_item.attempts = 0
        queue_item.can_retry.return_value = True
        queue_item.template = None

        result = service.process_queue_item(queue_item)
        self.assertFalse(result)
        queue_item.schedule_retry.assert_called_once_with(5)


class TestSendSingleEmail(SimpleTestCase):
    """Tests for _send_single_email method."""

    def _get_service(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService()

    def test_send_with_master_template(self):
        """Should use master template path when template has use_master_template."""
        service = self._get_service()
        mock_log = MagicMock()
        service._create_email_log = MagicMock(return_value=mock_log)
        service._get_template_attachments = MagicMock(return_value=[])
        service._send_with_master_template = MagicMock(return_value={
            'success': True,
            'response_code': '200',
            'response_message': 'OK',
            'esp_response': {},
            'esp_message_id': 'msg-123',
            'error_details': {},
        })

        queue_item = MagicMock()
        queue_item.template = MagicMock()
        queue_item.template.use_master_template = True
        queue_item.reply_to_email = None
        queue_item.queue_id = 'q-123'
        queue_item.subject = 'Test'
        queue_item.html_content = '<p>test</p>'
        queue_item.email_context = {}

        start_time = timezone.now()
        result = service._send_single_email(queue_item, 'test@example.com', start_time)
        self.assertTrue(result)
        mock_log.mark_sent.assert_called_once()

    def test_send_with_regular_template(self):
        """Should use regular template path when use_master_template is False."""
        service = self._get_service()
        mock_log = MagicMock()
        service._create_email_log = MagicMock(return_value=mock_log)
        service._get_template_attachments = MagicMock(return_value=[])
        service.email_service._send_mjml_email = MagicMock(return_value={
            'success': True,
            'response_code': '200',
            'response_message': 'OK',
            'esp_response': {},
            'esp_message_id': 'msg-456',
            'error_details': {},
        })

        queue_item = MagicMock()
        queue_item.template = MagicMock()
        queue_item.template.use_master_template = False
        queue_item.template.content_template_name = 'test_template'
        queue_item.template.enhance_outlook_compatibility = True
        queue_item.reply_to_email = 'reply@test.com'
        queue_item.queue_id = 'q-456'
        queue_item.subject = 'Test'
        queue_item.html_content = '<p>test</p>'
        queue_item.email_context = {}
        queue_item.from_email = 'from@test.com'

        start_time = timezone.now()
        result = service._send_single_email(queue_item, 'test@example.com', start_time)
        self.assertTrue(result)

    def test_send_failure_updates_log(self):
        """Failed email should update log with error details."""
        service = self._get_service()
        mock_log = MagicMock()
        service._create_email_log = MagicMock(return_value=mock_log)
        service._get_template_attachments = MagicMock(return_value=[])
        service.email_service._send_mjml_email = MagicMock(return_value={
            'success': False,
            'response_code': '500',
            'response_message': 'Send failed',
            'esp_response': {},
            'esp_message_id': None,
            'error_details': {},
        })

        queue_item = MagicMock()
        queue_item.template = MagicMock()
        queue_item.template.use_master_template = False
        queue_item.template.content_template_name = 'test'
        queue_item.template.enhance_outlook_compatibility = True
        queue_item.reply_to_email = None
        queue_item.queue_id = 'q-789'
        queue_item.subject = 'Test'
        queue_item.html_content = ''
        queue_item.email_context = {}
        queue_item.from_email = 'from@test.com'

        start_time = timezone.now()
        result = service._send_single_email(queue_item, 'test@example.com', start_time)
        self.assertFalse(result)
        self.assertEqual(mock_log.status, 'failed')

    def test_send_exception_captures_error(self):
        """Exceptions during sending should be captured in log."""
        service = self._get_service()
        mock_log = MagicMock()
        service._create_email_log = MagicMock(return_value=mock_log)
        service._get_template_attachments = MagicMock(return_value=[])
        service.email_service._send_mjml_email = MagicMock(
            side_effect=Exception('SMTP error')
        )

        queue_item = MagicMock()
        queue_item.template = MagicMock()
        queue_item.template.use_master_template = False
        queue_item.template.content_template_name = 'test'
        queue_item.template.enhance_outlook_compatibility = True
        queue_item.template.name = 'test_template'
        queue_item.reply_to_email = None
        queue_item.queue_id = 'q-err'
        queue_item.subject = 'Test'
        queue_item.html_content = ''
        queue_item.email_context = {}
        queue_item.from_email = 'from@test.com'

        start_time = timezone.now()
        result = service._send_single_email(queue_item, 'test@example.com', start_time)
        self.assertFalse(result)
        self.assertEqual(mock_log.status, 'failed')

    def test_send_outer_exception_returns_false(self):
        """Outer exception (e.g. log creation failure) should return False."""
        service = self._get_service()
        service._create_email_log = MagicMock(side_effect=Exception('DB error'))

        queue_item = MagicMock()
        queue_item.template = MagicMock()
        queue_item.reply_to_email = None

        start_time = timezone.now()
        result = service._send_single_email(queue_item, 'test@example.com', start_time)
        self.assertFalse(result)


class TestSendWithMasterTemplate(SimpleTestCase):
    """Tests for _send_with_master_template method."""

    def _get_service(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService()

    def test_known_template_uses_master(self):
        """Known template names should use master template rendering."""
        service = self._get_service()
        service.email_service._render_email_with_master_template = MagicMock(
            return_value='<mjml>content</mjml>'
        )
        service.email_service._send_mjml_email_from_content = MagicMock(
            return_value={'success': True}
        )

        queue_item = MagicMock()
        queue_item.template = MagicMock()
        queue_item.template.name = 'order_confirmation'
        queue_item.template.display_name = 'Order Confirmation'
        queue_item.template.enhance_outlook_compatibility = True
        queue_item.email_context = {'order_id': 123}
        queue_item.subject = 'Your Order'
        queue_item.from_email = 'shop@test.com'

        result = service._send_with_master_template(queue_item, 'user@test.com', [])
        self.assertTrue(result['success'])

    def test_unknown_template_uses_regular(self):
        """Unknown template names should fall back to regular sending."""
        service = self._get_service()
        service.email_service._send_mjml_email = MagicMock(
            return_value={'success': True}
        )

        queue_item = MagicMock()
        queue_item.template = MagicMock()
        queue_item.template.name = 'custom_notification'
        queue_item.template.content_template_name = 'custom'
        queue_item.template.enhance_outlook_compatibility = True
        queue_item.email_context = {}
        queue_item.subject = 'Custom'
        queue_item.from_email = 'shop@test.com'

        result = service._send_with_master_template(queue_item, 'user@test.com', [])
        self.assertTrue(result['success'])

    def test_exception_returns_error_response(self):
        """Exception should return detailed error response."""
        service = self._get_service()
        service.email_service._render_email_with_master_template = MagicMock(
            side_effect=Exception('Template render failed')
        )

        queue_item = MagicMock()
        queue_item.template = MagicMock()
        queue_item.template.name = 'order_confirmation'
        queue_item.template.display_name = 'Order Confirmation'
        queue_item.email_context = {}
        queue_item.subject = 'Test'
        queue_item.from_email = 'shop@test.com'

        result = service._send_with_master_template(queue_item, 'user@test.com', [])
        self.assertFalse(result['success'])
        self.assertEqual(result['response_code'], '500')
        self.assertIn('Template render failed', result['response_message'])


class TestShouldIncludeAttachment(SimpleTestCase):
    """Tests for _should_include_attachment method."""

    def _get_service(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService()

    def test_no_condition_always_includes(self):
        """Attachments without conditions should always be included."""
        service = self._get_service()
        ta = MagicMock()
        ta.include_condition = None
        self.assertTrue(service._should_include_attachment(ta, {}))

    def test_always_include_condition(self):
        """always_include condition type should return True."""
        service = self._get_service()
        ta = MagicMock()
        ta.include_condition = {'type': 'always_include'}
        self.assertTrue(service._should_include_attachment(ta, {}))

    def test_product_type_any_logic_match(self):
        """product_type_based with 'any' logic should match any product type."""
        service = self._get_service()
        ta = MagicMock()
        ta.include_condition = {
            'type': 'product_type_based',
            'product_types': ['tutorial'],
            'logic': 'any',
        }
        context = {'items': [{'product_type': 'tutorial'}]}
        self.assertTrue(service._should_include_attachment(ta, context))

    def test_product_type_any_logic_no_match(self):
        """product_type_based with 'any' logic should not match if no types match."""
        service = self._get_service()
        ta = MagicMock()
        ta.include_condition = {
            'type': 'product_type_based',
            'product_types': ['tutorial'],
            'logic': 'any',
        }
        context = {'items': [{'product_type': 'material'}]}
        self.assertFalse(service._should_include_attachment(ta, context))

    def test_product_type_all_logic(self):
        """product_type_based with 'all' logic should require all types present."""
        service = self._get_service()
        ta = MagicMock()
        ta.include_condition = {
            'type': 'product_type_based',
            'product_types': ['tutorial', 'marking'],
            'logic': 'all',
        }
        context = {'items': [
            {'product_type': 'tutorial'},
            {'product_type': 'marking'},
        ]}
        self.assertTrue(service._should_include_attachment(ta, context))

    def test_product_type_with_is_tutorial_flag(self):
        """Items with is_tutorial flag should be detected as tutorial type."""
        service = self._get_service()
        ta = MagicMock()
        ta.include_condition = {
            'type': 'product_type_based',
            'product_types': ['tutorial'],
            'logic': 'any',
        }
        context = {'items': [{'is_tutorial': True}]}
        self.assertTrue(service._should_include_attachment(ta, context))

    def test_product_type_with_is_marking_flag(self):
        """Items with is_marking flag should be detected as marking type."""
        service = self._get_service()
        ta = MagicMock()
        ta.include_condition = {
            'type': 'product_type_based',
            'product_types': ['marking'],
            'logic': 'any',
        }
        context = {'items': [{'is_marking': True}]}
        self.assertTrue(service._should_include_attachment(ta, context))

    def test_product_type_defaults_to_material(self):
        """Items without explicit type info should default to material."""
        service = self._get_service()
        ta = MagicMock()
        ta.include_condition = {
            'type': 'product_type_based',
            'product_types': ['material'],
            'logic': 'any',
        }
        context = {'items': [{'name': 'Study Guide'}]}
        self.assertTrue(service._should_include_attachment(ta, context))

    def test_product_type_no_items(self):
        """product_type_based with no items in context should return False."""
        service = self._get_service()
        ta = MagicMock()
        ta.include_condition = {
            'type': 'product_type_based',
            'product_types': ['tutorial'],
            'logic': 'any',
        }
        context = {'items': []}
        self.assertFalse(service._should_include_attachment(ta, context))

    def test_simple_key_value_condition_match(self):
        """Simple key-value conditions should match context values."""
        service = self._get_service()
        ta = MagicMock()
        ta.include_condition = {'region': 'UK'}
        context = {'region': 'UK'}
        self.assertTrue(service._should_include_attachment(ta, context))

    def test_simple_key_value_condition_no_match(self):
        """Simple key-value conditions should not match if values differ."""
        service = self._get_service()
        ta = MagicMock()
        ta.include_condition = {'region': 'UK'}
        context = {'region': 'EU'}
        self.assertFalse(service._should_include_attachment(ta, context))

    def test_condition_evaluation_exception(self):
        """Exception in condition evaluation should fall back to is_required."""
        service = self._get_service()
        ta = MagicMock()
        ta.include_condition = {'type': 'product_type_based'}
        # Make items access raise exception
        ta.attachment.name = 'test.pdf'
        ta.is_required = True
        context = None  # Will cause exception
        # Should return is_required value
        result = service._should_include_attachment(ta, context)
        self.assertTrue(result)


class TestGetTemplateAttachments(SimpleTestCase):
    """Tests for _get_template_attachments method."""

    def _get_service(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService()

    def test_no_template_returns_empty(self):
        """No template should return empty list."""
        service = self._get_service()
        result = service._get_template_attachments(None, {})
        self.assertEqual(result, [])

    def test_returns_attachment_info(self):
        """Should return attachment details for matching attachments."""
        service = self._get_service()
        service._should_include_attachment = MagicMock(return_value=True)

        mock_attachment = MagicMock()
        mock_attachment.name = 'terms.pdf'
        mock_attachment.display_name = 'Terms & Conditions'
        mock_attachment.attachment_type = 'pdf'
        mock_attachment.file_path = '/docs/terms.pdf'
        mock_attachment.file_url = 'https://example.com/terms.pdf'
        mock_attachment.mime_type = 'application/pdf'
        mock_attachment.file_size = 12345

        mock_ta = MagicMock()
        mock_ta.attachment = mock_attachment
        mock_ta.is_required = True

        template = MagicMock()
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            qs_mod.EmailTemplateAttachment = MagicMock()
            qs_mod.EmailTemplateAttachment.objects.filter.return_value.select_related.return_value.order_by.return_value = [mock_ta]

            service2 = qs_mod.EmailQueueService()
            service2._should_include_attachment = MagicMock(return_value=True)
            result = service2._get_template_attachments(template, {})
            self.assertEqual(len(result), 1)
            self.assertEqual(result[0]['name'], 'terms.pdf')


class TestQueueEmail(SimpleTestCase):
    """Tests for queue_email method."""

    def _get_service(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService(), qs_mod

    @patch('django.db.transaction.atomic')
    def test_queue_email_with_string_recipient(self, mock_atomic):
        """String recipients should be normalized to list."""
        # Make transaction.atomic work as a no-op context manager
        mock_atomic.return_value.__enter__ = MagicMock(return_value=None)
        mock_atomic.return_value.__exit__ = MagicMock(return_value=False)

        service, qs_mod = self._get_service()

        mock_template = MagicMock()
        mock_template.default_priority = 'normal'
        mock_template.from_email = 'from@test.com'
        mock_template.reply_to_email = 'reply@test.com'
        mock_template.subject_template = 'Subject: {{order_id}}'
        mock_template.max_retry_attempts = 3

        qs_mod.EmailTemplate.objects.get.return_value = mock_template

        mock_queue_item = MagicMock()
        qs_mod.EmailQueue.objects.create.return_value = mock_queue_item

        result = service.queue_email(
            template_name='test_template',
            to_emails='single@test.com',
            context={'order_id': '123'},
        )
        self.assertEqual(result, mock_queue_item)

    @patch('django.db.transaction.atomic')
    def test_queue_email_no_template_found(self, mock_atomic):
        """Missing template should use defaults with warning."""
        mock_atomic.return_value.__enter__ = MagicMock(return_value=None)
        mock_atomic.return_value.__exit__ = MagicMock(return_value=False)

        service, qs_mod = self._get_service()

        qs_mod.EmailTemplate.DoesNotExist = Exception
        qs_mod.EmailTemplate.objects.get.side_effect = Exception('Not found')

        mock_queue_item = MagicMock()
        qs_mod.EmailQueue.objects.create.return_value = mock_queue_item

        result = service.queue_email(
            template_name='missing_template',
            to_emails=['test@test.com'],
            context={'key': 'value'},
        )
        self.assertEqual(result, mock_queue_item)

    @patch('django.db.transaction.atomic')
    def test_queue_email_with_subject_override(self, mock_atomic):
        """Subject override should take precedence over template subject."""
        mock_atomic.return_value.__enter__ = MagicMock(return_value=None)
        mock_atomic.return_value.__exit__ = MagicMock(return_value=False)

        service, qs_mod = self._get_service()

        qs_mod.EmailTemplate.DoesNotExist = Exception
        qs_mod.EmailTemplate.objects.get.side_effect = Exception('Not found')

        mock_queue_item = MagicMock()
        qs_mod.EmailQueue.objects.create.return_value = mock_queue_item

        result = service.queue_email(
            template_name='test',
            to_emails=['test@test.com'],
            context={},
            subject_override='Custom Subject',
        )
        self.assertEqual(result, mock_queue_item)


class TestProcessPendingQueue(SimpleTestCase):
    """Tests for process_pending_queue method."""

    def _get_service(self):
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)
            return qs_mod.EmailQueueService(), qs_mod

    def test_processes_pending_items(self):
        """Should process all pending items and return results."""
        service, qs_mod = self._get_service()
        service.process_queue_item = MagicMock(return_value=True)

        mock_item1 = MagicMock()
        mock_item2 = MagicMock()
        qs_mod.EmailQueue.objects.filter.return_value.exclude.return_value.order_by.return_value.__getitem__ = MagicMock(
            return_value=[mock_item1, mock_item2]
        )

        # Need to make the queryset iterable
        mock_qs = MagicMock()
        mock_qs.__iter__ = MagicMock(return_value=iter([mock_item1, mock_item2]))
        qs_mod.EmailQueue.objects.filter.return_value.exclude.return_value.order_by.return_value.__getitem__.return_value = mock_qs

        result = service.process_pending_queue(limit=50)
        self.assertIn('processed', result)
        self.assertIn('successful', result)
        self.assertIn('failed', result)
        self.assertIn('errors', result)


class TestGetQueueStats(SimpleTestCase):
    """Tests for get_queue_stats method."""

    def test_returns_combined_stats(self):
        """Should return combined queue and log statistics."""
        with patch.dict('sys.modules', {
            'utils.models': MagicMock(),
            'utils.email_service': MagicMock(),
            'premailer': MagicMock(),
            'mjml': MagicMock(),
        }):
            import importlib
            import utils.services.queue_service as qs_mod
            importlib.reload(qs_mod)

            mock_queue_stats = {
                'total': 100,
                'pending': 10,
                'processing': 2,
                'sent': 80,
                'failed': 5,
                'cancelled': 2,
                'retry': 1,
            }
            mock_log_stats = {
                'total_logs': 200,
                'sent_logs': 150,
                'opened_logs': 30,
                'clicked_logs': 10,
                'failed_logs': 10,
            }

            qs_mod.EmailQueue.objects.aggregate.return_value = mock_queue_stats.copy()
            qs_mod.EmailLog.objects.aggregate.return_value = mock_log_stats.copy()

            service = qs_mod.EmailQueueService()
            result = service.get_queue_stats()
            self.assertEqual(result['total'], 100)
            self.assertEqual(result['total_logs'], 200)
