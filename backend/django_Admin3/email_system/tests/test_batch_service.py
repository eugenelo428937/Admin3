"""
Tests for EmailBatchService: send_batch, query_batch, and batch completion.
"""
from unittest.mock import patch

from django.test import TestCase
from django.contrib.auth.models import User

from email_system.models import (
    ExternalApiKey,
    EmailBatch,
    EmailQueue,
    EmailTemplate,
)
from email_system.services.batch_service import EmailBatchService, email_batch_service


class EmailBatchServiceGlobalInstanceTest(TestCase):
    """Tests for the module-level email_batch_service instance."""

    def test_global_instance_exists(self):
        self.assertIsNotNone(email_batch_service)
        self.assertIsInstance(email_batch_service, EmailBatchService)


class SendBatchTest(TestCase):
    """Tests for EmailBatchService.send_batch."""

    def setUp(self):
        self.service = EmailBatchService()
        self.template = EmailTemplate.objects.create(
            name='test_batch_tmpl',
            template_type='order_confirmation',
            display_name='Test Batch Template',
            subject_template='Order for {{ product_name }}',
            default_priority='normal',
        )
        self.api_key = ExternalApiKey.objects.create(
            key_hash='a' * 64,
            key_prefix='test1234',
            name='Test Key',
        )

    # --- happy path ---

    def test_creates_batch_and_queue_items(self):
        """send_batch creates an EmailBatch and corresponding EmailQueue entries."""
        items = [
            {'to_email': 'alice@example.com', 'payload': {'product_name': 'Widget'}},
            {'to_email': 'bob@example.com', 'payload': {'product_name': 'Gadget'}},
        ]
        result = self.service.send_batch(
            template_id=self.template.id,
            requested_by='test-system',
            notify_email='admin@example.com',
            items=items,
            api_key=self.api_key,
        )

        # Check return structure
        self.assertIn('batch_id', result)
        self.assertEqual(result['status'], 'processing')
        self.assertEqual(result['total_items'], 2)
        self.assertEqual(len(result['items']), 2)

        # All items succeeded
        for item_result in result['items']:
            self.assertTrue(item_result['is_success'])
            self.assertIsNotNone(item_result['queue_id'])
            self.assertEqual(item_result['error_response'], {})

        # Verify DB objects
        batch = EmailBatch.objects.get(batch_id=result['batch_id'])
        self.assertEqual(batch.total_items, 2)
        self.assertEqual(batch.status, 'processing')
        self.assertEqual(batch.requested_by, 'test-system')
        self.assertEqual(batch.notify_email, 'admin@example.com')
        self.assertEqual(batch.api_key, self.api_key)

        queue_items = EmailQueue.objects.filter(batch=batch)
        self.assertEqual(queue_items.count(), 2)

        # Verify subject was rendered from template
        alice_qi = queue_items.get(to_emails=['alice@example.com'])
        self.assertEqual(alice_qi.subject, 'Order for Widget')
        self.assertEqual(alice_qi.priority, 'normal')
        self.assertEqual(alice_qi.email_context, {'product_name': 'Widget'})

    def test_subject_override_with_template_variables(self):
        """subject_override is rendered with Django template syntax using payload."""
        items = [
            {
                'to_email': 'user@example.com',
                'subject_override': 'Hello {{ first_name }}, your order is ready',
                'payload': {'first_name': 'Jane'},
            },
        ]
        result = self.service.send_batch(
            template_id=self.template.id,
            requested_by='test-system',
            notify_email='admin@example.com',
            items=items,
            api_key=self.api_key,
        )
        self.assertEqual(result['total_items'], 1)

        queue_item = EmailQueue.objects.get(
            queue_id=result['items'][0]['queue_id'],
        )
        self.assertEqual(queue_item.subject, 'Hello Jane, your order is ready')

    def test_cc_email_passed_through(self):
        """cc_email list is stored on the queue item."""
        items = [
            {
                'to_email': 'primary@example.com',
                'cc_email': ['cc1@example.com', 'cc2@example.com'],
                'payload': {},
            },
        ]
        result = self.service.send_batch(
            template_id=self.template.id,
            requested_by='test-system',
            notify_email='admin@example.com',
            items=items,
            api_key=self.api_key,
        )
        queue_item = EmailQueue.objects.get(
            queue_id=result['items'][0]['queue_id'],
        )
        self.assertEqual(queue_item.cc_emails, ['cc1@example.com', 'cc2@example.com'])

    # --- validation errors ---

    def test_invalid_email_returns_failure_item(self):
        """Invalid email addresses get is_success=False; valid items still proceed."""
        items = [
            {'to_email': 'not-an-email', 'payload': {}},
            {'to_email': 'good@example.com', 'payload': {}},
        ]
        result = self.service.send_batch(
            template_id=self.template.id,
            requested_by='test-system',
            notify_email='admin@example.com',
            items=items,
            api_key=self.api_key,
        )

        # One failure, one success
        bad_item = result['items'][0]
        self.assertFalse(bad_item['is_success'])
        self.assertIsNone(bad_item['queue_id'])
        self.assertIn('Invalid email', bad_item['error_response']['error'])

        good_item = result['items'][1]
        self.assertTrue(good_item['is_success'])
        self.assertIsNotNone(good_item['queue_id'])

        # total_items only counts successes
        self.assertEqual(result['total_items'], 1)

        # Only one queue item created
        batch = EmailBatch.objects.get(batch_id=result['batch_id'])
        self.assertEqual(batch.queue_items.count(), 1)

    def test_invalid_template_raises_value_error(self):
        """Referencing a non-existent template_id raises ValueError."""
        with self.assertRaises(ValueError) as ctx:
            self.service.send_batch(
                template_id=99999,
                requested_by='test-system',
                notify_email='admin@example.com',
                items=[{'to_email': 'x@example.com', 'payload': {}}],
                api_key=self.api_key,
            )
        self.assertIn('not found or inactive', str(ctx.exception))

    def test_inactive_template_raises_value_error(self):
        """Referencing an inactive template raises ValueError."""
        self.template.is_active = False
        self.template.save()

        with self.assertRaises(ValueError) as ctx:
            self.service.send_batch(
                template_id=self.template.id,
                requested_by='test-system',
                notify_email='admin@example.com',
                items=[{'to_email': 'x@example.com', 'payload': {}}],
                api_key=self.api_key,
            )
        self.assertIn('not found or inactive', str(ctx.exception))

    def test_exceeding_max_items_raises_value_error(self):
        """Exceeding max_items limit raises ValueError."""
        items = [{'to_email': f'user{i}@example.com', 'payload': {}} for i in range(6)]
        with self.assertRaises(ValueError) as ctx:
            self.service.send_batch(
                template_id=self.template.id,
                requested_by='test-system',
                notify_email='admin@example.com',
                items=items,
                api_key=self.api_key,
                max_items=5,
            )
        self.assertIn('exceeds maximum', str(ctx.exception))


