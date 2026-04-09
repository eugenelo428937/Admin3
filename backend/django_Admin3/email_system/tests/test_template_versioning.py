"""Tests for EmailTemplate versioning behaviour.

Covers the invariants that the versioning refactor introduced:
  1. create_version() snapshots the given content onto a new version.
  2. make_template creates a template plus an initial version in one call.
  3. EmailBatchService pins the current version on every queue item.
  4. EmailQueueService.queue_email pins the current version.
  5. process_queue_item renders from the pinned version even after the
     template content has been edited.
  6. The /templates/{id}/versions/ endpoint returns history newest-first.
"""
from unittest.mock import patch

from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status as http_status

from email_system.models import (
    ClosingSalutation, EmailTemplate, EmailTemplateVersion,
    EmailQueue, ExternalApiKey,
)
from email_system.services.queue_service import EmailQueueService
from email_system.services.batch_service import EmailBatchService
from email_system.tests.factories import make_template, update_template_content


class TemplateCreateVersionTest(TestCase):
    """Unit tests for EmailTemplate.create_version()."""

    def setUp(self):
        self.template = EmailTemplate.objects.create(
            name='t_cv', display_name='T', template_type='order_confirmation',
        )

    def test_creates_version_with_explicit_content(self):
        v = self.template.create_version(
            subject_template='Hello',
            mjml_content='<mjml>one</mjml>',
            basic_mode_content='one',
            change_note='first',
        )
        self.assertEqual(v.version_number, 1)
        self.assertEqual(v.subject_template, 'Hello')
        self.assertEqual(v.mjml_content, '<mjml>one</mjml>')
        self.assertEqual(v.change_note, 'first')

    def test_version_number_increments(self):
        self.template.create_version(mjml_content='a')
        self.template.create_version(mjml_content='b')
        self.template.create_version(mjml_content='c')
        numbers = list(
            self.template.versions.order_by('version_number').values_list('version_number', flat=True)
        )
        self.assertEqual(numbers, [1, 2, 3])
        self.assertEqual(self.template.current_version.mjml_content, 'c')

    def test_closing_salutation_snapshots_denormalised_fields(self):
        sal = ClosingSalutation.objects.create(
            name='warm', display_name='Jane Doe',
            sign_off_text='Warm regards,', job_title='Tutor',
        )
        v = self.template.create_version(
            subject_template='S', mjml_content='X', closing_salutation=sal,
        )
        self.assertEqual(v.closing_sign_off, 'Warm regards,')
        self.assertEqual(v.closing_display_name, 'Jane Doe')
        self.assertEqual(v.closing_job_title, 'Tutor')


class MakeTemplateFactoryTest(TestCase):
    """Tests for the ``make_template`` test factory."""

    def test_make_template_creates_initial_version(self):
        t = make_template(
            name='mt1', display_name='MT1', template_type='order_confirmation',
            subject_template='Hi', mjml_content='<mjml>hi</mjml>',
            basic_mode_content='hi',
        )
        self.assertEqual(t.versions.count(), 1)
        v = t.current_version
        self.assertEqual(v.subject_template, 'Hi')
        self.assertEqual(v.mjml_content, '<mjml>hi</mjml>')
        self.assertEqual(v.basic_mode_content, 'hi')

    def test_make_template_forwards_config_kwargs(self):
        t = make_template(
            name='mt2', display_name='MT2', template_type='order_confirmation',
            from_email='from@example.com', reply_to_email='reply@example.com',
            default_priority='high', enable_tracking=False,
        )
        self.assertEqual(t.from_email, 'from@example.com')
        self.assertEqual(t.reply_to_email, 'reply@example.com')
        self.assertEqual(t.default_priority, 'high')
        self.assertFalse(t.enable_tracking)


class UpdateTemplateContentHelperTest(TestCase):
    """Tests for ``update_template_content`` — creates a new version and
    inherits unchanged fields from the prior version."""

    def test_new_version_inherits_unchanged_fields(self):
        t = make_template(
            name='up1', display_name='Up1', template_type='order_confirmation',
            subject_template='Subject', mjml_content='BODY',
        )
        self.assertEqual(t.versions.count(), 1)

        update_template_content(t, subject_template='New Subject')
        self.assertEqual(t.versions.count(), 2)
        latest = t.current_version
        self.assertEqual(latest.subject_template, 'New Subject')
        self.assertEqual(latest.mjml_content, 'BODY')  # inherited

    def test_create_version_directly_does_not_inherit(self):
        """create_version on the model is explicit — missing kwargs become ''."""
        t = make_template(
            name='up2', display_name='Up2', template_type='order_confirmation',
            subject_template='Keep Me', mjml_content='BODY',
        )
        t.create_version(mjml_content='NEW BODY')  # subject omitted
        latest = t.current_version
        self.assertEqual(latest.mjml_content, 'NEW BODY')
        self.assertEqual(latest.subject_template, '')


class QueueServicePinsVersionTest(TestCase):
    """EmailQueueService.queue_email snapshots the current version onto the queue item."""

    def setUp(self):
        self.service = EmailQueueService()
        self.template = make_template(
            name='qs_pin', display_name='QSP', template_type='order_confirmation',
            subject_template='S', mjml_content='V1',
        )

    def test_queue_email_pins_current_version(self):
        q = self.service.queue_email(
            template_name='qs_pin',
            to_emails='a@example.com',
            context={},
        )
        v1 = self.template.current_version
        self.assertEqual(q.template_version_id, v1.id)

    def test_edit_after_enqueue_does_not_retroactively_change_pin(self):
        q = self.service.queue_email(
            template_name='qs_pin',
            to_emails='a@example.com',
            context={},
        )
        v1_id = q.template_version_id

        # Now edit the template — a new version is created
        update_template_content(self.template, mjml_content='V2')
        self.assertNotEqual(self.template.current_version.id, v1_id)

        # The previously-queued item still points at v1
        q.refresh_from_db()
        self.assertEqual(q.template_version_id, v1_id)


