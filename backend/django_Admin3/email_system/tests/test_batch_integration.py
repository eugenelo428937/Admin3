"""
Integration tests for the full email batch lifecycle:
  API send -> queue processing simulation -> completion detection -> status query.
"""
import hashlib
import secrets
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from email_system.models import ExternalApiKey, EmailTemplate, EmailBatch, EmailQueue
from email_system.services.batch_service import email_batch_service


class BatchLifecycleIntegrationTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.raw_key = secrets.token_urlsafe(32)
        self.user = User.objects.create_user(
            username='integrationuser', email='integration@example.com',
            first_name='Integration', last_name='Tester',
        )
        self.api_key = ExternalApiKey.objects.create(
            key_hash=hashlib.sha256(self.raw_key.encode()).hexdigest(),
            key_prefix=self.raw_key[:8],
            name='Integration Test System',
            user=self.user,
        )
        self.template = EmailTemplate.objects.create(
            name='integration_template',
            display_name='Integration Test',
            subject_template='Hello {{ firstname }}',
        )

    def test_full_lifecycle(self):
        """Send batch -> simulate processing -> completion detection -> query status."""
        # 1. Send batch via API (no requested_by — derived from user)
        response = self.client.post(
            '/api/email/batch/send/',
            data={
                'template_id': self.template.id,
                'notify_emails': ['notify@example.com'],
                'items': [
                    {'to_email': 'user1@example.com', 'payload': {'firstname': 'Alice'}},
                    {'to_email': 'user2@example.com', 'payload': {'firstname': 'Bob'}},
                ],
            },
            format='json',
            HTTP_X_API_KEY=self.raw_key,
        )
        self.assertEqual(response.status_code, 201)
        batch_id = response.data['batch']['batch_id']

        # 2. Verify batch is processing with 2 queue items
        batch = EmailBatch.objects.get(batch_id=batch_id)
        self.assertEqual(batch.status, 'processing')
        self.assertEqual(batch.queue_items.count(), 2)
        # requested_by derived from authenticated user's ID
        self.assertEqual(batch.requested_by, str(self.user.id))

        # 3. Verify subjects were rendered from payload
        subjects = list(batch.queue_items.values_list('subject', flat=True))
        self.assertIn('Hello Alice', subjects)
        self.assertIn('Hello Bob', subjects)

        # 4. Simulate queue processing: mark items as sent
        for qi in batch.queue_items.all():
            qi.status = 'sent'
            qi.save()

        # 5. Trigger completion detection
        with patch.object(email_batch_service, '_send_completion_notification'):
            email_batch_service.check_batch_completion(batch_id)

        # 6. Verify batch completed
        batch.refresh_from_db()
        self.assertEqual(batch.status, 'completed')
        self.assertEqual(batch.sent_count, 2)
        self.assertEqual(batch.error_count, 0)

        # 7. Query batch status via API
        response = self.client.get(
            f'/api/email/batch/{batch_id}/',
            HTTP_X_API_KEY=self.raw_key,
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['is_success'])
        self.assertEqual(len(response.data['sent_items']), 2)

    def test_partial_failure_lifecycle(self):
        """Send batch -> some fail -> completion with errors -> query shows errors."""
        response = self.client.post(
            '/api/email/batch/send/',
            data={
                'template_id': self.template.id,
                'notify_emails': ['notify@example.com'],
                'items': [
                    {'to_email': 'good@example.com', 'payload': {}},
                    {'to_email': 'bad@example.com', 'payload': {}},
                ],
            },
            format='json',
            HTTP_X_API_KEY=self.raw_key,
        )
        self.assertEqual(response.status_code, 201)
        batch_id = response.data['batch']['batch_id']
        batch = EmailBatch.objects.get(batch_id=batch_id)

        # Mark one sent, one failed (identify by to_emails content)
        for qi in batch.queue_items.all():
            if qi.to_emails == ['bad@example.com']:
                qi.status = 'failed'
                qi.attempts = 3
                qi.error_message = 'SMTP timeout'
                qi.error_details = {'error_code': '500', 'error_message': 'SMTP timeout'}
                qi.save()
            else:
                qi.status = 'sent'
                qi.save()

        with patch.object(email_batch_service, '_send_completion_notification'):
            email_batch_service.check_batch_completion(batch_id)

        batch.refresh_from_db()
        self.assertEqual(batch.status, 'completed_with_errors')

        response = self.client.get(
            f'/api/email/batch/{batch_id}/',
            HTTP_X_API_KEY=self.raw_key,
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['is_success'])
        self.assertEqual(len(response.data['error_items']), 1)
        self.assertEqual(len(response.data['sent_items']), 1)