class QueryBatchTest(TestCase):
    """Tests for EmailBatchService.query_batch."""

    def setUp(self):
        self.service = EmailBatchService()
        self.template = EmailTemplate.objects.create(
            name='query_batch_tmpl',
            template_type='order_confirmation',
            display_name='Query Batch Template',
            subject_template='Subject',
            default_priority='normal',
        )
        self.api_key = ExternalApiKey.objects.create(
            key_hash='b' * 64,
            key_prefix='qry12345',
            name='Query Key',
        )
        self.other_api_key = ExternalApiKey.objects.create(
            key_hash='c' * 64,
            key_prefix='other123',
            name='Other Key',
        )
        self.batch = EmailBatch.objects.create(
            template=self.template,
            requested_by='test-system',
            notify_email='admin@example.com',
            api_key=self.api_key,
            total_items=3,
            sent_count=2,
            error_count=1,
            status='completed_with_errors',
        )

    def test_returns_correct_sent_and_error_items(self):
        """query_batch returns sent_items and error_items from queue entries."""
        # Create sent items
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['sent1@example.com'],
            subject='Sent 1',
            batch=self.batch,
            status='sent',
        )
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['sent2@example.com'],
            subject='Sent 2',
            batch=self.batch,
            status='sent',
        )
        # Create failed item
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['fail@example.com'],
            cc_emails=['cc@example.com'],
            subject='Failed',
            batch=self.batch,
            status='failed',
            attempts=3,
            error_message='SMTP timeout',
            error_details={'code': 'TIMEOUT'},
        )

        result = self.service.query_batch(
            batch_id=self.batch.batch_id,
            api_key=self.api_key,
        )

        self.assertIsNotNone(result)
        self.assertEqual(result['batch_id'], str(self.batch.batch_id))
        self.assertEqual(result['status'], 'completed_with_errors')
        self.assertFalse(result['is_success'])
        self.assertEqual(result['total_items'], 3)
        self.assertEqual(result['sent_count'], 2)
        self.assertEqual(result['error_count'], 1)

        # Sent items
        self.assertEqual(len(result['sent_items']), 2)
        self.assertIn('sent1@example.com', result['sent_items'])
        self.assertIn('sent2@example.com', result['sent_items'])

        # Error items
        self.assertEqual(len(result['error_items']), 1)
        err = result['error_items'][0]
        self.assertEqual(err['to_email'], 'fail@example.com')
        self.assertEqual(err['cc_email'], ['cc@example.com'])
        self.assertEqual(err['attempts'], 3)
        self.assertEqual(err['error_response'], {'code': 'TIMEOUT'})

    def test_completed_batch_is_success_true(self):
        """A completed batch returns is_success=True."""
        self.batch.status = 'completed'
        self.batch.save()

        result = self.service.query_batch(
            batch_id=self.batch.batch_id,
            api_key=self.api_key,
        )
        self.assertTrue(result['is_success'])

    def test_returns_none_for_nonexistent_batch(self):
        """query_batch returns None for a batch_id that does not exist."""
        import uuid
        result = self.service.query_batch(
            batch_id=uuid.uuid4(),
            api_key=self.api_key,
        )
        self.assertIsNone(result)

    def test_returns_none_for_different_api_key(self):
        """query_batch returns None when api_key does not match the batch owner."""
        result = self.service.query_batch(
            batch_id=self.batch.batch_id,
            api_key=self.other_api_key,
        )
        self.assertIsNone(result)


