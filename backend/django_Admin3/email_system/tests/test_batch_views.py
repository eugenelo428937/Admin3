import hashlib
import secrets
from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from email_system.models import ExternalApiKey, EmailTemplate, EmailBatch, EmailQueue


class SendBatchViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.raw_key = secrets.token_urlsafe(32)
        self.user = User.objects.create_user(
            username='batchuser', email='batchuser@example.com',
            first_name='Batch', last_name='User',
        )
        self.api_key = ExternalApiKey.objects.create(
            key_hash=hashlib.sha256(self.raw_key.encode()).hexdigest(),
            key_prefix=self.raw_key[:8],
            name='Test System',
            user=self.user,
        )
        self.template = EmailTemplate.objects.create(
            name='view_test_template',
            display_name='View Test',
            subject_template='Test Subject',
        )

    def test_send_batch_success(self):
        response = self.client.post(
            '/api/email/batch/send/',
            data={
                'template_id': self.template.id,
                'notify_emails': ['admin@example.com'],
                'items': [
                    {'to_email': 'user@example.com', 'payload': {'name': 'Test'}},
                ],
            },
            format='json',
            HTTP_X_API_KEY=self.raw_key,
        )
        self.assertEqual(response.status_code, 201)
        self.assertIn('batch', response.data)
        self.assertIn('batch_id', response.data['batch'])

    def test_send_batch_derives_requested_by_from_user(self):
        """requested_by is auto-populated from the authenticated user."""
        response = self.client.post(
            '/api/email/batch/send/',
            data={
                'template_id': self.template.id,
                'items': [{'to_email': 'user@example.com', 'payload': {}}],
            },
            format='json',
            HTTP_X_API_KEY=self.raw_key,
        )
        self.assertEqual(response.status_code, 201)
        batch = EmailBatch.objects.get(batch_id=response.data['batch']['batch_id'])
        self.assertEqual(batch.requested_by, 'Batch User')

    def test_send_batch_falls_back_to_api_key_name(self):
        """requested_by falls back to api_key.name when no user linked."""
        self.api_key.user = None
        self.api_key.save()
        response = self.client.post(
            '/api/email/batch/send/',
            data={
                'template_id': self.template.id,
                'items': [{'to_email': 'user@example.com', 'payload': {}}],
            },
            format='json',
            HTTP_X_API_KEY=self.raw_key,
        )
        self.assertEqual(response.status_code, 201)
        batch = EmailBatch.objects.get(batch_id=response.data['batch']['batch_id'])
        self.assertEqual(batch.requested_by, 'Test System')

    def test_send_batch_no_auth(self):
        response = self.client.post(
            '/api/email/batch/send/',
            data={'template_id': 1, 'items': []},
            format='json',
        )
        self.assertIn(response.status_code, [401, 403])

    def test_send_batch_invalid_template(self):
        response = self.client.post(
            '/api/email/batch/send/',
            data={
                'template_id': 99999,
                'notify_emails': ['a@b.com'],
                'items': [{'to_email': 'u@b.com', 'payload': {}}],
            },
            format='json',
            HTTP_X_API_KEY=self.raw_key,
        )
        self.assertEqual(response.status_code, 400)


class QueryBatchViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.raw_key = secrets.token_urlsafe(32)
        self.user = User.objects.create_user(
            username='queryuser', email='queryuser@example.com',
        )
        self.api_key = ExternalApiKey.objects.create(
            key_hash=hashlib.sha256(self.raw_key.encode()).hexdigest(),
            key_prefix=self.raw_key[:8],
            name='Test System',
            user=self.user,
        )
        self.template = EmailTemplate.objects.create(
            name='query_view_template',
            display_name='Query View Test',
            subject_template='Test',
        )
        self.batch = EmailBatch.objects.create(
            template=self.template,
            requested_by='Test User',
            notify_emails=['admin@example.com'],
            total_items=1,
            api_key=self.api_key,
            status='completed',
            sent_count=1,
        )
        EmailQueue.objects.create(
            to_emails=['sent@example.com'],
            subject='Test',
            template=self.template,
            batch=self.batch,
            status='sent',
        )

    def test_query_batch_success(self):
        response = self.client.get(
            f'/api/email/batch/{self.batch.batch_id}/',
            HTTP_X_API_KEY=self.raw_key,
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['batch_id'], str(self.batch.batch_id))

    def test_query_batch_not_found(self):
        response = self.client.get(
            '/api/email/batch/00000000-0000-0000-0000-000000000000/',
            HTTP_X_API_KEY=self.raw_key,
        )
        self.assertEqual(response.status_code, 404)

    def test_query_batch_no_auth(self):
        response = self.client.get(f'/api/email/batch/{self.batch.batch_id}/')
        self.assertIn(response.status_code, [401, 403])
