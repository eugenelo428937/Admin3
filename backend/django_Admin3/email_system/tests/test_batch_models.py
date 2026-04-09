"""
Tests for email batch models: ExternalApiKey, EmailBatch, and EmailQueue batch FK.
"""
from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone

from email_system.models import (
    ExternalApiKey,
    EmailBatch,
    EmailQueue,
    EmailTemplate,
)
from email_system.tests.factories import make_template


class ExternalApiKeyModelTest(TestCase):
    """Tests for ExternalApiKey model."""

    def test_create_api_key(self):
        """Test creating an ExternalApiKey with required fields."""
        api_key = ExternalApiKey.objects.create(
            key_hash='a' * 64,
            key_prefix='abcd1234',
            name='Test Integration Key',
        )
        self.assertEqual(api_key.name, 'Test Integration Key')
        self.assertEqual(api_key.key_hash, 'a' * 64)
        self.assertEqual(api_key.key_prefix, 'abcd1234')
        self.assertTrue(api_key.is_active)
        self.assertIsNotNone(api_key.created_at)
        self.assertIsNone(api_key.last_used_at)
        self.assertIsNone(api_key.user)

    def test_create_api_key_with_user(self):
        """Test creating an ExternalApiKey linked to a user."""
        user = User.objects.create_user(username='apiuser', email='apiuser@example.com')
        api_key = ExternalApiKey.objects.create(
            key_hash='u' * 64,
            key_prefix='user1234',
            name='User API Key',
            user=user,
        )
        self.assertEqual(api_key.user, user)
        self.assertEqual(user.api_keys.count(), 1)

    def test_user_set_null_on_delete(self):
        """Test that deleting a user sets api_key.user to null."""
        user = User.objects.create_user(username='deluser', email='del@example.com')
        api_key = ExternalApiKey.objects.create(
            key_hash='v' * 64,
            key_prefix='del12345',
            name='Del User Key',
            user=user,
        )
        user.delete()
        api_key.refresh_from_db()
        self.assertIsNone(api_key.user)

    def test_str_representation(self):
        """Test __str__ returns name and prefix."""
        api_key = ExternalApiKey.objects.create(
            key_hash='b' * 64,
            key_prefix='xyzw9876',
            name='My API Key',
        )
        self.assertEqual(str(api_key), 'My API Key (xyzw9876...)')

    def test_inactive_api_key(self):
        """Test creating an inactive API key."""
        api_key = ExternalApiKey.objects.create(
            key_hash='c' * 64,
            key_prefix='inact123',
            name='Inactive Key',
            is_active=False,
        )
        self.assertFalse(api_key.is_active)

    def test_key_hash_unique(self):
        """Test that key_hash must be unique."""
        ExternalApiKey.objects.create(
            key_hash='d' * 64,
            key_prefix='first123',
            name='First Key',
        )
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            ExternalApiKey.objects.create(
                key_hash='d' * 64,
                key_prefix='second12',
                name='Second Key',
            )

    def test_db_table_name(self):
        """Test that the model uses the correct table name."""
        self.assertEqual(ExternalApiKey._meta.db_table, 'utils_external_api_key')


