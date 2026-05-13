"""Tests for the dynamic-attachment send path.

``EmailQueueService._send_single_email`` must merge:

1. Template-wide attachments from ``EmailTemplateAttachment``
2. Per-queue dynamic attachments from ``EmailQueueAttachment``

…and hand the combined list to ``EmailService._send_mjml_email_from_content``
so each row materialises as a real MIME attachment.
"""
from __future__ import annotations

from unittest.mock import patch

from django.test import TestCase

from email_system.models import (
    EmailQueue, EmailQueueAttachment, EmailLog,
)
from email_system.services.queue_service import EmailQueueService
from email_system.tests.factories import make_template


class DynamicAttachmentBuilderTest(TestCase):
    """``_get_dynamic_attachments`` returns dicts ready for
    ``_attach_files_to_email``: ``name`` + ``content`` + ``mime_type``.
    """

    def setUp(self):
        self.service = EmailQueueService()
        self.template = make_template(
            name='qa_dyn_builder',
            subject_template='s',
            mjml_content='<mjml><mj-body></mj-body></mjml>',
        )

    def test_returns_dicts_in_id_order(self):
        queue_item = EmailQueue.objects.create(
            template=self.template,
            to_emails=['t@example.com'],
            from_email='f@example.com',
            subject='s',
        )
        EmailQueueAttachment.objects.create(
            queue_item=queue_item,
            filename='a.xlsx',
            content=b'aaa',
            mime_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        EmailQueueAttachment.objects.create(
            queue_item=queue_item,
            filename='b.pdf',
            content=b'bb',
            mime_type='application/pdf',
        )

        result = self.service._get_dynamic_attachments(queue_item)

        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]['name'], 'a.xlsx')
        self.assertEqual(result[0]['content'], b'aaa')
        self.assertEqual(
            result[0]['mime_type'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        self.assertEqual(result[1]['name'], 'b.pdf')
        self.assertEqual(result[1]['content'], b'bb')
        self.assertEqual(result[1]['mime_type'], 'application/pdf')

    def test_returns_empty_list_when_no_attachments(self):
        queue_item = EmailQueue.objects.create(
            template=self.template,
            to_emails=['t@example.com'],
            from_email='f@example.com',
            subject='s',
        )
        self.assertEqual(self.service._get_dynamic_attachments(queue_item), [])


class SendSingleEmailMergesAttachmentsTest(TestCase):
    """End-to-end: when ``_send_single_email`` runs for a queue row that
    has dynamic attachments, the patched send helper sees BOTH template
    attachments and per-queue attachments in its ``attachments=`` arg.
    """

    def setUp(self):
        self.service = EmailQueueService()
        self.template = make_template(
            name='qa_send_merge',
            display_name='QA Send Merge',
            template_type='TUTORIALS',
            subject_template='subject',
            mjml_content='<mjml><mj-body></mj-body></mjml>',
            is_active=True,
        )
        self.queue_item = EmailQueue.objects.create(
            template=self.template,
            template_version=self.template.current_version,
            to_emails=['recipient@example.com'],
            from_email='from@example.com',
            subject='Test subject',
            email_context={'instructor_name': 'Eve'},
        )
        EmailQueueAttachment.objects.create(
            queue_item=self.queue_item,
            filename='roster.xlsx',
            content=b'PK\x03\x04xlsx-bytes',
            mime_type=(
                'application/vnd.openxmlformats-officedocument'
                '.spreadsheetml.sheet'
            ),
        )

    @patch('email_system.services.queue_service.EmailService._send_mjml_email_from_content')
    @patch('email_system.services.queue_service.EmailService.render_version_to_html')
    def test_send_passes_dynamic_attachment_to_email_service(
        self, mock_render, mock_send,
    ):
        from django.utils import timezone

        mock_render.return_value = '<mjml></mjml>'
        mock_send.return_value = {
            'success': True,
            'response_code': '250',
            'response_message': 'sent',
            'esp_response': {},
            'esp_message_id': 'msg-1',
            'html_content': '<html></html>',
        }

        ok = self.service._send_single_email(
            self.queue_item, 'recipient@example.com', timezone.now(),
        )

        self.assertTrue(ok)
        # The send helper must have received the dynamic attachment.
        _, kwargs = mock_send.call_args
        attachments = kwargs.get('attachments') or []
        names = [a.get('name') for a in attachments]
        self.assertIn('roster.xlsx', names)
        roster = next(a for a in attachments if a['name'] == 'roster.xlsx')
        self.assertEqual(roster['content'], b'PK\x03\x04xlsx-bytes')
        self.assertEqual(
            roster['mime_type'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )

    @patch('email_system.services.queue_service.EmailService._send_mjml_email_from_content')
    @patch('email_system.services.queue_service.EmailService.render_version_to_html')
    def test_send_succeeds_without_dynamic_attachments(
        self, mock_render, mock_send,
    ):
        from django.utils import timezone

        # Use a queue row with no dynamic attachments
        clean_queue = EmailQueue.objects.create(
            template=self.template,
            template_version=self.template.current_version,
            to_emails=['clean@example.com'],
            from_email='from@example.com',
            subject='clean',
            email_context={},
        )

        mock_render.return_value = '<mjml></mjml>'
        mock_send.return_value = {
            'success': True,
            'response_code': '250',
            'response_message': 'sent',
            'esp_response': {},
            'esp_message_id': 'msg-2',
            'html_content': '<html></html>',
        }

        ok = self.service._send_single_email(
            clean_queue, 'clean@example.com', timezone.now(),
        )
        self.assertTrue(ok)
        _, kwargs = mock_send.call_args
        # Template has no attachments either — attachments list should be
        # empty (or contain only template attachments, none in this case).
        self.assertEqual(kwargs.get('attachments') or [], [])