class BatchServicePinsVersionTest(TestCase):
    """EmailBatchService.send_batch pins the current version on every queue item.

    This is the regression test for the bug where batch-sent emails all
    rendered from the latest edit regardless of when they were enqueued.
    """

    def setUp(self):
        self.service = EmailBatchService()
        self.user = User.objects.create_user(username='batchver', password='x')
        self.api_key = ExternalApiKey.objects.create(
            key_hash='b' * 64, key_prefix='batchver', name='BV', user=self.user,
        )
        self.template = make_template(
            name='batch_pin', display_name='BP', template_type='order_confirmation',
            subject_template='S', mjml_content='BODY_V1',
        )

    def test_batch_items_pin_current_version(self):
        result = self.service.send_batch(
            template_id=self.template.id,
            requested_by='t',
            notify_emails=['admin@example.com'],
            items=[
                {'to_email': 'a@example.com', 'payload': {}},
                {'to_email': 'b@example.com', 'payload': {}},
            ],
            user=self.user,
            api_key=self.api_key,
        )
        self.assertEqual(result['status'], 'processing')
        v1_id = self.template.current_version.id
        queue_items = EmailQueue.objects.filter(batch__batch_id=result['batch_id'])
        self.assertEqual(queue_items.count(), 2)
        for q in queue_items:
            self.assertEqual(q.template_version_id, v1_id)

    def test_second_batch_after_edit_uses_new_version(self):
        """Two batches straddling a template edit must pin different versions."""
        r1 = self.service.send_batch(
            template_id=self.template.id, requested_by='t',
            notify_emails=[], items=[{'to_email': 'a@example.com', 'payload': {}}],
            user=self.user, api_key=self.api_key,
        )
        v1_id = self.template.current_version.id

        update_template_content(self.template, mjml_content='BODY_V2')
        v2_id = self.template.current_version.id
        self.assertNotEqual(v1_id, v2_id)

        r2 = self.service.send_batch(
            template_id=self.template.id, requested_by='t',
            notify_emails=[], items=[{'to_email': 'b@example.com', 'payload': {}}],
            user=self.user, api_key=self.api_key,
        )

        q1 = EmailQueue.objects.get(batch__batch_id=r1['batch_id'])
        q2 = EmailQueue.objects.get(batch__batch_id=r2['batch_id'])
        self.assertEqual(q1.template_version_id, v1_id)
        self.assertEqual(q2.template_version_id, v2_id)


class ProcessQueueRendersFromPinnedVersionTest(TestCase):
    """process_queue_item renders from the pinned template_version even after live edits."""

    def setUp(self):
        self.service = EmailQueueService()
        self.template = make_template(
            name='proc_pin', display_name='PP', template_type='order_confirmation',
            subject_template='S', mjml_content='ORIGINAL_BODY',
        )

    @patch('email_system.services.queue_service.EmailQueueService._get_template_attachments', return_value=[])
    @patch('email_system.services.email_service.EmailService.render_version_to_html')
    @patch('email_system.services.email_service.EmailService._send_mjml_email_from_content')
    def test_process_renders_from_pinned_version(
        self, mock_send, mock_render_version, mock_attachments
    ):
        mock_render_version.return_value = '<mjml>pinned</mjml>'
        mock_send.return_value = {
            'success': True, 'response_code': '200', 'response_message': 'ok',
            'esp_response': {}, 'esp_message_id': 'x', 'html_content': '<p>ok</p>',
        }

        q = self.service.queue_email(
            template_name='proc_pin',
            to_emails='a@example.com',
            context={},
        )
        pinned_version = q.template_version
        self.assertIsNotNone(pinned_version)

        # Edit the template AFTER queuing — process must still use the pin
        update_template_content(self.template, mjml_content='NEW_BODY')

        self.service.process_queue_item(q)
        q.refresh_from_db()
        self.assertEqual(q.status, 'sent')

        # render_version_to_html should have been called with the ORIGINAL version
        self.assertTrue(mock_render_version.called)
        kwargs = mock_render_version.call_args.kwargs
        self.assertEqual(kwargs['template_version'].id, pinned_version.id)
        self.assertEqual(kwargs['return_html'], False)


class TemplateVersionsEndpointTest(TestCase):
    """GET /api/email/templates/{id}/versions/ returns history newest first."""

    def setUp(self):
        self.admin = User.objects.create_superuser('vadmin', 'v@test.com', 'pw')
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)
        self.template = make_template(
            name='ep_ver', display_name='Ep Ver', template_type='order_confirmation',
            mjml_content='v1',
        )
        update_template_content(self.template, mjml_content='v2')
        update_template_content(self.template, mjml_content='v3')

    def test_lists_versions_newest_first(self):
        response = self.client.get(f'/api/email/templates/{self.template.id}/versions/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        numbers = [v['version_number'] for v in response.data]
        self.assertEqual(numbers, [3, 2, 1])
        self.assertEqual(response.data[0]['mjml_content'], 'v3')
        self.assertEqual(response.data[-1]['mjml_content'], 'v1')

    def test_non_superuser_denied(self):
        regular = User.objects.create_user('vregular', 'vr@test.com', 'pw')
        client = APIClient()
        client.force_authenticate(user=regular)
        response = client.get(f'/api/email/templates/{self.template.id}/versions/')
        self.assertEqual(response.status_code, http_status.HTTP_403_FORBIDDEN)
