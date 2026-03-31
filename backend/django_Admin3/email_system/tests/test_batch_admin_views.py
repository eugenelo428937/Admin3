from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from email_system.models import ExternalApiKey, EmailBatch, EmailTemplate, EmailQueue


class EmailBatchAdminSerializerTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin', 'admin@test.com', 'pass')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

        self.api_key = ExternalApiKey.objects.create(
            key_hash='test_hash_001',
            key_prefix='test0001',
            name='Test System',
        )
        self.template = EmailTemplate.objects.create(
            name='test_template',
            display_name='Test Template',
            subject_template='Test Subject {{name}}',
        )
        self.batch = EmailBatch.objects.create(
            template=self.template,
            requested_by='admin@acted.co.uk',
            notify_emails=['admin@acted.co.uk'],
            status='completed',
            total_items=3,
            sent_count=3,
            error_count=0,
            api_key=self.api_key,
        )
        self.queue_item = EmailQueue.objects.create(
            template=self.template,
            batch=self.batch,
            to_emails=['user1@example.com'],
            subject='Test Subject User1',
            status='sent',
        )

    def test_batch_list_returns_template_name(self):
        response = self.client.get('/api/email/batches/')
        self.assertEqual(response.status_code, 200)
        batch_data = response.data['results'][0]
        self.assertEqual(batch_data['template_name'], 'Test Template')

    def test_batch_list_fields(self):
        response = self.client.get('/api/email/batches/')
        batch_data = response.data['results'][0]
        expected_fields = {
            'batch_id', 'template', 'template_name', 'requested_by',
            'status', 'total_items', 'sent_count', 'error_count',
            'created_at', 'completed_at',
        }
        self.assertEqual(set(batch_data.keys()), expected_fields)

    def test_batch_emails_fields(self):
        response = self.client.get(f'/api/email/batches/{self.batch.batch_id}/emails/')
        self.assertEqual(response.status_code, 200)
        email_data = response.data['results'][0]
        expected_fields = {
            'id', 'queue_id', 'to_emails', 'subject',
            'status', 'sent_at', 'error_message',
        }
        self.assertEqual(set(email_data.keys()), expected_fields)


class EmailBatchAdminViewSetTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin', 'admin@test.com', 'pass')
        self.regular_user = User.objects.create_user('regular', 'regular@test.com', 'pass')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

        self.api_key = ExternalApiKey.objects.create(
            key_hash='test_hash_002',
            key_prefix='test0002',
            name='Test System 2',
        )
        self.template = EmailTemplate.objects.create(
            name='viewset_template',
            display_name='ViewSet Template',
            subject_template='Subject',
        )
        self.batch_completed = EmailBatch.objects.create(
            template=self.template,
            requested_by='admin@acted.co.uk',
            notify_emails=['admin@acted.co.uk'],
            status='completed',
            total_items=2,
            sent_count=2,
            error_count=0,
            api_key=self.api_key,
        )
        self.batch_failed = EmailBatch.objects.create(
            template=self.template,
            requested_by='system',
            notify_emails=['admin@acted.co.uk'],
            status='failed',
            total_items=1,
            sent_count=0,
            error_count=1,
            api_key=self.api_key,
        )
        EmailQueue.objects.create(
            template=self.template,
            batch=self.batch_completed,
            to_emails=['alice@example.com'],
            subject='Hello Alice',
            status='sent',
        )
        EmailQueue.objects.create(
            template=self.template,
            batch=self.batch_completed,
            to_emails=['bob@example.com'],
            subject='Hello Bob',
            status='sent',
        )

    def test_list_returns_all_batches(self):
        response = self.client.get('/api/email/batches/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 2)

    def test_list_filter_by_status(self):
        response = self.client.get('/api/email/batches/', {'status': 'failed'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['status'], 'failed')

    def test_list_limit_param(self):
        response = self.client.get('/api/email/batches/', {'limit': 1})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)

    def test_retrieve_batch(self):
        response = self.client.get(f'/api/email/batches/{self.batch_completed.batch_id}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'completed')

    def test_emails_endpoint(self):
        response = self.client.get(f'/api/email/batches/{self.batch_completed.batch_id}/emails/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 2)

    def test_emails_filter_by_to(self):
        response = self.client.get(
            f'/api/email/batches/{self.batch_completed.batch_id}/emails/',
            {'to_email': 'alice'},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertIn('alice@example.com', response.data['results'][0]['to_emails'])

    def test_non_superuser_denied(self):
        client = APIClient()
        client.force_authenticate(user=self.regular_user)
        response = client.get('/api/email/batches/')
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_denied(self):
        client = APIClient()
        response = client.get('/api/email/batches/')
        self.assertEqual(response.status_code, 401)


class EmailQueueToFilterTest(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser('admin3', 'admin3@test.com', 'pass')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

        self.template = EmailTemplate.objects.create(
            name='queue_filter_template',
            display_name='Queue Filter',
            subject_template='Subject',
        )
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['alice@example.com'],
            subject='Hello Alice',
            status='sent',
        )
        EmailQueue.objects.create(
            template=self.template,
            to_emails=['bob@example.com'],
            subject='Hello Bob',
            status='sent',
        )

    def test_queue_filter_by_to_email(self):
        response = self.client.get('/api/email/queue/', {'to_email': 'alice'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)

    def test_queue_no_filter_returns_all(self):
        response = self.client.get('/api/email/queue/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 2)