class BatchCompletionTest(TestCase):
    """Tests for EmailBatchService.check_batch_completion."""

    def setUp(self):
        self.service = EmailBatchService()
        self.template = EmailTemplate.objects.create(
            name='completion_test_template',
            display_name='Completion Test',
            subject_template='Test',
        )
        self.api_key = ExternalApiKey.objects.create(
            key_hash='f' * 64,
            key_prefix='comp1234',
            name='Test System',
        )

    def _create_batch_with_items(self, statuses):
        batch = EmailBatch.objects.create(
            template=self.template,
            requested_by='Test User',
            notify_email='admin@example.com',
            total_items=len(statuses),
            api_key=self.api_key,
            status='processing',
        )
        for i, status in enumerate(statuses):
            EmailQueue.objects.create(
                to_emails=[f'user{i}@example.com'],
                subject='Test',
                template=self.template,
                batch=batch,
                status=status,
            )
        return batch

    @patch.object(EmailBatchService, '_send_completion_notification')
    def test_all_sent_completes_batch(self, mock_notify):
        batch = self._create_batch_with_items(['sent', 'sent'])
        self.service.check_batch_completion(batch.batch_id)
        batch.refresh_from_db()
        self.assertEqual(batch.status, 'completed')
        self.assertEqual(batch.sent_count, 2)
        self.assertEqual(batch.error_count, 0)
        self.assertIsNotNone(batch.completed_at)
        mock_notify.assert_called_once()

    @patch.object(EmailBatchService, '_send_completion_notification')
    def test_mixed_results_completed_with_errors(self, mock_notify):
        batch = self._create_batch_with_items(['sent', 'failed'])
        self.service.check_batch_completion(batch.batch_id)
        batch.refresh_from_db()
        self.assertEqual(batch.status, 'completed_with_errors')
        self.assertEqual(batch.sent_count, 1)
        self.assertEqual(batch.error_count, 1)

    @patch.object(EmailBatchService, '_send_completion_notification')
    def test_all_failed_sets_failed(self, mock_notify):
        batch = self._create_batch_with_items(['failed', 'cancelled'])
        self.service.check_batch_completion(batch.batch_id)
        batch.refresh_from_db()
        self.assertEqual(batch.status, 'failed')

    def test_not_all_terminal_does_not_complete(self):
        batch = self._create_batch_with_items(['sent', 'pending'])
        self.service.check_batch_completion(batch.batch_id)
        batch.refresh_from_db()
        self.assertEqual(batch.status, 'processing')

    @patch.object(EmailBatchService, '_send_completion_notification')
    def test_already_completed_is_noop(self, mock_notify):
        batch = self._create_batch_with_items(['sent', 'sent'])
        batch.status = 'completed'
        batch.save()
        self.service.check_batch_completion(batch.batch_id)
        mock_notify.assert_not_called()