class EmailBatchModelTest(TestCase):
    """Tests for EmailBatch model."""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.template = make_template(
            name='batch_template',
            template_type='ORDER',
            display_name='Batch Template',
            subject_template='Batch subject',
        )
        self.api_key = ExternalApiKey.objects.create(
            key_hash='e' * 64,
            key_prefix='batch123',
            name='Batch API Key',
        )

    def test_create_batch_with_defaults(self):
        """Test creating an EmailBatch with default values."""
        batch = EmailBatch.objects.create(
            template=self.template,
            requested_by='external-system',
            notify_emails=['admin@example.com'],
            api_key=self.api_key,
        )
        self.assertIsNotNone(batch.batch_id)
        self.assertEqual(batch.status, 'pending')
        self.assertEqual(batch.total_items, 0)
        self.assertEqual(batch.sent_count, 0)
        self.assertEqual(batch.error_count, 0)
        self.assertIsNotNone(batch.created_at)
        self.assertIsNone(batch.completed_at)
        self.assertEqual(batch.notify_emails, ['admin@example.com'])

    def test_notify_emails_stores_list(self):
        """Test that notify_emails stores a list of emails."""
        batch = EmailBatch.objects.create(
            template=self.template,
            requested_by='system',
            notify_emails=['a@b.com', 'c@d.com'],
            api_key=self.api_key,
        )
        batch.refresh_from_db()
        self.assertEqual(batch.notify_emails, ['a@b.com', 'c@d.com'])

    def test_notify_emails_defaults_to_empty_list(self):
        """Test that notify_emails defaults to empty list."""
        batch = EmailBatch.objects.create(
            template=self.template,
            requested_by='system',
            api_key=self.api_key,
        )
        self.assertEqual(batch.notify_emails, [])

    def test_status_choices(self):
        """Test all valid batch status choices."""
        valid_statuses = [c[0] for c in EmailBatch.BATCH_STATUS_CHOICES]
        self.assertIn('pending', valid_statuses)
        self.assertIn('processing', valid_statuses)
        self.assertIn('completed', valid_statuses)
        self.assertIn('completed_with_errors', valid_statuses)
        self.assertIn('failed', valid_statuses)

    def test_str_representation(self):
        """Test __str__ includes batch_id, status, and total_items."""
        batch = EmailBatch.objects.create(
            template=self.template,
            requested_by='external-system',
            notify_emails=[],
            api_key=self.api_key,
            total_items=50,
        )
        expected = f'Batch {batch.batch_id} (pending) - 50 items'
        self.assertEqual(str(batch), expected)

    def test_ordering(self):
        """Test that batches are ordered by -created_at."""
        self.assertEqual(EmailBatch._meta.ordering, ['-created_at'])

    def test_db_table_name(self):
        """Test that the model uses the correct table name."""
        self.assertEqual(EmailBatch._meta.db_table, 'utils_email_batch')

    def test_template_protect_on_delete(self):
        """Test that deleting a template with batches raises ProtectedError."""
        EmailBatch.objects.create(
            template=self.template,
            requested_by='external-system',
            notify_emails=[],
            api_key=self.api_key,
        )
        from django.db.models import ProtectedError
        with self.assertRaises(ProtectedError):
            self.template.delete()

    def test_api_key_protect_on_delete(self):
        """Test that deleting an api_key with batches raises ProtectedError."""
        EmailBatch.objects.create(
            template=self.template,
            requested_by='external-system',
            notify_emails=[],
            api_key=self.api_key,
        )
        from django.db.models import ProtectedError
        with self.assertRaises(ProtectedError):
            self.api_key.delete()


class EmailQueueBatchFKTest(TestCase):
    """Tests for the batch FK on EmailQueue."""

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.template = make_template(
            name='queue_template',
            template_type='ORDER',
            display_name='Queue Template',
            subject_template='Queue subject',
        )
        self.api_key = ExternalApiKey.objects.create(
            key_hash='f' * 64,
            key_prefix='queue123',
            name='Queue API Key',
        )
        self.batch = EmailBatch.objects.create(
            template=self.template,
            requested_by='external-system',
            notify_emails=[],
            api_key=self.api_key,
            total_items=10,
        )

    def test_queue_item_with_batch(self):
        """Test creating a queue item linked to a batch."""
        queue_item = EmailQueue.objects.create(
            template=self.template,
            to_emails=['test@example.com'],
            subject='Test email',
            batch=self.batch,
        )
        self.assertEqual(queue_item.batch, self.batch)
        self.assertEqual(queue_item.batch.batch_id, self.batch.batch_id)

    def test_queue_item_without_batch(self):
        """Test creating a queue item without a batch (null FK)."""
        queue_item = EmailQueue.objects.create(
            template=self.template,
            to_emails=['test@example.com'],
            subject='Test email',
        )
        self.assertIsNone(queue_item.batch)

    def test_batch_related_name(self):
        """Test accessing queue items from a batch via related_name."""
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['user1@example.com'],
            subject='Email 1',
            batch=self.batch,
        )
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['user2@example.com'],
            subject='Email 2',
            batch=self.batch,
        )
        self.assertEqual(self.batch.queue_items.count(), 2)

    def test_batch_set_null_on_delete(self):
        """Test that deleting a batch sets queue item FK to null."""
        queue_item = EmailQueue.objects.create(
            template=self.template,
            to_emails=['test@example.com'],
            subject='Test email',
            batch=self.batch,
        )
        batch_id = self.batch.batch_id
        self.batch.delete()
        queue_item.refresh_from_db()
        self.assertIsNone(queue_item.batch)


class EmailTemplateTypeTest(TestCase):
    """Tests for batch_completion_report template type."""

    def test_batch_completion_report_in_template_types(self):
        """Test that batch_completion_report is a valid template type."""
        valid_types = [c[0] for c in EmailTemplate.TEMPLATE_TYPES]
        self.assertIn('batch_completion_report', valid_types)

    def test_create_template_with_batch_completion_report_type(self):
        """Test creating a template with batch_completion_report type."""
        template = make_template(
            name='batch_report',
            template_type='batch_completion_report',
            display_name='Batch Completion Report',
            subject_template='Batch {{ batch_id }} completed',
        )
        self.assertEqual(template.template_type, 'batch_completion_report')
